from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import RedirectResponse
from motor.motor_asyncio import AsyncIOMotorClient
import os, logging, io, json, httpx, hashlib, time, re, zipfile
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional, Dict
from urllib.parse import urlencode
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import pdfplumber
from bs4 import BeautifulSoup
from groq import Groq
from fastapi.responses import StreamingResponse

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
mongo_client = AsyncIOMotorClient(mongo_url)
db = mongo_client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
GROQ_API_KEY = os.environ.get('GROQ_API_KEY')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI(title="MyJob CareerCopilot API")
api_router = APIRouter(prefix="/api")
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Track app start time for uptime
APP_START_TIME = time.time()

# In-memory rate limit + IP block cache
rate_limit_cache: Dict[str, list] = {}
blocked_ips: Dict[str, float] = {}

@app.get("/")
async def root():
    return {"message": "MyJob CareerCopilot API v2.0", "status": "running"}

# =====================================================================
# AI HELPER
# =====================================================================
async def call_ai(prompt: str, system_instruction: str = "", session_id: str = None) -> str:
    try:
        groq_client = Groq(api_key=GROQ_API_KEY)
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        else:
            messages.append({"role": "system", "content": "You are a helpful assistant."})
        messages.append({"role": "user", "content": prompt})
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.7,
            max_tokens=1024
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"AI Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

# =====================================================================
# PII SCRUBBER (UPGRADE #4 - GDPR)
# =====================================================================
def scrub_pii(text: str) -> str:
    text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL]', text)
    text = re.sub(r'\b(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b', '[PHONE]', text)
    text = re.sub(r'\b\d{13}\b', '[CNP]', text)
    return text

# =====================================================================
# MODELS
# =====================================================================
class UserRegister(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class ApplicationCreate(BaseModel):
    company: str
    role: str
    status: str = "Applied"
    location: Optional[str] = None
    salary_range: Optional[str] = None
    url: Optional[str] = None
    notes: Optional[str] = None
    applied_date: Optional[str] = None
    tech_stack: Optional[List[str]] = []

class ApplicationUpdate(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    location: Optional[str] = None
    salary_range: Optional[str] = None
    url: Optional[str] = None
    notes: Optional[str] = None
    tech_stack: Optional[List[str]] = None

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None
    mode: Optional[str] = "assistant"
    job_id: Optional[str] = None

class ScrapeJobRequest(BaseModel):
    url: str

class RefreshRequest(BaseModel):
    refresh_token: str

class DataExportRequest(BaseModel):
    password: str

class DeleteAccountRequest(BaseModel):
    password: str
    confirm: bool = False

class ConsentUpdate(BaseModel):
    ai_processing_opt_in: Optional[bool] = None
    marketing_opt_in: Optional[bool] = None

# =====================================================================
# AUTH HELPERS
# =====================================================================
def hash_password(p):
    return pwd_context.hash(p)

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

def create_access_token(uid):
    return jwt.encode({"sub": uid, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access"}, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(uid):
    return jwt.encode({"sub": uid, "exp": datetime.now(timezone.utc) + timedelta(days=30), "type": "refresh"}, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        uid = payload.get("sub")
        if not uid or payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": uid}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        if user.get("is_deleted"):
            raise HTTPException(status_code=401, detail="Account has been deleted")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# =====================================================================
# SECURITY LOGGING (UPGRADE #3)
# =====================================================================
async def log_security_event(event_type: str, ip: str = "", user_id: str = None, metadata: dict = None):
    await db.security_logs.insert_one({
        "id": str(uuid.uuid4()),
        "event_type": event_type,
        "ip": ip,
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "metadata": metadata or {}
    })

async def detect_brute_force(ip: str, window_minutes: int = 10, threshold: int = 5) -> bool:
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=window_minutes)).isoformat()
    count = await db.security_logs.count_documents({
        "ip": ip, "event_type": "login_failed", "timestamp": {"$gte": cutoff}
    })
    return count >= threshold

# =====================================================================
# XP & GAMIFICATION
# =====================================================================
STATUS_XP = {"Applied": 10, "Interview": 30, "Offer": 100, "Rejected": 5, "Ghosted": 2}
BADGE_RULES = {
    "first_application": {"label": "First Step", "desc": "Sent your first application", "icon": "rocket"},
    "five_applications": {"label": "On a Roll", "desc": "Applied to 5 jobs", "icon": "zap"},
    "ten_applications": {"label": "Committed", "desc": "Applied to 10 jobs", "icon": "target"},
    "first_interview": {"label": "Interview Ready", "desc": "Landed first interview", "icon": "star"},
    "first_offer": {"label": "Offer Received", "desc": "Got a job offer!", "icon": "trophy"},
    "pdf_parser": {"label": "Smart Applier", "desc": "Used PDF auto-parse", "icon": "sparkles"},
    "interview_mode": {"label": "Interview Pro", "desc": "Completed mock interview", "icon": "mic"},
    "url_scraper": {"label": "Link Hunter", "desc": "Imported a job from URL", "icon": "link"},
}

def calculate_level(xp):
    if xp < 50: return 1
    if xp < 150: return 2
    if xp < 350: return 3
    if xp < 700: return 4
    if xp < 1200: return 5
    return 6 + (xp - 1200) // 500

async def recalculate_user_xp(user_id: str):
    apps = await db.applications.find({"user_id": user_id}, {"_id": 0}).to_list(None)
    total_xp = sum(STATUS_XP.get(a["status"], 10) for a in apps)
    level = calculate_level(total_xp)
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    badges = list(user.get("badges", []))
    if len(apps) >= 1 and "first_application" not in badges: badges.append("first_application")
    if len(apps) >= 5 and "five_applications" not in badges: badges.append("five_applications")
    if len(apps) >= 10 and "ten_applications" not in badges: badges.append("ten_applications")
    if any(a["status"] == "Interview" for a in apps) and "first_interview" not in badges: badges.append("first_interview")
    if any(a["status"] == "Offer" for a in apps) and "first_offer" not in badges: badges.append("first_offer")
    await db.users.update_one({"id": user_id}, {"$set": {"xp": total_xp, "level": level, "badges": badges}})

# =====================================================================
# AUTH ROUTES
# =====================================================================
@api_router.post("/auth/register")
async def register(body: UserRegister):
    if await db.users.find_one({"email": body.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    uid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    await db.users.insert_one({
        "id": uid, "email": body.email, "name": body.name,
        "password_hash": hash_password(body.password),
        "auth_provider": "local", "microsoft_id": None, "profile_picture": None,
        "xp": 0, "level": 1, "badges": [], "is_active": True, "is_deleted": False,
        "created_at": now, "updated_at": now, "last_login": now,
        "consent_timestamp": now, "ai_processing_opt_in": True, "marketing_opt_in": False,
        "data_retention_days": 365
    })
    access = create_access_token(uid)
    refresh = create_refresh_token(uid)
    return {
        "access_token": access, "refresh_token": refresh,
        "user": {"id": uid, "email": body.email, "name": body.name, "xp": 0, "level": 1, "badges": [], "auth_provider": "local"}
    }

@api_router.post("/auth/login")
async def login(body: UserLogin, request: Request):
    client_ip = request.client.host if request.client else ""
    if client_ip in blocked_ips:
        if time.time() - blocked_ips[client_ip] < 3600:
            raise HTTPException(status_code=429, detail="IP temporarily blocked due to too many failed attempts")
        else:
            del blocked_ips[client_ip]

    user = await db.users.find_one({"email": body.email}, {"_id": 0})
    if not user or not user.get("password_hash") or not verify_password(body.password, user["password_hash"]):
        await log_security_event("login_failed", ip=client_ip, metadata={"email": body.email})
        if await detect_brute_force(client_ip):
            blocked_ips[client_ip] = time.time()
            await log_security_event("ip_blocked", ip=client_ip)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user.get("is_deleted"):
        raise HTTPException(status_code=401, detail="Account has been deleted")

    await db.users.update_one({"id": user["id"]}, {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}})
    await log_security_event("login_success", ip=client_ip, user_id=user["id"])
    access = create_access_token(user["id"])
    refresh = create_refresh_token(user["id"])
    return {
        "access_token": access, "refresh_token": refresh,
        "user": {
            "id": user["id"], "email": user["email"], "name": user["name"],
            "xp": user.get("xp", 0), "level": user.get("level", 1), "badges": user.get("badges", []),
            "auth_provider": user.get("auth_provider", "local"), "profile_picture": user.get("profile_picture")
        }
    }

@api_router.post("/auth/refresh")
async def refresh_token(body: RefreshRequest):
    try:
        payload = jwt.decode(body.refresh_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        uid = payload.get("sub")
        user = await db.users.find_one({"id": uid}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return {"access_token": create_access_token(uid), "refresh_token": create_refresh_token(uid)}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@api_router.get("/auth/me")
async def me(current_user=Depends(get_current_user)):
    return {
        "id": current_user["id"], "email": current_user["email"], "name": current_user["name"],
        "xp": current_user.get("xp", 0), "level": current_user.get("level", 1),
        "badges": current_user.get("badges", []),
        "auth_provider": current_user.get("auth_provider", "local"),
        "profile_picture": current_user.get("profile_picture")
    }

# =====================================================================
# UPGRADE #1: MICROSOFT AZURE AD SSO
# =====================================================================
@api_router.get("/auth/microsoft/login")
async def microsoft_login():
    azure_client_id = os.environ.get("AZURE_CLIENT_ID", "")
    azure_tenant_id = os.environ.get("AZURE_TENANT_ID", "common")
    if not azure_client_id:
        raise HTTPException(status_code=503, detail="Azure AD SSO not configured. Please set AZURE_CLIENT_ID in environment.")
    backend_url = os.environ.get("REACT_APP_BACKEND_URL", os.environ.get("FRONTEND_URL", ""))
    redirect_uri = f"{backend_url}/api/auth/microsoft/callback"
    auth_url = (
        f"https://login.microsoftonline.com/{azure_tenant_id}/oauth2/v2.0/authorize?"
        f"client_id={azure_client_id}&response_type=code&redirect_uri={redirect_uri}"
        f"&scope=openid+profile+email+User.Read&response_mode=query"
    )
    return {"auth_url": auth_url}

@api_router.get("/auth/microsoft/callback")
async def microsoft_callback(code: str = None, error: str = None):
    if error:
        raise HTTPException(status_code=400, detail=f"Microsoft auth error: {error}")
    if not code:
        raise HTTPException(status_code=400, detail="No authorization code received")

    azure_client_id = os.environ.get("AZURE_CLIENT_ID", "")
    azure_client_secret = os.environ.get("AZURE_CLIENT_SECRET", "")
    azure_tenant_id = os.environ.get("AZURE_TENANT_ID", "common")
    backend_url = os.environ.get("REACT_APP_BACKEND_URL", os.environ.get("FRONTEND_URL", ""))
    frontend_url = os.environ.get("FRONTEND_URL", backend_url)
    redirect_uri = f"{backend_url}/api/auth/microsoft/callback"

    token_url = f"https://login.microsoftonline.com/{azure_tenant_id}/oauth2/v2.0/token"
    async with httpx.AsyncClient() as http_client:
        token_resp = await http_client.post(token_url, data={
            "client_id": azure_client_id,
            "client_secret": azure_client_secret,
            "code": code,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
            "scope": "openid profile email User.Read"
        })
    if token_resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to exchange code for token")

    token_data = token_resp.json()
    access_token_ms = token_data.get("access_token")

    async with httpx.AsyncClient() as http_client:
        profile_resp = await http_client.get(
            "https://graph.microsoft.com/v1.0/me",
            headers={"Authorization": f"Bearer {access_token_ms}"}
        )
    if profile_resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to fetch Microsoft profile")

    ms_profile = profile_resp.json()
    ms_id = ms_profile.get("id")
    email = ms_profile.get("mail") or ms_profile.get("userPrincipalName", "")
    name = ms_profile.get("displayName", "Microsoft User")

    existing = await db.users.find_one({"$or": [{"microsoft_id": ms_id}, {"email": email}]}, {"_id": 0})
    now = datetime.now(timezone.utc).isoformat()

    if existing:
        await db.users.update_one({"id": existing["id"]}, {"$set": {
            "microsoft_id": ms_id, "last_login": now,
            "profile_picture": None,
            "auth_provider": "microsoft" if not existing.get("password_hash") else existing.get("auth_provider", "local")
        }})
        uid = existing["id"]
    else:
        uid = str(uuid.uuid4())
        await db.users.insert_one({
            "id": uid, "email": email, "name": name,
            "auth_provider": "microsoft", "microsoft_id": ms_id,
            "password_hash": None, "profile_picture": None,
            "xp": 0, "level": 1, "badges": [], "is_active": True, "is_deleted": False,
            "created_at": now, "updated_at": now, "last_login": now,
            "consent_timestamp": now, "ai_processing_opt_in": True, "marketing_opt_in": False,
            "data_retention_days": 365
        })

    access = create_access_token(uid)
    refresh = create_refresh_token(uid)
    await log_security_event("microsoft_login", user_id=uid)

    params = urlencode({"access_token": access, "refresh_token": refresh})
    return RedirectResponse(url=f"{frontend_url}/auth/callback?{params}")

@api_router.get("/auth/microsoft/status")
async def microsoft_sso_status():
    configured = bool(os.environ.get("AZURE_CLIENT_ID", ""))
    return {"configured": configured, "provider": "Microsoft Azure AD"}

# =====================================================================
# APPLICATIONS
# =====================================================================
@api_router.post("/applications")
async def create_application(body: ApplicationCreate, current_user=Depends(get_current_user)):
    app_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": app_id, "user_id": current_user["id"],
        "company": body.company, "role": body.role, "status": body.status,
        "location": body.location, "salary_range": body.salary_range,
        "url": body.url, "notes": body.notes,
        "tech_stack": body.tech_stack or [], "applied_date": body.applied_date or now,
        "updated_at": now, "xp_earned": STATUS_XP.get(body.status, 10), "followup_sent": False
    }
    await db.applications.insert_one(doc)
    await recalculate_user_xp(current_user["id"])
    doc.pop("_id", None)
    return doc

@api_router.get("/applications")
async def list_applications(current_user=Depends(get_current_user)):
    return await db.applications.find({"user_id": current_user["id"]}, {"_id": 0}).sort("updated_at", -1).to_list(None)

@api_router.put("/applications/{app_id}")
async def update_application(app_id: str, body: ApplicationUpdate, current_user=Depends(get_current_user)):
    if not await db.applications.find_one({"id": app_id, "user_id": current_user["id"]}):
        raise HTTPException(status_code=404, detail="Application not found")
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    if "status" in update_data:
        update_data["xp_earned"] = STATUS_XP.get(update_data["status"], 10)
    await db.applications.update_one({"id": app_id}, {"$set": update_data})
    await recalculate_user_xp(current_user["id"])
    return await db.applications.find_one({"id": app_id}, {"_id": 0})

@api_router.delete("/applications/{app_id}")
async def delete_application(app_id: str, current_user=Depends(get_current_user)):
    result = await db.applications.delete_one({"id": app_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    await recalculate_user_xp(current_user["id"])
    return {"message": "Deleted"}

# =====================================================================
# JOB URL SCRAPER
# =====================================================================
@api_router.post("/scrape-job")
async def scrape_job(body: ScrapeJobRequest, current_user=Depends(get_current_user)):
    url = body.url.strip()
    if not url.startswith("http"):
        raise HTTPException(status_code=400, detail="Invalid URL")
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=20) as http_client:
            resp = await http_client.get(url, headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            })
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not fetch URL: {str(e)}")
    soup = BeautifulSoup(resp.text, 'html.parser')
    for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'iframe', 'noscript']):
        tag.decompose()
    text = soup.get_text(separator='\n', strip=True)[:5000]
    if len(text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Could not extract content from this URL")
    prompt = f"""Extract job application details from this job posting. Return ONLY valid JSON.
URL: {url}
Content: {text}
Return this exact JSON (null for missing fields):
{{"company": "company name or null", "role": "job title or null", "location": "city/remote/hybrid or null", "salary_range": "salary info or null", "tech_stack": ["skill1", "skill2"], "url": "{url}", "notes": "1-sentence summary"}}
Return ONLY the JSON object."""
    result = await call_ai(prompt=prompt, system_instruction="You extract structured job data. Return only valid JSON.")
    result = result.strip()
    if result.startswith("```"):
        lines = result.split("\n")
        result = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    result = result.strip()
    try:
        parsed = json.loads(result)
        parsed["url"] = url
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Could not extract job details from this URL")
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    if "url_scraper" not in user.get("badges", []):
        await db.users.update_one({"id": current_user["id"]}, {"$addToSet": {"badges": "url_scraper"}})
    return parsed

# =====================================================================
# PDF PARSER
# =====================================================================
@api_router.post("/parse-pdf")
async def parse_pdf(file: UploadFile = File(...), current_user=Depends(get_current_user)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files supported")
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read uploaded file: {str(e)}")
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded")
    text = ""
    try:
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages[:5]:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        logger.error(f"PDF parse error: {str(e)}")
        raise HTTPException(status_code=400, detail="Could not read PDF. The file may be corrupted or password-protected.")
    if len(text.strip()) < 30:
        raise HTTPException(status_code=400, detail="Could not extract enough text from PDF. The file may be an image-based PDF.")
    try:
        result = await call_ai(
            prompt=f"Extract job details from this document. Return ONLY valid JSON with fields: company, role, location, salary_range, tech_stack (array), url (null), notes.\n\nDocument:\n{text[:3000]}\n\nReturn ONLY JSON.",
            system_instruction="Extract structured job data. Return only valid JSON."
        )
        result = result.strip()
        if result.startswith("```"):
            lines = result.split("\n")
            result = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        parsed = json.loads(result.strip())
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="AI could not extract structured data from this PDF")
    except Exception as e:
        logger.error(f"AI parse-pdf error: {str(e)}")
        raise HTTPException(status_code=503, detail="AI service temporarily unavailable. Please try again.")
    await db.users.update_one({"id": current_user["id"]}, {"$addToSet": {"badges": "pdf_parser"}})
    return parsed

# =====================================================================
# ANALYTICS
# =====================================================================
@api_router.get("/analytics")
async def get_analytics(current_user=Depends(get_current_user)):
    apps = await db.applications.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(None)
    status_counts = {}
    for a in apps:
        s = a.get("status", "Applied")
        status_counts[s] = status_counts.get(s, 0) + 1
    now = datetime.now(timezone.utc)
    weekly = {}
    for i in range(7, -1, -1):
        ws = now - timedelta(weeks=i + 1)
        we = now - timedelta(weeks=i)
        wl = ws.strftime("%b %d")
        weekly[wl] = sum(1 for a in apps if ws.isoformat() <= a.get("applied_date", "") < we.isoformat())
    company_counts = {}
    for a in apps:
        c = a.get("company", "Unknown")
        company_counts[c] = company_counts.get(c, 0) + 1
    top_companies = sorted(company_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    responded = sum(1 for a in apps if a.get("status") in ["Interview", "Offer", "Rejected"])
    response_rate = round((responded / len(apps) * 100) if apps else 0, 1)
    interviews = status_counts.get("Interview", 0) + status_counts.get("Offer", 0)
    interview_rate = round((interviews / len(apps) * 100) if apps else 0, 1)
    offer_rate = round((status_counts.get("Offer", 0) / len(apps) * 100) if apps else 0, 1)
    cutoff = (now - timedelta(days=7)).isoformat()
    followup_count = sum(1 for a in apps if a.get("status") == "Applied" and a.get("applied_date", "") < cutoff and not a.get("followup_sent"))
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    return {
        "total_applications": len(apps),
        "status_breakdown": [{"status": k, "count": v} for k, v in status_counts.items()],
        "weekly_applications": [{"week": k, "count": v} for k, v in weekly.items()],
        "top_companies": [{"company": c, "count": n} for c, n in top_companies],
        "response_rate": response_rate, "interview_rate": interview_rate, "offer_rate": offer_rate,
        "followup_pending": followup_count,
        "user_stats": {"xp": user.get("xp", 0), "level": user.get("level", 1), "badges": user.get("badges", [])}
    }

# =====================================================================
# FOLLOW-UPS
# =====================================================================
@api_router.get("/followups")
async def get_followup_candidates(current_user=Depends(get_current_user)):
    cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    return await db.applications.find({
        "user_id": current_user["id"], "status": "Applied",
        "applied_date": {"$lt": cutoff}, "followup_sent": {"$ne": True}
    }, {"_id": 0}).to_list(None)

@api_router.post("/followups/{app_id}/generate")
async def generate_followup_email(app_id: str, current_user=Depends(get_current_user)):
    application = await db.applications.find_one({"id": app_id, "user_id": current_user["id"]}, {"_id": 0})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    email_draft = await call_ai(
        prompt=f"Write a professional follow-up email. Candidate: {current_user['name']}. Company: {application['company']}. Role: {application['role']}. Applied: {application.get('applied_date', 'recently')[:10]}. Format: Subject: [subject line]\n\n[email body]. Be concise, 3-4 paragraphs.",
        system_instruction="You are a professional career coach. Generate follow-up email drafts only."
    )
    return {"app_id": app_id, "email_draft": email_draft, "company": application["company"], "role": application["role"]}

@api_router.post("/followups/{app_id}/mark-sent")
async def mark_followup_sent(app_id: str, current_user=Depends(get_current_user)):
    await db.applications.update_one(
        {"id": app_id, "user_id": current_user["id"]},
        {"$set": {"followup_sent": True, "followup_date": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Marked as sent"}

# =====================================================================
# AI CHAT
# =====================================================================
@api_router.post("/chat")
async def chat(body: ChatMessage, current_user=Depends(get_current_user)):
    session_id = body.session_id or str(uuid.uuid4())
    apps = await db.applications.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(None)
    status_counts = {}
    for a in apps:
        s = a.get("status", "Applied")
        status_counts[s] = status_counts.get(s, 0) + 1

    if body.mode == "interview" and body.job_id:
        job = await db.applications.find_one({"id": body.job_id, "user_id": current_user["id"]}, {"_id": 0})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        system_msg = f"You are an expert technical interviewer for {job['role']} at {job['company']}. Tech stack: {', '.join(job.get('tech_stack', []) or ['general'])}. Conduct a realistic mock interview: ask ONE question at a time, mix technical and behavioral questions, give brief feedback after each answer, then ask the next question. Start with a warm-up question."
    else:
        system_msg = f"You are an intelligent career assistant for {current_user['name']}. Data: {len(apps)} applications, status: {status_counts}, level {current_user.get('level', 1)}, {current_user.get('xp', 0)} XP. Help with job search stats, career advice, follow-ups, interview prep. Be concise and data-driven."

    # PII scrub for privacy
    scrubbed_message = scrub_pii(body.message)
    response = await call_ai(prompt=scrubbed_message, system_instruction=system_msg, session_id=session_id)
    now = datetime.now(timezone.utc).isoformat()
    await db.chat_history.insert_many([
        {"session_id": session_id, "user_id": current_user["id"], "role": "user", "content": body.message, "timestamp": now, "mode": body.mode},
        {"session_id": session_id, "user_id": current_user["id"], "role": "assistant", "content": response, "timestamp": now, "mode": body.mode}
    ])
    if body.mode == "interview":
        await db.users.update_one({"id": current_user["id"]}, {"$addToSet": {"badges": "interview_mode"}})
    return {"response": response, "session_id": session_id}

# =====================================================================
# RESUME ANALYZER
# =====================================================================
@api_router.post("/resume/analyze")
async def analyze_resume(file: UploadFile = File(...), job_description: str = Form(...), current_user=Depends(get_current_user)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files supported")
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read uploaded file: {str(e)}")
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded")
    resume_text = ""
    try:
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages[:8]:
                page_text = page.extract_text()
                if page_text:
                    resume_text += page_text + "\n"
    except Exception as e:
        logger.error(f"Resume PDF parse error: {str(e)}")
        raise HTTPException(status_code=400, detail="Could not read PDF. The file may be corrupted or password-protected.")
    if len(resume_text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Could not extract enough text from PDF. Try a text-based PDF.")

    scrubbed_resume = scrub_pii(resume_text[:3500])
    prompt = f"""You are an expert ATS analyst and career coach.
Analyze this resume against the job description and return ONLY valid JSON.
RESUME: {scrubbed_resume}
JOB DESCRIPTION: {job_description[:2000]}
Return this exact JSON (no markdown):
{{"ats_score": 75, "score_label": "Strong Match", "score_color": "#34C759", "matching_keywords": ["keyword1"], "missing_keywords": ["keyword1"], "strengths": ["strength1"], "improvements": ["improvement1"], "tailored_summary": "summary", "overall_assessment": "assessment"}}
Return ONLY the JSON object."""
    try:
        result = await call_ai(prompt=prompt, system_instruction="You are an expert ATS resume analyzer. Return only valid JSON.")
        result = result.strip()
        if result.startswith("```"):
            lines = result.split("\n")
            result = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        parsed = json.loads(result.strip())
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="AI could not produce a valid analysis. Please try again.")
    except Exception as e:
        logger.error(f"Resume analyze AI error: {str(e)}")
        raise HTTPException(status_code=503, detail="AI service temporarily unavailable. Please try again.")
    await db.resume_analyses.insert_one({
        "user_id": current_user["id"],
        "ats_score": parsed.get("ats_score", 0),
        "analyzed_at": datetime.now(timezone.utc).isoformat()
    })
    return parsed

# =====================================================================
# UPGRADE #2: AI AGENT ENDPOINTS
# =====================================================================
@api_router.get("/ai-agent/actions")
async def get_ai_actions(current_user=Depends(get_current_user)):
    actions = await db.ai_agent_logs.find(
        {"user_id": current_user["id"], "status": {"$in": ["pending", "approved"]}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return actions

@api_router.post("/ai-agent/generate-followups")
async def generate_ai_followups(current_user=Depends(get_current_user)):
    cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    stale_apps = await db.applications.find({
        "user_id": current_user["id"], "status": "Applied",
        "applied_date": {"$lt": cutoff}, "followup_sent": {"$ne": True}
    }, {"_id": 0}).to_list(None)

    generated = []
    for application in stale_apps[:5]:
        existing = await db.ai_agent_logs.find_one({
            "user_id": current_user["id"],
            "application_id": application["id"],
            "status": "pending"
        })
        if existing:
            continue

        days_since = 7
        try:
            applied = application.get("applied_date", "")
            if applied:
                applied_dt = datetime.fromisoformat(applied.replace("Z", "+00:00"))
                days_since = (datetime.now(timezone.utc) - applied_dt).days
        except Exception:
            pass

        try:
            email_content = await call_ai(
                prompt=f"""Generate a professional follow-up email for a job application.
Company: {application['company']}
Role: {application['role']}
Date Applied: {application.get('applied_date', 'recently')[:10]}
Days Since Application: {days_since}
Candidate Name: {current_user['name']}

Write a polite, professional follow-up email. Include Subject line.
Tone: Professional, friendly, non-intrusive. Length: 100-150 words.""",
                system_instruction="You are a professional career assistant. Generate follow-up email drafts."
            )

            action_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            action = {
                "id": action_id,
                "user_id": current_user["id"],
                "action_type": "follow_up_generated",
                "status": "pending",
                "application_id": application["id"],
                "company": application["company"],
                "role": application["role"],
                "days_since_applied": days_since,
                "email_content": email_content,
                "ai_model": "llama-3.3-70b",
                "created_at": now,
                "updated_at": now
            }
            await db.ai_agent_logs.insert_one(action)
            action.pop("_id", None)
            generated.append(action)
        except Exception as e:
            logger.error(f"AI agent error: {str(e)}")

    return {"generated": len(generated), "actions": generated}

@api_router.post("/ai-agent/actions/{action_id}/approve")
async def approve_ai_action(action_id: str, current_user=Depends(get_current_user)):
    action = await db.ai_agent_logs.find_one({"id": action_id, "user_id": current_user["id"]}, {"_id": 0})
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    now = datetime.now(timezone.utc).isoformat()
    await db.ai_agent_logs.update_one({"id": action_id}, {"$set": {"status": "approved", "updated_at": now}})
    if action.get("application_id"):
        await db.applications.update_one(
            {"id": action["application_id"]},
            {"$set": {"followup_sent": True, "followup_date": now}}
        )
    return {"message": "Action approved", "action_id": action_id}

@api_router.post("/ai-agent/actions/{action_id}/reject")
async def reject_ai_action(action_id: str, current_user=Depends(get_current_user)):
    action = await db.ai_agent_logs.find_one({"id": action_id, "user_id": current_user["id"]})
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    await db.ai_agent_logs.update_one(
        {"id": action_id},
        {"$set": {"status": "rejected", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Action rejected", "action_id": action_id}

@api_router.get("/ai-agent/usage")
async def get_ai_usage(current_user=Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    actions = await db.ai_agent_logs.find(
        {"user_id": current_user["id"], "created_at": {"$gte": month_start}},
        {"_id": 0}
    ).to_list(None)
    total_actions = len(actions)
    approved = sum(1 for a in actions if a.get("status") == "approved")
    rejected = sum(1 for a in actions if a.get("status") == "rejected")
    pending = sum(1 for a in actions if a.get("status") == "pending")
    return {
        "total_actions": total_actions,
        "approved": approved, "rejected": rejected, "pending": pending,
        "month": now.strftime("%B %Y"),
        "limit": 50,
        "remaining": max(0, 50 - total_actions)
    }

# =====================================================================
# UPGRADE #3: HEALTH CHECK & ADMIN METRICS
# =====================================================================
@api_router.get("/health")
async def health_check():
    start = time.time()
    try:
        await db.command("ping")
        db_status = "connected"
        db_latency = round((time.time() - start) * 1000)
    except Exception:
        db_status = "disconnected"
        db_latency = 0

    users_count = await db.users.count_documents({})
    apps_count = await db.applications.count_documents({})
    uptime = round(time.time() - APP_START_TIME)

    return {
        "status": "healthy",
        "version": "2.0.0",
        "uptime_seconds": uptime,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": {
            "database": {"status": db_status, "latency_ms": db_latency},
            "ai_service": {"status": "operational", "provider": "groq"},
        },
        "metrics": {
            "total_users": users_count,
            "total_applications": apps_count,
        }
    }

@api_router.get("/admin/metrics")
async def get_admin_metrics(current_user=Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    users_total = await db.users.count_documents({})
    week_ago = (now - timedelta(days=7)).isoformat()
    users_active = await db.users.count_documents({"last_login": {"$gte": week_ago}})
    users_new = await db.users.count_documents({"created_at": {"$gte": week_ago}})
    apps_total = await db.applications.count_documents({})
    ai_actions = await db.ai_agent_logs.count_documents({})

    security_logs = await db.security_logs.find({}, {"_id": 0}).sort("timestamp", -1).to_list(50)
    login_success = sum(1 for l in security_logs if l.get("event_type") == "login_success")
    login_failed = sum(1 for l in security_logs if l.get("event_type") == "login_failed")

    return {
        "users": {"total": users_total, "active": users_active, "new": users_new},
        "applications": {"total": apps_total},
        "ai": {"total_actions": ai_actions},
        "security": {
            "login_attempts": {"success": login_success, "failed": login_failed},
            "recent_events": security_logs[:10]
        },
        "timestamp": now.isoformat()
    }

# =====================================================================
# UPGRADE #4: GDPR ENDPOINTS
# =====================================================================
@api_router.post("/user/export-data")
async def export_user_data(body: DataExportRequest, current_user=Depends(get_current_user)):
    if current_user.get("auth_provider") == "local":
        user_full = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
        if not user_full or not verify_password(body.password, user_full.get("password_hash", "")):
            raise HTTPException(status_code=401, detail="Invalid password")

    user_data = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password_hash": 0})
    applications = await db.applications.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(None)
    ai_logs = await db.ai_agent_logs.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(None)
    chat_hist = await db.chat_history.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(None)
    sec_logs = await db.security_logs.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(None)

    export = {
        "export_date": datetime.now(timezone.utc).isoformat(),
        "profile": user_data,
        "applications": applications,
        "ai_interactions": ai_logs,
        "chat_history": chat_hist,
        "security_log": sec_logs,
        "data_dictionary": {
            "profile": "Your account information",
            "applications": "All job applications you tracked",
            "ai_interactions": "AI agent actions and recommendations",
            "chat_history": "Your conversations with the AI assistant",
            "security_log": "Login and security events"
        }
    }

    # Create ZIP in memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("profile.json", json.dumps(export["profile"], indent=2, default=str))
        zf.writestr("applications.json", json.dumps(export["applications"], indent=2, default=str))
        zf.writestr("ai_interactions.json", json.dumps(export["ai_interactions"], indent=2, default=str))
        zf.writestr("chat_history.json", json.dumps(export["chat_history"], indent=2, default=str))
        zf.writestr("security_log.json", json.dumps(export["security_log"], indent=2, default=str))
        zf.writestr("README.txt", f"MyJob CareerCopilot - Data Export\nExport Date: {export['export_date']}\n\nFiles:\n- profile.json: Your account information\n- applications.json: All job applications\n- ai_interactions.json: AI agent actions\n- chat_history.json: Chat conversations\n- security_log.json: Security events")
    zip_buffer.seek(0)

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=myjob_data_export_{datetime.now(timezone.utc).strftime('%Y%m%d')}.zip"}
    )

@api_router.delete("/user/account")
async def delete_account(body: DeleteAccountRequest, current_user=Depends(get_current_user)):
    if current_user.get("auth_provider") == "local":
        user_full = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
        if not user_full or not verify_password(body.password, user_full.get("password_hash", "")):
            raise HTTPException(status_code=401, detail="Invalid password")
    if not body.confirm:
        raise HTTPException(status_code=400, detail="Please confirm account deletion")
    uid = current_user["id"]
    now = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({"id": uid}, {"$set": {
        "is_deleted": True, "is_active": False,
        "deletion_scheduled_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
        "updated_at": now
    }})
    await log_security_event("account_deletion_requested", user_id=uid)
    return {
        "message": "Account scheduled for deletion in 30 days",
        "deletion_date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
        "can_cancel_until": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    }

@api_router.post("/user/cancel-deletion")
async def cancel_deletion(current_user=Depends(get_current_user)):
    await db.users.update_one({"id": current_user["id"]}, {"$set": {
        "is_deleted": False, "is_active": True,
        "deletion_scheduled_at": None,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }})
    return {"message": "Account deletion cancelled"}

@api_router.get("/user/consent")
async def get_consent(current_user=Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    return {
        "ai_processing_opt_in": user.get("ai_processing_opt_in", True),
        "marketing_opt_in": user.get("marketing_opt_in", False),
        "consent_timestamp": user.get("consent_timestamp"),
        "data_retention_days": user.get("data_retention_days", 365)
    }

@api_router.put("/user/consent")
async def update_consent(body: ConsentUpdate, current_user=Depends(get_current_user)):
    update = {"updated_at": datetime.now(timezone.utc).isoformat(), "consent_timestamp": datetime.now(timezone.utc).isoformat()}
    if body.ai_processing_opt_in is not None:
        update["ai_processing_opt_in"] = body.ai_processing_opt_in
    if body.marketing_opt_in is not None:
        update["marketing_opt_in"] = body.marketing_opt_in
    await db.users.update_one({"id": current_user["id"]}, {"$set": update})
    await log_security_event("consent_updated", user_id=current_user["id"], metadata=body.model_dump(exclude_none=True))
    return {"message": "Consent updated"}

@api_router.get("/badges")
async def get_badges():
    return BADGE_RULES

# =====================================================================
# APP SETUP
# =====================================================================
app.include_router(api_router)
# CORS Configuration - Read from environment variable
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.on_event("shutdown")
async def shutdown_db_client():
    mongo_client.close()

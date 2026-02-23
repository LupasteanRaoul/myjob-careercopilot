from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, logging, io, json, httpx
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import pdfplumber
from bs4 import BeautifulSoup
from groq import Groq

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
AI_API_KEY = os.environ['AI_API_KEY']

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI(title="MyJob API")
api_router = APIRouter(prefix="/api")
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.get("/")
async def root():
    return {"message": "MyJob API v1.0", "status": "running"}

# ─── AI Helper ────────────────────────────────────────────────────────────────
async def call_ai(prompt: str, system_instruction: str = "", session_id: str = None) -> str:
    try:
        client = Groq(api_key=AI_API_KEY)  # ✅ Fără proxies!
        
        messages = []
        
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        else:
            messages.append({"role": "system", "content": "You are a helpful assistant."})
        
        messages.append({"role": "user", "content": prompt})
        
        response = client.chat.completions.create(
            model="llama-3.1-70b-versatile",
            messages=messages,
            temperature=0.7,
            max_tokens=1024
        )
        
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"AI Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
# ─── Models ───────────────────────────────────────────────────────────────────
class UserRegister(BaseModel):
    email: str; password: str; name: str

class UserLogin(BaseModel):
    email: str; password: str

class ApplicationCreate(BaseModel):
    company: str; role: str; status: str = "Applied"
    location: Optional[str] = None; salary_range: Optional[str] = None
    url: Optional[str] = None; notes: Optional[str] = None
    applied_date: Optional[str] = None; tech_stack: Optional[List[str]] = []

class ApplicationUpdate(BaseModel):
    company: Optional[str] = None; role: Optional[str] = None
    status: Optional[str] = None; location: Optional[str] = None
    salary_range: Optional[str] = None; url: Optional[str] = None
    notes: Optional[str] = None; tech_stack: Optional[List[str]] = None

class ChatMessage(BaseModel):
    message: str; session_id: Optional[str] = None
    mode: Optional[str] = "assistant"; job_id: Optional[str] = None

class ScrapeJobRequest(BaseModel):
    url: str

class RefreshRequest(BaseModel):
    refresh_token: str

# ─── Auth ─────────────────────────────────────────────────────────────────────
def hash_password(p): return pwd_context.hash(p)
def verify_password(plain, hashed): return pwd_context.verify(plain, hashed)
def create_access_token(uid): return jwt.encode({"sub": uid, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access"}, JWT_SECRET, algorithm=JWT_ALGORITHM)
def create_refresh_token(uid): return jwt.encode({"sub": uid, "exp": datetime.now(timezone.utc) + timedelta(days=30), "type": "refresh"}, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        uid = payload.get("sub")
        if not uid or payload.get("type") != "access": raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": uid}, {"_id": 0})
        if not user: raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ─── XP & Gamification ────────────────────────────────────────────────────────
STATUS_XP = {"Applied": 10, "Interview": 30, "Offer": 100, "Rejected": 5, "Ghosted": 2}
BADGE_RULES = {
    "first_application": {"label": "First Step",      "desc": "Sent your first application",  "icon": "rocket"},
    "five_applications":  {"label": "On a Roll",       "desc": "Applied to 5 jobs",             "icon": "zap"},
    "ten_applications":   {"label": "Committed",       "desc": "Applied to 10 jobs",            "icon": "target"},
    "first_interview":    {"label": "Interview Ready", "desc": "Landed first interview",        "icon": "star"},
    "first_offer":        {"label": "Offer Received",  "desc": "Got a job offer!",              "icon": "trophy"},
    "pdf_parser":         {"label": "Smart Applier",   "desc": "Used PDF auto-parse",           "icon": "sparkles"},
    "interview_mode":     {"label": "Interview Pro",   "desc": "Completed mock interview",      "icon": "mic"},
    "url_scraper":        {"label": "Link Hunter",     "desc": "Imported a job from URL",       "icon": "link"},
}

def calculate_level(xp): return 1 if xp<50 else 2 if xp<150 else 3 if xp<350 else 4 if xp<700 else 5 if xp<1200 else 6+(xp-1200)//500

async def recalculate_user_xp(user_id: str):
    apps = await db.applications.find({"user_id": user_id}, {"_id": 0}).to_list(None)
    total_xp = sum(STATUS_XP.get(a["status"], 10) for a in apps)
    level = calculate_level(total_xp)
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    badges = list(user.get("badges", []))
    if len(apps)>=1  and "first_application" not in badges: badges.append("first_application")
    if len(apps)>=5  and "five_applications"  not in badges: badges.append("five_applications")
    if len(apps)>=10 and "ten_applications"   not in badges: badges.append("ten_applications")
    if any(a["status"]=="Interview" for a in apps) and "first_interview" not in badges: badges.append("first_interview")
    if any(a["status"]=="Offer"     for a in apps) and "first_offer"     not in badges: badges.append("first_offer")
    await db.users.update_one({"id": user_id}, {"$set": {"xp": total_xp, "level": level, "badges": badges}})

# ─── Auth Routes ──────────────────────────────────────────────────────────────
@api_router.post("/auth/register")
async def register(body: UserRegister):
    if await db.users.find_one({"email": body.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    uid = str(uuid.uuid4())
    await db.users.insert_one({"id": uid, "email": body.email, "name": body.name, "password_hash": hash_password(body.password), "xp": 0, "level": 1, "badges": [], "created_at": datetime.now(timezone.utc).isoformat()})
    access, refresh = create_access_token(uid), create_refresh_token(uid)
    return {"access_token": access, "refresh_token": refresh, "user": {"id": uid, "email": body.email, "name": body.name, "xp": 0, "level": 1, "badges": []}}

@api_router.post("/auth/login")
async def login(body: UserLogin):
    user = await db.users.find_one({"email": body.email}, {"_id": 0})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access, refresh = create_access_token(user["id"]), create_refresh_token(user["id"])
    return {"access_token": access, "refresh_token": refresh, "user": {"id": user["id"], "email": user["email"], "name": user["name"], "xp": user.get("xp",0), "level": user.get("level",1), "badges": user.get("badges",[])}}

@api_router.post("/auth/refresh")
async def refresh_token(body: RefreshRequest):
    try:
        payload = jwt.decode(body.refresh_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh": raise HTTPException(status_code=401, detail="Invalid refresh token")
        uid = payload.get("sub")
        user = await db.users.find_one({"id": uid}, {"_id": 0})
        if not user: raise HTTPException(status_code=401, detail="User not found")
        return {"access_token": create_access_token(uid), "refresh_token": create_refresh_token(uid)}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@api_router.get("/auth/me")
async def me(current_user=Depends(get_current_user)):
    return {"id": current_user["id"], "email": current_user["email"], "name": current_user["name"], "xp": current_user.get("xp",0), "level": current_user.get("level",1), "badges": current_user.get("badges",[])}

# ─── Applications ─────────────────────────────────────────────────────────────
@api_router.post("/applications")
async def create_application(body: ApplicationCreate, current_user=Depends(get_current_user)):
    app_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    doc = {"id": app_id, "user_id": current_user["id"], "company": body.company, "role": body.role, "status": body.status, "location": body.location, "salary_range": body.salary_range, "url": body.url, "notes": body.notes, "tech_stack": body.tech_stack or [], "applied_date": body.applied_date or now, "updated_at": now, "xp_earned": STATUS_XP.get(body.status,10), "followup_sent": False}
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
    if "status" in update_data: update_data["xp_earned"] = STATUS_XP.get(update_data["status"], 10)
    await db.applications.update_one({"id": app_id}, {"$set": update_data})
    await recalculate_user_xp(current_user["id"])
    return await db.applications.find_one({"id": app_id}, {"_id": 0})

@api_router.delete("/applications/{app_id}")
async def delete_application(app_id: str, current_user=Depends(get_current_user)):
    result = await db.applications.delete_one({"id": app_id, "user_id": current_user["id"]})
    if result.deleted_count == 0: raise HTTPException(status_code=404, detail="Application not found")
    await recalculate_user_xp(current_user["id"])
    return {"message": "Deleted"}

# ─── Job URL Scraper ──────────────────────────────────────────────────────────
@api_router.post("/scrape-job")
async def scrape_job(body: ScrapeJobRequest, current_user=Depends(get_current_user)):
    url = body.url.strip()
    if not url.startswith("http"): raise HTTPException(status_code=400, detail="Invalid URL")

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=20) as client:
            resp = await client.get(url, headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
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
Content:
{text}

Return this exact JSON (null for missing fields):
{{
  "company": "company name or null",
  "role": "job title or null",
  "location": "city/remote/hybrid or null",
  "salary_range": "salary info or null",
  "tech_stack": ["skill1", "skill2"],
  "url": "{url}",
  "notes": "1-sentence summary"
}}

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

# ─── PDF Parser ───────────────────────────────────────────────────────────────
@api_router.post("/parse-pdf")
async def parse_pdf(file: UploadFile = File(...), current_user=Depends(get_current_user)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files supported")
    content = await file.read()
    text = ""
    try:
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages[:5]: text += (page.extract_text() or "") + "\n"
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read PDF: {str(e)}")
    if len(text.strip()) < 50: raise HTTPException(status_code=400, detail="Could not extract text from PDF")

    result = await call_ai(
        prompt=f"Extract job details from this document. Return ONLY valid JSON with fields: company, role, location, salary_range, tech_stack (array), url (null), notes.\n\nDocument:\n{text[:3000]}\n\nReturn ONLY JSON.",
        system_instruction="Extract structured job data. Return only valid JSON."
    )
    result = result.strip()
    if result.startswith("```"):
        lines = result.split("\n")
        result = "\n".join(lines[1:-1])
    try: parsed = json.loads(result.strip())
    except: raise HTTPException(status_code=500, detail="AI could not parse PDF content")
    await db.users.update_one({"id": current_user["id"]}, {"$addToSet": {"badges": "pdf_parser"}})
    return parsed

# ─── Analytics ────────────────────────────────────────────────────────────────
@api_router.get("/analytics")
async def get_analytics(current_user=Depends(get_current_user)):
    apps = await db.applications.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(None)
    status_counts = {}
    for a in apps: s = a.get("status","Applied"); status_counts[s] = status_counts.get(s,0)+1
    now = datetime.now(timezone.utc)
    weekly = {}
    for i in range(7,-1,-1):
        ws = now - timedelta(weeks=i+1); we = now - timedelta(weeks=i)
        wl = ws.strftime("%b %d")
        weekly[wl] = sum(1 for a in apps if ws.isoformat() <= a.get("applied_date","") < we.isoformat())
    company_counts = {}
    for a in apps: c=a.get("company","Unknown"); company_counts[c]=company_counts.get(c,0)+1
    top_companies = sorted(company_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    responded = sum(1 for a in apps if a.get("status") in ["Interview","Offer","Rejected"])
    response_rate  = round((responded/len(apps)*100) if apps else 0, 1)
    interviews = status_counts.get("Interview",0)+status_counts.get("Offer",0)
    interview_rate = round((interviews/len(apps)*100) if apps else 0, 1)
    offer_rate = round((status_counts.get("Offer",0)/len(apps)*100) if apps else 0, 1)
    cutoff = (now-timedelta(days=7)).isoformat()
    followup_count = sum(1 for a in apps if a.get("status")=="Applied" and a.get("applied_date","") < cutoff and not a.get("followup_sent"))
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    return {
        "total_applications": len(apps),
        "status_breakdown":   [{"status":k,"count":v} for k,v in status_counts.items()],
        "weekly_applications":[{"week":k,"count":v} for k,v in weekly.items()],
        "top_companies":      [{"company":c,"count":n} for c,n in top_companies],
        "response_rate": response_rate, "interview_rate": interview_rate, "offer_rate": offer_rate,
        "followup_pending": followup_count,
        "user_stats": {"xp": user.get("xp",0), "level": user.get("level",1), "badges": user.get("badges",[])}
    }

# ─── Follow-ups ───────────────────────────────────────────────────────────────
@api_router.get("/followups")
async def get_followup_candidates(current_user=Depends(get_current_user)):
    cutoff = (datetime.now(timezone.utc)-timedelta(days=7)).isoformat()
    return await db.applications.find({"user_id": current_user["id"], "status": "Applied", "applied_date": {"$lt": cutoff}, "followup_sent": {"$ne": True}}, {"_id": 0}).to_list(None)

@api_router.post("/followups/{app_id}/generate")
async def generate_followup_email(app_id: str, current_user=Depends(get_current_user)):
    app = await db.applications.find_one({"id": app_id, "user_id": current_user["id"]}, {"_id": 0})
    if not app: raise HTTPException(status_code=404, detail="Application not found")
    email_draft = await call_ai(
        prompt=f"Write a professional follow-up email. Candidate: {current_user['name']}. Company: {app['company']}. Role: {app['role']}. Applied: {app.get('applied_date','recently')[:10]}. Format: Subject: [subject line]\n\n[email body]. Be concise, 3-4 paragraphs.",
        system_instruction="You are a professional career coach. Generate follow-up email drafts only."
    )
    return {"app_id": app_id, "email_draft": email_draft, "company": app["company"], "role": app["role"]}

@api_router.post("/followups/{app_id}/mark-sent")
async def mark_followup_sent(app_id: str, current_user=Depends(get_current_user)):
    await db.applications.update_one({"id": app_id, "user_id": current_user["id"]}, {"$set": {"followup_sent": True, "followup_date": datetime.now(timezone.utc).isoformat()}})
    return {"message": "Marked as sent"}

# ─── AI Chat ──────────────────────────────────────────────────────────────────
@api_router.post("/chat")
async def chat(body: ChatMessage, current_user=Depends(get_current_user)):
    session_id = body.session_id or str(uuid.uuid4())
    apps = await db.applications.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(None)
    status_counts = {}
    for a in apps: s=a.get("status","Applied"); status_counts[s]=status_counts.get(s,0)+1

    if body.mode == "interview" and body.job_id:
        job = await db.applications.find_one({"id": body.job_id, "user_id": current_user["id"]}, {"_id": 0})
        if not job: raise HTTPException(status_code=404, detail="Job not found")
        system_msg = f"You are an expert technical interviewer for {job['role']} at {job['company']}. Tech stack: {', '.join(job.get('tech_stack',[]) or ['general'])}. Conduct a realistic mock interview: ask ONE question at a time, mix technical and behavioral questions, give brief feedback after each answer, then ask the next question. Start with a warm-up question."
    else:
        system_msg = f"You are an intelligent career assistant for {current_user['name']}. Data: {len(apps)} applications, status: {status_counts}, level {current_user.get('level',1)}, {current_user.get('xp',0)} XP. Help with job search stats, career advice, follow-ups, interview prep. Be concise and data-driven."

    response = await call_ai(prompt=body.message, system_instruction=system_msg, session_id=session_id)
    now = datetime.now(timezone.utc).isoformat()
    await db.chat_history.insert_many([
        {"session_id": session_id, "user_id": current_user["id"], "role": "user",      "content": body.message,  "timestamp": now, "mode": body.mode},
        {"session_id": session_id, "user_id": current_user["id"], "role": "assistant", "content": response,      "timestamp": now, "mode": body.mode}
    ])
    if body.mode == "interview":
        await db.users.update_one({"id": current_user["id"]}, {"$addToSet": {"badges": "interview_mode"}})
    return {"response": response, "session_id": session_id}

@api_router.post("/resume/analyze")
async def analyze_resume(
    file: UploadFile = File(...),
    job_description: str = Form(...),
    current_user=Depends(get_current_user)
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files supported")
    content = await file.read()
    resume_text = ""
    try:
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages[:8]: resume_text += (page.extract_text() or "") + "\n"
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read PDF: {str(e)}")
    if len(resume_text.strip()) < 80:
        raise HTTPException(status_code=400, detail="Could not extract text from PDF")

    prompt = f"""You are an expert ATS (Applicant Tracking System) analyst and career coach.

Analyze this resume against the job description and return ONLY valid JSON.

RESUME:
{resume_text[:3500]}

JOB DESCRIPTION:
{job_description[:2000]}

Return this exact JSON (no markdown):
{{
  "ats_score": <integer 0-100>,
  "score_label": "<Poor Match|Fair Match|Good Match|Strong Match|Excellent Match>",
  "score_color": "<#FF3B30|#FF9500|#0071E3|#34C759|#34C759>",
  "matching_keywords": ["keyword1", "keyword2"],
  "missing_keywords": ["keyword1", "keyword2"],
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "tailored_summary": "A 2-sentence professional summary tailored to this specific role",
  "overall_assessment": "2-3 sentence honest assessment of the fit"
}}

ATS score rules: 80-100=Excellent, 60-79=Strong, 40-59=Good, 20-39=Fair, 0-19=Poor
Return ONLY the JSON object."""

    result = await call_ai(
        prompt=prompt,
        system_instruction="You are an expert ATS resume analyzer. Return only valid JSON."
    )
    result = result.strip()
    if result.startswith("```"):
        lines = result.split("\n")
        result = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    try:
        parsed = json.loads(result.strip())
    except:
        raise HTTPException(status_code=500, detail="AI could not analyze resume")

    await db.resume_analyses.insert_one({
        "user_id": current_user["id"],
        "ats_score": parsed.get("ats_score", 0),
        "analyzed_at": datetime.now(timezone.utc).isoformat()
    })
    return parsed

@api_router.get("/badges")
async def get_badges(): return BADGE_RULES

@api_router.get("/")
async def root(): return {"message": "MyJob API v1.0"}

# ─── App ──────────────────────────────────────────────────────────────────────
app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

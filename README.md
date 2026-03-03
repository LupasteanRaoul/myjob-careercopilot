# MyJob CareerCopilot - Enterprise AI Career Platform v2.0

## Author
**Raoul Lupastean** - Full-Stack Developer & AI Architect
- Email: lupasteanraoul@gmail.com
- LinkedIn: https://www.linkedin.com/in/raoul-lupastean
- GitHub: https://github.com/LupasteanRaoul

---

## Overview

MyJob CareerCopilot is an enterprise-ready AI career intelligence platform that helps professionals track job applications, analyze resumes with AI, generate follow-up emails, and maintain GDPR compliance. Built with modern web technologies and enterprise security patterns.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Tailwind CSS, Radix UI, Recharts |
| Backend | Python 3.13, FastAPI, Uvicorn, Pydantic |
| Database | MongoDB (Motor async driver) |
| AI | Groq API (LLaMA 3.3-70b-versatile) |
| Auth | JWT + Microsoft Azure AD SSO (OAuth2/OIDC) |
| Security | bcrypt, CORS, Rate Limiting, PII Scrubbing |

## Enterprise Features

### 1. Microsoft Azure AD SSO (Identity & Access Management)
- OAuth2/OIDC integration with Microsoft Entra ID
- Dual auth: Local JWT + Microsoft SSO
- Automatic user provisioning from Microsoft Graph
- Session management with HttpOnly secure tokens
- Configurable via environment variables (no code changes needed)

### 2. AI Agentic Workflow (Autonomous Task Automation)
- Autonomous detection of stale applications (>7 days without response)
- AI-generated professional follow-up emails using LLaMA 3.3-70b
- Human-in-the-Loop approval system (approve/reject/edit)
- Monthly usage tracking with configurable limits (50 actions/month)
- Cost control and token tracking

### 3. Observability & Monitoring Dashboard
- Real-time health check endpoint (`/api/health`)
- Admin metrics dashboard with user/application/security stats
- Security event logging (login attempts, brute force detection)
- IP blocking for repeated failed login attempts
- Service status monitoring (DB, AI, Email)

### 4. GDPR & Data Governance Center
- **Right to Portability**: Full data export as ZIP (profile, applications, AI logs, chat history)
- **Right to be Forgotten**: Soft delete with 30-day grace period + cancel option
- **Consent Management**: Granular opt-in/opt-out for AI processing and marketing
- **PII Scrubbing**: Automatic removal of personal data before AI processing
- **Privacy Center**: Dedicated UI page for all privacy controls

## Project Structure

```
MyJob-CareerCopilot/
├── backend/
│   ├── server.py              # Main FastAPI application (all endpoints)
│   ├── requirements.txt       # Python dependencies
│   ├── .env                   # Environment variables (create from .env.example)
│   └── .env.example           # Template for environment variables
├── frontend/
│   ├── src/
│   │   ├── App.js             # Main app with routing
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Auth state management
│   │   ├── components/
│   │   │   ├── Layout.jsx     # Sidebar navigation
│   │   │   └── ui/            # Radix UI components
│   │   └── pages/
│   │       ├── AuthPage.jsx       # Login/Register + Microsoft SSO
│   │       ├── Dashboard.jsx      # Main dashboard
│   │       ├── ApplicationsPage.jsx # Job applications CRUD
│   │       ├── AnalyticsPage.jsx  # Charts and statistics
│   │       ├── ChatPage.jsx       # AI career assistant
│   │       ├── ResumePage.jsx     # Resume ATS analyzer
│   │       ├── FollowupsPage.jsx  # Follow-up management
│   │       ├── AIAgentPage.jsx    # AI Agent autonomous actions
│   │       ├── AdminDashboard.jsx # Monitoring & metrics
│   │       └── PrivacyCenter.jsx  # GDPR controls
│   ├── package.json
│   ├── tailwind.config.js
│   └── .env.example
├── docs/                      # Documentation & case studies
└── README.md                  # This file
```

## Setup & Installation

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB 6+

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env      # Edit with your values
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend Setup
```bash
cd frontend
yarn install
cp .env.example .env      # Edit with your values
yarn start
```

### Environment Variables

#### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=myjob_careercopilot
JWT_SECRET=<generate-with: openssl rand -hex 32>
AI_API_KEY=<your-groq-api-key>
AZURE_CLIENT_ID=<from-azure-portal>
AZURE_CLIENT_SECRET=<from-azure-portal>
AZURE_TENANT_ID=common
FRONTEND_URL=http://localhost:3000
```

#### Frontend (.env)
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

## Azure AD SSO Configuration Guide

### Step 1: Create App Registration
1. Go to https://portal.azure.com → Microsoft Entra ID → App registrations
2. Click "New registration"
3. Name: "MyJob CareerCopilot"
4. Supported account types: "Accounts in any organizational directory + personal Microsoft accounts"
5. Redirect URI (Web): `https://your-backend-url/api/auth/microsoft/callback`
6. Click "Register"

### Step 2: Get Credentials
1. Copy **Application (client) ID** → `AZURE_CLIENT_ID`
2. Copy **Directory (tenant) ID** → `AZURE_TENANT_ID`
3. Go to "Certificates & secrets" → "New client secret"
4. Copy the **Value** → `AZURE_CLIENT_SECRET`

### Step 3: Configure API Permissions
1. Go to "API permissions" → "Add a permission"
2. Select "Microsoft Graph" → "Delegated permissions"
3. Add: `openid`, `profile`, `email`, `User.Read`
4. Click "Grant admin consent"

### Step 4: Update Environment Variables
Set `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID` in backend `.env`.
The Microsoft SSO button will automatically appear on the login page.

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register with email/password |
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/refresh` | Refresh JWT tokens |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/auth/microsoft/login` | Initiate Microsoft SSO |
| GET | `/api/auth/microsoft/callback` | Microsoft OAuth callback |
| GET | `/api/auth/microsoft/status` | Check SSO configuration |

### Applications
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/applications` | Create application |
| GET | `/api/applications` | List user's applications |
| PUT | `/api/applications/{id}` | Update application |
| DELETE | `/api/applications/{id}` | Delete application |

### AI Features
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | AI career assistant chat |
| POST | `/api/resume/analyze` | Resume ATS analysis |
| POST | `/api/parse-pdf` | Parse job PDF |
| POST | `/api/scrape-job` | Scrape job URL |
| GET | `/api/followups` | Get follow-up candidates |
| POST | `/api/followups/{id}/generate` | Generate follow-up email |

### AI Agent
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ai-agent/actions` | Get pending AI actions |
| POST | `/api/ai-agent/generate-followups` | Generate AI follow-ups |
| POST | `/api/ai-agent/actions/{id}/approve` | Approve action |
| POST | `/api/ai-agent/actions/{id}/reject` | Reject action |
| GET | `/api/ai-agent/usage` | Monthly usage stats |

### Monitoring
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | System health check |
| GET | `/api/admin/metrics` | Admin metrics dashboard |

### GDPR
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/user/export-data` | Export all user data (ZIP) |
| DELETE | `/api/user/account` | Delete account (30-day grace) |
| POST | `/api/user/cancel-deletion` | Cancel account deletion |
| GET | `/api/user/consent` | Get consent settings |
| PUT | `/api/user/consent` | Update consent settings |

## Security Measures
- JWT tokens with expiration (7 days access, 30 days refresh)
- bcrypt password hashing
- CORS configuration
- Rate limiting (5 login attempts/10min per IP)
- Brute force detection with IP blocking
- PII scrubbing before AI processing
- GDPR-compliant data handling
- Structured security event logging

## Known Issues & Future Improvements
- Azure AD SSO requires manual Azure Portal configuration
- APScheduler for automated daily follow-up checks (planned)
- Microsoft Graph API email drafts (planned)
- OpenTelemetry integration (planned)
- Data retention cron job (planned)

## License
MIT License - Raoul Lupastean 2026

# MyJob CareerCopilot - Enterprise AI Career Platform

## Architecture Overview & Technical Documentation

**Author:** Raoul Lupastean | Full-Stack Developer & AI Architect  
**Email:** lupasteanraoul@gmail.com  
**LinkedIn:** [linkedin.com/in/raoul-lupastean](https://www.linkedin.com/in/raoul-lupastean)  
**GitHub:** [github.com/LupasteanRaoul](https://github.com/LupasteanRaoul)  
**Live Demo:** [myjob-careercopilot.vercel.app](https://myjob-careercopilot.vercel.app)

---

## 1. Executive Summary

MyJob CareerCopilot is an enterprise-grade AI-powered career management platform that transforms passive job application tracking into an intelligent, proactive career assistant. The platform combines modern authentication (JWT + Microsoft Azure AD SSO), autonomous AI workflows (Groq LLaMA 3.3-70b), real-time observability, and full GDPR compliance into a single, cohesive application.

**Key Differentiators:**
- Hybrid authentication model (local + enterprise SSO)
- AI agent with human-in-the-loop approval workflow
- Privacy-by-design with PII scrubbing and granular consent
- Real-time security monitoring with brute force detection
- Gamification system for user engagement

---

## 2. System Architecture

### 2.1 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18, Tailwind CSS, Radix UI | Responsive SPA |
| Backend | Python 3.13, FastAPI, Uvicorn | Async REST API |
| Database | MongoDB (Motor async driver) | Document storage |
| AI Engine | Groq API (LLaMA 3.3-70b) | Text generation |
| Auth | JWT + Microsoft Azure AD OAuth 2.0 | Hybrid identity |
| Charts | Recharts | Data visualization |

### 2.2 Deployment Architecture

```
[Vercel CDN]
     |
     v
[React Frontend (SPA)]
     |
     v (HTTPS API calls)
[Render Cloud]
     |
     v
[FastAPI Backend]
     |
     +----> [MongoDB Atlas] (User Data, Applications, Logs)
     |
     +----> [Groq Cloud API] (AI Text Generation)
     |
     +----> [Microsoft Graph API] (SSO Authentication)
```

### 2.3 API Architecture

All backend routes are prefixed with `/api` and organized by domain:

```
/api
├── /auth
│   ├── POST /register          # Local registration
│   ├── POST /login             # Local login with brute force protection
│   ├── POST /refresh           # JWT token refresh
│   ├── GET  /me                # Current user profile
│   ├── GET  /microsoft/login   # SSO: Generate Azure AD auth URL
│   ├── GET  /microsoft/callback # SSO: OAuth callback handler
│   └── GET  /microsoft/status  # SSO: Configuration check
├── /applications
│   ├── POST /                  # Create application
│   ├── GET  /                  # List user's applications
│   ├── PUT  /{app_id}          # Update application
│   └── DELETE /{app_id}        # Delete application
├── /chat
│   └── POST /                  # AI chat (assistant + interview mode)
├── /resume
│   └── POST /analyze           # ATS resume analysis
├── /analytics
│   └── GET  /                  # User analytics & statistics
├── /followups
│   ├── GET  /                  # List follow-up candidates
│   ├── POST /{app_id}/generate # Generate follow-up email
│   └── POST /{app_id}/mark-sent # Mark follow-up as sent
├── /ai-agent
│   ├── POST /generate-followups # AI agent: batch generate
│   ├── GET  /actions           # List pending AI actions
│   ├── POST /actions/{id}/approve # Approve action
│   ├── POST /actions/{id}/reject  # Reject action
│   └── GET  /usage             # Monthly usage stats
├── /health
│   └── GET  /                  # System health check
├── /admin
│   └── GET  /metrics           # Admin monitoring dashboard
├── /user
│   ├── POST /export-data       # GDPR: Export all user data
│   ├── DELETE /account         # GDPR: Request account deletion
│   ├── POST /cancel-deletion   # GDPR: Cancel deletion
│   ├── GET  /consent           # GDPR: Get consent preferences
│   └── PUT  /consent           # GDPR: Update consent
├── /scrape-job
│   └── POST /                  # Extract job details from URL
├── /parse-pdf
│   └── POST /                  # Extract job details from PDF
└── /badges
    └── GET  /                  # List all available badges
```

---

## 3. Enterprise Upgrades Summary

### Upgrade #1: Microsoft Azure AD SSO
- OAuth 2.0 Authorization Code Flow
- Automatic account linking (email-based)
- Conditional UI rendering based on SSO configuration
- Unified JWT session management across auth providers

### Upgrade #2: AI Agentic Workflow
- Autonomous stale application detection (>7 days)
- Personalized follow-up email generation via LLaMA 3.3-70b
- Human-in-the-Loop approval/rejection workflow
- Monthly usage limits (50 actions) and cost tracking

### Upgrade #3: Observability & Monitoring
- Real-time health check endpoint with DB latency
- Security event logging (login success/failure/block)
- Brute force detection with IP blocking (5 attempts / 10 min)
- Admin dashboard with user, application, AI, and security metrics

### Upgrade #4: GDPR & Data Governance
- Full data export as ZIP (5 collections, machine-readable JSON)
- Account deletion with 30-day grace period + cancellation
- Granular consent management (AI processing, marketing)
- PII scrubbing before all third-party AI API calls

---

## 4. Database Schema

### Collections:

**users**
```json
{
  "id": "uuid",
  "email": "string",
  "name": "string",
  "password_hash": "bcrypt | null",
  "auth_provider": "local | microsoft",
  "microsoft_id": "string | null",
  "profile_picture": "url | null",
  "xp": "integer",
  "level": "integer",
  "badges": ["string"],
  "is_active": "boolean",
  "is_deleted": "boolean",
  "consent_timestamp": "ISO-8601",
  "ai_processing_opt_in": "boolean",
  "marketing_opt_in": "boolean",
  "data_retention_days": "integer",
  "created_at": "ISO-8601",
  "last_login": "ISO-8601"
}
```

**applications**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "company": "string",
  "role": "string",
  "status": "Applied | Interview | Offer | Rejected | Ghosted",
  "location": "string",
  "salary_range": "string",
  "url": "string",
  "notes": "string",
  "tech_stack": ["string"],
  "applied_date": "ISO-8601",
  "followup_sent": "boolean",
  "followup_date": "ISO-8601 | null",
  "xp_earned": "integer"
}
```

**ai_agent_logs**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "action_type": "follow_up_generated",
  "status": "pending | approved | rejected",
  "application_id": "uuid",
  "company": "string",
  "role": "string",
  "days_since_applied": "integer",
  "email_content": "string",
  "ai_model": "llama-3.3-70b",
  "created_at": "ISO-8601"
}
```

**security_logs**
```json
{
  "id": "uuid",
  "event_type": "string",
  "ip": "string",
  "user_id": "uuid | null",
  "timestamp": "ISO-8601",
  "metadata": {}
}
```

**chat_history**
```json
{
  "session_id": "uuid",
  "user_id": "uuid",
  "role": "user | assistant",
  "content": "string",
  "timestamp": "ISO-8601",
  "mode": "assistant | interview"
}
```

---

## 5. Security Architecture

| Layer | Mechanism |
|-------|-----------|
| Authentication | JWT (HS256) + Azure AD OAuth 2.0 |
| Token Expiry | Access: 7 days, Refresh: 30 days |
| Password Storage | bcrypt with automatic salt |
| Brute Force | IP blocking after 5 failed attempts / 10 min |
| PII Protection | Regex-based scrubbing before AI API calls |
| CORS | Configurable origins via environment variable |
| Input Validation | Pydantic models for all request bodies |
| Error Handling | No stack traces or internal details in responses |

---

## 6. Gamification System

| Badge | Trigger | Icon |
|-------|---------|------|
| First Step | 1st application added | rocket |
| On a Roll | 5 applications | zap |
| Committed | 10 applications | target |
| Interview Ready | First interview status | star |
| Offer Received | First offer status | trophy |
| Smart Applier | Used PDF auto-parse | sparkles |
| Interview Pro | Completed mock interview | mic |
| Link Hunter | Imported job from URL | link |

**XP System:**
| Status | XP |
|--------|-----|
| Applied | 10 |
| Interview | 30 |
| Offer | 100 |
| Rejected | 5 |
| Ghosted | 2 |

**Levels:** 1 (0 XP) --> 2 (50 XP) --> 3 (150 XP) --> 4 (350 XP) --> 5 (700 XP) --> 6+ (1200+ XP)

---

## 7. Running the Project

### Prerequisites:
- Python 3.11+
- Node.js 18+
- MongoDB (local or Atlas)

### Backend Setup:
```bash
cd backend
pip install -r requirements.txt
# Configure .env:
# MONGO_URL=mongodb://localhost:27017
# DB_NAME=myjob_db
# JWT_SECRET=your-secret-key
# GROQ_API_KEY=your-groq-key
# CORS_ORIGINS=http://localhost:3000
uvicorn server:app --host 0.0.0.0 --port 8001
```

### Frontend Setup:
```bash
cd frontend
npm install
# Configure .env:
# REACT_APP_BACKEND_URL=http://localhost:8001
npm start
```

### Optional - Microsoft SSO:
```bash
# Add to backend .env:
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-secret
AZURE_TENANT_ID=your-tenant-id
FRONTEND_URL=http://localhost:3000
```

---

## 8. Project Structure

```
MyJob-CareerCopilot-Enterprise/
├── backend/
│   ├── server.py              # FastAPI application (all endpoints)
│   └── requirements.txt       # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.js             # React router & theme management
│   │   ├── components/
│   │   │   ├── Layout.jsx     # Main layout with sidebar navigation
│   │   │   └── ui/            # Shadcn UI components
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Authentication state management
│   │   ├── pages/
│   │   │   ├── AuthPage.jsx        # Login / Register
│   │   │   ├── Dashboard.jsx       # Overview dashboard
│   │   │   ├── ApplicationsPage.jsx # CRUD applications
│   │   │   ├── AnalyticsPage.jsx   # Charts & statistics
│   │   │   ├── ChatPage.jsx        # AI assistant & mock interviews
│   │   │   ├── ResumePage.jsx      # ATS resume analyzer
│   │   │   ├── FollowupsPage.jsx   # Manual follow-up emails
│   │   │   ├── AIAgentPage.jsx     # AI agent workflow
│   │   │   ├── AdminDashboard.jsx  # Monitoring dashboard
│   │   │   └── PrivacyCenter.jsx   # GDPR privacy center
│   │   ├── hooks/
│   │   │   └── use-toast.js   # Toast notifications
│   │   └── lib/
│   │       └── utils.js       # Utility functions
│   ├── package.json
│   └── tailwind.config.js
├── docs/
│   ├── 01-enterprise-sso-integration.md
│   ├── 02-ai-agentic-workflow.md
│   ├── 03-observability-monitoring.md
│   ├── 04-gdpr-compliance.md
│   └── README-ENTERPRISE.md
└── README.md
```

---

## 9. Contact

**Raoul Lupastean**  
Full-Stack Developer & AI Architect  
Email: lupasteanraoul@gmail.com  
LinkedIn: [linkedin.com/in/raoul-lupastean](https://www.linkedin.com/in/raoul-lupastean)  
GitHub: [github.com/LupasteanRaoul](https://github.com/LupasteanRaoul)

---

*Document Version: 1.0 | Last Updated: March 2026*  
*MyJob CareerCopilot Enterprise Platform - All Rights Reserved*

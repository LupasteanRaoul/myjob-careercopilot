<div align="center">

# 🎯 MyJob

### AI-Powered Career Intelligence Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg?logo=react)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248.svg?logo=mongodb)](https://mongodb.com)

**Track applications · Optimize resume · Land your dream job faster**

[Live Demo](https://myjob.vercel.app) · [Documentation](#-documentation) · [Support](#-support)

</div>

---

## ✨ Features

| Feature | Description |
| :--- | :--- |
| 🔌 **Chrome Extension** | One-click tracking from LinkedIn, Indeed, Glassdoor |
| 📊 **Application Tracker** | Centralized dashboard with status workflows |
| 🤖 **AI Resume Optimizer** | ATS score 0-100 + keyword gap analysis |
| 💰 **Salary Intelligence** | AI-powered market salary estimates |
| 📈 **Analytics Dashboard** | Conversion rates & pipeline metrics |
| 📋 **Copy Token** | One-click auth token for extension setup |

---

## 🏗 Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, TailwindCSS, Radix UI |
| **Backend** | FastAPI, Python 3.9+, Uvicorn |
| **Database** | MongoDB Atlas |
| **AI** | OpenAI GPT-4, Google Gemini |
| **Deploy** | Vercel (FE), Railway (BE) |
| **Extension** | Chrome Manifest V3 |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ | Python 3.9+ | Git | MongoDB Atlas | OpenAI API Key

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/myjob.git
cd myjob

# Backend setup
cd backend && pip install -r requirements.txt

# Frontend setup
cd frontend && npm install
```

---

## ⚙️ Backend Setup

### 1. Create `.env` File

```bash
cd backend
cp .env.example .env
```

### 2. Configure Environment Variables

```env
# MongoDB Atlas
MONGO_URL=mongodb+srv://myjob:password@cluster0.xxxxx.mongodb.net/myjob_db?retryWrites=true&w=majority
DB_NAME=myjob_db

# JWT Auth
JWT_SECRET=super-secret-jwt-key-minimum-32-characters-long

# AI Services
AI_API_KEY=sk-proj-...your-openai-api-key

# CORS
CORS_ORIGINS=*
```

### 3. Start Server

```bash
uvicorn server:app --reload --port 8001
```

**Verify:** `http://localhost:8001` → `{"message": "MyJob API v1.0"}`

---

## 🖥️ Frontend Setup

### 1. Create `.env` File

```bash
cd frontend
cp .env.example .env
```

### 2. Configure Environment Variables

```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### 3. Start Server

```bash
npm start
```

**Verify:** `http://localhost:3000`

---

## 🔌 Chrome Extension

### Installation

1. Open `chrome://extensions/`
2. Enable **Developer Mode** (top-right)
3. Click **"Load unpacked"**
4. Select `extension/` folder

### Configuration

| Field | Value |
| :--- | :--- |
| **Backend URL** | `http://localhost:8001` (local) or Railway URL |
| **Auth Token** | Copy from MyJob app (Copy Token button) |

### Usage

Visit LinkedIn/Indeed/Glassdoor → Click "Add to MyJob" on any job posting

---

## 🗄️ Database Setup (MongoDB Atlas)

1. **Create Account:** [MongoDB Atlas](https://cloud.mongodb.com)
2. **Create Cluster:** Free tier → Choose region → Create
3. **Database Access:** Add user `myjob` with password
4. **Network Access:** Add IP `0.0.0.0/0` (allow from anywhere)
5. **Connect:** Copy connection string → Replace `<password>` → Add `/myjob_db`
6. **Update `.env`:** Paste into `MONGO_URL`

---

## 🔐 Environment Variables

### Backend (`.env`)

| Variable | Required | Example |
| :--- | :---: | :--- |
| `MONGO_URL` | ✅ | `mongodb+srv://...` |
| `DB_NAME` | ✅ | `myjob_db` |
| `JWT_SECRET` | ✅ | `random-32-chars` |
| `AI_API_KEY` | ✅ | `sk-proj-...` |
| `CORS_ORIGINS` | ✅ | `*` |

### Frontend (`.env`)

| Variable | Required | Example |
| :--- | :---: | :--- |
| `REACT_APP_BACKEND_URL` | ✅ | `http://localhost:8001` |

---

## 📡 API Endpoints

### Base URL
- Local: `http://localhost:8001`
- Production: `https://your-backend.up.railway.app`

### Authentication
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Login |
| `GET` | `/api/auth/me` | Get current user |

### Applications
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/applications` | List all |
| `POST` | `/api/applications` | Create new |
| `PUT` | `/api/applications/:id` | Update |
| `DELETE` | `/api/applications/:id` | Delete |

### AI
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/chat` | AI assistant |
| `POST` | `/api/resume/optimize` | Resume ATS score |

---

## 🚀 Deployment

### Backend → Railway

1. [Railway](https://railway.app) → Login with GitHub
2. **New Project** → **Deploy from GitHub**
3. **Root Directory:** `backend`
4. **Add Variables:** `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `AI_API_KEY`, `CORS_ORIGINS`
5. **Deploy** → Copy URL

### Frontend → Vercel

1. [Vercel](https://vercel.com) → Login with GitHub
2. **New Project** → Import `myjob`
3. **Root Directory:** `frontend`
4. **Add Variable:** `REACT_APP_BACKEND_URL` = Railway URL
5. **Deploy** → Copy URL

---

## 🐛 Troubleshooting

| Issue | Solution |
| :--- | :--- |
| `Port 8001 in use` | Change: `--port 8002` |
| `Port 3000 in use` | Press `Y` to use 3001 |
| `MongoDB failed` | Check password & IP whitelist `0.0.0.0/0` |
| `CORS error` | Add frontend URL to `CORS_ORIGINS` |
| `Extension not working` | Verify token & backend URL |
| `AI not responding` | Check OpenAI API key credits |

---

## 📋 Roadmap

- [x] Core tracker
- [x] Chrome Extension
- [x] Copy Token feature
- [ ] AI Resume Optimizer
- [ ] Salary Intelligence
- [ ] Gmail webhook
- [ ] PWA support

---

## 🤝 Contributing

1. Fork repository
2. Create branch: `git checkout -b feature/name`
3. Commit: `git commit -m 'Add feature'`
4. Push: `git push origin feature/name`
5. Open Pull Request

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file

---

## 📬 Support

| Channel | Link |
| :--- | :--- |
| **Email** | your-email@example.com |
| **GitHub Issues** | [Report Bug](https://github.com/yourusername/myjob/issues) |

---

<div align="center">

**Made with ❤️ for job seekers everywhere**

[⭐ Star this repo](https://github.com/yourusername/myjob) if helpful!

</div>
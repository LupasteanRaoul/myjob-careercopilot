# 🚀 MyJob CareerCopilot

> **Platformă Inteligentă de Urmărire a Carierei cu AI**

[![Live Demo](https://img.shields.io/badge/Live-Demo-0071E3?style=for-the-badge&logo=vercel)](https://myjob-careercopilot.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-Railway-131313?style=for-the-badge&logo=railway)](https://railway.app)
[![AI](https://img.shields.io/badge/AI-Groq-000000?style=for-the-badge&logo=groq)](https://groq.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

---

## 📖 Despre Proiect

**MyJob CareerCopilot** este o platformă completă de gestionare a procesului de căutare a unui loc de muncă, alimentată de inteligență artificială. Te ajută să îți organizezi aplicațiile, să îți optimizezi CV-ul și să te pregătești pentru interviuri.

### ✨ Feature-uri Principale

| Feature | Descriere |
| :--- | :--- |
| 📊 **Smart Tracking** | Urmărește toate aplicațiile într-un singur loc |
| 🤖 **AI Assistant** | Chat intelligent pentru sfaturi de carieră |
| 📄 **Resume Analyzer** | Scoring ATS + recomandări de optimizare |
| 🔗 **Job Scraper** | Import automat din LinkedIn/Indeed |
| 📈 **Analytics** | Dashboard cu statistici și progres |
| 🎤 **Mock Interviews** | Simulare interviuri cu AI |
| 🏆 **Gamification** | XP, Level-uri și Badge-uri |
| 📧 **Follow-ups** | Email-uri automate de follow-up |

---

## 🛠️ Tech Stack

### Frontend
- React 18
- Vercel (Deploy)
- Tailwind CSS
- Axios
- React Router

### Backend
- FastAPI (Python 3.13)
- Railway (Deploy)
- MongoDB Atlas
- JWT Authentication
- bcrypt (Password Hashing)

### AI & External Services
- Groq API (llama-3.3-70b-versatile)
- Google Gemini (fallback)
- OpenAI (opțional)

### Browser Extension
- Chrome Extension (Manifest V3)
- Job Scraping
- Local Storage

---

## 🚀 Deploy & Instalare

### 1. Clone Repository
```bash
git clone https://github.com/LupasteanRaoul/myjob-careercopilot.git
cd myjob-careercopilot
```

### 2. Backend Setup (Railway)
```bash
cd backend
pip install -r requirements.txt
```

**Environment Variables:**
```env
MONGO_URL=mongodb+srv://...
DB_NAME=myjob_db
JWT_SECRET=your-secret-key
AI_API_KEY=gsk_...  # Groq API Key
CORS_ORIGINS=*
```

### 3. Frontend Setup (Vercel)
```bash
cd frontend
npm install
npm run dev
```

**Environment Variables:**
```env
REACT_APP_BACKEND_URL=https://your-backend.railway.app
```

### 4. Chrome Extension
```
1. Deschide chrome://extensions
2. Activează Developer Mode
3. Click "Load unpacked"
4. Selectează folderul extension/
```

---

## 📁 Structura Proiectului

```
myjob-careercopilot/
├── backend/
│   ├── server.py          # FastAPI main app
│   ├── requirements.txt   # Python dependencies
│   └── .env              # Environment variables
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── context/
│   │   └── components/
│   ├── package.json
│   └── public/
├── extension/
│   ├── manifest.json
│   ├── popup.html
│   └── content.js
└── README.md
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Descriere |
| :--- | :--- | :--- |
| POST | `/api/auth/register` | Înregistrare utilizator |
| POST | `/api/auth/login` | Login utilizator |
| POST | `/api/auth/refresh` | Refresh token |
| GET | `/api/auth/me` | Profil utilizator |

### Applications
| Method | Endpoint | Descriere |
| :--- | :--- | :--- |
| POST | `/api/applications` | Creează aplicație |
| GET | `/api/applications` | Listează aplicații |
| PUT | `/api/applications/{id}` | Actualizează aplicație |
| DELETE | `/api/applications/{id}` | Șterge aplicație |

### AI Features
| Method | Endpoint | Descriere |
| :--- | :--- | :--- |
| POST | `/api/chat` | Chat cu AI Assistant |
| POST | `/api/resume/analyze` | Analiză CV (ATS) |
| POST | `/api/scrape-job` | Scraping job URL |
| GET | `/api/analytics` | Dashboard analytics |
| GET | `/api/followups` | Follow-up candidates |

---

## 🎮 Gamification System

### Level System
| Level | XP Required | Badge |
| :---: | :--- | :--- |
| 1 | 0 XP | 🌱 Beginner |
| 2 | 50 XP | 🚀 Starter |
| 3 | 150 XP | ⚡ Active |
| 4 | 350 XP | 🎯 Committed |
| 5 | 700 XP | 🏆 Pro |
| 6+ | 1200+ XP | 👑 Expert |

### XP Rewards
| Acțiune | XP |
| :--- | :---: |
| Aplică la job | +10 XP |
| Primești interviu | +30 XP |
| Primești offer | +100 XP |
| Completezi mock interview | +50 XP |

### Badges
- 🚀 **First Step** - Prima aplicație
- ⚡ **On a Roll** - 5 aplicații
- 🎯 **Committed** - 10 aplicații
- ⭐ **Interview Ready** - Primul interviu
- 🏆 **Offer Received** - Job offer primit
- ✨ **Smart Applier** - CV parse cu AI
- 🎤 **Interview Pro** - Mock interview complet
- 🔗 **Link Hunter** - Job importat din URL

---

## 🔒 Security

- **JWT Authentication** - Access + Refresh tokens
- **Password Hashing** - bcrypt cu salt automat
- **CORS Protection** - Domenii whitelist
- **Environment Variables** - Secrets în Railway/Vercel
- **HTTPS Only** - SSL/TLS encryption

---

## 🤝 Contributing

1. Fork the project
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📄 License

Distribuit sub licența **MIT**. Vezi `LICENSE` pentru mai multe informații.

---

## 👨‍💻 Author

**Lupastean Raoul**

- GitHub: [@LupasteanRaoul](https://github.com/LupasteanRaoul)
- Project: [MyJob CareerCopilot](https://github.com/LupasteanRaoul/myjob-careercopilot)
- Live Demo: [myjob-careercopilot.vercel.app](https://myjob-careercopilot.vercel.app)

---

## 🙏 Acknowledgments

- [Groq](https://groq.com) - AI API gratuit și rapid
- [Railway](https://railway.app) - Backend hosting
- [Vercel](https://vercel.com) - Frontend hosting
- [MongoDB](https://mongodb.com) - Database
- [FastAPI](https://fastapi.tiangolo.com) - Python framework
- [React](https://react.dev) - Frontend framework

---

## 📞 Support

Pentru întrebări sau suport:
- 📧 Email: support@myjob-careercopilot.com
- 💬 Issues: [GitHub Issues](https://github.com/LupasteanRaoul/myjob-careercopilot/issues)
- 📖 Docs: [Wiki](https://github.com/LupasteanRaoul/myjob-careercopilot/wiki)

---

<div align="center">

**Made with ❤️ by Lupastean Raoul**

[⬆ Back to Top](#myjob-careercopilot)

</div>
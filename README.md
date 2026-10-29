# 🎯 INTERVUEX — AI-Powered Virtual Interview Platform

Enterprise-grade virtual interview platform with real-time AI proctoring, speech recognition, text-to-speech, face detection, and automated candidate evaluation.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎥 Face Detection | Detects multiple faces, tracks identity throughout |
| 🎤 Speech-to-Text | Real-time voice transcription via Web Speech API |
| 🔊 Text-to-Speech | Questions read aloud automatically |
| 🤖 AI Questions | GPT-powered questions generated from resume |
| 📊 Auto Scoring | Multi-dimensional evaluation (technical, communication, integrity) |
| 📧 Email Invites | Automatic interview invitations via Gmail / SendGrid |
| 🔒 Proctoring | Tab switch, copy-paste, fullscreen, devtools detection |
| 📋 Reports | Full interview report with scores, violations, Q&A |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- OpenAI API Key (for AI questions — falls back to default questions if missing)

### 1. Clone & install

```bash
git clone https://github.com/akshayh-484/intervuex-platform.git
cd intervuex-platform

# Frontend dependencies
npm install

# Backend dependencies
cd server && npm install && cd ..
```

### 2. Set up the database

```bash
# Create database (PostgreSQL must be running)
psql -U postgres -c "CREATE DATABASE intervuex;"

# Run migrations
psql -U postgres -d intervuex -f server/migrations/001_initial_schema.sql
psql -U postgres -d intervuex -f server/migrations/002_add_time_window.sql
```

### 3. Configure environment

```bash
# Frontend env
cp .env.example .env

# Backend env
cp server/.env.example server/.env
# Then edit server/.env — fill in DB password, JWT secret, OpenAI key, email
```

Key values to set in `server/.env`:

```env
DB_PASSWORD=your_postgres_password
JWT_SECRET=any-long-random-string
OPENAI_API_KEY=sk-...          # Optional — falls back to default questions
EMAIL_SERVICE=gmail            # or sendgrid / smtp
EMAIL_USER=you@gmail.com
EMAIL_PASSWORD=your-app-password
```

### 4. Run

```bash
# Start both frontend + backend together
npm run dev
```

- Frontend → http://localhost:5173  
- Backend API → http://localhost:5000

---

## 🏗️ Project Structure

```
intervuex-platform/
├── src/                        # React frontend (Vite)
│   ├── components/
│   │   ├── interview/          # Timer, QuestionPanel, AnswerRecorder
│   │   └── proctoring/         # ProctoringEngine (face + browser monitoring)
│   ├── pages/                  # RecruiterDashboard, InterviewSession, Report…
│   └── services/               # api.js, faceDetection.js, socketService.js
├── server/                     # Node.js + Express backend
│   ├── controllers/            # auth, interview, recruiter, proctoring
│   ├── services/               # AI evaluator, question generator, email, scoring
│   ├── routes/                 # API route definitions
│   ├── middleware/             # JWT auth, logger, error handler
│   ├── migrations/             # PostgreSQL schema SQL files
│   └── index.js                # Server entry point
├── public/                     # Static assets
├── .env.example                # Frontend env template
└── server/.env.example         # Backend env template
```

---

## 🎓 How to Use

### Recruiter
1. Go to `/recruiter/register` — create an account
2. Log in → **Add Candidate** (name, email, optional PDF resume)
3. Click **Schedule Interview** — copy the one-time link
4. Send the link to the candidate (email is sent automatically if configured)
5. When interview completes → click **View Report**

### Candidate
1. Open the interview link in Chrome or Edge
2. Accept terms → allow camera & microphone
3. Answer questions by **typing** or clicking **Start Speaking** (voice input)
4. Questions are **read aloud automatically** (text-to-speech)
5. Submit all answers → interview complete

---

## 📊 Scoring Formula

```
Final Score = (Technical × 0.45) + (Problem Solving × 0.25)
            + (Communication × 0.15) + (Resume Authenticity × 0.15)
            - (Integrity Risk × 0.30)
```

| Score | Integrity Risk | Result |
|---|---|---|
| ≥ 70 | ≤ 20 | ✅ Auto-Shortlisted |
| 60–69 | 21–35 | 🔍 Manual Review |
| < 60 or critical violation | > 35 | ❌ Auto-Rejected |

---

## 🛠️ Tech Stack

**Frontend:** React 18, Vite, TailwindCSS, React Router, Face-API.js, Web Speech API  
**Backend:** Node.js, Express, PostgreSQL, Socket.IO, OpenAI API, Nodemailer, JWT, bcryptjs

---

## ⚠️ Browser Support

| Feature | Chrome | Edge | Firefox | Safari |
|---|---|---|---|---|
| Speech-to-text (mic) | ✅ | ✅ | ❌ | Partial |
| Text-to-speech | ✅ | ✅ | ✅ | ✅ |
| Face detection | ✅ | ✅ | ✅ | ✅ |
| Fullscreen API | ✅ | ✅ | ✅ | Partial |

**Recommended browser: Chrome or Edge.**

---

## 🔐 Security Notes

- Never commit real `.env` files — they are git-ignored
- Use a strong random `JWT_SECRET` in production
- Use SendGrid instead of Gmail for production email
- Rotate your OpenAI API key if it was ever exposed

---

## 📄 License

MIT — free to use and modify.

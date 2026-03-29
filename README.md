# StudyAI Pro — Free AI Study Tool

100% free AI-powered document analyzer using OpenRouter free models.
No Anthropic API key needed. No cost for you or users.

## Free Models Used
- Llama 3.1 8B (Meta) — Best overall
- Mistral 7B — Fast & smart  
- Gemma 2 9B (Google) — Strong reasoning
- Phi-3 Mini 128K (Microsoft) — Long context
- Qwen 2.5 7B — Multilingual

## Features (All Free)
- Document Analysis (8 modes: Full revision, Crash, Cheat sheet, Q&A, etc.)
- Flashcard generation
- Quiz generation
- AI Tutor chat
- Advanced Notes (editor, graph, AI enhance, version history)
- Multi-language (EN, HI, TE, TA, ES, FR, DE, ZH, AR)
- Dark / Light theme
- XP, streaks, badges gamification

## Deploy on Render

### Step 1 — Get Free OpenRouter Key
1. Go to https://openrouter.ai → Sign up free
2. Keys → Create Key → copy `sk-or-v1-...`

### Step 2 — Render Settings
- Build Command: `echo done`
- Start Command: `python server.py`
- Root Directory: (leave blank)
- Plan: Free

### Step 3 — Environment Variable
Add in Render → Environment:
```
OPENROUTER_API_KEY = sk-or-v1-your-key-here
PYTHON_VERSION = 3.11.9
```

### Step 4 — Verify
Visit: `https://your-app.onrender.com/api/health`
Should show: `{"status":"ok","key_set":true}`

## Run Locally

**Mac/Linux:**
```bash
export OPENROUTER_API_KEY=sk-or-v1-your-key
python3 server.py
# Open http://localhost:8000
```

**Windows:**
Edit `start.bat` → put your key → double-click it

## File Structure
```
studyai_pro/
├── index.html       ← Main app (Bootstrap 5 + animations)
├── server.py        ← Python server + OpenRouter proxy
├── start.sh         ← Mac/Linux launcher
├── start.bat        ← Windows launcher
├── css/
│   └── app.css      ← Design system + Bootstrap animations
└── js/
    ├── data.js      ← Data layer (OpenRouter model list)
    ├── analyzer.js  ← Analyzer → /api/chat proxy
    ├── modules.js   ← Nav, Files, Tutor, Flashcards, Quiz, Progress
    ├── notes.js     ← Advanced notes system
    └── app.js       ← App bootstrap + Settings
```

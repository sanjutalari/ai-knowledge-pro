# AI Knowledge Pro 🧠

**100% Free AI Study Tool** — Powered by OpenRouter free models (Llama 3, Mistral, Gemma)

## ✨ Features
- 📄 Document Analysis (PDF, DOCX, PPTX, TXT, Images)
- 🃏 AI Flashcard Generation
- ❓ Auto Quiz Generation
- 💬 AI Tutor Chat
- 📝 Advanced Notes (auto-generated, AI enhanced, version history)
- 🌐 Multi-language (EN, HI, TE, TA, ES, FR, DE, ZH, AR)
- 🌙 Dark / Light theme

---

## 🚀 Deploy on Render (Step by Step)

### Step 1 — Get Free OpenRouter API Key
1. Go to https://openrouter.ai
2. Sign up (free)
3. Go to **Keys** → **Create Key**
4. Copy the key (starts with `sk-or-v1-...`)
5. Free models included: Llama 3.1 8B, Mistral 7B, Gemma 2 9B

### Step 2 — Build the Frontend
Open terminal in the project root:
```bash
cd frontend
npm install
npm run build
```
This creates `backend/static/` folder with the compiled React app.

### Step 3 — Push to GitHub
```bash
# In the root ai-knowledge-pro/ folder:
git init
git add .
git commit -m "AI Knowledge Pro initial"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ai-knowledge-pro.git
git push -u origin main
```

### Step 4 — Create Render Web Service
1. Go to https://render.com → Sign in
2. Click **New +** → **Web Service**
3. Connect your GitHub repo
4. Fill in:
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python main.py`
   - **Plan:** Free

### Step 5 — Add Environment Variable
In Render dashboard → your service → **Environment**:
| Key | Value |
|-----|-------|
| `OPENROUTER_API_KEY` | `sk-or-v1-your-key-here` |

### Step 6 — Deploy
Click **Create Web Service** — done in ~2 minutes!

---

## 💻 Run Locally

```bash
# Backend
cd backend
pip install -r requirements.txt
export OPENROUTER_API_KEY=sk-or-v1-your-key
python main.py

# Frontend (separate terminal)
cd frontend
npm install
npm run dev     # runs on http://localhost:5173
```

---

## 🆓 Why It's Free
- **OpenRouter free tier** — Llama 3.1 8B, Mistral 7B, Gemma 2 9B are all free
- **Render free tier** — 750 hrs/month, enough for a personal app
- **No database** — uses local JSON files (zero DB cost)
- **No paid APIs** — no Anthropic, OpenAI, or other paid services

---

## 📁 File Structure
```
ai-knowledge-pro/
├── backend/
│   ├── main.py              ← FastAPI entry point
│   ├── requirements.txt
│   ├── uploads/             ← uploaded files + JSON storage
│   └── app/
│       ├── api/
│       │   ├── analyze.py   ← analysis, flashcards, quiz, AI enhance
│       │   ├── files.py     ← file upload + text extraction
│       │   ├── notes.py     ← notes CRUD
│       │   └── chat.py      ← AI tutor
│       ├── core/
│       │   └── llm.py       ← OpenRouter orchestrator
│       └── services/
│           └── document.py  ← PDF/DOCX/PPTX/OCR extraction
├── frontend/
│   ├── src/
│   │   ├── App.jsx          ← full React UI
│   │   ├── store/index.js   ← Zustand state management
│   │   └── index.css        ← design system
│   └── package.json
└── render.yaml
```

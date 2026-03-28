# AI Knowledge Pro — Deployment Guide

## Deploy on Render

### Settings:
- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`  
- Start Command: `python main.py`
- Plan: Free

### Environment Variables (required):
| Key | Value |
|-----|-------|
| `OPENROUTER_API_KEY` | `sk-or-v1-your-key-here` |
| `PYTHON_VERSION` | `3.11.9` |

### Get free OpenRouter key:
1. Go to https://openrouter.ai
2. Sign up → Keys → Create Key
3. Copy key starting with `sk-or-v1-...`
4. Paste in Render → Environment → OPENROUTER_API_KEY

### Verify deployment:
Visit `https://your-app.onrender.com/api/health`
Should show: `{"status":"ok","api_key_set":true}`

## Run locally:
```bash
cd backend
pip install -r requirements.txt
export OPENROUTER_API_KEY=sk-or-v1-your-key
python main.py
# Open http://localhost:8000
```

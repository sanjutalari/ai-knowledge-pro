"""
AI Knowledge Pro — FastAPI Backend
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from app.api import analyze, notes, files, chat

app = FastAPI(title="AI Knowledge Pro", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router, prefix="/api/analyze", tags=["analyze"])
app.include_router(notes.router,   prefix="/api/notes",   tags=["notes"])
app.include_router(files.router,   prefix="/api/files",   tags=["files"])
app.include_router(chat.router,    prefix="/api/chat",    tags=["chat"])

# Health check
@app.get("/api/health")
async def health():
    key = os.environ.get("OPENROUTER_API_KEY", "")
    return {
        "status": "ok",
        "api_key_set": bool(key),
        "api_key_preview": key[:12] + "..." if key else "NOT SET"
    }

# Serve frontend
STATIC = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(STATIC):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve(full_path: str):
        return FileResponse(os.path.join(STATIC, "index.html"))
else:
    @app.get("/")
    async def root():
        return {"status": "running", "note": "Build frontend and place in /static"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)

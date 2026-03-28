"""
AI Knowledge Pro — FastAPI Backend
Free models via OpenRouter + local processing
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from app.api import analyze, notes, files, chat

app = FastAPI(title="AI Knowledge Pro", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(analyze.router, prefix="/api/analyze", tags=["analyze"])
app.include_router(notes.router,   prefix="/api/notes",   tags=["notes"])
app.include_router(files.router,   prefix="/api/files",   tags=["files"])
app.include_router(chat.router,    prefix="/api/chat",    tags=["chat"])

# Serve React frontend build
FRONTEND_BUILD = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(FRONTEND_BUILD):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_BUILD, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        index = os.path.join(FRONTEND_BUILD, "index.html")
        return FileResponse(index)
else:
    @app.get("/")
    async def root():
        return {"status": "AI Knowledge Pro API running", "docs": "/docs"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)

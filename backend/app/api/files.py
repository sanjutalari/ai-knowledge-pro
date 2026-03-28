"""
Files API — Upload and manage documents
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import os, shutil, json
from pathlib import Path
from app.services.document import extract_text, get_file_info

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "../../uploads")
META_FILE  = os.path.join(UPLOAD_DIR, "_meta.json")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED = {".pdf",".docx",".doc",".pptx",".ppt",".txt",".md",".xlsx",".xls",".png",".jpg",".jpeg",".webp"}


def _load_meta() -> dict:
    if os.path.exists(META_FILE):
        try:
            with open(META_FILE) as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def _save_meta(meta: dict):
    with open(META_FILE, "w") as f:
        json.dump(meta, f, indent=2)


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED:
        raise HTTPException(400, f"File type {ext} not supported")

    # Save file
    safe_name = file.filename.replace(" ", "_")
    dest = os.path.join(UPLOAD_DIR, safe_name)
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Extract text
    text = extract_text(dest, file.filename)
    info = get_file_info(dest, file.filename)

    # Store metadata
    meta = _load_meta()
    file_id = f"f_{abs(hash(safe_name + str(os.path.getsize(dest))))}"
    meta[file_id] = {
        "id":       file_id,
        "name":     file.filename,
        "path":     dest,
        "size":     info["size"],
        "size_str": info["size_str"],
        "ext":      ext.lstrip("."),
        "text":     text,
        "added":    __import__("time").time(),
    }
    _save_meta(meta)

    return {
        "id":      file_id,
        "name":    file.filename,
        "size":    info["size_str"],
        "ext":     ext.lstrip("."),
        "text":    text[:500] + "..." if len(text) > 500 else text,
        "chars":   len(text),
    }


@router.get("/list")
async def list_files():
    meta = _load_meta()
    files = []
    for fid, info in meta.items():
        if fid.startswith("_"): continue
        files.append({
            "id":    info["id"],
            "name":  info["name"],
            "size":  info.get("size_str","—"),
            "ext":   info.get("ext",""),
            "chars": len(info.get("text","")),
            "added": info.get("added", 0),
        })
    files.sort(key=lambda x: x["added"], reverse=True)
    return {"files": files}


@router.get("/{file_id}/text")
async def get_file_text(file_id: str):
    meta = _load_meta()
    if file_id not in meta:
        raise HTTPException(404, "File not found")
    return {"text": meta[file_id]["text"], "name": meta[file_id]["name"]}


@router.delete("/{file_id}")
async def delete_file(file_id: str):
    meta = _load_meta()
    if file_id not in meta:
        raise HTTPException(404, "File not found")
    try:
        os.remove(meta[file_id]["path"])
    except Exception:
        pass
    del meta[file_id]
    _save_meta(meta)
    return {"deleted": file_id}

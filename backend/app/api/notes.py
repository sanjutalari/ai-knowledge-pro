"""Notes API"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import json, os, time

router = APIRouter()
NOTES_FILE = os.path.join(os.path.dirname(__file__), "../../uploads/_notes.json")

def _load():
    if os.path.exists(NOTES_FILE):
        try:
            with open(NOTES_FILE) as f: return json.load(f)
        except: pass
    return []

def _save(notes):
    with open(NOTES_FILE, "w") as f: json.dump(notes, f, indent=2)


class NoteIn(BaseModel):
    title:     str
    content:   str
    tag:       str = "key"
    file_id:   Optional[str] = None
    file_name: Optional[str] = None

class NoteUp(BaseModel):
    title:    Optional[str]  = None
    content:  Optional[str]  = None
    tag:      Optional[str]  = None
    pinned:   Optional[bool] = None


@router.get("/")
async def list_notes(q: Optional[str] = None):
    notes = _load()
    if q:
        ql    = q.lower()
        notes = [n for n in notes if ql in n["title"].lower() or ql in n["content"].lower()]
    return {"notes": sorted(notes, key=lambda n: (-int(n.get("pinned",False)), -n["updated"]))}

@router.post("/")
async def create_note(note: NoteIn):
    notes = _load()
    n = {
        "id": f"n_{int(time.time()*1000)}",
        "title": note.title, "content": note.content,
        "tag": note.tag, "file_id": note.file_id, "file_name": note.file_name,
        "pinned": False, "versions": [], "linked": [],
        "created": time.time(), "updated": time.time(),
    }
    notes.insert(0, n); _save(notes)
    return n

@router.put("/{note_id}")
async def update_note(note_id: str, upd: NoteUp):
    notes = _load()
    for n in notes:
        if n["id"] == note_id:
            if upd.content and upd.content != n["content"]:
                n["versions"].insert(0, {"content": n["content"], "updated": n["updated"]})
                n["versions"] = n["versions"][:10]
            if upd.title   is not None: n["title"]   = upd.title
            if upd.content is not None: n["content"] = upd.content
            if upd.tag     is not None: n["tag"]     = upd.tag
            if upd.pinned  is not None: n["pinned"]  = upd.pinned
            n["updated"] = time.time()
            _save(notes); return n
    raise HTTPException(404, "Note not found")

@router.delete("/{note_id}")
async def delete_note(note_id: str):
    notes = _load()
    _save([n for n in notes if n["id"] != note_id])
    return {"deleted": note_id}

@router.post("/bulk")
async def bulk_create(body: dict):
    notes_data = body.get("notes", [])
    notes      = _load()
    created    = []
    for i, nd in enumerate(notes_data):
        n = {
            "id": f"n_{int(time.time()*1000)}_{i}",
            "title": nd.get("title","Note"), "content": nd.get("content",""),
            "tag": nd.get("tag","key"), "file_id": nd.get("file_id"),
            "file_name": nd.get("file_name"), "pinned": False,
            "versions": [], "linked": [],
            "created": time.time(), "updated": time.time(),
        }
        notes.insert(0, n); created.append(n)
    _save(notes)
    return {"created": len(created), "notes": created}

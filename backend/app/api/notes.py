"""
Notes API — server-side note storage (JSON file based, no DB needed for free tier)
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import json, os, time

router = APIRouter()

NOTES_FILE = os.path.join(os.path.dirname(__file__), "../../uploads/_notes.json")

def _load() -> list:
    if os.path.exists(NOTES_FILE):
        try:
            with open(NOTES_FILE) as f:
                return json.load(f)
        except Exception:
            pass
    return []

def _save(notes: list):
    with open(NOTES_FILE, "w") as f:
        json.dump(notes, f, indent=2)


class NoteCreate(BaseModel):
    title:    str
    content:  str
    tag:      str = "key"
    file_id:  Optional[str] = None
    file_name: Optional[str] = None

class NoteUpdate(BaseModel):
    title:    Optional[str] = None
    content:  Optional[str] = None
    tag:      Optional[str] = None
    pinned:   Optional[bool] = None


@router.get("/")
async def list_notes(q: Optional[str] = None):
    notes = _load()
    if q:
        ql = q.lower()
        notes = [n for n in notes if ql in n["title"].lower() or ql in n["content"].lower()]
    return {"notes": sorted(notes, key=lambda n: (-n.get("pinned",0), -n["updated"]))}


@router.post("/")
async def create_note(note: NoteCreate):
    notes = _load()
    new_note = {
        "id":       f"n_{int(time.time()*1000)}",
        "title":    note.title,
        "content":  note.content,
        "tag":      note.tag,
        "file_id":  note.file_id,
        "file_name": note.file_name,
        "pinned":   False,
        "versions": [],
        "linked":   [],
        "created":  time.time(),
        "updated":  time.time(),
    }
    notes.insert(0, new_note)
    _save(notes)
    return new_note


@router.put("/{note_id}")
async def update_note(note_id: str, update: NoteUpdate):
    notes = _load()
    for note in notes:
        if note["id"] == note_id:
            if update.content and update.content != note["content"]:
                note["versions"].insert(0, {"content": note["content"], "updated": note["updated"]})
                if len(note["versions"]) > 10:
                    note["versions"] = note["versions"][:10]
            if update.title   is not None: note["title"]   = update.title
            if update.content is not None: note["content"] = update.content
            if update.tag     is not None: note["tag"]     = update.tag
            if update.pinned  is not None: note["pinned"]  = update.pinned
            note["updated"] = time.time()
            _save(notes)
            return note
    raise HTTPException(404, "Note not found")


@router.delete("/{note_id}")
async def delete_note(note_id: str):
    notes = _load()
    notes = [n for n in notes if n["id"] != note_id]
    _save(notes)
    return {"deleted": note_id}


@router.post("/bulk")
async def bulk_create_notes(body: dict):
    """Create multiple notes at once (from AI generation)."""
    notes_data = body.get("notes", [])
    notes = _load()
    created = []
    for nd in notes_data:
        new_note = {
            "id":       f"n_{int(time.time()*1000)}_{len(created)}",
            "title":    nd.get("title", "Note"),
            "content":  nd.get("content", ""),
            "tag":      nd.get("tag", "key"),
            "file_id":  nd.get("file_id"),
            "file_name": nd.get("file_name"),
            "pinned":   False,
            "versions": [],
            "linked":   [],
            "created":  time.time(),
            "updated":  time.time(),
        }
        notes.insert(0, new_note)
        created.append(new_note)
    _save(notes)
    return {"created": len(created), "notes": created}

"""Chat / Tutor API"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.core.llm import call_llm
import traceback

router = APIRouter()

class Msg(BaseModel):
    role:    str
    content: str

class ChatReq(BaseModel):
    message:  str
    history:  List[Msg] = []
    doc_text: Optional[str] = None
    doc_name: Optional[str] = None
    lang:     str = "en"

@router.post("/")
async def chat(req: ChatReq):
    system = "You are an expert AI study tutor. Answer clearly, use bullet points when helpful."
    if req.doc_name and req.doc_text:
        system += f'\n\nYou are tutoring based on: "{req.doc_name}".\nContent:\n{req.doc_text[:3000]}'

    history_text = ""
    for msg in req.history[-6:]:
        role = "User" if msg.role == "user" else "Assistant"
        history_text += f"{role}: {msg.content}\n"

    prompt = f"{history_text}User: {req.message}\nAssistant:"
    try:
        reply = await call_llm(prompt, system, task="chat", lang=req.lang, max_tokens=600)
        return {"reply": reply}
    except Exception as e:
        tb = traceback.format_exc()
        print(f"[chat error] {e}\n{tb}")
        raise HTTPException(500, str(e))

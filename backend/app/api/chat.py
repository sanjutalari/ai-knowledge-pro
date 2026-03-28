"""
Chat / AI Tutor API
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from app.core.llm import call_llm

router = APIRouter()


class Message(BaseModel):
    role:    str   # "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    message:  str
    history:  List[Message] = []
    doc_text: Optional[str] = None
    doc_name: Optional[str] = None
    lang:     str = "en"


@router.post("/")
async def chat(req: ChatRequest):
    system = "You are an expert AI study tutor. Answer clearly and helpfully."
    if req.doc_name and req.doc_text:
        system += f'\n\nYou are tutoring based on: "{req.doc_name}".\nContent:\n{req.doc_text[:3000]}'

    # Build conversation context
    history_text = ""
    for msg in req.history[-6:]:  # last 6 messages for context
        role = "User" if msg.role == "user" else "Assistant"
        history_text += f"{role}: {msg.content}\n"

    prompt = f"{history_text}User: {req.message}\nAssistant:"

    result = await call_llm(
        prompt, system,
        task="chat", lang=req.lang, max_tokens=600
    )
    return {"reply": result}

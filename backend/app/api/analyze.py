"""
Analyze API — Document analysis with free LLMs via OpenRouter
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import json

from app.core.llm import call_llm, call_llm_parallel

router = APIRouter()

# ── Prompts ──
PROMPTS = {
    "full": "Analyze ALL topics in this document and create a complete revision report. Use ## for each topic heading. For each topic: definition, key concepts as bullets, real example, common mistakes, 2-3 exam points. End with ## Quick Cheat Sheet.",
    "oneday": "Cover ALL topics for 1-day revision. ## heading per topic. Definition (1-2 lines), key bullets, one example, exam points. Concise. End with ## Final Cheat Sheet.",
    "crash": "Crash revision — high-weightage topics only. ## per topic. Ultra-short: definition, 3 key points, one example, must-remember line. End with ## Memory Sheet.",
    "cheat": "Create a one-page cheat sheet. ## sections for each topic. Only: definitions, formulas, syntax, keywords. Extremely short. No explanations.",
    "qa": "Generate exam Q&A. ## sections: 2-mark Q&A, 5-mark Q&A, 10-mark detailed answers, viva questions. Exam-ready.",
    "lastnight": "Last-night revision. ## per topic. ONLY: key definitions, formulas, tricky points, common mistakes, repeated exam questions. Very short bullets.",
    "beginner": "Teach from zero. ## per topic. Simple definition, step-by-step explanation, real example, practice questions with answers.",
    "strategy": "Smart Exam Strategy. ## sections: Easy scoring topics, High-weightage topics, Time allocation table, Recommended writing order, Quick wins. Priority score 1-10.",
    "summary": "Summarize this document in a structured way. ## Overview, ## Key Points (bullets), ## Important Concepts, ## Conclusion. Clear and concise.",
    "mindmap": "Create a text-based mind map of this document. Use indentation to show hierarchy. Main topic → Subtopics → Details. Format as nested bullets.",
}

MODES = [
    {"id": "full",      "ic": "📚", "label": "Full revision",  "desc": "Every topic"},
    {"id": "oneday",    "ic": "☀️",  "label": "1-day plan",     "desc": "All topics fast"},
    {"id": "crash",     "ic": "⚡", "label": "3-hr crash",     "desc": "High-impact only"},
    {"id": "cheat",     "ic": "📋", "label": "Cheat sheet",    "desc": "One-page notes"},
    {"id": "qa",        "ic": "❓", "label": "Q&A mode",       "desc": "Exam questions"},
    {"id": "lastnight", "ic": "🌙", "label": "Last night",     "desc": "1-hr sprint"},
    {"id": "beginner",  "ic": "🌱", "label": "Beginner+",      "desc": "Deep learning"},
    {"id": "strategy",  "ic": "🎯", "label": "Exam strategy",  "desc": "Score plan"},
    {"id": "summary",   "ic": "📄", "label": "Summary",        "desc": "Quick overview"},
    {"id": "mindmap",   "ic": "🗺️",  "label": "Mind map",       "desc": "Visual structure"},
]


class AnalyzeRequest(BaseModel):
    text:     str
    filename: str  = "document"
    mode:     str  = "full"
    lang:     str  = "en"
    parallel: bool = False   # use 2 models for better quality


class FlashcardRequest(BaseModel):
    text: str
    lang: str = "en"
    count: int = 10


class QuizRequest(BaseModel):
    text: str
    lang: str = "en"
    count: int = 8


@router.get("/modes")
async def get_modes():
    return {"modes": MODES}


@router.post("/document")
async def analyze_document(req: AnalyzeRequest):
    if not req.text or len(req.text.strip()) < 20:
        raise HTTPException(400, "Document text too short or empty")

    prompt_template = PROMPTS.get(req.mode, PROMPTS["full"])
    prompt = f"""{prompt_template}

Document: {req.filename}
Content:
{req.text}

Structure with ## headings. Use bullet points. Be thorough."""

    system = "You are an expert study assistant and educator. Create clear, structured study materials."

    if req.parallel:
        result = await call_llm_parallel(prompt, system, lang=req.lang, max_tokens=1500)
        return {"result": result["merged"], "models_used": list(result.keys()), "mode": req.mode}
    else:
        result = await call_llm(prompt, system, task="analyze", lang=req.lang, max_tokens=1500)
        return {"result": result, "mode": req.mode}


@router.post("/flashcards")
async def generate_flashcards(req: FlashcardRequest):
    prompt = f"""Create {req.count} flashcards from this document content.
Return ONLY a valid JSON array, no other text:
[{{"front": "question", "back": "answer"}}, ...]

Document content:
{req.text[:4000]}"""

    result = await call_llm(
        prompt,
        "You are a study assistant. Return only valid JSON arrays for flashcards.",
        task="flashcards", lang=req.lang, max_tokens=1000
    )

    try:
        clean = result.replace("```json", "").replace("```", "").strip()
        # Find JSON array
        start = clean.find("[")
        end   = clean.rfind("]") + 1
        if start != -1 and end > start:
            cards = json.loads(clean[start:end])
            return {"flashcards": cards}
        raise ValueError("No JSON array found")
    except Exception:
        # Fallback: parse manually
        return {"flashcards": [], "raw": result, "error": "Could not parse JSON"}


@router.post("/quiz")
async def generate_quiz(req: QuizRequest):
    prompt = f"""Create {req.count} multiple-choice quiz questions from this document.
Return ONLY a valid JSON array:
[{{"question":"...","options":["a) ...","b) ...","c) ...","d) ..."],"correct_answer":"a","explanation":"..."}}]

Document content:
{req.text[:4000]}"""

    result = await call_llm(
        prompt,
        "You are a quiz generator. Return only valid JSON arrays.",
        task="quiz", lang=req.lang, max_tokens=1200
    )

    try:
        clean = result.replace("```json", "").replace("```", "").strip()
        start = clean.find("[")
        end   = clean.rfind("]") + 1
        if start != -1 and end > start:
            questions = json.loads(clean[start:end])
            return {"questions": questions}
        raise ValueError("No JSON array found")
    except Exception:
        return {"questions": [], "raw": result, "error": "Could not parse JSON"}


@router.post("/enhance-note")
async def enhance_note(body: dict):
    action  = body.get("action", "summary")
    content = body.get("content", "")
    lang    = body.get("lang", "en")

    prompts = {
        "expand":    f"Expand this note with more detail, examples, and context:\n\n{content}",
        "simplify":  f"Simplify this to the most essential points, very concise:\n\n{content}",
        "summary":   f"Write a 2-3 sentence summary:\n\n{content}",
        "missing":   f"What key concepts are missing from this note? Give 3-5 suggestions:\n\n{content}",
        "rewrite":   f"Rewrite this note more clearly and professionally:\n\n{content}",
        "bullets":   f"Convert this note to well-organized bullet points:\n\n{content}",
    }

    prompt = prompts.get(action, prompts["summary"])
    result = await call_llm(prompt, "You are a helpful note-taking assistant.", task="enhance", lang=lang, max_tokens=600)
    return {"result": result, "action": action}

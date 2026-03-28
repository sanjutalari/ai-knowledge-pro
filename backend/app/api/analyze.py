"""
Analyze API — Document analysis, flashcards, quiz, note enhancement
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import json
import traceback

from app.core.llm import call_llm

router = APIRouter()

PROMPTS = {
    "full":      "Analyze ALL topics in this document. Use ## for each topic heading. For each topic include: definition, key concepts as bullets, real example, common mistakes, exam points. End with ## Quick Cheat Sheet.",
    "oneday":    "Cover ALL topics for 1-day revision. ## heading per topic. Definition, key bullets, one example, exam points. End with ## Final Cheat Sheet.",
    "crash":     "Crash revision — high-weightage topics only. ## per topic. Definition, 3 key points, one example. End with ## Memory Sheet.",
    "cheat":     "One-page cheat sheet. ## sections per topic. Only: definitions, formulas, keywords. Extremely short.",
    "qa":        "Generate exam Q&A. ## sections: 2-mark Q&A, 5-mark Q&A, 10-mark answers, viva questions.",
    "lastnight": "Last-night revision. ## per topic. Key definitions, formulas, tricky points, common mistakes. Very short.",
    "beginner":  "Teach from zero. ## per topic. Simple definition, step-by-step explanation, real example, practice questions.",
    "strategy":  "Exam Strategy report. ## sections: Easy topics, High-weightage topics, Time allocation table, Recommended order.",
    "summary":   "Summarize this document. ## Overview, ## Key Points, ## Important Concepts, ## Conclusion.",
    "mindmap":   "Create a text mind map. Use indentation for hierarchy. Main topic → Subtopics → Details. Nested bullets.",
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
    filename: str = "document"
    mode:     str = "full"
    lang:     str = "en"


class FlashcardRequest(BaseModel):
    text:  str
    lang:  str = "en"
    count: int = 10


class QuizRequest(BaseModel):
    text:  str
    lang:  str = "en"
    count: int = 8


class EnhanceRequest(BaseModel):
    content: str
    action:  str = "summary"
    lang:    str = "en"


@router.get("/modes")
async def get_modes():
    return {"modes": MODES}


@router.post("/document")
async def analyze_document(req: AnalyzeRequest):
    if not req.text or len(req.text.strip()) < 10:
        raise HTTPException(400, "Document text is too short or empty")

    prompt_template = PROMPTS.get(req.mode, PROMPTS["full"])
    prompt = f"""{prompt_template}

Document name: {req.filename}
Content:
{req.text[:6000]}

Use ## headings. Use bullet points. Be thorough and helpful."""

    try:
        result = await call_llm(
            prompt,
            system="You are an expert study assistant and educator. Create clear, structured study materials.",
            task="analyze",
            lang=req.lang,
            max_tokens=1500,
        )
        return {"result": result, "mode": req.mode, "filename": req.filename}
    except Exception as e:
        tb = traceback.format_exc()
        print(f"[analyze error] {e}\n{tb}")
        raise HTTPException(500, str(e))


@router.post("/flashcards")
async def generate_flashcards(req: FlashcardRequest):
    prompt = f"""Create {req.count} flashcards from this content.
Return ONLY a JSON array, no extra text, no markdown fences:
[{{"front": "question here", "back": "answer here"}}]

Content:
{req.text[:4000]}"""

    try:
        raw = await call_llm(
            prompt,
            system="You are a flashcard generator. Return only valid JSON arrays.",
            task="flashcards",
            lang=req.lang,
            max_tokens=1200,
        )
        clean = raw.replace("```json", "").replace("```", "").strip()
        start = clean.find("[")
        end   = clean.rfind("]") + 1
        if start != -1 and end > start:
            cards = json.loads(clean[start:end])
            return {"flashcards": cards}
        return {"flashcards": [], "error": "Could not parse response", "raw": raw[:300]}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/quiz")
async def generate_quiz(req: QuizRequest):
    prompt = f"""Create {req.count} multiple-choice quiz questions.
Return ONLY a JSON array, no extra text, no markdown fences:
[{{"question":"...","options":["a) ...","b) ...","c) ...","d) ..."],"correct_answer":"a","explanation":"..."}}]

Content:
{req.text[:4000]}"""

    try:
        raw = await call_llm(
            prompt,
            system="You are a quiz generator. Return only valid JSON arrays.",
            task="quiz",
            lang=req.lang,
            max_tokens=1400,
        )
        clean = raw.replace("```json", "").replace("```", "").strip()
        start = clean.find("[")
        end   = clean.rfind("]") + 1
        if start != -1 and end > start:
            questions = json.loads(clean[start:end])
            return {"questions": questions}
        return {"questions": [], "error": "Could not parse response", "raw": raw[:300]}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/enhance-note")
async def enhance_note(req: EnhanceRequest):
    prompts = {
        "expand":   f"Expand this note with more detail, examples, and context:\n\n{req.content}",
        "simplify": f"Simplify to the most essential points, very concise:\n\n{req.content}",
        "summary":  f"Write a 2-3 sentence summary:\n\n{req.content}",
        "missing":  f"What key concepts are missing? Give 3-5 suggestions:\n\n{req.content}",
        "rewrite":  f"Rewrite more clearly and professionally:\n\n{req.content}",
        "bullets":  f"Convert to well-organized bullet points:\n\n{req.content}",
    }
    prompt = prompts.get(req.action, prompts["summary"])
    try:
        result = await call_llm(prompt, task="enhance", lang=req.lang, max_tokens=600)
        return {"result": result, "action": req.action}
    except Exception as e:
        raise HTTPException(500, str(e))

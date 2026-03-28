"""
LLM Orchestrator — Routes to best FREE model via OpenRouter
Free models available: Llama 3.1 8B, Mistral 7B, Gemma 2 9B, Qwen 2.5 7B
"""
import os
import httpx
import asyncio
from typing import Optional

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_BASE    = "https://openrouter.ai/api/v1/chat/completions"

# ── Free models on OpenRouter (as of 2025) ──
FREE_MODELS = [
    "meta-llama/llama-3.1-8b-instruct:free",      # Best overall free
    "mistralai/mistral-7b-instruct:free",           # Fast, good reasoning
    "google/gemma-2-9b-it:free",                    # Strong instruction following
    "qwen/qwen-2.5-7b-instruct:free",               # Good for multilingual
    "microsoft/phi-3-mini-128k-instruct:free",      # Long context (128k!)
]

# Task → best free model mapping
TASK_MODEL_MAP = {
    "analyze":    "meta-llama/llama-3.1-8b-instruct:free",
    "notes":      "mistralai/mistral-7b-instruct:free",
    "chat":       "meta-llama/llama-3.1-8b-instruct:free",
    "flashcards": "google/gemma-2-9b-it:free",
    "quiz":       "google/gemma-2-9b-it:free",
    "enhance":    "qwen/qwen-2.5-7b-instruct:free",
    "summarize":  "microsoft/phi-3-mini-128k-instruct:free",
}

LANG_INSTRUCTIONS = {
    "en": "Respond in English.",
    "hi": "हिंदी में उत्तर दें।",
    "te": "తెలుగులో సమాధానం ఇవ్వండి.",
    "ta": "தமிழில் பதிலளிக்கவும்.",
    "es": "Responde en Español.",
    "fr": "Répondez en Français.",
    "de": "Auf Deutsch antworten.",
    "zh": "用中文回答。",
    "ar": "أجب باللغة العربية.",
}


async def call_llm(
    prompt: str,
    system: str = "You are a helpful AI study assistant.",
    task: str = "analyze",
    lang: str = "en",
    max_tokens: int = 1500,
    fallback: bool = True,
) -> str:
    """
    Call OpenRouter free LLM with automatic fallback.
    Falls back through model list if one fails.
    """
    if not OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY not set. Add it in Render environment variables.")

    lang_inst = LANG_INSTRUCTIONS.get(lang, "")
    full_system = f"{system}\n{lang_inst}".strip()

    primary_model = TASK_MODEL_MAP.get(task, FREE_MODELS[0])
    models_to_try = [primary_model] + [m for m in FREE_MODELS if m != primary_model]

    last_error = None
    for model in (models_to_try if fallback else [primary_model]):
        try:
            result = await _call_model(model, full_system, prompt, max_tokens)
            return result
        except Exception as e:
            last_error = e
            continue

    raise Exception(f"All models failed. Last error: {last_error}")


async def call_llm_parallel(
    prompt: str,
    system: str,
    lang: str = "en",
    max_tokens: int = 800,
) -> dict:
    """
    Call 2 models in parallel, return both responses + a merged summary.
    Used for high-quality analysis where we want diverse perspectives.
    """
    lang_inst = LANG_INSTRUCTIONS.get(lang, "")
    full_system = f"{system}\n{lang_inst}".strip()

    models = [
        "meta-llama/llama-3.1-8b-instruct:free",
        "google/gemma-2-9b-it:free",
    ]

    tasks = [_call_model(m, full_system, prompt, max_tokens) for m in models]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    responses = {}
    valid = []
    for model, result in zip(models, results):
        name = model.split("/")[1].split(":")[0]
        if isinstance(result, str):
            responses[name] = result
            valid.append(result)
        else:
            responses[name] = f"[Error: {result}]"

    # Merge/synthesize if we have 2 valid responses
    if len(valid) >= 2:
        merge_prompt = f"""You have two AI responses to the same question. 
Merge them into one comprehensive, well-structured answer. 
Remove duplicates, keep the best insights from both.

Response 1:
{valid[0]}

Response 2:
{valid[1]}

Merged answer:"""
        try:
            merged = await _call_model(
                "mistralai/mistral-7b-instruct:free",
                "You are an expert at synthesizing information. Be concise.",
                merge_prompt, 1000
            )
            responses["merged"] = merged
        except Exception:
            responses["merged"] = valid[0]
    else:
        responses["merged"] = valid[0] if valid else "No response available."

    return responses


async def _call_model(model: str, system: str, prompt: str, max_tokens: int) -> str:
    """Raw OpenRouter API call."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            OPENROUTER_BASE,
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "HTTP-Referer": "https://ai-knowledge-pro.onrender.com",
                "X-Title": "AI Knowledge Pro",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user",   "content": prompt},
                ],
                "max_tokens": max_tokens,
                "temperature": 0.7,
            }
        )
        resp.raise_for_status()
        data = resp.json()

        if "error" in data:
            raise Exception(data["error"].get("message", "API error"))

        return data["choices"][0]["message"]["content"].strip()

"""
LLM Orchestrator — OpenRouter free models with full error handling
"""
import os
import httpx

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_URL     = "https://openrouter.ai/api/v1/chat/completions"

# Best free models on OpenRouter (2025)
FREE_MODELS = [
    "meta-llama/llama-3.1-8b-instruct:free",
    "mistralai/mistral-7b-instruct:free",
    "google/gemma-2-9b-it:free",
    "microsoft/phi-3-mini-128k-instruct:free",
    "qwen/qwen-2.5-7b-instruct:free",
]

TASK_MODELS = {
    "analyze":    "meta-llama/llama-3.1-8b-instruct:free",
    "flashcards": "google/gemma-2-9b-it:free",
    "quiz":       "google/gemma-2-9b-it:free",
    "chat":       "meta-llama/llama-3.1-8b-instruct:free",
    "enhance":    "mistralai/mistral-7b-instruct:free",
    "notes":      "mistralai/mistral-7b-instruct:free",
}

LANG_MAP = {
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
) -> str:
    """Call OpenRouter with automatic model fallback."""
    if not OPENROUTER_API_KEY:
        raise ValueError(
            "OPENROUTER_API_KEY environment variable is not set. "
            "Add it in Render → Environment settings."
        )

    lang_inst   = LANG_MAP.get(lang, "")
    full_system = f"{system}\n{lang_inst}".strip()
    primary     = TASK_MODELS.get(task, FREE_MODELS[0])
    to_try      = [primary] + [m for m in FREE_MODELS if m != primary]

    last_err = None
    for model in to_try:
        try:
            result = await _call(model, full_system, prompt, max_tokens)
            return result
        except Exception as e:
            last_err = e
            continue

    raise Exception(f"All models failed. Last error: {last_err}")


async def _call(model: str, system: str, prompt: str, max_tokens: int) -> str:
    async with httpx.AsyncClient(timeout=90.0) as client:
        resp = await client.post(
            OPENROUTER_URL,
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
                "max_tokens":  max_tokens,
                "temperature": 0.7,
            }
        )

        data = resp.json()

        # OpenRouter error
        if "error" in data:
            msg = data["error"].get("message", str(data["error"]))
            raise Exception(f"OpenRouter error: {msg}")

        # HTTP error
        if resp.status_code != 200:
            raise Exception(f"HTTP {resp.status_code}: {resp.text[:200]}")

        choices = data.get("choices", [])
        if not choices:
            raise Exception(f"No choices returned. Response: {data}")

        return choices[0]["message"]["content"].strip()

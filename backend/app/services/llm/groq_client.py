import asyncio

from groq import Groq
from groq import APIStatusError, RateLimitError as GroqRateLimit

from app.core.config import settings
from app.services.llm.base import LLMClient
from app.services.llm.exceptions import RateLimitError, ProviderError


class GroqClient(LLMClient):
    def __init__(self):
        self.client = Groq(api_key=settings.groq_api_key)
        self.model = settings.llm_model or "llama-3.3-70b-versatile"

    async def generate(self, prompt: str) -> str:
        try:
            resp = await asyncio.to_thread(
                self.client.chat.completions.create,
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
            )
            return resp.choices[0].message.content or ""
        except GroqRateLimit:
            raise RateLimitError("Groq rate limit hit")
        except APIStatusError as e:
            raise ProviderError(str(e)) from e

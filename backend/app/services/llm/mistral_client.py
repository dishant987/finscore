import asyncio

from mistralai.client import Mistral

from app.core.config import settings
from app.services.llm.base import LLMClient
from app.services.llm.exceptions import RateLimitError, ProviderError


class MistralClient(LLMClient):
    def __init__(self):
        self.client = Mistral(api_key=settings.mistral_api_key)
        self.model = settings.llm_model or "mistral-small-latest"

    async def generate(self, prompt: str) -> str:
        try:
            resp = await asyncio.to_thread(
                self.client.chat.complete,
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
            )
            return resp.choices[0].message.content or ""
        except Exception as e:
            if "rate" in str(e).lower():
                raise RateLimitError(str(e)) from e
            raise ProviderError(str(e)) from e

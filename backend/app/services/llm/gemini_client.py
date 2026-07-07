import asyncio

from google import genai
from google.genai import errors as genai_errors

from app.core.config import settings
from app.services.llm.base import LLMClient
from app.services.llm.exceptions import RateLimitError, ProviderError


class GeminiClient(LLMClient):
    def __init__(self):
        self.client = genai.Client(api_key=settings.gemini_api_key)
        self.model = settings.llm_model or "gemini-2.5-flash"

    async def generate(self, prompt: str) -> str:
        try:
            resp = await asyncio.to_thread(
                self.client.models.generate_content, model=self.model, contents=prompt
            )
            return resp.text
        except genai_errors.APIError as e:
            if e.code in (429, 503):
                raise RateLimitError(str(e)) from e
            raise ProviderError(str(e)) from e

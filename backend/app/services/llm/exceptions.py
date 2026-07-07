class LLMError(Exception):
    ...


class RateLimitError(LLMError):
    ...


class ProviderError(LLMError):
    ...

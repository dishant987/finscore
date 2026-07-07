import asyncio

from app.core.config import settings
from app.services.llm.gemini_client import GeminiClient
from app.services.llm.groq_client import GroqClient
from app.services.llm.mistral_client import MistralClient
from app.services.llm.exceptions import RateLimitError, ProviderError


class LLMRouter:
    def __init__(self):
        self._providers = None

    def _get_providers(self):
        if self._providers is None:
            self._providers = []
            if settings.gemini_api_key:
                self._providers.append(GeminiClient())
            if settings.groq_api_key:
                self._providers.append(GroqClient())
            if settings.mistral_api_key:
                self._providers.append(MistralClient())
        return self._providers

    async def generate(self, prompt: str) -> str:
        providers = self._get_providers()
        if not providers:
            return "No LLM providers configured."
        last_err = None
        for provider in providers:
            try:
                return await provider.generate(prompt)
            except RateLimitError as e:
                last_err = e
                continue
            except ProviderError as e:
                last_err = e
                continue
        raise last_err  # type: ignore[misc]


_router = LLMRouter()


async def generate_insights(profile, score) -> str | None:
    dims = f"Cash Flow={score.cash_flow_health:.0f}, Compliance={score.compliance:.0f}, Growth={score.growth_trajectory:.0f}, Stability={score.stability:.0f}, Debt={score.debt_serviceability:.0f}"
    prompt = (
        f"Analyze this MSME's health score ({score.overall_score:.1f}/100, "
        f"band: {score.band}).\n"
        f"Dimensions: {dims}\n"
        f"Business: {profile.business_name}, {profile.industry}.\n"
        f"Revenue: ${profile.annual_revenue:,.2f}, "
        f"Profit: ${profile.net_profit:,.2f}.\n"
        f"Digital score: {profile.digital_adoption_score:.1f}, "
        f"Retention: {profile.customer_retention_rate:.1f}%.\n"
        f"Give 3 actionable recommendations to improve financial health."
    )
    try:
        return await _router.generate(prompt)
    except Exception:
        return None


async def generate_portfolio_insights(portfolio_data: dict) -> str | None:
    summary = portfolio_data.get("portfolio_summary", {})
    industry = portfolio_data.get("industry_insights", [])

    prompt = (
        f"Analyze this MSME lending portfolio:\n"
        f"- Total MSMEs: {summary.get('total_recommendations', 0)}\n"
        f"- Approve: {summary.get('approve', 0)}, Conditional: {summary.get('conditional', 0)}, Decline: {summary.get('decline', 0)}\n"
        f"- Total approved lending: ₹{summary.get('total_approved_amount', 0):,.0f}\n"
        f"- Total conditional lending: ₹{summary.get('total_conditional_amount', 0):,.0f}\n"
        f"\nIndustry breakdown:\n"
    )
    for ind in industry[:6]:
        prompt += f"- {ind['industry']}: {ind['msme_count']} MSMEs, avg score {ind['avg_score']}, {ind['high_risk_pct']}% high-risk, action={ind['recommendation']}\n"

    prompt += (
        "\nProvide:\n"
        "1. Top 3 portfolio risks\n"
        "2. Sector-specific lending recommendations\n"
        "3. Risk mitigation strategies\n"
        "Keep it concise and actionable for a bank credit officer."
    )
    try:
        return await _router.generate(prompt)
    except Exception:
        return None

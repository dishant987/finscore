from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_profiles: int
    average_scores: dict
    risk_distribution: dict
    recent_scores: list

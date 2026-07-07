from pydantic import BaseModel, field_validator
from datetime import datetime
import json


class ScoreOut(BaseModel):
    id: str
    profile_id: str
    overall_score: float
    band: str
    cash_flow_health: float
    compliance: float
    growth_trajectory: float
    stability: float
    debt_serviceability: float
    strengths: list[str]
    risks: list[str]
    llm_insights: str | None = None
    default_probability: float = 0.5
    risk_tier: str = "medium"
    computed_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("strengths", "risks", mode="before")
    @classmethod
    def parse_json(cls, v: str | list) -> list:
        if isinstance(v, str):
            return json.loads(v)
        return v

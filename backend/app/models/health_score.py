import json
import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel


class Score(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    profile_id: str = Field(foreign_key="msmeprofile.id", index=True)
    overall_score: float
    band: str
    cash_flow_health: float
    compliance: float
    growth_trajectory: float
    stability: float
    debt_serviceability: float
    strengths: str = "[]"
    risks: str = "[]"
    llm_insights: str | None = None
    default_probability: float = 0.5
    risk_tier: str = "medium"
    computed_at: datetime = Field(default_factory=datetime.utcnow)

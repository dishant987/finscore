import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel


class MSMEProfile(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(default_factory=lambda: str(uuid.uuid4()), index=True)
    business_name: str
    business_type: str
    industry: str
    year_established: int
    employee_count: int
    gstin: str = Field(max_length=15, default="")

    annual_revenue: float
    net_profit: float
    total_assets: float
    total_liabilities: float

    monthly_transaction_volume: int
    avg_transaction_value: float
    customer_retention_rate: float
    digital_adoption_score: float

    market_share: float = 0.0
    competitor_count: int = 0
    regulatory_compliance_score: float = 100.0

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

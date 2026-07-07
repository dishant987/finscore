from pydantic import BaseModel, field_validator
from datetime import datetime


class MSMECreate(BaseModel):
    business_name: str
    business_type: str
    industry: str
    year_established: int
    employee_count: int
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

    @field_validator("business_name", "business_type", "industry")
    @classmethod
    def not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("This field is required")
        if len(v) > 200:
            raise ValueError("Too long (max 200 characters)")
        return v

    @field_validator("year_established")
    @classmethod
    def valid_year(cls, v: int) -> int:
        if v < 1900 or v > 2030:
            raise ValueError("Must be between 1900 and 2030")
        return v

    @field_validator("employee_count")
    @classmethod
    def valid_employees(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Must have at least 1 employee")
        if v > 100_000:
            raise ValueError("Employee count too large")
        return v

    @field_validator("annual_revenue", "total_assets", "total_liabilities")
    @classmethod
    def non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Must not be negative")
        if v > 1e15:
            raise ValueError("Value too large")
        return v

    @field_validator("customer_retention_rate", "digital_adoption_score", "regulatory_compliance_score")
    @classmethod
    def percent(cls, v: float) -> float:
        if v < 0 or v > 100:
            raise ValueError("Must be between 0 and 100")
        return v

    @field_validator("monthly_transaction_volume", "competitor_count")
    @classmethod
    def non_negative_int(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Must not be negative")
        return v


class MSMEOut(BaseModel):
    id: str
    user_id: str
    business_name: str
    business_type: str
    industry: str
    year_established: int
    employee_count: int
    annual_revenue: float
    net_profit: float
    total_assets: float
    total_liabilities: float
    monthly_transaction_volume: int
    avg_transaction_value: float
    customer_retention_rate: float
    digital_adoption_score: float
    market_share: float
    competitor_count: int
    regulatory_compliance_score: float
    created_at: datetime
    updated_at: datetime
    overall_score: float | None = None
    band: str | None = None

    model_config = {"from_attributes": True}

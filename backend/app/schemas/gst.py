from pydantic import BaseModel
from datetime import date


class GSTCreate(BaseModel):
    gstin: str
    filing_period: str
    taxable_value: float
    gst_liability: float
    input_tax_credit: float
    net_gst_paid: float
    filed_on_time: bool = True
    filing_date: date | None = None


class GSTOut(GSTCreate):
    id: str
    profile_id: str

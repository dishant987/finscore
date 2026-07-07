import uuid
from datetime import date

from sqlmodel import Field, SQLModel


class GSTRecord(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    profile_id: str = Field(foreign_key="msmeprofile.id", index=True)
    gstin: str = Field(max_length=15)
    filing_period: str
    taxable_value: float
    gst_liability: float
    input_tax_credit: float
    net_gst_paid: float
    filed_on_time: bool = True
    filing_date: date | None = None

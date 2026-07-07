import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel


class Transaction(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    profile_id: str = Field(foreign_key="msmeprofile.id", index=True)
    date: datetime
    amount: float
    type: str
    category: str
    description: str | None = None
    balance_after: float | None = None
    is_reconciled: bool = False

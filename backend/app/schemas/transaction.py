from pydantic import BaseModel
from datetime import datetime


class TransactionCreate(BaseModel):
    date: datetime
    amount: float
    type: str
    category: str
    description: str | None = None
    balance_after: float | None = None
    is_reconciled: bool = False


class TransactionOut(TransactionCreate):
    id: str
    profile_id: str

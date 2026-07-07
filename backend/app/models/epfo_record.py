import uuid

from sqlmodel import Field, SQLModel


class EPFORecord(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    profile_id: str = Field(foreign_key="msmeprofile.id", index=True)
    month: int
    year: int
    employee_count_covered: int
    total_wages: float
    epf_contribution: float
    eps_contribution: float
    edli_contribution: float
    filed_on_time: bool = True
    compliance_score: float = 100.0

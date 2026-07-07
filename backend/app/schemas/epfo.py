from pydantic import BaseModel


class EPFOCreate(BaseModel):
    month: int
    year: int
    employee_count_covered: int
    total_wages: float
    epf_contribution: float
    eps_contribution: float
    edli_contribution: float
    filed_on_time: bool = True


class EPFOOut(EPFOCreate):
    id: str
    profile_id: str
    compliance_score: float

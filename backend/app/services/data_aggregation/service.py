from __future__ import annotations

from typing import TYPE_CHECKING

from pydantic import BaseModel
from sqlalchemy import select, func

from app.models.msme_profile import MSMEProfile
from app.services.data_aggregation.connectors import (
    GSTConnector,
    AAConnector,
    UPIConnector,
    EPFOConnector,
    EInvoiceConnector,
)

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession


class AggregatedData(BaseModel):
    """Unified view of all alternative data sources for a single MSME."""
    profile_id: str
    business_name: str
    industry: str

    gst: dict | None = None
    bank_statement: dict | None = None
    upi: dict | None = None
    epfo: dict | None = None
    einvoice: dict | None = None

    derived: dict = {}


class DataAggregationService:
    """Runs all source connectors and normalizes into one AggregatedData object."""

    CONNECTORS = [
        ("gst", GSTConnector),
        ("bank_statement", AAConnector),
        ("upi", UPIConnector),
        ("epfo", EPFOConnector),
        ("einvoice", EInvoiceConnector),
    ]

    @staticmethod
    async def aggregate(profile: MSMEProfile, session: AsyncSession | None = None) -> AggregatedData:
        sources: dict[str, dict | None] = {}

        if session:
            sources = await DataAggregationService._from_db(profile, session)

        for key, cls in DataAggregationService.CONNECTORS:
            if key not in sources or sources[key] is None:
                try:
                    sources[key] = cls.fetch(profile)
                except Exception:
                    sources[key] = None

        derived = DataAggregationService._derive(sources)
        return AggregatedData(
            profile_id=profile.id,
            business_name=profile.business_name,
            industry=profile.industry,
            **sources,
            derived=derived,
        )

    @staticmethod
    async def _from_db(profile: MSMEProfile, session: AsyncSession) -> dict:
        sources: dict[str, dict | None] = {}

        from app.models.gst_record import GSTRecord
        from app.models.epfo_record import EPFORecord
        from app.models.transaction import Transaction

        gst_result = await session.execute(
            select(GSTRecord).where(GSTRecord.profile_id == profile.id).order_by(GSTRecord.filing_date.desc()).limit(12)
        )
        gst_records = gst_result.scalars().all()
        if gst_records:
            total_turnover = sum(r.taxable_value for r in gst_records)
            total_tax = sum(r.net_gst_paid for r in gst_records)
            on_time = sum(1 for r in gst_records if r.filed_on_time)
            sources["gst"] = {
                "gstin": profile.gstin or "N/A",
                "gstin_status": "active" if profile.gstin else "unknown",
                "filing_punctuality": round(on_time / len(gst_records) * 100, 1) if gst_records else 0,
                "avg_monthly_turnover": round(total_turnover / len(gst_records), 2) if gst_records else 0,
                "avg_tax_paid": round(total_tax / len(gst_records), 2) if gst_records else 0,
                "total_tax_paid_12m": round(total_tax, 2),
                "monthly_breakdown": [
                    {
                        "period": f"{r.filing_date.year}-{r.filing_date.month:02d}" if r.filing_date else "unknown",
                        "taxable_value": r.taxable_value,
                        "gst_liability": r.gst_liability,
                        "input_tax_credit": r.input_tax_credit,
                        "net_gst_paid": r.net_gst_paid,
                        "filed_on_time": r.filed_on_time,
                    }
                    for r in reversed(gst_records)
                ],
            }

        epfo_result = await session.execute(
            select(EPFORecord).where(EPFORecord.profile_id == profile.id).order_by(EPFORecord.year.desc(), EPFORecord.month.desc()).limit(12)
        )
        epfo_records = epfo_result.scalars().all()
        if epfo_records:
            counts = [r.employee_count_covered for r in epfo_records]
            avg_emp = sum(counts) / len(counts) if counts else profile.employee_count
            emp_var = sum((c - avg_emp) ** 2 for c in counts) / len(counts) if counts else 0
            import math
            emp_std = math.sqrt(emp_var)
            on_time = sum(1 for r in epfo_records if r.filed_on_time)
            sources["epfo"] = {
                "avg_employee_count": round(avg_emp, 1),
                "employee_count_trend": counts,
                "employee_stability": round(1 - min(emp_std / max(avg_emp, 1), 0.5), 3),
                "avg_monthly_wages": round(sum(r.total_wages for r in epfo_records) / len(epfo_records), 2),
                "avg_monthly_pf": round(sum(r.epf_contribution for r in epfo_records) / len(epfo_records), 2),
                "filing_compliance": round(on_time / len(epfo_records) * 100, 1) if epfo_records else 0,
                "monthly_breakdown": [
                    {
                        "month": r.month,
                        "year": r.year,
                        "employee_count_covered": r.employee_count_covered,
                        "total_wages": r.total_wages,
                        "epf_contribution": r.epf_contribution,
                        "eps_contribution": r.eps_contribution,
                        "filed_on_time": r.filed_on_time,
                    }
                    for r in reversed(epfo_records)
                ],
            }

        txn_result = await session.execute(
            select(Transaction).where(Transaction.profile_id == profile.id).order_by(Transaction.date.desc()).limit(500)
        )
        txns = txn_result.scalars().all()
        if txns:
            credits = [t for t in txns if t.type == "credit"]
            debits = [t for t in txns if t.type == "debit"]
            total_in = sum(t.amount for t in credits)
            total_out = sum(t.amount for t in debits)
            months_span = max(len(set((t.date.year, t.date.month) for t in txns)), 1)
            sources["bank_statement"] = {
                "avg_monthly_inflow": round(total_in / months_span, 2),
                "avg_monthly_outflow": round(total_out / months_span, 2),
                "net_monthly_cashflow": round((total_in - total_out) / months_span, 2),
                "avg_balance_6m": round(sum(t.balance_after or 0 for t in txns[:min(180, len(txns))]) / max(min(180, len(txns)), 1), 2),
                "total_bounces_6m": 0,
                "avg_monthly_emi": round(profile.total_liabilities / 24, 2),
                "bounce_rate": 0,
                "statements": [],
            }

        return sources

    @staticmethod
    def _derive(sources: dict) -> dict:
        gst = sources.get("gst") or {}
        bank = sources.get("bank_statement") or {}
        upi = sources.get("upi") or {}
        epfo = sources.get("epfo") or {}
        einv = sources.get("einvoice") or {}

        return {
            "filing_health": round(
                (gst.get("filing_punctuality", 0) + epfo.get("filing_compliance", 0)) / 2, 1
            ),
            "cashflow_positive": (bank.get("net_monthly_cashflow", 0) or 0) > 0,
            "counterparty_diversified": upi.get("diversified", False),
            "total_data_sources_available": sum(
                1 for v in [gst, bank, upi, epfo, einv] if v
            ),
        }

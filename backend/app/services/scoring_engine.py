from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

import numpy as np

from app.models.msme_profile import MSMEProfile

if TYPE_CHECKING:
    from app.services.data_aggregation.service import AggregatedData

WEIGHTS = {
    "cash_flow_health": 0.25,
    "compliance": 0.20,
    "growth_trajectory": 0.20,
    "stability": 0.20,
    "debt_serviceability": 0.15,
}

BANDS = [
    (0, 20, "Poor"),
    (21, 40, "Bad"),
    (41, 60, "Average"),
    (61, 80, "Good"),
    (81, 100, "Excellent"),
]


def _band(score: float) -> str:
    for lo, hi, label in BANDS:
        if lo <= score <= hi:
            return label
    return "Poor"


def _clamp(v: float) -> float:
    return float(np.clip(v, 0, 100))


def _v(v: dict | None, key: str, default: float = 0) -> float:
    return (v or {}).get(key, default)


# ── Cash Flow Health ──────────────────────────────────────────────────

def _cash_flow(profile: MSMEProfile, agg: AggregatedData | None) -> tuple[float, list[str], list[str]]:
    bank = agg.bank_statement if agg else None
    base = 50.0
    strengths: list[str] = []
    risks: list[str] = []

    inflow = _v(bank, "avg_monthly_inflow", profile.annual_revenue / 12)
    outflow = _v(bank, "avg_monthly_outflow", inflow * 0.85)
    net = inflow - outflow

    ratio = inflow / max(outflow, 1)
    base += min(ratio, 3) * 10

    bounces = _v(bank, "total_bounces_6m")
    base -= bounces * 3

    avg_bal = _v(bank, "avg_balance_6m")
    base += min(avg_bal / max(inflow, 1), 1) * 10

    if net > 0:
        strengths.append(f"Positive net cash flow (₹{net:,.0f}/month)")
    else:
        risks.append(f"Negative cash flow (₹{abs(net):,.0f}/month deficit)")

    if bounces <= 1:
        strengths.append(f"Low bank bounce rate ({int(bounces)} in 6 months)")
    elif bounces >= 5:
        risks.append(f"High bank bounce count ({int(bounces)} in 6 months)")

    if avg_bal > inflow * 2:
        strengths.append(f"Healthy average balance ({int(avg_bal):,})")

    if ratio < 1.1:
        risks.append(f"Inflow barely covers outflow (ratio {ratio:.2f})")

    score = _clamp(base)
    return score, strengths, risks


# ── Compliance Score ──────────────────────────────────────────────────

def _compliance(profile: MSMEProfile, agg: AggregatedData | None) -> tuple[float, list[str], list[str]]:
    gst = agg.gst if agg else None
    epfo = agg.epfo if agg else None
    base = 60.0
    strengths: list[str] = []
    risks: list[str] = []

    gst_status = _v(gst, "gstin_status", "unknown")
    if gst_status == "active":
        base += 15
        strengths.append("Active GSTIN registration")
    else:
        base -= 20
        risks.append("GSTIN is inactive or cancelled")

    punctuality = _v(gst, "filing_punctuality", 100)
    base += (punctuality - 80) * 0.5
    if punctuality >= 90:
        strengths.append(f"{punctuality:.0f}% GST filing punctuality")
    elif punctuality < 70:
        risks.append(f"Low GST filing punctuality ({punctuality:.0f}%)")

    epfo_compliance = _v(epfo, "filing_compliance", 100)
    base += (epfo_compliance - 80) * 0.3
    if epfo_compliance >= 95:
        strengths.append(f"{epfo_compliance:.0f}% EPFO compliance rate")

    if agg and agg.einvoice:
        rate = _v(agg.einvoice, "compliance_rate", 100)
        if rate >= 95:
            strengths.append(f"{rate:.0f}% e-invoice compliance")

    score = _clamp(base)
    return score, strengths, risks


# ── Growth Trajectory ─────────────────────────────────────────────────

def _growth(profile: MSMEProfile, agg: AggregatedData | None) -> tuple[float, list[str], list[str]]:
    base = 45.0
    strengths: list[str] = []
    risks: list[str] = []

    rev = profile.annual_revenue
    profit = profile.net_profit
    margin = profit / max(rev, 1)

    base += min(margin * 200, 20)
    if margin > 0.15:
        strengths.append(f"Healthy profit margin ({margin*100:.0f}%)")
    elif margin < 0:
        risks.append(f"Negative profit margin ({margin*100:.1f}%)")

    if agg and agg.upi:
        vol = _v(agg.upi, "total_transactions_12m", 0)
        base += min(vol / 5000, 10)
        if vol > 10000:
            strengths.append(f"High transaction volume ({int(vol):,} in 12 months)")

    if agg and agg.einvoice:
        inv = _v(agg.einvoice, "total_invoices_12m", 0)
        if inv > 500:
            strengths.append(f"Growing e-invoice adoption ({int(inv)} in 12 months)")

    vintage = 2026 - profile.year_established
    base += min(vintage * 2, 10)
    if vintage >= 5:
        strengths.append(f"Established business ({vintage} years operational)")

    base += min(rev / 1e7, 10)
    if rev > 5e6:
        strengths.append(f"Revenue scaling (₹{rev:,.0f} annual)")

    score = _clamp(base)
    return score, strengths, risks


# ── Stability Score ───────────────────────────────────────────────────

def _stability(profile: MSMEProfile, agg: AggregatedData | None) -> tuple[float, list[str], list[str]]:
    base = 50.0
    strengths: list[str] = []
    risks: list[str] = []

    if agg:
        if agg.epfo:
            emp_stability = _v(agg.epfo, "employee_stability", 1)
            base += emp_stability * 15
            if emp_stability >= 0.9:
                strengths.append("Stable employee base (low turnover)")
            elif emp_stability < 0.7:
                risks.append("High employee turnover detected")

            emp_count = _v(agg.epfo, "avg_employee_count", profile.employee_count)
            if emp_count > 0:
                base += min(emp_count / 5, 5)

        if agg.upi:
            diversified = _v(agg.upi, "diversified", False)
            conc = _v(agg.upi, "counterparty_concentration", 0.5)
            if diversified:
                base += 10
                strengths.append("Diversified counterparty base (low concentration)")
            else:
                base -= 5
                risks.append(f"High customer concentration ({conc*100:.0f}% from top counterparties)")

    retention = profile.customer_retention_rate
    base += retention * 0.2
    if retention > 80:
        strengths.append(f"Strong customer retention ({retention:.0f}%)")
    elif retention < 40:
        risks.append(f"Low customer retention ({retention:.0f}%)")

    score = _clamp(base)
    return score, strengths, risks


# ── Debt Serviceability ───────────────────────────────────────────────

def _debt(profile: MSMEProfile, agg: AggregatedData | None) -> tuple[float, list[str], list[str]]:
    base = 50.0
    strengths: list[str] = []
    risks: list[str] = []

    inflow = _v(agg.bank_statement if agg else None, "avg_monthly_inflow", profile.annual_revenue / 12)
    emi = _v(agg.bank_statement if agg else None, "avg_monthly_emi", profile.total_liabilities / 24)

    dscr = inflow / max(emi, 1)
    base += min(dscr, 5) * 8

    if dscr >= 3:
        strengths.append(f"Comfortable DSCR ({dscr:.1f}x)")
    elif dscr < 1.5:
        risks.append(f"Tight debt service coverage ({dscr:.1f}x)")

    debt_ratio = profile.total_liabilities / max(profile.total_assets, 1)
    base += (1 - debt_ratio) * 20
    if debt_ratio < 0.3:
        strengths.append(f"Low debt-to-asset ratio ({debt_ratio:.1%})")
    elif debt_ratio > 0.7:
        risks.append(f"High leverage ({debt_ratio:.1%} debt-to-asset)")

    if emi > 0 and emi > inflow * 0.4:
        risks.append(f"EMI obligations consume {emi/inflow*100:.0f}% of monthly inflow")

    score = _clamp(base)
    return score, strengths, risks


# ── Main entry point ──────────────────────────────────────────────────

def _default_probability(profile: MSMEProfile, agg: AggregatedData | None, dimensions: dict[str, float]) -> float:
    """ML-inspired default probability using logistic function on dimension scores."""
    logit = -3.0
    logit += -0.03 * dimensions.get("cash_flow_health", 50)
    logit += -0.025 * dimensions.get("compliance", 50)
    logit += -0.02 * dimensions.get("growth_trajectory", 50)
    logit += -0.02 * dimensions.get("stability", 50)
    logit += -0.025 * dimensions.get("debt_serviceability", 50)

    debt_ratio = profile.total_liabilities / max(profile.total_assets, 1)
    logit += 2.0 * debt_ratio

    margin = profile.net_profit / max(profile.annual_revenue, 1)
    logit += -1.5 * margin

    if agg and agg.bank_statement:
        bounces = (agg.bank_statement or {}).get("total_bounces_6m", 0)
        logit += 0.1 * bounces

    return round(1 / (1 + math.exp(logit)), 4)


@dataclass
class HealthScoreResult:
    overall_score: float
    band: str
    cash_flow_health: float
    compliance: float
    growth_trajectory: float
    stability: float
    debt_serviceability: float
    strengths: list[str] = field(default_factory=list)
    risks: list[str] = field(default_factory=list)
    default_probability: float = 0.5
    risk_tier: str = "medium"


def compute_health_score(profile: MSMEProfile, agg_data: AggregatedData | None = None) -> HealthScoreResult:
    dims = {
        "cash_flow_health": _cash_flow(profile, agg_data),
        "compliance": _compliance(profile, agg_data),
        "growth_trajectory": _growth(profile, agg_data),
        "stability": _stability(profile, agg_data),
        "debt_serviceability": _debt(profile, agg_data),
    }

    scores: dict[str, float] = {}
    all_strengths: list[str] = []
    all_risks: list[str] = []

    for key, (score, strengths, risks) in dims.items():
        scores[key] = score
        all_strengths.extend(strengths)
        all_risks.extend(risks)

    overall = _clamp(sum(scores[k] * WEIGHTS[k] for k in WEIGHTS))

    dp = _default_probability(profile, agg_data, scores)
    tier = "low" if dp < 0.15 else "medium" if dp < 0.4 else "high"

    return HealthScoreResult(
        overall_score=overall,
        band=_band(overall),
        cash_flow_health=scores["cash_flow_health"],
        compliance=scores["compliance"],
        growth_trajectory=scores["growth_trajectory"],
        stability=scores["stability"],
        debt_serviceability=scores["debt_serviceability"],
        strengths=all_strengths,
        risks=all_risks,
        default_probability=dp,
        risk_tier=tier,
    )

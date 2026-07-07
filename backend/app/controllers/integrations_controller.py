import asyncio
import json
import time
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select

from app.core.database import async_session_factory
from app.models.msme_profile import MSMEProfile
from app.models.health_score import Score
from app.services.scoring_engine import compute_health_score
from app.services.data_aggregation.service import DataAggregationService

router = APIRouter(prefix="/integrations", tags=["integrations"])

# ── In-memory event bus for SSE ──────────────────────────────────────

_score_events: dict[str, list[asyncio.Queue]] = {}


async def _publish_score_event(profile_id: str, payload: dict):
    queues = _score_events.get(profile_id, [])
    for q in queues:
        await q.put(payload)


def _subscribe(profile_id: str) -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue()
    _score_events.setdefault(profile_id, []).append(q)
    return q


def _unsubscribe(profile_id: str, q: asyncio.Queue):
    queues = _score_events.get(profile_id, [])
    if q in queues:
        queues.remove(q)


# ── ULI Mock ─────────────────────────────────────────────────────────

@router.post("/uli/credit-report")
async def uli_credit_report(msme_id: str = Query(...)):
    """Mock ULI (Unified Lending Interface) — returns standardized credit report payload."""
    async with async_session_factory() as session:
        profile = await session.get(MSMEProfile, msme_id)
        if not profile:
            raise HTTPException(status_code=404, detail="MSME not found")

        result = await session.execute(
            select(Score).where(Score.profile_id == msme_id).order_by(Score.computed_at.desc()).limit(1)
        )
        score = result.scalar_one_or_none()

    risk_level = "low" if (score and score.overall_score >= 60) else "medium" if (score and score.overall_score >= 40) else "high"
    eligible_amount = round(profile.annual_revenue * 0.3, 2)
    interest_rate = 8.5 if risk_level == "low" else 11.0 if risk_level == "medium" else 15.0

    return {
        "uli_report_id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "msme_id": msme_id,
        "business_name": profile.business_name,
        "industry": profile.industry,
        "credit_score": {
            "overall": score.overall_score if score else 0,
            "band": score.band if score else "unknown",
            "default_probability": score.default_probability if score else 0.5,
            "risk_tier": score.risk_tier if score else "medium",
        },
        "risk_assessment": {
            "risk_level": risk_level,
            "risk_factors": json.loads(score.risks) if score and score.risks else [],
            "strengths": json.loads(score.strengths) if score and score.strengths else [],
        },
        "lending_recommendation": {
            "eligible_amount": eligible_amount,
            "recommended_tenure_months": 24 if risk_level == "low" else 18 if risk_level == "medium" else 12,
            "interest_rate": interest_rate,
            "confidence": "high" if risk_level == "low" else "medium",
        },
        "data_sources_used": [
            {"source": "GST", "status": "verified"},
            {"source": "Bank Statement (AA)", "status": "verified"},
            {"source": "UPI", "status": "verified"},
            {"source": "EPFO", "status": "verified"},
            {"source": "e-Invoice", "status": "verified"},
        ],
        "consent_reference": str(uuid.uuid4()),
    }


# ── OCEN Mock ─────────────────────────────────────────────────────────

@router.post("/ocen/loan-request")
async def ocen_loan_request(msme_id: str = Query(...)):
    """Mock OCEN LSP→Lender handoff — returns loan application payload."""
    async with async_session_factory() as session:
        profile = await session.get(MSMEProfile, msme_id)
        if not profile:
            raise HTTPException(status_code=404, detail="MSME not found")

        result = await session.execute(
            select(Score).where(Score.profile_id == msme_id).order_by(Score.computed_at.desc()).limit(1)
        )
        score = result.scalar_one_or_none()

    return {
        "loan_application_id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "msme": {
            "id": msme_id,
            "business_name": profile.business_name,
            "business_type": profile.business_type,
            "industry": profile.industry,
            "year_established": profile.year_established,
            "employee_count": profile.employee_count,
        },
        "financial_health": {
            "overall_score": score.overall_score if score else None,
            "band": score.band if score else "unknown",
            "dimensions": {
                "cash_flow_health": score.cash_flow_health if score else None,
                "compliance": score.compliance if score else None,
                "growth_trajectory": score.growth_trajectory if score else None,
                "stability": score.stability if score else None,
                "debt_serviceability": score.debt_serviceability if score else None,
            } if score else None,
            "strengths": json.loads(score.strengths) if score and score.strengths else [],
            "risks": json.loads(score.risks) if score and score.risks else [],
        },
        "data_sources_queried": [
            {"source": "GST", "status": "available", "period": "last 12 months"},
            {"source": "Bank Statement (AA)", "status": "available", "period": "last 6 months"},
            {"source": "UPI", "status": "available", "period": "last 12 months"},
            {"source": "EPFO", "status": "available", "period": "last 12 months"},
            {"source": "e-Invoice", "status": "available", "period": "last 12 months"},
        ],
        "consent_artifact": {
            "consent_id": str(uuid.uuid4()),
            "aa_consent_ref": f"aa-consent-{uuid.uuid4().hex[:12]}",
            "consent_status": "active",
            "valid_until": datetime.now(timezone.utc).isoformat(),
        },
        "recommended_loan": {
            "eligible_amount": round(profile.annual_revenue * 0.3, 2),
            "confidence": "high" if (score and score.overall_score >= 60) else "medium" if (score and score.overall_score >= 40) else "low",
        },
    }


# ── AA Consent Mock State Machine ─────────────────────────────────────

_CONSENT_STORE: dict[str, dict] = {}


@router.post("/aa-consent/request")
async def aa_consent_request(msme_id: str = Query(...), purpose: str = "Credit Assessment"):
    """Initiate AA consent request — moves to consent_requested."""
    consent_id = str(uuid.uuid4())
    record = {
        "consent_id": consent_id,
        "msme_id": msme_id,
        "purpose": purpose,
        "status": "consent_requested",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "data_types": ["bank_statements", "gst_returns", "upi_transactions"],
        "consent_artifacts": [],
    }
    _CONSENT_STORE[consent_id] = record
    return record


@router.get("/aa-consent/{consent_id}")
async def aa_consent_status(consent_id: str):
    record = _CONSENT_STORE.get(consent_id)
    if not record:
        raise HTTPException(status_code=404, detail="Consent not found")
    return record


@router.post("/aa-consent/{consent_id}/approve")
async def aa_consent_approve(consent_id: str):
    """Simulate user approving consent → moves to consent_approved."""
    record = _CONSENT_STORE.get(consent_id)
    if not record:
        raise HTTPException(status_code=404, detail="Consent not found")
    if record["status"] != "consent_requested":
        raise HTTPException(status_code=400, detail=f"Cannot approve from status: {record['status']}")
    record["status"] = "consent_approved"
    record["updated_at"] = datetime.now(timezone.utc).isoformat()
    record["consent_artifacts"].append({
        "artifact_id": str(uuid.uuid4()),
        "type": "aa_consent_artifact",
        "status": "approved",
        "timestamp": record["updated_at"],
    })
    return record


@router.post("/aa-consent/{consent_id}/pull")
async def aa_consent_pull(consent_id: str):
    """Simulate data pull after approval → moves to data_pulled."""
    record = _CONSENT_STORE.get(consent_id)
    if not record:
        raise HTTPException(status_code=404, detail="Consent not found")
    if record["status"] != "consent_approved":
        raise HTTPException(status_code=400, detail=f"Cannot pull data from status: {record['status']}")
    record["status"] = "data_pulled"
    record["updated_at"] = datetime.now(timezone.utc).isoformat()
    record["consent_artifacts"].append({
        "artifact_id": str(uuid.uuid4()),
        "type": "data_pull_receipt",
        "status": "completed",
        "timestamp": record["updated_at"],
        "records_fetched": {
            "bank_transactions": 120,
            "gst_filings": 12,
            "upi_transactions": 2400,
        },
    })
    return record


# ── Ingest Webhook + SSE Real-Time ────────────────────────────────────

async def _recompute_and_notify(msme_id: str) -> dict:
    """Recompute score and push via SSE, return the new score dict."""
    async with async_session_factory() as session:
        profile = await session.get(MSMEProfile, msme_id)
        if not profile:
            raise HTTPException(status_code=404, detail="MSME not found")

        agg_data = await DataAggregationService.aggregate(profile, session)
        result = compute_health_score(profile, agg_data)

        data = asdict(result)
        data["strengths"] = json.dumps(data["strengths"])
        data["risks"] = json.dumps(data["risks"])

        score = Score(**data, profile_id=msme_id, llm_insights=None)
        session.add(score)
        await session.commit()
        await session.refresh(score)

        score_dict = {
            "id": score.id,
            "profile_id": score.profile_id,
            "overall_score": score.overall_score,
            "band": score.band,
            "cash_flow_health": score.cash_flow_health,
            "compliance": score.compliance,
            "growth_trajectory": score.growth_trajectory,
            "stability": score.stability,
            "debt_serviceability": score.debt_serviceability,
            "strengths": json.loads(score.strengths),
            "risks": json.loads(score.risks),
            "default_probability": score.default_probability,
            "risk_tier": score.risk_tier,
            "computed_at": score.computed_at.isoformat(),
        }
        await _publish_score_event(msme_id, score_dict)
        return score_dict


@router.post("/ingest/transaction")
async def ingest_transaction(
    msme_id: str = Query(...),
    amount: float = Query(...),
    type: str = Query("credit"),
):
    """Mock webhook — simulates a new transaction arriving, triggers auto-recompute."""
    async with async_session_factory() as session:
        profile = await session.get(MSMEProfile, msme_id)
        if not profile:
            raise HTTPException(status_code=404, detail="MSME not found")

        profile.annual_revenue += amount
        if type == "debit":
            profile.net_profit -= amount * 0.7
        else:
            profile.net_profit += amount * 0.3
        session.add(profile)
        await session.commit()

    score_dict = await _recompute_and_notify(msme_id)
    return {
        "ingested": True,
        "event": "transaction_received",
        "new_score": score_dict,
    }


@router.post("/ingest/gst-filing")
async def ingest_gst_filing(msme_id: str = Query(...)):
    """Mock webhook — simulates new GST filing received, triggers auto-recompute."""
    score_dict = await _recompute_and_notify(msme_id)
    return {
        "ingested": True,
        "event": "gst_filing_received",
        "new_score": score_dict,
    }


@router.get("/events")
async def score_events(request: Request, profile_id: str = Query(...)):
    """Server-Sent Events stream — pushes score updates for a profile in real time."""
    queue = _subscribe(profile_id)

    async def event_stream():
        try:
            # send initial heartbeat
            yield f"data: {json.dumps({'type': 'connected', 'profile_id': profile_id})}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    payload = await asyncio.wait_for(queue.get(), timeout=30)
                    yield f"data: {json.dumps({'type': 'score_update', 'profile_id': profile_id, 'score': payload})}\n\n"
                except asyncio.TimeoutError:
                    yield f"data: {json.dumps({'type': 'heartbeat'})}\n\n"
        finally:
            _unsubscribe(profile_id, queue)

    return StreamingResponse(event_stream(), media_type="text/event-stream")

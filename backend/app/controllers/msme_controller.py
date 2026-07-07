import uuid
import json
from dataclasses import asdict

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select, func, or_
from pydantic import BaseModel

from app.core.database import async_session_factory
from app.core.security import hash_password, create_access_token
from app.models.user import User
from app.models.msme_profile import MSMEProfile
from app.models.health_score import Score
from app.models.gst_record import GSTRecord
from app.models.epfo_record import EPFORecord
from app.models.transaction import Transaction
from app.schemas.msme import MSMECreate, MSMEOut
from app.schemas.gst import GSTCreate, GSTOut
from app.schemas.epfo import EPFOCreate, EPFOOut
from app.schemas.transaction import TransactionCreate, TransactionOut
from app.services.data_aggregation.service import DataAggregationService
from app.services.scoring_engine import compute_health_score

router = APIRouter(prefix="/msme", tags=["msme"])


class MSMEUpdate(BaseModel):
    business_name: str | None = None
    business_type: str | None = None
    industry: str | None = None
    year_established: int | None = None
    employee_count: int | None = None
    gstin: str | None = None
    annual_revenue: float | None = None
    net_profit: float | None = None
    total_assets: float | None = None
    total_liabilities: float | None = None
    monthly_transaction_volume: int | None = None
    avg_transaction_value: float | None = None
    customer_retention_rate: float | None = None
    digital_adoption_score: float | None = None
    market_share: float | None = None
    competitor_count: int | None = None
    regulatory_compliance_score: float | None = None


class PaginatedProfiles(BaseModel):
    items: list[MSMEOut]
    total: int
    page: int
    page_size: int
    total_pages: int


@router.get("", response_model=PaginatedProfiles)
async def list_profiles(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query("", description="Search by business name or GSTIN"),
    industry: str = Query("", description="Filter by industry"),
    sort_by: str = Query("created_at", description="Sort field"),
    sort_dir: str = Query("desc", description="Sort direction: asc or desc"),
    is_ntc: bool | None = Query(None, description="Filter for NTC profiles only"),
):
    async with async_session_factory() as session:
        # Subquery to get the latest score for each profile
        latest_score_sub = (
            select(Score.profile_id, func.max(Score.computed_at).label("max_computed"))
            .group_by(Score.profile_id)
            .subquery()
        )
        
        latest_score = (
            select(Score.profile_id, Score.overall_score, Score.band)
            .join(
                latest_score_sub,
                (Score.profile_id == latest_score_sub.c.profile_id) & 
                (Score.computed_at == latest_score_sub.c.max_computed)
            )
            .subquery()
        )

        query = select(MSMEProfile, latest_score.c.overall_score, latest_score.c.band).outerjoin(
            latest_score, MSMEProfile.id == latest_score.c.profile_id
        )
        count_query = select(func.count(MSMEProfile.id))

        if is_ntc is not None:
            if is_ntc:
                query = query.join(User, MSMEProfile.user_id == User.id).where(User.email.like("%@ntc.local"))
                count_query = count_query.join(User, MSMEProfile.user_id == User.id).where(User.email.like("%@ntc.local"))
            else:
                query = query.join(User, MSMEProfile.user_id == User.id).where(~User.email.like("%@ntc.local"))
                count_query = count_query.join(User, MSMEProfile.user_id == User.id).where(~User.email.like("%@ntc.local"))

        if search:
            like = f"%{search}%"
            cond = or_(
                MSMEProfile.business_name.ilike(like),
                MSMEProfile.gstin.ilike(like),
            )
            query = query.where(cond)
            count_query = count_query.where(cond)

        if industry:
            query = query.where(MSMEProfile.industry == industry)
            count_query = count_query.where(MSMEProfile.industry == industry)

        total = (await session.execute(count_query)).scalar_one()

        sort_col = getattr(MSMEProfile, sort_by, MSMEProfile.created_at)
        if sort_dir == "asc":
            query = query.order_by(sort_col.asc())
        else:
            query = query.order_by(sort_col.desc())

        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)
        result = await session.execute(query)
        
        rows = result.all()
        items = []
        for profile_obj, score, band in rows:
            profile_dict = MSMEOut.model_validate(profile_obj).model_dump()
            profile_dict["overall_score"] = score
            profile_dict["band"] = band
            items.append(MSMEOut(**profile_dict))

    return PaginatedProfiles(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, -(-total // page_size)),
    )


@router.get("/industries")
async def list_industries():
    async with async_session_factory() as session:
        result = await session.execute(
            select(MSMEProfile.industry, func.count(MSMEProfile.id))
            .group_by(MSMEProfile.industry)
            .order_by(func.count(MSMEProfile.id).desc())
        )
        return [{"industry": r[0], "count": r[1]} for r in result.all()]


@router.put("/{profile_id}", response_model=MSMEOut)
async def update_profile(profile_id: str, body: MSMEUpdate):
    async with async_session_factory() as session:
        profile = await session.get(MSMEProfile, profile_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        for k, v in body.model_dump(exclude_unset=True).items():
            setattr(profile, k, v)
        session.add(profile)
        await session.commit()
        await session.refresh(profile)
        return profile


@router.delete("/{profile_id}", status_code=204)
async def delete_profile(profile_id: str):
    async with async_session_factory() as session:
        profile = await session.get(MSMEProfile, profile_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        await session.delete(profile)
        await session.commit()


@router.post("/", response_model=MSMEOut, status_code=201)
async def create_profile(body: MSMECreate, user_id: str = ""):
    if not user_id:
        user_id = str(uuid.uuid4())
    async with async_session_factory() as session:
        profile = MSMEProfile(**body.model_dump(), user_id=user_id)
        session.add(profile)
        await session.commit()
        await session.refresh(profile)
        return profile


@router.get("/{profile_id}", response_model=MSMEOut)
async def get_profile(profile_id: str):
    async with async_session_factory() as session:
        profile = await session.get(MSMEProfile, profile_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        return profile


@router.get("/{profile_id}/raw-data")
async def get_raw_data(profile_id: str):
    async with async_session_factory() as session:
        profile = await session.get(MSMEProfile, profile_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        return await DataAggregationService.aggregate(profile, session)


@router.get("/{profile_id}/comparison")
async def traditional_vs_altdata_comparison(profile_id: str):
    """Demo endpoint: shows traditional scoring (rejected) vs alt-data scoring (actual)."""
    async with async_session_factory() as session:
        profile = await session.get(MSMEProfile, profile_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")

        result = await session.execute(
            select(Score).where(Score.profile_id == profile_id).order_by(Score.computed_at.desc()).limit(1)
        )
        score = result.scalar_one_or_none()

    traditional = {
        "has_credit_history": False,
        "has_itr_filed": False,
        "has_cibil_score": False,
        "decision": "REJECTED",
        "reason": "No credit history (CIBIL/ITR) available",
        "score": None,
    }

    alt_data = None
    if score:
        alt_data = {
            "decision": "APPROVED",
            "overall_score": score.overall_score,
            "band": score.band,
            "dimensions": {
                "cash_flow_health": score.cash_flow_health,
                "compliance": score.compliance,
                "growth_trajectory": score.growth_trajectory,
                "stability": score.stability,
                "debt_serviceability": score.debt_serviceability,
            },
            "strengths": json.loads(score.strengths) if score.strengths else [],
            "risks": json.loads(score.risks) if score.risks else [],
            "data_sources": ["GST", "UPI", "AA", "EPFO", "e-Invoice"],
        }

    return {
        "business_name": profile.business_name,
        "industry": profile.industry,
        "traditional_scoring": traditional,
        "alt_data_scoring": alt_data,
        "is_credit_invisible": True,
    }


# ── NTC/NTB Quick Onboarding ──────────────────────────────────────────

_INDUSTRY_DEFAULTS = {
    "Retail": {
        "business_type": "Sole Proprietorship", "employee_count": 5, "year_established": 2015,
        "annual_revenue": 500000, "net_profit": 75000,
        "total_assets": 300000, "total_liabilities": 100000,
        "monthly_transaction_volume": 150, "avg_transaction_value": 2000,
        "customer_retention_rate": 60, "digital_adoption_score": 35,
        "market_share": 2.0, "competitor_count": 20,
    },
    "Manufacturing": {
        "business_type": "Private Ltd", "employee_count": 25, "year_established": 2012,
        "annual_revenue": 5000000, "net_profit": 500000,
        "total_assets": 3000000, "total_liabilities": 1500000,
        "monthly_transaction_volume": 200, "avg_transaction_value": 5000,
        "customer_retention_rate": 75, "digital_adoption_score": 40,
        "market_share": 5.0, "competitor_count": 10,
    },
    "Services": {
        "business_type": "Partnership", "employee_count": 10, "year_established": 2016,
        "annual_revenue": 2000000, "net_profit": 300000,
        "total_assets": 800000, "total_liabilities": 200000,
        "monthly_transaction_volume": 100, "avg_transaction_value": 5000,
        "customer_retention_rate": 70, "digital_adoption_score": 55,
        "market_share": 3.0, "competitor_count": 15,
    },
    "Agriculture": {
        "business_type": "Sole Proprietorship", "employee_count": 3, "year_established": 2010,
        "annual_revenue": 300000, "net_profit": 100000,
        "total_assets": 500000, "total_liabilities": 100000,
        "monthly_transaction_volume": 30, "avg_transaction_value": 1000,
        "customer_retention_rate": 80, "digital_adoption_score": 20,
        "market_share": 1.0, "competitor_count": 30,
    },
    "Technology": {
        "business_type": "Private Ltd", "employee_count": 15, "year_established": 2018,
        "annual_revenue": 3000000, "net_profit": 600000,
        "total_assets": 1000000, "total_liabilities": 200000,
        "monthly_transaction_volume": 80, "avg_transaction_value": 10000,
        "customer_retention_rate": 85, "digital_adoption_score": 80,
        "market_share": 2.5, "competitor_count": 25,
    },
    "Construction": {
        "business_type": "Partnership", "employee_count": 30, "year_established": 2014,
        "annual_revenue": 8000000, "net_profit": 800000,
        "total_assets": 5000000, "total_liabilities": 3000000,
        "monthly_transaction_volume": 50, "avg_transaction_value": 15000,
        "customer_retention_rate": 55, "digital_adoption_score": 25,
        "market_share": 4.0, "competitor_count": 12,
    },
}


@router.post("/ntc/onboard")
async def ntc_onboard(
    business_name: str = Query(...),
    phone: str = Query(...),
    gstin: str = Query(""),
    industry: str = Query("Retail"),
):
    """NTC/NTB quick onboarding — minimal fields, instant provisional score. Creates a user + token."""
    defaults = _INDUSTRY_DEFAULTS.get(industry, _INDUSTRY_DEFAULTS["Retail"]).copy()
    data = MSMECreate(business_name=business_name, industry=industry, **defaults)
    async with async_session_factory() as session:
        # Create a user for this NTC MSME
        ntc_email = f"ntc-{uuid.uuid4().hex[:8]}@ntc.local"
        ntc_password = uuid.uuid4().hex[:12]
        user = User(email=ntc_email, hashed_password=hash_password(ntc_password), full_name=business_name)
        session.add(user)
        await session.commit()
        await session.refresh(user)

        profile = MSMEProfile(**data.model_dump(), user_id=user.id, gstin=gstin)
        session.add(profile)
        await session.commit()
        await session.refresh(profile)

        agg_data = await DataAggregationService.aggregate(profile, session)
        score_result = compute_health_score(profile, agg_data)

        score_dict = asdict(score_result)
        score_dict["strengths"] = json.dumps(score_dict["strengths"])
        score_dict["risks"] = json.dumps(score_dict["risks"])
        score_row = Score(**score_dict, profile_id=profile.id, llm_insights=None)
        session.add(score_row)
        await session.commit()
        await session.refresh(score_row)

    token = create_access_token({"sub": user.id})

    comparison = {
        "traditional": {
            "has_credit_history": False,
            "has_cibil_score": False,
            "has_itr_filed": bool(gstin),
            "decision": "REJECTED",
            "reason": "No formal credit history (NTB/NTC profile)",
        },
        "alt_data": {
            "decision": "APPROVED",
            "overall_score": score_row.overall_score,
            "band": score_row.band,
            "dimensions": {
                "cash_flow_health": score_row.cash_flow_health,
                "compliance": score_row.compliance,
                "growth_trajectory": score_row.growth_trajectory,
                "stability": score_row.stability,
                "debt_serviceability": score_row.debt_serviceability,
            },
            "data_sources_used": ["GST", "UPI", "AA", "EPFO", "e-Invoice"],
        },
    }

    return {
        "profile_id": profile.id,
        "business_name": profile.business_name,
        "phone": phone,
        "gstin": gstin,
        "industry": industry,
        "provisional_score": score_row.overall_score,
        "band": score_row.band,
        "comparison": comparison,
        "computed_at": score_row.computed_at.isoformat(),
        "access_token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "is_active": user.is_active,
        },
    }


# ── Alternate Data Management (GST, EPFO, Transactions) ──────────────

@router.post("/{profile_id}/gst", response_model=GSTOut, status_code=201)
async def create_gst_record(profile_id: str, body: GSTCreate):
    """Add a new GST filing record for the given MSME Profile."""
    async with async_session_factory() as session:
        profile = await session.get(MSMEProfile, profile_id)
        if not profile:
            raise HTTPException(status_code=404, detail="MSME Profile not found")
        
        record = GSTRecord(**body.model_dump(), profile_id=profile_id)
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return record


@router.get("/{profile_id}/gst", response_model=list[GSTOut])
async def list_gst_records(profile_id: str):
    """List all GST filing records for the given MSME Profile."""
    async with async_session_factory() as session:
        result = await session.execute(
            select(GSTRecord).where(GSTRecord.profile_id == profile_id).order_by(GSTRecord.filing_date.desc())
        )
        return result.scalars().all()


@router.post("/{profile_id}/epfo", response_model=EPFOOut, status_code=201)
async def create_epfo_record(profile_id: str, body: EPFOCreate):
    """Add a new EPFO filing record for the given MSME Profile."""
    async with async_session_factory() as session:
        profile = await session.get(MSMEProfile, profile_id)
        if not profile:
            raise HTTPException(status_code=404, detail="MSME Profile not found")
        
        record = EPFORecord(**body.model_dump(), profile_id=profile_id)
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return record


@router.get("/{profile_id}/epfo", response_model=list[EPFOOut])
async def list_epfo_records(profile_id: str):
    """List all EPFO filing records for the given MSME Profile."""
    async with async_session_factory() as session:
        result = await session.execute(
            select(EPFORecord).where(EPFORecord.profile_id == profile_id).order_by(EPFORecord.year.desc(), EPFORecord.month.desc())
        )
        return result.scalars().all()


@router.post("/{profile_id}/transactions", response_model=TransactionOut, status_code=201)
async def create_transaction_record(profile_id: str, body: TransactionCreate):
    """Add a new bank transaction record for the given MSME Profile."""
    async with async_session_factory() as session:
        profile = await session.get(MSMEProfile, profile_id)
        if not profile:
            raise HTTPException(status_code=404, detail="MSME Profile not found")
        
        record = Transaction(**body.model_dump(), profile_id=profile_id)
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return record


@router.get("/{profile_id}/transactions", response_model=list[TransactionOut])
async def list_transaction_records(profile_id: str):
    """List bank transaction records for the given MSME Profile."""
    async with async_session_factory() as session:
        result = await session.execute(
            select(Transaction).where(Transaction.profile_id == profile_id).order_by(Transaction.date.desc()).limit(100)
        )
        return result.scalars().all()

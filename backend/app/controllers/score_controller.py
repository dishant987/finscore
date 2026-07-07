import json
from dataclasses import asdict

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.core.database import async_session_factory
from app.models.msme_profile import MSMEProfile
from app.models.health_score import Score
from app.schemas.score import ScoreOut
from app.services.scoring_engine import compute_health_score
from app.services.llm.llm_router import generate_insights
from app.services.data_aggregation.service import DataAggregationService

router = APIRouter(prefix="/score", tags=["score"])


@router.post("/{msme_id}/compute", response_model=ScoreOut)
async def compute_score(msme_id: str):
    async with async_session_factory() as session:
        profile = await session.get(MSMEProfile, msme_id)
        if not profile:
            raise HTTPException(status_code=404, detail="MSME not found")

        agg_data = await DataAggregationService.aggregate(profile, session)
        result = compute_health_score(profile, agg_data)

        insights = None
        try:
            insights = await generate_insights(profile, result)
        except Exception:
            pass

        data = asdict(result)
        data["strengths"] = json.dumps(data["strengths"])
        data["risks"] = json.dumps(data["risks"])

        score = Score(**data, profile_id=msme_id, llm_insights=insights)
        session.add(score)
        await session.commit()
        await session.refresh(score)
        return score


@router.get("/{msme_id}", response_model=ScoreOut)
async def get_score(msme_id: str):
    async with async_session_factory() as session:
        result = await session.execute(
            select(Score).where(Score.profile_id == msme_id).order_by(Score.computed_at.desc()).limit(1)
        )
        score = result.scalar_one_or_none()
        if not score:
            raise HTTPException(status_code=404, detail="No score found for this MSME")
        return score

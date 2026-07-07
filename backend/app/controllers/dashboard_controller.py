import json
from collections import defaultdict

from fastapi import APIRouter
from sqlalchemy import select, func, text

from app.core.database import async_session_factory
from app.models.msme_profile import MSMEProfile
from app.models.health_score import Score

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
async def dashboard_summary():
    async with async_session_factory() as session:
        profile_count = await session.scalar(select(func.count(MSMEProfile.id)))

        # Subquery to select the ID of the latest score for each profile
        subq = (
            select(
                Score.id,
                func.row_number().over(
                    partition_by=Score.profile_id,
                    order_by=Score.computed_at.desc()
                ).label("rn")
            ).subquery()
        )
        latest_ids_stmt = select(subq.c.id).where(subq.c.rn == 1)

        avg_result = await session.execute(
            select(
                func.avg(Score.overall_score),
                func.avg(Score.cash_flow_health),
                func.avg(Score.compliance),
                func.avg(Score.growth_trajectory),
                func.avg(Score.stability),
                func.avg(Score.debt_serviceability),
            ).where(Score.id.in_(latest_ids_stmt))
        )
        row = avg_result.one()

        poor = await session.scalar(
            select(func.count(Score.id)).where(Score.band == "Poor").where(Score.id.in_(latest_ids_stmt))
        )
        bad = await session.scalar(
            select(func.count(Score.id)).where(Score.band == "Bad").where(Score.id.in_(latest_ids_stmt))
        )
        average = await session.scalar(
            select(func.count(Score.id)).where(Score.band == "Average").where(Score.id.in_(latest_ids_stmt))
        )
        good = await session.scalar(
            select(func.count(Score.id)).where(Score.band == "Good").where(Score.id.in_(latest_ids_stmt))
        )
        excellent = await session.scalar(
            select(func.count(Score.id)).where(Score.band == "Excellent").where(Score.id.in_(latest_ids_stmt))
        )

        latest_scores = await session.execute(
            select(Score).order_by(Score.computed_at.desc()).limit(10)
        )

        # Industry breakdown: avg score + count + risk concentration per industry
        industry_raw = await session.execute(
            text("""
                SELECT p.industry,
                       COUNT(*) AS cnt,
                       AVG(s.overall_score) AS avg_score,
                       SUM(CASE WHEN s.band IN ('Poor','Bad') THEN 1 ELSE 0 END) AS high_risk,
                       SUM(CASE WHEN s.band IN ('Average') THEN 1 ELSE 0 END) AS medium_risk,
                       SUM(CASE WHEN s.band IN ('Good','Excellent') THEN 1 ELSE 0 END) AS low_risk
                FROM score s JOIN msmeprofile p ON s.profile_id = p.id
                WHERE s.id IN (
                    SELECT id FROM (
                        SELECT id, ROW_NUMBER() OVER (PARTITION BY profile_id ORDER BY computed_at DESC) as rn
                        FROM score
                    ) t WHERE t.rn = 1
                )
                GROUP BY p.industry
                ORDER BY cnt DESC
            """)
        )
        industry_rows = industry_raw.fetchall()

        return {
            "total_profiles": profile_count or 0,
            "average_scores": {
                "overall": round(row[0] or 0, 2),
                "cash_flow_health": round(row[1] or 0, 2),
                "compliance": round(row[2] or 0, 2),
                "growth_trajectory": round(row[3] or 0, 2),
                "stability": round(row[4] or 0, 2),
                "debt_serviceability": round(row[5] or 0, 2),
            },
            "band_distribution": {
                "poor": poor or 0,
                "bad": bad or 0,
                "average": average or 0,
                "good": good or 0,
                "excellent": excellent or 0,
            },
            "industry_breakdown": [
                {
                    "industry": r[0],
                    "count": r[1],
                    "avg_score": round(r[2] or 0, 1),
                    "high_risk": r[3] or 0,
                    "medium_risk": r[4] or 0,
                    "low_risk": r[5] or 0,
                }
                for r in industry_rows
            ],
            "recent_scores": [
                {
                    "id": s.id,
                    "profile_id": s.profile_id,
                    "overall_score": s.overall_score,
                    "band": s.band,
                    "computed_at": s.computed_at.isoformat(),
                }
                for s in latest_scores.scalars()
            ],
        }


# ── Portfolio Risk Analysis ──────────────────────────────────────────


@router.get("/portfolio/risk-clusters")
async def portfolio_risk_clusters():
    """Cluster MSMEs into risk tiers with actionable recommendations."""
    async with async_session_factory() as session:
        result = await session.execute(
            select(
                Score.profile_id,
                Score.overall_score,
                Score.band,
                Score.cash_flow_health,
                Score.compliance,
                Score.growth_trajectory,
                Score.stability,
                Score.debt_serviceability,
                Score.strengths,
                Score.risks,
                MSMEProfile.business_name,
                MSMEProfile.industry,
                MSMEProfile.annual_revenue,
            )
            .join(MSMEProfile, Score.profile_id == MSMEProfile.id)
            .order_by(Score.computed_at.desc())
        )
        rows = result.all()

        seen = set()
        entries = []
        for r in rows:
            if r[0] in seen:
                continue
            seen.add(r[0])
            entries.append(r)

        clusters = {
            "approve": [],
            "review": [],
            "deny": [],
        }

        for r in entries:
            score_val = r[1]
            entry = {
                "profile_id": r[0],
                "business_name": r[10],
                "industry": r[11],
                "annual_revenue": r[12],
                "overall_score": score_val,
                "band": r[2],
                "weakest_dimension": min(
                    [
                        ("cash_flow_health", r[3]),
                        ("compliance", r[4]),
                        ("growth_trajectory", r[5]),
                        ("stability", r[6]),
                        ("debt_serviceability", r[7]),
                    ],
                    key=lambda x: x[1],
                )[0],
                "risks": json.loads(r[9]) if r[9] else [],
            }

            if score_val >= 60:
                clusters["approve"].append(entry)
            elif score_val >= 40:
                clusters["review"].append(entry)
            else:
                clusters["deny"].append(entry)

        for tier in clusters.values():
            tier.sort(key=lambda x: x["overall_score"], reverse=True)

        return {
            "summary": {
                "approve_count": len(clusters["approve"]),
                "review_count": len(clusters["review"]),
                "deny_count": len(clusters["deny"]),
                "total_analyzed": len(entries),
                "total_lending_potential": round(
                    sum(e["annual_revenue"] * 0.3 for e in clusters["approve"]), 2
                ),
            },
            "clusters": clusters,
        }


@router.get("/portfolio/recommendations")
async def portfolio_recommendations():
    """Generate portfolio-level lending recommendations."""
    async with async_session_factory() as session:
        result = await session.execute(
            select(
                Score.profile_id,
                Score.overall_score,
                Score.band,
                Score.cash_flow_health,
                Score.compliance,
                Score.growth_trajectory,
                Score.stability,
                Score.debt_serviceability,
                Score.strengths,
                Score.risks,
                MSMEProfile.business_name,
                MSMEProfile.industry,
                MSMEProfile.annual_revenue,
                MSMEProfile.total_assets,
                MSMEProfile.total_liabilities,
            )
            .join(MSMEProfile, Score.profile_id == MSMEProfile.id)
            .order_by(Score.computed_at.desc())
        )
        rows = result.all()

        seen = set()
        entries = []
        for r in rows:
            if r[0] in seen:
                continue
            seen.add(r[0])
            entries.append(r)

        recommendations = []
        industry_risk = defaultdict(lambda: {"count": 0, "total_score": 0, "high_risk": 0})

        for r in entries:
            score_val = r[1]
            industry = r[11]
            industry_risk[industry]["count"] += 1
            industry_risk[industry]["total_score"] += score_val
            if score_val < 40:
                industry_risk[industry]["high_risk"] += 1

            if score_val >= 60:
                eligible = round(r[12] * 0.3, 2)
                recommendations.append({
                    "profile_id": r[0],
                    "business_name": r[10],
                    "action": "APPROVE",
                    "recommended_amount": eligible,
                    "confidence": "high" if score_val >= 75 else "medium",
                    "rationale": f"Score {score_val:.0f} ({r[2]}), strong in {', '.join(json.loads(r[8])[:2]) if r[8] else 'multiple dimensions'}",
                })
            elif score_val >= 40:
                weakest = min(
                    [
                        ("cash_flow", r[3]),
                        ("compliance", r[4]),
                        ("growth", r[5]),
                        ("stability", r[6]),
                        ("debt", r[7]),
                    ],
                    key=lambda x: x[1],
                )[0]
                recommendations.append({
                    "profile_id": r[0],
                    "business_name": r[10],
                    "action": "CONDITIONAL",
                    "recommended_amount": round(r[12] * 0.15, 2),
                    "confidence": "medium",
                    "rationale": f"Score {score_val:.0f}, needs improvement in {weakest}. Address: {'; '.join(json.loads(r[9])[:2]) if r[9] else 'risk factors'}",
                })
            else:
                recommendations.append({
                    "profile_id": r[0],
                    "business_name": r[10],
                    "action": "DECLINE",
                    "recommended_amount": 0,
                    "confidence": "high",
                    "rationale": f"Score {score_val:.0f} ({r[2]}). Key risks: {'; '.join(json.loads(r[9])[:2]) if r[9] else 'multiple concerns'}",
                })

        industry_insights = []
        for ind, data in industry_risk.items():
            avg = data["total_score"] / data["count"] if data["count"] else 0
            risk_pct = data["high_risk"] / data["count"] * 100 if data["count"] else 0
            industry_insights.append({
                "industry": ind,
                "msme_count": data["count"],
                "avg_score": round(avg, 1),
                "high_risk_pct": round(risk_pct, 1),
                "recommendation": "increase_exposure" if avg >= 60 and risk_pct < 20 else "reduce_exposure" if risk_pct > 40 else "maintain",
            })

        approve_total = sum(r["recommended_amount"] for r in recommendations if r["action"] == "APPROVE")
        conditional_total = sum(r["recommended_amount"] for r in recommendations if r["action"] == "CONDITIONAL")

        return {
            "portfolio_summary": {
                "total_recommendations": len(recommendations),
                "approve": sum(1 for r in recommendations if r["action"] == "APPROVE"),
                "conditional": sum(1 for r in recommendations if r["action"] == "CONDITIONAL"),
                "decline": sum(1 for r in recommendations if r["action"] == "DECLINE"),
                "total_approved_amount": round(approve_total, 2),
                "total_conditional_amount": round(conditional_total, 2),
            },
            "industry_insights": sorted(industry_insights, key=lambda x: x["avg_score"], reverse=True),
            "recommendations": sorted(recommendations, key=lambda x: x["recommended_amount"], reverse=True),
        }


@router.get("/portfolio/llm-insights")
async def portfolio_llm_insights():
    """Generate AI-powered portfolio insights using LLM."""
    from app.services.llm.llm_router import generate_portfolio_insights

    async with async_session_factory() as session:
        result = await session.execute(
            select(
                Score.profile_id,
                Score.overall_score,
                Score.band,
                Score.cash_flow_health,
                Score.compliance,
                Score.growth_trajectory,
                Score.stability,
                Score.debt_serviceability,
                Score.strengths,
                Score.risks,
                MSMEProfile.business_name,
                MSMEProfile.industry,
                MSMEProfile.annual_revenue,
            )
            .join(MSMEProfile, Score.profile_id == MSMEProfile.id)
            .order_by(Score.computed_at.desc())
        )
        rows = result.all()

        seen = set()
        entries = []
        for r in rows:
            if r[0] in seen:
                continue
            seen.add(r[0])
            entries.append(r)

        industry_risk = defaultdict(lambda: {"count": 0, "total_score": 0, "high_risk": 0})
        for r in entries:
            industry = r[11]
            industry_risk[industry]["count"] += 1
            industry_risk[industry]["total_score"] += r[1]
            if r[1] < 40:
                industry_risk[industry]["high_risk"] += 1

        approve_count = sum(1 for r in entries if r[1] >= 60)
        conditional_count = sum(1 for r in entries if 40 <= r[1] < 60)
        decline_count = sum(1 for r in entries if r[1] < 40)

        industry_insights = []
        for ind, data in industry_risk.items():
            avg = data["total_score"] / data["count"] if data["count"] else 0
            risk_pct = data["high_risk"] / data["count"] * 100 if data["count"] else 0
            industry_insights.append({
                "industry": ind,
                "msme_count": data["count"],
                "avg_score": round(avg, 1),
                "high_risk_pct": round(risk_pct, 1),
                "recommendation": "increase_exposure" if avg >= 60 and risk_pct < 20 else "reduce_exposure" if risk_pct > 40 else "maintain",
            })

        total_approved = sum(r[12] * 0.3 for r in entries if r[1] >= 60)
        total_conditional = sum(r[12] * 0.15 for r in entries if 40 <= r[1] < 60)

        portfolio_data = {
            "portfolio_summary": {
                "total_recommendations": len(entries),
                "approve": approve_count,
                "conditional": conditional_count,
                "decline": decline_count,
                "total_approved_amount": round(total_approved, 2),
                "total_conditional_amount": round(total_conditional, 2),
            },
            "industry_insights": sorted(industry_insights, key=lambda x: x["avg_score"], reverse=True),
        }

    insights = await generate_portfolio_insights(portfolio_data)

    return {
        "portfolio_data": portfolio_data,
        "llm_insights": insights or "No LLM providers configured. Configure GEMINI_API_KEY, GROQ_API_KEY, or MISTRAL_API_KEY.",
    }


@router.get("/trends")
async def dashboard_trends(timeframe: str = "monthly"):
    """Get real time-series trend of average credit scores and onboarding volume."""
    async with async_session_factory() as session:
        # Fetch all scores ordered by computed_at
        result = await session.execute(
            select(
                Score.profile_id,
                Score.overall_score,
                Score.computed_at
            ).order_by(Score.computed_at.asc())
        )
        rows = result.all()

        if not rows:
            return []

        # We will parse computed_at and build historical snapshots.
        data_points = []
        for r in rows:
            profile_id, score_val, dt = r
            data_points.append({
                "profile_id": profile_id,
                "score": score_val,
                "date": dt
            })

        # Determine grouping key for each data point
        def get_period_key(dt):
            if timeframe == "weekly":
                # Week format: YYYY-Www
                return dt.strftime("%Y-W%W")
            elif timeframe == "yearly":
                return dt.strftime("%Y")
            else: # monthly
                return dt.strftime("%Y-%b")

        # Let's collect all unique period keys in order
        periods = []
        seen_periods = set()
        for dp in data_points:
            key = get_period_key(dp["date"])
            if key not in seen_periods:
                seen_periods.add(key)
                periods.append((key, dp["date"]))

        # Sort periods chronologically
        periods.sort(key=lambda x: x[1])

        trends = []
        for period_key, period_dt in periods:
            max_date_in_period = max(dp["date"] for dp in data_points if get_period_key(dp["date"]) == period_key)
            
            # Now, find the latest score for each profile computed on or before max_date_in_period
            profile_latest = {}
            for dp in data_points:
                if dp["date"] <= max_date_in_period:
                    profile_latest[dp["profile_id"]] = dp["score"]

            if profile_latest:
                avg_score = sum(profile_latest.values()) / len(profile_latest)
                trends.append({
                    "label": period_key,
                    "score": round(avg_score, 1),
                    "msmes": len(profile_latest)
                })

        return trends

"""Seed the database with mock MSME profiles, transactions, GST, EPFO, and scores."""

from app.core.database import async_session_factory, init_db
from app.models.msme_profile import MSMEProfile
from app.models.health_score import Score
from app.models.transaction import Transaction
from app.models.gst_record import GSTRecord
from app.models.epfo_record import EPFORecord
from app.services.mock_data_generator import (
    generate_mock_profiles,
    generate_mock_transactions,
    generate_mock_gst_records,
    generate_mock_epfo_records,
)
from app.services.scoring_engine import compute_health_score


async def seed():
    await init_db()
    profiles = generate_mock_profiles(20)
    async with async_session_factory() as session:
        for p in profiles:
            profile = MSMEProfile(**p, user_id="1", gstin=f"27AABCU{p['business_name'][-3:]}3D1Z5")
            session.add(profile)
            await session.flush()

            txs = generate_mock_transactions(profile.id, n=30)
            for tx in txs:
                session.add(Transaction(**tx))

            gsts = generate_mock_gst_records(profile.id, gstin=profile.gstin, n=6)
            for g in gsts:
                session.add(GSTRecord(**g))

            epfos = generate_mock_epfo_records(profile.id, n=6)
            for e in epfos:
                session.add(EPFORecord(**e))

            from dataclasses import asdict
            import json
            from datetime import datetime, timedelta
            
            # Seed 3 years of historical score progress for the profile
            for years_back in [3, 2, 1]:
                past_date = datetime.utcnow() - timedelta(days=years_back * 365)
                past_score = compute_health_score(profile)
                past_score_dict = asdict(past_score)
                
                # Introduce variance/progression: scores are lower in the past
                scale = 1.0 - (years_back * 0.08)
                past_score_dict["overall_score"] = max(0.0, min(100.0, past_score_dict["overall_score"] * scale))
                past_score_dict["cash_flow_health"] = max(0.0, min(100.0, past_score_dict["cash_flow_health"] * scale))
                past_score_dict["compliance"] = max(0.0, min(100.0, past_score_dict["compliance"] * scale))
                past_score_dict["growth_trajectory"] = max(0.0, min(100.0, past_score_dict["growth_trajectory"] * scale))
                past_score_dict["stability"] = max(0.0, min(100.0, past_score_dict["stability"] * scale))
                past_score_dict["debt_serviceability"] = max(0.0, min(100.0, past_score_dict["debt_serviceability"] * scale))
                
                # Determine corresponding band
                ov = past_score_dict["overall_score"]
                if ov >= 85: band = "Excellent"
                elif ov >= 70: band = "Good"
                elif ov >= 55: band = "Average"
                elif ov >= 40: band = "Bad"
                else: band = "Poor"
                past_score_dict["band"] = band
                
                past_score_dict["strengths"] = json.dumps(past_score_dict["strengths"])
                past_score_dict["risks"] = json.dumps(past_score_dict["risks"])
                
                past_record = Score(
                    **past_score_dict,
                    profile_id=profile.id,
                    computed_at=past_date
                )
                session.add(past_record)

            score = compute_health_score(profile)
            score_dict = asdict(score)
            score_dict["strengths"] = json.dumps(score_dict["strengths"])
            score_dict["risks"] = json.dumps(score_dict["risks"])
            score_record = Score(**score_dict, profile_id=profile.id)
            session.add(score_record)
        await session.commit()

    print(f"Seeded {len(profiles)} profiles with transactions, GST, EPFO, and scores.")


if __name__ == "__main__":
    import asyncio
    asyncio.run(seed())

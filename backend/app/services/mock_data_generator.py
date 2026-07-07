import random
from datetime import datetime, timedelta
import pandas as pd


def generate_mock_profiles(n: int = 50) -> list[dict]:
    industries = ["Manufacturing", "Retail", "Services", "Technology", "Agriculture", "Healthcare", "Education"]
    business_types = ["Sole Proprietorship", "Partnership", "Private Limited", "LLC"]
    data = []
    for i in range(n):
        data.append({
            "business_name": f"MSME_{i+1:03d}",
            "business_type": random.choice(business_types),
            "industry": random.choice(industries),
            "year_established": random.randint(1990, 2024),
            "employee_count": random.randint(1, 250),
            "annual_revenue": round(random.uniform(1e5, 5e7), 2),
            "net_profit": round(random.uniform(-1e6, 5e6), 2),
            "total_assets": round(random.uniform(5e4, 2e7), 2),
            "total_liabilities": round(random.uniform(0, 1e7), 2),
            "monthly_transaction_volume": random.randint(10, 10000),
            "avg_transaction_value": round(random.uniform(100, 50000), 2),
            "customer_retention_rate": round(random.uniform(20, 98), 2),
            "digital_adoption_score": round(random.uniform(10, 100), 2),
            "market_share": round(random.uniform(0, 25), 2),
            "competitor_count": random.randint(1, 50),
            "regulatory_compliance_score": round(random.uniform(40, 100), 2),
        })
    return data


def generate_mock_transactions(profile_id: int, n: int = 30) -> list[dict]:
    categories = ["revenue", "expense", "tax", "salary", "utilities", "inventory", "marketing"]
    data = []
    base = datetime(2025, 1, 1)
    for i in range(n):
        amt = round(random.uniform(1000, 500000), 2)
        tx_type = "credit" if random.random() < 0.4 else "debit"
        data.append({
            "profile_id": profile_id,
            "date": base + timedelta(days=random.randint(0, 365)),
            "amount": amt,
            "type": tx_type,
            "category": random.choice(categories),
            "description": f"Auto-generated {tx_type} #{i+1}",
            "balance_after": round(random.uniform(10000, 1000000), 2),
            "is_reconciled": random.random() < 0.8,
        })
    return data


def generate_mock_gst_records(profile_id: int, gstin: str, n: int = 6) -> list[dict]:
    data = []
    for i in range(n):
        taxable = round(random.uniform(50000, 2000000), 2)
        liability = round(taxable * 0.18, 2)
        itc = round(taxable * 0.12, 2)
        data.append({
            "profile_id": profile_id,
            "gstin": gstin,
            "filing_period": f"2025-{i+1:02d}",
            "taxable_value": taxable,
            "gst_liability": liability,
            "input_tax_credit": itc,
            "net_gst_paid": round(liability - itc, 2),
            "filed_on_time": random.random() < 0.85,
        })
    return data


def generate_mock_epfo_records(profile_id: int, n: int = 6) -> list[dict]:
    data = []
    for i in range(n):
        wages = round(random.uniform(100000, 1000000), 2)
        data.append({
            "profile_id": profile_id,
            "month": (i % 12) + 1,
            "year": 2025,
            "employee_count_covered": random.randint(5, 100),
            "total_wages": wages,
            "epf_contribution": round(wages * 0.12, 2),
            "eps_contribution": round(wages * 0.0833, 2),
            "edli_contribution": round(wages * 0.005, 2),
            "filed_on_time": random.random() < 0.85,
            "compliance_score": round(random.uniform(60, 100), 2),
        })
    return data


def export_to_csv(profiles: list[dict], path: str = "mock_data.csv"):
    df = pd.DataFrame(profiles)
    df.to_csv(path, index=False)
    return path

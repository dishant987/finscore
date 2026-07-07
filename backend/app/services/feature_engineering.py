import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

from app.models.msme_profile import MSMEProfile


def extract_features(profile: MSMEProfile) -> np.ndarray:
    df = pd.DataFrame([{
        "profit_margin": profile.net_profit / max(profile.annual_revenue, 1),
        "debt_ratio": profile.total_liabilities / max(profile.total_assets, 1),
        "revenue_per_employee": profile.annual_revenue / max(profile.employee_count, 1),
        "retention_rate": profile.customer_retention_rate,
        "digital_score": profile.digital_adoption_score,
        "compliance_score": profile.regulatory_compliance_score,
        "market_share": profile.market_share,
        "tx_per_month": profile.monthly_transaction_volume,
        "avg_tx_value": profile.avg_transaction_value,
    }])

    scaler = StandardScaler()
    scaled = scaler.fit_transform(df.select_dtypes(include=[np.number]))
    return scaled

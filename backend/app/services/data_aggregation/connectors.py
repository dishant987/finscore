import math
from datetime import date, timedelta
from random import Random

from app.models.msme_profile import MSMEProfile


def _rng(profile: MSMEProfile) -> Random:
    return Random(hash(f"{profile.id}-{profile.business_name}-{profile.annual_revenue}"))


def _months_back(n: int) -> list[tuple[int, int]]:
    """Return (year, month) tuples for the last n months."""
    today = date.today()
    return [(today - timedelta(days=30 * i)).year for i in range(n)], \
           [(today - timedelta(days=30 * i)).month for i in range(n)]


class GSTConnector:
    """GST filing data — turnover, tax paid, filing punctuality, GSTIN status."""

    @staticmethod
    def fetch(profile: MSMEProfile) -> dict:
        r = _rng(profile)
        monthly_revenue = profile.annual_revenue / 12
        tax_rate = r.uniform(0.08, 0.18)
        gstin_active = r.random() > 0.08

        years, months = _months_back(12)
        monthly = []
        on_time_count = 0
        for i in range(12):
            turnover = monthly_revenue * r.uniform(0.85, 1.15)
            tax = turnover * tax_rate * r.uniform(0.9, 1.1)
            itc = tax * r.uniform(0.4, 0.7)
            filed_on_time = r.random() > 0.12
            if filed_on_time:
                on_time_count += 1
            monthly.append({
                "period": f"{years[i]}-{months[i]:02d}",
                "taxable_value": round(turnover, 2),
                "gst_liability": round(tax, 2),
                "input_tax_credit": round(itc, 2),
                "net_gst_paid": round(tax - itc, 2),
                "filed_on_time": filed_on_time,
            })

        return {
            "gstin": f"{profile.gstin or 'N/A'}",
            "gstin_status": "active" if gstin_active else "cancelled",
            "filing_punctuality": round(on_time_count / 12 * 100, 1),
            "avg_monthly_turnover": round(sum(m["taxable_value"] for m in monthly) / 12, 2),
            "avg_tax_paid": round(sum(m["net_gst_paid"] for m in monthly) / 12, 2),
            "total_tax_paid_12m": round(sum(m["net_gst_paid"] for m in monthly), 2),
            "monthly_breakdown": monthly,
        }


class AAConnector:
    """Account Aggregator proxy — bank statement inflows, outflows, bounces, EMIs."""

    @staticmethod
    def fetch(profile: MSMEProfile) -> dict:
        r = _rng(profile)
        monthly_revenue = profile.annual_revenue / 12

        years, months = _months_back(6)
        statements = []
        total_inflow = 0
        total_outflow = 0
        total_bounces = 0
        emi_total = 0
        balances = []

        for i in range(6):
            inflow = monthly_revenue * r.uniform(0.9, 1.1)
            outflow = inflow * r.uniform(0.7, 0.95)
            bounces = r.randint(0, 3)
            emi = profile.total_liabilities / 12 * r.uniform(0.02, 0.06)
            bal = r.uniform(monthly_revenue * 0.1, monthly_revenue * 0.4)

            total_inflow += inflow
            total_outflow += outflow
            total_bounces += bounces
            emi_total += emi
            balances.append(bal)

            statements.append({
                "month": months[i],
                "year": years[i],
                "total_inflow": round(inflow, 2),
                "total_outflow": round(outflow, 2),
                "bounce_count": bounces,
                "emi_obligations": round(emi, 2),
                "avg_balance": round(bal, 2),
            })

        return {
            "avg_monthly_inflow": round(total_inflow / 6, 2),
            "avg_monthly_outflow": round(total_outflow / 6, 2),
            "net_monthly_cashflow": round((total_inflow - total_outflow) / 6, 2),
            "avg_balance_6m": round(sum(balances) / 6, 2),
            "total_bounces_6m": total_bounces,
            "avg_monthly_emi": round(emi_total / 6, 2),
            "bounce_rate": round(total_bounces / 6, 2),
            "statements": statements,
        }


class UPIConnector:
    """UPI transaction data — volume, frequency, counterparty diversity, seasonality."""

    @staticmethod
    def fetch(profile: MSMEProfile) -> dict:
        r = _rng(profile)
        base_volume = max(profile.monthly_transaction_volume, 10)

        years, months = _months_back(12)
        monthly = []
        all_counterparties = set()
        total_volume = 0

        for i in range(12):
            seasonal = 1.0
            if months[i] in [3, 4, 10, 11]:
                seasonal = r.uniform(1.1, 1.3)
            elif months[i] in [5, 6]:
                seasonal = r.uniform(0.7, 0.9)

            volume = int(base_volume * seasonal * r.uniform(0.85, 1.15))
            unique_cp = r.randint(max(5, volume // 4), max(10, volume // 2))
            avg_value = profile.avg_transaction_value * r.uniform(0.9, 1.1)

            month_cps = {f"cp_{r.randint(1000, 9999)}" for _ in range(unique_cp)}
            all_counterparties |= month_cps
            total_volume += volume

            monthly.append({
                "period": f"{years[i]}-{months[i]:02d}",
                "transaction_count": volume,
                "unique_counterparties": unique_cp,
                "avg_transaction_value": round(avg_value, 2),
                "total_volume": round(volume * avg_value, 2),
                "seasonal_factor": round(seasonal, 2),
            })

        total_cp = len(all_counterparties)
        top_2_share = r.uniform(0.15, 0.60)
        return {
            "total_transactions_12m": total_volume,
            "avg_monthly_volume": round(total_volume / 12, 1),
            "unique_counterparties_12m": total_cp,
            "counterparty_concentration": round(top_2_share, 3),
            "diversified": top_2_share < 0.4,
            "peak_months": [3, 4, 10, 11],
            "low_months": [5, 6],
            "monthly_breakdown": monthly,
        }


class EPFOConnector:
    """EPFO data — employee count trend, salary regularity, PF contribution."""

    @staticmethod
    def fetch(profile: MSMEProfile) -> dict:
        r = _rng(profile)
        base_employees = profile.employee_count

        years, months = _months_back(12)
        records = []
        counts = []
        total_wages = 0
        total_pf = 0
        on_time = 0

        for i in range(12):
            emp = max(1, int(base_employees * r.uniform(0.9, 1.05)))
            avg_wage = r.uniform(15000, 60000)
            wages = emp * avg_wage
            pf = wages * 0.12
            filed = r.random() > 0.05

            counts.append(emp)
            total_wages += wages
            total_pf += pf
            if filed:
                on_time += 1

            records.append({
                "month": months[i],
                "year": years[i],
                "employee_count_covered": emp,
                "total_wages": round(wages, 2),
                "epf_contribution": round(pf * 0.75, 2),
                "eps_contribution": round(pf * 0.25, 2),
                "filed_on_time": filed,
            })

        emp_std = math.sqrt(sum((c - (sum(counts) / len(counts))) ** 2 for c in counts) / len(counts)) if counts else 0
        return {
            "avg_employee_count": round(sum(counts) / len(counts), 1),
            "employee_count_trend": counts,
            "employee_stability": round(1 - min(emp_std / max(sum(counts) / len(counts), 1), 0.5), 3),
            "avg_monthly_wages": round(total_wages / 12, 2),
            "avg_monthly_pf": round(total_pf / 12, 2),
            "filing_compliance": round(on_time / 12 * 100, 1),
            "monthly_breakdown": records,
        }


class EInvoiceConnector:
    """e-Invoice / e-Way bill data — DPI stack bonus source."""

    @staticmethod
    def fetch(profile: MSMEProfile) -> dict:
        r = _rng(profile)
        base_invoices = max(profile.monthly_transaction_volume // 3, 5)

        years, months = _months_back(12)
        monthly = []
        total_value = 0
        generated = 0
        cancelled = 0

        for i in range(12):
            count = int(base_invoices * r.uniform(0.8, 1.2))
            avg_val = profile.avg_transaction_value * r.uniform(0.7, 1.3)
            canc = int(count * r.uniform(0.01, 0.08))
            total = count * avg_val

            generated += count
            cancelled += canc
            total_value += total

            monthly.append({
                "period": f"{years[i]}-{months[i]:02d}",
                "invoice_count": count,
                "cancelled_count": canc,
                "avg_invoice_value": round(avg_val, 2),
                "total_value": round(total, 2),
            })

        return {
            "total_invoices_12m": generated,
            "avg_monthly_invoices": round(generated / 12, 1),
            "cancellation_rate": round(cancelled / max(generated, 1) * 100, 2),
            "avg_invoice_value": round(total_value / max(generated, 1), 2),
            "compliance_rate": round(r.uniform(92, 100), 1),
            "monthly_breakdown": monthly,
        }

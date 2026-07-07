export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
}

export interface MSMEProfile {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  industry: string;
  year_established: number;
  employee_count: number;
  gstin?: string;
  annual_revenue: number;
  net_profit: number;
  total_assets: number;
  total_liabilities: number;
  monthly_transaction_volume: number;
  avg_transaction_value: number;
  customer_retention_rate: number;
  digital_adoption_score: number;
  market_share: number;
  competitor_count: number;
  regulatory_compliance_score: number;
  created_at: string;
  updated_at: string;
  overall_score?: number;
  band?: string;
}

export interface MSMECreate {
  business_name: string;
  business_type: string;
  industry: string;
  year_established: number;
  employee_count: number;
  annual_revenue: number;
  net_profit: number;
  total_assets: number;
  total_liabilities: number;
  monthly_transaction_volume: number;
  avg_transaction_value: number;
  customer_retention_rate: number;
  digital_adoption_score: number;
  market_share?: number;
  competitor_count?: number;
  regulatory_compliance_score?: number;
}

export interface HealthScore {
  id: string;
  profile_id: string;
  overall_score: number;
  band: string;
  cash_flow_health: number;
  compliance: number;
  growth_trajectory: number;
  stability: number;
  debt_serviceability: number;
  strengths: string[];
  risks: string[];
  llm_insights: string | null;
  default_probability: number;
  risk_tier: string;
  computed_at: string;
}

export interface DashboardSummary {
  total_profiles: number;
  average_scores: Record<string, number>;
  band_distribution: {
    poor: number;
    bad: number;
    average: number;
    good: number;
    excellent: number;
  };
  industry_breakdown: Array<{
    industry: string;
    count: number;
    avg_score: number;
    high_risk: number;
    medium_risk: number;
    low_risk: number;
  }>;
  recent_scores: Array<{
    id: string;
    profile_id: string;
    overall_score: number;
    band: string;
    computed_at: string;
  }>;
}

export interface ScoringComparison {
  business_name: string;
  industry: string;
  traditional_scoring: {
    has_credit_history: boolean;
    has_itr_filed: boolean;
    has_cibil_score: boolean;
    decision: "REJECTED";
    reason: string;
    score: null;
  };
  alt_data_scoring: {
    decision: "APPROVED";
    overall_score: number;
    band: string;
    dimensions: Record<string, number>;
    strengths: string[];
    risks: string[];
    data_sources: string[];
  } | null;
  is_credit_invisible: boolean;
}

export interface PaginatedProfiles {
  items: MSMEProfile[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface NTCOutput {
  profile_id: string;
  business_name: string;
  phone: string;
  gstin: string;
  industry: string;
  provisional_score: number;
  band: string;
  comparison: {
    traditional: { decision: string; reason: string };
    alt_data: { decision: string; overall_score: number; band: string; dimensions: Record<string, number>; data_sources_used: string[] };
  };
  computed_at: string;
  access_token: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    is_active: boolean;
  };
}

export interface GSTRecord {
  id: string;
  profile_id: string;
  gstin: string;
  filing_period: string;
  taxable_value: number;
  gst_liability: number;
  input_tax_credit: number;
  net_gst_paid: number;
  filed_on_time: boolean;
  filing_date?: string;
}

export interface EPFORecord {
  id: string;
  profile_id: string;
  month: number;
  year: number;
  employee_count_covered: number;
  total_wages: number;
  epf_contribution: number;
  eps_contribution: number;
  edli_contribution: number;
  filed_on_time: boolean;
  compliance_score: number;
}

export interface TransactionRecord {
  id: string;
  profile_id: string;
  date: string;
  amount: number;
  type: string;
  category: string;
  description?: string;
  balance_after?: number;
  is_reconciled?: boolean;
}


import api from "./client";
import type { DashboardSummary } from "@/types";

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const res = await api.get("/dashboard/summary");
  return res.data;
}

export interface RiskCluster {
  profile_id: string;
  business_name: string;
  industry: string;
  annual_revenue: number;
  overall_score: number;
  band: string;
  weakest_dimension: string;
  risks: string[];
}

export interface PortfolioRiskClusters {
  summary: {
    approve_count: number;
    review_count: number;
    deny_count: number;
    total_analyzed: number;
    total_lending_potential: number;
  };
  clusters: {
    approve: RiskCluster[];
    review: RiskCluster[];
    deny: RiskCluster[];
  };
}

export interface PortfolioRecommendation {
  profile_id: string;
  business_name: string;
  action: "APPROVE" | "CONDITIONAL" | "DECLINE";
  recommended_amount: number;
  confidence: string;
  rationale: string;
}

export interface IndustryInsight {
  industry: string;
  msme_count: number;
  avg_score: number;
  high_risk_pct: number;
  recommendation: string;
}

export interface PortfolioRecommendations {
  portfolio_summary: {
    total_recommendations: number;
    approve: number;
    conditional: number;
    decline: number;
    total_approved_amount: number;
    total_conditional_amount: number;
  };
  industry_insights: IndustryInsight[];
  recommendations: PortfolioRecommendation[];
}

export interface PortfolioLLMInsights {
  portfolio_data: PortfolioRecommendations;
  llm_insights: string;
}

export async function getPortfolioRiskClusters(): Promise<PortfolioRiskClusters> {
  const res = await api.get("/dashboard/portfolio/risk-clusters");
  return res.data;
}

export async function getPortfolioRecommendations(): Promise<PortfolioRecommendations> {
  const res = await api.get("/dashboard/portfolio/recommendations");
  return res.data;
}

export async function getPortfolioLLMInsights(): Promise<PortfolioLLMInsights> {
  const res = await api.get("/dashboard/portfolio/llm-insights");
  return res.data;
}

export interface TrendDataPoint {
  label: string;
  score: number;
  msmes: number;
}

export async function getDashboardTrends(timeframe: "weekly" | "monthly" | "yearly"): Promise<TrendDataPoint[]> {
  const res = await api.get("/dashboard/trends", { params: { timeframe } });
  return res.data;
}

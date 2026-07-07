import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import Card from "@/components/ui/Card";
import { getPortfolioRiskClusters, getPortfolioRecommendations, getPortfolioLLMInsights } from "@/api/dashboard";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import ReactMarkdown from "react-markdown";
import {
  AlertTriangle, CheckCircle2, XCircle, Users, TrendingUp,
  ArrowLeft, Sparkles,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

const ACTION_COLORS: Record<string, string> = { APPROVE: "#14b8a6", CONDITIONAL: "#f59e0b", DECLINE: "#ef4444" };

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemAnim = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const tooltipStyle = { contentStyle: { background: "#14141f", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, color: "#f0f0f5", fontSize: 13 } };

export default function Portfolio() {
  const { data: clusters, isLoading: clustersLoading } = useQuery({ queryKey: ["portfolio-risk-clusters"], queryFn: getPortfolioRiskClusters });
  const { data: recs, isLoading: recsLoading } = useQuery({ queryKey: ["portfolio-recommendations"], queryFn: getPortfolioRecommendations });
  const { data: llmData, isLoading: llmLoading } = useQuery({ queryKey: ["portfolio-llm-insights"], queryFn: getPortfolioLLMInsights });

  const isLoading = clustersLoading || recsLoading;

  const actionDist = recs ? [
    { name: "Approve", value: recs.portfolio_summary.approve, fill: "#14b8a6" },
    { name: "Conditional", value: recs.portfolio_summary.conditional, fill: "#f59e0b" },
    { name: "Decline", value: recs.portfolio_summary.decline, fill: "#ef4444" },
  ] : [];

  const industryData = recs?.industry_insights?.map((ind) => ({ name: ind.industry, score: ind.avg_score, risk: ind.high_risk_pct })) || [];

  return (
    <AppLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={itemAnim} className="flex items-center gap-3">
          <Link to="/dashboard" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1 -ml-1">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">Portfolio Risk</h1>
            <p className="text-sm text-[var(--text-muted)]">AI-driven lending decisions across your MSME portfolio</p>
          </div>
        </motion.div>

        {/* Summary */}
        <motion.div variants={itemAnim} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Analyzed", value: clusters?.summary?.total_analyzed ?? 0, icon: Users },
            { label: "Approve", value: clusters?.summary?.approve_count ?? 0, icon: CheckCircle2 },
            { label: "Review", value: clusters?.summary?.review_count ?? 0, icon: AlertTriangle },
            { label: "Deny", value: clusters?.summary?.deny_count ?? 0, icon: XCircle },
          ].map((s) => (
            <div key={s.label} className="surface rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-soft)' }}>
                <s.icon size={18} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <p className="stat-label">{s.label}</p>
                <p className="stat-value">{s.value}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Lending Potential */}
        <motion.div variants={itemAnim}>
          <div className="surface rounded-2xl p-6 flex items-center gap-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-soft)' }}>
              <TrendingUp size={24} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p className="stat-label">Lending Potential (Approve Tier)</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{formatCurrency(clusters?.summary?.total_lending_potential ?? 0)}</p>
            </div>
            <div className="ml-auto text-right space-y-1">
              <div>
                <p className="text-xs text-[var(--text-muted)]">Approved</p>
                <p className="text-base font-bold" style={{ color: 'var(--accent)' }}>{formatCurrency(recs?.portfolio_summary?.total_approved_amount ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Conditional</p>
                <p className="text-base font-bold text-amber-400">{formatCurrency(recs?.portfolio_summary?.total_conditional_amount ?? 0)}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Charts */}
        <motion.div variants={itemAnim} className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Decision Distribution</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={actionDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={45} paddingAngle={3}>
                  {actionDist.map((e) => (<Cell key={e.name} fill={e.fill} />))}
                </Pie>
                <Tooltip {...tooltipStyle} />
                <Legend formatter={(value) => <span className="text-[var(--text-secondary)] text-sm">{value}</span>} iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Industry Risk Profile</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={industryData} barSize={28}>
                <XAxis dataKey="name" tick={{ fill: "#5c5c70", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" domain={[0, 100]} tick={{ fill: "#5c5c70", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: "#5c5c70", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} />
                <Bar yAxisId="left" dataKey="score" fill="#14b8a6" radius={[4, 4, 0, 0]} name="Avg Score" />
                <Bar yAxisId="right" dataKey="risk" fill="#ef4444" radius={[4, 4, 0, 0]} name="High Risk %" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Recommendations */}
        <motion.div variants={itemAnim}>
          <Card>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Lending Recommendations</h3>
            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3,4,5].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-4 w-24 ml-auto" />
                    <Skeleton className="h-3 w-14" />
                    <Skeleton className="h-3 flex-1" />
                  </div>
                ))}
              </div>
            ) : recs?.recommendations && recs.recommendations.length > 0 ? (
              <div className="space-y-1">
                {recs.recommendations.map((r) => (
                  <Link key={r.profile_id} to={`/profile/${r.profile_id}`} className="flex items-center justify-between px-4 py-3 rounded-xl transition-all" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-[var(--text-primary)]">{r.business_name}</span>
                      <span className="chip text-xs" style={{ background: `${ACTION_COLORS[r.action]}20`, color: ACTION_COLORS[r.action] }}>{r.action}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-mono font-semibold text-[var(--text-primary)]">{r.recommended_amount > 0 ? formatCurrency(r.recommended_amount) : "-"}</span>
                      <span className={`text-xs font-medium ${r.confidence === "high" ? "text-[var(--accent)]" : "text-amber-400"}`}>{r.confidence}</span>
                      <span className="text-xs text-[var(--text-muted)] max-w-[200px] truncate">{r.rationale}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)] text-center py-8">No recommendations available.</p>
            )}
          </Card>
        </motion.div>

        {/* Industry Insights */}
        {recs?.industry_insights && recs.industry_insights.length > 0 && (
          <motion.div variants={itemAnim}>
            <Card>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Sector Strategy</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {recs.industry_insights.map((ind) => (
                  <div key={ind.industry} className="rounded-xl p-4" style={{ background: 'var(--surface)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-[var(--text-primary)]">{ind.industry}</span>
                      <span className={`chip text-xs ${
                        ind.recommendation === "increase_exposure" ? "band-good" :
                        ind.recommendation === "reduce_exposure" ? "band-poor" : ""
                      }`}>{ind.recommendation.replace("_", " ")}</span>
                    </div>
                    <div className="flex gap-4 text-xs">
                      <div><p className="text-[var(--text-muted)]">MSMEs</p><p className="font-semibold text-[var(--text-primary)]">{ind.msme_count}</p></div>
                      <div><p className="text-[var(--text-muted)]">Avg Score</p><p className="font-semibold" style={{ color: ind.avg_score >= 60 ? 'var(--accent)' : ind.avg_score >= 40 ? '#f59e0b' : '#ef4444' }}>{ind.avg_score}</p></div>
                      <div><p className="text-[var(--text-muted)]">High Risk</p><p className="font-semibold text-red-400">{ind.high_risk_pct}%</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* AI Insights */}
        {llmData?.llm_insights && (
          <motion.div variants={itemAnim}>
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} style={{ color: 'var(--accent)' }} />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">AI Portfolio Analysis</h3>
                {llmLoading && <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />}
              </div>
              <div className="text-sm text-[var(--text-secondary)] leading-relaxed rounded-xl p-4" style={{ background: 'var(--surface)' }}>
                <ReactMarkdown>{llmData.llm_insights}</ReactMarkdown>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Risk Clusters */}
        {clusters && (
          <motion.div variants={itemAnim} className="grid gap-6 lg:grid-cols-3">
            {[
              { key: "approve" as const, title: "Approve", icon: CheckCircle2 },
              { key: "review" as const, title: "Review", icon: AlertTriangle },
              { key: "deny" as const, title: "Deny", icon: XCircle },
            ].map(({ key, title, icon: Icon }) => (
              <Card key={key}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={15} style={{ color: 'var(--accent)' }} />
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
                  <span className="ml-auto text-xs text-[var(--text-muted)]">{clusters.clusters[key].length}</span>
                </div>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {clusters.clusters[key].length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] text-center py-4">None</p>
                  ) : (
                    clusters.clusters[key].map((msme) => (
                      <Link key={msme.profile_id} to={`/profile/${msme.profile_id}`} className="flex items-center justify-between rounded-xl p-2.5 transition-all" style={{ background: 'var(--surface)' }}>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">{msme.business_name}</p>
                          <p className="text-xs text-[var(--text-muted)]">{msme.industry}</p>
                        </div>
                        <p className="text-sm font-bold" style={{ color: BAND_COLORS[msme.band] || "#5c5c70" }}>{msme.overall_score.toFixed(0)}</p>
                      </Link>
                    ))
                  )}
                </div>
              </Card>
            ))}
          </motion.div>
        )}
      </motion.div>
    </AppLayout>
  );
}

const BAND_COLORS: Record<string, string> = {
  Poor: "#ef4444", Bad: "#f97316", Average: "#f59e0b", Good: "#14b8a6", Excellent: "#2dd4bf",
};

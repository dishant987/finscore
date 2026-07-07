import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import Card from "@/components/ui/Card";
import { getDashboardSummary, getPortfolioLLMInsights, getDashboardTrends } from "@/api/dashboard";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LabelList,
  AreaChart, Area, CartesianGrid
} from "recharts";
import { Plus, TrendingDown, Users, Shield, Building2, Activity, ArrowRight, Sparkles, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import { useUIStore } from "@/store/ui";
import { motion } from "framer-motion";
import { PageSkeleton } from "@/components/ui/Skeleton";


const BAND_COLORS: Record<string, string> = {
  poor: "#ef4444", bad: "#f97316", average: "#f59e0b",
  good: "#14b8a6", excellent: "#2dd4bf",
};
const DIM_COLORS = ["#14b8a6", "#06b6d4", "#8b5cf6", "#f59e0b", "#ec4899"];
const DIM_LABELS: Record<string, string> = {
  cash_flow_health: "Cash Flow", compliance: "Compliance",
  growth_trajectory: "Growth", stability: "Stability",
  debt_serviceability: "Debt",
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemAnim = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const DIM_DESCRIPTIONS: Record<string, string> = {
  "Cash Flow": "Evaluates transaction velocity, liquidity margins, and payment cycles.",
  "Compliance": "Measures GST filing consistency, tax accuracy, and EPFO compliance.",
  "Growth": "Tracks year-on-year revenue expansion and digital ledger adoption.",
  "Stability": "Assesses company vintage, client retention, and market presence.",
  "Debt": "Analyzes debt service capability, outstanding EMIs, and leverage ratio."
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-xl p-3 shadow-xl border border-[rgba(255,255,255,0.08)]" style={{ background: '#111119', maxWidth: 220 }}>
        <p className="text-xs font-bold text-white mb-0.5">{data.name}</p>
        <p className="text-lg font-black text-[var(--accent)] mb-1.5">{data.value} <span className="text-[10px] text-[var(--text-muted)] font-normal">/ 100</span></p>
        <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
          {DIM_DESCRIPTIONS[data.name] || ""}
        </p>
      </div>
    );
  }
  return null;
};

const PieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="rounded-xl p-3 shadow-xl border border-[rgba(255,255,255,0.08)] text-xs" style={{ background: '#111119' }}>
        <span className="font-semibold text-white">{data.name}: </span>
        <span className="font-bold text-[var(--accent)] ml-1">{data.value} MSMEs</span>
      </div>
    );
  }
  return null;
};

const TrendTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl p-3 shadow-xl border border-[rgba(255,255,255,0.08)] text-xs" style={{ background: '#111119' }}>
        <p className="font-bold text-white mb-2">{payload[0].payload.label}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-6">
            <span className="text-[var(--text-secondary)]">Avg Credit Score:</span>
            <span className="font-bold text-[var(--accent)]">{payload[0].value} / 100</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-[var(--text-secondary)]">Active MSMEs:</span>
            <span className="font-bold text-[#8b5cf6]">{payload[1]?.value ?? 0}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const liveDemoEnabled = useUIStore((s) => s.liveDemoEnabled);
  const [timeframe, setTimeframe] = useState<"weekly" | "monthly" | "yearly">("monthly");

  const { data: llmInsightsData } = useQuery({
    queryKey: ["portfolio-llm-insights"],
    queryFn: getPortfolioLLMInsights,
    refetchInterval: liveDemoEnabled ? 30_000 : false,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: getDashboardSummary,
    refetchInterval: liveDemoEnabled ? 10_000 : false,
  });

  const { data: trendData = [] } = useQuery({
    queryKey: ["dashboard-trends", timeframe],
    queryFn: () => getDashboardTrends(timeframe),
    refetchInterval: liveDemoEnabled ? 10_000 : false,
  });

  if (isLoading) {
    return <AppLayout><PageSkeleton cards={4} /></AppLayout>;
  }

  const overall = data?.average_scores?.overall ?? 0;
  const atRisk = (data?.band_distribution?.poor ?? 0) + (data?.band_distribution?.bad ?? 0);
  const goodCount = (data?.band_distribution?.good ?? 0) + (data?.band_distribution?.excellent ?? 0);

  const avgScores = Object.entries(data?.average_scores ?? {})
    .filter(([k]) => k !== "overall")
    .map(([k, v]) => ({
      name: DIM_LABELS[k] || k,
      value: Math.round(v),
      fill: DIM_COLORS[Object.keys(DIM_LABELS).indexOf(k)] || "#6366f1",
    }));

  const bandData = data?.band_distribution
    ? Object.entries(data.band_distribution).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }))
    : [];

  return (
    <AppLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">

        {/* Header */}
        <motion.div variants={itemAnim} className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Dashboard</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {data?.total_profiles ?? 0} MSME profiles · Avg score <span className="text-[var(--accent)] font-semibold">{overall.toFixed(1)}</span>
            </p>
          </div>
          <Link to="/onboarding" className="btn-primary text-sm py-2 px-4">
            <Plus size={15} /> New Profile
          </Link>
        </motion.div>

        {/* Stat cards */}
        <motion.div variants={itemAnim} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total MSMEs", value: data?.total_profiles ?? 0, icon: Users },
            { label: "Avg Score", value: overall.toFixed(1), icon: Activity },
            { label: "At Risk", value: atRisk, icon: TrendingDown },
            { label: "Good/Excellent", value: goodCount, icon: Shield },
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

        {/* Timeframe Selector & Trend Chart */}
        <motion.div variants={itemAnim}>
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Credit Health & Onboarding Trends</h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Historical average credit score and MSME volume growth over time</p>
              </div>
              
              <div className="flex bg-[var(--background)] p-1 rounded-xl border border-[var(--border)] self-start sm:self-center">
                {(["weekly", "monthly", "yearly"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimeframe(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                      timeframe === t
                        ? "bg-[var(--accent)] text-white shadow-sm font-bold"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="msmeColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="label" tick={{ fill: "#5c5c70", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" domain={[0, 100]} tick={{ fill: "#5c5c70", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 'auto']} tick={{ fill: "#5c5c70", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<TrendTooltip />} />
                <Area yAxisId="left" type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2} fillOpacity={1} fill="url(#scoreColor)" name="Avg Credit Score" />
                <Area yAxisId="right" type="monotone" dataKey="msmes" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#msmeColor)" name="Total MSMEs" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Charts */}
        <motion.div variants={itemAnim} className="grid gap-6 lg:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Dimension Scores</h3>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={avgScores} barSize={36}>
                <XAxis dataKey="name" tick={{ fill: "#5c5c70", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "#5c5c70", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {avgScores.map((entry, i) => (<Cell key={i} fill={entry.fill} />))}
                  <LabelList dataKey="value" position="insideTop" fill="#000000" fontSize={11} fontWeight="bold" offset={10} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Band Distribution</h3>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie 
                  data={bandData} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={80} 
                  innerRadius={45} 
                  paddingAngle={3}
                  label={({ value }) => value > 0 ? `${value}` : ""}
                  labelLine={false}
                >
                  {bandData.map((e) => (<Cell key={e.name} fill={BAND_COLORS[e.name.toLowerCase()] || "#6366f1"} />))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend formatter={(value) => <span className="text-[var(--text-secondary)] text-sm">{value}</span>} iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Industry breakdown */}
        {data?.industry_breakdown && data.industry_breakdown.length > 0 && (
          <motion.div variants={itemAnim}>
            <Card>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Industry Breakdown</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.industry_breakdown.map((ind) => {
                  const total = ind.high_risk + ind.medium_risk + ind.low_risk || 1;
                  return (
                    <div key={ind.industry} className="rounded-xl p-4" style={{ background: 'var(--surface)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-[var(--text-primary)]">{ind.industry}</span>
                        <span className="text-xs text-[var(--text-muted)]">{ind.count} MSMEs</span>
                      </div>
                      <div className="flex items-end gap-3 mb-3">
                        <span className="text-2xl font-bold" style={{ color: ind.avg_score >= 60 ? 'var(--accent)' : ind.avg_score >= 40 ? '#f59e0b' : '#ef4444' }}>
                          {ind.avg_score.toFixed(0)}
                        </span>
                        <span className="text-xs text-[var(--text-muted)] mb-1">avg score</span>
                      </div>
                      <div className="flex gap-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${ind.high_risk/total*100}%`, background: '#ef4444' }} />
                        <div className="h-full rounded-full transition-all" style={{ width: `${ind.medium_risk/total*100}%`, background: '#f59e0b' }} />
                        <div className="h-full rounded-full transition-all" style={{ width: `${ind.low_risk/total*100}%`, background: 'var(--accent)' }} />
                      </div>
                      <div className="flex gap-3 mt-2 text-xs text-[var(--text-muted)]">
                        <span>● <span className="text-red-400">{ind.high_risk}</span></span>
                        <span>● <span className="text-amber-400">{ind.medium_risk}</span></span>
                        <span>● <span className="text-[var(--accent)]">{ind.low_risk}</span></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Recent scores */}
        {data?.recent_scores && data.recent_scores.length > 0 && (
          <motion.div variants={itemAnim}>
            <Card>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Recent Assessments</h3>
              </div>
              <div className="space-y-1">
                {data.recent_scores.map((s) => {
                  const bandKey = s.band.toLowerCase();
                  return (
                    <Link
                      key={s.id}
                      to={`/profile/${s.profile_id}`}
                      className="flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                    >
                      <div className="flex items-center gap-4">
                        <Building2 size={16} className="text-[var(--text-muted)]" />
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {s.profile_id.slice(0, 8)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-bold" style={{ color: s.overall_score >= 60 ? 'var(--accent)' : s.overall_score >= 40 ? '#f59e0b' : '#ef4444' }}>
                          {s.overall_score.toFixed(0)}
                        </span>
                        <span className={`chip ${'band-'+bandKey}`}>{s.band}</span>
                        <span className="text-xs text-[var(--text-muted)]">{new Date(s.computed_at).toLocaleDateString()}</span>
                        <ArrowRight size={14} className="text-[var(--text-muted)]" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        )}

        {/* AI Portfolio Insights Hub */}
        <motion.div variants={itemAnim}>
          <Card>
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="text-[var(--accent)]" size={18} />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">AI Portfolio Insights Hub</h3>
            </div>
            
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Executive Summary</h4>
                <div 
                  className="rounded-xl p-4 text-sm text-[var(--text-secondary)] leading-relaxed border border-[var(--border)]"
                  style={{ background: 'rgba(255,255,255,0.01)', minHeight: '120px' }}
                >
                  {llmInsightsData?.llm_insights && !llmInsightsData.llm_insights.includes("No LLM providers configured") ? (
                    <div className="whitespace-pre-wrap text-xs md:text-sm">{llmInsightsData.llm_insights}</div>
                  ) : (
                    <div className="space-y-3">
                      <p>
                        Based on the current portfolio of <strong>{data?.total_profiles ?? 0} MSMEs</strong> with an average credit score of <strong>{overall.toFixed(1)}/100</strong>, the platform has identified key trends:
                      </p>
                      <ul className="list-disc pl-5 space-y-1.5 text-xs">
                        <li><strong>Cash Flow Health</strong> is currently the weakest operational dimension (avg: {data?.average_scores?.cash_flow_health ? Math.round(data.average_scores.cash_flow_health) : 43}/100). This indicates low working capital buffers.</li>
                        <li><strong>Tax & Compliance</strong> remains a significant strength (avg: {data?.average_scores?.compliance ? Math.round(data.average_scores.compliance) : 84}/100), implying high eligibility for formal credit linkages.</li>
                        <li><strong>Lending Opportunity</strong>: The cumulative lending potential under pre-approved parameters stands at <strong>₹{((data?.total_profiles ?? 0) * 1.8).toFixed(1)} Cr</strong>.</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Strategic Directives</h4>
                <div className="space-y-3">
                  <div className="rounded-xl p-3 flex gap-3 border border-[rgba(239,68,68,0.15)] bg-[rgba(239,68,68,0.02)]">
                    <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={16} />
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-primary)]">Cash Flow Intervention</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">Implement automated cash flow monitoring via Account Aggregator for low scoring segments.</p>
                    </div>
                  </div>
                  
                  <div className="rounded-xl p-3 flex gap-3 border border-[rgba(16,185,129,0.15)] bg-[rgba(16,185,129,0.02)]">
                    <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={16} />
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-primary)]">Compliance Incentive</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">Offer up to 0.75% rate discount for MSMEs with a Compliance score above 80/100.</p>
                    </div>
                  </div>

                  <div className="rounded-xl p-3 flex gap-3 border border-[rgba(99,102,241,0.15)] bg-[rgba(99,102,241,0.02)]">
                    <TrendingUp className="text-indigo-400 shrink-0 mt-0.5" size={16} />
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-primary)]">Sector Expansion</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">Retail exposure can be safely increased due to stable average transaction velocities.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}

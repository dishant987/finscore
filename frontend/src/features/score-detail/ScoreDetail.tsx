import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import Card from "@/components/ui/Card";
import { computeScore } from "@/api/msme";
import ScoreGauge from "@/components/charts/ScoreGauge";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer,
  RadialBarChart, RadialBar,
} from "recharts";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, CheckCircle2, AlertTriangle, Activity, Sparkles } from "lucide-react";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { motion } from "framer-motion";

const BAND_COLORS: Record<string, string> = {
  Poor: "#ef4444", Bad: "#f97316", Average: "#f59e0b", Good: "#14b8a6", Excellent: "#2dd4bf",
};
const DIM_LABELS: Record<string, string> = {
  cash_flow_health: "Cash Flow", compliance: "Compliance", growth_trajectory: "Growth",
  stability: "Stability", debt_serviceability: "Debt Service",
};
const dimKeys = ["cash_flow_health", "compliance", "growth_trajectory", "stability", "debt_serviceability"] as const;

export default function ScoreDetail() {
  const { profileId } = useParams<{ profileId: string }>();
  const pid = profileId!;
  const { data: score, isLoading } = useQuery({
    queryKey: ["score", pid],
    queryFn: () => computeScore(pid),
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded-full" />
            <div><Skeleton className="h-6 w-40 mb-1" /><Skeleton className="h-3 w-48" /></div>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <SkeletonCard className="lg:col-span-2" /><SkeletonCard />
          </div>
          <div className="grid gap-6 lg:grid-cols-2"><SkeletonCard /><SkeletonCard /></div>
          <SkeletonCard />
        </div>
      </AppLayout>
    );
  }
  if (!score) return <AppLayout><p className="text-red-400 text-center py-20">Score not found</p></AppLayout>;

  const radarData = dimKeys.map((k) => ({ category: DIM_LABELS[k], value: score[k] }));
  const overall = score.overall_score;
  const bandColor = BAND_COLORS[score.band] || "#5c5c70";
  const gaugeData = [{ name: "Score", value: overall, fill: bandColor }];

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

        <div className="flex items-center gap-3">
          <Link to={`/profile/${pid}`} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1 -ml-1">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">Score Report</h1>
            <p className="text-sm text-[var(--text-muted)]">MSME #{pid.slice(0, 8)}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-5">Dimension Breakdown</h3>
            <div className="space-y-4">
              {dimKeys.map((k) => (<ScoreGauge key={k} label={DIM_LABELS[k]} value={score[k]} />))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Overall</h3>
              <Activity size={14} className="text-[var(--text-muted)]" />
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <RadialBarChart cx="50%" cy="50%" innerRadius="55%" outerRadius="100%" barSize={12} data={gaugeData} startAngle={180} endAngle={0}>
                <RadialBar dataKey="value" cornerRadius={8} />
              </RadialBarChart>
            </ResponsiveContainer>
            <p className="text-center text-4xl font-extrabold text-[var(--text-primary)] -mt-5">{overall.toFixed(0)}</p>
            <div className="text-center mt-1">
              <span className={`chip ${'band-'+score.band.toLowerCase()}`}>{score.band}</span>
            </div>
            <div className="mt-4 flex gap-2">
              <div className="flex-1 rounded-xl p-3" style={{ background: 'var(--surface)' }}>
                <p className="text-xs text-[var(--text-muted)]">Default Prob.</p>
                <p className="text-base font-bold" style={{ color: (score.default_probability ?? 0.5) < 0.15 ? 'var(--accent)' : (score.default_probability ?? 0.5) < 0.4 ? '#f59e0b' : '#ef4444' }}>
                  {((score.default_probability ?? 0.5) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="flex-1 rounded-xl p-3" style={{ background: 'var(--surface)' }}>
                <p className="text-xs text-[var(--text-muted)]">Risk Tier</p>
                <span className={`chip ${score.risk_tier === "low" ? "band-good" : score.risk_tier === "medium" ? "band-average" : "band-poor"}`}>
                  {(score.risk_tier ?? "medium").toUpperCase()}
                </span>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Radar View</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.06)" />
                <PolarAngleAxis dataKey="category" tick={{ fill: "#5c5c70", fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "#5c5c70", fontSize: 10 }} />
                <Radar dataKey="value" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.08} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Strengths & Risks</h3>
            {score.strengths.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
                  <CheckCircle2 size={12} /> Strengths
                </p>
                <div className="space-y-1.5">
                  {score.strengths.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm rounded-xl p-2.5" style={{ background: 'var(--surface)' }}>
                      <CheckCircle2 size={14} style={{ color: 'var(--accent)' }} className="mt-0.5 shrink-0" />
                      <span className="text-[var(--text-secondary)]">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {score.risks.length > 0 && (
              <div>
                <p className="text-xs text-red-400 font-semibold tracking-wider mb-2 flex items-center gap-1.5">
                  <AlertTriangle size={12} /> Risks
                </p>
                <div className="space-y-1.5">
                  {score.risks.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm rounded-xl p-2.5" style={{ background: 'var(--surface)' }}>
                      <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
                      <span className="text-[var(--text-secondary)]">{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {score.strengths.length === 0 && score.risks.length === 0 && (
              <p className="text-sm text-[var(--text-muted)] text-center py-8">No flagged items</p>
            )}
          </Card>
        </div>

        {score.llm_insights && (
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} style={{ color: 'var(--accent)' }} />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">AI Insights</h3>
            </div>
            <div className="text-sm text-[var(--text-secondary)] leading-relaxed rounded-xl p-4" style={{ background: 'var(--surface)' }}>
              <ReactMarkdown>{score.llm_insights}</ReactMarkdown>
            </div>
          </Card>
        )}
      </motion.div>
    </AppLayout>
  );
}

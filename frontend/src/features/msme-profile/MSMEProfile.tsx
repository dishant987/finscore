import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import AppLayout from "@/components/layout/AppLayout";
import Card from "@/components/ui/Card";
import {
  getProfile, computeScore, getScoringComparison,
  uliCreditReport, ocenLoanRequest, aaConsentRequest, aaConsentApprove, aaConsentPull,
  listGstRecords, createGstRecord,
  listEpfoRecords, createEpfoRecord,
  listTransactionRecords, createTransactionRecord
} from "@/api/msme";
import type { GSTRecord, EPFORecord, TransactionRecord } from "@/types";
import { formatCurrency } from "@/lib/utils";
import ScoreGauge from "@/components/charts/ScoreGauge";
import { useUIStore } from "@/store/ui";
import { motion } from "framer-motion";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer,
  RadialBarChart, RadialBar,
} from "recharts";
import {
  ArrowLeft, RefreshCw, Building2, TrendingUp, Users, DollarSign, Wallet,
  CheckCircle2, AlertTriangle, Zap, GitCompare, XCircle, Activity,
  Sparkles, ShieldCheck, FileSpreadsheet, Cpu, Send, Database, Key, Check, Plus
} from "lucide-react";
import { useScoreSSE } from "@/hooks/useScoreSSE";
import ReactMarkdown from "react-markdown";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

const BAND_COLORS: Record<string, string> = {
  Poor: "#ef4444", Bad: "#f97316", Average: "#f59e0b", Good: "#14b8a6", Excellent: "#2dd4bf",
};
const DIM_LABELS: Record<string, string> = {
  cash_flow_health: "Cash Flow", compliance: "Compliance", growth_trajectory: "Growth",
  stability: "Stability", debt_serviceability: "Debt",
};
const dimKeys = ["cash_flow_health", "compliance", "growth_trajectory", "stability", "debt_serviceability"] as const;

export default function MSMEProfile() {
  const { id } = useParams<{ id: string }>();
  const profileId = id!;
  const queryClient = useQueryClient();
  const liveDemoEnabled = useUIStore((s) => s.liveDemoEnabled);
  const [showComparison, setShowComparison] = useState(false);

  // Integration Panel States
  const [activeTab, setActiveTab] = useState<"aa" | "uli" | "ocen">("aa");
  
  // AA state
  const [consentId, setConsentId] = useState<string | null>(null);
  const [consentStatus, setConsentStatus] = useState<string>("idle"); // idle, requested, approved, pulled
  const [consentData, setConsentData] = useState<any>(null);
  const [aaLoading, setAaLoading] = useState(false);

  // ULI state
  const [uliReport, setUliReport] = useState<any>(null);
  const [uliLoading, setUliLoading] = useState(false);

  // OCEN state
  const [ocenRequest, setOcenRequest] = useState<any>(null);
  const [ocenLoading, setOcenLoading] = useState(false);

  const handleAaRequest = async () => {
    setAaLoading(true);
    try {
      const res = await aaConsentRequest(profileId);
      setConsentId(res.consent_id);
      setConsentStatus("requested");
      setConsentData(res);
      toast.success("AA Consent request initiated successfully!");
    } catch {
      toast.error("Failed to request AA consent");
    } finally {
      setAaLoading(false);
    }
  };

  const handleAaApprove = async () => {
    if (!consentId) return;
    setAaLoading(true);
    try {
      const res = await aaConsentApprove(consentId);
      setConsentStatus("approved");
      setConsentData(res);
      toast.success("AA Consent approved by user!");
    } catch {
      toast.error("Failed to approve consent");
    } finally {
      setAaLoading(false);
    }
  };

  const handleAaPull = async () => {
    if (!consentId) return;
    setAaLoading(true);
    try {
      const res = await aaConsentPull(consentId);
      setConsentStatus("pulled");
      setConsentData(res);
      toast.success("Data successfully fetched from AA!");
      queryClient.invalidateQueries({ queryKey: ["score", profileId] });
    } catch {
      toast.error("Failed to pull data from AA");
    } finally {
      setAaLoading(false);
    }
  };

  const handleUliReport = async () => {
    setUliLoading(true);
    try {
      const res = await uliCreditReport(profileId);
      setUliReport(res);
      toast.success("Standardized ULI credit report compiled!");
    } catch {
      toast.error("Failed to fetch ULI report");
    } finally {
      setUliLoading(false);
    }
  };

  const handleOcenRequest = async () => {
    setOcenLoading(true);
    try {
      const res = await ocenLoanRequest(profileId);
      setOcenRequest(res);
      toast.success("OCEN loan package dispatched successfully!");
    } catch {
      toast.error("Failed to send OCEN request");
    } finally {
      setOcenLoading(false);
    }
  };

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", profileId],
    queryFn: () => getProfile(profileId),
  });

  const { data: score, isLoading: scoreLoading } = useQuery({
    queryKey: ["score", profileId],
    queryFn: () => computeScore(profileId),
    enabled: !!profile,
  });

  const { data: comparison } = useQuery({
    queryKey: ["comparison", profileId],
    queryFn: () => getScoringComparison(profileId),
    enabled: showComparison,
  });

  const scoreMutation = useMutation({
    mutationFn: () => computeScore(profileId),
    onSuccess: (data) => {
      queryClient.setQueryData(["score", profileId], data);
      toast.success("Score recomputed");
    },
    onError: () => toast.error("Failed to compute score"),
  });

  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  useScoreSSE(profileId, liveDemoEnabled);

  const [altDataTab, setAltDataTab] = useState<"gst" | "epfo" | "transactions">("gst");
  const [showAddForm, setShowAddForm] = useState(false);

  // GST Form State
  const [gstForm, setGstForm] = useState({
    gstin: "",
    filing_period: "",
    taxable_value: 0,
    gst_liability: 0,
    input_tax_credit: 0,
    net_gst_paid: 0,
    filed_on_time: true,
    filing_date: new Date().toISOString().split("T")[0]
  });

  // EPFO Form State
  const [epfoForm, setEpfoForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    employee_count_covered: 1,
    total_wages: 0,
    epf_contribution: 0,
    eps_contribution: 0,
    edli_contribution: 0,
    filed_on_time: true
  });

  // Transaction Form State
  const [txForm, setTxForm] = useState({
    date: new Date().toISOString().slice(0, 16),
    amount: 0,
    type: "credit" as "credit" | "debit",
    category: "revenue",
    description: "",
    balance_after: 0
  });

  const { data: gstRecords = [], refetch: refetchGst } = useQuery({
    queryKey: ["gst-records", profileId],
    queryFn: () => listGstRecords(profileId),
  });

  const { data: epfoRecords = [], refetch: refetchEpfo } = useQuery({
    queryKey: ["epfo-records", profileId],
    queryFn: () => listEpfoRecords(profileId),
  });

  const { data: transactionRecords = [], refetch: refetchTx } = useQuery({
    queryKey: ["transaction-records", profileId],
    queryFn: () => listTransactionRecords(profileId),
  });

  const gstMutation = useMutation({
    mutationFn: (data: Omit<GSTRecord, "id" | "profile_id">) => createGstRecord(profileId, data),
    onSuccess: () => {
      refetchGst();
      toast.success("GST filing record added successfully");
      setShowAddForm(false);
      queryClient.invalidateQueries({ queryKey: ["score", profileId] });
    },
    onError: () => toast.error("Failed to add GST filing record")
  });

  const epfoMutation = useMutation({
    mutationFn: (data: Omit<EPFORecord, "id" | "profile_id" | "compliance_score">) => createEpfoRecord(profileId, data),
    onSuccess: () => {
      refetchEpfo();
      toast.success("EPFO filing record added successfully");
      setShowAddForm(false);
      queryClient.invalidateQueries({ queryKey: ["score", profileId] });
    },
    onError: () => toast.error("Failed to add EPFO filing record")
  });

  const txMutation = useMutation({
    mutationFn: (data: Omit<TransactionRecord, "id" | "profile_id">) => createTransactionRecord(profileId, data),
    onSuccess: () => {
      refetchTx();
      toast.success("Transaction record added successfully");
      setShowAddForm(false);
      queryClient.invalidateQueries({ queryKey: ["score", profileId] });
    },
    onError: () => toast.error("Failed to add transaction record")
  });

  const simulateTransaction = async () => {
    try {
      const token = (await import("@/store/auth")).useAuthStore.getState().token;
      const res = await fetch(
        `${apiBase}/integrations/ingest/transaction?msme_id=${profileId}&amount=50000&type=credit`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success(`Score updated! New: ${data.new_score.overall_score.toFixed(1)}`);
    } catch {
      toast.error("Failed to simulate transaction");
    }
  };

  if (profileLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded-full" />
            <div><Skeleton className="h-6 w-56 mb-1" /><Skeleton className="h-3 w-36" /></div>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <SkeletonCard className="lg:col-span-2" /><SkeletonCard />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <SkeletonCard /><SkeletonCard />
          </div>
          <SkeletonCard />
        </div>
      </AppLayout>
    );
  }
  if (!profile) return <AppLayout><p className="text-red-400 text-center py-20">Profile not found</p></AppLayout>;

  const radarData = score ? dimKeys.map((k) => ({ category: DIM_LABELS[k], value: score[k] })) : [];
  const overall = score?.overall_score ?? 0;
  const band = score?.band ?? "N/A";
  const bandColor = BAND_COLORS[band] || "#5c5c70";
  const gaugeData = [{ name: "Score", value: overall, fill: bandColor }];

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1 -ml-1">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Building2 size={18} style={{ color: 'var(--accent)' }} />
                {profile.business_name}
              </h1>
              <p className="text-sm text-[var(--text-muted)]">{profile.industry} · {profile.business_type}</p>
            </div>
          </div>
          {liveDemoEnabled && (
            <div className="flex gap-2">
              <button onClick={simulateTransaction} className="btn-primary text-xs py-2 px-3">
                <Zap size={13} /> Simulate
              </button>
              <button onClick={() => scoreMutation.mutate()} disabled={scoreMutation.isPending} className="btn-secondary text-xs py-2 px-3">
                <RefreshCw size={13} className={scoreMutation.isPending ? "animate-spin" : ""} />
                {scoreMutation.isPending ? "..." : "Recompute"}
              </button>
            </div>
          )}
        </div>

        {/* Main grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Business Overview</h3>
              <span className="text-xs text-[var(--text-muted)] font-mono">{profile.gstin || "No GSTIN"}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: DollarSign, label: "Revenue", value: formatCurrency(profile.annual_revenue) },
                { icon: TrendingUp, label: "Net Profit", value: formatCurrency(profile.net_profit) },
                { icon: Users, label: "Employees", value: profile.employee_count.toString() },
                { icon: Wallet, label: "Assets", value: formatCurrency(profile.total_assets) },
              ].map((item) => (
                <div key={item.label} className="rounded-xl p-3" style={{ background: 'var(--surface)' }}>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1.5">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-soft)' }}>
                      <item.icon size={12} style={{ color: 'var(--accent)' }} />
                    </div>
                    {item.label}
                  </div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-3">
              {[
                { label: "Vintage", value: `${2026 - profile.year_established}yrs` },
                { label: "Monthly Tx", value: profile.monthly_transaction_volume.toLocaleString() },
                { label: "Retention", value: `${profile.customer_retention_rate}%` },
                { label: "Digital", value: profile.digital_adoption_score.toString() },
              ].map((d) => (
                <div key={d.label} className="text-center flex-1 rounded-lg py-2" style={{ background: 'var(--surface)' }}>
                  <p className="text-xs text-[var(--text-muted)]">{d.label}</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{d.value}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            {scoreLoading ? (
              <div className="space-y-3 p-2">
                <Skeleton className="h-3 w-28" />
                <div className="flex justify-center py-4"><Skeleton className="h-28 w-28 rounded-full" /></div>
                <Skeleton className="h-4 w-16 mx-auto" />
                {[1,2,3,4,5].map((i) => (
                  <div key={i} className="flex items-center gap-2"><Skeleton className="h-2 flex-1" /><Skeleton className="h-3 w-8" /></div>
                ))}
              </div>
            ) : score ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Score</h3>
                  <Activity size={14} className="text-[var(--text-muted)]" />
                </div>
                <ResponsiveContainer width="100%" height={150}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" barSize={10} data={gaugeData} startAngle={180} endAngle={0}>
                    <RadialBar dataKey="value" cornerRadius={6} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <p className="text-center text-3xl font-extrabold text-[var(--text-primary)] -mt-4">{overall.toFixed(0)}</p>
                <div className="text-center -mt-1">
                  <span className={`chip ${'band-'+band.toLowerCase()}`}>{band}</span>
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
              </>
            ) : (
              <div className="flex items-center justify-center h-48 text-sm text-[var(--text-muted)]">
                <p>Compute a score</p>
              </div>
            )}
          </Card>
        </div>

        {/* Score details */}
        {score && (
          <>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Dimension Breakdown</h3>
                </div>
                <div className="space-y-3">
                  {dimKeys.map((k) => (
                    <ScoreGauge key={k} label={DIM_LABELS[k]} value={score[k]} size="sm" />
                  ))}
                </div>
              </Card>

              <Card>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Radar View</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.06)" />
                    <PolarAngleAxis dataKey="category" tick={{ fill: "#5c5c70", fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "#5c5c70", fontSize: 10 }} />
                    <Radar dataKey="value" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.08} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
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

              {/* Rejection Comparison */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Rejection Reduction</h3>
                  <button onClick={() => setShowComparison(!showComparison)} className="text-xs font-medium flex items-center gap-1 rounded-xl px-3 py-1.5 transition-all"
                    style={{ background: showComparison ? 'var(--accent-soft)' : 'var(--surface)', color: showComparison ? 'var(--accent)' : 'var(--text-muted)' }}>
                    <GitCompare size={12} /> {showComparison ? "Hide" : "Show"}
                  </button>
                </div>
                {showComparison && comparison ? (
                  <div className="space-y-3">
                    <div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle size={14} className="text-red-400" />
                        <span className="text-sm font-bold text-red-400">Traditional</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-[var(--text-muted)]">CIBIL</span><span className="text-red-400 font-semibold">N/A</span></div>
                        <div className="flex justify-between"><span className="text-[var(--text-muted)]">ITR</span><span className="text-red-400 font-semibold">No</span></div>
                        <div className="flex justify-between"><span className="text-[var(--text-muted)]">Credit History</span><span className="text-red-400 font-semibold">None</span></div>
                      </div>
                      <div className="mt-3 text-center text-sm font-bold text-red-400">{comparison.traditional_scoring.decision}</div>
                    </div>
                    <div className="rounded-xl p-4" style={{ background: 'rgba(20,184,166,0.04)', border: '1px solid rgba(20,184,166,0.12)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 size={14} style={{ color: 'var(--accent)' }} />
                        <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>Alt-Data</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-[var(--text-muted)]">Score</span><span className="font-semibold" style={{ color: 'var(--accent)' }}>{comparison.alt_data_scoring?.overall_score.toFixed(1)}</span></div>
                        <div className="flex justify-between"><span className="text-[var(--text-muted)]">Band</span><span className="font-semibold" style={{ color: 'var(--accent)' }}>{comparison.alt_data_scoring?.band}</span></div>
                        <div className="flex justify-between"><span className="text-[var(--text-muted)]">Sources</span><span className="font-semibold" style={{ color: 'var(--accent)' }}>5 alt sources</span></div>
                      </div>
                      <div className="mt-3 text-center text-sm font-bold" style={{ color: 'var(--accent)' }}>{comparison.alt_data_scoring?.decision}</div>
                    </div>
                  </div>
                ) : showComparison && !comparison ? (
                  <div className="flex items-center justify-center h-16"><div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} /></div>
                ) : (
                  <p className="text-sm text-[var(--text-muted)] text-center py-8">Toggle to see comparison</p>
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

            {/* Ecosystem Integrations Panel */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4 border-b border-[var(--border)] pb-3">
                <Cpu size={16} style={{ color: 'var(--accent)' }} />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Ecosystem Integrations Hub</h3>
                <span className="text-[10px] uppercase font-mono tracking-wider ml-auto" style={{ color: 'var(--accent)' }}>Active Sandboxes</span>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-5">
                {[
                  { id: "aa", label: "Account Aggregator (AA)", icon: Database },
                  { id: "uli", label: "Unified Lending (ULI)", icon: ShieldCheck },
                  { id: "ocen", label: "Open Credit (OCEN)", icon: FileSpreadsheet }
                ].map((t) => {
                  const Icon = t.icon;
                  const isActive = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id as any)}
                      className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      style={{
                        background: isActive ? 'var(--accent-soft)' : 'var(--surface)',
                        color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                        border: isActive ? '1px solid var(--accent)' : '1px solid transparent'
                      }}
                    >
                      <Icon size={13} />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab Contents */}
              <div className="space-y-4">
                {/* 1. Account Aggregator Tab */}
                {activeTab === "aa" && (
                  <div className="space-y-4">
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      Verify alternative financial records via the Account Aggregator (AA) consent lifecycle.
                    </p>

                    <div className="grid grid-cols-3 gap-2 relative">
                      {[
                        { step: 1, label: "Request Consent", activeStatus: "requested", fn: handleAaRequest },
                        { step: 2, label: "Approve Consent", activeStatus: "approved", fn: handleAaApprove, disabled: consentStatus !== "requested" },
                        { step: 3, label: "Fetch & Ingest Data", activeStatus: "pulled", fn: handleAaPull, disabled: consentStatus !== "approved" }
                      ].map((s) => {
                        const isDone = 
                          (s.step === 1 && ["requested", "approved", "pulled"].includes(consentStatus)) ||
                          (s.step === 2 && ["approved", "pulled"].includes(consentStatus)) ||
                          (s.step === 3 && consentStatus === "pulled");
                        const isCurrent = 
                          (s.step === 1 && consentStatus === "idle") ||
                          (s.step === 2 && consentStatus === "requested") ||
                          (s.step === 3 && consentStatus === "approved");

                        return (
                          <button
                            key={s.step}
                            onClick={s.fn}
                            disabled={s.disabled || aaLoading}
                            className="flex flex-col items-center justify-center p-3 rounded-xl transition-all cursor-pointer disabled:opacity-40 text-xs font-medium"
                            style={{
                              background: isCurrent ? 'var(--accent-soft)' : 'var(--surface)',
                              border: isCurrent ? '1px solid var(--accent)' : isDone ? '1px solid rgba(20,184,166,0.2)' : '1px solid transparent'
                            }}
                          >
                            <div className="w-6 h-6 rounded-full flex items-center justify-center mb-1 text-[10px] font-bold"
                              style={{
                                background: isDone ? 'var(--accent)' : isCurrent ? 'var(--accent)' : 'var(--border)',
                                color: '#fff'
                              }}
                            >
                              {isDone ? <Check size={10} strokeWidth={3} /> : s.step}
                            </div>
                            <span className="text-[10px] font-semibold text-center mt-1"
                              style={{ color: isDone || isCurrent ? 'var(--text-primary)' : 'var(--text-muted)' }}
                            >
                              {s.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Status Display */}
                    {consentData && (
                      <div className="rounded-xl p-3.5 text-xs space-y-2" style={{ background: 'var(--surface)' }}>
                        <div className="flex justify-between items-center border-b border-[var(--border)] pb-2 mb-2">
                          <span className="font-semibold text-[var(--text-primary)]">Consent Details</span>
                          <span className={`chip ${consentStatus === "pulled" ? "band-excellent" : consentStatus === "approved" ? "band-good" : "band-average"}`}>
                            {consentStatus.toUpperCase()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[var(--text-secondary)] font-mono text-[10px]">
                          <div>Consent ID:</div>
                          <div className="text-right text-[var(--text-primary)]">{consentData.consent_id.slice(0, 8)}...</div>
                          <div>Data Scope:</div>
                          <div className="text-right text-[var(--text-primary)]">Bank, GST, UPI</div>
                          {consentData.consent_artifacts?.length > 0 && (
                            <>
                              <div>Latest Receipt ID:</div>
                              <div className="text-right text-[var(--text-primary)]">{consentData.consent_artifacts[consentData.consent_artifacts.length - 1].artifact_id.slice(0, 8)}...</div>
                            </>
                          )}
                          {consentStatus === "pulled" && (
                            <>
                              <div className="col-span-2 border-t border-[var(--border)] mt-1.5 pt-1.5 text-[var(--text-primary)] font-semibold flex justify-between">
                                <span>Records Pulled:</span>
                                <span style={{ color: 'var(--accent)' }}>Bank (120) · GST (12) · UPI (2400)</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Unified Lending Interface (ULI) Tab */}
                {activeTab === "uli" && (
                  <div className="space-y-4">
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      Simulate the Unified Lending Interface (ULI) credit score reporting framework to retrieve standardized lending outputs.
                    </p>

                    <button
                      onClick={handleUliReport}
                      disabled={uliLoading}
                      className="btn-primary text-xs py-2 px-4 w-full cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Key size={13} className={uliLoading ? "animate-spin" : ""} />
                      {uliLoading ? "Compiling ULI Report..." : "Retrieve ULI Credit Report"}
                    </button>

                    {uliReport && (
                      <div className="rounded-xl p-3.5 text-xs space-y-2.5" style={{ background: 'var(--surface)' }}>
                        <div className="flex justify-between items-center border-b border-[var(--border)] pb-2">
                          <span className="font-semibold text-[var(--text-primary)]">ULI Payload Output</span>
                          <span className="chip band-good">SUCCESS</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[var(--text-secondary)] font-mono text-[10px]">
                          <div>Report ID:</div>
                          <div className="text-right text-[var(--text-primary)]">{uliReport.uli_report_id.slice(0, 8)}...</div>
                          <div>Eligible limit:</div>
                          <div className="text-right style-accent font-bold" style={{ color: 'var(--accent)' }}>{formatCurrency(uliReport.lending_recommendation.eligible_amount)}</div>
                          <div>Recommended Interest:</div>
                          <div className="text-right text-[var(--text-primary)] font-bold">{uliReport.lending_recommendation.interest_rate}% p.a.</div>
                          <div>Tenure Options:</div>
                          <div className="text-right text-[var(--text-primary)]">{uliReport.lending_recommendation.recommended_tenure_months} Months</div>
                          <div>Risk Level:</div>
                          <div className="text-right text-[var(--text-primary)] uppercase">{uliReport.risk_assessment.risk_level}</div>
                        </div>

                        <div className="border-t border-[var(--border)] pt-2 mt-2">
                          <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-1">Data Sources Verified:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {uliReport.data_sources_used.map((s: any) => (
                              <span key={s.source} className="text-[9px] px-2 py-0.5 rounded-md bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-secondary)]">
                                {s.source} ✓
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Open Credit Enablement Network (OCEN) Tab */}
                {activeTab === "ocen" && (
                  <div className="space-y-4">
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      Simulate the Open Credit Enablement Network (OCEN) LSP-to-Lender loan request protocol.
                    </p>

                    <button
                      onClick={handleOcenRequest}
                      disabled={ocenLoading}
                      className="btn-primary text-xs py-2 px-4 w-full cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Send size={13} className={ocenLoading ? "animate-spin" : ""} />
                      {ocenLoading ? "Packaging Loan..." : "Dispatch OCEN Loan Request Package"}
                    </button>

                    {ocenRequest && (
                      <div className="rounded-xl p-3.5 text-xs space-y-2.5" style={{ background: 'var(--surface)' }}>
                        <div className="flex justify-between items-center border-b border-[var(--border)] pb-2">
                          <span className="font-semibold text-[var(--text-primary)]">OCEN Handshake Schema</span>
                          <span className="chip band-excellent">TRANSMITTED</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[var(--text-secondary)] font-mono text-[10px]">
                          <div>Application ID:</div>
                          <div className="text-right text-[var(--text-primary)]">{ocenRequest.loan_application_id.slice(0, 8)}...</div>
                          <div>LSP Recommendation:</div>
                          <div className="text-right font-bold" style={{ color: 'var(--accent)' }}>{formatCurrency(ocenRequest.recommended_loan.eligible_amount)}</div>
                          <div>Confidence Level:</div>
                          <div className="text-right text-[var(--text-primary)] uppercase font-semibold">{ocenRequest.recommended_loan.confidence}</div>
                          <div>Consent Artifact ID:</div>
                          <div className="text-right text-[var(--text-primary)]">{ocenRequest.consent_artifact.consent_id.slice(0, 8)}...</div>
                          <div>AA Reference:</div>
                          <div className="text-right text-[var(--text-primary)]">{ocenRequest.consent_artifact.aa_consent_ref}</div>
                        </div>

                        <div className="border-t border-[var(--border)] pt-2 mt-2">
                          <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-1">Financial Health Package:</p>
                          <div className="grid grid-cols-5 gap-1 text-center font-mono text-[9px] mt-1">
                            {ocenRequest.financial_health.dimensions && Object.entries(ocenRequest.financial_health.dimensions).map(([k, val]: any) => (
                              <div key={k} className="p-1 rounded bg-[var(--surface-hover)] border border-[var(--border)]">
                                <p className="text-[8px] text-[var(--text-muted)] truncate">{k.split('_')[0]}</p>
                                <p className="font-semibold text-[var(--text-primary)]">{val}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* Alternate Data Explorer Panel */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4 border-b border-[var(--border)] pb-3">
                <div className="flex items-center gap-2">
                  <Database size={16} style={{ color: 'var(--accent)' }} />
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Alternate Data Explorer</h3>
                </div>
                <button
                  onClick={() => {
                    setShowAddForm(!showAddForm);
                    if (altDataTab === "gst" && !gstForm.gstin && profile?.gstin) {
                      setGstForm(f => ({ ...f, gstin: profile.gstin || "" }));
                    }
                  }}
                  className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={13} />
                  {showAddForm ? "Cancel" : "Add Record"}
                </button>
              </div>

              {/* Sub tabs */}
              <div className="flex gap-2 mb-4">
                {[
                  { id: "gst", label: "GST Filings" },
                  { id: "epfo", label: "EPFO Filings" },
                  { id: "transactions", label: "Bank Transactions" }
                ].map((tab) => {
                  const isActive = altDataTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setAltDataTab(tab.id as any);
                        setShowAddForm(false);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                      style={{
                        background: isActive ? 'var(--accent-soft)' : 'var(--surface)',
                        color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Add forms */}
              {showAddForm && (
                <div className="mb-5 p-4 rounded-xl border border-[var(--border)] space-y-3" style={{ background: 'var(--surface)' }}>
                  <h4 className="text-xs font-bold text-[var(--text-primary)] mb-2 uppercase tracking-wider">
                    Add New {altDataTab.toUpperCase()} Record
                  </h4>
                  
                  {altDataTab === "gst" && (
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      gstMutation.mutate(gstForm);
                    }} className="space-y-3 text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[var(--text-muted)] mb-1">GSTIN</label>
                          <input
                            type="text"
                            required
                            className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)]"
                            value={gstForm.gstin}
                            onChange={(e) => setGstForm({ ...gstForm, gstin: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-[var(--text-muted)] mb-1">Filing Period (e.g. Mar 2026)</label>
                          <input
                            type="text"
                            required
                            placeholder="Mar 2026"
                            className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)]"
                            value={gstForm.filing_period}
                            onChange={(e) => setGstForm({ ...gstForm, filing_period: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-[var(--text-muted)] mb-1">Taxable Value (₹)</label>
                          <input
                            type="number"
                            required
                            className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)]"
                            value={gstForm.taxable_value || ""}
                            onChange={(e) => setGstForm({ ...gstForm, taxable_value: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <label className="block text-[var(--text-muted)] mb-1">GST Liability (₹)</label>
                          <input
                            type="number"
                            required
                            className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)]"
                            value={gstForm.gst_liability || ""}
                            onChange={(e) => setGstForm({ ...gstForm, gst_liability: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <label className="block text-[var(--text-muted)] mb-1">Input Tax Credit (₹)</label>
                          <input
                            type="number"
                            required
                            className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)]"
                            value={gstForm.input_tax_credit || ""}
                            onChange={(e) => setGstForm({ ...gstForm, input_tax_credit: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <label className="block text-[var(--text-muted)] mb-1">Net GST Paid (₹)</label>
                          <input
                            type="number"
                            required
                            className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)]"
                            value={gstForm.net_gst_paid || ""}
                            onChange={(e) => setGstForm({ ...gstForm, net_gst_paid: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <label className="block text-[var(--text-muted)] mb-1">Filing Date</label>
                          <input
                            type="date"
                            required
                            className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)]"
                            value={gstForm.filing_date}
                            onChange={(e) => setGstForm({ ...gstForm, filing_date: e.target.value })}
                          />
                        </div>
                        <div className="flex items-center pt-5">
                          <label className="flex items-center gap-2 text-[var(--text-primary)] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={gstForm.filed_on_time}
                              onChange={(e) => setGstForm({ ...gstForm, filed_on_time: e.target.checked })}
                              className="accent-[var(--accent)]"
                            />
                            Filed On Time
                          </label>
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={gstMutation.isPending}
                        className="btn-primary w-full py-2 cursor-pointer mt-3"
                      >
                        {gstMutation.isPending ? "Adding..." : "Submit GST Record"}
                      </button>
                    </form>
                  )}

                  {altDataTab === "epfo" && (
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      epfoMutation.mutate(epfoForm);
                    }} className="space-y-3 text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[var(--text-muted)] mb-1">Month (1-12)</label>
                          <input
                            type="number"
                            min="1"
                            max="12"
                            required
                            className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)]"
                            value={epfoForm.month}
                            onChange={(e) => setEpfoForm({ ...epfoForm, month: parseInt(e.target.value) || 1 })}
                          />
                        </div>
                        <div>
                          <label className="block text-[var(--text-muted)] mb-1">Year</label>
                          <input
                            type="number"
                            required
                            className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)]"
                            value={epfoForm.year}
                            onChange={(e) => setEpfoForm({ ...epfoForm, year: parseInt(e.target.value) || 2026 })}
                          />
                        </div>
                        <div>
                          <label className="block text-[var(--text-muted)] mb-1">Employees Covered</label>
                          <input
                            type="number"
                            required
                            className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)]"
                            value={epfoForm.employee_count_covered || ""}
                            onChange={(e) => setEpfoForm({ ...epfoForm, employee_count_covered: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <label className="block text-[var(--text-muted)] mb-1">Total Wages (₹)</label>
                          <input
                            type="number"
                            required
                            className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)]"
                            value={epfoForm.total_wages || ""}
                            onChange={(e) => setEpfoForm({ ...epfoForm, total_wages: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <label className="block text-[var(--text-muted)] mb-1">EPF Contribution (₹)</label>
                          <input
                            type="number"
                            required
                            className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)]"
                            value={epfoForm.epf_contribution || ""}
                            onChange={(e) => setEpfoForm({ ...epfoForm, epf_contribution: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <label className="block text-[var(--text-muted)] mb-1">EPS Contribution (₹)</label>
                          <input
                            type="number"
                            required
                            className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)]"
                            value={epfoForm.eps_contribution || ""}
                            onChange={(e) => setEpfoForm({ ...epfoForm, eps_contribution: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <label className="block text-[var(--text-muted)] mb-1">EDLI Contribution (₹)</label>
                          <input
                            type="number"
                            required
                            className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)]"
                            value={epfoForm.edli_contribution || ""}
                            onChange={(e) => setEpfoForm({ ...epfoForm, edli_contribution: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="flex items-center pt-5">
                          <label className="flex items-center gap-2 text-[var(--text-primary)] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={epfoForm.filed_on_time}
                              onChange={(e) => setEpfoForm({ ...epfoForm, filed_on_time: e.target.checked })}
                              className="accent-[var(--accent)]"
                            />
                            Filed On Time
                          </label>
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={epfoMutation.isPending}
                        className="btn-primary w-full py-2 cursor-pointer mt-3"
                      >
                        {epfoMutation.isPending ? "Adding..." : "Submit EPFO Record"}
                      </button>
                    </form>
                  )}

                  {altDataTab === "transactions" && (
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      txMutation.mutate(txForm);
                    }} className="space-y-3 text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[var(--text-muted)] mb-1">Date</label>
                          <input
                            type="datetime-local"
                            required
                            className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)]"
                            value={txForm.date}
                            onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-[var(--text-muted)] mb-1">Amount (₹)</label>
                          <input
                            type="number"
                            required
                            className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)]"
                            value={txForm.amount || ""}
                            onChange={(e) => setTxForm({ ...txForm, amount: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <label className="block text-[var(--text-muted)] mb-1">Transaction Type</label>
                          <select
                            className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)]"
                            value={txForm.type}
                            onChange={(e) => setTxForm({ ...txForm, type: e.target.value as any })}
                          >
                            <option value="credit">Credit (Inflow)</option>
                            <option value="debit">Debit (Outflow)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[var(--text-muted)] mb-1">Category</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Sales, Utilities, Salary"
                            className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)]"
                            value={txForm.category}
                            onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[var(--text-muted)] mb-1">Description</label>
                          <input
                            type="text"
                            placeholder="Brief description of the transaction"
                            className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)]"
                            value={txForm.description}
                            onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[var(--text-muted)] mb-1">Balance After Transaction (₹)</label>
                          <input
                            type="number"
                            className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)]"
                            value={txForm.balance_after || ""}
                            onChange={(e) => setTxForm({ ...txForm, balance_after: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={txMutation.isPending}
                        className="btn-primary w-full py-2 cursor-pointer mt-3"
                      >
                        {txMutation.isPending ? "Adding..." : "Submit Transaction Record"}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Data Table */}
              <div className="overflow-x-auto">
                {altDataTab === "gst" && (
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-[var(--text-muted)] border-b border-[var(--border)]">
                        <th className="py-2.5">Period</th>
                        <th className="py-2.5">Taxable Value</th>
                        <th className="py-2.5">Net GST Paid</th>
                        <th className="py-2.5">Punctuality</th>
                        <th className="py-2.5">Filing Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] text-[var(--text-secondary)]">
                      {gstRecords.map((r: GSTRecord) => (
                        <tr key={r.id}>
                          <td className="py-2.5 font-semibold text-[var(--text-primary)]">{r.filing_period}</td>
                          <td className="py-2.5">{formatCurrency(r.taxable_value)}</td>
                          <td className="py-2.5">{formatCurrency(r.net_gst_paid)}</td>
                          <td className="py-2.5">
                            <span className={`chip ${r.filed_on_time ? 'band-excellent' : 'band-poor'}`}>
                              {r.filed_on_time ? "On Time" : "Late"}
                            </span>
                          </td>
                          <td className="py-2.5">{r.filing_date || "N/A"}</td>
                        </tr>
                      ))}
                      {gstRecords.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-[var(--text-muted)]">No GST filings available.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}

                {altDataTab === "epfo" && (
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-[var(--text-muted)] border-b border-[var(--border)]">
                        <th className="py-2.5">Period</th>
                        <th className="py-2.5">Employees Covered</th>
                        <th className="py-2.5">Total Wages</th>
                        <th className="py-2.5">EPF Contribution</th>
                        <th className="py-2.5">Filing Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] text-[var(--text-secondary)]">
                      {epfoRecords.map((r: EPFORecord) => (
                        <tr key={r.id}>
                          <td className="py-2.5 font-semibold text-[var(--text-primary)]">{r.month}/{r.year}</td>
                          <td className="py-2.5 font-medium">{r.employee_count_covered}</td>
                          <td className="py-2.5">{formatCurrency(r.total_wages)}</td>
                          <td className="py-2.5">{formatCurrency(r.epf_contribution)}</td>
                          <td className="py-2.5">
                            <span className={`chip ${r.filed_on_time ? 'band-excellent' : 'band-poor'}`}>
                              {r.filed_on_time ? "On Time" : "Late"}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {epfoRecords.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-[var(--text-muted)]">No EPFO filings available.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}

                {altDataTab === "transactions" && (
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-[var(--text-muted)] border-b border-[var(--border)]">
                        <th className="py-2.5">Date</th>
                        <th className="py-2.5">Category</th>
                        <th className="py-2.5">Description</th>
                        <th className="py-2.5">Type</th>
                        <th className="py-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] text-[var(--text-secondary)]">
                      {transactionRecords.map((r: TransactionRecord) => (
                        <tr key={r.id}>
                          <td className="py-2.5">{new Date(r.date).toLocaleDateString()}</td>
                          <td className="py-2.5 capitalize">{r.category}</td>
                          <td className="py-2.5 truncate max-w-[120px]">{r.description || "N/A"}</td>
                          <td className="py-2.5">
                            <span className={`chip ${r.type === 'credit' ? 'band-good' : 'band-bad'}`}>
                              {r.type.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-semibold text-[var(--text-primary)]">
                            {r.type === 'debit' ? '-' : '+'}{formatCurrency(r.amount)}
                          </td>
                        </tr>
                      ))}
                      {transactionRecords.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-[var(--text-muted)]">No transactions recorded.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>

            <div className="flex gap-4">
              <Link to={`/score/${profileId}`} className="text-sm font-medium flex items-center gap-1.5 transition-colors" style={{ color: 'var(--accent)' }}>
                View detailed report <ArrowLeft size={14} className="rotate-180" />
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </AppLayout>
  );
}

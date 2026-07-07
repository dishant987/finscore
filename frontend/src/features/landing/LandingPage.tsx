import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import {
  ArrowRight, Zap, Shield, Sparkles,
  Building2, Database, Activity, Scale, Cpu,
  TrendingUp, CheckCircle
} from "lucide-react";
import { motion } from "framer-motion";

const dimensions = [
  {
    icon: Activity,
    title: "Cash Flow Health (30% weight)",
    desc: "Monitors monthly cash inflow-outflow consistency, UPI ledger transactions, and working capital cycles.",
    details: "Analyzes bank statements (credits vs. debits), average daily balances, and seasonal patterns."
  },
  {
    icon: Scale,
    title: "Compliance & Filings (20% weight)",
    desc: "Checks GST return timeline adherence (GSTR-1, GSTR-3B) and EPFO employee wage contribution filings.",
    details: "Measures payroll continuity, tax payment punctuality, and flags regulatory warnings."
  },
  {
    icon: TrendingUp,
    title: "Growth Trajectory (20% weight)",
    desc: "Assesses month-over-month growth in revenue, customer retention rates, and employee scaling.",
    details: "Benchmarks year-over-year revenue curves against industry sector averages."
  },
  {
    icon: Building2,
    title: "Stability & Vintage (15% weight)",
    desc: "Considers business operational age (vintage), digital adoption levels, and location stability.",
    details: "Verifies domain vintage, merchant vintage, and digital tools usage score."
  },
  {
    icon: Shield,
    title: "Debt Serviceability (15% weight)",
    desc: "Measures total outstanding liabilities, assets ratio, and interest coverage capability.",
    details: "Calculates standard debt-service coverage ratio (DSCR) based on real-time alt-data revenues."
  }
];

const steps = [
  {
    number: "01",
    title: "MSME Profile Creation",
    desc: "Onboard with minimal info — only business name, contact, and sector are required. The system automatically fetches company basics and sets up the dashboard profile."
  },
  {
    number: "02",
    title: "Consent-Based Alt-Data Aggregation",
    desc: "Connect data streams securely. Integrate GSTIN records, EPFO employee compliance lists, and bank accounts through secure, developer-friendly Account Aggregators (AA)."
  },
  {
    number: "03",
    title: "Multi-Dimension Engine Scoring",
    desc: "The AI engine aggregates the inputs, computes the 5-dimension model, runs risk tiering, flags strengths/risks, and outputs a dynamic score between 300 and 900."
  },
  {
    number: "04",
    title: "Lending Pipeline Execution",
    desc: "Export credit profiles seamlessly. Connect with lenders using the Unified Lending Interface (ULI) format or dispatch standard loan packages via Open Credit Enablement Network (OCEN)."
  }
];

export default function LandingPage() {
  const token = useAuthStore((s) => s.token);

  return (
    <div className="min-h-screen text-[var(--text-primary)]" style={{ background: '#09090e' }}>
      
      {/* Header */}
      <header className="h-16 border-b sticky top-0 z-50 flex items-center justify-between px-6 backdrop-blur-md" style={{ background: 'rgba(9, 9, 14, 0.8)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white transition-all hover:scale-105" style={{ background: 'linear-gradient(135deg, var(--accent), #2dd4bf)' }}>
            <Shield size={16} />
          </div>
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-[var(--text-muted)] bg-clip-text text-transparent">FinScore</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/ntc-onboard" className="text-xs text-[var(--text-muted)] hover:text-white transition-colors font-semibold hidden sm:inline-block">NTC Onboarding Demo</Link>
          {token ? (
            <Link to="/dashboard" className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-bold shadow-lg shadow-[rgba(20,184,166,0.15)]">
              Dashboard <ArrowRight size={13} />
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors font-bold">Sign In</Link>
              <Link to="/register" className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-bold shadow-lg shadow-[rgba(20,184,166,0.15)]">
                Get Started <ArrowRight size={13} />
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="overflow-x-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-[20%] left-[20%] w-[50%] h-[60%] rounded-full blur-[140px] opacity-10" style={{ background: 'var(--accent)' }}></div>
          <div className="absolute -top-[10%] right-[20%] w-[40%] h-[50%] rounded-full blur-[130px] opacity-10" style={{ background: '#2dd4bf' }}></div>
        </div>

        {/* Hero */}
        <section className="relative max-w-5xl mx-auto px-6 pt-24 pb-20 text-center z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 border" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'rgba(20,184,166,0.2)' }}>
              <Sparkles size={13} /> AI-Powered Alternative Data Underwriting
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6 text-white">
              Unlock Lending for the<br />
              <span className="bg-gradient-to-r from-[var(--accent)] to-[#2dd4bf] bg-clip-text text-transparent">Credit-Invisible MSME</span>
            </h1>
            <p className="text-base sm:text-lg text-[var(--text-muted)] max-w-3xl mx-auto mb-10 leading-relaxed font-medium">
              We bypass traditional credit histories (CIBIL) by aggregating real-time alternative data streams—including GST, EPFO compliance, and bank account ledgers—to calculate high-fidelity credit health profiles in seconds.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {token ? (
                <Link to="/dashboard" className="btn-primary text-sm py-3 px-8 w-full sm:w-auto shadow-lg shadow-[rgba(20,184,166,0.15)] flex items-center justify-center gap-1.5">
                  Access Portal Dashboard <ArrowRight size={15} />
                </Link>
              ) : (
                <>
                  <Link to="/ntc-onboard" className="btn-primary text-sm py-3 px-8 w-full sm:w-auto shadow-lg shadow-[rgba(20,184,166,0.15)] flex items-center justify-center gap-1.5">
                    Start NTC Onboarding <ArrowRight size={15} />
                  </Link>
                  <Link to="/register" className="btn-secondary text-sm py-3 px-8 w-full sm:w-auto flex items-center justify-center gap-1.5">
                    Create Partner Account
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        </section>

        {/* Dynamic Simulator Mockup */}
        <section className="max-w-5xl mx-auto px-6 pb-24 z-10 relative">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="rounded-2xl border p-6 sm:p-8 shadow-2xl relative overflow-hidden"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 opacity-[0.01] pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--text-muted) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
            
            <div className="grid md:grid-cols-3 gap-8 items-center relative z-10">
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--accent)] uppercase tracking-wider">
                  <Database size={14} /> Alternative Ingestion Hub
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Multi-source consent aggregation at scale</h2>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  FinScore fetches transactional records directly from the merchant's operating accounts. We analyze GST filing punctuality, workforce size stability through EPFO, and construct cash-flow health index snapshots automatically.
                </p>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-3.5 rounded-xl border border-[var(--border)]" style={{ background: 'var(--surface-hover)' }}>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5 mb-1">
                      <CheckCircle size={13} className="text-emerald-400" /> Account Aggregator (AA)
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">Verified bank statement pulls via secure FIP protocols.</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-[var(--border)]" style={{ background: 'var(--surface-hover)' }}>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5 mb-1">
                      <CheckCircle size={13} className="text-emerald-400" /> GSTN & EPFO Links
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">Real-time GSTR return filing verification and compliance indexes.</p>
                  </div>
                </div>
              </div>
              
              {/* Score Gauge Card Mockup */}
              <div className="rounded-2xl p-5 border border-[var(--border)] text-center space-y-4 shadow-xl" style={{ background: 'rgba(9, 9, 14, 0.4)' }}>
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-semibold border-b border-[var(--border)] pb-2.5">
                  <span>Provisional Credit Health</span>
                  <span className="text-[var(--accent)] font-mono">LIVE DEMO</span>
                </div>
                <div className="py-2 flex flex-col items-center justify-center">
                  <div className="text-4xl font-extrabold text-white">742</div>
                  <div className="text-[10px] uppercase font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 mt-1 border border-emerald-500/20">Excellent Band</div>
                </div>
                <div className="space-y-2 text-left pt-2">
                  <div className="flex justify-between text-xs"><span className="text-[var(--text-muted)]">Cash Flow Index:</span><span className="font-semibold text-white">88/100</span></div>
                  <div className="flex justify-between text-xs"><span className="text-[var(--text-muted)]">Compliance Score:</span><span className="font-semibold text-white">92/100</span></div>
                  <div className="flex justify-between text-xs"><span className="text-[var(--text-muted)]">Rejection Red. Factor:</span><span className="font-semibold text-[var(--accent)]">4.2x Better</span></div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* 5 Dimensions of Credit Assessment */}
        <section className="max-w-5xl mx-auto px-6 pb-24 z-10 relative">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <div className="text-center max-w-2xl mx-auto mb-14">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-4">
                The 5 Dimensions of Alternative Credit
              </h2>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed font-medium">
                Traditional underwriting scores depend heavily on legacy payment histories. FinScore evaluates small businesses holistically across 5 alternative pillars:
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {dimensions.map((d) => (
                <div 
                  key={d.title} 
                  className="rounded-2xl p-6 border border-[var(--border)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)]/40 flex flex-col justify-between" 
                  style={{ background: 'var(--surface)' }}
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all" style={{ background: 'var(--accent-soft)' }}>
                      <d.icon size={18} style={{ color: 'var(--accent)' }} />
                    </div>
                    <h3 className="text-sm font-bold text-white mb-2.5">{d.title}</h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">{d.desc}</p>
                  </div>
                  <div className="border-t border-[var(--border)] pt-3.5 mt-auto text-[10px] text-[var(--text-muted)] font-mono">
                    {d.details}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Step-by-Step Walkthrough */}
        <section className="border-t border-[var(--border)] relative z-10 py-24" style={{ background: 'rgba(9, 9, 14, 0.3)' }}>
          <div className="max-w-5xl mx-auto px-6">
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              <div className="text-center max-w-2xl mx-auto mb-16">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-4">
                  Step-by-Step Ingestion & Underwriting
                </h2>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed font-medium">
                  We have streamlined the end-to-end pipeline to fit into your existing loan management software (LMS) or onboarding client flow.
                </p>
              </div>

              <div className="relative">
                {/* Visual Connection Line for desktop */}
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-[var(--border)] via-[var(--accent)]/30 to-[var(--border)] -translate-y-1/2 hidden lg:block z-0"></div>
                
                <div className="grid lg:grid-cols-4 gap-6 relative z-10">
                  {steps.map((s) => (
                    <div 
                      key={s.number} 
                      className="rounded-2xl p-6 border border-[var(--border)] flex flex-col justify-between transition-all hover:border-[var(--accent)]/30" 
                      style={{ background: 'var(--surface)' }}
                    >
                      <div className="space-y-4">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold font-mono" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                          {s.number}
                        </div>
                        <h3 className="text-sm font-bold text-white tracking-tight">{s.title}</h3>
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center mt-12">
                <Link to="/ntc-onboard" className="btn-primary text-xs py-3 px-8 inline-flex items-center gap-1.5 font-bold shadow-lg shadow-[rgba(20,184,166,0.15)]">
                  Simulate NTC Onboarding Process <ArrowRight size={13} />
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Ecosystem Sandboxes */}
        <section className="max-w-5xl mx-auto px-6 py-24 z-10 relative">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-[var(--accent)]">
                  <Cpu size={12} /> Sandbox Interoperability
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                  Pre-configured for the next-generation lending rails
                </h2>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  FinScore is not just a scoring dashboard. Our endpoints are fully compliant with open banking initiatives. You can retrieve standardized payloads that map directly into the Open Credit Enablement Network (OCEN) standard or package digital reports using the Unified Lending Interface (ULI) specs.
                </p>
                <div className="space-y-3 pt-2">
                  {[
                    { title: "ULI Standard Compliance", desc: "Instantly computes lending limit parameters, risk tiers, and optimized interest rates." },
                    { title: "OCEN LSP Handshake", desc: "Constructs LSP-to-Lender request packages automatically containing consent refs." },
                    { title: "Account Aggregator Ready", desc: "Built to consume standard FIP schemas for instantaneous bank-ledger ingestion." }
                  ].map((item, idx) => (
                    <div key={idx} className="flex gap-2.5">
                      <div className="mt-0.5 shrink-0 text-[var(--accent)]"><CheckCircle size={14} /></div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{item.title}</h4>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border p-6 space-y-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--accent)] border-b border-[var(--border)] pb-2.5 flex items-center justify-between">
                  <span>Underwriting Report Output</span>
                  <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">Passed</span>
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">MSME Business Name</div>
                    <div className="text-sm font-bold text-white mt-0.5">Apex Manufacturing Private Limited</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Alt-Data Health Score</div>
                      <div className="text-xl font-extrabold text-white mt-0.5 flex items-baseline gap-1">
                        <span>742</span>
                        <span className="text-xs text-[var(--text-muted)] font-normal">/ 900</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Risk Evaluation</div>
                      <div className="text-xs font-bold text-emerald-400 mt-1.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                        Low Risk (Tier 1)
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[var(--border)] pt-4 space-y-3">
                    <div className="flex justify-between text-xs items-center">
                      <span className="text-[var(--text-muted)] font-medium">Recommended Limit</span>
                      <span className="font-extrabold text-white text-sm">₹15,00,000</span>
                    </div>
                    <div className="flex justify-between text-xs items-center">
                      <span className="text-[var(--text-muted)] font-medium">Suggested Interest Rate</span>
                      <span className="font-semibold text-emerald-400 text-xs">11.5% p.a.</span>
                    </div>
                  </div>

                  <div className="border-t border-[var(--border)] pt-4 space-y-3">
                    <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Dimension Analysis</div>
                    
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-medium">
                        <span className="text-[var(--text-secondary)]">Cash Flow Index</span>
                        <span className="text-white">88%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                        <div className="h-full rounded-full" style={{ background: 'var(--accent)', width: '88%' }}></div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-medium">
                        <span className="text-[var(--text-secondary)]">Compliance (GST/EPFO)</span>
                        <span className="text-white">92%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-400" style={{ width: '92%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-16" style={{ borderColor: 'var(--border)', background: 'rgba(9, 9, 14, 0.6)' }}>
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand info */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--accent), #2dd4bf)' }}>
                <Shield size={12} />
              </div>
              <span className="font-bold text-base text-white tracking-tight">FinScore</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-sm">
              Unlocking digital financial inclusion for underserved MSMEs. We calculate high-fidelity credit health profiles using alternative data streams including GST, EPFO, and transaction ledgers.
            </p>
          </div>

          {/* Platform */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Platform</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/ntc-onboard" className="text-[var(--text-muted)] hover:text-white transition-colors font-medium">NTC Onboarding</Link></li>
              <li><Link to="/login" className="text-[var(--text-muted)] hover:text-white transition-colors font-medium">Sign In</Link></li>
              <li><Link to="/register" className="text-[var(--text-muted)] hover:text-white transition-colors font-medium">Create Account</Link></li>
            </ul>
          </div>

          {/* Ecosystem Links */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Integrations</h4>
            <ul className="space-y-2 text-xs text-[var(--text-muted)] font-medium">
              <li className="hover:text-white transition-colors cursor-pointer">Account Aggregator</li>
              <li className="hover:text-white transition-colors cursor-pointer">ULI Interface</li>
              <li className="hover:text-white transition-colors cursor-pointer">OCEN Protocol</li>
            </ul>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 border-t pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: 'var(--border)' }}>
          <p className="text-[11px] text-[var(--text-muted)] font-medium">
            &copy; 2026 FinScore. All rights reserved. Securely powered by alternative credit scoring engines.
          </p>
          <div className="flex gap-4 text-[11px] text-[var(--text-muted)] font-medium">
            <span className="hover:text-white transition-colors cursor-pointer">Privacy Policy</span>
            <span className="hover:text-white transition-colors cursor-pointer">Terms of Service</span>
            <span className="hover:text-white transition-colors cursor-pointer">Data Consent</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

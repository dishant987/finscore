import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Building2, Phone, FileText, TrendingUp, CheckCircle2, XCircle,
  RefreshCw, Shield, ArrowRight, ChevronRight, GitCompare, Plus, Search, Filter, X, Eye, Pencil, Trash2
} from "lucide-react";
import { toast } from "sonner";
import Card from "@/components/ui/Card";
import AppLayout from "@/components/layout/AppLayout";
import DataTable, { type Column } from "@/components/ui/DataTable";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { ntcOnboard, listProfiles, listIndustries, deleteProfile } from "@/api/msme";
import { useAuthStore } from "@/store/auth";
import ProfileFormModal from "../profiles-list/ProfileFormModal";
import type { MSMEProfile, NTCOutput } from "@/types";

const INDUSTRIES = ["Retail", "Manufacturing", "Services", "Agriculture", "Technology", "Construction"];
const BAND_CLASSES: Record<string, string> = {
  Poor: "band-poor", Bad: "band-bad", Average: "band-average",
  Good: "band-good", Excellent: "band-excellent",
};

export default function NTCOboarding() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const setAuth = useAuthStore((s) => s.setAuth);

  // Table & Filter States
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Edit & Delete Modal States
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<MSMEProfile | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleOpenEditForm = (profile: MSMEProfile) => {
    setSelectedProfile(profile);
    setIsEditFormOpen(true);
  };

  const handleCloseEditForm = () => {
    setSelectedProfile(null);
    setIsEditFormOpen(false);
  };

  const deleteMutation = useMutation({
    mutationFn: deleteProfile,
    onSuccess: () => {
      toast.success("Profile deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["ntc-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setDeleteId(null);
    },
    onError: () => {
      toast.error("Failed to delete profile");
    },
  });

  // Onboarding Wizard States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [gstin, setGstin] = useState("");
  const [industry, setIndustry] = useState("Retail");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NTCOutput | null>(null);

  // Fetch NTC Profiles
  const { data: ntcData, isLoading, isError, error } = useQuery({
    queryKey: ["ntc-profiles", page, pageSize, search, industryFilter, sortBy, sortDir],
    queryFn: () => listProfiles({
      page,
      page_size: pageSize,
      search,
      industry: industryFilter,
      sort_by: sortBy,
      sort_dir: sortDir,
      is_ntc: true
    }),
  });

  const { data: industries } = useQuery({
    queryKey: ["industries"],
    queryFn: listIndustries,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleSort = (key: string) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(key); setSortDir("asc"); }
  };

  const handleOpenModal = () => {
    setStep(0);
    setBusinessName("");
    setPhone("");
    setGstin("");
    setIndustry("Retail");
    setResult(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleOnboard = async () => {
    if (!businessName.trim() || phone.trim().length < 10) {
      toast.error("Business name and valid phone are required");
      return;
    }
    setLoading(true);
    try {
      const data = await ntcOnboard({ business_name: businessName, phone, gstin: gstin || undefined, industry });
      // Only set auth if not logged in
      if (!token && data.access_token && data.user) {
        setAuth(data.access_token, data.user);
      }
      setResult(data);
      setStep(2);
      
      // Invalidate queries so that the table update is reflected in background
      queryClient.invalidateQueries({ queryKey: ["ntc-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      
      toast.success("NTC Profile Onboarded successfully!");
    } catch {
      toast.error("Onboarding failed");
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<MSMEProfile>[] = [
    {
      key: "business_name", label: "Business", sortable: true,
      render: (item) => (
        <div>
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.business_name}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.business_type}</p>
        </div>
      ),
    },
    { key: "industry", label: "Industry", sortable: true, render: (item) => <span className="chip">{item.industry}</span> },
    { key: "gstin", label: "GSTIN", sortable: true, render: (item) => <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{item.gstin || "N/A"}</span> },
    { key: "overall_score", label: "Provisional Score", sortable: true, className: "text-center", render: (item) => (
      <span className="font-bold text-base" style={{ color: 'var(--accent)' }}>
        {item.overall_score !== null && item.overall_score !== undefined ? item.overall_score.toFixed(0) : "N/A"}
      </span>
    )},
    { key: "band", label: "Risk Band", sortable: true, className: "text-center", render: (item) => (
      <span className={`inline-flex text-xs px-2.5 py-1 rounded-full font-semibold ${BAND_CLASSES[item.band || ""] || "band-average"}`}>
        {item.band || "N/A"}
      </span>
    )},
    { key: "created_at", label: "Onboarded At", sortable: true, render: (item) => (
      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        {new Date(item.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
      </span>
    )},
  ];

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Sparkles size={20} className="text-[var(--accent)]" /> NTC Onboarding
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Onboard New-to-Credit (NTC) / No Traditional Credit (NTB) profiles with minimal information.
            </p>
          </div>
          <button onClick={handleOpenModal} className="btn-primary text-sm py-2 px-4 cursor-pointer">
            <Plus size={15} /> Onboard NTC Profile
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name or GSTIN..."
              className="input-field pl-10 pr-4" />
          </form>
          <div className="flex items-center gap-2">
            <Filter size={14} style={{ color: 'var(--text-muted)' }} />
            <select value={industryFilter} onChange={(e) => { setIndustryFilter(e.target.value); setPage(1); }}
              className="input-field min-w-[150px]">
              <option value="">All Industries</option>
              {industries?.map((ind) => (
                <option key={ind.industry} value={ind.industry}>{ind.industry} ({ind.count})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Datatable */}
        {isLoading ? (
          <PageSkeleton cards={2} />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-6 bg-[#0d0d14] border border-[var(--border)] rounded-2xl">
            <div className="text-red-500 mb-4 font-semibold">Failed to load NTC profiles</div>
            <p className="text-sm text-[var(--text-muted)] max-w-md mb-6">
              {error instanceof Error ? error.message : "An unexpected error occurred."}
            </p>
            <button onClick={() => queryClient.invalidateQueries({ queryKey: ["ntc-profiles"] })} className="btn-primary text-sm py-2 px-5 cursor-pointer">
              Retry
            </button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={ntcData?.items ?? []}
            total={ntcData?.total ?? 0}
            page={ntcData?.page ?? 1}
            pageSize={ntcData?.page_size ?? 20}
            totalPages={ntcData?.total_pages ?? 1}
            sortBy={sortBy}
            sortDir={sortDir}
            onPageChange={setPage}
            onSort={handleSort}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
            actions={(item) => (
              <div className="flex items-center justify-end gap-1">
                <Link to={`/profile/${item.id}`} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
                  <Eye size={15} />
                </Link>
                <button onClick={() => handleOpenEditForm(item)} className="p-2 rounded-lg transition-colors cursor-pointer" style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
                  <Pencil size={15} />
                </button>
                <button onClick={() => setDeleteId(item.id)} className="p-2 rounded-lg transition-colors cursor-pointer" style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'red')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          />
        )}
      </motion.div>

      {/* Onboarding Wizard Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 overflow-y-auto">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0c0c12] border border-[var(--border)] rounded-2xl p-6 md:p-8 max-w-2xl w-full shadow-2xl relative my-8">
              
              <button onClick={handleCloseModal} className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>

              {step < 2 && (
                <div className="flex items-center justify-center gap-3 mb-8">
                  {[0, 1].map((s) => (
                    <div key={s} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-500 ${
                        step === s ? "text-white" : step > s ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
                      }`} style={{ background: step === s ? 'var(--accent)' : step > s ? 'var(--accent-soft)' : 'var(--surface)' }}>
                        {step > s ? <CheckCircle2 size={16} /> : s + 1}
                      </div>
                      {s < 1 && <div className="h-px w-12 transition-all duration-500" style={{ background: step > s ? 'var(--accent)' : 'var(--border)' }} />}
                    </div>
                  ))}
                </div>
              )}

              <AnimatePresence mode="wait">
                {step === 0 && (
                  <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--accent)' }}>
                      <Sparkles size={14} />
                      <span className="text-xs font-bold uppercase tracking-widest">New to Credit?</span>
                    </div>
                    <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Start with your basics</h2>
                    <p className="text-sm text-[var(--text-muted)] mb-6">No CIBIL? No ITR? Enter just your business name and phone for a provisional score.</p>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-sm text-[var(--text-secondary)] flex items-center gap-1.5 font-medium">
                          <Building2 size={14} style={{ color: 'var(--accent)' }} /> Business Name
                        </label>
                        <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Krishna General Store" className="input-field" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm text-[var(--text-secondary)] flex items-center gap-1.5 font-medium">
                          <Phone size={14} style={{ color: 'var(--accent)' }} /> Phone Number
                        </label>
                        <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="e.g. 9876543210" className="input-field" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm text-[var(--text-secondary)] flex items-center gap-1.5 font-medium">
                          <FileText size={14} style={{ color: 'var(--accent)' }} /> GSTIN <span className="text-xs text-[var(--text-muted)] font-normal">(optional)</span>
                        </label>
                        <input value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} placeholder="e.g. 27AAQPK1234F1Z5" className="input-field" />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                      <button onClick={handleCloseModal} className="btn-secondary text-sm py-2 px-5 cursor-pointer">Cancel</button>
                      <button onClick={() => setStep(1)} className="btn-primary text-sm py-2 px-5 cursor-pointer">
                        Continue <ChevronRight size={14} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--accent)' }}>
                      <TrendingUp size={14} />
                      <span className="text-xs font-bold uppercase tracking-widest">Industry Context</span>
                    </div>
                    <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">What sector do you operate in?</h2>
                    <p className="text-sm text-[var(--text-muted)] mb-6">We use industry benchmarks to calibrate your provisional score.</p>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {INDUSTRIES.map((ind) => (
                        <button key={ind} onClick={() => setIndustry(ind)}
                          className="p-4 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
                          style={industry === ind ? { background: 'var(--accent-soft)', border: '1px solid var(--accent)', color: 'var(--accent)' } : { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                          {ind}
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-between gap-3 mt-8">
                      <button onClick={() => setStep(0)} className="btn-secondary text-sm py-2 px-5 cursor-pointer">Back</button>
                      <button onClick={handleOnboard} disabled={loading} className="btn-primary text-sm py-2 px-5 cursor-pointer">
                        {loading ? <><RefreshCw size={14} className="animate-spin" /> Scoring...</> : <><Sparkles size={14} /> Get My Score</>}
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 2 && result && (
                  <motion.div key="step2" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="text-center mb-6 pt-2">
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-full mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                        <Sparkles size={12} /> Provisional Score Ready
                      </div>
                      <h2 className="text-xl font-bold text-[var(--text-primary)]">{result.business_name}</h2>
                      <p className="text-xs text-[var(--text-muted)] mt-1">{result.industry} · {result.phone}</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 mb-5">
                      <div className="bg-[#141420] border border-[var(--border)] rounded-xl p-5 text-center flex flex-col items-center justify-center">
                        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">Provisional Health Score</p>
                        <motion.p initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 150, delay: 0.1 }}
                          className="text-4xl font-extrabold text-[var(--text-primary)]">
                          {result.provisional_score.toFixed(0)}
                        </motion.p>
                        <span className={`inline-flex mt-2 text-xs px-3 py-1 rounded-full font-semibold ${BAND_CLASSES[result.band] || ""}`}>{result.band}</span>
                      </div>
                      <div className="bg-[#141420] border border-[var(--border)] rounded-xl p-5">
                        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3">Data Sources Used</p>
                        <ul className="space-y-1.5">
                          {result.comparison.alt_data.data_sources_used.map((src) => (
                            <li key={src} className="flex items-center gap-2 text-xs rounded-lg p-2" style={{ background: 'var(--surface)' }}>
                              <CheckCircle2 size={12} style={{ color: 'var(--accent)' }} />
                              <span className="text-[var(--text-secondary)]">{src}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="bg-[#141420] border border-[var(--border)] rounded-xl p-5 mb-6">
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <GitCompare size={14} style={{ color: 'var(--accent)' }} />
                        <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">Rejection Reduction Proof</h3>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.08)' }}>
                          <div className="flex items-center gap-2 mb-2">
                            <XCircle size={14} className="text-red-400" />
                            <span className="text-xs font-bold text-red-400">Traditional Scoring</span>
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between"><span className="text-[var(--text-muted)]">CIBIL</span><span className="text-red-400 font-medium">N/A</span></div>
                            <div className="flex justify-between"><span className="text-[var(--text-muted)]">ITR</span><span className="text-red-400 font-medium">No</span></div>
                          </div>
                          <div className="mt-2 text-center text-xs font-bold text-red-400">{result.comparison.traditional.decision}</div>
                        </div>
                        <div className="rounded-xl p-4" style={{ background: 'rgba(20,184,166,0.03)', border: '1px solid rgba(20,184,166,0.08)' }}>
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 size={14} style={{ color: 'var(--accent)' }} />
                            <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>Alt-Data Scoring</span>
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between"><span className="text-[var(--text-muted)]">Score</span><span className="font-medium" style={{ color: 'var(--accent)' }}>{result.provisional_score.toFixed(0)}</span></div>
                            <div className="flex justify-between"><span className="text-[var(--text-muted)]">Band</span><span className="font-medium" style={{ color: 'var(--accent)' }}>{result.band}</span></div>
                          </div>
                          <div className="mt-2 text-center text-xs font-bold" style={{ color: 'var(--accent)' }}>{result.comparison.alt_data.decision}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button onClick={handleCloseModal} className="btn-secondary flex-1 text-sm py-2 cursor-pointer">
                        Done
                      </button>
                      <Link to={`/profile/${result.profile_id}`} className="btn-primary flex-1 text-sm py-2 text-center flex items-center justify-center gap-1.5">
                        View Full Profile <ArrowRight size={14} />
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      <ProfileFormModal
        isOpen={isEditFormOpen}
        onClose={handleCloseEditForm}
        profile={selectedProfile}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0d0d14] border border-[var(--border)] rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Delete Profile</h3>
                <button onClick={() => setDeleteId(null)} className="p-1 rounded-lg hover:bg-white/5 transition-colors" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
              </div>
              <p className="text-sm text-[var(--text-muted)] mb-6">This action cannot be undone. The profile and all associated scores will be permanently removed.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1 text-sm cursor-pointer">Cancel</button>
                <button onClick={() => deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}
                  className="flex-1 text-sm bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-medium rounded-xl py-2.5 transition-colors cursor-pointer">
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}

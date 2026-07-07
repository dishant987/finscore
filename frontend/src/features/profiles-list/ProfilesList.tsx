import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import AppLayout from "@/components/layout/AppLayout";
import DataTable, { type Column } from "@/components/ui/DataTable";
import { listProfiles, listIndustries, deleteProfile } from "@/api/msme";
import type { MSMEProfile } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Trash2, Eye, Pencil, X, Filter } from "lucide-react";
import { PageSkeleton } from "@/components/ui/Skeleton";
import ProfileFormModal from "./ProfileFormModal";

export default function ProfilesList() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [industry, setIndustry] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<MSMEProfile | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["profiles", page, pageSize, search, industry, sortBy, sortDir],
    queryFn: () => listProfiles({ page, page_size: pageSize, search, industry, sort_by: sortBy, sort_dir: sortDir }),
  });

  const { data: industries } = useQuery({
    queryKey: ["industries"],
    queryFn: listIndustries,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProfile,
    onSuccess: () => {
      toast.success("Profile deleted");
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setDeleteId(null);
    },
    onError: () => toast.error("Failed to delete"),
  });

  const handleSort = (key: string) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(key); setSortDir("asc"); }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleOpenForm = (profile: MSMEProfile | null) => {
    setSelectedProfile(profile);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setSelectedProfile(null);
    setIsFormOpen(false);
  };

  const formatCurrency = (v: number) => {
    if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
    return `₹${v}`;
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
    { key: "year_established", label: "Est.", sortable: true, className: "text-center", render: (item) => <span style={{ color: 'var(--text-muted)' }}>{item.year_established}</span> },
    { key: "employee_count", label: "Team", sortable: true, className: "text-center", render: (item) => <span style={{ color: 'var(--text-secondary)' }}>{item.employee_count}</span> },
    { key: "annual_revenue", label: "Revenue", sortable: true, render: (item) => <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(item.annual_revenue)}</span> },
    { key: "net_profit", label: "Profit", sortable: true, render: (item) => <span style={{ color: item.net_profit >= 0 ? 'var(--accent)' : 'var(--danger)' }}>{formatCurrency(item.net_profit)}</span> },
    { key: "digital_adoption_score", label: "Digital", sortable: true, className: "text-center", render: (item) => (
      <div className="flex items-center gap-2 justify-center">
        <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div className="h-full rounded-full" style={{ width: `${item.digital_adoption_score}%`, background: item.digital_adoption_score >= 60 ? 'var(--accent)' : item.digital_adoption_score >= 30 ? '#f59e0b' : '#ef4444' }} />
        </div>
        <span className="text-xs w-7 text-right" style={{ color: 'var(--text-muted)' }}>{item.digital_adoption_score}</span>
      </div>
    )},
    { key: "customer_retention_rate", label: "Retention", sortable: true, className: "text-center", render: (item) => <span style={{ color: 'var(--text-secondary)' }}>{item.customer_retention_rate}%</span> },
  ];

  if (isLoading) return <AppLayout><PageSkeleton cards={4} /></AppLayout>;

  if (isError) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-[#0d0d14] border border-[var(--border)] rounded-2xl">
          <div className="text-red-500 mb-4 font-semibold text-lg">Failed to load profiles</div>
          <p className="text-sm text-[var(--text-muted)] max-w-md mb-6">
            {error instanceof Error ? error.message : "An unexpected error occurred. Please check your connection and try again."}
          </p>
          <button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ["profiles"] })} 
            className="btn-primary text-sm py-2.5 px-6 rounded-xl cursor-pointer"
          >
            Retry
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">MSME Profiles</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">{data?.total ?? 0} total profiles</p>
          </div>
          <button onClick={() => handleOpenForm(null)} className="btn-primary text-sm py-2 px-4 cursor-pointer">
            <Plus size={15} /> New Profile
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
            <select value={industry} onChange={(e) => { setIndustry(e.target.value); setPage(1); }}
              className="input-field min-w-[150px]">
              <option value="">All Industries</option>
              {industries?.map((ind) => (
                <option key={ind.industry} value={ind.industry}>{ind.industry} ({ind.count})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          total={data?.total ?? 0}
          page={data?.page ?? 1}
          pageSize={data?.page_size ?? 20}
          totalPages={data?.total_pages ?? 1}
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
              <button onClick={() => handleOpenForm(item)} className="p-2 rounded-lg transition-colors cursor-pointer" style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
                <Pencil size={15} />
              </button>
              <button onClick={() => setDeleteId(item.id)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
                <Trash2 size={15} />
              </button>
            </div>
          )}
        />
      </motion.div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0d0d14] border border-[var(--border)] rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Delete Profile</h3>
                <button onClick={() => setDeleteId(null)} className="p-1 rounded-lg" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
              </div>
              <p className="text-sm text-[var(--text-muted)] mb-6">This action cannot be undone. The profile and all associated scores will be permanently removed.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1 text-sm">Cancel</button>
                <button onClick={() => deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}
                  className="flex-1 text-sm bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-medium rounded-xl py-2.5 transition-colors">
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Form Modal (Create / Edit) */}
      <ProfileFormModal
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        profile={selectedProfile}
      />
    </AppLayout>
  );
}

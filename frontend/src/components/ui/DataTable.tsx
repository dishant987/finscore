import { type ReactNode } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  sortBy: string;
  sortDir: "asc" | "desc";
  onPageChange: (page: number) => void;
  onSort: (key: string) => void;
  onPageSizeChange?: (size: number) => void;
  actions?: (item: T) => ReactNode;
  emptyMessage?: string;
}

export default function DataTable<T extends { id: string }>({
  columns, data, total, page, pageSize, totalPages,
  sortBy, sortDir, onPageChange, onSort, onPageSizeChange,
  actions, emptyMessage = "No records found",
}: DataTableProps<T>) {
  return (
    <div className="overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {columns.map((col) => (
                <th key={col.key}
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${col.sortable ? "cursor-pointer select-none" : ""} ${col.className || ""}`}
                  style={{ color: 'var(--text-muted)', background: 'var(--surface)' }}
                  onClick={col.sortable ? () => onSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.label}
                    {col.sortable && (
                      sortBy === col.key ? (
                        sortDir === "asc" ? <ChevronUp size={13} style={{ color: 'var(--accent)' }} /> : <ChevronDown size={13} style={{ color: 'var(--accent)' }} />
                      ) : <ChevronsUpDown size={13} style={{ opacity: 0.3 }} />
                    )}
                  </span>
                </th>
              ))}
              {actions && <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)', background: 'var(--surface)' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : data.map((item) => (
              <tr key={item.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 ${col.className || ""}`} style={{ color: 'var(--text-secondary)' }}>
                    {col.render ? col.render(item) : (item as any)[col.key]}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3 text-right">
                    {actions(item)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {total} total · Page {page} of {totalPages}
          </span>
          {onPageSizeChange && (
            <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="text-xs rounded-lg px-2 py-1 outline-none" style={{ background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              {[10, 20, 50, 100].map((s) => <option key={s} value={s}>{s} / page</option>)}
            </select>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
            className="p-1.5 rounded-lg transition-colors disabled:opacity-30" style={{ color: 'var(--text-muted)' }}>
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const start = Math.max(1, Math.min(page - 2, totalPages - 4));
            const p = start + i;
            if (p > totalPages) return null;
            return (
              <button key={p} onClick={() => onPageChange(p)}
                className="w-8 h-8 rounded-lg text-xs font-medium transition-all"
                style={p === page ? { background: 'var(--accent)', color: '#fff' } : { color: 'var(--text-muted)' }}>
                {p}
              </button>
            );
          })}
          <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
            className="p-1.5 rounded-lg transition-colors disabled:opacity-30" style={{ color: 'var(--text-muted)' }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

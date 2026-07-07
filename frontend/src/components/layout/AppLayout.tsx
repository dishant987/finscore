import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, type ReactNode } from "react";
import { useUIStore } from "@/store/ui";
import { useAuthStore } from "@/store/auth";
import {
  LayoutDashboard, PieChart, Plus, Zap, LogOut, Menu, X, ToggleLeft, ToggleRight, Shield, Table2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/profiles", label: "Profiles", icon: Table2 },
  { to: "/portfolio", label: "Portfolio", icon: PieChart },
  { to: "/onboarding", label: "New Profile", icon: Plus },
  { to: "/ntc-onboard", label: "NTC Onboarding", icon: Zap },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const liveDemoEnabled = useUIStore((s) => s.liveDemoEnabled);
  const toggleLiveDemo = useUIStore((s) => s.toggleLiveDemo);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            className="fixed inset-y-0 left-0 z-50 w-64 bg-[#0c0c12] border-r border-[var(--border)] lg:relative lg:translate-x-0 lg:block flex flex-col shadow-2xl"
          >
            <div className="lg:hidden fixed inset-0 bg-black/50 -z-10" onClick={toggleSidebar} />

            <div className="flex items-center justify-between px-5 h-16 border-b border-[var(--border)] bg-[#0d0d15]/50 backdrop-blur-sm">
              <Link to="/" className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white transition-all hover:scale-105" style={{ background: 'linear-gradient(135deg, var(--accent), #2dd4bf)' }}>
                  <Shield size={15} />
                </div>
                <span className="font-extrabold text-base tracking-tight text-white">FinScore</span>
              </Link>
              <button onClick={toggleSidebar} className="lg:hidden text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                <X size={16} />
              </button>
            </div>

            <nav className="flex-1 px-3 py-5 space-y-1 bg-[#0c0c12]">
              {navItems.map((item) => {
                const active = location.pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => { if (window.innerWidth < 1024) toggleSidebar(); }}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border border-transparent",
                      active
                        ? "text-white bg-[rgba(20,184,166,0.08)] border-[rgba(20,184,166,0.15)] shadow-[0_0_12px_rgba(20,184,166,0.03)]"
                        : "text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-hover)]",
                    )}
                  >
                    <item.icon size={15} className={cn(active ? "text-[var(--accent)]" : "text-[var(--text-muted)] group-hover:text-white")} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-[var(--border)] px-3 py-4 space-y-3 bg-[#0d0d14]/70">
              <button
                onClick={toggleLiveDemo}
                className={cn(
                  "flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs font-bold border border-transparent transition-all duration-200",
                  liveDemoEnabled
                    ? "text-[var(--accent)] bg-[rgba(20,184,166,0.04)] border-[rgba(20,184,166,0.1)]"
                    : "text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-hover)]",
                )}
              >
                <span>Live Demo Mode</span>
                {liveDemoEnabled ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                    <ToggleRight size={15} />
                  </span>
                ) : (
                  <ToggleLeft size={15} />
                )}
              </button>

              <Link
                to="/user/profile"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:border-[var(--border)] hover:bg-[var(--surface-hover)] transition-all duration-200 cursor-pointer text-left"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0" style={{ background: 'linear-gradient(135deg, var(--accent), #2dd4bf)' }}>
                  {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">{user?.full_name}</p>
                  <p className="text-[10px] text-[var(--text-muted)] truncate">{user?.email}</p>
                </div>
              </Link>

              <button
                onClick={() => setShowLogoutModal(true)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/5 hover:border-red-500/10 border border-transparent transition-all duration-200"
              >
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLogoutModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60"
          >
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0d0d14] border border-[var(--border)] rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Sign Out</h3>
              <p className="text-sm text-[var(--text-muted)] mb-6">Are you sure you want to sign out?</p>
              <div className="flex gap-3">
                <button onClick={() => setShowLogoutModal(false)} className="btn-secondary flex-1 text-sm">Cancel</button>
                <button onClick={handleLogout} className="flex-1 text-sm bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl py-2.5 transition-colors">Sign Out</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-14 border-b border-[var(--border)] flex items-center px-6 sticky top-0 z-40 bg-[#0a0a0f]">
          <div className="flex items-center gap-3 flex-1">
            <button onClick={toggleSidebar} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1">
              {sidebarOpen ? <Menu size={17} /> : <Menu size={17} />}
            </button>
            <Link to="/" className="flex items-center gap-2 text-[var(--accent)] font-bold text-base lg:hidden">
              <Shield size={16} /> FinScore
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {liveDemoEnabled && (
              <span className="flex items-center gap-1.5 text-xs text-[var(--accent)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                Live
              </span>
            )}
          </div>
        </header>
        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">{children}</main>
      </div>
    </div>
  );
}

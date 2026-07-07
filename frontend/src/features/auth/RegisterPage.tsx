import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { register } from "@/api/auth";
import { getApiError } from "@/lib/utils";
import { toast } from "sonner";
import { Mail, Lock, User, Eye, EyeOff, Shield, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function RegisterPage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const setAuth = useAuthStore((s) => s.setAuth);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) navigate("/dashboard", { replace: true });
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await register({ email, password, full_name: name });
      setAuth(res.access_token, res.user);
      toast.success("Account created!");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f' }}>
      <header className="h-14 border-b flex items-center justify-between px-6" style={{ borderColor: 'var(--border)' }}>
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
            <Shield size={14} className="text-white" />
          </div>
          <span className="font-bold text-base text-[var(--text-primary)]">FinScore</span>
        </Link>
        <Link to="/login" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors font-medium">Sign In</Link>
      </header>

      <div className="flex items-center justify-center p-4 pt-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Create account</h1>
            <p className="text-sm text-[var(--text-muted)]">Start assessing MSME credit in minutes</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px' }}>
            <div className="space-y-1.5">
              <label className="text-sm text-[var(--text-secondary)] font-medium">Full Name</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required className="input-field pl-10" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-[var(--text-secondary)] font-medium">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="input-field pl-10" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-[var(--text-secondary)] font-medium">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="input-field pl-10 pr-10" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Creating..." : "Create Account"} <ArrowRight size={14} />
            </button>

            <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              Already have an account?{" "}
              <Link to="/login" className="font-medium" style={{ color: 'var(--accent)' }}>Sign In</Link>
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

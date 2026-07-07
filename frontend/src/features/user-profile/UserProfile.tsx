import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Card from "@/components/ui/Card";
import { useAuthStore } from "@/store/auth";
import { updateProfile, updatePassword } from "@/api/auth";
import { getApiError } from "@/lib/utils";
import { toast } from "sonner";
import { User, Lock, Save, ShieldCheck, Mail, KeyRound, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function UserProfile() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  // Profile Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileErrors, setProfileErrors] = useState<{ fullName?: string; email?: string }>({});

  // Sync state when user object loads
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Front-end Validation
    const errors: { fullName?: string; email?: string } = {};
    if (!fullName.trim()) {
      errors.fullName = "Full name cannot be empty";
    } else if (fullName.trim().length > 100) {
      errors.fullName = "Full name must be 100 characters or less";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      errors.email = "Email address cannot be empty";
    } else if (!emailRegex.test(email.trim())) {
      errors.email = "Please enter a valid email address";
    }

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      toast.error("Please correct the errors in the profile form");
      return;
    }

    setProfileErrors({});
    setIsSavingProfile(true);
    try {
      const updatedUser = await updateProfile({ full_name: fullName.trim(), email: email.trim() });
      setUser(updatedUser);
      toast.success("Profile details saved successfully!");
    } catch (err: any) {
      toast.error(getApiError(err));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Front-end Validation
    const errors: { currentPassword?: string; newPassword?: string; confirmPassword?: string } = {};
    if (!currentPassword) {
      errors.currentPassword = "Current password is required";
    }
    
    if (!newPassword) {
      errors.newPassword = "New password is required";
    } else if (newPassword.length < 6) {
      errors.newPassword = "New password must be at least 6 characters";
    } else if (newPassword.length > 72) {
      errors.newPassword = "New password must be 72 characters or less";
    } else if (newPassword === currentPassword) {
      errors.newPassword = "New password cannot be the same as current password";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Confirmation password is required";
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      toast.error("Please correct the errors in the password form");
      return;
    }

    setPasswordErrors({});
    setIsUpdatingPassword(true);
    try {
      await updatePassword({ current_password: currentPassword, new_password: newPassword });
      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(getApiError(err));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="text-[var(--accent)]" size={22} />
              Account Settings
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Manage your personal credentials, contact info, and security preferences.
            </p>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Edit Profile Form */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-6 h-full flex flex-col justify-between">
              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <div className="flex items-center gap-2.5 pb-2.5 border-b border-[var(--border)]">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--accent-soft)] text-[var(--accent)]">
                    <User size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">Profile Information</h2>
                    <p className="text-[10px] text-[var(--text-muted)]">Update your display name and email address</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Full Name</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          if (profileErrors.fullName) {
                            setProfileErrors((prev) => ({ ...prev, fullName: undefined }));
                          }
                        }}
                        className={cn(
                          "w-full bg-[var(--surface-hover)] border rounded-xl py-2.5 pr-3 pl-9 text-xs text-white focus:outline-none transition-all font-medium",
                          profileErrors.fullName ? "border-red-500/50 focus:border-red-500" : "border-[var(--border)] focus:border-[var(--accent)]"
                        )}
                        placeholder="John Doe"
                      />
                      <User className="absolute left-3 top-3 text-[var(--text-muted)]" size={13} />
                    </div>
                    {profileErrors.fullName && (
                      <p className="text-[10px] text-red-400 mt-1.5 flex items-center gap-1 font-medium">
                        <AlertCircle size={10} />
                        {profileErrors.fullName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Email Address</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (profileErrors.email) {
                            setProfileErrors((prev) => ({ ...prev, email: undefined }));
                          }
                        }}
                        className={cn(
                          "w-full bg-[var(--surface-hover)] border rounded-xl py-2.5 pr-3 pl-9 text-xs text-white focus:outline-none transition-all font-medium",
                          profileErrors.email ? "border-red-500/50 focus:border-red-500" : "border-[var(--border)] focus:border-[var(--accent)]"
                        )}
                        placeholder="john@example.com"
                      />
                      <Mail className="absolute left-3 top-3 text-[var(--text-muted)]" size={13} />
                    </div>
                    {profileErrors.email && (
                      <p className="text-[10px] text-red-400 mt-1.5 flex items-center gap-1 font-medium">
                        <AlertCircle size={10} />
                        {profileErrors.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="btn-primary text-xs py-2.5 px-4 font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-[rgba(20,184,166,0.15)] cursor-pointer"
                  >
                    <Save size={13} />
                    {isSavingProfile ? "Saving..." : "Save Profile Details"}
                  </button>
                </div>
              </form>
            </Card>
          </motion.div>

          {/* Update Password Form */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            <Card className="p-6 h-full flex flex-col justify-between">
              <form onSubmit={handleUpdatePassword} className="space-y-5">
                <div className="flex items-center gap-2.5 pb-2.5 border-b border-[var(--border)]">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Lock size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">Security Settings</h2>
                    <p className="text-[10px] text-[var(--text-muted)]">Change your account login credentials</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Current Password</label>
                    <div className="relative">
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => {
                          setCurrentPassword(e.target.value);
                          if (passwordErrors.currentPassword) {
                            setPasswordErrors((prev) => ({ ...prev, currentPassword: undefined }));
                          }
                        }}
                        className={cn(
                          "w-full bg-[var(--surface-hover)] border rounded-xl py-2.5 pr-3 pl-9 text-xs text-white focus:outline-none transition-all font-medium",
                          passwordErrors.currentPassword ? "border-red-500/50 focus:border-red-500" : "border-[var(--border)] focus:border-[var(--accent)]"
                        )}
                        placeholder="••••••••"
                      />
                      <KeyRound className="absolute left-3 top-3 text-[var(--text-muted)]" size={13} />
                    </div>
                    {passwordErrors.currentPassword && (
                      <p className="text-[10px] text-red-400 mt-1.5 flex items-center gap-1 font-medium">
                        <AlertCircle size={10} />
                        {passwordErrors.currentPassword}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">New Password</label>
                      <div className="relative">
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => {
                            setNewPassword(e.target.value);
                            if (passwordErrors.newPassword) {
                              setPasswordErrors((prev) => ({ ...prev, newPassword: undefined }));
                            }
                          }}
                          className={cn(
                            "w-full bg-[var(--surface-hover)] border rounded-xl py-2.5 pr-3 pl-9 text-xs text-white focus:outline-none transition-all font-medium",
                            passwordErrors.newPassword ? "border-red-500/50 focus:border-red-500" : "border-[var(--border)] focus:border-[var(--accent)]"
                        )}
                          placeholder="••••••••"
                        />
                        <Lock className="absolute left-3 top-3 text-[var(--text-muted)]" size={13} />
                      </div>
                      {passwordErrors.newPassword && (
                        <p className="text-[10px] text-red-400 mt-1.5 flex items-center gap-1 font-medium">
                          <AlertCircle size={10} />
                          {passwordErrors.newPassword}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Confirm Password</label>
                      <div className="relative">
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            if (passwordErrors.confirmPassword) {
                              setPasswordErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                            }
                          }}
                          className={cn(
                            "w-full bg-[var(--surface-hover)] border rounded-xl py-2.5 pr-3 pl-9 text-xs text-white focus:outline-none transition-all font-medium",
                            passwordErrors.confirmPassword ? "border-red-500/50 focus:border-red-500" : "border-[var(--border)] focus:border-[var(--accent)]"
                          )}
                          placeholder="••••••••"
                        />
                        <Lock className="absolute left-3 top-3 text-[var(--text-muted)]" size={13} />
                      </div>
                      {passwordErrors.confirmPassword && (
                        <p className="text-[10px] text-red-400 mt-1.5 flex items-center gap-1 font-medium">
                          <AlertCircle size={10} />
                          {passwordErrors.confirmPassword}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="btn-primary text-xs py-2.5 px-4 font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-[rgba(20,184,166,0.15)] cursor-pointer"
                  >
                    <Save size={13} />
                    {isUpdatingPassword ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            </Card>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}

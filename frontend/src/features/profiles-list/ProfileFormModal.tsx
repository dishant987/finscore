import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createProfile, updateProfile } from "@/api/msme";
import type { MSMEProfile } from "@/types";
import { getApiError, getFieldErrors } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  X, Save, Building2, Briefcase, Factory, Calendar, Users, DollarSign, Wallet,
  TrendingUp, Activity, BarChart3
} from "lucide-react";

const schema = z.object({
  business_name: z.string().min(1, "Business name is required"),
  business_type: z.string().min(1, "Business type is required"),
  industry: z.string().min(1, "Industry is required"),
  year_established: z.coerce.number().int().min(1900, "Must be 1900–2030").max(2030, "Must be 1900–2030"),
  employee_count: z.coerce.number().int().min(1, "At least 1 employee"),
  annual_revenue: z.coerce.number().min(0, "Cannot be negative"),
  net_profit: z.coerce.number(),
  total_assets: z.coerce.number().min(0, "Cannot be negative"),
  total_liabilities: z.coerce.number().min(0, "Cannot be negative"),
  monthly_transaction_volume: z.coerce.number().int().min(0, "Cannot be negative"),
  avg_transaction_value: z.coerce.number().min(0, "Cannot be negative"),
  customer_retention_rate: z.coerce.number().min(0, "Min 0%").max(100, "Max 100%"),
  digital_adoption_score: z.coerce.number().min(0, "Min 0").max(100, "Max 100"),
});

type FormData = z.infer<typeof schema>;

const FIELD_META: Record<keyof FormData, { label: string; icon: any; placeholder: string; type?: string; hint?: string }> = {
  business_name: { label: "Business Name", icon: Building2, placeholder: "e.g. Krishna Enterprises" },
  business_type: { label: "Business Type", icon: Briefcase, placeholder: "e.g. Sole Proprietorship" },
  industry: { label: "Industry", icon: Factory, placeholder: "e.g. Retail" },
  year_established: { label: "Year Established", icon: Calendar, placeholder: "e.g. 2018", type: "number" },
  employee_count: { label: "Employee Count", icon: Users, placeholder: "e.g. 12", type: "number" },
  annual_revenue: { label: "Annual Revenue (₹)", icon: DollarSign, placeholder: "e.g. 5000000", type: "number" },
  net_profit: { label: "Net Profit (₹)", icon: TrendingUp, placeholder: "e.g. 800000", type: "number" },
  total_assets: { label: "Total Assets (₹)", icon: Wallet, placeholder: "e.g. 3000000", type: "number" },
  total_liabilities: { label: "Total Liabilities (₹)", icon: Wallet, placeholder: "e.g. 1200000", type: "number" },
  monthly_transaction_volume: { label: "Monthly Transactions", icon: Activity, placeholder: "e.g. 350", type: "number" },
  avg_transaction_value: { label: "Avg Transaction Value (₹)", icon: BarChart3, placeholder: "e.g. 4500", type: "number" },
  customer_retention_rate: { label: "Retention Rate (%)", icon: TrendingUp, placeholder: "0–100", type: "number", hint: "0–100" },
  digital_adoption_score: { label: "Digital Score", icon: Activity, placeholder: "0–100", type: "number", hint: "0–100" },
};

interface ProfileFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: MSMEProfile | null;
}

export default function ProfileFormModal({ isOpen, onClose, profile }: ProfileFormModalProps) {
  const queryClient = useQueryClient();
  const isEdit = !!profile;

  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
  });

  useEffect(() => {
    if (isOpen) {
      if (profile) {
        reset({
          business_name: profile.business_name || "",
          business_type: profile.business_type || "",
          industry: profile.industry || "",
          year_established: profile.year_established || 2020,
          employee_count: profile.employee_count || 1,
          annual_revenue: profile.annual_revenue || 0,
          net_profit: profile.net_profit || 0,
          total_assets: profile.total_assets || 0,
          total_liabilities: profile.total_liabilities || 0,
          monthly_transaction_volume: profile.monthly_transaction_volume || 0,
          avg_transaction_value: profile.avg_transaction_value || 0,
          customer_retention_rate: profile.customer_retention_rate || 0,
          digital_adoption_score: profile.digital_adoption_score || 0,
        });
      } else {
        reset({
          business_name: "",
          business_type: "",
          industry: "",
          year_established: new Date().getFullYear(),
          employee_count: 5,
          annual_revenue: 0,
          net_profit: 0,
          total_assets: 0,
          total_liabilities: 0,
          monthly_transaction_volume: 0,
          avg_transaction_value: 0,
          customer_retention_rate: 60,
          digital_adoption_score: 50,
        });
      }
    }
  }, [isOpen, profile, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit && profile) {
        await updateProfile(profile.id, data);
        toast.success("Profile updated successfully!");
        queryClient.invalidateQueries({ queryKey: ["profile", profile.id] });
      } else {
        await createProfile(data);
        toast.success("Profile created successfully!");
      }
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["ntc-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      onClose();
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        for (const [field, msg] of Object.entries(fieldErrors)) {
          setError(field as keyof FormData, { message: msg });
        }
      } else {
        toast.error(getApiError(err));
      }
    }
  };

  if (!isOpen) return null;

  const renderField = (key: keyof FormData) => {
    const meta = FIELD_META[key];
    const Icon = meta.icon;
    const hasError = !!errors[key];
    return (
      <div key={key} className="space-y-1.5">
        <label className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 font-medium">
          <Icon size={13} style={{ color: hasError ? 'var(--danger)' : 'var(--accent)' }} />
          {meta.label}
          {meta.hint && <span className="text-[10px] text-[var(--text-muted)] font-normal ml-auto">{meta.hint}</span>}
        </label>
        <input
          {...register(key)}
          type={meta.type}
          placeholder={meta.placeholder}
          className="input-field py-2 px-3 text-xs"
        />
        {errors[key] && <p className="text-[10px]" style={{ color: 'var(--danger)' }}>{errors[key]?.message}</p>}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#0d0d14] border border-[var(--border)] rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)] shrink-0">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              {isEdit ? "Edit MSME Profile" : "Create New MSME Profile"}
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              {isEdit ? "Modify MSME details and re-evaluate overall health scores." : "Enter business metrics to calculate new risk scores."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Basic Information */}
          <div>
            <h4 className="text-xs font-bold text-[var(--accent)] uppercase tracking-wider mb-3">Basic Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">{renderField("business_name")}</div>
              {renderField("business_type")}
              {renderField("industry")}
              {renderField("year_established")}
              {renderField("employee_count")}
            </div>
          </div>

          {/* Section 2: Financial Metrics */}
          <div className="border-t border-[var(--border)] pt-5">
            <h4 className="text-xs font-bold text-[var(--accent)] uppercase tracking-wider mb-3">Financial Performance (₹)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {renderField("annual_revenue")}
              {renderField("net_profit")}
              {renderField("total_assets")}
              {renderField("total_liabilities")}
            </div>
          </div>

          {/* Section 3: Alternate Data / Operational Metrics */}
          <div className="border-t border-[var(--border)] pt-5">
            <h4 className="text-xs font-bold text-[var(--accent)] uppercase tracking-wider mb-3">Alt-Data & Operations</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {renderField("monthly_transaction_volume")}
              {renderField("avg_transaction_value")}
              {renderField("customer_retention_rate")}
              {renderField("digital_adoption_score")}
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 p-5 border-t border-[var(--border)] shrink-0 bg-[#0d0d14]/50">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary py-2 px-4 text-xs"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="btn-primary py-2 px-5 text-xs flex items-center gap-1.5"
          >
            <Save size={13} />
            {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Create Profile"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

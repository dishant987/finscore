import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import AppLayout from "@/components/layout/AppLayout";
import Card from "@/components/ui/Card";
import { createProfile, getProfile, updateProfile } from "@/api/msme";
import { getApiError, getFieldErrors } from "@/lib/utils";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Building2, Briefcase, Factory, Calendar, Users, DollarSign, Wallet, TrendingUp, Activity, BarChart3 } from "lucide-react";
import { PageSkeleton } from "@/components/ui/Skeleton";

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

export default function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const isEdit = !!editId;

  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", editId],
    queryFn: () => getProfile(editId!),
    enabled: isEdit,
  });

  useEffect(() => {
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
    }
  }, [profile, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit && editId) {
        await updateProfile(editId, data);
        toast.success("Profile updated!");
        queryClient.invalidateQueries({ queryKey: ["profiles"] });
        queryClient.invalidateQueries({ queryKey: ["profile", editId] });
        queryClient.invalidateQueries({ queryKey: ["score", editId] });
        navigate(`/profile/${editId}`);
      } else {
        const newProfile = await createProfile(data);
        toast.success("Profile created!");
        queryClient.invalidateQueries({ queryKey: ["profiles"] });
        navigate(`/profile/${newProfile.id}`);
      }
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

  if (isEdit && isLoading) {
    return (
      <AppLayout>
        <PageSkeleton cards={2} />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Link to="/profiles" className="inline-flex items-center gap-2 text-sm mb-6 transition-colors" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={16} /> Back to Profiles
        </Link>

        <div className="mb-8">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            {isEdit ? "Edit MSME Profile" : "New MSME Profile"}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {isEdit ? "Update business details to recalculate the health score" : "Enter business details to generate a health score"}
          </p>
        </div>

        <Card className="p-6 md:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {(Object.keys(schema.shape) as Array<keyof FormData>).map((key) => {
                const meta = FIELD_META[key];
                const Icon = meta.icon;
                const hasError = !!errors[key];
                return (
                  <div key={key} className="space-y-1.5">
                    <label className="text-sm text-[var(--text-secondary)] flex items-center gap-1.5 font-medium">
                      <Icon size={14} style={{ color: hasError ? 'var(--danger)' : 'var(--accent)' }} />
                      {meta.label}
                      {meta.hint && <span className="text-xs text-[var(--text-muted)] font-normal ml-auto">{meta.hint}</span>}
                    </label>
                    <input
                      {...register(key)}
                      type={meta.type}
                      placeholder={meta.placeholder}
                      className="input-field"
                    />
                    {errors[key] && <p className="text-xs" style={{ color: 'var(--danger)' }}>{errors[key]?.message}</p>}
                  </div>
                );
              })}
            </div>

            <div className="pt-2">
              <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
                <Save size={15} /> {isSubmitting ? "Saving..." : isEdit ? "Save Profile Changes" : "Create Profile & Score"}
              </button>
            </div>
          </form>
        </Card>
      </motion.div>
    </AppLayout>
  );
}

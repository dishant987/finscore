import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { PageSkeleton } from "@/components/ui/Skeleton";
import type { ReactNode } from "react";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const isLoading = useAuthStore((s) => s.isLoading);
  const location = useLocation();

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
        <div className="w-full max-w-4xl">
          <PageSkeleton cards={3} />
        </div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

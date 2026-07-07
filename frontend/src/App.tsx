import { useEffect } from "react";
import { AppRoutes } from "@/routes";
import { useAuthStore } from "@/store/auth";

export default function App() {
  const initAuth = useAuthStore((s) => s.initAuth);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return <AppRoutes />;
}

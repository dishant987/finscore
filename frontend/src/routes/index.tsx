import { Routes, Route } from "react-router-dom";
import LandingPage from "@/features/landing/LandingPage";
import LoginPage from "@/features/auth/LoginPage";
import RegisterPage from "@/features/auth/RegisterPage";
import Dashboard from "@/features/dashboard/Dashboard";
import ProfilesList from "@/features/profiles-list/ProfilesList";
import Onboarding from "@/features/onboarding/Onboarding";
import MSMEProfile from "@/features/msme-profile/MSMEProfile";
import ScoreDetail from "@/features/score-detail/ScoreDetail";
import NTCOboarding from "@/features/ntc-onboarding/NTCOboarding";
import Portfolio from "@/features/portfolio/Portfolio";
import UserProfile from "@/features/user-profile/UserProfile";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/ntc-onboard" element={<NTCOboarding />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/profiles" element={<ProtectedRoute><ProfilesList /></ProtectedRoute>} />
      <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
      <Route path="/profile/:id" element={<ProtectedRoute><MSMEProfile /></ProtectedRoute>} />
      <Route path="/score/:profileId" element={<ProtectedRoute><ScoreDetail /></ProtectedRoute>} />
      <Route path="/user/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
    </Routes>
  );
}

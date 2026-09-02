import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center text-white select-none">
        <div className="text-2xl font-black tracking-tight mb-6">
          Miltomy<span className="text-[#c8ff00]">.</span>
        </div>
        {/* Sleek neon lime spinner */}
        <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#222222] border-t-[#c8ff00] animate-spin mb-4" />
        <span className="font-bold text-[10px] tracking-[0.25em] text-[#888888] uppercase">
          Initializing Workspace...
        </span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

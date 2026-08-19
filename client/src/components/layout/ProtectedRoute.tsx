import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080f1f] flex flex-col items-center justify-center text-teal select-none">
        {/* Glowing loader */}
        <div className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-teal/20 border-t-teal animate-spin mb-4" />
        <span className="animate-pulse font-bold text-[10px] tracking-[0.2em] text-teal uppercase">
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

import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { FolderKanban, LayoutDashboard, Shield, CheckSquare, Mail } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { NotificationInbox } from "../ui/NotificationInbox";
import { PageTransition } from "./PageTransition";

export function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const isFullScreenPage = location.pathname.endsWith("/kanban") || location.pathname.startsWith("/tasks");

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/projects", label: "Projects", icon: FolderKanban },
    { to: "/tasks", label: "My Tasks", icon: CheckSquare },
  ];

  const userInitials = (user?.name || "User")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#080808] text-[#f0ede6]">
      {/* Floating Modern Capsule Sidebar */}
      <aside className="fixed bottom-4 left-4 top-4 z-50 hidden w-20 flex-col items-center justify-between border border-[#222222] bg-[#111111]/90 backdrop-blur-md py-6 shadow-xl shadow-black/50 rounded-[24px] lg:flex">
        {/* Top Logo Mark */}
        <NavLink
          to="/dashboard"
          title="Miltomy Workspace"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#181818] border border-[#262626] text-[#c8ff00] hover:border-[#c8ff00] transition-colors shadow-inner select-none cursor-pointer"
        >
          <span className="text-xl font-black tracking-tight leading-none text-center flex items-center justify-center">
            M
          </span>
        </NavLink>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={item.label}
                className={({ isActive }) =>
                  `flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 ${
                    isActive
                      ? "bg-[#c8ff00] text-[#080808] shadow-lg shadow-[#c8ff00]/25"
                      : "text-[#888888] hover:bg-[#181818] hover:text-[#f0ede6]"
                  }`
                }
              >
                <Icon size={20} />
              </NavLink>
            );
          })}

          {(user?.role === "OWNER" || user?.role === "PROJECT_MANAGER") && (
            <NavLink
              to="/admin/invitations"
              title="Team Invitations"
              className={({ isActive }) =>
                `flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 ${
                  isActive
                    ? "bg-[#c8ff00] text-[#080808] shadow-lg shadow-[#c8ff00]/25"
                    : "text-[#888888] hover:bg-[#181818] hover:text-[#f0ede6]"
                }`
              }
            >
              <Mail size={20} />
            </NavLink>
          )}
        </nav>

        {/* Bottom Actions */}
        <div className="flex flex-col gap-3 pb-2 items-center">
          {user?.role === "OWNER" && (
            <NavLink
              to="/admin"
              title="Agency Admin Hub"
              className={({ isActive }) =>
                `flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 ${
                  isActive
                    ? "bg-[#c8ff00] text-[#080808] shadow-lg shadow-[#c8ff00]/25"
                    : "text-[#888888] hover:bg-[#181818] hover:text-[#f0ede6]"
                }`
              }
            >
              <Shield size={20} />
            </NavLink>
          )}

          <NotificationInbox />

          <NavLink
            to="/profile"
            title="My Profile"
            className={({ isActive }) =>
              `flex h-11 w-11 items-center justify-center rounded-full overflow-hidden transition-all duration-200 border ${
                isActive ? "border-[#c8ff00] shadow-lg shadow-[#c8ff00]/20" : "border-[#222222] hover:border-[#c8ff00]/50"
              }`
            }
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-black bg-[#181818] text-[#c8ff00]">
                {userInitials}
              </div>
            )}
          </NavLink>
        </div>
      </aside>

      {/* Main Layout Area */}
      <div className={isFullScreenPage ? "" : "lg:pl-24"}>
        <main
          className={
            isFullScreenPage
              ? "h-screen w-full overflow-y-auto overflow-x-hidden"
              : "mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
          }
        >
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  );
}

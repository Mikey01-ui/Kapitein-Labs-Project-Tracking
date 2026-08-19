import { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { FolderKanban, LayoutDashboard, Shield, Timer, UserRound, BarChart3, PlusCircle, CheckSquare, Sun, Moon, Receipt } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../services/apiClient";
import { NotificationInbox } from "../ui/NotificationInbox";
import { PageTransition } from "./PageTransition";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/tasks", label: "My Tasks", icon: CheckSquare },
  { to: "/my-hours", label: "My Hours", icon: Timer },
  { to: "/log-hours", label: "Log Hours", icon: PlusCircle },
  { to: "/expenses", label: "Expenses", icon: Receipt }
];

export function AppLayout() {
  const { user, setUser } = useAuth();
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const location = useLocation();
  const isFullScreenPage = location.pathname.endsWith("/kanban") || location.pathname.startsWith("/tasks");

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "dark";
  });

  // Draggable theme button position state
  const [position, setPosition] = useState(() => {
    try {
      const stored = localStorage.getItem("theme_toggle_position");
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return { x: 0, y: 0 };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragDistance = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragDistance.current = 0;
    dragStart.current = { x: e.clientX, y: e.clientY };
    dragOffset.current = { ...position };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    dragDistance.current = 0;
    dragStart.current = { x: touch.clientX, y: touch.clientY };
    dragOffset.current = { ...position };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      dragDistance.current = Math.sqrt(dx * dx + dy * dy);
      setPosition({
        x: dragOffset.current.x + dx,
        y: dragOffset.current.y + dy
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const dx = touch.clientX - dragStart.current.x;
      const dy = touch.clientY - dragStart.current.y;
      dragDistance.current = Math.sqrt(dx * dx + dy * dy);
      setPosition({
        x: dragOffset.current.x + dx,
        y: dragOffset.current.y + dy
      });
    };

    const handleDragEnd = () => {
      setIsDragging(false);
      setTimeout(() => {
        localStorage.setItem("theme_toggle_position", JSON.stringify(position));
      }, 0);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleDragEnd);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleDragEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleDragEnd);
    };
  }, [isDragging, position]);

  const handleToggleTheme = () => {
    if (dragDistance.current > 5) {
      return;
    }
    setTheme(theme === "light" ? "dark" : "light");
  };

  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    apiRequest<{ users: any[] }>("/users")
      .then(res => setUsersList(res.users))
      .catch(err => console.error("Failed to fetch session switcher users:", err));
  }, []);

  // Format current date: "Monday, 2 June 2026"
  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith("/dashboard")) return "Dashboard";
    if (path.startsWith("/projects")) return "Projects";
    if (path.startsWith("/tasks")) return "My Tasks";
    if (path.startsWith("/my-hours")) return "My Hours";
    if (path.startsWith("/log-hours")) return "Log Hours";
    if (path.startsWith("/expenses")) return "Expenses";
    if (path.startsWith("/profile")) return "Profile";
    if (path.startsWith("/admin")) return "Admin Panel";
    return "Project Tracking";
  };

  const pageTitle = getPageTitle();
  const userInitials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-navy text-text-primary">
      {/* Floating Sidebar Capsule */}
      <aside className="fixed bottom-4 left-4 top-4 z-50 hidden w-20 flex-col items-center justify-between border border-border bg-[#121E30]/80 backdrop-blur-md py-6 shadow-xl shadow-black/30 rounded-[24px] lg:flex">
        {/* Top Logo Mark */}
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy bg-opacity-50 text-teal">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

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
                      ? "bg-teal text-[#0B1220] shadow-lg shadow-teal/20"
                      : "text-text-muted hover:bg-navy-elevated hover:text-text-primary"
                  }`
                }
              >
                <Icon size={20} />
              </NavLink>
            );
          })}
          {/* Reports link removed */}
        </nav>

        {/* Bottom Action (Admin Panel & Profile with User Switcher) */}
        <div className="flex flex-col gap-3 pb-2 items-center">
          {user.role === "ADMIN" && (
            <NavLink
              to="/admin"
              title="Admin Panel"
              className={({ isActive }) =>
                `flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 ${
                  isActive
                    ? "bg-teal text-[#0B1220] shadow-lg shadow-teal/20"
                    : "text-text-muted hover:bg-navy-elevated hover:text-text-primary"
                }`
              }
            >
              <Shield size={20} />
            </NavLink>
          )}
          
          <NotificationInbox />
          
          <div className="relative">
            <NavLink
              to="/profile"
              title="My Profile"
              className={({ isActive }) =>
                `flex h-12 w-12 items-center justify-center rounded-full overflow-hidden transition-all duration-300 border ${
                  isActive
                    ? "border-teal shadow-lg shadow-teal/20"
                    : "border-[#253347] hover:border-teal/50"
                }`
              }
            >
              {({ isActive }) => user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <div className={`flex h-full w-full items-center justify-center text-xs font-black ${
                  isActive ? "bg-teal text-[#0B1220]" : "bg-navy bg-opacity-50 text-teal hover:bg-[#1A2B42]"
                }`}>
                  {userInitials}
                </div>
              )}
            </NavLink>
          </div>
        </div>
      </aside>

      {/* Main Layout Area */}
      <div className={isFullScreenPage ? "" : "lg:pl-28"}>
        {localStorage.getItem("kapetein_demo_mode") === "true" && (
          <div className="bg-teal/10 border-b border-teal/20 text-teal px-4 py-2.5 text-xs font-semibold text-center select-none backdrop-blur-md flex items-center justify-center gap-1.5 relative z-40">
            <span>You are viewing a demonstration preview with mock data. For access to the production portal, please</span>
            <a href="https://miltomy.com/contact" target="_blank" rel="noopener noreferrer" className="underline hover:text-white transition">contact us</a>.
          </div>
        )}

        {/* Content Area */}
        <main className={
          location.pathname.endsWith("/kanban") || location.pathname.startsWith("/tasks")
            ? "h-screen w-full overflow-y-auto overflow-x-hidden planka-scrollbar"
            : "mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
        }>
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </main>
      </div>

      {/* Neumorphic Light Mode Switcher Toggle Button */}
      <button
        type="button"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={handleToggleTheme}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          touchAction: "none"
        }}
        className={`fixed top-6 right-6 z-[998] flex h-10 w-10 items-center justify-center rounded-full bg-[#121E30] border border-[#253347] text-teal shadow-lg hover:border-teal/50 select-none ${
          isDragging ? "cursor-grabbing scale-105" : "cursor-grab transition-transform duration-300 hover:scale-105 active:scale-95"
        }`}
        title={theme === "light" ? "Switch to Dark Mode" : "Switch to Neumorphic Light Mode"}
      >
        {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
      </button>
    </div>
  );
}

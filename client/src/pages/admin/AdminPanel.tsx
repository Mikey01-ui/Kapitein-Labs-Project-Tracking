import { useState, useEffect } from "react";
import { PageShell } from "../../components/layout/PageShell";
import { apiRequest } from "../../services/apiClient";
import { formatHours } from "../../utils/formatters";
import { Link } from "react-router-dom";
import { 
  Users as UsersIcon, 
  FolderKanban, 
  Clock, 
  Calendar, 
  ShieldAlert, 
  Settings as SettingsIcon, 
  UserCheck, 
  ArrowUpRight,
  TrendingUp,
  FileCheck
} from "lucide-react";

export function AdminPanel() {
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeProjects, setActiveProjects] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [pendingMilestones, setPendingMilestones] = useState(0);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper to format timestamps as relative times
  const formatTimeAgo = (dateInput: string | Date) => {
    const date = new Date(dateInput);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 10) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(date);
  };

  // Helper to parse actionTypes into clean descriptors and styles
  const mapActivityToLog = (act: any) => {
    let action = "performed an action";
    let detail = act.details || "";
    let icon = Clock;
    let iconColor = "text-teal";

    switch (act.actionType) {
      case "CREATED_PROJECT":
        action = "Created a new project";
        icon = FolderKanban;
        iconColor = "text-teal";
        break;
      case "UPDATED_PROJECT":
        action = "Updated project settings";
        icon = SettingsIcon;
        iconColor = "text-status-warning";
        break;
      case "DELETED_PROJECT":
        action = "Force deleted a project";
        icon = ShieldAlert;
        iconColor = "text-status-danger";
        break;
      case "TRL_UPGRADED":
        action = "Advanced TRL status";
        icon = TrendingUp;
        iconColor = "text-status-success";
        break;
      case "LOGGED_HOURS":
        action = "Logged effort hours";
        icon = Clock;
        iconColor = "text-[#8B5CF6]";
        break;
      case "UPDATED_HOURS":
        action = "Updated effort hours log";
        icon = Clock;
        iconColor = "text-[#8B5CF6]";
        break;
      case "DELETED_HOURS":
        action = "Deleted effort hours log";
        icon = ShieldAlert;
        iconColor = "text-status-danger";
        break;
      case "CREATED_CARD":
        action = "Created a task card";
        icon = FolderKanban;
        iconColor = "text-teal";
        break;
      case "UPDATED_CARD":
        action = "Updated a task card";
        icon = SettingsIcon;
        iconColor = "text-status-warning";
        break;
      case "MOVED_CARD":
        action = "Moved task card status";
        icon = TrendingUp;
        iconColor = "text-teal";
        break;
      case "COMPLETED_CARD":
        action = "Completed task";
        icon = FileCheck;
        iconColor = "text-status-success";
        break;
      case "DELETED_CARD":
        action = "Deleted task card";
        icon = ShieldAlert;
        iconColor = "text-status-danger";
        break;
      case "ADDED_ATTACHMENT":
        action = "Attached file to task";
        icon = FileCheck;
        iconColor = "text-teal";
        break;
      case "ADDED_PROOF":
        action = "Attached proof image to hours log";
        icon = FileCheck;
        iconColor = "text-teal";
        break;
      case "REGISTERED_USER":
        action = "Registered new account";
        icon = UserCheck;
        iconColor = "text-teal";
        break;
      case "APPROVED_USER":
        action = "Approved registration request";
        icon = UserCheck;
        iconColor = "text-teal";
        break;
      case "UPDATED_USER_ROLE":
        action = "Updated user workspace role";
        icon = SettingsIcon;
        iconColor = "text-status-warning";
        break;
      case "ACTIVATED_USER":
        action = "Reactivated user account";
        icon = UserCheck;
        iconColor = "text-status-success";
        break;
      case "DEACTIVATED_USER":
        action = "Deactivated user account";
        icon = ShieldAlert;
        iconColor = "text-status-danger";
        break;
      case "DELETED_USER":
        action = "Deleted user workspace profile";
        icon = ShieldAlert;
        iconColor = "text-status-danger";
        break;
      case "CREATED_MILESTONE":
        action = "Created project milestone";
        icon = Calendar;
        iconColor = "text-teal";
        break;
      case "UPDATED_MILESTONE":
        action = "Updated milestone details";
        icon = SettingsIcon;
        iconColor = "text-status-warning";
        break;
      case "COMPLETED_MILESTONE":
        action = "Completed project milestone";
        icon = FileCheck;
        iconColor = "text-status-success";
        break;
      case "DELETED_MILESTONE":
        action = "Deleted project milestone";
        icon = ShieldAlert;
        iconColor = "text-status-danger";
        break;
      case "UPDATED_SETTINGS":
        action = "Updated system settings";
        icon = SettingsIcon;
        iconColor = "text-status-warning";
        break;
    }

    return {
      id: act.id,
      user: act.user?.name || "Unknown User",
      role: act.user?.role || "USER",
      action,
      detail,
      time: formatTimeAgo(act.createdAt),
      icon,
      iconColor
    };
  };

  useEffect(() => {
    const token = localStorage.getItem("kapetein_token");
    Promise.all([
      apiRequest<{ users: any[] }>("/users", { headers: { "Authorization": `Bearer ${token}` } }),
      apiRequest<{ report: any[] }>("/reports/project-status", { headers: { "Authorization": `Bearer ${token}` } }),
      apiRequest<{ activities: any[] }>("/activities", { headers: { "Authorization": `Bearer ${token}` } })
    ])
      .then(([usersData, statusData, activitiesData]) => {
        setTotalUsers(usersData.users.length);
        const activeProjs = statusData.report.filter((p: any) => p.status === "ACTIVE").length;
        const cumulativeHours = statusData.report.reduce((sum: number, p: any) => sum + p.totalHours, 0);
        const incompleteMilestones = statusData.report.reduce((sum: number, p: any) => sum + (p.totalMilestones - p.completedMilestones), 0);
        
        setActiveProjects(activeProjs);
        setTotalHours(cumulativeHours);
        setPendingMilestones(incompleteMilestones);
        setActivities(activitiesData.activities || []);
      })
      .catch((err) => console.error("Failed to load admin stats:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageShell title="Admin Control Center" eyebrow="System Admin">
      <div className="space-y-6 select-none">
        
        {/* Row 1: System-wide Metrics */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 border-b border-[#1B2A3F] border-dashed pb-8">
          
          {/* Card 1: Users */}
          <div className="rounded-[20px] bg-[#121E30] border border-border p-6 shadow-md flex items-center justify-between hover:border-teal/20 hover:bg-[#1A2B42]/20 transition duration-300">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Total Active Users</p>
              <span className="text-3xl font-black text-white mt-1 block">{totalUsers}</span>
              <Link to="/admin/users" className="text-[10px] font-bold text-teal hover:underline mt-2 inline-flex items-center gap-0.5">
                Manage accounts <ArrowUpRight size={10} />
              </Link>
            </div>
            <span className="p-2.5 rounded-full bg-teal/10 text-teal">
              <UsersIcon size={18} />
            </span>
          </div>

          {/* Card 2: Active Projects */}
          <div className="rounded-[20px] bg-[#121E30] border border-border p-6 shadow-md flex items-center justify-between hover:border-teal/20 hover:bg-[#1A2B42]/20 transition duration-300">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Active Projects</p>
              <span className="text-3xl font-black text-white mt-1 block">{activeProjects}</span>
              <Link to="/projects" className="text-[10px] font-bold text-teal hover:underline mt-2 inline-flex items-center gap-0.5">
                Inspect tracks <ArrowUpRight size={10} />
              </Link>
            </div>
            <span className="p-2.5 rounded-full bg-teal/10 text-teal">
              <FolderKanban size={18} />
            </span>
          </div>

          {/* Card 3: Total Logs */}
          <div className="rounded-[20px] bg-[#121E30] border border-border p-6 shadow-md flex items-center justify-between hover:border-teal/20 hover:bg-[#1A2B42]/20 transition duration-300">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Cumulative Logged Effort</p>
              <span className="text-3xl font-black text-white mt-1 block">{formatHours(totalHours)}</span>
              <Link to="/my-hours" className="text-[10px] font-bold text-teal hover:underline mt-2 inline-flex items-center gap-0.5">
                Review effort logs <ArrowUpRight size={10} />
              </Link>
            </div>
            <span className="p-2.5 rounded-full bg-teal/10 text-teal">
              <Clock size={18} />
            </span>
          </div>

          {/* Card 4: Milestones */}
          <div className="rounded-[20px] bg-[#121E30] border border-border p-6 shadow-md flex items-center justify-between hover:border-teal/20 hover:bg-[#1A2B42]/20 transition duration-300">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Pending Milestones</p>
              <span className="text-3xl font-black text-white mt-1 block">{pendingMilestones}</span>
              <span className="text-[10px] text-text-muted mt-2 block">Across all engineering tracks</span>
            </div>
            <span className="p-2.5 rounded-full bg-teal/10 text-teal">
              <Calendar size={18} />
            </span>
          </div>

        </div>

        {/* Row 2: Control Shortcuts & Audit Logs */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          
          {/* Shortcuts Controls Grid (1/3 width) */}
          <div className="rounded-[20px] bg-[#121E30] border border-border p-6 shadow-md space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-teal border-b border-[#253347] border-dashed pb-3 flex items-center gap-2">
              <ShieldAlert size={14} />
              Administrative Actions
            </h3>
            
            <div className="grid grid-cols-1 gap-3 pt-1 text-xs">
              <Link
                to="/admin/users"
                className="flex items-center justify-between p-3 rounded-xl border border-border bg-[#0B1220]/20 hover:bg-[#1A2B42]/20 hover:border-teal/20 transition duration-150 font-bold text-white group"
              >
                <span>Review & Manage Users</span>
                <ChevronRight size={14} className="text-text-muted group-hover:text-teal group-hover:translate-x-0.5 transition" />
              </Link>

              <Link
                to="/admin/settings"
                className="flex items-center justify-between p-3 rounded-xl border border-border bg-[#0B1220]/20 hover:bg-[#1A2B42]/20 hover:border-teal/20 transition duration-150 font-bold text-white group"
              >
                <span>Configure TRL & Kanban Columns</span>
                <ChevronRight size={14} className="text-text-muted group-hover:text-teal group-hover:translate-x-0.5 transition" />
              </Link>
            </div>
          </div>

          {/* System Audit Activity Feed (2/3 width) */}
          <div className="rounded-[20px] bg-[#121E30] border border-border p-6 shadow-md lg:col-span-2 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-teal border-b border-[#253347] border-dashed pb-3 flex items-center gap-2">
              <Clock size={14} />
              System Activity Audit Trail
            </h3>

            <div className="relative pl-6 space-y-5 pt-2">
              {/* Timeline bar */}
              <div className="absolute left-2.5 top-3 bottom-3 w-[1px] bg-border" />

              {activities.length === 0 ? (
                <div className="text-text-muted py-6 text-center font-bold text-xs">
                  No system activity recorded yet.
                </div>
              ) : (
                activities.map(mapActivityToLog).map((log) => {
                  const IconComponent = log.icon;
                  return (
                    <div key={log.id} className="relative flex items-start justify-between text-xs gap-3">
                      {/* Timeline node */}
                      <div className="absolute -left-6 flex h-5 w-5 items-center justify-center rounded-full bg-[#1A2B42] text-teal ring-4 ring-[#121E30] border border-border/20">
                        <IconComponent size={10} className={log.iconColor} />
                      </div>

                      <div className="space-y-0.5 max-w-lg">
                        <p className="text-white leading-tight text-[11px]">
                          <strong className="text-teal font-extrabold">{log.user}</strong> ({log.role}) {log.action}
                        </p>
                        {log.detail && (
                          <p className="text-[10px] text-text-muted italic bg-[#0B1220]/20 p-1.5 rounded border border-border/20 truncate">
                            {log.detail}
                          </p>
                        )}
                      </div>
                      
                      <span className="text-[9px] text-text-muted whitespace-nowrap pt-0.5">{log.time}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>
    </PageShell>
  );
}

interface ChevronRightProps {
  size?: number;
  className?: string;
}

function ChevronRight({ size = 16, className = "" }: ChevronRightProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

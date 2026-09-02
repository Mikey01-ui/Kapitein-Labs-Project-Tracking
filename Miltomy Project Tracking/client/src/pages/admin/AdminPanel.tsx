import { useState, useEffect } from "react";
import { PageShell } from "../../components/layout/PageShell";
import { apiRequest } from "../../services/apiClient";
import { Link } from "react-router-dom";
import { 
  Users as UsersIcon, 
  FolderKanban, 
  Mail, 
  Calendar, 
  ShieldAlert, 
  Settings as SettingsIcon, 
  UserCheck, 
  ArrowUpRight,
  ChevronRight,
  Clock,
  CheckCircle2,
  FileText
} from "lucide-react";
import { SkeletonLoader } from "../../components/ui/SkeletonLoader";

export function AdminPanel() {
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeProjects, setActiveProjects] = useState(0);
  const [totalInvitations, setTotalInvitations] = useState(0);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiRequest<{ users: any[] }>("/users"),
      apiRequest<{ projects: any[] }>("/projects"),
      apiRequest<{ invitations: any[] }>("/invitations").catch(() => ({ invitations: [] })),
      apiRequest<{ activities: any[] }>("/activities").catch(() => ({ activities: [] }))
    ])
      .then(([usersData, projectsData, invData, activitiesData]) => {
        setTotalUsers(usersData.users.length);
        setActiveProjects(projectsData.projects.filter((p: any) => p.status === "ACTIVE").length);
        setTotalInvitations(invData.invitations.length);
        setActivities(activitiesData.activities || []);
      })
      .catch((err) => console.error("Failed to load admin metrics:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <PageShell title="Admin Control Center" eyebrow="Agency Administration">
        <SkeletonLoader variant="dashboard" />
      </PageShell>
    );
  }

  return (
    <PageShell title="Admin Control Center" eyebrow="Agency Administration">
      <div className="space-y-8 select-none">
        
        {/* System Metrics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 pb-8 border-b border-[#222222]">
          
          <div className="rounded bg-[#111111] border border-[#222222] p-5 shadow-lg flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#888888]">Team Members</p>
              <span className="text-3xl font-extrabold text-[#f0ede6] font-display mt-1 block">{totalUsers}</span>
              <Link to="/admin/users" className="text-xs font-bold text-[#c8ff00] hover:underline mt-2 inline-flex items-center gap-1">
                Manage accounts <ArrowUpRight size={12} />
              </Link>
            </div>
            <span className="p-3 rounded bg-[#181818] text-[#c8ff00] border border-[#222222]">
              <UsersIcon size={18} />
            </span>
          </div>

          <div className="rounded bg-[#111111] border border-[#222222] p-5 shadow-lg flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#888888]">Active Projects</p>
              <span className="text-3xl font-extrabold text-[#f0ede6] font-display mt-1 block">{activeProjects}</span>
              <Link to="/projects" className="text-xs font-bold text-[#c8ff00] hover:underline mt-2 inline-flex items-center gap-1">
                Inspect projects <ArrowUpRight size={12} />
              </Link>
            </div>
            <span className="p-3 rounded bg-[#181818] text-[#c8ff00] border border-[#222222]">
              <FolderKanban size={18} />
            </span>
          </div>

          <div className="rounded bg-[#111111] border border-[#222222] p-5 shadow-lg flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#888888]">Invitations Sent</p>
              <span className="text-3xl font-extrabold text-[#f0ede6] font-display mt-1 block">{totalInvitations}</span>
              <Link to="/admin/invitations" className="text-xs font-bold text-[#c8ff00] hover:underline mt-2 inline-flex items-center gap-1">
                Manage invites <ArrowUpRight size={12} />
              </Link>
            </div>
            <span className="p-3 rounded bg-[#181818] text-[#c8ff00] border border-[#222222]">
              <Mail size={18} />
            </span>
          </div>

          <div className="rounded bg-[#111111] border border-[#222222] p-5 shadow-lg flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#888888]">Agency Status</p>
              <span className="text-base font-bold text-green-400 mt-2 block">100% Operational</span>
              <span className="text-[11px] text-[#888888] mt-1 block">Production Cloud Active</span>
            </div>
            <span className="p-3 rounded bg-green-500/10 text-green-400 border border-green-500/20">
              <CheckCircle2 size={18} />
            </span>
          </div>

        </div>

        {/* Shortcuts & Audit Logs */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          
          {/* Shortcuts Grid */}
          <div className="rounded bg-[#111111] border border-[#222222] p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#c8ff00] border-b border-[#222222] pb-3 flex items-center gap-2 font-display">
              <ShieldAlert size={15} />
              Agency Hub Shortcuts
            </h3>
            
            <div className="space-y-2.5 pt-1 text-xs">
              <Link
                to="/admin/users"
                className="flex items-center justify-between p-3.5 rounded border border-[#222222] bg-[#181818] hover:border-[#c8ff00]/40 transition font-bold text-[#f0ede6] group"
              >
                <span>Team Accounts & Roles</span>
                <ChevronRight size={14} className="text-[#888888] group-hover:text-[#c8ff00] group-hover:translate-x-0.5 transition" />
              </Link>

              <Link
                to="/admin/invitations"
                className="flex items-center justify-between p-3.5 rounded border border-[#222222] bg-[#181818] hover:border-[#c8ff00]/40 transition font-bold text-[#f0ede6] group"
              >
                <span>Onboarding Invitations</span>
                <ChevronRight size={14} className="text-[#888888] group-hover:text-[#c8ff00] group-hover:translate-x-0.5 transition" />
              </Link>

              <Link
                to="/admin/projects"
                className="flex items-center justify-between p-3.5 rounded border border-[#222222] bg-[#181818] hover:border-[#c8ff00]/40 transition font-bold text-[#f0ede6] group"
              >
                <span>Client Projects Hub</span>
                <ChevronRight size={14} className="text-[#888888] group-hover:text-[#c8ff00] group-hover:translate-x-0.5 transition" />
              </Link>

              <Link
                to="/admin/settings"
                className="flex items-center justify-between p-3.5 rounded border border-[#222222] bg-[#181818] hover:border-[#c8ff00]/40 transition font-bold text-[#f0ede6] group"
              >
                <span>Workspace Settings</span>
                <ChevronRight size={14} className="text-[#888888] group-hover:text-[#c8ff00] group-hover:translate-x-0.5 transition" />
              </Link>
            </div>
          </div>

          {/* Audit Activity Feed */}
          <div className="rounded bg-[#111111] border border-[#222222] p-6 shadow-xl lg:col-span-2 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#c8ff00] border-b border-[#222222] pb-3 flex items-center gap-2 font-display">
              <Clock size={15} />
              System Activity Audit Trail
            </h3>

            <div className="relative pl-6 space-y-5 pt-2">
              <div className="absolute left-2.5 top-3 bottom-3 w-[1px] bg-[#222222]" />

              {activities.length === 0 ? (
                <div className="text-[#888888] py-8 text-center text-xs">
                  No system activity recorded yet.
                </div>
              ) : (
                activities.slice(0, 8).map((act) => {
                  return (
                    <div key={act.id} className="relative flex items-start justify-between text-xs gap-3">
                      <div className="absolute -left-6 flex h-5 w-5 items-center justify-center rounded-full bg-[#181818] text-[#c8ff00] border border-[#222222]">
                        <Clock size={10} />
                      </div>

                      <div className="space-y-0.5 max-w-lg">
                        <p className="text-[#f0ede6] leading-tight text-xs">
                          <strong className="text-[#c8ff00] font-bold">{act.user?.name || "User"}</strong> {act.details || act.actionType.toLowerCase().replace(/_/g, " ")}
                        </p>
                      </div>
                      
                      <span className="text-[10px] text-[#888888] whitespace-nowrap pt-0.5">
                        {new Date(act.createdAt).toLocaleDateString()}
                      </span>
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

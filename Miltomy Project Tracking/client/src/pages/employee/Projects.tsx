import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageShell } from "../../components/layout/PageShell";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../services/apiClient";
import { FolderKanban, ArrowRight, Search, Filter, Plus, CheckCircle2, AlertCircle } from "lucide-react";
import { SkeletonLoader } from "../../components/ui/SkeletonLoader";
import { CreateProjectWizard } from "../../components/ui/CreateProjectWizard";
import { UserAvatar } from "../../components/ui/UserAvatar";
import gsap from "gsap";

export function Projects() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [animatedTotalProjects, setAnimatedTotalProjects] = useState(0);
  const [animatedActiveProjects, setAnimatedActiveProjects] = useState(0);
  const [animatedTotalDeliverables, setAnimatedTotalDeliverables] = useState(0);

  // Wizard State
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false);

  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success"
  });

  const fetchProjectsAndUsers = async () => {
    try {
      const [projData, userData] = await Promise.all([
        apiRequest<{ projects: any[] }>("/projects"),
        apiRequest<{ users: any[] }>("/users")
      ]);
      setProjectsList(projData.projects || []);
      setUsersList(userData.users || []);
    } catch (err) {
      console.error("Failed to load projects/users:", err);
      triggerToast("Failed to fetch project listings.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectsAndUsers();
  }, []);

  const triggerToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3500);
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const getMemberInitials = (members: any[] = []) => {
    return members.map((m: any) => {
      const name = m.name || "User";
      const parts = name.split(" ");
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return name.substring(0, 2).toUpperCase();
    });
  };

  const assignedProjects = (() => {
    if (user?.role === "OWNER") {
      return projectsList;
    }
    if (user?.role === "PROJECT_MANAGER") {
      return projectsList.filter(
        (p) => p.managerId === user?.id || (p.members || []).some((m: any) => m.id === user?.id)
      );
    }
    return projectsList.filter((p) => (p.members || []).some((m: any) => m.id === user?.id));
  })();

  const filteredProjects = assignedProjects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.clientName && p.clientName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter ? p.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  const activeCount = projectsList.filter((p) => p.status === "ACTIVE").length;
  const totalDeliverablesCount = projectsList.reduce((acc, p) => acc + (p.totalTasks || 0), 0);

  // GSAP Counter Animations
  useEffect(() => {
    if (loading) return;

    const ctx = gsap.context(() => {
      const counts = {
        total: 0,
        active: 0,
        deliverables: 0
      };

      gsap.to(counts, {
        total: projectsList.length,
        active: activeCount,
        deliverables: totalDeliverablesCount,
        duration: 1.5,
        ease: "power2.out",
        onUpdate: () => {
          setAnimatedTotalProjects(Math.floor(counts.total));
          setAnimatedActiveProjects(Math.floor(counts.active));
          setAnimatedTotalDeliverables(Math.floor(counts.deliverables));
        }
      });

      gsap.fromTo(
        ".project-card-item",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: "power2.out" }
      );
    });

    return () => ctx.revert();
  }, [loading, projectsList.length, activeCount, totalDeliverablesCount]);

  if (loading) {
    return (
      <PageShell title="Projects" eyebrow="Agency Client Workspaces">
        <SkeletonLoader variant="table" />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Projects"
      eyebrow="Agency Client Workspaces"
      actions={
        (user?.role === "OWNER" || user?.role === "PROJECT_MANAGER") && (
          <button
            onClick={() => setIsCreateWizardOpen(true)}
            className="inline-flex items-center gap-2 rounded bg-[#c8ff00] px-4 py-2.5 text-xs font-black uppercase tracking-wider text-[#080808] hover:bg-[#b2e600] shadow-lg shadow-[#c8ff00]/25 transition cursor-pointer"
          >
            <Plus size={16} />
            <span>New Project</span>
          </button>
        )
      }
    >
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded border text-xs font-bold shadow-2xl backdrop-blur-md animate-fade-in ${
          toast.type === "success" 
            ? "bg-[#00C88A]/10 border-[#00C88A]/30 text-[#00C88A]" 
            : "bg-[#E74C4C]/10 border-[#E74C4C]/30 text-[#E74C4C]"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Metric Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded bg-[#111111] border border-[#222222] p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded bg-[#181818] border border-[#262626] text-[#c8ff00]">
            <FolderKanban size={22} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#888888]">Total Projects</p>
            <p className="text-2xl font-black font-display text-white mt-0.5">{animatedTotalProjects}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded bg-[#111111] border border-[#222222] p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded bg-[#181818] border border-[#262626] text-[#00C88A]">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#888888]">Active Tracks</p>
            <p className="text-2xl font-black font-display text-white mt-0.5">{animatedActiveProjects}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded bg-[#111111] border border-[#222222] p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded bg-[#181818] border border-[#262626] text-[#3B82F6]">
            <FolderKanban size={22} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#888888]">Total Deliverables</p>
            <p className="text-2xl font-black font-display text-white mt-0.5">{animatedTotalDeliverables}</p>
          </div>
        </div>
      </div>

      {/* Search and Filter Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#888888]" />
          <input
            type="text"
            placeholder="Search projects or clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded bg-[#111111] border border-[#222222] pl-10 pr-4 py-2 text-xs text-white placeholder:text-[#666666] focus:outline-none focus:border-[#c8ff00] transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={16} className="text-[#888888] hidden sm:block" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto rounded bg-[#111111] border border-[#222222] px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c8ff00] transition cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="ON_HOLD">On Hold</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="rounded border border-dashed border-[#222222] bg-[#111111]/50 p-12 text-center">
          <FolderKanban size={40} className="mx-auto text-[#444444] mb-3" />
          <h3 className="text-base font-bold text-white">No projects found</h3>
          <p className="text-xs text-[#888888] mt-1 max-w-sm mx-auto">
            {searchQuery || statusFilter
              ? "No projects match your current filters."
              : "Get started by launching your first agency client project."}
          </p>
          {(user?.role === "OWNER" || user?.role === "PROJECT_MANAGER") && (
            <button
              onClick={() => setIsCreateWizardOpen(true)}
              className="mt-5 inline-flex items-center gap-2 rounded bg-[#c8ff00] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-[#080808] hover:bg-[#b2e600] transition cursor-pointer shadow-lg shadow-[#c8ff00]/25"
            >
              <Plus size={14} />
              <span>Create Project</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const members = project.members || [];
            const totalTasks = project.totalTasks || 0;
            const completedTasks = project.completedTasks || 0;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : (project.progressPercent || 0);

            return (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="project-card-item opacity-0 group relative flex flex-col justify-between h-72 rounded bg-[#111111] border border-[#222222] p-6 shadow-md hover:bg-[#161616] hover:border-[#c8ff00]/30 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                {/* Upper Section */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 text-[#c8ff00]">
                      <FolderKanban size={18} />
                      <span className="rounded bg-[#122D23] px-2 py-0.5 text-[10px] font-bold text-[#00C88A] uppercase tracking-wider">
                        {project.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-[#181818] border border-[#222222] px-2 py-0.5 text-[10px] font-bold text-[#888888] max-w-[120px] truncate">
                        {project.clientName || "Direct Client"}
                      </span>
                    </div>
                  </div>

                  <h3 className="mt-4 text-base font-bold text-white group-hover:text-[#c8ff00] transition-colors duration-300 line-clamp-1">
                    {project.name}
                  </h3>
                  <p className="mt-2 text-xs text-[#888888] line-clamp-3 leading-relaxed">
                    {project.description}
                  </p>
                </div>

                {/* Progress and Footer */}
                <div className="mt-6 space-y-4">
                  {/* Slim progress bar */}
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-white mb-1.5">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded bg-[#1e1e1e] overflow-hidden">
                      <div 
                        className="h-full bg-[#c8ff00] transition-all duration-500 shadow-sm shadow-[#c8ff00]/40" 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer details: members + deliverables count */}
                  <div 
                    className="flex items-center justify-between border-t border-[#222222] border-dashed pt-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Avatars Stack */}
                    <div className="flex -space-x-1.5">
                      {members.slice(0, 4).map((memberObj: any, i: number) => {
                        const mUser = memberObj.user || memberObj;
                        return (
                          <UserAvatar
                            key={mUser.id || i}
                            name={mUser.name}
                            avatarUrl={mUser.avatarUrl}
                            size="xs"
                            className="ring-1 ring-[#080808]"
                          />
                        );
                      })}
                      {members.length > 4 && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#181818] text-[8px] font-bold text-[#888888] border border-[#080808]">
                          +{members.length - 4}
                        </div>
                      )}
                      {members.length === 0 && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#181818] text-[8px] font-bold text-[#888888] border border-[#222222]">
                          0
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-[#888888]">
                        {completedTasks}/{totalTasks} deliverables
                      </span>

                      <Link
                        to={`/projects/${project.id}`}
                        className="flex h-6 w-6 items-center justify-center rounded bg-[#181818] text-[#888888] group-hover:bg-[#c8ff00] group-hover:text-[#080808] transition"
                      >
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 1-Question-at-a-time Create Project Wizard */}
      <CreateProjectWizard
        isOpen={isCreateWizardOpen}
        onClose={() => setIsCreateWizardOpen(false)}
        onProjectCreated={() => {
          fetchProjectsAndUsers();
          triggerToast("Project created successfully!", "success");
        }}
      />
    </PageShell>
  );
}

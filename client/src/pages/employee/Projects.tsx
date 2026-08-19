import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageShell } from "../../components/layout/PageShell";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../services/apiClient";
import { FolderKanban, Clock, ArrowRight, Search, Filter, Plus, X, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import type { Project, User } from "../../types";
import { SkeletonLoader } from "../../components/ui/SkeletonLoader";
import { AiOnboardingChat } from "../../components/ui/AiOnboardingChat";
import gsap from "gsap";

const defaultTrlDescriptions: Record<number, string> = {
  1: "Basic research (Principles observed)",
  2: "Applied research (Concept formulated)",
  3: "Proof of Concept (Experimental validation)",
  4: "Lab validation (Component validation in lab)",
  5: "Relevant env validation (Simulated env)",
  6: "Prototype demonstration (System model demo)",
  7: "Operational demonstration (System prototype in operational env)",
  8: "System completed (Qualified through test & demo)",
  9: "Proven system (Successful mission operations)"
};

export function Projects() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [projectHours, setProjectHours] = useState<any[]>([]);
  const [projectStatuses, setProjectStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAiOnboardingOpen, setIsAiOnboardingOpen] = useState(false);
  const [creationMode, setCreationMode] = useState<"CHOICE" | "STANDARD" | "AI">("CHOICE");

  const [trlDescriptions, setTrlDescriptions] = useState<Record<number, string>>(defaultTrlDescriptions);

  useEffect(() => {
    const stored = localStorage.getItem("kapetein_trl_definitions");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length === 9) {
          const mapped: Record<number, string> = {};
          parsed.forEach((val, index) => {
            mapped[index + 1] = val;
          });
          setTrlDescriptions(mapped);
        }
      } catch (e) {
        console.error("Failed to parse stored TRL definitions", e);
      }
    }
  }, []);

  const [animatedTotalProjects, setAnimatedTotalProjects] = useState(0);
  const [animatedActiveProjects, setAnimatedActiveProjects] = useState(0);
  const [animatedAvgTrl, setAnimatedAvgTrl] = useState(0);

  // Modal control states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [projectStartDate, setProjectStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [projectStatus, setProjectStatus] = useState<"ACTIVE" | "COMPLETED" | "ARCHIVED">("ACTIVE");
  const [projectManagerId, setProjectManagerId] = useState("");
  const [projectMemberIds, setProjectMemberIds] = useState<string[]>([]);
  const [projectTrl, setProjectTrl] = useState("1");

  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success"
  });

  const fetchProjectsAndUsers = async () => {
    try {
      const [projData, userData, hoursData, statusData] = await Promise.all([
        apiRequest<{ projects: any[] }>("/projects"),
        apiRequest<{ users: any[] }>("/users"),
        apiRequest<{ report: any[] }>("/reports/hours-by-project").catch(() => ({ report: [] })),
        apiRequest<{ report: any[] }>("/reports/project-status").catch(() => ({ report: [] }))
      ]);
      setProjectsList(projData.projects);
      setUsersList(userData.users);
      setProjectHours(hoursData.report || []);
      setProjectStatuses(statusData.report || []);
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

  // Default manager selection to first admin/manager in the database
  useEffect(() => {
    const managers = usersList.filter(u => u.role === "MANAGER" || u.role === "ADMIN");
    if (managers.length > 0 && !projectManagerId) {
      setProjectManagerId(managers[0].id);
    }
  }, [usersList, projectManagerId]);

  const triggerToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3500);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !projectDesc.trim() || !projectManagerId) {
      triggerToast("Please fill in project name, description, and assign a manager.", "error");
      return;
    }

    try {
      const res = await apiRequest<{ message: string; project: any }>("/projects", {
        method: "POST",
        body: JSON.stringify({
          name: projectName.trim(),
          description: projectDesc.trim(),
          startDate: projectStartDate,
          managerId: projectManagerId,
          currentTRL: parseInt(projectTrl) || 1
        })
      });

      const projectId = res.project.id;
      const otherMembers = projectMemberIds.filter(id => id !== projectManagerId && id !== user.id);
      
      const memberPromises = otherMembers.map(mId =>
        apiRequest(`/projects/${projectId}/members`, {
          method: "POST",
          body: JSON.stringify({ userId: mId })
        }).catch(err => console.error("Failed to assign member", mId, err))
      );
      
      await Promise.all(memberPromises);

      triggerToast(`Project "${projectName}" created successfully!`, "success");
      setIsCreateOpen(false);
      
      // Clear forms
      setProjectName("");
      setProjectDesc("");
      setProjectStartDate(new Date().toISOString().split("T")[0]);
      setProjectStatus("ACTIVE");
      setProjectMemberIds([]);
      setProjectTrl("1");

      fetchProjectsAndUsers();
    } catch (err) {
      console.error("Failed to create project", err);
      triggerToast("Failed to create new project track.", "error");
    }
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const getProjectHours = (projectId: string) => {
    const report = projectHours.find(p => p.projectId === projectId);
    return report ? report.totalHours : 0;
  };

  const getMemberInitials = (memberIds: string[]) => {
    return memberIds.map((id) => {
      const u = usersList.find((user) => user.id === id);
      if (!u) return "?";
      return u.name
        .split(" ")
        .map((n) => n[0])
        .join("");
    });
  };

  const assignedProjects = (() => {
    if (user.role === "ADMIN") {
      return projectsList;
    }
    if (user.role === "MANAGER") {
      return projectsList.filter(
        (p) => p.managerId === user.id || p.memberIds.includes(user.id)
      );
    }
    return projectsList.filter((p) => p.memberIds.includes(user.id));
  })();

  const handleToggleMember = (userId: string) => {
    setProjectMemberIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const getProjectProgress = (projectId: string) => {
    const stat = projectStatuses.find(s => s.projectId === projectId);
    if (!stat) return 0;
    const total = stat.totalTasks;
    const completed = stat.completedTasks;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const filteredProjects = assignedProjects.filter((project) => {
    const matchesSearch = searchQuery
      ? project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesStatus = statusFilter ? project.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  const avgTrl = assignedProjects.length > 0
    ? (assignedProjects.reduce((sum, p) => sum + Number(p.currentTRL), 0) / assignedProjects.length).toFixed(1)
    : "0.0";

  useEffect(() => {
    if (loading) return;

    const targets = {
      total: 0,
      active: 0,
      trl: 0
    };

    gsap.to(targets, {
      total: assignedProjects.length,
      active: assignedProjects.filter((p) => p.status === "ACTIVE").length,
      trl: Number(avgTrl),
      duration: 1.2,
      ease: "power2.out",
      onUpdate: () => {
        setAnimatedTotalProjects(Math.round(targets.total));
        setAnimatedActiveProjects(Math.round(targets.active));
        setAnimatedAvgTrl(Math.round(targets.trl * 10) / 10);
      }
    });

    // Stagger slide project card items
    gsap.fromTo(".project-card-item",
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: "power2.out", delay: 0.1 }
    );

    // Stagger animate progress bars
    const progressBars = document.querySelectorAll(".project-progress-bar");
    if (progressBars.length > 0) {
      gsap.fromTo(progressBars,
        { width: "0%" },
        {
          width: (i, el) => el.getAttribute("data-progress") || "0%",
          duration: 0.8,
          stagger: 0.06,
          ease: "power2.out",
          delay: 0.2
        }
      );
    }
  }, [loading, assignedProjects.length, avgTrl, searchQuery, statusFilter]);

  if (loading) {
    return (
      <PageShell title="Projects" eyebrow={user.role === "ADMIN" ? "All active projects" : "Assigned work"}>
        <SkeletonLoader variant="projects" />
      </PageShell>
    );
  }

  return (
    <PageShell 
      title="Projects" 
      eyebrow={user.role === "ADMIN" ? "All active projects" : "Assigned work"}
    >
      {/* Row 1: Borderless Stats with dashed dividers */}
      <div className="grid grid-cols-1 gap-6 py-2 sm:grid-cols-3 border-b border-[#1B2A3F] border-dashed pb-8 mb-8">
        {/* Total Projects */}
        <div className="dash-stat-item flex flex-col justify-between border-b sm:border-b-0 sm:border-r border-[#1B2A3F] border-dashed pb-6 sm:pb-0 pr-0 sm:pr-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Total Projects</p>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-4xl font-black text-white">{animatedTotalProjects}</span>
            <FolderKanban size={18} className="text-teal" />
          </div>
        </div>

        {/* Active Projects */}
        <div className="dash-stat-item flex flex-col justify-between border-b sm:border-b-0 sm:border-r border-[#1B2A3F] border-dashed pb-6 sm:pb-0 sm:pr-6 sm:pl-2 lg:pl-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Active Projects</p>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-4xl font-black text-white">
              {animatedActiveProjects}
            </span>
            <div className="h-2.5 w-2.5 rounded-full bg-status-success animate-pulse self-center" />
          </div>
        </div>

        {/* Average TRL */}
        <div className="dash-stat-item flex flex-col justify-between pl-0 sm:pl-2 lg:pl-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Average TRL Level</p>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-4xl font-black text-white">{animatedAvgTrl}</span>
            <span className="text-[9px] font-bold text-teal bg-[#122D23] px-2 py-0.5 rounded border border-status-success/20">TRL Gauge</span>
          </div>
        </div>
      </div>

      {/* Filter and Control Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#1B2A3F] border-dashed pb-6 mb-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-60 rounded-xl border border-border bg-[#121E30] pl-9 pr-4 text-xs text-white outline-none focus:border-teal transition placeholder:text-text-muted/60"
            />
          </div>

          {/* Status dropdown filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-xl border border-border bg-[#121E30] pl-9 pr-8 text-xs font-semibold text-white outline-none focus:border-teal transition cursor-pointer appearance-none"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="PAUSED">Paused</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[8px] text-text-muted">
              ▼
            </div>
          </div>
        </div>

        {user.role === "ADMIN" && (
          <button
            onClick={() => {
              setCreationMode("CHOICE");
              setIsCreateOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs py-2 px-4 rounded-xl bg-teal text-navy font-bold uppercase tracking-wider hover:bg-[#00B8A2] transition self-start sm:self-auto"
          >
            <Plus size={14} />
            Start Project
          </button>
        )}
      </div>

      {/* Grid List */}
      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-[#1B2A3F] rounded-2xl text-center p-6 bg-[#121E30]/20">
          <FolderKanban size={36} className="text-text-muted mb-3" />
          <h4 className="text-sm font-bold text-white">No projects found</h4>
          <p className="text-xs text-text-muted mt-1 max-w-xs">Adjust your search or status filters to find matching projects.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const hours = getProjectHours(project.id);
            const initials = getMemberInitials(project.memberIds);
            const progress = getProjectProgress(project.id);

            return (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="project-card-item opacity-0 group relative flex flex-col justify-between h-72 rounded-2xl bg-navy-surface p-6 shadow-md hover:bg-[#1A2B42] hover:shadow-lg transition-all duration-300 cursor-pointer border-0"
              >
                {/* Upper Section */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 text-teal">
                      <FolderKanban size={18} />
                      <span className="rounded bg-[#122D23] px-2 py-0.5 text-[10px] font-bold text-status-success uppercase tracking-wider">
                        {project.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-[#0B1220] border border-[#1B2A3F] border-dashed px-2 py-0.5 text-[10px] font-bold text-teal">
                        TRL {project.currentTRL}
                      </span>
                    </div>
                  </div>

                  <h3 className="mt-4 text-base font-bold text-white group-hover:text-teal transition-colors duration-300">
                    {project.name}
                  </h3>
                  <p className="mt-2 text-xs text-text-muted line-clamp-3 leading-relaxed">
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
                    <div className="h-1.5 w-full rounded-full bg-[#0B1220] overflow-hidden">
                      <div 
                        className="h-full bg-teal project-progress-bar" 
                        data-progress={`${progress}%`}
                        style={{ width: "0%" }}
                      />
                    </div>
                  </div>

                  {/* Footer details: members + hours */}
                  <div 
                    className="flex items-center justify-between border-t border-[#1B2A3F] border-dashed pt-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Avatars */}
                    <div className="flex -space-x-1.5">
                      {initials.slice(0, 4).map((initial, i) => (
                        <div
                          key={i}
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-black border border-[#121E30] ${
                            i === 0 ? "bg-[#00E5C8] text-navy" : i === 1 ? "bg-[#1A2B42] text-teal" : "bg-[#253347] text-white"
                          }`}
                          title={initial}
                        >
                          {initial}
                        </div>
                      ))}
                      {initials.length > 4 && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-navy text-[8px] font-bold text-text-muted border border-[#121E30]">
                          +{initials.length - 4}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-[10px] text-text-muted">
                        <Clock size={12} className="text-teal" />
                        <span>{hours}h logged</span>
                      </div>

                      <Link
                        to={`/projects/${project.id}`}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0B1220] text-text-muted hover:bg-teal hover:text-navy hover:scale-110 transition-all duration-300"
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
      )}      {/* MODAL OVERLAY: CREATE PROJECT */}
      {isCreateOpen && (
        <div className={`fixed inset-0 z-[9999] flex items-center justify-center bg-[#080f1f]/80 backdrop-blur-xs select-none transition-all duration-300 ${
          creationMode === "AI" ? "p-0" : "p-4"
        }`}>
          <div className={`relative w-full bg-[#121E30] shadow-2xl animate-scale-up text-white planka-scrollbar transition-all duration-300 ease-in-out flex flex-col ${
            creationMode === "CHOICE" 
              ? "max-w-md max-h-[345px] p-6 overflow-hidden rounded-[20px] border border-[#253347]" 
              : creationMode === "STANDARD"
              ? "max-w-3xl max-h-[640px] p-6 overflow-hidden rounded-[20px] border border-[#253347]"
              : "w-screen h-screen max-w-full max-h-screen p-0 overflow-hidden rounded-none border-0"
          }`}>
            
            {/* Close */}
            {creationMode !== "AI" && (
              <button
                onClick={() => setIsCreateOpen(false)}
                className="absolute top-4 right-4 text-text-muted hover:text-white transition"
              >
                <X size={16} />
              </button>
            )}

            {creationMode !== "AI" && (
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Start New Project Track</h3>
                <p className="text-[10px] text-text-muted mt-0.5">Initialize a new engineering track and assign lead parameters</p>
              </div>
            )}

            {creationMode === "CHOICE" ? (
              <div className="space-y-4 pt-2 animate-fade-in">
                <p className="text-xs text-text-muted">Select how you would like to bootstrap this project track:</p>
                <div className="grid grid-cols-1 gap-3">
                  
                  {/* Option 1: Standard Manual Setup */}
                  <button
                    type="button"
                    onClick={() => setCreationMode("STANDARD")}
                    className="w-full text-left p-4 rounded-xl bg-[#08101f] hover:bg-[#1a2b42]/40 border border-[#253347] hover:border-teal/30 transition-all duration-200 group flex items-start gap-3.5"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#1a2b42] text-teal border border-[#253347] group-hover:bg-teal group-hover:text-navy group-hover:border-transparent transition-all duration-200 shrink-0">
                      <Plus size={16} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Standard Manual Setup</h4>
                      <p className="text-[10px] text-text-muted leading-relaxed">Configure the timeline, TRL starting level, milestones, and allocate engineering team members manually.</p>
                    </div>
                  </button>

                  {/* Option 2: AI Guided Planner */}
                  <button
                    type="button"
                    onClick={() => setCreationMode("AI")}
                    className="w-full text-left p-4 rounded-xl bg-[#08101f] hover:bg-[#1a2b42]/40 border border-[#253347] hover:border-teal/30 transition-all duration-200 group flex items-start gap-3.5"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#1a2b42] text-teal border border-[#253347] group-hover:bg-teal group-hover:text-navy group-hover:border-transparent transition-all duration-200 shrink-0">
                      <Sparkles size={16} className="animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">AI Guided Onboarding</h4>
                      <p className="text-[10px] text-text-muted leading-relaxed">Drop reference specifications, converse with the AI Project Assistant, and auto-generate TRL task roadmaps.</p>
                    </div>
                  </button>

                </div>
              </div>
            ) : creationMode === "STANDARD" ? (
              <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs animate-fade-in flex flex-col h-full overflow-hidden">
                {/* Back button */}
                <div className="flex items-center justify-between pb-1 border-b border-[#253347]/50 mb-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setCreationMode("CHOICE")}
                    className="text-[10px] text-teal font-bold uppercase tracking-wider hover:text-white transition flex items-center gap-1"
                  >
                    ← Back to options
                  </button>
                  <span className="text-[9px] font-black uppercase tracking-widest text-text-muted bg-white/5 px-2 py-0.5 rounded border border-white/5">
                    Standard Setup
                  </span>
                </div>

                {/* Grid Container */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 overflow-y-auto planka-scrollbar pr-1 flex-1 py-1">
                  
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Project Name</label>
                      <input
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        className="h-9 w-full rounded bg-[#08101f] border border-border px-3 text-xs font-semibold text-white outline-none transition focus:border-teal"
                        placeholder="e.g. Plasma Torch Optimization"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Description</label>
                      <textarea
                        value={projectDesc}
                        onChange={(e) => setProjectDesc(e.target.value)}
                        className="w-full min-h-24 rounded bg-[#08101f] border border-border p-3 text-xs font-semibold text-white outline-none transition focus:border-teal resize-none"
                        placeholder="Enter project targets and research goals..."
                        required
                      />
                    </div>

                    {/* Allocate Engineers list */}
                    <div className="space-y-2 pt-2 border-t border-[#1B2A3F] border-dashed">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-teal block">Allocate Project Team Members</label>
                      <div className="max-h-28 overflow-y-auto planka-scrollbar pr-1 space-y-1.5">
                        {usersList.map((u) => (
                          <label key={u.id} className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-[#1A2B42]/30 select-none">
                            <input
                              type="checkbox"
                              checked={projectMemberIds.includes(u.id)}
                              onChange={() => handleToggleMember(u.id)}
                              className="rounded border-[#253347] text-teal focus:ring-teal bg-[#08101f] h-3.5 w-3.5 cursor-pointer"
                            />
                            <div className="min-w-0">
                              <span className="text-[11px] font-bold text-white block leading-tight">{u.name}</span>
                              <span className="text-[8px] text-text-muted block leading-none">{u.email}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Start Date</label>
                        <input
                          type="date"
                          value={projectStartDate}
                          onChange={(e) => setProjectStartDate(e.target.value)}
                          className="h-9 w-full rounded bg-[#08101f] border border-border px-3 text-xs font-semibold text-white outline-none transition focus:border-teal"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Start TRL Level</label>
                        <select
                          value={projectTrl}
                          onChange={(e) => setProjectTrl(e.target.value)}
                          className="w-full h-9 rounded bg-[#08101f] border border-[#253347] px-3 text-xs font-semibold text-white outline-none focus:border-teal transition cursor-pointer"
                        >
                          {[1,2,3,4,5,6,7,8,9].map(lvl => (
                            <option key={lvl} value={lvl}>TRL {lvl} - {trlDescriptions[lvl]}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* TRL Level Explanation Banner */}
                    <div className="p-2.5 rounded bg-[#102A45]/30 border border-teal/20 text-[11px] text-teal-300 block leading-relaxed">
                      <span className="font-bold text-teal block mb-0.5">TRL {projectTrl} Definition:</span>
                      {trlDescriptions[parseInt(projectTrl)]}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Lead Manager</label>
                        <select
                          value={projectManagerId}
                          onChange={(e) => setProjectManagerId(e.target.value)}
                          className="w-full h-9 rounded bg-[#08101f] border border-[#253347] px-3 text-xs font-semibold text-white outline-none focus:border-teal transition cursor-pointer uppercase"
                          required
                        >
                          {usersList.filter(u => u.role === "MANAGER" || u.role === "ADMIN").map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Project Status</label>
                        <select
                          value={projectStatus}
                          onChange={(e) => setProjectStatus(e.target.value as any)}
                          className="w-full h-9 rounded bg-[#08101f] border border-[#253347] px-3 text-xs font-semibold text-white outline-none focus:border-teal transition cursor-pointer"
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="ARCHIVED">ARCHIVED</option>
                        </select>
                      </div>
                    </div>
                  </div>

                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-border border-dashed shrink-0">
                  <button 
                    type="button" 
                    onClick={() => setIsCreateOpen(false)} 
                    className="h-9 px-4 rounded bg-[#1A2B42] hover:bg-[#253347] text-xs font-bold uppercase tracking-wider text-white transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="h-9 px-4 rounded bg-teal hover:bg-[#00B8A2] text-xs font-bold uppercase tracking-wider text-navy transition"
                  >
                    Create Project
                  </button>
                </div>
              </form>
          ) : (
            <div className="w-full h-full animate-fade-in">
              <AiOnboardingChat
                inline
                onBack={() => setCreationMode("CHOICE")}
                onClose={() => setIsCreateOpen(false)}
                onProjectCreated={fetchProjectsAndUsers}
                usersList={usersList}
                currentUser={user}
              />
            </div>
          )}
          </div>
        </div>
      )}

      {/* Floating feedback toast */}
      {toast.show && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-[90%] sm:w-auto sm:min-w-[300px] md:min-w-[360px] max-w-md flex items-center justify-between gap-4 px-5 py-3.5 rounded-xl shadow-2xl border animate-slide-in-down ${
          toast.type === "success" 
            ? "bg-[#122D23]/95 border-[#00C88A]/30 text-[#00C88A]" 
            : "bg-[#2D1E1E]/95 border-red-500/20 text-[#E74C4C]"
        }`}>
          <div className="flex items-center gap-2.5">
            {toast.type === "success" ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
            <span className="text-xs sm:text-sm font-bold tracking-wide">{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(prev => ({ ...prev, show: false }))}
            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-md text-[10px] font-black uppercase tracking-wider text-white transition-colors shrink-0 border border-white/5 active:scale-95"
          >
            OK
          </button>
        </div>
      )}

      <AiOnboardingChat
        isOpen={isAiOnboardingOpen}
        onClose={() => setIsAiOnboardingOpen(false)}
        onProjectCreated={fetchProjectsAndUsers}
        usersList={usersList}
        currentUser={user}
      />

    </PageShell>
  );
}


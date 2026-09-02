import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { PageShell } from "../../components/layout/PageShell";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../services/apiClient";
import type { User } from "../../types";
import { SkeletonLoader } from "../../components/ui/SkeletonLoader";
import gsap from "gsap";
import { formatDate, formatHours } from "../../utils/formatters";
import { Calendar, Users, Shield, Clock, Plus, BarChart3, Activity, ChevronLeft, X, CheckCircle2, AlertCircle, Trash2, FolderKanban, Maximize2, Minimize2, FileText } from "lucide-react";
import { ProjectContractModal } from "../../components/contract/ProjectContractModal";

interface GanttItem {
  id: string;
  label: string;
  sublabel: string;
  startWeek: number;
  durationWeeks: number;
  progress: number;
  status: "COMPLETED" | "IN_PROGRESS" | "PENDING" | "OVERDUE";
}

export function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState<any | null>(null);
  const [projectMilestones, setProjectMilestones] = useState<any[]>([]);
  const [projectTrlHistory, setProjectTrlHistory] = useState<any[]>([]);
  const [projectHoursTotal, setProjectHoursTotal] = useState(0);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal and state hooks
  const [isEditMembersOpen, setIsEditMembersOpen] = useState(false);
  const [editingMemberIds, setEditingMemberIds] = useState<string[]>([]);
  const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success"
  });

  const fetchProjectData = async () => {
    try {
      const [projDetail, trlData, hoursData, userData] = await Promise.all([
        apiRequest<{ project: any }>(`/projects/${id}`),
        apiRequest<{ trlHistory: any[] }>(`/projects/${id}/trl`).catch(() => ({ trlHistory: [] })),
        apiRequest<{ logs: any[] }>(`/hours/project/${id}`).catch(() => ({ logs: [] })),
        apiRequest<{ users: any[] }>("/users")
      ]);
      setProject(projDetail.project);
      setProjectMilestones(projDetail.project.milestones || []);
      setProjectTrlHistory(trlData.trlHistory || []);
      
      const hoursSum = hoursData.logs.reduce((sum: number, log: any) => sum + Number(log.hours), 0);
      setProjectHoursTotal(hoursSum);
      setUsersList(userData.users);
    } catch (err) {
      console.error("Failed to load project detail:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchProjectData();
    }
  }, [id]);

  const [ganttView, setGanttView] = useState<"trl" | "tasks">("trl");
  const [isGanttExpanded, setIsGanttExpanded] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsGanttExpanded(false);
      }
    };
    if (isGanttExpanded) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isGanttExpanded]);

  useEffect(() => {
    if (loading || !project) return;

    // Animate panels
    gsap.fromTo(".detail-card-animate",
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: "power2.out", delay: 0.05 }
    );
  }, [loading, project]);

  useEffect(() => {
    if (loading || !project) return;

    // Slide-expand Gantt task bars on load or view toggle
    const bars = document.querySelectorAll(".gantt-bar");
    if (bars.length > 0) {
      gsap.fromTo(bars,
        { width: "0%", opacity: 0 },
        {
          width: (i, el) => el.getAttribute("data-width") || "0%",
          opacity: 1,
          duration: 0.8,
          stagger: 0.08,
          ease: "power2.out",
          delay: 0.3
        }
      );
    }
  }, [loading, project, ganttView, isGanttExpanded]);

  if (loading) {
    return (
      <PageShell title="Project Details" eyebrow="Overview">
        <SkeletonLoader variant="project-detail" />
      </PageShell>
    );
  }

  if (!project) {
    return <EmptyState title="Project not found" message="The requested project is not available in the database." />;
  }

  // Get project manager details
  const manager = project.manager;
  // Get team member details
  const teamMembers = project.members || [];

  const handleOpenEditMembers = () => {
    if (!project) return;
    setEditingMemberIds(project.memberIds || []);
    setIsEditMembersOpen(true);
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!project) return;
    if (memberId === project.managerId) {
      triggerToast("Cannot remove the project manager.", "error");
      return;
    }
    
    try {
      await apiRequest(`/projects/${project.id}/members/${memberId}`, {
        method: "DELETE"
      });
      triggerToast("Member removed from team successfully!", "success");
      fetchProjectData();
    } catch (err) {
      console.error("Failed to remove member:", err);
      triggerToast("Failed to remove member.", "error");
    }
  };

  const handleAddMember = async (memberId: string) => {
    if (!project) return;

    try {
      await apiRequest(`/projects/${project.id}/members`, {
        method: "POST",
        body: JSON.stringify({ userId: memberId })
      });
      const addedUser = usersList.find(u => u.id === memberId);
      triggerToast(`${addedUser?.name || "Member"} added to team successfully!`, "success");
      fetchProjectData();
    } catch (err) {
      console.error("Failed to add member:", err);
      triggerToast("Failed to add member to team.", "error");
    }
  };

  const handleToggleMember = (userId: string) => {
    setEditingMemberIds(prev => 
      prev.includes(userId) ? prev.filter(uid => uid !== userId) : [...prev, userId]
    );
  };

  const handleSaveMembers = async () => {
    if (!project) return;
    
    try {
      const existingMemberIds = project.memberIds || [];
      const added = editingMemberIds.filter((id: string) => !existingMemberIds.includes(id));
      const removed = existingMemberIds.filter((id: string) => !editingMemberIds.includes(id) && id !== project.managerId && id !== project.createdBy);

      const addPromises = added.map((mId: string) =>
        apiRequest(`/projects/${project.id}/members`, {
          method: "POST",
          body: JSON.stringify({ userId: mId })
        })
      );

      const removePromises = removed.map((mId: string) =>
        apiRequest(`/projects/${project.id}/members/${mId}`, {
          method: "DELETE"
        })
      );

      await Promise.all([...addPromises, ...removePromises]);

      triggerToast("Project team members updated successfully!", "success");
      setIsEditMembersOpen(false);
      fetchProjectData();
    } catch (err) {
      console.error("Failed to update members:", err);
      triggerToast("Failed to update project team allocation.", "error");
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    if (window.confirm(`Are you sure you want to permanently delete the project "${project.name}"? This will delete all associated milestones, Kanban boards, tasks, and hour logs. This action cannot be undone.`)) {
      try {
        await apiRequest(`/projects/${project.id}/force`, {
          method: "DELETE"
        });
        triggerToast(`Project "${project.name}" permanently deleted.`, "success");
        navigate("/projects");
      } catch (err) {
        console.error("Failed to delete project:", err);
        triggerToast("Failed to delete project.", "error");
      }
    }
  };

  const triggerToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3500);
  };

  // Helper to determine milestone status styling
  const getMilestoneStatus = (status: string, dueDate: string) => {
    const isOverdue = new Date(dueDate) < new Date() && status !== "COMPLETED";
    if (isOverdue) return { label: "Overdue", bg: "bg-red-950/40 border-red-900 text-status-danger", ribbon: "bg-status-danger" };
    if (status === "COMPLETED") return { label: "Completed", bg: "bg-green-950/40 border-green-900 text-status-success", ribbon: "bg-status-success" };
    if (status === "IN_PROGRESS") return { label: "In Progress", bg: "bg-amber-950/40 border-amber-900 text-status-warning", ribbon: "bg-status-warning" };
    return { label: "Pending", bg: "bg-slate-900/40 border-border text-text-muted", ribbon: "bg-status-neutral" };
  };

  const projectCards = project?.columns ? (project.columns as any[]).flatMap(col => col.cards.map((c: any) => ({ ...c, columnTitle: col.title }))) : [];

  // helper to get dynamic values for TRL gantt items
  const getLiveTrlStatsForPhase = (lvl: number): { progress: number; status: "COMPLETED" | "IN_PROGRESS" | "PENDING" | "OVERDUE" } => {
    if (!project) return { progress: 0, status: "PENDING" };
    const levelCards = projectCards.filter(c => c.trlLevel === lvl);
    if (levelCards.length === 0) {
      const completed = project.currentTRL >= lvl;
      return {
        progress: completed ? 100 : 0,
        status: (completed ? "COMPLETED" : "PENDING") as "COMPLETED" | "PENDING"
      };
    }
    const completedTasks = levelCards.filter(c => 
      c.columnId === "column-done" || 
      c.columnTitle?.toLowerCase() === "completed" ||
      c.columnTitle?.toLowerCase() === "done"
    ).length;
    const progress = Math.round((completedTasks / levelCards.length) * 100);
    const status = (progress === 100 ? "COMPLETED" : progress > 0 || project.currentTRL === lvl ? "IN_PROGRESS" : "PENDING") as "COMPLETED" | "IN_PROGRESS" | "PENDING";
    return { progress, status };
  };

  const trlGanttData: GanttItem[] = [
    {
      id: "trl-1",
      label: "TRL 1: Basic Principles",
      sublabel: "Scientific research findings translated to basic principles.",
      startWeek: 0,
      durationWeeks: 1.5,
      ...getLiveTrlStatsForPhase(1)
    },
    {
      id: "trl-2",
      label: "TRL 2: Concept Formulated",
      sublabel: "Practical applications and initial design concepts mapped.",
      startWeek: 1.5,
      durationWeeks: 2,
      ...getLiveTrlStatsForPhase(2)
    },
    {
      id: "trl-3",
      label: "TRL 3: Proof of Concept",
      sublabel: "Analytical and laboratory studies to validate predictions.",
      startWeek: 3.5,
      durationWeeks: 2,
      ...getLiveTrlStatsForPhase(3)
    },
    {
      id: "trl-4",
      label: "TRL 4: Lab Validation",
      sublabel: "System components integrated and verified in laboratory setup.",
      startWeek: 5.5,
      durationWeeks: 2.5,
      ...getLiveTrlStatsForPhase(4)
    },
  ];

  const tasksGanttData: GanttItem[] = projectCards.length > 0 
    ? projectCards.slice(0, 8).map((card, idx) => {
        const isCompleted = card.columnId === "column-done" || card.columnTitle?.toLowerCase() === "completed" || card.columnTitle?.toLowerCase() === "done";
        const isInProgress = card.columnTitle?.toLowerCase() === "in progress" || card.columnTitle?.toLowerCase() === "in review";
        return {
          id: card.id,
          label: card.title,
          sublabel: card.description || "No description provided.",
          startWeek: idx * 0.8,
          durationWeeks: 1.5,
          progress: isCompleted ? 100 : isInProgress ? 50 : 0,
          status: isCompleted ? "COMPLETED" : isInProgress ? "IN_PROGRESS" : "PENDING"
        };
      })
    : [
        {
          id: "gt-none",
          label: "No Tasks Created",
          sublabel: "Go to the Kanban board to create tasks.",
          startWeek: 0,
          durationWeeks: 8,
          progress: 0,
          status: "PENDING"
        }
      ];

  const activeGanttData = ganttView === "trl" ? trlGanttData : tasksGanttData;

  return (
    <PageShell title={project.name} eyebrow="Project detail">
      {/* Premium Back Button */}
      <div className="-mt-3 mb-4">
        <Link
          to="/projects"
          className="group inline-flex items-center gap-1 text-xs font-bold text-text-muted hover:text-teal transition-colors"
        >
          <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Projects
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Columns - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Project Overview Card */}
          <div className="rounded-2xl bg-navy-surface p-6 shadow-lg border-0 detail-card-animate opacity-0">
            <h3 className="text-xs font-bold uppercase tracking-widest text-teal border-b border-[#1B2A3F] border-dashed pb-4">
              Overview
            </h3>
            <p className="mt-4 text-sm text-text-muted leading-relaxed">
              {project.description}
            </p>
            
            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[#1B2A3F] border-dashed pt-6 text-xs text-text-muted">
              <div>
                <span className="block font-semibold text-white">Start Date</span>
                <span className="mt-1 flex items-center gap-1.5">
                  <Calendar size={13} className="text-teal" />
                  {formatDate(project.startDate)}
                </span>
              </div>
              <div>
                <span className="block font-semibold text-white">Project Status</span>
                <span className="mt-1 inline-flex items-center rounded bg-[#122D23] px-2 py-0.5 font-bold text-status-success uppercase tracking-wider">
                  {project.status}
                </span>
              </div>
            </div>

            {/* Project Contract Banner */}
            <div className="mt-6 flex items-center justify-between rounded-xl bg-[#0B1220] border border-[#1B2A3F] p-4 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-[#00e5c8]/10 border border-[#00e5c8]/25 text-[#00e5c8]">
                  <FileText size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#00e5c8] block">
                    Legal Engagement Agreement
                  </span>
                  <span className="text-xs font-bold text-white block">
                    Freelance Development Agreement &bull; $500.00 USD
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsContractModalOpen(true)}
                className="text-xs font-bold text-navy hover:text-navy px-3.5 py-1.5 rounded-lg bg-[#00e5c8] hover:bg-[#00b8a2] transition flex items-center gap-1.5 shadow-md shadow-[#00e5c8]/10"
              >
                <span>View & Download Contract</span> &rarr;
              </button>
            </div>
          </div>

          {/* Gantt Chart Timeline Card */}
          <div className="rounded-2xl bg-navy-surface p-6 shadow-lg border-0 detail-card-animate opacity-0">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#1B2A3F] border-dashed pb-4 mb-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-teal">
                  Project Gantt Timeline
                </h3>
                <p className="text-[10px] text-text-muted mt-1">Lifecycle planning & task progress</p>
              </div>

              <div className="flex items-center gap-2.5 self-start sm:self-auto">
                {/* View Toggle */}
                <div className="flex rounded-lg bg-[#0B1220] p-1 border border-[#1B2A3F]">
                  <button
                    onClick={() => setGanttView("trl")}
                    className={`rounded-md px-3 py-1 text-[10px] font-bold transition-all ${
                      ganttView === "trl"
                        ? "bg-teal text-navy shadow-md shadow-teal/20"
                        : "text-text-muted hover:text-white"
                    }`}
                  >
                    TRL Phases
                  </button>
                  <button
                    onClick={() => setGanttView("tasks")}
                    className={`rounded-md px-3 py-1 text-[10px] font-bold transition-all ${
                      ganttView === "tasks"
                        ? "bg-teal text-navy shadow-md shadow-teal/20"
                        : "text-text-muted hover:text-white"
                    }`}
                  >
                    Tasks & Milestones
                  </button>
                </div>

                {/* Fullscreen Expand Button */}
                <button
                  onClick={() => setIsGanttExpanded(true)}
                  className="p-1.5 rounded-lg bg-[#0B1220] border border-[#1B2A3F] text-text-muted hover:text-teal hover:border-teal/30 hover:shadow-lg hover:shadow-teal/5 active:scale-95 transition-all flex items-center gap-1.5"
                  title="Fullscreen View"
                >
                  <Maximize2 size={12} />
                  <span className="text-[9px] font-extrabold uppercase tracking-wider pr-1">Fullscreen</span>
                </button>
              </div>
            </div>

            {/* Gantt Scrollable Grid */}
            <div className="overflow-x-auto">
              <div className="min-w-[600px] select-none text-[10px] text-text-muted">
                {/* Timeline Header Row */}
                <div className="grid grid-cols-12 border-b border-[#1B2A3F] pb-2 font-bold uppercase tracking-wider text-center text-[9px]">
                  <div className="col-span-4 text-left pl-2">Item / Phase</div>
                  {/* Columns for weeks W1 to W8 */}
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="col-span-1 border-l border-[#1B2A3F] border-dashed pt-0.5">
                      W{i + 1}
                    </div>
                  ))}
                </div>

                {/* Month Indicators Overlay */}
                <div className="grid grid-cols-12 border-b border-[#1B2A3F] border-dashed py-1.5 text-center text-[8px] bg-[#0B1220]/40 font-bold">
                  <div className="col-span-4 text-left pl-2 text-text-muted">Calendar Month</div>
                  <div className="col-span-4 border-l border-[#1B2A3F] border-dashed text-teal uppercase">May 2026</div>
                  <div className="col-span-4 border-l border-[#1B2A3F] border-dashed text-teal uppercase">June 2026</div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-[#1B2A3F] divide-dashed relative">
                  {/* Vertical dashed background lines for columns */}
                  <div className="absolute inset-0 grid grid-cols-12 pointer-events-none">
                    <div className="col-span-4" />
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="col-span-1 border-l border-[#1B2A3F] border-dashed h-full" />
                    ))}
                  </div>

                  {activeGanttData.map((item) => {
                    // Start offset: 0-indexed week offset. We convert it to a percentage of the 8-week timeline (col-span-8).
                    const leftPct = (item.startWeek / 8) * 100;
                    const widthPct = (item.durationWeeks / 8) * 100;

                    return (
                      <div key={item.id} className="grid grid-cols-12 py-3.5 items-center relative hover:bg-[#1A2B42]/10 transition duration-200">
                        {/* Title and Detail */}
                        <div className="col-span-4 pr-4 z-10 pl-2">
                          <span className="font-bold text-white block truncate" title={item.label}>
                            {item.label}
                          </span>
                          <span className="text-[9px] text-text-muted mt-0.5 block truncate leading-tight" title={item.sublabel}>
                            {item.sublabel}
                          </span>
                        </div>

                        {/* Timeline Bar Section */}
                        <div className="col-span-8 relative h-6 w-full flex items-center">
                          {/* Horizontal Bar */}
                          <div
                            className="absolute h-3.5 rounded-full flex items-center overflow-hidden gantt-bar opacity-0"
                            data-width={`${widthPct}%`}
                            style={{
                              left: `${leftPct}%`,
                              width: "0%",
                            }}
                          >
                            {/* Background Bar */}
                            <div
                              className={`absolute inset-0 rounded-full ${
                                item.status === "COMPLETED"
                                  ? "bg-navy-elevated border border-[#1B2A3F]"
                                  : item.status === "IN_PROGRESS"
                                  ? "bg-teal/10 border border-teal/20"
                                  : item.status === "OVERDUE"
                                  ? "bg-status-danger/10 border border-status-danger/20"
                                  : "border border-dashed border-[#1B2A3F] bg-[#0B1220]"
                              }`}
                            />

                            {/* Completed Fill */}
                            {item.progress > 0 && (
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  item.status === "COMPLETED"
                                    ? "bg-[#1B2A3F]"
                                    : item.status === "IN_PROGRESS"
                                    ? "bg-teal shadow-[0_0_8px_rgba(0,229,200,0.5)]"
                                    : "bg-status-danger"
                                }`}
                                style={{ width: `${item.progress}%` }}
                              />
                            )}
                          </div>

                          {/* Hover Tooltip / Detail Flag */}
                          <div
                            className="absolute top-1/2 -translate-y-1/2 flex items-center group/tooltip"
                            style={{
                              left: `${leftPct + widthPct / 2}%`,
                            }}
                          >
                            {/* A tiny dot to anchor the group tooltip */}
                            <div className="h-1.5 w-1.5 rounded-full bg-transparent" />
                            
                            {/* Hover info badge */}
                            <div className="pointer-events-none opacity-0 group-hover/tooltip:opacity-100 absolute bottom-5 left-1/2 -translate-x-1/2 bg-[#0B1220] border border-[#1B2A3F] text-[8px] font-bold text-white px-2 py-1 rounded shadow-xl whitespace-nowrap z-50 transition duration-200">
                              <span className="text-teal font-extrabold">{item.progress}%</span> Completed • {item.durationWeeks} {item.durationWeeks === 1 ? "Week" : "Weeks"}
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Gantt Legend */}
            <div className="mt-4 flex items-center gap-4 text-[9px] text-text-muted justify-end border-t border-[#1B2A3F] border-dashed pt-3">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded bg-[#1B2A3F]" />
                Completed
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded bg-teal shadow shadow-teal/50 animate-pulse" />
                In Progress
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded border border-dashed border-[#1B2A3F]" />
                Pending
              </span>
            </div>

            {/* Go to Kanban Board Button */}
            <div className="mt-5 pt-4 border-t border-[#1B2A3F] border-dashed flex justify-between items-center">
              <span className="text-[9px] text-text-muted italic">Click Fullscreen to view task list details</span>
              <Link
                to={`/projects/${id}/kanban`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-teal to-teal-deep text-navy hover:shadow-lg hover:shadow-teal/20 active:scale-95 text-[10px] font-black uppercase tracking-wider rounded transition-all"
              >
                <FolderKanban size={12} className="text-navy" />
                <span>Go to Kanban Board</span>
              </Link>
            </div>
          </div>


          {/* Team Members List */}
          <div className={`rounded-2xl bg-navy-surface p-6 shadow-lg border-0 detail-card-animate opacity-0 ${isAddDropdownOpen ? "relative z-20" : "relative"}`}>
            <div className="flex items-center justify-between border-b border-[#1B2A3F] border-dashed pb-4 select-none">
              <h3 className="text-xs font-bold uppercase tracking-widest text-teal flex items-center gap-2">
                <Users size={16} />
                Team Members
              </h3>
              {user.role === "ADMIN" && (
                <button
                  onClick={handleOpenEditMembers}
                  className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-[#1A2B42]/40 text-teal border border-[#253347]/60 rounded hover:bg-[#1A2B42] hover:text-white transition"
                >
                  Manage Team
                </button>
              )}
            </div>
            <div className="mt-4 divide-y divide-[#1B2A3F] divide-dashed">
              {/* Manager Row */}
              {manager && (
                <div className="flex items-center justify-between py-3 first:pt-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1A2B42] border border-teal text-teal text-xs font-bold">
                      {manager.name.split(" ").map((n: string) => n[0]).join("")}
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-white">{manager.name}</span>
                      <span className="text-[10px] text-text-muted">{manager.email}</span>
                    </div>
                  </div>
                  <span className="rounded bg-[#2D2512] px-2 py-0.5 text-[9px] font-black text-status-warning uppercase tracking-wider flex items-center gap-1">
                    <Shield size={9} />
                    Project Manager
                  </span>
                </div>
              )}

              {/* Members Rows */}
              {teamMembers
                .filter((member: any) => member.id !== project.managerId)
                .map((member: any) => (
                  <div key={member.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1B2A3F] border border-border text-white text-xs font-bold">
                        {member.name.split(" ").map((n: string) => n[0]).join("")}
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-white">{member.name}</span>
                        <span className="text-[10px] text-text-muted">{member.email}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-[#1A2B42] px-2 py-0.5 text-[9px] font-bold text-teal uppercase tracking-wider">
                        Engineer
                      </span>
                      {user.role === "ADMIN" && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-1 rounded text-text-muted hover:text-status-danger hover:bg-status-danger/10 transition-colors"
                          title="Remove from project"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            {/* Admin Direct Add Member Section */}
            {user.role === "ADMIN" && (
              <div className="relative mt-4 pt-3 border-t border-[#1B2A3F] border-dashed">
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => setIsAddDropdownOpen(!isAddDropdownOpen)}
                    className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-teal hover:text-white transition-colors"
                  >
                    <Plus size={12} />
                    Add Member
                  </button>
                </div>
                
                {isAddDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-2 z-50 rounded-xl bg-[#121E30] border border-[#253347] p-2 shadow-2xl space-y-1 max-h-48 overflow-y-auto planka-scrollbar">
                    {usersList
                      .filter((u) => u.isActive && !project.memberIds.includes(u.id) && u.id !== project.managerId)
                      .length === 0 ? (
                        <div className="text-[10px] text-text-muted p-2 text-center">
                          All active users are already members of this project.
                        </div>
                      ) : (
                        usersList
                          .filter((u) => u.isActive && !project.memberIds.includes(u.id) && u.id !== project.managerId)
                          .map((u) => (
                            <button
                              key={u.id}
                              onClick={() => {
                                handleAddMember(u.id);
                                setIsAddDropdownOpen(false);
                              }}
                              className="w-full text-left flex items-center justify-between p-1.5 rounded hover:bg-[#1A2B42]/30 text-white transition-colors animate-fade-in"
                            >
                              <div>
                                <span className="text-[11px] font-bold block">{u.name}</span>
                                <span className="text-[8px] text-text-muted block">{u.email}</span>
                              </div>
                              <span className="text-[9px] font-bold text-teal uppercase tracking-wider">{u.role}</span>
                            </button>
                          ))
                      )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Milestones Card */}
          <div className="rounded-2xl bg-navy-surface p-6 shadow-lg border-0 detail-card-animate opacity-0">
            <h3 className="text-xs font-bold uppercase tracking-widest text-teal border-b border-[#1B2A3F] border-dashed pb-4">
              Milestones Timeline
            </h3>
            
            {projectMilestones.length === 0 ? (
              <p className="mt-4 text-xs text-text-muted">No milestones defined for this project.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {projectMilestones.map((milestone) => {
                  const statusInfo = getMilestoneStatus(milestone.status, milestone.dueDate);
                  return (
                    <Link
                      key={milestone.id}
                      to={`/projects/${id}/kanban`}
                      className="relative rounded-xl border border-[#1B2A3F] border-dashed bg-[#0B1220] p-4 pl-6 shadow hover:border-teal/30 hover:bg-navy-elevated transition duration-300 flex items-center justify-between cursor-pointer"
                    >
                      {/* Left Status Ribbon */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${statusInfo.ribbon}`} />

                      <div>
                        <h4 className="text-xs font-bold text-white">{milestone.name}</h4>
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-text-muted">
                          <Calendar size={11} className="text-teal" />
                          <span>Due {formatDate(milestone.dueDate)}</span>
                        </div>
                      </div>

                      <span className={`rounded border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${statusInfo.bg}`}>
                        {statusInfo.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* TRL Audit Log / History Card */}
          <div className="rounded-2xl bg-navy-surface p-6 shadow-lg border-0 detail-card-animate opacity-0">
            <h3 className="text-xs font-bold uppercase tracking-widest text-teal border-b border-[#1B2A3F] border-dashed pb-4 flex items-center gap-2">
              <Activity size={16} />
              TRL Progress Logs
            </h3>
            
            {projectTrlHistory.length === 0 ? (
              <p className="mt-4 text-xs text-text-muted">No TRL modifications recorded.</p>
            ) : (
              <div className="relative mt-6 pl-6 space-y-6">
                {/* Connector line */}
                <div className="absolute bottom-2 left-2.5 top-2 w-[1px] bg-[#1B2A3F]" />

                {projectTrlHistory.map((log) => {
                  const updater = usersList.find((u: any) => u.id === log.updatedBy);
                  return (
                    <div key={log.id} className="relative flex flex-col gap-1 text-xs">
                      {/* Timeline Bullet */}
                      <div className="absolute -left-6 flex h-5 w-5 items-center justify-center rounded-full bg-[#1A2B42] text-[8px] font-black text-teal ring-4 ring-[#121E30]">
                        T{log.trlLevel}
                      </div>

                      <div className="flex items-center gap-2 justify-between">
                        <span className="font-bold text-white">TRL {log.trlLevel} reached</span>
                        <span className="text-[9px] text-text-muted">{formatDate(log.recordedAt)}</span>
                      </div>
                      
                      <p className="text-[11px] text-text-muted italic mt-1 leading-relaxed bg-[#0B1220] p-3 rounded-lg border border-[#1B2A3F] border-dashed">
                        "{log.justification}"
                      </p>

                      <span className="text-[9px] text-text-muted self-end mt-1">
                        Updated by <strong className="text-white">{updater?.name ?? log.updatedBy}</strong>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Right Sidebar Column */}
        <div className="space-y-6">
          
          {/* TRL Level Banner Card */}
          <div className="rounded-2xl bg-navy-surface p-6 shadow-lg border-0 text-center detail-card-animate opacity-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Current TRL</h3>
            <div className="mt-6 flex flex-col items-center justify-center">
              {/* Dial Layout */}
              <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-4 border-[#1B2A3F] shadow-lg shadow-black/20">
                <span className="text-5xl font-black text-white">{project.currentTRL}</span>
                <span className="absolute bottom-3 text-[10px] font-black text-text-muted">OF 9</span>
              </div>
              
              <div className="mt-6 w-full">
                {/* Horizontal Segment Bar */}
                <div className="flex gap-1 justify-between h-1.5">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-full flex-grow rounded-full ${
                        i < project.currentTRL ? "bg-teal shadow-md shadow-teal/50" : "bg-[#1B2A3F]"
                      }`}
                    />
                  ))}
                </div>
                <div className="mt-2.5 flex justify-between text-[8px] font-bold text-text-muted">
                  <span>STAGE 1</span>
                  <span>STAGE 9</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics (Hours) */}
          <div className="rounded-2xl bg-navy-surface p-6 shadow-lg border-0 detail-card-animate opacity-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Invested Effort</h3>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-4xl font-black text-white">{formatHours(projectHoursTotal)}</span>
              <span className="text-[10px] text-text-muted flex items-center gap-1">
                <Clock size={11} className="text-teal" />
                total logged
              </span>
            </div>
            <div className="mt-4 h-1.5 w-full rounded-full bg-[#1B2A3F] overflow-hidden">
              <div className="h-full bg-teal" style={{ width: `${Math.min((projectHoursTotal / 100) * 100, 100)}%` }} />
            </div>
          </div>

          {/* Actions & Links */}
          <div className="rounded-2xl bg-navy-surface p-6 shadow-lg border-0 space-y-3 detail-card-animate opacity-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted border-b border-[#1B2A3F] border-dashed pb-3 mb-4">
              Project Actions
            </h3>
            
            <Link to={`/log-hours?project=${project.id}`} className="block">
              <Button className="w-full flex items-center justify-center gap-2">
                <Plus size={16} />
                Log Hours
              </Button>
            </Link>

            <Link to={`/projects/${project.id}/kanban`} className="block">
              <Button variant="secondary" className="w-full flex items-center justify-center gap-2">
                <BarChart3 size={16} className="text-teal" />
                Kanban Tasks
              </Button>
            </Link>

            <Button 
              onClick={() => setIsContractModalOpen(true)}
              variant="secondary" 
              className="w-full flex items-center justify-center gap-2 border-[#00e5c8]/30 hover:border-[#00e5c8]/60 hover:bg-[#00e5c8]/10 text-[#00e5c8] transition-all font-bold"
            >
              <FileText size={16} className="text-[#00e5c8]" />
              Project Agreement
            </Button>

            {(user.role === "ADMIN" || user.role === "MANAGER" || project.managerId === user.id) && (
              <Link to={`/projects/${project.id}/hours`} className="block">
                <Button variant="secondary" className="w-full flex items-center justify-center gap-2">
                  <Clock size={16} className="text-teal" />
                  Project Efforts
                </Button>
              </Link>
            )}

            {user.role === "ADMIN" && (
              <Button 
                onClick={handleDeleteProject}
                variant="secondary"
                className="w-full flex items-center justify-center gap-2 border-red-500/30 hover:border-red-500/50 hover:bg-red-950/20 text-red-400 hover:text-red-300 transition-all font-bold"
              >
                <Trash2 size={16} className="text-red-400" />
                Delete Project
              </Button>
            )}
          </div>

        </div>
      </div>

      {/* MODAL OVERLAY: EDIT MEMBERS */}
      {isEditMembersOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#080f1f]/85 backdrop-blur-xs select-none">
          <div className="relative max-w-sm w-full bg-[#121E30] border border-[#253347] rounded-[20px] p-6 shadow-2xl space-y-5 animate-scale-up text-white">
            
            {/* Close */}
            <button
              onClick={() => {
                setIsEditMembersOpen(false);
              }}
              className="absolute top-4 right-4 text-text-muted hover:text-white transition"
            >
              <X size={16} />
            </button>

            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">Allocate Team Members</h3>
              <p className="text-[10px] text-text-muted mt-0.5">Toggle development staff assignment to project tracks</p>
            </div>

            <div className="space-y-3.5 max-h-48 overflow-y-auto planka-scrollbar pr-1 pt-1">
              {usersList.map((u) => {
                const isLead = project.managerId === u.id;
                
                return (
                  <label key={u.id} className="flex items-center justify-between gap-2.5 cursor-pointer p-1.5 rounded hover:bg-[#1A2B42]/30 select-none">
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={editingMemberIds.includes(u.id) || isLead}
                        disabled={isLead}
                        onChange={() => handleToggleMember(u.id)}
                        className="rounded border-[#253347] text-teal focus:ring-teal bg-[#08101f] h-3.5 w-3.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      />
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold text-white block leading-tight">{u.name}</span>
                        <span className="text-[8px] text-text-muted block leading-none">{u.email}</span>
                      </div>
                    </div>
                    {isLead && (
                      <span className="text-[8px] font-black uppercase tracking-widest text-teal bg-teal/10 px-1.5 py-0.5 rounded border border-teal/25">Lead</span>
                    )}
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-border border-dashed">
              <button 
                type="button" 
                onClick={() => {
                  setIsEditMembersOpen(false);
                }} 
                className="h-9 px-4 rounded bg-[#1A2B42] hover:bg-[#253347] text-xs font-bold uppercase tracking-wider text-white transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveMembers}
                className="h-9 px-4 rounded bg-teal hover:bg-[#00B8A2] text-xs font-bold uppercase tracking-wider text-navy transition"
              >
                Save Allocation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Gantt Chart Modal */}
      {isGanttExpanded && project && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in text-white"
          onClick={() => setIsGanttExpanded(false)}
        >
          <div 
            className="relative w-full max-w-6xl bg-[#121E30] border border-[#253347] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] pointer-events-auto animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#253347] flex-shrink-0">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <BarChart3 size={18} className="text-[#00e5c8]" />
                  <span>Project Gantt Timeline — Fullscreen View</span>
                </h3>
                <p className="text-[10px] text-text-muted mt-0.5 font-bold uppercase tracking-wider">
                  Lifecycle planning & task progress for {project.name}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {/* View Selector inside Modal */}
                <div className="flex rounded-lg bg-[#0B1220] p-1 border border-[#1B2A3F]">
                  <button
                    onClick={() => setGanttView("trl")}
                    className={`rounded-md px-3 py-1.5 text-[10px] font-bold transition-all ${
                      ganttView === "trl"
                        ? "bg-teal text-navy shadow-md shadow-teal/20"
                        : "text-text-muted hover:text-white"
                    }`}
                  >
                    TRL Phases
                  </button>
                  <button
                    onClick={() => setGanttView("tasks")}
                    className={`rounded-md px-3 py-1.5 text-[10px] font-bold transition-all ${
                      ganttView === "tasks"
                        ? "bg-teal text-navy shadow-md shadow-teal/20"
                        : "text-text-muted hover:text-white"
                    }`}
                  >
                    Tasks & Milestones
                  </button>
                </div>
                
                {/* Close Button */}
                <button
                  onClick={() => setIsGanttExpanded(false)}
                  className="text-text-muted hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition flex-shrink-0"
                >
                  <Minimize2 size={16} />
                </button>
              </div>
            </div>

            {/* Scrollable Gantt chart content wrapper */}
            <div className="p-8 overflow-y-auto flex-grow planka-scrollbar">
              <div className="min-w-[800px] select-none text-xs text-text-muted">
                {/* Timeline Header Row */}
                <div className="grid grid-cols-12 border-b border-[#1B2A3F] pb-3 font-bold uppercase tracking-wider text-center text-[10px]">
                  <div className="col-span-4 text-left pl-3 text-white text-sm">Item / Phase</div>
                  {/* Columns for weeks W1 to W8 */}
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="col-span-1 border-l border-[#1B2A3F] border-dashed pt-0.5 text-xs text-text-muted">
                      Week {i + 1}
                    </div>
                  ))}
                </div>

                {/* Month Indicators Overlay */}
                <div className="grid grid-cols-12 border-b border-[#1B2A3F] border-dashed py-2.5 text-center text-[9px] bg-[#0B1220]/40 font-bold">
                  <div className="col-span-4 text-left pl-3 text-text-muted uppercase">Calendar Month</div>
                  <div className="col-span-4 border-l border-[#1B2A3F] border-dashed text-teal uppercase">May 2026</div>
                  <div className="col-span-4 border-l border-[#1B2A3F] border-dashed text-teal uppercase">June 2026</div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-[#1B2A3F] divide-dashed relative">
                  {/* Vertical dashed background lines for columns */}
                  <div className="absolute inset-0 grid grid-cols-12 pointer-events-none">
                    <div className="col-span-4" />
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="col-span-1 border-l border-[#1B2A3F] border-dashed h-full" />
                    ))}
                  </div>

                  {activeGanttData.map((item) => {
                    const leftPct = (item.startWeek / 8) * 100;
                    const widthPct = (item.durationWeeks / 8) * 100;

                    return (
                      <div key={item.id} className="grid grid-cols-12 py-5 items-center relative hover:bg-[#1A2B42]/10 transition duration-200">
                        {/* Title and Detail */}
                        <div className="col-span-4 pr-6 z-10 pl-3">
                          <span className="font-extrabold text-sm text-white block truncate" title={item.label}>
                            {item.label}
                          </span>
                          <span className="text-xs text-text-muted mt-1 block truncate leading-relaxed" title={item.sublabel}>
                            {item.sublabel}
                          </span>
                        </div>

                        {/* Timeline Bar Section */}
                        <div className="col-span-8 relative h-8 w-full flex items-center">
                          {/* Horizontal Bar */}
                          <div
                            className="absolute h-5 rounded-full flex items-center overflow-hidden gantt-bar opacity-0 animate-fade-in"
                            data-width={`${widthPct}%`}
                            style={{
                              left: `${leftPct}%`,
                              width: `${widthPct}%`,
                              opacity: 1
                            }}
                          >
                            {/* Background Bar */}
                            <div
                              className={`absolute inset-0 rounded-full ${
                                item.status === "COMPLETED"
                                  ? "bg-navy-elevated border border-[#1B2A3F]"
                                  : item.status === "IN_PROGRESS"
                                  ? "bg-teal/15 border border-teal/30"
                                  : item.status === "OVERDUE"
                                  ? "bg-status-danger/15 border border-status-danger/35"
                                  : "border border-dashed border-[#1B2A3F] bg-[#0B1220]"
                              }`}
                            />

                            {/* Completed Fill */}
                            {item.progress > 0 && (
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  item.status === "COMPLETED"
                                    ? "bg-[#1B2A3F]"
                                    : item.status === "IN_PROGRESS"
                                    ? "bg-teal shadow-[0_0_12px_rgba(0,229,200,0.6)]"
                                    : "bg-status-danger"
                                }`}
                                style={{ width: `${item.progress}%` }}
                              />
                            )}
                          </div>

                          {/* Hover Tooltip / Detail Flag */}
                          <div
                            className="absolute top-1/2 -translate-y-1/2 flex items-center group/tooltip"
                            style={{
                              left: `${leftPct + widthPct / 2}%`,
                            }}
                          >
                            <div className="h-2 w-2 rounded-full bg-transparent" />
                            
                            <div className="pointer-events-none opacity-0 group-hover/tooltip:opacity-100 absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#0B1220] border border-[#1B2A3F] text-[9px] font-extrabold text-white px-2.5 py-1.5 rounded-md shadow-2xl whitespace-nowrap z-50 transition duration-200">
                              <span className="text-teal font-extrabold">{item.progress}%</span> Completed • {item.durationWeeks} {item.durationWeeks === 1 ? "Week" : "Weeks"}
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer / Legend */}
            <div className="px-6 py-4 bg-[#0B1220]/40 border-t border-[#253347] flex items-center justify-between flex-shrink-0 font-semibold">
              <span className="text-[10px] text-text-muted italic">Press Esc or click Minimize to exit fullscreen mode</span>
              <div className="flex items-center gap-5 text-xs text-text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded bg-[#1B2A3F]" />
                  Completed
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded bg-teal shadow shadow-teal/50 animate-pulse" />
                  In Progress
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded border border-dashed border-[#1B2A3F]" />
                  Pending
                </span>
              </div>
            </div>

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

      {/* Project Contract Modal */}
      <ProjectContractModal
        isOpen={isContractModalOpen}
        onClose={() => setIsContractModalOpen(false)}
        project={project}
      />
    </PageShell>
  );
}


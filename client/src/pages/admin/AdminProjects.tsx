import { useState, useEffect } from "react";
import { PageShell } from "../../components/layout/PageShell";
import { Button } from "../../components/ui/Button";
import { apiRequest } from "../../services/apiClient";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { 
  FolderKanban, 
  Plus, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Mail, 
  Calendar,
  Users,
  Shield,
  Trash2,
  Edit2,
  Sparkles
} from "lucide-react";
import type { Project, User } from "../../types";
import { SkeletonLoader } from "../../components/ui/SkeletonLoader";
import { AiOnboardingChat } from "../../components/ui/AiOnboardingChat";

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

export function AdminProjects() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
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

  // Modal control states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [projectStartDate, setProjectStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [projectStatus, setProjectStatus] = useState<"ACTIVE" | "COMPLETED" | "ARCHIVED">("ACTIVE");
  const [projectManagerId, setProjectManagerId] = useState("");
  const [projectMemberIds, setProjectMemberIds] = useState<string[]>([]);
  const [projectTrl, setProjectTrl] = useState("1");

  // Edit members modal state
  const [isEditMembersOpen, setIsEditMembersOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingMemberIds, setEditingMemberIds] = useState<string[]>([]);

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
      setProjectsList(projData.projects);
      setUsersList(userData.users);
    } catch (err) {
      console.error("Failed to load projects/users for admin:", err);
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

      triggerToast(`Project "${projectName}" created and configured successfully!`, "success");
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

  const handleDeleteProject = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently delete the project "${name}"? This will delete all associated milestones, Kanban boards, tasks, and hour logs. This action cannot be undone.`)) {
      try {
        await apiRequest(`/projects/${id}/force`, {
          method: "DELETE"
        });
        triggerToast(`Project "${name}" permanently deleted.`, "success");
        fetchProjectsAndUsers();
      } catch (err) {
        console.error("Failed to delete project:", err);
        triggerToast("Failed to delete project.", "error");
      }
    }
  };

  const handleOpenEditMembers = (project: any) => {
    setEditingProjectId(project.id);
    setEditingMemberIds(project.memberIds || []);
    setIsEditMembersOpen(true);
  };

  const handleSaveMembers = async () => {
    if (!editingProjectId) return;
    
    try {
      const project = projectsList.find(p => p.id === editingProjectId);
      if (!project) return;

      const existingMemberIds = project.memberIds || [];
      const added = editingMemberIds.filter((id: string) => !existingMemberIds.includes(id));
      const removed = existingMemberIds.filter((id: string) => !editingMemberIds.includes(id) && id !== project.managerId && id !== project.createdBy);

      const addPromises = added.map((mId: string) =>
        apiRequest(`/projects/${editingProjectId}/members`, {
          method: "POST",
          body: JSON.stringify({ userId: mId })
        })
      );

      const removePromises = removed.map((mId: string) =>
        apiRequest(`/projects/${editingProjectId}/members/${mId}`, {
          method: "DELETE"
        })
      );

      await Promise.all([...addPromises, ...removePromises]);

      triggerToast("Project members updated successfully!", "success");
      setIsEditMembersOpen(false);
      setEditingProjectId(null);
      fetchProjectsAndUsers();
    } catch (err) {
      console.error("Failed to update members:", err);
      triggerToast("Failed to update project team allocation.", "error");
    }
  };

  const handleToggleMember = (userId: string, isEditing: boolean) => {
    if (isEditing) {
      setEditingMemberIds(prev => 
        prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
      );
    } else {
      setProjectMemberIds(prev => 
        prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
      );
    }
  };

  const getManagerName = (managerId: string) => {
    const mgr = usersList.find(u => u.id === managerId);
    return mgr ? mgr.name : "Unassigned Manager";
  };

  if (loading) {
    return (
      <PageShell title="Project Directory" eyebrow="System Admin">
        <SkeletonLoader variant="projects" />
      </PageShell>
    );
  }

  return (
    <PageShell title="Project Directory" eyebrow="System Admin">
      <div className="space-y-6 select-none">
        
        {/* Header toolbar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#1B2A3F] border-dashed pb-6">
          <div>
            <h3 className="text-sm font-black text-white">Engineering Project Contracts</h3>
            <p className="text-xs text-text-muted mt-0.5">Start projects, assign lead managers, and allocate development teams</p>
          </div>

          <Button 
            onClick={() => {
              setCreationMode("CHOICE");
              setIsCreateOpen(true);
            }} 
            className="flex items-center gap-1.5 text-xs py-2 px-4 self-start sm:self-auto"
          >
            <Plus size={14} />
            Start Project
          </Button>
        </div>

        {/* Directory database list */}
        <div className="rounded-[20px] bg-[#121E30] border border-border p-6 shadow-md overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1B2A3F] text-text-muted font-bold uppercase tracking-wider">
                <th className="pb-3 pr-4">Project Title</th>
                <th className="pb-3 px-4">Allocated Lead Manager</th>
                <th className="pb-3 px-4 text-center">Engineers Size</th>
                <th className="pb-3 px-4 text-center">Current TRL</th>
                <th className="pb-3 px-4">Start Date</th>
                <th className="pb-3 px-4">Status</th>
                <th className="pb-3 pl-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1B2A3F]/50">
              {projectsList.map((p) => (
                <tr key={p.id} className="hover:bg-[#1A2B42]/10 transition duration-150">
                  
                  {/* Name (linking to workspace details) */}
                  <td className="py-3.5 pr-4 font-bold text-white whitespace-nowrap">
                    <Link to={`/projects/${p.id}`} className="hover:text-teal hover:underline flex items-center gap-1.5">
                      <FolderKanban size={14} className="text-teal/80" />
                      {p.name}
                    </Link>
                  </td>

                  {/* Manager */}
                  <td className="py-3.5 px-4 text-text-muted whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <Shield size={12} className="text-teal/70" />
                      {getManagerName(p.managerId)}
                    </span>
                  </td>

                  {/* Allocated members count */}
                  <td className="py-3.5 px-4 text-center font-bold text-white whitespace-nowrap">
                    {p.memberIds.length} members
                  </td>

                  {/* TRL Level */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <span className="rounded bg-[#0B1220] border border-[#253347] px-2.5 py-0.5 text-[10px] font-bold text-teal">
                      TRL {p.currentTRL}
                    </span>
                  </td>

                  {/* Start Date */}
                  <td className="py-3.5 px-4 text-text-muted whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-teal/70" />
                      {p.startDate}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className={`inline-block rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                      p.status === "ACTIVE"
                        ? "bg-[#122D23]/30 text-status-success border border-[#122D23]"
                        : p.status === "COMPLETED"
                        ? "bg-[#1A2B42]/30 text-teal border border-[#253347]"
                        : "bg-[#2D2D1E]/30 text-status-warning border border-[#2D2D1E]"
                    }`}>
                      {p.status}
                    </span>
                  </td>

                  {/* Actions buttons */}
                  <td className="py-3.5 pl-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEditMembers(p)}
                        className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-[#1A2B42]/40 text-teal border border-[#253347] rounded hover:bg-[#1A2B42]"
                        title="Manage Allocated Team"
                      >
                        Members
                      </button>
                      <button
                        onClick={() => handleDeleteProject(p.id, p.name)}
                        className="text-text-muted hover:text-status-danger p-1 rounded hover:bg-[#2D1E1E]/20 transition"
                        title="Delete project"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* MODAL OVERLAY: CREATE PROJECT */}
      {isCreateOpen && (
        <div className={`fixed inset-0 z-[9999] flex items-center justify-center bg-navy/80 backdrop-blur-xs select-none transition-all duration-300 ${
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
                              onChange={() => handleToggleMember(u.id, false)}
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
                          className="w-full h-9 rounded bg-[#08101f] border border-border px-3 text-xs font-semibold text-white outline-none focus:border-teal transition cursor-pointer"
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
                          className="w-full h-9 rounded bg-[#08101f] border border-border px-3 text-xs font-semibold text-white outline-none focus:border-teal transition cursor-pointer uppercase"
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
                          className="w-full h-9 rounded bg-[#08101f] border border-border px-3 text-xs font-semibold text-white outline-none focus:border-teal transition cursor-pointer"
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
                  <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)} className="text-xs py-2 px-4">
                    Cancel
                  </Button>
                  <Button type="submit" className="text-xs py-2 px-4 font-bold uppercase tracking-wider">
                    Create Project
                  </Button>
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

      {/* MODAL OVERLAY: EDIT MEMBERS */}
      {isEditMembersOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-navy/80 backdrop-blur-xs select-none">
          <div className="relative max-w-sm w-full bg-[#121E30] border border-[#253347] rounded-[20px] p-6 shadow-2xl space-y-5 animate-scale-up text-white">
            
            {/* Close */}
            <button
              onClick={() => {
                setIsEditMembersOpen(false);
                setEditingProjectId(null);
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
                const project = projectsList.find(p => p.id === editingProjectId);
                const isManager = project?.managerId === u.id;
                
                return (
                  <label key={u.id} className="flex items-center justify-between gap-2.5 cursor-pointer p-1.5 rounded hover:bg-[#1A2B42]/30 select-none">
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={editingMemberIds.includes(u.id) || isManager}
                        disabled={isManager}
                        onChange={() => handleToggleMember(u.id, true)}
                        className="rounded border-[#253347] text-teal focus:ring-teal bg-[#08101f] h-3.5 w-3.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      />
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold text-white block leading-tight">{u.name}</span>
                        <span className="text-[8px] text-text-muted block leading-none">{u.email}</span>
                      </div>
                    </div>
                    {isManager && (
                      <span className="text-[8px] font-black uppercase tracking-widest text-teal bg-teal/10 px-1.5 py-0.5 rounded border border-teal/25">Lead</span>
                    )}
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-border border-dashed">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => {
                  setIsEditMembersOpen(false);
                  setEditingProjectId(null);
                }} 
                className="text-xs py-2 px-4"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveMembers}
                className="text-xs py-2 px-4 font-bold uppercase tracking-wider"
              >
                Save Allocation
              </Button>
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

import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { PageShell } from "../../components/layout/PageShell";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../services/apiClient";
import type { Project, User, Milestone, Attachment } from "../../types";
import { SkeletonLoader } from "../../components/ui/SkeletonLoader";
import { formatDate } from "../../utils/formatters";
import { Calendar, Users, Shield, Plus, ChevronLeft, X, CheckCircle2, AlertCircle, Trash2, FolderKanban, FileText, Upload, Download, Building2 } from "lucide-react";
import { UserAvatar } from "../../components/ui/UserAvatar";

export function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [projectMilestones, setProjectMilestones] = useState<Milestone[]>([]);
  const [projectFiles, setProjectFiles] = useState<Attachment[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Team Member Management states
  const [isEditMembersOpen, setIsEditMembersOpen] = useState(false);
  const [editingMemberIds, setEditingMemberIds] = useState<string[]>([]);
  const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);

  // New Milestone Modal
  const [isNewMilestoneOpen, setIsNewMilestoneOpen] = useState(false);
  const [milestoneName, setMilestoneName] = useState("");
  const [milestoneDueDate, setMilestoneDueDate] = useState("");

  const [uploading, setUploading] = useState(false);

  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success"
  });

  const fetchProjectData = async () => {
    try {
      const [projDetail, userData] = await Promise.all([
        apiRequest<{ project: Project }>(`/projects/${id}`),
        apiRequest<{ users: User[] }>("/users")
      ]);
      setProject(projDetail.project);
      setProjectMilestones(projDetail.project.milestones || []);
      setProjectFiles(projDetail.project.attachments || []);
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

  const triggerToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3500);
  };

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
      triggerToast(`${addedUser?.name || "Member"} added to team!`, "success");
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
      const added = editingMemberIds.filter((mId) => !existingMemberIds.includes(mId));
      const removed = existingMemberIds.filter((mId) => !editingMemberIds.includes(mId) && mId !== project.managerId && mId !== project.createdBy);

      const addPromises = added.map((mId) =>
        apiRequest(`/projects/${project.id}/members`, {
          method: "POST",
          body: JSON.stringify({ userId: mId })
        })
      );

      const removePromises = removed.map((mId) =>
        apiRequest(`/projects/${project.id}/members/${mId}`, {
          method: "DELETE"
        })
      );

      await Promise.all([...addPromises, ...removePromises]);

      triggerToast("Team allocation updated successfully!", "success");
      setIsEditMembersOpen(false);
      fetchProjectData();
    } catch (err) {
      console.error("Failed to update members:", err);
      triggerToast("Failed to update team allocation.", "error");
    }
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !milestoneName.trim() || !milestoneDueDate) return;

    try {
      await apiRequest(`/projects/${project.id}/milestones`, {
        method: "POST",
        body: JSON.stringify({
          name: milestoneName.trim(),
          dueDate: milestoneDueDate,
        }),
      });

      triggerToast("Milestone created successfully!", "success");
      setIsNewMilestoneOpen(false);
      setMilestoneName("");
      setMilestoneDueDate("");
      fetchProjectData();
    } catch (err) {
      console.error("Failed to create milestone:", err);
      triggerToast("Failed to create milestone.", "error");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !project) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        await apiRequest("/upload", {
          method: "POST",
          body: JSON.stringify({
            filename: file.name,
            content: base64,
            projectId: project.id,
          }),
        });
        triggerToast("File uploaded successfully!", "success");
        fetchProjectData();
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("File upload failed:", err);
      triggerToast("Failed to upload file.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    if (window.confirm(`Are you sure you want to permanently delete "${project.name}"? This action cannot be undone.`)) {
      try {
        await apiRequest(`/projects/${project.id}`, {
          method: "DELETE"
        });
        triggerToast(`Project "${project.name}" deleted.`, "success");
        navigate("/projects");
      } catch (err) {
        console.error("Failed to delete project:", err);
        triggerToast("Failed to delete project.", "error");
      }
    }
  };

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

  const manager = project.manager;
  const teamMembers = project.members || [];
  const isOwnerOrPM = user?.role === "OWNER" || user?.role === "PROJECT_MANAGER";

  return (
    <PageShell title={project.name} eyebrow={`Client: ${project.clientName}`}>
      {/* Back Button */}
      <div className="-mt-3 mb-6 flex items-center justify-between">
        <Link
          to="/projects"
          className="group inline-flex items-center gap-1.5 text-xs font-bold text-[#888888] hover:text-[#c8ff00] transition"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Projects</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to={`/projects/${project.id}/kanban`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-[#c8ff00] text-[#080808] hover:bg-[#b2e600] font-bold text-xs shadow-lg shadow-[#c8ff00]/20 transition"
          >
            <FolderKanban size={15} />
            <span>Open Kanban Board</span>
          </Link>

          {isOwnerOrPM && (
            <button
              onClick={handleDeleteProject}
              className="p-2 rounded bg-[#111111] border border-[#222222] text-[#888888] hover:text-red-400 hover:border-red-500/30 transition cursor-pointer"
              title="Delete Project"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Columns: Overview, Milestones, Files */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Overview Card */}
          <div className="bg-[#111111] border border-[#222222] rounded p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#222222] pb-4 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#c8ff00] font-display">
                Project Overview & Scope
              </h3>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                {project.status}
              </span>
            </div>

            <p className="text-sm text-[#888888] leading-relaxed">
              {project.description}
            </p>
            
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-[#222222] pt-5 text-xs">
              <div>
                <span className="block font-semibold text-[#f0ede6]">Client Account</span>
                <span className="mt-1 text-[#888888] flex items-center gap-1.5">
                  <Building2 size={14} className="text-[#c8ff00]" />
                  {project.clientName}
                </span>
              </div>

              <div>
                <span className="block font-semibold text-[#f0ede6]">Start Date</span>
                <span className="mt-1 text-[#888888] flex items-center gap-1.5">
                  <Calendar size={14} className="text-[#c8ff00]" />
                  {formatDate(project.startDate)}
                </span>
              </div>

              <div>
                <span className="block font-semibold text-[#f0ede6]">Target Deadline</span>
                <span className="mt-1 text-[#888888] flex items-center gap-1.5">
                  <Calendar size={14} className="text-[#c8ff00]" />
                  {project.deadline ? formatDate(project.deadline) : "Flexible"}
                </span>
              </div>
            </div>
          </div>

          {/* Milestones Card */}
          <div className="bg-[#111111] border border-[#222222] rounded p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#222222] pb-4 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#c8ff00] font-display">
                Deliverable Milestones
              </h3>

              {isOwnerOrPM && (
                <button
                  onClick={() => setIsNewMilestoneOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#f0ede6] hover:text-[#c8ff00] transition"
                >
                  <Plus size={14} />
                  <span>Add Milestone</span>
                </button>
              )}
            </div>
            
            {projectMilestones.length === 0 ? (
              <p className="text-xs text-[#888888] py-4 text-center">No milestones defined yet.</p>
            ) : (
              <div className="space-y-3">
                {projectMilestones.map((ms) => {
                  const isCompleted = ms.status === "COMPLETED";
                  return (
                    <div
                      key={ms.id}
                      className="p-3.5 rounded bg-[#181818] border border-[#222222] flex items-center justify-between hover:border-[#c8ff00]/30 transition"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-[#f0ede6]">{ms.name}</h4>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-[#888888]">
                          <Calendar size={12} className="text-[#c8ff00]" />
                          <span>Due {formatDate(ms.dueDate)}</span>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isCompleted
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {ms.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Project Files Card */}
          <div className="bg-[#111111] border border-[#222222] rounded p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#222222] pb-4 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#c8ff00] font-display flex items-center gap-2">
                <FileText size={15} />
                Project Assets & Files
              </h3>

              <label className="cursor-pointer flex items-center gap-1.5 text-xs font-bold text-[#f0ede6] hover:text-[#c8ff00] transition">
                <Upload size={14} />
                <span>Upload File</span>
                <input type="file" onChange={handleFileUpload} disabled={uploading} className="hidden" />
              </label>
            </div>

            {projectFiles.length === 0 ? (
              <p className="text-xs text-[#888888] py-4 text-center">No assets uploaded for this project yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {projectFiles.map((f) => (
                  <div
                    key={f.id}
                    className="p-3 rounded bg-[#181818] border border-[#222222] flex items-center justify-between gap-3 hover:border-[#c8ff00]/30 transition"
                  >
                    <div className="truncate">
                      <p className="text-xs font-bold text-[#f0ede6] truncate" title={f.name}>{f.name}</p>
                      <span className="text-[10px] text-[#888888]">
                        {(f.size / 1024).toFixed(1)} KB • {new Date(f.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <a
                      href={f.url}
                      download={f.name}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-[#111111] text-[#888888] hover:text-[#c8ff00] transition shrink-0"
                      title="Download"
                    >
                      <Download size={14} />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Progress & Team Members */}
        <div className="space-y-6">
          
          {/* Progress Card */}
          <div className="bg-[#111111] border border-[#222222] rounded p-6 shadow-xl text-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#888888]">Overall Progress</h3>
            <div className="mt-4 flex flex-col items-center justify-center">
              <span className="text-4xl font-extrabold text-[#f0ede6] font-display">
                {project.progressPercent || 0}%
              </span>
              <p className="text-xs text-[#888888] mt-1">
                {project.completedTasks || 0} of {project.totalTasks || 0} deliverables completed
              </p>

              <div className="mt-4 w-full h-2 rounded bg-[#181818] overflow-hidden border border-[#222222]">
                <div
                  className="h-full bg-[#c8ff00] transition-all duration-500"
                  style={{ width: `${project.progressPercent || 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Team Allocation Card */}
          <div className="bg-[#111111] border border-[#222222] rounded p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#222222] pb-4 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#c8ff00] font-display flex items-center gap-2">
                <Users size={15} />
                Project Team
              </h3>
              {isOwnerOrPM && (
                <button
                  onClick={handleOpenEditMembers}
                  className="text-xs font-bold text-[#888888] hover:text-[#c8ff00] transition"
                >
                  Manage
                </button>
              )}
            </div>

            <div className="divide-y divide-[#222222]">
              {/* Project Lead */}
              {manager && (
                <div className="py-3 first:pt-0 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <UserAvatar name={manager.name} avatarUrl={manager.avatarUrl} size="sm" />
                    <div className="min-w-0">
                      <span className="block text-xs font-bold text-[#f0ede6] truncate">{manager.name}</span>
                      <span className="text-[10px] text-[#888888] block truncate">{manager.email}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#181818] text-[#c8ff00] border border-[#222222] shrink-0">
                    Manager
                  </span>
                </div>
              )}

              {/* Members */}
              {teamMembers
                .filter((m) => m.id !== project.managerId)
                .map((m) => (
                  <div key={m.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar name={m.name} avatarUrl={m.avatarUrl} size="sm" />
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-[#f0ede6] truncate">{m.name}</span>
                        <span className="text-[10px] text-[#888888] block truncate">{m.email}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#181818] text-[#888888] border border-[#222222]">
                        Member
                      </span>
                      {isOwnerOrPM && (
                        <button
                          onClick={() => handleRemoveMember(m.id)}
                          className="p-1 rounded text-[#888888] hover:text-red-400 transition cursor-pointer"
                          title="Remove from team"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Add Milestone */}
      {isNewMilestoneOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111111] border border-[#222222] rounded max-w-md w-full p-6 shadow-2xl animate-scale-up text-[#f0ede6]">
            <h3 className="text-base font-bold font-display mb-1">Add Deliverable Milestone</h3>
            <p className="text-xs text-[#888888] mb-4">Set a major checkpoint and target due date for this project.</p>

            <form onSubmit={handleCreateMilestone} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#888888] mb-1.5">
                  Milestone Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design Prototype Review"
                  value={milestoneName}
                  onChange={(e) => setMilestoneName(e.target.value)}
                  className="h-12 w-full rounded border border-[#262626] bg-[#161616] px-3.5 text-xs font-semibold text-white outline-none focus:border-[#c8ff00] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#888888] mb-1.5">
                  Due Date
                </label>
                <input
                  type="date"
                  required
                  value={milestoneDueDate}
                  onChange={(e) => setMilestoneDueDate(e.target.value)}
                  className="h-12 w-full rounded border border-[#262626] bg-[#161616] px-3.5 text-xs font-semibold text-white outline-none focus:border-[#c8ff00] transition cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewMilestoneOpen(false)}
                  className="px-4 py-2 rounded bg-[#181818] border border-[#222222] text-[#888888] hover:text-[#f0ede6] text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded bg-[#c8ff00] text-[#080808] hover:bg-[#b2e600] font-bold text-xs shadow-lg shadow-[#c8ff00]/20 transition cursor-pointer"
                >
                  Create Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Manage Team Members */}
      {isEditMembersOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111111] border border-[#222222] rounded max-w-md w-full p-6 shadow-2xl animate-scale-up text-[#f0ede6]">
            <h3 className="text-base font-bold font-display mb-1">Manage Team Allocation</h3>
            <p className="text-xs text-[#888888] mb-4">Select team members who should have access to this project.</p>

            <div className="max-h-60 overflow-y-auto p-2 rounded bg-[#181818] border border-[#222222] space-y-1.5 mb-4">
              {usersList.map((u) => (
                <label key={u.id} className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-[#222222] select-none">
                  <input
                    type="checkbox"
                    checked={editingMemberIds.includes(u.id)}
                    onChange={() => handleToggleMember(u.id)}
                    className="rounded border-[#222222] text-[#c8ff00] focus:ring-[#c8ff00] bg-[#080808] h-3.5 w-3.5 cursor-pointer"
                  />
                  <UserAvatar name={u.name} avatarUrl={u.avatarUrl} size="xs" />
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-[#f0ede6] block truncate">{u.name}</span>
                    <span className="text-[10px] text-[#888888] block truncate">{u.email}</span>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditMembersOpen(false)}
                className="px-4 py-2 rounded bg-[#181818] border border-[#222222] text-[#888888] hover:text-[#f0ede6] text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMembers}
                className="px-5 py-2 rounded bg-[#c8ff00] text-[#080808] hover:bg-[#b2e600] font-bold text-xs shadow-lg shadow-[#c8ff00]/20 transition cursor-pointer"
              >
                Save Allocation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded shadow-2xl border ${
          toast.type === "success" ? "bg-[#111111] border-green-500/30 text-green-400" : "bg-[#111111] border-red-500/30 text-red-400"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}
    </PageShell>
  );
}

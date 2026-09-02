import { useState, useEffect } from "react";
import { PageShell } from "../../components/layout/PageShell";
import { apiRequest } from "../../services/apiClient";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { 
  FolderKanban, 
  Plus, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  Users,
  Shield,
  Trash2,
  Building2,
  ArrowRight
} from "lucide-react";
import type { Project, User } from "../../types";
import { SkeletonLoader } from "../../components/ui/SkeletonLoader";
import { CreateProjectWizard } from "../../components/ui/CreateProjectWizard";
import { UserAvatar } from "../../components/ui/UserAvatar";

export function AdminProjects() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Wizard state
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Edit members modal
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
        apiRequest<{ projects: Project[] }>("/projects"),
        apiRequest<{ users: User[] }>("/users")
      ]);
      setProjectsList(projData.projects);
      setUsersList(userData.users);
    } catch (err) {
      console.error("Failed to load projects:", err);
      triggerToast("Failed to fetch project listings.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectsAndUsers();
  }, []);

  const triggerToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3500);
  };

  const handleDeleteProject = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently delete "${name}"? This action cannot be undone.`)) {
      try {
        await apiRequest(`/projects/${id}`, { method: "DELETE" });
        setProjectsList(prev => prev.filter(p => p.id !== id));
        triggerToast(`Project "${name}" was deleted successfully.`);
      } catch (err) {
        console.error(err);
        triggerToast("Failed to delete project.", "error");
      }
    }
  };

  const handleToggleMember = (userId: string, isEditing: boolean) => {
    if (isEditing) {
      setEditingMemberIds(prev => 
        prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
      );
    }
  };

  const handleOpenEditMembers = (project: Project) => {
    setEditingProjectId(project.id);
    const existing = (project.members || []).map((m: any) => m.id || m.userId);
    setEditingMemberIds(existing);
    setIsEditMembersOpen(true);
  };

  const handleSaveMembers = async () => {
    if (!editingProjectId) return;
    try {
      await apiRequest(`/projects/${editingProjectId}/members/sync`, {
        method: "PUT",
        body: JSON.stringify({ userIds: editingMemberIds })
      });
      triggerToast("Project staff allocation saved successfully.");
      setIsEditMembersOpen(false);
      setEditingProjectId(null);
      fetchProjectsAndUsers();
    } catch (err) {
      console.error(err);
      triggerToast("Failed to save staff allocation.", "error");
    }
  };

  if (loading) {
    return (
      <PageShell title="Project Tracks" eyebrow="Agency Administration">
        <SkeletonLoader variant="table" />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Project Tracks"
      eyebrow="Agency Administration"
      actions={
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded bg-[#c8ff00] text-[#080808] hover:bg-[#b2e600] font-bold text-xs shadow-lg shadow-[#c8ff00]/20 transition cursor-pointer"
        >
          <Plus size={16} />
          <span>New Project Track</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Projects Master Table */}
        <div className="bg-[#111111] border border-[#222222] rounded overflow-hidden shadow-xl">
          <div className="p-4 border-b border-[#222222] flex items-center justify-between">
            <h3 className="text-sm font-bold font-display text-[#f0ede6]">Active & Archived Projects ({projectsList.length})</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#141414] text-[#888888] uppercase text-[11px] font-semibold border-b border-[#222222]">
                <tr>
                  <th className="py-3 px-4">Project / Client</th>
                  <th className="py-3 px-4">Manager</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Team</th>
                  <th className="py-3 px-4">Deliverables</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222] text-[#f0ede6]">
                {projectsList.map((project) => {
                  const manager = usersList.find(u => u.id === project.managerId) || (project as any).manager;
                  const members = project.members || [];
                  
                  return (
                    <tr key={project.id} className="hover:bg-[#181818]/60 transition">
                      <td className="py-3.5 px-4">
                        <Link to={`/projects/${project.id}`} className="font-bold text-white hover:text-[#c8ff00] transition block">
                          {project.name}
                        </Link>
                        <span className="text-[11px] text-[#888888] flex items-center gap-1 mt-0.5">
                          <Building2 size={11} className="text-[#888888]" />
                          {project.clientName || "Direct Client"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <UserAvatar name={manager?.name || "PM"} avatarUrl={manager?.avatarUrl} size="xs" />
                          <div>
                            <p className="text-xs font-medium text-[#f0ede6]">{manager?.name || "Unassigned"}</p>
                            <p className="text-[10px] text-[#888888]">{manager?.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          project.status === "ACTIVE" 
                            ? "bg-[#122D23] text-[#00C88A] border border-[#00C88A]/20" 
                            : "bg-[#181818] text-[#888888] border border-[#222222]"
                        }`}>
                          {project.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleOpenEditMembers(project)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#181818] border border-[#222222] hover:border-[#c8ff00]/40 text-xs text-[#888888] hover:text-[#f0ede6] transition cursor-pointer"
                        >
                          <Users size={12} className="text-[#c8ff00]" />
                          <span>{members.length} Assigned</span>
                        </button>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="w-32">
                          <div className="flex justify-between text-[10px] text-[#888888] mb-1">
                            <span>Progress</span>
                            <span className="font-bold text-[#f0ede6]">{project.progressPercent || 0}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-[#1e1e1e] rounded overflow-hidden">
                            <div 
                              className="h-full bg-[#c8ff00]" 
                              style={{ width: `${project.progressPercent || 0}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-2">
                        <Link
                          to={`/projects/${project.id}/kanban`}
                          className="inline-flex p-1.5 rounded bg-[#181818] text-[#c8ff00] hover:bg-[#c8ff00]/10 border border-[#222222] transition cursor-pointer"
                          title="Open Kanban Board"
                        >
                          <FolderKanban size={14} />
                        </Link>
                        <button
                          onClick={() => handleDeleteProject(project.id, project.name)}
                          className="p-1.5 rounded bg-[#181818] text-red-400 hover:bg-red-500/20 border border-[#222222] transition cursor-pointer"
                          title="Delete Project"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 1-Question-at-a-time Create Project Wizard */}
        <CreateProjectWizard
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onProjectCreated={() => {
            fetchProjectsAndUsers();
            triggerToast("Project track launched successfully!", "success");
          }}
        />

        {/* Modal: Edit Members */}
        {isEditMembersOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#111111] border border-[#222222] rounded max-w-md w-full p-6 shadow-2xl animate-scale-up text-[#f0ede6]">
              <h3 className="text-base font-bold font-display mb-1">Allocate Team Members</h3>
              <p className="text-xs text-[#888888] mb-4">Toggle staff assignment to this project track.</p>

              <div className="max-h-48 overflow-y-auto p-2 rounded bg-[#181818] border border-[#222222] space-y-1.5 mb-4">
                {usersList.map((u) => {
                  const proj = projectsList.find(p => p.id === editingProjectId);
                  const isManager = proj?.managerId === u.id;
                  
                  return (
                    <label key={u.id} className="flex items-center justify-between gap-2.5 cursor-pointer p-1.5 rounded hover:bg-[#222222] select-none">
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={editingMemberIds.includes(u.id) || isManager}
                          disabled={isManager}
                          onChange={() => handleToggleMember(u.id, true)}
                          className="rounded border-[#222222] text-[#c8ff00] focus:ring-[#c8ff00] bg-[#080808] h-3.5 w-3.5 cursor-pointer disabled:opacity-40"
                        />
                        <UserAvatar name={u.name} avatarUrl={u.avatarUrl} size="xs" />
                        <div className="min-w-0">
                          <span className="text-xs font-medium text-[#f0ede6] block truncate">{u.name}</span>
                          <span className="text-[10px] text-[#888888] block truncate">{u.email}</span>
                        </div>
                      </div>
                      {isManager && (
                        <span className="text-[9px] font-bold text-[#c8ff00] bg-[#111111] px-1.5 py-0.5 rounded border border-[#222222]">Lead</span>
                      )}
                    </label>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditMembersOpen(false);
                    setEditingProjectId(null);
                  }}
                  className="px-4 py-2 rounded bg-[#181818] border border-[#222222] text-[#888888] hover:text-[#f0ede6] text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMembers}
                  className="px-5 py-2 rounded bg-[#c8ff00] text-[#080808] hover:bg-[#b2e600] font-bold text-xs shadow-lg shadow-[#c8ff00]/20 transition cursor-pointer"
                >
                  Save Allocation
                </button>
              </div>
            </div>
          </div>
        )}

        {toast.show && (
          <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded shadow-2xl border ${
            toast.type === "success" ? "bg-[#111111] border-green-500/30 text-green-400" : "bg-[#111111] border-red-500/30 text-red-400"
          }`}>
            {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span className="text-xs font-semibold">{toast.message}</span>
          </div>
        )}
      </div>
    </PageShell>
  );
}

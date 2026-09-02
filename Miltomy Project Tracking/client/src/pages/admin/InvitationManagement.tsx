import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { apiRequest } from "../../services/apiClient";
import { useAuth } from "../../context/AuthContext";
import { PageShell } from "../../components/layout/PageShell";
import { Invitation, Project } from "../../types";
import { 
  Mail, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Loader2, 
  Send, 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Shield, 
  UserCheck, 
  FolderKanban,
  CheckCircle2,
  ExternalLink
} from "lucide-react";

export function InvitationManagement() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 1-Question-at-a-time Invite Modal State
  const [showModal, setShowModal] = useState(false);
  const [inviteStep, setInviteStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"PROJECT_MANAGER" | "TEAM_MEMBER">("PROJECT_MANAGER");
  const [projectId, setProjectId] = useState("");
  const [sending, setSending] = useState(false);
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [wizardError, setWizardError] = useState("");

  // Strict role guard: only OWNER and PROJECT_MANAGER can access
  if (user && user.role !== "OWNER" && user.role !== "PROJECT_MANAGER") {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invRes, projRes] = await Promise.all([
        apiRequest<{ invitations: Invitation[] }>("/invitations"),
        apiRequest<{ projects: Project[] }>("/projects"),
      ]);
      setInvitations(invRes.invitations || []);
      setProjects(projRes.projects || []);
    } catch (err) {
      console.error("Failed to load invitations:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleNextFromStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setWizardError("Please enter a valid email address");
      return;
    }
    setWizardError("");
    if (user?.role === "PROJECT_MANAGER") {
      setRole("TEAM_MEMBER");
      // Pre-select first project if available
      if (projects.length > 0 && !projectId) {
        setProjectId(projects[0].id);
      }
      setInviteStep(3);
    } else {
      setInviteStep(2);
    }
  };

  const handleNextFromStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setWizardError("");
    setInviteStep(3);
  };

  const handleFinalSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setWizardError("");

    if (user?.role === "PROJECT_MANAGER" && !projectId) {
      setWizardError("Please select a project track to assign this team member to");
      setSending(false);
      return;
    }

    try {
      const res = await apiRequest<{ message: string; invitation: Invitation; inviteUrl: string }>("/invitations", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          role: user?.role === "PROJECT_MANAGER" ? "TEAM_MEMBER" : role,
          projectId: projectId || undefined,
        }),
      });

      setCreatedInviteUrl(res.inviteUrl);
      setInviteStep(4);
      await loadData();
    } catch (err: any) {
      setWizardError(err.message || "Failed to create invitation");
    } finally {
      setSending(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this invitation?")) return;
    try {
      await apiRequest(`/invitations/${id}`, { method: "DELETE" });
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to cancel invitation");
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetInviteWizard = () => {
    setShowModal(false);
    setInviteStep(1);
    setEmail("");
    setRole("PROJECT_MANAGER");
    setProjectId("");
    setCreatedInviteUrl(null);
    setWizardError("");
  };

  return (
    <PageShell
      eyebrow="Administration"
      title="User Invitations"
      actions={
        <button
          onClick={() => {
            resetInviteWizard();
            setShowModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[4px] bg-[#c8ff00] text-[#080808] hover:bg-[#b2e600] font-black text-xs uppercase tracking-wider shadow-lg shadow-[#c8ff00]/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Invite Member</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Invitations Table */}
        <div className="bg-[#111111] border border-[#222222] rounded-[4px] overflow-hidden shadow-xl">
          <div className="p-4 border-b border-[#222222] flex items-center justify-between">
            <h3 className="text-sm font-bold font-display text-white">All Invitations ({invitations.length})</h3>
          </div>

          {loading ? (
            <div className="p-12 text-center text-[#888888]">
              <Loader2 className="w-6 h-6 animate-spin text-[#c8ff00] mx-auto mb-2" />
              <p className="text-xs">Loading invitation records...</p>
            </div>
          ) : invitations.length === 0 ? (
            <div className="p-12 text-center text-[#888888]">
              <Mail className="w-10 h-10 text-[#444444] mx-auto mb-2" />
              <p className="text-sm font-bold text-white">No invitations found</p>
              <p className="text-xs text-[#888888] mt-1">Send an invitation to onboard project managers or team members.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#141414] text-[#888888] uppercase text-[10px] font-bold tracking-wider border-b border-[#222222]">
                  <tr>
                    <th className="py-3 px-4">Recipient Email</th>
                    <th className="py-3 px-4">Target Role</th>
                    <th className="py-3 px-4">Assigned Project</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Expires</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222222] text-[#f0ede6]">
                  {invitations.map((inv) => {
                    const isPending = inv.status === "PENDING";
                    const isAccepted = inv.status === "ACCEPTED";

                    return (
                      <tr key={inv.id} className="hover:bg-[#181818]/60 transition">
                        <td className="py-3.5 px-4 font-semibold text-white">{inv.email}</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-[2px] text-[10px] font-black uppercase tracking-wider bg-[#181818] text-[#c8ff00] border border-[#222222]">
                            {inv.role.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[#888888] font-medium">
                          {inv.project ? `${inv.project.name} (${inv.project.clientName})` : "General / All"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-[2px] text-[10px] font-bold uppercase tracking-wider ${
                              isPending
                                ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                : isAccepted
                                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[#888888]">
                          {new Date(inv.expiresAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          {isPending && (
                            <>
                              <button
                                onClick={() => {
                                  const url = `${window.location.origin}/invite/${inv.token}`;
                                  navigator.clipboard.writeText(url);
                                  setCopiedId(inv.id);
                                  setTimeout(() => setCopiedId(null), 2000);
                                }}
                                className="p-1.5 rounded-[3px] bg-[#181818] text-[#c8ff00] hover:bg-[#c8ff00]/10 border border-[#222222] transition cursor-pointer"
                                title="Copy Registration Link"
                              >
                                {copiedId === inv.id ? <Check className="w-3.5 h-3.5 text-[#00C88A]" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>

                              <a
                                href={`/invite/${inv.token}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex p-1.5 rounded-[3px] bg-[#181818] text-[#888888] hover:text-white hover:bg-white/5 border border-[#222222] transition cursor-pointer"
                                title="Open Registration Link in New Tab"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>

                              <button
                                onClick={() => handleCancel(inv.id)}
                                className="p-1.5 rounded-[3px] bg-[#181818] text-[#888888] hover:text-[#E74C4C] hover:bg-[#E74C4C]/10 border border-[#222222] transition cursor-pointer"
                                title="Cancel Invitation"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 1-Question-at-a-time Invite Wizard Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in overflow-y-auto">
            <div className="relative bg-[#111111] border border-[#222222] rounded max-w-[31rem] w-full px-8 py-10 shadow-2xl shadow-black/60 sm:px-11 sm:py-12 text-white">
              
              {/* Progress Indicator */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#181818] overflow-hidden rounded-t">
                <div 
                  className="h-full bg-[#c8ff00] transition-all duration-300 shadow-sm shadow-[#c8ff00]/50"
                  style={{ 
                    width: inviteStep === 1 ? "33%" : inviteStep === 2 ? "66%" : "100%" 
                  }}
                />
              </div>

              {/* Modal Top Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-[#222222] mb-6">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#c8ff00]">
                  {inviteStep === 4 ? "Complete" : `Question ${inviteStep} of 3`}
                </p>
                <button
                  onClick={resetInviteWizard}
                  className="text-[#888888] hover:text-white p-1 rounded hover:bg-white/5 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Wizard Error */}
              {wizardError && (
                <div className="mb-5 p-3 rounded border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-semibold">
                  {wizardError}
                </div>
              )}

              {/* STEP 1: Email Address */}
              {inviteStep === 1 && (
                <form onSubmit={handleNextFromStep1} className="space-y-6 animate-fade-in">
                  <div>
                    <h2 className="text-2xl font-bold tracking-normal text-white">
                      Who are you inviting?
                    </h2>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#888888]">
                      Colleague's email address
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#888888] mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      autoFocus
                      required
                      placeholder="colleague@agency.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-14 w-full border border-[#262626] bg-[#161616] px-4 text-base font-semibold text-white outline-none transition placeholder:text-[#888888] focus:border-[#c8ff00]"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="h-14 w-full rounded bg-[#c8ff00] text-xs font-black uppercase tracking-[0.22em] text-[#080808] transition hover:bg-[#b2e600] flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#c8ff00]/15"
                    >
                      <span>Continue</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: Role Assignment */}
              {inviteStep === 2 && (
                <form onSubmit={handleNextFromStep2} className="space-y-6 animate-fade-in">
                  <div>
                    <h2 className="text-2xl font-bold tracking-normal text-white">
                      What role will they hold?
                    </h2>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#888888]">
                      Access permissions & scope
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div
                      onClick={() => setRole("PROJECT_MANAGER")}
                      className={`p-4 rounded border text-left cursor-pointer transition flex flex-col gap-1 ${
                        role === "PROJECT_MANAGER"
                          ? "bg-[#161616] border-[#c8ff00] text-white"
                          : "bg-[#141414] border-[#222222] text-[#888888] hover:border-[#333333]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Shield size={18} className={role === "PROJECT_MANAGER" ? "text-[#c8ff00]" : "text-[#888888]"} />
                        {role === "PROJECT_MANAGER" && <Check size={16} className="text-[#c8ff00]" />}
                      </div>
                      <h4 className="text-xs font-bold text-white mt-1">Project Manager</h4>
                      <p className="text-[11px] text-[#888888]">Lead projects & sprints</p>
                    </div>

                    <div
                      onClick={() => setRole("TEAM_MEMBER")}
                      className={`p-4 rounded border text-left cursor-pointer transition flex flex-col gap-1 ${
                        role === "TEAM_MEMBER"
                          ? "bg-[#161616] border-[#c8ff00] text-white"
                          : "bg-[#141414] border-[#222222] text-[#888888] hover:border-[#333333]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <UserCheck size={18} className={role === "TEAM_MEMBER" ? "text-[#c8ff00]" : "text-[#888888]"} />
                        {role === "TEAM_MEMBER" && <Check size={16} className="text-[#c8ff00]" />}
                      </div>
                      <h4 className="text-xs font-bold text-white mt-1">Team Member</h4>
                      <p className="text-[11px] text-[#888888]">Work on tasks & logs</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setInviteStep(1)}
                      className="h-14 px-5 rounded bg-[#161616] border border-[#262626] text-[#888888] hover:text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
                    >
                      <ArrowLeft size={16} />
                      <span>Back</span>
                    </button>

                    <button
                      type="submit"
                      className="h-14 flex-1 rounded bg-[#c8ff00] text-xs font-black uppercase tracking-[0.22em] text-[#080808] transition hover:bg-[#b2e600] flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#c8ff00]/15"
                    >
                      <span>Continue</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: Project Assignment */}
              {inviteStep === 3 && (
                <form onSubmit={handleFinalSendInvite} className="space-y-6 animate-fade-in">
                  <div>
                    <h2 className="text-2xl font-bold tracking-normal text-white">
                      Assign to a project?
                    </h2>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#888888]">
                      Optional project track binding
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#888888] mb-2">
                      Project Assignment {user?.role === "PROJECT_MANAGER" && "*"}
                    </label>
                    <select
                      value={projectId}
                      required={user?.role === "PROJECT_MANAGER"}
                      onChange={(e) => setProjectId(e.target.value)}
                      className="h-14 w-full border border-[#262626] bg-[#161616] px-4 text-base font-semibold text-white outline-none transition focus:border-[#c8ff00] cursor-pointer"
                    >
                      {user?.role !== "PROJECT_MANAGER" && (
                        <option value="">General Workspace Access</option>
                      )}
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.clientName})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setInviteStep(user?.role === "PROJECT_MANAGER" ? 1 : 2)}
                      className="h-14 px-5 rounded bg-[#161616] border border-[#262626] text-[#888888] hover:text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
                    >
                      <ArrowLeft size={16} />
                      <span>Back</span>
                    </button>

                    <button
                      type="submit"
                      disabled={sending}
                      className="h-14 flex-1 rounded bg-[#c8ff00] text-xs font-black uppercase tracking-[0.22em] text-[#080808] transition hover:bg-[#b2e600] flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#c8ff00]/15 disabled:opacity-50"
                    >
                      {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      <span>Generate Invite</span>
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 4: Success Screen */}
              {inviteStep === 4 && (
                <div className="space-y-6 animate-scale-up text-center py-4">
                  <div className="w-14 h-14 rounded-full bg-[#c8ff00]/10 border border-[#c8ff00]/30 text-[#c8ff00] flex items-center justify-center mx-auto shadow-xl shadow-[#c8ff00]/10">
                    <CheckCircle2 size={28} />
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold tracking-normal text-white">
                      Invitation Sent!
                    </h2>
                    <p className="mt-2 text-sm text-[#888888] leading-relaxed">
                      An invitation email has been sent to <strong className="text-white">{email}</strong> to join as <strong className="text-[#c8ff00]">{role.replace("_", " ")}</strong>.
                    </p>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={resetInviteWizard}
                      className="h-14 w-full rounded bg-[#c8ff00] text-xs font-black uppercase tracking-[0.22em] text-[#080808] transition hover:bg-[#b2e600] flex items-center justify-center cursor-pointer shadow-lg shadow-[#c8ff00]/15"
                    >
                      Done & Back to List
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

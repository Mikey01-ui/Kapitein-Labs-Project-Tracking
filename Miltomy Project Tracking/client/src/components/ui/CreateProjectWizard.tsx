import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../services/apiClient";
import { useAuth } from "../../context/AuthContext";
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Sparkles, 
  FolderKanban, 
  Mail, 
  UserCheck, 
  Loader2,
  CheckCircle2
} from "lucide-react";

interface CreateProjectWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: (project: any) => void;
}

export function CreateProjectWizard({ isOpen, onClose, onProjectCreated }: CreateProjectWizardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [projectDeadline, setProjectDeadline] = useState("");
  
  // Project Manager State: 'invite' or 'select'
  const [pmMode, setPmMode] = useState<"invite" | "select">("invite");
  const [pmEmail, setPmEmail] = useState("");
  const [selectedManagerId, setSelectedManagerId] = useState("");

  // Result State
  const [createdProject, setCreatedProject] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      apiRequest<{ users: any[] }>("/users")
        .then(res => {
          setUsersList(res.users || []);
          if (res.users && res.users.length > 0) {
            setSelectedManagerId(res.users[0].id);
          }
        })
        .catch(err => console.error("Failed to load users for wizard:", err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNextFromStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      setErrorMsg("Please enter a project title");
      return;
    }
    setErrorMsg("");
    setStep(2);
  };

  const handleNextFromStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectDesc.trim()) {
      setErrorMsg("Please provide a short description or scope");
      return;
    }
    setErrorMsg("");
    setStep(3);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (pmMode === "invite" && !pmEmail.trim()) {
      setErrorMsg("Please enter the Project Manager's email address");
      return;
    }

    setLoading(true);

    try {
      const managerIdToAssign = pmMode === "select" ? selectedManagerId : (user?.id || "");
      
      const res = await apiRequest<{ message: string; project: any }>("/projects", {
        method: "POST",
        body: JSON.stringify({
          name: projectName.trim(),
          clientName: clientName.trim() || "Direct Client",
          description: projectDesc.trim(),
          deadline: projectDeadline || undefined,
          managerId: managerIdToAssign
        })
      });

      const newProj = res.project;
      setCreatedProject(newProj);

      if (pmMode === "invite" && pmEmail.trim()) {
        try {
          await apiRequest<{ inviteUrl: string }>("/invitations", {
            method: "POST",
            body: JSON.stringify({
              email: pmEmail.trim(),
              role: "PROJECT_MANAGER",
              projectId: newProj.id
            })
          });
        } catch (invErr: any) {
          console.error("Failed to generate invite:", invErr);
        }
      }

      if (onProjectCreated) {
        onProjectCreated(newProj);
      }

      setStep(4);
    } catch (err: any) {
      console.error("Failed to create project:", err);
      setErrorMsg(err.message || "Failed to create project. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setStep(1);
    setProjectName("");
    setClientName("");
    setProjectDesc("");
    setProjectDeadline("");
    setPmEmail("");
    setCreatedProject(null);
    setErrorMsg("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in overflow-y-auto">
      {/* Exact Card Shape & Size as Login (max-w-[31rem] rounded bg-[#111111] border border-[#222222] px-8 py-10 sm:px-11 sm:py-12) */}
      <div className="relative w-full max-w-[31rem] rounded bg-[#111111] border border-[#222222] px-8 py-10 shadow-2xl shadow-black/60 sm:px-11 sm:py-12 text-white">
        
        {/* Top Progress Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#181818] overflow-hidden rounded-t">
          <div 
            className="h-full bg-[#c8ff00] transition-all duration-300 shadow-sm shadow-[#c8ff00]/50"
            style={{ 
              width: step === 1 ? "25%" : step === 2 ? "50%" : step === 3 ? "75%" : "100%" 
            }}
          />
        </div>

        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#222222] mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#c8ff00]">
            {step === 4 ? "Complete" : `Question ${step} of 3`}
          </p>

          <button
            onClick={resetAndClose}
            className="text-[#888888] hover:text-white transition p-1 rounded hover:bg-white/5 cursor-pointer"
            title="Cancel"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-5 p-3 rounded border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* QUESTION 1: Project Basics */}
        {step === 1 && (
          <form onSubmit={handleNextFromStep1} className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold tracking-normal text-white">
                What are you building?
              </h2>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#888888]">
                Project title & client name
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#888888] mb-2">
                  Project Title *
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="e.g. AI Automation Platform"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="h-14 w-full rounded border border-[#262626] bg-[#161616] px-4 text-base font-semibold text-white outline-none transition placeholder:text-[#888888] focus:border-[#c8ff00]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#888888] mb-2">
                  Client / Organization (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corp / Direct Client"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="h-14 w-full rounded border border-[#262626] bg-[#161616] px-4 text-base font-semibold text-white outline-none transition placeholder:text-[#888888] focus:border-[#c8ff00]"
                />
              </div>
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

        {/* QUESTION 2: Scope & Timeline */}
        {step === 2 && (
          <form onSubmit={handleNextFromStep2} className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold tracking-normal text-white">
                Describe the key goals
              </h2>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#888888]">
                Scope deliverables & deadline
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#888888] mb-2">
                  Project Scope & Description *
                </label>
                <textarea
                  rows={3}
                  autoFocus
                  required
                  placeholder="Describe key milestones, tech stack, or deliverables..."
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  className="w-full rounded border border-[#262626] bg-[#161616] p-4 text-base font-semibold text-white outline-none transition placeholder:text-[#888888] focus:border-[#c8ff00] resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#888888] mb-2">
                  Target Deadline (Optional)
                </label>
                <input
                  type="date"
                  value={projectDeadline}
                  onChange={(e) => setProjectDeadline(e.target.value)}
                  className="h-14 w-full rounded border border-[#262626] bg-[#161616] px-4 text-base font-semibold text-white outline-none transition focus:border-[#c8ff00] cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
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

        {/* QUESTION 3: Assign or Invite Project Manager */}
        {step === 3 && (
          <form onSubmit={handleFinalSubmit} className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold tracking-normal text-white">
                Who will manage this?
              </h2>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#888888]">
                Assign leader or invite via email
              </p>
            </div>

            {/* Mode selection */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPmMode("invite")}
                className={`p-4 rounded border text-left transition cursor-pointer flex flex-col gap-1 ${
                  pmMode === "invite"
                    ? "bg-[#161616] border-[#c8ff00] text-white"
                    : "bg-[#141414] border-[#222222] text-[#888888] hover:border-[#333333]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Mail size={18} className={pmMode === "invite" ? "text-[#c8ff00]" : "text-[#888888]"} />
                  {pmMode === "invite" && <Check size={16} className="text-[#c8ff00]" />}
                </div>
                <h4 className="text-xs font-bold text-white mt-1">Invite via Email</h4>
                <p className="text-[11px] text-[#888888]">Send invite email</p>
              </button>

              <button
                type="button"
                onClick={() => setPmMode("select")}
                className={`p-4 rounded border text-left transition cursor-pointer flex flex-col gap-1 ${
                  pmMode === "select"
                    ? "bg-[#161616] border-[#c8ff00] text-white"
                    : "bg-[#141414] border-[#222222] text-[#888888] hover:border-[#333333]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <UserCheck size={18} className={pmMode === "select" ? "text-[#c8ff00]" : "text-[#888888]"} />
                  {pmMode === "select" && <Check size={16} className="text-[#c8ff00]" />}
                </div>
                <h4 className="text-xs font-bold text-white mt-1">Existing / Self</h4>
                <p className="text-[11px] text-[#888888]">Assign team member</p>
              </button>
            </div>

            {/* Dynamic Inputs */}
            <div>
              {pmMode === "invite" ? (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#888888] mb-2">
                    Project Manager's Email *
                  </label>
                  <input
                    type="email"
                    autoFocus
                    required
                    placeholder="pm.lead@agency.com"
                    value={pmEmail}
                    onChange={(e) => setPmEmail(e.target.value)}
                    className="h-14 w-full rounded border border-[#262626] bg-[#161616] px-4 text-base font-semibold text-white outline-none transition placeholder:text-[#888888] focus:border-[#c8ff00]"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#888888] mb-2">
                    Select Project Manager *
                  </label>
                  <select
                    value={selectedManagerId}
                    onChange={(e) => setSelectedManagerId(e.target.value)}
                    className="h-14 w-full rounded border border-[#262626] bg-[#161616] px-4 text-base font-semibold text-white outline-none transition focus:border-[#c8ff00] cursor-pointer"
                  >
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role.replace("_", " ")})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="h-14 px-5 rounded bg-[#161616] border border-[#262626] text-[#888888] hover:text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={loading}
                className="h-14 flex-1 rounded bg-[#c8ff00] text-xs font-black uppercase tracking-[0.22em] text-[#080808] transition hover:bg-[#b2e600] flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#c8ff00]/15 disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                <span>Create & Launch</span>
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: Success Screen */}
        {step === 4 && createdProject && (
          <div className="space-y-6 animate-scale-up text-center py-2">
            <div className="w-14 h-14 rounded-full bg-[#c8ff00]/10 border border-[#c8ff00]/30 text-[#c8ff00] flex items-center justify-center mx-auto shadow-xl shadow-[#c8ff00]/10">
              <CheckCircle2 size={28} />
            </div>

            <div>
              <h2 className="text-2xl font-bold tracking-normal text-white">
                Project Launched!
              </h2>
              <p className="mt-2 text-sm text-[#888888] leading-relaxed">
                {pmMode === "invite" && pmEmail ? (
                  <>
                    <strong className="text-white">{createdProject.name}</strong> has been created. An invitation email has been sent to <strong className="text-[#c8ff00]">{pmEmail}</strong> to join as Project Manager.
                  </>
                ) : (
                  <>
                    <strong className="text-white">{createdProject.name}</strong> is live and ready on your Kanban board.
                  </>
                )}
              </p>
            </div>

            <div className="space-y-3 pt-3">
              <button
                onClick={() => {
                  resetAndClose();
                  navigate(`/projects/${createdProject.id}/kanban`);
                }}
                className="h-14 w-full rounded bg-[#c8ff00] text-xs font-black uppercase tracking-[0.22em] text-[#080808] transition hover:bg-[#b2e600] flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#c8ff00]/15"
              >
                <FolderKanban size={16} />
                <span>Open Kanban Board</span>
              </button>

              <button
                onClick={resetAndClose}
                className="h-12 w-full rounded bg-[#161616] border border-[#262626] text-[#888888] hover:text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Close & View Projects
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

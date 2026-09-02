import { useState, useEffect, useRef } from "react";
import { PageShell } from "../../components/layout/PageShell";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../services/apiClient";
import { 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Upload, 
  Trash2, 
  Camera,
  Lock,
  Loader2
} from "lucide-react";
import type { User } from "../../types";
import { SkeletonLoader } from "../../components/ui/SkeletonLoader";
import gsap from "gsap";

const PRESET_AVATARS = [
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="url(%23g1)"/><defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2300f2fe"/><stop offset="100%" stop-color="%234facfe"/></linearGradient></defs></svg>',
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="url(%23g2)"/><defs><linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23ff0844"/><stop offset="100%" stop-color="%23ffb199"/></linearGradient></defs></svg>',
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="url(%23g3)"/><defs><linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%237028ff"/><stop offset="100%" stop-color="%2300c8ff"/></linearGradient></defs></svg>',
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="url(%23g4)"/><defs><linearGradient id="g4" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2305c180"/><stop offset="100%" stop-color="%23005b41"/></linearGradient></defs></svg>',
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="url(%23g5)"/><defs><linearGradient id="g5" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23fad961"/><stop offset="100%" stop-color="%23f76b1c"/></linearGradient></defs></svg>',
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="url(%23g6)"/><defs><linearGradient id="g6" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%232c3e50"/><stop offset="100%" stop-color="%23000000"/></linearGradient></defs></svg>',
];

export function Profile() {
  const { user, setUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form input states
  const [formName, setFormName] = useState("");
  const [primaryNotifEmail, setPrimaryNotifEmail] = useState("");
  const [secondaryNotifEmail, setSecondaryNotifEmail] = useState("");
  const [formAvatarUrl, setFormAvatarUrl] = useState("");

  // Change Password states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success"
  });

  const [projectsCount, setProjectsCount] = useState(0);
  const [doneTasksCount, setDoneTasksCount] = useState(0);
  const [collaboratorsCount, setCollaboratorsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // GSAP animated stat counters
  const [animatedProjects, setAnimatedProjects] = useState(0);
  const [animatedTasks, setAnimatedTasks] = useState(0);
  const [animatedCollabs, setAnimatedCollabs] = useState(0);

  // Sync inputs with user values on load
  useEffect(() => {
    if (user) {
      setFormName(user.name || "");
      setFormAvatarUrl(user.avatarUrl || "");

      const emails = (user.notificationEmail || "")
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
      setPrimaryNotifEmail(emails[0] || "");
      setSecondaryNotifEmail(emails[1] || "");
    }
  }, [user]);

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const [projRes, usersRes] = await Promise.all([
          apiRequest<{ projects: any[] }>("/projects"),
          apiRequest<{ users: any[] }>("/users")
        ]);

        const projects = projRes.projects || [];
        setProjectsCount(projects.length);
        setCollaboratorsCount(usersRes.users?.length || 1);

        const boardsPromises = projects.map((p: any) =>
          apiRequest<{ columns: any[] }>(`/projects/${p.id}/kanban`)
            .then(res => res.columns || [])
            .catch(() => [])
        );

        const columnsLists = await Promise.all(boardsPromises);
        let completed = 0;
        columnsLists.forEach(cols => {
          cols.forEach((col: any) => {
            const t = (col.title || "").toLowerCase();
            if (t.includes("done") || t.includes("complet")) {
              completed += (col.cards || []).length;
            }
          });
        });

        setDoneTasksCount(completed);
      } catch (err) {
        console.error("Failed to load profile stats:", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadProfileData();
  }, [user?.id]);

  const triggerToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3500);
  };

  const initials = (formName || user?.name || "Milton")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "MO";

  // GSAP animations for numbers & entry
  useEffect(() => {
    if (loading) return;

    const targets = {
      projects: 0,
      tasks: 0,
      collabs: 0
    };

    gsap.to(targets, {
      projects: projectsCount,
      tasks: doneTasksCount,
      collabs: collaboratorsCount,
      duration: 1.2,
      ease: "power2.out",
      onUpdate: () => {
        setAnimatedProjects(Math.round(targets.projects));
        setAnimatedTasks(Math.round(targets.tasks));
        setAnimatedCollabs(Math.round(targets.collabs));
      }
    });

    gsap.fromTo(".settings-entrance-left",
      { opacity: 0, x: -20 },
      { opacity: 1, x: 0, duration: 0.6, ease: "power2.out" }
    );

    gsap.fromTo(".settings-entrance-right",
      { opacity: 0, x: 20 },
      { opacity: 1, x: 0, duration: 0.6, ease: "power2.out", delay: 0.1 }
    );
  }, [loading, projectsCount, doneTasksCount, collaboratorsCount]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      triggerToast("Please select a valid image file.", "error");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      triggerToast("Image file size must be less than 3MB.", "error");
      return;
    }

    try {
      const base64Content = await fileToBase64(file);
      setFormAvatarUrl(base64Content);
      triggerToast("Photo ready! Click 'Save Settings' to apply changes.", "success");
    } catch (err) {
      console.error("Failed to read image:", err);
      triggerToast("Failed to process image file.", "error");
    }
  };

  const handleRemovePhoto = () => {
    setFormAvatarUrl("");
    triggerToast("Photo removed! Click 'Save Settings' to apply changes.", "success");
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formName.trim()) {
      triggerToast("Full name cannot be empty.", "error");
      return;
    }

    setIsSaving(true);
    try {
      const notifEmails = [primaryNotifEmail, secondaryNotifEmail]
        .map(e => e.trim())
        .filter(Boolean)
        .join(", ");

      const res = await apiRequest<{ user: User }>(`/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: formName.trim(),
          avatarUrl: formAvatarUrl,
          notificationEmail: notifEmails
        })
      });

      setUser(res.user);
      triggerToast("Account settings saved successfully!", "success");
    } catch (err) {
      console.error("Failed to save settings:", err);
      triggerToast("Failed to save account settings.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      triggerToast("Please fill in all password fields.", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      triggerToast("New passwords do not match.", "error");
      return;
    }

    if (newPassword.length < 6) {
      triggerToast("New password must be at least 6 characters.", "error");
      return;
    }

    setIsChangingPassword(true);
    try {
      await apiRequest(`/users/${user.id}/change-password`, {
        method: "POST",
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      triggerToast("Password changed successfully!", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error("Failed to change password:", err);
      triggerToast("Failed to change password. Verify your current password.", "error");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getRoleTitle = (role?: string) => {
    if (role === "OWNER") return "AGENCY OWNER";
    if (role === "PROJECT_MANAGER") return "PROJECT MANAGER";
    return "RESEARCH ENGINEER";
  };

  if (loading) {
    return (
      <PageShell title="Account Settings" eyebrow="Settings">
        <SkeletonLoader variant="profile" />
      </PageShell>
    );
  }

  return (
    <PageShell title="Account Settings" eyebrow="Settings">
      
      {/* Toast Alert */}
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

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 select-none pt-4">
        
        {/* LEFT SIDE COLUMN (Avatar preview, presets, stats) - 1:1 with Miltomy */}
        <div className="lg:col-span-4 lg:border-r lg:border-[#222222] lg:border-dashed lg:pr-8 space-y-8 settings-entrance-left opacity-0 theme-card-panel">
          
          {/* Avatar preview & management */}
          <div className="flex flex-col items-center space-y-5">
            <div className="relative group">
              <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-[#161616] overflow-hidden text-[#c8ff00] text-4xl font-black border border-[#222222] border-dashed shadow-inner">
                {formAvatarUrl ? (
                  <img src={formAvatarUrl} alt={formName} className="h-full w-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
                
                {/* Camera overlay hover state */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-[#080808]/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[9px] font-black uppercase tracking-widest text-[#c8ff00] transition-all duration-200 cursor-pointer"
                >
                  <Camera size={20} className="mb-1 text-[#c8ff00] animate-pulse" />
                  Upload Image
                </div>
              </div>

              <span className="absolute bottom-1 right-1 rounded-full bg-[#122D23] border border-[#080808] p-1 text-[#00C88A]">
                <CheckCircle2 size={13} fill="currentColor" className="text-[#080808]" />
              </span>
            </div>

            {/* Upload controls */}
            <div className="text-center w-full space-y-2.5">
              <div>
                <h4 className="text-base font-black text-white leading-tight font-display">{formName || user?.name}</h4>
                <span className="text-[10px] font-bold text-[#c8ff00] mt-1 block uppercase tracking-widest">
                  {getRoleTitle(user?.role)}
                </span>
              </div>

              <div className="flex items-center justify-center gap-2 pt-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-[#c8ff00] border border-[#c8ff00]/20 bg-[#c8ff00]/5 px-3 py-1.5 rounded-[4px] hover:bg-[#c8ff00] hover:text-[#080808] transition duration-200 cursor-pointer"
                >
                  <Upload size={10} />
                  Upload Photo
                </button>

                {formAvatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-[#E74C4C] border border-[#E74C4C]/20 bg-[#E74C4C]/5 px-3 py-1.5 rounded-[4px] hover:bg-[#E74C4C] hover:text-white transition duration-200 cursor-pointer"
                  >
                    <Trash2 size={10} />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Preset illustrations selector */}
          <div className="border-t border-[#222222] border-dashed pt-6">
            <span className="block text-[9px] font-bold uppercase tracking-widest text-[#888888] text-center mb-3">
              Or select preset gradient avatar
            </span>
            
            <div className="flex justify-center gap-2">
              {PRESET_AVATARS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setFormAvatarUrl(preset);
                    triggerToast(`Preset avatar #${idx + 1} selected! Save settings to publish.`, "success");
                  }}
                  className={`h-8 w-8 rounded-full overflow-hidden border transition-all duration-200 hover:scale-110 cursor-pointer ${
                    formAvatarUrl === preset ? "border-[#c8ff00] ring-1 ring-[#c8ff00]/30 scale-105" : "border-[#222222]"
                  }`}
                >
                  <img src={preset} alt={`preset-${idx}`} className="h-full w-full" />
                </button>
              ))}
            </div>
          </div>

          {/* Mini numerical stats breakdown */}
          <div className="border-t border-[#222222] border-dashed pt-6">
            <div className="grid grid-cols-3 gap-2 text-center py-2">
              <div>
                <span className="block text-base font-black text-white">{animatedProjects}</span>
                <span className="text-[8px] uppercase tracking-wider text-[#888888] font-bold block mt-0.5">Projects</span>
              </div>
              <div className="border-x border-[#222222] border-dashed">
                <span className="block text-base font-black text-white">{animatedTasks}</span>
                <span className="text-[8px] uppercase tracking-wider text-[#888888] font-bold block mt-0.5">Done Tasks</span>
              </div>
              <div>
                <span className="block text-base font-black text-white">{animatedCollabs}</span>
                <span className="text-[8px] uppercase tracking-wider text-[#888888] font-bold block mt-0.5">Team</span>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT SIDE COLUMN (Forms separated by dashed lines) - 1:1 with Miltomy */}
        <div className="lg:col-span-8 lg:pl-4 space-y-8 settings-entrance-right opacity-0">
          
          {/* General profile settings form */}
          <form onSubmit={handleSaveSettings} className="space-y-8 theme-card-panel">
            
            {/* Personal details */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#c8ff00] flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#c8ff00]" />
                Personal Information
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name input */}
                <div className="space-y-1.5">
                  <label htmlFor="name" className="block text-[10px] font-bold uppercase tracking-widest text-[#888888]">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Your display name"
                    className="h-14 w-full rounded border border-[#262626] bg-[#161616] px-4 text-sm font-semibold text-white outline-none focus:border-[#c8ff00] transition"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Divider Line */}
            <div className="border-t border-[#222222] border-dashed" />

            {/* Contacts & Notification routes */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#c8ff00] flex items-center gap-1.5">
                <Mail size={14} className="text-[#c8ff00]" />
                Contact & Notification Channels
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Login Email (Read-only) */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888888]">
                    Account Login Email (System ID)
                  </label>
                  <input
                    type="email"
                    value={user?.email}
                    disabled
                    className="h-14 w-full rounded border border-[#262626] bg-[#161616]/40 px-4 text-sm font-semibold text-[#888888] outline-none cursor-not-allowed opacity-75"
                  />
                </div>

                {/* Primary Notification Routing Email */}
                <div className="space-y-1.5">
                  <label htmlFor="primaryNotifEmail" className="block text-[10px] font-bold uppercase tracking-widest text-[#888888]">
                    Email for Notifications
                  </label>
                  <input
                    id="primaryNotifEmail"
                    type="email"
                    value={primaryNotifEmail}
                    onChange={(e) => setPrimaryNotifEmail(e.target.value)}
                    placeholder="e.g. notifications@company.com"
                    className="h-14 w-full rounded border border-[#262626] bg-[#161616] px-4 text-sm font-semibold text-white outline-none focus:border-[#c8ff00] transition"
                  />
                  <span className="text-[9px] text-[#888888] block">
                    Primary route where task assignment and completed updates will be emailed.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Secondary Notification Routing Email */}
                <div className="space-y-1.5">
                  <label htmlFor="secondaryNotifEmail" className="block text-[10px] font-bold uppercase tracking-widest text-[#888888]">
                    Secondary Email for Notifications (Optional)
                  </label>
                  <input
                    id="secondaryNotifEmail"
                    type="email"
                    value={secondaryNotifEmail}
                    onChange={(e) => setSecondaryNotifEmail(e.target.value)}
                    placeholder="e.g. alternate-notif@company.com"
                    className="h-14 w-full rounded border border-[#262626] bg-[#161616] px-4 text-sm font-semibold text-white outline-none focus:border-[#c8ff00] transition"
                  />
                  <span className="text-[9px] text-[#888888] block">
                    Add another email address to also receive copies of all notification dispatches.
                  </span>
                </div>
              </div>
            </div>

            {/* Submit button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="h-14 px-8 rounded bg-[#c8ff00] hover:bg-[#b2e600] text-[#080808] text-xs font-black uppercase tracking-[0.22em] transition duration-150 disabled:opacity-50 cursor-pointer shadow-lg shadow-[#c8ff00]/15 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Settings...</span>
                  </>
                ) : (
                  <span>Save Settings</span>
                )}
              </button>
            </div>

          </form>

          {/* Divider Line */}
          <div className="border-t border-[#222222] border-dashed" />

          {/* Change Password form */}
          <form onSubmit={handleChangePassword} className="space-y-6 theme-card-panel">
            
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#c8ff00] flex items-center gap-1.5">
                <Lock size={14} className="text-[#c8ff00]" />
                Security & Change Password
              </h4>

              <div className="grid grid-cols-1 gap-4">
                {/* Current Password */}
                <div className="space-y-1.5">
                  <label htmlFor="currentPassword" className="block text-[10px] font-bold uppercase tracking-widest text-[#888888]">
                    Current Password
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="h-14 w-full rounded border border-[#262626] bg-[#161616] px-4 text-sm font-semibold text-white outline-none focus:border-[#c8ff00] transition"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* New Password */}
                <div className="space-y-1.5">
                  <label htmlFor="newPassword" className="block text-[10px] font-bold uppercase tracking-widest text-[#888888]">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="h-14 w-full rounded border border-[#262626] bg-[#161616] px-4 text-sm font-semibold text-white outline-none focus:border-[#c8ff00] transition"
                    required
                  />
                </div>

                {/* Confirm New Password */}
                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="block text-[10px] font-bold uppercase tracking-widest text-[#888888]">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Retype new password"
                    className="h-14 w-full rounded border border-[#262626] bg-[#161616] px-4 text-sm font-semibold text-white outline-none focus:border-[#c8ff00] transition"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isChangingPassword}
                className="h-14 px-8 rounded bg-[#c8ff00] hover:bg-[#b2e600] text-[#080808] text-xs font-black uppercase tracking-[0.22em] transition duration-150 disabled:opacity-50 cursor-pointer shadow-lg shadow-[#c8ff00]/15 flex items-center justify-center gap-2"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </div>

          </form>
        </div>

      </div>

    </PageShell>
  );
}

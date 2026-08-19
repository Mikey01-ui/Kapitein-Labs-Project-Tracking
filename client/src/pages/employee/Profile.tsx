import { useState, useEffect, useRef } from "react";
import { PageShell } from "../../components/layout/PageShell";
import { useAuth } from "../../context/AuthContext";
import { useAssignedProjects } from "../../hooks/useAssignedProjects";
import { apiRequest } from "../../services/apiClient";
import { formatHours } from "../../utils/formatters";
import { 
  Mail, 
  Shield, 
  Clock, 
  FolderKanban, 
  CheckSquare, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Users, 
  Settings, 
  Upload, 
  Trash2, 
  Camera,
  Layers,
  Lock
} from "lucide-react";
import type { HourLog, User } from "../../types";
import { SkeletonLoader } from "../../components/ui/SkeletonLoader";
import gsap from "gsap";

// ConnectionItem interface removed

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
  const assignedProjects = useAssignedProjects();
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

  const [logs, setLogs] = useState<HourLog[]>([]);
  const [userCards, setUserCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // GSAP animated stat counters
  const [animatedHours, setAnimatedHours] = useState(0);
  const [animatedProjects, setAnimatedProjects] = useState(0);
  const [animatedTasks, setAnimatedTasks] = useState(0);

  // Sync inputs with user values on load
  useEffect(() => {
    if (user) {
      setFormName(user.name || "");
      setFormAvatarUrl(user.avatarUrl || "");

      // Split primary and secondary emails
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
        const [hoursRes, projRes] = await Promise.all([
          apiRequest<{ logs: HourLog[] }>("/hours"),
          apiRequest<{ projects: any[] }>("/projects")
        ]);

        setLogs(hoursRes.logs);

        // Fetch user tasks / cards counts
        const boardsPromises = projRes.projects.map((p: any) =>
          apiRequest<{ columns: any[] }>(`/projects/${p.id}/kanban`)
            .then(res => res.columns.map(col => ({ ...col, projectId: p.id })))
            .catch(() => [])
        );
        const columnsLists = await Promise.all(boardsPromises);
        const allUserCards = columnsLists.flatMap(columns => 
          columns.flatMap((col: any) => 
            col.cards.filter((c: any) => 
              (c.assignees && c.assignees.some((a: any) => a.id === user.id)) || 
              (c.assigneeId === user.id)
            ).map((c: any) => ({
              ...c,
              projectId: col.projectId,
              columnTitle: col.title
            }))
          )
        );

        setUserCards(allUserCards);
      } catch (err) {
        console.error("Failed to load profile data:", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadProfileData();
  }, [user.id]);

  const triggerToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3500);
  };

  const totalUserHours = logs.reduce((sum, log) => sum + Number(log.hours), 0);
  const completedCardsCount = userCards.filter(c => {
    const t = (c.columnTitle || "").toLowerCase();
    return t.includes("complete") || t.includes("done");
  }).length;

  const initials = formName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "MO";

  // GSAP animations for numbers
  useEffect(() => {
    if (loading) return;

    const targets = {
      hours: animatedHours,
      projects: animatedProjects,
      tasks: animatedTasks
    };

    gsap.to(targets, {
      hours: totalUserHours,
      projects: assignedProjects.length,
      tasks: completedCardsCount,
      duration: 1.2,
      ease: "power2.out",
      onUpdate: () => {
        setAnimatedHours(Math.round(targets.hours * 10) / 10);
        setAnimatedProjects(Math.round(targets.projects));
        setAnimatedTasks(Math.round(targets.tasks));
      }
    });
  }, [loading, totalUserHours, assignedProjects.length, completedCardsCount]);

  // Entrance animations for layouts
  useEffect(() => {
    if (loading) return;
    
    gsap.fromTo(".settings-entrance-left",
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
    );

    gsap.fromTo(".settings-entrance-right",
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", delay: 0.1 }
    );
  }, [loading]);

  // Custom Image Upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (e.g. 2MB)
    if (file.size > 2 * 1024 * 1024) {
      triggerToast("File size must be less than 2MB.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFormAvatarUrl(event.target.result as string);
        triggerToast("Custom photo selected! Save settings to publish.", "success");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Combine primary and secondary email inputs into a comma-separated string
      const emails = [primaryNotifEmail.trim(), secondaryNotifEmail.trim()].filter(Boolean);
      const joinedEmail = emails.join(", ");

      const payload = {
        name: formName,
        notificationEmail: joinedEmail || null,
        avatarUrl: formAvatarUrl
      };

      const res = await apiRequest<{ message: string; user: User }>(`/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });

      setUser(res.user);
      triggerToast("Account settings updated successfully!", "success");
    } catch (err) {
      console.error("Failed to save account settings:", err);
      triggerToast("Failed to save settings. Please check fields.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      triggerToast("New passwords do not match.", "error");
      return;
    }

    if (newPassword.length < 6) {
      triggerToast("New password must be at least 6 characters long.", "error");
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
      newPassword && setNewPassword("");
      confirmPassword && setConfirmPassword("");
    } catch (err: any) {
      console.error("Failed to change password:", err);
      triggerToast("Failed to change password. Verify your current password.", "error");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleRemovePhoto = () => {
    setFormAvatarUrl("");
    triggerToast("Photo removed! Save settings to apply changes.", "success");
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
      
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 select-none pt-4">
        
        {/* LEFT SIDE COLUMN (Avatar preview, presets, stats) */}
        <div className="lg:col-span-4 lg:border-r lg:border-[#1B2A3F] lg:border-dashed lg:pr-8 space-y-8 settings-entrance-left opacity-0 theme-card-panel">
          
          {/* Avatar preview & management */}
          <div className="flex flex-col items-center space-y-5">
            <div className="relative group">
              <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-[#121E30] overflow-hidden text-teal text-4xl font-black border border-[#1B2A3F] border-dashed shadow-inner">
                {formAvatarUrl ? (
                  <img src={formAvatarUrl} alt={formName} className="h-full w-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
                
                {/* Camera overlay hover state */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-navy/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[9px] font-black uppercase tracking-widest text-teal transition-all duration-200 cursor-pointer"
                >
                  <Camera size={20} className="mb-1 text-teal animate-pulse" />
                  Upload Image
                </div>
              </div>

              <span className="absolute bottom-1 right-1 rounded-full bg-[#122D23] border border-[#0B1220] p-1 text-status-success">
                <CheckCircle2 size={13} fill="currentColor" className="text-navy" />
              </span>
            </div>

            {/* Upload controls */}
            <div className="text-center w-full space-y-2.5">
              <div>
                <h4 className="text-base font-black text-white leading-tight">{formName || user.name}</h4>
                <span className="text-[10px] font-bold text-teal mt-1 block uppercase tracking-widest">
                  {user.role === "ADMIN" ? "Project Director" : user.role === "MANAGER" ? "Project Manager" : "Research Engineer"}
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
                  className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-teal border border-teal/20 bg-teal/5 px-3 py-1.5 rounded-[4px] hover:bg-teal hover:text-navy transition duration-200"
                >
                  <Upload size={10} />
                  Upload Photo
                </button>

                {formAvatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-status-danger border border-status-danger/20 bg-status-danger/5 px-3 py-1.5 rounded-[4px] hover:bg-status-danger hover:text-white transition duration-200"
                  >
                    <Trash2 size={10} />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Preset illustrations selector */}
          <div className="border-t border-[#1B2A3F] border-dashed pt-6">
            <span className="block text-[9px] font-bold uppercase tracking-widest text-text-muted text-center mb-3">
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
                  className={`h-8 w-8 rounded-full overflow-hidden border transition-all duration-200 hover:scale-110 ${
                    formAvatarUrl === preset ? "border-teal ring-1 ring-teal/30 scale-105" : "border-[#1B2A3F]"
                  }`}
                >
                  <img src={preset} alt={`preset-${idx}`} className="h-full w-full" />
                </button>
              ))}
            </div>
          </div>

          {/* Mini numerical stats breakdown */}
          <div className="border-t border-[#1B2A3F] border-dashed pt-6">
            <div className="grid grid-cols-3 gap-2 text-center py-2">
              <div>
                <span className="block text-base font-black text-white">{formatHours(animatedHours)}</span>
                <span className="text-[8px] uppercase tracking-wider text-text-muted font-bold block mt-0.5">Hours</span>
              </div>
              <div className="border-x border-[#1B2A3F] border-dashed">
                <span className="block text-base font-black text-white">{animatedProjects}</span>
                <span className="text-[8px] uppercase tracking-wider text-text-muted font-bold block mt-0.5">Projects</span>
              </div>
              <div>
                <span className="block text-base font-black text-white">{animatedTasks}</span>
                <span className="text-[8px] uppercase tracking-wider text-text-muted font-bold block mt-0.5">Done Tasks</span>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT SIDE COLUMN (Forms separated by lines) */}
        <div className="lg:col-span-8 lg:pl-4 space-y-8 settings-entrance-right opacity-0">
          
          {/* General profile settings form */}
          <form onSubmit={handleSaveSettings} className="space-y-8 theme-card-panel">
            
            {/* Personal details */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-teal flex items-center gap-1.5">
                <Sparkles size={14} className="text-teal" />
                Personal Information
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name input */}
                <div className="space-y-1.5">
                  <label htmlFor="name" className="block text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Your display name"
                    className="w-full rounded-xl border border-[#1B2A3F] bg-[#121E30] px-4 py-3 text-xs font-semibold text-white outline-none focus:border-teal transition"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Divider Line */}
            <div className="border-t border-[#1B2A3F] border-dashed" />

            {/* Contacts & Notification routes */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-teal flex items-center gap-1.5">
                <Mail size={14} className="text-teal" />
                Contact & Notification Channels
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Login Email (Read-only) */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    Account Login Email (System ID)
                  </label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full rounded-xl border border-[#1B2A3F]/65 bg-[#121E30]/40 px-4 py-3 text-xs font-semibold text-text-muted outline-none cursor-not-allowed"
                  />
                </div>

                {/* Primary Notification Routing Email */}
                <div className="space-y-1.5">
                  <label htmlFor="primaryNotifEmail" className="block text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    Email for Notifications
                  </label>
                  <input
                    id="primaryNotifEmail"
                    type="email"
                    value={primaryNotifEmail}
                    onChange={(e) => setPrimaryNotifEmail(e.target.value)}
                    placeholder="e.g. notifications@company.com"
                    className="w-full rounded-xl border border-[#1B2A3F] bg-[#121E30] px-4 py-3 text-xs font-semibold text-white outline-none focus:border-teal transition"
                  />
                  <span className="text-[9px] text-text-muted/65 block">
                    Primary route where task assignment and completed updates will be emailed.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Secondary Notification Routing Email */}
                <div className="space-y-1.5">
                  <label htmlFor="secondaryNotifEmail" className="block text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    Secondary Email for Notifications (Optional)
                  </label>
                  <input
                    id="secondaryNotifEmail"
                    type="email"
                    value={secondaryNotifEmail}
                    onChange={(e) => setSecondaryNotifEmail(e.target.value)}
                    placeholder="e.g. alternate-notif@company.com"
                    className="w-full rounded-xl border border-[#1B2A3F] bg-[#121E30] px-4 py-3 text-xs font-semibold text-white outline-none focus:border-teal transition"
                  />
                  <span className="text-[9px] text-text-muted/65 block">
                    Add another email address to also receive copies of all notification dispatches.
                  </span>
                </div>
              </div>
            </div>

            {/* Submit panel */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1.5 bg-teal hover:bg-[#00B8A2] text-navy text-[11px] font-black uppercase tracking-widest px-6 py-3.5 rounded-xl transition duration-150 disabled:opacity-50"
              >
                {isSaving ? "Saving Settings..." : "Save Settings"}
              </button>
            </div>

          </form>

          {/* Divider Line */}
          <div className="border-t border-[#1B2A3F] border-dashed" />

          {/* Change Password form */}
          <form onSubmit={handleChangePassword} className="space-y-6 theme-card-panel">
            
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-teal flex items-center gap-1.5">
                <Lock size={14} className="text-teal" />
                Security & Change Password
              </h4>

              <div className="grid grid-cols-1 gap-4">
                {/* Current Password */}
                <div className="space-y-1.5">
                  <label htmlFor="currentPassword" className="block text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    Current Password
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full rounded-xl border border-[#1B2A3F] bg-[#121E30] px-4 py-3 text-xs font-semibold text-white outline-none focus:border-teal transition"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* New Password */}
                <div className="space-y-1.5">
                  <label htmlFor="newPassword" className="block text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full rounded-xl border border-[#1B2A3F] bg-[#121E30] px-4 py-3 text-xs font-semibold text-white outline-none focus:border-teal transition"
                    required
                  />
                </div>

                {/* Confirm New Password */}
                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="block text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Retype new password"
                    className="w-full rounded-xl border border-[#1B2A3F] bg-[#121E30] px-4 py-3 text-xs font-semibold text-white outline-none focus:border-teal transition"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isChangingPassword}
                className="flex items-center gap-1.5 bg-teal hover:bg-[#00B8A2] text-navy text-[11px] font-black uppercase tracking-widest px-6 py-3.5 rounded-xl transition duration-150 disabled:opacity-50"
              >
                {isChangingPassword ? "Updating Password..." : "Update Password"}
              </button>
            </div>

          </form>
        </div>

      </div>

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

    </PageShell>
  );
}

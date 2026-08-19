import { useState, useEffect } from "react";
import { PageShell } from "../../components/layout/PageShell";
import { apiRequest } from "../../services/apiClient";
import { 
  UserCheck, 
  CheckCircle2, 
  AlertCircle, 
  Mail, 
  Calendar 
} from "lucide-react";
import type { User } from "../../types";
import { SkeletonLoader } from "../../components/ui/SkeletonLoader";

export function UserManagement() {
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("kapetein_token");
      if (!token) return;
      const data = await apiRequest<{ users: User[] }>("/users", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      setUsersList(data.users);
      localStorage.setItem("kapetein_users", JSON.stringify(data.users));
    } catch (err) {
      console.error("Failed to fetch users:", err);
      const stored = localStorage.getItem("kapetein_users");
      if (stored) {
        try {
          setUsersList(JSON.parse(stored));
        } catch (e) {}
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const pendingUsers = usersList.filter(u => u.isPending === true);
  const approvedUsers = usersList.filter(u => !u.isPending);

  useEffect(() => {
    // Sync active user if they exist in the master table
    const activeStored = localStorage.getItem("kapetein_current_user");
    if (activeStored) {
      try {
        const cur = JSON.parse(activeStored) as User;
        const matching = usersList.find(u => u.id === cur.id);
        if (matching && JSON.stringify(matching) !== activeStored) {
          localStorage.setItem("kapetein_current_user", JSON.stringify(matching));
        }
      } catch (e) {}
    }
  }, [usersList]);

  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success"
  });

  const triggerToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3500);
  };

  // Toggle user active status
  const handleToggleActiveStatus = async (id: string) => {
    const targetUser = usersList.find(u => u.id === id);
    if (!targetUser) return;
    const nextState = !targetUser.isActive;

    try {
      const token = localStorage.getItem("kapetein_token");
      await apiRequest(`/users/${id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: nextState })
      });
      setUsersList(prev => prev.map(u => u.id === id ? { ...u, isActive: nextState } : u));
      triggerToast(`User account ${nextState ? "activated" : "deactivated"} successfully.`, "success");
    } catch (err) {
      console.error(err);
      triggerToast("Failed to update user status on server.", "error");
    }
  };

  // Dropdown role editor
  const handleRoleChange = async (id: string, roleStr: "EMPLOYEE" | "MANAGER" | "ADMIN") => {
    try {
      const token = localStorage.getItem("kapetein_token");
      await apiRequest(`/users/${id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ role: roleStr })
      });
      setUsersList(prev => prev.map(u => u.id === id ? { ...u, role: roleStr } : u));
      triggerToast(`Role updated to ${roleStr} successfully!`, "success");
    } catch (err) {
      console.error(err);
      triggerToast("Failed to update user role on server.", "error");
    }
  };

  // Approve pending registration request
  const handleApproveUser = async (id: string) => {
    try {
      const token = localStorage.getItem("kapetein_token");
      await apiRequest(`/users/${id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ isPending: false, isActive: true })
      });
      setUsersList(prev => prev.map(u => u.id === id ? { ...u, isPending: false, isActive: true } : u));
      triggerToast(`Registration request has been approved and activated!`, "success");
    } catch (err) {
      console.error(err);
      triggerToast("Failed to approve user on server.", "error");
    }
  };

  // Reject pending registration request (remove from list)
  const handleRejectUser = async (id: string, name: string) => {
    try {
      const token = localStorage.getItem("kapetein_token");
      await apiRequest(`/users/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      setUsersList(prev => prev.filter(u => u.id !== id));
      triggerToast(`Registration request for ${name} has been rejected.`, "success");
    } catch (err) {
      console.error(err);
      triggerToast("Failed to reject user registration on server.", "error");
    }
  };

  const handleUpdateWeeklyTarget = async (id: string, value: number) => {
    try {
      const token = localStorage.getItem("kapetein_token");
      await apiRequest(`/users/${id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ weeklyTargetHours: value })
      });
      triggerToast("Weekly target hours updated successfully!", "success");
    } catch (err) {
      console.error(err);
      triggerToast("Failed to save weekly target on server.", "error");
    }
  };

  return (
    <PageShell title="User Management" eyebrow="System Admin">
      <div className="space-y-6">
        
        {/* Toolbar Header (Controls) */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#1B2A3F] border-dashed pb-6 select-none">
          <div>
            <h3 className="text-sm font-black text-white">System Accounts</h3>
            <p className="text-xs text-text-muted mt-0.5">Review pending approvals, assign authorization roles, and toggle account states</p>
          </div>
        </div>

        {/* Pending Registration Requests Grid */}
        {pendingUsers.length > 0 && (
          <div className="space-y-4 border-b border-[#1B2A3F] border-dashed pb-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-teal flex items-center gap-2">
              <UserCheck size={14} />
              Pending Registration Requests ({pendingUsers.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingUsers.map((u) => {
                const initials = u.name
                  .split(" ")
                  .map(n => n[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase();

                return (
                  <div 
                    key={u.id}
                    className="bg-[#121E30]/70 border border-[#253347] rounded-[20px] p-4 flex flex-col justify-between hover:border-teal/30 hover:bg-[#1A2B42]/10 transition-all duration-200"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-black bg-[#1A2B42] text-teal border border-teal/10">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1 text-xs">
                        <h4 className="font-bold text-white truncate">{u.name}</h4>
                        <span className="text-[9px] text-text-muted truncate block mt-0.5">{u.email}</span>
                        <span className="inline-block mt-2 text-[8px] font-black uppercase tracking-wider bg-teal/10 text-teal border border-teal/20 px-1.5 py-0.5 rounded-[2px]">
                          Requested: {u.role === "ADMIN" ? "ADMINISTRATOR" : u.role === "MANAGER" ? "PROJECT MANAGER" : "RESEARCH ENGINEER"}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2.5 mt-4 pt-3 border-t border-[#1B2A3F]/50">
                      <button
                        onClick={() => handleApproveUser(u.id)}
                        className="flex-1 bg-teal text-navy text-[10px] font-black uppercase tracking-wider py-1.5 px-3 rounded hover:bg-[#00B8A2] transition duration-150 font-bold"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectUser(u.id, u.name)}
                        className="flex-1 bg-[#2D1E1E]/40 border border-red-950 text-status-danger text-[10px] font-black uppercase tracking-wider py-1.5 px-3 rounded hover:bg-[#2D1E1E] transition duration-150 font-bold"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Users Database Table */}
        <div className="rounded-[20px] bg-[#121E30] border border-border p-6 shadow-md select-none overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1B2A3F] text-text-muted font-bold uppercase tracking-wider">
                <th className="pb-3 pr-4">Avatar</th>
                <th className="pb-3 px-4">Full Name</th>
                <th className="pb-3 px-4">Email Address</th>
                <th className="pb-3 px-4">Joined Date</th>
                <th className="pb-3 px-4">System Role</th>
                <th className="pb-3 px-4 text-center">Weekly Target</th>
                <th className="pb-3 px-4 text-center">Account Status</th>
                <th className="pb-3 pl-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1B2A3F]/50">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-4">
                    <SkeletonLoader variant="table" />
                  </td>
                </tr>
              ) : approvedUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-text-muted font-bold">
                    No approved users found.
                  </td>
                </tr>
              ) : (
                approvedUsers.map((u) => {
                  const initials = u.name
                    .split(" ")
                    .map(n => n[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase();

                  return (
                    <tr key={u.id} className="hover:bg-[#1A2B42]/10 transition duration-150">
                      {/* Initials Avatar */}
                      <td className="py-3.5 pr-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-black bg-[#1A2B42] text-teal border border-teal/10">
                          {initials}
                        </div>
                      </td>

                      {/* Name */}
                      <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">{u.name}</td>

                      {/* Email */}
                      <td className="py-3.5 px-4 text-text-muted whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <Mail size={12} className="text-teal/70" />
                          {u.email}
                        </span>
                      </td>

                      {/* Date Joined */}
                      <td className="py-3.5 px-4 text-text-muted whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-teal/70" />
                          {u.createdAt}
                        </span>
                      </td>

                      {/* Role Selector dropdown */}
                      <td className="py-3.5 px-4">
                        <div className="relative inline-flex items-center">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as any)}
                            className="h-7 rounded bg-[#1A2B42] border border-[#253347]/60 px-2.5 text-[10px] font-bold text-white outline-none cursor-pointer hover:border-teal/30 transition-all uppercase"
                          >
                            <option value="EMPLOYEE">RESEARCH ENGINEER</option>
                            <option value="MANAGER">PROJECT MANAGER</option>
                            <option value="ADMIN">ADMINISTRATOR</option>
                          </select>
                        </div>
                      </td>

                      {/* Weekly Target Hours inline editing */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1 justify-center">
                          <input
                            type="number"
                            min="1"
                            max="168"
                            value={u.weeklyTargetHours || 40}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setUsersList(prev => prev.map(item => item.id === u.id ? { ...item, weeklyTargetHours: val } : item));
                            }}
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              handleUpdateWeeklyTarget(u.id, val);
                            }}
                            className="w-12 h-7 rounded bg-[#1A2B42] border border-[#253347]/60 text-center text-[10px] font-bold text-white outline-none focus:border-teal/50 transition-all"
                          />
                          <span className="text-[9px] text-text-muted font-bold">h</span>
                        </div>
                      </td>

                      {/* Status Pill */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block rounded px-2 py-0.5 text-[9px] font-black uppercase ${
                          u.isActive 
                            ? "bg-[#122D23]/30 text-status-success border border-[#122D23]" 
                            : "bg-[#2D1E1E]/30 text-status-danger border border-[#2D1E1E]"
                        }`}>
                          {u.isActive ? "Active" : "Deactivated"}
                        </span>
                      </td>

                      {/* Actions button (Status Toggle) */}
                      <td className="py-3.5 pl-4 text-right">
                        <button
                          onClick={() => handleToggleActiveStatus(u.id)}
                          className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded transition duration-150 ${
                            u.isActive
                              ? "bg-[#2D1E1E]/30 text-status-danger border border-red-950 hover:bg-[#2D1E1E]"
                              : "bg-[#122D23]/30 text-status-success border border-green-950 hover:bg-[#122D23]"
                          }`}
                        >
                          {u.isActive ? "Deactivate" : "Reactivate"}
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>



      {/* Floating toast alerts */}
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

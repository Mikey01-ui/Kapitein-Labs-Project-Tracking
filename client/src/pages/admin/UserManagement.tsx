import { useState, useEffect } from "react";
import { PageShell } from "../../components/layout/PageShell";
import { apiRequest } from "../../services/apiClient";
import { CheckCircle2, AlertCircle, Mail, Calendar, Trash2 } from "lucide-react";
import type { User, UserRole } from "../../types";
import { SkeletonLoader } from "../../components/ui/SkeletonLoader";
import { UserAvatar } from "../../components/ui/UserAvatar";

export function UserManagement() {
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const data = await apiRequest<{ users: User[] }>("/users");
      setUsersList(data.users);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success"
  });

  const triggerToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3500);
  };

  const handleToggleActiveStatus = async (id: string) => {
    const targetUser = usersList.find(u => u.id === id);
    if (!targetUser) return;
    const nextState = !targetUser.isActive;

    try {
      await apiRequest(`/users/${id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: nextState })
      });
      setUsersList(prev => prev.map(u => u.id === id ? { ...u, isActive: nextState } : u));
      triggerToast(`User account ${nextState ? "activated" : "deactivated"} successfully.`);
    } catch (err) {
      console.error(err);
      triggerToast("Failed to update user status.", "error");
    }
  };

  const handleRoleChange = async (id: string, roleStr: UserRole) => {
    try {
      await apiRequest(`/users/${id}`, {
        method: "PUT",
        body: JSON.stringify({ role: roleStr })
      });
      setUsersList(prev => prev.map(u => u.id === id ? { ...u, role: roleStr } : u));
      triggerToast(`Role updated to ${roleStr.replace("_", " ")} successfully!`);
    } catch (err) {
      console.error(err);
      triggerToast("Failed to update user role.", "error");
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove user "${name}" from the agency portal?`)) return;

    try {
      await apiRequest(`/users/${id}`, { method: "DELETE" });
      setUsersList(prev => prev.filter(u => u.id !== id));
      triggerToast(`User ${name} removed from agency portal.`);
    } catch (err) {
      console.error(err);
      triggerToast("Failed to delete user.", "error");
    }
  };

  return (
    <PageShell title="Team Accounts" eyebrow="Agency Administration">
      <div className="space-y-6 select-none">
        
        {/* Table Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#222222] pb-4">
          <div>
            <h3 className="text-sm font-bold font-display text-[#f0ede6]">Active Team Directory</h3>
            <p className="text-xs text-[#888888] mt-0.5">Manage user access permissions, assign roles, and toggle account states.</p>
          </div>
        </div>

        {/* Users Table */}
        <div className="rounded bg-[#111111] border border-[#222222] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#141414] border-b border-[#222222] text-[#888888] font-bold uppercase text-[11px]">
                  <th className="py-3.5 px-4">Member</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Joined Date</th>
                  <th className="py-3.5 px-4">System Role</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222] text-[#f0ede6]">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8">
                      <SkeletonLoader variant="table" />
                    </td>
                  </tr>
                ) : usersList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#888888]">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  usersList.map((u) => {
                    const initials = u.name
                      .split(" ")
                      .map(n => n[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase();

                    return (
                      <tr key={u.id} className="hover:bg-[#181818]/60 transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <UserAvatar name={u.name} avatarUrl={u.avatarUrl} size="md" />
                            <span className="font-bold text-[#f0ede6] whitespace-nowrap">{u.name}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-[#888888] whitespace-nowrap">
                          {u.email}
                        </td>

                        <td className="py-3.5 px-4 text-[#888888] whitespace-nowrap">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>

                        <td className="py-3.5 px-4">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                            className="h-8 rounded bg-[#181818] border border-[#262626] px-2.5 text-xs font-bold text-[#f0ede6] outline-none cursor-pointer hover:border-[#c8ff00]/40 transition"
                          >
                            <option value="OWNER">OWNER</option>
                            <option value="PROJECT_MANAGER">PROJECT MANAGER</option>
                            <option value="TEAM_MEMBER">TEAM MEMBER</option>
                          </select>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                            u.isActive 
                              ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}>
                            {u.isActive ? "Active" : "Deactivated"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleToggleActiveStatus(u.id)}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded transition cursor-pointer ${
                              u.isActive
                                ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                                : "bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20"
                            }`}
                          >
                            {u.isActive ? "Deactivate" : "Reactivate"}
                          </button>

                          {u.role !== "OWNER" && (
                            <button
                              onClick={() => handleDeleteUser(u.id, u.name)}
                              className="p-1 text-[#888888] hover:text-red-400 transition cursor-pointer"
                              title="Delete Account"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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

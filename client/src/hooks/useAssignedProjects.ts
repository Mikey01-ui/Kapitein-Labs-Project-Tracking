import { useState, useEffect } from "react";
import { apiRequest } from "../services/apiClient";
import { useAuth } from "../context/AuthContext";

export function useAssignedProjects() {
  const { user } = useAuth();
  const [assigned, setAssigned] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    apiRequest<{ projects: any[] }>("/projects")
      .then((res) => {
        if (user.role === "ADMIN") {
          setAssigned(res.projects);
        } else if (user.role === "MANAGER") {
          setAssigned(res.projects.filter(p => p.managerId === user.id || p.memberIds.includes(user.id)));
        } else {
          setAssigned(res.projects.filter(p => p.memberIds.includes(user.id)));
        }
      })
      .catch((err) => console.error("Failed to load assigned projects in hook:", err));
  }, [user]);

  return assigned;
}

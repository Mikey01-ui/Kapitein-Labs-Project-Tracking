import { useState, useEffect } from "react";
import { apiRequest } from "../services/apiClient";
import { useAuth } from "../context/AuthContext";
import { Project } from "../types";

export function useAssignedProjects() {
  const { user } = useAuth();
  const [assigned, setAssigned] = useState<Project[]>([]);

  useEffect(() => {
    if (!user) return;
    apiRequest<{ projects: Project[] }>("/projects")
      .then((res) => {
        if (user.role === "OWNER") {
          setAssigned(res.projects);
        } else if (user.role === "PROJECT_MANAGER") {
          setAssigned(res.projects.filter(p => p.managerId === user.id || p.memberIds.includes(user.id)));
        } else {
          setAssigned(res.projects.filter(p => p.memberIds.includes(user.id)));
        }
      })
      .catch((err) => console.error("Failed to load assigned projects in hook:", err));
  }, [user]);

  return assigned;
}

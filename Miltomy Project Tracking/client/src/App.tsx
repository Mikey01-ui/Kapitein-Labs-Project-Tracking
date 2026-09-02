import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { RoleRoute } from "./components/layout/RoleRoute";
import { AdminPanel } from "./pages/admin/AdminPanel";
import { AdminProjects } from "./pages/admin/AdminProjects";
import { Settings } from "./pages/admin/Settings";
import { UserManagement } from "./pages/admin/UserManagement";
import { InvitationManagement } from "./pages/admin/InvitationManagement";
import { Dashboard } from "./pages/employee/Dashboard";
import { MyTasks } from "./pages/employee/MyTasks";
import { FilesPage } from "./pages/employee/FilesPage";
import { Profile } from "./pages/employee/Profile";
import { ProjectDetail } from "./pages/employee/ProjectDetail";
import { Projects } from "./pages/employee/Projects";
import { KanbanBoard } from "./pages/kanban/KanbanBoard";
import { ManageProject } from "./pages/manager/ManageProject";
import { Milestones } from "./pages/manager/Milestones";
import { TeamManagement } from "./pages/manager/TeamManagement";
import { ForgotPassword } from "./pages/public/ForgotPassword";
import { Login } from "./pages/public/Login";
import { Register } from "./pages/public/Register";
import { AcceptInvitation } from "./pages/public/AcceptInvitation";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/invite/:token" element={<AcceptInvitation />} />
      <Route path="/invite-demo" element={<AcceptInvitation isDemo={true} />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tasks" element={<MyTasks />} />
          <Route path="/files" element={<FilesPage />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/projects/:id/kanban" element={<KanbanBoard />} />
          <Route path="/projects/:id/edit" element={<ManageProject />} />
          <Route path="/projects/:id/team" element={<TeamManagement />} />
          <Route path="/projects/:id/milestones" element={<Milestones />} />
          <Route path="/profile" element={<Profile />} />
          
          {/* Shared invitations page for OWNER and PROJECT_MANAGER */}
          <Route element={<RoleRoute allowedRoles={["OWNER", "PROJECT_MANAGER"]} />}>
            <Route path="/admin/invitations" element={<InvitationManagement />} />
          </Route>

          {/* Strict Owner-only administration routes */}
          <Route element={<RoleRoute allowedRoles={["OWNER"]} />}>
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/projects" element={<AdminProjects />} />
            <Route path="/admin/settings" element={<Settings />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}

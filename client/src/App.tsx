import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { AdminPanel } from "./pages/admin/AdminPanel";
import { AdminProjects } from "./pages/admin/AdminProjects";
import { Settings } from "./pages/admin/Settings";
import { UserManagement } from "./pages/admin/UserManagement";
import { Dashboard } from "./pages/employee/Dashboard";
import { LogHours } from "./pages/employee/LogHours";
import { MyHours } from "./pages/employee/MyHours";
import { MyTasks } from "./pages/employee/MyTasks";
import { Expenses } from "./pages/employee/Expenses";
import { Profile } from "./pages/employee/Profile";
import { ProjectDetail } from "./pages/employee/ProjectDetail";
import { Projects } from "./pages/employee/Projects";
import { KanbanBoard } from "./pages/kanban/KanbanBoard";
import { ManageProject } from "./pages/manager/ManageProject";
import { Milestones } from "./pages/manager/Milestones";
import { ProjectHours } from "./pages/manager/ProjectHours";
import { TeamManagement } from "./pages/manager/TeamManagement";
import { ForgotPassword } from "./pages/public/ForgotPassword";
import { Login } from "./pages/public/Login";
import { Register } from "./pages/public/Register";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/my-hours" element={<MyHours />} />
          <Route path="/tasks" element={<MyTasks />} />
          <Route path="/log-hours" element={<LogHours />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/projects/:id/kanban" element={<KanbanBoard />} />
          <Route path="/projects/:id/edit" element={<ManageProject />} />
          <Route path="/projects/:id/hours" element={<ProjectHours />} />
          <Route path="/projects/:id/team" element={<TeamManagement />} />
          <Route path="/projects/:id/milestones" element={<Milestones />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/projects" element={<AdminProjects />} />
          <Route path="/admin/settings" element={<Settings />} />
        </Route>
      </Route>
    </Routes>
  );
}

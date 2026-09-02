import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "../../components/layout/PageShell";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../services/apiClient";
import { ArrowUpRight, AlertTriangle, FolderKanban, Activity, Calendar, CheckSquare, Plus } from "lucide-react";
import { SkeletonLoader } from "../../components/ui/SkeletonLoader";
import { CreateProjectWizard } from "../../components/ui/CreateProjectWizard";
import gsap from "gsap";

export function Dashboard() {
  const { user } = useAuth();
  
  const [projects, setProjects] = useState<any[]>([]);
  const [milestonesList, setMilestonesList] = useState<any[]>([]);
  const [activitiesList, setActivitiesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false);

  const [animatedActiveProjects, setAnimatedActiveProjects] = useState(0);
  const [animatedCompletedTasks, setAnimatedCompletedTasks] = useState(0);
  const [animatedPendingMilestones, setAnimatedPendingMilestones] = useState(0);
  const [animatedTeamMembers, setAnimatedTeamMembers] = useState(0);
  const [animatedTotalTasks, setAnimatedTotalTasks] = useState(0);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [projectsData, activitiesData] = await Promise.all([
          apiRequest<{ projects: any[] }>("/projects"),
          apiRequest<{ activities: any[] }>("/activities").catch(() => ({ activities: [] }))
        ]);

        const rawProjects = projectsData.projects || [];
        setProjects(rawProjects);
        setActivitiesList(activitiesData.activities || []);

        // Fetch detailed data & milestones for active projects
        const activeProjList = rawProjects.filter((p: any) => p.status === "ACTIVE");
        
        const detailsPromises = activeProjList.map((p: any) =>
          apiRequest<{ project: any }>(`/projects/${p.id}`)
            .then(res => res.project)
            .catch(() => null)
        );

        const projectDetails = await Promise.all(detailsPromises);
        
        const allMilestones: any[] = [];
        projectDetails.forEach((pDetail) => {
          if (pDetail?.milestones) {
            allMilestones.push(...pDetail.milestones.map((m: any) => ({ ...m, projectName: pDetail.name })));
          }
        });

        setMilestonesList(allMilestones);
      } catch (err) {
        console.error("Failed to fetch dashboard metrics:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  // Greeting helper
  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good morning";
    if (hr < 17) return "Good afternoon";
    return "Good evening";
  };

  // Process project metrics
  const activeProjects = projects
    .filter(p => p.status === "ACTIVE")
    .map(p => {
      const totalTasks = p.totalTasks || 0;
      const completedTasks = p.completedTasks || 0;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : (p.progressPercent || 0);

      const memberInitials = (p.members || []).map((m: any) => {
        const parts = (m.name || "User").split(" ");
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return m.name.substring(0, 2).toUpperCase();
      });

      return {
        id: p.id,
        name: p.name,
        clientName: p.clientName || "Direct Client",
        status: p.status,
        progress,
        totalTasks,
        completedTasks,
        members: memberInitials.length > 0 ? memberInitials.slice(0, 3) : ["OW"]
      };
    });

  const totalAllTasks = activeProjects.reduce((sum, p) => sum + p.totalTasks, 0);
  const totalCompletedTasks = activeProjects.reduce((sum, p) => sum + p.completedTasks, 0);
  const overallProgressPct = totalAllTasks > 0 ? Math.round((totalCompletedTasks / totalAllTasks) * 100) : 0;

  // Project distribution breakdown
  const projectTasksMap = activeProjects.map(p => {
    const pct = totalAllTasks > 0 ? Math.round((p.totalTasks / totalAllTasks) * 100) : 0;
    return {
      name: p.name,
      tasks: p.totalTasks,
      completed: p.completedTasks,
      percentage: pct
    };
  }).sort((a, b) => b.tasks - a.tasks);

  // Mapped recent activities
  const activities = activitiesList.slice(0, 6).map((act, index) => {
    const userName = act.user?.name || "Team Member";
    const parts = userName.split(" ");
    const initial = parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : userName.substring(0, 2).toUpperCase();
    
    const dateObj = new Date(act.createdAt);
    const diffMs = new Date().getTime() - dateObj.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    let timeStr = "Today";
    if (diffDays === 1) timeStr = "1d ago";
    else if (diffDays > 1) timeStr = `${diffDays}d ago`;
    else {
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHrs >= 1) timeStr = `${diffHrs}h ago`;
      else {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        if (diffMins >= 1) timeStr = `${diffMins}m ago`;
        else timeStr = "Just now";
      }
    }

    return {
      id: act.id || index,
      initial,
      text: act.details || act.actionType.toLowerCase().replace(/_/g, " "),
      time: timeStr,
      userName
    };
  });

  // Upcoming milestones
  const dashboardMilestones = milestonesList
    .filter(m => m.status !== "COMPLETED")
    .slice(0, 4)
    .map(m => {
      const isOverdue = new Date(m.dueDate) < new Date();
      return {
        title: m.name || m.title,
        project: m.projectName || "Client Project",
        date: new Date(m.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
        status: isOverdue ? "danger" : "warning",
        overdue: isOverdue
      };
    });

  const pendingMilestonesCount = milestonesList.filter(m => m.status !== "COMPLETED").length;
  const dueSoonMilestonesCount = milestonesList.filter(m => {
    if (m.status === "COMPLETED") return false;
    const diffMs = new Date(m.dueDate).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  }).length;

  const uniqueMembers = new Set<string>();
  projects.forEach(p => {
    (p.members || []).forEach((m: any) => uniqueMembers.add(m.id || m.userId));
  });
  const teamMembersCount = Math.max(uniqueMembers.size, 1);

  // GSAP Animations
  useEffect(() => {
    if (loading) return;

    const targets = {
      activeProjects: 0,
      completedTasks: 0,
      pendingMilestones: 0,
      teamMembers: 0,
      totalTasks: 0
    };

    gsap.to(targets, {
      activeProjects: activeProjects.length,
      completedTasks: totalCompletedTasks,
      pendingMilestones: pendingMilestonesCount,
      teamMembers: teamMembersCount,
      totalTasks: totalAllTasks,
      duration: 1.2,
      ease: "power2.out",
      onUpdate: () => {
        setAnimatedActiveProjects(Math.round(targets.activeProjects));
        setAnimatedCompletedTasks(Math.round(targets.completedTasks));
        setAnimatedPendingMilestones(Math.round(targets.pendingMilestones));
        setAnimatedTeamMembers(Math.round(targets.teamMembers));
        setAnimatedTotalTasks(Math.round(targets.totalTasks));
      }
    });

    gsap.fromTo(".dash-stat-item",
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: "power2.out", delay: 0.1 }
    );

    gsap.fromTo(".dash-project-item",
      { opacity: 0, x: -15 },
      { opacity: 1, x: 0, duration: 0.5, stagger: 0.08, ease: "power2.out", delay: 0.2 }
    );

    gsap.fromTo(".dash-radial-tick",
      { opacity: 0, scale: 0.7 },
      { opacity: 1, scale: 1, duration: 0.3, stagger: 0.015, ease: "power1.out", transformOrigin: "center", delay: 0.3 }
    );

    gsap.fromTo(".dash-activity-item",
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: "power2.out", delay: 0.4 }
    );

    gsap.fromTo(".dash-milestone-card",
      { opacity: 0, scale: 0.95 },
      { opacity: 1, scale: 1, duration: 0.5, stagger: 0.08, ease: "power2.out", delay: 0.5 }
    );
  }, [loading, activeProjects.length, totalCompletedTasks, pendingMilestonesCount, teamMembersCount, totalAllTasks]);

  // SVG Radial Gauge Rotated Ticks (Kapitein Labs Radial Dial with Miltomy Colors)
  const renderRadialTicks = () => {
    const totalTicks = 40;
    const ticks = [];
    
    const activeProjectsWithTasks = projectTasksMap.filter(p => p.tasks > 0);
    const totalTasksVal = activeProjectsWithTasks.reduce((sum, p) => sum + p.tasks, 0);
    
    let cumulativeTicks = 0;
    const projectTickRanges = activeProjectsWithTasks.map((proj, idx) => {
      const share = totalTasksVal > 0 ? proj.tasks / totalTasksVal : 0;
      const ticksCount = Math.round(share * totalTicks);
      const start = cumulativeTicks;
      const end = Math.min(cumulativeTicks + ticksCount, totalTicks);
      cumulativeTicks += ticksCount;
      
      const colors = ["#c8ff00", "#00C88A", "#F5A623", "#E74C4C"];
      return {
        name: proj.name,
        start,
        end,
        color: colors[idx % colors.length]
      };
    });
    
    if (projectTickRanges.length > 0 && totalTasksVal > 0) {
      projectTickRanges[projectTickRanges.length - 1].end = totalTicks;
    }
    
    for (let i = 0; i < totalTicks; i++) {
      const angle = -225 + (i * 270) / (totalTicks - 1);
      const rad = (angle * Math.PI) / 180;
      
      const r1 = 36;
      const r2 = 42;
      const cx = 50;
      const cy = 55;
      
      const x1 = cx + r1 * Math.cos(rad);
      const y1 = cy + r1 * Math.sin(rad);
      const x2 = cx + r2 * Math.cos(rad);
      const y2 = cy + r2 * Math.sin(rad);
      
      let strokeColor = "#222222";
      if (totalTasksVal > 0) {
        const matchingRange = projectTickRanges.find(r => i >= r.start && i < r.end);
        if (matchingRange) {
          strokeColor = matchingRange.color;
        }
      }
      
      ticks.push(
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={strokeColor}
          strokeWidth="1.2"
          strokeLinecap="round"
          className="dash-radial-tick opacity-0"
        />
      );
    }
    return ticks;
  };

  // Barcode Equalizer Ticks
  const renderBarcodeTicks = () => {
    const totalTicks = 60;
    const activeTicks = Math.round(totalTicks * (overallProgressPct / 100));
    const ticks = [];
    
    for (let i = 0; i < totalTicks; i++) {
      const isActive = i < activeTicks;
      const height = 14 + Math.sin(i * 0.16) * 6 + Math.cos(i * 0.32) * 3;
      
      ticks.push(
        <rect
          key={i}
          x={i * 1.6}
          y={25 - height}
          width="0.8"
          height={height}
          fill={isActive ? "#c8ff00" : "#222222"}
          className="transition-all duration-300"
        />
      );
    }
    return ticks;
  };

  if (loading) {
    return (
      <PageShell title="Dashboard" eyebrow="Overview" hideHeader={true}>
        <SkeletonLoader variant="dashboard" />
      </PageShell>
    );
  }

  return (
    <PageShell title="Dashboard" eyebrow="Overview" hideHeader={true}>
      
      {/* Welcome Title Banner */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-dashed border-[#222222] pb-6">
        <div>
          <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl font-display">
            {getGreeting()}, <span className="text-[#c8ff00]">{user?.name || "Milton"}</span>
          </h1>
          <p className="mt-1 text-xs text-[#888888]">
            Here's what's happening across your assigned client projects today.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          {(user?.role === "OWNER" || user?.role === "PROJECT_MANAGER") && (
            <button
              onClick={() => setIsCreateWizardOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-[#c8ff00] text-[#080808] hover:bg-[#b2e600] font-black text-xs uppercase tracking-wider shadow-lg shadow-[#c8ff00]/20 transition cursor-pointer"
            >
              <Plus size={14} />
              <span>New Project</span>
            </button>
          )}
          <span className="rounded bg-[#111111] border border-[#222222] px-3.5 py-1.5 text-[11px] font-bold text-[#888888]">
            Last 7 Days
          </span>
        </div>
      </div>

      {/* Row 1: Borderless Stats with Dividers */}
      <div className="grid grid-cols-1 gap-6 py-2 sm:grid-cols-2 lg:grid-cols-4 border-b border-[#222222] border-dashed pb-8">
        
        {/* Active Projects */}
        <div className="dash-stat-item flex flex-col justify-between border-r border-[#222222] border-dashed last:border-0 pr-6 lg:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#888888]">Active Projects</p>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-4xl font-black text-white">{animatedActiveProjects}</span>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-[#00C88A]">
              <ArrowUpRight size={12} />
              +{projects.filter(p => new Date(p.createdAt).getMonth() === new Date().getMonth()).length} this month
            </span>
          </div>
        </div>

        {/* Tasks Completed */}
        <div className="dash-stat-item flex flex-col justify-between sm:border-r border-[#222222] border-dashed last:border-0 sm:pr-6 sm:pl-2 lg:pl-4 lg:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#888888]">Deliverables Done</p>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-4xl font-black text-white">{animatedCompletedTasks}</span>
            <span className="text-[10px] font-semibold text-[#c8ff00]">Active</span>
          </div>
        </div>

        {/* Milestones Pending */}
        <div className="dash-stat-item flex flex-col justify-between border-r border-[#222222] border-dashed last:border-0 pr-6 pl-2 lg:pl-4 lg:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#888888]">Milestones Pending</p>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-4xl font-black text-white">{animatedPendingMilestones}</span>
            <span className="rounded bg-[#2D2512] border border-amber-900/30 px-2 py-0.5 text-[9px] font-bold text-[#F5A623]">
              {dueSoonMilestonesCount} due soon
            </span>
          </div>
        </div>

        {/* Team Members */}
        <div className="dash-stat-item flex flex-col justify-between last:border-0 pl-2 lg:pl-4 lg:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#888888]">Team Members</p>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-4xl font-black text-white">{animatedTeamMembers}</span>
            <span className="text-[10px] text-[#888888]">Across all tracks</span>
          </div>
        </div>
      </div>

      {/* Row 2: Active Projects & Hours by Project */}
      <div className="grid grid-cols-1 gap-8 py-8 lg:grid-cols-12 border-b border-[#222222] border-dashed">
        
        {/* Active Projects List */}
        <div className="lg:col-span-7 theme-card-panel">
          <div className="flex items-center justify-between border-b border-[#222222] pb-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#c8ff00] flex items-center gap-1.5">
              <FolderKanban size={14} />
              Active Projects
            </h3>
            <Link to="/projects" className="text-xs font-semibold text-[#c8ff00] hover:text-[#b2e600] transition">
              View all
            </Link>
          </div>

          <div className="mt-2 divide-y divide-[#222222]">
            {activeProjects.map((project) => (
              <div key={project.id} className="dash-project-item flex flex-col gap-3 py-4 first:pt-2 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  {/* Overlapping User Avatars */}
                  <div className="flex -space-x-2 pt-1">
                    {project.members.map((member: any, i: number) => (
                      <div
                        key={i}
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-black border border-[#080808] ${
                          i === 0 ? "bg-[#c8ff00] text-[#080808]" : i === 1 ? "bg-[#181818] text-[#c8ff00]" : "bg-[#222222] text-white"
                        }`}
                      >
                        {member}
                      </div>
                    ))}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/projects/${project.id}`} className="text-sm font-bold text-white hover:text-[#c8ff00] transition duration-300">
                        {project.name}
                      </Link>
                      <span className="rounded bg-[#161616] px-1.5 py-0.5 text-[9px] font-bold text-[#888888] border border-[#222222]">
                        {project.clientName}
                      </span>
                      <span className="rounded bg-[#122D23] px-1.5 py-0.5 text-[9px] font-bold text-[#00C88A] uppercase tracking-wider">
                        Active
                      </span>
                    </div>
                    {/* Slim Progress Bar */}
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-1.5 w-44 rounded-full bg-[#1e1e1e] sm:w-56 overflow-hidden">
                        <div className="h-full bg-[#c8ff00] transition-all duration-500 shadow-sm shadow-[#c8ff00]/40" style={{ width: `${project.progress}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-baseline justify-between sm:flex-col sm:items-end">
                  <span className="text-xs font-bold text-white">{project.progress}% complete</span>
                  <span className="text-[10px] text-[#888888] mt-0.5">{project.completedTasks}/{project.totalTasks} deliverables</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Deliverables Distribution (Radial Dial Gauge) */}
        <div className="lg:col-span-5 border-l border-[#222222] border-dashed lg:pl-8 flex flex-col justify-between theme-card-panel">
          <div>
            <h3 className="border-b border-[#222222] pb-4 text-xs font-bold uppercase tracking-widest text-[#c8ff00] flex items-center gap-1.5">
              <Activity size={14} />
              Deliverables By Project
            </h3>
            
            <div className="mt-8 flex flex-col items-center justify-center gap-6 sm:flex-row">
              {/* SVG Sliced Ticks Radial Dial */}
              <div className="relative h-32 w-32 shrink-0">
                <svg width="100%" height="100%" viewBox="0 0 100 100" className="transform scale-x-[-1]">
                  {renderRadialTicks()}
                </svg>
                {/* Center Details */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
                  <span className="text-2xl font-black text-white">{animatedTotalTasks}</span>
                  <span className="text-[9px] uppercase tracking-widest text-[#888888] mt-0.5">Total Tasks</span>
                </div>
              </div>

              {/* Chart Legend */}
              <div className="flex-grow space-y-2.5 min-w-0">
                {projectTasksMap.slice(0, 4).map((proj, idx) => {
                  const colors = ["bg-[#c8ff00]", "bg-[#00C88A]", "bg-[#F5A623]", "bg-[#E74C4C]"];
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`h-2 w-2 rounded-full shrink-0 ${colors[idx % colors.length]}`} />
                        <span className="text-[#888888] text-[11px] truncate max-w-[130px]">{proj.name}</span>
                      </div>
                      <span className="font-bold text-white shrink-0 ml-2">{proj.percentage}%</span>
                    </div>
                  );
                })}
                {projectTasksMap.length === 0 && (
                  <p className="text-[10px] text-[#888888]">No project tasks registered yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Project Deliverables Progress Bar */}
          <div className="mt-8 border-t border-[#222222] border-dashed pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold text-[#888888] uppercase tracking-wider">
                <span>Overall Delivery Completion</span>
                <span className="text-[#c8ff00] font-extrabold">{overallProgressPct}%</span>
              </div>
              
              {/* 9 Segment Visualizer */}
              <div className="flex gap-1 justify-between h-2 mt-2">
                {Array.from({ length: 9 }).map((_, i) => {
                  const active = i < Math.floor((overallProgressPct / 100) * 9);
                  return (
                    <div
                      key={i}
                      className={`h-full flex-grow rounded-full ${
                        active ? "bg-[#c8ff00] shadow-sm shadow-[#c8ff00]/50" : "bg-[#1e1e1e]"
                      }`}
                    />
                  );
                })}
              </div>
              
              <div className="mt-1 flex justify-between text-[8px] font-bold text-[#888888]">
                <span>{totalCompletedTasks} completed of {totalAllTasks} total client deliverables</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Recent Activity & Progress Equalizer */}
      <div className="grid grid-cols-1 gap-8 py-8 lg:grid-cols-12 border-b border-[#222222] border-dashed">
        
        {/* Recent Activity (Timeline track) */}
        <div className="lg:col-span-7 theme-card-panel">
          <h3 className="border-b border-[#222222] pb-4 text-xs font-bold uppercase tracking-widest text-[#c8ff00] flex items-center gap-1.5">
            <Activity size={14} />
            Recent Activity
          </h3>
          
          <div className="relative mt-6 pl-6 space-y-6">
            {/* Timeline vertical bar */}
            <div className="absolute bottom-2 left-2.5 top-2 w-[1px] bg-[#222222]" />

            {activities.map((act) => (
              <div key={act.id} className="dash-activity-item relative flex items-center justify-between text-xs">
                {/* Timeline bullet avatar */}
                <div className="absolute -left-6 flex h-5 w-5 items-center justify-center rounded-full bg-[#181818] text-[8px] font-black text-[#c8ff00] ring-4 ring-[#080808]">
                  {act.initial}
                </div>

                <span className="text-[#888888] pr-4 text-[11px]">
                  <strong className="text-white font-bold">{act.userName}</strong> {act.text}
                </span>
                <span className="text-[10px] text-[#888888] whitespace-nowrap">{act.time}</span>
              </div>
            ))}

            {activities.length === 0 && (
              <p className="text-xs text-[#888888] py-2 text-left pl-2">No workspace activities recorded yet.</p>
            )}
          </div>
        </div>

        {/* Deliverable Progress (Barcode Equalizer Ticks) */}
        <div className="lg:col-span-5 border-l border-[#222222] border-dashed lg:pl-8 theme-card-panel">
          <h3 className="border-b border-[#222222] pb-4 text-xs font-bold uppercase tracking-widest text-[#c8ff00] flex items-center gap-1.5">
            <CheckSquare size={14} />
            Sprint Completion Velocity
          </h3>

          {/* Equalizer Visualizer */}
          <div className="mt-6 flex justify-center items-end h-20 px-2 bg-[#111111] rounded border border-[#222222] p-4">
            <div className="w-full h-10">
              <svg width="100%" height="100%" viewBox="0 0 100 25" preserveAspectRatio="none">
                {renderBarcodeTicks()}
              </svg>
            </div>
          </div>

          {/* Target Progress stats & bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1">
                {totalCompletedTasks} <span className="text-[#888888] font-normal text-[11px]">of {totalAllTasks} total sprint items</span>
              </span>
              <span className="text-[#c8ff00] font-extrabold">{overallProgressPct}% COMPLETE</span>
            </div>
            <div className="mt-2.5 h-1.5 w-full bg-[#1e1e1e] rounded overflow-hidden">
              <div className="h-full bg-[#c8ff00] transition-all duration-500 shadow-sm shadow-[#c8ff00]/40" style={{ width: `${overallProgressPct}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Upcoming Milestones Ribbon Cards */}
      <div className="py-8">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#c8ff00] flex items-center gap-1.5 mb-6">
          <Calendar size={14} />
          Upcoming Milestones
        </h3>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {dashboardMilestones.map((ms, i) => (
            <div key={i} className="dash-milestone-card relative rounded border border-[#222222] bg-[#111111] p-5 shadow-md flex flex-col justify-between min-h-[7.5rem] hover:border-[#c8ff00]/30 hover:bg-[#161616] hover:shadow-lg transition-all duration-300">
              {/* Status color indicator ribbon */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l ${
                ms.status === "success" ? "bg-[#00C88A]" : ms.status === "warning" ? "bg-[#F5A623]" : "bg-[#E74C4C]"
              }`} />

              <div className="pl-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-[#c8ff00] transition-colors duration-300">{ms.title}</h4>
                  {ms.overdue && (
                    <span className="text-[8px] font-extrabold uppercase tracking-wider text-[#E74C4C] px-1 bg-red-950/40 rounded border border-red-900 flex items-center gap-0.5">
                      <AlertTriangle size={8} />
                      Overdue
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[10px] text-[#888888] line-clamp-1">{ms.project}</p>
              </div>

              <div className="pl-2 mt-4 flex items-center justify-between text-[10px]">
                <span className="text-[#888888]">Due date</span>
                <span className={`font-bold ${ms.overdue ? "text-[#E74C4C]" : "text-white"}`}>{ms.date}</span>
              </div>
            </div>
          ))}

          {dashboardMilestones.length === 0 && (
            <div className="col-span-full py-8 text-center text-xs text-[#888888] bg-[#111111] rounded border border-[#222222]">
              No pending milestones scheduled.
            </div>
          )}
        </div>
      </div>

      {/* 1-Question-at-a-time Create Project Wizard */}
      <CreateProjectWizard
        isOpen={isCreateWizardOpen}
        onClose={() => setIsCreateWizardOpen(false)}
        onProjectCreated={() => {
          // Re-trigger loadDashboardData
          window.location.reload();
        }}
      />
    </PageShell>
  );
}

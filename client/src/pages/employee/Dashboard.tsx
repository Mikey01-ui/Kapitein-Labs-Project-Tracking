import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "../../components/layout/PageShell";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../services/apiClient";
import { formatHours } from "../../utils/formatters";
import { ArrowUpRight, Clock, AlertTriangle, Users, FolderKanban, Activity, Calendar } from "lucide-react";
import type { HourLog } from "../../types";
import { SkeletonLoader } from "../../components/ui/SkeletonLoader";
import gsap from "gsap";

function isWithinCurrentWeek(date: Date) {
  const now = new Date();
  const currentDay = now.getDay();
  const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - distanceToMonday);
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return date >= monday && date <= sunday;
}

function parseLocalDate(dateInput: string | Date) {
  if (dateInput instanceof Date) return dateInput;
  const parts = dateInput.split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(dateInput);
}

export function Dashboard() {
  const { user } = useAuth();
  
  const [projects, setProjects] = useState<any[]>([]);
  const [logs, setLogs] = useState<HourLog[]>([]);
  const [teamLogs, setTeamLogs] = useState<any[]>([]);
  const [milestonesList, setMilestonesList] = useState<any[]>([]);
  const [projectStatusReport, setProjectStatusReport] = useState<any[]>([]);
  const [activitiesList, setActivitiesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [animatedActiveProjects, setAnimatedActiveProjects] = useState(0);
  const [animatedWeekHours, setAnimatedWeekHours] = useState(0);
  const [animatedPendingMilestones, setAnimatedPendingMilestones] = useState(0);
  const [animatedTeamMembers, setAnimatedTeamMembers] = useState(0);
  const [animatedTotalHours, setAnimatedTotalHours] = useState(0);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [projectsData, myLogsData, reportsData, activitiesData] = await Promise.all([
          apiRequest<{ projects: any[] }>("/projects"),
          apiRequest<{ logs: any[] }>("/hours"),
          apiRequest<{ report: any[] }>("/reports/project-status").catch(() => ({ report: [] })),
          apiRequest<{ activities: any[] }>("/activities").catch(() => ({ activities: [] }))
        ]);

        setProjects(projectsData.projects);
        setLogs(myLogsData.logs as any);
        setProjectStatusReport(reportsData.report);
        setActivitiesList(activitiesData.activities);

        // Fetch milestones and project logs in parallel for each project
        const activeProjects = projectsData.projects.filter((p: any) => p.status === "ACTIVE");
        
        const milestonesPromises = activeProjects.map((p: any) =>
          apiRequest<{ milestones: any[] }>(`/projects/${p.id}/milestones`)
            .then(res => res.milestones.map(m => ({ ...m, projectName: p.name })))
            .catch(() => [])
        );
        
        const logsPromises = activeProjects.map((p: any) =>
          apiRequest<{ logs: any[] }>(`/hours/project/${p.id}`)
            .then(res => res.logs.map(l => ({ ...l, projectId: p.id, projectName: p.name })))
            .catch(() => [])
        );

        const [milestonesResults, logsResults] = await Promise.all([
          Promise.all(milestonesPromises),
          Promise.all(logsPromises)
        ]);

        setMilestonesList(milestonesResults.flat());
        
        const sortedTeamLogs = logsResults.flat().sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setTeamLogs(sortedTeamLogs);
      } catch (err) {
        console.error("Failed to fetch dashboard metrics:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const totalHours = teamLogs.reduce((sum, entry) => sum + Number(entry.hours), 0);
  
  const userWeekHours = logs
    .filter(log => log.userId === user?.id && isWithinCurrentWeek(parseLocalDate(log.date)))
    .reduce((sum, log) => sum + Number(log.hours), 0);
    
  const goalTarget = user.weeklyTargetHours || 40;
  const goalPercent = Math.min((userWeekHours / goalTarget) * 100, 100);

  // Greeting helper
  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good morning";
    if (hr < 17) return "Good afternoon";
    return "Good evening";
  };

  // Dynamically mapped active projects from database
  const activeProjects = projects
    .filter(p => p.status === "ACTIVE")
    .map(p => {
      const report = projectStatusReport.find(r => r.projectId === p.id);
      
      const totalTasks = report?.totalTasks || 0;
      const completedTasks = report?.completedTasks || 0;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      const projectWeekHours = teamLogs
        .filter(log => log.projectId === p.id && isWithinCurrentWeek(parseLocalDate(log.date)))
        .reduce((sum, log) => sum + Number(log.hours), 0);

      const memberInitials = (p.members || []).map((m: any) => {
        const parts = m.name.split(" ");
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return m.name.substring(0, 2).toUpperCase();
      });

      return {
        id: p.id,
        name: p.name,
        trl: p.currentTRL,
        status: p.status,
        progress,
        hours: projectWeekHours,
        members: memberInitials.slice(0, 3)
      };
    });

  // Calculate project hours breakdowns using teamLogs
  const totalLogsHours = teamLogs.reduce((sum, l) => sum + Number(l.hours), 0);
  const projectHoursMap = projects.map(p => {
    const projHours = teamLogs.filter(l => l.projectId === p.id).reduce((sum, l) => sum + Number(l.hours), 0);
    const pct = totalLogsHours > 0 ? Math.round((projHours / totalLogsHours) * 100) : 0;
    return {
      name: p.name,
      hours: projHours,
      percentage: pct
    };
  }).sort((a, b) => b.hours - a.hours);

  // Mapped recent activities from activitiesList
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

    let actionText = "";
    const pName = act.project?.name || "Project";
    const cTitle = act.card?.title || "Task";
    const detailText = act.details || "";

    switch (act.actionType) {
      case "CREATED_PROJECT":
        actionText = `created project "${pName}"`;
        break;
      case "UPDATED_PROJECT":
        actionText = `updated project settings for "${pName}"`;
        break;
      case "TRL_UPGRADED":
        actionText = `advanced TRL status for "${pName}" (${detailText})`;
        break;
      case "LOGGED_HOURS":
        actionText = `logged ${detailText} on "${pName}"`;
        break;
      case "UPDATED_HOURS":
        actionText = `updated logged hours: ${detailText} on "${pName}"`;
        break;
      case "DELETED_HOURS":
        actionText = `deleted hour logs on "${pName}" (${detailText})`;
        break;
      case "CREATED_CARD":
        actionText = `created task "${cTitle}" in "${pName}"`;
        break;
      case "UPDATED_CARD":
        actionText = `updated task "${cTitle}" in "${pName}"`;
        break;
      case "MOVED_CARD":
        actionText = `moved task "${cTitle}" in "${pName}" (${detailText})`;
        break;
      case "COMPLETED_CARD":
        actionText = `completed task "${cTitle}" in "${pName}"`;
        break;
      case "DELETED_CARD":
        actionText = `deleted task in "${pName}" (${detailText})`;
        break;
      case "ADDED_ATTACHMENT":
        actionText = `attached file to task "${cTitle}" in "${pName}"`;
        break;
      case "ADDED_PROOF":
        actionText = `attached proof image to hours in "${pName}"`;
        break;
      default:
        actionText = `${act.actionType.toLowerCase().replace(/_/g, " ")}: ${detailText}`;
    }

    return {
      id: act.id || index,
      initial,
      text: actionText,
      time: timeStr,
      userName
    };
  });

  // Mapped upcoming milestones from milestonesList
  const dashboardMilestones = milestonesList
    .filter(m => m.status !== "COMPLETED")
    .slice(0, 4)
    .map(m => {
      const isOverdue = new Date(m.dueDate) < new Date();
      return {
        title: m.name,
        project: m.projectName,
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
    (p.memberIds || []).forEach((mId: string) => uniqueMembers.add(mId));
  });
  const teamMembersCount = uniqueMembers.size;

  useEffect(() => {
    if (loading) return;

    const targets = {
      activeProjects: 0,
      weekHours: 0,
      pendingMilestones: 0,
      teamMembers: 0,
      totalHours: 0
    };

    gsap.to(targets, {
      activeProjects: activeProjects.length,
      weekHours: userWeekHours,
      pendingMilestones: pendingMilestonesCount,
      teamMembers: teamMembersCount,
      totalHours: totalHours,
      duration: 1.2,
      ease: "power2.out",
      onUpdate: () => {
        setAnimatedActiveProjects(Math.round(targets.activeProjects));
        setAnimatedWeekHours(Math.round(targets.weekHours * 10) / 10);
        setAnimatedPendingMilestones(Math.round(targets.pendingMilestones));
        setAnimatedTeamMembers(Math.round(targets.teamMembers));
        setAnimatedTotalHours(Math.round(targets.totalHours * 10) / 10);
      }
    });

    // Animate stats row elements
    gsap.fromTo(".dash-stat-item",
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: "power2.out", delay: 0.1 }
    );

    // Animate active projects list items
    gsap.fromTo(".dash-project-item",
      { opacity: 0, x: -15 },
      { opacity: 1, x: 0, duration: 0.5, stagger: 0.08, ease: "power2.out", delay: 0.2 }
    );

    // Animate radial dial ticks
    gsap.fromTo(".dash-radial-tick",
      { opacity: 0, scale: 0.7 },
      { opacity: 1, scale: 1, duration: 0.3, stagger: 0.015, ease: "power1.out", transformOrigin: "center", delay: 0.3 }
    );

    // Animate timeline activity items
    gsap.fromTo(".dash-activity-item",
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: "power2.out", delay: 0.4 }
    );

    // Animate milestones cards
    gsap.fromTo(".dash-milestone-card",
      { opacity: 0, scale: 0.95 },
      { opacity: 1, scale: 1, duration: 0.5, stagger: 0.08, ease: "power2.out", delay: 0.5 }
    );
  }, [loading, activeProjects.length, userWeekHours, pendingMilestonesCount, teamMembersCount, totalHours]);

  // Custom SVG Radial Gauge Rotated Ticks renderer
  const renderRadialTicks = () => {
    const totalTicks = 40;
    const ticks = [];
    
    // Calculate how many ticks are active in total, or map them per project
    const activeProjectsWithHours = projectHoursMap.filter(p => p.hours > 0);
    const totalHoursVal = activeProjectsWithHours.reduce((sum, p) => sum + p.hours, 0);
    
    let cumulativeTicks = 0;
    const projectTickRanges = activeProjectsWithHours.map((proj, idx) => {
      const share = totalHoursVal > 0 ? proj.hours / totalHoursVal : 0;
      const ticksCount = Math.round(share * totalTicks);
      const start = cumulativeTicks;
      const end = Math.min(cumulativeTicks + ticksCount, totalTicks);
      cumulativeTicks += ticksCount;
      
      const colors = ["#00E5C8", "#00C88A", "#F5A623", "#E74C4C"];
      return {
        name: proj.name,
        start,
        end,
        color: colors[idx % colors.length]
      };
    });
    
    if (projectTickRanges.length > 0 && totalHoursVal > 0) {
      projectTickRanges[projectTickRanges.length - 1].end = totalTicks;
    }
    
    for (let i = 0; i < totalTicks; i++) {
      // 270 degrees arc from -225 to 45 degrees
      const angle = -225 + (i * 270) / (totalTicks - 1);
      const rad = (angle * Math.PI) / 180;
      
      const r1 = 36; // Inner radius
      const r2 = 42; // Outer radius
      const cx = 50;
      const cy = 55;
      
      const x1 = cx + r1 * Math.cos(rad);
      const y1 = cy + r1 * Math.sin(rad);
      const x2 = cx + r2 * Math.cos(rad);
      const y2 = cy + r2 * Math.sin(rad);
      
      let strokeColor = "#1B2A3F"; // Default inactive
      if (totalHoursVal > 0) {
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

  // Custom SVG Barcode Equalizer Ticks renderer (My Hours logs completeness indicator)
  const renderBarcodeTicks = () => {
    const totalTicks = 60;
    const activeTicks = Math.round(totalTicks * (goalPercent / 100)); // Dynamic Weekly completeness
    const ticks = [];
    
    for (let i = 0; i < totalTicks; i++) {
      const isActive = i < activeTicks;
      // Formula to create a natural density frequency visual curve
      const height = 14 + Math.sin(i * 0.16) * 6 + Math.cos(i * 0.32) * 3;
      
      ticks.push(
        <rect
          key={i}
          x={i * 1.6}
          y={25 - height}
          width="0.8"
          height={height}
          fill={isActive ? "#00E5C8" : "#1B2A3F"}
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
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-dashed border-[#1B2A3F] pb-6">
        <div>
          <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">
            {getGreeting()}, <span className="text-teal">{user.name}</span>
          </h1>
          <p className="mt-1 text-xs text-text-muted">
            Here's what's happening across your assigned engineering tracks today.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="rounded-full bg-[#121E30] border border-[#253347] px-3.5 py-1 text-[11px] font-bold text-text-muted">
            Last 7 Days
          </span>
        </div>
      </div>

      {/* Row 1: Borderless Stats with dividers */}
      <div className="grid grid-cols-1 gap-6 py-2 sm:grid-cols-2 lg:grid-cols-4 border-b border-[#1B2A3F] border-dashed pb-8">
        
        {/* Active Projects */}
        <div className="dash-stat-item flex flex-col justify-between border-r border-[#1B2A3F] border-dashed last:border-0 pr-6 lg:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Active Projects</p>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-4xl font-black text-white">{animatedActiveProjects}</span>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-status-success">
              <ArrowUpRight size={12} />
              +{projects.filter(p => new Date(p.createdAt).getMonth() === new Date().getMonth()).length} this month
            </span>
          </div>
        </div>

        {/* Hours Logged */}
        <div className="dash-stat-item flex flex-col justify-between sm:border-r border-[#1B2A3F] border-dashed last:border-0 sm:pr-6 sm:pl-2 lg:pl-4 lg:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Hours This Week</p>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-4xl font-black text-white">{animatedWeekHours}h</span>
            <span className="text-[10px] font-semibold text-teal">Active</span>
          </div>
        </div>

        {/* Upcoming Milestones */}
        <div className="dash-stat-item flex flex-col justify-between border-r border-[#1B2A3F] border-dashed last:border-0 pr-6 pl-2 lg:pl-4 lg:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Milestones Pending</p>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-4xl font-black text-white">{animatedPendingMilestones}</span>
            <span className="rounded bg-[#2D2512] border border-amber-900/30 px-2 py-0.5 text-[9px] font-bold text-status-warning">
              {dueSoonMilestonesCount} due soon
            </span>
          </div>
        </div>

        {/* Team Members */}
        <div className="dash-stat-item flex flex-col justify-between last:border-0 pl-2 lg:pl-4 lg:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Team Members</p>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-4xl font-black text-white">{animatedTeamMembers}</span>
            <span className="text-[10px] text-text-muted">Across all tracks</span>
          </div>
        </div>
      </div>

      {/* Row 2: Active Projects & Hours by Project */}
      <div className="grid grid-cols-1 gap-8 py-8 lg:grid-cols-12 border-b border-[#1B2A3F] border-dashed">
        
        {/* Active Projects List */}
        <div className="lg:col-span-7 theme-card-panel">
          <div className="flex items-center justify-between border-b border-[#1B2A3F] pb-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-teal flex items-center gap-1.5">
              <FolderKanban size={14} />
              Active Projects
            </h3>
            <a href="/projects" className="text-xs font-semibold text-teal hover:text-teal-deep transition">View all</a>
          </div>

          <div className="mt-2 divide-y divide-[#1B2A3F]">
            {activeProjects.map((project) => (
              <div key={project.id} className="dash-project-item flex flex-col gap-3 py-4 first:pt-2 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  {/* Overlapping User Avatars */}
                  <div className="flex -space-x-2 pt-1">
                    {project.members.map((member: any, i: number) => (
                      <div
                        key={i}
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-black border border-[#0B1220] ${
                          i === 0 ? "bg-[#00E5C8] text-navy" : i === 1 ? "bg-[#1A2B42] text-teal" : "bg-[#253347] text-white"
                        }`}
                      >
                        {member}
                      </div>
                    ))}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/projects/${project.id}`} className="text-sm font-bold text-white hover:text-teal transition duration-300">
                        {project.name}
                      </Link>
                      <span className="rounded bg-[#1A2B42] px-1.5 py-0.5 text-[9px] font-bold text-teal border border-teal/10">TRL {project.trl}</span>
                      <span className="rounded bg-[#122D23] px-1.5 py-0.5 text-[9px] font-bold text-status-success uppercase tracking-wider">Active</span>
                    </div>
                    {/* Slim Progress Bar */}
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-1.5 w-44 rounded-full bg-[#1B2A3F] sm:w-56 overflow-hidden">
                        <div className="h-full bg-teal" style={{ width: `${project.progress}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-baseline justify-between sm:flex-col sm:items-end">
                  <span className="text-xs font-bold text-white">{project.progress}% complete</span>
                  <span className="text-[10px] text-text-muted mt-0.5">{project.hours}h this week</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hours By Project (Radial Dial Gauge) */}
        <div className="lg:col-span-5 border-l border-[#1B2A3F] border-dashed lg:pl-8 flex flex-col justify-between theme-card-panel">
          <div>
            <h3 className="border-b border-[#1B2A3F] pb-4 text-xs font-bold uppercase tracking-widest text-teal flex items-center gap-1.5">
              <Activity size={14} />
              Hours By Project
            </h3>
            
            <div className="mt-8 flex flex-col items-center justify-center gap-6 sm:flex-row">
              {/* SVG Sliced Ticks Radial Dial */}
              <div className="relative h-32 w-32">
                <svg width="100%" height="100%" viewBox="0 0 100 100" className="transform scale-x-[-1]">
                  {renderRadialTicks()}
                </svg>
                {/* Center Details */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
                  <span className="text-2xl font-black text-white">{animatedTotalHours}h</span>
                  <span className="text-[9px] uppercase tracking-widest text-text-muted mt-0.5">Total logs</span>
                </div>
              </div>

              {/* Chart Legend */}
              <div className="flex-grow space-y-2.5">
                {projectHoursMap.slice(0, 4).map((proj, idx) => {
                  const colors = ["bg-teal", "bg-status-success", "bg-status-warning", "bg-status-danger"];
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${colors[idx % colors.length]}`} />
                        <span className="text-text-muted text-[11px] truncate max-w-[120px]">{proj.name}</span>
                      </div>
                      <span className="font-bold text-white">{proj.percentage}%</span>
                    </div>
                  );
                })}
                {projectHoursMap.length === 0 && (
                  <p className="text-[10px] text-text-muted">No effort hours logged yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Dynamic Role-Based TRL Maturity Section */}
          <div className="mt-8 border-t border-[#1B2A3F] border-dashed pt-6">
            {(() => {
              // In this mock database, employee is 'PL'
              const employeeInitials = "PL";
              const userProjects = user.role === "EMPLOYEE"
                ? activeProjects.filter((p) => p.members.includes(employeeInitials))
                : activeProjects;

              const sumTrl = userProjects.reduce((sum, p) => sum + p.trl, 0);
              const displayTrl = userProjects.length > 0 ? Number((sumTrl / userProjects.length).toFixed(1)) : 0;

              const trlLabel = user.role === "EMPLOYEE"
                ? (userProjects.length === 1 ? "Assigned Project TRL" : "My Projects Avg TRL")
                : "Portfolio Average TRL";

              const getTrlPhase = (trl: number) => {
                if (trl <= 3) return "Research Phase (Proof of Concept)";
                if (trl <= 6) return "Development Phase (Validation)";
                return "Deployment Phase (Operational System)";
              };

              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold text-text-muted uppercase tracking-wider">
                    <span>{trlLabel}</span>
                    <span className="text-teal font-extrabold">{displayTrl} / 9</span>
                  </div>
                  
                  {/* 9 Segment Visualizer */}
                  <div className="flex gap-1 justify-between h-2 mt-2">
                    {Array.from({ length: 9 }).map((_, i) => {
                      const active = i < Math.floor(displayTrl);
                      const isPartial = i === Math.floor(displayTrl) && displayTrl % 1 !== 0;
                      return (
                        <div
                          key={i}
                          className={`h-full flex-grow rounded-full ${
                            active ? "bg-teal shadow-sm shadow-teal/50" : isPartial ? "bg-teal/40" : "bg-[#1B2A3F]"
                          }`}
                        />
                      );
                    })}
                  </div>
                  
                  <div className="mt-1 flex justify-between text-[8px] font-bold text-text-muted">
                    <span>{getTrlPhase(displayTrl)}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Row 3: Recent Activity & My Hours (Barcode ticks visualizer) */}
      <div className="grid grid-cols-1 gap-8 py-8 lg:grid-cols-12 border-b border-[#1B2A3F] border-dashed">
        
        {/* Recent Activity (Timeline track) */}
        <div className="lg:col-span-7 theme-card-panel">
          <h3 className="border-b border-[#1B2A3F] pb-4 text-xs font-bold uppercase tracking-widest text-teal flex items-center gap-1.5">
            <Activity size={14} />
            Recent Activity
          </h3>
          
          <div className="relative mt-6 pl-6 space-y-6">
            {/* Timeline vertical bar */}
            <div className="absolute bottom-2 left-2.5 top-2 w-[1px] bg-[#1B2A3F]" />

            {activities.map((act) => (
              <div key={act.id} className="dash-activity-item relative flex items-center justify-between text-xs">
                {/* Timeline bullet avatar */}
                <div className="absolute -left-6 flex h-5 w-5 items-center justify-center rounded-full bg-[#1A2B42] text-[8px] font-black text-teal ring-4 ring-[#0B1220]">
                  {act.initial}
                </div>

                <span className="text-text-muted pr-4 text-[11px] font-sans">
                  <strong className="text-white font-bold">{act.userName}</strong> {act.text}
                </span>
                <span className="text-[10px] text-text-muted whitespace-nowrap font-sans">{act.time}</span>
              </div>
            ))}

            {activities.length === 0 && (
              <p className="text-xs text-text-muted py-2 text-left pl-2 font-sans">No workspace activities recorded yet.</p>
            )}
          </div>
        </div>

        {/* My Hours (Barcode Equalizer Ticks visualizer) */}
        <div className="lg:col-span-5 border-l border-[#1B2A3F] border-dashed lg:pl-8 theme-card-panel">
          <h3 className="border-b border-[#1B2A3F] pb-4 text-xs font-bold uppercase tracking-widest text-teal flex items-center gap-1.5">
            <Clock size={14} />
            My Hours Progress
          </h3>

          {/* Equalizer Visualizer */}
          <div className="mt-6 flex justify-center items-end h-20 px-2 bg-[#121E30] rounded-xl border border-border/20 p-4">
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
                {formatHours(animatedWeekHours)} <span className="text-text-muted font-normal text-[11px]">of {goalTarget}h target limit</span>
              </span>
              <span className="text-teal font-extrabold">{Math.min((animatedWeekHours / goalTarget) * 100, 100).toFixed(0)}% COMPLETE</span>
            </div>
            <div className="mt-2.5 h-1.5 w-full bg-[#1B2A3F] rounded-full overflow-hidden">
              <div className="h-full bg-teal" style={{ width: `${Math.min((animatedWeekHours / goalTarget) * 100, 100)}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Upcoming Milestones Ribbon Cards */}
      <div className="py-8">
        <h3 className="text-xs font-bold uppercase tracking-widest text-teal flex items-center gap-1.5 mb-6">
          <Calendar size={14} />
          Upcoming Milestones
        </h3>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {dashboardMilestones.map((ms, i) => (
            <div key={i} className="dash-milestone-card relative rounded-2xl border border-border bg-[#121E30] p-5 shadow-md flex flex-col justify-between min-h-[7.5rem] hover:border-teal/30 hover:bg-[#1A2B42] hover:shadow-lg transition-all duration-300">
              {/* Status color indicator ribbon */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${
                ms.status === "success" ? "bg-status-success" : ms.status === "warning" ? "bg-status-warning" : "bg-status-danger"
              }`} />

              <div className="pl-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-teal transition-colors duration-300">{ms.title}</h4>
                  {ms.overdue && (
                    <span className="text-[8px] font-extrabold uppercase tracking-wider text-status-danger px-1 bg-red-950/40 rounded border border-red-900 flex items-center gap-0.5">
                      <AlertTriangle size={8} />
                      Overdue
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[10px] text-text-muted line-clamp-1">{ms.project}</p>
              </div>

              <div className="pl-2 mt-4 flex items-center justify-between text-[10px]">
                <span className="text-text-muted">Due date</span>
                <span className={`font-bold ${ms.overdue ? "text-status-danger" : "text-white"}`}>{ms.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}

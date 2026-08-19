import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageShell } from "../../components/layout/PageShell";
import { Button } from "../../components/ui/Button";
import { useAssignedProjects } from "../../hooks/useAssignedProjects";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../services/apiClient";
import { formatDate, formatHours } from "../../utils/formatters";
import { 
  Clock, 
  Calendar, 
  MessageSquare, 
  Plus, 
  Trash2, 
  Edit3, 
  Hourglass, 
  Search, 
  Filter, 
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Users,
  CheckCircle,
  Camera
} from "lucide-react";
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

const WERKPAKKETTEN = [
  "1 - Inventarisatie en projectsturing",
  "2 - R&D, prototyping, validatie en testing",
  "3 - Arbeidsmarkt en onderwijs",
  "4 - Economisch perspectief en marktintroductie",
  "5 - Work Package 5",
  "6 - Work Package 6",
  "7 - Work Package 7",
  "8 - Work Package 8",
  "9 - Work Package 9",
  "10 - Work Package 10"
];

const PRINT_WERKPAKKETTEN = [
  "1 - Inventarisatie en projectsturing",
  "2 - R&D, prototyping, validatie en testing",
  "3 - Arbeidsmarkt en onderwijs",
  "4 - Economisch perspectief en marktintroductie",
  "5 -",
  "6 -",
  "7 -",
  "8 -",
  "9 -",
  "10 -"
];

const parseLocalDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  const parts = dateStr.split("-").map(Number);
  if (parts.length === 3) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date(dateStr);
};

const getLast12Months = () => {
  const months = [];
  const date = new Date();
  const dutchMonthNames = [
    "Januari", "Februari", "Maart", "April", "Mei", "Juni", 
    "Juli", "Augustus", "September", "Oktober", "November", "December"
  ];
  for (let i = 0; i < 12; i++) {
    const year = date.getFullYear();
    const monthIndex = date.getMonth();
    const value = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
    const label = `${dutchMonthNames[monthIndex]} ${year}`;
    months.push({ value, label, year, monthIndex });
    date.setMonth(date.getMonth() - 1);
  }
  return months;
};

const getDaysInMonth = (year: number, monthIndex: number) => {
  const date = new Date(year, monthIndex, 1);
  const days = [];
  const dutchDays = ["zo", "ma", "di", "wo", "do", "vr", "za"];
  
  while (date.getMonth() === monthIndex) {
    days.push({
      dayNumber: date.getDate(),
      dayOfWeek: dutchDays[date.getDay()],
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      dateString: date.toISOString().split("T")[0]
    });
    date.setDate(date.getDate() + 1);
  }
  return days;
};

const getWerkpakketIndex = (wpString?: string | null) => {
  if (!wpString) return 0;
  const match = wpString.match(/^(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num >= 1 && num <= 10) return num - 1;
  }
  return 0;
};

const formatDateSlash = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const formatSignatureDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = parseLocalDate(dateStr);
  const months = ["jan.", "feb.", "mrt.", "apr.", "mei", "jun.", "jul.", "aug.", "sep.", "okt.", "nov.", "dec."];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

export function MyHours() {
  const { user } = useAuth();
  const assignedProjects = useAssignedProjects();
  const navigate = useNavigate();
  
  const [logs, setLogs] = useState<HourLog[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [projectLogs, setProjectLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [animatedTotalPersonalHours, setAnimatedTotalPersonalHours] = useState(0);
  const [animatedThisWeekHours, setAnimatedThisWeekHours] = useState(0);

  const [selectedContributorId, setSelectedContributorId] = useState("");

  const fetchMyHoursData = async () => {
    try {
      const [hoursRes, projRes, usersRes] = await Promise.all([
        apiRequest<{ logs: HourLog[] }>("/hours"),
        apiRequest<{ projects: any[] }>("/projects"),
        apiRequest<{ users: any[] }>("/users")
      ]);
      setLogs(hoursRes.logs);
      setProjectsList(projRes.projects);
      setUsersList(usersRes.users);
    } catch (error) {
      console.error("Failed to load hours data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyHoursData();
  }, []);

  // Active View Tab: 'personal' | 'project' | 'individual'
  const [activeTab, setActiveTab] = useState<"personal" | "project" | "individual">("personal");
  
  // Individual Efforts View states
  const [selectedIndividualUserId, setSelectedIndividualUserId] = useState<string | null>(null);
  const [individualLogs, setIndividualLogs] = useState<HourLog[]>([]);
  const [individualLogsLoading, setIndividualLogsLoading] = useState(false);
  const [individualPeriod, setIndividualPeriod] = useState<"week" | "month" | "all">("week");
  const [individualSearchQuery, setIndividualSearchQuery] = useState("");
  const [isPrintingReport, setIsPrintingReport] = useState(false);
  
  // Personal View Filtering & Resolution states
  const [filterProjectId, setFilterProjectId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewResolution, setViewResolution] = useState<"all" | "daily" | "weekly" | "monthly">("all");
  const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({});

  // Project Aggregator state
  const [selectedProjectOverviewId, setSelectedProjectOverviewId] = useState("");
  const [overviewResolution, setOverviewResolution] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [currentOverviewDate, setCurrentOverviewDate] = useState<Date>(new Date("2026-06-03"));

  // Edit log modal control states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split("T")[0]);
  const [currentHours, setCurrentHours] = useState("");
  const [currentNotes, setCurrentNotes] = useState("");
  const [currentWerkpakket, setCurrentWerkpakket] = useState(WERKPAKKETTEN[0]);
  const [currentImages, setCurrentImages] = useState<{ file?: File; url: string; id: string }[]>([]);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  // Lightbox overlay state
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const [activeLog, setActiveLog] = useState<HourLog | null>(null);

  // Timesheet Generator modal control states
  const [isTimesheetOpen, setIsTimesheetOpen] = useState(false);
  const [tsProjectId, setTsProjectId] = useState("");
  const [tsMonth, setTsMonth] = useState("");
  const [tsOrganisation, setTsOrganisation] = useState(() => {
    if (localStorage.getItem("kapetein_demo_mode") === "true") return "Project Tracking Organisation";
    return localStorage.getItem("ts_organisation") || "KapiteinLabs BV JTFW 000058";
  });
  const [tsEmployeeName, setTsEmployeeName] = useState("");
  const [tsPersonnelNumber, setTsPersonnelNumber] = useState(() => localStorage.getItem("ts_personnel_number") || "KLS20252");
  const [tsProjectLeader, setTsProjectLeader] = useState("");
  const [tsSignatureDate, setTsSignatureDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [tsDigitallySign, setTsDigitallySign] = useState(true);

  const isAuthorisedForOverview = user.role === "ADMIN" || user.role === "MANAGER";

  useEffect(() => {
    if (assignedProjects.length > 0 && !selectedProjectOverviewId) {
      setSelectedProjectOverviewId(assignedProjects[0].id);
    }
  }, [assignedProjects, selectedProjectOverviewId]);

  useEffect(() => {
    if (!selectedProjectOverviewId || !isAuthorisedForOverview) return;
    
    apiRequest<{ logs: any[] }>(`/hours/project/${selectedProjectOverviewId}`)
      .then(res => {
        setProjectLogs(res.logs);
      })
      .catch(err => console.error("Failed to fetch project hours:", err));
  }, [selectedProjectOverviewId, isAuthorisedForOverview]);

  useEffect(() => {
    if (tsProjectId) {
      const proj = projectsList.find(p => p.id === tsProjectId);
      if (proj && proj.managerId) {
        const mgr = usersList.find(u => u.id === proj.managerId);
        if (mgr) {
          setTsProjectLeader(mgr.name);
        } else {
          setTsProjectLeader("");
        }
      } else {
        setTsProjectLeader("");
      }
    }
  }, [tsProjectId, projectsList, usersList]);

  useEffect(() => {
    if (!selectedIndividualUserId || !isAuthorisedForOverview) {
      setIndividualLogs([]);
      return;
    }
    
    setIndividualLogsLoading(true);
    apiRequest<{ logs: HourLog[] }>(`/hours/user/${selectedIndividualUserId}`)
      .then(res => {
        setIndividualLogs(res.logs);
        setIndividualLogsLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch individual user hours:", err);
        setIndividualLogsLoading(false);
      });
  }, [selectedIndividualUserId, isAuthorisedForOverview]);

  const handleOpenTimesheet = () => {
    if (!tsEmployeeName) setTsEmployeeName(user.name || "");
    if (!tsProjectId) setTsProjectId(filterProjectId || (assignedProjects[0]?.id || ""));
    if (!tsMonth) {
      const months = getLast12Months();
      if (months.length > 0) setTsMonth(months[0].value);
    }
    setIsTimesheetOpen(true);
  };

  // Lock scroll when modal is open
  useEffect(() => {
    if (isEditOpen || isTimesheetOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isEditOpen]);

  // Date utilities
  const getWeekRange = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    // Adjust when day is Sunday
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d.setDate(diff));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  };

  const isLogInPeriod = (logDateStr: string, refDate: Date, resolution: string) => {
    const logDate = new Date(logDateStr);
    
    if (resolution === "daily") {
      return logDate.toDateString() === refDate.toDateString();
    }
    
    if (resolution === "weekly") {
      const { start, end } = getWeekRange(refDate);
      const startZero = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endZero = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59);
      const logZero = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate());
      return logZero >= startZero && logZero <= endZero;
    }
    
    if (resolution === "monthly") {
      return logDate.getFullYear() === refDate.getFullYear() && logDate.getMonth() === refDate.getMonth();
    }
    
    return false;
  };

  const getPeriodDisplayString = (date: Date, resolution: string) => {
    if (resolution === "daily") {
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    }
    
    if (resolution === "weekly") {
      const { start, end } = getWeekRange(date);
      const startStr = start.toLocaleDateString("en-US", { day: "numeric", month: "short" });
      const endStr = end.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
      return `Week of ${startStr} - ${endStr}`;
    }
    
    if (resolution === "monthly") {
      return date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric"
      });
    }
    
    return "";
  };

  // Navigators for date selector
  const handlePrevPeriod = () => {
    const d = new Date(currentOverviewDate);
    if (overviewResolution === "daily") {
      d.setDate(d.getDate() - 1);
    } else if (overviewResolution === "weekly") {
      d.setDate(d.getDate() - 7);
    } else if (overviewResolution === "monthly") {
      d.setMonth(d.getMonth() - 1);
    }
    setCurrentOverviewDate(d);
  };

  const handleNextPeriod = () => {
    const d = new Date(currentOverviewDate);
    if (overviewResolution === "daily") {
      d.setDate(d.getDate() + 1);
    } else if (overviewResolution === "weekly") {
      d.setDate(d.getDate() + 7);
    } else if (overviewResolution === "monthly") {
      d.setMonth(d.getMonth() + 1);
    }
    setCurrentOverviewDate(d);
  };

  // Personal Logs grouping calculations
  const personalLogs = logs.filter((log) => log.userId === user.id);

  const filteredLogs = personalLogs.filter((log) => {
    const matchesProject = filterProjectId ? log.projectId === filterProjectId : true;
    const matchesSearch = searchQuery
      ? log.notes?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        projectsList.find(p => p.id === log.projectId)?.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesProject && matchesSearch;
  });

  const totalPersonalHours = filteredLogs.reduce((sum, entry) => sum + entry.hours, 0);

  // Calculate hours logged this week (Monday of current week to Sunday)
  const thisWeekHours = personalLogs
    .filter((entry) => isWithinCurrentWeek(parseLocalDate(entry.date)))
    .reduce((sum, entry) => sum + entry.hours, 0);

  const goalTarget = user.weeklyTargetHours || 40;
  const goalPercent = Math.min((thisWeekHours / goalTarget) * 100, 100);

  useEffect(() => {
    if (loading) return;

    const targets = {
      personal: 0,
      week: 0
    };

    gsap.to(targets, {
      personal: totalPersonalHours,
      week: thisWeekHours,
      duration: 1.2,
      ease: "power2.out",
      onUpdate: () => {
        setAnimatedTotalPersonalHours(Math.round(targets.personal * 10) / 10);
        setAnimatedThisWeekHours(Math.round(targets.week * 10) / 10);
      }
    });
  }, [loading, totalPersonalHours, thisWeekHours]);

  // Personal Log Groups Generator
  const getGroupedPersonalLogs = () => {
    if (viewResolution === "daily") {
      const groups: { [key: string]: HourLog[] } = {};
      filteredLogs.forEach(log => {
        if (!groups[log.date]) groups[log.date] = [];
        groups[log.date].push(log);
      });
      return Object.entries(groups)
        .map(([key, value]) => ({
          title: formatDate(key),
          totalHours: value.reduce((sum, l) => sum + l.hours, 0),
          logs: value,
          id: key
        }))
        .sort((a, b) => b.id.localeCompare(a.id));
    }
    
    if (viewResolution === "weekly") {
      const groups: { [key: string]: { startStr: string; endStr: string; logs: HourLog[] } } = {};
      filteredLogs.forEach(log => {
        const { start, end } = getWeekRange(parseLocalDate(log.date));
        const weekKey = start.toISOString().split("T")[0];
        if (!groups[weekKey]) {
          groups[weekKey] = {
            startStr: start.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
            endStr: end.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }),
            logs: []
          };
        }
        groups[weekKey].logs.push(log);
      });
      return Object.entries(groups)
        .map(([key, value]) => ({
          title: `Week of ${value.startStr} - ${value.endStr}`,
          totalHours: value.logs.reduce((sum, l) => sum + l.hours, 0),
          logs: value.logs,
          id: key
        }))
        .sort((a, b) => b.id.localeCompare(a.id));
    }
    
    if (viewResolution === "monthly") {
      const groups: { [key: string]: { label: string; logs: HourLog[] } } = {};
      filteredLogs.forEach(log => {
        const d = parseLocalDate(log.date);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        if (!groups[monthKey]) {
          groups[monthKey] = {
            label,
            logs: []
          };
        }
        groups[monthKey].logs.push(log);
      });
      return Object.entries(groups)
        .map(([key, value]) => ({
          title: value.label,
          totalHours: value.logs.reduce((sum, l) => sum + l.hours, 0),
          logs: value.logs,
          id: key
        }))
        .sort((a, b) => b.id.localeCompare(a.id));
    }
    
    return [];
  };

  const toggleGroupExpand = (id: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const rawProjectLogsInPeriod = projectLogs.filter(
    (log) => isLogInPeriod(log.date, currentOverviewDate, overviewResolution)
  );

  const projectTotalHours = rawProjectLogsInPeriod.reduce((sum, entry) => sum + entry.hours, 0);

  // Hours per person breakdown list
  const activeContributors = usersList.map((userItem) => {
    const userHours = rawProjectLogsInPeriod
      .filter((log) => log.userId === userItem.id)
      .reduce((sum, log) => sum + log.hours, 0);
    
    const initials = userItem.name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

    return {
      user: userItem,
      initials,
      hours: userHours,
      percentage: projectTotalHours > 0 ? Math.round((userHours / projectTotalHours) * 100) : 0
    };
  })
  .filter((c) => c.hours > 0)
  .sort((a, b) => b.hours - a.hours);

  // Filter logs by selected contributor if set
  const projectLogsInPeriod = selectedContributorId
    ? rawProjectLogsInPeriod.filter((log) => log.userId === selectedContributorId)
    : rawProjectLogsInPeriod;

  const displayHoursLogged = projectLogsInPeriod.reduce((sum, entry) => sum + entry.hours, 0);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const renderProofThumbnail = (log: HourLog, sizeClass: string, hidePlaceholder: boolean = false) => {
    const attachments = log.attachments || [];
    const urls = attachments.length > 0 ? attachments.map(a => a.url) : (log.imageUrl ? [log.imageUrl] : []);
    
    if (urls.length === 0) {
      if (hidePlaceholder) return null;
      return <span className="text-[10px] text-text-muted/40">-</span>;
    }
    
    const firstUrl = urls[0];
    const remainingCount = urls.length - 1;
    
    return (
      <div 
        className={`relative ${sizeClass} cursor-pointer group hover:scale-105 active:scale-95 transition mx-auto flex-shrink-0`}
        onClick={() => {
          setActiveImageUrl(firstUrl);
          setActiveLog(log);
        }}
      >
        <img 
          src={firstUrl} 
          alt="Proof" 
          className="w-full h-full object-cover rounded-[inherit] border border-teal/30 group-hover:border-teal"
        />
        {remainingCount > 0 && (
          <div className="absolute inset-0 bg-black/60 rounded-[inherit] flex items-center justify-center font-bold text-white text-[9px] font-sans">
            +{remainingCount}
          </div>
        )}
      </div>
    );
  };

  // CRUD actions
  const handleOpenEdit = (log: HourLog) => {
    setEditingLogId(log.id);
    setCurrentProjectId(log.projectId);
    setCurrentDate(log.date ? log.date.split("T")[0] : new Date().toISOString().split("T")[0]);
    setCurrentHours(log.hours.toString());
    setCurrentNotes(log.notes || "");
    setCurrentWerkpakket(log.werkpakket || WERKPAKKETTEN[0]);
    
    const existing = log.attachments 
      ? log.attachments.map((a, i) => ({ url: a.url, id: `existing-${i}` }))
      : (log.imageUrl ? [{ url: log.imageUrl, id: "existing-0" }] : []);
    setCurrentImages(existing);
    
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLogId || !currentProjectId || !currentDate || !currentHours) return;

    const uploadedUrls: string[] = [];
    for (const item of currentImages) {
      if (item.file) {
        try {
          const base64Content = await fileToBase64(item.file);
          const uploadRes = await apiRequest<{ url: string }>("/upload", {
            method: "POST",
            body: JSON.stringify({
              filename: item.file.name,
              content: base64Content,
              hourLogId: editingLogId
            })
          });
          uploadedUrls.push(uploadRes.url);
        } catch (err) {
          console.error("Failed to upload image during edit:", err);
          alert(`Failed to upload image: ${item.file.name}. Please try again.`);
          return;
        }
      } else {
        uploadedUrls.push(item.url);
      }
    }

    try {
      await apiRequest(`/hours/${editingLogId}`, {
        method: "PUT",
        body: JSON.stringify({
          projectId: currentProjectId,
          date: currentDate,
          hours: parseFloat(currentHours),
          notes: currentNotes,
          werkpakket: currentWerkpakket,
          imageUrl: uploadedUrls.length > 0 ? uploadedUrls[0] : "",
          imageUrls: uploadedUrls
        })
      });
      fetchMyHoursData();
      setIsEditOpen(false);
      setEditingLogId(null);
    } catch (err) {
      console.error("Failed to update hour log:", err);
      alert("Failed to update hour log. Please try again.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this log entry?")) {
      try {
        await apiRequest(`/hours/${id}`, {
          method: "DELETE"
        });
        fetchMyHoursData();
      } catch (err) {
        console.error("Failed to delete hour log:", err);
        alert("Failed to delete hour log.");
      }
    }
  };

  const targetProject = projectsList.find(p => p.id === selectedProjectOverviewId);

  if (loading) {
    return (
      <PageShell title="My Hours" eyebrow="Time logging">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal"></div>
        </div>
      </PageShell>
    );
  }

  // Timesheet variables calculation
  const monthsList = getLast12Months();
  const selectedTsMonthObj = monthsList.find(m => m.value === tsMonth) || monthsList[0];
  const tsMonthLabel = selectedTsMonthObj ? selectedTsMonthObj.label : "";
  const tsYear = selectedTsMonthObj ? selectedTsMonthObj.year : new Date().getFullYear();
  const tsMonthIndex = selectedTsMonthObj ? selectedTsMonthObj.monthIndex : new Date().getMonth();
  
  const tsDays = getDaysInMonth(tsYear, tsMonthIndex);
  const tsProject = projectsList.find(p => p.id === tsProjectId);
  const tsProjectName = tsProject ? tsProject.name : "";

  const tsMonthLogs = logs.filter(log => {
    if (!log.date) return false;
    const parts = log.date.split("-").map(Number);
    if (parts.length < 2) return false;
    const y = parts[0];
    const m = parts[1] - 1;
    return log.projectId === tsProjectId && 
           log.userId === user.id && 
           y === tsYear && 
           m === tsMonthIndex;
  });

  const tsGrandTotal = tsMonthLogs.reduce((sum, l) => sum + parseFloat(l.hours.toString()), 0);

  return (
    <PageShell title="My Hours" eyebrow="Time logging">
      <div className="space-y-6">
        
        {/* Role-Based Tabs (Visible to Managers/Admins only) */}
        {isAuthorisedForOverview && (
          <div className="flex border-b border-[#253347] bg-[#0b1220]/30 select-none rounded-[10px] p-1 border w-fit">
            <button
              onClick={() => setActiveTab("personal")}
              className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-[8px] transition duration-150 ${
                activeTab === "personal"
                  ? "bg-teal text-navy shadow-md shadow-teal/10"
                  : "text-text-muted hover:text-white"
              }`}
            >
              My Personal Logs
            </button>
            <button
              onClick={() => setActiveTab("project")}
              className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-[8px] transition duration-150 ${
                activeTab === "project"
                  ? "bg-teal text-navy shadow-md shadow-teal/10"
                  : "text-text-muted hover:text-white"
              }`}
            >
              Project Effort Analyzer
            </button>
            <button
              onClick={() => setActiveTab("individual")}
              className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-[8px] transition duration-150 ${
                activeTab === "individual"
                  ? "bg-teal text-navy shadow-md shadow-teal/10"
                  : "text-text-muted hover:text-white"
              }`}
            >
              Individual Efforts
            </button>
          </div>
        )}

        {/* VIEW 1: PERSONAL HOURS LIST */}
        {activeTab === "personal" && (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-1 gap-6 py-2 sm:grid-cols-3 border-b border-[#1B2A3F] border-dashed pb-8 select-none">
              <div className="dash-stat-item flex flex-col justify-between border-b sm:border-b-0 sm:border-r border-[#1B2A3F] border-dashed pb-6 sm:pb-0 pr-0 sm:pr-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Total Hours Invested</p>
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="text-4xl font-black text-white">{formatHours(animatedTotalPersonalHours)}</span>
                  <Hourglass size={18} className="text-teal" />
                </div>
              </div>

              <div className="dash-stat-item flex flex-col justify-between border-b sm:border-b-0 sm:border-r border-[#1B2A3F] border-dashed pb-6 sm:pb-0 sm:pr-6 sm:pl-2 lg:pl-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Hours This Week</p>
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="text-4xl font-black text-white">{formatHours(animatedThisWeekHours)}</span>
                  <Clock size={18} className="text-teal" />
                </div>
              </div>

              <div className="dash-stat-item flex flex-col justify-between pl-0 sm:pl-2 lg:pl-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Weekly Goal Target</p>
                <div className="mt-3">
                  <div className="flex items-baseline justify-between text-xs font-bold text-white mb-2">
                    <span>{formatHours(animatedThisWeekHours)} of {goalTarget}h goal</span>
                    <span className="text-teal font-extrabold">{Math.min((animatedThisWeekHours / goalTarget) * 100, 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#1B2A3F] rounded-full overflow-hidden">
                    <div className="h-full bg-teal transition-all duration-500" style={{ width: `${Math.min((animatedThisWeekHours / goalTarget) * 100, 100)}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter and Resolution Toolbar */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-[#1B2A3F] border-dashed pb-6 select-none">
              
              <div className="flex flex-wrap items-center gap-3">
                {/* Search bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search notes or project..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 w-60 rounded-xl border border-border bg-[#121E30] pl-9 pr-4 text-xs text-white outline-none focus:border-teal transition placeholder:text-text-muted/60"
                  />
                </div>

                {/* Project filter dropdown */}
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                  <select
                    value={filterProjectId}
                    onChange={(e) => setFilterProjectId(e.target.value)}
                    className="h-9 rounded-xl border border-border bg-[#121E30] pl-9 pr-8 text-xs font-semibold text-white outline-none focus:border-teal transition cursor-pointer appearance-none"
                  >
                    <option value="">All Projects</option>
                    {assignedProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[8px] text-text-muted">
                    ▼
                  </div>
                </div>

                {/* Resolution Filters switch (Daily / Weekly / Monthly) */}
                <div className="flex bg-[#121E30] border border-border rounded-xl p-0.5">
                  {(["all", "daily", "weekly", "monthly"] as const).map((res) => (
                    <button
                      key={res}
                      onClick={() => setViewResolution(res)}
                      className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition duration-150 ${
                        viewResolution === res
                          ? "bg-[#1A2B42] text-teal"
                          : "text-text-muted hover:text-white"
                      }`}
                    >
                      {res === "all" ? "Flat List" : res}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toolbar Buttons */}
              <div className="flex gap-2.5 self-start lg:self-auto">
                <Button 
                  onClick={handleOpenTimesheet}
                  variant="secondary"
                  className="flex items-center gap-1.5 text-xs py-2 px-4"
                >
                  <Calendar size={14} className="text-teal" />
                  Generate Timesheet
                </Button>
                <Button onClick={() => navigate("/log-hours")} className="flex items-center gap-1 text-xs py-2 px-4">
                  <Plus size={14} />
                  Log Hours
                </Button>
              </div>
            </div>

            {/* List / Table Render */}
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 border border-dashed border-[#1B2A3F] rounded-2xl text-center p-6 bg-[#121E30]/20 select-none">
                <Clock size={36} className="text-text-muted mb-3" />
                <h4 className="text-sm font-bold text-white">No logs found</h4>
                <p className="text-xs text-text-muted mt-1 max-w-xs">Try adjusting filters or record a new hour log entry.</p>
              </div>
            ) : viewResolution === "all" ? (
              /* RESOLUTION: FLAT LIST TABLE */
              <div className="overflow-x-auto select-none">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#1B2A3F] text-text-muted font-bold uppercase tracking-wider">
                      <th className="pb-3 pr-4">Project</th>
                      <th className="pb-3 px-4">Date</th>
                      <th className="pb-3 px-4 hidden md:table-cell">Werkpakket</th>
                      <th className="pb-3 px-4 text-right">Hours</th>
                      <th className="pb-3 px-4 hidden md:table-cell">Notes</th>
                      <th className="pb-3 px-4 text-center">Proof</th>
                      <th className="pb-3 pl-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1B2A3F]">
                    {filteredLogs.map((entry) => {
                      const project = projectsList.find((item) => item.id === entry.projectId);
                      return (
                        <tr key={entry.id} className="hover:bg-[#1A2B42] transition duration-250 group">
                          <td className="py-4 pr-4 font-bold text-white">{project?.name ?? "Unknown Project"}</td>
                          <td className="py-4 px-4 text-text-muted">{formatDate(entry.date)}</td>
                          <td className="py-4 px-4 text-text-muted hidden md:table-cell truncate max-w-[150px]" title={entry.werkpakket}>
                            {entry.werkpakket ? entry.werkpakket.split(" - ")[0] : "-"}
                          </td>
                          <td className="py-4 px-4 text-right font-bold text-teal">{formatHours(entry.hours)}</td>
                          <td className="py-4 px-4 text-text-muted italic max-w-xs truncate hidden md:table-cell" title={entry.notes}>
                            {entry.notes ? (
                              <span className="flex items-center gap-1.5">
                                <MessageSquare size={11} className="text-teal/60 flex-shrink-0" />
                                {entry.notes}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {renderProofThumbnail(entry, "w-8 h-8 rounded-lg")}
                          </td>
                          <td className="py-4 pl-4 text-right">
                            <div className="flex items-center justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleOpenEdit(entry)}
                                className="p-1 rounded text-text-muted hover:bg-[#0B1220] hover:text-teal transition"
                                title="Edit Log"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                onClick={() => handleDelete(entry.id)}
                                className="p-1 rounded text-text-muted hover:bg-[#0B1220] hover:text-status-danger transition"
                                title="Delete Log"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* RESOLUTION: GROUPED ACCORDION PANELS */
              <div className="space-y-3 select-none">
                {getGroupedPersonalLogs().map((group) => {
                  const isExpanded = expandedGroups[group.id] !== false; // Default to true if not set
                  return (
                    <div key={group.id} className="rounded-xl border border-border bg-[#121E30] overflow-hidden shadow-sm">
                      {/* Group Header */}
                      <button
                        onClick={() => toggleGroupExpand(group.id)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-[#1A2B42]/10 hover:bg-[#1A2B42]/30 transition text-left"
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown size={14} className="text-teal" /> : <ChevronRight size={14} className="text-teal" />}
                          <span className="text-xs font-black text-white">{group.title}</span>
                          <span className="text-[10px] text-text-muted">({group.logs.length} entries)</span>
                        </div>
                        <span className="text-xs font-black text-teal">{group.totalHours}h</span>
                      </button>

                      {/* Group Content logs table */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 bg-[#0b1220]/20 border-t border-[#253347]/40">
                          <table className="w-full text-left text-[11px] border-collapse">
                            <thead>
                              <tr className="border-b border-[#253347]/50 text-text-muted font-bold uppercase tracking-wider">
                                <th className="py-2 pr-4">Project</th>
                                <th className="py-2 px-4">Date</th>
                                <th className="py-2 px-4 hidden md:table-cell">Werkpakket</th>
                                <th className="py-2 px-4 text-right">Hours</th>
                                <th className="py-2 px-4 hidden md:table-cell">Notes</th>
                                <th className="py-2 px-4 text-center">Proof</th>
                                <th className="py-2 pl-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#253347]/30">
                              {group.logs.map((entry) => {
                                const project = projectsList.find((p) => p.id === entry.projectId);
                                return (
                                  <tr key={entry.id} className="hover:bg-[#1A2B42]/10 transition duration-150">
                                    <td className="py-2.5 pr-4 font-bold text-white">{project?.name}</td>
                                    <td className="py-2.5 px-4 text-text-muted">{formatDate(entry.date)}</td>
                                    <td className="py-2.5 px-4 text-text-muted hidden md:table-cell truncate max-w-[150px]" title={entry.werkpakket}>
                                      {entry.werkpakket ? entry.werkpakket.split(" - ")[0] : "-"}
                                    </td>
                                    <td className="py-2.5 px-4 text-right font-bold text-teal">{entry.hours}h</td>
                                    <td className="py-2.5 px-4 text-text-muted max-w-xs truncate hidden md:table-cell" title={entry.notes}>
                                      {entry.notes || "-"}
                                    </td>
                                    <td className="py-2.5 px-4 text-center">
                                      {renderProofThumbnail(entry, "w-7 h-7 rounded-md")}
                                    </td>
                                    <td className="py-2.5 pl-4 text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          onClick={() => handleOpenEdit(entry)}
                                          className="p-0.5 rounded text-text-muted hover:text-teal transition"
                                          title="Edit Log"
                                        >
                                          <Edit3 size={11} />
                                        </button>
                                        <button
                                          onClick={() => handleDelete(entry.id)}
                                          className="p-0.5 rounded text-text-muted hover:text-status-danger transition"
                                          title="Delete Log"
                                        >
                                          <Trash2 size={11} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* VIEW 2: PROJECT HOURS AGGREGATOR */}
        {activeTab === "project" && isAuthorisedForOverview && (
          <div className="space-y-6">
            
            {/* Project Aggregator Controls Toolbar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#1B2A3F] border-dashed pb-6 select-none">
              
              {/* Project Search Dropdown */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                  <select
                    value={selectedProjectOverviewId}
                    onChange={(e) => {
                      setSelectedProjectOverviewId(e.target.value);
                      setSelectedContributorId(""); // reset contributor filter on project change
                    }}
                    className="h-9 w-64 rounded-xl border border-border bg-[#121E30] pl-9 pr-8 text-xs font-semibold text-white outline-none focus:border-teal transition cursor-pointer appearance-none"
                  >
                    {assignedProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[8px] text-text-muted">
                    ▼
                  </div>
                </div>

                {/* Contributor filter dropdown */}
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                  <select
                    value={selectedContributorId}
                    onChange={(e) => setSelectedContributorId(e.target.value)}
                    className="h-9 w-48 rounded-xl border border-border bg-[#121E30] pl-9 pr-8 text-xs font-semibold text-white outline-none focus:border-teal transition cursor-pointer appearance-none"
                  >
                    <option value="">All Contributors</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[8px] text-text-muted">
                    ▼
                  </div>
                </div>

                {/* Resolution filter */}
                <div className="flex bg-[#121E30] border border-border rounded-xl p-0.5">
                  {(["daily", "weekly", "monthly"] as const).map((res) => (
                    <button
                      key={res}
                      onClick={() => setOverviewResolution(res)}
                      className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition duration-150 ${
                        overviewResolution === res
                          ? "bg-[#1A2B42] text-teal"
                          : "text-text-muted hover:text-white"
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date slider navigator */}
              <div className="flex items-center gap-3 bg-[#121E30] border border-border rounded-xl px-2 py-1">
                <button 
                  onClick={handlePrevPeriod}
                  className="p-1 text-text-muted hover:text-teal transition hover:bg-[#1A2B42] rounded-lg"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-black text-white px-2 whitespace-nowrap">
                  {getPeriodDisplayString(currentOverviewDate, overviewResolution)}
                </span>
                <button 
                  onClick={handleNextPeriod}
                  className="p-1 text-text-muted hover:text-teal transition hover:bg-[#1A2B42] rounded-lg"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

            </div>

            {/* Aggregated Project Stats Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 select-none">
              
              {/* Stat card 1: Total logged hours */}
              <div className="rounded-[20px] bg-[#121E30] border border-border p-6 shadow-md flex flex-col justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  {selectedContributorId 
                    ? `Hours Logged by ${usersList.find(u => u.id === selectedContributorId)?.name || "Member"}` 
                    : "Total Hours Logged"}
                </p>
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="text-3xl font-black text-white">{displayHoursLogged}h</span>
                  <span className="p-1.5 rounded-full bg-teal/10 text-teal">
                    <Hourglass size={14} />
                  </span>
                </div>
              </div>

              {/* Stat card 2: Contributors count */}
              <div className="rounded-[20px] bg-[#121E30] border border-border p-6 shadow-md flex flex-col justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Active Contributors</p>
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="text-3xl font-black text-white">{activeContributors.length}</span>
                  <span className="p-1.5 rounded-full bg-teal/10 text-teal">
                    <Users size={14} />
                  </span>
                </div>
              </div>

              {/* Stat card 3: Track status */}
              <div className="rounded-[20px] bg-[#121E30] border border-border p-6 shadow-md flex flex-col justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Project Track Status</p>
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="text-lg font-black text-white uppercase tracking-wider">
                    {targetProject?.status || "ACTIVE"}
                  </span>
                  <span className="p-1.5 rounded-full bg-teal/10 text-teal">
                    <CheckCircle size={14} />
                  </span>
                </div>
              </div>

            </div>

            {/* Project Aggregator Details: Hours per person & individual logs breakdown */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              
              {/* Hours per person contribution list (2/3 width) */}
              <div className="rounded-[20px] bg-[#121E30] border border-border p-6 shadow-md lg:col-span-2 space-y-4 select-none">
                <h3 className="text-xs font-bold uppercase tracking-widest text-teal border-b border-[#253347] border-dashed pb-3.5 flex items-center gap-2">
                  <Users size={14} />
                  Hours Logged per Person
                </h3>

                {activeContributors.length === 0 ? (
                  <p className="text-xs text-text-muted py-4 text-center">No active logs recorded by the team in this period.</p>
                ) : (
                  <div className="space-y-2">
                    {activeContributors.map((item) => {
                      const isSelected = selectedContributorId === item.user.id;
                      return (
                        <div 
                          key={item.user.id} 
                          className={`space-y-2 p-2.5 rounded-xl border transition-all cursor-pointer ${
                            isSelected 
                              ? "bg-[#1A2B42]/50 border-teal shadow-md shadow-teal/5" 
                              : "bg-transparent border-transparent hover:bg-[#1A2B42]/10"
                          }`}
                          onClick={() => setSelectedContributorId(isSelected ? "" : item.user.id)}
                        >
                          <div className="flex items-center justify-between text-xs font-bold">
                            <div className="flex items-center gap-2">
                              {/* Initials Avatar */}
                              <div className="flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-black bg-[#1A2B42] text-teal border border-teal/10">
                                {item.initials}
                              </div>
                              <span className="text-white">{item.user.name}</span>
                              <span className="text-[9px] bg-[#1A2B42] px-1.5 py-0.5 rounded text-text-muted">{item.user.role}</span>
                            </div>
                            <span className="text-teal font-extrabold">{item.hours}h ({item.percentage}%)</span>
                          </div>
                          {/* Contribution percentage bar indicator */}
                          <div className="h-2 w-full rounded-full bg-[#1B2A3F] overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 shadow-sm ${
                                isSelected ? "bg-teal shadow-teal/50" : "bg-teal/70"
                              }`} 
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Raw logs stream list (1/3 width) */}
              <div className="rounded-[20px] bg-[#121E30] border border-border p-6 shadow-md flex flex-col justify-between select-none">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-teal border-b border-[#253347] border-dashed pb-3.5 flex items-center gap-2">
                    <Clock size={14} />
                    Logs Stream in Period
                  </h3>

                  {projectLogsInPeriod.length === 0 ? (
                    <p className="text-xs text-text-muted py-4 text-center">No logs listed.</p>
                  ) : (
                    <div className="space-y-3.5 max-h-60 overflow-y-auto planka-scrollbar pr-1">
                      {projectLogsInPeriod.map((log) => {
                        const contributor = usersList.find((u) => u.id === log.userId);
                        return (
                          <div key={log.id} className="border-b border-[#253347]/40 pb-3 last:border-0 last:pb-0">
                            <div className="flex items-center justify-between text-[10px] font-bold">
                              <span className="text-white">{contributor?.name || "Member"}</span>
                              <div className="flex items-center gap-2">
                                {renderProofThumbnail(log, "w-5 h-5 rounded", true)}
                                <span className="text-teal">{log.hours}h</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-[8px] text-text-muted mt-0.5">
                              <span>{formatDate(log.date)}</span>
                            </div>
                            {log.notes && (
                              <p className="text-[10px] text-text-muted italic mt-1.5 bg-[#0b1220]/20 p-2 rounded border border-[#253347]/40 truncate">
                                {log.notes}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {activeTab === "individual" && isAuthorisedForOverview && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 select-none">
            {/* Left Panel: Employee Directory */}
            <div className="lg:col-span-4 rounded-2xl bg-navy-surface p-6 shadow-lg border-0 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-teal border-b border-[#1B2A3F] border-dashed pb-3.5 flex items-center gap-2">
                <Users size={14} />
                Employee Directory
              </h3>
              
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Search employees..." 
                  value={individualSearchQuery}
                  onChange={e => setIndividualSearchQuery(e.target.value)}
                  className="w-full h-10 rounded-xl border border-[#1B2A3F] bg-[#0B1220] px-4 text-xs text-white placeholder:text-text-muted/60 outline-none focus:border-teal transition"
                />
              </div>

              <div className="space-y-2.5 max-h-[500px] overflow-y-auto planka-scrollbar pr-1">
                {usersList
                  .filter(u => u.name.toLowerCase().includes(individualSearchQuery.toLowerCase()) || u.email.toLowerCase().includes(individualSearchQuery.toLowerCase()))
                  .map(u => {
                    const isSelected = selectedIndividualUserId === u.id;
                    const initials = u.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
                    
                    return (
                      <div 
                        key={u.id}
                        onClick={() => setSelectedIndividualUserId(u.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all ${
                          isSelected 
                            ? "bg-teal border-teal text-navy" 
                            : "bg-[#0B1220]/40 border-[#1B2A3F] hover:bg-[#121E30]/60 text-white"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-black border ${
                          isSelected ? "bg-navy text-teal border-transparent" : "bg-teal/10 text-teal border-teal/20"
                        }`}>
                          {u.avatarUrl && !isSelected ? (
                            <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover rounded-full" />
                          ) : initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className={`block text-xs font-bold truncate ${isSelected ? "text-navy" : "text-white"}`}>{u.name}</span>
                          <span className={`block text-[9px] truncate ${isSelected ? "text-navy/70" : "text-text-muted"}`}>{u.email}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                            isSelected 
                              ? "bg-navy/10 border-navy/20 text-navy" 
                              : "bg-white/5 border-white/5 text-text-muted"
                          }`}>
                            {u.role}
                          </span>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </div>

            {/* Right Panel: Selected Employee detailed logs */}
            <div className="lg:col-span-8 rounded-2xl bg-navy-surface p-6 shadow-lg border-0">
              {!selectedIndividualUserId ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-text-muted gap-3">
                  <Users size={36} className="text-teal/30 animate-pulse" />
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">No Employee Selected</h4>
                    <p className="text-[10px] text-text-muted mt-1 max-w-[240px] leading-relaxed">
                      Select an employee from the directory to analyze their logged hours, descriptions, and audit proofs.
                    </p>
                  </div>
                </div>
              ) : (() => {
                const selUser = usersList.find(u => u.id === selectedIndividualUserId);
                if (!selUser) return null;

                // Filter logs based on period selection
                const now = new Date();
                const filteredLogs = individualLogs.filter(log => {
                  if (individualPeriod === "all") return true;
                  const logDate = new Date(log.date);
                  if (individualPeriod === "week") {
                    // Start of current week (Monday)
                    const startOfWeek = new Date(now);
                    const day = startOfWeek.getDay();
                    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
                    startOfWeek.setDate(diff);
                    startOfWeek.setHours(0,0,0,0);
                    return logDate >= startOfWeek;
                  }
                  if (individualPeriod === "month") {
                    // Start of current month
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    return logDate >= startOfMonth;
                  }
                  return true;
                });

                const totalHours = filteredLogs.reduce((sum, l) => sum + l.hours, 0);
                const targetHours = selUser.weeklyTargetHours || 40;
                const progressPercentage = Math.min((totalHours / targetHours) * 100, 100);

                return (
                  <div className="space-y-5">
                    {/* Employee Profile Header & Export buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1B2A3F] border-dashed pb-4 select-none">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-teal/10 text-teal border border-teal/20 text-sm font-black">
                          {selUser.avatarUrl ? (
                            <img src={selUser.avatarUrl} alt={selUser.name} className="w-full h-full object-cover rounded-full" />
                          ) : selUser.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-white uppercase tracking-wider">{selUser.name}</h4>
                          <span className="text-[9px] text-text-muted">{selUser.email}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button
                          onClick={() => {
                            setIsPrintingReport(true);
                            setTimeout(() => {
                              window.print();
                              setIsPrintingReport(false);
                            }, 300);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-teal text-teal hover:bg-teal hover:text-navy text-[10px] font-black uppercase tracking-wider transition duration-150"
                        >
                          Export PDF
                        </button>
                      </div>
                    </div>

                    {/* Stats & Progress indicators */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#0B1220]/40 border border-[#1B2A3F] rounded-2xl p-4">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-text-muted">Logged Effort</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-white">{totalHours.toFixed(1)}h</span>
                          <span className="text-[10px] text-text-muted">in selected period</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-text-muted">
                          <span>Weekly Target Progress</span>
                          <span className="text-white font-mono">{totalHours.toFixed(1)} / {targetHours}h</span>
                        </div>
                        <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                          <div 
                            className="h-full bg-teal rounded-full transition-all duration-500" 
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Period Switcher tabs */}
                    <div className="flex justify-between items-center bg-[#0b1220]/30 select-none rounded-[10px] p-1 border border-[#253347] w-fit">
                      {(["week", "month", "all"] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setIndividualPeriod(p)}
                          className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-[6px] transition duration-150 ${
                            individualPeriod === p
                              ? "bg-teal text-navy shadow-md shadow-teal/10"
                              : "text-text-muted hover:text-white"
                          }`}
                        >
                          {p === "week" ? "This Week" : p === "month" ? "This Month" : "All Time"}
                        </button>
                      ))}
                    </div>

                    {/* Log entries detailed table */}
                    {individualLogsLoading ? (
                      <div className="py-12 flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 rounded-full border border-teal/20 border-t-teal animate-spin" />
                        <span className="text-[10px] text-text-muted">Loading logged entries...</span>
                      </div>
                    ) : filteredLogs.length === 0 ? (
                      <div className="py-12 text-center text-text-muted text-[10px]">
                        No logs found in this period.
                      </div>
                    ) : (
                      <div className="overflow-x-auto planka-scrollbar border border-[#1b273d] rounded-2xl">
                        <table className="w-full border-collapse text-left text-xs">
                          <thead>
                            <tr className="bg-[#0B1220]/60 border-b border-[#1b273d] text-[9px] uppercase tracking-widest text-text-muted">
                              <th className="py-3 px-4 font-black">Date</th>
                              <th className="py-3 px-4 font-black">Project</th>
                              <th className="py-3 px-4 font-black">Werkpakket</th>
                              <th className="py-3 px-4 font-black text-right">Hours</th>
                              <th className="py-3 px-4 font-black">Task Description</th>
                              <th className="py-3 px-4 font-black text-center">Proof</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1b273d]/40 bg-[#0B1220]/10">
                            {filteredLogs.map((log) => (
                              <tr key={log.id} className="hover:bg-[#121E30]/40 transition duration-150 group">
                                <td className="py-3.5 px-4 font-medium text-white">{formatDate(log.date)}</td>
                                <td className="py-3.5 px-4 text-white font-bold">{projectsList.find(p => p.id === log.projectId)?.name || "Unknown Project"}</td>
                                <td className="py-3.5 px-4 text-text-muted truncate max-w-[120px]" title={log.werkpakket}>
                                  {log.werkpakket ? log.werkpakket.split(" - ")[0] : "-"}
                                </td>
                                <td className="py-3.5 px-4 text-right font-black text-teal">
                                  <div>{log.hours}h</div>
                                  {log.startTime && log.endTime && (
                                    <div className="text-[9px] text-teal/70 font-mono mt-0.5">{log.startTime} - {log.endTime}</div>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-text-muted max-w-xs truncate" title={log.notes}>
                                  {log.notes || "-"}
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  {renderProofThumbnail(log, "w-7 h-7 rounded-md")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

      </div>

      {/* EDIT LOG DIALOG / MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0B1220]/30 backdrop-blur-lg p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-[24px] border border-[#1B2A3F] bg-[#121E30]/90 backdrop-blur-md p-6 shadow-2xl shadow-black/40 animate-in fade-in zoom-in-95 duration-250">
            <div className="flex items-center justify-between border-b border-[#1B2A3F] border-dashed pb-4 mb-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
                <Edit3 size={15} className="text-teal" />
                Edit Log Entry
              </h3>
              <button onClick={() => setIsEditOpen(false)} className="text-text-muted hover:text-white transition">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-5 text-xs">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted">Select Project</label>
                <div className="relative">
                  <select
                    value={currentProjectId}
                    onChange={(e) => setCurrentProjectId(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#1B2A3F] bg-[#0B1220] px-4 pr-10 font-semibold text-white outline-none focus:border-teal transition cursor-pointer appearance-none text-xs"
                    required
                  >
                    {assignedProjects.map((p) => (
                      <option key={p.id} value={p.id} className="bg-[#121E30]">
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-text-muted text-[8px]">
                    ▼
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted">Werkpakket</label>
                <div className="relative">
                  <select
                    value={currentWerkpakket}
                    onChange={(e) => setCurrentWerkpakket(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#1B2A3F] bg-[#0B1220] px-4 pr-10 font-semibold text-white outline-none focus:border-teal transition cursor-pointer appearance-none text-xs"
                    required
                  >
                    {WERKPAKKETTEN.map((wp) => (
                      <option key={wp} value={wp} className="bg-[#121E30]">
                        {wp}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-text-muted text-[8px]">
                    ▼
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted">Date</label>
                  <input
                    type="date"
                    value={currentDate}
                    onChange={(e) => setCurrentDate(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#1B2A3F] bg-[#0B1220] px-4 text-white outline-none focus:border-teal transition text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted">Hours</label>
                  <input
                    type="number"
                    min="0.25"
                    max="24"
                    step="0.25"
                    value={currentHours}
                    onChange={(e) => setCurrentHours(e.target.value)}
                    placeholder="e.g. 7.5"
                    className="w-full h-10 rounded-xl border border-[#1B2A3F] bg-[#0B1220] px-4 text-white outline-none focus:border-teal transition text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted">Work Description</label>
                <textarea
                  value={currentNotes}
                  onChange={(e) => setCurrentNotes(e.target.value)}
                  placeholder="What tasks did you work on?"
                  className="w-full min-h-24 rounded-xl border border-[#1B2A3F] bg-[#0B1220] p-4 text-white placeholder:text-text-muted/60 outline-none focus:border-teal transition resize-none text-xs"
                />
              </div>

              {/* Attach / Edit image field */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted flex items-center gap-1">
                  <Camera size={13} className="text-teal" />
                  Progress Screenshot / Image (Optional, can upload multiple)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files) {
                      const newFiles = Array.from(files);
                      newFiles.forEach((file) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setCurrentImages(prev => [
                            ...prev,
                            { file, url: reader.result as string, id: `new-${Date.now()}-${Math.random()}` }
                          ]);
                        };
                        reader.readAsDataURL(file);
                      });
                    }
                  }}
                  className="w-full rounded-xl border border-[#1B2A3F] bg-[#0B1220] px-4 py-2.5 text-xs text-white file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-teal file:text-navy hover:file:bg-teal/80 file:cursor-pointer transition"
                />
                {currentImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {currentImages.map((imgItem) => (
                      <div key={imgItem.id} className="relative w-24 h-16 rounded-xl overflow-hidden border border-[#1B2A3F] group">
                        <img src={imgItem.url} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentImages(prev => prev.filter(item => item.id !== imgItem.id));
                          }}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition duration-150"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#1B2A3F] border-dashed">
                <Button type="button" variant="secondary" onClick={() => setIsEditOpen(false)} className="text-xs py-2 px-4">
                  Cancel
                </Button>
                <Button type="submit" className="text-xs py-2 px-4">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GENERATE TIMESHEET MODAL */}
      {isTimesheetOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0B1220]/30 backdrop-blur-lg p-4 animate-fade-in text-left">
          <div className="w-full max-w-md rounded-[24px] border border-[#1B2A3F] bg-[#121E30]/90 backdrop-blur-md p-6 shadow-2xl shadow-black/40 animate-in fade-in zoom-in-95 duration-250">
            <div className="flex items-center justify-between border-b border-[#1B2A3F] border-dashed pb-4 mb-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
                <Calendar size={15} className="text-teal" />
                Generate Timesheet
              </h3>
              <button onClick={() => setIsTimesheetOpen(false)} className="text-text-muted hover:text-white transition">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-5 text-xs">
              {/* Project Select */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted">Select Project</label>
                <div className="relative">
                  <select
                    value={tsProjectId}
                    onChange={(e) => setTsProjectId(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#1B2A3F] bg-[#0B1220] px-4 pr-10 font-semibold text-white outline-none focus:border-teal transition cursor-pointer appearance-none text-xs"
                    required
                  >
                    {assignedProjects.map((p) => (
                      <option key={p.id} value={p.id} className="bg-[#121E30]">
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-text-muted text-[8px]">
                    ▼
                  </div>
                </div>
              </div>

              {/* Month Select */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted">Select Month</label>
                <div className="relative">
                  <select
                    value={tsMonth}
                    onChange={(e) => setTsMonth(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#1B2A3F] bg-[#0B1220] px-4 pr-10 font-semibold text-white outline-none focus:border-teal transition cursor-pointer appearance-none text-xs"
                    required
                  >
                    {getLast12Months().map((m) => (
                      <option key={m.value} value={m.value} className="bg-[#121E30]">
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-text-muted text-[8px]">
                    ▼
                  </div>
                </div>
              </div>

              {/* Organisation Name */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted">Organisation Name</label>
                <input
                  type="text"
                  value={tsOrganisation}
                  onChange={(e) => setTsOrganisation(e.target.value)}
                  className="w-full h-10 rounded-xl border border-[#1B2A3F] bg-[#0B1220] px-4 text-white outline-none focus:border-teal transition text-xs"
                  required
                />
              </div>

              {/* Employee Details Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted">Employee Name</label>
                  <input
                    type="text"
                    value={tsEmployeeName}
                    onChange={(e) => setTsEmployeeName(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#1B2A3F] bg-[#0B1220] px-4 text-white outline-none focus:border-teal transition text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted">Personnel Number</label>
                  <input
                    type="text"
                    value={tsPersonnelNumber}
                    onChange={(e) => setTsPersonnelNumber(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#1B2A3F] bg-[#0B1220] px-4 text-white outline-none focus:border-teal transition text-xs"
                    required
                  />
                </div>
              </div>

              {/* Project Leader & Signature Date Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted">Project Leader</label>
                  <input
                    type="text"
                    value={tsProjectLeader}
                    onChange={(e) => setTsProjectLeader(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#1B2A3F] bg-[#0B1220] px-4 text-white outline-none focus:border-teal transition text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted">Signature Date</label>
                  <input
                    type="date"
                    value={tsSignatureDate}
                    onChange={(e) => setTsSignatureDate(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#1B2A3F] bg-[#0B1220] px-4 text-white outline-none focus:border-teal transition text-xs"
                    required
                  />
                </div>
              </div>

              {/* Checkbox for Digital Signature */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="tsDigitallySign"
                  checked={tsDigitallySign}
                  onChange={(e) => setTsDigitallySign(e.target.checked)}
                  className="rounded border-[#1B2A3F] bg-[#0B1220] text-teal focus:ring-teal w-4 h-4 cursor-pointer"
                />
                <label htmlFor="tsDigitallySign" className="text-text-muted font-semibold cursor-pointer select-none">
                  Include Digital Signature stamps
                </label>
              </div>

              {/* Actions buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#1B2A3F] border-dashed">
                <Button type="button" variant="secondary" onClick={() => setIsTimesheetOpen(false)} className="text-xs py-2 px-4">
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    localStorage.setItem("ts_organisation", tsOrganisation);
                    localStorage.setItem("ts_personnel_number", tsPersonnelNumber);
                    setIsTimesheetOpen(false);
                    setTimeout(() => {
                      window.print();
                    }, 300);
                  }} 
                  className="text-xs py-2 px-4"
                >
                  Generate & Print
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT-ONLY LANDSCAPE TIMESHEET CONTAINER */}
      {!isPrintingReport && (
        <div className="hidden print:block print-container w-full bg-white text-black p-4 select-none">
        <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@500;700&display=swap" rel="stylesheet" />
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-container, .print-container * {
              visibility: visible;
            }
            .print-container {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              height: auto;
              background: white !important;
              color: black !important;
              padding: 0;
              margin: 0;
              font-family: Arial, sans-serif;
            }
            @page {
              size: landscape;
              margin: 10mm;
            }
            tr {
              page-break-inside: avoid;
            }
          }
        `}</style>

        {/* Header Grid: Metadata & Logos */}
        <div className="grid grid-cols-2 gap-4 border border-black border-solid p-4 text-[10px] leading-relaxed text-left">
          <table className="w-full text-left border-collapse text-[10px]">
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="font-bold py-1 w-[30%]">Periode</td>
                <td className="py-1 font-semibold">{tsMonthLabel}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="font-bold py-1">Naam project</td>
                <td className="py-1">{tsProjectName}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="font-bold py-1">Naam organisatie</td>
                <td className="py-1">{tsOrganisation}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="font-bold py-1">Naam medewerker</td>
                <td className="py-1">Naam: {tsEmployeeName}</td>
              </tr>
              <tr>
                <td className="font-bold py-1">Personeelsnummer</td>
                <td className="py-1">Personeelsnummer: {tsPersonnelNumber}</td>
              </tr>
            </tbody>
          </table>

          <div className="flex flex-col justify-start items-end gap-4">
            {/* Logos Row */}
            <div className="flex items-center gap-8">
              {/* kw kansen voor west logo */}
              <div className="flex items-center gap-1 select-none">
                <span className="text-3xl font-black text-[#006666] italic tracking-tighter">kw</span>
                <span className="text-[10px] font-bold text-[#121E30] italic leading-tight flex flex-col justify-center">
                  <span>kansen voor west</span>
                </span>
              </div>

              {/* EU flag logo */}
              <div className="flex gap-2 items-center">
                <svg viewBox="0 0 120 80" className="h-7 w-10 border border-[#121E30] flex-shrink-0">
                  <rect width="120" height="80" fill="#121E30" />
                  <g transform="translate(60, 40) scale(1.5)">
                    {[...Array(12)].map((_, i) => {
                      const angle = (i * 30 * Math.PI) / 180;
                      const x = 15 * Math.sin(angle);
                      const y = -15 * Math.cos(angle);
                      return (
                        <polygon
                          key={i}
                          points="0,-2 0.588,-0.191 1.902,-0.191 0.838,0.584 1.243,1.809 0,1.045 -1.243,1.809 -0.838,0.584 -1.902,-0.191 -0.588,-0.191"
                          fill="#00E5C8"
                          transform={`translate(${x}, ${y})`}
                        />
                      );
                    })}
                  </g>
                </svg>
                <div className="text-[8px] font-bold text-[#121E30] leading-none flex flex-col justify-center">
                  <span>Medegefinancierd door</span>
                  <span className="mt-0.5">de Europese Unie</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timesheet Main Grid Table */}
        <table className="w-full text-center text-[8px] border-collapse border border-black border-solid mt-4 table-fixed">
          <thead>
            <tr>
              <th rowSpan={3} className="border border-black border-solid font-bold text-left px-2 py-1 w-[20%] text-[9px]">
                Werkpakket
              </th>
              <th colSpan={tsDays.length} className="border border-black border-solid font-bold text-left px-2 py-0.5 bg-gray-50 text-[9px]">
                Dagen {tsMonthLabel}
              </th>
              <th rowSpan={3} className="border border-black border-solid font-bold px-1 py-1 w-[5%] text-[9px]">
                Totaal
              </th>
            </tr>
            <tr>
              {tsDays.map(d => (
                <th key={`print-day-name-${d.dayNumber}`} className={`border border-black border-solid text-[7px] font-bold py-0.5 ${d.isWeekend ? 'bg-gray-150 bg-opacity-70' : ''}`}>
                  {d.dayOfWeek}
                </th>
              ))}
            </tr>
            <tr>
              {tsDays.map(d => (
                <th key={`print-day-num-${d.dayNumber}`} className={`border border-black border-solid text-[8px] font-bold py-0.5 ${d.isWeekend ? 'bg-gray-150 bg-opacity-70' : ''}`}>
                  {d.dayNumber}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PRINT_WERKPAKKETTEN.map((wp, rowIndex) => {
              const rowTotal = tsMonthLogs
                .filter(log => getWerkpakketIndex(log.werkpakket) === rowIndex)
                .reduce((sum, l) => sum + parseFloat(l.hours.toString()), 0);

              return (
                <tr key={`print-wp-row-${rowIndex}`} className="h-6">
                  <td className="border border-black border-solid text-left px-2 py-0.5 text-[8px] font-medium truncate" title={wp}>
                    {wp}
                  </td>
                  {tsDays.map(day => {
                    const dayLogs = tsMonthLogs.filter(log => {
                      if (!log.date) return false;
                      const parts = log.date.split("-").map(Number);
                      if (parts.length < 3) return false;
                      const d = parts[2];
                      const wpIdx = getWerkpakketIndex(log.werkpakket);
                      return d === day.dayNumber && wpIdx === rowIndex;
                    });
                    const hoursSum = dayLogs.reduce((sum, l) => sum + parseFloat(l.hours.toString()), 0);

                    return (
                      <td key={`print-wp-cell-${rowIndex}-${day.dayNumber}`} className={`border border-black border-solid text-[8px] py-0.5 ${day.isWeekend ? 'bg-gray-100' : ''}`}>
                        {hoursSum > 0 ? hoursSum : ""}
                      </td>
                    );
                  })}
                  <td className="border border-black border-solid font-bold text-[8px] py-0.5 bg-gray-50">
                    {rowTotal > 0 ? rowTotal : 0}
                  </td>
                </tr>
              );
            })}
            <tr className="h-6">
              <td colSpan={tsDays.length + 1} className="border border-black border-solid font-bold text-right px-4 py-0.5 text-[9px] bg-gray-50">
                Totaal
              </td>
              <td className="border border-black border-solid font-black text-[9px] py-0.5 bg-gray-100">
                {tsGrandTotal}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Signatures Footer */}
        <div className="grid grid-cols-2 gap-8 mt-6 select-none text-left">
          {/* Left Signature Box: Employee */}
          <div className="border border-black border-solid p-0 flex flex-col h-24 justify-between">
            <div className="border-b border-black border-solid px-3 py-1 font-bold text-[9px] bg-gray-50">
              handtekening medewerker
            </div>
            <div className="px-3 py-1.5 flex flex-col justify-center items-center flex-grow relative">
              {tsDigitallySign && (
                <div className="flex flex-col items-center justify-center">
                  <span style={{ fontFamily: "'Dancing Script', cursive, sans-serif" }} className="text-base text-[#0F2A4A] font-semibold -mb-0.5 transform -rotate-1">
                    {tsEmployeeName}
                  </span>
                  <span className="text-[7px] text-[#0D62AC] font-mono leading-none">
                    Digitally signed by {tsEmployeeName} ({formatSignatureDate(tsSignatureDate)} 10:42:52 GMT+2)
                  </span>
                  <span className="text-[8px] font-bold text-[#0B1220] mt-0.5">
                    {tsEmployeeName}
                  </span>
                </div>
              )}
            </div>
            <div className="border-t border-black border-dashed px-3 py-0.5 flex justify-between text-[8px]">
              <span className="font-bold">Datum:</span>
              <span>{formatDateSlash(tsSignatureDate)}</span>
            </div>
          </div>

          {/* Right Signature Box: Manager */}
          <div className="border border-black border-solid p-0 flex flex-col h-24 justify-between">
            <div className="border-b border-black border-solid px-3 py-1 font-bold text-[9px] bg-gray-50">
              naam en handtekening leidinggevende/projectleider
            </div>
            <div className="px-3 py-1.5 flex flex-col justify-center items-center flex-grow">
              {tsDigitallySign && tsProjectLeader && (
                <div className="flex flex-col items-center justify-center">
                  <span style={{ fontFamily: "'Dancing Script', cursive, sans-serif" }} className="text-base text-[#0F2A4A] font-semibold -mb-0.5 transform -rotate-1">
                    {tsProjectLeader}
                  </span>
                  <span className="text-[7px] text-[#0D62AC] font-mono leading-none">
                    Digitally signed by {tsProjectLeader} ({formatSignatureDate(tsSignatureDate)} 10:42:52 GMT+2)
                  </span>
                  <span className="text-[8px] font-bold text-[#0B1220] mt-0.5">
                    {tsProjectLeader}
                  </span>
                </div>
              )}
            </div>
            <div className="border-t border-black border-dashed px-3 py-0.5 flex justify-between text-[8px]">
              <span className="font-bold">Datum:</span>
              <span>{formatDateSlash(tsSignatureDate)}</span>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* PRINT-ONLY PORTRAIT INDIVIDUAL EFFORT REPORT */}
      {isPrintingReport && selectedIndividualUserId && (() => {
        const selUser = usersList.find(u => u.id === selectedIndividualUserId);
        if (!selUser) return null;

        // Filter logs based on period selection
        const now = new Date();
        const filteredLogs = individualLogs.filter(log => {
          if (individualPeriod === "all") return true;
          const logDate = new Date(log.date);
          if (individualPeriod === "week") {
            const startOfWeek = new Date(now);
            const day = startOfWeek.getDay();
            const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
            startOfWeek.setDate(diff);
            startOfWeek.setHours(0,0,0,0);
            return logDate >= startOfWeek;
          }
          if (individualPeriod === "month") {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            return logDate >= startOfMonth;
          }
          return true;
        });

        const totalHours = filteredLogs.reduce((sum, l) => sum + l.hours, 0);

        return (
          <div className="hidden print:block print-container w-full bg-[#0B1220] text-white p-8 select-none font-sans text-xs">
            <style>{`
              @media print {
                body * {
                  visibility: hidden;
                }
                .print-container, .print-container * {
                  visibility: visible;
                }
                .print-container {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  background: #0B1220 !important;
                  color: #FFFFFF !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                @page {
                  size: portrait;
                  margin: 15mm;
                }
              }
            `}</style>
            
            {/* Header */}
            <div className="border-b-2 border-[#1B2A3F] pb-4 flex justify-between items-end">
              <div>
                <h1 className="text-xl font-extrabold uppercase tracking-wider text-white">
                  {localStorage.getItem("kapetein_demo_mode") === "true" ? "Project Tracking Platform" : "Kapetein Labs"}
                </h1>
                <p className="text-[9px] text-[#B0BEC5] font-mono">Effort Hours Management & Auditing</p>
              </div>
              <div className="flex flex-col items-end gap-2 text-right">
                {/* Brand-colored Logos */}
                <div className="flex items-center gap-4 select-none mb-1">
                  {/* kw kansen voor west logo */}
                  <div className="flex items-center gap-0.5">
                    <span className="text-xl font-black text-[#00E5C8] italic tracking-tighter">kw</span>
                    <span className="text-[7px] font-bold text-white italic leading-tight flex flex-col justify-center">
                      <span>kansen voor west</span>
                    </span>
                  </div>

                  {/* EU flag logo */}
                  <div className="flex gap-1.5 items-center">
                    <svg viewBox="0 0 120 80" className="h-5 w-7 border border-[#1B2A3F] flex-shrink-0">
                      <rect width="120" height="80" fill="#121E30" />
                      <g transform="translate(60, 40) scale(1.5)">
                        {[...Array(12)].map((_, i) => {
                          const angle = (i * 30 * Math.PI) / 180;
                          const x = 15 * Math.sin(angle);
                          const y = -15 * Math.cos(angle);
                          return (
                            <polygon
                              key={i}
                              points="0,-2 0.588,-0.191 1.902,-0.191 0.838,0.584 1.243,1.809 0,1.045 -1.243,1.809 -0.838,0.584 -1.902,-0.191 -0.588,-0.191"
                              fill="#00E5C8"
                              transform={`translate(${x}, ${y})`}
                            />
                          );
                        })}
                      </g>
                    </svg>
                    <div className="text-[6px] font-bold text-[#B0BEC5] leading-none flex flex-col justify-center text-left">
                      <span>Medegefinancierd door</span>
                      <span className="mt-0.5">de Europese Unie</span>
                    </div>
                  </div>
                </div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-white">Employee Effort Report</h2>
                <p className="text-[9px] text-[#B0BEC5]">Date: {new Date().toLocaleDateString()}</p>
              </div>
            </div>

            {/* Profile & Metadata */}
            <div className="grid grid-cols-2 gap-4 py-6 text-[10px]">
              <div className="space-y-1">
                <div><span className="font-bold uppercase tracking-wider text-[#B0BEC5] block text-[8px]">Employee Name</span><span className="text-sm font-bold text-white">{selUser.name}</span></div>
                <div><span className="font-bold uppercase tracking-wider text-[#B0BEC5] block text-[8px]">Email Address</span><span className="text-white">{selUser.email}</span></div>
                <div><span className="font-bold uppercase tracking-wider text-[#B0BEC5] block text-[8px]">Role Classification</span><span className="text-white">{selUser.role}</span></div>
              </div>
              <div className="space-y-1 text-right">
                <div><span className="font-bold uppercase tracking-wider text-[#B0BEC5] block text-[8px]">Report Period</span><span className="text-white">{individualPeriod === "week" ? "This Week" : individualPeriod === "month" ? "This Month" : "All History"}</span></div>
                <div><span className="font-bold uppercase tracking-wider text-[#B0BEC5] block text-[8px]">Total Hours Logged</span><span className="text-sm font-bold text-[#00E5C8]">{totalHours.toFixed(1)} hrs</span></div>
                <div><span className="font-bold uppercase tracking-wider text-[#B0BEC5] block text-[8px]">Weekly Target Hours</span><span className="text-white">{selUser.weeklyTargetHours || 40}h</span></div>
              </div>
            </div>

            {/* Logs Table */}
            <div className="mt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider border-b border-[#1B2A3F] pb-1 mb-2 text-white">Logged Activities</h3>
              <table className="w-full border-collapse border border-[#1B2A3F] text-left text-[9px] bg-[#121E30]/20">
                <thead>
                  <tr className="bg-[#121E30] border-b border-[#1B2A3F] text-[8px] uppercase tracking-wider text-[#B0BEC5]">
                    <th className="py-1.5 px-2 border-r border-[#1B2A3F] font-bold">Date</th>
                    <th className="py-1.5 px-2 border-r border-[#1B2A3F] font-bold">Project</th>
                    <th className="py-1.5 px-2 border-r border-[#1B2A3F] font-bold">Werkpakket</th>
                    <th className="py-1.5 px-2 border-r border-[#1B2A3F] font-bold text-right">Hours</th>
                    <th className="py-1.5 px-2 font-bold">Task Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1B2A3F]/40">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#121E30]/30">
                      <td className="py-2 px-2 border-r border-[#1B2A3F] font-medium text-white">{log.date}</td>
                      <td className="py-2 px-2 border-r border-[#1B2A3F] font-bold text-white">{projectsList.find(p => p.id === log.projectId)?.name || "Unknown Project"}</td>
                      <td className="py-2 px-2 border-r border-[#1B2A3F] text-[#B0BEC5]">{log.werkpakket ? log.werkpakket.split(" - ")[0] : "-"}</td>
                      <td className="py-2 px-2 border-r border-[#1B2A3F] text-right font-bold text-[#00E5C8]">
                        <div>{log.hours}h</div>
                        {log.startTime && log.endTime && (
                          <div className="text-[7px] text-[#00E5C8]/70 font-mono mt-0.5 leading-none">{log.startTime} - {log.endTime}</div>
                        )}
                      </td>
                      <td className="py-2 px-2 text-white/90 whitespace-pre-wrap">{log.notes || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Proof Appendix Section */}
            {filteredLogs.some(log => log.attachments && log.attachments.length > 0) && (
              <div className="mt-8 page-break-before">
                <h3 className="text-xs font-bold uppercase tracking-wider border-b border-[#1B2A3F] pb-1 mb-3 text-white">Appendix: Work Verification Proofs</h3>
                <div className="space-y-6">
                  {filteredLogs
                    .filter(log => log.attachments && log.attachments.length > 0)
                    .map(log => (
                      <div key={log.id} className="border border-[#1B2A3F] bg-[#121E30] rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-[9px] border-b border-[#1B2A3F]/50 pb-1 font-bold text-white">
                          <span>{log.date} — {projectsList.find(p => p.id === log.projectId)?.name || "Unknown Project"}</span>
                          <span className="text-[#00E5C8]">{log.hours}h Logged</span>
                        </div>
                        {log.notes && <p className="text-[#B0BEC5] italic text-[8px] bg-[#0B1220] p-1.5 rounded border border-[#1B2A3F]/30">{log.notes}</p>}
                        <div className="flex flex-wrap gap-3 pt-1">
                          {log.attachments?.map((att) => (
                            <div key={att.id} className="space-y-1">
                              <img 
                                src={att.url} 
                                alt={att.name} 
                                className="w-40 h-28 object-contain rounded border border-[#1B2A3F] bg-black/20" 
                              />
                              <div className="text-[7px] text-[#B0BEC5] font-mono flex flex-col">
                                <span className="text-white truncate max-w-[150px]">{att.name}</span>
                                <span>Size: {(att.size / 1024).toFixed(1)} KB</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* LIGHTBOX MODAL */}
      {activeImageUrl && (() => {
        const activeAttachment = activeLog?.attachments?.find(a => a.url === activeImageUrl);
        
        return (
          <div 
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-all duration-300"
            onClick={() => { setActiveImageUrl(null); setActiveLog(null); }}
          >
            <div 
              className="relative max-w-5xl w-full max-h-[90vh] rounded-2xl overflow-hidden border border-[#1B2A3F] bg-[#0B1220] shadow-2xl flex flex-col md:flex-row"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => { setActiveImageUrl(null); setActiveLog(null); }} 
                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/60 text-white hover:bg-black hover:scale-105 transition"
              >
                <X size={18} />
              </button>

              {/* Left Column: Image Viewer */}
              <div className="flex-1 bg-black/30 p-6 flex flex-col items-center justify-between min-h-[300px] md:min-h-[500px]">
                <div className="flex-1 flex items-center justify-center w-full">
                  <img 
                    src={activeImageUrl} 
                    alt="Proof" 
                    className="max-w-full max-h-[60vh] rounded-xl object-contain shadow-lg border border-white/5"
                  />
                </div>
                {/* Horizontal row of thumbnails */}
                {activeLog?.attachments && activeLog.attachments.length > 1 && (
                  <div className="flex gap-2 mt-4 overflow-x-auto py-2 max-w-full planka-scrollbar">
                    {activeLog.attachments.map((att) => {
                      const isActive = att.url === activeImageUrl;
                      return (
                        <button
                          key={att.id}
                          onClick={() => setActiveImageUrl(att.url)}
                          className={`w-14 h-10 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                            isActive ? "border-teal scale-105 shadow-md shadow-teal/20" : "border-transparent opacity-60 hover:opacity-100 hover:scale-102"
                          }`}
                        >
                          <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: AI Analysis Panel */}
              {activeAttachment && (
                <div className="w-full md:w-[380px] border-t md:border-t-0 md:border-l border-[#1B2A3F] bg-[#0E1726]/90 backdrop-blur-md p-6 overflow-y-auto planka-scrollbar flex flex-col gap-5 text-left select-text">
                  <div>
                    <h3 className="text-base font-bold bg-gradient-to-r from-teal to-blue-400 bg-clip-text text-transparent">
                      AI proof validation
                    </h3>
                    <p className="text-[10px] text-text-muted mt-0.5 font-sans">Automated Work Verification (Vision-OCR)</p>
                  </div>

                  {/* Scan Status */}
                  <div className="flex items-center justify-between bg-[#132238]/60 rounded-xl p-3 border border-[#1F304B]">
                    <span className="text-[11px] font-medium text-white/80 font-sans">Scan Status</span>
                    {activeAttachment.ocrStatus === "COMPLETED" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Scanned & Verified
                      </span>
                    ) : activeAttachment.ocrStatus === "PROCESSING" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        Processing...
                      </span>
                    ) : activeAttachment.ocrStatus === "FAILED" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        Scan Failed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        Queued for AI
                      </span>
                    )}
                  </div>

                  {/* AI Audit Details */}
                  {activeAttachment.ocrStatus === "COMPLETED" && activeAttachment.aiAnalysis && (() => {
                    const analysis = typeof activeAttachment.aiAnalysis === "string" 
                      ? JSON.parse(activeAttachment.aiAnalysis) 
                      : activeAttachment.aiAnalysis;
                    
                    const isVerified = analysis.verificationStatus === "VERIFIED";
                    const isWarning = analysis.verificationStatus === "WARNING";
                    
                    return (
                      <div className="flex flex-col gap-4 font-sans">
                        {/* Audit Verification status */}
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">Verification Status</span>
                          <div className={`p-3 rounded-lg border text-[11px] ${
                            isVerified 
                              ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-300" 
                              : isWarning
                              ? "bg-amber-500/5 border-amber-500/10 text-amber-300"
                              : "bg-rose-500/5 border-rose-500/10 text-rose-300"
                          }`}>
                            <div className="font-bold flex items-center gap-1">
                              {isVerified ? "✓ APPROVED" : isWarning ? "⚠ WARNING" : "✗ AUDIT FAIL"}
                            </div>
                            <div className="mt-1 text-white/70 leading-relaxed font-sans">{analysis.auditNotes}</div>
                          </div>
                        </div>

                        {/* Classification & Confidence */}
                        <div className="grid grid-cols-2 gap-3.5">
                          <div className="bg-[#132238]/30 rounded-lg p-2.5 border border-[#1F304B]/50">
                            <span className="text-[9px] text-text-muted block font-semibold uppercase">Classification</span>
                            <span className="text-white text-[11px] font-bold truncate block mt-0.5" title={analysis.classification}>
                              {analysis.classification}
                            </span>
                          </div>
                          <div className="bg-[#132238]/30 rounded-lg p-2.5 border border-[#1F304B]/50">
                            <span className="text-[9px] text-text-muted block font-semibold uppercase">Confidence</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-white text-[11px] font-bold">{(analysis.confidence * 100).toFixed(0)}%</span>
                              <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${isVerified ? "bg-emerald-400" : "bg-amber-400"}`}
                                  style={{ width: `${analysis.confidence * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Detected Tools Tag Cloud */}
                        {analysis.detectedTools && analysis.detectedTools.length > 0 && (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">Detected Tools</span>
                            <div className="flex flex-wrap gap-1.5">
                              {analysis.detectedTools.map((t: string) => (
                                <span key={t} className="px-2 py-0.5 rounded bg-[#132238] border border-[#1F304B] text-white text-[10px] font-medium">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Extracted OCR Screen Text */}
                        {activeAttachment.ocrText && (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">Scanned Text (OCR)</span>
                            <pre className="font-mono text-[10px] bg-black/60 border border-white/5 rounded-lg p-3 max-h-[140px] overflow-y-auto planka-scrollbar text-emerald-400/90 whitespace-pre-wrap text-left leading-normal">
                              {activeAttachment.ocrText}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Processing / Queued states */}
                  {activeAttachment.ocrStatus !== "COMPLETED" && (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-text-muted text-[11px] gap-3 font-sans">
                      <div className="w-8 h-8 rounded-full border border-teal/20 border-t-teal animate-spin" />
                      <p className="max-w-[200px] leading-relaxed">
                        Analyzing screenshot contents for text extraction and integrity audit...
                      </p>
                    </div>
                  )}

                  {/* Footer details */}
                  <div className="mt-auto border-t border-[#1B2A3F] pt-4 flex flex-col gap-1 text-[9px] text-text-muted font-sans">
                    <div className="flex justify-between">
                      <span>File Name:</span>
                      <span className="text-white truncate max-w-[180px]">{activeAttachment.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>File Size:</span>
                      <span className="text-white">{(activeAttachment.size / 1024).toFixed(1)} KB</span>
                    </div>
                    {activeAttachment.metadata && (() => {
                      const meta = typeof activeAttachment.metadata === "string" 
                        ? JSON.parse(activeAttachment.metadata) 
                        : activeAttachment.metadata;
                      return (
                        <>
                          <div className="flex justify-between">
                            <span>Resolution:</span>
                            <span className="text-white">{meta.width}x{meta.height} px</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Pipeline:</span>
                            <span className="text-white">{meta.model}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </PageShell>
  );
}

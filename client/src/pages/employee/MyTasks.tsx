import { useState, useEffect } from "react";
import { EmptyState } from "../../components/ui/EmptyState";
import { apiRequest } from "../../services/apiClient";
import { Plus, Trash2, X, AlertCircle, MessageSquare, CheckSquare, MoreHorizontal, Paperclip, CheckCircle2, Clock, PlayCircle, ArrowRightCircle, RefreshCw, AlignLeft, Activity, Target, Award, AlertTriangle, Calendar, Tag, Folder, FolderKanban, User as UserIcon, Users, Check, ChevronDown, Camera, Image as ImageIcon } from "lucide-react";
import type { KanbanCard, KanbanColumn, Priority, User } from "../../types";
import Ferrofluid from "../../components/effects/Ferrofluid";

const fallbackColumns: KanbanColumn[] = [
  { id: "column-todo", projectId: "all", title: "To Do", order: 1 },
  { id: "column-progress", projectId: "all", title: "In Progress", order: 2 },
  { id: "column-review", projectId: "all", title: "In Review", order: 3 },
  { id: "column-done", projectId: "all", title: "Completed", order: 4 }
];

const CARD_WERKPAKKETTEN = ["WP 1", "WP 2", "WP 3", "WP 4", "WP 5", "WP 6"];

import { useAuth } from "../../context/AuthContext";

export function MyTasks() {
  const { user } = useAuth();
  
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [columns] = useState<KanbanColumn[]>(fallbackColumns);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [projectBoards, setProjectBoards] = useState<{ projectId: string; columns: any[] }[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"kanban" | "gantt">("kanban");

  // Modal Control States
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);

  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success"
  });

  const triggerToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result as string;
        // Strip data prefix
        const base64Content = base64String.split(",")[1];
        resolve(base64Content);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const fetchCardHours = async (cardId: string) => {
    setCardHoursLoading(true);
    try {
      const res = await apiRequest<{ logs: any[] }>(`/hours/card/${cardId}`);
      setCardHours(res.logs || []);
    } catch (err) {
      console.error("Failed to fetch card hours:", err);
    } finally {
      setCardHoursLoading(false);
    }
  };

  const handleSaveEffort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!largeDetailCardId) return;
    const hoursNum = parseFloat(effortHours);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      triggerToast("Please enter a valid amount of hours.", "error");
      return;
    }
    if (!effortWerkpakket) {
      triggerToast("Please select a Werkpakket.", "error");
      return;
    }

    setIsSavingEffort(true);
    try {
      // Find the card's project
      const currentCard = cards.find(c => c.id === largeDetailCardId);
      const projId = currentCard?.projectId || projectsList[0]?.id;
      if (!projId) {
        triggerToast("Failed to determine project ID.", "error");
        return;
      }

      // 1. Upload images first
      const uploadedUrls: string[] = [];
      for (const imgFile of effortImages) {
        const base64Content = await fileToBase64(imgFile);
        const res = await apiRequest<{ url: string }>("/upload", {
          method: "POST",
          body: JSON.stringify({
            filename: imgFile.name,
            content: base64Content,
            cardId: largeDetailCardId
          })
        });
        if (res.url) {
          uploadedUrls.push(res.url);
        }
      }

      // 2. Save effort log
      const bodyPayload = {
        projectId: projId,
        cardId: largeDetailCardId,
        date: effortDate,
        hours: hoursNum,
        notes: effortNotes,
        werkpakket: effortWerkpakket,
        imageUrls: uploadedUrls
      };

      await apiRequest("/hours", {
        method: "POST",
        body: JSON.stringify(bodyPayload)
      });

      triggerToast("Effort hours logged successfully!", "success");

      // Update card's totalLoggedHours locally in MyTasks' cards list
      setCards(prevCards =>
        prevCards.map(c => {
          if (c.id === largeDetailCardId) {
            return {
              ...c,
              totalLoggedHours: (c.totalLoggedHours || 0) + hoursNum
            };
          }
          return c;
        })
      );

      // Refresh data
      fetchTasksData();
      fetchCardHours(largeDetailCardId);

      // Reset form
      setEffortHours("");
      setEffortDate(new Date().toISOString().split("T")[0]);
      setEffortNotes("");
      setEffortWerkpakket("");
      setEffortImages([]);
      setEffortPreviews([]);
    } catch (err) {
      console.error("Failed to save effort log:", err);
      triggerToast("Failed to save effort log.", "error");
    } finally {
      setIsSavingEffort(false);
    }
  };

  const handleDeleteEffort = async (logId: string, logHours: number) => {
    if (!largeDetailCardId) return;
    if (!window.confirm("Are you sure you want to delete this effort log?")) return;
    try {
      await apiRequest(`/hours/${logId}`, {
        method: "DELETE"
      });
      triggerToast("Effort log deleted successfully!", "success");

      // Update card's totalLoggedHours locally
      setCards(prevCards =>
        prevCards.map(c => {
          if (c.id === largeDetailCardId) {
            return {
              ...c,
              totalLoggedHours: Math.max(0, (c.totalLoggedHours || 0) - logHours)
            };
          }
          return c;
        })
      );

      // Refresh list & tasks data
      fetchTasksData();
      fetchCardHours(largeDetailCardId);
    } catch (err) {
      console.error("Failed to delete effort log:", err);
      triggerToast("Failed to delete effort log.", "error");
    }
  };

  const handleRemoveEffortImage = (index: number) => {
    setEffortImages(prev => prev.filter((_, idx) => idx !== index));
    setEffortPreviews(prev => prev.filter((_, idx) => idx !== index));
  };

  const renderEffortProofThumbnail = (url: string) => {
    return (
      <div 
        key={url}
        onClick={() => setActiveAttachmentUrl(url)}
        className="group relative w-12 h-12 rounded border border-[#253347] bg-black/40 overflow-hidden cursor-pointer hover:border-teal/50 transition-colors"
      >
        <img src={url} alt="Proof screenshot" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
          <ImageIcon size={12} className="text-[#00e5c8]" />
        </div>
      </div>
    );
  };

  // Form States
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskProjectId, setNewTaskProjectId] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("MEDIUM");
  const [targetColumnId, setTargetColumnId] = useState("column-todo");

  // Drag and Drop active column target
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  // Monday.com additions
  const [inlineTaskTitles, setInlineTaskTitles] = useState<Record<string, string>>({});
  const [quickEditCardId, setQuickEditCardId] = useState<string | null>(null);
  const [largeDetailCardId, setLargeDetailCardId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"updates" | "activity" | "efforts">("updates");

  // Time Logging on Kanban Cards state
  const [cardHours, setCardHours] = useState<any[]>([]);
  const [cardHoursLoading, setCardHoursLoading] = useState(false);
  const [effortHours, setEffortHours] = useState("");
  const [effortDate, setEffortDate] = useState(new Date().toISOString().split("T")[0]);
  const [effortNotes, setEffortNotes] = useState("");
  const [effortWerkpakket, setEffortWerkpakket] = useState("");
  const [effortImages, setEffortImages] = useState<File[]>([]);
  const [effortPreviews, setEffortPreviews] = useState<string[]>([]);
  const [isSavingEffort, setIsSavingEffort] = useState(false);
  const [activeAttachmentUrl, setActiveAttachmentUrl] = useState<string | null>(null);

  // Popover toggle states
  const [showStatusDropdown, setShowStatusDropdown] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);
  const [showProjectDropdown, setShowProjectDropdown] = useState<string | null>(null);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState<string | null>(null);
  const [showLabelsDropdown, setShowLabelsDropdown] = useState<string | null>(null);
  const [showTrlDropdown, setShowTrlDropdown] = useState<string | null>(null);
  const [showTrlDetailsPanel, setShowTrlDetailsPanel] = useState<number | null>(null);
  const [trlDrawerTaskTitle, setTrlDrawerTaskTitle] = useState("");
  const [trlUpdateTrigger, setTrlUpdateTrigger] = useState(0);
  const [showTrlUpgradeToast, setShowTrlUpgradeToast] = useState<{ projectName: string; newLevel: number } | null>(null);
  const [selectedTrlProjectId, setSelectedTrlProjectId] = useState<string>("all");

  // Planka metadata states
  const [cardDescriptions, setCardDescriptions] = useState<Record<string, string>>({});
  const [cardChecklists, setCardChecklists] = useState<Record<string, { id: string; text: string; done: boolean }[]>>({});
  const [cardLabels, setCardLabels] = useState<Record<string, string[]>>({});

  // Comments and Activity Logs mapping
  const [taskComments, setTaskComments] = useState<Record<string, { id: string; userName: string; userRole: string; content: string; timestamp: string }[]>>({});
  const [taskActivityLog, setTaskActivityLog] = useState<Record<string, { id: string; action: string; timestamp: string }[]>>({});

  const [newCommentText, setNewCommentText] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [newChecklistItemText, setNewChecklistItemText] = useState("");

  const fetchTasksData = async () => {
    try {
      const [projData, userData] = await Promise.all([
        apiRequest<{ projects: any[] }>("/projects"),
        apiRequest<{ users: any[] }>("/users")
      ]);
      setProjectsList(projData.projects);
      setUsersList(userData.users);
      if (projData.projects.length > 0 && !newTaskProjectId) {
        setNewTaskProjectId(projData.projects[0].id);
      }

      const boardsPromises = projData.projects.map((p: any) =>
        apiRequest<{ columns: any[] }>(`/projects/${p.id}/kanban`)
          .then(res => ({ projectId: p.id, columns: res.columns }))
          .catch(() => null)
      );

      const boardsResults = await Promise.all(boardsPromises);
      const activeBoards = boardsResults.filter(Boolean) as { projectId: string; columns: any[] }[];
      setProjectBoards(activeBoards);

      const allCards = activeBoards.flatMap(board => {
        const proj = projData.projects.find(p => p.id === board.projectId);
        return board.columns.flatMap(col => col.cards.map((c: any) => ({
          ...c,
          projectName: proj ? proj.name : "Project Task",
          columnTitle: col.title
        })));
      });

      const normalizedCards = allCards.map(c => {
        let normalizedColId = "column-todo";
        const titleLower = (c.columnTitle || "").toLowerCase();
        if (titleLower.includes("progress")) normalizedColId = "column-progress";
        else if (titleLower.includes("review")) normalizedColId = "column-review";
        else if (titleLower.includes("completed") || titleLower.includes("done")) normalizedColId = "column-done";
        
        return {
          ...c,
          columnId: normalizedColId
        };
      });

      setCards(normalizedCards as any[]);
    } catch (err) {
      console.error("Failed to fetch user tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasksData();
  }, []);

  const getTimestamp = () => {
    const d = new Date();
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  const getTrlLevelName = (lvl: number) => {
    if (lvl === 1) return "Basic Principles";
    if (lvl === 2) return "Concept Formulated";
    if (lvl === 3) return "Proof of Concept";
    if (lvl === 4) return "Lab Validation";
    if (lvl === 5) return "Relevant Env Validation";
    if (lvl === 6) return "Prototype Demo";
    if (lvl === 7) return "Operational Demo";
    if (lvl === 8) return "System Qualified";
    return "Proven System";
  };

  const getProjectTrlWarning = (projId: string) => {
    const proj = projectsList.find(p => p.id === projId);
    if (!proj) return null;
    const projBoard = projectBoards.find(b => b.projectId === projId);
    if (!projBoard) return null;
    const incompleteTasks = projBoard.columns
      .flatMap(col => col.cards.map((c: any) => ({ ...c, columnTitle: col.title })))
      .filter(c => c.trlLevel !== undefined && c.trlLevel !== null && c.trlLevel <= proj.currentTRL && c.columnTitle?.toLowerCase() !== "completed" && c.columnTitle?.toLowerCase() !== "done");
      
    if (incompleteTasks.length > 0) {
      const levels = Array.from(new Set(incompleteTasks.map(t => t.trlLevel)));
      return `TRL Level ${levels.join(", ")} incomplete - reopened tasks detected!`;
    }
    return null;
  };

  const getProjectTrlProgressStats = (projId: string, lvl: number) => {
    const board = projectBoards.find(b => b.projectId === projId);
    if (!board) return { total: 0, completed: 0 };
    const levelTasks = board.columns.flatMap(col => col.cards.map((c: any) => ({ ...c, columnTitle: col.title })))
      .filter(c => c.trlLevel === lvl);
    const total = levelTasks.length;
    const completed = levelTasks.filter(c => {
      const t = (c.columnTitle || "").toLowerCase();
      return t.includes("complete") || t.includes("done");
    }).length;
    return { total, completed };
  };

  const handleUpdateCardTrl = async (cardId: string, trlLevel: number | undefined) => {
    try {
      await apiRequest(`/kanban/cards/${cardId}`, {
        method: "PUT",
        body: JSON.stringify({ trlLevel: trlLevel || null })
      });
      fetchTasksData();
      setTrlUpdateTrigger((prev) => prev + 1);
    } catch (err) {
      console.error("Failed to update task TRL:", err);
    }
  };

  const handleUpdateCardTitle = async (cardId: string, title: string) => {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, title } : c))
    );
    try {
      await apiRequest(`/kanban/cards/${cardId}`, {
        method: "PUT",
        body: JSON.stringify({ title })
      });
    } catch (err) {
      console.error("Failed to update card title:", err);
    }
  };

  const handleUpdateCardDueDate = async (cardId: string, dueDate: string) => {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, dueDate } : c))
    );
    try {
      await apiRequest(`/kanban/cards/${cardId}`, {
        method: "PUT",
        body: JSON.stringify({ dueDate: dueDate ? new Date(dueDate).toISOString() : null })
      });
    } catch (err) {
      console.error("Failed to update due date:", err);
    }
  };

  const handleUpdateCardProject = async (cardId: string, projectId: string) => {
    try {
      await apiRequest(`/kanban/cards/${cardId}`, {
        method: "PUT",
        body: JSON.stringify({ projectId })
      });
      fetchTasksData();
    } catch (err) {
      console.error("Failed to update project:", err);
    }
  };

  const handleCreateInlineCard = async (columnId: string) => {
    const title = inlineTaskTitles[columnId]?.trim();
    if (!title) return;

    const projId = selectedTrlProjectId !== "all" ? selectedTrlProjectId : (projectsList[0]?.id || "project-orion");
    try {
      const projBoard = projectBoards.find(b => b.projectId === projId);
      if (!projBoard) return;

      const targetCol = columns.find(c => c.id === columnId);
      const matchedDbColumn = projBoard.columns.find((c: any) => c.title.toLowerCase().includes(targetCol?.title.toLowerCase() || ""));
      if (!matchedDbColumn) {
        alert("Failed to find corresponding column in target project board.");
        return;
      }

      await apiRequest(`/projects/${projId}/kanban/cards`, {
        method: "POST",
        body: JSON.stringify({
          columnId: matchedDbColumn.id,
          title,
          priority: "MEDIUM",
          assigneeId: user.id,
          assigneeIds: [user.id],
          order: cards.filter(c => c.columnId === columnId).length + 1
        })
      });

      setInlineTaskTitles((prev) => ({ ...prev, [columnId]: "" }));
      fetchTasksData();
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  };

  const handleCreateTrlCard = async (trlLevel: number, title: string) => {
    const projId = selectedTrlProjectId;
    if (!projId || projId === "all") return;

    try {
      const projBoard = projectBoards.find(b => b.projectId === projId);
      if (!projBoard) return;
      const matchedDbColumn = projBoard.columns[0];
      if (!matchedDbColumn) return;

      await apiRequest(`/projects/${projId}/kanban/cards`, {
        method: "POST",
        body: JSON.stringify({
          columnId: matchedDbColumn.id,
          title,
          priority: "MEDIUM",
          assigneeId: user.id,
          assigneeIds: [user.id],
          trlLevel,
          order: 1
        })
      });

      setTrlUpdateTrigger((prev) => prev + 1);
      fetchTasksData();
    } catch (err) {
      console.error("Failed to create TRL task:", err);
    }
  };

  const handleToggleCardCompletion = async (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    const newColId = card.columnId === "column-done" ? "column-todo" : "column-done";
    const projBoard = projectBoards.find(b => b.projectId === card.projectId);
    if (!projBoard) return;

    const targetColName = newColId === "column-done" ? "completed" : "to do";
    const matchedDbColumn = projBoard.columns.find((c: any) => c.title.toLowerCase().includes(targetColName));
    if (!matchedDbColumn) return;

    try {
      await apiRequest(`/kanban/cards/${cardId}`, {
        method: "PUT",
        body: JSON.stringify({
          columnId: matchedDbColumn.id
        })
      });

      setTrlUpdateTrigger((prev) => prev + 1);
      fetchTasksData();
    } catch (err) {
      console.error("Failed to toggle card completion:", err);
    }
  };

  const handlePostComment = () => {
    if (!newCommentText.trim() || !largeDetailCardId) return;

    const newComment = {
      id: `comm-${Date.now()}`,
      userName: user.name,
      userRole: user.role,
      content: newCommentText.trim(),
      timestamp: getTimestamp(),
    };

    setTaskComments((prev) => ({
      ...prev,
      [largeDetailCardId]: [...(prev[largeDetailCardId] || []), newComment],
    }));

    setNewCommentText("");
  };

  const handleDeleteComment = (cardId: string, commentId: string) => {
    setTaskComments((prev) => ({
      ...prev,
      [cardId]: (prev[cardId] || []).filter((c) => c.id !== commentId),
    }));

    const newLog = {
      id: `log-${Date.now()}`,
      action: `Deleted a comment`,
      timestamp: getTimestamp(),
    };
    setTaskActivityLog((prev) => ({
      ...prev,
      [cardId]: [newLog, ...(prev[cardId] || [])],
    }));
  };


  // Click-outside listener for popover close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Close dropdowns if clicked outside their respective containers
      if (showStatusDropdown && !target.closest(".status-dropdown-container")) {
        setShowStatusDropdown(null);
      }
      if (showDatePicker && !target.closest(".date-picker-container")) {
        setShowDatePicker(null);
      }
      if (showProjectDropdown && !target.closest(".project-dropdown-container")) {
        setShowProjectDropdown(null);
      }
      if (showAssigneeDropdown && !target.closest(".assignee-dropdown-container")) {
        setShowAssigneeDropdown(null);
      }

      if (quickEditCardId && !target.closest(".quick-edit-popover")) {
        setQuickEditCardId(null);
        setShowStatusDropdown(null);
        setShowDatePicker(null);
        setShowProjectDropdown(null);
        setShowAssigneeDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [quickEditCardId, showStatusDropdown, showDatePicker, showProjectDropdown, showAssigneeDropdown]);

  // Lock scroll when modals are open & set project selection to active project if selected
  useEffect(() => {
    if (isAddTaskOpen) {
      document.body.style.overflow = "hidden";
      if (selectedTrlProjectId && selectedTrlProjectId !== "all") {
        setNewTaskProjectId(selectedTrlProjectId);
      }
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isAddTaskOpen, selectedTrlProjectId]);

  // Effect to handle automatic TRL progression on task completion changes
  useEffect(() => {
    projectsList.forEach(project => {
      const projectBoard = projectBoards.find(b => b.projectId === project.id);
      if (!projectBoard) return;
      
      const trlTasks = projectBoard.columns.flatMap(col => col.cards.map((c: any) => ({ ...c, columnTitle: col.title })))
        .filter(c => c.trlLevel !== undefined && c.trlLevel !== null);
      if (trlTasks.length === 0) return;
      
      let highestCompletedLevel = project.currentTRL;
      
      for (let lvl = 1; lvl <= 9; lvl++) {
        const levelTasks = trlTasks.filter(c => c.trlLevel === lvl);
        if (levelTasks.length > 0) {
          const allCompleted = levelTasks.every(c => {
            const title = (c.columnTitle || "").toLowerCase();
            return title.includes("complete") || title.includes("done");
          });
          if (allCompleted) {
            highestCompletedLevel = lvl;
          } else {
            break;
          }
        }
      }
      
      if (highestCompletedLevel > project.currentTRL) {
        const newLvl = highestCompletedLevel;
        apiRequest(`/projects/${project.id}/trl`, {
          method: "POST",
          body: JSON.stringify({
            trlLevel: newLvl,
            justification: `Automatically promoted because all tasks for TRL ${newLvl} were completed.`
          })
        })
          .then(() => {
            setProjectsList(prev => prev.map(p => p.id === project.id ? { ...p, currentTRL: newLvl } : p));
            if (project.id === selectedTrlProjectId) {
              setShowTrlUpgradeToast({
                projectName: project.name,
                newLevel: newLvl
              });
            }
          })
          .catch(err => console.error("Failed to automatically promote TRL:", err));
      }
    });
  }, [cards, selectedTrlProjectId, trlUpdateTrigger, projectBoards, projectsList]);

  useEffect(() => {
    if (largeDetailCardId) {
      fetchCardHours(largeDetailCardId);
      // Reset form states
      setEffortHours("");
      setEffortDate(new Date().toISOString().split("T")[0]);
      setEffortNotes("");
      setEffortWerkpakket("");
      setEffortImages([]);
      setEffortPreviews([]);
    } else {
      setCardHours([]);
    }
  }, [largeDetailCardId]);

  // Helper to resolve priority styling
  const getPriorityStyle = (priority: string) => {
    if (priority === "HIGH") {
      return "bg-red-500/10 text-red-400 border-red-500/20";
    }
    if (priority === "MEDIUM") {
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
    return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  };

  const formatPriority = (priority: string) => {
    if (priority === "HIGH") return "High";
    if (priority === "MEDIUM") return "Medium";
    return "Low";
  };

  // Helper to get project acronym and badge styling
  const getProjectInfo = (projId: string) => {
    const p = projectsList.find((proj) => proj.id === projId);
    if (!p) return { label: "Project", style: "bg-neutral-500/10 text-status-neutral border-neutral-500/20" };
    if (projId === "project-orion") {
      return { label: "Orion", style: "bg-teal/15 text-teal border-teal/20" };
    }
    if (projId === "project-harbor") {
      return { label: "Harbor", style: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20" };
    }
    return { label: p.name.split(" ").map((w: string) => w[0]).join(""), style: "bg-purple-500/15 text-purple-300 border-purple-500/20" };
  };

  // Helper to determine simulated progress percentage & info
  const getCardProgress = (card: KanbanCard) => {
    if (card.columnId === "column-done" || card.columnId === "Done" || card.columnId.endsWith("done")) {
      return { percent: 100, label: "Done", iconColor: "text-emerald-400" };
    }
    const hash = card.title.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0);
    if (card.columnId === "column-review" || card.columnId === "In Review" || card.columnId.endsWith("review")) {
      const percent = 55 + (hash % 30);
      return { percent, label: "Progress", iconColor: "text-blue-400" };
    }
    const percent = 15 + (hash % 40);
    return { percent, label: "Progress", iconColor: "text-blue-400" };
  };

  // Comments and documents ratio based on card ID
  const getCardStats = (cardId: string) => {
    const charSum = cardId.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const addedComments = taskComments[cardId]?.length || 0;
    const documents = (charSum % 5) + 1;
    return { comments: addedComments, documents };
  };

  // Gradient backgrounds for avatars based on user ID
  const getUserAvatarProps = (userId: string) => {
    const hash = userId.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0);
    const gradients = [
      "from-pink-500 to-rose-500 text-white",
      "from-purple-500 to-indigo-500 text-white",
      "from-blue-500 to-teal text-navy font-bold",
      "from-amber-500 to-orange-500 text-white",
      "from-emerald-500 to-teal text-navy font-bold"
    ];
    return gradients[hash % gradients.length];
  };

  // CRUD Handlers
  const handleDeleteCard = async (cardId: string) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      try {
        await apiRequest(`/kanban/cards/${cardId}`, {
          method: "DELETE"
        });
        setLargeDetailCardId(null);
        fetchTasksData();
      } catch (err) {
        console.error("Failed to delete card:", err);
      }
    }
  };

  const handleAddTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskProjectId) return;

    try {
      const projBoard = projectBoards.find(b => b.projectId === newTaskProjectId);
      if (!projBoard) return;

      const targetCol = columns.find(c => c.id === targetColumnId);
      const matchedDbColumn = projBoard.columns.find((c: any) => c.title.toLowerCase().includes(targetCol?.title.toLowerCase() || ""));
      if (!matchedDbColumn) {
        alert("Failed to find corresponding column in target project board.");
        return;
      }

      await apiRequest(`/projects/${newTaskProjectId}/kanban/cards`, {
        method: "POST",
        body: JSON.stringify({
          columnId: matchedDbColumn.id,
          title: newTaskTitle.trim(),
          description: newTaskDesc.trim() || undefined,
          priority: newTaskPriority,
          assigneeId: user.id,
          assigneeIds: [user.id]
        })
      });

      setNewTaskTitle("");
      setNewTaskDesc("");
      setNewTaskPriority("MEDIUM");
      setIsAddTaskOpen(false);
      fetchTasksData();
    } catch (err) {
      console.error("Failed to add task:", err);
    }
  };

  const handleMoveCard = async (cardId: string, destColumnId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    const projBoard = projectBoards.find(b => b.projectId === card.projectId);
    if (!projBoard) return;

    const targetCol = columns.find(c => c.id === destColumnId);
    const matchedDbColumn = projBoard.columns.find((c: any) => c.title.toLowerCase().includes(targetCol?.title.toLowerCase() || ""));
    if (!matchedDbColumn) return;

    // Optimistic update of local state for instant responsiveness
    const originalCards = [...cards];
    const targetColTitle = targetCol ? targetCol.title : "";
    setCards(prevCards => prevCards.map(c => 
      c.id === cardId ? { ...c, columnId: destColumnId, columnTitle: targetColTitle } : c
    ));

    try {
      await apiRequest(`/kanban/cards/${cardId}`, {
        method: "PUT",
        body: JSON.stringify({
          columnId: matchedDbColumn.id
        })
      });
      fetchTasksData();
    } catch (err) {
      console.error("Failed to move card:", err);
      // Rollback state if the network request fails
      setCards(originalCards);
    }
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData("text/plain", cardId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumnId(columnId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, destColumnId: string) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData("text/plain");
    if (cardId) {
      handleMoveCard(cardId, destColumnId);
    }
    setDragOverColumnId(null);
  };

  const getColumnColorBar = (colId: string) => {
    if (colId === "column-todo") return "bg-neutral-500";
    if (colId === "column-progress") return "bg-blue-400";
    if (colId === "column-review") return "bg-amber-400";
    return "bg-emerald-400";
  };

  const handleUpdateCardDesc = (cardId: string, description: string) => {
    setCardDescriptions((prev) => ({ ...prev, [cardId]: description }));
  };

  const handleAddChecklist = (cardId: string) => {
    if (cardChecklists[cardId]) return;
    setCardChecklists((prev) => ({ ...prev, [cardId]: [] }));
    const newLog = {
      id: `log-${Date.now()}`,
      action: `Created a checklist`,
      timestamp: getTimestamp(),
    };
    setTaskActivityLog((prev) => ({
      ...prev,
      [cardId]: [newLog, ...(prev[cardId] || [])],
    }));
  };

  const handleDeleteChecklist = (cardId: string) => {
    setCardChecklists((prev) => {
      const copy = { ...prev };
      delete copy[cardId];
      return copy;
    });
    const newLog = {
      id: `log-${Date.now()}`,
      action: `Deleted the checklist`,
      timestamp: getTimestamp(),
    };
    setTaskActivityLog((prev) => ({
      ...prev,
      [cardId]: [newLog, ...(prev[cardId] || [])],
    }));
  };

  const handleAddChecklistItem = (cardId: string, text: string) => {
    if (!text.trim()) return;
    const newItem = {
      id: `item-${Date.now()}`,
      text: text.trim(),
      done: false
    };
    setCardChecklists((prev) => ({
      ...prev,
      [cardId]: [...(prev[cardId] || []), newItem]
    }));
    const newLog = {
      id: `log-${Date.now()}`,
      action: `Added checklist item: "${text.trim()}"`,
      timestamp: getTimestamp(),
    };
    setTaskActivityLog((prev) => ({
      ...prev,
      [cardId]: [newLog, ...(prev[cardId] || [])],
    }));
  };

  const handleToggleChecklistItem = (cardId: string, itemId: string) => {
    setCardChecklists((prev) => {
      const list = prev[cardId] || [];
      const updated = list.map((item) => {
        if (item.id === itemId) {
          const newDone = !item.done;
          const newLog = {
            id: `log-${Date.now()}`,
            action: `${newDone ? "Completed" : "Unchecked"} item: "${item.text}"`,
            timestamp: getTimestamp(),
          };
          setTaskActivityLog((logs) => ({
            ...logs,
            [cardId]: [newLog, ...(logs[cardId] || [])],
          }));
          return { ...item, done: newDone };
        }
        return item;
      });
      return { ...prev, [cardId]: updated };
    });
  };

  const handleDeleteChecklistItem = (cardId: string, itemId: string) => {
    setCardChecklists((prev) => {
      const list = prev[cardId] || [];
      const itemText = list.find(i => i.id === itemId)?.text || "";
      const newLog = {
        id: `log-${Date.now()}`,
        action: `Removed checklist item: "${itemText}"`,
        timestamp: getTimestamp(),
      };
      setTaskActivityLog((logs) => ({
        ...logs,
        [cardId]: [newLog, ...(logs[cardId] || [])],
      }));
      return { ...prev, [cardId]: list.filter(item => item.id !== itemId) };
    });
  };

  const handleToggleCardLabel = (cardId: string, label: string) => {
    setCardLabels((prev) => {
      const current = prev[cardId] || [];
      let updated;
      let logAction = "";
      if (current.includes(label)) {
        updated = current.filter(l => l !== label);
        logAction = `Removed label: "${label}"`;
      } else {
        updated = [...current, label];
        logAction = `Added label: "${label}"`;
      }
      const newLog = {
        id: `log-${Date.now()}`,
        action: logAction,
        timestamp: getTimestamp(),
      };
      setTaskActivityLog((logs) => ({
        ...logs,
        [cardId]: [newLog, ...(logs[cardId] || [])],
      }));
      return { ...prev, [cardId]: updated };
    });
  };

  const getChecklistPercent = (cardId: string) => {
    const list = cardChecklists[cardId] || [];
    if (list.length === 0) return 0;
    const done = list.filter(i => i.done).length;
    return (done / list.length) * 100;
  };

  const getCardLabelsList = (card: KanbanCard) => {
    if (cardLabels[card.id]) return cardLabels[card.id];
    const defaults = [];
    const proj = projectsList.find((p: any) => p.id === card.projectId);
    if (proj) defaults.push(proj.name.split(" ")[0]);
    if (card.priority === "HIGH") defaults.push("High Priority");
    else if (card.priority === "MEDIUM") defaults.push("Medium Priority");
    else defaults.push("Low Priority");
    return defaults;
  };

  const getLabelColorClass = (labelName: string) => {
    switch (labelName) {
      case "UI Design": return "bg-purple-500";
      case "Backend": return "bg-yellow-500";
      case "QA": return "bg-cyan-500";
      case "Bug": return "bg-rose-500";
      case "Documentation": return "bg-orange-500";
      case "Frontend": return "bg-emerald-500";
      case "High Priority": return "bg-red-500";
      case "Medium Priority": return "bg-amber-500";
      case "Low Priority": return "bg-blue-500";
      default: return "bg-neutral-500";
    }
  };

  const getCardChecklistStats = (cardId: string) => {
    const list = cardChecklists[cardId] || [];
    if (list.length === 0) return null;
    const done = list.filter(item => item.done).length;
    return `${done}/${list.length}`;
  };

  const getMixedActivityList = (cardId: string) => {
    const comms = (taskComments[cardId] || []).map(c => ({
      id: c.id,
      user: { name: c.userName, role: c.userRole },
      content: c.content,
      timestamp: c.timestamp,
      type: "comment",
      time: parseInt(c.id.split("-")[1]) || 0
    }));
    const logs = (taskActivityLog[cardId] || []).map(l => ({
      id: l.id,
      user: null,
      content: l.action,
      timestamp: l.timestamp,
      type: "log",
      time: parseInt(l.id.split("-")[1]) || 0
    }));
    return [...comms, ...logs].sort((a, b) => b.time - a.time);
  };

  const handleToggleCardAssignee = async (cardId: string, userId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    const currentAssignees = card.assignees || [];
    const isAssigned = currentAssignees.some(u => u.id === userId);
    let nextAssigneeIds: string[];
    if (isAssigned) {
      nextAssigneeIds = currentAssignees.filter(u => u.id !== userId).map(u => u.id);
    } else {
      nextAssigneeIds = [...currentAssignees.map(u => u.id), userId];
    }
    try {
      await apiRequest(`/kanban/cards/${cardId}`, {
        method: "PUT",
        body: JSON.stringify({ assigneeIds: nextAssigneeIds })
      });
      triggerToast(isAssigned ? "Member removed from task." : "Member assigned to task.");
      fetchTasksData();
    } catch (err) {
      console.error("Failed to toggle card assignee:", err);
      triggerToast("Failed to update task assignees.", "error");
    }
  };

  const handleUpdateCardAssignees = async (cardId: string, assigneeIds: string[]) => {
    try {
      await apiRequest(`/kanban/cards/${cardId}`, {
        method: "PUT",
        body: JSON.stringify({ assigneeIds })
      });
      triggerToast("Task assignees updated.");
      fetchTasksData();
    } catch (err) {
      console.error("Failed to update card assignees:", err);
      triggerToast("Failed to update task assignees.", "error");
    }
  };

  const filteredCardsForView = selectedTrlProjectId === "all"
    ? cards
    : cards.filter(c => c.projectId === selectedTrlProjectId);

  const detailCard = cards.find(c => c.id === largeDetailCardId);
  const commentsList = largeDetailCardId ? (taskComments[largeDetailCardId] || []) : [];
  const activityList = largeDetailCardId ? (taskActivityLog[largeDetailCardId] || []) : [];

  return (
    <div className="relative w-full min-h-screen bg-[#0B1220] text-[#17394d] font-sans flex flex-col">
      {/* Ferrofluid background under elements */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none animate-fade-in-slow">
        <Ferrofluid
          colors={['#4F46E5', '#06B6D4', '#00e5c8', '#00B8A2']}
          speed={0.15}
          scale={1.2}
          turbulence={0.8}
          fluidity={0.15}
          rimWidth={0.2}
          sharpness={3.0}
          shimmer={1.0}
          glow={2.0}
          flowDirection="down"
          opacity={0.25}
          mouseInteraction={true}
          mouseStrength={1.2}
          mouseRadius={0.35}
        />
      </div>

      {/* Title Header with View Switcher and Action Button */}
      <div className="relative z-30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 lg:px-28 py-3 bg-black/15 border-b border-dashed border-white/10 flex-shrink-0 select-none board-header-panel">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/80">Personal Work Board</p>
          <h2 className="text-lg font-black text-white mt-0.5">My Tasks</h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Project Selector dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowTrlDropdown(showTrlDropdown === "header-project" ? null : "header-project")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-[3px] bg-[#121E30] hover:bg-[#1A2B42] border border-[#253347] text-xs font-black uppercase tracking-wider text-white transition-all shadow-md"
            >
              <FolderKanban size={13} className="text-teal" />
              <span>PROJECT: {selectedTrlProjectId === "all" ? "ALL PROJECTS" : projectsList.find((p: any) => p.id === selectedTrlProjectId)?.name.toUpperCase()}</span>
              <ChevronDown size={11} className="text-text-muted" />
            </button>
            {showTrlDropdown === "header-project" && (
              <div className="absolute right-0 mt-1 z-35 bg-[#121E30] border border-[#253347] rounded-[3px] shadow-xl py-1 w-64 max-h-60 overflow-y-auto planka-scrollbar">
                <button
                  onClick={() => {
                    setSelectedTrlProjectId("all");
                    setShowTrlDropdown(null);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-white/5 text-xs font-bold transition-all text-white flex items-center justify-between ${selectedTrlProjectId === "all" ? "bg-white/5 text-teal" : ""}`}
                >
                  <span>All Projects</span>
                  {selectedTrlProjectId === "all" && <Check size={12} className="text-teal" />}
                </button>
                <div className="h-px bg-[#253347] my-1" />
                {projectsList.map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedTrlProjectId(p.id);
                      setShowTrlDropdown(null);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-white/5 text-xs font-bold transition-all text-white flex items-center justify-between ${selectedTrlProjectId === p.id ? "bg-white/5 text-teal" : ""}`}
                  >
                    <span className="truncate">{p.name}</span>
                    {selectedTrlProjectId === p.id && <Check size={12} className="text-teal" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View Switcher Toggle */}
          <div className="flex items-center bg-black/20 p-0.5 rounded-[3px]">
            <button
              onClick={() => setActiveView("kanban")}
              className={`px-3.5 py-1.5 rounded-[3px] text-[10px] uppercase tracking-wider font-extrabold transition-all duration-200 ${
                activeView === "kanban"
                  ? "bg-white/20 text-white shadow-sm"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              Board
            </button>
            <button
              onClick={() => setActiveView("gantt")}
              className={`px-3.5 py-1.5 rounded-[3px] text-[10px] uppercase tracking-wider font-extrabold transition-all duration-200 ${
                activeView === "gantt"
                  ? "bg-white/20 text-white shadow-sm"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              Timeline
            </button>
          </div>

          <button
            onClick={() => {
              setTargetColumnId("column-todo");
              setIsAddTaskOpen(true);
            }}
            className="flex items-center gap-1 bg-white/20 hover:bg-white/35 text-white font-bold text-xs py-1.5 px-3 rounded-[3px] shadow transition-all"
          >
            <Plus size={13} />
            Add Task
          </button>
        </div>
      </div>

      {/* Columns/Gantt Workspace Container */}
      <div className="relative z-10 flex-grow p-6 lg:px-28 flex flex-col">
        
        {/* TRL Roadmap Progression Header Widget */}
        {(() => {
          const project = projectsList.find((p: any) => p.id === selectedTrlProjectId);
          if (!project) return null;

          return (
            <div className="mb-4 bg-[#121E30]/80 backdrop-blur-xs border border-[#253347] rounded-[3px] p-4 flex flex-col gap-3 shadow-lg select-none">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded bg-[#00e5c8]/10 text-[#00e5c8]">
                    <Target size={16} />
                  </span>
                  <div>
                    <span className="text-xs font-black text-white">Project TRL Roadmap</span>
                    <span className="ml-2 text-[10px] text-text-muted font-bold">Current: Level {project.currentTRL} ({getTrlLevelName(project.currentTRL)})</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">

                  {getProjectTrlWarning(project.id) && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] bg-red-950/20 border border-red-500/30 text-red-400 text-[10px] font-extrabold uppercase animate-pulse">
                      <AlertTriangle size={12} />
                      <span>{getProjectTrlWarning(project.id)}</span>
                    </div>
                  )}

                  <button 
                    onClick={() => setShowTrlDetailsPanel(99)}
                    className="text-[10px] font-extrabold uppercase tracking-wider text-[#00e5c8] hover:text-[#00B8A2] transition"
                  >
                    View All TRL Tasks
                  </button>
                </div>
              </div>

              {/* TRL Steps Gauge */}
              <div className="grid grid-cols-3 lg:grid-cols-9 gap-2">
                {[...Array(9)].map((_, i) => {
                  const lvl = i + 1;
                  const { total, completed } = getProjectTrlProgressStats(project.id, lvl);
                  const isCurrent = project.currentTRL === lvl;
                  const isPassed = project.currentTRL > lvl;
                  const isLocked = project.currentTRL < lvl;
                  const isComplete = total > 0 && completed === total;
                  
                  let stepBg = "bg-[#08101f] border-[#253347] text-text-muted hover:border-white/20";
                  if (isCurrent) {
                    stepBg = "bg-teal/5 border-teal text-[#00e5c8] shadow-[0_0_10px_rgba(0,229,200,0.1)] hover:bg-teal/10";
                  } else if (isPassed || isComplete) {
                    stepBg = "bg-emerald-500/5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10";
                  }

                  return (
                    <button
                      key={lvl}
                      onClick={() => setShowTrlDetailsPanel(lvl)}
                      className={`relative p-2 rounded-[3px] border text-left transition duration-150 flex flex-col justify-between gap-1 group/step min-w-0 ${stepBg}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] font-black tracking-wide">TRL {lvl}</span>
                        {total > 0 && (
                          <span className={`text-[8px] font-extrabold px-1 rounded ${isComplete ? 'bg-emerald-500/20' : isCurrent ? 'bg-teal/20' : 'bg-white/5'}`}>
                            {completed}/{total}
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] font-medium truncate text-white/70 group-hover/step:text-white transition-colors">
                        {getTrlLevelName(lvl)}
                      </div>
                      <div className="w-full h-1 bg-black/30 rounded-full overflow-hidden mt-1">
                        <div 
                          className={`h-full transition-all duration-300 ${isComplete ? 'bg-emerald-500' : 'bg-teal'}`}
                          style={{ width: total > 0 ? `${(completed / total) * 100}%` : '0%' }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {activeView === "gantt" ? (
          <div className="flex-grow flex bg-[#121E30]/95 border border-[#253347] rounded-[3px] p-5 shadow-lg overflow-hidden min-h-0 text-white">
            {/* Left Column: Tasks List */}
            <div className="w-72 flex-shrink-0 border-r border-[#253347]/80 pr-5 flex flex-col min-h-0">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-4">Tasks</h3>
              <div className="flex-grow overflow-y-auto space-y-2 pr-1 planka-scrollbar">
                {filteredCardsForView.map((card) => (
                  <div key={card.id} className="p-3 bg-[#1A2B42] border border-[#253347]/50 rounded-[3px] flex items-center justify-between gap-2 shadow-sm">
                    <span className="text-xs font-bold text-white truncate">{card.title}</span>
                    <span className={`flex-shrink-0 rounded-[3px] px-1.5 py-0.5 text-[8px] font-extrabold tracking-wide ${getPriorityStyle(card.priority)}`}>
                      {formatPriority(card.priority)}
                    </span>
                  </div>
                ))}
                {filteredCardsForView.length === 0 && (
                  <div className="text-center py-6 text-xs text-text-muted">No tasks available</div>
                )}
              </div>
            </div>

            {/* Right Column: Horizontally Scrollable Timeline Grid */}
            <div className="flex-1 pl-5 flex flex-col min-h-0">
              {/* Timeline Header Row (Months / Weeks) */}
              <div className="flex border-b border-[#253347]/80 pb-3 mb-4 text-[10px] font-bold text-text-muted">
                <div className="w-1/4 text-center border-r border-[#253347]/80">Week 1 - 2 (May)</div>
                <div className="w-1/4 text-center border-r border-[#253347]/80">Week 3 - 4 (May)</div>
                <div className="w-1/4 text-center border-r border-[#253347]/80">Week 5 - 6 (June)</div>
                <div className="w-1/4 text-center">Week 7 - 8 (June)</div>
              </div>

              {/* Timeline Rows (one row per task card) */}
              <div className="flex-grow overflow-y-auto space-y-2 pr-1 planka-scrollbar">
                {filteredCardsForView.map((card) => {
                  const hash = card.title.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0);
                  const isDone = card.columnId === "column-done" || card.columnId === "Done";
                  const startOffset = hash % 5; // 0 to 4 columns offset
                  const widthSpan = (hash % 3) + 2; // 2 to 4 columns wide

                  return (
                    <div key={card.id} className="h-[46px] flex items-center relative border-b border-dashed border-[#253347]/40">
                      {/* Visual bar grid backgrounds */}
                      <div className="grid grid-cols-8 w-full h-full absolute inset-0 pointer-events-none">
                        {[...Array(8)].map((_, i) => (
                          <div key={i} className="border-r border-dashed border-[#253347]/40 h-full" />
                        ))}
                      </div>
                      
                      <div
                        style={{
                          marginLeft: `${(startOffset / 8) * 100}%`,
                          width: `${(widthSpan / 8) * 100}%`,
                        }}
                        className={`h-7 rounded-[3px] flex items-center px-3 text-[10px] font-bold shadow transition-all duration-300 ${
                          isDone
                            ? "bg-[#00C88A] text-white"
                            : card.columnId === "column-review"
                            ? "bg-amber-500 text-white"
                            : "bg-[#1A2B42] text-teal border border-teal/20"
                        }`}
                      >
                        <span className="truncate">{card.title}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 w-full items-stretch pb-6">
            {columns.map((column) => {
              const columnCards = filteredCardsForView.filter((card) => card.columnId === column.id);

              const getColumnIcon = (colId: string) => {
                if (colId === "column-todo") return <ArrowRightCircle size={14} className="text-[#6b808c] mr-1.5" />;
                if (colId === "column-progress") return <PlayCircle size={14} className="text-[#0079bf] mr-1.5" />;
                if (colId === "column-review") return <RefreshCw size={12} className="text-amber-600 mr-1.5 animate-spin-slow" />;
                return <CheckCircle2 size={14} className="text-[#5aac44] mr-1.5" />;
              };

              return (
                <section
                  key={column.id}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => handleDragEnter(e, column.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, column.id)}
                  className={`flex flex-col w-full bg-[#121E30]/75 backdrop-blur-xs border border-[#253347]/50 rounded-[3px] p-2 transition-all duration-150 ${
                    dragOverColumnId === column.id ? "bg-[#1A2B42]/70 border-teal/40 scale-[1.01]" : ""
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-2 py-1.5 mb-2 flex-shrink-0 border-b border-dashed border-[#253347]/80 pb-2">
                    <div className="flex items-center select-none">
                      {getColumnIcon(column.id)}
                      <span className="text-sm font-extrabold text-white tracking-wide">{column.title}</span>
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-white/5 text-text-muted text-[10px] font-bold">
                        {columnCards.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => {
                          setTargetColumnId(column.id);
                          setIsAddTaskOpen(true);
                        }}
                        className="p-1 text-text-muted hover:text-white hover:bg-white/5 rounded-[3px] transition"
                        title="Add Task"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Cards List */}
                  <div className="space-y-2 pt-0.5 pr-0.5 pb-1 flex flex-col">
                    <div className="space-y-2 flex-1">
                      {/* Inline Add Task Input Card */}
                      <div className="flex-shrink-0 bg-[#08101f]/80 border border-[#253347] rounded-[3px] px-2.5 py-2 flex items-center gap-2 focus-within:border-teal transition-all duration-150 kanban-add-card-wrapper">
                        <span className="text-teal text-xs font-bold">+</span>
                        <input
                          type="text"
                          placeholder="Add card"
                          value={inlineTaskTitles[column.id] || ""}
                          onChange={(e) => setInlineTaskTitles({ ...inlineTaskTitles, [column.id]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleCreateInlineCard(column.id);
                            }
                          }}
                          className="bg-transparent border-none outline-none text-xs text-white placeholder:text-text-muted/50 w-full min-w-0 font-semibold"
                        />
                      </div>
                      {columnCards.map((card) => {
                        const priorityStyle = getPriorityStyle(card.priority);
                        const stats = getCardStats(card.id);

                        const cardProject = projectsList.find((p: any) => p.id === card.projectId);
                        const projectMembers = cardProject
                          ? usersList.filter((u: any) => cardProject.memberIds?.includes(u.id))
                          : usersList;
                        // Assignee circles
                        const displayUsers = card.assignees && card.assignees.length > 0
                          ? card.assignees
                          : (card.assigneeId ? (usersList.find((u: any) => u.id === card.assigneeId) ? [usersList.find((u: any) => u.id === card.assigneeId)!] : []) : []);
                        const cardAssignee = displayUsers.length > 0 ? displayUsers[0] : null;

                        return (
                          <article
                            key={card.id}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, card.id)}
                            onDragEnd={() => setDragOverColumnId(null)}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setLargeDetailCardId(card.id);
                              setActiveTab("updates");
                            }}
                            className="group relative rounded-[3px] bg-[#1A2B42] hover:bg-[#1A2B42]/85 p-2.5 shadow-md border border-[#253347]/80 hover:border-teal/30 transition-all duration-150 cursor-grab active:cursor-grabbing select-none card-article"
                          >
                            {/* Visual Labels (Horizontal Color Chips) */}
                            <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                              <div className="flex flex-wrap gap-1">
                                {getCardLabelsList(card).map((lbl, idx) => (
                                  <span
                                    key={idx}
                                    className={`h-2 w-10 rounded-[2px] ${getLabelColorClass(lbl)}`}
                                    title={lbl}
                                  />
                                ))}
                              </div>
                              {card.trlLevel && (
                                <span 
                                  className="text-[9px] font-black tracking-wider text-[#00e5c8] bg-[#00e5c8]/10 px-1.5 py-0.5 rounded-[2px] flex items-center gap-0.5 border border-[#00e5c8]/25"
                                  title={`Technology Readiness Level ${card.trlLevel}: ${getTrlLevelName(card.trlLevel)}`}
                                >
                                  <Target size={10} className="text-[#00e5c8] mr-0.5" />
                                  <span>TRL {card.trlLevel}</span>
                                </span>
                              )}
                            </div>

                            {/* Project Name Indicator */}
                            {cardProject && (
                              <div className="flex items-center text-[10px] font-bold text-teal uppercase tracking-wider mb-1.5 select-none">
                                <Folder size={10} className="mr-1 text-teal flex-shrink-0" />
                                <span className="truncate">{cardProject.name}</span>
                              </div>
                            )}

                            {/* Card Content (Title & Options) */}
                            <div className="flex items-start justify-between gap-2">
                              <h4
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQuickEditCardId(card.id);
                                }}
                                className="text-sm font-semibold text-white hover:text-teal transition-colors duration-150 line-clamp-2 leading-tight cursor-pointer"
                              >
                                {card.title}
                              </h4>
                              
                              <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteCard(card.id);
                                  }}
                                  className="text-[#6b808c] hover:text-red-500 p-0.5 rounded transition"
                                  title="Delete task"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>

                            {/* Footer details */}
                            <div className="mt-2.5 flex items-center justify-between border-t border-black/5 pt-2 text-[11px] text-[#6b808c]">
                              {/* Left indicators */}
                              <div className="flex items-center gap-2.5 font-bold">
                                {(card.description || cardDescriptions[card.id]) && (
                                  <span title="This card has a description.">
                                    <AlignLeft size={12} className="text-[#6b808c]" />
                                  </span>
                                )}
                                {card.totalLoggedHours !== undefined && card.totalLoggedHours > 0 && (
                                  <span className="flex items-center gap-1 text-[#00e5c8]" title="Cumulative logged effort hours">
                                    <Clock size={12} className="text-[#00e5c8]" />
                                    <span>{card.totalLoggedHours.toFixed(card.totalLoggedHours % 1 === 0 ? 0 : 1)}h</span>
                                  </span>
                                )}
                                {stats.comments > 0 && (
                                  <span className="flex items-center gap-0.5" title="Comments count">
                                    <MessageSquare size={12} className="text-[#6b808c]" />
                                    <span>{stats.comments}</span>
                                  </span>
                                )}
                                {getCardChecklistStats(card.id) && (
                                  <span className="flex items-center gap-0.5 text-[#5aac44]" title="Checklist progress">
                                    <CheckSquare size={12} className="text-[#5aac44]" />
                                    <span>{getCardChecklistStats(card.id)}</span>
                                  </span>
                                )}
                              </div>

                              {/* Right overlapping avatars */}
                              <div className="flex -space-x-1.5">
                                {displayUsers.map((u: any) => {
                                  const uInitials = u.name.split(" ").map((n: string) => n[0]).join("");
                                  const avatarColor = getUserAvatarProps(u.id);
                                  return u.avatarUrl ? (
                                    <img
                                      key={u.id}
                                      src={u.avatarUrl}
                                      alt={u.name}
                                      className="h-5 w-5 rounded-full object-cover border border-[#1A2B42] flex-shrink-0"
                                      title={u.name}
                                    />
                                  ) : (
                                    <div
                                      key={u.id}
                                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-black border border-[#1A2B42] bg-gradient-to-tr ${avatarColor}`}
                                      title={u.name}
                                    >
                                      {uInitials}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Quick Edit Popover Bubble */}
                            {quickEditCardId === card.id && (
                              <div
                                className="quick-edit-popover absolute top-full left-0 right-0 mt-2 z-50 bg-[#121E30] border border-[#253347] rounded-[3px] shadow-xl p-3 text-xs w-72 mx-auto cursor-default pointer-events-auto select-text text-white"
                                draggable={false}
                                onDragStart={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* Arrow pointing up */}
                                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#121E30] border-t border-l border-[#253347] rotate-45" />

                                <div className="relative space-y-3 z-10">
                                  {/* Task Title Input */}
                                  <div>
                                    <label className="block text-[9px] font-bold uppercase tracking-widest text-text-muted mb-1">
                                      Task Title
                                    </label>
                                    <input
                                      type="text"
                                      value={card.title}
                                      onChange={(e) => handleUpdateCardTitle(card.id, e.target.value)}
                                      className="w-full bg-[#08101f] border border-[#253347] rounded-[3px] px-2.5 py-1.5 text-white outline-none focus:bg-[#08101f] focus:border-teal/50 font-semibold"
                                      placeholder="Task Title"
                                    />
                                  </div>

                                  {/* Status & Project row */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {/* Status Badge */}
                                    <div className="relative status-dropdown-container">
                                      <label className="block text-[9px] font-bold uppercase tracking-widest text-text-muted mb-1">
                                        Status
                                      </label>
                                      <button
                                        onClick={() => setShowStatusDropdown(showStatusDropdown === card.id ? null : card.id)}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[3px] bg-[#1A2B42] hover:bg-[#253347] border border-[#253347]/50 text-xs font-semibold text-white"
                                      >
                                        <span className={`w-1.5 h-3 rounded-full ${getColumnColorBar(card.columnId)}`} />
                                        <span>{columns.find(c => c.id === card.columnId)?.title || "Select Status"}</span>
                                        <ChevronDown size={10} className="text-text-muted" />
                                      </button>
                                      {showStatusDropdown === card.id && (
                                        <div className="absolute top-full left-0 mt-1 z-[60] bg-[#121E30] border border-[#253347] rounded-[3px] shadow-lg py-1 w-36">
                                          {columns.map((col) => (
                                            <button
                                              key={col.id}
                                              onClick={() => {
                                                handleMoveCard(card.id, col.id);
                                                setShowStatusDropdown(null);
                                              }}
                                              className="w-full text-left px-3 py-1.5 hover:bg-[#1A2B42] text-xs font-semibold text-white flex items-center gap-2"
                                            >
                                              <span className={`w-1.5 h-3 rounded-full ${getColumnColorBar(col.id)}`} />
                                              {col.title}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
 
                                    {/* Project Badge */}
                                    <div className="relative project-dropdown-container">
                                      <label className="block text-[9px] font-bold uppercase tracking-widest text-text-muted mb-1">
                                        Project
                                      </label>
                                      <button
                                        onClick={() => setShowProjectDropdown(showProjectDropdown === card.id ? null : card.id)}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[3px] bg-[#1A2B42] hover:bg-[#253347] border border-[#253347]/50 text-xs font-semibold text-white"
                                      >
                                        <Folder size={12} className="text-teal" />
                                        <span className="truncate max-w-[80px]">{projectsList.find((p: any) => p.id === card.projectId)?.name || "Select"}</span>
                                        <ChevronDown size={10} className="text-text-muted" />
                                      </button>
                                      {showProjectDropdown === card.id && (
                                        <div className="absolute top-full left-0 mt-1 z-[60] bg-[#121E30] border border-[#253347] rounded-[3px] shadow-lg w-48 max-h-48 overflow-y-auto planka-scrollbar">
                                          <div className="py-1">
                                            {projectsList.map((p: any) => (
                                              <button
                                                key={p.id}
                                                onClick={() => {
                                                  handleUpdateCardProject(card.id, p.id);
                                                  setShowProjectDropdown(null);
                                                }}
                                                className="w-full text-left px-3 py-1.5 hover:bg-[#1A2B42] text-xs font-semibold text-white truncate"
                                              >
                                                {p.name}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
 
                                    {/* Date Button */}
                                    <div>
                                      <label className="block text-[9px] font-bold uppercase tracking-widest text-text-muted mb-1">
                                        Due Date
                                      </label>
                                      <div className="relative flex items-center date-picker-container">
                                        <button
                                          onClick={() => setShowDatePicker(showDatePicker === card.id ? null : card.id)}
                                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[3px] bg-[#1A2B42] hover:bg-[#253347] border border-[#253347]/50 text-xs font-semibold text-white"
                                          title="Set due date"
                                        >
                                          <Calendar size={12} className="text-teal" />
                                          {card.dueDate ? (
                                            <span className="text-xs text-teal font-semibold">{card.dueDate}</span>
                                          ) : (
                                            <span className="text-xs text-text-muted font-semibold">Due date</span>
                                          )}
                                        </button>
                                        {showDatePicker === card.id && (
                                          <div className="absolute left-0 mt-1 z-40 bg-[#121E30] border border-[#253347] rounded-[3px] p-3 shadow-xl flex flex-col gap-2 w-48 text-left">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Select Due Date</span>
                                            <input
                                              type="date"
                                              value={card.dueDate || ""}
                                              onChange={(e) => {
                                                handleUpdateCardDueDate(card.id, e.target.value);
                                              }}
                                              onClick={(e) => {
                                                try {
                                                  e.currentTarget.showPicker();
                                                } catch (err) {}
                                              }}
                                              className="bg-[#0B1220] border border-[#253347] rounded-[3px] px-2 py-1 text-xs text-white outline-none focus:border-teal/50 w-full cursor-pointer"
                                            />
                                            <div className="flex justify-end gap-1.5 mt-1">
                                              {card.dueDate && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    handleUpdateCardDueDate(card.id, "");
                                                    setShowDatePicker(null);
                                                  }}
                                                  className="px-2 py-1 text-[10px] font-extrabold uppercase text-red-400 hover:bg-red-500/10 rounded-[3px] transition"
                                                >
                                                  Clear
                                                </button>
                                              )}
                                              <button
                                                type="button"
                                                onClick={() => setShowDatePicker(null)}
                                                className="bg-teal hover:bg-teal-deep text-navy px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-[3px] transition font-bold"
                                              >
                                                Done
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Footer: User Avatar Picker + Speech Bubble */}
                                  <div className="flex items-center justify-between border-t border-[#253347] pt-2 mt-1">
                                    <div className="flex items-center gap-3">
                                      {/* Assignee Selection */}
                                      <div className="relative assignee-dropdown-container">
                                        <button
                                          onClick={() => setShowAssigneeDropdown(showAssigneeDropdown === card.id ? null : card.id)}
                                          className="text-text-muted hover:text-white transition flex items-center"
                                          title="Assign teammate"
                                        >
                                           <div className="w-6 h-6 rounded-full border border-dashed border-[#253347] flex items-center justify-center text-[10px] bg-[#1A2B42] overflow-hidden">
                                            {cardAssignee ? (
                                              cardAssignee.avatarUrl ? (
                                                <img src={cardAssignee.avatarUrl} alt={cardAssignee.name} className="w-full h-full object-cover" />
                                              ) : (
                                                <span className="text-[9px] font-black text-teal">
                                                  {cardAssignee.name.split(" ").map((n: string) => n[0]).join("")}
                                                </span>
                                              )
                                            ) : (
                                              <UserIcon size={10} className="text-text-muted" />
                                            )}
                                          </div>
                                        </button>
                                        {showAssigneeDropdown === card.id && (
                                          <div className="absolute bottom-full left-0 mb-1.5 z-[60] bg-[#121E30] border border-[#253347] rounded-[3px] shadow-lg w-52 max-h-48 overflow-y-auto planka-scrollbar">
                                            <div className="py-1">
                                              <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#253347]/50 mb-1">
                                                <span className="text-[9px] font-black uppercase tracking-wider text-text-muted">Assign Members</span>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowAssigneeDropdown(null);
                                                  }}
                                                  className="text-text-muted hover:text-white transition p-0.5"
                                                >
                                                  <X size={10} />
                                                </button>
                                              </div>
                                              <button
                                                onClick={() => {
                                                  handleUpdateCardAssignees(card.id, []);
                                                  setShowAssigneeDropdown(null);
                                                }}
                                                className="w-full text-left px-3 py-1 hover:bg-[#1A2B42] text-xs text-text-muted font-semibold border-b border-[#253347]/50 pb-1.5 mb-1"
                                              >
                                                Clear All Assignees
                                              </button>
                                              {projectMembers.map((u: any) => {
                                                const isAssigned = card.assignees
                                                  ? card.assignees.some((assigned: any) => assigned.id === u.id)
                                                  : card.assigneeId === u.id;
                                                return (
                                                  <button
                                                    key={u.id}
                                                    onClick={() => {
                                                      handleToggleCardAssignee(card.id, u.id);
                                                    }}
                                                    className="w-full text-left px-3 py-1.5 hover:bg-[#1A2B42] text-xs text-white flex items-center justify-between gap-2 font-semibold"
                                                  >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                      {u.avatarUrl ? (
                                                        <img src={u.avatarUrl} alt={u.name} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                                                      ) : (
                                                        <div className={`w-5 h-5 rounded-full bg-gradient-to-tr ${getUserAvatarProps(u.id)} text-[8px] text-white font-black flex items-center justify-center flex-shrink-0`}>
                                                          {u.name.split(" ").map((n: string) => n[0]).join("")}
                                                        </div>
                                                      )}
                                                      <span className="truncate">{u.name}</span>
                                                    </div>
                                                    {isAssigned && (
                                                      <span className="text-teal font-bold text-xs flex-shrink-0 mr-1">✓</span>
                                                    )}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* Speech Bubble Icon */}
                                      <button
                                        onClick={() => {
                                          setQuickEditCardId(null);
                                          setLargeDetailCardId(card.id);
                                          setActiveTab("updates");
                                        }}
                                        className="text-text-muted hover:text-white p-1 rounded hover:bg-white/5 transition"
                                        title="Open updates panel"
                                      >
                                        <MessageSquare size={14} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </article>
                        );
                      })}

                      {columnCards.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-20 border border-dashed border-[#253347] rounded-[3px] text-center p-3 bg-[#08101f]/20 select-none kanban-empty-placeholder">
                          <span className="text-[11px] font-semibold text-text-muted">No cards in this list</span>
                        </div>
                      )}
                    </div>

                    {/* Add card button */}
                    <button
                      onClick={() => {
                        setTargetColumnId(column.id);
                        setIsAddTaskOpen(true);
                      }}
                      className="w-full py-1.5 px-2 flex items-center gap-1.5 rounded-[3px] bg-transparent hover:bg-[#1A2B42] text-text-muted hover:text-white font-semibold text-xs transition-all duration-150 mt-2 flex-shrink-0 text-left justify-start"
                    >
                      <Plus size={14} />
                      <span>Add card</span>
                    </button>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* ADD TASK MODAL */}
      {isAddTaskOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-[3px] border border-[#253347] bg-[#121E30] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-white">
            <div className="flex items-center justify-between border-b border-[#253347] pb-3 mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-teal">
                <Plus size={16} className="text-teal" />
                Add Task
              </h3>
              <button onClick={() => setIsAddTaskOpen(false)} className="text-text-muted hover:text-white transition">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddTaskSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted">Task Title</label>
                <input
                  type="text"
                  placeholder="What needs to be done?"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full h-9 rounded-[3px] border border-[#253347] bg-[#08101f] px-3 text-white placeholder:text-text-muted/30 outline-none focus:ring-1 focus:ring-teal/30 focus:border-teal/50 text-xs font-semibold"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted">Task Description</label>
                <textarea
                  placeholder="Task details and deliverables..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full min-h-20 rounded-[3px] border border-[#253347] bg-[#08101f] p-3 text-white placeholder:text-text-muted/30 outline-none focus:ring-1 focus:ring-teal/30 focus:border-teal/50 resize-none text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted">Project</label>
                  <div className="relative">
                    <select
                      value={newTaskProjectId}
                      onChange={(e) => setNewTaskProjectId(e.target.value)}
                      className="w-full h-9 rounded-[3px] border border-[#253347] bg-[#08101f] px-3 text-white outline-none focus:ring-1 focus:ring-teal/30 focus:border-teal/50 cursor-pointer appearance-none text-xs font-semibold"
                    >
                      {projectsList.map((p: any) => (
                        <option key={p.id} value={p.id} className="bg-[#121E30] text-white">
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-text-muted">
                      <ChevronDown size={12} className="text-text-muted" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6b808c] mb-1.5">Priority</label>
                  <div className="relative">
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                      className="w-full h-9 rounded-[3px] border border-[#253347] bg-[#08101f] px-3 text-white outline-none focus:ring-1 focus:ring-teal/30 focus:border-teal/50 cursor-pointer appearance-none text-xs font-semibold"
                    >
                      <option value="LOW" className="bg-[#121E30] text-white">Low</option>
                      <option value="MEDIUM" className="bg-[#121E30] text-white">Medium</option>
                      <option value="HIGH" className="bg-[#121E30] text-white">High</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-text-muted">
                      <ChevronDown size={12} className="text-text-muted" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#253347]">
                <button
                  type="button"
                  onClick={() => setIsAddTaskOpen(false)}
                  className="bg-[#1A2B42] hover:bg-[#253347] border border-[#253347]/80 text-text-muted hover:text-white text-xs py-1.5 px-3.5 rounded-[3px] font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#00C88A] hover:bg-[#00B8A2] text-white text-xs py-1.5 px-3.5 rounded-[3px] font-bold transition"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Large Detail Updates Centered Modal Overlay */}
      {largeDetailCardId && detailCard && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in text-white" 
          onClick={() => setLargeDetailCardId(null)}
        >
          <div
            className="w-full max-w-3xl bg-[#121E30] border border-[#253347] rounded-[3px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] pointer-events-auto animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between p-5 pb-3 flex-shrink-0 border-b border-[#253347]">
              <div className="flex-grow pr-4">
                <input
                  type="text"
                  value={detailCard.title}
                  onChange={(e) => handleUpdateCardTitle(detailCard.id, e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-lg font-bold text-white focus:bg-[#1A2B42] focus:ring-1 focus:ring-teal/30 rounded-[3px] px-1 py-0.5"
                />
                <div className="text-xs text-text-muted mt-1 ml-1 flex items-center gap-1 font-semibold">
                  <span>in list</span>
                  <span className="underline cursor-pointer hover:text-teal">
                    {columns.find(c => c.id === detailCard.columnId)?.title || "Column"}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setLargeDetailCardId(null)} 
                className="text-text-muted hover:text-white p-1.5 rounded-[3px] hover:bg-white/5 transition flex-shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Container (Split into Left: 70%, Right: 30%) */}
            <div className="flex-grow overflow-y-auto planka-scrollbar p-5 pt-2 min-h-0 flex flex-col md:flex-row gap-5">
              {/* Left Column (70%) */}
              <div className="flex-grow md:w-2/3 space-y-5">
                
                {/* Metadata Row: Members, Labels, Project, Due Date */}
                <div className="flex flex-wrap gap-5 items-start">
                  
                  {/* Members Pill List */}
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#6b808c] mb-1.5">Members</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {detailCard.assignees && detailCard.assignees.length > 0 ? (
                        <div className="flex -space-x-1.5 mr-1">
                          {detailCard.assignees.map((assignedUser: any) => {
                            const uInitials = assignedUser.name.split(" ").map((n: string) => n[0]).join("") || "";
                            const avatarColor = getUserAvatarProps(assignedUser.id);
                            return assignedUser.avatarUrl ? (
                              <img
                                key={assignedUser.id}
                                src={assignedUser.avatarUrl}
                                alt={assignedUser.name}
                                className="h-8 w-8 rounded-full object-cover border border-[#0B1220] flex-shrink-0"
                                title={assignedUser.name}
                              />
                            ) : (
                              <div 
                                key={assignedUser.id}
                                className={`flex h-8 w-8 items-center justify-center rounded-full text-[9px] font-black border border-[#0B1220] bg-gradient-to-tr ${avatarColor} flex-shrink-0`}
                                title={assignedUser.name}
                              >
                                {uInitials}
                              </div>
                            );
                          })}
                        </div>
                      ) : detailCard.assigneeId ? (
                        (() => {
                          const assignedUser = usersList.find((u: any) => u.id === detailCard.assigneeId);
                          if (!assignedUser) return <span className="text-xs text-text-muted italic font-semibold">No assignee</span>;
                          const uInitials = assignedUser.name.split(" ").map((n: string) => n[0]).join("") || "";
                          const avatarColor = getUserAvatarProps(assignedUser.id);
                          return assignedUser.avatarUrl ? (
                            <img
                              src={assignedUser.avatarUrl}
                              alt={assignedUser.name}
                              className="h-8 w-8 rounded-full object-cover border border-[#0B1220] flex-shrink-0"
                              title={assignedUser.name}
                            />
                          ) : (
                            <div 
                              className={`flex h-8 w-8 items-center justify-center rounded-full text-[9px] font-black border border-[#0B1220] bg-gradient-to-tr ${avatarColor} flex-shrink-0`}
                              title={assignedUser.name}
                            >
                              {uInitials}
                            </div>
                          );
                        })()
                      ) : (
                        <span className="text-xs text-text-muted italic font-semibold">No assignee</span>
                      )}
                      
                      {/* Plus icon to open Member Dropdown */}
                      <div className="relative assignee-dropdown-container">
                        <button
                          onClick={() => setShowAssigneeDropdown(showAssigneeDropdown === detailCard.id ? null : detailCard.id)}
                          className="w-8 h-8 rounded-full border border-dashed border-[#253347] flex items-center justify-center text-xs bg-[#1A2B42] text-teal hover:bg-[#253347] transition font-bold flex-shrink-0"
                          title="Assign member"
                        >
                          +
                        </button>
                        {showAssigneeDropdown === detailCard.id && (
                          <div className="absolute top-full left-0 mt-1 z-[60] bg-[#121E30] border border-[#253347] rounded-[3px] shadow-lg w-52 max-h-56 overflow-y-auto planka-scrollbar">
                            <div className="py-1">
                              <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#253347]/50 mb-1">
                                <span className="text-[9px] font-black uppercase tracking-wider text-text-muted">Assign Members</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowAssigneeDropdown(null);
                                  }}
                                  className="text-text-muted hover:text-white transition p-0.5"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                              <button
                                onClick={() => {
                                  handleUpdateCardAssignees(detailCard.id, []);
                                }}
                                className="w-full text-left px-3 py-1 hover:bg-[#1A2B42] text-xs text-text-muted font-semibold border-b border-[#253347]/50 pb-1.5 mb-1"
                              >
                                Clear All Assignees
                              </button>
                              {usersList.map((u: any) => {
                                const isAssigned = detailCard.assignees
                                  ? detailCard.assignees.some((assigned: any) => assigned.id === u.id)
                                  : detailCard.assigneeId === u.id;
                                return (
                                  <button
                                    key={u.id}
                                    onClick={() => {
                                      handleToggleCardAssignee(detailCard.id, u.id);
                                    }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-[#1A2B42] text-xs text-white flex items-center justify-between gap-2 font-semibold"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      {u.avatarUrl ? (
                                        <img src={u.avatarUrl} alt={u.name} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                                      ) : (
                                        <div className={`w-5 h-5 rounded-full bg-gradient-to-tr ${getUserAvatarProps(u.id)} text-[8px] text-white font-black flex items-center justify-center flex-shrink-0`}>
                                          {u.name.split(" ").map((n: string) => n[0]).join("")}
                                        </div>
                                      )}
                                      <span className="truncate">{u.name}</span>
                                    </div>
                                    {isAssigned && (
                                      <span className="text-teal font-bold text-xs flex-shrink-0 mr-1">✓</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Labels Pill List */}
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#6b808c] mb-1.5">Labels</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {getCardLabelsList(detailCard).map((lbl, idx) => (
                        <span
                          key={idx}
                          onClick={() => setShowLabelsDropdown(showLabelsDropdown === detailCard.id ? null : detailCard.id)}
                          className={`text-[9px] font-bold text-white px-2 py-0.5 rounded-[3px] cursor-pointer transition opacity-90 hover:opacity-100 ${getLabelColorClass(lbl)}`}
                        >
                          {lbl}
                        </span>
                      ))}
                      <div className="relative">
                        <button
                          onClick={() => setShowLabelsDropdown(showLabelsDropdown === detailCard.id ? null : detailCard.id)}
                          className="w-8 h-8 rounded-[3px] border border-dashed border-[#253347] flex items-center justify-center text-xs bg-[#1A2B42] text-teal hover:bg-[#253347] transition font-bold flex-shrink-0"
                          title="Manage labels"
                        >
                          +
                        </button>
                        {showLabelsDropdown === detailCard.id && (
                          <div className="absolute top-full left-0 mt-1 z-[60] bg-[#121E30] border border-[#253347] rounded-[3px] shadow-lg py-2 px-3 w-48 space-y-1.5">
                            <span className="block text-[9px] font-bold uppercase tracking-wider text-text-muted border-b border-[#253347] pb-1 mb-1">Select Labels</span>
                            {["UI Design", "Backend", "QA", "Bug", "Documentation", "Frontend", "High Priority", "Medium Priority", "Low Priority"].map((lbl) => {
                              const isActive = getCardLabelsList(detailCard).includes(lbl);
                              return (
                                <button
                                  key={lbl}
                                  onClick={() => handleToggleCardLabel(detailCard.id, lbl)}
                                  className="w-full text-left flex items-center justify-between text-xs font-semibold hover:bg-[#1A2B42] p-1 rounded transition text-white"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${getLabelColorClass(lbl)}`} />
                                    <span>{lbl}</span>
                                  </div>
                                  {isActive && <Check size={12} className="text-teal" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Project Pill */}
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#6b808c] mb-1.5">Project</span>
                    <div className="relative flex items-center project-dropdown-container">
                      <button
                        onClick={() => setShowProjectDropdown(showProjectDropdown === detailCard.id ? null : detailCard.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[3px] bg-[#1A2B42] hover:bg-[#253347] border border-[#253347]/50 text-xs font-semibold text-white transition duration-150"
                        title="Change project"
                      >
                        <FolderKanban size={12} className="text-teal" />
                        <span className="font-semibold">{projectsList.find((p: any) => p.id === detailCard.projectId)?.name || "Select Project"}</span>
                        <ChevronDown size={11} className="text-text-muted" />
                      </button>
                      {showProjectDropdown === detailCard.id && (
                        <div className="absolute top-full left-0 mt-1 z-[60] bg-[#121E30] border border-[#253347] rounded-[3px] shadow-lg w-44 max-h-48 overflow-y-auto planka-scrollbar">
                          <div className="py-1">
                            {projectsList.map((p: any) => (
                              <button
                                key={p.id}
                                onClick={() => {
                                  handleUpdateCardProject(detailCard.id, p.id);
                                  setShowProjectDropdown(null);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-[#1A2B42] text-xs font-semibold text-white truncate"
                              >
                                {p.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Due Date Badge */}
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Due Date</span>
                    <div className="relative date-picker-container">
                      <button
                        onClick={() => setShowDatePicker(showDatePicker === detailCard.id ? null : detailCard.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] bg-[#1A2B42] hover:bg-[#253347] border border-[#253347]/50 text-xs font-semibold text-white transition duration-150"
                        title="Set due date"
                      >
                        <Calendar size={12} className="text-teal" />
                        {detailCard.dueDate ? (
                          <span className="text-teal font-semibold">{detailCard.dueDate}</span>
                        ) : (
                          <span className="text-text-muted font-semibold">No due date</span>
                        )}
                      </button>
                      {showDatePicker === detailCard.id && (
                        <div className="absolute left-0 mt-1 z-40 bg-[#121E30] border border-[#253347] rounded-[3px] p-3 shadow-xl flex flex-col gap-2 w-48 text-left">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Select Due Date</span>
                          <input
                            type="date"
                            value={detailCard.dueDate || ""}
                            onChange={(e) => {
                              handleUpdateCardDueDate(detailCard.id, e.target.value);
                            }}
                            onClick={(e) => {
                              try {
                                e.currentTarget.showPicker();
                              } catch (err) {}
                            }}
                            className="bg-[#0B1220] border border-[#253347] rounded-[3px] px-2 py-1 text-xs text-white outline-none focus:border-teal/50 w-full cursor-pointer"
                          />
                          <div className="flex justify-end gap-1.5 mt-1">
                            {detailCard.dueDate && (
                              <button
                                type="button"
                                onClick={() => {
                                  handleUpdateCardDueDate(detailCard.id, "");
                                  setShowDatePicker(null);
                                }}
                                className="px-2 py-1 text-[10px] font-extrabold uppercase text-red-400 hover:bg-red-500/10 rounded-[3px] transition"
                              >
                                Clear
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setShowDatePicker(null)}
                              className="bg-teal hover:bg-teal-deep text-navy px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-[3px] transition font-bold"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* TRL Level Alignment */}
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">TRL Alignment</span>
                    <div className="relative">
                      <button
                        onClick={() => setShowTrlDropdown(showTrlDropdown === detailCard.id ? null : detailCard.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] bg-[#1A2B42] hover:bg-[#253347] border border-[#253347]/50 text-xs font-semibold text-white transition duration-150"
                        title="Set TRL Alignment"
                      >
                        <Target size={12} className="text-text-muted" />
                        {detailCard.trlLevel ? (
                          <span className="text-[#00e5c8] font-semibold">TRL {detailCard.trlLevel}</span>
                        ) : (
                          <span className="text-text-muted font-semibold">General Task</span>
                        )}
                      </button>

                      {showTrlDropdown === detailCard.id && (
                        <div className="absolute left-0 mt-1.5 w-64 bg-[#121E30] border border-[#253347] rounded-[3px] shadow-xl z-30 py-1 planka-scrollbar max-h-60 overflow-y-auto">
                          <button
                            onClick={() => {
                              handleUpdateCardTrl(detailCard.id, undefined);
                              setShowTrlDropdown(null);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-text-muted hover:text-white hover:bg-white/5 transition flex items-center justify-between"
                          >
                            <span>General Task (None)</span>
                            {!detailCard.trlLevel && <Check size={12} className="text-[#00e5c8]" />}
                          </button>
                          <div className="border-t border-[#253347]/50 my-1" />
                          {[...Array(9)].map((_, i) => {
                            const lvl = i + 1;
                            const isSelected = detailCard.trlLevel === lvl;
                            return (
                              <button
                                key={lvl}
                                onClick={() => {
                                  handleUpdateCardTrl(detailCard.id, lvl);
                                  setShowTrlDropdown(null);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-white hover:bg-white/5 transition flex items-center justify-between"
                              >
                                <span>TRL {lvl}: {getTrlLevelName(lvl)}</span>
                                {isSelected && <Check size={12} className="text-[#00e5c8]" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Description Box */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-teal">
                    <AlignLeft size={16} className="text-teal" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">Description</h4>
                  </div>
                  {isEditingDescription ? (
                    <div className="space-y-2 ml-6">
                      <textarea
                        value={descriptionDraft}
                        onChange={(e) => setDescriptionDraft(e.target.value)}
                        placeholder="Add a more detailed description..."
                        className="w-full min-h-24 rounded-[3px] border border-[#253347] bg-[#08101f] p-3 text-sm text-white placeholder:text-text-muted/40 focus:ring-1 focus:ring-teal/30 focus:border-teal/50 outline-none transition resize-none font-medium"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            handleUpdateCardDesc(detailCard.id, descriptionDraft);
                            setIsEditingDescription(false);
                          }}
                          className="px-3.5 py-1.5 bg-[#00C88A] hover:bg-[#00B8A2] text-white text-xs font-bold rounded-[3px] transition"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingDescription(false);
                          }}
                          className="px-3.5 py-1.5 bg-[#1A2B42] hover:bg-[#253347] border border-[#253347]/80 text-text-muted hover:text-white text-xs font-bold rounded-[3px] transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => {
                        setDescriptionDraft(cardDescriptions[detailCard.id] || detailCard.description || "");
                        setIsEditingDescription(true);
                      }}
                      className="ml-6 p-3 rounded-[3px] bg-[#08101f]/60 hover:bg-[#08101f]/80 border border-[#253347]/50 cursor-pointer min-h-12 transition duration-150"
                    >
                      {cardDescriptions[detailCard.id] || detailCard.description ? (
                        <p className="text-sm text-white leading-relaxed font-sans font-medium whitespace-pre-wrap">
                          {cardDescriptions[detailCard.id] || detailCard.description}
                        </p>
                      ) : (
                        <span className="text-xs text-text-muted/50 italic font-semibold">Add a more detailed description...</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Checklist Section */}
                {cardChecklists[detailCard.id] !== undefined && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-white">
                      <div className="flex items-center gap-2 text-teal">
                        <CheckSquare size={16} className="text-teal" />
                        <h4 className="text-xs font-bold uppercase tracking-wider">Checklist</h4>
                      </div>
                      <button
                        onClick={() => handleDeleteChecklist(detailCard.id)}
                        className="text-[10px] font-bold text-text-muted hover:text-red-400 bg-[#1A2B42] hover:bg-[#253347] border border-[#253347]/50 px-2.5 py-1 rounded-[3px] transition"
                      >
                        Delete Checklist
                      </button>
                    </div>

                    {/* Progress bar */}
                    <div className="ml-6 flex items-center gap-3">
                      <span className="text-[10px] font-bold text-text-muted w-8">{Math.round(getChecklistPercent(detailCard.id))}%</span>
                      <div className="flex-grow h-1.5 bg-[#08101f] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#00C88A] transition-all duration-300"
                          style={{ width: `${getChecklistPercent(detailCard.id)}%` }}
                        />
                      </div>
                    </div>

                    {/* Checklist items */}
                    <div className="ml-6 space-y-2">
                      {(cardChecklists[detailCard.id] || []).map((item) => (
                        <div key={item.id} className="flex items-center justify-between group/item">
                          <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.done}
                              onChange={() => handleToggleChecklistItem(detailCard.id, item.id)}
                              className="rounded-[3px] border-[#253347] bg-[#08101f] text-teal focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span className={`text-sm font-sans transition-all duration-150 ${item.done ? "line-through text-text-muted/60" : "text-white"}`}>
                              {item.text}
                            </span>
                          </label>
                          <button
                            onClick={() => handleDeleteChecklistItem(detailCard.id, item.id)}
                            className="text-text-muted hover:text-red-400 p-0.5 rounded transition opacity-0 group-hover/item:opacity-100"
                            title="Delete item"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}

                      {/* Add checklist item */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleAddChecklistItem(detailCard.id, newChecklistItemText);
                          setNewChecklistItemText("");
                        }}
                        className="flex items-center gap-2 mt-2 pt-1"
                      >
                        <input
                          type="text"
                          value={newChecklistItemText}
                          onChange={(e) => setNewChecklistItemText(e.target.value)}
                          placeholder="Add an item"
                          className="bg-[#08101f] border border-[#253347] rounded-[3px] px-2.5 py-1.5 text-xs text-white placeholder:text-text-muted/40 focus:ring-1 focus:ring-teal/30 focus:border-teal/50 outline-none w-full max-w-sm font-semibold"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-[#00C88A] hover:bg-[#00B8A2] text-white text-xs font-bold rounded-[3px] transition flex-shrink-0"
                        >
                          Add
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* Tabs Selector: Activity vs Logged Efforts */}
                <div className="border-b border-[#253347] flex gap-4 text-xs font-bold uppercase tracking-wider mb-4">
                  <button
                    onClick={() => setActiveTab("activity")}
                    className={`pb-2 border-b-2 transition-all ${
                      activeTab === "activity" || activeTab === "updates"
                        ? "border-[#00e5c8] text-[#00e5c8]"
                        : "border-transparent text-text-muted hover:text-white"
                    }`}
                  >
                    Activity & Comments
                  </button>
                  <button
                    onClick={() => setActiveTab("efforts")}
                    className={`pb-2 border-b-2 transition-all flex items-center gap-1.5 ${
                      activeTab === "efforts"
                        ? "border-[#00e5c8] text-[#00e5c8]"
                        : "border-transparent text-text-muted hover:text-white"
                    }`}
                  >
                    <span>Logged Efforts</span>
                    {cardHours.length > 0 && (
                      <span className="bg-[#1b2b42] text-teal px-1.5 py-0.5 rounded-full text-[9px] font-black">
                        {cardHours.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Tab Content */}
                {(activeTab === "activity" || activeTab === "updates") && (
                  <div className="space-y-4 pt-1">
                    {/* Comment box */}
                    <div className="border border-[#253347] bg-[#08101f] rounded-[3px] p-3 focus-within:border-teal/50 transition-all duration-150">
                      <textarea
                        placeholder="Write a comment..."
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        className="w-full min-h-16 bg-transparent border-none outline-none text-xs text-white placeholder:text-text-muted/40 resize-none font-semibold"
                      />
                      <div className="flex justify-end items-center mt-2 pt-2 border-t border-[#253347]/50">
                        <button
                          onClick={handlePostComment}
                          className="px-3.5 py-1.5 bg-[#00C88A] hover:bg-[#00B8A2] text-white text-xs font-bold rounded-[3px] transition"
                        >
                          Comment
                        </button>
                      </div>
                    </div>

                    {/* Chronological mixed stream */}
                    <div className="space-y-3.5">
                      {getMixedActivityList(detailCard.id).length > 0 ? (
                        getMixedActivityList(detailCard.id).map((act) => {
                          if (act.type === "comment") {
                            const commInitials = act.user?.name.split(" ").map(n => n[0]).join("") || "";
                            return (
                              <div key={act.id} className="group/comment border border-[#253347]/80 bg-[#1A2B42] rounded-[3px] p-3.5 space-y-2 shadow-md relative">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 text-[9px] text-white font-black flex items-center justify-center">
                                      {commInitials}
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-white">{act.user?.name}</p>
                                      <p className="text-[10px] text-text-muted">{act.timestamp}</p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteComment(detailCard.id, act.id)}
                                    className="text-[#6b808c] hover:text-red-500 p-1 rounded transition opacity-0 group-hover/comment:opacity-100 flex-shrink-0"
                                    title="Delete comment"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                                <p className="text-sm text-white leading-relaxed font-sans whitespace-pre-line font-medium ml-1">
                                  {act.content}
                                </p>
                              </div>
                            );
                          } else {
                            return (
                              <div key={act.id} className="flex gap-3 text-xs items-start border-b border-dashed border-[#253347]/50 pb-2.5">
                                <span className="text-[8px] bg-teal/10 text-teal rounded-[2px] px-1.5 py-0.5 mt-0.5 font-bold flex-shrink-0">
                                  ACTION
                                </span>
                                <div className="flex-grow">
                                  <p className="text-white font-semibold text-xs leading-snug">{act.content}</p>
                                  <p className="text-text-muted text-[10px] mt-0.5">{act.timestamp}</p>
                                </div>
                              </div>
                            );
                          }
                        })
                      ) : (
                        <div className="text-center py-6 text-xs text-text-muted">No activity or updates yet.</div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "efforts" && (
                  <div className="space-y-6 pt-1">
                    {/* Log New Effort Form */}
                    <form onSubmit={handleSaveEffort} className="border border-[#253347] bg-[#08101f] rounded-[3px] p-4 space-y-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-teal border-b border-[#253347] pb-2">
                        Log New Effort Hours
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Hours Input */}
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted">Hours Worked</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            required
                            placeholder="e.g. 2.5"
                            value={effortHours}
                            onChange={(e) => setEffortHours(e.target.value)}
                            className="w-full bg-[#121E30] border border-[#253347] rounded-[3px] px-3 py-2 text-sm text-white outline-none focus:border-teal/50"
                          />
                        </div>

                        {/* Date Picker */}
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted">Date</label>
                          <input
                            type="date"
                            required
                            value={effortDate}
                            onChange={(e) => setEffortDate(e.target.value)}
                            onClick={(e) => {
                              try {
                                e.currentTarget.showPicker();
                              } catch (err) {}
                            }}
                            className="w-full bg-[#121E30] border border-[#253347] rounded-[3px] px-3 py-2 text-sm text-white outline-none focus:border-teal/50 cursor-pointer"
                          />
                        </div>

                        {/* Werkpakket Selection */}
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted">Werkpakket</label>
                          <select
                            required
                            value={effortWerkpakket}
                            onChange={(e) => setEffortWerkpakket(e.target.value)}
                            className="w-full bg-[#121E30] border border-[#253347] rounded-[3px] px-3 py-2 text-sm text-white outline-none focus:border-teal/50 cursor-pointer"
                          >
                            <option value="">Select WP...</option>
                            {CARD_WERKPAKKETTEN.map((wp) => (
                              <option key={wp} value={wp}>
                                {wp}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Description notes */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted">Description / Notes</label>
                        <textarea
                          placeholder="What did you work on? (Notes to show on timesheet)"
                          value={effortNotes}
                          onChange={(e) => setEffortNotes(e.target.value)}
                          className="w-full min-h-16 bg-[#121E30] border border-[#253347] rounded-[3px] p-3 text-xs text-white placeholder:text-text-muted/40 focus:border-teal/50 outline-none resize-none font-medium"
                        />
                      </div>

                      {/* Drag & Drop Proof Images Dropzone */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted">
                          Verification Proof (Screenshots)
                        </label>
                        <div 
                          className="border border-dashed border-[#253347] hover:border-teal/40 rounded-[3px] bg-[#121E30]/40 p-4 transition text-center cursor-pointer flex flex-col items-center justify-center gap-2 group"
                          onClick={() => document.getElementById("effort-proof-input-mytasks")?.click()}
                        >
                          <Camera size={20} className="text-text-muted group-hover:text-teal transition-colors" />
                          <span className="text-[11px] text-text-muted group-hover:text-white transition-colors">
                            Drag & drop or click to upload images
                          </span>
                          <input
                            type="file"
                            id="effort-proof-input-mytasks"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              setEffortImages((prev) => [...prev, ...files]);
                              const newPreviews = files.map((f) => URL.createObjectURL(f));
                              setEffortPreviews((prev) => [...prev, ...newPreviews]);
                            }}
                          />
                        </div>

                        {/* Images preview list */}
                        {effortPreviews.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {effortPreviews.map((previewUrl, index) => (
                              <div key={previewUrl} className="relative w-14 h-14 rounded border border-[#253347] overflow-hidden bg-black/40">
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveEffortImage(index)}
                                  className="absolute top-0.5 right-0.5 bg-red-600/90 text-white rounded-full p-0.5 hover:bg-red-700 transition"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Submit log */}
                      <div className="flex justify-end pt-1">
                        <button
                          type="submit"
                          disabled={isSavingEffort}
                          className="px-4 py-2 bg-[#00C88A] hover:bg-[#00B8A2] disabled:opacity-50 text-white text-xs font-bold rounded-[3px] transition flex items-center gap-1.5"
                        >
                          {isSavingEffort ? "Saving..." : "Save Logged Effort"}
                        </button>
                      </div>
                    </form>

                    {/* Log History Feed */}
                    <div className="space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-text-muted border-b border-[#253347]/50 pb-2">
                        Logged Efforts Log
                      </div>

                      {cardHoursLoading ? (
                        <div className="text-center py-4 text-xs text-text-muted">Loading efforts...</div>
                      ) : cardHours.length === 0 ? (
                        <div className="text-center py-6 text-xs text-text-muted/50 italic font-semibold">
                          No effort hours logged on this card yet.
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto planka-scrollbar pr-1">
                          {cardHours.map((log) => {
                            const initials = log.user?.name.split(" ").map((n: string) => n[0]).join("") || "";
                            return (
                              <div 
                                key={log.id} 
                                className="border border-[#253347]/80 bg-[#1A2B42] rounded-[3px] p-3 space-y-2.5 shadow-md relative"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-500 text-[9px] text-white font-black flex items-center justify-center">
                                      {initials}
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-white">
                                        {log.user?.name}
                                        <span className="text-[10px] text-teal ml-2 font-extrabold uppercase bg-teal/10 px-1.5 py-0.5 rounded">
                                          {log.werkpakket}
                                        </span>
                                      </p>
                                      <p className="text-[10px] text-text-muted mt-0.5">
                                        Worked on {new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(log.date))}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2.5">
                                    <span className="bg-[#00e5c8]/10 border border-[#00e5c8]/20 text-[#00e5c8] px-2 py-0.5 rounded-full text-xs font-black">
                                      {log.hours.toFixed(log.hours % 1 === 0 ? 0 : 1)}h
                                    </span>
                                    {log.userId === user?.id && (
                                      <button
                                        onClick={() => handleDeleteEffort(log.id, log.hours)}
                                        className="text-[#6b808c] hover:text-red-500 p-1 rounded transition"
                                        title="Delete effort log"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {log.notes && (
                                  <p className="text-xs text-white bg-[#0B1220]/40 border border-[#253347]/30 p-2 rounded whitespace-pre-wrap leading-relaxed">
                                    {log.notes}
                                  </p>
                                )}

                                {/* Proof images attachments */}
                                {log.attachments && log.attachments.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {log.attachments.map((att: any) => renderEffortProofThumbnail(att.url))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* Right Column Action Sidebar (30%) */}
              <div className="md:w-1/3 space-y-3">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">Actions</span>
                <div className="flex flex-col gap-2 text-left">
                  
                  {/* Join / Members */}
                  <div className="relative assignee-dropdown-container">
                    <button
                      onClick={() => setShowAssigneeDropdown(showAssigneeDropdown === detailCard.id ? null : detailCard.id)}
                      className="w-full py-2 px-3 rounded-[3px] bg-[#1A2B42] hover:bg-[#253347] border border-[#253347]/50 shadow-[0_1px_0_rgba(9,30,66,0.13)] text-xs font-semibold text-white transition-all text-left flex items-center gap-2"
                    >
                      <UserIcon size={14} className="text-teal" />
                      <span>Members</span>
                    </button>
                  </div>

                  {/* Labels */}
                  <div className="relative">
                    <button
                      onClick={() => setShowLabelsDropdown(showLabelsDropdown === detailCard.id ? null : detailCard.id)}
                      className="w-full py-2 px-3 rounded-[3px] bg-[#1A2B42] hover:bg-[#253347] border border-[#253347]/50 shadow-[0_1px_0_rgba(9,30,66,0.13)] text-xs font-semibold text-white transition-all text-left flex items-center gap-2"
                    >
                      <Tag size={14} className="text-teal" />
                      <span>Labels</span>
                    </button>
                  </div>

                  {/* Project Selector */}
                  <div className="relative project-dropdown-container">
                    <button
                      onClick={() => setShowProjectDropdown(showProjectDropdown === detailCard.id ? null : detailCard.id)}
                      className="w-full py-2 px-3 rounded-[3px] bg-[#1A2B42] hover:bg-[#253347] border border-[#253347]/50 shadow-[0_1px_0_rgba(9,30,66,0.13)] text-xs font-semibold text-white transition-all text-left flex items-center gap-2"
                    >
                      <Folder size={14} className="text-teal" />
                      <span>Project</span>
                    </button>
                  </div>

                  {/* Checklist */}
                  <button
                    onClick={() => handleAddChecklist(detailCard.id)}
                    className="w-full py-2 px-3 rounded-[3px] bg-[#1A2B42] hover:bg-[#253347] border border-[#253347]/50 shadow-[0_1px_0_rgba(9,30,66,0.13)] text-xs font-semibold text-white transition-all text-left flex items-center gap-2"
                  >
                    <CheckSquare size={14} className="text-teal" />
                    <span>Checklist</span>
                  </button>

                  {/* Due Date */}
                  <div className="relative date-picker-container">
                    <button
                      onClick={() => setShowDatePicker(showDatePicker === detailCard.id ? null : detailCard.id)}
                      className="w-full py-2 px-3 rounded-[3px] bg-[#1A2B42] hover:bg-[#253347] border border-[#253347]/50 shadow-[0_1px_0_rgba(9,30,66,0.13)] text-xs font-semibold text-white transition-all text-left flex items-center gap-2"
                    >
                      <Calendar size={14} className="text-teal" />
                      <span>Due Date</span>
                    </button>
                    {showDatePicker === detailCard.id && (
                      <div className="absolute right-0 mt-1 z-40 bg-[#121E30] border border-[#253347] rounded-[3px] p-3 shadow-xl flex flex-col gap-2 w-48 text-left">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Select Due Date</span>
                        <input
                          type="date"
                          value={detailCard.dueDate || ""}
                          onChange={(e) => {
                            handleUpdateCardDueDate(detailCard.id, e.target.value);
                          }}
                          onClick={(e) => {
                            try {
                              e.currentTarget.showPicker();
                            } catch (err) {}
                          }}
                          className="bg-[#0B1220] border border-[#253347] rounded-[3px] px-2 py-1 text-xs text-white outline-none focus:border-teal/50 w-full cursor-pointer"
                        />
                        <div className="flex justify-end gap-1.5 mt-1">
                          {detailCard.dueDate && (
                            <button
                              type="button"
                              onClick={() => {
                                handleUpdateCardDueDate(detailCard.id, "");
                                setShowDatePicker(null);
                              }}
                              className="px-2 py-1 text-[10px] font-extrabold uppercase text-red-400 hover:bg-red-500/10 rounded-[3px] transition"
                            >
                              Clear
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowDatePicker(null)}
                            className="bg-teal hover:bg-teal-deep text-navy px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-[3px] transition font-bold"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Log Time */}
                  <button
                    onClick={() => setActiveTab("efforts")}
                    className="w-full py-2 px-3 rounded-[3px] bg-[#1A2B42] hover:bg-[#253347] border border-[#253347]/50 shadow-[0_1px_0_rgba(9,30,66,0.13)] text-xs font-semibold text-white transition-all text-left flex items-center gap-2"
                  >
                    <Clock size={14} className="text-teal" />
                    <span>Log Time</span>
                  </button>

                  {/* Delete Card */}
                  <button
                    onClick={() => {
                      handleDeleteCard(detailCard.id);
                    }}
                    className="w-full py-2 px-3 rounded-[3px] border border-red-500/30 bg-red-950/20 hover:bg-red-950/40 text-xs font-semibold text-red-400 hover:text-red-300 transition-all text-left flex items-center gap-2"
                  >
                    <Trash2 size={12} className="text-red-400" />
                    <span>Delete Card</span>
                  </button>

                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TRL Roadmap Details Slide-over Panel */}
      {showTrlDetailsPanel !== null && (
        <div 
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs select-none"
          onClick={() => setShowTrlDetailsPanel(null)}
        >
          <div 
            className="w-full max-w-lg bg-[#121E30] border-l border-[#253347] h-full shadow-2xl flex flex-col animate-slide-in-right text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#253347]">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Target size={18} className="text-[#00e5c8]" />
                  {showTrlDetailsPanel === 99 ? (
                    <span>All TRL Roadmap Tasks</span>
                  ) : (
                    <span>TRL Level {showTrlDetailsPanel} Details</span>
                  )}
                </h3>
                <p className="text-[10px] text-text-muted mt-0.5 font-bold uppercase tracking-wider">
                  {projectsList.find((p: any) => p.id === selectedTrlProjectId)?.name || "Project"} • {showTrlDetailsPanel === 99 ? "Project progression overview" : getTrlLevelName(showTrlDetailsPanel)}
                </p>
              </div>
              <button 
                onClick={() => setShowTrlDetailsPanel(null)}
                className="p-1 rounded-[3px] text-text-muted hover:text-white hover:bg-white/5 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Task Creator Form */}
            {showTrlDetailsPanel !== null && showTrlDetailsPanel !== 99 && (
              <div className="px-6 py-3 border-b border-[#253347] bg-[#1A2B42]/20">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const title = trlDrawerTaskTitle.trim();
                    if (title) {
                      handleCreateTrlCard(showTrlDetailsPanel, title);
                      setTrlDrawerTaskTitle("");
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={trlDrawerTaskTitle}
                    onChange={(e) => setTrlDrawerTaskTitle(e.target.value)}
                    placeholder={`Create task aligned to TRL ${showTrlDetailsPanel}...`}
                    className="flex-grow bg-[#0B1220] border border-[#253347] rounded-[3px] px-3 py-1.5 text-xs text-white placeholder:text-text-muted/50 outline-none focus:border-teal/50 transition"
                  />
                  <button
                    type="submit"
                    className="bg-teal hover:bg-teal-deep text-navy font-extrabold text-[11px] px-4 rounded-[3px] transition uppercase tracking-wider whitespace-nowrap"
                  >
                    + Add Task
                  </button>
                </form>
              </div>
            )}

            {/* Content List */}
            <div className="flex-grow overflow-y-auto planka-scrollbar p-6 space-y-4">
              {(() => {
                const projectCards = selectedTrlProjectId === "all"
                  ? projectBoards.flatMap(board => board.columns.flatMap(col => col.cards.map((c: any) => {
                      let normalizedColId = "column-todo";
                      const titleLower = (col.title || "").toLowerCase();
                      if (titleLower.includes("progress")) normalizedColId = "column-progress";
                      else if (titleLower.includes("review")) normalizedColId = "column-review";
                      else if (titleLower.includes("completed") || titleLower.includes("done")) normalizedColId = "column-done";
                      return {
                        ...c,
                        columnId: normalizedColId,
                        projectId: board.projectId
                      };
                    })))
                  : (projectBoards.find(b => b.projectId === selectedTrlProjectId)?.columns.flatMap(col => col.cards.map((c: any) => {
                      let normalizedColId = "column-todo";
                      const titleLower = (col.title || "").toLowerCase();
                      if (titleLower.includes("progress")) normalizedColId = "column-progress";
                      else if (titleLower.includes("review")) normalizedColId = "column-review";
                      else if (titleLower.includes("completed") || titleLower.includes("done")) normalizedColId = "column-done";
                      return {
                        ...c,
                        columnId: normalizedColId,
                        projectId: selectedTrlProjectId
                      };
                    })) || []);

                const filteredCards = projectCards.filter((c: any) => {
                  if (c.trlLevel === undefined || c.trlLevel === null) return false;
                  if (showTrlDetailsPanel === 99) return true;
                  return c.trlLevel === showTrlDetailsPanel;
                }).sort((a: any, b: any) => (a.trlLevel || 0) - (b.trlLevel || 0));

                if (filteredCards.length === 0) {
                  return (
                    <div className="text-center py-12 text-sm text-text-muted">
                      No tasks aligned to this TRL phase.
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {filteredCards.map((card: any) => {
                      const isCompleted = card.columnId === "column-done";
                      return (
                        <div 
                          key={card.id}
                          onClick={() => {
                             setLargeDetailCardId(card.id);
                             setShowTrlDetailsPanel(null);
                          }}
                          className="group bg-[#1A2B42] hover:bg-[#1A2B42]/80 border border-[#253347]/80 hover:border-teal/30 p-3 rounded-[3px] transition duration-150 cursor-pointer flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleCardCompletion(card.id);
                              }}
                              className={`flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full border cursor-pointer hover:border-teal transition ${isCompleted ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-[#253347] bg-[#08101f] text-text-muted'}`}
                            >
                              {isCompleted ? <Check size={12} className="text-emerald-400" /> : ""}
                            </span>
                            <div className="min-w-0">
                              <span className={`text-xs font-bold block ${isCompleted ? 'text-white/60 line-through' : 'text-white'}`}>
                                {card.title}
                              </span>
                              <span className="text-[9px] text-text-muted font-semibold">
                                TRL {card.trlLevel} • {columns.find(col => col.id === card.columnId)?.title || card.columnId} • {card.assignees && card.assignees.length > 0 ? card.assignees.map((a: any) => a.name).join(", ") : (usersList.find((u: any) => u.id === card.assigneeId)?.name || 'Unassigned')}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded-[3px] text-[8px] font-extrabold tracking-wide ${getPriorityStyle(card.priority)}`}>
                              {formatPriority(card.priority)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* TRL Level Upgrade Celebration Modal */}
      {showTrlUpgradeToast && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md select-none p-4">
          <div className="relative max-w-md w-full bg-[#121E30] border border-teal/40 rounded-[3px] p-6 shadow-2xl text-center space-y-5 animate-scale-up text-white">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-teal/30 rounded-full blur-xl animate-pulse" />
                <div className="relative bg-gradient-to-tr from-teal to-emerald-400 p-4 rounded-full text-white shadow-lg">
                  <Award size={40} className="animate-bounce" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-white tracking-wide">TRL Level Promoted!</h2>
              <p className="text-xs text-text-muted uppercase tracking-wider font-bold">{showTrlUpgradeToast.projectName}</p>
            </div>

            <div className="py-3 px-4 bg-[#08101f] border border-[#253347] rounded-[3px] space-y-1">
              <span className="text-xs font-bold text-teal">CURRENT READINESS:</span>
              <h3 className="text-lg font-black text-white">TRL {showTrlUpgradeToast.newLevel}</h3>
              <p className="text-xs text-emerald-400 font-semibold">{getTrlLevelName(showTrlUpgradeToast.newLevel)}</p>
            </div>

            <p className="text-xs text-white/70 leading-relaxed font-medium">
              Congratulations! All verification tasks assigned to TRL {showTrlUpgradeToast.newLevel} and lower have been successfully checked and validated.
            </p>

            <button
              onClick={() => setShowTrlUpgradeToast(null)}
              className="w-full py-2 px-4 rounded-[3px] bg-gradient-to-r from-teal to-[#00B8A2] hover:opacity-90 text-white font-extrabold text-xs uppercase tracking-wider shadow transition-all duration-150"
            >
              Continue Work
            </button>
          </div>
        </div>
      )}
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
      <style>{`
        @keyframes fadeInSlow {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in-slow {
          animation: fadeInSlow 1.5s ease-out forwards;
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.2s ease-out forwards;
        }
        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-up {
          animation: scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        /* Custom scrollbar matching Planka's scrollbar */
        .planka-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .planka-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .planka-scrollbar::-webkit-scrollbar-thumb {
          background: #c3cbd0;
          border-radius: 4px;
        }
        .planka-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a5b2bd;
        }
      `}</style>
    </div>
  );
}

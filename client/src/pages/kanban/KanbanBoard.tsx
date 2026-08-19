import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { EmptyState } from "../../components/ui/EmptyState";
import { apiRequest } from "../../services/apiClient";
import { useAuth } from "../../context/AuthContext";
import { Plus, Trash2, X, ChevronLeft, AlertCircle, MessageSquare, CheckSquare, MoreHorizontal, Paperclip, CheckCircle2, Clock, PlayCircle, ArrowRightCircle, RefreshCw, AlignLeft, Activity, Target, Award, AlertTriangle, Calendar, Tag, Folder, FolderKanban, User as UserIcon, Users, Check, ChevronDown, Camera, Image as ImageIcon } from "lucide-react";
import type { KanbanCard, KanbanColumn, Priority, User } from "../../types";
import Ferrofluid from "../../components/effects/Ferrofluid";
import { SkeletonLoader } from "../../components/ui/SkeletonLoader";

export function KanbanBoard() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [columnsList, setColumnsList] = useState<any[]>([]);
  const [cards, setCards] = useState<(KanbanCard & { columnTitle?: string })[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBoardData = async () => {
    try {
      const [projData, boardData, usersData, allProjsData] = await Promise.all([
        apiRequest<{ project: any }>(`/projects/${id}`),
        apiRequest<{ columns: any[] }>(`/projects/${id}/kanban`),
        apiRequest<{ users: any[] }>("/users"),
        apiRequest<{ projects: any[] }>("/projects")
      ]);
      setProject(projData.project);
      setColumnsList(boardData.columns);
      setCards(boardData.columns.flatMap((col: any) => col.cards.map((c: any) => ({ ...c, columnTitle: col.title }))));
      setUsersList(usersData.users);
      setProjectsList(allProjsData.projects);
    } catch (err) {
      console.error("Failed to load Kanban board data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchBoardData();
    }
  }, [id]);

  const columns = columnsList;
  const users = usersList;
  const currentUser = user;

  const [activeView, setActiveView] = useState<"kanban" | "gantt">("kanban");

  // Modal Control States
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);

  // Form States
  const [targetColumnId, setTargetColumnId] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("MEDIUM");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");

  // Drag and Drop active column target
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  // Planka / Monday.com additions
  const [inlineTaskTitles, setInlineTaskTitles] = useState<Record<string, string>>({});
  const [quickEditCardId, setQuickEditCardId] = useState<string | null>(null);
  const [largeDetailCardId, setLargeDetailCardId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"updates" | "activity" | "efforts">("updates");
  const [cardHours, setCardHours] = useState<any[]>([]);
  const [cardHoursLoading, setCardHoursLoading] = useState(false);
  const [effortHours, setEffortHours] = useState<string>("");
  const [effortDate, setEffortDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [effortNotes, setEffortNotes] = useState<string>("");
  const [effortWerkpakket, setEffortWerkpakket] = useState<string>("");
  const [effortImages, setEffortImages] = useState<File[]>([]);
  const [effortPreviews, setEffortPreviews] = useState<string[]>([]);
  const [isSavingEffort, setIsSavingEffort] = useState(false);
  const [effortStartTime, setEffortStartTime] = useState<string>("");
  const [effortEndTime, setEffortEndTime] = useState<string>("");

  useEffect(() => {
    if (effortStartTime && effortEndTime) {
      const [sh, sm] = effortStartTime.split(":").map(Number);
      const [eh, em] = effortEndTime.split(":").map(Number);
      let diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
      if (diffMinutes < 0) {
        diffMinutes += 24 * 60;
      }
      const calculatedHours = diffMinutes / 60;
      const roundedHours = Math.round(calculatedHours * 4) / 4;
      setEffortHours(roundedHours > 0 ? roundedHours.toString() : "");
    }
  }, [effortStartTime, effortEndTime]);

  const CARD_WERKPAKKETTEN = [
    "1 - Inventarisatie en projectsturing",
    "2 - Conceptontwikkeling en detailontwerp",
    "3 - Prototype realisatie en testen",
    "4 - Validering en integratie",
    "5 - Projectmanagement en eindrapportering"
  ];

  // Completion attachment states
  const [pendingCompletion, setPendingCompletion] = useState<{
    cardId: string;
    columnId: string;
    isToggle: boolean;
  } | null>(null);
  const [completionImage, setCompletionImage] = useState<File | null>(null);
  const [completionImagePreview, setCompletionImagePreview] = useState<string>("");
  const [isUploadingCompletion, setIsUploadingCompletion] = useState(false);

  // Active attachment lightbox state
  const [activeAttachmentUrl, setActiveAttachmentUrl] = useState<string | null>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const fetchCardHours = async (cardId: string) => {
    if (!cardId) return;
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
    if (!largeDetailCardId || !project) return;
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
        projectId: project.id,
        cardId: largeDetailCardId,
        date: effortDate,
        hours: hoursNum,
        notes: effortNotes,
        werkpakket: effortWerkpakket,
        imageUrls: uploadedUrls,
        startTime: effortStartTime || undefined,
        endTime: effortEndTime || undefined
      };

      await apiRequest("/hours", {
        method: "POST",
        body: JSON.stringify(bodyPayload)
      });

      triggerToast("Effort hours logged successfully!", "success");

      // Update local card hours
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

      // Refresh list and board data
      fetchBoardData();
      fetchCardHours(largeDetailCardId);

      // Reset form
      setEffortHours("");
      setEffortDate(new Date().toISOString().split("T")[0]);
      setEffortNotes("");
      setEffortWerkpakket("");
      setEffortImages([]);
      setEffortPreviews([]);
      setEffortStartTime("");
      setEffortEndTime("");
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

      // Refresh list & board data
      fetchBoardData();
      fetchCardHours(largeDetailCardId);
    } catch (err) {
      console.error("Failed to delete effort log:", err);
      triggerToast("Failed to delete effort log.", "error");
    }
  };

  const handleRemoveEffortImage = (index: number) => {
    setEffortImages(prev => prev.filter((_, i) => i !== index));
    setEffortPreviews(prev => {
      const url = prev[index];
      if (url.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleEffortFilesChange = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    setEffortImages(prev => [...prev, ...newFiles]);
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    setEffortPreviews(prev => [...prev, ...newPreviews]);
  };

  const renderEffortProofThumbnail = (attachment: any) => {
    const isImage = attachment.mimeType?.startsWith("image/") || attachment.url.match(/\.(jpeg|jpg|gif|png)$/i);
    if (!isImage) {
      return (
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-2 rounded bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-xs text-white/80"
          onClick={e => e.stopPropagation()}
        >
          <Paperclip size={14} className="text-teal-400" />
          <span className="truncate max-w-[150px]">{attachment.name}</span>
        </a>
      );
    }

    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          setActiveAttachmentUrl(attachment.url);
        }}
        className="group relative w-16 h-16 rounded overflow-hidden border border-white/10 hover:border-teal-400 cursor-pointer transition-all duration-200"
      >
        <img
          src={attachment.url}
          alt={attachment.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <Camera size={16} className="text-white" />
        </div>
      </div>
    );
  };

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

  // Popover / Modal toggle states
  const [showStatusDropdown, setShowStatusDropdown] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState<string | null>(null);
  const [showLabelsDropdown, setShowLabelsDropdown] = useState<string | null>(null);
  const [showTrlDropdown, setShowTrlDropdown] = useState<string | null>(null);
  const [showTrlDetailsPanel, setShowTrlDetailsPanel] = useState<number | null>(null);
  const [trlDrawerOpen, setTrlDrawerOpen] = useState(false);
  const [trlDrawerCardId, setTrlDrawerCardId] = useState("");
  const [trlDrawerCardTitle, setTrlDrawerCardTitle] = useState("");
  const [trlDrawerTaskTitle, setTrlDrawerTaskTitle] = useState("");
  const [trlUpdateTrigger, setTrlUpdateTrigger] = useState(0);
  const [showTrlUpgradeToast, setShowTrlUpgradeToast] = useState<{ projectName: string; newLevel: number } | null>(null);
  const [showProjectDropdownHeader, setShowProjectDropdownHeader] = useState(false);

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

  // Planka metadata states
  const [cardDescriptions, setCardDescriptions] = useState<Record<string, string>>({});
  const [cardChecklists, setCardChecklists] = useState<Record<string, { id: string; text: string; done: boolean }[]>>({});
  const [cardLabels, setCardLabels] = useState<Record<string, string[]>>({});

  // Comments and Activity Logs mapping
  const [taskComments, setTaskComments] = useState<Record<string, { id: string; userName: string; userRole: string; content: string; timestamp: string }[]>>(() => {
    try {
      const saved = localStorage.getItem("kapetein_task_comments");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem("kapetein_task_comments", JSON.stringify(taskComments));
  }, [taskComments]);

  const [taskActivityLog, setTaskActivityLog] = useState<Record<string, { id: string; action: string; timestamp: string }[]>>(() => {
    try {
      const saved = localStorage.getItem("kapetein_task_activity_log");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem("kapetein_task_activity_log", JSON.stringify(taskActivityLog));
  }, [taskActivityLog]);

  const [newCommentText, setNewCommentText] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [newChecklistItemText, setNewChecklistItemText] = useState("");

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

  // Check if any TRL tasks at or below current level are incomplete
  const getTrlWarning = () => {
    if (!project) return null;
    const incompleteTasks = cards.filter(c => c.trlLevel !== undefined && c.trlLevel <= project.currentTRL && !c.columnId.toLowerCase().includes("done") && !c.columnId.toLowerCase().includes("completed"));
    if (incompleteTasks.length > 0) {
      const levels = Array.from(new Set(incompleteTasks.map(t => t.trlLevel)));
      return `TRL Level ${levels.join(", ")} incomplete - reopened tasks detected!`;
    }
    return null;
  };

  const getTrlProgressStats = (lvl: number) => {
    const levelTasks = cards.filter(c => c.trlLevel === lvl);
    const total = levelTasks.length;
    const completed = levelTasks.filter(c => c.columnId.toLowerCase().includes("done") || c.columnId.toLowerCase().includes("completed")).length;
    return { total, completed };
  };

  // Effect to handle automatic TRL progression on task completion changes
  useEffect(() => {
    if (!project) return;
    
    // Group all cards of this project by TRL Level
    const trlTasks = cards.filter(c => c.trlLevel !== undefined && c.trlLevel !== null);
    if (trlTasks.length === 0) return;
    
    // Check TRL progression levels 1 to 9
    let highestCompletedLevel = project.currentTRL;
    
    for (let lvl = 1; lvl <= 9; lvl++) {
      const levelTasks = trlTasks.filter(c => c.trlLevel === lvl);
      if (levelTasks.length > 0) {
        const allCompleted = levelTasks.every(c => {
          const colTitle = (c.columnTitle || "").toLowerCase();
          return colTitle.includes("complete") || colTitle.includes("done");
        });
        if (allCompleted) {
          highestCompletedLevel = lvl;
        } else {
          // Progression must be sequential. If a level is incomplete, we block higher levels.
          break;
        }
      }
    }
    
    if (highestCompletedLevel > project.currentTRL) {
      const newLvl = highestCompletedLevel;
      // Automatic upgrade!
      apiRequest(`/projects/${project.id}/trl`, {
        method: "POST",
        body: JSON.stringify({
          trlLevel: newLvl,
          justification: `Automatically promoted because all tasks for TRL ${newLvl} were completed.`
        })
      })
        .then(() => {
          setProject((prev: any) => prev ? { ...prev, currentTRL: newLvl } : null);
          setShowTrlUpgradeToast({
            projectName: project.name,
            newLevel: newLvl
          });
        })
        .catch(err => console.error("Failed to automatically upgrade TRL:", err));
    }
  }, [cards, project?.id, trlUpdateTrigger]);

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

  const handleUpdateCardTrl = async (cardId: string, trlLevel: number | undefined) => {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, trlLevel } : c))
    );
    try {
      await apiRequest(`/kanban/cards/${cardId}`, {
        method: "PUT",
        body: JSON.stringify({ trlLevel: trlLevel || null })
      });
      setTrlUpdateTrigger((prev) => prev + 1);
    } catch (err) {
      console.error("Failed to update card TRL:", err);
    }
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
    const cat = getCardCategory(card).label;
    defaults.push(cat);
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

  const renderCommentContent = (content: string) => {
    const parts = content.split(/(!\[.*?\]\(.*?\))/g);
    return parts.map((part, index) => {
      const match = part.match(/!\[(.*?)\]\((.*?)\)/);
      if (match) {
        const alt = match[1];
        const url = match[2];
        return (
          <div key={index} className="mt-2 max-w-full rounded overflow-hidden border border-[#253347] bg-black/20 p-1 flex justify-start">
            <img
              src={url}
              alt={alt}
              className="max-h-60 max-w-full object-contain cursor-pointer hover:opacity-90 transition rounded-[3px]"
              onClick={() => setActiveAttachmentUrl(url)}
            />
          </div>
        );
      }
      return <span key={index} className="whitespace-pre-line">{part}</span>;
    });
  };

  const handleUpdateCardDueDate = async (cardId: string, dueDate: string) => {
    try {
      await apiRequest(`/kanban/cards/${cardId}`, {
        method: "PUT",
        body: JSON.stringify({ dueDate: dueDate || null })
      });
      fetchBoardData();
    } catch (err) {
      console.error("Failed to update card due date:", err);
    }
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
      fetchBoardData();
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
      fetchBoardData();
    } catch (err) {
      console.error("Failed to update card assignees:", err);
      triggerToast("Failed to update task assignees.", "error");
    }
  };

  const handleCreateInlineCard = async (columnId: string) => {
    if (!project) return;
    const title = inlineTaskTitles[columnId]?.trim();
    if (!title) return;

    try {
      await apiRequest(`/projects/${project.id}/kanban/cards`, {
        method: "POST",
        body: JSON.stringify({
          columnId: columnId,
          title,
          priority: "MEDIUM",
          order: cards.filter(c => c.columnId === columnId).length + 1
        })
      });

      setInlineTaskTitles((prev) => ({ ...prev, [columnId]: "" }));
      fetchBoardData();
    } catch (err) {
      console.error("Failed to create inline card:", err);
    }
  };

  const handleCreateTrlCard = async (trlLevel: number, title: string) => {
    if (!project) return;
    const firstCol = columnsList[0];
    if (!firstCol) return;

    try {
      await apiRequest(`/projects/${project.id}/kanban/cards`, {
        method: "POST",
        body: JSON.stringify({
          columnId: firstCol.id,
          title,
          priority: "MEDIUM",
          trlLevel,
          order: 1
        })
      });

      setTrlUpdateTrigger((prev) => prev + 1);
      fetchBoardData();
    } catch (err) {
      console.error("Failed to create TRL card:", err);
    }
  };


  const executeCardCompletion = async (cardId: string, destColumnId: string, imageFile: File | null) => {
    setIsUploadingCompletion(true);
    if (imageFile) {
      try {
        const base64Content = await fileToBase64(imageFile);
        await apiRequest<{ url: string }>("/upload", {
          method: "POST",
          body: JSON.stringify({
            filename: imageFile.name,
            content: base64Content,
            cardId: cardId
          })
        });
      } catch (err) {
        console.error("Failed to upload completion image:", err);
        alert("Failed to upload completion image. Task status will still be updated.");
      }
    }

    try {
      await apiRequest(`/kanban/cards/${cardId}`, {
        method: "PUT",
        body: JSON.stringify({ columnId: destColumnId })
      });
      fetchBoardData();
    } catch (err) {
      console.error("Failed to complete task card:", err);
    } finally {
      setIsUploadingCompletion(false);
      setPendingCompletion(null);
      setCompletionImage(null);
      setCompletionImagePreview("");
    }
  };

  const handleToggleCardCompletion = async (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    const isCurrentlyDone = (card.columnTitle || "").toLowerCase().includes("completed") || (card.columnTitle || "").toLowerCase().includes("done");
    const todoCol = columnsList.find(col => col.title.toLowerCase().includes("to do") || col.title.toLowerCase().includes("todo"));
    const doneCol = columnsList.find(col => col.title.toLowerCase().includes("completed") || col.title.toLowerCase().includes("done"));
    const targetCol = isCurrentlyDone ? todoCol : doneCol;
    if (!targetCol) return;

    if (!isCurrentlyDone) {
      // Intercept and open prompt for completion screenshot
      setPendingCompletion({ cardId, columnId: targetCol.id, isToggle: true });
    } else {
      try {
        await apiRequest(`/kanban/cards/${cardId}`, {
          method: "PUT",
          body: JSON.stringify({ columnId: targetCol.id })
        });
        fetchBoardData();
      } catch (err) {
        console.error("Failed to toggle card completion:", err);
      }
    }
  };

  const handlePostComment = () => {
    if (!newCommentText.trim() || !largeDetailCardId) return;

    const newComment = {
      id: `comm-${Date.now()}`,
      userName: currentUser.name,
      userRole: currentUser.role,
      content: newCommentText.trim(),
      timestamp: getTimestamp(),
    };

    setTaskComments((prev) => ({
      ...prev,
      [largeDetailCardId]: [...(prev[largeDetailCardId] || []), newComment],
    }));

    const newLog = {
      id: `log-${Date.now()}`,
      action: `Added an update/comment: "${newCommentText.trim()}"`,
      timestamp: getTimestamp(),
    };
    setTaskActivityLog((prev) => ({
      ...prev,
      [largeDetailCardId]: [newLog, ...(prev[largeDetailCardId] || [])],
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
      if (showAssigneeDropdown && !target.closest(".assignee-dropdown-container")) {
        setShowAssigneeDropdown(null);
      }

      if (quickEditCardId && !target.closest(".quick-edit-popover")) {
        setQuickEditCardId(null);
        setShowStatusDropdown(null);
        setShowDatePicker(null);
        setShowAssigneeDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [quickEditCardId, showStatusDropdown, showDatePicker, showAssigneeDropdown]);

  // Lock scroll when modals are open
  useEffect(() => {
    if (isAddTaskOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isAddTaskOpen]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1220] p-6 lg:pl-28">
        <SkeletonLoader variant="kanban" />
      </div>
    );
  }

  if (!project) {
    return <EmptyState title="Project Board not found" message="The requested project is not available in the database." />;
  }

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

  // Helper to assign a dynamic category badge matching the mockup style
  const getCardCategory = (card: KanbanCard) => {
    const t = card.title.toLowerCase();
    if (t.includes("figma") || t.includes("design") || t.includes("ux") || t.includes("page")) {
      return { label: "UI Design", style: "bg-purple-500/15 text-purple-300 border-purple-500/20" };
    }
    if (t.includes("api") || t.includes("backend") || t.includes("server") || t.includes("db") || t.includes("storage")) {
      return { label: "Backend", style: "bg-yellow-500/15 text-yellow-300 border-yellow-500/20" };
    }
    if (t.includes("test") || t.includes("qa") || t.includes("verify") || t.includes("check")) {
      return { label: "QA", style: "bg-cyan-500/15 text-cyan-300 border-cyan-500/20" };
    }
    if (t.includes("fix") || t.includes("issue") || t.includes("bug")) {
      return { label: "Bug", style: "bg-rose-500/15 text-rose-300 border-rose-500/20" };
    }
    if (t.includes("doc") || t.includes("guide") || t.includes("onboard")) {
      return { label: "Documentation", style: "bg-orange-500/15 text-orange-300 border-orange-500/20" };
    }
    return { label: "Frontend", style: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20" };
  };

  // Helper to determine simulated progress percentage & info
  const getCardProgress = (card: KanbanCard) => {
    if (card.columnId === "column-done" || card.columnId === "Done" || card.columnId.toLowerCase().includes("done") || card.columnId.toLowerCase().includes("completed")) {
      return { percent: 100, label: "Done", iconColor: "text-emerald-400" };
    }
    // Stable hash based on card title
    const hash = card.title.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0);
    if (card.columnId === "column-review" || card.columnId === "In Review" || card.columnId.toLowerCase().includes("review")) {
      const percent = 55 + (hash % 30); // 55% to 85%
      return { percent, label: "Progress", iconColor: "text-blue-400" };
    }
    // In Progress
    const percent = 15 + (hash % 40); // 15% to 55%
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


  // CRUD handlers
  const handleDeleteCard = async (cardId: string) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      try {
        await apiRequest(`/kanban/cards/${cardId}`, {
          method: "DELETE"
        });
        setLargeDetailCardId(null);
        fetchBoardData();
      } catch (err) {
        console.error("Failed to delete card:", err);
      }
    }
  };

  const handleAddTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !targetColumnId || !project) return;

    try {
      await apiRequest(`/projects/${project.id}/kanban/cards`, {
        method: "POST",
        body: JSON.stringify({
          columnId: targetColumnId,
          title: newTaskTitle.trim(),
          description: newTaskDesc.trim() || null,
          assigneeId: newTaskAssignee || null,
          assigneeIds: newTaskAssignee ? [newTaskAssignee] : [],
          dueDate: newTaskDueDate || null,
          priority: newTaskPriority,
          order: cards.filter(c => c.columnId === targetColumnId).length + 1
        })
      });

      setNewTaskTitle("");
      setNewTaskDesc("");
      setNewTaskPriority("MEDIUM");
      setNewTaskAssignee("");
      setNewTaskDueDate("");
      setIsAddTaskOpen(false);

      fetchBoardData();
    } catch (err) {
      console.error("Failed to add task card:", err);
    }
  };

  const handleMoveCard = async (cardId: string, destColumnId: string) => {
    const originalCards = [...cards];
    const destCol = columns.find(c => c.id === destColumnId);
    const destColTitle = destCol ? destCol.title : "";
    
    // Check if we are moving to a done column
    const isMovingToDone = destColTitle.toLowerCase().includes("completed") || destColTitle.toLowerCase().includes("done") || destColumnId === "column-done";
    const oldCard = cards.find(c => c.id === cardId);
    const wasAlreadyDone = oldCard ? (oldCard.columnTitle || "").toLowerCase().includes("completed") || (oldCard.columnTitle || "").toLowerCase().includes("done") || oldCard.columnId === "column-done" : false;

    if (isMovingToDone && !wasAlreadyDone) {
      // Intercept drag and drop to Done
      setPendingCompletion({ cardId, columnId: destColumnId, isToggle: false });
      return;
    }

    // Optimistic update of local state for instant responsiveness
    setCards(prevCards => prevCards.map(c => 
      c.id === cardId ? { ...c, columnId: destColumnId, columnTitle: destColTitle } : c
    ));

    try {
      await apiRequest(`/kanban/cards/${cardId}`, {
        method: "PUT",
        body: JSON.stringify({ columnId: destColumnId })
      });
      fetchBoardData();
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
    e.preventDefault(); // Allows drop
  };

  const handleDragEnter = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumnId(columnId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData("text/plain");
    if (cardId) {
      handleMoveCard(cardId, targetColumnId);
    }
    setDragOverColumnId(null);
  };
  const getColumnColorBar = (colId: string) => {
    if (colId.toLowerCase().includes("todo")) return "bg-neutral-500";
    if (colId.toLowerCase().includes("progress")) return "bg-blue-400";
    if (colId.toLowerCase().includes("review")) return "bg-amber-400";
    return "bg-emerald-400";
  };

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

      {/* Title/Back Bar and Switcher (Toolbar) */}
      <div className="relative z-30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 lg:px-28 py-3 bg-black/15 border-b border-dashed border-white/10 flex-shrink-0 select-none board-header-panel">
        <div>
          <Link
            to={`/projects/${project.id}`}
            className="group inline-flex items-center gap-1 text-xs font-bold text-white/80 hover:text-white transition-colors mb-1"
          >
            <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Project Details
          </Link>
          <div className="relative mt-0.5">
            <button
              onClick={() => setShowProjectDropdownHeader(!showProjectDropdownHeader)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-[3px] bg-[#121E30] hover:bg-[#1A2B42] border border-[#253347] text-xs font-black uppercase tracking-wider text-white transition-all shadow-md"
            >
              <FolderKanban size={13} className="text-teal animate-pulse-slow" />
              <span>PROJECT: {project.name.toUpperCase()}</span>
              <ChevronDown size={11} className="text-text-muted" />
            </button>
            {showProjectDropdownHeader && (
              <div className="absolute left-0 mt-1.5 z-40 bg-[#121E30] border border-[#253347] rounded-[3px] shadow-2xl py-1 w-64 max-h-60 overflow-y-auto planka-scrollbar">
                {projectsList.map((p: any) => (
                  <Link
                    key={p.id}
                    to={`/projects/${p.id}/kanban`}
                    onClick={() => {
                      setShowProjectDropdownHeader(false);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-white/5 text-xs font-bold transition-all text-white flex items-center justify-between ${project.id === p.id ? "bg-white/5 text-teal" : ""}`}
                  >
                    <span className="truncate">{p.name}</span>
                    {project.id === p.id && <Check size={12} className="text-teal" />}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
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
              const todoCol = columnsList.find(c => c.title.toLowerCase().includes("to do") || c.title.toLowerCase().includes("todo")) || columnsList[0];
              setTargetColumnId(todoCol?.id || "column-todo");
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
        {project && (
          <div className="mb-4 bg-[#121E30]/80 backdrop-blur-xs border border-[#253347] rounded-[3px] p-4 flex flex-col gap-3 shadow-lg select-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-[#00e5c8]/10 text-[#00e5c8]">
                  <Target size={16} />
                </span>
                <div>
                  <span className="text-xs font-black text-white">TRL Readiness Roadmap</span>
                  <span className="ml-2 text-[10px] text-text-muted font-bold">Current: Level {project.currentTRL} ({getTrlLevelName(project.currentTRL)})</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {getTrlWarning() && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] bg-red-950/20 border border-red-500/30 text-red-400 text-[10px] font-extrabold uppercase animate-pulse">
                    <AlertTriangle size={12} />
                    <span>{getTrlWarning()}</span>
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
                const { total, completed } = getTrlProgressStats(lvl);
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
        )}

        {activeView === "gantt" ? (
          <div className="flex-grow flex bg-[#121E30]/95 border border-[#253347] rounded-[3px] p-5 shadow-lg overflow-hidden min-h-0 text-white">
            {/* Left Column: Tasks List */}
            <div className="w-72 flex-shrink-0 border-r border-[#253347]/80 pr-5 flex flex-col min-h-0">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-4">Tasks</h3>
              <div className="flex-grow overflow-y-auto space-y-2 pr-1 planka-scrollbar">
                {cards.map((card) => (
                  <div key={card.id} className="p-3 bg-[#1A2B42] border border-[#253347]/50 rounded-[3px] flex items-center justify-between gap-2 shadow-sm">
                    <span className="text-xs font-bold text-white truncate">{card.title}</span>
                    <span className={`flex-shrink-0 rounded-[3px] px-1.5 py-0.5 text-[8px] font-extrabold tracking-wide ${getPriorityStyle(card.priority)}`}>
                      {formatPriority(card.priority)}
                    </span>
                  </div>
                ))}
                {cards.length === 0 && (
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
                {cards.map((card) => {
                  const hash = card.title.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0);
                  const isDone = card.columnId.toLowerCase().includes("done") || card.columnId.toLowerCase().includes("completed") || card.columnId === "Done";
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
                            : card.columnId.toLowerCase().includes("review")
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
              const columnCards = cards.filter((card) => card.columnId === column.id);

              const getColumnIcon = (colId: string) => {
                if (colId.toLowerCase().includes("todo")) return <ArrowRightCircle size={14} className="text-[#6b808c] mr-1.5" />;
                if (colId.toLowerCase().includes("progress")) return <PlayCircle size={14} className="text-[#0079bf] mr-1.5" />;
                if (colId.toLowerCase().includes("review")) return <RefreshCw size={12} className="text-amber-600 mr-1.5 animate-spin-slow" />;
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

                        // Assignee circles
                        const displayUsers = card.assignees && card.assignees.length > 0
                          ? card.assignees
                          : (card.assigneeId ? (users.find(u => u.id === card.assigneeId) ? [users.find(u => u.id === card.assigneeId)!] : []) : []);
                        const projectMembers = users.filter((u: any) => project.memberIds.includes(u.id));
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
                                {card.totalLoggedHours !== undefined && card.totalLoggedHours > 0 && (
                                  <span className="flex items-center gap-0.5 text-[#00e5c8]" title={`Logged efforts: ${card.totalLoggedHours}h`}>
                                    <Clock size={12} className="text-[#00e5c8]" />
                                    <span>{card.totalLoggedHours}h</span>
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

                                  {/* Status & Due Date row */}
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
                                        <ChevronDown size={11} className="text-text-muted" />
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
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted">Priority</label>
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
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-text-muted text-[8px]">
                      <ChevronDown size={10} />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted">Assignee</label>
                  <div className="relative">
                    <select
                      value={newTaskAssignee}
                      onChange={(e) => setNewTaskAssignee(e.target.value)}
                      className="w-full h-9 rounded-[3px] border border-[#253347] bg-[#08101f] px-3 text-white outline-none focus:ring-1 focus:ring-teal/30 focus:border-teal/50 cursor-pointer appearance-none text-xs font-semibold"
                    >
                      <option value="" className="bg-[#121E30] text-text-muted">Unassigned</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id} className="bg-[#121E30] text-white">
                          {u.name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-text-muted text-[8px]">
                      <ChevronDown size={10} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted">Due Date</label>
                <input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  onClick={(e) => {
                    try {
                      e.currentTarget.showPicker();
                    } catch (err) {}
                  }}
                  className="w-full h-9 rounded-[3px] border border-[#253347] bg-[#08101f] px-3 text-white outline-none focus:ring-1 focus:ring-teal/30 focus:border-teal/50 text-xs font-semibold cursor-pointer"
                />
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
                
                {/* Metadata Row: Members, Labels, Due Date */}
                <div className="flex flex-wrap gap-5 items-start">
                  
                  {/* Members Pill List */}
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#6b808c] mb-1.5">Members</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {detailCard.assignees && detailCard.assignees.length > 0 ? (
                        <div className="flex -space-x-1.5 mr-1">
                          {detailCard.assignees.map((assignedUser: any) => {
                            const uInitials = assignedUser.name.split(" ").map((n: string) => n[0]).join("");
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
                          const uInitials = assignedUser.name.split(" ").map((n: string) => n[0]).join("");
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
                              {usersList.filter((u: any) => project.memberIds.includes(u.id)).map((u: any) => {
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

                {/* Attachments Section */}
                {detailCard.attachments && detailCard.attachments.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-teal">
                      <Paperclip size={16} className="text-teal" />
                      <h4 className="text-xs font-bold uppercase tracking-wider">Attachments</h4>
                    </div>
                    <div className="ml-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {detailCard.attachments.map((att: any) => (
                        <div 
                          key={att.id} 
                          className="group/att block bg-[#08101f]/60 hover:bg-[#08101f]/90 border border-[#253347]/50 rounded-[3px] p-2 transition text-left"
                        >
                          <div 
                            className="aspect-video w-full rounded overflow-hidden bg-black/40 border border-[#253347]/30 mb-2 relative cursor-pointer"
                            onClick={() => {
                              if (att.mimeType?.startsWith("image/")) {
                                setActiveAttachmentUrl(att.url);
                              } else {
                                window.open(att.url, "_blank");
                              }
                            }}
                          >
                            {att.mimeType?.startsWith("image/") ? (
                              <img src={att.url} alt={att.name} className="w-full h-full object-cover group-hover/att:scale-105 transition" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-text-muted font-bold">
                                FILE
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-white font-semibold truncate" title={att.name}>{att.name}</p>
                          <p className="text-[10px] text-text-muted mt-0.5">{(att.size / 1024).toFixed(1)} KB</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tabs Selector: Comments & Activity vs Logged Efforts */}
                <div className="border-b border-[#253347] flex gap-4 text-xs font-bold uppercase tracking-wider mb-4 pt-2">
                  <button
                    onClick={() => setActiveTab("activity")}
                    className={`pb-2 border-b-2 transition-all duration-150 ${
                      activeTab !== "efforts"
                        ? "border-[#00e5c8] text-[#00e5c8]"
                        : "border-transparent text-text-muted hover:text-white"
                    }`}
                  >
                    Activity & Comments
                  </button>
                  <button
                    onClick={() => setActiveTab("efforts")}
                    className={`pb-2 border-b-2 transition-all duration-150 flex items-center gap-1.5 ${
                      activeTab === "efforts"
                        ? "border-[#00e5c8] text-[#00e5c8]"
                        : "border-transparent text-text-muted hover:text-white"
                    }`}
                  >
                    <Clock size={12} />
                    <span>Logged Efforts</span>
                    {cardHours.length > 0 && (
                      <span className="text-[10px] bg-teal/15 text-[#00e5c8] px-1.5 py-0.5 rounded-full">
                        {cardHours.reduce((sum, log) => sum + (log.hours || 0), 0)}h
                      </span>
                    )}
                  </button>
                </div>

                {activeTab !== "efforts" && (
                  <div className="space-y-4">
                    {/* Comment box */}
                    <div className="border border-[#253347] bg-[#08101f] rounded-[3px] p-3 focus-within:border-teal/50 transition-all duration-150">
                      <textarea
                        placeholder="Write a comment..."
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        className="w-full min-h-16 bg-transparent border-none outline-none text-xs text-white placeholder:text-text-muted/40 resize-none font-semibold"
                      />
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-[#253347]/50">
                        <div>
                          <label className="p-1.5 hover:bg-[#1A2B42] rounded transition cursor-pointer flex items-center gap-1.5 text-text-muted hover:text-white" title="Upload image">
                            <ImageIcon size={14} className="text-teal" />
                            <span className="text-[10px] font-bold tracking-wider">ADD IMAGE</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  const base64 = await fileToBase64(file);
                                  const res = await apiRequest<{ url: string }>("/upload", {
                                    method: "POST",
                                    body: JSON.stringify({
                                      filename: file.name,
                                      content: base64,
                                      cardId: detailCard.id
                                    })
                                  });
                                  // Append image markdown
                                  setNewCommentText(prev => {
                                    const spacing = prev ? "\n" : "";
                                    return prev + spacing + `![${file.name}](${res.url})`;
                                  });
                                } catch (err) {
                                  console.error("Failed to upload image:", err);
                                  alert("Failed to upload image.");
                                }
                              }}
                            />
                          </label>
                        </div>
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
                                 <div className="text-sm text-white leading-relaxed font-sans font-medium ml-1">
                                   {renderCommentContent(act.content)}
                                 </div>
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
                  <div className="space-y-6">
                    {/* Log New Effort Form */}
                    <form onSubmit={handleSaveEffort} className="border border-[#253347] bg-[#08101f] rounded-[3px] p-4 space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-[#253347]/50">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-[#00e5c8]">Log New Effort</span>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted">Date</label>
                          <input
                            type="date"
                            value={effortDate}
                            onChange={(e) => setEffortDate(e.target.value)}
                            className="bg-[#0B1220] border border-[#253347] rounded-[3px] px-2.5 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-teal/30 focus:border-[#00e5c8] w-full cursor-pointer font-semibold"
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted">Time Range (Optional)</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="time"
                              value={effortStartTime}
                              onChange={(e) => setEffortStartTime(e.target.value)}
                              className="bg-[#0B1220] border border-[#253347] rounded-[3px] px-2 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-teal/30 focus:border-[#00e5c8] w-full cursor-pointer font-semibold"
                            />
                            <span className="text-text-muted text-[10px] font-bold">to</span>
                            <input
                              type="time"
                              value={effortEndTime}
                              onChange={(e) => setEffortEndTime(e.target.value)}
                              className="bg-[#0B1220] border border-[#253347] rounded-[3px] px-2 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-teal/30 focus:border-[#00e5c8] w-full cursor-pointer font-semibold"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted">Hours Worked</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            step="0.25"
                            min="0.25"
                            value={effortHours}
                            onChange={(e) => setEffortHours(e.target.value)}
                            placeholder="e.g. 2.5"
                            className="bg-[#0B1220] border border-[#253347] rounded-[3px] px-2.5 py-2 text-xs text-white placeholder:text-text-muted/40 focus:ring-1 focus:ring-teal/30 focus:border-[#00e5c8] outline-none w-full font-semibold"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setEffortStartTime("");
                              setEffortEndTime("");
                              setEffortHours("8");
                            }}
                            className="rounded-[3px] border border-[#253347] bg-[#1A2B42] hover:bg-[#00e5c8] hover:text-navy px-3 text-xs font-bold transition text-white"
                          >
                            8h
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted">Werkpakket</label>
                        <select
                          value={effortWerkpakket}
                          onChange={(e) => setEffortWerkpakket(e.target.value)}
                          className="bg-[#0B1220] border border-[#253347] rounded-[3px] px-2.5 py-2 text-xs text-white placeholder:text-text-muted/40 focus:ring-1 focus:ring-teal/30 focus:border-[#00e5c8] outline-none w-full font-semibold cursor-pointer"
                        >
                          <option value="" disabled>Select a Werkpakket...</option>
                          {CARD_WERKPAKKETTEN.map((wp) => (
                            <option key={wp} value={wp}>{wp}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted">Description / Notes</label>
                        <textarea
                          placeholder="Describe what you worked on..."
                          value={effortNotes}
                          onChange={(e) => setEffortNotes(e.target.value)}
                          className="w-full min-h-16 bg-[#0B1220] border border-[#253347] rounded-[3px] p-2.5 outline-none text-xs text-white placeholder:text-text-muted/40 focus:ring-1 focus:ring-teal/30 focus:border-[#00e5c8] resize-none font-semibold"
                        />
                      </div>

                      {/* Dropzone */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted">Verification Proof (Screenshots)</label>
                        <div className="border border-dashed border-[#253347] hover:border-teal/50 bg-[#0B1220]/40 rounded-[3px] p-3 text-center cursor-pointer transition-colors relative">
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) => handleEffortFilesChange(e.target.files)}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          <Camera size={18} className="mx-auto text-teal/70 mb-1" />
                          <span className="text-[10px] font-bold text-text-muted block">Drag & drop or click to add screenshot proofs</span>
                        </div>

                        {effortPreviews.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {effortPreviews.map((preview, idx) => (
                              <div key={idx} className="relative w-12 h-12 rounded overflow-hidden border border-[#253347]">
                                <img src={preview} alt="preview" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveEffortImage(idx)}
                                  className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-black rounded-full p-0.5 text-white transition"
                                >
                                  <X size={8} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={isSavingEffort}
                        className="w-full py-2 bg-[#00C88A] hover:bg-[#00B8A2] text-white text-xs font-bold rounded-[3px] transition flex items-center justify-center gap-1.5"
                      >
                        {isSavingEffort ? (
                          <>
                            <RefreshCw size={14} className="animate-spin text-white" />
                            <span>Saving Effort...</span>
                          </>
                        ) : (
                          <>
                            <Check size={14} />
                            <span>Save Effort Log</span>
                          </>
                        )}
                      </button>
                    </form>

                    {/* Log History feed */}
                    <div className="space-y-3">
                      <span className="block text-xs font-extrabold uppercase tracking-wider text-text-muted">Card Efforts History</span>
                      {cardHoursLoading ? (
                        <div className="text-center py-4 text-xs text-text-muted flex items-center justify-center gap-2">
                          <RefreshCw size={12} className="animate-spin text-teal" />
                          <span>Loading log history...</span>
                        </div>
                      ) : cardHours.length > 0 ? (
                        <div className="space-y-2">
                          {cardHours.map((log: any) => {
                            const initials = log.userName?.split(" ").map((n: string) => n[0]).join("") || "";
                            const isAuthorizedToDelete = currentUser?.id === log.userId || currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER";
                            return (
                              <div key={log.id} className="border border-[#253347] bg-[#1A2B42]/40 rounded-[3px] p-3 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    {log.userAvatarUrl ? (
                                      <img src={log.userAvatarUrl} alt={log.userName} className="w-6 h-6 rounded-full object-cover" />
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 text-[9px] text-white font-black flex items-center justify-center">
                                        {initials}
                                      </div>
                                    )}
                                    <div>
                                      <p className="text-xs font-bold text-white leading-tight">{log.userName}</p>
                                      <p className="text-[9px] text-[#6b808c]">{log.date}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <div className="text-right">
                                      <span className="text-xs font-extrabold text-[#00e5c8] bg-[#00e5c8]/10 px-2 py-0.5 rounded-full inline-block">
                                        {log.hours}h
                                      </span>
                                      {log.startTime && log.endTime && (
                                        <p className="text-[9px] text-[#00e5c8]/70 font-semibold mt-1 font-mono">
                                          {log.startTime} - {log.endTime}
                                        </p>
                                      )}
                                    </div>
                                    {isAuthorizedToDelete && (
                                      <button
                                        onClick={() => handleDeleteEffort(log.id, log.hours)}
                                        className="text-[#6b808c] hover:text-red-500 p-1 rounded transition"
                                        title="Delete log"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {log.werkpakket && (
                                  <p className="text-[10px] text-teal-400 font-bold bg-teal-950/20 px-2 py-0.5 rounded border border-teal-900/30 inline-block">
                                    {log.werkpakket}
                                  </p>
                                )}

                                {log.notes && (
                                  <p className="text-xs text-white/95 leading-relaxed font-sans">{log.notes}</p>
                                )}

                                {log.attachments && log.attachments.length > 0 && (
                                  <div className="flex flex-wrap gap-2 pt-1">
                                    {log.attachments.map((att: any) => (
                                      <div key={att.id} className="flex-shrink-0">
                                        {renderEffortProofThumbnail(att)}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-6 border border-dashed border-[#253347] rounded-[3px] text-xs text-text-muted bg-[#08101f]/10">
                          No effort logged on this card yet.
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

                  {/* Checklist */}
                  <button
                    onClick={() => handleAddChecklist(detailCard.id)}
                    className="w-full py-2 px-3 rounded-[3px] bg-[#1A2B42] hover:bg-[#253347] border border-[#253347]/50 shadow-[0_1px_0_rgba(9,30,66,0.13)] text-xs font-semibold text-white transition-all text-left flex items-center gap-2"
                  >
                    <CheckSquare size={14} className="text-teal" />
                    <span>Checklist</span>
                  </button>

                  {/* Due Date */}
                  <div className="relative">
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
                    onClick={() => {
                      setActiveTab("efforts");
                    }}
                    className={`w-full py-2 px-3 rounded-[3px] border transition-all text-left flex items-center gap-2 ${
                      activeTab === "efforts"
                        ? "bg-[#00e5c8]/20 border-[#00e5c8]/40 text-[#00e5c8]"
                        : "bg-[#1A2B42] hover:bg-[#253347] border-[#253347]/50 text-white"
                    }`}
                  >
                    <Clock size={14} className="text-teal" />
                    <span>Log Time</span>
                  </button>

                  {/* Attach Proof / Image */}
                  <div className="relative">
                    <label 
                      className="w-full py-2 px-3 rounded-[3px] bg-[#1A2B42] hover:bg-[#253347] border border-[#253347]/50 shadow-[0_1px_0_rgba(9,30,66,0.13)] text-xs font-semibold text-white transition-all text-left flex items-center gap-2 cursor-pointer"
                    >
                      <Paperclip size={14} className="text-teal" />
                      <span>Attach Proof</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const base64 = await fileToBase64(file);
                            await apiRequest("/upload", {
                              method: "POST",
                              body: JSON.stringify({
                                filename: file.name,
                                content: base64,
                                cardId: detailCard.id
                              })
                            });
                            fetchBoardData();
                          } catch (err) {
                            console.error("Failed to attach file:", err);
                            alert("Failed to upload attachment.");
                          }
                        }}
                      />
                    </label>
                  </div>

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
                  {showTrlDetailsPanel === 99 ? "Project progression overview" : getTrlLevelName(showTrlDetailsPanel)}
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
                const filteredCards = cards.filter(c => {
                  if (c.trlLevel === undefined) return false;
                  if (showTrlDetailsPanel === 99) return true;
                  return c.trlLevel === showTrlDetailsPanel;
                }).sort((a, b) => (a.trlLevel || 0) - (b.trlLevel || 0));

                if (filteredCards.length === 0) {
                  return (
                    <div className="text-center py-12 text-sm text-text-muted">
                      No tasks aligned to this TRL phase.
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {filteredCards.map(card => {
                      const isCompleted = card.columnId.toLowerCase().includes("done") || card.columnId.toLowerCase().includes("completed");
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
                                TRL {card.trlLevel} • {columns.find(col => col.id === card.columnId)?.title || card.columnId}
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

      {/* Task Completion screenshot upload modal */}
      {pendingCompletion && (
        <div className="fixed inset-0 z-[10005] flex items-center justify-center bg-black/80 backdrop-blur-md select-none p-4 text-white">
          <div className="w-full max-w-md bg-[#121E30] border border-teal/40 rounded-[3px] p-6 shadow-2xl space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-[#253347] pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-400 animate-pulse" />
                Task Completion Proof
              </h3>
              <button 
                onClick={() => {
                  setPendingCompletion(null);
                  setCompletionImage(null);
                  setCompletionImagePreview("");
                }} 
                className="text-text-muted hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-white/80 leading-relaxed font-semibold">
              Marking this task as completed! Would you like to upload a screenshot or image proof of your work? (Optional)
            </p>

            <div className="space-y-3">
              <label 
                className="w-full py-3 px-4 rounded-[3px] border border-dashed border-[#253347] bg-[#08101f] text-xs font-semibold text-text-muted hover:text-white cursor-pointer transition flex flex-col items-center justify-center gap-2 text-center"
              >
                <Camera size={20} className="text-teal" />
                <span>Choose Completion Image</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setCompletionImage(file);
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setCompletionImagePreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>

              {completionImagePreview && (
                <div className="relative w-full h-32 rounded border border-[#253347] overflow-hidden group">
                  <img src={completionImagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setCompletionImage(null);
                      setCompletionImagePreview("");
                    }}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-extrabold uppercase transition duration-150"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPendingCompletion(null);
                  setCompletionImage(null);
                  setCompletionImagePreview("");
                }}
                className="flex-1 py-2 rounded-[3px] bg-[#1A2B42] hover:bg-[#253347] text-text-muted hover:text-white text-xs font-bold transition border border-[#253347]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeCardCompletion(pendingCompletion.cardId, pendingCompletion.columnId, completionImage)}
                disabled={isUploadingCompletion}
                className="flex-1 py-2 rounded-[3px] bg-gradient-to-r from-teal to-[#00B8A2] hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow transition duration-150"
              >
                {isUploadingCompletion ? "Uploading..." : (completionImage ? "Upload & Done" : "Complete Task")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Image Lightbox */}
      {activeAttachmentUrl && (() => {
        let activeAttachment = detailCard?.attachments?.find((a: any) => a.url === activeAttachmentUrl);
        if (!activeAttachment) {
          for (const log of cardHours) {
            const found = log.attachments?.find((a: any) => a.url === activeAttachmentUrl);
            if (found) {
              activeAttachment = found;
              break;
            }
          }
        }
        
        return (
          <div 
            className="fixed inset-0 z-[10006] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in text-white"
            onClick={() => setActiveAttachmentUrl(null)}
          >
            <div 
              className="relative max-w-5xl w-full max-h-[90vh] rounded-2xl overflow-hidden border border-[#1B2A3F] bg-[#0B1220] shadow-2xl flex flex-col md:flex-row animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setActiveAttachmentUrl(null)} 
                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/60 text-white hover:bg-black hover:scale-105 transition"
              >
                <X size={18} />
              </button>

              {/* Left Column: Image Viewer */}
              <div className="flex-1 bg-black/30 p-6 flex items-center justify-center min-h-[300px] md:min-h-[500px]">
                <img 
                  src={activeAttachmentUrl} 
                  alt="Attachment" 
                  className="max-w-full max-h-[70vh] rounded-xl object-contain shadow-lg border border-white/5"
                />
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

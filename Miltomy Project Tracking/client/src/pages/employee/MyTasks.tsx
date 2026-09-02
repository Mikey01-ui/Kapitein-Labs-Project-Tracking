import { useState, useEffect } from "react";
import { apiRequest } from "../../services/apiClient";
import { 
  Plus, 
  Trash2, 
  X, 
  AlertCircle, 
  MessageSquare, 
  CheckSquare, 
  CheckCircle2, 
  Clock, 
  PlayCircle, 
  ArrowRightCircle, 
  RefreshCw, 
  AlignLeft, 
  Calendar, 
  Tag, 
  Folder, 
  FolderKanban, 
  User as UserIcon, 
  Users, 
  Check, 
  ChevronDown,
  Target
} from "lucide-react";
import type { KanbanCard, KanbanColumn, Priority, User } from "../../types";
import Ferrofluid from "../../components/effects/Ferrofluid";
import { useAuth } from "../../context/AuthContext";
import { SkeletonLoader } from "../../components/ui/SkeletonLoader";
import { UserAvatar } from "../../components/ui/UserAvatar";

const fallbackColumns: KanbanColumn[] = [
  { id: "column-todo", projectId: "all", title: "To Do", order: 1 },
  { id: "column-progress", projectId: "all", title: "In Progress", order: 2 },
  { id: "column-review", projectId: "all", title: "In Review", order: 3 },
  { id: "column-done", projectId: "all", title: "Completed", order: 4 }
];

export function MyTasks() {
  const { user } = useAuth();
  
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [columns] = useState<KanbanColumn[]>(fallbackColumns);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [projectBoards, setProjectBoards] = useState<{ projectId: string; columns: any[] }[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"kanban" | "gantt">("kanban");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");

  // Modal Control States
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [largeDetailCardId, setLargeDetailCardId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"activity" | "efforts">("activity");

  // Form States
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskProjectId, setNewTaskProjectId] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("MEDIUM");
  const [targetColumnId, setTargetColumnId] = useState("column-todo");
  const [inlineTaskTitles, setInlineTaskTitles] = useState<Record<string, string>>({});
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  // Popover toggle states
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);
  const [showProjectDropdown, setShowProjectDropdown] = useState<string | null>(null);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState<string | null>(null);
  const [showLabelsDropdown, setShowLabelsDropdown] = useState<string | null>(null);
  const [showProjectHeaderDropdown, setShowProjectHeaderDropdown] = useState(false);

  // Card Metadata States
  const [cardLabels, setCardLabels] = useState<Record<string, string[]>>({});
  const [newCommentText, setNewCommentText] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [newChecklistItemText, setNewChecklistItemText] = useState("");

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

  const fetchTasksData = async () => {
    try {
      const [projData, userData] = await Promise.all([
        apiRequest<{ projects: any[] }>("/projects"),
        apiRequest<{ users: any[] }>("/users")
      ]);

      const projects = projData.projects || [];
      setProjectsList(projects);
      setUsersList(userData.users || []);

      if (projects.length > 0 && !newTaskProjectId) {
        setNewTaskProjectId(projects[0].id);
      }

      const boardsPromises = projects.map(p =>
        apiRequest<{ columns: any[] }>(`/projects/${p.id}/kanban`)
          .then(res => ({ projectId: p.id, columns: res.columns || [] }))
          .catch(() => ({ projectId: p.id, columns: [] }))
      );

      const boards = await Promise.all(boardsPromises);
      setProjectBoards(boards);

      const allCards: KanbanCard[] = [];
      boards.forEach(b => {
        const proj = projects.find(p => p.id === b.projectId);
        b.columns.forEach(col => {
          const colTitle = (col.title || "").toLowerCase();
          let targetMappedColId = "column-todo";
          if (colTitle.includes("progress")) targetMappedColId = "column-progress";
          else if (colTitle.includes("review")) targetMappedColId = "column-review";
          else if (colTitle.includes("done") || colTitle.includes("complet")) targetMappedColId = "column-done";

          (col.cards || []).forEach((c: any) => {
            allCards.push({
              ...c,
              projectId: b.projectId,
              projectName: proj?.name || "Client Project",
              clientName: proj?.clientName || "Direct Client",
              columnId: targetMappedColId,
              dbColumnId: col.id
            });
          });
        });
      });

      setCards(allCards);
    } catch (err) {
      console.error("Failed to fetch task boards:", err);
      triggerToast("Failed to load tasks.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasksData();
  }, []);

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData("cardId", cardId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    setDragOverColumnId(colId);
  };

  const handleDragLeave = () => {
    setDragOverColumnId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetMappedColId: string) => {
    e.preventDefault();
    setDragOverColumnId(null);
    const cardId = e.dataTransfer.getData("cardId");
    if (!cardId) return;

    const movingCard = cards.find(c => c.id === cardId);
    if (!movingCard || movingCard.columnId === targetMappedColId) return;

    setCards(prevCards =>
      prevCards.map(c => (c.id === cardId ? { ...c, columnId: targetMappedColId } : c))
    );

    try {
      const board = projectBoards.find(b => b.projectId === movingCard.projectId);
      if (!board) return;

      const targetCol = board.columns.find((col: any) => {
        const t = (col.title || "").toLowerCase();
        if (targetMappedColId === "column-todo") return t.includes("to do") || t.includes("todo") || t.includes("backlog");
        if (targetMappedColId === "column-progress") return t.includes("progress") || t.includes("doing");
        if (targetMappedColId === "column-review") return t.includes("review");
        if (targetMappedColId === "column-done") return t.includes("done") || t.includes("complet");
        return false;
      }) || board.columns[0];

      if (targetCol) {
        await apiRequest(`/kanban/cards/${cardId}`, {
          method: "PUT",
          body: JSON.stringify({ columnId: targetCol.id })
        });
      }
    } catch (err) {
      console.error("Failed to persist card move:", err);
      fetchTasksData();
    }
  };

  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskProjectId) return;

    try {
      const board = projectBoards.find(b => b.projectId === newTaskProjectId);
      let colId = board?.columns[0]?.id;
      if (board) {
        const matched = board.columns.find((c: any) => {
          const t = (c.title || "").toLowerCase();
          if (targetColumnId === "column-todo") return t.includes("todo") || t.includes("to do");
          if (targetColumnId === "column-progress") return t.includes("progress");
          if (targetColumnId === "column-review") return t.includes("review");
          if (targetColumnId === "column-done") return t.includes("done") || t.includes("complet");
          return false;
        });
        if (matched) colId = matched.id;
      }

      if (!colId) {
        triggerToast("No columns found in this project.", "error");
        return;
      }

      await apiRequest(`/projects/${newTaskProjectId}/kanban/cards`, {
        method: "POST",
        body: JSON.stringify({
          columnId: colId,
          title: newTaskTitle.trim(),
          description: newTaskDesc.trim() || null,
          priority: newTaskPriority
        })
      });

      triggerToast("Task created successfully!");
      setNewTaskTitle("");
      setNewTaskDesc("");
      setIsAddTaskOpen(false);
      fetchTasksData();
    } catch (err) {
      console.error(err);
      triggerToast("Failed to create task.", "error");
    }
  };

  const handleCreateInlineCard = async (targetColId: string) => {
    const title = (inlineTaskTitles[targetColId] || "").trim();
    if (!title) return;

    const projId = selectedProjectId !== "all" ? selectedProjectId : (projectsList[0]?.id || "");
    if (!projId) {
      triggerToast("Please create a project first.", "error");
      return;
    }

    try {
      const board = projectBoards.find(b => b.projectId === projId);
      let dbColId = board?.columns[0]?.id;
      if (board) {
        const matched = board.columns.find((c: any) => {
          const t = (c.title || "").toLowerCase();
          if (targetColId === "column-todo") return t.includes("todo") || t.includes("to do");
          if (targetColId === "column-progress") return t.includes("progress");
          if (targetColId === "column-review") return t.includes("review");
          if (targetColId === "column-done") return t.includes("done") || t.includes("complet");
          return false;
        });
        if (matched) dbColId = matched.id;
      }

      if (!dbColId) return;

      const res = await apiRequest<{ card: any }>(`/projects/${projId}/kanban/cards`, {
        method: "POST",
        body: JSON.stringify({
          columnId: dbColId,
          title,
          priority: "MEDIUM"
        })
      });

      const proj = projectsList.find(p => p.id === projId);
      const newCard: KanbanCard = {
        ...res.card,
        projectId: projId,
        projectName: proj?.name || "Client Project",
        clientName: proj?.clientName || "Direct Client",
        columnId: targetColId,
        dbColumnId: dbColId
      };

      setCards(prev => [...prev, newCard]);
      setInlineTaskTitles(prev => ({ ...prev, [targetColId]: "" }));
      triggerToast("Task card added!");
    } catch (err) {
      console.error(err);
      triggerToast("Failed to add task card.", "error");
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      await apiRequest(`/kanban/cards/${cardId}`, { method: "DELETE" });
      setCards(prev => prev.filter(c => c.id !== cardId));
      if (largeDetailCardId === cardId) setLargeDetailCardId(null);
      triggerToast("Task deleted successfully.");
    } catch (err) {
      console.error(err);
      triggerToast("Failed to delete task.", "error");
    }
  };

  const handleUpdateCardTitle = async (cardId: string, title: string) => {
    setCards(prev => prev.map(c => (c.id === cardId ? { ...c, title } : c)));
    try {
      await apiRequest(`/kanban/cards/${cardId}`, {
        method: "PUT",
        body: JSON.stringify({ title })
      });
    } catch (err) {
      console.error("Failed to update title:", err);
    }
  };

  const handleUpdateCardDesc = async (cardId: string, description: string) => {
    setCards(prev => prev.map(c => (c.id === cardId ? { ...c, description } : c)));
    try {
      await apiRequest(`/kanban/cards/${cardId}`, {
        method: "PUT",
        body: JSON.stringify({ description })
      });
      triggerToast("Description saved!");
    } catch (err) {
      console.error("Failed to update description:", err);
    }
  };

  const handleUpdateCardDueDate = async (cardId: string, dueDate: string) => {
    setCards(prev => prev.map(c => (c.id === cardId ? { ...c, dueDate } : c)));
    try {
      await apiRequest(`/kanban/cards/${cardId}`, {
        method: "PUT",
        body: JSON.stringify({ dueDate: dueDate || null })
      });
      triggerToast("Due date updated!");
    } catch (err) {
      console.error("Failed to update due date:", err);
    }
  };

  const handleUpdateCardPriority = async (cardId: string, priority: Priority) => {
    setCards(prev => prev.map(c => (c.id === cardId ? { ...c, priority } : c)));
    try {
      await apiRequest(`/kanban/cards/${cardId}`, {
        method: "PUT",
        body: JSON.stringify({ priority })
      });
      triggerToast(`Priority set to ${priority}`);
    } catch (err) {
      console.error("Failed to update priority:", err);
    }
  };

  const handleToggleCardAssignee = async (cardId: string, memberId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    const currentAssignees = card.assignees || (card.assignee ? [card.assignee] : []);
    const isAssigned = currentAssignees.some(a => a.id === memberId);
    
    let newAssignees: User[];
    if (isAssigned) {
      newAssignees = currentAssignees.filter(a => a.id !== memberId);
    } else {
      const userToAdd = usersList.find(u => u.id === memberId);
      newAssignees = userToAdd ? [...currentAssignees, userToAdd] : currentAssignees;
    }

    setCards(prev => prev.map(c => (c.id === cardId ? { ...c, assignees: newAssignees } : c)));

    try {
      await apiRequest(`/kanban/cards/${cardId}`, {
        method: "PUT",
        body: JSON.stringify({ assigneeIds: newAssignees.map(a => a.id) })
      });
      triggerToast(isAssigned ? "Member removed" : "Member assigned!");
    } catch (err) {
      console.error("Failed to update assignees:", err);
      fetchTasksData();
    }
  };

  const handleToggleCardLabel = (cardId: string, labelName: string) => {
    const current = cardLabels[cardId] || (cards.find(c => c.id === cardId)?.priority ? [`${cards.find(c => c.id === cardId)?.priority} Priority`] : ["Project"]);
    const exists = current.includes(labelName);
    const updated = exists ? current.filter(l => l !== labelName) : [...current, labelName];
    setCardLabels(prev => ({ ...prev, [cardId]: updated }));

    if (labelName.includes("High")) handleUpdateCardPriority(cardId, "HIGH");
    else if (labelName.includes("Medium")) handleUpdateCardPriority(cardId, "MEDIUM");
    else if (labelName.includes("Low")) handleUpdateCardPriority(cardId, "LOW");
  };

  const handlePostComment = async (cardId: string) => {
    if (!newCommentText.trim() || !user) return;
    const content = newCommentText.trim();
    setNewCommentText("");

    try {
      const res = await apiRequest<{ comment: any }>(`/kanban/cards/${cardId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content })
      });

      setCards(prev => prev.map(c => {
        if (c.id === cardId) {
          return {
            ...c,
            comments: [...(c.comments || []), res.comment]
          };
        }
        return c;
      }));

      triggerToast("Comment added!");
    } catch (err) {
      console.error("Failed to add comment:", err);
      triggerToast("Failed to add comment.", "error");
    }
  };

  const handleDeleteComment = async (cardId: string, commentId: string) => {
    try {
      await apiRequest(`/kanban/cards/${cardId}/comments/${commentId}`, {
        method: "DELETE"
      });

      setCards(prev => prev.map(c => {
        if (c.id === cardId) {
          return {
            ...c,
            comments: (c.comments || []).filter(cm => cm.id !== commentId)
          };
        }
        return c;
      }));

      triggerToast("Comment deleted.");
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  };

  const handleAddChecklistItem = async (cardId: string) => {
    if (!newChecklistItemText.trim()) return;
    const title = newChecklistItemText.trim();
    setNewChecklistItemText("");

    try {
      const res = await apiRequest<{ item: any }>(`/kanban/cards/${cardId}/checklist`, {
        method: "POST",
        body: JSON.stringify({ title })
      });

      setCards(prev => prev.map(c => {
        if (c.id === cardId) {
          return {
            ...c,
            checklistItems: [...(c.checklistItems || []), res.item]
          };
        }
        return c;
      }));
    } catch (err) {
      console.error("Failed to add checklist item:", err);
    }
  };

  const handleToggleChecklistItem = async (cardId: string, itemId: string, currentStatus: boolean) => {
    setCards(prev => prev.map(c => {
      if (c.id === cardId) {
        return {
          ...c,
          checklistItems: (c.checklistItems || []).map(i => i.id === itemId ? { ...i, isCompleted: !currentStatus } : i)
        };
      }
      return c;
    }));

    try {
      await apiRequest(`/kanban/cards/${cardId}/checklist/${itemId}`, {
        method: "PUT",
        body: JSON.stringify({ isCompleted: !currentStatus })
      });
    } catch (err) {
      console.error("Failed to update checklist item:", err);
    }
  };

  const handleDeleteChecklistItem = async (cardId: string, itemId: string) => {
    setCards(prev => prev.map(c => {
      if (c.id === cardId) {
        return {
          ...c,
          checklistItems: (c.checklistItems || []).filter(i => i.id !== itemId)
        };
      }
      return c;
    }));

    try {
      await apiRequest(`/kanban/cards/${cardId}/checklist/${itemId}`, {
        method: "DELETE"
      });
    } catch (err) {
      console.error("Failed to delete checklist item:", err);
    }
  };

  const getColumnIcon = (colId: string) => {
    switch (colId) {
      case "column-todo":
        return <ArrowRightCircle size={15} className="text-[#888888] mr-2 flex-shrink-0" />;
      case "column-progress":
        return <PlayCircle size={15} className="text-[#c8ff00] mr-2 flex-shrink-0" />;
      case "column-review":
        return <RefreshCw size={15} className="text-[#3B82F6] mr-2 flex-shrink-0" />;
      case "column-done":
        return <CheckCircle2 size={15} className="text-[#00C88A] mr-2 flex-shrink-0" />;
      default:
        return <Clock size={15} className="text-[#888888] mr-2 flex-shrink-0" />;
    }
  };

  const getLabelColorClass = (label: string) => {
    switch (label) {
      case "High Priority":
        return "bg-[#E74C4C] text-white";
      case "Medium Priority":
        return "bg-[#F5A623] text-[#080808]";
      case "Low Priority":
        return "bg-[#00C88A] text-[#080808]";
      case "UI Design":
      case "Frontend":
        return "bg-[#c8ff00] text-[#080808]";
      case "Backend":
        return "bg-[#3B82F6] text-white";
      default:
        return "bg-[#262626] text-[#888888]";
    }
  };

  const getCardLabelsList = (card: KanbanCard) => {
    if (cardLabels[card.id]) return cardLabels[card.id];
    const defaultLabels = ["Project"];
    if (card.priority === "HIGH") defaultLabels.push("High Priority");
    else if (card.priority === "MEDIUM") defaultLabels.push("Medium Priority");
    else if (card.priority === "LOW") defaultLabels.push("Low Priority");
    return defaultLabels;
  };

  const filteredCardsForView = cards.filter(card => {
    if (selectedProjectId === "all") return true;
    return card.projectId === selectedProjectId;
  });

  const detailCard = cards.find(c => c.id === largeDetailCardId);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] text-[#f0ede6] lg:pl-28 p-6">
        <SkeletonLoader variant="kanban" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#080808] text-[#f0ede6] overflow-x-hidden font-sans flex flex-col">
      
      {/* Interactive Ferrofluid WebGL Background */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-25">
        <Ferrofluid colors={['#c8ff00', '#22c55e', '#84cc16', '#161616']} />
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-[3px] border text-xs font-bold shadow-2xl backdrop-blur-md animate-fade-in ${
          toast.type === "success" 
            ? "bg-[#00C88A]/10 border-[#00C88A]/30 text-[#00C88A]" 
            : "bg-[#E74C4C]/10 border-[#E74C4C]/30 text-[#E74C4C]"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header Bar (1:1 with Miltomy Header) */}
      <div className="relative z-10 px-6 py-4 lg:pl-28 lg:pr-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#222222] border-dashed select-none bg-[#080808]/80 backdrop-blur-sm">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#888888]">
            PERSONAL WORK BOARD
          </p>
          <h1 className="text-xl font-black tracking-tight text-white font-display mt-0.5">
            My Tasks
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Custom Project Selector Popover */}
          <div className="relative">
            <button
              onClick={() => setShowProjectHeaderDropdown(!showProjectHeaderDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-[3px] bg-[#111111] hover:bg-[#161616] border border-[#222222] text-xs font-bold text-white transition cursor-pointer"
            >
              <Folder size={12} className="text-[#c8ff00]" />
              <span className="uppercase text-[11px] tracking-wider">
                PROJECT: {selectedProjectId === "all" ? "ALL PROJECTS" : projectsList.find(p => p.id === selectedProjectId)?.name || "SELECT"}
              </span>
              <ChevronDown size={12} className="text-[#888888]" />
            </button>

            {showProjectHeaderDropdown && (
              <div className="absolute right-0 mt-1 w-56 rounded-[3px] bg-[#111111] border border-[#222222] shadow-2xl py-1 z-30 animate-scale-up">
                <button
                  onClick={() => {
                    setSelectedProjectId("all");
                    setShowProjectHeaderDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                    selectedProjectId === "all" ? "bg-[#c8ff00]/10 text-[#c8ff00]" : "text-white hover:bg-white/5"
                  }`}
                >
                  <span>All Projects</span>
                  {selectedProjectId === "all" && <Check size={12} className="text-[#c8ff00]" />}
                </button>
                <div className="border-t border-[#222222] my-1" />
                {projectsList.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProjectId(p.id);
                      setShowProjectHeaderDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-bold transition flex items-center justify-between truncate cursor-pointer ${
                      selectedProjectId === p.id ? "bg-[#c8ff00]/10 text-[#c8ff00]" : "text-white hover:bg-white/5"
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    {selectedProjectId === p.id && <Check size={12} className="text-[#c8ff00] flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Board / Timeline View Switcher */}
          <div className="flex items-center rounded-[3px] bg-[#111111] p-0.5 border border-[#222222]">
            <button
              onClick={() => setActiveView("kanban")}
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-[2px] transition cursor-pointer ${
                activeView === "kanban"
                  ? "bg-[#181818] text-white shadow-xs"
                  : "text-[#888888] hover:text-white"
              }`}
            >
              Board
            </button>
            <button
              onClick={() => setActiveView("gantt")}
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-[2px] transition cursor-pointer ${
                activeView === "gantt"
                  ? "bg-[#181818] text-white shadow-xs"
                  : "text-[#888888] hover:text-white"
              }`}
            >
              Timeline
            </button>
          </div>

          {/* Add Task Button */}
          <button
            onClick={() => {
              setTargetColumnId("column-todo");
              setIsAddTaskOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] bg-[#c8ff00] hover:bg-[#b2e600] text-[#080808] text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-md shadow-[#c8ff00]/20"
          >
            <Plus size={14} />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Columns / Gantt Workspace Container (1:1 with Miltomy) */}
      <div className="relative z-10 flex-grow p-6 lg:pl-28 lg:pr-8 flex flex-col">
        
        {activeView === "gantt" ? (
          /* Timeline / Gantt View */
          <div className="rounded-[3px] bg-[#111111]/80 border border-[#222222] p-5 shadow-xl backdrop-blur-xs">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[#888888] mb-4">
              Project Task Timeline
            </h3>
            <div className="overflow-x-auto">
              <div className="min-w-[650px] space-y-3">
                {filteredCardsForView.map((c, i) => {
                  const widthPercent = Math.min(100, Math.max(25, (i + 1) * 22));
                  const progressColor = c.columnId === "column-done" ? "bg-[#00C88A]" : c.columnId === "column-review" ? "bg-[#3B82F6]" : "bg-[#c8ff00]";
                  return (
                    <div key={c.id} className="flex items-center gap-4 text-xs font-semibold py-1.5 border-b border-[#222222]/50">
                      <span className="w-48 truncate text-white">{c.title}</span>
                      <div className="flex-1 bg-[#181818] h-5 rounded-[2px] overflow-hidden p-0.5 border border-[#262626]">
                        <div
                          className={`h-full ${progressColor} rounded-[2px] transition-all duration-500`}
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                      <span className="w-24 text-right text-[10px] text-[#888888] font-bold">
                        {c.dueDate ? new Date(c.dueDate).toLocaleDateString() : "No date"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Kanban Board Columns (1:1 Miltomy Columns Layout) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 w-full items-start pb-8">
            {columns.map((column) => {
              const columnCards = filteredCardsForView.filter((card) => card.columnId === column.id);

              return (
                <section
                  key={column.id}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => handleDragEnter(e, column.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, column.id)}
                  className={`flex flex-col w-full bg-[#111111]/80 backdrop-blur-xs border border-[#222222]/60 rounded-[3px] p-2.5 transition-all duration-150 ${
                    dragOverColumnId === column.id ? "bg-[#181818]/80 border-[#c8ff00]/40 scale-[1.01]" : ""
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-2 py-1.5 mb-2.5 flex-shrink-0 border-b border-dashed border-[#222222]/80 pb-2">
                    <div className="flex items-center select-none">
                      {getColumnIcon(column.id)}
                      <span className="text-sm font-extrabold text-white tracking-wide">{column.title}</span>
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-white/5 text-[#888888] text-[10px] font-bold">
                        {columnCards.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => {
                          setTargetColumnId(column.id);
                          setIsAddTaskOpen(true);
                        }}
                        className="p-1 text-[#888888] hover:text-white hover:bg-white/5 rounded-[3px] transition cursor-pointer"
                        title="Add Task"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Inline Add Task Input Card (1:1 with Reference) */}
                  <div className="flex-shrink-0 bg-[#080808]/90 border border-[#222222] rounded-[3px] px-2.5 py-2 flex items-center gap-2 mb-2.5 focus-within:border-[#c8ff00] transition-all duration-150">
                    <span className="text-[#c8ff00] text-xs font-bold">+</span>
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
                      className="bg-transparent border-none outline-none text-xs text-white placeholder:text-[#666666] w-full min-w-0 font-semibold"
                    />
                  </div>

                  {/* Cards List */}
                  <div className="space-y-2.5 flex flex-col">
                    {columnCards.map((card) => {
                      const cardProject = projectsList.find((p: any) => p.id === card.projectId);
                      const assignees = card.assignees && card.assignees.length > 0
                        ? card.assignees
                        : (card.assignee ? [card.assignee] : []);
                      const assignee = assignees[0];

                      return (
                        <article
                          key={card.id}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, card.id)}
                          onDragEnd={() => setDragOverColumnId(null)}
                          onClick={() => setLargeDetailCardId(card.id)}
                          className="group relative rounded-[3px] bg-[#161616] hover:bg-[#1a1a1a] p-3 shadow-md border border-[#222222]/90 hover:border-[#c8ff00]/40 transition-all duration-150 cursor-grab active:cursor-grabbing select-none"
                        >
                          {/* Row 1: Dual Priority Bars + Tag Pill (1:1 Miltomy Card Anatomy) */}
                          <div className="flex items-center justify-between mb-1.5">
                            {/* Dual Priority Bars */}
                            <div className="flex items-center gap-1.5">
                              <div className="h-1.5 w-6 rounded-full bg-[#262626]" />
                              <div className={`h-1.5 w-6 rounded-full ${
                                card.priority === "HIGH" 
                                  ? "bg-[#E74C4C]" 
                                  : card.priority === "MEDIUM" 
                                  ? "bg-[#F5A623]" 
                                  : "bg-[#00C88A]"
                              }`} />
                            </div>

                            {/* Tag Pill */}
                            <span className="text-[9px] font-black tracking-wider text-[#c8ff00] bg-[#c8ff00]/10 px-1.5 py-0.5 rounded-[2px] border border-[#c8ff00]/25 flex items-center gap-0.5 uppercase">
                              <Target size={10} className="text-[#c8ff00] mr-0.5" />
                              <span>{card.priority || "MEDIUM"}</span>
                            </span>
                          </div>

                          {/* Row 2: Project Name Indicator */}
                          {cardProject && (
                            <div className="flex items-center text-[10px] font-bold text-[#c8ff00] uppercase tracking-wider mb-1 mt-2 select-none">
                              <Folder size={10} className="mr-1 text-[#c8ff00] flex-shrink-0" />
                              <span className="truncate">{cardProject.name}</span>
                            </div>
                          )}

                          {/* Row 3: Card Title */}
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-semibold text-white hover:text-[#c8ff00] transition-colors leading-snug cursor-pointer line-clamp-2">
                              {card.title}
                            </h4>
                            
                            <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCard(card.id);
                                }}
                                className="text-[#888888] hover:text-[#E74C4C] p-0.5 rounded transition cursor-pointer"
                                title="Delete task"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          {/* Row 4: Footer details */}
                          <div className="mt-3 flex items-center justify-between border-t border-[#222222]/50 pt-2 text-[11px] text-[#888888]">
                            <div className="flex items-center gap-2.5 font-bold">
                              {card.description && (
                                <span title="This card has a description.">
                                  <AlignLeft size={12} className="text-[#888888]" />
                                </span>
                              )}
                              {(card.comments?.length || 0) > 0 && (
                                <span className="flex items-center gap-0.5" title="Comments count">
                                  <MessageSquare size={12} className="text-[#888888]" />
                                  <span>{card.comments?.length}</span>
                                </span>
                              )}
                              {(card.checklistItems?.length || 0) > 0 && (
                                <span className="flex items-center gap-0.5 text-[#00C88A]" title="Checklist progress">
                                  <CheckSquare size={12} className="text-[#00C88A]" />
                                  <span>{card.checklistItems?.filter(i => i.isCompleted).length}/{card.checklistItems?.length}</span>
                                </span>
                              )}
                            </div>

                            {/* Assignee Avatar */}
                            <div className="flex -space-x-1.5">
                              {assignee ? (
                                <UserAvatar name={assignee.name} avatarUrl={assignee.avatarUrl} size="xs" />
                              ) : (
                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#111111] text-[#666666] border border-[#161616]">
                                  <UserIcon size={9} />
                                </div>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}

                    {columnCards.length === 0 && (
                      <div className="text-center py-8 text-xs text-[#666666] border border-dashed border-[#222222] rounded-[3px]">
                        No cards in this list
                      </div>
                    )}
                  </div>

                  {/* Bottom Add Card Button */}
                  <button
                    onClick={() => {
                      setTargetColumnId(column.id);
                      setIsAddTaskOpen(true);
                    }}
                    className="w-full py-1.5 px-2 flex items-center gap-1.5 rounded-[3px] bg-transparent hover:bg-[#181818] text-[#888888] hover:text-white font-semibold text-xs transition mt-2 text-left justify-start cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Add card</span>
                  </button>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* Task Creation Modal */}
      {isAddTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-[3px] bg-[#111111] border border-[#222222] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#222222] pb-4">
              <h3 className="text-base font-bold text-white font-display">Create Task</h3>
              <button 
                onClick={() => setIsAddTaskOpen(false)}
                className="text-[#888888] hover:text-white transition p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTaskSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#888888] mb-1">
                  Project *
                </label>
                <select
                  value={newTaskProjectId}
                  onChange={(e) => setNewTaskProjectId(e.target.value)}
                  className="w-full h-10 px-3 rounded-[3px] bg-[#161616] border border-[#262626] text-sm text-white focus:outline-none focus:border-[#c8ff00]"
                >
                  {projectsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#888888] mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Task title..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full h-10 px-3 rounded-[3px] bg-[#161616] border border-[#262626] text-sm text-white focus:outline-none focus:border-[#c8ff00]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#888888] mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Task scope and notes..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full p-3 rounded-[3px] bg-[#161616] border border-[#262626] text-sm text-white focus:outline-none focus:border-[#c8ff00]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#888888] mb-1">
                  Priority
                </label>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                  className="w-full h-10 px-3 rounded-[3px] bg-[#161616] border border-[#262626] text-sm text-white focus:outline-none focus:border-[#c8ff00]"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#222222]">
                <button
                  type="button"
                  onClick={() => setIsAddTaskOpen(false)}
                  className="px-4 py-2 text-xs font-bold uppercase text-[#888888] hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-[3px] bg-[#c8ff00] text-[#080808] text-xs font-black uppercase tracking-wider hover:bg-[#b2e600] transition cursor-pointer"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1:1 KAPITEIN LABS TASK DETAIL MODAL */}
      {detailCard && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in text-white"
          onClick={() => setLargeDetailCardId(null)}
        >
          <div
            className="w-full max-w-3xl bg-[#111111] border border-[#222222] rounded-[3px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] pointer-events-auto animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between p-5 pb-3 flex-shrink-0 border-b border-[#222222]">
              <div className="flex-grow pr-4">
                <input
                  type="text"
                  value={detailCard.title}
                  onChange={(e) => handleUpdateCardTitle(detailCard.id, e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-xl font-black text-white focus:bg-[#161616] focus:ring-1 focus:ring-[#c8ff00]/30 rounded-[3px] px-1 py-0.5 font-display"
                />
                <div className="text-xs text-[#888888] mt-1 ml-1 flex items-center gap-1 font-semibold">
                  <span>in list</span>
                  <span className="underline cursor-pointer text-[#c8ff00]">
                    {detailCard.columnId.replace("column-", "").toUpperCase()}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setLargeDetailCardId(null)} 
                className="text-[#888888] hover:text-white p-1.5 rounded-[3px] hover:bg-white/5 transition flex-shrink-0 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Container (Split into Left: 70%, Right: 30%) */}
            <div className="flex-grow overflow-y-auto p-5 pt-3 min-h-0 flex flex-col md:flex-row gap-6">
              
              {/* Left Column (70%) */}
              <div className="flex-grow md:w-2/3 space-y-6">
                
                {/* Top Row: Members & Labels */}
                <div className="flex flex-wrap gap-6 items-start">
                  
                  {/* Members Pill List */}
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-1.5">Members</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {detailCard.assignees && detailCard.assignees.length > 0 ? (
                        <div className="flex -space-x-1 mr-1">
                          {detailCard.assignees.map((assignedUser: any) => (
                            <UserAvatar
                              key={assignedUser.id}
                              name={assignedUser.name}
                              avatarUrl={assignedUser.avatarUrl}
                              size="md"
                              className="flex-shrink-0 ring-2 ring-[#111111]"
                            />
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-[#666666] italic font-semibold mr-1">No assignee</span>
                      )}
                      
                      {/* Plus Button to open Member assignment */}
                      <div className="relative">
                        <button
                          onClick={() => setShowAssigneeDropdown(showAssigneeDropdown === detailCard.id ? null : detailCard.id)}
                          className="w-8 h-8 rounded-full border border-dashed border-[#222222] flex items-center justify-center text-xs bg-[#161616] text-[#c8ff00] hover:bg-[#222222] transition font-bold flex-shrink-0 cursor-pointer"
                          title="Assign member"
                        >
                          +
                        </button>

                        {showAssigneeDropdown === detailCard.id && (
                          <div className="absolute top-full left-0 mt-1 z-50 bg-[#111111] border border-[#222222] rounded-[3px] shadow-2xl w-64 max-h-64 overflow-y-auto py-1">
                            <div className="px-3 py-2 border-b border-[#222222] flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#888888]">
                              <span>Project Members</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowAssigneeDropdown(null);
                                }}
                                className="text-[#888888] hover:text-white transition p-0.5 rounded hover:bg-[#181818] cursor-pointer"
                                title="Close"
                              >
                                <X size={13} />
                              </button>
                            </div>
                            {usersList.map((u) => {
                              const isAssigned = (detailCard.assignees || []).some(a => a.id === u.id);
                              return (
                                <button
                                  key={u.id}
                                  onClick={() => handleToggleCardAssignee(detailCard.id, u.id)}
                                  className="w-full text-left px-3 py-2 hover:bg-[#161616] text-xs text-white flex items-center justify-between gap-2 transition cursor-pointer"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <UserAvatar name={u.name} avatarUrl={u.avatarUrl} size="xs" />
                                    <span className="truncate">{u.name}</span>
                                  </div>
                                  {isAssigned && <Check size={13} className="text-[#c8ff00] shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Labels Pill List */}
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-1.5">Labels</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {getCardLabelsList(detailCard).map((lbl, idx) => (
                        <span
                          key={idx}
                          onClick={() => setShowLabelsDropdown(showLabelsDropdown === detailCard.id ? null : detailCard.id)}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-[3px] cursor-pointer transition ${getLabelColorClass(lbl)}`}
                        >
                          {lbl}
                        </span>
                      ))}

                      <div className="relative">
                        <button
                          onClick={() => setShowLabelsDropdown(showLabelsDropdown === detailCard.id ? null : detailCard.id)}
                          className="w-7 h-7 rounded-[3px] border border-dashed border-[#222222] flex items-center justify-center text-xs bg-[#161616] text-[#c8ff00] hover:bg-[#222222] transition font-bold flex-shrink-0 cursor-pointer"
                          title="Manage labels"
                        >
                          +
                        </button>

                        {showLabelsDropdown === detailCard.id && (
                          <div className="absolute top-full left-0 mt-1 z-50 bg-[#111111] border border-[#222222] rounded-[3px] shadow-2xl py-2 px-3 w-56 space-y-1.5">
                            <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-[#888888] border-b border-[#222222] pb-1 mb-1">
                              <span>Select Labels</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowLabelsDropdown(null);
                                }}
                                className="text-[#888888] hover:text-white transition p-0.5 rounded hover:bg-[#181818] cursor-pointer"
                                title="Close"
                              >
                                <X size={12} />
                              </button>
                            </div>
                            {["Project", "High Priority", "Medium Priority", "Low Priority", "UI Design", "Frontend", "Backend", "QA", "Bug"].map((lbl) => {
                              const isActive = getCardLabelsList(detailCard).includes(lbl);
                              return (
                                <button
                                  key={lbl}
                                  onClick={() => handleToggleCardLabel(detailCard.id, lbl)}
                                  className="w-full text-left flex items-center justify-between text-xs font-semibold hover:bg-[#161616] p-1.5 rounded transition text-white cursor-pointer"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2.5 h-2.5 rounded-[2px] ${getLabelColorClass(lbl)}`} />
                                    <span>{lbl}</span>
                                  </div>
                                  {isActive && <Check size={12} className="text-[#c8ff00]" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Second Row: Project & Due Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Project Selector */}
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-1.5">Project</span>
                    <div className="relative">
                      <button
                        onClick={() => setShowProjectDropdown(showProjectDropdown === detailCard.id ? null : detailCard.id)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-[3px] bg-[#161616] hover:bg-[#1a1a1a] border border-[#222222] text-xs font-semibold text-white transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FolderKanban size={13} className="text-[#c8ff00] shrink-0" />
                          <span className="truncate">{detailCard.projectName}</span>
                        </div>
                        <ChevronDown size={12} className="text-[#888888] shrink-0" />
                      </button>

                      {showProjectDropdown === detailCard.id && (
                        <div className="absolute top-full left-0 mt-1 z-50 bg-[#111111] border border-[#222222] rounded-[3px] shadow-2xl w-full max-h-48 overflow-y-auto py-1">
                          <div className="px-3 py-1.5 border-b border-[#222222] flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#888888]">
                            <span>Select Project</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowProjectDropdown(null);
                              }}
                              className="text-[#888888] hover:text-white transition p-0.5 rounded hover:bg-[#181818] cursor-pointer"
                              title="Close"
                            >
                              <X size={12} />
                            </button>
                          </div>
                          {projectsList.map((p) => (
                            <button
                              key={p.id}
                              onClick={async () => {
                                try {
                                  await apiRequest(`/kanban/cards/${detailCard.id}`, {
                                    method: "PUT",
                                    body: JSON.stringify({ projectId: p.id })
                                  });
                                  setCards(prev => prev.map(c => c.id === detailCard.id ? { ...c, projectId: p.id, projectName: p.name } : c));
                                  setShowProjectDropdown(null);
                                  triggerToast(`Moved to ${p.name}`);
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-[#161616] text-xs font-semibold text-white truncate cursor-pointer"
                            >
                              {p.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Due Date Picker */}
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-1.5">Due Date</span>
                    <div className="relative">
                      <button
                        onClick={() => setShowDatePicker(showDatePicker === detailCard.id ? null : detailCard.id)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-[3px] bg-[#161616] hover:bg-[#1a1a1a] border border-[#222222] text-xs font-semibold text-white transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Calendar size={13} className="text-[#c8ff00]" />
                          <span className={detailCard.dueDate ? "text-white" : "text-[#888888]"}>
                            {detailCard.dueDate ? new Date(detailCard.dueDate).toLocaleDateString() : "No due date"}
                          </span>
                        </div>
                        <ChevronDown size={12} className="text-[#888888]" />
                      </button>

                      {showDatePicker === detailCard.id && (
                        <div className="absolute left-0 mt-1 z-50 bg-[#111111] border border-[#222222] rounded-[3px] p-3 shadow-2xl flex flex-col gap-2 w-56 text-left">
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#888888]">
                            <span>Select Due Date</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDatePicker(null);
                              }}
                              className="text-[#888888] hover:text-white transition p-0.5 rounded hover:bg-[#181818] cursor-pointer"
                              title="Close"
                            >
                              <X size={12} />
                            </button>
                          </div>
                          <input
                            type="date"
                            value={detailCard.dueDate ? new Date(detailCard.dueDate).toISOString().split('T')[0] : ""}
                            onChange={(e) => {
                              handleUpdateCardDueDate(detailCard.id, e.target.value);
                              setShowDatePicker(null);
                            }}
                            className="bg-[#161616] border border-[#222222] rounded-[3px] px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#c8ff00] w-full cursor-pointer"
                          />
                          {detailCard.dueDate && (
                            <button
                              type="button"
                              onClick={() => {
                                handleUpdateCardDueDate(detailCard.id, "");
                                setShowDatePicker(null);
                              }}
                              className="text-[10px] font-bold uppercase text-[#E74C4C] hover:underline self-end pt-1 cursor-pointer"
                            >
                              Clear Date
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Description Box */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[#c8ff00]">
                    <AlignLeft size={15} className="text-[#c8ff00]" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#c8ff00]">Description</h4>
                  </div>

                  {isEditingDescription ? (
                    <div className="space-y-2">
                      <textarea
                        value={descriptionDraft}
                        onChange={(e) => setDescriptionDraft(e.target.value)}
                        placeholder="Add a more detailed description..."
                        className="w-full min-h-24 rounded-[3px] border border-[#262626] bg-[#161616] p-3 text-xs text-white placeholder:text-[#666666] focus:border-[#c8ff00] outline-none resize-none font-medium"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            handleUpdateCardDesc(detailCard.id, descriptionDraft);
                            setIsEditingDescription(false);
                          }}
                          className="px-3.5 py-1.5 bg-[#c8ff00] hover:bg-[#b2e600] text-[#080808] text-xs font-bold rounded-[3px] transition cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setIsEditingDescription(false)}
                          className="px-3.5 py-1.5 bg-[#181818] hover:bg-[#222222] text-[#888888] hover:text-white text-xs font-bold rounded-[3px] transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => {
                        setDescriptionDraft(detailCard.description || "");
                        setIsEditingDescription(true);
                      }}
                      className="p-3.5 rounded-[3px] bg-[#161616]/80 hover:bg-[#161616] border border-[#222222] cursor-pointer min-h-12 transition duration-150"
                    >
                      {detailCard.description ? (
                        <p className="text-xs text-white leading-relaxed whitespace-pre-wrap font-medium">
                          {detailCard.description}
                        </p>
                      ) : (
                        <span className="text-xs text-[#666666] italic font-medium">Add a more detailed description...</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Checklist Section */}
                {(detailCard.checklistItems && detailCard.checklistItems.length > 0) && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between text-white">
                      <div className="flex items-center gap-2 text-[#c8ff00]">
                        <CheckSquare size={15} className="text-[#c8ff00]" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#c8ff00]">Checklist</h4>
                      </div>
                      <span className="text-[10px] font-bold text-[#888888]">
                        {Math.round(((detailCard.checklistItems.filter(i => i.isCompleted).length) / detailCard.checklistItems.length) * 100)}%
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 bg-[#161616] rounded-full overflow-hidden border border-[#222222]">
                      <div 
                        className="h-full bg-[#c8ff00] transition-all duration-300"
                        style={{ width: `${((detailCard.checklistItems.filter(i => i.isCompleted).length) / detailCard.checklistItems.length) * 100}%` }}
                      />
                    </div>

                    {/* Checklist items list */}
                    <div className="space-y-2 pt-1">
                      {detailCard.checklistItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between group p-1 hover:bg-[#161616] rounded">
                          <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.isCompleted}
                              onChange={() => handleToggleChecklistItem(detailCard.id, item.id, item.isCompleted)}
                              className="rounded-[2px] bg-[#181818] border-[#262626] text-[#c8ff00] w-3.5 h-3.5 cursor-pointer"
                            />
                            <span className={`text-xs ${item.isCompleted ? "line-through text-[#666666]" : "text-white"}`}>
                              {item.title}
                            </span>
                          </label>
                          <button
                            onClick={() => handleDeleteChecklistItem(detailCard.id, item.id)}
                            className="text-[#888888] hover:text-[#E74C4C] opacity-0 group-hover:opacity-100 transition p-0.5 cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inline Add Checklist Item */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddChecklistItem(detailCard.id);
                  }}
                  className="flex items-center gap-2 pt-1"
                >
                  <input
                    type="text"
                    value={newChecklistItemText}
                    onChange={(e) => setNewChecklistItemText(e.target.value)}
                    placeholder="Add a checklist item..."
                    className="bg-[#161616] border border-[#222222] rounded-[3px] px-3 py-1.5 text-xs text-white placeholder:text-[#666666] outline-none focus:border-[#c8ff00] w-full"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-[#181818] hover:bg-[#222222] text-[#c8ff00] text-xs font-bold rounded-[3px] border border-[#222222] transition cursor-pointer shrink-0"
                  >
                    Add Item
                  </button>
                </form>

                {/* Tabs & Comments Section */}
                <div className="pt-4 border-t border-[#222222]">
                  <div className="flex gap-4 text-xs font-bold uppercase tracking-wider mb-4 border-b border-[#222222] pb-2">
                    <button
                      onClick={() => setActiveTab("activity")}
                      className={`pb-1 transition ${activeTab === "activity" ? "text-[#c8ff00] border-b-2 border-[#c8ff00]" : "text-[#888888] hover:text-white"}`}
                    >
                      Activity & Comments
                    </button>
                  </div>

                  {/* Comment Box */}
                  <div className="border border-[#222222] bg-[#161616] rounded-[3px] p-3 focus-within:border-[#c8ff00]/50 transition duration-150">
                    <textarea
                      placeholder="Write a comment..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      className="w-full min-h-16 bg-transparent border-none outline-none text-xs text-white placeholder:text-[#666666] resize-none font-medium"
                    />
                    <div className="flex justify-end items-center mt-2 pt-2 border-t border-[#222222]">
                      <button
                        onClick={() => handlePostComment(detailCard.id)}
                        className="px-4 py-1.5 bg-[#c8ff00] hover:bg-[#b2e600] text-[#080808] text-xs font-bold rounded-[3px] transition cursor-pointer"
                      >
                        Comment
                      </button>
                    </div>
                  </div>

                  {/* Comments Feed */}
                  <div className="space-y-3 mt-4">
                    {(detailCard.comments && detailCard.comments.length > 0) ? (
                      detailCard.comments.map((c: any) => {
                        const author = c.user?.name || "Team Member";
                        return (
                          <div key={c.id} className="border border-[#222222] bg-[#141414] rounded-[3px] p-3 space-y-1.5 relative group">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <UserAvatar name={author} avatarUrl={c.user?.avatarUrl} size="xs" />
                                <div>
                                  <p className="text-xs font-bold text-white">{author}</p>
                                  <p className="text-[9px] text-[#888888]">{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                              </div>

                              <button
                                onClick={() => handleDeleteComment(detailCard.id, c.id)}
                                className="text-[#888888] hover:text-[#E74C4C] p-1 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                                title="Delete comment"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>

                            <p className="text-xs text-[#f0ede6] leading-relaxed pt-1">
                              {c.content}
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-6 text-xs text-[#666666] italic">
                        No activity or updates yet.
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Right Column Action Sidebar (30%) - 1:1 with Screenshot */}
              <div className="md:w-1/3 space-y-3">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-2">
                  ACTIONS
                </span>

                <div className="flex flex-col gap-2">
                  
                  {/* Members Action Button */}
                  <button
                    onClick={() => setShowAssigneeDropdown(showAssigneeDropdown === detailCard.id ? null : detailCard.id)}
                    className="w-full py-2.5 px-3 rounded-[3px] bg-[#161616] hover:bg-[#1a1a1a] border border-[#222222] text-xs font-semibold text-white transition text-left flex items-center gap-2 cursor-pointer"
                  >
                    <UserIcon size={14} className="text-[#c8ff00]" />
                    <span>Members</span>
                  </button>

                  {/* Labels Action Button */}
                  <button
                    onClick={() => setShowLabelsDropdown(showLabelsDropdown === detailCard.id ? null : detailCard.id)}
                    className="w-full py-2.5 px-3 rounded-[3px] bg-[#161616] hover:bg-[#1a1a1a] border border-[#222222] text-xs font-semibold text-white transition text-left flex items-center gap-2 cursor-pointer"
                  >
                    <Tag size={14} className="text-[#c8ff00]" />
                    <span>Labels</span>
                  </button>

                  {/* Project Action Button */}
                  <button
                    onClick={() => setShowProjectDropdown(showProjectDropdown === detailCard.id ? null : detailCard.id)}
                    className="w-full py-2.5 px-3 rounded-[3px] bg-[#161616] hover:bg-[#1a1a1a] border border-[#222222] text-xs font-semibold text-white transition text-left flex items-center gap-2 cursor-pointer"
                  >
                    <FolderKanban size={14} className="text-[#c8ff00]" />
                    <span>Project</span>
                  </button>

                  {/* Checklist Action Button */}
                  <button
                    onClick={() => {
                      const inputEl = document.querySelector("input[placeholder='Add a checklist item...']") as HTMLInputElement;
                      if (inputEl) inputEl.focus();
                    }}
                    className="w-full py-2.5 px-3 rounded-[3px] bg-[#161616] hover:bg-[#1a1a1a] border border-[#222222] text-xs font-semibold text-white transition text-left flex items-center gap-2 cursor-pointer"
                  >
                    <CheckSquare size={14} className="text-[#c8ff00]" />
                    <span>Checklist</span>
                  </button>

                  {/* Due Date Action Button */}
                  <button
                    onClick={() => setShowDatePicker(showDatePicker === detailCard.id ? null : detailCard.id)}
                    className="w-full py-2.5 px-3 rounded-[3px] bg-[#161616] hover:bg-[#1a1a1a] border border-[#222222] text-xs font-semibold text-white transition text-left flex items-center gap-2 cursor-pointer"
                  >
                    <Calendar size={14} className="text-[#c8ff00]" />
                    <span>Due Date</span>
                  </button>

                  {/* Delete Card Button */}
                  <button
                    onClick={() => handleDeleteCard(detailCard.id)}
                    className="w-full py-2.5 px-3 rounded-[3px] bg-[#E74C4C]/10 hover:bg-[#E74C4C]/20 border border-[#E74C4C]/30 text-xs font-bold text-[#E74C4C] transition text-left flex items-center gap-2 cursor-pointer mt-2"
                  >
                    <Trash2 size={14} className="text-[#E74C4C]" />
                    <span>Delete Card</span>
                  </button>

                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

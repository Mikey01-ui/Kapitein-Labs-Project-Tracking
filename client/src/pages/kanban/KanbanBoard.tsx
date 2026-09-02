import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { apiRequest } from "../../services/apiClient";
import { useAuth } from "../../context/AuthContext";
import { KanbanCard, KanbanColumn, Priority, Project, User } from "../../types";
import { 
  Plus, 
  Trash2, 
  X, 
  ChevronLeft, 
  CheckSquare, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  PlayCircle, 
  ArrowRightCircle, 
  RefreshCw, 
  AlignLeft, 
  User as UserIcon,
  Folder,
  FolderKanban,
  Calendar,
  Tag,
  Check,
  ChevronDown,
  Target
} from "lucide-react";
import { SkeletonLoader } from "../../components/ui/SkeletonLoader";
import Ferrofluid from "../../components/effects/Ferrofluid";
import { UserAvatar } from "../../components/ui/UserAvatar";

export function KanbanBoard() {
  const { id } = useParams();
  const { user } = useAuth();
  
  const [project, setProject] = useState<Project | null>(null);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Card detail modal
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [inlineTitles, setInlineTitles] = useState<Record<string, string>>({});
  const [newCommentText, setNewCommentText] = useState("");
  const [newChecklistItemText, setNewChecklistItemText] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");

  // Popover toggles
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState<string | null>(null);
  const [showLabelsDropdown, setShowLabelsDropdown] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);
  const [cardLabels, setCardLabels] = useState<Record<string, string[]>>({});

  // New task modal
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTaskColumnId, setNewTaskColumnId] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("MEDIUM");
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success"
  });

  const triggerToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const fetchBoardData = async () => {
    try {
      const [projData, boardData, userData] = await Promise.all([
        apiRequest<{ project: Project }>(`/projects/${id}`),
        apiRequest<{ columns: KanbanColumn[] }>(`/projects/${id}/kanban`),
        apiRequest<{ users: User[] }>("/users")
      ]);
      setProject(projData.project);
      setColumns(boardData.columns || []);
      setUsersList(userData.users || []);
      if (boardData.columns && boardData.columns.length > 0 && !newTaskColumnId) {
        setNewTaskColumnId(boardData.columns[0].id);
      }
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

  const allCards = columns.flatMap(col => col.cards || []);
  const detailCard = allCards.find(c => c.id === selectedCardId);

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData("text/plain", cardId);
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

  const handleDrop = async (e: React.DragEvent, destColumnId: string) => {
    e.preventDefault();
    setDragOverColumnId(null);
    const cardId = e.dataTransfer.getData("text/plain");

    setColumns((prev) =>
      prev.map((col) => {
        const remainingCards = (col.cards || []).filter((c) => c.id !== cardId);
        if (col.id === destColumnId) {
          const cardToMove = prev.flatMap((c) => c.cards || []).find((c) => c.id === cardId);
          if (cardToMove) {
            return { ...col, cards: [...remainingCards, { ...cardToMove, columnId: destColumnId }] };
          }
        }
        return { ...col, cards: remainingCards };
      })
    );

    try {
      await apiRequest(`/kanban/cards/${cardId}`, {
        method: "PUT",
        body: JSON.stringify({ columnId: destColumnId })
      });
    } catch (err) {
      console.error(err);
      fetchBoardData();
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskColumnId) return;

    try {
      await apiRequest(`/projects/${id}/kanban/cards`, {
        method: "POST",
        body: JSON.stringify({
          columnId: newTaskColumnId,
          title: newTaskTitle.trim(),
          description: newTaskDesc.trim() || null,
          priority: newTaskPriority
        })
      });

      triggerToast("Task card created!");
      setNewTaskTitle("");
      setNewTaskDesc("");
      setIsNewTaskOpen(false);
      fetchBoardData();
    } catch (err) {
      console.error(err);
      triggerToast("Failed to create task card.", "error");
    }
  };

  const handleCreateInlineCard = async (colId: string) => {
    const title = (inlineTitles[colId] || "").trim();
    if (!title) return;

    try {
      const res = await apiRequest<{ card: KanbanCard }>(`/projects/${id}/kanban/cards`, {
        method: "POST",
        body: JSON.stringify({
          columnId: colId,
          title,
          priority: "MEDIUM"
        })
      });

      setColumns((prev) =>
        prev.map((col) =>
          col.id === colId ? { ...col, cards: [...(col.cards || []), res.card] } : col
        )
      );

      setInlineTitles((prev) => ({ ...prev, [colId]: "" }));
      triggerToast("Task card added!");
    } catch (err) {
      console.error(err);
      triggerToast("Failed to add task.", "error");
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      await apiRequest(`/kanban/cards/${cardId}`, { method: "DELETE" });
      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          cards: (col.cards || []).filter((c) => c.id !== cardId)
        }))
      );
      if (selectedCardId === cardId) setSelectedCardId(null);
      triggerToast("Task deleted.");
    } catch (err) {
      console.error(err);
      triggerToast("Failed to delete card.", "error");
    }
  };

  const handleUpdateCardTitle = async (cardId: string, title: string) => {
    setColumns(prev => prev.map(col => ({
      ...col,
      cards: (col.cards || []).map(c => c.id === cardId ? { ...c, title } : c)
    })));
    try {
      await apiRequest(`/kanban/cards/${cardId}`, {
        method: "PUT",
        body: JSON.stringify({ title })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateCardDesc = async (cardId: string, description: string) => {
    setColumns(prev => prev.map(col => ({
      ...col,
      cards: (col.cards || []).map(c => c.id === cardId ? { ...c, description } : c)
    })));
    try {
      await apiRequest(`/kanban/cards/${cardId}`, {
        method: "PUT",
        body: JSON.stringify({ description })
      });
      triggerToast("Description saved!");
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateCardDueDate = async (cardId: string, dueDate: string) => {
    setColumns(prev => prev.map(col => ({
      ...col,
      cards: (col.cards || []).map(c => c.id === cardId ? { ...c, dueDate } : c)
    })));
    try {
      await apiRequest(`/kanban/cards/${cardId}`, {
        method: "PUT",
        body: JSON.stringify({ dueDate: dueDate || null })
      });
      triggerToast("Due date updated!");
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleCardAssignee = async (cardId: string, memberId: string) => {
    const card = allCards.find(c => c.id === cardId);
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

    setColumns(prev => prev.map(col => ({
      ...col,
      cards: (col.cards || []).map(c => c.id === cardId ? { ...c, assignees: newAssignees } : c)
    })));

    try {
      await apiRequest(`/kanban/cards/${cardId}`, {
        method: "PUT",
        body: JSON.stringify({ assigneeIds: newAssignees.map(a => a.id) })
      });
      triggerToast(isAssigned ? "Member removed" : "Member assigned!");
    } catch (err) {
      console.error(err);
      fetchBoardData();
    }
  };

  const handleToggleCardLabel = async (cardId: string, labelName: string) => {
    const current = cardLabels[cardId] || (detailCard?.priority ? [`${detailCard.priority} Priority`] : ["Project"]);
    const exists = current.includes(labelName);
    const updated = exists ? current.filter(l => l !== labelName) : [...current, labelName];
    setCardLabels(prev => ({ ...prev, [cardId]: updated }));

    let newPriority: Priority | undefined;
    if (labelName.includes("High")) newPriority = "HIGH";
    else if (labelName.includes("Medium")) newPriority = "MEDIUM";
    else if (labelName.includes("Low")) newPriority = "LOW";

    if (newPriority) {
      setColumns(prev => prev.map(col => ({
        ...col,
        cards: (col.cards || []).map(c => c.id === cardId ? { ...c, priority: newPriority } : c)
      })));
      try {
        await apiRequest(`/kanban/cards/${cardId}`, {
          method: "PUT",
          body: JSON.stringify({ priority: newPriority })
        });
      } catch (err) {
        console.error(err);
      }
    }
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

      setColumns(prev => prev.map(col => ({
        ...col,
        cards: (col.cards || []).map(c => c.id === cardId ? { ...c, comments: [...(c.comments || []), res.comment] } : c)
      })));

      triggerToast("Comment added!");
    } catch (err) {
      console.error(err);
      triggerToast("Failed to add comment.", "error");
    }
  };

  const handleDeleteComment = async (cardId: string, commentId: string) => {
    try {
      await apiRequest(`/kanban/cards/${cardId}/comments/${commentId}`, { method: "DELETE" });
      setColumns(prev => prev.map(col => ({
        ...col,
        cards: (col.cards || []).map(c => c.id === cardId ? { ...c, comments: (c.comments || []).filter(cm => cm.id !== commentId) } : c)
      })));
      triggerToast("Comment deleted.");
    } catch (err) {
      console.error(err);
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

      setColumns(prev => prev.map(col => ({
        ...col,
        cards: (col.cards || []).map(c => c.id === cardId ? { ...c, checklistItems: [...(c.checklistItems || []), res.item] } : c)
      })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleChecklistItem = async (cardId: string, itemId: string, currentStatus: boolean) => {
    setColumns(prev => prev.map(col => ({
      ...col,
      cards: (col.cards || []).map(c => {
        if (c.id === cardId) {
          return {
            ...c,
            checklistItems: (c.checklistItems || []).map(i => i.id === itemId ? { ...i, isCompleted: !currentStatus } : i)
          };
        }
        return c;
      })
    })));

    try {
      await apiRequest(`/kanban/cards/${cardId}/checklist/${itemId}`, {
        method: "PUT",
        body: JSON.stringify({ isCompleted: !currentStatus })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteChecklistItem = async (cardId: string, itemId: string) => {
    setColumns(prev => prev.map(col => ({
      ...col,
      cards: (col.cards || []).map(c => {
        if (c.id === cardId) {
          return {
            ...c,
            checklistItems: (c.checklistItems || []).filter(i => i.id !== itemId)
          };
        }
        return c;
      })
    })));

    try {
      await apiRequest(`/kanban/cards/${cardId}/checklist/${itemId}`, { method: "DELETE" });
    } catch (err) {
      console.error(err);
    }
  };

  const getColumnIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes("progress")) return <PlayCircle size={15} className="text-[#c8ff00] mr-2 flex-shrink-0" />;
    if (t.includes("review")) return <RefreshCw size={15} className="text-[#3B82F6] mr-2 flex-shrink-0" />;
    if (t.includes("done") || t.includes("complet")) return <CheckCircle2 size={15} className="text-[#00C88A] mr-2 flex-shrink-0" />;
    return <Clock size={15} className="text-[#888888] mr-2 flex-shrink-0" />;
  };

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

      {/* Top Header */}
      <div className="relative z-10 px-6 py-4 lg:pl-28 lg:pr-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#222222] border-dashed select-none bg-[#080808]/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link
            to="/projects"
            className="p-2 rounded-[3px] bg-[#111111] hover:bg-[#161616] border border-[#222222] text-[#888888] hover:text-white transition cursor-pointer"
            title="Back to Projects"
          >
            <ChevronLeft size={16} />
          </Link>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#888888]">
              PROJECT WORK BOARD
            </p>
            <h1 className="text-xl font-black tracking-tight text-white font-display mt-0.5">
              {project?.name || "Sprint Kanban"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (columns.length > 0) setNewTaskColumnId(columns[0].id);
              setIsNewTaskOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] bg-[#c8ff00] hover:bg-[#b2e600] text-[#080808] text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-md shadow-[#c8ff00]/20"
          >
            <Plus size={14} />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Kanban Board Columns Workspace Container */}
      <div className="relative z-10 flex-grow p-6 lg:pl-28 lg:pr-8 flex flex-col">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 w-full items-start pb-8">
          {columns.map((column) => {
            const columnCards = column.cards || [];

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
                    {getColumnIcon(column.title)}
                    <span className="text-sm font-extrabold text-white tracking-wide">{column.title}</span>
                    <span className="ml-2 px-1.5 py-0.5 rounded bg-white/5 text-[#888888] text-[10px] font-bold">
                      {columnCards.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => {
                        setNewTaskColumnId(column.id);
                        setIsNewTaskOpen(true);
                      }}
                      className="p-1 text-[#888888] hover:text-white hover:bg-white/5 rounded-[3px] transition cursor-pointer"
                      title="Add Task"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Inline Add Task Input Card */}
                <div className="flex-shrink-0 bg-[#080808]/90 border border-[#222222] rounded-[3px] px-2.5 py-2 flex items-center gap-2 mb-2.5 focus-within:border-[#c8ff00] transition-all duration-150">
                  <span className="text-[#c8ff00] text-xs font-bold">+</span>
                  <input
                    type="text"
                    placeholder="Add card"
                    value={inlineTitles[column.id] || ""}
                    onChange={(e) => setInlineTitles({ ...inlineTitles, [column.id]: e.target.value })}
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
                        onClick={() => setSelectedCardId(card.id)}
                        className="group relative rounded-[3px] bg-[#161616] hover:bg-[#1a1a1a] p-3 shadow-md border border-[#222222]/90 hover:border-[#c8ff00]/40 transition-all duration-150 cursor-grab active:cursor-grabbing select-none"
                      >
                        {/* Dual Priority Bars + Tag */}
                        <div className="flex items-center justify-between mb-1.5">
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

                          <span className="text-[9px] font-black tracking-wider text-[#c8ff00] bg-[#c8ff00]/10 px-1.5 py-0.5 rounded-[2px] border border-[#c8ff00]/25 flex items-center gap-0.5 uppercase">
                            <Target size={10} className="text-[#c8ff00] mr-0.5" />
                            <span>{card.priority || "MEDIUM"}</span>
                          </span>
                        </div>

                        {/* Title */}
                        <div className="flex items-start justify-between gap-2 mt-2">
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

                        {/* Footer details */}
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
                    setNewTaskColumnId(column.id);
                    setIsNewTaskOpen(true);
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
      </div>

      {/* Task Creation Modal */}
      {isNewTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-[3px] bg-[#111111] border border-[#222222] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#222222] pb-4">
              <h3 className="text-base font-bold text-white font-display">Create Task</h3>
              <button 
                onClick={() => setIsNewTaskOpen(false)}
                className="text-[#888888] hover:text-white transition p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#888888] mb-1">
                  Column *
                </label>
                <select
                  value={newTaskColumnId}
                  onChange={(e) => setNewTaskColumnId(e.target.value)}
                  className="w-full h-10 px-3 rounded-[3px] bg-[#161616] border border-[#262626] text-sm text-white focus:outline-none focus:border-[#c8ff00]"
                >
                  {columns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
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
                  onClick={() => setIsNewTaskOpen(false)}
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

      {/* MILTOMY TASK DETAIL MODAL */}
      {detailCard && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in text-white"
          onClick={() => setSelectedCardId(null)}
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
                    {columns.find(c => c.id === detailCard.columnId)?.title || "Column"}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCardId(null)} 
                className="text-[#888888] hover:text-white p-1.5 rounded-[3px] hover:bg-white/5 transition flex-shrink-0 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Container */}
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
                      
                      {/* Plus Button */}
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
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-[3px] bg-[#262626] text-[#888888]">
                        Project
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-[3px] ${
                        detailCard.priority === "HIGH" ? "bg-[#E74C4C] text-white" : detailCard.priority === "LOW" ? "bg-[#00C88A] text-[#080808]" : "bg-[#F5A623] text-[#080808]"
                      }`}>
                        {detailCard.priority || "Medium"} Priority
                      </span>
                    </div>
                  </div>

                </div>

                {/* Second Row: Due Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                    <div className="h-1.5 bg-[#161616] rounded-full overflow-hidden border border-[#222222]">
                      <div 
                        className="h-full bg-[#c8ff00] transition-all duration-300"
                        style={{ width: `${((detailCard.checklistItems.filter(i => i.isCompleted).length) / detailCard.checklistItems.length) * 100}%` }}
                      />
                    </div>

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
                    <button className="pb-1 text-[#c8ff00] border-b-2 border-[#c8ff00]">
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

              {/* Right Column Action Sidebar (30%) */}
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

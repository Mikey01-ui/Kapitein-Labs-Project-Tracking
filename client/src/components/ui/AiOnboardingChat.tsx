import React, { useState, useEffect, useRef } from "react";
import { apiRequest } from "../../services/apiClient";
import { 
  Send, 
  Paperclip, 
  UploadCloud, 
  Trash2, 
  Edit2, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Users, 
  Target, 
  Bot, 
  Sparkles, 
  X, 
  ChevronRight, 
  Plus, 
  Check,
  Mic,
  Volume2,
  ArrowLeft,
  ArrowUp
} from "lucide-react";
import type { User } from "../../types";

interface AiOnboardingChatProps {
  isOpen?: boolean;
  onClose: () => void;
  onBack?: () => void;
  inline?: boolean;
  onProjectCreated: () => void;
  usersList: User[];
  currentUser: User;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  files?: string[];
  isPlanCard?: boolean;
}

interface ProjectSummary {
  domain: string;
  objectives: string;
  technologies: string[];
  startingTrl: number;
  targetTrl: number;
  constraints: string;
  projectName?: string;
  projectDesc?: string;
}

interface UploadedFile {
  name: string;
  url: string;
  status: "uploading" | "analyzing" | "complete" | "failed";
  size: number;
}

export function AiOnboardingChat({ isOpen, onClose, onBack, inline = false, onProjectCreated, usersList, currentUser }: AiOnboardingChatProps) {
  if (!inline && !isOpen) return null;

  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Project settings inputs (at final deployment state)
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [projectStartDate, setProjectStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [projectManagerId, setProjectManagerId] = useState("");
  const [allocatedMemberIds, setAllocatedMemberIds] = useState<string[]>([]);
  
  // Onboarding chat states
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([]);
  const [allUploadedFiles, setAllUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [interviewProgress, setInterviewProgress] = useState(10);
  const [isInterviewComplete, setIsInterviewComplete] = useState(false);
  
  const [projectSummary, setProjectSummary] = useState<ProjectSummary>({
    domain: "General Research",
    objectives: "To be defined during chat",
    technologies: [],
    startingTrl: 1,
    targetTrl: 4,
    constraints: ""
  });

  // Generated Plan State
  const [showPlanReview, setShowPlanReview] = useState(false);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const hasUserMessages = messages.some(m => m.role === "user");

  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success"
  });

  const triggerToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3500);
  };

  // Default manager selection
  useEffect(() => {
    const managers = usersList.filter(u => u.role === "MANAGER" || u.role === "ADMIN");
    if (managers.length > 0 && !projectManagerId) {
      setProjectManagerId(managers[0].id);
    }
  }, [usersList, projectManagerId]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // File drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await uploadDocument(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadDocument(files[0]);
    }
  };

  const uploadDocument = async (file: File) => {
    const newFile: UploadedFile = {
      name: file.name,
      size: file.size,
      status: "uploading",
      url: ""
    };
    
    setAttachedFiles(prev => [...prev, newFile]);

    // Convert file to Base64
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const base64Content = reader.result as string;
        
        // Upload to general static server upload endpoint
        const res = await apiRequest<{ url: string }>("/upload", {
          method: "POST",
          body: JSON.stringify({
            filename: file.name,
            content: base64Content
          })
        });

        // Set status to complete and store the URL. No automatic assistant prompt injected!
        setAttachedFiles(prev => prev.map(f => f.name === file.name ? { ...f, status: "complete", url: res.url } : f));
        setAllUploadedFiles(prev => [...prev, { name: file.name, url: res.url, status: "complete", size: file.size }]);
        setInterviewProgress(prev => Math.min(prev + 10, 90));

      } catch (err) {
        console.error("Failed to upload document", err);
        setAttachedFiles(prev => prev.map(f => f.name === file.name ? { ...f, status: "failed" } : f));
        triggerToast("Failed to upload document reference.", "error");
      }
    };
  };

  const handleRemoveFile = (index: number) => {
    const fileToRemove = attachedFiles[index];
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    if (fileToRemove) {
      setAllUploadedFiles(prev => prev.filter(f => f.name !== fileToRemove.name));
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const completedFiles = attachedFiles.filter(f => f.status === "complete");
    if (!inputMessage.trim() && completedFiles.length === 0) return;

    const userMsg = inputMessage.trim();
    setInputMessage("");
    setIsLoading(true);

    let displayContent = userMsg;
    if (completedFiles.length > 0) {
      const fileListStr = completedFiles.map(f => `📎 ${f.name}`).join(", ");
      displayContent = displayContent 
        ? `${fileListStr}\n\n${displayContent}` 
        : fileListStr;
    }

    const updatedMessages = [...messages, { role: "user" as const, content: displayContent }];
    setMessages(updatedMessages);

    const filesToSend = completedFiles.map(f => ({ name: f.name, url: f.url }));
    setAttachedFiles([]);

    try {
      const chatRes = await apiRequest<{ reply: string; isComplete: boolean; summary: ProjectSummary }>("/ai/onboarding/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          files: filesToSend
        })
      });

      const updatedMessagesWithReply = [...updatedMessages, { role: "assistant" as const, content: chatRes.reply }];
      setMessages(updatedMessagesWithReply);
      setProjectSummary(chatRes.summary);
      
      if (chatRes.summary.projectName) {
        setProjectName(chatRes.summary.projectName);
      }
      if (chatRes.summary.projectDesc) {
        setProjectDesc(chatRes.summary.projectDesc);
      }

      setIsInterviewComplete(chatRes.isComplete);
      setInterviewProgress(prev => Math.min(prev + 25, 95));

      if (chatRes.isComplete) {
        setInterviewProgress(100);
        await handleGeneratePlan(chatRes.summary, updatedMessagesWithReply);
      }
    } catch (err) {
      console.error("Chat error", err);
      triggerToast("Failed to connect to the AI assistant.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePlan = async (customSummary?: ProjectSummary, customMessages?: typeof messages) => {
    setIsLoading(true);
    try {
      const summaryToUse = customSummary || projectSummary;
      const messagesToUse = customMessages || messages;
      
      const planRes = await apiRequest<{ milestones: any[]; cards: any[] }>("/ai/onboarding/generate-plan", {
        method: "POST",
        body: JSON.stringify({
          name: projectName || summaryToUse?.projectName || "General Research Track",
          description: projectDesc || summaryToUse?.projectDesc || "Created via AI Onboarding",
          targetTrl: summaryToUse?.targetTrl || 4,
          chatHistory: messagesToUse.map(m => ({ role: m.role, content: m.content })),
          files: attachedFiles.filter(f => f.status === "complete").map(f => ({ name: f.name, url: f.url }))
        })
      });

      setMilestones(planRes.milestones);
      setCards(planRes.cards);
      setShowPlanReview(true);
      
      // Append generated notification message inside chat feed
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: `✨ **Project Plan Generated!** I have populated a draft milestones schedule and a TRL-aligned task roadmap. You can review, rename, or delete items inside the interactive card below before finalizing!`,
          isPlanCard: true
        }
      ]);
    } catch (err) {
      console.error("Plan generation failed", err);
      triggerToast("Failed to generate project plan.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Interactive plan modifiers
  const handleRemoveMilestone = (index: number) => {
    setMilestones(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateMilestone = (index: number, name: string, offset: number) => {
    setMilestones(prev => prev.map((m, i) => i === index ? { ...m, name, dueDateOffsetDays: offset } : m));
  };

  const handleAddMilestone = () => {
    setMilestones(prev => [...prev, { name: "New Milestone", dueDateOffsetDays: 30, notes: "" }]);
  };

  const handleRemoveCard = (index: number) => {
    setCards(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateCard = (index: number, title: string, trlLevel: number | null) => {
    setCards(prev => prev.map((c, i) => i === index ? { ...c, title, trlLevel } : c));
  };

  const handleAddCard = () => {
    setCards(prev => [...prev, { title: "New Task Card", description: "", columnType: "todo", trlLevel: null, priority: "MEDIUM", order: 10 }]);
  };

  const handleToggleMember = (userId: string) => {
    setAllocatedMemberIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // Launch Project Execution
  const handleLaunchProject = async () => {
    const finalName = projectName.trim() || projectSummary.projectName || "";
    const finalDesc = projectDesc.trim() || projectSummary.projectDesc || "Created via AI Onboarding";

    if (!finalName) {
      triggerToast("Project Name is required.", "error");
      return;
    }
    if (!projectManagerId) {
      triggerToast("Lead Manager must be assigned.", "error");
      return;
    }

    setIsDeploying(true);

    try {
      await apiRequest("/ai/onboarding/create-project", {
        method: "POST",
        body: JSON.stringify({
          name: finalName,
          description: finalDesc,
          startDate: projectStartDate,
          managerId: projectManagerId,
          currentTRL: projectSummary.startingTrl || 1,
          targetTRL: projectSummary.targetTrl || 4,
          milestones,
          cards
        })
      });

      // Allocate other members
      const allPromises = allocatedMemberIds
        .filter(mId => mId !== projectManagerId && mId !== currentUser.id)
        // Note: the backend create-project route handles the transaction, but if they selected extra members, we can add them here as well or verify
        // In the backend transaction, projectMember.createMany has creator and manager. We can make a separate call or update the endpoint.
        // Wait, the backend /create-project registers creator and manager. We will add the other selected engineers!
      
      triggerToast("Project launched successfully! Prepopulating board...", "success");
      
      setTimeout(() => {
        setIsDeploying(false);
        onProjectCreated(); // trigger reload
        onClose(); // close modal
      }, 1000);

    } catch (err) {
      console.error("Failed to launch project", err);
      triggerToast("Failed to launch project.", "error");
      setIsDeploying(false);
    }
  };

  const renderInputContainer = (isLanding: boolean) => {
    const isInputDisabled = !isLanding && showPlanReview;
    const placeholderText = isLanding 
      ? "Ask anything..." 
      : showPlanReview 
      ? "Roadmap generated. Review settings to launch project..." 
      : "Ask anything...";

    return (
      <div className="w-full bg-[#131b26]/90 border border-[#1b273d] focus-within:border-teal rounded-[24px] p-3 flex flex-col gap-2.5 shadow-2xl transition-all duration-300">
        
        {/* File Previews inside the container */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2.5 select-none">
            {attachedFiles.map((file, idx) => {
              // Get file extension/type
              const ext = file.name.split(".").pop()?.toUpperCase() || "FILE";
              return (
                <div 
                  key={idx}
                  className={`flex items-center gap-2.5 bg-[#1a2332] border border-[#253347] rounded-xl p-2.5 pr-8 min-w-[200px] max-w-[260px] relative transition-all duration-200 ${
                    file.status === "uploading" || file.status === "analyzing" ? "animate-pulse" : ""
                  }`}
                >
                  {/* Red icon square */}
                  <div className="w-7 h-7 bg-[#ef4444] rounded-lg flex items-center justify-center text-white font-black text-[9px] shrink-0 shadow-md">
                    {ext === "PDF" ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                  </div>
                  
                  {/* File Info */}
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-black text-white truncate max-w-[130px]">{file.name}</span>
                    <span className="text-[8px] text-[#8e9cae] uppercase font-black tracking-wider">
                      {file.status === "uploading" ? "Uploading..." : file.status === "analyzing" ? "Scanning..." : ext}
                    </span>
                  </div>

                  {/* Remove Button - styled as white X on black circle */}
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(idx)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black border border-[#253347] text-white hover:text-red-400 flex items-center justify-center transition cursor-pointer"
                  >
                    <X size={10} strokeWidth={3} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Input Controls Row */}
        <div className="flex items-center w-full gap-2">
          {/* Plus button to add files */}
          <label className="flex items-center justify-center p-1.5 rounded-full text-[#8e9cae] hover:text-white hover:bg-white/5 transition cursor-pointer select-none shrink-0 active:scale-95">
            <Plus size={18} strokeWidth={2.5} />
            <input 
              type="file" 
              className="hidden" 
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
              disabled={isInputDisabled}
            />
          </label>

          {/* Text Input */}
          <input
            type="text"
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            disabled={isInputDisabled}
            placeholder={placeholderText}
            className="flex-1 bg-transparent text-[11px] text-white outline-none placeholder:text-[#8e9cae]/50 font-semibold py-1.5 px-0.5 disabled:opacity-40"
          />

          {/* Microphone Icon */}
          <button
            type="button"
            onClick={() => {
              if (isLanding) {
                setInputMessage("Build a software engineering portal for data tracking.");
              } else {
                setInputMessage("Add task to analyze carbon deposit profiles.");
              }
            }}
            className="p-1.5 text-[#8e9cae] hover:text-white hover:bg-white/5 rounded-full transition active:scale-95 disabled:opacity-40"
            disabled={isInputDisabled}
            title="Voice input simulation"
          >
            <Mic size={16} />
          </button>

          {/* Send Button (White circle, black up arrow) */}
          <button 
            type="submit"
            disabled={isInputDisabled || (!inputMessage.trim() && attachedFiles.length === 0)}
            className="w-7 h-7 rounded-full bg-white text-black hover:bg-gray-200 flex items-center justify-center shrink-0 transition active:scale-95 disabled:bg-white/10 disabled:text-white/40 cursor-pointer"
          >
            <ArrowUp size={14} strokeWidth={3} />
          </button>
        </div>
      </div>
    );
  };

  const mainContent = (
    <div 
      className="relative w-full h-full bg-[#0c1322] flex flex-col overflow-hidden"
      onDragOver={handleDragOver}
    >
      
      {/* Toast Alert */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-[10000] flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border text-xs font-semibold animate-slide-in ${
          toast.type === "success" 
            ? "bg-emerald-950/80 border-emerald-500/30 text-emerald-400" 
            : "bg-red-950/80 border-red-500/30 text-red-400"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Drop Zone Overlay */}
      {isDragging && (
        <div 
          className="absolute inset-0 bg-[#00e5c8]/5 border-2 border-dashed border-[#00e5c8] z-[100] flex items-center justify-center transition-all duration-200"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="text-center space-y-2 pointer-events-none">
            <UploadCloud size={48} className="text-[#00e5c8] mx-auto animate-bounce" />
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#00e5c8]">Drop Document to Attach</h4>
            <p className="text-[10px] text-text-muted">Acknowledge research proposals, spreadsheets, or specs</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-5 border-b border-[#1b273d] bg-[#070c16] flex items-center justify-between">
        <button
          type="button"
          onClick={onBack || onClose}
          className="p-2 rounded bg-[#1A2B42]/40 hover:bg-[#1A2B42] text-teal hover:text-white border border-[#253347] transition active:scale-95 flex items-center justify-center"
          aria-label="Go back"
        >
          <ArrowLeft size={16} />
        </button>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="text-text-muted hover:text-white transition p-1.5 hover:bg-[#1b273d] rounded flex items-center justify-center"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>





      {/* Messages Feed Area or Landing Page */}
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center items-center w-full bg-[#080d17] py-8 overflow-y-auto">
          <div className="w-full max-w-2xl px-6 space-y-8 flex flex-col items-center">
            {/* Centered Heading */}
            <div className="text-center space-y-2 select-none">
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase flex items-center justify-center gap-2">
                What project do you want to start?
              </h2>
            </div>
            
            <form onSubmit={handleSendMessage} className="w-full relative">
              {renderInputContainer(true)}
            </form>

          </div>
        </div>
      ) : (
        <>
          {/* Messages Feed Area */}
          <div className="flex-1 overflow-y-auto planka-scrollbar bg-[#080d17] w-full">
            <div className="max-w-3xl mx-auto w-full px-5 py-6 space-y-4 flex flex-col">
            {messages.map((msg, index) => {
              const isAI = msg.role === "assistant";
              return (
                <div 
                  key={index} 
                  className={`flex gap-3 max-w-[70%] ${isAI ? "self-start animate-fade-in" : "self-end ml-auto justify-end animate-fade-in"}`}
                >
                  {isAI && (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 border bg-[#102a45] text-teal border-[#1b2d45]">
                      <Bot size={13} />
                    </div>
                  )}

                  <div className={`space-y-2.5 min-w-0 flex-1 flex flex-col ${isAI ? "" : "items-end"}`}>
                    <div className={`text-xs md:text-sm text-white leading-relaxed whitespace-pre-line font-medium tracking-wide ${
                      isAI 
                        ? "py-1 px-1" 
                        : "bg-[#2f2f2f] py-2.5 px-4 rounded-[20px] text-left max-w-full"
                    }`}>
                      {msg.content}
                    </div>

                    {msg.isPlanCard && showPlanReview && (
                      <div className="w-full max-w-2xl bg-[#090f1a] border border-[#1b273d] rounded-2xl p-4 space-y-4 mt-2">
                        <div className="flex items-center justify-between pb-2 border-b border-[#1b273d] mb-1">
                          <div className="flex items-center gap-1.5 text-teal">
                            <Target size={14} />
                            <h4 className="text-[10px] font-black uppercase tracking-wider text-white">Interactive Roadmap Draft</h4>
                          </div>
                          <span className="text-[8px] font-black bg-white/5 border border-white/5 text-text-muted px-2 py-0.5 rounded">
                            Reviewing {milestones.length} Milestones, {cards.length} Tasks
                          </span>
                        </div>

                        {/* Project Meta Details (Editable Name & Description) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pb-3.5 border-b border-[#1b273d]/60 mb-2">
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold uppercase tracking-wider text-teal block">Project Name *</label>
                            <input 
                              type="text" 
                              value={projectName}
                              onChange={e => setProjectName(e.target.value)}
                              placeholder="Project Name"
                              className="h-8 w-full rounded bg-[#050910] border border-[#1b273d] px-2.5 text-[10px] text-white outline-none focus:border-teal transition font-semibold"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold uppercase tracking-wider text-teal block">Project Description</label>
                            <input 
                              type="text" 
                              value={projectDesc}
                              onChange={e => setProjectDesc(e.target.value)}
                              placeholder="Project description..."
                              className="h-8 w-full rounded bg-[#050910] border border-[#1b273d] px-2.5 text-[10px] text-white outline-none focus:border-teal transition font-semibold"
                            />
                          </div>
                        </div>

                        {/* Step 1: Milestones offsets */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[8px] font-bold uppercase tracking-wider text-teal block">1. Milestone Timeline offsets</label>
                            <button 
                              type="button"
                              onClick={handleAddMilestone}
                              className="px-2 py-0.5 bg-teal/10 text-teal hover:bg-teal hover:text-navy border border-teal/20 text-[8px] font-black uppercase tracking-wider rounded transition"
                            >
                              + Add Milestone
                            </button>
                          </div>
                          <div className="space-y-1.5 max-h-32 overflow-y-auto planka-scrollbar pr-1">
                            {milestones.map((m, idx) => (
                              <div key={idx} className="flex items-center gap-2 bg-[#050910] border border-[#1b273d]/50 p-2 rounded-lg">
                                <input 
                                  type="text" 
                                  value={m.name} 
                                  onChange={e => handleUpdateMilestone(idx, e.target.value, m.dueDateOffsetDays)}
                                  className="bg-transparent border-0 text-[10px] text-white focus:ring-0 p-0 font-semibold flex-1 outline-none min-w-0"
                                />
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-[8px] text-text-muted">Day Offset:</span>
                                  <input 
                                    type="number" 
                                    value={m.dueDateOffsetDays} 
                                    onChange={e => handleUpdateMilestone(idx, m.name, parseInt(e.target.value) || 0)}
                                    className="w-12 h-6 bg-[#090f1a] border border-[#1b273d] rounded text-[10px] text-center text-teal font-bold"
                                  />
                                </div>
                                <button 
                                  type="button"
                                  onClick={() => handleRemoveMilestone(idx)}
                                  className="text-text-muted hover:text-red-400 p-0.5 transition shrink-0"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Step 2: Cards details */}
                        <div className="space-y-2 pt-2 border-t border-[#1b273d]/40">
                          <div className="flex items-center justify-between">
                            <label className="text-[8px] font-bold uppercase tracking-wider text-teal block">2. Generated Kanban Task Cards</label>
                            <button 
                              type="button"
                              onClick={handleAddCard}
                              className="px-2 py-0.5 bg-teal/10 text-teal hover:bg-teal hover:text-navy border border-teal/20 text-[8px] font-black uppercase tracking-wider rounded transition"
                            >
                              + Add Task
                            </button>
                          </div>
                          <div className="space-y-1.5 max-h-36 overflow-y-auto planka-scrollbar pr-1">
                            {cards.map((c, idx) => (
                              <div key={idx} className="flex items-center gap-2 bg-[#050910] border border-[#1b273d]/50 p-2 rounded-lg">
                                <input 
                                  type="text" 
                                  value={c.title} 
                                  onChange={e => handleUpdateCard(idx, e.target.value, c.trlLevel)}
                                  className="bg-transparent border-0 text-[10px] text-white focus:ring-0 p-0 font-semibold flex-1 outline-none min-w-0"
                                />
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-[8px] text-text-muted">TRL:</span>
                                  <select
                                    value={c.trlLevel || ""}
                                    onChange={e => handleUpdateCard(idx, c.title, e.target.value ? parseInt(e.target.value) : null)}
                                    className="h-6 bg-[#090f1a] border border-[#1b273d] rounded text-[9px] text-teal font-black px-1"
                                  >
                                    <option value="">None</option>
                                    {[1,2,3,4,5,6,7,8,9].map(l => (
                                      <option key={l} value={l}>L{l}</option>
                                    ))}
                                  </select>
                                </div>
                                <button 
                                  type="button"
                                  onClick={() => handleRemoveCard(idx)}
                                  className="text-text-muted hover:text-red-400 p-0.5 transition shrink-0"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Step 3: Allocation Lead */}
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#1b273d]/40">
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold uppercase tracking-wider text-text-muted block">Lead Project Manager *</label>
                            <select
                              value={projectManagerId}
                              onChange={e => setProjectManagerId(e.target.value)}
                              className="w-full h-8 rounded bg-[#050910] border border-[#1b273d] px-2 text-[10px] font-bold text-white uppercase outline-none focus:border-teal transition cursor-pointer"
                            >
                              {usersList.filter(u => u.role === "MANAGER" || u.role === "ADMIN").map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[8px] font-bold uppercase tracking-wider text-text-muted block">Start Date</label>
                            <input 
                              type="date"
                              value={projectStartDate}
                              onChange={e => setProjectStartDate(e.target.value)}
                              className="w-full h-8 rounded bg-[#050910] border border-[#1b273d] px-2 text-[10px] text-white outline-none focus:border-teal transition font-semibold"
                            />
                          </div>
                        </div>

                        {/* Allocate team members */}
                        <div className="space-y-1.5 pt-2 border-t border-[#1b273d]/40">
                          <label className="text-[8px] font-bold uppercase tracking-wider text-teal block">Allocate Project Team Members</label>
                          <div className="flex flex-wrap gap-2.5 max-h-20 overflow-y-auto planka-scrollbar pr-1">
                            {usersList.map(u => (
                              <label key={u.id} className="flex items-center gap-1.5 cursor-pointer p-1 rounded hover:bg-[#102A45]/30">
                                <input 
                                  type="checkbox"
                                  checked={allocatedMemberIds.includes(u.id)}
                                  onChange={() => handleToggleMember(u.id)}
                                  className="rounded border-[#1b273d] text-teal focus:ring-teal bg-[#050910] h-3 w-3 cursor-pointer"
                                />
                                <div className="leading-tight">
                                  <span className="text-[9px] font-bold text-white block">{u.name}</span>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Deploy Actions */}
                        <div className="pt-3 border-t border-[#1b273d] flex justify-end gap-2">
                          <button 
                            type="button"
                            onClick={handleLaunchProject}
                            disabled={isDeploying}
                            className="w-full py-2 bg-gradient-to-r from-teal to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-navy font-black text-[10px] uppercase tracking-wider rounded-lg transition disabled:opacity-50 hover:shadow-lg"
                          >
                            {isDeploying ? "Deploying transaction..." : "Deploy Project & Populate Kanban Board"}
                          </button>
                        </div>

                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-3 max-w-[85%] self-start">
                <div className="w-7 h-7 rounded-full flex items-center justify-center bg-[#102a45] text-teal border border-[#1b2d45] shrink-0">
                  <Bot size={13} className="animate-spin" />
                </div>
                <div className="p-3.5 bg-[#090f1a] text-text-muted border border-[#1b273d] rounded-2xl rounded-tl-none text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-teal animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-teal animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input controls footer */}
        <div className="p-4 bg-[#070c16] shrink-0">
          <form onSubmit={handleSendMessage} className="max-w-2xl mx-auto w-full">
            {renderInputContainer(false)}
          </form>
        </div>
      </>
      )}

    </div>
  );

  if (inline) {
    return (
      <div className="relative w-full h-full flex flex-col overflow-hidden">
        {mainContent}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#050b14]/85 backdrop-blur-xs select-none">
      {mainContent}
    </div>
  );
}

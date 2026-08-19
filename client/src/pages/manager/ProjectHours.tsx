import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { PageShell } from "../../components/layout/PageShell";
import { Button } from "../../components/ui/Button";
import { apiRequest } from "../../services/apiClient";
import { formatDate, formatHours } from "../../utils/formatters";
import { 
  Clock, 
  Calendar, 
  Users, 
  ArrowLeft, 
  MessageSquare,
  X,
  Camera
} from "lucide-react";
import type { HourLog, Attachment } from "../../types";

export function ProjectHours() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month" | "all">("week");
  
  // Lightbox overlay state
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const [activeLog, setActiveLog] = useState<any | null>(null);

  useEffect(() => {
    if (!id) return;
    
    setLoading(true);
    Promise.all([
      apiRequest<any>(`/projects/${id}`).catch(() => null),
      apiRequest<{ logs: any[] }>(`/hours/project/${id}`).catch(() => ({ logs: [] })),
      apiRequest<{ users: any[] }>("/users").catch(() => ({ users: [] }))
    ])
      .then(([projData, hoursData, usersData]) => {
        setProject(projData);
        setLogs(hoursData.logs);
        setUsersList(usersData.users);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load project efforts data:", err);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <PageShell title="Project Efforts" eyebrow="Loading...">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal"></div>
        </div>
      </PageShell>
    );
  }

  if (!project) {
    return (
      <PageShell title="Error" eyebrow="Project Details">
        <div className="text-center py-20 space-y-4">
          <p className="text-text-muted text-xs">Project not found or you are not authorized to view it.</p>
          <Button onClick={() => navigate("/projects")}>Back to Projects</Button>
        </div>
      </PageShell>
    );
  }

  // Filter logs by selected period
  const now = new Date();
  const filteredLogs = logs.filter(log => {
    if (period === "all") return true;
    const logDate = new Date(log.date);
    if (period === "week") {
      const startOfWeek = new Date(now);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0,0,0,0);
      return logDate >= startOfWeek;
    }
    if (period === "month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return logDate >= startOfMonth;
    }
    return true;
  });

  const totalEffortHours = filteredLogs.reduce((sum, l) => sum + Number(l.hours), 0);

  // Group logs by user for grid representation
  const memberEffortMap: { [userId: string]: { user: any; totalHours: number; logs: any[] } } = {};
  
  // Initialize map with all project members
  if (project.memberIds) {
    project.memberIds.forEach((mId: string) => {
      const u = usersList.find(usr => usr.id === mId);
      if (u) {
        memberEffortMap[mId] = { user: u, totalHours: 0, logs: [] };
      }
    });
  }
  // Also add manager
  if (project.managerId) {
    const mgr = usersList.find(usr => usr.id === project.managerId);
    if (mgr && !memberEffortMap[project.managerId]) {
      memberEffortMap[project.managerId] = { user: mgr, totalHours: 0, logs: [] };
    }
  }

  // Populate logged efforts
  filteredLogs.forEach(log => {
    if (memberEffortMap[log.userId]) {
      memberEffortMap[log.userId].totalHours += log.hours;
      memberEffortMap[log.userId].logs.push(log);
    }
  });

  const memberEfforts = Object.values(memberEffortMap).sort((a,b) => b.totalHours - a.totalHours);

  // Render proof thumbnail matching our standards
  const renderProofThumbnail = (log: any, sizeClass: string, hidePlaceholder: boolean = false) => {
    const attachments = log.attachments || [];
    const urls = attachments.length > 0 ? attachments.map((a: any) => a.url) : (log.imageUrl ? [log.imageUrl] : []);
    
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

  return (
    <PageShell title="Project Efforts" eyebrow={`Project: ${project.name}`}>
      <div className="space-y-6">
        
        {/* Back navigation & Actions row */}
        <div className="flex items-center justify-between select-none">
          <Link to={`/projects/${project.id}`} className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-white transition">
            <ArrowLeft size={14} />
            Back to Project Details
          </Link>

          <div className="flex items-center bg-[#0b1220]/30 rounded-[10px] p-1 border border-[#253347]">
            {(["week", "month", "all"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-[6px] transition duration-150 ${
                  period === p
                    ? "bg-teal text-navy shadow-md shadow-teal/10"
                    : "text-text-muted hover:text-white"
                }`}
              >
                {p === "week" ? "This Week" : p === "month" ? "This Month" : "All Time"}
              </button>
            ))}
          </div>
        </div>

        {/* Project Header KPI Card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-navy-surface border border-[#1B2A3F] rounded-[24px] p-6 shadow-lg select-none">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Total Project Effort</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-black text-white">{formatHours(totalEffortHours)}</span>
              <Clock className="text-teal" size={18} />
            </div>
          </div>
          <div className="space-y-1 border-t sm:border-t-0 sm:border-l sm:border-r border-[#1B2A3F] border-dashed pt-4 sm:pt-0 sm:px-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Active Team Members</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-black text-white">{memberEfforts.length}</span>
              <Users className="text-teal" size={18} />
            </div>
          </div>
          <div className="space-y-1 pt-4 sm:pt-0 sm:pl-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Current TRL Level</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-black text-white">TRL {project.currentTRL || 1}</span>
              <span className="text-[10px] text-text-muted font-bold">Research & Dev</span>
            </div>
          </div>
        </div>

        {/* Grid Panel: Developer Hours List */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Efforts by Contributor Table */}
          <div className="lg:col-span-6 rounded-2xl bg-navy-surface p-6 shadow-lg border border-[#1B2A3F]/40 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-teal border-b border-[#1B2A3F] border-dashed pb-3.5 flex items-center gap-2">
              <Users size={14} />
              Effort Breakdown by Member
            </h3>

            {memberEfforts.length === 0 ? (
              <p className="text-xs text-text-muted py-8 text-center">No members assigned to this project.</p>
            ) : (
              <div className="space-y-3">
                {memberEfforts.map(({ user: usr, totalHours: hrs }) => {
                  const initials = usr.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
                  const target = usr.weeklyTargetHours || 40;
                  const percent = Math.min((hrs / target) * 100, 100);
                  
                  return (
                    <div key={usr.id} className="bg-[#0B1220]/30 border border-[#1B2A3F] p-3 rounded-xl flex items-center justify-between gap-4 select-none">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-teal/10 text-teal border border-teal/20 text-xs font-black">
                          {usr.avatarUrl ? (
                            <img src={usr.avatarUrl} alt={usr.name} className="w-full h-full object-cover rounded-full" />
                          ) : initials}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <span className="block text-xs font-bold text-white truncate leading-none">{usr.name}</span>
                          <span className="block text-[8px] text-text-muted truncate leading-none">{usr.email}</span>
                          <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden mt-1 max-w-[150px]">
                            <div className="h-full bg-teal" style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-teal font-mono">{hrs.toFixed(1)}h</span>
                        <span className="block text-[8px] text-text-muted">logged</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Logs Stream */}
          <div className="lg:col-span-6 rounded-2xl bg-navy-surface p-6 shadow-lg border border-[#1B2A3F]/40 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-teal border-b border-[#1B2A3F] border-dashed pb-3.5 flex items-center gap-2">
              <Clock size={14} />
              Logged Activities Stream
            </h3>

            {filteredLogs.length === 0 ? (
              <p className="text-xs text-text-muted py-12 text-center">No efforts logged in this period.</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto planka-scrollbar pr-1">
                {filteredLogs.map((log) => {
                  const contributor = usersList.find(u => u.id === log.userId);
                  return (
                    <div key={log.id} className="border-b border-[#253347]/40 pb-3 last:border-0 last:pb-0 select-text">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-white">{contributor?.name || "Team Member"}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {renderProofThumbnail(log, "w-6 h-6 rounded", true)}
                          <div className="text-right">
                            <span className="text-teal font-bold">{log.hours}h</span>
                            {log.startTime && log.endTime && (
                              <p className="text-[8px] text-teal/70 font-mono leading-none mt-0.5">{log.startTime} - {log.endTime}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[8px] text-text-muted mt-0.5 select-none">
                        <span>{formatDate(log.date)}</span>
                        <span>{log.werkpakket ? log.werkpakket.split(" - ")[0] : "-"}</span>
                      </div>
                      {log.notes && (
                        <p className="text-[10px] text-text-muted italic mt-1.5 bg-[#0b1220]/20 p-2 rounded border border-[#253347]/40">
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

      {/* LIGHTBOX MODAL */}
      {activeImageUrl && (() => {
        const activeAttachment = activeLog?.attachments?.find((a: any) => a.url === activeImageUrl);
        
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
                    {activeLog.attachments.map((att: any) => {
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

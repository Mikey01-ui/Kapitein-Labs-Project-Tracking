import { useState, useEffect } from "react";
import { PageShell } from "../../components/layout/PageShell";
import { Button } from "../../components/ui/Button";
import { apiRequest } from "../../services/apiClient";
import { 
  Sliders, 
  Clock, 
  Layout, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle,
  Save
} from "lucide-react";

export function Settings() {
  // Weekly targets state
  const [defaultTargetHours, setDefaultTargetHours] = useState("40");
  
  // Kanban columns state
  const [todoCol, setTodoCol] = useState("To Do");
  const [progressCol, setProgressCol] = useState("In Progress");
  const [reviewCol, setReviewCol] = useState("In Review");
  const [doneCol, setDoneCol] = useState("Completed");

  // TRL Labels state
  const [trlLabels, setTrlLabels] = useState<string[]>([
    "Basic principles observed and reported",
    "Technology concept and/or application formulated",
    "Analytical and experimental critical function and/or characteristic proof of concept",
    "Component and/or breadboard validation in laboratory environment",
    "Component and/or breadboard validation in relevant environment",
    "System/subsystem model or prototype demonstration in a relevant environment",
    "System prototype demonstration in an operational environment",
    "Actual system completed and qualified through test and demonstration",
    "Actual system proven through successful mission operations"
  ]);

  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success"
  });

  useEffect(() => {
    // Load stored settings from localStorage if available
    const storedTarget = localStorage.getItem("kapetein_default_target");
    if (storedTarget) setDefaultTargetHours(storedTarget);

    const storedCols = localStorage.getItem("kapetein_kanban_column_names");
    if (storedCols) {
      try {
        const parsed = JSON.parse(storedCols);
        if (parsed.todo) setTodoCol(parsed.todo);
        if (parsed.progress) setProgressCol(parsed.progress);
        if (parsed.review) setReviewCol(parsed.review);
        if (parsed.done) setDoneCol(parsed.done);
      } catch (e) {}
    }

    const storedTrl = localStorage.getItem("kapetein_trl_definitions");
    if (storedTrl) {
      try {
        setTrlLabels(JSON.parse(storedTrl));
      } catch (e) {}
    }
  }, []);

  const triggerToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3500);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate target hours
    const parsedTarget = parseFloat(defaultTargetHours);
    if (isNaN(parsedTarget) || parsedTarget < 1 || parsedTarget > 168) {
      triggerToast("Weekly target hours must be between 1 and 168.", "error");
      return;
    }

    // Save everything to localStorage
    const oldTarget = localStorage.getItem("kapetein_default_target") || "40";
    localStorage.setItem("kapetein_default_target", defaultTargetHours);
    
    const colNames = { todo: todoCol, progress: progressCol, review: reviewCol, done: doneCol };
    localStorage.setItem("kapetein_kanban_column_names", JSON.stringify(colNames));

    localStorage.setItem("kapetein_trl_definitions", JSON.stringify(trlLabels));

    // Log the action to the database activity feed
    const token = localStorage.getItem("kapetein_token");
    if (token) {
      const details = oldTarget !== defaultTargetHours
        ? `Changed default weekly logging target limit from ${oldTarget} to ${defaultTargetHours} hours`
        : "Saved updated system configurations";
      apiRequest("/activities/log", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          actionType: "UPDATED_SETTINGS",
          details
        })
      }).catch(err => console.error("Failed to log setting change:", err));
    }

    triggerToast("System configurations saved successfully!", "success");
  };

  const handleTrlLabelChange = (index: number, val: string) => {
    setTrlLabels(prev => prev.map((item, i) => i === index ? val : item));
  };

  return (
    <PageShell title="System Settings" eyebrow="System Admin">
      <form onSubmit={handleSaveSettings} className="space-y-6 select-none">
        
        {/* Row 1: Configurations Split Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          
          {/* Panel A: Core Preferences */}
          <div className="space-y-6 border-b lg:border-b-0 lg:border-r border-[#1B2A3F] border-dashed pb-6 lg:pb-0 lg:pr-6">
            
            {/* Preference Section 1: Weekly Hours Limit */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-teal flex items-center gap-1.5 border-b border-[#1B2A3F] border-dashed pb-3.5">
                <Clock size={14} />
                Weekly Logging Preferences
              </h3>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted">
                  Default Weekly Target Hours
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={defaultTargetHours}
                    onChange={(e) => setDefaultTargetHours(e.target.value)}
                    className="h-10 w-24 rounded-xl border border-border bg-[#121E30] px-3.5 text-xs font-bold text-white outline-none focus:border-teal transition text-center"
                    required
                  />
                  <span className="text-xs text-text-muted font-bold">hours per week</span>
                </div>
                <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
                  Default target hours assigned to new accounts. Individual targets can still be configured in User Management.
                </p>
              </div>
            </div>

            {/* Preference Section 2: Kanban Boards default column headers */}
            <div className="space-y-4 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-teal flex items-center gap-1.5 border-b border-[#1B2A3F] border-dashed pb-3.5">
                <Layout size={14} />
                Workflow Pipeline Columns
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted">Column 1 (To Do)</label>
                  <input
                    type="text"
                    value={todoCol}
                    onChange={(e) => setTodoCol(e.target.value)}
                    className="h-9 w-full rounded-xl border border-border bg-[#121E30] px-3.5 text-xs text-white outline-none focus:border-teal transition font-semibold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted">Column 2 (In Progress)</label>
                  <input
                    type="text"
                    value={progressCol}
                    onChange={(e) => setProgressCol(e.target.value)}
                    className="h-9 w-full rounded-xl border border-border bg-[#121E30] px-3.5 text-xs text-white outline-none focus:border-teal transition font-semibold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted">Column 3 (In Review)</label>
                  <input
                    type="text"
                    value={reviewCol}
                    onChange={(e) => setReviewCol(e.target.value)}
                    className="h-9 w-full rounded-xl border border-border bg-[#121E30] px-3.5 text-xs text-white outline-none focus:border-teal transition font-semibold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted">Column 4 (Completed)</label>
                  <input
                    type="text"
                    value={doneCol}
                    onChange={(e) => setDoneCol(e.target.value)}
                    className="h-9 w-full rounded-xl border border-border bg-[#121E30] px-3.5 text-xs text-white outline-none focus:border-teal transition font-semibold"
                    required
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Panel B: Technology Readiness Level definitions */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-teal flex items-center gap-1.5 border-b border-[#1B2A3F] border-dashed pb-3.5">
              <Sliders size={14} />
              Technology Readiness Level (TRL) Definitions
            </h3>
            
            <p className="text-[10px] text-text-muted leading-relaxed">
              Define target milestones and validation requirements for levels 1 through 9. These labels are displayed across timelines and progression headers.
            </p>

            <div className="space-y-3.5 max-h-[340px] overflow-y-auto planka-scrollbar pr-1.5 pt-1">
              {trlLabels.map((lbl, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-text-muted">
                    <span>TRL Level {i + 1}</span>
                  </div>
                  <input
                    type="text"
                    value={lbl}
                    onChange={(e) => handleTrlLabelChange(i, e.target.value)}
                    className="h-8.5 w-full rounded-xl border border-border bg-[#121E30] px-3.5 text-xs text-white outline-none focus:border-teal transition font-semibold"
                    required
                  />
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Save Footer Action bar */}
        <div className="flex justify-end pt-4 border-t border-[#1B2A3F] border-dashed">
          <Button type="submit" className="flex items-center gap-1.5 text-xs py-2 px-5 font-bold uppercase tracking-wider">
            <Save size={13} />
            Save Configuration
          </Button>
        </div>

      </form>

      {/* Floating feedback toast */}
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

    </PageShell>
  );
}

import { useState, useEffect } from "react";
import { PageShell } from "../../components/layout/PageShell";
import { CheckCircle2, AlertCircle, Save, Layout, Globe, Loader2 } from "lucide-react";

export function Settings() {
  const [portalTitle, setPortalTitle] = useState("Miltomy Project Tracking");
  const [supportEmail, setSupportEmail] = useState("support@miltomy.com");
  
  // Kanban columns
  const [col1, setCol1] = useState("Backlog");
  const [col2, setCol2] = useState("To Do");
  const [col3, setCol3] = useState("In Progress");
  const [col4, setCol4] = useState("Review");
  const [col5, setCol5] = useState("Completed");

  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success"
  });

  useEffect(() => {
    const saved = localStorage.getItem("miltomy_portal_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.portalTitle) setPortalTitle(parsed.portalTitle);
        if (parsed.supportEmail) setSupportEmail(parsed.supportEmail);
        if (parsed.col1) setCol1(parsed.col1);
        if (parsed.col2) setCol2(parsed.col2);
        if (parsed.col3) setCol3(parsed.col3);
        if (parsed.col4) setCol4(parsed.col4);
        if (parsed.col5) setCol5(parsed.col5);
      } catch (e) {}
    }
  }, []);

  const triggerToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3500);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      portalTitle,
      supportEmail,
      col1,
      col2,
      col3,
      col4,
      col5
    };

    localStorage.setItem("miltomy_portal_settings", JSON.stringify(payload));
    triggerToast("Agency workspace settings saved successfully!");
  };

  return (
    <PageShell title="Workspace Settings" eyebrow="Agency Administration">
      <form onSubmit={handleSaveSettings} className="space-y-6 select-none max-w-3xl">
        
        {/* Section 1: Agency Brand & Identity */}
        <div className="rounded bg-[#111111] border border-[#222222] p-6 shadow-xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#c8ff00] font-display flex items-center gap-2 border-b border-[#222222] pb-3">
            <Globe size={15} />
            Agency Portal Identity
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#888888] mb-1.5">
                Portal Title
              </label>
              <input
                type="text"
                value={portalTitle}
                onChange={(e) => setPortalTitle(e.target.value)}
                className="h-14 w-full rounded border border-[#262626] bg-[#161616] px-4 text-sm font-semibold text-white outline-none focus:border-[#c8ff00] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#888888] mb-1.5">
                Support & Contact Email
              </label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="h-14 w-full rounded border border-[#262626] bg-[#161616] px-4 text-sm font-semibold text-white outline-none focus:border-[#c8ff00] transition"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Default Kanban Pipeline Columns */}
        <div className="rounded bg-[#111111] border border-[#222222] p-6 shadow-xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#c8ff00] font-display flex items-center gap-2 border-b border-[#222222] pb-3">
            <Layout size={15} />
            Default Kanban Pipeline Stages
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#888888] mb-1.5">Stage 1</label>
              <input
                type="text"
                value={col1}
                onChange={(e) => setCol1(e.target.value)}
                className="h-12 w-full rounded border border-[#262626] bg-[#161616] px-3 text-xs font-semibold text-white outline-none focus:border-[#c8ff00] transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-[#888888] mb-1.5">Stage 2</label>
              <input
                type="text"
                value={col2}
                onChange={(e) => setCol2(e.target.value)}
                className="h-12 w-full rounded border border-[#262626] bg-[#161616] px-3 text-xs font-semibold text-white outline-none focus:border-[#c8ff00] transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-[#888888] mb-1.5">Stage 3</label>
              <input
                type="text"
                value={col3}
                onChange={(e) => setCol3(e.target.value)}
                className="h-12 w-full rounded border border-[#262626] bg-[#161616] px-3 text-xs font-semibold text-white outline-none focus:border-[#c8ff00] transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-[#888888] mb-1.5">Stage 4</label>
              <input
                type="text"
                value={col4}
                onChange={(e) => setCol4(e.target.value)}
                className="h-12 w-full rounded border border-[#262626] bg-[#161616] px-3 text-xs font-semibold text-white outline-none focus:border-[#c8ff00] transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-[#888888] mb-1.5">Stage 5</label>
              <input
                type="text"
                value={col5}
                onChange={(e) => setCol5(e.target.value)}
                className="h-12 w-full rounded border border-[#262626] bg-[#161616] px-3 text-xs font-semibold text-white outline-none focus:border-[#c8ff00] transition"
              />
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="h-14 px-8 rounded bg-[#c8ff00] hover:bg-[#b2e600] text-[#080808] text-xs font-black uppercase tracking-[0.22em] transition duration-150 cursor-pointer shadow-lg shadow-[#c8ff00]/15 flex items-center justify-center gap-2"
          >
            <Save size={16} />
            <span>Save Configuration</span>
          </button>
        </div>

      </form>

      {toast.show && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded border text-xs font-bold shadow-2xl ${
          toast.type === "success" ? "bg-[#111111] border-green-500/30 text-green-400" : "bg-[#111111] border-red-500/30 text-red-400"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}
    </PageShell>
  );
}

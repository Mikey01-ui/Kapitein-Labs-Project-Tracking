import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { PageShell } from "../../components/layout/PageShell";
import { Button } from "../../components/ui/Button";
import { useAssignedProjects } from "../../hooks/useAssignedProjects";
import { apiRequest } from "../../services/apiClient";
import { Clock, Calendar, MessageSquare, BookOpen, AlertTriangle, Camera } from "lucide-react";

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

export function LogHours() {
  const assignedProjects = useAssignedProjects();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // State values
  const [projectId, setProjectId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [hours, setHours] = useState("");
  const [notes, setNotes] = useState("");
  const [werkpakket, setWerkpakket] = useState(WERKPAKKETTEN[0]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  useEffect(() => {
    if (startTime && endTime) {
      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      let diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
      if (diffMinutes < 0) {
        diffMinutes += 24 * 60; // loops into next day
      }
      const calculatedHours = diffMinutes / 60;
      const roundedHours = Math.round(calculatedHours * 4) / 4;
      setHours(roundedHours > 0 ? roundedHours.toString() : "");
    }
  }, [startTime, endTime]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);

  // Pre-fill project if parameter exists
  useEffect(() => {
    const projParam = searchParams.get("project");
    if (projParam && assignedProjects.some((p) => p.id === projParam)) {
      setProjectId(projParam);
    } else if (assignedProjects.length > 0) {
      setProjectId(assignedProjects[0].id);
    }
  }, [searchParams, assignedProjects]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !date || !hours) return;

    let uploadedUrls: string[] = [];
    if (imageFiles.length > 0) {
      try {
        for (const file of imageFiles) {
          const base64Content = await fileToBase64(file);
          const uploadRes = await apiRequest<{ url: string }>("/upload", {
            method: "POST",
            body: JSON.stringify({
              filename: file.name,
              content: base64Content
            })
          });
          uploadedUrls.push(uploadRes.url);
        }
      } catch (err) {
        console.error("Failed to upload image:", err);
        alert("Failed to upload one or more images. Please try again.");
        return;
      }
    }

    apiRequest("/hours", {
      method: "POST",
      body: JSON.stringify({
        projectId,
        date,
        hours: parseFloat(hours),
        notes,
        werkpakket,
        imageUrl: uploadedUrls.length > 0 ? uploadedUrls[0] : "",
        imageUrls: uploadedUrls
      })
    })
      .then(() => {
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          navigate("/my-hours");
        }, 1500);
      })
      .catch((err) => {
        console.error("Failed to log hours:", err);
        alert("Failed to log effort hours. Please try again.");
      });
  };

  return (
    <PageShell title="Log Hours" eyebrow="Time entry">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 max-w-4xl mx-auto py-2">
        
        {/* Form Container */}
        <div className="lg:col-span-8 pr-0 lg:pr-8 lg:border-r border-[#1B2A3F] border-dashed">
          <div className="border-b border-[#1B2A3F] border-dashed pb-4 mb-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-teal">Record Invested Effort</h3>
            <p className="mt-1.5 text-xs text-text-muted">
              Submit your work hours directly to active project tracking dashboards.
            </p>
          </div>

          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#122D23] border border-green-950 text-status-success mb-4 animate-bounce">
                ✓
              </div>
              <h4 className="text-sm font-bold text-white">Log entry recorded!</h4>
              <p className="text-xs text-text-muted mt-1">Redirecting you to log history...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project Select */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted">
                  Select Project
                </label>
                <div className="relative">
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full rounded-xl border border-[#1B2A3F] bg-[#121E30] px-4 py-3 text-xs font-semibold text-white outline-none focus:border-teal transition appearance-none cursor-pointer"
                  >
                    {assignedProjects.length === 0 ? (
                      <option value="">No projects assigned</option>
                    ) : (
                      assignedProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (TRL {p.currentTRL})
                        </option>
                      ))
                    )}
                  </select>
                  {/* Custom Arrow Icon */}
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-text-muted text-[8px]">
                    ▼
                  </div>
                </div>
              </div>

              {/* Werkpakket Select */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted">
                  Select Werkpakket
                </label>
                <div className="relative">
                  <select
                    value={werkpakket}
                    onChange={(e) => setWerkpakket(e.target.value)}
                    className="w-full rounded-xl border border-[#1B2A3F] bg-[#121E30] px-4 py-3 text-xs font-semibold text-white outline-none focus:border-teal transition appearance-none cursor-pointer"
                  >
                    {WERKPAKKETTEN.map((wp) => (
                      <option key={wp} value={wp}>
                        {wp}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-text-muted text-[8px]">
                    ▼
                  </div>
                </div>
              </div>

              {/* Date and Time Range row */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Date Picker */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted flex items-center gap-1.5">
                    <Calendar size={13} className="text-teal" />
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-[#1B2A3F] bg-[#121E30] px-4 py-3 text-xs font-semibold text-white outline-none focus:border-teal transition cursor-pointer"
                    required
                  />
                </div>

                {/* Time Range */}
                <div className="space-y-2 sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted flex items-center gap-1.5">
                    <Clock size={13} className="text-teal" />
                    Time Range (Optional - Auto-calculates Hours)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full rounded-xl border border-[#1B2A3F] bg-[#121E30] px-4 py-3 text-xs font-semibold text-white outline-none focus:border-teal transition cursor-pointer"
                    />
                    <span className="text-text-muted text-xs font-bold">to</span>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full rounded-xl border border-[#1B2A3F] bg-[#121E30] px-4 py-3 text-xs font-semibold text-white outline-none focus:border-teal transition cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Hours Logged */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted flex items-center gap-1.5">
                  <Clock size={13} className="text-teal" />
                  Hours Logged
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0.25"
                    max="24"
                    step="0.25"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    placeholder="e.g. 7.5"
                    className="w-full rounded-xl border border-[#1B2A3F] bg-[#121E30] px-4 py-3 text-xs font-semibold text-white outline-none focus:border-teal transition"
                    required
                  />
                  {/* Quick increment buttons */}
                  <button
                    type="button"
                    onClick={() => {
                      setStartTime("");
                      setEndTime("");
                      setHours("8");
                    }}
                    className="rounded-xl border border-[#1B2A3F] bg-[#1A2B42] hover:bg-teal hover:text-navy hover:border-teal px-4 text-xs font-bold transition whitespace-nowrap text-white"
                  >
                    8h
                  </button>
                </div>
              </div>

              {/* Work Notes */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted flex items-center gap-1.5">
                  <MessageSquare size={13} className="text-teal" />
                  Work Description / Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detail tasks performed, challenges faced, or key outcomes..."
                  className="min-h-32 w-full rounded-xl border border-[#1B2A3F] bg-[#121E30] px-4 py-3 text-xs text-white placeholder:text-text-muted/60 outline-none focus:border-teal transition resize-none"
                />
              </div>

              {/* Attach Image */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted flex items-center gap-1.5">
                  <Camera size={13} className="text-teal" />
                  Attach Progress Screenshot / Image (Optional, can upload multiple)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files) {
                      const newFiles = Array.from(files);
                      setImageFiles(prev => [...prev, ...newFiles]);
                      newFiles.forEach((file) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setImagePreviews(prev => [...prev, reader.result as string]);
                        };
                        reader.readAsDataURL(file);
                      });
                    }
                  }}
                  className="w-full rounded-xl border border-[#1B2A3F] bg-[#121E30] px-4 py-3 text-xs text-white file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-teal file:text-navy hover:file:bg-teal/80 file:cursor-pointer transition"
                />
                {imagePreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2.5 mt-2">
                    {imagePreviews.map((preview, idx) => (
                      <div key={idx} className="relative w-28 h-20 rounded-xl overflow-hidden border border-[#1B2A3F] group">
                        <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setImageFiles(prev => prev.filter((_, i) => i !== idx));
                            setImagePreviews(prev => prev.filter((_, i) => i !== idx));
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

              {/* Form buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate("/my-hours")}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Save log entry
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Sidebar Info Card */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Guidelines info card */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-teal flex items-center gap-2 border-b border-[#1B2A3F] pb-3 mb-4">
              <BookOpen size={15} />
              Logging Guidelines
            </h4>
            <ul className="space-y-3.5 text-[11px] text-text-muted leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-teal select-none mt-0.5">•</span>
                <span>Logs must record actual, productive effort on research and testing.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal select-none mt-0.5">•</span>
                <span>Input values are rounded to steps of **15 minutes** (e.g. <code>0.25h</code>).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal select-none mt-0.5">•</span>
                <span>Include descriptive details when logging substantial updates.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal select-none mt-0.5">•</span>
                <span>If you worked on multiple projects, submit individual forms per project.</span>
              </li>
            </ul>
          </div>

          {/* Warning card */}
          <div className="border-l-2 border-status-warning bg-[#1C1610]/40 p-4 rounded-r-xl text-xs">
            <h4 className="font-bold text-status-warning flex items-center gap-1.5 mb-1.5 uppercase tracking-wider text-[10px]">
              <AlertTriangle size={13} />
              Review Requirement
            </h4>
            <p className="text-text-muted leading-relaxed text-[11px]">
              Hour entries are locked for modification once a weekly billing window closes. Verify your dates and projects before saving.
            </p>
          </div>

        </div>

      </div>
    </PageShell>
  );
}

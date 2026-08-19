import { useState, useEffect } from "react";
import { PageShell } from "../../components/layout/PageShell";
import { apiRequest } from "../../services/apiClient";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { Receipt, FileText, CheckCircle, XCircle, AlertCircle, Plus, Minus, Paperclip, Eye, Loader2, Calendar, DollarSign, ArrowRight } from "lucide-react";
import gsap from "gsap";

interface Project {
  id: string;
  name: string;
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  ocrStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  ocrText?: string;
  aiAnalysis?: {
    classification: string;
    confidence: number;
    tags: string[];
    verificationStatus: "VERIFIED" | "WARNING" | "UNVERIFIED";
    auditNotes: string;
    detectedTools?: string[];
  };
  metadata?: any;
}

interface Expense {
  id: string;
  userId: string;
  projectId?: string;
  amount: number;
  currency: string;
  merchant: string;
  date: string;
  category: string;
  notes?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  project?: {
    name: string;
  };
  approvedBy?: {
    name: string;
  };
  attachments: Attachment[];
}

const CATEGORIES = [
  "Hardware & Tools",
  "Software & Subscriptions",
  "Travel & Transport",
  "Office Supplies",
  "Meals & Entertainment",
  "Other"
];

export function Expenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [projectId, setProjectId] = useState("");
  const [notes, setNotes] = useState("");
  
  // File Upload States
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Collapsible Form State
  const [showLogForm, setShowLogForm] = useState(false);

  // UI Detail Panel State (Slide-over side drawer)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState<string | null>(null); // expenseId
  const [feedbackText, setFeedbackText] = useState("");
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [expensesRes, projectsRes] = await Promise.all([
          apiRequest<{ expenses: Expense[] }>("/expenses"),
          apiRequest<{ projects: Project[] }>("/projects")
        ]);
        setExpenses(expensesRes.expenses);
        setProjects(projectsRes.projects);

        // Smart default: open form if no personal expenses exist
        const myExpenses = expensesRes.expenses.filter(e => e.userId === user.id);
        if (myExpenses.length === 0) {
          setShowLogForm(true);
        }
      } catch (err) {
        console.error("Failed to load expenses data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user.id]);

  // GSAP animations when page content changes
  useEffect(() => {
    if (loading) return;

    // Animate stats row elements
    gsap.fromTo(".dash-stat-item",
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: "power2.out", delay: 0.1 }
    );

    // Animate panels
    gsap.fromTo(".theme-card-panel",
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: "power2.out", delay: 0.2 }
    );
  }, [loading]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 8 * 1024 * 1024) {
        setUploadError("Invoices must be under 8MB.");
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setUploadError("");
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!amount || Number(amount) <= 0) {
      setFormError("Please enter a valid positive amount.");
      return;
    }
    if (!merchant.trim()) {
      setFormError("Please specify the merchant.");
      return;
    }
    if (!file) {
      setFormError("An invoice or receipt attachment is required to log an expense.");
      return;
    }

    try {
      setSubmitting(true);
      
      // 1. Upload file as base64 first
      setUploading(true);
      const base64Content = await fileToBase64(file);
      const uploadRes = await apiRequest<{ url: string }>("/upload", {
        method: "POST",
        body: JSON.stringify({
          filename: file.name,
          content: base64Content
        })
      });
      setUploading(false);

      // 2. Submit expense referencing the uploaded attachment URL
      await apiRequest("/expenses", {
        method: "POST",
        body: JSON.stringify({
          projectId: projectId || undefined,
          amount: Number(amount),
          currency,
          merchant,
          date,
          category,
          notes,
          attachmentUrl: uploadRes.url
        })
      });

      setFormSuccess("Expense logged and queued for AI analysis!");
      setAmount("");
      setMerchant("");
      setNotes("");
      setFile(null);
      setProjectId("");
      
      // Refresh list
      const res = await apiRequest<{ expenses: Expense[] }>("/expenses");
      setExpenses(res.expenses);
      
      // Collapse form automatically after successful submission
      setTimeout(() => {
        setFormSuccess("");
        setShowLogForm(false);
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || "Failed to submit expense. Please try again.");
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const handleReviewExpense = async (expenseId: string, approved: boolean) => {
    try {
      setReviewing(true);
      await apiRequest(`/expenses/${expenseId}/approve`, {
        method: "POST",
        body: JSON.stringify({
          approved,
          feedback: feedbackText || undefined
        })
      });
      
      setShowFeedbackModal(null);
      setFeedbackText("");
      
      // Reset details panel if currently active
      if (selectedExpense?.id === expenseId) {
        setSelectedExpense(null);
      }
      
      const res = await apiRequest<{ expenses: Expense[] }>("/expenses");
      setExpenses(res.expenses);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to review expense.");
    } finally {
      setReviewing(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    try {
      await apiRequest(`/expenses/${expenseId}`, {
        method: "DELETE"
      });
      if (selectedExpense?.id === expenseId) {
        setSelectedExpense(null);
      }
      const res = await apiRequest<{ expenses: Expense[] }>("/expenses");
      setExpenses(res.expenses);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to delete expense.");
    }
  };

  // Helper Stats Calculation
  const personalExpenses = expenses.filter(e => e.userId === user.id);
  const totalApproved = personalExpenses
    .filter(e => e.status === "APPROVED" && e.currency === "EUR")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const totalPending = personalExpenses
    .filter(e => e.status === "PENDING" && e.currency === "EUR")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const thisMonthExpenses = personalExpenses
    .filter(e => {
      const expDate = new Date(e.date);
      const now = new Date();
      return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const pendingApprovals = expenses.filter(e => e.status === "PENDING" && e.userId !== user.id);

  if (loading) {
    return (
      <PageShell title="Expenses" eyebrow="Overview" hideHeader={true}>
        <div className="space-y-4 py-8">
          <div className="h-12 w-full animate-pulse rounded-lg bg-[#1B2A3F]/30" />
          <div className="grid grid-cols-3 gap-6">
            <div className="h-24 animate-pulse rounded-lg bg-[#1B2A3F]/30" />
            <div className="h-24 animate-pulse rounded-lg bg-[#1B2A3F]/30" />
            <div className="h-24 animate-pulse rounded-lg bg-[#1B2A3F]/30" />
          </div>
          <div className="h-96 w-full mt-6 animate-pulse rounded-lg bg-[#1B2A3F]/30" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Expenses" eyebrow="Overview" hideHeader={true}>
      
      {/* Welcome Title Banner */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-dashed border-[#1B2A3F] pb-6">
        <div>
          <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">
            Project <span className="text-teal">Expenses</span>
          </h1>
          <p className="mt-1 text-xs text-text-muted">
            Log, track, and manage project reimbursements and AI receipt verification logs.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => setShowLogForm(!showLogForm)}
            className="flex items-center gap-1.5 rounded-full bg-[#121E30] hover:bg-[#1A2B42] border border-[#253347] px-4 py-1.5 text-xs font-bold text-teal transition-all"
          >
            {showLogForm ? (
              <>
                <Minus size={13} />
                Hide Form
              </>
            ) : (
              <>
                <Plus size={13} />
                Add Expense
              </>
            )}
          </button>
        </div>
      </div>

      {/* Row 1: Borderless Stats with Dividers */}
      <div className="grid grid-cols-1 gap-6 py-2 sm:grid-cols-2 lg:grid-cols-3 border-b border-[#1B2A3F] border-dashed pb-8">
        
        {/* Spent This Month */}
        <div className="dash-stat-item flex flex-col justify-between border-r border-[#1B2A3F] border-dashed last:border-0 pr-6 lg:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Spent This Month</p>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-4xl font-black text-white">€{thisMonthExpenses.toFixed(2)}</span>
            <span className="text-[10px] font-semibold text-text-muted">Current Month</span>
          </div>
        </div>

        {/* Pending Reimbursement */}
        <div className="dash-stat-item flex flex-col justify-between sm:border-r border-[#1B2A3F] border-dashed last:border-0 sm:pr-6 sm:pl-2 lg:pl-4 lg:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Pending Reimbursement</p>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-4xl font-black text-white">€{totalPending.toFixed(2)}</span>
            <span className="text-[10px] font-semibold text-status-warning">Pending Review</span>
          </div>
        </div>

        {/* Reimbursed Total */}
        <div className="dash-stat-item flex flex-col justify-between last:border-0 pl-2 lg:pl-4 lg:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Reimbursed Total</p>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-4xl font-black text-white">€{totalApproved.toFixed(2)}</span>
            <span className="text-[10px] font-semibold text-status-success">Approved</span>
          </div>
        </div>
      </div>

      {/* Row 2: Collapsible Log Expense Form (Full Width when open) */}
      {showLogForm && (
        <div className="py-8 border-b border-[#1B2A3F] border-dashed theme-card-panel animate-slide-in">
          <div className="flex items-center justify-between border-b border-[#1B2A3F] pb-4 mb-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-teal flex items-center gap-1.5">
              <Plus size={14} />
              Log New Expense Request
            </h3>
          </div>

          <form onSubmit={handleCreateExpense} className="space-y-6">
            {formError && (
              <div className="flex gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
                <XCircle size={16} className="shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}
            {formSuccess && (
              <div className="flex gap-2 rounded-lg bg-teal/10 border border-teal/20 p-3 text-xs text-teal">
                <CheckCircle size={16} className="shrink-0 mt-0.5" />
                <span>{formSuccess}</span>
              </div>
            )}

            {/* Form Fields arranged in horizontal 3-column subgrid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Column 1: Merchant & Value */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xxs font-bold uppercase text-text-muted mb-1.5">Merchant / Vendor</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AWS, GAMMA, NS Train"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    className="w-full rounded-lg border border-border bg-[#0B1220]/80 p-3 text-xs text-text-primary focus:border-teal focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-xxs font-bold uppercase text-text-muted mb-1.5">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full rounded-lg border border-border bg-[#0B1220]/80 p-3 text-xs text-text-primary focus:border-teal focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xxs font-bold uppercase text-text-muted mb-1.5">Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full rounded-lg border border-border bg-[#0B1220]/80 p-3 text-xs text-text-primary focus:border-teal focus:outline-none"
                    >
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Column 2: Date, Category & Project Link */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xxs font-bold uppercase text-text-muted mb-1.5">Date of Purchase</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full rounded-lg border border-border bg-[#0B1220]/80 p-3 text-xs text-text-primary focus:border-teal focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xxs font-bold uppercase text-text-muted mb-1.5">Project Allocation</label>
                    <select
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className="w-full rounded-lg border border-border bg-[#0B1220]/80 p-3 text-xs text-text-primary focus:border-teal focus:outline-none"
                    >
                      <option value="">General / None</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xxs font-bold uppercase text-text-muted mb-1.5">Expense Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-border bg-[#0B1220]/80 p-3 text-xs text-text-primary focus:border-teal focus:outline-none"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Column 3: Notes & Invoice File upload */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xxs font-bold uppercase text-text-muted mb-1.5">Notes / Description</label>
                  <input
                    type="text"
                    placeholder="Justify this transaction..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-lg border border-border bg-[#0B1220]/80 p-3 text-xs text-text-primary focus:border-teal focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold uppercase text-text-muted mb-1.5">
                    Invoice Attachment <span className="text-red-500">*</span>
                  </label>
                  <div className="relative rounded-lg border border-dashed border-border bg-[#0B1220]/50 hover:bg-[#0B1220]/75 hover:border-teal/50 transition-all p-3 text-center cursor-pointer">
                    <input
                      type="file"
                      required
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Paperclip className="mx-auto text-text-muted mb-1" size={16} />
                    {file ? (
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-teal truncate">{file.name}</p>
                        <p className="text-[9px] text-text-muted">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-text-muted">Choose invoice (Image/PDF up to 8MB)</p>
                      </div>
                    )}
                  </div>
                  {uploadError && <p className="text-xs text-red-400 mt-1">{uploadError}</p>}
                </div>
              </div>

            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={submitting}
                className="px-8 font-black tracking-tight"
              >
                {submitting ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 size={12} className="animate-spin" />
                    {uploading ? "Uploading Invoice..." : "Logging Request..."}
                  </span>
                ) : (
                  "Submit Expense"
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Row 3: Admin Manager Approval Queue (Full Width) */}
      {(user.role === "ADMIN" || user.role === "MANAGER") && pendingApprovals.length > 0 && (
        <div className="py-8 border-b border-[#1B2A3F] border-dashed theme-card-panel animate-slide-in">
          <div className="flex items-center justify-between border-b border-[#1B2A3F] pb-4 mb-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-teal flex items-center gap-1.5">
              <AlertCircle size={14} className="text-amber-500 animate-pulse" />
              Reimbursement Approvals Queue ({pendingApprovals.length})
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingApprovals.map((exp) => (
              <div 
                key={exp.id} 
                className="rounded-xl border border-border bg-[#121E30]/40 p-4 hover:border-teal/30 transition-all flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-black text-white">{exp.user.name}</p>
                      <p className="text-[10px] text-text-muted mt-0.5">{exp.user.email}</p>
                    </div>
                    <span className="text-sm font-black text-teal">
                      {exp.currency === "EUR" ? "€" : exp.currency === "USD" ? "$" : "£"}
                      {Number(exp.amount).toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1 text-[10px] text-text-muted">
                    <p><span className="font-bold">Merchant:</span> {exp.merchant}</p>
                    <p><span className="font-bold">Category:</span> {exp.category}</p>
                    <p><span className="font-bold">Date:</span> {new Date(exp.date).toLocaleDateString()}</p>
                    {exp.notes && <p className="italic text-text-primary mt-1">"{exp.notes}"</p>}
                  </div>
                </div>

                <div className="flex gap-2 items-center justify-between border-t border-[#1B2A3F]/50 pt-3 mt-1">
                  <button
                    onClick={() => setSelectedExpense(exp)}
                    className="text-[10px] font-bold text-text-muted hover:text-teal flex items-center gap-1"
                  >
                    <Eye size={12} />
                    Audit File
                  </button>
                  
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleReviewExpense(exp.id, true)}
                      className="rounded px-2.5 py-1.5 text-[10px] font-black bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        setShowFeedbackModal(exp.id);
                        setFeedbackText("");
                      }}
                      className="rounded px-2.5 py-1.5 text-[10px] font-black bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 4: My Logged Expenses Table (Full Width) */}
      <div className="py-8 theme-card-panel">
        <div className="flex items-center justify-between border-b border-[#1B2A3F] pb-4 mb-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-teal flex items-center gap-1.5">
            <Receipt size={14} />
            My Expenses Log History
          </h3>
        </div>

        {personalExpenses.length === 0 ? (
          <div className="text-center py-20">
            <EmptyExpensesIllustration />
            <p className="text-xs text-text-muted font-bold mt-4">No expenses logged yet</p>
            <p className="text-[10px] text-text-muted/60 mt-1 max-w-[300px] mx-auto">
              Click the "Add Expense" button in the top right to log your first transaction and receipt.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto planka-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-[#1B2A3F] text-xxs font-bold uppercase tracking-widest text-text-muted">
                  <th className="pb-3 pl-2">Merchant</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Allocated Project</th>
                  <th className="pb-3">Receipt Scan</th>
                  <th className="pb-3 text-right">Charged Amount</th>
                  <th className="pb-3 text-right pr-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1B2A3F]/30">
                {personalExpenses.map((exp) => {
                  const hasAttachment = exp.attachments.length > 0;
                  const attachment = exp.attachments[0];
                  const isProcessing = attachment?.ocrStatus === "PROCESSING" || attachment?.ocrStatus === "PENDING";
                  
                  return (
                    <tr
                      key={exp.id}
                      onClick={() => setSelectedExpense(exp)}
                      className={`hover:bg-[#121E30]/30 transition-all cursor-pointer text-xs ${
                        selectedExpense?.id === exp.id ? "text-teal bg-[#121E30]/20" : ""
                      }`}
                    >
                      <td className="py-4 font-bold text-white pl-2 flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${
                          exp.status === "APPROVED" 
                            ? "bg-emerald-500 shadow-sm" 
                            : exp.status === "REJECTED"
                              ? "bg-red-500 shadow-sm"
                              : "bg-teal animate-pulse"
                        }`} />
                        {exp.merchant}
                      </td>
                      <td className="py-4 text-text-muted">{exp.category}</td>
                      <td className="py-4 text-text-muted">
                        {new Date(exp.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="py-4 text-text-muted">
                        {exp.project?.name || <span className="opacity-40">-</span>}
                      </td>
                      <td className="py-4">
                        {hasAttachment ? (
                          <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded border border-dashed ${
                            isProcessing
                              ? "bg-amber-500/5 text-amber-400 border-amber-500/20"
                              : "bg-teal/5 text-teal border-teal/20"
                          }`}>
                            {isProcessing && <Loader2 size={10} className="animate-spin" />}
                            {isProcessing ? "Analyzing..." : "Attached"}
                          </span>
                        ) : (
                          <span className="text-red-400 opacity-80 text-[9px]">Missing File</span>
                        )}
                      </td>
                      <td className="py-4 text-right font-black text-white">
                        {exp.currency === "EUR" ? "€" : exp.currency === "USD" ? "$" : "£"}
                        {Number(exp.amount).toFixed(2)}
                      </td>
                      <td className="py-4 text-right pr-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${
                          exp.status === "APPROVED" 
                            ? "text-status-success" 
                            : exp.status === "REJECTED"
                              ? "text-status-danger"
                              : "text-teal"
                        }`}>
                          {exp.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-over Side Drawer (Details Panel overlay) */}
      {selectedExpense && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
          {/* Backdrop mask */}
          <div 
            onClick={() => setSelectedExpense(null)}
            className="absolute inset-0 bg-[#060A13]/70 backdrop-blur-xs transition-opacity" 
          />

          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
            <div className="pointer-events-auto w-screen max-w-md bg-[#121E30] border-l border-border shadow-2xl flex flex-col h-full transform transition-all p-6 space-y-6 overflow-y-auto planka-scrollbar">
              
              {/* Header Title */}
              <div className="flex justify-between items-start border-b border-[#1B2A3F] pb-4">
                <div>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded bg-teal/15 text-teal border border-teal/20 uppercase tracking-widest">
                    Receipt details
                  </span>
                  <h4 className="text-base font-black text-white mt-2">{selectedExpense.merchant}</h4>
                </div>
                <button
                  onClick={() => setSelectedExpense(null)}
                  className="text-text-muted hover:text-white text-xs font-bold bg-[#0B1220]/60 px-2.5 py-1 rounded-lg border border-border"
                >
                  Close
                </button>
              </div>

              {/* Core fields */}
              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-muted">Submitted By</span>
                  <span className="text-white font-bold">{selectedExpense.user.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Total Charged</span>
                  <span className="text-white font-black text-teal text-sm">
                    {selectedExpense.currency === "EUR" ? "€" : selectedExpense.currency === "USD" ? "$" : "£"}
                    {Number(selectedExpense.amount).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Project Reference</span>
                  <span className="text-white font-semibold truncate max-w-[180px]">
                    {selectedExpense.project?.name || "General / Others"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Purchased Date</span>
                  <span className="text-white font-semibold">
                    {new Date(selectedExpense.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Expense Category</span>
                  <span className="text-white font-semibold">{selectedExpense.category}</span>
                </div>
                {selectedExpense.notes && (
                  <div className="bg-[#0B1220]/50 p-3 rounded border border-border text-xs leading-relaxed text-text-muted">
                    <p className="font-bold text-white mb-1">Notes / Description:</p>
                    <p className="text-text-muted">{selectedExpense.notes}</p>
                  </div>
                )}
              </div>

              {/* Invoice File Visual Preview */}
              {selectedExpense.attachments.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-[10px] font-bold uppercase text-text-muted tracking-wider">Attachment File</h5>
                  <a
                    href={`http://localhost:4000${selectedExpense.attachments[0].url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative block w-full h-36 rounded-lg overflow-hidden border border-[#253347] bg-[#0B1220] hover:border-teal/30 transition-all text-center flex items-center justify-center"
                  >
                    {selectedExpense.attachments[0].mimeType?.startsWith("image") ? (
                      <>
                        <img
                          src={`http://localhost:4000${selectedExpense.attachments[0].url}`}
                          alt="Invoice Preview"
                          className="w-full h-full object-cover group-hover:scale-102 transition-all opacity-80 group-hover:opacity-100"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                          <span className="text-[10px] font-black text-teal bg-[#0B1220] border border-teal/20 px-2 py-1 rounded uppercase tracking-wider">
                            View Fullscreen
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="p-4 space-y-1">
                        <FileText className="mx-auto text-teal" size={32} />
                        <p className="text-xxs font-bold text-white truncate max-w-[180px]">{selectedExpense.attachments[0].name}</p>
                        <p className="text-[9px] text-text-muted">PDF Document</p>
                      </div>
                    )}
                  </a>
                </div>
              )}

              {/* AI/OCR Scan Panel */}
              {selectedExpense.attachments.length > 0 && (
                <div className="space-y-3 border-t border-[#1B2A3F] pt-4">
                  <h5 className="text-[10px] font-black uppercase text-text-muted flex items-center gap-1.5">
                    <Loader2 size={12} className={selectedExpense.attachments[0].ocrStatus === "PROCESSING" ? "animate-spin text-teal" : "text-teal"} />
                    AI Vision Scanner Details
                  </h5>

                  {selectedExpense.attachments[0].ocrStatus === "PROCESSING" || selectedExpense.attachments[0].ocrStatus === "PENDING" ? (
                    <div className="bg-[#0B1220]/50 p-4 rounded border border-amber-500/10 text-center py-6">
                      <Loader2 className="mx-auto text-teal animate-spin mb-2" size={20} />
                      <p className="text-xs font-bold text-white">AI Vision Scanning...</p>
                      <p className="text-[10px] text-text-muted mt-0.5">Extracting merchant billing and auditing parameters.</p>
                    </div>
                  ) : selectedExpense.attachments[0].ocrStatus === "FAILED" ? (
                    <div className="bg-red-500/5 p-3 rounded border border-red-500/10 text-center text-xxs text-red-400">
                      OCR scan failed. Validation status undetermined.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className={`p-2 rounded border flex items-center justify-between text-xs font-bold ${
                        selectedExpense.attachments[0].aiAnalysis?.verificationStatus === "VERIFIED"
                          ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/10"
                          : "bg-amber-500/5 text-amber-400 border-amber-500/10"
                      }`}>
                        <span>Audit Status:</span>
                        <span className="uppercase tracking-wider">{selectedExpense.attachments[0].aiAnalysis?.verificationStatus}</span>
                      </div>

                      {/* Scanned OCR Terminal Box */}
                      {selectedExpense.attachments[0].ocrText && (
                        <div className="space-y-1">
                          <p className="text-[9px] font-black uppercase tracking-widest text-text-muted">OCR Text Stream</p>
                          <pre className="p-3 bg-[#030712]/95 border border-[#253347] rounded-lg text-[9px] font-mono text-emerald-400 overflow-x-auto leading-relaxed">
                            {selectedExpense.attachments[0].ocrText}
                          </pre>
                        </div>
                      )}

                      {/* Audit Notes */}
                      {selectedExpense.attachments[0].aiAnalysis?.auditNotes && (
                        <div className="bg-[#0B1220]/50 p-2.5 rounded border border-[#253347] text-[10px] leading-relaxed text-text-muted">
                          <p className="font-bold text-white mb-0.5">AI Summary Report:</p>
                          <p className="text-text-muted">{selectedExpense.attachments[0].aiAnalysis?.auditNotes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons inside Drawer */}
              <div className="space-y-2 border-t border-[#1B2A3F] pt-4">
                {/* Delete Expense */}
                {selectedExpense.userId === user.id && selectedExpense.status === "PENDING" && (
                  <button
                    onClick={() => handleDeleteExpense(selectedExpense.id)}
                    className="w-full text-center text-xs font-black text-red-400 hover:text-red-500 transition-all border border-red-500/15 py-2.5 rounded-lg bg-red-500/5 hover:bg-red-500/10"
                  >
                    Delete Expense Request
                  </button>
                )}

                {/* Manager Actions */}
                {(user.role === "ADMIN" || user.role === "MANAGER") && selectedExpense.status === "PENDING" && selectedExpense.userId !== user.id && (
                  <div className="flex gap-2">
                    <button
                      disabled={reviewing}
                      onClick={() => handleReviewExpense(selectedExpense.id, true)}
                      className="flex-1 text-center py-2.5 text-xs font-black bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 rounded-lg transition-all"
                    >
                      Approve
                    </button>
                    <button
                      disabled={reviewing}
                      onClick={() => {
                        setShowFeedbackModal(selectedExpense.id);
                        setFeedbackText("");
                      }}
                      className="flex-1 text-center py-2.5 text-xs font-black bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20 rounded-lg transition-all"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-[#060A13]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#121E30] border border-border rounded-xl p-5 shadow-2xl space-y-3">
            <h4 className="text-xs font-black text-white flex items-center gap-1.5 uppercase tracking-wider">
              <XCircle className="text-red-400" size={16} />
              Reject Reimbursement
            </h4>
            
            <p className="text-[10px] text-text-muted leading-normal">
              Provide feedback or notes for rejecting this expense. This will notify the user.
            </p>

            <textarea
              required
              rows={2}
              placeholder="Reason for rejection..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className="w-full rounded-lg border border-[#253347] bg-[#0B1220]/80 p-2.5 text-xs text-text-primary focus:border-teal focus:outline-none"
            />

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setShowFeedbackModal(null)}
                className="px-3 py-1.5 rounded text-xs font-bold text-text-muted hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                disabled={reviewing}
                onClick={() => handleReviewExpense(showFeedbackModal, false)}
                className="px-3 py-1.5 rounded text-xs font-black bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

// Custom UI Illustrations
function EmptyExpensesIllustration() {
  return (
    <svg className="mx-auto h-8 w-8 text-text-muted/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l2-2 4 4m0-7V3a2 2 0 012-2h4a2 2 0 012 2v9a2 2 0 01-2 2h-1m-4 18c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function StatCardIllustration() {
  return (
    <svg className="mx-auto h-8 w-8 text-text-muted/15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}

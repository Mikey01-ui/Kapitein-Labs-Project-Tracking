import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiRequest } from "../../services/apiClient";
import { useAuth } from "../../context/AuthContext";
import { ArrowRight, ArrowLeft, AlertCircle, Loader2, Building2, CheckCircle2, Lock, User, Shield, MapPin, Phone, FileText, PenTool, DollarSign, Calendar, Printer, Check } from "lucide-react";
import ShapeGrid from "../../components/effects/ShapeGrid";

interface AcceptInvitationProps {
  isDemo?: boolean;
}

export function AcceptInvitation({ isDemo: isDemoProp }: AcceptInvitationProps) {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { login } = useAuth();

  const isDemo = isDemoProp || token === "demo" || window.location.pathname.includes("invite-demo");

  const [invitation, setInvitation] = useState<{
    email: string;
    role: string;
    project?: { id: string; name: string; clientName: string; description: string };
    invitedBy?: { name: string; email: string };
  } | null>(null);

  const [loading, setLoading] = useState(!isDemo);
  const [error, setError] = useState<string | null>(null);

  // 4-Step Onboarding Wizard
  // Step 1: Client PM Details
  // Step 2: Set Password
  // Step 3: Review & Sign E-Contract
  // Step 4: Success & Enter Dashboard
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form Fields - Step 1: Signer Info
  const [name, setName] = useState(isDemo ? "Margaret Shen" : "");
  const [title, setTitle] = useState(isDemo ? "Head of Product & Operations" : "");
  const [address, setAddress] = useState(isDemo ? "DimaHire Inc., Victoria Island Innovation Hub, Lagos, Nigeria" : "");
  const [phone, setPhone] = useState(isDemo ? "+234 814 555 0192" : "");

  // Form Fields - Step 2: Password
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Form Fields - Step 3: Contract Terms & Signature
  const [startDate, setStartDate] = useState("2026-09-05");
  const [completionDate, setCompletionDate] = useState("2026-09-25");
  const [paymentMethod, setPaymentMethod] = useState<"crypto" | "nigerian" | "dutch">("crypto");
  const [portfolioAllowed, setPortfolioAllowed] = useState(true);
  const [typedSignature, setTypedSignature] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isDemo) {
      setInvitation({
        email: "dimahire.ng@gmail.com",
        role: "PROJECT_MANAGER",
        project: {
          id: "proj-dimahire",
          name: "DimaHire Platform",
          clientName: "DimaHire",
          description: "Next-generation hiring and recruitment intelligence platform."
        },
        invitedBy: {
          name: "Milton (Miltomy Founder)",
          email: "miltomy@gmail.com"
        }
      });
      setLoading(false);
      return;
    }

    if (!token) {
      setError("Invitation token missing");
      setLoading(false);
      return;
    }

    apiRequest<any>(`/invitations/token/${token}`)
      .then((res) => {
        setInvitation(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Invalid or expired invitation link");
        setLoading(false);
      });
  }, [token, isDemo]);

  // Step 1 Validation -> Go to Step 2
  const handleNextFromStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Please enter your full legal name.");
      return;
    }
    if (!address.trim()) {
      setFormError("Please enter your company / business address.");
      return;
    }

    setStep(2);
  };

  // Step 2 Validation -> Go to Step 3 (E-Contract)
  const handleNextFromStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (password.length < 6) {
      setFormError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    // Auto-populate typed signature with legal name if empty
    if (!typedSignature) {
      setTypedSignature(name.trim());
    }

    setStep(3);
  };

  // Step 3 Submit (E-Contract Sign & Finalize)
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!typedSignature.trim()) {
      setFormError("Please type your legal name as your electronic signature.");
      return;
    }

    if (!agreedToTerms) {
      setFormError("Please confirm your authorization and agreement to the contract terms.");
      return;
    }

    setSubmitting(true);

    if (isDemo) {
      setTimeout(() => {
        setSubmitting(false);
        setStep(4);
        setTimeout(() => {
          navigate("/projects");
        }, 2200);
      }, 1000);
      return;
    }

    try {
      const res = await apiRequest<{ token: string; user: any }>("/invitations/accept", {
        method: "POST",
        body: JSON.stringify({
          token,
          name: name.trim(),
          password,
          contractData: {
            representativeTitle: title,
            address: address,
            phone: phone,
            startDate: startDate,
            completionDate: completionDate,
            paymentMethod: paymentMethod,
            portfolioAllowed: portfolioAllowed,
            signature: typedSignature.trim(),
            signedAt: new Date().toISOString()
          }
        }),
      });

      setStep(4);
      setTimeout(() => {
        login(res.token, res.user);
        navigate("/dashboard");
      }, 1800);
    } catch (err: any) {
      setFormError(err.message || "Failed to complete onboarding.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#080808] flex items-center justify-center text-[#f0ede6]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#c8ff00]" />
          <p className="text-sm font-bold text-[#888888]">Validating your agency invite...</p>
        </div>
      </main>
    );
  }

  if (error || !invitation) {
    return (
      <main className="min-h-screen bg-[#080808] flex items-center justify-center p-6 text-[#f0ede6]">
        <div className="w-full max-w-[31rem] rounded bg-[#111111] border border-[#222222] p-8 sm:p-10 shadow-2xl text-center">
          <div className="w-12 h-12 rounded bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2 font-display">Invitation Expired or Invalid</h2>
          <p className="text-xs text-[#888888] mb-6 leading-relaxed">
            {error || "This invitation link is no longer valid. Please ask your agency administrator to issue a new invite."}
          </p>
          <Link
            to="/login"
            className="h-14 w-full rounded bg-[#c8ff00] text-xs font-black uppercase tracking-[0.22em] text-[#080808] transition hover:bg-[#b2e600] flex items-center justify-center"
          >
            Go to Sign In
          </Link>
        </div>
      </main>
    );
  }

  const roleLabel = "Project Manager";
  const clientCompany = invitation.project?.clientName || "DimaHire";

  return (
    <main className="min-h-screen bg-[#080808] text-[#f0ede6]">
      <div className={`grid min-h-screen ${step === 3 ? "grid-cols-1 max-w-5xl mx-auto py-8 px-4" : "lg:grid-cols-[1fr_1fr]"}`}>
        
        {/* LEFT BRAND SECTION (Hidden on Step 3 for wide contract view) */}
        {step !== 3 && (
          <section className="relative hidden lg:flex min-h-[44rem] overflow-hidden bg-[#0c0c0c] px-8 py-10 sm:px-12 lg:min-h-screen lg:px-16 select-none">
            <div className="absolute -inset-48 rotate-45 scale-125 opacity-80">
              <ShapeGrid
                speed={0.5}
                squareSize={40}
                direction="diagonal"
                borderColor="#1f1f1f"
                hoverFillColor="#c8ff0033"
                hoverColor="#c8ff0033"
                size={40}
                shape="square"
                hoverTrailAmount={8}
              />
            </div>
            
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(8,8,8,0)_0%,rgba(8,8,8,0.1)_68%,#080808_100%)]" />

            <div className="pointer-events-none relative z-10 flex min-h-full w-full flex-col justify-between">
              <div>
                <p className="text-2xl font-black tracking-tight sm:text-3xl">
                  Miltomy<span className="text-[#c8ff00]">.</span>
                </p>
                {isDemo && (
                  <span className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#c8ff00]/10 text-[#c8ff00] border border-[#c8ff00]/30">
                    Interactive PM Onboarding Demo
                  </span>
                )}
              </div>

              <div className="max-w-2xl pb-16">
                <h1 className="text-4xl font-light leading-none tracking-normal text-white sm:text-5xl xl:text-6xl font-display">
                  Project Manager Onboarding
                </h1>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.28em] text-[#888888] sm:text-sm">
                  Client & Legal Intelligence Portal
                </p>
              </div>

              <p className="text-sm font-semibold text-[#888888]">
                Invited by {invitation.invitedBy?.name || "Miltomy Agency"}
              </p>
            </div>
          </section>
        )}

        {/* RIGHT WIZARD SECTION */}
        <section className={`flex min-h-screen items-center justify-center ${step === 3 ? "w-full" : "bg-[#080808] px-6 py-12"}`}>
          <div className={`w-full ${step === 3 ? "max-w-4xl" : "max-w-[32rem]"} rounded bg-[#111111] border border-[#222222] px-6 py-8 sm:px-10 sm:py-10 shadow-2xl shadow-black/40`}>
            
            {/* Step Progress & Role Badge */}
            {step < 4 && (
              <div className="mb-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#c8ff00]">
                    Step {step} of 3: {step === 1 ? "Organization Info" : step === 2 ? "Account Security" : "Review & Execute Contract"}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#181818] text-[#c8ff00] border border-[#262626]">
                    {roleLabel} &bull; {clientCompany}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-[#181818] rounded-full overflow-hidden border border-[#222222]">
                  <div
                    className="h-full bg-[#c8ff00] transition-all duration-300"
                    style={{ width: `${(step / 3) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error Banner */}
            {formError && (
              <div className="mb-5 p-3 rounded border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-semibold animate-fade-in flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* STEP 1: Full Name, Role & Company Address */}
            {step === 1 && (
              <form onSubmit={handleNextFromStep1} className="space-y-5 animate-fade-in">
                <div>
                  <h2 className="text-2xl font-bold tracking-normal text-white font-display">
                    Client Representative Information
                  </h2>
                  <p className="mt-1 text-xs text-[#888888]">
                    Please provide your legal contact details to populate your project workspace and agreement.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-1.5">
                    Authorized Representative Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. Margaret Shen"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 w-full rounded border border-[#262626] bg-[#161616] px-4 text-sm font-semibold text-white outline-none focus:border-[#c8ff00] transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-1.5">
                    Official Title / Role *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Head of Product & Operations"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-12 w-full rounded border border-[#262626] bg-[#161616] px-4 text-sm font-semibold text-white outline-none focus:border-[#c8ff00] transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-1.5">
                    Company Business / Physical Address *
                  </label>
                  <div className="relative">
                    <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#888888]" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. DimaHire Inc., Victoria Island Hub, Lagos, Nigeria"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="h-12 w-full rounded border border-[#262626] bg-[#161616] pl-9 pr-4 text-sm font-semibold text-white outline-none focus:border-[#c8ff00] transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-1.5">
                    Phone / WhatsApp Number
                  </label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#888888]" />
                    <input
                      type="text"
                      placeholder="+234 814 000 0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-12 w-full rounded border border-[#262626] bg-[#161616] pl-9 pr-4 text-sm font-semibold text-white outline-none focus:border-[#c8ff00] transition"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="h-12 w-full rounded bg-[#c8ff00] text-xs font-black uppercase tracking-[0.22em] text-[#080808] transition hover:bg-[#b2e600] flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#c8ff00]/15"
                  >
                    <span>Continue to Security</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Password Setup */}
            {step === 2 && (
              <form onSubmit={handleNextFromStep2} className="space-y-5 animate-fade-in">
                <div>
                  <h2 className="text-2xl font-bold tracking-normal text-white font-display">
                    Create your portal password
                  </h2>
                  <p className="mt-1 text-xs text-[#888888]">
                    Set a secure password to access your live DimaHire sprint boards and deliverables.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-1.5">
                    Create Password *
                  </label>
                  <input
                    type="password"
                    required
                    autoFocus
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 w-full rounded border border-[#262626] bg-[#161616] px-4 text-sm font-semibold text-white outline-none focus:border-[#c8ff00] transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-1.5">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-12 w-full rounded border border-[#262626] bg-[#161616] px-4 text-sm font-semibold text-white outline-none focus:border-[#c8ff00] transition"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="h-12 px-5 rounded bg-[#161616] border border-[#262626] text-[#888888] hover:text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    className="h-12 flex-1 rounded bg-[#c8ff00] text-xs font-black uppercase tracking-[0.22em] text-[#080808] transition hover:bg-[#b2e600] flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#c8ff00]/15"
                  >
                    <span>Proceed to E-Contract</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Full E-Contract Review & Electronic Signature */}
            {step === 3 && (
              <form onSubmit={handleFinalSubmit} className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between border-b border-[#222222] pb-4">
                  <div>
                    <h2 className="text-2xl font-bold tracking-normal text-white font-display">
                      Freelance Front-End Development Agreement
                    </h2>
                    <p className="mt-1 text-xs text-[#888888]">
                      Please review the terms, select your delivery dates, and execute your electronic signature below.
                    </p>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded bg-[#c8ff00]/10 border border-[#c8ff00]/30 text-[#c8ff00]">
                    Total Agreed: $500 USD
                  </span>
                </div>

                {/* Timeline & Payment Selectors */}
                <div className="bg-[#141414] border border-[#262626] rounded p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-1.5">
                        Project Start Date
                      </label>
                      <input
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-11 w-full rounded border border-[#262626] bg-[#161616] px-3.5 text-xs font-semibold text-white outline-none focus:border-[#c8ff00] transition cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-1.5">
                        Target Completion Date
                      </label>
                      <input
                        type="date"
                        required
                        value={completionDate}
                        onChange={(e) => setCompletionDate(e.target.value)}
                        className="h-11 w-full rounded border border-[#262626] bg-[#161616] px-3.5 text-xs font-semibold text-white outline-none focus:border-[#c8ff00] transition cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Payment Channel */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-1.5">
                      Agreed Payment Channel ($500 USD Net: $250 Upfront / $250 Delivery)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <label className={`p-2.5 rounded border cursor-pointer flex items-center gap-2 text-xs font-bold transition ${
                        paymentMethod === "crypto" ? "bg-[#181818] border-[#c8ff00] text-white" : "bg-[#161616] border-[#262626] text-[#888888]"
                      }`}>
                        <input
                          type="radio"
                          name="pmPay"
                          checked={paymentMethod === "crypto"}
                          onChange={() => setPaymentMethod("crypto")}
                          className="text-[#c8ff00]"
                        />
                        <span>Crypto (USDT/USDC)</span>
                      </label>

                      <label className={`p-2.5 rounded border cursor-pointer flex items-center gap-2 text-xs font-bold transition ${
                        paymentMethod === "nigerian" ? "bg-[#181818] border-[#c8ff00] text-white" : "bg-[#161616] border-[#262626] text-[#888888]"
                      }`}>
                        <input
                          type="radio"
                          name="pmPay"
                          checked={paymentMethod === "nigerian"}
                          onChange={() => setPaymentMethod("nigerian")}
                          className="text-[#c8ff00]"
                        />
                        <span>Nigerian Bank</span>
                      </label>

                      <label className={`p-2.5 rounded border cursor-pointer flex items-center gap-2 text-xs font-bold transition ${
                        paymentMethod === "dutch" ? "bg-[#181818] border-[#c8ff00] text-white" : "bg-[#161616] border-[#262626] text-[#888888]"
                      }`}>
                        <input
                          type="radio"
                          name="pmPay"
                          checked={paymentMethod === "dutch"}
                          onChange={() => setPaymentMethod("dutch")}
                          className="text-[#c8ff00]"
                        />
                        <span>Dutch Bank (IBAN)</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Scrollable Legal Agreement Box */}
                <div className="h-64 overflow-y-auto planka-scrollbar bg-[#080808] border border-[#222222] rounded p-5 font-mono text-[11px] text-[#bbbbbb] leading-relaxed space-y-3">
                  <div className="font-bold text-white text-sm text-center border-b border-[#1f1f1f] pb-2 font-display">
                    FREELANCE FRONT-END DEVELOPMENT AGREEMENT
                  </div>

                  <p>
                    <strong>PARTIES:</strong><br />
                    • <strong>Client:</strong> {clientCompany}<br />
                    • <strong>Representative:</strong> <span className="text-[#c8ff00]">{name} ({title})</span><br />
                    • <strong>Address:</strong> <span className="text-[#c8ff00]">{address}</span><br />
                    • <strong>Email:</strong> {invitation.email}<br />
                    • <strong>Developer:</strong> Miltomy (miltomy@gmail.com)
                  </p>

                  <p>
                    <strong>1. ENGAGEMENT & SERVICES:</strong> Independent freelance front-end development (React/Next.js). Developing interfaces, responsive layouts, and interactive components. Total fee: USD $500.
                  </p>

                  <p>
                    <strong>2. FRONT-END LIMITATION & PROTECTION CLAUSE:</strong> The Developer is strictly engaged for front-end implementation. Incomplete backend endpoints, backend errors, or third-party service downtime shall NOT constitute a defect nor grounds for withholding milestone acceptance or payment.
                  </p>

                  <p>
                    <strong>3. PAYMENT SCHEDULE:</strong> USD $250 payable before commencement; USD $250 payable within seven (7) calendar days after final delivery and acceptance. Client covers any transaction/wire fees.
                  </p>

                  <p>
                    <strong>4. COMMUNICATION & REVISIONS:</strong> Primary channel is WhatsApp. Up to two (2) reasonable revision rounds included. 5 business days acceptance review window.
                  </p>

                  <p>
                    <strong>5. DATES & JURISDICTION:</strong> Start Date: <span className="text-[#c8ff00]">{startDate}</span> &bull; Target Completion: <span className="text-[#c8ff00]">{completionDate}</span>. Governed by the laws of the Federal Republic of Nigeria.
                  </p>
                </div>

                {/* Signature Box */}
                <div className="bg-[#141414] border border-[#262626] rounded p-5 space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-1.5">
                      Type Your Legal Name to Sign Electronically *
                    </label>
                    <input
                      type="text"
                      required
                      value={typedSignature}
                      onChange={(e) => setTypedSignature(e.target.value)}
                      placeholder="Type your full legal name here"
                      className="h-12 w-full rounded border border-[#262626] bg-[#161616] px-4 text-sm font-semibold text-white outline-none focus:border-[#c8ff00] transition"
                    />
                  </div>

                  {typedSignature && (
                    <div className="p-4 rounded bg-[#080808] border border-[#222222] flex items-center justify-between">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-[#888888] block">Electronic Signature:</span>
                        <span className="text-2xl text-[#c8ff00] font-serif italic tracking-wide">
                          {typedSignature}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-green-400 bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
                        LEGAL E-SIGN READY
                      </span>
                    </div>
                  )}

                  <label className="flex items-start gap-2.5 pt-1 text-xs text-[#cccccc] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      required
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-0.5 rounded border-[#262626] text-[#c8ff00] focus:ring-[#c8ff00] bg-[#161616] h-4 w-4 cursor-pointer shrink-0"
                    />
                    <span className="leading-relaxed">
                      I confirm that I am an authorized representative of <strong className="text-white">{clientCompany}</strong>, and I adopt my typed name as my legal signature, executing the Freelance Front-End Development Agreement.
                    </span>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="h-12 px-6 rounded bg-[#161616] border border-[#262626] text-[#888888] hover:text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={submitting || !typedSignature.trim() || !agreedToTerms}
                    className="h-12 px-8 rounded bg-[#c8ff00] text-xs font-black uppercase tracking-[0.22em] text-[#080808] transition hover:bg-[#b2e600] flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#c8ff00]/20 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Signing & Executing...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Sign Contract & Enter Dashboard</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 4: Success & Workspace Entry */}
            {step === 4 && (
              <div className="space-y-6 animate-scale-up text-center py-6">
                <div className="w-16 h-16 rounded-full bg-[#c8ff00]/10 border border-[#c8ff00]/30 text-[#c8ff00] flex items-center justify-center mx-auto shadow-xl shadow-[#c8ff00]/10">
                  <CheckCircle2 size={32} />
                </div>

                <div>
                  <h2 className="text-2xl font-bold tracking-normal text-white font-display">
                    Agreement Executed & Workspace Unlocked!
                  </h2>
                  <p className="mt-2 text-xs text-[#888888] leading-relaxed max-w-md mx-auto">
                    Welcome aboard, <strong className="text-white">{name}</strong>. Your Freelance Development Agreement for <strong className="text-white">{clientCompany}</strong> has been executed and stored in your portal.
                  </p>
                </div>

                <div className="p-4 rounded bg-[#080808] border border-[#222222] text-xs max-w-sm mx-auto text-left space-y-1 text-[#888888]">
                  <div>Signatory: <strong className="text-white">{typedSignature}</strong></div>
                  <div>Address: <strong className="text-white">{address}</strong></div>
                  <div>Start Date: <strong className="text-[#c8ff00]">{startDate}</strong></div>
                  <div>Target Delivery: <strong className="text-[#c8ff00]">{completionDate}</strong></div>
                  <div>Status: <strong className="text-green-400">ACTIVE &bull; SIGNED</strong></div>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-[#c8ff00] font-bold pt-2">
                  <Loader2 size={16} className="animate-spin" />
                  <span>Entering Client Dashboard...</span>
                </div>
              </div>
            )}

            {step < 3 && (
              <p className="mt-8 text-center text-xs font-semibold text-[#888888]">
                Already registered?{" "}
                <Link to="/login" className="text-[#c8ff00] font-bold hover:underline">
                  Sign In
                </Link>
              </p>
            )}

          </div>
        </section>

      </div>
    </main>
  );
}

import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, Loader2, Building2, User, Mail, Shield, Check } from "lucide-react";
import ShapeGrid from "../../components/effects/ShapeGrid";
import { apiRequest } from "../../services/apiClient";
import { useAuth } from "../../context/AuthContext";

export function AcceptInvitation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Wizard Step: 1 = Org Info, 2 = Password Setup, 3 = Complete & Redirect
  const [step, setStep] = useState(1);

  // Invitation Meta
  const [invitedEmail, setInvitedEmail] = useState("");
  const [assignedRole, setAssignedRole] = useState("PRODUCT_MANAGER");
  const [clientCompany, setClientCompany] = useState("DimaHire");

  // Form Fields - Step 1: User Profile
  const [name, setName] = useState("");
  const [title, setTitle] = useState("Product Manager");
  const [phone, setPhone] = useState("");

  // Form Fields - Step 2: Account Security
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Load invitation details from token
  useEffect(() => {
    async function verifyToken() {
      try {
        const res = await apiRequest<{
          email: string;
          role: string;
          company?: string;
        }>(`/invitations/verify/${token}`);

        setInvitedEmail(res.email);
        setAssignedRole(res.role || "PRODUCT_MANAGER");
        if (res.company) setClientCompany(res.company);
        setLoading(false);
      } catch (err: any) {
        setInvitationError(err.message || "This invitation link is invalid or has expired.");
        setLoading(false);
      }
    }

    verifyToken();
  }, [token]);

  // Step 1 Validation -> Go to Step 2
  const handleNextFromStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Please enter your full legal name.");
      return;
    }

    setStep(2);
  };

  // Step 2 Submit (Account Security & Finalize)
  const handleFinalSubmit = async (e: React.FormEvent) => {
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

    setSubmitting(true);

    try {
      const res = await apiRequest<{ token: string; user: any }>("/invitations/accept", {
        method: "POST",
        body: JSON.stringify({
          token,
          name: name.trim(),
          password,
        }),
      });

      setStep(3);
      setTimeout(() => {
        login(res.token, res.user);
        navigate("/dashboard");
      }, 1600);
    } catch (err: any) {
      setFormError(err.message || "Failed to complete onboarding.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#080808] flex items-center justify-center p-6 text-white">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#c8ff00]" />
          <p className="text-xs uppercase tracking-[0.25em] font-bold text-[#888888]">
            Verifying Invitation Credentials...
          </p>
        </div>
      </main>
    );
  }

  if (invitationError) {
    return (
      <main className="min-h-screen bg-[#080808] flex items-center justify-center p-6 text-white">
        <div className="w-full max-w-md bg-[#0e0e0e] border border-red-500/30 rounded-lg p-8 text-center space-y-6 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto border border-red-500/20">
            <AlertCircle size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-white">Invalid or Expired Invitation</h1>
            <p className="mt-2 text-xs text-[#888888] leading-relaxed">{invitationError}</p>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center justify-center w-full h-11 rounded bg-[#161616] border border-[#262626] text-xs font-bold uppercase tracking-wider text-white hover:text-[#c8ff00] hover:border-[#c8ff00] transition"
          >
            Back to Sign In
          </Link>
        </div>
      </main>
    );
  }

  const roleLabel = assignedRole === "OWNER"
    ? "Agency Principal"
    : assignedRole === "PROJECT_MANAGER"
      ? "Product Manager"
      : assignedRole === "DEVELOPER"
        ? "Lead Developer"
        : "Client Partner";

  return (
    <main className="min-h-screen bg-[#080808] text-[#f0ede6]">
      <div className="grid min-h-screen lg:grid-cols-[1fr_1fr]">

        {/* LEFT BRAND SECTION */}
        <section className="relative hidden lg:flex min-h-[44rem] overflow-hidden bg-[#0c0c0c] px-8 py-10 sm:px-12 lg:min-h-screen lg:px-16 select-none border-r border-[#1a1a1a]">
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
            <p className="text-2xl font-black tracking-tight sm:text-3xl">
              Miltomy<span className="text-[#c8ff00]">.</span>
            </p>

            <div className="space-y-4 max-w-md">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-[#c8ff00]/10 text-[#c8ff00] border border-[#c8ff00]/30 font-display">
                Client Workspace Onboarding
              </span>
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl font-display leading-[1.08] text-white">
                Welcome to <br />
                <span className="text-[#c8ff00]">{clientCompany}</span>.
              </h1>
              <p className="text-xs text-[#888888] leading-relaxed">
                You have been authorized as a <strong>{roleLabel}</strong>. Complete your profile and setup your credentials to enter your dedicated sprint environment.
              </p>
            </div>

            <div className="flex items-center gap-6 text-[11px] text-[#666666] font-mono">
              <span>● Production Environment</span>
              <span>● Real-Time Kanban</span>
            </div>
          </div>
        </section>

        {/* RIGHT WIZARD SECTION */}
        <section className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-16 overflow-y-auto max-h-screen">
          <div className="mx-auto w-full max-w-md">

            {/* Mobile Branding */}
            <div className="lg:hidden mb-8">
              <p className="text-2xl font-black tracking-tight">
                Miltomy<span className="text-[#c8ff00]">.</span>
              </p>
            </div>

            {/* Step Progress */}
            {step < 3 && (
              <div className="mb-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#c8ff00]">
                    Step {step} of 2: {step === 1 ? "Organization Info" : "Account Security"}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#181818] text-[#c8ff00] border border-[#262626]">
                    {roleLabel} &bull; {clientCompany}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-[#181818] rounded-full overflow-hidden border border-[#222222]">
                  <div
                    className="h-full bg-[#c8ff00] transition-all duration-300"
                    style={{ width: `${(step / 2) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {formError && (
              <div className="mb-6 p-4 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-3">
                <AlertCircle size={16} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* STEP 1: Organization & Contact Info */}
            {step === 1 && (
              <form onSubmit={handleNextFromStep1} className="space-y-4 animate-fade-in">
                <div>
                  <h2 className="text-2xl font-bold tracking-normal text-white font-display">
                    Personal & Organization Details
                  </h2>
                  <p className="mt-1 text-xs text-[#888888]">
                    Verify your identity and communication details for workspace collaboration.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-1.5">
                    Authorized Email Address
                  </label>
                  <input
                    type="email"
                    disabled
                    value={invitedEmail}
                    className="h-12 w-full rounded border border-[#262626] bg-[#121212] px-4 text-sm font-semibold text-[#888888] cursor-not-allowed outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-1.5">
                    Full Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. Alex Vance"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 w-full rounded border border-[#262626] bg-[#161616] px-4 text-sm font-semibold text-white outline-none focus:border-[#c8ff00] transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-1.5">
                      Your Professional Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Product Manager"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="h-12 w-full rounded border border-[#262626] bg-[#161616] px-4 text-sm font-semibold text-white outline-none focus:border-[#c8ff00] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-1.5">
                      Company / Organization
                    </label>
                    <input
                      type="text"
                      disabled
                      value={clientCompany}
                      className="h-12 w-full rounded border border-[#262626] bg-[#121212] px-4 text-sm font-semibold text-[#888888] cursor-not-allowed outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-1.5">
                    Phone / WhatsApp Number (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +234 800 000 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-12 w-full rounded border border-[#262626] bg-[#161616] px-4 text-sm font-semibold text-white outline-none focus:border-[#c8ff00] transition"
                  />
                </div>

                <button
                  type="submit"
                  className="h-12 w-full rounded bg-[#c8ff00] text-xs font-black uppercase tracking-[0.22em] text-[#080808] transition hover:bg-[#b2e600] flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#c8ff00]/15 mt-6"
                >
                  <span>Continue to Password Setup</span>
                  <ArrowRight size={16} />
                </button>
              </form>
            )}

            {/* STEP 2: Account Security */}
            {step === 2 && (
              <form onSubmit={handleFinalSubmit} className="space-y-4 animate-fade-in">
                <div>
                  <h2 className="text-2xl font-bold tracking-normal text-white font-display">
                    Secure Your Account
                  </h2>
                  <p className="mt-1 text-xs text-[#888888]">
                    Create a strong master password to safeguard your sprint boards and deliverables.
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
                    disabled={submitting}
                    className="h-12 flex-1 rounded bg-[#c8ff00] text-xs font-black uppercase tracking-[0.22em] text-[#080808] transition hover:bg-[#b2e600] flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#c8ff00]/15 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <>
                        <span>Complete Setup & Enter Dashboard</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Success & Workspace Entry */}
            {step === 3 && (
              <div className="space-y-6 animate-scale-up text-center py-6">
                <div className="w-16 h-16 rounded-full bg-[#c8ff00]/10 border border-[#c8ff00]/30 text-[#c8ff00] flex items-center justify-center mx-auto shadow-xl shadow-[#c8ff00]/10">
                  <CheckCircle2 size={32} />
                </div>

                <div>
                  <h2 className="text-2xl font-bold tracking-normal text-white font-display">
                    Workspace Unlocked!
                  </h2>
                  <p className="mt-2 text-xs text-[#888888] leading-relaxed max-w-md mx-auto">
                    Welcome aboard, <strong className="text-white">{name}</strong>. Your account for <strong className="text-white">{clientCompany}</strong> has been configured.
                  </p>
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

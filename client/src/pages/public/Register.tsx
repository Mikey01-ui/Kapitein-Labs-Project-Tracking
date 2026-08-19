import { useState } from "react";
import { ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import ShapeGrid from "../../components/effects/ShapeGrid";
import type { User, UserRole } from "../../types";

export function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("EMPLOYEE");
  const [password, setPassword] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  const [error, setError] = useState("");

  const handleAutoGeneratePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let generatedPassword = "";
    for (let i = 0; i < 12; i++) {
      generatedPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(generatedPassword);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError("All fields are required.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: fullName.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
          role: selectedRole
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to submit registration.");
        return;
      }

      setIsRegistered(true);
    } catch (err) {
      console.error("Register request error:", err);
      setError("Failed to connect to authentication server.");
    }
  };

  const isPreview = typeof window !== "undefined" && (window.location.search.includes("preview=true") || window.location.hash.includes("preview=true") || localStorage.getItem("kapetein_demo_mode") === "true");

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#080f1f] px-6 py-6 text-text-primary sm:px-8 sm:py-8 select-none">
      <div className="absolute -inset-48 rotate-45 scale-125 opacity-80">
        <ShapeGrid
          speed={0.5}
          squareSize={40}
          direction="diagonal"
          borderColor="#2F293A"
          hoverFillColor="#00C88A33"
          hoverColor="#00C88A33"
          size={40}
          shape="square"
          hoverTrailAmount={8}
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(18,30,48,0.12),rgba(8,15,31,0.45)_60%,rgba(8,15,31,0.75))]" />

      <header className="relative z-10 flex items-center justify-between">
        <p className="text-xl font-black tracking-tight sm:text-2xl">
          {isPreview ? (
            <>Project<span className="text-teal">Tracker</span></>
          ) : (
            <>Kapitein<span className="text-teal">Labs</span></>
          )}
        </p>
        <a className="flex items-center gap-2 text-sm font-semibold text-teal transition hover:text-teal-deep" href="/login">
          <ArrowLeft size={17} />
          Back to Login
        </a>
      </header>

      <div className="pointer-events-none relative z-10 flex flex-grow items-center justify-center py-4">
        <section className="pointer-events-auto w-full max-w-[32rem] rounded bg-[#111d30] px-6 py-6 shadow-2xl shadow-black/20 sm:px-8 sm:py-7">
          
          {isRegistered ? (
            <div className="text-center space-y-5 py-4 select-none">
              <div className="flex justify-center text-teal">
                <CheckCircle2 size={54} className="animate-pulse" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white tracking-normal sm:text-2xl">
                  Registration Submitted!
                </h2>
                <p className="text-xs text-text-muted max-w-sm mx-auto leading-relaxed">
                  Your registration request for <span className="text-teal font-semibold">{fullName}</span> has been received. 
                  An administrator must approve and activate your account before you can log in.
                </p>
              </div>
              <div className="pt-4 border-t border-[#26364d] border-dashed">
                <a 
                  href="/login" 
                  className="inline-flex h-11 items-center justify-center px-6 rounded bg-teal text-xs font-black uppercase tracking-[0.22em] text-[#061422] transition hover:bg-teal-deep"
                >
                  Return to Login
                </a>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-teal">Onboarding Request</p>
              <h1 className="mt-3 text-xl font-bold tracking-normal text-white sm:text-2xl">Create New Account</h1>
              <div className="my-4 h-px bg-[#26364d]" />

              {error && (
                <div className="flex items-center gap-2 p-3 mb-4 rounded bg-[#2D1E1E]/50 border border-red-500/20 text-[#E74C4C] text-xs font-semibold select-none">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.22em] text-text-muted">Full Name</span>
                  <input
                    className="mt-2 h-11 w-full border border-transparent border-b-[#2a3a52] bg-[#08101f] px-4 text-sm font-semibold text-white outline-none transition placeholder:text-[#8f98aa] focus:border-teal"
                    placeholder="John Smith"
                    autoComplete="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.22em] text-text-muted">Email Address</span>
                  <input
                    className="mt-2 h-11 w-full border border-transparent border-b-[#2a3a52] bg-[#08101f] px-4 text-sm font-semibold text-white outline-none transition placeholder:text-[#8f98aa] focus:border-teal"
                    placeholder="jsmith@kapiteinlabs.local"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>

                <fieldset>
                  <legend className="text-xs font-black uppercase tracking-[0.22em] text-text-muted">Requested Role</legend>
                  <div className="mt-2 grid grid-cols-3 border border-[#26364d]">
                    {[
                      { label: "Employee", value: "EMPLOYEE" },
                      { label: "Manager", value: "MANAGER" },
                      { label: "Admin", value: "ADMIN" }
                    ].map((role) => (
                      <label
                        key={role.value}
                        className={`relative flex h-11 cursor-pointer items-center justify-center text-xs font-bold transition ${
                          selectedRole === role.value ? "bg-teal text-[#061422]" : "bg-transparent text-text-muted hover:bg-navy-elevated hover:text-white"
                        }`}
                      >
                        <input
                          className="sr-only"
                          type="radio"
                          name="role"
                          checked={selectedRole === role.value}
                          onChange={() => setSelectedRole(role.value as UserRole)}
                        />
                        {role.label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.22em] text-text-muted">Password</span>
                  <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_8.5rem]">
                    <input
                      className="h-11 w-full border border-transparent border-b-[#2a3a52] bg-[#08101f] px-4 text-sm font-semibold text-white outline-none transition placeholder:text-[#8f98aa] focus:border-teal"
                      placeholder="Enter or auto-generate"
                      type="text"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      className="h-11 border border-teal px-3 text-xs font-black uppercase tracking-[0.12em] text-teal transition hover:bg-teal hover:text-[#061422]"
                      type="button"
                      onClick={handleAutoGeneratePassword}
                    >
                      Auto-generate
                    </button>
                  </div>
                </label>

                <div className="border-l-4 border-teal bg-[#1a2d48]/40 px-4 py-2.5 text-[10px] font-semibold text-text-muted leading-relaxed">
                  Important: Your account registration is pending admin review. You can only log in once an administrator approves your request.
                </div>

                <button
                  className="mt-4 h-11 w-full rounded bg-teal text-xs font-black uppercase tracking-[0.22em] text-[#061422] transition hover:bg-teal-deep"
                  type="submit"
                >
                  Submit Registration
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

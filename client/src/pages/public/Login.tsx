import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import ShapeGrid from "../../components/effects/ShapeGrid";
import { useAuth } from "../../context/AuthContext";
import type { User } from "../../types";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const isPreview = window.location.search.includes("preview=true") || window.location.hash.includes("preview=true") || localStorage.getItem("kapetein_demo_mode") === "true";

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email.trim(),
          password
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Invalid credentials.");
        return;
      }

      // Authenticate user session with JWT token
      login(data.token, data.user);
      navigate("/dashboard");
    } catch (err) {
      console.error("Login request error:", err);
      setError("Failed to connect to authentication server.");
    }
  };

  return (
    <>
      {isPreview && (
        <div className="bg-teal/10 border-b border-teal/20 text-teal px-4 py-2.5 text-xs font-semibold text-center select-none backdrop-blur-md flex items-center justify-center gap-1.5 relative z-50">
          <span>You are viewing a demonstration preview with mock data. For access to the production portal, please</span>
          <a href="https://miltomy.com/contact" target="_blank" rel="noopener noreferrer" className="underline hover:text-white transition">contact us</a>.
        </div>
      )}
      <main className="min-h-screen bg-[#080f1f] text-text-primary">
        <div className="grid min-h-screen lg:grid-cols-[1fr_1fr]">
          <section className="relative flex min-h-[44rem] overflow-hidden bg-[#091426] px-8 py-10 sm:px-12 lg:min-h-screen lg:px-16 select-none">
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
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(8,15,31,0)_0%,rgba(8,15,31,0.1)_68%,#080f1f_100%)]" />

            <div className="pointer-events-none relative z-10 flex min-h-full w-full flex-col justify-between">
              <p className="text-2xl font-black tracking-tight sm:text-3xl">
                {isPreview ? (
                  <>Project<span className="text-teal">Tracker</span></>
                ) : (
                  <>Kapitein<span className="text-teal">Labs</span></>
                )}
              </p>

              <div className="max-w-2xl pb-16">
                <h1 className="text-4xl font-light leading-none tracking-normal text-white sm:text-5xl xl:text-6xl">
                  Engineering the Future
                </h1>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.28em] text-text-muted sm:text-sm">
                  Internal Project Intelligence Platform
                </p>
              </div>

              <p className="text-sm font-semibold text-text-muted">
                {isPreview ? "Project Tracking Platform Showcase" : "Trusted by the KapiteinLabs team"}
              </p>
            </div>
          </section>

        <section className="flex min-h-screen items-center justify-center bg-[#080f1f] px-6 py-12">
          <div className="w-full max-w-[31rem] rounded bg-[#111d30] px-8 py-10 shadow-2xl shadow-black/20 sm:px-11 sm:py-12">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-teal">Welcome Back</p>
            <h2 className="mt-5 text-2xl font-bold tracking-normal text-white">Sign in to your account</h2>

            {error && (
              <div className="relative overflow-hidden mt-6 rounded-xl border border-red-500/15 bg-gradient-to-r from-red-500/5 to-rose-500/5 p-4 backdrop-blur-md shadow-lg shadow-red-950/20 select-none animate-fade-in">
                {/* Decorative glowing gradient orb behind icon */}
                <div className="absolute -left-4 -top-4 w-12 h-12 bg-red-500/10 rounded-full blur-xl pointer-events-none" />
                
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5 relative">
                    <div className="absolute inset-0 bg-red-500/20 rounded-full scale-125 animate-ping opacity-60" />
                    <div className="relative p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[#FF4F4F]">
                      <AlertCircle size={15} />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white tracking-wide">
                        {error === "Failed to connect to authentication server." ? "Authentication Link Offline" : "Access Denied"}
                      </h4>
                      {error === "Failed to connect to authentication server." && (
                        <span className="flex h-1.5 w-1.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] leading-relaxed text-[#FF9E9E] font-medium opacity-90">
                      {error === "Failed to connect to authentication server." 
                        ? "We couldn't reach the secure gateway. The network path might be undergoing maintenance." 
                        : error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSignIn} className="mt-6 space-y-6">
              <input
                className="h-14 w-full border border-transparent border-b-[#2a3a52] bg-[#08101f] px-4 text-base font-semibold text-white outline-none transition placeholder:text-[#8f98aa] focus:border-teal"
                type="email"
                placeholder="Email address"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <div className="relative">
                <input
                  className="h-14 w-full border border-transparent border-b-[#2a3a52] bg-[#08101f] px-4 pr-12 text-base font-semibold text-white outline-none transition placeholder:text-[#8f98aa] focus:border-teal"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-[#9aa6b7] transition hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div className="flex justify-end">
                <a className="text-sm font-bold text-teal transition hover:text-teal-deep" href="/forgot-password">
                  Forgot password?
                </a>
              </div>

              <button
                className="h-14 w-full rounded bg-teal text-xs font-black uppercase tracking-[0.22em] text-[#061422] transition hover:bg-teal-deep"
                type="submit"
              >
                Sign In
              </button>
            </form>

            <p className="mt-10 text-center text-sm font-semibold text-text-muted select-none">
              Don't have an account?{" "}
              <a href="/register" className="text-teal font-bold transition hover:text-teal-deep hover:underline">
                Register here
              </a>
            </p>
          </div>
        </section>
      </div>
    </main>
  </>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import ShapeGrid from "../../components/effects/ShapeGrid";
import { useAuth } from "../../context/AuthContext";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);

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
        setLoading(false);
        return;
      }

      login(data.token, data.user);
      navigate("/dashboard");
    } catch (err) {
      console.error("Login request error:", err);
      setError("Failed to connect to authentication server.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#080808] text-[#f0ede6]">
      <div className="grid min-h-screen lg:grid-cols-[1fr_1fr]">
        
        {/* LEFT SECTION (Miltomy Exact Sizing & Typography with Miltomy Colors) */}
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
            <p className="text-2xl font-black tracking-tight sm:text-3xl">
              Miltomy<span className="text-[#c8ff00]">.</span>
            </p>

            <div className="max-w-2xl pb-16">
              <h1 className="text-4xl font-light leading-none tracking-normal text-white sm:text-5xl xl:text-6xl">
                Engineering the Future
              </h1>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.28em] text-[#888888] sm:text-sm">
                Agency Client & Project Intelligence Platform
              </p>
            </div>

            <p className="text-sm font-semibold text-[#888888]">
              Trusted by the Miltomy team & client partners
            </p>
          </div>
        </section>

        {/* RIGHT SECTION (Miltomy Exact Box, Typography & Sizing) */}
        <section className="flex min-h-screen items-center justify-center bg-[#080808] px-6 py-12">
          <div className="w-full max-w-[31rem] rounded bg-[#111111] border border-[#222222] px-8 py-10 shadow-2xl shadow-black/40 sm:px-11 sm:py-12">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#c8ff00]">
              Welcome Back
            </p>
            <h2 className="mt-5 text-2xl font-bold tracking-normal text-white">
              Sign in to your account
            </h2>

            {error && (
              <div className="relative overflow-hidden mt-6 rounded border border-red-500/20 bg-gradient-to-r from-red-500/10 to-rose-500/5 p-4 backdrop-blur-md shadow-lg shadow-red-950/20 select-none animate-fade-in">
                <div className="flex gap-3 items-start">
                  <div className="flex-shrink-0 mt-0.5 relative">
                    <div className="absolute inset-0 bg-red-500/20 rounded-full scale-125 animate-ping opacity-60" />
                    <div className="relative p-1.5 rounded bg-red-500/10 border border-red-500/20 text-[#FF4F4F]">
                      <AlertCircle size={15} />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white tracking-wide">
                      {error === "Failed to connect to authentication server." ? "Authentication Link Offline" : "Access Denied"}
                    </h4>
                    <p className="text-[11px] leading-relaxed text-[#FF9E9E] font-medium opacity-90">
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
                className="h-14 w-full rounded border border-[#262626] bg-[#161616] px-4 text-base font-semibold text-white outline-none transition placeholder:text-[#888888] focus:border-[#c8ff00]"
                type="email"
                placeholder="Email address"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <div className="relative">
                <input
                  className="h-14 w-full rounded border border-[#262626] bg-[#161616] px-4 pr-12 text-base font-semibold text-white outline-none transition placeholder:text-[#888888] focus:border-[#c8ff00]"
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
                  className="absolute right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-[#888888] transition hover:text-white cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <button
                disabled={loading}
                className="h-14 w-full rounded bg-[#c8ff00] text-xs font-black uppercase tracking-[0.22em] text-[#080808] transition hover:bg-[#b2e600] flex items-center justify-center cursor-pointer shadow-lg shadow-[#c8ff00]/15"
                type="submit"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>
          </div>
        </section>

      </div>
    </main>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ArrowRight } from "lucide-react";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setSubmitted(true);
  };

  return (
    <main className="min-h-screen bg-[#080808] text-white flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-[31rem] rounded bg-[#111111] border border-[#222222] px-8 py-10 shadow-2xl shadow-black/60 sm:px-11 sm:py-12">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded bg-[#161616] border border-[#262626] shadow-xl mb-4 text-[#c8ff00] font-black text-xl font-display">
            M
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Password Reset
          </h1>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#888888] mt-1.5">
            Miltomy Agency Platform
          </p>
        </div>

        {submitted ? (
          <div className="text-center space-y-5 py-4">
            <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center mx-auto">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-white">Check Your Inbox</h3>
            <p className="text-xs text-[#888888] leading-relaxed">
              If an account exists for <span className="text-white font-semibold">{email}</span>, instructions to reset your password have been sent.
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="h-14 w-full rounded bg-[#c8ff00] text-xs font-black uppercase tracking-[0.22em] text-[#080808] transition hover:bg-[#b2e600] flex items-center justify-center gap-2"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#888888] mb-2">
                Registered Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="name@agency.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 w-full rounded border border-[#262626] bg-[#161616] px-4 text-base font-semibold text-white outline-none transition placeholder:text-[#888888] focus:border-[#c8ff00]"
              />
            </div>

            <button
              type="submit"
              className="h-14 w-full rounded bg-[#c8ff00] text-xs font-black uppercase tracking-[0.22em] text-[#080808] transition hover:bg-[#b2e600] flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#c8ff00]/15"
            >
              <span>Send Reset Instructions</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center pt-2">
              <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#888888] hover:text-white transition">
                <ArrowLeft size={13} />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

import React, { useState } from "react";
import { FileText, Download, Copy, Check, X, Shield, DollarSign, Calendar, CheckCircle2, Printer, PenTool, MapPin, Phone, Building, User, Lock } from "lucide-react";

interface ProjectContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    id: string;
    name: string;
    clientName?: string;
    description?: string;
    startDate?: string;
    deadline?: string | null;
    manager?: { name: string; email: string };
  };
}

export function ProjectContractModal({ isOpen, onClose, project }: ProjectContractModalProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "full" | "sign">("sign");
  const [copied, setCopied] = useState(false);

  // PM / Client Signer Form State
  const [clientRepName, setClientRepName] = useState("Margaret Shen");
  const [clientRepTitle, setClientRepTitle] = useState("Head of Product & Operations");
  const [clientAddress, setClientAddress] = useState("DimaHire Inc., Victoria Island Innovation Hub, Lagos, Nigeria");
  const [clientPhone, setClientPhone] = useState("+234 814 555 0192");
  const [paymentMethod, setPaymentMethod] = useState<"crypto" | "nigerian" | "dutch">("crypto");
  const [portfolioAllowed, setPortfolioAllowed] = useState(true);
  const [startDate, setStartDate] = useState(project.startDate ? project.startDate.split("T")[0] : "2026-09-05");
  const [completionDate, setCompletionDate] = useState(project.deadline ? project.deadline.split("T")[0] : "2026-09-25");
  
  // Signature State
  const [typedSignature, setTypedSignature] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [signedTimestamp, setSignedTimestamp] = useState<string | null>(null);

  if (!isOpen) return null;

  const clientCompany = project.clientName || (project.name.toLowerCase().includes("dimahire") ? "DimaHire" : project.name);
  const clientEmail = project.name.toLowerCase().includes("dimahire") ? "dimahire.ng@gmail.com" : (project.manager?.email || "dimahire.ng@gmail.com");

  const handleCopyText = () => {
    const fullText = document.getElementById("contract-full-text")?.innerText || "";
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSignContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedSignature.trim() || !agreedToTerms) return;

    setIsSigned(true);
    setSignedTimestamp(new Date().toLocaleString("en-US", { 
      timeZone: "UTC",
      dateStyle: "full",
      timeStyle: "medium"
    }) + " UTC");
    setActiveTab("full");
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in select-none">
      <div 
        className="relative w-full max-w-4xl bg-[#0e0e0e] border border-[#222222] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-[#f0ede6] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222222] bg-[#080808] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-[#c8ff00]/10 border border-[#c8ff00]/30 flex items-center justify-center text-[#c8ff00]">
              <FileText size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white uppercase tracking-wider font-display">
                  Freelance Development Agreement
                </h3>
                {isSigned ? (
                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-[#c8ff00] text-[#080808] shadow-sm shadow-[#c8ff00]/20 flex items-center gap-1">
                    <CheckCircle2 size={10} strokeWidth={3} /> Signed & Executed
                  </span>
                ) : (
                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    Awaiting PM Signature
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[#888888] mt-0.5">
                Contract between {clientCompany} &bull; Miltomy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher */}
            <div className="flex rounded bg-[#161616] p-1 border border-[#262626]">
              <button
                type="button"
                onClick={() => setActiveTab("sign")}
                className={`rounded px-3 py-1 text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "sign"
                    ? "bg-[#c8ff00] text-[#080808] shadow-md"
                    : "text-[#888888] hover:text-white"
                }`}
              >
                <PenTool size={11} />
                <span>{isSigned ? "Signatory Details" : "Sign Contract"}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("summary")}
                className={`rounded px-3 py-1 text-[10px] font-bold transition-all cursor-pointer ${
                  activeTab === "summary"
                    ? "bg-[#c8ff00] text-[#080808] shadow-md"
                    : "text-[#888888] hover:text-white"
                }`}
              >
                Summary
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("full")}
                className={`rounded px-3 py-1 text-[10px] font-bold transition-all cursor-pointer ${
                  activeTab === "full"
                    ? "bg-[#c8ff00] text-[#080808] shadow-md"
                    : "text-[#888888] hover:text-white"
                }`}
              >
                Full Agreement
              </button>
            </div>

            {/* Print / Download Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="p-1.5 rounded bg-[#161616] border border-[#262626] text-[#888888] hover:text-[#c8ff00] hover:border-[#c8ff00]/40 transition-all flex items-center gap-1.5 px-2.5 cursor-pointer"
              title="Download or Print PDF"
            >
              <Printer size={13} />
              <span className="text-[10px] font-bold">Print / PDF</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded text-[#888888] hover:text-white hover:bg-[#222222] transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto planka-scrollbar flex-1 space-y-6">

          {/* TAB 1: INTERACTIVE PM SIGNING & DETAILS FORM */}
          {activeTab === "sign" && (
            <div className="space-y-6">
              {/* Status Header Alert */}
              <div className={`p-4 rounded border flex items-center justify-between flex-wrap gap-3 ${
                isSigned 
                  ? "bg-[#c8ff00]/10 border-[#c8ff00]/30 text-[#c8ff00]" 
                  : "bg-[#141414] border-[#262626] text-white"
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded ${isSigned ? "bg-[#c8ff00] text-[#080808]" : "bg-[#222222] text-[#c8ff00]"}`}>
                    {isSigned ? <CheckCircle2 size={18} /> : <PenTool size={18} />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold font-display uppercase tracking-wider">
                      {isSigned ? "Contract Electronically Signed & Verified" : "Project Manager Signature & Onboarding Form"}
                    </h4>
                    <p className="text-[11px] text-[#888888] mt-0.5">
                      {isSigned 
                        ? `Signed by ${clientRepName} on ${signedTimestamp}. Details are legally bound to this project.`
                        : "Fill in your organizational details and provide your electronic signature below."}
                    </p>
                  </div>
                </div>

                {isSigned && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("full")}
                    className="px-3 py-1.5 rounded bg-[#c8ff00] text-[#080808] font-bold text-xs hover:bg-[#b2e600] transition cursor-pointer"
                  >
                    View Executed Contract &rarr;
                  </button>
                )}
              </div>

              <form onSubmit={handleSignContract} className="space-y-5">
                {/* 1. Signer & Organization Info */}
                <div className="bg-[#121212] border border-[#222222] rounded p-5 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#c8ff00] font-display flex items-center gap-2">
                    <Building size={14} />
                    <span>1. Client & Organization Information</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-1.5">
                        Authorized Representative Name
                      </label>
                      <input
                        type="text"
                        required
                        disabled={isSigned}
                        value={clientRepName}
                        onChange={(e) => setClientRepName(e.target.value)}
                        placeholder="e.g. Margaret Shen"
                        className="h-11 w-full rounded border border-[#262626] bg-[#161616] px-3.5 text-xs font-semibold text-white outline-none focus:border-[#c8ff00] transition disabled:opacity-70"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-1.5">
                        Official Title / Role
                      </label>
                      <input
                        type="text"
                        required
                        disabled={isSigned}
                        value={clientRepTitle}
                        onChange={(e) => setClientRepTitle(e.target.value)}
                        placeholder="e.g. Product Manager / Operations Lead"
                        className="h-11 w-full rounded border border-[#262626] bg-[#161616] px-3.5 text-xs font-semibold text-white outline-none focus:border-[#c8ff00] transition disabled:opacity-70"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-1.5">
                      Client Company Physical / Business Address
                    </label>
                    <div className="relative">
                      <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#888888]" />
                      <input
                        type="text"
                        required
                        disabled={isSigned}
                        value={clientAddress}
                        onChange={(e) => setClientAddress(e.target.value)}
                        placeholder="e.g. 14 Innovation Way, Victoria Island, Lagos, Nigeria"
                        className="h-11 w-full rounded border border-[#262626] bg-[#161616] pl-9 pr-3.5 text-xs font-semibold text-white outline-none focus:border-[#c8ff00] transition disabled:opacity-70"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-1.5">
                        WhatsApp / Phone Contact
                      </label>
                      <div className="relative">
                        <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#888888]" />
                        <input
                          type="text"
                          required
                          disabled={isSigned}
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          placeholder="+234 814 000 0000"
                          className="h-11 w-full rounded border border-[#262626] bg-[#161616] pl-9 pr-3.5 text-xs font-semibold text-white outline-none focus:border-[#c8ff00] transition disabled:opacity-70"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-1.5">
                        Client Company Email
                      </label>
                      <input
                        type="email"
                        disabled
                        value={clientEmail}
                        className="h-11 w-full rounded border border-[#262626] bg-[#121212] px-3.5 text-xs font-semibold text-[#888888] cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Timeline & Financial Preferences */}
                <div className="bg-[#121212] border border-[#222222] rounded p-5 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#c8ff00] font-display flex items-center gap-2">
                    <Calendar size={14} />
                    <span>2. Delivery Schedule & Payment Option</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-1.5">
                        Project Start Date
                      </label>
                      <input
                        type="date"
                        required
                        disabled={isSigned}
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-11 w-full rounded border border-[#262626] bg-[#161616] px-3.5 text-xs font-semibold text-white outline-none focus:border-[#c8ff00] transition disabled:opacity-70 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-1.5">
                        Target Completion Date
                      </label>
                      <input
                        type="date"
                        required
                        disabled={isSigned}
                        value={completionDate}
                        onChange={(e) => setCompletionDate(e.target.value)}
                        className="h-11 w-full rounded border border-[#262626] bg-[#161616] px-3.5 text-xs font-semibold text-white outline-none focus:border-[#c8ff00] transition disabled:opacity-70 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-2">
                      Selected Payment Disbursement Method ($500 USD Net)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <label className={`p-3 rounded border cursor-pointer flex items-center gap-2.5 text-xs font-bold transition ${
                        paymentMethod === "crypto" 
                          ? "bg-[#181818] border-[#c8ff00] text-white" 
                          : "bg-[#141414] border-[#222222] text-[#888888] hover:border-[#333]"
                      }`}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          disabled={isSigned}
                          checked={paymentMethod === "crypto"}
                          onChange={() => setPaymentMethod("crypto")}
                          className="text-[#c8ff00] focus:ring-[#c8ff00]"
                        />
                        <span>Crypto (USDT / USDC)</span>
                      </label>

                      <label className={`p-3 rounded border cursor-pointer flex items-center gap-2.5 text-xs font-bold transition ${
                        paymentMethod === "nigerian" 
                          ? "bg-[#181818] border-[#c8ff00] text-white" 
                          : "bg-[#141414] border-[#222222] text-[#888888] hover:border-[#333]"
                      }`}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          disabled={isSigned}
                          checked={paymentMethod === "nigerian"}
                          onChange={() => setPaymentMethod("nigerian")}
                          className="text-[#c8ff00] focus:ring-[#c8ff00]"
                        />
                        <span>Nigerian Bank (USD/NGN)</span>
                      </label>

                      <label className={`p-3 rounded border cursor-pointer flex items-center gap-2.5 text-xs font-bold transition ${
                        paymentMethod === "dutch" 
                          ? "bg-[#181818] border-[#c8ff00] text-white" 
                          : "bg-[#141414] border-[#222222] text-[#888888] hover:border-[#333]"
                      }`}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          disabled={isSigned}
                          checked={paymentMethod === "dutch"}
                          onChange={() => setPaymentMethod("dutch")}
                          className="text-[#c8ff00] focus:ring-[#c8ff00]"
                        />
                        <span>Dutch Bank (IBAN/SEPA)</span>
                      </label>
                    </div>
                  </div>

                  {/* Portfolio Rights Checkbox */}
                  <label className="flex items-center gap-2.5 pt-1 text-xs text-[#cccccc] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      disabled={isSigned}
                      checked={portfolioAllowed}
                      onChange={(e) => setPortfolioAllowed(e.target.checked)}
                      className="rounded border-[#262626] text-[#c8ff00] focus:ring-[#c8ff00] bg-[#161616] h-4 w-4 cursor-pointer"
                    />
                    <span>Grant Developer Portfolio Rights to showcase non-confidential UI screenshots & case study.</span>
                  </label>
                </div>

                {/* 3. Electronic Signature Section */}
                <div className="bg-[#121212] border border-[#222222] rounded p-5 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#c8ff00] font-display flex items-center gap-2">
                    <Lock size={14} />
                    <span>3. Legally Binding Electronic Signature</span>
                  </h4>

                  {!isSigned ? (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-1.5">
                          Type Full Legal Name as Electronic Signature
                        </label>
                        <input
                          type="text"
                          required
                          value={typedSignature}
                          onChange={(e) => setTypedSignature(e.target.value)}
                          placeholder="Type your legal full name here (e.g. Margaret Shen)"
                          className="h-12 w-full rounded border border-[#262626] bg-[#161616] px-4 text-sm font-semibold text-white outline-none focus:border-[#c8ff00] transition"
                        />
                      </div>

                      {/* Live Cursive Signature Preview */}
                      {typedSignature && (
                        <div className="p-4 rounded bg-[#080808] border border-[#222222] flex items-center justify-between">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-[#888888] block">Signature Preview:</span>
                            <span className="text-2xl text-[#c8ff00] font-serif italic tracking-wide">
                              {typedSignature}
                            </span>
                          </div>
                          <span className="text-[9px] font-mono text-[#888888]">
                            TIMESTAMP: WILL RECORD ON SUBMISSION
                          </span>
                        </div>
                      )}

                      <label className="flex items-start gap-2.5 pt-2 text-xs text-[#888888] cursor-pointer select-none">
                        <input
                          type="checkbox"
                          required
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          className="mt-0.5 rounded border-[#262626] text-[#c8ff00] focus:ring-[#c8ff00] bg-[#161616] h-4 w-4 cursor-pointer shrink-0"
                        />
                        <span className="leading-relaxed">
                          I confirm that I am an authorized representative of <strong className="text-white">{clientCompany}</strong>, and I adopt my typed name as my legal electronic signature, consenting to all terms in the Freelance Front-End Development Agreement.
                        </span>
                      </label>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="submit"
                          disabled={!typedSignature.trim() || !agreedToTerms}
                          className="h-12 px-8 rounded bg-[#c8ff00] hover:bg-[#b2e600] disabled:opacity-50 text-[#080808] font-black text-xs uppercase tracking-widest transition flex items-center gap-2 shadow-xl shadow-[#c8ff00]/20 cursor-pointer"
                        >
                          <CheckCircle2 size={16} />
                          <span>Sign & Finalize Agreement</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="p-5 rounded bg-[#080808] border border-[#262626] space-y-3">
                      <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-3">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-[#888888] block">Electronic Signature:</span>
                          <span className="text-2xl text-[#c8ff00] font-serif italic tracking-wide">
                            {typedSignature || clientRepName}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-green-400 bg-green-500/10 px-2.5 py-1 rounded border border-green-500/20">
                          VERIFIED SIGNATURE
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#888888]">
                        <div>Signer: <strong className="text-white">{clientRepName} ({clientRepTitle})</strong></div>
                        <div>Date & Time: <strong className="text-white">{signedTimestamp}</strong></div>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: EXECUTIVE SUMMARY */}
          {activeTab === "summary" && (
            <div className="space-y-6">
              {/* Top Banner */}
              <div className="rounded bg-[#121212] border border-[#222222] p-5 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#c8ff00]">
                    Agreed Milestone Budget
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white font-display">$500.00 USD</span>
                    <span className="text-xs text-[#888888]">Five Hundred US Dollars</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="bg-[#181818] border border-[#262626] rounded px-3.5 py-2 text-center">
                    <span className="text-[9px] text-[#888888] block uppercase font-bold">Deposit (50%)</span>
                    <span className="font-black text-white text-sm font-display">$250.00</span>
                  </div>
                  <div className="bg-[#181818] border border-[#262626] rounded px-3.5 py-2 text-center">
                    <span className="text-[9px] text-[#888888] block uppercase font-bold">Upon Delivery (50%)</span>
                    <span className="font-black text-white text-sm font-display">$250.00</span>
                  </div>
                </div>
              </div>

              {/* 2-Column Parties & Terms Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Client Box */}
                <div className="rounded bg-[#121212] border border-[#222222] p-4 space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#888888]">
                    Client Details
                  </span>
                  <h4 className="text-sm font-bold text-white">{clientCompany}</h4>
                  <div className="text-xs text-[#888888] space-y-1 pt-2 border-t border-[#1f1f1f]">
                    <div>Representative: <strong className="text-white">{clientRepName} ({clientRepTitle})</strong></div>
                    <div>Address: <strong className="text-white">{clientAddress}</strong></div>
                    <div>Email: <strong className="text-white font-medium">{clientEmail}</strong></div>
                    <div>Phone / WhatsApp: <strong className="text-[#c8ff00]">{clientPhone}</strong></div>
                  </div>
                </div>

                {/* Developer Box */}
                <div className="rounded bg-[#121212] border border-[#222222] p-4 space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#888888]">
                    Developer Details
                  </span>
                  <h4 className="text-sm font-bold text-white">Miltomy</h4>
                  <div className="text-xs text-[#888888] space-y-1 pt-2 border-t border-[#1f1f1f]">
                    <div>Email: <strong className="text-white font-medium">miltomy@gmail.com</strong></div>
                    <div>Role: <strong className="text-white">Freelance Front-End Developer</strong></div>
                    <div>Payment Channel: <strong className="text-[#c8ff00] uppercase">{paymentMethod}</strong></div>
                    <div>Revisions: <strong className="text-white">Up to 2 Reasonable Rounds</strong></div>
                  </div>
                </div>
              </div>

              {/* Key Protective Clauses Highlights */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#888888]">
                  Core Contractual Provisions
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="rounded bg-[#121212] border border-[#222222] p-3.5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[#c8ff00] font-bold text-[11px]">
                      <Shield size={14} />
                      <span>Backend Protection</span>
                    </div>
                    <p className="text-[11px] text-[#888888] leading-relaxed">
                      Evaluated on UI/UX fidelity and component states. Incomplete backend APIs cannot delay front-end acceptance or final pay.
                    </p>
                  </div>

                  <div className="rounded bg-[#121212] border border-[#222222] p-3.5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[#c8ff00] font-bold text-[11px]">
                      <DollarSign size={14} />
                      <span>Flexible Payment</span>
                    </div>
                    <p className="text-[11px] text-[#888888] leading-relaxed">
                      Disbursement via Crypto (USDT/USDC), Nigerian Bank (USD/NGN), or European Dutch Bank (IBAN/SEPA).
                    </p>
                  </div>

                  <div className="rounded bg-[#121212] border border-[#222222] p-3.5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[#c8ff00] font-bold text-[11px]">
                      <CheckCircle2 size={14} />
                      <span>IP Transfer</span>
                    </div>
                    <p className="text-[11px] text-[#888888] leading-relaxed">
                      Ownership of custom front-end deliverables and repository transfers fully to the Client upon receipt of final $250.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COMPLETE LEGAL CONTRACT TEXT (WITH EMBEDDED FILLED DATA) */}
          {activeTab === "full" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#1f1f1f]">
                <span className="text-xs text-[#888888] font-bold">
                  Official Legal Agreement Document
                </span>
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded bg-[#161616] border border-[#262626] text-[#888888] hover:text-white transition cursor-pointer"
                >
                  {copied ? <Check size={12} className="text-[#c8ff00]" /> : <Copy size={12} />}
                  <span>{copied ? "Copied to Clipboard" : "Copy Text"}</span>
                </button>
              </div>

              <div 
                id="contract-full-text" 
                className="bg-[#080808] border border-[#222222] rounded p-6 font-mono text-[11px] text-[#cccccc] leading-relaxed space-y-4 select-text"
              >
                <div className="font-bold text-white text-sm text-center border-b border-[#1f1f1f] pb-3 font-display">
                  FREELANCE FRONT-END DEVELOPMENT AGREEMENT
                </div>

                <p>
                  <strong>PARTIES</strong><br /><br />
                  <strong>Client:</strong><br />
                  • Company: {clientCompany}<br />
                  • Authorized Representative: <span className="text-[#c8ff00] font-bold">{clientRepName}</span> ({clientRepTitle})<br />
                  • Business Address: <span className="text-[#c8ff00] font-bold">{clientAddress}</span><br />
                  • Email: {clientEmail}<br />
                  • Phone / WhatsApp: <span className="text-[#c8ff00] font-bold">{clientPhone}</span><br /><br />
                  <strong>Developer:</strong><br />
                  • Name: Miltomy<br />
                  • Business: Digital Engineering & Design Studio<br />
                  • Email: miltomy@gmail.com<br />
                  • Location: Amsterdam, The Netherlands
                </p>

                <p>
                  <strong>1. ENGAGEMENT</strong><br />
                  The Client engages the Developer as an independent freelance Front-End Developer to provide front-end development services for the {clientCompany} platform. The Parties acknowledge that this engagement is project-based and does not create an employment relationship. The total agreed project fee is USD $500 (Five Hundred United States Dollars).
                </p>

                <p>
                  <strong>2. SERVICES</strong><br />
                  The Developer shall provide front-end development services, which may include:
                  • Building React/Next.js user interfaces<br />
                  • Implementing approved UI/UX designs<br />
                  • Creating responsive layouts and reusable components<br />
                  • Implementing forms and user interactions<br />
                  • Integrating design assets and collaborating with the Client team<br />
                  • Making reasonable revisions required to meet agreed specifications
                </p>

                <p>
                  <strong>3. FRONT-END DEVELOPMENT LIMITATION & BACKEND INDEPENDENCE</strong><br />
                  The Developer is engaged specifically as a Front-End Developer. Unless otherwise agreed in writing, the Developer is not responsible for backend API development, database architecture, DevOps, or server hosting infrastructure.<br /><br />
                  <strong>PROTECTION CLAUSE:</strong> Front-end deliverables shall be evaluated and accepted based on visual fidelity to agreed UI/UX designs and proper component state handling using mock, sample, or available staging data. Incomplete backend endpoints, backend server errors, or delays in third-party API availability shall NOT constitute a defect in the Developer's front-end deliverables, nor shall they be grounds for withholding milestone acceptance or payment.
                </p>

                <p>
                  <strong>4. PAYMENT & ACCEPTED METHODS</strong><br />
                  Total Project Fee: USD $500.<br />
                  • USD $250 payable before commencement of development.<br />
                  • USD $250 payable within seven (7) calendar days after final delivery and acceptance.<br /><br />
                  <strong>Selected Payment Channel:</strong> <span className="text-[#c8ff00] font-bold uppercase">{paymentMethod}</span> (Crypto USDT/USDC, Nigerian Commercial Bank, or European Dutch IBAN Account). The Client shall cover any transaction/wire fees so the net amount received is USD $500. Ownership of deliverables transfers only after full payment has been received.
                </p>

                <p>
                  <strong>5. COMMUNICATION</strong><br />
                  WhatsApp shall serve as the primary communication channel for day-to-day project discussions and coordination. Progress shall be measured by deliverables and milestone completion rather than continuous online availability. Reasonable response time shall generally be within twenty-four (24) hours on working days.
                </p>

                <p>
                  <strong>6. REVISIONS & CHANGE REQUESTS</strong><br />
                  The project includes up to two (2) reasonable revision rounds related to the originally agreed specifications. Additional revisions or scope expansions beyond the agreed front-end implementation shall be quoted separately before implementation.
                </p>

                <p>
                  <strong>7. SCHEDULE & ACCEPTANCE</strong><br />
                  • Project Start Date: <span className="text-[#c8ff00] font-bold">{startDate}</span><br />
                  • Target Completion Date: <span className="text-[#c8ff00] font-bold">{completionDate}</span><br /><br />
                  Upon delivery of completed front-end deliverables, the Client shall have five (5) business days to review and provide feedback. If no response is received within five (5) business days, the deliverables shall be deemed accepted.
                </p>

                <p>
                  <strong>8. INTELLECTUAL PROPERTY & PORTFOLIO RIGHTS</strong><br />
                  Upon full payment of all agreed fees, ownership of custom front-end deliverables transfers to the Client. The Developer retains ownership of generic reusable components and developer know-how.<br />
                  Portfolio Rights: <span className="text-[#c8ff00] font-bold">{portfolioAllowed ? "[X] ALLOWED" : "[ ] NOT ALLOWED"}</span>.
                </p>

                <p>
                  <strong>9. LIMITATION OF LIABILITY & GOVERNING LAW</strong><br />
                  Neither Party shall be liable for indirect or consequential damages. Except for confidentiality breaches, the Developer's total liability shall not exceed the total amount paid under this Agreement ($500 USD). This Agreement shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria.
                </p>

                <div className="border-t border-[#1f1f1f] pt-4 mt-6">
                  <div className="font-bold text-white mb-2">ELECTRONIC SIGNATURES:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 rounded bg-[#111111] border border-[#222222]">
                      <span className="text-[9px] uppercase font-bold text-[#888888] block">Client Signatory:</span>
                      <span className="text-xl text-[#c8ff00] font-serif italic block my-1">
                        {isSigned ? (typedSignature || clientRepName) : "[Pending Signature]"}
                      </span>
                      <span className="text-[10px] text-[#888888] block">Name: {clientRepName}</span>
                      <span className="text-[10px] text-[#888888] block">Date: {signedTimestamp || "Pending execution"}</span>
                    </div>

                    <div className="p-3 rounded bg-[#111111] border border-[#222222]">
                      <span className="text-[9px] uppercase font-bold text-[#888888] block">Developer Signatory:</span>
                      <span className="text-xl text-[#c8ff00] font-serif italic block my-1">
                        Miltomy Engineering
                      </span>
                      <span className="text-[10px] text-[#888888] block">Brand: Miltomy Digital</span>
                      <span className="text-[10px] text-[#888888] block">Status: Executed</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#222222] bg-[#080808] flex-shrink-0">
          <span className="text-xs text-[#888888]">
            {isSigned 
              ? `Signed by ${clientRepName} • Ready for PDF Export.` 
              : "Review terms, fill information, and execute agreement."}
          </span>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded bg-[#161616] hover:bg-[#222222] text-xs font-bold uppercase tracking-wider text-white transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="h-9 px-4 rounded bg-[#c8ff00] hover:bg-[#b2e600] text-xs font-black uppercase tracking-wider text-[#080808] transition flex items-center gap-1.5 shadow-lg shadow-[#c8ff00]/15 cursor-pointer"
            >
              <Download size={14} />
              <span>Download / Print PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

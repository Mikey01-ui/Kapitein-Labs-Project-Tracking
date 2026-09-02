import React, { useState } from "react";
import { FileText, Download, Copy, Check, X, Shield, DollarSign, Calendar, CheckCircle2, Printer } from "lucide-react";

interface ProjectContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    id: string;
    name: string;
    description?: string;
    startDate?: string;
    manager?: { name: string; email: string };
  };
}

export function ProjectContractModal({ isOpen, onClose, project }: ProjectContractModalProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "full">("summary");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const clientCompany = project.name.toLowerCase().includes("dimahire") ? "DimaHire" : project.name;
  const clientEmail = project.name.toLowerCase().includes("dimahire") ? "dimahire.ng@gmail.com" : (project.manager?.email || "client@domain.com");

  const handleCopyText = () => {
    const fullText = document.getElementById("contract-full-text")?.innerText || "";
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in select-none">
      <div 
        className="relative w-full max-w-4xl bg-[#121E30] border border-[#253347] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-white animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#253347] bg-[#0E1726] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00e5c8]/10 border border-[#00e5c8]/25 flex items-center justify-center text-[#00e5c8]">
              <FileText size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Freelance Development Agreement
                </h3>
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-[#122D23] border border-status-success/30 text-status-success">
                  Active Legal Agreement
                </span>
              </div>
              <p className="text-[10px] text-text-muted mt-0.5">
                Contract between {clientCompany} &bull; Miltomy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher */}
            <div className="flex rounded-lg bg-[#0B1220] p-1 border border-[#1B2A3F]">
              <button
                type="button"
                onClick={() => setActiveTab("summary")}
                className={`rounded-md px-3 py-1 text-[10px] font-bold transition-all ${
                  activeTab === "summary"
                    ? "bg-[#00e5c8] text-navy shadow-md"
                    : "text-text-muted hover:text-white"
                }`}
              >
                Summary
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("full")}
                className={`rounded-md px-3 py-1 text-[10px] font-bold transition-all ${
                  activeTab === "full"
                    ? "bg-[#00e5c8] text-navy shadow-md"
                    : "text-text-muted hover:text-white"
                }`}
              >
                Full Agreement
              </button>
            </div>

            {/* Print / Download Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="p-1.5 rounded-lg bg-[#0B1220] border border-[#1B2A3F] text-text-muted hover:text-[#00e5c8] hover:border-[#00e5c8]/30 transition-all flex items-center gap-1.5 px-2.5"
              title="Download or Print PDF"
            >
              <Printer size={13} />
              <span className="text-[10px] font-bold">Print / PDF</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-[#1B2A3F] transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto planka-scrollbar flex-1 space-y-6">
          {activeTab === "summary" ? (
            /* TAB 1: EXECUTIVE AGREEMENT SUMMARY */
            <div className="space-y-6">
              {/* Top Banner */}
              <div className="rounded-xl bg-[#0B1220] border border-[#1B2A3F] p-5 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#00e5c8]">
                    Agreed Milestone Budget
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white">$500.00 USD</span>
                    <span className="text-xs text-text-muted">Five Hundred US Dollars</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="bg-[#121E30] border border-[#253347] rounded-lg px-3 py-2 text-center">
                    <span className="text-[9px] text-text-muted block uppercase font-bold">Deposit (50%)</span>
                    <span className="font-black text-white text-sm">$250.00</span>
                  </div>
                  <div className="bg-[#121E30] border border-[#253347] rounded-lg px-3 py-2 text-center">
                    <span className="text-[9px] text-text-muted block uppercase font-bold">Upon Delivery (50%)</span>
                    <span className="font-black text-white text-sm">$250.00</span>
                  </div>
                </div>
              </div>

              {/* 2-Column Parties & Terms Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Client Box */}
                <div className="rounded-xl bg-[#0E1726] border border-[#1F2E44] p-4 space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-text-muted">
                    Client Details
                  </span>
                  <h4 className="text-sm font-bold text-white">{clientCompany}</h4>
                  <div className="text-xs text-text-muted space-y-1 pt-1 border-t border-[#1F2E44]">
                    <div>Email: <strong className="text-white font-medium">{clientEmail}</strong></div>
                    <div>Primary Channel: <strong className="text-[#00e5c8]">WhatsApp</strong></div>
                    <div>Acceptance Review Window: <strong className="text-white">5 Business Days</strong></div>
                  </div>
                </div>

                {/* Developer Box */}
                <div className="rounded-xl bg-[#0E1726] border border-[#1F2E44] p-4 space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-text-muted">
                    Developer Details
                  </span>
                  <h4 className="text-sm font-bold text-white">Miltomy</h4>
                  <div className="text-xs text-text-muted space-y-1 pt-1 border-t border-[#1F2E44]">
                    <div>Email: <strong className="text-white font-medium">miltomy@gmail.com</strong></div>
                    <div>Role: <strong className="text-white">Freelance Front-End Developer</strong></div>
                    <div>Revisions Included: <strong className="text-[#00e5c8]">Up to 2 Reasonable Rounds</strong></div>
                  </div>
                </div>
              </div>

              {/* Key Protective Clauses Highlights */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Core Contractual Provisions
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="rounded-lg bg-[#0B1220] border border-[#1B2A3F] p-3.5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[#00e5c8] font-bold text-[11px]">
                      <Shield size={14} />
                      <span>Backend Protection</span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      Evaluated on UI/UX fidelity and component states. Incomplete backend APIs cannot delay front-end acceptance or final pay.
                    </p>
                  </div>

                  <div className="rounded-lg bg-[#0B1220] border border-[#1B2A3F] p-3.5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[#00e5c8] font-bold text-[11px]">
                      <DollarSign size={14} />
                      <span>Flexible Payment</span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      Client may disburse via Crypto (USDT/USDC), Nigerian Bank (USD/NGN), or European Dutch Bank (IBAN/SEPA).
                    </p>
                  </div>

                  <div className="rounded-lg bg-[#0B1220] border border-[#1B2A3F] p-3.5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[#00e5c8] font-bold text-[11px]">
                      <CheckCircle2 size={14} />
                      <span>IP Transfer</span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      Ownership of custom front-end deliverables and repository transfers fully to the Client upon receipt of final $250.
                    </p>
                  </div>
                </div>
              </div>

              {/* Switch to Full Text Prompt */}
              <div className="pt-2 flex items-center justify-between border-t border-[#1B2A3F]">
                <span className="text-xs text-text-muted">
                  Need to review every clause or verify legal signatures?
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab("full")}
                  className="text-xs font-bold text-[#00e5c8] hover:underline flex items-center gap-1"
                >
                  Read Full Agreement Text &rarr;
                </button>
              </div>
            </div>
          ) : (
            /* TAB 2: COMPLETE LEGAL CONTRACT TEXT */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#1B2A3F]">
                <span className="text-xs text-text-muted font-bold">
                  Official Legal Agreement Document
                </span>
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#0B1220] border border-[#1B2A3F] text-text-muted hover:text-white transition"
                >
                  {copied ? <Check size={12} className="text-status-success" /> : <Copy size={12} />}
                  <span>{copied ? "Copied to Clipboard" : "Copy Text"}</span>
                </button>
              </div>

              <div 
                id="contract-full-text" 
                className="bg-[#080F1F] border border-[#1B2A3F] rounded-xl p-6 font-mono text-[11px] text-slate-300 leading-relaxed space-y-4 select-text"
              >
                <div className="font-bold text-white text-sm text-center border-b border-[#1B2A3F] pb-3">
                  FREELANCE FRONT-END DEVELOPMENT AGREEMENT
                </div>

                <p>
                  <strong>PARTIES</strong><br />
                  <strong>Client:</strong> {clientCompany}<br />
                  <strong>Email:</strong> {clientEmail}<br />
                  <strong>Developer:</strong> Miltomy<br />
                  <strong>Email:</strong> miltomy@gmail.com
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
                  • Creating responsive layouts and components<br />
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
                  <strong>Payment Channels:</strong> The Client may disburse payment via Cryptocurrency (USDT/USDC), Nigerian Commercial Bank Transfer (USD domiciliary or NGN equivalent), or European/Dutch Bank Account (IBAN/SEPA). The Client shall cover any transaction/wire fees so the net amount received is USD $500. Ownership of deliverables transfers only after full payment has been received.
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
                  <strong>7. ACCEPTANCE OF WORK</strong><br />
                  Upon delivery of completed front-end deliverables, the Client shall have five (5) business days to review and provide feedback. If no response is received within five (5) business days, the deliverables shall be deemed accepted.
                </p>

                <p>
                  <strong>8. INTELLECTUAL PROPERTY & PORTFOLIO RIGHTS</strong><br />
                  Upon full payment of all agreed fees, ownership of custom front-end deliverables transfers to the Client. The Developer retains ownership of generic reusable components and developer know-how, and reserves the right to display non-confidential UI screenshots and project case studies for portfolio purposes.
                </p>

                <p>
                  <strong>9. LIMITATION OF LIABILITY & GOVERNING LAW</strong><br />
                  Neither Party shall be liable for indirect or consequential damages. Except for confidentiality breaches, the Developer's total liability shall not exceed the total amount paid under this Agreement ($500 USD). This Agreement shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria.
                </p>

                <div className="border-t border-[#1B2A3F] pt-4 mt-6">
                  <strong>STATUS:</strong> AGREED & ENTERED INTO BY CLIENT AND DEVELOPER
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#253347] bg-[#0E1726] flex-shrink-0">
          <span className="text-xs text-text-muted">
            Stored electronically in Miltomy Project Tracking Cloud.
          </span>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-xl bg-[#1A2B42] hover:bg-[#253347] text-xs font-bold uppercase tracking-wider text-white transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="h-9 px-4 rounded-xl bg-[#00e5c8] hover:bg-[#00b8a2] text-xs font-bold uppercase tracking-wider text-navy transition flex items-center gap-1.5 shadow-lg shadow-[#00e5c8]/10"
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

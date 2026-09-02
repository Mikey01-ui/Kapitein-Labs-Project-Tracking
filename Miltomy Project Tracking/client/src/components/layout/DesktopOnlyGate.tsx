import { useState, useEffect } from "react";
import { Monitor, Laptop, ArrowUpRight } from "lucide-react";

export function DesktopOnlyGate({ children }: { children: React.ReactNode }) {
  const [isMobileOrSmallScreen, setIsMobileOrSmallScreen] = useState(false);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setScreenWidth(width);

      // Check viewport width (less than 1024px is tablet/mobile)
      // or mobile user agent
      const isTouchOrMobileDevice = 
        width < 1024 || 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      setIsMobileOrSmallScreen(width < 1024);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  if (isMobileOrSmallScreen) {
    return (
      <div className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-[#080808] p-6 text-center text-[#f0ede6] select-none animate-fade-in overflow-hidden">
        {/* Subtle Background Grid */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#222222_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
        
        {/* Glow backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-[#c8ff00]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Content Box */}
        <div className="relative z-10 w-full max-w-md rounded bg-[#111111] border border-[#222222] p-8 sm:p-10 shadow-2xl shadow-black/80 flex flex-col items-center">
          
          {/* Logo Badge */}
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xl font-black tracking-tight text-white font-display">
              Miltomy<span className="text-[#c8ff00]">.</span>
            </span>
          </div>

          {/* Monitor / Laptop Icon */}
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded bg-[#161616] border border-[#262626] text-[#c8ff00] flex items-center justify-center shadow-xl shadow-[#c8ff00]/10">
              <Monitor size={36} className="text-[#c8ff00]" />
            </div>
            <div className="absolute -bottom-2 -right-2 p-1.5 rounded bg-[#080808] border border-[#262626] text-[#888888]">
              <Laptop size={16} />
            </div>
          </div>

          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#c8ff00] mb-2">
            Desktop Experience Only
          </p>

          <h1 className="text-2xl font-bold tracking-tight text-white mb-3 font-display">
            Please Switch to a Laptop or Desktop Screen
          </h1>

          <p className="text-xs text-[#888888] leading-relaxed mb-6">
            The Miltomy Agency Portal and Kanban workspace are optimized exclusively for larger monitors, laptops, and widescreen workstations.
          </p>

          <div className="w-full py-3 px-4 rounded bg-[#161616] border border-[#262626] flex items-center justify-between text-[11px]">
            <span className="text-[#888888] font-medium">Required Screen:</span>
            <span className="font-bold text-white font-mono">1024px+ Wide</span>
          </div>

          <p className="mt-6 text-[10px] text-[#666666] uppercase tracking-widest font-semibold">
            Current Width: <span className="text-[#c8ff00] font-mono">{screenWidth}px</span>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

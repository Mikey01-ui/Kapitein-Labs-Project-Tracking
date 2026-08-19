import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";

export function PageTransition({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Set initial animated state
    gsap.set(containerRef.current, { opacity: 0 });

    // Animate to full visibility
    gsap.to(containerRef.current, {
      opacity: 1,
      duration: 0.25,
      ease: "power2.out",
    });
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col flex-grow">
      {children}
    </div>
  );
}

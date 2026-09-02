import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary";
}

export function Button({ children, variant = "primary", className = "", ...props }: ButtonProps) {
  const styles =
    variant === "primary"
      ? "bg-[#c8ff00] text-[#080808] hover:bg-[#b2e600] hover:shadow-lg hover:shadow-[#c8ff00]/20 focus:ring-2 focus:ring-[#c8ff00]/40"
      : "border border-[#262626] bg-[#161616] text-white hover:bg-[#202020] focus:ring-2 focus:ring-[#c8ff00]/40";

  return (
    <button
      className={`rounded px-5 py-2.5 text-sm font-semibold transition-all duration-300 active:scale-[0.98] outline-none ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

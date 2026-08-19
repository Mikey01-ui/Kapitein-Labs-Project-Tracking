import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary";
}

export function Button({ children, variant = "primary", className = "", ...props }: ButtonProps) {
  const styles =
    variant === "primary"
      ? "bg-teal text-navy hover:bg-teal-deep hover:shadow-lg hover:shadow-teal/20 focus:ring-2 focus:ring-teal/40"
      : "border border-border bg-[#121E30] text-text-primary hover:bg-[#1A2B42] focus:ring-2 focus:ring-border";

  return (
    <button
      className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-300 active:scale-[0.98] outline-none ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

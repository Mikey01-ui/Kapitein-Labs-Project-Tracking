/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        miltomy: {
          bg: "#080808",
          surface: "#111111",
          card: "#141414",
          elevated: "#1a1a1a",
          accent: "#c8ff00",
          "accent-hover": "#b2e600",
          text: "#f0ede6",
          muted: "#888888",
          border: "#222222",
        },
        navy: {
          DEFAULT: "var(--color-bg-page)",
          surface: "var(--color-bg-surface)",
          elevated: "var(--color-bg-elevated)"
        },
        teal: {
          DEFAULT: "var(--color-accent)",
          deep: "var(--color-accent-deep)"
        },
        border: "var(--color-border)",
        text: {
          primary: "var(--color-text-primary)",
          muted: "var(--color-text-muted)"
        },
        status: {
          success: "var(--color-success)",
          warning: "var(--color-warning)",
          danger: "var(--color-danger)",
          neutral: "var(--color-neutral)"
        }
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        sans: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    }
  },
  plugins: []
};

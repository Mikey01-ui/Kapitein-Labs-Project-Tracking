/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "var(--color-bg-page)",
          surface: "var(--color-bg-surface)",
          elevated: "var(--color-bg-elevated)"
        },
        teal: {
          DEFAULT: "var(--color-teal)",
          deep: "var(--color-teal-deep)"
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
      }
    }
  },
  plugins: []
};


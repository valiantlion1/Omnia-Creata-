import type { Config } from "tailwindcss";

const preset = {
  theme: {
    extend: {
      backgroundImage: {
        "grid-fade":
          "linear-gradient(to right, rgb(var(--color-border) / 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgb(var(--color-border) / 0.08) 1px, transparent 1px)",
        "hero-aura":
          "radial-gradient(circle at top, rgb(var(--color-accent) / 0.25), transparent 45%), radial-gradient(circle at 70% 20%, rgb(var(--color-info) / 0.18), transparent 38%)"
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)"
      },
      boxShadow: {
        ambient: "0 24px 80px rgb(var(--color-shadow) / 0.32)",
        glow: "0 0 0 1px rgb(var(--color-accent) / 0.16), 0 16px 50px rgb(var(--color-accent) / 0.14)"
      },
      colors: {
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        canvas: "rgb(var(--color-canvas) / <alpha-value>)",
        danger: "rgb(var(--color-danger) / <alpha-value>)",
        info: "rgb(var(--color-info) / <alpha-value>)",
        line: "rgb(var(--color-border) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        panel: "rgb(var(--color-panel) / <alpha-value>)",
        success: "rgb(var(--color-success) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        text: "rgb(var(--color-text) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)"
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-sans)", "sans-serif"]
      },
      keyframes: {
        "float-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        }
      },
      animation: {
        "float-up": "float-up 600ms ease-out both",
        shimmer: "shimmer 2.4s linear infinite"
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem"
      }
    }
  }
} satisfies Partial<Config>;

export default preset;

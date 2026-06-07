import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Mapped to CSS variables (RGB channels) so legacy classes like
        // text-ink/50 and border-ink/15 keep working AND adapt to dark mode.
        cream: {
          DEFAULT: "rgb(var(--bg-rgb) / <alpha-value>)",
          deep: "rgb(var(--bg-deep-rgb) / <alpha-value>)",
        },
        paper: "rgb(var(--paper-rgb) / <alpha-value>)",
        ink: {
          DEFAULT: "rgb(var(--text-rgb) / <alpha-value>)",
          soft: "rgb(var(--text-soft-rgb) / <alpha-value>)",
        },
        jollof: {
          DEFAULT: "#D44621",
          deep: "#A8330F",
        },
        gold: "#B5894A",
        moss: "#2D4A2B",
      },
      fontFamily: {
        display: ["var(--font-display)", "Times New Roman", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        lg: "12px",
        xl: "20px",
        "2xl": "28px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#EC4899",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#8B5CF6",
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#F59E0B",
          foreground: "#1F2937",
        },
        background: "#FDF2F8",
        foreground: "#0F172A",
        muted: {
          DEFAULT: "#FDF4F8",
          foreground: "#6B7280",
        },
        border: "#FCE9F2",
        destructive: {
          DEFAULT: "#DC2626",
          foreground: "#FFFFFF",
        },
        ring: "#EC4899",
      },
      fontFamily: {
        display: ["var(--font-nunito)", "system-ui", "sans-serif"],
        body: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        clay: "2rem",
        "clay-sm": "1.25rem",
        "clay-lg": "2.5rem",
      },
      boxShadow: {
        clay: "8px 8px 18px rgba(190, 24, 93, 0.12), -6px -6px 14px rgba(255, 255, 255, 0.85)",
        "clay-sm": "4px 4px 10px rgba(190, 24, 93, 0.10), -4px -4px 8px rgba(255, 255, 255, 0.85)",
        "clay-inset":
          "inset 4px 4px 8px rgba(190, 24, 93, 0.15), inset -4px -4px 8px rgba(255, 255, 255, 0.6)",
        "clay-pressed":
          "inset 3px 3px 6px rgba(190, 24, 93, 0.18), inset -3px -3px 6px rgba(255, 255, 255, 0.5)",
      },
    },
  },
  plugins: [],
};

export default config;

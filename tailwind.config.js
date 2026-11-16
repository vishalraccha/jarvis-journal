/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1440px",
      },
    },
    extend: {
      colors: {
        border: "#263448",
        input: "#1C2738",
        ring: "#287BFF",
        background: "#090D14",
        secondary: {
          DEFAULT: "#101722",
          foreground: "#EAF0F8",
        },
        card: {
          DEFAULT: "#151E2B",
          foreground: "#EAF0F8",
          hover: "#1A2536",
        },
        primary: {
          DEFAULT: "var(--accent-color, #3B82F6)",
          foreground: "#FFFFFF",
          bright: "var(--accent-hover, #60A5FA)",
        },
        accent: {
          DEFAULT: "var(--accent-color, #3B82F6)",
          hover: "var(--accent-hover, #60A5FA)",
          muted: "var(--accent-muted, rgba(59, 130, 246, 0.15))",
          border: "var(--accent-border, rgba(59, 130, 246, 0.4))",
        },
        profit: {
          DEFAULT: "#18C784",
          dim: "rgba(24, 199, 132, 0.12)",
          border: "rgba(24, 199, 132, 0.3)",
          text: "#18C784",
        },
        loss: {
          DEFAULT: "#F05265",
          dim: "rgba(240, 82, 101, 0.12)",
          border: "rgba(240, 82, 101, 0.3)",
          text: "#F05265",
        },
        neutral: {
          muted: "#8493A8",
          subtle: "#1C2738",
        },
        terminal: {
          bg: "var(--bg-main, #0A0E17)",
          surface: "var(--bg-surface, #10141E)",
          card: "var(--bg-card, #141A26)",
          border: "var(--border-color, #202838)",
          borderLight: "#2B384E",
          text: "var(--text-primary, #E2E8F0)",
          muted: "var(--text-muted, #8493A8)",
          accent: "var(--accent-color, #3B82F6)",
          accentHover: "var(--accent-hover, #60A5FA)",
        }
      },
      fontFamily: {
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
    },
  },
  plugins: [],
}

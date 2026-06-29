import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Ported verbatim from EchoLocal Pro's dark theme palette
        background: {
          DEFAULT: "#0d1117",
          secondary: "#161b22",
          tertiary: "#1c2128",
        },
        border: {
          DEFAULT: "#21262d",
          subtle: "#30363d",
          strong: "#484f58",
        },
        text: {
          primary: "#e6edf3",
          secondary: "#8b949e",
          muted: "#484f58",
        },
        accent: {
          green: "#3fb950",
          "green-muted": "#238636",
          blue: "#58a6ff",
          "blue-muted": "#1f6feb",
          red: "#f85149",
          "red-muted": "#da3633",
          orange: "#d29922",
          purple: "#a371f7",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      boxShadow: {
        panel: "0 0 0 1px #21262d",
        "panel-elevated": "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px #21262d",
        glow: "0 0 20px rgba(63,185,80,0.3)",
        "glow-red": "0 0 20px rgba(248,81,73,0.3)",
      },
    },
  },
  plugins: [],
};

export default config;

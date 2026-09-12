import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        panel: "var(--panel)",
        "panel-2": "var(--panel-2)",
        edge: "var(--border)",
        ember: "var(--ember)",
        aether: "var(--aether)",
        gold: "var(--gold)",
        vitality: "var(--vitality)",
        "ink-text": "var(--ink-text)",
        "muted-text": "var(--muted-text)",
      },
      fontFamily: {
        pixel: ["var(--font-pixel)", "monospace"],
        body: ["var(--font-body)", "ui-sans-serif", "sans-serif"],
      },
      keyframes: {
        "float-up": {
          "0%": { transform: "translateY(0)", opacity: "1" },
          "100%": { transform: "translateY(-40px)", opacity: "0" },
        },
        "pop-in": {
          "0%": { transform: "scale(0.85)", opacity: "0" },
          "60%": { transform: "scale(1.04)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "float-up": "float-up 900ms ease-out forwards",
        "pop-in": "pop-in 350ms ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;

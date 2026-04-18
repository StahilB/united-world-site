import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core ink (brand cobalt — взято со среднего тона глобуса в логотипе)
        ink: "#0D2A5C",
        "ink-soft": "#1E3F7A",
        "ink-deep": "#061739",
        // Paper / surfaces
        paper: "#FFFFFF",
        "paper-warm": "#F5F6F9",
        "paper-mute": "#EEF1F6",
        // Text
        text: "#0F1729",
        "text-mute": "#4E5A73",
        // Rules
        rule: "#DCE0E8",
        "rule-cool": "#E5E7EB",
        // Gold (honeyed, точные тона с рамки логотипа)
        gold: "#C99A3A",
        "gold-deep": "#8C6420",
        "gold-light": "#E8C774",
        // Alert
        alert: "#B7361C",

        // Legacy aliases — указывают на новые значения
        primary: "#0D2A5C",
        secondary: "#1E3F7A",
        accent: "#C99A3A",
        accentLight: "#E8C774",
        surface: "#F5F6F9",
        muted: "#4E5A73",
      },
      fontFamily: {
        sans: ["var(--font-source-sans-3)", "system-ui", "sans-serif"],
        heading: ["var(--font-heading)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;

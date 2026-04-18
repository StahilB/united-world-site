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
        // Core ink (brand dark blue)
        ink: "#0B1E3A",
        "ink-soft": "#1F3357",
        // Paper / surfaces
        paper: "#FFFFFF",
        "paper-warm": "#FAF7F2",
        // Text
        text: "#111418",
        "text-mute": "#5E6472",
        // Rules
        rule: "#D7D2C8",
        "rule-cool": "#E5E7EB",
        // Gold (three shades by background)
        gold: "#B8862B",
        "gold-deep": "#8B6418",
        "gold-light": "#E8CC83",
        // Alert
        alert: "#B7361C",

        // Legacy aliases — НЕ УДАЛЯЕМ, чтобы не сломать Header/MegaMenu/
        // MobileMenu/рубричные страницы в один присест. Они указывают на
        // новые токены. В следующей итерации зачистим.
        primary: "#0B1E3A",
        secondary: "#1F3357",
        accent: "#B8862B",
        accentLight: "#E8CC83",
        surface: "#FAF7F2",
        muted: "#5E6472",
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

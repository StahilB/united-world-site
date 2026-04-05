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
        primary: "#162A50",
        secondary: "#1E4D8C",
        accent: "#C6A862",
        surface: "#F7FAFD",
        sky: "#6BAFE0",
        text: "#1C2B3D",
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

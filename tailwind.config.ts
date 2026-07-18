import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1F1E1C",
        muted: "#6F6B66",
        line: "#E5E1DC",
        paper: "#F7F6F3",
        brand: {
          DEFAULT: "#C9342B",
          dark: "#A82720",
          soft: "#F8E9E7"
        },
        success: "#4F7B45",
        warning: "#A8651B"
      },
      boxShadow: {
        panel: "0 14px 36px rgba(49, 42, 36, 0.08)",
        card: "0 8px 24px rgba(49, 42, 36, 0.07)"
      }
    }
  },
  plugins: []
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F7F6F3",
        ink: "#1B2430",
        steel: {
          50: "#EEF3F8",
          100: "#DCE6F0",
          300: "#93A9C2",
          500: "#3D5A80",
          600: "#324B6B",
          700: "#293D57",
        },
        status: {
          applied: "#6B7280",
          oa: "#B45309",
          interview: "#3D5A80",
          offer: "#15803D",
          rejected: "#B91C1C",
        },
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        card: "6px",
      },
    },
  },
  plugins: [],
};
export default config;

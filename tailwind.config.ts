import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        trust: {
          navy: "#020617",
          blue: "#2563EB",
          cyan: "#22D3EE",
          surface: "#F8FAFC",
          border: "#1E293B",
        },
        navy: {
          900: "#050914",
          800: "#0A0F1E",
          700: "#0F1629",
          600: "#141D35",
          500: "#1E2A47",
          400: "#2A3A5C",
        },
        accent: "#2563EB",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        display: [
          "Inter Tight",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;

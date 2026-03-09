import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        serif: ["var(--font-merriweather)", "serif"],
      },
      colors: {
        navy: {
          950: "#0B1120", // Deepest navy
          900: "#0F172A",
          800: "#1E293B",
          700: "#334155",
        },
        gold: {
          50: "#FBF7EB",
          100: "#F5EBCF",
          200: "#ECDDA3",
          300: "#E3CE7A",
          400: "#D9BE52",
          500: "#C5A572", // Muted Professional Gold/Bronze
          600: "#B08D55",
          700: "#967243",
        },
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        md: "0.375rem",
        lg: "0.5rem",
        xl: "0.75rem", // Slightly tighter than default
      },
    },
  },
  plugins: [],
};
export default config;

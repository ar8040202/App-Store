import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#F7F5EF",
        ink: "#171A17",
        brand: {
          DEFAULT: "#123B2F",
          light: "#1D5B48",
          soft: "#E6EFEA",
        },
        gold: {
          DEFAULT: "#C9A24B",
          soft: "#F3E7CC",
        },
      },
      fontFamily: {
        sans: ["Cairo", "Inter", "system-ui", "sans-serif"],
        display: ["Amiri", "Cairo", "serif"],
      },
      borderRadius: {
        xl: "18px",
        "2xl": "26px",
      },
      boxShadow: {
        soft: "0 24px 60px -38px rgba(18, 59, 47, 0.55)",
      },
    },
  },
  plugins: [],
};

export default config;

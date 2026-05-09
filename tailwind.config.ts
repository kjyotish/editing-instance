import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#5C4BFF",
        background: "#F5F5F7",
        surface: "rgba(255, 255, 255, 0.72)",
        text: "#1D1D1F",
        muted: "#86868B",
        accent: "#7C3AED",
      },
      borderRadius: {
        sm: "8px",
        md: "8px",
        pill: "32px",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0, 0, 0, 0.04)",
        lift: "0 12px 48px rgba(0, 0, 0, 0.08)",
      },
      fontFamily: {
        heading: ["Inter", "ui-sans-serif", "system-ui"],
        body: ["Inter", "ui-sans-serif", "system-ui"],
      },
      spacing: {
        lg: "64px",
        xl: "120px",
      },
      backdropBlur: {
        heavy: "24px",
      },
    },
  },
  plugins: [],
} satisfies Config;

import type { Config } from "tailwindcss";

export default {
  content: ["./sidepanel.html", "./popup.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 12px 40px rgba(15, 23, 42, 0.12)"
      }
    }
  },
  plugins: []
} satisfies Config;

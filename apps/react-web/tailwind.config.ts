import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefcf9",
          100: "#d7f4ef",
          600: "#0f766e",
          700: "#0b5f59",
          800: "#0a4b47"
        },
        info: {
          100: "#dbeafe",
          600: "#2563eb"
        },
        ink: {
          200: "#d6dcda",
          300: "#aab5b1",
          400: "#7b8984",
          500: "#596760",
          600: "#46544e",
          700: "#34413b",
          800: "#25312c",
          900: "#1e2925",
          950: "#17211f"
        },
        surface: {
          0: "#f2f4f1",
          1: "#ffffff"
        },
        line: "#d5ddd8",
        risk: {
          100: "#fee2e2",
          600: "#dc2626"
        },
        warn: {
          100: "#fef3c7",
          600: "#b7791f"
        },
        success: {
          100: "#dcfce7",
          600: "#16a34a"
        }
      },
      boxShadow: {
        panel: "0 22px 54px rgba(23, 33, 31, 0.10)",
        soft: "0 8px 24px rgba(23, 33, 31, 0.055)"
      },
      borderRadius: {
        card: "10px",
        control: "8px",
        workbench: "14px"
      },
      maxWidth: {
        shell: "1600px"
      }
    }
  },
  plugins: []
} satisfies Config;

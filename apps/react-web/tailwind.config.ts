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
          400: "#94a3b8",
          500: "#64748b",
          700: "#334155",
          900: "#0f172a"
        },
        surface: {
          0: "#f8fafc",
          1: "#ffffff"
        },
        line: "#dbe3ea",
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
        panel: "0 18px 44px rgba(15, 23, 42, 0.08)",
        soft: "0 8px 22px rgba(15, 23, 42, 0.05)"
      },
      borderRadius: {
        card: "8px",
        control: "8px"
      },
      maxWidth: {
        shell: "1680px"
      }
    }
  },
  plugins: []
} satisfies Config;

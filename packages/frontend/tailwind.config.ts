import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        success: "hsl(var(--success))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "1.25rem",
        "2xl": "1.5rem",
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-live": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "heart-burst": {
          "0%": { transform: "scale(0)", opacity: "1" },
          "30%": { transform: "scale(1.2)" },
          "50%": { transform: "scale(0.95)" },
          "70%": { transform: "scale(1.05)" },
          "85%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "0" },
        },
        "float-up": {
          "0%": { transform: "translateY(0)", opacity: "1" },
          "100%": { transform: "translateY(-20px)", opacity: "0" },
        },
        "gradient-shift": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        "bounce-arrow": {
          "0%, 100%": { transform: "translateY(0)", opacity: "0.6" },
          "50%": { transform: "translateY(-8px)", opacity: "1" },
        },
      },
      animation: {
        shimmer: "shimmer 1.5s infinite",
        "pulse-live": "pulse-live 2s cubic-bezier(0.4,0,0.6,1) infinite",
        "heart-burst": "heart-burst 0.8s ease-out forwards",
        "float-up": "float-up 0.4s ease-out forwards",
        "gradient-shift": "gradient-shift 8s ease infinite",
        "bounce-arrow": "bounce-arrow 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;

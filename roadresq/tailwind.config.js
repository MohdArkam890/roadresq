/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#14161B",
          soft: "#1E2129",
          line: "#2A2E38",
        },
        paper: "#F5F3EC",
        amber: {
          DEFAULT: "#F5A623",
          soft: "#FFD23F",
        },
        flare: "#FF5A36",
        signal: "#33C481",
      },
      fontFamily: {
        display: ["Teko", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "diagonal-hazard":
          "repeating-linear-gradient(135deg, #F5A623 0, #F5A623 14px, #14161B 14px, #14161B 28px)",
      },
      keyframes: {
        dash: { to: { strokeDashoffset: "0" } },
        blink: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.25 },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        dash: "dash 3.5s linear infinite",
        blink: "blink 1.4s ease-in-out infinite",
        marquee: "marquee 22s linear infinite",
      },
    },
  },
  plugins: [],
};

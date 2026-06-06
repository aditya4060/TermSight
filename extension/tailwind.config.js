/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        card: "#111111",
        body: "#1a1a1a",
        border: "#333333",
        "row-border": "#2a2a2a",
        "grade-red": "#e8614a",
        "grade-orange": "#f59e0b",
        "grade-yellow": "#eab308",
        "grade-green": "#22c55e",
        "grade-lime": "#84cc16",
        "status-critical": "#ef4444",
        "status-warning": "#f59e0b",
        "status-good": "#22c55e",
        "status-limited": "#6b7280",
        "status-disabled": "#374151",
      },
      fontFamily: {
        sans: ['"Arial Black"', "Arial", "sans-serif"],
      },
      width: {
        popup: "380px",
      },
    },
  },
  plugins: [],
};

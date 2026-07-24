/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#22c55e",
          hover:   "#16a34a",
          light:   "#f0fdf4",
        },
        surface: {
          page:   "#f5f5f5",
          card:   "#ffffff",
          raised: "#f9f9f9",
        },
        ink: {
          primary:   "#000000",
          secondary: "#555555",
          muted:     "#888888",
        },
        stroke: {
          DEFAULT: "#000000",
          subtle:  "#e5e5e5",
        },
      },
      boxShadow: {
        "brutal":     "4px 4px 0px #000000",
        "brutal-sm":  "3px 3px 0px #000000",
        "brutal-brand": "4px 4px 0px #22c55e",
      },
    },
  },
  plugins: [],
};

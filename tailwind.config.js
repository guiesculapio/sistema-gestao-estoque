/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Cores profissionais para seu SaaS
        primary: "#0f172a", // Slate 900
        secondary: "#10b981", // Emerald 500
      },
    },
  },
  plugins: [],
};

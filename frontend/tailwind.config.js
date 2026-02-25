/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        "crm-primary": "#1152d4",
        "crm-dark": "#001F3F",
        "crm-green": "#50C878",
        "crm-bg-light": "#f6f6f8",
        "crm-bg-dark": "#101622",
      },
      fontFamily: {
        "manrope": ["Manrope", "sans-serif"],
        "inter": ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
}

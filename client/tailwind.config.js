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
        primary: {
          DEFAULT: '#3E2C1C',
          hover: '#55402C',
        },
        accent: {
          DEFAULT: '#A67C3D',
          hover: '#8C6527',
        },
        success: '#6B8F5F',
        warning: '#C98A2D',
        danger: '#B4552D',
        bg: '#FAF6EE',
        'bg-card': '#FFFDF8',
        text: '#2E2417',
        'text-muted': '#8A7B66',
        border: '#E7DCC7',
      },
      fontFamily: {
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
        display: ['Montserrat', 'system-ui', 'sans-serif'],
        cursive: ['"Great Vibes"', 'cursive'],
      },
      borderRadius: {
        'btn': '4px',
        'card': '10px',
        'modal': '14px',
        'hero': '18px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(62,44,28,0.08), 0 1px 2px rgba(62,44,28,0.06)',
      },
    },
  },
  plugins: [],
};
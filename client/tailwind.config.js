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
          DEFAULT: '#102A43',
          hover: '#173F67',
        },
        accent: {
          DEFAULT: '#3B6F9F',
          hover: '#2F5C86',
        },
        success: '#2F7D68',
        warning: '#A86F16',
        danger: '#B5475A',
        bg: '#F4F7FB',
        'bg-card': '#FFFFFF',
        text: '#172B3A',
        'text-muted': '#60758A',
        border: '#D7E2EC',
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
        'card': '0 8px 24px rgba(16,42,67,0.07), 0 1px 3px rgba(16,42,67,0.06)',
      },
    },
  },
  plugins: [],
};

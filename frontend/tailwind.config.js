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
        slate: {
          950: '#020617',
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155'
        },
        brand: {
          primary: '#6366f1',   // Indigo
          accent: '#8b5cf6',    // Violet
          success: '#10b981',   // Emerald
          danger: '#ef4444',    // Red
          warning: '#f59e0b'    // Amber
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'glass-sm': '0 4px 16px 0 rgba(31, 38, 135, 0.25)'
      }
    },
  },
  plugins: [],
}

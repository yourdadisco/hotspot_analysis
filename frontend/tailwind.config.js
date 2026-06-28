/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        surface: {
          DEFAULT: '#F8FAFC',
          card: '#FFFFFF',
          elevated: '#F1F5F9',
        },
        importance: {
          emergency: '#EF4444',
          high: '#F97316',
          medium: '#6366F1',
          low: '#22C55E',
          watch: '#8B5CF6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'tech': '0 1px 3px rgba(99,102,241,0.08), 0 1px 2px rgba(99,102,241,0.06)',
        'tech-md': '0 4px 12px rgba(99,102,241,0.1), 0 2px 4px rgba(99,102,241,0.06)',
        'tech-lg': '0 8px 24px rgba(99,102,241,0.12), 0 4px 8px rgba(99,102,241,0.06)',
      },
    },
  },
  plugins: [],
}

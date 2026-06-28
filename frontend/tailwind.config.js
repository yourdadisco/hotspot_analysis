/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ground: '#08090A',
        surface: { DEFAULT: '#16171C', raised: '#1E1F25', overlay: '#26272E' },
        hairline: 'rgba(255,255,255,0.06)',
        accent: { DEFAULT: '#5E6AD2', hover: '#4F59B0', muted: 'rgba(94,106,210,0.15)' },
        text: { primary: '#F7F8F8', secondary: '#9CA3AF', muted: '#6B7280' },
        importance: {
          emergency: '#EF4444', high: '#F97316', medium: '#5E6AD2', low: '#22C55E', unanalyzed: '#6B7280',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Inter Tight"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 2px rgba(0,0,0,0.3)',
        'elevated': '0 4px 12px rgba(0,0,0,0.4)',
        'modal': '0 8px 32px rgba(0,0,0,0.5)',
      },
      borderRadius: {
        'ui': '6px',
        'card': '12px',
        'panel': '16px',
      },
      transitionTimingFunction: {
        'quint': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
}

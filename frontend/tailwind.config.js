/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ground: '#0F0F11',
        surface: '#16161A',
        'surface-raised': '#1E1E24',
        'surface-overlay': '#282830',
        'ray-red': '#FF6363',
        'ray-orange': '#FF9F4A',
        'ray-lime': '#4ADE80',
        'ray-cyan': '#22D3EE',
        'ray-lavender': '#A78BFA',
        'ray-pink': '#F472B6',
        'text-primary': '#FFFFFF',
        'text-secondary': '#B0B3B8',
        'text-muted': '#6B7280',
        'ray-hairline': 'rgba(255,255,255,0.10)',
        importance: {
          emergency: '#FF6363',
          high: '#FF9F4A',
          medium: '#A78BFA',
          low: '#4ADE80',
          unanalyzed: '#6B7280',
        },
      },
      fontFamily: {
        display: ['"Inter Tight"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      boxShadow: {
        'cushion': '0 16px 40px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
}

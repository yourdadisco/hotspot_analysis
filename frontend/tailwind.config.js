/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 信息架构风格配色
        page: { bg: '#F4F1EA' },
        sidebar: {
          DEFAULT: '#1A2332',
          hover: '#232E45',
          active: '#2A3A5A',
          text: '#8B95B0',
          'text-active': '#E8ECF4',
        },
        amber: {
          DEFAULT: '#F5A623',
          50: '#FEF7E6',
          100: '#FDEFCC',
          200: '#FBE099',
          300: '#F9D066',
          400: '#F7C133',
          500: '#F5A623',
          600: '#C4851C',
          700: '#936415',
          800: '#62430E',
          900: '#312107',
        },
        steel: {
          DEFAULT: '#3E5C9A',
          50: '#EBEFF6',
          100: '#D7DFED',
          200: '#AFBFDB',
          300: '#879FC9',
          400: '#5F7FB7',
          500: '#3E5C9A',
          600: '#314A7B',
          700: '#25375C',
          800: '#19253E',
          900: '#0C121F',
        },
        ink: {
          DEFAULT: '#1B1B1A',
          muted: '#5E6680',
          border: '#D8D2C2',
        },
        pos: '#00B96B',
        neg: '#F23645',
        importance: {
          emergency: '#F23645',
          high: '#F5A623',
          medium: '#3E5C9A',
          low: '#00B96B',
          unanalyzed: '#8B95B0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'data': ['13px', { lineHeight: '1.4', fontFamily: 'JetBrains Mono, monospace' }],
        'data-lg': ['15px', { lineHeight: '1.3', fontFamily: 'JetBrains Mono, monospace' }],
      },
      spacing: {
        '5': '20px',
        '18': '72px',
        '30': '120px',
      },
      boxShadow: {
        'card': '0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 2px 8px rgba(0,0,0,0.06)',
        'popup': '0 4px 16px rgba(0,0,0,0.08)',
        'modal': '0 8px 32px rgba(0,0,0,0.12)',
        'sidebar': '2px 0 8px rgba(0,0,0,0.08)',
      },
      transitionTimingFunction: {
        'sharp': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      animation: {
        'flash-amber': 'flash-amber 1.2s ease-out',
      },
      keyframes: {
        'flash-amber': {
          '0%': { backgroundColor: 'rgba(245, 166, 35, 0.3)' },
          '100%': { backgroundColor: 'transparent' },
        },
      },
    },
  },
  plugins: [],
}

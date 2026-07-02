/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // deep navy sidebar
        sidebar: {
          DEFAULT: '#0F172A',
          hover: '#1E293B',
          active: '#334155',
        },
        // indigo accent
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366F1',
          600: '#4f46e5',
          700: '#4338ca',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04)',
        'card-hover': '0 8px 24px rgba(15,23,42,0.12)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        'fade-up': {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { opacity: 0, transform: 'translateY(-8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'scale-in': {
          '0%': { opacity: 0, transform: 'scale(0.96)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-up': 'fade-up 0.3s ease-out',
        'slide-down': 'slide-down 0.15s ease-out',
        'scale-in': 'scale-in 0.15s ease-out',
      },
    },
  },
  plugins: [],
}

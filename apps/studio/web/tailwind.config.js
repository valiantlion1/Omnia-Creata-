/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-sm': '0 0 20px -6px rgba(124, 58, 237, 0.25)',
        'glow': '0 0 40px -10px rgba(124, 58, 237, 0.35)',
        'glow-lg': '0 0 60px -12px rgba(124, 58, 237, 0.4)',
        'glow-white': '0 0 30px -8px rgba(255, 255, 255, 0.12)',
      },
      container: {
        center: true,
        padding: '1rem',
        screens: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px',
          '2xl': '1536px',
        },
      },
      borderRadius: {
        'xl': '14px',
        '2xl': '18px',
        '3xl': '22px',
        '4xl': '28px',
      },
      animation: {
        'fade-up': 'oc-fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'oc-scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-up': 'oc-slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'toast': 'oc-toastEntry 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'breathe': 'oc-breathe 4s ease-in-out infinite',
        'heart-pop': 'oc-heartPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'shimmer': 'oc-shimmer 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
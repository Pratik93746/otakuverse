import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['var(--font-bebas)', 'Impact', 'sans-serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          red: '#E63329',
          'red-light': '#FF4D44',
          'red-dark': '#B82820',
          purple: '#7B2FBE',
          'purple-light': '#9B4FDE',
          'purple-dark': '#5A1F8E',
          neon: '#00F5D4',
          dark: '#0A0A0F',
          charcoal: '#1A1A2E',
        },
        otaku: {
          50: '#FFF5F5',
          100: '#FFE3E3',
          200: '#FFC9C9',
          300: '#FFA8A8',
          400: '#FF8787',
          500: '#E63329',
          600: '#C92A21',
          700: '#A82119',
          800: '#8A1A13',
          900: '#6B130D',
        },
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #0A0A0F 0%, #1A1A2E 50%, #16213E 100%)',
        'card-gradient': 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.8) 100%)',
        'brand-gradient': 'linear-gradient(135deg, #E63329 0%, #7B2FBE 100%)',
        'neon-gradient': 'linear-gradient(135deg, #00F5D4 0%, #7B2FBE 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      boxShadow: {
        'card': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 20px 40px -12px rgba(0, 0, 0, 0.25)',
        'brand': '0 4px 14px 0 rgba(230, 51, 41, 0.39)',
        'glow-red': '0 0 20px rgba(230, 51, 41, 0.4)',
        'glow-purple': '0 0 20px rgba(123, 47, 190, 0.4)',
      },
      screens: {
        'xs': '360px',
        'sm': '430px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1440px',
        '3xl': '1600px',
      },
    },
  },
  plugins: [],
};

export default config;

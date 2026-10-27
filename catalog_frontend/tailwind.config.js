/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
      colors: {
        // Quiet Luxury palette
        stone: {
          50: '#F9F8F6',  // main background
          100: '#F5F4F0',
          200: '#EAE8E4',
          300: '#D5D2CC',
          400: '#B5B0A8',
          500: '#8E8884',
          600: '#6B6561',
          700: '#4A4541',
          800: '#2D2925',
          900: '#1C1A17',
        },
        zinc: {
          900: '#1C1C1E',  // main text
        },
        sage: {
          500: '#4C7A5D',  // available status
          50: '#EEF5F1',
        },
        rust: {
          500: '#A34343',  // out of stock status
          50: '#FEF2F2',
        },
        charcoal: '#0A0A0A',  // primary button
      },
      aspectRatio: {
        '4/5': '4 / 5',
      },
      animation: {
        'pulse-soft': 'pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fade-in 0.3s ease-in-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { transform: 'scale(0.6)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};

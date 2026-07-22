/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['"Sora"', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eef8f4',
          100: '#d6efe5',
          200: '#b0dfcc',
          300: '#7fc7ad',
          400: '#52a98c',
          500: '#368f72',
          600: '#28735c',
          700: '#215c4b',
          800: '#1c4a3d',
          900: '#183d34',
          950: '#0c221d',
        },
        ink: {
          50: '#f5f6f7',
          100: '#e4e7ea',
          200: '#ccd2d8',
          300: '#a8b2bc',
          400: '#7d8a97',
          500: '#626f7d',
          600: '#4f5966',
          700: '#414a54',
          800: '#383f48',
          900: '#1f242a',
          950: '#121518',
        },
      },
      boxShadow: {
        soft: '0 8px 30px rgba(18, 21, 24, 0.08)',
      },
      animation: {
        'fade-in': 'fadeIn 0.35s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

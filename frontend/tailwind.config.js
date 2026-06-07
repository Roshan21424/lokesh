/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#fff8f0',
          100: '#ffecd6',
          200: '#ffd4a3',
          400: '#ff9a3c',
          500: '#f97316',
          600: '#ea6107',
          700: '#c44d02',
          800: '#9c3d04',
          900: '#7c3007',
        },
        surface: {
          0: '#0f0f0f',
          1: '#1a1a1a',
          2: '#242424',
          3: '#2e2e2e',
          4: '#3a3a3a',
        }
      }
    }
  },
  plugins: []
}
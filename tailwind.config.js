/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#FF9800',
        background: '#FDF8F0',
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
}


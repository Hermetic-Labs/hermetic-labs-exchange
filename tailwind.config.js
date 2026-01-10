/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#020208',
          dark: '#000000',
          panel: 'rgba(0,0,0,0.85)',
          cyan: '#00b4ff',
          green: '#00ff99',
          pink: '#ff64c8',
          purple: '#6666ff',
        }
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neon-cyan': '0 0 10px rgba(0,180,255,0.5)',
        'neon-green': '0 0 10px rgba(0,255,153,0.5)',
        'neon-pink': '0 0 10px rgba(255,100,200,0.5)',
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Karanlık temanın çalışması için zorunlu
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'], 
      },
      colors: {
        discbase: {
          surface: '#f8f9ff',
          'surface-dim': '#ccdbf2',
          'surface-container': '#e5efff',
          'on-surface': '#0d1c2d',
          'inverse-surface': '#233143',
          'inverse-on-surface': '#e9f1ff',
          primary: '#9800cf',          // Neon Purple
          'primary-container': '#495521ff',
          'on-primary': '#ffffff',
          secondary: '#00696f',        // Cyan
          'secondary-container': '#00f1fd',
          tertiary: '#5056a6',         // Electric Cobalt
          outline: '#827286',
          error: '#ba1a1a',
        }
      },
      boxShadow: {
        'glass': '0 4px 20px rgba(13, 28, 45, 0.08)', 
        'glow': '0 0 10px rgba(152, 0, 207, 0.3)', 
      },
      borderRadius: {
        'tech': '0.25rem', 
      }
    },
  },
  plugins: [],
}
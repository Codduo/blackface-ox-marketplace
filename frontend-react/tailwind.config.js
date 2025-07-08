/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'agro-brown': {
          DEFAULT: '#8B4513',
          50: '#F5E6D3',
          500: '#8B4513',
          600: '#6D350F',
        },
        'agro-green': {
          DEFAULT: '#228B22',
          500: '#228B22',
          600: '#1B6E1B',
        },
        'agro-cream': {
          DEFAULT: '#F5F3F0',
          100: '#F5F3F0',
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
}
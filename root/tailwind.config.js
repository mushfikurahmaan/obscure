/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        fontFamily: {
          sans: ['Space Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
          roboto: ['Roboto', 'ui-sans-serif', 'system-ui', 'sans-serif'],
          inter: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
          arial: ['Arial', 'ui-sans-serif', 'system-ui', 'sans-serif'],
          spacegrotesk: ['Space Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        },
        colors: {
          background: 'hsl(var(--background))',
          foreground: 'hsl(var(--foreground))',
          windowgray: '#333333',
          windowred : '#e81123',
          windowlight: '#e5e5e5',
        },
        borderColor: {
          border: 'hsl(var(--border))',
        },
      },
    },
    plugins: [],
  }
  
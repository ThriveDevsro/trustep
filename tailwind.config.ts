import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#050914',
          800: '#0A0F1E',
          700: '#0F1629',
          600: '#141D35',
          500: '#1E2A47',
          400: '#2A3A5C',
        },
        accent: '#0F766E',
      },
      fontFamily: { sans: ['Inter', 'sans-serif'] },
    },
  },
  plugins: [],
}

export default config

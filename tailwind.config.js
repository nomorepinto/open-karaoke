/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#131318',
          low: '#1b1b20',
          container: '#1f1f24',
          high: '#2a292f',
          highest: '#35343a',
        },
        primary: {
          DEFAULT: '#bd00ff',
          light: '#ecb2ff',
          dark: '#520071',
        },
        secondary: {
          DEFAULT: '#00eefc',
          light: '#d3fbff',
          dark: '#00363a',
        },
        tertiary: {
          DEFAULT: '#e7006e',
          light: '#ffb1c3',
          dark: '#66002c',
        },
        neon: {
          green: '#00FF66',
          yellow: '#FFD600',
        },
        glass: 'rgba(255, 255, 255, 0.08)',
      },
    },
  },
  plugins: [],
};

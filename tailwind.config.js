/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Light-navy accent used for the selected company row and the
        // highlight on whichever item/topic you're editing.
        navy: {
          50: '#eef2fa',
          100: '#dbe5f3',
          200: '#bccfe7',
          800: '#26365c',
          900: '#1b2746',
        },
      },
      fontFamily: {
        // System UI stack; tight, neutral, terminal-ish.
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'Liberation Mono',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
};

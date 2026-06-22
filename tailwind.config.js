/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "node_modules/flowbite-react/lib/esm/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        // Lepista Bioinformatics Lab design system.
        // Tokens mirror lbl-landing-page/src/app/globals.css.
        //
        // Harmonic neutrals that bridge the violet identity and the amber group
        // accent — a warm paper in light, a violet-charcoal in dark, and a deep
        // violet-tinted ink for text. Kept off pure black/white so contrast
        // reads strong but soft.
        canvas: '#faf8f4',
        'canvas-dark': '#15131a',
        surface: '#ffffff',
        'surface-dark': '#211d29',
        ink: '#2b2533',
        //
        // Level 1 — global lab identity (violet, Lepista nuda).
        brand: {
          50: '#f3edf9',
          100: '#e4d4f2',
          200: '#cbade7',
          300: '#ac7dd6',
          400: '#9260c4',
          500: '#7b49a0',
          600: '#663a88',
          700: '#512d6e',
          800: '#3d2154',
          900: '#2a153a',
          950: '#120a19',
        },
        // Level 2 — Bioinformatics product group accent (amber).
        // blutils belongs to this group, so amber is this app's accent.
        science: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#FEB326',
          500: '#d99b1e',
          600: '#b37f17',
          700: '#8c6311',
          800: '#66470c',
          900: '#402d07',
        },
      },
    },
  },
  plugins: [
    require('flowbite/plugin'),
  ],
}

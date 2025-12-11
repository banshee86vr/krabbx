/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // GitHub-dark-inspired neutral scale (inverted for class compatibility):
        // low steps = surfaces, high steps = text
        neutral: {
          0: '#f0f6fc',
          50: '#0d1117',
          100: '#161b22',
          200: '#21262d',
          300: '#30363d',
          400: '#8b949e',
          500: '#a6b0ba',
          600: '#c9d1d9',
          700: '#e6edf3',
          800: '#f0f6fc',
          900: '#ffffff',
        },
        // Accent: cyan #22d3ee — primary interactive color on dark grey
        action: {
          50: '#0b1b23',
          100: '#164e63',
          200: '#22d3ee',
          300: '#67e8f9',
          400: '#06b6d4',
          500: '#0891b2',
        },
        success: {
          50: '#052e1e',
          100: '#14532d',
          200: '#34d399',
          300: '#10b981',
          400: '#059669',
          500: '#047857',
        },
        warning: {
          50: '#422006',
          100: '#78350f',
          200: '#fbbf24',
          300: '#f59e0b',
          400: '#d97706',
          500: '#b45309',
        },
        critical: {
          50: '#450a0a',
          100: '#7f1d1d',
          200: '#fb7185',
          300: '#f43f5e',
          400: '#e11d48',
          500: '#9f1239',
        },
        highlight: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#c084fc',
          300: '#a855f7',
          400: '#9333ea',
          500: '#7e22ce',
        },
        teal: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#5eead4',
          300: '#14b8a6',
          400: '#0d9488',
          500: '#0f766e',
        },
        sky: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#38bdf8',
          300: '#0ea5e9',
          400: '#0284c7',
          500: '#0369a1',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'],
        mono: ['"Fira Code"', 'ui-monospace', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: {
        'hds-xs': '3px',
        'hds-sm': '5px',
        'hds-md': '6px',
        'hds-lg': '8px',
        'hds-xl': '12px',
      },
      boxShadow: {
        'hds-surface-base': '0 0 0 1px #27272a66, 0px 1px 2px 0px #00000040',
        'hds-surface-low': '0 0 0 1px #27272a59, 0px 1px 1px 0px #00000038, 0px 2px 4px 0px #00000038',
        'hds-surface-mid': '0 0 0 1px #27272a59, 0px 2px 4px 0px #00000052, 0px 8px 16px -10px #00000059',
        'hds-surface-high': '0 0 0 1px #3f3f4666, 0px 4px 6px 0px #00000052, 0px 16px 20px -10px #00000059',
        'hds-surface-higher': '0 0 0 1px #27272a59, 0px 4px 6px 0px #00000052, 0px 12px 28px 0px #00000073',
        'hds-surface-overlay': '0 0 0 1px #18181bcc, 0px 4px 6px 0px #00000073, 0px 12px 24px 0px #0000008c',
        'hds-focus-ring': 'inset 0 0 0 1px #22d3ee, 0 0 0 3px rgba(34, 211, 238, 0.35)',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s infinite',
      },
    },
  },
  plugins: [],
}

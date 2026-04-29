/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // KrabbX Design System (krabbx.zip / colors_and_type.css) + HDS radius scale
        neutral: {
          0: '#ffffff',
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#1e293b',
        },
        action: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#6366f1',
          300: '#4f46e5',
          400: '#4338ca',
          500: '#3730a3',
        },
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#34d399',
          300: '#10b981',
          400: '#059669',
          500: '#047857',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#f59e0b',
          300: '#d97706',
          400: '#b45309',
          500: '#92400e',
        },
        critical: {
          50: '#fff1f2',
          100: '#ffe4e6',
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
        'hds-surface-base': '0 0 0 1px #e2e8f033, 0px 1px 2px 0px #64748b0d',
        'hds-surface-low': '0 0 0 1px #e2e8f026, 0px 1px 1px 0px #64748b0d, 0px 2px 4px 0px #64748b0d',
        'hds-surface-mid': '0 0 0 1px #e2e8f026, 0px 2px 4px 0px #64748b14, 0px 8px 16px -10px #64748b26',
        'hds-surface-high': '0 0 0 1px #e2e8f040, 0px 4px 6px 0px #64748b1a, 0px 16px 20px -10px #64748b26',
        'hds-surface-higher': '0 0 0 1px #e2e8f033, 0px 4px 6px 0px #64748b14, 0px 12px 28px 0px #64748b33',
        'hds-surface-overlay': '0 0 0 1px #47556940, 0px 4px 6px 0px #47556933, 0px 12px 24px 0px #47556940',
        'hds-focus-ring': 'inset 0 0 0 1px #4f46e5, 0 0 0 3px #a5b4fc',
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

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        panel: 'var(--panel)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        border: 'var(--glass-border)',
        accent: 'var(--accent)'
      },
      boxShadow: {
        glass: '0 4px 10px rgba(0,0,0,.25)'
      },
      borderRadius: {
        glass: '12px'
      }
    }
  },
  plugins: []
};


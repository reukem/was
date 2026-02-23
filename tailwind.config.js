/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        lab: {
          dark: '#050b14',
          card: '#0f1623',
          border: '#1e293b',
          text: '#94a3b8',
          cyan: '#06b6d4',
          'cyan-dark': '#0891b2',
        },
        'neon-cyan': '#00f3ff',
        'neon-purple': '#bd00ff',
        'glass-bg': 'rgba(15, 23, 42, 0.6)',
        'glass-border': 'rgba(255, 255, 255, 0.1)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        orbitron: ['Orbitron', 'sans-serif'],
      },
      animation: {
        'bounce-short': 'bounce 1s infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'spin-slow': 'spin 12s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px #00f3ff, 0 0 10px #00f3ff' },
          '100%': { boxShadow: '0 0 20px #00f3ff, 0 0 40px #00f3ff' },
        }
      },
      backgroundImage: {
        'tech-grid': "radial-gradient(circle, rgba(6,182,212,0.1) 1px, transparent 1px)",
      },
      backgroundSize: {
        'tech-grid': '20px 20px',
      }
    },
  },
  plugins: [],
}

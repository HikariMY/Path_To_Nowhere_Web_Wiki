/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ptn: {
          bg:          '#0A0A0F',
          surface:     '#12121A',
          elevated:    '#1A1A26',
          border:      '#2A2A3E',
          red:         '#C8102E',
          'red-dim':   '#8B0A1F',
          'red-hover': '#E8122F',
          cyan:        '#00D4FF',
          'cyan-dim':  '#007A99',
          gold:        '#FFD700',
          purple:      '#6B5CE7',
          text:        '#E8E8F0',
          muted:       '#9898B0',
          disabled:    '#4A4A5E',
        }
      },
      fontFamily: {
        heading: ['Rajdhani', 'sans-serif'],
        body:    ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'ptn-gradient':    'linear-gradient(135deg, #0A0A0F 0%, #12121A 50%, #1A1A26 100%)',
        'red-glow':        'radial-gradient(ellipse at center, rgba(200,16,46,0.15) 0%, transparent 70%)',
        'header-gradient': 'linear-gradient(180deg, rgba(200,16,46,0.08) 0%, transparent 100%)',
      },
      boxShadow: {
        'ptn-red':  '0 0 20px rgba(200, 16, 46, 0.3)',
        'ptn-cyan': '0 0 20px rgba(0, 212, 255, 0.3)',
        'ptn-card': '0 4px 24px rgba(0, 0, 0, 0.6)',
        'ptn-sm':   '0 2px 8px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':    'fadeIn 0.3s ease-in-out',
        'slide-up':   'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}


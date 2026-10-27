import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './mdx-components.tsx',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand accent ramp (gradient stops, left → right)
        accent: {
          orange: '#0754FF',
          red: '#0754FF',
          pink: '#0754FF',
          magenta: '#0754FF',
          purple: '#0754FF',
          violet: '#0754FF',
          DEFAULT: '#0754FF',
        },
        // Dark marketing surfaces
        ink: {
          DEFAULT: '#000114',
          1: '#111022',
          2: '#181631',
          3: '#221F40',
        },
        'on-dark': {
          DEFAULT: '#FFFFFF',
          body: '#C7C7F2',
          muted: 'rgba(255,255,255,0.46)',
        },
      },
      backgroundImage: {
        'gradient-brand':
          'linear-gradient(90deg, #0754FF 0%, #0754FF 39.51%, #0754FF 67.44%, #0754FF 100.01%)',
        'gradient-brand-135':
          'linear-gradient(135deg, #0754FF 0%, #0754FF 39.51%, #0754FF 67.44%, #0754FF 100.01%)',
        'gradient-brand-hover':
          'linear-gradient(90deg, #0647D6 0%, #0647D6 39.51%, #0647D6 67.44%, #0647D6 100.01%)',
      },
      boxShadow: {
        glow: '0 8px 28px rgba(7, 84, 255, 0.32)',
        'glow-hover': '0 12px 36px rgba(7, 84, 255, 0.42)',
        'glow-purple': '0 8px 28px rgba(7, 84, 255, 0.30)',
        'card-dark': '0 14px 34px rgba(0, 0, 0, 0.4)',
        'card-dark-hover': '0 20px 44px rgba(0, 0, 0, 0.55)',
      },
      fontFamily: {
        sans: ['"Satoshi"', 'var(--font-satoshi)', 'system-ui', 'sans-serif'],
        display: ['"Cabinet Grotesk"', 'var(--font-cabinet)', '"Satoshi"', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', '"SF Mono"', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: {
        card: '18px',
        panel: '24px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}

export default config

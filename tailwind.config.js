/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  safelist: [
    'bg-rose-500/10', 'bg-amber-500/10', 'bg-emerald-500/10',
    'border-rose-500/20', 'border-amber-500/20', 'border-emerald-500/20',
    'text-rose-600', 'text-amber-600', 'text-emerald-600',
    'text-rose-500', 'text-amber-500', 'text-emerald-500',
    'shadow-rose-500/40', 'shadow-amber-500/40', 'shadow-emerald-500/40'
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#0066FF",
        "primary-dark": "#0052CC",
        "secondary": "#475569",
        "background-light": "#f8f9fa",
        "background-dark": "#09090b",
        "surface-light": "#ffffff",
        "surface-dark": "#121214",
        "surface-dark-elevated": "#18181b",
        "text-primary-light": "#09090b",
        "text-primary-dark": "#f4f4f5",
        "text-secondary-light": "#71717a",
        "text-secondary-dark": "#a1a1aa",
        "border-light": "#e4e4e7",
        "border-dark": "#27272a",
        "terracotta": "#8B4513",
        "cream": "#F8F4E3",
        "dark-cream": "#121214"
      },
      fontFamily: {
        "sans": ["Inter", "sans-serif"],
        "display": ["Lexend", "sans-serif"],
        "serif": ["Playfair Display", "serif"],
        "body": ["Inter", "sans-serif"]
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem"
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
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
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        }
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}

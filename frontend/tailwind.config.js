/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        glass: {
          light: 'rgba(255, 255, 255, 0.15)',
          dark: 'rgba(0, 0, 0, 0.25)',
        }
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '100%',
            color: 'rgb(var(--text-primary))',
            h1: {
              fontSize: '1.8em',
              fontWeight: '700',
              color: 'rgb(var(--text-primary))',
              marginTop: '1em',
              marginBottom: '0.5em',
              lineHeight: '1.2',
            },
            h2: {
              fontSize: '1.5em',
              fontWeight: '600',
              color: 'rgb(var(--text-primary))',
              marginTop: '1em',
              marginBottom: '0.5em',
              lineHeight: '1.3',
            },
            h3: {
              fontSize: '1.25em',
              fontWeight: '600',
              color: 'rgb(var(--text-primary))',
              marginTop: '1em',
              marginBottom: '0.5em',
              lineHeight: '1.4',
            },
            h4: {
              fontSize: '1.1em',
              fontWeight: '600',
              color: 'rgb(var(--text-primary))',
              marginTop: '1em',
              marginBottom: '0.5em',
            },
            p: {
              color: 'rgb(var(--text-primary))',
              marginTop: '0.5em',
              marginBottom: '0.5em',
            },
            a: {
              color: '#8b5cf6',
              '&:hover': {
                color: '#7c3aed',
              },
            },
            strong: {
              color: 'rgb(var(--text-primary))',
            },
            blockquote: {
              color: 'rgb(var(--text-secondary))',
              borderLeftColor: '#8b5cf6',
              backgroundColor: 'rgba(147, 51, 234, 0.05)',
            },
            code: {
              color: 'rgb(var(--text-primary))',
              backgroundColor: 'rgba(147, 51, 234, 0.1)',
              padding: '0.2em 0.4em',
              borderRadius: '0.25em',
            },
            'pre code': {
              backgroundColor: 'transparent',
              padding: '0',
            },
            pre: {
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              color: 'rgb(var(--text-primary))',
              border: '1px solid rgba(147, 51, 234, 0.2)',
            },
            ul: {
              color: 'rgb(var(--text-primary))',
            },
            ol: {
              color: 'rgb(var(--text-primary))',
            },
            li: {
              color: 'rgb(var(--text-primary))',
              margin: '0.25em 0',
            },
            table: {
              color: 'rgb(var(--text-primary))',
            },
            thead: {
              borderBottomColor: 'rgba(var(--text-secondary), 0.5)',
            },
            tbody: {
              tr: {
                borderBottomColor: 'rgba(var(--text-secondary), 0.3)',
              },
            },
            hr: {
              borderColor: 'rgba(var(--text-secondary), 0.3)',
            },
          },
        },
        invert: {
          css: {
            color: 'rgb(var(--text-primary))',
            h1: {
              color: 'rgb(var(--text-primary))',
            },
            h2: {
              color: 'rgb(var(--text-primary))',
            },
            h3: {
              color: 'rgb(var(--text-primary))',
            },
            h4: {
              color: 'rgb(var(--text-primary))',
            },
            p: {
              color: 'rgb(var(--text-primary))',
            },
            strong: {
              color: 'rgb(var(--text-primary))',
            },
            blockquote: {
              color: 'rgb(var(--text-secondary))',
              backgroundColor: 'rgba(147, 51, 234, 0.1)',
            },
            code: {
              color: 'rgb(var(--text-primary))',
              backgroundColor: 'rgba(147, 51, 234, 0.15)',
            },
            pre: {
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: 'rgb(var(--text-primary))',
              border: '1px solid rgba(147, 51, 234, 0.2)',
            },
            thead: {
              borderBottomColor: 'rgba(var(--text-secondary), 0.5)',
            },
            tbody: {
              tr: {
                borderBottomColor: 'rgba(var(--text-secondary), 0.3)',
              },
            },
            hr: {
              borderColor: 'rgba(var(--text-secondary), 0.3)',
            },
          },
        },
        sm: {
          css: {
            fontSize: '0.9em',
            lineHeight: '1.6',
          },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}

export default {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Quicksand', 'sans-serif'],
        display: ['Nunito', 'sans-serif'],
        hand: ['Patrick Hand', 'cursive'],
      },
      colors: {
        cloud: {
          lightest: '#F0F9FF', // Sky 50
          lighter: '#E0F2FE',  // Sky 100
          light: '#BAE6FD',    // Sky 200
          sky: '#38BDF8',      // Sky 400
          blue: '#0EA5E9',     // Sky 500
          deep: '#0284C7',     // Sky 600
          dark: '#0C4A6E',     // Sky 900
        },
        accent: {
          sun: '#FCD34D',      // Amber 300
          melon: '#FDA4AF',    // Rose 300
          mint: '#6EE7B7',     // Emerald 300
          lilac: '#C4B5FD',    // Violet 300
        }
      },
      backgroundImage: {
        'cloud-pattern': "url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'none\\' fill-rule=\\'evenodd\\'%3E%3Cg fill=\\'%23ffffff\\' fill-opacity=\\'0.4\\'%3E%3Cpath d=\\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')",
      },
      boxShadow: {
        'cloud': '0 20px 25px -5px rgba(14, 165, 233, 0.15), 0 10px 10px -5px rgba(14, 165, 233, 0.1)',
        'cloud-hover': '0 25px 50px -12px rgba(14, 165, 233, 0.25)',
        'inner-light': 'inset 0 2px 4px 0 rgba(255, 255, 255, 0.3)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 3s infinite',
        'blink': 'blink 4s infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        blink: {
          '0%, 96%, 100%': { transform: 'scaleY(1)' },
          '98%': { transform: 'scaleY(0.1)' },
        }
      }
    },
  },
}

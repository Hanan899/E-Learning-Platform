/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}', './tests/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ["'Plus Jakarta Sans'", 'sans-serif'],
        body: ["'DM Sans'", 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#4F46E5',
          hover: '#4338CA',
        },
        accent: '#10B981',
        danger: '#EF4444',
      },
      boxShadow: {
        gentle: '0 24px 80px -32px rgba(15, 23, 42, 0.22)',
      },
      backgroundImage: {
        'mesh-soft':
          'radial-gradient(circle at top left, rgba(79, 70, 229, 0.18), transparent 35%), radial-gradient(circle at bottom right, rgba(16, 185, 129, 0.16), transparent 28%)',
      },
    },
  },
  plugins: [],
};

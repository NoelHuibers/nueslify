/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  plugins: [
    require('@tailwindcss/forms'),
  ],
  theme: {
    extend: {},
  },
};

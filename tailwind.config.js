/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      brightness: {
        90: '.90',
        175: '1.75',
      }
    },
  },
};

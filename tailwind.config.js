/** @type {import('tailwindcss').Config} */
module.exports = {
content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
],
theme: {
    extend: {
    colors: {
        'indigo': {
        600: '#4f46e5',
        700: '#4338ca',
        },
        'slate': {
        800: '#1e293b',
        600: '#475569',
        }
    }
    },
    container: {
    center: true,
    padding: '1rem',
    },
},
plugins: [],
}


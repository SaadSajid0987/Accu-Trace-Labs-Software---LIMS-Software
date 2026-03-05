/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            colors: {
                sidebar: '#1e2a4a',
                'sidebar-light': '#253356',
                'sidebar-active': '#2d3f6b',
            }
        },
    },
    plugins: [],
}

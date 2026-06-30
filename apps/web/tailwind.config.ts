import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        agrogreen: {
          DEFAULT: '#1A6B3C',
          mid: '#2E8B57',
          dark: '#0D4A28',
          light: '#EAF4EE',
        },
        agrogold: {
          DEFAULT: '#C9A84C',
          light: '#FFF8E7',
          dark: '#F5E9C8',
        },
        agroteal: {
          DEFAULT: '#0E7490',
          light: '#CFFAFE',
        },
      },
    },
  },
  plugins: [],
}

export default config

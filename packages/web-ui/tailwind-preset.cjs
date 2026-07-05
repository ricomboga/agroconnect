/**
 * Shared Tailwind preset for @agroconnect/web-ui.
 *
 * Encodes the design tokens from `docs/ui-design-reference.md` (the binding
 * design-token spec). Every color / font-size / radius value here is copied
 * verbatim from that doc — never invent alternatives, and never hardcode a
 * hex value inside a component `.tsx` file. Add new tokens here first, then
 * reference them via Tailwind theme keys in components.
 *
 * Consumers (e.g. apps/web) should add this as a Tailwind `preset`:
 *
 *   const webUiPreset = require('@agroconnect/web-ui/tailwind-preset')
 *   module.exports = { presets: [webUiPreset], ... }
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        // NOTE: green/red/blue/purple/amber/teal are Tailwind's own built-in
        // color-scale names (red-50..950, etc). Defining `colors.red = {...}`
        // here would replace (not merge with) that entire built-in scale for
        // every consumer of this preset, breaking any existing code that uses
        // e.g. `bg-red-600` or `text-green-700` from Tailwind's defaults. So
        // every design-token family that collides with a Tailwind default is
        // namespaced under an `ac-` (AgroConnect) prefix instead — matching
        // the same collision-avoidance convention apps/web's own
        // tailwind.config.ts already uses (`agrogreen`/`agrogold`/`agroteal`).
        // Only genuinely new names (gold, ink, muted, surface, border) are
        // left unprefixed.
        'ac-green': {
          DEFAULT: '#1A6B3C', // Primary Green — backgrounds, primary buttons, headers, active states
          mid: '#2E8B57', // Green Medium — gradients, secondary accents
          dark: '#0D4A28', // Green Dark — sidebar header, dark gradient start, nav background
          light: '#EAF4EE', // Green Light — card backgrounds, success states, input focus bg
        },
        // Gold family (no Tailwind default collision)
        gold: {
          DEFAULT: '#C9A84C', // badges, CTA accents, price alerts, streak highlights
          light: '#FFF8E7', // gold card backgrounds
          dark: '#F5E9C8', // gold borders, muted gold backgrounds
        },
        'ac-teal': {
          DEFAULT: '#0E7490', // expert badges, secondary info, links
          light: '#CFFAFE', // teal backgrounds
        },
        // Text colors
        ink: '#111827', // body text
        ink2: '#374151', // secondary text
        muted: '#6B7280',
        muted2: '#9CA3AF',
        // Surfaces
        surface: '#F9FAFB', // card inner backgrounds
        surface2: '#F3F4F6', // page background, sidebar
        border: '#E5E7EB',
        // Status colors
        'ac-red': {
          DEFAULT: '#DC2626', // errors, overdue, urgent alerts, delete
          light: '#FEE2E2', // error backgrounds
        },
        'ac-amber': {
          DEFAULT: '#D97706', // warnings, pending states
          light: '#FEF3C7', // warning backgrounds
        },
        'ac-blue': {
          DEFAULT: '#1D4ED8', // info states, expert badge background
          light: '#DBEAFE', // info backgrounds
        },
        'ac-purple': {
          DEFAULT: '#7C3AED', // achievements, gamification
          light: '#F3E8FF', // purple backgrounds
        },
      },
      fontSize: {
        xs: '8px', // timestamps, sub-labels, hint text, badge text
        sm: '9px', // secondary text, table data, form labels
        md: '10px', // body text, list items, card subtitles
        base: '11px', // standard body
        lg: '12px', // screen titles, nav links
        xl: '13px', // section titles, important labels
        '2xl': '14px', // page headings, feature titles
        '3xl': '16px', // stat values
        '4xl': '18px', // large stats, hero numbers
        '5xl': '20px', // hero titles
        '6xl': '22px', // major KPI displays only
        '7xl': '24px', // major KPI displays only
      },
      borderRadius: {
        sm: '4px', // inputs, small elements
        md: '6px', // buttons, chips
        base: '8px', // cards, alert boxes
        lg: '12px', // modals, large cards
        pill: '20px', // badges, chips
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,.05)',
        elevated: '0 4px 12px rgba(0,0,0,.1)',
        heavy: '0 8px 28px rgba(0,0,0,.2)',
        'green-glow': '0 4px 10px rgba(26,107,60,.4)',
      },
    },
  },
}

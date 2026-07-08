import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Leaf, Sprout, Stethoscope, Wallet, Users, CloudSun, ShoppingBasket, ArrowRight,
} from 'lucide-react'
import { AnimatedWords } from './_components/AnimatedWords'

export const metadata: Metadata = {
  title: 'AgroConnect, Smart Farming for Kenya',
  description:
    'One platform to diagnose crop disease, manage your farm, access credit, and sell your harvest. Built for Kenyan farmers.',
}

const FEATURES = [
  {
    Icon: Stethoscope,
    title: 'Instant Diagnosis',
    desc: 'Snap a photo of a sick crop and get an AI diagnosis with treatment steps in seconds, even offline.',
  },
  {
    Icon: Sprout,
    title: 'Farm Management',
    desc: 'Track plots, activities, harvests, and workers in one place, synced across your whole team.',
  },
  {
    Icon: Wallet,
    title: 'Credit & Finance',
    desc: 'Apply for farm loans and inputs financing from vetted partners, right from your phone.',
  },
  {
    Icon: ShoppingBasket,
    title: 'Sell Your Harvest',
    desc: 'List fresh produce on the marketplace and connect directly with buyers across Kenya.',
  },
  {
    Icon: CloudSun,
    title: 'Weather & Alerts',
    desc: 'Localized forecasts and USSD alerts keep you ahead of drought, frost, and pests.',
  },
  {
    Icon: Users,
    title: 'Farmer Community',
    desc: 'Ask questions, share tips, and learn from extension officers and fellow farmers nearby.',
  },
]

const STATS = [
  { value: '30+', label: 'Crop diseases diagnosed' },
  { value: '47', label: 'Counties covered' },
  { value: '182', label: 'Char USSD support' },
  { value: '24/7', label: 'Offline-tolerant access' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0D4A28]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-white">
            <Leaf className="h-5 w-5 text-lime-300" />
            AgroConnect
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-green-100 sm:flex">
            <Link href="/market" className="transition-colors hover:text-white">
              Marketplace
            </Link>
            <a href="#features" className="transition-colors hover:text-white">
              Features
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-md px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Log in
            </Link>
            <Link
              href="/login"
              className="rounded-md bg-lime-400 px-4 py-1.5 text-sm font-bold text-[#0D4A28] transition-colors hover:bg-lime-300"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0D4A28]">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, #A7F3D0 0%, transparent 35%), radial-gradient(circle at 85% 60%, #BEF264 0%, transparent 40%)',
          }}
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-5xl px-4 py-24 text-center sm:px-6 sm:py-32">
          <span className="inline-block rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-lime-300">
            Karibu AgroConnect · Kenya 🇰🇪
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">
            Smart farming,
            <br />
            built for <AnimatedWords />
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-green-100 sm:text-xl">
            Diagnose disease, manage your farm, access credit, and sell your harvest,
            all in one app that works even when your signal doesn&apos;t.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 rounded-lg bg-lime-400 px-7 py-3.5 text-base font-bold text-[#0D4A28] shadow-lg shadow-lime-400/20 transition-transform hover:-translate-y-0.5 hover:bg-lime-300"
            >
              Start farming smarter
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/market"
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-7 py-3.5 text-base font-bold text-white transition-colors hover:bg-white/10"
            >
              Browse the marketplace
            </Link>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-b border-gray-100 bg-[#F1F8F1]">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-4 py-10 sm:grid-cols-4 sm:px-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-extrabold text-[#1B5E20]">{s.value}</p>
              <p className="mt-1 text-xs font-medium text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Everything your farm needs
          </h2>
          <p className="mt-4 text-gray-500">
            One platform, from planting to payout, designed for smallholder and commercial
            farmers across Kenya.
          </p>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E8F5E9] text-[#1B5E20] transition-colors group-hover:bg-[#1B5E20] group-hover:text-white">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-gray-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="bg-[#1B5E20]">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Join thousands of farmers growing smarter
          </h2>
          <p className="max-w-xl text-green-100">
            Free to join. Available in Kiswahili and English. Works on any smartphone,
            online or offline.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-lime-400 px-8 py-3.5 text-base font-bold text-[#0D4A28] transition-transform hover:-translate-y-0.5 hover:bg-lime-300"
          >
            Create your free account
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-gray-400 sm:flex-row sm:px-6">
          <span className="flex items-center gap-2 font-semibold text-gray-600">
            <Leaf className="h-4 w-4 text-[#1B5E20]" />
            AgroConnect
          </span>
          <span>© {new Date().getFullYear()} AgroConnect · Kenya 🇰🇪</span>
        </div>
      </footer>
    </div>
  )
}

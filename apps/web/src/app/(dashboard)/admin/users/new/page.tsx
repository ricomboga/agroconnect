'use client'

import { useRouter } from 'next/navigation'

const ROLE_TILES = [
  {
    value: 'farmer',
    label: '🌾 Farmer',
    caption: '6 steps incl. farm & crop setup',
    href: '/admin/users/new/farmer/2',
  },
  {
    value: 'lender',
    label: '🏦 Lender Rep',
    caption: 'Institution + CBK details',
    href: '/admin/users/new/lender',
  },
  {
    value: 'supplier',
    label: '📦 Supplier / Agrovet',
    caption: 'Business reg + products',
    href: '/admin/users/new/supplier',
  },
  {
    value: 'vet_officer',
    label: '🩺 Vet / Ext. Officer',
    caption: 'KVB licence + specialisation',
    href: '/admin/users/new/vet_officer',
  },
  {
    value: 'govt_officer',
    label: '🏛 Govt Officer',
    caption: 'Ministry + county posting',
    href: '/admin/users/new/govt_officer',
  },
  {
    value: 'buyer',
    label: '🤝 Buyer',
    caption: 'Company + trade interests',
    href: '/admin/users/new/buyer',
  },
  {
    value: 'worker',
    label: '👷 Farm Worker',
    caption: 'Assign to an existing farm',
    href: '/admin/users/new/worker',
  },
] as const

const ROLE_BLURBS: Record<string, string> = {
  farmer:
    'Full mobile app access: farm records, activities, diagnosis, finance, market, community. Requires farm setup during creation.',
  lender:
    'Lender portal access to view/approve loan applications routed from farmers assigned to their institution.',
  supplier:
    'Supplier portal access to list products, manage orders, and (optionally) participate in government subsidy distribution.',
  vet_officer:
    'Can be granted an Expert Badge to review AI diagnoses, answer community Q&A, and be assigned to farmers.',
  govt_officer:
    'Government portal access to review farm registrations and subsidy/licence applications for their ministry/county.',
  buyer: 'Public market access to browse listings and place orders from farmers and suppliers.',
  worker:
    'System user (auth_db) assigned to a specific farm. Can log activities if granted permission.',
}

export default function CreateUserStep1Page() {
  const router = useRouter()

  return (
    <div>
      <h1 className="mb-1 text-lg font-bold text-ink">Step 1 — Select User Type</h1>
      <p className="mb-4 text-sm text-muted">
        All users are created by Admin. No self-registration. Farmer creation includes farm setup.
      </p>

      <div className="mb-4 rounded-base border border-border bg-white p-4">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ac-green">Choose Role</h3>
        <div className="grid grid-cols-2 gap-3">
          {ROLE_TILES.map((tile) => (
            <button
              key={tile.value}
              type="button"
              onClick={() => router.push(tile.href)}
              className="rounded-base border border-border bg-white p-3 text-left transition-colors hover:border-ac-green hover:bg-ac-green-light"
            >
              <div className="text-base font-bold text-ink">{tile.label}</div>
              <div className="text-sm text-muted">{tile.caption}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-base border border-border bg-white p-4">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ac-green">
          Role Quick Reference
        </h3>
        <div className="flex flex-col gap-2">
          {ROLE_TILES.map((tile) => (
            <div key={tile.value} className="text-sm">
              <span className="font-bold text-ink">{tile.label}: </span>
              <span className="text-muted">{ROLE_BLURBS[tile.value]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

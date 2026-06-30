'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const KENYA_COUNTIES = [
  'Mombasa', 'Kwale', 'Kilifi', 'Tana River', 'Lamu', 'Taita-Taveta',
  'Garissa', 'Wajir', 'Mandera', 'Marsabit', 'Isiolo', 'Meru',
  'Tharaka-Nithi', 'Embu', 'Kitui', 'Machakos', 'Makueni', 'Nyandarua',
  'Nyeri', 'Kirinyaga', "Murang'a", 'Kiambu', 'Turkana', 'West Pokot',
  'Samburu', 'Trans Nzoia', 'Uasin Gishu', 'Elgeyo-Marakwet', 'Nandi',
  'Baringo', 'Laikipia', 'Nakuru', 'Narok', 'Kajiado', 'Kericho', 'Bomet',
  'Kakamega', 'Vihiga', 'Bungoma', 'Busia', 'Siaya', 'Kisumu', 'Homa Bay',
  'Migori', 'Kisii', 'Nyamira', 'Nairobi',
] as const

const ROLE_TILES = [
  { label: '🧑‍🌾 Farmer',            value: 'farmer' },
  { label: '🏦 Lender',             value: 'lender' },
  { label: '📦 Supplier',           value: 'supplier' },
  { label: '🏛 Govt Officer',        value: 'govt_officer' },
  { label: '👩‍💼 Extension Officer',  value: 'extension_officer' },
  { label: '🤝 Buyer/Trader',       value: 'buyer' },
] as const

const FARMER_TYPE_TILES = [
  { label: '🌾 Crops Only',    value: 'crops' },
  { label: '🐄 Livestock Only', value: 'livestock' },
  { label: '🌾🐄 Both',        value: 'both' },
] as const

type RoleValue = (typeof ROLE_TILES)[number]['value']
type FarmerTypeValue = (typeof FARMER_TYPE_TILES)[number]['value']

const PHONE_RE = /^(\+2547\d{8}|07\d{8})$/

const labelCls =
  'block text-[9px] font-semibold uppercase tracking-[0.05em] text-[#6B7280] mb-1'
const inputCls =
  'w-full border border-[#E5E7EB] bg-[#F9FAFB] rounded-[5px] py-[7px] px-[9px] text-[10px] text-[#111827] placeholder-[#6B7280] focus:border-[#1A6B3C] focus:outline-none transition-colors'
const errCls = 'mt-1 text-[8px] text-[#DC2626]'

function tileCls(selected: boolean) {
  return {
    border: selected ? '2px solid #1A6B3C' : '1px solid #E5E7EB',
    borderRadius: 5,
    padding: '7px 11px',
    fontSize: 9,
    fontWeight: 600,
    cursor: 'pointer' as const,
    backgroundColor: selected ? '#EAF4EE' : '#fff',
    color: selected ? '#1A6B3C' : '#6B7280',
    transition: 'all 0.1s',
    whiteSpace: 'nowrap' as const,
  }
}

export default function CreateUserPage() {
  const router = useRouter()

  const [userType, setUserType] = useState<RoleValue | ''>('')
  const [farmerType, setFarmerType] = useState<FarmerTypeValue | ''>('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [county, setCounty] = useState('')
  const [subCounty, setSubCounty] = useState('')
  const [language, setLanguage] = useState('sw')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  function clearErr(key: string) {
    setErrors((prev) => ({ ...prev, [key]: '' }))
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!userType) errs.userType = 'Please select a user type'
    if (userType === 'farmer' && !farmerType) errs.farmerType = 'Please select farmer type'
    if (name.trim().length < 2) errs.name = 'Minimum 2 characters'
    if (!PHONE_RE.test(phone.trim())) errs.phone = 'Use +254XXXXXXXXX or 07XXXXXXXX'
    if (!county) errs.county = 'Required'
    if (Object.keys(errs).length) {
      setErrors(errs)
      return false
    }
    return true
  }

  const isDisabled =
    !userType ||
    !name.trim() ||
    !phone.trim() ||
    !county ||
    (userType === 'farmer' && !farmerType)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: name.trim(),
          phone: phone.trim(),
          role: userType,
          county,
          subCounty: subCounty || undefined,
          language,
          ...(userType === 'farmer' && { farmerType }),
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string }
        throw new Error(body.message ?? 'Failed to create user')
      }
      const data = (await res.json()) as { id?: string; user?: { id: string } }
      const newId = data.id ?? data.user?.id
      toast.success(`${name.trim()}'s account created. SMS sent to ${phone.trim()}.`)
      router.push(newId ? `/admin/users/${newId}` : '/admin/users')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h1 className="text-[14px] font-bold text-[#111827] mb-3">Create New User</h1>

      <div
        style={{
          backgroundColor: '#fff',
          border: '1px solid #E5E7EB',
          borderRadius: 6,
          padding: 14,
        }}
      >
        <form onSubmit={handleSubmit}>
          {/* ── Step 1: User Type ───────────────────────── */}
          <div className="mb-4">
            <p
              style={{ fontSize: 10, fontWeight: 600, color: '#111827', marginBottom: 8 }}
            >
              Step 1: User Type
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ROLE_TILES.map((tile) => (
                <button
                  key={tile.value}
                  type="button"
                  onClick={() => {
                    setUserType(tile.value)
                    setFarmerType('')
                    clearErr('userType')
                  }}
                  style={tileCls(userType === tile.value)}
                >
                  {tile.label}
                </button>
              ))}
            </div>
            {errors.userType && <p className={errCls}>{errors.userType}</p>}
          </div>

          {/* ── Step 2: Farmer Type (conditional) ───────── */}
          {userType === 'farmer' && (
            <div className="mb-4">
              <p
                style={{ fontSize: 10, fontWeight: 600, color: '#111827', marginBottom: 8 }}
              >
                Step 2: Farmer Type
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                {FARMER_TYPE_TILES.map((tile) => (
                  <button
                    key={tile.value}
                    type="button"
                    onClick={() => {
                      setFarmerType(tile.value)
                      clearErr('farmerType')
                    }}
                    style={tileCls(farmerType === tile.value)}
                  >
                    {tile.label}
                  </button>
                ))}
              </div>
              {errors.farmerType && <p className={errCls}>{errors.farmerType}</p>}
            </div>
          )}

          {/* ── Step 3: Personal Details ─────────────────── */}
          <div className="mb-4">
            <p
              style={{ fontSize: 10, fontWeight: 600, color: '#111827', marginBottom: 8 }}
            >
              Step 3: Personal Details
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                marginBottom: 8,
              }}
            >
              {/* Full Name */}
              <div>
                <label className={labelCls}>Full Name *</label>
                <input
                  className={inputCls}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    clearErr('name')
                  }}
                  placeholder="Jane Wanjiru"
                />
                {errors.name && <p className={errCls}>{errors.name}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className={labelCls}>Phone Number *</label>
                <input
                  className={inputCls}
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value)
                    clearErr('phone')
                  }}
                  placeholder="+254712345678"
                />
                {errors.phone && <p className={errCls}>{errors.phone}</p>}
              </div>

              {/* County */}
              <div>
                <label className={labelCls}>County *</label>
                <select
                  className={inputCls}
                  value={county}
                  onChange={(e) => {
                    setCounty(e.target.value)
                    clearErr('county')
                  }}
                >
                  <option value="">Select county…</option>
                  {KENYA_COUNTIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {errors.county && <p className={errCls}>{errors.county}</p>}
              </div>

              {/* Sub-County */}
              <div>
                <label className={labelCls}>Sub-County</label>
                <input
                  className={inputCls}
                  value={subCounty}
                  onChange={(e) => setSubCounty(e.target.value)}
                  placeholder="Bahati"
                />
              </div>
            </div>

            {/* Language (Farmer only) */}
            {userType === 'farmer' && (
              <div style={{ maxWidth: '50%', paddingRight: 4 }}>
                <label className={labelCls}>First Login Language</label>
                <select
                  className={inputCls}
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="sw">Kiswahili</option>
                  <option value="en">English</option>
                </select>
              </div>
            )}
          </div>

          {/* ── SMS Notice ───────────────────────────────── */}
          <div
            style={{
              backgroundColor: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: 5,
              padding: 9,
              marginTop: 4,
              marginBottom: 10,
              fontSize: 9,
              color: '#374151',
              lineHeight: 1.6,
            }}
          >
            ℹ️ A temporary PIN (1234) will be sent to{' '}
            <strong>{phone.trim() || '[phone]'}</strong> via SMS. The user must
            change it on first login. They will not be able to use the app until
            they set a new PIN.
          </div>

          {/* ── Action Buttons ───────────────────────────── */}
          <div style={{ display: 'flex', gap: 7 }}>
            <button
              type="submit"
              disabled={isDisabled || submitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                backgroundColor: '#1A6B3C',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                paddingTop: 9,
                paddingBottom: 9,
                paddingLeft: 10,
                paddingRight: 10,
                fontSize: 10,
                fontWeight: 600,
                cursor: isDisabled || submitting ? 'not-allowed' : 'pointer',
                opacity: isDisabled || submitting ? 0.6 : 1,
                transition: 'opacity 0.1s',
              }}
            >
              {submitting ? (
                <>
                  <svg
                    className="animate-spin"
                    style={{ width: 10, height: 10 }}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
                      strokeLinecap="round"
                    />
                  </svg>
                  Creating...
                </>
              ) : (
                '✓ Create Account & Send SMS'
              )}
            </button>

            <button
              type="button"
              onClick={() => router.push('/admin/users')}
              style={{
                backgroundColor: 'transparent',
                color: '#6B7280',
                border: '1px solid #E5E7EB',
                borderRadius: 6,
                paddingTop: 9,
                paddingBottom: 9,
                paddingLeft: 10,
                paddingRight: 10,
                fontSize: 10,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { z } from 'zod'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import api from '@/lib/api'
import type { ProviderProfile } from '../page'

const KENYAN_COUNTIES = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu',
  'Garissa', 'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega', 'Kericho',
  'Kiambu', 'Kilifi', 'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale',
  'Laikipia', 'Lamu', 'Machakos', 'Makueni', 'Mandera', 'Marsabit',
  'Meru', 'Migori', 'Mombasa', "Murang'a", 'Nairobi', 'Nakuru', 'Nandi',
  'Narok', 'Nyamira', 'Nyandarua', 'Nyeri', 'Samburu', 'Siaya',
  'Taita-Taveta', 'Tana River', 'Tharaka-Nithi', 'Trans-Nzoia', 'Turkana',
  'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot',
]

const SPECIALISATIONS = [
  'Crop Production', 'Livestock', 'Soil Health', 'Irrigation',
  'Pest Control', 'Soil Testing', 'Hydroponics', 'Aquaculture',
  'Poultry', 'Dairy', 'Horticulture', 'Grain Storage',
  'Agroforestry', 'Organic Farming', 'Beekeeping',
]

const editSchema = z.object({
  bio: z.string().min(50).max(1000),
  specialisations: z.array(z.string()).min(1),
  countiesServed: z.array(z.string()).min(1),
})

interface Props {
  profile: ProviderProfile
  onClose(): void
  onSaved(updated: ProviderProfile): void
}

export function EditProfileModal({ profile, onClose, onSaved }: Props) {
  const [bio, setBio] = useState(profile.bio)
  const [specialisations, setSpecialisations] = useState<string[]>(profile.specialisations)
  const [countiesServed, setCountiesServed] = useState<string[]>(profile.countiesServed)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])
  }

  async function handleSave() {
    const result = editSchema.safeParse({ bio, specialisations, countiesServed })
    if (!result.success) {
      const e: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as string
        e[key] = issue.message
      })
      setErrors(e)
      return
    }
    setSaving(true)
    try {
      const res = await api.patch<{ data: ProviderProfile }>(`/api/v1/providers/${profile.id}`, {
        bio,
        specialisations,
        countiesServed,
      })
      toast.success('Profile updated successfully.')
      onSaved(res.data.data)
    } catch {
      toast.error('Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-start justify-between">
          <CardTitle>Edit Profile</CardTitle>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Bio */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Professional Bio
            </label>
            <textarea
              rows={5}
              value={bio}
              onChange={(e) => {
                setBio(e.target.value)
                setErrors((p) => ({ ...p, bio: '' }))
              }}
              className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
            {errors.bio ? (
              <p className="mt-1 text-xs text-red-600">{errors.bio}</p>
            ) : (
              <p className="mt-1 text-xs text-gray-500">{bio.length} / 1000</p>
            )}
          </div>

          {/* Specialisations */}
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Specialisations</p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {SPECIALISATIONS.map((spec) => (
                <label
                  key={spec}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition-colors ${
                    specialisations.includes(spec)
                      ? 'border-green-600 bg-green-50 text-green-800'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={specialisations.includes(spec)}
                    onChange={() => toggle(specialisations, setSpecialisations, spec)}
                  />
                  {spec}
                </label>
              ))}
            </div>
            {errors.specialisations && (
              <p className="mt-1 text-xs text-red-600">{errors.specialisations}</p>
            )}
          </div>

          {/* Counties */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Counties Served</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="text-xs text-green-600 underline"
                  onClick={() => setCountiesServed([...KENYAN_COUNTIES])}
                >
                  All
                </button>
                <button
                  type="button"
                  className="text-xs text-gray-500 underline"
                  onClick={() => setCountiesServed([])}
                >
                  None
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
              {KENYAN_COUNTIES.map((county) => (
                <label
                  key={county}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1 text-xs transition-colors ${
                    countiesServed.includes(county)
                      ? 'border-green-600 bg-green-50 text-green-800'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={countiesServed.includes(county)}
                    onChange={() => toggle(countiesServed, setCountiesServed, county)}
                  />
                  {county}
                </label>
              ))}
            </div>
            {errors.countiesServed && (
              <p className="mt-1 text-xs text-red-600">{errors.countiesServed}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

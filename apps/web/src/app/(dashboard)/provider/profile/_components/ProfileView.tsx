'use client'

import { useState } from 'react'
import { Star, MapPin, Briefcase, BadgeCheck, Clock, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EditProfileModal } from './EditProfileModal'
import type { ProviderProfile } from '../page'

const PROVIDER_TYPE_LABELS: Record<string, string> = {
  extension_officer: 'Extension Officer',
  vet_officer: 'Veterinary Officer',
  agronomist: 'Agronomist',
  soil_lab: 'Soil Laboratory',
  equipment_dealer: 'Equipment Dealer',
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  verified: 'success',
  pending: 'warning',
  rejected: 'destructive',
  suspended: 'secondary',
}

interface Props {
  initialProfile: ProviderProfile
}

export function ProfileView({ initialProfile }: Props) {
  const [profile, setProfile] = useState(initialProfile)
  const [editOpen, setEditOpen] = useState(false)

  return (
    <>
      <div>
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Provider Profile</h1>
            <p className="mt-1 text-sm text-gray-500">
              This is what farmers see when they find you on AgroConnect
            </p>
          </div>
          <Button onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column: identity */}
          <div className="space-y-6 lg:col-span-1">
            <Card>
              <CardContent className="pt-6">
                {/* Avatar */}
                <div className="mb-4 flex flex-col items-center text-center">
                  {profile.profilePhotoUrl ? (
                    <img
                      src={profile.profilePhotoUrl}
                      alt={profile.user.name}
                      className="h-20 w-20 rounded-full object-cover ring-2 ring-green-100"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-2xl font-bold text-green-700">
                      {profile.user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <h2 className="mt-3 text-lg font-semibold text-gray-900">{profile.user.name}</h2>
                  <p className="text-sm text-gray-500">{PROVIDER_TYPE_LABELS[profile.type] ?? profile.type}</p>
                </div>

                {/* Verification status */}
                <div className="mb-4 flex justify-center">
                  <Badge variant={STATUS_VARIANT[profile.verificationStatus] ?? 'secondary'}>
                    {profile.verificationStatus === 'verified' && (
                      <BadgeCheck className="mr-1 h-3 w-3" />
                    )}
                    {profile.verificationStatus === 'pending' && (
                      <Clock className="mr-1 h-3 w-3" />
                    )}
                    {profile.verificationStatus.charAt(0).toUpperCase() +
                      profile.verificationStatus.slice(1)}
                  </Badge>
                </div>

                {/* Rating */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Rating</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold text-gray-900">
                        {profile.ratingCount > 0 ? Number(profile.ratingAvg).toFixed(1) : '—'}
                      </span>
                      <span className="text-gray-400">
                        ({profile.ratingCount} {profile.ratingCount === 1 ? 'review' : 'reviews'})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Registration */}
                <div className="mt-4 border-t border-gray-100 pt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Reg. Number</span>
                    <span className="font-medium text-gray-900 text-right">{profile.registrationNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Issued by</span>
                    <span className="font-medium text-gray-900 text-right max-w-[55%] leading-snug">{profile.issuingBody}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column: details */}
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-gray-700">{profile.bio}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Briefcase className="h-4 w-4 text-gray-400" />
                  Specialisations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile.specialisations.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.specialisations.map((spec) => (
                      <Badge key={spec} variant="secondary">{spec}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No specialisations listed.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  Counties Served
                  <span className="ml-1 text-xs font-normal text-gray-400">
                    ({profile.countiesServed.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile.countiesServed.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {profile.countiesServed.map((county) => (
                      <Badge key={county} variant="outline">{county}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No counties listed.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {editOpen && (
        <EditProfileModal
          profile={profile}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => {
            setProfile(updated)
            setEditOpen(false)
          }}
        />
      )}
    </>
  )
}

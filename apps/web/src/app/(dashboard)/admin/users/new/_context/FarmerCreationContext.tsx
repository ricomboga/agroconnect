'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

export interface PlotDraft {
  id: string
  plotName: string
  plotSize: string
  crop: string
  plantingDate: string
  season: string
  seedSource: string
  targetYield: string
}

export interface GpsValidationResult {
  valid: boolean
  distanceKm: number
  nearestCounty?: string
}

export interface FarmerCreationState {
  // Step 2 — Personal Info
  fullName: string
  phone: string
  nationalId: string
  gender: string
  dob: string
  county: string
  subCounty: string
  village: string
  nearestTown: string
  language: string
  ussdEnabled: string
  smsNotifications: string
  pushNotifications: string
  emergencyContactName: string
  emergencyContactPhone: string

  // Step 3 — Sub-type, crops, livestock
  farmerType: 'crops' | 'livestock' | 'both' | ''
  crops: string[]
  livestockTypes: string[]
  livestockCounts: Record<string, string>
  experienceYears: string
  incomeSource: string

  // Step 4 — Farm details, GPS, plots
  farmName: string
  areaAcres: string
  gpsLat: string
  gpsLng: string
  altitude: string
  waterSource: string
  soilType: string
  farmingSystem: string
  gpsValidation: GpsValidationResult | null
  plots: PlotDraft[]

  // Step 5 — Assignments
  lenderId: string | null
  expertId: string | null

  // Set after successful creation
  createdUserId: string | null
}

const initialState: FarmerCreationState = {
  fullName: '',
  phone: '',
  nationalId: '',
  gender: '',
  dob: '',
  county: '',
  subCounty: '',
  village: '',
  nearestTown: '',
  language: 'sw',
  ussdEnabled: 'enabled',
  smsNotifications: 'enabled',
  pushNotifications: 'enabled',
  emergencyContactName: '',
  emergencyContactPhone: '',

  farmerType: '',
  crops: [],
  livestockTypes: [],
  livestockCounts: {},
  experienceYears: '',
  incomeSource: '',

  farmName: '',
  areaAcres: '',
  gpsLat: '',
  gpsLng: '',
  altitude: '',
  waterSource: '',
  soilType: '',
  farmingSystem: '',
  gpsValidation: null,
  plots: [],

  lenderId: null,
  expertId: null,
  createdUserId: null,
}

interface FarmerCreationContextValue {
  state: FarmerCreationState
  update: (patch: Partial<FarmerCreationState>) => void
  reset: () => void
}

const FarmerCreationContext = createContext<FarmerCreationContextValue | null>(null)

export function FarmerCreationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FarmerCreationState>(initialState)

  const update = useCallback((patch: Partial<FarmerCreationState>) => {
    setState((prev) => ({ ...prev, ...patch }))
  }, [])

  const reset = useCallback(() => setState(initialState), [])

  return (
    <FarmerCreationContext.Provider value={{ state, update, reset }}>
      {children}
    </FarmerCreationContext.Provider>
  )
}

export function useFarmerCreation() {
  const ctx = useContext(FarmerCreationContext)
  if (!ctx) throw new Error('useFarmerCreation must be used within FarmerCreationProvider')
  return ctx
}

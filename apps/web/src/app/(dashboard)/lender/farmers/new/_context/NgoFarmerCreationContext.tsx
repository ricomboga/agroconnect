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

export interface NgoFarmerCreationState {
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

  // Set after successful creation
  createdUserId: string | null
}

const initialState: NgoFarmerCreationState = {
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

  createdUserId: null,
}

interface NgoFarmerCreationContextValue {
  state: NgoFarmerCreationState
  update: (patch: Partial<NgoFarmerCreationState>) => void
  reset: () => void
}

const NgoFarmerCreationContext = createContext<NgoFarmerCreationContextValue | null>(null)

export function NgoFarmerCreationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NgoFarmerCreationState>(initialState)

  const update = useCallback((patch: Partial<NgoFarmerCreationState>) => {
    setState((prev) => ({ ...prev, ...patch }))
  }, [])

  const reset = useCallback(() => setState(initialState), [])

  return (
    <NgoFarmerCreationContext.Provider value={{ state, update, reset }}>
      {children}
    </NgoFarmerCreationContext.Provider>
  )
}

export function useNgoFarmerCreation() {
  const ctx = useContext(NgoFarmerCreationContext)
  if (!ctx) throw new Error('useNgoFarmerCreation must be used within NgoFarmerCreationProvider')
  return ctx
}

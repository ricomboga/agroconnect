import { NextResponse } from 'next/server'

// Farmer onboarding is company-retained: lenders (including NGO/Group
// institutions, who previously had direct-creation rights here) no longer
// have permission to create farmer accounts through this portal.
export async function POST() {
  return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
}

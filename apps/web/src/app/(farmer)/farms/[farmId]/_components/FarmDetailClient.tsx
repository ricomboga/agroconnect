'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Loader2, ExternalLink, Pencil } from 'lucide-react'
import { WebLayout } from '@/components/layout/WebLayout'
import { OverviewTab }          from './OverviewTab'
import { PlotsTab }             from './PlotsTab'
import { WorkersTab }           from './WorkersTab'
import { ActivityScheduleTab }  from './ActivityScheduleTab'

// ── types ─────────────────────────────────────────────────────────────────────

export interface Farm {
  id: string
  name: string
  county: string
  subCounty: string | null
  areaAcres: string
  soilType: string | null
  waterSource: string | null
  farmType: 'crops' | 'animals' | 'both' | null
  status: 'active' | 'fallow' | 'sold'
  locationLat: string
  locationLng: string
  createdAt: string
  updatedAt: string
  healthScore?: number
  _count?: { plots: number; workers: number }
}

type TabId = 'overview' | 'plots' | 'workers' | 'activity'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview',  label: 'Overview'           },
  { id: 'plots',     label: 'Plots & Crops'      },
  { id: 'workers',   label: 'Workers'            },
  { id: 'activity',  label: 'Activity Schedule'  },
]

const FARM_TYPE_BADGE: Record<string, string> = {
  crops:   '🌾 Crops',
  animals: '🐄 Animals',
  both:    '🌾🐄 Mixed',
}

// ── component ─────────────────────────────────────────────────────────────────

interface Props {
  farmId: string
  initialTab: string
}

export function FarmDetailClient({ farmId, initialTab }: Props) {
  const validTab = (TABS.find((t) => t.id === initialTab)?.id) ?? 'overview'
  const [activeTab, setActiveTab] = useState<TabId>(validTab)

  // sync tab from initialTab prop (server searchParam)
  useEffect(() => {
    const t = TABS.find((tab) => tab.id === initialTab)
    if (t) setActiveTab(t.id)
  }, [initialTab])

  const { data, isLoading, isError } = useQuery<{ data: Farm }>({
    queryKey: ['farm', farmId],
    queryFn: async () => {
      const res = await fetch(`/api/farm/farms/${farmId}`)
      if (!res.ok) throw new Error('Failed to load farm')
      return res.json() as Promise<{ data: Farm }>
    },
  })

  const farm = data?.data

  const sidebarItems = [
    { label: 'My Farms',  href: '/farmer/farms'          },
    { label: 'Add Farm',  href: '/farms/new'             },
    { label: 'Workers',   href: `/farms/${farmId}?tab=workers` },
  ]

  const activeSidebarHref =
    activeTab === 'workers' ? `/farms/${farmId}?tab=workers` : '/farmer/farms'

  return (
    <WebLayout
      portalName="Farmer Portal"
      sidebarItems={sidebarItems}
      activeSidebarItem={activeSidebarHref}
    >
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#1A6B3C]" />
        </div>
      )}

      {isError && (
        <div
          className="rounded-[5px] bg-[#FEE2E2] px-[9px] py-[6px] text-[9px] text-[#7F1D1D]"
          style={{ borderLeft: '3px solid #DC2626' }}
        >
          Farm not found or you don&apos;t have access.{' '}
          <Link href="/farmer/farms" className="underline">Back to farms</Link>
        </div>
      )}

      {farm && (
        <>
          {/* ── Farm header ───────────────────────────────────────────── */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-[18px] font-bold text-[#111827]">{farm.name}</h1>
                {farm.farmType && (
                  <span className="w-badge-blue text-[9px] px-[8px] py-[3px]">
                    {FARM_TYPE_BADGE[farm.farmType] ?? farm.farmType}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#6B7280]">
                {farm.areaAcres} acres · {farm.county}
                {farm.subCounty ? `, ${farm.subCounty}` : ''}
              </p>
            </div>
            <Link
              href={`/farms/${farmId}/edit`}
              className="w-btn-sm flex items-center gap-1"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Link>
          </div>

          {/* ── Stat grid ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-[10px] mb-4">
            <div className="w-stat-card">
              <div
                className="w-stat-val"
                style={{ color: '#1A6B3C' }}
              >
                {farm.healthScore != null ? `${farm.healthScore}%` : '—'}
              </div>
              <div className="w-stat-lbl">Health Score</div>
            </div>
            <div className="w-stat-card">
              <div className="w-stat-val">{farm._count?.plots ?? '—'}</div>
              <div className="w-stat-lbl">Active Plots</div>
            </div>
            <div className="w-stat-card">
              <div className="w-stat-val">{farm._count?.workers ?? '—'}</div>
              <div className="w-stat-lbl">Workers</div>
            </div>
          </div>

          {/* ── Tab row ───────────────────────────────────────────────── */}
          <div className="flex gap-1 mb-4 border-b border-[#E5E7EB]">
            {TABS.map((tab) => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="text-[10px] font-medium px-3 py-[6px] rounded-[4px] transition-colors cursor-pointer"
                  style={{
                    background:  active ? '#EAF4EE' : 'transparent',
                    color:       active ? '#1A6B3C' : '#6B7280',
                    fontWeight:  active ? 600 : 400,
                  }}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* ── Tab content ───────────────────────────────────────────── */}
          {activeTab === 'overview'  && <OverviewTab         farm={farm} farmId={farmId} />}
          {activeTab === 'plots'     && <PlotsTab            farmId={farmId} farmAcres={parseFloat(farm.areaAcres)} />}
          {activeTab === 'workers'   && <WorkersTab          farmId={farmId} />}
          {activeTab === 'activity'  && <ActivityScheduleTab farmId={farmId} />}
        </>
      )}
    </WebLayout>
  )
}

'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

interface FlaggedResponse {
  meta: { total: number }
}

export function ModerationCountBadge() {
  const { data } = useQuery({
    queryKey: ['admin', 'moderation', 'count'],
    queryFn: async () => {
      const res = await api.get<FlaggedResponse>('/api/v1/admin/moderation/flagged')
      return res.data.meta?.total ?? 0
    },
    refetchInterval: 30_000,
  })

  if (!data) return null

  return (
    <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
      {data > 99 ? '99+' : data}
    </span>
  )
}

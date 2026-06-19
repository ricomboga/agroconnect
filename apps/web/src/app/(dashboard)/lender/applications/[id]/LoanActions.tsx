'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, MessageSquare, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ActionStatus = 'under_review' | 'approved' | 'rejected'

interface LoanActionsProps {
  loanId: string
  currentStatus: string
}

export function LoanActions({ loanId, currentStatus }: LoanActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<ActionStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!['submitted', 'under_review'].includes(currentStatus)) return null

  async function handleAction(status: ActionStatus) {
    setLoading(status)
    setError(null)
    try {
      const res = await fetch(`/api/lender/applications/${loanId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string }
        throw new Error(body.message ?? 'Request failed')
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => handleAction('approved')}
          disabled={loading !== null}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {loading === 'approved' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="mr-2 h-4 w-4" />
          )}
          Approve
        </Button>
        <Button
          variant="destructive"
          onClick={() => handleAction('rejected')}
          disabled={loading !== null}
        >
          {loading === 'rejected' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="mr-2 h-4 w-4" />
          )}
          Reject
        </Button>
        <Button
          variant="outline"
          onClick={() => handleAction('under_review')}
          disabled={loading !== null || currentStatus === 'under_review'}
        >
          {loading === 'under_review' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <MessageSquare className="mr-2 h-4 w-4" />
          )}
          Request More Info
        </Button>
      </div>
    </div>
  )
}

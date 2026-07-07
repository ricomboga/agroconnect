'use client'

import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <h1 className="text-lg font-semibold text-gray-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-gray-500">{error.message || 'An unexpected error occurred.'}</p>

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={reset}
            className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700"
          >
            Try again
          </button>
          <button
            onClick={() => router.back()}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Go back
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Flag, CheckCircle, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'

interface FlaggedPostAuthor {
  id: string
  full_name: string
}

interface FlaggedPost {
  id: string
  thread_id: string
  thread_title: string
  content_preview: string
  author: FlaggedPostAuthor
  flagged_at: string
}

interface FlaggedResponse {
  data: FlaggedPost[]
  meta: { total: number; page: number; page_size: number; total_pages: number }
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function FlaggedPosts() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'moderation', 'flagged'],
    queryFn: async () => {
      const res = await api.get<FlaggedResponse>('/api/v1/admin/moderation/flagged')
      return res.data
    },
  })

  const approveMutation = useMutation({
    mutationFn: (postId: string) =>
      api.post(`/api/v1/admin/moderation/${postId}/approve`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'moderation'] })
      toast.success('Post approved — flag removed')
    },
    onError: () => toast.error('Failed to approve post'),
  })

  const deleteMutation = useMutation({
    mutationFn: (postId: string) => api.delete(`/api/v1/admin/moderation/${postId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'moderation'] })
      toast.success('Post deleted')
    },
    onError: () => toast.error('Failed to delete post'),
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg border border-gray-200 bg-white p-5">
            <div className="mb-3 h-4 w-1/3 rounded bg-gray-200" />
            <div className="mb-2 h-3 w-full rounded bg-gray-200" />
            <div className="h-3 w-2/3 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    )
  }

  const posts = data?.data ?? []

  if (posts.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400">
        <CheckCircle className="mb-3 h-10 w-10 text-green-400" />
        <p className="font-medium">No flagged posts</p>
        <p className="mt-1 text-sm">The community is all clear</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        {data?.meta.total ?? 0} flagged {data?.meta.total === 1 ? 'post' : 'posts'} pending review
      </p>
      {posts.map((post) => {
        const busy = approveMutation.isPending || deleteMutation.isPending
        return (
          <div
            key={post.id}
            className="rounded-lg border border-gray-200 bg-white p-5 transition-colors hover:border-gray-300"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <Flag className="h-3.5 w-3.5 flex-shrink-0 text-red-400" />
                  <span className="text-xs text-gray-500">
                    Flagged {timeAgo(post.flagged_at)}
                  </span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-500">{post.author.full_name}</span>
                </div>
                <h3 className="truncate text-sm font-semibold text-gray-900">
                  {post.thread_title}
                </h3>
                <p className="mt-1.5 line-clamp-2 text-sm text-gray-600">
                  {post.content_preview}
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => approveMutation.mutate(post.id)}
                  disabled={busy}
                >
                  <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(post.id)}
                  disabled={busy}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

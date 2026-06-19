import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth'
import { FlaggedPosts } from './_components/FlaggedPosts'

export default async function AdminModerationPage() {
  const session = await getServerSession()
  if (!session || (session.role as string) !== 'admin') redirect('/login')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Content Moderation</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review and act on flagged community posts
        </p>
      </div>
      <FlaggedPosts />
    </div>
  )
}

import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth'
import { CreateFarmForm } from './_components/CreateFarmForm'

export default async function NewFarmPage() {
  const session = await getServerSession()
  if (!session) redirect('/login?returnUrl=/farms/new')
  if (session.role !== 'farmer' && session.role !== 'admin') redirect('/login?returnUrl=/farms/new')

  return (
    <div className="min-h-screen bg-[#F9FAFB] py-10 px-4">
      <div className="mx-auto max-w-[640px]">
        <div
          className="bg-white border border-[#E5E7EB] rounded-[8px]"
          style={{ padding: 28 }}
        >
          <h1 className="text-5xl font-bold text-[#111827] mb-1">Create New Farm</h1>
          <p className="text-lg text-[#6B7280] mb-6">
            Fill in the details. You&apos;ll add crops and animals after saving.
          </p>
          <CreateFarmForm />
        </div>
      </div>
    </div>
  )
}

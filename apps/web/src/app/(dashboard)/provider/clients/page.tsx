import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Users, Leaf, Activity, FlaskConical } from 'lucide-react'
import { getServerSession } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL ?? 'http://localhost:3000'

interface ProviderClient {
  farmerId: string
  farmerName: string
  farmerPhone: string
  farmCount: number
  lastActivityDate: string | null
  lastDiagnosisDate: string | null
}

async function fetchClients(token: string): Promise<ProviderClient[]> {
  try {
    const res = await fetch(`${AUTH_SERVICE_URL}/api/v1/providers/me/clients`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return []
    const body = (await res.json()) as { data: ProviderClient[] }
    return body.data
  } catch {
    return []
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function activityAge(iso: string | null): 'recent' | 'moderate' | 'stale' | null {
  if (!iso) return null
  const days = (Date.now() - new Date(iso).getTime()) / 86_400_000
  if (days <= 14) return 'recent'
  if (days <= 60) return 'moderate'
  return 'stale'
}

const ACTIVITY_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'secondary' }> = {
  recent: { label: 'Active', variant: 'success' },
  moderate: { label: 'Moderate', variant: 'warning' },
  stale: { label: 'Inactive', variant: 'secondary' },
}

export default async function ProviderClientsPage() {
  const session = await getServerSession()
  if (!session || session.role !== 'extension_officer') {
    redirect('/provider/profile')
  }

  const token = cookies().get('__ac')?.value ?? ''
  const clients = await fetchClients(token)

  const totalFarms = clients.reduce((sum, c) => sum + c.farmCount, 0)
  const recentCount = clients.filter((c) => activityAge(c.lastActivityDate) === 'recent').length

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Clients</h1>
        <p className="mt-1 text-sm text-gray-500">Farmers who have booked your services</p>
      </div>

      {/* Summary cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Total Clients</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{clients.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Total Farms</CardTitle>
              <Leaf className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{totalFarms}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Active (14 days)</CardTitle>
              <Activity className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{recentCount}</p>
          </CardContent>
        </Card>
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <FlaskConical className="mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">No clients yet</p>
            <p className="mt-1 text-xs text-gray-400">
              Farmers who book your services will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Clients ({clients.length})
          </h2>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Farmer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-center">Farms</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Last Diagnosis</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => {
                  const age = activityAge(client.lastActivityDate)
                  const badge = age ? ACTIVITY_BADGE[age] : null
                  return (
                    <TableRow key={client.farmerId}>
                      <TableCell className="font-medium text-gray-900">
                        {client.farmerName}
                      </TableCell>
                      <TableCell className="text-gray-500">{client.farmerPhone}</TableCell>
                      <TableCell className="text-center text-gray-700">{client.farmCount}</TableCell>
                      <TableCell className="text-gray-500">
                        {formatDate(client.lastActivityDate)}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {formatDate(client.lastDiagnosisDate)}
                      </TableCell>
                      <TableCell>
                        {badge ? (
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        ) : (
                          <span className="text-xs text-gray-400">No activity</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}
    </div>
  )
}

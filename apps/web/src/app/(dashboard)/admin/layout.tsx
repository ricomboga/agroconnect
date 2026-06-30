import { AdminLayoutShell } from './_components/AdminLayoutShell'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutShell>{children}</AdminLayoutShell>
}

import { redirect } from 'next/navigation'
import { checkAdminAccess } from '@/lib/auth/admin'
import AdminDashboard from '@/components/admin/AdminDashboard'

// Force dynamic rendering since this page uses headers() for auth
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Admin Dashboard | Synaptic',
  description: 'Administrative panel for Synaptic.study',
}

export default async function AdminPage() {
  // Check admin access
  const admin = await checkAdminAccess()

  if (!admin) {
    // Not an admin, redirect to main dashboard
    redirect('/dashboard')
  }

  return <AdminDashboard admin={admin} />
}

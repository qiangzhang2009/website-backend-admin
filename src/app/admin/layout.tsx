/**
 * 后台管理布局
 * 提供侧边栏和头部
 */

import AdminLayout from '@/components/AdminLayout'
import AdminAuthGate from '@/components/AdminAuthGate'

export default function AdminLayoutRoot({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminAuthGate>
      <AdminLayout>
        {children}
      </AdminLayout>
    </AdminAuthGate>
  )
}

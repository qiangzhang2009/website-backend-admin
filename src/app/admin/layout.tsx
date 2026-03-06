/**
 * 后台管理布局
 * 提供侧边栏和头部
 */

import AdminLayout from '@/components/AdminLayout'

export default function AdminLayoutRoot({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminLayout>
      {children}
    </AdminLayout>
  )
}

/**
 * 后台管理系统入口
 * 自动跳转到仪表盘，使用默认租户
 */

import { redirect } from 'next/navigation'

export default function AdminRoot() {
  // 默认使用 zxqconsulting 租户
  redirect('/admin/dashboard?tenant=zxqconsulting')
}

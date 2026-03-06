/**
 * 后台管理系统入口
 * 自动跳转到仪表盘
 */

import { redirect } from 'next/navigation'

export default function AdminRoot() {
  redirect('/admin/dashboard')
}

/**
 * 首页
 */

import Link from 'next/link'

export default function Home() {
  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1>网站数据管理系统</h1>
      <p>多租户SaaS化后台数据管理系统</p>
      <div style={{ marginTop: '30px' }}>
        <Link href="/admin" style={{ marginRight: '20px', fontSize: '18px' }}>
          进入后台管理系统 →
        </Link>
      </div>
      <div style={{ marginTop: '50px', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h3>接入说明</h3>
        <p>在您的网站中嵌入以下代码即可开始采集数据：</p>
        <pre style={{ textAlign: 'left', background: '#fff', padding: '15px', borderRadius: '4px' }}>
{`<script src="https://your-domain.com/api/tracking?tenant=zxqconsulting"></script>`}
        </pre>
      </div>
    </div>
  )
}

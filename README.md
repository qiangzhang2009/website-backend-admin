# 多租户网站数据管理系统

## 项目简介

一套**云端优先、成本最低、可无限复用**的多租户SaaS化网站数据管理系统。

## 核心功能

### 1. 数据采集
- 前端埋点SDK，支持页面浏览、工具交互、表单提交数据采集
- 多租户数据隔离
- 实时数据处理

### 2. 用户画像
- 360°用户画像
- 行为标签、业务标签、意向标签
- 自动线索评分

### 3. 询盘管理
- 线索自动分配
- 状态跟踪（待处理/跟进中/已成交/已流失）
- 跟进记录管理

### 4. 数据分析
- 流量分析（访问趋势、来源分布）
- 转化漏斗分析
- 工具使用分析

### 5. 多租户支持
- 租户管理后台
- 可配置化业务模块
- 统一身份认证

## 技术栈

- **前端框架**: Next.js 15
- **UI组件库**: Ant Design 5
- **数据库**: Supabase (PostgreSQL)
- **数据可视化**: Ant Design Charts, Recharts
- **部署平台**: Vercel

## 快速开始

### 1. 安装依赖

```bash
cd backend-admin
npm install
```

### 2. 配置环境变量

创建 `.env.local` 文件：

```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 4. 进入后台管理

访问 http://localhost:3000/admin

## 接入新网站

### 步骤1: 获取嵌入代码

在浏览器中访问：
```
http://localhost:3000/api/tracking?tenant=your-tenant-slug
```

### 步骤2: 嵌入到您的网站

在网站HTML的 `<head>` 中添加：

```html
<script src="https://your-domain.com/api/tracking?tenant=your-tenant-slug"></script>
```

### 步骤3: 使用追踪API

在您的网站中调用追踪函数：

```javascript
// 工具交互追踪
window.zxqTrack.tool('成本计算器', 'start', { product: '保健食品', market: '日本' })
window.zxqTrack.tool('成本计算器', 'submit', { product: '保健食品', market: '日本', budget: 150000 })

// 表单提交追踪
window.zxqTrack.form('询盘表单', { name: '王先生', phone: '138****1234', company: 'XX公司' }, 'success')

// 自定义事件
window.zxqTrack.custom('button_click', { button: '立即咨询' })
```

## 目录结构

```
src/
├── app/                    # Next.js App Router
│   ├── admin/             # 后台管理页面
│   │   ├── dashboard/     # 仪表盘
│   │   ├── users/        # 用户管理
│   │   ├── inquiries/    # 询盘管理
│   │   ├── analytics/    # 数据分析
│   │   └── tools/        # 工具数据
│   ├── api/               # API路由
│   │   └── tracking/     # 数据采集API
│   └── page.tsx          # 首页
├── components/            # 组件
│   └── AdminLayout.tsx   # 后台布局
└── lib/                   # 工具函数
    ├── supabase/         # Supabase客户端
    ├── tracking/         # 追踪SDK
    └── multi-tenant/    # 多租户模块
```

## 成本估算

### MVP阶段（1-3个网站）
- **云端费用**: $0（免费额度内）
- **开发成本**: 自有团队 ≈ 0

### 全功能阶段（10-50个网站）
- **云端费用**: 约 $25-50/月

## 后续功能规划

- [ ] 360°用户画像系统
- [ ] 转化归因分析
- [ ] ML成交预测
- [ ] 智能推荐引擎
- [ ] 多网站配置后台

## 许可证

MIT

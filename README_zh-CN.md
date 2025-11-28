[English](https://github.com/hicyoucom/hicyou/README.md) ｜ [简体中文 / Simplified Chinese](https://github.com/hicyoucom/hicyou/README_zh-CN.md)

![](/public/logo.svg)

# HiCyou - AI驱动的工具目录平台

HiCyou 是一个现代化的、AI驱动的工具目录平台，旨在帮助用户发现和提交有用的工具和资源。它利用 AI 自动生成丰富的内容，如关键特性、使用场景和常见问题解答，简化内容创建流程。

## ✨ 主要特性

- **0成本部署：** 借助带有免费额度的 PaaS，即可实现快速、稳定、可靠的全链路部署
- **AI驱动的内容生成**：使用 AI 自动提取和生成提交工具的关键特性、使用场景和常见问题
- **用户提交与管理员审核工作流**：用户可以提交工具，管理员审核后发布
- **SEO优化**：基于 Next.js App Router 构建，具有动态站点地图和元数据优化
- **现代化UI/UX**：使用 Tailwind CSS 和 Shadcn UI 构建的简洁响应式设计
- **安全用户认证**：集成 Supabase 提供的完整登录与权限体系
- **Cloudflare R2 存储**：高效的图片存储，支持 logo 和封面图片
- **分类管理**：使用自定义图标和颜色组织工具分类

## 🛠️ 技术栈

- **框架**: [Next.js 14](https://nextjs.org/) 
- **数据库**: [PostgreSQL](https://www.postgresql.org/) (通过 [Supabase](https://supabase.com/))
- **认证**: [Supabase Auth](https://supabase.com/auth)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **样式**: [Tailwind CSS](https://tailwindcss.com/) & [Shadcn UI](https://ui.shadcn.com/)
- **存储**: [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/)
- **AI集成**: OpenAI Completion API

得益于 Supabase Auth，HiCyou 能够以高安全性与低开发成本，轻松完成用户中心的构建与扩展。

## 🔌 托管服务介绍

### Vercel

- 100 GB/月 免费出站流量
- 1,000,000 次/月 免费Edge Requests
- 1,000,000 次/月 免费Functions 调用，约 4 小时 CPU、360 GB·小时内存

### Cloudflare R2

- 10 GB/月 免费标准或低频存储
- 1,000,000 次/月 免费 Class A（写）操作
- 10,000,000 次/月 免费 Class B（读）操作
- 出口流量 0 费用（只按存储和操作计费）

### SupaBase

- 免费 500 MB Postgres 数据库 + Unlimited API Requests
- 免费 5 GB Egress + 5 GB Cached Egress
- 免费提供 Auth：50,000 MAUs/月，用户总数不限
- 免费 Realtime：200 并发，2,000,000 消息/月

## 🚀 快速开始

### 使用须知

Hi Cyou 项目可以完全免费商业化使用，但是如果您使用 Hi Cyou 的源代码构建自己的目录，则**必须**显示“Powered by Hi Cyou”徽章。

<a href="https://hicyou.com" target="_blank" rel="noopener"><img src="https://hicyou.com/badge/powered-light.svg" alt="Powered by Hi Cyou" /></a>

- 徽章必须清晰地显示在您的网站上（通常在页脚或“关于我们”页面）。
- 徽章必须链接回 https://hicyou.com
- 请勿移除、修改或遮盖徽章。
- 商业用途允许，但须注明出处。

### 环境要求

在开始之前，请确保你已经安装了以下软件：

- [Node.js](https://nodejs.org/) (v18 或更高版本)
- [pnpm](https://pnpm.io/) 包管理器
- 一个 [Supabase](https://supabase.com/) 项目
- 一个 [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) 存储桶
- OpenAI 或兼容的 AI 服务提供商的 API 密钥（可选）

### 安装步骤

#### 1. 克隆项目

```bash
git clone https://github.com/hicyoucom/hicyou
cd hicyou
```

#### 2. 安装依赖

使用 pnpm 安装项目依赖：

```bash
pnpm install
```

> **说明**：如果你还没有安装 pnpm，可以使用以下命令安装：
> ```bash
> npm install -g pnpm
> ```

#### 3. 环境变量配置

复制环境变量示例文件：

```bash
cp .env.example .env
```

打开 `.env` 文件并填写以下配置信息：

##### 3.1 Supabase 配置

登录你的 [Supabase Dashboard](https://app.supabase.com/)，获取以下信息：

```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

- `NEXT_PUBLIC_SUPABASE_URL`: 项目设置 → API → Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: 项目设置 → API → Project API keys → anon public
- `SUPABASE_SERVICE_ROLE_KEY`: 项目设置 → API → Project API keys → service_role
- `DATABASE_URL`: 项目设置 → Database → Connection string → URI

##### 3.2 AI 服务配置

配置你的 AI 服务提供商（OpenAI 或兼容服务）：

```env
# AI 配置 (OpenAI 兼容)
AI_API_KEY=your_api_key
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```

- `AI_API_KEY`: 你的 OpenAI API 密钥或其他兼容服务的密钥
- `AI_BASE_URL`: API 基础 URL（如使用 OpenAI，保持默认即可）
- `AI_MODEL`: 使用的模型名称

##### 3.3 Exa 搜索配置（可选）

如果需要使用 Exa 搜索功能：

```env
# Exa 搜索
EXASEARCH_API_KEY=your_exa_api_key
```

##### 3.4 Cloudflare R2 存储配置

登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)，配置 R2 存储：

```env
# R2 存储配置
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-r2-domain.com
R2_UPLOAD_DIR=hicyou/studio/uploads 
R2_LOGO_DIR=logos
R2_COVER_DIR=covers
```

- 在 Cloudflare Dashboard 中进入 R2 → Manage R2 API Tokens 创建 API 令牌
- 创建一个存储桶并配置公共访问域名

##### 3.5 网站基本配置

```env
# 网站 URL 和基本信息
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME="HiCyou"
NEXT_PUBLIC_MAIL=contact@hicyou.com
NEXT_PUBLIC_Blog=https://blog.hicyou.com
```

##### 3.6 Cloudflare Turnstile 配置（可选）

如果需要使用 Cloudflare Turnstile 验证码：

```env
# Turnstile 配置
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_site_key
TURNSTILE_SECRET_KEY=your_secret_key
```

##### 3.7 管理员配置

⚠️只有在这里配置了邮箱的账号登录才拥有访问后台的权限

设置管理员邮箱（多个邮箱用逗号分隔）：

```env
# 管理员权限
ADMIN_EMAILS="admin@example.com,another@example.com"
```

##### 3.8 定时任务密钥

为定时任务设置一个安全密钥：

```env
# Cron 密钥（用于 /api/cron/publish）
CRON_SECRET=your_random_secret_string
```

给一个 openssl 32的命令

##### 3.9 赞助商配置（可选）

如果空着就是默认没有赞助商

```env
# 赞助商配置
NEXT_PUBLIC_SPONSOR_IMAGE_URL=https://example.com/sponsor-image.avif
NEXT_PUBLIC_SPONSOR_LINK=https://sponsor-website.com
NEXT_PUBLIC_SPONSOR_TEXT=赞助商名称 - 简短描述
```

#### 4. 数据库设置

执行数据库迁移，创建所需的表结构并填充数据：

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

> **说明**：种子数据包括默认的分类和示例工具，帮助你快速了解系统结构。

#### 5. 启动开发服务器

```bash
pnpm dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 📖 使用指南

### 用户功能

#### 提交工具

1. 访问网站并点击"提交工具"按钮
2. 填写工具的基本信息：
   - URL（必填）
   - 名称
   - 描述
   - 选择分类
   - 上传 Logo 和封面图片
3. 提交后，工具将进入审核队列
4. AI 会自动分析工具并生成：
   - 关键特性
   - 使用场景
   - 常见问题解答

#### 浏览和搜索工具

- 通过分类浏览工具
- 使用搜索功能查找特定工具
- 查看工具的详细信息，包括 AI 生成的内容

#### 收藏工具

- 登录后可以收藏喜欢的工具
- 在个人中心查看所有收藏的工具

### 管理员功能

#### 审核提交

1. 使用管理员账号登录（邮箱需在 `ADMIN_EMAILS` 配置中）
2. 访问管理员面板
3. 查看待审核的提交
4. 批准或拒绝提交
5. 批准后，工具将在网站上公开展示

#### 管理分类

- 创建、编辑或删除工具分类
- 为分类设置图标和颜色
- 调整分类的显示顺序

#### 内容管理

- 编辑已发布的工具信息
- 管理用户提交的内容
- 查看网站统计数据

## 📜 可用脚本

```bash
# 开发
pnpm dev                # 启动开发服务器

# 构建和部署
pnpm build             # 构建生产版本
pnpm start             # 启动生产服务器

# 代码质量
pnpm lint              # 运行 ESLint 检查代码质量

# 数据库管理
pnpm db:generate       # 根据 schema 生成 Drizzle 迁移文件
pnpm db:migrate        # 应用数据库迁移
pnpm db:studio         # 打开 Drizzle Studio 查看和管理数据库
pnpm db:seed           # 使用初始数据填充数据库

# Cloudflare Pages 部署
pnpm pages:build       # 构建 Cloudflare Pages 版本
pnpm preview           # 本地预览 Cloudflare Pages 版本
pnpm deploy            # 部署到 Cloudflare Pages

# 定时任务
pnpm cron:publish      # 手动触发发布定时任务
```

## 🗄️ 数据库结构

### 主要数据表

- **profiles**: 用户资料信息
- **categories**: 工具分类
- **bookmarks**: 已发布的工具
- **submissions**: 待审核的提交

详细的架构文档请参考 [ARCHITECTURE.md](ARCHITECTURE.md)。

## 🔧 常见问题

### 如何切换 AI 服务提供商？

修改 `.env` 文件中的 AI 配置：

```env
# 使用其他 OpenAI 兼容服务
AI_API_KEY=your_api_key
AI_BASE_URL=https://api.your-provider.com/v1
AI_MODEL=your-model-name
```

### 如何添加新的管理员？

在 `.env` 文件中的 `ADMIN_EMAILS` 中添加新的邮箱地址：

```env
ADMIN_EMAILS="admin1@example.com,admin2@example.com,new-admin@example.com"
```

### 数据库迁移失败怎么办？

1. 检查 `DATABASE_URL` 是否配置正确
2. 确保 Supabase 数据库可以访问
3. 查看迁移日志中的错误信息
4. 如果需要，可以在 Supabase Dashboard 的 SQL Editor 中手动执行迁移

### 如何自定义网站样式？

- 修改 `tailwind.config.ts` 调整 Tailwind 配置
- 编辑 `app/globals.css` 修改全局样式
- 在 `components/` 目录下修改具体组件的样式

## 🚀 部署指南

### Vercel 部署（推荐）

1. 将代码推送到 GitHub
2. 在 [Vercel](https://vercel.com) 中导入项目
3. 配置环境变量（与 `.env` 文件相同）
4. 点击部署

### 📝 贡献指南

欢迎贡献代码！请遵循以下步骤：

## 💬 支持与反馈

如有问题或建议，请：

- 提交 [Issue](https://github.com/your-repo/issues)
- 发送邮件至：contact@hicyou.com
- 访问我们的博客：https://blog.hicyou.com

---

由 ❤️ 和 AI 驱动

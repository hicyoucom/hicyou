[English](https://github.com/hicyoucom/hicyou/README.md) ｜ [简体中文 / Simplified Chinese](https://github.com/hicyoucom/hicyou/README_zh-CN.md)

![](/public/logo.svg)

# HiCyou - AI-powered tools directory platform

HiCyou is a modern, AI-powered tools directory platform designed to help users discover and submit useful tools and resources. It leverages AI to automatically generate rich content—such as key features, use cases, and FAQs—to simplify the content creation process.

## ✨ Key Features

- **Zero-cost deployment:** Thanks to PaaS platforms with free tiers, you can achieve fast, stable, and reliable end-to-end deployment with virtually no cost.
- **AI-powered content generation:** Automatically extract and generate key features, use cases, and FAQs for submitted tools using AI.
- **User submissions with admin review workflow:** Users can submit tools, and admins can review and publish them.
- **SEO optimization:** Built with Next.js App Router, featuring dynamic sitemaps and optimized metadata.
- **Modern UI/UX:** Clean, responsive design built with Tailwind CSS and Shadcn UI.
- **Secure user authentication:** Full login and authorization system powered by Supabase.
- **Cloudflare R2 storage:** Efficient image storage for logos and cover images.
- **Category management:** Organize tools with custom icons and colors.

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) 
- **Database**: [PostgreSQL](https://www.postgresql.org/) (via [Supabase](https://supabase.com/))
- **Auth**: [Supabase Auth](https://supabase.com/auth)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Shadcn UI](https://ui.shadcn.com/)
- **Storage**: [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/)
- **AI Integration**: OpenAI Completion API

Thanks to Supabase Auth, HiCyou can build and extend a user center with high security and low development cost.

## 🔌 Hosting Services

### Vercel

- 100 GB/month free outbound bandwidth
- 1,000,000 free Edge Requests per month
- 1,000,000 free Functions invocations per month, roughly 4 hours of CPU and 360 GB·hours of memory

### Cloudflare R2

- 10 GB/month free standard or infrequent-access storage
- 1,000,000 free Class A (write) operations per month
- 10,000,000 free Class B (read) operations per month
- Zero egress fees (you only pay for storage and operations)

### Supabase

- Free 500 MB Postgres database + unlimited API requests
- Free 5 GB egress + 5 GB cached egress
- Free Auth: 50,000 MAUs/month, unlimited total users
- Free Realtime: 200 concurrent connections, 2,000,000 messages/month

## 🚀 Getting Started

### Usage Terms

The HiCyou project can be used for commercial purposes completely free of charge. However, if you use the HiCyou source code to build your own directory, you **must** display the “Powered by Hi Cyou” badge.

<a href="https://hicyou.com" target="_blank" rel="noopener"><img src="https://hicyou.com/badge/powered-light.svg" alt="Powered by Hi Cyou" /></a>

- The badge must be clearly visible on your website (typically in the footer or on an “About” page).
- The badge must link back to https://hicyou.com.
- Do not remove, modify, or cover the badge.
- Commercial use is allowed, as long as attribution is preserved.

### Prerequisites

Before you start, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/) package manager
- A [Supabase](https://supabase.com/) project
- A [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) bucket
- An API key for OpenAI or an OpenAI-compatible AI provider (optional)

### Installation

#### 1. Clone the repository

```bash
git clone https://github.com/hicyoucom/hicyou
cd hicyou
````

#### 2. Install dependencies

Use pnpm to install project dependencies:

```bash
pnpm install
```

> **Note**: If you don’t have pnpm installed yet, you can install it with:
>
> ```bash
> npm install -g pnpm
> ```

#### 3. Environment variables

Copy the example environment file:

```bash
cp .env.example .env
```

Open the `.env` file and fill in the following configuration:

##### 3.1 Supabase configuration

Log into your [Supabase Dashboard](https://app.supabase.com/) and obtain the following values:

```env
# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

* `NEXT_PUBLIC_SUPABASE_URL`: Project Settings → API → Project URL
* `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Project Settings → API → Project API keys → anon public
* `SUPABASE_SERVICE_ROLE_KEY`: Project Settings → API → Project API keys → service_role
* `DATABASE_URL`: Project Settings → Database → Connection string → URI

##### 3.2 AI provider configuration

Configure your AI provider (OpenAI or any compatible service):

```env
# AI configuration (OpenAI compatible)
AI_API_KEY=your_api_key
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```

* `AI_API_KEY`: Your OpenAI API key or other compatible provider key.
* `AI_BASE_URL`: Base API URL (keep default if using OpenAI).
* `AI_MODEL`: Model name to use.

##### 3.3 Exa Search configuration (optional)

If you want to use Exa Search:

```env
# Exa Search
EXASEARCH_API_KEY=your_exa_api_key
```

##### 3.4 Cloudflare R2 storage configuration

Log into the [Cloudflare Dashboard](https://dash.cloudflare.com/) and configure R2 storage:

```env
# R2 storage configuration
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-r2-domain.com
R2_UPLOAD_DIR=hicyou/studio/uploads 
R2_LOGO_DIR=logos
R2_COVER_DIR=covers
```

* In the Cloudflare Dashboard, go to R2 → “Manage R2 API Tokens” to create an API token.
* Create a bucket and configure a public access domain.

##### 3.5 Basic site configuration

```env
# Site URL and basic info
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME="HiCyou"
NEXT_PUBLIC_MAIL=contact@hicyou.com
NEXT_PUBLIC_Blog=https://blog.hicyou.com
```

##### 3.6 Cloudflare Turnstile configuration (optional)

If you want to use Cloudflare Turnstile:

```env
# Turnstile configuration
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_site_key
TURNSTILE_SECRET_KEY=your_secret_key
```

##### 3.7 Admin configuration

⚠️ Only accounts whose email is configured here will have access to the admin panel.

Set admin emails (separate multiple emails with commas):

```env
# Admin permissions
ADMIN_EMAILS="admin@example.com,another@example.com"
```

##### 3.8 Cron job secret

Set a secure secret key for cron jobs:

```env
# Cron secret (used for /api/cron/publish)
CRON_SECRET=your_random_secret_string
```

For example, you can use an OpenSSL command to generate a 32-byte random string.

##### 3.9 Sponsor configuration (optional)

If these are left empty, no sponsor section will be shown.

```env
# Sponsor configuration
NEXT_PUBLIC_SPONSOR_IMAGE_URL=https://example.com/sponsor-image.avif
NEXT_PUBLIC_SPONSOR_LINK=https://sponsor-website.com
NEXT_PUBLIC_SPONSOR_TEXT=Sponsor name - short description
```

#### 4. Database setup

Run the database migrations to create the required tables and seed data:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

> **Note**: The seed data includes default categories and example tools to help you quickly understand the system structure.

#### 5. Start the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the app.

## 📖 Usage Guide

### User Features

#### Submit a tool

1. Visit the site and click the “Submit tool” button.
2. Fill in the basic information for the tool:

   * URL (required)
   * Name
   * Description
   * Select category
   * Upload logo and cover image
3. After submission, the tool will enter the review queue.
4. AI will automatically analyze the tool and generate:

   * Key features
   * Use cases
   * Frequently asked questions

#### Browse and search tools

* Browse tools by category.
* Use the search feature to find specific tools.
* View detailed tool pages, including AI-generated content.

#### Bookmark tools

* After logging in, you can bookmark your favorite tools.
* View all your bookmarked tools in your profile.

### Admin Features

#### Review submissions

1. Log in with an admin account (email must be included in the `ADMIN_EMAILS` configuration).
2. Open the admin panel.
3. View pending submissions.
4. Approve or reject submissions.
5. Once approved, the tool will be publicly visible on the site.

#### Manage categories

* Create, edit, or delete categories.
* Set icons and colors for categories.
* Adjust the display order of categories.

#### Content management

* Edit information for published tools.
* Manage user-submitted content.
* View site statistics.

## 📜 Available Scripts

```bash
# Development
pnpm dev                # Start the development server

# Build and deploy
pnpm build              # Build for production
pnpm start              # Start the production server

# Code quality
pnpm lint               # Run ESLint

# Database management
pnpm db:generate        # Generate Drizzle migration files from the schema
pnpm db:migrate         # Apply database migrations
pnpm db:studio          # Open Drizzle Studio to inspect/manage the database
pnpm db:seed            # Seed the database with initial data

# Cloudflare Pages deployment
pnpm pages:build        # Build for Cloudflare Pages
pnpm preview            # Preview the Cloudflare Pages build locally
pnpm deploy             # Deploy to Cloudflare Pages

# Cron jobs
pnpm cron:publish       # Manually trigger the publish cron job
```

## 🗄️ Database Structure

### Main Tables

* **profiles**: User profile information
* **categories**: Tool categories
* **bookmarks**: Published tools
* **submissions**: Pending submissions

For detailed schema documentation, see [ARCHITECTURE.md](ARCHITECTURE.md).

## 🔧 FAQ

### How do I switch AI providers?

Update the AI configuration in `.env`:

```env
# Use another OpenAI-compatible provider
AI_API_KEY=your_api_key
AI_BASE_URL=https://api.your-provider.com/v1
AI_MODEL=your-model-name
```

### How do I add a new admin?

Add the new email address to `ADMIN_EMAILS` in `.env`:

```env
ADMIN_EMAILS="admin1@example.com,admin2@example.com,new-admin@example.com"
```

### What if database migration fails?

1. Check whether `DATABASE_URL` is configured correctly.
2. Make sure the Supabase database is accessible.
3. Inspect the migration logs for error messages.
4. If needed, you can manually run the migration SQL in the Supabase Dashboard’s SQL Editor.

### How do I customize the site’s styles?

* Modify `tailwind.config.ts` to adjust Tailwind configuration.
* Edit `app/globals.css` to change global styles.
* Update components under the `components/` directory to customize specific UI parts.

## 🚀 Deployment Guide

### Deploying to Vercel (recommended)

1. Push your code to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Configure environment variables (same as in `.env`).
4. Click deploy.

### 📝 Contributing

Contributions are welcome! Please follow these steps when contributing:

*(Fill in your contribution guidelines here.)*

## 💬 Support & Feedback

If you have questions or suggestions, you can:

* Open an [Issue](https://github.com/your-repo/issues)
* Send an email to: [contact@hicyou.com](mailto:contact@hicyou.com)
* Visit our blog: [https://blog.hicyou.com](https://blog.hicyou.com)

---

Made with ❤️ and AI
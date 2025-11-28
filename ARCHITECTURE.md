# Architecture Documentation

This document provides a high-level overview of the HiCyou project's architecture, including its directory structure, database schema, and key workflows.

## 🏗️ High-Level Overview

HiCyou is built as a monolithic full-stack application using **Next.js 14** with the App Router. It leverages **Server Components** for improved performance and SEO.

- **Frontend**: React components styled with Tailwind CSS and Shadcn UI.
- **Backend**: Next.js API Routes (Route Handlers) and Server Actions.
- **Database**: PostgreSQL managed by Supabase, accessed via Drizzle ORM.
- **Storage**: Cloudflare R2 for storing user-uploaded images (logos, covers).
- **AI Services**: Integration with LLMs (e.g., OpenAI) for content generation.

## 📂 Directory Structure

```
/
├── app/                 # Next.js App Router pages and API routes
│   ├── api/             # Backend API endpoints (cron, upload, etc.)
│   ├── (routes)/        # Page routes (organized by feature)
│   └── layout.tsx       # Root layout
├── components/          # Reusable React components
│   ├── ui/              # Shadcn UI primitive components
│   └── ...              # Feature-specific components
├── db/                  # Database configuration
│   ├── schema.ts        # Drizzle ORM schema definitions
│   └── seed.ts          # Database seeding script
├── lib/                 # Utility functions and shared logic
│   ├── utils.ts         # Helper functions
│   └── ...
├── public/              # Static assets (images, fonts)
├── scripts/             # Maintenance and utility scripts
└── ...config files      # Configuration (next.config.mjs, tailwind.config.ts, etc.)
```

## 🗄️ Database Schema

The database is designed with PostgreSQL and managed using Drizzle ORM. Key tables include:

### `profiles`
Stores user information, extending Supabase Auth.
- `id`: Links to Supabase Auth user ID.
- `email`, `name`, `avatarUrl`: User profile details.

### `categories`
Defines the classification for tools.
- `name`, `slug`: Identification.
- `icon`, `color`: UI presentation.

### `bookmarks`
The core table for published tools/resources.
- `url`, `title`, `description`: Basic info.
- `categoryId`: Relation to `categories`.
- `keyFeatures`, `useCases`, `faqs`: JSON fields for AI-generated content.
- `pricingType`: Paid, Free, Freemium, etc.

### `submissions`
Stores user-submitted tools pending approval.
- Similar structure to `bookmarks` but includes submitter info (`submitterEmail`).
- `status`: 'pending', 'approved', 'rejected'.

## 🔄 Key Workflows

### 1. Submission Workflow
1.  **User Submission**: A user submits a URL via the `/submit` page.
2.  **Data Entry**: The system (or user) fills in details like title, description, and category.
3.  **Storage**: The data is saved to the `submissions` table with a status of `pending`.
4.  **Review**: An admin reviews the submission in the admin panel.
5.  **Approval**: Upon approval, the submission is moved/copied to the `bookmarks` table for public display.

### 2. AI Content Generation
1.  **Trigger**: When a new tool is processed (either during submission or via admin action).
2.  **Scraping**: The system fetches the content of the target URL.
3.  **Generation**: An LLM analyzes the content and generates:
    - **Key Features**: A list of main functionalities.
    - **Use Cases**: Scenarios where the tool is useful.
    - **FAQs**: Common questions and answers.
4.  **Storage**: This structured data is stored in the `json` fields of the `bookmarks` or `submissions` table.

### 3. Image Handling
1.  **Upload**: Images (logos, covers) are uploaded via the frontend.
2.  **Storage**: Files are sent to Cloudflare R2.
3.  **Reference**: The public URL of the stored image is saved in the database (`logo`, `cover` fields).

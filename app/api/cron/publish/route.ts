import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { submissions, bookmarks } from "@/db/schema";
import { and, eq, lte } from "drizzle-orm";

// 强制动态渲染，因为使用了 request.headers
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/cron/publish
 * 定时任务：自动发布已验证且到达发布时间的提交
 * 
 * 可以使用 cron 服务调用，例如：
 * - Vercel Cron Jobs
 * - GitHub Actions
 * - 外部 cron 服务 (cron-job.org)
 * 
 * 建议每15分钟运行一次
 */
export async function GET(request: NextRequest) {
  try {
    // 可选：验证请求来源（使用密钥保护）
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // 查找所有状态为 verified 且发布时间已到的提交
    const readyToPublish = await db
      .select()
      .from(submissions)
      .where(
        and(
          eq(submissions.status, "verified"),
          lte(submissions.publishAt, now)
        )
      );

    console.log(`找到 ${readyToPublish.length} 个待发布的提交`);

    const published = [];
    const failed = [];

    for (const submission of readyToPublish) {
      try {
        // 生成 slug
        const slug = generateSlug(submission.title);

        // 创建书签
        const [bookmark] = await db
          .insert(bookmarks)
          .values({
            url: submission.url,
            title: submission.title,
            slug: slug,
            description: submission.description,
            categoryId: submission.categoryId,
            isFavorite: false,
            isArchived: false,
          })
          .returning();

        // 更新提交状态为已发布
        await db
          .update(submissions)
          .set({
            status: "published",
            updatedAt: now,
          })
          .where(eq(submissions.id, submission.id));

        published.push({
          submissionId: submission.id,
          bookmarkId: bookmark.id,
          url: submission.url,
          title: submission.title,
        });

        console.log(`✓ 已发布: ${submission.title} (${submission.url})`);
      } catch (error) {
        console.error(`✗ 发布失败: ${submission.title}`, error);
        failed.push({
          submissionId: submission.id,
          url: submission.url,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `处理完成`,
      stats: {
        total: readyToPublish.length,
        published: published.length,
        failed: failed.length,
      },
      published,
      failed,
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      {
        error: "Cron job failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * 生成URL友好的slug
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // 移除特殊字符
    .replace(/[\s_-]+/g, "-") // 替换空格和下划线为连字符
    .replace(/^-+|-+$/g, ""); // 移除首尾的连字符
}



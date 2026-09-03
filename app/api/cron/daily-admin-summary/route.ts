import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { submissions } from "@/db/schema";
import { sendEmail } from "@/lib/mail";
import { AdminDailySummaryEmail } from "@/components/emails/admin-daily-summary";
import { gte, sql } from "drizzle-orm";
import { getAdminEmails } from "@/lib/admin-auth";
import { verifyCronAuth } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 2. Query last 24h submissions
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Count new submissions
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(submissions)
      .where(gte(submissions.createdAt, oneDayAgo));

    const newCount = result[0]?.count || 0;

    logger.info(`[Daily Summary] New submissions found: ${newCount}`);

    // 3. Send email only if count > 0
    if (newCount > 0) {
      const adminEmails = getAdminEmails();
      const dateStr = new Date().toLocaleDateString("zh-CN", {
        timeZone: "Asia/Shanghai",
      });

      for (const email of adminEmails) {
        await sendEmail({
          to: email,
          subject: `[HiCyou Daily] ${newCount} New Submissions - ${dateStr}`,
          react: AdminDailySummaryEmail({
            newSubmissionsCount: newCount,
            date: dateStr,
            adminUrl: `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://hicyou.com"}/hi-studio/submissions`,
          }),
        });
      }
      return NextResponse.json({ success: true, count: newCount, sent: true });
    }

    return NextResponse.json({ success: true, count: newCount, sent: false });
  } catch (error) {
    logger.error("Daily summary cron failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

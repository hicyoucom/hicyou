/**
 * 测试用户提交功能
 * 使用方法: tsx scripts/test-submission.ts
 */

import { db } from "../db/client";
import { submissions } from "../db/schema";
import { verifyBacklink } from "../lib/backlink";
import { eq } from "drizzle-orm";

async function testSubmission() {
  console.log("🧪 测试用户提交功能\n");

  // 测试网站（这些网站应该有反向链接）
  const testSites = [
    {
      url: "https://example.com",
      title: "测试网站 1",
      description: "这是一个测试网站",
    },
  ];

  console.log("1️⃣ 测试反向链接验证功能...\n");

  for (const site of testSites) {
    console.log(`检查: ${site.url}`);
    const hasBacklink = await verifyBacklink(site.url);
    console.log(`结果: ${hasBacklink ? "✅ 通过" : "❌ 未通过"}\n`);
  }

  console.log("\n2️⃣ 测试提交到数据库...\n");

  try {
    const now = new Date();
    const publishAt = new Date(now.getTime() + 3 * 60 * 60 * 1000);

    const testSubmission = {
      url: "https://test-example-" + Date.now() + ".com",
      title: "测试提交网站",
      description: "这是一个测试提交",
      categoryId: 1,
      submitterEmail: "test@example.com",
      submitterName: "测试用户",
      backlinkVerified: true,
      backlinkVerifiedAt: now,
      publishAt,
      status: "verified" as const,
    };

    const [created] = await db
      .insert(submissions)
      .values(testSubmission)
      .returning();

    console.log("✅ 提交创建成功:");
    console.log(`   ID: ${created.id}`);
    console.log(`   URL: ${created.url}`);
    console.log(`   状态: ${created.status}`);
    console.log(
      `   发布时间: ${created.publishAt ? new Date(created.publishAt as any).toLocaleString("zh-CN") : "未设置"}`
    );
    console.log();

    console.log("3️⃣ 查询所有待发布的提交...\n");

    const pending = await db
      .select()
      .from(submissions)
      .where(eq(submissions.status, "verified"));

    console.log(`找到 ${pending.length} 个待发布的提交`);
    pending.forEach((sub) => {
      console.log(`  - ${sub.title} (${sub.url})`);
    });
    console.log();

    console.log("✅ 所有测试通过！");
  } catch (error) {
    console.error("❌ 测试失败:", error);
    process.exit(1);
  }
}

testSubmission().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});



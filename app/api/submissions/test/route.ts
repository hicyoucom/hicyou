/**
 * 测试用的提交 API（跳过反向链接验证）
 * 访问: POST /api/submissions/test
 * 仅用于开发测试！
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { submissions } from "@/db/schema";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, title, description, categoryId } = body;

    if (!url || !title) {
      return NextResponse.json(
        { error: "URL和标题是必填项" },
        { status: 400 }
      );
    }

    const now = new Date();
    const publishAt = new Date(now.getTime() + 3 * 60 * 60 * 1000);

    const [newSubmission] = await db
      .insert(submissions)
      .values({
        url,
        title,
        description: description || null,
        categoryId: categoryId || null,
        submitterEmail: "test@example.com",
        submitterName: "测试用户",
        backlinkVerified: true,
        backlinkVerifiedAt: now,
        publishAt,
        status: "verified",
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        message: "测试提交成功！将在3小时后自动发布",
        submission: newSubmission,
        publishAt: publishAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating test submission:", error);
    return NextResponse.json(
      { error: "提交失败", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}


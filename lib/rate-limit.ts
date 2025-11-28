/**
 * IP-based rate limiting for submissions
 */

import { db } from "@/db/client";
import { submissions } from "@/db/schema";
import { eq, gte, sql } from "drizzle-orm";

const MAX_SUBMISSIONS_PER_DAY = 6;

/**
 * Check if an IP address has exceeded the daily submission limit
 * @param ip IP address to check
 * @returns Object with allowed status and remaining submissions
 */
export async function checkRateLimit(ip: string): Promise<{
  allowed: boolean;
  remaining: number;
  error?: string;
}> {
  try {
    // Calculate timestamp for 24 hours ago
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    const oneDayAgoTimestamp = Math.floor(oneDayAgo.getTime() / 1000);

    // Count submissions from this IP in the last 24 hours
    const recentSubmissions = await db
      .select({ count: sql<number>`count(*)` })
      .from(submissions)
      .where(
        sql`${submissions.submitterIp} = ${ip} AND ${submissions.createdAt} >= ${oneDayAgoTimestamp}`
      );

    const count = recentSubmissions[0]?.count || 0;
    const remaining = MAX_SUBMISSIONS_PER_DAY - count;

    if (count >= MAX_SUBMISSIONS_PER_DAY) {
      return {
        allowed: false,
        remaining: 0,
        error: `Too many submissions today. You can submit up to ${MAX_SUBMISSIONS_PER_DAY} websites per day. Please try again tomorrow or contact us via email.`,
      };
    }

    return {
      allowed: true,
      remaining,
    };
  } catch (error) {
    console.error("Error checking rate limit:", error);
    // On error, allow the submission to proceed
    return {
      allowed: true,
      remaining: MAX_SUBMISSIONS_PER_DAY,
    };
  }
}

/**
 * Get IP address from request headers
 */
export function getClientIp(request: Request): string {
  // Try various headers
  const headers = new Headers(request.headers);
  
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  
  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  
  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  // Fallback to a placeholder
  return "unknown";
}


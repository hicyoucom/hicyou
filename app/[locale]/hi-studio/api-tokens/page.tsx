import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { apiTokens } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { Section, Container } from "@/components/craft";
import { ApiTokenManager, type SafeToken } from "@/components/admin/api-token-manager";

export const dynamic = "force-dynamic";

export default async function ApiTokensPage() {
  const auth = await requireAdmin();
  if (!auth.ok) redirect("/");

  const tokens = (await db
    .select({
      id: apiTokens.id,
      consumer: apiTokens.consumer,
      prefix: apiTokens.prefix,
      scopes: apiTokens.scopes,
      rateLimitPerMin: apiTokens.rateLimitPerMin,
      lastUsedAt: apiTokens.lastUsedAt,
      createdAt: apiTokens.createdAt,
      revokedAt: apiTokens.revokedAt,
    })
    .from(apiTokens)
    .orderBy(desc(apiTokens.createdAt))) as SafeToken[];

  return (
    <Section>
      <Container>
        <div className="space-y-6 py-4">
          <div className="border-b pb-6">
            <h1 className="text-3xl font-bold tracking-tight">API Tokens</h1>
            <p className="text-muted-foreground mt-1">
              Issue read-only tokens for consumers of the public Directory API (<code>/api/v1</code>).
              Tokens are shown once — store them securely.
            </p>
          </div>
          <ApiTokenManager initialTokens={tokens} />
        </div>
      </Container>
    </Section>
  );
}

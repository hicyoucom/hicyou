import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin-auth";

export default async function HiStudioLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const [{ locale }, auth] = await Promise.all([params, requireAdmin()]);

  if (!auth.ok) {
    const localePrefix = locale === "en" ? "" : `/${locale}`;
    redirect(auth.status === 401 ? `${localePrefix}/login` : localePrefix || "/");
  }

  return children;
}

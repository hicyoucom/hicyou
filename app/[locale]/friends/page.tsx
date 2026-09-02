import { TopNav } from "@/components/top-nav";
import { Metadata } from "next";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { ExternalLink } from "lucide-react";
import {
  getFriendLinkSections,
  localizedDescription,
  type FriendLink,
} from "@/lib/friend-links";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Friends | HiCyou",
    description: "Our friends and partner sites.",
    alternates: { canonical: "/friends" },
  };
}

function LinkCard({ link, locale }: { link: FriendLink; locale: string }) {
  const description = localizedDescription(link, locale);
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-1.5 rounded-xl border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
    >
      <div className="flex items-center gap-2">
        {link.logoSvg && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            loading="lazy"
            decoding="async"
            src={link.logoSvg}
            alt={`${link.name} logo`}
            width={20}
            height={20}
            className="h-5 w-5 flex-shrink-0 object-contain"
          />
        )}
        <span className="truncate text-sm font-medium transition-colors group-hover:text-primary">
          {link.name}
        </span>
        {link.dr != null && (
          <span
            className="ml-auto flex-shrink-0 text-[10px] font-semibold tabular-nums text-muted-foreground"
            title="Domain Rating by Ahrefs"
          >
            DR {link.dr}
          </span>
        )}
        <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      {description && (
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {description}
        </p>
      )}
    </a>
  );
}

export default async function FriendsPage() {
  const t = await getTranslations("friends");
  const locale = await getLocale();
  const { navigation, resources } = getFriendLinkSections();

  const sections = [
    { title: t("groupNavigation"), items: navigation },
    { title: t("groupResources"), items: resources },
  ].filter((s) => s.items.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="mb-4 text-center text-4xl font-bold">{t("title")}</h1>
        <p className="mx-auto mb-10 max-w-2xl text-center text-muted-foreground">
          {t("description")}
        </p>

        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                {section.title}
                <span className="text-xs font-normal text-muted-foreground">
                  ({section.items.length})
                </span>
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {section.items.map((link) => (
                  <LinkCard key={link.id} link={link} locale={locale} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-12 text-center text-sm text-muted-foreground">
          <Link
            href="/submit"
            className="underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Submit a resource for review
          </Link>
        </p>
      </main>
    </div>
  );
}

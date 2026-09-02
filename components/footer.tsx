"use client";

import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Github } from "lucide-react";
import { useTranslations } from "next-intl";

import { directory } from "@/directory.config";
import type { FriendLink } from "@/lib/friend-links";
import Logo from "@/public/logo.svg";

export function Footer({ navSites = [] }: { navSites?: FriendLink[] }) {
  const t = useTranslations("footer");

  return (
    <footer className="mt-20 border-t bg-background/95 pb-24 backdrop-blur lg:pb-0">
      <div className="mx-auto max-w-[1400px] px-8 py-12">
        {navSites.length > 0 && (
          <div className="mb-10 border-b pb-10">
            <h3 className="mb-5 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("navigationPartners")}
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {navSites.map((site) => (
                <a
                  key={site.id}
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border bg-card px-3 py-1.5 text-sm font-medium hover:border-primary/50"
                >
                  {site.name}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="space-y-4">
            <Link href="/" className="inline-block">
              <Image
                src={Logo}
                alt={directory.name}
                width={120}
                height={50}
                className="h-8 w-auto"
              />
            </Link>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {directory.name}. {t("rights")}
            </p>
            <a
              href="https://github.com/hicyoucom/hicyou"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm underline"
            >
              HiCyou on GitHub <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div>
            <h3 className="mb-4 font-semibold">{t("discover")}</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link href="/about">{t("footerAbout")}</Link>
              </li>
              <li>
                <Link href="/c">{t("footerCategories")}</Link>
              </li>
              <li>
                <Link href="/collections">{t("footerCollections")}</Link>
              </li>
              <li>
                <Link href="/submit">{t("submitProject")}</Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold">{t("resources")}</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/open-source"
                  className="inline-flex items-center gap-2"
                >
                  <Github className="h-4 w-4" /> {t("footerOpenSource")}
                </Link>
              </li>
              <li>
                <Link href="/legal/terms">{t("terms")}</Link>
              </li>
              <li>
                <Link href="/legal/privacy">{t("privacy")}</Link>
              </li>
              <li>
                <Link href="/friends">{t("friends")}</Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}

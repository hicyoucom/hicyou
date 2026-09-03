import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

type OpenSourcePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: OpenSourcePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "openSourcePage" });

  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
  };
}

export default async function OpenSourcePage() {
  const t = await getTranslations("openSourcePage");

  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-6 text-lg text-muted-foreground">{t("intro")}</p>
      <div className="mt-10 space-y-5 leading-7">
        <p>{t("licenseBody")}</p>
        <p>{t("attributionBody")}</p>
        <p>
          <a
            className="underline"
            href="https://github.com/hicyoucom/hicyou"
            rel="noopener noreferrer"
            target="_blank"
          >
            {t("sourceLink")}
          </a>
        </p>
      </div>
    </main>
  );
}

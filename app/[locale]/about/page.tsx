import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Container, Section } from "@/components/craft";
import { TopNav } from "@/components/top-nav";
import { Code, Github, Globe, Heart, Users, Zap } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "About HiCyou | Open-source directory platform",
  description:
    "HiCyou is a self-hosted, multilingual directory for products and online resources, with submissions, moderation, APIs, webhooks, and optional AI workflows.",
};

export default async function AboutPage() {
  const t = await getTranslations("about");
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <Section>
        <Container>
          <div className="mx-auto max-w-6xl space-y-16 py-12">
            {/* Hero Section */}
            <div className="space-y-6 text-center">
              <div className="mb-6 flex justify-center">
                <Image
                  src="/logo.svg"
                  alt="HiCyou logo"
                  width={240}
                  height={100}
                  className="h-20 w-auto"
                />
              </div>
              <Badge className="mb-4">{t("badge")}</Badge>
              <h1 className="text-5xl font-bold tracking-tight">
                {t("title")}
              </h1>
              <p className="mx-auto max-w-3xl text-2xl text-muted-foreground">
                {t("tagline")}
              </p>
            </div>

            {/* Mission Statement */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <CardTitle className="text-2xl">{t("missionTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-lg">
                <p>{t("missionP1")}</p>
                <p>{t("missionP2")}</p>
              </CardContent>
            </Card>

            {/* What is HiCyou */}
            <div className="space-y-8">
              <div className="space-y-4 text-center">
                <h2 className="text-3xl font-bold">{t("whatIsTitle")}</h2>
                <p className="mx-auto max-w-3xl text-xl text-muted-foreground">
                  {t("whatIsSubtitle")}
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <Globe className="mb-4 h-10 w-10 text-primary" />
                    <CardTitle>{t("directoryCardTitle")}</CardTitle>
                    <CardDescription>
                      {t("directoryCardSubtitle")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p>{t("directoryCardDesc")}</p>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <Zap className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                        <span>{t("directoryFeature1")}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Heart className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                        <span>{t("directoryFeature2")}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Users className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                        <span>{t("directoryFeature3")}</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <Code className="mb-4 h-10 w-10 text-primary" />
                    <CardTitle>{t("openSourceCardTitle")}</CardTitle>
                    <CardDescription>
                      {t("openSourceCardSubtitle")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p>{t("openSourceCardDesc")}</p>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <Code className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                        <span>{t("openSourceFeature1")}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Globe className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                        <span>{t("openSourceFeature2")}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Github className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                        <span>{t("openSourceFeature3")}</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Key Features */}
            <div className="space-y-8">
              <div className="space-y-4 text-center">
                <h2 className="text-3xl font-bold">{t("keyFeaturesTitle")}</h2>
                <p className="mx-auto max-w-3xl text-xl text-muted-foreground">
                  {t("keyFeaturesSubtitle")}
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("featureAdminTitle")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      {t("featureAdminDesc")}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t("featureSubmissionsTitle")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      {t("featureSubmissionsDesc")}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t("featureBadgeTitle")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      {t("featureBadgeDesc")}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t("featureSeoTitle")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      {t("featureSeoDesc")}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t("featureAiTitle")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      {t("featureAiDesc")}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t("featureResponsiveTitle")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      {t("featureResponsiveDesc")}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Open Source Info */}
            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Github className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle className="text-2xl">
                      {t("openSourceTitle")}
                    </CardTitle>
                    <CardDescription className="mt-1 text-base">
                      {t("openSourceSubtitle")}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <p className="text-lg">{t("openSourceDesc")}</p>

                  <div className="space-y-4 rounded-lg bg-muted p-6">
                    <h3 className="text-lg font-semibold">
                      {t("licenseTitle")}
                    </h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-primary">✓</span>
                        <span>{t("licenseFree")}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-primary">✓</span>
                        <span>{t("licenseModify")}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-primary">✓</span>
                        <span>{t("licenseDeploy")}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-primary">✓</span>
                        <span>
                          <strong>{t("licenseRequired")}</strong>{" "}
                          {t("licenseBadge")}
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <Link
                    href="https://github.com/hicyoucom/hicyou"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="lg" className="gap-2">
                      <Github className="h-5 w-5" />
                      {t("viewGithub")}
                    </Button>
                  </Link>
                  <Link href="/legal/badges">
                    <Button size="lg" variant="outline" className="gap-2">
                      {t("getAttributionBadge")}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Tech Stack */}
            <div className="space-y-6">
              <div className="space-y-4 text-center">
                <h2 className="text-3xl font-bold">{t("techStackTitle")}</h2>
                <p className="text-xl text-muted-foreground">
                  {t("techStackSubtitle")}
                </p>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2 text-center">
                      <div className="font-semibold">
                        Next.js 16.3 + React 19
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t("techNextjs")}
                      </p>
                    </div>
                    <div className="space-y-2 text-center">
                      <div className="font-semibold">TypeScript 5.9</div>
                      <p className="text-sm text-muted-foreground">
                        {t("techTypescript")}
                      </p>
                    </div>
                    <div className="space-y-2 text-center">
                      <div className="font-semibold">Tailwind CSS 3</div>
                      <p className="text-sm text-muted-foreground">
                        {t("techTailwind")}
                      </p>
                    </div>
                    <div className="space-y-2 text-center">
                      <div className="font-semibold">
                        PostgreSQL + Drizzle ORM
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t("techDrizzle")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* CTA Section */}
            <div className="space-y-6 py-12 text-center">
              <h2 className="text-3xl font-bold">{t("ctaTitle")}</h2>
              <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
                {t("ctaDesc")}
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/submit">
                  <Button size="lg" className="gap-2">
                    {t("ctaSubmit")}
                  </Button>
                </Link>
                <Link href="/open-source">
                  <Button size="lg" variant="outline" className="gap-2">
                    {t("ctaLearnMore")}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
}

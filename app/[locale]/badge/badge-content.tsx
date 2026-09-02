"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Copy, Sun, Moon, Award, Link as LinkIcon } from "lucide-react";
import Image from "next/image";
import { useTranslations } from 'next-intl';
import { Link } from "@/i18n/navigation";

export default function BadgeContent() {
  const t = useTranslations('badgePage');
  const [copied, setCopied] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<"light" | "dark">("light");

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://hicyou.com";

  const badgeCode = {
    light: `<a href="${baseUrl}" rel="dofollow">
  <img src="${baseUrl}/badge/featured-light.svg" alt="Featured on Hi Cyou" />
</a>`,
    dark: `<a href="${baseUrl}" rel="dofollow">
  <img src="${baseUrl}/badge/featured-dark.svg" alt="Featured on Hi Cyou" />
</a>`,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(badgeCode[selectedTheme]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      {/* Benefits */}
      <Card className="mb-8 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
            <Award className="h-5 w-5" />
            {t('benefitsTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-green-800 dark:text-green-200 space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">{t('benefit1Title')}</p>
              <p className="text-sm opacity-90">
                {t('benefit1Desc')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">{t('benefit2Title')}</p>
              <p className="text-sm opacity-90">
                {t('benefit2Desc')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">{t('benefit3Title')}</p>
              <p className="text-sm opacity-90">
                {t('benefit3Desc')}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-green-300 dark:border-green-700">
            <p className="text-sm font-medium text-orange-900 dark:text-orange-200">
              ⚠️ {t('noBadgeWarning')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Badge Preview */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{t('previewTitle')}</CardTitle>
          <CardDescription>{t('previewDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Theme Toggle */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={selectedTheme === "light" ? "default" : "outline"}
              onClick={() => setSelectedTheme("light")}
              className="gap-2"
            >
              <Sun className="h-4 w-4" />
              {t('lightTheme')}
            </Button>
            <Button
              variant={selectedTheme === "dark" ? "default" : "outline"}
              onClick={() => setSelectedTheme("dark")}
              className="gap-2"
            >
              <Moon className="h-4 w-4" />
              {t('darkTheme')}
            </Button>
          </div>

          {/* Badge Display */}
          <div className={`p-8 rounded-lg border-2 flex items-center justify-center ${selectedTheme === "dark"
            ? "bg-gray-900 border-gray-700"
            : "bg-white border-gray-200"
            }`}>
            <Image
              src={`/badge/featured-${selectedTheme}.svg`}
              alt="Hi Cyou Badge"
              width={150}
              height={44}
              priority
            />
          </div>
        </CardContent>
      </Card>

      {/* Installation Code */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{t('installTitle')}</CardTitle>
          <CardDescription>
            {t('installDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Code Box */}
            <div className="relative">
              <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm border">
                <code className="text-gray-800 dark:text-gray-200">
                  {badgeCode[selectedTheme]}
                </code>
              </pre>
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-2 right-2"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    {t('copied')}
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    {t('copyCode')}
                  </>
                )}
              </Button>
            </div>

            {copied && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  {t('codeCopied')}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Installation Steps */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{t('stepsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h3 className="font-medium mb-1">{t('step1Title')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('step1Desc')}
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h3 className="font-medium mb-1">{t('step2Title')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('step2Desc')}
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <h3 className="font-medium mb-1">{t('step3Title')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('step3Desc')}
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
              4
            </div>
            <div>
              <h3 className="font-medium mb-1">{t('step4Title')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('step4Desc')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>{t('faqTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium mb-1 flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              {t('faq1Q')}
            </h4>
            <p className="text-muted-foreground">
              {t('faq1A')}
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-1">{t('faq2Q')}</h4>
            <p className="text-muted-foreground">
              {t('faq2A')}
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-1">{t('faq3Q')}</h4>
            <p className="text-muted-foreground">
              {t('faq3A')}
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-1">{t('faq4Q')}</h4>
            <p className="text-muted-foreground">
              {t('faq4A')}
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-1">{t('faq5Q')}</h4>
            <p className="text-muted-foreground">
              {t('faq5A')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="mt-8 text-center">
        <p className="text-muted-foreground mb-4">
          {t('ctaDesc')}
        </p>
        <Button asChild size="lg">
          <Link href="/submit">
            {t('ctaButton')}
          </Link>
        </Button>
      </div>
    </div>
  );
}

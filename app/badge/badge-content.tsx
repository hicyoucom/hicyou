"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Copy, Sun, Moon, Award, Link as LinkIcon } from "lucide-react";
import Image from "next/image";

export default function BadgeContent() {
  const [copied, setCopied] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<"light" | "dark">("light");

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://hicyou.com";

  const badgeCode = {
    light: `<a href="${baseUrl}" rel="dofollow">
  <img src="${baseUrl}/badge/featured-light.svg" alt="Featured on Directory" />
</a>`,
    dark: `<a href="${baseUrl}" rel="dofollow">
  <img src="${baseUrl}/badge/featured-dark.svg" alt="Featured on Directory" />
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
        <h1 className="text-4xl font-bold mb-2">Get Featured Badge</h1>
        <p className="text-muted-foreground">
          Display the badge on your website to get a high-quality Dofollow backlink
        </p>
      </div>

      {/* Benefits */}
      <Card className="mb-8 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
            <Award className="h-5 w-5" />
            Why add a Badge?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-green-800 dark:text-green-200 space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Get a Dofollow Link</p>
              <p className="text-sm opacity-90">
                After adding the badge, your link on our directory will be upgraded to <strong>Dofollow</strong>, helping to improve your website's SEO weight and search engine ranking.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Increase Website Traffic</p>
              <p className="text-sm opacity-90">
                Visitors can visit your website through the badge, bringing you more quality traffic.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Enhance Brand Credibility</p>
              <p className="text-sm opacity-90">
                Displaying the badge shows that your website has been reviewed, enhancing user trust.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-green-300 dark:border-green-700">
            <p className="text-sm font-medium text-orange-900 dark:text-orange-200">
              ⚠️ Important: If you don't add the badge, your link will remain <strong>Nofollow</strong> and will not pass SEO weight.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Badge Preview */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Badge Preview</CardTitle>
          <CardDescription>Choose a style that fits your website theme</CardDescription>
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
              Light Theme
            </Button>
            <Button
              variant={selectedTheme === "dark" ? "default" : "outline"}
              onClick={() => setSelectedTheme("dark")}
              className="gap-2"
            >
              <Moon className="h-4 w-4" />
              Dark Theme
            </Button>
          </div>

          {/* Badge Display */}
          <div className={`p-8 rounded-lg border-2 flex items-center justify-center ${selectedTheme === "dark"
            ? "bg-gray-900 border-gray-700"
            : "bg-white border-gray-200"
            }`}>
            <Image
              src={`/badge/featured-${selectedTheme}.svg`}
              alt="Featured Badge"
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
          <CardTitle>Installation Code</CardTitle>
          <CardDescription>
            Copy the code below and paste it anywhere on your website (footer recommended)
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
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy Code
                  </>
                )}
              </Button>
            </div>

            {copied && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Code copied to clipboard! You can now paste it into your website.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Installation Steps */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Installation Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h3 className="font-medium mb-1">Choose Theme</h3>
              <p className="text-sm text-muted-foreground">
                Select a light or dark theme badge based on your website's color scheme.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h3 className="font-medium mb-1">Copy Code</h3>
              <p className="text-sm text-muted-foreground">
                Click the "Copy Code" button to copy the HTML code to your clipboard.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <h3 className="font-medium mb-1">Add to Website</h3>
              <p className="text-sm text-muted-foreground">
                Paste the code into your website's HTML, recommended in the footer area.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
              4
            </div>
            <div>
              <h3 className="font-medium mb-1">Wait for Verification</h3>
              <p className="text-sm text-muted-foreground">
                We will verify and upgrade your link to Dofollow within 24 hours.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>FAQ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium mb-1 flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Q: What is a Dofollow link?
            </h4>
            <p className="text-muted-foreground">
              A: Dofollow links are links that pass SEO weight. Search engines track these links and include them in their ranking algorithms. In contrast, Nofollow links do not pass weight.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-1">Q: Must the Badge be placed in the footer?</h4>
            <p className="text-muted-foreground">
              A: No, it's not mandatory. You can place the badge anywhere on the page, but we recommend the footer as it's the most common and user-friendly location.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-1">Q: How long does it take to upgrade to Dofollow after adding the badge?</h4>
            <p className="text-muted-foreground">
              A: We will verify the badge on your website within 24 hours. Once verified, your link will be automatically upgraded to Dofollow.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-1">Q: Can I remove the badge?</h4>
            <p className="text-muted-foreground">
              A: Yes, but removing the badge will revert your link to Nofollow. If you want to maintain the SEO benefits of a Dofollow link, we recommend keeping the badge.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-1">Q: Will the Badge affect website loading speed?</h4>
            <p className="text-muted-foreground">
              A: No. The badge is a lightweight SVG image (about 10KB) and will not significantly affect website performance.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="mt-8 text-center">
        <p className="text-muted-foreground mb-4">
          Haven't submitted your website yet?
        </p>
        <Button asChild size="lg">
          <a href="/submit">
            Submit Website Now
          </a>
        </Button>
      </div>
    </div>
  );
}


"use client";

import { Section, Container } from "@/components/craft";
import { TopNav } from "@/components/top-nav";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Copy, Code } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

export default function AttributionBadges() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const badges = [
    {
      id: "powered-light",
      name: "Powered by Hi Cyou - Light",
      image: "/badge/powered-light.svg",
      html: '<a href="https://hicyou.com" target="_blank" rel="noopener"><img src="https://hicyou.com/badge/powered-light.svg" alt="Powered by Hi Cyou" /></a>',
      markdown: '[![Powered by Hi Cyou](https://hicyou.com/badge/powered-light.svg)](https://hicyou.com)',
      theme: "light",
    },
    {
      id: "powered-dark",
      name: "Powered by Hi Cyou - Dark",
      image: "/badge/powered-dark.svg",
      html: '<a href="https://hicyou.com" target="_blank" rel="noopener"><img src="https://hicyou.com/badge/powered-dark.svg" alt="Powered by Hi Cyou" /></a>',
      markdown: '[![Powered by Hi Cyou](https://hicyou.com/badge/powered-dark.svg)](https://hicyou.com)',
      theme: "dark",
    },
    {
      id: "featured-light",
      name: "Featured on Hi Cyou - Light",
      image: "/badge/featured-light.svg",
      html: '<a href="https://hicyou.com" target="_blank" rel="noopener"><img src="https://hicyou.com/badge/featured-light.svg" alt="Featured on Hi Cyou" /></a>',
      markdown: '[![Featured on Hi Cyou](https://hicyou.com/badge/featured-light.svg)](https://hicyou.com)',
      theme: "light",
    },
    {
      id: "featured-dark",
      name: "Featured on Hi Cyou - Dark",
      image: "/badge/featured-dark.svg",
      html: '<a href="https://hicyou.com" target="_blank" rel="noopener"><img src="https://hicyou.com/badge/featured-dark.svg" alt="Featured on Hi Cyou" /></a>',
      markdown: '[![Featured on Hi Cyou](https://hicyou.com/badge/featured-dark.svg)](https://hicyou.com)',
      theme: "dark",
    },
  ];

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <Section>
        <Container>
          <div className="mx-auto max-w-6xl space-y-8 py-12">
            <div className="space-y-4 text-center">
              <Badge className="mb-4">Attribution</Badge>
              <h1 className="text-4xl font-bold">Attribution Badges</h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Show your support and get dofollow backlinks by displaying Hi Cyou badges on your website
              </p>
            </div>

            {/* Requirements */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-primary" />
                  Badge Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h3 className="font-semibold">For Open Source Projects:</h3>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>
                      <strong>Required:</strong> If you use Hi Cyou's source code to build your own directory,
                      you <strong>must</strong> display the "Powered by Hi Cyou" badge
                    </li>
                    <li>The badge must be visible on your website (typically in the footer or about page)</li>
                    <li>The badge must link back to https://hicyou.com</li>
                    <li>Do not remove, modify, or obscure the badge</li>
                    <li>Commercial use is allowed with proper attribution</li>
                  </ul>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <h3 className="font-semibold">For Submitted Websites:</h3>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>
                      <strong>Optional but Recommended:</strong> Display the "Featured on Hi Cyou" badge to get
                      a <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">dofollow</Badge> backlink
                    </li>
                    <li>Websites with the badge receive higher priority in listings</li>
                    <li>Your link will automatically change from nofollow to dofollow when badge is verified</li>
                    <li>The badge helps drive referral traffic to your site</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Benefits */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Dofollow Backlinks</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Get valuable SEO juice with dofollow backlinks that help improve your search rankings
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Free Promotion</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    List your SaaS or product on Hi Cyou completely free - no hidden costs or subscription fees
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Support Open Source</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Help support an open source project and contribute to the developer community
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Badge Selection */}
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Choose Your Badge</h2>
                <p className="text-muted-foreground">
                  Select the badge that best matches your website's design
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {badges.map((badge) => (
                  <Card key={badge.id} className="overflow-hidden">
                    <CardHeader>
                      <CardTitle className="text-lg">{badge.name}</CardTitle>
                      <CardDescription>
                        Best for {badge.theme} themed websites
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Badge Preview */}
                      <div className={`p-8 rounded-lg flex items-center justify-center ${badge.theme === "dark" ? "bg-gray-900" : "bg-gray-50"
                        }`}>
                        <img
                          src={badge.image}
                          alt={badge.name}
                          className="h-12"
                        />
                      </div>

                      {/* HTML Code */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">HTML</label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(badge.html, `${badge.id}-html`)}
                          >
                            {copiedId === `${badge.id}-html` ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <code className="block p-3 bg-muted rounded text-xs overflow-x-auto">
                          {badge.html}
                        </code>
                      </div>

                      {/* Markdown Code */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">Markdown</label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(badge.markdown, `${badge.id}-md`)}
                          >
                            {copiedId === `${badge.id}-md` ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <code className="block p-3 bg-muted rounded text-xs overflow-x-auto">
                          {badge.markdown}
                        </code>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Implementation Guide */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Implementation Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h3 className="font-semibold">For Website Owners:</h3>
                  <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
                    <li>Choose a badge that matches your website theme</li>
                    <li>Copy the HTML or Markdown code</li>
                    <li>Paste it in your website footer or about page</li>
                    <li>Our system will automatically verify the badge within 24 hours</li>
                    <li>Once verified, your link will be upgraded to dofollow</li>
                  </ol>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <h3 className="font-semibold">For Open Source Developers:</h3>
                  <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
                    <li>If you're using Hi Cyou source code, attribution is mandatory</li>
                    <li>Add the "Powered by Hi Cyou" badge to your website</li>
                    <li>Place it in a visible location (footer recommended)</li>
                    <li>Ensure the badge links to https://hicyou.com</li>
                    <li>You may use the code for commercial purposes with attribution</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            {/* FAQ */}
            <Card>
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">Do I have to display the badge?</h3>
                  <p className="text-muted-foreground">
                    If you're using Hi Cyou's source code: <strong>Yes, it's required.</strong> If you've just
                    submitted your website: No, but displaying the badge gets you a dofollow backlink.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Can I customize the badge?</h3>
                  <p className="text-muted-foreground">
                    You can choose between light and dark themes, but please don't modify the badge design.
                    The badge must remain recognizable and link to Hi Cyou.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">How long does verification take?</h3>
                  <p className="text-muted-foreground">
                    Our automated system checks for badges every 24 hours. Once verified, your link status
                    will be updated automatically.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">What if I remove the badge?</h3>
                  <p className="text-muted-foreground">
                    For open source users: This violates the terms of service. For submitted websites:
                    Your link will be changed back to nofollow.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>
    </div>
  );
}


import { Section, Container } from "@/components/craft";
import { TopNav } from "@/components/top-nav";
import { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ExternalLink, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "HiCyou Attribution License (HAL) 1.0 | Hi Cyou",
  description: "HiCyou Attribution & Badge License - Open source license with attribution requirements for commercial and non-commercial use.",
};

// Obfuscated link component for SEO-friendly but code-hidden links
function ObfuscatedLink({ children, className }: { children: React.ReactNode; className?: string }) {
  // Encoded URL parts - searching for "hicyou.com" in code won't find this
  const p1 = "aHR0cHM6Ly9oaWN5b3UuY29t"; // Base64 encoded

  if (typeof window === 'undefined') {
    // Server-side: render proper link for SEO
    return (
      <a
        href="https://hicyou.com"
        target="_blank"
        rel="dofollow"
        className={className}
      >
        {children}
      </a>
    );
  }

  // Client-side: decode and render
  const url = atob(p1);
  return (
    <a
      href={url}
      target="_blank"
      rel="dofollow"
      className={className}
    >
      {children}
    </a>
  );
}

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <Section>
        <Container>
          <div className="mx-auto max-w-4xl space-y-8 py-12">
            {/* Header */}
            <div className="space-y-4 text-center">
              <div className="flex justify-center mb-4">
                <Badge className="gap-2">
                  <Shield className="h-3 w-3" />
                  License
                </Badge>
              </div>
              <h1 className="text-4xl font-bold">HiCyou Attribution License (HAL) 1.0</h1>
              <p className="text-xl text-muted-foreground">
                HiCyou Attribution & Badge License
              </p>
              <p className="text-sm text-muted-foreground">
                Copyright © 2025 <ObfuscatedLink className="underline hover:text-primary">HiCyou</ObfuscatedLink>
              </p>
            </div>

            {/* Introduction */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <p className="text-lg">
                  Permission is hereby granted to any individual or organization ("Licensee") to use, modify,
                  and distribute this Software, including for commercial purposes, subject to the following conditions.
                </p>
              </CardContent>
            </Card>

            <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
              {/* 1. Attribution Requirement */}
              <section className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shrink-0">
                    1
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
                      Attribution Requirement
                      <span className="text-lg font-normal text-muted-foreground">归因要求</span>
                    </h2>
                  </div>
                </div>

                <Card>
                  <CardContent className="pt-6">
                    <p className="text-lg mb-4">
                      Any public use of this Software, including modified or unmodified versions, <strong>MUST</strong> display
                      the official:
                    </p>
                    <div className="text-center py-4 bg-muted rounded-lg">
                      <p className="text-xl font-bold text-primary">
                        "Powered by <ObfuscatedLink className="hover:underline">HiCyou</ObfuscatedLink>" badge
                      </p>
                    </div>
                    <p className="text-lg mt-4">
                      on <strong>every publicly accessible page</strong> of the deployed application, service,
                      or website that incorporates this Software.
                    </p>
                  </CardContent>
                </Card>
              </section>

              {/* 2. Dofollow Link Requirement */}
              <section className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shrink-0">
                    2
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
                      Dofollow Link Requirement
                      <span className="text-lg font-normal text-muted-foreground">必须为 Dofollow 链接</span>
                    </h2>
                  </div>
                </div>

                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <p className="text-lg">
                      The badge must contain an HTML hyperlink directing to:
                    </p>
                    <code className="block p-4 bg-muted rounded-lg text-center font-mono">
                      https://hicyou.com/
                    </code>
                    <div className="border-l-4 border-destructive pl-4 bg-destructive/5 p-4 rounded">
                      <p className="font-semibold mb-2">This link MUST be dofollow. The following are PROHIBITED:</p>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2">
                          <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                          <code className="text-sm">rel="nofollow"</code>
                        </li>
                        <li className="flex items-start gap-2">
                          <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                          <code className="text-sm">rel="noopener"</code>
                        </li>
                        <li className="flex items-start gap-2">
                          <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                          <code className="text-sm">rel="noreferrer"</code>
                        </li>
                        <li className="flex items-start gap-2">
                          <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                          <span className="text-sm">JavaScript redirects</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                          <span className="text-sm">Any method designed to avoid link equity passing</span>
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* 3. Official Badge Usage */}
              <section className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shrink-0">
                    3
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
                      Official Badge Usage
                      <span className="text-lg font-normal text-muted-foreground">徽章使用规范</span>
                    </h2>
                  </div>
                </div>

                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <p className="text-lg">
                      The Licensee must use one of the official badges provided by <ObfuscatedLink className="font-semibold hover:underline">HiCyou</ObfuscatedLink>:
                    </p>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <p className="font-semibold mb-2">Light Mode Badge:</p>
                        <code className="text-sm block bg-muted p-2 rounded break-all">
                          https://hicyou.com/badges/light.svg
                        </code>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="font-semibold mb-2">Dark Mode Badge:</p>
                        <code className="text-sm block bg-muted p-2 rounded break-all">
                          https://hicyou.com/badges/dark.svg
                        </code>
                      </div>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-sm">
                          The badge may be resized proportionally, but <strong>modifying, replacing, removing,
                            or restyling</strong> the badge (beyond size) is prohibited.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* 4. License Notice Requirement */}
              <section className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shrink-0">
                    4
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
                      License Notice Requirement
                      <span className="text-lg font-normal text-muted-foreground">授权声明要求</span>
                    </h2>
                  </div>
                </div>

                <Card>
                  <CardContent className="pt-6">
                    <p className="text-lg mb-4">
                      This License must be included in any redistributed version of the Software.
                    </p>
                    <p className="text-lg">
                      If this Software incorporates upstream open-source components (including MIT-licensed code),
                      the original notices <strong>must be preserved</strong>.
                    </p>
                  </CardContent>
                </Card>
              </section>

              {/* 5. Relicensing Restriction */}
              <section className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shrink-0">
                    5
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
                      Relicensing Restriction
                      <span className="text-lg font-normal text-muted-foreground">禁止重新授权</span>
                    </h2>
                  </div>
                </div>

                <Card>
                  <CardContent className="pt-6">
                    <p className="text-lg">
                      Licensee may not relicense the Software under MIT or any OSI-approved open-source license
                      because this License introduces additional obligations.
                    </p>
                  </CardContent>
                </Card>
              </section>

              {/* 6. Prohibited Uses */}
              <section className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-destructive-foreground font-bold shrink-0">
                    6
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
                      Prohibited Uses
                      <span className="text-lg font-normal text-muted-foreground">禁止的行为</span>
                    </h2>
                  </div>
                </div>

                <Card className="border-destructive/50">
                  <CardContent className="pt-6">
                    <p className="text-lg mb-4 font-semibold">Licensee may NOT:</p>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-2">
                        <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                        <span>Remove or hide the required attribution badge</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                        <span>Modify the badge to break dofollow requirements</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                        <span>Claim the Software is MIT-licensed or open source</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                        <span>Circumvent the attribution requirement in any technical way</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </section>

              {/* 7. Termination */}
              <section className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-destructive-foreground font-bold shrink-0">
                    7
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
                      Termination
                      <span className="text-lg font-normal text-muted-foreground">终止条款</span>
                    </h2>
                  </div>
                </div>

                <Card className="border-destructive/50">
                  <CardContent className="pt-6 space-y-4">
                    <p className="text-lg">
                      Failure to comply with any condition of this License results in <strong className="text-destructive">automatic
                        and immediate termination</strong> of rights granted herein.
                    </p>
                    <p className="text-lg">Upon termination, Licensee must:</p>
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      <p className="font-semibold">Remove the Software from all production systems</p>
                      <p className="text-center text-muted-foreground">OR</p>
                      <p className="font-semibold">Bring the deployment back into compliance with this License</p>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* 8. Disclaimer of Warranty */}
              <section className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground font-bold shrink-0">
                    8
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
                      Disclaimer of Warranty
                      <span className="text-lg font-normal text-muted-foreground">免责声明</span>
                    </h2>
                  </div>
                </div>

                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <p className="text-sm uppercase tracking-wider">
                      THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.
                      <ObfuscatedLink className="font-semibold hover:underline ml-1">HI CYOU</ObfuscatedLink> SHALL
                      NOT BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY ARISING FROM THE USE OF THIS SOFTWARE.
                    </p>
                  </CardContent>
                </Card>
              </section>

              {/* Summary */}
              <section className="space-y-4 pt-8 border-t">
                <h2 className="text-2xl font-semibold text-center">License Summary</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        You CAN:
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                          <span>Use commercially</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                          <span>Modify the code</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                          <span>Distribute</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                          <span>Use privately</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="border-destructive/50 bg-red-50 dark:bg-red-950/20">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-destructive" />
                        You MUST:
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <Shield className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                          <span>Display "Powered by <ObfuscatedLink className="font-semibold hover:underline">HiCyou</ObfuscatedLink>" badge</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Shield className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                          <span>Use dofollow link</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Shield className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                          <span>Include license notice</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Shield className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                          <span>Preserve copyright</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </section>

              {/* Contact */}
              <section className="text-center pt-8 border-t">
                <p className="text-muted-foreground">
                  For questions about this license, please visit{" "}
                  <ObfuscatedLink className="underline hover:text-primary font-semibold">
                    HiCyou.com
                  </ObfuscatedLink>
                </p>
              </section>
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
}






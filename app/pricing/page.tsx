import { Section, Container } from "@/components/craft";
import { TopNav } from "@/components/top-nav";
import { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Star, Github, Zap, Heart } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing | Our Directory - 100% Free",
  description: "Our platform is completely free for SaaS founders and developers. Submit your product and get dofollow backlinks at no cost.",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <Section>
        <Container>
          <div className="mx-auto max-w-6xl space-y-16 py-12">
            {/* Hero Section */}
            <div className="text-center space-y-6">
              <Badge className="mb-4">Pricing</Badge>
              <h1 className="text-5xl font-bold tracking-tight">
                Simple, Transparent Pricing
              </h1>
              <p className="text-2xl text-muted-foreground max-w-3xl mx-auto">
                Actually, it's not just transparent - it's <span className="text-primary font-bold">completely free</span>
              </p>
            </div>

            {/* Free Badge */}
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-4 rounded-full text-2xl font-bold shadow-lg">
                <Heart className="h-8 w-8" />
                100% FREE FOREVER
              </div>
            </div>

            {/* Main Pricing Cards */}
            <div className="max-w-xl mx-auto">
              {/* For Product Owners */}
              <Card className="border-2 border-primary/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-sm font-semibold">
                  Most Popular
                </div>
                <CardHeader className="text-center pb-8 pt-8">
                  <Star className="h-12 w-12 text-primary mx-auto mb-4" />
                  <CardTitle className="text-3xl">Free Submission</CardTitle>
                  <CardDescription className="text-lg mt-2">
                    Submit your SaaS and get discovered
                  </CardDescription>
                  <div className="mt-6">
                    <div className="text-5xl font-bold">$0</div>
                    <div className="text-muted-foreground mt-2">Forever Free</div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">Free Product Listing</div>
                        <div className="text-sm text-muted-foreground">
                          Submit your product at no cost - no credit card required
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">Dofollow Backlinks</div>
                        <div className="text-sm text-muted-foreground">
                          Get valuable SEO juice - just add our badge to your site
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">Featured Placement</div>
                        <div className="text-sm text-muted-foreground">
                          Badge holders get priority in search results
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">Instant Approval</div>
                        <div className="text-sm text-muted-foreground">
                          Get listed within 24 hours of submission
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">Traffic Analytics</div>
                        <div className="text-sm text-muted-foreground">
                          Track clicks and engagement from our platform
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">Category Placement</div>
                        <div className="text-sm text-muted-foreground">
                          Choose the perfect category for your product
                        </div>
                      </div>
                    </div>
                  </div>

                  <Link href="/submit" className="block">
                    <Button size="lg" className="w-full gap-2">
                      <Zap className="h-5 w-5" />
                      Submit Your Product Now
                    </Button>
                  </Link>

                  <div className="text-center text-sm text-muted-foreground">
                    No catch. No hidden fees. Just free promotion.
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Badge Requirement */}
            <Card className="border-primary/20 bg-primary/5 max-w-4xl mx-auto">
              <CardHeader>
                <CardTitle className="text-2xl text-center">How to Get Dofollow Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center text-lg text-muted-foreground">
                  It's simple - just display our badge on your website!
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center space-y-3">
                    <div className="bg-primary/10 rounded-full h-16 w-16 flex items-center justify-center mx-auto">
                      <span className="text-2xl font-bold text-primary">1</span>
                    </div>
                    <h3 className="font-semibold">Submit Your Product</h3>
                    <p className="text-sm text-muted-foreground">
                      Fill out the submission form with your product details
                    </p>
                  </div>

                  <div className="text-center space-y-3">
                    <div className="bg-primary/10 rounded-full h-16 w-16 flex items-center justify-center mx-auto">
                      <span className="text-2xl font-bold text-primary">2</span>
                    </div>
                    <h3 className="font-semibold">Add Our Badge</h3>
                    <p className="text-sm text-muted-foreground">
                      Copy and paste the badge code to your website footer
                    </p>
                  </div>

                  <div className="text-center space-y-3">
                    <div className="bg-primary/10 rounded-full h-16 w-16 flex items-center justify-center mx-auto">
                      <span className="text-2xl font-bold text-primary">3</span>
                    </div>
                    <h3 className="font-semibold">Get Dofollow Link</h3>
                    <p className="text-sm text-muted-foreground">
                      Your link automatically upgrades to dofollow within 24h
                    </p>
                  </div>
                </div>

                <div className="text-center pt-4">
                  <Link href="/legal/badges">
                    <Button size="lg" className="gap-2">
                      View Badge Options
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* FAQ */}
            <Card className="max-w-4xl mx-auto">
              <CardHeader>
                <CardTitle className="text-2xl text-center">Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <h3 className="font-semibold">Is it really free forever?</h3>
                  <p className="text-muted-foreground">
                    Yes! Our platform will always be free for product submissions. We may introduce optional premium
                    features in the future (like enhanced placement), but the core service will remain free.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold">Do I have to add the badge?</h3>
                  <p className="text-muted-foreground">
                    The badge is optional for submitted products, but it's the only way to get a dofollow backlink.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold">What if I remove the badge later?</h3>
                  <p className="text-muted-foreground">
                    For submitted products: Your link will revert to nofollow. We verify badges regularly.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* CTA */}
            <div className="text-center space-y-6 py-12">
              <h2 className="text-3xl font-bold">Ready to Get Started?</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Join hundreds of SaaS products getting discovered on our platform
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link href="/submit">
                  <Button size="lg" className="gap-2">
                    Submit Your Product Free
                  </Button>
                </Link>
                <Link href="/about">
                  <Button size="lg" variant="outline" className="gap-2">
                    Learn More About Us
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


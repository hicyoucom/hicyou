import { Section, Container } from "@/components/craft";
import { TopNav } from "@/components/top-nav";
import { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, Zap, Heart, Users, Search, MessageSquare } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us | Premium Tool Directory",
  description: "A premium tool directory connecting developers and users. Discover the best software and services.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <Section>
        <Container>
          <div className="mx-auto max-w-5xl space-y-16 py-12">
            {/* Hero Section */}
            <div className="text-center space-y-6">
              <Badge className="mb-4">About Us</Badge>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Connecting Developers & Users
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                A premium tool directory dedicated to helping you discover the best software and services.
              </p>
            </div>

            {/* Mission Statement */}
            <div className="prose prose-lg dark:prose-invert mx-auto text-center max-w-3xl">
              <p>
                We are dedicated to building a high-quality tool directory. In an era of information overload,
                discovering truly useful tools has become increasingly difficult. Through manual curation and
                community recommendations, we aim to present the best software and services to everyone.
              </p>
              <p>
                At the same time, we provide a platform for independent developers and startup teams to
                showcase their products, helping excellent projects reach a wider audience.
              </p>
            </div>

            {/* Core Values */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* For Users */}
              <div className="space-y-6">
                <div className="text-center md:text-left">
                  <h2 className="text-2xl font-bold mb-2">For Users</h2>
                  <p className="text-muted-foreground">Find the best tools for your needs</p>
                </div>
                <div className="grid gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Search className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Discover Gems</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Curated practical tools to meet your work and life needs.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Save Time</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Skip the endless searching and quickly find the best solutions for you.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Real Reviews</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Make smarter choices with authentic community feedback.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* For Developers */}
              <div className="space-y-6">
                <div className="text-center md:text-left">
                  <h2 className="text-2xl font-bold mb-2">For Developers</h2>
                  <p className="text-muted-foreground">Showcase your products to the world</p>
                </div>
                <div className="grid gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Free Promotion</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Submit your project and let more potential users discover your product.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Gain Exposure</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        High-quality projects get featured, driving continuous traffic and attention.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Heart className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Community Feedback</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Gather user insights to continuously refine and improve your product.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="text-center space-y-8 py-8">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold">Join Our Community</h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Whether you're a user looking for tools or a developer building products,
                  we welcome you to join us. Let's build a better tool ecosystem together.
                </p>
              </div>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link href="/submit">
                  <Button size="lg" className="gap-2">
                    Submit Product
                  </Button>
                </Link>
                <Link href="/">
                  <Button size="lg" variant="outline" className="gap-2">
                    Explore Tools
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


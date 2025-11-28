"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Loader2, Link as LinkIcon, Badge as BadgeIcon } from "lucide-react";
import { ImageUpload } from "@/components/admin/image-upload";
import { Checkbox } from "@/components/ui/checkbox";
import { Turnstile } from "@/components/turnstile";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
}

interface SubmitContentProps {
  categories: Category[];
}

// Get Turnstile site key from environment
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

function parseFaqs(text: string) {
  const faqs: { question: string; answer: string }[] = [];
  const lines = text.split('\n');
  let currentQ = "";
  let currentA = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("Q:") || trimmed.startsWith("q:")) {
      if (currentQ && currentA) {
        faqs.push({ question: currentQ, answer: currentA.trim() });
        currentA = "";
      }
      currentQ = trimmed.substring(2).trim();
    } else if (trimmed.startsWith("A:") || trimmed.startsWith("a:")) {
      currentA += trimmed.substring(2).trim() + " ";
    } else if (currentA) {
      currentA += trimmed + " ";
    }
  }
  if (currentQ && currentA) {
    faqs.push({ question: currentQ, answer: currentA.trim() });
  }
  return faqs;
}

export default function SubmitContent({ categories }: SubmitContentProps) {
  const [formData, setFormData] = useState({
    url: "",
    title: "",
    tagline: "",
    description: "",
    whyStartups: "",
    alternatives: "",
    pricingType: "Paid",
    categoryId: "",
    logo: "",
    cover: "",
    hasBadge: false,
    keyFeatures: "",
    useCases: "",
    faqs: "",
  });
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [badgeVerifying, setBadgeVerifying] = useState(false);
  const [badgeVerified, setBadgeVerified] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
    publishAt?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      // Check Turnstile token if enabled
      if (TURNSTILE_SITE_KEY && !turnstileToken) {
        setResult({
          type: "error",
          message: "Please complete the security verification",
        });
        setLoading(false);
        return;
      }

      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          categoryId: formData.categoryId ? parseInt(formData.categoryId) : null,
          turnstileToken,
          // Parse text areas into arrays/JSON
          keyFeatures: (() => {
            if (!formData.keyFeatures) return [];
            try {
              const parsed = JSON.parse(formData.keyFeatures);
              return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
              return formData.keyFeatures.split('\n').filter(line => line.trim());
            }
          })(),
          useCases: (() => {
            if (!formData.useCases) return [];
            try {
              const parsed = JSON.parse(formData.useCases);
              return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
              return formData.useCases.split('\n').filter(line => line.trim());
            }
          })(),
          faqs: (() => {
            if (!formData.faqs) return [];
            try {
              const parsed = JSON.parse(formData.faqs);
              return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
              return parseFaqs(formData.faqs);
            }
          })(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          type: "success",
          message: data.message,
          publishAt: data.publishAt,
        });
        // Reset form
        setFormData({
          url: "",
          title: "",
          tagline: "",
          description: "",
          whyStartups: "",
          alternatives: "",
          pricingType: "Paid",
          categoryId: "",
          logo: "",
          cover: "",
          hasBadge: false,
          keyFeatures: "",
          useCases: "",
          faqs: "",
        });
        setTurnstileToken(null);
      } else {
        setResult({
          type: "error",
          message: data.error || data.message || "Submission failed",
        });
      }
    } catch (error) {
      setResult({
        type: "error",
        message: "Submission failed. Please check your network connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleVerifyBadge = async () => {
    if (!formData.url) {
      toast.error("Please enter your website URL first");
      return;
    }

    setBadgeVerifying(true);
    try {
      const response = await fetch("/api/verify-badge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: formData.url }),
      });

      const data = await response.json();

      if (response.ok && data.verified) {
        setBadgeVerified(true);
        setFormData({ ...formData, hasBadge: true });
        toast.success("Badge verified successfully! You'll get a dofollow link.");
      } else {
        setBadgeVerified(false);
        setFormData({ ...formData, hasBadge: false });
        toast.error(data.message || "Badge not found on your website. You'll get a nofollow link.");
      }
    } catch (error) {
      toast.error("Failed to verify badge. Please try again.");
      setBadgeVerified(false);
      setFormData({ ...formData, hasBadge: false });
    } finally {
      setBadgeVerifying(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Submit Your Website</h1>
        <p className="text-muted-foreground">
          Share quality websites and help more people discover valuable resources
        </p>
      </div>

      {/* Badge Information */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <BadgeIcon className="h-5 w-5" />
            Get Dofollow Link with Our Badge
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 dark:text-blue-200 space-y-4">
          <p className="font-medium">
            Add our badge to your website and verify it to get a <strong>dofollow + ugc</strong> link (better for SEO).
            Without verification, you'll get a <strong>nofollow</strong> link through /go/ redirect.
          </p>

          {/* Badge Previews */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-blue-900 p-4 rounded-md border border-blue-300 dark:border-blue-700">
              <p className="text-sm font-medium mb-2">Light Theme:</p>
              <img src="/badge/featured-light.svg" alt="Light badge" className="mb-2 h-12" />
              <code className="text-xs block break-all">
                &lt;a href="https://qoo.im"&gt;&lt;img src="/badge/featured-light.svg" alt="Featured" /&gt;&lt;/a&gt;
              </code>
            </div>
            <div className="bg-gray-800 p-4 rounded-md border border-blue-700">
              <p className="text-sm font-medium mb-2 text-white">Dark Theme:</p>
              <img src="/badge/featured-dark.svg" alt="Dark badge" className="mb-2 h-12" />
              <code className="text-xs block break-all text-gray-300">
                &lt;a href="https://qoo.im"&gt;&lt;img src="/badge/featured-dark.svg" alt="Featured" /&gt;&lt;/a&gt;
              </code>
            </div>
          </div>

          <div className="space-y-1 text-sm">
            <p>✅ <strong>With verified badge</strong>: <strong className="text-green-600 dark:text-green-400">Dofollow + UGC link</strong> (better for SEO)</p>
            <p>❌ <strong>Without badge</strong>: <strong className="text-gray-600 dark:text-gray-400">Nofollow link</strong> via /go/ redirect</p>
            <p>📍 Badge can be placed anywhere on your website (footer recommended)</p>
            <p>⏱️ All submissions require manual review</p>
          </div>
        </CardContent>
      </Card>

      {/* Security Verification */}
      {TURNSTILE_SITE_KEY && (
        <Card>
          <CardHeader>
            <CardTitle>Security Verification</CardTitle>
            <CardDescription>
              Complete this verification to enable form submission
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Turnstile
              siteKey={TURNSTILE_SITE_KEY}
              onVerify={(token) => setTurnstileToken(token)}
              onError={() => {
                setTurnstileToken(null);
                toast.error("Security verification failed. Please try again.");
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Submission Form */}
      <Card>
        <CardHeader>
          <CardTitle>Website Information</CardTitle>
          <CardDescription>
            All fields are required
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="url">
                Website URL <span className="text-red-500">*</span>
              </Label>
              <Input
                id="url"
                name="url"
                type="url"
                placeholder="https://example.com"
                value={formData.url}
                onChange={handleChange}
                disabled={false}
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter your website URL to verify badge (if applicable)
              </p>
            </div>

            {/* Badge Verification Button */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Badge Verification</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Verify your badge to get a <strong>dofollow</strong> link
                  </p>
                </div>
                <Button
                  type="button"
                  variant={badgeVerified ? "default" : "outline"}
                  onClick={handleVerifyBadge}
                  disabled={!formData.url || badgeVerifying}
                  className={badgeVerified ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {badgeVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : badgeVerified ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Verified (Dofollow)
                    </>
                  ) : (
                    "Verify Badge"
                  )}
                </Button>
              </div>
              {badgeVerified && (
                <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    ✓ Badge verified! Your link will be <strong>dofollow + ugc</strong>
                  </AlertDescription>
                </Alert>
              )}
              {formData.url && !badgeVerified && !badgeVerifying && (
                <p className="text-xs text-muted-foreground">
                  💡 Without verification, your link will be <strong>nofollow</strong>. Add the badge to your website and click "Verify Badge" to get a dofollow link.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">
                Website Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                name="title"
                placeholder="Your Website Name"
                value={formData.title}
                onChange={handleChange}
                disabled={false}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">
                Tagline <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="tagline"
                name="tagline"
                placeholder="Short intro for list view (max 2 lines)"
                value={formData.tagline}
                onChange={handleChange}
                disabled={false}
                rows={2}
                maxLength={120}
                required
              />
              <p className="text-xs text-muted-foreground">
                Brief description shown in the listing (120 characters max)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Detailed description for detail page"
                value={formData.description}
                onChange={handleChange}
                disabled={false}
                rows={6}
                required
              />
              <p className="text-xs text-muted-foreground">
                Detailed description shown on the detail page
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whyStartups">
                Why do startups need this tool?
              </Label>
              <Textarea
                id="whyStartups"
                name="whyStartups"
                placeholder="Explain why this tool is valuable for startups..."
                value={formData.whyStartups}
                onChange={handleChange}
                disabled={false}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Optional: Explain the value of your tool for startups
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alternatives">
                Alternatives
              </Label>
              <Input
                id="alternatives"
                name="alternatives"
                placeholder="Tool1, Tool2, Tool3"
                value={formData.alternatives}
                onChange={handleChange}
                disabled={false}
              />
              <p className="text-xs text-muted-foreground">
                Optional: Comma-separated list of alternative tools (e.g., Notion, Trello, Asana)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keyFeatures">
                Key Features
              </Label>
              <Textarea
                id="keyFeatures"
                name="keyFeatures"
                placeholder='["Feature 1", "Feature 2"]'
                value={formData.keyFeatures}
                onChange={handleChange}
                disabled={false}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Optional: JSON format ["Feature 1", "Feature 2"] or one feature per line
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="useCases">
                Use Cases
              </Label>
              <Textarea
                id="useCases"
                name="useCases"
                placeholder='["Use Case 1", "Use Case 2"]'
                value={formData.useCases}
                onChange={handleChange}
                disabled={false}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Optional: JSON format ["Use Case 1", "Use Case 2"] or one use case per line
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="faqs">
                FAQs
              </Label>
              <Textarea
                id="faqs"
                name="faqs"
                placeholder='[{"question": "Q1", "answer": "A1"}]'
                value={formData.faqs}
                onChange={handleChange}
                disabled={false}
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Optional: JSON format or "Q: Question? A: Answer."
              </p>
            </div>

            <div className="space-y-2">
              <Label>
                Pricing Type <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-3 gap-3">
                {['Free', 'Freemium', 'Paid'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, pricingType: type })
                    }
                    disabled={false}
                    className={`px-4 py-3 rounded-lg border-2 transition-all font-medium ${formData.pricingType === type
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-background hover:bg-accent hover:text-accent-foreground'
                      }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <input type="hidden" name="pricingType" value={formData.pricingType} />
              <p className="text-xs text-muted-foreground">
                Required: Select the pricing model for your tool
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryId">
                Category <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) =>
                  setFormData({ ...formData, categoryId: value })
                }
                disabled={false}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ImageUpload
              type="logo"
              label="Logo Image"
              value={formData.logo}
              onChange={(url) =>
                setFormData({ ...formData, logo: url })
              }
              placeholder="Upload logo image (webp, png, jpg, or avif)"
              description={
                TURNSTILE_SITE_KEY && !turnstileToken
                  ? "⚠️ Complete security verification above to upload images"
                  : "Logo displayed in cards and detail page header (required, max 1MB)"
              }
              disabled={!!(TURNSTILE_SITE_KEY && !turnstileToken)}
            />

            <ImageUpload
              type="cover"
              label="Cover Image"
              value={formData.cover}
              onChange={(url) =>
                setFormData({ ...formData, cover: url })
              }
              placeholder="Upload cover image (webp, png, jpg, or avif)"
              description={
                TURNSTILE_SITE_KEY && !turnstileToken
                  ? "⚠️ Complete security verification above to upload images"
                  : "Large preview image for detail page and social sharing (required, max 1MB)"
              }
              disabled={!!(TURNSTILE_SITE_KEY && !turnstileToken)}
            />

            {result && (
              <Alert
                variant={result.type === "success" ? "default" : "destructive"}
              >
                {result.type === "success" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {result.message}
                  {result.publishAt && (
                    <div className="mt-2 text-sm">
                      Expected publish time:{" "}
                      {new Date(result.publishAt).toLocaleString("en-US")}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading || !!(TURNSTILE_SITE_KEY && !turnstileToken)}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Website"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium mb-1">Q: What happens after I submit?</h4>
            <p className="text-muted-foreground">
              A: Your submission will be manually reviewed by our team. If approved, your website will be published to the directory.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-1">Q: What's the difference between with and without badge?</h4>
            <p className="text-muted-foreground">
              A: With badge, you get a dofollow + ugc link (better for SEO). Without badge, your link goes through a /go/ redirect with nofollow attribute.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-1">Q: How long does review take?</h4>
            <p className="text-muted-foreground">
              A: Usually within 1-3 business days. Badge submissions require verification which may take slightly longer.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-1">Q: Can I remove the badge after approval?</h4>
            <p className="text-muted-foreground">
              A: We recommend keeping the badge. If removed, your link may be changed to nofollow in future reviews.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


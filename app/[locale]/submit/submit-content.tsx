"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CategorySelector,
} from "@/components/category-selector";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Badge as BadgeIcon,
} from "lucide-react";
import { ImageUpload } from "@/components/admin/image-upload";
import { Turnstile } from "@/components/turnstile";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { UrlFirstStep } from "./url-first-step";
import {
  createSubmissionPrefill,
  MAX_SUBMISSION_DESCRIPTION_LENGTH,
  MAX_SUBMISSION_TAGLINE_LENGTH,
  MAX_SUBMISSION_TITLE_LENGTH,
  shouldReplacePrefilledValue,
  type SubmissionMetadata,
} from "@/lib/submission-prefill";

interface Category {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
  groupKey?: string;
}

interface SubmitContentProps {
  categories: Category[];
}

type SubmissionFormData = {
  url: string;
  title: string;
  tagline: string;
  description: string;
  whyStartups: string;
  alternatives: string;
  categoryId: string;
  categoryIds: string[];
  logo: string;
  cover: string;
  hasBadge: boolean;
  keyFeatures: string;
  useCases: string;
  faqs: string;
};

type AutofilledSubmissionFields = Partial<
  Pick<SubmissionFormData, "title" | "tagline" | "description">
>;

// Get Turnstile site key from environment
const TURNSTILE_SITE_KEY =
  process.env.NODE_ENV === "development"
    ? "1x00000000000000000000AA"
    : process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

function createEmptySubmissionFormData(): SubmissionFormData {
  return {
    url: "",
    title: "",
    tagline: "",
    description: "",
    whyStartups: "",
    alternatives: "",
    categoryId: "",
    categoryIds: [],
    logo: "",
    cover: "",
    hasBadge: false,
    keyFeatures: "",
    useCases: "",
    faqs: "",
  };
}

function parseFaqs(text: string) {
  const faqs: { question: string; answer: string }[] = [];
  const lines = text.split("\n");
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
  const t = useTranslations("submit");
  const [formData, setFormData] = useState(createEmptySubmissionFormData);
  const [checkedUrl, setCheckedUrl] = useState<string | null>(null);
  const autofilledFields = useRef<AutofilledSubmissionFields>({});
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileNonce, setTurnstileNonce] = useState(0);
  const [badgeVerifying, setBadgeVerifying] = useState(false);
  const [badgeVerified, setBadgeVerified] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
    publishAt?: string;
  } | null>(null);

  const clearTurnstile = () => {
    setTurnstileToken(null);
  };

  const resetTurnstileWidget = () => {
    setTurnstileToken(null);
    setTurnstileNonce((nonce) => nonce + 1);
  };

  const handleUrlChange = (url: string) => {
    setFormData((current) => ({
      ...current,
      url,
      hasBadge: false,
    }));
    setCheckedUrl(null);
    setBadgeVerified(false);
    setResult(null);
  };

  const handleMetadataReady = (metadata: SubmissionMetadata) => {
    const prefill = createSubmissionPrefill(metadata);
    const currentAutofill = autofilledFields.current;
    const nextAutofill: AutofilledSubmissionFields = {};

    const next: SubmissionFormData = {
      ...formData,
      url: prefill.url,
      hasBadge: false,
    };

    for (const field of ["title", "tagline", "description"] as const) {
      if (
        prefill[field] &&
        shouldReplacePrefilledValue(formData[field], currentAutofill[field])
      ) {
        next[field] = prefill[field];
        nextAutofill[field] = prefill[field];
      } else if (
        currentAutofill[field] !== undefined &&
        formData[field] === currentAutofill[field]
      ) {
        nextAutofill[field] = currentAutofill[field];
      }
    }

    setFormData(next);
    autofilledFields.current = nextAutofill;
    setCheckedUrl(prefill.url);
    setBadgeVerified(false);
    setResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (checkedUrl !== formData.url) {
      setResult({
        type: "error",
        message: t("urlCheckRequired"),
      });
      return;
    }

    setLoading(true);
    setResult(null);
    let submissionRequested = false;

    try {
      // Check Turnstile token if enabled
      if (TURNSTILE_SITE_KEY && !turnstileToken) {
        setResult({
          type: "error",
          message: t("securityVerificationFailed"),
        });
        setLoading(false);
        return;
      }

      submissionRequested = true;
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          categoryId: formData.categoryId
            ? parseInt(formData.categoryId)
            : null,
          categoryIds: formData.categoryIds.map((id) => parseInt(id, 10)),
          turnstileToken,
          // Parse text areas into arrays/JSON
          keyFeatures: (() => {
            if (!formData.keyFeatures) return [];
            try {
              const parsed = JSON.parse(formData.keyFeatures);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return formData.keyFeatures
                .split("\n")
                .filter((line) => line.trim());
            }
          })(),
          useCases: (() => {
            if (!formData.useCases) return [];
            try {
              const parsed = JSON.parse(formData.useCases);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return formData.useCases
                .split("\n")
                .filter((line) => line.trim());
            }
          })(),
          faqs: (() => {
            if (!formData.faqs) return [];
            try {
              const parsed = JSON.parse(formData.faqs);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
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
        // Reset back to the URL-first step after a successful submission.
        setFormData(createEmptySubmissionFormData());
        autofilledFields.current = {};
        setCheckedUrl(null);
        setBadgeVerified(false);
      } else {
        setResult({
          type: "error",
          message: data.error || data.message || t("errorDefault"),
        });
      }
    } catch {
      setResult({
        type: "error",
        message: t("errorDefault"),
      });
    } finally {
      if (submissionRequested && TURNSTILE_SITE_KEY) {
        resetTurnstileWidget();
      }
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const field = e.target.name as Exclude<
      keyof SubmissionFormData,
      "hasBadge"
    >;
    setFormData((current) => ({
      ...current,
      [field]: e.target.value,
    }));
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
        setFormData((current) => ({ ...current, hasBadge: true }));
        toast.success(
          "Badge verified successfully! Your submission is eligible for a Dofollow link once it is published.",
        );
      } else {
        setBadgeVerified(false);
        setFormData((current) => ({ ...current, hasBadge: false }));
        toast.error(
          data.message ||
            "Badge not found on your website. You'll get a nofollow link.",
        );
      }
    } catch {
      toast.error("Failed to verify badge. Please try again.");
      setBadgeVerified(false);
      setFormData((current) => ({ ...current, hasBadge: false }));
    } finally {
      setBadgeVerifying(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-2 text-4xl font-bold">{t("heading")}</h1>
        <p className="text-muted-foreground">{t("subheading")}</p>
      </div>

      <UrlFirstStep
        checkedUrl={checkedUrl}
        onMetadataReady={handleMetadataReady}
        onUrlChange={handleUrlChange}
        url={formData.url}
      />

      {result && (
        <Alert variant={result.type === "success" ? "default" : "destructive"}>
          {result.type === "success" ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertDescription>
            {result.message}
            {result.publishAt && (
              <div className="mt-2 text-sm">
                {t("publishAt")} {new Date(result.publishAt).toLocaleString()}
              </div>
            )}
            {result.type === "success" ? (
              <Button asChild className="mt-3" size="sm" variant="outline">
                <Link href="/submit/status">{t("viewStatusCenter")}</Link>
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      )}

      {checkedUrl === formData.url && (
        <>
          {/* Badge Information */}
          <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                <BadgeIcon className="h-5 w-5" />
                {t("badgeCardTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-blue-800 dark:text-blue-200">
              <p className="font-medium">{t("badgeCardDesc")}</p>

              {/* Badge Previews */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-md border border-blue-300 bg-white p-4 dark:border-blue-700 dark:bg-blue-900">
                  <p className="mb-2 text-sm font-medium">{t("lightTheme")}</p>
                  <Image
                    src="/badge/featured-light.svg"
                    alt="Light badge"
                    width={180}
                    height={48}
                    className="mb-2 h-12"
                  />
                  <code className="block break-all text-xs">
                    &lt;a href="https://hicyou.com"&gt;&lt;img
                    src="https://hicyou.com/badge/featured-light.svg"
                    alt="Featured" /&gt;&lt;/a&gt;
                  </code>
                </div>
                <div className="rounded-md border border-blue-700 bg-gray-800 p-4">
                  <p className="mb-2 text-sm font-medium text-white">
                    {t("darkTheme")}
                  </p>
                  <Image
                    src="/badge/featured-dark.svg"
                    alt="Dark badge"
                    width={180}
                    height={48}
                    className="mb-2 h-12"
                  />
                  <code className="block break-all text-xs text-gray-300">
                    &lt;a href="https://hicyou.com"&gt;&lt;img
                    src="https://hicyou.com/badge/featured-dark.svg"
                    alt="Featured" /&gt;&lt;/a&gt;
                  </code>
                </div>
              </div>

              <div className="space-y-1 text-sm">
                <p>✅ {t("withBadge")}</p>
                <p>❌ {t("withoutBadge")}</p>
                <p>📍 {t("badgePlacement")}</p>
                <p>⏱️ {t("reviewRequired")}</p>
              </div>
            </CardContent>
          </Card>

          {/* Security Verification */}
          {TURNSTILE_SITE_KEY && (
            <Card>
              <CardHeader>
                <CardTitle>{t("securityTitle")}</CardTitle>
                <CardDescription>{t("securityDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Turnstile
                  key={turnstileNonce}
                  siteKey={TURNSTILE_SITE_KEY}
                  onVerify={(token) => setTurnstileToken(token)}
                  onError={() => {
                    clearTurnstile();
                    toast.error(
                      "Security verification failed. Please try again.",
                    );
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* Submission Form */}
          <Card>
            <CardHeader>
              <CardTitle>{t("formTitle")}</CardTitle>
              <CardDescription>{t("formDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-6">
                <AlertDescription>{t("urlFirstImageSafety")}</AlertDescription>
              </Alert>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Badge Verification Button */}
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">
                        {t("badgeVerificationLabel")}
                      </Label>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("badgeVerificationDesc")}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant={badgeVerified ? "default" : "outline"}
                      onClick={handleVerifyBadge}
                      disabled={!formData.url || badgeVerifying}
                      className={
                        badgeVerified ? "bg-green-600 hover:bg-green-700" : ""
                      }
                    >
                      {badgeVerifying ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("verifying")}
                        </>
                      ) : badgeVerified ? (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          {t("verified")}
                        </>
                      ) : (
                        t("verifyBadge")
                      )}
                    </Button>
                  </div>
                  {badgeVerified && (
                    <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800 dark:text-green-200">
                        ✓ {t("badgeVerifiedAlert")}
                      </AlertDescription>
                    </Alert>
                  )}
                  {formData.url && !badgeVerified && !badgeVerifying && (
                    <p className="text-xs text-muted-foreground">
                      💡 {t("noBadgeHint")}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">
                    {t("titleLabel")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="Your Website Name"
                    value={formData.title}
                    onChange={handleChange}
                    maxLength={MAX_SUBMISSION_TITLE_LENGTH}
                    disabled={false}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tagline">
                    {t("taglineLabel")} <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="tagline"
                    name="tagline"
                    placeholder="Short intro for list view (max 2 lines)"
                    value={formData.tagline}
                    onChange={handleChange}
                    disabled={false}
                    rows={2}
                    maxLength={MAX_SUBMISSION_TAGLINE_LENGTH}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("taglineHelper")}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">
                    {t("descriptionLabel")}{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Detailed description for detail page"
                    value={formData.description}
                    onChange={handleChange}
                    maxLength={MAX_SUBMISSION_DESCRIPTION_LENGTH}
                    disabled={false}
                    rows={6}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("descriptionHelper")}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whyStartups">{t("whyStartupsLabel")}</Label>
                  <Textarea
                    id="whyStartups"
                    name="whyStartups"
                    placeholder="Explain why this tool is valuable for startups..."
                    value={formData.whyStartups}
                    onChange={handleChange}
                    maxLength={5000}
                    disabled={false}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("whyStartupsHelper")}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alternatives">{t("alternativesLabel")}</Label>
                  <Input
                    id="alternatives"
                    name="alternatives"
                    placeholder="Tool1, Tool2, Tool3"
                    value={formData.alternatives}
                    onChange={handleChange}
                    maxLength={2000}
                    disabled={false}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("alternativesHelper")}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keyFeatures">{t("keyFeaturesLabel")}</Label>
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
                    {t("keyFeaturesHelper")}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="useCases">{t("useCasesLabel")}</Label>
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
                    {t("useCasesHelper")}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="faqs">{t("faqsLabel")}</Label>
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
                    {t("faqsHelper")}
                  </p>
                </div>

                <CategorySelector
                  categories={categories}
                  value={formData.categoryIds}
                  onChange={(categoryIds) =>
                    setFormData((current) => ({
                      ...current,
                      categoryId: categoryIds[0] ?? "",
                      categoryIds,
                    }))
                  }
                  primaryLabel={t("primaryCategoryLabel")}
                  primaryPlaceholder={t("categoryPlaceholder")}
                  additionalLabel={t("additionalCategoriesLabel")}
                  helperText={t("categorySelectionHelper")}
                />

                <ImageUpload
                  type="logo"
                  label={t("logoLabel")}
                  value={formData.logo}
                  onChange={(url) =>
                    setFormData((current) => ({ ...current, logo: url }))
                  }
                  placeholder="Upload logo image (webp, png, jpg, or gif)"
                  description={
                    TURNSTILE_SITE_KEY && !turnstileToken
                      ? "⚠️ Complete security verification above to upload images"
                      : "Logo displayed in cards and detail page header (required, max 1MB)"
                  }
                  disabled={!!(TURNSTILE_SITE_KEY && !turnstileToken)}
                />

                <ImageUpload
                  type="cover"
                  label={t("coverLabel")}
                  value={formData.cover}
                  onChange={(url) =>
                    setFormData((current) => ({ ...current, cover: url }))
                  }
                  placeholder="Upload cover image (webp, png, jpg, or gif)"
                  description={
                    TURNSTILE_SITE_KEY && !turnstileToken
                      ? "⚠️ Complete security verification above to upload images"
                      : "Large preview image for detail page and social sharing (required, max 1MB)"
                  }
                  disabled={!!(TURNSTILE_SITE_KEY && !turnstileToken)}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    loading || !!(TURNSTILE_SITE_KEY && !turnstileToken)
                  }
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("submitting")}
                    </>
                  ) : (
                    t("submitButton")
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </>
      )}

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>{t("faqTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="mb-1 font-medium">Q: {t("faq1Q")}</h4>
            <p className="text-muted-foreground">A: {t("faq1A")}</p>
          </div>
          <div>
            <h4 className="mb-1 font-medium">Q: {t("faq2Q")}</h4>
            <p className="text-muted-foreground">A: {t("faq2A")}</p>
          </div>
          <div>
            <h4 className="mb-1 font-medium">Q: {t("faq3Q")}</h4>
            <p className="text-muted-foreground">A: {t("faq3A")}</p>
          </div>
          <div>
            <h4 className="mb-1 font-medium">Q: {t("faq4Q")}</h4>
            <p className="text-muted-foreground">A: {t("faq4A")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

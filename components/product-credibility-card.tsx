import {
  CalendarDays,
  FileText,
  Globe2,
  Info,
  ListChecks,
  RefreshCw,
} from "lucide-react";
import type { ProductCredibility } from "@/lib/product-credibility";

type ProductCredibilityLabels = {
  listingDetails: string;
  directoryRecord: string;
  listed: string;
  listedWebsite: string;
  publishedInDirectory: string;
  recordCreated: string;
  recordUpdated: string;
  listingInformation: string;
  overviewIncluded: string;
  keyFeaturesIncluded: string;
  useCasesIncluded: string;
  directoryRecordNotice: string;
  externalSiteNotice: string;
};

type ProductCredibilityCardProps = {
  credibility: ProductCredibility;
  labels: ProductCredibilityLabels;
  locale: string;
  headingId: string;
};

function formatRecordDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

export function ProductCredibilityCard({
  credibility,
  labels,
  locale,
  headingId,
}: ProductCredibilityCardProps) {
  const includedInformation = [
    credibility.hasOverview ? labels.overviewIncluded : null,
    credibility.keyFeatureCount > 0 ? labels.keyFeaturesIncluded : null,
    credibility.useCaseCount > 0 ? labels.useCasesIncluded : null,
  ].filter((item): item is string => item !== null);

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-xl border bg-card p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-muted/60 text-muted-foreground">
            <FileText className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {labels.listingDetails}
            </p>
            <h2 id={headingId} className="mt-1 text-base font-semibold">
              {labels.directoryRecord}
            </h2>
          </div>
        </div>
        <span className="shrink-0 rounded-full border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {labels.listed}
        </span>
      </div>

      <dl className="mt-5 space-y-3 text-sm">
        {credibility.listedDomain ? (
          <div className="flex items-start gap-3">
            <Globe2
              className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">
                {labels.listedWebsite}
              </dt>
              <dd className="mt-0.5 break-all font-medium">
                {credibility.listedDomain}
              </dd>
            </div>
          </div>
        ) : null}

        {credibility.recordDate && credibility.recordDateKind ? (
          <div className="flex items-start gap-3">
            <CalendarDays
              className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <div>
              <dt className="text-xs text-muted-foreground">
                {credibility.recordDateKind === "published"
                  ? labels.publishedInDirectory
                  : labels.recordCreated}
              </dt>
              <dd className="mt-0.5 font-medium">
                {formatRecordDate(credibility.recordDate, locale)}
              </dd>
            </div>
          </div>
        ) : null}

        {credibility.updatedAt ? (
          <div className="flex items-start gap-3">
            <RefreshCw
              className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <div>
              <dt className="text-xs text-muted-foreground">
                {labels.recordUpdated}
              </dt>
              <dd className="mt-0.5 font-medium">
                {formatRecordDate(credibility.updatedAt, locale)}
              </dd>
            </div>
          </div>
        ) : null}
      </dl>

      {includedInformation.length > 0 ? (
        <div className="mt-5 border-t pt-4">
          <div className="flex items-start gap-3">
            <ListChecks
              className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <div>
              <h3 className="text-xs text-muted-foreground">
                {labels.listingInformation}
              </h3>
              <ul
                className="mt-2 flex flex-wrap gap-1.5"
                aria-label={labels.listingInformation}
              >
                {includedInformation.map((item) => (
                  <li
                    key={item}
                    className="rounded-md border bg-muted/50 px-2 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      <div
        role="note"
        className="mt-5 flex gap-2 rounded-lg border border-dashed bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground"
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="space-y-1.5">
          <p>{labels.directoryRecordNotice}</p>
          <p>{labels.externalSiteNotice}</p>
        </div>
      </div>
    </section>
  );
}

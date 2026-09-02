/**
 * Client-safe helpers for turning untrusted page metadata into editable
 * submission defaults. The user always reviews these values before posting.
 */

export const MAX_SUBMISSION_TITLE_LENGTH = 500;
export const MAX_SUBMISSION_TAGLINE_LENGTH = 120;
export const MAX_SUBMISSION_DESCRIPTION_LENGTH = 6_000;

export type SubmissionMetadataSource = "fetched" | "manual";

export type SubmissionMetadata = {
  favicon: string;
  ogImage: string;
  title: string;
  description: string;
  url: string;
  /** Whether fields came from the website or require the submitter's input. */
  metadataSource: SubmissionMetadataSource;
};

export type SubmissionPrefill = Pick<
  SubmissionMetadata,
  "url" | "title" | "description"
> & {
  tagline: string;
};

function compactText(value: string, maximumLength: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, maximumLength);
}

function fallbackTitle(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/**
 * A safe, already-normalized public URL whose upstream site declined metadata
 * access can still proceed to the editable submission form.
 */
export function createManualSubmissionMetadata(
  url: string,
): SubmissionMetadata {
  return {
    favicon: "",
    ogImage: "",
    title: "",
    description: "",
    url,
    metadataSource: "manual",
  };
}

export function createSubmissionPrefill(
  metadata: SubmissionMetadata,
): SubmissionPrefill {
  const description = compactText(
    metadata.description,
    MAX_SUBMISSION_DESCRIPTION_LENGTH,
  );

  return {
    url: metadata.url,
    title:
      compactText(metadata.title, MAX_SUBMISSION_TITLE_LENGTH) ||
      fallbackTitle(metadata.url),
    tagline: compactText(metadata.description, MAX_SUBMISSION_TAGLINE_LENGTH),
    description,
  };
}

/**
 * A later metadata fetch may replace fields that are blank or still equal to
 * the prior automatic value. Any user edit wins.
 */
export function shouldReplacePrefilledValue(
  currentValue: string,
  priorAutofill: string | undefined,
): boolean {
  return (
    currentValue.trim().length === 0 ||
    (priorAutofill !== undefined && currentValue === priorAutofill)
  );
}

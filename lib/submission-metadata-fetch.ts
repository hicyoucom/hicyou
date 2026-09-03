import { fetchSiteMetadata, type SiteMetadata } from "@/lib/fetch-metadata";

type SubmissionMetadataDependencies = {
  fetchDirect?: typeof fetchSiteMetadata;
};

/** Fetch submission metadata directly from the validated public URL. */
export async function fetchSubmissionMetadata(
  rawUrl: string,
  dependencies: SubmissionMetadataDependencies = {},
): Promise<SiteMetadata> {
  return (dependencies.fetchDirect ?? fetchSiteMetadata)(rawUrl);
}

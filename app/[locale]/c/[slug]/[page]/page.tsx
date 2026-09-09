import Content from "./category-page-content";
export { generateMetadata } from "./category-page-content";
export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}
export default function Page({
  params,
}: {
  params: Promise<{
    slug: string;
    locale: import("@/i18n/config").Locale;
    page: string;
  }>;
}) {
  return <Content params={params} searchParams={Promise.resolve({})} />;
}

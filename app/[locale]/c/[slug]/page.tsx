import Content from "./category-content";
export { generateMetadata } from "./category-content";
export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}
export default function Page({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  return <Content params={params} searchParams={Promise.resolve({})} />;
}

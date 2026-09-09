import Home from "./home-content";
export { metadata } from "./home-content";
export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}
export default function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return <Home params={params} searchParams={Promise.resolve({})} />;
}

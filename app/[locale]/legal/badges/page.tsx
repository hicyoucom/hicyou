import type { Metadata } from "next";
import Image from "next/image";

import { directory } from "@/directory.config";

export const metadata: Metadata = {
  title: `Optional badges | ${directory.name}`,
};

const badges = [
  { name: "Light", source: "/badge/powered-light.svg" },
  { name: "Dark", source: "/badge/powered-dark.svg" },
];

export default function BadgePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-4xl font-bold tracking-tight">
        Optional HiCyou badges
      </h1>
      <p className="mt-6 text-muted-foreground">
        You are welcome to link one of these unmodified badges to{" "}
        {directory.baseUrl}. Attribution is voluntary and is not a condition of
        Apache-2.0.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {badges.map((badge) => (
          <div key={badge.name} className="rounded-lg border p-6">
            <p className="mb-4 font-medium">{badge.name}</p>
            <Image
              src={badge.source}
              alt={`Powered by HiCyou — ${badge.name}`}
              width={150}
              height={44}
            />
          </div>
        ))}
      </div>
    </main>
  );
}

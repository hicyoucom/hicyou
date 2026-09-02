import type { Metadata } from "next";
import Link from "next/link";

import { directory } from "@/directory.config";

export const metadata: Metadata = { title: `Legal | ${directory.name}` };

export default function LegalPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-4xl font-bold tracking-tight">Legal information</h1>
      <div className="mt-8 space-y-4 leading-7 text-muted-foreground">
        <p>
          The software in the public repository is distributed under Apache-2.0,
          with retained third-party notices. Software licensing does not grant
          endorsement or broad trademark rights.
        </p>
        <p>
          A “Powered by HiCyou” badge is welcome but voluntary. Badge choice
          does not affect your right to use, modify, or distribute the software.
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <Link className="underline" href="/legal/terms">
              Terms for this deployment
            </Link>
          </li>
          <li>
            <Link className="underline" href="/legal/privacy">
              Privacy information
            </Link>
          </li>
          <li>
            <Link className="underline" href="/open-source">
              Open-source license overview
            </Link>
          </li>
        </ul>
      </div>
    </main>
  );
}

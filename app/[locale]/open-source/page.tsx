import type { Metadata } from "next";

import { directory } from "@/directory.config";

export const metadata: Metadata = {
  title: `Open source | ${directory.name}`,
  description:
    "License, source code, attribution, and contribution information.",
};

export default function OpenSourcePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-4xl font-bold tracking-tight">
        HiCyou is open source
      </h1>
      <p className="mt-6 text-lg text-muted-foreground">
        The community core is available under the Apache License 2.0. Code
        derived from the original Directory project retains its MIT notice.
      </p>
      <div className="mt-10 space-y-5 leading-7">
        <p>
          You may use, modify, and distribute the software subject to Apache-2.0
          and the retained third-party notices. The HiCyou name and logos are
          not automatically licensed as part of the software.
        </p>
        <p>
          If the project helps you, a “Powered by HiCyou” link is appreciated.
          It is entirely optional and is not a condition of the software
          license.
        </p>
        <p>
          <a className="underline" href="https://github.com/hicyoucom/hicyou">
            View the source and contribution guide on GitHub
          </a>
        </p>
      </div>
    </main>
  );
}

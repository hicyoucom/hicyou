#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { listFiles, safeRelative, sha256 } from "./public-boundary-lib.mjs";

if (process.argv.length !== 2) {
  throw new Error("usage: check-open-source-boundaries.mjs");
}

const root = process.cwd();
const manifestName = "OPEN_SOURCE_MANIFEST.json";
const exportId = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const sha256Pattern = /^[0-9a-f]{64}$/;
const join = (...parts) => parts.join("");
const textRules = [
  ["private-repository-name", new RegExp(join("hicyou-", "pravite"), "i")],
  [
    "private-campaign",
    new RegExp(join("external[_-]?", "campaign", "|External", "Campaign")),
  ],
  [
    "private-launch",
    new RegExp(join("external[_-]?", "launch", "|External", "Launch")),
  ],
  [
    "excluded-import-adapter",
    new RegExp(join("product", "hunt", "|tiny", "fish"), "i"),
  ],
  [
    "excluded-partner",
    new RegExp(join("big", "kr", "|\\b", "mf", "8\\b"), "i"),
  ],
  ["excluded-partner-site", new RegExp(join("aa", "t\\.ee"), "i")],
  ["private-source-owner", new RegExp(join("yea", "goo"), "i")],
  [
    "private-analytics-host",
    new RegExp(join("analytics", "\\.hicyou\\.de"), "i"),
  ],
  ["private-static-host", new RegExp(join("statics", "\\.hicyou\\.com"), "i")],
  [
    "mandatory-attribution",
    new RegExp(
      join(
        "must.{0,80}powered by hi",
        "\\s?cyou",
        "|powered by hi",
        "\\s?cyou.{0,80}(?:required|must)",
      ),
      "i",
    ),
  ],
  ["sourcegraph-token", new RegExp(join("sgp", "_[A-Za-z0-9]{16,}"))],
  [
    "private-key",
    new RegExp(
      join("-----BEGIN ", "(?:RSA |EC |OPENSSH )?", "PRIVATE KEY-----"),
    ),
  ],
  ["credential-url", /https?:\/\/[^\s/:]+:[^\s/@]+@/],
];
const deniedPathPrefixes = [
  "app/api/external",
  "app/api/cron/trigger-fetch",
  "app/[locale]/backlink-database",
  "app/[locale]/hi-studio/campaigns",
  "app/[locale]/pricing",
  "app/[locale]/sponsors",
  "data/backlink-",
  "exports",
];
const markdownAllowlist = new Set([
  "BRAND.md",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "README.md",
  "SECURITY.md",
  "THIRD_PARTY_LICENSES.md",
  "docs/DEPLOYMENT.md",
  "docs/MIGRATING_FROM_V1.md",
]);
const assetAllowlist = new Set([
  "app/favicon.ico",
  "app/ogimage.avif",
  "public/assets/logos/hicyou.svg",
  "public/badge/featured-dark.svg",
  "public/badge/featured-light.svg",
  "public/badge/powered-dark.svg",
  "public/badge/powered-light.svg",
  "public/favicon/apple-touch-icon.png",
  "public/favicon/favicon-96x96.png",
  "public/favicon/favicon.ico",
  "public/favicon/favicon.svg",
  "public/favicon/site.webmanifest",
  "public/favicon/web-app-manifest-192x192.png",
  "public/favicon/web-app-manifest-512x512.png",
  "public/logo.png",
  "public/logo.svg",
  "public/ogimage.avif",
]);
const requiredLicenseFiles = new Set([
  "LICENSE",
  "NOTICE",
  "OFL-1.1.txt",
  "THIRD_PARTY_LICENSES.md",
]);
const textExtensions = new Set([
  "",
  ".css",
  ".env",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".mjs",
  ".sh",
  ".sql",
  ".svg",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);
const reservedEmailDomain =
  /^(?:example\.(?:com|net|org)|.+\.(?:invalid|test))$/i;
const email = /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@([A-Z0-9.-]+\.[A-Z]{2,})/gi;

const findings = [];
const report = (id, filePath) => findings.push({ id, path: filePath });
const files = await listFiles(root);
for (const filePath of requiredLicenseFiles) {
  if (!files.includes(filePath))
    report("missing-required-license-file", filePath);
}
if (!files.includes(manifestName))
  throw new Error(`${manifestName} is missing`);
const manifest = JSON.parse(
  await readFile(path.join(root, manifestName), "utf8"),
);
if (
  manifest.schemaVersion !== 1 ||
  typeof manifest.exportId !== "string" ||
  !Array.isArray(manifest.files)
) {
  throw new Error("invalid public manifest");
}
if (
  !exportId.test(manifest.exportId) ||
  /^[0-9a-f]{7,}$/i.test(manifest.exportId)
)
  report("invalid-export-id", manifestName);
if (
  Object.keys(manifest).some(
    (key) => !["schemaVersion", "exportId", "files"].includes(key),
  )
)
  report("private-provenance", manifestName);

const declared = new Map();
for (const entry of manifest.files) {
  if (
    !entry ||
    typeof entry !== "object" ||
    Array.isArray(entry) ||
    !safeRelative(entry.path)
  ) {
    report("unsafe-manifest-entry", manifestName);
    continue;
  }
  if (
    Object.keys(entry).some(
      (key) => !["path", "sha256", "ownership"].includes(key),
    )
  )
    report("unexpected-manifest-entry-field", entry.path);
  if (declared.has(entry.path)) report("duplicate-manifest-path", entry.path);
  if (!sha256Pattern.test(entry.sha256))
    report("invalid-manifest-hash", entry.path);
  if (!["generated", "public-owned"].includes(entry.ownership))
    report("invalid-manifest-ownership", entry.path);
  declared.set(entry.path, entry);
}

for (const filePath of files.filter((entry) => entry !== manifestName)) {
  const entry = declared.get(filePath);
  if (!entry) report("undeclared-file", filePath);
  else if (
    entry.ownership === "generated" &&
    sha256(await readFile(path.join(root, filePath))) !== entry.sha256
  ) {
    report("generated-file-drift", filePath);
  }
  if (
    deniedPathPrefixes.some(
      (prefix) => filePath === prefix || filePath.startsWith(prefix),
    )
  ) {
    report("forbidden-path", filePath);
  }
  if (filePath.endsWith(".md") && !markdownAllowlist.has(filePath))
    report("unexpected-markdown", filePath);
  const extension = path.posix.extname(filePath).toLowerCase();
  if (
    [
      ".avif",
      ".gif",
      ".ico",
      ".jpeg",
      ".jpg",
      ".png",
      ".svg",
      ".webp",
    ].includes(extension) &&
    !assetAllowlist.has(filePath)
  ) {
    report("unapproved-asset", filePath);
  }
  if (!textExtensions.has(extension)) continue;
  const contents = await readFile(path.join(root, filePath), "utf8");
  if (/(?:\/home\/|\/Users\/|[A-Za-z]:\\Users\\)/.test(contents))
    report("absolute-private-path", filePath);
  for (const [id, pattern] of textRules)
    if (pattern.test(contents)) report(id, filePath);
  for (const match of contents.matchAll(email)) {
    if (!reservedEmailDomain.test(match[1]))
      report("nonreserved-email", filePath);
  }
}
for (const filePath of declared.keys()) {
  if (!files.includes(filePath)) report("missing-declared-file", filePath);
}

const packageJson = JSON.parse(
  await readFile(path.join(root, "package.json"), "utf8"),
);
if (packageJson.license !== "Apache-2.0")
  report("package-license", "package.json");
if (files.includes("OFL-1.1.txt")) {
  const fontLicense = await readFile(path.join(root, "OFL-1.1.txt"), "utf8");
  if (
    !fontLicense.includes("Copyright 2024 The Geist Project Authors") ||
    !fontLicense.includes("SIL OPEN FONT LICENSE Version 1.1")
  ) {
    report("invalid-geist-font-license", "OFL-1.1.txt");
  }
}
if (files.includes("THIRD_PARTY_LICENSES.md")) {
  const thirdPartyLicenses = await readFile(
    path.join(root, "THIRD_PARTY_LICENSES.md"),
    "utf8",
  );
  if (
    !thirdPartyLicenses.includes("Geist") ||
    !thirdPartyLicenses.includes("OFL-1.1.txt")
  ) {
    report("missing-geist-license-index", "THIRD_PARTY_LICENSES.md");
  }
}
const environment = await readFile(path.join(root, ".env.example"), "utf8");
for (const [index, line] of environment.split(/\r?\n/).entries()) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(trimmed);
  if (!match) report(`invalid-env-line-${index + 1}`, ".env.example");
  else if (
    /(?:SECRET|TOKEN|PASSWORD|PRIVATE|ACCESS_KEY|API_KEY|AUTH_KEY)$/.test(
      match[1],
    )
  ) {
    const value = match[2].replace(/^['"]|['"]$/g, "");
    if (value && value !== "replace-me")
      report("env-secret-value", ".env.example");
  }
}

if (files.includes("proxy.ts")) {
  const proxy = await readFile(path.join(root, "proxy.ts"), "utf8");
  if (
    /\b(?:10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})\b|\.local\b/i.test(
      proxy,
    )
  )
    report("private-proxy-origin", "proxy.ts");
}

findings.sort((left, right) =>
  `${left.path}:${left.id}`.localeCompare(`${right.path}:${right.id}`, "en"),
);
if (findings.length) {
  console.error(
    `Public boundary check failed with ${findings.length} finding(s):`,
  );
  for (const finding of findings)
    console.error(`- ${finding.id}: ${finding.path}`);
  process.exitCode = 1;
} else {
  console.log(
    `Public boundary check passed for ${files.length - 1} declared files.`,
  );
}

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstat, readdir } from "node:fs/promises";
import path from "node:path";

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function safeRelative(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !value.includes("\0") &&
    !value.includes("\\") &&
    !value.startsWith("/") &&
    !/^[A-Za-z]:[\\/]/.test(value) &&
    path.posix.normalize(value) === value &&
    value !== "." &&
    value !== ".." &&
    !value.startsWith("../")
  );
}

export async function listFiles(root) {
  let files;
  try {
    const topLevel = execFileSync(
      "git",
      ["-C", root, "rev-parse", "--show-toplevel"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    ).trim();
    if (path.resolve(topLevel) === path.resolve(root)) {
      files = execFileSync(
        "git",
        [
          "-C",
          root,
          "ls-files",
          "--cached",
          "--others",
          "--exclude-standard",
          "-z",
        ],
        { encoding: "utf8" },
      )
        .split("\0")
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right, "en"));
    }
  } catch {
    files = undefined;
  }

  if (!files) {
    files = [];
    await visitFilesystem("");
  }

  const presentFiles = [];
  const folded = new Map();
  for (const relativePath of files) {
    if (!safeRelative(relativePath)) throw new Error("unsafe filesystem path");
    let metadata;
    try {
      metadata = await lstat(path.join(root, relativePath));
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    if (metadata.isSymbolicLink())
      throw new Error(`symbolic link is forbidden: ${relativePath}`);
    if (!metadata.isFile())
      throw new Error(`unsupported filesystem entry: ${relativePath}`);
    const key = relativePath.normalize("NFC").toLocaleLowerCase("en-US");
    const previous = folded.get(key);
    if (previous && previous !== relativePath)
      throw new Error("case-folding path conflict");
    folded.set(key, relativePath);
    presentFiles.push(relativePath);
  }
  return presentFiles;

  async function visitFilesystem(relativeDirectory) {
    const entries = await readdir(path.join(root, relativeDirectory), {
      withFileTypes: true,
    });
    entries.sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const entry of entries) {
      const relativePath = relativeDirectory
        ? path.posix.join(relativeDirectory, entry.name)
        : entry.name;
      const metadata = await lstat(path.join(root, relativePath));
      if (metadata.isSymbolicLink())
        throw new Error(`symbolic link is forbidden: ${relativePath}`);
      if (metadata.isDirectory()) await visitFilesystem(relativePath);
      else if (metadata.isFile()) files.push(relativePath);
      else throw new Error(`unsupported filesystem entry: ${relativePath}`);
    }
  }
}

import { test, expect } from "bun:test";
import { localizedDescription, type FriendLink } from "@/lib/friend-links";

function mk(i18n: Record<string, string> | null, description: string | null): FriendLink {
  return { descriptionI18n: i18n, description } as FriendLink;
}

test("returns the locale-mapped translation", () => {
  const link = mk({ "en-US": "English", "zh-CN": "中文" }, "默认");
  expect(localizedDescription(link, "en")).toBe("English");
  expect(localizedDescription(link, "zh")).toBe("中文");
});

test("unmapped locales fall back to en-US", () => {
  const link = mk({ "en-US": "English", "zh-CN": "中文" }, "默认");
  expect(localizedDescription(link, "ja")).toBe("English");
  expect(localizedDescription(link, "fr")).toBe("English");
});

test("empty localized string falls through (|| not ??)", () => {
  const link = mk({ "en-US": "English", "zh-CN": "" }, "默认");
  expect(localizedDescription(link, "zh")).toBe("English");
});

test("no i18n object → default description", () => {
  expect(localizedDescription(mk(null, "only"), "zh")).toBe("only");
});

test("missing en-US fallback → default description", () => {
  const link = mk({ "zh-CN": "中文" }, "默认");
  expect(localizedDescription(link, "en")).toBe("默认");
});

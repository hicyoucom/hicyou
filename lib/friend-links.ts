import snapshot from "@/data/friend-links.json";

export interface FriendLink {
  id: string;
  name: string;
  url: string;
  domain: string | null;
  category: string;
  description: string | null;
  descriptionI18n: Record<string, string> | null;
  status: string;
  dr: number | null;
  drAttribution: string | null;
  drLicenseUrl: string | null;
  logoSvg: string | null;
  dofollow: boolean;
  footerDisplayMode: string;
}

const localeKeys: Record<string, string> = { en: "en-US", zh: "zh-CN" };
const footerNavigationSites = snapshot.footerNavigationSites as FriendLink[];
const allFriendLinks = snapshot.allFriendLinks as FriendLink[];

export function localizedDescription(
  link: FriendLink,
  locale: string,
): string | null {
  const translations = link.descriptionI18n;
  if (!translations) return link.description;
  return (
    translations[localeKeys[locale] ?? "en-US"] ||
    translations["en-US"] ||
    link.description
  );
}

export function getFooterNavSites(): FriendLink[] {
  return footerNavigationSites;
}

export function getAllFriendLinks(): FriendLink[] {
  return allFriendLinks;
}

export function getFriendLinkSections(): {
  navigation: FriendLink[];
  resources: FriendLink[];
} {
  const navigationIds = new Set(footerNavigationSites.map((site) => site.id));
  return {
    navigation: allFriendLinks.filter((link) => navigationIds.has(link.id)),
    resources: allFriendLinks.filter((link) => !navigationIds.has(link.id)),
  };
}

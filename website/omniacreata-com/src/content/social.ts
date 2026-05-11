export type SocialPlatform = "instagram" | "x";

export type SocialProfile = {
  id: SocialPlatform;
  label: string;
  handle: string;
  href: string;
  available: boolean;
  ariaLabel: string;
  description: {
    en: string;
    tr: string;
  };
};

function cleanExternalUrl(value: string | undefined) {
  const candidate = value?.trim();

  if (!candidate) {
    return "";
  }

  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

const instagramUrl =
  cleanExternalUrl(process.env.NEXT_PUBLIC_OMNIACREATA_INSTAGRAM_URL) ||
  "https://www.instagram.com/omniacreata/";
const xUrl =
  cleanExternalUrl(process.env.NEXT_PUBLIC_OMNIACREATA_X_URL) ||
  "https://x.com/OmniaCreata";

export const socialProfiles: SocialProfile[] = [
  {
    id: "instagram",
    label: "Instagram",
    handle: "@OmniaCreata",
    href: instagramUrl,
    available: Boolean(instagramUrl),
    ariaLabel: "OmniaCreata on Instagram",
    description: {
      en: "Visual updates, brand moments, and public Studio signals.",
      tr: "Gorsel guncellemeler, marka anlari ve public Studio sinyalleri.",
    },
  },
  {
    id: "x",
    label: "X",
    handle: "@OmniaCreata",
    href: xUrl,
    available: Boolean(xUrl),
    ariaLabel: "OmniaCreata on X",
    description: {
      en: "Short product notes, release signals, and founder-side updates.",
      tr: "Kisa urun notlari, yayin sinyalleri ve founder tarafindan guncellemeler.",
    },
  },
];

export function getSocialProfiles() {
  return socialProfiles;
}

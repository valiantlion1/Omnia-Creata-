import type { LocaleCode } from "@/i18n/config";

export type PlatformKey = "web" | "ios" | "android" | "pwa" | "desktop";
export type PlatformStatus = "live" | "preview" | "planned";

export type PlatformDefinition = {
  key: PlatformKey;
  anchor: string;
  headline: string;
  description: string;
};

export const platformAvailability: PlatformDefinition[] = [
  {
    key: "web",
    anchor: "platform-web",
    headline: "Web",
    description:
      "Browser-based access for core work, product hubs, and deeper workflows.",
  },
  {
    key: "ios",
    anchor: "platform-ios",
    headline: "iOS",
    description:
      "Mobile access for review, approvals, and lightweight product actions.",
  },
  {
    key: "android",
    anchor: "platform-android",
    headline: "Android",
    description:
      "Android access for day-to-day work, updates, and wider mobile reach.",
  },
  {
    key: "pwa",
    anchor: "platform-pwa",
    headline: "PWA",
    description:
      "Installable web access for faster return visits and cross-device continuity.",
  },
  {
    key: "desktop",
    anchor: "platform-desktop",
    headline: "Desktop",
    description:
      "Desktop surfaces for longer sessions, denser review, and focused production.",
  },
];

const turkishPlatformOverrides: Record<
  PlatformKey,
  Pick<PlatformDefinition, "headline" | "description">
> = {
  web: {
    headline: "Web",
    description:
      "Urun merkezleri, operasyon katmanlari ve derin calisma akislari icin tam tarayici deneyimi.",
  },
  ios: {
    headline: "iOS",
    description:
      "Hizli kontrol, onay ve mobil erisim senaryolari icin premium iOS yuzeyleri.",
  },
  android: {
    headline: "Android",
    description:
      "Daha genis erisim ve gunluk is akislarini destekleyen esnek Android yuzeyleri.",
  },
  pwa: {
    headline: "PWA",
    description:
      "Kurulabilir web deneyimi ile hizli geri donus, dusuk surtunme ve cihazlar arasi sureklilik.",
  },
  desktop: {
    headline: "Desktop",
    description:
      "Uzun oturumlar, daha yogun inceleme ve ileri seviye uretim isleri icin masaustu ortami.",
  },
};

export function getPlatformAvailability(locale: LocaleCode): PlatformDefinition[] {
  if (locale !== "tr") {
    return platformAvailability;
  }

  return platformAvailability.map((platform) => ({
    ...platform,
    ...turkishPlatformOverrides[platform.key],
  }));
}

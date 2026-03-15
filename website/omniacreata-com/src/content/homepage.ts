import type { LocaleCode } from "@/i18n/config";

type HomepageModules = {
  heroStats: Array<{
    label: string;
    value: string;
  }>;
  trustSignals: Array<{
    title: string;
    description: string;
  }>;
};

const englishModules: HomepageModules = {
  heroStats: [
    {
      label: "Flagship products",
      value: "5",
    },
    {
      label: "Direct access",
      value: "Product hubs",
    },
    {
      label: "Platform coverage",
      value: "Web, iOS, Android, PWA, desktop",
    },
  ],
  trustSignals: [
    {
      title: "Fast product routes",
      description:
        "Users can understand products and move forward without extra steps.",
    },
    {
      title: "Clear access model",
      description:
        "Platform availability is visible before people commit to a product.",
    },
    {
      title: "Premium interface quality",
      description:
        "Motion, spacing, and interaction design stay polished across the site.",
    },
    {
      title: "Serious company presence",
      description:
        "The site presents Omnia Creata as a focused software company, not a template.",
    },
  ],
};

const turkishModules: HomepageModules = {
  heroStats: [
    {
      label: "Amiral urun",
      value: "5",
    },
    {
      label: "Giris modeli",
      value: "Birlesik ekosistem",
    },
    {
      label: "Platform yuzeyleri",
      value: "Web, mobil, PWA, desktop",
    },
  ],
  trustSignals: [
    {
      title: "Net bilgi yapisi",
      description:
        "Kullanici urunleri, fiyatlandirmayi ve erisim yollarini hizli anlar.",
    },
    {
      title: "Dogrudan urun gecisi",
      description:
        "Her urun temiz bir gecis yoluna sahiptir, bos sayfa hissi birakmaz.",
    },
    {
      title: "Premium arayuz kalitesi",
      description:
        "Hareket, bosluk ve etkilesim dili daha rafine bir deneyim sunar.",
    },
    {
      title: "Global sunum hazirligi",
      description:
        "Bolgeler arasinda tutarli bir marka deneyimi korunur.",
    },
  ],
};

export function getHomepageModules(locale: LocaleCode): HomepageModules {
  return locale === "tr" ? turkishModules : englishModules;
}

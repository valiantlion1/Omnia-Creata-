import type { LocaleCode } from "@/i18n/config";
import type { PlatformKey, PlatformStatus } from "./platforms";

export type ProductSlug = "omnia-creata-studio";

export type AccessLink = {
  platform: PlatformKey;
  status: PlatformStatus;
  href?: string;
  label?: string;
  note: string;
};

export type HubSection = {
  id: "overview" | "access" | "capabilities" | "ecosystem-role";
  title: string;
  description: string;
};

export type ProductRecord = {
  slug: ProductSlug;
  name: string;
  shortDescription: string;
  summary: string;
  status: PlatformStatus;
  badge: string;
  headline: string;
  subheadline: string;
  roleTitle: string;
  roleDescription: string;
  platformMatrix: AccessLink[];
  primaryCTA: {
    href: string;
    label: string;
  };
  accessLinks: AccessLink[];
  hubNav: HubSection[];
  surfaceType: PlatformKey[];
  capabilityHighlights: Array<{
    title: string;
    description: string;
  }>;
  ecosystemPoints: Array<{
    title: string;
    description: string;
  }>;
  companionSlugs: ProductSlug[];
};

export const products: ProductRecord[] = [
  {
    slug: "omnia-creata-studio",
    name: "OmniaCreata Studio",
    shortDescription:
      "Prompts, references, runs, and selects in one visual workspace.",
    summary:
      "Studio keeps visual direction, generation, review, and saved history in one place.",
    status: "preview",
    badge: "Studio",
    headline: "Image work, with taste.",
    subheadline: "Built for people who want more than a lucky reroll.",
    roleTitle: "Studio comes first.",
    roleDescription:
      "It is the first public expression of Omnia Creata.",
    platformMatrix: [
      {
        platform: "web",
        status: "preview",
        note: "Open now.",
      },
      {
        platform: "pwa",
        status: "preview",
        note: "Same workspace, installable later.",
      },
      {
        platform: "desktop",
        status: "preview",
        note: "Desktop is not public yet.",
      },
      {
        platform: "ios",
        status: "planned",
        note: "iOS is not public yet.",
      },
      {
        platform: "android",
        status: "planned",
        note: "Android is not public yet.",
      },
    ],
    primaryCTA: {
      href: "/products/omnia-creata-studio",
      label: "See Studio",
    },
    accessLinks: [],
    hubNav: [
      {
        id: "overview",
        title: "Overview",
        description: "What Studio is and why it matters first.",
      },
      {
        id: "access",
        title: "Access",
        description: "How Studio is being opened up.",
      },
      {
        id: "capabilities",
        title: "Capabilities",
        description: "The core jobs Studio is built to handle.",
      },
      {
        id: "ecosystem-role",
        title: "Role",
        description: "Why Studio is the first Omnia Creata product in public view.",
      },
    ],
    surfaceType: ["web", "pwa", "desktop"],
    capabilityHighlights: [
      {
        title: "Shape the brief",
        description:
          "Keep prompts, references, and direction together before the first run.",
      },
      {
        title: "Generate in context",
        description:
          "Move through variations without losing the thread of the project.",
      },
      {
        title: "Keep the selects",
        description:
          "Save the outputs and decisions worth building on.",
      },
    ],
    ecosystemPoints: [
      {
        title: "The company becomes real through the product",
        description:
          "Studio is the clearest expression of what Omnia Creata is building.",
      },
      {
        title: "The launch stays honest",
        description:
          "Only the product that is close enough to matter should take center stage.",
      },
      {
        title: "Future products can arrive later",
        description:
          "The rest of the Omnia Creata line can earn space when it is ready to stand on its own.",
      },
    ],
    companionSlugs: [],
  },
];

export function getProducts(locale?: LocaleCode) {
  void locale;
  return products.map((product) => ({
    ...product,
    accessLinks: product.accessLinks.length ? product.accessLinks : product.platformMatrix,
  }));
}

export function getProductBySlug(slug: string, locale?: LocaleCode) {
  return getProducts(locale).find((product) => product.slug === slug);
}

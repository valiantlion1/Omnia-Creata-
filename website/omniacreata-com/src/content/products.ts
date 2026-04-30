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
      "Image generation, editing, review, and saved selects in one visual workspace.",
    summary:
      "Studio keeps briefs, prompts, references, generations, edits, and saved history in one place.",
    status: "preview",
    badge: "Studio",
    headline: "Image work that stays organized.",
    subheadline: "Built for people who need more than a lucky reroll.",
    roleTitle: "Studio comes first.",
    roleDescription:
      "It is the first OmniaCreata product and the center of the image workflow.",
    platformMatrix: [
      {
        platform: "web",
        status: "preview",
        note: "Primary browser-based Studio access path.",
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
        description: "What Studio does for image work.",
      },
      {
        id: "access",
        title: "Access",
        description: "How Studio access is handled.",
      },
      {
        id: "capabilities",
        title: "Capabilities",
        description: "The core jobs Studio handles.",
      },
      {
        id: "ecosystem-role",
        title: "Role",
        description: "Why Studio leads the product line.",
      },
    ],
    surfaceType: ["web", "pwa", "desktop"],
    capabilityHighlights: [
      {
        title: "Shape the brief",
        description:
          "Keep the goal, prompt, reference, and direction together before a run.",
      },
      {
        title: "Generate and edit",
        description:
          "Move through variations, edits, and refinements without switching tools.",
      },
      {
        title: "Review and keep selects",
        description:
          "Save the outputs and decisions worth returning to later.",
      },
    ],
    ecosystemPoints: [
      {
        title: "The product is the proof",
        description:
          "Studio is the clearest expression of what OmniaCreata is building.",
      },
      {
        title: "The product line stays focused",
        description:
          "New products are added only when they serve a clear creative job.",
      },
      {
        title: "The ecosystem grows deliberately",
        description:
          "The site points people into Studio first, then expands when the tools are ready.",
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

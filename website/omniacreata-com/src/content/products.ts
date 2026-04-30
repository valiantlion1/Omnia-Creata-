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
  id: "overview" | "access" | "capabilities" | "role";
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
  rolePoints: Array<{
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
      "Image generation, editing, review, and saved selects in one workspace.",
    summary:
      "Studio is being prepared as a focused workspace for image work.",
    status: "planned",
    badge: "Studio",
    headline: "Image work that stays organized.",
    subheadline: "Built for people who need more than a lucky reroll.",
    roleTitle: "Studio comes first.",
    roleDescription:
      "Public access details will be published when Studio is ready.",
    platformMatrix: [
      {
        platform: "web",
        status: "planned",
        note: "Web access will be published when Studio is ready.",
      },
    ],
    primaryCTA: {
      href: "/contact",
      label: "Contact",
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
        description: "When Studio access will be available.",
      },
      {
        id: "capabilities",
        title: "Capabilities",
        description: "The core jobs Studio handles.",
      },
      {
        id: "role",
        title: "Role",
        description: "Why Studio stays focused.",
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
    rolePoints: [
      {
        title: "The product stays focused",
        description:
          "Studio is being prepared around a clear image workflow.",
      },
      {
        title: "The public site stays honest",
        description:
          "Access, pricing, and product details are published only when ready.",
      },
      {
        title: "New surfaces come later",
        description:
          "Additional products are added only when they have a clear job.",
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

import type { MetadataRoute } from "next";
import {
  buildLanguageAlternates,
  defaultLocale,
  getLocalizedPath,
  localeRegistry,
} from "@/i18n/config";
import { products } from "@/content/products";

const staticPages = [
  { path: "/", priority: 1 },
  { path: "/about", priority: 0.78 },
  { path: "/contact", priority: 0.78 },
  { path: "/products", priority: 0.82 },
  { path: "/pricing", priority: 0.7 },
  { path: "/privacy-policy", priority: 0.5 },
  { path: "/terms-of-service", priority: 0.5 },
  { path: "/refund-policy", priority: 0.5 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-04-30");

  const productPages = products.map((product) => ({
    path: `/products/${product.slug}`,
    priority: 0.74,
  }));

  const allPaths = [...staticPages, ...productPages];

  return allPaths.flatMap(({ path, priority }) => {
    const alternates = buildLanguageAlternates(path);

    return localeRegistry.map((locale) => ({
      url: `https://omniacreata.com${getLocalizedPath(locale.code, path)}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: locale.code === defaultLocale ? priority : Math.max(priority - 0.05, 0.4),
      alternates: { languages: alternates },
    }));
  });
}

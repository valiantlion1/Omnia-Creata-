import type { MetadataRoute } from "next";
import { products } from "@/content/products";
import { defaultLocale, getLocalizedPath } from "@/i18n/config";

const staticPages = [
  "/",
  "/products",
  "/about",
  "/pricing",
  "/contact",
  "/privacy-policy",
  "/terms-of-service",
  "/refund-policy",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-03-14");
  const localizedPages = staticPages.map((path) => ({
    url: `https://omniacreata.com${getLocalizedPath(defaultLocale, path)}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: path === "/" ? 1 : 0.72,
  }));

  const localizedProducts = products.map((product) => ({
    url: `https://omniacreata.com${getLocalizedPath(defaultLocale, `/products/${product.slug}`)}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: product.slug === "omnia-creata-studio" ? 0.95 : 0.82,
  }));

  return [...localizedPages, ...localizedProducts];
}

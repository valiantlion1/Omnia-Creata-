import type { MetadataRoute } from "next";
import { brand } from "@prompt-vault/config";
import { locales } from "@prompt-vault/types";

const publicPaths = [
  "",
  "/features",
  "/how-it-works",
  "/pricing",
  "/help",
  "/faq",
  "/privacy",
  "/terms",
  "/sign-in",
  "/sign-up"
];

export default function sitemap(): MetadataRoute.Sitemap {
  return locales.flatMap((locale) =>
    publicPaths.map((path) => ({
      url: `${brand.appUrl}/${locale}${path}`,
      lastModified: new Date()
    }))
  );
}

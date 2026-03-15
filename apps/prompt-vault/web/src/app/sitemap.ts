import type { MetadataRoute } from "next";
import { locales } from "@prompt-vault/types";

const publicPaths = ["", "/features", "/how-it-works", "/pricing", "/faq", "/sign-in", "/sign-up"];

export default function sitemap(): MetadataRoute.Sitemap {
  return locales.flatMap((locale) =>
    publicPaths.map((path) => ({
      url: `https://omniacreata.com/${locale}${path}`,
      lastModified: new Date()
    }))
  );
}

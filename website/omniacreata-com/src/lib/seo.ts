import type { Metadata } from "next";
import {
  buildLanguageAlternates,
  getLocaleDefinition,
  getLocalizedPath,
  type LocaleCode,
} from "@/i18n/config";
import { absoluteUrl } from "@/lib/utils";

type CreatePageMetadataOptions = {
  locale: LocaleCode;
  path?: string;
  title: string;
  description: string;
};

export function createPageMetadata({
  locale,
  path = "/",
  title,
  description,
}: CreatePageMetadataOptions): Metadata {
  const localeDefinition = getLocaleDefinition(locale);
  const localizedPath = getLocalizedPath(locale, path);
  const socialTitle = title === "Omnia Creata" ? title : `${title} | Omnia Creata`;

  return {
    title,
    description,
    alternates: {
      canonical: localizedPath,
      languages: buildLanguageAlternates(path),
    },
    openGraph: {
      title: socialTitle,
      description,
      url: absoluteUrl(localizedPath),
      locale: localeDefinition.hreflang.replace("-", "_"),
      siteName: "Omnia Creata",
      type: "website",
      images: [
        {
          url: absoluteUrl("/opengraph-image"),
          width: 1200,
          height: 630,
          alt: "Omnia Creata",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [absoluteUrl("/opengraph-image")],
    },
  };
}

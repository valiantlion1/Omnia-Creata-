import type { Metadata } from "next";
import {
  Noto_Sans,
  Noto_Sans_Arabic,
  Noto_Sans_JP,
  Noto_Sans_SC,
  Plus_Jakarta_Sans,
} from "next/font/google";
import "./globals.css";
import { defaultLocale } from "@/i18n/config";
import { absoluteUrl } from "@/lib/utils";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
});

const notoSans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-sans-fallback",
});

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
});

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-jp",
});

const notoSansSc = Noto_Sans_SC({
  subsets: ["latin"],
  variable: "--font-sc",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://omniacreata.com"),
  title: {
    default: "OmniaCreata | Creative software company",
    template: "%s | OmniaCreata",
  },
  description:
    "OmniaCreata builds creative software for image work.",
  applicationName: "OmniaCreata",
  alternates: {
    canonical: `/${defaultLocale}`,
  },
  openGraph: {
    title: "OmniaCreata",
    description:
      "Creative software for image work.",
    url: absoluteUrl(`/${defaultLocale}`),
    siteName: "OmniaCreata",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: absoluteUrl("/opengraph-image"),
        width: 1200,
        height: 630,
        alt: "OmniaCreata",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OmniaCreata",
    description:
      "Creative software for image work.",
    images: [absoluteUrl("/opengraph-image")],
  },
  icons: {
    icon: "/brand/logo-transparent.png",
    apple: "/brand/logo-transparent.png",
  },
  keywords: [
    "OmniaCreata",
    "omniacreata.com",
    "creative software",
    "OmniaCreata Studio",
    "AI image workflow",
    "software company",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-background text-foreground" suppressHydrationWarning>
      <body
        className={`${plusJakartaSans.variable} ${notoSans.variable} ${notoSansArabic.variable} ${notoSansJp.variable} ${notoSansSc.variable} site-frame bg-background text-foreground antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

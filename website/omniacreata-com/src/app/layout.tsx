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
    default: "Omnia Creata | Premium Software Headquarters",
    template: "%s | Omnia Creata",
  },
  description:
    "Official website for omniacreata.com and the Omnia Creata software ecosystem.",
  applicationName: "Omnia Creata",
  alternates: {
    canonical: `/${defaultLocale}`,
  },
  openGraph: {
    title: "Omnia Creata",
    description:
      "Product headquarters for the Omnia Creata ecosystem across web, mobile, desktop, and PWA surfaces.",
    url: absoluteUrl(`/${defaultLocale}`),
    siteName: "Omnia Creata",
    locale: "en_US",
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
    title: "Omnia Creata",
    description:
      "Official website for the Omnia Creata ecosystem and its flagship software products.",
    images: [absoluteUrl("/opengraph-image")],
  },
  icons: {
    icon: "/brand/logo-transparent.png",
    apple: "/brand/logo-transparent.png",
  },
  keywords: [
    "Omnia Creata",
    "omniacreata.com",
    "premium software ecosystem",
    "OmniaCreata Studio",
    "OmniaPixels",
    "OmniaOrganizer",
    "Prompt Vault",
    "Omnia Watch",
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

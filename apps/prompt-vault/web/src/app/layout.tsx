import { brand } from "@prompt-vault/config";
import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter, Manrope } from "next/font/google";
import Script from "next/script";
import { ServiceWorkerRegister } from "@/components/shared/service-worker-register";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? brand.appUrl),
  title: {
    default: `${brand.name} | ${brand.parent}`,
    template: `%s | ${brand.name}`
  },
  description:
    `${brand.name} is OmniaCreata's focused prompt workspace for capturing, organizing, and reusing AI prompts, notes, workflows, and project thinking.`,
  applicationName: brand.name,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: brand.name
  }
};

export const viewport: Viewport = {
  themeColor: "#f6efe3",
  colorScheme: "light",
  viewportFit: "cover"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${manrope.variable} ${mono.variable} antialiased`}>
        {process.env.NODE_ENV === "development" ? (
          <Script
            src="https://mcp.figma.com/mcp/html-to-design/capture.js"
            strategy="afterInteractive"
          />
        ) : null}
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}

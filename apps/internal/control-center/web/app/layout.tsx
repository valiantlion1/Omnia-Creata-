import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Sora } from "next/font/google";
import type { ReactNode } from "react";

import "@/app/globals.css";

import { PwaClient } from "@/components/pwa-client";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora"
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500", "600"]
});

export const metadata: Metadata = {
  title: "OCOS",
  description: "OmniaCreata internal incident operating system.",
  applicationName: "OCOS",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false
    }
  }
};

export const viewport: Viewport = {
  themeColor: "#f2eadf"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${ibmPlexMono.variable}`}>
      <body className="antialiased">
        <PwaClient />
        {children}
      </body>
    </html>
  );
}

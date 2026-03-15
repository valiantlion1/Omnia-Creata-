import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { ServiceWorkerRegister } from "@/components/shared/service-worker-register";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://omniacreata.com"),
  title: {
    default: "Prompt Vault | Omnia Creata",
    template: "%s | Prompt Vault"
  },
  description:
    "Prompt Vault is the premium prompt operating system for saving, organizing, syncing, and reusing prompts, ideas, and AI workflows.",
  applicationName: "Prompt Vault",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Prompt Vault"
  }
};

export const viewport: Viewport = {
  themeColor: "#0b0a09",
  colorScheme: "dark light",
  viewportFit: "cover"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} ${mono.variable} antialiased`}>
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

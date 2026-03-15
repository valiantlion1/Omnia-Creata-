import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans"
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display"
});

export const metadata: Metadata = {
  applicationName: "Omnia Watch",
  description:
    "Omnia Watch is a premium PC maintenance, monitoring, update intelligence, and system care platform by Omnia Creata.",
  metadataBase: new URL("https://omniacreata.com"),
  title: {
    default: "Omnia Watch",
    template: "%s | Omnia Watch"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
      <body
        className={`${manrope.variable} ${spaceGrotesk.variable} min-h-screen bg-canvas font-sans text-text antialiased`}
      >
        {process.env.NODE_ENV === "development" ? (
          <Script src="https://mcp.figma.com/mcp/html-to-design/capture.js" strategy="afterInteractive" />
        ) : null}
        {children}
      </body>
    </html>
  );
}

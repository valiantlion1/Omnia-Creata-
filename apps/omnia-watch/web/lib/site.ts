export const siteConfig = {
  accountUrl:
    process.env.NEXT_PUBLIC_ACCOUNT_URL ?? "https://account.omniacreata.com",
  brandName: "Omnia Creata",
  hostingTarget: "firebase-app-hosting",
  marketingUrl: process.env.NEXT_PUBLIC_MARKETING_URL ?? "https://omniacreata.com",
  productName: "Omnia Watch",
  supportEmail: "support@omniacreata.com",
  webAppUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://watch.omniacreata.com"
} as const;

export function localizePath(locale: string, path = "") {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${normalized === "/" ? "" : normalized}`;
}

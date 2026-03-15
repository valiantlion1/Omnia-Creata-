import { getDictionary, isLocale } from "@omnia-watch/i18n";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "tr" }];
}

export default async function LocaleLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const dictionary = getDictionary(locale);

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(73,214,185,0.08),transparent_24%),linear-gradient(180deg,rgba(10,14,24,0.15),rgba(10,14,24,0.4))]" />
      <div className="relative">{children}</div>
      <div className="sr-only">{dictionary.common.productName}</div>
    </div>
  );
}

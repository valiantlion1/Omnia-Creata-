import { getDictionary, isLocale } from "@omnia-watch/i18n";
import { notFound } from "next/navigation";
import { MarketingFooter } from "@/components/marketing/footer";
import { MarketingHeader } from "@/components/marketing/header";

export default async function MarketingLayout({
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
    <div className="min-h-screen">
      <MarketingHeader dictionary={dictionary} locale={locale} />
      <main>{children}</main>
      <MarketingFooter dictionary={dictionary} locale={locale} />
    </div>
  );
}

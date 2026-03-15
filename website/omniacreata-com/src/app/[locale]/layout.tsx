import { notFound } from "next/navigation";
import { DepthBackdrop } from "@/components/experience/depth-backdrop";
import { IntroOverlay } from "@/components/experience/intro-overlay";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import {
  defaultLocale,
  getLocaleDirection,
  isLocale,
} from "@/i18n/config";
import { getMessages } from "@/i18n/messages";

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

export function generateStaticParams() {
  return [{ locale: defaultLocale }];
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!isLocale(locale) || locale !== defaultLocale) {
    notFound();
  }

  const messages = getMessages(locale);

  return (
    <div dir={getLocaleDirection(locale)} lang={locale}>
      <DepthBackdrop />
      <IntroOverlay />
      <div className="relative z-10">
        <Navbar locale={locale} messages={messages} />
        <main className="relative min-h-screen pt-32 lg:pt-36">{children}</main>
        <Footer locale={locale} messages={messages} />
      </div>
    </div>
  );
}

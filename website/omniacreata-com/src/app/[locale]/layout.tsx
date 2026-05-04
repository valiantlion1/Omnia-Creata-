import { notFound } from "next/navigation";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { DepthBackdrop } from "@/components/experience/depth-backdrop";
import {
  getLocaleDirection,
  isLocale,
  localeCodes,
} from "@/i18n/config";
import { getMessages } from "@/i18n/messages";

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

export function generateStaticParams() {
  return localeCodes.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const messages = getMessages(locale);

  return (
    <div dir={getLocaleDirection(locale)} lang={locale}>
      <DepthBackdrop />
      <div className="relative z-10">
        <Navbar locale={locale} messages={messages} />
        <main className="relative min-h-screen pt-24 lg:pt-28">{children}</main>
        <Footer locale={locale} messages={messages} />
      </div>
    </div>
  );
}

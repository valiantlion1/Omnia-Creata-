import { getDictionary, isLocale } from "@omnia-watch/i18n";
import { notFound } from "next/navigation";
import { Card, SectionHeading } from "@omnia-watch/ui";

export default async function TermsPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const dictionary = getDictionary(locale);

  return (
    <div className="mx-auto max-w-4xl px-6 pb-20 pt-14 lg:px-8">
      <SectionHeading
        eyebrow={dictionary.common.brandName}
        title={dictionary.legal.terms.title}
        description={dictionary.legal.terms.body}
      />
      <Card className="mt-10">
        <p className="text-sm leading-7 text-muted">
          Service terms, device ownership rules, and future subscription enforcement will live on
          this page once the public SaaS moves from foundation to production onboarding.
        </p>
      </Card>
    </div>
  );
}

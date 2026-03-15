import { getDictionary, isLocale } from "@omnia-watch/i18n";
import { notFound } from "next/navigation";
import { Card, SectionHeading } from "@omnia-watch/ui";

export default async function PrivacyPage({
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
        title={dictionary.legal.privacy.title}
        description={dictionary.legal.privacy.body}
      />
      <Card className="mt-10">
        <p className="text-sm leading-7 text-muted">
          Omnia Watch separates cloud account data from local device operations. Policy copy,
          consent versioning, and future legal acceptance tracking are scaffolded in the data
          model and documentation for public launch readiness.
        </p>
      </Card>
    </div>
  );
}

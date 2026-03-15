import { getDictionary, isLocale } from "@omnia-watch/i18n";
import { notFound } from "next/navigation";
import { Card, SectionHeading } from "@omnia-watch/ui";

export default async function FaqPage({
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
    <div className="mx-auto max-w-5xl px-6 pb-20 pt-14 lg:px-8">
      <SectionHeading
        eyebrow={dictionary.common.learnMore}
        title={dictionary.marketing.faq.title}
        description={dictionary.marketing.faq.subtitle}
      />
      <div className="mt-12 space-y-4">
        {dictionary.marketing.faq.items.map((item) => (
          <Card key={item.question}>
            <h2 className="font-display text-2xl font-semibold text-text">{item.question}</h2>
            <p className="mt-4 text-sm leading-7 text-muted">{item.answer}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { createPageMetadata } from "@/lib/seo";
import { contactChannels, mailto } from "@/lib/contact-channels";
import { withLocalePrefix } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";

type PricingPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const pricingNotes = [
  {
    title: "No public plan yet",
    description:
      "Studio pricing will be published when public access is ready.",
  },
  {
    title: "Credit details will be clear",
    description:
      "Credit rules, model costs, and plan limits will be shown before payment.",
  },
  {
    title: "Questions go to billing",
    description:
      `For payment or refund questions, use ${contactChannels.billing}.`,
  },
];

export async function generateMetadata({
  params,
}: PricingPageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  return createPageMetadata({
    locale,
    path: "/pricing",
    title: "Pricing",
    description: "Pricing information for Studio will be published when public access is ready.",
  });
}

export default async function PricingPage({ params }: PricingPageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return (
    <section className="site-page">
      <div className="site-page-inner">
        <div className="site-page-hero site-page-hero--compact lg:grid-cols-[0.9fr_1.1fr]">
          <div className="site-page-copy">
            <p className="site-kicker">Pricing</p>
            <h1 className="site-page-title">
              Studio pricing is <strong>not public yet.</strong>
            </h1>
            <p className="site-page-lede">
              Pricing, credits, and payment details will be published when Studio access is ready.
            </p>
          </div>

          <div className="site-premium-card p-6 sm:p-8">
            <p className="site-kicker">Current status</p>
            <p className="mt-6 text-2xl font-semibold leading-tight text-foreground">
              Public pricing will come with the product.
            </p>
            <p className="mt-5 text-sm leading-7 text-foreground-soft">
              Until then, contact OmniaCreata for product or billing questions.
            </p>
          </div>
        </div>

        <div className="site-band lg:grid-cols-[0.72fr_1.28fr]">
          <div className="space-y-4">
            <p className="site-kicker">Pricing status</p>
            <h2 className="site-title max-w-[10ch]">No plan is being sold here yet.</h2>
            <p className="site-copy">
              This page is kept honest until Studio is ready for public access.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {pricingNotes.map((item) => (
              <article className="site-premium-card p-5" key={item.title}>
                <strong className="text-lg text-foreground">{item.title}</strong>
                <p className="mt-4 text-sm leading-7 text-foreground-soft">{item.description}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="site-band lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="site-kicker">Contact</p>
            <p className="site-copy mt-4">
              For product, payment, or refund questions, contact OmniaCreata directly.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={mailto(contactChannels.billing)} size="lg" variant="primary">
              Email billing
            </ButtonLink>
            <ButtonLink href={withLocalePrefix(locale, "/contact")} size="lg" variant="secondary">
              Contact
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}

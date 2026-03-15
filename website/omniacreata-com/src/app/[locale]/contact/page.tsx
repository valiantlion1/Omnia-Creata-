import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactForm } from "@/components/forms/contact-form";
import { FeatureCard } from "@/components/marketing/feature-card";
import { PageHero } from "@/components/marketing/page-hero";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "@/components/ui/section-header";
import { getProducts } from "@/content/products";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { createPageMetadata } from "@/lib/seo";
import { withLocalePrefix } from "@/lib/utils";

type ContactPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pickFirst(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export async function generateMetadata({
  params,
}: ContactPageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  return createPageMetadata({
    locale,
    path: "/contact",
    title: "Contact",
    description:
      "Contact Omnia Creata about products, pricing, partnerships, privacy, and public access.",
  });
}

export default async function ContactPage({
  params,
  searchParams,
}: ContactPageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const messages = getMessages(locale);
  const query = await searchParams;
  const products = getProducts(locale);
  const productSlug = pickFirst(query.product);
  const platform = pickFirst(query.platform);
  const intent = pickFirst(query.intent);
  const productName = products.find((item) => item.slug === productSlug)?.name;

  const prefilledInterest = productName
    ? `${productName} access request`
    : "";

  const prefilledMessage =
    productName || platform || intent
      ? [
          "Hello Omnia Creata team,",
          "",
          "Could you share access details for this request?",
          productName ? `Product: ${productName}` : "",
          platform ? `Platform: ${platform}` : "",
          intent ? `Intent: ${intent.replaceAll("_", " ")}` : "",
        ]
          .filter(Boolean)
          .join("\n")
      : "";

  const contactCards = [
    {
      title: "Product access",
      description: "Questions about products, pricing, and the right access route start here.",
    },
    {
      title: "Partnerships",
      description: "Use partnerships@omniacreata.com for brand, collaboration, or business inquiries.",
    },
    {
      title: "Privacy and legal",
      description: "Use privacy@omniacreata.com for privacy, policy, or legal questions.",
    },
  ];

  return (
    <>
      <PageHero
        actions={[
          {
            href: "mailto:hello@omniacreata.com",
            label: "Email",
          },
          {
            href: withLocalePrefix(locale, "/pricing"),
            label: messages.common.viewPricing,
            variant: "secondary",
          },
        ]}
        description="Reach the Omnia Creata team for product access, pricing, partnerships, and legal questions."
        eyebrow={messages.nav.contact}
        meta={[
          { label: "General", value: "hello@omniacreata.com" },
          { label: "Partnerships", value: "partnerships@omniacreata.com" },
          { label: "Privacy", value: "privacy@omniacreata.com" },
        ]}
        title="Talk to the Omnia Creata team."
        locale={locale}
      />

      <section className="px-6 py-10 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <div className="grid gap-5">
              {contactCards.map((item, index) => (
                <Reveal key={item.title} delay={index * 80}>
                  <FeatureCard description={item.description} title={item.title} />
                </Reveal>
              ))}
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="luxury-panel gold-outline rounded-[32px] p-7 sm:p-9">
              <SectionHeader
                description="Send a short note and we will route you to the right person or product path."
                eyebrow="Send a message"
                title="Start the conversation."
              />
              <div className="mt-8">
                <ContactForm
                  copy={messages.contactForm}
                  prefill={{
                    interest: prefilledInterest,
                    message: prefilledMessage,
                  }}
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

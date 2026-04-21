import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactForm } from "@/components/forms/contact-form";
import { ButtonLink } from "@/components/ui/button";
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

  const contactRoutes = [
    {
      title: "General product and pricing",
      address: "hello@omniacreata.com",
      description:
        "Use this when you need help choosing a product, understanding access, or discussing pricing.",
    },
    {
      title: "Partnerships and business",
      address: "partnerships@omniacreata.com",
      description:
        "Use this for brand, business development, collaboration, and partnership conversations.",
    },
    {
      title: "Privacy and legal",
      address: "privacy@omniacreata.com",
      description:
        "Use this for privacy, policy, and legal requests that should not go through the product queue.",
    },
  ];

  return (
    <>
      <section className="relative px-6 pb-12 pt-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1320px]">
          <Reveal>
            <div className="grid gap-10 xl:grid-cols-[0.88fr_1.12fr] xl:items-start">
              <div className="max-w-[44rem]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-accent">
                  {messages.nav.contact}
                </p>
                <h1 className="mt-5 text-5xl font-semibold leading-[0.92] tracking-[-0.065em] text-foreground sm:text-6xl lg:text-[4.9rem]">
                  Talk to the Omnia Creata team without hunting for the right route.
                </h1>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-foreground-soft">
                  Product access, pricing, partnerships, and legal questions should all have a
                  direct path from the public site.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <ButtonLink
                    href="mailto:hello@omniacreata.com"
                    size="lg"
                    variant="primary"
                  >
                    Email
                  </ButtonLink>
                  <ButtonLink
                    href={withLocalePrefix(locale, "/pricing")}
                    size="lg"
                    variant="secondary"
                  >
                    {messages.common.viewPricing}
                  </ButtonLink>
                </div>

                <div className="mt-8 grid gap-x-4 gap-y-5 border-t border-white/[0.08] pt-6 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
                      General
                    </p>
                    <p className="text-sm font-medium leading-6 text-foreground break-all">
                      hello@omniacreata.com
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
                      Partnerships
                    </p>
                    <p className="text-sm font-medium leading-6 text-foreground break-all">
                      partnerships@omniacreata.com
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
                      Privacy
                    </p>
                    <p className="text-sm font-medium leading-6 text-foreground break-all">
                      privacy@omniacreata.com
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[36px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(16,23,31,0.92),rgba(9,13,18,0.98))] p-7 shadow-[0_26px_80px_rgba(3,10,18,0.24)] sm:p-8">
                <div className="border-b border-white/[0.08] pb-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                    Contact logic
                  </p>
                  <p className="mt-2 text-sm text-foreground-soft">
                    The form and the contact routes should make it obvious who should handle what.
                  </p>
                </div>

                <div className="mt-6 max-w-3xl">
                  <h2 className="text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-[2.3rem]">
                    Start the conversation, then we route it to the right person or product path.
                  </h2>
                  <p className="mt-4 text-base leading-8 text-foreground-soft">
                    Public communication should feel simple and human. The site should not bury the
                    form under decorative support cards or vague funnel language.
                  </p>
                </div>

                <div className="mt-8 grid gap-5 md:grid-cols-3">
                  <article className="border-t border-white/[0.08] pt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                      01
                    </p>
                    <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-foreground">
                      Product questions
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-foreground-soft">
                      Use the form or general inbox when you need help with fit, access, or pricing.
                    </p>
                  </article>
                  <article className="border-t border-white/[0.08] pt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                      02
                    </p>
                    <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-foreground">
                      Business routes
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-foreground-soft">
                      Partnership requests should go directly to the business conversation instead of a generic queue.
                    </p>
                  </article>
                  <article className="border-t border-white/[0.08] pt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                      03
                    </p>
                    <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-foreground">
                      Legal requests
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-foreground-soft">
                      Privacy and legal requests should stay direct and separate from product discovery.
                    </p>
                  </article>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-6 py-10 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-[1320px] gap-8 lg:grid-cols-[0.88fr_1.12fr]">
          <Reveal>
            <div>
              <SectionHeader
                description="Use the route that matches the request, or send a short note and we will direct it for you."
                eyebrow="Contact routes"
                title="Three direct paths"
              />
              <div className="mt-8 overflow-hidden rounded-[32px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(16,23,31,0.62),rgba(9,13,18,0.92))]">
                {contactRoutes.map((route) => (
                  <article
                    key={route.title}
                    className="border-t border-white/[0.08] px-5 py-6 first:border-t-0 md:px-6"
                  >
                    <p className="text-[11px] uppercase tracking-[0.28em] text-muted">{route.address}</p>
                    <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-foreground">
                      {route.title}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-foreground-soft">
                      {route.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="overflow-hidden rounded-[32px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(16,23,31,0.92),rgba(9,13,18,0.98))] p-7 shadow-[0_26px_80px_rgba(3,10,18,0.24)] sm:p-8">
              <SectionHeader
                description="Send a short note and we will route you to the right person or product path."
                eyebrow="Send a message"
                title="Start the conversation"
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

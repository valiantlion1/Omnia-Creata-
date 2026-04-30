import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactForm } from "@/components/forms/contact-form";
import { ButtonLink } from "@/components/ui/button";
import { getProducts } from "@/content/products";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { createPageMetadata } from "@/lib/seo";
import { isContactDeliveryConfigured } from "@/lib/server/contact-delivery";
import { studioPrimaryHref, studioPrimaryLabel, withLocalePrefix } from "@/lib/utils";

type ContactPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pickFirst(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
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
      "Talk to OmniaCreata about Studio, access, pricing, partnerships, privacy, and legal questions.",
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
  const contactFormReady = isContactDeliveryConfigured();

  const prefilledInterest = productName ? `${productName} conversation` : "";
  const prefilledMessage =
    productName || platform || intent
      ? [
          "Hello OmniaCreata team,",
          "",
          "I would like to talk about:",
          productName ? `Product: ${productName}` : "",
          platform ? `Platform: ${platform}` : "",
          intent ? `Intent: ${intent.replaceAll("_", " ")}` : "",
        ]
          .filter(Boolean)
          .join("\n")
      : "";

  const routes = [
    {
      title: "Email",
      address: "founder@omniacreata.com",
      description:
        "Studio access, pricing, billing, partnerships, privacy, and legal questions.",
    },
  ];

  return (
    <section className="site-page">
      <div className="site-page-inner">
        <div className="site-page-hero site-page-hero--compact lg:grid-cols-[0.88fr_1.12fr]">
          <div className="site-page-copy">
            <p className="site-kicker">Contact</p>
            <h1 className="site-page-title">
              Talk to <strong>OmniaCreata.</strong>
            </h1>
            <p className="site-page-lede">
              One direct path for Studio access, pricing, billing, partnerships, privacy, and legal
              questions.
            </p>

            <div className="site-page-actions">
              <ButtonLink href="mailto:founder@omniacreata.com" size="lg" variant="primary">
                Email us
              </ButtonLink>
              <ButtonLink href={studioPrimaryHref(locale)} size="lg" variant="secondary">
                {studioPrimaryLabel()}
              </ButtonLink>
            </div>
          </div>

          <div className="site-premium-card p-6 sm:p-8">
            <p className="site-kicker">Direct contact</p>
            <p className="mt-5 break-all text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">
              founder@omniacreata.com
            </p>
            <p className="mt-5 text-sm leading-7 text-foreground-soft">
              Email is always available. The form appears when delivery is connected.
            </p>
          </div>
        </div>

        <div className="site-band lg:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-4">
            <p className="site-kicker">Best path</p>
            <h2 className="site-title max-w-[10ch]">Send one clear note.</h2>
            <p className="site-copy">
              Mention Studio access, billing, partnership, privacy, legal, or product support.
            </p>
          </div>

          <div className="site-line-list">
            {routes.map((route) => (
              <article className="site-line-item" key={route.title}>
                <strong>{route.title}</strong>
                <span className="break-all text-foreground">{route.address}</span>
                <span>{route.description}</span>
              </article>
            ))}
          </div>
        </div>

        {contactFormReady ? (
          <div className="site-band lg:grid-cols-[0.82fr_1.18fr]">
            <div className="space-y-4">
              <p className="site-kicker">Contact form</p>
              <h2 className="site-title max-w-[9ch]">Use the form.</h2>
              <p className="site-copy">Short, clear, human.</p>
            </div>

            <ContactForm
              copy={messages.contactForm}
              prefill={{
                interest: prefilledInterest,
                message: prefilledMessage,
              }}
            />
          </div>
        ) : (
          <div className="site-band lg:grid-cols-[0.82fr_1.18fr]">
            <div className="space-y-4">
              <p className="site-kicker">Email path</p>
              <h2 className="site-title max-w-[9ch]">Email is the direct path.</h2>
              <p className="site-copy">
                Use the inbox for Studio, billing, privacy, legal, partnerships, and product
                questions.
              </p>
            </div>

            <article className="site-line-item">
              <strong>Email</strong>
              <span className="break-all text-foreground">founder@omniacreata.com</span>
              <div className="pt-2">
                <ButtonLink href="mailto:founder@omniacreata.com" size="lg" variant="primary">
                  Email us
                </ButtonLink>
              </div>
            </article>
          </div>
        )}

        <div className="site-band lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="site-kicker">Next step</p>
            <p className="site-copy mt-4">
              For product context, start with Studio. For access or billing, email us.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={withLocalePrefix(locale, "/products/omnia-creata-studio")} size="lg" variant="secondary">
              See Studio
            </ButtonLink>
            <ButtonLink href="mailto:founder@omniacreata.com" size="lg" variant="primary">
              Email us
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}

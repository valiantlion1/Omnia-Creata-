import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactForm } from "@/components/forms/contact-form";
import { ButtonLink } from "@/components/ui/button";
import { getProducts } from "@/content/products";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { createPageMetadata } from "@/lib/seo";
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
      "Talk to Omnia Creata about Studio, access, pricing, partnerships, privacy, and legal questions.",
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

  const prefilledInterest = productName ? `${productName} conversation` : "";
  const prefilledMessage =
    productName || platform || intent
      ? [
          "Hello Omnia Creata team,",
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
      title: "Studio",
      address: "hello@omniacreata.com",
      description: "Questions about Studio, access, and the product itself.",
    },
    {
      title: "Partnerships",
      address: "partnerships@omniacreata.com",
      description: "Collaborations, business conversations, and commercial inquiries.",
    },
    {
      title: "Privacy and legal",
      address: "privacy@omniacreata.com",
      description: "Privacy, policy, and legal matters.",
    },
  ];

  return (
    <section className="px-6 pb-12 pt-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1180px]">
        <div className="max-w-[860px] space-y-5">
          <p className="site-kicker">Contact</p>
          <h1 className="site-title max-w-[8ch]">Talk to us.</h1>
          <p className="site-copy">
            Studio, pricing, partnerships, or legal. Pick the inbox that fits, or send one note
            and we will route it.
          </p>

          <div className="flex flex-wrap gap-3">
            <ButtonLink href="mailto:hello@omniacreata.com" size="lg" variant="primary">
              Email us
            </ButtonLink>
            <ButtonLink href={studioPrimaryHref(locale)} size="lg" variant="secondary">
              {studioPrimaryLabel()}
            </ButtonLink>
          </div>
        </div>

        <div className="site-rule mt-12 grid gap-10 pt-8 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-4">
            <p className="site-kicker">Email</p>
            <h2 className="site-title max-w-[10ch]">Start with the right inbox.</h2>
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

        <div className="site-rule mt-12 grid gap-10 pt-8 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-4">
            <p className="site-kicker">Contact form</p>
            <h2 className="site-title max-w-[9ch]">Or send one note.</h2>
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

        <div className="site-rule mt-12 grid gap-6 pt-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="site-kicker">Next step</p>
            <p className="site-copy mt-4">If you want to stay in the product flow, go to Studio.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={withLocalePrefix(locale, "/products/omnia-creata-studio")} size="lg" variant="secondary">
              See Studio
            </ButtonLink>
            <ButtonLink href={studioPrimaryHref(locale)} size="lg" variant="primary">
              {studioPrimaryLabel()}
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}

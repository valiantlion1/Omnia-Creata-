import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { ContactForm } from "@/components/forms/contact-form";
import { SocialLinks } from "@/components/social/social-links";
import { ButtonLink } from "@/components/ui/button";
import { getProducts } from "@/content/products";
import { getSocialProfiles } from "@/content/social";
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

function getContactCopy(locale: string) {
  if (locale === "tr") {
    return {
      metadataTitle: "Iletisim",
      metadataDescription:
        "Studio, erisim, fiyatlandirma, ortaklik, gizlilik ve yasal konular icin OmniaCreata ile konusun.",
      productConversation: "konusmasi",
      prefillGreeting: "Merhaba OmniaCreata ekibi,",
      prefillIntro: "Sunun hakkinda konusmak istiyorum:",
      prefillProduct: "Urun",
      prefillPlatform: "Platform",
      prefillIntent: "Niyet",
      routes: [
        {
          title: "Studio",
          address: "hello@omniacreata.com",
          description: "Studio, erisim ve urunun kendisi hakkinda sorular.",
        },
        {
          title: "Ortakliklar",
          address: "partnerships@omniacreata.com",
          description: "Is birlikleri, ticari gorusmeler ve partnerlik talepleri.",
        },
        {
          title: "Gizlilik ve yasal",
          address: "privacy@omniacreata.com",
          description: "Gizlilik, politika ve yasal konular.",
        },
        {
          title: "Faturalandirma",
          address: "billing@omniacreata.com",
          description: "Odeme, iade ve faturalandirma destek talepleri.",
        },
      ],
      kicker: "Iletisim",
      title: "Konusalim.",
      copy:
        "Studio, fiyatlandirma, ortaklik veya yasal konular. Uygun inbox'i sec ya da tek not birak, biz yonlendirelim.",
      emailUs: "E-posta gonder",
      emailKicker: "E-posta",
      emailTitle: "Dogru inbox ile basla.",
      formKicker: "Iletisim formu",
      formTitle: "Ya da tek not gonder.",
      formCopy: "Kisa, net, insani.",
      nextKicker: "Sonraki adim",
      nextCopy: "Urun akisinda kalmak istiyorsan Studio'ya git.",
      socialKicker: "Sosyal",
      socialTitle: "Resmi hesaplar hazir.",
      socialCopy:
        "Instagram ve X hesaplari ana sitede tek yerden yonetilir. Resmi guncellemeleri bu kanallardan takip edebilirsin.",
      socialPending: "Link eklenecek",
      socialOpen: "Hesabi ac",
      seeStudio: "Studio'yu gor",
      studioDetails: "Studio detaylari",
    };
  }

  return {
    metadataTitle: "Contact",
    metadataDescription:
      "Talk to OmniaCreata about Studio, access, pricing, partnerships, privacy, and legal questions.",
    productConversation: "conversation",
    prefillGreeting: "Hello OmniaCreata team,",
    prefillIntro: "I would like to talk about:",
    prefillProduct: "Product",
    prefillPlatform: "Platform",
    prefillIntent: "Intent",
    routes: [
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
      {
        title: "Billing",
        address: "billing@omniacreata.com",
        description: "Payment, refund, and billing support requests.",
      },
    ],
    kicker: "Contact",
    title: "Talk to us.",
    copy:
      "Studio, pricing, partnerships, or legal. Pick the inbox that fits, or send one note and we will route it.",
    emailUs: "Email us",
    emailKicker: "Email",
    emailTitle: "Start with the right inbox.",
    formKicker: "Contact form",
    formTitle: "Or send one note.",
    formCopy: "Short, clear, human.",
    nextKicker: "Next step",
    nextCopy: "If you want to stay in the product flow, go to Studio.",
    socialKicker: "Social",
    socialTitle: "Official accounts are ready.",
    socialCopy:
      "Instagram and X are wired from one source. Follow the official channels for public updates.",
    socialPending: "Link pending",
    socialOpen: "Open profile",
    seeStudio: "See Studio",
    studioDetails: "Studio details",
  };
}

export async function generateMetadata({
  params,
}: ContactPageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  const copy = getContactCopy(locale);

  return createPageMetadata({
    locale,
    path: "/contact",
    title: copy.metadataTitle,
    description: copy.metadataDescription,
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
  const copy = getContactCopy(locale);
  const contactFormEnabled = Boolean(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY &&
      process.env.TURNSTILE_SECRET_KEY &&
      process.env.CONTACT_WEBHOOK_URL,
  );
  const query = await searchParams;
  const products = getProducts(locale);
  const productSlug = pickFirst(query.product);
  const platform = pickFirst(query.platform);
  const intent = pickFirst(query.intent);
  const productName = products.find((item) => item.slug === productSlug)?.name;
  const socialProfiles = getSocialProfiles();
  const socialLocale = locale === "tr" ? "tr" : "en";

  const prefilledInterest = productName ? `${productName} ${copy.productConversation}` : "";
  const prefilledMessage =
    productName || platform || intent
      ? [
          copy.prefillGreeting,
          "",
          copy.prefillIntro,
          productName ? `${copy.prefillProduct}: ${productName}` : "",
          platform ? `${copy.prefillPlatform}: ${platform}` : "",
          intent ? `${copy.prefillIntent}: ${intent.replaceAll("_", " ")}` : "",
        ]
          .filter(Boolean)
          .join("\n")
      : "";

  return (
    <section className="px-6 pb-12 pt-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1340px]">
        <div className="max-w-[860px] space-y-5">
          <p className="site-kicker">{copy.kicker}</p>
          <h1 className="site-title max-w-[8ch]">{copy.title}</h1>
          <p className="site-copy">{copy.copy}</p>

          <div className="flex flex-wrap gap-3">
            <ButtonLink href="mailto:hello@omniacreata.com" size="lg" variant="primary">
              {copy.emailUs}
            </ButtonLink>
            <ButtonLink href={studioPrimaryHref(locale)} size="lg" variant="secondary">
              {studioPrimaryLabel(locale)}
            </ButtonLink>
          </div>
        </div>

        <div className="site-rule mt-12 grid gap-10 pt-8 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-4">
            <p className="site-kicker">{copy.emailKicker}</p>
            <h2 className="site-title max-w-[10ch]">{copy.emailTitle}</h2>
          </div>

          <div className="site-line-list">
            {copy.routes.map((route) => (
              <Fragment key={route.title}>
                <article className="site-line-item">
                  <h3>{route.title}: </h3>
                  <a
                    className="break-all text-foreground transition hover:text-accent"
                    href={`mailto:${route.address}`}
                  >
                    {route.address}{" "}
                  </a>
                  <p>{`${route.description}\u00a0`}</p>
                  <span className="sr-only">&nbsp;</span>
                </article>
                {" "}
              </Fragment>
            ))}
          </div>
        </div>

        <div
          className="site-rule mt-12 grid gap-10 pt-8 lg:grid-cols-[0.82fr_1.18fr]"
          id="social"
        >
          <div className="space-y-4">
            <p className="site-kicker">{copy.socialKicker}</p>
            <h2 className="site-title max-w-[10ch]">{copy.socialTitle}</h2>
            <p className="site-copy">{copy.socialCopy}</p>
            <SocialLinks locale={locale} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {socialProfiles.map((profile) => (
              <article
                className="rounded-[24px] border border-[rgba(216,181,109,0.12)] bg-[rgba(255,255,255,0.03)] p-5"
                key={profile.id}
              >
                <p className="text-sm font-semibold uppercase tracking-[0.26em] text-accent">
                  {profile.label}
                </p>
                <h3 className="mt-4 text-xl font-semibold text-foreground">
                  {profile.handle}
                </h3>
                <p className="mt-4 text-sm leading-7 text-foreground-soft">
                  {profile.description[socialLocale]}
                </p>
                {profile.available ? (
                  <a
                    aria-label={profile.ariaLabel}
                    className="mt-5 inline-flex text-sm font-medium text-accent transition hover:text-accent-strong"
                    href={profile.href}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {copy.socialOpen}
                  </a>
                ) : (
                  <span className="mt-5 inline-flex text-sm font-medium text-muted">
                    {copy.socialPending}
                  </span>
                )}
              </article>
            ))}
          </div>
        </div>

        <div className="site-rule mt-12 grid gap-10 pt-8 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-4">
            <p className="site-kicker">{copy.formKicker}</p>
            <h2 className="site-title max-w-[9ch]">{copy.formTitle}</h2>
            <p className="site-copy">{copy.formCopy}</p>
          </div>

          <ContactForm
            copy={messages.contactForm}
            formEnabled={contactFormEnabled}
            prefill={{
              interest: prefilledInterest,
              message: prefilledMessage,
            }}
          />
        </div>

        <div className="site-rule mt-12 grid gap-6 pt-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="site-kicker">{copy.nextKicker}</p>
            <p className="site-copy mt-4">{copy.nextCopy}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={withLocalePrefix(locale, "/products/omnia-creata-studio")} size="lg" variant="secondary">
              {copy.studioDetails}
            </ButtonLink>
            <ButtonLink href={studioPrimaryHref(locale)} size="lg" variant="primary">
              {studioPrimaryLabel(locale)}
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}

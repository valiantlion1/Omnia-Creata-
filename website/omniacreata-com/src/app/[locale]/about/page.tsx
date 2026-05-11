import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { StudioMotionScene } from "@/components/site/studio-motion-scene";
import { ButtonLink } from "@/components/ui/button";
import { isLocale } from "@/i18n/config";
import { createPageMetadata } from "@/lib/seo";
import { withLocalePrefix } from "@/lib/utils";

type AboutPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

function getAboutCopy(locale: string) {
  if (locale === "tr") {
    return {
      metadataTitle: "Hakkinda",
      metadataDescription:
        "OmniaCreata, Studio ile baslayan gorsel uretim yazilimlari insa eder.",
      kicker: "Hakkinda",
      title: "Gorsel isler icin yaratici yazilim yapiyoruz.",
      copy:
        "Studio once gelir. Geri kalani gercek, kullanisli ve tek basina ayakta duracak kadar hazir olunca gelir.",
      seeStudio: "Studio'yu gor",
      contactUs: "Iletisime gec",
      mattersKicker: "Onemli olanlar",
      mattersTitle: "Zevk, akis ve zamanlama.",
      principles: [
        {
          title: "Zevk onemlidir",
          description:
            "Arac, isin rastgele degil bilincli gorunmesine yardim etmeli.",
        },
        {
          title: "Akis onemlidir",
          description:
            "Yon, uretim, inceleme ve tekrar kullanim ayni yuzeyde olmalidir.",
        },
        {
          title: "Zamanlama onemlidir",
          description:
            "Bes yarim urun gostermektense bir gercek urun gostermeyi tercih ederiz.",
        },
      ],
    };
  }

  return {
    metadataTitle: "About",
    metadataDescription:
      "OmniaCreata builds creative software for image work, starting with Studio.",
    kicker: "About",
    title: "We make creative software for image work.",
    copy:
      "Studio comes first. The rest can wait until it is real, useful, and ready to stand on its own.",
    seeStudio: "See Studio",
    contactUs: "Contact us",
    mattersKicker: "What matters",
    mattersTitle: "Taste, workflow, and timing.",
    principles: [
      {
        title: "Taste matters",
        description: "The tool should help the work look intentional, not generic.",
      },
      {
        title: "Workflow matters",
        description: "Direction, generation, review, and reuse belong to the same surface.",
      },
      {
        title: "Timing matters",
        description: "We would rather show one real product than five unfinished ones.",
      },
    ],
  };
}

export async function generateMetadata({
  params,
}: AboutPageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  const copy = getAboutCopy(locale);

  return createPageMetadata({
    locale,
    path: "/about",
    title: copy.metadataTitle,
    description: copy.metadataDescription,
  });
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const copy = getAboutCopy(locale);

  return (
    <section className="px-6 pb-12 pt-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1340px]">
        <div className="grid gap-10 lg:grid-cols-[0.84fr_1.16fr] lg:items-center">
          <div className="space-y-5">
            <p className="site-kicker">{copy.kicker}</p>
            <h1 className="site-title max-w-[10ch]">{copy.title}</h1>
            <p className="site-copy">{copy.copy}</p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={withLocalePrefix(locale, "/products/omnia-creata-studio")} size="lg" variant="secondary">
                {copy.seeStudio}
              </ButtonLink>
              <ButtonLink href={withLocalePrefix(locale, "/contact")} size="lg" variant="primary">
                {copy.contactUs}
              </ButtonLink>
            </div>
          </div>

          <StudioMotionScene variant="compact" />
        </div>

        <div className="site-rule mt-12 grid gap-10 pt-8 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-4">
            <p className="site-kicker">{copy.mattersKicker}</p>
            <h2 className="site-title max-w-[11ch]">{copy.mattersTitle}</h2>
          </div>

          <div className="site-line-list">
            {copy.principles.map((item) => (
              <Fragment key={item.title}>
                <article className="site-line-item">
                  <h3>{item.title} </h3>
                  <p>{`${item.description}\u00a0`}</p>
                  <span className="sr-only">&nbsp;</span>
                </article>
                {" "}
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

import { Badge, Surface } from "@/components/ui/primitives";
import { MarketingShell } from "@/components/site/marketing-shell";
import { assertLocale } from "@/lib/locale";

const copy = {
  en: {
    eyebrow: "Nolra beta FAQ",
    title: "A few clear answers before the beta grows up.",
    items: [
      {
        question: "Is Nolra only for prompts?",
        answer:
          "No. Nolra is built for prompts, ideas, notes, project thoughts, workflows, and research fragments."
      },
      {
        question: "Do I need an account to start?",
        answer:
          "No. The beta lets you start locally first, then connect account-based sync when you are ready."
      },
      {
        question: "Is AI included in the beta?",
        answer:
          "Not yet. Beta stays focused on fast capture and organization. AI assist arrives in V1."
      },
      {
        question: "Will the beta have ads?",
        answer:
          "Yes, lightly. Beta launches as a free ad-supported experience, while capture and editor stay clean."
      },
      {
        question: "Is this trying to replace Notion?",
        answer:
          "Not exactly. Nolra is meant to feel lighter, faster, and easier to understand for personal idea capture and reuse."
      },
      {
        question: "What unlocks in Pro later?",
        answer:
          "Planned V1 upgrades include no ads, higher limits, and helper AI actions for organizing and improving entries."
      }
    ]
  },
  tr: {
    eyebrow: "Nolra beta SSS",
    title: "Beta buyumeden once bazi net cevaplar.",
    items: [
      {
        question: "Nolra sadece prompt icin mi?",
        answer:
          "Hayir. Nolra prompt, fikir, not, proje dusuncesi, workflow ve arastirma kirintilari icin tasarlandi."
      },
      {
        question: "Baslamak icin hesap gerekli mi?",
        answer:
          "Hayir. Beta once lokal baslamana izin verir; hazir oldugunda hesap tabanli sync baglayabilirsin."
      },
      {
        question: "Beta icinde AI var mi?",
        answer:
          "Henuz yok. Beta hizli capture ve duzene odaklanir. AI assist V1 ile gelir."
      },
      {
        question: "Betada reklam olacak mi?",
        answer:
          "Evet, hafif sekilde. Beta ucretsiz ve reklam destekli cikacak; capture ve editor ekranlari temiz kalacak."
      },
      {
        question: "Bu Notion'in yerine mi gecmek istiyor?",
        answer:
          "Tam olarak degil. Nolra, kisisel fikir yakalama ve tekrar kullanim icin daha hafif, hizli ve anlasilir hissettirmeyi hedefliyor."
      },
      {
        question: "Pro sonra ne acacak?",
        answer:
          "Planlanan V1 avantajlari reklamsiz kullanim, daha yuksek limitler ve kayitlari duzenleyen AI yardimlaridir."
      }
    ]
  }
} as const;

export default async function FaqPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale = assertLocale(locale);
  const content = copy[safeLocale];

  return (
    <MarketingShell locale={safeLocale}>
      <section className="mx-auto max-w-5xl space-y-8 px-4 py-14 md:px-6 lg:py-20">
        <div className="space-y-4 text-center">
          <Badge tone="accent">{content.eyebrow}</Badge>
          <h1 className="font-display text-5xl tracking-[-0.06em] text-[var(--text-primary)]">
            {content.title}
          </h1>
        </div>
        <div className="space-y-4">
          {content.items.map((item) => (
            <Surface key={item.question} className="space-y-3 p-6">
              <h2 className="font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                {item.question}
              </h2>
              <p className="text-sm leading-7 text-[var(--text-secondary)]">
                {item.answer}
              </p>
            </Surface>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}


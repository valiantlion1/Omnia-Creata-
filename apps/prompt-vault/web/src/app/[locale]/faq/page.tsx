import { Badge, Surface } from "@/components/ui/primitives";
import { MarketingShell } from "@/components/site/marketing-shell";
import { assertLocale } from "@/lib/locale";

const copy = {
  en: {
    eyebrow: "OmniaPrompt FAQ",
    title: "Clear answers before you start using the app.",
    items: [
      {
        question: "Is OmniaPrompt only for prompts?",
        answer:
          "No. OmniaPrompt is built for prompts, ideas, notes, project thoughts, workflows, and research fragments."
      },
      {
        question: "Do I need an account to start?",
        answer:
          "No. You can start locally first, then connect account-based sync when it is available and useful to you."
      },
      {
        question: "Is AI included?",
        answer:
          "AI help is optional and appears only when it is available. The core app works without it."
      },
      {
        question: "Will the free plan have ads?",
        answer:
          "It may. If sponsor messages are enabled, they stay away from the capture and editor screens."
      },
      {
        question: "Is this trying to replace Notion?",
        answer:
          "Not exactly. OmniaPrompt is meant to feel lighter, faster, and easier to understand for personal idea capture and reuse."
      },
      {
        question: "What unlocks in Pro later?",
        answer:
          "Potential paid upgrades include higher limits, stronger sync, and AI-assisted cleanup. The app will explain paid features before any charge."
      }
    ]
  },
  tr: {
    eyebrow: "OmniaPrompt SSS",
    title: "Kullanmaya baslamadan once net cevaplar.",
    items: [
      {
        question: "OmniaPrompt sadece prompt icin mi?",
        answer:
          "Hayir. OmniaPrompt prompt, fikir, not, proje dusuncesi, workflow ve arastirma kirintilari icin tasarlandi."
      },
      {
        question: "Baslamak icin hesap gerekli mi?",
        answer:
          "Hayir. Once yerel baslayabilir, hesap esitlemesi kullanima acildiginda ve sana lazim oldugunda baglayabilirsin."
      },
      {
        question: "AI dahil mi?",
        answer:
          "AI yardimi opsiyoneldir ve yalnizca kullanima acildiginda gorunur. Cekirdek uygulama onsuz da calisir."
      },
      {
        question: "Ucretsiz planda reklam olacak mi?",
        answer:
          "Olabilir. Sponsor mesajlari acilirsa capture ve editor alanlarindan uzak tutulur."
      },
      {
        question: "Bu Notion'in yerine mi gecmek istiyor?",
        answer:
          "Tam olarak degil. OmniaPrompt, kisisel fikir yakalama ve tekrar kullanim icin daha hafif, hizli ve anlasilir hissettirmeyi hedefliyor."
      },
      {
        question: "Pro sonra ne acacak?",
        answer:
          "Olasi ucretli avantajlar daha yuksek limitler, daha guclu sync ve AI destekli duzenleme olabilir. Ucretli ozellikler her zaman odemeden once acikca anlatilir."
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


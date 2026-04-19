import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Printer } from 'lucide-react'

import { AppPage, LegalFooter } from '@/components/StudioPrimitives'
import { LEGAL_PRELAUNCH_DISCLOSURE, resolveLegalPlaceholder } from '@/lib/legalConfig'
import { useStudioAuth } from '@/lib/studioAuth'
import { usePageMeta } from '@/lib/usePageMeta'

export type LegalTocItem = { id: string; title: string }

type LegalPageProps = {
  title: string
  subtitle?: string
  lastUpdated: string
  effectiveDate?: string
  summary?: string
  toc: LegalTocItem[]
  children: ReactNode
  metaTitle?: string
  metaDescription?: string
}

const LEGAL_NAV: Array<{ to: string; label: string }> = [
  { to: '/legal/terms', label: 'Terms of Service' },
  { to: '/legal/privacy', label: 'Privacy Policy' },
  { to: '/legal/refunds', label: 'Refund Policy' },
  { to: '/legal/acceptable-use', label: 'Acceptable Use' },
  { to: '/legal/cookies', label: 'Cookie Policy' },
]

const LEGAL_TEXT_REPLACEMENTS: ReadonlyArray<readonly [string, string]> = [
  ['&ldquo;', '"'],
  ['&rdquo;', '"'],
  ['&lsquo;', "'"],
  ['&rsquo;', "'"],
  ['&mdash;', '-'],
  ['&ndash;', '-'],
]

function normalizeLegalText(text: string) {
  return LEGAL_TEXT_REPLACEMENTS.reduce(
    (normalized, [searchValue, replaceValue]) => normalized.replaceAll(searchValue, replaceValue),
    text,
  )
}

export function LegalPage({
  title,
  subtitle,
  lastUpdated,
  effectiveDate,
  summary,
  toc,
  children,
  metaTitle,
  metaDescription,
}: LegalPageProps) {
  const location = useLocation()
  const { auth, isAuthenticated, isAuthSyncing, isLoading } = useStudioAuth()
  const canRenderWithShell = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest
  const normalizedTitle = normalizeLegalText(title)
  const normalizedSubtitle = subtitle ? normalizeLegalText(subtitle) : undefined
  const normalizedSummary = summary ? normalizeLegalText(summary) : undefined
  const normalizedLastUpdated = normalizeLegalText(lastUpdated)
  const normalizedEffectiveDate = effectiveDate ? normalizeLegalText(effectiveDate) : undefined

  usePageMeta(
    normalizeLegalText(metaTitle ?? `${normalizedTitle} - Omnia Creata Studio`),
    normalizeLegalText(metaDescription ?? normalizedSummary ?? `${normalizedTitle} for Omnia Creata Studio.`),
  )

  return (
    <>
      {!canRenderWithShell && (
        <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#07111a]/90 backdrop-blur-xl print:hidden">
          <div className="mx-auto flex max-w-[1380px] items-center justify-between px-5 py-4 md:px-8">
            <Link to="/landing" className="flex items-center gap-3">
              <img src="/omnia-crest.png" alt="Omnia Creata" className="h-8 w-8 object-contain" />
              <div>
                <div className="text-sm font-semibold tracking-[0.22em] text-zinc-100">OMNIA CREATA</div>
                <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Studio</div>
              </div>
            </Link>
            <nav className="flex items-center gap-5 text-sm text-zinc-300">
              <Link to="/explore" className="transition hover:text-white">Explore</Link>
              <Link to="/subscription" className="transition hover:text-white">Pricing</Link>
              <Link to="/help" className="transition hover:text-white">Help</Link>
              <Link to="/login" className="transition hover:text-white">Log in</Link>
              <Link
                to="/signup"
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:scale-105 active:scale-95"
              >
                Create account
              </Link>
            </nav>
          </div>
        </header>
      )}

      <AppPage className="max-w-[1180px] gap-8 py-10">
        <nav className="flex flex-wrap items-center gap-1.5 print:hidden" aria-label="Legal documents">
          {LEGAL_NAV.map((item) => {
            const active = location.pathname.startsWith(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-full px-3 py-1 text-[11.5px] font-medium transition-colors ${
                  active
                    ? 'bg-white text-black'
                    : 'bg-white/[0.04] text-zinc-400 ring-1 ring-white/[0.06] hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                {normalizeLegalText(item.label)}
              </Link>
            )
          })}
        </nav>

        <header className="border-b border-white/[0.06] pb-8">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Legal
          </div>
          <h1 className="mt-2 text-[32px] font-semibold tracking-tight text-white md:text-[38px]">
            {normalizedTitle}
          </h1>
          {normalizedSubtitle ? (
            <p className="mt-3 max-w-3xl text-[14.5px] leading-[1.75] text-zinc-400">{normalizedSubtitle}</p>
          ) : null}
          <div className="mt-5 flex flex-wrap items-center gap-4 text-[11.5px] text-zinc-500">
            <span>
              Last updated: <span className="text-zinc-300">{normalizedLastUpdated}</span>
            </span>
            {normalizedEffectiveDate ? (
              <>
                <span className="text-zinc-700">|</span>
                <span>
                  Effective: <span className="text-zinc-300">{normalizedEffectiveDate}</span>
                </span>
              </>
            ) : null}
            <span className="text-zinc-700">|</span>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 text-zinc-500 transition hover:text-zinc-200 print:hidden"
            >
              <Printer className="h-3 w-3" />
              Print
            </button>
          </div>
          {normalizedSummary ? (
            <div className="mt-6 rounded-[12px] border border-white/[0.06] bg-[#0c0d12] p-4 print:border-zinc-400">
              <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Plain-language summary
              </div>
              <div className="text-[13.5px] leading-[1.75] text-zinc-300">{normalizedSummary}</div>
            </div>
          ) : null}
          <div className="mt-3 rounded-[12px] border border-amber-400/15 bg-amber-400/[0.08] p-4 print:border-zinc-400">
            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-amber-200">
              Business status
            </div>
            <div className="text-[13.5px] leading-[1.75] text-amber-50/90">
              {normalizeLegalText(LEGAL_PRELAUNCH_DISCLOSURE)}
            </div>
          </div>
        </header>

        <div className="grid items-start gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="hidden lg:block sticky top-24 print:hidden">
            <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
              Contents
            </div>
            <nav className="space-y-0.5 rounded-[12px] border border-white/[0.04] bg-[#0c0d12] p-1.5">
              {toc.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block rounded-[8px] px-3 py-1.5 text-[12px] font-medium text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-white"
                >
                  {normalizeLegalText(item.title)}
                </a>
              ))}
            </nav>
          </aside>

          <article className="legal-prose text-[14.5px] leading-[1.8] text-zinc-300">{children}</article>
        </div>

        {!canRenderWithShell ? <LegalFooter /> : null}
      </AppPage>
    </>
  )
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-28 border-b border-white/[0.04] pb-10 pt-2 first:pt-0 last:border-b-0">
      <h2 className="text-[20px] font-semibold tracking-tight text-white md:text-[22px]">
        {normalizeLegalText(title)}
      </h2>
      <div className="mt-4 space-y-4 text-zinc-400">{children}</div>
    </section>
  )
}

export function LegalSubsection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-5 space-y-3">
      <h3 className="text-[15px] font-semibold text-white">{normalizeLegalText(title)}</h3>
      <div className="space-y-3 text-zinc-400">{children}</div>
    </div>
  )
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="ml-1 space-y-2 text-zinc-400">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-[9px] inline-block h-1 w-1 shrink-0 rounded-full bg-zinc-500" />
          <span>{typeof item === 'string' ? normalizeLegalText(item) : item}</span>
        </li>
      ))}
    </ul>
  )
}

export function LegalPlaceholder({ children }: { children: ReactNode }) {
  const resolved = typeof children === 'string' ? resolveLegalPlaceholder(children) : null
  const stringContent =
    typeof resolved === 'string' ? resolved : typeof children === 'string' ? children : null
  const content = stringContent ? normalizeLegalText(stringContent) : resolved ?? children
  const isEmail = typeof content === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(content)
  const isInternalPath = typeof content === 'string' && content.startsWith('/')

  return (
    <span className="font-medium text-amber-100 underline decoration-amber-200/25 underline-offset-[3px]">
      {isEmail ? (
        <a href={`mailto:${content}`} className="transition hover:text-white">
          {content}
        </a>
      ) : isInternalPath ? (
        <Link to={content} className="transition hover:text-white">
          {content}
        </Link>
      ) : (
        content
      )}
    </span>
  )
}

import { useState, type ElementType } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, FileText, HelpCircle, Lock, Mail, ShieldAlert, ShieldCheck, Sparkles } from 'lucide-react'

import { useStudioAuth } from '@/lib/studioAuth'
import { AppPage, LegalFooter } from '@/components/StudioPrimitives'

type HelpItem = { title: string; body: string }
type HelpSectionId = 'getting-started' | 'faq' | 'safety' | 'terms' | 'privacy' | 'usage-policy' | 'contact'
type HelpSection = { id: HelpSectionId; label: string; title: string; intro: string; lastUpdated?: string; items: HelpItem[] }

const sections: HelpSection[] = [
  {
    id: 'getting-started',
    label: 'Getting started',
    title: 'How Studio works right now',
    intro: 'Studio brings Explore, Create, Chat, Library, and account controls into one creative workspace.',
    items: [
      { title: 'Explore', body: 'Browse public creations, creator profiles, and style references. Public browsing stays open even if you are not signed in.' },
      { title: 'Create', body: 'Write a prompt, choose a quality, pick a format, and start an image run. Create is the deterministic image surface and stays separate from Chat.' },
      { title: 'Chat', body: 'Use Chat as the creative copilot for direction, refinement, and edit handoffs. It can carry selected images in for critique or follow-up editing, but it is not the same surface as Create.' },
      { title: 'Library', body: 'Completed, blocked, failed, and deleted outputs are surfaced separately so the shell does not pretend every run delivered a successful final image.' },
      { title: 'Projects and sharing', body: 'Projects keep related image sets together. Public or private state depends on the current truth of each post and asset, not on shell shortcuts alone.' },
      { title: 'Plans and settings', body: 'Billing, visibility, diagnostics, and account controls appear where they are available for your account.' },
    ],
  },
  {
    id: 'faq',
    label: 'FAQ',
    title: 'Common questions',
    intro: 'Quick answers based on the current Studio shell.',
    items: [
      { title: 'Do I need an account?', body: 'Not for public browsing. You do need an account for Create, Chat, Library, and other signed-in surfaces.' },
      { title: 'Is pricing final?', body: 'Plan and credit amounts come from the live catalog for your environment and can change over time.' },
      { title: 'How do credits work?', body: 'Metered accounts spend credits according to the active generation lane. Internal owner accounts may show protected-beta access instead of normal customer metering.' },
      { title: 'Can I use outputs commercially?', body: 'Review your current plan and policy language before using outputs for paid or client work.' },
      { title: 'Can I keep work private?', body: 'Yes, where the shell and account state allow it. Visibility controls follow the real post and profile truth, and blocked or deleted items are not treated like ordinary public assets.' },
      { title: 'How do I delete my account?', body: 'Account deletion currently remains a support-assisted path. Reach out before assuming instant self-serve deletion is available for your account.' },
      { title: 'Is there an API?', body: 'No public API is part of the current Studio launch scope.' },
    ],
  },
  {
    id: 'safety',
    label: 'Safety',
    title: 'Safety and moderation',
    intro: 'Studio should keep moderation and blocked states visible instead of masking them as success.',
    items: [
      { title: 'Blocked outputs stay blocked', body: 'If a prompt or output is blocked, Studio should show that honestly instead of presenting it like a successful render.' },
      { title: 'What is not allowed', body: 'Violence, exploitation, hate speech, harassment, illegal content, non-consensual intimate imagery, and attempts to bypass safety systems are not allowed.' },
      { title: 'Real people and likeness', body: 'Do not use Studio to create deceptive, abusive, or non-consensual depictions of real people.' },
      { title: 'Minor safety', body: 'Any unsafe content involving minors is prohibited and escalated immediately.' },
      { title: 'Rights and ownership', body: 'Respect copyright, trademark, and likeness rights. Do not use Studio to mass-copy protected works or impersonate creators.' },
      { title: 'Reporting', body: 'If something looks unsafe or abusive, contact safety@omniacreata.com and include the relevant link or context.' },
    ],
  },
  {
    id: 'terms',
    label: 'Terms of Service',
    title: 'Studio Terms Snapshot',
    lastUpdated: 'April 2026',
    intro: 'This is a short summary of how Studio operates today.',
    items: [
      { title: '1. Launch status', body: 'Studio is live but still evolving. Features, models, plan packaging, and shell behavior may change as the product matures.' },
      { title: '2. Account responsibility', body: 'Keep control of your sign-in method and do not share access. You are responsible for activity that runs through your workspace.' },
      { title: '3. Output responsibility', body: 'You are responsible for how you use prompts, uploads, and outputs. Studio can help create media, but it does not replace your own review for rights, suitability, or client use.' },
      { title: '4. Availability and suspension', body: 'We may limit, block, or suspend access where safety, abuse, billing, or platform integrity requires it. Live access is not a guarantee of uninterrupted service.' },
    ],
  },
  {
    id: 'privacy',
    label: 'Privacy',
    title: 'Studio Privacy Snapshot',
    lastUpdated: 'April 2026',
    intro: 'Studio stores the information needed to run the product, keep your account working, and preserve your workspace.',
    items: [
      { title: '1. What we keep', body: 'Studio stores account identity, prompts, uploads, chat history, generated assets, and the operational metadata needed to run those workflows.' },
      { title: '2. Why we keep it', body: 'We use that data to authenticate you, run Create and Chat, maintain your library, support billing and safety checks, and improve product reliability.' },
      { title: '3. Visibility controls', body: 'Public and private state is part of the product truth. Public work can appear in Explore and profile surfaces; private work should stay out of those surfaces unless the state changes.' },
      { title: '4. Export and deletion', body: 'Export and deletion paths exist, but some account-level destructive actions are still support-assisted.' },
      { title: '5. Security', body: 'We aim to keep account and asset data protected in transit and at rest, but no live creative platform should be treated as zero-risk or as a substitute for your own security judgment.' },
    ],
  },
  {
    id: 'usage-policy',
    label: 'Usage Policy',
    title: 'Studio Usage Rules',
    lastUpdated: 'April 2026',
    intro: 'These rules apply in the live product today.',
    items: [
      { title: '1. Unsafe content', body: 'Do not use Studio for sexual exploitation, child abuse material, graphic violence, harassment, hate content, or illegal activity.' },
      { title: '2. Deception and deepfakes', body: 'Do not use Studio to create deceptive real-person imagery, disinformation, or non-consensual manipulations.' },
      { title: '3. Rights abuse', body: 'Do not intentionally mass-copy copyrighted works, protected characters, or trademarks without permission.' },
      { title: '4. Technical abuse', body: 'Do not attack, scrape, automate against, or try to bypass the platform in unsupported ways.' },
      { title: '5. Enforcement', body: 'Prompts or outputs may be blocked, hidden, removed, or escalated when they violate policy or threaten platform safety.' },
    ],
  },
  {
    id: 'contact',
    label: 'Contact',
    title: 'Get in touch',
    intro: 'We are here to help.',
    items: [
      { title: 'Support', body: 'Questions, bug reports, or account help: support@omniacreata.com.' },
      { title: 'Safety reports', body: 'Unsafe content, abuse, or moderation concerns: safety@omniacreata.com.' },
      { title: 'Business', body: 'Partnership, pilot, or early team access requests: business@omniacreata.com.' },
      { title: 'Legal and policy', body: 'Policy or legal questions: legal@omniacreata.com.' },
    ],
  },
]

const sectionIcons: Record<HelpSectionId, ElementType> = {
  'getting-started': Sparkles,
  'faq': HelpCircle,
  'safety': ShieldCheck,
  'terms': FileText,
  'privacy': Lock,
  'usage-policy': ShieldAlert,
  'contact': Mail,
}

function AccordionItem({ item, defaultOpen = false }: { item: HelpItem; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-white/[0.04] last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="group flex w-full items-center justify-between gap-4 py-4 text-left transition hover:bg-white/[0.02]"
      >
        <div className="text-sm font-medium text-zinc-200 transition group-hover:text-white">{item.title}</div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-500 transition duration-300 ${open ? 'rotate-180 text-white' : ''}`} />
      </button>
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? '400px' : '0', opacity: open ? 1 : 0 }}
      >
        <div className="pb-5 pr-8 text-[14px] leading-[1.8] text-zinc-400">{item.body}</div>
      </div>
    </div>
  )
}

export default function DocumentationPage() {
  const { auth, isAuthenticated, isAuthSyncing, isLoading } = useStudioAuth()
  const canRenderWithShell = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest

  return (
    <>
      {!canRenderWithShell && (
        <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#07111a]/90 backdrop-blur-xl">
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
              <Link to="/help" className="text-white font-medium">Help</Link>
              <Link to="/login" className="transition hover:text-white">Log in</Link>
              <Link to="/signup" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)]">Create account</Link>
            </nav>
          </div>
        </header>
      )}

      <AppPage className="max-w-[1200px] gap-10 py-10">
        <section className="relative overflow-hidden rounded-[32px] border border-white/[0.06] bg-[#111216] p-10 shadow-[0_24px_80px_rgba(0,0,0,0.5)] md:p-14">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.04),transparent_50%)]" />
          <div className="relative z-10 max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[rgb(var(--primary-light)/0.3)] bg-[rgb(var(--primary-light)/0.1)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-[rgb(var(--primary-light))] backdrop-blur-md">
              Help & policy
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl text-balance break-words">
              Help that stays grounded
            </h1>
            <p className="mt-6 max-w-2xl text-[16px] leading-[1.8] text-zinc-400">
              Use this page for product basics, account questions, and the current policy snapshots.
            </p>
          </div>
        </section>

        <div className="mt-6 grid items-start gap-12 xl:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="hidden xl:block sticky top-28 w-full">
            <div className="space-y-1 rounded-[20px] border border-white/[0.04] bg-[#111216]/50 p-2 backdrop-blur-md">
              {sections.map((section) => {
                const Icon = sectionIcons[section.id]
                return (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-zinc-400 transition-all hover:bg-white/[0.04] hover:text-white active:scale-[0.98]"
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-70" />
                    {section.label}
                  </a>
                )
              })}
            </div>
          </aside>

          <div className="space-y-16 lg:space-y-24">
            {sections.map((section) => {
              const Icon = sectionIcons[section.id]
              const isPolicySection = section.id === 'terms' || section.id === 'privacy' || section.id === 'usage-policy'

              return (
                <section key={section.id} id={section.id} className="scroll-mt-32">
                  <div className="flex items-start gap-4 md:items-center">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#111216] ring-1 ring-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                      <Icon className="h-5 w-5 text-zinc-300" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[rgb(var(--primary-light))]">
                        {section.label}
                      </div>
                      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                        {section.title}
                      </h2>
                    </div>
                  </div>

                  {section.lastUpdated ? (
                    <div className="mt-4 text-[12px] font-medium text-zinc-500">
                      Last updated: {section.lastUpdated}
                    </div>
                  ) : null}

                  <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-zinc-400">
                    {section.intro}
                  </p>

                  <div className="mt-8">
                    {isPolicySection ? (
                      <div className="rounded-[20px] border border-white/[0.06] bg-[#0c0d12]/50 px-6 backdrop-blur-md">
                        {section.items.map((item, index) => (
                          <AccordionItem key={item.title} item={item} defaultOpen={index === 0} />
                        ))}
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {section.items.map((item) => (
                          <div key={item.title} className="group rounded-[20px] border border-white/[0.04] bg-[#111216]/50 p-6 transition-all hover:bg-[#111216] hover:border-white/[0.08]">
                            <div className="text-[15px] font-semibold text-white transition group-hover:text-[rgb(var(--primary-light))]">{item.title}</div>
                            <div className="mt-2.5 text-[14px] leading-[1.7] text-zinc-400">{item.body}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        </div>

        {!canRenderWithShell ? <LegalFooter /> : null}
      </AppPage>
    </>
  )
}

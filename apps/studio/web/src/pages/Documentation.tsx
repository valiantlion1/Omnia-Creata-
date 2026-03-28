import { useStudioAuth } from '@/lib/studioAuth'
import { AppPage, LegalFooter, StatusPill } from '@/components/StudioPrimitives'

type HelpSection = {
  id: string
  label: string
  title: string
  intro: string
  items: Array<{ title: string; body: string }>
}

const sections: HelpSection[] = [
  {
    id: 'getting-started',
    label: 'Getting started',
    title: 'Start with the surfaces that matter.',
    intro: 'OmniaCreata keeps the core flow simple: browse, compose, chat, and keep the results organized.',
    items: [
      {
        title: 'Explore',
        body: 'Browse public work, trending directions, and style-driven examples before you start making your own.',
      },
      {
        title: 'Compose',
        body: 'Write the prompt, pick the model, choose the ratio, and generate without a crowded control panel.',
      },
      {
        title: 'Chat',
        body: 'Use Chat when you want prompt help, edit direction, or a more guided creative workflow.',
      },
      {
        title: 'Library',
        body: 'My Images, Collections, Favorites, and Trash keep every result tied to your account and easy to revisit.',
      },
    ],
  },
  {
    id: 'faq',
    label: 'FAQ',
    title: 'Common questions',
    intro: 'Short answers for the questions people usually ask before they trust a new creative platform.',
    items: [
      {
        title: 'Do I need an account to look around?',
        body: 'No. Landing, Help, Explore, and public profiles can be viewed before you sign up.',
      },
      {
        title: 'What requires sign in?',
        body: 'Compose, Chat, personal Library areas, Subscription, Account, and private settings require an account.',
      },
      {
        title: 'Can I keep my work private?',
        body: 'Yes. You can choose public or private visibility and adjust the default behavior for new work.',
      },
    ],
  },
  {
    id: 'safety',
    label: 'Safety',
    title: 'Safety and platform boundaries',
    intro: 'We want strong creative freedom without turning the product into a legal or abuse magnet.',
    items: [
      {
        title: 'Moderation',
        body: 'Generation and account systems may be limited, reviewed, or blocked when usage crosses policy or safety boundaries.',
      },
      {
        title: 'Rights and ownership',
        body: 'Respect brand, face, copyright, and third-party rights when you upload references or generate deliverables.',
      },
      {
        title: 'Account responsibility',
        body: 'You are responsible for activity tied to your account, including shared links and public visibility settings.',
      },
    ],
  },
  {
    id: 'terms',
    label: 'Terms',
    title: 'Terms of use',
    intro: 'This is the publishable structure for now. The final legal pass will be tightened closer to launch.',
    items: [
      {
        title: 'Access',
        body: 'Access is provided according to your current plan, credits, and any platform restrictions that may apply.',
      },
      {
        title: 'Availability',
        body: 'Models, quotas, speed, and product behavior can change as the platform improves or as infrastructure changes.',
      },
      {
        title: 'Enforcement',
        body: 'Accounts, features, and content access may be limited when policy, payment, or abuse rules are violated.',
      },
    ],
  },
  {
    id: 'privacy',
    label: 'Privacy',
    title: 'Privacy',
    intro: 'Your account needs some stored data to function, but private creative work should never feel casually exposed.',
    items: [
      {
        title: 'Account data',
        body: 'We store the details needed for authentication, access control, billing state, projects, and media history.',
      },
      {
        title: 'Files and generations',
        body: 'Uploads and generated outputs can be stored so your work stays available in Library and project history.',
      },
      {
        title: 'Control',
        body: 'Visibility, retention, and deletion controls should stay visible and understandable inside the product.',
      },
    ],
  },
  {
    id: 'usage-policy',
    label: 'Usage policy',
    title: 'Usage policy',
    intro: 'The product is for legitimate creative work, not for abuse, deception, or harmful automation.',
    items: [
      {
        title: 'Unsafe or unlawful use',
        body: 'Do not use OmniaCreata for illegal, abusive, deceptive, exploitative, or harmful content workflows.',
      },
      {
        title: 'Sensitive content',
        body: 'Content involving sexual material, minors, impersonation, or unsafe real-person editing may be restricted or blocked.',
      },
      {
        title: 'Platform protection',
        body: 'We may apply moderation, access limits, and provider restrictions to protect users, infrastructure, and legal safety.',
      },
    ],
  },
  {
    id: 'contact',
    label: 'Contact',
    title: 'Need help?',
    intro: 'If something feels broken, confusing, or risky, this is where support and policy escalation will live.',
    items: [
      {
        title: 'Product help',
        body: 'Use Help for guidance first. Support and direct contact flows will be expanded as launch gets closer.',
      },
      {
        title: 'Policy issues',
        body: 'Suspected abuse, access issues, or account problems should be surfaced through the support path once it is live.',
      },
    ],
  },
]

export default function DocumentationPage() {
  const { auth, isAuthenticated, isAuthSyncing, isLoading } = useStudioAuth()
  const canRenderWithShell = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest

  return (
    <AppPage className="max-w-[1380px] gap-10 py-8">
      <section className="border-b border-white/[0.06] pb-8">
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill tone="neutral">Public help</StatusPill>
          <StatusPill tone="brand">Launch-ready structure</StatusPill>
        </div>
        <div className="mt-5 max-w-4xl">
          <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-600">Help</div>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
            The essential guide to how OmniaCreata works.
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-400">
            Help stays public on purpose. People should be able to understand the product, its boundaries, and its policies before they ever create an account.
          </p>
        </div>
      </section>

      <div className="grid gap-10 xl:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="xl:sticky xl:top-10 xl:h-fit">
          <div className="space-y-1 border-l border-white/[0.06] pl-4">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="block py-1.5 text-sm text-zinc-500 transition hover:text-white"
              >
                {section.label}
              </a>
            ))}
          </div>
        </aside>

        <div className="space-y-12">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="border-b border-white/[0.06] pb-10 last:border-b-0">
              <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-600">{section.label}</div>
              <div className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">{section.title}</div>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">{section.intro}</p>
              <div className="mt-6 divide-y divide-white/[0.06]">
                {section.items.map((item) => (
                  <div key={item.title} className="grid gap-3 py-4 md:grid-cols-[220px_minmax(0,1fr)] md:gap-8">
                    <div className="text-sm font-medium text-white">{item.title}</div>
                    <div className="text-sm leading-7 text-zinc-400">{item.body}</div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {!canRenderWithShell ? <LegalFooter /> : null}
    </AppPage>
  )
}

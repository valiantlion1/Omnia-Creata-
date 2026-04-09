import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'

import { useStudioAuth } from '@/lib/studioAuth'
import { AppPage, LegalFooter } from '@/components/StudioPrimitives'

type HelpItem = { title: string; body: string }
type HelpSection = { id: string; label: string; title: string; intro: string; lastUpdated?: string; items: HelpItem[] }

const sections: HelpSection[] = [
  {
    id: 'getting-started',
    label: 'Getting started',
    title: 'How it works',
    intro: 'OmniaCreata is an AI image studio. Browse, create, chat, and organize — all in one place.',
    items: [
      { title: 'Explore', body: 'Browse public creations, trending styles, and community work. No account needed.' },
      { title: 'Create', body: 'Describe what you want, and we\'ll generate it. You can fine-tune settings like aspect ratio and model if you want, or just hit Generate.' },
      { title: 'Chat', body: 'Have a conversation with AI to get prompt ideas, refine images, or explore creative directions. You can upload photos and ask for edits right in the chat.' },
      { title: 'Library', body: 'All your images are saved automatically. Organize them into collections, mark favorites, and manage everything from one place.' },
      { title: 'Profile', body: 'Your public portfolio. Choose what to share and what stays private.' },
      { title: 'Plans', body: 'See pricing, compare plans, and manage your subscription anytime.' },
    ],
  },
  {
    id: 'faq',
    label: 'FAQ',
    title: 'Common questions',
    intro: 'Quick answers to the things people ask most.',
    items: [
      { title: 'Do I need an account?', body: 'Not to browse. You can explore public work and read about pricing without signing up. Creating images requires a free account.' },
      { title: 'Is it free?', body: 'Yes — free accounts get a monthly credit allowance. Paid plans include more credits and features like commercial usage rights.' },
      { title: 'How do credits work?', body: 'Each image costs a few credits depending on the model and quality. Your credits reset monthly, and you can always upgrade for more.' },
      { title: 'Can I use images commercially?', body: 'Pro and Creator plans include commercial rights. Free tier images are for personal use. Check the Usage Policy for details.' },
      { title: 'Can I keep my work private?', body: 'Absolutely. Set any image as private, or change your default visibility in Settings.' },
      { title: 'How do I delete my account?', body: 'Go to Settings → Account → Delete Account. All your data will be permanently removed within 30 days.' },
      { title: 'Is there an API?', body: 'Coming soon for Creator plan members. Join the waitlist from your dashboard.' },
    ],
  },
  {
    id: 'safety',
    label: 'Safety',
    title: 'Safety & moderation',
    intro: 'We take content safety seriously. Here\'s how we keep the platform safe for everyone.',
    items: [
      { title: 'Content moderation', body: 'All generated content goes through automated safety checks. Violations may be flagged, blocked, or removed.' },
      { title: 'What\'s not allowed', body: 'Violence, exploitation, hate speech, harassment, illegal content, and non-consensual intimate imagery are strictly prohibited.' },
      { title: 'Intellectual property', body: 'Respect copyrights, trademarks, and likeness rights. Don\'t create content designed to infringe on others\' work.' },
      { title: 'Deepfakes', body: 'Creating realistic depictions of real people without their consent is prohibited.' },
      { title: 'Minor safety', body: 'Any content involving minors in inappropriate contexts is absolutely prohibited and will result in immediate, permanent action.' },
      { title: 'Reporting', body: 'See something wrong? Report it through the app or email safety@omniacreata.com. We investigate every report.' },
    ],
  },
  {
    id: 'terms',
    label: 'Terms of Service',
    title: 'Terms of Service',
    lastUpdated: 'April 2026',
    intro: 'By using OmniaCreata, you agree to these terms.',
    items: [
      { title: '1. Acceptance', body: 'By creating an account or using OmniaCreata, you agree to these Terms, our Privacy Policy, and our Usage Policy.' },
      { title: '2. Eligibility', body: 'You must be at least 18 years old to use the Service.' },
      { title: '3. Your Account', body: 'You\'re responsible for keeping your login secure and for all activity on your account.' },
      { title: '4. The Service', body: 'OmniaCreata provides AI image generation, creative chat, image library management, public galleries, and subscription management.' },
      { title: '5. Credits & Billing', body: 'Image generation uses credits. Free accounts get a monthly allowance. Paid plans offer more credits and features. Purchases are non-refundable except where required by law.' },
      { title: '6. Content Ownership', body: 'You own your prompts and uploads. Generated images are licensed to you based on your plan tier. Free outputs are for personal use; Pro/Creator outputs include commercial rights.' },
      { title: '7. Acceptable Use', body: 'Use the platform responsibly and in compliance with applicable laws and our Usage Policy.' },
      { title: '8. Availability', body: 'We aim for high availability but can\'t guarantee uninterrupted access. Features and models may change as the platform evolves.' },
      { title: '9. Termination', body: 'We may suspend accounts that violate these terms. You can delete your account anytime from Settings.' },
      { title: '10. Liability', body: 'To the extent permitted by law, we\'re not liable for indirect or consequential damages from using the Service.' },
      { title: '11. Changes', body: 'We may update these terms. We\'ll notify you of significant changes. Continued use means acceptance.' },
    ],
  },
  {
    id: 'privacy',
    label: 'Privacy',
    title: 'Privacy Policy',
    lastUpdated: 'April 2026',
    intro: 'How we handle your data.',
    items: [
      { title: '1. What We Collect', body: 'Account info (name, email), profile details, prompts, uploaded images, and billing info for paid plans.' },
      { title: '2. Automatic Data', body: 'Device info, IP address, usage patterns, and error logs to help us improve the service.' },
      { title: '3. How We Use It', body: 'To run the service, process payments, improve the experience, and comply with legal obligations.' },
      { title: '4. Your Images', body: 'Stored securely and linked to your account. Private images are only visible to you. You can delete them anytime.' },
      { title: '5. Data Sharing', body: 'We don\'t sell your data. We share only with essential service providers (hosting, payments) and when legally required.' },
      { title: '6. Security', body: 'Industry-standard encryption and security practices. No system is 100% secure, but we take it seriously.' },
      { title: '7. Deletion', body: 'Delete your account from Settings. All personal data is removed within 30 days.' },
      { title: '8. Your Rights', body: 'Depending on where you live, you may have rights to access, correct, or delete your data.' },
      { title: '9. Cookies', body: 'We use essential cookies for login and sessions. Analytics cookies help us understand usage.' },
    ],
  },
  {
    id: 'usage-policy',
    label: 'Usage Policy',
    title: 'Acceptable Use',
    lastUpdated: 'April 2026',
    intro: 'Rules for using OmniaCreata responsibly.',
    items: [
      { title: '1. Be Responsible', body: 'Use the platform for legitimate creative work. Respect others\' rights and contribute positively.' },
      { title: '2. Prohibited Content', body: 'No explicit/pornographic content, content exploiting minors, realistic violence, terrorism promotion, hate speech, or harassment.' },
      { title: '3. No Deception', body: 'Don\'t create deepfakes, disinformation, or content designed to mislead others.' },
      { title: '4. Respect IP', body: 'Don\'t infringe on copyrights, trademarks, or others\' intellectual property.' },
      { title: '5. Technical Rules', body: 'No reverse engineering, scraping, bypassing safety filters, or sharing/reselling account access.' },
      { title: '6. Commercial Use', body: 'Free tier is personal use only. Pro and Creator plans include commercial rights.' },
      { title: '7. Enforcement', body: 'Violations may result in content removal, account suspension, or permanent ban depending on severity.' },
    ],
  },
  {
    id: 'contact',
    label: 'Contact',
    title: 'Get in touch',
    intro: 'We\'re here to help.',
    items: [
      { title: 'Support', body: 'Questions or issues? Email support@omniacreata.com.' },
      { title: 'Safety reports', body: 'Report content violations or abuse at safety@omniacreata.com.' },
      { title: 'Business', body: 'Partnership or press inquiries: business@omniacreata.com.' },
      { title: 'Legal', body: 'Legal notices: legal@omniacreata.com.' },
    ],
  },
]

/* ─── Accordion Item ─── */
function AccordionItem({ item, defaultOpen = false }: { item: HelpItem; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-white/[0.04] last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left transition hover:bg-white/[0.02]"
      >
        <div className="text-sm font-medium text-white">{item.title}</div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-500 transition duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? '300px' : '0', opacity: open ? 1 : 0 }}
      >
        <div className="pb-4 text-sm leading-7 text-zinc-400">{item.body}</div>
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
              <img src="/omnia-crest.png" alt="OmniaCreata" className="h-8 w-8 object-contain" />
              <div>
                <div className="text-sm font-semibold tracking-[0.22em] text-zinc-100">OMNIACREATA</div>
                <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Studio</div>
              </div>
            </Link>
            <nav className="flex items-center gap-5 text-sm text-zinc-300">
              <Link to="/explore" className="transition hover:text-white">Explore</Link>
              <Link to="/subscription" className="transition hover:text-white">Pricing</Link>
              <Link to="/help" className="text-white">Help</Link>
              <Link to="/login" className="transition hover:text-white">Log in</Link>
              <Link to="/signup" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90">Start Free</Link>
            </nav>
          </div>
        </header>
      )}
    <AppPage className="max-w-[1380px] gap-10 py-8">
      <section className="border-b border-white/[0.06] pb-8">
        <div className="max-w-4xl">
          <h1 className="text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
            Help Center
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-zinc-400">
            Everything you need to know about OmniaCreata — from getting started to legal details.
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
              {section.lastUpdated ? (
                <div className="mt-2 text-xs text-zinc-600">Last updated: {section.lastUpdated}</div>
              ) : null}
              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">{section.intro}</p>

              {/* Use accordion for legal sections, grid for others */}
              {['terms', 'privacy', 'usage-policy'].includes(section.id) ? (
                <div className="mt-6 rounded-[16px] border border-white/[0.06] bg-white/[0.01] px-5">
                  {section.items.map((item, i) => (
                    <AccordionItem key={item.title} item={item} defaultOpen={i === 0} />
                  ))}
                </div>
              ) : (
                <div className="mt-6 divide-y divide-white/[0.06]">
                  {section.items.map((item) => (
                    <div key={item.title} className="grid gap-3 py-4 md:grid-cols-[220px_minmax(0,1fr)] md:gap-8">
                      <div className="text-sm font-medium text-white">{item.title}</div>
                      <div className="text-sm leading-7 text-zinc-400">{item.body}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>

      {!canRenderWithShell ? <LegalFooter /> : null}
    </AppPage>
    </>
  )
}

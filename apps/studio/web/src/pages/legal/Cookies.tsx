import { Link } from 'react-router-dom'

import {
  LegalList,
  LegalPage,
  LegalPlaceholder,
  LegalSection,
  LegalSubsection,
  type LegalTocItem,
} from '@/components/LegalPage'
import { LEGAL_EFFECTIVE_DATE_LABEL, LEGAL_LAST_UPDATED_LABEL } from '@/lib/legalConfig'

const TOC: LegalTocItem[] = [
  { id: 'overview', title: '1. Overview' },
  { id: 'what', title: '2. What is a cookie' },
  { id: 'why', title: '3. Why we use them' },
  { id: 'categories', title: '4. Categories we use' },
  { id: 'inventory', title: '5. Browser storage overview' },
  { id: 'third-party', title: '6. Third-party cookies' },
  { id: 'consent', title: '7. Your consent and choices' },
  { id: 'browser', title: '8. Browser controls' },
  { id: 'dnt', title: '9. Do Not Track and Global Privacy Control' },
  { id: 'changes', title: '10. Changes' },
  { id: 'contact', title: '11. Contact' },
]

const STORAGE_OVERVIEW = [
  {
    type: 'Sign-in and account security',
    category: 'Strictly necessary',
    purpose: 'Keeps your account session active and protects account actions.',
    duration: 'Session / up to 30 days',
    party: 'First-party',
  },
  {
    type: 'Cookie choices',
    category: 'Strictly necessary',
    purpose: 'Remembers whether you accepted or rejected optional cookies.',
    duration: 'Up to 12 months',
    party: 'First-party',
  },
  {
    type: 'Interface preferences',
    category: 'Preferences',
    purpose: 'Remembers display choices such as theme, layout, or language.',
    duration: 'Up to 12 months',
    party: 'First-party',
  },
  {
    type: 'Optional analytics',
    category: 'Analytics',
    purpose: 'Measures product usage, errors, and performance after you consent.',
    duration: 'Up to 13 months',
    party: 'First-party or provider',
  },
  {
    type: 'Checkout and payment security',
    category: 'Strictly necessary',
    purpose: 'Supports checkout, tax calculation, fraud prevention, and payment confirmation.',
    duration: 'Session / up to 12 months',
    party: 'Payment provider',
  },
  {
    type: 'Network and service protection',
    category: 'Strictly necessary',
    purpose: 'Keeps pages available, routes traffic, and helps prevent abuse.',
    duration: 'Session / short-lived',
    party: 'Service provider',
  },
]

export default function CookiePolicy() {
  return (
    <LegalPage
      title="Cookie Policy"
      subtitle="What we store in your browser, why we store it, and how to change your mind."
      lastUpdated={LEGAL_LAST_UPDATED_LABEL}
      effectiveDate={LEGAL_EFFECTIVE_DATE_LABEL}
      summary="We use strictly necessary cookies to keep you signed in and the Service secure - these cannot be turned off. Optional analytics and preference cookies run only with your consent. We do not use advertising cookies and we do not sell cookie data. You can change your choices at any time from the cookie banner or your account settings."
      toc={TOC}
    >
      <LegalSection id="overview" title="1. Overview">
        <p>
          This Cookie Policy explains how Omnia Creata Studio uses cookies and similar technologies (collectively,
          "<strong>cookies</strong>") on omniacreata.com and the Service. It supplements our{' '}
          <Link to="/legal/privacy" className="text-white underline-offset-4 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection id="what" title="2. What is a cookie">
        <p>
          A cookie is a small text file placed in your browser by a website you visit. Similar technologies include
          local storage, session storage, IndexedDB, and pixel tags. Throughout this policy, "cookies" refers to all of
          them.
        </p>
        <p>
          Cookies can be "first-party" (set by us) or "third-party" (set by a service we include on our pages). They
          can be "session" (deleted when you close your browser) or "persistent" (kept until they expire or you delete
          them).
        </p>
      </LegalSection>

      <LegalSection id="why" title="3. Why we use them">
        <p>We use cookies to:</p>
        <LegalList
          items={[
            'Keep you signed in to your account;',
            'Remember your preferences;',
            'Protect the Service against fraud, abuse, and automated attacks;',
            'Understand product usage after you consent;',
            'Diagnose errors and performance issues.',
          ]}
        />
        <p>We do not use advertising cookies. We do not sell cookie data.</p>
      </LegalSection>

      <LegalSection id="categories" title="4. Categories we use">
        <LegalSubsection title="4.1 Strictly necessary">
          <p>
            Required for account access, request integrity, security controls, and service availability. These are set
            without consent because they are essential. Disabling them will break core features.
          </p>
        </LegalSubsection>
        <LegalSubsection title="4.2 Preferences">
          <p>
            Remember choices you make, such as theme, language, consent decisions, or onboarding completion. Set only
            where consent is required under applicable law and you have given it.
          </p>
        </LegalSubsection>
        <LegalSubsection title="4.3 Analytics and performance">
          <p>
            Help us understand which features are used, measure error rates, and improve performance. We use aggregated
            or pseudonymised data wherever possible. Set only with your consent where required.
          </p>
        </LegalSubsection>
        <LegalSubsection title="4.4 Marketing">
          <p>
            We do not currently use marketing or advertising cookies. If we add any in the future, we will update this
            policy and seek consent where required.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection id="inventory" title="5. Browser storage overview">
        <p>
          We describe browser storage by purpose instead of publishing exact storage names. Names can change as the
          Service evolves, but the categories, purposes, and retention limits below stay current.
        </p>
        <div className="mt-4 overflow-hidden rounded-[12px] border border-white/[0.08]">
          <div className="hidden grid-cols-[1.15fr_0.95fr_1.9fr_1fr_0.95fr] gap-3 bg-white/[0.04] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400 md:grid">
            <span>Type</span>
            <span>Category</span>
            <span>Purpose</span>
            <span>Duration</span>
            <span>Party</span>
          </div>
          <div className="divide-y divide-white/[0.06] text-[12.5px] text-zinc-300">
            {STORAGE_OVERVIEW.map((row) => (
              <div
                key={row.type}
                className="grid gap-3 px-3 py-4 md:grid-cols-[1.15fr_0.95fr_1.9fr_1fr_0.95fr] md:py-3"
              >
                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 md:hidden">
                    Type
                  </div>
                  <div className="font-medium text-white">{row.type}</div>
                </div>
                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 md:hidden">
                    Category
                  </div>
                  {row.category}
                </div>
                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 md:hidden">
                    Purpose
                  </div>
                  {row.purpose}
                </div>
                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 md:hidden">
                    Duration
                  </div>
                  {row.duration}
                </div>
                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 md:hidden">
                    Party
                  </div>
                  {row.party}
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[12.5px] text-zinc-500">
          We do not use advertising cookies and we do not sell cookie data.
        </p>
      </LegalSection>

      <LegalSection id="third-party" title="6. Third-party cookies">
        <p>
          Some cookies are set by third-party services we rely on. Those providers act under their own privacy policies
          in addition to any contract we have with them. The main third parties are:
        </p>
        <LegalList
          items={[
            <>
              <strong>Paddle</strong> (merchant of record) - cookies set during checkout are necessary to complete your
              purchase and prevent payment fraud. See paddle.com/legal.
            </>,
            <>
              <strong>Analytics &amp; error monitoring</strong> (
              <LegalPlaceholder>Analytics/Monitoring Provider</LegalPlaceholder>) - set only with your consent where
              required.
            </>,
            <>
              <strong>CDN &amp; security</strong> (<LegalPlaceholder>CDN Provider</LegalPlaceholder>) - strictly
              necessary cookies for routing and network security.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection id="consent" title="7. Your consent and choices">
        <p>
          In the EEA, the United Kingdom, Turkiye, and other jurisdictions that require prior consent for non-essential
          cookies, we show a cookie banner on your first visit and only set non-essential cookies after you consent.
          You can:
        </p>
        <LegalList
          items={[
            'Accept all non-essential cookies;',
            'Reject all non-essential cookies;',
            'Choose per-category what to allow.',
          ]}
        />
        <p>
          You can change your choices at any time from the "Cookie preferences" link in the footer or from your account
          settings. Withdrawing consent will not affect the lawfulness of processing that happened before you withdrew
          it.
        </p>
      </LegalSection>

      <LegalSection id="browser" title="8. Browser controls">
        <p>
          All major browsers let you view, block, or delete cookies. Each browser works a little differently. Helpful
          pages:
        </p>
        <LegalList
          items={[
            'Chrome - support.google.com/chrome',
            'Firefox - support.mozilla.org',
            'Safari - support.apple.com',
            'Edge - support.microsoft.com',
          ]}
        />
        <p>
          Blocking strictly necessary cookies will prevent the Service from working correctly. You will still be able to
          visit public pages, but sign-in, billing, and generation will fail.
        </p>
      </LegalSection>

      <LegalSection id="dnt" title="9. Do Not Track and Global Privacy Control">
        <p>
          "Do Not Track" (DNT) is a browser setting that has no standardised legal meaning, so we do not respond to it.
          We do honour Global Privacy Control (GPC) signals where applicable law (including the CPRA) requires us to, by
          treating the signal as an opt-out of the sale or sharing of personal information.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="10. Changes">
        <p>
          We update this policy when our cookie use changes. The "Last updated" date at the top always reflects the
          current version. Material changes to non-essential cookies will prompt a refreshed consent request where the
          law requires it.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="11. Contact">
        <p>
          Questions or requests about cookies: <LegalPlaceholder>privacy@omniacreata.com</LegalPlaceholder>.
        </p>
      </LegalSection>
    </LegalPage>
  )
}

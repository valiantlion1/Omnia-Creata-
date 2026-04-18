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
  { id: 'inventory', title: '5. Cookie inventory' },
  { id: 'third-party', title: '6. Third-party cookies' },
  { id: 'consent', title: '7. Your consent and choices' },
  { id: 'browser', title: '8. Browser controls' },
  { id: 'dnt', title: '9. Do Not Track and Global Privacy Control' },
  { id: 'changes', title: '10. Changes' },
  { id: 'contact', title: '11. Contact' },
]

export default function CookiePolicy() {
  return (
    <LegalPage
      title="Cookie Policy"
      subtitle="What we store in your browser, why we store it, and how to change your mind."
      lastUpdated={LEGAL_LAST_UPDATED_LABEL}
      effectiveDate={LEGAL_EFFECTIVE_DATE_LABEL}
      summary="We use strictly necessary cookies to keep you signed in and the Service secure — these can't be turned off. Optional analytics and preference cookies run only with your consent. We don't use advertising cookies and we don't sell cookie data. You can change your choices at any time from the cookie banner or your account settings."
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
          local storage, session storage, IndexedDB, and pixel tags. Throughout this policy, "cookies"
          refers to all of them.
        </p>
        <p>
          Cookies can be "first-party" (set by us) or "third-party" (set by a service we
          include on our pages). They can be "session" (deleted when you close your browser) or
          "persistent" (kept until they expire or you delete them).
        </p>
      </LegalSection>

      <LegalSection id="why" title="3. Why we use them">
        <p>We use cookies to:</p>
        <LegalList
          items={[
            'Keep you signed in to your account;',
            'Remember your preferences (theme, language, layout);',
            'Protect the Service against fraud, abuse, and automated attacks;',
            'Understand how the Service is used so we can make it better;',
            'Diagnose errors and performance issues.',
          ]}
        />
        <p>We do not use advertising cookies. We do not sell cookie data.</p>
      </LegalSection>

      <LegalSection id="categories" title="4. Categories we use">
        <LegalSubsection title="4.1 Strictly necessary">
          <p>
            Required for the Service to function — session authentication, CSRF protection, load balancing, security
            logging. These are set without consent because they are essential. Disabling them will break core features.
          </p>
        </LegalSubsection>
        <LegalSubsection title="4.2 Preferences">
          <p>
            Remember choices you make (theme, language, consent decisions, onboarding completion). Set only where
            consent is required under applicable law and you have given it.
          </p>
        </LegalSubsection>
        <LegalSubsection title="4.3 Analytics and performance">
          <p>
            Help us understand which features are used, measure error rates, and improve performance. We use
            aggregated or pseudonymised data wherever possible. Set only with your consent where required.
          </p>
        </LegalSubsection>
        <LegalSubsection title="4.4 Marketing">
          <p>
            We do not currently use marketing or advertising cookies. If we add any in the future, we will update this
            policy and seek consent where required.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection id="inventory" title="5. Cookie inventory">
        <p>
          The table below lists the cookies we use and is kept current. If you want a live, browsable inventory, open
          your browser developer tools on any Omnia Creata Studio page.
        </p>
        <div className="mt-4 overflow-x-auto rounded-[12px] border border-white/[0.08]">
          <table className="w-full min-w-[720px] text-left text-[12.5px]">
            <thead className="bg-white/[0.04] text-[11px] uppercase tracking-[0.14em] text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-semibold">Name</th>
                <th className="px-3 py-2 font-semibold">Category</th>
                <th className="px-3 py-2 font-semibold">Purpose</th>
                <th className="px-3 py-2 font-semibold">Duration</th>
                <th className="px-3 py-2 font-semibold">Party</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              <tr className="border-t border-white/[0.06]">
                <td className="px-3 py-2 font-mono text-[11.5px]">oc_session</td>
                <td className="px-3 py-2">Strictly necessary</td>
                <td className="px-3 py-2">Maintains your signed-in session.</td>
                <td className="px-3 py-2">Session / up to 30 days</td>
                <td className="px-3 py-2">First-party</td>
              </tr>
              <tr className="border-t border-white/[0.06]">
                <td className="px-3 py-2 font-mono text-[11.5px]">oc_csrf</td>
                <td className="px-3 py-2">Strictly necessary</td>
                <td className="px-3 py-2">Protects against cross-site request forgery.</td>
                <td className="px-3 py-2">Session</td>
                <td className="px-3 py-2">First-party</td>
              </tr>
              <tr className="border-t border-white/[0.06]">
                <td className="px-3 py-2 font-mono text-[11.5px]">oc_consent</td>
                <td className="px-3 py-2">Strictly necessary</td>
                <td className="px-3 py-2">Remembers your cookie-banner choices.</td>
                <td className="px-3 py-2">12 months</td>
                <td className="px-3 py-2">First-party</td>
              </tr>
              <tr className="border-t border-white/[0.06]">
                <td className="px-3 py-2 font-mono text-[11.5px]">oc_theme</td>
                <td className="px-3 py-2">Preferences</td>
                <td className="px-3 py-2">Stores your interface theme and layout choices.</td>
                <td className="px-3 py-2">12 months</td>
                <td className="px-3 py-2">First-party</td>
              </tr>
              <tr className="border-t border-white/[0.06]">
                <td className="px-3 py-2 font-mono text-[11.5px]">oc_locale</td>
                <td className="px-3 py-2">Preferences</td>
                <td className="px-3 py-2">Remembers your preferred language.</td>
                <td className="px-3 py-2">12 months</td>
                <td className="px-3 py-2">First-party</td>
              </tr>
              <tr className="border-t border-white/[0.06]">
                <td className="px-3 py-2 font-mono text-[11.5px]">oc_analytics_id</td>
                <td className="px-3 py-2">Analytics</td>
                <td className="px-3 py-2">Pseudonymous identifier used to measure feature usage.</td>
                <td className="px-3 py-2">13 months</td>
                <td className="px-3 py-2">First-party</td>
              </tr>
              <tr className="border-t border-white/[0.06]">
                <td className="px-3 py-2 font-mono text-[11.5px]">
                  <LegalPlaceholder>analytics_provider_*</LegalPlaceholder>
                </td>
                <td className="px-3 py-2">Analytics</td>
                <td className="px-3 py-2">Event telemetry set by our analytics provider (only with consent).</td>
                <td className="px-3 py-2">Up to 13 months</td>
                <td className="px-3 py-2">Third-party</td>
              </tr>
              <tr className="border-t border-white/[0.06]">
                <td className="px-3 py-2 font-mono text-[11.5px]">
                  <LegalPlaceholder>paddle_*</LegalPlaceholder>
                </td>
                <td className="px-3 py-2">Strictly necessary</td>
                <td className="px-3 py-2">
                  Set by Paddle during checkout to process your purchase and prevent fraud.
                </td>
                <td className="px-3 py-2">Session / up to 12 months</td>
                <td className="px-3 py-2">Third-party</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[12.5px] text-zinc-500">
          Names prefixed with a placeholder are provider-specific and may change when the provider updates their SDK.
        </p>
      </LegalSection>

      <LegalSection id="third-party" title="6. Third-party cookies">
        <p>
          Some cookies are set by third-party services we rely on. Those providers act under their own privacy
          policies in addition to any contract we have with them. The main third parties are:
        </p>
        <LegalList
          items={[
            <>
              <strong>Paddle</strong> (merchant of record) — cookies set during checkout are necessary to complete
              your purchase and prevent payment fraud. See paddle.com/legal.
            </>,
            <>
              <strong>Analytics &amp; error monitoring</strong> (
              <LegalPlaceholder>Analytics/Monitoring Provider</LegalPlaceholder>) — set only with your consent where
              required.
            </>,
            <>
              <strong>CDN &amp; security</strong> (<LegalPlaceholder>CDN Provider</LegalPlaceholder>) — strictly
              necessary cookies for routing and DDoS protection.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection id="consent" title="7. Your consent and choices">
        <p>
          In the EEA, the United Kingdom, Türkiye, and other jurisdictions that require prior consent for non-essential
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
          You can change your choices at any time from the "Cookie preferences" link in the footer or from
          your account settings. Withdrawing consent will not affect the lawfulness of processing that happened before
          you withdrew it.
        </p>
      </LegalSection>

      <LegalSection id="browser" title="8. Browser controls">
        <p>
          All major browsers let you view, block, or delete cookies. Each browser works a little differently. Helpful
          pages:
        </p>
        <LegalList
          items={[
            'Chrome — support.google.com/chrome',
            'Firefox — support.mozilla.org',
            'Safari — support.apple.com',
            'Edge — support.microsoft.com',
          ]}
        />
        <p>
          Blocking strictly necessary cookies will prevent the Service from working correctly. You will still be able
          to visit public pages, but sign-in, billing, and generation will fail.
        </p>
      </LegalSection>

      <LegalSection id="dnt" title="9. Do Not Track and Global Privacy Control">
        <p>
          "Do Not Track" (DNT) is a browser setting that has no standardised legal meaning, so we do not
          respond to it. We do honour Global Privacy Control (GPC) signals where applicable law (including the CPRA)
          requires us to, by treating the signal as an opt-out of the sale or sharing of personal information.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="10. Changes">
        <p>
          We update this policy when our cookie use changes. The "Last updated" date at the top always
          reflects the current version. Material changes to non-essential cookies will prompt a refreshed consent
          request where the law requires it.
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

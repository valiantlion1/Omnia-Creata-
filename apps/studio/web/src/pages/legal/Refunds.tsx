import { Link } from 'react-router-dom'

import { LegalList, LegalPage, LegalSection, type LegalTocItem } from '@/components/LegalPage'
import {
  LEGAL_CONTACTS,
  LEGAL_EFFECTIVE_DATE_LABEL,
  LEGAL_LAST_UPDATED_LABEL,
} from '@/lib/legalConfig'

const TOC: LegalTocItem[] = [
  { id: 'overview', title: '1. Overview' },
  { id: 'credit-reversals', title: '2. Automatic credit reversals' },
  { id: 'subscriptions', title: '3. Subscription cancellations and refunds' },
  { id: 'credit-packs', title: '4. Credit packs and billing mistakes' },
  { id: 'consumer-rights', title: '5. Statutory consumer rights' },
  { id: 'request', title: '6. How to request a refund' },
  { id: 'contact', title: '7. Contact' },
]

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund Policy"
      subtitle="How Omnia Creata Studio handles failed runs, cancellations, billing mistakes, and legally required consumer refunds."
      lastUpdated={LEGAL_LAST_UPDATED_LABEL}
      effectiveDate={LEGAL_EFFECTIVE_DATE_LABEL}
      summary="If Studio burns credits because of a platform-side failure, we reverse those credits automatically. Subscription cancellations stop the next renewal but normally do not refund already elapsed time. If you were charged by mistake or local consumer law gives you a mandatory right, contact us and we will review it quickly."
      toc={TOC}
    >
      <LegalSection id="overview" title="1. Overview">
        <p>
          This Refund Policy explains what happens when a generation fails, when you cancel a paid plan, and when a
          billing error or legally required consumer refund applies. It supplements our{' '}
          <Link to="/legal/terms" className="text-white underline-offset-4 hover:underline">
            Terms of Service
          </Link>{' '}
          and the billing experience shown inside Studio.
        </p>
        <p>
          We try to keep this policy straightforward: platform-side failures should not silently burn value, but a
          subscription fee is not a blank promise of unlimited refunds after normal usage has already happened.
        </p>
      </LegalSection>

      <LegalSection id="credit-reversals" title="2. Automatic credit reversals">
        <p>
          If Studio consumes credits for an image generation or another metered action and the failure is caused by a
          confirmed platform-side fault, we aim to reverse those credits automatically within a reasonable time.
        </p>
        <LegalList
          items={[
            'Examples include failed generations, service outages, or billing mismatches caused by our systems.',
            'Reversals apply to wallet credits and included plan credits when the failure is attributable to Studio.',
            'We may deny an automatic reversal if the generation actually completed, if the output was delivered, or if the request was blocked for abuse, policy, or entitlement reasons before completion.',
          ]}
        />
      </LegalSection>

      <LegalSection id="subscriptions" title="3. Subscription cancellations and refunds">
        <p>
          You can cancel an Essential or Premium subscription from the Billing page at any time. Cancellation stops the next
          renewal and your paid access continues until the current billing period ends.
        </p>
        <LegalList
          items={[
            'Canceling a subscription does not normally refund time that has already elapsed in the active billing period.',
            'If a renewal happened by mistake, or if Studio was materially unavailable for reasons attributable to us, contact us for review.',
            'Where Paddle, acting as merchant of record, must handle the payment event directly, we will coordinate with Paddle to resolve the refund or charge dispute.',
          ]}
        />
      </LegalSection>

      <LegalSection id="credit-packs" title="4. Credit packs and billing mistakes">
        <p>
          One-time credit-pack purchases are meant to be used inside Studio and are generally non-refundable once the
          purchased credits have been delivered and used.
        </p>
        <LegalList
          items={[
            'If a credit-pack charge was duplicated, clearly unauthorized, or failed to credit the correct account, contact us and we will investigate.',
            'If a top-up completes successfully and the credits were already available for use, we may decline a discretionary refund unless a platform-side billing mistake is confirmed.',
            'We keep the right to correct obvious pricing, checkout, or entitlement mistakes, including by issuing partial reversals or restoring the right credit balance.',
          ]}
        />
      </LegalSection>

      <LegalSection id="consumer-rights" title="5. Statutory consumer rights">
        <p>
          Nothing in this policy removes any non-waivable consumer right you may have under applicable law, including
          rights under EU, UK, or Turkish consumer-protection rules where they apply to your purchase.
        </p>
        <p>
          If local law gives you a mandatory withdrawal, cancellation, or refund right, that law controls to the
          extent of the conflict. This policy describes our default operational stance, not a waiver of legal rights.
        </p>
      </LegalSection>

      <LegalSection id="request" title="6. How to request a refund">
        <p>
          The fastest path is to contact us within 14 days of the disputed charge. Include enough detail for us to
          identify the transaction and the reason you believe a refund is owed.
        </p>
        <LegalList
          items={[
            'Send the request from the email address on the account whenever possible.',
            'Include the invoice, Paddle receipt, or the last 4 digits and date of the card charge if available.',
            'Tell us whether the issue is a failed run, a duplicate charge, an unauthorized charge, or a cancellation dispute.',
          ]}
        />
      </LegalSection>

      <LegalSection id="contact" title="7. Contact">
        <p>
          For billing or refund questions, email{' '}
          <a
            href={`mailto:${LEGAL_CONTACTS.billing}`}
            className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white"
          >
            {LEGAL_CONTACTS.billing}
          </a>
          . For safety or policy issues related to a charged generation, you can also contact{' '}
          <a
            href={`mailto:${LEGAL_CONTACTS.safety}`}
            className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white"
          >
            {LEGAL_CONTACTS.safety}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  )
}

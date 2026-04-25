import { LegalList, LegalPage, LegalPlaceholder, LegalSection, type LegalTocItem } from '@/components/LegalPage'
import { LEGAL_EFFECTIVE_DATE_LABEL, LEGAL_LAST_UPDATED_LABEL } from '@/lib/legalConfig'

const toc: LegalTocItem[] = [
  { id: 's1', title: '1. About these Terms' },
  { id: 's2', title: '2. Definitions' },
  { id: 's3', title: '3. Eligibility and account' },
  { id: 's4', title: '4. The Service' },
  { id: 's5', title: '5. Subscriptions and credits' },
  { id: 's6', title: '6. Payments, taxes, and Paddle' },
  { id: 's7', title: '7. Cancellation and refunds' },
  { id: 's8', title: '8. Free trials and promotional credits' },
  { id: 's9', title: '9. Your content and license grant' },
  { id: 's10', title: '10. Generated outputs' },
  { id: 's11', title: '11. Intellectual property' },
  { id: 's12', title: '12. Acceptable use' },
  { id: 's13', title: '13. Third-party services' },
  { id: 's14', title: '14. Feedback' },
  { id: 's15', title: '15. Suspension and termination' },
  { id: 's16', title: '16. Disclaimers' },
  { id: 's17', title: '17. Limitation of liability' },
  { id: 's18', title: '18. Indemnification' },
  { id: 's19', title: '19. Consumer rights (EU, UK, TR)' },
  { id: 's20', title: '20. Changes to the Service and Terms' },
  { id: 's21', title: '21. Force majeure' },
  { id: 's22', title: '22. Assignment' },
  { id: 's23', title: '23. Severability and waiver' },
  { id: 's24', title: '24. Entire agreement' },
  { id: 's25', title: '25. Notices' },
  { id: 's26', title: '26. Governing law' },
  { id: 's27', title: '27. Dispute resolution' },
  { id: 's28', title: '28. Contact' },
]

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      subtitle="These Terms are the agreement between you and Omnia Creata governing your use of the Omnia Creata Studio platform and related services. Read them carefully."
      lastUpdated={LEGAL_LAST_UPDATED_LABEL}
      effectiveDate={LEGAL_EFFECTIVE_DATE_LABEL}
      summary="You can use Studio to generate images. You own what you make. We charge a monthly fee through Paddle for access and a credit allowance. You agree to follow the Acceptable Use Policy and you accept that generated images may occasionally resemble existing works, which is why you are responsible for reviewing them before commercial use."
      toc={toc}
    >
      <LegalSection id="s1" title="1. About these Terms">
        <p>
          These Terms of Service (the <strong className="text-white">"Terms"</strong>) form a binding legal
          agreement between you (the <strong className="text-white">"User"</strong>,{' '}
          <strong className="text-white">"you"</strong>) and{' '}
          <LegalPlaceholder>Omnia Creata Legal Entity Name</LegalPlaceholder>. Registered address:{' '}
          <LegalPlaceholder>Registered Address</LegalPlaceholder>. Company registration number:{' '}
          <LegalPlaceholder>Company Registration No.</LegalPlaceholder>. For these Terms, the operator is the{' '}
          <strong className="text-white">"Company"</strong>, <strong className="text-white">"we"</strong>,{' '}
          <strong className="text-white">"us"</strong>, or <strong className="text-white">"our"</strong>).
        </p>
        <p>
          By creating an account, clicking "I agree", accessing, browsing, or otherwise using
          Omnia Creata Studio (the <strong className="text-white">"Service"</strong>), you confirm that you
          have read, understood, and agreed to be bound by these Terms, together with our{' '}
          <a href="/legal/privacy" className="underline decoration-zinc-600 underline-offset-[3px] hover:text-white hover:decoration-zinc-300">Privacy Policy</a>,{' '}
          <a href="/legal/acceptable-use" className="underline decoration-zinc-600 underline-offset-[3px] hover:text-white hover:decoration-zinc-300">Acceptable Use Policy</a>, and{' '}
          <a href="/legal/cookies" className="underline decoration-zinc-600 underline-offset-[3px] hover:text-white hover:decoration-zinc-300">Cookie Policy</a>, each of which is incorporated by reference. If you do not
          agree, you may not use the Service.
        </p>
        <p>
          If you are accessing or using the Service on behalf of a company, organization, or other
          legal entity, you represent and warrant that you have the authority to bind that entity
          to these Terms, in which case "you" refers to that entity.
        </p>
      </LegalSection>

      <LegalSection id="s2" title="2. Definitions">
        <p>For the purposes of these Terms:</p>
        <LegalList
          items={[
            <span><strong className="text-white">Account</strong> means the user account you create in order to access and use the Service.</span>,
            <span><strong className="text-white">Content</strong> means any prompts, text, images, uploads, configurations, metadata, or other materials submitted to or produced through the Service, including Generated Output.</span>,
            <span><strong className="text-white">Credits</strong> means the metered usage units that are consumed when you use certain features of the Service, including image generation.</span>,
            <span><strong className="text-white">Generated Output</strong> means images, Chat responses, and other media produced by the Service in response to your prompts or inputs.</span>,
            <span><strong className="text-white">Paddle</strong> means Paddle.com Market Limited (or its applicable affiliate), acting as our merchant of record and payment processor.</span>,
            <span><strong className="text-white">Plan</strong> means the subscription tier you select, which determines the price, monthly Credit allowance, and feature set available to your Account.</span>,
            <span><strong className="text-white">User Content</strong> means the Content you submit to the Service, excluding Generated Output.</span>,
          ]}
        />
      </LegalSection>

      <LegalSection id="s3" title="3. Eligibility and account">
        <p>
          <strong className="text-white">3.1 Minimum age.</strong> You must be at least 16 years old to use
          the Service. If you are under the age of 18 (or the local age of majority in your jurisdiction),
          you may only use the Service with the supervision of a parent or legal guardian who has agreed
          to these Terms. Paid Plans require you to be of legal age to enter into a binding contract in
          your country of residence (typically 18).
        </p>
        <p>
          <strong className="text-white">3.2 Account creation.</strong> You agree to provide accurate,
          current, and complete information when registering, and to keep that information up to date.
          You are responsible for safeguarding your credentials and for all activity that occurs through
          your Account. Notify us at <a className="text-zinc-200 underline decoration-zinc-600 underline-offset-[3px]" href="mailto:founder@omniacreata.com">founder@omniacreata.com</a> without undue delay
          if you suspect unauthorized access.
        </p>
        <p>
          <strong className="text-white">3.3 One account per person.</strong> You may not create multiple
          Accounts to circumvent rate limits, billing, or enforcement actions.
        </p>
        <p>
          <strong className="text-white">3.4 Sanctions and restricted regions.</strong> You represent that
          you are not located in, under the control of, or a national or resident of any country subject
          to comprehensive sanctions, and that you are not on any restricted-person list administered by
          the United Nations, the European Union, the United Kingdom, the United States, or the Republic
          of TÃ¼rkiye.
        </p>
      </LegalSection>

      <LegalSection id="s4" title="4. The Service">
        <p>
          <strong className="text-white">4.1 Description.</strong> The Service is a software platform
          that enables registered Users to generate, edit, organize, and publish images using machine
          learning systems, together with conversational assistance, a personal media library, project
          folders, and community discovery features.
        </p>
        <p>
          <strong className="text-white">4.2 Access license.</strong> Subject to your compliance with
          these Terms, we grant you a limited, non-exclusive, non-transferable, non-sublicensable,
          revocable license to access and use the Service for your personal or internal business
          purposes during the term of these Terms.
        </p>
        <p>
          <strong className="text-white">4.3 No reverse engineering.</strong> You may not copy, modify,
          decompile, reverse engineer, or attempt to extract the source code or underlying models of
          the Service, except to the extent such restrictions are prohibited by applicable law.
        </p>
        <p>
          <strong className="text-white">4.4 Availability.</strong> We aim to keep the Service
          available, but do not warrant uninterrupted access. We may schedule maintenance, apply
          updates, or modify, suspend, or discontinue features at any time.
        </p>
      </LegalSection>

      <LegalSection id="s5" title="5. Subscriptions and credits">
        <p>
          <strong className="text-white">5.1 Plan structure.</strong> Paid Plans are monthly
          subscriptions that include a defined Credit allowance renewing at the start of each billing
          cycle. Current Plans, prices, features, and Credit allowances are displayed at checkout and
          on the Billing page inside the Service.
        </p>
        <p>
          <strong className="text-white">5.2 Credit consumption.</strong> Credits are consumed when
          you perform Credit-metered actions such as image generation, certain Chat features, and
          premium quality outputs. Consumption rates for each action are disclosed inside the Service
          and may be adjusted with reasonable prior notice.
        </p>
        <p>
          <strong className="text-white">5.3 Rollover.</strong> Credits included in your monthly Plan
          allowance do not roll over and expire at the end of the billing cycle in which they were
          granted. Credits separately purchased as a one-time top-up do not expire with the cycle and
          remain on your Account until consumed, unless otherwise stated at the time of purchase.
        </p>
        <p>
          <strong className="text-white">5.4 Upgrades and downgrades.</strong> You may upgrade or
          downgrade your Plan through the Billing page. Upgrades take effect immediately and are
          prorated. Downgrades take effect at the end of the current billing cycle.
        </p>
        <p>
          <strong className="text-white">5.5 Failed runs.</strong> If the Service fails to complete a
          Credit-metered action due to a technical fault on our side, we will refund the consumed
          Credits automatically within a reasonable time.
        </p>
      </LegalSection>

      <LegalSection id="s6" title="6. Payments, taxes, and Paddle">
        <p>
          <strong className="text-white">6.1 Merchant of record.</strong> Paddle acts as the merchant
          of record for all paid transactions on the Service. Paddle processes your payment, collects
          and remits applicable sales, VAT, or GST, and issues the payment receipt. Your bank or card
          statement will show "Paddle.net" or a similar identifier as the charging party.
        </p>
        <p>
          <strong className="text-white">6.2 Authorization.</strong> By subscribing to a paid Plan, you
          authorize Paddle to charge the payment method you provide for the fees and applicable taxes
          associated with your Plan, for each billing cycle, until you cancel.
        </p>
        <p>
          <strong className="text-white">6.3 Taxes.</strong> Prices shown at checkout may be exclusive
          or inclusive of tax depending on your location. Paddle determines and applies the correct
          tax treatment. If you have a valid VAT or tax identification number, enter it at checkout or
          in Billing so Paddle can apply the reverse-charge mechanism where applicable.
        </p>
        <p>
          <strong className="text-white">6.4 Failed payments.</strong> If a renewal payment fails,
          Paddle will retry the payment method over several days. During this period, your Account
          enters a grace state and continues to function. If the payment cannot ultimately be
          collected, the subscription is canceled and your Account reverts to the free tier.
        </p>
        <p>
          <strong className="text-white">6.5 Billing disputes.</strong> Billing disputes should be sent
          to <a className="text-zinc-200 underline decoration-zinc-600 underline-offset-[3px]" href="mailto:founder@omniacreata.com">founder@omniacreata.com</a>. Where Paddle is required to handle a dispute
          under applicable consumer or payment law, we will cooperate with them to resolve it.
        </p>
      </LegalSection>

      <LegalSection id="s7" title="7. Cancellation and refunds">
        <p>
          <strong className="text-white">7.1 Cancellation.</strong> You may cancel your subscription at
          any time from the Billing page. Cancellation takes effect at the end of the then-current
          billing cycle, and you retain access to paid features and remaining Plan Credits until that
          date.
        </p>
        <p>
          <strong className="text-white">7.2 Standard refund policy.</strong> Outside of cases where
          the Service materially malfunctions on our side or a charge is clearly unauthorized, we do
          not refund fees paid for elapsed time on a running subscription. Requests must be submitted
          to <a className="text-zinc-200 underline decoration-zinc-600 underline-offset-[3px]" href="mailto:founder@omniacreata.com">founder@omniacreata.com</a> within 14 days of the disputed transaction.
        </p>
        <p>
          <strong className="text-white">7.3 Mandatory consumer rights.</strong> This Section does not
          limit any non-waivable statutory refund, withdrawal, or cancellation right you may have
          under applicable consumer protection law in your country of residence. See also Section 19.
        </p>
      </LegalSection>

      <LegalSection id="s8" title="8. Free trials and promotional credits">
        <p>
          From time to time we may offer free trials, promotional Credits, referral rewards, or
          discounted Plans. These are subject to the specific terms disclosed at the time of offer and
          may be limited by duration, quantity, eligibility, or geography. Promotional Credits are not
          redeemable for cash, are not transferable, and expire as stated in the offer.
        </p>
        <p>
          If you subscribe through a free trial, you agree that, unless you cancel before the trial
          ends, you will be automatically charged for the first regular billing cycle at the Plan
          price shown at sign-up.
        </p>
      </LegalSection>

      <LegalSection id="s9" title="9. Your content and license grant">
        <p>
          <strong className="text-white">9.1 Ownership.</strong> You retain all right, title, and
          interest in and to your User Content (subject to third-party rights in the underlying
          materials, and to Section 10 below with respect to Generated Output).
        </p>
        <p>
          <strong className="text-white">9.2 License to us (operational).</strong> You grant us, and
          our hosting and infrastructure sub-processors, a worldwide, non-exclusive, royalty-free,
          sublicensable license to host, store, transmit, reproduce, display, create derivative works
          of, and back up your Content solely to the extent necessary to operate, maintain, secure,
          and provide the Service to you, to enforce these Terms, and to comply with law.
        </p>
        <p>
          <strong className="text-white">9.3 License to us (public publication).</strong> If and for so
          long as you choose to publish Content to Explore, your public profile, or any other public
          surface of the Service, the license in Section 9.2 extends to publicly displaying and
          distributing that Content. Unpublishing removes the public portion of that license
          prospectively; copies already downloaded, cached, or re-shared by third parties are outside
          our control.
        </p>
        <p>
          <strong className="text-white">9.4 No model training on your Content.</strong> We do not use
          your User Content or Generated Output to train third-party generative models. Any future
          change to this practice would be opt-in and clearly disclosed, with the continued ability to
          opt out at any time.
        </p>
        <p>
          <strong className="text-white">9.5 Your representations.</strong> You represent and warrant
          that your User Content does not infringe the rights of any third party, including
          intellectual property rights, rights of publicity, or privacy rights, and does not violate
          any applicable law or the Acceptable Use Policy.
        </p>
      </LegalSection>

      <LegalSection id="s10" title="10. Generated outputs">
        <p>
          <strong className="text-white">10.1 Nature of generated content.</strong> Generated Output is
          produced by machine learning systems trained on large datasets. Outputs may sometimes (a)
          resemble existing works, (b) reproduce stylistic elements present in training data, (c)
          contain factual inaccuracies, or (d) include artifacts or inconsistencies.
        </p>
        <p>
          <strong className="text-white">10.2 Ownership of outputs.</strong> As between you and us,
          and to the maximum extent permitted by law, you own the Generated Output you produce using
          the Service, subject to your compliance with these Terms and to the residual rights of
          third parties in any underlying materials you supplied. Some jurisdictions do not recognize
          copyright in AI-generated works; we make no representation about the copyrightability of any
          specific output in your jurisdiction.
        </p>
        <p>
          <strong className="text-white">10.3 Commercial use.</strong> Paid Plans permit you to use
          Generated Output for commercial purposes, including client work, advertising, products, and
          prints, provided you comply with these Terms and the Acceptable Use Policy and respect
          applicable third-party rights.
        </p>
        <p>
          <strong className="text-white">10.4 Your review obligation.</strong> Because Generated Output
          may resemble existing works or implicate third-party rights, you are solely responsible for
          reviewing each output before you publish or commercially use it and for obtaining any
          licenses, clearances, or consents that your use may require.
        </p>
        <p>
          <strong className="text-white">10.5 No professional advice.</strong> The Service does not
          provide legal, medical, financial, or other professional advice. Generated Output must not
          be relied on as such.
        </p>
      </LegalSection>

      <LegalSection id="s11" title="11. Intellectual property">
        <p>
          <strong className="text-white">11.1 Our rights.</strong> The Service, including the website,
          software, interface, brand, logos, documentation, and all underlying materials we create,
          is protected by intellectual property laws and remains our property or that of our
          licensors. These Terms do not grant you any rights in the Service other than the limited
          access license in Section 4.2.
        </p>
        <p>
          <strong className="text-white">11.2 Trademarks.</strong> "Omnia Creata", "OmniaCreata",
          "Studio", and associated logos are our trademarks. You may not use them without our prior
          written permission, except for factual, accurate references to the Service.
        </p>
        <p>
          <strong className="text-white">11.3 DMCA / copyright notices.</strong> If you believe User
          Content or Generated Output published through the Service infringes your copyright, send a
          written notice to <a className="text-zinc-200 underline decoration-zinc-600 underline-offset-[3px]" href="mailto:founder@omniacreata.com">founder@omniacreata.com</a> including: (a) your physical or
          electronic signature; (b) identification of the copyrighted work; (c) identification of the
          allegedly infringing material and a URL; (d) your contact information; (e) a statement of
          good-faith belief that the use is not authorized; and (f) a statement, under penalty of
          perjury, that your notice is accurate and that you are the rights holder or authorized to
          act on their behalf.
        </p>
      </LegalSection>

      <LegalSection id="s12" title="12. Acceptable use">
        <p>
          Your use of the Service is subject to the{' '}
          <a href="/legal/acceptable-use" className="underline decoration-zinc-600 underline-offset-[3px] hover:text-white hover:decoration-zinc-300">Acceptable Use Policy</a>, which is incorporated into these Terms. Violations may result in
          content removal, rate limits, suspension, or termination in accordance with Section 15.
        </p>
      </LegalSection>

      <LegalSection id="s13" title="13. Third-party services">
        <p>
          The Service integrates with or relies on third-party services, including Paddle (payments),
          hosting and cloud infrastructure providers, email delivery providers, analytics, and error
          monitoring. Your use of those third-party services is subject to their own terms and privacy
          policies. We are not responsible for third-party services or their acts and omissions beyond
          our reasonable control.
        </p>
      </LegalSection>

      <LegalSection id="s14" title="14. Feedback">
        <p>
          If you voluntarily provide us with feedback, suggestions, ideas, or improvements relating to
          the Service, you grant us a perpetual, irrevocable, worldwide, royalty-free license to use
          that feedback for any purpose without obligation or compensation to you. You are not required
          to provide feedback.
        </p>
      </LegalSection>

      <LegalSection id="s15" title="15. Suspension and termination">
        <p>
          <strong className="text-white">15.1 By you.</strong> You may terminate these Terms at any
          time by closing your Account. Instructions are available on the Account page and via
          support.
        </p>
        <p>
          <strong className="text-white">15.2 By us for cause.</strong> We may suspend or terminate
          your Account, with or without prior notice, if we reasonably believe that you have breached
          these Terms or the Acceptable Use Policy, if your use creates outsized risk to the Service,
          to other users, or to our partners, or if required by law. For serious violations (including
          violations involving minor safety or deepfake abuse) we may act without prior notice.
        </p>
        <p>
          <strong className="text-white">15.3 By us for convenience.</strong> We may terminate these
          Terms for convenience by giving you at least 30 days' notice, in which case we will refund
          the pro-rata portion of any prepaid fees covering the period after termination.
        </p>
        <p>
          <strong className="text-white">15.4 Effects.</strong> On termination, your license to access
          the Service ends and we may delete your Account and Content after a reasonable period.
          Sections that by their nature should survive termination (including Sections 9.2, 10, 11,
          16, 17, 18, 26, 27) will survive.
        </p>
      </LegalSection>

      <LegalSection id="s16" title="16. Disclaimers">
        <p>
          <strong className="text-white">16.1 "As is".</strong> To the maximum extent permitted by
          applicable law, the Service and all Generated Output are provided on an "as is" and "as
          available" basis, with all faults and without warranty of any kind, express or implied,
          including warranties of merchantability, fitness for a particular purpose, title, accuracy,
          availability, non-infringement, and quiet enjoyment.
        </p>
        <p>
          <strong className="text-white">16.2 No guarantee of outcomes.</strong> We do not warrant
          that Generated Output will meet your expectations, be error-free, be free of resemblance to
          existing works, or be fit for any particular commercial use.
        </p>
        <p>
          <strong className="text-white">16.3 Consumer warranties.</strong> Nothing in this Section
          excludes or limits warranties or rights that cannot be excluded under mandatory consumer law
          applicable to you.
        </p>
      </LegalSection>

      <LegalSection id="s17" title="17. Limitation of liability">
        <p>
          <strong className="text-white">17.1 Excluded damages.</strong> To the maximum extent
          permitted by applicable law, neither party will be liable for any indirect, incidental,
          special, consequential, exemplary, or punitive damages, or for any loss of profits, loss of
          revenue, loss of business, loss of goodwill, loss of data (beyond what is required to run
          the Service for you), or loss of use, arising out of or in connection with these Terms or
          the Service, even if advised of the possibility of such damages.
        </p>
        <p>
          <strong className="text-white">17.2 Liability cap.</strong> To the maximum extent permitted
          by applicable law, the aggregate liability of each party for all claims arising out of or
          relating to these Terms or the Service will not exceed the greater of (a) the amounts you
          paid to us for the Service in the twelve (12) months preceding the event giving rise to the
          claim, or (b) one hundred US dollars (USD 100).
        </p>
        <p>
          <strong className="text-white">17.3 Consumer liability.</strong> Nothing in this Section
          limits liability for gross negligence, willful misconduct, fraud, death or personal injury
          caused by negligence, or any other liability that cannot be limited or excluded under
          applicable law.
        </p>
      </LegalSection>

      <LegalSection id="s18" title="18. Indemnification">
        <p>
          To the maximum extent permitted by applicable law, you will defend, indemnify, and hold
          harmless the Company and its officers, directors, employees, and agents from and against
          any third-party claim, loss, damage, liability, cost, or expense (including reasonable
          attorneys' fees) arising out of or relating to (a) your User Content; (b) your use of the
          Service in violation of these Terms, the Acceptable Use Policy, or applicable law; (c) your
          infringement or misappropriation of any third-party right; or (d) your willful misconduct
          or gross negligence.
        </p>
      </LegalSection>

      <LegalSection id="s19" title="19. Consumer rights (EU, UK, TÃ¼rkiye)">
        <p>
          <strong className="text-white">19.1 EU/UK right of withdrawal.</strong> If you are a
          consumer located in the European Union or the United Kingdom, you may have a statutory
          right to withdraw from a distance contract within 14 days of entering into it. By purchasing
          a Plan and receiving immediate access to digital content, you expressly consent to the
          performance of the contract before the expiry of the withdrawal period and acknowledge that
          you thereby lose the right of withdrawal to the extent the digital content has already been
          supplied.
        </p>
        <p>
          <strong className="text-white">19.2 TÃ¼rkiye.</strong> If you are a consumer resident in
          TÃ¼rkiye, your rights under Law No. 6502 on the Protection of Consumers and the Regulation
          on Distance Contracts apply and are not limited by these Terms. Nothing in these Terms
          removes any non-waivable consumer right available to you under Turkish law.
        </p>
        <p>
          <strong className="text-white">19.3 Other jurisdictions.</strong> Nothing in these Terms
          excludes or limits any mandatory consumer right available to you under the law of your
          country of residence.
        </p>
      </LegalSection>

      <LegalSection id="s20" title="20. Changes to the Service and Terms">
        <p>
          <strong className="text-white">20.1 Changes to the Service.</strong> We may add, modify, or
          remove features of the Service from time to time. Where a change materially reduces the
          core functionality that you paid for, we will give you reasonable prior notice and, if you
          do not accept the change, you may cancel your subscription and receive a pro-rata refund of
          any prepaid fees for the unused period.
        </p>
        <p>
          <strong className="text-white">20.2 Changes to these Terms.</strong> We may update these
          Terms to reflect changes in the Service, our business, or the law. We will post the updated
          Terms with a new "Last updated" date. Material changes will be notified to you by email or
          in-product notice at least 14 days before the effective date. Your continued use of the
          Service after the effective date constitutes acceptance of the updated Terms.
        </p>
      </LegalSection>

      <LegalSection id="s21" title="21. Force majeure">
        <p>
          Neither party will be liable for any failure or delay in performance caused by events beyond
          its reasonable control, including acts of God, natural disasters, epidemics, war, terrorism,
          civil unrest, government action, strikes, failure of third-party networks, cloud providers,
          or payment processors, or widespread internet disruption.
        </p>
      </LegalSection>

      <LegalSection id="s22" title="22. Assignment">
        <p>
          You may not assign or transfer these Terms, by operation of law or otherwise, without our
          prior written consent. We may assign these Terms, in whole or in part, to any affiliate or
          to a successor in connection with a merger, acquisition, corporate reorganization, or sale
          of substantially all of the assets of the business. Any attempted assignment in violation
          of this Section is void.
        </p>
      </LegalSection>

      <LegalSection id="s23" title="23. Severability and waiver">
        <p>
          If any provision of these Terms is held to be unenforceable, that provision will be
          modified or severed to the minimum extent necessary, and the remaining provisions will
          continue in full force and effect. A party's failure to enforce any right or provision
          under these Terms is not a waiver of that right or provision.
        </p>
      </LegalSection>

      <LegalSection id="s24" title="24. Entire agreement">
        <p>
          These Terms, together with the Privacy Policy, the Acceptable Use Policy, the Cookie
          Policy, and any order form or plan description you accept, constitute the entire agreement
          between you and the Company regarding the Service and supersede all prior or
          contemporaneous agreements, representations, and understandings.
        </p>
      </LegalSection>

      <LegalSection id="s25" title="25. Notices">
        <p>
          We may send legal notices to the email address associated with your Account or display them
          in the Service. You must send legal notices to us at{' '}
          <a className="text-zinc-200 underline decoration-zinc-600 underline-offset-[3px]" href="mailto:founder@omniacreata.com">founder@omniacreata.com</a>, with a copy by post to{' '}
          <LegalPlaceholder>Registered Address</LegalPlaceholder>. Notices are deemed given when sent
          by email, or when delivered to the postal address, whichever is earlier.
        </p>
      </LegalSection>

      <LegalSection id="s26" title="26. Governing law">
        <p>
          These Terms and any dispute arising out of or relating to them or the Service are governed
          by the laws of the{' '}
          <LegalPlaceholder>Governing Jurisdiction â€” e.g. Republic of TÃ¼rkiye</LegalPlaceholder>,
          without regard to its conflict of laws principles. The United Nations Convention on
          Contracts for the International Sale of Goods does not apply. This choice of law does not
          deprive consumers of the protection of mandatory provisions of the law of their country of
          residence.
        </p>
      </LegalSection>

      <LegalSection id="s27" title="27. Dispute resolution">
        <p>
          <strong className="text-white">27.1 Informal resolution.</strong> Before bringing a formal
          claim, you agree to first contact us at{' '}
          <a className="text-zinc-200 underline decoration-zinc-600 underline-offset-[3px]" href="mailto:founder@omniacreata.com">founder@omniacreata.com</a>{' '}
          and attempt in good faith to resolve the dispute. Most concerns can be resolved quickly this
          way.
        </p>
        <p>
          <strong className="text-white">27.2 Jurisdiction.</strong> Subject to any non-waivable right
          you have as a consumer to bring proceedings in the courts of your country of residence, any
          dispute that cannot be resolved informally will be submitted to the exclusive jurisdiction
          of the competent courts located in{' '}
          <LegalPlaceholder>City, Country</LegalPlaceholder>.
        </p>
        <p>
          <strong className="text-white">27.3 Class-action waiver.</strong> To the maximum extent
          permitted by applicable law, claims must be brought on an individual basis only, and not as
          part of a class, consolidated, or representative action.
        </p>
        <p>
          <strong className="text-white">27.4 ODR (EU consumers).</strong> The European Commission
          provides an online dispute resolution platform, accessible at{' '}
          <a className="text-zinc-200 underline decoration-zinc-600 underline-offset-[3px]" href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noreferrer">
            ec.europa.eu/consumers/odr
          </a>
          . We are not obligated and do not commit to participating in out-of-court dispute resolution
          procedures.
        </p>
      </LegalSection>

      <LegalSection id="s28" title="28. Contact">
        <p>
          For questions about these Terms, contact us at:
        </p>
        <LegalList
          items={[
            <span>General legal inquiries: <a className="text-zinc-200 underline decoration-zinc-600 underline-offset-[3px]" href="mailto:founder@omniacreata.com">founder@omniacreata.com</a></span>,
            <span>Billing and refunds: <a className="text-zinc-200 underline decoration-zinc-600 underline-offset-[3px]" href="mailto:founder@omniacreata.com">founder@omniacreata.com</a></span>,
            <span>Product support: <a className="text-zinc-200 underline decoration-zinc-600 underline-offset-[3px]" href="mailto:founder@omniacreata.com">founder@omniacreata.com</a></span>,
            <span>Safety and abuse: <a className="text-zinc-200 underline decoration-zinc-600 underline-offset-[3px]" href="mailto:founder@omniacreata.com">founder@omniacreata.com</a></span>,
            <span>Postal address: <LegalPlaceholder>Registered Address</LegalPlaceholder></span>,
          ]}
        />
      </LegalSection>
    </LegalPage>
  )
}

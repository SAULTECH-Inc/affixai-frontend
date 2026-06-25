import { MarketingLayout, PageHero, Prose } from '@/components/marketing/MarketingLayout';
import { Seo } from '@/components/Seo';

// Terms of Service — boilerplate-but-honest draft. THIS IS NOT LEGAL ADVICE.
// Review with a lawyer before going live in production.
export default function TermsPage() {
  return (
    <MarketingLayout>
      <Seo
        title="Terms of Service"
        description="The agreement between you and AffixAI — your rights, our obligations, and how the relationship works."
        path="/terms"
      />
      <PageHero
        eyebrow="Terms of Service"
        title="The agreement between you and AffixAI."
        subtitle="Last updated June 15, 2026"
      />
      <Prose>
        <div className="rounded-xl border border-warning/40 bg-warning/10 text-fg p-4 text-sm">
          <strong>Draft.</strong> Working draft. Review with counsel before
          relying on these terms for any specific legal purpose. Questions:{' '}
          <a href="mailto:legal@affixai.com">legal@affixai.com</a>.
        </div>

        <h2>1. The deal, in one paragraph</h2>
        <p>
          You sign up for AffixAI, we provide the service described on the
          marketing pages. You pay for what your plan says you pay. You keep
          ownership of your data and your signed documents. We keep them
          encrypted and don't share them with anyone you didn't tell us to.
          Either of us can end the relationship; specifics below.
        </p>

        <h2>2. Your account</h2>
        <p>
          You must be at least 16 years old to use AffixAI. You're responsible
          for keeping your login credentials secure and for everything done
          under your account. Tell us right away if you spot unauthorized
          access.
        </p>

        <h2>3. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>
            Use AffixAI to commit fraud, forge documents, or impersonate
            anyone other than yourself or someone who has explicitly
            authorized you.
          </li>
          <li>Upload malware, illegal content, or content you don't have rights to.</li>
          <li>Reverse-engineer or scrape the service.</li>
          <li>
            Bypass rate limits, abuse free-tier accounts, or attempt to access
            other users' data.
          </li>
        </ul>
        <p>
          Violations may lead to suspension or termination, with or without
          refund.
        </p>

        <h2>4. Your content</h2>
        <p>
          You own the documents you upload and the data in your vault. You
          grant us a narrow license to process them — to fill, sign, store,
          and deliver them as part of the service. That's the only license
          we ask for, and it ends when you delete the content.
        </p>

        <h2>5. The service</h2>
        <p>
          We provide AffixAI on an "as available" basis. We aim for high
          uptime but don't guarantee perfection. We may improve, change, or
          discontinue features; material changes get advance notice when
          practical.
        </p>

        <h2>6. Payment and refunds</h2>
        <ul>
          <li>Paid plans renew automatically until you cancel.</li>
          <li>Free trials convert to paid plans unless you cancel before they end.</li>
          <li>
            You can cancel anytime in Settings. Cancellation stops the next
            renewal — it doesn't refund the current period unless we say so.
          </li>
          <li>
            We may change pricing with at least 30 days' notice. Existing
            subscribers keep their current pricing through the end of their
            paid period.
          </li>
        </ul>

        <h2>7. Termination</h2>
        <p>
          You can close your account anytime. We can suspend or terminate
          accounts that violate these terms, with notice except in cases of
          serious harm.
        </p>

        <h2>8. Liability</h2>
        <p>
          To the maximum extent allowed by law, AffixAI is not liable for
          indirect, incidental, or consequential damages. Our total liability
          for any claim is capped at the amount you paid us in the 12 months
          before the claim arose.
        </p>
        <p>
          AffixAI is a tool. It does not give legal, tax, or financial
          advice. The legal validity of an electronic signature depends on
          your jurisdiction — consult a professional for high-stakes
          agreements.
        </p>

        <h2>9. Indemnification</h2>
        <p>
          You agree to indemnify AffixAI against claims arising from your
          misuse of the service or violation of these terms.
        </p>

        <h2>10. Governing law</h2>
        <p>
          These terms are governed by the laws of the State of Delaware, USA,
          without regard to its conflict-of-laws principles. Disputes will be
          resolved in the courts of Delaware unless mandatory consumer
          protection law in your country says otherwise.
        </p>

        <h2>11. Changes</h2>
        <p>
          We'll post material changes here and email account holders. The
          "last updated" date tracks revisions. Continuing to use the
          service after a change means you accept it.
        </p>

        <h2>12. Contact</h2>
        <p>
          Legal: <a href="mailto:legal@affixai.com">legal@affixai.com</a>.
          Everything else: <a href="mailto:hello@affixai.com">hello@affixai.com</a>.
        </p>
      </Prose>
    </MarketingLayout>
  );
}

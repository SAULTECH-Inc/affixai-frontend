import { MarketingLayout, PageHero, Prose } from '@/components/marketing/MarketingLayout';
import { Seo } from '@/components/Seo';

// Privacy policy — boilerplate-but-honest draft. THIS IS NOT LEGAL ADVICE.
// Review with a lawyer before going live in production. The banner at the
// top of the page tells visitors the same thing.
export default function PrivacyPage() {
  return (
    <MarketingLayout>
      <Seo
        title="Privacy Policy"
        description="What AffixAI collects, why, and how we keep it safe. AES-256-GCM encryption at rest, no data sales, no AI training on user data."
        path="/privacy"
      />
      <PageHero
        eyebrow="Privacy Policy"
        title="What we collect, why, and how we keep it safe."
        subtitle="Last updated June 15, 2026"
      />
      <Prose>
        <div className="rounded-xl border border-warning/40 bg-warning/10 text-fg p-4 text-sm">
          <strong>Draft.</strong> This is a working draft of our privacy
          policy. Review with counsel before relying on it for a specific
          legal purpose. Email{' '}
          <a href="mailto:privacy@affixai.com">privacy@affixai.com</a> with
          questions.
        </div>

        <h2>Summary</h2>
        <p>
          AffixAI is a document-signing service. To do its job, it needs to
          store information you give it (your name, addresses, IDs, employer,
          signatures) and the documents you sign. We encrypt that information
          at rest and never sell it. We use it to fill <em>your</em> documents
          — never to train models or sell to data brokers.
        </p>

        <h2>1. What we collect</h2>
        <h3>Information you give us</h3>
        <ul>
          <li>
            <strong>Account info:</strong> email, name, password (hashed),
            phone number.
          </li>
          <li>
            <strong>Vault data:</strong> any field you fill in (name, address,
            ID numbers, employment / education history, signatures, photos).
            Encrypted at rest with AES-256-GCM.
          </li>
          <li>
            <strong>Documents:</strong> files you upload for signing, plus
            metadata about who signed when.
          </li>
          <li>
            <strong>Billing:</strong> handled by our payment provider (Stripe
            / Paystack / Flutterwave). We store the provider's customer ID,
            never your card details.
          </li>
        </ul>
        <h3>Information we collect automatically</h3>
        <ul>
          <li>
            <strong>Usage:</strong> pages visited, features used, error logs.
          </li>
          <li>
            <strong>Device:</strong> browser, operating system, IP address.
          </li>
          <li>
            <strong>Cookies:</strong> a single session cookie to keep you
            signed in. We don't use third-party advertising cookies.
          </li>
        </ul>

        <h2>2. How we use it</h2>
        <ul>
          <li>To fill, sign, and store your documents.</li>
          <li>To send you account, billing, and security notifications.</li>
          <li>To improve the product, debug issues, and detect abuse.</li>
          <li>To comply with legal obligations.</li>
        </ul>
        <p>
          We do <strong>not</strong> use your vault contents or documents to
          train AI models. We do not sell your data.
        </p>

        <h2>3. How we keep it safe</h2>
        <ul>
          <li>Vault fields are encrypted with AES-256-GCM at rest.</li>
          <li>All traffic is HTTPS. Passwords are hashed with bcrypt.</li>
          <li>
            Access to production data is limited to engineers who need it and
            audited.
          </li>
          <li>
            Webhook payloads we send out are signed with HMAC-SHA256 so
            recipients can verify them.
          </li>
        </ul>

        <h2>4. Sharing</h2>
        <p>
          We share data with service providers strictly to operate the
          product — hosting, email delivery, payments, error monitoring. Each
          provider is bound by a data processing agreement. We share data with
          law enforcement only when legally required.
        </p>

        <h2>5. Your rights</h2>
        <p>
          You can access, export, or delete your data at any time. Use the
          controls in Settings, or email{' '}
          <a href="mailto:privacy@affixai.com">privacy@affixai.com</a>.
          Depending on where you live, you may have additional rights under
          GDPR, the CCPA, the Nigeria Data Protection Act, or other laws.
        </p>

        <h2>6. Retention</h2>
        <p>
          We keep your data for as long as your account is active. When you
          delete your account, we delete vault contents within 30 days and
          documents within 90 days (with the exception of records we're
          required to keep for tax, billing, or legal reasons).
        </p>

        <h2>7. Children</h2>
        <p>
          AffixAI is not directed to children under 16. We don't knowingly
          collect data from minors.
        </p>

        <h2>8. Changes</h2>
        <p>
          We'll post material changes here and notify account holders by
          email. The "last updated" date at the top tracks revisions.
        </p>

        <h2>9. Contact</h2>
        <p>
          Privacy questions: <a href="mailto:privacy@affixai.com">privacy@affixai.com</a>.
          General contact: <a href="mailto:hello@affixai.com">hello@affixai.com</a>.
        </p>
      </Prose>
    </MarketingLayout>
  );
}

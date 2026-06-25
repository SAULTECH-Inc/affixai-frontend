import { MarketingLayout, PageHero, Prose } from '@/components/marketing/MarketingLayout';
import { Seo } from '@/components/Seo';

// Data Processing Agreement — boilerplate-but-honest draft, written for
// enterprise customers whose vendors require a DPA. NOT LEGAL ADVICE.
// Have counsel review before counter-signing with a real customer.
export default function DpaPage() {
  return (
    <MarketingLayout>
      <Seo
        title="Data Processing Agreement"
        description="DPA template for AffixAI enterprise customers. Covers GDPR / UK GDPR processor obligations, sub-processors, and international transfers."
        path="/dpa"
      />
      <PageHero
        eyebrow="Data Processing Agreement"
        title="DPA for enterprise customers."
        subtitle="Last updated June 15, 2026"
      />
      <Prose>
        <div className="rounded-xl border border-warning/40 bg-warning/10 text-fg p-4 text-sm">
          <strong>Draft template.</strong> If your organization needs a
          signed DPA, email{' '}
          <a href="mailto:legal@affixai.com">legal@affixai.com</a> and we'll
          counter-sign a customized version.
        </div>

        <h2>1. Parties and scope</h2>
        <p>
          This Data Processing Agreement ("DPA") supplements the AffixAI
          Terms of Service between you ("Controller") and AffixAI
          ("Processor"). It governs Processor's handling of personal data
          submitted to the AffixAI service on Controller's behalf.
        </p>

        <h2>2. Subject matter and duration</h2>
        <p>
          Processor processes Controller's personal data to provide the
          document-signing, vault, and related services described in the
          Terms. Processing continues for the duration of Controller's
          subscription, plus a short tail for deletion (see §8).
        </p>

        <h2>3. Nature and purpose</h2>
        <ul>
          <li>Storing vault entries on behalf of Controller's users.</li>
          <li>Reading, filling, signing, and stamping documents.</li>
          <li>Sending notifications and webhooks at Controller's direction.</li>
          <li>Maintaining audit logs for security and compliance.</li>
        </ul>

        <h2>4. Categories of data subjects and data</h2>
        <ul>
          <li>
            <strong>Data subjects:</strong> Controller's end users, employees,
            customers, or counterparties who interact with documents.
          </li>
          <li>
            <strong>Data:</strong> name, contact information, IDs, addresses,
            employer / education history, signatures, photographs, document
            content, and metadata (IPs, timestamps).
          </li>
        </ul>

        <h2>5. Processor obligations</h2>
        <ul>
          <li>
            Process personal data only on Controller's documented
            instructions, including via the platform's UI and API.
          </li>
          <li>
            Maintain confidentiality and ensure Processor's personnel are
            bound by appropriate confidentiality obligations.
          </li>
          <li>
            Implement appropriate technical and organizational measures
            (TOMs) — see §6.
          </li>
          <li>
            Assist Controller with data-subject requests, security
            assessments, and breach notifications.
          </li>
          <li>
            Notify Controller without undue delay (within 72 hours) of any
            confirmed personal-data breach.
          </li>
        </ul>

        <h2>6. Technical and organizational measures</h2>
        <ul>
          <li>
            <strong>Encryption:</strong> AES-256-GCM at rest for vault fields;
            TLS 1.2+ in transit.
          </li>
          <li>
            <strong>Access:</strong> least-privilege access for personnel;
            production access requires named approval and is logged.
          </li>
          <li>
            <strong>Authentication:</strong> passwords are bcrypt-hashed; MFA
            available; OAuth tokens encrypted with the vault key.
          </li>
          <li>
            <strong>Network:</strong> private subnets for application
            servers; firewalled databases; HMAC-signed webhooks.
          </li>
          <li>
            <strong>Backups:</strong> encrypted daily backups with
            time-bounded retention.
          </li>
          <li>
            <strong>Audit:</strong> append-only audit log of security-relevant
            events available to enterprise customers on request.
          </li>
        </ul>

        <h2>7. Sub-processors</h2>
        <p>
          Processor uses sub-processors to operate the service (hosting,
          email delivery, error monitoring, payment processing). Current
          sub-processors are listed at{' '}
          <a href="mailto:legal@affixai.com">legal@affixai.com</a> upon
          request. Processor binds each sub-processor to data-protection
          obligations no less protective than those in this DPA.
        </p>

        <h2>8. Deletion and return of data</h2>
        <p>
          On termination of the underlying agreement, Processor will, at
          Controller's choice, delete or return all personal data within 90
          days, except where applicable law requires longer retention.
          Backups are deleted on their normal rotation schedule (no longer
          than 35 days).
        </p>

        <h2>9. International transfers</h2>
        <p>
          Where personal data is transferred outside the EEA, UK, or other
          regulated jurisdictions, Processor relies on Standard Contractual
          Clauses (or other approved transfer mechanisms) as needed. Specific
          mechanisms are described in the Order Form or available on request.
        </p>

        <h2>10. Audits</h2>
        <p>
          Controller may, on reasonable notice and no more than once per
          calendar year, request a summary of Processor's most recent
          security review or commissioned assessment. On-site audits are
          available for Enterprise customers under a separate agreement.
        </p>

        <h2>11. Liability</h2>
        <p>
          Liability under this DPA is subject to the limitations in the
          Terms of Service.
        </p>

        <h2>12. Governing law and order of precedence</h2>
        <p>
          This DPA is governed by the same law as the underlying Terms of
          Service. In case of conflict between this DPA and the Terms with
          respect to processing of personal data, this DPA prevails.
        </p>

        <h2>13. Contact</h2>
        <p>
          DPA execution and questions:{' '}
          <a href="mailto:legal@affixai.com">legal@affixai.com</a>. Security
          incidents: <a href="mailto:security@affixai.com">security@affixai.com</a>.
        </p>
      </Prose>
    </MarketingLayout>
  );
}

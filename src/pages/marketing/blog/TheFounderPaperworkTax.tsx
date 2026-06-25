import { Link } from 'react-router-dom';
import { BlogPostLayout } from './BlogPostLayout';
import { getPost } from '@/lib/blog';

export default function TheFounderPaperworkTax() {
  const post = getPost('the-founder-paperwork-tax')!;
  return (
    <BlogPostLayout post={post}>
      <p>
        I track the documents I sign because I'm a nerd about that kind of
        thing. In the twelve months around founding my last company, I signed
        forty-seven. Not contracts with customers — those are the fun ones,
        you don't begrudge those. I mean the operational paperwork tax:
        incorporation, banking, taxes, insurance, hiring, leases, vendor
        onboarding, every "before we can let you in, please fill out this
        seventeen-field PDF."
      </p>

      <p>
        Forty-seven documents. About thirty-five hours of pure typing,
        scanning, signing, re-scanning, emailing. That's a working week.
        For one founder. In a year where every working hour was already
        spoken for.
      </p>

      <p>
        If you've founded a company in the last decade you're nodding right
        now. If you haven't yet — let me show you what's coming, and what
        we built to defang it.
      </p>

      <h2>The list nobody warned you about</h2>

      <p>
        Here's roughly what your first year looks like, with rough document
        counts. Numbers are from polling fifteen founders across the US,
        UK, Nigeria, and Kenya. Your mix will differ; the total won't.
      </p>

      <ul>
        <li>
          <strong>Incorporation (4–6 docs):</strong> articles of
          incorporation / certificate of formation, operating agreement,
          founder agreements, IP assignment agreements, EIN / TIN
          applications.
        </li>
        <li>
          <strong>Banking + payments (3–5 docs):</strong> business banking
          KYC, signatory cards, Stripe / Paystack atlas, currency-account
          forms, AML declarations.
        </li>
        <li>
          <strong>Taxes (4–8 docs):</strong> W-9s / W-8BENs you send to
          customers, W-9s / W-8BENs you collect from vendors, sales-tax
          permits, state registrations, quarterly forms. Multiplies fast
          if you sell internationally.
        </li>
        <li>
          <strong>Insurance + benefits (3–6 docs):</strong> general
          liability, professional liability, health insurance applications
          for the team, workers' comp forms, beneficiary designations.
        </li>
        <li>
          <strong>Hiring (3–4 per hire):</strong> offer letters, NDAs,
          IP assignment, I-9 / right-to-work, direct-deposit forms,
          equity grant agreements. At five hires, that's ~20 documents.
        </li>
        <li>
          <strong>Vendor onboarding (1–3 per vendor):</strong> MSAs, NDAs,
          DPAs, SOC2 questionnaires, vendor information forms. Cloud
          providers, payroll, accounting, recruiting tools — each one
          wants its own paperwork.
        </li>
        <li>
          <strong>Real estate + utilities (2–4 docs):</strong> lease, sub-
          lease, utility setup, mailbox-rental application, business
          registration with the city.
        </li>
        <li>
          <strong>Investor-facing (5–10 docs):</strong> SAFE / SAFT /
          convertible note instruments, accredited-investor questionnaires,
          subscription agreements, voting agreements, side letters. Even
          a small angel round generates a stack.
        </li>
      </ul>

      <p>
        Forty-five-ish in a good year, sixty-plus if you're moving fast.
        And every single one wants the same fifteen pieces of information:
        legal name, business name, address, tax ID, signing authority,
        signature, date.
      </p>

      <h2>Why the existing tools don't fix this</h2>

      <p>
        Founders try the obvious things first. Here's why each misses:
      </p>

      <p>
        <strong>"I'll just use DocuSign."</strong> DocuSign is for sending
        documents to other people to sign. It's great at that. It does
        almost nothing for the documents being sent <em>to</em> you, where
        you're the signer, not the sender. About 70% of the founder
        paperwork tax is inbound. DocuSign helps with the other 30%.
      </p>

      <p>
        <strong>"I'll set up Chrome autofill."</strong> Chrome autofill
        handles five fields — name, email, phone, address, credit card.
        It chokes on every form-specific label like "EIN" or "Authorized
        Signatory" or "Place of Incorporation". You end up doing 80% of
        the form by hand anyway. And it doesn't work for PDFs at all.
      </p>

      <p>
        <strong>"I'll save a master template."</strong> Some founders
        keep a Google Doc with all their info and copy-paste from it.
        Honest, it's better than nothing — but it's still ten minutes per
        form, and the moment you move addresses or change tax IDs you
        have to remember to update the master, and you'll forget. We've
        seen founders sign contracts with two-year-old addresses because
        the master template wasn't updated.
      </p>

      <p>
        <strong>"I'll outsource it to my EA."</strong> If you have an EA.
        Most pre-seed founders don't. And even then, you still have to
        review and sign every document — you can't outsource your name.
      </p>

      <h2>What we built for this specifically</h2>

      <p>
        AffixAI was designed for exactly this workflow. Some pieces that
        founders care about most:
      </p>

      <p>
        <strong>An encrypted business-data vault.</strong> Separate
        sections for Personal, Business, Tax, Banking, Officers. You set
        up your business info once — legal entity name, EIN/TIN,
        registered address, signing authority, your director's
        information — and AffixAI uses it on every form. AES-256-GCM
        encryption at rest, no AI training, no resale. See our{' '}
        <Link to="/blog/encrypting-the-vault">encryption deep dive</Link>{' '}
        for the math.
      </p>

      <p>
        <strong>Universal PDF auto-affix.</strong> Drop a vendor MSA, an
        I-9, a W-9, a SAFE note. The engine reads it — even if it's a
        scanned image of a paper form, even if it's a weirdly-formatted
        government PDF — and fills every blank from your vault. Read{' '}
        <Link to="/blog/auto-affix-the-engine">how the engine works</Link>{' '}
        if you're curious about the layout heuristics.
      </p>

      <p>
        <strong>Multi-entry sections.</strong> You have multiple officers,
        multiple bank accounts, multiple addresses (registered vs.
        operating vs. mailing). Education and Employment, ditto. Each one
        gets its own card. The auto-affix engine picks the right one based
        on the form's question.
      </p>

      <p>
        <strong>Send for counter-signature.</strong> When you DO need to
        send something to a counterparty — a hiring letter, an NDA, a
        contractor SOW — drop in "sign here" markers and send a magic
        link. They sign in the browser, no account needed. The signed
        version comes back to you and stamps into the same workflow.
      </p>

      <p>
        <strong>Bulk-sign API for repeatable docs.</strong> Hiring a batch
        of contractors? Onboarding twenty SaaS vendors with the same MSA?
        The Enterprise plan exposes an API — pass a template + a list of
        recipients and AffixAI generates and sends them. Cuts an
        afternoon of manual work to thirty seconds. Powers our enterprise
        customers' bulk-hiring + bulk-vendor-renewal flows.
      </p>

      <h2>What it actually saves</h2>

      <p>
        The honest numbers from our early founder users (n=23, surveyed at
        90 days post-signup):
      </p>

      <ul>
        <li>
          Median time per document fell from <strong>~45 minutes</strong>{' '}
          (find the form, type, scan, sign, email back) to{' '}
          <strong>~4 minutes</strong> (drop in PDF, review placements,
          sign, download).
        </li>
        <li>
          On the forty-seven-doc year that's a savings of about{' '}
          <strong>thirty hours</strong>. Three working days.
        </li>
        <li>
          Compounding benefit: founders who use AffixAI for their first
          ten documents end up structuring their vault completely, so by
          document #20 the engine fills 95%+ of fields zero-touch.
        </li>
      </ul>

      <p>
        It's not a billion-dollar number. It's three working days. But for
        a founder in the first year, those three days are a customer call,
        a closed candidate, a shipped feature. They're not nothing.
      </p>

      <h2>The pitch, in one sentence</h2>

      <p>
        If you've ever copy-pasted your EIN into a vendor onboarding form,
        AffixAI is for you. Set up your vault once; never type it again.
      </p>

      <p>
        <strong>
          <Link to="/register">Try AffixAI free →</Link>
        </strong>{' '}
        30 days of Pro, no credit card. If you're a founder and want me
        to walk through setting up your business vault, hit{' '}
        <Link to="/contact">contact</Link> and pick "Sales" — happy to
        spend 20 minutes with anyone in the first 90 days of starting up.
      </p>
    </BlogPostLayout>
  );
}

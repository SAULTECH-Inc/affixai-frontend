import { BlogPostLayout } from './BlogPostLayout';
import { getPost } from '@/lib/blog';

export default function WhyWeBuiltAffixAi() {
  const post = getPost('why-we-built-affixai')!;
  return (
    <BlogPostLayout post={post}>
      <p>
        I counted, somewhere around the eighty-fourth time. That was my address.
        Eighty-four times in twelve months I'd typed the same five lines into
        the same kind of form: a vendor onboarding doc, a bank KYC update, a
        passport application, an NDA, a rental lease, the school portal for my
        nephew. Different fonts, different layouts, same data.
      </p>

      <p>
        The phone number was at ninety-one. The national ID at thirty-one. My
        mother's maiden name at sixteen (don't tell the security analysts).
      </p>

      <p>
        I'm a software engineer. I sign maybe two documents a week — that's
        light by the standards of someone running a small business or
        navigating an immigration application. And it still added up to weeks
        of pure typing every year. It was making me bitter at PDFs.
      </p>

      <h2>The autofill problem nobody actually solved</h2>

      <p>
        Browsers tried, in a half-hearted way. Chrome's autofill works for the
        five HTML inputs Google has decided are universal: first name, last
        name, email, phone, street address. It silently fails on every other
        field because <strong>nobody has tagged them correctly</strong>. Every
        country's "national ID" field is named something different. Every
        form has its own little quirks: <code>given_name</code> vs{' '}
        <code>fname</code>, <code>residence_address</code> vs <code>addr1</code>.
        Tag mismatch = no autofill.
      </p>

      <p>
        PDF forms are even worse. Almost nobody publishes them as proper
        AcroForms — they're either flattened images, or "fillable" PDFs whose
        field labels are just text floating near a blank line. Browser
        autofill doesn't touch those. Adobe Acrobat's "Fill & Sign" makes you
        manually type into every box. So does every "free PDF filler" online,
        most of which want a credit card before you can download the result.
      </p>

      <p>
        And the existing e-signature giants (DocuSign, HelloSign, Adobe Sign)
        solve a different problem — they're for sending PDFs to other people
        to sign, not for filling your own PDFs efficiently. The closest thing
        to "type my data once, fill any form" is browser password managers,
        which can stash a few address fields but choke on anything bespoke.
      </p>

      <p>
        So the case for AffixAI is short. Build a vault that knows{' '}
        <em>your</em> data — name, IDs, addresses, employer, signature, photo
        — in <em>your</em> schema. Build an engine that reads any PDF and maps
        its blanks to your vault. Done.
      </p>

      <h2>Why an "encrypted vault" and not just "saved fields"</h2>

      <p>
        The vault framing matters because the data it holds is genuinely
        sensitive — it's your government IDs, your tax numbers, your home
        address, an image of your signature. If we left this stuff sitting in
        plaintext columns, one breach makes us a tabloid headline and a
        regulator's case study.
      </p>

      <p>
        So every value in the vault is AES-256-GCM encrypted at rest. The key
        lives in a secrets manager, separate from the database. Even a full
        database dump tells an attacker which fields you've filled, but not
        what's in them. (We'll write up the crypto details in the next post —
        there are some real engineering tradeoffs there.)
      </p>

      <p>
        And critically: <strong>we don't train AI models on it.</strong>{' '}
        We don't sell it to data brokers. We don't even surface it to support
        staff except behind a one-off audited "decrypt for debugging" tool.
        The vault is yours; we just operate the lock.
      </p>

      <h2>Why "AI" is in the name</h2>

      <p>
        Some "AI" in this space is fluff — a wrapper around a chat completion
        endpoint that hasn't earned the label. We try to be more precise.
        AffixAI uses:
      </p>

      <ul>
        <li>
          <strong>Layout analysis</strong> — find blank lines, signature
          boxes, and labeled fields via PyMuPDF + positional OCR (Tesseract).
        </li>
        <li>
          <strong>Label matching</strong> — match form labels like "Surname",
          "Family name", or "Last name" against the same vault field via a
          curated alias dictionary plus fuzzy fallback.
        </li>
        <li>
          <strong>Pattern detection</strong> — recognize underscore lines{' '}
          <code>__________</code>, colon-pass forms like{' '}
          <code>Date of birth: ___</code>, and slash-separated alternatives
          like <code>Mr./Mrs./Ms.</code>
        </li>
        <li>
          <strong>Self-reference resolution</strong> — when a contract says
          "Signed at ___ on ___", we fill the place and date automatically.
        </li>
      </ul>

      <p>
        Where models help most is in label semantics — knowing that "Place of
        permanent residence" should match a vault address even though no human
        dictionary spells it that way. That's where we use small language
        models, not chat APIs. They're faster, deterministic, and don't ship
        your form to OpenAI.
      </p>

      <h2>What's next</h2>

      <p>
        We've built the engine. We've built the vault. We've built the editor
        that lets you review and edit every placement before you ship. We've
        built the send-for-signature flow so the counterparty can sign in the
        browser without an account. We've built country-aware pricing so a
        signup from Lagos doesn't get billed in US dollars at 4×
        purchasing-power parity.
      </p>

      <p>
        What's next is reaching the people this product is for. If you've
        ever typed your address into a form and thought "I shouldn't have to
        do this again", you're our audience.
      </p>

      <p>
        Try it free at <a href="/">affixai.com</a>. No card required. If you
        find something the engine can't read, send us the PDF — we'll fix it.
      </p>
    </BlogPostLayout>
  );
}

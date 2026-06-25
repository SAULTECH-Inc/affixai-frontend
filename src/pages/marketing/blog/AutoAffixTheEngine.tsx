import { BlogPostLayout } from './BlogPostLayout';
import { getPost } from '@/lib/blog';

export default function AutoAffixTheEngine() {
  const post = getPost('auto-affix-the-engine')!;
  return (
    <BlogPostLayout post={post}>
      <p>
        The hard part of AffixAI isn't the UI or the vault — it's teaching a
        computer that a blank space on a PDF labeled "Surname" wants the same
        value as one labeled "Family name" on the next document. This post
        walks through how the auto-affix engine actually does that.
      </p>

      <h2>Step 1: get the geometry</h2>

      <p>
        Before we can place anything, we need to know where the blanks are.
        PDFs come in two flavors:
      </p>

      <ul>
        <li>
          <strong>Born-digital</strong> — generated from Word, Pages,
          Acrobat, or any PDF writer. Text is real text. We use{' '}
          <strong>PyMuPDF</strong> to extract every text span with its
          bounding box, font, and size. This is fast and exact.
        </li>
        <li>
          <strong>Scanned</strong> — a photograph or scan of paper. Text
          is pixels. We use <strong>Tesseract OCR</strong> in PSM 6
          ("uniform block of text") mode to extract words plus their
          reconstructed bounding boxes. Slower (~3-5s per page) and less
          accurate, but workable.
        </li>
      </ul>

      <p>
        We auto-detect which flavor we're dealing with by trying PyMuPDF
        first; if it returns less than ~20 characters per page, we fall back
        to OCR.
      </p>

      <h2>Step 2: find the blanks</h2>

      <p>
        A "blank" is anywhere the user is expected to write something. There
        are four common patterns and we have a detector for each:
      </p>

      <p>
        <strong>The colon pattern.</strong>{' '}
        <code>Name of applicant:&nbsp;__________________</code>
        <br />
        The label is on the left, separated by a colon, with a blank line
        after. We find every line containing <code>:</code> and check whether
        the right-hand side is empty, underscored, or has a wide gap.
      </p>

      <p>
        <strong>The underscore pattern.</strong>{' '}
        <code>__________________</code> on a line of its own (often
        preceded by a label one line above). We scan for runs of underscores
        of width ≥ 8 characters. The label is whichever text fragment
        finishes closest above-left.
      </p>

      <p>
        <strong>The signature-box pattern.</strong>{' '}
        <code>Signature: __________________ Date: __________</code>
        <br />
        Common on contracts. We detect the keyword (signature, signed,
        sign here, x___) plus a width hint, then reserve enough space for
        a signature image rather than text.
      </p>

      <p>
        <strong>The whitespace-gap pattern.</strong>{' '}
        Some forms (especially government ones) just have a labeled box with
        empty whitespace. The detector here is the loosest — we look for
        labels followed by a column of empty space ≥ N inches wide that
        doesn't already contain text.
      </p>

      <h2>Step 3: match labels to vault fields</h2>

      <p>
        This is the linguistic part. We have a vault field called{' '}
        <code>last_name</code>. The form says one of:
      </p>

      <ul>
        <li>"Last name"</li>
        <li>"Surname"</li>
        <li>"Family name"</li>
        <li>"Apellido"</li>
        <li>"Nom de famille"</li>
        <li>"Patronymic" (Eastern European forms)</li>
        <li>"Father's surname" (some South Asian forms)</li>
      </ul>

      <p>
        We solve this in three passes, cheapest first:
      </p>

      <ol>
        <li>
          <strong>Exact alias dictionary.</strong> Each vault field carries a
          hand-curated list of common labels. Constant-time lookup, ~85% of
          real-world matches.
        </li>
        <li>
          <strong>Normalized fuzzy.</strong> Strip case, punctuation,
          plurals. Try Levenshtein distance ≤ 2 against the alias list.
          Catches "Sur Name" / "last name(s)" / "given names".
        </li>
        <li>
          <strong>Semantic fallback.</strong> When the first two miss, we
          use a small embedding model to score the label against each vault
          field's description. We only commit a match above 0.82
          confidence — below that we leave the field blank and surface it
          for the user to map manually.
        </li>
      </ol>

      <h2>Step 4: self-reference resolution</h2>

      <p>
        Some fields don't come from your vault — they come from the document
        itself. Two important ones:
      </p>

      <ul>
        <li>
          <strong>Today's date.</strong> A contract that says "Dated this
          ___ day of ___, ___" wants today's date split across three
          blanks. The engine recognizes the day-month-year pattern and
          fills it with the current date.
        </li>
        <li>
          <strong>Place of signing.</strong> "Signed at ___" wants either
          the user's vault city or the most recently used city from the
          user's other contracts. We default to the vault.
        </li>
      </ul>

      <h2>Step 5: render</h2>

      <p>
        Once we have a list of (page, x, y, value, font), the engine stamps
        each one via PyMuPDF's text-insertion API. Important details:
      </p>

      <ul>
        <li>
          <strong>Erase the underscore first.</strong> Otherwise the user's
          name reads "John ____Smith" on top of dotted underscores. We
          draw a white rectangle over the underscore range before stamping.
        </li>
        <li>
          <strong>Font matching.</strong> If the surrounding text is in
          Times Roman 11pt, we render the filled value in Times Roman 11pt.
          Where possible we sniff the font family from the surrounding span.
        </li>
        <li>
          <strong>Bound checking.</strong> If the value would overflow the
          available width (a long company name in a narrow box), we shrink
          the font until it fits.
        </li>
        <li>
          <strong>Vertical clearance.</strong> If two adjacent blanks
          would render so close that their text overlaps, we deduplicate
          — preferring the higher-confidence placement.
        </li>
      </ul>

      <h2>How accurate is it?</h2>

      <p>
        We measure on a corpus of ~400 real forms (NDAs, offer letters,
        passport renewals, NIN registrations, tax forms, rental leases):
      </p>

      <ul>
        <li>
          <strong>Born-digital PDFs:</strong> ~92% of fields filled
          correctly, ~3% mis-filled, ~5% left blank for user to handle.
        </li>
        <li>
          <strong>Scanned PDFs:</strong> ~75% correct, ~7% mis-filled,
          ~18% blank. The dropoff is OCR accuracy on label text more than
          anything else.
        </li>
      </ul>

      <p>
        Mis-filled is the bad case — the user has to notice and fix. We
        bias toward "leave it blank, user will fix" over "guess wrong".
        That's why we use confidence floors throughout the pipeline rather
        than always emitting a best-effort guess.
      </p>

      <h2>What's next</h2>

      <p>
        The biggest remaining frontier is layout-aware vision models for
        scanned forms. Tesseract is decent but the new wave of small VLMs
        (Qwen-VL, Donut, LayoutLMv3) outperform it on form layouts by a lot
        — at the cost of latency and infrastructure. We're prototyping
        Qwen-VL as an optional second pass for the scanned case.
      </p>

      <p>
        If you've got a PDF that AffixAI can't read, send it over. Every
        edge case we fix lifts accuracy for everyone.
      </p>
    </BlogPostLayout>
  );
}

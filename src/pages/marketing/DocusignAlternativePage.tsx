import AlternativePage from './AlternativePage';

export default function DocusignAlternativePage() {
  return (
    <AlternativePage
      competitor="DocuSign"
      competitorUrl="docusign.com"
      slug="docusign-alternative"
      competitorTagline="Enterprise e-signature platform"
      competitorPrice="From $15/user/month (billed annually)"
      competitorFreeplan="No free plan"
      description="Looking for a DocuSign alternative? Affix AI offers AI-powered auto-fill, an encrypted personal data vault, and regional pricing starting at ₦7,500/month — with a free plan and 30-day Pro trial, no card required."
      heroSubtitle="DocuSign is built for enterprise compliance teams. Affix AI is built for everyone who just needs to sign documents fast — with AI that fills every field automatically from your encrypted vault."
      keyDifference="Affix AI auto-fills your entire document from your vault the moment you upload it. DocuSign requires the sender to manually place every field before you can sign."
      comparisonRows={[
        { feature: 'AI auto-fill from personal vault', affixai: true, competitor: false },
        { feature: 'Encrypted personal data vault (AES-256-GCM)', affixai: true, competitor: false },
        { feature: 'Free plan', affixai: '5 docs/month forever', competitor: false },
        { feature: '30-day free trial, no card required', affixai: true, competitor: false },
        { feature: 'Regional pricing (Africa / Nigeria)', affixai: true, competitor: false },
        { feature: 'PDF field auto-detection + auto-fill', affixai: true, competitor: 'Manual placement only' },
        { feature: 'Multi-party signing workflow', affixai: true, competitor: true },
        { feature: 'Guest signing (no account needed)', affixai: true, competitor: true },
        { feature: 'Chrome extension (web form auto-fill)', affixai: true, competitor: false },
        { feature: 'Audit trail / certificate of completion', affixai: true, competitor: true },
        { feature: 'Mobile app', affixai: 'Progressive Web App', competitor: true },
        { feature: 'Bulk send / templates', affixai: true, competitor: true },
        { feature: 'Starting monthly price', affixai: '$19/month (or ₦7,500)', competitor: '$15/user/month' },
      ]}
      faq={[
        {
          q: 'Is Affix AI a good DocuSign alternative for small businesses?',
          a: 'Yes — Affix AI is purpose-built for individuals and small teams who need a fast, affordable signing workflow without enterprise overhead. The free plan covers 5 documents per month, the Pro trial is 30 days with no card, and paid plans start at a fraction of DocuSign\'s per-seat pricing. The AI auto-fill feature alone saves hours every week for teams dealing with repetitive form fields.',
        },
        {
          q: 'Can I import my existing DocuSign documents to Affix AI?',
          a: 'You can upload any PDF that you previously signed or sent through DocuSign — Affix AI accepts any standard PDF file. Active DocuSign envelopes in-flight cannot be migrated mid-workflow, but any completed document exported as a PDF can be stored and referenced in your Affix AI vault.',
        },
        {
          q: 'Is Affix AI cheaper than DocuSign?',
          a: 'Significantly, yes. DocuSign\'s Personal plan starts at $15/user/month (billed annually) with 5 envelopes per month. Affix AI\'s free plan gives you 5 documents per month at no cost, and Pro is $19/month with no envelope limits and all features included. For Nigerian users, Pro costs just ₦7,500/month via Paystack — making it dramatically more affordable for African markets.',
        },
        {
          q: 'Does Affix AI support multi-party signing like DocuSign?',
          a: 'Yes. You can add multiple signers to any document, set a signing order, and send each participant a magic link so they can sign directly in their browser — no Affix AI account required on their end. The workflow is similar to DocuSign\'s envelope routing, but without the per-envelope fees.',
        },
        {
          q: 'How does the AI auto-fill work compared to DocuSign?',
          a: 'DocuSign requires whoever sends the document to manually drag and drop field boxes (signature, date, name, etc.) onto the PDF before sending — a time-consuming setup step. Affix AI reads the uploaded PDF, automatically detects every blank field and label, and fills them from your encrypted vault in seconds. You review the placements, adjust if needed, and sign — no manual field setup required.',
        },
      ]}
    />
  );
}

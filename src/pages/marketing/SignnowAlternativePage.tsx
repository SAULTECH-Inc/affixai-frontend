import AlternativePage from './AlternativePage';

export default function SignnowAlternativePage() {
  return (
    <AlternativePage
      competitor="SignNow"
      competitorUrl="signnow.com"
      slug="signnow-alternative"
      competitorTagline="Business e-signature and workflow automation"
      competitorPrice="From $8/user/month (Business plan, billed annually)"
      competitorFreeplan="No free plan (trial only)"
      description="Looking for a SignNow alternative? Affix AI matches SignNow on price but adds AI auto-fill, an encrypted personal data vault, and regional pricing for African markets — with a free plan and 30-day Pro trial, no card required."
      heroSubtitle="SignNow offers competitive pricing, but it still requires manual field placement and stores no personal data intelligence. Affix AI adds an AI layer that reads your document and fills every field from your vault — so you sign in seconds, not minutes."
      keyDifference="SignNow automates signature collection workflows. Affix AI automates the data entry before you sign — reading the PDF and populating your name, address, ID numbers, and signature from your encrypted vault automatically."
      comparisonRows={[
        { feature: 'AI auto-fill from personal vault', affixai: true, competitor: false },
        { feature: 'Encrypted personal data vault (AES-256-GCM)', affixai: true, competitor: false },
        { feature: 'Free plan', affixai: '5 docs/month forever', competitor: false },
        { feature: '30-day free trial, no card required', affixai: true, competitor: 'Trial available' },
        { feature: 'Regional pricing (Africa / Nigeria)', affixai: true, competitor: false },
        { feature: 'PDF field auto-detection + auto-fill', affixai: true, competitor: 'Manual placement only' },
        { feature: 'Multi-party signing workflow', affixai: true, competitor: true },
        { feature: 'Guest signing (no account needed)', affixai: true, competitor: true },
        { feature: 'Chrome extension (web form auto-fill)', affixai: true, competitor: false },
        { feature: 'Audit trail / certificate of completion', affixai: true, competitor: true },
        { feature: 'Conditional routing / workflow builder', affixai: false, competitor: true },
        { feature: 'Mobile app', affixai: 'Progressive Web App', competitor: true },
        { feature: 'Starting monthly price', affixai: '$19/month (or ₦7,500)', competitor: '$8/user/month (teams = $20+)' },
      ]}
      faq={[
        {
          q: 'Is Affix AI cheaper than SignNow for small teams?',
          a: 'On the surface SignNow starts at $8/user/month, which sounds cheaper than Affix AI\'s $19/month. But SignNow\'s Business plan at that price is per user — a 3-person team pays $24/month minimum. Affix AI\'s $19/month covers a single user with all features included, and the free plan covers 5 documents per month at no cost. For Nigerian users, Pro is ₦7,500/month via Paystack.',
        },
        {
          q: 'Does Affix AI have workflow automation like SignNow?',
          a: 'SignNow has more advanced workflow routing features — conditional fields, role-based signing sequences, and CRM integrations — that Affix AI does not currently match. If you need complex multi-step approval workflows embedded in a larger business process, SignNow may be the better tool. If you need to sign documents quickly and accurately with minimal manual data entry, Affix AI\'s AI auto-fill is the better choice.',
        },
        {
          q: 'How is Affix AI different from SignNow for individual users?',
          a: 'SignNow\'s core value is for businesses sending documents to many signers at scale. Affix AI is optimized for the person who signs documents — filling fields from your vault, detecting signature boxes, and getting the document back to the sender in under a minute. The Chrome extension also auto-fills web forms, not just PDFs, which SignNow does not offer.',
        },
        {
          q: 'Can Affix AI replace SignNow for a team of 5 or fewer people?',
          a: 'For most use cases, yes. Affix AI supports multi-party signing, document templates, audit trails, and guest signing without requiring team members to have accounts. For teams that primarily need to fill, sign, and send contracts or agreements, Affix AI\'s feature set is more than sufficient — at a lower total cost and with the AI auto-fill advantage.',
        },
        {
          q: 'Is SignNow available in Africa / Nigeria?',
          a: 'SignNow can be accessed globally but charges in USD and does not offer localized pricing for African markets. Affix AI specifically supports Nigerian users with Paystack integration at ₦7,500/month, and African users broadly via Flutterwave at $8/month — making it the more accessible option for teams in the region.',
        },
      ]}
    />
  );
}

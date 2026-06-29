import AlternativePage from './AlternativePage';

export default function HellosignAlternativePage() {
  return (
    <AlternativePage
      competitor="HelloSign (Dropbox Sign)"
      competitorUrl="sign.dropbox.com"
      slug="hellosign-alternative"
      competitorTagline="Dropbox-integrated e-signature tool"
      competitorPrice="From $20/user/month (Essentials plan)"
      competitorFreeplan="3 signature requests/month"
      description="Looking for a HelloSign or Dropbox Sign alternative? Affix AI offers AI-powered document auto-fill, an AES-256-GCM encrypted vault, and regional pricing starting at ₦7,500/month — far more affordable than HelloSign's $20/month Essentials plan."
      heroSubtitle="HelloSign (now Dropbox Sign) works well if you're already in the Dropbox ecosystem. Affix AI works for everyone — with AI that reads your document and fills every field from your encrypted vault automatically, no Dropbox required."
      keyDifference="Unlike HelloSign, Affix AI doesn't just collect signatures — it auto-fills the entire document from your vault before you sign, eliminating the repetitive data entry that makes signing tedious."
      comparisonRows={[
        { feature: 'AI auto-fill from personal vault', affixai: true, competitor: false },
        { feature: 'Encrypted personal data vault (AES-256-GCM)', affixai: true, competitor: false },
        { feature: 'Free plan', affixai: '5 docs/month forever', competitor: '3 requests/month' },
        { feature: '30-day free trial, no card required', affixai: true, competitor: false },
        { feature: 'Regional pricing (Africa / Nigeria)', affixai: true, competitor: false },
        { feature: 'PDF field auto-detection + auto-fill', affixai: true, competitor: 'Manual placement only' },
        { feature: 'Multi-party signing workflow', affixai: true, competitor: true },
        { feature: 'Guest signing (no account needed)', affixai: true, competitor: true },
        { feature: 'Chrome extension (web form auto-fill)', affixai: true, competitor: false },
        { feature: 'Audit trail / certificate of completion', affixai: true, competitor: true },
        { feature: 'Dropbox storage integration', affixai: false, competitor: true },
        { feature: 'Mobile app', affixai: 'Progressive Web App', competitor: true },
        { feature: 'Starting monthly price', affixai: '$19/month (or ₦7,500)', competitor: '$20/user/month' },
      ]}
      faq={[
        {
          q: 'Is Affix AI better than HelloSign for freelancers?',
          a: 'For most freelancers, yes. HelloSign\'s free tier caps you at 3 signature requests per month, which runs out quickly. Affix AI\'s free plan gives you 5 documents per month, and Pro is $19/month with unlimited documents. More importantly, Affix AI auto-fills client contracts, NDAs, and proposal PDFs from your vault — saving you from retyping your name, address, and company info on every engagement.',
        },
        {
          q: 'Does Affix AI integrate with Dropbox like HelloSign does?',
          a: 'Affix AI does not have a native Dropbox integration today. If your workflow is tightly coupled to Dropbox file management, HelloSign may be a better fit for that specific integration. However, if your primary pain point is filling and signing documents quickly — especially repetitive ones with the same personal data — Affix AI\'s AI auto-fill and encrypted vault offer a meaningfully better experience.',
        },
        {
          q: 'How does Affix AI pricing compare to Dropbox Sign?',
          a: 'Dropbox Sign\'s Essentials plan is $20/user/month (billed annually) for unlimited signature requests. Affix AI Pro is $19/month globally, $8/month for African users, or ₦7,500/month for Nigerian users via Paystack. Both offer similar signing volume, but Affix AI includes AI auto-fill and an encrypted vault that Dropbox Sign lacks entirely.',
        },
        {
          q: 'Can I switch from HelloSign to Affix AI without losing my signed documents?',
          a: 'Signed documents you\'ve downloaded as PDFs from HelloSign can be uploaded and stored in Affix AI. Any in-progress signing requests on HelloSign will need to complete there first. Once you\'re on Affix AI, your vault stores your personal data encrypted so you never have to re-enter it across future documents.',
        },
        {
          q: 'Does Affix AI have an API like HelloSign?',
          a: 'Affix AI is currently focused on the end-user signing experience rather than developer API integrations. HelloSign has a mature API for embedding signatures in SaaS products. If you need a signing API for your app, HelloSign or DocuSign may suit that use case better. If you need a tool to sign your own documents faster and cheaper, Affix AI wins.',
        },
      ]}
    />
  );
}

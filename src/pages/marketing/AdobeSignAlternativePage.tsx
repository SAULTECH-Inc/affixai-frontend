import AlternativePage from './AlternativePage';

export default function AdobeSignAlternativePage() {
  return (
    <AlternativePage
      competitor="Adobe Acrobat Sign"
      competitorUrl="acrobat.adobe.com/us/en/sign.html"
      slug="adobe-sign-alternative"
      competitorTagline="Adobe's enterprise e-signature and PDF suite"
      competitorPrice="From $23/user/month (Acrobat Standard)"
      competitorFreeplan="No standalone free plan"
      description="Looking for an Adobe Acrobat Sign alternative? Affix AI offers AI-powered auto-fill, an AES-256-GCM encrypted vault, and regional pricing from ₦7,500/month — without Adobe's $23/month subscription or Creative Cloud tie-in."
      heroSubtitle="Adobe Acrobat Sign is a premium enterprise product bundled with Adobe's PDF suite. Affix AI is a focused, AI-native signing tool that reads your document and fills every field from your encrypted vault — no Adobe subscription needed."
      keyDifference="Adobe Sign requires you to pay for the full Acrobat suite to unlock e-signatures. Affix AI gives you AI auto-fill, encrypted vault storage, and multi-party signing as standalone features — starting free."
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
        { feature: 'Native PDF editing (Acrobat)', affixai: false, competitor: true },
        { feature: 'Adobe Creative Cloud integration', affixai: false, competitor: true },
        { feature: 'Mobile app', affixai: 'Progressive Web App', competitor: true },
        { feature: 'Starting monthly price', affixai: '$19/month (or ₦7,500)', competitor: '$23/user/month' },
      ]}
      faq={[
        {
          q: 'Do I need Adobe Acrobat to use Adobe Sign?',
          a: 'Adobe Acrobat Sign is sold as part of Adobe Acrobat\'s subscription plans, which means you\'re effectively paying for a full PDF editing suite to access e-signature features. Affix AI is a standalone product — you get AI auto-fill, multi-party signing, an encrypted vault, and the Chrome extension without buying into a larger software suite you may not need.',
        },
        {
          q: 'Is Affix AI significantly cheaper than Adobe Acrobat Sign?',
          a: 'Yes. Adobe Acrobat Standard (which includes Sign) starts at $23/user/month. Affix AI Pro is $19/month globally, $8/month for African users, or ₦7,500/month for Nigerian users via Paystack. The free plan also gives 5 documents per month at no cost — something Adobe does not offer for its Sign product.',
        },
        {
          q: 'Can Affix AI handle the same PDF types as Adobe Acrobat Sign?',
          a: 'Affix AI works with standard PDF files — scanned documents, generated PDFs, and forms with fillable fields. Adobe Acrobat Sign benefits from tight integration with Adobe\'s PDF engine for complex forms and XFA-based PDFs. If you regularly work with highly complex Adobe-native form types, that integration may matter. For standard contracts, agreements, and government forms, Affix AI handles them reliably.',
        },
        {
          q: 'How does Affix AI compare to Adobe Sign for compliance requirements?',
          a: 'Adobe Acrobat Sign is certified for several enterprise compliance standards (SOC 2, ISO 27001, HIPAA BAA) and is a common choice in regulated industries. Affix AI stores personal data with AES-256-GCM encryption and provides audit trails for all signing events. For regulated enterprise workflows requiring specific certifications, Adobe Sign may have a compliance advantage. For most business and personal use cases, Affix AI\'s security model is more than sufficient.',
        },
        {
          q: 'What happens to my Adobe Sign documents if I switch to Affix AI?',
          a: 'Completed signed documents exported as PDFs from Adobe Sign can be uploaded to Affix AI for reference. In-progress envelopes on Adobe Sign should be completed there. Going forward, you can manage all new signing through Affix AI, and your encrypted vault ensures your personal data is pre-filled on every new document automatically — eliminating the manual entry that makes signing tedious.',
        },
      ]}
    />
  );
}

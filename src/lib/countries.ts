// Country detection + a curated picker list.
//
// We auto-detect the user's country from the browser locale
// (`navigator.language`) — fast, no extra request, no IP-lookup
// dependency. If the locale doesn't carry a region (e.g. just "en"), we
// fall back to undefined and let the user pick.

// Two-letter ISO 3166-1 region codes parsed out of locale strings.
export function detectCountryFromBrowser(): string | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const candidates = [
    ...(navigator.languages || []),
    navigator.language,
  ].filter(Boolean) as string[];
  for (const tag of candidates) {
    // tags look like "en-US", "fr-CA", "pt-BR", or just "en"
    const m = /-([A-Z]{2})$/.exec(tag);
    if (m) return m[1].toUpperCase();
  }
  return undefined;
}

// Picker list. Top countries first (large markets / supported gateways)
// then the long tail. Add more as you expand — anything missing from
// here just routes via the backend's default rules anyway.
export const COUNTRIES: { code: string; name: string }[] = [
  // Top markets
  { code: 'NG', name: '🇳🇬 Nigeria' },
  { code: 'KE', name: '🇰🇪 Kenya' },
  { code: 'ZA', name: '🇿🇦 South Africa' },
  { code: 'GH', name: '🇬🇭 Ghana' },
  { code: 'EG', name: '🇪🇬 Egypt' },
  { code: 'US', name: '🇺🇸 United States' },
  { code: 'GB', name: '🇬🇧 United Kingdom' },
  { code: 'CA', name: '🇨🇦 Canada' },
  { code: 'DE', name: '🇩🇪 Germany' },
  { code: 'FR', name: '🇫🇷 France' },
  { code: 'IN', name: '🇮🇳 India' },
  { code: 'AU', name: '🇦🇺 Australia' },
  { code: 'BR', name: '🇧🇷 Brazil' },
  // Other African (Flutterwave coverage)
  { code: 'UG', name: '🇺🇬 Uganda' },
  { code: 'TZ', name: '🇹🇿 Tanzania' },
  { code: 'RW', name: '🇷🇼 Rwanda' },
  { code: 'CM', name: '🇨🇲 Cameroon' },
  { code: 'CI', name: "🇨🇮 Côte d'Ivoire" },
  { code: 'SN', name: '🇸🇳 Senegal' },
  { code: 'ZM', name: '🇿🇲 Zambia' },
  { code: 'ZW', name: '🇿🇼 Zimbabwe' },
  { code: 'MA', name: '🇲🇦 Morocco' },
  // Europe
  { code: 'IE', name: '🇮🇪 Ireland' },
  { code: 'NL', name: '🇳🇱 Netherlands' },
  { code: 'ES', name: '🇪🇸 Spain' },
  { code: 'IT', name: '🇮🇹 Italy' },
  { code: 'PL', name: '🇵🇱 Poland' },
  { code: 'SE', name: '🇸🇪 Sweden' },
  // Asia-Pacific
  { code: 'SG', name: '🇸🇬 Singapore' },
  { code: 'JP', name: '🇯🇵 Japan' },
  { code: 'KR', name: '🇰🇷 South Korea' },
  { code: 'AE', name: '🇦🇪 United Arab Emirates' },
  // Americas
  { code: 'MX', name: '🇲🇽 Mexico' },
  { code: 'AR', name: '🇦🇷 Argentina' },
];

// Convenience: country name lookup (falls back to the code if unknown).
export function countryName(code: string | null | undefined): string {
  if (!code) return '—';
  return COUNTRIES.find((c) => c.code === code.toUpperCase())?.name ?? code;
}

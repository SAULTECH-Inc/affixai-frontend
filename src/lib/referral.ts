// Referral attribution helper — runs in two places:
//
// 1. LandingPage / any public page: if the URL has ?ref=CODE, persist it
//    to localStorage so it survives the signup detour through /register.
// 2. RegisterPage: read the persisted code and POST it with the signup
//    payload. Once attributed, the code is cleared.
//
// We use localStorage rather than a cookie because:
//   * we don't need to send it on every request — only at signup
//   * no extra CORS / domain config
//   * survives a closed-tab browser restart, which a session cookie
//     wouldn't

const STORAGE_KEY = 'affixai_ref_code';
const TTL_DAYS = 30;

interface StoredRef {
  code: string;
  captured_at: number; // epoch ms
}

/**
 * Read the `?ref=CODE` query param from the current URL and save it.
 * Idempotent — calling on a page without `?ref=` is a no-op so it's safe
 * to call from any public page mount.
 */
export function captureReferralCode(): void {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('ref');
    if (!code) return;
    const cleaned = code.trim().toLowerCase().slice(0, 24);
    if (!/^[a-z0-9]+$/.test(cleaned)) return; // ignore junk
    const stored: StoredRef = { code: cleaned, captured_at: Date.now() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // localStorage can be disabled (Safari private mode). Drop quietly.
  }
}

/**
 * Return the stored referral code if present and not too old.
 * Returns undefined if expired or never set.
 */
export function getStoredReferralCode(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed: StoredRef = JSON.parse(raw);
    const ageDays = (Date.now() - parsed.captured_at) / (1000 * 60 * 60 * 24);
    if (ageDays > TTL_DAYS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return undefined;
    }
    return parsed.code;
  } catch {
    return undefined;
  }
}

/**
 * Clear the stored code after a successful signup. The backend keeps the
 * Referral row — we don't need the cookie anymore.
 */
export function clearReferralCode(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}

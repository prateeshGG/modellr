/** Public project links and optional settings. */

/** GitHub repository in owner/name form. Change here if the repo is ever renamed again. */
export const GITHUB_REPO = 'prateeshGG/modellr';
export const REPO_URL = `https://github.com/${GITHUB_REPO}`;

/**
 * Your Buy Me a Coffee page, e.g. 'https://buymeacoffee.com/yourname'.
 * While this is empty, every "support" button and sentence stays hidden.
 * You can also set it at build time with the VITE_DONATE_URL environment variable.
 */
const CONFIGURED_DONATE_URL = 'https://buymeacoffee.com/prateeshG';

const ALLOWED_DONATE_HOSTS = ['buymeacoffee.com', 'www.buymeacoffee.com', 'bmc.link'];

/**
 * Accept only https links on Buy Me a Coffee's own domains, so a typo or a bad build variable can
 * never render a `javascript:` or look-alike link. Returns '' when the value is empty or unsafe.
 */
export function normalizeDonateUrl(value: string | undefined | null): string {
  const raw = (value ?? '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return '';
    if (!ALLOWED_DONATE_HOSTS.includes(url.hostname.toLowerCase())) return '';
    if (url.pathname.replace(/\//g, '') === '') return ''; // needs a page name, not just the domain
    return url.toString();
  } catch {
    return '';
  }
}

export const DONATE_URL = normalizeDonateUrl(import.meta.env.VITE_DONATE_URL || CONFIGURED_DONATE_URL);

import { useEffect } from 'react';
import { DEFAULT_DESCRIPTION, buildTitle } from './routeMeta';

/** Public origin of the deployed site, without a trailing slash (set VITE_SITE_URL at build time). */
export const SITE_URL: string = ((import.meta.env.VITE_SITE_URL as string | undefined) ?? '').replace(/\/+$/, '');
export interface SeoOptions {
  /** Page title without the site name; the site name is appended. Omit for the home page. */
  title?: string;
  description?: string;
  /** Route path such as "/features". Used for the canonical URL. */
  path?: string;
  /** Keep the page out of search results (editor, embeds, app pages). */
  noindex?: boolean;
  /** Do nothing (e.g. an embedded sandbox that sits inside a page that already sets its own meta). */
  disabled?: boolean;
}

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href: string | null) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!href) { el?.remove(); return; }
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/** Sets the document title, description, canonical URL, social tags and robots meta for the current route. */
export function useSeo({ title, description = DEFAULT_DESCRIPTION, path, noindex = false, disabled = false }: SeoOptions) {
  useEffect(() => {
    if (disabled) return;
    const full = buildTitle(title);
    document.title = full;
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', full);
    setMeta('property', 'og:description', description);
    setMeta('name', 'twitter:title', full);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
    const url = SITE_URL && path !== undefined ? `${SITE_URL}${path === '/' ? '' : path}` : null;
    setCanonical(noindex ? null : url);
    if (url) setMeta('property', 'og:url', url);
  }, [title, description, path, noindex, disabled]);
}

export const CONTACT_EMAIL = 'association.computingmachinery@itu.edu.pk';

export const GMAIL_COMPOSE_URL = `https://mail.google.com/mail/?view=cm&fs=1&cc=${encodeURIComponent(CONTACT_EMAIL)}`;

export function getContactComposeLink() {
  const userAgent = navigator.userAgent;
  const isAppleMobile = /iPhone|iPad|iPod/i.test(userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isAppleMobile) {
    return {
      href: `googlegmail://co?cc=${encodeURIComponent(CONTACT_EMAIL)}`,
      target: '_self',
    } as const;
  }

  if (/Android/i.test(userAgent)) {
    return {
      href: `intent://?cc=${encodeURIComponent(CONTACT_EMAIL)}#Intent;scheme=mailto;package=com.google.android.gm;S.browser_fallback_url=${encodeURIComponent(GMAIL_COMPOSE_URL)};end`,
      target: '_self',
    } as const;
  }

  return { href: GMAIL_COMPOSE_URL, target: '_blank' } as const;
}

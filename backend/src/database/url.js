const NEON_HOST = /\.neon\.tech$/i;

/**
 * Neon'dan nusxalangan satrni Prisma uchun tayyorlaydi:
 * - `psql '...'` yoki qo'shtirnoqli ko'rinishdan faqat URL'ni ajratadi;
 * - Neon'ning `-pooler` manzilini to'g'ridan-to'g'ri manzilga almashtiradi;
 * - `connect_timeout` qo'shadi;
 * - kerak bo'lsa `channel_binding=require` ni `prefer` ga yumshatadi.
 */
export function normalizeDatabaseUrl(raw, { relaxChannelBinding = false } = {}) {
  const match = String(raw || '').match(/postgres(?:ql)?:\/\/[^\s'"]+/i);
  if (!match) return raw;

  let url;
  try {
    url = new URL(match[0]);
  } catch {
    return match[0];
  }

  if (NEON_HOST.test(url.hostname)) {
    url.hostname = url.hostname.replace(/-pooler(?=\.)/i, '');
    if (!url.searchParams.has('sslmode')) url.searchParams.set('sslmode', 'require');
  }
  if (!url.searchParams.has('connect_timeout')) url.searchParams.set('connect_timeout', '15');
  if (relaxChannelBinding && url.searchParams.get('channel_binding') === 'require') {
    url.searchParams.set('channel_binding', 'prefer');
  }

  return url.toString();
}

export const isChannelBindingError = (error) => /channel binding/i.test(String(error?.message || error || ''));

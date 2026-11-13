/** Only application-relative paths may enter the client router. */
export function safeRedirect(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\x00-\x20\x7f]/.test(value)) return '/dashboard';
  try {
    const target = new URL(value, 'https://invoicebillos.invalid');
    if (target.origin !== 'https://invoicebillos.invalid' || target.pathname.startsWith('//')) return '/dashboard';
    return target.pathname + target.search + target.hash;
  } catch { return '/dashboard'; }
}

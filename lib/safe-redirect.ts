/**
 * Post-login redirect targets must stay on this site. Accepts only absolute-path references
 * ("/account"), never "//evil.com", "/\evil.com", "https://...", "javascript:..." or control characters.
 */
export function safeRedirectPath(target: string | null | undefined, fallback = '/'): string {
  if (typeof target !== 'string' || target.length === 0 || target.length > 500) return fallback;
  if (!target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\\]/.test(target)) return fallback;
  try {
    // Also refuse percent-encoded control characters (CR/LF, NUL, tab).
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u001f\u007f\\]/.test(decodeURIComponent(target))) return fallback;
  } catch {
    return fallback;
  }
  try {
    const u = new URL(target, 'http://placeholder.invalid');
    if (u.origin !== 'http://placeholder.invalid') return fallback;
  } catch {
    return fallback;
  }
  return target;
}

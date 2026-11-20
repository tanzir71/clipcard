export function sitePath(part = '') {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${part.replace(/^\//, '')}`;
}

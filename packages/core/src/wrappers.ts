type Wrapper = {
  hosts: readonly string[];
  path?: string;
  target: (url: URL) => string | null;
};

const param = (name: string) => (url: URL) => url.searchParams.get(name);

export const WRAPPERS: readonly Wrapper[] = [
  {
    hosts: ['l.facebook.com', 'lm.facebook.com', 'l.messenger.com'],
    path: '/l.php',
    target: param('u'),
  },
  { hosts: ['l.instagram.com'], path: '/', target: param('u') },
  {
    hosts: ['google.com', 'www.google.com'],
    path: '/url',
    target: (url) => url.searchParams.get('url') || url.searchParams.get('q'),
  },
  { hosts: ['out.reddit.com'], target: param('url') },
  {
    hosts: ['youtube.com', 'www.youtube.com', 'm.youtube.com'],
    path: '/redirect',
    target: param('q'),
  },
  { hosts: ['href.li'], path: '/', target: (url) => url.search.slice(1) },
  { hosts: ['slack-redir.net'], path: '/link', target: param('url') },
];

export function wrappedTarget(url: URL): string | null {
  const { hostname, pathname, search } = url;
  if (hostname === 'youtu.be' && /^\/[\w-]+\/?$/.test(pathname)) {
    const to = new URL('https://www.youtube.com/watch');
    to.searchParams.set('v', pathname.split('/')[1]!);
    for (const [key, value] of url.searchParams) {
      if (key !== 'v') to.searchParams.append(key, value);
    }
    return to.href;
  }

  const google = hostname === 'google.com' || hostname === 'www.google.com';
  const ampCache =
    hostname === 'ampproject.org' || hostname.endsWith('.ampproject.org');
  const amp = google ? /^\/amp\/(s\/)?(.+)$/ : /^\/c\/(s\/)?(.+)$/;
  if (google || ampCache) {
    const match = amp.exec(pathname);
    if (match) return (match[1] ? 'https://' : 'http://') + match[2] + search;
  }

  const wrapper = WRAPPERS.find(
    ({ hosts, path }) =>
      hosts.includes(hostname) && (!path || path === pathname),
  );
  return wrapper?.target(url) ?? null;
}

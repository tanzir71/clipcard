const paths = {
  add: 'M12 5v14M5 12h14',
  arrowLeft: 'm14 6-6 6 6 6',
  arrowRight: 'm10 6 6 6-6 6',
  bookmark: 'M6 4h12v16l-6-4-6 4z',
  card: 'M6 3h12v18H6z',
  close: 'm6 6 12 12M18 6 6 18',
  copy: 'M8 8h12v12H8zM16 4H4v12',
  download: 'M12 4v11m-4-4 4 4 4-4M5 16v4h14v-4',
  pause: 'M8 5v14m8-14v14',
  video: 'M4 4h16v16H4z M10 8v8l6-4z',
  grid: 'M3 3h18v18H3zM12 3v18M3 12h18',
  link: 'M10 13a4 4 0 0 0 6 .5l3.5-3.5a4 4 0 0 0-5.7-5.7l-2 2M14 11a4 4 0 0 0-6-.5L4.5 14a4 4 0 0 0 5.7 5.7l2-2',
  photo: 'M3 4h18v16H3zM3 17l5-5 4 4 3-3 6 5M16 8h.01',
  qr: 'M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h2v2h4v4h-2m-4 0h-2',
  quote: 'M10 5H4v7h6v2l-3 5m13-14h-6v7h6v2l-3 5',
  settings:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',
  share: 'M12 15V3m-4 4 4-4 4 4M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7',
  shield: 'M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3zm-3 9 2 2 4-4',
  scissors:
    'M6 3a3 3 0 1 0 0 6 3 3 0 1 0 0-6zm0 12a3 3 0 1 0 0 6 3 3 0 1 0 0-6zm2-7 11 11m0-14-11 11',
};

export type IconName = keyof typeof paths;
export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}

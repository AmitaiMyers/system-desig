// One outlined icon set (24 px grid, 1.5 px stroke). Icons take the current text colour,
// so they can carry status colours. They are decorative: meaning is always in adjacent text.

const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
const box = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`;

const PATHS = {
  server: `${box(3, 4, 18, 7, 2)}${box(3, 13, 18, 7, 2)}M7 7.5h.01M7 16.500h.01`,
  database: 'M4 6c0-1.700 3.600-3 8-3s8 1.300 8 3-3.600 3-8 3-8-1.300-8-3zM4 6v6c0 1.700 3.600 3 8 3s8-1.300 8-3V6M4 12v6c0 1.700 3.600 3 8 3s8-1.300 8-3v-6',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  balancer: `M12 3v5M12 8l-7 6.500M12 8l7 6.500M12 8v6.500${circle(5, 17, 2)}${circle(12, 17, 2)}${circle(19, 17, 2)}`,
  cache: `${box(6, 6, 12, 12, 2)}M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4`,
  queue: `${box(3, 6, 18, 12, 2)}M3 8l9 6 9-6`,
  bucket: 'M4 7l2 13h12l2-13M4 7c0-1.400 3.600-2.500 8-2.500S20 5.600 20 7s-3.600 2.500-8 2.500S4 8.400 4 7z',
  globe: `${circle(12, 12, 9)}M3 12h18M12 3c3 3.500 3 14.500 0 18M12 3c-3 3.500-3 14.500 0 18`,
  users: `${circle(9, 8, 3.5)}M2.500 20c0-3.600 2.900-6 6.500-6s6.500 2.400 6.500 6${circle(17.5, 9, 2.5)}M17 14.200c2.700.300 4.500 2.400 4.500 5.300`,
  chevron: 'M9 5l7 7-7 7',
  back: 'M15 5l-7 7 7 7',
  check: 'M5 12.500l4.500 4.500L19 7.500',
  cross: 'M6 6l12 12M18 6 6 18',
  alert: 'M12 3 2 20h20L12 3zM12 10v4M12 17h.01',
  lock: `${box(5, 11, 14, 9, 2)}M8 11V8a4 4 0 0 1 8 0v3`,
  book: 'M12 6.500C10.500 5 8 4.500 4 4.500v14c4 0 6.500.500 8 2 1.500-1.500 4-2 8-2v-14c-4 0-6.500.500-8 2zM12 6.500v14',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  play: 'M7 4v16l13-8z',
  pause: 'M8 5v14M16 5v14',
  clock: `${circle(12, 12, 9)}M12 7v5l3 2`,
  money: `${circle(12, 12, 9)}M12 6.500v11M15 9.500c-.600-1-1.700-1.500-3-1.500-1.700 0-3 .900-3 2s1.300 2 3 2 3 .900 3 2-1.300 2-3 2c-1.300 0-2.400-.500-3-1.500`,
  mic: `${box(9, 3, 6, 11, 3)}M5 11a7 7 0 0 0 14 0M12 18v3`,
  reset: 'M4 12a8 8 0 1 0 2.300-5.700M4 4v5h5',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.500 10.900c.600.500 1 1.300 1 2.100h5c0-.800.400-1.600 1-2.100A6 6 0 0 0 12 3z',
  trend: 'M4 19h16M5 15l4-4 3 3 6-7',
  image: `${box(3, 5, 18, 14, 2)}${circle(8.5, 10, 1.5)}M21 16l-5-5-8 8`,
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  );
}

import type { ReactNode } from "react";

/** Ícones em traço, desenhados aqui para não depender de pacote. */
const PATHS: Record<string, ReactNode> = {
  pick: <path d="M14.5 4.5c3 1 5 3 6 6M3 21l9.5-9.5M9.5 8.5l6 6M6 7c3-3 8-4 12-2-4-1-7 0-9 2l-1 1zm11 11c3-3 4-8 2-12 1 4 0 7-2 9l-1 1z" />,
  list: <path d="M4 6h16M4 12h16M4 18h10" />,
  flame: <path d="M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-2 1-3.500 2-4.500.2 1.500 1 2.500 2 3 0-3 .5-6 2-9.500z" />,
  funnel: <path d="M4 5h16l-6 7.500V19l-4 2v-8.500z" />,
  eye: <><path d="M2.500 12S6 5.500 12 5.500 21.500 12 21.500 12 18 18.500 12 18.500 2.500 12 2.500 12z" /><circle cx="12" cy="12" r="3" /></>,
  video: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m10 9 5 3-5 3z" /></>,
  alert: <path d="M12 3 2.500 20h19zM12 10v4.500M12 17.500v.5" />,
  key: <><circle cx="10.500" cy="10.500" r="6.500" /><path d="m20.500 20.500-5.200-5.200" /></>,
  pulse: <path d="M3 12h4l2.500-6 4.500 12 2.500-6H21" />,
  star: <path d="m12 3.500 2.700 5.600 6.100.8-4.500 4.200 1.200 6.100-5.500-3-5.500 3 1.200-6.100L3.200 9.900l6.100-.8z" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  ban: <><circle cx="12" cy="12" r="8.500" /><path d="m6 6 12 12" /></>,
  external: <path d="M9 5H5v14h14v-4M13 4h7v7M20 4 11 13" />,
  copy: <><rect x="8.500" y="8.500" width="11.500" height="11.500" rx="2" /><path d="M15.500 8.500V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.500a2 2 0 0 0 2 2h2.500" /></>,
  check: <path d="m5 12.500 4.500 4.500L19 7" />,
  download: <path d="M12 4v11M7 10.500l5 5 5-5M4.500 20h15" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  sliders: <path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4.500v5M6 14.500v5" />,
  bookmark: <path d="M6.500 4h11v16.500L12 16.500l-5.500 4z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  layers: <path d="m12 3.500 9 5-9 5-9-5zM3.500 13.500l8.500 4.700 8.500-4.700" />,
  back: <path d="M15 5l-7 7 7 7" />,
};

export function Icon({ name, size = 18, fill }: { name: keyof typeof PATHS | string; size?: number; fill?: boolean }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" width={size} height={size} fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

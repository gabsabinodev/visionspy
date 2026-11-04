"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icons";
import { LogoFull, LogoSymbol } from "./logo";

const MAIN = [
  { href: "/", label: "Minerar", icon: "pick" },
  { href: "/ofertas", label: "Ofertas", icon: "list" },
  { href: "/nichos", label: "Nichos", icon: "flame" },
  { href: "/funil", label: "Funil", icon: "funnel" },
  { href: "/espionagem", label: "Espionagem", icon: "eye" },
];
const SOURCES = [
  { href: "/tiktok", label: "TikTok", icon: "video" },
  { href: "/reclame-aqui", label: "Reclame Aqui", icon: "alert" },
  { href: "/palavras-chave", label: "Palavras-chave", icon: "key" },
];

export function Sidebar({ health }: { health: { ok: boolean; label: string } | null }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : href === "/ofertas" ? path.startsWith("/ofertas") || path.startsWith("/oferta/") : path.startsWith(href));
  const Item = ({ href, label, icon }: { href: string; label: string; icon: string }) => (
    <Link href={href} className="nav-item" aria-current={active(href) ? "page" : undefined}>
      <Icon name={icon} /><span>{label}</span>
    </Link>
  );
  return (
    <aside className="sidebar">
      <Link href="/" className="brand" aria-label="VisionSpy, início">
        <LogoFull className="brand-full" />
        <LogoSymbol className="brand-mark" ring={false} />
      </Link>
      <nav aria-label="Seções">
        <div className="nav-group">{MAIN.map((i) => <Item key={i.href} {...i} />)}</div>
        <div className="nav-group">{SOURCES.map((i) => <Item key={i.href} {...i} />)}</div>
      </nav>
      <Link href="/status" className={`nav-status${health && !health.ok ? " bad" : ""}`} aria-current={path.startsWith("/status") ? "page" : undefined}>
        <span className="dot" aria-hidden="true" />
        <span>{health?.label ?? "Sem coleta ainda"}</span>
      </Link>
    </aside>
  );
}

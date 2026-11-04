"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./icons";

/** Painel lateral: abre pela URL, fecha com Esc, no fundo ou no X. */
export function Drawer({ closeHref, label, children }: { closeHref: string; label: string; children: ReactNode }) {
  const router = useRouter();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.replace(closeHref, { scroll: false });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeHref, router]);
  return (
    <div className="drawer-wrap">
      <Link href={closeHref} scroll={false} className="drawer-back" aria-label="Fechar painel" tabIndex={-1} />
      <section ref={ref} className="drawer" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}>
        <Link href={closeHref} scroll={false} className="icon-btn drawer-close" aria-label="Fechar"><Icon name="x" size={17} /></Link>
        {children}
      </section>
    </div>
  );
}

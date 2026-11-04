"use client";

import { useEffect } from "react";

/**
 * Triagem pelo teclado: j/k andam nas linhas, f favorita, e espiona, x descarta, Enter abre.
 * Cada tecla aperta o mesmo botão que existe na linha.
 */
export function TriageKeys() {
  useEffect(() => {
    let i = -1;
    const rows = () => [...document.querySelectorAll<HTMLElement>("[data-row]")];
    const mark = (n: number) => {
      const list = rows();
      if (!list.length) return;
      i = Math.max(0, Math.min(n, list.length - 1));
      list.forEach((r, k) => r.classList.toggle("is-active", k === i));
      list[i].scrollIntoView({ block: "nearest" });
    };
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      const row = rows()[i];
      const press = (sel: string) => row?.querySelector<HTMLElement>(sel)?.click();
      if (e.key === "j") mark(i + 1);
      else if (e.key === "k") mark(i - 1);
      else if (e.key === "f") press("[data-act=star]");
      else if (e.key === "e") press("[data-act=watch]");
      else if (e.key === "x") press("[data-act=discard]");
      else if (e.key === "Enter" && row) press("[data-act=open]");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <p className="keys-hint">
      Triagem pelo teclado: <kbd>j</kbd> <kbd>k</kbd> andam, <kbd>f</kbd> favorita, <kbd>e</kbd> espiona, <kbd>x</kbd> descarta, <kbd>Enter</kbd> abre.
    </p>
  );
}

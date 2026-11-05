/** Separa o texto colado em palavras-chave: vale vírgula, ponto e vírgula ou quebra de linha. */
export function parseTerms(raw: string): string[] {
  const seen = new Set<string>();
  for (const part of raw.split(/[,;\r\n]+/)) {
    const term = part
      .normalize("NFC")
      .replace(/[’‘]/g, "'")
      .replace(/[“”"]/g, "")
      .replace(/^\s*[-•*]\s*/, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase()
      .slice(0, 80);
    if (term.length >= 2) seen.add(term);
  }
  return [...seen];
}

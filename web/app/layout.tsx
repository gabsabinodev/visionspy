import { Archivo } from "next/font/google";
import "./globals.css";
import type { ReactNode } from "react";
import { lastCollect } from "@/lib/health";
import { Sidebar } from "./nav";

const archivo = Archivo({ subsets: ["latin", "latin-ext"], axes: ["wdth"], display: "swap", variable: "--font-archivo" });

export const metadata = {
  title: { default: "VisionSpy", template: "%s | VisionSpy" },
  description: "Mineração de anúncios por investimento estimado e país.",
};
export const viewport = { themeColor: "#03060c" };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const health = await lastCollect();
  return (
    <html lang="pt-BR" className={archivo.variable}>
      <body>
        <div className="app">
          <Sidebar health={health} />
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}

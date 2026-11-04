import { NextResponse, type NextRequest } from "next/server";

/** Senha simples: só quem tem DASHBOARD_PASSWORD entra no painel. */
export function middleware(req: NextRequest) {
  const pass = process.env.DASHBOARD_PASSWORD;
  if (!pass) return NextResponse.next();

  const auth = req.headers.get("authorization") || "";
  const [scheme, encoded] = auth.split(" ");
  if (scheme === "Basic" && encoded) {
    // a senha pode ter ":": só o primeiro separa usuário de senha
    const decoded = atob(encoded);
    if (decoded.slice(decoded.indexOf(":") + 1) === pass) return NextResponse.next();
  }
  return new NextResponse("Acesso restrito", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="VisionSpy"' },
  });
}

// /api/cron é chamado pela Vercel e se protege com CRON_SECRET
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|icon.svg|apple-icon.png|opengraph-image.png|api/cron).*)"] };

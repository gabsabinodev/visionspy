# VisionSpy

Painel de mineração de anúncios da família SabinoVision. Um robô lê a Biblioteca de Anúncios da Meta todo dia, guarda o histórico e mostra onde tem dinheiro rodando, por país, moeda e faixa de investimento.

| Parte | Onde roda | O que faz |
| --- | --- | --- |
| Robô (`collector/`) | GitHub Actions, uma região por rodada | Busca cada palavra-chave na Meta, conta anúncios no Google, lê TikTok e Reclame Aqui, faz o raio-X das páginas e chama a IA. |
| Banco (`supabase/`) | Supabase | Guarda cada anúncio e uma foto diária de cada oferta. |
| Painel (`web/`) | Vercel | Mineração, ofertas, nichos, funil, espionagem e status. |
| Marca (`brand/`) | | Logo, favicon e arquivos do brand book. |

## Investimento estimado

Nenhuma biblioteca pública mostra o gasto real de anúncio comercial no Brasil. O valor no painel é um modelo, e a conta aparece na tela ao abrir cada anúncio:

```
cópias × orçamento diário por cópia × dias no ar (até 30) × bônus de posição
```

- O orçamento diário depende da fase e do país. Os valores ficam na tabela `spend_model` do Supabase. Mude lá quando tiver referência melhor: o painel recalcula na hora.
- O bônus vale para anúncios entre os mais vistos da busca: ×1,5 no top 10 e ×1,2 no top 50.
- A faixa mostrada vai da metade ao dobro do valor central.

**Fases:** Vencedor tem 30+ dias e 6+ cópias. Escalando tem 3+ cópias, ou 2+ cópias com 14+ dias. O resto é Teste.

**Momentum:** 3 × criativos lançados na semana + 2 × cópias ganhas + 5 × páginas ganhas. Oferta antiga recém-descoberta não conta como disparo, então adicionar palavra-chave não infla o ranking.

## Países e moedas

Cada palavra-chave vai para um país ou um grupo. O painel filtra por país, Europa, América do Norte ou Big 5 a 20, e mostra os valores em R$, US$, € ou £. Os grupos ficam em `web/lib/groups.json`, e os câmbios na tabela `spend_model`.

| Grupo | Países |
| --- | --- |
| Europa | Reino Unido, Alemanha, França, Itália, Espanha, Holanda, Suécia, Suíça, Bélgica, Áustria, Irlanda, Noruega, Dinamarca, Polônia e Portugal |
| América do Norte | Estados Unidos, Canadá e México |
| Big 5 | Estados Unidos, Reino Unido, Alemanha, França e Canadá |
| Big 10 | Big 5 + Austrália, Itália, Espanha, Holanda e Japão |
| Big 15 | Big 10 + Suécia, Suíça, Bélgica, Áustria e Irlanda |
| Big 20 | Big 15 + Noruega, Dinamarca, Nova Zelândia, Polônia e México |

Na tela Palavras-chave, cole várias palavras de uma vez, por linha ou com vírgula, e desligue países inteiros. País desligado não é buscado, mesmo dentro de um grupo.

O robô roda às 06:17, 12:17 e 18:17, no horário de São Paulo, com até 300 buscas por rodada (`META_MAX_SEARCHES`). Cada palavra vira uma busca por país, e o rodízio começa pelas que estão há mais tempo sem rodar. Anúncio ativo é o que foi visto nos últimos 7 dias.

A busca na Meta e os alertas rodam nas três rodadas. Criativos, mídia, Google, TikTok, Reclame Aqui, páginas, IA e limpeza rodam só na de 18:17, para caber nos planos grátis do Supabase e do Gemini. Os registros da coleta não mostram as palavras-chave, porque o repositório é público.

Em repositório privado, a cota grátis do GitHub Actions não cobre as três rodadas por dia. Em repositório público não tem limite de minutos.

## Custos

Tudo roda nos planos grátis, e nenhum deles cobra sozinho quando o limite acaba.

| Serviço | Limite grátis | Ao passar do limite |
| --- | --- | --- |
| GitHub Actions | sem limite de minutos em repositório público | a coleta agendada é pausada após 60 dias sem atividade no repositório |
| Supabase | 500 MB de banco, 1 GB de arquivos, 5 GB de tráfego | depois de uma carência, pode bloquear o projeto até virar o ciclo |
| Vercel Hobby | 100 GB de tráfego e 4 horas de CPU por mês | o recurso para até completar 30 dias |
| Gemini | cota gratuita, sem faturamento ligado | a etapa de IA para e continua no dia seguinte |
| Telegram | grátis | sem limite relevante aqui |

A limpeza diária mantém o projeto dentro do plano do Supabase. Anúncio com menos de 3 cópias sai após 7 dias sem aparecer, e os demais após 45. Oferta no funil ou na espionagem fica. Os vídeos têm teto de 350 MB dos anúncios e 150 MB do TikTok, em `MEDIA_BUDGET_MB` e `TIKTOK_BUDGET_MB`.

A Vercel Hobby é só para uso pessoal não comercial. Se o painel servir ao seu negócio, confirme com o suporte da Vercel ou use o Pro.

## Instalação

### 1. Supabase

1. Crie um projeto em supabase.com, na região São Paulo.
2. Em **SQL Editor**, cole todo o `supabase/schema.sql` e clique em **Run**.
3. Em **Project Settings → API**, copie a **Project URL** (`SUPABASE_URL`) e a **service_role key** (`SUPABASE_SERVICE_ROLE_KEY`). Essa chave é secreta.

### 2. GitHub

1. Em **Settings → Secrets and variables → Actions**, crie os secrets `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.
2. Na aba **Variables**, crie `PANEL_URL` com o endereço do seu painel.
3. Em **Actions**, ligue os workflows. Em fork eles vêm desligados.
4. Rode a primeira coleta em **Actions → Coletar ofertas → Run workflow**.

### 3. Vercel

1. Em **Add New → Project**, importe o repositório.
2. Em **Root Directory**, coloque `web`.
3. Adicione `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `DASHBOARD_PASSWORD`. Qualquer usuário serve no login, só a senha é conferida.
4. Clique em **Deploy**.

Sem `DASHBOARD_PASSWORD`, o painel fica aberto para quem tiver o link.

## Recursos opcionais

| Recurso | O que precisa |
| --- | --- |
| Nicho, promessa, risco, mapa da página e "Minha versão" pela IA | secret `GEMINI_API_KEY` no GitHub e na Vercel |
| Alertas no Telegram | secrets `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID` no GitHub |
| Vigia diário da coleta | `CRON_SECRET`, `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID` na Vercel |

Chave do Gemini: entre em aistudio.google.com/apikey e clique em **Create API key**. Na cota grátis, os textos enviados podem treinar os modelos do Google. Aqui só vão textos públicos de anúncios e páginas.

Bot do Telegram: fale com **@BotFather**, mande `/newbot`, copie o token, mande uma mensagem para o bot e pegue o `chat.id` em `https://api.telegram.org/bot<TOKEN>/getUpdates`.

## Modo demonstração

Com `VISIONSPY_DEMO=1`, o painel usa dados inventados no lugar do Supabase:

```bash
cd web && npm install && VISIONSPY_DEMO=1 npm run dev
```

## Coleta no seu computador

```bash
cd collector
npm install
npx playwright install chromium
npm test
HEADFUL=1 npm run collect:meta
```

## Limitações

- **Bloqueio da Meta.** A Meta pode pedir login para IPs de servidor. Quando isso acontece, a coleta avisa e não sobrescreve os dados do dia. Se for frequente, rode o coletor no seu computador ou troque a fonte pela interface `MetaAdSource` (`collector/src/types.ts`).
- **Histórico.** Tendência e cópias contra 7 dias atrás precisam de uma semana de coleta. Investimento, fase e criativos lançados funcionam desde o primeiro dia, porque usam a data que a própria Meta mostra.
- **Marcas grandes.** Anunciante com mais de 1.000 anúncios no Google fica escondido por padrão. Dá para mostrar com um clique.
- **Termos de uso.** O robô lê páginas públicas, mas a coleta automática vai contra os termos da Meta. Use para pesquisa e para modelar estrutura de oferta, não para copiar criativos, textos ou marcas.
- **Saúde.** Muitas ofertas trazem promessas que derrubam conta de anúncios. Confira as alegações antes de modelar.

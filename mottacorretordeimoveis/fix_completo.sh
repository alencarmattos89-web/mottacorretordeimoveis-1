#!/bin/bash
# =============================================================
# fix_completo.sh — Motta Corretor de Imóveis
#
# O que este script resolve:
#   1. Imoveis não salvam  → cliente Supabase sem sessão (anon)
#   2. Arquivar leads falha → coluna `arquivado` não existe no DB
#
# Execute na raiz do repositório (onde está mottacorretordeimoveis/)
# =============================================================

set -e

ROOT="mottacorretordeimoveis"
MIGRATIONS="$ROOT/supabase/migrations"

echo ""
echo "=================================================="
echo " Motta Corretor — Fix completo"
echo "=================================================="
echo ""

# ── Sanity check ──────────────────────────────────────
if [ ! -d "$ROOT" ]; then
  echo "❌ Pasta '$ROOT' não encontrada."
  echo "   Execute na raiz do repositório."
  exit 1
fi

if [ ! -d "$MIGRATIONS" ]; then
  echo "❌ Pasta de migrations não encontrada: $MIGRATIONS"
  exit 1
fi

echo "✅ Estrutura OK"
echo ""

# ══════════════════════════════════════════════════════
# BLOCO 1 — Corrigir cliente Supabase (fix salvar imóvel)
# Problema: páginas admin usavam createClient (anônimo).
#           Após login a sessão fica em cookie, mas o
#           cliente anônimo ignora esse cookie → operações
#           chegam ao banco sem autenticação → RLS bloqueia.
# Correção: usar createBrowserClient (lê o cookie de sessão).
# ══════════════════════════════════════════════════════
echo "──────────────────────────────────────────────────"
echo " BLOCO 1 · Corrigir cliente Supabase autenticado"
echo "──────────────────────────────────────────────────"

# 1a. lib/supabase-browser.ts
FILE_BROWSER="$ROOT/lib/supabase-browser.ts"
if [ ! -f "$FILE_BROWSER" ]; then
  echo "❌ Não encontrado: $FILE_BROWSER"; exit 1
fi

cat > "$FILE_BROWSER" << 'EOF'
import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
EOF
echo "✅ lib/supabase-browser.ts → createBrowserClient"

# 1b. novo/page.tsx — troca import de supabase para supabase-browser
FILE_NOVO="$ROOT/app/admin/imoveis/novo/page.tsx"
if [ ! -f "$FILE_NOVO" ]; then
  echo "❌ Não encontrado: $FILE_NOVO"; exit 1
fi

if grep -q "from '@/lib/supabase'" "$FILE_NOVO"; then
  sed -i "s|from '@/lib/supabase'|from '@/lib/supabase-browser'|g" "$FILE_NOVO"
  echo "✅ novo/page.tsx → import atualizado"
else
  echo "ℹ️  novo/page.tsx já usa supabase-browser (sem alteração)"
fi

# 1c. LogoutButton.tsx — mesma troca para consistência de sessão
FILE_LOGOUT="$ROOT/components/LogoutButton.tsx"
if [ ! -f "$FILE_LOGOUT" ]; then
  echo "❌ Não encontrado: $FILE_LOGOUT"; exit 1
fi

if grep -q "from '@/lib/supabase'" "$FILE_LOGOUT"; then
  sed -i "s|from '@/lib/supabase'|from '@/lib/supabase-browser'|g" "$FILE_LOGOUT"
  echo "✅ LogoutButton.tsx → import atualizado"
else
  echo "ℹ️  LogoutButton.tsx já usa supabase-browser (sem alteração)"
fi

echo ""

# ══════════════════════════════════════════════════════
# BLOCO 2 — Migration: coluna `arquivado` na tabela leads
# Problema: o frontend já tem toda a lógica de arquivar/
#           desarquivar leads, mas a coluna não existe no
#           banco → qualquer operação com arquivado falha.
# Correção: migration idempotente que adiciona a coluna e
#           garante índice para performance.
# ══════════════════════════════════════════════════════
echo "──────────────────────────────────────────────────"
echo " BLOCO 2 · Migration: coluna arquivado em leads"
echo "──────────────────────────────────────────────────"

MIGRATION_FILE="$MIGRATIONS/20260525000000_add_arquivado_leads.sql"

if [ -f "$MIGRATION_FILE" ]; then
  echo "ℹ️  Migration já existe (sem alteração): $MIGRATION_FILE"
else
  cat > "$MIGRATION_FILE" << 'EOF'
-- Adiciona coluna `arquivado` na tabela leads.
-- Idempotente: usa IF NOT EXISTS / ON CONFLICT DO NOTHING.
-- O frontend (app/admin/leads/page.tsx) já possui a interface
-- de arquivar/desarquivar — esta migration sincroniza o banco.

alter table public.leads
  add column if not exists arquivado boolean not null default false;

-- Índice para filtrar leads ativos vs arquivados com performance
create index if not exists leads_arquivado_idx
  on public.leads (arquivado);

-- Garante que leads existentes não apareçam como arquivados
update public.leads
  set arquivado = false
  where arquivado is null;
EOF
  echo "✅ Migration criada: $MIGRATION_FILE"
fi

echo ""

# ── Verificação final dos imports ──────────────────────
echo "──────────────────────────────────────────────────"
echo " Verificação final dos imports Supabase"
echo "──────────────────────────────────────────────────"
grep -rn "from '@/lib/supabase" \
  "$ROOT/app/" "$ROOT/components/" "$ROOT/lib/" 2>/dev/null \
  | grep -v ".backup" | grep -v "node_modules" \
  | sed 's|.*/mottacorretordeimoveis/||'

echo ""
echo "Esperado:"
echo "  app/admin/imoveis/[id]/page.tsx  → supabase-browser ✅"
echo "  app/admin/imoveis/novo/page.tsx  → supabase-browser ✅"
echo "  app/admin/configuracoes/page.tsx → supabase-browser ✅"
echo "  app/admin/dashboard/page.tsx     → supabase-server  ✅"
echo "  app/page.tsx                     → supabase         ✅ (público)"
echo "  app/imovel/[id]/page.tsx         → supabase-server  ✅"
echo "  components/LogoutButton.tsx      → supabase-browser ✅"
echo ""

# ── Commit e push ──────────────────────────────────────
echo "──────────────────────────────────────────────────"
echo " Commit e push"
echo "──────────────────────────────────────────────────"

git add \
  "$ROOT/lib/supabase-browser.ts" \
  "$ROOT/app/admin/imoveis/novo/page.tsx" \
  "$ROOT/components/LogoutButton.tsx" \
  "$MIGRATION_FILE"

git commit -m "fix: corrige salvar imóveis e arquivar leads

Problema 1 — Imóveis não salvam (RLS bloqueando usuário anônimo):
As páginas admin usavam createClient() simples, que não lê cookies
de sessão. Após o login, a sessão existe no cookie mas o cliente
ignorava, enviando todas as operações como usuário anônimo.
O RLS do Supabase bloqueava INSERT/UPDATE sem usuário autenticado.

Correções:
- lib/supabase-browser.ts: createClient → createBrowserClient (@supabase/ssr)
  Lê automaticamente o cookie de sessão do login.
  Corrige automaticamente: [id]/page.tsx e configuracoes/page.tsx
  que já importavam deste arquivo.
- app/admin/imoveis/novo/page.tsx: import de supabase → supabase-browser
- components/LogoutButton.tsx: import de supabase → supabase-browser

Não alterado:
- lib/supabase.ts (app/page.tsx, leitura pública — anon está correto)
- lib/supabase-server.ts (Server Components — não tem relação)

Problema 2 — Arquivar leads falha (coluna inexistente no banco):
O frontend (leads/page.tsx) já tinha toda a UI de arquivar/desarquivar
implementada, mas a coluna arquivado nunca foi criada no banco de dados.

Correção:
- supabase/migrations/20260525000000_add_arquivado_leads.sql
  Adiciona a coluna (idempotente: IF NOT EXISTS) com índice para
  performance ao filtrar leads ativos vs arquivados."

git push

echo ""
echo "✅ Tudo aplicado e enviado!"
echo ""
echo "Próximo passo obrigatório — aplicar a migration no Supabase:"
echo ""
echo "  Opção A (recomendada): Supabase Dashboard"
echo "    → SQL Editor → colar e rodar o conteúdo de:"
echo "    $MIGRATION_FILE"
echo ""
echo "  Opção B: CLI (se tiver supabase CLI configurado)"
echo "    supabase db push"
echo ""

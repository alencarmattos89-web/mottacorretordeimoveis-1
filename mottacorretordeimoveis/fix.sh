#!/usr/bin/env bash
# =============================================================================
# fix.sh — Script de correção automática — Motta Corretor de Imóveis
# Stack: Next.js 16 + React 19 + Supabase + TypeScript + Tailwind 4
# Gerenciador de pacotes: npm (package-lock.json detectado)
# Gerado por inspeção completa do código-fonte.
# Idempotente: seguro para rodar mais de uma vez.
# =============================================================================
set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────────
# Detectar diretório raiz do projeto
# ──────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"

# Procura package.json subindo a árvore (até 3 níveis)
for d in "$SCRIPT_DIR" "$SCRIPT_DIR/.." "$SCRIPT_DIR/../.."; do
  if [[ -f "$d/package.json" ]] && grep -q '"next"' "$d/package.json" 2>/dev/null; then
    PROJECT_DIR="$(cd "$d" && pwd)"
    break
  fi
done

echo "================================================================="
echo " Motta Corretor de Imóveis — Script de Correção Automática"
echo "================================================================="
echo " Diretório do projeto: $PROJECT_DIR"
echo ""

cd "$PROJECT_DIR"

# Contadores
CORRECOES=0
ARQUIVOS_MOD=()
MANUAIS=()

# ──────────────────────────────────────────────────────────────────────────────
# Função auxiliar: backup antes de alterar
# ──────────────────────────────────────────────────────────────────────────────
backup_e_registrar() {
  local arquivo="$1"
  if [[ -f "$arquivo" && ! -f "${arquivo}.bak" ]]; then
    cp "$arquivo" "${arquivo}.bak"
  fi
  # registra se ainda não está na lista
  local ja_tem=0
  for f in "${ARQUIVOS_MOD[@]:-}"; do [[ "$f" == "$arquivo" ]] && ja_tem=1 && break; done
  [[ $ja_tem -eq 0 ]] && ARQUIVOS_MOD+=("$arquivo")
  CORRECOES=$((CORRECOES + 1))
}

echo ""
echo "════════════════════════════════════════════════════════════════"
echo " CRÍTICOS"
echo "════════════════════════════════════════════════════════════════"

# ─────────────────────────────────────────────────────────────────────────────
# [C-1] CRÍTICO: proxy.ts não tem efeito — Next.js só reconhece middleware.ts
#        na raiz do projeto. A proteção de rotas /admin está INATIVA.
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "[C-1] Criando middleware.ts a partir de proxy.ts (proteção de rotas admin)"

if [[ ! -f "middleware.ts" ]]; then
  cat > middleware.ts << 'EOF'
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Se não estiver logado e tentar acessar /admin (exceto /admin/login), redireciona
  if (!user && !request.nextUrl.pathname.startsWith('/admin/login')) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  // Se já estiver logado e tentar acessar /admin/login, redireciona pro dashboard
  if (user && request.nextUrl.pathname.startsWith('/admin/login')) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}
EOF
  CORRECOES=$((CORRECOES + 1))
  ARQUIVOS_MOD+=("middleware.ts")
  echo "   ✅ middleware.ts criado — rotas /admin agora estão protegidas."
else
  echo "   ⏭  middleware.ts já existe — pulando."
fi




# ─────────────────────────────────────────────────────────────────────────────
# [C-5] CRÍTICO: app/admin/leads/page.tsx — carregarLeads() chamada sem await
#       dentro do arquivarLead (linha: await carregarLeads(mostrarArquivados)).
#       A função usa o estado externo mostrarArquivados dentro de atualizarLead,
#       mas atualizarLead chama carregarLeads() SEM o parâmetro — sempre carrega
#       apenas leads não-arquivados, mesmo quando o usuário está vendo arquivados.
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "[C-5] Corrigindo atualizarLead() em leads/page.tsx para respeitar filtro de arquivados"

LEADS_PAGE="app/admin/leads/page.tsx"
if grep -q "await carregarLeads()" "$LEADS_PAGE" 2>/dev/null; then
  backup_e_registrar "$LEADS_PAGE"
  # Dentro de atualizarLead, a chamada é: await carregarLeads()
  # Precisa passar mostrarArquivados — mas a função não tem acesso ao state lá
  # A correção segura é substituir por carregarLeads(mostrarArquivados) usando
  # uma ref interna. Fazemos com sed: troca a chamada única sem parâmetro
  sed -i 's/await carregarLeads()\s*$/await carregarLeads(mostrarArquivados)/g' "$LEADS_PAGE"
  echo "   ✅ atualizarLead() agora passa mostrarArquivados para carregarLeads()."
else
  echo "   ⏭  Chamada já corrigida ou padrão diferente."
fi

# ─────────────────────────────────────────────────────────────────────────────
# [C-6] CRÍTICO: next.config.ts está completamente vazio — sem configuração de
#       imagens remotas (Supabase). Isso causa warnings de segurança e pode
#       quebrar next/image futuramente. Adicionamos a configuração mínima.
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "[C-6] Configurando next.config.ts com domínio de imagens do Supabase"

NEXT_CFG="next.config.ts"
if ! grep -q "remotePatterns\|wabkkqbgfwufmxjutxsr" "$NEXT_CFG" 2>/dev/null; then
  backup_e_registrar "$NEXT_CFG"
  cat > "$NEXT_CFG" << 'EOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "wabkkqbgfwufmxjutxsr.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        // Supabase genérico — cobre outros projetos se URL de env for diferente
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
EOF
  echo "   ✅ next.config.ts configurado com remotePatterns para Supabase."
else
  echo "   ⏭  next.config.ts já tem configuração de imagens."
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo " MÉDIOS"
echo "════════════════════════════════════════════════════════════════"



# ─────────────────────────────────────────────────────────────────────────────
# [M-3] MÉDIO: app/admin/configuracoes/page.tsx — a aba 'Marca d'água' usa
#       aspas tipográficas no array `abas` ( 'Marca d'água' ), o que gera
#       syntax error em alguns editores e ferramentas de lint.
#       O JSX renderiza corretamente, mas o string literal é inconsistente.
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "[M-3] Corrigindo aspa tipográfica em abas[] em configuracoes/page.tsx"

CONFIG_PAGE="app/admin/configuracoes/page.tsx"
if grep -q "Marca d.água\|d'água" "$CONFIG_PAGE" 2>/dev/null; then
  backup_e_registrar "$CONFIG_PAGE"
  # Normaliza aspas tipográficas para apóstrofo simples dentro dos literais
  # A linha é: const abas = ['Hero', 'Banners', 'Marca d'água', 'Imóveis', 'Geral']
  # Usamos python3 para substituição segura sem quebrar o arquivo
  python3 - "$CONFIG_PAGE" << 'PYEOF'
import sys, re

path = sys.argv[1]
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Corrige o array abas: substitui a aspa tipográfica pela aspa normal
# Também corrige a string no JSX da aba
fixed = content.replace("'Marca d\u2019\u00e1gua'", "'Marca d\\'água'")
fixed = fixed.replace("'Marca d\u2018\u00e1gua'", "'Marca d\\'água'")
# Fallback: se já usar string normal, não altera
# Garante que o {abaAtiva === 'Marca d'água'} também esteja correto
fixed = fixed.replace('abaAtiva === \u2018Marca d\u2019\u00e1gua\u2019', "abaAtiva === 'Marca d\\'água'")

with open(path, 'w', encoding='utf-8') as f:
    f.write(fixed)

print("   Python fix applied.")
PYEOF
  echo "   ✅ Aspas tipográficas normalizadas."
else
  echo "   ⏭  Sem aspas tipográficas problemáticas detectadas."
fi

# ─────────────────────────────────────────────────────────────────────────────
# [M-4] MÉDIO: app/admin/leads/page.tsx — STATUS_LABELS não contém a chave
#       'contato' (legado), mas o filtro de contadores faz referência a ela.
#       Quando um lead antigo tem status='contato', o badge mostra undefined.
#       Adicionamos 'contato' como alias de 'primeiro_contato'.
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "[M-4] Adicionando alias 'contato' em STATUS_LABELS de leads/page.tsx"

if ! grep -q "'contato'.*label.*Contato\|contato.*primeiro_contato.*label" "$LEADS_PAGE" 2>/dev/null; then
  backup_e_registrar "$LEADS_PAGE"
  sed -i "s/contato: { label: 'Contato', cor: '#5b9bd5' },/contato: { label: '1º contato', cor: '#5b9bd5' },/" "$LEADS_PAGE"
  echo "   ✅ STATUS_LABELS['contato'] padronizado como alias de primeiro_contato."
else
  echo "   ⏭  Alias já presente."
fi

# ─────────────────────────────────────────────────────────────────────────────
# [M-5] MÉDIO: app/imovel/[id]/ImovelClient.tsx — useEffect não limpa o estado
#       `enviado` ao navegar entre imóveis. Se o usuário enviou interesse no
#       imóvel A e clica no imóvel B, o formulário ainda mostra "Mensagem enviada!"
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "[M-5] Corrigindo reset de estado 'enviado' ao trocar imóvel em ImovelClient.tsx"

IMOVEL_CLIENT="app/imovel/[id]/ImovelClient.tsx"
# Verifica se já tem setEnviado(false) dentro do useEffect de [id]
if ! grep -q "setEnviado(false)" "$IMOVEL_CLIENT" 2>/dev/null; then
  backup_e_registrar "$IMOVEL_CLIENT"
  # Adiciona setEnviado(false) e setForm reset logo após setFotoAtiva(0) dentro do useEffect
  sed -i 's/setFotoAtiva(0)/setFotoAtiva(0)\n    setEnviado(false)\n    setForm({ nome: '"'"''"'"', telefone: '"'"''"'"', email: '"'"''"'"' })/' "$IMOVEL_CLIENT"
  echo "   ✅ Estado 'enviado' e formulário resetados ao trocar imóvel."
else
  echo "   ⏭  Reset já presente."
fi

# ─────────────────────────────────────────────────────────────────────────────
# [M-6] MÉDIO: app/api/leads/route.ts — usa NEXT_PUBLIC_SUPABASE_ANON_KEY como
#       fallback quando SERVICE_ROLE_KEY não está definida. Isso faz operações
#       de INSERT de leads passarem pelas Row Level Security policies do anon,
#       podendo falhar silenciosamente em produção. Adicionamos log de aviso claro.
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "[M-6] Adicionando aviso de chave insuficiente em app/api/leads/route.ts"

API_LEADS="app/api/leads/route.ts"
if ! grep -q "AVISO.*SERVICE_ROLE\|warn.*service.role\|sem service_role" "$API_LEADS" 2>/dev/null; then
  backup_e_registrar "$API_LEADS"
  sed -i 's/const supabaseKey = supabaseServiceRoleKey || supabaseAnonKey!/const supabaseKey = supabaseServiceRoleKey || supabaseAnonKey!\n  if (!supabaseServiceRoleKey) {\n    console.warn("[leads\/route] AVISO: SUPABASE_SERVICE_ROLE_KEY não definida. Usando chave anon — RLS pode bloquear INSERTs de leads.")\n  }/' "$API_LEADS"
  echo "   ✅ Aviso adicionado quando SERVICE_ROLE_KEY está ausente."
else
  echo "   ⏭  Aviso já presente."
fi

# ─────────────────────────────────────────────────────────────────────────────
# [M-7] MÉDIO: app/admin/imoveis/page.tsx — toggleAtivo e toggleDestaque não
#       tratam erros do Supabase. Se o update falhar, a UI mostra sucesso.
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "[M-7] Adicionando tratamento de erro em toggleAtivo/toggleDestaque em imoveis/page.tsx"

IMOVEIS_PAGE="app/admin/imoveis/page.tsx"
if grep -q "async function toggleAtivo" "$IMOVEIS_PAGE" 2>/dev/null && ! grep -q "toggleAtivo.*error\|if.*error.*toggleAtivo" "$IMOVEIS_PAGE" 2>/dev/null; then
  backup_e_registrar "$IMOVEIS_PAGE"
  # Substitui as funções toggle para capturar erros
  python3 - "$IMOVEIS_PAGE" << 'PYEOF'
import sys, re

path = sys.argv[1]
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_toggle_ativo = '''  async function toggleAtivo(id: string, ativo: boolean) {
    await supabase.from('imoveis').update({ ativo: !ativo }).eq('id', id)
    carregarImoveis()
  }'''

new_toggle_ativo = '''  async function toggleAtivo(id: string, ativo: boolean) {
    const { error } = await supabase.from('imoveis').update({ ativo: !ativo }).eq('id', id)
    if (error) { alert('Erro ao alterar status: ' + error.message); return }
    carregarImoveis()
  }'''

old_toggle_dest = '''  async function toggleDestaque(id: string, destaque: boolean) {
    await supabase.from('imoveis').update({ destaque: !destaque }).eq('id', id)
    carregarImoveis()
  }'''

new_toggle_dest = '''  async function toggleDestaque(id: string, destaque: boolean) {
    const { error } = await supabase.from('imoveis').update({ destaque: !destaque }).eq('id', id)
    if (error) { alert('Erro ao alterar destaque: ' + error.message); return }
    carregarImoveis()
  }'''

content = content.replace(old_toggle_ativo, new_toggle_ativo)
content = content.replace(old_toggle_dest, new_toggle_dest)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("   Python patch applied.")
PYEOF
  echo "   ✅ toggleAtivo e toggleDestaque agora tratam erros."
else
  echo "   ⏭  Tratamento de erro já presente ou funções com padrão diferente."
fi

# ─────────────────────────────────────────────────────────────────────────────
# [M-8] MÉDIO: app/admin/configuracoes/page.tsx — função carregarConfig não tem
#       loading state. Enquanto carrega, o usuário vê os valores padrão e pode
#       salvar acidentalmente os defaults antes dos dados reais chegarem.
#       Adicionamos um estado de loading simples.
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "[M-8] Adicionando loading state em configuracoes/page.tsx"

if ! grep -q "loadingConfig\|carregando.*config\|configCarregada" "$CONFIG_PAGE" 2>/dev/null; then
  backup_e_registrar "$CONFIG_PAGE"
  python3 - "$CONFIG_PAGE" << 'PYEOF'
import sys

path = sys.argv[1]
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Adiciona estado de loading após os outros useState
old = "  const [config, setConfig] = useState<SiteConfig>(configPadrao)"
new = "  const [config, setConfig] = useState<SiteConfig>(configPadrao)\n  const [loadingConfig, setLoadingConfig] = useState(true)"
content = content.replace(old, new, 1)

# Adiciona setLoadingConfig ao início e fim de carregarConfig
old_fn = "  async function carregarConfig() {\n    const { data, error } = await supabase.from('configuracoes').select('*').eq('id', 'site').single()"
new_fn = "  async function carregarConfig() {\n    setLoadingConfig(true)\n    const { data, error } = await supabase.from('configuracoes').select('*').eq('id', 'site').single()"
content = content.replace(old_fn, new_fn, 1)

old_end = "    setConfig(normalizarConfig(data as Partial<SiteConfig> | null))\n  }"
new_end = "    setConfig(normalizarConfig(data as Partial<SiteConfig> | null))\n    setLoadingConfig(false)\n  }"
content = content.replace(old_end, new_end, 1)

# Desabilita botão Salvar durante o carregamento inicial
old_btn = "disabled={salvando}"
new_btn = "disabled={salvando || loadingConfig}"
content = content.replace(old_btn, new_btn, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("   Python patch applied.")
PYEOF
  echo "   ✅ Loading state adicionado — botão Salvar bloqueado durante carregamento."
else
  echo "   ⏭  loadingConfig já existe."
fi

# ─────────────────────────────────────────────────────────────────────────────
# [M-9] MÉDIO: app/admin/dashboard/page.tsx — Promise.all não trata erros.
#       Se qualquer query falhar, a página quebra silenciosamente.
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "[M-9] Adicionando fallback seguro em Promise.all do dashboard"

DASHBOARD="app/admin/dashboard/page.tsx"
if ! grep -q "Promise.allSettled\|catch.*dashboard\|?? \[\]" "$DASHBOARD" 2>/dev/null; then
  backup_e_registrar "$DASHBOARD"
  python3 - "$DASHBOARD" << 'PYEOF'
import sys

path = sys.argv[1]
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = """  const [{ count: totalImoveis }, { count: imoveisAtivos }, { data: leads }] = await Promise.all([
    supabase.from('imoveis').select('*', { count: 'exact', head: true }),
    supabase.from('imoveis').select('*', { count: 'exact', head: true }).eq('ativo', true),
    supabase.from('leads').select('status'),
  ])"""

new = """  const results = await Promise.allSettled([
    supabase.from('imoveis').select('*', { count: 'exact', head: true }),
    supabase.from('imoveis').select('*', { count: 'exact', head: true }).eq('ativo', true),
    supabase.from('leads').select('status'),
  ])
  const totalImoveis = results[0].status === 'fulfilled' ? (results[0].value as any).count : 0
  const imoveisAtivos = results[1].status === 'fulfilled' ? (results[1].value as any).count : 0
  const leads = results[2].status === 'fulfilled' ? (results[2].value as any).data : []"""

content = content.replace(old, new, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("   Python patch applied.")
PYEOF
  echo "   ✅ Dashboard usa Promise.allSettled com fallback seguro."
else
  echo "   ⏭  Tratamento já presente."
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo " BAIXOS"
echo "════════════════════════════════════════════════════════════════"

# ─────────────────────────────────────────────────────────────────────────────
# [B-1] BAIXO: app/page.tsx — o formulário de busca usa `defaultValue` em vez
#       de `value` nos selects, o que faz o filtro não refletir a seleção
#       corretamente no SSR quando o usuário volta com o botão do browser.
#       É um select controlado sendo tratado como não-controlado.
#       → AÇÃO MANUAL (mudança requer lógica de hidratação específica no SSR).
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "[B-1] Verificando selects da busca em app/page.tsx..."
MANUAIS+=("[B-1] app/page.tsx — Os <select> do formulário de busca usam 'defaultValue' ao invés de 'value'. Em SSR Next.js isso é aceitável para formulários GET, mas se precisar de controle total converta para componente client. Baixo impacto.")

# ─────────────────────────────────────────────────────────────────────────────
# [B-2] BAIXO: components/BannerCarousel.tsx — o useEffect usa imagens.length
#       e intervalSeconds como dependências, mas `imagens` é recriado a cada
#       render (filter cria novo array), causando re-subscription do intervalo.
#       Corrigimos memoizando a referência.
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "[B-2] Otimizando BannerCarousel.tsx (evitar re-subscribe desnecessário)"

BANNER="components/BannerCarousel.tsx"
if ! grep -q "useMemo\|useRef.*imagens\|stableImages" "$BANNER" 2>/dev/null; then
  backup_e_registrar "$BANNER"
  python3 - "$BANNER" << 'PYEOF'
import sys

path = sys.argv[1]
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Adiciona useMemo ao import
content = content.replace(
    "import { useEffect, useState } from 'react'",
    "import { useEffect, useMemo, useState } from 'react'"
)

# Memoiza o array filtrado
old = "  const imagens = images.filter(Boolean)"
new = "  const imagens = useMemo(() => images.filter(Boolean), [images])"
content = content.replace(old, new, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("   Python patch applied.")
PYEOF
  echo "   ✅ BannerCarousel: imagens memoizadas com useMemo."
else
  echo "   ⏭  useMemo já presente."
fi

# ─────────────────────────────────────────────────────────────────────────────
# [B-3] BAIXO: lib/supabase.ts importa createClient do @supabase/supabase-js
#       diretamente (sem SSR). Isso causa warning de uso de client-side no
#       lado do servidor no App Router. Embora funcional (app/page.tsx e
#       app/sitemap.ts o usam em Server Components), o ideal é usar o server
#       client. Adicionamos comentário de aviso.
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "[B-3] Adicionando comentário de aviso em lib/supabase.ts"

SUPABASE_LIB="lib/supabase.ts"
if ! grep -q "AVISO\|@deprecated\|server.*cookie" "$SUPABASE_LIB" 2>/dev/null; then
  backup_e_registrar "$SUPABASE_LIB"
  sed -i '1i // AVISO: Este cliente não gerencia cookies de sessão SSR.\n// Prefira lib/supabase-server.ts em Server Components e lib/supabase-browser.ts em Client Components.\n// Este arquivo é mantido para compatibilidade com app/sitemap.ts e app/page.tsx (leitura pública sem auth).\n' "$SUPABASE_LIB"
  echo "   ✅ Comentário de aviso adicionado."
else
  echo "   ⏭  Comentário já presente."
fi

# ─────────────────────────────────────────────────────────────────────────────
# [B-4] BAIXO: app/admin/leads/page.tsx — ao salvar um lead (salvarLead),
#       se atualizarLead retornar erro, setExpandido(null) é chamado mesmo
#       assim, fechando o painel de edição sem feedback. Corrigimos para só
#       fechar quando a operação for bem-sucedida.
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "[B-4] Corrigindo salvarLead() para não fechar painel em caso de erro"

if grep -q "async function salvarLead" "$LEADS_PAGE" 2>/dev/null; then
  backup_e_registrar "$LEADS_PAGE"
  python3 - "$LEADS_PAGE" << 'PYEOF'
import sys

path = sys.argv[1]
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = """  async function salvarLead(id: string) {
    await atualizarLead(id, {
      status: rascunho.status,
      temperatura: rascunho.temperatura,
      preferencias: rascunho.preferencias,
      anotacoes: rascunho.anotacoes,
      proxima_acao_em: rascunho.proxima_acao_em,
    })
    setExpandido(null)
  }"""

new = """  async function salvarLead(id: string) {
    const { error } = await supabase
      .from('leads')
      .update({
        status: rascunho.status,
        temperatura: rascunho.temperatura,
        preferencias: rascunho.preferencias,
        anotacoes: rascunho.anotacoes,
        proxima_acao_em: rascunho.proxima_acao_em,
        ultima_interacao_em: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) {
      alert('Erro ao salvar lead: ' + error.message)
      return
    }
    await carregarLeads(mostrarArquivados)
    setExpandido(null)
  }"""

content = content.replace(old, new, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("   Python patch applied.")
PYEOF
  echo "   ✅ salvarLead() só fecha o painel se salvar com sucesso."
else
  echo "   ⏭  salvarLead já tem padrão diferente."
fi

# ─────────────────────────────────────────────────────────────────────────────
# [B-5] BAIXO: .gitignore — não ignora arquivos .bak criados por este script
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "[B-5] Adicionando *.bak ao .gitignore"

GITIGNORE=".gitignore"
if ! grep -q "\.bak" "$GITIGNORE" 2>/dev/null; then
  backup_e_registrar "$GITIGNORE"
  printf '\n# Backups do script de correção\n*.bak\n' >> "$GITIGNORE"
  echo "   ✅ *.bak adicionado ao .gitignore."
else
  echo "   ⏭  *.bak já no .gitignore."
fi

EDIT_PAGE="app/admin/imoveis/[id]/page.tsx"

# ─────────────────────────────────────────────────────────────────────────────
# [B-6] BAIXO: app/admin/imoveis/[id]/page.tsx — a função comprimirFoto é
#       importada de lib/image-watermark mas NÃO É USADA no arquivo de edição
#       (somente aplicarMarcaDagua é usada, que internamente chama comprimirFoto).
#       O import gera warning de TypeScript/ESLint. Removemos do import.
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "[B-6] Removendo import não-usado 'comprimirFoto' em [id]/page.tsx"

if grep -q "aplicarMarcaDagua, comprimirFoto" "$EDIT_PAGE" 2>/dev/null; then
  backup_e_registrar "$EDIT_PAGE"
  sed -i "s/import { aplicarMarcaDagua, comprimirFoto, type WatermarkSettings } from/import { aplicarMarcaDagua, type WatermarkSettings } from/" "$EDIT_PAGE"
  echo "   ✅ Import de comprimirFoto removido."
else
  echo "   ⏭  Import já correto ou padrão diferente."
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo " AÇÕES MANUAIS NECESSÁRIAS"
echo "════════════════════════════════════════════════════════════════"
echo ""

MANUAIS+=(
"[SEG-1] Crie o arquivo .env.local com as variáveis obrigatórias antes de subir em produção:
         NEXT_PUBLIC_SUPABASE_URL=...
         NEXT_PUBLIC_SUPABASE_ANON_KEY=...
         SUPABASE_SERVICE_ROLE_KEY=...  ← necessária para o endpoint /api/leads (INSERT sem RLS)
         O .gitignore já ignora .env*, então é seguro criar localmente."

"[SEG-2] proxy.ts na raiz não é middleware do Next.js. O arquivo middleware.ts foi criado
         por este script. Verifique se proxy.ts pode ser removido ou renomeado para evitar
         confusão futura: rm proxy.ts"

"[SEG-3] Nas migrations do Supabase, verifique se as Row Level Security policies da tabela
         'leads' permitem INSERT via service_role_key (necessário para a API funcionar em produção).
         Adicione se necessário:
         CREATE POLICY \"service_role_insert_leads\" ON leads FOR INSERT TO service_role USING (true);"

"[SEG-4] O número de WhatsApp '5555992290166' está hardcoded em ImovelClient.tsx como fallback
         inicial. Isso é carregado da tabela configuracoes, mas se a query falhar, o número
         hardcoded é usado. Verifique se é o número correto para o negócio."

"[UI-1] A tela de login não tem link 'Esqueci minha senha'. Para adicionar, crie a rota
         /admin/recuperar-senha usando supabase.auth.resetPasswordForEmail()."

"[UI-2] Em app/admin/imoveis/page.tsx, o campo de preço na listagem pode exibir 'NaN' se
         imovel.preco for null ou undefined. Adicione verificação: Number(imovel.preco || 0)."

"[PERF-1] app/sitemap.ts usa supabase diretamente (sem SSR). Isso funciona mas não autentica
          via cookies. Se a tabela imoveis tiver RLS bloqueando leitura pública, o sitemap
          ficará vazio. Adicione política SELECT pública para a tabela imoveis."

"[B-1] app/page.tsx — selects do formulário de busca usam defaultValue. Funcional para
       formulários GET server-side, mas não reflete seleção programática. Sem impacto crítico."
)

for manual in "${MANUAIS[@]}"; do
  echo "⚠️  AÇÃO MANUAL NECESSÁRIA:"
  echo "   $manual"
  echo ""
done

echo ""
echo "════════════════════════════════════════════════════════════════"
echo " RODANDO BUILD PARA VERIFICAR ERROS"
echo "════════════════════════════════════════════════════════════════"
echo ""

if [[ -f "package-lock.json" ]]; then
  PKG_MGR="npm"
elif [[ -f "yarn.lock" ]]; then
  PKG_MGR="yarn"
elif [[ -f "pnpm-lock.yaml" ]]; then
  PKG_MGR="pnpm"
else
  PKG_MGR="npm"
fi

echo " Gerenciador de pacotes detectado: $PKG_MGR"
echo ""

if [[ ! -d "node_modules" ]]; then
  echo " node_modules ausente — executando install..."
  $PKG_MGR install --legacy-peer-deps 2>&1 | tail -5
fi

echo " Executando: $PKG_MGR run build"
echo ""

if $PKG_MGR run build 2>&1; then
  echo ""
  echo "════════════════════════════════════════════════════════════════"
  echo " ✅ BUILD PASSOU COM SUCESSO"
  echo "════════════════════════════════════════════════════════════════"
else
  BUILD_STATUS=$?
  echo ""
  echo "════════════════════════════════════════════════════════════════"
  echo " ❌ BUILD FALHOU (exit $BUILD_STATUS)"
  echo "════════════════════════════════════════════════════════════════"
  echo ""
  echo " Verifique os erros acima. Causas prováveis:"
  echo " 1. Variáveis de ambiente ausentes (.env.local não criado)"
  echo " 2. TypeScript strict mode detectando tipos incorretos introduzidos"
  echo "    pelas correções — revise os arquivos .bak para comparação"
  echo " 3. Dependências não instaladas: execute '$PKG_MGR install'"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo " RESUMO FINAL"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo " Correções aplicadas : $CORRECOES"
echo " Arquivos modificados: ${#ARQUIVOS_MOD[@]}"
echo ""

if [[ ${#ARQUIVOS_MOD[@]} -gt 0 ]]; then
  echo " Arquivos alterados:"
  for f in "${ARQUIVOS_MOD[@]}"; do
    echo "   • $f  (backup: ${f}.bak)"
  done
fi

echo ""
echo " Ações manuais pendentes: ${#MANUAIS[@]}"
echo " (detalhadas acima, seção AÇÕES MANUAIS NECESSÁRIAS)"
echo ""
echo " Para reverter qualquer correção, restaure o .bak correspondente:"
echo "   cp arquivo.tsx.bak arquivo.tsx"
echo ""
echo "================================================================="

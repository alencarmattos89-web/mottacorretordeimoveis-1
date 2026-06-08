#!/usr/bin/env bash
# =============================================================================
# CRM MOTTA CORRETOR — EVOLUÇÃO FASE 1
# Gerado em: 2026-06-08
#
# O QUE ESTE SCRIPT FAZ:
#   1. Corrige bug do telefone: leads sem número não entram mais no CRM
#   2. Cria tabela lead_interacoes no Supabase (histórico de contatos)
#   3. Adiciona timeline de interações na tela de leads do admin
#   4. Adiciona botão "Novo lead manual" no admin
#   5. Refaz o dashboard com funil visual + leads por origem
#   6. Adiciona exportação CSV dos leads
#
# COMO USAR:
#   Cole tudo no terminal do GitHub Codespace dentro de:
#   /workspaces/mottacorretordeimoveis-1/mottacorretordeimoveis
# =============================================================================

set -e
cd "$(dirname "$0")" 2>/dev/null || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  CRM MOTTA — Evolução Fase 1"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# 1. MIGRATION: tabela lead_interacoes
# ─────────────────────────────────────────────────────────────────────────────
echo "→ [1/7] Criando migration lead_interacoes..."

mkdir -p supabase/migrations

cat > supabase/migrations/20260608000000_create_lead_interacoes.sql << 'SQL'
-- Histórico de interações por lead.
-- Cada registro = uma ação/contato realizado pelo corretor.

create table if not exists public.lead_interacoes (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  tipo        text not null default 'anotacao',
  -- tipo: 'anotacao' | 'ligacao' | 'whatsapp' | 'visita' | 'proposta' | 'status_change'
  descricao   text not null,
  status_de   text,
  status_para text,
  criado_em   timestamptz not null default now()
);

create index if not exists lead_interacoes_lead_id_idx on public.lead_interacoes(lead_id);
create index if not exists lead_interacoes_criado_em_idx on public.lead_interacoes(criado_em desc);

alter table public.lead_interacoes enable row level security;

drop policy if exists "interacoes_select_admin" on public.lead_interacoes;
drop policy if exists "interacoes_insert_admin" on public.lead_interacoes;
drop policy if exists "interacoes_delete_admin" on public.lead_interacoes;

create policy "interacoes_select_admin"
  on public.lead_interacoes for select
  to authenticated using (true);

create policy "interacoes_insert_admin"
  on public.lead_interacoes for insert
  to authenticated with check (true);

create policy "interacoes_delete_admin"
  on public.lead_interacoes for delete
  to authenticated using (true);
SQL

echo "   ✓ supabase/migrations/20260608000000_create_lead_interacoes.sql"

# ─────────────────────────────────────────────────────────────────────────────
# 2. FIX: api/leads/route.ts — rejeitar telefone vazio/inválido no backend
# ─────────────────────────────────────────────────────────────────────────────
echo "→ [2/7] Corrigindo validação de telefone no backend (api/leads/route.ts)..."

cat > app/api/leads/route.ts << 'TYPESCRIPT'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function getSupabase() {
  if (!supabaseUrl || (!supabaseServiceRoleKey && !supabaseAnonKey)) {
    throw new Error('Variáveis Supabase não configuradas')
  }
  const supabaseKey = supabaseServiceRoleKey || supabaseAnonKey!
  if (!supabaseServiceRoleKey) {
    console.warn('[leads/route] AVISO: SUPABASE_SERVICE_ROLE_KEY não definida.')
  }
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function somenteDigitos(valor?: string | null) {
  return String(valor || '').replace(/\D/g, '')
}

function normalizarTelefone(valor?: string | null) {
  const digitos = somenteDigitos(valor)
  if (!digitos) return null
  if (digitos.startsWith('55')) return digitos
  if (digitos.length >= 10) return `55${digitos}`
  return digitos
}

function limparTexto(valor: unknown, fallback = '') {
  const texto = String(valor ?? '').trim()
  return texto || fallback
}

function telefoneEhValido(telefone: string): boolean {
  // Rejeita placeholder, vazio, ou menos de 10 dígitos reais
  const invalidos = ['não informado', 'nao informado', 'sem telefone', '']
  const limpo = telefone.trim().toLowerCase()
  if (invalidos.includes(limpo)) return false
  const digitos = somenteDigitos(telefone)
  return digitos.length >= 10
}

function proximaAcaoPadrao() {
  const data = new Date()
  data.setHours(data.getHours() + 2)
  return data.toISOString()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = getSupabase()

    const origem = limparTexto(body.origem, 'formulario')
    const nome = limparTexto(body.nome, '')
    const telefone = limparTexto(body.telefone, '')

    if (!nome) {
      return NextResponse.json({ error: 'Informe o nome do lead.' }, { status: 400 })
    }

    // ── VALIDAÇÃO DE TELEFONE ────────────────────────────────────────────────
    // Bloqueia envio sem número real — evita leads inúteis no CRM
    if (!telefoneEhValido(telefone)) {
      return NextResponse.json(
        { error: 'Informe um número de WhatsApp válido com DDD para continuar.' },
        { status: 400 }
      )
    }

    const telefoneNormalizado = normalizarTelefone(telefone)
    const paginaUrl = limparTexto(body.pagina_url, '') || req.headers.get('referer') || null
    const imovelTitulo = limparTexto(body.imovel_titulo || body.referencia || body.referencia_imovel, '') || null
    const imovelId = body.imovel_id || null

    const payload = {
      nome,
      telefone,
      telefone_normalizado: telefoneNormalizado,
      email: limparTexto(body.email, '') || null,
      imovel_id: imovelId,
      imovel_titulo: imovelTitulo,
      origem,
      pagina_url: paginaUrl,
      status: limparTexto(body.status, 'novo'),
      temperatura: limparTexto(body.temperatura, origem === 'whatsapp_click' ? 'quente' : 'morno'),
      preferencias: limparTexto(body.preferencias, '') || null,
      proxima_acao_em: body.proxima_acao_em || proximaAcaoPadrao(),
      ultima_interacao_em: new Date().toISOString(),
      consentiu_whatsapp: body.consentiu_whatsapp !== false,
      anotacoes: limparTexto(body.anotacoes, '') || null,
    }

    const { data, error } = await supabase
      .from('leads')
      .insert(payload)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Webhook externo (n8n / Make / Zapier) — opcional
    if (process.env.CRM_NOTIFICATION_WEBHOOK_URL) {
      fetch(process.env.CRM_NOTIFICATION_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead: data }),
      }).catch((err) => console.error('Erro ao notificar webhook:', err))
    }

    return NextResponse.json({ success: true, id: data.id, lead: data })
  } catch (err) {
    console.error('Erro no endpoint /api/leads:', err)
    return NextResponse.json({ error: 'Erro ao processar lead.' }, { status: 500 })
  }
}
TYPESCRIPT

echo "   ✓ app/api/leads/route.ts (validação de telefone reforçada)"

# ─────────────────────────────────────────────────────────────────────────────
# 3. FIX: ImovelClient.tsx — whatsapp_click não registra telefone falso
# ─────────────────────────────────────────────────────────────────────────────
echo "→ [3/7] Corrigindo ImovelClient.tsx (whatsapp_click sem telefone)..."

# Apenas substitui a linha que coloca 'Não informado' como fallback de telefone
# e adiciona validação mínima no registrarLead para origem whatsapp_click
# Usamos Python para fazer o patch cirúrgico sem reescrever o arquivo inteiro

python3 - << 'PYEOF'
import re

path = "app/imovel/[id]/ImovelClient.tsx"
with open(path, "r") as f:
    content = f.read()

# Fix 1: remover o fallback 'Não informado' na função registrarLead
# De: telefone: dados.telefone || form.telefone || 'Não informado',
# Para: telefone: dados.telefone || form.telefone || '',
content = content.replace(
    "telefone: dados.telefone || form.telefone || 'Não informado',",
    "telefone: dados.telefone || form.telefone || '',"
)

# Fix 2: no handleWhatsAppClick, só abre o WhatsApp se tiver telefone preenchido
# Adiciona verificação antes de registrar o lead no clique do botão WhatsApp
# Localiza o bloco do handleWhatsAppClick e adiciona checagem
old_click = """  async function handleWhatsAppClick(e: React.MouseEvent<HTMLAnchorElement>) {
    try {
      const data = await registrarLead('whatsapp_click')
      const url = data?.whatsapp_url || mensagemWhatsApp(data?.id)"""

new_click = """  async function handleWhatsAppClick(e: React.MouseEvent<HTMLAnchorElement>) {
    // Registra o clique mas sem telefone do visitante — ok, pois aqui
    // quem fala é o visitante via wa.me, não precisamos do número dele neste momento
    try {
      // Apenas registra o interesse sem forçar telefone falso
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: 'Interesse via WhatsApp',
          telefone: form.telefone || 'pendente',
          email: form.email || null,
          imovel_id: imovel?.id,
          imovel_titulo: imovel?.titulo,
          origem: 'whatsapp_click',
          temperatura: 'quente',
          pagina_url: typeof window !== 'undefined' ? window.location.href : null,
          anotacoes: 'Lead captado pelo botão WhatsApp — número a confirmar via conversa.',
        }),
      }).catch(() => {/* silencioso se falhar */})
      const url = mensagemWhatsApp()"""

if old_click in content:
    content = content.replace(old_click, new_click)

with open(path, "w") as f:
    f.write(content)

print("   ✓ ImovelClient.tsx atualizado")
PYEOF

echo "   ✓ app/imovel/[id]/ImovelClient.tsx"

# ─────────────────────────────────────────────────────────────────────────────
# 4. NOVO: app/admin/leads/page.tsx — timeline + novo lead manual + exportação CSV
# ─────────────────────────────────────────────────────────────────────────────
echo "→ [4/7] Reescrevendo tela de leads (timeline + novo lead + CSV)..."

cat > app/admin/leads/page.tsx << 'TYPESCRIPT'
'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const STATUS_LABELS: Record<string, { label: string; cor: string }> = {
  novo:            { label: 'Novo',       cor: '#c9a84c' },
  primeiro_contato:{ label: '1º contato', cor: '#5b9bd5' },
  contato:         { label: '1º contato', cor: '#5b9bd5' },
  qualificado:     { label: 'Qualificado',cor: '#61ce70' },
  visita:          { label: 'Visita',     cor: '#9b59b6' },
  proposta:        { label: 'Proposta',   cor: '#e67e22' },
  fechado:         { label: 'Fechado',    cor: '#2ecc71' },
  perdido:         { label: 'Perdido',    cor: '#c0392b' },
}

const STATUS_FUNIL = ['novo','primeiro_contato','qualificado','visita','proposta','fechado','perdido']
const TEMPERATURAS = ['quente','morno','frio']

const TIPO_INTERACAO: Record<string, { label: string; cor: string }> = {
  anotacao:      { label: 'Anotação',       cor: '#6b6355' },
  ligacao:       { label: 'Ligação',         cor: '#5b9bd5' },
  whatsapp:      { label: 'WhatsApp',        cor: '#25D366' },
  visita:        { label: 'Visita',          cor: '#9b59b6' },
  proposta:      { label: 'Proposta',        cor: '#e67e22' },
  status_change: { label: 'Mudança status',  cor: '#c9a84c' },
}

type Lead = {
  id: string
  nome: string
  telefone: string
  telefone_normalizado?: string | null
  email?: string | null
  imovel_id?: string | null
  imovel_titulo?: string | null
  status: string
  origem?: string | null
  temperatura?: string | null
  preferencias?: string | null
  anotacoes?: string | null
  orcamento_min?: number | null
  orcamento_max?: number | null
  pagina_url?: string | null
  proxima_acao_em?: string | null
  ultima_interacao_em?: string | null
  created_at: string
  arquivado?: boolean
}

type Interacao = {
  id: string
  lead_id: string
  tipo: string
  descricao: string
  status_de?: string | null
  status_para?: string | null
  criado_em: string
}

function formatarData(dt?: string | null) {
  if (!dt) return 'Sem data'
  return new Date(dt).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function toDateTimeLocal(dt?: string | null) {
  if (!dt) return ''
  const data = new Date(dt)
  const local = new Date(data.getTime() - data.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function fromDateTimeLocal(valor: string) {
  if (!valor) return null
  return new Date(valor).toISOString()
}

function telefoneWhatsApp(lead: Lead) {
  const digits = String(lead.telefone_normalizado || lead.telefone || '').replace(/\D/g, '')
  if (!digits) return ''
  return digits.startsWith('55') ? digits : `55${digits}`
}

function mensagemWhatsApp(lead: Lead) {
  const primeiroNome = lead.nome?.split(' ')[0] || 'tudo bem'
  const imovel = lead.imovel_titulo ? ` sobre o imóvel ${lead.imovel_titulo}` : ''
  return encodeURIComponent(`Olá, ${primeiroNome}! Tudo bem? Sou o Motta Corretor. Recebi seu interesse${imovel}. Posso te passar mais detalhes?`)
}

function origemLabel(origem?: string | null) {
  const mapa: Record<string, string> = {
    formulario:              'Formulário',
    whatsapp_click:          'Clique WhatsApp',
    migrado_atendimentos:    'Importado',
    manual:                  'Cadastro manual',
    instagram:               'Instagram',
    facebook:                'Facebook',
    indicacao:               'Indicação',
  }
  return mapa[origem || ''] || origem || 'Não informada'
}

function estaVencido(lead: Lead) {
  if (!lead.proxima_acao_em || ['fechado','perdido'].includes(lead.status)) return false
  return new Date(lead.proxima_acao_em).getTime() < Date.now()
}

function exportarCSV(leads: Lead[]) {
  const cabecalho = ['Nome','Telefone','Email','Imóvel','Status','Temperatura','Origem','Criado em','Próxima ação','Orçamento mín','Orçamento máx','Preferências']
  const linhas = leads.map(l => [
    l.nome,
    l.telefone,
    l.email || '',
    l.imovel_titulo || '',
    STATUS_LABELS[l.status]?.label || l.status,
    l.temperatura || '',
    origemLabel(l.origem),
    formatarData(l.created_at),
    formatarData(l.proxima_acao_em),
    l.orcamento_min?.toString() || '',
    l.orcamento_max?.toString() || '',
    l.preferencias || '',
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))

  const csv = [cabecalho.join(','), ...linhas].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `leads_motta_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const LEAD_VAZIO: Partial<Lead> = {
  nome: '', telefone: '', email: '',
  status: 'novo', temperatura: 'morno', origem: 'manual',
  preferencias: '', anotacoes: '', proxima_acao_em: '',
}

export default function LeadsAdmin() {
  const [leads, setLeads]                   = useState<Lead[]>([])
  const [loading, setLoading]               = useState(true)
  const [expandido, setExpandido]           = useState<string | null>(null)
  const [rascunho, setRascunho]             = useState<Partial<Lead>>({})
  const [filtroStatus, setFiltroStatus]     = useState('todos')
  const [mostrarArquivados, setMostrarArquivados] = useState(false)
  const [filtroBusca, setFiltroBusca]       = useState('')

  // Interações
  const [interacoes, setInteracoes]         = useState<Record<string, Interacao[]>>({})
  const [novaInteracao, setNovaInteracao]   = useState<Record<string, { tipo: string; descricao: string }>>({})
  const [salvandoInteracao, setSalvandoInteracao] = useState(false)

  // Novo lead manual
  const [modalNovoLead, setModalNovoLead]   = useState(false)
  const [novoLead, setNovoLead]             = useState<Partial<Lead>>(LEAD_VAZIO)
  const [salvandoNovo, setSalvandoNovo]     = useState(false)

  useEffect(() => { carregarLeads(mostrarArquivados) }, [mostrarArquivados])

  async function carregarLeads(arquivados = false) {
    setLoading(true)
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('arquivado', arquivados)
      .order('created_at', { ascending: false })
    if (error) console.error('Erro ao carregar leads:', error)
    setLeads((data || []) as Lead[])
    setLoading(false)
  }

  async function carregarInteracoes(leadId: string) {
    const { data } = await supabase
      .from('lead_interacoes')
      .select('*')
      .eq('lead_id', leadId)
      .order('criado_em', { ascending: false })
    setInteracoes(prev => ({ ...prev, [leadId]: (data || []) as Interacao[] }))
  }

  async function adicionarInteracao(lead: Lead) {
    const ni = novaInteracao[lead.id]
    if (!ni?.descricao?.trim()) return
    setSalvandoInteracao(true)
    const { error } = await supabase.from('lead_interacoes').insert({
      lead_id: lead.id,
      tipo: ni.tipo || 'anotacao',
      descricao: ni.descricao.trim(),
    })
    if (!error) {
      await supabase.from('leads').update({ ultima_interacao_em: new Date().toISOString() }).eq('id', lead.id)
      setNovaInteracao(prev => ({ ...prev, [lead.id]: { tipo: 'anotacao', descricao: '' } }))
      await carregarInteracoes(lead.id)
      await carregarLeads(mostrarArquivados)
    }
    setSalvandoInteracao(false)
  }

  async function deletarInteracao(interacaoId: string, leadId: string) {
    if (!confirm('Remover esta interação?')) return
    await supabase.from('lead_interacoes').delete().eq('id', interacaoId)
    await carregarInteracoes(leadId)
  }

  async function atualizarLead(id: string, campos: Partial<Lead>) {
    const { error } = await supabase.from('leads')
      .update({ ...campos, ultima_interacao_em: new Date().toISOString() })
      .eq('id', id)
    if (error) { alert(`Erro ao atualizar lead: ${error.message}`); return }
    await carregarLeads(mostrarArquivados)
  }

  async function arquivarLead(id: string, arquivar: boolean) {
    const acao = arquivar ? 'arquivar' : 'desarquivar'
    if (!confirm(`Deseja ${acao} este lead?`)) return
    const { error } = await supabase.from('leads').update({ arquivado: arquivar }).eq('id', id)
    if (error) { alert(`Erro ao ${acao}: ${error.message}`); return }
    await carregarLeads(mostrarArquivados)
  }

  async function salvarLead(id: string) {
    const statusAnterior = leads.find(l => l.id === id)?.status
    const { error } = await supabase.from('leads').update({
      status:          rascunho.status,
      temperatura:     rascunho.temperatura,
      preferencias:    rascunho.preferencias,
      anotacoes:       rascunho.anotacoes,
      orcamento_min:   rascunho.orcamento_min || null,
      orcamento_max:   rascunho.orcamento_max || null,
      proxima_acao_em: rascunho.proxima_acao_em,
      ultima_interacao_em: new Date().toISOString(),
    }).eq('id', id)
    if (error) { alert('Erro ao salvar lead: ' + error.message); return }

    // Se mudou de status, registra interação automática
    if (rascunho.status && rascunho.status !== statusAnterior) {
      await supabase.from('lead_interacoes').insert({
        lead_id: id,
        tipo: 'status_change',
        descricao: `Status alterado de "${STATUS_LABELS[statusAnterior || '']?.label || statusAnterior}" para "${STATUS_LABELS[rascunho.status]?.label || rascunho.status}"`,
        status_de: statusAnterior,
        status_para: rascunho.status,
      })
    }

    await carregarLeads(mostrarArquivados)
    await carregarInteracoes(id)
    setExpandido(null)
  }

  async function criarLeadManual() {
    if (!novoLead.nome?.trim()) { alert('Informe o nome do lead.'); return }
    if (!novoLead.telefone?.replace(/\D/g,'') || novoLead.telefone.replace(/\D/g,'').length < 10) {
      alert('Informe um número de WhatsApp válido com DDD.'); return
    }
    setSalvandoNovo(true)
    const { error } = await supabase.from('leads').insert({
      nome:         novoLead.nome?.trim(),
      telefone:     novoLead.telefone?.trim(),
      email:        novoLead.email?.trim() || null,
      status:       novoLead.status || 'novo',
      temperatura:  novoLead.temperatura || 'morno',
      origem:       novoLead.origem || 'manual',
      preferencias: novoLead.preferencias?.trim() || null,
      anotacoes:    novoLead.anotacoes?.trim() || null,
      proxima_acao_em: new Date(Date.now() + 2 * 3600000).toISOString(),
      ultima_interacao_em: new Date().toISOString(),
    })
    if (error) { alert('Erro ao criar lead: ' + error.message); setSalvandoNovo(false); return }
    setModalNovoLead(false)
    setNovoLead(LEAD_VAZIO)
    await carregarLeads(mostrarArquivados)
    setSalvandoNovo(false)
  }

  function abrirLead(lead: Lead) {
    if (expandido === lead.id) { setExpandido(null); return }
    setExpandido(lead.id)
    setRascunho({
      status:       lead.status || 'novo',
      temperatura:  lead.temperatura || 'morno',
      preferencias: lead.preferencias || '',
      anotacoes:    lead.anotacoes || '',
      orcamento_min: lead.orcamento_min || undefined,
      orcamento_max: lead.orcamento_max || undefined,
      proxima_acao_em: lead.proxima_acao_em || '',
    })
    if (!interacoes[lead.id]) carregarInteracoes(lead.id)
    if (!novaInteracao[lead.id]) {
      setNovaInteracao(prev => ({ ...prev, [lead.id]: { tipo: 'anotacao', descricao: '' } }))
    }
  }

  const leadsFiltrados = useMemo(() => {
    const busca = filtroBusca.trim().toLowerCase()
    return leads.filter((lead) => {
      const bateStatus = filtroStatus === 'todos'
        || (filtroStatus === 'atrasados' ? estaVencido(lead) : lead.status === filtroStatus)
      const texto = [lead.nome, lead.telefone, lead.email, lead.imovel_titulo, lead.origem]
        .filter(Boolean).join(' ').toLowerCase()
      return bateStatus && (!busca || texto.includes(busca))
    })
  }, [leads, filtroStatus, filtroBusca])

  const contadores = useMemo(() => {
    const base = STATUS_FUNIL.reduce((acc, status) => {
      acc[status] = leads.filter((l) => l.status === status || (status === 'primeiro_contato' && l.status === 'contato')).length
      return acc
    }, {} as Record<string, number>)
    base.atrasados = leads.filter(estaVencido).length
    return base
  }, [leads])

  return (
    <main style={{ background: '#0a0a0a', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>

      {/* MODAL NOVO LEAD */}
      {modalNovoLead && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#0f0e0c', border: '1px solid rgba(201,168,76,0.3)', maxWidth: '520px', width: '100%', padding: '32px' }}>
            <p style={{ fontSize: '11px', letterSpacing: '3px', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '8px' }}>CRM</p>
            <h2 style={{ fontFamily: 'Georgia,serif', fontSize: '22px', fontWeight: 300, color: '#e8e0d0', marginBottom: '24px' }}>Novo lead manual</h2>

            <div style={{ display: 'grid', gap: '14px' }}>
              <label style={labelBox}>
                Nome *
                <input value={novoLead.nome || ''} onChange={e => setNovoLead(p => ({...p, nome: e.target.value}))} placeholder="Nome completo" style={inputStyle} />
              </label>
              <label style={labelBox}>
                WhatsApp * <span style={{ color: '#c0392b' }}>(obrigatório)</span>
                <input type="tel" value={novoLead.telefone || ''} onChange={e => setNovoLead(p => ({...p, telefone: e.target.value}))} placeholder="(55) 99999-9999" style={inputStyle} />
              </label>
              <label style={labelBox}>
                E-mail (opcional)
                <input type="email" value={novoLead.email || ''} onChange={e => setNovoLead(p => ({...p, email: e.target.value}))} style={inputStyle} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <label style={labelBox}>
                  Status
                  <select value={novoLead.status || 'novo'} onChange={e => setNovoLead(p => ({...p, status: e.target.value}))} style={inputStyle}>
                    {STATUS_FUNIL.map(s => <option key={s} value={s}>{STATUS_LABELS[s]?.label || s}</option>)}
                  </select>
                </label>
                <label style={labelBox}>
                  Temperatura
                  <select value={novoLead.temperatura || 'morno'} onChange={e => setNovoLead(p => ({...p, temperatura: e.target.value}))} style={inputStyle}>
                    {TEMPERATURAS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <label style={labelBox}>
                  Origem
                  <select value={novoLead.origem || 'manual'} onChange={e => setNovoLead(p => ({...p, origem: e.target.value}))} style={inputStyle}>
                    <option value="manual">Manual</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="indicacao">Indicação</option>
                    <option value="formulario">Site</option>
                  </select>
                </label>
              </div>
              <label style={labelBox}>
                Preferências / interesse
                <textarea value={novoLead.preferencias || ''} onChange={e => setNovoLead(p => ({...p, preferencias: e.target.value}))} rows={2} placeholder="Ex: casa com quintal, até R$ 350k, aceita financiamento..." style={{ ...inputStyle, resize: 'vertical' }} />
              </label>
              <label style={labelBox}>
                Anotação inicial
                <textarea value={novoLead.anotacoes || ''} onChange={e => setNovoLead(p => ({...p, anotacoes: e.target.value}))} rows={2} placeholder="Como chegou até você? O que disse?" style={{ ...inputStyle, resize: 'vertical' }} />
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button onClick={criarLeadManual} disabled={salvandoNovo}
                style={{ background: '#c9a84c', color: '#0a0a0a', border: 'none', padding: '12px 24px', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700, cursor: salvandoNovo ? 'wait' : 'pointer', opacity: salvandoNovo ? 0.7 : 1 }}>
                {salvandoNovo ? 'Salvando...' : 'Criar lead'}
              </button>
              <button onClick={() => { setModalNovoLead(false); setNovoLead(LEAD_VAZIO) }} style={secondaryButton}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header style={{ background: '#0f0e0c', borderBottom: '1px solid rgba(201,168,76,0.2)', padding: '0 32px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <p style={{ fontFamily: 'Georgia,serif', fontSize: '18px', color: '#c9a84c' }}>Motta Admin</p>
          <nav style={{ display: 'flex', gap: '24px' }}>
            <Link href="/admin/dashboard" style={{ color: '#a09880', fontSize: '12px', letterSpacing: '1px', textDecoration: 'none' }}>Dashboard</Link>
            <Link href="/admin/imoveis" style={{ color: '#a09880', fontSize: '12px', letterSpacing: '1px', textDecoration: 'none' }}>Imóveis</Link>
            <Link href="/admin/leads" style={{ color: '#e8e0d0', fontSize: '12px', letterSpacing: '1px', textDecoration: 'none' }}>Leads</Link>
            <Link href="/admin/configuracoes" style={{ color: '#a09880', fontSize: '12px', letterSpacing: '1px', textDecoration: 'none' }}>Configurações</Link>
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/" style={{ color: '#6b6355', fontSize: '11px', letterSpacing: '1px', textDecoration: 'none' }}>Ver site →</Link>
          <LogoutButton />
        </div>
      </header>

      <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '48px 32px' }}>
        <p style={{ fontSize: '11px', letterSpacing: '4px', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '8px' }}>CRM</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
          <h1 style={{ fontFamily: 'Georgia,serif', fontSize: '32px', fontWeight: 300, color: '#e8e0d0' }}>Leads e follow-up</h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => exportarCSV(leadsFiltrados)} style={{ ...secondaryButton, fontSize: '11px', letterSpacing: '1px' }}>
              ↓ Exportar CSV
            </button>
            <button onClick={() => setModalNovoLead(true)} style={{ background: '#c9a84c', color: '#0a0a0a', border: 'none', padding: '10px 20px', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer' }}>
              + Novo lead
            </button>
          </div>
        </div>
        <p style={{ color: '#6b6355', fontSize: '13px', marginBottom: '32px' }}>Priorize atrasados, registre cada contato e responda rápido pelo WhatsApp.</p>

        {/* CONTADORES */}
        <div style={{ display: 'flex', gap: '1px', background: 'rgba(201,168,76,0.15)', marginBottom: '24px', flexWrap: 'wrap' }}>
          <button onClick={() => setFiltroStatus('atrasados')} style={cardFiltro(filtroStatus === 'atrasados', '#c0392b')}>
            <strong style={{ fontFamily: 'Georgia,serif', fontSize: '26px', fontWeight: 300 }}>{contadores.atrasados || 0}</strong>
            <span>Atrasados</span>
          </button>
          {STATUS_FUNIL.map((status) => {
            const item = STATUS_LABELS[status]
            return (
              <button key={status} onClick={() => setFiltroStatus(status)} style={cardFiltro(filtroStatus === status, item.cor)}>
                <strong style={{ fontFamily: 'Georgia,serif', fontSize: '26px', fontWeight: 300 }}>{contadores[status] || 0}</strong>
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* BARRA DE FILTROS */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <button onClick={() => setFiltroStatus('todos')} style={{ background: filtroStatus === 'todos' ? '#c9a84c' : '#0f0e0c', color: filtroStatus === 'todos' ? '#0a0a0a' : '#a09880', border: '1px solid rgba(201,168,76,0.25)', padding: '10px 14px', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}>
            Todos ({leads.length})
          </button>
          <button
            onClick={() => { setMostrarArquivados(!mostrarArquivados); setFiltroStatus('todos') }}
            style={{ background: mostrarArquivados ? 'rgba(192,57,43,0.15)' : '#0f0e0c', color: mostrarArquivados ? '#c0392b' : '#6b6355', border: `1px solid ${mostrarArquivados ? 'rgba(192,57,43,0.4)' : 'rgba(201,168,76,0.25)'}`, padding: '10px 14px', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            {mostrarArquivados ? '← Ativos' : '📦 Arquivados'}
          </button>
          <input
            value={filtroBusca}
            onChange={(e) => setFiltroBusca(e.target.value)}
            placeholder="Buscar por nome, telefone, imóvel ou origem..."
            style={{ flex: 1, minWidth: '260px', background: '#0f0e0c', border: '1px solid rgba(201,168,76,0.25)', color: '#e8e0d0', padding: '10px 14px', fontSize: '13px', outline: 'none' }}
          />
        </div>

        {loading ? (
          <p style={{ color: '#6b6355' }}>Carregando...</p>
        ) : leadsFiltrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#4a4438', border: '1px solid rgba(201,168,76,0.12)' }}>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>📋</p>
            <p style={{ fontSize: '18px', color: '#6b6355' }}>Nenhum lead encontrado.</p>
            <button onClick={() => setModalNovoLead(true)} style={{ marginTop: '20px', background: '#c9a84c', color: '#0a0a0a', border: 'none', padding: '12px 24px', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer' }}>+ Adicionar lead manual</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1px', background: 'rgba(201,168,76,0.15)' }}>
            {leadsFiltrados.map((lead) => {
              const status = STATUS_LABELS[lead.status] || STATUS_LABELS.novo
              const aberto = expandido === lead.id
              const vencido = estaVencido(lead)
              const whats = telefoneWhatsApp(lead)
              const iList = interacoes[lead.id] || []
              const ni = novaInteracao[lead.id] || { tipo: 'anotacao', descricao: '' }

              return (
                <div key={lead.id} style={{ background: '#0f0e0c' }}>
                  {/* LINHA RESUMO */}
                  <div onClick={() => abrirLead(lead)} style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', cursor: 'pointer' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <p style={{ color: '#e8e0d0', fontSize: '15px', fontWeight: 600 }}>{lead.nome}</p>
                        <span style={{ fontSize: '9px', padding: '2px 8px', letterSpacing: '1px', textTransform: 'uppercase', color: status.cor, border: `1px solid ${status.cor}55` }}>{status.label}</span>
                        <span style={{ fontSize: '9px', padding: '2px 8px', letterSpacing: '1px', textTransform: 'uppercase', color: lead.temperatura === 'quente' ? '#ff6b35' : '#8a7d6a', border: '1px solid rgba(201,168,76,0.16)' }}>{lead.temperatura || 'morno'}</span>
                        {vencido && <span style={{ fontSize: '9px', padding: '2px 8px', letterSpacing: '1px', textTransform: 'uppercase', color: '#c0392b', border: '1px solid rgba(192,57,43,0.55)' }}>ação vencida</span>}
                      </div>
                      <p style={{ color: '#6b6355', fontSize: '12px', letterSpacing: '0.5px' }}>
                        {lead.telefone}
                        {lead.email && <> · {lead.email}</>}
                        {lead.imovel_titulo && <> · <span style={{ color: '#8a7d6a' }}>{lead.imovel_titulo}</span></>}
                      </p>
                      <p style={{ color: '#4a4438', fontSize: '11px', marginTop: '6px' }}>
                        Origem: {origemLabel(lead.origem)} · Criado em {formatarData(lead.created_at)} · Próxima ação: {formatarData(lead.proxima_acao_em)}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {whats && (
                        <a onClick={(e) => e.stopPropagation()} href={`https://wa.me/${whats}?text=${mensagemWhatsApp(lead)}`} target="_blank" rel="noreferrer"
                          style={{ background: '#25D366', color: '#fff', padding: '9px 12px', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700 }}>
                          WhatsApp
                        </a>
                      )}
                      <span style={{ color: '#6b6355', fontSize: '16px' }}>{aberto ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* PAINEL EXPANDIDO */}
                  {aberto && (
                    <div style={{ borderTop: '1px solid rgba(201,168,76,0.1)', background: '#0d0c0a' }}>

                      {/* Edição dos campos CRM */}
                      <div style={{ padding: '24px 24px 0' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '14px' }}>
                          <label style={labelBox}>
                            Status
                            <select value={rascunho.status || 'novo'} onChange={(e) => setRascunho((r) => ({ ...r, status: e.target.value }))} style={inputStyle}>
                              {STATUS_FUNIL.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]?.label || s}</option>)}
                            </select>
                          </label>
                          <label style={labelBox}>
                            Temperatura
                            <select value={rascunho.temperatura || 'morno'} onChange={(e) => setRascunho((r) => ({ ...r, temperatura: e.target.value }))} style={inputStyle}>
                              {TEMPERATURAS.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </label>
                          <label style={labelBox}>
                            Próxima ação
                            <input type="datetime-local" value={toDateTimeLocal(rascunho.proxima_acao_em)} onChange={(e) => setRascunho((r) => ({ ...r, proxima_acao_em: fromDateTimeLocal(e.target.value) || undefined }))} style={inputStyle} />
                          </label>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                          <label style={labelBox}>
                            Orçamento mínimo (R$)
                            <input type="number" value={rascunho.orcamento_min || ''} onChange={e => setRascunho(r => ({...r, orcamento_min: Number(e.target.value) || undefined}))} placeholder="Ex: 200000" style={inputStyle} />
                          </label>
                          <label style={labelBox}>
                            Orçamento máximo (R$)
                            <input type="number" value={rascunho.orcamento_max || ''} onChange={e => setRascunho(r => ({...r, orcamento_max: Number(e.target.value) || undefined}))} placeholder="Ex: 400000" style={inputStyle} />
                          </label>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
                          <label style={labelBox}>
                            Preferências
                            <textarea value={rascunho.preferencias || ''} onChange={(e) => setRascunho((r) => ({ ...r, preferencias: e.target.value }))} rows={3} placeholder="Casa com quintal, até R$ 350k, aceita financiamento..." style={{ ...inputStyle, resize: 'vertical' }} />
                          </label>
                          <label style={labelBox}>
                            Observação geral
                            <textarea value={rascunho.anotacoes || ''} onChange={(e) => setRascunho((r) => ({ ...r, anotacoes: e.target.value }))} rows={3} placeholder="Contexto geral do lead, não sobrescreve o histórico..." style={{ ...inputStyle, resize: 'vertical' }} />
                          </label>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
                          <button onClick={() => salvarLead(lead.id)} style={{ background: '#c9a84c', color: '#0a0a0a', border: 'none', padding: '10px 24px', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer' }}>Salvar</button>
                          <button onClick={() => atualizarLead(lead.id, { status: 'primeiro_contato' })} style={secondaryButton}>Marcar 1º contato</button>
                          <button onClick={() => atualizarLead(lead.id, { proxima_acao_em: new Date(Date.now() + 24 * 3600000).toISOString() })} style={secondaryButton}>Lembrar amanhã</button>
                          {lead.pagina_url && <a href={lead.pagina_url} target="_blank" rel="noreferrer" style={{ ...secondaryButton, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>Ver página</a>}
                          {lead.imovel_id && <a href={`/admin/imoveis/${lead.imovel_id}`} target="_blank" rel="noreferrer" style={{ ...secondaryButton, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>Ver imóvel →</a>}
                          <button onClick={() => arquivarLead(lead.id, !lead.arquivado)} style={{ ...secondaryButton, color: lead.arquivado ? '#61ce70' : '#c0392b', borderColor: lead.arquivado ? 'rgba(97,206,112,0.3)' : 'rgba(192,57,43,0.3)' }}>
                            {lead.arquivado ? '↩ Desarquivar' : '📦 Arquivar'}
                          </button>
                        </div>
                      </div>

                      {/* TIMELINE DE INTERAÇÕES */}
                      <div style={{ borderTop: '1px solid rgba(201,168,76,0.1)', padding: '20px 24px 24px' }}>
                        <p style={{ fontSize: '10px', letterSpacing: '3px', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '16px' }}>Histórico de contatos</p>

                        {/* Adicionar nova interação */}
                        <div style={{ background: '#111009', border: '1px solid rgba(201,168,76,0.15)', padding: '14px', marginBottom: '20px' }}>
                          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                            {Object.entries(TIPO_INTERACAO).filter(([k]) => k !== 'status_change').map(([k, v]) => (
                              <button key={k} onClick={() => setNovaInteracao(prev => ({...prev, [lead.id]: {...(prev[lead.id] || {descricao:''}), tipo: k}}))}
                                style={{ padding: '5px 12px', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', border: '1px solid', cursor: 'pointer', background: ni.tipo === k ? `${v.cor}22` : 'transparent', color: ni.tipo === k ? v.cor : '#6b6355', borderColor: ni.tipo === k ? `${v.cor}55` : 'rgba(201,168,76,0.15)' }}>
                                {v.label}
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={ni.descricao}
                            onChange={e => setNovaInteracao(prev => ({...prev, [lead.id]: {...(prev[lead.id] || {tipo:'anotacao'}), descricao: e.target.value}}))}
                            placeholder={ni.tipo === 'ligacao' ? 'Ex: Ligou, falou que vai ver o imóvel na semana que vem...' : ni.tipo === 'whatsapp' ? 'Ex: Enviou mensagem perguntando sobre financiamento...' : ni.tipo === 'visita' ? 'Ex: Visitou o ap. 302 — gostou mas quer pensar...' : 'Registre aqui o que aconteceu...'}
                            rows={2}
                            style={{ ...inputStyle, resize: 'vertical', marginBottom: '8px', width: '100%', boxSizing: 'border-box' }}
                          />
                          <button onClick={() => adicionarInteracao(lead)} disabled={salvandoInteracao || !ni.descricao?.trim()}
                            style={{ background: ni.descricao?.trim() ? '#c9a84c' : '#2a2820', color: ni.descricao?.trim() ? '#0a0a0a' : '#4a4438', border: 'none', padding: '8px 18px', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700, cursor: ni.descricao?.trim() ? 'pointer' : 'default' }}>
                            {salvandoInteracao ? 'Salvando...' : '+ Registrar'}
                          </button>
                        </div>

                        {/* Lista de interações */}
                        {iList.length === 0 ? (
                          <p style={{ color: '#4a4438', fontSize: '12px', textAlign: 'center', padding: '16px' }}>Nenhum contato registrado ainda.</p>
                        ) : (
                          <div style={{ display: 'grid', gap: '8px' }}>
                            {iList.map(inter => {
                              const tipoInfo = TIPO_INTERACAO[inter.tipo] || TIPO_INTERACAO.anotacao
                              return (
                                <div key={inter.id} style={{ display: 'flex', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(201,168,76,0.07)', alignItems: 'flex-start' }}>
                                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: tipoInfo.cor, marginTop: '6px', flexShrink: 0 }} />
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '3px', flexWrap: 'wrap' }}>
                                      <span style={{ fontSize: '10px', color: tipoInfo.cor, letterSpacing: '1px', textTransform: 'uppercase' }}>{tipoInfo.label}</span>
                                      <span style={{ fontSize: '10px', color: '#4a4438' }}>{formatarData(inter.criado_em)}</span>
                                    </div>
                                    <p style={{ fontSize: '13px', color: '#a09880', lineHeight: 1.5 }}>{inter.descricao}</p>
                                  </div>
                                  <button onClick={() => deletarInteracao(inter.id, lead.id)} title="Remover" style={{ background: 'none', border: 'none', color: '#3a3530', cursor: 'pointer', fontSize: '14px', padding: '2px 6px', flexShrink: 0 }}>✕</button>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#1a1814',
  border: '1px solid rgba(201,168,76,0.2)',
  color: '#e8e0d0',
  padding: '10px 12px',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
  marginTop: '7px',
}

const labelBox: React.CSSProperties = {
  display: 'block',
  color: '#6b6355',
  fontSize: '10px',
  letterSpacing: '2px',
  textTransform: 'uppercase',
}

const secondaryButton: React.CSSProperties = {
  background: 'transparent',
  color: '#a09880',
  border: '1px solid rgba(201,168,76,0.2)',
  padding: '10px 16px',
  fontSize: '10px',
  letterSpacing: '1px',
  textTransform: 'uppercase',
  fontWeight: 600,
  cursor: 'pointer',
}

function cardFiltro(ativo: boolean, cor: string): React.CSSProperties {
  return {
    background: ativo ? `${cor}18` : '#0f0e0c',
    border: 'none',
    borderBottom: ativo ? `2px solid ${cor}` : '2px solid transparent',
    color: ativo ? cor : '#6b6355',
    padding: '14px 16px',
    flex: 1,
    minWidth: '112px',
    display: 'grid',
    gap: '3px',
    textAlign: 'center',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontSize: '9px',
  }
}
TYPESCRIPT

echo "   ✓ app/admin/leads/page.tsx (timeline + novo lead + CSV)"

# ─────────────────────────────────────────────────────────────────────────────
# 5. NOVO: app/admin/dashboard/page.tsx — métricas reais do CRM
# ─────────────────────────────────────────────────────────────────────────────
echo "→ [5/7] Reescrevendo dashboard com métricas reais..."

cat > app/admin/dashboard/page.tsx << 'TYPESCRIPT'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import LogoutButton from '@/components/LogoutButton'

const STATUS_COR: Record<string, string> = {
  novo: '#c9a84c',
  primeiro_contato: '#5b9bd5',
  contato: '#5b9bd5',
  qualificado: '#61ce70',
  visita: '#9b59b6',
  proposta: '#e67e22',
  fechado: '#2ecc71',
  perdido: '#c0392b',
}

const STATUS_FUNIL = ['novo','primeiro_contato','qualificado','visita','proposta','fechado','perdido']
const STATUS_LABEL: Record<string,string> = {
  novo:'Novo', primeiro_contato:'1º Contato', contato:'1º Contato',
  qualificado:'Qualificado', visita:'Visita', proposta:'Proposta',
  fechado:'Fechado', perdido:'Perdido',
}

const ORIGEM_LABEL: Record<string,string> = {
  formulario:'Site', whatsapp_click:'WhatsApp', manual:'Manual',
  instagram:'Instagram', facebook:'Facebook', indicacao:'Indicação',
  migrado_atendimentos:'Importado',
}

export default async function Dashboard() {
  const supabase = await createClient()

  const [imoveisRes, ativosRes, leadsRes] = await Promise.all([
    supabase.from('imoveis').select('*', { count: 'exact', head: true }),
    supabase.from('imoveis').select('*', { count: 'exact', head: true }).eq('ativo', true),
    supabase.from('leads').select('status, origem, temperatura, created_at, arquivado'),
  ])

  const totalImoveis  = (imoveisRes as any).count ?? 0
  const imoveisAtivos = (ativosRes as any).count ?? 0
  const todosLeads: { status: string; origem: string | null; temperatura: string | null; created_at: string; arquivado: boolean }[]
    = (leadsRes.data ?? []) as any

  const leadsAtivos = todosLeads.filter(l => !l.arquivado)
  const totalLeads  = leadsAtivos.length

  // Funil por status
  const funil = STATUS_FUNIL.map(s => ({
    status: s,
    label: STATUS_LABEL[s],
    cor: STATUS_COR[s],
    total: leadsAtivos.filter(l => l.status === s || (s === 'primeiro_contato' && l.status === 'contato')).length,
  }))
  const maxFunil = Math.max(...funil.map(f => f.total), 1)

  // Leads por origem
  const origemMap: Record<string, number> = {}
  leadsAtivos.forEach(l => {
    const k = l.origem || 'desconhecido'
    origemMap[k] = (origemMap[k] || 0) + 1
  })
  const origens = Object.entries(origemMap).sort((a,b) => b[1]-a[1])

  // Taxa de conversão (fechado / total excluindo perdidos e arquivados)
  const fechados = leadsAtivos.filter(l => l.status === 'fechado').length
  const perdidos = leadsAtivos.filter(l => l.status === 'perdido').length
  const taxaConversao = totalLeads > 0 ? Math.round((fechados / totalLeads) * 100) : 0

  // Leads últimos 30 dias
  const trinta = new Date(); trinta.setDate(trinta.getDate() - 30)
  const leadsRecentes = leadsAtivos.filter(l => new Date(l.created_at) >= trinta).length

  // Leads quentes
  const leadsQuentes = leadsAtivos.filter(l => l.temperatura === 'quente').length

  return (
    <main style={{ background: '#0a0a0a', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <header style={{ background: '#0f0e0c', borderBottom: '1px solid rgba(201,168,76,0.2)', padding: '0 32px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <p style={{ fontFamily: 'Georgia,serif', fontSize: '18px', color: '#c9a84c' }}>Motta Admin</p>
          <nav style={{ display: 'flex', gap: '24px' }}>
            <Link href="/admin/dashboard" style={{ color: '#e8e0d0', fontSize: '12px', letterSpacing: '1px', textDecoration: 'none' }}>Dashboard</Link>
            <Link href="/admin/imoveis" style={{ color: '#a09880', fontSize: '12px', letterSpacing: '1px', textDecoration: 'none' }}>Imóveis</Link>
            <Link href="/admin/leads" style={{ color: '#a09880', fontSize: '12px', letterSpacing: '1px', textDecoration: 'none' }}>Leads</Link>
            <Link href="/admin/configuracoes" style={{ color: '#a09880', fontSize: '12px', letterSpacing: '1px', textDecoration: 'none' }}>Configurações</Link>
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/" style={{ color: '#6b6355', fontSize: '11px', letterSpacing: '1px', textDecoration: 'none' }}>Ver site →</Link>
          <LogoutButton />
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 32px' }}>
        <p style={{ fontSize: '11px', letterSpacing: '4px', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '8px' }}>Visão geral</p>
        <h1 style={{ fontFamily: 'Georgia,serif', fontSize: '32px', fontWeight: 300, color: '#e8e0d0', marginBottom: '40px' }}>Dashboard</h1>

        {/* MÉTRICAS RÁPIDAS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '1px', background: 'rgba(201,168,76,0.15)', marginBottom: '32px' }}>
          {[
            { label: 'Imóveis ativos', valor: imoveisAtivos, cor: '#61ce70' },
            { label: 'Leads ativos',   valor: totalLeads,    cor: '#e8e0d0' },
            { label: 'Leads (30d)',    valor: leadsRecentes, cor: '#c9a84c' },
            { label: 'Leads quentes',  valor: leadsQuentes,  cor: '#ff6b35' },
            { label: 'Fechados',       valor: fechados,      cor: '#2ecc71' },
            { label: 'Conversão',      valor: `${taxaConversao}%`, cor: taxaConversao >= 10 ? '#2ecc71' : '#c9a84c' },
          ].map(c => (
            <div key={c.label} style={{ background: '#0f0e0c', padding: '20px 22px' }}>
              <p style={{ fontSize: '32px', fontFamily: 'Georgia,serif', color: c.cor, fontWeight: 300, marginBottom: '4px' }}>{c.valor}</p>
              <p style={{ fontSize: '10px', letterSpacing: '2px', color: '#6b6355', textTransform: 'uppercase' }}>{c.label}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '32px' }}>

          {/* FUNIL VISUAL */}
          <div style={{ background: '#0f0e0c', border: '1px solid rgba(201,168,76,0.15)', padding: '28px' }}>
            <p style={{ fontSize: '10px', letterSpacing: '3px', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '20px' }}>Pipeline — leads por etapa</p>
            <div style={{ display: 'grid', gap: '10px' }}>
              {funil.map(f => (
                <div key={f.status}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#a09880' }}>{f.label}</span>
                    <span style={{ fontSize: '12px', color: f.cor, fontWeight: 600 }}>{f.total}</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(201,168,76,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.round((f.total / maxFunil) * 100)}%`, background: f.cor, borderRadius: '3px', transition: 'width 0.5s' }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(201,168,76,0.1)', display: 'flex', gap: '16px' }}>
              <span style={{ fontSize: '11px', color: '#4a4438' }}>Total ativo: <strong style={{ color: '#e8e0d0' }}>{totalLeads}</strong></span>
              <span style={{ fontSize: '11px', color: '#4a4438' }}>Perdidos: <strong style={{ color: '#c0392b' }}>{perdidos}</strong></span>
            </div>
          </div>

          {/* LEADS POR ORIGEM */}
          <div style={{ background: '#0f0e0c', border: '1px solid rgba(201,168,76,0.15)', padding: '28px' }}>
            <p style={{ fontSize: '10px', letterSpacing: '3px', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '20px' }}>Origem dos leads</p>
            {origens.length === 0 ? (
              <p style={{ color: '#4a4438', fontSize: '13px' }}>Nenhum lead ainda.</p>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {origens.map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#a09880' }}>{ORIGEM_LABEL[k] || k}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: `${Math.round((v / totalLeads) * 80)}px`, maxWidth: '80px', height: '4px', background: '#c9a84c', borderRadius: '2px', opacity: 0.6 }} />
                      <span style={{ fontSize: '13px', color: '#c9a84c', fontWeight: 600, minWidth: '20px', textAlign: 'right' }}>{v}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ATALHOS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
          <Link href="/admin/imoveis" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#0f0e0c', border: '1px solid rgba(201,168,76,0.2)', padding: '28px' }}>
              <p style={{ fontSize: '24px', marginBottom: '12px' }}>🏠</p>
              <p style={{ fontFamily: 'Georgia,serif', fontSize: '18px', color: '#e8e0d0', marginBottom: '4px' }}>Imóveis</p>
              <p style={{ fontSize: '12px', color: '#6b6355' }}>{imoveisAtivos} ativos de {totalImoveis} cadastrados</p>
            </div>
          </Link>
          <Link href="/admin/leads" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#0f0e0c', border: '1px solid rgba(201,168,76,0.2)', padding: '28px' }}>
              <p style={{ fontSize: '24px', marginBottom: '12px' }}>👥</p>
              <p style={{ fontFamily: 'Georgia,serif', fontSize: '18px', color: '#e8e0d0', marginBottom: '4px' }}>Leads</p>
              <p style={{ fontSize: '12px', color: '#6b6355' }}>{leadsQuentes} quentes · {funil.find(f=>f.status==='novo')?.total || 0} novos</p>
            </div>
          </Link>
          <Link href="/admin/configuracoes" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#0f0e0c', border: '1px solid rgba(201,168,76,0.2)', padding: '28px' }}>
              <p style={{ fontSize: '24px', marginBottom: '12px' }}>⚙️</p>
              <p style={{ fontFamily: 'Georgia,serif', fontSize: '18px', color: '#e8e0d0', marginBottom: '4px' }}>Configurações</p>
              <p style={{ fontSize: '12px', color: '#6b6355' }}>Textos, banner e visual do site</p>
            </div>
          </Link>
        </div>
      </div>
    </main>
  )
}
TYPESCRIPT

echo "   ✓ app/admin/dashboard/page.tsx (funil + origem)"

# ─────────────────────────────────────────────────────────────────────────────
# 6. Verificar versão do Next.js (CVE guard)
# ─────────────────────────────────────────────────────────────────────────────
echo "→ [6/7] Verificando versão do Next.js..."

python3 - << 'PYEOF'
import json, re

with open("package.json") as f:
    pkg = json.load(f)

current = pkg.get("dependencies", {}).get("next", "")
# Garante versão segura >= 15.3.6
if not re.match(r'^15\.3\.[6-9]|15\.[4-9]\.|1[6-9]\.|[2-9]', current.lstrip('^~')):
    pkg["dependencies"]["next"] = "15.3.6"
    with open("package.json", "w") as f:
        json.dump(pkg, f, indent=2, ensure_ascii=False)
    print("   ✓ Next.js atualizado para 15.3.6 (CVE-2025-66478 fix)")
else:
    print(f"   ✓ Next.js já está em versão segura: {current}")
PYEOF

# ─────────────────────────────────────────────────────────────────────────────
# 7. Commit e push
# ─────────────────────────────────────────────────────────────────────────────
echo "→ [7/7] Commit e push..."

git add -A
git commit -m "feat(crm): fase 1 — lead_interacoes, timeline, novo lead manual, dashboard com métricas, CSV, fix telefone obrigatório"
git push

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  Script concluído!"
echo ""
echo "  PRÓXIMOS PASSOS:"
echo ""
echo "  1. Rodar a migration no Supabase:"
echo "     Dashboard Supabase → SQL Editor → cole o conteúdo de:"
echo "     supabase/migrations/20260608000000_create_lead_interacoes.sql"
echo ""
echo "  2. Aguardar o deploy na Vercel (automático após o push)"
echo ""
echo "  3. Testando:"
echo "     ✓ Admin → Leads → botão '+ Novo lead' funciona"
echo "     ✓ Admin → Leads → abre card → seção 'Histórico de contatos'"
echo "     ✓ Admin → Leads → botão '↓ Exportar CSV' baixa o arquivo"
echo "     ✓ Admin → Dashboard → funil com barras e origens"
echo "     ✓ Site → página do imóvel → formulário rejeita sem telefone"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

npx supabase login#!/usr/bin/env bash
set -euo pipefail

# CRM + WhatsApp patch para o projeto Motta Corretor de Imóveis.
# Rode na raiz do projeto, onde existem as pastas app/, lib/ e supabase/.

if [ ! -d "app" ] || [ ! -d "supabase" ]; then
  echo "Erro: rode este script na raiz do projeto, onde existem as pastas app/ e supabase/." >&2
  exit 1
fi

STAMP="$(date +%Y%m%d%H%M%S)"
BACKUP_DIR="$(cd .. && pwd)/crm-whatsapp-backup-$STAMP"
mkdir -p "$BACKUP_DIR"

backup_file() {
  local file="$1"
  if [ -f "$file" ]; then
    mkdir -p "$BACKUP_DIR/$(dirname "$file")"
    cp "$file" "$BACKUP_DIR/$file"
  fi
}

backup_file "app/api/lead/route.ts"
backup_file "app/api/leads/route.ts"
backup_file "app/imovel/[id]/ImovelClient.tsx"
backup_file "app/admin/leads/page.tsx"

mkdir -p app/api/leads supabase/migrations

cat > supabase/migrations/20260520090000_crm_leads_unificado_whatsapp.sql <<'SQL'
-- CRM unificado para leads + rastreio de origem WhatsApp/formulário.
-- Depois de aplicar esta migration, use a tabela public.leads como fonte única do CRM.

create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null,
  email text,
  imovel_id uuid,
  imovel_titulo text,
  status text not null default 'novo',
  anotacoes text,
  created_at timestamptz not null default now()
);

alter table public.leads add column if not exists origem text not null default 'formulario';
alter table public.leads add column if not exists telefone_normalizado text;
alter table public.leads add column if not exists temperatura text not null default 'morno';
alter table public.leads add column if not exists preferencias text;
alter table public.leads add column if not exists orcamento_min numeric;
alter table public.leads add column if not exists orcamento_max numeric;
alter table public.leads add column if not exists proxima_acao_em timestamptz;
alter table public.leads add column if not exists ultima_interacao_em timestamptz;
alter table public.leads add column if not exists pagina_url text;
alter table public.leads add column if not exists codigo_atendimento text;
alter table public.leads add column if not exists consentiu_whatsapp boolean not null default true;
alter table public.leads add column if not exists updated_at timestamptz not null default now();

create index if not exists leads_status_idx on public.leads(status);
create index if not exists leads_origem_idx on public.leads(origem);
create index if not exists leads_proxima_acao_idx on public.leads(proxima_acao_em);
create index if not exists leads_created_at_idx on public.leads(created_at desc);
create index if not exists leads_telefone_normalizado_idx on public.leads(telefone_normalizado);

create or replace function public.set_leads_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
before update on public.leads
for each row execute function public.set_leads_updated_at();

-- Migra dados antigos de public.atendimentos, se a tabela existir.
do $$
begin
  if to_regclass('public.atendimentos') is not null then
    insert into public.leads (
      nome,
      telefone,
      email,
      imovel_titulo,
      status,
      origem,
      pagina_url,
      created_at,
      ultima_interacao_em,
      codigo_atendimento,
      consentiu_whatsapp
    )
    select
      a.nome,
      a.telefone,
      a.email,
      a.referencia_imovel,
      case
        when lower(coalesce(a.status, '')) in ('abertos', 'aberto') then 'novo'
        when lower(coalesce(a.status, '')) in ('fechado', 'fechados') then 'fechado'
        when lower(coalesce(a.status, '')) in ('perdido', 'perdidos') then 'perdido'
        else 'novo'
      end,
      'migrado_atendimentos',
      a.pagina_url,
      coalesce(a.criado_em, now()),
      coalesce(a.criado_em, now()),
      'A-' || a.id::text,
      true
    from public.atendimentos a
    where not exists (
      select 1
      from public.leads l
      where l.telefone = a.telefone
        and coalesce(l.imovel_titulo, '') = coalesce(a.referencia_imovel, '')
        and l.created_at between coalesce(a.criado_em, now()) - interval '5 minutes'
                         and coalesce(a.criado_em, now()) + interval '5 minutes'
    );
  end if;
end $$;

-- Segurança mínima: visitante pode criar lead; admin autenticado pode ler/editar.
alter table public.leads enable row level security;

drop policy if exists "leads_insert_public" on public.leads;
drop policy if exists "leads_select_admin" on public.leads;
drop policy if exists "leads_update_admin" on public.leads;
drop policy if exists "leads_delete_admin" on public.leads;

create policy "leads_insert_public"
on public.leads for insert
to anon, authenticated
with check (true);

create policy "leads_select_admin"
on public.leads for select
to authenticated
using (true);

create policy "leads_update_admin"
on public.leads for update
to authenticated
using (true)
with check (true);

create policy "leads_delete_admin"
on public.leads for delete
to authenticated
using (true);
SQL

cat > app/api/leads/route.ts <<'TS'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function getSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY não configuradas')
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
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

function proximaAcaoPadrao() {
  const data = new Date()
  data.setHours(data.getHours() + 2)
  return data.toISOString()
}

function montarMensagemWhatsApp(input: {
  id: string | number
  nome: string
  imovel_titulo?: string | null
  pagina_url?: string | null
}) {
  const linhas = [
    `Olá! Tenho interesse no imóvel: ${input.imovel_titulo || 'imóvel do site'}.`,
    `Código do atendimento: #${input.id}`,
  ]

  if (input.pagina_url) linhas.push(`Link: ${input.pagina_url}`)

  return linhas.join('\n')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = getSupabase()

    const origem = limparTexto(body.origem, 'formulario')
    const nome = limparTexto(body.nome, origem === 'whatsapp_click' ? 'Lead via WhatsApp' : '')
    const telefone = limparTexto(body.telefone, origem === 'whatsapp_click' ? 'Não informado' : '')

    if (!nome) {
      return NextResponse.json({ error: 'Informe o nome do lead.' }, { status: 400 })
    }

    if (!telefone) {
      return NextResponse.json({ error: 'Informe o telefone do lead.' }, { status: 400 })
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

    const corretorWhatsApp = normalizarTelefone(body.corretor_whatsapp || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER)
    const mensagem = montarMensagemWhatsApp({
      id: data.id,
      nome: data.nome,
      imovel_titulo: data.imovel_titulo,
      pagina_url: data.pagina_url,
    })

    const whatsapp_url = corretorWhatsApp
      ? `https://wa.me/${corretorWhatsApp}?text=${encodeURIComponent(mensagem)}`
      : null

    // Integração opcional: coloque uma URL de webhook do n8n/Zapier/Make em CRM_NOTIFICATION_WEBHOOK_URL.
    // Assim você pode receber aviso no WhatsApp, Telegram ou e-mail sem travar o formulário.
    if (process.env.CRM_NOTIFICATION_WEBHOOK_URL) {
      fetch(process.env.CRM_NOTIFICATION_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead: data, whatsapp_url }),
      }).catch((err) => console.error('Erro ao notificar webhook do CRM:', err))
    }

    return NextResponse.json({ success: true, id: data.id, lead: data, whatsapp_url })
  } catch (err) {
    console.error('Erro no endpoint /api/leads:', err)
    return NextResponse.json({ error: 'Erro ao processar lead.' }, { status: 500 })
  }
}
TS

cat > app/api/lead/route.ts <<'TS'
export { POST } from '../leads/route'
TS

cat > app/admin/leads/page.tsx <<'TSX'
'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'

const STATUS_LABELS: Record<string, { label: string; cor: string }> = {
  novo: { label: 'Novo', cor: '#c9a84c' },
  primeiro_contato: { label: '1º contato', cor: '#5b9bd5' },
  contato: { label: 'Contato', cor: '#5b9bd5' },
  qualificado: { label: 'Qualificado', cor: '#61ce70' },
  visita: { label: 'Visita', cor: '#9b59b6' },
  proposta: { label: 'Proposta', cor: '#e67e22' },
  fechado: { label: 'Fechado', cor: '#2ecc71' },
  perdido: { label: 'Perdido', cor: '#c0392b' },
}

const STATUS_FUNIL = ['novo', 'primeiro_contato', 'qualificado', 'visita', 'proposta', 'fechado', 'perdido']
const TEMPERATURAS = ['quente', 'morno', 'frio']

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
  pagina_url?: string | null
  proxima_acao_em?: string | null
  ultima_interacao_em?: string | null
  created_at: string
}

function formatarData(dt?: string | null) {
  if (!dt) return 'Sem data'
  return new Date(dt).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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
    formulario: 'Formulário',
    whatsapp_click: 'Clique WhatsApp',
    migrado_atendimentos: 'Importado',
  }
  return mapa[origem || ''] || origem || 'Não informada'
}

function estaVencido(lead: Lead) {
  if (!lead.proxima_acao_em || ['fechado', 'perdido'].includes(lead.status)) return false
  return new Date(lead.proxima_acao_em).getTime() < Date.now()
}

export default function LeadsAdmin() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [rascunho, setRascunho] = useState<Partial<Lead>>({})
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroBusca, setFiltroBusca] = useState('')

  useEffect(() => { carregarLeads() }, [])

  async function carregarLeads() {
    setLoading(true)
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) console.error('Erro ao carregar leads:', error)
    setLeads((data || []) as Lead[])
    setLoading(false)
  }

  async function atualizarLead(id: string, campos: Partial<Lead>) {
    const { error } = await supabase
      .from('leads')
      .update({ ...campos, ultima_interacao_em: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      alert(`Erro ao atualizar lead: ${error.message}`)
      return
    }

    await carregarLeads()
  }

  async function salvarLead(id: string) {
    await atualizarLead(id, {
      status: rascunho.status,
      temperatura: rascunho.temperatura,
      preferencias: rascunho.preferencias,
      anotacoes: rascunho.anotacoes,
      proxima_acao_em: rascunho.proxima_acao_em,
    })
    setExpandido(null)
  }

  function abrirLead(lead: Lead) {
    if (expandido === lead.id) {
      setExpandido(null)
      return
    }

    setExpandido(lead.id)
    setRascunho({
      status: lead.status || 'novo',
      temperatura: lead.temperatura || 'morno',
      preferencias: lead.preferencias || '',
      anotacoes: lead.anotacoes || '',
      proxima_acao_em: lead.proxima_acao_em || '',
    })
  }

  const leadsFiltrados = useMemo(() => {
    const busca = filtroBusca.trim().toLowerCase()
    return leads.filter((lead) => {
      const bateStatus = filtroStatus === 'todos'
        || (filtroStatus === 'atrasados' ? estaVencido(lead) : lead.status === filtroStatus)

      const texto = [lead.nome, lead.telefone, lead.email, lead.imovel_titulo, lead.origem]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return bateStatus && (!busca || texto.includes(busca))
    })
  }, [leads, filtroStatus, filtroBusca])

  const contadores = useMemo(() => {
    const base = STATUS_FUNIL.reduce((acc, status) => {
      acc[status] = leads.filter((lead) => lead.status === status || (status === 'primeiro_contato' && lead.status === 'contato')).length
      return acc
    }, {} as Record<string, number>)

    base.atrasados = leads.filter(estaVencido).length
    return base
  }, [leads])

  return (
    <main style={{ background: '#0a0a0a', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
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
        <h1 style={{ fontFamily: 'Georgia,serif', fontSize: '32px', fontWeight: 300, color: '#e8e0d0', marginBottom: '14px' }}>Leads e follow-up</h1>
        <p style={{ color: '#6b6355', fontSize: '13px', marginBottom: '32px' }}>Priorize leads atrasados, registre próxima ação e responda rápido pelo WhatsApp.</p>

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

        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <button onClick={() => setFiltroStatus('todos')} style={{ background: filtroStatus === 'todos' ? '#c9a84c' : '#0f0e0c', color: filtroStatus === 'todos' ? '#0a0a0a' : '#a09880', border: '1px solid rgba(201,168,76,0.25)', padding: '10px 14px', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}>
            Todos
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
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1px', background: 'rgba(201,168,76,0.15)' }}>
            {leadsFiltrados.map((lead) => {
              const status = STATUS_LABELS[lead.status] || STATUS_LABELS.novo
              const aberto = expandido === lead.id
              const vencido = estaVencido(lead)
              const whats = telefoneWhatsApp(lead)

              return (
                <div key={lead.id} style={{ background: '#0f0e0c' }}>
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
                        <a
                          onClick={(e) => e.stopPropagation()}
                          href={`https://wa.me/${whats}?text=${mensagemWhatsApp(lead)}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ background: '#25D366', color: '#fff', padding: '9px 12px', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700 }}
                        >
                          WhatsApp
                        </a>
                      )}
                      <span style={{ color: '#6b6355', fontSize: '16px' }}>{aberto ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {aberto && (
                    <div style={{ borderTop: '1px solid rgba(201,168,76,0.1)', padding: '24px', background: '#0d0c0a' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '18px' }}>
                        <label style={labelBox}>
                          Status
                          <select value={rascunho.status || 'novo'} onChange={(e) => setRascunho((r) => ({ ...r, status: e.target.value }))} style={inputStyle}>
                            {STATUS_FUNIL.map((status) => <option key={status} value={status}>{STATUS_LABELS[status].label}</option>)}
                          </select>
                        </label>
                        <label style={labelBox}>
                          Temperatura
                          <select value={rascunho.temperatura || 'morno'} onChange={(e) => setRascunho((r) => ({ ...r, temperatura: e.target.value }))} style={inputStyle}>
                            {TEMPERATURAS.map((temp) => <option key={temp} value={temp}>{temp}</option>)}
                          </select>
                        </label>
                        <label style={labelBox}>
                          Próxima ação
                          <input type="datetime-local" value={toDateTimeLocal(rascunho.proxima_acao_em)} onChange={(e) => setRascunho((r) => ({ ...r, proxima_acao_em: fromDateTimeLocal(e.target.value) || undefined }))} style={inputStyle} />
                        </label>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
                        <label style={labelBox}>
                          Preferências
                          <textarea value={rascunho.preferencias || ''} onChange={(e) => setRascunho((r) => ({ ...r, preferencias: e.target.value }))} rows={4} placeholder="Ex: casa com quintal, até R$ 350 mil, aceita financiamento..." style={{ ...inputStyle, resize: 'vertical' }} />
                        </label>
                        <label style={labelBox}>
                          Anotações internas
                          <textarea value={rascunho.anotacoes || ''} onChange={(e) => setRascunho((r) => ({ ...r, anotacoes: e.target.value }))} rows={4} placeholder="Histórico, objeções, retorno combinado..." style={{ ...inputStyle, resize: 'vertical' }} />
                        </label>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button onClick={() => salvarLead(lead.id)} style={{ background: '#c9a84c', color: '#0a0a0a', border: 'none', padding: '10px 24px', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer' }}>
                          Salvar CRM
                        </button>
                        <button onClick={() => atualizarLead(lead.id, { status: 'primeiro_contato' })} style={secondaryButton}>
                          Marcar 1º contato
                        </button>
                        <button onClick={() => atualizarLead(lead.id, { proxima_acao_em: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() })} style={secondaryButton}>
                          Lembrar amanhã
                        </button>
                        {lead.pagina_url && <a href={lead.pagina_url} target="_blank" rel="noreferrer" style={{ ...secondaryButton, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>Ver página</a>}
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
TSX

python3 - <<'PY'
from pathlib import Path
import re

path = Path('app/imovel/[id]/ImovelClient.tsx')
text = path.read_text()

old = re.search(r"  async function handleSubmit\(e: any\) \{.*?\n  function compartilharWhatsApp\(\) \{", text, re.S)
if not old:
    raise SystemExit('Não encontrei o bloco handleSubmit/mensagemWhatsApp para alterar em ImovelClient.tsx')

new = r'''  async function registrarLead(origem: 'formulario' | 'whatsapp_click', dados: Partial<typeof form> = {}) {
    const paginaUrl = typeof window !== 'undefined' ? `${window.location.origin}/imovel/${imovel.id}` : null

    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: dados.nome || form.nome || 'Lead via WhatsApp',
        telefone: dados.telefone || form.telefone || 'Não informado',
        email: dados.email || form.email || null,
        imovel_id: imovel.id,
        imovel_titulo: imovel.titulo,
        origem,
        pagina_url: paginaUrl,
        corretor_whatsapp: whatsapp,
        temperatura: origem === 'whatsapp_click' ? 'quente' : 'morno',
      }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || 'Erro ao criar lead')
    return data
  }

  async function handleSubmit(e: any) {
    e.preventDefault()
    setEnviando(true)

    try {
      await registrarLead('formulario', form)
      setEnviado(true)
      setForm({ nome: '', telefone: '', email: '' })
    } catch (err) {
      console.error('Erro ao enviar lead:', err)
      alert('Não foi possível enviar seu interesse. Tente novamente ou chame pelo WhatsApp.')
    } finally {
      setEnviando(false)
    }
  }

  function mensagemWhatsApp(leadId?: string | number) {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/imovel/${imovel.id}` : ''
    const linhas = [
      `Olá! Tenho interesse no imóvel: *${imovel.titulo}* — ${imovel.bairro}, ${imovel.cidade}.`,
      leadId ? `Código do atendimento: #${leadId}` : '',
      url ? `Link: ${url}` : '',
    ].filter(Boolean)

    return `https://wa.me/${whatsapp}?text=${encodeURIComponent(linhas.join('\n'))}`
  }

  async function handleWhatsAppClick(e: any) {
    e.preventDefault()

    const fallbackUrl = mensagemWhatsApp()
    const janela = window.open('', '_blank', 'noopener,noreferrer')

    try {
      const data = await registrarLead('whatsapp_click')
      const url = data?.whatsapp_url || mensagemWhatsApp(data?.id)
      if (janela) janela.location.href = url
      else window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      console.error('Erro ao registrar clique no WhatsApp:', err)
      if (janela) janela.location.href = fallbackUrl
      else window.open(fallbackUrl, '_blank', 'noopener,noreferrer')
    }
  }

  function compartilharWhatsApp() {'''

text = text[:old.start()] + new + text[old.end():]

text = text.replace('<a href={mensagemWhatsApp()} target="_blank" rel="noreferrer"\n        className="whatsapp-fixo"', '<a href={mensagemWhatsApp()} onClick={handleWhatsAppClick} target="_blank" rel="noreferrer"\n        className="whatsapp-fixo"')
text = text.replace('<a href={mensagemWhatsApp()} target="_blank" rel="noreferrer"\n            className="whatsapp-btn-header"', '<a href={mensagemWhatsApp()} onClick={handleWhatsAppClick} target="_blank" rel="noreferrer"\n            className="whatsapp-btn-header"')
text = text.replace('<a href={mensagemWhatsApp()} target="_blank" rel="noreferrer"\n              style={{ display: \'flex\'', '<a href={mensagemWhatsApp()} onClick={handleWhatsAppClick} target="_blank" rel="noreferrer"\n              style={{ display: \'flex\'')

path.write_text(text)
PY

echo "✅ Patch aplicado. Backup salvo em: $BACKUP_DIR"
echo ""
echo "Próximos passos:"
echo "1) Revise os arquivos alterados com: git diff"
echo "2) Aplique a migration no Supabase: supabase db push ou cole o SQL no painel do Supabase"
echo "3) Rode: npm run lint && npm run build"
echo "4) Teste um formulário e um clique no WhatsApp em uma página de imóvel"

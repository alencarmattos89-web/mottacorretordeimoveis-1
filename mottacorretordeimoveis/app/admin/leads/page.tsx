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
  arquivado?: boolean
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
  const [mostrarArquivados, setMostrarArquivados] = useState(false)
  const [filtroBusca, setFiltroBusca] = useState('')

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

  async function arquivarLead(id: string, arquivar: boolean) {
    const acao = arquivar ? 'arquivar' : 'desarquivar'
    if (!confirm(`Deseja ${acao} este lead?`)) return
    const { error } = await supabase
      .from('leads')
      .update({ arquivado: arquivar })
      .eq('id', id)
    if (error) {
      alert(`Erro ao ${acao}: ${error.message}`)
      return
    }
    await carregarLeads(mostrarArquivados)
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
          <button
            onClick={() => { setMostrarArquivados(!mostrarArquivados); setFiltroStatus('todos') }}
            style={{ background: mostrarArquivados ? 'rgba(192,57,43,0.15)' : '#0f0e0c', color: mostrarArquivados ? '#c0392b' : '#6b6355', border: `1px solid ${mostrarArquivados ? 'rgba(192,57,43,0.4)' : 'rgba(201,168,76,0.25)'}`, padding: '10px 14px', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            {mostrarArquivados ? '← Voltar aos ativos' : '📦 Arquivados'}
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
                        <button
                          onClick={() => arquivarLead(lead.id, !lead.arquivado)}
                          style={{ ...secondaryButton, color: lead.arquivado ? '#61ce70' : '#c0392b', borderColor: lead.arquivado ? 'rgba(97,206,112,0.3)' : 'rgba(192,57,43,0.3)' }}
                        >
                          {lead.arquivado ? '↩ Desarquivar' : '📦 Arquivar'}
                        </button>
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

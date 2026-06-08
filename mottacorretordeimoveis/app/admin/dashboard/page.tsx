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

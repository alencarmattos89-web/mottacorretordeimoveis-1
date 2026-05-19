'use client'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'


const STATUS_LABELS: Record<string, { label: string; cor: string }> = {
  novo:      { label: 'Novo',     cor: '#c9a84c' },
  contato:   { label: 'Contato',  cor: '#5b9bd5' },
  visita:    { label: 'Visita',   cor: '#9b59b6' },
  proposta:  { label: 'Proposta', cor: '#e67e22' },
  fechado:   { label: 'Fechado',  cor: '#61ce70' },
  perdido:   { label: 'Perdido',  cor: '#c0392b' },
}

export default function LeadsAdmin() {
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [anotacao, setAnotacao] = useState('')

  useEffect(() => { carregarLeads() }, [])

  async function carregarLeads() {
    const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
    setLeads(data || [])
    setLoading(false)
  }

  async function atualizarStatus(id: string, status: string) {
    await supabase.from('leads').update({ status }).eq('id', id)
    carregarLeads()
  }

  async function salvarAnotacao(id: string) {
    await supabase.from('leads').update({ anotacoes: anotacao }).eq('id', id)
    setExpandido(null)
    carregarLeads()
  }

  function abrirLead(lead: any) {
    if (expandido === lead.id) {
      setExpandido(null)
    } else {
      setExpandido(lead.id)
      setAnotacao(lead.anotacoes || '')
    }
  }

  function formatarData(dt: string) {
    return new Date(dt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const contadores = Object.keys(STATUS_LABELS).reduce((acc, s) => {
    acc[s] = leads.filter(l => l.status === s).length
    return acc
  }, {} as Record<string, number>)

  return (
    <main style={{background:'#0a0a0a',minHeight:'100vh',fontFamily:'system-ui,sans-serif'}}>
      <header style={{background:'#0f0e0c',borderBottom:'1px solid rgba(201,168,76,0.2)',padding:'0 32px',height:'64px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:'32px'}}>
          <p style={{fontFamily:'Georgia,serif',fontSize:'18px',color:'#c9a84c'}}>Motta Admin</p>
          <nav style={{display:'flex',gap:'24px'}}>
            <Link href="/admin/dashboard" style={{color:'#a09880',fontSize:'12px',letterSpacing:'1px',textDecoration:'none'}}>Dashboard</Link>
            <Link href="/admin/imoveis" style={{color:'#a09880',fontSize:'12px',letterSpacing:'1px',textDecoration:'none'}}>Imóveis</Link>
            <Link href="/admin/leads" style={{color:'#e8e0d0',fontSize:'12px',letterSpacing:'1px',textDecoration:'none'}}>Leads</Link>
            <Link href="/admin/configuracoes" style={{color:'#a09880',fontSize:'12px',letterSpacing:'1px',textDecoration:'none'}}>Configurações</Link>
          </nav>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'16px'}}><Link href="/" style={{color:'#6b6355',fontSize:'11px',letterSpacing:'1px',textDecoration:'none'}}>Ver site →</Link><LogoutButton /></div>
      </header>

      <div style={{maxWidth:'1000px',margin:'0 auto',padding:'48px 32px'}}>
        <p style={{fontSize:'11px',letterSpacing:'4px',color:'#c9a84c',textTransform:'uppercase',marginBottom:'8px'}}>CRM</p>
        <h1 style={{fontFamily:'Georgia,serif',fontSize:'32px',fontWeight:300,color:'#e8e0d0',marginBottom:'32px'}}>Leads</h1>

        <div style={{display:'flex',gap:'1px',background:'rgba(201,168,76,0.15)',marginBottom:'40px',flexWrap:'wrap'}}>
          {Object.entries(STATUS_LABELS).map(([status, { label, cor }]) => (
            <div key={status} style={{background:'#0f0e0c',padding:'16px 20px',flex:'1',minWidth:'80px',textAlign:'center'}}>
              <p style={{fontFamily:'Georgia,serif',fontSize:'28px',color:cor,fontWeight:300}}>{contadores[status] || 0}</p>
              <p style={{fontSize:'10px',letterSpacing:'1px',color:'#6b6355',textTransform:'uppercase'}}>{label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <p style={{color:'#6b6355'}}>Carregando...</p>
        ) : leads.length === 0 ? (
          <div style={{textAlign:'center',padding:'80px',color:'#4a4438'}}>
            <p style={{fontSize:'48px',marginBottom:'16px'}}>📋</p>
            <p style={{fontSize:'18px',color:'#6b6355'}}>Nenhum lead ainda.</p>
            <p style={{fontSize:'13px',color:'#4a4438',marginTop:'8px'}}>Os leads aparecem aqui quando alguém demonstra interesse em um imóvel.</p>
          </div>
        ) : (
          <div style={{display:'grid',gap:'1px',background:'rgba(201,168,76,0.15)'}}>
            {leads.map((lead) => {
              const { cor } = STATUS_LABELS[lead.status] || STATUS_LABELS.novo
              const aberto = expandido === lead.id
              return (
                <div key={lead.id} style={{background:'#0f0e0c'}}>
                  <div onClick={() => abrirLead(lead)} style={{padding:'20px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'16px',cursor:'pointer'}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'4px'}}>
                        <p style={{color:'#e8e0d0',fontSize:'15px',fontWeight:500}}>{lead.nome}</p>
                        <span style={{fontSize:'9px',padding:'2px 8px',letterSpacing:'1px',textTransform:'uppercase',color:cor,border:`1px solid ${cor}40`}}>
                          {STATUS_LABELS[lead.status]?.label || lead.status}
                        </span>
                      </div>
                      <p style={{color:'#6b6355',fontSize:'12px',letterSpacing:'0.5px'}}>
                        {lead.telefone}
                        {lead.imovel_titulo && <> · <span style={{color:'#8a7d6a'}}>{lead.imovel_titulo}</span></>}
                      </p>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'12px',flexShrink:0}}>
                      <p style={{color:'#4a4438',fontSize:'11px'}}>{formatarData(lead.created_at)}</p>
                      <span style={{color:'#6b6355',fontSize:'16px'}}>{aberto ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {aberto && (
                    <div style={{borderTop:'1px solid rgba(201,168,76,0.1)',padding:'24px',background:'#0d0c0a'}}>
                      <div style={{marginBottom:'20px'}}>
                        <p style={{fontSize:'10px',letterSpacing:'2px',color:'#6b6355',textTransform:'uppercase',marginBottom:'10px'}}>Status</p>
                        <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                          {Object.entries(STATUS_LABELS).map(([s, { label, cor: c }]) => (
                            <button key={s} onClick={() => atualizarStatus(lead.id, s)} style={{background:lead.status===s?`${c}20`:'transparent',border:`1px solid ${lead.status===s?c:'rgba(201,168,76,0.2)'}`,color:lead.status===s?c:'#6b6355',padding:'5px 12px',fontSize:'10px',letterSpacing:'1px',textTransform:'uppercase',cursor:'pointer'}}>
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{marginBottom:'16px'}}>
                        <p style={{fontSize:'10px',letterSpacing:'2px',color:'#6b6355',textTransform:'uppercase',marginBottom:'8px'}}>Anotações</p>
                        <textarea value={anotacao} onChange={e => setAnotacao(e.target.value)} rows={3} placeholder="Ex: cliente prefere imóvel com quintal, orçamento até R$ 300k..." style={{width:'100%',background:'#1a1814',border:'1px solid rgba(201,168,76,0.2)',color:'#e8e0d0',padding:'10px 14px',fontSize:'13px',outline:'none',resize:'vertical',boxSizing:'border-box',fontFamily:'system-ui'}} />
                      </div>

                      <div style={{display:'flex',gap:'10px'}}>
                        <button onClick={() => salvarAnotacao(lead.id)} style={{background:'#c9a84c',color:'#0a0a0a',border:'none',padding:'10px 24px',fontSize:'10px',letterSpacing:'2px',textTransform:'uppercase',fontWeight:600,cursor:'pointer'}}>
                          Salvar
                        </button>
                        <a href={`https://wa.me/55${lead.telefone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{background:'#25D366',color:'#fff',border:'none',padding:'10px 24px',fontSize:'10px',letterSpacing:'2px',textTransform:'uppercase',fontWeight:600,textDecoration:'none',display:'inline-flex',alignItems:'center'}}>
                          WhatsApp
                        </a>
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

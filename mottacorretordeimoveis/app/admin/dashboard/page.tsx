import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import LogoutButton from '@/components/LogoutButton'

export default async function Dashboard() {
  const supabase = await createClient()
  const results = await Promise.allSettled([
    supabase.from('imoveis').select('*', { count: 'exact', head: true }),
    supabase.from('imoveis').select('*', { count: 'exact', head: true }).eq('ativo', true),
    supabase.from('leads').select('status'),
  ])
  const totalImoveis = results[0].status === 'fulfilled' ? (results[0].value as any).count : 0
  const imoveisAtivos = results[1].status === 'fulfilled' ? (results[1].value as any).count : 0
  const leads: { status: string }[] = results[2].status === 'fulfilled' ? (results[2].value as any).data ?? [] : []
  const leadsNovos = (leads || []).filter(l => l.status === 'novo').length
  const totalLeads = (leads || []).length

  return (
    <main style={{background:'#0a0a0a',minHeight:'100vh',fontFamily:'system-ui,sans-serif'}}>
      <header style={{background:'#0f0e0c',borderBottom:'1px solid rgba(201,168,76,0.2)',padding:'0 32px',height:'64px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:'32px'}}>
          <p style={{fontFamily:'Georgia,serif',fontSize:'18px',color:'#c9a84c'}}>Motta Admin</p>
          <nav style={{display:'flex',gap:'24px'}}>
            <Link href="/admin/dashboard" style={{color:'#e8e0d0',fontSize:'12px',letterSpacing:'1px',textDecoration:'none'}}>Dashboard</Link>
            <Link href="/admin/imoveis" style={{color:'#a09880',fontSize:'12px',letterSpacing:'1px',textDecoration:'none'}}>Imóveis</Link>
            <Link href="/admin/leads" style={{color:'#a09880',fontSize:'12px',letterSpacing:'1px',textDecoration:'none'}}>Leads</Link>
            <Link href="/admin/configuracoes" style={{color:'#a09880',fontSize:'12px',letterSpacing:'1px',textDecoration:'none'}}>Configurações</Link>
          </nav>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
          <Link href="/" style={{color:'#6b6355',fontSize:'11px',letterSpacing:'1px',textDecoration:'none'}}>Ver site →</Link>
          <LogoutButton />
        </div>
      </header>
      <div style={{maxWidth:'1200px',margin:'0 auto',padding:'48px 32px'}}>
        <p style={{fontSize:'11px',letterSpacing:'4px',color:'#c9a84c',textTransform:'uppercase',marginBottom:'8px'}}>Visão geral</p>
        <h1 style={{fontFamily:'Georgia,serif',fontSize:'32px',fontWeight:300,color:'#e8e0d0',marginBottom:'40px'}}>Dashboard</h1>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1px',background:'rgba(201,168,76,0.15)',marginBottom:'32px'}}>
          {[
            { label:'Imóveis total',  valor: totalImoveis  ?? 0, cor:'#e8e0d0' },
            { label:'Imóveis ativos', valor: imoveisAtivos ?? 0, cor:'#61ce70' },
            { label:'Leads total',    valor: totalLeads,          cor:'#e8e0d0' },
            { label:'Leads novos',    valor: leadsNovos,          cor:'#c9a84c' },
          ].map(c => (
            <div key={c.label} style={{background:'#0f0e0c',padding:'24px 28px'}}>
              <p style={{fontSize:'36px',fontFamily:'Georgia,serif',color:c.cor,fontWeight:300,marginBottom:'4px'}}>{c.valor}</p>
              <p style={{fontSize:'11px',letterSpacing:'2px',color:'#6b6355',textTransform:'uppercase'}}>{c.label}</p>
            </div>
          ))}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px'}}>
          <Link href="/admin/imoveis" style={{textDecoration:'none'}}>
            <div style={{background:'#0f0e0c',border:'1px solid rgba(201,168,76,0.2)',padding:'32px'}}>
              <p style={{fontSize:'24px',marginBottom:'12px'}}>🏠</p>
              <p style={{fontFamily:'Georgia,serif',fontSize:'20px',color:'#e8e0d0',marginBottom:'8px'}}>Imóveis</p>
              <p style={{fontSize:'12px',color:'#6b6355'}}>Cadastrar, editar e remover imóveis</p>
            </div>
          </Link>
          <Link href="/admin/leads" style={{textDecoration:'none'}}>
            <div style={{background:'#0f0e0c',border:'1px solid rgba(201,168,76,0.2)',padding:'32px'}}>
              <p style={{fontSize:'24px',marginBottom:'12px'}}>👥</p>
              <p style={{fontFamily:'Georgia,serif',fontSize:'20px',color:'#e8e0d0',marginBottom:'8px'}}>Leads</p>
              <p style={{fontSize:'12px',color:'#6b6355'}}>Clientes interessados nos imóveis</p>
            </div>
          </Link>
          <Link href="/admin/configuracoes" style={{textDecoration:'none'}}>
            <div style={{background:'#0f0e0c',border:'1px solid rgba(201,168,76,0.2)',padding:'32px'}}>
              <p style={{fontSize:'24px',marginBottom:'12px'}}>⚙️</p>
              <p style={{fontFamily:'Georgia,serif',fontSize:'20px',color:'#e8e0d0',marginBottom:'8px'}}>Configurações</p>
              <p style={{fontSize:'12px',color:'#6b6355'}}>Editar textos, banner e visual do site</p>
            </div>
          </Link>
        </div>
      </div>
    </main>
  )
}

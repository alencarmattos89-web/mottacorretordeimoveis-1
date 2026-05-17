import Link from 'next/link'

export default async function Dashboard() {
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
        <Link href="/" style={{color:'#6b6355',fontSize:'11px',letterSpacing:'1px',textDecoration:'none'}}>Ver site →</Link>
      </header>
      <div style={{maxWidth:'1200px',margin:'0 auto',padding:'48px 32px'}}>
        <p style={{fontSize:'11px',letterSpacing:'4px',color:'#c9a84c',textTransform:'uppercase',marginBottom:'8px'}}>Visão geral</p>
        <h1 style={{fontFamily:'Georgia,serif',fontSize:'32px',fontWeight:300,color:'#e8e0d0',marginBottom:'40px'}}>Dashboard</h1>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px'}}>
          <Link href="/admin/imoveis" style={{textDecoration:'none'}}>
            <div style={{background:'#0f0e0c',border:'1px solid rgba(201,168,76,0.2)',padding:'32px',cursor:'pointer'}}>
              <p style={{fontSize:'24px',marginBottom:'12px'}}>🏠</p>
              <p style={{fontFamily:'Georgia,serif',fontSize:'20px',color:'#e8e0d0',marginBottom:'8px'}}>Imóveis</p>
              <p style={{fontSize:'12px',color:'#6b6355'}}>Cadastrar, editar e remover imóveis</p>
            </div>
          </Link>
          <Link href="/admin/leads" style={{textDecoration:'none'}}>
            <div style={{background:'#0f0e0c',border:'1px solid rgba(201,168,76,0.2)',padding:'32px',cursor:'pointer'}}>
              <p style={{fontSize:'24px',marginBottom:'12px'}}>👥</p>
              <p style={{fontFamily:'Georgia,serif',fontSize:'20px',color:'#e8e0d0',marginBottom:'8px'}}>Leads</p>
              <p style={{fontSize:'12px',color:'#6b6355'}}>Clientes interessados nos imóveis</p>
            </div>
          </Link>
          <Link href="/admin/configuracoes" style={{textDecoration:'none'}}>
            <div style={{background:'#0f0e0c',border:'1px solid rgba(201,168,76,0.2)',padding:'32px',cursor:'pointer'}}>
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

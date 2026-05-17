'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ImoveisAdmin() {
  const [imoveis, setImoveis] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { carregarImoveis() }, [])

  async function carregarImoveis() {
    const { data } = await supabase.from('imoveis').select('*').order('created_at', { ascending: false })
    setImoveis(data || [])
    setLoading(false)
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    await supabase.from('imoveis').update({ ativo: !ativo }).eq('id', id)
    carregarImoveis()
  }

  async function toggleDestaque(id: string, destaque: boolean) {
    await supabase.from('imoveis').update({ destaque: !destaque }).eq('id', id)
    carregarImoveis()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este imóvel?')) return
    await supabase.from('imoveis').delete().eq('id', id)
    carregarImoveis()
  }

  return (
    <main style={{background:'#0a0a0a',minHeight:'100vh',fontFamily:'system-ui,sans-serif'}}>
      <header style={{background:'#0f0e0c',borderBottom:'1px solid rgba(201,168,76,0.2)',padding:'0 32px',height:'64px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:'32px'}}>
          <p style={{fontFamily:'Georgia,serif',fontSize:'18px',color:'#c9a84c'}}>Motta Admin</p>
          <nav style={{display:'flex',gap:'24px'}}>
            <Link href="/admin/dashboard" style={{color:'#a09880',fontSize:'12px',letterSpacing:'1px',textDecoration:'none'}}>Dashboard</Link>
            <Link href="/admin/imoveis" style={{color:'#e8e0d0',fontSize:'12px',letterSpacing:'1px',textDecoration:'none'}}>Imóveis</Link>
            <Link href="/admin/leads" style={{color:'#a09880',fontSize:'12px',letterSpacing:'1px',textDecoration:'none'}}>Leads</Link>
          </nav>
        </div>
        <Link href="/" style={{color:'#6b6355',fontSize:'11px',letterSpacing:'1px',textDecoration:'none'}}>Ver site →</Link>
      </header>

      <div style={{maxWidth:'1200px',margin:'0 auto',padding:'48px 32px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'40px'}}>
          <div>
            <p style={{fontSize:'11px',letterSpacing:'4px',color:'#c9a84c',textTransform:'uppercase',marginBottom:'8px'}}>Portfólio</p>
            <h1 style={{fontFamily:'Georgia,serif',fontSize:'32px',fontWeight:300,color:'#e8e0d0'}}>Imóveis</h1>
          </div>
          <Link href="/admin/imoveis/novo" style={{background:'#c9a84c',color:'#0a0a0a',padding:'12px 24px',fontSize:'11px',letterSpacing:'2px',textTransform:'uppercase',fontWeight:600,textDecoration:'none'}}>
            + Novo Imóvel
          </Link>
        </div>

        {loading ? (
          <p style={{color:'#6b6355'}}>Carregando...</p>
        ) : imoveis.length === 0 ? (
          <div style={{textAlign:'center',padding:'80px',color:'#4a4438'}}>
            <p style={{fontSize:'48px',marginBottom:'16px'}}>🏠</p>
            <p style={{fontSize:'18px',color:'#6b6355',marginBottom:'24px'}}>Nenhum imóvel cadastrado.</p>
            <Link href="/admin/imoveis/novo" style={{background:'#c9a84c',color:'#0a0a0a',padding:'12px 24px',fontSize:'11px',letterSpacing:'2px',textTransform:'uppercase',fontWeight:600,textDecoration:'none'}}>
              Cadastrar primeiro imóvel
            </Link>
          </div>
        ) : (
          <div style={{display:'grid',gap:'1px',background:'rgba(201,168,76,0.15)'}}>
            {imoveis.map((imovel) => (
              <div key={imovel.id} style={{background:'#0f0e0c',padding:'20px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'16px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'16px',flex:1}}>
                  <div style={{width:'60px',height:'60px',background:'#1a1814',flexShrink:0,overflow:'hidden'}}>
                    {imovel.fotos?.[0] && <img src={imovel.fotos[0]} style={{width:'100%',height:'100%',objectFit:'cover'}} />}
                  </div>
                  <div>
                    <p style={{color:'#e8e0d0',fontSize:'15px',fontWeight:500,marginBottom:'4px'}}>{imovel.titulo}</p>
                    <p style={{color:'#6b6355',fontSize:'12px'}}>{imovel.bairro} · {imovel.cidade} · R$ {Number(imovel.preco).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'8px',flexShrink:0}}>
                  <span style={{fontSize:'10px',padding:'3px 8px',letterSpacing:'1px',textTransform:'uppercase',background:imovel.tipo==='venda'?'rgba(201,168,76,0.2)':'rgba(201,168,76,0.1)',color:'#c9a84c',border:'1px solid rgba(201,168,76,0.3)'}}>
                    {imovel.tipo}
                  </span>
                  <button onClick={() => toggleDestaque(imovel.id, imovel.destaque)} style={{background:'transparent',border:'1px solid rgba(201,168,76,0.3)',color:imovel.destaque?'#c9a84c':'#4a4438',padding:'4px 10px',fontSize:'10px',letterSpacing:'1px',cursor:'pointer'}}>
                    {imovel.destaque ? '★ Destaque' : '☆ Destaque'}
                  </button>
                  <button onClick={() => toggleAtivo(imovel.id, imovel.ativo)} style={{background:'transparent',border:'1px solid rgba(201,168,76,0.3)',color:imovel.ativo?'#61ce70':'#c0392b',padding:'4px 10px',fontSize:'10px',letterSpacing:'1px',cursor:'pointer'}}>
                    {imovel.ativo ? 'Ativo' : 'Inativo'}
                  </button>
                  <Link href={'/admin/imoveis/'+imovel.id} style={{background:'transparent',border:'1px solid rgba(201,168,76,0.3)',color:'#a09880',padding:'4px 10px',fontSize:'10px',letterSpacing:'1px',textDecoration:'none'}}>
                    Editar
                  </Link>
                  <button onClick={() => excluir(imovel.id)} style={{background:'transparent',border:'1px solid rgba(192,57,43,0.3)',color:'#c0392b',padding:'4px 10px',fontSize:'10px',letterSpacing:'1px',cursor:'pointer'}}>
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

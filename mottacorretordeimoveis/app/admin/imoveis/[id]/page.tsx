'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function EditarImovel() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [novasFotos, setNovasFotos] = useState<File[]>([])
  const [fotosExistentes, setFotosExistentes] = useState<string[]>([])
  const [form, setForm] = useState({
    titulo: '', tipo: 'venda', categoria: 'casa',
    preco: '', area: '', quartos: '', banheiros: '', vagas: '',
    endereco: '', bairro: '', cidade: 'Cruz Alta', descricao: '',
    destaque: false, ativo: true, mostrar_preco: true
  })

  useEffect(() => { carregarImovel() }, [id])

  async function carregarImovel() {
    const { data } = await supabase.from('imoveis').select('*').eq('id', id).single()
    if (data) {
      setForm({
        titulo: data.titulo || '',
        tipo: data.tipo || 'venda',
        categoria: data.categoria || 'casa',
        preco: data.preco || '',
        area: data.area || '',
        quartos: data.quartos || '',
        banheiros: data.banheiros || '',
        vagas: data.vagas || '',
        endereco: data.endereco || '',
        bairro: data.bairro || '',
        cidade: data.cidade || 'Cruz Alta',
        descricao: data.descricao || '',
        destaque: data.destaque || false,
        ativo: data.ativo !== false,
        mostrar_preco: data.mostrar_preco !== false
      })
      setFotosExistentes(data.fotos || [])
    }
    setLoading(false)
  }

  function handleChange(e: any) {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  function moverFoto(index: number, direcao: 'esquerda' | 'direita') {
    const novas = [...fotosExistentes]
    const alvo = direcao === 'esquerda' ? index - 1 : index + 1
    if (alvo < 0 || alvo >= novas.length) return;
    [novas[index], novas[alvo]] = [novas[alvo], novas[index]]
    setFotosExistentes(novas)
  }

  function removerFoto(index: number) {
    if (!confirm('Remover esta foto?')) return
    setFotosExistentes(f => f.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: any) {
    e.preventDefault()
    setSalvando(true)
    try {
      const urlsFotos = [...fotosExistentes]
      for (const foto of novasFotos) {
        const nome = `${Date.now()}-${foto.name.replace(/\s/g, '-')}`
        const { data, error } = await supabase.storage.from('fotos-imoveis').upload(nome, foto, { cacheControl: '3600', upsert: false })
        if (!error && data) {
          const { data: urlData } = supabase.storage.from('fotos-imoveis').getPublicUrl(data.path)
          urlsFotos.push(urlData.publicUrl)
        }
      }
      await supabase.from('imoveis').update({
        ...form,
        preco: Number(form.preco),
        area: Number(form.area) || null,
        quartos: Number(form.quartos) || null,
        banheiros: Number(form.banheiros) || null,
        vagas: Number(form.vagas) || 0,
        fotos: urlsFotos
      }).eq('id', id)
      router.push('/admin/imoveis')
    } catch {
      alert('Erro ao salvar.')
      setSalvando(false)
    }
  }

  const inp = {width:'100%',background:'#1a1814',border:'1px solid rgba(201,168,76,0.2)',color:'#e8e0d0',padding:'10px 14px',fontSize:'14px',outline:'none',boxSizing:'border-box' as const}
  const lbl = {display:'block' as const,fontSize:'11px',letterSpacing:'2px',color:'#6b6355',textTransform:'uppercase' as const,marginBottom:'6px'}

  if (loading) return <main style={{background:'#0a0a0a',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}><p style={{color:'#6b6355'}}>Carregando...</p></main>

  return (
    <main style={{background:'#0a0a0a',minHeight:'100vh',fontFamily:'system-ui,sans-serif'}}>
      <header style={{background:'#0f0e0c',borderBottom:'1px solid rgba(201,168,76,0.2)',padding:'0 32px',height:'64px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:'32px'}}>
          <p style={{fontFamily:'Georgia,serif',fontSize:'18px',color:'#c9a84c'}}>Motta Admin</p>
          <nav style={{display:'flex',gap:'24px'}}>
            <Link href="/admin/dashboard" style={{color:'#a09880',fontSize:'12px',textDecoration:'none'}}>Dashboard</Link>
            <Link href="/admin/imoveis" style={{color:'#e8e0d0',fontSize:'12px',textDecoration:'none'}}>Imóveis</Link>
            <Link href="/admin/leads" style={{color:'#a09880',fontSize:'12px',textDecoration:'none'}}>Leads</Link>
          </nav>
        </div>
      </header>

      <div style={{maxWidth:'800px',margin:'0 auto',padding:'48px 32px'}}>
        <p style={{fontSize:'11px',letterSpacing:'4px',color:'#c9a84c',textTransform:'uppercase',marginBottom:'8px'}}>Editar</p>
        <h1 style={{fontFamily:'Georgia,serif',fontSize:'32px',fontWeight:300,color:'#e8e0d0',marginBottom:'40px'}}>{form.titulo}</h1>

        <form onSubmit={handleSubmit}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px',marginBottom:'20px'}}>

            <div style={{gridColumn:'1/-1'}}>
              <label style={lbl}>Título</label>
              <input name="titulo" value={form.titulo} onChange={handleChange} required style={inp} />
            </div>
            <div>
              <label style={lbl}>Tipo</label>
              <select name="tipo" value={form.tipo} onChange={handleChange} style={inp}>
                <option value="venda">Venda</option>
                <option value="aluguel">Aluguel</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Categoria</label>
              <select name="categoria" value={form.categoria} onChange={handleChange} style={inp}>
                <option value="casa">Casa</option>
                <option value="apartamento">Apartamento</option>
                <option value="terreno">Terreno</option>
                <option value="comercial">Comercial</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Preço (R$)</label>
              <input name="preco" value={form.preco} onChange={handleChange} type="number" style={inp} />
            </div>
            <div>
              <label style={lbl}>Exibir preço?</label>
              <select name="mostrar_preco" value={form.mostrar_preco ? 'sim' : 'nao'} onChange={e => setForm(f => ({...f, mostrar_preco: e.target.value === 'sim'}))} style={inp}>
                <option value="sim">Mostrar valor</option>
                <option value="nao">Sob consulta</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Área (m²)</label>
              <input name="area" value={form.area} onChange={handleChange} type="number" style={inp} />
            </div>
            <div>
              <label style={lbl}>Quartos</label>
              <input name="quartos" value={form.quartos} onChange={handleChange} type="number" style={inp} />
            </div>
            <div>
              <label style={lbl}>Banheiros</label>
              <input name="banheiros" value={form.banheiros} onChange={handleChange} type="number" style={inp} />
            </div>
            <div>
              <label style={lbl}>Vagas</label>
              <input name="vagas" value={form.vagas} onChange={handleChange} type="number" style={inp} />
            </div>
            <div>
              <label style={lbl}>Bairro</label>
              <input name="bairro" value={form.bairro} onChange={handleChange} style={inp} />
            </div>
            <div>
              <label style={lbl}>Cidade</label>
              <input name="cidade" value={form.cidade} onChange={handleChange} style={inp} />
            </div>
            <div style={{gridColumn:'1/-1'}}>
              <label style={lbl}>Endereço</label>
              <input name="endereco" value={form.endereco} onChange={handleChange} style={inp} />
            </div>
            <div style={{gridColumn:'1/-1'}}>
              <label style={lbl}>Descrição</label>
              <textarea name="descricao" value={form.descricao} onChange={handleChange} rows={4} style={{...inp,resize:'vertical'}} />
            </div>

            {/* Fotos existentes */}
            {fotosExistentes.length > 0 && (
              <div style={{gridColumn:'1/-1'}}>
                <label style={lbl}>Fotos — arraste para reordenar · primeira = capa</label>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:'8px',marginTop:'8px'}}>
                  {fotosExistentes.map((url, i) => (
                    <div key={url} style={{position:'relative',border: i===0 ? '2px solid #c9a84c' : '1px solid rgba(201,168,76,0.2)',borderRadius:'2px',overflow:'hidden'}}>
                      {i === 0 && <span style={{position:'absolute',top:'4px',left:'4px',background:'#c9a84c',color:'#0a0a0a',fontSize:'9px',padding:'2px 6px',letterSpacing:'1px',fontWeight:600}}>CAPA</span>}
                      <img src={url} style={{width:'100%',height:'100px',objectFit:'cover',display:'block'}} />
                      <div style={{display:'flex',justifyContent:'space-between',background:'#1a1814',padding:'4px'}}>
                        <button type="button" onClick={() => moverFoto(i,'esquerda')} disabled={i===0} style={{background:'transparent',border:'none',color:i===0?'#3a3528':'#a09880',cursor:'pointer',fontSize:'14px',padding:'2px 6px'}}>←</button>
                        <button type="button" onClick={() => removerFoto(i)} style={{background:'transparent',border:'none',color:'#c0392b',cursor:'pointer',fontSize:'11px',padding:'2px 6px'}}>✕</button>
                        <button type="button" onClick={() => moverFoto(i,'direita')} disabled={i===fotosExistentes.length-1} style={{background:'transparent',border:'none',color:i===fotosExistentes.length-1?'#3a3528':'#a09880',cursor:'pointer',fontSize:'14px',padding:'2px 6px'}}>→</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Adicionar novas fotos */}
            <div style={{gridColumn:'1/-1'}}>
              <label style={lbl}>Adicionar novas fotos</label>
              <input type="file" multiple accept="image/*" onChange={e => setNovasFotos(Array.from(e.target.files || []))} style={{...inp,padding:'8px'}} />
              {novasFotos.length > 0 && <p style={{color:'#6b6355',fontSize:'12px',marginTop:'6px'}}>{novasFotos.length} nova(s) foto(s) selecionada(s)</p>}
            </div>

            <div style={{gridColumn:'1/-1',display:'flex',gap:'24px'}}>
              <label style={{display:'flex',alignItems:'center',gap:'8px',color:'#a09880',fontSize:'13px',cursor:'pointer'}}>
                <input type="checkbox" name="destaque" checked={form.destaque} onChange={handleChange} />
                Destaque
              </label>
              <label style={{display:'flex',alignItems:'center',gap:'8px',color:'#a09880',fontSize:'13px',cursor:'pointer'}}>
                <input type="checkbox" name="ativo" checked={form.ativo} onChange={handleChange} />
                Ativo (visível no site)
              </label>
            </div>
          </div>

          <div style={{display:'flex',gap:'16px',marginTop:'32px'}}>
            <button type="submit" disabled={salvando} style={{background:'#c9a84c',color:'#0a0a0a',border:'none',padding:'14px 32px',fontSize:'12px',letterSpacing:'3px',textTransform:'uppercase',fontWeight:600,cursor:'pointer'}}>
              {salvando ? 'Salvando...' : 'Salvar alterações'}
            </button>
            <Link href="/admin/imoveis" style={{background:'transparent',border:'1px solid rgba(201,168,76,0.3)',color:'#a09880',padding:'14px 32px',fontSize:'12px',letterSpacing:'2px',textTransform:'uppercase',textDecoration:'none'}}>
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </main>
  )
}

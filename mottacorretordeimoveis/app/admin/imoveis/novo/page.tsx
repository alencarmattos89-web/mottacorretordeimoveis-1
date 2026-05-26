'use client'
import { supabase } from '@/lib/supabase-browser'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'

function formatarPreco(valor: string) {
  const numeros = valor.replace(/\D/g, '')
  if (!numeros) return ''
  return Number(numeros).toLocaleString('pt-BR')
}

function desformatarPreco(valor: string) {
  return valor.replace(/\D/g, '')
}

/** Busca o próximo código sequencial no formato "01", "02", ... */
async function proximoCodigo(): Promise<string> {
  const { data, error } = await supabase
    .from('imoveis')
    .select('dados_administrativos')
    .not('dados_administrativos', 'is', null)

  if (error || !data) return '01'

  // Extrai todos os códigos numéricos existentes
  const codigos = data
    .map((row: any) => {
      const cod = row.dados_administrativos?.codigo_imovel
      if (!cod) return 0
      const num = parseInt(String(cod).replace(/\D/g, ''), 10)
      return isNaN(num) ? 0 : num
    })
    .filter((n: number) => n > 0)

  const maximo = codigos.length > 0 ? Math.max(...codigos) : 0
  const proximo = maximo + 1
  return String(proximo).padStart(2, '0')
}

export default function NovoImovel() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fotos, setFotos] = useState<File[]>([])
  const [precoDisplay, setPrecoDisplay] = useState('')
  const [codigoGerado, setCodigoGerado] = useState<string>('...')
  const [form, setForm] = useState({
    titulo: '', tipo: 'venda', categoria: 'casa',
    preco: '', area: '', quartos: '', banheiros: '', vagas: '',
    endereco: '', bairro: '', cidade: 'Panambi', descricao: '',
    destaque: false, ativo: true, mostrar_preco: true,
  })

  // Carrega o próximo código ao montar a página
  useEffect(() => {
    proximoCodigo().then(setCodigoGerado)
  }, [])

  function handleChange(e: any) {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  function handlePreco(e: any) {
    const raw = desformatarPreco(e.target.value)
    setPrecoDisplay(formatarPreco(raw))
    setForm(f => ({ ...f, preco: raw }))
  }

  async function handleFotos(e: any) {
    const arquivos: File[] = Array.from(e.target.files)
    const invalidos = arquivos.filter((f: File) => f.size > 10 * 1024 * 1024)
    if (invalidos.length) alert(`${invalidos.length} foto(s) ignoradas: excedem 10MB.`)
    setFotos(arquivos.filter((f: File) => f.size <= 10 * 1024 * 1024))
  }

  async function handleSubmit(e: any) {
    e.preventDefault()
    setLoading(true)
    try {
      // Re-gera o código na hora do submit (evita race condition se duas abas estiverem abertas)
      const codigo = await proximoCodigo()

      const urlsFotos: string[] = []
      for (const foto of fotos) {
        const nomeArquivo = `${Date.now()}-${foto.name.replace(/\s/g, '-')}`
        const { data, error } = await supabase.storage.from('fotos-imoveis').upload(nomeArquivo, foto, { cacheControl: '3600', upsert: false })
        if (!error && data) {
          const { data: urlData } = supabase.storage.from('fotos-imoveis').getPublicUrl(data.path)
          urlsFotos.push(urlData.publicUrl)
        }
      }

      const { error } = await supabase.from('imoveis').insert({
        ...form,
        preco: Number(form.preco),
        area: Number(form.area) || null,
        quartos: Number(form.quartos) || null,
        banheiros: Number(form.banheiros) || null,
        vagas: Number(form.vagas) || 0,
        fotos: urlsFotos,
        mostrar_preco: form.mostrar_preco,
        dados_administrativos: {
          codigo_imovel: codigo,
        },
      })

      if (error) throw error
      router.push('/admin/imoveis')
    } catch (err: any) {
      alert('Erro ao salvar: ' + (err?.message || JSON.stringify(err)))
      setLoading(false)
    }
  }

  const input = { width: '100%', background: '#1a1814', border: '1px solid rgba(201,168,76,0.2)', color: '#e8e0d0', padding: '10px 14px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const }
  const label = { display: 'block' as const, fontSize: '11px', letterSpacing: '2px', color: '#6b6355', textTransform: 'uppercase' as const, marginBottom: '6px' }

  return (
    <main style={{ background: '#0a0a0a', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <header style={{ background: '#0f0e0c', borderBottom: '1px solid rgba(201,168,76,0.2)', padding: '0 32px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <p style={{ fontFamily: 'Georgia,serif', fontSize: '18px', color: '#c9a84c' }}>Motta Admin</p>
          <nav style={{ display: 'flex', gap: '24px' }}>
            <Link href="/admin/dashboard" style={{ color: '#a09880', fontSize: '12px', letterSpacing: '1px', textDecoration: 'none' }}>Dashboard</Link>
            <Link href="/admin/imoveis" style={{ color: '#e8e0d0', fontSize: '12px', letterSpacing: '1px', textDecoration: 'none' }}>Imóveis</Link>
            <Link href="/admin/leads" style={{ color: '#a09880', fontSize: '12px', letterSpacing: '1px', textDecoration: 'none' }}>Leads</Link>
            <Link href="/admin/configuracoes" style={{ color: '#a09880', fontSize: '12px', letterSpacing: '1px', textDecoration: 'none' }}>Configurações</Link>
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/" style={{ color: '#6b6355', fontSize: '11px', letterSpacing: '1px', textDecoration: 'none' }}>Ver site →</Link>
          <LogoutButton />
        </div>
      </header>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 32px' }}>
        <p style={{ fontSize: '11px', letterSpacing: '4px', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '8px' }}>Novo</p>
        <h1 style={{ fontFamily: 'Georgia,serif', fontSize: '32px', fontWeight: 300, color: '#e8e0d0', marginBottom: '40px' }}>Cadastrar Imóvel</h1>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

            {/* Código automático — somente leitura */}
            <div>
              <label style={label}>Código do imóvel</label>
              <div style={{
                ...input,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: '#141210',
                border: '1px solid rgba(201,168,76,0.12)',
                color: '#c9a84c',
                fontFamily: 'monospace',
                fontSize: '18px',
                letterSpacing: '3px',
                cursor: 'default',
                userSelect: 'none',
              }}>
                <span style={{ opacity: 0.4, fontSize: '12px' }}>🔒</span>
                {codigoGerado === '...' ? (
                  <span style={{ opacity: 0.4, fontSize: '12px' }}>gerando...</span>
                ) : (
                  <span>#{codigoGerado}</span>
                )}
              </div>
              <p style={{ fontSize: '10px', color: '#4a4438', marginTop: '5px', letterSpacing: '0.5px' }}>
                Gerado automaticamente · não editável
              </p>
            </div>

            {/* Tipo */}
            <div>
              <label style={label}>Tipo</label>
              <select name="tipo" value={form.tipo} onChange={handleChange} style={input}>
                <option value="venda">Venda</option>
                <option value="aluguel">Aluguel</option>
              </select>
            </div>

            {/* Título */}
            <div style={{ gridColumn: '1/-1' }}>
              <label style={label}>Título do imóvel</label>
              <input name="titulo" value={form.titulo} onChange={handleChange} required style={input} placeholder="Ex: Casa com piscina no Centro" />
            </div>

            {/* Categoria */}
            <div>
              <label style={label}>Categoria</label>
              <select name="categoria" value={form.categoria} onChange={handleChange} style={input}>
                <option value="casa">Casa</option>
                <option value="apartamento">Apartamento</option>
                <option value="terreno">Terreno</option>
                <option value="comercial">Comercial</option>
                <option value="rural">Rural</option>
                <option value="galpao">Galpão</option>
                <option value="sala-comercial">Sala comercial</option>
              </select>
            </div>

            {/* Preço */}
            <div>
              <label style={label}>Preço (R$)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6b6355', fontSize: '14px' }}>R$</span>
                <input value={precoDisplay} onChange={handlePreco} required style={{ ...input, paddingLeft: '36px' }} placeholder="450.000" />
              </div>
              {precoDisplay && <p style={{ fontSize: '11px', color: '#c9a84c', marginTop: '4px', letterSpacing: '1px' }}>R$ {precoDisplay}</p>}
            </div>

            <div><label style={label}>Área (m²)</label><input name="area" value={form.area} onChange={handleChange} type="number" style={input} placeholder="200" /></div>
            <div><label style={label}>Quartos</label><input name="quartos" value={form.quartos} onChange={handleChange} type="number" style={input} placeholder="3" /></div>
            <div><label style={label}>Banheiros</label><input name="banheiros" value={form.banheiros} onChange={handleChange} type="number" style={input} placeholder="2" /></div>
            <div><label style={label}>Vagas de garagem</label><input name="vagas" value={form.vagas} onChange={handleChange} type="number" style={input} placeholder="1" /></div>
            <div><label style={label}>Bairro</label><input name="bairro" value={form.bairro} onChange={handleChange} style={input} placeholder="Centro" /></div>
            <div><label style={label}>Cidade</label><input name="cidade" value={form.cidade} onChange={handleChange} style={input} /></div>

            <div style={{ gridColumn: '1/-1' }}>
              <label style={label}>Endereço completo</label>
              <input name="endereco" value={form.endereco} onChange={handleChange} style={input} placeholder="Rua das Flores, 123" />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={label}>Descrição</label>
              <textarea name="descricao" value={form.descricao} onChange={handleChange} rows={4} style={{ ...input, resize: 'vertical' }} placeholder="Descreva o imóvel..." />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={label}>Fotos</label>
              <input type="file" multiple accept="image/*" onChange={handleFotos} style={{ ...input, padding: '8px' }} />
              {fotos.length > 0 && <p style={{ color: '#6b6355', fontSize: '12px', marginTop: '6px' }}>{fotos.length} foto(s) selecionada(s)</p>}
            </div>
            <div style={{ display: 'flex', gap: '24px', gridColumn: '1/-1' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a09880', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" name="destaque" checked={form.destaque} onChange={handleChange} />
                Destaque
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a09880', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" name="ativo" checked={form.ativo} onChange={handleChange} />
                Ativo (visível no site)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a09880', fontSize: '12px', cursor: 'pointer' }}>
                <input type="checkbox" name="mostrar_preco" checked={form.mostrar_preco} onChange={handleChange} />
                Exibir preço no site
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
            <button type="submit" disabled={loading || codigoGerado === '...'} style={{ background: '#c9a84c', color: '#0a0a0a', border: 'none', padding: '14px 32px', fontSize: '12px', letterSpacing: '3px', textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer' }}>
              {loading ? 'Salvando...' : 'Salvar Imóvel'}
            </button>
            <Link href="/admin/imoveis" style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.3)', color: '#a09880', padding: '14px 32px', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', textDecoration: 'none' }}>
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </main>
  )
}

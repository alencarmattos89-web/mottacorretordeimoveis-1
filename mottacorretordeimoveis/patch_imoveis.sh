#!/bin/bash
# Patch: exclusão com confirmação "EXCLUIR" + código sequencial automático
# Aplica em: app/admin/imoveis/page.tsx e app/admin/imoveis/novo/page.tsx

set -e

# ── DETECTA RAIZ DO PROJETO ──────────────────────────────────────────────────
if [ -f "package.json" ]; then
  ROOT="."
elif [ -f "mottacorretordeimoveis/package.json" ]; then
  ROOT="mottacorretordeimoveis"
else
  echo "❌  Execute o script na raiz do repositório (onde fica package.json ou a pasta mottacorretordeimoveis/)"
  exit 1
fi

echo "📁  Raiz detectada: $ROOT"

# ════════════════════════════════════════════════════════════════════════════
# ARQUIVO 1 — app/admin/imoveis/page.tsx
# Adiciona modal de confirmação que exige digitar "EXCLUIR"
# ════════════════════════════════════════════════════════════════════════════
FILE1="$ROOT/app/admin/imoveis/page.tsx"

cat > "$FILE1" << 'EOF'
'use client'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'

export default function ImoveisAdmin() {
  const [imoveis, setImoveis] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Modal de exclusão
  const [modalAberto, setModalAberto] = useState(false)
  const [imovelParaExcluir, setImovelParaExcluir] = useState<{ id: string; titulo: string } | null>(null)
  const [confirmacaoTexto, setConfirmacaoTexto] = useState('')
  const [excluindo, setExcluindo] = useState(false)

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

  function abrirModalExcluir(id: string, titulo: string) {
    setImovelParaExcluir({ id, titulo })
    setConfirmacaoTexto('')
    setModalAberto(true)
  }

  function fecharModal() {
    if (excluindo) return
    setModalAberto(false)
    setImovelParaExcluir(null)
    setConfirmacaoTexto('')
  }

  async function confirmarExclusao() {
    if (confirmacaoTexto !== 'EXCLUIR' || !imovelParaExcluir) return
    setExcluindo(true)
    await supabase.from('imoveis').delete().eq('id', imovelParaExcluir.id)
    setExcluindo(false)
    fecharModal()
    carregarImoveis()
  }

  const confirmacaoValida = confirmacaoTexto === 'EXCLUIR'

  return (
    <main style={{ background: '#0a0a0a', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>

      {/* ── MODAL DE EXCLUSÃO ── */}
      {modalAberto && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) fecharModal() }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.82)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div style={{
            background: '#0f0e0c',
            border: '1px solid rgba(192,57,43,0.5)',
            padding: '36px 32px',
            maxWidth: '460px',
            width: '100%',
          }}>
            <p style={{ fontSize: '10px', letterSpacing: '4px', color: '#c0392b', textTransform: 'uppercase', marginBottom: '14px' }}>
              Ação irreversível
            </p>
            <h2 style={{ fontFamily: 'Georgia,serif', fontSize: '22px', fontWeight: 300, color: '#e8e0d0', marginBottom: '12px' }}>
              Excluir imóvel?
            </h2>
            <p style={{ color: '#a09880', fontSize: '13px', lineHeight: 1.6, marginBottom: '22px' }}>
              Você está prestes a excluir permanentemente:<br />
              <span style={{ color: '#e8e0d0', fontWeight: 500 }}>{imovelParaExcluir?.titulo}</span>
            </p>
            <p style={{ color: '#6b6355', fontSize: '12px', marginBottom: '10px', letterSpacing: '0.5px' }}>
              Para confirmar, digite <strong style={{ color: '#c0392b', letterSpacing: '2px' }}>EXCLUIR</strong> abaixo:
            </p>
            <input
              autoFocus
              value={confirmacaoTexto}
              onChange={(e) => setConfirmacaoTexto(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === 'Enter' && confirmacaoValida) confirmarExclusao() }}
              placeholder="EXCLUIR"
              style={{
                width: '100%',
                background: '#1a1814',
                border: `1px solid ${confirmacaoValida ? 'rgba(192,57,43,0.8)' : 'rgba(201,168,76,0.2)'}`,
                color: confirmacaoValida ? '#ff8a7a' : '#e8e0d0',
                padding: '12px 14px',
                fontSize: '16px',
                letterSpacing: '4px',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'monospace',
                marginBottom: '22px',
              }}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={fecharModal}
                disabled={excluindo}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(201,168,76,0.3)',
                  color: '#a09880',
                  padding: '11px 22px',
                  fontSize: '11px',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarExclusao}
                disabled={!confirmacaoValida || excluindo}
                style={{
                  background: confirmacaoValida ? '#c0392b' : '#2a1a1a',
                  border: `1px solid ${confirmacaoValida ? '#c0392b' : 'rgba(192,57,43,0.2)'}`,
                  color: confirmacaoValida ? '#fff' : '#5a3333',
                  padding: '11px 22px',
                  fontSize: '11px',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  cursor: confirmacaoValida && !excluindo ? 'pointer' : 'not-allowed',
                  fontWeight: 700,
                  transition: 'all 0.15s',
                }}
              >
                {excluindo ? 'Excluindo...' : 'Excluir definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
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

      {/* ── CONTEÚDO ── */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <p style={{ fontSize: '11px', letterSpacing: '4px', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '8px' }}>Portfólio</p>
            <h1 style={{ fontFamily: 'Georgia,serif', fontSize: '32px', fontWeight: 300, color: '#e8e0d0' }}>Imóveis</h1>
          </div>
          <Link href="/admin/imoveis/novo" style={{ background: '#c9a84c', color: '#0a0a0a', padding: '12px 24px', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600, textDecoration: 'none' }}>
            + Novo Imóvel
          </Link>
        </div>

        {loading ? (
          <p style={{ color: '#6b6355' }}>Carregando...</p>
        ) : imoveis.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#4a4438' }}>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>🏠</p>
            <p style={{ fontSize: '18px', color: '#6b6355', marginBottom: '24px' }}>Nenhum imóvel cadastrado.</p>
            <Link href="/admin/imoveis/novo" style={{ background: '#c9a84c', color: '#0a0a0a', padding: '12px 24px', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600, textDecoration: 'none' }}>
              Cadastrar primeiro imóvel
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1px', background: 'rgba(201,168,76,0.15)' }}>
            {imoveis.map((imovel) => {
              const codigo = imovel.dados_administrativos?.codigo_imovel
              return (
                <div key={imovel.id} style={{ background: '#0f0e0c', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                    <div style={{ width: '60px', height: '60px', background: '#1a1814', flexShrink: 0, overflow: 'hidden' }}>
                      {imovel.fotos?.[0] && <img src={imovel.fotos[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        {codigo && (
                          <span style={{ fontSize: '10px', fontFamily: 'monospace', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', color: '#c9a84c', padding: '2px 7px', letterSpacing: '1px' }}>
                            #{codigo}
                          </span>
                        )}
                        <p style={{ color: '#e8e0d0', fontSize: '15px', fontWeight: 500 }}>{imovel.titulo}</p>
                      </div>
                      <p style={{ color: '#6b6355', fontSize: '12px' }}>{imovel.bairro} · {imovel.cidade} · R$ {Number(imovel.preco).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{ fontSize: '10px', padding: '3px 8px', letterSpacing: '1px', textTransform: 'uppercase', background: imovel.tipo === 'venda' ? 'rgba(201,168,76,0.2)' : 'rgba(201,168,76,0.1)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.3)' }}>
                      {imovel.tipo}
                    </span>
                    <button onClick={() => toggleDestaque(imovel.id, imovel.destaque)} style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.3)', color: imovel.destaque ? '#c9a84c' : '#4a4438', padding: '4px 10px', fontSize: '10px', letterSpacing: '1px', cursor: 'pointer' }}>
                      {imovel.destaque ? '★ Destaque' : '☆ Destaque'}
                    </button>
                    <button onClick={() => toggleAtivo(imovel.id, imovel.ativo)} style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.3)', color: imovel.ativo ? '#61ce70' : '#c0392b', padding: '4px 10px', fontSize: '10px', letterSpacing: '1px', cursor: 'pointer' }}>
                      {imovel.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                    <Link href={'/admin/imoveis/' + imovel.id} style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.3)', color: '#a09880', padding: '4px 10px', fontSize: '10px', letterSpacing: '1px', textDecoration: 'none' }}>
                      Editar
                    </Link>
                    <button
                      onClick={() => abrirModalExcluir(imovel.id, imovel.titulo)}
                      style={{ background: 'transparent', border: '1px solid rgba(192,57,43,0.3)', color: '#c0392b', padding: '4px 10px', fontSize: '10px', letterSpacing: '1px', cursor: 'pointer' }}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
EOF

echo "✅  $FILE1 atualizado"

# ════════════════════════════════════════════════════════════════════════════
# ARQUIVO 2 — app/admin/imoveis/novo/page.tsx
# Gera código sequencial automático (01, 02, 03...) — não editável pelo usuário
# ════════════════════════════════════════════════════════════════════════════
FILE2="$ROOT/app/admin/imoveis/novo/page.tsx"

cat > "$FILE2" << 'EOF'
'use client'
import { supabase } from '@/lib/supabase'
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
    } catch (err) {
      alert('Erro ao salvar. Tente novamente.')
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
EOF

echo "✅  $FILE2 atualizado"

# ════════════════════════════════════════════════════════════════════════════
# GIT — commit e push
# ════════════════════════════════════════════════════════════════════════════
cd "$ROOT/.."  # volta para raiz do git (onde fica o .git)

git add \
  mottacorretordeimoveis/app/admin/imoveis/page.tsx \
  mottacorretordeimoveis/app/admin/imoveis/novo/page.tsx

git commit -m "feat(imoveis): exclusão com confirmação EXCLUIR + código sequencial automático

- Exclusão agora abre modal e exige digitar a palavra EXCLUIR para confirmar
- Novo imóvel gera código sequencial automático (01, 02...) gravado em dados_administrativos.codigo_imovel
- Código é gerado ao abrir a página e travado — não pode ser editado pelo usuário
- Listagem exibe o código do imóvel ao lado do título"

git push

echo ""
echo "🚀  Commit e push concluídos!"

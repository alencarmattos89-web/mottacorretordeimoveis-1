'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const abas = ['Hero', 'Banner', 'Imóveis', 'Geral']

export default function ConfiguracoesAdmin() {
  const [abaAtiva, setAbaAtiva] = useState('Hero')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [uploadando, setUploadando] = useState(false)
  const [config, setConfig] = useState({
    hero_titulo: 'Imóveis de alto padrão',
    hero_subtitulo: 'Cruz Alta e Região',
    hero_descricao: 'Venda · Aluguel · Consultoria',
    hero_foto: '',
    ordenacao_imoveis: 'destaque',
    banner_ativo: false,
    banner_texto: '',
    banner_cor: '#c9a84c',
    banner_posicao: 'topo',
    whatsapp: '5555992290166',
    creci: '12.857',
    cidade: 'Cruz Alta — RS',
    rodape_texto: '',
  })

  useEffect(() => { carregarConfig() }, [])

  async function carregarConfig() {
    const { data } = await supabase.from('configuracoes').select('*').eq('id', 'site').single()
    if (data) setConfig(data)
  }

  function handleChange(e: any) {
    const { name, value, type, checked } = e.target
    setConfig(c => ({ ...c, [name]: type === 'checkbox' ? checked : value }))
  }

  async function uploadFoto(e: any) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadando(true)
    const nome = `hero-${Date.now()}-${file.name.replace(/\s/g, '-')}`
    const { data, error } = await supabase.storage.from('fotos-imoveis').upload(nome, file, { cacheControl: '3600', upsert: false })
    if (!error && data) {
      const { data: urlData } = supabase.storage.from('fotos-imoveis').getPublicUrl(data.path)
      setConfig(c => ({ ...c, hero_foto: urlData.publicUrl }))
    }
    setUploadando(false)
  }

  async function salvar() {
    setSalvando(true)
    await supabase.from('configuracoes').upsert({ id: 'site', ...config })
    setSalvo(true)
    setSalvando(false)
    setTimeout(() => setSalvo(false), 3000)
  }

  const inp = { width: '100%', background: '#1a1814', border: '1px solid rgba(201,168,76,0.2)', color: '#e8e0d0', padding: '10px 14px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const }
  const lbl = { display: 'block' as const, fontSize: '11px', letterSpacing: '2px', color: '#6b6355', textTransform: 'uppercase' as const, marginBottom: '6px' }

  return (
    <main style={{ background: '#0a0a0a', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <header style={{ background: '#0f0e0c', borderBottom: '1px solid rgba(201,168,76,0.2)', padding: '0 32px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <p style={{ fontFamily: 'Georgia,serif', fontSize: '18px', color: '#c9a84c' }}>Motta Admin</p>
          <nav style={{ display: 'flex', gap: '24px' }}>
            <Link href="/admin/dashboard" style={{ color: '#a09880', fontSize: '12px', letterSpacing: '1px', textDecoration: 'none' }}>Dashboard</Link>
            <Link href="/admin/imoveis" style={{ color: '#a09880', fontSize: '12px', letterSpacing: '1px', textDecoration: 'none' }}>Imóveis</Link>
            <Link href="/admin/leads" style={{ color: '#a09880', fontSize: '12px', letterSpacing: '1px', textDecoration: 'none' }}>Leads</Link>
            <Link href="/admin/configuracoes" style={{ color: '#e8e0d0', fontSize: '12px', letterSpacing: '1px', textDecoration: 'none' }}>Configurações</Link>
          </nav>
        </div>
        <Link href="/" style={{ color: '#6b6355', fontSize: '11px', letterSpacing: '1px', textDecoration: 'none' }}>Ver site →</Link>
      </header>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 32px' }}>
        <p style={{ fontSize: '11px', letterSpacing: '4px', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '8px' }}>Painel</p>
        <h1 style={{ fontFamily: 'Georgia,serif', fontSize: '32px', fontWeight: 300, color: '#e8e0d0', marginBottom: '32px' }}>Configurações do Site</h1>

        {/* Abas */}
        <div style={{ display: 'flex', gap: '1px', background: 'rgba(201,168,76,0.15)', marginBottom: '40px' }}>
          {abas.map(aba => (
            <button key={aba} onClick={() => setAbaAtiva(aba)} style={{ flex: 1, padding: '14px', background: abaAtiva === aba ? '#c9a84c' : '#0f0e0c', color: abaAtiva === aba ? '#0a0a0a' : '#6b6355', border: 'none', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer', fontWeight: abaAtiva === aba ? 600 : 400 }}>
              {aba}
            </button>
          ))}
        </div>

        {/* Aba Hero */}
        {abaAtiva === 'Hero' && (
          <div style={{ display: 'grid', gap: '20px' }}>
            <div>
              <label style={lbl}>Título principal</label>
              <input name="hero_titulo" value={config.hero_titulo} onChange={handleChange} style={inp} />
              <p style={{ fontSize: '11px', color: '#4a4438', marginTop: '4px' }}>Ex: Imóveis de alto padrão</p>
            </div>
            <div>
              <label style={lbl}>Subtítulo (acima do título)</label>
              <input name="hero_subtitulo" value={config.hero_subtitulo} onChange={handleChange} style={inp} />
              <p style={{ fontSize: '11px', color: '#4a4438', marginTop: '4px' }}>Ex: Cruz Alta e Região</p>
            </div>
            <div>
              <label style={lbl}>Descrição (abaixo do título)</label>
              <input name="hero_descricao" value={config.hero_descricao} onChange={handleChange} style={inp} />
              <p style={{ fontSize: '11px', color: '#4a4438', marginTop: '4px' }}>Ex: Venda · Aluguel · Consultoria</p>
            </div>
            <div>
              <label style={lbl}>Foto de fundo do hero</label>
              {config.hero_foto && (
                <div style={{ marginBottom: '12px', position: 'relative', height: '160px', overflow: 'hidden' }}>
                  <img src={config.hero_foto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => setConfig(c => ({ ...c, hero_foto: '' }))} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(10,10,10,0.8)', border: '1px solid rgba(192,57,43,0.5)', color: '#c0392b', padding: '4px 10px', fontSize: '11px', cursor: 'pointer' }}>
                    Remover foto
                  </button>
                </div>
              )}
              <input type="file" accept="image/*" onChange={uploadFoto} style={{ ...inp, padding: '8px' }} />
              {uploadando && <p style={{ color: '#c9a84c', fontSize: '12px', marginTop: '6px' }}>Enviando foto...</p>}
            </div>
          </div>
        )}

        {/* Aba Banner */}
        {abaAtiva === 'Banner' && (
          <div style={{ display: 'grid', gap: '20px' }}>
            <div style={{ background: '#0f0e0c', border: '1px solid rgba(201,168,76,0.2)', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#e8e0d0', fontSize: '14px', marginBottom: '4px' }}>Banner ativo</p>
                <p style={{ color: '#6b6355', fontSize: '12px' }}>Exibe o banner no site quando ativado</p>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', cursor: 'pointer' }}>
                <input type="checkbox" name="banner_ativo" checked={config.banner_ativo} onChange={handleChange} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{ position: 'absolute', inset: 0, background: config.banner_ativo ? '#c9a84c' : '#3a3528', borderRadius: '26px', transition: '0.2s' }}>
                  <span style={{ position: 'absolute', height: '20px', width: '20px', left: config.banner_ativo ? '24px' : '3px', bottom: '3px', background: '#0a0a0a', borderRadius: '50%', transition: '0.2s' }} />
                </span>
              </label>
            </div>

            <div>
              <label style={lbl}>Texto do banner</label>
              <input name="banner_texto" value={config.banner_texto} onChange={handleChange} placeholder="Ex: Novo imóvel disponível! Confira agora." style={inp} />
            </div>

            <div>
              <label style={lbl}>Cor do banner</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input type="color" name="banner_cor" value={config.banner_cor} onChange={handleChange} style={{ width: '48px', height: '40px', background: 'none', border: '1px solid rgba(201,168,76,0.2)', cursor: 'pointer', padding: '2px' }} />
                <input name="banner_cor" value={config.banner_cor} onChange={handleChange} style={{ ...inp, width: '140px' }} />
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['#c9a84c', '#25D366', '#c0392b', '#5b9bd5', '#0a0a0a'].map(cor => (
                    <button key={cor} onClick={() => setConfig(c => ({ ...c, banner_cor: cor }))} style={{ width: '28px', height: '28px', background: cor, border: config.banner_cor === cor ? '2px solid #e8e0d0' : '2px solid transparent', cursor: 'pointer', borderRadius: '2px' }} />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label style={lbl}>Posição do banner</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { value: 'topo', label: 'Topo do site', desc: 'Antes do menu de navegação' },
                  { value: 'abaixo_header', label: 'Abaixo do header', desc: 'Logo após o menu' },
                  { value: 'antes_imoveis', label: 'Antes dos imóveis', desc: 'Acima da grade de imóveis' },
                  { value: 'rodape', label: 'Acima do rodapé', desc: 'No final da página' },
                ].map(op => (
                  <button key={op.value} onClick={() => setConfig(c => ({ ...c, banner_posicao: op.value }))} style={{ background: config.banner_posicao === op.value ? 'rgba(201,168,76,0.1)' : '#0f0e0c', border: `1px solid ${config.banner_posicao === op.value ? '#c9a84c' : 'rgba(201,168,76,0.2)'}`, padding: '16px', textAlign: 'left', cursor: 'pointer' }}>
                    <p style={{ color: config.banner_posicao === op.value ? '#c9a84c' : '#e8e0d0', fontSize: '13px', marginBottom: '4px' }}>{op.label}</p>
                    <p style={{ color: '#6b6355', fontSize: '11px' }}>{op.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview do banner */}
            {config.banner_texto && (
              <div>
                <label style={lbl}>Preview</label>
                <div style={{ background: config.banner_cor, padding: '10px 24px', textAlign: 'center' }}>
                  <p style={{ color: config.banner_cor === '#0a0a0a' ? '#e8e0d0' : '#0a0a0a', fontSize: '13px', fontWeight: 500, letterSpacing: '1px' }}>{config.banner_texto}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Aba Imóveis */}
        {abaAtiva === 'Imóveis' && (
          <div style={{ display: 'grid', gap: '12px' }}>
            <label style={lbl}>Ordenação dos imóveis na página inicial</label>
            {[
              { value: 'destaque', label: 'Destaques primeiro', desc: 'Imóveis marcados como destaque aparecem no topo' },
              { value: 'recentes', label: 'Mais recentes', desc: 'Os cadastrados mais recentemente aparecem primeiro' },
              { value: 'preco_asc', label: 'Menor preço primeiro', desc: 'Ordena do mais barato para o mais caro' },
              { value: 'preco_desc', label: 'Maior preço primeiro', desc: 'Ordena do mais caro para o mais barato' },
            ].map(op => (
              <button key={op.value} onClick={() => setConfig(c => ({ ...c, ordenacao_imoveis: op.value }))} style={{ background: config.ordenacao_imoveis === op.value ? 'rgba(201,168,76,0.1)' : '#0f0e0c', border: `1px solid ${config.ordenacao_imoveis === op.value ? '#c9a84c' : 'rgba(201,168,76,0.2)'}`, padding: '18px 20px', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: `2px solid ${config.ordenacao_imoveis === op.value ? '#c9a84c' : '#3a3528'}`, background: config.ordenacao_imoveis === op.value ? '#c9a84c' : 'transparent', flexShrink: 0 }} />
                <div>
                  <p style={{ color: config.ordenacao_imoveis === op.value ? '#c9a84c' : '#e8e0d0', fontSize: '14px', marginBottom: '2px' }}>{op.label}</p>
                  <p style={{ color: '#6b6355', fontSize: '12px' }}>{op.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Aba Geral */}
        {abaAtiva === 'Geral' && (
          <div style={{ display: 'grid', gap: '20px' }}>
            <div>
              <label style={lbl}>Número do WhatsApp</label>
              <input name="whatsapp" value={config.whatsapp} onChange={handleChange} style={inp} />
              <p style={{ fontSize: '11px', color: '#4a4438', marginTop: '4px' }}>Com DDI e DDD, sem espaços. Ex: 5555992290166</p>
            </div>
            <div>
              <label style={lbl}>CRECI</label>
              <input name="creci" value={config.creci} onChange={handleChange} style={inp} />
            </div>
            <div>
              <label style={lbl}>Cidade exibida no site</label>
              <input name="cidade" value={config.cidade} onChange={handleChange} style={inp} />
              <p style={{ fontSize: '11px', color: '#4a4438', marginTop: '4px' }}>Ex: Cruz Alta — RS</p>
            </div>
            <div>
              <label style={lbl}>Texto extra no rodapé (opcional)</label>
              <input name="rodape_texto" value={config.rodape_texto} onChange={handleChange} placeholder="Ex: Atendimento de segunda a sexta, 8h às 18h" style={inp} />
            </div>
          </div>
        )}

        {/* Botão salvar */}
        <div style={{ marginTop: '40px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={salvar} disabled={salvando} style={{ background: '#c9a84c', color: '#0a0a0a', border: 'none', padding: '14px 40px', fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer' }}>
            {salvando ? 'Salvando...' : 'Salvar configurações'}
          </button>
          {salvo && <p style={{ color: '#61ce70', fontSize: '12px', letterSpacing: '1px' }}>✓ Salvo com sucesso!</p>}
        </div>
      </div>
    </main>
  )
}

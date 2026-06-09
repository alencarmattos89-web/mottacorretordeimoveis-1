
'use client'

import { supabase } from '@/lib/supabase-browser'
import { useEffect, useState } from 'react'
import type { ChangeEvent, CSSProperties } from 'react'
import Link from 'next/link'

type SiteConfig = {
  id: string
  hero_titulo: string
  hero_subtitulo: string
  hero_descricao: string
  hero_foto: string
  hero_titulo_cor: string
  hero_titulo_tamanho: number
  hero_subtitulo_cor: string
  hero_subtitulo_tamanho: number
  hero_descricao_cor: string
  hero_descricao_tamanho: number
  hero_imagem_ajuste: string
  ordenacao_imoveis: string
  banner_ativo: boolean
  banner_texto: string
  banner_cor: string
  banner_posicao: string
  banner_imagens: string[]
  banner_intervalo: number
  watermark_ativo: boolean
  watermark_logo: string
  watermark_opacidade: number
  watermark_posicao: string
  watermark_tamanho: number
  watermark_margem: number
  whatsapp: string
  creci: string
  cidade: string
  rodape_texto: string
  hero_altura: number
  hero_overlay_opacidade: number
  logo_url: string
  cor_destaque: string
  cor_fundo: string
  fonte_titulo: string
  fonte_corpo: string
}

const abas = ['Hero', 'Banners', "Marca d'água", 'Imóveis', 'Visual', 'Geral']

const configPadrao: SiteConfig = {
  id: 'site',
  hero_titulo: 'Imóveis de alto padrão',
  hero_subtitulo: 'Cruz Alta e Região',
  hero_descricao: 'Venda · Aluguel · Consultoria',
  hero_foto: '',
  hero_titulo_cor: '#e8e0d0',
  hero_titulo_tamanho: 52,
  hero_subtitulo_cor: '#c9a84c',
  hero_subtitulo_tamanho: 11,
  hero_descricao_cor: '#6b6355',
  hero_descricao_tamanho: 13,
  hero_imagem_ajuste: 'contain',
  ordenacao_imoveis: 'destaque',
  banner_ativo: false,
  banner_texto: '',
  banner_cor: '#c9a84c',
  banner_posicao: 'topo',
  banner_imagens: [],
  banner_intervalo: 5,
  watermark_ativo: false,
  watermark_logo: '',
  watermark_opacidade: 45,
  watermark_posicao: 'inferior-direita',
  watermark_tamanho: 18,
  watermark_margem: 32,
  whatsapp: '5555992290166',
  creci: '12.857',
  cidade: 'Cruz Alta — RS',
  rodape_texto: '',
  hero_altura: 430,
  hero_overlay_opacidade: 58,
  logo_url: '',
  cor_destaque: '#c9a84c',
  cor_fundo: '#0a0a0a',
  fonte_titulo: 'Georgia, serif',
  fonte_corpo: 'system-ui, sans-serif',
}

function normalizarConfig(data: Partial<SiteConfig> | null | undefined): SiteConfig {
  return {
    ...configPadrao,
    ...(data || {}),
    id: 'site',
    banner_imagens: Array.isArray(data?.banner_imagens) ? data.banner_imagens.filter(Boolean) : [],
    hero_titulo_tamanho: Number(data?.hero_titulo_tamanho || configPadrao.hero_titulo_tamanho),
    hero_subtitulo_tamanho: Number(data?.hero_subtitulo_tamanho || configPadrao.hero_subtitulo_tamanho),
    hero_descricao_tamanho: Number(data?.hero_descricao_tamanho || configPadrao.hero_descricao_tamanho),
    banner_intervalo: Number(data?.banner_intervalo || configPadrao.banner_intervalo),
    watermark_opacidade: Number(data?.watermark_opacidade || configPadrao.watermark_opacidade),
    watermark_tamanho: Number(data?.watermark_tamanho || configPadrao.watermark_tamanho),
    watermark_margem: Number(data?.watermark_margem || configPadrao.watermark_margem),
    hero_altura: Number(data?.hero_altura || configPadrao.hero_altura),
    hero_overlay_opacidade: Number(data?.hero_overlay_opacidade ?? configPadrao.hero_overlay_opacidade),
    logo_url: String(data?.logo_url || ''),
    cor_destaque: String(data?.cor_destaque || configPadrao.cor_destaque),
    cor_fundo: String(data?.cor_fundo || configPadrao.cor_fundo),
    fonte_titulo: String(data?.fonte_titulo || configPadrao.fonte_titulo),
    fonte_corpo: String(data?.fonte_corpo || configPadrao.fonte_corpo),
  }
}

function limparNomeArquivo(nome: string) {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'imagem.jpg'
}

export default function ConfiguracoesAdmin() {
  const [abaAtiva, setAbaAtiva] = useState('Hero')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState('')
  const [uploadando, setUploadando] = useState('')
  const [config, setConfig] = useState<SiteConfig>(configPadrao)
  const [loadingConfig, setLoadingConfig] = useState(true)

  useEffect(() => {
    void carregarConfig()
  }, [])

  async function carregarConfig() {
    setLoadingConfig(true)
    const { data, error } = await supabase.from('configuracoes').select('*').eq('id', 'site').single()
    if (error && error.code !== 'PGRST116') {
      setErro(`Não foi possível carregar as configurações: ${error.message}`)
      return
    }
    setConfig(normalizarConfig(data as Partial<SiteConfig> | null))
    setLoadingConfig(false)
  }

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = event.target
    const checked = event.target instanceof HTMLInputElement ? event.target.checked : false
    const valor = type === 'checkbox' ? checked : type === 'number' || type === 'range' ? Number(value) : value
    setConfig((atual) => ({ ...atual, [name]: valor }))
  }

  async function uploadArquivo(file: File, pasta: string) {
    if (!file.type.startsWith('image/')) {
      setErro('Envie somente arquivos de imagem.')
      return ''
    }

    const nomeSeguro = `${pasta}/${Date.now()}-${Math.random().toString(36).slice(2)}-${limparNomeArquivo(file.name)}`
    const { data, error } = await supabase.storage
      .from('site-assets')
      .upload(nomeSeguro, file, { cacheControl: '3600', upsert: false, contentType: file.type })

    if (error) {
      setErro(`Erro ao enviar imagem: ${error.message}. Confira se a migration do bucket site-assets foi aplicada no Supabase.`)
      return ''
    }

    const { data: urlData } = supabase.storage.from('site-assets').getPublicUrl(data.path)
    return urlData.publicUrl || ''
  }

  async function uploadHero(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setErro('')
    setUploadando('hero')
    const url = await uploadArquivo(file, 'hero')
    if (url) setConfig((atual) => ({ ...atual, hero_foto: url }))
    setUploadando('')
    event.target.value = ''
  }

  async function uploadWatermark(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setErro('')
    setUploadando('watermark')
    const url = await uploadArquivo(file, 'watermark')
    if (url) setConfig((atual) => ({ ...atual, watermark_logo: url, watermark_ativo: true }))
    setUploadando('')
    event.target.value = ''
  }

  async function uploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setErro('')
    setUploadando('logo')
    const url = await uploadArquivo(file, 'logo')
    if (url) setConfig((atual) => ({ ...atual, logo_url: url }))
    setUploadando('')
    event.target.value = ''
  }

  async function uploadBanners(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return
    setErro('')
    setUploadando('banners')
    const urls: string[] = []

    for (const file of files) {
      const url = await uploadArquivo(file, 'banners')
      if (url) urls.push(url)
    }

    if (urls.length > 0) {
      setConfig((atual) => ({ ...atual, banner_imagens: [...atual.banner_imagens, ...urls], banner_ativo: true }))
    }

    setUploadando('')
    event.target.value = ''
  }

  function removerBanner(index: number) {
    setConfig((atual) => ({ ...atual, banner_imagens: atual.banner_imagens.filter((_, itemIndex) => itemIndex !== index) }))
  }

  function moverBanner(index: number, direcao: 'cima' | 'baixo') {
    setConfig((atual) => {
      const destino = direcao === 'cima' ? index - 1 : index + 1
      if (destino < 0 || destino >= atual.banner_imagens.length) return atual
      const imagens = [...atual.banner_imagens]
      ;[imagens[index], imagens[destino]] = [imagens[destino], imagens[index]]
      return { ...atual, banner_imagens: imagens }
    })
  }

  async function salvar() {
    setSalvando(true)
    setErro('')

    const payload = {
      ...config,
      banner_imagens: config.banner_imagens.filter(Boolean),
      hero_titulo_tamanho: Number(config.hero_titulo_tamanho) || configPadrao.hero_titulo_tamanho,
      hero_subtitulo_tamanho: Number(config.hero_subtitulo_tamanho) || configPadrao.hero_subtitulo_tamanho,
      hero_descricao_tamanho: Number(config.hero_descricao_tamanho) || configPadrao.hero_descricao_tamanho,
      banner_intervalo: Number(config.banner_intervalo) || configPadrao.banner_intervalo,
      watermark_opacidade: Number(config.watermark_opacidade) || configPadrao.watermark_opacidade,
      watermark_tamanho: Number(config.watermark_tamanho) || configPadrao.watermark_tamanho,
      watermark_margem: Number(config.watermark_margem) || configPadrao.watermark_margem,
      hero_altura: Number(config.hero_altura) || configPadrao.hero_altura,
      hero_overlay_opacidade: Number(config.hero_overlay_opacidade) ?? configPadrao.hero_overlay_opacidade,
      logo_url: config.logo_url || '',
      cor_destaque: config.cor_destaque || configPadrao.cor_destaque,
      cor_fundo: config.cor_fundo || configPadrao.cor_fundo,
      fonte_titulo: config.fonte_titulo || configPadrao.fonte_titulo,
      fonte_corpo: config.fonte_corpo || configPadrao.fonte_corpo,
    }

    const { error } = await supabase.from('configuracoes').upsert(payload)
    if (error) {
      setErro(`Erro ao salvar configurações: ${error.message}. Se aparecer coluna inexistente, aplique a migration nova no Supabase.`)
      setSalvando(false)
      return
    }

    setSalvo(true)
    setSalvando(false)
    setTimeout(() => setSalvo(false), 3000)
  }

  const inp: CSSProperties = { width: '100%', background: '#1a1814', border: '1px solid rgba(201,168,76,0.2)', color: '#e8e0d0', padding: '10px 14px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }
  const lbl: CSSProperties = { display: 'block', fontSize: '11px', letterSpacing: '2px', color: '#6b6355', textTransform: 'uppercase', marginBottom: '6px' }
  const card: CSSProperties = { background: '#0f0e0c', border: '1px solid rgba(201,168,76,0.18)', padding: '20px' }

  return (
    <main style={{ background: '#0a0a0a', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <header style={{ background: '#0f0e0c', borderBottom: '1px solid rgba(201,168,76,0.2)', padding: '0 32px', minHeight: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <p style={{ fontFamily: 'Georgia,serif', fontSize: '18px', color: '#c9a84c' }}>Motta Admin</p>
          <nav style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <Link href="/admin/dashboard" style={{ color: '#a09880', fontSize: '12px', letterSpacing: '1px', textDecoration: 'none' }}>Dashboard</Link>
            <Link href="/admin/imoveis" style={{ color: '#a09880', fontSize: '12px', letterSpacing: '1px', textDecoration: 'none' }}>Imóveis</Link>
            <Link href="/admin/leads" style={{ color: '#a09880', fontSize: '12px', letterSpacing: '1px', textDecoration: 'none' }}>Leads</Link>
            <Link href="/admin/configuracoes" style={{ color: '#e8e0d0', fontSize: '12px', letterSpacing: '1px', textDecoration: 'none' }}>Configurações</Link>
          </nav>
        </div>
        <Link href="/" style={{ color: '#6b6355', fontSize: '11px', letterSpacing: '1px', textDecoration: 'none' }}>Ver site →</Link>
      </header>

      <div style={{ maxWidth: '940px', margin: '0 auto', padding: '48px 32px' }}>
        <p style={{ fontSize: '11px', letterSpacing: '4px', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '8px' }}>Painel</p>
        <h1 style={{ fontFamily: 'Georgia,serif', fontSize: '32px', fontWeight: 300, color: '#e8e0d0', marginBottom: '32px' }}>Configurações do Site</h1>

        {erro && <p style={{ background: 'rgba(192,57,43,0.12)', border: '1px solid rgba(192,57,43,0.35)', color: '#ffb2a8', padding: '14px 16px', marginBottom: '18px', fontSize: '13px' }}>{erro}</p>}

        <div style={{ display: 'flex', gap: '1px', background: 'rgba(201,168,76,0.15)', marginBottom: '40px', flexWrap: 'wrap' }}>
          {abas.map((aba) => (
            <button key={aba} onClick={() => setAbaAtiva(aba)} style={{ flex: '1 1 140px', padding: '14px', background: abaAtiva === aba ? '#c9a84c' : '#0f0e0c', color: abaAtiva === aba ? '#0a0a0a' : '#6b6355', border: 'none', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer', fontWeight: abaAtiva === aba ? 600 : 400 }}>
              {aba}
            </button>
          ))}
        </div>

        {abaAtiva === 'Hero' && (
          <div style={{ display: 'grid', gap: '20px' }}>
            <div style={card}>
              <label style={lbl}>Foto da página principal</label>
              <p style={{ color: '#6b6355', fontSize: '12px', marginBottom: '12px' }}>Esta é a imagem principal do topo. A opção padrão é mostrar a foto inteira, sem corte.</p>
              {config.hero_foto && (
                <div style={{ marginBottom: '12px', position: 'relative', height: '220px', overflow: 'hidden', background: '#070706', border: '1px solid rgba(201,168,76,0.14)' }}>
                  <img src={config.hero_foto} alt="Foto principal" style={{ width: '100%', height: '100%', objectFit: config.hero_imagem_ajuste === 'cover' ? 'cover' : 'contain' }} />
                  <button type="button" onClick={() => setConfig((atual) => ({ ...atual, hero_foto: '' }))} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(10,10,10,0.85)', border: '1px solid rgba(192,57,43,0.5)', color: '#ff8a7a', padding: '6px 10px', fontSize: '11px', cursor: 'pointer' }}>Remover</button>
                </div>
              )}
              <input type="file" accept="image/*" onChange={uploadHero} style={{ ...inp, padding: '8px' }} />
              {uploadando === 'hero' && <p style={{ color: '#c9a84c', fontSize: '12px', marginTop: '6px' }}>Enviando imagem...</p>}
              <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button type="button" onClick={() => setConfig((atual) => ({ ...atual, hero_imagem_ajuste: 'contain' }))} style={{ background: config.hero_imagem_ajuste !== 'cover' ? 'rgba(201,168,76,0.1)' : '#14120f', border: `1px solid ${config.hero_imagem_ajuste !== 'cover' ? '#c9a84c' : 'rgba(201,168,76,0.18)'}`, color: config.hero_imagem_ajuste !== 'cover' ? '#c9a84c' : '#a09880', padding: '12px', cursor: 'pointer' }}>Mostrar inteira sem corte</button>
                <button type="button" onClick={() => setConfig((atual) => ({ ...atual, hero_imagem_ajuste: 'cover' }))} style={{ background: config.hero_imagem_ajuste === 'cover' ? 'rgba(201,168,76,0.1)' : '#14120f', border: `1px solid ${config.hero_imagem_ajuste === 'cover' ? '#c9a84c' : 'rgba(201,168,76,0.18)'}`, color: config.hero_imagem_ajuste === 'cover' ? '#c9a84c' : '#a09880', padding: '12px', cursor: 'pointer' }}>Preencher área</button>
              </div>
            </div>

            <div style={card}>
              <div style={{ display: 'grid', gap: '18px' }}>
                <div>
                  <label style={lbl}>Título principal</label>
                  <input name="hero_titulo" value={config.hero_titulo} onChange={handleChange} style={inp} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 120px', gap: '12px' }}>
                  <div>
                    <label style={lbl}>Cor do título</label>
                    <input type="color" name="hero_titulo_cor" value={config.hero_titulo_cor} onChange={handleChange} style={{ ...inp, padding: '4px', height: '42px' }} />
                  </div>
                  <div>
                    <label style={lbl}>Tamanho</label>
                    <input type="number" name="hero_titulo_tamanho" value={config.hero_titulo_tamanho} onChange={handleChange} min={24} max={90} style={inp} />
                  </div>
                </div>
                <div>
                  <label style={lbl}>Subtítulo</label>
                  <input name="hero_subtitulo" value={config.hero_subtitulo} onChange={handleChange} style={inp} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 120px', gap: '12px' }}>
                  <div>
                    <label style={lbl}>Cor do subtítulo</label>
                    <input type="color" name="hero_subtitulo_cor" value={config.hero_subtitulo_cor} onChange={handleChange} style={{ ...inp, padding: '4px', height: '42px' }} />
                  </div>
                  <div>
                    <label style={lbl}>Tamanho</label>
                    <input type="number" name="hero_subtitulo_tamanho" value={config.hero_subtitulo_tamanho} onChange={handleChange} min={9} max={40} style={inp} />
                  </div>
                </div>
                <div>
                  <label style={lbl}>Descrição</label>
                  <input name="hero_descricao" value={config.hero_descricao} onChange={handleChange} style={inp} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 120px', gap: '12px' }}>
                  <div>
                    <label style={lbl}>Cor da descrição</label>
                    <input type="color" name="hero_descricao_cor" value={config.hero_descricao_cor} onChange={handleChange} style={{ ...inp, padding: '4px', height: '42px' }} />
                  </div>
                  <div>
                    <label style={lbl}>Tamanho</label>
                    <input type="number" name="hero_descricao_tamanho" value={config.hero_descricao_tamanho} onChange={handleChange} min={10} max={44} style={inp} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {abaAtiva === 'Banners' && (
          <div style={{ display: 'grid', gap: '20px' }}>
            <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <p style={{ color: '#e8e0d0', fontSize: '14px', marginBottom: '4px' }}>Carrossel de banners ativo</p>
                <p style={{ color: '#6b6355', fontSize: '12px' }}>Use imagens no tamanho 1920 × 450 px.</p>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', cursor: 'pointer', flexShrink: 0 }}>
                <input type="checkbox" name="banner_ativo" checked={config.banner_ativo} onChange={handleChange} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{ position: 'absolute', inset: 0, background: config.banner_ativo ? '#c9a84c' : '#3a3528', borderRadius: '26px', transition: '0.2s' }}>
                  <span style={{ position: 'absolute', height: '20px', width: '20px', left: config.banner_ativo ? '24px' : '3px', bottom: '3px', background: '#0a0a0a', borderRadius: '50%', transition: '0.2s' }} />
                </span>
              </label>
            </div>

            <div style={card}>
              <label style={lbl}>Adicionar banners</label>
              <input type="file" accept="image/*" multiple onChange={uploadBanners} style={{ ...inp, padding: '8px' }} />
              {uploadando === 'banners' && <p style={{ color: '#c9a84c', fontSize: '12px', marginTop: '8px' }}>Enviando banner(s)...</p>}
              <p style={{ color: '#6b6355', fontSize: '12px', marginTop: '8px' }}>Pode selecionar mais de uma imagem. O site vai alternar automaticamente em carrossel.</p>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              {config.banner_imagens.map((url, index) => (
                <div key={`${url}-${index}`} style={{ ...card, display: 'grid', gridTemplateColumns: '180px 1fr auto', gap: '14px', alignItems: 'center' }}>
                  <img src={url} alt={`Banner ${index + 1}`} style={{ width: '180px', aspectRatio: '1920 / 450', objectFit: 'contain', background: '#070706', border: '1px solid rgba(201,168,76,0.14)' }} />
                  <div>
                    <p style={{ color: '#e8e0d0', fontSize: '13px', marginBottom: '4px' }}>Banner {index + 1}</p>
                    <p style={{ color: '#6b6355', fontSize: '11px', wordBreak: 'break-all' }}>{url}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button type="button" onClick={() => moverBanner(index, 'cima')} style={{ background: '#1a1814', border: '1px solid rgba(201,168,76,0.18)', color: '#a09880', padding: '8px', cursor: 'pointer' }}>↑</button>
                    <button type="button" onClick={() => moverBanner(index, 'baixo')} style={{ background: '#1a1814', border: '1px solid rgba(201,168,76,0.18)', color: '#a09880', padding: '8px', cursor: 'pointer' }}>↓</button>
                    <button type="button" onClick={() => removerBanner(index)} style={{ background: 'rgba(192,57,43,0.12)', border: '1px solid rgba(192,57,43,0.35)', color: '#ff8a7a', padding: '8px', cursor: 'pointer' }}>Remover</button>
                  </div>
                </div>
              ))}
              {config.banner_imagens.length === 0 && <p style={{ color: '#6b6355', fontSize: '13px' }}>Nenhum banner cadastrado ainda.</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: '16px' }}>
              <div>
                <label style={lbl}>Posição do carrossel</label>
                <select name="banner_posicao" value={config.banner_posicao} onChange={handleChange} style={inp}>
                  <option value="topo">Topo do site</option>
                  <option value="abaixo_header">Abaixo do header</option>
                  <option value="antes_imoveis">Antes dos imóveis</option>
                  <option value="rodape">Acima do rodapé</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Tempo por banner</label>
                <input type="number" name="banner_intervalo" value={config.banner_intervalo} onChange={handleChange} min={2} max={30} style={inp} />
              </div>
            </div>
          </div>
        )}

        {abaAtiva === 'Marca d\'água' && (
          <div style={{ display: 'grid', gap: '20px' }}>
            <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <p style={{ color: '#e8e0d0', fontSize: '14px', marginBottom: '4px' }}>Aplicar logo nas novas fotos dos imóveis</p>
                <p style={{ color: '#6b6355', fontSize: '12px' }}>Vale para fotos enviadas depois dessa configuração. Fotos antigas não são alteradas automaticamente.</p>
              </div>
              <input type="checkbox" name="watermark_ativo" checked={config.watermark_ativo} onChange={handleChange} />
            </div>

            <div style={card}>
              <label style={lbl}>Logo da marca d’água</label>
              {config.watermark_logo && (
                <div style={{ marginBottom: '12px', width: '220px', height: '120px', background: '#070706', border: '1px solid rgba(201,168,76,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={config.watermark_logo} alt="Logo da marca d’água" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', opacity: config.watermark_opacidade / 100 }} />
                </div>
              )}
              <input type="file" accept="image/*" onChange={uploadWatermark} style={{ ...inp, padding: '8px' }} />
              {uploadando === 'watermark' && <p style={{ color: '#c9a84c', fontSize: '12px', marginTop: '8px' }}>Enviando logo...</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={lbl}>Posição da logo</label>
                <select name="watermark_posicao" value={config.watermark_posicao} onChange={handleChange} style={inp}>
                  <option value="inferior-direita">Inferior direita</option>
                  <option value="inferior-esquerda">Inferior esquerda</option>
                  <option value="topo-direita">Topo direita</option>
                  <option value="topo-esquerda">Topo esquerda</option>
                  <option value="centro">Centro</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Transparência / opacidade</label>
                <input type="range" name="watermark_opacidade" value={config.watermark_opacidade} onChange={handleChange} min={5} max={100} style={{ width: '100%' }} />
                <p style={{ color: '#6b6355', fontSize: '12px' }}>{config.watermark_opacidade}%</p>
              </div>
              <div>
                <label style={lbl}>Tamanho da logo na foto (%)</label>
                <input type="number" name="watermark_tamanho" value={config.watermark_tamanho} onChange={handleChange} min={5} max={60} style={inp} />
              </div>
              <div>
                <label style={lbl}>Margem em pixels</label>
                <input type="number" name="watermark_margem" value={config.watermark_margem} onChange={handleChange} min={0} max={300} style={inp} />
              </div>
            </div>
          </div>
        )}

        {abaAtiva === 'Imóveis' && (
          <div style={{ display: 'grid', gap: '12px' }}>
            <label style={lbl}>Ordenação dos imóveis na página inicial</label>
            {[
              { value: 'destaque', label: 'Destaques primeiro', desc: 'Imóveis marcados como destaque aparecem no topo' },
              { value: 'recentes', label: 'Mais recentes', desc: 'Os cadastrados mais recentemente aparecem primeiro' },
              { value: 'preco_asc', label: 'Menor preço primeiro', desc: 'Ordena do mais barato para o mais caro' },
              { value: 'preco_desc', label: 'Maior preço primeiro', desc: 'Ordena do mais caro para o mais barato' },
            ].map((op) => (
              <button key={op.value} type="button" onClick={() => setConfig((atual) => ({ ...atual, ordenacao_imoveis: op.value }))} style={{ background: config.ordenacao_imoveis === op.value ? 'rgba(201,168,76,0.1)' : '#0f0e0c', border: `1px solid ${config.ordenacao_imoveis === op.value ? '#c9a84c' : 'rgba(201,168,76,0.2)'}`, padding: '18px 20px', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: `2px solid ${config.ordenacao_imoveis === op.value ? '#c9a84c' : '#3a3528'}`, background: config.ordenacao_imoveis === op.value ? '#c9a84c' : 'transparent', flexShrink: 0 }} />
                <div>
                  <p style={{ color: config.ordenacao_imoveis === op.value ? '#c9a84c' : '#e8e0d0', fontSize: '14px', marginBottom: '2px' }}>{op.label}</p>
                  <p style={{ color: '#6b6355', fontSize: '12px' }}>{op.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {abaAtiva === 'Visual' && (
          <div style={{ display: 'grid', gap: '20px' }}>

            {/* LOGO */}
            <div style={card}>
              <label style={lbl}>Logo do site (header e rodapé)</label>
              <p style={{ color: '#6b6355', fontSize: '12px', marginBottom: '12px' }}>
                Substitui a logo atual em todas as páginas. Use PNG com fundo transparente, preferencialmente horizontal.
              </p>
              {config.logo_url && (
                <div style={{ marginBottom: '12px', height: '80px', display: 'flex', alignItems: 'center', background: '#070706', border: '1px solid rgba(201,168,76,0.14)', padding: '12px' }}>
                  <img src={config.logo_url} alt="Logo atual" style={{ maxHeight: '100%', maxWidth: '280px', objectFit: 'contain' }} />
                  <button type="button" onClick={() => setConfig(a => ({ ...a, logo_url: '' }))} style={{ marginLeft: 'auto', background: 'rgba(192,57,43,0.12)', border: '1px solid rgba(192,57,43,0.35)', color: '#ff8a7a', padding: '6px 10px', fontSize: '11px', cursor: 'pointer' }}>Remover</button>
                </div>
              )}
              <input type="file" accept="image/*" onChange={uploadLogo} style={{ ...inp, padding: '8px' }} />
              {uploadando === 'logo' && <p style={{ color: '#c9a84c', fontSize: '12px', marginTop: '6px' }}>Enviando logo...</p>}
            </div>

            {/* HERO */}
            <div style={card}>
              <p style={{ color: '#e8e0d0', fontSize: '14px', marginBottom: '18px', fontWeight: 500 }}>Seção principal (Hero)</p>
              <div style={{ display: 'grid', gap: '18px' }}>
                <div>
                  <label style={lbl}>Altura do Hero — {config.hero_altura}px</label>
                  <input type="range" name="hero_altura" value={config.hero_altura} onChange={handleChange} min={200} max={900} step={10} style={{ width: '100%', marginBottom: '6px' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#4a4438' }}>
                    <span>200px (compacto)</span><span>430px (padrão)</span><span>900px (tela cheia)</span>
                  </div>
                </div>
                <div>
                  <label style={lbl}>Escurecimento sobre a foto — {config.hero_overlay_opacidade}%</label>
                  <input type="range" name="hero_overlay_opacidade" value={config.hero_overlay_opacidade} onChange={handleChange} min={0} max={90} step={1} style={{ width: '100%', marginBottom: '6px' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#4a4438' }}>
                    <span>0% (foto clara)</span><span>58% (padrão)</span><span>90% (quase escuro)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CORES */}
            <div style={card}>
              <p style={{ color: '#e8e0d0', fontSize: '14px', marginBottom: '18px', fontWeight: 500 }}>Cores globais</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={lbl}>Cor de destaque (botões, links, dourado)</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input type="color" name="cor_destaque" value={config.cor_destaque} onChange={handleChange} style={{ ...inp, padding: '4px', height: '42px', flex: '0 0 56px' }} />
                    <input type="text" name="cor_destaque" value={config.cor_destaque} onChange={handleChange} placeholder="#c9a84c" style={{ ...inp, flex: 1 }} />
                  </div>
                  <div style={{ marginTop: '8px', height: '28px', background: config.cor_destaque, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '10px', color: '#0a0a0a', fontWeight: 700, letterSpacing: '1px' }}>PRÉVIA DA COR</span>
                  </div>
                </div>
                <div>
                  <label style={lbl}>Cor de fundo do site</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input type="color" name="cor_fundo" value={config.cor_fundo} onChange={handleChange} style={{ ...inp, padding: '4px', height: '42px', flex: '0 0 56px' }} />
                    <input type="text" name="cor_fundo" value={config.cor_fundo} onChange={handleChange} placeholder="#0a0a0a" style={{ ...inp, flex: 1 }} />
                  </div>
                  <div style={{ marginTop: '8px', height: '28px', background: config.cor_fundo, border: '1px solid rgba(201,168,76,0.2)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '10px', color: '#e8e0d0', fontWeight: 700, letterSpacing: '1px' }}>PRÉVIA DO FUNDO</span>
                  </div>
                </div>
              </div>
            </div>

            {/* FONTES */}
            <div style={card}>
              <p style={{ color: '#e8e0d0', fontSize: '14px', marginBottom: '18px', fontWeight: 500 }}>Tipografia</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={lbl}>Fonte dos títulos</label>
                  <select name="fonte_titulo" value={config.fonte_titulo} onChange={handleChange} style={inp}>
                    <option value="Georgia, serif">Georgia (clássica, padrão)</option>
                    <option value="'Playfair Display', Georgia, serif">Playfair Display (elegante)</option>
                    <option value="'Cormorant Garamond', Georgia, serif">Cormorant Garamond (refinada)</option>
                    <option value="'Montserrat', system-ui, sans-serif">Montserrat (moderna)</option>
                    <option value="'Raleway', system-ui, sans-serif">Raleway (clean)</option>
                    <option value="system-ui, sans-serif">System UI (sem serifa)</option>
                  </select>
                  <p style={{ marginTop: '10px', fontSize: '22px', fontFamily: config.fonte_titulo, color: '#e8e0d0', fontWeight: 300 }}>
                    Imóveis de alto padrão
                  </p>
                </div>
                <div>
                  <label style={lbl}>Fonte do corpo do texto</label>
                  <select name="fonte_corpo" value={config.fonte_corpo} onChange={handleChange} style={inp}>
                    <option value="system-ui, sans-serif">System UI (padrão do sistema)</option>
                    <option value="'Inter', system-ui, sans-serif">Inter (moderna, legível)</option>
                    <option value="'Lato', system-ui, sans-serif">Lato (clean)</option>
                    <option value="'Open Sans', system-ui, sans-serif">Open Sans (neutra)</option>
                    <option value="Georgia, serif">Georgia (serifada)</option>
                  </select>
                  <p style={{ marginTop: '10px', fontSize: '14px', fontFamily: config.fonte_corpo, color: '#a09880', lineHeight: 1.6 }}>
                    Cruz Alta e Região · Venda · Aluguel · Consultoria
                  </p>
                </div>
              </div>
              <p style={{ marginTop: '12px', fontSize: '11px', color: '#4a4438' }}>
                ⚠ Fontes como Playfair Display, Montserrat e Inter precisam ser carregadas pelo Google Fonts. Se a fonte não aparecer no site, me avise para adicionar o import.
              </p>
            </div>

          </div>
        )}

                {abaAtiva === 'Visual' && (
          <div style={{ display: 'grid', gap: '20px' }}>

            {/* LOGO */}
            <div style={card}>
              <label style={lbl}>Logo do site (header e rodapé)</label>
              <p style={{ color: '#6b6355', fontSize: '12px', marginBottom: '12px' }}>
                Substitui a logo atual em todas as páginas. Use PNG com fundo transparente, preferencialmente horizontal.
              </p>
              {config.logo_url && (
                <div style={{ marginBottom: '12px', height: '80px', display: 'flex', alignItems: 'center', background: '#070706', border: '1px solid rgba(201,168,76,0.14)', padding: '12px' }}>
                  <img src={config.logo_url} alt="Logo atual" style={{ maxHeight: '100%', maxWidth: '280px', objectFit: 'contain' }} />
                  <button type="button" onClick={() => setConfig(a => ({ ...a, logo_url: '' }))} style={{ marginLeft: 'auto', background: 'rgba(192,57,43,0.12)', border: '1px solid rgba(192,57,43,0.35)', color: '#ff8a7a', padding: '6px 10px', fontSize: '11px', cursor: 'pointer' }}>Remover</button>
                </div>
              )}
              <input type="file" accept="image/*" onChange={uploadLogo} style={{ ...inp, padding: '8px' }} />
              {uploadando === 'logo' && <p style={{ color: '#c9a84c', fontSize: '12px', marginTop: '6px' }}>Enviando logo...</p>}
            </div>

            {/* HERO */}
            <div style={card}>
              <p style={{ color: '#e8e0d0', fontSize: '14px', marginBottom: '18px', fontWeight: 500 }}>Seção principal (Hero)</p>
              <div style={{ display: 'grid', gap: '18px' }}>
                <div>
                  <label style={lbl}>Altura do Hero — {config.hero_altura}px</label>
                  <input type="range" name="hero_altura" value={config.hero_altura} onChange={handleChange} min={200} max={900} step={10} style={{ width: '100%', marginBottom: '6px' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#4a4438' }}>
                    <span>200px (compacto)</span><span>430px (padrão)</span><span>900px (tela cheia)</span>
                  </div>
                </div>
                <div>
                  <label style={lbl}>Escurecimento sobre a foto — {config.hero_overlay_opacidade}%</label>
                  <input type="range" name="hero_overlay_opacidade" value={config.hero_overlay_opacidade} onChange={handleChange} min={0} max={90} step={1} style={{ width: '100%', marginBottom: '6px' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#4a4438' }}>
                    <span>0% (foto clara)</span><span>58% (padrão)</span><span>90% (quase escuro)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CORES */}
            <div style={card}>
              <p style={{ color: '#e8e0d0', fontSize: '14px', marginBottom: '18px', fontWeight: 500 }}>Cores globais</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={lbl}>Cor de destaque (botões, links, dourado)</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input type="color" name="cor_destaque" value={config.cor_destaque} onChange={handleChange} style={{ ...inp, padding: '4px', height: '42px', flex: '0 0 56px' }} />
                    <input type="text" name="cor_destaque" value={config.cor_destaque} onChange={handleChange} placeholder="#c9a84c" style={{ ...inp, flex: 1 }} />
                  </div>
                  <div style={{ marginTop: '8px', height: '28px', background: config.cor_destaque, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '10px', color: '#0a0a0a', fontWeight: 700, letterSpacing: '1px' }}>PRÉVIA DA COR</span>
                  </div>
                </div>
                <div>
                  <label style={lbl}>Cor de fundo do site</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input type="color" name="cor_fundo" value={config.cor_fundo} onChange={handleChange} style={{ ...inp, padding: '4px', height: '42px', flex: '0 0 56px' }} />
                    <input type="text" name="cor_fundo" value={config.cor_fundo} onChange={handleChange} placeholder="#0a0a0a" style={{ ...inp, flex: 1 }} />
                  </div>
                  <div style={{ marginTop: '8px', height: '28px', background: config.cor_fundo, border: '1px solid rgba(201,168,76,0.2)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '10px', color: '#e8e0d0', fontWeight: 700, letterSpacing: '1px' }}>PRÉVIA DO FUNDO</span>
                  </div>
                </div>
              </div>
            </div>

            {/* FONTES */}
            <div style={card}>
              <p style={{ color: '#e8e0d0', fontSize: '14px', marginBottom: '18px', fontWeight: 500 }}>Tipografia</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={lbl}>Fonte dos títulos</label>
                  <select name="fonte_titulo" value={config.fonte_titulo} onChange={handleChange} style={inp}>
                    <option value="Georgia, serif">Georgia (clássica, padrão)</option>
                    <option value="'Playfair Display', Georgia, serif">Playfair Display (elegante)</option>
                    <option value="'Cormorant Garamond', Georgia, serif">Cormorant Garamond (refinada)</option>
                    <option value="'Montserrat', system-ui, sans-serif">Montserrat (moderna)</option>
                    <option value="'Raleway', system-ui, sans-serif">Raleway (clean)</option>
                    <option value="system-ui, sans-serif">System UI (sem serifa)</option>
                  </select>
                  <p style={{ marginTop: '10px', fontSize: '22px', fontFamily: config.fonte_titulo, color: '#e8e0d0', fontWeight: 300 }}>
                    Imóveis de alto padrão
                  </p>
                </div>
                <div>
                  <label style={lbl}>Fonte do corpo do texto</label>
                  <select name="fonte_corpo" value={config.fonte_corpo} onChange={handleChange} style={inp}>
                    <option value="system-ui, sans-serif">System UI (padrão do sistema)</option>
                    <option value="'Inter', system-ui, sans-serif">Inter (moderna, legível)</option>
                    <option value="'Lato', system-ui, sans-serif">Lato (clean)</option>
                    <option value="'Open Sans', system-ui, sans-serif">Open Sans (neutra)</option>
                    <option value="Georgia, serif">Georgia (serifada)</option>
                  </select>
                  <p style={{ marginTop: '10px', fontSize: '14px', fontFamily: config.fonte_corpo, color: '#a09880', lineHeight: 1.6 }}>
                    Cruz Alta e Região · Venda · Aluguel · Consultoria
                  </p>
                </div>
              </div>
              <p style={{ marginTop: '12px', fontSize: '11px', color: '#4a4438' }}>
                ⚠ Fontes como Playfair Display, Montserrat e Inter precisam ser carregadas pelo Google Fonts. Se a fonte não aparecer no site, me avise para adicionar o import.
              </p>
            </div>

          </div>
        )}

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
            </div>
            <div>
              <label style={lbl}>Texto extra no rodapé</label>
              <input name="rodape_texto" value={config.rodape_texto} onChange={handleChange} placeholder="Ex: Atendimento de segunda a sexta, 8h às 18h" style={inp} />
            </div>
          </div>
        )}

        <div style={{ marginTop: '40px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={salvar} disabled={salvando || loadingConfig} style={{ background: '#c9a84c', color: '#0a0a0a', border: 'none', padding: '14px 40px', fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', fontWeight: 600, cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1 }}>
            {salvando ? 'Salvando...' : 'Salvar configurações'}
          </button>
          {salvo && <p style={{ color: '#61ce70', fontSize: '12px', letterSpacing: '1px' }}>✓ Salvo com sucesso!</p>}
        </div>
      </div>
    </main>
  )
}

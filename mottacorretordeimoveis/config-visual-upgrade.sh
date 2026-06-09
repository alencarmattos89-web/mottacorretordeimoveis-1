#!/usr/bin/env bash
# =============================================================================
# MOTTA CORRETOR — CONFIGURAÇÕES VISUAIS AVANÇADAS
# Gerado em: 2026-06-09
#
# O QUE ESTE SCRIPT FAZ:
#   1. Migration: adiciona colunas novas na tabela configuracoes
#   2. page.tsx: conecta as novas variáveis visuais ao site
#   3. configuracoes/page.tsx: adiciona os controles no painel admin
#
# COMO USAR:
#   cd /workspaces/mottacorretordeimoveis-1/mottacorretordeimoveis
#   bash config-visual-upgrade.sh
# =============================================================================

set -e

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  MOTTA — Configurações visuais avançadas"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# 1. MIGRATION: novas colunas na tabela configuracoes
# ─────────────────────────────────────────────────────────────────────────────
echo "→ [1/4] Criando migration para novas colunas..."

mkdir -p supabase/migrations

cat > supabase/migrations/20260609000000_config_visual_avancado.sql << 'SQL'
-- Configurações visuais avançadas: hero, logo, fontes, cores globais

alter table public.configuracoes
  add column if not exists hero_altura           integer default 430,
  add column if not exists hero_overlay_opacidade integer default 58,
  add column if not exists logo_url              text    default '',
  add column if not exists cor_destaque          text    default '#c9a84c',
  add column if not exists cor_fundo             text    default '#0a0a0a',
  add column if not exists fonte_titulo          text    default 'Georgia, serif',
  add column if not exists fonte_corpo           text    default 'system-ui, sans-serif';

update public.configuracoes set
  hero_altura            = coalesce(hero_altura,            430),
  hero_overlay_opacidade = coalesce(hero_overlay_opacidade, 58),
  logo_url               = coalesce(logo_url,               ''),
  cor_destaque           = coalesce(cor_destaque,           '#c9a84c'),
  cor_fundo              = coalesce(cor_fundo,              '#0a0a0a'),
  fonte_titulo           = coalesce(fonte_titulo,           'Georgia, serif'),
  fonte_corpo            = coalesce(fonte_corpo,            'system-ui, sans-serif')
where id = 'site';
SQL

echo "   ✓ supabase/migrations/20260609000000_config_visual_avancado.sql"

# ─────────────────────────────────────────────────────────────────────────────
# 2. page.tsx: conecta as novas variáveis ao site
# ─────────────────────────────────────────────────────────────────────────────
echo "→ [2/4] Atualizando app/page.tsx com as novas variáveis..."

cat > app/page.tsx << 'TYPESCRIPT'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import CardImovel from '@/components/CardImovel'
import BannerCarousel from '@/components/BannerCarousel'

export const revalidate = 0

type SearchParams = Record<string, string | string[] | undefined>

const LOGO_PADRAO = 'https://wabkkqbgfwufmxjutxsr.supabase.co/storage/v1/object/public/assets/LOGO%20MOTTA%20site.png'

const configPadrao = {
  hero_titulo:             'Imóveis de alto padrão',
  hero_subtitulo:          'Cruz Alta e Região',
  hero_descricao:          'Venda · Aluguel · Consultoria',
  hero_foto:               '',
  hero_titulo_cor:         '#e8e0d0',
  hero_titulo_tamanho:     52,
  hero_subtitulo_cor:      '#c9a84c',
  hero_subtitulo_tamanho:  11,
  hero_descricao_cor:      '#6b6355',
  hero_descricao_tamanho:  13,
  hero_imagem_ajuste:      'contain',
  hero_altura:             430,
  hero_overlay_opacidade:  58,
  logo_url:                '',
  cor_destaque:            '#c9a84c',
  cor_fundo:               '#0a0a0a',
  fonte_titulo:            'Georgia, serif',
  fonte_corpo:             'system-ui, sans-serif',
  ordenacao_imoveis:       'destaque',
  banner_ativo:            false,
  banner_posicao:          'topo',
  banner_imagens:          [] as string[],
  banner_intervalo:        5,
  whatsapp:                '5555992290166',
  creci:                   '12.857',
  cidade:                  'Cruz Alta — RS',
  rodape_texto:            '',
}

function valorUnico(valor: string | string[] | undefined) {
  return Array.isArray(valor) ? valor[0] || '' : valor || ''
}

function numero(valor: unknown, fallback: number) {
  const n = Number(valor)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

// Garante que a cor de overlay fica entre 0 e 100%
function overlay(opacidade: unknown) {
  const n = Number(opacidade)
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) / 100 : 0.58
}

export default async function Home({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { data: config } = await supabase
    .from('configuracoes')
    .select('*')
    .eq('id', 'site')
    .single()

  const cfg = { ...configPadrao, ...(config || {}) }

  // Logo: usa a customizada se existir, senão a padrão
  const logoUrl = cfg.logo_url?.trim() || LOGO_PADRAO

  const bannerImages = Array.isArray(cfg.banner_imagens)
    ? cfg.banner_imagens.filter((url: unknown): url is string => typeof url === 'string' && url.trim().length > 0)
    : []

  const sp = await searchParams
  const filtroTipo      = valorUnico(sp?.tipo)
  const filtroCategoria = valorUnico(sp?.categoria)
  const filtroPrecoMax  = valorUnico(sp?.preco_max)
  const filtroBusca     = valorUnico(sp?.busca)

  let query = supabase.from('imoveis').select('*').eq('ativo', true)
  if (filtroTipo)      query = query.eq('tipo', filtroTipo)
  if (filtroCategoria) query = query.eq('categoria', filtroCategoria)
  if (filtroPrecoMax)  query = query.lte('preco', Number(filtroPrecoMax))
  if (filtroBusca)     query = query.or(`bairro.ilike.%${filtroBusca}%,cidade.ilike.%${filtroBusca}%,titulo.ilike.%${filtroBusca}%`)

  if      (cfg.ordenacao_imoveis === 'destaque')   query = query.order('destaque', { ascending: false }).order('created_at', { ascending: false })
  else if (cfg.ordenacao_imoveis === 'recentes')   query = query.order('created_at', { ascending: false })
  else if (cfg.ordenacao_imoveis === 'preco_asc')  query = query.order('preco', { ascending: true })
  else if (cfg.ordenacao_imoveis === 'preco_desc') query = query.order('preco', { ascending: false })

  const { data: imoveis } = await query
  const temFiltro = Boolean(filtroTipo || filtroCategoria || filtroPrecoMax || filtroBusca)

  function urlFiltro(params: Record<string, string>) {
    const atual: Record<string, string> = {}
    if (filtroTipo)      atual.tipo      = filtroTipo
    if (filtroCategoria) atual.categoria = filtroCategoria
    if (filtroPrecoMax)  atual.preco_max = filtroPrecoMax
    if (filtroBusca)     atual.busca     = filtroBusca
    const merged = { ...atual, ...params }
    const qs = Object.entries(merged).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join('&')
    return qs ? `/?${qs}#imoveis` : '/#imoveis'
  }

  function urlRemoveFiltro(chave: string) {
    const atual: Record<string, string> = {}
    if (filtroTipo)      atual.tipo      = filtroTipo
    if (filtroCategoria) atual.categoria = filtroCategoria
    if (filtroPrecoMax)  atual.preco_max = filtroPrecoMax
    if (filtroBusca)     atual.busca     = filtroBusca
    delete atual[chave]
    const qs = Object.entries(atual).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join('&')
    return qs ? `/?${qs}#imoveis` : '/#imoveis'
  }

  const Banner = () => cfg.banner_ativo && bannerImages.length > 0 ? (
    <BannerCarousel images={bannerImages} intervalSeconds={numero(cfg.banner_intervalo, 5)} />
  ) : null

  const filtroBtn = (ativo: boolean) => ({
    padding: '6px 16px',
    fontSize: '10px',
    letterSpacing: '2px',
    textTransform: 'uppercase' as const,
    textDecoration: 'none',
    border: 'none',
    borderBottom: ativo ? `1px solid ${cfg.cor_destaque}` : '1px solid transparent',
    background: 'transparent',
    color: ativo ? cfg.cor_destaque : '#4a4438',
    cursor: 'pointer',
    display: 'inline-block',
    transition: 'all 0.2s',
  })

  const heroAltura = numero(cfg.hero_altura, 430)
  const heroOverlay = overlay(cfg.hero_overlay_opacidade)
  const corDestaque = cfg.cor_destaque || '#c9a84c'
  const corFundo = cfg.cor_fundo || '#0a0a0a'
  const fonteTitulo = cfg.fonte_titulo || 'Georgia, serif'
  const fonteCorpo = cfg.fonte_corpo || 'system-ui, sans-serif'

  return (
    <main style={{ background: corFundo, minHeight: '100vh', fontFamily: fonteCorpo }}>
      <a href={`https://wa.me/${cfg.whatsapp}`} target="_blank" rel="noopener noreferrer" className="whatsapp-floating" aria-label="Falar no WhatsApp">
        <svg className="whatsapp-floating-icon" viewBox="0 0 32 32" aria-hidden="true">
          <path d="M16.04 3C8.86 3 3.04 8.82 3.04 16c0 2.29.6 4.53 1.74 6.5L3 29l6.67-1.75A12.93 12.93 0 0 0 16.04 29C23.22 29 29.04 23.18 29.04 16S23.22 3 16.04 3Zm0 23.7c-2.02 0-4-.54-5.72-1.57l-.41-.24-3.96 1.04 1.06-3.86-.27-.43A10.62 10.62 0 0 1 5.35 16c0-5.89 4.8-10.69 10.69-10.69 5.9 0 10.69 4.8 10.69 10.69 0 5.89-4.79 10.7-10.69 10.7Zm5.86-8.02c-.32-.16-1.9-.94-2.2-1.05-.29-.1-.5-.16-.72.16-.21.32-.82 1.05-1 1.27-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.74-.98-2.38-.26-.62-.52-.54-.72-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.08-1.11 2.64s1.14 3.07 1.3 3.28c.16.21 2.24 3.42 5.43 4.8.76.33 1.35.52 1.81.67.76.24 1.45.21 2 .13.61-.09 1.9-.78 2.17-1.53.27-.75.27-1.39.19-1.53-.08-.13-.29-.21-.61-.37Z" />
        </svg>
      </a>

      <style>{`
        .home-header { padding: 0 32px; }
        .home-header-logo { height: 52px; object-fit: contain; }
        .home-nav-links { display: flex; gap: 32px; align-items: center; }
        .home-hero { min-height: ${heroAltura}px; padding: 100px 32px 80px; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; text-align: center; border-bottom: 1px solid rgba(201,168,76,0.15); background: #0f0e0c; }
        .home-hero-img { position: absolute; inset: 0; width: 100%; height: 100%; }
        .home-hero-overlay { position: absolute; inset: 0; background: rgba(10,10,10,${heroOverlay}); }
        .home-hero-content { position: relative; z-index: 1; max-width: 960px; }
        .imoveis-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
        .whatsapp-floating { position: fixed !important; right: 24px !important; bottom: 24px !important; width: 62px !important; height: 62px !important; border-radius: 999px !important; background: #25D366 !important; display: flex !important; align-items: center !important; justify-content: center !important; z-index: 9999 !important; box-shadow: 0 18px 38px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.18) inset !important; transition: transform 0.2s ease, box-shadow 0.2s ease !important; }
        .whatsapp-floating:hover { transform: translateY(-3px) scale(1.03) !important; box-shadow: 0 22px 46px rgba(0,0,0,0.42), 0 0 0 1px rgba(255,255,255,0.22) inset !important; }
        .whatsapp-floating-icon { width: 34px !important; height: 34px !important; fill: #ffffff !important; display: block !important; }
        @media (max-width: 768px) {
          .home-header { padding: 0 16px !important; }
          .home-header-logo { height: 58px !important; max-width: 185px !important; }
          .home-nav-links { gap: 18px !important; }
          .home-hero { min-height: ${Math.round(heroAltura * 0.8)}px !important; padding: 80px 18px 64px !important; }
          .imoveis-grid { grid-template-columns: 1fr !important; }
          .whatsapp-floating { right: 18px !important; bottom: 88px !important; width: 58px !important; height: 58px !important; }
          .whatsapp-floating-icon { width: 32px !important; height: 32px !important; }
        }
      `}</style>

      {cfg.banner_posicao === 'topo' && <Banner />}

      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: `1px solid ${corDestaque}40`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px' }} className="home-header">
        <img src={logoUrl} alt="Motta Corretor" className="home-header-logo" />
        <nav className="home-nav-links">
          <a href="#imoveis" style={{ color: '#a09880', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', textDecoration: 'none' }}>Imóveis</a>
          <a href="#contato" style={{ color: '#0a0a0a', background: corDestaque, padding: '10px 18px', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700 }}>Contato</a>
        </nav>
      </header>

      {cfg.banner_posicao === 'abaixo_header' && <Banner />}

      <section className="home-hero">
        {cfg.hero_foto && <img src={cfg.hero_foto} alt="Imagem principal" className="home-hero-img" style={{ objectFit: cfg.hero_imagem_ajuste === 'cover' ? 'cover' : 'contain' }} />}
        {cfg.hero_foto && <div className="home-hero-overlay" />}
        <div className="home-hero-content">
          <p style={{ fontSize: `${numero(cfg.hero_subtitulo_tamanho, 11)}px`, letterSpacing: '4px', color: cfg.hero_subtitulo_cor, textTransform: 'uppercase', marginBottom: '16px' }}>{cfg.hero_subtitulo}</p>
          <h1 style={{ fontFamily: fonteTitulo, fontSize: `clamp(30px, 5vw, ${numero(cfg.hero_titulo_tamanho, 52)}px)`, fontWeight: 300, color: cfg.hero_titulo_cor, lineHeight: 1.2, marginBottom: '12px' }}>{cfg.hero_titulo}</h1>
          <p style={{ fontSize: `${numero(cfg.hero_descricao_tamanho, 13)}px`, letterSpacing: '2px', color: cfg.hero_descricao_cor, marginBottom: '48px', textTransform: 'uppercase' }}>{cfg.hero_descricao}</p>
        </div>
      </section>

      {cfg.banner_posicao === 'antes_imoveis' && (
        <div style={{ maxWidth: '1200px', margin: '32px auto 0', padding: '0 32px' }}>
          <Banner />
        </div>
      )}

      <section id="imoveis" style={{ maxWidth: '1200px', margin: '0 auto', padding: '64px 32px' }}>
        <style>{`
          .busca-form { display: grid; grid-template-columns: 160px 160px 1fr auto; gap: 0; background: #0f0e0c; border: 1px solid ${corDestaque}40; margin-bottom: 56px; }
          .busca-select, .busca-input { background: transparent; border: none; border-right: 1px solid ${corDestaque}26; color: #e8e0d0; padding: 16px 18px; font-size: 13px; font-family: ${fonteCorpo}; outline: none; appearance: none; -webkit-appearance: none; cursor: pointer; width: 100%; }
          .busca-select option { background: #0f0e0c; color: #e8e0d0; }
          .busca-input::placeholder { color: #4a4438; }
          .busca-btn { background: ${corDestaque}; color: #0a0a0a; border: none; padding: 16px 32px; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; font-weight: 700; cursor: pointer; white-space: nowrap; font-family: ${fonteCorpo}; }
          @media (max-width: 768px) { .busca-form { grid-template-columns: 1fr 1fr; } .busca-select:first-child { border-bottom: 1px solid ${corDestaque}26; } .busca-select:nth-child(2) { border-right: none; border-bottom: 1px solid ${corDestaque}26; } .busca-input { grid-column: 1/-1; border-right: none; border-bottom: 1px solid ${corDestaque}26; } .busca-btn { grid-column: 1/-1; padding: 16px; } }
        `}</style>

        <form action="/#imoveis" method="GET" className="busca-form">
          <select name="tipo" defaultValue={filtroTipo} className="busca-select">
            <option value="">Comprar ou Alugar</option>
            <option value="venda">Comprar</option>
            <option value="aluguel">Alugar</option>
          </select>
          <select name="categoria" defaultValue={filtroCategoria} className="busca-select">
            <option value="">Tipo de imóvel</option>
            <option value="casa">Casa</option>
            <option value="apartamento">Apartamento</option>
            <option value="terreno">Terreno</option>
            <option value="comercial">Comercial</option>
          </select>
          <input name="busca" defaultValue={filtroBusca} className="busca-input" placeholder="Bairro ou cidade..." autoComplete="off" />
          <button type="submit" className="busca-btn">Buscar</button>
        </form>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '48px', flexWrap: 'wrap' }}>
          <Link href={urlFiltro({ tipo: 'venda' })}       style={filtroBtn(filtroTipo === 'venda')}>Comprar</Link>
          <Link href={urlFiltro({ tipo: 'aluguel' })}     style={filtroBtn(filtroTipo === 'aluguel')}>Alugar</Link>
          <Link href={urlFiltro({ categoria: 'casa' })}   style={filtroBtn(filtroCategoria === 'casa')}>Casas</Link>
          <Link href={urlFiltro({ categoria: 'apartamento' })} style={filtroBtn(filtroCategoria === 'apartamento')}>Apartamentos</Link>
          <Link href={urlFiltro({ categoria: 'terreno' })} style={filtroBtn(filtroCategoria === 'terreno')}>Terrenos</Link>
        </div>

        {temFiltro && (
          <div style={{ marginTop: '-28px', marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {filtroTipo      && <span style={{ fontSize: '11px', padding: '4px 12px', background: `${corDestaque}1a`, color: corDestaque, border: `1px solid ${corDestaque}40`, letterSpacing: '1px' }}>{filtroTipo === 'venda' ? 'Comprar' : 'Alugar'}<Link href={urlRemoveFiltro('tipo')} style={{ marginLeft: '8px', color: '#6b6355', textDecoration: 'none' }}>✕</Link></span>}
            {filtroCategoria && <span style={{ fontSize: '11px', padding: '4px 12px', background: `${corDestaque}1a`, color: corDestaque, border: `1px solid ${corDestaque}40`, letterSpacing: '1px' }}>{filtroCategoria.charAt(0).toUpperCase() + filtroCategoria.slice(1)}<Link href={urlRemoveFiltro('categoria')} style={{ marginLeft: '8px', color: '#6b6355', textDecoration: 'none' }}>✕</Link></span>}
            {filtroPrecoMax  && <span style={{ fontSize: '11px', padding: '4px 12px', background: `${corDestaque}1a`, color: corDestaque, border: `1px solid ${corDestaque}40`, letterSpacing: '1px' }}>Até R$ {Number(filtroPrecoMax).toLocaleString('pt-BR')}<Link href={urlRemoveFiltro('preco_max')} style={{ marginLeft: '8px', color: '#6b6355', textDecoration: 'none' }}>✕</Link></span>}
            {filtroBusca     && <span style={{ fontSize: '11px', padding: '4px 12px', background: `${corDestaque}1a`, color: corDestaque, border: `1px solid ${corDestaque}40`, letterSpacing: '1px' }}>"{filtroBusca}"<Link href={urlRemoveFiltro('busca')} style={{ marginLeft: '8px', color: '#6b6355', textDecoration: 'none' }}>✕</Link></span>}
            <Link href="/#imoveis" style={{ fontSize: '11px', color: '#6b6355', letterSpacing: '1px', textDecoration: 'none', marginLeft: '4px' }}>limpar tudo →</Link>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: '11px', letterSpacing: '4px', color: corDestaque, textTransform: 'uppercase', marginBottom: '4px' }}>Portfólio</p>
            <h2 style={{ fontFamily: fonteTitulo, fontSize: '32px', fontWeight: 300, color: '#e8e0d0' }}>Imóveis disponíveis</h2>
          </div>
          {imoveis && imoveis.length > 0 && <p style={{ fontSize: '11px', color: '#4a4438', letterSpacing: '1px' }}>{imoveis.length} encontrado{imoveis.length !== 1 ? 's' : ''}{temFiltro && <span style={{ color: corDestaque }}> · filtrado</span>}</p>}
        </div>

        {imoveis && imoveis.length > 0 ? (
          <div className="imoveis-grid">
            {imoveis.map((imovel) => <CardImovel key={imovel.id} imovel={imovel} />)}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>⌂</p>
            <p style={{ fontSize: '18px', color: '#6b6355', marginBottom: '16px' }}>{temFiltro ? 'Nenhum imóvel com esses filtros.' : 'Nenhum imóvel cadastrado ainda.'}</p>
            {temFiltro && <Link href="/#imoveis" style={{ color: corDestaque, fontSize: '12px', letterSpacing: '2px', textDecoration: 'none' }}>Limpar filtros →</Link>}
          </div>
        )}
      </section>

      {cfg.banner_posicao === 'rodape' && (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 32px 32px' }}>
          <Banner />
        </div>
      )}

      <section id="contato" style={{ background: '#0f0e0c', padding: '80px 32px', textAlign: 'center', borderTop: '1px solid rgba(201,168,76,0.15)' }}>
        <p style={{ fontSize: '11px', letterSpacing: '4px', color: corDestaque, textTransform: 'uppercase', marginBottom: '16px' }}>Fale conosco</p>
        <h2 style={{ fontFamily: fonteTitulo, fontSize: '36px', fontWeight: 300, color: '#e8e0d0', marginBottom: '8px' }}>Encontrou o imóvel ideal?</h2>
        <p style={{ fontSize: '12px', letterSpacing: '2px', color: '#6b6355', marginBottom: '32px', textTransform: 'uppercase' }}>Entre em contato e agende uma visita</p>
        <a href={`https://wa.me/${cfg.whatsapp}`} target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: corDestaque, color: '#0a0a0a', fontSize: '12px', letterSpacing: '3px', padding: '16px 40px', textTransform: 'uppercase', fontWeight: 600, textDecoration: 'none' }}>Falar no WhatsApp</a>
      </section>

      <footer style={{ background: '#070706', padding: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(201,168,76,0.15)', flexWrap: 'wrap', gap: '16px' }}>
        <img src={logoUrl} alt="Motta Corretor" style={{ height: '36px', objectFit: 'contain' }} />
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '11px', color: '#4a4438', letterSpacing: '1px' }}>{cfg.cidade} · CRECI {cfg.creci}</p>
          {cfg.rodape_texto && <p style={{ fontSize: '11px', color: '#4a4438', letterSpacing: '1px', marginTop: '4px' }}>{cfg.rodape_texto}</p>}
        </div>
      </footer>
    </main>
  )
}
TYPESCRIPT

echo "   ✓ app/page.tsx (hero_altura, overlay, logo, cor_destaque, fontes)"

# ─────────────────────────────────────────────────────────────────────────────
# 3. configuracoes/page.tsx: adiciona aba "Visual" com os novos controles
# ─────────────────────────────────────────────────────────────────────────────
echo "→ [3/4] Atualizando painel de configurações com aba Visual..."

python3 - << 'PYEOF'
path = "app/admin/configuracoes/page.tsx"
with open(path, "r") as f:
    content = f.read()

# 1. Adiciona 'Visual' nas abas
content = content.replace(
    "const abas = ['Hero', 'Banners', \"Marca d'água\", 'Imóveis', 'Geral']",
    "const abas = ['Hero', 'Banners', \"Marca d'água\", 'Imóveis', 'Visual', 'Geral']"
)

# 2. Adiciona os novos campos no tipo SiteConfig
content = content.replace(
    "  rodape_texto: string\n}",
    """  rodape_texto: string
  hero_altura: number
  hero_overlay_opacidade: number
  logo_url: string
  cor_destaque: string
  cor_fundo: string
  fonte_titulo: string
  fonte_corpo: string
}"""
)

# 3. Adiciona os valores padrão no configPadrao
content = content.replace(
    "  rodape_texto: '',\n}",
    """  rodape_texto: '',
  hero_altura: 430,
  hero_overlay_opacidade: 58,
  logo_url: '',
  cor_destaque: '#c9a84c',
  cor_fundo: '#0a0a0a',
  fonte_titulo: 'Georgia, serif',
  fonte_corpo: 'system-ui, sans-serif',
}"""
)

# 4. Adiciona normalização dos novos campos em normalizarConfig
content = content.replace(
    "    watermark_margem: Number(data?.watermark_margem || configPadrao.watermark_margem),\n  }",
    """    watermark_margem: Number(data?.watermark_margem || configPadrao.watermark_margem),
    hero_altura: Number(data?.hero_altura || configPadrao.hero_altura),
    hero_overlay_opacidade: Number(data?.hero_overlay_opacidade ?? configPadrao.hero_overlay_opacidade),
    logo_url: String(data?.logo_url || ''),
    cor_destaque: String(data?.cor_destaque || configPadrao.cor_destaque),
    cor_fundo: String(data?.cor_fundo || configPadrao.cor_fundo),
    fonte_titulo: String(data?.fonte_titulo || configPadrao.fonte_titulo),
    fonte_corpo: String(data?.fonte_corpo || configPadrao.fonte_corpo),
  }"""
)

# 5. Adiciona normalização no payload do salvar()
content = content.replace(
    "      watermark_margem: Number(config.watermark_margem) || configPadrao.watermark_margem,\n    }",
    """      watermark_margem: Number(config.watermark_margem) || configPadrao.watermark_margem,
      hero_altura: Number(config.hero_altura) || configPadrao.hero_altura,
      hero_overlay_opacidade: Number(config.hero_overlay_opacidade) ?? configPadrao.hero_overlay_opacidade,
      logo_url: config.logo_url || '',
      cor_destaque: config.cor_destaque || configPadrao.cor_destaque,
      cor_fundo: config.cor_fundo || configPadrao.cor_fundo,
      fonte_titulo: config.fonte_titulo || configPadrao.fonte_titulo,
      fonte_corpo: config.fonte_corpo || configPadrao.fonte_corpo,
    }"""
)

# 6. Adiciona função de upload de logo após uploadWatermark
upload_watermark_end = """    setUploadando('')
    event.target.value = ''
  }

  async function uploadBanners"""

new_upload_logo = """    setUploadando('')
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

  async function uploadBanners"""

content = content.replace(upload_watermark_end, new_upload_logo)

# 7. Insere a aba Visual antes de {abaAtiva === 'Geral'
aba_visual = """        {abaAtiva === 'Visual' && (
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

        """

content = content.replace(
    "        {abaAtiva === 'Geral' && (",
    aba_visual + "        {abaAtiva === 'Geral' && ("
)

with open(path, "w") as f:
    f.write(content)

print("   ✓ app/admin/configuracoes/page.tsx (aba Visual adicionada)")
PYEOF

# ─────────────────────────────────────────────────────────────────────────────
# 4. Commit e push
# ─────────────────────────────────────────────────────────────────────────────
echo "→ [4/4] Commit e push..."

git add -A
git commit -m "feat(config): aba Visual — logo, altura hero, overlay, cor destaque, fundo, fontes"
git push

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  Concluído!"
echo ""
echo "  PASSO OBRIGATÓRIO — rodar no Supabase SQL Editor:"
echo "  supabase/migrations/20260609000000_config_visual_avancado.sql"
echo ""
echo "  DEPOIS disso, em Admin → Configurações → aba 'Visual':"
echo "  ✓ Upload da logo"
echo "  ✓ Altura do Hero (slider)"
echo "  ✓ Escurecimento sobre a foto (slider)"
echo "  ✓ Cor de destaque com prévia ao vivo"
echo "  ✓ Cor de fundo"
echo "  ✓ Fonte dos títulos com prévia ao vivo"
echo "  ✓ Fonte do corpo do texto com prévia ao vivo"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

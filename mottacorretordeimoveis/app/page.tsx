import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import CardImovel from '@/components/CardImovel'

export default async function Home({ searchParams }: { searchParams: Promise<any> }) {
  const { data: config } = await supabase
    .from('configuracoes')
    .select('*')
    .eq('id', 'site')
    .single()

  const cfg = config || {
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
  }

  const sp = await searchParams
  const filtroTipo = sp?.tipo || ''
  const filtroCategoria = sp?.categoria || ''
  const filtroPrecoMax = sp?.preco_max || ''
  const filtroBusca = sp?.busca || ''

  let query = supabase.from('imoveis').select('*').eq('ativo', true)
  if (filtroTipo) query = query.eq('tipo', filtroTipo)
  if (filtroCategoria) query = query.eq('categoria', filtroCategoria)
  if (filtroPrecoMax) query = query.lte('preco', Number(filtroPrecoMax))
  if (filtroBusca) query = query.or(`bairro.ilike.%${filtroBusca}%,cidade.ilike.%${filtroBusca}%,titulo.ilike.%${filtroBusca}%`)

  if (cfg.ordenacao_imoveis === 'destaque') {
    query = query.order('destaque', { ascending: false }).order('created_at', { ascending: false })
  } else if (cfg.ordenacao_imoveis === 'recentes') {
    query = query.order('created_at', { ascending: false })
  } else if (cfg.ordenacao_imoveis === 'preco_asc') {
    query = query.order('preco', { ascending: true })
  } else if (cfg.ordenacao_imoveis === 'preco_desc') {
    query = query.order('preco', { ascending: false })
  }

  const { data: imoveis } = await query
  const temFiltro = filtroTipo || filtroCategoria || filtroPrecoMax || filtroBusca

  function urlFiltro(params: Record<string, string>) {
    const atual: Record<string, string> = {}
    if (filtroTipo) atual.tipo = filtroTipo
    if (filtroCategoria) atual.categoria = filtroCategoria
    if (filtroPrecoMax) atual.preco_max = filtroPrecoMax
    if (filtroBusca) atual.busca = filtroBusca
    const merged = { ...atual, ...params }
    const qs = Object.entries(merged).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join('&')
    return qs ? `/?${qs}#imoveis` : '/#imoveis'
  }

  function urlRemoveFiltro(chave: string) {
    const atual: Record<string, string> = {}
    if (filtroTipo) atual.tipo = filtroTipo
    if (filtroCategoria) atual.categoria = filtroCategoria
    if (filtroPrecoMax) atual.preco_max = filtroPrecoMax
    if (filtroBusca) atual.busca = filtroBusca
    delete atual[chave]
    const qs = Object.entries(atual).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join('&')
    return qs ? `/?${qs}#imoveis` : '/#imoveis'
  }

  const Banner = () => cfg.banner_ativo && cfg.banner_texto ? (
    <div style={{ background: cfg.banner_cor, padding: '10px 24px', textAlign: 'center' }}>
      <p style={{ color: cfg.banner_cor === '#0a0a0a' ? '#e8e0d0' : '#0a0a0a', fontSize: '13px', fontWeight: 500, letterSpacing: '1px' }}>{cfg.banner_texto}</p>
    </div>
  ) : null

  const filtroBtn = (ativo: boolean) => ({
    padding: '6px 16px',
    fontSize: '10px',
    letterSpacing: '2px',
    textTransform: 'uppercase' as const,
    textDecoration: 'none',
    border: 'none',
    borderBottom: ativo ? '1px solid #c9a84c' : '1px solid transparent',
    background: 'transparent',
    color: ativo ? '#c9a84c' : '#4a4438',
    cursor: 'pointer',
    display: 'inline-block',
    transition: 'all 0.2s',
  })

  return (
    <main style={{ background: '#0a0a0a', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <a
        href="https://wa.me/"
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-floating"
        aria-label="Falar no WhatsApp"
      >
        <svg
          className="whatsapp-floating-icon"
          viewBox="0 0 32 32"
          aria-hidden="true"
        >
          <path d="M16.04 3C8.86 3 3.04 8.82 3.04 16c0 2.29.6 4.53 1.74 6.5L3 29l6.67-1.75A12.93 12.93 0 0 0 16.04 29C23.22 29 29.04 23.18 29.04 16S23.22 3 16.04 3Zm0 23.7c-2.02 0-4-.54-5.72-1.57l-.41-.24-3.96 1.04 1.06-3.86-.27-.43A10.62 10.62 0 0 1 5.35 16c0-5.89 4.8-10.69 10.69-10.69 5.9 0 10.69 4.8 10.69 10.69 0 5.89-4.79 10.7-10.69 10.7Zm5.86-8.02c-.32-.16-1.9-.94-2.2-1.05-.29-.1-.5-.16-.72.16-.21.32-.82 1.05-1 1.27-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.74-.98-2.38-.26-.62-.52-.54-.72-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.08-1.11 2.64s1.14 3.07 1.3 3.28c.16.21 2.24 3.42 5.43 4.8.76.33 1.35.52 1.81.67.76.24 1.45.21 2 .13.61-.09 1.9-.78 2.17-1.53.27-.75.27-1.39.19-1.53-.08-.13-.29-.21-.61-.37Z" />
        </svg>
      </a>


      <style>{`
        .home-header { padding: 0 32px; }
        .home-header-logo { height: 52px; }
        .home-nav-links { display: flex; gap: 32px; }
        .home-hero { padding: 100px 32px 80px; }
        .home-hero h1 { font-size: 52px; }
        .imoveis-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }

        @media (max-width: 768px) {
          .home-header-inner {
            min-height: 78px !important;
            padding: 0 14px !important;
          }

          .home-header-logo {
            height: 54px !important;
            width: auto !important;
            max-width: 145px !important;
            object-fit: contain !important;
          }

          .home-header-inner a:has(.home-header-logo) {
            position: absolute !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            z-index: 5 !important;
          }

          .home-nav-links {
            width: 100% !important;
            display: grid !important;
            grid-template-columns: 1fr 145px 1fr !important;
            align-items: center !important;
            gap: 0 !important;
            position: relative !important;
            z-index: 6 !important;
          }

          .home-nav-links > a:first-child {
            justify-self: start !important;
            font-size: 13px !important;
            white-space: nowrap !important;
          }

          .home-nav-links > a:last-child {
            justify-self: end !important;
            font-size: 13px !important;
            white-space: nowrap !important;
            padding: 8px 10px !important;
          }
        }
        /* WhatsApp flutuante */
        .whatsapp-floating {
          position: fixed !important;
          right: 24px !important;
          bottom: 24px !important;
          width: 62px !important;
          height: 62px !important;
          border-radius: 999px !important;
          background: #25D366 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          z-index: 9999 !important;
          box-shadow: 0 18px 38px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.18) inset !important;
          transition: transform 0.2s ease, box-shadow 0.2s ease !important;
        }

        .whatsapp-floating:hover {
          transform: translateY(-3px) scale(1.03) !important;
          box-shadow: 0 22px 46px rgba(0, 0, 0, 0.42), 0 0 0 1px rgba(255, 255, 255, 0.22) inset !important;
        }

        .whatsapp-floating-icon {
          width: 34px !important;
          height: 34px !important;
          fill: #ffffff !important;
          display: block !important;
        }

        @media (max-width: 768px) {
          .home-header-inner {
            min-height: 84px !important;
            padding: 0 16px !important;
          }

          .home-nav-links {
            width: 100% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: flex-start !important;
            gap: 0 !important;
          }

          .home-header-logo {
            position: absolute !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            height: 58px !important;
            width: auto !important;
            max-width: 185px !important;
            object-fit: contain !important;
            z-index: 5 !important;
          }

          .home-header-inner a:has(.home-header-logo) {
            position: absolute !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            z-index: 5 !important;
          }

          .home-nav-links > a:first-child {
            justify-self: start !important;
            font-size: 13px !important;
            white-space: nowrap !important;
            z-index: 6 !important;
          }

          .whatsapp-floating {
            right: 18px !important;
            bottom: 88px !important;
            width: 58px !important;
            height: 58px !important;
          }

          .whatsapp-floating-icon {
            width: 32px !important;
            height: 32px !important;
          }
        }


      `}</style>

      {cfg.banner_posicao === 'topo' && <Banner />}

      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(201,168,76,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px' }}
        className="home-header">
        <img src="https://wabkkqbgfwufmxjutxsr.supabase.co/storage/v1/object/public/assets/LOGO%20MOTTA%20site.png" alt="Motta Corretor" className="home-header-logo" style={{ objectFit: 'contain' }} />
        <nav style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          <div className="home-nav-links">
            <a href="#imoveis" style={{ color: '#a09880', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', textDecoration: 'none' }}>Imóveis</a>
</div>
</nav>
      </header>

      {cfg.banner_posicao === 'abaixo_header' && <Banner />}

      <section className="home-hero" style={{
        background: cfg.hero_foto
          ? `linear-gradient(rgba(10,10,10,0.65), rgba(10,10,10,0.65)), url(${cfg.hero_foto}) center/cover no-repeat`
          : '#0f0e0c',
        textAlign: 'center',
        borderBottom: '1px solid rgba(201,168,76,0.15)'
      }}>
        <p style={{ fontSize: '11px', letterSpacing: '4px', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '16px' }}>{cfg.hero_subtitulo}</p>
        <h1 className="home-hero" style={{ fontFamily: 'Georgia,serif', fontWeight: 300, color: '#e8e0d0', lineHeight: 1.2, marginBottom: '12px' }}>{cfg.hero_titulo}</h1>
        <p style={{ fontSize: '13px', letterSpacing: '2px', color: '#6b6355', marginBottom: '48px', textTransform: 'uppercase' }}>{cfg.hero_descricao}</p>
      </section>

      {cfg.banner_posicao === 'antes_imoveis' && (
        <div style={{ maxWidth: '1200px', margin: '32px auto 0', padding: '0 32px' }}>
          <Banner />
        </div>
      )}

      <section id="imoveis" className="imoveis-section" style={{ maxWidth: '1200px', margin: '0 auto', padding: '64px 32px' }}>

        {/* Barra de busca */}
        <style>{`
          .busca-form { display: grid; grid-template-columns: 160px 160px 1fr auto; gap: 0; background: #0f0e0c; border: 1px solid rgba(201,168,76,0.25); margin-bottom: 56px; }
          .busca-select, .busca-input { background: transparent; border: none; border-right: 1px solid rgba(201,168,76,0.15); color: #e8e0d0; padding: 16px 18px; font-size: 13px; font-family: system-ui,sans-serif; outline: none; appearance: none; -webkit-appearance: none; cursor: pointer; width: 100%; }
          .busca-select option { background: #0f0e0c; color: #e8e0d0; }
          .busca-select:hover, .busca-input:hover { background: rgba(201,168,76,0.04); }
          .busca-input::placeholder { color: #4a4438; }
          .busca-btn { background: #c9a84c; color: #0a0a0a; border: none; padding: 16px 32px; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; font-weight: 700; cursor: pointer; white-space: nowrap; font-family: system-ui,sans-serif; }
          .busca-btn:hover { background: #d4b55c; }
          @media (max-width: 768px) {
            .busca-form { grid-template-columns: 1fr 1fr; }
            .busca-select:first-child { border-bottom: 1px solid rgba(201,168,76,0.15); }
            .busca-select:nth-child(2) { border-right: none; border-bottom: 1px solid rgba(201,168,76,0.15); }
            .busca-input { grid-column: 1/-1; border-right: none; border-bottom: 1px solid rgba(201,168,76,0.15); }
            .busca-btn { grid-column: 1/-1; padding: 16px; }
          }
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
          <input
            name="busca"
            defaultValue={sp?.busca || ''}
            className="busca-input"
            placeholder="Bairro ou cidade..."
            autoComplete="off"
          />
          <button type="submit" className="busca-btn">Buscar</button>
        </form>

        {temFiltro && (
          <div style={{ marginTop: '-40px', marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {filtroTipo && (
              <span style={{ fontSize: '11px', padding: '4px 12px', background: 'rgba(201,168,76,0.12)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.25)', letterSpacing: '1px' }}>
                {filtroTipo === 'venda' ? 'Comprar' : 'Alugar'}
                <Link href={urlRemoveFiltro('tipo')} style={{ marginLeft: '8px', color: '#6b6355', textDecoration: 'none' }}>✕</Link>
              </span>
            )}
            {filtroCategoria && (
              <span style={{ fontSize: '11px', padding: '4px 12px', background: 'rgba(201,168,76,0.12)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.25)', letterSpacing: '1px' }}>
                {filtroCategoria.charAt(0).toUpperCase() + filtroCategoria.slice(1)}
                <Link href={urlRemoveFiltro('categoria')} style={{ marginLeft: '8px', color: '#6b6355', textDecoration: 'none' }}>✕</Link>
              </span>
            )}
            {filtroPrecoMax && (
              <span style={{ fontSize: '11px', padding: '4px 12px', background: 'rgba(201,168,76,0.12)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.25)', letterSpacing: '1px' }}>
                Até R$ {Number(filtroPrecoMax).toLocaleString('pt-BR')}
                <Link href={urlRemoveFiltro('preco_max')} style={{ marginLeft: '8px', color: '#6b6355', textDecoration: 'none' }}>✕</Link>
              </span>
            )}
            {filtroBusca && (
              <span style={{ fontSize: '11px', padding: '4px 12px', background: 'rgba(201,168,76,0.12)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.25)', letterSpacing: '1px' }}>
                "{filtroBusca}"
                <Link href={urlRemoveFiltro('busca')} style={{ marginLeft: '8px', color: '#6b6355', textDecoration: 'none' }}>✕</Link>
              </span>
            )}
            <Link href="/#imoveis" style={{ fontSize: '11px', color: '#6b6355', letterSpacing: '1px', textDecoration: 'none', marginLeft: '4px' }}>limpar tudo →</Link>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <p style={{ fontSize: '11px', letterSpacing: '4px', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '4px' }}>Portfólio</p>
            <h2 style={{ fontFamily: 'Georgia,serif', fontSize: '32px', fontWeight: 300, color: '#e8e0d0' }}>Imóveis disponíveis</h2>
          </div>
          {imoveis && imoveis.length > 0 && (
            <p style={{ fontSize: '11px', color: '#4a4438', letterSpacing: '1px' }}>
              {imoveis.length} encontrado{imoveis.length !== 1 ? 's' : ''}
              {temFiltro && <span style={{ color: '#c9a84c' }}> · filtrado</span>}
            </p>
          )}
        </div>

        {imoveis && imoveis.length > 0 ? (
          <div className="imoveis-grid">
            {imoveis.map((imovel) => (
              <CardImovel key={imovel.id} imovel={imovel} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>⌂</p>
            <p style={{ fontSize: '18px', color: '#6b6355', marginBottom: '16px' }}>
              {temFiltro ? 'Nenhum imóvel com esses filtros.' : 'Nenhum imóvel cadastrado ainda.'}
            </p>
            {temFiltro && (
              <Link href="/#imoveis" style={{ color: '#c9a84c', fontSize: '12px', letterSpacing: '2px', textDecoration: 'none' }}>Limpar filtros →</Link>
            )}
          </div>
        )}
      </section>

      {cfg.banner_posicao === 'rodape' && (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 32px 32px' }}>
          <Banner />
        </div>
      )}

      <section id="contato" className="contato-section" style={{ background: '#0f0e0c', padding: '80px 32px', textAlign: 'center', borderTop: '1px solid rgba(201,168,76,0.15)' }}>
        <p style={{ fontSize: '11px', letterSpacing: '4px', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '16px' }}>Fale conosco</p>
        <h2 style={{ fontFamily: 'Georgia,serif', fontSize: '36px', fontWeight: 300, color: '#e8e0d0', marginBottom: '8px' }}>Encontrou o imóvel ideal?</h2>
        <p style={{ fontSize: '12px', letterSpacing: '2px', color: '#6b6355', marginBottom: '32px', textTransform: 'uppercase' }}>Entre em contato e agende uma visita</p>
        <a href={`https://wa.me/${cfg.whatsapp}`} target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: '#c9a84c', color: '#0a0a0a', fontSize: '12px', letterSpacing: '3px', padding: '16px 40px', textTransform: 'uppercase', fontWeight: 600, textDecoration: 'none' }}>Falar no WhatsApp</a>
      </section>

      <footer className="footer-home" style={{ background: '#070706', padding: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(201,168,76,0.15)', flexWrap: 'wrap', gap: '16px' }}>
        <img src="/LOGO_transparente_final.png" alt="Motta Corretor" style={{ height: '36px', objectFit: 'contain' }} />
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '11px', color: '#4a4438', letterSpacing: '1px' }}>{cfg.cidade} · CRECI {cfg.creci}</p>
          {cfg.rodape_texto && <p style={{ fontSize: '11px', color: '#4a4438', letterSpacing: '1px', marginTop: '4px' }}>{cfg.rodape_texto}</p>}
        </div>
      </footer>
    </main>
  )
}
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import CardImovel from '@/components/CardImovel'

export default async function Home({ searchParams }: { searchParams: any }) {
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

  const filtroTipo = searchParams?.tipo || ''
  const filtroCategoria = searchParams?.categoria || ''
  const filtroPrecoMax = searchParams?.preco_max || ''

  let query = supabase.from('imoveis').select('*').eq('ativo', true)
  if (filtroTipo) query = query.eq('tipo', filtroTipo)
  if (filtroCategoria) query = query.eq('categoria', filtroCategoria)
  if (filtroPrecoMax) query = query.lte('preco', Number(filtroPrecoMax))

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
  const temFiltro = filtroTipo || filtroCategoria || filtroPrecoMax

  function urlFiltro(params: Record<string, string>) {
    const atual: Record<string, string> = {}
    if (filtroTipo) atual.tipo = filtroTipo
    if (filtroCategoria) atual.categoria = filtroCategoria
    if (filtroPrecoMax) atual.preco_max = filtroPrecoMax
    const merged = { ...atual, ...params }
    const qs = Object.entries(merged).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join('&')
    return qs ? `/?${qs}#imoveis` : '/#imoveis'
  }

  function urlRemoveFiltro(chave: string) {
    const atual: Record<string, string> = {}
    if (filtroTipo) atual.tipo = filtroTipo
    if (filtroCategoria) atual.categoria = filtroCategoria
    if (filtroPrecoMax) atual.preco_max = filtroPrecoMax
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

      {cfg.banner_posicao === 'topo' && <Banner />}

      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,10,0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(201,168,76,0.25)', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px' }}>
        <img src="/LOGO_transparente_final.png" alt="Motta Corretor" style={{ height: '52px', objectFit: 'contain' }} />
        <nav style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          <a href="#imoveis" style={{ color: '#a09880', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', textDecoration: 'none' }}>Imóveis</a>
          <a href="#contato" style={{ color: '#a09880', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', textDecoration: 'none' }}>Contato</a>
          <a href={`https://wa.me/${cfg.whatsapp}`} target="_blank" rel="noreferrer" style={{ background: '#c9a84c', color: '#0a0a0a', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', padding: '10px 20px', fontWeight: 600, textDecoration: 'none' }}>WhatsApp</a>
        </nav>
      </header>

      {cfg.banner_posicao === 'abaixo_header' && <Banner />}

      <section style={{
        background: cfg.hero_foto
          ? `linear-gradient(rgba(10,10,10,0.65), rgba(10,10,10,0.65)), url(${cfg.hero_foto}) center/cover no-repeat`
          : '#0f0e0c',
        padding: '100px 32px 80px',
        textAlign: 'center',
        borderBottom: '1px solid rgba(201,168,76,0.15)'
      }}>
        <p style={{ fontSize: '11px', letterSpacing: '4px', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '16px' }}>{cfg.hero_subtitulo}</p>
        <h1 style={{ fontFamily: 'Georgia,serif', fontSize: '52px', fontWeight: 300, color: '#e8e0d0', lineHeight: 1.2, marginBottom: '12px' }}>{cfg.hero_titulo}</h1>
        <p style={{ fontSize: '13px', letterSpacing: '2px', color: '#6b6355', marginBottom: '48px', textTransform: 'uppercase' }}>{cfg.hero_descricao}</p>
      </section>

      {cfg.banner_posicao === 'antes_imoveis' && (
        <div style={{ maxWidth: '1200px', margin: '32px auto 0', padding: '0 32px' }}>
          <Banner />
        </div>
      )}

      <section id="imoveis" style={{ maxWidth: '1200px', margin: '0 auto', padding: '64px 32px' }}>

        {/* Filtros elegantes — linha única */}
        <div style={{ borderBottom: '1px solid rgba(201,168,76,0.12)', marginBottom: '48px', paddingBottom: '0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0', flexWrap: 'wrap' }}>

            {/* Tipo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0', borderRight: '1px solid rgba(201,168,76,0.12)', paddingRight: '24px', marginRight: '24px' }}>
              <Link href={urlRemoveFiltro('tipo')} style={filtroBtn(!filtroTipo)}>Todos</Link>
              <Link href={urlFiltro({ tipo: 'venda' })} style={filtroBtn(filtroTipo === 'venda')}>Venda</Link>
              <Link href={urlFiltro({ tipo: 'aluguel' })} style={filtroBtn(filtroTipo === 'aluguel')}>Aluguel</Link>
            </div>

            {/* Categoria */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0', borderRight: '1px solid rgba(201,168,76,0.12)', paddingRight: '24px', marginRight: '24px' }}>
              <Link href={urlFiltro({ categoria: 'casa' })} style={filtroBtn(filtroCategoria === 'casa')}>Casa</Link>
              <Link href={urlFiltro({ categoria: 'apartamento' })} style={filtroBtn(filtroCategoria === 'apartamento')}>Apto</Link>
              <Link href={urlFiltro({ categoria: 'terreno' })} style={filtroBtn(filtroCategoria === 'terreno')}>Terreno</Link>
              <Link href={urlFiltro({ categoria: 'comercial' })} style={filtroBtn(filtroCategoria === 'comercial')}>Comercial</Link>
            </div>

            {/* Preço */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0', flex: 1 }}>
              {[
                { label: 'Até 200k', value: '200000' },
                { label: 'Até 400k', value: '400000' },
                { label: 'Até 600k', value: '600000' },
                { label: 'Até 1M', value: '1000000' },
              ].map(f => (
                <Link key={f.value} href={urlFiltro({ preco_max: f.value })} style={filtroBtn(filtroPrecoMax === f.value)}>{f.label}</Link>
              ))}
            </div>

            {/* Limpar */}
            {temFiltro && (
              <Link href="/#imoveis" style={{ fontSize: '10px', color: '#6b6355', letterSpacing: '1px', textDecoration: 'none', padding: '6px 12px', border: '1px solid rgba(201,168,76,0.15)', marginLeft: 'auto' }}>
                ✕ limpar
              </Link>
            )}
          </div>
        </div>

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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '1px', background: 'rgba(201,168,76,0.15)' }}>
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

      <section id="contato" style={{ background: '#0f0e0c', padding: '80px 32px', textAlign: 'center', borderTop: '1px solid rgba(201,168,76,0.15)' }}>
        <p style={{ fontSize: '11px', letterSpacing: '4px', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '16px' }}>Fale conosco</p>
        <h2 style={{ fontFamily: 'Georgia,serif', fontSize: '36px', fontWeight: 300, color: '#e8e0d0', marginBottom: '8px' }}>Encontrou o imóvel ideal?</h2>
        <p style={{ fontSize: '12px', letterSpacing: '2px', color: '#6b6355', marginBottom: '32px', textTransform: 'uppercase' }}>Entre em contato e agende uma visita</p>
        <a href={`https://wa.me/${cfg.whatsapp}`} target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: '#c9a84c', color: '#0a0a0a', fontSize: '12px', letterSpacing: '3px', padding: '16px 40px', textTransform: 'uppercase', fontWeight: 600, textDecoration: 'none' }}>Falar no WhatsApp</a>
      </section>

      <footer style={{ background: '#070706', padding: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(201,168,76,0.15)', flexWrap: 'wrap', gap: '16px' }}>
        <img src="/LOGO_transparente_final.png" alt="Motta Corretor" style={{ height: '36px', objectFit: 'contain' }} />
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '11px', color: '#4a4438', letterSpacing: '1px' }}>{cfg.cidade} · CRECI {cfg.creci}</p>
          {cfg.rodape_texto && <p style={{ fontSize: '11px', color: '#4a4438', letterSpacing: '1px', marginTop: '4px' }}>{cfg.rodape_texto}</p>}
        </div>
      </footer>
    </main>
  )
}

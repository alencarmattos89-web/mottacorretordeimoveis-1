import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default async function Home() {
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

  // Ordenação dos imóveis
  let query = supabase.from('imoveis').select('*').eq('ativo', true)
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

  const Banner = () => cfg.banner_ativo && cfg.banner_texto ? (
    <div style={{ background: cfg.banner_cor, padding: '10px 24px', textAlign: 'center' }}>
      <p style={{ color: cfg.banner_cor === '#0a0a0a' ? '#e8e0d0' : '#0a0a0a', fontSize: '13px', fontWeight: 500, letterSpacing: '1px' }}>{cfg.banner_texto}</p>
    </div>
  ) : null

  return (
    <main style={{ background: '#0a0a0a', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>

      {/* Banner topo */}
      {cfg.banner_posicao === 'topo' && <Banner />}

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,10,0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(201,168,76,0.25)', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px' }}>
        <img src="/LOGO_transparente_final.png" alt="Motta Corretor" style={{ height: '52px', objectFit: 'contain' }} />
        <nav style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          <a href="#imoveis" style={{ color: '#a09880', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', textDecoration: 'none' }}>Imóveis</a>
          <a href="#contato" style={{ color: '#a09880', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', textDecoration: 'none' }}>Contato</a>
          <a href={`https://wa.me/${cfg.whatsapp}`} target="_blank" rel="noreferrer" style={{ background: '#c9a84c', color: '#0a0a0a', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', padding: '10px 20px', fontWeight: 600, textDecoration: 'none' }}>WhatsApp</a>
        </nav>
      </header>

      {/* Banner abaixo do header */}
      {cfg.banner_posicao === 'abaixo_header' && <Banner />}

      {/* Hero */}
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

      {/* Banner antes dos imóveis */}
      {cfg.banner_posicao === 'antes_imoveis' && (
        <div style={{ maxWidth: '1200px', margin: '32px auto 0', padding: '0 32px' }}>
          <Banner />
        </div>
      )}

      {/* Imóveis */}
      <section id="imoveis" style={{ maxWidth: '1200px', margin: '0 auto', padding: '64px 32px' }}>
        <p style={{ fontSize: '11px', letterSpacing: '4px', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '8px' }}>Portfólio</p>
        <h2 style={{ fontFamily: 'Georgia,serif', fontSize: '32px', fontWeight: 300, color: '#e8e0d0', marginBottom: '40px' }}>Imóveis disponíveis</h2>
        {imoveis && imoveis.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '1px', background: 'rgba(201,168,76,0.15)' }}>
            {imoveis.map((imovel) => (
              <Link key={imovel.id} href={'/imovel/' + imovel.id} style={{ textDecoration: 'none' }}>
                <div style={{ background: '#0f0e0c', cursor: 'pointer' }}>
                  <div style={{ height: '220px', background: '#1a1814', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {imovel.fotos && imovel.fotos[0] ? (
                      <img src={imovel.fotos[0]} alt={imovel.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ color: '#3a3528', fontSize: '48px' }}>⌂</span>
                    )}
                    <span style={{ position: 'absolute', top: '12px', left: '12px', fontSize: '10px', letterSpacing: '2px', padding: '4px 10px', textTransform: 'uppercase', fontWeight: 500, background: imovel.tipo === 'venda' ? '#c9a84c' : 'transparent', color: imovel.tipo === 'venda' ? '#0a0a0a' : '#c9a84c', border: imovel.tipo === 'aluguel' ? '1px solid rgba(201,168,76,0.5)' : 'none' }}>
                      {imovel.tipo === 'venda' ? 'Venda' : 'Aluguel'}
                    </span>
                    {imovel.destaque && (
                      <span style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '10px', padding: '4px 10px', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.4)' }}>Destaque</span>
                    )}
                  </div>
                  <div style={{ padding: '24px' }}>
                    <h3 style={{ fontFamily: 'Georgia,serif', fontSize: '20px', fontWeight: 400, color: '#e8e0d0', marginBottom: '4px' }}>{imovel.titulo}</h3>
                    <p style={{ fontSize: '11px', letterSpacing: '1px', color: '#6b6355', marginBottom: '16px' }}>{imovel.bairro} · {imovel.cidade}</p>
                    <div style={{ display: 'flex', gap: '20px', fontSize: '11px', color: '#8a7d6a', marginBottom: '20px', letterSpacing: '1px' }}>
                      {imovel.quartos > 0 && <span>{imovel.quartos} quartos</span>}
                      {imovel.area > 0 && <span>{imovel.area} m²</span>}
                      {imovel.vagas > 0 && <span>{imovel.vagas} vagas</span>}
                    </div>
                    <p style={{ fontFamily: 'Georgia,serif', fontSize: '24px', color: '#c9a84c', fontWeight: 400 }}>
                      {imovel.mostrar_preco === false
                        ? 'Sob consulta'
                        : <>R$ {Number(imovel.preco).toLocaleString('pt-BR')}{imovel.tipo === 'aluguel' && <span style={{ fontSize: '13px', color: '#6b6355', fontFamily: 'system-ui' }}>/mês</span>}</>
                      }
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>⌂</p>
            <p style={{ fontSize: '18px', color: '#6b6355' }}>Nenhum imóvel cadastrado ainda.</p>
          </div>
        )}
      </section>

      {/* Banner antes do rodapé */}
      {cfg.banner_posicao === 'rodape' && (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 32px 32px' }}>
          <Banner />
        </div>
      )}

      {/* CTA contato */}
      <section id="contato" style={{ background: '#0f0e0c', padding: '80px 32px', textAlign: 'center', borderTop: '1px solid rgba(201,168,76,0.15)' }}>
        <p style={{ fontSize: '11px', letterSpacing: '4px', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '16px' }}>Fale conosco</p>
        <h2 style={{ fontFamily: 'Georgia,serif', fontSize: '36px', fontWeight: 300, color: '#e8e0d0', marginBottom: '8px' }}>Encontrou o imóvel ideal?</h2>
        <p style={{ fontSize: '12px', letterSpacing: '2px', color: '#6b6355', marginBottom: '32px', textTransform: 'uppercase' }}>Entre em contato e agende uma visita</p>
        <a href={`https://wa.me/${cfg.whatsapp}`} target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: '#c9a84c', color: '#0a0a0a', fontSize: '12px', letterSpacing: '3px', padding: '16px 40px', textTransform: 'uppercase', fontWeight: 600, textDecoration: 'none' }}>Falar no WhatsApp</a>
      </section>

      {/* Footer */}
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

'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useParams } from 'next/navigation'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const WHATSAPP = '5555992290166'

export default function ImovelPage() {
  const params = useParams()
  const id = params.id as string
  const [imovel, setImovel] = useState<any>(null)
  const [semelhantes, setSemelhantes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [fotoAtiva, setFotoAtiva] = useState(0)
  const [form, setForm] = useState({ nome: '', telefone: '', email: '' })
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase
        .from('imoveis')
        .select('*')
        .eq('id', id)
        .eq('ativo', true)
        .single()
      setImovel(data)
      if (data) await carregarSemelhantes(data)
      setLoading(false)
    }
    carregar()
    setFotoAtiva(0)
  }, [id])

  async function carregarSemelhantes(atual: any) {
    // Busca mesmo tipo + mesma categoria, exclui o atual
    const { data: prioridade } = await supabase
      .from('imoveis')
      .select('*')
      .eq('ativo', true)
      .eq('tipo', atual.tipo)
      .eq('categoria', atual.categoria)
      .neq('id', atual.id)
      .limit(3)

    if (prioridade && prioridade.length >= 3) {
      setSemelhantes(prioridade)
      return
    }

    // Completa com mesmo tipo, qualquer categoria
    const jaTemIds = [atual.id, ...(prioridade || []).map((i: any) => i.id)]
    const faltam = 3 - (prioridade?.length || 0)
    const { data: complemento } = await supabase
      .from('imoveis')
      .select('*')
      .eq('ativo', true)
      .eq('tipo', atual.tipo)
      .not('id', 'in', `(${jaTemIds.join(',')})`)
      .limit(faltam)

    setSemelhantes([...(prioridade || []), ...(complemento || [])])
  }

  async function handleSubmit(e: any) {
    e.preventDefault()
    setEnviando(true)
    await supabase.from('leads').insert({
      nome: form.nome,
      telefone: form.telefone,
      imovel_id: imovel.id,
      imovel_titulo: imovel.titulo,
    })
    setEnviado(true)
    setEnviando(false)
  }

  function mensagemWhatsApp() {
    const texto = `Olá! Tenho interesse no imóvel: *${imovel.titulo}* — ${imovel.bairro}, ${imovel.cidade}.`
    return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`
  }

  if (loading) return (
    <main style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6b6355', letterSpacing: '2px', fontSize: '12px' }}>CARREGANDO...</p>
    </main>
  )

  if (!imovel) return (
    <main style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
      <p style={{ color: '#e8e0d0', fontFamily: 'Georgia,serif', fontSize: '24px' }}>Imóvel não encontrado</p>
      <Link href="/" style={{ color: '#c9a84c', fontSize: '12px', letterSpacing: '2px' }}>← Voltar ao início</Link>
    </main>
  )

  const fotos = imovel.fotos && imovel.fotos.length > 0 ? imovel.fotos : []

  return (
    <main style={{ background: '#0a0a0a', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(201,168,76,0.25)', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px' }}>
        <Link href="/">
          <img src="/LOGO_transparente_final.png" alt="Motta Corretor" style={{ height: '52px', objectFit: 'contain' }} />
        </Link>
        <nav style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          <Link href="/" style={{ color: '#a09880', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', textDecoration: 'none' }}>← Imóveis</Link>
          <a href={mensagemWhatsApp()} target="_blank" rel="noreferrer" style={{ background: '#c9a84c', color: '#0a0a0a', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', padding: '10px 20px', fontWeight: 600, textDecoration: 'none' }}>WhatsApp</a>
        </nav>
      </header>

      {/* Galeria */}
      {fotos.length > 0 && (
        <div style={{ background: '#0a0a0a', position: 'relative' }}>
          <div style={{ width: '100%', height: '520px', overflow: 'hidden', position: 'relative' }}>
            <img src={fotos[fotoAtiva]} alt={imovel.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 60%, rgba(10,10,10,0.8) 100%)' }} />
            <div style={{ position: 'absolute', top: '24px', left: '24px', display: 'flex', gap: '8px' }}>
              <span style={{ fontSize: '10px', letterSpacing: '2px', padding: '5px 12px', textTransform: 'uppercase', fontWeight: 500, background: imovel.tipo === 'venda' ? '#c9a84c' : 'transparent', color: imovel.tipo === 'venda' ? '#0a0a0a' : '#c9a84c', border: imovel.tipo === 'aluguel' ? '1px solid rgba(201,168,76,0.5)' : 'none' }}>
                {imovel.tipo === 'venda' ? 'Venda' : 'Aluguel'}
              </span>
              {imovel.destaque && (
                <span style={{ fontSize: '10px', padding: '5px 12px', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.4)', letterSpacing: '1px' }}>Destaque</span>
              )}
            </div>
            {fotos.length > 1 && (
              <>
                <button onClick={() => setFotoAtiva(f => Math.max(0, f - 1))} disabled={fotoAtiva === 0} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(10,10,10,0.6)', border: '1px solid rgba(201,168,76,0.3)', color: '#e8e0d0', width: '44px', height: '44px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
                <button onClick={() => setFotoAtiva(f => Math.min(fotos.length - 1, f + 1))} disabled={fotoAtiva === fotos.length - 1} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(10,10,10,0.6)', border: '1px solid rgba(201,168,76,0.3)', color: '#e8e0d0', width: '44px', height: '44px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
                <div style={{ position: 'absolute', bottom: '16px', right: '24px', color: '#a09880', fontSize: '12px', letterSpacing: '2px' }}>{fotoAtiva + 1} / {fotos.length}</div>
              </>
            )}
          </div>
          {fotos.length > 1 && (
            <div style={{ display: 'flex', gap: '4px', padding: '4px', background: '#080807', overflowX: 'auto' }}>
              {fotos.map((foto: string, i: number) => (
                <button key={i} onClick={() => setFotoAtiva(i)} style={{ flexShrink: 0, width: '80px', height: '56px', padding: 0, border: i === fotoAtiva ? '2px solid #c9a84c' : '2px solid transparent', cursor: 'pointer', overflow: 'hidden' }}>
                  <img src={foto} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conteúdo principal */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '56px 32px', display: 'grid', gridTemplateColumns: '1fr 360px', gap: '48px', alignItems: 'start' }}>
        <div>
          <p style={{ fontSize: '11px', letterSpacing: '3px', color: '#6b6355', textTransform: 'uppercase', marginBottom: '8px' }}>{imovel.bairro} · {imovel.cidade}</p>
          <h1 style={{ fontFamily: 'Georgia,serif', fontSize: '40px', fontWeight: 300, color: '#e8e0d0', lineHeight: 1.2, marginBottom: '16px' }}>{imovel.titulo}</h1>
          <p style={{ fontFamily: 'Georgia,serif', fontSize: '32px', color: '#c9a84c', fontWeight: 400, marginBottom: '32px' }}>
            {imovel.mostrar_preco === false ? 'Sob consulta' : <>R$ {Number(imovel.preco).toLocaleString('pt-BR')}{imovel.tipo === 'aluguel' && <span style={{ fontSize: '16px', color: '#6b6355', fontFamily: 'system-ui' }}>/mês</span>}</>}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '1px', background: 'rgba(201,168,76,0.15)', marginBottom: '40px' }}>
            {imovel.area > 0 && (
              <div style={{ background: '#0f0e0c', padding: '20px 28px', flex: '1', minWidth: '100px', textAlign: 'center' as const }}>
                <p style={{ fontFamily: 'Georgia,serif', fontSize: '28px', color: '#e8e0d0', fontWeight: 300 }}>{imovel.area}</p>
                <p style={{ fontSize: '10px', letterSpacing: '2px', color: '#6b6355', textTransform: 'uppercase' as const }}>m²</p>
              </div>
            )}
            {imovel.quartos > 0 && (
              <div style={{ background: '#0f0e0c', padding: '20px 28px', flex: '1', minWidth: '100px', textAlign: 'center' as const }}>
                <p style={{ fontFamily: 'Georgia,serif', fontSize: '28px', color: '#e8e0d0', fontWeight: 300 }}>{imovel.quartos}</p>
                <p style={{ fontSize: '10px', letterSpacing: '2px', color: '#6b6355', textTransform: 'uppercase' as const }}>Quartos</p>
              </div>
            )}
            {imovel.banheiros > 0 && (
              <div style={{ background: '#0f0e0c', padding: '20px 28px', flex: '1', minWidth: '100px', textAlign: 'center' as const }}>
                <p style={{ fontFamily: 'Georgia,serif', fontSize: '28px', color: '#e8e0d0', fontWeight: 300 }}>{imovel.banheiros}</p>
                <p style={{ fontSize: '10px', letterSpacing: '2px', color: '#6b6355', textTransform: 'uppercase' as const }}>Banheiros</p>
              </div>
            )}
            {imovel.vagas > 0 && (
              <div style={{ background: '#0f0e0c', padding: '20px 28px', flex: '1', minWidth: '100px', textAlign: 'center' as const }}>
                <p style={{ fontFamily: 'Georgia,serif', fontSize: '28px', color: '#e8e0d0', fontWeight: 300 }}>{imovel.vagas}</p>
                <p style={{ fontSize: '10px', letterSpacing: '2px', color: '#6b6355', textTransform: 'uppercase' as const }}>Vagas</p>
              </div>
            )}
          </div>

          {imovel.descricao && (
            <div style={{ marginBottom: '40px' }}>
              <p style={{ fontSize: '11px', letterSpacing: '3px', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '16px' }}>Descrição</p>
              <p style={{ color: '#a09880', fontSize: '15px', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{imovel.descricao}</p>
            </div>
          )}

          {imovel.endereco && (
            <div>
              <p style={{ fontSize: '11px', letterSpacing: '3px', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '8px' }}>Localização</p>
              <p style={{ color: '#6b6355', fontSize: '14px', letterSpacing: '1px' }}>{imovel.endereco} — {imovel.bairro}, {imovel.cidade}</p>
            </div>
          )}
        </div>

        {/* CTA lateral */}
        <div style={{ position: 'sticky', top: '96px' }}>
          <a href={mensagemWhatsApp()} target="_blank" rel="noreferrer" style={{ display: 'block', background: '#25D366', color: '#fff', textAlign: 'center', padding: '18px', fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600, textDecoration: 'none', marginBottom: '1px' }}>
            Falar no WhatsApp
          </a>
          <div style={{ background: '#0f0e0c', border: '1px solid rgba(201,168,76,0.2)', padding: '32px' }}>
            <p style={{ fontSize: '11px', letterSpacing: '3px', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '8px' }}>Interesse</p>
            <p style={{ fontFamily: 'Georgia,serif', fontSize: '20px', color: '#e8e0d0', fontWeight: 300, marginBottom: '24px' }}>Quero saber mais</p>
            {enviado ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <p style={{ fontSize: '32px', marginBottom: '12px' }}>✓</p>
                <p style={{ color: '#c9a84c', fontSize: '13px', letterSpacing: '1px', marginBottom: '8px' }}>Mensagem enviada!</p>
                <p style={{ color: '#6b6355', fontSize: '12px' }}>Entraremos em contato em breve.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {[
                  { label: 'Nome', name: 'nome', type: 'text', required: true },
                  { label: 'Telefone', name: 'telefone', type: 'tel', required: true },
                  { label: 'E-mail (opcional)', name: 'email', type: 'email', required: false },
                ].map(({ label, name, type, required }) => (
                  <div key={name} style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '10px', letterSpacing: '2px', color: '#6b6355', textTransform: 'uppercase', marginBottom: '6px' }}>{label}</label>
                    <input
                      type={type}
                      required={required}
                      value={(form as any)[name]}
                      onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
                      style={{ width: '100%', background: '#1a1814', border: '1px solid rgba(201,168,76,0.2)', color: '#e8e0d0', padding: '10px 14px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
                <button type="submit" disabled={enviando} style={{ width: '100%', background: '#c9a84c', color: '#0a0a0a', border: 'none', padding: '14px', fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer', marginTop: '8px' }}>
                  {enviando ? 'Enviando...' : 'Demonstrar interesse'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Imóveis semelhantes */}
      {semelhantes.length > 0 && (
        <section style={{ borderTop: '1px solid rgba(201,168,76,0.15)', padding: '64px 32px' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <p style={{ fontSize: '11px', letterSpacing: '4px', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '8px' }}>Veja também</p>
            <h2 style={{ fontFamily: 'Georgia,serif', fontSize: '26px', fontWeight: 300, color: '#e8e0d0', marginBottom: '32px' }}>Imóveis semelhantes</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1px', background: 'rgba(201,168,76,0.15)' }}>
              {semelhantes.map((s) => (
                <Link key={s.id} href={`/imovel/${s.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ background: '#0f0e0c', cursor: 'pointer' }}>
                    <div style={{ height: '180px', background: '#1a1814', position: 'relative', overflow: 'hidden' }}>
                      {s.fotos?.[0] ? (
                        <img src={s.fotos[0]} alt={s.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ color: '#3a3528', fontSize: '36px' }}>⌂</span>
                        </div>
                      )}
                      <span style={{ position: 'absolute', top: '10px', left: '10px', fontSize: '9px', letterSpacing: '2px', padding: '3px 8px', textTransform: 'uppercase', fontWeight: 500, background: s.tipo === 'venda' ? '#c9a84c' : 'transparent', color: s.tipo === 'venda' ? '#0a0a0a' : '#c9a84c', border: s.tipo === 'aluguel' ? '1px solid rgba(201,168,76,0.5)' : 'none' }}>
                        {s.tipo === 'venda' ? 'Venda' : 'Aluguel'}
                      </span>
                    </div>
                    <div style={{ padding: '18px 20px' }}>
                      <h3 style={{ fontFamily: 'Georgia,serif', fontSize: '16px', fontWeight: 400, color: '#e8e0d0', marginBottom: '4px' }}>{s.titulo}</h3>
                      <p style={{ fontSize: '11px', color: '#6b6355', marginBottom: '12px', letterSpacing: '0.5px' }}>{s.bairro} · {s.cidade}</p>
                      <div style={{ display: 'flex', gap: '14px', fontSize: '11px', color: '#8a7d6a', marginBottom: '12px' }}>
                        {s.quartos > 0 && <span>{s.quartos} qtos</span>}
                        {s.area > 0 && <span>{s.area} m²</span>}
                        {s.vagas > 0 && <span>{s.vagas} vagas</span>}
                      </div>
                      <p style={{ fontFamily: 'Georgia,serif', fontSize: '18px', color: '#c9a84c' }}>
                        {s.mostrar_preco === false ? 'Sob consulta' : <>R$ {Number(s.preco).toLocaleString('pt-BR')}{s.tipo === 'aluguel' && <span style={{ fontSize: '12px', color: '#6b6355', fontFamily: 'system-ui' }}>/mês</span>}</>}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer style={{ background: '#070706', padding: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(201,168,76,0.15)' }}>
        <img src="/LOGO_transparente_final.png" alt="Motta Corretor" style={{ height: '36px', objectFit: 'contain' }} />
        <p style={{ fontSize: '11px', color: '#4a4438', letterSpacing: '1px' }}>Cruz Alta — RS · CRECI 12.857</p>
      </footer>
    </main>
  )
}

'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useParams } from 'next/navigation'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const IconeWhatsApp = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

function mascaraTelefone(valor: string): string {
  const digits = valor.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits.length ? `(${digits}` : ''
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function formatarParaExibicao(valor: string): string {
  return mascaraTelefone(valor.replace(/\D/g, ''))
}

function telefoneValido(valor: string): boolean {
  return valor.replace(/\D/g, '').length >= 10
}

export default function ImovelClient({ id: idProp, imovelInicial }: { id?: string; imovelInicial?: any }) {
  const params = useParams()
  const id = (idProp ?? params?.id) as string
  const [imovel, setImovel] = useState<any>(imovelInicial || null)
  const [semelhantes, setSemelhantes] = useState<any[]>([])
  const [loading, setLoading] = useState(!imovelInicial)
  const [fotoAtiva, setFotoAtiva] = useState(0)
  const [form, setForm] = useState({ nome: '', telefone: '', email: '' })
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [compartilhado, setCompartilhado] = useState(false)
  const [whatsapp, setWhatsapp] = useState('5555992290166')
  const [creci, setCreci] = useState('12.857')
  const [cidade, setCidade] = useState('Cruz Alta — RS')
  const [modalConfirmacao, setModalConfirmacao] = useState(false)
  const [erroTelefone, setErroTelefone] = useState('')

  useEffect(() => {
    async function carregar() {
      const [imovelData, { data: config }] = await Promise.all([
        imovelInicial
          ? Promise.resolve({ data: imovelInicial })
          : supabase.from('imoveis').select('*').eq('id', id).eq('ativo', true).single(),
        supabase.from('configuracoes').select('whatsapp,creci,cidade').eq('id', 'site').single(),
      ])
      const data = imovelInicial || (imovelData as any).data
      if (!imovelInicial) setImovel(data)
      if (config) {
        if (config.whatsapp) setWhatsapp(config.whatsapp)
        if (config.creci) setCreci(config.creci)
        if (config.cidade) setCidade(config.cidade)
      }
      if (data) await carregarSemelhantes(data)
      setLoading(false)
    }
    carregar()
    setFotoAtiva(0)
    setEnviado(false)
    setForm({ nome: '', telefone: '', email: '' })
  }, [id])

  async function carregarSemelhantes(atual: any) {
    const { data: prioridade } = await supabase
      .from('imoveis').select('*').eq('ativo', true)
      .eq('tipo', atual.tipo).eq('categoria', atual.categoria)
      .neq('id', atual.id).limit(3)
    if (prioridade && prioridade.length >= 3) { setSemelhantes(prioridade); return }
    const jaTemIds = [atual.id, ...(prioridade || []).map((i: any) => i.id)]
    const faltam = 3 - (prioridade?.length || 0)
    const { data: complemento } = await supabase
      .from('imoveis').select('*').eq('ativo', true).eq('tipo', atual.tipo)
      .not('id', 'in', `(${jaTemIds.join(',')})`).limit(faltam)
    setSemelhantes([...(prioridade || []), ...(complemento || [])])
  }

  async function registrarLead(origem: 'formulario' | 'whatsapp_click', dados: Partial<typeof form> = {}) {
    const paginaUrl = typeof window !== 'undefined' ? `${window.location.origin}/imovel/${imovel.id}` : null
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: dados.nome || form.nome || 'Lead via WhatsApp',
        telefone: dados.telefone || form.telefone || '',
        email: dados.email || form.email || null,
        imovel_id: imovel.id,
        imovel_titulo: imovel.titulo,
        origem,
        pagina_url: paginaUrl,
        corretor_whatsapp: whatsapp,
        temperatura: origem === 'whatsapp_click' ? 'quente' : 'morno',
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || 'Erro ao criar lead')
    return data
  }

  function handleSubmit(e: any) {
    e.preventDefault()
    setErroTelefone('')
    if (!telefoneValido(form.telefone)) {
      setErroTelefone('Digite um número válido com DDD (ex: 55 99999-9999).')
      return
    }
    setModalConfirmacao(true)
  }

  async function confirmarEEnviar() {
    setModalConfirmacao(false)
    setEnviando(true)
    try {
      await registrarLead('formulario', form)
      setEnviado(true)
      setForm({ nome: '', telefone: '', email: '' })
    } catch (err) {
      console.error('Erro ao enviar lead:', err)
      alert('Não foi possível enviar seu interesse. Tente novamente ou chame pelo WhatsApp.')
    } finally {
      setEnviando(false)
    }
  }

  function mensagemWhatsApp(leadId?: string | number) {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/imovel/${imovel.id}` : ''
    const linhas = [
      `Olá! Tenho interesse no imóvel: *${imovel.titulo}* — ${imovel.bairro}, ${imovel.cidade}.`,
      leadId ? `Código do atendimento: #${leadId}` : '',
      url ? `Link: ${url}` : '',
    ].filter(Boolean)
    return `https://wa.me/${whatsapp}?text=${encodeURIComponent(linhas.join('\n'))}`
  }

  async function handleWhatsAppClick(e: any) {
    e.preventDefault()
    const fallbackUrl = mensagemWhatsApp()
    const janela = window.open('', '_blank', 'noopener,noreferrer')
    try {
      const data = await registrarLead('whatsapp_click')
      const url = data?.whatsapp_url || mensagemWhatsApp(data?.id)
      if (janela) janela.location.href = url
      else window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      console.error('Erro ao registrar clique no WhatsApp:', err)
      if (janela) janela.location.href = fallbackUrl
      else window.open(fallbackUrl, '_blank', 'noopener,noreferrer')
    }
  }

  function compartilharWhatsApp() {
    const url = `${window.location.origin}/imovel/${imovel.id}`
    const preco = imovel.mostrar_preco === false ? 'Sob consulta' : `R$ ${Number(imovel.preco).toLocaleString('pt-BR')}`
    const texto = `Olha esse imóvel que encontrei! 🏠\n\n*${imovel.titulo}*\n📍 ${imovel.bairro}, ${imovel.cidade}\n💰 ${preco}\n\n${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
    setCompartilhado(true)
    setTimeout(() => setCompartilhado(false), 3000)
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
      <style>{`
        .detalhe-grid { display: grid; grid-template-columns: 1fr 360px; gap: 48px; align-items: start; }
        .sidebar { position: sticky; top: 96px; }
        .foto-principal { height: clamp(220px, 56vw, 600px); overflow: hidden; }
        .header-logo { height: 52px; }
        .header-nav { padding: 0 32px; }
        .detalhe-content { padding: 56px 32px; max-width: 1100px; margin: 0 auto; }
        .footer-inner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
        .whatsapp-fixo { display: none; }
        .whatsapp-btn-header { display: inline-block; }
        .semelhantes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1px; background: rgba(201,168,76,0.15); }
        .nav-arrow:hover:not(:disabled) { background: rgba(201,168,76,0.15) !important; }
        .card-semelhante:hover { opacity: 0.85; }
        @media (max-width: 768px) {
          .detalhe-grid { grid-template-columns: 1fr !important; }
          .sidebar { position: static !important; top: auto !important; }
          .foto-principal { height: clamp(220px, 56vw, 600px) !important; }
          .header-nav { padding: 0 16px !important; gap: 16px !important; }
          .header-logo { height: 40px !important; }
          .semelhantes-grid { grid-template-columns: 1fr !important; }
          .detalhe-content { padding: 32px 16px !important; }
          .footer-inner { flex-direction: column !important; text-align: center !important; }
          .whatsapp-btn-header { display: none !important; }
          .whatsapp-fixo { display: flex !important; }
        }
      `}</style>

      {modalConfirmacao && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#0f0e0c', border: '1px solid rgba(201,168,76,0.35)', padding: '36px 32px', maxWidth: '380px', width: '100%', textAlign: 'center' }}>
            <p style={{ fontSize: '10px', letterSpacing: '3px', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '16px' }}>Confirme seu número</p>
            <p style={{ fontFamily: 'Georgia,serif', fontSize: '28px', color: '#e8e0d0', fontWeight: 300, marginBottom: '8px', letterSpacing: '1px' }}>{formatarParaExibicao(form.telefone)}</p>
            <p style={{ fontSize: '13px', color: '#6b6355', marginBottom: '28px', lineHeight: 1.6 }}>Esse é o número certo?<br />Usaremos para entrar em contato com você.</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setModalConfirmacao(false)} style={{ flex: 1, padding: '13px', background: 'transparent', border: '1px solid rgba(201,168,76,0.3)', color: '#a09880', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer', fontWeight: 500 }}>Corrigir</button>
              <button onClick={confirmarEEnviar} style={{ flex: 1, padding: '13px', background: '#c9a84c', border: 'none', color: '#0a0a0a', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer', fontWeight: 700 }}>Está correto</button>
            </div>
          </div>
        </div>
      )}

      <a href={mensagemWhatsApp()} onClick={handleWhatsAppClick} target="_blank" rel="noreferrer"
        className="whatsapp-fixo"
        style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 100, background: '#25D366', color: '#fff', borderRadius: '50px', padding: '14px 20px', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600, textDecoration: 'none', alignItems: 'center', gap: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
        <IconeWhatsApp />
        <span>WhatsApp</span>
      </a>

      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(201,168,76,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px' }} className="header-nav">
        <Link href="/"><img src="https://wabkkqbgfwufmxjutxsr.supabase.co/storage/v1/object/public/assets/LOGO%20MOTTA%20site.png" alt="Motta Corretor" className="header-logo" style={{ objectFit: 'contain' }} /></Link>
        <nav style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          <Link href="/" style={{ color: '#a09880', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', textDecoration: 'none' }}>← Imóveis</Link>
          <a href={mensagemWhatsApp()} onClick={handleWhatsAppClick} target="_blank" rel="noreferrer" className="whatsapp-btn-header" style={{ background: '#c9a84c', color: '#0a0a0a', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', padding: '10px 20px', fontWeight: 600, textDecoration: 'none' }}>WhatsApp</a>
        </nav>
      </header>

      {fotos.length > 0 && (
        <div style={{ background: '#0a0a0a', position: 'relative' }}>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', background: '#0a0a0a', position: 'relative' }} className="foto-principal">
            <img src={fotos[fotoAtiva]} alt="" aria-hidden="true"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(22px)', transform: 'scale(1.08)', opacity: 0.4, display: 'block' }} />
            <img src={fotos[fotoAtiva]} alt={imovel.titulo}
              style={{ position: 'relative', zIndex: 1, maxWidth: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 60%, rgba(10,10,10,0.8) 100%)', zIndex: 2 }} />
            <div style={{ position: 'absolute', top: '24px', left: '24px', display: 'flex', gap: '8px', zIndex: 3 }}>
              <span style={{ fontSize: '10px', letterSpacing: '2px', padding: '5px 12px', textTransform: 'uppercase', fontWeight: 500, background: imovel.tipo === 'venda' ? '#c9a84c' : 'transparent', color: imovel.tipo === 'venda' ? '#0a0a0a' : '#c9a84c', border: imovel.tipo === 'aluguel' ? '1px solid rgba(201,168,76,0.5)' : 'none' }}>
                {imovel.tipo === 'venda' ? 'Venda' : 'Aluguel'}
              </span>
              {imovel.destaque && <span style={{ fontSize: '10px', padding: '5px 12px', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.4)', letterSpacing: '1px' }}>Destaque</span>}
            </div>
            {fotos.length > 1 && (
              <>
                <button className="nav-arrow" onClick={() => setFotoAtiva(f => Math.max(0, f - 1))} disabled={fotoAtiva === 0}
                  style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(10,10,10,0.6)', border: '1px solid rgba(201,168,76,0.3)', color: '#e8e0d0', width: '48px', height: '48px', cursor: 'pointer', fontSize: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', zIndex: 3 }}>‹</button>
                <button className="nav-arrow" onClick={() => setFotoAtiva(f => Math.min(fotos.length - 1, f + 1))} disabled={fotoAtiva === fotos.length - 1}
                  style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(10,10,10,0.6)', border: '1px solid rgba(201,168,76,0.3)', color: '#e8e0d0', width: '48px', height: '48px', cursor: 'pointer', fontSize: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', zIndex: 3 }}>›</button>
                <div style={{ position: 'absolute', bottom: '16px', right: '24px', color: '#a09880', fontSize: '12px', letterSpacing: '2px', background: 'rgba(10,10,10,0.6)', padding: '4px 10px', zIndex: 3 }}>{fotoAtiva + 1} / {fotos.length}</div>
              </>
            )}
          </div>
          {fotos.length > 1 && (
            <div style={{ display: 'flex', gap: '4px', padding: '4px', background: '#080807', overflowX: 'auto' }}>
              {fotos.map((foto: string, i: number) => (
                <button key={i} onClick={() => setFotoAtiva(i)}
                  style={{ flexShrink: 0, width: '80px', height: '56px', padding: 0, border: i === fotoAtiva ? '2px solid #c9a84c' : '2px solid transparent', cursor: 'pointer', overflow: 'hidden', transition: 'border-color 0.15s' }}>
                  <img src={foto} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="detalhe-content">
        <div className="detalhe-grid">
          <div>
            <p style={{ fontSize: '11px', letterSpacing: '3px', color: '#6b6355', textTransform: 'uppercase', marginBottom: '8px' }}>{[imovel.bairro, imovel.cidade].filter(Boolean).join(' · ')}</p>
            <h1 style={{ fontFamily: 'Georgia,serif', fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 300, color: '#e8e0d0', lineHeight: 1.2, marginBottom: '16px' }}>{imovel.titulo}</h1>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
              <p style={{ fontFamily: 'Georgia,serif', fontSize: 'clamp(22px, 3.5vw, 32px)', color: '#c9a84c', fontWeight: 400 }}>
                {imovel.mostrar_preco === false ? 'Sob consulta' : <>R$ {Number(imovel.preco).toLocaleString('pt-BR')}{imovel.tipo === 'aluguel' && <span style={{ fontSize: '16px', color: '#6b6355', fontFamily: 'system-ui' }}>/mês</span>}</>}
              </p>
              <button onClick={compartilharWhatsApp} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: compartilhado ? '#25D366' : 'transparent', border: `1px solid ${compartilhado ? '#25D366' : 'rgba(37,211,102,0.4)'}`, color: compartilhado ? '#fff' : '#25D366', padding: '10px 18px', fontSize: '12px', letterSpacing: '1px', cursor: 'pointer', transition: 'all 0.2s' }}>
                <IconeWhatsApp />
                <span>{compartilhado ? 'Link enviado!' : 'Compartilhar'}</span>
              </button>
            </div>
            {(imovel.area > 0 || imovel.quartos > 0 || imovel.banheiros > 0 || imovel.vagas > 0) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1px', background: 'rgba(201,168,76,0.15)', marginBottom: '40px' }}>
                {imovel.area > 0 && <div style={{ background: '#0f0e0c', padding: '20px 24px', flex: '1', minWidth: '80px', textAlign: 'center' }}><p style={{ fontFamily: 'Georgia,serif', fontSize: '28px', color: '#e8e0d0', fontWeight: 300 }}>{imovel.area}</p><p style={{ fontSize: '10px', letterSpacing: '2px', color: '#6b6355', textTransform: 'uppercase' }}>m²</p></div>}
                {imovel.quartos > 0 && <div style={{ background: '#0f0e0c', padding: '20px 24px', flex: '1', minWidth: '80px', textAlign: 'center' }}><p style={{ fontFamily: 'Georgia,serif', fontSize: '28px', color: '#e8e0d0', fontWeight: 300 }}>{imovel.quartos}</p><p style={{ fontSize: '10px', letterSpacing: '2px', color: '#6b6355', textTransform: 'uppercase' }}>Quartos</p></div>}
                {imovel.banheiros > 0 && <div style={{ background: '#0f0e0c', padding: '20px 24px', flex: '1', minWidth: '80px', textAlign: 'center' }}><p style={{ fontFamily: 'Georgia,serif', fontSize: '28px', color: '#e8e0d0', fontWeight: 300 }}>{imovel.banheiros}</p><p style={{ fontSize: '10px', letterSpacing: '2px', color: '#6b6355', textTransform: 'uppercase' }}>Banheiros</p></div>}
                {imovel.vagas > 0 && <div style={{ background: '#0f0e0c', padding: '20px 24px', flex: '1', minWidth: '80px', textAlign: 'center' }}><p style={{ fontFamily: 'Georgia,serif', fontSize: '28px', color: '#e8e0d0', fontWeight: 300 }}>{imovel.vagas}</p><p style={{ fontSize: '10px', letterSpacing: '2px', color: '#6b6355', textTransform: 'uppercase' }}>Vagas</p></div>}
              </div>
            )}
            {imovel.descricao && (
              <div style={{ marginBottom: '40px' }}>
                <p style={{ fontSize: '11px', letterSpacing: '3px', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '16px' }}>Descrição</p>
                <p style={{ color: '#a09880', fontSize: '15px', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{imovel.descricao}</p>
              </div>
            )}
            {imovel.endereco && (
              <div>
                <p style={{ fontSize: '11px', letterSpacing: '3px', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '8px' }}>Localização</p>
                <p style={{ color: '#6b6355', fontSize: '14px', letterSpacing: '1px' }}>{[imovel.endereco, imovel.bairro, imovel.cidade].filter(Boolean).join(', ')}</p>
              </div>
            )}
          </div>

          <div className="sidebar">
            <a href={mensagemWhatsApp()} onClick={handleWhatsAppClick} target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: '#25D366', color: '#fff', padding: '18px', fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600, textDecoration: 'none', marginBottom: '1px' }}>
              <IconeWhatsApp />
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
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '10px', letterSpacing: '2px', color: '#6b6355', textTransform: 'uppercase', marginBottom: '6px' }}>Nome</label>
                    <input type="text" required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                      style={{ width: '100%', background: '#1a1814', border: '1px solid rgba(201,168,76,0.2)', color: '#e8e0d0', padding: '10px 14px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '10px', letterSpacing: '2px', color: '#6b6355', textTransform: 'uppercase', marginBottom: '6px' }}>Telefone / WhatsApp *</label>
                    <input type="tel" required placeholder="(55) 99999-9999" value={form.telefone}
                      onChange={e => { const m = mascaraTelefone(e.target.value); setForm(f => ({ ...f, telefone: m })); if (erroTelefone) setErroTelefone('') }}
                      style={{ width: '100%', background: '#1a1814', border: `1px solid ${erroTelefone ? '#e05c5c' : 'rgba(201,168,76,0.2)'}`, color: '#e8e0d0', padding: '10px 14px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                    {erroTelefone && <p style={{ color: '#e05c5c', fontSize: '11px', marginTop: '5px' }}>{erroTelefone}</p>}
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '10px', letterSpacing: '2px', color: '#6b6355', textTransform: 'uppercase', marginBottom: '6px' }}>E-mail (opcional)</label>
                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      style={{ width: '100%', background: '#1a1814', border: '1px solid rgba(201,168,76,0.2)', color: '#e8e0d0', padding: '10px 14px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <button type="submit" disabled={enviando}
                    style={{ width: '100%', background: '#c9a84c', color: '#0a0a0a', border: 'none', padding: '14px', fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', fontWeight: 600, cursor: enviando ? 'wait' : 'pointer', marginTop: '8px', opacity: enviando ? 0.7 : 1, transition: 'opacity 0.2s' }}>
                    {enviando ? 'Enviando...' : 'Demonstrar interesse'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {semelhantes.length > 0 && (
        <section style={{ borderTop: '1px solid rgba(201,168,76,0.15)', padding: '64px 32px' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <p style={{ fontSize: '11px', letterSpacing: '4px', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '8px' }}>Veja também</p>
            <h2 style={{ fontFamily: 'Georgia,serif', fontSize: '26px', fontWeight: 300, color: '#e8e0d0', marginBottom: '32px' }}>Imóveis semelhantes</h2>
            <div className="semelhantes-grid">
              {semelhantes.map((s) => (
                <Link key={s.id} href={`/imovel/${s.id}`} style={{ textDecoration: 'none' }}>
                  <div className="card-semelhante" style={{ background: '#0f0e0c', cursor: 'pointer', transition: 'opacity 0.2s' }}>
                    <div style={{ height: '180px', background: '#1a1814', position: 'relative', overflow: 'hidden' }}>
                      {s.fotos?.[0] ? <img src={s.fotos[0]} alt={s.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: '#3a3528', fontSize: '36px' }}>⌂</span></div>}
                      <span style={{ position: 'absolute', top: '10px', left: '10px', fontSize: '9px', letterSpacing: '2px', padding: '3px 8px', textTransform: 'uppercase', fontWeight: 500, background: s.tipo === 'venda' ? '#c9a84c' : 'transparent', color: s.tipo === 'venda' ? '#0a0a0a' : '#c9a84c', border: s.tipo === 'aluguel' ? '1px solid rgba(201,168,76,0.5)' : 'none' }}>
                        {s.tipo === 'venda' ? 'Venda' : 'Aluguel'}
                      </span>
                    </div>
                    <div style={{ padding: '18px 20px' }}>
                      <h3 style={{ fontFamily: 'Georgia,serif', fontSize: '16px', fontWeight: 400, color: '#e8e0d0', marginBottom: '4px' }}>{s.titulo}</h3>
                      <p style={{ fontSize: '11px', color: '#6b6355', marginBottom: '12px' }}>{[s.bairro, s.cidade].filter(Boolean).join(' · ')}</p>
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

      <footer style={{ background: '#070706', padding: '32px', borderTop: '1px solid rgba(201,168,76,0.15)' }}>
        <div className="footer-inner">
          <img src="https://wabkkqbgfwufmxjutxsr.supabase.co/storage/v1/object/public/assets/LOGO%20MOTTA%20site.png" alt="Motta Corretor" style={{ height: '36px', objectFit: 'contain' }} />
          <p style={{ fontSize: '11px', color: '#4a4438', letterSpacing: '1px' }}>{cidade} · CRECI {creci}</p>
        </div>
      </footer>
    </main>
  )
}

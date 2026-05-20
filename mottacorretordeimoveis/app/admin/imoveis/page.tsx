'use client'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'

export default function ImoveisAdmin() {
  const [imoveis, setImoveis] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [imovelAlvo, setImovelAlvo] = useState<{ id: string; titulo: string } | null>(null)
  const [textoConfirmacao, setTextoConfirmacao] = useState('')
  const [excluindo, setExcluindo] = useState(false)

  useEffect(() => { carregarImoveis() }, [])

  async function carregarImoveis() {
    setLoading(true)
    const { data } = await supabase
      .from('imoveis')
      .select('*')
      .order('created_at', { ascending: false })
    setImoveis(data ?? [])
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

  function abrirModal(id: string, titulo: string) {
    setImovelAlvo({ id, titulo })
    setTextoConfirmacao('')
    setModalAberto(true)
  }

  function fecharModal() {
    if (excluindo) return
    setModalAberto(false)
    setImovelAlvo(null)
    setTextoConfirmacao('')
  }

  async function executarExclusao() {
    if (textoConfirmacao !== 'EXCLUIR' || !imovelAlvo) return
    setExcluindo(true)
    try {
      const { error } = await supabase
        .from('imoveis')
        .delete()
        .eq('id', imovelAlvo.id)
      if (error) throw error
      // Remove da lista local imediatamente — sem precisar buscar de novo
      const idExcluido = imovelAlvo.id
      setImoveis((atual) => atual.filter((i) => i.id !== idExcluido))
      setModalAberto(false)
      setImovelAlvo(null)
      setTextoConfirmacao('')
    } catch (err: any) {
      alert('Erro ao excluir: ' + (err?.message || 'tente novamente'))
    } finally {
      setExcluindo(false)
    }
  }

  const confirmacaoOk = textoConfirmacao === 'EXCLUIR'

  return (
    <main style={{ background: '#0a0a0a', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>

      {/* MODAL */}
      {modalAberto && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) fecharModal() }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div style={{
            background: '#0f0e0c',
            border: '1px solid rgba(192,57,43,0.55)',
            padding: '36px 32px',
            maxWidth: '460px',
            width: '100%',
            boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
          }}>
            <p style={{ fontSize: '10px', letterSpacing: '4px', color: '#c0392b', textTransform: 'uppercase', marginBottom: '12px' }}>
              ação irreversível
            </p>
            <h2 style={{ fontFamily: 'Georgia,serif', fontSize: '22px', fontWeight: 300, color: '#e8e0d0', marginBottom: '10px' }}>
              Excluir imóvel?
            </h2>
            <p style={{ color: '#a09880', fontSize: '13px', lineHeight: 1.65, marginBottom: '24px' }}>
              Você está prestes a excluir permanentemente:{' '}
              <strong style={{ color: '#e8e0d0' }}>{imovelAlvo?.titulo}</strong>
            </p>
            <p style={{ color: '#6b6355', fontSize: '12px', marginBottom: '10px' }}>
              Digite <strong style={{ color: '#c0392b', letterSpacing: '2px' }}>EXCLUIR</strong> para confirmar:
            </p>
            <input
              autoFocus
              value={textoConfirmacao}
              onChange={(e) => setTextoConfirmacao(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === 'Enter') executarExclusao() }}
              placeholder="EXCLUIR"
              style={{
                width: '100%',
                background: '#1a1814',
                border: `1px solid ${confirmacaoOk ? '#c0392b' : 'rgba(201,168,76,0.2)'}`,
                color: confirmacaoOk ? '#ff8a7a' : '#e8e0d0',
                padding: '12px 14px',
                fontSize: '16px',
                letterSpacing: '4px',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'monospace',
                marginBottom: '22px',
                borderRadius: '2px',
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
                onClick={executarExclusao}
                disabled={!confirmacaoOk || excluindo}
                style={{
                  background: confirmacaoOk ? '#c0392b' : '#1e1414',
                  border: `1px solid ${confirmacaoOk ? '#c0392b' : 'rgba(192,57,43,0.15)'}`,
                  color: confirmacaoOk ? '#fff' : '#4a2a2a',
                  padding: '11px 22px',
                  fontSize: '11px',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  cursor: confirmacaoOk && !excluindo ? 'pointer' : 'not-allowed',
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

      {/* HEADER */}
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

      {/* CONTEÚDO */}
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
                      {imovel.fotos?.[0] && <img src={imovel.fotos[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />}
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
                      onClick={() => abrirModal(imovel.id, imovel.titulo)}
                      style={{ background: 'transparent', border: '1px solid rgba(192,57,43,0.35)', color: '#c0392b', padding: '4px 10px', fontSize: '10px', letterSpacing: '1px', cursor: 'pointer' }}
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

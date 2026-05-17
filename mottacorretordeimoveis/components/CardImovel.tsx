'use client'
import Link from 'next/link'

export default function CardImovel({ imovel }: { imovel: any }) {
  return (
    <Link href={'/imovel/' + imovel.id} style={{ textDecoration: 'none' }}>
      <div style={{ background: '#0f0e0c', cursor: 'pointer' }}>
        <div style={{ height: '220px', background: '#1a1814', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
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
  )
}

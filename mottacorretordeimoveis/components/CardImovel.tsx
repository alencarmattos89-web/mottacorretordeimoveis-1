'use client'
import Link from 'next/link'

export default function CardImovel({ imovel }: { imovel: any }) {
  const isVenda = imovel.tipo === 'venda'

  const badgeStyle: React.CSSProperties = isVenda
    ? {
        position: 'absolute',
        top: '14px',
        left: '14px',
        fontSize: '10px',
        letterSpacing: '2.5px',
        padding: '5px 14px',
        textTransform: 'uppercase',
        fontWeight: 700,
        fontFamily: 'system-ui, sans-serif',
        background: 'linear-gradient(135deg, #c9a84c 0%, #e6c96e 50%, #c9a84c 100%)',
        color: '#0a0804',
        borderRadius: '2px',
        boxShadow: '0 2px 12px rgba(201,168,76,0.45)',
        backdropFilter: 'blur(4px)',
      }
    : {
        position: 'absolute',
        top: '14px',
        left: '14px',
        fontSize: '10px',
        letterSpacing: '2.5px',
        padding: '5px 14px',
        textTransform: 'uppercase',
        fontWeight: 600,
        fontFamily: 'system-ui, sans-serif',
        background: 'rgba(10, 8, 4, 0.72)',
        color: '#c9a84c',
        border: '1px solid rgba(201,168,76,0.7)',
        borderRadius: '2px',
        backdropFilter: 'blur(6px)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
      }

  return (
    <Link href={'/imovel/' + imovel.id} style={{ textDecoration: 'none' }}>
      <div
        style={{
          background: '#0f0e0c',
          cursor: 'pointer',
          borderRadius: '3px',
          overflow: 'hidden',
          border: '1px solid rgba(201,168,76,0.08)',
          transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = 'rgba(201,168,76,0.28)'
          el.style.boxShadow = '0 8px 32px rgba(0,0,0,0.45)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = 'rgba(201,168,76,0.08)'
          el.style.boxShadow = 'none'
        }}
      >
        {/* Imagem */}
        <div
          style={{
            height: '220px',
            background: '#1a1814',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {imovel.fotos && imovel.fotos[0] ? (
            <img
              src={imovel.fotos[0]}
              alt={imovel.titulo}
              style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#0f0e0c' }}
            />
          ) : (
            <span style={{ color: '#3a3528', fontSize: '48px' }}>⌂</span>
          )}

          {/* Badge Venda / Aluguel */}
          <span style={badgeStyle}>
            {isVenda ? 'Venda' : 'Aluguel'}
          </span>

          {/* Badge Destaque */}
          {imovel.destaque && (
            <span
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                fontSize: '10px',
                letterSpacing: '1.5px',
                padding: '5px 10px',
                textTransform: 'uppercase',
                fontFamily: 'system-ui, sans-serif',
                fontWeight: 500,
                color: '#c9a84c',
                border: '1px solid rgba(201,168,76,0.4)',
                background: 'rgba(10,8,4,0.65)',
                backdropFilter: 'blur(4px)',
                borderRadius: '2px',
              }}
            >
              Destaque
            </span>
          )}
        </div>

        {/* Conteúdo */}
        <div style={{ padding: '24px' }}>
          <h3
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '20px',
              fontWeight: 400,
              color: '#e8e0d0',
              marginBottom: '4px',
            }}
          >
            {imovel.titulo}
          </h3>
          <p
            style={{
              fontSize: '11px',
              letterSpacing: '1px',
              color: '#6b6355',
              marginBottom: '16px',
            }}
          >
            {imovel.bairro} · {imovel.cidade}
          </p>
          <div
            style={{
              display: 'flex',
              gap: '20px',
              fontSize: '11px',
              color: '#8a7d6a',
              marginBottom: '20px',
              letterSpacing: '1px',
            }}
          >
            {imovel.quartos > 0 && <span>{imovel.quartos} quartos</span>}
            {imovel.area > 0 && <span>{imovel.area} m²</span>}
            {imovel.vagas > 0 && <span>{imovel.vagas} vagas</span>}
          </div>
          <p
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '24px',
              color: '#c9a84c',
              fontWeight: 400,
            }}
          >
            {imovel.mostrar_preco === false
              ? 'Sob consulta'
              : (
                <>
                  R$ {Number(imovel.preco).toLocaleString('pt-BR')}
                  {imovel.tipo === 'aluguel' && (
                    <span
                      style={{
                        fontSize: '13px',
                        color: '#6b6355',
                        fontFamily: 'system-ui',
                      }}
                    >
                      /mês
                    </span>
                  )}
                </>
              )}
          </p>
        </div>
      </div>
    </Link>
  )
}

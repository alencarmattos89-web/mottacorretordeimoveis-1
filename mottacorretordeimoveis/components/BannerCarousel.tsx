'use client'

import { useEffect, useState } from 'react'

type BannerCarouselProps = {
  images: string[]
  intervalSeconds?: number
}

export default function BannerCarousel({ images, intervalSeconds = 5 }: BannerCarouselProps) {
  const imagens = images.filter(Boolean)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (imagens.length <= 1) return
    const intervalo = window.setInterval(() => {
      setIndex((atual) => (atual + 1) % imagens.length)
    }, Math.max(intervalSeconds, 2) * 1000)

    return () => window.clearInterval(intervalo)
  }, [imagens.length, intervalSeconds])

  if (imagens.length === 0) return null

  return (
    <section style={{ width: '100%', background: '#070706', borderTop: '1px solid rgba(201,168,76,0.12)', borderBottom: '1px solid rgba(201,168,76,0.12)' }}>
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1920 / 450', overflow: 'hidden', background: '#070706' }}>
        {imagens.map((src, itemIndex) => (
          <img
            key={`${src}-${itemIndex}`}
            src={src}
            alt={`Banner ${itemIndex + 1}`}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              opacity: itemIndex === index ? 1 : 0,
              transition: 'opacity 650ms ease',
            }}
          />
        ))}

        {imagens.length > 1 && (
          <div style={{ position: 'absolute', bottom: '14px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '8px' }}>
            {imagens.map((_, itemIndex) => (
              <button
                key={itemIndex}
                type="button"
                aria-label={`Mostrar banner ${itemIndex + 1}`}
                onClick={() => setIndex(itemIndex)}
                style={{
                  width: itemIndex === index ? '22px' : '8px',
                  height: '8px',
                  borderRadius: '999px',
                  border: 'none',
                  background: itemIndex === index ? '#c9a84c' : 'rgba(232,224,208,0.45)',
                  cursor: 'pointer',
                  transition: 'all 180ms ease',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

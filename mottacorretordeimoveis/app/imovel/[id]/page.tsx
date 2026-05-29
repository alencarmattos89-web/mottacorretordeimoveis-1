import { createClient } from '@/lib/supabase-server'
import ImovelClient from './ImovelClient'
import { notFound } from 'next/navigation'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('imoveis')
    .select('titulo, descricao, fotos, preco, tipo, categoria, cidade, bairro')
    .eq('id', id)
    .eq('ativo', true)
    .single()
  if (!data) return { title: 'Imóvel não encontrado — Motta Corretor' }
  const preco = `R$ ${Number(data.preco).toLocaleString('pt-BR')}`
  const titulo = `${data.titulo} — ${preco}`
  const descricao =
    data.descricao?.slice(0, 155) ||
    `${data.categoria || 'Imóvel'} à ${data.tipo} em ${data.bairro}, ${data.cidade}. ${preco}.`
  return {
    title: `${titulo} | Motta Corretor`,
    description: descricao,
    openGraph: {
      title: titulo,
      description: descricao,
      images: data.fotos?.[0] ? [{ url: data.fotos[0] }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: titulo,
      description: descricao,
      images: data.fotos?.[0] ? [data.fotos[0]] : [],
    },
  }
}

export default async function ImovelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: imovel } = await supabase
    .from('imoveis')
    .select('*')
    .eq('id', id)
    .eq('ativo', true)
    .single()

  if (!imovel) notFound()

  return <ImovelClient id={id} imovelInicial={imovel} />
}

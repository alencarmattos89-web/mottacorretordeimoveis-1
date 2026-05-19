import { createClient } from '@/lib/supabase-server'
import ImovelClient from './ImovelClient'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('imoveis')
    .select('titulo, descricao, fotos, preco, tipo, categoria, cidade, bairro')
    .eq('id', params.id)
    .eq('ativo', true)
    .single()

  if (!data) return { title: 'Imóvel não encontrado — Motta Corretor' }

  const preco = `R$ ${Number(data.preco).toLocaleString('pt-BR')}`
  const titulo = `${data.titulo} — ${preco}`
  const descricao = data.descricao?.slice(0, 155) ||
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

export default function ImovelPage() {
  return <ImovelClient />
}

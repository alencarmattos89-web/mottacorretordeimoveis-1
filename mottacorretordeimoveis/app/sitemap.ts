import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data: imoveis } = await supabase
    .from('imoveis')
    .select('id, updated_at')

  const imoveisUrls = (imoveis || []).map((imovel) => ({
    url: `https://www.mottacorretordeimoveis.com.br/imovel/${imovel.id}`,
    lastModified: imovel.updated_at,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [
    {
      url: 'https://www.mottacorretordeimoveis.com.br',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...imoveisUrls,
  ]
}

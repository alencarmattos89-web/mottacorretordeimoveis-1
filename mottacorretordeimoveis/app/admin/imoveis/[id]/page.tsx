'use client'

import { supabase } from '@/lib/supabase-browser'
import { useEffect, useState } from 'react'
import type { ChangeEvent, DragEvent, FormEvent, CSSProperties, ReactNode } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import { aplicarMarcaDagua, comprimirFoto, type WatermarkSettings } from '@/lib/image-watermark'

type FormState = {
  titulo: string
  tipo: string
  categoria: string
  preco: string
  area: string
  quartos: string
  banheiros: string
  vagas: string
  endereco: string
  bairro: string
  cidade: string
  descricao: string
  destaque: boolean
  ativo: boolean
  mostrar_preco: boolean
}

type DetalhesState = {
  codigo_imovel: string
  finalidade: string
  padrao: string
  loteamento: string
  torre_bloco: string
  numero_lote: string
  complemento: string
  cep: string
  uf: string
  mapa_confirmado: boolean
  referencias: string
  salas: string
  suites: string
  area_util: string
  area_total: string
  area_construida: string
  largura_terreno: string
  comprimento_terreno: string
  caracteristicas: string[]
  proprietarios: string
  chave_disponivel: string
  local_chave: string
  info_chave: string
  condicao: string
  reforma: string
  obra: string
  ocupacao: string
  modo_iptu: string
  valor_iptu: string
  modo_condominio: string
  valor_condominio: string
  iptu_numero: string
  ccir_numero: string
  escritura: string
  matricula: string
  cartorio: string
  energia_numero: string
  agua_numero: string
  observacoes_internas: string
  transacao: string
  aceita_financiamento: string[]
  minha_casa: boolean
  info_financiamento: string
  aceita_permuta: boolean
  permuta_veiculo_valor: string
  permuta_imovel_valor: string
  aceita_outro_bem: boolean
  outro_bem_qual: string
  outro_bem_valor: string
  captadores: string
  corretor_responsavel: string
  autorizado: string
  inicio_contrato: string
  duracao_contrato: string
  final_contrato: string
  propaganda_local: string
  propaganda_tipo: string
  propaganda_colocada_em: string
  anunciar_site: boolean
  titulo_anuncio: string
  descricao_anuncio: string
}

type ImovelRow = Partial<FormState> & {
  fotos?: string[] | null
  dados_administrativos?: Partial<DetalhesState> | null
}

const formInicial: FormState = {
  titulo: '',
  tipo: 'venda',
  categoria: 'casa',
  preco: '',
  area: '',
  quartos: '',
  banheiros: '',
  vagas: '',
  endereco: '',
  bairro: '',
  cidade: 'Panambi',
  descricao: '',
  destaque: false,
  ativo: true,
  mostrar_preco: true,
}

const detalhesIniciais: DetalhesState = {
  codigo_imovel: '',
  finalidade: 'residencial',
  padrao: 'padrao',
  loteamento: '',
  torre_bloco: '',
  numero_lote: '',
  complemento: '',
  cep: '',
  uf: 'RS',
  mapa_confirmado: false,
  referencias: '',
  salas: '',
  suites: '',
  area_util: '',
  area_total: '',
  area_construida: '',
  largura_terreno: '',
  comprimento_terreno: '',
  caracteristicas: [],
  proprietarios: '',
  chave_disponivel: '',
  local_chave: '',
  info_chave: '',
  condicao: '',
  reforma: '',
  obra: '',
  ocupacao: '',
  modo_iptu: 'mensal',
  valor_iptu: '',
  modo_condominio: 'mensal',
  valor_condominio: '',
  iptu_numero: '',
  ccir_numero: '',
  escritura: '',
  matricula: '',
  cartorio: '',
  energia_numero: '',
  agua_numero: '',
  observacoes_internas: '',
  transacao: 'vender',
  aceita_financiamento: [],
  minha_casa: false,
  info_financiamento: '',
  aceita_permuta: false,
  permuta_veiculo_valor: '',
  permuta_imovel_valor: '',
  aceita_outro_bem: false,
  outro_bem_qual: '',
  outro_bem_valor: '',
  captadores: '',
  corretor_responsavel: '',
  autorizado: '',
  inicio_contrato: '',
  duracao_contrato: '',
  final_contrato: '',
  propaganda_local: '',
  propaganda_tipo: '',
  propaganda_colocada_em: '',
  anunciar_site: true,
  titulo_anuncio: '',
  descricao_anuncio: '',
}

const gruposCaracteristicas = [
  {
    titulo: 'Bem-estar e comodidade',
    itens: [
      'Adega', 'Ambientes Integrados', 'Aquecedor', 'Ar condicionado', 'Armário de Cozinha',
      'Armário Embutido', 'Armário no Banheiro', 'Banheira', 'Box Blindex', 'Churrasqueira na Sacada',
      'Churrasqueira na Varanda', 'Closet', 'Copa', 'Cozinha Americana', 'Cozinha Gourmet',
      'Cozinha Grande', 'Demi-suíte', 'Escritório', 'Fechadura Digital', 'Hidromassagem',
      'Home Office', 'Janela Panorâmica', 'Jardim de Inverno', 'Lareira', 'Lavabo', 'Lavanderia',
      'Mobiliado', 'Móveis Planejados', 'Pé Direito Duplo', 'Quintal', 'Sacada', 'Sacada Gourmet',
      'Sala de jantar', 'Sala Grande', 'Semimobiliado', 'Smart Home', 'Varanda', 'Varanda Gourmet',
      'Vista Panorâmica', 'Vista para a Montanha', 'Vista para o Lago', 'Vista para o Mar',
    ],
  },
  {
    titulo: 'Segurança',
    itens: [
      'Alarme', 'Câmera de Segurança', 'Cerca', 'Circuito de Segurança', 'Guarita',
      'Interfone', 'Muros e Grades', 'Portão Eletrônico', 'Portaria', 'Portaria 24hs', 'Ronda 24hs',
    ],
  },
  {
    titulo: 'Lazer e natureza',
    itens: [
      'Academia', 'Aceita Pet', 'Área de Lazer', 'Árvore Frutífera', 'Bar', 'Biblioteca',
      'Campo de Futebol', 'Churrasqueira', 'Cinema', 'Deck', 'Espaço Fitness', 'Espaço Gourmet',
      'Espaço Pet', 'Espaço Verde/Parque', 'Espaço Yoga', 'Espaço Zen', 'Horta', 'Jacuzzi',
      'Jardim', 'Lago', 'Piscina', 'Piscina Climatizada', 'Piscina Coberta', 'Piscina Infantil',
      'Piscina Privativa', 'Pista de Cooper', 'Playground', 'Pomar', 'Praça', 'Quadra de Beach Tennis',
      'Quadra de Futebol', 'Quadra Poliesportiva', 'Salão de Festas', 'Salão de Jogos', 'Sauna', 'Spa',
    ],
  },
  {
    titulo: 'Infraestrutura',
    itens: [
      'Acessibilidade', 'Área de Serviço', 'Bicicletário', 'Canil', 'Carregador de Carro Elétrico',
      'Chuveiro a Gás', 'Coleta Seletiva de Lixo', 'Condomínio Inteligente', 'Coworking',
      'Dependência Empregada', 'Depósito', 'Despensa', 'Edícula', 'Elevador', 'Energia Solar',
      'Esquina', 'Estacionamento Visitantes', 'Forno de Pizza', 'Garagem', 'Garagem Coberta',
      'Garagem Coletiva', 'Garagem Demarcada', 'Gás Encanado', 'Gerador', 'Hall de Entrada',
      'Isolamento Acústico', 'Isolamento Térmico', 'Manobrista', 'Rampas', 'Sala de Reunião',
      'TV a Cabo', 'Vestiário', 'Wi-Fi',
    ],
  },
  {
    titulo: 'Acabamento',
    itens: [
      'Carpete', 'Cerâmica', 'Cimento Queimado', 'Drywall', 'Gesso', 'Granito',
      'Janela de Alumínio', 'Laje', 'Mármore', 'Papel de Parede', 'Piso de Madeira',
      'Piso Elevado', 'Piso Laminado', 'Piso Vinílico', 'Platibanda', 'Porcelanato', 'Sanca', 'Teto rebaixado',
    ],
  },
]

const categoriaOptions = [
  ['casa', 'Casa'],
  ['apartamento', 'Apartamento'],
  ['terreno', 'Terreno'],
  ['comercial', 'Comercial'],
  ['rural', 'Rural'],
  ['galpao', 'Galpão'],
  ['sala-comercial', 'Sala comercial'],
]

const inputStyle: CSSProperties = {
  width: '100%',
  background: '#1a1814',
  border: '1px solid rgba(201,168,76,0.2)',
  color: '#e8e0d0',
  padding: '11px 14px',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  borderRadius: '2px',
}

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: '10px',
  letterSpacing: '2px',
  color: '#6b6355',
  textTransform: 'uppercase',
  marginBottom: '7px',
}

const cardStyle: CSSProperties = {
  background: '#0f0e0c',
  border: '1px solid rgba(201,168,76,0.16)',
  padding: '28px',
  marginBottom: '20px',
}

const sectionTitleStyle: CSSProperties = {
  fontFamily: 'Georgia,serif',
  fontSize: '22px',
  fontWeight: 300,
  color: '#e8e0d0',
  marginBottom: '22px',
}

function somenteNumeros(valor: string) {
  return valor.replace(/\D/g, '')
}

function formatarMoeda(valor: string) {
  const numeros = somenteNumeros(valor)
  if (!numeros) return ''
  return Number(numeros).toLocaleString('pt-BR')
}

function numeroOuNulo(valor: string) {
  const normalizado = String(valor || '').replace(',', '.').trim()
  if (!normalizado) return null
  const numero = Number(normalizado)
  return Number.isFinite(numero) ? numero : null
}

function valorTexto(valor: unknown) {
  return valor === null || valor === undefined ? '' : String(valor)
}


function Campo({ label, children, full = false }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function normalizarDetalhes(valor: unknown): DetalhesState {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return detalhesIniciais
  const dados = valor as Partial<DetalhesState>
  return {
    ...detalhesIniciais,
    ...dados,
    caracteristicas: Array.isArray(dados.caracteristicas) ? dados.caracteristicas.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [],
    aceita_financiamento: Array.isArray(dados.aceita_financiamento) ? dados.aceita_financiamento : [],
    mapa_confirmado: dados.mapa_confirmado === true,
    minha_casa: dados.minha_casa === true,
    aceita_permuta: dados.aceita_permuta === true,
    aceita_outro_bem: dados.aceita_outro_bem === true,
    anunciar_site: dados.anunciar_site !== false,
  }
}

export default function EditarImovel() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [precoDisplay, setPrecoDisplay] = useState('')
  const [novasFotos, setNovasFotos] = useState<File[]>([])
  const [fotosExistentes, setFotosExistentes] = useState<string[]>([])
  const [fotoPosicao, setFotoPosicao] = useState<string>('center center')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(formInicial)
  const [detalhes, setDetalhes] = useState<DetalhesState>(detalhesIniciais)
  const [watermark, setWatermark] = useState<WatermarkSettings>({
    ativo: false,
    logo: '',
    opacidade: 45,
    posicao: 'inferior-direita',
    tamanho: 18,
    margem: 32,
  })

  useEffect(() => {
    let ativo = true

    async function carregarImovel() {
      setLoading(true)
      setErro('')
      const [{ data, error }, { data: configData }] = await Promise.all([
        supabase.from('imoveis').select('*').eq('id', id).single(),
        supabase.from('configuracoes').select('watermark_ativo, watermark_logo, watermark_opacidade, watermark_posicao, watermark_tamanho, watermark_margem').eq('id', 'site').single(),
      ])

      if (!ativo) return

      if (configData) {
        const cfg = configData as Record<string, unknown>
        setWatermark({
          ativo: cfg.watermark_ativo === true,
          logo: typeof cfg.watermark_logo === 'string' ? cfg.watermark_logo : '',
          opacidade: Number(cfg.watermark_opacidade || 45),
          posicao: typeof cfg.watermark_posicao === 'string' ? cfg.watermark_posicao : 'inferior-direita',
          tamanho: Number(cfg.watermark_tamanho || 18),
          margem: Number(cfg.watermark_margem || 32),
        })
      }

      if (error) {
        setErro('Não foi possível carregar este imóvel.')
        setLoading(false)
        return
      }

      const imovel = (data || {}) as ImovelRow
      const proximoForm: FormState = {
        titulo: valorTexto(imovel.titulo),
        tipo: valorTexto(imovel.tipo) || 'venda',
        categoria: valorTexto(imovel.categoria) || 'casa',
        preco: valorTexto(imovel.preco),
        area: valorTexto(imovel.area),
        quartos: valorTexto(imovel.quartos),
        banheiros: valorTexto(imovel.banheiros),
        vagas: valorTexto(imovel.vagas),
        endereco: valorTexto(imovel.endereco),
        bairro: valorTexto(imovel.bairro),
        cidade: valorTexto(imovel.cidade) || 'Panambi',
        descricao: valorTexto(imovel.descricao),
        destaque: imovel.destaque === true,
        ativo: imovel.ativo !== false,
        mostrar_preco: imovel.mostrar_preco !== false,
      }

      setForm(proximoForm)
      setPrecoDisplay(formatarMoeda(proximoForm.preco))
      setDetalhes(normalizarDetalhes(imovel.dados_administrativos))
      setFotosExistentes(Array.isArray(imovel.fotos) ? imovel.fotos.filter(Boolean) : [])
      setLoading(false)
    }

    void carregarImovel()

    return () => {
      ativo = false
    }
  }, [id])

  function handleFormChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = event.target
    const checked = event.target instanceof HTMLInputElement ? event.target.checked : false
    setForm((atual) => ({ ...atual, [name]: type === 'checkbox' ? checked : value }))
  }

  function handleDetalheChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = event.target
    const checked = event.target instanceof HTMLInputElement ? event.target.checked : false
    setDetalhes((atual) => ({ ...atual, [name]: type === 'checkbox' ? checked : value }))
  }

  function handlePreco(event: ChangeEvent<HTMLInputElement>) {
    const raw = somenteNumeros(event.target.value)
    setPrecoDisplay(formatarMoeda(raw))
    setForm((atual) => ({ ...atual, preco: raw }))
  }

  function alternarLista(campo: 'caracteristicas' | 'aceita_financiamento', valor: string) {
    setDetalhes((atual) => {
      const lista = atual[campo]
      const existe = lista.includes(valor)
      return {
        ...atual,
        [campo]: existe ? lista.filter((item) => item !== valor) : [...lista, valor],
      }
    })
  }

  function moverFoto(index: number, direcao: 'esquerda' | 'direita') {
    const alvo = direcao === 'esquerda' ? index - 1 : index + 1
    if (alvo < 0 || alvo >= fotosExistentes.length) return
    setFotosExistentes((atuais) => {
      const novas = [...atuais]
      ;[novas[index], novas[alvo]] = [novas[alvo], novas[index]]
      return novas
    })
  }

  function removerFoto(index: number) {
    if (!confirm('Remover esta foto da galeria do imóvel?')) return
    setFotosExistentes((atuais) => atuais.filter((_, itemIndex) => itemIndex !== index))
  }

  function handleDrop(index: number) {
    if (dragIndex === null || dragIndex === index) return
    setFotosExistentes((atuais) => {
      const novas = [...atuais]
      const [movida] = novas.splice(dragIndex, 1)
      novas.splice(index, 0, movida)
      return novas
    })
    setDragIndex(null)
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
  }

  function handleFotos(event: ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(event.target.files || [])
    const imagensValidas = arquivos.filter((arquivo) => {
      const tipoOk = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(arquivo.type)
      const tamanhoOk = arquivo.size <= 10 * 1024 * 1024
      return tipoOk && tamanhoOk
    })
    const ignoradas = arquivos.length - imagensValidas.length

    if (ignoradas > 0) {
      setAviso(`${ignoradas} arquivo(s) ignorado(s): use JPG, PNG, WEBP ou GIF de até 10MB.`)
    } else if (imagensValidas.length > 0) {
      setAviso('Fotos selecionadas. Clique em Salvar alterações para enviar ao site.')
    } else {
      setAviso('')
    }

    setNovasFotos((atuais) => [...atuais, ...imagensValidas])
    event.target.value = ''
  }

  function limparNomeArquivo(nome: string) {
    const limpo = nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    return limpo || 'foto.jpg'
  }

  async function subirFotos() {
    const urlsFotos = [...fotosExistentes]

    for (const fotoOriginal of novasFotos) {
      const foto = await aplicarMarcaDagua(fotoOriginal, watermark)
      const nomeSeguro = `${Date.now()}-${Math.random().toString(36).slice(2)}-${limparNomeArquivo(foto.name)}`
      const { data, error } = await supabase.storage
        .from('fotos-imoveis')
        .upload(nomeSeguro, foto, { cacheControl: '3600', upsert: false, contentType: foto.type })

      if (error) {
        throw new Error(`Falha ao subir "${fotoOriginal.name}": ${error.message}. Confirme o bucket fotos-imoveis e as políticas de upload no Supabase.`)
      }

      if (!data?.path) {
        throw new Error(`Falha ao subir "${fotoOriginal.name}": o Supabase não retornou o caminho do arquivo.`)
      }

      const { data: urlData } = supabase.storage.from('fotos-imoveis').getPublicUrl(data.path)
      if (!urlData?.publicUrl) {
        throw new Error(`Falha ao gerar URL pública da foto "${fotoOriginal.name}".`)
      }

      urlsFotos.push(urlData.publicUrl)
    }

    return urlsFotos
  }

  function removerNovaFoto(index: number) {
    setNovasFotos((atuais) => atuais.filter((_, itemIndex) => itemIndex !== index))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSalvando(true)
    setErro('')
    setAviso('')

    try {
      const fotos = await subirFotos()
      // payloadBase: campos originais — usados também no fallback de erro
      const payloadBase = {
        titulo: form.titulo.trim(),
        tipo: form.tipo,
        categoria: form.categoria,
        preco: Number(form.preco || 0),
        area: numeroOuNulo(form.area),
        quartos: numeroOuNulo(form.quartos),
        banheiros: numeroOuNulo(form.banheiros),
        vagas: numeroOuNulo(form.vagas) || 0,
        endereco: form.endereco.trim(),
        bairro: form.bairro.trim(),
        cidade: form.cidade.trim(),
        descricao: form.descricao,
        destaque: form.destaque,
        ativo: form.ativo,
        mostrar_preco: form.mostrar_preco,
        fotos,
      }
      // payloadExtra: colunas adicionadas por migration — omitidas no fallback
      const payloadExtra = {
        foto_posicao: fotoPosicao,
      }

      const detalhesParaSalvar: DetalhesState = {
        ...detalhes,
        caracteristicas: Array.from(new Set(detalhes.caracteristicas.filter((item) => item.trim().length > 0))),
        aceita_financiamento: Array.from(new Set(detalhes.aceita_financiamento.filter((item) => item.trim().length > 0))),
        numero_lote: detalhes.numero_lote.trim(),
        cep: detalhes.cep.trim(),
        titulo_anuncio: detalhes.titulo_anuncio.trim(),
        descricao_anuncio: detalhes.descricao_anuncio,
      }

      const { error } = await supabase
        .from('imoveis')
        .update({ ...payloadBase, ...payloadExtra, dados_administrativos: detalhesParaSalvar })
        .eq('id', id)

      if (error) {
        const mensagem = error.message.toLowerCase()
        if (mensagem.includes('dados_administrativos') || mensagem.includes('column')) {
          const { error: fallbackError } = await supabase.from('imoveis').update(payloadBase).eq('id', id)
          if (fallbackError) throw fallbackError
          alert('Dados principais salvos. Para salvar os campos administrativos do PDF, aplique a migration SQL criada pelo script.')
          setSalvando(false)
          return
        }
        throw error
      }

      setNovasFotos([])
      setAviso('✅ Imóvel salvo com sucesso! As fotos foram enviadas.')
      setSalvando(false)
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : 'Erro desconhecido.'
      setErro(`Erro ao salvar: ${mensagem}`)
      setSalvando(false)
    }
  }

  const checkboxLabel = (ativo: boolean): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: ativo ? '#e8e0d0' : '#8a7d6a',
    fontSize: '12px',
    lineHeight: 1.35,
    cursor: 'pointer',
    border: ativo ? '1px solid rgba(201,168,76,0.5)' : '1px solid rgba(201,168,76,0.14)',
    background: ativo ? 'rgba(201,168,76,0.08)' : '#14120f',
    padding: '9px 10px',
  })

  if (loading) {
    return (
      <main style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6b6355', letterSpacing: '2px', fontSize: '12px' }}>CARREGANDO...</p>
      </main>
    )
  }

  return (
    <main style={{ background: '#0a0a0a', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <style>{`
        .editar-wrap { max-width: 1180px; margin: 0 auto; padding: 46px 32px 72px; }
        .editar-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
        .editar-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
        .caracteristicas-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 8px; }
        .admin-nav { display: flex; gap: 24px; align-items: center; }
        @media (max-width: 860px) {
          .editar-wrap { padding: 32px 16px 56px; }
          .editar-grid, .editar-grid-2 { grid-template-columns: 1fr !important; }
          .admin-nav { display: none !important; }
        }
      `}</style>

      <header style={{ background: '#0f0e0c', borderBottom: '1px solid rgba(201,168,76,0.2)', padding: '0 32px', minHeight: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <p style={{ fontFamily: 'Georgia,serif', fontSize: '18px', color: '#c9a84c' }}>Motta Admin</p>
          <nav className="admin-nav">
            <Link href="/admin/dashboard" style={{ color: '#a09880', fontSize: '12px', textDecoration: 'none' }}>Dashboard</Link>
            <Link href="/admin/imoveis" style={{ color: '#e8e0d0', fontSize: '12px', textDecoration: 'none' }}>Imóveis</Link>
            <Link href="/admin/leads" style={{ color: '#a09880', fontSize: '12px', textDecoration: 'none' }}>Leads</Link>
            <Link href="/admin/configuracoes" style={{ color: '#a09880', fontSize: '12px', textDecoration: 'none' }}>Configurações</Link>
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href={`/imovel/${id}`} style={{ color: '#6b6355', fontSize: '11px', letterSpacing: '1px', textDecoration: 'none' }}>Ver no site →</Link>
          <LogoutButton />
        </div>
      </header>

      <div className="editar-wrap">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', marginBottom: '34px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: '11px', letterSpacing: '4px', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '8px' }}>Editar imóvel</p>
            <h1 style={{ fontFamily: 'Georgia,serif', fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 300, color: '#e8e0d0', lineHeight: 1.15 }}>{form.titulo || 'Imóvel sem título'}</h1>
            <p style={{ color: '#6b6355', fontSize: '13px', marginTop: '10px' }}>Página administrativa completa baseada no formulário de referência. Anexos habilitados: somente fotos.</p>
          </div>
          <Link href="/admin/imoveis" style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.3)', color: '#a09880', padding: '12px 20px', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', textDecoration: 'none' }}>
            Voltar
          </Link>
        </div>

        {erro && <p style={{ background: 'rgba(192,57,43,0.12)', border: '1px solid rgba(192,57,43,0.35)', color: '#ffb2a8', padding: '14px 16px', marginBottom: '18px', fontSize: '13px' }}>{erro}</p>}
        {aviso && <p style={{ background: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.32)', color: '#d8bf73', padding: '14px 16px', marginBottom: '18px', fontSize: '13px' }}>{aviso}</p>}

        <form onSubmit={handleSubmit}>
          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>Identificação e anúncio</h2>
            <div className="editar-grid">
              <Campo label="Código do imóvel">
                <input name="codigo_imovel" value={detalhes.codigo_imovel} onChange={handleDetalheChange} style={inputStyle} placeholder="Ex.: 51" />
              </Campo>
              <Campo label="Finalidade">
                <select name="finalidade" value={detalhes.finalidade} onChange={handleDetalheChange} style={inputStyle}>
                  <option value="residencial">Residencial</option>
                  <option value="comercial">Comercial</option>
                  <option value="industrial">Industrial</option>
                  <option value="rural">Rural</option>
                </select>
              </Campo>
              <Campo label="Transação pública">
                <select name="tipo" value={form.tipo} onChange={handleFormChange} style={inputStyle}>
                  <option value="venda">Venda</option>
                  <option value="aluguel">Aluguel</option>
                </select>
              </Campo>
              <Campo label="Tipo do imóvel">
                <select name="categoria" value={form.categoria} onChange={handleFormChange} style={inputStyle}>
                  {categoriaOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Campo>
              <Campo label="Categoria / padrão">
                <select name="padrao" value={detalhes.padrao} onChange={handleDetalheChange} style={inputStyle}>
                  <option value="padrao">Padrão</option>
                  <option value="alto-padrao">Alto padrão</option>
                  <option value="luxo">Luxo</option>
                  <option value="popular">Popular</option>
                </select>
              </Campo>
              <Campo label="Preço de venda/locação">
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6b6355', fontSize: '14px' }}>R$</span>
                  <input value={precoDisplay} onChange={handlePreco} style={{ ...inputStyle, paddingLeft: '38px' }} placeholder="4.000.000" />
                </div>
              </Campo>
              <Campo label="Exibir preço no site">
                <select name="mostrar_preco" value={form.mostrar_preco ? 'sim' : 'nao'} onChange={(event) => setForm((atual) => ({ ...atual, mostrar_preco: event.target.value === 'sim' }))} style={inputStyle}>
                  <option value="sim">Mostrar valor</option>
                  <option value="nao">Sob consulta</option>
                </select>
              </Campo>
              <Campo label="Status">
                <select name="ativo" value={form.ativo ? 'ativo' : 'inativo'} onChange={(event) => setForm((atual) => ({ ...atual, ativo: event.target.value === 'ativo' }))} style={inputStyle}>
                  <option value="ativo">Ativo no site</option>
                  <option value="inativo">Inativo</option>
                </select>
              </Campo>
              <Campo label="Título do anúncio" full>
                <input name="titulo" value={form.titulo} onChange={handleFormChange} required style={inputStyle} placeholder="Casa à venda com 6 banheiros e 3 vagas" />
              </Campo>
              <Campo label="Descrição do anúncio" full>
                <textarea name="descricao" value={form.descricao} onChange={handleFormChange} rows={5} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} placeholder="Texto público do anúncio" />
              </Campo>
            </div>
          </section>

          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>Endereço e localização</h2>
            <div className="editar-grid">
              <Campo label="Endereço" full>
                <input name="endereco" value={form.endereco} onChange={handleFormChange} style={inputStyle} placeholder="Rua Walter Jobim" />
              </Campo>
              <Campo label="Número / lote">
                <input name="numero_lote" value={detalhes.numero_lote} onChange={handleDetalheChange} style={inputStyle} placeholder="10" />
              </Campo>
              <Campo label="Complemento">
                <input name="complemento" value={detalhes.complemento} onChange={handleDetalheChange} style={inputStyle} placeholder="Apto 42, fundos..." />
              </Campo>
              <Campo label="Bairro">
                <input name="bairro" value={form.bairro} onChange={handleFormChange} style={inputStyle} placeholder="Medianeira" />
              </Campo>
              <Campo label="Cidade">
                <input name="cidade" value={form.cidade} onChange={handleFormChange} style={inputStyle} placeholder="Panambi" />
              </Campo>
              <Campo label="UF">
                <input name="uf" value={detalhes.uf} onChange={handleDetalheChange} style={inputStyle} placeholder="RS" maxLength={2} />
              </Campo>
              <Campo label="CEP">
                <input name="cep" value={detalhes.cep} onChange={handleDetalheChange} style={inputStyle} placeholder="98280-000" />
              </Campo>
              <Campo label="Loteamento / condomínio / empreendimento">
                <input name="loteamento" value={detalhes.loteamento} onChange={handleDetalheChange} style={inputStyle} />
              </Campo>
              <Campo label="Torre / bloco">
                <input name="torre_bloco" value={detalhes.torre_bloco} onChange={handleDetalheChange} style={inputStyle} placeholder="Bloco A" />
              </Campo>
              <Campo label="Pontos de referência" full>
                <textarea name="referencias" value={detalhes.referencias} onChange={handleDetalheChange} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Referências próximas ao imóvel" />
              </Campo>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={checkboxLabel(detalhes.mapa_confirmado)}>
                  <input type="checkbox" name="mapa_confirmado" checked={detalhes.mapa_confirmado} onChange={handleDetalheChange} />
                  Localização confirmada no mapa
                </label>
              </div>
            </div>
          </section>

          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>Dados principais do imóvel</h2>
            <div className="editar-grid">
              <Campo label="Quartos">
                <input name="quartos" value={form.quartos} onChange={handleFormChange} type="number" min="0" style={inputStyle} />
              </Campo>
              <Campo label="Salas">
                <input name="salas" value={detalhes.salas} onChange={handleDetalheChange} type="number" min="0" style={inputStyle} />
              </Campo>
              <Campo label="Suítes">
                <input name="suites" value={detalhes.suites} onChange={handleDetalheChange} type="number" min="0" style={inputStyle} />
              </Campo>
              <Campo label="Banheiros">
                <input name="banheiros" value={form.banheiros} onChange={handleFormChange} type="number" min="0" style={inputStyle} />
              </Campo>
              <Campo label="Vagas de garagem">
                <input name="vagas" value={form.vagas} onChange={handleFormChange} type="number" min="0" style={inputStyle} />
              </Campo>
              <Campo label="Área pública do card (m²)">
                <input name="area" value={form.area} onChange={handleFormChange} type="number" min="0" step="0.01" style={inputStyle} />
              </Campo>
              <Campo label="Área útil (m²)">
                <input name="area_util" value={detalhes.area_util} onChange={handleDetalheChange} type="number" min="0" step="0.01" style={inputStyle} />
              </Campo>
              <Campo label="Área total (m²)">
                <input name="area_total" value={detalhes.area_total} onChange={handleDetalheChange} type="number" min="0" step="0.01" style={inputStyle} />
              </Campo>
              <Campo label="Área construída (m²)">
                <input name="area_construida" value={detalhes.area_construida} onChange={handleDetalheChange} type="number" min="0" step="0.01" style={inputStyle} />
              </Campo>
              <Campo label="Largura do terreno">
                <input name="largura_terreno" value={detalhes.largura_terreno} onChange={handleDetalheChange} type="number" min="0" step="0.01" style={inputStyle} />
              </Campo>
              <Campo label="Comprimento do terreno">
                <input name="comprimento_terreno" value={detalhes.comprimento_terreno} onChange={handleDetalheChange} type="number" min="0" step="0.01" style={inputStyle} />
              </Campo>
              <div style={{ display: 'flex', alignItems: 'end' }}>
                <label style={checkboxLabel(form.destaque)}>
                  <input type="checkbox" name="destaque" checked={form.destaque} onChange={handleFormChange} />
                  Destaque na vitrine
                </label>
              </div>
            </div>
          </section>

          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>Características</h2>
            <div style={{ display: 'grid', gap: '16px' }}>
              {gruposCaracteristicas.map((grupo) => (
                <details key={grupo.titulo} open={grupo.titulo === 'Bem-estar e comodidade'} style={{ border: '1px solid rgba(201,168,76,0.12)', background: '#14120f', padding: '16px' }}>
                  <summary style={{ color: '#c9a84c', cursor: 'pointer', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase' }}>{grupo.titulo}</summary>
                  <div className="caracteristicas-grid" style={{ marginTop: '14px' }}>
                    {grupo.itens.map((item) => {
                      const ativo = detalhes.caracteristicas.includes(item)
                      return (
                        <label key={item} style={checkboxLabel(ativo)}>
                          <input type="checkbox" checked={ativo} onChange={() => alternarLista('caracteristicas', item)} />
                          {item}
                        </label>
                      )
                    })}
                  </div>
                </details>
              ))}
            </div>
          </section>

          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>Proprietários, chaves e informações internas</h2>
            <div className="editar-grid-2">
              <Campo label="Dono(s) do imóvel" full>
                <textarea name="proprietarios" value={detalhes.proprietarios} onChange={handleDetalheChange} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Nome, telefone e observações dos proprietários" />
              </Campo>
              <Campo label="Chave disponível?">
                <select name="chave_disponivel" value={detalhes.chave_disponivel} onChange={handleDetalheChange} style={inputStyle}>
                  <option value="">Selecione</option>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </select>
              </Campo>
              <Campo label="Local da chave">
                <input name="local_chave" value={detalhes.local_chave} onChange={handleDetalheChange} style={inputStyle} />
              </Campo>
              <Campo label="Informações extras sobre a chave" full>
                <textarea name="info_chave" value={detalhes.info_chave} onChange={handleDetalheChange} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </Campo>
              <Campo label="Condição do imóvel">
                <input name="condicao" value={detalhes.condicao} onChange={handleDetalheChange} style={inputStyle} />
              </Campo>
              <Campo label="Ocupação do imóvel">
                <input name="ocupacao" value={detalhes.ocupacao} onChange={handleDetalheChange} style={inputStyle} />
              </Campo>
              <Campo label="Estágio da reforma">
                <input name="reforma" value={detalhes.reforma} onChange={handleDetalheChange} style={inputStyle} />
              </Campo>
              <Campo label="Estágio da obra">
                <input name="obra" value={detalhes.obra} onChange={handleDetalheChange} style={inputStyle} />
              </Campo>
            </div>
          </section>

          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>IPTU, condomínio e dados confidenciais</h2>
            <div className="editar-grid">
              <Campo label="Modo do IPTU">
                <select name="modo_iptu" value={detalhes.modo_iptu} onChange={handleDetalheChange} style={inputStyle}>
                  <option value="mensal">Mensal</option>
                  <option value="anual">Anual</option>
                  <option value="isento">Isento</option>
                </select>
              </Campo>
              <Campo label="Valor do IPTU/ITR">
                <input name="valor_iptu" value={detalhes.valor_iptu} onChange={handleDetalheChange} style={inputStyle} placeholder="R$" />
              </Campo>
              <Campo label="Modo do condomínio">
                <select name="modo_condominio" value={detalhes.modo_condominio} onChange={handleDetalheChange} style={inputStyle}>
                  <option value="mensal">Mensal</option>
                  <option value="anual">Anual</option>
                  <option value="nao-isento">Não isento</option>
                  <option value="isento">Isento</option>
                </select>
              </Campo>
              <Campo label="Valor do condomínio">
                <input name="valor_condominio" value={detalhes.valor_condominio} onChange={handleDetalheChange} style={inputStyle} placeholder="R$" />
              </Campo>
              <Campo label="IPTU nº">
                <input name="iptu_numero" value={detalhes.iptu_numero} onChange={handleDetalheChange} style={inputStyle} />
              </Campo>
              <Campo label="CCIR nº (INCRA)">
                <input name="ccir_numero" value={detalhes.ccir_numero} onChange={handleDetalheChange} style={inputStyle} />
              </Campo>
              <Campo label="Situação da escritura">
                <input name="escritura" value={detalhes.escritura} onChange={handleDetalheChange} style={inputStyle} />
              </Campo>
              <Campo label="Matrícula nº">
                <input name="matricula" value={detalhes.matricula} onChange={handleDetalheChange} style={inputStyle} />
              </Campo>
              <Campo label="Cartório" full>
                <input name="cartorio" value={detalhes.cartorio} onChange={handleDetalheChange} style={inputStyle} />
              </Campo>
              <Campo label="Energia nº">
                <input name="energia_numero" value={detalhes.energia_numero} onChange={handleDetalheChange} style={inputStyle} />
              </Campo>
              <Campo label="Água nº">
                <input name="agua_numero" value={detalhes.agua_numero} onChange={handleDetalheChange} style={inputStyle} />
              </Campo>
              <Campo label="Observações internas" full>
                <textarea name="observacoes_internas" value={detalhes.observacoes_internas} onChange={handleDetalheChange} rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
              </Campo>
            </div>
          </section>

          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>Transação e negociação</h2>
            <div className="editar-grid">
              <Campo label="Transação">
                <select name="transacao" value={detalhes.transacao} onChange={handleDetalheChange} style={inputStyle}>
                  <option value="vender">Vender</option>
                  <option value="alugar">Alugar</option>
                  <option value="vender-alugar">Vender e alugar</option>
                </select>
              </Campo>
              <Campo label="Corretor responsável">
                <input name="corretor_responsavel" value={detalhes.corretor_responsavel} onChange={handleDetalheChange} style={inputStyle} placeholder="Nome do corretor" />
              </Campo>
              <Campo label="Captadores">
                <input name="captadores" value={detalhes.captadores} onChange={handleDetalheChange} style={inputStyle} />
              </Campo>
              <Campo label="Autorizado para negociação">
                <select name="autorizado" value={detalhes.autorizado} onChange={handleDetalheChange} style={inputStyle}>
                  <option value="">Selecione</option>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </select>
              </Campo>
              <Campo label="Início do contrato">
                <input name="inicio_contrato" value={detalhes.inicio_contrato} onChange={handleDetalheChange} type="date" style={inputStyle} />
              </Campo>
              <Campo label="Duração em dias">
                <input name="duracao_contrato" value={detalhes.duracao_contrato} onChange={handleDetalheChange} type="number" min="0" style={inputStyle} />
              </Campo>
              <Campo label="Final do contrato">
                <input name="final_contrato" value={detalhes.final_contrato} onChange={handleDetalheChange} type="date" style={inputStyle} />
              </Campo>
              <Campo label="Anunciar no site">
                <select name="anunciar_site" value={detalhes.anunciar_site ? 'sim' : 'nao'} onChange={(event) => setDetalhes((atual) => ({ ...atual, anunciar_site: event.target.value === 'sim' }))} style={inputStyle}>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </select>
              </Campo>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Aceita financiamento</label>
                <div className="editar-grid">
                  {['Bancário', 'Direto', 'Construtora'].map((item) => {
                    const ativo = detalhes.aceita_financiamento.includes(item)
                    return (
                      <label key={item} style={checkboxLabel(ativo)}>
                        <input type="checkbox" checked={ativo} onChange={() => alternarLista('aceita_financiamento', item)} />
                        {item}
                      </label>
                    )
                  })}
                  <label style={checkboxLabel(detalhes.minha_casa)}>
                    <input type="checkbox" name="minha_casa" checked={detalhes.minha_casa} onChange={handleDetalheChange} />
                    Minha Casa Minha Vida
                  </label>
                </div>
              </div>
              <Campo label="Informações adicionais de financiamento" full>
                <textarea name="info_financiamento" value={detalhes.info_financiamento} onChange={handleDetalheChange} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </Campo>
              <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                <label style={checkboxLabel(detalhes.aceita_permuta)}>
                  <input type="checkbox" name="aceita_permuta" checked={detalhes.aceita_permuta} onChange={handleDetalheChange} />
                  Aceita permuta
                </label>
                <label style={checkboxLabel(detalhes.aceita_outro_bem)}>
                  <input type="checkbox" name="aceita_outro_bem" checked={detalhes.aceita_outro_bem} onChange={handleDetalheChange} />
                  Aceita outro bem
                </label>
              </div>
              <Campo label="Valor do veículo na troca">
                <input name="permuta_veiculo_valor" value={detalhes.permuta_veiculo_valor} onChange={handleDetalheChange} style={inputStyle} placeholder="R$" />
              </Campo>
              <Campo label="Valor do imóvel na troca">
                <input name="permuta_imovel_valor" value={detalhes.permuta_imovel_valor} onChange={handleDetalheChange} style={inputStyle} placeholder="R$" />
              </Campo>
              <Campo label="Outro bem - qual?">
                <input name="outro_bem_qual" value={detalhes.outro_bem_qual} onChange={handleDetalheChange} style={inputStyle} placeholder="Lancha de 30 pés" />
              </Campo>
              <Campo label="Outro bem - valor">
                <input name="outro_bem_valor" value={detalhes.outro_bem_valor} onChange={handleDetalheChange} style={inputStyle} placeholder="R$" />
              </Campo>
            </div>
          </section>

          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>Propaganda e publicação</h2>
            <div className="editar-grid">
              <Campo label="Propaganda no local">
                <select name="propaganda_local" value={detalhes.propaganda_local} onChange={handleDetalheChange} style={inputStyle}>
                  <option value="">Selecione</option>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </select>
              </Campo>
              <Campo label="Tipo de propaganda">
                <input name="propaganda_tipo" value={detalhes.propaganda_tipo} onChange={handleDetalheChange} style={inputStyle} />
              </Campo>
              <Campo label="Colocada em">
                <input name="propaganda_colocada_em" value={detalhes.propaganda_colocada_em} onChange={handleDetalheChange} type="date" style={inputStyle} />
              </Campo>
              <Campo label="Título administrativo">
                <input name="titulo_anuncio" value={detalhes.titulo_anuncio} onChange={handleDetalheChange} maxLength={80} style={inputStyle} />
              </Campo>
              <Campo label="Descrição administrativa" full>
                <textarea name="descricao_anuncio" value={detalhes.descricao_anuncio} onChange={handleDetalheChange} maxLength={3000} rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
                <p style={{ color: '#6b6355', fontSize: '11px', marginTop: '6px' }}>{detalhes.descricao_anuncio.length}/3000</p>
              </Campo>
            </div>
          </section>

          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>Fotos do imóvel</h2>
            <p style={{ color: '#6b6355', fontSize: '13px', marginBottom: '18px' }}>A primeira foto vira a capa no site. Arraste para reordenar ou use as setas. Vídeos, tour virtual e outros anexos não foram adicionados.</p>

            {fotosExistentes.length > 0 && (() => {
              const opcoes = [
                { label: '↖', valor: 'top left' },
                { label: '↑', valor: 'top center' },
                { label: '↗', valor: 'top right' },
                { label: '←', valor: 'center left' },
                { label: '·', valor: 'center center' },
                { label: '→', valor: 'center right' },
                { label: '↙', valor: 'bottom left' },
                { label: '↓', valor: 'bottom center' },
                { label: '↘', valor: 'bottom right' },
              ]
              return (
                <div style={{ marginBottom: '16px', background: '#14120f', border: '1px solid rgba(201,168,76,0.15)', padding: '14px 16px' }}>
                  <p style={{ fontSize: '10px', letterSpacing: '2px', color: '#6b6355', textTransform: 'uppercase', marginBottom: '10px' }}>
                    Posição da foto capa no site
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 32px)', gap: '4px' }}>
                      {opcoes.map(op => (
                        <button
                          key={op.valor}
                          type="button"
                          title={op.valor}
                          onClick={() => setFotoPosicao(op.valor)}
                          style={{
                            width: '32px', height: '32px',
                            background: fotoPosicao === op.valor ? '#c9a84c' : '#1a1814',
                            border: fotoPosicao === op.valor ? '1px solid #c9a84c' : '1px solid rgba(201,168,76,0.2)',
                            color: fotoPosicao === op.valor ? '#0a0a0a' : '#a09880',
                            fontSize: '14px', cursor: 'pointer', borderRadius: '2px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          {op.label}
                        </button>
                      ))}
                    </div>
                    {fotosExistentes[0] && (
                      <div style={{ width: '120px', height: '72px', overflow: 'hidden', border: '1px solid rgba(201,168,76,0.25)', flexShrink: 0 }}>
                        <img
                          src={fotosExistentes[0]}
                          alt="preview"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: fotoPosicao, display: 'block' }}
                        />
                      </div>
                    )}
                    <p style={{ fontSize: '11px', color: '#4a4438', letterSpacing: '0.5px', maxWidth: '180px' }}>
                      Ajusta o recorte da foto principal na página do imóvel
                    </p>
                  </div>
                </div>
              )
            })()}

            {fotosExistentes.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                {fotosExistentes.map((url, index) => (
                  <div
                    key={`${url}-${index}`}
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(index)}
                    onDragEnd={() => setDragIndex(null)}
                    style={{ position: 'relative', border: index === 0 ? '2px solid #c9a84c' : '1px solid rgba(201,168,76,0.2)', background: '#14120f', overflow: 'hidden', cursor: 'grab', opacity: dragIndex === index ? 0.55 : 1 }}
                  >
                    {index === 0 && <span style={{ position: 'absolute', top: '6px', left: '6px', zIndex: 2, background: '#c9a84c', color: '#0a0a0a', fontSize: '9px', padding: '3px 7px', letterSpacing: '1px', fontWeight: 700 }}>CAPA</span>}
                    <img src={url} alt={`Foto ${index + 1} do imóvel`} style={{ width: '100%', height: '112px', objectFit: 'cover', display: 'block' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: '#1a1814', padding: '5px' }}>
                      <button type="button" onClick={() => moverFoto(index, 'esquerda')} disabled={index === 0} style={{ background: 'transparent', border: 'none', color: index === 0 ? '#3a3528' : '#a09880', cursor: index === 0 ? 'not-allowed' : 'pointer', padding: '3px 8px' }}>←</button>
                      <button type="button" onClick={() => removerFoto(index)} style={{ background: 'transparent', border: 'none', color: '#ff8a7a', cursor: 'pointer', fontSize: '12px', padding: '3px 8px' }}>Remover</button>
                      <button type="button" onClick={() => moverFoto(index, 'direita')} disabled={index === fotosExistentes.length - 1} style={{ background: 'transparent', border: 'none', color: index === fotosExistentes.length - 1 ? '#3a3528' : '#a09880', cursor: index === fotosExistentes.length - 1 ? 'not-allowed' : 'pointer', padding: '3px 8px' }}>→</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ border: '1px dashed rgba(201,168,76,0.35)', background: '#14120f', padding: '22px', textAlign: 'center' }}>
              <label style={{ color: '#c9a84c', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer' }}>
                Clique aqui para adicionar fotos
                <input type="file" multiple accept="image/*" onChange={handleFotos} style={{ display: 'none' }} />
              </label>
              <p style={{ color: '#6b6355', fontSize: '12px', marginTop: '8px' }}>JPG, PNG, WEBP ou GIF até 10MB por arquivo. Se a marca d’água estiver ativa em Configurações, ela será gravada nas novas fotos ao salvar.</p>
              {novasFotos.length > 0 && (
                <div style={{ marginTop: '14px', display: 'grid', gap: '8px' }}>
                  <p style={{ color: '#e8e0d0', fontSize: '13px' }}>{novasFotos.length} nova(s) foto(s) selecionada(s). Elas sobem quando você salvar.</p>
                  {watermark.ativo && watermark.logo && <p style={{ color: '#c9a84c', fontSize: '12px' }}>Marca d’água ativa: a logo será aplicada nas fotos novas.</p>}
                  {novasFotos.map((foto, index) => (
                    <div key={`${foto.name}-${foto.lastModified}-${index}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: '#0f0e0c', border: '1px solid rgba(201,168,76,0.16)', padding: '8px 10px' }}>
                      <span style={{ color: '#a09880', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{foto.name}</span>
                      <button type="button" onClick={() => removerNovaFoto(index)} style={{ background: 'transparent', border: 'none', color: '#ff8a7a', cursor: 'pointer', fontSize: '12px' }}>Remover</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <div style={{ position: 'sticky', bottom: 0, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap', background: 'rgba(10,10,10,0.94)', borderTop: '1px solid rgba(201,168,76,0.18)', padding: '18px 0 0', marginTop: '28px' }}>
            <p style={{ color: '#6b6355', fontSize: '12px' }}>Revise os dados antes de salvar. Campos confidenciais ficam somente no JSON administrativo.</p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Link href="/admin/imoveis" style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.3)', color: '#a09880', padding: '14px 24px', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', textDecoration: 'none' }}>
                Cancelar
              </Link>
              <button type="submit" disabled={salvando} style={{ background: '#c9a84c', color: '#0a0a0a', border: 'none', padding: '14px 28px', fontSize: '12px', letterSpacing: '3px', textTransform: 'uppercase', fontWeight: 700, cursor: salvando ? 'wait' : 'pointer', opacity: salvando ? 0.72 : 1 }}>
                {salvando ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  )
}

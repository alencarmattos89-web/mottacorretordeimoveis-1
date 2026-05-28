export type WatermarkSettings = {
  ativo: boolean
  logo: string
  opacidade: number
  posicao: string
  tamanho: number
  margem: number
}

// ─── Configurações de compressão ─────────────────────────────
// Lado máximo em px (redimensiona proporcionalmente se maior)
const MAX_LADO = 2000
// Tentativas de qualidade JPEG — para no primeiro que ficar abaixo de TARGET_BYTES
const QUALIDADES = [0.82, 0.70, 0.60]
const TARGET_BYTES = 1.5 * 1024 * 1024 // 1.5 MB

/**
 * Comprime uma foto para web antes do upload.
 * - Redimensiona para no máximo MAX_LADO px no lado maior
 * - Converte qualquer formato para JPEG (PNG de iPhone são enormes)
 * - Aplica compressão progressiva até ficar abaixo de TARGET_BYTES
 */
export async function comprimirFoto(file: File): Promise<File> {
  const url = URL.createObjectURL(file)
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.onload = () => { URL.revokeObjectURL(url); resolve(i) }
    i.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Não foi possível ler "${file.name}".`)) }
    i.src = url
  })

  // Calcula dimensões respeitando proporção
  let { naturalWidth: w, naturalHeight: h } = img
  if (!w) w = img.width
  if (!h) h = img.height

  if (w > MAX_LADO || h > MAX_LADO) {
    if (w >= h) { h = Math.round(h * MAX_LADO / w); w = MAX_LADO }
    else        { w = Math.round(w * MAX_LADO / h); h = MAX_LADO }
  }

  const canvas = document.createElement('canvas')
  canvas.width  = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return file // fallback seguro

  ctx.drawImage(img, 0, 0, w, h)

  // Tenta qualidades progressivas até atingir o tamanho alvo
  for (const qualidade of QUALIDADES) {
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, 'image/jpeg', qualidade)
    )
    if (!blob) break
    if (blob.size <= TARGET_BYTES || qualidade === QUALIDADES[QUALIDADES.length - 1]) {
      // Troca extensão para .jpg
      const nomeJpeg = file.name.replace(/\.(png|gif|webp|bmp|tiff?)$/i, '') + '.jpg'
      return new File([blob], nomeJpeg, { type: 'image/jpeg', lastModified: Date.now() })
    }
  }

  return file // fallback: retorna original se algo der errado
}

// ─── Funções internas do pipeline de marca d'água ────────────

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Não foi possível carregar a imagem.'))
    image.src = src
  })
}

function arquivoParaImagem(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`Não foi possível ler a foto "${file.name}".`))
    }
    image.src = url
  })
}

function calcularPosicao(posicao: string, larguraBase: number, alturaBase: number, larguraLogo: number, alturaLogo: number, margem: number) {
  const centroX = (larguraBase - larguraLogo) / 2
  const centroY = (alturaBase - alturaLogo) / 2

  switch (posicao) {
    case 'topo-esquerda':
      return { x: margem, y: margem }
    case 'topo-direita':
      return { x: larguraBase - larguraLogo - margem, y: margem }
    case 'inferior-esquerda':
      return { x: margem, y: alturaBase - alturaLogo - margem }
    case 'inferior-direita':
      return { x: larguraBase - larguraLogo - margem, y: alturaBase - alturaLogo - margem }
    case 'centro':
    default:
      return { x: centroX, y: centroY }
  }
}

/**
 * Aplica marca d'água. Já inclui compressão/redimensionamento.
 * Se a logo não carregar (CORS, URL inválida), sobe sem marca d'água.
 */
export async function aplicarMarcaDagua(file: File, settings: WatermarkSettings): Promise<File> {
  // Sempre comprime primeiro (redimensiona + converte para JPEG)
  const fotoComprimida = await comprimirFoto(file)

  if (!settings.ativo || !settings.logo) return fotoComprimida

  const foto = await arquivoParaImagem(fotoComprimida)

  // Fallback seguro: se a logo não carregar, sobe sem marca d'água
  let logo: HTMLImageElement
  try {
    logo = await carregarImagem(settings.logo)
  } catch {
    console.warn('[marca-dagua] Logo inacessível — subindo sem marca d\'água.')
    return fotoComprimida
  }

  const canvas = document.createElement('canvas')
  canvas.width  = foto.naturalWidth  || foto.width
  canvas.height = foto.naturalHeight || foto.height

  const ctx = canvas.getContext('2d')
  if (!ctx) return fotoComprimida

  ctx.drawImage(foto, 0, 0, canvas.width, canvas.height)

  const percentual  = Math.min(Math.max(Number(settings.tamanho)   || 18,  5), 60)
  const margem      = Math.max(Number(settings.margem)              || 24,  0)
  const larguraLogo = Math.max(24, canvas.width * (percentual / 100))
  const alturaLogo  = larguraLogo * ((logo.naturalHeight || logo.height) / (logo.naturalWidth || logo.width))
  const { x, y }    = calcularPosicao(settings.posicao, canvas.width, canvas.height, larguraLogo, alturaLogo, margem)

  ctx.globalAlpha = Math.min(Math.max(Number(settings.opacidade) || 45, 5), 100) / 100
  ctx.drawImage(logo, x, y, larguraLogo, alturaLogo)
  ctx.globalAlpha = 1

  // Saída sempre JPEG (a foto já foi convertida em comprimirFoto)
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((resultado) => {
      if (resultado) resolve(resultado)
      else reject(new Error(`Não foi possível finalizar a marca d'água em "${file.name}".`))
    }, 'image/jpeg', 0.88)
  })

  const nomeJpeg = file.name.replace(/\.(png|gif|webp|bmp|tiff?)$/i, '') + '.jpg'
  return new File([blob], nomeJpeg, { type: 'image/jpeg', lastModified: Date.now() })
}

export type WatermarkSettings = {
  ativo: boolean
  logo: string
  opacidade: number
  posicao: string
  tamanho: number
  margem: number
}

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

export async function aplicarMarcaDagua(file: File, settings: WatermarkSettings): Promise<File> {
  if (!settings.ativo || !settings.logo) return file

  const foto = await arquivoParaImagem(file)
  const logo = await carregarImagem(settings.logo)
  const canvas = document.createElement('canvas')
  canvas.width = foto.naturalWidth || foto.width
  canvas.height = foto.naturalHeight || foto.height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não foi possível preparar a foto para marca d’água.')

  ctx.drawImage(foto, 0, 0, canvas.width, canvas.height)

  const percentual = Math.min(Math.max(Number(settings.tamanho) || 18, 5), 60)
  const margem = Math.max(Number(settings.margem) || 24, 0)
  const larguraLogo = Math.max(24, canvas.width * (percentual / 100))
  const alturaLogo = larguraLogo * ((logo.naturalHeight || logo.height) / (logo.naturalWidth || logo.width))
  const { x, y } = calcularPosicao(settings.posicao, canvas.width, canvas.height, larguraLogo, alturaLogo, margem)

  ctx.globalAlpha = Math.min(Math.max(Number(settings.opacidade) || 45, 5), 100) / 100
  ctx.drawImage(logo, x, y, larguraLogo, alturaLogo)
  ctx.globalAlpha = 1

  const tipoSaida = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ? file.type : 'image/jpeg'
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((resultado) => {
      if (resultado) resolve(resultado)
      else reject(new Error(`Não foi possível finalizar a marca d’água em "${file.name}".`))
    }, tipoSaida, 0.92)
  })

  return new File([blob], file.name, { type: tipoSaida, lastModified: Date.now() })
}

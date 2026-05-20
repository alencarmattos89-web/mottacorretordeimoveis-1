import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function getSupabase() {
  if (!supabaseUrl || (!supabaseServiceRoleKey && !supabaseAnonKey)) {
    throw new Error('Variáveis Supabase não configuradas')
  }

  const supabaseKey = supabaseServiceRoleKey || supabaseAnonKey!

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function somenteDigitos(valor?: string | null) {
  return String(valor || '').replace(/\D/g, '')
}

function normalizarTelefone(valor?: string | null) {
  const digitos = somenteDigitos(valor)
  if (!digitos) return null
  if (digitos.startsWith('55')) return digitos
  if (digitos.length >= 10) return `55${digitos}`
  return digitos
}

function limparTexto(valor: unknown, fallback = '') {
  const texto = String(valor ?? '').trim()
  return texto || fallback
}

function proximaAcaoPadrao() {
  const data = new Date()
  data.setHours(data.getHours() + 2)
  return data.toISOString()
}

function montarMensagemWhatsApp(input: {
  id: string | number
  nome: string
  imovel_titulo?: string | null
  pagina_url?: string | null
}) {
  const linhas = [
    `Olá! Tenho interesse no imóvel: ${input.imovel_titulo || 'imóvel do site'}.`,
    `Código do atendimento: #${input.id}`,
  ]

  if (input.pagina_url) linhas.push(`Link: ${input.pagina_url}`)

  return linhas.join('\n')
}


async function enviarNotificacaoWhatsApp(input: {
  lead: any
  whatsapp_url?: string | null
}) {
  const token = process.env.WHATSAPP_CLOUD_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID
  const apiVersion = process.env.WHATSAPP_CLOUD_API_VERSION || 'v22.0'
  const notifyTo = normalizarTelefone(
    process.env.WHATSAPP_NOTIFY_TO || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
  )

  const templateName = process.env.WHATSAPP_NOTIFY_TEMPLATE_NAME || 'novo_lead_site'
  const templateLang = process.env.WHATSAPP_NOTIFY_TEMPLATE_LANG || 'pt_BR'

  if (!token || !phoneNumberId || !notifyTo) {
    console.warn('Notificação WhatsApp não enviada: variáveis da Cloud API ausentes.')
    return
  }

  const lead = input.lead || {}
  const codigo = lead.codigo_atendimento || `#${lead.id}`
  const link = lead.pagina_url || input.whatsapp_url || 'Site'

  const limitar = (valor: unknown) =>
    String(valor || 'Não informado').slice(0, 900)

  const payload = {
    messaging_product: 'whatsapp',
    to: notifyTo,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: templateLang,
      },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: limitar(lead.nome) },
            { type: 'text', text: limitar(lead.telefone_normalizado || lead.telefone) },
            { type: 'text', text: limitar(lead.imovel_titulo || 'Imóvel do site') },
            { type: 'text', text: limitar(codigo) },
            { type: 'text', text: limitar(link) },
          ],
        },
      ],
    },
  }

  const res = await fetch(
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  )

  if (!res.ok) {
    const detalhes = await res.text()
    console.error('Erro ao enviar notificação WhatsApp:', detalhes)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = getSupabase()

    const origem = limparTexto(body.origem, 'formulario')
    const nome = limparTexto(body.nome, origem === 'whatsapp_click' ? 'Lead via WhatsApp' : '')
    const telefone = limparTexto(body.telefone, origem === 'whatsapp_click' ? 'Não informado' : '')

    if (!nome) {
      return NextResponse.json({ error: 'Informe o nome do lead.' }, { status: 400 })
    }

    if (!telefone) {
      return NextResponse.json({ error: 'Informe o telefone do lead.' }, { status: 400 })
    }

    const telefoneNormalizado = normalizarTelefone(telefone)
    const paginaUrl = limparTexto(body.pagina_url, '') || req.headers.get('referer') || null
    const imovelTitulo = limparTexto(body.imovel_titulo || body.referencia || body.referencia_imovel, '') || null
    const imovelId = body.imovel_id || null

    const payload = {
      nome,
      telefone,
      telefone_normalizado: telefoneNormalizado,
      email: limparTexto(body.email, '') || null,
      imovel_id: imovelId,
      imovel_titulo: imovelTitulo,
      origem,
      pagina_url: paginaUrl,
      status: limparTexto(body.status, 'novo'),
      temperatura: limparTexto(body.temperatura, origem === 'whatsapp_click' ? 'quente' : 'morno'),
      preferencias: limparTexto(body.preferencias, '') || null,
      proxima_acao_em: body.proxima_acao_em || proximaAcaoPadrao(),
      ultima_interacao_em: new Date().toISOString(),
      consentiu_whatsapp: body.consentiu_whatsapp !== false,
      anotacoes: limparTexto(body.anotacoes, '') || null,
    }

    const { data, error } = await supabase
      .from('leads')
      .insert(payload)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const corretorWhatsApp = normalizarTelefone(body.corretor_whatsapp || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER)
    const mensagem = montarMensagemWhatsApp({
      id: data.id,
      nome: data.nome,
      imovel_titulo: data.imovel_titulo,
      pagina_url: data.pagina_url,
    })

    const whatsapp_url = corretorWhatsApp
      ? `https://wa.me/${corretorWhatsApp}?text=${encodeURIComponent(mensagem)}`
      : null

    enviarNotificacaoWhatsApp({ lead: data, whatsapp_url }).catch((err) =>
      console.error('Erro ao disparar notificação WhatsApp:', err)
    )

    // Integração opcional: coloque uma URL de webhook do n8n/Zapier/Make em CRM_NOTIFICATION_WEBHOOK_URL.
    // Assim você pode receber aviso no WhatsApp, Telegram ou e-mail sem travar o formulário.
    if (process.env.CRM_NOTIFICATION_WEBHOOK_URL) {
      fetch(process.env.CRM_NOTIFICATION_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead: data, whatsapp_url }),
      }).catch((err) => console.error('Erro ao notificar webhook do CRM:', err))
    }

    return NextResponse.json({ success: true, id: data.id, lead: data, whatsapp_url })
  } catch (err) {
    console.error('Erro no endpoint /api/leads:', err)
    return NextResponse.json({ error: 'Erro ao processar lead.' }, { status: 500 })
  }
}

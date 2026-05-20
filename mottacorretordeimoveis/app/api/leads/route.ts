import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function getSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY não configuradas')
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
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

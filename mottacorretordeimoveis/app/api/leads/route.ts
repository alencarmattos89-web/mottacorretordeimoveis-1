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
  if (!supabaseServiceRoleKey) {
    console.warn('[leads/route] AVISO: SUPABASE_SERVICE_ROLE_KEY não definida.')
  }
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

function telefoneEhValido(telefone: string): boolean {
  // Rejeita placeholder, vazio, ou menos de 10 dígitos reais
  const invalidos = ['não informado', 'nao informado', 'sem telefone', '']
  const limpo = telefone.trim().toLowerCase()
  if (invalidos.includes(limpo)) return false
  const digitos = somenteDigitos(telefone)
  return digitos.length >= 10
}

function proximaAcaoPadrao() {
  const data = new Date()
  data.setHours(data.getHours() + 2)
  return data.toISOString()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = getSupabase()

    const origem = limparTexto(body.origem, 'formulario')
    const nome = limparTexto(body.nome, '')
    const telefone = limparTexto(body.telefone, '')

    if (!nome) {
      return NextResponse.json({ error: 'Informe o nome do lead.' }, { status: 400 })
    }

    // ── VALIDAÇÃO DE TELEFONE ────────────────────────────────────────────────
    // Bloqueia envio sem número real — evita leads inúteis no CRM
    if (!telefoneEhValido(telefone)) {
      return NextResponse.json(
        { error: 'Informe um número de WhatsApp válido com DDD para continuar.' },
        { status: 400 }
      )
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

    // Webhook externo (n8n / Make / Zapier) — opcional
    if (process.env.CRM_NOTIFICATION_WEBHOOK_URL) {
      fetch(process.env.CRM_NOTIFICATION_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead: data }),
      }).catch((err) => console.error('Erro ao notificar webhook:', err))
    }

    return NextResponse.json({ success: true, id: data.id, lead: data })
  } catch (err) {
    console.error('Erro no endpoint /api/leads:', err)
    return NextResponse.json({ error: 'Erro ao processar lead.' }, { status: 500 })
  }
}

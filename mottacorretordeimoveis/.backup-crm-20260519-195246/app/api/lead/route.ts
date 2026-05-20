import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-browser'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nome, telefone, email, tipo_imovel, categoria, referencia, pagina_url } = body

    // Inserção sem tipagem genérica, usar 'any'
    const { data, error } = await supabase
      .from('atendimentos')
      .insert([{
        nome,
        telefone,
        email,
        tipo_interesse: 'Venda',
        categoria_imovel: categoria || tipo_imovel,
        referencia_imovel: referencia,
        pagina_url,
        status: 'Abertos',
        criado_em: new Date()
      }])

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Validar que data existe
    const leadId = (data as any)?.[0]?.id
    if (!leadId) {
      return NextResponse.json({ error: 'Não foi possível criar o lead' }, { status: 400 })
    }

    // Envia WhatsApp
    try {
      await fetch('https://api.whatsapp.example.com/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: '+55CORRETOR',
          message: `Novo lead:
Nome: ${nome}
Telefone: ${telefone}
Interesse: Venda - ${categoria || tipo_imovel}
Imóvel: ${referencia}
Link CRM: ${process.env.NEXT_PUBLIC_CRM_URL}/atendimento/${leadId}`
        })
      })
    } catch (err) {
      console.error('Erro ao enviar WhatsApp:', err)
    }

    return NextResponse.json({ success: true, id: leadId })
  } catch (err) {
    console.error('Erro no endpoint /api/lead:', err)
    return NextResponse.json({ error: 'Erro ao processar lead' }, { status: 500 })
  }
}
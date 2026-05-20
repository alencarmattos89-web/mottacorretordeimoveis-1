#!/bin/bash

# Script para adicionar CRM de leads + integração WhatsApp
# Cria backup dos arquivos alterados

echo "Criando backup..."
timestamp=$(date +%Y%m%d-%H%M%S)
backup_dir=".backup-crm-$timestamp"
mkdir -p "$backup_dir"
cp -r app "$backup_dir"
cp -r lib "$backup_dir"
cp -r supabase/migrations "$backup_dir"
echo "Backup criado em $backup_dir"

# Cria migration para tabela de atendimentos
migration_file="supabase/migrations/20260519150000_create_atendimentos.sql"
mkdir -p supabase/migrations
cat <<EOL > "$migration_file"
-- Migration: Criação da tabela de atendimentos
create table if not exists public.atendimentos (
    id bigserial primary key,
    nome text not null,
    telefone text not null,
    email text,
    tipo_interesse text not null,
    categoria_imovel text,
    referencia_imovel text,
    pagina_url text,
    status text not null default 'Abertos',
    criado_em timestamp not null default now()
);
EOL
echo "Migration de atendimentos criada: $migration_file"

# Cria endpoint API /api/lead
mkdir -p app/api/lead
cat <<'EOF' > app/api/lead/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-browser'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { nome, telefone, email, tipo_imovel, categoria, referencia, pagina_url } = body

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

  // Enviar WhatsApp (exemplo Twilio / 360dialog)
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
Link CRM: ${process.env.NEXT_PUBLIC_CRM_URL}/atendimento/${data[0].id}`
      })
    })
  } catch (err) {
    console.error('Erro ao enviar WhatsApp:', err)
  }

  return NextResponse.json({ success: true, id: data[0].id })
}
EOF

echo "Endpoint API /api/lead criado em app/api
echo "Script finalizado. Rodar a migration no Supabase e

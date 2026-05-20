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

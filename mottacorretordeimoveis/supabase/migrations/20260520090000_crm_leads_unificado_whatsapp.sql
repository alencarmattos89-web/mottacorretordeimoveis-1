-- CRM unificado para leads + rastreio de origem WhatsApp/formulário.
-- Depois de aplicar esta migration, use a tabela public.leads como fonte única do CRM.

create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null,
  email text,
  imovel_id uuid,
  imovel_titulo text,
  status text not null default 'novo',
  anotacoes text,
  created_at timestamptz not null default now()
);

alter table public.leads add column if not exists origem text not null default 'formulario';
alter table public.leads add column if not exists telefone_normalizado text;
alter table public.leads add column if not exists temperatura text not null default 'morno';
alter table public.leads add column if not exists preferencias text;
alter table public.leads add column if not exists orcamento_min numeric;
alter table public.leads add column if not exists orcamento_max numeric;
alter table public.leads add column if not exists proxima_acao_em timestamptz;
alter table public.leads add column if not exists ultima_interacao_em timestamptz;
alter table public.leads add column if not exists pagina_url text;
alter table public.leads add column if not exists codigo_atendimento text;
alter table public.leads add column if not exists consentiu_whatsapp boolean not null default true;
alter table public.leads add column if not exists updated_at timestamptz not null default now();

create index if not exists leads_status_idx on public.leads(status);
create index if not exists leads_origem_idx on public.leads(origem);
create index if not exists leads_proxima_acao_idx on public.leads(proxima_acao_em);
create index if not exists leads_created_at_idx on public.leads(created_at desc);
create index if not exists leads_telefone_normalizado_idx on public.leads(telefone_normalizado);

create or replace function public.set_leads_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
before update on public.leads
for each row execute function public.set_leads_updated_at();

-- Migra dados antigos de public.atendimentos, se a tabela existir.
do $$
begin
  if to_regclass('public.atendimentos') is not null then
    insert into public.leads (
      nome,
      telefone,
      email,
      imovel_titulo,
      status,
      origem,
      pagina_url,
      created_at,
      ultima_interacao_em,
      codigo_atendimento,
      consentiu_whatsapp
    )
    select
      a.nome,
      a.telefone,
      a.email,
      a.referencia_imovel,
      case
        when lower(coalesce(a.status, '')) in ('abertos', 'aberto') then 'novo'
        when lower(coalesce(a.status, '')) in ('fechado', 'fechados') then 'fechado'
        when lower(coalesce(a.status, '')) in ('perdido', 'perdidos') then 'perdido'
        else 'novo'
      end,
      'migrado_atendimentos',
      a.pagina_url,
      coalesce(a.criado_em, now()),
      coalesce(a.criado_em, now()),
      'A-' || a.id::text,
      true
    from public.atendimentos a
    where not exists (
      select 1
      from public.leads l
      where l.telefone = a.telefone
        and coalesce(l.imovel_titulo, '') = coalesce(a.referencia_imovel, '')
        and l.created_at between coalesce(a.criado_em, now()) - interval '5 minutes'
                         and coalesce(a.criado_em, now()) + interval '5 minutes'
    );
  end if;
end $$;

-- Segurança mínima: visitante pode criar lead; admin autenticado pode ler/editar.
alter table public.leads enable row level security;

drop policy if exists "leads_insert_public" on public.leads;
drop policy if exists "leads_select_admin" on public.leads;
drop policy if exists "leads_update_admin" on public.leads;
drop policy if exists "leads_delete_admin" on public.leads;

create policy "leads_insert_public"
on public.leads for insert
to anon, authenticated
with check (true);

create policy "leads_select_admin"
on public.leads for select
to authenticated
using (true);

create policy "leads_update_admin"
on public.leads for update
to authenticated
using (true)
with check (true);

create policy "leads_delete_admin"
on public.leads for delete
to authenticated
using (true);

-- Histórico de interações por lead.
-- Cada registro = uma ação/contato realizado pelo corretor.

create table if not exists public.lead_interacoes (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  tipo        text not null default 'anotacao',
  -- tipo: 'anotacao' | 'ligacao' | 'whatsapp' | 'visita' | 'proposta' | 'status_change'
  descricao   text not null,
  status_de   text,
  status_para text,
  criado_em   timestamptz not null default now()
);

create index if not exists lead_interacoes_lead_id_idx on public.lead_interacoes(lead_id);
create index if not exists lead_interacoes_criado_em_idx on public.lead_interacoes(criado_em desc);

alter table public.lead_interacoes enable row level security;

drop policy if exists "interacoes_select_admin" on public.lead_interacoes;
drop policy if exists "interacoes_insert_admin" on public.lead_interacoes;
drop policy if exists "interacoes_delete_admin" on public.lead_interacoes;

create policy "interacoes_select_admin"
  on public.lead_interacoes for select
  to authenticated using (true);

create policy "interacoes_insert_admin"
  on public.lead_interacoes for insert
  to authenticated with check (true);

create policy "interacoes_delete_admin"
  on public.lead_interacoes for delete
  to authenticated using (true);

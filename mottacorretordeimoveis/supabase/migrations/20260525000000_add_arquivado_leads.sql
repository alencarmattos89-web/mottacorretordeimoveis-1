-- Adiciona coluna `arquivado` na tabela leads.
-- Idempotente: IF NOT EXISTS — seguro rodar mais de uma vez.

alter table public.leads
  add column if not exists arquivado boolean not null default false;

create index if not exists leads_arquivado_idx
  on public.leads (arquivado);

update public.leads
  set arquivado = false
  where arquivado is null;

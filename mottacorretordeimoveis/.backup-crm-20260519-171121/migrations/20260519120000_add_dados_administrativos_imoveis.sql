-- Campos administrativos da página de edição de imóveis.
-- Mantém o site público compatível e guarda os dados extras do formulário em JSONB.
alter table public.imoveis
  add column if not exists dados_administrativos jsonb not null default '{}'::jsonb;

comment on column public.imoveis.dados_administrativos is
  'Dados administrativos extras do imóvel: endereço completo, características, chaves, IPTU, negociação, financiamento, dados confidenciais e publicação.';

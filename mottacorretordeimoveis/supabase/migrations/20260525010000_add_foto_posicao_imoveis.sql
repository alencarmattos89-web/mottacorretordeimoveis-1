-- Adiciona coluna foto_posicao na tabela imoveis.
-- Controla o object-position da foto principal no site público.
-- Valores: 'top left' | 'top center' | 'top right' |
--          'center left' | 'center center' | 'center right' |
--          'bottom left' | 'bottom center' | 'bottom right'
alter table public.imoveis
  add column if not exists foto_posicao text not null default 'center center';

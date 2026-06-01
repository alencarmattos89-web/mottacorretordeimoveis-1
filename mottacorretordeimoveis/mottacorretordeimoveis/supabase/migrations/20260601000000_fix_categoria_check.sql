-- Migration: corrige o CHECK constraint de categoria em imoveis
-- O frontend usa "sala-comercial" (com hífen), mas o constraint
-- original não incluía esse valor. Esta migration dropa o constraint
-- antigo e recria aceitando todos os valores do frontend.

ALTER TABLE public.imoveis
  DROP CONSTRAINT IF EXISTS imoveis_categoria_check;

ALTER TABLE public.imoveis
  ADD CONSTRAINT imoveis_categoria_check CHECK (
    categoria IN (
      'casa',
      'apartamento',
      'terreno',
      'comercial',
      'rural',
      'galpao',
      'sala-comercial'
    )
  );

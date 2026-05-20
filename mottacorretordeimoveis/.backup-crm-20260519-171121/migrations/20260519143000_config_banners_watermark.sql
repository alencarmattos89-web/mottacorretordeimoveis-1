-- Configurações extras do site: foto principal sem corte, textos, carrossel de banners e marca d'água.
alter table public.configuracoes
  add column if not exists hero_titulo_cor text default '#e8e0d0',
  add column if not exists hero_titulo_tamanho integer default 52,
  add column if not exists hero_subtitulo_cor text default '#c9a84c',
  add column if not exists hero_subtitulo_tamanho integer default 11,
  add column if not exists hero_descricao_cor text default '#6b6355',
  add column if not exists hero_descricao_tamanho integer default 13,
  add column if not exists hero_imagem_ajuste text default 'contain',
  add column if not exists banner_imagens jsonb not null default '[]'::jsonb,
  add column if not exists banner_intervalo integer default 5,
  add column if not exists watermark_ativo boolean not null default false,
  add column if not exists watermark_logo text default '',
  add column if not exists watermark_opacidade integer default 45,
  add column if not exists watermark_posicao text default 'inferior-direita',
  add column if not exists watermark_tamanho integer default 18,
  add column if not exists watermark_margem integer default 32;

update public.configuracoes
set
  hero_titulo_cor = coalesce(hero_titulo_cor, '#e8e0d0'),
  hero_titulo_tamanho = coalesce(hero_titulo_tamanho, 52),
  hero_subtitulo_cor = coalesce(hero_subtitulo_cor, '#c9a84c'),
  hero_subtitulo_tamanho = coalesce(hero_subtitulo_tamanho, 11),
  hero_descricao_cor = coalesce(hero_descricao_cor, '#6b6355'),
  hero_descricao_tamanho = coalesce(hero_descricao_tamanho, 13),
  hero_imagem_ajuste = coalesce(hero_imagem_ajuste, 'contain'),
  banner_imagens = coalesce(banner_imagens, '[]'::jsonb),
  banner_intervalo = coalesce(banner_intervalo, 5),
  watermark_ativo = coalesce(watermark_ativo, false),
  watermark_logo = coalesce(watermark_logo, ''),
  watermark_opacidade = coalesce(watermark_opacidade, 45),
  watermark_posicao = coalesce(watermark_posicao, 'inferior-direita'),
  watermark_tamanho = coalesce(watermark_tamanho, 18),
  watermark_margem = coalesce(watermark_margem, 32)
where id = 'site';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'site-assets',
    'site-assets',
    true,
    10485760,
    array['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
  ),
  (
    'fotos-imoveis',
    'fotos-imoveis',
    true,
    10485760,
    array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read site-assets" on storage.objects;
drop policy if exists "Authenticated upload site-assets" on storage.objects;
drop policy if exists "Authenticated update site-assets" on storage.objects;
drop policy if exists "Authenticated delete site-assets" on storage.objects;
drop policy if exists "Public read fotos-imoveis" on storage.objects;
drop policy if exists "Authenticated upload fotos-imoveis" on storage.objects;
drop policy if exists "Authenticated update fotos-imoveis" on storage.objects;
drop policy if exists "Authenticated delete fotos-imoveis" on storage.objects;

create policy "Public read site-assets"
on storage.objects for select
using (bucket_id = 'site-assets');

create policy "Authenticated upload site-assets"
on storage.objects for insert
to authenticated
with check (bucket_id = 'site-assets');

create policy "Authenticated update site-assets"
on storage.objects for update
to authenticated
using (bucket_id = 'site-assets')
with check (bucket_id = 'site-assets');

create policy "Authenticated delete site-assets"
on storage.objects for delete
to authenticated
using (bucket_id = 'site-assets');

create policy "Public read fotos-imoveis"
on storage.objects for select
using (bucket_id = 'fotos-imoveis');

create policy "Authenticated upload fotos-imoveis"
on storage.objects for insert
to authenticated
with check (bucket_id = 'fotos-imoveis');

create policy "Authenticated update fotos-imoveis"
on storage.objects for update
to authenticated
using (bucket_id = 'fotos-imoveis')
with check (bucket_id = 'fotos-imoveis');

create policy "Authenticated delete fotos-imoveis"
on storage.objects for delete
to authenticated
using (bucket_id = 'fotos-imoveis');

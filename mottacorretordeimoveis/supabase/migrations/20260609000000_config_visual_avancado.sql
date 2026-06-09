-- Configurações visuais avançadas: hero, logo, fontes, cores globais

alter table public.configuracoes
  add column if not exists hero_altura           integer default 430,
  add column if not exists hero_overlay_opacidade integer default 58,
  add column if not exists logo_url              text    default '',
  add column if not exists cor_destaque          text    default '#c9a84c',
  add column if not exists cor_fundo             text    default '#0a0a0a',
  add column if not exists fonte_titulo          text    default 'Georgia, serif',
  add column if not exists fonte_corpo           text    default 'system-ui, sans-serif';

update public.configuracoes set
  hero_altura            = coalesce(hero_altura,            430),
  hero_overlay_opacidade = coalesce(hero_overlay_opacidade, 58),
  logo_url               = coalesce(logo_url,               ''),
  cor_destaque           = coalesce(cor_destaque,           '#c9a84c'),
  cor_fundo              = coalesce(cor_fundo,              '#0a0a0a'),
  fonte_titulo           = coalesce(fonte_titulo,           'Georgia, serif'),
  fonte_corpo            = coalesce(fonte_corpo,            'system-ui, sans-serif')
where id = 'site';

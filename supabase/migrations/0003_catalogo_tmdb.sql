-- ============================================================
-- 0003 — o catalogo inteiro do TMDb fica alcancavel
--
-- MODELO: `films` deixa de ser "o acervo" e passa a ser "as obras que
-- este site conhece por algum motivo". Duas populacoes convivem:
--
--   in_archive = true   curadoria sua: escola, nota de arquivo, sinopse
--                       escrita, numero de catalogo. Hoje 37 linhas.
--   in_archive = false  stub nascido do TMDb porque alguem registrou,
--                       resenhou ou abriu a ficha. Sem escola, sem nota
--                       editorial. Existe para `entries` ter a que se
--                       referir.
--
-- O catalogo completo NAO e importado. Os termos do TMDb proibem
-- replicar a base deles, e um milhao de linhas nao cabe no tier
-- gratuito. Navegacao e busca batem na API ao vivo; o banco guarda so o
-- que alguem tocou. Cache de desempenho e permitido; espelho nao.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Os campos editoriais passam a ser opcionais
--
-- Eles descrevem curadoria, e um stub do TMDb nao tem curadoria. Manter
-- NOT NULL obrigaria a inventar escola, pais e sinopse para cada filme
-- que alguem registrasse — exatamente o tipo de dado falso que este
-- projeto evita.
-- ------------------------------------------------------------
alter table public.films alter column movement_id drop not null;
alter table public.films alter column year        drop not null;
alter table public.films alter column country     drop not null;
alter table public.films alter column director    drop not null;
alter table public.films alter column synopsis    drop not null;

-- ------------------------------------------------------------
-- 2. A fronteira entre as duas populacoes
-- ------------------------------------------------------------
alter table public.films
  add column if not exists in_archive boolean not null default false;

-- Tudo que existia antes desta migracao e curadoria.
update public.films set in_archive = true where tmdb_id is null or true;

comment on column public.films.in_archive is
  'True = curadoria propria (escola, nota de arquivo). False = stub do TMDb.';

-- ------------------------------------------------------------
-- 3. Cache do TMDb
--
-- Guardado para listas e diarios nao chamarem a API a cada render. Nao e
-- fonte de verdade: tmdb_synced_at diz quando foi preenchido.
-- ------------------------------------------------------------
alter table public.films
  add column if not exists overview          text,
  add column if not exists vote_average      numeric(3,1),
  add column if not exists vote_count        integer,
  add column if not exists original_language text,
  add column if not exists release_date      date;

-- ------------------------------------------------------------
-- 4. Indices para as duas populacoes
-- ------------------------------------------------------------
create index if not exists films_in_archive_idx on public.films (in_archive);
create index if not exists films_tmdb_idx       on public.films (tmdb_id)
  where tmdb_id is not null;

-- O explorador do Arquivo filtra sempre por in_archive: os indices
-- antigos de movement/year/country ganham o flag na frente.
drop index if exists films_movement_idx;
drop index if exists films_year_idx;
drop index if exists films_country_idx;
create index films_archive_movement_idx on public.films (in_archive, movement_id);
create index films_archive_year_idx     on public.films (in_archive, year);
create index films_archive_country_idx  on public.films (in_archive, country);

-- ------------------------------------------------------------
-- 5. ensure_tmdb_film — a unica porta para criar stub
--
-- `films` continua sem policy de escrita: nem usuario autenticado altera
-- o acervo. Mas registrar um filme do TMDb exige que a linha exista.
--
-- Esta funcao e SECURITY DEFINER e resolve isso sem abrir a tabela:
--   - so cria linha nova, nunca altera existente (on conflict do nothing)
--   - forca in_archive = false: ninguem promove nada a curadoria por aqui
--   - forca o id no formato 'tmdb-<id>', entao nao da para colidir com
--     um slug editorial e sobrescrever obra do arquivo
--   - ignora movement, archive_score e synopsis: campos de curadoria
--     nao sao aceitos como parametro
-- ------------------------------------------------------------
create or replace function public.ensure_tmdb_film(
  p_tmdb_id           integer,
  p_title             text,
  p_original_title    text    default null,
  p_year              smallint default null,
  p_runtime           smallint default null,
  p_overview          text    default null,
  p_poster_path       text    default null,
  p_backdrop_path     text    default null,
  p_vote_average      numeric default null,
  p_vote_count        integer default null,
  p_original_language text    default null,
  p_release_date      date    default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id       text;
  v_existente text;
begin
  if p_tmdb_id is null or p_tmdb_id <= 0 then
    raise exception 'tmdb_id invalido';
  end if;
  if coalesce(trim(p_title), '') = '' then
    raise exception 'titulo obrigatorio';
  end if;

  -- Ja conhecemos este tmdb_id? Pode ser obra do arquivo: devolve o slug
  -- editorial dela e nao cria duplicata.
  select id into v_existente
    from public.films
   where tmdb_id = p_tmdb_id
   limit 1;

  if v_existente is not null then
    return v_existente;
  end if;

  v_id := 'tmdb-' || p_tmdb_id::text;

  insert into public.films (
    id, tmdb_id, title, original_title, year, runtime,
    overview, poster_path, backdrop_path, vote_average, vote_count,
    original_language, release_date,
    in_archive, archival, tmdb_synced_at
  )
  values (
    v_id, p_tmdb_id, substr(trim(p_title), 1, 300),
    substr(coalesce(nullif(trim(p_original_title), ''), trim(p_title)), 1, 300),
    p_year, nullif(p_runtime, 0),
    p_overview, p_poster_path, p_backdrop_path,
    p_vote_average, p_vote_count, p_original_language, p_release_date,
    false, false, now()
  )
  on conflict (id) do nothing;

  return v_id;
end;
$$;

revoke all on function public.ensure_tmdb_film(
  integer, text, text, smallint, smallint, text, text, text,
  numeric, integer, text, date
) from public;

grant execute on function public.ensure_tmdb_film(
  integer, text, text, smallint, smallint, text, text, text,
  numeric, integer, text, date
) to authenticated;

comment on function public.ensure_tmdb_film is
  'Cria o stub de um filme do TMDb para que entries possa referencia-lo. Nunca altera linha existente nem toca em campos de curadoria.';

-- ------------------------------------------------------------
-- 6. film_stats passa a contar os dois tipos
--    (a view ja seleciona de films sem filtro; recriada so para
--     documentar a intencao depois da mudanca de modelo)
-- ------------------------------------------------------------
drop view if exists public.film_stats;

create view public.film_stats
with (security_invoker = on) as
select
  f.id                                         as film_id,
  f.in_archive                                 as in_archive,
  count(e.id)                                  as log_count,
  count(e.rating)                              as rating_count,
  round(avg(e.rating), 2)                      as rating_avg,
  count(*) filter (where e.liked)               as like_count,
  count(*) filter (where e.review is not null)  as review_count
from public.films f
left join public.entries e on e.film_id = f.id
group by f.id, f.in_archive;

comment on view public.film_stats is
  'Media da comunidade, para obra do arquivo e stub do TMDb. NAO confundir com films.archive_score, que e editorial.';

grant select on public.film_stats to anon, authenticated;

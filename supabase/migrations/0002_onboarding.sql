-- ============================================================
-- 0002 — onboarding do perfil, e uma correcao no trigger de signup
-- ============================================================

-- ------------------------------------------------------------
-- 1. onboarded
--
-- O trigger de signup cria um handle provisorio ("marcus_a3f1").
-- Sem marcar quem ja escolheu o definitivo, nao da para decidir se o
-- callback do OAuth manda o usuario para /conta ou para onde ele estava.
-- Heuristica em cima do formato do handle seria frágil: coluna explicita.
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists onboarded boolean not null default false;

comment on column public.profiles.onboarded is
  'True depois que o usuario salvou /conta pela primeira vez.';

-- ------------------------------------------------------------
-- 2. CORRECAO: o signup quebrava com nome longo
--
-- profiles tem check (char_length(display_name) between 1 and 60), e o
-- trigger inseria raw_user_meta_data->>'full_name' cru. Provedor OAuth
-- com nome acima de 60 caracteres violava o check; como o trigger roda
-- dentro da transacao de insert em auth.users, a excecao abortava o
-- signup inteiro — o usuario simplesmente nao conseguia entrar.
--
-- Agora trunca. Tambem passa a tolerar perfil ja existente, para o
-- trigger nunca ser o motivo de um login falhar.
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base  text;
  nome  text;
begin
  base := regexp_replace(
            lower(coalesce(split_part(new.email, '@', 1), 'cinefilo')),
            '[^a-z0-9_]', '', 'g');
  base := substr(base, 1, 19);
  if char_length(base) = 0 then
    base := 'cinefilo';
  end if;

  nome := coalesce(
            nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
            nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
            base);
  nome := substr(nome, 1, 60);   -- <- a correcao

  insert into public.profiles (id, handle, display_name, avatar_url)
  values (
    new.id,
    base || '_' || substr(replace(new.id::text, '-', ''), 1, 4),
    nome,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
exception
  when others then
    -- Um perfil ausente e recuperavel em /conta; um signup abortado nao.
    raise warning 'handle_new_user falhou para %: %', new.id, sqlerrm;
    return new;
end;
$$;

-- ------------------------------------------------------------
-- 3. Handle so pode ser trocado para um ainda livre
--
-- O unique index ja garante isso, mas a mensagem de erro crua do
-- Postgres nao serve para a interface. A aplicacao trata o codigo 23505;
-- este indice explicito deixa o nome do constraint estavel.
-- ------------------------------------------------------------
drop index if exists profiles_handle_key;
create unique index if not exists profiles_handle_unico
  on public.profiles (handle);

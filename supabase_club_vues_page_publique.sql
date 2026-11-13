-- Visites de la page publique du club (/clubs/:id) : journal des vues, pour l'onglet
-- Financement > Audience (valeur pour les sponsors). Même modèle que stage_vues_log et
-- tournoi_vues_log : écriture uniquement par la fonction ci-dessous, lecture réservée
-- au club et à ceux qui le gèrent. Aucune identité de visiteur n'est enregistrée,
-- seulement le club visité et l'heure. Ajoute une table et une fonction, ne modifie
-- ni ne supprime rien d'existant.
create table if not exists public.club_vues_log (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.club_vues_log enable row level security;
revoke all on public.club_vues_log from anon, authenticated;
grant select on public.club_vues_log to authenticated;

drop policy if exists "club_vues_log_select" on public.club_vues_log;
create policy "club_vues_log_select" on public.club_vues_log
  for select to authenticated
  using (public.is_club_manager(club_id));

create index if not exists idx_club_vues_log_club on public.club_vues_log(club_id, created_at);

-- Une vue n'est comptée que pour un vrai profil club, et jamais quand le club regarde
-- sa propre page.
create or replace function public.loguer_vue_club(p_club_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() = p_club_id then return; end if;
  if exists (select 1 from profiles where id = p_club_id and plan = 'club') then
    insert into club_vues_log (club_id) values (p_club_id);
  end if;
end;
$$;
revoke execute on function public.loguer_vue_club(uuid) from public, anon;
grant execute on function public.loguer_vue_club(uuid) to authenticated;

-- Les journaux de vues et de clics des stages et des tournois ont été créés avec
-- « revoke all » sans jamais redonner le droit de lecture : la règle (RLS) qui limite
-- chaque ligne au club gestionnaire existe, mais sans ce droit la lecture est refusée et
-- les compteurs restent à zéro dans l'app. On le redonne ici ; la règle RLS de chaque
-- table continue de n'ouvrir les lignes qu'au club concerné. Ignore les tables absentes.
do $$
declare t text;
begin
  foreach t in array array['stage_vues_log', 'stage_sponsor_clics_log', 'tournoi_vues_log', 'tournoi_sponsor_clics_log'] loop
    if to_regclass('public.' || t) is not null then
      execute format('grant select on public.%I to authenticated', t);
    end if;
  end loop;
end $$;

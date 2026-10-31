-- Bloc 8 (chantier saisons) : verrouillage de club_categories.
-- Un coach ne peut plus s'attribuer seul une équipe : il passe par une demande
-- au club (saison_demandes, blocs 5 à 7). Restent possibles :
--   - le coach qui se retire de sa propre équipe (educateur_id → vide, clôture
--     de saison et bouton « Supprimer » de Mon équipe) ;
--   - toutes les écritures du compte principal du club ;
--   - les écritures d'un membre du staff, sauf s'attribuer une équipe à
--     lui-même (même règle que « personne ne valide sa propre demande ») ;
--   - la validation d'une demande (saison_traiter_demande, fonction du club) ;
--   - le SQL Editor et les scripts serveur (aucun utilisateur connecté).
--
-- Deux protections :
--   1. un déclencheur qui refuse toute attribution d'équipe hors des cas
--      ci-dessus, quelles que soient les autres règles d'accès de la table ;
--   2. suppression des deux règles qui laissaient le coach se déclarer
--      (educateur_declare_sa_categorie, educateur_reclame_categorie_vacante).
-- Aucune autre règle de club_categories n'est modifiée. Relançable sans erreur.

begin;

-- ── 1. Qui peut attribuer une équipe à un coach ─────────────────────────────
create or replace function public.saison_peut_attribuer_equipe(p_club_id uuid, p_educateur_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    p_educateur_id is null
    or auth.uid() = p_club_id
    or (
      p_educateur_id <> auth.uid()
      and exists (select 1 from staff_club sc where sc.club_id = p_club_id and sc.user_id = auth.uid())
    )
  )
$$;

revoke all on function public.saison_peut_attribuer_equipe(uuid, uuid) from public, anon;
grant execute on function public.saison_peut_attribuer_equipe(uuid, uuid) to authenticated, service_role;

-- ── 2. Déclencheur sur club_categories ──────────────────────────────────────
create or replace function public.saison_garde_attribution_equipe()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Retrait d'un coach ou équipe créée sans coach : toujours permis.
  if new.educateur_id is null then
    return new;
  end if;
  -- Modification qui ne touche ni au coach ni au club (nom, couleur…).
  if tg_op = 'UPDATE'
     and new.educateur_id is not distinct from old.educateur_id
     and new.club_id is not distinct from old.club_id then
    return new;
  end if;
  -- Aucun utilisateur connecté : SQL Editor ou script serveur. Un visiteur
  -- anonyme ou un jeton sans identité reste refusé.
  if auth.uid() is null then
    if current_user in ('anon', 'authenticated') then
      raise exception 'Connexion requise' using errcode = '42501';
    end if;
    return new;
  end if;
  if public.saison_peut_attribuer_equipe(new.club_id, new.educateur_id) then
    return new;
  end if;
  raise exception 'Seul le club peut attribuer une équipe à un coach. Envoie une demande au club depuis Mon équipe.'
    using errcode = '42501';
end
$$;

drop trigger if exists saison_garde_attribution_equipe on club_categories;
create trigger saison_garde_attribution_equipe
  before insert or update of educateur_id, club_id on club_categories
  for each row execute function public.saison_garde_attribution_equipe();

-- ── 3. Fin de l'auto-déclaration du coach ───────────────────────────────────
drop policy if exists "educateur_declare_sa_categorie" on club_categories;
drop policy if exists "educateur_reclame_categorie_vacante" on club_categories;
-- "educateur_quitte_sa_categorie" est conservée (retrait de soi-même).

commit;

-- Plan de retour arrière v3 pour supabase_fix_profiles_rls_stripe.sql +
-- supabase_fix_profiles_trigger_signup.sql + supabase_fix_profiles_public_view.sql.
-- Restaure exactement l'état constaté avant correctif (RLS désactivée,
-- privilèges complets anon/authenticated, trigger d'origine, pas de vue
-- publique) — à n'utiliser qu'en cas de régression bloquante en production,
-- le temps de diagnostiquer.
--
-- NE PAS EXÉCUTER SANS VALIDATION EXPLICITE.

begin;

-- 1. Restaure les privilèges table complets (état d'origine), SELECT inclus
--    (retiré à anon par le correctif).
grant select, insert, update, delete, truncate on public.profiles to anon;
grant insert, update, delete, truncate on public.profiles to authenticated;

-- 2. Les GRANT colonne explicites deviennent redondants une fois le GRANT
--    table restauré (le table-level couvre à nouveau tout), pas besoin de
--    les révoquer individuellement.

-- 3. Restaure la policy UPDATE d'origine (sans WITH CHECK, sans délégation)
drop policy if exists "profiles_update_own_or_delegated" on public.profiles;
create policy "joueur_update_own_profile" on public.profiles
  for update
  using (auth.uid() = id);

-- 3bis. Restaure les 2 policies SELECT d'origine, remplacées par
--       profiles_select_own_or_delegated.
drop policy if exists "profiles_select_own_or_delegated" on public.profiles;
create policy "profiles_lecture_educateur" on public.profiles for select using (true);
create policy "recherche club par code" on public.profiles for select using (true);

-- 4. Supprime la policy INSERT ajoutée par le correctif (n'existait pas avant)
drop policy if exists "profiles_insert_own" on public.profiles;

-- 5. Désactive RLS (état d'origine)
alter table public.profiles disable row level security;

-- 5bis. Supprime la vue publique et les index de support ajoutés par
--       supabase_fix_profiles_public_view.sql (n'existaient pas avant,
--       aucune donnée propre à la vue — c'est une projection, pas une
--       table).
drop function if exists public.get_coach_contacts();
drop view if exists public.profiles_public;
drop index if exists public.idx_dirigeant_acces_educateur_dirigeant;
drop index if exists public.idx_parents_acces_joueur_parent;

-- 6. Restaure la définition d'origine de handle_new_user() (si
--    supabase_fix_profiles_trigger_signup.sql a été exécuté) — abonnement_actif
--    toujours false à la création, pas de parrain_id.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.profiles (id, email, prenom, nom, plan, club, analyses_restantes, abonnement_actif)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'prenom',
    new.raw_user_meta_data->>'nom',
    coalesce(new.raw_user_meta_data->>'plan', 'joueur_starter'),
    new.raw_user_meta_data->>'club',
    0,
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;

-- Restaure increment_analyses à sa définition d'origine (SECURITY INVOKER,
-- sans vérification d'autorisation interne, EXECUTE ouvert à PUBLIC comme à
-- la création par défaut).
create or replace function public.increment_analyses(profile_id uuid, delta integer)
returns void
language sql
as $function$
  update profiles set analyses_restantes = coalesce(analyses_restantes, 0) + delta where id = profile_id;
$function$;
grant execute on function public.increment_analyses(uuid, integer) to public;

-- Supprime la table admins_coach ajoutée par le correctif (n'existait pas
-- avant). Ne contient que des user_id, aucune donnée métier — suppression
-- sans perte d'information applicative.
drop table if exists public.admins_coach;

-- Retire la colonne analyses_creditees ajoutée sur parrainage_recompenses.
-- Elle ne contient qu'un indicateur technique (true/false), aucune donnée
-- métier perdue — parrainage_recompenses elle-même (parrain_id, palier,
-- accorde_par) reste intacte.
alter table public.parrainage_recompenses drop column if exists analyses_creditees;

commit;

-- Rappel : si les changements JS décrits dans
-- supabase_fix_profiles_trigger_signup.sql ont été appliqués (retrait de
-- champs des upsert() d'inscription), ils doivent aussi être revertis
-- séparément via git (ce rollback SQL ne touche pas au code applicatif).

-- Sécurisation module Sponsors — PHASE 4b : retrait de l'accès à
-- get_sponsor_by_token (toutes colonnes) au profit de sponsor_portail.
--
-- PRÉREQUIS STRICTS :
--   1. définition réelle de get_sponsor_by_token relue (V5) ;
--   2. supabase_sponsors_phase4_portail.sql exécuté ;
--   3. nouveau src/pages/PartenairePublic.jsx (RPC sponsor_portail) DÉPLOYÉ
--      et portail vérifié avec un lien réel (U7) — sinon le portail casse ;
--   4. aucune autre utilisation de get_sponsor_by_token (dépôt : seul
--      PartenairePublic.jsx l'appelait ; vérifier aussi qu'aucun outil
--      externe ne l'appelle).
--
-- Effet : REVOKE EXECUTE uniquement. La fonction n'est ni supprimée ni
-- modifiée — retour arrière = GRANT EXECUTE (cf. plan de déploiement).
--
-- NE PAS EXÉCUTER SANS VALIDATION EXPLICITE.

begin;

do $$
begin
  if to_regprocedure('public.sponsor_portail(uuid)') is null
     or coalesce(obj_description(to_regprocedure('public.sponsor_portail(uuid)'), 'pg_proc'), '')
          not like 'digital-football:sponsors-phase4%'
     or not has_function_privilege('anon', 'public.sponsor_portail(uuid)', 'execute') then
    raise exception 'ARRÊT : sponsor_portail (phase 4) absente ou non exécutable par anon — le portail casserait. Rien n''a été modifié.';
  end if;
  if to_regprocedure('public.get_sponsor_by_token(uuid)') is null then
    raise exception 'ARRÊT : get_sponsor_by_token(uuid) introuvable — signature différente, à examiner. Rien n''a été modifié.';
  end if;
end;
$$;

revoke execute on function public.get_sponsor_by_token(uuid) from anon, authenticated, public;

do $$
begin
  if has_function_privilege('anon', 'public.get_sponsor_by_token(uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.get_sponsor_by_token(uuid)', 'execute') then
    raise exception 'ÉCHEC phase 4b : get_sponsor_by_token reste exécutable. Transaction annulée.';
  end if;
  raise notice 'Phase 4b : get_sponsor_by_token n''est plus exécutable par anon/authenticated';
end;
$$;

commit;

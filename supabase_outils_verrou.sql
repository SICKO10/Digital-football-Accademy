-- Chantier outils à la carte, bloc 15 (PLAN-outils-a-la-carte.md) : verrou
-- côté base. Un outil non pris reste fermé même par un appel direct à la base.
--
-- Additif uniquement : une fonction et des règles « restrictives ». Une règle
-- restrictive s'ajoute aux règles existantes (elle ne peut que retirer un
-- accès, jamais en donner) et aucune règle existante n'est réécrite.
--
-- Qui est concerné : seulement l'utilisateur connecté dont le compte suit le
-- nouveau modèle (profiles.modele_outils vrai), éducateur ou club, et qui n'a
-- aucun des outils indiqués pour la table. Tous les autres (joueurs, parents,
-- recruteurs, sponsors, staff, visiteurs non connectés, comptes sans drapeau,
-- fonctions serveur avec la clé service) ne voient aucune différence.
--
-- Deux niveaux :
--   - « tout » : lecture et écriture fermées (tables propres à l'outil) ;
--   - « écriture » : lecture laissée ouverte (tables aussi lues par des pages
--     publiques ou par d'autres clubs : stages, tournois, sponsors), seules
--     la création, la modification et la suppression sont fermées.
--
-- Tables partagées avec la partie gratuite laissées ouvertes exprès :
-- rapports_analyse (rapport de match), blessures (bilans de saison),
-- notes_educateur (clôtures de saison), projets_club (onglet partagé avec
-- CFF4), entrainements, matchs. L'analyse vidéo est fermée côté serveur
-- (api/ia.js), pas par table.
--
-- Une table absente de la base est ignorée (message dans l'onglet Résultats).
-- Une table sans RLS activé n'est pas protégée par ce verrou : la
-- vérification la signale, on ne l'active pas ici (risque de tout fermer).
--
-- Exécution : lancer d'abord ~/Sauvegardes-DigitalFootball/sauvegarder.sh, puis
-- ce fichier en entier, puis supabase_outils_verrou_verification.sql.

begin;

-- ── 1. Fonction du verrou ───────────────────────────────────────────────────

-- Vrai si l'utilisateur connecté doit être bloqué : compte au nouveau modèle,
-- de rôle concerné, et sans aucun des outils listés pour son rôle (un tableau
-- vide = rôle non concerné). Faux sans utilisateur connecté.
create or replace function public.outil_ferme(p_educateur text[], p_club text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select p.modele_outils is true and (
      (p.plan = 'educateur' and cardinality(p_educateur) > 0
        and not exists (select 1 from unnest(p_educateur) o where public.a_outil(p.id, o)))
      or (p.plan = 'club' and cardinality(p_club) > 0
        and not exists (select 1 from unnest(p_club) o where public.a_outil(p.id, o)))
    )
    from public.profiles p
    where p.id = auth.uid()
  ), false)
$$;

revoke all on function public.outil_ferme(text[], text[]) from public, anon;
grant execute on function public.outil_ferme(text[], text[]) to authenticated, service_role;

-- ── 2. Règles restrictives ──────────────────────────────────────────────────

do $$
declare
  v record;
  cond text;
begin
  for v in
    select * from (values
      -- table, outils éducateur, outils club, niveau
      -- Séances et bibliothèque
      ('seances_uploadees',      array['seances'],                          array[]::text[],                  'tout'),
      ('bibliotheque_exercices', array['seances', 'bibliotheque'],          array[]::text[],                  'tout'),
      -- Tacticboard
      ('tactipads',              array['tactique', 'bibliotheque'],         array[]::text[],                  'tout'),
      ('schemas_dossiers',       array['tactique', 'bibliotheque'],         array[]::text[],                  'tout'),
      -- Préparation physique
      ('programmes_prep',        array['prep_physique'],                    array[]::text[],                  'tout'),
      ('seances_prep',           array['prep_physique'],                    array[]::text[],                  'tout'),
      ('soumissions_prep',       array['prep_physique'],                    array[]::text[],                  'tout'),
      ('tests_physiques',        array['prep_physique', 'suivi_joueurs'],   array[]::text[],                  'tout'),
      -- Suivi des joueurs
      ('evaluations_joueur',     array['suivi_joueurs'],                    array[]::text[],                  'tout'),
      ('suivi_medical',          array['suivi_joueurs'],                    array[]::text[],                  'tout'),
      ('reeducation_etapes',     array['suivi_joueurs'],                    array[]::text[],                  'tout'),
      -- Projet Club CFF4
      ('cff4_actions',           array['cff4'],                             array['cff4'],                    'tout'),
      ('cff4_diagnostic',        array['cff4'],                             array['cff4'],                    'tout'),
      ('cff4_identite',          array['cff4'],                             array['cff4'],                    'tout'),
      ('cff4_objectifs',         array['cff4'],                             array['cff4'],                    'tout'),
      ('cff4_suivi',             array['cff4'],                             array['cff4'],                    'tout'),
      -- Projet sportif
      ('principes_jeu',          array['projet_sportif'],                   array['projet_sportif'],          'tout'),
      ('principes_photos',       array['projet_sportif'],                   array['projet_sportif'],          'tout'),
      ('regles_jeu',             array['projet_sportif'],                   array['projet_sportif'],          'tout'),
      ('plan_annuel',            array['projet_sportif'],                   array['projet_sportif'],          'tout'),
      ('plan_competitions',      array['projet_sportif'],                   array['projet_sportif'],          'tout'),
      ('plan_phases',            array['projet_sportif'],                   array['projet_sportif'],          'tout'),
      ('plan_semaines',          array['projet_sportif'],                   array['projet_sportif'],          'tout'),
      -- Stages : coulisses fermées, fiches publiques lisibles
      ('stages_taches',          array['stages'],                           array['stages'],                  'tout'),
      ('stages_materiel',        array['stages'],                           array['stages'],                  'tout'),
      ('stages',                 array['stages'],                           array['stages'],                  'ecriture'),
      ('stages_encadrants',      array['stages'],                           array['stages'],                  'ecriture'),
      ('stages_formules_repas',  array['stages'],                           array['stages'],                  'ecriture'),
      ('stages_offres',          array['stages'],                           array['stages'],                  'ecriture'),
      ('stages_planning',        array['stages'],                           array['stages'],                  'ecriture'),
      ('stages_posts',           array['stages'],                           array['stages'],                  'ecriture'),
      ('stages_sponsors',        array['stages'],                           array['stages'],                  'ecriture'),
      -- Finances et partenaires (budget_club sert aussi au budget des tournois)
      ('budget_club',            array[]::text[],                           array['finances', 'competition'], 'tout'),
      ('budgets',                array[]::text[],                           array['finances'],                'tout'),
      ('budget_lignes',          array[]::text[],                           array['finances'],                'tout'),
      ('budget_modeles',         array[]::text[],                           array['finances'],                'tout'),
      ('sponsors',               array[]::text[],                           array['finances'],                'ecriture'),
      -- Vie du club (l'onglet Événements sert aussi au CFF4)
      ('evenements_club',        array[]::text[],                           array['vie_club', 'cff4'],        'tout'),
      ('taches_club',            array[]::text[],                           array['vie_club'],                'tout'),
      -- Compétition : les autres clubs lisent et s'inscrivent, seul
      -- l'organisateur sans l'outil est bloqué
      ('tournois_organises',     array[]::text[],                           array['competition'],             'ecriture'),
      ('tournois_matchs_organises', array[]::text[],                        array['competition'],             'ecriture')
    ) as t(nom, educ, club, niveau)
  loop
    if to_regclass('public.' || v.nom) is null then
      raise notice 'Table absente, ignorée : %', v.nom;
      continue;
    end if;

    cond := format('not (select public.outil_ferme(%L::text[], %L::text[]))', v.educ, v.club);

    execute format('drop policy if exists verrou_outils on public.%I', v.nom);
    execute format('drop policy if exists verrou_outils_ajout on public.%I', v.nom);
    execute format('drop policy if exists verrou_outils_modif on public.%I', v.nom);
    execute format('drop policy if exists verrou_outils_suppr on public.%I', v.nom);

    if v.niveau = 'tout' then
      execute format('create policy verrou_outils on public.%I as restrictive for all to authenticated using (%s) with check (%s)', v.nom, cond, cond);
    else
      execute format('create policy verrou_outils_ajout on public.%I as restrictive for insert to authenticated with check (%s)', v.nom, cond);
      execute format('create policy verrou_outils_modif on public.%I as restrictive for update to authenticated using (%s) with check (%s)', v.nom, cond, cond);
      execute format('create policy verrou_outils_suppr on public.%I as restrictive for delete to authenticated using (%s)', v.nom, cond);
    end if;
  end loop;
end $$;

commit;

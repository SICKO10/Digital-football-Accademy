-- Sécurisation module Sponsors — PHASE 1 (additive).
--
-- Contexte (vérifié dans Supabase par l'utilisateur, 2026-10-15) :
--   - public.sponsors : RLS activée, 3 policies :
--       "Club manages sponsors"   FOR ALL (club propriétaire ou membre du staff)
--       "sponsors_all"            PERMISSIVE FOR ALL TO public USING (true)
--       "sponsors_bandeau_select" SELECT authenticated si afficher_bandeau
--   - anon ET authenticated : SELECT/INSERT/UPDATE/DELETE sur sponsors.
--   - sponsors.saison : text.
--   Les policies permissives se combinant en OU, "sponsors_all" rend
--   aujourd'hui toute la table lisible ET modifiable par n'importe qui, y
--   compris sans compte (clé anon) : contacts, montants, paiements, notes,
--   documents, acces_token du portail partenaire.
--
-- Ce fichier NE FERME RIEN : il ajoute uniquement des fonctions. Tant que
-- "sponsors_all" existe, aucun accès ne change. La fermeture est dans
-- supabase_sponsors_phase2_fermeture.sql, à exécuter APRÈS ce fichier ET
-- après le déploiement du nouveau SponsorsBar.jsx (qui appelle la RPC
-- sponsors_bandeau créée ici).
--
-- Révision 2 (2026-10-15, après relecture) :
--   - rôle staff NULL n'est PLUS traité comme 'president' (refus par défaut) ;
--   - search_path vide ('') : tout objet est qualifié explicitement ;
--   - contrôle préalable du schéma réel (tables, colonnes, types) : arrêt
--     avec un message clair AVANT toute création si une hypothèse est fausse ;
--   - garde-fou anti-écrasement : refus si une fonction de même signature
--     existe déjà sans le marqueur de ce fichier ;
--   - check_function_bodies forcé : corps validés à la création, jamais au
--     premier appel ;
--   - compte club : exige profiles.plan = 'club' (même règle que
--     api/_droits.js peutEditerPourClub).
--
-- Idempotent : rejouable (le marqueur posé par COMMENT ON FUNCTION autorise
-- le remplacement des seules fonctions créées par ce fichier).
--
-- NE PAS EXÉCUTER SANS VALIDATION EXPLICITE.

begin;

-- Les corps des fonctions SQL sont analysés à la création (tables, colonnes,
-- types, opérateurs) : une incohérence avec le schéma réel fait échouer la
-- transaction entière au lieu de créer une fonction cassée.
set local check_function_bodies = on;

-- ─────────────────────────────────────────────────────────────────────────
-- 0. Contrôles préalables (lecture seule — exception => rollback complet,
--    rien n'est créé).
-- ─────────────────────────────────────────────────────────────────────────
do $$
declare
  v_manquants text[] := array[]::text[];
  v_attendu record;
  v_type text;
  v_fonction text;
  v_commentaire text;
begin
  -- 0a. Colonnes requises et type attendu ('*' = type libre, converti en
  --     text dans la RPC ; 'int' = entier quelconque).
  for v_attendu in
    select * from (values
      ('sponsors', 'id', 'uuid'),
      ('sponsors', 'club_id', 'uuid'),
      ('sponsors', 'saison', 'text'),
      ('sponsors', 'afficher_bandeau', 'bool'),
      ('sponsors', 'ordre_bandeau', 'int'),
      ('sponsors', 'entreprise', '*'),
      ('sponsors', 'logo_url', '*'),
      ('sponsors', 'banniere_url', '*'),
      ('sponsors', 'lien_url', '*'),
      ('profiles', 'id', 'uuid'),
      ('profiles', 'plan', '*'),
      ('staff_club', 'club_id', 'uuid'),
      ('staff_club', 'user_id', 'uuid'),
      ('staff_club', 'role', 'text'),
      ('role_permissions', 'club_id', 'uuid'),
      ('role_permissions', 'role', 'text'),
      ('role_permissions', 'section', 'text'),
      ('role_permissions', 'can_view', 'bool'),
      ('role_permissions', 'can_edit', 'bool'),
      ('club_educateurs', 'club_id', 'uuid'),
      ('club_educateurs', 'educateur_id', 'uuid'),
      ('club_educateurs', 'statut', 'text'),
      ('dirigeant_acces', 'dirigeant_id', 'uuid'),
      ('dirigeant_acces', 'educateur_id', 'uuid'),
      ('dirigeant_acces', 'statut', 'text'),
      ('affiliations', 'joueur_id', 'uuid'),
      ('affiliations', 'educateur_id', 'uuid'),
      ('affiliations', 'statut', 'text'),
      ('parents_acces', 'parent_id', 'uuid'),
      ('parents_acces', 'joueur_id', 'uuid'),
      ('parents_acces', 'statut', 'text'),
      ('sponsor_clics_log', 'sponsor_id', 'uuid'),
      ('sponsor_clics_log', 'club_id', 'uuid')
    ) as t(table_name, column_name, type_attendu)
  loop
    select c.udt_name into v_type
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = v_attendu.table_name
      and c.column_name = v_attendu.column_name;

    if v_type is null then
      v_manquants := array_append(v_manquants, format('%s.%s absente', v_attendu.table_name, v_attendu.column_name));
    elsif v_attendu.type_attendu = 'text' and v_type not in ('text', 'varchar', 'bpchar') then
      v_manquants := array_append(v_manquants, format('%s.%s de type %s (texte attendu)', v_attendu.table_name, v_attendu.column_name, v_type));
    elsif v_attendu.type_attendu = 'int' and v_type not in ('int2', 'int4', 'int8') then
      v_manquants := array_append(v_manquants, format('%s.%s de type %s (entier attendu)', v_attendu.table_name, v_attendu.column_name, v_type));
    elsif v_attendu.type_attendu not in ('text', 'int', '*') and v_type <> v_attendu.type_attendu then
      v_manquants := array_append(v_manquants, format('%s.%s de type %s (%s attendu)', v_attendu.table_name, v_attendu.column_name, v_type, v_attendu.type_attendu));
    end if;
  end loop;

  if array_length(v_manquants, 1) > 0 then
    raise exception 'ARRÊT phase 1 — schéma différent des hypothèses : %. Rien n''a été créé.', array_to_string(v_manquants, ' ; ');
  end if;

  -- 0b. Anti-écrasement : une fonction de même signature qui n'a pas été
  --     créée par ce fichier (marqueur absent) ne doit pas être remplacée.
  foreach v_fonction in array array[
    'public.sponsors_peut_acceder(uuid, boolean)',
    'public.sponsors_est_membre_club(uuid)',
    'public.sponsors_bandeau(uuid, text)',
    'public.sponsors_clic_autorise(uuid, uuid)'
  ] loop
    if to_regprocedure(v_fonction) is not null then
      v_commentaire := obj_description(to_regprocedure(v_fonction), 'pg_proc');
      if v_commentaire is null or v_commentaire not like 'digital-football:sponsors-phase1%' then
        raise exception 'ARRÊT phase 1 — % existe déjà et n''a pas été créée par ce fichier. Rien n''a été modifié.', v_fonction;
      end if;
    end if;
  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Droit d'accès à la GESTION des sponsors d'un club (lecture ou édition).
--
-- Reproduit canViewSection('sponsors') / canEditSection('sponsors') de
-- DashboardClub.jsx et peutEditerSection() de src/lib/permissionsClub.js :
--   - le compte club lui-même, à condition que son profil soit de plan
--     'club' (même règle que api/_droits.js peutEditerPourClub) ;
--   - un membre staff_club DE CE club :
--       · rôle 'president' => toujours ;
--       · sinon, si une ligne role_permissions (ce club, ce rôle, 'sponsors')
--         existe, elle fait foi : lecture = can_view, édition = can_view ET
--         can_edit ;
--       · sinon, matrice par défaut PERMISSION_DEFAULTS.sponsors =
--         ['president', 'marketing', 'secretaire'].
--
-- ÉCART VOLONTAIRE avec DashboardClub.jsx et api/_droits.js : un rôle NULL
-- n'est PAS traité comme 'president' ici, mais refusé. La contrainte
-- staff_club_role_check (CHECK role IN (...)) laisse passer NULL : quiconque
-- peut écrire staff_club.role (staff délégué sur la section 'staff', policy
-- staff_delegue_gestion_staff ; insertion d'un membre) obtiendrait sinon
-- l'équivalent président en écrivant NULL, contournant la règle « seul le
-- président attribue 'president' ».
--
-- Pas encore utilisée par une policy de sponsors (la policy « Club manages
-- sponsors » reste inchangée) : aucun effet immédiat, y compris pour
-- d'éventuels membres staff à rôle NULL existants.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.sponsors_peut_acceder(p_club_id uuid, p_edition boolean)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and p_club_id is not null
    and (
      (
        p_club_id = auth.uid()
        and exists (
          select 1 from public.profiles pr
          where pr.id = p_club_id and pr.plan = 'club'
        )
      )
      or exists (
        select 1
        from public.staff_club sc
        where sc.club_id = p_club_id
          and sc.user_id = auth.uid()
          and sc.role is not null
          and (
            sc.role = 'president'
            or exists (
              select 1
              from public.role_permissions rp
              where rp.club_id = p_club_id
                and rp.role = sc.role
                and rp.section = 'sponsors'
                and case
                      when p_edition then coalesce(rp.can_view, false) and coalesce(rp.can_edit, false)
                      else coalesce(rp.can_view, false)
                    end
            )
            or (
              sc.role in ('marketing', 'secretaire')
              and not exists (
                select 1
                from public.role_permissions rp2
                where rp2.club_id = p_club_id
                  and rp2.role = sc.role
                  and rp2.section = 'sponsors'
              )
            )
          )
      )
    )
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Appartenance au club (droit de VOIR le bandeau partenaires).
--
-- Reproduit les chemins par lesquels les dashboards affichent SponsorsBar :
--   - DashboardClub : le club lui-même, et tout membre staff_club ;
--   - DashboardEducateur : éducateur affilié (club_educateurs accepté) ;
--   - DashboardDirigeant (rend DashboardEducateur pour l'éducateur délégant) :
--     dirigeant_acces accepté vers un éducateur accepté dans le club (même
--     règle que est_dirigeant_accepte_de_club, supabase_dirigeant_rls_fix.sql) ;
--   - DashboardJoueur : joueur affilié accepté à un éducateur accepté dans le
--     club (même résolution que chargerInventaireJoueur, DashboardJoueur.jsx) ;
--   - DashboardParent (rend DashboardJoueur pour l'enfant) : parent accepté
--     d'un tel joueur.
--
-- Différence volontaire avec l'existant : DashboardEducateur affiche
-- aujourd'hui le bandeau du club de la DERNIÈRE ligne club_educateurs, même
-- 'en_attente'. Ici, seule une affiliation acceptée compte.
--
-- Limite connue : cette fonction fait confiance aux tables d'affiliation.
-- Si leurs policies d'écriture permettent de créer une ligne 'accepte' sans
-- validation (cf. plan de déploiement, section « Affiliations »), l'auteur
-- obtient l'accès au bandeau (6 champs publicitaires) et peut enregistrer
-- des clics — jamais aux données confidentielles des sponsors.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.sponsors_est_membre_club(p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and p_club_id is not null
    and (
      p_club_id = auth.uid()
      or exists (
        select 1 from public.staff_club sc
        where sc.club_id = p_club_id and sc.user_id = auth.uid()
      )
      or exists (
        select 1 from public.club_educateurs ce
        where ce.club_id = p_club_id and ce.educateur_id = auth.uid() and ce.statut = 'accepte'
      )
      or exists (
        select 1
        from public.dirigeant_acces da
        join public.club_educateurs ce on ce.educateur_id = da.educateur_id
        where ce.club_id = p_club_id
          and da.dirigeant_id = auth.uid()
          and da.statut = 'accepte'
          and ce.statut = 'accepte'
      )
      or exists (
        select 1
        from public.affiliations a
        join public.club_educateurs ce on ce.educateur_id = a.educateur_id
        where ce.club_id = p_club_id
          and a.joueur_id = auth.uid()
          and a.statut = 'accepte'
          and ce.statut = 'accepte'
      )
      or exists (
        select 1
        from public.parents_acces pa
        join public.affiliations a on a.joueur_id = pa.joueur_id
        join public.club_educateurs ce on ce.educateur_id = a.educateur_id
        where ce.club_id = p_club_id
          and pa.parent_id = auth.uid()
          and pa.statut = 'accepte'
          and a.statut = 'accepte'
          and ce.statut = 'accepte'
      )
    )
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. RPC du bandeau : UNIQUEMENT les 6 champs publics.
--
-- Remplace la lecture directe de SponsorsBar.jsx (select id, entreprise,
-- logo_url, banniere_url, lien_url, ordre_bandeau). Même filtre qu'avant :
-- club, saison (calculée côté JS par saisonActuelle(), passée en paramètre
-- pour ne pas dupliquer la règle de saison en SQL), afficher_bandeau = true,
-- tri par ordre_bandeau.
-- Non-membre => ensemble vide (pas d'erreur) : SponsorsBar n'affiche alors
-- rien, exactement comme quand un club n'a aucun sponsor en bandeau.
-- Accès interclubs impossible : l'appartenance est vérifiée pour p_club_id
-- ET les lignes sont filtrées sur ce même p_club_id.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.sponsors_bandeau(p_club_id uuid, p_saison text)
returns table (
  id uuid,
  entreprise text,
  logo_url text,
  banniere_url text,
  lien_url text,
  ordre_bandeau integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.id,
    s.entreprise::text,
    s.logo_url::text,
    s.banniere_url::text,
    s.lien_url::text,
    s.ordre_bandeau::integer
  from public.sponsors s
  where public.sponsors_est_membre_club(p_club_id)
    and s.club_id = p_club_id
    and s.saison = p_saison
    and s.afficher_bandeau = true
  order by s.ordre_bandeau asc
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Contrôle d'un clic de bandeau (utilisé par la policy INSERT de
--    sponsor_clics_log en PHASE 2).
--
-- SECURITY DEFINER indispensable : après la phase 2, un joueur ne peut plus
-- lire la table sponsors directement — une sous-requête sur sponsors écrite
-- dans la policy elle-même s'évaluerait avec SES droits et échouerait.
-- Un clic n'est valide que si :
--   - l'appelant est membre du club (même règle que l'affichage du bandeau) ;
--   - le sponsor appartient à CE club et est affiché en bandeau.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.sponsors_clic_autorise(p_sponsor_id uuid, p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.sponsors_est_membre_club(p_club_id)
    and exists (
      select 1 from public.sponsors s
      where s.id = p_sponsor_id
        and s.club_id = p_club_id
        and s.afficher_bandeau = true
    )
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Marqueur (autorise un ré-exécution de ce fichier, cf. contrôle 0b).
-- ─────────────────────────────────────────────────────────────────────────
comment on function public.sponsors_peut_acceder(uuid, boolean) is
  'digital-football:sponsors-phase1 — droit de gestion des sponsors (club plan club, staff selon role_permissions/défauts ; rôle NULL refusé)';
comment on function public.sponsors_est_membre_club(uuid) is
  'digital-football:sponsors-phase1 — appartenance au club (club, staff, éducateur, dirigeant, joueur, parent acceptés)';
comment on function public.sponsors_bandeau(uuid, text) is
  'digital-football:sponsors-phase1 — bandeau partenaires : 6 champs publics, membres du club uniquement';
comment on function public.sponsors_clic_autorise(uuid, uuid) is
  'digital-football:sponsors-phase1 — validité d''un clic de bandeau (membre + sponsor du club affiché)';

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Droits d'exécution.
-- Supabase accorde par défaut EXECUTE sur les nouvelles fonctions à anon et
-- authenticated (privilèges par défaut du schéma public), pas seulement via
-- PUBLIC : les deux REVOKE sont nécessaires. authenticated doit conserver
-- EXECUTE : une policy appelle ses fonctions avec les droits de l'appelant.
-- ─────────────────────────────────────────────────────────────────────────
revoke all on function public.sponsors_peut_acceder(uuid, boolean) from public, anon;
revoke all on function public.sponsors_est_membre_club(uuid) from public, anon;
revoke all on function public.sponsors_bandeau(uuid, text) from public, anon;
revoke all on function public.sponsors_clic_autorise(uuid, uuid) from public, anon;

grant execute on function public.sponsors_peut_acceder(uuid, boolean) to authenticated;
grant execute on function public.sponsors_est_membre_club(uuid) to authenticated;
grant execute on function public.sponsors_bandeau(uuid, text) to authenticated;
grant execute on function public.sponsors_clic_autorise(uuid, uuid) to authenticated;

commit;

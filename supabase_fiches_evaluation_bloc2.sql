-- ============================================================================
-- Fiches d'évaluation, bloc 2 (PLAN-fiches-evaluation.md) : 2026-11-19
-- ----------------------------------------------------------------------------
-- Les évaluations elles-mêmes : évaluation d'un joueur (ou séance de tests),
-- résultats critère par critère (éducateur et auto-évaluation du joueur),
-- notes de suivi, journal des accès. S'appuie sur le bloc 1 (déjà en prod).
--
-- Seule retouche de l'existant : la règle club_lit_evaluations des ANCIENNES
-- fiches (evaluations_joueur) est limitée aux rôles sportifs, dans leur
-- périmètre de catégories (décision 5 du bloc 0). Tout le reste est nouveau.
--
-- Qui fait quoi (matrice validée au bloc 0) :
--   Éducateur responsable : lit et écrit ses évaluations, tests et notes,
--     tant qu'il est accepté dans le club (indépendant : toujours).
--   Nouvel éducateur du joueur dans le même club (changement d'équipe ou de
--     catégorie) : lit les évaluations et tests TERMINÉS de l'ancien, et ses
--     notes « staff » marquées transmissibles, selon les réglages du club.
--     Jamais les notes privées. Jamais les brouillons. Ne modifie rien.
--   Compte du club, président : lisent tout le club (sauf notes privées).
--   Staff, deux droits réglables dans Mon club > droits :
--     'evaluations'       (évaluations + notes staff), par défaut lecture
--                         pour directeur sportif et responsables formation,
--                         école de foot, préformation ; écriture : personne.
--     'evaluations_tests' (séances de tests), par défaut lecture pour les
--                         mêmes + préparateur physique ; écriture :
--                         préparateur physique.
--     Toujours dans le périmètre de catégories du rôle (role_categories_access,
--     même logique que peut_voir_categorie).
--   Dirigeant délégué : comme aujourd'hui, selon sa permission « notes ».
--   Joueur : lit une évaluation TERMINÉE et « Visible par le joueur » ;
--     remplit son auto-évaluation si le pré-remplissage est ouvert et non
--     verrouillé. Lien joueur = affiliation ACCEPTÉE par l'éducateur (jamais
--     le simple lien equipe_joueurs.joueur_id, que tout compte peut poser).
--   Parents acceptés par le joueur : lisent comme le joueur, n'écrivent pas.
--   Notes : jamais lisibles par le joueur ni ses parents.
--   Un club ne voit jamais rien d'un autre club. Aucun accès visiteur.
--
-- Contenu :
--   1. role_permissions : sections 'evaluations' et 'evaluations_tests'.
--   2. Tables : evaluations, evaluation_resultats, notes_suivi,
--      journal_acces_evaluations.
--   3. Fonctions de droits.
--   4. Déclencheurs.
--   5. Règles (RLS) et droits d'accès, verrou des outils à la carte.
--   6. Critères, versions et modèles lisibles à travers une évaluation.
--   7. Correction de club_lit_evaluations (anciennes fiches).
--
-- Avant d'exécuter : sauvegarde ~/Sauvegardes-DigitalFootball/sauvegarder.sh.
-- Tout est dans une seule transaction : en cas d'erreur, rien n'est appliqué.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Sections réglables (liste du bloc 1 + les deux nouvelles)
-- ----------------------------------------------------------------------------
alter table public.role_permissions drop constraint role_permissions_section_check;
alter table public.role_permissions add constraint role_permissions_section_check
  check (section = any (array[
    'sportif', 'seances', 'terrains', 'deplacements', 'budget', 'sponsors',
    'repartition_bus', 'profil', 'evenements', 'stages', 'organigramme', 'staff',
    'inventaire', 'newsletter', 'taches', 'projet_club_cff4', 'mon_club',
    'bibliotheque', 'evaluations_modeles', 'evaluations', 'evaluations_tests'
  ]::text[]));

-- ----------------------------------------------------------------------------
-- 2a. Évaluations (une évaluation = un joueur, une version de modèle, une date)
--     nature 'evaluation' : la fiche complète ; 'tests' : séance de tests.
--     Les colonnes « photo » (club, éducateur, joueur, nom, catégorie, poste)
--     sont posées par la base à la création : l'évaluation garde son contexte
--     même si le joueur change d'équipe ou quitte l'effectif.
-- ----------------------------------------------------------------------------
create table public.evaluations (
  id                       uuid primary key default gen_random_uuid(),
  -- Club propriétaire des données ; vide = éducateur indépendant
  club_id                  uuid references public.profiles(id) on delete cascade,
  -- Éducateur responsable du joueur au moment de l'évaluation
  educateur_id             uuid references public.profiles(id) on delete set null,
  auteur_id                uuid references public.profiles(id) on delete set null,
  equipe_joueur_id         uuid references public.equipe_joueurs(id) on delete set null,
  -- Compte du joueur, seulement s'il est affilié et accepté sur cette ligne
  joueur_id                uuid references public.profiles(id) on delete set null,
  joueur_nom               text not null default '' check (length(joueur_nom) <= 120),
  categorie_cle            text check (categorie_cle ~ '^[A-Z0-9]{2,12}$'),
  club_categorie_id        uuid references public.club_categories(id) on delete set null,
  poste                    text check (poste in ('gardien', 'defenseur', 'milieu', 'attaquant')),
  version_id               uuid not null references public.modeles_evaluation_versions(id),
  nature                   text not null default 'evaluation' check (nature in ('evaluation', 'tests')),
  saison                   text not null check (saison ~ '^[0-9]{4}-[0-9]{4}$'),
  -- 1 à 4 : rang dans la saison ; vide = évaluation à la demande
  numero                   smallint check (numero between 1 and 4),
  date_evaluation          date not null default current_date,
  statut                   text not null default 'brouillon' check (statut in ('brouillon', 'terminee')),
  termine_le               timestamptz,
  visible_joueur           boolean not null default false,
  autorise_prefill_joueur  boolean not null default false,
  verrouillee_joueur       boolean not null default false,
  objectif_personnel       text not null default '' check (length(objectif_personnel) <= 1000),
  objectif_collectif       text not null default '' check (length(objectif_collectif) <= 1000),
  commentaire              text not null default '' check (length(commentaire) <= 2000),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

comment on table public.evaluations is
  'Évaluations et séances de tests (nouvelles fiches). Rattachées à une version de modèle publiée, qui ne change plus.';

create index evaluations_club_idx on public.evaluations (club_id, categorie_cle);
create index evaluations_educateur_idx on public.evaluations (educateur_id);
create index evaluations_equipe_joueur_idx on public.evaluations (equipe_joueur_id);
create index evaluations_joueur_idx on public.evaluations (joueur_id);
create index evaluations_version_idx on public.evaluations (version_id);

-- ----------------------------------------------------------------------------
-- 2b. Résultats : une ligne par critère et par source
--     source 'educateur' : la note de l'éducateur ; 'joueur' : auto-évaluation.
--     Une seule valeur remplie, selon le type du critère.
-- ----------------------------------------------------------------------------
create table public.evaluation_resultats (
  id             uuid primary key default gen_random_uuid(),
  evaluation_id  uuid not null references public.evaluations(id) on delete cascade,
  critere_id     uuid not null references public.criteres_evaluation(id),
  source         text not null default 'educateur' check (source in ('educateur', 'joueur')),
  note           smallint check (note between 1 and 3),
  valeur         numeric check (valeur >= 0 and valeur < 100000),
  oui_non        boolean,
  texte          text check (length(texte) <= 2000),
  auteur_id      uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (evaluation_id, critere_id, source)
);

create index evaluation_resultats_critere_idx on public.evaluation_resultats (critere_id);

comment on table public.evaluation_resultats is
  'Résultats critère par critère : note 1 à 3, valeur de test, oui / non ou texte. Source éducateur ou auto-évaluation du joueur.';

-- ----------------------------------------------------------------------------
-- 2c. Notes de suivi (les « fiches papier » de l'éducateur)
--     Jamais lisibles par le joueur ni ses parents.
--     privee : son auteur seulement, jamais transmise.
--     staff  : staff autorisé du club ; transmissible = suit le joueur chez
--              son éducateur suivant dans le même club.
-- ----------------------------------------------------------------------------
create table public.notes_suivi (
  id                uuid primary key default gen_random_uuid(),
  club_id           uuid references public.profiles(id) on delete cascade,
  educateur_id      uuid references public.profiles(id) on delete set null,
  auteur_id         uuid references public.profiles(id) on delete set null,
  equipe_joueur_id  uuid references public.equipe_joueurs(id) on delete set null,
  joueur_id         uuid references public.profiles(id) on delete set null,
  joueur_nom        text not null default '' check (length(joueur_nom) <= 120),
  categorie_cle     text check (categorie_cle ~ '^[A-Z0-9]{2,12}$'),
  date_note         date not null default current_date,
  texte             text not null check (length(btrim(texte)) between 1 and 5000),
  visibilite        text not null default 'privee' check (visibilite in ('privee', 'staff')),
  transmissible     boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (visibilite = 'staff' or not transmissible)
);

create index notes_suivi_club_idx on public.notes_suivi (club_id, categorie_cle);
create index notes_suivi_educateur_idx on public.notes_suivi (educateur_id);
create index notes_suivi_auteur_idx on public.notes_suivi (auteur_id);
create index notes_suivi_equipe_joueur_idx on public.notes_suivi (equipe_joueur_id);
create index notes_suivi_joueur_idx on public.notes_suivi (joueur_id);

comment on table public.notes_suivi is
  'Notes de suivi d''un joueur. Jamais visibles par le joueur ni ses parents. Une note privée n''est jamais transmise.';

-- ----------------------------------------------------------------------------
-- 2d. Journal des accès (qui a consulté quoi, quand), lu par le club.
--     Écrit seulement par la fonction noter_acces_evaluations (appelée par
--     l'application à l'ouverture d'un historique) et par la base lors d'une
--     suppression de note par le club. Personne ne peut le modifier.
-- ----------------------------------------------------------------------------
create table public.journal_acces_evaluations (
  id                uuid primary key default gen_random_uuid(),
  club_id           uuid not null references public.profiles(id) on delete cascade,
  lecteur_id        uuid references public.profiles(id) on delete set null,
  equipe_joueur_id  uuid references public.equipe_joueurs(id) on delete set null,
  joueur_nom        text not null default '' check (length(joueur_nom) <= 120),
  objet             text not null check (objet in ('evaluations', 'tests', 'notes', 'historique', 'suppression_note')),
  created_at        timestamptz not null default now()
);

create index journal_acces_evaluations_club_idx on public.journal_acces_evaluations (club_id, created_at desc);

comment on table public.journal_acces_evaluations is
  'Journal des accès aux historiques d''évaluation, consultable par le club. Lecture seule pour tous.';

-- ----------------------------------------------------------------------------
-- 3a. Outils internes : catégorie et poste à partir de l'effectif
-- ----------------------------------------------------------------------------
create or replace function public.evaluation_cle_categorie(p_texte text)
returns text
language sql
immutable
set search_path to ''
as $$
  select case
    when p_texte is null then null
    when upper(regexp_replace(p_texte, '\s+', '', 'g')) ~ '^[A-Z0-9]{2,12}$'
      then upper(regexp_replace(p_texte, '\s+', '', 'g'))
    else null
  end
$$;

create or replace function public.evaluation_famille_poste(p_poste text)
returns text
language sql
immutable
set search_path to ''
as $$
  select case
    when p_poste is null or btrim(p_poste) = '' then null
    when lower(p_poste) like '%gardien%' then 'gardien'
    when lower(p_poste) like '%milieu%' then 'milieu'
    when lower(p_poste) ~ '(défenseur|defenseur|latéral|lateral|piston|arrière|arriere)' then 'defenseur'
    when lower(p_poste) ~ '(attaquant|ailier|avant|buteur|pointe)' then 'attaquant'
    else null
  end
$$;

-- Contexte d'une ligne d'effectif : club, éducateur, catégorie, joueur.
-- Sert aux déclencheurs (non appelable depuis l'application).
create or replace function public.evaluation_contexte_joueur(
  p_equipe_joueur_id uuid,
  out club_id uuid, out educateur_effectif uuid, out educateur_equipe uuid,
  out joueur_id uuid, out joueur_nom text, out categorie_cle text,
  out club_categorie_id uuid, out categorie_id uuid, out poste text)
language sql
stable
security definer
set search_path to ''
as $$
  select coalesce(c.club_id, cc.club_id),
         ej.educateur_id,
         cc.educateur_id,
         (select a.joueur_id from public.affiliations a
           where a.equipe_joueur_id = ej.id and a.statut = 'accepte' and a.joueur_id is not null
           order by a.created_at desc nulls last limit 1),
         left(btrim(coalesce(ej.prenom, '') || ' ' || coalesce(ej.nom, '')), 120),
         coalesce(c.nom_cle, public.evaluation_cle_categorie(ej.categorie)),
         ej.club_categorie_id,
         ej.categorie_id,
         public.evaluation_famille_poste(ej.poste)
    from public.equipe_joueurs ej
    left join public.categories c on c.id = ej.categorie_id
    left join public.club_categories cc on cc.id = ej.club_categorie_id
   where ej.id = p_equipe_joueur_id
$$;

-- Catégorie (clé) d'une ligne d'effectif, seule information renvoyée :
-- sert à la règle des anciennes fiches (section 7).
create or replace function public.secu_categorie_effectif(p_equipe_joueur_id uuid)
returns text
language sql
stable
security definer
set search_path to ''
as $$
  select coalesce(c.nom_cle, public.evaluation_cle_categorie(ej.categorie))
    from public.equipe_joueurs ej
    left join public.categories c on c.id = ej.categorie_id
   where ej.id = p_equipe_joueur_id
$$;

-- ----------------------------------------------------------------------------
-- 3b. Périmètre de catégories d'un rôle du staff (même logique que
--     peut_voir_categorie : réglage du club s'il existe, sinon défauts).
--     Catégorie inconnue : seuls les rôles « tout le club » passent.
-- ----------------------------------------------------------------------------
create or replace function public.secu_staff_couvre_categorie(p_club_id uuid, p_role text, p_categorie_cle text)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select case
    when p_role = 'president' then true
    when exists (select 1 from public.role_categories_access r where r.club_id = p_club_id and r.role = p_role) then
      exists (
        select 1 from public.role_categories_access r
        where r.club_id = p_club_id and r.role = p_role
          and (
            r.acces_complet is true
            or (p_categorie_cle is not null and exists (
              select 1 from jsonb_array_elements_text(
                case when jsonb_typeof(r.categories) = 'array' then r.categories else '[]'::jsonb end
              ) x(nom)
              where upper(regexp_replace(x.nom, '\s+', '', 'g')) = p_categorie_cle
            ))
          )
      )
    else
      p_role in ('directeur_sportif', 'preparateur_physique')
      or (p_role = 'responsable_formation'    and p_categorie_cle in ('U15','U16','U17','U18','U19','U20','SENIORS'))
      or (p_role = 'responsable_ecole_foot'   and p_categorie_cle in ('U7','U8','U9','U10'))
      or (p_role = 'responsable_preformation' and p_categorie_cle in ('U11','U12','U13','U14'))
  end
$$;

-- ----------------------------------------------------------------------------
-- 3c. Droit du club et du staff sur les évaluations ('evaluations') ou les
--     tests ('evaluations_tests'), pour une catégorie.
--     Compte du club et président : lecture seulement.
--     Autres rôles : réglage du rôle s'il existe, sinon valeurs par défaut,
--     et toujours dans le périmètre de catégories du rôle.
-- ----------------------------------------------------------------------------
create or replace function public.a_permission_evaluations(p_club_id uuid, p_section text, p_edition boolean, p_categorie_cle text)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select auth.uid() is not null
    and p_club_id is not null
    and p_section in ('evaluations', 'evaluations_tests')
    and (
      (
        not coalesce(p_edition, true)
        and p_club_id = auth.uid()
        and exists (select 1 from public.profiles pr where pr.id = p_club_id and pr.plan = 'club')
      )
      or exists (
        select 1 from public.staff_club sc
        where sc.club_id = p_club_id
          and sc.user_id = auth.uid()
          and sc.role is not null
          and (
            (sc.role = 'president' and not coalesce(p_edition, true))
            or (
              sc.role <> 'president'
              and public.secu_staff_couvre_categorie(p_club_id, sc.role, p_categorie_cle)
              and (
                exists (
                  select 1 from public.role_permissions rp
                  where rp.club_id = p_club_id
                    and rp.role = sc.role
                    and rp.section = p_section
                    and coalesce(rp.can_view, false)
                    and (not coalesce(p_edition, true) or coalesce(rp.can_edit, false))
                )
                or (
                  not exists (
                    select 1 from public.role_permissions rp2
                    where rp2.club_id = p_club_id
                      and rp2.role = sc.role
                      and rp2.section = p_section
                  )
                  and case
                    when coalesce(p_edition, true)
                      then p_section = 'evaluations_tests' and sc.role = 'preparateur_physique'
                    else sc.role = any (
                      case when p_section = 'evaluations_tests'
                        then array['directeur_sportif', 'responsable_formation', 'responsable_ecole_foot',
                                   'responsable_preformation', 'preparateur_physique']::text[]
                        else array['directeur_sportif', 'responsable_formation', 'responsable_ecole_foot',
                                   'responsable_preformation']::text[]
                      end)
                  end
                )
              )
            )
          )
      )
    )
$$;

-- Membre d'un club : compte du club, staff, ou éducateur accepté
create or replace function public.secu_membre_club(p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select public.secu_club_ou_staff(p_club_id) or public.secu_educateur_accepte_club(p_club_id)
$$;

-- ----------------------------------------------------------------------------
-- 3d. L'éducateur connecté a-t-il ACTUELLEMENT ce joueur, dans ce club ?
--     Même ligne d'effectif, ou même compte joueur affilié et accepté sur une
--     de ses lignes. Ses lignes : celles de son effectif, celles de l'équipe
--     qu'il encadre, celles d'une catégorie en effectif commun.
-- ----------------------------------------------------------------------------
create or replace function public.secu_educateur_a_le_joueur(p_club_id uuid, p_equipe_joueur_id uuid, p_joueur_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select auth.uid() is not null
    and p_club_id is not null
    and public.secu_educateur_accepte_club(p_club_id)
    and exists (
      select 1
        from public.equipe_joueurs ej
        left join public.categories c on c.id = ej.categorie_id
        left join public.club_categories cc on cc.id = ej.club_categorie_id
       where (
               ej.id = p_equipe_joueur_id
               or (p_joueur_id is not null and exists (
                 select 1 from public.affiliations a
                 where a.equipe_joueur_id = ej.id and a.joueur_id = p_joueur_id and a.statut = 'accepte'
               ))
             )
         and (
               cc.educateur_id = auth.uid()
               or public.categories_commun_educateur(ej.categorie_id)
               or (ej.educateur_id = auth.uid()
                   and (coalesce(c.club_id, cc.club_id) is null or coalesce(c.club_id, cc.club_id) = p_club_id))
             )
         and coalesce(c.club_id, cc.club_id, p_club_id) = p_club_id
    )
$$;

-- ----------------------------------------------------------------------------
-- 3e. Le compte connecté est-il le joueur, ou un parent accepté du joueur ?
--     Joueur = compte posé à la création (affiliation acceptée) ou affiliation
--     acceptée ou archivée (saison close) sur la ligne d'effectif.
-- ----------------------------------------------------------------------------
create or replace function public.secu_est_le_joueur(p_equipe_joueur_id uuid, p_joueur_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select auth.uid() is not null
    and (
      (p_joueur_id is not null and p_joueur_id = auth.uid())
      or (p_equipe_joueur_id is not null and exists (
        select 1 from public.affiliations a
        where a.equipe_joueur_id = p_equipe_joueur_id
          and a.joueur_id = auth.uid()
          and a.statut in ('accepte', 'archive')
      ))
    )
$$;

create or replace function public.secu_est_parent_du_joueur(p_equipe_joueur_id uuid, p_joueur_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select auth.uid() is not null
    and (
      (p_joueur_id is not null and public.est_parent_accepte_de(p_joueur_id))
      or (p_equipe_joueur_id is not null and exists (
        select 1 from public.affiliations a
        where a.equipe_joueur_id = p_equipe_joueur_id
          and a.joueur_id is not null
          and a.statut in ('accepte', 'archive')
          and public.est_parent_accepte_de(a.joueur_id)
      ))
    )
$$;

-- ----------------------------------------------------------------------------
-- 3f. Droit sur une évaluation.
--   'lecture'          : côté staff (tout, brouillons compris pour ceux qui
--                        en ont la charge ; terminées seulement en passation)
--   'edition'          : créer, modifier, supprimer l'évaluation et les
--                        résultats de l'éducateur
--   'joueur'           : en-tête lisible par le joueur ou ses parents
--   'joueur_resultats' : résultats de l'éducateur lisibles par eux
--   'autoeval'         : le joueur écrit son auto-évaluation
-- ----------------------------------------------------------------------------
create or replace function public.secu_evaluation_droit_ligne(e public.evaluations, p_droit text)
returns boolean
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  v_uid uuid := auth.uid();
  v_section text := case when e.nature = 'tests' then 'evaluations_tests' else 'evaluations' end;
  v_transmis boolean;
begin
  if v_uid is null or e.id is null then
    return false;
  end if;

  if p_droit in ('lecture', 'edition') then
    -- Éducateur responsable, encore dans le club (ou indépendant)
    if e.educateur_id = v_uid
       and (e.club_id is null or public.secu_educateur_accepte_club(e.club_id)) then
      return true;
    end if;
    -- Dirigeant délégué de cet éducateur (permission « notes »)
    if e.educateur_id is not null and exists (
      select 1 from public.dirigeant_acces d
      where d.dirigeant_id = v_uid
        and d.educateur_id = e.educateur_id
        and d.statut = 'accepte'
        and (d.permissions ->> 'notes') = any (
          case when p_droit = 'edition' then array['edition'] else array['lecture', 'edition'] end)
    ) then
      return true;
    end if;
    if e.club_id is not null then
      -- Club et staff autorisés, dans leur périmètre
      if public.a_permission_evaluations(e.club_id, v_section, p_droit = 'edition', e.categorie_cle) then
        return true;
      end if;
      -- Passation : nouvel éducateur du joueur, lecture des évaluations terminées
      if p_droit = 'lecture' and e.statut = 'terminee'
         and public.secu_educateur_a_le_joueur(e.club_id, e.equipe_joueur_id, e.joueur_id) then
        select case when e.nature = 'tests' then pe.transmettre_tests else pe.transmettre_evaluations end
          into v_transmis
          from public.parametres_evaluation pe
         where pe.proprietaire_id = e.club_id and pe.proprietaire_type = 'club';
        if coalesce(v_transmis, true) then
          return true;
        end if;
      end if;
    end if;
    return false;
  end if;

  if p_droit = 'joueur' then
    return ((e.visible_joueur and e.statut = 'terminee') or e.autorise_prefill_joueur)
      and (public.secu_est_le_joueur(e.equipe_joueur_id, e.joueur_id)
           or public.secu_est_parent_du_joueur(e.equipe_joueur_id, e.joueur_id));
  end if;

  if p_droit = 'joueur_resultats' then
    return e.visible_joueur and e.statut = 'terminee'
      and (public.secu_est_le_joueur(e.equipe_joueur_id, e.joueur_id)
           or public.secu_est_parent_du_joueur(e.equipe_joueur_id, e.joueur_id));
  end if;

  if p_droit = 'autoeval' then
    return e.autorise_prefill_joueur and not e.verrouillee_joueur
      and public.secu_est_le_joueur(e.equipe_joueur_id, e.joueur_id);
  end if;

  return false;
end;
$$;

create or replace function public.secu_evaluation_droit(p_evaluation_id uuid, p_droit text)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select coalesce((
    select public.secu_evaluation_droit_ligne(e, p_droit)
      from public.evaluations e where e.id = p_evaluation_id
  ), false)
$$;

-- ----------------------------------------------------------------------------
-- 3g. Droit sur une note de suivi ('lecture', 'edition', 'suppression', 'ajout')
-- ----------------------------------------------------------------------------
create or replace function public.secu_note_droit_ligne(n public.notes_suivi, p_droit text)
returns boolean
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  v_uid uuid := auth.uid();
  v_auteur_actif boolean;
  v_transmis boolean;
begin
  if v_uid is null or n.id is null then
    return false;
  end if;
  v_auteur_actif := n.auteur_id = v_uid and (n.club_id is null or public.secu_membre_club(n.club_id));

  if p_droit = 'ajout' then
    return n.auteur_id = v_uid and (
      (n.educateur_id = v_uid and (n.club_id is null or public.secu_educateur_accepte_club(n.club_id)))
      or (n.club_id is not null and (
        public.a_permission_evaluations(n.club_id, 'evaluations', true, n.categorie_cle)
        or public.a_permission_evaluations(n.club_id, 'evaluations_tests', true, n.categorie_cle)))
    );
  end if;

  if p_droit = 'edition' then
    return v_auteur_actif;
  end if;

  if p_droit = 'suppression' then
    -- L'auteur, ou le club (demande RGPD : inscrite au journal)
    return v_auteur_actif or (n.club_id is not null and public.secu_club_ou_president(n.club_id));
  end if;

  if p_droit = 'lecture' then
    if v_auteur_actif then
      return true;
    end if;
    if n.visibilite <> 'staff' then
      return false;
    end if;
    if n.educateur_id = v_uid
       and (n.club_id is null or public.secu_educateur_accepte_club(n.club_id)) then
      return true;
    end if;
    if n.educateur_id is not null and exists (
      select 1 from public.dirigeant_acces d
      where d.dirigeant_id = v_uid and d.educateur_id = n.educateur_id and d.statut = 'accepte'
        and (d.permissions ->> 'notes') in ('lecture', 'edition')
    ) then
      return true;
    end if;
    if n.club_id is not null then
      if public.a_permission_evaluations(n.club_id, 'evaluations', false, n.categorie_cle)
         or public.a_permission_evaluations(n.club_id, 'evaluations_tests', false, n.categorie_cle) then
        return true;
      end if;
      if n.transmissible and public.secu_educateur_a_le_joueur(n.club_id, n.equipe_joueur_id, n.joueur_id) then
        select pe.transmettre_notes into v_transmis
          from public.parametres_evaluation pe
         where pe.proprietaire_id = n.club_id and pe.proprietaire_type = 'club';
        return coalesce(v_transmis, true);
      end if;
    end if;
    return false;
  end if;

  return false;
end;
$$;

-- ----------------------------------------------------------------------------
-- 3h. Lecture des critères, versions et modèles À TRAVERS une évaluation
--     lisible (joueur, parent, dirigeant, nouvel éducateur, staff).
-- ----------------------------------------------------------------------------
create or replace function public.secu_version_lue_par_evaluation(p_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.evaluations e
    where e.version_id = p_version_id
      and (public.secu_evaluation_droit_ligne(e, 'lecture') or public.secu_evaluation_droit_ligne(e, 'joueur'))
  )
$$;

create or replace function public.secu_modele_lu_par_evaluation(p_modele_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.modeles_evaluation_versions v
    where v.modele_id = p_modele_id and public.secu_version_lue_par_evaluation(v.id)
  )
$$;

-- ----------------------------------------------------------------------------
-- 3i. Journal : l'application note l'ouverture d'un historique
-- ----------------------------------------------------------------------------
create or replace function public.noter_acces_evaluations(p_equipe_joueur_id uuid, p_objet text)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  ctx record;
begin
  if auth.uid() is null then
    raise exception 'connexion requise';
  end if;
  if p_objet is null or p_objet not in ('evaluations', 'tests', 'notes', 'historique') then
    raise exception 'objet inconnu';
  end if;
  select * into ctx from public.evaluation_contexte_joueur(p_equipe_joueur_id);
  if ctx.club_id is null then
    return; -- joueur d'un éducateur indépendant : pas de club, pas de journal
  end if;
  if not (public.secu_membre_club(ctx.club_id)
          or exists (select 1 from public.dirigeant_acces d
                     where d.dirigeant_id = auth.uid() and d.statut = 'accepte'
                       and d.educateur_id in (ctx.educateur_effectif, ctx.educateur_equipe))) then
    raise exception 'accès refusé';
  end if;
  insert into public.journal_acces_evaluations (club_id, lecteur_id, equipe_joueur_id, joueur_nom, objet)
  values (ctx.club_id, auth.uid(), p_equipe_joueur_id, coalesce(ctx.joueur_nom, ''), p_objet);
end;
$$;

-- ----------------------------------------------------------------------------
-- 4a. Évaluations : contexte posé par la base, version publiée et du même
--     propriétaire, colonnes « photo » figées.
--     Sans compte connecté (éditeur SQL) : club, éducateur, auteur fournis gardés.
-- ----------------------------------------------------------------------------
create or replace function public.evaluations_avant_ecriture()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  ctx record;
  v_uid uuid := auth.uid();
  v_ver record;
  v_nb int;
begin
  if tg_op = 'INSERT' then
    if new.equipe_joueur_id is null then
      raise exception 'le joueur (ligne d''effectif) est obligatoire';
    end if;
    select * into ctx from public.evaluation_contexte_joueur(new.equipe_joueur_id);
    if ctx.joueur_nom is null then
      raise exception 'joueur introuvable dans l''effectif';
    end if;

    if v_uid is not null then
      -- Club : celui de l'équipe ; à défaut, l'unique club de l'éducateur
      new.club_id := ctx.club_id;
      if new.club_id is null then
        select count(*), min(ce.club_id::text)::uuid into v_nb, new.club_id
          from public.club_educateurs ce
         where ce.educateur_id = coalesce(ctx.educateur_effectif, v_uid) and ce.statut = 'accepte';
        if v_nb > 1 then
          raise exception 'équipe du joueur à rattacher à un club avant de l''évaluer';
        end if;
      end if;
      new.auteur_id := v_uid;
      if ctx.educateur_effectif = v_uid or ctx.educateur_equipe = v_uid
         or public.categories_commun_educateur(ctx.categorie_id) then
        new.educateur_id := v_uid;
      else
        new.educateur_id := coalesce(ctx.educateur_effectif, ctx.educateur_equipe);
      end if;
    else
      new.club_id := coalesce(new.club_id, ctx.club_id);
      new.educateur_id := coalesce(new.educateur_id, ctx.educateur_effectif, ctx.educateur_equipe);
    end if;

    new.joueur_id         := ctx.joueur_id;
    new.joueur_nom        := ctx.joueur_nom;
    new.categorie_cle     := ctx.categorie_cle;
    new.club_categorie_id := ctx.club_categorie_id;
    new.poste             := coalesce(new.poste, ctx.poste);

    select v.publiee_le, v.modele_id, m.club_id, m.educateur_id into v_ver
      from public.modeles_evaluation_versions v
      join public.modeles_evaluation m on m.id = v.modele_id
     where v.id = new.version_id;
    if v_ver.modele_id is null then
      raise exception 'version de modèle introuvable';
    end if;
    if v_ver.publiee_le is null then
      raise exception 'version de modèle non publiée';
    end if;
    if new.club_id is not null then
      if v_ver.club_id is distinct from new.club_id then
        raise exception 'le modèle doit appartenir au club du joueur';
      end if;
    elsif v_ver.club_id is not null or v_ver.educateur_id is distinct from new.educateur_id then
      raise exception 'un éducateur indépendant utilise ses propres modèles';
    end if;
    if v_uid is not null and not public.secu_modele_evaluation_acces(v_ver.modele_id, false) then
      raise exception 'modèle non accessible';
    end if;

    new.created_at := now();
    new.termine_le := case when new.statut = 'terminee' then now() else null end;
  else
    new.club_id           := old.club_id;
    new.version_id        := old.version_id;
    new.nature            := old.nature;
    new.joueur_nom        := old.joueur_nom;
    new.categorie_cle     := old.categorie_cle;
    new.created_at        := old.created_at;
    -- Colonnes vidées seulement par la base (compte ou ligne supprimés)
    new.educateur_id      := case when new.educateur_id is null then null else old.educateur_id end;
    new.auteur_id         := case when new.auteur_id is null then null else old.auteur_id end;
    new.equipe_joueur_id  := case when new.equipe_joueur_id is null then null else old.equipe_joueur_id end;
    new.club_categorie_id := case when new.club_categorie_id is null then null else old.club_categorie_id end;
    if new.joueur_id is null and old.joueur_id is not null then
      new.joueur_id := null;
    else
      new.joueur_id := coalesce(old.joueur_id, (
        select a.joueur_id from public.affiliations a
         where a.equipe_joueur_id = new.equipe_joueur_id and a.statut = 'accepte' and a.joueur_id is not null
         order by a.created_at desc nulls last limit 1));
    end if;
    new.termine_le := case when new.statut = 'terminee' then coalesce(old.termine_le, now()) else null end;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger evaluations_avant_ecriture
  before insert or update on public.evaluations
  for each row execute function public.evaluations_avant_ecriture();

-- ----------------------------------------------------------------------------
-- 4b. Résultats : critère de la bonne version, une seule valeur selon le
--     type, séance de tests = critères « test » seulement.
-- ----------------------------------------------------------------------------
create or replace function public.evaluation_resultats_avant_ecriture()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_type text;
  v_nature text;
begin
  if tg_op = 'UPDATE' then
    new.evaluation_id := old.evaluation_id;
    new.critere_id    := old.critere_id;
    new.source        := old.source;
    new.created_at    := old.created_at;
  else
    new.created_at := now();
  end if;

  select c.type, e.nature into v_type, v_nature
    from public.evaluations e
    join public.criteres_evaluation c on c.version_id = e.version_id
   where e.id = new.evaluation_id and c.id = new.critere_id;
  if v_type is null then
    raise exception 'ce critère n''appartient pas au modèle de cette évaluation';
  end if;
  if v_nature = 'tests' and v_type <> 'test' then
    raise exception 'une séance de tests ne contient que des tests chiffrés';
  end if;
  if (v_type <> 'note' and new.note is not null)
     or (v_type <> 'test' and new.valeur is not null)
     or (v_type <> 'oui_non' and new.oui_non is not null)
     or (v_type <> 'commentaire' and new.texte is not null) then
    raise exception 'valeur incompatible avec le type du critère (%)', v_type;
  end if;

  if auth.uid() is not null then
    new.auteur_id := auth.uid();
  elsif tg_op = 'UPDATE' then
    new.auteur_id := case when new.auteur_id is null then null else old.auteur_id end;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger evaluation_resultats_avant_ecriture
  before insert or update on public.evaluation_resultats
  for each row execute function public.evaluation_resultats_avant_ecriture();

-- ----------------------------------------------------------------------------
-- 4c. Notes : même contexte que les évaluations ; une note privée n'est
--     jamais transmissible ; colonnes « photo » figées.
-- ----------------------------------------------------------------------------
create or replace function public.notes_suivi_avant_ecriture()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  ctx record;
  v_uid uuid := auth.uid();
  v_nb int;
begin
  if tg_op = 'INSERT' then
    if new.equipe_joueur_id is null then
      raise exception 'le joueur (ligne d''effectif) est obligatoire';
    end if;
    select * into ctx from public.evaluation_contexte_joueur(new.equipe_joueur_id);
    if ctx.joueur_nom is null then
      raise exception 'joueur introuvable dans l''effectif';
    end if;
    if v_uid is not null then
      new.club_id := ctx.club_id;
      if new.club_id is null then
        select count(*), min(ce.club_id::text)::uuid into v_nb, new.club_id
          from public.club_educateurs ce
         where ce.educateur_id = coalesce(ctx.educateur_effectif, v_uid) and ce.statut = 'accepte';
        if v_nb > 1 then
          raise exception 'équipe du joueur à rattacher à un club avant d''écrire une note';
        end if;
      end if;
      new.auteur_id := v_uid;
      if ctx.educateur_effectif = v_uid or ctx.educateur_equipe = v_uid
         or public.categories_commun_educateur(ctx.categorie_id) then
        new.educateur_id := v_uid;
      else
        new.educateur_id := coalesce(ctx.educateur_effectif, ctx.educateur_equipe);
      end if;
    else
      new.club_id := coalesce(new.club_id, ctx.club_id);
      new.educateur_id := coalesce(new.educateur_id, ctx.educateur_effectif, ctx.educateur_equipe);
    end if;
    new.joueur_id     := ctx.joueur_id;
    new.joueur_nom    := ctx.joueur_nom;
    new.categorie_cle := ctx.categorie_cle;
    new.created_at    := now();
  else
    new.club_id          := old.club_id;
    new.joueur_nom       := old.joueur_nom;
    new.categorie_cle    := old.categorie_cle;
    new.created_at       := old.created_at;
    new.educateur_id     := case when new.educateur_id is null then null else old.educateur_id end;
    new.auteur_id        := case when new.auteur_id is null then null else old.auteur_id end;
    new.equipe_joueur_id := case when new.equipe_joueur_id is null then null else old.equipe_joueur_id end;
    new.joueur_id        := case when new.joueur_id is null then null else old.joueur_id end;
  end if;
  if new.visibilite = 'privee' then
    new.transmissible := false;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger notes_suivi_avant_ecriture
  before insert or update on public.notes_suivi
  for each row execute function public.notes_suivi_avant_ecriture();

-- Suppression d'une note par quelqu'un d'autre que son auteur (demande RGPD
-- traitée par le club) : inscrite au journal.
create or replace function public.notes_suivi_apres_suppression()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if auth.uid() is not null and old.club_id is not null
     and old.auteur_id is distinct from auth.uid() then
    insert into public.journal_acces_evaluations (club_id, lecteur_id, equipe_joueur_id, joueur_nom, objet)
    values (old.club_id, auth.uid(), old.equipe_joueur_id, old.joueur_nom, 'suppression_note');
  end if;
  return old;
end;
$$;

create trigger notes_suivi_apres_suppression
  after delete on public.notes_suivi
  for each row execute function public.notes_suivi_apres_suppression();

-- ----------------------------------------------------------------------------
-- Droits sur les fonctions
-- ----------------------------------------------------------------------------
revoke all on function public.evaluation_cle_categorie(text) from public, anon;
revoke all on function public.evaluation_famille_poste(text) from public, anon;
revoke all on function public.evaluation_contexte_joueur(uuid) from public, anon, authenticated;
revoke all on function public.secu_categorie_effectif(uuid) from public, anon;
grant execute on function public.secu_categorie_effectif(uuid) to authenticated;
revoke all on function public.secu_staff_couvre_categorie(uuid, text, text) from public, anon;
revoke all on function public.a_permission_evaluations(uuid, text, boolean, text) from public, anon;
revoke all on function public.secu_membre_club(uuid) from public, anon;
revoke all on function public.secu_educateur_a_le_joueur(uuid, uuid, uuid) from public, anon;
revoke all on function public.secu_est_le_joueur(uuid, uuid) from public, anon;
revoke all on function public.secu_est_parent_du_joueur(uuid, uuid) from public, anon;
revoke all on function public.secu_evaluation_droit_ligne(public.evaluations, text) from public, anon;
revoke all on function public.secu_evaluation_droit(uuid, text) from public, anon;
revoke all on function public.secu_note_droit_ligne(public.notes_suivi, text) from public, anon;
revoke all on function public.secu_version_lue_par_evaluation(uuid) from public, anon;
revoke all on function public.secu_modele_lu_par_evaluation(uuid) from public, anon;
revoke all on function public.noter_acces_evaluations(uuid, text) from public, anon;

grant execute on function public.evaluation_cle_categorie(text) to authenticated;
grant execute on function public.evaluation_famille_poste(text) to authenticated;
grant execute on function public.secu_staff_couvre_categorie(uuid, text, text) to authenticated;
grant execute on function public.a_permission_evaluations(uuid, text, boolean, text) to authenticated;
grant execute on function public.secu_membre_club(uuid) to authenticated;
grant execute on function public.secu_educateur_a_le_joueur(uuid, uuid, uuid) to authenticated;
grant execute on function public.secu_est_le_joueur(uuid, uuid) to authenticated;
grant execute on function public.secu_est_parent_du_joueur(uuid, uuid) to authenticated;
grant execute on function public.secu_evaluation_droit_ligne(public.evaluations, text) to authenticated;
grant execute on function public.secu_evaluation_droit(uuid, text) to authenticated;
grant execute on function public.secu_note_droit_ligne(public.notes_suivi, text) to authenticated;
grant execute on function public.secu_version_lue_par_evaluation(uuid) to authenticated;
grant execute on function public.secu_modele_lu_par_evaluation(uuid) to authenticated;
grant execute on function public.noter_acces_evaluations(uuid, text) to authenticated;

revoke all on function public.evaluations_avant_ecriture() from public, anon, authenticated;
revoke all on function public.evaluation_resultats_avant_ecriture() from public, anon, authenticated;
revoke all on function public.notes_suivi_avant_ecriture() from public, anon, authenticated;
revoke all on function public.notes_suivi_apres_suppression() from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5. Règles (RLS) et droits d'accès
-- ----------------------------------------------------------------------------
alter table public.evaluations enable row level security;
alter table public.evaluation_resultats enable row level security;
alter table public.notes_suivi enable row level security;
alter table public.journal_acces_evaluations enable row level security;

-- Évaluations
create policy ev_lecture on public.evaluations
  for select to authenticated
  using (public.secu_evaluation_droit_ligne(evaluations, 'lecture')
         or public.secu_evaluation_droit_ligne(evaluations, 'joueur'));

create policy ev_ajout on public.evaluations
  for insert to authenticated
  with check (public.secu_evaluation_droit_ligne(evaluations, 'edition'));

create policy ev_modification on public.evaluations
  for update to authenticated
  using (public.secu_evaluation_droit_ligne(evaluations, 'edition'))
  with check (public.secu_evaluation_droit_ligne(evaluations, 'edition'));

create policy ev_suppression on public.evaluations
  for delete to authenticated
  using (public.secu_evaluation_droit_ligne(evaluations, 'edition'));

-- Verrou des outils à la carte (même principe que evaluations_joueur et
-- tests_physiques) : sans l'outil, l'éducateur n'accède à rien.
create policy verrou_outils on public.evaluations
  as restrictive for all to authenticated
  using (not public.outil_ferme(
    case when nature = 'tests' then '{prep_physique,suivi_joueurs}'::text[] else '{suivi_joueurs}'::text[] end,
    '{}'::text[]))
  with check (not public.outil_ferme(
    case when nature = 'tests' then '{prep_physique,suivi_joueurs}'::text[] else '{suivi_joueurs}'::text[] end,
    '{}'::text[]));

-- Résultats
create policy er_lecture on public.evaluation_resultats
  for select to authenticated
  using (
    public.secu_evaluation_droit(evaluation_id, 'lecture')
    or (source = 'educateur' and public.secu_evaluation_droit(evaluation_id, 'joueur_resultats'))
    or (source = 'joueur' and public.secu_evaluation_droit(evaluation_id, 'joueur'))
  );

create policy er_ajout on public.evaluation_resultats
  for insert to authenticated
  with check (
    (source = 'educateur' and public.secu_evaluation_droit(evaluation_id, 'edition'))
    or (source = 'joueur' and public.secu_evaluation_droit(evaluation_id, 'autoeval'))
  );

create policy er_modification on public.evaluation_resultats
  for update to authenticated
  using (
    (source = 'educateur' and public.secu_evaluation_droit(evaluation_id, 'edition'))
    or (source = 'joueur' and public.secu_evaluation_droit(evaluation_id, 'autoeval'))
  )
  with check (
    (source = 'educateur' and public.secu_evaluation_droit(evaluation_id, 'edition'))
    or (source = 'joueur' and public.secu_evaluation_droit(evaluation_id, 'autoeval'))
  );

create policy er_suppression on public.evaluation_resultats
  for delete to authenticated
  using (
    (source = 'educateur' and public.secu_evaluation_droit(evaluation_id, 'edition'))
    or (source = 'joueur' and public.secu_evaluation_droit(evaluation_id, 'autoeval'))
  );

create policy verrou_outils on public.evaluation_resultats
  as restrictive for all to authenticated
  using (not public.outil_ferme('{prep_physique,suivi_joueurs}'::text[], '{}'::text[]))
  with check (not public.outil_ferme('{prep_physique,suivi_joueurs}'::text[], '{}'::text[]));

-- Notes de suivi
create policy ns_lecture on public.notes_suivi
  for select to authenticated
  using (public.secu_note_droit_ligne(notes_suivi, 'lecture'));

create policy ns_ajout on public.notes_suivi
  for insert to authenticated
  with check (public.secu_note_droit_ligne(notes_suivi, 'ajout'));

create policy ns_modification on public.notes_suivi
  for update to authenticated
  using (public.secu_note_droit_ligne(notes_suivi, 'edition'))
  with check (public.secu_note_droit_ligne(notes_suivi, 'edition'));

create policy ns_suppression on public.notes_suivi
  for delete to authenticated
  using (public.secu_note_droit_ligne(notes_suivi, 'suppression'));

create policy verrou_outils on public.notes_suivi
  as restrictive for all to authenticated
  using (not public.outil_ferme('{suivi_joueurs}'::text[], '{}'::text[]))
  with check (not public.outil_ferme('{suivi_joueurs}'::text[], '{}'::text[]));

-- Journal : lecture par ceux qui gèrent les réglages (club, président,
-- directeur sportif par défaut). Aucune écriture directe.
create policy ja_lecture on public.journal_acces_evaluations
  for select to authenticated
  using (public.a_permission_modeles_evaluation(club_id, true));

-- Droits de table : rien pour les visiteurs
revoke all on table public.evaluations from public, anon, authenticated;
revoke all on table public.evaluation_resultats from public, anon, authenticated;
revoke all on table public.notes_suivi from public, anon, authenticated;
revoke all on table public.journal_acces_evaluations from public, anon, authenticated;

grant select, insert, update, delete on table public.evaluations to authenticated;
grant select, insert, update, delete on table public.evaluation_resultats to authenticated;
grant select, insert, update, delete on table public.notes_suivi to authenticated;
grant select on table public.journal_acces_evaluations to authenticated;

grant all on table public.evaluations to service_role;
grant all on table public.evaluation_resultats to service_role;
grant all on table public.notes_suivi to service_role;
grant all on table public.journal_acces_evaluations to service_role;

-- ----------------------------------------------------------------------------
-- 6. Critères, versions et modèles lisibles à travers une évaluation
--    (Reste à finir du bloc 1 : joueur, parent, dirigeant, nouvel éducateur)
-- ----------------------------------------------------------------------------
create policy ce_lecture_evaluation on public.criteres_evaluation
  for select to authenticated
  using (public.secu_version_lue_par_evaluation(version_id));

create policy mev_lecture_evaluation on public.modeles_evaluation_versions
  for select to authenticated
  using (public.secu_version_lue_par_evaluation(id));

create policy me_lecture_evaluation on public.modeles_evaluation
  for select to authenticated
  using (public.secu_modele_lu_par_evaluation(id));

-- ----------------------------------------------------------------------------
-- 7. Anciennes fiches (evaluations_joueur) : le staff ne lit plus que dans
--    son rôle et son périmètre (droit 'evaluations'). Le compte du club et le
--    président gardent tout. Ancienne règle : tout membre du staff du club.
-- ----------------------------------------------------------------------------
drop policy club_lit_evaluations on public.evaluations_joueur;
create policy club_lit_evaluations on public.evaluations_joueur
  for select to public
  using (exists (
    select 1 from public.club_educateurs ce
    where ce.educateur_id = evaluations_joueur.educateur_id
      and ce.statut = 'accepte'
      and public.a_permission_evaluations(
            ce.club_id, 'evaluations', false,
            public.secu_categorie_effectif(evaluations_joueur.equipe_joueur_id))
  ));

commit;

-- ============================================================================
-- Fiches d'évaluation, bloc 1 (PLAN-fiches-evaluation.md) : 2026-11-19
-- ----------------------------------------------------------------------------
-- Socle des nouvelles fiches : bibliothèque Digital Football (vide), modèles
-- de fiche versionnés, critères de chaque version, réglages du club ou de
-- l'éducateur indépendant.
--
-- Rien d'existant n'est modifié : evaluations_joueur, tests_physiques et
-- leurs règles restent intacts. Seule retouche : la liste des sections
-- réglables de role_permissions reçoit 'evaluations_modeles' (même méthode
-- que 'bibliotheque' au chantier précédent).
--
-- Qui fait quoi (matrice validée au bloc 0) :
--   Bibliothèque Digital Football : lecture pour tout compte connecté,
--     écriture par personne depuis l'application (chargée au bloc 3 en SQL).
--   Modèles du club et réglages :
--     lire    : compte du club, président, rôles ayant la lecture.
--               Par défaut : directeur sportif, responsables formation,
--               école de foot, préformation, entraîneur, éducateur,
--               préparateur physique (pour connaître les tests).
--               Plus les éducateurs ACCEPTÉS du club.
--     écrire  : compte du club, président, rôles ayant l'écriture
--               (par défaut : directeur sportif seulement).
--   Modèles de l'éducateur :
--     affilié     : seulement si le club a coché « les éducateurs peuvent
--                   compléter ». Le club lit ces modèles.
--     indépendant : librement (aucun club ne l'a accepté).
--   Un club ne voit jamais rien d'un autre club. Aucun accès visiteur.
--
-- Versions : un modèle a des versions numérotées. Une version publiée ne
-- change plus jamais (ni critères ajoutés, modifiés ou retirés) : modifier
-- un modèle = nouvelle version. Les évaluations du bloc 2 pointeront sur une
-- version, donc une évaluation faite ne bouge jamais.
--
-- Contenu :
--   1. role_permissions : section 'evaluations_modeles' réglable.
--   2. Tables : bibliotheque_criteres, parametres_evaluation,
--      modeles_evaluation, modeles_evaluation_versions, criteres_evaluation.
--   3. Fonctions de droits.
--   4. Déclencheurs (auteur, dates, numéros, versions figées).
--   5. Règles (RLS) et droits d'accès.
--
-- Avant d'exécuter : sauvegarde ~/Sauvegardes-DigitalFootball/sauvegarder.sh.
-- Tout est dans une seule transaction : en cas d'erreur, rien n'est appliqué.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Section 'evaluations_modeles' autorisée dans role_permissions
--    (liste réelle relevée en production le 2026-11-19 + la nouvelle)
-- ----------------------------------------------------------------------------
alter table public.role_permissions drop constraint role_permissions_section_check;
alter table public.role_permissions add constraint role_permissions_section_check
  check (section = any (array[
    'sportif', 'seances', 'terrains', 'deplacements', 'budget', 'sponsors',
    'repartition_bus', 'profil', 'evenements', 'stages', 'organigramme', 'staff',
    'inventaire', 'newsletter', 'taches', 'projet_club_cff4', 'mon_club',
    'bibliotheque', 'evaluations_modeles'
  ]::text[]));

-- ----------------------------------------------------------------------------
-- 2a. Bibliothèque Digital Football (commune, lecture seule)
--     Une ligne = un critère noté, un test chiffré ou un oui / non.
--     Critères notés : par tranche d'âge (6 tranches) ou par poste.
--     Aucun objectif chiffré : c'est le club qui le fixe dans son modèle.
-- ----------------------------------------------------------------------------
create table public.bibliotheque_criteres (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique check (code ~ '^[A-Z]{1,3}-?[A-Z]?[0-9]{1,3}$'),
  type          text not null check (type in ('note', 'test', 'oui_non')),
  tranche       text check (tranche in ('u7_u9', 'u10_u11', 'u12_u13', 'u14_u15', 'u16_u17', 'u18_seniors')),
  poste         text check (poste in ('gardien', 'defenseur', 'milieu', 'attaquant')),
  pilier        text check (pilier in ('tactique', 'technique', 'physique', 'mental')),
  libelle       text not null check (length(btrim(libelle)) between 1 and 150),
  acquis_quand  text not null default '' check (length(acquis_quand) <= 300),
  unite         text check (length(unite) <= 20),
  sens          text check (sens in ('plus_haut', 'plus_bas')),
  a_partir_de   text check (a_partir_de ~ '^[A-Z0-9]{2,12}$'),
  remarque      text not null default '' check (length(remarque) <= 300),
  ordre         integer not null default 0,
  actif         boolean not null default true,
  created_at    timestamptz not null default now(),
  check (type = 'test' or (unite is null and sens is null)),
  check (type <> 'test' or sens is not null)
);

comment on table public.bibliotheque_criteres is
  'Bibliothèque Digital Football des critères d''évaluation (bloc 0 validé). Lecture seule pour tout compte connecté, chargée par SQL.';

create index bibliotheque_criteres_tranche_idx on public.bibliotheque_criteres (tranche, pilier, ordre);
create index bibliotheque_criteres_poste_idx on public.bibliotheque_criteres (poste, ordre);

-- ----------------------------------------------------------------------------
-- 2b. Réglages : une ligne par club, ou par éducateur indépendant
-- ----------------------------------------------------------------------------
create table public.parametres_evaluation (
  proprietaire_id               uuid primary key references public.profiles(id) on delete cascade,
  proprietaire_type             text not null check (proprietaire_type in ('club', 'educateur')),
  -- 2, 3 ou 4 évaluations par saison ; vide = à la demande
  nb_evaluations_saison         smallint check (nb_evaluations_saison in (2, 3, 4)),
  -- Club seulement : les éducateurs affiliés peuvent créer ou compléter un modèle
  educateurs_peuvent_completer  boolean not null default false,
  -- Valeurs proposées à la création d'une évaluation ou d'un test
  visible_joueur_defaut         boolean not null default false,
  prefill_joueur_defaut         boolean not null default false,
  tests_visibles_joueur_defaut  boolean not null default false,
  tests_prefill_joueur_defaut   boolean not null default false,
  -- Passation au nouvel éducateur du club (bloc 2 et 9)
  transmettre_evaluations       boolean not null default true,
  transmettre_tests             boolean not null default true,
  transmettre_notes             boolean not null default true,
  -- Conservation après le départ du joueur, en saisons (bloc 11)
  conservation_saisons          smallint not null default 2 check (conservation_saisons between 0 and 10),
  updated_by                    uuid references public.profiles(id) on delete set null,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

comment on table public.parametres_evaluation is
  'Réglages des fiches d''évaluation d''un club (Projet sportif) ou d''un éducateur indépendant. transmettre_notes ne concerne que les notes marquées transmissibles.';

-- ----------------------------------------------------------------------------
-- 2c. Modèles de fiche
--     Modèle du club      : club_id rempli, educateur_id vide.
--     Modèle d'éducateur  : educateur_id rempli ; club_id rempli s'il est fait
--                           dans un club (affilié), vide s'il est indépendant.
-- ----------------------------------------------------------------------------
create table public.modeles_evaluation (
  id              uuid primary key default gen_random_uuid(),
  club_id         uuid references public.profiles(id) on delete cascade,
  educateur_id    uuid references public.profiles(id) on delete cascade,
  -- Modèle du club que l'éducateur complète (critères obligatoires gardés : bloc 5)
  modele_base_id  uuid references public.modeles_evaluation(id) on delete set null,
  -- Catégorie visée (U7 ... SENIORS, U13F...) ; vide = toutes catégories
  categorie_cle   text check (categorie_cle ~ '^[A-Z0-9]{2,12}$'),
  nom             text not null check (length(btrim(nom)) between 1 and 120),
  description     text not null default '' check (length(description) <= 1000),
  archive         boolean not null default false,
  auteur_id       uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (club_id is not null or educateur_id is not null)
);

comment on table public.modeles_evaluation is
  'Modèles de fiche d''évaluation (club ou éducateur). Le contenu est dans modeles_evaluation_versions et criteres_evaluation.';

create index modeles_evaluation_club_idx on public.modeles_evaluation (club_id, categorie_cle);
create index modeles_evaluation_educateur_idx on public.modeles_evaluation (educateur_id);
create index modeles_evaluation_base_idx on public.modeles_evaluation (modele_base_id);

-- ----------------------------------------------------------------------------
-- 2d. Versions d'un modèle (numéro posé par la base ; une seule version en
--     brouillon à la fois ; publiee_le rempli = figée pour toujours)
-- ----------------------------------------------------------------------------
create table public.modeles_evaluation_versions (
  id          uuid primary key default gen_random_uuid(),
  modele_id   uuid not null references public.modeles_evaluation(id) on delete cascade,
  numero      integer not null check (numero >= 1),
  publiee_le  timestamptz,
  auteur_id   uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (modele_id, numero)
);

create unique index modeles_evaluation_versions_un_brouillon
  on public.modeles_evaluation_versions (modele_id) where publiee_le is null;

comment on table public.modeles_evaluation_versions is
  'Versions numérotées d''un modèle. Une version publiée ne peut plus être modifiée.';

-- ----------------------------------------------------------------------------
-- 2e. Critères d'une version
-- ----------------------------------------------------------------------------
create table public.criteres_evaluation (
  id                       uuid primary key default gen_random_uuid(),
  version_id               uuid not null references public.modeles_evaluation_versions(id) on delete cascade,
  -- Critère de la bibliothèque Digital Football d'où il vient (vide = créé par le club ou l'éducateur)
  bibliotheque_critere_id  uuid references public.bibliotheque_criteres(id) on delete set null,
  -- Critère d'origine : version précédente ou modèle du club complété
  -- (sert à suivre l'évolution d'une version à l'autre et les critères obligatoires)
  critere_origine_id       uuid references public.criteres_evaluation(id) on delete set null,
  type                     text not null check (type in ('note', 'test', 'oui_non', 'commentaire')),
  -- Tactique, Technique, Physique, Mental, ou un pilier ajouté par le club
  pilier                   text not null check (length(btrim(pilier)) between 1 and 40),
  poste                    text check (poste in ('gardien', 'defenseur', 'milieu', 'attaquant')),
  libelle                  text not null check (length(btrim(libelle)) between 1 and 150),
  acquis_quand             text not null default '' check (length(acquis_quand) <= 300),
  unite                    text check (length(unite) <= 20),
  sens                     text check (sens in ('plus_haut', 'plus_bas')),
  objectif                 numeric,
  obligatoire              boolean not null default false,
  ordre                    integer not null default 0,
  created_at               timestamptz not null default now(),
  check (type = 'test' or (unite is null and sens is null and objectif is null)),
  check (type <> 'test' or sens is not null)
);

create index criteres_evaluation_version_idx on public.criteres_evaluation (version_id, pilier, ordre);
create index criteres_evaluation_biblio_idx on public.criteres_evaluation (bibliotheque_critere_id);
create index criteres_evaluation_origine_idx on public.criteres_evaluation (critere_origine_id);

comment on table public.criteres_evaluation is
  'Critères d''une version de modèle : note 1 à 3, test chiffré, oui / non ou commentaire.';

-- ----------------------------------------------------------------------------
-- 3a. Droit « Modèles d'évaluation » du club (staff)
--     p_edition = false : lecture ; true (ou vide) : écriture.
--     Ordre : compte du club > président > réglage du rôle s'il existe >
--     valeurs par défaut. Écrire suppose aussi de voir.
-- ----------------------------------------------------------------------------
create or replace function public.a_permission_modeles_evaluation(p_club_id uuid, p_edition boolean)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select auth.uid() is not null
    and p_club_id is not null
    and (
      (
        p_club_id = auth.uid()
        and exists (select 1 from public.profiles pr where pr.id = p_club_id and pr.plan = 'club')
      )
      or exists (
        select 1 from public.staff_club sc
        where sc.club_id = p_club_id
          and sc.user_id = auth.uid()
          and sc.role is not null
          and (
            sc.role = 'president'
            or exists (
              select 1 from public.role_permissions rp
              where rp.club_id = p_club_id
                and rp.role = sc.role
                and rp.section = 'evaluations_modeles'
                and coalesce(rp.can_view, false)
                and (not coalesce(p_edition, true) or coalesce(rp.can_edit, false))
            )
            or (
              not exists (
                select 1 from public.role_permissions rp2
                where rp2.club_id = p_club_id
                  and rp2.role = sc.role
                  and rp2.section = 'evaluations_modeles'
              )
              and (
                case when coalesce(p_edition, true)
                  then sc.role = 'directeur_sportif'
                  else sc.role = any (array[
                    'directeur_sportif', 'responsable_formation', 'responsable_ecole_foot',
                    'responsable_preformation', 'entraineur', 'educateur', 'preparateur_physique'
                  ]::text[])
                end
              )
            )
          )
      )
    )
$$;

-- ----------------------------------------------------------------------------
-- 3b. L'éducateur connecté peut-il créer ou modifier SON modèle ?
--     p_club_id rempli : accepté dans ce club ET le club l'autorise.
--     p_club_id vide   : indépendant (accepté dans aucun club).
-- ----------------------------------------------------------------------------
create or replace function public.secu_educateur_peut_modele_evaluation(p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select auth.uid() is not null
    and exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.plan = 'educateur')
    and (
      (
        p_club_id is null
        and not exists (
          select 1 from public.club_educateurs ce
          where ce.educateur_id = auth.uid() and ce.statut = 'accepte'
        )
      )
      or (
        p_club_id is not null
        and public.secu_educateur_accepte_club(p_club_id)
        and exists (
          select 1 from public.parametres_evaluation pe
          where pe.proprietaire_id = p_club_id
            and pe.proprietaire_type = 'club'
            and pe.educateurs_peuvent_completer
        )
      )
    )
$$;

-- ----------------------------------------------------------------------------
-- 3c. Lecture et écriture d'un modèle, à partir de ses deux colonnes
-- ----------------------------------------------------------------------------
create or replace function public.secu_modele_evaluation_lecture(p_club_id uuid, p_educateur_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select auth.uid() is not null
    and (
      (p_educateur_id is not null and p_educateur_id = auth.uid())
      or (p_club_id is not null and public.a_permission_modeles_evaluation(p_club_id, false))
      or (
        p_educateur_id is null
        and p_club_id is not null
        and public.secu_educateur_accepte_club(p_club_id)
      )
    )
$$;

create or replace function public.secu_modele_evaluation_edition(p_club_id uuid, p_educateur_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select auth.uid() is not null
    and (
      (
        p_educateur_id is null
        and public.a_permission_modeles_evaluation(p_club_id, true)
      )
      or (
        p_educateur_id is not null
        and p_educateur_id = auth.uid()
        and public.secu_educateur_peut_modele_evaluation(p_club_id)
      )
    )
$$;

-- 3d. Même chose à partir d'un modèle ou d'une version (pour les tables filles).
--     Écrire dans une version suppose qu'elle soit encore en brouillon.
create or replace function public.secu_modele_evaluation_acces(p_modele_id uuid, p_edition boolean)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.modeles_evaluation m
    where m.id = p_modele_id
      and case when coalesce(p_edition, true)
        then public.secu_modele_evaluation_edition(m.club_id, m.educateur_id)
        else public.secu_modele_evaluation_lecture(m.club_id, m.educateur_id)
      end
  )
$$;

create or replace function public.secu_version_evaluation_acces(p_version_id uuid, p_edition boolean)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.modeles_evaluation_versions v
    where v.id = p_version_id
      and (not coalesce(p_edition, true) or v.publiee_le is null)
      and public.secu_modele_evaluation_acces(v.modele_id, p_edition)
  )
$$;

-- ----------------------------------------------------------------------------
-- 4a. Modèles : auteur et dates posés par la base, propriétaire figé,
--     modèle de base forcément un modèle du même club.
--     Sans compte connecté (éditeur SQL, serveur) : valeurs fournies gardées.
-- ----------------------------------------------------------------------------
create or replace function public.modeles_evaluation_avant_ecriture()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.club_id is not null and not exists (
      select 1 from public.profiles pr where pr.id = new.club_id and pr.plan = 'club'
    ) then
      raise exception 'club_id doit désigner un compte club';
    end if;
    if new.educateur_id is not null and not exists (
      select 1 from public.profiles pr where pr.id = new.educateur_id and pr.plan = 'educateur'
    ) then
      raise exception 'educateur_id doit désigner un compte éducateur';
    end if;
    if auth.uid() is not null then
      new.auteur_id := auth.uid();
    end if;
    new.created_at := now();
  else
    new.club_id      := old.club_id;
    new.educateur_id := old.educateur_id;
    new.created_at   := old.created_at;
    new.auteur_id    := case when new.auteur_id is null then null else old.auteur_id end;
  end if;

  if new.modele_base_id is not null
     and (tg_op = 'INSERT' or new.modele_base_id is distinct from old.modele_base_id) then
    if new.educateur_id is null or new.club_id is null or not exists (
      select 1 from public.modeles_evaluation b
      where b.id = new.modele_base_id
        and b.educateur_id is null
        and b.club_id = new.club_id
    ) then
      raise exception 'le modèle de base doit être un modèle du même club, complété par un éducateur';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger modeles_evaluation_avant_ecriture
  before insert or update on public.modeles_evaluation
  for each row execute function public.modeles_evaluation_avant_ecriture();

-- ----------------------------------------------------------------------------
-- 4b. Versions : numéro suivant posé par la base, créée en brouillon,
--     publication datée par la base, version publiée figée.
-- ----------------------------------------------------------------------------
create or replace function public.modeles_evaluation_versions_avant_ecriture()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if tg_op = 'INSERT' then
    -- Verrou sur le modèle : deux créations simultanées n'obtiennent pas le même numéro
    perform 1 from public.modeles_evaluation m where m.id = new.modele_id for update;
    select coalesce(max(v.numero), 0) + 1 into new.numero
      from public.modeles_evaluation_versions v
     where v.modele_id = new.modele_id;
    new.publiee_le := null;
    new.created_at := now();
    if auth.uid() is not null then
      new.auteur_id := auth.uid();
    end if;
    return new;
  end if;

  -- Modification
  if old.publiee_le is not null then
    -- Seul changement accepté : l'auteur passe à vide (compte supprimé)
    if new.auteur_id is null
       and (new.modele_id, new.numero, new.publiee_le, new.created_at)
           is not distinct from (old.modele_id, old.numero, old.publiee_le, old.created_at) then
      return new;
    end if;
    raise exception 'version publiée : elle ne peut plus être modifiée, créer une nouvelle version';
  end if;

  new.modele_id  := old.modele_id;
  new.numero     := old.numero;
  new.created_at := old.created_at;
  new.auteur_id  := case when new.auteur_id is null then null else old.auteur_id end;

  if new.publiee_le is not null then
    if not exists (select 1 from public.criteres_evaluation c where c.version_id = new.id) then
      raise exception 'impossible de publier une version sans critère';
    end if;
    new.publiee_le := now();
  end if;
  return new;
end;
$$;

create trigger modeles_evaluation_versions_avant_ecriture
  before insert or update on public.modeles_evaluation_versions
  for each row execute function public.modeles_evaluation_versions_avant_ecriture();

-- ----------------------------------------------------------------------------
-- 4c. Critères : un critère ne change pas de version
-- ----------------------------------------------------------------------------
create or replace function public.criteres_evaluation_avant_ecriture()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    new.version_id := old.version_id;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create trigger criteres_evaluation_avant_ecriture
  before insert or update on public.criteres_evaluation
  for each row execute function public.criteres_evaluation_avant_ecriture();

-- ----------------------------------------------------------------------------
-- 4d. Réglages : le type doit correspondre au compte, propriétaire figé
-- ----------------------------------------------------------------------------
create or replace function public.parametres_evaluation_avant_ecriture()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if tg_op = 'INSERT' then
    if not exists (
      select 1 from public.profiles pr
      where pr.id = new.proprietaire_id and pr.plan = new.proprietaire_type
    ) then
      raise exception 'proprietaire_type ne correspond pas au compte';
    end if;
    new.created_at := now();
  else
    new.proprietaire_id   := old.proprietaire_id;
    new.proprietaire_type := old.proprietaire_type;
    new.created_at        := old.created_at;
  end if;
  if new.proprietaire_type = 'educateur' then
    new.educateurs_peuvent_completer := false;
  end if;
  if auth.uid() is not null then
    new.updated_by := auth.uid();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger parametres_evaluation_avant_ecriture
  before insert or update on public.parametres_evaluation
  for each row execute function public.parametres_evaluation_avant_ecriture();

-- ----------------------------------------------------------------------------
-- Droits sur les fonctions
-- ----------------------------------------------------------------------------
revoke all on function public.a_permission_modeles_evaluation(uuid, boolean) from public, anon;
revoke all on function public.secu_educateur_peut_modele_evaluation(uuid) from public, anon;
revoke all on function public.secu_modele_evaluation_lecture(uuid, uuid) from public, anon;
revoke all on function public.secu_modele_evaluation_edition(uuid, uuid) from public, anon;
revoke all on function public.secu_modele_evaluation_acces(uuid, boolean) from public, anon;
revoke all on function public.secu_version_evaluation_acces(uuid, boolean) from public, anon;
grant execute on function public.a_permission_modeles_evaluation(uuid, boolean) to authenticated;
grant execute on function public.secu_educateur_peut_modele_evaluation(uuid) to authenticated;
grant execute on function public.secu_modele_evaluation_lecture(uuid, uuid) to authenticated;
grant execute on function public.secu_modele_evaluation_edition(uuid, uuid) to authenticated;
grant execute on function public.secu_modele_evaluation_acces(uuid, boolean) to authenticated;
grant execute on function public.secu_version_evaluation_acces(uuid, boolean) to authenticated;

revoke all on function public.modeles_evaluation_avant_ecriture() from public, anon, authenticated;
revoke all on function public.modeles_evaluation_versions_avant_ecriture() from public, anon, authenticated;
revoke all on function public.criteres_evaluation_avant_ecriture() from public, anon, authenticated;
revoke all on function public.parametres_evaluation_avant_ecriture() from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5. Règles (RLS) et droits d'accès
-- ----------------------------------------------------------------------------
alter table public.bibliotheque_criteres enable row level security;
alter table public.parametres_evaluation enable row level security;
alter table public.modeles_evaluation enable row level security;
alter table public.modeles_evaluation_versions enable row level security;
alter table public.criteres_evaluation enable row level security;

-- Bibliothèque : lecture seule pour les comptes connectés
create policy bc_lecture on public.bibliotheque_criteres
  for select to authenticated
  using (true);

-- Réglages
create policy pe_lecture on public.parametres_evaluation
  for select to authenticated
  using (
    (proprietaire_type = 'club' and (
      public.a_permission_modeles_evaluation(proprietaire_id, false)
      or public.secu_educateur_accepte_club(proprietaire_id)
    ))
    or (proprietaire_type = 'educateur' and proprietaire_id = auth.uid())
  );

create policy pe_ajout on public.parametres_evaluation
  for insert to authenticated
  with check (
    (proprietaire_type = 'club' and public.a_permission_modeles_evaluation(proprietaire_id, true))
    or (proprietaire_type = 'educateur' and proprietaire_id = auth.uid())
  );

create policy pe_modification on public.parametres_evaluation
  for update to authenticated
  using (
    (proprietaire_type = 'club' and public.a_permission_modeles_evaluation(proprietaire_id, true))
    or (proprietaire_type = 'educateur' and proprietaire_id = auth.uid())
  )
  with check (
    (proprietaire_type = 'club' and public.a_permission_modeles_evaluation(proprietaire_id, true))
    or (proprietaire_type = 'educateur' and proprietaire_id = auth.uid())
  );

-- Modèles
create policy me_lecture on public.modeles_evaluation
  for select to authenticated
  using (public.secu_modele_evaluation_lecture(club_id, educateur_id));

create policy me_ajout on public.modeles_evaluation
  for insert to authenticated
  with check (public.secu_modele_evaluation_edition(club_id, educateur_id));

create policy me_modification on public.modeles_evaluation
  for update to authenticated
  using (public.secu_modele_evaluation_edition(club_id, educateur_id))
  with check (public.secu_modele_evaluation_edition(club_id, educateur_id));

-- L'éducateur peut toujours supprimer SON modèle (un modèle déjà utilisé par
-- une évaluation restera protégé par la base au bloc 2).
create policy me_suppression on public.modeles_evaluation
  for delete to authenticated
  using (
    public.secu_modele_evaluation_edition(club_id, educateur_id)
    or (educateur_id is not null and educateur_id = auth.uid())
  );

-- Versions
create policy mev_lecture on public.modeles_evaluation_versions
  for select to authenticated
  using (public.secu_modele_evaluation_acces(modele_id, false));

create policy mev_ajout on public.modeles_evaluation_versions
  for insert to authenticated
  with check (public.secu_modele_evaluation_acces(modele_id, true));

create policy mev_modification on public.modeles_evaluation_versions
  for update to authenticated
  using (publiee_le is null and public.secu_modele_evaluation_acces(modele_id, true))
  with check (public.secu_modele_evaluation_acces(modele_id, true));

create policy mev_suppression on public.modeles_evaluation_versions
  for delete to authenticated
  using (public.secu_modele_evaluation_acces(modele_id, true));

-- Critères : écriture seulement dans une version en brouillon
create policy ce_lecture on public.criteres_evaluation
  for select to authenticated
  using (public.secu_version_evaluation_acces(version_id, false));

create policy ce_ajout on public.criteres_evaluation
  for insert to authenticated
  with check (public.secu_version_evaluation_acces(version_id, true));

create policy ce_modification on public.criteres_evaluation
  for update to authenticated
  using (public.secu_version_evaluation_acces(version_id, true))
  with check (public.secu_version_evaluation_acces(version_id, true));

create policy ce_suppression on public.criteres_evaluation
  for delete to authenticated
  using (public.secu_version_evaluation_acces(version_id, true));

-- Droits de table : rien pour les visiteurs
revoke all on table public.bibliotheque_criteres from public, anon, authenticated;
revoke all on table public.parametres_evaluation from public, anon, authenticated;
revoke all on table public.modeles_evaluation from public, anon, authenticated;
revoke all on table public.modeles_evaluation_versions from public, anon, authenticated;
revoke all on table public.criteres_evaluation from public, anon, authenticated;

grant select on table public.bibliotheque_criteres to authenticated;
grant select, insert, update on table public.parametres_evaluation to authenticated;
grant select, insert, update, delete on table public.modeles_evaluation to authenticated;
grant select, insert, update, delete on table public.modeles_evaluation_versions to authenticated;
grant select, insert, update, delete on table public.criteres_evaluation to authenticated;

grant all on table public.bibliotheque_criteres to service_role;
grant all on table public.parametres_evaluation to service_role;
grant all on table public.modeles_evaluation to service_role;
grant all on table public.modeles_evaluation_versions to service_role;
grant all on table public.criteres_evaluation to service_role;

commit;

-- ============================================================================
-- Fiches d'évaluation, bloc 11a (PLAN-fiches-evaluation.md) : 2026-11-19
-- ----------------------------------------------------------------------------
-- RGPD côté base. S'appuie sur les blocs 1 et 2 (déjà en prod).
-- Aucune table ni règle existante avant le chantier n'est modifiée.
--
-- Contenu :
--   1. Journal des accès : trois nouveaux motifs (suppression des données,
--      suppression automatique, prolongation).
--   2. Conservation : présence au club + N saisons (réglage du club, 2 par
--      défaut), préavis de 30 jours visible par le club, prolongation d'une
--      saison, puis suppression automatique la nuit (pg_cron, 3 h 30).
--   3. Suppression des données d'un joueur par le club (compte du club ou
--      président), inscrite au journal.
--   4. Demandes de correction (joueur ou parent), délai d'un mois, réponse
--      par l'éducateur ou le club. Personne ne peut les modifier ni les effacer
--      directement : elles servent de preuve.
--   5. Conditions d'utilisation des fiches : versions, acceptations, et blocage
--      de la publication d'une fiche ou de la création d'une évaluation sans
--      acceptation. INTERRUPTEUR ÉTEINT : aucune version n'est en vigueur tant
--      que le juriste n'a pas validé le texte, donc rien n'est bloqué.
--
-- Avant d'exécuter : sauvegarde ~/Sauvegardes-DigitalFootball/sauvegarder.sh.
-- Tout est dans une seule transaction : en cas d'erreur, rien n'est appliqué.
-- ============================================================================

begin;

-- Garde-fou : pg_cron doit déjà être installé (tâche rappel-fin-forfait-club).
do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'cron') then
    raise exception 'pg_cron n''est pas installé sur cette base : rien n''a été changé. Envoie ce message à Claude.';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 1. Journal : nouveaux motifs
-- ----------------------------------------------------------------------------
alter table public.journal_acces_evaluations drop constraint journal_acces_evaluations_objet_check;
alter table public.journal_acces_evaluations add constraint journal_acces_evaluations_objet_check
  check (objet in ('evaluations', 'tests', 'notes', 'historique', 'suppression_note',
                   'suppression_donnees', 'suppression_auto', 'prolongation'));

-- ----------------------------------------------------------------------------
-- 2a. Suivi de conservation : une ligne par évaluation ou note dont le joueur
--     n'est plus au club. Écrit seulement par la base (tâche de nuit et
--     fonctions ci-dessous). Lu par le club (préavis) ou l'éducateur
--     indépendant pour ses propres joueurs.
-- ----------------------------------------------------------------------------
create table public.conservation_evaluations (
  id                     uuid primary key default gen_random_uuid(),
  evaluation_id          uuid unique references public.evaluations(id) on delete cascade,
  note_id                uuid unique references public.notes_suivi(id) on delete cascade,
  club_id                uuid references public.profiles(id) on delete cascade,
  educateur_id           uuid references public.profiles(id) on delete set null,
  -- Photo du joueur au moment du départ (sert à regrouper et à afficher)
  equipe_joueur_id       uuid,
  joueur_id              uuid,
  joueur_nom             text not null default '' check (length(joueur_nom) <= 120),
  depart_constate_le     date not null,
  prolongations          smallint not null default 0 check (prolongations between 0 and 10),
  suppression_prevue_le  date not null,
  -- Premier jour où la suppression est à moins de 30 jours (préavis affiché)
  annonce_le             date,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  check (num_nonnulls(evaluation_id, note_id) = 1)
);

create index conservation_evaluations_club_idx on public.conservation_evaluations (club_id, suppression_prevue_le);
create index conservation_evaluations_educateur_idx on public.conservation_evaluations (educateur_id);

comment on table public.conservation_evaluations is
  'Évaluations et notes d''un joueur parti du club : date de suppression prévue (départ + N saisons du réglage + prolongations), préavis de 30 jours. Écrit seulement par la base.';

-- ----------------------------------------------------------------------------
-- 2b. Date de suppression : 1er juillet après la saison du départ + N saisons.
--     Départ en novembre 2026 (saison 2026-2027), N = 2 : 1er juillet 2029.
--     N = 0 : 1er juillet 2027 (fin de la saison du départ).
-- ----------------------------------------------------------------------------
create or replace function public.conservation_date_suppression(p_depart date, p_saisons integer)
returns date
language sql
immutable
set search_path to ''
as $$
  select make_date(
    extract(year from p_depart)::int
      + case when extract(month from p_depart) >= 7 then 1 else 0 end
      + greatest(coalesce(p_saisons, 2), 0),
    7, 1)
$$;

-- ----------------------------------------------------------------------------
-- 2c. Le joueur est-il encore au club (ou chez l'éducateur indépendant) ?
--     Club : la même ligne d'effectif existe encore dans une équipe du club
--     (ou chez un éducateur accepté du club, équipe sans catégorie), ou son
--     compte est affilié et accepté sur une autre ligne du club.
--     Indépendant : la ligne existe encore, ou le compte est affilié et accepté
--     sur une autre ligne du même éducateur.
-- ----------------------------------------------------------------------------
create or replace function public.evaluation_joueur_present(
  p_club_id uuid, p_educateur_id uuid, p_equipe_joueur_id uuid, p_joueur_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select case
    when p_club_id is not null then exists (
      select 1
        from public.equipe_joueurs ej
        left join public.categories c on c.id = ej.categorie_id
        left join public.club_categories cc on cc.id = ej.club_categorie_id
       where (
               ej.id = p_equipe_joueur_id
               or (p_joueur_id is not null and exists (
                 select 1 from public.affiliations a
                  where a.equipe_joueur_id = ej.id and a.joueur_id = p_joueur_id and a.statut = 'accepte'))
             )
         and (
               coalesce(c.club_id, cc.club_id) = p_club_id
               or (coalesce(c.club_id, cc.club_id) is null and exists (
                 select 1 from public.club_educateurs ce
                  where ce.club_id = p_club_id and ce.educateur_id = ej.educateur_id and ce.statut = 'accepte'))
             )
    )
    else exists (
      select 1
        from public.equipe_joueurs ej
       where ej.id = p_equipe_joueur_id
          or (p_joueur_id is not null and p_educateur_id is not null
              and ej.educateur_id = p_educateur_id
              and exists (
                select 1 from public.affiliations a
                 where a.equipe_joueur_id = ej.id and a.joueur_id = p_joueur_id and a.statut = 'accepte'))
    )
  end
$$;

-- ----------------------------------------------------------------------------
-- 2d. Tâche de nuit.
--   a. joueur revenu : son suivi est effacé (rien ne sera supprimé)
--   b. joueur parti : suivi créé, départ = aujourd'hui
--   c. date de suppression recalculée (réglage actuel + prolongations)
--   d. préavis : posé à 30 jours de la date, retiré si la date s'éloigne
--   e. suppression : date atteinte ET préavis affiché depuis 30 jours au moins.
--      Évaluations (et leurs résultats), notes, demandes de correction liées,
--      lignes du journal qui concernent ces joueurs. Une ligne
--      « suppression_auto » par joueur reste au journal du club.
--      Garde-fou : plus de 500 lignes à supprimer en une nuit = rien n'est
--      supprimé (avertissement dans l'historique de pg_cron).
--   f. journal et demandes de plus de 3 ans : supprimés.
-- ----------------------------------------------------------------------------
create or replace function public.conservation_evaluations_nuit()
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_limite constant integer := 500;
  v_retours integer := 0;
  v_departs integer := 0;
  v_n integer;
  v_evals uuid[];
  v_notes uuid[];
  v_joueurs integer := 0;
  v_suppr_evals integer := 0;
  v_suppr_notes integer := 0;
  v_bloque boolean := false;
  v_vieux_journal integer := 0;
  v_vieilles_demandes integer := 0;
begin
  -- a. Retours
  delete from public.conservation_evaluations ce
   using public.evaluations e
   where ce.evaluation_id = e.id
     and public.evaluation_joueur_present(e.club_id, e.educateur_id, e.equipe_joueur_id, e.joueur_id);
  get diagnostics v_n = row_count; v_retours := v_n;
  delete from public.conservation_evaluations ce
   using public.notes_suivi n
   where ce.note_id = n.id
     and public.evaluation_joueur_present(n.club_id, n.educateur_id, n.equipe_joueur_id, n.joueur_id);
  get diagnostics v_n = row_count; v_retours := v_retours + v_n;

  -- b. Départs
  insert into public.conservation_evaluations
         (evaluation_id, club_id, educateur_id, equipe_joueur_id, joueur_id, joueur_nom, depart_constate_le, suppression_prevue_le)
  select e.id, e.club_id, e.educateur_id, e.equipe_joueur_id, e.joueur_id, e.joueur_nom, current_date, current_date
    from public.evaluations e
   where not exists (select 1 from public.conservation_evaluations ce where ce.evaluation_id = e.id)
     and not public.evaluation_joueur_present(e.club_id, e.educateur_id, e.equipe_joueur_id, e.joueur_id);
  get diagnostics v_n = row_count; v_departs := v_n;
  insert into public.conservation_evaluations
         (note_id, club_id, educateur_id, equipe_joueur_id, joueur_id, joueur_nom, depart_constate_le, suppression_prevue_le)
  select n.id, n.club_id, n.educateur_id, n.equipe_joueur_id, n.joueur_id, n.joueur_nom, current_date, current_date
    from public.notes_suivi n
   where not exists (select 1 from public.conservation_evaluations ce where ce.note_id = n.id)
     and not public.evaluation_joueur_present(n.club_id, n.educateur_id, n.equipe_joueur_id, n.joueur_id);
  get diagnostics v_n = row_count; v_departs := v_departs + v_n;

  -- c. Date de suppression (réglage du club, ou de l'éducateur indépendant)
  update public.conservation_evaluations ce
     set suppression_prevue_le = x.d, updated_at = now()
    from (
      select c2.id,
             public.conservation_date_suppression(
               c2.depart_constate_le,
               coalesce((select pe.conservation_saisons from public.parametres_evaluation pe
                          where pe.proprietaire_id = coalesce(c2.club_id, c2.educateur_id)), 2)
               + c2.prolongations) as d
        from public.conservation_evaluations c2
    ) x
   where x.id = ce.id and ce.suppression_prevue_le is distinct from x.d;

  -- d. Préavis
  update public.conservation_evaluations
     set annonce_le = null, updated_at = now()
   where annonce_le is not null and suppression_prevue_le > current_date + 30;
  update public.conservation_evaluations
     set annonce_le = current_date, updated_at = now()
   where annonce_le is null and suppression_prevue_le <= current_date + 30;

  -- e. Suppression
  select array_agg(evaluation_id) filter (where evaluation_id is not null),
         array_agg(note_id) filter (where note_id is not null)
    into v_evals, v_notes
    from public.conservation_evaluations
   where suppression_prevue_le <= current_date
     and annonce_le <= current_date - 30;

  if coalesce(cardinality(v_evals), 0) + coalesce(cardinality(v_notes), 0) > v_limite then
    v_bloque := true;
    raise warning 'conservation des évaluations : % lignes à supprimer, au-delà du garde-fou (%) ; rien n''a été supprimé',
      coalesce(cardinality(v_evals), 0) + coalesce(cardinality(v_notes), 0), v_limite;
  elsif coalesce(cardinality(v_evals), 0) + coalesce(cardinality(v_notes), 0) > 0 then
    -- Journal : lectures concernant ces joueurs, puis une ligne par joueur
    delete from public.journal_acces_evaluations j
     where j.objet in ('evaluations', 'tests', 'notes', 'historique', 'suppression_note')
       and exists (
         select 1 from public.conservation_evaluations ce
          where (ce.evaluation_id = any (coalesce(v_evals, '{}')) or ce.note_id = any (coalesce(v_notes, '{}')))
            and ce.club_id = j.club_id
            and ce.equipe_joueur_id = j.equipe_joueur_id);

    insert into public.journal_acces_evaluations (club_id, lecteur_id, equipe_joueur_id, joueur_nom, objet)
    select g.club_id, null,
           (select ej.id from public.equipe_joueurs ej where ej.id = g.equipe_joueur_id),
           g.joueur_nom, 'suppression_auto'
      from (
        select distinct on (ce.club_id, coalesce(ce.joueur_id, ce.equipe_joueur_id), ce.joueur_nom)
               ce.club_id, ce.equipe_joueur_id, ce.joueur_nom
          from public.conservation_evaluations ce
         where (ce.evaluation_id = any (coalesce(v_evals, '{}')) or ce.note_id = any (coalesce(v_notes, '{}')))
           and ce.club_id is not null
      ) g;
    get diagnostics v_n = row_count; v_joueurs := v_n;

    delete from public.demandes_correction_evaluation d
     where d.evaluation_id = any (coalesce(v_evals, '{}'));

    delete from public.notes_suivi where id = any (coalesce(v_notes, '{}'));
    get diagnostics v_n = row_count; v_suppr_notes := v_n;
    delete from public.evaluations where id = any (coalesce(v_evals, '{}'));
    get diagnostics v_n = row_count; v_suppr_evals := v_n;
  end if;

  -- f. Plus de 3 ans
  delete from public.journal_acces_evaluations where created_at < now() - interval '3 years';
  get diagnostics v_n = row_count; v_vieux_journal := v_n;
  delete from public.demandes_correction_evaluation where created_at < now() - interval '3 years';
  get diagnostics v_n = row_count; v_vieilles_demandes := v_n;

  return jsonb_build_object(
    'retours', v_retours, 'departs', v_departs,
    'evaluations_supprimees', v_suppr_evals, 'notes_supprimees', v_suppr_notes,
    'joueurs_au_journal', v_joueurs, 'garde_fou_declenche', v_bloque,
    'journal_ancien_supprime', v_vieux_journal, 'demandes_anciennes_supprimees', v_vieilles_demandes);
end;
$$;

-- ----------------------------------------------------------------------------
-- 2e. Prolonger d'une saison (pendant le préavis seulement).
--     Club : ceux qui gèrent les réglages des fiches (compte du club,
--     président, directeur sportif par défaut). Indépendant : lui-même.
--     Reçoit les identifiants des lignes de suivi affichées pour un joueur.
-- ----------------------------------------------------------------------------
create or replace function public.prolonger_conservation_evaluations(p_ids uuid[])
returns integer
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := auth.uid();
  v_n integer;
begin
  if v_uid is null then
    raise exception 'connexion requise';
  end if;

  with maj as (
    update public.conservation_evaluations ce
       set prolongations = ce.prolongations + 1,
           annonce_le = null,
           suppression_prevue_le = public.conservation_date_suppression(
             ce.depart_constate_le,
             coalesce((select pe.conservation_saisons from public.parametres_evaluation pe
                        where pe.proprietaire_id = coalesce(ce.club_id, ce.educateur_id)), 2)
             + ce.prolongations + 1),
           updated_at = now()
     where ce.id = any (coalesce(p_ids, '{}'))
       and ce.annonce_le is not null
       and ce.prolongations < 10
       and (
             (ce.club_id is not null and public.a_permission_modeles_evaluation(ce.club_id, true))
             or (ce.club_id is null and ce.educateur_id = v_uid)
           )
    returning ce.id, ce.club_id, ce.equipe_joueur_id, ce.joueur_id, ce.joueur_nom
  ),
  journal as (
    insert into public.journal_acces_evaluations (club_id, lecteur_id, equipe_joueur_id, joueur_nom, objet)
    select g.club_id, v_uid,
           (select ej.id from public.equipe_joueurs ej where ej.id = g.equipe_joueur_id),
           g.joueur_nom, 'prolongation'
      from (
        select distinct on (p.club_id, coalesce(p.joueur_id, p.equipe_joueur_id), p.joueur_nom)
               p.club_id, p.equipe_joueur_id, p.joueur_nom
          from maj p
         where p.club_id is not null
      ) g
    returning 1
  )
  select count(*) into v_n from maj;

  return v_n;
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. Supprimer les données d'évaluation d'un joueur (droit à l'effacement).
--    Club : compte du club ou président. Indépendant (p_club_id vide) : ses
--    propres données seulement.
--    Joueur désigné par sa ligne d'effectif, son compte, et / ou les lignes de
--    suivi de conservation affichées (joueur parti dont la ligne n'existe plus).
--    Supprime : évaluations et tests (avec résultats et auto-évaluations),
--    notes de suivi, anciennes fiches (lignes d'effectif du club), demandes de
--    correction, lignes du journal qui le concernent. Inscrit
--    « suppression_donnees » au journal du club.
-- ----------------------------------------------------------------------------
create or replace function public.supprimer_donnees_evaluation_joueur(
  p_club_id uuid, p_equipe_joueur_id uuid default null, p_joueur_id uuid default null,
  p_conservation_ids uuid[] default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := auth.uid();
  v_lignes uuid[];
  v_evals uuid[];
  v_notes uuid[];
  v_anciennes uuid[];
  v_nom text;
  v_ligne_journal uuid;
  v_n_evals integer := 0;
  v_n_notes integer := 0;
  v_n_anciennes integer := 0;
  v_n integer;
begin
  if v_uid is null then
    raise exception 'connexion requise';
  end if;
  if p_equipe_joueur_id is null and p_joueur_id is null and coalesce(cardinality(p_conservation_ids), 0) = 0 then
    raise exception 'joueur à préciser';
  end if;
  if p_club_id is not null and not public.secu_club_ou_president(p_club_id) then
    raise exception 'accès refusé : réservé au compte du club et au président';
  end if;

  -- Lignes d'effectif du joueur, dans le club (ou chez l'indépendant)
  select array_agg(ej.id) into v_lignes
    from public.equipe_joueurs ej
    left join public.categories c on c.id = ej.categorie_id
    left join public.club_categories cc on cc.id = ej.club_categorie_id
   where (
           ej.id = p_equipe_joueur_id
           or (p_joueur_id is not null and exists (
             select 1 from public.affiliations a
              where a.equipe_joueur_id = ej.id and a.joueur_id = p_joueur_id and a.statut in ('accepte', 'archive')))
         )
     and case
           when p_club_id is not null then
             coalesce(c.club_id, cc.club_id) = p_club_id
             or (coalesce(c.club_id, cc.club_id) is null and exists (
               select 1 from public.club_educateurs ce
                where ce.club_id = p_club_id and ce.educateur_id = ej.educateur_id and ce.statut = 'accepte'))
           -- Indépendant : ses lignes hors club, et seulement s'il n'est dans
           -- aucun club (sinon ces lignes appartiennent à son club)
           else ej.educateur_id = v_uid
                and coalesce(c.club_id, cc.club_id) is null
                and not exists (select 1 from public.club_educateurs ce
                                 where ce.educateur_id = v_uid and ce.statut = 'accepte')
         end;
  v_lignes := coalesce(v_lignes, '{}');

  select array_agg(e.id), min(e.joueur_nom) into v_evals, v_nom
    from public.evaluations e
   where e.club_id is not distinct from p_club_id
     and (p_club_id is not null or e.educateur_id = v_uid)
     and (
           e.equipe_joueur_id = p_equipe_joueur_id
           or e.equipe_joueur_id = any (v_lignes)
           or (p_joueur_id is not null and e.joueur_id = p_joueur_id)
           or e.id in (select ce.evaluation_id from public.conservation_evaluations ce
                        where ce.id = any (coalesce(p_conservation_ids, '{}')))
         );

  select array_agg(n.id), coalesce(v_nom, min(n.joueur_nom)) into v_notes, v_nom
    from public.notes_suivi n
   where n.club_id is not distinct from p_club_id
     and (p_club_id is not null or n.educateur_id = v_uid)
     and (
           n.equipe_joueur_id = p_equipe_joueur_id
           or n.equipe_joueur_id = any (v_lignes)
           or (p_joueur_id is not null and n.joueur_id = p_joueur_id)
           or n.id in (select ce.note_id from public.conservation_evaluations ce
                        where ce.id = any (coalesce(p_conservation_ids, '{}')))
         );

  -- Anciennes fiches : lignes d'effectif du club, écrites par un éducateur du club
  select array_agg(f.id) into v_anciennes
    from public.evaluations_joueur f
   where f.equipe_joueur_id = any (v_lignes)
     and case
           when p_club_id is not null then exists (
             select 1 from public.club_educateurs ce
              where ce.club_id = p_club_id and ce.educateur_id = f.educateur_id and ce.statut = 'accepte')
           else f.educateur_id = v_uid
         end;

  if v_nom is null then
    select left(btrim(coalesce(ej.prenom, '') || ' ' || coalesce(ej.nom, '')), 120) into v_nom
      from public.equipe_joueurs ej where ej.id = any (v_lignes) limit 1;
  end if;

  delete from public.demandes_correction_evaluation d
   where d.evaluation_id = any (coalesce(v_evals, '{}'))
      or d.ancienne_fiche_id = any (coalesce(v_anciennes, '{}'));

  delete from public.notes_suivi where id = any (coalesce(v_notes, '{}'));
  get diagnostics v_n = row_count; v_n_notes := v_n;
  delete from public.evaluations where id = any (coalesce(v_evals, '{}'));
  get diagnostics v_n = row_count; v_n_evals := v_n;
  delete from public.evaluations_joueur where id = any (coalesce(v_anciennes, '{}'));
  get diagnostics v_n = row_count; v_n_anciennes := v_n;

  if p_club_id is not null then
    -- Lectures concernant ce joueur, et lignes « suppression_note » que la
    -- suppression des notes vient d'écrire (même transaction : même now())
    delete from public.journal_acces_evaluations j
     where j.club_id = p_club_id
       and (
             (j.objet in ('evaluations', 'tests', 'notes', 'historique', 'suppression_note')
              and (j.equipe_joueur_id = any (v_lignes) or j.equipe_joueur_id = p_equipe_joueur_id))
             or (j.objet = 'suppression_note' and j.lecteur_id = v_uid and j.created_at = now())
           );

    if v_n_evals + v_n_notes + v_n_anciennes > 0 then
      select ej.id into v_ligne_journal from public.equipe_joueurs ej
       where ej.id = coalesce(p_equipe_joueur_id, v_lignes[1]);
      insert into public.journal_acces_evaluations (club_id, lecteur_id, equipe_joueur_id, joueur_nom, objet)
      values (p_club_id, v_uid, v_ligne_journal, coalesce(v_nom, ''), 'suppression_donnees');
    end if;
  end if;

  return jsonb_build_object('evaluations', v_n_evals, 'notes', v_n_notes, 'anciennes_fiches', v_n_anciennes);
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. Demandes de correction (joueur ou parent)
--    Sur une évaluation terminée et visible, ou une ancienne fiche visible.
--    Le délai légal de réponse (un mois) est posé à la création.
--    Lues par : le demandeur, l'éducateur de l'évaluation (encore au club),
--    ceux qui gèrent les fiches au club (club, président, directeur sportif
--    par défaut). Réponse par la fonction repondre_demande_correction.
-- ----------------------------------------------------------------------------
create table public.demandes_correction_evaluation (
  id                 uuid primary key default gen_random_uuid(),
  evaluation_id      uuid references public.evaluations(id) on delete set null,
  ancienne_fiche_id  uuid references public.evaluations_joueur(id) on delete set null,
  club_id            uuid references public.profiles(id) on delete cascade,
  educateur_id       uuid references public.profiles(id) on delete set null,
  equipe_joueur_id   uuid references public.equipe_joueurs(id) on delete set null,
  joueur_id          uuid references public.profiles(id) on delete set null,
  joueur_nom         text not null default '' check (length(joueur_nom) <= 120),
  demandeur_id       uuid references public.profiles(id) on delete set null,
  demandeur_type     text not null check (demandeur_type in ('joueur', 'parent')),
  message            text not null check (length(btrim(message)) between 1 and 500),
  statut             text not null default 'recue' check (statut in ('recue', 'traitee', 'refusee')),
  reponse            text not null default '' check (length(reponse) <= 1000),
  traitee_par        uuid references public.profiles(id) on delete set null,
  traitee_le         timestamptz,
  echeance           date not null,
  created_at         timestamptz not null default now()
);

create index demandes_correction_club_idx on public.demandes_correction_evaluation (club_id, statut);
create index demandes_correction_educateur_idx on public.demandes_correction_evaluation (educateur_id, statut);
create index demandes_correction_demandeur_idx on public.demandes_correction_evaluation (demandeur_id);
create index demandes_correction_evaluation_idx on public.demandes_correction_evaluation (evaluation_id);

comment on table public.demandes_correction_evaluation is
  'Demandes de correction d''une évaluation par le joueur ou un parent (RGPD, réponse sous un mois). Ni modifiables ni effaçables directement.';

create or replace function public.demandes_correction_avant_ajout()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_uid uuid := auth.uid();
  e public.evaluations;
  f record;
  ctx record;
  v_nb integer;
begin
  if v_uid is null then
    raise exception 'connexion requise';
  end if;
  if num_nonnulls(new.evaluation_id, new.ancienne_fiche_id) <> 1 then
    raise exception 'une évaluation à préciser';
  end if;

  if new.evaluation_id is not null then
    select * into e from public.evaluations where id = new.evaluation_id;
    if e.id is null or not public.secu_evaluation_droit_ligne(e, 'joueur_resultats') then
      raise exception 'évaluation non visible';
    end if;
    new.club_id          := e.club_id;
    new.educateur_id     := e.educateur_id;
    new.equipe_joueur_id := e.equipe_joueur_id;
    new.joueur_id        := e.joueur_id;
    new.joueur_nom       := e.joueur_nom;
    new.demandeur_type   := case when public.secu_est_le_joueur(e.equipe_joueur_id, e.joueur_id) then 'joueur' else 'parent' end;
  else
    select fj.id, fj.equipe_joueur_id, fj.educateur_id, fj.visible_joueur into f
      from public.evaluations_joueur fj where fj.id = new.ancienne_fiche_id;
    if f.id is null or not f.visible_joueur
       or not (public.secu_est_le_joueur(f.equipe_joueur_id, null)
               or public.secu_est_parent_du_joueur(f.equipe_joueur_id, null)) then
      raise exception 'évaluation non visible';
    end if;
    select * into ctx from public.evaluation_contexte_joueur(f.equipe_joueur_id);
    new.club_id := ctx.club_id;
    if new.club_id is null then
      select count(*), min(ce.club_id::text)::uuid into v_nb, new.club_id
        from public.club_educateurs ce
       where ce.educateur_id = f.educateur_id and ce.statut = 'accepte';
      if v_nb > 1 then
        new.club_id := null;
      end if;
    end if;
    new.educateur_id     := f.educateur_id;
    new.equipe_joueur_id := f.equipe_joueur_id;
    new.joueur_id        := ctx.joueur_id;
    new.joueur_nom       := coalesce(ctx.joueur_nom, '');
    new.demandeur_type   := case when public.secu_est_le_joueur(f.equipe_joueur_id, null) then 'joueur' else 'parent' end;
  end if;

  select count(*) into v_nb
    from public.demandes_correction_evaluation d
   where d.demandeur_id = v_uid and d.statut = 'recue'
     and (d.evaluation_id = new.evaluation_id or d.ancienne_fiche_id = new.ancienne_fiche_id);
  if v_nb >= 3 then
    raise exception 'trois demandes sont déjà en attente pour cette évaluation';
  end if;

  new.demandeur_id := v_uid;
  new.message      := btrim(new.message);
  new.statut       := 'recue';
  new.reponse      := '';
  new.traitee_par  := null;
  new.traitee_le   := null;
  new.echeance     := (current_date + interval '1 month')::date;
  new.created_at   := now();
  return new;
end;
$$;

create trigger demandes_correction_avant_ajout
  before insert on public.demandes_correction_evaluation
  for each row execute function public.demandes_correction_avant_ajout();

-- Qui traite : l'éducateur de l'évaluation (encore au club, ou indépendant),
-- ou ceux qui gèrent les fiches au club.
create or replace function public.secu_demande_correction_traitant(d public.demandes_correction_evaluation)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select auth.uid() is not null and (
    (d.educateur_id = auth.uid() and (d.club_id is null or public.secu_educateur_accepte_club(d.club_id)))
    or (d.club_id is not null and public.a_permission_modeles_evaluation(d.club_id, true))
  )
$$;

create or replace function public.repondre_demande_correction(p_id uuid, p_statut text, p_reponse text)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  d public.demandes_correction_evaluation;
begin
  if auth.uid() is null then
    raise exception 'connexion requise';
  end if;
  if p_statut is null or p_statut not in ('traitee', 'refusee') then
    raise exception 'statut inconnu';
  end if;
  if p_statut = 'refusee' and length(btrim(coalesce(p_reponse, ''))) = 0 then
    raise exception 'un refus doit être expliqué';
  end if;
  if length(coalesce(p_reponse, '')) > 1000 then
    raise exception 'réponse trop longue (1000 caractères au plus)';
  end if;
  select * into d from public.demandes_correction_evaluation where id = p_id;
  if d.id is null or not public.secu_demande_correction_traitant(d) then
    raise exception 'demande introuvable ou accès refusé';
  end if;
  update public.demandes_correction_evaluation
     set statut = p_statut, reponse = btrim(coalesce(p_reponse, '')),
         traitee_par = auth.uid(), traitee_le = now()
   where id = p_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. Conditions d'utilisation des fiches d'évaluation
--    Versions : ajoutées par Digital Football seulement (éditeur SQL).
--    INTERRUPTEUR : aucune ligne en vigueur = rien n'est demandé ni bloqué.
--    Allumer (plus tard, après le juriste) :
--      insert into public.conditions_evaluation_versions (version, texte_sha256, en_vigueur_le)
--      values ('v1', '<empreinte du texte validé>', now());
-- ----------------------------------------------------------------------------
create table public.conditions_evaluation_versions (
  version        text primary key check (version ~ '^v[0-9]{1,3}$'),
  texte_sha256   text not null check (texte_sha256 ~ '^[0-9a-f]{64}$'),
  en_vigueur_le  timestamptz,
  created_at     timestamptz not null default now()
);

comment on table public.conditions_evaluation_versions is
  'Versions des conditions d''utilisation des fiches d''évaluation. Aucune en vigueur = interrupteur éteint.';

create table public.acceptations_conditions_evaluation (
  id                uuid primary key default gen_random_uuid(),
  -- Club, ou éducateur (indépendant, ou pour ses propres données)
  proprietaire_id   uuid not null references public.profiles(id) on delete cascade,
  version           text not null references public.conditions_evaluation_versions(version),
  accepte_par       uuid references public.profiles(id) on delete set null,
  accepte_par_role  text not null check (accepte_par_role in ('club', 'president', 'educateur')),
  accepte_le        timestamptz not null default now(),
  unique (proprietaire_id, version)
);

comment on table public.acceptations_conditions_evaluation is
  'Qui a accepté quelle version des conditions des fiches d''évaluation, pour quel club ou éducateur, et quand.';

create or replace function public.conditions_evaluation_version_en_vigueur()
returns text
language sql
stable
security definer
set search_path to ''
as $$
  select v.version from public.conditions_evaluation_versions v
   where v.en_vigueur_le is not null and v.en_vigueur_le <= now()
   order by v.en_vigueur_le desc limit 1
$$;

-- Vrai si l'interrupteur est éteint, ou si la version en vigueur est acceptée
create or replace function public.conditions_evaluation_acceptees(p_proprietaire_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select case
    when public.conditions_evaluation_version_en_vigueur() is null then true
    else p_proprietaire_id is not null and exists (
      select 1 from public.acceptations_conditions_evaluation a
       where a.proprietaire_id = p_proprietaire_id
         and a.version = public.conditions_evaluation_version_en_vigueur())
  end
$$;

create or replace function public.accepter_conditions_evaluation(p_proprietaire_id uuid, p_version text)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := auth.uid();
  v_version text := public.conditions_evaluation_version_en_vigueur();
  v_role text;
begin
  if v_uid is null then
    raise exception 'connexion requise';
  end if;
  if v_version is null then
    raise exception 'aucune version des conditions n''est en vigueur';
  end if;
  if p_version is distinct from v_version then
    raise exception 'version dépassée : recharger la page';
  end if;
  if p_proprietaire_id = v_uid and exists (select 1 from public.profiles pr where pr.id = v_uid and pr.plan = 'club') then
    v_role := 'club';
  elsif exists (select 1 from public.staff_club sc
                 where sc.club_id = p_proprietaire_id and sc.user_id = v_uid and sc.role = 'president') then
    v_role := 'president';
  elsif p_proprietaire_id = v_uid and exists (select 1 from public.profiles pr where pr.id = v_uid and pr.plan = 'educateur') then
    v_role := 'educateur';
  else
    raise exception 'accès refusé : réservé au compte du club, au président ou à l''éducateur lui-même';
  end if;
  insert into public.acceptations_conditions_evaluation (proprietaire_id, version, accepte_par, accepte_par_role)
  values (p_proprietaire_id, v_version, v_uid, v_role)
  on conflict (proprietaire_id, version) do nothing;
end;
$$;

-- Blocage quand l'interrupteur est allumé (sans effet tant qu'il est éteint).
-- Ces déclencheurs passent APRÈS ceux des blocs 1 et 2 (ordre alphabétique),
-- donc le club et l'éducateur sont déjà posés par la base.
create or replace function public.evaluations_conditions_acceptees()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if auth.uid() is not null
     and not public.conditions_evaluation_acceptees(coalesce(new.club_id, new.educateur_id)) then
    raise exception 'conditions des fiches d''évaluation à accepter (par le club, ou par l''éducateur indépendant)';
  end if;
  return new;
end;
$$;

create trigger evaluations_conditions
  before insert on public.evaluations
  for each row execute function public.evaluations_conditions_acceptees();

create trigger notes_suivi_conditions
  before insert on public.notes_suivi
  for each row execute function public.evaluations_conditions_acceptees();

create or replace function public.versions_conditions_acceptees()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_proprietaire uuid;
begin
  if auth.uid() is not null and new.publiee_le is not null and old.publiee_le is null then
    select coalesce(m.club_id, m.educateur_id) into v_proprietaire
      from public.modeles_evaluation m where m.id = new.modele_id;
    if not public.conditions_evaluation_acceptees(v_proprietaire) then
      raise exception 'conditions des fiches d''évaluation à accepter avant de publier une fiche';
    end if;
  end if;
  return new;
end;
$$;

create trigger modeles_evaluation_versions_conditions
  before update on public.modeles_evaluation_versions
  for each row execute function public.versions_conditions_acceptees();

-- ----------------------------------------------------------------------------
-- Droits sur les fonctions
-- ----------------------------------------------------------------------------
revoke all on function public.conservation_date_suppression(date, integer) from public, anon;
revoke all on function public.evaluation_joueur_present(uuid, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.conservation_evaluations_nuit() from public, anon, authenticated;
revoke all on function public.prolonger_conservation_evaluations(uuid[]) from public, anon;
revoke all on function public.supprimer_donnees_evaluation_joueur(uuid, uuid, uuid, uuid[]) from public, anon;
revoke all on function public.demandes_correction_avant_ajout() from public, anon, authenticated;
revoke all on function public.secu_demande_correction_traitant(public.demandes_correction_evaluation) from public, anon;
revoke all on function public.repondre_demande_correction(uuid, text, text) from public, anon;
revoke all on function public.conditions_evaluation_version_en_vigueur() from public, anon;
revoke all on function public.conditions_evaluation_acceptees(uuid) from public, anon;
revoke all on function public.accepter_conditions_evaluation(uuid, text) from public, anon;
revoke all on function public.evaluations_conditions_acceptees() from public, anon, authenticated;
revoke all on function public.versions_conditions_acceptees() from public, anon, authenticated;

grant execute on function public.conservation_date_suppression(date, integer) to authenticated;
grant execute on function public.prolonger_conservation_evaluations(uuid[]) to authenticated;
grant execute on function public.supprimer_donnees_evaluation_joueur(uuid, uuid, uuid, uuid[]) to authenticated;
grant execute on function public.secu_demande_correction_traitant(public.demandes_correction_evaluation) to authenticated;
grant execute on function public.repondre_demande_correction(uuid, text, text) to authenticated;
grant execute on function public.conditions_evaluation_version_en_vigueur() to authenticated;
grant execute on function public.conditions_evaluation_acceptees(uuid) to authenticated;
grant execute on function public.accepter_conditions_evaluation(uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- Règles (RLS) et droits de table
-- ----------------------------------------------------------------------------
alter table public.conservation_evaluations enable row level security;
alter table public.demandes_correction_evaluation enable row level security;
alter table public.conditions_evaluation_versions enable row level security;
alter table public.acceptations_conditions_evaluation enable row level security;

create policy cons_lecture on public.conservation_evaluations
  for select to authenticated
  using ((club_id is not null and public.a_permission_modeles_evaluation(club_id, true))
         or (club_id is null and educateur_id = auth.uid()));

create policy dc_lecture on public.demandes_correction_evaluation
  for select to authenticated
  using (demandeur_id = auth.uid() or public.secu_demande_correction_traitant(demandes_correction_evaluation));

create policy dc_ajout on public.demandes_correction_evaluation
  for insert to authenticated
  with check (demandeur_id = auth.uid());

create policy cv_lecture on public.conditions_evaluation_versions
  for select to authenticated
  using (true);

create policy ac_lecture on public.acceptations_conditions_evaluation
  for select to authenticated
  using (proprietaire_id = auth.uid()
         or public.secu_club_ou_president(proprietaire_id)
         or public.a_permission_modeles_evaluation(proprietaire_id, false));

revoke all on table public.conservation_evaluations from public, anon, authenticated;
revoke all on table public.demandes_correction_evaluation from public, anon, authenticated;
revoke all on table public.conditions_evaluation_versions from public, anon, authenticated;
revoke all on table public.acceptations_conditions_evaluation from public, anon, authenticated;

grant select on table public.conservation_evaluations to authenticated;
grant select, insert on table public.demandes_correction_evaluation to authenticated;
grant select on table public.conditions_evaluation_versions to authenticated;
grant select on table public.acceptations_conditions_evaluation to authenticated;

grant all on table public.conservation_evaluations to service_role;
grant all on table public.demandes_correction_evaluation to service_role;
grant all on table public.conditions_evaluation_versions to service_role;
grant all on table public.acceptations_conditions_evaluation to service_role;

-- ----------------------------------------------------------------------------
-- Tâche de nuit : tous les jours à 3 h 30 (heure du serveur, UTC)
-- ----------------------------------------------------------------------------
select cron.schedule('conservation-evaluations', '30 3 * * *', 'select public.conservation_evaluations_nuit()');

commit;

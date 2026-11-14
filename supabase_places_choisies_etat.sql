-- Chantier « places choisies » (PLAN-outils-offerts-suite.md), bloc 0 : photo des
-- places actuelles. LECTURE SEULE : aucune écriture, rien n'est modifié.
--
-- À lancer dans le SQL Editor de Supabase, après ~/Sauvegardes-DigitalFootball/sauvegarder.sh.
-- Recopier les résultats de chaque requête dans le journal du bloc 0 : la
-- première sert de référence au bloc 1 (après le changement de règle, chaque
-- club doit garder les mêmes éducateurs avec place).

-- 1. Photo de référence : une ligne par club du nouveau modèle et par éducateur affilié accepté.
select
  c.id as club_id,
  coalesce(c.club, c.email) as club,
  c.palier,
  coalesce(c.quota_equipes, 0) as places,
  c.abonnement_actif,
  e.id as educateur_id,
  coalesce(nullif(trim(coalesce(e.prenom, '') || ' ' || coalesce(e.nom, '')), ''), e.email) as educateur,
  min(ce.created_at) as affilie_depuis,
  row_number() over (partition by c.id order by min(ce.created_at), e.id) as rang,
  public.educateur_a_place(c.id, e.id) as a_place
from public.profiles c
join public.club_educateurs ce on ce.club_id = c.id and ce.statut = 'accepte' and ce.educateur_id is not null
join public.profiles e on e.id = ce.educateur_id
where c.plan = 'club' and c.modele_outils is true
group by c.id, c.club, c.email, c.palier, c.quota_equipes, c.abonnement_actif, e.id, e.prenom, e.nom, e.email
order by club, rang;

-- 2. Totaux par club.
select
  c.id as club_id,
  coalesce(c.club, c.email) as club,
  coalesce(c.quota_equipes, 0) as places,
  count(distinct ce.educateur_id) as educateurs_affilies,
  count(distinct ce.educateur_id) filter (where public.educateur_a_place(c.id, ce.educateur_id)) as avec_place
from public.profiles c
left join public.club_educateurs ce on ce.club_id = c.id and ce.statut = 'accepte' and ce.educateur_id is not null
where c.plan = 'club' and c.modele_outils is true
group by c.id, c.club, c.email, c.quota_equipes
order by club;

-- 3. Nombre total de couples (club, éducateur) avec place : un seul chiffre à comparer après le bloc 1.
select count(*) as couples_avec_place
from (
  select distinct ce.club_id, ce.educateur_id
  from public.club_educateurs ce
  join public.profiles c on c.id = ce.club_id and c.plan = 'club' and c.modele_outils is true
  where ce.statut = 'accepte' and ce.educateur_id is not null
) x
where public.educateur_a_place(x.club_id, x.educateur_id);

-- 4. Contraintes de la table notifications (type libre ou liste fermée ?).
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.notifications'::regclass;

-- 5. Contraintes de la table du journal de Mon club (liste des actions).
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.mon_club_journal'::regclass;

-- 6. Colonnes de club_educateurs.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'club_educateurs'
order by ordinal_position;

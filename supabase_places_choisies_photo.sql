-- Chantier « places choisies » (PLAN-outils-offerts-suite.md), bloc 0 : photo des
-- places actuelles, EN UNE SEULE REQUÊTE. LECTURE SEULE : rien n'est modifié.
-- Mêmes informations que supabase_places_choisies_etat.sql (requêtes 1 à 5),
-- rendues dans une seule case « photo » à copier en entier.

select jsonb_pretty(jsonb_build_object(
  '1_photo', (
    select coalesce(jsonb_agg(to_jsonb(p) order by p.club, p.rang), '[]'::jsonb)
    from (
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
    ) p
  ),
  '2_totaux', (
    select coalesce(jsonb_agg(to_jsonb(t) order by t.club), '[]'::jsonb)
    from (
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
    ) t
  ),
  '3_couples_avec_place', (
    select count(*)
    from (
      select distinct ce.club_id, ce.educateur_id
      from public.club_educateurs ce
      join public.profiles c on c.id = ce.club_id and c.plan = 'club' and c.modele_outils is true
      where ce.statut = 'accepte' and ce.educateur_id is not null
    ) x
    where public.educateur_a_place(x.club_id, x.educateur_id)
  ),
  '4_contraintes_notifications', (
    select coalesce(jsonb_agg(jsonb_build_object('nom', conname, 'definition', pg_get_constraintdef(oid))), '[]'::jsonb)
    from pg_constraint where conrelid = 'public.notifications'::regclass
  ),
  '5_contraintes_journal', (
    select coalesce(jsonb_agg(jsonb_build_object('nom', conname, 'definition', pg_get_constraintdef(oid))), '[]'::jsonb)
    from pg_constraint where conrelid = 'public.mon_club_journal'::regclass
  )
)) as photo;

-- Sécurisation module Sponsors — RECHERCHE DES IDENTIFIANTS DE TEST.
-- Lecture seule (un seul SELECT) : ne modifie rien.
--
-- Une ligne par club ayant au moins un sponsor affiché en bandeau.
-- Choisir la ligne où toutes les colonnes sont remplies : ses valeurs vont
-- dans la section FIXTURES de supabase_sponsors_tests.sql.
-- staff_sponsors   : président en priorité, sinon marketing/secrétaire sans
--                    ligne role_permissions contraire.
-- staff_sans_droit : rôle renseigné, sans aucun droit sponsors.
-- externe          : profil sans lien avec ce club (ni club, staff,
--                    éducateur, joueur affilié, dirigeant, parent).

with bandeau as (
  select s.club_id, s.saison, min(s.id::text)::uuid as sponsor_id
  from public.sponsors s
  where s.afficher_bandeau = true and s.club_id is not null
  group by s.club_id, s.saison
)
select
  b.club_id,
  p.club::text as nom_club,
  b.saison,
  b.sponsor_id,
  (select s2.id from public.sponsors s2
    where s2.club_id is not null and s2.club_id <> b.club_id limit 1) as sponsor_autre_club,
  (select sc.user_id from public.staff_club sc
    where sc.club_id = b.club_id
      and (sc.role = 'president'
           or (sc.role in ('marketing', 'secretaire')
               and not exists (select 1 from public.role_permissions rp
                               where rp.club_id = b.club_id and rp.role = sc.role and rp.section = 'sponsors')))
    order by (sc.role = 'president') desc limit 1) as staff_sponsors,
  (select sc.user_id from public.staff_club sc
    where sc.club_id = b.club_id
      and sc.role is not null
      and sc.role not in ('president', 'marketing', 'secretaire')
      and not exists (select 1 from public.role_permissions rp
                      where rp.club_id = b.club_id and rp.role = sc.role
                        and rp.section = 'sponsors' and coalesce(rp.can_view, false))
    limit 1) as staff_sans_droit,
  (select a.joueur_id from public.affiliations a
    join public.club_educateurs ce on ce.educateur_id = a.educateur_id
    where ce.club_id = b.club_id and a.statut = 'accepte' and ce.statut = 'accepte'
    limit 1) as joueur_membre,
  (select pr.id from public.profiles pr
    where pr.id <> b.club_id
      and coalesce(pr.plan, '') <> 'club'
      and not exists (select 1 from public.staff_club sc where sc.club_id = b.club_id and sc.user_id = pr.id)
      and not exists (select 1 from public.club_educateurs ce where ce.club_id = b.club_id and ce.educateur_id = pr.id)
      and not exists (select 1 from public.affiliations a
                      join public.club_educateurs ce on ce.educateur_id = a.educateur_id
                      where ce.club_id = b.club_id and a.joueur_id = pr.id)
      and not exists (select 1 from public.dirigeant_acces da
                      join public.club_educateurs ce on ce.educateur_id = da.educateur_id
                      where ce.club_id = b.club_id and da.dirigeant_id = pr.id)
      and not exists (select 1 from public.parents_acces pa
                      join public.affiliations a on a.joueur_id = pa.joueur_id
                      join public.club_educateurs ce on ce.educateur_id = a.educateur_id
                      where ce.club_id = b.club_id and pa.parent_id = pr.id)
    limit 1) as externe
from bandeau b
left join public.profiles p on p.id = b.club_id
order by b.saison desc, nom_club;

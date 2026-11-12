-- LECTURE SEULE : état des lieux avant « le club offre les outils à ses éducateurs ».
-- Rien n'est modifié. À coller dans l'éditeur SQL Supabase, une requête à la fois
-- (ou tout le fichier : seul le dernier résultat s'affiche, donc une requête par fois).
-- Renvoie-moi chaque résultat par copier-coller.

-- 1. Colonnes réelles de club_educateurs (y a-t-il une date d'affiliation ?)
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'club_educateurs'
order by ordinal_position;

-- 2. Clubs du nouveau modèle : forfait, places, éducateurs acceptés, dépassement
select p.id, u.email, p.club, p.palier, p.quota_equipes, p.abonnement_actif, p.educateurs_inclus,
       count(ce.*) filter (where ce.statut = 'accepte') as educateurs_acceptes,
       count(ce.*) filter (where ce.statut <> 'accepte') as autres_statuts,
       (count(ce.*) filter (where ce.statut = 'accepte') > coalesce(p.quota_equipes, 0)) as au_dessus_limite
from public.profiles p
join auth.users u on u.id = p.id
left join public.club_educateurs ce on ce.club_id = p.id
where p.modele_outils is true
  and (p.palier is not null or p.quota_equipes is not null or ce.id is not null)
group by p.id, u.email, p.club, p.palier, p.quota_equipes, p.abonnement_actif, p.educateurs_inclus
order by au_dessus_limite desc, educateurs_acceptes desc;

-- 3. Club d'essai et éducateur d'essai testfinal
select p.id, u.email, p.prenom, p.nom, p.club, p.modele_outils, p.palier, p.quota_equipes, p.abonnement_actif
from public.profiles p
join auth.users u on u.id = p.id
where u.email = 'deabreu.amorim+club@gmail.com'
   or u.email ilike '%testfinal%' or p.nom ilike '%testfinal%' or p.prenom ilike '%testfinal%';

-- 4. Affiliations de testfinal
select ce.*
from public.club_educateurs ce
join public.profiles e on e.id = ce.educateur_id
join auth.users u on u.id = e.id
where u.email ilike '%testfinal%' or e.nom ilike '%testfinal%' or e.prenom ilike '%testfinal%';

-- 5. Outils ouverts par le club d'essai et outils qu'il détient
select 'ouvert' as genre, o.outil, o.ouvert_le::text as info
from public.outils_club_ouverts o
join auth.users u on u.id = o.club_id
where u.email = 'deabreu.amorim+club@gmail.com'
union all
select 'detenu', oc.outil, coalesce(oc.fin_le::text, 'en cours')
from public.outils_comptes oc
join auth.users u on u.id = oc.compte_id
where u.email = 'deabreu.amorim+club@gmail.com';

-- 6. Contraintes de la table notifications (type libre ou liste fermée ?)
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.notifications'::regclass;

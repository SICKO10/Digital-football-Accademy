-- Vérification du bloc 15 (verrou des outils). Lecture seule : rien n'est
-- modifié dans les tables (la partie 3 utilise une table temporaire, effacée
-- à la fin de la session). Lancer après supabase_outils_verrou.sql.
-- L'éditeur SQL n'affiche que le dernier résultat : sélectionner une partie à
-- la fois (1, puis 2, puis 3), cliquer Run, et coller les 3 résultats.

-- 1. Tables verrouillées : RLS doit être activé (rls_active = true) et chaque
--    table doit avoir 1 règle (niveau tout) ou 3 règles (niveau écriture).
select c.relname as table_verrouillee,
       c.relrowsecurity as rls_active,
       count(p.policyname) as regles_verrou,
       string_agg(p.cmd, ', ' order by p.cmd) as commandes
from pg_class c
join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
join pg_policies p on p.schemaname = 'public' and p.tablename = c.relname and p.policyname like 'verrou_outils%'
group by c.relname, c.relrowsecurity
order by rls_active, c.relname;

-- 2. Pour chaque compte au nouveau modèle (comptes de test avant la bascule) :
--    outils ouverts. « bloque » = vrai veut dire que le verrou ferme l'outil.
select p.email, p.plan, o.outil,
       public.a_outil(p.id, o.outil) as a_l_outil,
       not public.a_outil(p.id, o.outil) as bloque
from public.profiles p
cross join lateral (
  select unnest(case when p.plan = 'club'
    then array['competition', 'projet_sportif', 'finances', 'vie_club', 'stages', 'cff4']
    else array['suivi_joueurs', 'seances', 'tactique', 'bibliotheque', 'prep_physique', 'projet_sportif', 'cff4', 'stages'] end) as outil
) o
where p.modele_outils is true and p.plan in ('educateur', 'club')
order by p.email, o.outil;

-- 3. Simulation : le verrou vu par un compte au nouveau modèle et par un
--    compte ordinaire (doit être faux partout pour l'ordinaire).
drop table if exists verif_verrou;
create temp table verif_verrou (email text, modele boolean, outil text, ferme boolean);
do $$
declare
  c record;
  o text;
begin
  for c in
    (select id, email, plan, modele_outils from public.profiles
      where modele_outils is true and plan in ('educateur', 'club'))
    union all
    (select id, email, plan, modele_outils from public.profiles
      where modele_outils is not true and plan = 'educateur' limit 1)
    union all
    (select id, email, plan, modele_outils from public.profiles
      where modele_outils is not true and plan = 'club' limit 1)
  loop
    perform set_config('request.jwt.claim.sub', c.id::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', c.id, 'role', 'authenticated')::text, true);
    foreach o in array case when c.plan = 'club'
      then array['competition', 'projet_sportif', 'finances', 'vie_club', 'stages', 'cff4']
      else array['suivi_joueurs', 'seances', 'tactique', 'bibliotheque', 'prep_physique', 'projet_sportif', 'cff4', 'stages'] end loop
      insert into verif_verrou values (
        case when c.modele_outils then c.email else '(compte ordinaire ' || c.plan || ')' end,
        c.modele_outils, o,
        case when c.plan = 'club' then public.outil_ferme(array[]::text[], array[o]) else public.outil_ferme(array[o], array[]::text[]) end);
    end loop;
  end loop;
end $$;
select * from verif_verrou order by modele desc, email, outil;

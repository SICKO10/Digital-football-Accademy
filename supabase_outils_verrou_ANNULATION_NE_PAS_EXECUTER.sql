-- ANNULATION du bloc 15 (verrou des outils). NE PAS EXÉCUTER sauf décision
-- explicite de revenir en arrière : retire toutes les règles verrou_outils* et
-- la fonction outil_ferme. Aucune donnée n'est touchée.

begin;

do $$
declare
  r record;
begin
  for r in
    select tablename, policyname from pg_policies
    where schemaname = 'public' and policyname in ('verrou_outils', 'verrou_outils_ajout', 'verrou_outils_modif', 'verrou_outils_suppr')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

drop function if exists public.outil_ferme(text[], text[]);

commit;

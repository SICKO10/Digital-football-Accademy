do $$ begin raise exception 'SECOURS : ne pas exécuter ce fichier en entier. Lire le mode d''emploi ci-dessous. Rien n''a été modifié.'; end $$;

-- Chantier sécurité de novembre — SECOURS du bloc 3 : role_categories_access.
--
-- MODE D'EMPLOI
--   1. Exécuter ce fichier tel quel ne fait rien : la première ligne s'arrête.
--   2. Le secours est dans le bloc de commentaire ci-dessous. Pour l'utiliser,
--      copier UNIQUEMENT ce qui est entre « DÉBUT » et « FIN », puis remplacer
--      'A_REMPLACER' par 'SECOURS'. Sans ce remplacement, rien n'est modifié.
--   3. Faire d'abord la sauvegarde : zsh ~/Sauvegardes-DigitalFootball/sauvegarder.sh
--
-- QUAND S'EN SERVIR
--   Seulement si, après le bloc 3, le compte club n'arrive plus à lire ou à
--   enregistrer l'Accès du bureau (cases décochées après rechargement,
--   message d'erreur à l'enregistrement), et que la cause est la nouvelle
--   règle.
--
-- CE QUE FAIT LE SECOURS
--   Remplace les 3 règles du bloc 3 par 3 règles limitées au compte club
--   lui-même (club_id = compte connecté : lire, créer, modifier ; toujours
--   aucune suppression), sans passer par la fonction du bloc 2.
--   La table NE REDEVIENT PAS publique : le visiteur sans compte et les
--   autres clubs restent exclus. Seule perte : un président du staff
--   (aucun en base au 2026-11-16) ne règle plus l'Accès du bureau.
--   Les droits techniques retirés au bloc 3 ne sont pas rendus.

/* ───────────────────────────── DÉBUT ─────────────────────────────

begin;

do $$
begin
  if 'A_REMPLACER' <> 'SECOURS' then
    raise exception 'ARRÊT : confirmation absente (remplacer A_REMPLACER par SECOURS). Rien n''a été modifié.';
  end if;
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'role_categories_access'
        and policyname in ('rca_club_president_lecture', 'rca_club_president_creation', 'rca_club_president_modification')) <> 3
     or (select count(*) from pg_policies where schemaname = 'public' and tablename = 'role_categories_access') <> 3 then
    raise exception 'ARRÊT : les règles de role_categories_access ne sont pas celles du bloc 3. Rien n''a été modifié.';
  end if;
end;
$$;

drop policy rca_club_president_lecture on public.role_categories_access;
drop policy rca_club_president_creation on public.role_categories_access;
drop policy rca_club_president_modification on public.role_categories_access;

create policy rca_secours_club_lecture on public.role_categories_access
  as permissive for select to authenticated
  using (club_id = (select auth.uid()));

create policy rca_secours_club_creation on public.role_categories_access
  as permissive for insert to authenticated
  with check (club_id = (select auth.uid()));

create policy rca_secours_club_modification on public.role_categories_access
  as permissive for update to authenticated
  using (club_id = (select auth.uid()))
  with check (club_id = (select auth.uid()));

do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.role_categories_access'::regclass)
     or (select count(*) from pg_policies where schemaname = 'public' and tablename = 'role_categories_access') <> 3
     or exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'role_categories_access'
                and (roles::text <> '{authenticated}' or cmd not in ('SELECT', 'INSERT', 'UPDATE')
                     or coalesce(qual, with_check, '') !~ 'club_id = '
                     or coalesce(with_check, qual, '') !~ 'club_id = '))
     or has_table_privilege('anon', 'public.role_categories_access', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then
    raise exception 'ARRÊT contrôle final : état inattendu après le secours. Rien n''a été modifié.';
  end if;
end;
$$;

commit;

select 'Secours du bloc 3 appliqué : role_categories_access limitée au compte club lui-même.' as resultat;

────────────────────────────── FIN ────────────────────────────── */

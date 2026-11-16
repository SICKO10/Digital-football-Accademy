do $$ begin raise exception 'SECOURS : ne pas exécuter ce fichier en entier. Lire le mode d''emploi ci-dessous. Rien n''a été modifié.'; end $$;

-- Chantier sécurité de novembre — SECOURS du bloc 5 : staff_club.
--
-- MODE D'EMPLOI
--   1. Exécuter ce fichier tel quel ne fait rien : la première ligne s'arrête.
--   2. Le secours est dans le bloc de commentaire ci-dessous. Pour l'utiliser,
--      copier UNIQUEMENT ce qui est entre « DÉBUT » et « FIN », puis remplacer
--      'A_REMPLACER' par 'SECOURS'. Sans ce remplacement, rien n'est modifié.
--   3. Faire d'abord la sauvegarde : zsh ~/Sauvegardes-DigitalFootball/sauvegarder.sh
--
-- QUAND S'EN SERVIR
--   Seulement si, après le bloc 5, un écran du club ou de son staff ne trouve
--   plus les collègues (liste vide, responsable introuvable) ou si le compte
--   club n'arrive plus à ajouter, modifier ou retirer un membre, et que la
--   cause est la nouvelle règle.
--
-- CE QUE FAIT LE SECOURS
--   Ajoute deux règles, sans retirer celles du bloc 5 :
--   - staff_secours_lecture_club : le club et les membres de SON staff lisent
--     le staff de leur club (comme avant le bloc 5, mais limité au club) ;
--   - staff_secours_club_ecriture : le compte club lui-même écrit sur son
--     staff (l'ancienne règle club_manage_staff, réservée aux comptes
--     connectés), sans passer par la fonction du bloc 2.
--   La table NE REDEVIENT PAS publique : le visiteur sans compte, les autres
--   clubs et les comptes sans lien restent exclus. Seule perte de sécurité :
--   un membre du staff relit les coordonnées de ses collègues du même club.
--   Les droits techniques retirés au bloc 5 ne sont pas rendus.

/* ───────────────────────────── DÉBUT ─────────────────────────────

begin;

do $$
begin
  if 'A_REMPLACER' <> 'SECOURS' then
    raise exception 'ARRÊT : confirmation absente (remplacer A_REMPLACER par SECOURS). Rien n''a été modifié.';
  end if;
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'staff_club'
        and policyname like 'staff_club_president_%') <> 4
     or (select count(*) from pg_policies where schemaname = 'public' and tablename = 'staff_club') <> 7 then
    raise exception 'ARRÊT : les règles de staff_club ne sont pas celles du bloc 5. Rien n''a été modifié.';
  end if;
  if to_regprocedure('public.secu_club_ou_staff(uuid)') is null then
    raise exception 'ARRÊT : public.secu_club_ou_staff(uuid) absente. Rien n''a été modifié.';
  end if;
end;
$$;

create policy staff_secours_lecture_club on public.staff_club
  as permissive for select to authenticated
  using (public.secu_club_ou_staff(club_id));

create policy staff_secours_club_ecriture on public.staff_club
  as permissive for all to authenticated
  using (club_id = (select auth.uid()))
  with check (club_id = (select auth.uid()));

do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.staff_club'::regclass)
     or (select count(*) from pg_policies where schemaname = 'public' and tablename = 'staff_club') <> 9
     or exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'staff_club'
                and (roles::text <> '{authenticated}' or coalesce(qual, '') like '%IS NOT NULL%'))
     or has_table_privilege('anon', 'public.staff_club', 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') then
    raise exception 'ARRÊT contrôle final : état inattendu après le secours. Rien n''a été modifié.';
  end if;
end;
$$;

commit;

select 'Secours du bloc 5 appliqué : staff_club lisible par le club et son staff, écriture par le compte club.' as resultat;

────────────────────────────── FIN ────────────────────────────── */

do $$ begin raise exception 'SECOURS : ne pas exécuter ce fichier en entier. Lire le mode d''emploi ci-dessous. Rien n''a été modifié.'; end $$;

-- Chantier sécurité de novembre — SECOURS du bloc 7 : entrainements.
--
-- MODE D'EMPLOI
--   1. Exécuter ce fichier tel quel ne fait rien : la première ligne s'arrête.
--   2. Le secours est dans le bloc de commentaire ci-dessous. Pour l'utiliser,
--      copier UNIQUEMENT ce qui est entre « DÉBUT » et « FIN », puis remplacer
--      'A_REMPLACER' par 'SECOURS'. Sans ce remplacement, rien n'est modifié.
--   3. Faire d'abord la sauvegarde : zsh ~/Sauvegardes-DigitalFootball/sauvegarder.sh
--
-- QUAND S'EN SERVIR
--   Seulement si, après le bloc 7, des séances disparaissent d'un écran
--   (éducateur, club, staff, joueur, parent, dirigeant) ou qu'un éducateur
--   ne peut plus créer, modifier ou supprimer SES séances, et que la cause
--   est la nouvelle règle (fonctions secu_peut_lire_seance /
--   secu_peut_ecrire_seance du bloc 2).
--
-- CE QUE FAIT LE SECOURS
--   Ajoute une petite fonction indépendante du bloc 2 et deux règles, sans
--   retirer celles du bloc 7 :
--   - ent_secours_auteur : l'éducateur auteur lit, crée, modifie et supprime
--     SES séances (educateur_id = lui-même, avant et après modification) ;
--   - ent_secours_lecture (fonction secu_secours_lit_seance) : lisent aussi
--     le club et son staff (séances de ses éducateurs acceptés ou de ses
--     équipes), le dirigeant délégué (droit « entraînements » non « aucun »),
--     le joueur affilié accepté et son parent accepté.
--   La table NE REDEVIENT PAS publique : visiteur sans compte, autres
--   éducateurs, autres clubs et comptes sans lien restent exclus. Les
--   écritures du club et du dirigeant ne sont pas couvertes par le secours.
--   Les droits techniques retirés au bloc 7 ne sont pas rendus.

/* ───────────────────────────── DÉBUT ─────────────────────────────

begin;

do $$
begin
  if 'A_REMPLACER' <> 'SECOURS' then
    raise exception 'ARRÊT : confirmation absente (remplacer A_REMPLACER par SECOURS). Rien n''a été modifié.';
  end if;
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'entrainements'
        and policyname in ('ent_lecture', 'ent_ajout', 'ent_modification', 'ent_suppression')) <> 4
     or (select count(*) from pg_policies where schemaname = 'public' and tablename = 'entrainements') <> 4 then
    raise exception 'ARRÊT : les règles de entrainements ne sont pas celles du bloc 7. Rien n''a été modifié.';
  end if;
  if to_regprocedure('public.secu_secours_lit_seance(uuid,uuid)') is not null then
    raise exception 'ARRÊT : le secours semble déjà appliqué. Rien n''a été modifié.';
  end if;
end;
$$;

create function public.secu_secours_lit_seance(p_educateur_id uuid, p_equipe_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $f$
  select auth.uid() is not null
    and (
      exists (
        select 1 from public.club_educateurs ce
        where ce.educateur_id = p_educateur_id and ce.statut = 'accepte'
          and (ce.club_id = auth.uid()
               or exists (select 1 from public.staff_club sc where sc.club_id = ce.club_id and sc.user_id = auth.uid()))
      )
      or exists (
        select 1 from public.club_categories cc
        where cc.id = p_equipe_id
          and (cc.club_id = auth.uid()
               or exists (select 1 from public.staff_club sc where sc.club_id = cc.club_id and sc.user_id = auth.uid()))
      )
      or exists (
        select 1 from public.dirigeant_acces da
        where da.educateur_id = p_educateur_id and da.dirigeant_id = auth.uid() and da.statut = 'accepte'
          and coalesce(da.permissions ->> 'entrainements', 'aucun') <> 'aucun'
      )
      or exists (
        select 1 from public.affiliations a
        where a.educateur_id = p_educateur_id and a.statut = 'accepte'
          and (a.joueur_id = auth.uid()
               or exists (select 1 from public.parents_acces pa
                          where pa.joueur_id = a.joueur_id and pa.parent_id = auth.uid() and pa.statut = 'accepte'))
      )
    )
$f$;
comment on function public.secu_secours_lit_seance(uuid, uuid) is
  'digital-football:securite-novembre-secours-bloc7 — lecture d''une séance (secours)';
revoke all on function public.secu_secours_lit_seance(uuid, uuid) from public, anon;
grant execute on function public.secu_secours_lit_seance(uuid, uuid) to authenticated;

create policy ent_secours_auteur on public.entrainements
  as permissive for all to authenticated
  using (educateur_id = auth.uid())
  with check (educateur_id = auth.uid());

create policy ent_secours_lecture on public.entrainements
  as permissive for select to authenticated
  using (public.secu_secours_lit_seance(educateur_id, club_categorie_id));

do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.entrainements'::regclass)
     or (select count(*) from pg_policies where schemaname = 'public' and tablename = 'entrainements') <> 6
     or exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'entrainements'
                and (roles::text <> '{authenticated}' or coalesce(qual, '') = 'true' or coalesce(with_check, '') = 'true'))
     or has_function_privilege('anon', 'public.secu_secours_lit_seance(uuid,uuid)', 'execute')
     or has_table_privilege('anon', 'public.entrainements', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') then
    raise exception 'ARRÊT contrôle final : état inattendu après le secours. Rien n''a été modifié.';
  end if;
end;
$$;

commit;

select 'Secours du bloc 7 appliqué : l''éducateur gère ses séances ; club, staff, dirigeant, joueurs et parents les lisent.' as resultat;

────────────────────────────── FIN ────────────────────────────── */

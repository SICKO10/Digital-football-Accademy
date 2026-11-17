do $$ begin raise exception 'SECOURS : ne pas exécuter ce fichier en entier. Lire le mode d''emploi ci-dessous. Rien n''a été modifié.'; end $$;

-- Chantier sécurité de novembre — SECOURS du bloc 6 : convocation_joueurs.
--
-- MODE D'EMPLOI
--   1. Exécuter ce fichier tel quel ne fait rien : la première ligne s'arrête.
--   2. Le secours est dans le bloc de commentaire ci-dessous. Pour l'utiliser,
--      copier UNIQUEMENT ce qui est entre « DÉBUT » et « FIN », puis remplacer
--      'A_REMPLACER' par 'SECOURS'. Sans ce remplacement, rien n'est modifié.
--   3. Faire d'abord la sauvegarde : zsh ~/Sauvegardes-DigitalFootball/sauvegarder.sh
--
-- QUAND S'EN SERVIR
--   Seulement si, après le bloc 6, un éducateur ne retrouve plus ses joueurs
--   convoqués ou ne peut plus publier sa convocation (liste vide, erreur), et
--   que la cause est la nouvelle règle (fonction secu_peut_gerer_convocation).
--
-- CE QUE FAIT LE SECOURS
--   Ajoute une petite fonction indépendante du bloc 2 et trois règles, sans
--   retirer celles du bloc 6 :
--   - secu_secours_auteur_convocation(convocation) : vrai si le compte
--     connecté est l'éducateur auteur de la convocation (lue sans les règles
--     de convocations, pour éviter une boucle entre les deux tables) ;
--   - cj_secours_auteur_lecture / _ajout / _suppression : l'éducateur auteur
--     lit, ajoute et retire les convoqués de SES convocations.
--   La table NE REDEVIENT PAS publique : visiteur sans compte, autres
--   éducateurs, autres clubs et comptes sans lien restent exclus. Le
--   dirigeant délégué n'est pas couvert par le secours.
--   Les droits techniques retirés au bloc 6 ne sont pas rendus.

/* ───────────────────────────── DÉBUT ─────────────────────────────

begin;

do $$
begin
  if 'A_REMPLACER' <> 'SECOURS' then
    raise exception 'ARRÊT : confirmation absente (remplacer A_REMPLACER par SECOURS). Rien n''a été modifié.';
  end if;
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'convocation_joueurs'
        and policyname like 'cj\_encadrant\_%') <> 3
     or (select count(*) from pg_policies where schemaname = 'public' and tablename = 'convocation_joueurs') <> 6 then
    raise exception 'ARRÊT : les règles de convocation_joueurs ne sont pas celles du bloc 6. Rien n''a été modifié.';
  end if;
  if to_regprocedure('public.secu_secours_auteur_convocation(uuid)') is not null then
    raise exception 'ARRÊT : le secours semble déjà appliqué. Rien n''a été modifié.';
  end if;
end;
$$;

create function public.secu_secours_auteur_convocation(p_convocation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $f$
  select auth.uid() is not null
    and exists (select 1 from public.convocations c
                where c.id = p_convocation_id and c.educateur_id = auth.uid())
$f$;
comment on function public.secu_secours_auteur_convocation(uuid) is
  'digital-football:securite-novembre-secours-bloc6 — auteur de la convocation (secours)';
revoke all on function public.secu_secours_auteur_convocation(uuid) from public, anon;
grant execute on function public.secu_secours_auteur_convocation(uuid) to authenticated;

create policy cj_secours_auteur_lecture on public.convocation_joueurs
  as permissive for select to authenticated
  using (public.secu_secours_auteur_convocation(convocation_id));

create policy cj_secours_auteur_ajout on public.convocation_joueurs
  as permissive for insert to authenticated
  with check (public.secu_secours_auteur_convocation(convocation_id));

create policy cj_secours_auteur_suppression on public.convocation_joueurs
  as permissive for delete to authenticated
  using (public.secu_secours_auteur_convocation(convocation_id));

do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.convocation_joueurs'::regclass)
     or (select count(*) from pg_policies where schemaname = 'public' and tablename = 'convocation_joueurs') <> 9
     or exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'convocation_joueurs'
                and (roles::text <> '{authenticated}' or coalesce(qual, '') = 'true' or coalesce(with_check, '') = 'true'))
     or has_function_privilege('anon', 'public.secu_secours_auteur_convocation(uuid)', 'execute')
     or has_table_privilege('anon', 'public.convocation_joueurs', 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') then
    raise exception 'ARRÊT contrôle final : état inattendu après le secours. Rien n''a été modifié.';
  end if;
end;
$$;

commit;

select 'Secours du bloc 6 appliqué : l''éducateur auteur lit et réécrit les convoqués de ses convocations.' as resultat;

────────────────────────────── FIN ────────────────────────────── */

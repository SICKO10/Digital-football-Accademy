do $$ begin raise exception 'SECOURS : ne pas exécuter ce fichier en entier. Lire le mode d''emploi ci-dessous. Rien n''a été modifié.'; end $$;

-- Chantier sécurité de novembre — SECOURS du bloc 2 : retrait des fonctions.
--
-- MODE D'EMPLOI
--   1. Exécuter ce fichier tel quel ne fait rien : la première ligne s'arrête.
--   2. Le retrait est dans le bloc de commentaire ci-dessous. Pour l'utiliser,
--      copier UNIQUEMENT ce qui est entre « DÉBUT » et « FIN », puis remplacer
--      'A_REMPLACER' par 'RETRAIT'. Sans ce remplacement, rien n'est modifié.
--   3. Faire d'abord la sauvegarde : zsh ~/Sauvegardes-DigitalFootball/sauvegarder.sh
--
-- QUAND S'EN SERVIR
--   Seulement si les fonctions du bloc 2 posent un problème AVANT que les
--   blocs 3, 5, 6 et 7 aient été appliqués (les fonctions ne changent rien
--   aux accès tant qu'aucune règle ne les utilise).
--   Après ces blocs, des règles s'appuient sur les fonctions : le retrait
--   s'arrête de lui-même (pas de CASCADE, qui effacerait ces règles et
--   bloquerait les écrans). Il faut alors utiliser le secours du bloc
--   concerné, jamais celui-ci.
--
-- Ce retrait ne rouvre aucune table : il ne touche ni règle ni droit de table.

/* ───────────────────────────── DÉBUT ─────────────────────────────

begin;

do $$
begin
  if 'A_REMPLACER' <> 'RETRAIT' then
    raise exception 'ARRÊT : confirmation absente (remplacer A_REMPLACER par RETRAIT). Rien n''a été modifié.';
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and (coalesce(qual, '') ~ 'secu_' or coalesce(with_check, '') ~ 'secu_')
  ) then
    raise exception 'ARRÊT : des règles utilisent déjà les fonctions secu_* (blocs 3 à 7 appliqués). Utiliser le secours du bloc concerné. Rien n''a été modifié.';
  end if;
end;
$$;

drop function if exists public.secu_peut_ecrire_seance(uuid, uuid, text);
drop function if exists public.secu_peut_lire_seance(uuid, uuid);
drop function if exists public.secu_peut_gerer_convocation(uuid, boolean);
drop function if exists public.secu_club_peut_editer_section(uuid, text, text[]);
drop function if exists public.secu_staff_annuaire(uuid);
drop function if exists public.secu_club_ou_staff(uuid);
drop function if exists public.secu_club_ou_president(uuid);

do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'secu\_%'
  ) then
    raise exception 'ARRÊT contrôle final : une fonction secu_* existe encore. Rien n''a été modifié.';
  end if;
end;
$$;

commit;

select 'Fonctions du bloc 2 retirées. Aucune règle ni aucun droit de table modifié.' as resultat;

────────────────────────────── FIN ────────────────────────────── */

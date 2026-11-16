-- ============================================================================
-- Bibliothèque du club, bloc 9 (PLAN-bibliotheque-club.md) : 2026-11-16
-- Le club adopte un procédé partagé par un de ses éducateurs.
-- ----------------------------------------------------------------------------
-- Deux changements, rien d'autre :
--
-- A. bibliotheque_exercices : UNE règle de lecture AJOUTÉE (lecture_exercices
--    n'est pas modifiée). Un procédé que l'éducateur a coché « partagé avec son
--    club » (partage_club) devient lisible par la direction de CE club :
--    compte du club, président, rôles ayant l'ÉCRITURE Bibliothèque (par
--    défaut : directeur sportif). Seulement si l'auteur est toujours éducateur
--    accepté de ce club. Les rôles en simple lecture (secrétaire...) ne voient
--    rien de plus. Aucun procédé personnel (non partagé) n'est concerné.
--
-- B. Déclencheur de bibliotheque_club_procedes (bloc 1) : à l'ajout d'une copie
--    « éducateur » (origine = 'educateur'), la base vérifie que le procédé
--    d'origine est bien partagé avec ce club par un éducateur accepté, puis
--    pose comme auteur l'ÉDUCATEUR (son identifiant et son nom figé), et non la
--    personne qui adopte. Sinon l'ajout est refusé. Les autres cas (procédé
--    créé par le club, copie Digital Football) ne changent pas.
--
-- L'original de l'éducateur n'est jamais modifié. La copie du club reste si
-- l'éducateur supprime son procédé ou quitte le club (règles du bloc 1).
--
-- Contenu en production au 2026-11-16 : 49 procédés partagés au club, dont 38
-- par un éducateur accepté ; 0 procédé adopté. Aucune donnée n'est modifiée.
--
-- Avant d'exécuter : sauvegarde ~/Sauvegardes-DigitalFootball/sauvegarder.sh.
-- Tout est dans une seule transaction : en cas d'erreur, rien n'est appliqué.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Fonction de droit : le compte connecté peut-il lire les procédés partagés
--    au club p_club_id par l'éducateur p_educateur_id ?
--    Oui si l'éducateur est accepté dans ce club ET si le compte connecté a
--    l'écriture Bibliothèque dans ce club.
-- ----------------------------------------------------------------------------
create or replace function public.secu_club_lit_partage_educateur(p_club_id uuid, p_educateur_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select auth.uid() is not null
    and p_club_id is not null
    and p_educateur_id is not null
    and exists (
      select 1 from public.club_educateurs ce
      where ce.club_id = p_club_id
        and ce.educateur_id = p_educateur_id
        and ce.statut = 'accepte'
    )
    and public.a_permission_bibliotheque(p_club_id, true)
$$;

revoke all on function public.secu_club_lit_partage_educateur(uuid, uuid) from public, anon;
grant execute on function public.secu_club_lit_partage_educateur(uuid, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 2. Règle de lecture AJOUTÉE sur bibliotheque_exercices
-- ----------------------------------------------------------------------------
drop policy if exists lecture_exercices_partage_club_direction on public.bibliotheque_exercices;
create policy lecture_exercices_partage_club_direction on public.bibliotheque_exercices
  for select to authenticated
  using (
    partage_club
    and club_id is not null
    and public.secu_club_lit_partage_educateur(club_id, educateur_id)
  );

-- ----------------------------------------------------------------------------
-- 3. Déclencheur des procédés du club : identique au bloc 1, plus le cas
--    « adoption d'un procédé d'éducateur » à l'ajout.
-- ----------------------------------------------------------------------------
create or replace function public.bibliotheque_club_procedes_avant_ecriture()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_nom     text;
  v_auteur  uuid;
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      if new.origine = 'educateur' then
        -- Adoption : l'original doit être partagé avec CE club par un éducateur
        -- accepté, et la personne connectée doit avoir l'écriture Bibliothèque.
        select e.educateur_id
          into v_auteur
          from public.bibliotheque_exercices e
         where e.id = new.origine_id
           and e.partage_club
           and e.club_id = new.club_id
           and public.secu_club_lit_partage_educateur(e.club_id, e.educateur_id);
        if v_auteur is null then
          raise exception 'Procédé introuvable ou non partagé avec ce club'
            using errcode = '42501';
        end if;
        new.auteur_id := v_auteur;
      else
        new.auteur_id := auth.uid();
      end if;
      select nullif(btrim(coalesce(pr.prenom, '') || ' ' || coalesce(pr.nom, '')), '')
        into v_nom
        from public.profiles pr
       where pr.id = new.auteur_id;
      new.auteur_nom := coalesce(v_nom, '');
    end if;
    new.created_at := now();
    new.updated_at := now();
  else
    new.club_id    := old.club_id;
    new.auteur_nom := old.auteur_nom;
    new.origine    := old.origine;
    new.created_at := old.created_at;
    new.auteur_id  := case when new.auteur_id  is null then null else old.auteur_id  end;
    new.origine_id := case when new.origine_id is null then null else old.origine_id end;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

revoke all on function public.bibliotheque_club_procedes_avant_ecriture() from public, anon, authenticated;

commit;

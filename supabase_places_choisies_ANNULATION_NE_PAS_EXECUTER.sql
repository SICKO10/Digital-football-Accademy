-- ANNULATION du bloc 1 (places choisies, PLAN-outils-offerts-suite.md). NE PAS
-- EXÉCUTER sauf décision explicite de revenir en arrière.
--
-- Remet educateur_a_place (copie de supabase_outils_offerts.sql) et
-- prevenir_fin_outils_club (copie de supabase_outils_offerts_educateur.sql)
-- tels qu'avant le bloc 1, puis retire rangs_places_club et la table
-- club_places_choisies. Les places choisies par les clubs sont PERDUES : chaque
-- club revient à l'ordre d'ancienneté seul.
--
-- Verrou : la première instruction arrête tout. Pour annuler réellement, il
-- faut d'abord retirer le bloc « VERROU » ci-dessous, après en avoir parlé.

begin;

-- VERROU
do $$ begin
  raise exception 'Fichier d''annulation : rien n''a été modifié. Ne le lancer qu''après décision explicite.';
end $$;
-- FIN DU VERROU

create or replace function public.educateur_a_place(p_club uuid, p_educateur uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with affilies as (
    select ce.educateur_id, min(ce.created_at) as depuis
    from public.club_educateurs ce
    where ce.club_id = p_club and ce.statut = 'accepte' and ce.educateur_id is not null
    group by ce.educateur_id
  ), rangs as (
    select a.educateur_id, row_number() over (order by a.depuis, a.educateur_id) as rang
    from affilies a
  )
  select exists (
    select 1
    from rangs r
    join public.profiles c on c.id = p_club
    where r.educateur_id = p_educateur and r.rang <= coalesce(c.quota_equipes, 0)
  )
$$;


create or replace function public.prevenir_fin_outils_club()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_offrait boolean;
  v_offre boolean;
  v_offerts boolean;
  v_individuels boolean;
  v_perd_via boolean;
  v_date text;
begin
  begin
    -- Même règle que club_offre_outils, avant et après le changement.
    v_offrait := (old.plan = 'club' and old.modele_outils is true and old.abonnement_actif is true
      and old.palier is not null) is true;
    v_offre := (new.plan = 'club' and new.modele_outils is true and new.abonnement_actif is true
      and new.palier is not null) is true;
    -- Outils fournis sans être détenus : à tous les éducateurs, ou à certains.
    v_offerts := exists (
      select 1 from public.outils_club_ouverts o
      where o.club_id = new.id and public.outil_offert_par_club(o.outil)
    );
    v_individuels := exists (
      select 1 from public.outils_educateur_fournis e
      where e.club_id = new.id and public.outil_offert_par_club(e.outil)
    );
    -- Stages, Projet sportif, CFF4 : reçus parce que le club les détient,
    -- perdus quand son abonnement s'arrête (règle `viaClub` de outils_actifs).
    v_perd_via := old.abonnement_actif is true and new.abonnement_actif is not true and exists (
      select 1 from public.outils_club_ouverts o
      join public.outils_comptes oc on oc.compte_id = o.club_id and oc.outil = o.outil
        and (oc.fin_le is null or oc.fin_le > now())
      where o.club_id = new.id and not public.outil_offert_par_club(o.outil)
    );
    if not (v_offrait and (v_offerts or v_individuels)) and not v_perd_via then
      return null;
    end if;
    v_date := to_char(now() at time zone 'Europe/Paris', 'DD/MM');

    insert into public.notifications (user_id, type, titre, contenu, lien, lu)
    select r.educateur_id, 'outils_club_fin', 'Ton club ne fournit plus tes outils',
      case when v_offre and not v_perd_via then
        format('Ton club a changé de forfait : il n''a plus de place pour toi depuis le %s. '
          'Tu gardes le socle gratuit et tes données sont conservées. '
          'Tu peux reprendre les outils dont tu as besoin avec tes propres offres.', v_date)
      else
        format('Ton club ne fournit plus tes outils depuis le %s. Tes données sont conservées. '
          'Tu peux reprendre les outils dont tu as besoin avec tes propres offres.', v_date)
      end,
      '/educateur', false
    from (
      -- Rang de chaque éducateur accepté (même calcul que educateur_a_place).
      select a.educateur_id, row_number() over (order by a.depuis, a.educateur_id) as rang
      from (
        select ce.educateur_id, min(ce.created_at) as depuis
        from public.club_educateurs ce
        where ce.club_id = new.id and ce.statut = 'accepte' and ce.educateur_id is not null
        group by ce.educateur_id
      ) a
    ) r
    join public.profiles e on e.id = r.educateur_id and e.modele_outils is true
    where (
        v_perd_via
        or (v_offrait and r.rang <= coalesce(old.quota_equipes, 0)
            and not (v_offre and r.rang <= coalesce(new.quota_equipes, 0))
            -- Il recevait quelque chose : l'outil fourni à tous, ou un outil fourni à lui seul.
            and (v_offerts or exists (
              select 1 from public.outils_educateur_fournis f
              where f.club_id = new.id and f.educateur_id = r.educateur_id
                and public.outil_offert_par_club(f.outil)
            )))
      )
      -- Pas de doublon si plusieurs changements arrivent coup sur coup.
      and not exists (
        select 1 from public.notifications n
        where n.user_id = r.educateur_id and n.type = 'outils_club_fin' and n.lu is not true
          and n.created_at > now() - interval '1 hour'
      );
  exception when others then
    raise warning 'prevenir_fin_outils_club (club %) : %', new.id, sqlerrm;
  end;
  return null;
end;
$$;

drop function if exists public.rangs_places_club(uuid);
drop table if exists public.club_places_choisies;

commit;

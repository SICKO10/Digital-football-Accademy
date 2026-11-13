-- Outils fournis par le club : prévenir l'éducateur qui les perd (bloc 6 de
-- PLAN-outils-offerts.md).
--
-- Un déclencheur sur le profil du club compare la situation avant et après
-- chaque changement de forfait (abonnement_actif, palier, quota_equipes,
-- modele_outils, plan) et prévient, dans la table `notifications`, chaque
-- éducateur affilié qui perd ses outils :
-- - fin du forfait (abonnement terminé, forfait retiré, club sorti du nouveau
--   modèle) : tous ceux qui recevaient des outils du club ;
-- - forfait plus petit : ceux qui n'ont plus de place (rang au-delà du
--   nouveau quota, même rang que educateur_a_place).
-- Type `outils_club_fin`, une seule notification par éducateur et par
-- changement. Aucun email.
--
-- Le webhook Stripe n'est pas modifié : il écrit le profil du club comme
-- avant (outils_synchroniser_abonnement), le déclencheur suit. Une erreur
-- dans le déclencheur est avalée (avertissement dans les journaux) : elle ne
-- peut jamais faire échouer un paiement ou un changement de forfait.
--
-- Seuls les clubs du nouveau modèle (modele_outils vrai avant le changement)
-- sont concernés. La fermeture d'un outil par le club reste prévenue par
-- api/outils.js (type `outil_club_retire`).
--
-- Exécution : lancer d'abord ~/Sauvegardes-DigitalFootball/sauvegarder.sh, puis
-- ce fichier en entier, puis supabase_fin_outils_club_verification.sql.

begin;

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
  v_perd_via boolean;
  v_date text;
begin
  begin
    -- Même règle que club_offre_outils, avant et après le changement.
    v_offrait := (old.plan = 'club' and old.modele_outils is true and old.abonnement_actif is true
      and old.palier is not null) is true;
    v_offre := (new.plan = 'club' and new.modele_outils is true and new.abonnement_actif is true
      and new.palier is not null) is true;
    -- Outils fournis sans être détenus, ouverts par le club.
    v_offerts := exists (
      select 1 from public.outils_club_ouverts o
      where o.club_id = new.id and public.outil_offert_par_club(o.outil)
    );
    -- Stages, Projet sportif, CFF4 : reçus parce que le club les détient,
    -- perdus quand son abonnement s'arrête (règle `viaClub` de outils_actifs).
    v_perd_via := old.abonnement_actif is true and new.abonnement_actif is not true and exists (
      select 1 from public.outils_club_ouverts o
      join public.outils_comptes oc on oc.compte_id = o.club_id and oc.outil = o.outil
        and (oc.fin_le is null or oc.fin_le > now())
      where o.club_id = new.id and not public.outil_offert_par_club(o.outil)
    );
    if not (v_offrait and v_offerts) and not v_perd_via then
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
        or (v_offrait and v_offerts and r.rang <= coalesce(old.quota_equipes, 0)
            and not (v_offre and r.rang <= coalesce(new.quota_equipes, 0)))
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

revoke all on function public.prevenir_fin_outils_club() from public, anon, authenticated;

drop trigger if exists trigger_prevenir_fin_outils_club on public.profiles;
create trigger trigger_prevenir_fin_outils_club
  after update of plan, modele_outils, abonnement_actif, palier, quota_equipes on public.profiles
  for each row
  when (old.plan = 'club' and old.modele_outils is true)
  execute function public.prevenir_fin_outils_club();

commit;

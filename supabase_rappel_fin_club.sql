-- Chantier « le club offre les outils », suite, bloc 7 (PLAN-outils-offerts-suite.md) :
-- rappel automatique quand la fin du forfait d'un club approche (7 jours ou
-- moins). Cloche seulement, aucun email.
--
-- Contenu :
--   1. Table club_fin_rappel : marqueur « rappel déjà envoyé » pour la date de
--      fin d'un club. Un club, une ligne. Elle disparaît toute seule quand la
--      fin programmée disparaît (reprise ou fin réelle) ; si la date change, le
--      marqueur ne correspond plus et un nouveau rappel peut partir. Serveur seul.
--   2. rappeler_fin_programmee_clubs() : pour chaque club dont la fin tombe dans
--      les 7 jours qui viennent et pas encore rappelé, chaque éducateur concerné
--      (educateurs_prevenus_fin_club, mêmes règles que l'avis du bloc 5) reçoit
--      le rappel, une seule fois par date de fin :
--        - son avis du bloc 5 existe : il est réécrit en rappel et redevient non lu
--          (même ligne, donc retiré par la reprise du club ou remplacé à la fin
--          réelle comme avant, et l'encart de l'éducateur l'affiche déjà) ;
--        - il n'en a plus (effacé, ou éducateur devenu concerné depuis) : un avis
--          de type `outils_club_fin_prochaine` est créé avec le texte du rappel.
--      Pas de rappel si la résiliation a été faite moins de 7 jours avant la fin :
--      l'avis du bloc 5 vient d'être envoyé, un rappel serait un doublon.
--      Une erreur sur un club est avalée (avertissement dans les journaux) et
--      n'empêche pas les autres ; elle sera retentée le lendemain.
--   3. Tâche quotidienne pg_cron `rappel-fin-forfait-club`, tous les jours à
--      07:00 UTC (8 h en hiver, 9 h en été, heure de Paris).
--
-- Le webhook Stripe, la fonction outils_synchroniser_abonnement et les avis du
-- bloc 5 ne sont pas touchés. Clubs de l'ancien modèle : rien ne change.
--
-- Garde-fou : le script s'arrête sans rien changer si l'extension pg_cron n'est
-- pas disponible, si le bloc 5 n'est pas en place, ou s'il a déjà été lancé.
--
-- Exécution : lancer d'abord ~/Sauvegardes-DigitalFootball/sauvegarder.sh, puis
-- ce fichier en entier, puis supabase_rappel_fin_club_verification.sql.

begin;

-- ── 0. Garde-fou ─────────────────────────────────────────────────────────────

do $$
begin
  if to_regclass('public.club_fin_rappel') is not null then
    raise exception 'Déjà en place : rien à refaire. Lance seulement supabase_rappel_fin_club_verification.sql.';
  end if;
  if to_regclass('public.club_fin_programmee') is null or to_regclass('public.club_fin_avis') is null
     or to_regprocedure('public.educateurs_prevenus_fin_club(uuid)') is null then
    raise exception 'Le bloc 5 (supabase_fin_programmee_club.sql) n''est pas en place : rien n''a été changé.';
  end if;
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    raise exception 'L''extension pg_cron n''est pas disponible sur cette base : rien n''a été changé. Envoie ce message à Claude.';
  end if;
end $$;

-- Sur Supabase, l'extension peut aussi s'activer depuis Database > Extensions.
create extension if not exists pg_cron;

-- ── 1. Marqueur « rappel envoyé » ────────────────────────────────────────────

create table public.club_fin_rappel (
  club_id uuid primary key references public.club_fin_programmee(club_id) on delete cascade,
  fin_le timestamptz not null,
  envoye_le timestamptz not null default now(),
  nb_avis integer not null default 0
);

alter table public.club_fin_rappel enable row level security;

revoke all on public.club_fin_rappel from anon, authenticated;
grant all on public.club_fin_rappel to service_role;

-- ── 2. Le rappel ─────────────────────────────────────────────────────────────

-- Retourne le nombre d'avis écrits ou réécrits. Appelée chaque jour par pg_cron
-- (compte postgres) ; fermée aux comptes connectés.
create or replace function public.rappeler_fin_programmee_clubs()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_club record;
  v_edu uuid;
  v_date text;
  v_jours integer;
  v_delai text;
  v_titre text;
  v_contenu text;
  v_id text;
  v_nb integer;
  v_total integer := 0;
begin
  for v_club in
    select f.club_id, f.fin_le, f.programme_le
    from public.club_fin_programmee f
    where f.fin_le > now() and f.fin_le <= now() + interval '7 days'
      and not exists (
        select 1 from public.club_fin_rappel r
        where r.club_id = f.club_id and r.fin_le = f.fin_le
      )
    order by f.fin_le
  loop
    begin
      v_nb := 0;
      -- Résiliation faite dans la fenêtre des 7 jours : l'avis du bloc 5 vient
      -- d'être envoyé, pas de rappel (le marqueur évite de revenir y regarder).
      if v_club.programme_le <= v_club.fin_le - interval '7 days' then
        v_date := public.date_fin_texte(v_club.fin_le);
        v_jours := greatest(1, ceil(extract(epoch from (v_club.fin_le - now())) / 86400)::int);
        v_delai := case when v_jours = 1 then '1 jour' else v_jours::text || ' jours' end;
        v_titre := format('Rappel : ton club arrête son forfait le %s', v_date);
        v_contenu := format('Plus que %s : ton club arrête son forfait le %s. Les outils qu''il te fournit '
          'restent ouverts jusque-là, puis tu gardes le socle gratuit. Tes données sont conservées. '
          'Tu pourras reprendre les outils dont tu as besoin avec tes propres offres.', v_delai, v_date);

        for v_edu in
          select p.educateur_id from public.educateurs_prevenus_fin_club(v_club.club_id) p
        loop
          -- Avis du bloc 5 encore là : on le réécrit, il redevient non lu.
          update public.notifications n
          set titre = v_titre, contenu = v_contenu, lu = false, created_at = now()
          from public.club_fin_avis a
          where a.club_id = v_club.club_id and a.educateur_id = v_edu
            and n.id::text = a.notification_id and n.user_id = a.educateur_id;
          if not found then
            -- Pas d'avis (effacé, ou éducateur concerné depuis) : on en crée un.
            delete from public.club_fin_avis where club_id = v_club.club_id and educateur_id = v_edu;
            insert into public.notifications (user_id, type, titre, contenu, lien, lu)
            values (v_edu, 'outils_club_fin_prochaine', v_titre, v_contenu, '/educateur', false)
            returning id::text into v_id;
            insert into public.club_fin_avis (club_id, educateur_id, notification_id, fin_le)
            values (v_club.club_id, v_edu, v_id, v_club.fin_le);
          end if;
          v_nb := v_nb + 1;
        end loop;
      end if;

      insert into public.club_fin_rappel (club_id, fin_le, nb_avis)
      values (v_club.club_id, v_club.fin_le, v_nb)
      on conflict (club_id) do update set fin_le = excluded.fin_le, envoye_le = now(), nb_avis = excluded.nb_avis;
      v_total := v_total + v_nb;
    exception when others then
      -- Tout ce que ce club a reçu est annulé, il sera retenté demain.
      raise warning 'rappeler_fin_programmee_clubs (club %) : %', v_club.club_id, sqlerrm;
    end;
  end loop;
  return v_total;
end;
$$;

revoke all on function public.rappeler_fin_programmee_clubs() from public, anon, authenticated;
grant execute on function public.rappeler_fin_programmee_clubs() to service_role;

-- ── 3. Tâche quotidienne ─────────────────────────────────────────────────────

-- Remplace une tâche du même nom si elle existait.
select cron.schedule('rappel-fin-forfait-club', '0 7 * * *', 'select public.rappeler_fin_programmee_clubs()');

commit;

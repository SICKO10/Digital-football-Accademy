-- NE PAS EXÉCUTER sans en avoir parlé avec Claude.
--
-- Retour arrière du bloc 7 (PLAN-outils-offerts-suite.md), gardé pour mémoire.
-- Arrête la tâche quotidienne du rappel, supprime la fonction et le marqueur
-- des rappels envoyés. L'extension pg_cron est laissée en place. Les rappels
-- déjà envoyés restent dans la cloche des éducateurs (ce sont des avis comme
-- ceux du bloc 5) ; les avis du bloc 5, le webhook et le reste ne sont pas touchés.

begin;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'rappel-fin-forfait-club') then
    perform cron.unschedule('rappel-fin-forfait-club');
  end if;
end $$;

drop function if exists public.rappeler_fin_programmee_clubs();
drop table if exists public.club_fin_rappel;

commit;

-- Vérification du bloc 2 (supabase_outils_a_la_carte.sql). À lancer après le
-- fichier principal, puis coller le tableau de résultat. Chaque ligne doit
-- avoir ok = true.
--
-- Rien n'est conservé en base : la partie « scénario » prend un vrai couple
-- club / éducateur affilié, leur donne des outils fictifs, teste, puis annule
-- tout (sous-transaction annulée volontairement). Les tests « connecté en tant
-- que » simulent l'utilisateur le temps de la requête.

create or replace function pg_temp.scenario()
returns table (n int, test text, attendu text, obtenu text)
language plpgsql
as $$
declare
  v_club uuid;
  v_edu uuid;
  r jsonb := '[]'::jsonb;
  v text;
begin
  -- Couple club actif / éducateur affilié accepté, l'éducateur n'étant pas
  -- aussi dans le staff du club (sinon il lirait les outils du club).
  select ce.club_id, ce.educateur_id into v_club, v_edu
  from public.club_educateurs ce
  join public.profiles p on p.id = ce.club_id and p.abonnement_actif is true
  where ce.statut = 'accepte'
    and not exists (select 1 from public.staff_club sc where sc.club_id = ce.club_id and sc.user_id = ce.educateur_id)
  limit 1;

  if v_club is null then
    return query select 100, 'scénario'::text, 'couple trouvé'::text, 'aucun club actif avec éducateur affilié'::text;
    return;
  end if;

  begin
    insert into public.outils_comptes (compte_id, outil, source, fin_le) values
      (v_edu, 'seances', 'achat', null),
      (v_edu, 'tactique', 'essai', now() + interval '14 days'),
      (v_edu, 'prep_physique', 'essai', now() - interval '1 day'),
      (v_edu, 'evaluations_video', 'achat', now() + interval '5 days'),
      (v_club, 'cff4', 'achat', null),
      (v_club, 'stages', 'achat', now() - interval '1 day'),
      (v_club, 'projet_sportif', 'offre', now() + interval '10 days');
    insert into public.outils_club_ouverts (club_id, outil) values
      (v_club, 'stages'), (v_club, 'projet_sportif');

    r := r || jsonb_build_array(
      jsonb_build_array(101, 'achat en cours : outil actif', 'true', public.a_outil(v_edu, 'seances')::text),
      jsonb_build_array(102, 'essai en cours : outil actif', 'true', public.a_outil(v_edu, 'tactique')::text),
      jsonb_build_array(103, 'essai expiré : outil éteint', 'false', public.a_outil(v_edu, 'prep_physique')::text),
      jsonb_build_array(104, 'outil retiré encore payé : actif jusqu''à la fin de période', 'true', public.a_outil(v_edu, 'evaluations_video')::text),
      jsonb_build_array(105, 'outil jamais pris : éteint', 'false', public.a_outil(v_edu, 'suivi_joueurs')::text),
      jsonb_build_array(106, 'outil du club non ouvert aux éducateurs : éteint', 'false', public.a_outil(v_edu, 'cff4')::text),
      jsonb_build_array(107, 'outil ouvert mais retiré par le club (période finie) : éteint', 'false', public.a_outil(v_edu, 'stages')::text),
      jsonb_build_array(108, 'outil ouvert et actif chez le club : reçu', 'true', public.a_outil(v_edu, 'projet_sportif')::text),
      jsonb_build_array(109, 'compte inconnu : rien', 'false', public.a_outil(gen_random_uuid(), 'projet_sportif')::text),
      jsonb_build_array(110, 'le club a ses propres outils', 'true', public.a_outil(v_club, 'cff4')::text)
    );

    insert into public.outils_club_ouverts (club_id, outil) values (v_club, 'cff4');
    r := r || jsonb_build_array(jsonb_build_array(111, 'le club ouvre CFF4 : l''éducateur le reçoit', 'true', public.a_outil(v_edu, 'cff4')::text));

    -- Connecté en tant que l'éducateur
    perform set_config('request.jwt.claim.sub', v_edu::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_edu, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);

    r := r || jsonb_build_array(
      jsonb_build_array(120, 'éducateur : lit ses 4 lignes, pas celles du club', '4', (select count(*)::text from public.outils_comptes)),
      jsonb_build_array(121, 'éducateur : voit les 3 outils ouverts par son club', '3', (select count(*)::text from public.outils_club_ouverts)),
      jsonb_build_array(122, 'éducateur : outils actifs (3 à lui, 2 du club)', 'evaluations_video, seances, tactique, club:cff4, club:projet_sportif',
        (select string_agg(case when a.source = 'club' then 'club:' else '' end || a.outil, ', '
           order by a.source = 'club', a.outil)
         from public.outils_actifs(v_edu) a)),
      jsonb_build_array(123, 'éducateur : ne lit pas les outils actifs du club', '0', (select count(*)::text from public.outils_actifs(v_club)))
    );

    begin
      insert into public.outils_comptes (compte_id, outil, source) values (v_edu, 'tactique', 'achat');
      v := 'accepté';
    exception when insufficient_privilege then v := 'refusé';
    end;
    r := r || jsonb_build_array(jsonb_build_array(124, 'éducateur : s''offre un outil depuis le navigateur', 'refusé', v));

    begin
      update public.outils_comptes set fin_le = null where compte_id = v_edu;
      v := 'accepté';
    exception when insufficient_privilege then v := 'refusé';
    end;
    r := r || jsonb_build_array(jsonb_build_array(125, 'éducateur : prolonge son essai', 'refusé', v));

    begin
      insert into public.outils_essais_utilises (compte_id, outil) values (v_edu, 'tactique');
      v := 'accepté';
    exception when insufficient_privilege then v := 'refusé';
    end;
    r := r || jsonb_build_array(jsonb_build_array(126, 'éducateur : écrit dans les essais utilisés', 'refusé', v));

    begin
      insert into public.outils_club_ouverts (club_id, outil) values (v_club, 'competition');
      v := 'accepté';
    exception when insufficient_privilege then v := 'refusé';
    end;
    r := r || jsonb_build_array(jsonb_build_array(127, 'éducateur : ouvre un outil à la place du club', 'refusé', v));

    begin
      insert into public.outils_affichage_educateur (educateur_id, outil, visible) values (v_edu, 'tactique', false);
      v := 'accepté';
    exception when insufficient_privilege then v := 'refusé';
    end;
    r := r || jsonb_build_array(jsonb_build_array(128, 'éducateur : masque un outil de son menu', 'accepté', v));

    begin
      insert into public.outils_affichage_educateur (educateur_id, outil, visible) values (v_club, 'tactique', false);
      v := 'accepté';
    exception when insufficient_privilege then v := 'refusé';
    end;
    r := r || jsonb_build_array(jsonb_build_array(129, 'éducateur : change l''affichage d''un autre compte', 'refusé', v));

    begin
      update public.profiles set modele_outils = true where id = v_edu;
      v := 'accepté';
    exception when insufficient_privilege then v := 'refusé';
    end;
    r := r || jsonb_build_array(jsonb_build_array(130, 'éducateur : active lui-même modele_outils', 'refusé', v));

    -- Connecté en tant que le club
    perform set_config('request.jwt.claim.sub', v_club::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_club, 'role', 'authenticated')::text, true);

    r := r || jsonb_build_array(jsonb_build_array(140, 'club : lit ses 3 lignes, pas celles de l''éducateur', '3', (select count(*)::text from public.outils_comptes)));

    begin
      insert into public.outils_club_ouverts (club_id, outil) values (v_club, 'competition');
      delete from public.outils_club_ouverts where club_id = v_club and outil = 'competition';
      v := 'accepté';
    exception when insufficient_privilege then v := 'refusé';
    end;
    r := r || jsonb_build_array(jsonb_build_array(141, 'club : ouvre puis ferme un outil', 'accepté', v));

    raise exception using errcode = 'P0001', message = 'annulation du scénario';
  exception when sqlstate 'P0001' then
    null; -- tout ce qui a été écrit pendant le scénario est annulé ici
  end;

  return query
    select (e->>0)::int, e->>1, e->>2, e->>3 from jsonb_array_elements(r) e;
end
$$;

with tests(n, test, attendu, obtenu) as (
  -- Drapeau par compte
  select 1, 'colonne profiles.modele_outils, faux par défaut', 'false', (select column_default from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'modele_outils')
  union all select 2, 'utilisateur connecté ne peut pas modifier modele_outils (droit)', 'false', has_column_privilege('authenticated', 'public.profiles', 'modele_outils', 'UPDATE')::text
  union all select 3, 'utilisateur connecté peut lire modele_outils (droit)', 'true', has_column_privilege('authenticated', 'public.profiles', 'modele_outils', 'SELECT')::text
  union all select 4, 'comptes au nouveau modèle (0 avant le SQL des comptes de test, 3 après)', '0 ou 3', (select count(*)::text from public.profiles where modele_outils)
  -- Tables et règles
  union all select 10, 'les 4 tables existent', '4', (select count(*)::text from unnest(array['public.outils_comptes', 'public.outils_essais_utilises', 'public.outils_club_ouverts', 'public.outils_affichage_educateur']) t where to_regclass(t) is not null)
  union all select 11, 'RLS active sur les 4 tables', '4', (select count(*)::text from pg_class where oid in ('public.outils_comptes'::regclass, 'public.outils_essais_utilises'::regclass, 'public.outils_club_ouverts'::regclass, 'public.outils_affichage_educateur'::regclass) and relrowsecurity)
  union all select 12, 'règles d''accès (1 + 1 + 3 + 1)', '6', (select count(*)::text from pg_policies where schemaname = 'public' and tablename in ('outils_comptes', 'outils_essais_utilises', 'outils_club_ouverts', 'outils_affichage_educateur'))
  union all select 13, 'navigateur : pas d''écriture des achats et essais (droit)', 'false', (has_table_privilege('authenticated', 'public.outils_comptes', 'INSERT') or has_table_privilege('authenticated', 'public.outils_comptes', 'UPDATE') or has_table_privilege('authenticated', 'public.outils_comptes', 'DELETE') or has_table_privilege('authenticated', 'public.outils_essais_utilises', 'INSERT'))::text
  union all select 14, 'visiteur non connecté : aucune lecture (droit)', 'false', (has_table_privilege('anon', 'public.outils_comptes', 'SELECT') or has_table_privilege('anon', 'public.outils_club_ouverts', 'SELECT'))::text
  union all select 15, 'tables vides', '0', (select ((select count(*) from public.outils_comptes) + (select count(*) from public.outils_essais_utilises) + (select count(*) from public.outils_club_ouverts) + (select count(*) from public.outils_affichage_educateur))::text)
  -- Fonctions
  union all select 20, 'fonctions sécurisées (security definer)', '4', (select count(*)::text from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.prosecdef and p.proname in ('a_outil', 'outils_actifs', 'outils_gere_club', 'outils_educateur_du_club'))
  union all select 21, 'visiteur non connecté ne peut pas appeler a_outil', 'false', has_function_privilege('anon', 'public.a_outil(uuid, text)', 'execute')::text
  union all select 22, 'utilisateur connecté peut appeler a_outil', 'true', has_function_privilege('authenticated', 'public.a_outil(uuid, text)', 'execute')::text
  union all select * from pg_temp.scenario()
)
select n, test, attendu, obtenu, obtenu = any(string_to_array(attendu, ' ou ')) as ok
from tests
order by n;

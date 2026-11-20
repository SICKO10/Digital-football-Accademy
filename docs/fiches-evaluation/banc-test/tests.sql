\set ON_ERROR_STOP 1
\set clubA 'aaaaaaaa-0000-0000-0000-000000000001'
\set presA 'aaaaaaaa-0000-0000-0000-000000000002'
\set dirA  'aaaaaaaa-0000-0000-0000-000000000003'
\set prepA 'aaaaaaaa-0000-0000-0000-000000000004'
\set ecoA  'aaaaaaaa-0000-0000-0000-000000000005'
\set buvA  'aaaaaaaa-0000-0000-0000-000000000006'
\set clubB 'bbbbbbbb-0000-0000-0000-000000000001'
\set dirB  'bbbbbbbb-0000-0000-0000-000000000003'
\set eduB  'bbbbbbbb-0000-0000-0000-0000000000e1'
\set E1 'eeeeeeee-0000-0000-0000-000000000001'
\set E2 'eeeeeeee-0000-0000-0000-000000000002'
\set E3 'eeeeeeee-0000-0000-0000-000000000003'
\set I  'dddddddd-0000-0000-0000-000000000001'
\set P1 'ffffffff-0000-0000-0000-000000000001'
\set P2 'ffffffff-0000-0000-0000-000000000002'
\set X  'ffffffff-0000-0000-0000-000000000009'
\set PA 'cccccccc-0000-0000-0000-000000000001'
\set D  'cccccccc-0000-0000-0000-000000000002'

-- Outils de test
create table public.res (ordre serial, nom text, attendu text, obtenu text);
grant all on public.res to authenticated, anon; grant usage on sequence public.res_ordre_seq to authenticated, anon;
create function public.t(p_nom text, p_att text, p_obt text) returns void language sql as $$ insert into public.res(nom, attendu, obtenu) values (p_nom, p_att, coalesce(p_obt,'(null)')) $$;
create function public.n(p_sql text) returns text language plpgsql as $$ declare v bigint; begin execute 'select count(*) from (' || p_sql || ') x' into v; return v::text; exception when others then return 'ERR:' || left(sqlerrm, 70); end $$;
create table public.errs (id serial, msg text); grant all on public.errs to authenticated, anon; grant usage on sequence public.errs_id_seq to authenticated, anon;
create function public.e(p_sql text) returns text language plpgsql as $$ begin execute p_sql; return 'ok'; exception when others then insert into public.errs(msg) values (left(sqlerrm, 110)); return 'ERR:' || left(sqlerrm, 70); end $$;
create function public.m(p_sql text) returns text language plpgsql as $$ declare v bigint; begin execute p_sql; get diagnostics v = row_count; return v::text; exception when others then insert into public.errs(msg) values (left(sqlerrm, 110)); return 'ERR:' || left(sqlerrm, 70); end $$;
create function public.v(p_sql text) returns text language plpgsql as $$ declare r text; begin execute p_sql into r; return r; exception when others then return 'ERR:' || left(sqlerrm, 70); end $$;
grant execute on function public.t(text,text,text), public.n(text), public.e(text), public.m(text), public.v(text) to authenticated, anon;

-- Comptes
insert into profiles (id, plan) values
 (:'clubA','club'), (:'presA','staff'), (:'dirA','staff'), (:'prepA','staff'), (:'ecoA','staff'), (:'buvA','staff'),
 (:'clubB','club'), (:'dirB','staff'), (:'eduB','educateur'),
 (:'E1','educateur'), (:'E2','educateur'), (:'E3','educateur'), (:'I','educateur'),
 (:'P1','joueur'), (:'P2','joueur'), (:'X','joueur'), (:'PA','parent'), (:'D','dirigeant');
insert into staff_club (club_id, user_id, role) values
 (:'clubA',:'presA','president'), (:'clubA',:'dirA','directeur_sportif'), (:'clubA',:'prepA','preparateur_physique'),
 (:'clubA',:'ecoA','responsable_ecole_foot'), (:'clubA',:'buvA','responsable_buvette'), (:'clubB',:'dirB','directeur_sportif');
insert into club_educateurs (club_id, educateur_id, statut) values
 (:'clubA',:'E1','accepte'), (:'clubA',:'E2','accepte'), (:'clubA',:'E3','accepte'), (:'clubB',:'eduB','accepte');
insert into categories (id, club_id, nom, nom_cle) values
 ('20000000-0000-0000-0000-000000000001',:'clubA','U13','U13'), ('20000000-0000-0000-0000-000000000002',:'clubA','U15','U15'),
 ('20000000-0000-0000-0000-000000000003',:'clubA','U9','U9'), ('20000000-0000-0000-0000-000000000004',:'clubB','U13','U13');
insert into club_categories (id, club_id, nom, educateur_id, categorie_id) values
 ('30000000-0000-0000-0000-000000000001',:'clubA','U13',:'E1','20000000-0000-0000-0000-000000000001'),
 ('30000000-0000-0000-0000-000000000002',:'clubA','U15',:'E2','20000000-0000-0000-0000-000000000002'),
 ('30000000-0000-0000-0000-000000000003',:'clubA','U9',:'E3','20000000-0000-0000-0000-000000000003'),
 ('30000000-0000-0000-0000-000000000004',:'clubB','U13',:'eduB','20000000-0000-0000-0000-000000000004');
insert into equipe_joueurs (id, educateur_id, prenom, nom, poste, club_categorie_id, categorie_id) values
 ('10000000-0000-0000-0000-000000000001',:'E1','Paul','Un','Milieu central','30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001'),
 ('10000000-0000-0000-0000-000000000002',:'E1','Léa','Deux','Gardien','30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001'),
 ('10000000-0000-0000-0000-000000000003',:'E1','Sam','Trois','Latéral droit','30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001'),
 ('10000000-0000-0000-0000-000000000004',:'E2','Paul','Un','Ailier gauche','30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002'),
 ('10000000-0000-0000-0000-000000000005',:'I','Indé','Pendant',null,null,null),
 ('10000000-0000-0000-0000-000000000006',:'eduB','Bob','Club B',null,'30000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000004');
insert into affiliations (educateur_id, joueur_id, statut, equipe_joueur_id) values
 (:'E1',:'P1','accepte','10000000-0000-0000-0000-000000000001'),
 (:'E1',:'P2','accepte','10000000-0000-0000-0000-000000000002'),
 (:'E2',:'P1','accepte','10000000-0000-0000-0000-000000000004');
insert into parents_acces (joueur_id, parent_id, statut) values (:'P2',:'PA','accepte');
insert into dirigeant_acces (educateur_id, dirigeant_id, statut, permissions) values (:'E1',:'D','accepte','{"notes":"lecture"}');

-- Modèles (éditeur SQL, sans compte connecté)
insert into modeles_evaluation (id, club_id, nom) values ('40000000-0000-0000-0000-000000000001',:'clubA','Fiche U13 A'), ('40000000-0000-0000-0000-000000000002',:'clubB','Fiche U13 B');
insert into modeles_evaluation (id, educateur_id, nom) values ('40000000-0000-0000-0000-000000000003',:'I','Fiche indé');
insert into modeles_evaluation_versions (id, modele_id) values
 ('50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001'),
 ('50000000-0000-0000-0000-000000000003','40000000-0000-0000-0000-000000000002'),
 ('50000000-0000-0000-0000-000000000004','40000000-0000-0000-0000-000000000003');
insert into criteres_evaluation (id, version_id, type, pilier, libelle, sens) values
 ('60000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','note','Tactique','Se replace',null),
 ('60000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000001','test','Physique','Sprint 10 m','plus_bas'),
 ('60000000-0000-0000-0000-000000000003','50000000-0000-0000-0000-000000000001','oui_non','Technique','Deux pieds',null),
 ('60000000-0000-0000-0000-000000000004','50000000-0000-0000-0000-000000000001','commentaire','Mental','Commentaire',null),
 ('60000000-0000-0000-0000-000000000005','50000000-0000-0000-0000-000000000003','note','Tactique','B',null),
 ('60000000-0000-0000-0000-000000000006','50000000-0000-0000-0000-000000000004','note','Tactique','I',null);
update modeles_evaluation_versions set publiee_le = now();
insert into modeles_evaluation_versions (id, modele_id) values ('50000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001');
insert into criteres_evaluation (id, version_id, type, pilier, libelle) values ('60000000-0000-0000-0000-000000000007','50000000-0000-0000-0000-000000000002','note','Tactique','brouillon');

\set as_E1   'reset role; select set_config(''bench.uid'', ''eeeeeeee-0000-0000-0000-000000000001'', false); set role authenticated;'
\set as_E2   'reset role; select set_config(''bench.uid'', ''eeeeeeee-0000-0000-0000-000000000002'', false); set role authenticated;'
\set as_E3   'reset role; select set_config(''bench.uid'', ''eeeeeeee-0000-0000-0000-000000000003'', false); set role authenticated;'
\set as_I    'reset role; select set_config(''bench.uid'', ''dddddddd-0000-0000-0000-000000000001'', false); set role authenticated;'
\set as_clubA 'reset role; select set_config(''bench.uid'', ''aaaaaaaa-0000-0000-0000-000000000001'', false); set role authenticated;'
\set as_presA 'reset role; select set_config(''bench.uid'', ''aaaaaaaa-0000-0000-0000-000000000002'', false); set role authenticated;'
\set as_dirA 'reset role; select set_config(''bench.uid'', ''aaaaaaaa-0000-0000-0000-000000000003'', false); set role authenticated;'
\set as_prepA 'reset role; select set_config(''bench.uid'', ''aaaaaaaa-0000-0000-0000-000000000004'', false); set role authenticated;'
\set as_ecoA 'reset role; select set_config(''bench.uid'', ''aaaaaaaa-0000-0000-0000-000000000005'', false); set role authenticated;'
\set as_buvA 'reset role; select set_config(''bench.uid'', ''aaaaaaaa-0000-0000-0000-000000000006'', false); set role authenticated;'
\set as_dirB 'reset role; select set_config(''bench.uid'', ''bbbbbbbb-0000-0000-0000-000000000003'', false); set role authenticated;'
\set as_P1   'reset role; select set_config(''bench.uid'', ''ffffffff-0000-0000-0000-000000000001'', false); set role authenticated;'
\set as_P2   'reset role; select set_config(''bench.uid'', ''ffffffff-0000-0000-0000-000000000002'', false); set role authenticated;'
\set as_X    'reset role; select set_config(''bench.uid'', ''ffffffff-0000-0000-0000-000000000009'', false); set role authenticated;'
\set as_PA   'reset role; select set_config(''bench.uid'', ''cccccccc-0000-0000-0000-000000000001'', false); set role authenticated;'
\set as_D    'reset role; select set_config(''bench.uid'', ''cccccccc-0000-0000-0000-000000000002'', false); set role authenticated;'
\set as_admin 'reset role; select set_config(''bench.uid'', '''', false);'
\set as_anon 'reset role; select set_config(''bench.uid'', '''', false); set role anon;'

\o /dev/null
-- ===== Éducateur responsable E1 =====
:as_E1
select t('E1 crée une évaluation', 'ok', e($$insert into evaluations (id, equipe_joueur_id, version_id, saison) values ('70000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','2026-2027')$$));
select t('contexte posé par la base (club, éducateur, joueur, nom, catégorie, poste)', 'aaaaaaaa-0000-0000-0000-000000000001/eeeeeeee-0000-0000-0000-000000000001/ffffffff-0000-0000-0000-000000000001/Paul Un/U13/milieu',
  v($$select club_id||'/'||educateur_id||'/'||joueur_id||'/'||joueur_nom||'/'||categorie_cle||'/'||poste from evaluations where id='70000000-0000-0000-0000-000000000001'$$));
select t('E1 saisit une note 2', 'ok', e($$insert into evaluation_resultats (evaluation_id, critere_id, note) values ('70000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001',2)$$));
select t('note 4 refusée (échelle 1 à 3)', 'ERR:new row for relation "evaluation_resultats" violates check', e($$update evaluation_resultats set note = 4 where evaluation_id='70000000-0000-0000-0000-000000000001'$$));
select t('valeur chiffrée sur un critère noté refusée', 'ERR:valeur incompatible', e($$update evaluation_resultats set valeur = 3 where evaluation_id='70000000-0000-0000-0000-000000000001'$$));
select t('critère d''un autre modèle refusé', 'ERR:ce critère', e($$insert into evaluation_resultats (evaluation_id, critere_id, note) values ('70000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000005',2)$$));
select t('modèle du club B refusé', 'ERR:le modèle doit', e($$insert into evaluations (equipe_joueur_id, version_id, saison) values ('10000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000003','2026-2027')$$));
select t('version en brouillon refusée', 'ERR:version de modèle non publiée', e($$insert into evaluations (equipe_joueur_id, version_id, saison) values ('10000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000002','2026-2027')$$));
select t('joueur du club B refusé', 'ERR', e($$insert into evaluations (equipe_joueur_id, version_id, saison) values ('10000000-0000-0000-0000-000000000006','50000000-0000-0000-0000-000000000001','2026-2027')$$));
select t('E1 brouillon ev2 + ev3 (mineure)', 'ok/ok',
  e($$insert into evaluations (id, equipe_joueur_id, version_id, saison) values ('70000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','2026-2027')$$) || '/' ||
  e($$insert into evaluations (id, equipe_joueur_id, version_id, saison) values ('70000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000001','2026-2027')$$));
select t('E1 notes : privée, staff transmissible, staff non transmissible, privée « transmissible »', 'ok/ok/ok/ok',
  e($$insert into notes_suivi (id, equipe_joueur_id, texte) values ('80000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','privée')$$) || '/' ||
  e($$insert into notes_suivi (id, equipe_joueur_id, texte, visibilite, transmissible) values ('80000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','staff transmise','staff',true)$$) || '/' ||
  e($$insert into notes_suivi (id, equipe_joueur_id, texte, visibilite) values ('80000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','staff gardée','staff')$$) || '/' ||
  e($$insert into notes_suivi (id, equipe_joueur_id, texte, transmissible) values ('80000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001','privée 2', true)$$));
select t('note privée jamais transmissible', 'false', v($$select transmissible::text from notes_suivi where id='80000000-0000-0000-0000-000000000004'$$));
select t('E1 termine ev1', '1/true', m($$update evaluations set statut='terminee' where id='70000000-0000-0000-0000-000000000001'$$) || '/' || v($$select (termine_le is not null)::text from evaluations where id='70000000-0000-0000-0000-000000000001'$$));
select m($$update evaluations set educateur_id='eeeeeeee-0000-0000-0000-000000000003', club_id='bbbbbbbb-0000-0000-0000-000000000001' where id='70000000-0000-0000-0000-000000000001'$$);
select t('éducateur et club figés', 'eeeeeeee-0000-0000-0000-000000000001/aaaaaaaa-0000-0000-0000-000000000001',
  v($$select educateur_id||'/'||club_id from evaluations where id='70000000-0000-0000-0000-000000000001'$$));
select t('séance de tests : note refusée, test accepté', 'ok/ERR:une séance de tests ne/ok/1',
  e($$insert into evaluations (id, equipe_joueur_id, version_id, saison, nature) values ('70000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','2026-2027','tests')$$) || '/' ||
  left(e($$insert into evaluation_resultats (evaluation_id, critere_id, note) values ('70000000-0000-0000-0000-000000000004','60000000-0000-0000-0000-000000000001',2)$$), 26) || '/' ||
  e($$insert into evaluation_resultats (evaluation_id, critere_id, valeur) values ('70000000-0000-0000-0000-000000000004','60000000-0000-0000-0000-000000000002',1.85)$$) || '/' ||
  m($$update evaluations set statut='terminee' where id='70000000-0000-0000-0000-000000000004'$$));

-- ===== Autre éducateur du club (E3) =====
:as_E3
select t('E3 : rien sur les joueurs de E1 (évaluations/résultats/notes)', '0/0/0', n('select * from evaluations') || '/' || n('select * from evaluation_resultats') || '/' || n('select * from notes_suivi'));
select t('E3 ne crée pas d''évaluation sur un joueur de E1', 'ERR', e($$insert into evaluations (equipe_joueur_id, version_id, saison) values ('10000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','2026-2027')$$));
select t('E3 ne modifie pas ev1', '0', m($$update evaluations set commentaire='x' where id='70000000-0000-0000-0000-000000000001'$$));

-- ===== Nouvel éducateur du joueur après changement de catégorie (E2) =====
:as_E2
select t('E2 lit les évaluations TERMINÉES de P1 (ev1, ev4), pas le brouillon ni la mineure', '2', n('select * from evaluations'));
select t('E2 lit les résultats de ev1 et ev4', '2', n('select * from evaluation_resultats'));
select t('E2 lit seulement la note staff transmissible', '1/80000000-0000-0000-0000-000000000002', n('select * from notes_suivi') || '/' || v('select id::text from notes_suivi'));
select t('E2 ne modifie pas ev1, n''ajoute pas de résultat', '0/ERR', m($$update evaluations set commentaire='x' where id='70000000-0000-0000-0000-000000000001'$$) || '/' ||
  left(e($$insert into evaluation_resultats (evaluation_id, critere_id, oui_non) values ('70000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000003',true)$$), 3));
:as_admin
insert into parametres_evaluation (proprietaire_id, proprietaire_type, transmettre_evaluations) values (:'clubA','club',false);
:as_E2
select t('club : évaluations non transmises → E2 ne voit que les tests', '1', n('select * from evaluations'));
:as_admin
update parametres_evaluation set transmettre_tests = false, transmettre_notes = false;
:as_E2
select t('club : rien transmis → E2 ne voit rien', '0/0', n('select * from evaluations') || '/' || n('select * from notes_suivi'));
:as_admin
update parametres_evaluation set transmettre_evaluations = true, transmettre_tests = true, transmettre_notes = true;

-- ===== Directeur sportif A =====
:as_dirA
select t('directeur lit tout le club (4 évaluations, 2 notes staff)', '4/2', n('select * from evaluations') || '/' || n('select * from notes_suivi'));
select t('directeur : pas d''écriture par défaut', '0/ERR', m($$update evaluations set commentaire='x'$$) || '/' ||
  left(e($$insert into evaluations (equipe_joueur_id, version_id, saison) values ('10000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','2026-2027')$$), 3));
:as_admin
insert into role_permissions (club_id, role, section, can_view, can_edit) values (:'clubA','directeur_sportif','evaluations',true,true);
:as_dirA
select t('club règle l''écriture pour le directeur', '3', m($$update evaluations set commentaire='dir' where nature='evaluation'$$));
:as_admin
delete from role_permissions where section = 'evaluations';
insert into role_categories_access (club_id, role, categories, acces_complet) values (:'clubA','directeur_sportif','["U11"]',false);
:as_dirA
select t('périmètre du club respecté (directeur limité aux U11)', '0/0', n('select * from evaluations') || '/' || n('select * from notes_suivi'));
:as_admin
delete from role_categories_access;

-- ===== Préparateur physique A =====
:as_prepA
select t('préparateur : tests seulement (ev4)', '1/70000000-0000-0000-0000-000000000004', n('select * from evaluations') || '/' || v('select id::text from evaluations'));
select t('préparateur crée une séance de tests (éducateur = celui du joueur)', 'ok/eeeeeeee-0000-0000-0000-000000000001/ok',
  e($$insert into evaluations (id, equipe_joueur_id, version_id, saison, nature) values ('70000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000001','2026-2027','tests')$$) || '/' ||
  v($$select educateur_id::text from evaluations where id='70000000-0000-0000-0000-000000000005'$$) || '/' ||
  e($$insert into evaluation_resultats (evaluation_id, critere_id, valeur) values ('70000000-0000-0000-0000-000000000005','60000000-0000-0000-0000-000000000002',2.01)$$));
select t('préparateur ne crée pas d''évaluation complète', 'ERR', e($$insert into evaluations (equipe_joueur_id, version_id, saison) values ('10000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000001','2026-2027')$$));
select t('préparateur : lit les notes staff, écrit la sienne, ne modifie pas celle de E1', '2/ok/0',
  n('select * from notes_suivi') || '/' ||
  e($$insert into notes_suivi (id, equipe_joueur_id, texte, visibilite) values ('80000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000002','prep','staff')$$) || '/' ||
  m($$update notes_suivi set texte='x' where id='80000000-0000-0000-0000-000000000002'$$));

-- ===== Responsable école de foot, buvette, club B =====
:as_ecoA
select t('responsable école de foot (U7-U10) : rien en U13', '0/0', n('select * from evaluations') || '/' || n('select * from notes_suivi'));
:as_buvA
select t('responsable buvette : rien', '0/0/0/0', n('select * from evaluations') || '/' || n('select * from evaluation_resultats') || '/' || n('select * from notes_suivi') || '/' || n('select * from journal_acces_evaluations'));
:as_dirB
select t('directeur du club B : rien du club A, aucune création', '0/0/0/ERR', n('select * from evaluations') || '/' || n('select * from notes_suivi') || '/' || n('select * from journal_acces_evaluations') || '/' ||
  left(e($$insert into evaluations (equipe_joueur_id, version_id, saison) values ('10000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000003','2026-2027')$$), 3));

-- ===== Président, compte du club =====
:as_presA
select t('président : lit 5 évaluations et 3 notes staff, ne modifie pas', '5/3/0', n('select * from evaluations') || '/' || n('select * from notes_suivi') || '/' || m($$update evaluations set commentaire='p'$$));
select t('président supprime une note (RGPD) → inscrite au journal', '1/1', m($$delete from notes_suivi where id='80000000-0000-0000-0000-000000000003'$$) || '/' || n($$select * from journal_acces_evaluations where objet='suppression_note'$$));
:as_clubA
select t('compte du club : 5 évaluations, journal lisible', '5/1', n('select * from evaluations') || '/' || n('select * from journal_acces_evaluations'));

-- ===== Dirigeant délégué de E1 (notes : lecture) =====
:as_D
select t('dirigeant : lit les évaluations de E1 et ses notes staff, pas les privées (dont celle du préparateur sur un joueur de E1), ne modifie pas', '5/2/0',
  n('select * from evaluations') || '/' || n('select * from notes_suivi') || '/' || m($$update evaluations set commentaire='d'$$));

-- ===== Joueur majeur P1 =====
:as_P1
select t('P1 : évaluation terminée mais non visible → rien', '0', n('select * from evaluations'));
:as_E1
select m($$update evaluations set visible_joueur = true where id in ('70000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000002')$$);
:as_P1
select t('P1 : visible et terminée → lit ev1 et ses résultats ; brouillon visible caché ; aucune note', '1/1/0', n('select * from evaluations') || '/' || n('select * from evaluation_resultats') || '/' || n('select * from notes_suivi'));
:as_E1
select m($$update evaluations set autorise_prefill_joueur = true where id = '70000000-0000-0000-0000-000000000002'$$);
select e($$insert into evaluation_resultats (evaluation_id, critere_id, note) values ('70000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000001',1)$$);
:as_P1
select t('P1 : pré-remplissage ouvert → lit l''en-tête de ev2, pas la note de l''éducateur', '2/1', n('select * from evaluations') || '/' || n('select * from evaluation_resultats'));
select t('P1 : écrit son auto-évaluation, pas la note de l''éducateur', 'ok/ERR/0',
  e($$insert into evaluation_resultats (evaluation_id, critere_id, note, source) values ('70000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000001',3,'joueur')$$) || '/' ||
  left(e($$insert into evaluation_resultats (evaluation_id, critere_id, oui_non, source) values ('70000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000003',true,'educateur')$$), 3) || '/' ||
  m($$update evaluation_resultats set note = 3 where source = 'educateur'$$));
select t('P1 : ne modifie pas l''en-tête', '0', m($$update evaluations set visible_joueur = true, verrouillee_joueur = false$$));
:as_E1
select t('E1 voit l''auto-évaluation', '1', n($$select * from evaluation_resultats where source='joueur'$$));
select m($$update evaluations set verrouillee_joueur = true where id = '70000000-0000-0000-0000-000000000002'$$);
:as_P1
select t('P1 : verrouillé → plus de modification ni d''ajout', '0/ERR', m($$update evaluation_resultats set note = 2 where source='joueur'$$) || '/' ||
  left(e($$insert into evaluation_resultats (evaluation_id, critere_id, oui_non, source) values ('70000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000003',true,'joueur')$$), 3));
select t('P1 : lit les critères et le nom du modèle via son évaluation, rien du club B', '4/1/0',
  n($$select * from criteres_evaluation where version_id='50000000-0000-0000-0000-000000000001'$$) || '/' ||
  n('select * from modeles_evaluation') || '/' || n($$select * from criteres_evaluation where version_id='50000000-0000-0000-0000-000000000003'$$));
select t('P1 ne voit pas l''évaluation de P2', '0', n($$select * from evaluations where id='70000000-0000-0000-0000-000000000003'$$));

-- ===== Joueuse mineure P2 et son parent PA =====
:as_E1
select m($$update evaluations set statut='terminee', visible_joueur = true where id = '70000000-0000-0000-0000-000000000003'$$);
select e($$insert into evaluation_resultats (evaluation_id, critere_id, note) values ('70000000-0000-0000-0000-000000000003','60000000-0000-0000-0000-000000000001',3)$$);
:as_P2
select t('P2 lit son évaluation visible (et rien de P1)', '1/1', n('select * from evaluations') || '/' || n('select * from evaluation_resultats'));
:as_PA
select t('parent : lit l''évaluation de son enfant et ses résultats, aucune note, rien de P1', '1/1/0', n('select * from evaluations') || '/' || n('select * from evaluation_resultats') || '/' || n('select * from notes_suivi'));
:as_E1
select m($$update evaluations set autorise_prefill_joueur = true where id = '70000000-0000-0000-0000-000000000003'$$);
:as_PA
select t('parent : n''écrit jamais l''auto-évaluation', 'ERR', e($$insert into evaluation_resultats (evaluation_id, critere_id, note, source) values ('70000000-0000-0000-0000-000000000003','60000000-0000-0000-0000-000000000001',2,'joueur')$$));
:as_P2
select t('P2 écrit son auto-évaluation', 'ok', e($$insert into evaluation_resultats (evaluation_id, critere_id, note, source) values ('70000000-0000-0000-0000-000000000003','60000000-0000-0000-0000-000000000001',2,'joueur')$$));
:as_PA
select t('parent lit l''auto-évaluation de son enfant', '2', n('select * from evaluation_resultats'));

-- ===== Compte qui s'attache lui-même à une ligne d'effectif =====
:as_admin
update equipe_joueurs set joueur_id = :'X' where id = '10000000-0000-0000-0000-000000000003';
:as_E1
select e($$insert into evaluations (id, equipe_joueur_id, version_id, saison, statut, visible_joueur) values ('70000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000003','50000000-0000-0000-0000-000000000001','2026-2027','terminee',true)$$);
:as_X
select t('lien posé sans affiliation acceptée : aucun accès', '0', n('select * from evaluations'));
:as_admin
select t('évaluation de J3 sans compte joueur', '(null)', coalesce((select joueur_id::text from evaluations where id='70000000-0000-0000-0000-000000000006'), '(null)'));

-- ===== Éducateur indépendant =====
:as_I
select t('indépendant : son modèle ok (sans club), celui du club A refusé', 'ok/(null)/ERR',
  e($$insert into evaluations (id, equipe_joueur_id, version_id, saison) values ('70000000-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000005','50000000-0000-0000-0000-000000000004','2026-2027')$$) || '/' ||
  coalesce(v($$select club_id::text from evaluations where id='70000000-0000-0000-0000-000000000007'$$), '(null)') || '/' ||
  left(e($$insert into evaluations (equipe_joueur_id, version_id, saison) values ('10000000-0000-0000-0000-000000000005','50000000-0000-0000-0000-000000000001','2026-2027')$$), 3));
select t('indépendant : ne voit que la sienne', '1', n('select * from evaluations'));
:as_presA
select t('club A ne voit pas l''évaluation de l''indépendant', '0', n($$select * from evaluations where id='70000000-0000-0000-0000-000000000007'$$));

-- ===== Verrou des outils à la carte =====
:as_admin
update profiles set modele_outils = true where id = :'E1';
:as_E1
select t('E1 sans l''outil suivi : rien, aucune création', '0/0/ERR', n('select * from evaluations') || '/' || n('select * from notes_suivi') || '/' ||
  left(e($$insert into evaluations (equipe_joueur_id, version_id, saison) values ('10000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','2026-2027')$$), 3));
:as_admin
insert into outils_comptes values (:'E1', 'prep_physique');
:as_E1
select t('E1 avec l''outil préparation physique seulement : les tests', '2', n('select * from evaluations'));
:as_admin
update profiles set modele_outils = false where id = :'E1';

-- ===== Protection des modèles, visiteurs =====
:as_clubA
select t('modèle utilisé par une évaluation : suppression impossible', 'ERR', left(e($$delete from modeles_evaluation where id='40000000-0000-0000-0000-000000000001'$$), 3));
:as_anon
select t('visiteur : aucun accès (4 tables)', 'ERR/ERR/ERR/ERR', left(e('select 1 from evaluations'),3) || '/' || left(e('select 1 from evaluation_resultats'),3) || '/' || left(e('select 1 from notes_suivi'),3) || '/' || left(e('select 1 from journal_acces_evaluations'),3));
select t('visiteur : fonction de journal refusée', 'ERR', left(e($$select noter_acces_evaluations('10000000-0000-0000-0000-000000000004','historique')$$),3));

-- ===== Journal des accès =====
:as_E2
select t('E2 note l''ouverture de l''historique ; ne lit pas le journal ; pas d''écriture directe', 'ok/0/ERR',
  e($$select noter_acces_evaluations('10000000-0000-0000-0000-000000000004','historique')$$) || '/' || n('select * from journal_acces_evaluations') || '/' ||
  left(e($$insert into journal_acces_evaluations (club_id, objet) values ('aaaaaaaa-0000-0000-0000-000000000001','notes')$$),3));
:as_X
select t('compte hors club : journal refusé', 'ERR:accès refusé', e($$select noter_acces_evaluations('10000000-0000-0000-0000-000000000001','historique')$$));
:as_clubA
select t('club lit son journal (suppression + historique), ne le modifie pas', '2/ERR', n('select * from journal_acces_evaluations') || '/' || left(m($$delete from journal_acces_evaluations$$),3));
:as_dirA
select t('directeur (réglages) lit le journal', '2', n('select * from journal_acces_evaluations'));

-- ===== Anciennes fiches (correction de club_lit_evaluations) =====
:as_admin
insert into evaluations_joueur (equipe_joueur_id, educateur_id, saison, periode) values ('10000000-0000-0000-0000-000000000001', :'E1', '2026-2027', 'debut');
:as_clubA
select t('ancienne fiche : compte du club la lit', '1', n('select * from evaluations_joueur'));
:as_presA
select t('ancienne fiche : président la lit', '1', n('select * from evaluations_joueur'));
:as_dirA
select t('ancienne fiche : directeur la lit', '1', n('select * from evaluations_joueur'));
:as_prepA
select t('ancienne fiche : préparateur ne la lit plus', '0', n('select * from evaluations_joueur'));
:as_buvA
select t('ancienne fiche : buvette ne la lit plus', '0', n('select * from evaluations_joueur'));
:as_ecoA
select t('ancienne fiche : école de foot (hors périmètre) ne la lit pas', '0', n('select * from evaluations_joueur'));
:as_E1
select t('ancienne fiche : son éducateur la lit toujours', '1', n('select * from evaluations_joueur'));

-- ===== Suppressions de comptes et de lignes =====
:as_admin
select e($$delete from equipe_joueurs where id='10000000-0000-0000-0000-000000000003'$$);
select t('ligne d''effectif supprimée : l''évaluation reste au club', '1/(null)',
  n($$select * from evaluations where id='70000000-0000-0000-0000-000000000006'$$) || '/' || coalesce((select equipe_joueur_id::text from evaluations where id='70000000-0000-0000-0000-000000000006'), '(null)'));
select e($$delete from profiles where id='aaaaaaaa-0000-0000-0000-000000000004'$$);
select t('compte du préparateur supprimé : sa séance reste, auteur vidé', '1/(null)',
  n($$select * from evaluations where id='70000000-0000-0000-0000-000000000005'$$) || '/' || coalesce((select auteur_id::text from evaluations where id='70000000-0000-0000-0000-000000000005'), '(null)'));
select t('compte d''un indépendant dont le modèle a servi : suppression bloquée', 'ERR', left(e($$delete from profiles where id='dddddddd-0000-0000-0000-000000000001'$$),3));

\o
reset role;
select ordre, case when obtenu like attendu || '%' then 'ok' else 'ÉCHEC' end as res, nom, attendu, obtenu from res order by ordre;
select count(*) filter (where obtenu like attendu || '%') || '/' || count(*) as total from res;
select msg, count(*) from errs group by msg order by 1;

-- erreurs détaillées
select msg, count(*) from errs group by msg order by 1;

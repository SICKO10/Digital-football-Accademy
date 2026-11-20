-- Bloc 11a : tests (à la suite de l'en-tête de tests.sql : comptes, équipes, modèles)
\o /dev/null
:as_admin
insert into equipe_joueurs (id, educateur_id, prenom, nom, club_categorie_id, categorie_id) values
 ('10000000-0000-0000-0000-000000000007',:'E1','Tom','Sept','30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001');
insert into evaluations_joueur (id, equipe_joueur_id, educateur_id, saison, periode, visible_joueur) values
 ('80000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',:'E1','2026-2027','debut',true),
 ('80000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002',:'E1','2026-2027','debut',true);

-- ===== A. Interrupteur des conditions ÉTEINT : rien n'est bloqué =====
:as_E1
select t('A1 éteint : E1 crée une évaluation (Paul)', 'ok', e($$insert into evaluations (id, equipe_joueur_id, version_id, saison) values ('71000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','2026-2027')$$));
select t('A2 éteint : E1 crée une évaluation (Léa)', 'ok', e($$insert into evaluations (id, equipe_joueur_id, version_id, saison) values ('71000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000001','2026-2027')$$));
select t('A3 éteint : E1 crée une évaluation (Sam, sans compte)', 'ok', e($$insert into evaluations (id, equipe_joueur_id, version_id, saison) values ('71000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000003','50000000-0000-0000-0000-000000000001','2026-2027')$$));
select t('A4 éteint : E1 écrit une note (Sam)', 'ok', e($$insert into notes_suivi (id, equipe_joueur_id, texte, visibilite) values ('72000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000003','Bon placement','staff')$$));
select t('A5 éteint : E1 écrit une note (Léa)', 'ok', e($$insert into notes_suivi (id, equipe_joueur_id, texte, visibilite) values ('72000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','Note Léa','privee')$$));
select t('A6 éteint : E1 crée une évaluation (Tom)', 'ok', e($$insert into evaluations (id, equipe_joueur_id, version_id, saison) values ('71000000-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000007','50000000-0000-0000-0000-000000000001','2026-2027')$$));
select t('A7 résultat sur l''évaluation de Sam', 'ok', e($$insert into evaluation_resultats (evaluation_id, critere_id, note) values ('71000000-0000-0000-0000-000000000003','60000000-0000-0000-0000-000000000001',2)$$));
select t('A8 éteint : conditions considérées acceptées', 'true', v($$select public.conditions_evaluation_acceptees('aaaaaaaa-0000-0000-0000-000000000001')::text$$));
:as_presA
select t('A9 éteint : accepter est impossible (aucune version)', 'ERR:aucune version', e($$select public.accepter_conditions_evaluation('aaaaaaaa-0000-0000-0000-000000000001','v1')$$));
:as_I
select t('A10 éteint : indépendant crée une évaluation', 'ok', e($$insert into evaluations (id, equipe_joueur_id, version_id, saison) values ('71000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000005','50000000-0000-0000-0000-000000000004','2026-2027')$$));

-- ===== B. Demandes de correction =====
:as_E1
select e($$update evaluations set statut = 'terminee', visible_joueur = true where id = '71000000-0000-0000-0000-000000000001'$$);
:as_P1
select t('B1 joueur : demande sur son évaluation terminée et visible', 'ok', e($$insert into demandes_correction_evaluation (id, evaluation_id, message, statut, reponse) values ('73000000-0000-0000-0000-000000000001','71000000-0000-0000-0000-000000000001','  Ma note de placement est fausse  ','traitee','triche')$$));
select t('B2 posé par la base : joueur, club, éducateur, statut reçue, réponse vide, échéance +1 mois, message nettoyé',
  'joueur/aaaaaaaa-0000-0000-0000-000000000001/eeeeeeee-0000-0000-0000-000000000001/recue//' || ((current_date + interval '1 month')::date)::text || '/Ma note de placement est fausse',
  v($$select demandeur_type||'/'||club_id||'/'||educateur_id||'/'||statut||'/'||reponse||'/'||echeance||'/'||message from demandes_correction_evaluation where id='73000000-0000-0000-0000-000000000001'$$));
select t('B3 joueur : demande sur l''évaluation d''un autre refusée', 'ERR:évaluation non visible', e($$insert into demandes_correction_evaluation (evaluation_id, message) values ('71000000-0000-0000-0000-000000000002','x')$$));
select t('B4 joueur : ancienne fiche visible, demande acceptée, club retrouvé', 'ok', e($$insert into demandes_correction_evaluation (id, ancienne_fiche_id, message) values ('73000000-0000-0000-0000-000000000004','80000000-0000-0000-0000-000000000001','Ancienne fiche fausse')$$));
select t('B5 club de la demande sur ancienne fiche', 'aaaaaaaa-0000-0000-0000-000000000001', v($$select club_id::text from demandes_correction_evaluation where id='73000000-0000-0000-0000-000000000004'$$));
select t('B6 deux identifiants à la fois refusés', 'ERR:une évaluation à préciser', e($$insert into demandes_correction_evaluation (evaluation_id, ancienne_fiche_id, message) values ('71000000-0000-0000-0000-000000000001','80000000-0000-0000-0000-000000000001','x')$$));
select t('B7 message vide refusé', 'ERR:new row', e($$insert into demandes_correction_evaluation (evaluation_id, message) values ('71000000-0000-0000-0000-000000000001','   ')$$));
select t('B8 message de 501 caractères refusé', 'ERR:new row', e($$insert into demandes_correction_evaluation (evaluation_id, message) values ('71000000-0000-0000-0000-000000000001', repeat('a', 501))$$));
select e($$insert into demandes_correction_evaluation (evaluation_id, message) values ('71000000-0000-0000-0000-000000000001','deux')$$);
select e($$insert into demandes_correction_evaluation (evaluation_id, message) values ('71000000-0000-0000-0000-000000000001','trois')$$);
select t('B9 quatrième demande en attente refusée', 'ERR:trois demandes', e($$insert into demandes_correction_evaluation (evaluation_id, message) values ('71000000-0000-0000-0000-000000000001','quatre')$$));
select t('B10 joueur ne modifie pas sa demande', 'ERR:permission denied', m($$update demandes_correction_evaluation set statut = 'traitee'$$));
select t('B11 joueur n''efface pas sa demande', 'ERR:permission denied', m($$delete from demandes_correction_evaluation$$));
select t('B12 joueur lit ses 4 demandes', '4', n('select * from demandes_correction_evaluation'));
select t('B13 joueur ne peut pas répondre', 'ERR:demande introuvable', e($$select public.repondre_demande_correction('73000000-0000-0000-0000-000000000001','traitee','ok')$$));
:as_P2
select t('B14 Léa : évaluation en brouillon, demande refusée', 'ERR:évaluation non visible', e($$insert into demandes_correction_evaluation (evaluation_id, message) values ('71000000-0000-0000-0000-000000000002','x')$$));
select t('B15 Léa ne lit pas les demandes de Paul', '0', n('select * from demandes_correction_evaluation'));
:as_E1
select e($$update evaluations set statut = 'terminee', visible_joueur = true where id = '71000000-0000-0000-0000-000000000002'$$);
:as_PA
select t('B16 parent de Léa : demande acceptée, type parent', 'parent', v($$with i as (insert into demandes_correction_evaluation (id, evaluation_id, message) values ('73000000-0000-0000-0000-000000000002','71000000-0000-0000-0000-000000000002','Votre note est fausse') returning demandeur_type) select demandeur_type from i$$));
:as_X
select t('B17 visiteur connecté : demande refusée', 'ERR:évaluation non visible', e($$insert into demandes_correction_evaluation (evaluation_id, message) values ('71000000-0000-0000-0000-000000000001','x')$$));
select t('B18 visiteur connecté : ne lit rien', '0', n('select * from demandes_correction_evaluation'));
:as_anon
select t('B19 anonyme : aucun accès', 'ERR:permission denied', n('select * from demandes_correction_evaluation'));
:as_E1
select t('B20 éducateur de l''évaluation : lit les 5 demandes', '5', n('select * from demandes_correction_evaluation'));
select t('B21 refus sans explication impossible', 'ERR:un refus doit être expliqué', e($$select public.repondre_demande_correction('73000000-0000-0000-0000-000000000001','refusee','  ')$$));
select t('B22 éducateur répond « traitée »', 'ok', e($$select public.repondre_demande_correction('73000000-0000-0000-0000-000000000001','traitee','Corrigé, merci')$$));
select t('B23 réponse enregistrée (statut, auteur, date)', 'traitee/eeeeeeee-0000-0000-0000-000000000001/oui', v($$select statut||'/'||traitee_par||'/'||case when traitee_le is not null then 'oui' else 'non' end from demandes_correction_evaluation where id='73000000-0000-0000-0000-000000000001'$$));
select t('B24 éducateur ne modifie pas la table directement', 'ERR:permission denied', m($$update demandes_correction_evaluation set reponse = 'x'$$));
:as_E2
select t('B25 autre éducateur du club : ne lit rien', '0', n('select * from demandes_correction_evaluation'));
select t('B26 autre éducateur : ne peut pas répondre', 'ERR:demande introuvable', e($$select public.repondre_demande_correction('73000000-0000-0000-0000-000000000002','traitee','x')$$));
:as_dirA
select t('B27 directeur sportif : lit les 5 demandes du club', '5', n('select * from demandes_correction_evaluation'));
select t('B28 directeur sportif : répond', 'ok', e($$select public.repondre_demande_correction('73000000-0000-0000-0000-000000000002','refusee','La note correspond au match du 12')$$));
:as_ecoA
select t('B29 responsable école de foot : ne lit rien', '0', n('select * from demandes_correction_evaluation'));
:as_dirB
select t('B30 autre club : ne lit rien', '0', n('select * from demandes_correction_evaluation'));
select t('B31 autre club : ne peut pas répondre', 'ERR:demande introuvable', e($$select public.repondre_demande_correction('73000000-0000-0000-0000-000000000001','traitee','x')$$));
:as_PA
select t('B32 parent : lit sa demande et la réponse', 'refusee/La note correspond au match du 12', v($$select statut||'/'||reponse from demandes_correction_evaluation$$));

-- ===== C. Suppression des données d'un joueur par le club =====
:as_E1
select e($$select public.noter_acces_evaluations('10000000-0000-0000-0000-000000000002','historique')$$);
select e($$select public.noter_acces_evaluations('10000000-0000-0000-0000-000000000001','historique')$$);
select t('C1 éducateur : suppression refusée', 'ERR:accès refusé', e($$select public.supprimer_donnees_evaluation_joueur('aaaaaaaa-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002')$$));
:as_dirA
select t('C2 directeur sportif : suppression refusée', 'ERR:accès refusé', e($$select public.supprimer_donnees_evaluation_joueur('aaaaaaaa-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002')$$));
:as_dirB
select t('C3 autre club : suppression refusée', 'ERR:accès refusé', e($$select public.supprimer_donnees_evaluation_joueur('aaaaaaaa-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002')$$));
:as_presA
select t('C4 président : sans joueur précisé, refusé', 'ERR:joueur à préciser', e($$select public.supprimer_donnees_evaluation_joueur('aaaaaaaa-0000-0000-0000-000000000001')$$));
select t('C5 président : supprime les données de Léa (1 évaluation, 1 note, 1 ancienne fiche)', '{"notes": 1, "evaluations": 1, "anciennes_fiches": 1}',
  v($$select public.supprimer_donnees_evaluation_joueur('aaaaaaaa-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002')::text$$));
select t('C6 président : la ligne d''un joueur du club B ne supprime rien', '{"notes": 0, "evaluations": 0, "anciennes_fiches": 0}',
  v($$select public.supprimer_donnees_evaluation_joueur('aaaaaaaa-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000006')::text$$));
:as_admin
select t('C7 plus rien pour Léa (évaluations, notes, ancienne fiche, demande du parent)', '0/0/0/0',
  n($$select * from evaluations where equipe_joueur_id='10000000-0000-0000-0000-000000000002'$$) || '/' ||
  n($$select * from notes_suivi where equipe_joueur_id='10000000-0000-0000-0000-000000000002'$$) || '/' ||
  n($$select * from evaluations_joueur where equipe_joueur_id='10000000-0000-0000-0000-000000000002'$$) || '/' ||
  n($$select * from demandes_correction_evaluation where id='73000000-0000-0000-0000-000000000002'$$));
select t('C8 journal : la lecture de Léa est effacée, celle de Paul reste', '0/1',
  n($$select * from journal_acces_evaluations where equipe_joueur_id='10000000-0000-0000-0000-000000000002' and objet='historique'$$) || '/' ||
  n($$select * from journal_acces_evaluations where equipe_joueur_id='10000000-0000-0000-0000-000000000001' and objet='historique'$$));
select t('C9 journal : « suppression_donnees » au nom de Léa, par le président, aucune ligne suppression_note', 'Léa Deux/aaaaaaaa-0000-0000-0000-000000000002/0',
  v($$select joueur_nom||'/'||lecteur_id from journal_acces_evaluations where objet='suppression_donnees'$$) || '/' ||
  n($$select * from journal_acces_evaluations where objet='suppression_note'$$));
select t('C10 Paul n''est pas touché (évaluation, ancienne fiche, demandes)', '1/1/4',
  n($$select * from evaluations where equipe_joueur_id='10000000-0000-0000-0000-000000000001'$$) || '/' ||
  n($$select * from evaluations_joueur where equipe_joueur_id='10000000-0000-0000-0000-000000000001'$$) || '/' ||
  n($$select * from demandes_correction_evaluation where joueur_nom='Paul Un'$$));
:as_E1
select t('C11 E1 « en indépendant » : ne supprime pas les données du club', '{"notes": 0, "evaluations": 0, "anciennes_fiches": 0}',
  v($$select public.supprimer_donnees_evaluation_joueur(null,'10000000-0000-0000-0000-000000000001')::text$$));
:as_clubA
select t('C12 compte du club : lit le journal du club (lecture de Paul + suppression de Léa)', '2', n('select * from journal_acces_evaluations'));

-- ===== D. Conservation et tâche de nuit =====
select t('D1 date : départ nov. 2026, 2 saisons = 1er juillet 2029', '2029-07-01', v($$select public.conservation_date_suppression('2026-11-19', 2)::text$$));
select t('D2 date : départ juin 2027, 2 saisons = 1er juillet 2029', '2029-07-01', v($$select public.conservation_date_suppression('2027-06-30', 2)::text$$));
select t('D3 date : départ juillet 2027, 0 saison = 1er juillet 2028', '2028-07-01', v($$select public.conservation_date_suppression('2027-07-01', 0)::text$$));
:as_X
select t('D4 un compte connecté ne lance pas la tâche de nuit', 'ERR:permission denied', e($$select public.conservation_evaluations_nuit()$$));
:as_admin
select t('D5 nuit : tout le monde est encore là', '0', v($$select (public.conservation_evaluations_nuit() ->> 'departs')$$));
delete from equipe_joueurs where id = '10000000-0000-0000-0000-000000000003';
select t('D6 Sam quitte l''effectif : 2 lignes suivies (évaluation + note)', '2', v($$select (public.conservation_evaluations_nuit() ->> 'departs')$$));
select t('D7 date prévue = départ aujourd''hui + 2 saisons, pas encore de préavis', public.conservation_date_suppression(current_date, 2)::text || '/0',
  v($$select min(suppression_prevue_le)::text from conservation_evaluations$$) || '/' || n($$select * from conservation_evaluations where annonce_le is not null$$));
select t('D8 deuxième nuit : rien de nouveau', '0', v($$select (public.conservation_evaluations_nuit() ->> 'departs')$$));
:as_dirA
select t('D9 directeur sportif : voit les 2 lignes de Sam', '2', n('select * from conservation_evaluations'));
select t('D10 hors préavis : prolongation sans effet', '0', v($$select public.prolonger_conservation_evaluations(array(select id from conservation_evaluations))::text$$));
:as_E1
select t('D11 éducateur : ne voit pas le suivi du club', '0', n('select * from conservation_evaluations'));
:as_ecoA
select t('D12 école de foot : ne voit rien', '0', n('select * from conservation_evaluations'));
:as_dirB
select t('D13 autre club : ne voit rien', '0', n('select * from conservation_evaluations'));
select t('D14 écriture directe interdite', 'ERR:permission denied', m($$update conservation_evaluations set prolongations = 5$$));
:as_admin
update conservation_evaluations set depart_constate_le = '2020-01-01';
select e($$select public.conservation_evaluations_nuit()$$);
select t('D15 date dépassée : préavis posé aujourd''hui, rien supprimé', '2022-07-01/2/1/1',
  v($$select min(suppression_prevue_le)::text from conservation_evaluations where annonce_le = current_date$$) || '/' ||
  n($$select * from conservation_evaluations$$) || '/' ||
  n($$select * from evaluations where id='71000000-0000-0000-0000-000000000003'$$) || '/' ||
  n($$select * from notes_suivi where id='72000000-0000-0000-0000-000000000003'$$));
:as_E1
select t('D16 éducateur : prolongation sans effet', '0', v($$select public.prolonger_conservation_evaluations(array['00000000-0000-0000-0000-000000000000'::uuid] || (select array_agg(id) from conservation_evaluations))::text$$));
:as_admin
select t('D17 ids pour le directeur sportif', '2', v($$select count(*)::text from conservation_evaluations$$));
:as_dirA
select t('D18 directeur sportif : prolonge d''une saison (2 lignes)', '2', v($$select public.prolonger_conservation_evaluations(array(select id from conservation_evaluations))::text$$));
select t('D19 prolongation : date + 1 saison, préavis retiré, 1 ligne au journal', '2023-07-01/0/1',
  v($$select min(suppression_prevue_le)::text from conservation_evaluations$$) || '/' ||
  n($$select * from conservation_evaluations where annonce_le is not null$$) || '/' ||
  n($$select * from journal_acces_evaluations where objet='prolongation' and joueur_nom='Sam Trois'$$));
:as_admin
select e($$select public.conservation_evaluations_nuit()$$);
select t('D20 nuit suivante : préavis reposé, toujours rien supprimé (moins de 30 jours)', '2/1',
  n($$select * from conservation_evaluations where annonce_le = current_date$$) || '/' ||
  n($$select * from evaluations where id='71000000-0000-0000-0000-000000000003'$$));
update conservation_evaluations set annonce_le = current_date - 31;
select t('D21 préavis de plus de 30 jours : suppression (1 évaluation, 1 note)', '1/1/1',
  v($$with r as (select public.conservation_evaluations_nuit() j) select (j->>'evaluations_supprimees')||'/'||(j->>'notes_supprimees')||'/'||(j->>'joueurs_au_journal') from r$$));
select t('D22 plus rien de Sam (évaluation, résultats, note, suivi)', '0/0/0/0',
  n($$select * from evaluations where id='71000000-0000-0000-0000-000000000003'$$) || '/' ||
  n($$select * from evaluation_resultats where evaluation_id='71000000-0000-0000-0000-000000000003'$$) || '/' ||
  n($$select * from notes_suivi where id='72000000-0000-0000-0000-000000000003'$$) || '/' ||
  n($$select * from conservation_evaluations$$));
select t('D23 journal : « suppression_auto » au nom de Sam, sans auteur', 'Sam Trois/(null)',
  v($$select joueur_nom||'/'||coalesce(lecteur_id::text,'(null)') from journal_acces_evaluations where objet='suppression_auto'$$));
select t('D24 les autres joueurs ne sont pas touchés (Paul, Tom, indépendant)', '3',
  n($$select * from evaluations where id in ('71000000-0000-0000-0000-000000000001','71000000-0000-0000-0000-000000000007','71000000-0000-0000-0000-000000000005')$$));

-- Retour d'un joueur : Tom passe au club B, puis revient
update equipe_joueurs set club_categorie_id = '30000000-0000-0000-0000-000000000004', categorie_id = '20000000-0000-0000-0000-000000000004' where id = '10000000-0000-0000-0000-000000000007';
select t('D25 Tom part au club B : suivi au club A', '1', v($$select (public.conservation_evaluations_nuit() ->> 'departs')$$));
update equipe_joueurs set club_categorie_id = '30000000-0000-0000-0000-000000000001', categorie_id = '20000000-0000-0000-0000-000000000001' where id = '10000000-0000-0000-0000-000000000007';
select t('D26 Tom revient : suivi effacé', '1/0', v($$select (public.conservation_evaluations_nuit() ->> 'retours')$$) || '/' || n($$select * from conservation_evaluations$$));

-- Paul a un compte : sa ligne U13 supprimée, il reste au club par sa ligne U15 (affiliation acceptée)
update affiliations set equipe_joueur_id = null where equipe_joueur_id = '10000000-0000-0000-0000-000000000001';
insert into affiliations (educateur_id, joueur_id, statut, equipe_joueur_id) values (:'E2',:'P1','accepte','10000000-0000-0000-0000-000000000004') on conflict do nothing;
delete from evaluations_joueur where equipe_joueur_id = '10000000-0000-0000-0000-000000000001';
delete from equipe_joueurs where id = '10000000-0000-0000-0000-000000000001';
select t('D27 Paul (compte) toujours au club par une autre ligne : pas suivi', '0', v($$select (public.conservation_evaluations_nuit() ->> 'departs')$$));

-- Indépendant : sa ligne supprimée
delete from equipe_joueurs where id = '10000000-0000-0000-0000-000000000005';
select t('D28 joueur de l''indépendant parti : suivi sans club', '1', v($$select (public.conservation_evaluations_nuit() ->> 'departs')$$));
:as_I
select t('D29 indépendant : voit son suivi', '1', n('select * from conservation_evaluations'));
:as_dirA
select t('D30 club A : ne voit pas le suivi de l''indépendant', '0', n('select * from conservation_evaluations'));
:as_admin
select id as cons_indep from conservation_evaluations \gset
:as_presA
select t('D31 club A : ne supprime pas les données de l''indépendant (même avec l''identifiant)', '{"notes": 0, "evaluations": 0, "anciennes_fiches": 0}',
  v($$select public.supprimer_donnees_evaluation_joueur(null, null, null, array['$$ || :'cons_indep' || $$'::uuid])::text$$));
select t('D31b club A en mode club : rien non plus', '{"notes": 0, "evaluations": 0, "anciennes_fiches": 0}',
  v($$select public.supprimer_donnees_evaluation_joueur('aaaaaaaa-0000-0000-0000-000000000001', null, null, array['$$ || :'cons_indep' || $$'::uuid])::text$$));
:as_I
select t('D32 indépendant : supprime depuis son suivi (joueur sans ligne)', '{"notes": 0, "evaluations": 1, "anciennes_fiches": 0}',
  v($$select public.supprimer_donnees_evaluation_joueur(null, null, null, array(select id from conservation_evaluations))::text$$));

-- Garde-fou : 501 lignes à supprimer en une nuit = rien n'est supprimé
:as_admin
insert into equipe_joueurs (id, educateur_id, prenom, nom, club_categorie_id, categorie_id) values
 ('10000000-0000-0000-0000-000000000008',:'E1','Gros','Volume','30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001');
insert into notes_suivi (club_id, educateur_id, equipe_joueur_id, texte) select :'clubA', :'E1', '10000000-0000-0000-0000-000000000008', 'n' || g from generate_series(1, 501) g;
delete from equipe_joueurs where id = '10000000-0000-0000-0000-000000000008';
select e($$select public.conservation_evaluations_nuit()$$);
update conservation_evaluations set depart_constate_le = '2020-01-01', annonce_le = current_date - 31;
update conservation_evaluations set suppression_prevue_le = '2022-07-01';
select t('D33 garde-fou déclenché : 501 notes gardées', 'true/501',
  v($$select (public.conservation_evaluations_nuit() ->> 'garde_fou_declenche')$$) || '/' || n($$select * from notes_suivi where joueur_nom = 'Gros Volume'$$));
delete from notes_suivi where joueur_nom = 'Gros Volume';
select t('D34 note effacée à la main : son suivi part avec', '0', n('select * from conservation_evaluations'));

-- ===== E. Interrupteur ALLUMÉ (version v1 en vigueur) =====
insert into conditions_evaluation_versions (version, texte_sha256, en_vigueur_le) values ('v1', repeat('a', 64), now());
:as_E1
select t('E1 allumé : évaluation refusée tant que le club n''a pas accepté', 'ERR:conditions des fiches', e($$insert into evaluations (equipe_joueur_id, version_id, saison) values ('10000000-0000-0000-0000-000000000007','50000000-0000-0000-0000-000000000001','2026-2027')$$));
select t('E2 allumé : note refusée', 'ERR:conditions des fiches', e($$insert into notes_suivi (equipe_joueur_id, texte) values ('10000000-0000-0000-0000-000000000007','x')$$));
select t('E3 éducateur ne peut pas accepter pour le club', 'ERR:accès refusé', e($$select public.accepter_conditions_evaluation('aaaaaaaa-0000-0000-0000-000000000001','v1')$$));
select t('E4 éducateur sait que son club n''a pas accepté', 'false', v($$select public.conditions_evaluation_acceptees('aaaaaaaa-0000-0000-0000-000000000001')::text$$));
:as_clubA
select t('E5 allumé : publication d''une fiche refusée', 'ERR:conditions des fiches', e($$update modeles_evaluation_versions set publiee_le = now() where id = '50000000-0000-0000-0000-000000000002'$$));
:as_dirA
select t('E6 directeur sportif ne peut pas accepter', 'ERR:accès refusé', e($$select public.accepter_conditions_evaluation('aaaaaaaa-0000-0000-0000-000000000001','v1')$$));
:as_presA
select t('E7 version dépassée refusée', 'ERR:version dépassée', e($$select public.accepter_conditions_evaluation('aaaaaaaa-0000-0000-0000-000000000001','v0')$$));
select t('E8 président accepte pour le club', 'ok', e($$select public.accepter_conditions_evaluation('aaaaaaaa-0000-0000-0000-000000000001','v1')$$));
select t('E9 accepter deux fois ne crée pas de doublon', 'ok', e($$select public.accepter_conditions_evaluation('aaaaaaaa-0000-0000-0000-000000000001','v1')$$));
select t('E10 trace : qui, rôle, version', 'aaaaaaaa-0000-0000-0000-000000000002/president/v1/1',
  v($$select accepte_par||'/'||accepte_par_role||'/'||version from acceptations_conditions_evaluation$$) || '/' || n('select * from acceptations_conditions_evaluation'));
select t('E11 écriture directe d''une acceptation interdite', 'ERR:permission denied', e($$insert into acceptations_conditions_evaluation (proprietaire_id, version, accepte_par_role) values ('bbbbbbbb-0000-0000-0000-000000000001','v1','club')$$));
select t('E12 ajout d''une version interdit', 'ERR:permission denied', e($$insert into conditions_evaluation_versions (version, texte_sha256) values ('v9', repeat('b', 64))$$));
:as_E1
select t('E13 club accepté : E1 crée une évaluation', 'ok', e($$insert into evaluations (equipe_joueur_id, version_id, saison) values ('10000000-0000-0000-0000-000000000007','50000000-0000-0000-0000-000000000001','2026-2027')$$));
select t('E14 club accepté : E1 écrit une note', 'ok', e($$insert into notes_suivi (equipe_joueur_id, texte) values ('10000000-0000-0000-0000-000000000007','x')$$));
:as_clubA
select t('E15 club accepté : publication possible', 'ok', e($$update modeles_evaluation_versions set publiee_le = now() where id = '50000000-0000-0000-0000-000000000002'$$));
:as_dirA
select t('E16 directeur sportif : lit l''acceptation du club', '1', n('select * from acceptations_conditions_evaluation'));
:as_dirB
select t('E17 autre club : ne la lit pas', '0', n('select * from acceptations_conditions_evaluation'));
:as_admin
insert into equipe_joueurs (id, educateur_id, prenom, nom) values ('10000000-0000-0000-0000-000000000009',:'I','Indé','Deux');
:as_I
select t('E18 indépendant : refusé avant d''accepter', 'ERR:conditions des fiches', e($$insert into evaluations (equipe_joueur_id, version_id, saison) values ('10000000-0000-0000-0000-000000000009','50000000-0000-0000-0000-000000000004','2026-2027')$$));
select t('E19 indépendant ne peut pas accepter pour le club A', 'ERR:accès refusé', e($$select public.accepter_conditions_evaluation('aaaaaaaa-0000-0000-0000-000000000001','v1')$$));
select t('E20 indépendant accepte pour lui-même', 'ok', e($$select public.accepter_conditions_evaluation('dddddddd-0000-0000-0000-000000000001','v1')$$));
select t('E20b trace de l''indépendant (rôle éducateur)', 'educateur', v($$select accepte_par_role from acceptations_conditions_evaluation$$));
select t('E21 indépendant : évaluation possible', 'ok', e($$insert into evaluations (equipe_joueur_id, version_id, saison) values ('10000000-0000-0000-0000-000000000009','50000000-0000-0000-0000-000000000004','2026-2027')$$));
:as_anon
select t('E22 anonyme : aucune lecture des conditions', 'ERR:permission denied', n('select * from conditions_evaluation_versions'));
select t('E23 anonyme : suivi de conservation fermé', 'ERR:permission denied', n('select * from conservation_evaluations'));

\o
reset role;
select ordre, case when obtenu like attendu || '%' then 'ok' else 'ÉCHEC' end as res, nom, attendu, obtenu from res
 where obtenu not like attendu || '%' order by ordre;
select count(*) filter (where obtenu like attendu || '%') || '/' || count(*) as total from res;
select msg, count(*) from errs group by msg order by 1;

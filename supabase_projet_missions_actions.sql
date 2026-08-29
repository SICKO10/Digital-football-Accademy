-- Restructuration Projets Club : Projet → Étapes → Missions → Actions.
-- Les missions passent du niveau projet (projets_club.missions) au niveau
-- étape (etape_missions), et les actions passent du niveau projet
-- (taches_projet) au niveau mission (mission_actions), avec un quoi/quand/
-- qui/comment par action. Les % d'avancement (mission → étape → projet) se
-- calculent côté front à partir de mission_actions.fait, pas de colonne
-- dédiée ici.

CREATE TABLE IF NOT EXISTS etape_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etape_id UUID NOT NULL REFERENCES projet_etapes(id) ON DELETE CASCADE,
  ordre INT NOT NULL DEFAULT 0,
  titre TEXT NOT NULL,
  responsable_id UUID,
  responsable_nom TEXT,
  participants JSONB DEFAULT '[]',
  objectif TEXT,
  comment TEXT,
  date_debut DATE,
  date_fin DATE,
  ressource_humaine TEXT,
  ressource_materielle TEXT,
  ressource_financiere TEXT,
  resultats TEXT,
  probleme_rencontre TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mission_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES etape_missions(id) ON DELETE CASCADE,
  ordre INT NOT NULL DEFAULT 0,
  quoi TEXT NOT NULL,
  quand TEXT,
  qui TEXT,
  comment TEXT,
  fait BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE etape_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "membres_club_lecture_etape_missions" ON etape_missions;
DROP POLICY IF EXISTS "membres_club_ecriture_etape_missions" ON etape_missions;
CREATE POLICY "membres_club_lecture_etape_missions" ON etape_missions FOR SELECT USING (
  EXISTS (SELECT 1 FROM projet_etapes e JOIN projets_club p ON p.id = e.projet_id
    WHERE e.id = etape_missions.etape_id
      AND (p.club_id = auth.uid() OR EXISTS (SELECT 1 FROM staff_club sc WHERE sc.club_id = p.club_id AND sc.user_id = auth.uid())))
);
CREATE POLICY "membres_club_ecriture_etape_missions" ON etape_missions FOR ALL USING (
  EXISTS (SELECT 1 FROM projet_etapes e JOIN projets_club p ON p.id = e.projet_id
    WHERE e.id = etape_missions.etape_id
      AND (p.club_id = auth.uid() OR EXISTS (SELECT 1 FROM staff_club sc WHERE sc.club_id = p.club_id AND sc.user_id = auth.uid())))
) WITH CHECK (
  EXISTS (SELECT 1 FROM projet_etapes e JOIN projets_club p ON p.id = e.projet_id
    WHERE e.id = etape_missions.etape_id
      AND (p.club_id = auth.uid() OR EXISTS (SELECT 1 FROM staff_club sc WHERE sc.club_id = p.club_id AND sc.user_id = auth.uid())))
);

DROP POLICY IF EXISTS "membres_club_lecture_mission_actions" ON mission_actions;
DROP POLICY IF EXISTS "membres_club_ecriture_mission_actions" ON mission_actions;
CREATE POLICY "membres_club_lecture_mission_actions" ON mission_actions FOR SELECT USING (
  EXISTS (SELECT 1 FROM etape_missions m JOIN projet_etapes e ON e.id = m.etape_id JOIN projets_club p ON p.id = e.projet_id
    WHERE m.id = mission_actions.mission_id
      AND (p.club_id = auth.uid() OR EXISTS (SELECT 1 FROM staff_club sc WHERE sc.club_id = p.club_id AND sc.user_id = auth.uid())))
);
CREATE POLICY "membres_club_ecriture_mission_actions" ON mission_actions FOR ALL USING (
  EXISTS (SELECT 1 FROM etape_missions m JOIN projet_etapes e ON e.id = m.etape_id JOIN projets_club p ON p.id = e.projet_id
    WHERE m.id = mission_actions.mission_id
      AND (p.club_id = auth.uid() OR EXISTS (SELECT 1 FROM staff_club sc WHERE sc.club_id = p.club_id AND sc.user_id = auth.uid())))
) WITH CHECK (
  EXISTS (SELECT 1 FROM etape_missions m JOIN projet_etapes e ON e.id = m.etape_id JOIN projets_club p ON p.id = e.projet_id
    WHERE m.id = mission_actions.mission_id
      AND (p.club_id = auth.uid() OR EXISTS (SELECT 1 FROM staff_club sc WHERE sc.club_id = p.club_id AND sc.user_id = auth.uid())))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON etape_missions, mission_actions TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- Migration des données réelles existantes (2 projets concernés, vérifié
-- en base avant écriture — aucune autre ligne à traiter).
-- ═══════════════════════════════════════════════════════════════════════

-- Étape "Général" pour "Créer un stage de foot" (0 étape existante).
INSERT INTO projet_etapes (id, projet_id, titre, statut, ordre)
SELECT gen_random_uuid(), '7b36ed8c-0f2c-4e47-9c02-e09969a035ef', 'Général', 'a_faire', 0
WHERE NOT EXISTS (SELECT 1 FROM projet_etapes WHERE projet_id = '7b36ed8c-0f2c-4e47-9c02-e09969a035ef' AND titre = 'Général');

-- Étape "Général" pour "Tournoi International" (8 étapes existantes, ordre max 7).
INSERT INTO projet_etapes (id, projet_id, titre, statut, ordre)
SELECT gen_random_uuid(), '37cf8d9a-1621-4165-90d5-36019149e470', 'Général', 'a_faire', 8
WHERE NOT EXISTS (SELECT 1 FROM projet_etapes WHERE projet_id = '37cf8d9a-1621-4165-90d5-36019149e470' AND titre = 'Général');

-- Mission legacy de "Créer un stage de foot" → sous son étape "Général".
INSERT INTO etape_missions (etape_id, ordre, titre, responsable_nom, participants, objectif, comment, date_debut, date_fin, ressource_humaine, ressource_materielle, ressource_financiere, resultats, probleme_rencontre)
SELECT e.id, 0, 'Créer la communication réseaux sociaux', 'Resp  com',
  '[{"id":"e92a2ea1-7182-4cb6-9ae8-e9af7b6d6e1a","nom":"Sous resp  com"}]'::jsonb,
  'Créer la com et la diffuser ', 'Rédiger la com sur canva - diffuser RS',
  '2027-01-01', '2027-04-04', '2 bénévole', 'Ordi - flyer - affiches', '500', '', ''
FROM projet_etapes e
WHERE e.projet_id = '7b36ed8c-0f2c-4e47-9c02-e09969a035ef' AND e.titre = 'Général'
  AND NOT EXISTS (SELECT 1 FROM etape_missions WHERE etape_id = e.id AND titre = 'Créer la communication réseaux sociaux');

-- Mission legacy de "Tournoi International" → sous son étape "Général".
INSERT INTO etape_missions (etape_id, ordre, titre, responsable_nom, participants, objectif, comment, date_debut, date_fin, ressource_humaine, ressource_materielle, ressource_financiere, resultats, probleme_rencontre)
SELECT e.id, 0, 'Animation ', NULL, '[]'::jsonb,
  'Creer du divertissement ', 'Trouver et organiser les acteurs ',
  '2026-12-24', '2026-12-27', 'un dj, une star du ballon, 2 personnes stand Defi ', 'Sono, stand star, stand Defi ', '100', '', ''
FROM projet_etapes e
WHERE e.projet_id = '37cf8d9a-1621-4165-90d5-36019149e470' AND e.titre = 'Général'
  AND NOT EXISTS (SELECT 1 FROM etape_missions WHERE etape_id = e.id AND titre = 'Animation ');

-- Mission catch-all "Actions diverses" pour les 6 taches_projet legacy →
-- sous l'étape "Général" de "Tournoi International", ordre après "Animation ".
INSERT INTO etape_missions (etape_id, ordre, titre)
SELECT e.id, 1, 'Actions diverses'
FROM projet_etapes e
WHERE e.projet_id = '37cf8d9a-1621-4165-90d5-36019149e470' AND e.titre = 'Général'
  AND NOT EXISTS (SELECT 1 FROM etape_missions WHERE etape_id = e.id AND titre = 'Actions diverses');

INSERT INTO mission_actions (mission_id, ordre, quoi, fait)
SELECT m.id, t.ordre, t.titre, t.fait
FROM etape_missions m
JOIN projet_etapes e ON e.id = m.etape_id
CROSS JOIN LATERAL (VALUES
  (0, 'Invitez les equipes', true),
  (1, 'Planifier les transports des equipes', true),
  (2, 'repartir les match pour les arbitres', true),
  (3, 'mettre un guide par équipe', true),
  (4, 'valider avec la mairie', true),
  (5, 'Loger les equipes', true)
) AS t(ordre, titre, fait)
WHERE e.projet_id = '37cf8d9a-1621-4165-90d5-36019149e470' AND e.titre = 'Général' AND m.titre = 'Actions diverses'
  AND NOT EXISTS (SELECT 1 FROM mission_actions WHERE mission_id = m.id AND quoi = t.titre);

-- Équipe/matériel déjà saisis sur 3 étapes de "Tournoi International" →
-- une mission par étape concernée, sous CETTE étape (pas "Général").
INSERT INTO etape_missions (etape_id, ordre, titre, participants, ressource_materielle)
SELECT id, 0, titre,
  '[{"id":"0ee11794-ae2e-48d1-8b1e-bef88d4980d9","nom":"Mathias"},{"id":"f1c8aa1b-d2f7-46dc-b42c-e3d7cec5e289","nom":"Maxine"},{"id":"4d17ff6c-a7b4-4d86-8bfa-bf8bc3b71025","nom":"Guy"}]'::jsonb,
  '5 ballons par equipes, 5 chasubles, 5 coupelles, drapeau equipe'
FROM projet_etapes WHERE id = 'bf42bdc8-6cf1-4c64-aafb-21edd2e2adcf'
  AND NOT EXISTS (SELECT 1 FROM etape_missions WHERE etape_id = 'bf42bdc8-6cf1-4c64-aafb-21edd2e2adcf');

INSERT INTO etape_missions (etape_id, ordre, titre, participants)
SELECT id, 0, titre,
  '[{"id":"a11aa5ae-9ab9-420d-91f2-a155a5c1645a","nom":"arbitre 1"},{"id":"61f74ea5-fa60-4263-9e87-29cf4ec22842","nom":"arbitre 2"},{"id":"63f0f06b-d7c7-494f-9c4d-d86671400b2c","nom":"arbitre 3"}]'::jsonb
FROM projet_etapes WHERE id = 'e8f02930-4913-4b52-abab-114be8e239c2'
  AND NOT EXISTS (SELECT 1 FROM etape_missions WHERE etape_id = 'e8f02930-4913-4b52-abab-114be8e239c2');

INSERT INTO etape_missions (etape_id, ordre, titre, ressource_materielle)
SELECT id, 0, titre, 'mini bus'
FROM projet_etapes WHERE id = '8f003e3a-6a30-4cfa-b74d-b64248d727c8'
  AND NOT EXISTS (SELECT 1 FROM etape_missions WHERE etape_id = '8f003e3a-6a30-4cfa-b74d-b64248d727c8');

-- Colonnes/table devenues obsolètes une fois la migration ci-dessus passée.
ALTER TABLE projet_etapes DROP COLUMN IF EXISTS participants;
ALTER TABLE projet_etapes DROP COLUMN IF EXISTS materiel;
DROP TABLE IF EXISTS taches_projet;

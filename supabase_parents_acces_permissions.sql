-- Prépare une restriction future par section pour l'accès parent — même
-- forme que dirigeant_acces.permissions, mais toujours 'lecture' par défaut
-- sur toutes les sections : contrairement au dirigeant (permissions
-- choisies par l'éducateur via un formulaire), le joueur ne configure rien
-- ici. Pas de changement de comportement visible tout de suite ; la colonne
-- permet à un club/éducateur de restreindre une section plus tard
-- (ex: passer "notes" à 'aucun') sans reconstruire le système d'accès.
ALTER TABLE parents_acces ADD COLUMN IF NOT EXISTS permissions JSONB
  DEFAULT '{"profil":"lecture","videos":"lecture","competition":"lecture","physique":"lecture","planning":"lecture","notes":"lecture","analyses":"lecture","recruteurs":"lecture"}'::jsonb;

UPDATE parents_acces SET permissions = '{"profil":"lecture","videos":"lecture","competition":"lecture","physique":"lecture","planning":"lecture","notes":"lecture","analyses":"lecture","recruteurs":"lecture"}'::jsonb
WHERE permissions IS NULL;

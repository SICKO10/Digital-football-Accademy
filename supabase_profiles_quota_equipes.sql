-- Quota d'équipes (club_categories) par palier d'abonnement club — pas de
-- table "clubs" ni "equipes" dans cette base : un club est une ligne
-- profiles (plan='club'), une équipe est une ligne club_categories.
--
-- palier/quota_equipes restent NULL par défaut (pas de DEFAULT 'c0'/2) :
-- plusieurs clubs déjà actifs ont AUJOURD'HUI plus de 2 équipes (vérifié en
-- base : jusqu'à 7) — un défaut non-NULL les aurait fait apparaître
-- instantanément hors-quota et bloqués à la création de toute nouvelle
-- équipe. NULL = pas de limite appliquée tant que le support n'a pas
-- explicitement choisi un palier pour ce club (même logique que
-- profiles.educateurs_inclus, cf. supabase_profiles_educateurs_inclus.sql).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS palier TEXT,
  ADD COLUMN IF NOT EXISTS quota_equipes INT;

-- Recalcule le quota à chaque fois que le palier est (re)choisi — mêmes clés
-- que STRIPE_LINKS_CLUB (lib/stripeLinks.js) : c0 à c500, paliers par
-- nombre de licenciés (le modèle "nombre d'équipes" n'est pas encore figé
-- commercialement, ces quotas sont une première correspondance).
CREATE OR REPLACE FUNCTION sync_quota_equipes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.palier IS NULL THEN
    NEW.quota_equipes := NULL;
    RETURN NEW;
  END IF;
  NEW.quota_equipes := CASE NEW.palier
    WHEN 'c0'   THEN 2
    WHEN 'c100' THEN 4
    WHEN 'c200' THEN 7
    WHEN 'c300' THEN 11
    WHEN 'c400' THEN 15
    WHEN 'c500' THEN 22
    ELSE NEW.quota_equipes
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_quota_equipes ON profiles;
CREATE TRIGGER trigger_sync_quota_equipes
  BEFORE UPDATE OF palier ON profiles
  FOR EACH ROW
  WHEN (NEW.plan = 'club')
  EXECUTE FUNCTION sync_quota_equipes();

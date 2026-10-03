-- Outil "Montage Vidéo" (forfait Pro joueur, profiles.plan = 'joueur_pro') :
-- le joueur uploade des clips, définit des points de trim, puis génère une
-- compile via Cloudinary (concaténation + overlay nom). Le résultat final
-- reste séparé de profiles.clip_url (le clip unique déjà affiché côté
-- recruteur) — profiles.montage_url est un second champ dédié, les deux
-- vidéos restent visibles indépendamment sur la fiche recruteur.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS montage_url TEXT;

-- Clips individuels uploadés par le joueur (avant assemblage).
CREATE TABLE IF NOT EXISTS montage_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  joueur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cloudinary_public_id TEXT NOT NULL,
  cloudinary_url TEXT NOT NULL,
  duree_secondes FLOAT,
  trim_debut FLOAT NOT NULL DEFAULT 0,
  trim_fin FLOAT,              -- null = jusqu'à la fin du clip
  ordre INT NOT NULL DEFAULT 0,
  saison TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Montage final (un brouillon en cours par saison) — statut 'generation'
-- pendant que Cloudinary traite la concaténation en arrière-plan
-- (eager_async, cf. api/generer-montage.js), passe à 'pret' via le webhook
-- (api/webhook-montage.js) une fois le rendu terminé.
CREATE TABLE IF NOT EXISTS montages_joueur (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  joueur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  saison TEXT NOT NULL,
  titre TEXT NOT NULL DEFAULT 'Ma Compile',
  cloudinary_url TEXT,
  cloudinary_public_id TEXT,
  overlay_nom BOOLEAN NOT NULL DEFAULT true,
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'generation', 'pret', 'erreur')),
  erreur_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (joueur_id, saison)
);

ALTER TABLE montage_clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE montages_joueur ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "montage_clips_all" ON montage_clips;
CREATE POLICY "montage_clips_all" ON montage_clips
  FOR ALL USING (auth.uid() = joueur_id) WITH CHECK (auth.uid() = joueur_id);

DROP POLICY IF EXISTS "montages_joueur_owner" ON montages_joueur;
CREATE POLICY "montages_joueur_owner" ON montages_joueur
  FOR ALL USING (auth.uid() = joueur_id) WITH CHECK (auth.uid() = joueur_id);

-- Un montage prêt reste lisible par n'importe quel compte connecté (fiche
-- recruteur) — même portée que profiles.clip_url, déjà public en lecture.
DROP POLICY IF EXISTS "montages_joueur_public_select" ON montages_joueur;
CREATE POLICY "montages_joueur_public_select" ON montages_joueur
  FOR SELECT USING (statut = 'pret');

CREATE INDEX IF NOT EXISTS idx_montage_clips_joueur ON montage_clips(joueur_id, saison, ordre);

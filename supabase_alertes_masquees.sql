-- Permet à chaque utilisateur (éducateur, club, joueur...) de "valider" une
-- alerte affichée dans un panneau "Alertes & infos" pour qu'elle disparaisse
-- de sa vue. Les alertes elles-mêmes ne sont jamais stockées (recalculées à
-- chaque chargement à partir des données réelles) — seule la liste des
-- identifiants d'alerte masqués par utilisateur est persistée ici.
-- user_id est rempli automatiquement via auth.uid(), jamais envoyé par le
-- client : un dirigeant délégué qui consulte le dashboard d'un éducateur
-- (dirigeant_acces) masque ainsi les alertes pour son propre compte, pas
-- pour celui de l'éducateur.
CREATE TABLE alertes_masquees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  alerte_id text NOT NULL,
  masquee_le timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, alerte_id)
);

ALTER TABLE alertes_masquees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "utilisateur_gere_ses_alertes_masquees" ON alertes_masquees
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

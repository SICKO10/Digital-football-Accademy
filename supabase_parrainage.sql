-- Parrainage FreePlay : seuls les parrainages d'abonnements ANNUELS comptent
-- (déterminé via la table `paiements`, cf. supabase_paiements.sql). Paliers :
-- 3 filleuls annuels = 1 an offert, 6 = 2 ans offerts, 9 = 3 ans + 2 vidéos
-- offertes. Le lien de parrainage est capturé côté client dans
-- src/pages/Register.jsx (pas dans le trigger handle_new_user — cf. commentaire
-- dans le plan : on ne touche pas au trigger de signup partagé par 100% des
-- inscriptions, trop risqué).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS parrain_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Un parrainage "compte" dès que le filleul a un paiement annuel dans
-- `paiements` — pas de table de relation séparée nécessaire, juste ce FK +
-- une jointure à la lecture (cf. coach/Referrals.jsx).

CREATE TABLE IF NOT EXISTS parrainage_recompenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parrain_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  palier INTEGER NOT NULL CHECK (palier IN (3, 6, 9)),
  accorde_le TIMESTAMPTZ DEFAULT now(),
  accorde_par UUID REFERENCES auth.users(id),
  UNIQUE (parrain_id, palier)
);

ALTER TABLE parrainage_recompenses ENABLE ROW LEVEL SECURITY;

-- Réservé aux comptes coach analyseur (même allowlist que les autres tables
-- admin de ce projet, cf. supabase_support_tickets.sql).
CREATE POLICY "coach_parrainage_recompenses" ON parrainage_recompenses FOR ALL USING (
  auth.jwt() ->> 'email' IN ('legacyattitude@gmail.com', 'januariojimmy@gmail.com')
);

-- RPC utilisée par le widget de parrainage dans les dashboards (Joueur/
-- Éducateur/Club/Recruteur) : un utilisateur ne peut compter QUE ses propres
-- filleuls validés, jamais ceux d'un autre (garde interne p_parrain_id =
-- auth.uid()) — évite d'exposer une policy SELECT large sur `paiements`/
-- `profiles` juste pour ce compteur.
CREATE OR REPLACE FUNCTION public.count_filleuls_annuels(p_parrain_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(DISTINCT pr.id)::integer
  FROM profiles pr
  WHERE pr.parrain_id = p_parrain_id
    AND p_parrain_id = auth.uid()
    AND EXISTS (SELECT 1 FROM paiements pay WHERE pay.profile_id = pr.id AND pay.cycle = 'annuel');
$$;

GRANT EXECUTE ON FUNCTION public.count_filleuls_annuels(uuid) TO authenticated;

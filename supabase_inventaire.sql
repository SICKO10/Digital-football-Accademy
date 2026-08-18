-- Ajoute le rôle staff "Responsable Équipements" aux contraintes CHECK de
-- staff_club/role_permissions, même principe que
-- supabase_role_permissions_buvette_securite.sql.
do $$
declare
  c record;
begin
  for c in
    select conname, conrelid::regclass::text as tbl
    from pg_constraint
    where conrelid in ('staff_club'::regclass, 'role_permissions'::regclass)
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%president%'
  loop
    execute format('alter table %s drop constraint %I', c.tbl, c.conname);
  end loop;
end $$;

alter table staff_club
  add constraint staff_club_role_check
  check (role in (
    'president', 'directeur_sportif', 'marketing', 'secretaire', 'coach_adjoint', 'kine', 'intendant', 'preparateur_physique', 'comptable',
    'responsable_formation', 'responsable_ecole_foot', 'responsable_preformation', 'entraineur', 'educateur', 'tresorier', 'responsable_communication',
    'responsable_buvette', 'responsable_securite', 'responsable_equipements'
  ));

alter table role_permissions
  add constraint role_permissions_role_check
  check (role in (
    'president', 'directeur_sportif', 'marketing', 'secretaire', 'coach_adjoint', 'kine', 'intendant', 'preparateur_physique', 'comptable',
    'responsable_formation', 'responsable_ecole_foot', 'responsable_preformation', 'entraineur', 'educateur', 'tresorier', 'responsable_communication',
    'responsable_buvette', 'responsable_securite', 'responsable_equipements'
  ));

-- Inventaire club : Équipement (tailles + préparation/notification) et
-- Matériel (stock + distribution/remise).
--
-- Corrections par rapport au cahier des charges d'origine :
-- - club_id UUID REFERENCES profiles(id), pas "club TEXT" comparé à
--   profil_educateur.club (texte libre, pas une clé stable — aucune autre
--   table de ce projet ne fonctionne comme ça : club_categories,
--   role_permissions, staff_club, evenements_club, projets_club,
--   convocations... utilisent toutes club_id UUID = profiles(id)).
-- - Pas de colonne "role" sur dirigeant_acces : c'est un système de
--   délégation externe accordée PAR un éducateur, sans rapport avec les
--   rôles staff du club. Le rôle "Responsable Équipements" va dans
--   ROLES_STAFF/role_permissions (déjà en place côté app), pas ici.
-- - RLS : club_id = auth.uid() (le club lui-même) OU un membre du staff
--   avec la permission 'inventaire' (can_view/can_edit selon l'action),
--   même schéma que role_categories_access/convocations plus tôt.

-- ── Champs de taille configurables par le club ───────────────────────────
CREATE TABLE IF NOT EXISTS equipement_champs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  options TEXT[] NOT NULL DEFAULT ARRAY['XS','S','M','L','XL','XXL'],
  ordre INT NOT NULL DEFAULT 0,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Tailles déclarées par chaque joueur/staff ────────────────────────────
CREATE TABLE IF NOT EXISTS equipement_tailles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  champ_id UUID NOT NULL REFERENCES equipement_champs(id) ON DELETE CASCADE,
  valeur TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, champ_id)
);

-- ── Commandes équipement (préparation + notification "prêt") ────────────
CREATE TABLE IF NOT EXISTS equipement_commandes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  responsable_id UUID REFERENCES profiles(id),
  destinataire_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  destinataire_nom TEXT,
  items JSONB NOT NULL DEFAULT '[]', -- [{ champ: 'Survêtement', taille: 'L' }, ...]
  statut TEXT NOT NULL DEFAULT 'pret' CHECK (statut IN ('pret', 'recupere')),
  heure_debut TEXT,
  heure_fin TEXT,
  jours TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (club_id, destinataire_id)
);

-- ── Matériel — catalogue commun à tous les clubs ─────────────────────────
CREATE TABLE IF NOT EXISTS materiel_catalogue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  categorie TEXT NOT NULL,
  nom TEXT NOT NULL,
  unite TEXT NOT NULL DEFAULT 'unité'
);

INSERT INTO materiel_catalogue (categorie, nom, unite)
SELECT * FROM (VALUES
  ('Ballons', 'Ballon taille 3', 'ballon'),
  ('Ballons', 'Ballon taille 4', 'ballon'),
  ('Ballons', 'Ballon taille 5', 'ballon'),
  ('Cages', 'Cage officielle 7.32×2.44m', 'cage'),
  ('Cages', 'Cage réduite 5×2m', 'cage'),
  ('Cages', 'Cage transportable', 'cage'),
  ('Chasubles', 'Chasuble adulte', 'chasuble'),
  ('Chasubles', 'Chasuble enfant', 'chasuble'),
  ('Plots & Cônes', 'Plot de vitesse', 'plot'),
  ('Plots & Cônes', 'Cône de délimitation', 'cône'),
  ('Plots & Cônes', 'Haie de vitesse', 'haie'),
  ('Matelas & Médical', 'Matelas de gardien', 'matelas'),
  ('Matelas & Médical', 'Trousse de secours', 'trousse'),
  ('Matelas & Médical', 'Sac de glace', 'sac'),
  ('Équipement gardien', 'Gants de gardien', 'paire'),
  ('Équipement gardien', 'Protège-genoux', 'paire'),
  ('Matériel d''entraînement', 'Échelle de vitesse', 'échelle'),
  ('Matériel d''entraînement', 'Cerceaux', 'cerceau'),
  ('Matériel d''entraînement', 'Piquets de dribble', 'piquet'),
  ('Matériel d''entraînement', 'Tuyaux élastiques', 'tuyau'),
  ('Filets & Buts', 'Filet de but 11', 'filet'),
  ('Filets & Buts', 'Filet de but réduit', 'filet'),
  ('Transport', 'Chariot à ballons', 'chariot'),
  ('Transport', 'Sac de matériel', 'sac')
) AS v(categorie, nom, unite)
WHERE NOT EXISTS (SELECT 1 FROM materiel_catalogue LIMIT 1);

-- ── Stock matériel par club ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS materiel_stock (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  catalogue_id UUID NOT NULL REFERENCES materiel_catalogue(id) ON DELETE CASCADE,
  quantite_totale INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (club_id, catalogue_id)
);

-- ── Distribution matériel aux éducateurs ────────────────────────────────
CREATE TABLE IF NOT EXISTS materiel_distribution (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  educateur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  educateur_nom TEXT,
  equipe_nom TEXT,
  catalogue_id UUID REFERENCES materiel_catalogue(id),
  nom_materiel TEXT,
  categorie TEXT,
  quantite INT NOT NULL DEFAULT 1,
  saison TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'distribue' CHECK (statut IN ('distribue', 'remise_demandee', 'remis', 'refuse')),
  date_distribution TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_remise TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE equipement_champs ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipement_tailles ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipement_commandes ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiel_catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiel_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiel_distribution ENABLE ROW LEVEL SECURITY;

-- Membre du staff avec droit sur la section 'inventaire' (can_view ou
-- can_edit selon l'opération), même schéma que les autres sections
-- déléguables du club (cf. PERMISSION_SECTIONS/role_permissions).
-- Fonction partagée pour ne pas répéter cette sous-requête 12 fois.
CREATE OR REPLACE FUNCTION a_permission_inventaire(p_club_id uuid, p_edition boolean)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_club_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM staff_club sc
      WHERE sc.club_id = p_club_id AND sc.user_id = auth.uid()
        AND (
          sc.role = 'president'
          OR EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.club_id = p_club_id AND rp.role = sc.role AND rp.section = 'inventaire'
              AND (CASE WHEN p_edition THEN rp.can_edit ELSE rp.can_view END)
          )
        )
    )
$$;

DROP POLICY IF EXISTS "inventaire_lecture_champs" ON equipement_champs;
CREATE POLICY "inventaire_lecture_champs" ON equipement_champs FOR SELECT USING (a_permission_inventaire(club_id, false));
DROP POLICY IF EXISTS "inventaire_ecriture_champs" ON equipement_champs;
CREATE POLICY "inventaire_ecriture_champs" ON equipement_champs FOR ALL USING (a_permission_inventaire(club_id, true)) WITH CHECK (a_permission_inventaire(club_id, true));

-- Tailles : chacun gère les siennes ; le club/staff autorisé lit tout le monde.
DROP POLICY IF EXISTS "chacun_gere_ses_tailles" ON equipement_tailles;
CREATE POLICY "chacun_gere_ses_tailles" ON equipement_tailles FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "responsable_lit_tailles" ON equipement_tailles;
CREATE POLICY "responsable_lit_tailles" ON equipement_tailles FOR SELECT USING (a_permission_inventaire(club_id, false));

DROP POLICY IF EXISTS "inventaire_lecture_commandes" ON equipement_commandes;
CREATE POLICY "inventaire_lecture_commandes" ON equipement_commandes FOR SELECT USING (a_permission_inventaire(club_id, false) OR destinataire_id = auth.uid());
DROP POLICY IF EXISTS "inventaire_ecriture_commandes" ON equipement_commandes;
CREATE POLICY "inventaire_ecriture_commandes" ON equipement_commandes FOR ALL USING (a_permission_inventaire(club_id, true)) WITH CHECK (a_permission_inventaire(club_id, true));

DROP POLICY IF EXISTS "catalogue_lecture_tous" ON materiel_catalogue;
CREATE POLICY "catalogue_lecture_tous" ON materiel_catalogue FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "inventaire_lecture_stock" ON materiel_stock;
CREATE POLICY "inventaire_lecture_stock" ON materiel_stock FOR SELECT USING (a_permission_inventaire(club_id, false));
DROP POLICY IF EXISTS "inventaire_ecriture_stock" ON materiel_stock;
CREATE POLICY "inventaire_ecriture_stock" ON materiel_stock FOR ALL USING (a_permission_inventaire(club_id, true)) WITH CHECK (a_permission_inventaire(club_id, true));

DROP POLICY IF EXISTS "inventaire_lecture_distribution" ON materiel_distribution;
CREATE POLICY "inventaire_lecture_distribution" ON materiel_distribution FOR SELECT USING (a_permission_inventaire(club_id, false) OR educateur_id = auth.uid());
DROP POLICY IF EXISTS "inventaire_ecriture_distribution" ON materiel_distribution;
CREATE POLICY "inventaire_ecriture_distribution" ON materiel_distribution FOR ALL USING (a_permission_inventaire(club_id, true)) WITH CHECK (a_permission_inventaire(club_id, true));
-- L'éducateur peut passer SA ligne à 'remise_demandee' (demande de remise),
-- rien d'autre — la validation/refus reste réservée au club/staff autorisé
-- (policy ci-dessus).
DROP POLICY IF EXISTS "educateur_demande_remise" ON materiel_distribution;
CREATE POLICY "educateur_demande_remise" ON materiel_distribution FOR UPDATE
  USING (educateur_id = auth.uid())
  WITH CHECK (educateur_id = auth.uid() AND statut = 'remise_demandee');

GRANT SELECT, INSERT, UPDATE, DELETE ON equipement_champs, equipement_tailles, equipement_commandes, materiel_catalogue, materiel_stock, materiel_distribution TO authenticated;

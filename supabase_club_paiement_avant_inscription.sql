-- Nouveau flow club : demande sur /offres → paiement → compte créé après
-- coup via invitation (cf. Offres.jsx FormulaireClub, DashboardCoach.jsx
-- copierLienDemandeClub, supabase/functions/stripe-webhook, accepter-invitation,
-- AcceptInvite.jsx). Ne remplace pas l'inscription directe (Register.jsx,
-- plan='club' immédiat) ni le panneau "Clubs en attente" existant — les deux
-- flows cohabitent.

-- ── demandes_club : nouveaux champs du formulaire refondu ───────────────────
ALTER TABLE demandes_club ADD COLUMN IF NOT EXISTS nom_club TEXT;
ALTER TABLE demandes_club ADD COLUMN IF NOT EXISTS nb_licencies TEXT; -- 'c0'..'c500', cf. STRIPE_LINKS_CLUB
ALTER TABLE demandes_club ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'abonnement'; -- 'question' | 'abonnement'
ALTER TABLE demandes_club ADD COLUMN IF NOT EXISTS lien_paiement_envoye BOOLEAN DEFAULT false;
ALTER TABLE demandes_club ADD COLUMN IF NOT EXISTS lien_paiement_envoye_le TIMESTAMPTZ;
-- Le nouveau formulaire n'envoie plus "role" (dropdown Président/Dirigeant/...,
-- remplacé par le nombre de licenciés) — rendre la colonne optionnelle pour ne
-- pas casser l'insert si elle était NOT NULL. No-op si déjà nullable.
ALTER TABLE demandes_club ALTER COLUMN role DROP NOT NULL;

-- ── invitations : lien vers le customer Stripe pour le rôle 'club' ─────────
-- Utilisé par accepter-invitation pour reporter stripe_customer_id sur
-- profiles à la création du compte (les renouvellements Stripe matchent
-- ensuite par stripe_customer_id plutôt que par email).
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- ── invitations.role : autoriser 'club' dans la contrainte CHECK existante ──
-- Recherche dynamique par définition (comme pour staff_club/role_permissions,
-- cf. supabase_role_permissions_arbitre_equipements.sql) plutôt qu'un nom
-- supposé, pour ne pas échouer si la contrainte a été créée avec un autre nom.
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'invitations'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
      and pg_get_constraintdef(oid) not ilike '%club%'
  loop
    execute format('alter table invitations drop constraint %I', c.conname);
  end loop;
end $$;

alter table invitations drop constraint if exists invitations_role_check;
alter table invitations
  add constraint invitations_role_check
  check (role in ('joueur', 'dirigeant', 'parent', 'club'));

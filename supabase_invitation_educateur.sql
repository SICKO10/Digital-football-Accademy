-- Invitation d'un éducateur par le club (saisie manuelle prénom/nom + email,
-- pas de compte existant requis) — réutilise le système d'invitations
-- générique (envoyer-invitation/accepter-invitation) déjà en place pour
-- joueur/dirigeant/parent/club, plutôt qu'un flow séparé.

ALTER TABLE invitations ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES profiles(id);

-- Nécessaire pour l'upsert(onConflict: 'club_id,educateur_id') fait par
-- envoyer-invitation quand l'éducateur invité a déjà un compte. Si cette
-- ligne échoue avec une erreur de doublon, dédoublonner club_educateurs sur
-- (club_id, educateur_id) avant de relancer.
CREATE UNIQUE INDEX IF NOT EXISTS club_educateurs_club_educateur_idx ON club_educateurs(club_id, educateur_id);

-- Autorise 'educateur' dans la contrainte CHECK existante sur invitations.role
-- (recherche dynamique par définition, comme pour les contraintes de rôle
-- staff_club/role_permissions plus haut dans ce projet — ne suppose pas le
-- nom exact de la contrainte).
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
  loop
    execute format('alter table invitations drop constraint %I', c.conname);
  end loop;
end $$;

alter table invitations
  add constraint invitations_role_check
  check (role in ('joueur', 'dirigeant', 'parent', 'club', 'educateur'));

-- Le club doit pouvoir voir ses propres invitations éducateur en attente
-- (liste "invitations envoyées") — la table invitations n'a par ailleurs
-- aucune policy de lecture publique (cf. accepter-invitation), cette policy
-- ne s'applique donc qu'aux lignes où club_id est renseigné (role='educateur'),
-- jamais aux invitations joueur/dirigeant/parent/club des autres clubs.
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "club lit ses invitations educateur" ON invitations;
CREATE POLICY "club lit ses invitations educateur" ON invitations
  FOR SELECT USING (club_id IS NOT NULL AND club_id = auth.uid());

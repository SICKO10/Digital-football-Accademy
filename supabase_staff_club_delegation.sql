-- Étend les droits d'écriture sur staff_club (aujourd'hui : club_manage_staff
-- et club_voit_son_staff n'autorisent que le compte club lui-même, auth.uid() =
-- club_id, à ajouter/modifier/retirer du staff). Avec la section 'staff' de
-- role_permissions désormais délégable (cf. DashboardClub.jsx, PERMISSION_SECTIONS),
-- un rôle avec can_edit sur 'staff' doit pouvoir agir sans passer par le compte
-- club lui-même.
--
-- Portée : même club uniquement (sc.club_id = staff_club.club_id). N'accorde
-- jamais 'president' de fait : la modale "Gérer les permissions" reste
-- réservée au président (front + policies existantes sur role_permissions),
-- et le front (DashboardClub.jsx) retire 'président' des rôles assignables
-- par un éditeur délégué.
drop policy if exists "staff_delegue_gestion_staff" on staff_club;

create policy "staff_delegue_gestion_staff"
  on staff_club for all
  using (
    exists (
      select 1 from staff_club sc
      join role_permissions rp on rp.club_id = sc.club_id and rp.role = sc.role and rp.section = 'staff'
      where sc.club_id = staff_club.club_id and sc.user_id = auth.uid() and rp.can_edit = true
    )
  )
  with check (
    exists (
      select 1 from staff_club sc
      join role_permissions rp on rp.club_id = sc.club_id and rp.role = sc.role and rp.section = 'staff'
      where sc.club_id = staff_club.club_id and sc.user_id = auth.uid() and rp.can_edit = true
    )
  );

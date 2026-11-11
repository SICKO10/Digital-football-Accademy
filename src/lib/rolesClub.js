// Rôles du staff d'un club et sections pilotables par la matrice de droits
// (role_permissions). Partagé entre DashboardClub.jsx et la page Mon club.

export const ROLES_STAFF = [
  { val: 'president', label: 'Président' },
  { val: 'directeur_sportif', label: 'Directeur sportif' },
  { val: 'responsable_formation', label: 'Responsable Formation' },
  { val: 'responsable_ecole_foot', label: 'Responsable École de Foot' },
  { val: 'responsable_preformation', label: 'Responsable Préformation' },
  { val: 'entraineur', label: 'Entraîneur' },
  { val: 'educateur', label: 'Éducateur' },
  { val: 'marketing', label: 'Marketing' },
  { val: 'secretaire', label: 'Secrétaire' },
  { val: 'tresorier', label: 'Trésorier' },
  { val: 'responsable_communication', label: 'Responsable Communication' },
  { val: 'coach_adjoint', label: 'Coach adjoint' },
  { val: 'kine', label: 'Kinésithérapeute' },
  { val: 'intendant', label: 'Intendant' },
  { val: 'preparateur_physique', label: 'Préparateur physique' },
  { val: 'comptable', label: 'Comptable' },
  { val: 'responsable_buvette', label: 'Responsable Buvette' },
  { val: 'responsable_securite', label: 'Responsable Sécurité' },
  { val: 'responsable_equipements', label: 'Responsable Équipements' },
  { val: 'responsable_arbitre', label: 'Responsable Arbitre' },
]

// Catégories d'équipes concernées par l'accès délégué par rôle (cf.
// role_categories_access) — réutilise la liste réelle des catégories que le
// club peut créer (src/lib/categories.js), pas une liste inventée : cocher
// une catégorie qui ne peut jamais exister côté équipes serait inutile.
export const ACCES_CATEGORIES_DEFAUT = {
  responsable_formation: ['U15', 'U16', 'U17', 'U18', 'U19', 'U20', 'Seniors'],
  responsable_ecole_foot: ['U7', 'U8', 'U9', 'U10'],
  responsable_preformation: ['U11', 'U12', 'U13', 'U14'],
}
// Rôles avec accès complet aux catégories par défaut (hors président, qui a
// déjà tout et n'apparaît pas dans la matrice configurable).
export const ROLES_ACCES_COMPLET_DEFAUT = ['directeur_sportif', 'secretaire']
// 'entraineur'/'educateur' sont volontairement absents de cette matrice : leur
// périmètre (leur propre équipe) est déjà déterminé par l'affectation
// educateur_id existante sur chaque catégorie, pas par cette liste.
// 'responsable_buvette'/'responsable_securite'/'responsable_equipements' :
// rôles événementiels/club entier, sans lien avec une équipe précise — un
// accès "par catégorie" n'a pas de sens pour eux.
export const ROLES_HORS_ACCES_CATEGORIES = ['entraineur', 'educateur', 'responsable_buvette', 'responsable_securite', 'responsable_equipements']

// Sections pilotables par la matrice de permissions (role_permissions). 'terrains'
// est séparé de 'sportif' bien que sous le même onglet Sportif dans la nav, pour
// permettre de déléguer le planning des terrains indépendamment du reste (équipes,
// classements, recrutement, éducateurs, qui restent groupés sous 'sportif').
export const PERMISSION_SECTIONS = [
  { id: 'mon_club', label: 'Mon club' },
  { id: 'sportif', label: 'Sportif' },
  { id: 'seances', label: 'Planifier séance' },
  { id: 'terrains', label: 'Planning terrains' },
  { id: 'deplacements', label: 'Déplacements' },
  { id: 'budget', label: 'Budget' },
  { id: 'sponsors', label: 'Sponsors' },
  { id: 'profil', label: 'Profil club' },
  { id: 'evenements', label: 'Événements & Projets' },
  { id: 'stages', label: 'Stages' },
  { id: 'organigramme', label: 'Organigramme' },
  { id: 'staff', label: 'Staff' },
  { id: 'inventaire', label: 'Inventaire' },
  { id: 'newsletter', label: 'Newsletter' },
  { id: 'taches', label: 'Tâches & Responsabilités' },
  { id: 'projet_club_cff4', label: 'Projet Club — CFF4' },
]

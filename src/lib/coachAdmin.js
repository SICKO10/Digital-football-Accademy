// Comptes coach analyseur reconnus par email plutôt que par profiles.plan :
// la contrainte CHECK de la colonne plan en base n'autorise pas la valeur
// 'coach' (testé — rejeté), donc on ne peut pas router ces comptes vers
// /coach via leur plan. Utilisé par App.jsx (redirection post-connexion) et
// DashboardCoach.jsx (accès à l'onglet "Clubs en attente").
export const COACH_ADMIN_EMAILS = ['legacyattitude@gmail.com', 'januariojimmy@gmail.com']

// Règles du circuit de demandes coach → club (bloc 6 du chantier saisons).
// Fonctions pures, testées dans tests/demandesSaison.test.js, sans accès à la base.
import { saisonActuelle } from './saison.js'

export const saisonSuivante = (saison) => {
  const [debut, fin] = saison.split('-').map(Number)
  return `${debut + 1}-${fin + 1}`
}

// Saison visée par les demandes : la saison en cours, ou la suivante si le coach
// vient de clôturer la saison en cours (la bascule automatique n'a pas encore eu lieu).
export const saisonCibleDemande = (derniereClose, maintenant = new Date()) => {
  const actuelle = saisonActuelle(maintenant)
  if (!derniereClose) return actuelle
  const suivante = saisonSuivante(derniereClose)
  return suivante > actuelle ? suivante : actuelle
}

// « Après clôture » : la dernière saison clôturée par le coach précède la saison visée.
// Une clôture ancienne (saisons plus tôt) ne redéclenche pas la question.
export const estApresCloture = (derniereClose, maintenant = new Date()) =>
  !!derniereClose && saisonSuivante(derniereClose) >= saisonActuelle(maintenant)

const parRecent = (a, b) => (b.created_at || '').localeCompare(a.created_at || '')

// Décide ce que Mon équipe doit montrer au coach.
//   etape : 'affiliation' (question 1), 'categorie' (question 2), 'attente' (rien à
//   répondre, le club doit traiter) ou 'aucune' (équipe en place, rien à montrer).
//   enAttente : demandes à afficher (et annuler) ; refusee : dernière demande
//   de catégorie refusée, à montrer au-dessus de la question 2.
export const etapeDemandes = ({ nbEquipes, ajoutOuvert, demandes, derniereClose, maintenant = new Date() }) => {
  const cible = saisonCibleDemande(derniereClose, maintenant)
  const duCycle = (demandes || []).filter(d => d.saison === cible && d.statut !== 'annulee').sort(parRecent)
  const enAttente = duCycle.filter(d => d.statut === 'en_attente')
  const aff = duCycle.find(d => d.type === 'affiliation')
  const refusee = duCycle.find(d => d.type === 'categorie' && d.statut === 'refusee') || null
  const base = { cible, enAttente, refusee, affiliation: aff || null }

  if (nbEquipes > 0) {
    if (ajoutOuvert) return { ...base, etape: 'categorie' }
    return { ...base, etape: enAttente.length ? 'attente' : 'aucune' }
  }
  if (estApresCloture(derniereClose, maintenant) && !aff) return { ...base, etape: 'affiliation' }
  const depart = enAttente.some(d => d.type === 'affiliation' && d.souhaite_rester === false)
  const categorieEnAttente = enAttente.some(d => d.type === 'categorie')
  if (depart || categorieEnAttente) return { ...base, etape: 'attente' }
  return { ...base, etape: 'categorie' }
}

const memeEquipe = (c, nom, equipe) =>
  (c.nom || '').trim().toUpperCase() === nom.trim().toUpperCase()
  && (c.equipe || '').trim().toUpperCase() === equipe.trim().toUpperCase()

// Prépare la demande de catégorie : retrouve l'équipe déjà créée par le club, et
// refuse d'avance une équipe déjà tenue par un autre coach (la base la refuserait
// de toute façon à la validation).
export const preparerDemandeCategorie = ({ clubCategories, userId, nom, equipe }) => {
  const existante = (clubCategories || []).find(c => memeEquipe(c, nom, equipe))
  if (existante?.educateur_id === userId) return { erreur: 'Cette équipe est déjà la tienne.' }
  if (existante?.educateur_id) return { erreur: 'Cette équipe a déjà un coach dans le club. Choisis une autre équipe ou parle-en au club.' }
  return { club_categorie_id: existante?.id || null }
}

export const libelleStatutDemande = (d) => {
  if (d.type === 'affiliation') return d.souhaite_rester ? 'Rester affilié au club' : 'Quitter le club'
  return `Responsable de ${d.categorie_nom} équipe ${d.categorie_equipe}`
}

// ── Côté club (bloc 7) ───────────────────────────────────────────────────────
// Miroir de saison_role_couvre_categorie (base) : sert seulement à écrire « à valider
// par … » ; la vraie décision est prise par la base (saison_peut_valider).
const trancheAge = (categorie) => {
  const c = (categorie || '').toUpperCase()
  if (!c) return null
  if (c.includes('SENIOR') || c.includes('SÉNIOR')) return 99
  const m = c.match(/^\s*U\s*(\d{1,2})/)
  return m ? Number(m[1]) : null
}

export const roleCouvreCategorie = (role, categorie) => {
  if (role === 'president' || role === 'directeur_sportif') return true
  if (!categorie) return role === 'responsable_formation'
  const age = trancheAge(categorie)
  if (age === null) return false
  if (role === 'responsable_formation') return age >= 15
  if (role === 'responsable_preformation') return age >= 11 && age <= 14
  if (role === 'responsable_ecole_foot') return age <= 10
  return false
}

// Catégorie envoyée à la base pour juger une demande : aucune pour une affiliation.
export const categoriePourDroit = (demande) => (demande.type === 'categorie' ? demande.categorie_nom : null)

// « Compte principal du club, Directeur sportif ou Marie Dupont (Responsable Formation) ».
export const libelleValideurs = ({ staff, categorie, libelleRole }) => {
  const noms = []
  const vus = new Set()
  for (const m of staff || []) {
    if (!roleCouvreCategorie(m.role, categorie)) continue
    const nom = [m.membre?.prenom, m.membre?.nom].filter(Boolean).join(' ').trim()
    const texte = nom ? `${nom} (${libelleRole(m.role)})` : libelleRole(m.role)
    if (vus.has(texte)) continue
    vus.add(texte)
    noms.push(texte)
  }
  return ['le compte principal du club', ...noms].join(', ')
}

export const libelleDemandeClub = (d, labelCategorie = (x) => x) => {
  if (d.type === 'affiliation') return d.souhaite_rester ? 'Souhaite rester affilié au club' : 'Souhaite quitter le club'
  return `Responsable de ${labelCategorie(d.categorie_nom)} équipe ${d.categorie_equipe}`
}

// Ce que le club voit pour une demande, selon qui est connecté.
//   'valider' : boutons Valider et Refuser ; 'confirmer_depart' : un seul bouton (un
//   départ ne se refuse pas) ; 'propre' : sa propre demande ; 'refuse' : rôle non autorisé.
export const actionsDemandeClub = ({ demande, peutValider, userId }) => {
  if (demande.educateur_id === userId) return 'propre'
  if (!peutValider) return 'refuse'
  if (demande.type === 'affiliation' && demande.souhaite_rester === false) return 'confirmer_depart'
  return 'valider'
}

// Texte de la notification envoyée au coach après le traitement.
export const notificationCoach = ({ demande, decision, labelCategorie = (x) => x }) => {
  const sujet = demande.type === 'affiliation'
    ? (demande.souhaite_rester ? 'ta demande de rester au club' : 'ton départ du club')
    : `ta demande pour ${labelCategorie(demande.categorie_nom)} équipe ${demande.categorie_equipe}`
  if (decision === 'validee') {
    return { titre: demande.type === 'affiliation' && !demande.souhaite_rester ? 'Départ confirmé' : 'Demande acceptée', contenu: `Le club a accepté ${sujet}.` }
  }
  return { titre: 'Demande refusée', contenu: `Le club a refusé ${sujet}.` }
}

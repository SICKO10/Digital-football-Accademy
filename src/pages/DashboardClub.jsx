import { useEffect, useState, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, signOutSafe } from '../supabase'
import ScoutCenter from '../components/ScoutCenter'
import { CRITERES_EDU } from './DashboardEducateur'
import { ModalGrilleSeance } from '../components/GrilleSeance'
import { CATEGORIES as CATEGORIES_STANDARD } from '../lib/categories'
import GestionSponsors from '../components/sponsors/GestionSponsors'
import Deplacements from '../components/Deplacements'
import PlanningTerrains from '../components/PlanningTerrains'
import TerrainsLiberesWidget from '../components/TerrainsLiberesWidget'
import PlanningSemaineWidget from '../components/PlanningSemaineWidget'
import { useLang } from '../hooks/useLang'
import { t, LANGS, localeOf } from '../lib/translations'
import { STRIPE_LINKS_CLUB, CONTACT_EMAIL } from '../lib/stripeLinks'
import OnboardingGuide from '../components/OnboardingGuide'
import FloatingHelper from '../components/FloatingHelper'
import { enqueueGroqRequest, libelleStatutGroq } from '../lib/groqQueue'
import { colors, alpha } from '../tokens'
import StatsEquipe from '../components/StatsEquipe'

const CLUB_FAQ = [
  { q: "Comment ajouter une catégorie (équipe) ?", a: "Dans Sportif → Catégories → \"+ Ajouter\". Choisis la tranche d'âge, l'équipe (A, B...) et affecte un éducateur." },
  { q: "Comment affilier un éducateur à mon club ?", a: "Dans Sportif → Éducateurs, recherche-le par nom ou envoie une invitation par email. Il doit accepter pour rejoindre officiellement le club." },
  { q: "Comment gérer le planning des terrains ?", a: "Dans Sportif → Planning des terrains, importe ton fichier Excel/CSV ou saisis les créneaux manuellement pour chaque catégorie." },
  { q: "Comment répartir les joueurs dans les mini-bus ?", a: "Dans Administratif → Répartition mini-bus, ajoute tes véhicules et l'outil répartit automatiquement les joueurs inscrits au déplacement." },
  { q: "Qui peut voir le budget du club ?", a: "L'onglet Budget est réservé aux rôles Président et Secrétaire." },
];


// ── Icônes SVG menu/widgets (même convention que DashboardEducateur.jsx :
// 16x16, viewBox 0 0 24 24, stroke=currentColor, strokeWidth=2, round caps/joins) ──
const IcoHome      = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/></svg>
const IcoUsers     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
const IcoBuilding  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 22V12h6v10"/><path d="M9 7h1M14 7h1M9 11h1M14 11h1"/></svg>
const IcoTrophy    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0018 9h-1.26A8 8 0 103 16.29"/></svg>
const IcoCalendar  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
const IcoBus       = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="10" rx="2"/><path d="M3 11h18"/><circle cx="7.5" cy="18.5" r="1.5"/><circle cx="16.5" cy="18.5" r="1.5"/></svg>
const IcoGear      = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
const IcoCarteBadge = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><line x1="14" y1="10" x2="19" y2="10"/><line x1="14" y1="14" x2="19" y2="14"/></svg>
const IcoBallon    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 7l3.5 2.5-1.3 4.1h-4.4L8.5 9.5z"/><path d="M12 2v5M8.5 9.5L4 8M15.5 9.5L20 8M9.8 13.6l-2.3 4.6M14.2 13.6l2.3 4.6"/></svg>
const IcoHorloge   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
const IcoUserPlus  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
const IcoClipboard = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12l2 2 4-4"/></svg>
const IcoSearch    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
const IcoTerrain   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20"/><circle cx="12" cy="12" r="3"/></svg>
const IcoLink      = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
const IcoStar      = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
const IcoWallet    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6.5v11M15 9.5c0-1.4-1.5-2.3-3-2.3s-3 .9-3 2.3 1.5 1.8 3 2.3 3 .9 3 2.3-1.5 2.3-3 2.3-3-.9-3-2.3"/></svg>
const IcoBox       = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>

const EQUIPES = ['A', 'B']

const ROLES_STAFF = [
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
const ACCES_CATEGORIES_DEFAUT = {
  responsable_formation: ['U15', 'U16', 'U17', 'U18', 'U19', 'U20', 'Seniors'],
  responsable_ecole_foot: ['U7', 'U8', 'U9', 'U10'],
  responsable_preformation: ['U11', 'U12', 'U13', 'U14'],
}
// Rôles avec accès complet aux catégories par défaut (hors président, qui a
// déjà tout et n'apparaît pas dans la matrice configurable).
const ROLES_ACCES_COMPLET_DEFAUT = ['directeur_sportif', 'secretaire']
// 'entraineur'/'educateur' sont volontairement absents de cette matrice : leur
// périmètre (leur propre équipe) est déjà déterminé par l'affectation
// educateur_id existante sur chaque catégorie, pas par cette liste.
// 'responsable_buvette'/'responsable_securite'/'responsable_equipements' :
// rôles événementiels/club entier, sans lien avec une équipe précise — un
// accès "par catégorie" n'a pas de sens pour eux.
const ROLES_HORS_ACCES_CATEGORIES = ['entraineur', 'educateur', 'responsable_buvette', 'responsable_securite', 'responsable_equipements']
const ROLE_STAFF_LABEL = (role) => ROLES_STAFF.find(r => r.val === role)?.label || role

// Rôles de l'organigramme (annuaire de contacts) — texte libre, distinct de
// ROLES_STAFF (rôles d'accès à l'app, valeurs contraintes utilisées par la RLS).
const ROLES_ORGANIGRAMME = [
  'Président', 'Vice-Président', 'Secrétaire', 'Trésorier',
  'Directeur Sportif', 'Éducateur', 'Éducateur Gardiens',
  'Kinésithérapeute', 'Médecin', 'Préparateur Physique',
  'Responsable Mini-Bus', 'Responsable Buvette',
  'Responsable Marketing', 'Responsable Réseaux Sociaux',
  'Responsable Recrutement', 'Délégué', 'Autre',
]
// Organigramme V2 : département (regroupement visuel, indépendant des catégories
// ci-dessus qui servaient à l'ancien affichage en grille) et couleur associée pour
// l'arbre hiérarchique.
const DEPT_COLORS = {
  'Direction':      { bg: '#1a1a2e', border: '#818cf8', text: '#818cf8', dot: '#818cf8' },
  'Sportif':        { bg: '#0f1f0f', border: colors.accent.green, text: colors.accent.green, dot: colors.accent.green },
  'Administration': { bg: '#1a1200', border: colors.accent.amber, text: colors.accent.amber, dot: colors.accent.amber },
  'Communication':  { bg: '#1a0f1f', border: '#c084fc', text: '#c084fc', dot: '#c084fc' },
  'Finance':        { bg: '#0f1a1a', border: colors.accent.cyan, text: colors.accent.cyan, dot: colors.accent.cyan },
  'Médical':        { bg: '#1f0f0f', border: '#f87171', text: '#f87171', dot: '#f87171' },
  'Autre':          { bg: colors.background.raised, border: '#6b7280', text: '#9ca3af', dot: '#6b7280' },
}
const getDeptColor = (dept) => DEPT_COLORS[dept] || DEPT_COLORS['Autre']

// Construit l'arbre hiérarchique à partir de la liste plate organigramme_club, en
// reliant chaque membre à son "superieur" via la clé "Nom Prénom" (même convention
// que la colonne du template Excel et que le prompt de scan IA).
const construireArbreOrganigramme = (membres) => {
  const map = {}
  const roots = []
  membres.forEach(m => { map[`${m.nom} ${m.prenom}`.trim()] = { ...m, children: [] } })
  membres.forEach(m => {
    const node = map[`${m.nom} ${m.prenom}`.trim()]
    const sup = m.superieur?.trim()
    if (sup && map[sup] && map[sup] !== node) map[sup].children.push(node)
    else roots.push(node)
  })
  return roots
}

// Sections pilotables par la matrice de permissions (role_permissions). 'terrains'
// est séparé de 'sportif' bien que sous le même onglet Sportif dans la nav, pour
// permettre de déléguer le planning des terrains indépendamment du reste (équipes,
// classements, recrutement, éducateurs, qui restent groupés sous 'sportif').
const PERMISSION_SECTIONS = [
  { id: 'sportif', label: 'Sportif' },
  { id: 'terrains', label: 'Planning terrains' },
  { id: 'deplacements', label: 'Déplacements' },
  { id: 'budget', label: 'Budget' },
  { id: 'sponsors', label: 'Sponsors' },
  { id: 'profil', label: 'Profil club' },
  { id: 'evenements', label: 'Événements & Projets' },
  { id: 'organigramme', label: 'Organigramme' },
  { id: 'staff', label: 'Staff' },
  { id: 'inventaire', label: 'Inventaire' },
]

// Comportement avant toute configuration explicite par le président (aucune ligne
// en base pour ce club/rôle/section) — reproduit les règles d'accès qui existaient
// avant ce système, pour ne rien casser pour les clubs déjà en production. Section
// toute nouvelle (evenements) : pas de règle historique à préserver, donc personne
// d'autre que le président n'y a accès tant qu'il ne l'accorde pas explicitement.
const PERMISSION_DEFAULTS = {
  sportif: ['president', 'directeur_sportif'],
  terrains: ['president', 'directeur_sportif'],
  deplacements: ['president', 'marketing', 'secretaire'],
  budget: ['president', 'secretaire'],
  sponsors: ['president', 'marketing', 'secretaire'],
  profil: ['president', 'marketing', 'secretaire'],
  evenements: [],
  organigramme: [],
  staff: [],
  inventaire: [],
}

const TYPES_EVENEMENT = [
  { val: 'tournoi', label: 'Tournoi', emoji: '🏆' },
  { val: 'soiree', label: 'Soirée', emoji: '🎉' },
  { val: 'reunion', label: 'Réunion', emoji: '📋' },
  { val: 'autre', label: 'Autre', emoji: '📌' },
]
const TYPE_EVENEMENT_INFO = (val) => TYPES_EVENEMENT.find(t => t.val === val) || TYPES_EVENEMENT[3]

const STATUTS_PROJET = [
  { val: 'en_attente', label: 'En attente', color: '#f59e0b' },
  { val: 'en_cours', label: 'En cours', color: colors.accent.blue },
  { val: 'termine', label: 'Terminé', color: colors.accent.green },
]
const MOIS_LABEL = (dateStr) => {
  const d = new Date(dateStr + 'T12:00:00')
  const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

const STAT_CARD_COLORS = { green: colors.accent.green, orange: '#f59e0b', red: colors.accent.red }
function StatCard({ label, valeur, couleur }) {
  const color = STAT_CARD_COLORS[couleur] || colors.text.primary
  return (
    <div style={{ background: colors.background.surface, border: '1px solid #222', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
      <p style={{ margin: '0 0 4px', fontSize: '10px', color: colors.text.dim, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
      <p style={{ margin: 0, fontSize: '20px', fontWeight: 800, color }}>{valeur}</p>
    </div>
  )
}

// ── Budget club ──
const CATEGORIES_DEPENSE = [
  { label: 'Équipement', emoji: '👕' },
  { label: 'Transport', emoji: '🚌' },
  { label: 'Arbitrage', emoji: '🟡' },
  { label: 'Licences', emoji: '📋' },
  { label: 'Infrastructure', emoji: '🏟️' },
  { label: 'Matériel', emoji: '⚽' },
  { label: 'Médical', emoji: '🏥' },
  { label: 'Communication', emoji: '📣' },
  { label: 'Éducateur', emoji: '🧑‍🏫' },
  { label: 'Équipes', emoji: '⚽' },
  { label: 'Divers', emoji: '📦' },
]

const CATEGORIES_RECETTE = [
  { label: 'Cotisations', emoji: '💳' },
  { label: 'Subvention', emoji: '🏛️' },
  { label: 'Sponsor', emoji: '🤝' },
  { label: 'Tournoi', emoji: '🏆' },
  { label: 'Vente', emoji: '🛒' },
  { label: 'Don', emoji: '🎁' },
  { label: 'Divers', emoji: '📦' },
]

const COULEURS_BUDGET = [
  colors.accent.green, colors.accent.blue, '#f59e0b', colors.accent.purpleLight,
  '#f472b6', '#34d399', '#fb923c', '#38bdf8', '#e879f9',
]

function DonutChart({ segments, total, label, couleurCentrale = colors.text.primary, lang = 'fr' }) {
  const R = 70
  const STROKE = 18
  const C = 2 * Math.PI * R

  if (total === 0) return (
    <div style={{ width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={R} fill="none" stroke={colors.background.raised} strokeWidth={STROKE} />
        <text x="90" y="86" textAnchor="middle" fill={colors.text.faint} fontSize="11" fontFamily="Inter, sans-serif">Aucune</text>
        <text x="90" y="102" textAnchor="middle" fill={colors.text.faint} fontSize="11" fontFamily="Inter, sans-serif">entrée</text>
      </svg>
    </div>
  )

  const segmentsAvecOffset = segments.reduce((acc, seg) => {
    const cumulPrecedent = acc.length ? acc[acc.length - 1].cumul : 0
    acc.push({ ...seg, offset: -cumulPrecedent * C / 100, cumul: cumulPrecedent + seg.pct })
    return acc
  }, [])

  return (
    <div style={{ position: 'relative', width: 180, height: 180, flexShrink: 0 }}>
      <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="90" cy="90" r={R} fill="none" stroke={colors.background.raised} strokeWidth={STROKE} />
        {segmentsAvecOffset.map((seg, i) => {
          const dash = (seg.pct / 100) * C
          return (
            <circle key={i} cx="90" cy="90" r={R} fill="none"
              stroke={seg.color} strokeWidth={STROKE}
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={seg.offset}
              strokeLinecap="butt"
            />
          )
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <span style={{ fontSize: 18, fontWeight: 900, color: couleurCentrale, fontFamily: 'Inter, sans-serif' }}>
          {total.toLocaleString(localeOf(lang), { maximumFractionDigits: 0 })} €
        </span>
        <span style={{ fontSize: 10, color: colors.text.faint, fontFamily: 'Inter, sans-serif', marginTop: 2 }}>{label}</span>
      </div>
    </div>
  )
}

function AccueilClub({ clubId, categories, educateursAcceptes, educateursEnAttente, joueursClub, matchsClub, evenementsClub, setActiveCategorie, setActiveTab, lang, isMobile, couleurPrincipale = colors.accent.green }) {
  const aujourdHui = new Date().toISOString().split('T')[0]

  const totalLicencies = joueursClub.length
  const nbEquipes = categories.length
  const nbEducateurs = educateursAcceptes.length
  const nbEnAttente = educateursEnAttente.length

  const catLabel = (educateurId) => {
    const cat = categories.find(c => c.educateur_id === educateurId)
    return cat ? `${cat.nom}${cat.equipe ? ` ${cat.equipe}` : ''}` : null
  }

  const derniersResultats = matchsClub
    .filter(m => m.date <= aujourdHui && m.score_nous !== '' && m.score_nous !== null && m.score_nous !== undefined)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

  const prochainsMatchs = matchsClub
    .filter(m => m.date > aujourdHui)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)

  const joueursRecents = joueursClub.slice(0, 5)

  const ACTIONS = [
    { emoji: '➕', label: t('club_action_ajouter_categorie', lang), categorie: 'sportif', tab: 'categories' },
    { emoji: '📧', label: t('club_inviter_educateur_titre', lang), categorie: 'sportif', tab: 'educateurs' },
    { emoji: '🔍', label: t('club_tab_recrutement', lang), categorie: 'sportif', tab: 'recrutement' },
    { emoji: '🏢', label: t('club_administratif', lang), categorie: 'administratif', tab: 'sponsors' },
  ]

  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}><IcoHome /> {t('club_accueil', lang)}</h1>
      <p style={{ color: colors.text.faint, fontSize: '13px', marginBottom: '1.5rem' }}>{t('club_accueil_sous_titre', lang)}</p>

      <TerrainsLiberesWidget clubId={clubId} accentColor={couleurPrincipale} titre="Terrains disponibles ce jour" />

      {/* Planning club : matchs de toutes les équipes affiliées + événements club
          (tournois, soirées, réunions...) — volontairement pas les séances
          d'entraînement, qui restent une vue éducateur. */}
      <div style={{ background: colors.background.surface, border: `1px solid ${couleurPrincipale}30`, borderRadius: '14px', padding: '1.25rem', marginBottom: '2rem' }}>
        <p style={{ fontWeight: 700, fontSize: '13px', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}><IcoCalendar /> Planning du club</p>
        <PlanningSemaineWidget matchs={matchsClub} evenements={evenementsClub} accentColor={couleurPrincipale} onClickEvenement={() => { setActiveCategorie('administratif'); setActiveTab('evenements') }} />
      </div>

      {/* Widgets résumé */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '14px', marginBottom: '2rem' }}>
        <div style={{ background: colors.background.surface, border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' }}>
          <p style={{ fontSize: '11px', color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}><IcoCarteBadge /> {t('club_licencies', lang)}</p>
          <p style={{ fontSize: '28px', fontWeight: 800, margin: 0, color: couleurPrincipale }}>{totalLicencies}</p>
          <p style={{ fontSize: '12px', color: colors.text.faint, margin: '4px 0 0' }}>{t('club_toutes_equipes', lang)}</p>
        </div>

        <div style={{ background: colors.background.surface, border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' }}>
          <p style={{ fontSize: '11px', color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}><IcoBallon /> {t('club_equipes_actives', lang)}</p>
          <p style={{ fontSize: '28px', fontWeight: 800, margin: 0, color: couleurPrincipale }}>{nbEquipes}</p>
          <p style={{ fontSize: '12px', color: colors.text.faint, margin: '4px 0 0' }}>{nbEquipes > 1 ? t('club_categorie_plur', lang) : t('club_categorie_sing', lang)}</p>
        </div>

        <div style={{ background: colors.background.surface, border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' }}>
          <p style={{ fontSize: '11px', color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}><IcoUsers /> {t('club_tab_educateurs', lang)}</p>
          <p style={{ fontSize: '28px', fontWeight: 800, margin: 0, color: couleurPrincipale }}>{nbEducateurs}</p>
          <p style={{ fontSize: '12px', color: colors.text.faint, margin: '4px 0 0' }}>{nbEducateurs > 1 ? t('club_educateur_affilie_plur', lang) : t('club_educateur_affilie_sing', lang)}</p>
        </div>

        <div style={{ background: colors.background.surface, border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' }}>
          <p style={{ fontSize: '11px', color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}><IcoHorloge /> {t('club_demandes_affiliation', lang)}</p>
          <p style={{ fontSize: '28px', fontWeight: 800, margin: 0, color: nbEnAttente > 0 ? couleurPrincipale : colors.text.primary }}>{nbEnAttente}</p>
          <p style={{ fontSize: '12px', color: colors.text.faint, margin: '4px 0 0' }}>{t('club_en_attente', lang)}</p>
        </div>
      </div>

      {/* Actions rapides */}
      <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 12px' }}>{t('club_actions_rapides', lang)}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '2rem' }}>
        {ACTIONS.map(a => (
          <button key={a.label} onClick={() => { setActiveCategorie(a.categorie); setActiveTab(a.tab) }}
            style={{ background: colors.background.surface, border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1.25rem 1rem', cursor: 'pointer', textAlign: 'center', color: colors.text.primary, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', fontFamily: 'Inter, sans-serif' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = couleurPrincipale + '40'}
            onMouseLeave={e => e.currentTarget.style.borderColor = colors.background.raised}>
            <span style={{ fontSize: '26px' }}>{a.emoji}</span>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>{a.label}</span>
          </button>
        ))}
      </div>

      {/* Fil d'activité récente */}
      <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 12px' }}>{t('club_activite_recente', lang)}</p>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px' }}>
        <div style={{ background: colors.background.surface, border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' }}>
          <p style={{ fontWeight: 700, fontSize: '13px', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}><IcoTrophy /> {t('club_derniers_resultats', lang)}</p>
          {derniersResultats.length === 0 ? (
            <p style={{ color: colors.text.disabled, fontSize: '12px', margin: 0 }}>{t('club_aucun_resultat_accueil', lang)}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {derniersResultats.map(m => {
                const nous = parseInt(m.score_nous)
                const eux = parseInt(m.score_eux)
                const resultat = nous > eux ? 'V' : nous < eux ? 'D' : 'N'
                const couleur = resultat === 'V' ? colors.accent.green : resultat === 'D' ? colors.accent.red : '#f59e0b'
                const label = catLabel(m.educateur_id)
                return (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ background: couleur + '20', color: couleur, fontWeight: 800, fontSize: '11px', padding: '2px 8px', borderRadius: '20px', flexShrink: 0 }}>{resultat}</span>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.domicile ? 'vs' : '@'} {m.adversaire || '—'}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.faint }}>{label ? `${label} · ` : ''}{new Date(m.date).toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'short' })}</p>
                      </div>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '13px', color: couleur, whiteSpace: 'nowrap' }}>{m.score_nous} - {m.score_eux}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ background: colors.background.surface, border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' }}>
          <p style={{ fontWeight: 700, fontSize: '13px', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}><IcoCalendar /> {t('club_prochains_matchs', lang)}</p>
          {prochainsMatchs.length === 0 ? (
            <p style={{ color: colors.text.disabled, fontSize: '12px', margin: 0 }}>{t('club_aucun_match_venir', lang)}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {prochainsMatchs.map(m => {
                const label = catLabel(m.educateur_id)
                return (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.adversaire || '—'}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.faint }}>{label ? `${label} · ` : ''}{new Date(m.date).toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'short' })}{m.heure ? ` · ${m.heure}` : ''}</p>
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0, background: m.domicile ? couleurPrincipale + '20' : colors.accent.blue + alpha.soft, color: m.domicile ? couleurPrincipale : colors.accent.blue, border: `1px solid ${m.domicile ? couleurPrincipale + '40' : colors.accent.blue + alpha.medium}` }}>
                      {m.domicile ? <IcoHome /> : <IcoBus />} {m.domicile ? t('comp_domicile', lang) : t('club_deplacement', lang)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ background: colors.background.surface, border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' }}>
          <p style={{ fontWeight: 700, fontSize: '13px', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}><IcoUserPlus /> {t('club_nouveaux_joueurs', lang)}</p>
          {joueursRecents.length === 0 ? (
            <p style={{ color: colors.text.disabled, fontSize: '12px', margin: 0 }}>{t('club_aucun_joueur_recent', lang)}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {joueursRecents.map(j => (
                <div key={j.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.prenom} {j.nom}{j.poste ? ` — ${j.poste}` : ''}</p>
                  <span style={{ fontSize: '11px', color: colors.text.faint, whiteSpace: 'nowrap', flexShrink: 0 }}>{j.created_at ? new Date(j.created_at).toLocaleDateString(localeOf(lang)) : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Personnalisation visuelle du club (couleurs, photo de fond, logo hero, slogan) ──
// Edite une copie locale des couleurs/slogan (themeEdit), appliquée immédiatement
// sur le hero banner et la nav via sauvegarderTheme (optimistic sur `club`, parent).
// Les uploads (fond/hero) se sauvegardent directement au choix du fichier — pas de
// bouton "Appliquer" séparé pour ceux-là.
const PRESETS_PRINCIPALE = [colors.accent.green, colors.accent.orange, colors.accent.blue, '#f43f5e', colors.accent.amber, colors.accent.purpleLight, colors.accent.cyan, '#ffffff']
const PRESETS_SECONDAIRE = [colors.accent.cyan, colors.accent.green, '#818cf8', colors.accent.orange, '#ec4899', '#34d399', colors.accent.amber, '#94a3b8']

function ThemeEditor({ club, themeEdit, setThemeEdit, sauvegarderTheme, uploaderImageTheme, savingTheme, themeUploading, isMobile, onClose }) {
  const label = { color: '#9ca3af', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }
  const btnFichier = { display: 'inline-flex', alignItems: 'center', gap: '8px', background: colors.background.raised, border: '1px solid #333', borderRadius: '8px', color: '#9ca3af', padding: '8px 14px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }

  return (
    <div style={{ background: colors.background.sunken, border: '1px solid #1a1a1a', borderRadius: '16px', padding: '20px', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <h3 style={{ margin: 0, color: colors.text.primary, fontSize: '15px', fontWeight: 700 }}>Personnalisation du dashboard</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
        {/* Couleur principale */}
        <div>
          <label style={label}>Couleur principale</label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="color" value={themeEdit.couleur_principale}
              onChange={e => setThemeEdit(p => ({ ...p, couleur_principale: e.target.value }))}
              style={{ width: '44px', height: '44px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'none', padding: 0 }} />
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {PRESETS_PRINCIPALE.map(c => (
                <div key={c} onClick={() => { setThemeEdit(p => ({ ...p, couleur_principale: c })); sauvegarderTheme({ couleur_principale: c }) }}
                  style={{ width: '26px', height: '26px', borderRadius: '6px', background: c, cursor: 'pointer', border: (club?.couleur_principale || colors.accent.green) === c ? '2px solid white' : '2px solid transparent' }} />
              ))}
            </div>
          </div>
          <button onClick={() => sauvegarderTheme({ couleur_principale: themeEdit.couleur_principale })} disabled={savingTheme}
            style={{ marginTop: '8px', background: colors.background.raised, border: '1px solid #333', borderRadius: '6px', color: '#9ca3af', padding: '5px 12px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            Appliquer
          </button>
        </div>

        {/* Couleur secondaire */}
        <div>
          <label style={label}>Couleur secondaire</label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="color" value={themeEdit.couleur_secondaire}
              onChange={e => setThemeEdit(p => ({ ...p, couleur_secondaire: e.target.value }))}
              style={{ width: '44px', height: '44px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'none', padding: 0 }} />
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {PRESETS_SECONDAIRE.map(c => (
                <div key={c} onClick={() => { setThemeEdit(p => ({ ...p, couleur_secondaire: c })); sauvegarderTheme({ couleur_secondaire: c }) }}
                  style={{ width: '26px', height: '26px', borderRadius: '6px', background: c, cursor: 'pointer', border: (club?.couleur_secondaire || colors.accent.cyan) === c ? '2px solid white' : '2px solid transparent' }} />
              ))}
            </div>
          </div>
          <button onClick={() => sauvegarderTheme({ couleur_secondaire: themeEdit.couleur_secondaire })} disabled={savingTheme}
            style={{ marginTop: '8px', background: colors.background.raised, border: '1px solid #333', borderRadius: '6px', color: '#9ca3af', padding: '5px 12px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            Appliquer
          </button>
        </div>

        {/* Photo de fond */}
        <div>
          <label style={label}>Photo de fond (stade, terrain, vestiaire…)</label>
          {club?.image_fond_url && (
            <img src={club.image_fond_url} alt="Fond" style={{ width: '100%', maxWidth: '280px', height: '80px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px', display: 'block' }} />
          )}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={btnFichier}>
              {themeUploading === 'image_fond_url' ? '⏳ Upload...' : '📷 Choisir une photo'}
              <input type="file" accept="image/*" style={{ display: 'none' }} disabled={!!themeUploading}
                onChange={e => e.target.files[0] && uploaderImageTheme(e.target.files[0], 'image_fond_url')} />
            </label>
            {club?.image_fond_url && (
              <button onClick={() => sauvegarderTheme({ image_fond_url: null })}
                style={{ background: 'none', border: '1px solid #333', borderRadius: '6px', color: colors.accent.red, padding: '6px 10px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                Supprimer
              </button>
            )}
          </div>
        </div>

        {/* Photo hero / logo grand format */}
        <div>
          <label style={label}>Photo / logo du club (grand format, remplace l'avatar dans l'en-tête)</label>
          {club?.image_hero_url && (
            <img src={club.image_hero_url} alt="Hero" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '12px', marginBottom: '8px', display: 'block' }} />
          )}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={btnFichier}>
              {themeUploading === 'image_hero_url' ? '⏳ Upload...' : '🖼️ Choisir logo / photo'}
              <input type="file" accept="image/*" style={{ display: 'none' }} disabled={!!themeUploading}
                onChange={e => e.target.files[0] && uploaderImageTheme(e.target.files[0], 'image_hero_url')} />
            </label>
            {club?.image_hero_url && (
              <button onClick={() => sauvegarderTheme({ image_hero_url: null })}
                style={{ background: 'none', border: '1px solid #333', borderRadius: '6px', color: colors.accent.red, padding: '6px 10px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                Supprimer
              </button>
            )}
          </div>
        </div>

        {/* Slogan */}
        <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
          <label style={label}>Slogan du club</label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input type="text" placeholder="Ex: Ensemble, on va plus loin" value={themeEdit.slogan}
              onChange={e => setThemeEdit(p => ({ ...p, slogan: e.target.value }))}
              style={{ flex: 1, minWidth: '200px', background: colors.background.surface, border: '1px solid #2a2a2a', borderRadius: '8px', color: colors.text.primary, padding: '10px 14px', fontSize: '14px', outline: 'none', fontFamily: 'Inter, sans-serif' }} />
            <button onClick={() => sauvegarderTheme({ slogan: themeEdit.slogan.trim() || null })} disabled={savingTheme}
              style={{ background: club?.couleur_principale || colors.accent.green, border: 'none', borderRadius: '8px', color: colors.black, fontWeight: 700, padding: '10px 18px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              Sauvegarder
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Matrice de permissions par rôle (Staff → "Gérer les permissions") ────────
// Grille : colonnes = PERMISSION_SECTIONS, lignes = ROLES_STAFF (hors président,
// qui a tout et n'apparaît pas ici). Édite une copie locale, ne touche la base
// qu'au clic sur "Enregistrer" via onSave (upsert complet de la matrice).
function PermissionsModal({ rolePermissions, roleCategoriesAccess, saving, onSave, onClose, couleurPrincipale = colors.accent.green }) {
  const rolesConfigurables = ROLES_STAFF.filter(r => r.val !== 'president')
  // Sous-liste pour l'accès par catégorie : 'entraineur'/'educateur' en sont
  // exclus (cf. ROLES_HORS_ACCES_CATEGORIES, leur périmètre vient de
  // l'affectation educateur_id existante, pas de cette matrice).
  const rolesCategorisables = rolesConfigurables.filter(r => !ROLES_HORS_ACCES_CATEGORIES.includes(r.val))

  const initMatrice = () => {
    const m = {}
    for (const role of rolesConfigurables) {
      m[role.val] = {}
      for (const section of PERMISSION_SECTIONS) {
        const row = rolePermissions.find(p => p.role === role.val && p.section === section.id)
        m[role.val][section.id] = row
          ? { can_view: row.can_view, can_edit: row.can_edit }
          : { can_view: (PERMISSION_DEFAULTS[section.id] || []).includes(role.val), can_edit: (PERMISSION_DEFAULTS[section.id] || []).includes(role.val) }
      }
    }
    return m
  }

  const [matrice, setMatrice] = useState(initMatrice)

  const toggle = (role, section, cle) => {
    setMatrice(prev => {
      const cell = prev[role][section]
      const next = { ...cell, [cle]: !cell[cle] }
      // Voir désactivé ⇒ Modifier n'a plus de sens ; Modifier activé ⇒ Voir est requis.
      if (cle === 'can_view' && !next.can_view) next.can_edit = false
      if (cle === 'can_edit' && next.can_edit) next.can_view = true
      return { ...prev, [role]: { ...prev[role], [section]: next } }
    })
  }

  const initCatAccess = () => {
    const m = {}
    for (const role of rolesCategorisables) {
      const row = roleCategoriesAccess.find(r => r.role === role.val)
      if (row) {
        m[role.val] = { acces_complet: row.acces_complet, categories: row.categories || [] }
      } else {
        m[role.val] = {
          acces_complet: ROLES_ACCES_COMPLET_DEFAUT.includes(role.val),
          categories: ACCES_CATEGORIES_DEFAUT[role.val] || [],
        }
      }
    }
    return m
  }

  const [catAccess, setCatAccess] = useState(initCatAccess)

  const toggleAccesComplet = (role) => {
    setCatAccess(prev => ({ ...prev, [role]: { ...prev[role], acces_complet: !prev[role].acces_complet } }))
  }
  const toggleCategorie = (role, categorie) => {
    setCatAccess(prev => {
      const cats = prev[role].categories
      const next = cats.includes(categorie) ? cats.filter(c => c !== categorie) : [...cats, categorie]
      return { ...prev, [role]: { ...prev[role], categories: next } }
    })
  }

  const cellBtn = (active, label, color) => ({
    padding: '3px 9px', borderRadius: 5, border: 'none', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
    background: active ? `${color}20` : colors.background.raised, color: active ? color : '#3a3a3a',
  })

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: colors.background.base, border: '1px solid #1a1a1a', borderRadius: '20px', width: '100%', maxWidth: '820px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '16px' }}>🔐 Permissions par rôle</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>
        <p style={{ margin: '0 0 18px', fontSize: '12px', color: colors.text.dim }}>
          Le Président voit et modifie tout, ce n'est pas configurable. Pour les autres rôles : « Voir » affiche l'onglet, « Modifier » autorise les actions d'écriture (ajout/suppression) dans cet onglet.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '640px' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: '11px', color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rôle</th>
                {PERMISSION_SECTIONS.map(s => (
                  <th key={s.id} style={{ textAlign: 'center', padding: '8px 10px', fontSize: '11px', color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{s.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rolesConfigurables.map(role => (
                <tr key={role.val} style={{ borderTop: '1px solid #1a1a1a' }}>
                  <td style={{ padding: '10px', fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap' }}>{role.label}</td>
                  {PERMISSION_SECTIONS.map(section => {
                    const cell = matrice[role.val][section.id]
                    return (
                      <td key={section.id} style={{ padding: '10px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button onClick={() => toggle(role.val, section.id, 'can_view')} style={cellBtn(cell.can_view, 'Voir', colors.accent.blue)}>👁 Voir</button>
                          <button onClick={() => toggle(role.val, section.id, 'can_edit')} style={cellBtn(cell.can_edit, 'Modifier', couleurPrincipale)}>✏️ Modifier</button>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ margin: '24px 0 4px', fontWeight: 800, fontSize: '14px' }}>⚽ Accès par catégorie d'équipe</p>
        <p style={{ margin: '0 0 14px', fontSize: '12px', color: colors.text.dim }}>
          Pour les rôles sans accès complet, limite les catégories d'équipes visibles (ex : U15 à U20 pour un Responsable Formation).
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {rolesCategorisables.map(role => {
            const cfg = catAccess[role.val]
            return (
              <div key={role.val} style={{ background: colors.background.raised, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700 }}>{role.label}</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: colors.text.dim, cursor: 'pointer' }}>
                    <input type="checkbox" checked={cfg.acces_complet} onChange={() => toggleAccesComplet(role.val)} />
                    Accès complet (toutes catégories)
                  </label>
                </div>
                {!cfg.acces_complet && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                    {CATEGORIES_STANDARD.map(cat => (
                      <button key={cat} onClick={() => toggleCategorie(role.val, cat)}
                        style={cellBtn(cfg.categories.includes(cat), cat, colors.accent.green)}>
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={() => onSave(matrice, catAccess)} disabled={saving}
            style={{ background: couleurPrincipale, color: colors.black, border: 'none', borderRadius: 10, padding: '10px 22px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Enregistrement...' : '✓ Enregistrer'}
          </button>
          <button onClick={onClose} style={{ background: colors.background.raised, border: '1px solid #2a2a2a', color: colors.text.muted, borderRadius: 10, padding: '10px 22px', fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

// Carte d'un membre de l'organigramme + ses subordonnés, en arbre récursif. Composant
// à part (comme StatCard/DonutChart/AccueilClub/PermissionsModal ci-dessus) plutôt que
// défini à l'intérieur de DashboardClub : une fonction composant redéfinie à chaque
// rendu du parent changerait d'identité et forcerait React à démonter/remonter tout
// le sous-arbre à chaque frappe dans la barre de recherche.
function OrgNode({ node, depth = 0, expandedNodes, onToggle, searchQuery, canEdit, onEdit, onDelete }) {
  const hasChildren = node.children && node.children.length > 0
  const nodeKey = `${node.nom} ${node.prenom}`.trim()
  const isExpanded = expandedNodes.has(nodeKey)
  const colors = getDeptColor(node.departement)

  const matchSearch = !searchQuery ||
    `${node.nom} ${node.prenom} ${node.role} ${node.departement}`.toLowerCase().includes(searchQuery.toLowerCase())

  if (!matchSearch && !hasChildren) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: hasChildren && isExpanded ? '0' : '8px' }}>
        {depth > 0 && (
          <div style={{ width: '28px', minWidth: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: '8px', paddingTop: '16px' }}>
            <div style={{ width: '1px', flex: 1, background: colors.border.default, minHeight: '16px' }} />
            <div style={{ width: '20px', height: '1px', background: colors.border.default }} />
          </div>
        )}

        <div style={{
          background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '10px',
          padding: '10px 14px', minWidth: '200px', maxWidth: '260px', position: 'relative',
          opacity: matchSearch ? 1 : 0.3, transition: 'opacity 0.2s',
        }}>
          <div style={{ position: 'absolute', top: '10px', right: '10px', width: '8px', height: '8px', borderRadius: '50%', background: colors.dot }} />

          <p style={{ margin: '0 0 2px', color: colors.text.primary, fontWeight: 700, fontSize: '14px', paddingRight: '16px' }}>{node.prenom} {node.nom}</p>
          <p style={{ margin: '0 0 4px', color: colors.text, fontSize: '12px', fontWeight: 500 }}>{node.role}</p>
          <p style={{ margin: 0, color: '#4b5563', fontSize: '11px' }}>{node.departement}</p>

          {(node.email || node.telephone) && (
            <div style={{ marginTop: '6px', borderTop: '1px solid #1a1a1a', paddingTop: '6px' }}>
              {node.email && <p style={{ margin: 0, color: '#6b7280', fontSize: '10px' }}>✉ {node.email}</p>}
              {node.telephone && <p style={{ margin: 0, color: '#6b7280', fontSize: '10px' }}>📞 {node.telephone}</p>}
            </div>
          )}

          {canEdit && (
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px', borderTop: '1px solid #1a1a1a', paddingTop: '6px' }}>
              <button onClick={() => onEdit(node)} style={{ flex: 1, padding: '4px', background: 'transparent', border: '1px solid #374151', color: '#9ca3af', borderRadius: '6px', fontSize: '10px', cursor: 'pointer' }}>✏️ Modifier</button>
              <button onClick={() => onDelete(node.id)} style={{ padding: '4px 8px', background: 'transparent', border: '1px solid #ef444440', color: colors.accent.red, borderRadius: '6px', fontSize: '10px', cursor: 'pointer' }}>🗑️</button>
            </div>
          )}

          {hasChildren && (
            <div
              onClick={() => onToggle(nodeKey)}
              style={{
                position: 'absolute', bottom: '-10px', left: '50%', transform: 'translateX(-50%)',
                background: colors.border, borderRadius: '50%', width: '20px', height: '20px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', color: colors.black, fontWeight: 700, zIndex: 1,
                boxShadow: '0 0 0 3px #0a0a0a', cursor: 'pointer',
              }}
            >
              {isExpanded ? '−' : `+${node.children.length}`}
            </div>
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div style={{ marginLeft: depth === 0 ? '0' : '36px', paddingLeft: '20px', borderLeft: '1px solid #1a1a1a', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {node.children.map((child, i) => (
            <OrgNode
              key={child.id || `${child.nom}-${child.prenom}-${i}`}
              node={child} depth={depth + 1}
              expandedNodes={expandedNodes} onToggle={onToggle} searchQuery={searchQuery}
              canEdit={canEdit} onEdit={onEdit} onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function DashboardClub() {
  const navigate = useNavigate()
  const { lang, setLang } = useLang()
  const [club, setClub] = useState(null)
  const [clubId, setClubId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [onboardingKey, setOnboardingKey] = useState(0)
  const replayOnboarding = () => setOnboardingKey(k => k + 1)
  const [activeTab, setActiveTab] = useState('accueil')
  const [activeCategorie, setActiveCategorie] = useState('accueil')
  const [monRole, setMonRole] = useState(null)
  const [autreRole, setAutreRole] = useState(null) // 'educateur' | 'joueur' | null — double accès staff + autre plan
  const [saisonActuelle] = useState(() => {
    const now = new Date()
    const y = now.getFullYear()
    return now.getMonth() >= 6 ? `${y}-${y + 1}` : `${y - 1}-${y}` // saison sportive : 1er juillet → 30 juin
  })

  // Staff du club
  const [staffMembers, setStaffMembers] = useState([])
  const [searchStaff, setSearchStaff] = useState('')
  const [resultatsStaff, setResultatsStaff] = useState([])
  const [roleAAssigner, setRoleAAssigner] = useState('directeur_sportif')
  const [addingStaffId, setAddingStaffId] = useState(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitingStaff, setInvitingStaff] = useState(false)
  const [inviteMessage, setInviteMessage] = useState(null) // { type: 'ok' | 'erreur', texte }

  // Organigramme du club (annuaire de contacts, table organigramme_club — distincte de staff_club)
  const [organigramme, setOrganigramme] = useState([])
  const [parentsClub, setParentsClub] = useState([])
  const [parentsSearchQuery, setParentsSearchQuery] = useState('')
  const [modalOrganigramme, setModalOrganigramme] = useState(false)
  const [membreOrganigrammeEdite, setMembreOrganigrammeEdite] = useState(null)
  const [formOrganigramme, setFormOrganigramme] = useState({ prenom: '', nom: '', role: '', telephone: '', email: '', ordre: 0, departement: 'Autre', superieur: '' })
  const [roleOrganigrammeLibre, setRoleOrganigrammeLibre] = useState('')
  const [savingOrganigramme, setSavingOrganigramme] = useState(false)

  // Organigramme V2 : import Excel + scan IA + arbre hiérarchique
  const [orgImportMode, setOrgImportMode] = useState(null) // null | 'excel' | 'scan'
  const [orgSearchQuery, setOrgSearchQuery] = useState('')
  const [orgExpandedNodes, setOrgExpandedNodes] = useState(new Set())
  const [orgScanFile, setOrgScanFile] = useState(null)
  const [orgScanLoading, setOrgScanLoading] = useState(false)
  const [orgScanStatus, setOrgScanStatus] = useState(null)
  const [orgImportLoading, setOrgImportLoading] = useState(false)

  // Permissions par rôle (section Staff → "Gérer les permissions")
  const [rolePermissions, setRolePermissions] = useState([]) // [{ role, section, can_view, can_edit }]
  const [roleCategoriesAccess, setRoleCategoriesAccess] = useState([]) // [{ role, categories, acces_complet }]
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [savingPermissions, setSavingPermissions] = useState(false)

  // Catégories & équipes
  const [categories, setCategories] = useState([])
  const [showAddCategorie, setShowAddCategorie] = useState(false)
  const [newCategorie, setNewCategorie] = useState({ nom: 'U13', equipe: 'A', educateur_id: '' })
  const [savingCategorie, setSavingCategorie] = useState(false)

  // Éducateurs affiliés
  const [educateursAffilies, setEducateursAffilies] = useState([])
  const [searchEducateur, setSearchEducateur] = useState('')
  const [resultatsEducateurs, setResultatsEducateurs] = useState([])
  const [invitingId, setInvitingId] = useState(null)
  const [codeClub, setCodeClub] = useState('')
  // Ajout manuel d'un éducateur sans compte existant — invitation par email
  // (cf. envoyer-invitation, role='educateur'), même mécanisme que
  // l'invitation staff mais scopé club_id/club_educateurs au lieu de staff_club.
  const [ajoutEducateurForm, setAjoutEducateurForm] = useState({ prenom: '', nom: '', email: '' })
  const [invitingEducateur, setInvitingEducateur] = useState(false)
  const [inviteEducateurMessage, setInviteEducateurMessage] = useState(null) // { type: 'ok' | 'erreur', texte }
  const [invitationsEducateurEnvoyees, setInvitationsEducateurEnvoyees] = useState([])

  // Profil club
  const [profilClubEdit, setProfilClubEdit] = useState({ club: '', region: '', ville: '', description: '', stades: [] })
  const [savingProfilClub, setSavingProfilClub] = useState(false)
  const [avatarClubUploading, setAvatarClubUploading] = useState(false)
  const [avisRecus, setAvisRecus] = useState([])

  // Thème visuel du club (couleurs, photo de fond, logo/photo hero, slogan)
  // — persisté sur profiles (pas de table clubs dans ce projet), affiché sur
  // le hero banner et repris sur la nav + les stats de l'Accueil.
  const [showThemeEditor, setShowThemeEditor] = useState(false)
  const [themeEdit, setThemeEdit] = useState({ couleur_principale: colors.accent.green, couleur_secondaire: colors.accent.cyan, slogan: '' })
  const [savingTheme, setSavingTheme] = useState(false)
  const [themeUploading, setThemeUploading] = useState(null) // 'image_fond_url' | 'image_hero_url' | null

  // Notation générale éducateur
  const [eduNoteModal, setEduNoteModal] = useState(null) // affiliation en cours de notation
  const [eduNoteCriteres, setEduNoteCriteres] = useState({})
  const [eduNoteCommentaire, setEduNoteCommentaire] = useState('')
  const [eduNoteSaison, setEduNoteSaison] = useState('2025-2026')
  const [savingEduNote, setSavingEduNote] = useState(false)

  // Séances reçues
  const [seancesRecues, setSeancesRecues] = useState([])
  const [seanceEvalModal, setSeanceEvalModal] = useState(null) // séance en cours d'évaluation
  const [saisonsOuvertes, setSaisonsOuvertes] = useState({})

  const toggleSaison = (saison) => {
    setSaisonsOuvertes(prev => ({ ...prev, [saison]: prev[saison] === false ? true : false }))
  }

  // Classements
  const [statsParCategorie, setStatsParCategorie] = useState({})
  const [loadingClassements, setLoadingClassements] = useState(false)
  const [categorieActive, setCategorieActive] = useState(null)
  const [triClassement, setTriClassement] = useState('buts')
  const [effectifModal, setEffectifModal] = useState(null) // categorieId en cours d'affichage
  const [effectifVue, setEffectifVue] = useState('poste') // 'poste' | 'liste'
  const [joueurDetail, setJoueurDetail] = useState(null) // id du joueur affiché en fiche individuelle
  const [clubMatchs, setClubMatchs] = useState({}) // { categorieId: [matchs] }
  const [loadingMatchs, setLoadingMatchs] = useState(false)
  const [ligueUrls, setLigueUrls] = useState({}) // { categorieId: url }

  // Accueil (club-wide, tous éducateurs affiliés confondus)
  const [matchsClub, setMatchsClub] = useState([])
  const [joueursClub, setJoueursClub] = useState([])

  // Inventaire (onglet Administratif) — Équipement (tailles par personne) + Matériel (stock/distribution)
  const [inventaireVue, setInventaireVue] = useState('equipement')
  const [joueursInventaire, setJoueursInventaire] = useState([]) // colonnes complètes (categorie, numero_maillot) — joueursClub n'a pas assez de colonnes pour ça
  const [equipementChamps, setEquipementChamps] = useState([])
  const [equipementTailles, setEquipementTailles] = useState([])
  const [equipementCommandes, setEquipementCommandes] = useState([])
  const [modaleChampOuverte, setModaleChampOuverte] = useState(false)
  const [nouveauChamp, setNouveauChamp] = useState({ nom: '', options: '', cible: 'les deux' })
  const [modalePreparation, setModalePreparation] = useState(null) // { userId, nom, items: [{champ_id, champ_nom, valeur}], jours, heure_debut, heure_fin }
  const [materielCatalogue, setMaterielCatalogue] = useState([])
  const [materielStock, setMaterielStock] = useState([])
  const [materielDistribution, setMaterielDistribution] = useState([])
  const [distributionForm, setDistributionForm] = useState({ educateur_id: '', equipe_nom: '', saison: '' })
  const [panierMateriel, setPanierMateriel] = useState([]) // [{ catalogue_id, nom, categorie, unite, quantite }]
  const [articleAjoutForm, setArticleAjoutForm] = useState({ catalogue_id: '', quantite: 1 })
  const [modalCatalogue, setModalCatalogue] = useState(false)
  const [nouvelArticleCatalogue, setNouvelArticleCatalogue] = useState({ categorie: '', nom: '', unite: 'unité' })
  const [categorieEstNouvelle, setCategorieEstNouvelle] = useState(false)
  const [rechercheArticle, setRechercheArticle] = useState('')
  const [showSuggestionsArticle, setShowSuggestionsArticle] = useState(false)
  // Packs équipement configurables — regroupements nommés de champs déjà créés
  // (distinct des boutons "Pack Joueur/Éducateur" qui, eux, créent les champs).
  const [equipementPacks, setEquipementPacks] = useState([])
  const [equipementAttributions, setEquipementAttributions] = useState([]) // [{ id, user_id, pack_id }]
  const [modalPack, setModalPack] = useState(false)
  const [packEnEdition, setPackEnEdition] = useState(null) // null → nouveau pack, sinon pack existant
  const [packForm, setPackForm] = useState({ nom: '', cible: 'joueur', champs_ids: [], couleur: '#4ade80', icone: '👕' })
  const [packMenuOuvert, setPackMenuOuvert] = useState(null) // id du pack dont le menu ⋮ est ouvert
  const [nouveauChampNom, setNouveauChampNom] = useState('')
  const [nouveauChampOptions, setNouveauChampOptions] = useState('')
  const [creationChampLoading, setCreationChampLoading] = useState(false)
  const [filtreCategorieEquipement, setFiltreCategorieEquipement] = useState('tous')

  // Événements & Projets (onglet Administratif)
  const [evenementsClub, setEvenementsClub] = useState([])
  const [showEvenementForm, setShowEvenementForm] = useState(false)
  const [editingEvenementId, setEditingEvenementId] = useState(null)
  const [evenementForm, setEvenementForm] = useState({ titre: '', date: '', heure: '', lieu: '', type: 'autre', description: '', participants: [], ressources_materielles: [], missions: [], referents: [] })
  // Saisie libre prénom/nom du responsable/participant en cours, par mission —
  // { [missionId]: { prenom, nom } } — remplace la liste de badges
  // tousParticipants (50+ personnes) pour le responsable et les participants
  // d'une mission, trop lourde pour ce cas (cf. groupesParticipants/
  // tousParticipants, toujours utilisés par le sélecteur de participants au
  // niveau de l'événement, différent, pas concerné par ce changement).
  const [saisieResponsableMission, setSaisieResponsableMission] = useState({})
  const [saisieParticipantMission, setSaisieParticipantMission] = useState({})
  // Saisie libre prénom/nom des participants invités à l'événement — même
  // raison que pour les missions (cf. note plus haut) : la liste de badges
  // (éducateurs/staff/joueurs, 50+ personnes) était trop lourde pour ce cas.
  const [saisieParticipant, setSaisieParticipant] = useState({ prenom: '', nom: '' })
  const [saisieReferent, setSaisieReferent] = useState({ prenom: '', nom: '' })
  const [savingEvenement, setSavingEvenement] = useState(false)
  const [exportingPdfId, setExportingPdfId] = useState(null)

  const [projetsClub, setProjetsClub] = useState([])
  const [showProjetForm, setShowProjetForm] = useState(false)
  const [editingProjetId, setEditingProjetId] = useState(null)
  const [projetForm, setProjetForm] = useState({ nom: '', description: '', objectif: '', date_debut: '', date_fin: '', responsable_id: '', responsable_nom: '', statut: 'en_attente', referents: [], missions: [] })
  // Saisie libre du responsable/participant en cours, par mission de projet —
  // même principe que saisieResponsableMission/saisieParticipantMission pour
  // les événements (cf. note plus haut), dupliqué plutôt que généralisé : ces
  // deux formulaires (événement/projet) évoluent indépendamment dans ce fichier.
  const [saisieResponsableMissionProjet, setSaisieResponsableMissionProjet] = useState({})
  const [saisieParticipantMissionProjet, setSaisieParticipantMissionProjet] = useState({})
  const [savingProjet, setSavingProjet] = useState(false)
  const [nouvelleTache, setNouvelleTache] = useState({}) // { [projetId]: titre en cours de saisie }
  // Référents du projet — même saisie libre nom/prénom que pour les
  // événements (cf. ajouterReferent), en plus du responsable existant
  // (sélectionné parmi le staff, inchangé).
  const [saisieReferentProjet, setSaisieReferentProjet] = useState({ prenom: '', nom: '' })
  const [sousVueEvenements, setSousVueEvenements] = useState('evenements') // 'evenements' | 'projets'

  // Budget
  const [budgetEntries, setBudgetEntries] = useState([])
  const [budgetPeriode, setBudgetPeriode] = useState('mois') // 'mois' | 'saison' | 'tout'
  const [budgetForm, setBudgetForm] = useState({
    type: 'depense', categorie: '', libelle: '', montant: '', date: new Date().toISOString().split('T')[0], note: '',
  })
  const [budgetFormOuvert, setBudgetFormOuvert] = useState(false)
  const [budgetSaving, setBudgetSaving] = useState(false)

  const chargerLigueUrl = async (categorieId) => {
    const cat = categories.find(c => c.id === categorieId)
    if (!cat || !cat.educateur_id || ligueUrls[categorieId] !== undefined) return
    const { data } = await supabase.from('profil_educateur').select('ligue_url').eq('user_id', cat.educateur_id).maybeSingle()
    setLigueUrls(prev => ({ ...prev, [categorieId]: data?.ligue_url || null }))
  }

  // Le président a toujours tout, et ne peut pas être restreint (cf. sauvegarderPermissions
  // qui n'écrit jamais de ligne pour 'president'). Pour les autres rôles : la ligne explicite
  // configurée par le président fait foi ; à défaut, on retombe sur PERMISSION_DEFAULTS pour
  // ne rien changer au comportement des clubs qui n'ont pas encore ouvert la matrice.
  const permissionRow = (section) => rolePermissions.find(p => p.role === monRole && p.section === section)
  const canViewSection = (section) => {
    if (monRole === 'president') return true
    const row = permissionRow(section)
    if (row) return row.can_view
    return (PERMISSION_DEFAULTS[section] || []).includes(monRole)
  }
  const canEditSection = (section) => {
    if (monRole === 'president') return true
    const row = permissionRow(section)
    if (row) return row.can_view && row.can_edit
    return (PERMISSION_DEFAULTS[section] || []).includes(monRole)
  }

  const couleurPrincipale = club?.couleur_principale || colors.accent.green
  const couleurSecondaire = club?.couleur_secondaire || colors.accent.cyan

  const st = {
    page: { background: colors.background.base, minHeight: '100vh', color: colors.text.primary, fontFamily: 'Inter, sans-serif' },
    navbar: { background: colors.background.surface, borderBottom: '1px solid #222', padding: isMobile ? 'calc(8px + env(safe-area-inset-top, 0px)) 1rem 8px' : '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: isMobile ? 'auto' : '56px', minHeight: '56px', gap: '8px' },
    logo: { color: colors.accent.green, fontWeight: 700, fontSize: isMobile ? '0.85rem' : '1.1rem', letterSpacing: '1px', flexShrink: 0 },
    content: { padding: isMobile ? '1rem' : '1.5rem 2rem', maxWidth: '1600px', margin: '0 auto' },
    tabs: { display: 'flex', gap: '8px', marginBottom: '1.5rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', paddingBottom: '2px' },
    tab: (active) => ({ padding: isMobile ? '8px 14px' : '10px 20px', borderRadius: '8px', border: active ? 'none' : '1px solid #333', background: active ? couleurPrincipale : 'transparent', color: active ? colors.black : colors.text.secondary, fontWeight: active ? 700 : 400, cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap', flexShrink: 0 }),
    card: { background: colors.background.surface, border: '1px solid #222', borderRadius: '12px', padding: isMobile ? '1rem' : '1.25rem' },
    btnSolid: { background: couleurPrincipale, color: colors.black, border: 'none', padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' },
    btnSecondary: { background: 'transparent', border: '1px solid #333', color: colors.text.secondary, borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px' },
    input: { background: colors.background.raised, border: '1px solid #333', borderRadius: '8px', color: colors.text.primary, padding: '9px 12px', fontSize: '13px', boxSizing: 'border-box', width: '100%' },
    label: { fontSize: '11px', color: colors.text.dim, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' },
  }

  useEffect(() => { init() }, [])
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Corrige la catégorie/onglet actifs si le rôle (ou les permissions configurées par
  // le président) ne permet(tent) plus de voir la sélection courante — au chargement
  // initial, mais aussi si le président modifie la matrice pendant que ce membre est
  // connecté (rolePermissions en dépendance).
  useEffect(() => {
    if (!monRole) return
    const sportifVisible = canViewSection('sportif') || canViewSection('terrains')
    const administratifSections = ['sponsors', 'deplacements', 'profil', 'budget', 'evenements', 'organigramme', 'inventaire']
    const administratifVisible = monRole === 'president' || administratifSections.some(canViewSection) || canViewSection('staff')
    if (activeCategorie === 'sportif' && !sportifVisible && administratifVisible) {
      setActiveCategorie('administratif')
      setActiveTab(administratifSections.find(canViewSection) || 'sponsors')
    } else if (activeCategorie === 'administratif' && !administratifVisible && sportifVisible) {
      setActiveCategorie('sportif')
      setActiveTab(canViewSection('sportif') ? 'categories' : 'terrains')
    } else if (activeCategorie === 'sportif' && sportifVisible) {
      const sportifOnglets = ['categories', 'classements', 'recrutement', 'educateurs'].filter(() => canViewSection('sportif')).concat(canViewSection('terrains') ? ['terrains'] : [])
      if (!sportifOnglets.includes(activeTab)) setActiveTab(sportifOnglets[0])
    } else if (activeCategorie === 'administratif' && administratifVisible) {
      const adminOnglets = administratifSections.filter(canViewSection).concat(canViewSection('staff') ? ['staff'] : [])
      if (!adminOnglets.includes(activeTab)) setActiveTab(adminOnglets[0])
    }
  }, [monRole, rolePermissions])

  useEffect(() => {
    if (activeTab === 'classements' && Object.keys(statsParCategorie).length === 0) {
      chargerClassements()
    }
  }, [activeTab, categories])

  useEffect(() => {
    if (activeTab === 'classements' && categorieActive) {
      chargerMatchsCategorie(categorieActive)
      chargerLigueUrl(categorieActive)
    }
  }, [activeTab, categorieActive])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/login'); return }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    if (!profile) { navigate('/'); return }

    let resolvedClubId, clubProfile, role

    if (profile.plan === 'club') {
      // Le compte connecté est le club lui-même
      resolvedClubId = user.id
      clubProfile = profile
      role = 'president'
    } else {
      // Sinon, cherche un rattachement staff vers un club
      const { data: staffRow } = await supabase.from('staff_club').select('role, club_id').eq('user_id', user.id).maybeSingle()
      if (!staffRow) { navigate('/'); return }
      const { data: cp } = await supabase.from('profiles').select('*').eq('id', staffRow.club_id).maybeSingle()
      if (!cp) { navigate('/'); return }
      resolvedClubId = staffRow.club_id
      clubProfile = cp
      role = staffRow.role || 'president'
    }

    setClubId(resolvedClubId)
    setClub(clubProfile)
    setMonRole(role)
    setAutreRole(profile.plan === 'educateur' ? 'educateur' : ['pro', 'fan'].includes(profile.plan) ? 'joueur' : null)
    setProfilClubEdit({ club: clubProfile.club || '', region: clubProfile.region || '', ville: clubProfile.ville || '', description: clubProfile.description || '', stades: clubProfile.stades || [] })
    setThemeEdit({
      couleur_principale: clubProfile.couleur_principale || colors.accent.green,
      couleur_secondaire: clubProfile.couleur_secondaire || colors.accent.cyan,
      slogan: clubProfile.slogan || '',
    })

    // Génère un code club s'il n'existe pas encore (seulement le club lui-même, pas le staff)
    if (profile.plan === 'club') {
      if (!clubProfile.code_club) {
        const code = generateCode()
        await supabase.from('profiles').update({ code_club: code }).eq('id', resolvedClubId)
        setCodeClub(code)
      } else {
        setCodeClub(clubProfile.code_club)
      }
    } else {
      setCodeClub(clubProfile.code_club || '')
    }

    await Promise.all([chargerCategories(resolvedClubId), chargerEducateurs(resolvedClubId), chargerAvisClub(resolvedClubId), chargerSeancesRecues(resolvedClubId), chargerStaff(resolvedClubId), chargerBudget(resolvedClubId), chargerAccueilData(resolvedClubId), chargerRolePermissions(resolvedClubId), chargerRoleCategoriesAccess(resolvedClubId), chargerEvenements(resolvedClubId), chargerProjets(resolvedClubId), chargerOrganigramme(resolvedClubId), chargerParentsClub(), chargerInventaire(resolvedClubId), chargerInvitationsEducateurEnvoyees(resolvedClubId)])
    setLoading(false)
  }

  // Auto-suffisante (ne dépend pas de l'état categories/educateursAffilies, potentiellement
  // pas encore résolu vu qu'elle tourne en parallèle des autres chargements dans init()).
  const chargerAccueilData = async (uid) => {
    const { data: educs } = await supabase.from('club_educateurs').select('educateur_id').eq('club_id', uid).eq('statut', 'accepte')
    const educateurIds = [...new Set((educs || []).map(e => e.educateur_id).filter(Boolean))]
    if (educateurIds.length === 0) { setMatchsClub([]); setJoueursClub([]); return }

    const [{ data: matchs }, { data: joueurs }] = await Promise.all([
      supabase.from('matchs_equipe').select('*').in('educateur_id', educateurIds).order('date', { ascending: false }),
      supabase.from('equipe_joueurs').select('id, prenom, nom, poste, educateur_id, created_at').in('educateur_id', educateurIds).order('created_at', { ascending: false }),
    ])
    setMatchsClub(matchs || [])
    setJoueursClub(joueurs || [])
  }

  // Inventaire (Équipement + Matériel) — joueursClub n'a pas categorie/numero_maillot
  // (colonnes non chargées par chargerAccueilData), d'où une requête équipe_joueurs
  // dédiée ici avec toutes les colonnes utiles à l'affichage des tailles.
  const chargerInventaire = async (uid) => {
    const { data: educs } = await supabase.from('club_educateurs').select('educateur_id').eq('club_id', uid).eq('statut', 'accepte')
    const educateurIds = [...new Set((educs || []).map(e => e.educateur_id).filter(Boolean))]
    const [{ data: joueurs }, { data: champs }, { data: tailles }, { data: commandes }, { data: catalogue }, { data: masque }, { data: stock }, { data: distribution }, { data: packs }, { data: attributions }] = await Promise.all([
      educateurIds.length ? supabase.from('equipe_joueurs').select('id, joueur_id, prenom, nom, poste, categorie, numero_maillot, educateur_id, club_categorie_id').in('educateur_id', educateurIds).order('nom') : Promise.resolve({ data: [] }),
      supabase.from('equipement_champs').select('*').eq('club_id', uid).eq('actif', true).order('ordre'),
      supabase.from('equipement_tailles').select('*').eq('club_id', uid),
      supabase.from('equipement_commandes').select('*').eq('club_id', uid),
      supabase.from('materiel_catalogue').select('*').eq('actif', true).or(`club_id.is.null,club_id.eq.${uid}`).order('categorie').order('nom'),
      supabase.from('materiel_catalogue_masque').select('catalogue_id').eq('club_id', uid),
      supabase.from('materiel_stock').select('*').eq('club_id', uid),
      supabase.from('materiel_distribution').select('*').eq('club_id', uid).order('date_distribution', { ascending: false }),
      supabase.from('equipement_packs').select('*').eq('club_id', uid).eq('actif', true).order('created_at'),
      supabase.from('equipement_attributions').select('*').eq('club_id', uid),
    ])
    setJoueursInventaire(joueurs || [])
    setEquipementChamps(champs || [])
    setEquipementTailles(tailles || [])
    setEquipementCommandes(commandes || [])
    setEquipementAttributions(attributions || [])
    // Articles globaux masqués par ce club (materiel_catalogue_masque) — retirés
    // ici une bonne fois pour toutes plutôt que filtrés à chaque endroit qui lit
    // materielCatalogue (stock, recherche de distribution, modale catalogue...).
    const idsMasques = new Set((masque || []).map(m => m.catalogue_id))
    setMaterielCatalogue((catalogue || []).filter(c => !idsMasques.has(c.id)))
    setMaterielStock(stock || [])
    setMaterielDistribution(distribution || [])
    setEquipementPacks(packs || [])
  }

  const ajouterChampEquipement = async () => {
    const nom = nouveauChamp.nom.trim()
    if (!nom) return
    const options = nouveauChamp.options.split(',').map(o => o.trim()).filter(Boolean)
    if (options.length === 0) return
    await supabase.from('equipement_champs').insert({ club_id: clubId, nom, options, cible: nouveauChamp.cible, ordre: equipementChamps.length })
    setNouveauChamp({ nom: '', options: '', cible: 'les deux' })
    setModaleChampOuverte(false)
    chargerInventaire(clubId)
  }

  // Packs configurables (equipement_packs) — regroupement nommé de champs déjà
  // créés, distinct des boutons ci-dessus qui créent les champs eux-mêmes.
  const ouvrirNouveauPack = () => {
    setPackEnEdition(null)
    setPackForm({ nom: '', cible: 'joueur', champs_ids: [], couleur: '#4ade80', icone: '👕' })
    setNouveauChampNom('')
    setNouveauChampOptions('')
    setModalPack(true)
  }
  const ouvrirEditionPack = (pack) => {
    setPackEnEdition(pack)
    setPackForm({ nom: pack.nom, cible: pack.cible, champs_ids: pack.champs_ids || [], couleur: pack.couleur, icone: pack.icone })
    setNouveauChampNom('')
    setNouveauChampOptions('')
    setModalPack(true)
  }
  // Créer un champ à la volée depuis la modale pack, et l'ajouter directement
  // à la sélection en cours — évite l'aller-retour "fermer la modale pack →
  // créer le champ ailleurs → rouvrir la modale pack pour le cocher". Pas de
  // tailles par défaut imposées : chaque club définit ses propres champs et
  // ses propres options, rien de préréglé côté plateforme.
  const ajouterNouveauChamp = async () => {
    const options = nouveauChampOptions.split(',').map(o => o.trim()).filter(Boolean)
    if (!nouveauChampNom.trim() || options.length === 0) return
    setCreationChampLoading(true)
    // equipement_champs.cible n'accepte que joueur/educateur/les deux — la
    // cible d'un pack peut être plus large (ex: 'dirigeant', une simple
    // étiquette), donc on retombe sur 'educateur' pour le champ créé dans ce cas.
    const cibleChamp = ['joueur', 'educateur', 'les deux'].includes(packForm.cible) ? packForm.cible : 'educateur'
    const { data: newChamp, error } = await supabase.from('equipement_champs').insert({
      club_id: clubId,
      nom: nouveauChampNom.trim(),
      cible: cibleChamp,
      options,
      ordre: equipementChamps.length,
      actif: true,
    }).select().single()
    if (!error && newChamp) {
      setPackForm(p => ({ ...p, champs_ids: [...p.champs_ids, newChamp.id] }))
      setEquipementChamps(prev => [...prev, newChamp])
      setNouveauChampNom('')
      setNouveauChampOptions('')
    }
    setCreationChampLoading(false)
  }
  const sauvegarderPack = async () => {
    if (!packForm.nom.trim() || packForm.champs_ids.length === 0) return
    if (packEnEdition) {
      await supabase.from('equipement_packs').update({ nom: packForm.nom.trim(), cible: packForm.cible, champs_ids: packForm.champs_ids, couleur: packForm.couleur, icone: packForm.icone }).eq('id', packEnEdition.id)
    } else {
      await supabase.from('equipement_packs').insert({ club_id: clubId, nom: packForm.nom.trim(), cible: packForm.cible, champs_ids: packForm.champs_ids, couleur: packForm.couleur, icone: packForm.icone })
    }
    setModalPack(false)
    chargerInventaire(clubId)
  }
  const supprimerPack = async (packId) => {
    await supabase.from('equipement_packs').delete().eq('id', packId)
    setModalPack(false)
    setPackMenuOuvert(null)
    chargerInventaire(clubId)
  }
  const supprimerPackDepuisMenu = (pack) => {
    setPackMenuOuvert(null)
    if (!confirm(`Supprimer le pack "${pack.nom}" ? Les champs qu'il contient ne seront pas supprimés.`)) return
    supprimerPack(pack.id)
  }

  const supprimerChampEquipement = async (champId) => {
    if (!confirm('Supprimer ce champ de taille ? Les tailles déjà renseignées pour ce champ seront perdues.')) return
    await supabase.from('equipement_champs').delete().eq('id', champId)
    chargerInventaire(clubId)
  }

  // Attribution d'un pack à une personne (joueur ou staff) — vue rapide côté
  // club, distincte des tailles précises que chacun déclare pour lui-même
  // depuis son propre dashboard (equipement_tailles, inchangée).
  const attribuerPack = async (userId, packId) => {
    if (!packId) {
      await supabase.from('equipement_attributions').delete().eq('club_id', clubId).eq('user_id', userId)
      setEquipementAttributions(prev => prev.filter(a => a.user_id !== userId))
      return
    }
    const { data } = await supabase.from('equipement_attributions').upsert(
      { club_id: clubId, user_id: userId, pack_id: packId },
      { onConflict: 'club_id, user_id' }
    ).select().single()
    setEquipementAttributions(prev => {
      const idx = prev.findIndex(a => a.user_id === userId)
      if (idx === -1) return [...prev, data || { club_id: clubId, user_id: userId, pack_id: packId }]
      const next = [...prev]
      next[idx] = data || { ...next[idx], pack_id: packId }
      return next
    })
  }

  const ouvrirPreparation = (personne) => {
    const items = equipementChamps.map(c => ({
      champ_id: c.id,
      champ_nom: c.nom,
      valeur: equipementTailles.find(t => t.user_id === personne.id && t.champ_id === c.id)?.valeur || '',
    }))
    const existante = equipementCommandes.find(c => c.destinataire_id === personne.id)
    setModalePreparation({
      userId: personne.id,
      nom: personne.nom,
      items,
      jours: existante?.jours || '',
      heure_debut: existante?.heure_debut || '',
      heure_fin: existante?.heure_fin || '',
    })
  }

  const marquerEquipementPret = async () => {
    if (!modalePreparation) return
    const { userId, nom, items, jours, heure_debut, heure_fin } = modalePreparation
    await supabase.from('equipement_commandes').upsert({
      club_id: clubId,
      responsable_id: clubId,
      destinataire_id: userId,
      destinataire_nom: nom,
      items,
      statut: 'pret',
      jours, heure_debut, heure_fin,
    }, { onConflict: 'club_id, destinataire_id' })
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'equipement_pret',
      titre: '👕 Ton équipement est prêt !',
      contenu: [jours, heure_debut && heure_fin ? `entre ${heure_debut} et ${heure_fin}` : null].filter(Boolean).join(' — ') || 'Passe le récupérer auprès du club.',
      lien: '/dashboard-joueur',
      lu: false,
    })
    setModalePreparation(null)
    chargerInventaire(clubId)
  }

  const mettreAJourStockMateriel = async (catalogueId, quantite) => {
    await supabase.from('materiel_stock').upsert(
      { club_id: clubId, catalogue_id: catalogueId, quantite_totale: quantite, updated_at: new Date().toISOString() },
      { onConflict: 'club_id, catalogue_id' }
    )
    setMaterielStock(prev => {
      const idx = prev.findIndex(s => s.catalogue_id === catalogueId)
      if (idx === -1) return [...prev, { club_id: clubId, catalogue_id: catalogueId, quantite_totale: quantite }]
      const next = [...prev]
      next[idx] = { ...next[idx], quantite_totale: quantite }
      return next
    })
  }

  // Panier — plusieurs articles ajoutés avant une distribution unique, plutôt
  // qu'un aller-retour au formulaire par article. Toutes les lignes créées
  // partagent un lot_id commun pour pouvoir être affichées/validées/refusées
  // ensemble côté club et côté éducateur.
  const ajouterAuPanierMateriel = () => {
    const item = materielCatalogue.find(c => c.id === articleAjoutForm.catalogue_id)
    const quantite = Number(articleAjoutForm.quantite) || 1
    if (!item || quantite < 1) return
    setPanierMateriel(prev => {
      const existant = prev.find(p => p.catalogue_id === item.id)
      if (existant) return prev.map(p => p.catalogue_id === item.id ? { ...p, quantite: p.quantite + quantite } : p)
      return [...prev, { catalogue_id: item.id, nom: item.nom, categorie: item.categorie, unite: item.unite, quantite }]
    })
    setArticleAjoutForm({ catalogue_id: '', quantite: 1 })
    setRechercheArticle('')
  }

  const retirerDuPanierMateriel = (catalogueId) => {
    setPanierMateriel(prev => prev.filter(p => p.catalogue_id !== catalogueId))
  }

  const distribuerMateriel = async () => {
    const { educateur_id, equipe_nom, saison } = distributionForm
    if (!educateur_id || !saison.trim() || panierMateriel.length === 0) return
    const educ = educateursAffilies.find(e => e.educateur_id === educateur_id)
    const educateur_nom = `${educ?.educateur?.prenom || ''} ${educ?.educateur?.nom || ''}`.trim()
    const lot_id = crypto.randomUUID()
    const rows = panierMateriel.map(item => ({
      club_id: clubId,
      educateur_id,
      educateur_nom,
      equipe_nom: equipe_nom.trim() || null,
      catalogue_id: item.catalogue_id,
      nom_materiel: item.nom,
      categorie: item.categorie,
      quantite: item.quantite,
      saison: saison.trim(),
      statut: 'distribue',
      lot_id,
    }))
    await supabase.from('materiel_distribution').insert(rows)
    setPanierMateriel([])
    setDistributionForm({ educateur_id: '', equipe_nom: '', saison: '' })
    chargerInventaire(clubId)
  }

  // dist représente une ligne du groupe (lot_id) — la mise à jour porte sur
  // tout le lot s'il y en a un, sinon sur cette seule ligne (anciennes
  // distributions créées avant l'ajout du panier, sans lot_id).
  const validerRemiseMateriel = async (dist) => {
    const query = supabase.from('materiel_distribution').update({ statut: 'remis', date_remise: new Date().toISOString() })
    await (dist.lot_id ? query.eq('lot_id', dist.lot_id) : query.eq('id', dist.id))
    chargerInventaire(clubId)
  }

  const refuserRemiseMateriel = async (dist) => {
    const query = supabase.from('materiel_distribution').update({ statut: 'distribue' })
    await (dist.lot_id ? query.eq('lot_id', dist.lot_id) : query.eq('id', dist.id))
    chargerInventaire(clubId)
  }

  // Catalogue matériel — articles globaux (club_id NULL, en lecture seule)
  // et articles personnalisés par club (club_id = ce club, éditables).
  const ajouterArticleCatalogue = async () => {
    if (!nouvelArticleCatalogue.nom.trim() || !nouvelArticleCatalogue.categorie.trim()) return
    await supabase.from('materiel_catalogue').insert({
      categorie: nouvelArticleCatalogue.categorie.trim(),
      nom: nouvelArticleCatalogue.nom.trim(),
      unite: nouvelArticleCatalogue.unite.trim() || 'unité',
      club_id: clubId,
      actif: true,
    })
    setNouvelArticleCatalogue({ categorie: '', nom: '', unite: 'unité' })
    setCategorieEstNouvelle(false)
    chargerInventaire(clubId)
  }

  // Retirer un article : "actif: false" pour un article personnalisé de ce
  // club (sa propre ligne, sans impact ailleurs), ou une ligne de masquage
  // pour un article global (club_id NULL, partagé par tous les clubs — le
  // désactiver directement le masquerait pour tout le monde, pas seulement
  // ce club). Dans les deux cas la donnée reste intacte pour l'historique
  // des distributions déjà enregistrées.
  const retirerArticleCatalogue = async (item) => {
    if (item.club_id) {
      await supabase.from('materiel_catalogue').update({ actif: false }).eq('id', item.id).eq('club_id', clubId)
    } else {
      await supabase.from('materiel_catalogue_masque').insert({ club_id: clubId, catalogue_id: item.id })
    }
    chargerInventaire(clubId)
  }

  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase()

  const chargerCategories = async (uid) => {
    const { data } = await supabase
      .from('club_categories')
      .select('*, educateur:educateur_id(prenom, nom)')
      .eq('club_id', uid)
      .order('nom')
    setCategories(data || [])
  }

  const chargerAvisClub = async (uid) => {
    const { data } = await supabase
      .from('avis')
      .select('*, auteur:auteur_id(prenom, nom, plan)')
      .eq('cible_id', uid)
      .order('created_at', { ascending: false })
    setAvisRecus(data || [])
  }

  const chargerEducateurs = async (uid) => {
    const { data } = await supabase
      .from('club_educateurs')
      .select('*, educateur:educateur_id(prenom, nom, email, avatar_url)')
      .eq('club_id', uid)
      .order('created_at', { ascending: false })
    setEducateursAffilies(data || [])
  }

  // ── Budget ──
  const chargerBudget = async (uid) => {
    const { data } = await supabase
      .from('budget_club')
      .select('*')
      .eq('club_id', uid)
      .order('date', { ascending: false })
    setBudgetEntries(data || [])
  }

  const ajouterEntreeBudget = async () => {
    if (!budgetForm.libelle.trim() || !budgetForm.montant || !budgetForm.categorie) return
    setBudgetSaving(true)
    const { error } = await supabase.from('budget_club').insert({
      club_id: clubId,
      type: budgetForm.type,
      categorie: budgetForm.categorie,
      libelle: budgetForm.libelle.trim(),
      montant: parseFloat(budgetForm.montant),
      date: budgetForm.date,
      note: budgetForm.note.trim() || null,
    })
    if (!error) {
      await chargerBudget(clubId)
      setBudgetForm({ type: 'depense', categorie: '', libelle: '', montant: '', date: new Date().toISOString().split('T')[0], note: '' })
      setBudgetFormOuvert(false)
    }
    setBudgetSaving(false)
  }

  const supprimerEntreeBudget = async (id) => {
    if (!confirm('Supprimer cette entrée ?')) return
    await supabase.from('budget_club').delete().eq('id', id)
    await chargerBudget(clubId)
  }

  // ── Événements club ──────────────────────────────────────────────────────────
  const chargerEvenements = async (uid) => {
    const { data } = await supabase.from('evenements_club').select('*').eq('club_id', uid).order('date')
    setEvenementsClub(data || [])
  }

  const ouvrirNouvelEvenement = () => {
    setEditingEvenementId(null)
    setEvenementForm({ titre: '', date: '', heure: '', lieu: '', type: 'autre', description: '', participants: [], ressources_materielles: [], missions: [], referents: [] })
    setShowEvenementForm(true)
  }

  const ouvrirEditionEvenement = (ev) => {
    setEditingEvenementId(ev.id)
    setEvenementForm({ titre: ev.titre || '', date: ev.date || '', heure: ev.heure || '', lieu: ev.lieu || '', type: ev.type || 'autre', description: ev.description || '', participants: ev.participants || [], ressources_materielles: ev.ressources_materielles || [], missions: ev.missions || [], referents: ev.referents || [] })
    setShowEvenementForm(true)
  }

  const ajouterParticipant = () => {
    const nom = `${saisieParticipant.prenom} ${saisieParticipant.nom}`.trim()
    if (!nom) return
    setEvenementForm(f => {
      if (f.participants.some(p => p.nom.toLowerCase() === nom.toLowerCase())) return f
      return { ...f, participants: [...f.participants, { id: crypto.randomUUID(), nom }] }
    })
    setSaisieParticipant({ prenom: '', nom: '' })
  }
  const retirerParticipant = (id) => {
    setEvenementForm(f => ({ ...f, participants: f.participants.filter(p => p.id !== id) }))
  }

  const ajouterReferent = () => {
    const nom = `${saisieReferent.prenom} ${saisieReferent.nom}`.trim()
    if (!nom) return
    setEvenementForm(f => {
      if (f.referents.some(r => r.nom.toLowerCase() === nom.toLowerCase())) return f
      return { ...f, referents: [...f.referents, { id: crypto.randomUUID(), nom }] }
    })
    setSaisieReferent({ prenom: '', nom: '' })
  }
  const retirerReferent = (id) => {
    setEvenementForm(f => ({ ...f, referents: f.referents.filter(r => r.id !== id) }))
  }

  // ── Ressources matérielles d'un événement ──
  const ajouterRessource = () => {
    setEvenementForm(f => ({ ...f, ressources_materielles: [...f.ressources_materielles, { item: '', quantite: 1 }] }))
  }
  const modifierRessource = (index, champ, valeur) => {
    setEvenementForm(f => ({ ...f, ressources_materielles: f.ressources_materielles.map((r, i) => i === index ? { ...r, [champ]: valeur } : r) }))
  }
  const supprimerRessource = (index) => {
    setEvenementForm(f => ({ ...f, ressources_materielles: f.ressources_materielles.filter((_, i) => i !== index) }))
  }

  // ── Missions d'un événement — responsable_id/responsable_nom, même
  // convention que projetForm (responsable de projet), pas "référent". ──
  const ajouterMission = () => {
    setEvenementForm(f => ({ ...f, missions: [...f.missions, { id: crypto.randomUUID(), titre: '', responsable_id: '', responsable_nom: '', participants: [], objectif: '', comment: '' }] }))
  }
  const modifierMission = (id, champ, valeur) => {
    setEvenementForm(f => ({ ...f, missions: f.missions.map(m => m.id === id ? { ...m, [champ]: valeur } : m) }))
  }
  const supprimerMission = (id) => {
    setEvenementForm(f => ({ ...f, missions: f.missions.filter(m => m.id !== id) }))
  }
  // Saisie libre (plus de sélection dans tousParticipants, cf. note plus haut) :
  // responsable_id n'a plus de sens (aucun profil réel n'est lié), seul
  // responsable_nom est renseigné.
  const validerResponsableMission = (missionId) => {
    const s = saisieResponsableMission[missionId] || {}
    const nom = `${s.prenom || ''} ${s.nom || ''}`.trim()
    if (!nom) return
    setEvenementForm(f => ({ ...f, missions: f.missions.map(m => m.id === missionId ? { ...m, responsable_id: null, responsable_nom: nom } : m) }))
    setSaisieResponsableMission(prev => ({ ...prev, [missionId]: { prenom: '', nom: '' } }))
  }
  const effacerResponsableMission = (missionId) => {
    setEvenementForm(f => ({ ...f, missions: f.missions.map(m => m.id === missionId ? { ...m, responsable_id: null, responsable_nom: '' } : m) }))
  }
  const ajouterParticipantMission = (missionId) => {
    const s = saisieParticipantMission[missionId] || {}
    const nom = `${s.prenom || ''} ${s.nom || ''}`.trim()
    if (!nom) return
    setEvenementForm(f => ({
      ...f,
      missions: f.missions.map(m => {
        if (m.id !== missionId) return m
        if (m.participants.some(p => p.nom.toLowerCase() === nom.toLowerCase())) return m
        return { ...m, participants: [...m.participants, { id: crypto.randomUUID(), nom }] }
      }),
    }))
    setSaisieParticipantMission(prev => ({ ...prev, [missionId]: { prenom: '', nom: '' } }))
  }
  const retirerParticipantMission = (missionId, participantId) => {
    setEvenementForm(f => ({ ...f, missions: f.missions.map(m => m.id === missionId ? { ...m, participants: m.participants.filter(p => p.id !== participantId) } : m) }))
  }

  const sauvegarderEvenement = async () => {
    if (!evenementForm.titre.trim() || !evenementForm.date) return
    const payload = {
      club_id: clubId,
      titre: evenementForm.titre.trim(),
      date: evenementForm.date,
      heure: evenementForm.heure || null,
      lieu: evenementForm.lieu.trim() || null,
      type: evenementForm.type,
      description: evenementForm.description.trim() || null,
      participants: evenementForm.participants,
      referents: evenementForm.referents,
      ressources_materielles: evenementForm.ressources_materielles,
      missions: evenementForm.missions,
    }
    // Optimistic : formulaire fermé tout de suite, réouvert avec la saisie
    // intacte en cas d'erreur.
    const idEnEdition = editingEvenementId
    const snapshot = { ...evenementForm }
    setSavingEvenement(true)
    setShowEvenementForm(false)
    setEditingEvenementId(null)
    const { error } = idEnEdition
      ? await supabase.from('evenements_club').update(payload).eq('id', idEnEdition)
      : await supabase.from('evenements_club').insert(payload)
    setSavingEvenement(false)
    if (error) {
      alert('Erreur : ' + error.message)
      setEvenementForm(snapshot)
      setEditingEvenementId(idEnEdition)
      setShowEvenementForm(true)
      return
    }
    await chargerEvenements(clubId)
  }

  const supprimerEvenement = async (id) => {
    if (!confirm("Supprimer cet événement ?")) return
    await supabase.from('evenements_club').delete().eq('id', id)
    await chargerEvenements(clubId)
  }

  // Export PDF d'un événement complet (infos, référents, participants,
  // ressources, missions) — même approche que Deplacements.jsx
  // (exporterPlanningPDF) : import dynamique de jsPDF, positionnement
  // manuel du texte avec vérification de saut de page, pas d'autoTable.
  const exporterEvenementPDF = async (ev) => {
    setExportingPdfId(ev.id)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const margin = 14
      const largeurPage = doc.internal.pageSize.getWidth()
      const hauteurPage = doc.internal.pageSize.getHeight()
      const NOIR = [30, 30, 30]
      const GRIS = [110, 110, 110]
      const VERT = [22, 101, 52]
      let y = 18

      const sautDePage = (marge = 20) => { if (y > hauteurPage - marge) { doc.addPage(); y = 18 } }
      const titreSection = (texte) => {
        sautDePage(30)
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...NOIR)
        doc.text(texte, margin, y)
        y += 5
        doc.setDrawColor(210, 210, 210)
        doc.line(margin, y, largeurPage - margin, y)
        y += 6
      }
      const ligne = (texte, { gras = false, couleur = NOIR, taille = 10, indent = 0 } = {}) => {
        sautDePage(18)
        doc.setFontSize(taille)
        doc.setFont('helvetica', gras ? 'bold' : 'normal')
        doc.setTextColor(...couleur)
        const largeurUtile = largeurPage - margin * 2 - indent
        const lignes = doc.splitTextToSize(texte, largeurUtile)
        lignes.forEach(l => { sautDePage(18); doc.text(l, margin + indent, y); y += 5 })
      }

      const info = TYPE_EVENEMENT_INFO(ev.type)
      doc.setFontSize(17)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...NOIR)
      doc.text(ev.titre || 'Événement', margin, y)
      y += 7

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...GRIS)
      const dateLabel = ev.date ? new Date(`${ev.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''
      doc.text(`${info.emoji} ${info.label}  ·  ${dateLabel}${ev.heure ? `  ·  ${ev.heure.slice(0, 5)}` : ''}${ev.lieu ? `  ·  ${ev.lieu}` : ''}`, margin, y)
      y += 10

      if (ev.description) { titreSection('Description'); ligne(ev.description); y += 4 }

      if (ev.referents?.length > 0) {
        titreSection('Référents')
        ev.referents.forEach(r => ligne(`⭐ ${r.nom}`))
        y += 4
      }

      if (ev.participants?.length > 0) {
        titreSection(`Participants invités (${ev.participants.length})`)
        ligne(ev.participants.map(p => p.nom).join(', '))
        y += 4
      }

      if (ev.ressources_materielles?.length > 0) {
        titreSection('Ressources matérielles')
        ev.ressources_materielles.forEach(r => ligne(`•  ${r.quantite}× ${r.item}`))
        y += 4
      }

      if (ev.missions?.length > 0) {
        titreSection(`Missions (${ev.missions.length})`)
        ev.missions.forEach(m => {
          sautDePage(30)
          ligne(m.titre || 'Mission', { gras: true, taille: 11 })
          if (m.responsable_nom) ligne(`Responsable : ${m.responsable_nom}`, { couleur: VERT, indent: 3 })
          if (m.participants?.length > 0) ligne(`Participants : ${m.participants.map(p => p.nom).join(', ')}`, { couleur: GRIS, indent: 3 })
          if (m.objectif) ligne(`Objectif : ${m.objectif}`, { indent: 3 })
          if (m.comment) ligne(`Comment : ${m.comment}`, { indent: 3 })
          y += 3
        })
      }

      doc.save(`evenement-${(ev.titre || 'sans-titre').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`)
    } finally {
      setExportingPdfId(null)
    }
  }

  // ── Projets club ─────────────────────────────────────────────────────────────
  const chargerProjets = async (uid) => {
    const { data } = await supabase.from('projets_club').select('*, taches_projet(*)').eq('club_id', uid).order('created_at', { ascending: false })
    setProjetsClub(data || [])
  }

  const ouvrirNouveauProjet = () => {
    setEditingProjetId(null)
    setProjetForm({ nom: '', description: '', objectif: '', date_debut: '', date_fin: '', responsable_id: '', responsable_nom: '', statut: 'en_attente', referents: [], missions: [] })
    setShowProjetForm(true)
  }

  const ouvrirEditionProjet = (p) => {
    setEditingProjetId(p.id)
    setProjetForm({ nom: p.nom || '', description: p.description || '', objectif: p.objectif || '', date_debut: p.date_debut || '', date_fin: p.date_fin || '', responsable_id: p.responsable_id || '', responsable_nom: p.responsable_nom || '', statut: p.statut || 'en_attente', referents: p.referents || [], missions: p.missions || [] })
    setShowProjetForm(true)
  }

  const ajouterReferentProjet = () => {
    const nom = `${saisieReferentProjet.prenom} ${saisieReferentProjet.nom}`.trim()
    if (!nom) return
    setProjetForm(f => {
      if (f.referents.some(r => r.nom.toLowerCase() === nom.toLowerCase())) return f
      return { ...f, referents: [...f.referents, { id: crypto.randomUUID(), nom }] }
    })
    setSaisieReferentProjet({ prenom: '', nom: '' })
  }
  const retirerReferentProjet = (id) => {
    setProjetForm(f => ({ ...f, referents: f.referents.filter(r => r.id !== id) }))
  }

  // ── Missions d'un projet — même structure que les missions d'événement
  // (responsable_id/responsable_nom, participants en saisie libre), étendue
  // avec dates propres à la mission, les 3 catégories de ressources et le
  // suivi (résultats / problème rencontré) demandés spécifiquement pour les
  // projets. ──
  const ajouterMissionProjet = () => {
    setProjetForm(f => ({
      ...f,
      missions: [...f.missions, {
        id: crypto.randomUUID(), titre: '', responsable_id: '', responsable_nom: '', participants: [],
        objectif: '', comment: '', date_debut: '', date_fin: '',
        ressource_humaine: '', ressource_materielle: '', ressource_financiere: '',
        resultats: '', probleme_rencontre: '',
      }],
    }))
  }
  const modifierMissionProjet = (id, champ, valeur) => {
    setProjetForm(f => ({ ...f, missions: f.missions.map(m => m.id === id ? { ...m, [champ]: valeur } : m) }))
  }
  const supprimerMissionProjet = (id) => {
    setProjetForm(f => ({ ...f, missions: f.missions.filter(m => m.id !== id) }))
  }
  const validerResponsableMissionProjet = (missionId) => {
    const s = saisieResponsableMissionProjet[missionId] || {}
    const nom = `${s.prenom || ''} ${s.nom || ''}`.trim()
    if (!nom) return
    setProjetForm(f => ({ ...f, missions: f.missions.map(m => m.id === missionId ? { ...m, responsable_id: null, responsable_nom: nom } : m) }))
    setSaisieResponsableMissionProjet(prev => ({ ...prev, [missionId]: { prenom: '', nom: '' } }))
  }
  const effacerResponsableMissionProjet = (missionId) => {
    setProjetForm(f => ({ ...f, missions: f.missions.map(m => m.id === missionId ? { ...m, responsable_id: null, responsable_nom: '' } : m) }))
  }
  const ajouterParticipantMissionProjet = (missionId) => {
    const s = saisieParticipantMissionProjet[missionId] || {}
    const nom = `${s.prenom || ''} ${s.nom || ''}`.trim()
    if (!nom) return
    setProjetForm(f => ({
      ...f,
      missions: f.missions.map(m => {
        if (m.id !== missionId) return m
        if (m.participants.some(p => p.nom.toLowerCase() === nom.toLowerCase())) return m
        return { ...m, participants: [...m.participants, { id: crypto.randomUUID(), nom }] }
      }),
    }))
    setSaisieParticipantMissionProjet(prev => ({ ...prev, [missionId]: { prenom: '', nom: '' } }))
  }
  const retirerParticipantMissionProjet = (missionId, participantId) => {
    setProjetForm(f => ({ ...f, missions: f.missions.map(m => m.id === missionId ? { ...m, participants: m.participants.filter(p => p.id !== participantId) } : m) }))
  }

  const sauvegarderProjet = async () => {
    if (!projetForm.nom.trim()) return
    const payload = {
      club_id: clubId,
      nom: projetForm.nom.trim(),
      description: projetForm.description.trim() || null,
      objectif: projetForm.objectif.trim() || null,
      date_debut: projetForm.date_debut || null,
      date_fin: projetForm.date_fin || null,
      responsable_id: projetForm.responsable_id || null,
      responsable_nom: projetForm.responsable_nom || null,
      statut: projetForm.statut,
      referents: projetForm.referents,
      missions: projetForm.missions,
    }
    // Optimistic : formulaire fermé tout de suite, réouvert avec la saisie
    // intacte en cas d'erreur.
    const idEnEdition = editingProjetId
    const snapshot = { ...projetForm }
    setSavingProjet(true)
    setShowProjetForm(false)
    setEditingProjetId(null)
    const { error } = idEnEdition
      ? await supabase.from('projets_club').update(payload).eq('id', idEnEdition)
      : await supabase.from('projets_club').insert(payload)
    setSavingProjet(false)
    if (error) {
      alert('Erreur : ' + error.message)
      setProjetForm(snapshot)
      setEditingProjetId(idEnEdition)
      setShowProjetForm(true)
      return
    }
    await chargerProjets(clubId)
  }

  const changerStatutProjet = async (id, statut) => {
    // Optimistic : le statut change dans la liste locale tout de suite.
    const avant = projetsClub.find(p => p.id === id)?.statut
    setProjetsClub(prev => prev.map(p => (p.id === id ? { ...p, statut } : p)))
    const { error } = await supabase.from('projets_club').update({ statut }).eq('id', id)
    if (error) {
      setProjetsClub(prev => prev.map(p => (p.id === id ? { ...p, statut: avant } : p)))
      alert('Erreur : ' + error.message)
    }
  }

  const supprimerProjet = async (id) => {
    if (!confirm('Supprimer ce projet et toutes ses tâches ?')) return
    await supabase.from('projets_club').delete().eq('id', id)
    await chargerProjets(clubId)
  }

  // Export PDF d'un projet — même construction que exporterEvenementPDF.
  const exporterProjetPDF = async (p) => {
    setExportingPdfId(p.id)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const margin = 14
      const largeurPage = doc.internal.pageSize.getWidth()
      const hauteurPage = doc.internal.pageSize.getHeight()
      const NOIR = [30, 30, 30]
      const GRIS = [110, 110, 110]
      let y = 18

      const sautDePage = (marge = 20) => { if (y > hauteurPage - marge) { doc.addPage(); y = 18 } }
      const titreSection = (texte) => {
        sautDePage(30)
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...NOIR)
        doc.text(texte, margin, y)
        y += 5
        doc.setDrawColor(210, 210, 210)
        doc.line(margin, y, largeurPage - margin, y)
        y += 6
      }
      const ligne = (texte, { couleur = NOIR, taille = 10, indent = 0 } = {}) => {
        sautDePage(18)
        doc.setFontSize(taille)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...couleur)
        const lignes = doc.splitTextToSize(texte, largeurPage - margin * 2 - indent)
        lignes.forEach(l => { sautDePage(18); doc.text(l, margin + indent, y); y += 5 })
      }

      doc.setFontSize(17)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...NOIR)
      doc.text(p.nom || 'Projet', margin, y)
      y += 7

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...GRIS)
      const statutLabel = STATUTS_PROJET.find(s => s.val === p.statut)?.label || p.statut
      const dates = (p.date_debut || p.date_fin)
        ? `${p.date_debut ? new Date(`${p.date_debut}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '?'} → ${p.date_fin ? new Date(`${p.date_fin}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '?'}`
        : null
      doc.text([statutLabel, dates].filter(Boolean).join('  ·  '), margin, y)
      y += 10

      if (p.description) { titreSection('Description'); ligne(p.description); y += 4 }

      if (p.responsable_nom) { titreSection('Responsable'); ligne(`👤 ${p.responsable_nom}`); y += 4 }

      if (p.referents?.length > 0) {
        titreSection('Référents')
        p.referents.forEach(r => ligne(`⭐ ${r.nom}`))
        y += 4
      }

      const taches = p.taches_projet || []
      if (taches.length > 0) {
        const fait = taches.filter(t => t.fait).length
        titreSection(`Tâches (${fait}/${taches.length} terminées)`)
        taches.forEach(tc => ligne(`${tc.fait ? '☑' : '☐'}  ${tc.titre}`, { couleur: tc.fait ? GRIS : NOIR }))
      }

      doc.save(`projet-${(p.nom || 'sans-nom').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`)
    } finally {
      setExportingPdfId(null)
    }
  }

  const ajouterTache = async (projetId) => {
    const titre = (nouvelleTache[projetId] || '').trim()
    if (!titre) return
    await supabase.from('taches_projet').insert({ projet_id: projetId, titre })
    setNouvelleTache(prev => ({ ...prev, [projetId]: '' }))
    await chargerProjets(clubId)
  }

  const toggleTache = async (tache) => {
    await supabase.from('taches_projet').update({ fait: !tache.fait }).eq('id', tache.id)
    await chargerProjets(clubId)
  }

  const supprimerTache = async (id) => {
    await supabase.from('taches_projet').delete().eq('id', id)
    await chargerProjets(clubId)
  }

  const chargerSeancesRecues = async (uid) => {
    const { data } = await supabase
      .from('seances_uploadees')
      .select('*, educateur:educateur_id(prenom, nom), evaluation:evaluations_seance(*)')
      .eq('club_id', uid)
      .order('created_at', { ascending: false })
    setSeancesRecues(data || [])
  }

  // ── Staff du club ──
  const chargerStaff = async (uid) => {
    const { data } = await supabase
      .from('staff_club')
      .select('*, membre:user_id(prenom, nom, email)')
      .eq('club_id', uid)
      .order('created_at', { ascending: false })
    setStaffMembers(data || [])
  }

  const chargerRolePermissions = async (uid) => {
    const { data } = await supabase
      .from('role_permissions')
      .select('role, section, can_view, can_edit')
      .eq('club_id', uid)
    setRolePermissions(data || [])
  }

  const chargerRoleCategoriesAccess = async (uid) => {
    const { data } = await supabase
      .from('role_categories_access')
      .select('role, categories, acces_complet')
      .eq('club_id', uid)
    setRoleCategoriesAccess(data || [])
  }

  // Sauvegarde toute la matrice en une fois (upsert ligne par ligne, clé (club_id, role, section)),
  // et si fourni, la config d'accès par catégorie (clé (club_id, role)) en une seconde passe.
  // Le président n'a jamais de ligne : il garde tout, en dur, quoi qu'il arrive (cf. canViewSection).
  const sauvegarderPermissions = async (matrice, catMatrice) => {
    if (!clubId) return
    const rows = []
    for (const role of Object.keys(matrice)) {
      if (role === 'president') continue
      for (const section of Object.keys(matrice[role])) {
        rows.push({ club_id: clubId, role, section, can_view: matrice[role][section].can_view, can_edit: matrice[role][section].can_edit })
      }
    }
    const catRows = catMatrice ? Object.keys(catMatrice).map(role => ({
      club_id: clubId, role, acces_complet: catMatrice[role].acces_complet, categories: catMatrice[role].categories,
    })) : []
    // Optimistic : on connaît déjà exactement ce que seront les matrices, donc la
    // modale se ferme et l'état local se met à jour tout de suite, sans
    // attendre la réponse Supabase.
    const avant = rolePermissions
    const avantCat = roleCategoriesAccess
    setRolePermissions(rows)
    if (catMatrice) setRoleCategoriesAccess(catRows)
    setShowPermissionsModal(false)
    setSavingPermissions(true)
    const [{ error }, { error: errorCat }] = await Promise.all([
      supabase.from('role_permissions').upsert(rows, { onConflict: 'club_id,role,section' }),
      catMatrice ? supabase.from('role_categories_access').upsert(catRows, { onConflict: 'club_id,role' }) : Promise.resolve({ error: null }),
    ])
    setSavingPermissions(false)
    if (error || errorCat) {
      alert('Erreur : ' + (error?.message || errorCat?.message))
      setRolePermissions(avant)
      setRoleCategoriesAccess(avantCat)
      setShowPermissionsModal(true)
    }
  }

  const rechercherUtilisateurs = async (query) => {
    setSearchStaff(query)
    if (query.length < 2) { setResultatsStaff([]); return }
    const { data } = await supabase
      .from('profiles')
      .select('id, prenom, nom, email, plan')
      .neq('id', clubId)
      .or(`prenom.ilike.%${query}%,nom.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(8)
    setResultatsStaff(data || [])
  }

  const ajouterStaff = async (userId) => {
    setAddingStaffId(userId)
    const dejaMembre = staffMembers.some(m => m.user_id === userId)
    if (!dejaMembre) {
      await supabase.from('staff_club').insert({ club_id: clubId, user_id: userId, role: roleAAssigner })
      await chargerStaff(clubId)
    }
    setSearchStaff('')
    setResultatsStaff([])
    setAddingStaffId(null)
  }

  const inviterStaff = async () => {
    if (!inviteEmail.trim()) return
    setInvitingStaff(true)
    setInviteMessage(null)
    const { data, error } = await supabase.functions.invoke('inviter-staff', {
      body: { email: inviteEmail.trim(), role: roleAAssigner, clubId, clubNom: club?.club || '' },
    })
    setInvitingStaff(false)
    if (error || data?.error) {
      setInviteMessage({ type: 'erreur', texte: error?.message || data?.error })
      return
    }
    setInviteMessage({ type: 'ok', texte: `${t('club_invitation_envoyee', lang)} ${inviteEmail}` })
    setInviteEmail('')
  }

  const modifierRoleStaff = async (staffId, role) => {
    await supabase.from('staff_club').update({ role }).eq('id', staffId)
    setStaffMembers(prev => prev.map(m => (m.id === staffId ? { ...m, role } : m)))
  }

  const retirerStaff = async (staffId) => {
    if (!confirm('Retirer ce membre du staff ?')) return
    await supabase.from('staff_club').delete().eq('id', staffId)
    setStaffMembers(prev => prev.filter(m => m.id !== staffId))
  }

  // ── Organigramme du club (annuaire de contacts) ──
  const chargerOrganigramme = async (uid) => {
    const { data } = await supabase
      .from('organigramme_club')
      .select('*')
      .eq('club_id', uid)
      .order('ordre', { ascending: true })
    setOrganigramme(data || [])
  }

  // Parents des joueurs du club (profil_parent) — pas de club_id sur cette
  // table, la RLS club_lit_profils_parents scope déjà le résultat aux
  // joueurs affiliés à l'un des éducateurs de CE club (club_educateurs/
  // staff_club), donc aucun filtre supplémentaire nécessaire ici. Jointure
  // manuelle en 2 requêtes plutôt que joueur:joueur_id(...) : profil_parent
  // référence auth.users(id), pas profiles(id), l'alias d'embed PostgREST
  // n'est pas garanti de résoudre vers profiles dans ce cas.
  const chargerParentsClub = async () => {
    const { data: parents } = await supabase.from('profil_parent').select('*').eq('profil_complet', true)
    if (!parents?.length) { setParentsClub([]); return }
    const joueurIds = [...new Set(parents.map(p => p.joueur_id))]
    const { data: joueurs } = await supabase.from('profiles').select('id, prenom, nom, categorie, niveau_equipe, club').in('id', joueurIds)
    const joueurMap = {}
    joueurs?.forEach(j => { joueurMap[j.id] = j })
    setParentsClub(parents.map(p => ({ ...p, joueur: joueurMap[p.joueur_id] })))
  }

  const ouvrirModalOrganigramme = (membre) => {
    setMembreOrganigrammeEdite(membre)
    if (membre) {
      const roleConnu = ROLES_ORGANIGRAMME.includes(membre.role)
      setFormOrganigramme({ prenom: membre.prenom || '', nom: membre.nom || '', role: roleConnu ? membre.role : 'Autre', telephone: membre.telephone || '', email: membre.email || '', ordre: membre.ordre || 0, departement: membre.departement || 'Autre', superieur: membre.superieur || '' })
      setRoleOrganigrammeLibre(roleConnu ? '' : (membre.role || ''))
    } else {
      setFormOrganigramme({ prenom: '', nom: '', role: '', telephone: '', email: '', ordre: 0, departement: 'Autre', superieur: '' })
      setRoleOrganigrammeLibre('')
    }
    setModalOrganigramme(true)
  }

  const sauvegarderMembreOrganigramme = async () => {
    const role = formOrganigramme.role === 'Autre' ? (roleOrganigrammeLibre.trim() || 'Autre') : formOrganigramme.role
    if (!role || !formOrganigramme.prenom.trim()) return
    const payload = { ...formOrganigramme, role, club_id: clubId, ordre: Number(formOrganigramme.ordre) || 0 }
    // Optimistic : la modale se ferme tout de suite sans attendre la réponse
    // Supabase. Erreur → réouverte avec la saisie intacte (aucune vérification
    // d'erreur n'existait avant, on en ajoute a minima).
    const membreSnapshot = membreOrganigrammeEdite
    const formSnapshot = { ...formOrganigramme }
    setSavingOrganigramme(true)
    setModalOrganigramme(false)
    let error
    if (membreSnapshot) {
      ;({ error } = await supabase.from('organigramme_club').update(payload).eq('id', membreSnapshot.id))
    } else {
      ;({ error } = await supabase.from('organigramme_club').insert(payload))
    }
    setSavingOrganigramme(false)
    if (error) {
      alert('Erreur : ' + error.message)
      setFormOrganigramme(formSnapshot)
      setMembreOrganigrammeEdite(membreSnapshot)
      setModalOrganigramme(true)
      return
    }
    await chargerOrganigramme(clubId)
  }

  const supprimerMembreOrganigramme = async (id) => {
    if (!confirm('Supprimer ce membre de l\'organigramme ?')) return
    await supabase.from('organigramme_club').delete().eq('id', id)
    setOrganigramme(prev => prev.filter(m => m.id !== id))
  }

  const toggleOrgNode = (key) => {
    setOrgExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const telechargerTemplateOrganigramme = async () => {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([
      ['Nom', 'Prénom', 'Rôle', 'Département', 'Supérieur (Nom Prénom)', 'Email', 'Téléphone'],
      ['Dupont', 'Jean', 'Président', 'Direction', '', 'president@club.fr', '06 00 00 00 00'],
      ['Martin', 'Pierre', 'Directeur Sportif', 'Sportif', 'Dupont Jean', 'sport@club.fr', ''],
      ['Bernard', 'Sophie', 'Secrétaire', 'Administration', 'Dupont Jean', '', ''],
      ['Leclerc', 'Marc', 'Éducateur U17', 'Sportif', 'Martin Pierre', '', ''],
    ])
    ws['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 22 }, { wch: 18 }, { wch: 22 }, { wch: 24 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Organigramme')
    XLSX.writeFile(wb, 'template_organigramme.xlsx')
  }

  // Remplace tout l'organigramme du club par le contenu du fichier — cohérent avec
  // l'usage attendu (réimporter après mise à jour du fichier source), signalé à
  // l'utilisateur dans le panneau d'import.
  const importerOrganigrammeExcel = async (e) => {
    const file = e.target.files[0]
    if (!file || !clubId) return
    setOrgImportLoading(true)
    try {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
      const membres = rows.map((row, i) => ({
        club_id: clubId,
        nom: String(row['Nom'] || '').trim(),
        prenom: String(row['Prénom'] || '').trim(),
        role: String(row['Rôle'] || '').trim() || 'Autre',
        departement: String(row['Département'] || 'Autre').trim() || 'Autre',
        superieur: String(row['Supérieur (Nom Prénom)'] || '').trim(),
        email: String(row['Email'] || '').trim(),
        telephone: String(row['Téléphone'] || '').trim(),
        ordre: i,
      })).filter(m => m.nom && m.role)
      if (membres.length === 0) throw new Error('Aucune ligne valide trouvée (Nom et Rôle sont obligatoires).')

      await supabase.from('organigramme_club').delete().eq('club_id', clubId)
      const { data, error } = await supabase.from('organigramme_club').insert(membres).select()
      if (error) throw error
      setOrganigramme(data || [])
      setOrgImportMode(null)
      alert(`✅ ${membres.length} membre${membres.length > 1 ? 's' : ''} importé${membres.length > 1 ? 's' : ''} avec succès !`)
    } catch (err) {
      alert('Erreur import : ' + err.message)
    } finally {
      setOrgImportLoading(false)
      e.target.value = ''
    }
  }

  // Scan d'un organigramme papier via Groq Vision — même modèle et même file
  // d'attente séquentielle (enqueueGroqRequest) que les autres scans IA de l'app
  // (feuille de match, séances...), pour respecter le rate limit global du compte.
  const scannerOrganigramme = async () => {
    if (!orgScanFile || !clubId) return
    setOrgScanLoading(true)
    setOrgScanStatus(null)
    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY
      if (!apiKey) throw new Error('Clé VITE_GROQ_API_KEY manquante dans .env')
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(orgScanFile)
      })
      const prompt = `Analyse cet organigramme de club de football (photo ou document) et extrait tous les membres visibles.
Réponds UNIQUEMENT avec un tableau JSON valide, aucun texte avant ou après, aucune balise markdown.

Format exact attendu :
[
  { "nom": "Dupont", "prenom": "Jean", "role": "Président", "departement": "Direction", "superieur": "" },
  { "nom": "Martin", "prenom": "Pierre", "role": "Directeur Sportif", "departement": "Sportif", "superieur": "Dupont Jean" }
]

Règles :
- "superieur" = "Nom Prénom" du supérieur hiérarchique direct visible sur le document (chaîne vide si c'est le sommet de la hiérarchie)
- "departement" = l'un des : Direction, Sportif, Administration, Communication, Finance, Médical, Autre
- Inclure tous les membres visibles sur le document
- Si le prénom n'est pas visible, mets une chaîne vide`
      const data = await enqueueGroqRequest('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'qwen/qwen3.6-27b',
          messages: [
            { role: 'system', content: '/no_think\nRéponds uniquement avec du JSON valide. Aucune réflexion préalable.' },
            { role: 'user', content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:${orgScanFile.type || 'image/jpeg'};base64,${base64}` } }
            ] }
          ],
          temperature: 0.3,
          max_completion_tokens: 4000
        })
      }, setOrgScanStatus)
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error))
      const raw = data.choices?.[0]?.message?.content || ''
      const text = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error('Réponse invalide de l\'IA')
      const extraits = JSON.parse(jsonMatch[0])
      const membres = extraits.map((m, i) => ({
        club_id: clubId,
        nom: (m.nom || '').trim(),
        prenom: (m.prenom || '').trim(),
        role: (m.role || 'Autre').trim() || 'Autre',
        departement: (m.departement || 'Autre').trim() || 'Autre',
        superieur: (m.superieur || '').trim(),
        email: '',
        telephone: '',
        ordre: i,
      })).filter(m => m.nom)
      if (membres.length === 0) throw new Error('Aucun membre détecté sur ce document.')

      await supabase.from('organigramme_club').delete().eq('club_id', clubId)
      const { data: inserted, error } = await supabase.from('organigramme_club').insert(membres).select()
      if (error) throw error
      setOrganigramme(inserted || [])
      setOrgImportMode(null)
      setOrgScanFile(null)
      alert(`✅ ${membres.length} membre${membres.length > 1 ? 's' : ''} extrait${membres.length > 1 ? 's' : ''} depuis le document !`)
    } catch (err) {
      alert('Erreur scan : ' + err.message)
    } finally {
      setOrgScanLoading(false)
      setOrgScanStatus(null)
    }
  }

  const chargerClassements = async () => {
    if (categories.length === 0) return
    setLoadingClassements(true)
    const educateurIds = [...new Set(categories.map(c => c.educateur_id).filter(Boolean))]
    if (educateurIds.length === 0) { setLoadingClassements(false); return }

    const { data: joueurs } = await supabase
      .from('equipe_joueurs')
      .select('id, prenom, nom, poste, educateur_id, club_categorie_id, numero_maillot')
      .in('educateur_id', educateurIds)

    if (!joueurs || joueurs.length === 0) { setStatsParCategorie({}); setLoadingClassements(false); return }

    const joueurIds = joueurs.map(j => j.id)

    const [{ data: statsMatch }, { data: presences }, { data: notes }] = await Promise.all([
      supabase.from('stats_match').select('joueur_id, buts, passes_dec, minutes, clean_sheet, carton_jaune, carton_rouge, matchs_equipe(score_nous, score_eux)').in('joueur_id', joueurIds),
      supabase.from('presences_entrainement').select('joueur_id, statut, point_seance, entrainements(date)').in('joueur_id', joueurIds),
      supabase.from('notes_joueurs').select('joueur_id, technique, physique, mental, tactique').in('joueur_id', joueurIds),
    ])

    const buildStats = (joueurId) => {
      const sm = (statsMatch || []).filter(s => s.joueur_id === joueurId)
      const pr = (presences || []).filter(p => p.joueur_id === joueurId)
      const note = (notes || []).find(n => n.joueur_id === joueurId)
      const totalPresences = pr.filter(p => p.statut && p.statut !== 'non_saisi').length
      const presents = pr.filter(p => p.statut === 'present' || p.statut === 'convoque').length
      const points = pr.filter(p => p.point_seance).length
      const noteGlobale = note ? ((note.technique + note.physique + note.mental + note.tactique) / 4) : null

      // Matchs réellement joués (minutes > 0) — le résultat V/N/D vient du match lié, pas d'une
      // colonne stats_match.victoire (existe en base mais jamais renseignée par l'app).
      const smJoues = sm.filter(r => (r.minutes || 0) > 0)
      const victoires = smJoues.filter(r => {
        const me = r.matchs_equipe
        return me && me.score_nous !== '' && me.score_nous !== null && parseInt(me.score_nous) > parseInt(me.score_eux)
      }).length

      // Présence par mois (pour les barres horizontales de la fiche individuelle)
      const moisMap = {}
      pr.forEach(p => {
        const date = p.entrainements?.date
        if (!date) return
        const key = date.slice(0, 7)
        if (!moisMap[key]) moisMap[key] = { present: 0, total: 0, points: 0 }
        if (p.statut && p.statut !== 'non_saisi') {
          moisMap[key].total++
          if (p.statut === 'present' || p.statut === 'convoque') moisMap[key].present++
        }
        if (p.point_seance) moisMap[key].points++
      })
      const presenceMensuelle = Object.entries(moisMap).sort(([a], [b]) => a.localeCompare(b))
        .map(([month, s]) => ({ month, taux: s.total ? Math.round((s.present / s.total) * 100) : 0, present: s.present, total: s.total, points: s.points }))

      return {
        buts: sm.reduce((s, r) => s + (r.buts || 0), 0),
        passes: sm.reduce((s, r) => s + (r.passes_dec || 0), 0),
        matchsJoues: smJoues.length,
        cleanSheets: sm.filter(r => r.clean_sheet).length,
        cartonsJaunes: sm.filter(r => r.carton_jaune).length,
        cartonsRouges: sm.filter(r => r.carton_rouge).length,
        tauxVictoire: smJoues.length ? Math.round((victoires / smJoues.length) * 100) : null,
        tauxPresence: totalPresences ? Math.round((presents / totalPresences) * 100) : null,
        // Compteurs bruts (présent stricto sensu, sans convoqué) pour le taux de présence
        // effectif agrégé au niveau équipe, dans l'onglet Classements.
        presenceEffectifTotal: totalPresences,
        presenceEffectifPresents: pr.filter(p => p.statut === 'present' || p.statut === 'convoque').length,
        pointsSeance: points,
        noteGlobale,
        presenceMensuelle,
      }
    }

    // club_categorie_id n'est assigné automatiquement qu'une fois, au moment
    // où le club accepte l'éducateur (accepterEducateur) — un joueur ajouté à
    // son effectif après coup (le cas normal, en continu pendant la saison)
    // reste avec club_categorie_id = null : compté dans le total du club
    // (qui n'en dépend pas) mais absent de "Effectif" par catégorie (qui
    // filtre dessus). Repli par correspondance texte (même règle que
    // accepterEducateur/autoAssignerJoueurs : équipe 'A' par défaut, faute de
    // distinction A/B dans le champ libre categorie) pour ne pas dépendre
    // d'une resynchronisation manuelle.
    const grouped = {}
    const aReassigner = []
    categories.forEach(cat => {
      const joueursCat = joueurs.filter(j => {
        if (j.club_categorie_id === cat.id) return true
        if (j.club_categorie_id || !j.categorie) return false
        const memeNom = cat.nom.toLowerCase() === j.categorie.trim().toLowerCase()
        if (!memeNom) return false
        // Repli équipe 'A' par défaut (cf. accepterEducateur/autoAssignerJoueurs),
        // sauf si ce nom de catégorie n'existe qu'une fois chez cet éducateur —
        // là, pas d'ambiguïté A/B possible, on peut rattacher même une équipe B
        // (jusqu'ici jamais couverte par ce repli, effectif qui reste vide en
        // permanence pour toute catégorie B tant qu'aucun bouton manuel n'existe).
        const candidats = categories.filter(c => c.educateur_id === j.educateur_id && c.nom.toLowerCase() === j.categorie.trim().toLowerCase())
        return cat.equipe === 'A' || candidats.length === 1
      })
      joueursCat.forEach(j => { if (!j.club_categorie_id) aReassigner.push({ id: j.id, club_categorie_id: cat.id }) })
      grouped[cat.id] = { categorie: cat, joueurs: joueursCat.map(j => ({ ...j, stats: buildStats(j.id) })) }
    })

    setStatsParCategorie(grouped)
    if (!categorieActive && categories.length > 0) setCategorieActive(categories[0].id)
    setLoadingClassements(false)

    // Persiste le rattachement trouvé par repli, pour que les prochains
    // chargements n'aient plus besoin de ce repli (auto-réparation, sans
    // bouton manuel à cliquer).
    for (const r of aReassigner) {
      await supabase.from('equipe_joueurs').update({ club_categorie_id: r.club_categorie_id }).eq('id', r.id)
    }
  }

  const GROUPES_POSTE = [
    { label: `🧤 ${t('stats_pres_gardiens', lang)}`, color: '#f59e0b', match: p => p?.toLowerCase().includes('gardien') },
    { label: `🛡️ ${t('stats_pres_defenseurs', lang)}`, color: colors.accent.blue, match: p => p && ['défenseur', 'defenseur', 'latéral', 'lateral'].some(k => p.toLowerCase().includes(k)) },
    { label: `⚙️ ${t('stats_pres_milieux', lang)}`, color: colors.accent.purpleLight, match: p => p?.toLowerCase().includes('milieu') },
    { label: `⚡ ${t('stats_pres_attaquants', lang)}`, color: colors.accent.green, match: p => p && ['attaquant', 'ailier'].some(k => p.toLowerCase().includes(k)) },
    { label: '❓ Autres', color: colors.text.faint, match: p => !p || !['gardien', 'défenseur', 'defenseur', 'latéral', 'lateral', 'milieu', 'attaquant', 'ailier'].some(k => p.toLowerCase().includes(k)) },
  ]

  const chargerMatchsCategorie = async (categorieId) => {
    const cat = categories.find(c => c.id === categorieId)
    if (!cat || !cat.educateur_id || clubMatchs[categorieId]) return
    setLoadingMatchs(true)
    const { data } = await supabase
      .from('matchs_equipe')
      .select('*')
      .eq('educateur_id', cat.educateur_id)
      .order('date', { ascending: false })
    setClubMatchs(prev => ({ ...prev, [categorieId]: data || [] }))
    setLoadingMatchs(false)
  }

  const [autoAssignLoading, setAutoAssignLoading] = useState(false)
  const [autoAssignResult, setAutoAssignResult] = useState(null)

  const autoAssignerJoueurs = async () => {
    setAutoAssignLoading(true)
    setAutoAssignResult(null)
    const educateurIds = [...new Set(categories.map(c => c.educateur_id).filter(Boolean))]
    if (educateurIds.length === 0) { setAutoAssignLoading(false); return }

    const { data: joueurs } = await supabase
      .from('equipe_joueurs')
      .select('id, categorie, club_categorie_id')
      .in('educateur_id', educateurIds)
      .is('club_categorie_id', null)

    if (!joueurs || joueurs.length === 0) {
      setAutoAssignResult({ count: 0 })
      setAutoAssignLoading(false)
      return
    }

    let count = 0
    for (const j of joueurs) {
      if (!j.categorie) continue
      const match = categories.find(c => c.nom.toLowerCase() === j.categorie.toLowerCase().trim() && c.equipe === 'A')
      if (match) {
        await supabase.from('equipe_joueurs').update({ club_categorie_id: match.id }).eq('id', j.id)
        count++
      }
    }
    setAutoAssignResult({ count })
    setAutoAssignLoading(false)
    setStatsParCategorie({}) // force le rechargement des classements
  }

  // ── Gestion catégories ──
  const ajouterCategorie = async () => {
    if (!newCategorie.nom) return
    // Optimistic : le formulaire se ferme tout de suite sans attendre la
    // réponse Supabase. Erreur → réouvert avec la saisie intacte (aucune
    // vérification d'erreur n'existait avant, on en ajoute a minima).
    const snapshot = { ...newCategorie }
    setSavingCategorie(true)
    setNewCategorie({ nom: 'U13', equipe: 'A', educateur_id: '' })
    setShowAddCategorie(false)
    const { error } = await supabase.from('club_categories').insert({
      club_id: clubId,
      nom: snapshot.nom,
      equipe: snapshot.equipe,
      educateur_id: snapshot.educateur_id || null,
    })
    setSavingCategorie(false)
    if (error) {
      alert('Erreur : ' + error.message)
      setNewCategorie(snapshot)
      setShowAddCategorie(true)
      return
    }
    await chargerCategories(clubId)
  }

  const supprimerCategorie = async (id) => {
    if (!confirm('Supprimer cette catégorie/équipe ?')) return
    await supabase.from('club_categories').delete().eq('id', id)
    setCategories(prev => prev.filter(c => c.id !== id))
  }

  // ── Gestion éducateurs (méthode 1 : recherche + invitation) ──
  const rechercherEducateurs = async (query) => {
    setSearchEducateur(query)
    if (query.length < 2) { setResultatsEducateurs([]); return }
    const { data } = await supabase
      .from('profiles')
      .select('id, prenom, nom, email, club, avatar_url')
      .eq('plan', 'educateur')
      .or(`prenom.ilike.%${query}%,nom.ilike.%${query}%,club.ilike.%${query}%`)
      .limit(8)
    setResultatsEducateurs(data || [])
  }

  const inviterEducateur = async (educateurId) => {
    setInvitingId(educateurId)
    const existing = educateursAffilies.find(e => e.educateur_id === educateurId)
    if (existing) { setInvitingId(null); return }
    await supabase.from('club_educateurs').insert({
      club_id: clubId, educateur_id: educateurId, statut: 'en_attente', methode: 'invite',
    })
    await chargerEducateurs(clubId)
    setSearchEducateur('')
    setResultatsEducateurs([])
    setInvitingId(null)
  }

  // Éducateur sans compte existant — invitation par email (envoyer-invitation,
  // role='educateur'), même mécanisme que l'invitation staff. Se termine par un
  // rechargement de la liste des invitations en attente, pas club_educateurs :
  // la ligne club_educateurs n'est créée qu'à l'acceptation (accepter-invitation),
  // faute d'educateur_id réel avant que la personne n'ait un compte.
  const ajouterEducateurManuel = async () => {
    if (!ajoutEducateurForm.prenom.trim() || !ajoutEducateurForm.nom.trim() || !ajoutEducateurForm.email.trim()) return
    setInvitingEducateur(true)
    setInviteEducateurMessage(null)
    const { data, error } = await supabase.functions.invoke('envoyer-invitation', {
      body: { email: ajoutEducateurForm.email.trim(), role: 'educateur', club_id: clubId, prenom: ajoutEducateurForm.prenom.trim(), nom: ajoutEducateurForm.nom.trim() },
    })
    setInvitingEducateur(false)
    if (error || data?.error) {
      setInviteEducateurMessage({ type: 'erreur', texte: error?.message || data?.error })
      return
    }
    setInviteEducateurMessage({ type: 'ok', texte: data?.linked ? 'Compte existant lié directement.' : `Invitation envoyée à ${ajoutEducateurForm.email}` })
    setAjoutEducateurForm({ prenom: '', nom: '', email: '' })
    if (data?.linked) await chargerEducateurs(clubId)
    else await chargerInvitationsEducateurEnvoyees(clubId)
  }

  const chargerInvitationsEducateurEnvoyees = async (uid) => {
    const { data } = await supabase.from('invitations').select('*').eq('club_id', uid).eq('role', 'educateur').eq('statut', 'en_attente').order('created_at', { ascending: false })
    setInvitationsEducateurEnvoyees(data || [])
  }

  const retirerEducateur = async (id) => {
    if (!confirm('Retirer cet éducateur du club ?')) return
    await supabase.from('club_educateurs').delete().eq('id', id)
    setEducateursAffilies(prev => prev.filter(e => e.id !== id))
  }

  const accepterEducateur = async (id) => {
    const affiliation = educateursAffilies.find(e => e.id === id)
    await supabase.from('club_educateurs').update({ statut: 'accepte' }).eq('id', id)
    await chargerEducateurs(clubId)

    if (!affiliation?.educateur_id) return

    // Récupère tous les joueurs de cet éducateur
    const { data: joueursEducateur } = await supabase
      .from('equipe_joueurs')
      .select('id, categorie, club_categorie_id')
      .eq('educateur_id', affiliation.educateur_id)

    if (!joueursEducateur || joueursEducateur.length === 0) return

    // Recharge les catégories actuelles du club (au cas où elles auraient changé)
    const { data: categoriesActuelles } = await supabase
      .from('club_categories')
      .select('*')
      .eq('club_id', clubId)

    let categoriesMap = categoriesActuelles || []

    // Catégories texte distinctes utilisées par les joueurs de l'éducateur (non vides)
    const categoriesTexte = [...new Set(joueursEducateur.map(j => j.categorie).filter(Boolean).map(c => c.trim()))]

    // Pour chaque catégorie texte, vérifie si elle existe côté club (équipe A) — sinon la crée
    for (const catTexte of categoriesTexte) {
      const existe = categoriesMap.find(c => c.nom.toLowerCase() === catTexte.toLowerCase() && c.equipe === 'A')
      if (!existe) {
        const { data: nouvelleCat } = await supabase.from('club_categories').insert({
          club_id: clubId,
          nom: catTexte,
          equipe: 'A',
          educateur_id: affiliation.educateur_id,
        }).select().single()
        if (nouvelleCat) categoriesMap = [...categoriesMap, nouvelleCat]
      }
    }

    // Assigne chaque joueur non encore assigné à sa catégorie correspondante
    for (const j of joueursEducateur) {
      if (j.club_categorie_id || !j.categorie) continue
      const match = categoriesMap.find(c => c.nom.toLowerCase() === j.categorie.trim().toLowerCase() && c.equipe === 'A')
      if (match) {
        await supabase.from('equipe_joueurs').update({ club_categorie_id: match.id }).eq('id', j.id)
      }
    }

    await chargerCategories(clubId)
  }

  const copierCode = () => {
    navigator.clipboard.writeText(codeClub)
  }

  const sauvegarderProfilClub = async () => {
    // Optimistic : le profil local se met à jour tout de suite, sans attendre
    // la réponse Supabase. Erreur → on revient à l'ancien profil (aucune
    // vérification d'erreur n'existait avant, on en ajoute a minima).
    const avant = club
    setClub(prev => ({ ...prev, ...profilClubEdit }))
    setSavingProfilClub(true)
    const { error } = await supabase.from('profiles').update({
      club: profilClubEdit.club,
      region: profilClubEdit.region,
      ville: profilClubEdit.ville,
      description: profilClubEdit.description,
      stades: profilClubEdit.stades,
    }).eq('id', clubId)
    setSavingProfilClub(false)
    if (error) {
      alert('Erreur : ' + error.message)
      setClub(avant)
    }
  }

  const ajouterStade = () => {
    setProfilClubEdit(p => ({ ...p, stades: [...p.stades, { id: crypto.randomUUID(), nom: '', adresse: '' }] }))
  }
  const modifierStade = (id, champ, valeur) => {
    setProfilClubEdit(p => ({ ...p, stades: p.stades.map(s => s.id === id ? { ...s, [champ]: valeur } : s) }))
  }
  const supprimerStade = (id) => {
    setProfilClubEdit(p => ({ ...p, stades: p.stades.filter(s => s.id !== id) }))
  }

  const handleAvatarClubUpload = async (e) => {
    const file = e.target.files[0]
    if (!file || !clubId) return
    setAvatarClubUploading(true)
    const sigRes = await fetch('/api/upload-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: clubId }) })
    const { signature, timestamp, folder, public_id, cloud_name, api_key } = await sigRes.json()
    const formData = new FormData()
    formData.append('file', file)
    formData.append('signature', signature)
    formData.append('timestamp', timestamp)
    formData.append('folder', folder)
    formData.append('public_id', public_id)
    formData.append('api_key', api_key)
    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, { method: 'POST', body: formData })
    const uploadData = await uploadRes.json()
    if (uploadData.secure_url) {
      await supabase.from('profiles').update({ avatar_url: uploadData.secure_url }).eq('id', clubId)
      setClub(prev => ({ ...prev, avatar_url: uploadData.secure_url }))
    }
    setAvatarClubUploading(false)
  }

  // Sauvegarde un ou plusieurs champs de thème (couleurs, slogan, images) —
  // optimistic sur `club` (source de vérité pour la couleur affichée partout),
  // sans attendre la réponse Supabase.
  const sauvegarderTheme = async (champs) => {
    const avant = club
    setClub(prev => ({ ...prev, ...champs }))
    setSavingTheme(true)
    const { error } = await supabase.from('profiles').update(champs).eq('id', clubId)
    setSavingTheme(false)
    if (error) {
      setClub(avant)
      alert('Erreur : ' + error.message)
    }
  }

  // Upload photo de fond / photo hero — même flux signé Cloudinary que
  // l'avatar club (handleAvatarClubUpload), dossier dédié ('theme') pour ne
  // pas mélanger avec les certifications/avatars.
  const uploaderImageTheme = async (file, champ) => {
    if (!file || !clubId) return
    setThemeUploading(champ)
    try {
      const sigRes = await fetch('/api/upload-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: clubId, type: 'theme' }) })
      const { signature, timestamp, folder, public_id, cloud_name, api_key } = await sigRes.json()
      const formData = new FormData()
      formData.append('file', file)
      formData.append('signature', signature)
      formData.append('timestamp', timestamp)
      formData.append('folder', folder)
      formData.append('public_id', public_id)
      formData.append('api_key', api_key)
      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, { method: 'POST', body: formData })
      const uploadData = await uploadRes.json()
      if (!uploadData.secure_url) throw new Error(uploadData.error?.message || 'Échec upload')
      await sauvegarderTheme({ [champ]: uploadData.secure_url })
    } catch (err) {
      alert('Erreur upload : ' + err.message)
    }
    setThemeUploading(null)
  }

  const ouvrirNotationEducateur = (affiliation) => {
    setEduNoteModal(affiliation)
    setEduNoteCriteres({})
    setEduNoteCommentaire('')
  }

  const soumettreNotationEducateur = async () => {
    if (!eduNoteModal) return
    const allKeys = CRITERES_EDU.flatMap(c => c.criteres.map(cr => cr.key))
    const allFilled = allKeys.every(k => eduNoteCriteres[k])
    if (!allFilled) return
    const moyGlobale = allKeys.reduce((s, k) => s + (eduNoteCriteres[k] || 0), 0) / allKeys.length
    // Optimistic : la modale se ferme tout de suite sans attendre la réponse
    // Supabase. Erreur → réouverte (aucune vérification d'erreur n'existait
    // avant, on en ajoute a minima).
    const modalSnapshot = eduNoteModal
    setSavingEduNote(true)
    setEduNoteModal(null)
    const { error } = await supabase.from('notes_educateur').upsert({
      educateur_id: modalSnapshot.educateur_id,
      auteur_id: clubId,
      auteur_type: 'club',
      saison: eduNoteSaison,
      note: Math.round(moyGlobale * 10) / 10,
      criteres: eduNoteCriteres,
      commentaire: eduNoteCommentaire,
      visible_public: true,
    }, { onConflict: 'educateur_id,auteur_id,saison' })
    setSavingEduNote(false)
    if (error) {
      alert('Erreur : ' + error.message)
      setEduNoteModal(modalSnapshot)
    }
  }

  const notifierCoachs = async (payload) => {
    const { data: coachs } = await supabase.from('profiles').select('email').eq('plan', 'coach')
    const coachEmails = coachs?.map(c => c.email).filter(Boolean) || []
    if (coachEmails.length === 0) return
    await fetch('/api/send-coach-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coachEmails, ...payload }),
    })
  }

  const transfererAuCoach = async (seanceId) => {
    const seance = seancesRecues.find(s => s.id === seanceId)
    await supabase.from('seances_uploadees').update({ statut: 'transfere_coach' }).eq('id', seanceId)
    await chargerSeancesRecues(clubId)
    await notifierCoachs({ type: 'seance', clubNom: club?.club, theme: seance?.theme })
  }

  const supprimerSeance = async (seanceId) => {
    if (!confirm('Supprimer cette séance définitivement ?')) return
    const { error } = await supabase.from('seances_uploadees').delete().eq('id', seanceId)
    if (!error) setSeancesRecues(prev => prev.filter(s => s.id !== seanceId))
  }

  const ouvrirGrilleEvaluation = (seance) => {
    setSeanceEvalModal(seance)
  }

  const soumettreGrilleEvaluation = async (payload) => {
    if (!seanceEvalModal) return
    // Optimistic : la modale se ferme tout de suite. Les deux écritures
    // (évaluation + statut de la séance) ne dépendent pas l'une de l'autre —
    // seulement de l'id de la séance, déjà connu — donc en parallèle.
    const seanceId = seanceEvalModal.id
    setSeanceEvalModal(null)
    // ModalGrilleSeance garde son propre état interne (notes, commentaires) —
    // le rouvrir en cas d'erreur ne restaurerait pas la saisie (remount avec
    // un état vide), donc on ne tente pas ça : juste une alerte claire pour
    // que l'utilisateur sache qu'il doit recommencer l'évaluation.
    const [{ error }] = await Promise.all([
      supabase.from('evaluations_seance').upsert({
        seance_id: seanceId,
        evaluateur_id: clubId,
        evaluateur_type: payload.evaluateurType || 'club',
        criteres: payload.criteres,
        note_preparation: payload.note_preparation,
        note_animation: payload.note_animation,
        note_pedagogie: payload.note_pedagogie,
        note_management: payload.note_management,
        note_football: payload.note_football,
        note_totale: payload.note_totale,
        points_forts: payload.points_forts,
        axes_amelioration: payload.axes_amelioration,
        actions: payload.actions,
      }, { onConflict: 'seance_id' }),
      supabase.from('seances_uploadees').update({ statut: 'analyse' }).eq('id', seanceId),
    ])
    if (error) {
      alert("Erreur lors de l'enregistrement de l'évaluation : " + error.message + '\n\nMerci de recommencer l\'évaluation.')
    }
    await chargerSeancesRecues(clubId)
  }

  const handleLogout = async () => { await signOutSafe(); navigate('/') }

  if (loading) return <div style={{ ...st.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: colors.accent.green }}>Chargement...</p></div>

  const educateursAcceptes = educateursAffilies.filter(e => e.statut === 'accepte')
  const educateursEnAttente = educateursAffilies.filter(e => e.statut === 'en_attente')

  const iconLabel = (Icon, texte) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Icon /> {texte}</span>

  // Initiales du club pour l'avatar par défaut (même logique que getClubInitials
  // dans DashboardRecruteur.jsx, dupliquée localement — usage ponctuel ici).
  const clubInitiales = (() => {
    const nom = (club?.club || '').trim()
    if (!nom) return '?'
    const mots = nom.split(/\s+/).filter(w => !['AS', 'FC', 'OC', 'US', 'SC', 'AC', 'RC', 'ES', 'OGC', 'SM', 'EA'].includes(w))
    if (mots.length === 0) return nom.slice(0, 2).toUpperCase()
    return mots.length >= 2 ? (mots[0][0] + mots[1][0]).toUpperCase() : mots[0].slice(0, 2).toUpperCase()
  })()

  const sportifVisible = canViewSection('sportif') || canViewSection('terrains')
  const administratifVisible = monRole === 'president' || ['sponsors', 'deplacements', 'profil', 'budget', 'evenements', 'organigramme'].some(canViewSection) || canViewSection('staff')

  const categoriesVisibles = [
    { id: 'accueil', label: iconLabel(IcoHome, t('club_accueil', lang)), defaultTab: 'accueil', visible: true },
    { id: 'sportif', label: iconLabel(IcoGear, t('club_sportif', lang)), defaultTab: canViewSection('sportif') ? 'categories' : 'terrains',
      visible: sportifVisible },
    { id: 'administratif', label: iconLabel(IcoBuilding, t('club_administratif', lang)), defaultTab: 'sponsors',
      visible: administratifVisible },
  ].filter(c => c.visible)

  // Sous-onglets de la catégorie active (niveau 2) — calculés une fois, réutilisés par
  // l'affichage desktop (st.tabs) et le drawer mobile. Filtrés par la matrice de
  // permissions (role_permissions) : 'categories'/'classements'/'recrutement'/'educateurs'
  // partagent le droit 'sportif', 'terrains' est indépendant (cf. PERMISSION_SECTIONS).
  const sousOnglets = activeCategorie === 'sportif' ? [
    ...(canViewSection('sportif') ? [
      { id: 'categories', label: iconLabel(IcoClipboard, t('club_tab_categories', lang)) },
      { id: 'classements', label: iconLabel(IcoTrophy, t('club_tab_classements', lang)) },
      { id: 'recrutement', label: iconLabel(IcoSearch, t('club_tab_recrutement', lang)) },
      { id: 'educateurs', label: iconLabel(IcoUsers, `${t('club_tab_educateurs', lang)}${educateursEnAttente.length ? ` (${educateursEnAttente.length})` : ''}`) },
    ] : []),
    ...(canViewSection('terrains') ? [{ id: 'terrains', label: iconLabel(IcoTerrain, 'Planning des terrains') }] : []),
  ] : activeCategorie === 'administratif' ? [
    ...(canViewSection('sponsors') ? [{ id: 'sponsors', label: iconLabel(IcoLink, t('club_tab_sponsors', lang)) }] : []),
    ...(canViewSection('deplacements') ? [{ id: 'deplacements', label: iconLabel(IcoBus, t('nav_deplacements', lang)) }] : []),
    ...(canViewSection('profil') ? [{ id: 'profil', label: iconLabel(IcoStar, t('club_tab_profil', lang)) }] : []),
    ...(canViewSection('budget') ? [{ id: 'budget', label: iconLabel(IcoWallet, t('club_tab_budget', lang)) }] : []),
    ...(canViewSection('evenements') ? [{ id: 'evenements', label: iconLabel(IcoCalendar, 'Événements & Projets') }] : []),
    ...(canViewSection('organigramme') ? [{ id: 'organigramme', label: iconLabel(IcoCarteBadge, t('club_tab_organigramme', lang)) }] : []),
    ...(canViewSection('staff') ? [{ id: 'staff', label: iconLabel(IcoUsers, t('club_tab_staff', lang)) }] : []),
    ...(canViewSection('inventaire') ? [{ id: 'inventaire', label: iconLabel(IcoBox, 'Inventaire') }] : []),
  ] : []

  const clubOnboardingSteps = [
    { id: 1, title: "Bienvenue sur Digital Football ! ⚽", message: "Je suis Cedinho, ton guide. Je vais te montrer les grandes sections de l'espace club en 2 minutes.", targetId: null, position: "center" },
    { id: 2, title: "Accueil", message: "Vue d'ensemble : stats du club, actions rapides et activité récente.", targetId: "cat-accueil", position: "bottom" },
    ...(sportifVisible ? [{ id: 3, title: "Sportif", message: "Catégories (tes équipes), Classements, Planning des terrains, Recrutement et Éducateurs affiliés — tout le suivi sportif du club.", targetId: "cat-sportif", position: "bottom" }] : []),
    ...(administratifVisible ? [{ id: 4, title: "Administratif", message: "Sponsors, Déplacements, Répartition mini-bus, Profil du club, Budget et Staff — toute la gestion administrative.", targetId: "cat-administratif", position: "bottom" }] : []),
    { id: 5, title: "C'est parti ! 🚀", message: "Tu es prêt. Une question ? Clique sur le ballon en bas à droite — je suis toujours là.", targetId: null, position: "center" },
  ]

  return (
    <div style={st.page}>
      <OnboardingGuide key={onboardingKey} userId={clubId} steps={clubOnboardingSteps} accentColor={couleurPrincipale} />
      <FloatingHelper userId={clubId} onReplayOnboarding={replayOnboarding} faq={CLUB_FAQ} accentColor={couleurPrincipale} />
      <nav style={st.navbar}>
        <span style={st.logo}>⬡ DIGITAL FOOTBALL — Club</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '1rem', flexShrink: 0 }}>
          {!isMobile && <span style={{ fontSize: '13px', color: colors.text.dim }}>{club?.club || club?.prenom}</span>}
          {!isMobile && (
            <div style={{ display: 'flex', gap: '4px' }}>
              {LANGS.map(l => (
                <button key={l.code} onClick={() => setLang(l.code)}
                  style={{ background: lang === l.code ? couleurPrincipale + '20' : 'transparent', border: `1px solid ${lang === l.code ? couleurPrincipale : colors.border.default}`, borderRadius: '6px', padding: '3px 6px', cursor: 'pointer', fontSize: '12px' }}>
                  {l.flag}
                </button>
              ))}
            </div>
          )}
          {autreRole === 'educateur' && (
            <button onClick={() => navigate('/educateur')}
              style={{ padding: isMobile ? '6px 10px' : '6px 16px', background: colors.background.raised, border: `1px solid ${couleurPrincipale}`, borderRadius: '8px', color: couleurPrincipale, cursor: 'pointer', fontSize: isMobile ? '11px' : '13px', fontWeight: 700 }}>
              {isMobile ? '🎓' : `🎓 ${t('club_vue_educateur', lang)}`}
            </button>
          )}
          {autreRole === 'joueur' && (
            <button onClick={() => navigate('/dashboard-joueur')}
              style={{ padding: isMobile ? '6px 10px' : '6px 16px', background: colors.background.raised, border: `1px solid ${couleurPrincipale}`, borderRadius: '8px', color: couleurPrincipale, cursor: 'pointer', fontSize: isMobile ? '11px' : '13px', fontWeight: 700 }}>
              {isMobile ? '⚽' : `⚽ ${t('club_vue_joueur', lang)}`}
            </button>
          )}
          <button style={{ ...st.btnSecondary, fontSize: isMobile ? '11px' : '13px', padding: isMobile ? '6px 10px' : '8px 14px' }} onClick={handleLogout}>
            {isMobile ? '⏏️' : t('btn_deconnexion', lang)}
          </button>
        </div>
      </nav>

      <div style={st.content}>
        {/* ── Hero banner — couleurs/photo de fond/slogan personnalisables (Personnaliser) ── */}
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '16px', marginBottom: '1.5rem' }}>
          {club?.image_fond_url && (
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${club.image_fond_url})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.35)' }} />
          )}
          <div style={{
            position: 'absolute', inset: 0,
            background: club?.image_fond_url
              ? `linear-gradient(135deg, ${couleurPrincipale}33 0%, ${couleurSecondaire}22 100%)`
              : `linear-gradient(135deg, ${couleurPrincipale}22 0%, #111 70%)`,
          }} />
          <div style={{ position: 'relative', padding: isMobile ? '16px' : '20px 24px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {club?.image_hero_url
                ? <img src={club.image_hero_url} alt="" style={{ width: '96px', height: '96px', borderRadius: '18px', objectFit: 'cover', border: `2px solid ${couleurPrincipale}66`, boxShadow: `0 0 20px ${couleurPrincipale}33` }} />
                : club?.avatar_url
                  ? <img src={club.avatar_url} alt="" style={{ width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${couleurPrincipale}40` }} />
                  : <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: '#1a2e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 800, color: couleurPrincipale }}>
                      {clubInitiales}
                    </div>
              }
              {!club?.image_hero_url && (
                <label style={{ position: 'absolute', bottom: 0, right: 0, width: '28px', height: '28px', background: couleurPrincipale, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: avatarClubUploading ? 'wait' : 'pointer', border: '2px solid #0a0a0a', fontSize: '13px' }}>
                  {avatarClubUploading ? '…' : '✎'}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarClubUpload} disabled={avatarClubUploading} />
                </label>
              )}
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: colors.text.primary }}>{club?.club || t('club_mon_club', lang)}</h1>
                {monRole === 'president' && (
                  <button onClick={() => setShowThemeEditor(v => !v)}
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '8px', color: '#ccc', padding: '4px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    {showThemeEditor ? 'Fermer' : 'Personnaliser'}
                  </button>
                )}
              </div>
              {club?.slogan && <p style={{ margin: '4px 0 0', color: couleurPrincipale, fontSize: '13px', fontStyle: 'italic', fontWeight: 500 }}>« {club.slogan} »</p>}
              <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: '13px' }}>{categories.length} {categories.length !== 1 ? t('club_categorie_plur', lang) : t('club_categorie_sing', lang)} · {educateursAcceptes.length} {educateursAcceptes.length !== 1 ? t('club_educateur_affilie_plur', lang) : t('club_educateur_affilie_sing', lang)}</p>
            </div>
          </div>
        </div>

        {showThemeEditor && monRole === 'president' && (
          <ThemeEditor
            club={club} themeEdit={themeEdit} setThemeEdit={setThemeEdit}
            sauvegarderTheme={sauvegarderTheme} uploaderImageTheme={uploaderImageTheme}
            savingTheme={savingTheme} themeUploading={themeUploading}
            isMobile={isMobile} onClose={() => setShowThemeEditor(false)}
          />
        )}

        {!isMobile ? (
          <>
            {/* Niveau 1 — SPORTIF / ADMINISTRATIF (filtré par rôle) */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', paddingBottom: '2px' }}>
              {categoriesVisibles.map(cat => (
                <button
                  key={cat.id}
                  id={`cat-${cat.id}`}
                  onClick={() => { setActiveCategorie(cat.id); setActiveTab(cat.defaultTab) }}
                  style={{
                    padding: '12px 28px', borderRadius: '10px', border: 'none',
                    background: activeCategorie === cat.id ? couleurPrincipale : colors.background.raised,
                    color: activeCategorie === cat.id ? colors.black : colors.text.dim,
                    fontWeight: 800, fontSize: '13px', cursor: 'pointer', letterSpacing: '1px',
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Niveau 2 — sous-onglets (pas de sous-onglets sur l'accueil) */}
            {activeCategorie !== 'accueil' && (
              <div style={st.tabs}>
                {sousOnglets.map(tab => (
                  <button key={tab.id} style={st.tab(activeTab === tab.id)} onClick={() => setActiveTab(tab.id)}>
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Mobile : bouton hamburger + fil d'ariane (catégorie › sous-onglet actifs) */}
            <button onClick={() => setSidebarOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', background: colors.background.surface, border: '1px solid #222', borderRadius: '10px', padding: '12px 14px', marginBottom: '1.5rem', color: colors.text.primary, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              <span style={{ fontSize: '18px', lineHeight: 1 }}>☰</span>
              <span style={{ fontSize: '13px', fontWeight: 700, flex: 1, textAlign: 'left' }}>
                {categoriesVisibles.find(c => c.id === activeCategorie)?.label}
                {activeCategorie !== 'accueil' && sousOnglets.find(t => t.id === activeTab) && (
                  <span style={{ color: colors.text.faint, fontWeight: 400 }}> › {sousOnglets.find(t => t.id === activeTab)?.label}</span>
                )}
              </span>
            </button>

            {/* Overlay + drawer */}
            {sidebarOpen && (
              <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 90 }} />
            )}
            <div style={{
              position: 'fixed', top: 0, left: sidebarOpen ? 0 : '-85%', width: '85%', maxWidth: '320px', height: '100%',
              background: colors.background.sunken, borderRight: '1px solid #1a1a1a', zIndex: 100, transition: 'left 0.25s ease',
              overflowY: 'auto', padding: '1.25rem 1rem', paddingTop: 'calc(1.25rem + env(safe-area-inset-top, 0px))',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <span style={{ fontWeight: 800, fontSize: '14px', color: colors.accent.green }}>⬡ Menu</span>
                <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '20px', cursor: 'pointer' }}>✕</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1.25rem' }}>
                {categoriesVisibles.map(cat => (
                  <button key={cat.id}
                    id={`cat-${cat.id}`}
                    onClick={() => {
                      setActiveCategorie(cat.id)
                      setActiveTab(cat.defaultTab)
                      if (cat.id === 'accueil') setSidebarOpen(false)
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '10px', border: 'none',
                      background: activeCategorie === cat.id ? couleurPrincipale + '15' : 'transparent',
                      color: activeCategorie === cat.id ? couleurPrincipale : colors.text.secondary,
                      fontWeight: 800, fontSize: '13px', cursor: 'pointer', letterSpacing: '0.5px', fontFamily: 'Inter, sans-serif',
                    }}>
                    {cat.label}
                  </button>
                ))}
              </div>

              {activeCategorie !== 'accueil' && sousOnglets.length > 0 && (
                <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {sousOnglets.map(tab => (
                    <button key={tab.id}
                      onClick={() => { setActiveTab(tab.id); setSidebarOpen(false) }}
                      style={{
                        display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '10px', border: 'none',
                        background: activeTab === tab.id ? colors.accent.blue + alpha.subtle : 'transparent',
                        color: activeTab === tab.id ? colors.accent.blue : colors.text.muted,
                        fontWeight: activeTab === tab.id ? 700 : 400, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                      }}>
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── ACCUEIL ── */}
        {activeTab === 'accueil' && (
          <AccueilClub
            clubId={clubId}
            categories={categories}
            educateursAcceptes={educateursAcceptes}
            educateursEnAttente={educateursEnAttente}
            joueursClub={joueursClub}
            matchsClub={matchsClub}
            evenementsClub={evenementsClub}
            setActiveCategorie={setActiveCategorie}
            setActiveTab={setActiveTab}
            lang={lang}
            isMobile={isMobile}
            couleurPrincipale={couleurPrincipale}
          />
        )}

        {/* ── CATÉGORIES ── */}
        {activeTab === 'categories' && canViewSection('sportif') && (
          <>
            {canEditSection('sportif') && (
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'flex-end', gap: '10px', marginBottom: '1rem' }}>
              <button style={{ ...st.btnSecondary, width: isMobile ? '100%' : 'auto' }} onClick={autoAssignerJoueurs} disabled={autoAssignLoading}>
                {autoAssignLoading ? `⏳ ${t('club_assignation_cours', lang)}` : `⚡ ${t('club_auto_assigner', lang)}`}
              </button>
              <button style={{ ...st.btnSolid, width: isMobile ? '100%' : 'auto' }} onClick={() => setShowAddCategorie(true)}>{t('club_ajouter_categorie', lang)}</button>
            </div>
            )}

            {autoAssignResult && (
              <div style={{ background: couleurPrincipale + '10', border: `1px solid ${couleurPrincipale}30`, borderRadius: '10px', padding: '10px 16px', marginBottom: '1rem', color: couleurPrincipale, fontSize: '13px' }}>
                ✅ {autoAssignResult.count} {t('club_joueur_assigne_auto', lang)}
              </div>
            )}

            {showAddCategorie && (
              <div style={{ ...st.card, border: `1px solid ${couleurPrincipale}30`, marginBottom: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 2fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={st.label}>{t('equipe_categorie', lang)}</label>
                    <select style={st.input} value={newCategorie.nom} onChange={e => setNewCategorie(p => ({ ...p, nom: e.target.value }))}>
                      {CATEGORIES_STANDARD.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={st.label}>{t('club_equipe_label', lang)}</label>
                    <select style={st.input} value={newCategorie.equipe} onChange={e => setNewCategorie(p => ({ ...p, equipe: e.target.value }))}>
                      {EQUIPES.map(e => <option key={e}>{e}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={st.label}>{t('club_educateur_responsable', lang)}</label>
                    <select style={st.input} value={newCategorie.educateur_id} onChange={e => setNewCategorie(p => ({ ...p, educateur_id: e.target.value }))}>
                      <option value="">{t('club_aucun_educateur_instant', lang)}</option>
                      {educateursAcceptes.map(e => (
                        <option key={e.educateur_id} value={e.educateur_id}>{e.educateur?.prenom} {e.educateur?.nom}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={st.btnSolid} onClick={ajouterCategorie} disabled={savingCategorie}>{savingCategorie ? t('jp_ajout_cours', lang) : t('btn_ajouter', lang)}</button>
                  <button style={st.btnSecondary} onClick={() => setShowAddCategorie(false)}>{t('btn_annuler', lang)}</button>
                </div>
              </div>
            )}

            {categories.length === 0 ? (
              <div style={{ ...st.card, textAlign: 'center', padding: '3rem', color: colors.text.faint }}>
                {t('club_aucune_categorie', lang)}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                {CATEGORIES_STANDARD.map(nom => {
                  const cats = categories.filter(c => c.nom === nom)
                  if (!cats.length) return null
                  return (
                    <div key={nom} style={st.card}>
                      <p style={{ margin: '0 0 10px', fontWeight: 800, color: couleurPrincipale, fontSize: '14px' }}>{nom}</p>
                      {cats.map(c => (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: colors.background.raised, borderRadius: '8px', padding: '10px 12px', marginBottom: '6px' }}>
                          <div>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{t('club_equipe_label', lang)} {c.equipe}</p>
                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.dim }}>
                              {c.educateur ? `${c.educateur.prenom} ${c.educateur.nom}` : t('club_pas_educateur_assigne', lang)}
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => { setEffectifModal(c.id); chargerClassements() }} style={{ background: colors.accent.blue + alpha.subtle, border: '1px solid #60a5fa40', color: colors.accent.blue, padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>👥 {t('club_effectif', lang)}</button>
                            {canEditSection('sportif') && (
                              <button onClick={() => supprimerCategorie(c.id)} style={{ background: 'none', border: 'none', color: colors.text.disabled, cursor: 'pointer' }}>✕</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── PLANNING DES TERRAINS ── */}
        {activeTab === 'terrains' && canViewSection('terrains') && (
          <PlanningTerrains clubId={clubId} mode="dirigeant" readOnly={!canEditSection('terrains')} accentColor={couleurPrincipale} />
        )}

        {/* ── ÉDUCATEURS ── */}
        {activeTab === 'educateurs' && canViewSection('sportif') && (
          <>
            {/* Code club */}
            <div style={{ ...st.card, border: `1px solid ${couleurPrincipale}30`, marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '14px' }}>🔑 {t('club_ton_code', lang)}</p>
                <p style={{ margin: 0, fontSize: '12px', color: colors.text.dim }}>{t('club_partage_code_desc', lang)}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: couleurPrincipale + '15', border: `1px solid ${couleurPrincipale}40`, color: couleurPrincipale, fontWeight: 800, fontSize: '18px', padding: '8px 18px', borderRadius: '10px', letterSpacing: '3px', fontFamily: 'monospace' }}>{codeClub}</span>
                <button onClick={copierCode} style={st.btnSecondary}>📋 {t('club_copier', lang)}</button>
              </div>
            </div>

            {/* Recherche & invitation */}
            <div style={{ ...st.card, marginBottom: '1.5rem' }}>
              <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '14px' }}>🔍 {t('club_inviter_educateur_titre', lang)}</p>
              <input
                style={st.input}
                placeholder={t('club_rechercher_educateur_placeholder', lang)}
                value={searchEducateur}
                onChange={e => rechercherEducateurs(e.target.value)}
              />
              {resultatsEducateurs.length > 0 && (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {resultatsEducateurs.map(e => {
                    const dejaInvite = educateursAffilies.some(a => a.educateur_id === e.id)
                    return (
                      <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: colors.background.raised, borderRadius: '8px', padding: '10px 14px' }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>{e.prenom} {e.nom}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.dim }}>{e.club || e.email}</p>
                        </div>
                        <button
                          onClick={() => inviterEducateur(e.id)}
                          disabled={dejaInvite || invitingId === e.id}
                          style={{ ...st.btnSolid, opacity: dejaInvite ? 0.4 : 1, fontSize: '12px', padding: '6px 14px' }}>
                          {dejaInvite ? t('club_deja_invite', lang) : invitingId === e.id ? '...' : t('club_inviter', lang)}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Ajout manuel + invitation email — pour un éducateur sans compte existant */}
            <div style={{ ...st.card, marginBottom: '1.5rem' }}>
              <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '14px' }}>✉️ Ajouter un éducateur manuellement</p>
              <p style={{ margin: '0 0 12px', fontSize: '12px', color: colors.text.dim }}>S'il n'a pas encore de compte, il reçoit une invitation par email pour en créer un.</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <input style={{ ...st.input, flex: '1 1 140px' }} placeholder="Prénom" value={ajoutEducateurForm.prenom} onChange={e => setAjoutEducateurForm(f => ({ ...f, prenom: e.target.value }))} />
                <input style={{ ...st.input, flex: '1 1 140px' }} placeholder="Nom" value={ajoutEducateurForm.nom} onChange={e => setAjoutEducateurForm(f => ({ ...f, nom: e.target.value }))} />
                <input style={{ ...st.input, flex: '2 1 220px' }} type="email" placeholder="Email" value={ajoutEducateurForm.email} onChange={e => setAjoutEducateurForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <button onClick={ajouterEducateurManuel} disabled={invitingEducateur || !ajoutEducateurForm.prenom.trim() || !ajoutEducateurForm.nom.trim() || !ajoutEducateurForm.email.trim()} style={{ ...st.btnSolid, opacity: (invitingEducateur || !ajoutEducateurForm.prenom.trim() || !ajoutEducateurForm.nom.trim() || !ajoutEducateurForm.email.trim()) ? 0.5 : 1 }}>
                {invitingEducateur ? '...' : '✉️ Envoyer l\'invitation'}
              </button>
              {inviteEducateurMessage && (
                <p style={{ margin: '10px 0 0', fontSize: '12px', color: inviteEducateurMessage.type === 'ok' ? colors.accent.green : colors.accent.red }}>{inviteEducateurMessage.texte}</p>
              )}
              {invitationsEducateurEnvoyees.length > 0 && (
                <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Invitations envoyées, en attente ({invitationsEducateurEnvoyees.length})</p>
                  {invitationsEducateurEnvoyees.map(inv => (
                    <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: colors.background.raised, borderRadius: '8px', padding: '8px 12px' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>{inv.prenom} {inv.nom}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.dim }}>{inv.email}</p>
                      </div>
                      <span style={{ fontSize: '11px', color: colors.accent.amber, fontWeight: 600 }}>⏳ En attente</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* En attente */}
            {educateursEnAttente.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '13px', color: '#f59e0b' }}>⏳ {t('club_en_attente_validation', lang)} ({educateursEnAttente.length})</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {educateursEnAttente.map(e => (
                    <div key={e.id} style={{ ...st.card, borderColor: '#f59e0b30', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>{e.educateur?.prenom} {e.educateur?.nom}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.dim }}>{t('club_methode_label', lang)} {e.methode === 'code' ? t('club_methode_code', lang) : t('club_methode_invite', lang)}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
                        <button onClick={() => accepterEducateur(e.id)} style={{ ...st.btnSolid, flex: isMobile ? 1 : 'none' }}>✅ {t('club_accepter', lang)}</button>
                        <button onClick={() => retirerEducateur(e.id)} style={{ ...st.btnSecondary, color: colors.accent.red, borderColor: colors.accent.red + alpha.medium, flex: isMobile ? 1 : 'none' }}>{t('club_refuser', lang)}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Affiliés */}
            <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '13px', color: couleurPrincipale }}>✅ {t('club_educateurs_affilies_titre', lang)} ({educateursAcceptes.length})</p>
            {educateursAcceptes.length === 0 ? (
              <p style={{ color: colors.text.disabled, fontSize: '13px' }}>{t('club_aucun_educateur_affilie', lang)}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {educateursAcceptes.map(e => (
                  <div key={e.id} style={{ ...st.card, display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1a2e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: couleurPrincipale, fontWeight: 700, fontSize: '12px', flexShrink: 0 }}>
                        {e.educateur?.prenom?.[0]}{e.educateur?.nom?.[0]}
                      </div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>{e.educateur?.prenom} {e.educateur?.nom}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
                      <button onClick={() => ouvrirNotationEducateur(e)} style={{ background: colors.accent.amber + alpha.subtle, border: '1px solid #fbbf2440', color: colors.accent.amber, padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', flex: isMobile ? 1 : 'none' }}>⭐ {t('club_noter', lang)}</button>
                      <button onClick={() => retirerEducateur(e.id)} style={{ ...st.btnSecondary, color: colors.accent.red, borderColor: colors.accent.red + alpha.medium, flex: isMobile ? 1 : 'none' }}>{t('club_retirer', lang)}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Séances reçues pour évaluation ── */}
            <div style={{ marginTop: '2rem' }}>
              <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '13px', color: colors.accent.blue }}>🎥 {t('club_seances_recues_titre', lang)} ({seancesRecues.length})</p>
              {seancesRecues.length === 0 ? (
                <p style={{ color: colors.text.disabled, fontSize: '13px' }}>{t('club_aucune_seance_uploadee', lang)}</p>
              ) : (() => {
                const parSaison = seancesRecues.reduce((acc, s) => {
                  const k = s.saison || 'Non définie'
                  if (!acc[k]) acc[k] = []
                  acc[k].push(s)
                  return acc
                }, {})
                const saisonsTriees = Object.keys(parSaison).sort().reverse()

                return saisonsTriees.map(saison => {
                  const ouverte = saisonsOuvertes[saison] !== false
                  return (
                    <div key={saison} style={{ marginBottom: '12px' }}>
                      <button
                        onClick={() => toggleSaison(saison)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center',
                          gap: '10px', padding: '10px 16px', background: colors.background.raised,
                          border: '1px solid #2a2a2a', borderRadius: '10px',
                          color: couleurPrincipale, fontWeight: 700, fontSize: '14px',
                          cursor: 'pointer', textAlign: 'left',
                        }}>
                        <span>{ouverte ? '📂' : '📁'}</span>
                        <span>{t('profil_saison', lang)} {saison}</span>
                        <span style={{ marginLeft: 'auto', color: colors.text.dim, fontSize: '12px' }}>
                          {parSaison[saison].length} {parSaison[saison].length > 1 ? t('stats_seances_plural', lang) : t('stats_seance_singular', lang)}
                        </span>
                        <span style={{ color: colors.text.disabled }}>{ouverte ? '▼' : '▶'}</span>
                      </button>

                      {ouverte && parSaison[saison].map(s => {
                        const eval_ = Array.isArray(s.evaluation) ? s.evaluation[0] : s.evaluation
                        return (
                          <div key={s.id} style={{ ...st.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginTop: '6px', marginLeft: '16px' }}>
                            <div>
                              <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{s.educateur?.prenom} {s.educateur?.nom} — {s.theme || t('seance_fallback', lang)}</p>
                              <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.faint }}>{s.date_seance ? new Date(s.date_seance).toLocaleDateString(localeOf(lang)) : ''}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
                              <a href={s.video_url} target="_blank" rel="noreferrer" style={{ ...st.btnSecondary, textDecoration: 'none' }}>🎬 {t('btn_voir', lang)}</a>
                              {s.statut === 'a_analyser' && (
                                <>
                                  <button onClick={() => ouvrirGrilleEvaluation(s)} style={st.btnSolid}>📋 {t('club_analyser', lang)}</button>
                                  <button onClick={() => transfererAuCoach(s.id)} style={{ background: colors.accent.blue + alpha.subtle, border: '1px solid #60a5fa40', color: colors.accent.blue, padding: '9px 14px', borderRadius: '8px', fontSize: isMobile ? '12px' : '13px', fontWeight: 700, cursor: 'pointer' }}>{isMobile ? `🎙️ ${t('club_coach_mobile', lang)}` : `🎙️ ${t('club_transferer_coach', lang)}`}</button>
                                </>
                              )}
                              {s.statut === 'transfere_coach' && <span style={{ background: colors.accent.blue + alpha.subtle, color: colors.accent.blue, fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px' }}>🎙️ {t('club_chez_coach', lang)}</span>}
                              {s.statut === 'analyse' && eval_ && (
                                <span style={{ background: couleurPrincipale + '15', color: couleurPrincipale, fontSize: '13px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px' }}>✅ {Math.round(eval_.note_totale)}/100</span>
                              )}
                              <button onClick={() => supprimerSeance(s.id)} style={{ background: 'none', border: 'none', color: colors.text.disabled, cursor: 'pointer' }}>✕</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })
              })()}
            </div>
          </>
        )}

        {activeTab === 'classements' && canViewSection('sportif') && (() => {
          const TRIS = [
            { key: 'buts', label: t('stats_graph_buteurs', lang), color: colors.accent.green },
            { key: 'passes', label: t('stats_filtre_passeurs', lang), color: colors.accent.blue },
            { key: 'matchsJoues', label: t('stats_graph_matchs', lang), color: colors.accent.purpleLight },
            { key: 'tauxPresence', label: t('stats_filtre_presence', lang), color: '#34d399', unit: '%' },
            { key: 'pointsSeance', label: t('club_points_seance', lang), color: colors.accent.amber },
            { key: 'noteGlobale', label: t('club_note_educateur', lang), color: '#f59e0b', unit: '/5' },
          ]
          const catData = categorieActive ? statsParCategorie[categorieActive] : null
          const triActif = TRIS.find(t => t.key === triClassement) || TRIS[0]
          const sorted = catData ? [...catData.joueurs].sort((a, b) => (b.stats[triClassement] || 0) - (a.stats[triClassement] || 0)) : []

          if (categories.length === 0) {
            return <div style={{ ...st.card, textAlign: 'center', padding: '3rem', color: colors.text.faint }}>{t('club_creer_categories_dabord', lang)}</div>
          }
          if (loadingClassements) {
            return <p style={{ color: couleurPrincipale, textAlign: 'center', padding: '2rem' }}>{t('club_chargement_classements', lang)}</p>
          }

          return (
            <div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                {categories.map(c => (
                  <button key={c.id} onClick={() => setCategorieActive(c.id)} style={st.tab(categorieActive === c.id)}>
                    {c.nom} — {c.equipe}
                  </button>
                ))}
              </div>

              {/* ── Résultats & classement officiel ── */}
              {(() => {
                const matchsCat = clubMatchs[categorieActive] || []
                const derniersMatchs = matchsCat.slice(0, 5)
                const matchsAvecScore = matchsCat.filter(m => m.score_nous !== '' && m.score_nous !== null && m.score_eux !== '' && m.score_eux !== null)
                const nbMatchsJoues = matchsAvecScore.length
                let victoires = 0, nuls = 0, defaites = 0, cleanSheets = 0
                matchsAvecScore.forEach(m => {
                  const nous = parseInt(m.score_nous) || 0
                  const eux = parseInt(m.score_eux) || 0
                  if (nous > eux) victoires++
                  else if (nous < eux) defaites++
                  else nuls++
                  if (eux === 0) cleanSheets++
                })
                const tauxV = nbMatchsJoues ? Math.round(victoires / nbMatchsJoues * 100) : 0
                const tauxN = nbMatchsJoues ? Math.round(nuls / nbMatchsJoues * 100) : 0
                const tauxD = nbMatchsJoues ? Math.round(defaites / nbMatchsJoues * 100) : 0
                const tauxCS = nbMatchsJoues ? Math.round(cleanSheets / nbMatchsJoues * 100) : 0

                const joueursCat = catData?.joueurs || []
                const totalPresencesEffectif = joueursCat.reduce((s, j) => s + j.stats.presenceEffectifTotal, 0)
                const presentsEffectif = joueursCat.reduce((s, j) => s + j.stats.presenceEffectifPresents, 0)
                const tauxPresenceEffectif = totalPresencesEffectif ? Math.round(presentsEffectif / totalPresencesEffectif * 100) : 0
                const tauxAbsenceEffectif = totalPresencesEffectif ? 100 - tauxPresenceEffectif : 0

                return (
                  <div style={{ marginBottom: '2rem' }}>
                    {nbMatchsJoues > 0 && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '10px', marginBottom: '10px' }}>
                          <StatCard label={t('jp_matchs_joues', lang)} valeur={nbMatchsJoues} />
                          <StatCard label={t('club_taux_victoire', lang)} valeur={`${tauxV}%`} couleur="green" />
                          <StatCard label={t('club_taux_nul', lang)} valeur={`${tauxN}%`} couleur="orange" />
                          <StatCard label={t('club_taux_defaite', lang)} valeur={`${tauxD}%`} couleur="red" />
                        </div>
                        <StatCard label={t('jp_clean_sheets', lang)} valeur={`${tauxCS}%`} />
                      </div>
                    )}
                    {nbMatchsJoues > 0 && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <p style={{ fontSize: '13px', fontWeight: 700, color: couleurPrincipale, marginBottom: '10px' }}>📊 Stats détaillées</p>
                        <StatsEquipe matchs={matchsCat} masquerVND />
                      </div>
                    )}
                    {totalPresencesEffectif > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '10px', marginBottom: '1.5rem' }}>
                        <StatCard label={t('club_taux_presence_effectif', lang)} valeur={`${tauxPresenceEffectif}%`} couleur="green" />
                        <StatCard label={t('club_taux_absence_effectif', lang)} valeur={`${tauxAbsenceEffectif}%`} couleur="red" />
                      </div>
                    )}
                    <p style={{ fontSize: '13px', fontWeight: 700, color: couleurPrincipale, marginBottom: '10px' }}>🏆 {t('club_classement_officiel', lang)}</p>
                    {ligueUrls[categorieActive] ? (
                      <a href={ligueUrls[categorieActive]} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: couleurPrincipale + '15', border: `1px solid ${couleurPrincipale}40`, color: couleurPrincipale, padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, textDecoration: 'none', marginBottom: '1.5rem' }}>
                        🏆 {t('club_voir_classement_ligue', lang)}
                      </a>
                    ) : (
                      <p style={{ color: colors.text.disabled, fontSize: '13px', marginBottom: '1.5rem' }}>{t('club_lien_classement_manquant', lang)}</p>
                    )}

                    {derniersMatchs.length > 0 && (
                      <>
                        <p style={{ fontSize: '13px', fontWeight: 700, color: colors.accent.blue, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}><IcoTrophy /> {t('club_derniers_resultats', lang)}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1.5rem' }}>
                          {derniersMatchs.map(m => {
                            const aScore = m.score_nous !== '' && m.score_nous !== null
                            const nous = parseInt(m.score_nous)
                            const eux = parseInt(m.score_eux)
                            const resultat = aScore ? (nous > eux ? 'V' : nous < eux ? 'D' : 'N') : null
                            const couleur = resultat === 'V' ? colors.accent.green : resultat === 'D' ? colors.accent.red : '#f59e0b'
                            return (
                              <div key={m.id} style={{ ...st.card, display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px' }}>
                                {resultat && <span style={{ background: couleur + '20', color: couleur, fontWeight: 800, fontSize: '11px', padding: '3px 10px', borderRadius: '20px' }}>{resultat}</span>}
                                <div style={{ flex: 1 }}>
                                  <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{m.domicile ? 'vs' : '@'} {m.adversaire}</p>
                                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.faint }}>{new Date(m.date).toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'short' })}{m.competition ? ` · ${m.competition}` : ''}</p>
                                </div>
                                {aScore && <span style={{ fontWeight: 800, fontSize: '14px', color: couleur }}>{m.score_nous} - {m.score_eux}</span>}
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )
              })()}

              {!catData || catData.joueurs.length === 0 ? (
                <div style={{ ...st.card, textAlign: 'center', padding: '3rem', color: colors.text.faint }}>
                  {t('club_aucun_joueur_categorie', lang)}<br />
                  <span style={{ fontSize: '12px', color: colors.text.disabled }}>{t('club_educateur_doit_lier', lang)}</span>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                    {TRIS.map(t => (
                      <button key={t.key} onClick={() => setTriClassement(t.key)}
                        style={{ background: triClassement === t.key ? t.color + '20' : colors.background.surface, border: `1px solid ${triClassement === t.key ? t.color + '60' : '#222'}`, color: triClassement === t.key ? t.color : colors.text.faint, padding: '7px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div style={{ ...st.card, overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'center', color: colors.text.disabled, fontSize: '11px', width: '40px' }}>#</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', color: colors.text.disabled, fontSize: '11px' }}>{t('equipe_col_joueur', lang)}</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', color: colors.text.disabled, fontSize: '11px' }}>{t('equipe_poste', lang)}</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', color: triActif.color, fontSize: '11px' }}>{triActif.label}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((j, i) => {
                          const val = j.stats[triClassement]
                          return (
                            <tr key={j.id} style={{ borderBottom: '1px solid #141414' }}>
                              <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: i < 3 ? triActif.color : colors.text.disabled }}>{i + 1}</td>
                              <td style={{ padding: '10px 12px', fontWeight: 700 }}>{j.prenom} {j.nom}</td>
                              <td style={{ padding: '10px 12px', color: colors.text.dim }}>{j.poste || '—'}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: triActif.color }}>
                                {val !== null && val !== undefined ? (typeof val === 'number' && !Number.isInteger(val) ? val.toFixed(1) : val) : '—'}{triActif.unit === '%' ? '%' : ''}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )
        })()}
        {activeTab === 'sponsors' && canViewSection('sponsors') && (
          <GestionSponsors clubId={clubId} saison={saisonActuelle} readOnly={!canEditSection('sponsors')} accentColor={couleurPrincipale} />
        )}
        {activeTab === 'deplacements' && canViewSection('deplacements') && (
          <Deplacements clubId={clubId} readOnly={!canEditSection('deplacements')} accentColor={couleurPrincipale} />
        )}
        {activeTab === 'recrutement' && canViewSection('sportif') && (
          <ScoutCenter userId={clubId} profil={club} embedded={true} />
        )}
        {activeTab === 'profil' && canViewSection('profil') && (() => {
          const moyenne = avisRecus.length ? avisRecus.reduce((s, a) => s + (a.note || 0), 0) / avisRecus.length : null
          return (
            <div style={{ maxWidth: '700px' }}>
              {/* Avatar + infos */}
              <div style={{ ...st.card, display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '1.5rem' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {club?.avatar_url
                    ? <img src={club.avatar_url} alt="" style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${couleurPrincipale}40` }} />
                    : <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#1a2e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 800, color: couleurPrincipale }}>
                        {(profilClubEdit.club || club?.club || '?')[0]}
                      </div>
                  }
                  <label style={{ position: 'absolute', bottom: 0, right: 0, width: '24px', height: '24px', background: couleurPrincipale, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: avatarClubUploading ? 'wait' : 'pointer', border: '2px solid #0a0a0a', fontSize: '11px' }}>
                    {avatarClubUploading ? '…' : '✎'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarClubUpload} disabled={avatarClubUploading} />
                  </label>
                </div>
                <div>
                  <p style={{ fontWeight: 800, fontSize: '18px', margin: '0 0 4px' }}>{profilClubEdit.club || 'Nom du club'}</p>
                  {moyenne !== null ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: colors.accent.amber, fontSize: '16px' }}>{'★'.repeat(Math.round(moyenne))}{'☆'.repeat(5 - Math.round(moyenne))}</span>
                      <span style={{ fontSize: '13px', color: colors.text.dim }}>{moyenne.toFixed(1)} ({avisRecus.length} avis)</span>
                    </div>
                  ) : (
                    <p style={{ fontSize: '13px', color: colors.text.disabled, margin: 0 }}>{t('club_aucun_avis_recu', lang)}</p>
                  )}
                </div>
              </div>

              {/* Formulaire */}
              <div style={{ ...st.card, marginBottom: '1.5rem' }}>
                <p style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '14px' }}>📋 {t('club_infos_club', lang)}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={st.label}>{t('club_nom_club', lang)}</label>
                    <input style={st.input} value={profilClubEdit.club} onChange={e => setProfilClubEdit(p => ({ ...p, club: e.target.value }))} placeholder="Ex: AS Cannes" disabled={!canEditSection('profil')} />
                  </div>
                  <div>
                    <label style={st.label}>{t('profil_region', lang)}</label>
                    <input style={st.input} value={profilClubEdit.region} onChange={e => setProfilClubEdit(p => ({ ...p, region: e.target.value }))} placeholder="Ex: Provence-Alpes-Côte d'Azur" disabled={!canEditSection('profil')} />
                  </div>
                  <div>
                    <label style={st.label}>Ville (siège du club)</label>
                    <input style={st.input} value={profilClubEdit.ville} onChange={e => setProfilClubEdit(p => ({ ...p, ville: e.target.value }))} placeholder="Ex: Cannes" disabled={!canEditSection('profil')} />
                    <p style={{ margin: '4px 0 0', fontSize: '11px', color: colors.text.muted }}>Utilisée pour calculer automatiquement les horaires de départ/retour des déplacements en Extérieur.</p>
                  </div>
                  <div>
                    <label style={st.label}>{t('seance_description', lang)}</label>
                    <textarea
                      style={{ ...st.input, minHeight: '100px', resize: 'vertical', fontFamily: 'Inter, sans-serif' }}
                      value={profilClubEdit.description}
                      onChange={e => setProfilClubEdit(p => ({ ...p, description: e.target.value }))}
                      placeholder={t('club_desc_placeholder', lang)}
                      disabled={!canEditSection('profil')}
                    />
                  </div>
                  <div>
                    <label style={st.label}>🏟️ Stades</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {profilClubEdit.stades.map(s => (
                        <div key={s.id} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <input style={{ ...st.input, flex: '1 1 160px' }} value={s.nom} onChange={e => modifierStade(s.id, 'nom', e.target.value)} placeholder="Nom du stade" disabled={!canEditSection('profil')} />
                          <input style={{ ...st.input, flex: '2 1 240px' }} value={s.adresse} onChange={e => modifierStade(s.id, 'adresse', e.target.value)} placeholder="Adresse" disabled={!canEditSection('profil')} />
                          {canEditSection('profil') && (
                            <button type="button" onClick={() => supprimerStade(s.id)} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '16px', cursor: 'pointer', padding: '0 6px' }}>✕</button>
                          )}
                        </div>
                      ))}
                      {profilClubEdit.stades.length === 0 && (
                        <p style={{ margin: 0, fontSize: '12px', color: colors.text.disabled, fontStyle: 'italic' }}>Aucun stade renseigné.</p>
                      )}
                      {canEditSection('profil') && (
                        <button type="button" onClick={ajouterStade} style={{ ...st.btnSecondary, alignSelf: 'flex-start' }}>+ Ajouter un stade</button>
                      )}
                    </div>
                  </div>
                </div>
                {canEditSection('profil') && (
                  <button onClick={sauvegarderProfilClub} disabled={savingProfilClub} style={{ ...st.btnSolid, marginTop: '16px' }}>
                    {savingProfilClub ? t('jp_enregistrement', lang) : `✓ ${t('btn_sauvegarder', lang)}`}
                  </button>
                )}
              </div>

              {/* Abonnement — paliers vérifiés manuellement par le support (nb. licenciés) */}
              <div style={{ ...st.card, marginBottom: '1.5rem' }}>
                <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '14px' }}>💳 {t('club_abonnement_titre', lang)}</p>
                <p style={{ margin: '0 0 14px', fontSize: '12px', color: colors.text.faint, lineHeight: 1.6 }}>{t('club_abonnement_desc', lang)}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                  {Object.values(STRIPE_LINKS_CLUB).map(p => (
                    <div key={p.label} style={{ background: colors.background.surfaceAlt, borderRadius: '10px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: colors.text.secondary }}>{p.label}</span>
                      <span style={{ fontSize: '13px', color: couleurPrincipale, fontWeight: 700 }}>{p.mensuelPrix} · {p.annuelPrix}</span>
                    </div>
                  ))}
                </div>
                <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Activation abonnement club — ' + (profilClubEdit.club || club?.club || ''))}`}
                  style={{ display: 'inline-block', background: couleurPrincipale, color: colors.black, border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
                  {t('club_contacter_support', lang)}
                </a>
              </div>

              {/* Avis reçus */}
              <div style={st.card}>
                <p style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '14px' }}>⭐ {t('club_avis_recus_titre', lang)} ({avisRecus.length})</p>
                {avisRecus.length === 0 ? (
                  <p style={{ color: colors.text.disabled, fontSize: '13px' }}>{t('club_aucun_avis_desc', lang)}</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {avisRecus.map(a => (
                      <div key={a.id} style={{ background: colors.background.raised, borderRadius: '10px', padding: '12px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 600, fontSize: '13px' }}>{a.auteur?.prenom} {a.auteur?.nom}</span>
                          <span style={{ color: colors.accent.amber, fontSize: '13px' }}>{'★'.repeat(a.note)}{'☆'.repeat(5 - a.note)}</span>
                        </div>
                        {a.commentaire && <p style={{ margin: 0, fontSize: '13px', color: colors.text.secondary, fontStyle: 'italic' }}>"{a.commentaire}"</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* ── BUDGET (président + secrétaire) ── */}
        {activeTab === 'budget' && canViewSection('budget') && (() => {
          const maintenant = new Date()
          const entriesFiltrees = budgetEntries.filter(e => {
            if (budgetPeriode === 'tout') return true
            const d = new Date(e.date)
            if (budgetPeriode === 'mois') return d.getMonth() === maintenant.getMonth() && d.getFullYear() === maintenant.getFullYear()
            if (budgetPeriode === 'saison') {
              const saison = maintenant.getMonth() >= 6
                ? { start: new Date(maintenant.getFullYear(), 6, 1), end: new Date(maintenant.getFullYear() + 1, 5, 30) }
                : { start: new Date(maintenant.getFullYear() - 1, 6, 1), end: new Date(maintenant.getFullYear(), 5, 30) }
              return d >= saison.start && d <= saison.end
            }
            return true
          })

          const totalRecettes = entriesFiltrees.filter(e => e.type === 'recette').reduce((s, e) => s + parseFloat(e.montant), 0)
          const totalDepenses = entriesFiltrees.filter(e => e.type === 'depense').reduce((s, e) => s + parseFloat(e.montant), 0)
          const solde = totalRecettes - totalDepenses

          const categoriesDepense = entriesFiltrees
            .filter(e => e.type === 'depense')
            .reduce((acc, e) => { acc[e.categorie] = (acc[e.categorie] || 0) + parseFloat(e.montant); return acc }, {})
          const categoriesDepenseArr = Object.entries(categoriesDepense)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, montant], i) => ({ cat, montant, pct: totalDepenses > 0 ? (montant / totalDepenses) * 100 : 0, color: [colors.accent.red, colors.accent.orange, '#f59e0b', '#fb923c', colors.accent.amber, '#fca5a5', '#fed7aa', '#fde68a', '#fef3c7'][i % 9] }))

          const categoriesRecette = entriesFiltrees
            .filter(e => e.type === 'recette')
            .reduce((acc, e) => { acc[e.categorie] = (acc[e.categorie] || 0) + parseFloat(e.montant); return acc }, {})
          const categoriesRecetteArr = Object.entries(categoriesRecette)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, montant], i) => ({ cat, montant, pct: totalRecettes > 0 ? (montant / totalRecettes) * 100 : 0, color: COULEURS_BUDGET[i % COULEURS_BUDGET.length] }))

          return (
            <div style={{ maxWidth: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>💰 {t('club_budget_titre', lang)}</h2>
                  <p style={{ color: colors.text.faint, fontSize: 13, margin: '4px 0 0' }}>{t('club_budget_desc', lang)}</p>
                </div>
                {canEditSection('budget') && (
                <button onClick={() => setBudgetFormOuvert(v => !v)}
                  style={{ background: couleurPrincipale, color: colors.black, border: 'none', borderRadius: 10, padding: '9px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  {budgetFormOuvert ? `✕ ${t('btn_annuler', lang)}` : `+ ${t('btn_ajouter', lang)}`}
                </button>
                )}
              </div>

              {budgetFormOuvert && canEditSection('budget') && (
                <div style={{ background: colors.background.surface, border: '1px solid #1a1a1a', borderRadius: 16, padding: 20, marginBottom: 20 }}>
                  <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: 14 }}>{t('club_nouvelle_entree', lang)}</p>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    {['depense', 'recette'].map(bt => (
                      <button key={bt} onClick={() => setBudgetForm(f => ({ ...f, type: bt, categorie: '' }))}
                        style={{ padding: '7px 18px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif', background: budgetForm.type === bt ? (bt === 'recette' ? colors.accent.green + alpha.soft : colors.accent.red + alpha.soft) : colors.background.raised, color: budgetForm.type === bt ? (bt === 'recette' ? colors.accent.green : colors.accent.red) : colors.text.faint }}>
                        {bt === 'recette' ? `↑ ${t('club_recette', lang)}` : `↓ ${t('club_depense', lang)}`}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, color: colors.text.faint, fontWeight: 600, display: 'block', marginBottom: 4 }}>{t('equipe_categorie', lang)}</label>
                      <select value={budgetForm.categorie} onChange={e => setBudgetForm(f => ({ ...f, categorie: e.target.value }))}
                        style={{ width: '100%', background: colors.background.base, border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 10px', color: budgetForm.categorie ? colors.text.primary : colors.text.faint, fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none' }}>
                        <option value="">{t('club_choisir_pts', lang)}</option>
                        {(budgetForm.type === 'recette' ? CATEGORIES_RECETTE : CATEGORIES_DEPENSE).map(c => (
                          <option key={c.label} value={c.label}>{c.emoji} {c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: colors.text.faint, fontWeight: 600, display: 'block', marginBottom: 4 }}>{t('club_montant', lang)}</label>
                      <input type="number" min="0" step="0.01" placeholder="0,00" value={budgetForm.montant} onChange={e => setBudgetForm(f => ({ ...f, montant: e.target.value }))}
                        style={{ width: '100%', background: colors.background.base, border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 10px', color: colors.text.primary, fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: colors.text.faint, fontWeight: 600, display: 'block', marginBottom: 4 }}>{t('club_libelle', lang)}</label>
                      <input type="text" placeholder={t('club_description_placeholder', lang)} value={budgetForm.libelle} onChange={e => setBudgetForm(f => ({ ...f, libelle: e.target.value }))}
                        style={{ width: '100%', background: colors.background.base, border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 10px', color: colors.text.primary, fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: colors.text.faint, fontWeight: 600, display: 'block', marginBottom: 4 }}>{t('ent_date', lang)}</label>
                      <input type="date" value={budgetForm.date} onChange={e => setBudgetForm(f => ({ ...f, date: e.target.value }))}
                        style={{ width: '100%', background: colors.background.base, border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 10px', color: colors.text.primary, fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <input type="text" placeholder={t('club_note_optionnel_placeholder', lang)} value={budgetForm.note} onChange={e => setBudgetForm(f => ({ ...f, note: e.target.value }))}
                    style={{ width: '100%', background: colors.background.base, border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 10px', color: colors.text.primary, fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box', marginBottom: 14 }} />
                  <button onClick={ajouterEntreeBudget} disabled={budgetSaving || !budgetForm.libelle.trim() || !budgetForm.montant || !budgetForm.categorie}
                    style={{ background: couleurPrincipale, color: colors.black, border: 'none', borderRadius: 10, padding: '10px 22px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif', opacity: (!budgetForm.libelle.trim() || !budgetForm.montant || !budgetForm.categorie) ? 0.4 : 1 }}>
                    {budgetSaving ? t('jp_enregistrement', lang) : t('club_enregistrer', lang)}
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {[['mois', t('club_ce_mois', lang)], ['saison', t('club_cette_saison', lang)], ['tout', t('club_tout', lang)]].map(([val, label]) => (
                  <button key={val} onClick={() => setBudgetPeriode(val)}
                    style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${budgetPeriode === val ? couleurPrincipale + '40' : colors.background.raised}`, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', background: budgetPeriode === val ? couleurPrincipale + '20' : colors.background.surface, color: budgetPeriode === val ? couleurPrincipale : colors.text.faint }}>
                    {label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
                {[
                  { label: t('club_recettes', lang), val: totalRecettes, color: colors.accent.green, bg: '#4ade8010', sign: '+' },
                  { label: t('club_depenses', lang), val: totalDepenses, color: colors.accent.red, bg: '#ef444410', sign: '−' },
                  { label: t('club_solde', lang), val: Math.abs(solde), color: solde >= 0 ? colors.accent.green : colors.accent.red, bg: solde >= 0 ? '#4ade8010' : '#ef444410', sign: solde >= 0 ? '+' : '−' },
                ].map(({ label, val, color, bg, sign }) => (
                  <div key={label} style={{ background: bg, border: `1px solid ${color}25`, borderRadius: 16, padding: '16px 18px' }}>
                    <p style={{ margin: '0 0 6px', fontSize: 11, color: colors.text.dim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</p>
                    <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color, fontVariantNumeric: 'tabular-nums' }}>
                      {sign}{val.toLocaleString(localeOf(lang), { minimumFractionDigits: 2 })} €
                    </p>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 16 : 20, marginBottom: 20 }}>
                {/* Donut Recettes */}
                <div style={{ flex: isMobile ? 'none' : 1, width: '100%', boxSizing: 'border-box', background: colors.background.surface, border: '1px solid #1a1a1a', borderRadius: 18, padding: isMobile ? '20px 16px' : 24 }}>
                  <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, color: colors.accent.green, textTransform: 'uppercase', letterSpacing: 0.5 }}>↑ {t('club_recettes', lang)}</p>
                  <DonutChart segments={categoriesRecetteArr} total={totalRecettes} label={t('club_recu', lang)} lang={lang} />
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {categoriesRecetteArr.length === 0 && (
                      <p style={{ margin: 0, fontSize: 11, color: colors.border.strong }}>{t('club_aucune_entree', lang)}</p>
                    )}
                    {categoriesRecetteArr.slice(0, 4).map((seg, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: colors.text.secondary }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: seg.color, flexShrink: 0, display: 'inline-block' }} />
                          {seg.cat}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: colors.text.primary }}>{Math.round(seg.pct)}%</span>
                      </div>
                    ))}
                    {categoriesRecetteArr.length > 4 && <p style={{ margin: 0, fontSize: 10, color: colors.border.strong }}>+{categoriesRecetteArr.length - 4} {t('club_autres_suffix', lang)}</p>}
                  </div>
                </div>

                {/* Donut Dépenses */}
                <div style={{ flex: isMobile ? 'none' : 1, width: '100%', boxSizing: 'border-box', background: colors.background.surface, border: '1px solid #1a1a1a', borderRadius: 18, padding: isMobile ? '20px 16px' : 24 }}>
                  <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, color: colors.accent.red, textTransform: 'uppercase', letterSpacing: 0.5 }}>↓ {t('club_depenses', lang)}</p>
                  <DonutChart segments={categoriesDepenseArr} total={totalDepenses} label={t('club_depense_mot', lang)} lang={lang} />
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {categoriesDepenseArr.length === 0 && (
                      <p style={{ margin: 0, fontSize: 11, color: colors.border.strong }}>{t('club_aucune_entree', lang)}</p>
                    )}
                    {categoriesDepenseArr.slice(0, 4).map((seg, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: colors.text.secondary }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: seg.color, flexShrink: 0, display: 'inline-block' }} />
                          {seg.cat}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: colors.text.primary }}>{Math.round(seg.pct)}%</span>
                      </div>
                    ))}
                    {categoriesDepenseArr.length > 4 && <p style={{ margin: 0, fontSize: 10, color: colors.border.strong }}>+{categoriesDepenseArr.length - 4} {t('club_autres_suffix', lang)}</p>}
                  </div>
                </div>

                {/* Donut Global */}
                <div style={{ flex: isMobile ? 'none' : 1, width: '100%', boxSizing: 'border-box', background: colors.background.surface, border: '1px solid #1a1a1a', borderRadius: 18, padding: isMobile ? '20px 16px' : 24 }}>
                  <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, color: colors.text.secondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>⚖️ {t('club_global', lang)}</p>
                  <DonutChart
                    segments={totalRecettes + totalDepenses > 0 ? [
                      { pct: (totalRecettes / (totalRecettes + totalDepenses)) * 100, color: colors.accent.green },
                      { pct: (totalDepenses / (totalRecettes + totalDepenses)) * 100, color: colors.accent.red },
                    ] : []}
                    total={Math.abs(solde)}
                    label={solde >= 0 ? t('club_benefice', lang) : t('club_deficit', lang)}
                    couleurCentrale={solde >= 0 ? colors.accent.green : colors.accent.red}
                    lang={lang}
                  />
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[{ label: t('club_recettes', lang), color: colors.accent.green, val: totalRecettes }, { label: t('club_depenses', lang), color: colors.accent.red, val: totalDepenses }].map(({ label, color, val }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: colors.text.secondary }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                          {label}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color }}>{val.toLocaleString(localeOf(lang), { minimumFractionDigits: 2 })} €</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <p style={{ fontSize: 11, color: colors.text.faint, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>{t('jcoach_historique', lang)}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {entriesFiltrees.length === 0 && (
                  <div style={{ background: colors.background.surface, border: '1px solid #1a1a1a', borderRadius: 12, padding: '28px 20px', textAlign: 'center', color: colors.border.strong, fontSize: 13 }}>
                    {t('club_aucune_entree_periode', lang)}
                  </div>
                )}
                {entriesFiltrees.map(e => {
                  const cats = e.type === 'depense' ? CATEGORIES_DEPENSE : CATEGORIES_RECETTE
                  const meta = cats.find(c => c.label === e.categorie)
                  const categoriesArr = e.type === 'depense' ? categoriesDepenseArr : categoriesRecetteArr
                  const segCat = categoriesArr.find(c => c.cat === e.categorie)
                  const couleur = segCat?.color || colors.text.faint
                  return (
                    <div key={e.id} style={{ background: colors.background.surface, border: '1px solid #1a1a1a', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, background: e.type === 'recette' ? colors.accent.green + alpha.subtle : colors.accent.red + alpha.subtle }}>
                        {meta?.emoji || (e.type === 'recette' ? '↑' : '↓')}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>{e.libelle}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: colors.text.faint }}>
                          <span style={{ color: couleur }}>{e.categorie}</span>
                          {' · '}{new Date(e.date).toLocaleDateString(localeOf(lang), { day: '2-digit', month: 'short', year: 'numeric' })}
                          {e.note ? ` · ${e.note}` : ''}
                        </p>
                      </div>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: 15, flexShrink: 0, color: e.type === 'recette' ? colors.accent.green : colors.accent.red }}>
                        {e.type === 'recette' ? '+' : '−'}{parseFloat(e.montant).toLocaleString(localeOf(lang), { minimumFractionDigits: 2 })} €
                      </p>
                      {canEditSection('budget') && (
                        <button onClick={() => supprimerEntreeBudget(e.id)}
                          style={{ background: 'transparent', border: 'none', color: colors.border.default, cursor: 'pointer', fontSize: 16, padding: '4px 6px', borderRadius: 6, flexShrink: 0, transition: 'color 0.15s' }}
                          onMouseEnter={ev => ev.target.style.color = colors.accent.red}
                          onMouseLeave={ev => ev.target.style.color = colors.border.default}
                          title={t('btn_supprimer', lang)}>✕</button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* ── ÉVÉNEMENTS & PROJETS ── */}
        {activeTab === 'evenements' && canViewSection('evenements') && (() => {
          const aujourdHuiStr = new Date().toISOString().split('T')[0]
          const evenementsAVenir = evenementsClub.filter(ev => ev.date >= aujourdHuiStr).sort((a, b) => a.date.localeCompare(b.date))
          const evenementsParMois = evenementsAVenir.reduce((acc, ev) => {
            const cle = ev.date.slice(0, 7)
            if (!acc[cle]) acc[cle] = []
            acc[cle].push(ev)
            return acc
          }, {})

          const responsablesOptions = [
            { id: clubId, nom: `${club?.club || club?.prenom || 'Le club'} (Président)` },
            ...staffMembers.map(m => ({ id: m.user_id, nom: `${m.membre?.prenom || ''} ${m.membre?.nom || ''}`.trim() })),
          ]

          const projetsParStatut = (statut) => projetsClub.filter(p => p.statut === statut)

          return (
            <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
                {[['evenements', '📅 Événements'], ['projets', '📊 Projets']].map(([val, label]) => (
                  <button key={val} onClick={() => setSousVueEvenements(val)}
                    style={{ padding: '8px 18px', borderRadius: '10px', border: 'none', background: sousVueEvenements === val ? couleurPrincipale : colors.background.raised, color: sousVueEvenements === val ? colors.black : colors.text.muted, fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* ═══ ÉVÉNEMENTS ═══ */}
              {sousVueEvenements === 'evenements' && (
                <div>
                  {canEditSection('evenements') && (
                    <button onClick={showEvenementForm ? () => setShowEvenementForm(false) : ouvrirNouvelEvenement}
                      style={{ ...st.btnSolid, marginBottom: '1.25rem' }}>
                      {showEvenementForm ? `✕ ${t('btn_annuler', lang)}` : '+ Événement'}
                    </button>
                  )}

                  {showEvenementForm && canEditSection('evenements') && (
                    <div style={{ ...st.card, marginBottom: '1.5rem' }}>
                      <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 14px' }}>{editingEvenementId ? "Modifier l'événement" : 'Nouvel événement'}</p>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        <div>
                          <label style={st.label}>Titre</label>
                          <input style={st.input} value={evenementForm.titre} onChange={e => setEvenementForm(f => ({ ...f, titre: e.target.value }))} placeholder="Ex: Tournoi U13" />
                        </div>
                        <div>
                          <label style={st.label}>Date</label>
                          <input style={st.input} type="date" value={evenementForm.date} onChange={e => setEvenementForm(f => ({ ...f, date: e.target.value }))} />
                        </div>
                        <div>
                          <label style={st.label}>Heure</label>
                          <input style={st.input} type="time" value={evenementForm.heure} onChange={e => setEvenementForm(f => ({ ...f, heure: e.target.value }))} />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        <div>
                          <label style={st.label}>Lieu</label>
                          <input style={st.input} value={evenementForm.lieu} onChange={e => setEvenementForm(f => ({ ...f, lieu: e.target.value }))} placeholder="Ex: Stade municipal" />
                        </div>
                        <div>
                          <label style={st.label}>Type</label>
                          <select style={st.input} value={evenementForm.type} onChange={e => setEvenementForm(f => ({ ...f, type: e.target.value }))}>
                            {TYPES_EVENEMENT.map(ty => <option key={ty.val} value={ty.val}>{ty.emoji} {ty.label}</option>)}
                          </select>
                        </div>
                      </div>
                      <div style={{ marginBottom: '12px' }}>
                        <label style={st.label}>Description</label>
                        <textarea style={{ ...st.input, minHeight: '70px', resize: 'vertical', fontFamily: 'Inter, sans-serif' }} value={evenementForm.description} onChange={e => setEvenementForm(f => ({ ...f, description: e.target.value }))} />
                      </div>

                      <label style={st.label}>Référents de l'événement</label>
                      <div style={{ marginBottom: '14px' }}>
                        {evenementForm.referents.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                            {evenementForm.referents.map(r => (
                              <span key={r.id} style={{ background: couleurPrincipale + alpha.subtle, border: `1px solid ${couleurPrincipale}40`, color: couleurPrincipale, padding: '5px 12px', borderRadius: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                ⭐ {r.nom}
                                <button type="button" onClick={() => retirerReferent(r.id)} style={{ background: 'none', border: 'none', color: couleurPrincipale, opacity: 0.6, fontSize: '13px', cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>
                              </span>
                            ))}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <input placeholder="Prénom" value={saisieReferent.prenom}
                            onChange={e => setSaisieReferent(prev => ({ ...prev, prenom: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && ajouterReferent()}
                            style={{ ...st.input, width: '130px' }} />
                          <input placeholder="Nom" value={saisieReferent.nom}
                            onChange={e => setSaisieReferent(prev => ({ ...prev, nom: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && ajouterReferent()}
                            style={{ ...st.input, width: '130px' }} />
                          <button type="button" onClick={ajouterReferent}
                            style={{ background: colors.background.base, border: '1px solid #333', color: couleurPrincipale, padding: '7px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                            + Ajouter
                          </button>
                        </div>
                        {evenementForm.referents.length === 0 && (
                          <p style={{ color: colors.border.strong, fontSize: '12px', fontStyle: 'italic', margin: '8px 0 0' }}>Aucun référent ajouté.</p>
                        )}
                      </div>

                      <label style={st.label}>Participants invités</label>
                      <div style={{ marginBottom: '14px' }}>
                        {evenementForm.participants.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                            {evenementForm.participants.map(p => (
                              <span key={p.id} style={{ background: colors.accent.purpleLight + alpha.subtle, border: `1px solid ${colors.accent.purpleLight}40`, color: colors.accent.purpleLight, padding: '5px 12px', borderRadius: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {p.nom}
                                <button type="button" onClick={() => retirerParticipant(p.id)} style={{ background: 'none', border: 'none', color: colors.accent.purpleLight, opacity: 0.6, fontSize: '13px', cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>
                              </span>
                            ))}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <input placeholder="Prénom" value={saisieParticipant.prenom}
                            onChange={e => setSaisieParticipant(prev => ({ ...prev, prenom: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && ajouterParticipant()}
                            style={{ ...st.input, width: '130px' }} />
                          <input placeholder="Nom" value={saisieParticipant.nom}
                            onChange={e => setSaisieParticipant(prev => ({ ...prev, nom: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && ajouterParticipant()}
                            style={{ ...st.input, width: '130px' }} />
                          <button type="button" onClick={ajouterParticipant}
                            style={{ background: colors.background.base, border: '1px solid #333', color: colors.accent.purpleLight, padding: '7px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                            + Ajouter
                          </button>
                        </div>
                        {evenementForm.participants.length === 0 && (
                          <p style={{ color: colors.border.strong, fontSize: '12px', fontStyle: 'italic', margin: '8px 0 0' }}>Aucun participant ajouté.</p>
                        )}
                      </div>

                      {/* ── Ressources matérielles ── */}
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <label style={st.label}>📦 Ressources matérielles</label>
                          <button type="button" onClick={ajouterRessource} style={st.btnSecondary}>+ Ajouter</button>
                        </div>
                        {evenementForm.ressources_materielles.length === 0 && (
                          <p style={{ color: colors.border.strong, fontSize: '12px', fontStyle: 'italic', margin: 0 }}>Aucune ressource ajoutée.</p>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {evenementForm.ressources_materielles.map((r, i) => (
                            <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <input placeholder="Ex: Ballons, Chasubles, Cônes…" value={r.item} onChange={e => modifierRessource(i, 'item', e.target.value)} style={{ ...st.input, flex: 1 }} />
                              <input type="number" min="1" value={r.quantite} onChange={e => modifierRessource(i, 'quantite', parseInt(e.target.value) || 1)} style={{ ...st.input, width: '70px', textAlign: 'center' }} />
                              <button type="button" onClick={() => supprimerRessource(i)} style={{ background: 'transparent', border: 'none', color: colors.text.faint, fontSize: '16px', cursor: 'pointer', padding: '4px' }}>✕</button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* ── Missions ── */}
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <label style={st.label}>🎯 Missions</label>
                          <button type="button" onClick={ajouterMission} style={st.btnSecondary}>+ Créer une mission</button>
                        </div>
                        {evenementForm.missions.length === 0 && (
                          <p style={{ color: colors.border.strong, fontSize: '12px', fontStyle: 'italic', margin: 0 }}>Aucune mission créée.</p>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {evenementForm.missions.map(mission => (
                            <div key={mission.id} style={{ background: colors.background.raised, border: '1px solid #222', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <input placeholder="Titre de la mission (ex: Accueil équipes, Gestion vestiaires…)" value={mission.titre} onChange={e => modifierMission(mission.id, 'titre', e.target.value)} style={{ ...st.input, flex: 1, fontWeight: 700 }} />
                                <button type="button" onClick={() => supprimerMission(mission.id)} style={{ background: 'transparent', border: 'none', color: colors.text.faint, fontSize: '16px', cursor: 'pointer' }}>✕</button>
                              </div>

                              <div>
                                <p style={{ fontSize: '11px', color: colors.text.dim, fontWeight: 700, margin: '0 0 6px' }}>Responsable de la mission</p>
                                {mission.responsable_nom ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ background: couleurPrincipale + alpha.soft, border: `1px solid ${couleurPrincipale}`, color: couleurPrincipale, padding: '5px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
                                      ⭐ {mission.responsable_nom}
                                    </span>
                                    <button type="button" onClick={() => effacerResponsableMission(mission.id)} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '14px', cursor: 'pointer' }}>✕</button>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    <input placeholder="Prénom" value={(saisieResponsableMission[mission.id] || {}).prenom || ''}
                                      onChange={e => setSaisieResponsableMission(prev => ({ ...prev, [mission.id]: { ...(prev[mission.id] || {}), prenom: e.target.value } }))}
                                      onKeyDown={e => e.key === 'Enter' && validerResponsableMission(mission.id)}
                                      style={{ ...st.input, width: '130px' }} />
                                    <input placeholder="Nom" value={(saisieResponsableMission[mission.id] || {}).nom || ''}
                                      onChange={e => setSaisieResponsableMission(prev => ({ ...prev, [mission.id]: { ...(prev[mission.id] || {}), nom: e.target.value } }))}
                                      onKeyDown={e => e.key === 'Enter' && validerResponsableMission(mission.id)}
                                      style={{ ...st.input, width: '130px' }} />
                                    <button type="button" onClick={() => validerResponsableMission(mission.id)}
                                      style={{ background: couleurPrincipale + alpha.subtle, border: `1px solid ${couleurPrincipale}40`, color: couleurPrincipale, padding: '7px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                                      Valider
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div>
                                <p style={{ fontSize: '11px', color: colors.text.dim, fontWeight: 700, margin: '0 0 6px' }}>Participants ({mission.participants.length})</p>
                                {mission.participants.length > 0 && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                                    {mission.participants.map(p => (
                                      <span key={p.id} style={{ background: colors.accent.blue + alpha.subtle, border: `1px solid ${colors.accent.blue}40`, color: colors.accent.blue, padding: '4px 10px', borderRadius: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {p.nom}
                                        <button type="button" onClick={() => retirerParticipantMission(mission.id, p.id)} style={{ background: 'none', border: 'none', color: colors.accent.blue, opacity: 0.6, fontSize: '12px', cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                  <input placeholder="Prénom" value={(saisieParticipantMission[mission.id] || {}).prenom || ''}
                                    onChange={e => setSaisieParticipantMission(prev => ({ ...prev, [mission.id]: { ...(prev[mission.id] || {}), prenom: e.target.value } }))}
                                    onKeyDown={e => e.key === 'Enter' && ajouterParticipantMission(mission.id)}
                                    style={{ ...st.input, width: '130px' }} />
                                  <input placeholder="Nom" value={(saisieParticipantMission[mission.id] || {}).nom || ''}
                                    onChange={e => setSaisieParticipantMission(prev => ({ ...prev, [mission.id]: { ...(prev[mission.id] || {}), nom: e.target.value } }))}
                                    onKeyDown={e => e.key === 'Enter' && ajouterParticipantMission(mission.id)}
                                    style={{ ...st.input, width: '130px' }} />
                                  <button type="button" onClick={() => ajouterParticipantMission(mission.id)}
                                    style={{ background: colors.background.base, border: '1px solid #333', color: colors.accent.blue, padding: '7px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                                    + Ajouter
                                  </button>
                                </div>
                              </div>

                              <div>
                                <label style={st.label}>Objectif</label>
                                <textarea placeholder="Quel est l'objectif de cette mission ?" value={mission.objectif} onChange={e => modifierMission(mission.id, 'objectif', e.target.value)} rows={2} style={{ ...st.input, resize: 'vertical' }} />
                              </div>
                              <div>
                                <label style={st.label}>Comment</label>
                                <textarea placeholder="Comment réaliser cette mission ? (étapes, consignes, timing…)" value={mission.comment} onChange={e => modifierMission(mission.id, 'comment', e.target.value)} rows={2} style={{ ...st.input, resize: 'vertical' }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={sauvegarderEvenement} disabled={savingEvenement || !evenementForm.titre.trim() || !evenementForm.date} style={st.btnSolid}>
                          {savingEvenement ? t('jp_enregistrement', lang) : editingEvenementId ? t('btn_sauvegarder', lang) : t('btn_ajouter', lang)}
                        </button>
                        <button onClick={() => setShowEvenementForm(false)} style={st.btnSecondary}>{t('btn_annuler', lang)}</button>
                      </div>
                    </div>
                  )}

                  {Object.keys(evenementsParMois).length === 0 ? (
                    <div style={{ ...st.card, textAlign: 'center', padding: '3rem', color: colors.text.faint }}>Aucun événement à venir.</div>
                  ) : (
                    Object.entries(evenementsParMois).map(([mois, evs]) => (
                      <div key={mois} style={{ marginBottom: '1.5rem' }}>
                        <p style={{ fontWeight: 700, fontSize: '13px', color: couleurPrincipale, margin: '0 0 10px' }}>{MOIS_LABEL(`${mois}-01`)}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {evs.map(ev => {
                            const info = TYPE_EVENEMENT_INFO(ev.type)
                            return (
                              <div key={ev.id} style={{ ...st.card, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <span style={{ background: colors.accent.purple + alpha.soft, border: '1px solid #a855f750', color: colors.accent.purple, fontSize: '10px', fontWeight: 700, padding: '2px 9px', borderRadius: '20px' }}>{info.emoji} {info.label}</span>
                                    <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{ev.titre}</p>
                                  </div>
                                  <p style={{ margin: 0, fontSize: '12px', color: colors.text.dim }}>
                                    {new Date(ev.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                                    {ev.heure ? ` · ${ev.heure.slice(0, 5)}` : ''}{ev.lieu ? ` · ${ev.lieu}` : ''}
                                  </p>
                                  {ev.description && <p style={{ margin: '4px 0 0', fontSize: '12px', color: colors.text.muted }}>{ev.description}</p>}
                                  {ev.referents?.length > 0 && (
                                    <p style={{ margin: '4px 0 0', fontSize: '11px', color: couleurPrincipale }}>⭐ {ev.referents.map(r => r.nom).join(', ')}</p>
                                  )}
                                  {ev.participants?.length > 0 && (
                                    <p style={{ margin: '4px 0 0', fontSize: '11px', color: colors.text.faint }}>👥 {ev.participants.map(p => p.nom).join(', ')}</p>
                                  )}
                                  {ev.ressources_materielles?.length > 0 && (
                                    <p style={{ margin: '4px 0 0', fontSize: '11px', color: colors.text.faint }}>📦 {ev.ressources_materielles.map(r => `${r.quantite}× ${r.item}`).join(', ')}</p>
                                  )}
                                  {ev.missions?.length > 0 && (
                                    <div style={{ margin: '4px 0 0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      {ev.missions.map(m => (
                                        <p key={m.id} style={{ margin: 0, fontSize: '11px', color: colors.text.faint }}>
                                          🎯 {m.titre}{m.responsable_nom ? ` — ⭐ ${m.responsable_nom}` : ''}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                  <button onClick={() => exporterEvenementPDF(ev)} disabled={exportingPdfId === ev.id} style={{ ...st.btnSecondary, fontSize: '11px', padding: '5px 10px', opacity: exportingPdfId === ev.id ? 0.6 : 1 }}>📄 PDF</button>
                                  {canEditSection('evenements') && (
                                    <>
                                      <button onClick={() => ouvrirEditionEvenement(ev)} style={{ ...st.btnSecondary, fontSize: '11px', padding: '5px 10px' }}>{t('btn_modifier', lang)}</button>
                                      <button onClick={() => supprimerEvenement(ev.id)} style={{ ...st.btnSecondary, fontSize: '11px', padding: '5px 10px', color: colors.accent.red, borderColor: colors.accent.red + alpha.medium }}>{t('btn_supprimer', lang)}</button>
                                    </>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ═══ PROJETS ═══ */}
              {sousVueEvenements === 'projets' && (
                <div>
                  {canEditSection('evenements') && (
                    <button onClick={showProjetForm ? () => setShowProjetForm(false) : ouvrirNouveauProjet}
                      style={{ ...st.btnSolid, marginBottom: '1.25rem' }}>
                      {showProjetForm ? `✕ ${t('btn_annuler', lang)}` : '+ Projet'}
                    </button>
                  )}

                  {showProjetForm && canEditSection('evenements') && (
                    <div style={{ ...st.card, marginBottom: '1.5rem' }}>
                      <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 14px' }}>{editingProjetId ? 'Modifier le projet' : 'Nouveau projet'}</p>
                      <div style={{ marginBottom: '10px' }}>
                        <label style={st.label}>Nom du projet</label>
                        <input style={st.input} value={projetForm.nom} onChange={e => setProjetForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex: Rénovation vestiaires" />
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <label style={st.label}>Description</label>
                        <textarea style={{ ...st.input, minHeight: '70px', resize: 'vertical', fontFamily: 'Inter, sans-serif' }} value={projetForm.description} onChange={e => setProjetForm(f => ({ ...f, description: e.target.value }))} />
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <label style={st.label}>Objectif du projet</label>
                        <textarea placeholder="Que veut-on accomplir avec ce projet ?" style={{ ...st.input, minHeight: '60px', resize: 'vertical', fontFamily: 'Inter, sans-serif' }} value={projetForm.objectif} onChange={e => setProjetForm(f => ({ ...f, objectif: e.target.value }))} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        <div>
                          <label style={st.label}>Date de début</label>
                          <input style={st.input} type="date" value={projetForm.date_debut} onChange={e => setProjetForm(f => ({ ...f, date_debut: e.target.value }))} />
                        </div>
                        <div>
                          <label style={st.label}>Date de fin</label>
                          <input style={st.input} type="date" value={projetForm.date_fin} onChange={e => setProjetForm(f => ({ ...f, date_fin: e.target.value }))} />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                        <div>
                          <label style={st.label}>Responsable</label>
                          <select style={st.input} value={projetForm.responsable_id} onChange={e => { const opt = responsablesOptions.find(r => r.id === e.target.value); setProjetForm(f => ({ ...f, responsable_id: e.target.value, responsable_nom: opt?.nom || '' })) }}>
                            <option value="">— Aucun —</option>
                            {responsablesOptions.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={st.label}>Statut</label>
                          <select style={st.input} value={projetForm.statut} onChange={e => setProjetForm(f => ({ ...f, statut: e.target.value }))}>
                            {STATUTS_PROJET.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
                          </select>
                        </div>
                      </div>
                      <label style={st.label}>Référents du projet</label>
                      <div style={{ marginBottom: '14px' }}>
                        {projetForm.referents.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                            {projetForm.referents.map(r => (
                              <span key={r.id} style={{ background: couleurPrincipale + alpha.subtle, border: `1px solid ${couleurPrincipale}40`, color: couleurPrincipale, padding: '5px 12px', borderRadius: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                ⭐ {r.nom}
                                <button type="button" onClick={() => retirerReferentProjet(r.id)} style={{ background: 'none', border: 'none', color: couleurPrincipale, opacity: 0.6, fontSize: '13px', cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>
                              </span>
                            ))}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <input placeholder="Prénom" value={saisieReferentProjet.prenom}
                            onChange={e => setSaisieReferentProjet(prev => ({ ...prev, prenom: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && ajouterReferentProjet()}
                            style={{ ...st.input, width: '130px' }} />
                          <input placeholder="Nom" value={saisieReferentProjet.nom}
                            onChange={e => setSaisieReferentProjet(prev => ({ ...prev, nom: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && ajouterReferentProjet()}
                            style={{ ...st.input, width: '130px' }} />
                          <button type="button" onClick={ajouterReferentProjet}
                            style={{ background: colors.background.base, border: '1px solid #333', color: couleurPrincipale, padding: '7px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                            + Ajouter
                          </button>
                        </div>
                        {projetForm.referents.length === 0 && (
                          <p style={{ color: colors.border.strong, fontSize: '12px', fontStyle: 'italic', margin: '8px 0 0' }}>Aucun référent ajouté.</p>
                        )}
                      </div>

                      {/* ── Missions du projet ── */}
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <label style={st.label}>🎯 Missions</label>
                          <button type="button" onClick={ajouterMissionProjet} style={st.btnSecondary}>+ Créer une mission</button>
                        </div>
                        {projetForm.missions.length === 0 && (
                          <p style={{ color: colors.border.strong, fontSize: '12px', fontStyle: 'italic', margin: 0 }}>Aucune mission créée.</p>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {projetForm.missions.map(mission => (
                            <div key={mission.id} style={{ background: colors.background.raised, border: '1px solid #222', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <input placeholder="Titre de la mission (ex: Devis entreprises, Suivi chantier…)" value={mission.titre} onChange={e => modifierMissionProjet(mission.id, 'titre', e.target.value)} style={{ ...st.input, flex: 1, fontWeight: 700 }} />
                                <button type="button" onClick={() => supprimerMissionProjet(mission.id)} style={{ background: 'transparent', border: 'none', color: colors.text.faint, fontSize: '16px', cursor: 'pointer' }}>✕</button>
                              </div>

                              <div>
                                <p style={{ fontSize: '11px', color: colors.text.dim, fontWeight: 700, margin: '0 0 6px' }}>Référent de la mission</p>
                                {mission.responsable_nom ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ background: couleurPrincipale + alpha.soft, border: `1px solid ${couleurPrincipale}`, color: couleurPrincipale, padding: '5px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
                                      ⭐ {mission.responsable_nom}
                                    </span>
                                    <button type="button" onClick={() => effacerResponsableMissionProjet(mission.id)} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '14px', cursor: 'pointer' }}>✕</button>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    <input placeholder="Prénom" value={(saisieResponsableMissionProjet[mission.id] || {}).prenom || ''}
                                      onChange={e => setSaisieResponsableMissionProjet(prev => ({ ...prev, [mission.id]: { ...(prev[mission.id] || {}), prenom: e.target.value } }))}
                                      onKeyDown={e => e.key === 'Enter' && validerResponsableMissionProjet(mission.id)}
                                      style={{ ...st.input, width: '130px' }} />
                                    <input placeholder="Nom" value={(saisieResponsableMissionProjet[mission.id] || {}).nom || ''}
                                      onChange={e => setSaisieResponsableMissionProjet(prev => ({ ...prev, [mission.id]: { ...(prev[mission.id] || {}), nom: e.target.value } }))}
                                      onKeyDown={e => e.key === 'Enter' && validerResponsableMissionProjet(mission.id)}
                                      style={{ ...st.input, width: '130px' }} />
                                    <button type="button" onClick={() => validerResponsableMissionProjet(mission.id)}
                                      style={{ background: couleurPrincipale + alpha.subtle, border: `1px solid ${couleurPrincipale}40`, color: couleurPrincipale, padding: '7px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                                      Valider
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div>
                                <p style={{ fontSize: '11px', color: colors.text.dim, fontWeight: 700, margin: '0 0 6px' }}>Participants à la mission ({mission.participants.length})</p>
                                {mission.participants.length > 0 && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                                    {mission.participants.map(p => (
                                      <span key={p.id} style={{ background: colors.accent.blue + alpha.subtle, border: `1px solid ${colors.accent.blue}40`, color: colors.accent.blue, padding: '4px 10px', borderRadius: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {p.nom}
                                        <button type="button" onClick={() => retirerParticipantMissionProjet(mission.id, p.id)} style={{ background: 'none', border: 'none', color: colors.accent.blue, opacity: 0.6, fontSize: '12px', cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                  <input placeholder="Prénom" value={(saisieParticipantMissionProjet[mission.id] || {}).prenom || ''}
                                    onChange={e => setSaisieParticipantMissionProjet(prev => ({ ...prev, [mission.id]: { ...(prev[mission.id] || {}), prenom: e.target.value } }))}
                                    onKeyDown={e => e.key === 'Enter' && ajouterParticipantMissionProjet(mission.id)}
                                    style={{ ...st.input, width: '130px' }} />
                                  <input placeholder="Nom" value={(saisieParticipantMissionProjet[mission.id] || {}).nom || ''}
                                    onChange={e => setSaisieParticipantMissionProjet(prev => ({ ...prev, [mission.id]: { ...(prev[mission.id] || {}), nom: e.target.value } }))}
                                    onKeyDown={e => e.key === 'Enter' && ajouterParticipantMissionProjet(mission.id)}
                                    style={{ ...st.input, width: '130px' }} />
                                  <button type="button" onClick={() => ajouterParticipantMissionProjet(mission.id)}
                                    style={{ background: colors.background.base, border: '1px solid #333', color: colors.accent.blue, padding: '7px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                                    + Ajouter
                                  </button>
                                </div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                                <div>
                                  <label style={st.label}>Date de début</label>
                                  <input style={st.input} type="date" value={mission.date_debut} onChange={e => modifierMissionProjet(mission.id, 'date_debut', e.target.value)} />
                                </div>
                                <div>
                                  <label style={st.label}>Date de fin</label>
                                  <input style={st.input} type="date" value={mission.date_fin} onChange={e => modifierMissionProjet(mission.id, 'date_fin', e.target.value)} />
                                </div>
                              </div>

                              <div>
                                <label style={st.label}>Objectif</label>
                                <textarea placeholder="Quel est l'objectif de cette mission ?" value={mission.objectif} onChange={e => modifierMissionProjet(mission.id, 'objectif', e.target.value)} rows={2} style={{ ...st.input, resize: 'vertical' }} />
                              </div>
                              <div>
                                <label style={st.label}>Comment</label>
                                <textarea placeholder="Comment réaliser cette mission ? (étapes, consignes, timing…)" value={mission.comment} onChange={e => modifierMissionProjet(mission.id, 'comment', e.target.value)} rows={2} style={{ ...st.input, resize: 'vertical' }} />
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '10px' }}>
                                <div>
                                  <label style={st.label}>Ressource humaine</label>
                                  <input placeholder="Ex: 2 bénévoles" style={st.input} value={mission.ressource_humaine} onChange={e => modifierMissionProjet(mission.id, 'ressource_humaine', e.target.value)} />
                                </div>
                                <div>
                                  <label style={st.label}>Ressource matérielle</label>
                                  <input placeholder="Ex: Camionnette, outillage" style={st.input} value={mission.ressource_materielle} onChange={e => modifierMissionProjet(mission.id, 'ressource_materielle', e.target.value)} />
                                </div>
                                <div>
                                  <label style={st.label}>Ressource financière</label>
                                  <input placeholder="Ex: 500€ budget matériel" style={st.input} value={mission.ressource_financiere} onChange={e => modifierMissionProjet(mission.id, 'ressource_financiere', e.target.value)} />
                                </div>
                              </div>

                              <div>
                                <label style={st.label}>Résultats de la mission</label>
                                <textarea placeholder="Ce qui a été accompli" value={mission.resultats} onChange={e => modifierMissionProjet(mission.id, 'resultats', e.target.value)} rows={2} style={{ ...st.input, resize: 'vertical' }} />
                              </div>
                              <div>
                                <label style={st.label}>Problème rencontré</label>
                                <textarea placeholder="Difficultés, retards, blocages…" value={mission.probleme_rencontre} onChange={e => modifierMissionProjet(mission.id, 'probleme_rencontre', e.target.value)} rows={2} style={{ ...st.input, resize: 'vertical' }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={sauvegarderProjet} disabled={savingProjet || !projetForm.nom.trim()} style={st.btnSolid}>
                          {savingProjet ? t('jp_enregistrement', lang) : editingProjetId ? t('btn_sauvegarder', lang) : t('btn_ajouter', lang)}
                        </button>
                        <button onClick={() => setShowProjetForm(false)} style={st.btnSecondary}>{t('btn_annuler', lang)}</button>
                      </div>
                    </div>
                  )}

                  {projetsClub.length === 0 ? (
                    <div style={{ ...st.card, textAlign: 'center', padding: '3rem', color: colors.text.faint }}>Aucun projet pour l'instant.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '14px', alignItems: 'start' }}>
                      {STATUTS_PROJET.map(colonne => (
                        <div key={colonne.val}>
                          <p style={{ fontSize: '12px', fontWeight: 700, color: colonne.color, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {colonne.label} ({projetsParStatut(colonne.val).length})
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {projetsParStatut(colonne.val).map(p => {
                              const taches = p.taches_projet || []
                              const fait = taches.filter(t => t.fait).length
                              return (
                                <div key={p.id} style={{ ...st.card, borderLeft: `3px solid ${colonne.color}` }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                                    <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{p.nom}</p>
                                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                      <button onClick={() => exporterProjetPDF(p)} disabled={exportingPdfId === p.id} style={{ background: 'none', border: 'none', color: colors.text.faint, cursor: 'pointer', fontSize: '12px', opacity: exportingPdfId === p.id ? 0.5 : 1 }} title="Export PDF">📄</button>
                                      {canEditSection('evenements') && (
                                        <>
                                          <button onClick={() => ouvrirEditionProjet(p)} style={{ background: 'none', border: 'none', color: colors.text.faint, cursor: 'pointer', fontSize: '12px' }}>✎</button>
                                          <button onClick={() => supprimerProjet(p.id)} style={{ background: 'none', border: 'none', color: colors.text.faint, cursor: 'pointer', fontSize: '12px' }}>✕</button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  {p.description && <p style={{ margin: '0 0 6px', fontSize: '11px', color: colors.text.muted }}>{p.description}</p>}
                                  {(p.date_debut || p.date_fin) && (
                                    <p style={{ margin: '0 0 4px', fontSize: '11px', color: colors.text.dim }}>
                                      {p.date_debut ? new Date(p.date_debut + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '?'}
                                      {' → '}
                                      {p.date_fin ? new Date(p.date_fin + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '?'}
                                    </p>
                                  )}
                                  {p.responsable_nom && <p style={{ margin: '0 0 4px', fontSize: '11px', color: couleurPrincipale }}>👤 {p.responsable_nom}</p>}
                                  {p.referents?.length > 0 && <p style={{ margin: '0 0 8px', fontSize: '11px', color: couleurPrincipale }}>⭐ {p.referents.map(r => r.nom).join(', ')}</p>}

                                  {canEditSection('evenements') && (
                                    <select value={p.statut} onChange={e => changerStatutProjet(p.id, e.target.value)}
                                      style={{ width: '100%', background: colors.background.base, border: '1px solid #2a2a2a', borderRadius: '6px', color: '#ccc', padding: '4px 8px', fontSize: '11px', marginBottom: '10px', fontFamily: 'Inter, sans-serif' }}>
                                      {STATUTS_PROJET.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
                                    </select>
                                  )}

                                  {taches.length > 0 && (
                                    <p style={{ margin: '0 0 6px', fontSize: '10px', color: colors.text.faint }}>{fait}/{taches.length} tâches terminées</p>
                                  )}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                                    {taches.map(tc => (
                                      <div key={tc.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span onClick={() => canEditSection('evenements') && toggleTache(tc)} style={{ cursor: canEditSection('evenements') ? 'pointer' : 'default', fontSize: '13px', color: tc.fait ? colors.accent.green : colors.text.faint }}>
                                          {tc.fait ? '☑' : '☐'}
                                        </span>
                                        <span style={{ flex: 1, fontSize: '11px', color: tc.fait ? colors.text.faint : '#ccc', textDecoration: tc.fait ? 'line-through' : 'none' }}>{tc.titre}</span>
                                        {canEditSection('evenements') && (
                                          <button onClick={() => supprimerTache(tc.id)} style={{ background: 'none', border: 'none', color: colors.border.strong, cursor: 'pointer', fontSize: '11px' }}>✕</button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                  {canEditSection('evenements') && (
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                      <input value={nouvelleTache[p.id] || ''} onChange={e => setNouvelleTache(prev => ({ ...prev, [p.id]: e.target.value }))}
                                        onKeyDown={e => e.key === 'Enter' && ajouterTache(p.id)}
                                        placeholder="+ Tâche..." style={{ flex: 1, background: colors.background.base, border: '1px solid #2a2a2a', borderRadius: '6px', color: colors.text.primary, padding: '4px 8px', fontSize: '11px', fontFamily: 'Inter, sans-serif', outline: 'none' }} />
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                            {projetsParStatut(colonne.val).length === 0 && <p style={{ fontSize: '11px', color: colors.border.strong }}>—</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })()}

        {/* ── ORGANIGRAMME V2 : arbre hiérarchique + import Excel/scan IA ── */}
        {activeTab === 'organigramme' && canViewSection('organigramme') && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ margin: 0, color: colors.text.primary, fontSize: '18px', fontWeight: 700 }}>🏛️ Organigramme</h2>
                <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '13px' }}>{organigramme.length} membre{organigramme.length > 1 ? 's' : ''}</p>
              </div>
              {canEditSection('organigramme') && (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button onClick={() => ouvrirModalOrganigramme(null)} style={st.btnSolid}>+ Ajouter un membre</button>
                  <button
                    onClick={() => setOrgImportMode(orgImportMode === 'excel' ? null : 'excel')}
                    style={{ background: '#1a1a0a', border: '1px solid #fbbf24', borderRadius: '8px', color: colors.accent.amber, padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    📊 Importer Excel
                  </button>
                  <button
                    onClick={() => setOrgImportMode(orgImportMode === 'scan' ? null : 'scan')}
                    style={{ background: '#0f1f0f', border: `1px solid ${couleurPrincipale}`, borderRadius: '8px', color: couleurPrincipale, padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    📷 Scanner un document
                  </button>
                  {organigramme.length > 0 && (
                    <button
                      onClick={() => {
                        const all = new Set(organigramme.map(m => `${m.nom} ${m.prenom}`.trim()))
                        setOrgExpandedNodes(orgExpandedNodes.size > 0 ? new Set() : all)
                      }}
                      style={{ background: colors.background.surface, border: '1px solid #2a2a2a', borderRadius: '8px', color: '#9ca3af', padding: '8px 14px', fontSize: '13px', cursor: 'pointer' }}
                    >
                      {orgExpandedNodes.size > 0 ? '↑ Tout réduire' : '↓ Tout développer'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {orgImportMode === 'excel' && (
              <div style={{ background: colors.background.surface, border: '1px solid #fbbf24', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 12px', color: colors.accent.amber, fontSize: '15px' }}>📊 Import depuis Excel / CSV</h3>
                <p style={{ color: '#9ca3af', fontSize: '13px', margin: '0 0 14px' }}>
                  Utilise le template avec les colonnes : <strong style={{ color: colors.text.primary }}>Nom, Prénom, Rôle, Département, Supérieur, Email, Téléphone</strong>
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button onClick={telechargerTemplateOrganigramme} style={{ background: '#1a1a0a', border: '1px solid #fbbf24', borderRadius: '8px', color: colors.accent.amber, padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}>
                    ⬇️ Télécharger le template
                  </button>
                  <label style={{ background: colors.accent.amber, borderRadius: '8px', color: colors.black, padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    📂 Choisir un fichier
                    <input type="file" accept=".xlsx,.xls,.csv" onChange={importerOrganigrammeExcel} style={{ display: 'none' }} />
                  </label>
                  {orgImportLoading && <span style={{ color: '#9ca3af', fontSize: '13px' }}>⏳ Import en cours…</span>}
                </div>
                <p style={{ color: '#4b5563', fontSize: '12px', margin: '10px 0 0' }}>⚠️ L'import remplacera l'organigramme actuel.</p>
              </div>
            )}

            {orgImportMode === 'scan' && (
              <div style={{ background: colors.background.surface, border: `1px solid ${couleurPrincipale}`, borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 12px', color: couleurPrincipale, fontSize: '15px' }}>📷 Scanner un organigramme</h3>
                <p style={{ color: '#9ca3af', fontSize: '13px', margin: '0 0 14px' }}>
                  Photo d'un organigramme papier existant. L'IA extrait automatiquement les membres et la hiérarchie.
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <label style={{ background: '#0f1f0f', border: `1px solid ${couleurPrincipale}`, borderRadius: '8px', color: couleurPrincipale, padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}>
                    🖼️ {orgScanFile ? orgScanFile.name : 'Choisir une image'}
                    <input type="file" accept="image/*" onChange={e => setOrgScanFile(e.target.files[0])} style={{ display: 'none' }} />
                  </label>
                  {orgScanFile && (
                    <button
                      onClick={scannerOrganigramme}
                      disabled={orgScanLoading}
                      style={{ background: couleurPrincipale, border: 'none', borderRadius: '8px', color: colors.black, padding: '8px 18px', fontSize: '13px', fontWeight: 700, cursor: orgScanLoading ? 'wait' : 'pointer', opacity: orgScanLoading ? 0.7 : 1 }}
                    >
                      {orgScanLoading ? libelleStatutGroq(orgScanStatus) : '🔍 Analyser'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {organigramme.length > 0 && (
              <input
                type="text"
                placeholder="🔍 Rechercher un membre, un rôle, un département…"
                value={orgSearchQuery}
                onChange={e => setOrgSearchQuery(e.target.value)}
                style={{ width: '100%', background: colors.background.sunken, border: '1px solid #1a1a1a', borderRadius: '8px', color: colors.text.primary, padding: '10px 14px', fontSize: '14px', marginBottom: '20px', boxSizing: 'border-box', outline: 'none' }}
              />
            )}

            {organigramme.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
                {[...new Set(organigramme.map(m => m.departement || 'Autre'))].map(dept => {
                  const c = getDeptColor(dept)
                  return (
                    <span key={dept} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', border: `1px solid ${c.border}`, color: c.text, background: c.bg }}>
                      ● {dept}
                    </span>
                  )
                })}
              </div>
            )}

            {organigramme.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#4b5563' }}>
                <p style={{ fontSize: '40px', margin: '0 0 12px' }}>🏛️</p>
                <p style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 8px', color: '#6b7280' }}>Aucun membre dans l'organigramme</p>
                <p style={{ fontSize: '13px', margin: 0 }}>Ajoute un membre, importe un fichier Excel, ou scanne un document existant pour démarrer.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', paddingBottom: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '320px' }}>
                  {construireArbreOrganigramme(organigramme).map((root, i) => (
                    <OrgNode
                      key={root.id || i} node={root} depth={0}
                      expandedNodes={orgExpandedNodes} onToggle={toggleOrgNode} searchQuery={orgSearchQuery}
                      canEdit={canEditSection('organigramme')} onEdit={ouvrirModalOrganigramme} onDelete={supprimerMembreOrganigramme}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Parents ── */}
            <div style={{ marginTop: '32px' }}>
              <h3 style={{ color: colors.text.primary, fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>👨‍👩‍👦 Parents ({parentsClub.length})</h3>
              <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 16px' }}>Coordonnées des parents ayant complété leur profil, tous joueurs du club confondus.</p>
              {parentsClub.length > 0 && (
                <input
                  type="text"
                  placeholder="🔍 Rechercher un parent, un joueur, une catégorie, une profession…"
                  value={parentsSearchQuery}
                  onChange={e => setParentsSearchQuery(e.target.value)}
                  style={{ width: '100%', background: colors.background.sunken, border: '1px solid #1a1a1a', borderRadius: '8px', color: colors.text.primary, padding: '10px 14px', fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box', outline: 'none' }}
                />
              )}
              {(() => {
                const q = parentsSearchQuery.trim().toLowerCase()
                const parentsFiltres = !q ? parentsClub : parentsClub.filter(p => [
                  p.prenom, p.nom, p.profession, p.joueur?.prenom, p.joueur?.nom, p.joueur?.categorie, p.joueur?.niveau_equipe,
                ].some(v => v?.toLowerCase().includes(q)))
                if (parentsClub.length === 0) {
                  return <p style={{ color: colors.text.disabled, fontSize: '13px', fontStyle: 'italic' }}>Aucun parent enregistré pour l'instant.</p>
                }
                if (parentsFiltres.length === 0) {
                  return <p style={{ color: colors.text.disabled, fontSize: '13px', fontStyle: 'italic' }}>Aucun parent ne correspond à cette recherche.</p>
                }
                return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {parentsFiltres.map(p => (
                    <div key={p.id} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.3fr 1fr 1.2fr 1fr 1fr', gap: '10px', alignItems: 'center', background: colors.background.surface, border: '1px solid #1e1e1e', borderRadius: '10px', padding: '14px' }}>
                      <div>
                        <p style={{ color: colors.text.primary, fontWeight: 600, fontSize: '14px', margin: 0 }}>{p.prenom} {p.nom}</p>
                        <p style={{ color: '#6b7280', fontSize: '11px', margin: 0 }}>Parent de {p.joueur?.prenom} {p.joueur?.nom}</p>
                      </div>
                      <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>{p.telephone || '—'}</p>
                      <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.email || '—'}</p>
                      <p style={{ color: colors.accent.green, fontSize: '13px', margin: 0 }}>{p.profession || '—'}</p>
                      <p style={{ color: '#6b7280', fontSize: '12px', margin: 0 }}>{p.joueur?.categorie || p.joueur?.niveau_equipe || '—'}</p>
                    </div>
                  ))}
                </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* ── Modale ajout/modification organigramme ── */}
        {modalOrganigramme && (
          <div style={{ position: 'fixed', inset: 0, background: '#000000cc', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}>
            <div style={{ background: colors.background.surface, border: '1px solid #2a2a2a', borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: '16px' }}>{membreOrganigrammeEdite ? '✏️ Modifier le membre' : '+ Ajouter un membre'}</p>
                <button onClick={() => setModalOrganigramme(false)} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '20px', cursor: 'pointer' }}>✕</button>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={st.label}>Prénom</label>
                  <input style={st.input} value={formOrganigramme.prenom} onChange={e => setFormOrganigramme(f => ({ ...f, prenom: e.target.value }))} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={st.label}>Nom</label>
                  <input style={st.input} value={formOrganigramme.nom} onChange={e => setFormOrganigramme(f => ({ ...f, nom: e.target.value }))} />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={st.label}>Rôle</label>
                <select style={st.input} value={formOrganigramme.role} onChange={e => setFormOrganigramme(f => ({ ...f, role: e.target.value }))}>
                  <option value="">— Choisir —</option>
                  {ROLES_ORGANIGRAMME.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                {formOrganigramme.role === 'Autre' && (
                  <input style={{ ...st.input, marginTop: '8px' }} placeholder="Préciser le rôle" value={roleOrganigrammeLibre} onChange={e => setRoleOrganigrammeLibre(e.target.value)} />
                )}
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={st.label}>Département</label>
                <select style={st.input} value={formOrganigramme.departement} onChange={e => setFormOrganigramme(f => ({ ...f, departement: e.target.value }))}>
                  {Object.keys(DEPT_COLORS).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={st.label}>Supérieur hiérarchique</label>
                <select style={st.input} value={formOrganigramme.superieur} onChange={e => setFormOrganigramme(f => ({ ...f, superieur: e.target.value }))}>
                  <option value="">— Aucun (sommet) —</option>
                  {organigramme.filter(m => m.id !== membreOrganigrammeEdite?.id).map(m => {
                    const key = `${m.nom} ${m.prenom}`.trim()
                    return <option key={m.id} value={key}>{m.prenom} {m.nom}</option>
                  })}
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={st.label}>Téléphone</label>
                <input style={st.input} type="tel" value={formOrganigramme.telephone} onChange={e => setFormOrganigramme(f => ({ ...f, telephone: e.target.value }))} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={st.label}>Email</label>
                <input style={st.input} type="email" value={formOrganigramme.email} onChange={e => setFormOrganigramme(f => ({ ...f, email: e.target.value }))} />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={st.label}>Ordre d'affichage</label>
                <input style={st.input} type="number" value={formOrganigramme.ordre} onChange={e => setFormOrganigramme(f => ({ ...f, ordre: e.target.value }))} />
              </div>

              <button onClick={sauvegarderMembreOrganigramme} disabled={savingOrganigramme || !formOrganigramme.prenom.trim() || !formOrganigramme.role} style={{ ...st.btnSolid, width: '100%', opacity: (savingOrganigramme || !formOrganigramme.prenom.trim() || !formOrganigramme.role) ? 0.5 : 1 }}>
                {savingOrganigramme ? 'Enregistrement...' : membreOrganigrammeEdite ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        )}

        {/* ── STAFF (visible/éditable selon la matrice de permissions ; "Gérer les permissions" reste réservé au président) ── */}
        {activeTab === 'staff' && canViewSection('staff') && (() => {
          // Un rôle délégué (can_edit sur 'staff', pas le propriétaire réel du compte club)
          // ne doit jamais pouvoir s'assigner ou assigner à quelqu'un d'autre le rôle
          // 'président', qui donnerait un accès total non restreint.
          const rolesAssignables = monRole === 'president' ? ROLES_STAFF : ROLES_STAFF.filter(r => r.val !== 'president')
          return (
          <div style={{ maxWidth: '700px' }}>
            {monRole === 'president' && (
              <div style={{ ...st.card, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '14px' }}>🔐 Permissions par rôle</p>
                  <p style={{ margin: 0, fontSize: '12px', color: colors.text.dim }}>Contrôle ce que chaque rôle du staff peut voir et modifier.</p>
                </div>
                <button onClick={() => setShowPermissionsModal(true)} style={st.btnSolid}>Gérer les permissions</button>
              </div>
            )}

            {canEditSection('staff') && (
            <>
            <div style={{ ...st.card, marginBottom: '1.5rem' }}>
              <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '14px' }}>🔍 {t('club_ajouter_membre_staff', lang)}</p>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <input
                  style={{ ...st.input, flex: 1 }}
                  placeholder={t('club_rechercher_membre_placeholder', lang)}
                  value={searchStaff}
                  onChange={e => rechercherUtilisateurs(e.target.value)}
                />
                <select style={{ ...st.input, width: 'auto' }} value={roleAAssigner} onChange={e => setRoleAAssigner(e.target.value)}>
                  {rolesAssignables.map(r => <option key={r.val} value={r.val}>{r.label}</option>)}
                </select>
              </div>
              {resultatsStaff.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {resultatsStaff.map(u => {
                    const dejaMembre = staffMembers.some(m => m.user_id === u.id)
                    return (
                      <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: colors.background.raised, borderRadius: '8px', padding: '10px 14px' }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>{u.prenom} {u.nom}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.dim }}>{u.email}</p>
                        </div>
                        <button
                          onClick={() => ajouterStaff(u.id)}
                          disabled={dejaMembre || addingStaffId === u.id}
                          style={{ ...st.btnSolid, opacity: dejaMembre ? 0.4 : 1, fontSize: '12px', padding: '6px 14px' }}>
                          {dejaMembre ? t('club_deja_staff', lang) : addingStaffId === u.id ? '...' : `${t('club_ajouter_comme', lang)} ${ROLE_STAFF_LABEL(roleAAssigner)}`}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div style={{ ...st.card, marginBottom: '1.5rem' }}>
              <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '14px' }}>✉️ {t('club_inviter_email_titre', lang)}</p>
              <p style={{ margin: '0 0 10px', fontSize: '12px', color: colors.text.dim }}>{t('club_inviter_email_desc_avant', lang)} {ROLE_STAFF_LABEL(roleAAssigner)}.</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  style={{ ...st.input, flex: 1 }}
                  type="email"
                  placeholder="email@exemple.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && inviterStaff()}
                />
                <button onClick={inviterStaff} disabled={invitingStaff || !inviteEmail.trim()} style={{ ...st.btnSolid, fontSize: '12px', padding: '6px 14px', opacity: invitingStaff || !inviteEmail.trim() ? 0.5 : 1 }}>
                  {invitingStaff ? '...' : `📨 ${t('club_inviter', lang)}`}
                </button>
              </div>
              {inviteMessage && (
                <p style={{ margin: '10px 0 0', fontSize: '12px', color: inviteMessage.type === 'ok' ? colors.accent.green : colors.accent.red }}>
                  {inviteMessage.type === 'ok' ? '✅' : '⚠️'} {inviteMessage.texte}
                </p>
              )}
            </div>
            </>
            )}

            <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '13px', color: couleurPrincipale }}>👥 {t('club_membres_staff_titre', lang)} ({staffMembers.length + 1})</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ ...st.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1a2e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: couleurPrincipale, fontWeight: 700, fontSize: '12px' }}>
                    {(club?.club || club?.prenom || '?')[0]}
                  </div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>{club?.club || club?.prenom} <span style={{ color: colors.text.faint, fontWeight: 400 }}>{t('club_vous', lang)}</span></p>
                </div>
                <span style={{ background: couleurPrincipale + '15', border: `1px solid ${couleurPrincipale}40`, color: couleurPrincipale, padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700 }}>{t('club_president_badge', lang)}</span>
              </div>
              {staffMembers.map(m => (
                <div key={m.id} style={{ ...st.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.accent.blue, fontWeight: 700, fontSize: '12px' }}>
                      {m.membre?.prenom?.[0]}{m.membre?.nom?.[0]}
                    </div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>{m.membre?.prenom} {m.membre?.nom}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {canEditSection('staff') ? (
                      <>
                        <select style={{ ...st.input, width: 'auto' }} value={m.role} onChange={e => modifierRoleStaff(m.id, e.target.value)}>
                          {rolesAssignables.map(r => <option key={r.val} value={r.val}>{r.label}</option>)}
                        </select>
                        <button onClick={() => retirerStaff(m.id)} style={{ ...st.btnSecondary, color: colors.accent.red, borderColor: colors.accent.red + alpha.medium }}>{t('club_retirer', lang)}</button>
                      </>
                    ) : (
                      <span style={{ fontSize: '12px', color: colors.text.dim }}>{ROLE_STAFF_LABEL(m.role)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          )
        })()}

        {activeTab === 'inventaire' && canViewSection('inventaire') && (() => {
          // equipe_joueurs.categorie est un champ texte libre, pas toujours fiable
          // (mêmes causes que le fix "Effectif U17 A vide" de chargerClassements) —
          // la source de vérité est club_categorie_id, avec le même repli par
          // correspondance de nom (équipe 'A' par défaut, ou candidat unique) que
          // chargerClassements, pour ne pas dépendre d'avoir déjà ouvert l'onglet
          // Classements pour que la catégorie résolue soit correcte ici aussi.
          const resoudreCategorie = (j) => {
            if (j.club_categorie_id) return categories.find(c => c.id === j.club_categorie_id)?.nom || null
            if (!j.categorie) return null
            const candidats = categories.filter(c => c.educateur_id === j.educateur_id && c.nom.toLowerCase() === j.categorie.trim().toLowerCase())
            const cat = candidats.find(c => c.equipe === 'A') || (candidats.length === 1 ? candidats[0] : null)
            return cat?.nom || null
          }
          const personnes = [
            ...joueursInventaire.map(j => { const cat = resoudreCategorie(j); return { id: j.id, nom: `${j.prenom} ${j.nom}`.trim(), sousLabel: cat || j.poste || '', type: 'joueur', categorie: cat } }),
            ...staffMembers.map(m => ({ id: m.user_id, nom: `${m.membre?.prenom || ''} ${m.membre?.nom || ''}`.trim(), sousLabel: ROLE_STAFF_LABEL(m.role), type: 'educateur', categorie: null })),
          ]
          // Catégories réellement configurées par le club (club_categories), pas
          // seulement celles qui ont déjà un joueur affecté dans equipe_joueurs —
          // sinon une catégorie fraîchement créée (ex: U20) sans joueur assigné
          // n'apparaîtrait jamais dans le filtre. Le staff (categorie=null) reste
          // toujours affiché quel que soit le filtre, une catégorie d'équipe
          // n'ayant pas de sens pour lui.
          const categoriesDisponibles = [...new Set(categories.map(c => c.nom).filter(Boolean))].sort()
          const personnesFiltrees = filtreCategorieEquipement === 'tous' ? personnes : personnes.filter(p => p.categorie === null || p.categorie === filtreCategorieEquipement)
          const STATUT_DISTRIB = {
            distribue:        { label: 'Distribué',        color: colors.accent.blue },
            remise_demandee:  { label: 'Remise demandée',  color: colors.accent.amber },
            remis:            { label: 'Remis',            color: colors.accent.green },
            refuse:           { label: 'Refusé',            color: colors.accent.red },
          }
          return (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
              <button onClick={() => setInventaireVue('equipement')} style={inventaireVue === 'equipement' ? st.btnSolid : st.btnSecondary}>👕 Équipement</button>
              <button onClick={() => setInventaireVue('materiel')} style={inventaireVue === 'materiel' ? st.btnSolid : st.btnSecondary}>⚽ Matériel</button>
            </div>

            {inventaireVue === 'equipement' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: colors.text.dim }}>Attribution de packs par joueur/staff — {equipementChamps.length} champ(s) configuré(s).</p>
                  {canEditSection('inventaire') && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button onClick={() => setModaleChampOuverte(true)} style={st.btnSecondary}>+ Champ de taille</button>
                    </div>
                  )}
                </div>

                {/* Champs configurés — la table détaillée par champ a été remplacée
                    par l'attribution de packs ci-dessous ; cette liste reste le seul
                    endroit où gérer/supprimer un champ individuel. */}
                {equipementChamps.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {equipementChamps.map(c => (
                      <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: colors.background.raised, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '5px 10px', fontSize: '12px', color: colors.text.dim }}>
                        {c.nom} <span style={{ color: colors.text.faint, fontSize: '10px' }}>({c.cible === 'les deux' ? 'tous' : c.cible === 'joueur' ? 'joueurs' : 'éducateurs'})</span>
                        {canEditSection('inventaire') && <button onClick={() => supprimerChampEquipement(c.id)} style={{ background: 'none', border: 'none', color: colors.accent.red, cursor: 'pointer', fontSize: '11px', padding: 0 }}>✕</button>}
                      </span>
                    ))}
                  </div>
                )}

                {/* Packs configurables — regroupements nommés de champs déjà créés */}
                {(equipementPacks.length > 0 || canEditSection('inventaire')) && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
                    {equipementPacks.map(pack => (
                      <div key={pack.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px', background: colors.background.raised, border: `1px solid ${pack.couleur}40`, borderRadius: '8px', padding: '6px 10px' }}>
                        <span style={{ fontSize: '14px' }}>{pack.icone}</span>
                        <span style={{ color: pack.couleur, fontSize: '12px', fontWeight: 600 }}>{pack.nom}</span>
                        <span style={{ color: colors.text.faint, fontSize: '11px' }}>({pack.champs_ids.length})</span>
                        {canEditSection('inventaire') && (
                          <button onClick={() => setPackMenuOuvert(packMenuOuvert === pack.id ? null : pack.id)} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '13px', cursor: 'pointer', padding: '0 2px', fontWeight: 700 }}>⋮</button>
                        )}
                        {packMenuOuvert === pack.id && (
                          <>
                            <div onClick={() => setPackMenuOuvert(null)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '8px', overflow: 'hidden', zIndex: 11, minWidth: '140px', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
                              <button onClick={() => { setPackMenuOuvert(null); ouvrirEditionPack(pack) }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: colors.text.secondary, fontSize: '12px', padding: '9px 12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Modifier</button>
                              <button onClick={() => supprimerPackDepuisMenu(pack)} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderTop: `1px solid ${colors.border.default}`, color: colors.accent.red, fontSize: '12px', padding: '9px 12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Supprimer</button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    {canEditSection('inventaire') && (
                      <button onClick={ouvrirNouveauPack} style={{ background: colors.background.raised, border: `1px dashed ${colors.border.default}`, color: colors.text.faint, padding: '6px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>+ Nouveau pack</button>
                    )}
                  </div>
                )}

                {/* Filtre par catégorie d'équipe */}
                {categoriesDisponibles.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
                    <span style={{ color: colors.text.faint, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Catégorie :</span>
                    {['tous', ...categoriesDisponibles].map(cat => (
                      <button key={cat} onClick={() => setFiltreCategorieEquipement(cat)}
                        style={{ padding: '5px 12px', borderRadius: '6px', border: `1px solid ${filtreCategorieEquipement === cat ? colors.accent.green : colors.border.default}`, background: filtreCategorieEquipement === cat ? colors.accent.green + alpha.subtle : colors.background.raised, color: filtreCategorieEquipement === cat ? colors.accent.green : colors.text.faint, fontSize: '12px', fontWeight: filtreCategorieEquipement === cat ? 700 : 400, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                        {cat === 'tous' ? 'Toutes' : cat}
                      </button>
                    ))}
                  </div>
                )}

                {personnesFiltrees.length === 0 ? (
                  <p style={{ color: colors.text.disabled, fontSize: '13px', fontStyle: 'italic' }}>Personne à afficher.</p>
                ) : (() => {
                  // Joueurs groupés par catégorie d'équipe, staff regroupé à part
                  // (une catégorie d'équipe n'a pas de sens pour lui) — affiché en
                  // dernier.
                  const groupes = []
                  const parGroupe = {}
                  personnesFiltrees.forEach(p => {
                    const cle = p.type === 'joueur' ? (p.categorie || 'Sans catégorie') : 'Staff'
                    if (!parGroupe[cle]) { parGroupe[cle] = []; groupes.push(cle) }
                    parGroupe[cle].push(p)
                  })
                  groupes.sort((a, b) => a === 'Staff' ? 1 : b === 'Staff' ? -1 : a.localeCompare(b))
                  // Un pack ciblant 'joueur'/'educateur' ne se propose qu'au public
                  // concerné ; toute autre cible (les deux, dirigeant...) reste
                  // proposée au staff uniquement si ce n'est pas 'joueur' strictement.
                  const packsPourPersonne = (personne) => equipementPacks.filter(pack => pack.cible === 'les deux' || pack.cible === personne.type || (pack.cible !== 'joueur' && personne.type === 'educateur'))

                  return (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${colors.border.default}` }}>
                          <th style={{ textAlign: 'left', padding: '8px', color: colors.text.dim }}>Personne</th>
                          <th style={{ textAlign: 'left', padding: '8px', color: colors.text.dim }}>Pack attribué</th>
                          {canEditSection('inventaire') && <th style={{ textAlign: 'left', padding: '8px', color: colors.text.dim }}>Statut</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {groupes.map(groupe => (
                          <Fragment key={groupe}>
                            <tr>
                              <td colSpan={3} style={{ background: colors.background.raised, color: colors.accent.green, fontWeight: 700, fontSize: '12px', padding: '10px 12px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                                {groupe} — {parGroupe[groupe].length} personne{parGroupe[groupe].length > 1 ? 's' : ''}
                              </td>
                            </tr>
                            {parGroupe[groupe].map(p => {
                              const commande = equipementCommandes.find(c => c.destinataire_id === p.id)
                              const packAttribue = equipementAttributions.find(a => a.user_id === p.id)?.pack_id || ''
                              return (
                              <tr key={p.id} style={{ borderBottom: `1px solid ${colors.border.default}40` }}>
                                <td style={{ padding: '8px' }}>
                                  <p style={{ margin: 0, fontWeight: 600 }}>{p.nom}</p>
                                  {p.sousLabel && <p style={{ margin: 0, fontSize: '11px', color: colors.text.faint }}>{p.sousLabel}</p>}
                                </td>
                                <td style={{ padding: '8px' }}>
                                  {canEditSection('inventaire') ? (
                                    <select value={packAttribue} onChange={e => attribuerPack(p.id, e.target.value)} style={{ ...st.input, width: 'auto', padding: '4px 8px' }}>
                                      <option value="">— Aucun pack —</option>
                                      {packsPourPersonne(p).map(pack => <option key={pack.id} value={pack.id}>{pack.icone} {pack.nom}</option>)}
                                    </select>
                                  ) : (equipementPacks.find(pack => pack.id === packAttribue)?.nom || '—')}
                                </td>
                                {canEditSection('inventaire') && (
                                  <td style={{ padding: '8px' }}>
                                    {commande ? (
                                      <span style={{ fontSize: '11px', fontWeight: 700, color: commande.statut === 'pret' ? colors.accent.amber : colors.accent.green }}>{commande.statut === 'pret' ? 'Prêt' : 'Récupéré'}</span>
                                    ) : (
                                      <button onClick={() => ouvrirPreparation(p)} style={{ ...st.btnSecondary, padding: '4px 10px', fontSize: '12px' }}>Préparer</button>
                                    )}
                                  </td>
                                )}
                              </tr>
                              )
                            })}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  )
                })()}
              </div>
            )}

            {inventaireVue === 'materiel' && (() => {
              // Regroupe les lignes materiel_distribution par lot_id (une même
              // action de distribution avec plusieurs articles) — les lignes sans
              // lot_id (anciennes distributions, un seul article) forment chacune
              // leur propre groupe.
              const lots = []
              const lotsParId = {}
              materielDistribution.forEach(d => {
                const cle = d.lot_id || d.id
                if (!lotsParId[cle]) { lotsParId[cle] = { cle, items: [], ref: d }; lots.push(lotsParId[cle]) }
                lotsParId[cle].items.push(d)
              })

              return (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>Stock du club</p>
                  {canEditSection('inventaire') && <button onClick={() => setModalCatalogue(true)} style={st.btnSecondary}>Gérer le catalogue</button>}
                </div>
                <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${colors.border.default}` }}>
                        <th style={{ textAlign: 'left', padding: '8px', color: colors.text.dim }}>Catégorie</th>
                        <th style={{ textAlign: 'left', padding: '8px', color: colors.text.dim }}>Matériel</th>
                        <th style={{ textAlign: 'left', padding: '8px', color: colors.text.dim }}>Quantité</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materielCatalogue.map(item => {
                        const s = materielStock.find(st2 => st2.catalogue_id === item.id)
                        return (
                          <tr key={item.id} style={{ borderBottom: `1px solid ${colors.border.default}40` }}>
                            <td style={{ padding: '8px', color: colors.text.faint }}>{item.categorie}</td>
                            <td style={{ padding: '8px' }}>{item.nom}</td>
                            <td style={{ padding: '8px' }}>
                              {canEditSection('inventaire') ? (
                                <input type="number" min="0" defaultValue={s?.quantite_totale || 0} onBlur={e => mettreAJourStockMateriel(item.id, Math.max(0, Number(e.target.value) || 0))} style={{ ...st.input, width: '80px', padding: '4px 8px' }} />
                              ) : (s?.quantite_totale || 0)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {canEditSection('inventaire') && (
                  <>
                    <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: '14px' }}>Distribuer du matériel</p>
                    <div style={{ ...st.card, marginBottom: '2rem' }}>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '14px' }}>
                        <div>
                          <label style={st.label}>Éducateur</label>
                          <select value={distributionForm.educateur_id} onChange={e => setDistributionForm(f => ({ ...f, educateur_id: e.target.value }))} style={{ ...st.input, width: 'auto' }}>
                            <option value="">Choisir...</option>
                            {educateursAffilies.map(e => <option key={e.educateur_id} value={e.educateur_id}>{e.educateur?.prenom} {e.educateur?.nom}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={st.label}>Équipe</label>
                          <input value={distributionForm.equipe_nom} onChange={e => setDistributionForm(f => ({ ...f, equipe_nom: e.target.value }))} placeholder="Ex : U15 A" style={{ ...st.input, width: '120px' }} />
                        </div>
                        <div>
                          <label style={st.label}>Saison</label>
                          <input value={distributionForm.saison} onChange={e => setDistributionForm(f => ({ ...f, saison: e.target.value }))} placeholder="2025-2026" style={{ ...st.input, width: '110px' }} />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '14px' }}>
                        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '200px' }}>
                          <label style={st.label}>Article</label>
                          <input
                            placeholder="Rechercher un article..."
                            value={rechercheArticle}
                            onChange={e => { setRechercheArticle(e.target.value); setShowSuggestionsArticle(true); setArticleAjoutForm(f => ({ ...f, catalogue_id: '' })) }}
                            onFocus={() => setShowSuggestionsArticle(true)}
                            onBlur={() => setTimeout(() => setShowSuggestionsArticle(false), 150)}
                            style={{ ...st.input, border: articleAjoutForm.catalogue_id ? `1px solid ${colors.accent.green}` : st.input.border }}
                          />
                          {showSuggestionsArticle && rechercheArticle.length >= 1 && (() => {
                            const suggestions = materielCatalogue.filter(c => c.nom.toLowerCase().includes(rechercheArticle.toLowerCase()) || c.categorie.toLowerCase().includes(rechercheArticle.toLowerCase())).slice(0, 10)
                            if (suggestions.length === 0) return null
                            return (
                              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '8px', zIndex: 100, maxHeight: '220px', overflowY: 'auto', marginTop: '4px' }}>
                                {suggestions.map(item => (
                                  <div key={item.id}
                                    onMouseDown={() => { setArticleAjoutForm(f => ({ ...f, catalogue_id: item.id })); setRechercheArticle(item.nom); setShowSuggestionsArticle(false) }}
                                    style={{ padding: '9px 14px', cursor: 'pointer', borderBottom: `1px solid ${colors.border.default}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: colors.text.secondary, fontSize: '13px' }}>{item.nom}</span>
                                    <span style={{ color: colors.text.faint, fontSize: '11px' }}>{item.categorie} · {item.unite}</span>
                                  </div>
                                ))}
                              </div>
                            )
                          })()}
                        </div>
                        <div>
                          <label style={st.label}>Quantité</label>
                          <input type="number" min="1" value={articleAjoutForm.quantite} onChange={e => setArticleAjoutForm(f => ({ ...f, quantite: e.target.value }))} style={{ ...st.input, width: '70px' }} />
                        </div>
                        <button onClick={ajouterAuPanierMateriel} style={st.btnSecondary}>Ajouter au panier</button>
                      </div>

                      {panierMateriel.length > 0 && (
                        <div style={{ background: colors.background.raised, borderRadius: '10px', padding: '12px 14px', marginBottom: '14px' }}>
                          <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: colors.text.faint, textTransform: 'uppercase' }}>Panier — {panierMateriel.length} article{panierMateriel.length > 1 ? 's' : ''}</p>
                          {panierMateriel.map(item => (
                            <div key={item.catalogue_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${colors.border.default}40` }}>
                              <span style={{ fontSize: '13px', color: colors.text.secondary }}>{item.nom}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: colors.accent.green }}>{item.quantite} {item.unite}</span>
                                <button onClick={() => retirerDuPanierMateriel(item.catalogue_id)} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '13px', cursor: 'pointer' }}>✕</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <button onClick={distribuerMateriel} disabled={!distributionForm.educateur_id || !distributionForm.saison.trim() || panierMateriel.length === 0}
                        style={{ ...st.btnSolid, opacity: (!distributionForm.educateur_id || !distributionForm.saison.trim() || panierMateriel.length === 0) ? 0.5 : 1 }}>
                        Distribuer{panierMateriel.length > 0 ? ` (${panierMateriel.length})` : ''}
                      </button>
                    </div>
                  </>
                )}

                <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: '14px' }}>Matériel distribué ({lots.length})</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {lots.length === 0 && <p style={{ color: colors.text.disabled, fontSize: '13px', fontStyle: 'italic' }}>Aucune distribution pour l'instant.</p>}
                  {lots.map(lot => {
                    const d = lot.ref
                    const stConf = STATUT_DISTRIB[d.statut] || STATUT_DISTRIB.distribue
                    return (
                      <div key={lot.cle} style={st.card}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
                          <div>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{d.educateur_nom}{d.equipe_nom ? ` — ${d.equipe_nom}` : ''}</p>
                            <p style={{ margin: 0, fontSize: '11px', color: colors.text.faint }}>Saison {d.saison}</p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: stConf.color }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: stConf.color, display: 'inline-block' }} />{stConf.label}</span>
                            {canEditSection('inventaire') && d.statut === 'remise_demandee' && (
                              <>
                                <button onClick={() => validerRemiseMateriel(d)} style={{ ...st.btnSecondary, padding: '4px 10px', fontSize: '12px', color: colors.accent.green, borderColor: colors.accent.green + alpha.medium }}>Valider</button>
                                <button onClick={() => refuserRemiseMateriel(d)} style={{ ...st.btnSecondary, padding: '4px 10px', fontSize: '12px', color: colors.accent.red, borderColor: colors.accent.red + alpha.medium }}>Refuser</button>
                              </>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {lot.items.map(item => (
                            <p key={item.id} style={{ margin: 0, fontSize: '12px', color: colors.text.dim }}>{item.nom_materiel} × {item.quantite}</p>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              )
            })()}
          </div>
          )
        })()}
      </div>

      {/* Modale ajout d'un champ de taille équipement */}
      {modaleChampOuverte && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ ...st.card, width: '100%', maxWidth: '420px' }}>
            <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: '15px' }}>Nouveau champ de taille</p>
            <label style={st.label}>Nom (ex : Survêtement)</label>
            <input value={nouveauChamp.nom} onChange={e => setNouveauChamp(f => ({ ...f, nom: e.target.value }))} style={{ ...st.input, marginBottom: '12px' }} />
            <label style={st.label}>Pour qui ?</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              {[
                { val: 'joueur', label: '⚽ Joueurs' },
                { val: 'educateur', label: '📋 Éducateurs' },
                { val: 'les deux', label: '👥 Les deux' },
              ].map(opt => (
                <button key={opt.val} type="button" onClick={() => setNouveauChamp(f => ({ ...f, cible: opt.val }))}
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `1px solid ${nouveauChamp.cible === opt.val ? colors.accent.green : colors.border.default}`, background: nouveauChamp.cible === opt.val ? colors.accent.green + alpha.subtle : colors.background.raised, color: nouveauChamp.cible === opt.val ? colors.accent.green : colors.text.faint, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  {opt.label}
                </button>
              ))}
            </div>
            <label style={st.label}>Options (séparées par des virgules)</label>
            <input value={nouveauChamp.options} onChange={e => setNouveauChamp(f => ({ ...f, options: e.target.value }))} placeholder="Ex : XS, S, M, L, XL, XXL" style={{ ...st.input, marginBottom: '16px' }} />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setModaleChampOuverte(false)} style={st.btnSecondary}>Annuler</button>
              <button onClick={ajouterChampEquipement} style={st.btnSolid}>Ajouter</button>
            </div>
          </div>
        </div>
      )}

      {/* Modale gestion du catalogue matériel — articles globaux (lecture seule)
          + articles personnalisés du club (ajout/désactivation) */}
      {modalCatalogue && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ ...st.card, width: '100%', maxWidth: '520px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '15px' }}>Gérer le catalogue</p>
              <button onClick={() => setModalCatalogue(false)} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            {(() => {
              const categoriesExistantes = [...new Set(materielCatalogue.map(c => c.categorie))].sort()
              return (
            <div style={{ background: colors.background.raised, borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
              <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 700, color: colors.text.faint, textTransform: 'uppercase' }}>Ajouter un article</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <select value={categorieEstNouvelle ? '__new__' : nouvelArticleCatalogue.categorie}
                  onChange={e => { if (e.target.value === '__new__') { setCategorieEstNouvelle(true); setNouvelArticleCatalogue(p => ({ ...p, categorie: '' })) } else { setCategorieEstNouvelle(false); setNouvelArticleCatalogue(p => ({ ...p, categorie: e.target.value })) } }}
                  style={{ ...st.input, flex: '1 1 160px' }}>
                  <option value="">Sélectionner une catégorie</option>
                  {categoriesExistantes.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  <option value="__new__">+ Nouvelle catégorie</option>
                </select>
                <input placeholder="Unité (ex : unité, lot de 10)" value={nouvelArticleCatalogue.unite} onChange={e => setNouvelArticleCatalogue(p => ({ ...p, unite: e.target.value }))} style={{ ...st.input, flex: '1 1 160px' }} />
              </div>
              {categorieEstNouvelle && (
                <input placeholder="Nom de la nouvelle catégorie" value={nouvelArticleCatalogue.categorie} onChange={e => setNouvelArticleCatalogue(p => ({ ...p, categorie: e.target.value }))} style={{ ...st.input, marginBottom: '8px' }} />
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input placeholder="Nom de l'article" value={nouvelArticleCatalogue.nom} onChange={e => setNouvelArticleCatalogue(p => ({ ...p, nom: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && ajouterArticleCatalogue()} style={{ ...st.input, flex: 1 }} />
                <button onClick={ajouterArticleCatalogue} style={st.btnSolid}>Ajouter</button>
              </div>
            </div>
              )
            })()}

            {Object.entries(materielCatalogue.reduce((acc, item) => { (acc[item.categorie] ||= []).push(item); return acc }, {})).map(([categorie, items]) => (
              <div key={categorie} style={{ marginBottom: '14px' }}>
                <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 700, color: colors.text.faint, textTransform: 'uppercase' }}>{categorie}</p>
                {items.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '6px', background: colors.background.raised, marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: colors.text.secondary }}>{item.nom} <span style={{ color: colors.text.faint, fontSize: '11px' }}>({item.unite})</span></span>
                    <button onClick={() => retirerArticleCatalogue(item)} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '12px', cursor: 'pointer', padding: '2px 6px' }}>Retirer</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modale création/édition d'un pack équipement configurable */}
      {modalPack && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ ...st.card, width: '100%', maxWidth: '480px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '15px' }}>{packEnEdition ? 'Modifier le pack' : 'Créer un pack'}</p>
              <button onClick={() => setModalPack(false)} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <input placeholder="Icône" value={packForm.icone} onChange={e => setPackForm(p => ({ ...p, icone: e.target.value }))}
                style={{ ...st.input, width: '64px', textAlign: 'center', fontSize: '18px' }} />
              <input placeholder="Nom du pack" value={packForm.nom} onChange={e => setPackForm(p => ({ ...p, nom: e.target.value }))} style={{ ...st.input, flex: 1 }} />
              <input type="color" value={packForm.couleur} onChange={e => setPackForm(p => ({ ...p, couleur: e.target.value }))} style={{ width: '44px', height: '40px', padding: '2px', background: colors.background.raised, border: `1px solid ${colors.border.default}`, borderRadius: '8px', cursor: 'pointer' }} />
            </div>

            <label style={st.label}>Pour qui</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {[
                { val: 'joueur', label: '⚽ Joueurs' },
                { val: 'educateur', label: '📋 Éducateurs' },
                { val: 'dirigeant', label: '🏛️ Dirigeants' },
                { val: 'les deux', label: '👥 Mixte' },
              ].map(opt => (
                <button key={opt.val} type="button" onClick={() => setPackForm(p => ({ ...p, cible: opt.val }))}
                  style={{ padding: '7px 12px', borderRadius: '8px', border: `1px solid ${packForm.cible === opt.val ? colors.accent.green : colors.border.default}`, background: packForm.cible === opt.val ? colors.accent.green + alpha.subtle : colors.background.raised, color: packForm.cible === opt.val ? colors.accent.green : colors.text.faint, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  {opt.label}
                </button>
              ))}
            </div>

            <label style={st.label}>Champs inclus ({packForm.champs_ids.length} sélectionné(s))</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px', marginTop: '8px' }}>
              {equipementChamps.length === 0 ? (
                <p style={{ fontSize: '12px', color: colors.text.disabled, fontStyle: 'italic' }}>Crée d'abord des champs de taille avant de les regrouper en pack.</p>
              ) : equipementChamps.map(champ => {
                const selectionne = packForm.champs_ids.includes(champ.id)
                return (
                  <div key={champ.id} onClick={() => setPackForm(p => ({ ...p, champs_ids: selectionne ? p.champs_ids.filter(id => id !== champ.id) : [...p.champs_ids, champ.id] }))}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderRadius: '8px', border: `1px solid ${selectionne ? colors.accent.green + '60' : colors.border.default}`, background: selectionne ? colors.accent.green + alpha.subtle : colors.background.raised, cursor: 'pointer' }}>
                    <span style={{ color: selectionne ? colors.accent.green : colors.text.dim, fontSize: '13px' }}>
                      {champ.nom} <span style={{ color: colors.text.faint, fontSize: '11px' }}>({champ.cible === 'les deux' ? 'tous' : champ.cible === 'joueur' ? 'joueurs' : 'éducateurs'})</span>
                    </span>
                    <span style={{ color: selectionne ? colors.accent.green : colors.text.faint, fontSize: '15px' }}>{selectionne ? '✓' : '+'}</span>
                  </div>
                )
              })}
            </div>

            <div style={{ borderTop: `1px solid ${colors.border.default}`, paddingTop: '14px', marginBottom: '20px' }}>
              <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: colors.text.faint, textTransform: 'uppercase' }}>Créer un nouveau champ</p>
              <input placeholder="Nom du champ (ex : Kway, Sac, Parka...)" value={nouveauChampNom} onChange={e => setNouveauChampNom(e.target.value)} style={{ ...st.input, marginBottom: '8px' }} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <input placeholder="Options (ex : XS, S, M, L, XL)" value={nouveauChampOptions}
                  onChange={e => setNouveauChampOptions(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && ajouterNouveauChamp()}
                  style={{ ...st.input, flex: 1 }} />
                <button onClick={ajouterNouveauChamp} disabled={!nouveauChampNom.trim() || !nouveauChampOptions.trim() || creationChampLoading} style={{ ...st.btnSolid, opacity: (!nouveauChampNom.trim() || !nouveauChampOptions.trim() || creationChampLoading) ? 0.5 : 1, whiteSpace: 'nowrap' }}>
                  {creationChampLoading ? '...' : 'Ajouter'}
                </button>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '11px', color: colors.text.faint }}>Le champ sera créé avec ces options et ajouté automatiquement à ce pack.</p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {packEnEdition && <button onClick={() => supprimerPack(packEnEdition.id)} style={{ ...st.btnSecondary, color: colors.accent.red, borderColor: colors.accent.red + alpha.medium }}>Supprimer</button>}
              <div style={{ flex: 1 }} />
              <button onClick={() => setModalPack(false)} style={st.btnSecondary}>Annuler</button>
              <button onClick={sauvegarderPack} disabled={!packForm.nom.trim() || packForm.champs_ids.length === 0} style={{ ...st.btnSolid, opacity: (!packForm.nom.trim() || packForm.champs_ids.length === 0) ? 0.5 : 1 }}>
                {packEnEdition ? 'Enregistrer' : 'Créer le pack'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale préparation équipement + notification */}
      {modalePreparation && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ ...st.card, width: '100%', maxWidth: '460px' }}>
            <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '15px' }}>Préparer l'équipement</p>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: colors.text.dim }}>{modalePreparation.nom}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
              {modalePreparation.items.map(it => (
                <p key={it.champ_id} style={{ margin: 0, fontSize: '13px' }}>{it.champ_nom} : <strong>{it.valeur || '—'}</strong></p>
              ))}
            </div>
            <label style={st.label}>Jours de récupération</label>
            <input value={modalePreparation.jours} onChange={e => setModalePreparation(m => ({ ...m, jours: e.target.value }))} placeholder="Ex : Lundi et mercredi" style={{ ...st.input, marginBottom: '12px' }} />
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={st.label}>Heure début</label>
                <input type="time" value={modalePreparation.heure_debut} onChange={e => setModalePreparation(m => ({ ...m, heure_debut: e.target.value }))} style={st.input} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={st.label}>Heure fin</label>
                <input type="time" value={modalePreparation.heure_fin} onChange={e => setModalePreparation(m => ({ ...m, heure_fin: e.target.value }))} style={st.input} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setModalePreparation(null)} style={st.btnSecondary}>Annuler</button>
              <button onClick={marquerEquipementPret} style={st.btnSolid}>✅ Marquer prêt & notifier</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal gestion des permissions par rôle */}
      {showPermissionsModal && (
        <PermissionsModal
          rolePermissions={rolePermissions}
          roleCategoriesAccess={roleCategoriesAccess}
          saving={savingPermissions}
          onSave={sauvegarderPermissions}
          onClose={() => setShowPermissionsModal(false)}
          couleurPrincipale={couleurPrincipale}
        />
      )}

      {/* Modal notation éducateur */}
      {eduNoteModal && (
        <div onClick={() => setEduNoteModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: colors.background.base, border: '1px solid #1a1a1a', borderRadius: '20px', width: '100%', maxWidth: '640px', padding: '24px', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <p style={{ margin: '0 0 2px', fontWeight: 800, fontSize: '16px' }}>⭐ {t('club_evaluer', lang)} {eduNoteModal.educateur?.prenom} {eduNoteModal.educateur?.nom}</p>
              </div>
              <button onClick={() => setEduNoteModal(null)} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', color: colors.text.faint }}>{t('club_saison_evaluee', lang)}</label>
              <select value={eduNoteSaison} onChange={e => setEduNoteSaison(e.target.value)} style={{ background: colors.background.surface, border: '1px solid #2a2a2a', borderRadius: '8px', color: colors.text.primary, padding: '6px 10px', fontSize: '13px' }}>
                {['2025-2026', '2024-2025', '2023-2024'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
              {CRITERES_EDU.map(cat => (
                <div key={cat.key} style={{ background: colors.background.surface, borderRadius: '12px', padding: '14px', border: `1px solid ${cat.color}20` }}>
                  <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: '13px', color: cat.color }}>{cat.label}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {cat.criteres.map(c => (
                      <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ flex: 1, fontSize: '12px', color: colors.text.secondary }}>{c.label}</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {[1,2,3,4,5].map(n => (
                            <button key={n} onClick={() => setEduNoteCriteres(prev => ({ ...prev, [c.key]: n }))}
                              style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: (eduNoteCriteres[c.key] || 0) >= n ? cat.color : colors.border.default, padding: '2px', lineHeight: 1 }}>★</button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <textarea value={eduNoteCommentaire} onChange={e => setEduNoteCommentaire(e.target.value)}
              placeholder={t('club_commentaire_optionnel_placeholder', lang)}
              style={{ width: '100%', background: colors.background.surface, border: '1px solid #2a2a2a', borderRadius: '10px', padding: '10px 14px', color: colors.text.primary, fontSize: '13px', resize: 'vertical', minHeight: '80px', boxSizing: 'border-box', marginBottom: '16px' }} />

            <button onClick={soumettreNotationEducateur} disabled={savingEduNote || CRITERES_EDU.flatMap(c => c.criteres).some(c => !eduNoteCriteres[c.key])}
              style={{ width: '100%', background: couleurPrincipale, color: colors.black, border: 'none', borderRadius: '12px', padding: '14px', fontWeight: 800, fontSize: '14px', cursor: 'pointer', opacity: CRITERES_EDU.flatMap(c => c.criteres).every(c => eduNoteCriteres[c.key]) ? 1 : 0.4 }}>
              {savingEduNote ? `⏳ ${t('etat_envoi_cours', lang)}` : `✅ ${t('club_soumettre_evaluation', lang)}`}
            </button>
          </div>
        </div>
      )}

      {/* Modal grille évaluation séance */}
      {seanceEvalModal && (
        <ModalGrilleSeance
          seance={seanceEvalModal}
          onClose={() => setSeanceEvalModal(null)}
          onSubmit={soumettreGrilleEvaluation}
          evaluateurType="club"
        />
      )}

      {/* Modal effectif par poste */}
      {effectifModal && (() => {
        const catData = statsParCategorie[effectifModal]
        const cat = categories.find(c => c.id === effectifModal)
        return (
          <div onClick={() => { setEffectifModal(null); setJoueurDetail(null) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: colors.background.base, border: '1px solid #1a1a1a', borderRadius: '20px', width: '100%', maxWidth: '900px', padding: '24px', margin: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: '16px' }}>👥 {t('club_effectif', lang)} — {cat?.nom} {cat?.equipe}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', background: colors.background.surface, borderRadius: '8px', padding: '3px' }}>
                    {[['poste', `⊞ ${t('equipe_vue_postes', lang)}`], ['liste', `☰ ${t('equipe_vue_liste', lang)}`]].map(([v, label]) => (
                      <button key={v} onClick={() => setEffectifVue(v)}
                        style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif', background: effectifVue === v ? couleurPrincipale : 'transparent', color: effectifVue === v ? colors.black : colors.text.faint, transition: 'all 0.15s' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => { setEffectifModal(null); setJoueurDetail(null) }} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '20px', cursor: 'pointer' }}>✕</button>
                </div>
              </div>

              {!catData ? (
                <p style={{ color: couleurPrincipale, textAlign: 'center', padding: '2rem' }}>{t('jexp_chargement', lang)}</p>
              ) : catData.joueurs.length === 0 ? (
                <p style={{ color: colors.text.disabled, textAlign: 'center', padding: '2rem' }}>{t('club_aucun_joueur_categorie_court', lang)}</p>
              ) : effectifVue === 'liste' ? (() => {
                const getGroupeIndex = (poste) => {
                  const idx = GROUPES_POSTE.findIndex(g => g.match(poste))
                  return idx === -1 ? GROUPES_POSTE.length : idx
                }
                const joueursTries = [...catData.joueurs].sort((a, b) => getGroupeIndex(a.poste) - getGroupeIndex(b.poste))

                return (
                  <div style={{ ...st.card, overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                          {['#', t('equipe_col_joueur', lang), t('equipe_poste', lang), t('comp_buts', lang), t('recrut_passes', lang), t('recrut_matchs', lang), t('stats_col_presence', lang), t('club_note_court', lang)].map((h, hi) => (
                            <th key={h} style={{ padding: '10px 12px', textAlign: hi === 1 || hi === 2 ? 'left' : 'center', color: colors.text.faint, fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {joueursTries.map(j => {
                          const groupe = GROUPES_POSTE.find(g => g.match(j.poste)) || GROUPES_POSTE[GROUPES_POSTE.length - 1]
                          return (
                            <tr key={j.id} onClick={() => setJoueurDetail(j.id)} style={{ borderBottom: '1px solid #141414', cursor: 'pointer' }}>
                              <td style={{ padding: '10px 12px', textAlign: 'center', color: colors.text.faint, fontWeight: 700 }}>{j.numero_maillot || '—'}</td>
                              <td style={{ padding: '10px 12px', fontWeight: 700 }}>{j.prenom} {j.nom}</td>
                              <td style={{ padding: '10px 12px' }}><span style={{ color: groupe.color, fontSize: '12px' }}>{j.poste || '—'}</span></td>
                              <td style={{ padding: '10px 12px', textAlign: 'center', color: colors.accent.green, fontWeight: 700 }}>{j.stats.buts}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'center', color: colors.accent.blue, fontWeight: 700 }}>{j.stats.passes}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'center', color: colors.accent.purpleLight, fontWeight: 700 }}>{j.stats.matchsJoues}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                {j.stats.tauxPresence !== null ? <span style={{ color: j.stats.tauxPresence >= 80 ? colors.accent.green : '#f59e0b', fontSize: '12px' }}>{j.stats.tauxPresence}%</span> : <span style={{ color: colors.border.strong }}>—</span>}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                {j.stats.noteGlobale !== null ? <span style={{ color: '#f59e0b', fontSize: '12px' }}>{j.stats.noteGlobale.toFixed(1)}/5</span> : <span style={{ color: colors.border.strong }}>—</span>}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })() : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {GROUPES_POSTE.map(groupe => {
                    const joueursGroupe = catData.joueurs.filter(j => groupe.match(j.poste))
                    if (joueursGroupe.length === 0) return null
                    return (
                      <div key={groupe.label}>
                        <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '13px', color: groupe.color }}>{groupe.label} ({joueursGroupe.length})</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                          {joueursGroupe.map(j => (
                            <div key={j.id} onClick={() => setJoueurDetail(j.id)} style={{ background: colors.background.surface, border: `1px solid ${groupe.color}20`, borderRadius: '12px', padding: '14px', cursor: 'pointer' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: groupe.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', color: groupe.color, fontWeight: 800, fontSize: '12px', flexShrink: 0 }}>
                                  {j.numero_maillot || `${j.prenom?.[0] || ''}${j.nom?.[0] || ''}`}
                                </div>
                                <div>
                                  <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{j.prenom} {j.nom}</p>
                                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.faint }}>{j.poste || '—'}</p>
                                </div>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '6px' }}>
                                {[
                                  { label: t('comp_buts', lang), val: j.stats.buts, color: colors.accent.green },
                                  { label: t('recrut_passes', lang), val: j.stats.passes, color: colors.accent.blue },
                                  { label: t('recrut_matchs', lang), val: j.stats.matchsJoues, color: colors.accent.purpleLight },
                                ].map(s => (
                                  <div key={s.label} style={{ background: colors.background.base, borderRadius: '8px', padding: '6px', textAlign: 'center' }}>
                                    <p style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: s.color }}>{s.val}</p>
                                    <p style={{ margin: 0, fontSize: '9px', color: colors.text.faint, textTransform: 'uppercase' }}>{s.label}</p>
                                  </div>
                                ))}
                              </div>
                              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                                {j.stats.tauxPresence !== null && (
                                  <span style={{ fontSize: '11px', color: j.stats.tauxPresence >= 80 ? colors.accent.green : '#f59e0b' }}>🏃 {j.stats.tauxPresence}%</span>
                                )}
                                {j.stats.pointsSeance > 0 && <span style={{ fontSize: '11px', color: colors.accent.amber }}>⭐ {j.stats.pointsSeance}</span>}
                                {j.stats.noteGlobale !== null && <span style={{ fontSize: '11px', color: '#f59e0b' }}>📝 {j.stats.noteGlobale.toFixed(1)}/5</span>}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setJoueurDetail(j.id)
                                }}
                                style={{
                                  marginTop: '8px',
                                  background: '#166534',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '4px 12px',
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  width: '100%',
                                }}
                              >
                                📊 {t('club_data', lang)}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Modal fiche individuelle joueur */}
      {joueurDetail && effectifModal && (() => {
        const catData = statsParCategorie[effectifModal]
        const j = catData?.joueurs.find(x => x.id === joueurDetail)
        if (!j) return null
        const s = j.stats

        const moisSet = new Set()
        catData.joueurs.forEach(jj => jj.stats.presenceMensuelle.forEach(m => moisSet.add(m.month)))
        const positionParMois = [...moisSet].sort().map(month => {
          const classement = catData.joueurs
            .map(jj => ({ id: jj.id, points: jj.stats.presenceMensuelle.find(m => m.month === month)?.points || 0 }))
            .sort((a, b) => b.points - a.points)
          const label = new Date(month + '-02').toLocaleDateString(localeOf(lang), { month: 'short', year: '2-digit' })
          return {
            month, label,
            rank: classement.findIndex(c => c.id === j.id) + 1,
            total: classement.length,
            points: classement.find(c => c.id === j.id)?.points || 0,
          }
        })

        return (
          <div onClick={() => setJoueurDetail(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 2100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: colors.background.base, border: '1px solid #1a1a1a', borderRadius: '20px', width: '100%', maxWidth: '640px', padding: '24px', margin: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <p style={{ margin: '0 0 2px', fontWeight: 800, fontSize: '16px' }}>{j.prenom} {j.nom}</p>
                  <p style={{ margin: 0, fontSize: '12px', color: colors.text.faint }}>{j.poste || '—'}{j.numero_maillot ? ` · #${j.numero_maillot}` : ''}</p>
                </div>
                <button onClick={() => setJoueurDetail(null)} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '20px', cursor: 'pointer' }}>✕</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '1.5rem' }}>
                <StatCard label={`⚽ ${t('comp_buts', lang)}`} valeur={s.buts} />
                <StatCard label={`🎯 ${t('club_passes_dec_emoji', lang)}`} valeur={s.passes} />
                <StatCard label={`🏃 ${t('jp_matchs_joues', lang)}`} valeur={s.matchsJoues} />
                <StatCard label={`✅ ${t('club_pct_victoires', lang)}`} valeur={s.tauxVictoire !== null ? `${s.tauxVictoire}%` : '—'} />
                <StatCard label={`🧤 ${t('jp_clean_sheets', lang)}`} valeur={s.cleanSheets} />
                <StatCard label={`🟨 ${t('club_cartons_j_court', lang)}`} valeur={s.cartonsJaunes} />
                <StatCard label={`🟥 ${t('club_cartons_r_court', lang)}`} valeur={s.cartonsRouges} />
                <StatCard label={`📋 ${t('club_presence_globale', lang)}`} valeur={s.tauxPresence !== null ? `${s.tauxPresence}%` : '—'} />
              </div>

              {/* Présence par mois */}
              {s.presenceMensuelle.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '13px', color: colors.accent.purpleLight }}>📅 {t('club_presence_par_mois', lang)}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {s.presenceMensuelle.map(({ month, taux, present, total }) => {
                      const label = new Date(month + '-02').toLocaleDateString(localeOf(lang), { month: 'short', year: '2-digit' })
                      const color = taux >= 80 ? colors.accent.green : taux >= 60 ? '#f59e0b' : colors.accent.red
                      return (
                        <div key={month} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: colors.text.faint, width: '44px', flexShrink: 0 }}>{label}</span>
                          <div style={{ flex: 1, height: '6px', background: colors.background.raised, borderRadius: '3px' }}>
                            <div style={{ width: `${taux}%`, height: '100%', background: color, borderRadius: '3px' }} />
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, color, width: '36px', textAlign: 'right', flexShrink: 0 }}>{taux}%</span>
                          <span style={{ fontSize: '10px', color: colors.text.disabled, flexShrink: 0 }}>{present}/{total}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Position points séance par mois */}
              {positionParMois.length > 0 && (
                <div>
                  <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '13px', color: colors.accent.amber }}>⭐ {t('club_position_points_mois', lang)}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {positionParMois.map(({ month, label, rank, total, points }) => (
                      <div key={month} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: colors.background.surface, borderRadius: '8px', padding: '8px 12px' }}>
                        <span style={{ fontSize: '11px', color: colors.text.faint }}>{label}</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: rank === 1 ? colors.accent.amber : colors.text.muted }}>#{rank}/{total} {rank === 1 ? '🏆' : ''}</span>
                        <span style={{ fontSize: '11px', color: colors.accent.amber }}>{points} {t('club_pts', lang)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

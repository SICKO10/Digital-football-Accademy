import { useState, useEffect, useRef, Fragment } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { supabase, signOutSafe } from '../supabase'
import Avatar from '../components/Avatar'
import Tactipad from '../components/Tactipad'
import { CATEGORIES } from '../lib/categories'
import AnalyseVideo from '../components/AnalyseVideo'
import GestionPrepPhysique from '../components/prepphysique/GestionPrepPhysique'
import GestionCloturesSaison from '../components/prepphysique/GestionCloturesSaison'
import Deplacements from '../components/Deplacements'
import PlanningTerrains from '../components/PlanningTerrains'
import CauserieAvantMatch from '../components/CauserieAvantMatch'
import SondageSemaine from '../components/SondageSemaine'
import StatsEquipe from '../components/StatsEquipe'
import NotationMatch from '../components/NotationMatch'
import TerrainsLiberesWidget from '../components/TerrainsLiberesWidget'
import DeplacementsAssignesWidget from '../components/DeplacementsAssignesWidget'
import PlanningSemaineWidget from '../components/PlanningSemaineWidget'
import AlertesPanel from '../components/AlertesPanel'
import { estimerDeplacement } from '../lib/mapbox'
import { effectifParDefautMatch } from '../lib/repartitionBus'
import OnboardingGuide from '../components/OnboardingGuide'
import FloatingHelper from '../components/FloatingHelper'
import ParrainageWidget from '../components/ParrainageWidget'
import { t, LANGS, localeOf } from '../lib/translations'
import { enqueueGroqRequest, libelleStatutGroq } from '../lib/groqQueue'
import { schemaExerciceIA } from '../lib/schemasSeanceIA'
import { sondageEstClos, sondageHeureCloture } from '../lib/sondage'
import { useLang } from '../hooks/useLang'
import { STRIPE_LINKS_EDU, stripeUrl } from '../lib/stripeLinks'
import { normaliserCle } from '../lib/excelImport'
import { notifierJoueur } from '../lib/notifications'
import { colors, alpha } from '../tokens'
import { useColors } from '../lib/theme'
import { ThemeToggleButton } from '../lib/ThemeProvider'

// Parcours d'onboarding du dashboard éducateur (guide "Cedinho") — chaque étape
// cible l'id d'un bouton de nav (toujours monté, contrairement au contenu de
// l'onglet actif). Voir OnboardingGuide.jsx pour le composant générique.
const EDUCATEUR_ONBOARDING_STEPS = [
  {
    id: 1,
    title: "Bienvenue sur Digital Football ! ⚽",
    message: "Je suis Cedinho, ton guide. Je vais te montrer les grandes sections de ton espace éducateur en 2 minutes.",
    targetId: null,
    position: "center",
  },
  {
    id: 2,
    title: "Mon Équipe",
    message: "Gère ton effectif, ajoute des joueurs, invite-les à rejoindre leur compte avec un code.",
    targetId: "nav-equipe",
    position: "bottom",
  },
  {
    id: 3,
    title: "Entraînements",
    message: "Planifie tes séances, envoie un sondage de présence à tes joueurs et suis qui a répondu.",
    targetId: "nav-entrainements",
    position: "bottom",
  },
  {
    id: 4,
    title: "Compétition",
    message: "Enregistre tes résultats, gère ton calendrier de matchs à venir et consulte le classement.",
    targetId: "nav-matchs",
    position: "bottom",
  },
  {
    id: 5,
    title: "Mes séances",
    message: "Rédige tes fiches de séance, scanne-les si tu les as sur papier, et archive-les pour les réutiliser.",
    targetId: "nav-mes_seances",
    position: "bottom",
  },
  {
    id: 6,
    title: "Bibliothèque",
    message: "Retrouve tous tes procédés d'entraînement enregistrés — jeux, exercices, situations, échauffements.",
    targetId: "nav-bibliotheque",
    position: "bottom",
  },
  {
    id: 7,
    title: "Analyse rapport",
    message: "Envoie et suis les analyses vidéo demandées pour tes joueurs.",
    targetId: "nav-analyse_video",
    position: "bottom",
  },
  {
    id: 8,
    title: "Évaluations",
    message: "Note chacun de tes joueurs sur des critères clés, saison après saison.",
    targetId: "nav-notes",
    position: "bottom",
  },
  {
    id: 9,
    title: "Recrutement",
    message: "Explore les profils de joueurs disponibles et repère de nouveaux talents pour ton équipe.",
    targetId: "nav-recrutement",
    position: "bottom",
  },
  {
    id: 10,
    title: "Déplacements",
    message: "Organise les trajets pour les matchs à l'extérieur et répartis les joueurs dans les mini-bus.",
    targetId: "nav-deplacements",
    position: "bottom",
  },
  {
    id: 11,
    title: "Mon profil",
    message: "Renseigne ton diplôme, ton parcours et rejoins un club avec un code — ça renforce ta crédibilité.",
    targetId: "nav-profil",
    position: "bottom",
  },
  {
    id: 12,
    title: "C'est parti ! 🚀",
    message: "Tu es prêt. Une question ? Clique sur le ballon en bas à droite — je suis toujours là.",
    targetId: null,
    position: "center",
  },
]

const EDUCATEUR_FAQ = [
  {
    q: "Comment ajouter un joueur à mon effectif ?",
    a: "Dans Mon Équipe → \"+ Ajouter\". Tu peux aussi importer un fichier Excel/CSV, ou envoyer un code à tes joueurs pour qu'ils rejoignent l'équipe eux-mêmes.",
  },
  {
    q: "Comment envoyer un sondage de présence ?",
    a: "Crée un entraînement dans l'onglet Entraînements — le sondage est automatique dès que la séance existe, chaque joueur répond depuis son compte.",
  },
  {
    q: "Comment enregistrer un résultat de match ?",
    a: "Dans Compétition → Calendrier, marque le match comme joué et renseigne le score et les stats — ou scanne directement la feuille de match, l'IA extrait les infos pour toi.",
  },
  {
    q: "Comment rejoindre un club ?",
    a: "Dans Mon profil, entre le code club que t'a donné ton club. Une fois accepté, tu accèdes au planning des terrains et à la répartition des mini-bus.",
  },
  {
    q: "Comment créer une fiche de séance ?",
    a: "Dans Mes séances, rédige-la directement ou scanne une fiche papier — l'IA remplit les champs automatiquement, tu n'as plus qu'à vérifier.",
  },
]

// Nature d'un but (matchs_equipe.buts_detail[].nature) — saisie manuelle dans
// la modale "Marquer comme joué", alimente le graphique "Buts par nature"
// de StatsEquipe.jsx (même liste de valeurs des deux côtés).
const NATURES_BUT = [
  { value: 'cpa', label: 'CPA' },
  { value: 'attaque_placee', label: 'Attaque placée' },
  { value: 'attaque_rapide', label: 'Attaque rapide' },
  { value: 'erreur_individuelle', label: 'Erreur individuelle' },
  { value: 'exploit_personnel', label: 'Exploit personnel' },
]

// Côté du but (matchs_equipe.buts_detail[].cote) — même principe que
// NATURES_BUT ci-dessus, alimente "Buts par côté" de StatsEquipe.jsx.
const COTES_BUT = [
  { value: 'gauche', label: 'Gauche' },
  { value: 'centre', label: 'Centre' },
  { value: 'droite', label: 'Droite' },
]

// ── Icônes SVG menu ────────────────────────────────────────────────────────
const IcoUsers     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
const IcoChart     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
const IcoTrophy    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0018 9h-1.26A8 8 0 103 16.29"/></svg>
const IcoRun       = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="4" r="2"/><path d="M15.5 8.5L14 13l3 3-2 5"/><path d="M8.5 8.5L10 13l-3 3 2 5"/><path d="M10 13h4"/></svg>
const IcoFilm      = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>
const IcoDumbbell  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4v16M18 4v16M3 8h3M18 8h3M3 16h3M18 16h3M6 12h12"/></svg>
const IcoLayout    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
const IcoVideo     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
const IcoClipboard = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12l2 2 4-4"/></svg>
const IcoCalendar  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
const IcoSearch    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
const IcoExternal  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
const IcoBuilding  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 22V12h6v10"/><path d="M9 7h1M14 7h1M9 11h1M14 11h1"/></svg>
const IcoCompass   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
const IcoSend      = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
const IcoBook      = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
const IcoBus       = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="10" rx="2"/><path d="M3 11h18"/><circle cx="7.5" cy="18.5" r="1.5"/><circle cx="16.5" cy="18.5" r="1.5"/></svg>
const IcoMic       = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
const IcoBox       = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>
const IcoEdit      = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/></svg>

// ── Icônes page Accueil éducateur (même style que la sidebar, sans emoji) ────
const IcoHome        = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/></svg>
const IcoUser        = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
const IcoZap         = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
const IcoActivity    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
const IcoPoll        = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
const IcoFileText    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
const IcoPlus        = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IcoCheckCircle = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
const IcoXCircle     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
const IcoAlertCircle = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
const IcoStar        = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
const IcoLogOut      = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
const IcoChevronLeft  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
const IcoChevronRight = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
const IcoX            = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>

// ── Icônes SVG bibliothèque (tailles/couleurs paramétrables) ────────────────
const IcoBiblioTitre = ({ size = 22, color = colors.accent.green }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    <line x1="12" y1="6" x2="16" y2="6"/>
    <line x1="12" y1="10" x2="16" y2="10"/>
    <line x1="12" y1="14" x2="14" y2="14"/>
  </svg>
)
const IcoDossier = ({ size = 32, color = colors.accent.blue }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
  </svg>
)
const IcoTypeTous = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
)
const IcoTypeEchauffement = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
)
const IcoTypeJeu = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
  </svg>
)
const IcoTypeExercice = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="4"/>
    <line x1="12" y1="2" x2="12" y2="8"/>
    <line x1="12" y1="16" x2="12" y2="22"/>
    <line x1="2" y1="12" x2="8" y2="12"/>
    <line x1="16" y1="12" x2="22" y2="12"/>
  </svg>
)
const IcoTypeSituation = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3 11 22 2 13 21 11 13 3 11"/>
  </svg>
)
const IcoBiblioVide = ({ size = 56, color = colors.border.strong }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    <line x1="12" y1="7" x2="16" y2="7"/>
    <line x1="12" y1="11" x2="16" y2="11"/>
    <line x1="12" y1="15" x2="14" y2="15"/>
    <circle cx="9" cy="9" r="1" fill={color}/>
  </svg>
)

// ── Grille d'évaluation éducateur ────────────────────────────────────────────
export const CRITERES_EDU = [
  { key: 'leadership', label: '👥 Leadership & Management', color: '#f59e0b', criteres: [
    { key: 'gestion_groupe', label: 'Gestion du groupe' },
    { key: 'discipline', label: 'Discipline' },
    { key: 'cohesion', label: 'Création de cohésion' },
    { key: 'gestion_conflits', label: 'Gestion des conflits' },
  ]},
  { key: 'pedagogie', label: '🎓 Pédagogie', color: colors.accent.purpleLight, criteres: [
    { key: 'qualite_explications', label: 'Qualité des explications' },
    { key: 'capacite_corriger', label: 'Capacité à corriger' },
    { key: 'individualisation', label: 'Individualisation' },
    { key: 'adaptation_age', label: 'Adaptation à l\'âge' },
  ]},
  { key: 'football', label: '⚽ Compétences football', color: colors.accent.green, criteres: [
    { key: 'animation_seances', label: 'Animation des séances' },
    { key: 'competence_tactique', label: 'Compétence tactique' },
    { key: 'coaching_match', label: 'Coaching en match' },
    { key: 'planification', label: 'Planification' },
  ]},
  { key: 'developpement', label: '📈 Développement joueurs', color: '#34d399', criteres: [
    { key: 'progression_technique', label: 'Progression technique' },
    { key: 'progression_tactique', label: 'Progression tactique' },
    { key: 'progression_physique', label: 'Progression physique' },
    { key: 'progression_mentale', label: 'Progression mentale' },
  ]},
  { key: 'professionnalisme', label: '🤝 Professionnalisme', color: colors.accent.blue, criteres: [
    { key: 'ponctualite', label: 'Ponctualité' },
    { key: 'organisation', label: 'Organisation' },
    { key: 'communication_club', label: 'Communication avec le club' },
    { key: 'investissement', label: 'Investissement' },
  ]},
  { key: 'performance', label: '🏅 Performance', color: '#f87171', criteres: [
    { key: 'resultats', label: 'Résultats' },
    { key: 'respect_projet_jeu', label: 'Respect du projet de jeu' },
    { key: 'valorisation_joueurs', label: 'Valorisation des joueurs' },
    { key: 'objectifs_atteints', label: 'Objectifs atteints' },
  ]},
]

// Extrait l'ID d'une URL YouTube (watch?v=, youtu.be/, embed/, shorts/) et renvoie
// l'URL d'embed correspondante, ou null si ce n'est pas une URL YouTube reconnaissable.
const youtubeEmbedUrl = (url) => {
  const m = String(url || '').match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return m ? `https://www.youtube.com/embed/${m[1]}` : null
}

// ── Charge SheetJS depuis CDN (xlsx) ─────────────────────────────────────────
function loadSheetJS() {
  return new Promise((resolve) => {
    if (window.XLSX) { resolve(window.XLSX); return }
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
    s.onload = () => resolve(window.XLSX)
    document.head.appendChild(s)
  })
}

// ── Normalise les en-têtes Excel vers nos champs — insensible à la casse et
// aux accents/espaces/ponctuation via normaliserCle (même utilitaire que les
// autres imports Excel de l'app, cf. src/lib/excelImport.js), donc plus
// besoin de lister séparément chaque variante accentuée/avec espaces : une
// seule clé normalisée par champ suffit ('numero maillot' et 'numéro
// maillot' se réduisent tous les deux à 'numeromaillot'). ──
const HEADER_MAP = {
  prenom: 'prenom', firstname: 'prenom',
  nom: 'nom', name: 'nom', lastname: 'nom',
  poste: 'poste', position: 'poste',
  categorie: 'categorie', category: 'categorie',
  numeromaillot: 'numero_maillot', maillot: 'numero_maillot', numero: 'numero_maillot',
  datenaissance: 'date_naissance', ddn: 'date_naissance', naissance: 'date_naissance', birthdate: 'date_naissance',
  numerolicence: 'numero_licence', licence: 'numero_licence',
  email: 'email', mail: 'email', adressemail: 'email',
}

function parseRows(raw) {
  return raw
    .map(row => {
      const j = {}
      for (const [k, v] of Object.entries(row)) {
        const key = HEADER_MAP[normaliserCle(k)]
        if (key && v !== undefined && v !== null && String(v).trim() !== '') {
          j[key] = String(v).trim()
        }
      }
      return j
    })
    .filter(j => j.prenom)
}

// ── Bar chart horizontal SVG ──────────────────────────────────────────────────
function BarChart({ data, color = colors.accent.green, unit = '', max: forceMax }) {
  const colors2 = useColors()
  if (!data.length) return null
  const max = forceMax ?? Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '110px', fontSize: '12px', color: colors2.text.secondary, textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.label}>{d.label}</div>
          <div style={{ flex: 1, background: colors2.background.raised, borderRadius: '4px', height: '22px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${max > 0 ? (d.value / max) * 100 : 0}%`, background: color + '99', borderRadius: '4px', transition: 'width 0.4s ease', minWidth: d.value > 0 ? '4px' : '0' }} />
          </div>
          <div style={{ width: '40px', fontSize: '12px', fontWeight: 700, color, textAlign: 'right', flexShrink: 0 }}>{d.value}{unit}</div>
        </div>
      ))}
    </div>
  )
}

// ── Radial progress skill (anneau rempli pour une compétence /5) ─────────────
function RadialSkill({ value, max = 5, color, label, size = 80 }) {
  const colors = useColors()
  const r = size * 0.36, cx = size / 2, cy = size / 2
  const circ = 2 * Math.PI * r
  const fill = (value / max) * circ
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={colors.background.raised} strokeWidth={size * 0.09} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={size * 0.09}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: 'stroke-dasharray 0.6s ease' }} />
        <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
          fontSize={size * 0.22} fontWeight="800" fill={colors.text.primary} fontFamily="Inter,sans-serif">{value || 0}</text>
        <text x={cx} y={cy + size * 0.2} textAnchor="middle"
          fontSize={size * 0.11} fill={colors.text.faint} fontFamily="Inter,sans-serif">/{max}</text>
      </svg>
      <span style={{ fontSize: '11px', color: colors.text.faint, fontFamily: 'Inter,sans-serif', textAlign: 'center', fontWeight: 600 }}>{label}</span>
    </div>
  )
}

// ── Mini donut présence (anneau simple) ──────────────────────────────────────
function DonutPresence({ taux }) {
  const colors = useColors()
  const r = 16, circ = 2 * Math.PI * r
  const dash = (taux / 100) * circ
  const color = taux >= 80 ? colors.accent.green : taux >= 50 ? '#f59e0b' : '#f87171'
  return (
    <svg width="42" height="42" viewBox="0 0 42 42">
      <circle cx="21" cy="21" r={r} fill="none" stroke={colors.background.raised} strokeWidth="5" />
      <circle cx="21" cy="21" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 21 21)" />
      <text x="21" y="25" textAnchor="middle" fontSize="9" fontWeight="700" fill={color} fontFamily="Inter,sans-serif">{taux}%</text>
    </svg>
  )
}

// ── Camembert multi-segment (présence / absence / blessure / maladie / convoc) ─
function DonutMulti({ presents, absents, blesses, malade, convoque, size = 72 }) {
  const colors = useColors()
  const total = (presents || 0) + (absents || 0) + (blesses || 0) + (malade || 0) + (convoque || 0)
  const taux = total ? Math.round(((presents || 0) + (convoque || 0)) / total * 100) : 0
  const color = taux >= 80 ? colors.accent.green : taux >= 50 ? '#f59e0b' : '#f87171'
  if (!total) return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: colors.background.raised, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: colors.border.strong, fontSize: '10px', fontFamily: 'Inter,sans-serif' }}>—</span>
    </div>
  )
  const p = (presents || 0) / total * 100
  const c = (convoque || 0) / total * 100
  const a = (absents || 0) / total * 100
  const b = (blesses || 0) / total * 100
  // m takes the rest
  const pEnd = p + c
  const aEnd = pEnd + a
  const bEnd = aEnd + b
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: `conic-gradient(#4ade80 0% ${p}%, #60a5fa ${p}% ${pEnd}%, #ef4444 ${pEnd}% ${aEnd}%, #f97316 ${aEnd}% ${bEnd}%, #a855f7 ${bEnd}% 100%)`
      }} />
      <div style={{ position: 'absolute', inset: `${size * 0.18}px`, borderRadius: '50%', background: colors.background.base, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <span style={{ fontSize: size * 0.19, fontWeight: 800, color, lineHeight: 1, fontFamily: 'Inter,sans-serif' }}>{taux}%</span>
      </div>
    </div>
  )
}

// Donut victoires/nuls/défaites — même technique que DonutMulti (conic-gradient)
// mais 3 segments fixes, pour le widget Effectif de l'Accueil.
function DonutVND({ v, n, d, size = 72 }) {
  const colors = useColors()
  const total = (v || 0) + (n || 0) + (d || 0)
  if (!total) return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: colors.background.raised, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ color: colors.border.strong, fontSize: '10px', fontFamily: 'Inter,sans-serif' }}>—</span>
    </div>
  )
  const pV = (v || 0) / total * 100
  const pN = (n || 0) / total * 100
  const vEnd = pV
  const nEnd = vEnd + pN
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: `conic-gradient(#4ade80 0% ${vEnd}%, #facc15 ${vEnd}% ${nEnd}%, #ef4444 ${nEnd}% 100%)`
      }} />
      <div style={{ position: 'absolute', inset: `${size * 0.18}px`, borderRadius: '50%', background: colors.background.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.16, fontWeight: 800, color: colors.text.primary, lineHeight: 1, fontFamily: 'Inter,sans-serif' }}>{total}</span>
      </div>
    </div>
  )
}

const TerrainFoot = () => (
  <svg viewBox="0 0 300 200" width="100%" style={{ maxHeight: '110px', border: `1px solid ${colors.border.strong}`, display: 'block', margin: '6px 0' }}>
    {/* Fond blanc */}
    <rect width="300" height="200" fill="white" stroke={colors.border.strong} strokeWidth="2"/>
    {/* Ligne médiane */}
    <line x1="150" y1="0" x2="150" y2="200" stroke={colors.border.strong} strokeWidth="1.5"/>
    {/* Cercle central */}
    <circle cx="150" cy="100" r="30" fill="none" stroke={colors.border.strong} strokeWidth="1.5"/>
    <circle cx="150" cy="100" r="2" fill={colors.border.strong}/>
    {/* Surface de réparation gauche */}
    <rect x="0" y="55" width="55" height="90" fill="none" stroke={colors.border.strong} strokeWidth="1.5"/>
    {/* Surface de but gauche */}
    <rect x="0" y="75" width="18" height="50" fill="none" stroke={colors.border.strong} strokeWidth="1.5"/>
    {/* Point de penalty gauche */}
    <circle cx="40" cy="100" r="2" fill={colors.border.strong}/>
    {/* Arc de cercle gauche */}
    <path d="M 55 75 A 30 30 0 0 1 55 125" fill="none" stroke={colors.border.strong} strokeWidth="1.5"/>
    {/* Surface de réparation droite */}
    <rect x="245" y="55" width="55" height="90" fill="none" stroke={colors.border.strong} strokeWidth="1.5"/>
    {/* Surface de but droite */}
    <rect x="282" y="75" width="18" height="50" fill="none" stroke={colors.border.strong} strokeWidth="1.5"/>
    {/* Point de penalty droit */}
    <circle cx="260" cy="100" r="2" fill={colors.border.strong}/>
    {/* Arc de cercle droit */}
    <path d="M 245 75 A 30 30 0 0 0 245 125" fill="none" stroke={colors.border.strong} strokeWidth="1.5"/>
    {/* Coins arrondis (arcs de corner) */}
    <path d="M 0 10 A 10 10 0 0 1 10 0" fill="none" stroke={colors.border.strong} strokeWidth="1"/>
    <path d="M 290 0 A 10 10 0 0 1 300 10" fill="none" stroke={colors.border.strong} strokeWidth="1"/>
    <path d="M 0 190 A 10 10 0 0 0 10 200" fill="none" stroke={colors.border.strong} strokeWidth="1"/>
    <path d="M 300 190 A 10 10 0 0 1 290 200" fill="none" stroke={colors.border.strong} strokeWidth="1"/>
  </svg>
)

const DemiTerrain = () => (
  <svg viewBox="0 0 300 200" width="100%" style={{ maxHeight: '130px', border: `1px solid ${colors.border.strong}`, display: 'block', margin: '6px 0' }}>
    <rect width="299" height="199" x="0.5" y="0.5" fill="white" stroke={colors.border.strong} strokeWidth="2"/>
    {/* Ligne centrale (bord droit, pointillé) */}
    <line x1="299" y1="0" x2="299" y2="200" stroke={colors.border.strong} strokeWidth="1.5" strokeDasharray="6,3"/>
    {/* Surface de réparation */}
    <rect x="0" y="50" width="90" height="100" fill="none" stroke={colors.border.strong} strokeWidth="1.5"/>
    {/* Surface de but */}
    <rect x="0" y="70" width="28" height="60" fill="none" stroke={colors.border.strong} strokeWidth="1.5"/>
    {/* Point de penalty */}
    <circle cx="62" cy="100" r="2.5" fill={colors.border.strong}/>
    {/* Arc de penalty */}
    <path d="M 90 70 A 38 38 0 0 1 90 130" fill="none" stroke={colors.border.strong} strokeWidth="1.5"/>
    {/* Demi-cercle central (bord droit) */}
    <path d="M 299 65 A 40 40 0 0 0 299 135" fill="none" stroke={colors.border.strong} strokeWidth="1.5"/>
    {/* Arcs de corner */}
    <path d="M 0 15 A 15 15 0 0 1 15 0" fill="none" stroke={colors.border.strong} strokeWidth="1"/>
    <path d="M 0 185 A 15 15 0 0 0 15 200" fill="none" stroke={colors.border.strong} strokeWidth="1"/>
  </svg>
)

const DemiTerrainFutsal = () => (
  <svg viewBox="0 0 300 180" width="100%" style={{ maxHeight: '130px', border: `1px solid ${colors.border.strong}`, display: 'block', margin: '6px 0' }}>
    <rect width="299" height="179" x="0.5" y="0.5" fill="white" stroke={colors.border.strong} strokeWidth="2"/>
    {/* Ligne centrale pointillée */}
    <line x1="299" y1="0" x2="299" y2="180" stroke={colors.border.strong} strokeWidth="1.5" strokeDasharray="6,3"/>
    {/* Zone de but (rectangle) */}
    <rect x="0" y="65" width="25" height="50" fill="none" stroke={colors.border.strong} strokeWidth="1.5"/>
    {/* Surface de réparation arrondie (demi-cercle r=65) */}
    <path d="M 0 25 A 80 80 0 0 1 0 155" fill="none" stroke={colors.border.strong} strokeWidth="1.5"/>
    {/* Point de penalty 6m */}
    <circle cx="48" cy="90" r="2.5" fill={colors.border.strong}/>
    {/* Point de penalty 10m */}
    <circle cx="80" cy="90" r="2.5" fill={colors.border.strong}/>
    {/* Demi-cercle central bord droit */}
    <path d="M 299 60 A 40 40 0 0 0 299 120" fill="none" stroke={colors.border.strong} strokeWidth="1.5"/>
    {/* Arcs de corner (petits) */}
    <path d="M 0 10 A 10 10 0 0 1 10 0" fill="none" stroke={colors.border.strong} strokeWidth="1"/>
    <path d="M 0 170 A 10 10 0 0 0 10 180" fill="none" stroke={colors.border.strong} strokeWidth="1"/>
  </svg>
)

const TerrainFutsal = () => (
  <svg viewBox="0 0 300 180" width="100%" style={{ maxHeight: '110px', border: `1px solid ${colors.border.strong}`, display: 'block', margin: '6px 0' }}>
    <rect width="299" height="179" x="0.5" y="0.5" fill="white" stroke={colors.border.strong} strokeWidth="2"/>
    {/* Ligne médiane */}
    <line x1="150" y1="0" x2="150" y2="180" stroke={colors.border.strong} strokeWidth="1.5"/>
    {/* Cercle central */}
    <circle cx="150" cy="90" r="30" fill="none" stroke={colors.border.strong} strokeWidth="1.5"/>
    <circle cx="150" cy="90" r="2.5" fill={colors.border.strong}/>
    {/* Zone de but gauche */}
    <rect x="0" y="65" width="25" height="50" fill="none" stroke={colors.border.strong} strokeWidth="1.5"/>
    {/* Surface arrondie gauche */}
    <path d="M 0 20 A 80 80 0 0 1 0 160" fill="none" stroke={colors.border.strong} strokeWidth="1.5"/>
    {/* Points penalty gauche */}
    <circle cx="48" cy="90" r="2.5" fill={colors.border.strong}/>
    <circle cx="80" cy="90" r="2.5" fill={colors.border.strong}/>
    {/* Zone de but droite */}
    <rect x="274" y="65" width="25" height="50" fill="none" stroke={colors.border.strong} strokeWidth="1.5"/>
    {/* Surface arrondie droite */}
    <path d="M 299 20 A 80 80 0 0 0 299 160" fill="none" stroke={colors.border.strong} strokeWidth="1.5"/>
    {/* Points penalty droite */}
    <circle cx="251" cy="90" r="2.5" fill={colors.border.strong}/>
    <circle cx="219" cy="90" r="2.5" fill={colors.border.strong}/>
    {/* Arcs de corner */}
    <path d="M 0 10 A 10 10 0 0 1 10 0" fill="none" stroke={colors.border.strong} strokeWidth="1"/>
    <path d="M 290 0 A 10 10 0 0 1 299 10" fill="none" stroke={colors.border.strong} strokeWidth="1"/>
    <path d="M 0 170 A 10 10 0 0 0 10 180" fill="none" stroke={colors.border.strong} strokeWidth="1"/>
    <path d="M 299 170 A 10 10 0 0 1 290 180" fill="none" stroke={colors.border.strong} strokeWidth="1"/>
  </svg>
)

const getTerrainComponent = (numeroProcede, sport) => {
  const estDemi = numeroProcede <= 2
  if (sport === 'futsal') return estDemi ? <DemiTerrainFutsal /> : <TerrainFutsal />
  return estDemi ? <DemiTerrain /> : <TerrainFoot />
}

function FicheContenu({ fiche, categorieLabel }) {
  return (
    <>
      <div className="fiche-header">
        <div className="fiche-row fiche-row-1">
          <div className="fiche-champ large"><label>Thème</label>{fiche.theme || '—'}</div>
          <div className="fiche-champ"><label>Date</label>{fiche.date || '—'}</div>
          <div className="fiche-champ"><label>Catégorie</label>{categorieLabel || '—'}</div>
          <div className="fiche-champ"><label>Nb joueurs</label>{fiche.nb_joueurs || '—'}</div>
        </div>
        <div className="fiche-row fiche-row-2">
          <div className="fiche-champ"><label>Durée totale</label>{fiche.duree_totale || '—'}</div>
          <div className="fiche-champ large"><label>Objectif général</label>{fiche.objectif_general || '—'}</div>
        </div>
      </div>

      {fiche.mode_diplome && (
        <div style={{ border: '1px solid #000', borderRadius: '4px', padding: '10px 12px', marginBottom: '14px' }}>
          <p style={{ fontWeight: 'bold', fontSize: '13px', margin: '0 0 8px' }}>📋 Fiche officielle {fiche.mode_diplome}</p>
          <div className="fiche-row" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '8px' }}>
            <div className="fiche-champ"><label>Phase de jeu</label>{fiche.phase_jeu || '—'}</div>
            <div className="fiche-champ"><label>Principe de jeu</label>{fiche.principe_jeu || '—'}</div>
          </div>
          {(fiche.mode_diplome === 'BEF' || fiche.mode_diplome === 'DEF') && (
            <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {fiche.constats && <div><label style={{ fontWeight: 'bold', display: 'block', fontSize: '10px', textTransform: 'uppercase' }}>Constats</label>{fiche.constats}</div>}
              {fiche.justification_pedagogique && <div><label style={{ fontWeight: 'bold', display: 'block', fontSize: '10px', textTransform: 'uppercase' }}>Justification pédagogique</label>{fiche.justification_pedagogique}</div>}
              {fiche.auto_evaluation && <div><label style={{ fontWeight: 'bold', display: 'block', fontSize: '10px', textTransform: 'uppercase' }}>Auto-évaluation</label>{fiche.auto_evaluation}</div>}
            </div>
          )}
          {fiche.mode_diplome === 'DEF' && (
            <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
              {fiche.analyse_equipe && <div><label style={{ fontWeight: 'bold', display: 'block', fontSize: '10px', textTransform: 'uppercase' }}>Analyse équipe</label>{fiche.analyse_equipe}</div>}
              {fiche.bilan_projection && <div><label style={{ fontWeight: 'bold', display: 'block', fontSize: '10px', textTransform: 'uppercase' }}>Bilan et projection</label>{fiche.bilan_projection}</div>}
            </div>
          )}
        </div>
      )}
      <div className="procedes-grid">
        {(fiche.procedes || []).map((p, i) => {
          const consignesLignes = (p.consignes || '').split('\n')
          return (
          <div className="procede-block" key={i}>
            <h3>Procédé {p.numero} — {p.titre || 'Sans titre'}</h3>
            <div className="procede-grid">
              <div className="procede-field"><label>Durée</label><div className="valeur">{p.duree}</div></div>
              <div className="procede-field"><label>Nombre de joueurs</label><div className="valeur">{p.nb_joueurs}</div></div>
              <div className="procede-field" style={{ gridColumn: '1 / -1' }}><label>But</label><div className="valeur">{p.but}</div></div>
              <div className="procede-field" style={{ gridColumn: '1 / -1' }}><label>Organisation</label><div className="valeur">{p.organisation}</div></div>
              <div className="procede-field" style={{ gridColumn: '1 / -1' }}>
                {p.schema_png ? <img src={p.schema_png} alt="Schéma tactique" style={{ width: '100%', maxHeight: '160px', objectFit: 'contain', border: `1px solid ${colors.border.strong}`, display: 'block', margin: '6px 0' }} /> : getTerrainComponent(p.numero, fiche.sport)}
              </div>
              <div className="procede-field" style={{ gridColumn: '1 / -1' }}>
                <label>Consignes</label>
                {[0, 1, 2, 3].map(idx => (
                  <div key={idx} style={{ borderBottom: '1px solid #999', minHeight: '18px', marginBottom: '6px' }}>
                    {consignesLignes[idx] || ''}
                  </div>
                ))}
              </div>
              <div className="procede-field" style={{ gridColumn: '1 / -1' }}><label>Variables / progressions</label><div className="valeur">{p.variables}</div></div>
            </div>
          </div>
          )
        })}
      </div>
    </>
  )
}

function FicheSeancePrint({ fiche, categorieLabel }) {
  return createPortal(
    <div id="fiche-print">
      <FicheContenu fiche={fiche} categorieLabel={categorieLabel} />
    </div>,
    document.body
  )
}

function AccueilEducateur({ clubId, userId, joueurs, entrainements, matchs, rapportsRecents, setActiveSection, setSousOngletEnt, setStatsSubTab, lang, isMobile, mesSeancesOuvertes, dispoJoueurs }) {
  const colors = useColors()
  const aujourdHui = new Date().toISOString().split('T')[0]

  // AccueilEducateur est un composant à part (pas une simple section du composant
  // principal) — il ne peut utiliser que ses props ou des helpers locaux, pas les
  // const définies plus bas dans DashboardEducateur (ex: le matchJoue partagé par
  // les autres sections, cf. bug "Can't find variable: matchJoue" en prod).
  const matchJoue = (m) => m.score_nous !== '' && m.score_nous !== null && m.score_nous !== undefined

  const totalJoueurs = joueurs.length

  const prochainesEntrainements = [...entrainements]
    .filter(e => e.date >= aujourdHui)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3)
  const prochainEnt = prochainesEntrainements[0] || null

  const STATUTS_PRESENCE = [
    { val: 'present', label: 'Présent', color: colors.accent.green },
    { val: 'absent', label: 'Absent', color: colors.accent.red },
    { val: 'malade', label: 'Malade', color: colors.accent.blue },
    { val: 'blesse', label: 'Blessé', color: colors.accent.blue },
    { val: 'convoque', label: 'Convoqué', color: colors.accent.blue },
  ]

  // Les réponses des joueurs au sondage "seras-tu présent ?" du prochain entraînement
  // sont dans `disponibilites` (seance_id), pas dans presences_entrainement (qui sert
  // à la prise de présence a posteriori par l'éducateur, après la séance).
  const [dispoProchainEnt, setDispoProchainEnt] = useState([])
  useEffect(() => {
    if (!prochainEnt?.id) { Promise.resolve().then(() => setDispoProchainEnt([])); return }
    supabase.from('disponibilites').select('*').eq('seance_id', prochainEnt.id).then(({ data, error }) => {
      console.log('[Présences prochain entraînement] entrainement_id:', prochainEnt.id)
      console.log('[Présences prochain entraînement] lignes disponibilites:', data, error)
      setDispoProchainEnt(data || [])
    })
  }, [prochainEnt?.id])

  const compterStatutPresence = (val) => dispoProchainEnt.filter(d => d.statut === val).length

  // Fiche déplacement — les déplacements eux-mêmes sont chargés (et tenus à
  // jour en temps réel) par DeplacementsAssignesWidget, affiché plus haut sur
  // cette page ; on garde ici seulement l'état du formulaire, ouvert avec
  // l'objet déplacement complet passé par le widget (onOuvrirFiche).
  const [deplacementFicheOuverte, setDeplacementFicheOuverte] = useState(null)
  const [fichesBus, setFichesBus] = useState([])
  const [remarquesGenerales, setRemarquesGenerales] = useState('')
  const [savingFiche, setSavingFiche] = useState(false)

  // Une section par bus réellement assigné (dep.vehicule, "PLAQUE1 + PLAQUE2"
  // — pas de colonne bus_assignes séparée, ça désynchroniserait de la seule
  // source de vérité déjà utilisée partout ailleurs pour l'assignation bus).
  const ouvrirFicheDeplacement = (dep) => {
    const busAssignes = (dep.vehicule || '').split('+').map(p => p.trim()).filter(Boolean)
    setFichesBus(busAssignes.map(immat => {
      const existant = (dep.fiches_bus || []).find(f => f.immat === immat) || {}
      return {
        immat,
        km_avant: existant.km_avant ?? '', km_apres: existant.km_apres ?? '',
        gasoil_avant: existant.gasoil_avant ?? '', gasoil_apres: existant.gasoil_apres ?? '',
        conducteur: existant.conducteur ?? '', remarques_vehicule: existant.remarques_vehicule ?? '',
      }
    }))
    setRemarquesGenerales(dep.remarques ?? '')
    setDeplacementFicheOuverte(dep)
  }

  const modifierFicheBus = (idx, champ, valeur) => {
    setFichesBus(prev => prev.map((f, i) => (i === idx ? { ...f, [champ]: valeur } : f)))
  }

  const sauvegarderFiche = async () => {
    // Optimistic : la modale se ferme tout de suite sans attendre la réponse
    // Supabase. Erreur → réouverte avec la saisie intacte.
    const depSnapshot = deplacementFicheOuverte
    setSavingFiche(true)
    setDeplacementFicheOuverte(null)
    const { error } = await supabase.from('deplacements').update({
      fiches_bus: fichesBus,
      remarques: remarquesGenerales.trim() || null,
      fiche_completee: true,
      fiche_completee_le: new Date().toISOString(),
    }).eq('id', depSnapshot.id)
    setSavingFiche(false)
    if (error) {
      alert('Erreur : ' + error.message)
      setDeplacementFicheOuverte(depSnapshot)
    }
  }

  // Fenêtre lundi → dimanche de la semaine en cours
  const now = new Date()
  const joursDepuisLundi = (now.getDay() + 6) % 7
  const lundi = new Date(now); lundi.setDate(now.getDate() - joursDepuisLundi)
  const dimanche = new Date(lundi); dimanche.setDate(lundi.getDate() + 6)
  const lundiStr = lundi.toISOString().split('T')[0]
  const dimancheStr = dimanche.toISOString().split('T')[0]
  // Même logique que le détail par séance de l'onglet Entraînements
  // (getStatutJoueur, plus bas dans ce fichier) : la saisie manuelle
  // (presences_entrainement) prime, sinon on retombe sur la réponse
  // auto au sondage de dispo (dispoJoueurs) — sans ce fallback, une séance
  // pas encore "validée" par l'éducateur mais déjà répondue par les joueurs
  // ressortait comme si elle n'avait aucune donnée, ce qui faussait le taux
  // (ex: 25% sur 1 séance au lieu de ~90% sur plusieurs, cf. bug rapporté).
  const getStatutJoueurSemaine = (e, j) => {
    const p = (e.presences_entrainement || []).find(pr => pr.joueur_id === j.id)
    const nonSaisi = !p || (!p.statut && !p.present)
    if (!nonSaisi) return p.statut || (p.present ? 'present' : 'absent')
    return j.joueur_id ? (dispoJoueurs[e.id]?.[j.joueur_id] || null) : null
  }
  // Strictement avant aujourd'hui, pas "jusqu'à aujourd'hui inclus" : le
  // sondage d'une séance du jour même peut encore recevoir des réponses,
  // l'inclure donnerait un chiffre provisoire plutôt que factuel sur des
  // jours réellement passés.
  const seancesSemaine = entrainements.filter(e => e.date >= lundiStr && e.date <= dimancheStr && e.date < aujourdHui && joueurs.some(j => getStatutJoueurSemaine(e, j) !== null))
  let tauxPresenceSemaine = null
  if (seancesSemaine.length > 0) {
    let totalSaisies = 0, totalPresents = 0
    seancesSemaine.forEach(e => {
      joueurs.forEach(j => {
        const s = getStatutJoueurSemaine(e, j)
        if (s === null) return
        totalSaisies++
        if (s === 'present' || s === 'convoque') totalPresents++
      })
    })
    tauxPresenceSemaine = totalSaisies > 0 ? Math.round((totalPresents / totalSaisies) * 100) : null
  }

  const prochainMatch = [...matchs]
    .filter(m => m.date >= aujourdHui && (m.score_nous === '' || m.score_nous === null || m.score_nous === undefined))
    .sort((a, b) => a.date.localeCompare(b.date))[0] || null

  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}><IcoHome /> Accueil</h1>
      <p style={{ color: colors.text.faint, fontSize: '13px', marginBottom: '1.5rem' }}>Vue d'ensemble de ton équipe</p>

      {/* ── Planning de la semaine — dynamique, généré depuis entrainements + matchs ── */}
      <div style={{ background: colors.background.surface, border: '2px solid #60a5fa50', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.5rem', boxShadow: '0 0 0 1px #60a5fa10' }}>
        <p style={{ fontWeight: 800, fontSize: '14px', margin: '0 0 12px', color: colors.accent.blue, display: 'flex', alignItems: 'center', gap: '6px' }}>📅 {t('planning_semaine_titre', lang)}</p>
        <PlanningSemaineWidget
          entrainements={entrainements}
          matchs={matchs}
          onClickEntrainement={() => setActiveSection('entrainements')}
          onClickMatch={() => setActiveSection('matchs')}
        />
      </div>

      {clubId && <TerrainsLiberesWidget clubId={clubId} userId={userId} accentColor={colors.accent.blue} titre="Créneau libéré cette semaine" />}
      <DeplacementsAssignesWidget userId={userId} accentColor={colors.accent.blue} onOuvrirFiche={ouvrirFicheDeplacement} />

      {/* Widgets résumé */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(180px, 1fr))', gap: isMobile ? '10px' : '14px', marginBottom: '2rem' }}>
        {(() => {
          const matchsJoues = matchs.filter(m => matchJoue(m))
          const victoires = matchsJoues.filter(m => Number(m.score_nous) > Number(m.score_eux)).length
          const nuls = matchsJoues.filter(m => Number(m.score_nous) === Number(m.score_eux)).length
          const defaites = matchsJoues.filter(m => Number(m.score_nous) < Number(m.score_eux)).length
          const totalM = matchsJoues.length
          const pct = (n) => totalM ? Math.round(n / totalM * 100) : 0
          return (
            <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '1.25rem', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingBottom: '1rem' }}>
                <p style={{ fontSize: '11px', color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}><IcoUsers /> Effectif</p>
                <p style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>{totalJoueurs}</p>
                <p style={{ fontSize: '12px', color: colors.text.faint, margin: '4px 0 0' }}>joueur{totalJoueurs > 1 ? 's' : ''} dans l'équipe</p>
              </div>

              <div style={{ height: '1px', background: '#ffffff20', flexShrink: 0 }} />

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', paddingTop: '1rem' }}>
                <DonutVND v={victoires} n={nuls} d={defaites} size={64} />
                <div style={{ display: 'flex', gap: '14px' }}>
                  {[
                    { label: 'V', val: victoires, color: colors.accent.green },
                    { label: 'N', val: nuls, color: '#facc15' },
                    { label: 'D', val: defaites, color: colors.accent.red },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: '11px', fontWeight: 800, color: s.color }}>{s.label}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: 700 }}>{pct(s.val)}%</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })()}

        <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '1.25rem', minWidth: 0 }}>
          <p style={{ fontSize: '11px', color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}><IcoRun /> Prochaines séances</p>
          {prochainesEntrainements.length === 0 ? (
            <p style={{ fontSize: '14px', color: colors.text.disabled, margin: 0 }}>Aucune séance planifiée</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {prochainesEntrainements.map((entr, idx) => {
                const dateEntr = new Date(entr.date + 'T12:00:00')
                const estAujourdHui = entr.date === aujourdHui
                const demain = new Date(); demain.setDate(demain.getDate() + 1)
                const estDemain = entr.date === demain.toISOString().split('T')[0]
                const labelDate = estAujourdHui ? "Aujourd'hui" : estDemain ? 'Demain' : dateEntr.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
                return (
                  <div key={entr.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: idx === 0 ? '#60a5fa0f' : colors.background.base, borderRadius: '10px', border: `1px solid ${idx === 0 ? colors.accent.blue + alpha.light : colors.background.raised}` }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: idx === 0 ? colors.accent.blue : colors.border.default, color: idx === 0 ? colors.background.base : colors.text.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entr.description || mesSeancesOuvertes.find(s => s.id === entr.fiche_id)?.theme || 'Séance'}</p>
                      <p style={{ margin: 0, fontSize: '11px', color: colors.text.faint }}>{labelDate}{entr.heure ? ` · ${entr.heure}` : ''}</p>
                    </div>
                    {isMobile ? (
                      <span title={sondageEstClos(entr) ? 'Sondage clôturé' : 'Sondage ouvert'}
                        style={{ width: '9px', height: '9px', borderRadius: '50%', background: sondageEstClos(entr) ? colors.accent.red : colors.accent.green, flexShrink: 0 }} />
                    ) : (
                      !sondageEstClos(entr) && (
                        <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '10px', background: colors.accent.green + alpha.subtle, color: colors.accent.green, flexShrink: 0 }}>Sondage ouvert</span>
                      )
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '1.25rem', minWidth: 0 }}>
          <p style={{ fontSize: '11px', color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}><IcoChart /> Présence cette semaine</p>
          <p style={{ fontSize: '28px', fontWeight: 800, margin: 0, color: colors.accent.blue }}>{tauxPresenceSemaine != null ? `${tauxPresenceSemaine}%` : '—'}</p>
          <p style={{ fontSize: '12px', color: colors.text.faint, margin: '4px 0 0' }}>{seancesSemaine.length > 0 ? `sur ${seancesSemaine.length} séance${seancesSemaine.length > 1 ? 's' : ''}` : 'aucune séance saisie'}</p>
        </div>

        <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '1.25rem', minWidth: 0 }}>
          <p style={{ fontSize: '11px', color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}><IcoTrophy /> Prochain match</p>
          {prochainMatch ? (
            <>
              <p style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{new Date(prochainMatch.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}{prochainMatch.heure ? ` · ${prochainMatch.heure}` : ''}</p>
              <p style={{ fontSize: '12px', color: colors.text.faint, margin: '4px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prochainMatch.adversaire || '—'}</p>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '6px', fontSize: '10px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', background: prochainMatch.domicile ? colors.accent.green + alpha.soft : colors.accent.orange + alpha.soft, color: prochainMatch.domicile ? colors.accent.green : colors.accent.orange, border: `1px solid ${prochainMatch.domicile ? colors.accent.green + alpha.medium : colors.accent.orange + alpha.medium}` }}>
                {prochainMatch.domicile && <IcoHome />} {prochainMatch.domicile ? 'Domicile' : 'Déplacement'}
              </span>
            </>
          ) : (
            <p style={{ fontSize: '14px', color: colors.text.disabled, margin: 0 }}>Aucun match planifié</p>
          )}
        </div>
      </div>

      {/* Classement séances — version compacte de Stats > Joueur du mois (mêmes
          données : point_seance par entrainement, groupé par mois via entrainements.date
          déjà chargé — pas de nouvelle requête, pas de colonne "points"/equipe_id qui
          n'existent pas dans ce schéma). Pas de "3 derniers" façon palmarès inversé :
          la version complète (Stats > Joueur du mois) ne le fait pas non plus, et
          afficher publiquement qui a le moins d'étoiles n'apporte rien de bon ici. */}
      {(() => {
        const now = new Date()
        const moisPrecedentDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const moisKeyDe = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const moisCourantKey = moisKeyDe(now)
        const moisPrecedentKey = moisKeyDe(moisPrecedentDate)

        const podiumDuMois = (moisKey) => {
          const pts = {}
          entrainements.forEach(e => {
            if (!e.date || moisKeyDe(new Date(e.date)) !== moisKey) return
            ;(e.presences_entrainement || []).forEach(p => {
              if (!p.point_seance) return
              pts[p.joueur_id] = (pts[p.joueur_id] || 0) + 1
            })
          })
          return Object.entries(pts)
            .map(([jid, count]) => ({ joueur: joueurs.find(j => j.id === jid), count }))
            .filter(x => x.joueur)
            .sort((a, b) => b.count - a.count)
        }

        const podiumActuel = podiumDuMois(moisCourantKey)
        const podiumPrecedent = podiumDuMois(moisPrecedentKey)

        return (
          <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '1.25rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <p style={{ fontWeight: 700, fontSize: '15px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>🏅 Classement séances</p>
              <button onClick={() => { setActiveSection('stats'); setStatsSubTab('mois') }}
                style={{ background: 'transparent', border: 'none', color: colors.accent.blue, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                Voir tout →
              </button>
            </div>

            <p style={{ fontSize: '11px', color: colors.accent.green, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px' }}>
              {now.toLocaleDateString(localeOf(lang), { month: 'long', year: 'numeric' })}
            </p>
            {podiumActuel.length === 0 ? (
              <p style={{ color: colors.text.disabled, fontSize: '13px', margin: 0 }}>Aucun point de séance attribué ce mois-ci.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {podiumActuel.slice(0, 3).map((item, idx) => (
                  <div key={item.joueur.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: colors.background.base, borderRadius: '10px', border: idx === 0 ? '1px solid #fbbf2440' : `1px solid ${colors.border.subtle}` }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0, background: idx === 0 ? colors.accent.amber : idx === 1 ? '#9ca3af' : '#cd7f32', color: colors.background.base, fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {idx + 1}
                    </span>
                    <span style={{ flex: 1, fontSize: '13px', fontWeight: 600 }}>{item.joueur.prenom} {item.joueur.nom}</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: colors.accent.amber }}>{item.count} ⭐</span>
                  </div>
                ))}
              </div>
            )}

            {podiumPrecedent.length > 0 && (
              <>
                <p style={{ fontSize: '10px', color: colors.text.faint, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '14px 0 8px' }}>
                  {moisPrecedentDate.toLocaleDateString(localeOf(lang), { month: 'long' })} (rappel)
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', opacity: 0.75 }}>
                  <span style={{ fontSize: '14px' }}>🥇</span>
                  <span style={{ flex: 1, fontSize: '12px' }}>{podiumPrecedent[0].joueur.prenom} {podiumPrecedent[0].joueur.nom}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: colors.accent.amber }}>{podiumPrecedent[0].count} ⭐</span>
                </div>
              </>
            )}
          </div>
        )
      })()}

      {/* Actions rapides */}
      <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}><IcoZap /> Actions rapides</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '2rem' }}>
        {prochainEnt ? (() => {
          const presents = compterStatutPresence('present') + compterStatutPresence('convoque')
          const absents = compterStatutPresence('absent') + compterStatutPresence('blesse') + compterStatutPresence('malade')
          const enAttente = Math.max(0, totalJoueurs - dispoProchainEnt.length)
          const clos = sondageEstClos(prochainEnt)
          return (
            <button onClick={() => { setActiveSection('entrainements'); setSousOngletEnt('prochaine') }}
              style={{ background: clos ? '#1f2937' : 'rgba(74,222,128,0.1)', border: `1px solid ${clos ? '#374151' : colors.accent.green}`, borderRadius: '12px', padding: '12px 14px', cursor: 'pointer', textAlign: 'left', color: colors.text.primary, fontFamily: 'Inter, sans-serif' }}>
              <div style={{ fontSize: '10px', color: colors.text.dim, marginBottom: '4px', fontWeight: 700, letterSpacing: '0.5px' }}>DERNIER SONDAGE</div>
              <div style={{ fontSize: '13px', color: 'white', fontWeight: 700, marginBottom: '6px', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                📋 {prochainEnt.description || 'Entraînement'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', flexWrap: 'wrap' }}>
                <span style={{ color: colors.accent.green }}>✅ {presents}</span>
                <span style={{ color: colors.accent.red }}>❌ {absents}</span>
                <span style={{ color: colors.text.dim }}>⏳ {enAttente}</span>
                <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: clos ? '#374151' : 'rgba(74,222,128,0.15)', color: clos ? '#6b7280' : colors.accent.green }}>
                  {clos ? '🔒 Fermé' : '🟢 Ouvert'}
                </span>
              </div>
            </button>
          )
        })() : (
          <button onClick={() => setActiveSection('equipe')}
            style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '12px', padding: '1.25rem 1rem', cursor: 'pointer', textAlign: 'center', color: colors.text.primary, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', fontFamily: 'Inter, sans-serif' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = colors.accent.blue + alpha.medium}
            onMouseLeave={e => e.currentTarget.style.borderColor = colors.background.raised}>
            <span style={{ display: 'inline-flex', transform: 'scale(1.6)' }}><IcoPlus /></span>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Ajouter un joueur</span>
          </button>
        )}
        {[
          { Icon: IcoRun, label: 'Créer un entraînement', section: 'entrainements' },
          { Icon: IcoVideo, label: 'Analyse rapport', section: 'analyse_video' },
          { Icon: IcoLayout, label: 'Tacticboard', section: 'tactipad' },
        ].map(a => (
          <button key={a.section} onClick={() => setActiveSection(a.section)}
            style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '12px', padding: '1.25rem 1rem', cursor: 'pointer', textAlign: 'center', color: colors.text.primary, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', fontFamily: 'Inter, sans-serif' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = colors.accent.blue + alpha.medium}
            onMouseLeave={e => e.currentTarget.style.borderColor = colors.background.raised}>
            <span style={{ display: 'inline-flex', transform: 'scale(1.6)' }}><a.Icon /></span>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>{a.label}</span>
          </button>
        ))}
      </div>

      {/* Fil d'activité récente */}
      <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}><IcoActivity /> Activité récente</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '1.25rem' }}>
          <AlertesPanel educateurId={userId} clubId={clubId} joueurs={joueurs} matchs={matchs} setActiveSection={setActiveSection} />
        </div>

        <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '1.25rem' }}>
          <p style={{ fontWeight: 700, fontSize: '13px', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}><IcoCheckCircle /> Présences — Prochain entraînement</p>
          {!prochainEnt ? (
            <p style={{ color: colors.text.disabled, fontSize: '12px', margin: 0 }}>Aucune séance planifiée.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {STATUTS_PRESENCE.map(s => (
                <div key={s.val} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: colors.text.muted, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{s.label}</span>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: s.color }}>{compterStatutPresence(s.val)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '1.25rem' }}>
          <p style={{ fontWeight: 700, fontSize: '13px', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}><IcoFileText /> Derniers rapports générés</p>
          {rapportsRecents.length === 0 ? (
            <p style={{ color: colors.text.disabled, fontSize: '12px', margin: 0 }}>Aucun rapport pour l'instant.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {rapportsRecents.map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: 600 }}>{r.prenom_joueur || 'Sans nom'}{r.poste ? ` — ${r.poste}` : ''}</p>
                  <span style={{ fontSize: '11px', color: colors.text.faint, whiteSpace: 'nowrap' }}>{r.date_analyse ? new Date(r.date_analyse).toLocaleDateString('fr-FR') : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {deplacementFicheOuverte && (() => {
        const dep = deplacementFicheOuverte
        const inputSt = { width: '100%', background: colors.background.raised, border: `1px solid ${colors.border.default}`, borderRadius: '8px', color: colors.text.primary, padding: '8px 10px', fontSize: '13px', boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif', marginTop: '4px' }
        return (
          <div onClick={() => setDeplacementFicheOuverte(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: colors.background.base, border: `1px solid ${colors.border.subtle}`, borderRadius: '20px', width: '100%', maxWidth: '480px', padding: '24px', margin: 'auto', maxHeight: '90vh', overflowY: 'auto' }}>
              <p style={{ margin: '0 0 16px', fontWeight: 800, fontSize: '16px' }}>📋 Fiche déplacement — {dep.lieu_destination}</p>

              <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
                <p style={{ fontSize: '10px', color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px', fontWeight: 700 }}>Données automatiques</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px', color: colors.text.secondary }}>
                  <div>📍 <strong>{dep.lieu_destination || '—'}</strong></div>
                  <div>👥 <strong>{dep.equipe || '—'}</strong></div>
                  <div>🎯 <strong>{{ match: 'Match', tournoi: 'Tournoi', stage: 'Stage', autre: 'Autre' }[dep.nature] || 'Match'}</strong></div>
                  <div><strong>{dep.vehicule || '—'}</strong></div>
                  <div>📅 <strong>{new Date(dep.date_depart + 'T12:00:00').toLocaleDateString('fr-FR')}</strong></div>
                  <div>🕐 <strong>{dep.heure_depart || '—'}</strong></div>
                </div>
              </div>

              {fichesBus.length === 0 ? (
                <p style={{ color: colors.text.faint, fontSize: '12px', margin: '0 0 12px' }}>Aucun bus assigné à ce déplacement — assigne un véhicule dans Déplacements avant de remplir la fiche.</p>
              ) : (
                fichesBus.map((f, idx) => (
                  <div key={f.immat} style={{ background: colors.background.surface, borderRadius: '10px', padding: '14px', marginBottom: '12px', border: `1px solid ${colors.border.subtle}` }}>
                    <div style={{ fontWeight: 700, color: colors.accent.green, marginBottom: '10px', fontSize: '13px' }}>{f.immat}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <label style={{ fontSize: '11px', color: colors.text.muted }}>Km avant
                        <input type="number" placeholder="ex: 45230" value={f.km_avant} onChange={e => modifierFicheBus(idx, 'km_avant', e.target.value)} style={inputSt} />
                      </label>
                      <label style={{ fontSize: '11px', color: colors.text.muted }}>Km après
                        <input type="number" placeholder="ex: 45380" value={f.km_apres} onChange={e => modifierFicheBus(idx, 'km_apres', e.target.value)} style={inputSt} />
                      </label>
                      <label style={{ fontSize: '11px', color: colors.text.muted }}>Gasoil avant
                        <input type="text" placeholder="ex: 4/4" value={f.gasoil_avant} onChange={e => modifierFicheBus(idx, 'gasoil_avant', e.target.value)} style={inputSt} />
                      </label>
                      <label style={{ fontSize: '11px', color: colors.text.muted }}>Gasoil après
                        <input type="text" placeholder="ex: 2/4" value={f.gasoil_apres} onChange={e => modifierFicheBus(idx, 'gasoil_apres', e.target.value)} style={inputSt} />
                      </label>
                    </div>
                    <label style={{ fontSize: '11px', color: colors.text.muted, display: 'block', marginTop: '10px' }}>Nom du conducteur
                      <input type="text" placeholder="Prénom Nom" value={f.conducteur} onChange={e => modifierFicheBus(idx, 'conducteur', e.target.value)} style={inputSt} />
                    </label>
                    <label style={{ fontSize: '11px', color: colors.text.muted, display: 'block', marginTop: '10px' }}>Remarques sur le véhicule
                      <textarea placeholder="Ex: pneu avant gauche à vérifier, clim en panne..." value={f.remarques_vehicule} onChange={e => modifierFicheBus(idx, 'remarques_vehicule', e.target.value)} rows={2} style={{ ...inputSt, resize: 'vertical' }} />
                    </label>
                  </div>
                ))
              )}

              <label style={{ fontSize: '11px', color: colors.text.muted, display: 'block' }}>Remarques générales
                <textarea placeholder="Observations sur le déplacement..." value={remarquesGenerales} onChange={e => setRemarquesGenerales(e.target.value)} rows={2} style={{ ...inputSt, resize: 'vertical' }} />
              </label>

              <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
                <button onClick={sauvegarderFiche} disabled={savingFiche}
                  style={{ flex: 1, background: colors.accent.green, color: colors.background.base, border: 'none', borderRadius: '10px', padding: '12px', fontWeight: 700, cursor: savingFiche ? 'wait' : 'pointer', fontFamily: 'Inter, sans-serif', opacity: savingFiche ? 0.6 : 1 }}>
                  {savingFiche ? 'Enregistrement...' : '💾 Enregistrer la fiche'}
                </button>
                <button onClick={() => setDeplacementFicheOuverte(null)}
                  style={{ background: 'transparent', border: `1px solid ${colors.border.default}`, color: colors.text.muted, borderRadius: '10px', padding: '12px 16px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// educateurIdOverride/permissions : utilisés quand ce dashboard est rendu pour un
// dirigeant délégué (DashboardDirigeant.jsx) plutôt que pour l'éducateur lui-même —
// voir canEdit()/canView() et sidebarSections plus bas pour le gating par section.
export default function DashboardEducateur({ educateurIdOverride, permissions } = {}) {
  const navigate = useNavigate()
  const colors = useColors()
  const { lang, setLang } = useLang()
  const [userId, setUserId] = useState(null)
  const [profil, setProfil] = useState(null)
  const [staffClub, setStaffClub] = useState(null) // { club_id } si ce compte est aussi staff d'un club
  const [activeSection, setActiveSection] = useState('accueil')
  const [loading, setLoading] = useState(true)
  // Tablette alignée sur le comportement téléphone (menu en tiroir), sur
  // demande explicite — auparavant un troisième mode dédié (sidebar réduite
  // aux icônes, 64px, repliable) existait entre 768 et 1024px pour préserver
  // la largeur du contenu (ex: le canvas Tactipad) ; isTablet reste déclaré
  // (utilisé par de nombreux styles plus bas) mais toujours à false, pour ne
  // pas devoir toucher chacun de ces usages individuellement.
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)
  const isTablet = false
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Repli manuel supplémentaire pour la tablette : la sidebar réduite aux
  // icônes (64px) prend déjà moins de place que le desktop, mais un bouton
  // permet de la masquer complètement pour gagner encore plus de largeur
  // (utile pour Tactipad, cf. ResizeObserver sur son conteneur).
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [onboardingKey, setOnboardingKey] = useState(0)
  const replayOnboarding = () => setOnboardingKey(k => k + 1)
  const [statsSubTab, setStatsSubTab] = useState('tableau')
  const [statsTri, setStatsTri] = useState('buts') // pour classement

  // Équipe
  const [joueurs, setJoueurs] = useState([])
  const [showAddJoueur, setShowAddJoueur] = useState(false)
  const [newJoueur, setNewJoueur] = useState({ prenom: '', nom: '', poste: '', categorie: '', numero_maillot: '', date_naissance: '', numero_licence: '' })
  const importRef = useRef(null)
  const [importPreview, setImportPreview] = useState(null) // { rows: [], importing: false, done: 0 }
  const [importError, setImportError] = useState('')
  const [savingJoueur, setSavingJoueur] = useState(false)
  const [joueurActif, setJoueurActif] = useState(null)
  const [vueEquipe, setVueEquipe] = useState('poste') // 'poste' | 'liste'
  const [joueurEnEdition, setJoueurEnEdition] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [joueurProfil, setJoueurProfil] = useState(null)
  const [joueurMoisDetail, setJoueurMoisDetail] = useState(null)
  const [inviteEmails, setInviteEmails] = useState({})
  const [invitingId, setInvitingId] = useState(null)
  const [inviteStatus, setInviteStatus] = useState({}) // { joueurId: 'sent' | 'error' }

  // Compétition
  const [competitionSubTab, setCompetitionSubTab] = useState('resultats')
  const [ligueUrl, setLigueUrl] = useState('')
  const [savingLigueUrl, setSavingLigueUrl] = useState(false)
  // Calendrier scanner
  const [calendarImages, setCalendarImages] = useState([])
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [publishingCalendrier, setPublishingCalendrier] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)
  const [calendarStatus, setCalendarStatus] = useState(null)
  const [calendarError, setCalendarError] = useState(null)
  const [calendarMatchs, setCalendarMatchs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('calendarMatchs') || '[]') } catch { return [] }
  })

  // Matchs
  const [matchs, setMatchs] = useState([])
  const [showAddMatch, setShowAddMatch] = useState(false)
  const [newMatch, setNewMatch] = useState({ date: '', heure: '', lieu: '', ville: '', adversaire: '', domicile: true, competition: '', score_nous: '', score_eux: '' })
  const [savingMatch, setSavingMatch] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [scannerImageBase64, setScannerImageBase64] = useState(null)
  const [scannerImagePreview, setScannerImagePreview] = useState(null)
  const [scannerLoading, setScannerLoading] = useState(false)
  const [scannerStatus, setScannerStatus] = useState(null)
  const [scannerResult, setScannerResult] = useState(null)
  const [scannerMatchData, setScannerMatchData] = useState({ date: '', adversaire: '', competition: '', score_nous: '', score_eux: '', domicile: true })
  const [scannerStats, setScannerStats] = useState({})
  const [scannerButsDetail, setScannerButsDetail] = useState([]) // [{ minute, equipe }] — pour matchs_equipe.buts_detail
  const [scannerSaving, setScannerSaving] = useState(false)
  const [scannerError, setScannerError] = useState(null)
  const [scannerWarning, setScannerWarning] = useState(null) // avertissement si peu de joueurs détectés vs effectif
  const [matchActif, setMatchActif] = useState(null)
  const [statsMatch, setStatsMatch] = useState({})
  const [matchANoter, setMatchANoter] = useState(null)
  const [dispoJoueursMatch, setDispoJoueursMatch] = useState({}) // { [match_id]: { [profil_joueur_id]: statut } } — auto-déclaré par le joueur, via disponibilites.match_id
  const [modalSondageMatch, setModalSondageMatch] = useState(null) // match affiché dans la modale résultats
  const [convocationsCoches, setConvocationsCoches] = useState({}) // { [joueur_id]: bool }, pré-coché ✅/🏆 à l'ouverture de la modale
  const [convocationExistante, setConvocationExistante] = useState(null) // ligne convocations déjà publiée pour ce match, si existante
  const [convocationForm, setConvocationForm] = useState({ type_terrain: 'Herbe', arbitre_nom: '', notes: '', timeline: [] })
  const [publiantConvocation, setPubliantConvocation] = useState(false)
  const [scrollVersConvocation, setScrollVersConvocation] = useState(false) // ouverture via le bouton "📢 Convocation" plutôt que "📋 Sondage dispo" → scroll direct à la section
  const convocationSectionRef = useRef(null)

  useEffect(() => {
    if (modalSondageMatch && scrollVersConvocation) {
      convocationSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setScrollVersConvocation(false)
    }
  }, [modalSondageMatch, scrollVersConvocation])

  const [modalMatchJoue, setModalMatchJoue] = useState(null)
  const [modalMatchForm, setModalMatchForm] = useState(null)
  const [savingMatchForm, setSavingMatchForm] = useState(false)
  const [scoreJoueForm, setScoreJoueForm] = useState({ score_nous: '', score_eux: '' })
  const [savingMatchJoue, setSavingMatchJoue] = useState(false)
  const [scannerModalButsDetail, setScannerModalButsDetail] = useState([]) // [{ minute, equipe, nature }] — pour matchs_equipe.buts_detail
  const [scannerModalImageBase64, setScannerModalImageBase64] = useState(null)
  const [scannerModalImagePreview, setScannerModalImagePreview] = useState(null)
  const [scannerModalLoading, setScannerModalLoading] = useState(false)
  const [scannerModalStatus, setScannerModalStatus] = useState(null)
  const [scannerModalError, setScannerModalError] = useState(null)

  // Entraînements
  const [entrainements, setEntrainements] = useState([])
  const [showAddEntrainement, setShowAddEntrainement] = useState(false)
  const [newEntrainement, setNewEntrainement] = useState({ date: '', description: '', heure: '', lieu: '', fiche_id: null })
  const [entrainementEnEdition, setEntrainementEnEdition] = useState(null)
  const [savingEntrainementEdit, setSavingEntrainementEdit] = useState(false)
  const [showImportFiche, setShowImportFiche] = useState(false)
  const [presences, setPresences] = useState({})
  const [entrainementActif, setEntrainementActif] = useState(null)
  const [dispoJoueurs, setDispoJoueurs] = useState({}) // { [entrainement_id]: { [profil_joueur_id]: statut } } — auto-déclaré par le joueur
  const [rapportsRecents, setRapportsRecents] = useState([]) // derniers rapports d'analyse, pour le fil d'activité de l'accueil
  const [sousOngletEnt, setSousOngletEnt] = useState('liste') // 'liste' | 'prochaine'
  const [savingCloture, setSavingCloture] = useState(false)
  const [savingHeureSeance, setSavingHeureSeance] = useState(false)
  const [showPlanificateur, setShowPlanificateur] = useState(false)
  const [planSaison, setPlanSaison] = useState({ joursActifs: [], dateDebut: '', dateFin: '', theme: '' })
  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [planProgress, setPlanProgress] = useState({ done: 0, total: 0 })

  // Notes / Évaluations
  const [notes, setNotes] = useState({})
  const [localNotes, setLocalNotes] = useState({}) // édition en cours par joueur_id
  const [notationsMatch, setNotationsMatch] = useState([]) // notations_match brutes : [{ joueur_id, note, match_id }]
  const [filtreCompTableau, setFiltreCompTableau] = useState('all') // filtre compétition, onglet Stats > Tableau
  const [savingNote, setSavingNote] = useState(false)

  // Mon Profil éducateur
  const [profilEdu, setProfilEdu] = useState(null)
  const [profilEduEdit, setProfilEduEdit] = useState(null)
  const [lienGroupe, setLienGroupe] = useState('')
  const [dirigeants, setDirigeants] = useState([])
  const [newDirigeantEmail, setNewDirigeantEmail] = useState('')
  const [newDirigeantPerms, setNewDirigeantPerms] = useState({
    effectif: 'lecture', stats: 'lecture', competition: 'lecture',
    entrainements: 'lecture', prep_physique: 'aucun', notes: 'aucun'
  })
  const [invitingDirigeant, setInvitingDirigeant] = useState(false)
  const [parcoursEdu, setParcoursEdu] = useState([])
  const [savingProfil, setSavingProfil] = useState(false)
  const [uploadingDiplome, setUploadingDiplome] = useState(false)
  const [avatarUploadingEdu, setAvatarUploadingEdu] = useState(false)

  // ── Explorer (réseau éducateurs/clubs + messagerie) ──
  const [explorerOnglet, setExplorerOnglet] = useState('educateurs') // 'educateurs' | 'clubs' | 'messages'
  const [explorerRecherche, setExplorerRecherche] = useState('')
  const [explorerRegion, setExplorerRegion] = useState('')
  const [educateursExplorer, setEducateursExplorer] = useState([])
  const [clubsExplorer, setClubsExplorer] = useState([])
  const [recrutementsParClubExplorer, setRecrutementsParClubExplorer] = useState({})
  const [explorerLoading, setExplorerLoading] = useState(false)
  const [explorerMessages, setExplorerMessages] = useState([])
  const [chatOuvert, setChatOuvert] = useState(null) // profil { id, prenom, nom, avatar_url } de la conversation ouverte
  const [nouveauMessageExplorer, setNouveauMessageExplorer] = useState('')
  const [envoyingMessageExplorer, setEnvoyingMessageExplorer] = useState(false)
  const [showAddParcours, setShowAddParcours] = useState(false)
  const [newParcours, setNewParcours] = useState({ type: 'coach', club: '', poste: '', saison_debut: '', saison_fin: '', niveau: '' })

  // Recrutement
  const [recrutJoueurs, setRecrutJoueurs] = useState([])
  const [recrutLoaded, setRecrutLoaded] = useState(false)
  const [recrutSearch, setRecrutSearch] = useState('')
  const [recrutPoste, setRecrutPoste] = useState('Tous')
  const [recrutCategorie, setRecrutCategorie] = useState('Toutes')
  const [recrutRegion, setRecrutRegion] = useState('Toutes')
  const [recrutSelectedJoueur, setRecrutSelectedJoueur] = useState(null)
  const [recrutParcours, setRecrutParcours] = useState([])
  const [recrutStyleDeJeu, setRecrutStyleDeJeu] = useState('Tous')

  const CARACTERISTIQUES_PAR_POSTE = {
    Gardien:   ['Détente', 'Relance longue', 'Relance courte', 'Placement', 'Jeu aérien', 'Un contre un', 'Communication', 'Leadership', 'Reflexes', 'Prise de balle', 'Agilité', 'Lecture du jeu'],
    Défenseur: ['Impact physique / Duel', 'Jeu aérien', 'Anticipation / Lecture du jeu', 'Relance longue', 'Relance courte', 'Vitesse', 'Gestion infériorité numérique', 'Leadership', 'Centre', '1 contre 1', 'Pressing', 'Marquage', 'Placement', 'Récupération de balle', 'Jeu propre', 'Combativité'],
    Milieu:    ['Vision du jeu', 'Pressing', 'Passes longues', 'Box-to-box', 'Dribble', 'Récupération', 'Créativité', 'Endurance', 'Pointe basse', "Déséquilibre l'adversaire", 'Vitesse', 'Impact physique / Duel', 'Technique', 'CPA', 'Corner', 'Frappe de loin', 'Finition', 'Centre', 'Passes courtes', 'Transition rapide', 'Jeu entre les lignes', 'Leadership'],
    Attaquant: ['Finition', 'Vitesse', 'Dribble', 'Jeu dos au but', 'Jeu aérien', 'Appels de balle', 'Technique', 'Pressing', 'CPA', 'Corner', 'Renard des surfaces', 'Profondeur', 'Duel 1 contre 1', 'Frappe de loin', 'Décalage', 'Combinaison', 'Mouvement sans ballon', 'Leadership offensif'],
  }

  useEffect(() => { init() }, [])
  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // sondageEstClos() est calculée en direct depuis l'heure courante (cf. lib/sondage.js),
  // donc aucune écriture en base n'est nécessaire à l'échéance — mais sans ce tick, rien
  // ne force React à recalculer entre deux interactions : le badge 🟢 Sondage ouvert et
  // les boutons de clôture auto restaient figés jusqu'au prochain rechargement de page,
  // donnant l'impression que "1h avant / 5h avant / 24h avant" ne faisait rien.
  const [, forcerReevaluationCloture] = useState(0)
  useEffect(() => {
    const id = setInterval(() => forcerReevaluationCloture(t => t + 1), 60 * 1000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => { if (activeSection === 'recrutement') chargerRecrutJoueurs() }, [activeSection])
  useEffect(() => {
    if (activeSection !== 'explorer') return
    if (educateursExplorer.length === 0 && clubsExplorer.length === 0) chargerExplorer()
    chargerMessagesExplorer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/login'); return }
    // Dirigeant délégué (DashboardDirigeant.jsx) : on charge le dashboard de l'éducateur
    // ciblé, pas celui du compte connecté. chargerStaffClub reste sur le compte connecté
    // (bouton "Vue Club" propre à qui est réellement staff, pas au dirigeant délégué).
    const targetId = educateurIdOverride || user.id
    const { data: p } = await supabase.from('profiles').select('*').eq('id', targetId).maybeSingle()
    if (!p || p.plan !== 'educateur') { navigate('/'); return }
    setUserId(targetId)
    setProfil(p)
    const [, , , , , , clubAffiliationData] = await Promise.all([chargerJoueurs(targetId), chargerMatchs(targetId), chargerEntrainements(targetId), chargerNotes(targetId), chargerNotationsMatch(targetId), chargerProfilEdu(targetId), chargerClubAffiliation(targetId), chargerClubCategories(targetId), chargerMesSeances(targetId), chargerMesSeancesOuvertes(targetId), chargerBiblio(targetId), chargerStaffClub(user.id), chargerDirigeants(targetId), chargerRapportsRecents(targetId), chargerNotifications(targetId)])
    // Chargé ici (pas seulement quand l'onglet "materiel" est ouvert) pour que le
    // widget "Alertes" de l'accueil puisse afficher "équipement prêt" dès l'arrivée.
    if (clubAffiliationData?.club_id) await chargerMesTaillesEquipementEduc(clubAffiliationData.club_id, targetId)
    setLoading(false)
  }

  const chargerNotifications = async (uid) => {
    const { data } = await supabase.from('notifications').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(30)
    setNotifications(data || [])
  }

  const marquerNotifLue = async (notifId) => {
    await supabase.from('notifications').update({ lu: true }).eq('id', notifId)
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, lu: true } : n))
  }

  const chargerStaffClub = async (uid) => {
    // Ce compte éducateur est-il aussi membre du staff d'un club ? (double accès)
    const { data } = await supabase
      .from('staff_club')
      .select('club_id, profiles!staff_club_club_id_fkey(club)')
      .eq('user_id', uid)
      .maybeSingle()
    setStaffClub(data || null)
  }

  const chargerClubAffiliation = async (uid) => {
    const { data, error } = await supabase
      .from('club_educateurs')
      .select('*, club:club_id(club, prenom, nom, avatar_url, ville)')
      .eq('educateur_id', uid)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) console.error('❌ chargerClubAffiliation error:', error.code, error.message)
    setClubAffiliation(data || null)
    return data || null
  }

  const chargerMesSeances = async (uid) => {
    const { data } = await supabase.from('seances_uploadees').select('*').eq('educateur_id', uid).eq('origine', 'club').order('created_at', { ascending: false })
    setMesSeances(data || [])
  }

  const supprimerDemande = async (id) => {
    const { error } = await supabase
      .from('seances_uploadees')
      .delete()
      .eq('id', id)
      .eq('educateur_id', userId)
    if (error) {
      console.error('Erreur suppression demande:', error)
      alert('Erreur lors de la suppression : ' + error.message)
      return
    }
    setConfirmSuppr(null)
    await Promise.all([chargerMesSeances(userId), chargerMesSeancesOuvertes(userId)])
  }

  const chargerMesSeancesOuvertes = async (uid) => {
    const { data } = await supabase
      .from('seances_uploadees')
      .select('*, evaluation:evaluations_seance(*)')
      .eq('educateur_id', uid)
      .eq('origine', 'ouvert')
      .order('date_seance', { ascending: false })
    setMesSeancesOuvertes(data || [])
  }

  const chargerClubCategories = async (uid) => {
    const { data: aff } = await supabase.from('club_educateurs').select('club_id').eq('educateur_id', uid).eq('statut', 'accepte').maybeSingle()
    if (!aff) { setClubCategories([]); setClubCategoriesChargees(true); return }
    const { data } = await supabase.from('club_categories').select('*').eq('club_id', aff.club_id).order('nom')
    setClubCategories(data || [])
    setClubCategoriesChargees(true)
  }

  // Déclare la catégorie/équipe gérée par cet éducateur (un dashboard educateur =
  // une équipe) — réclame une ligne club_categories déjà créée par le club mais
  // pas encore assignée (educateur_id null) si elle existe, sinon en crée une
  // nouvelle. Une fois déclarée, tous les nouveaux joueurs ajoutés en héritent
  // automatiquement (cf. ajouterJoueur) — plus besoin de le choisir à chaque fois.
  const declarerMaCategorie = async () => {
    if (!clubAffiliation?.club_id) return
    setSavingCategorieClub(true)
    const vacante = clubCategories.find(c => !c.educateur_id && c.nom === promptCategorieForm.nom && c.equipe === promptCategorieForm.equipe)
    const { error } = vacante
      ? await supabase.from('club_categories').update({ educateur_id: userId }).eq('id', vacante.id)
      : await supabase.from('club_categories').insert({ club_id: clubAffiliation.club_id, nom: promptCategorieForm.nom, equipe: promptCategorieForm.equipe, educateur_id: userId })
    setSavingCategorieClub(false)
    if (error) { alert('Erreur : ' + error.message); return }
    await chargerClubCategories(userId)
  }

  const chargerJoueurs = async (uid) => {
    const { data } = await supabase.from('equipe_joueurs').select('*').eq('educateur_id', uid).order('nom')
    setJoueurs(data || [])
  }

  const chargerMatchs = async (uid) => {
    const { data } = await supabase.from('matchs_equipe').select('*, stats_match(*), notations_match(id)').eq('educateur_id', uid).order('date', { ascending: false })
    setMatchs(data || [])

    // Dispos auto-déclarées par les joueurs pour ces matchs (mêmes disponibilites
    // que pour les entraînements, via match_id — déjà écrites par les joueurs
    // depuis leur dashboard, juste jamais affichées côté éducateur)
    const matchIds = (data || []).map(m => m.id)
    if (matchIds.length > 0) {
      const { data: dispos } = await supabase.from('disponibilites').select('id, joueur_id, match_id, statut, created_at').in('match_id', matchIds)
      const map = {}
      dispos?.forEach(d => { if (!map[d.match_id]) map[d.match_id] = {}; map[d.match_id][d.joueur_id] = d.statut })
      setDispoJoueursMatch(map)
    } else {
      setDispoJoueursMatch({})
    }
  }

  const chargerEntrainements = async (uid) => {
    const { data } = await supabase.from('entrainements').select('*, presences_entrainement(*)').eq('educateur_id', uid).order('date', { ascending: false })
    setEntrainements(data || [])

    // Dispos auto-déclarées par les joueurs pour ces entraînements (RLS : lisible car éducateur affilié)
    const entrainementIds = (data || []).map(e => e.id)
    if (entrainementIds.length > 0) {
      const { data: dispos } = await supabase.from('disponibilites').select('id, joueur_id, seance_id, statut, created_at').in('seance_id', entrainementIds)
      const map = {}
      dispos?.forEach(d => { if (!map[d.seance_id]) map[d.seance_id] = {}; map[d.seance_id][d.joueur_id] = d.statut })
      setDispoJoueurs(map)
    } else {
      setDispoJoueurs({})
    }
  }

  const chargerRapportsRecents = async (uid) => {
    const { data } = await supabase.from('rapports_analyse').select('id, prenom_joueur, poste, created_at, date_analyse').eq('educateur_id', uid).order('created_at', { ascending: false }).limit(5)
    setRapportsRecents(data || [])
  }

  const chargerNotes = async (uid) => {
    const { data } = await supabase.from('notes_joueurs').select('*').eq('educateur_id', uid)
    if (data) {
      const map = {}
      const localMap = {}
      data.forEach(n => {
        map[n.joueur_id] = n
        localMap[n.joueur_id] = { technique: n.technique || 0, physique: n.physique || 0, mental: n.mental || 0, tactique: n.tactique || 0, commentaire: n.commentaire || '', visible_joueur: n.visible_joueur || false }
      })
      setNotes(map)
      setLocalNotes(localMap)
    }
  }

  // Notes de match (notations_match, une note/10 par joueur et par match — distinct
  // de notes_joueurs ci-dessus qui est une notation technique/physique/mental/tactique).
  // Inclut aussi les notes d'équipe (joueur_id NULL, est_note_equipe=true) pour la
  // card "Note globale équipe" — les lignes équipe n'ont jamais de joueur_id, donc
  // elles ne perturbent pas le calcul de moyenne par joueur ci-dessous.
  const chargerNotationsMatch = async (uid) => {
    const { data } = await supabase.from('notations_match').select('joueur_id, note, match_id, est_note_equipe').eq('educateur_id', uid)
    setNotationsMatch(data || [])
  }

  const getLocalNote = (joueurId) => localNotes[joueurId] || { technique: 0, physique: 0, mental: 0, tactique: 0, commentaire: '', visible_joueur: false }

  const setLocalNote = (joueurId, update) => {
    setLocalNotes(prev => ({ ...prev, [joueurId]: { ...getLocalNote(joueurId), ...update } }))
  }

  const [notesEdu, setNotesEdu] = useState([])
  const [affiliations, setAffiliations] = useState([])

  const [clubAffiliation, setClubAffiliation] = useState(null) // liaison actuelle avec un club
  const [monMateriel, setMonMateriel] = useState([]) // materiel_distribution où educateur_id = userId
  const [champsEquipementEduc, setChampsEquipementEduc] = useState([])
  const [mesTaillesEduc, setMesTaillesEduc] = useState([])
  const [equipementPretEduc, setEquipementPretEduc] = useState(null) // ligne equipement_commandes si statut='pret'
  const [equipementCommandeEduc, setEquipementCommandeEduc] = useState(null) // ligne equipement_commandes quel que soit le statut (affichage "Remis le ...")
  const [packAttribueEduc, setPackAttribueEduc] = useState(null) // equipement_packs attribué à cet éducateur
  const [notifications, setNotifications] = useState([])

  // Tailles équipement côté éducateur — mêmes tables que DashboardJoueur.jsx,
  // scopées au pack attribué (equipement_attributions → champs_ids), pas à
  // tous les champs cible 'educateur' du club (qui peuvent appartenir à
  // d'autres packs sans rapport).
  // clubId explicite pour l'appel depuis init() (juste après chargerClubAffiliation,
  // avant que son setClubAffiliation n'ait pu re-render — la closure de ce init()
  // en cours resterait sinon sur clubAffiliation=null). L'appel depuis l'onglet
  // "materiel" (useEffect plus bas) continue de s'appuyer sur l'état à jour.
  // Déclarée ici (avant le `if (loading) return` plus bas dans le rendu) et non
  // plus loin dans le fichier : init() l'appelle depuis un useEffect enregistré
  // dès le tout premier rendu (loading=true) — si sa définition se trouvait après
  // le early-return, cette instance de fermeture ne l'aurait jamais initialisée,
  // provoquant un ReferenceError "Cannot access before initialization" au premier
  // chargement de la page.
  const chargerMesTaillesEquipementEduc = async (clubIdParam, userIdParam) => {
    const clubId = clubIdParam || clubAffiliation?.club_id
    const uid = userIdParam || userId
    if (!clubId || !uid) return
    const [{ data: attribution }, { data: tailles }, { data: commande }] = await Promise.all([
      supabase.from('equipement_attributions').select('*, pack:pack_id(*)').eq('club_id', clubId).eq('user_id', uid).maybeSingle(),
      supabase.from('equipement_tailles').select('*').eq('user_id', uid),
      supabase.from('equipement_commandes').select('*').eq('destinataire_id', uid).maybeSingle(),
    ])
    const pack = attribution?.pack || null
    setPackAttribueEduc(pack)
    if (pack?.champs_ids?.length) {
      const { data: champs } = await supabase.from('equipement_champs').select('*').in('id', pack.champs_ids).eq('actif', true).order('ordre')
      setChampsEquipementEduc(champs || [])
    } else {
      setChampsEquipementEduc([])
    }
    setMesTaillesEduc(tailles || [])
    setEquipementCommandeEduc(commande || null)
    setEquipementPretEduc(commande?.statut === 'pret' ? commande : null)
  }

  useEffect(() => { if (activeSection === 'materiel' && clubAffiliation?.club_id) { chargerMonMateriel(); chargerMesTaillesEquipementEduc() } }, [activeSection, clubAffiliation])
  const [clubCategories, setClubCategories] = useState([])
  const [clubCategoriesChargees, setClubCategoriesChargees] = useState(false)
  const [promptCategorieForm, setPromptCategorieForm] = useState({ nom: 'U13', equipe: 'A' })
  const [savingCategorieClub, setSavingCategorieClub] = useState(false)
  // Un dashboard educateur = une équipe : la catégorie/équipe club que gère cet
  // éducateur, une fois déclarée (cf. declarerMaCategorie) — undefined tant
  // qu'il ne l'a pas encore fait.
  const monCategorieClub = clubCategories.find(c => c.educateur_id === userId)

  const [mesSeances, setMesSeances] = useState([])
  const [showUploadSeance, setShowUploadSeance] = useState(false)
  const [seanceSaison, setSeanceSaison] = useState('2025-2026')
  const [seanceTheme, setSeanceTheme] = useState('')
  const [seanceDate, setSeanceDate] = useState('')
  const [seanceVideoFile, setSeanceVideoFile] = useState(null)
  const [uploadingSeance, setUploadingSeance] = useState(false)
  const [seanceVideoMode, setSeanceVideoMode] = useState('upload') // 'upload' | 'veo'
  const [seanceVeoUrl, setSeanceVeoUrl] = useState('')
  const [codeClubInput, setCodeClubInput] = useState('')
  const [sendingCodeClub, setSendingCodeClub] = useState(false)
  const [codeClubError, setCodeClubError] = useState(null)
  const [codeClubSuccess, setCodeClubSuccess] = useState(false)

  // Onglet "Mes séances" (séances ouvertes, hors flux club)
  const [mesSeancesOuvertes, setMesSeancesOuvertes] = useState([])
  const [uploadSeanceOuverteForm, setUploadSeanceOuverteForm] = useState({ theme: '', date_seance: '', categorie_tactique: '', video_url: '', fichier_url: '', commentaire_perso: '' })
  const [dossiersOuverts, setDossiersOuverts] = useState({})
  const [modeSeance, setModeSeance] = useState('enregistrer')
  const [confirmSuppr, setConfirmSuppr] = useState(null) // id de la séance à confirmer

  // Bibliothèque de procédés d'entraînement
  const [biblio, setBiblio] = useState([])
  const [biblioLoading, setBiblioLoading] = useState(false)
  const [biblioTab, setBiblioTab] = useState('tous') // 'tous' | 'jeu' | 'exercice' | 'situation' | 'echauffement'
  const [biblioSearch, setBiblioSearch] = useState('')
  const PROCEDE_VIDE = { type: 'exercice', nom: '', theme: '', description: '', consignes: '', variables: '', duree: '', nb_joueurs: '', tags: '', schema_png: '' }
  const [modalProcede, setModalProcede] = useState(false)
  const [showTactipadBiblio, setShowTactipadBiblio] = useState(false)
  const [procedeEnEdition, setProcedeEnEdition] = useState(null) // null = nouveau
  const [procedeForm, setProcedeForm] = useState(PROCEDE_VIDE)
  const [savingProcede, setSavingProcede] = useState(false)
  const [modalBiblioImport, setModalBiblioImport] = useState(null) // index du procédé cible dans la fiche, ou null si fermé
  const [modalImportFicheEntrainement, setModalImportFicheEntrainement] = useState(null) // id de l'entraînement cible, ou null si fermé
  const [moisOuverts, setMoisOuverts] = useState(() => {
    const now = new Date()
    return new Set([`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`])
  })
  const ficheVide = {
    theme: '', date: '', categorie_tactique: '', nb_joueurs: '', duree_totale: '', objectif_general: '',
    // Mode diplôme (BMF/BEF/DEF) — optionnel, null = fiche libre. Fait partie de
    // `fiche` (et donc de fiche_seance à la sauvegarde) plutôt que des states
    // séparés : ce composant centralise déjà toute la fiche dans un seul objet.
    mode_diplome: null, phase_jeu: '', principe_jeu: '',
    constats: '', justification_pedagogique: '', auto_evaluation: '',
    analyse_equipe: '', bilan_projection: '',
    procedes: Array(4).fill(null).map((_, i) => ({
      numero: i + 1, titre: '', duree: '', nb_joueurs: '', but: '', organisation: '', consignes: '', variables: ''
    }))
  }
  const [fiche, setFiche] = useState(ficheVide)
  const [sport, setSport] = useState('football')
  const [tactipadModal, setTactipadModal] = useState(null) // index du procédé en cours d'édition de schéma
  const [savingFiche, setSavingFiche] = useState(false)
  const [uploadingSeanceOuverte, setUploadingSeanceOuverte] = useState(false)
  const [ficheFichierUrl, setFicheFichierUrl] = useState(null) // image du scan d'origine, portée jusqu'à la sauvegarde de la fiche
  const [ficheExtraite, setFicheExtraite] = useState(false) // bandeau "fiche extraite" affiché après un scan IA
  const [ficheApercu, setFicheApercu] = useState(null) // fiche archivée (seances_uploadees row) affichée dans le modal aperçu
  const [modeEditionApercu, setModeEditionApercu] = useState(false)
  const [ficheApercuEdit, setFicheApercuEdit] = useState(null) // copie éditable de ficheApercu.fiche_seance + categorie_tactique, tant que modeEditionApercu est actif
  const [savingFicheApercu, setSavingFicheApercu] = useState(false)
  const [scanImageFile, setScanImageFile] = useState(null)
  const [scanImagePreview, setScanImagePreview] = useState(null)
  const [scanImageBase64, setScanImageBase64] = useState(null)
  const [scanningFiche, setScanningFiche] = useState(false)
  const [scanFicheStatus, setScanFicheStatus] = useState(null)
  const [scanFicheError, setScanFicheError] = useState(null)

  // Générateur IA de séance (modale déclenchée depuis "Mes séances")
  const [modalGenerationIA, setModalGenerationIA] = useState(false)
  const GENERATION_IA_VIDE = { objectif: '', duree: '60', nb_joueurs: '', categorie_age: 'U13', niveau: 'Intermédiaire' }
  const [generationIAForm, setGenerationIAForm] = useState(GENERATION_IA_VIDE)
  const [generatingIA, setGeneratingIA] = useState(false)
  const [generationIAStatus, setGenerationIAStatus] = useState(null)
  const [generationIAError, setGenerationIAError] = useState(null)
  // Snapshot de la dernière génération IA réussie (phases brutes + paramètres du
  // formulaire) — conservé pour l'export PDF format FFF, qui a besoin du détail
  // par phase (organisation/règles/consignes/critères séparés) alors que
  // fiche.procedes consolide déjà certains de ces champs pour l'écran "Rédiger".
  // generationIAForm est remis à vide juste après la génération, d'où ce
  // snapshot séparé plutôt que de relire generationIAForm au moment de l'export.
  const [derniereGenerationIA, setDerniereGenerationIA] = useState(null)

  const chargerProfilEdu = async (uid) => {
    // avatar_url vit sur profiles (identité de base, partagée avec tous les
    // rôles), pas sur profil_educateur (profil étendu spécifique éducateur)
    // — déjà lu par DashboardClub.jsx/ClubPublic.jsx pour l'affichage public,
    // simplement jamais éditable côté éducateur jusqu'ici.
    const { data: profilBase } = await supabase.from('profiles').select('avatar_url').eq('id', uid).maybeSingle()
    const { data: pe } = await supabase.from('profil_educateur').select('*').eq('user_id', uid).single()
    if (pe) { setProfilEdu({ ...pe, avatar_url: profilBase?.avatar_url }); setProfilEduEdit({ ...pe, avatar_url: profilBase?.avatar_url }); setLienGroupe(pe.lien_groupe || '') }
    else { setProfilEduEdit({ prenom: '', nom: '', diplome: '', categorie: '', club: '', niveau_championnat: '', avatar_url: profilBase?.avatar_url }) }
    const { data: pa } = await supabase.from('parcours_educateur').select('*').eq('user_id', uid).order('ordre')
    setParcoursEdu(pa || [])
    const { data: ne } = await supabase.from('notes_educateur').select('*, profiles:auteur_id(prenom, nom, plan)').eq('educateur_id', uid)
    setNotesEdu(ne || [])
    // joueur (via equipe_joueur_id) ne résout que si la demande a déjà été
    // liée à une fiche du roster — c'est justement ce que l'éducateur choisit
    // au moment d'accepter (setAffiliationEnCours), donc toujours null pour
    // une demande "en attente" : joueur_profil (via joueur_id, le vrai
    // compte du demandeur) est la seule source fiable à ce stade.
    const { data: af } = await supabase.from('affiliations').select('*, joueur:equipe_joueur_id(prenom, nom), joueur_profil:joueur_id(prenom, nom, email, avatar_url)').eq('educateur_id', uid).order('created_at', { ascending: false })
    setAffiliations(af || [])
  }

  const chargerDirigeants = async (uid) => {
    const { data } = await supabase.from('dirigeant_acces').select('*').eq('educateur_id', uid)
    setDirigeants(data || [])
  }

  const inviterDirigeant = async () => {
    if (!newDirigeantEmail.trim()) return
    setInvitingDirigeant(true)
    const { data, error } = await supabase.functions.invoke('envoyer-invitation', {
      body: { email: newDirigeantEmail.trim(), role: 'dirigeant', educateur_id: userId, permissions: newDirigeantPerms }
    })
    if (error || data?.error) { alert('Erreur : ' + (data?.error || error.message)) }
    else { await chargerDirigeants(userId); setNewDirigeantEmail('') }
    setInvitingDirigeant(false)
  }

  const renvoyerInvitationDirigeant = async (d) => {
    const { data, error } = await supabase.functions.invoke('envoyer-invitation', {
      body: { email: d.email, role: 'dirigeant', educateur_id: userId, permissions: d.permissions }
    })
    if (error || data?.error) alert('Erreur : ' + (data?.error || error.message))
    else alert('Invitation renvoyée à ' + d.email)
  }

  const supprimerDirigeant = async (id) => {
    if (!confirm('Supprimer cette invitation ?')) return
    await supabase.from('dirigeant_acces').delete().eq('id', id)
    await chargerDirigeants(userId)
  }

  const modifierPermissions = async (dirigeantId, key, val) => {
    const dirigeant = dirigeants.find(d => d.id === dirigeantId)
    if (!dirigeant) return
    const newPerms = { ...dirigeant.permissions, [key]: val }
    setDirigeants(prev => prev.map(d => (d.id === dirigeantId ? { ...d, permissions: newPerms } : d)))
    const { error } = await supabase.from('dirigeant_acces').update({ permissions: newPerms }).eq('id', dirigeantId)
    if (error) { alert('Erreur : ' + error.message); await chargerDirigeants(userId) }
  }

  const rejoindreClub = async () => {
    if (!codeClubInput.trim()) return
    setSendingCodeClub(true)
    setCodeClubError(null)
    setCodeClubSuccess(false)
    const { data: clubProfile } = await supabase
      .from('profiles')
      .select('id, club, prenom, nom')
      .ilike('code_club', codeClubInput.trim())
      .eq('plan', 'club')
      .maybeSingle()
    if (!clubProfile) {
      setCodeClubError('Code invalide — vérifie auprès du club.')
      setSendingCodeClub(false)
      return
    }
    const { data: exist } = await supabase.from('club_educateurs').select('id, statut').eq('club_id', clubProfile.id).eq('educateur_id', userId).single()
    if (exist) {
      setCodeClubError(exist.statut === 'accepte' ? 'Tu es déjà affilié à ce club.' : 'Une demande est déjà en cours avec ce club.')
      setSendingCodeClub(false)
      return
    }
    await supabase.from('club_educateurs').insert({ club_id: clubProfile.id, educateur_id: userId, statut: 'en_attente', methode: 'code' })
    setCodeClubSuccess(true)
    setCodeClubInput('')
    await chargerClubAffiliation(userId)
    setSendingCodeClub(false)
  }

  const uploaderSeance = async () => {
    if (!clubAffiliation?.club_id || clubAffiliation.statut !== 'accepte') return
    if (seanceVideoMode === 'upload' && !seanceVideoFile) return
    if (seanceVideoMode === 'veo' && !seanceVeoUrl.trim()) return
    const dejaCetteSaison = mesSeances.filter(s => s.saison === seanceSaison).length
    if (dejaCetteSaison >= 2) { alert('Tu as déjà uploadé 2 séances pour cette saison.'); return }
    setUploadingSeance(true)
    try {
      let videoUrl = null
      if (seanceVideoMode === 'veo') {
        videoUrl = seanceVeoUrl.trim()
      } else {
        const sigRes = await fetch('/api/upload-video', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) })
        const { signature, timestamp, folder, public_id, cloud_name, api_key } = await sigRes.json()
        const formData = new FormData()
        formData.append('file', seanceVideoFile)
        formData.append('signature', signature)
        formData.append('timestamp', timestamp)
        formData.append('folder', folder)
        formData.append('public_id', public_id)
        formData.append('api_key', api_key)
        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/video/upload`, { method: 'POST', body: formData })
        const uploadData = await uploadRes.json()
        videoUrl = uploadData.secure_url || null
      }
      if (videoUrl) {
        await supabase.from('seances_uploadees').insert({
          educateur_id: userId,
          club_id: clubAffiliation.club_id,
          saison: seanceSaison,
          theme: seanceTheme || null,
          date_seance: seanceDate || null,
          video_url: videoUrl,
          origine: 'club',
        })
        await chargerMesSeances(userId)
        setShowUploadSeance(false)
        setSeanceTheme(''); setSeanceDate(''); setSeanceVideoFile(null); setSeanceVeoUrl(''); setSeanceVideoMode('upload')
      }
    } catch (e) { console.error(e) }
    setUploadingSeance(false)
  }

  const CATEGORIES_TACTIQUES = [
    { value: 'proteger_axe_but', label: 'Protéger l\'axe du but', groupe: '🛡️ Défense / Transition' },
    { value: 'reformuler_bloc_equipe', label: 'Reformuler le bloc équipe', groupe: '🛡️ Défense / Transition' },
    { value: 'conserver', label: 'Conserver', groupe: '🔄 Conserver / Progresser' },
    { value: 'progresser', label: 'Progresser', groupe: '🔄 Conserver / Progresser' },
    { value: 'desequilibrer', label: 'Déséquilibrer', groupe: '⚡ Déséquilibrer / Finir' },
    { value: 'finir', label: 'Finir', groupe: '⚡ Déséquilibrer / Finir' },
  ]
  const CATEGORIES_TACTIQUES_GROUPEES = CATEGORIES_TACTIQUES.reduce((acc, cat) => {
    if (!acc[cat.groupe]) acc[cat.groupe] = []
    acc[cat.groupe].push(cat)
    return acc
  }, {})

  // Après l'enregistrement d'une fiche (Rédiger ou Enregistrer), lie
  // automatiquement l'entraînement du calendrier qui tombe à la même date —
  // sans ça, une fiche rédigée/uploadée avec une date ne s'attache à rien tant
  // que l'éducateur ne va pas cliquer "Attacher une fiche" manuellement sur cet
  // entraînement (ex: le bouton de la carte "Prochaine séance"). Ne touche
  // jamais un entraînement qui a déjà une fiche liée par ailleurs.
  const lierFicheAEntrainementCorrespondant = async (ficheId, dateSeance) => {
    if (!ficheId || !dateSeance) return
    const cible = entrainements.find(e => e.date === dateSeance && !e.fiche_id)
    if (!cible) return
    await supabase.from('entrainements').update({ fiche_id: ficheId }).eq('id', cible.id)
    setEntrainements(prev => prev.map(e => (e.id === cible.id ? { ...e, fiche_id: ficheId } : e)))
  }

  const uploaderFichierSeance = async (file) => {
    const sigRes = await fetch('/api/upload-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) })
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
    return uploadData.secure_url || null
  }

  const uploaderMaSeance = async () => {
    setUploadingSeanceOuverte(true)
    const { data: inserted, error } = await supabase.from('seances_uploadees').insert({
      educateur_id: userId,
      theme: uploadSeanceOuverteForm.theme || null,
      date_seance: uploadSeanceOuverteForm.date_seance || null,
      categorie_tactique: uploadSeanceOuverteForm.categorie_tactique || null,
      video_url: uploadSeanceOuverteForm.video_url || null,
      fichier_url: uploadSeanceOuverteForm.fichier_url || null,
      commentaire_perso: uploadSeanceOuverteForm.commentaire_perso || null,
      origine: 'ouvert',
      statut: 'en_attente',
      saison: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    }).select().single()
    setUploadingSeanceOuverte(false)
    if (error) {
      console.error('Erreur insertion séance:', error)
      alert('Erreur lors de l\'enregistrement : ' + error.message)
      return
    }
    await lierFicheAEntrainementCorrespondant(inserted.id, uploadSeanceOuverteForm.date_seance)
    setUploadSeanceOuverteForm({ theme: '', date_seance: '', categorie_tactique: '', video_url: '', fichier_url: '', commentaire_perso: '' })
    await chargerMesSeancesOuvertes(userId)
  }

  const updateProcede = (index, field, value) => {
    const newProcedes = [...fiche.procedes]
    newProcedes[index] = { ...newProcedes[index], [field]: value }
    setFiche({ ...fiche, procedes: newProcedes })
  }

  // fiche.procedes était initialisé à un nombre fixe (4, cf. ficheVide) sans
  // moyen d'en ajouter ou retirer — ajouterProcedeFiche/retirerProcedeFiche
  // comblent ça. Nom différent de supprimerProcede (bibliotheque_exercices,
  // plus haut) qui gère un tout autre concept (la bibliothèque d'exercices
  // réutilisables, pas les procédés de la fiche en cours de rédaction).
  const ajouterProcedeFiche = () => {
    setFiche(f => ({
      ...f,
      procedes: [...f.procedes, { numero: f.procedes.length + 1, titre: '', duree: '', nb_joueurs: '', but: '', organisation: '', consignes: '', variables: '' }],
    }))
  }

  const retirerProcedeFiche = (index) => {
    setFiche(f => {
      if (f.procedes.length <= 1) return f
      return { ...f, procedes: f.procedes.filter((_, i) => i !== index).map((p, i) => ({ ...p, numero: i + 1 })) }
    })
  }

  // ── Édition d'une fiche archivée (modal "aperçu", seances_uploadees) ───────────
  // Copie éditable séparée de `fiche`/`setFiche` (celle-ci sert à la RÉDACTION
  // d'une nouvelle fiche dans l'onglet dédié, avec sa propre sauvegarde en INSERT
  // — mélanger les deux casserait cet écran). Ici sauvegarderFicheApercuEdit fait
  // un UPDATE sur la ligne déjà archivée.
  const ouvrirEditionApercu = () => {
    const fs = ficheApercu?.fiche_seance || {}
    setFicheApercuEdit({
      theme: fs.theme || '', date: fs.date || '', categorie_tactique: ficheApercu?.categorie_tactique || '',
      nb_joueurs: fs.nb_joueurs || '', duree_totale: fs.duree_totale || '', objectif_general: fs.objectif_general || '',
      sport: fs.sport || 'football',
      mode_diplome: fs.mode_diplome || null, phase_jeu: fs.phase_jeu || '', principe_jeu: fs.principe_jeu || '',
      constats: fs.constats || '', justification_pedagogique: fs.justification_pedagogique || '', auto_evaluation: fs.auto_evaluation || '',
      analyse_equipe: fs.analyse_equipe || '', bilan_projection: fs.bilan_projection || '',
      procedes: (fs.procedes && fs.procedes.length ? fs.procedes : [{ numero: 1, titre: '', duree: '', nb_joueurs: '', but: '', organisation: '', consignes: '', variables: '' }])
        .map(p => ({ ...p })),
    })
    setModeEditionApercu(true)
  }

  const updateProcedeApercu = (index, field, value) => {
    setFicheApercuEdit(f => {
      const procedes = [...f.procedes]
      procedes[index] = { ...procedes[index], [field]: value }
      return { ...f, procedes }
    })
  }

  const ajouterProcedeApercu = () => {
    setFicheApercuEdit(f => ({
      ...f,
      procedes: [...f.procedes, { numero: f.procedes.length + 1, titre: '', duree: '', nb_joueurs: '', but: '', organisation: '', consignes: '', variables: '' }],
    }))
  }

  const retirerProcedeApercu = (index) => {
    setFicheApercuEdit(f => {
      if (f.procedes.length <= 1) return f
      return { ...f, procedes: f.procedes.filter((_, i) => i !== index).map((p, i) => ({ ...p, numero: i + 1 })) }
    })
  }

  const annulerEditionApercu = () => {
    setModeEditionApercu(false)
    setFicheApercuEdit(null)
  }

  const sauvegarderFicheApercuEdit = async () => {
    setSavingFicheApercu(true)
    const payload = {
      theme: ficheApercuEdit.theme || null,
      date_seance: ficheApercuEdit.date || null,
      categorie_tactique: ficheApercuEdit.categorie_tactique || null,
      fiche_seance: ficheApercuEdit,
    }
    const { error } = await supabase.from('seances_uploadees').update(payload).eq('id', ficheApercu.id)
    setSavingFicheApercu(false)
    if (error) { alert('Erreur lors de la sauvegarde : ' + error.message); return }
    const updated = { ...ficheApercu, ...payload }
    setFicheApercu(updated)
    setMesSeancesOuvertes(prev => prev.map(s => (s.id === updated.id ? updated : s)))
    setModeEditionApercu(false)
    setFicheApercuEdit(null)
  }

  // ── Bibliothèque de procédés ──────────────────────────────────────────────────
  const chargerBiblio = async (uid) => {
    setBiblioLoading(true)
    const { data } = await supabase.from('bibliotheque_exercices').select('*').eq('educateur_id', uid).order('type').order('nom')
    setBiblio(data || [])
    setBiblioLoading(false)
  }

  const sauvegarderProcede = async () => {
    if (!procedeForm.nom.trim()) return
    const payload = { ...procedeForm, educateur_id: userId, duree: procedeForm.duree ? parseInt(procedeForm.duree) : null }
    // Optimistic : la modale se ferme tout de suite sans attendre la réponse
    // Supabase. Erreur → réouverte avec la saisie intacte (aucune
    // vérification d'erreur n'existait avant, on en ajoute a minima).
    const idEnEdition = procedeEnEdition
    const formSnapshot = { ...procedeForm }
    setSavingProcede(true)
    setModalProcede(false)
    setProcedeEnEdition(null)
    setProcedeForm(PROCEDE_VIDE)
    let error
    if (idEnEdition) {
      ;({ error } = await supabase.from('bibliotheque_exercices').update(payload).eq('id', idEnEdition.id))
    } else {
      ;({ error } = await supabase.from('bibliotheque_exercices').insert(payload))
    }
    setSavingProcede(false)
    if (error) {
      alert('Erreur : ' + error.message)
      setProcedeForm(formSnapshot)
      setProcedeEnEdition(idEnEdition)
      setModalProcede(true)
      return
    }
    await chargerBiblio(userId)
  }

  const supprimerProcede = async (id) => {
    if (!confirm(t('biblio_confirmer_suppr', lang))) return
    await supabase.from('bibliotheque_exercices').delete().eq('id', id)
    setBiblio(prev => prev.filter(p => p.id !== id))
  }

  const ouvrirEditionProcede = (procede) => {
    setProcedeEnEdition(procede)
    setProcedeForm({ ...procede, duree: procede.duree?.toString() || '' })
    setModalProcede(true)
  }

  // Pré-remplit le formulaire bibliothèque depuis un procédé de la fiche en cours de rédaction
  // (réutilise le modal Créer/Éditer existant — pas d'insert direct, le type doit être choisi/confirmé)
  const sauvegarderProcedeDansBiblio = (p) => {
    setProcedeEnEdition(null)
    setProcedeForm({
      type: 'exercice',
      nom: p.titre || '',
      theme: p.but || '',
      description: p.organisation || '',
      consignes: p.consignes || '',
      variables: p.variables || '',
      duree: p.duree ? String(p.duree) : '',
      nb_joueurs: p.nb_joueurs || '',
      tags: '',
    })
    setModalProcede(true)
  }

  // Injecte un procédé de la bibliothèque dans un bloc procédé de la fiche en cours de rédaction
  // (n'écrase que les champs vides du bloc cible, en un seul setFiche pour éviter les updates perdus)
  const importerProcedeDansBloc = (index, p) => {
    setFiche(prev => {
      const current = prev.procedes[index]
      const merged = {
        ...current,
        titre: current.titre || p.nom || current.titre,
        but: current.but || p.theme || current.but,
        organisation: current.organisation || p.description || current.organisation,
        consignes: current.consignes || p.consignes || current.consignes,
        variables: current.variables || p.variables || current.variables,
        duree: current.duree || (p.duree ? String(p.duree) : current.duree),
        nb_joueurs: current.nb_joueurs || p.nb_joueurs || current.nb_joueurs,
      }
      const newProcedes = [...prev.procedes]
      newProcedes[index] = merged
      return { ...prev, procedes: newProcedes }
    })
    setModalBiblioImport(null)
  }

  // Capture #fiche-print (déjà stylé pour l'impression, cf. index.css) en PDF via html2canvas + jsPDF
  const genererPdfFiche = async () => {
    const el = document.getElementById('fiche-print')
    if (!el) return null
    const prevDisplay = el.style.display
    const prevPosition = el.style.position
    const prevLeft = el.style.left
    el.style.display = 'block'
    el.style.position = 'fixed'
    el.style.left = '-9999px'
    el.style.top = '0'
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pageWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      const imgData = canvas.toDataURL('image/png')
      let heightLeft = imgHeight
      let position = 0
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
      while (heightLeft > 0) {
        position -= pageHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }
      return pdf.output('blob')
    } finally {
      el.style.display = prevDisplay
      el.style.position = prevPosition
      el.style.left = prevLeft
    }
  }

  const sauvegarderFiche = async () => {
    setSavingFiche(true)
    const { data: inserted, error } = await supabase.from('seances_uploadees').insert({
      educateur_id: userId,
      theme: fiche.theme || null,
      date_seance: fiche.date || null,
      categorie_tactique: fiche.categorie_tactique || null,
      saison: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      fiche_seance: { ...fiche, sport },
      fichier_url: ficheFichierUrl || null,
      origine: 'ouvert',
      statut: 'archivee',
    }).select().single()
    if (error) {
      setSavingFiche(false)
      console.error('Erreur insertion fiche:', error)
      alert('Erreur lors de l\'enregistrement : ' + error.message)
      return
    }

    // Optimistic : l'insert principal ci-dessus est confirmé, donc on referme
    // côté UI tout de suite. La liaison à l'entraînement et la génération du
    // PDF ne dépendent pas l'une de l'autre (juste de l'id fraîchement créé)
    // — elles tournent en parallèle plutôt qu'en séquence, en arrière-plan.
    setSavingFiche(false)
    setFicheFichierUrl(null)
    setFicheExtraite(false)

    const [, pdfBlob] = await Promise.all([
      lierFicheAEntrainementCorrespondant(inserted.id, fiche.date).catch(e => console.error('Erreur liaison fiche/entraînement:', e)),
      genererPdfFiche().catch(e => { console.error('Erreur génération PDF fiche:', e); return null }),
    ])
    if (pdfBlob) {
      const path = `fiches/${userId}/${Date.now()}.pdf`
      const { error: uploadError } = await supabase.storage.from('documents').upload(path, pdfBlob, { contentType: 'application/pdf', upsert: true })
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
        await supabase.from('seances_uploadees').update({ fichier_url: publicUrl }).eq('id', inserted.id)
      } else {
        console.error('Erreur upload PDF fiche:', uploadError)
      }
    }
    await chargerMesSeancesOuvertes(userId)
  }

  // Génère une séance complète avec l'IA à partir d'un objectif tactique + quelques
  // paramètres (durée, effectif, catégorie d'âge, niveau) et pré-remplit le formulaire
  // "Rédiger" — même finalité que le scan de fiche papier, mais à partir de texte
  // plutôt que d'une image.
  const PHASE_LABEL_IA = { echauffement: 'Échauffement', corps_de_seance: 'Corps de séance', retour_au_calme: 'Retour au calme' }
  const genererSeanceIA = async () => {
    if (!generationIAForm.objectif.trim()) return
    setGeneratingIA(true)
    setGenerationIAError(null)
    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY
      if (!apiKey) throw new Error('Clé VITE_GROQ_API_KEY manquante dans .env')
      const systemPrompt = `Tu es un entraîneur UEFA A spécialisé football de formation.
Tes séances respectent OBLIGATOIREMENT :
- La progression pédagogique : analytique → synthétique → global
- Des situations jouées réelles (jeux réduits, jeux de position)
- Des ratios travail/repos adaptés à la catégorie d'âge
- Des exercices avec opposition réelle (pas juste des passes en ligne)
- Des indicateurs de performance mesurables pour l'éducateur
- La logique interne du football (prise d'information, décision, action)

INTERDIT : exercices sans ballon majoritaires, slaloms de cônes sans opposition, passes en ligne statiques.

Génère une séance structurée en 3 phases :
1. Échauffement (20% du temps)
2. Corps de séance (65% du temps)
3. Retour au calme (15% du temps)

Chaque exercice DOIT contenir : nom, durée, organisation spatiale précise (dimensions du
terrain, dispositif), nombre de joueurs par équipe (format de jeu), règles du jeu,
consignes coach, critères de réussite mesurables, variante (facilitation ET complexification).
Réponds en JSON structuré.`
      const userPrompt = `Objectif tactique : ${generationIAForm.objectif}
Durée totale : ${generationIAForm.duree} minutes
Nombre de joueurs : ${generationIAForm.nb_joueurs || 'non précisé'}
Catégorie d'âge : ${generationIAForm.categorie_age}
Niveau : ${generationIAForm.niveau}

Réponds UNIQUEMENT avec ce JSON (aucun texte hors JSON) :
{
  "phases": [
    { "phase": "echauffement", "exercices": [ {
      "nom": "...", "duree": "...",
      "format_equipes": "nombre de joueurs par équipe / format de jeu, ex: 2 équipes de 4 + 2 jokers",
      "organisation_spatiale": "dimensions du terrain et dispositif précis",
      "regles_du_jeu": "...",
      "consignes_coach": "...",
      "criteres_reussite": "indicateurs de performance mesurables",
      "variante": "variante plus facile ET variante plus difficile"
    } ] },
    { "phase": "corps_de_seance", "exercices": [ ... ] },
    { "phase": "retour_au_calme", "exercices": [ ... ] }
  ]
}`
      const data = await enqueueGroqRequest('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          // openai/gpt-oss-20b avec reasoning_effort: 'low' plutôt que qwen3.6-27b :
          // qwen3.6 est un modèle de raisonnement qui continue de "penser"
          // longuement même avec /no_think (jusqu'à ~3000 tokens de <think>), au
          // point de ne parfois plus laisser assez de budget pour produire le JSON
          // demandé — c'est un problème de modèle, pas de parsing. Sur gpt-oss, le
          // raisonnement est renvoyé dans un champ "reasoning" séparé (message.content
          // reste le JSON final), et reasoning_effort: 'low' limite ce raisonnement.
          model: 'openai/gpt-oss-20b',
          reasoning_effort: 'low',
          messages: [
            { role: 'system', content: `${systemPrompt}\nRéponds uniquement avec du JSON valide, sans aucun texte avant ou après.` },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_completion_tokens: 6000,
        }),
      }, setGenerationIAStatus)
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error))
      const raw = data.choices?.[0]?.message?.content || ''
      console.log('Réponse brute Groq (génération séance) :', raw)
      // Stratégie : ignorer le <think> et chercher le JSON directement dans le
      // texte brut, ancré sur la clé racine connue ("phases") pour ne pas se
      // faire piéger par une accolade incidente dans le raisonnement du modèle
      // — plus fiable qu'un simple "premier {" quand le <think> n'est pas fermé
      // et contient lui-même des accolades. Si ce premier essai échoue, repli
      // sur un nettoyage plus agressif (retrait du bloc <think>, fermé ou non,
      // et des balises markdown) avant un nouvel essai.
      let resultat
      const start = raw.lastIndexOf('{"phases"') !== -1 ? raw.lastIndexOf('{"phases"') : raw.indexOf('{')
      const end = raw.lastIndexOf('}')
      if (start === -1 || end === -1 || end < start) {
        console.error('Pas de JSON détecté. Début réponse :', raw.slice(0, 300))
        throw new Error("L'IA n'a pas renvoyé de JSON valide")
      }
      try {
        resultat = JSON.parse(raw.slice(start, end + 1))
      } catch (err) {
        const cleaned = raw
          .replace(/<think>[\s\S]*?<\/think>/gi, '')
          .replace(/<think>[\s\S]*/gi, '')
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim()
        const s2 = cleaned.indexOf('{')
        const e2 = cleaned.lastIndexOf('}')
        if (s2 === -1 || e2 === -1) {
          console.error('Réponse Groq non-JSON même après nettoyage (génération séance) :', raw)
          throw new Error('JSON introuvable après nettoyage', { cause: err })
        }
        try {
          resultat = JSON.parse(cleaned.slice(s2, e2 + 1))
        } catch (err2) {
          console.error('Réponse Groq non-JSON (génération séance) :', raw)
          throw new Error("L'IA a renvoyé une réponse mal formée, réessaie.", { cause: err2 })
        }
      }

      const exercices = (resultat.phases || []).flatMap(ph => (ph.exercices || []).map(ex => ({ ...ex, phase: ph.phase })))
      if (exercices.length === 0) throw new Error("Aucun exercice généré")

      setDerniereGenerationIA({
        objectif: generationIAForm.objectif,
        duree: generationIAForm.duree,
        categorie_age: generationIAForm.categorie_age,
        phases: resultat.phases || [],
      })

      setFiche({
        ...ficheVide,
        theme: generationIAForm.objectif,
        nb_joueurs: generationIAForm.nb_joueurs,
        duree_totale: generationIAForm.duree,
        objectif_general: `${generationIAForm.objectif} — ${generationIAForm.categorie_age}, niveau ${generationIAForm.niveau}`,
        procedes: exercices.map((ex, i) => ({
          numero: i + 1,
          titre: [PHASE_LABEL_IA[ex.phase], ex.nom].filter(Boolean).join(' — '),
          duree: ex.duree != null ? String(ex.duree) : '',
          nb_joueurs: ex.format_equipes != null ? String(ex.format_equipes) : '',
          but: ex.criteres_reussite || PHASE_LABEL_IA[ex.phase] || '',
          organisation: ex.organisation_spatiale || '',
          consignes: [ex.regles_du_jeu, ex.consignes_coach ? `Consignes coach : ${ex.consignes_coach}` : null].filter(Boolean).join('\n\n'),
          variables: ex.variante || '',
          schema_png: schemaExerciceIA(ex.nom, `${ex.organisation_spatiale || ''} ${ex.regles_du_jeu || ''}`),
        })),
      })
      setSport('football')
      setFicheFichierUrl(null)
      setFicheExtraite(false)
      setModeSeance('rediger')
      setModalGenerationIA(false)
      setGenerationIAForm(GENERATION_IA_VIDE)
    } catch (e) {
      console.error('Erreur génération IA séance:', e)
      setGenerationIAError("L'IA n'a pas pu générer la séance. Réessaie dans un instant.")
    } finally {
      setGeneratingIA(false)
      setGenerationIAStatus(null)
    }
  }

  // Export PDF au format FFF (Fédération Française de Football) de la dernière
  // séance générée par l'IA — utilise derniereGenerationIA (phases brutes, avant
  // consolidation dans fiche.procedes) pour retrouver le détail complet par
  // exercice (organisation/règles/consignes/critères/variante séparés).
  const exportFFF = async (seance) => {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const W = 210
    const margin = 12
    let y = 10

    // ── Couleurs FFF ──────────────────────────────────────────
    const BLEU = [0, 56, 147]
    const GRIS = [245, 245, 245]
    const NOIR = [30, 30, 30]

    const ligne = (texte, x, posY, maxW, taille = 9, couleur = NOIR, style = 'normal') => {
      doc.setFontSize(taille)
      doc.setFont('helvetica', style)
      doc.setTextColor(...couleur)
      const lines = doc.splitTextToSize(texte || '', maxW)
      doc.text(lines, x, posY)
      return posY + lines.length * (taille * 0.4)
    }

    const rect = (x, posY, w, h, fill = BLEU) => {
      doc.setFillColor(...fill)
      doc.rect(x, posY, w, h, 'F')
    }

    // ── HEADER FFF ────────────────────────────────────────────
    rect(margin, y, W - margin * 2, 14)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('FICHE DE SÉANCE — FÉDÉRATION FRANÇAISE DE FOOTBALL', W / 2, y + 9, { align: 'center' })
    y += 18

    // ── Infos club / éducateur ─────────────────────────────────
    rect(margin, y, W - margin * 2, 22, GRIS)
    doc.setDrawColor(200, 200, 200)
    doc.rect(margin, y, W - margin * 2, 22, 'S')

    const col1 = margin + 3
    const col2 = W / 2 + 3
    const col3 = W * 0.75 + 3

    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 100, 100)
    doc.text('CLUB', col1, y + 5)
    doc.text('ÉDUCATEUR', col2, y + 5)
    doc.text('DATE', col3, y + 5)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...NOIR)
    doc.text(seance.club || '___________________', col1, y + 11)
    doc.text(seance.educateur || '___________________', col2, y + 11)
    doc.text(seance.date || new Date().toLocaleDateString('fr-FR'), col3, y + 11)

    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 100, 100)
    doc.text('CATÉGORIE', col1, y + 17)
    doc.text('OBJECTIF TACTIQUE', col2, y + 17)
    doc.text('DURÉE TOTALE', col3, y + 17)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...NOIR)
    doc.text(seance.categorie || '___', col1, y + 22)
    doc.text(seance.objectif || '___________________', col2, y + 22)
    doc.text(seance.duree ? `${seance.duree} min` : '90 min', col3, y + 22)
    y += 28

    // ── Phases ────────────────────────────────────────────────
    const phaseLabels = {
      echauffement: '⬤  ÉCHAUFFEMENT',
      corps_de_seance: '⬤  CORPS DE SÉANCE',
      retour_au_calme: '⬤  RETOUR AU CALME',
    }
    const phaseColors = {
      echauffement: [255, 140, 0],
      corps_de_seance: [0, 56, 147],
      retour_au_calme: [34, 139, 34],
    }

    const phases = seance.phases || []

    phases.forEach((phase) => {
      if (y > 265) { doc.addPage(); y = 15 }

      const couleurPhase = phaseColors[phase.phase] || BLEU
      rect(margin, y, W - margin * 2, 8, couleurPhase)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text(phaseLabels[phase.phase] || (phase.phase || '').toUpperCase(), margin + 3, y + 5.5)
      y += 10

      const exercices = phase.exercices || []
      exercices.forEach((ex, idx) => {
        if (y > 255) { doc.addPage(); y = 15 }

        // Titre exercice
        rect(margin, y, W - margin * 2, 7, [230, 230, 230])
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...NOIR)
        doc.text(`Exercice ${idx + 1} — ${ex.nom || ''}`, margin + 3, y + 5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        doc.text(`${ex.duree || ''}  |  ${ex.format_equipes || ''}`, W - margin - 3, y + 5, { align: 'right' })
        y += 9

        // Corps exercice : 2 colonnes
        const colW = (W - margin * 2 - 4) / 2
        const xGauche = margin
        const xDroite = margin + colW + 4
        const yStart = y

        // Colonne gauche
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...BLEU)
        doc.text('ORGANISATION', xGauche, y + 4)
        y = ligne(ex.organisation_spatiale, xGauche, y + 8, colW) + 2

        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...BLEU)
        doc.text('RÈGLES DU JEU', xGauche, y + 1)
        y = ligne(ex.regles_du_jeu, xGauche, y + 5, colW) + 2

        // Colonne droite (reset y)
        let yD = yStart
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...BLEU)
        doc.text('CONSIGNES COACH', xDroite, yD + 4)
        yD = ligne(ex.consignes_coach, xDroite, yD + 8, colW) + 2

        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...BLEU)
        doc.text('CRITÈRES DE RÉUSSITE', xDroite, yD + 1)
        yD = ligne(ex.criteres_reussite, xDroite, yD + 5, colW) + 2

        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...BLEU)
        doc.text('VARIANTE', xDroite, yD + 1)
        yD = ligne(ex.variante, xDroite, yD + 5, colW)

        y = Math.max(y, yD) + 4

        // Zone schéma (terrain)
        if (y < 250) {
          rect(margin, y, W - margin * 2, 35, [245, 248, 255])
          doc.setDrawColor(200, 215, 240)
          doc.rect(margin, y, W - margin * 2, 35, 'S')
          // Terrain simplifié
          const tx = margin + 10, ty = y + 5, tw = W - margin * 2 - 20, th = 25
          doc.setDrawColor(150, 180, 220)
          doc.setLineWidth(0.3)
          doc.rect(tx, ty, tw, th)
          doc.line(tx + tw / 2, ty, tx + tw / 2, ty + th) // ligne médiane
          // Cercle central
          doc.circle(tx + tw / 2, ty + th / 2, 4, 'S')
          // Surfaces de réparation
          doc.rect(tx, ty + th / 2 - 6, 12, 12, 'S')
          doc.rect(tx + tw - 12, ty + th / 2 - 6, 12, 12, 'S')
          doc.setFontSize(6)
          doc.setTextColor(150, 150, 150)
          doc.text('Schéma à compléter', tx + tw / 2, ty + th / 2 + 1, { align: 'center' })
          y += 40
        }

        // Séparateur
        doc.setDrawColor(220, 220, 220)
        doc.setLineWidth(0.2)
        doc.line(margin, y, W - margin, y)
        y += 4
      })

      y += 3
    })

    // ── Footer ────────────────────────────────────────────────
    if (y > 270) { doc.addPage(); y = 15 }
    rect(margin, y, W - margin * 2, 8, [240, 240, 240])
    doc.setFontSize(7)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(150, 150, 150)
    doc.text('Document généré par Digital Football Academy — digitalfootball.academy', W / 2, y + 5, { align: 'center' })

    doc.save(`seance_fff_${(seance.objectif || 'seance').replace(/\s+/g, '_').toLowerCase()}.pdf`)
  }

  // Scanner IA : lit une photo de fiche papier (Gemini Vision) et pré-remplit le formulaire "Rédiger"
  const analyserFicheScan = async () => {
    if (!scanImageFile || !scanImageBase64) return
    setScanningFiche(true)
    setScanFicheError(null)
    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY
      if (!apiKey) throw new Error('Clé VITE_GROQ_API_KEY manquante dans .env')
      const prompt = `Tu es un assistant spécialisé dans l'analyse de fiches de séances d'entraînement football.

Analyse cette image d'une fiche séance manuscrite ou imprimée et extrais toutes les informations visibles.
Réponds UNIQUEMENT avec du JSON valide, sans markdown, sans texte avant ou après:
{
  "theme": "titre ou thème de la séance",
  "date": "date si visible (format YYYY-MM-DD)",
  "nb_joueurs": "nombre de joueurs si mentionné",
  "duree_totale": "durée totale si mentionnée",
  "objectif_general": "objectif général de la séance",
  "procedes": [
    {
      "titre": "nom du procédé/exercice",
      "duree": "durée en minutes",
      "nb_joueurs": "nombre de joueurs",
      "but": "but de l'exercice",
      "organisation": "description de l'organisation",
      "consignes": "consignes de l'exercice",
      "variables": "variantes ou progressions"
    }
  ]
}

Si une information n'est pas visible, mets null pour ce champ. Extrais jusqu'à 4 procédés/exercices maximum.`
      const data = await enqueueGroqRequest('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'qwen/qwen3.6-27b',
          messages: [
            { role: 'system', content: '/no_think\nRéponds uniquement avec du JSON valide. Aucune réflexion préalable.' },
            { role: 'user', content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:${scanImageFile.type || 'image/jpeg'};base64,${scanImageBase64}` } }
            ]}
          ],
          temperature: 0.7,
          max_completion_tokens: 4000
        })
      }, setScanFicheStatus)
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error))
      const raw = data.choices?.[0]?.message?.content || ''
      const text = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('JSON non trouvé dans la réponse')
      const extrait = JSON.parse(jsonMatch[0])

      const url = await uploaderFichierSeance(scanImageFile)

      setFiche({
        ...ficheVide,
        theme: extrait.theme || '',
        date: extrait.date || '',
        nb_joueurs: extrait.nb_joueurs != null ? String(extrait.nb_joueurs) : '',
        duree_totale: extrait.duree_totale != null ? String(extrait.duree_totale) : '',
        objectif_general: extrait.objectif_general || '',
        procedes: ficheVide.procedes.map((base, i) => {
          const p = extrait.procedes?.[i]
          if (!p) return base
          return {
            ...base, ...p, numero: i + 1,
            duree: p.duree != null ? String(p.duree) : '',
            nb_joueurs: p.nb_joueurs != null ? String(p.nb_joueurs) : '',
          }
        }),
      })
      setFicheFichierUrl(url)
      setFicheExtraite(true)
      setModeSeance('rediger')
      setScanImageFile(null)
      setScanImagePreview(null)
      setScanImageBase64(null)
    } catch (e) {
      console.error('Erreur scan fiche:', e)
      setScanFicheError('L\'IA n\'a pas pu lire la fiche. Assure-toi que l\'image est nette et bien éclairée.')
    } finally {
      setScanningFiche(false)
      setScanFicheStatus(null)
    }
  }

  const [affiliationEnCours, setAffiliationEnCours] = useState(null) // {id, profiles} — modal de liaison
  const [joueurLieId, setJoueurLieId] = useState('')

  const gererAffiliation = async (id, statut, equipeJoueurId = null) => {
    const update = { statut }
    if (equipeJoueurId) update.equipe_joueur_id = equipeJoueurId
    await supabase.from('affiliations').update(update).eq('id', id)
    setAffiliationEnCours(null)
    setJoueurLieId('')
    await chargerProfilEdu(userId)
  }

  const sauvegarderProfilEdu = async () => {
    if (!profilEduEdit) return
    // Optimistic : profil local mis à jour tout de suite, sans attendre la
    // réponse Supabase. Erreur → on revient à l'ancien profil (aucune
    // vérification d'erreur n'existait avant, on en ajoute a minima).
    const avant = profilEdu
    // avatar_url vit sur profiles, pas profil_educateur (cf. chargerProfilEdu) —
    // exclu du payload sinon l'upsert échoue avec "column does not exist".
    const { avatar_url, ...champsProfilEducateur } = profilEduEdit
    const payload = { ...champsProfilEducateur, user_id: userId, updated_at: new Date().toISOString() }
    setProfilEdu({ ...payload, avatar_url })
    setSavingProfil(true)
    const { data, error } = await supabase.from('profil_educateur').upsert(payload, { onConflict: 'user_id' }).select().single()
    setSavingProfil(false)
    if (error) {
      setProfilEdu(avant)
      alert('Erreur lors de la sauvegarde : ' + error.message)
      return
    }
    if (data) { setProfilEdu({ ...data, avatar_url }); setProfilEduEdit({ ...data, avatar_url }) }
  }

  // Même flux que l'avatar joueur/club (signature Cloudinary via
  // /api/upload-video, générique malgré son nom) — écrit sur profiles.avatar_url,
  // déjà lu par DashboardClub.jsx (organigramme) et ClubPublic.jsx pour
  // l'affichage public, jamais éditable côté éducateur jusqu'ici.
  const handleAvatarUploadEdu = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setAvatarUploadingEdu(true)
    try {
      const sigRes = await fetch('/api/upload-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
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
        await supabase.from('profiles').update({ avatar_url: uploadData.secure_url }).eq('id', userId)
        setProfilEdu(p => ({ ...p, avatar_url: uploadData.secure_url }))
        setProfilEduEdit(p => ({ ...p, avatar_url: uploadData.secure_url }))
      }
    } catch (err) {
      console.error('Avatar upload error:', err)
    }
    setAvatarUploadingEdu(false)
  }

  const uploadDiplome = async (file) => {
    if (!file) return
    setUploadingDiplome(true)
    const ext = file.name.split('.').pop()
    const path = `diplomes/${userId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('documents').upload(path, file, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
      const updated = { ...profilEduEdit, diplome_url: publicUrl, diplome_verifie: false }
      setProfilEduEdit(updated)
      const { avatar_url, ...champsProfilEducateur } = updated
      await supabase.from('profil_educateur').upsert({ ...champsProfilEducateur, user_id: userId }, { onConflict: 'user_id' })
      await chargerProfilEdu(userId)
    }
    setUploadingDiplome(false)
  }


  const ajouterParcours = async () => {
    if (!newParcours.club) return
    const ordre = parcoursEdu.length
    await supabase.from('parcours_educateur').insert({ ...newParcours, user_id: userId, ordre })
    await chargerProfilEdu(userId)
    setNewParcours({ type: 'coach', club: '', poste: '', saison_debut: '', saison_fin: '', niveau: '' })
    setShowAddParcours(false)
  }

  const supprimerParcours = async (id) => {
    await supabase.from('parcours_educateur').delete().eq('id', id)
    await chargerProfilEdu(userId)
  }

  const ajouterJoueur = async () => {
    if (!newJoueur.prenom || !newJoueur.nom) return
    // Optimistic : le formulaire se ferme tout de suite sans attendre la
    // réponse Supabase. Erreur → réouvert avec la saisie intacte (aucune
    // vérification d'erreur n'existait avant, on en ajoute a minima).
    const snapshot = { ...newJoueur }
    setSavingJoueur(true)
    setNewJoueur({ prenom: '', nom: '', poste: '', categorie: '', numero_maillot: '', date_naissance: '', numero_licence: '' })
    setShowAddJoueur(false)
    // date_naissance vaut '' par défaut (input vide) — Postgres rejette '' pour
    // une colonne date, il faut null. club_categorie_id/categorie héritent
    // automatiquement de la catégorie déclarée par l'éducateur (monCategorieClub) :
    // plus besoin de le choisir à chaque joueur (cf. declarerMaCategorie).
    const { error } = await supabase.from('equipe_joueurs').insert({
      ...snapshot,
      date_naissance: snapshot.date_naissance || null,
      club_categorie_id: monCategorieClub?.id || null,
      categorie: snapshot.categorie || monCategorieClub?.nom || '',
      educateur_id: userId,
    })
    setSavingJoueur(false)
    if (error) {
      alert('Erreur : ' + error.message)
      setNewJoueur(snapshot)
      setShowAddJoueur(true)
      return
    }
    await chargerJoueurs(userId)
  }

  const supprimerJoueur = async (id) => {
    if (!confirm('Supprimer ce joueur ?')) return
    console.log('Suppression ID:', id)
    // equipe_joueurs est référencé par affiliations.equipe_joueur_id (FK) — la
    // suppression du joueur échoue tant que ses affiliations existent encore.
    const { error: errAff } = await supabase.from('affiliations').delete().eq('equipe_joueur_id', id)
    if (errAff) { console.error('Erreur suppression affiliation :', errAff); alert('Erreur lors de la suppression : ' + errAff.message); return }
    const { error } = await supabase.from('equipe_joueurs').delete().eq('id', id)
    if (error) { console.error('Erreur suppression joueur :', error); alert('Erreur lors de la suppression : ' + error.message); return }
    setJoueurs(prev => prev.filter(j => j.id !== id))
    if (joueurActif?.id === id) setJoueurActif(null)
  }

  const reinitialiserAccesJoueur = async (j) => {
    let email = j.email || ''
    // Si le joueur a un compte lié, on récupère son vrai email depuis profiles
    if (j.joueur_id) {
      const { data: profil } = await supabase.from('profiles').select('email').eq('id', j.joueur_id).maybeSingle()
      if (profil?.email) email = profil.email
    }
    if (!email) { alert('Email inconnu pour ce joueur.'); return }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://digital-football-accademy.vercel.app/reset-password',
    })
    if (error) alert('Erreur : ' + error.message)
    else alert('Email de réinitialisation envoyé à ' + email)
  }

  const inviterJoueur = async (j) => {
    const email = (inviteEmails[j.id] || j.email || '').trim()
    if (!email) return
    setInvitingId(j.id)
    try {
      const { data, error } = await supabase.functions.invoke('envoyer-invitation', {
        body: { email, role: 'joueur', educateur_id: userId, equipe_joueur_id: j.id, prenom: j.prenom, nom: j.nom }
      })
      if (error) {
        // supabase-js masque le vrai message derrière "Edge Function returned a non-2xx
        // status code" — le détail exact est dans le body de la réponse HTTP de la fonction.
        let message = error.message
        try {
          const body = await error.context?.json()
          if (body?.error) message = body.error
        } catch { /* body non-JSON ou déjà consommé, on garde le message générique */ }
        throw new Error(message)
      }
      if (data?.error) throw new Error(data.error)
      setInviteStatus(prev => ({ ...prev, [j.id]: 'sent' }))
      await chargerJoueurs(userId)
    } catch (err) {
      alert('Erreur invitation : ' + (err.message || 'Inconnu'))
      setInviteStatus(prev => ({ ...prev, [j.id]: 'error' }))
    }
    setInvitingId(null)
  }

  // Bloc réutilisable (vue "poste" + modal profil) — fonction, pas un composant,
  // pour ne pas être remonté à chaque render (voir fix appliqué à NavBarVues dans
  // GestionPrepPhysique.jsx).
  const blocInvitationJoueur = (j) => (
    <div style={{ marginTop: 10, borderTop: `1px solid ${colors.border.subtle}`, paddingTop: 8 }}
         onClick={e => e.stopPropagation()}>
      {j.joueur_id ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: colors.accent.green, background: colors.accent.green + alpha.subtle,
                         padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
            ✅ Compte lié
          </span>
          {canEdit('effectif') && (
            <button onClick={() => reinitialiserAccesJoueur(j)}
              style={{ background: 'transparent', border: `1px solid ${colors.border.default}`, color: colors.text.faint, borderRadius: 6, padding: '2px 8px', fontSize: 10, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
              title="Envoyer un email de réinitialisation de mot de passe">
              🔑
            </button>
          )}
        </div>
      ) : inviteStatus[j.id] === 'sent' || (j.email && !j.joueur_id) ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#facc15' }}>
            ✉️ Invitation envoyée · {j.email}
          </div>
          {canEdit('effectif') && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => inviterJoueur(j)}
                disabled={invitingId === j.id}
                style={{ fontSize: 11, background: '#facc1510', border: '1px solid #facc1430', color: '#facc14', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>
                {invitingId === j.id ? '...' : '🔁 Renvoyer'}
              </button>
              <button
                onClick={async () => {
                  await supabase.from('equipe_joueurs').update({ email: null }).eq('id', j.id)
                  setInviteStatus(prev => { const next = { ...prev }; delete next[j.id]; return next })
                  await chargerJoueurs(userId)
                }}
                style={{ fontSize: 11, background: '#ef444410', border: '1px solid #ef444430', color: colors.accent.red, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>
                ✕ Corriger
              </button>
            </div>
          )}
        </div>
      ) : canEdit('effectif') ? (
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 6 }}>
          <input
            value={inviteEmails[j.id] || ''}
            onChange={e => setInviteEmails(prev => ({ ...prev, [j.id]: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') inviterJoueur(j) }}
            placeholder="Email du joueur..."
            type="email"
            style={{
              flex: 1, background: colors.background.base, border: `1px solid ${colors.border.default}`,
              borderRadius: 6, color: colors.text.primary, padding: '5px 9px', fontSize: 11,
              outline: 'none'
            }}
          />
          <button
            disabled={invitingId === j.id || !(inviteEmails[j.id] || '').trim()}
            onClick={() => inviterJoueur(j)}
            style={{
              background: (inviteEmails[j.id] || '').trim() ? colors.accent.blue + alpha.soft : colors.background.surface,
              border: '1px solid ' + ((inviteEmails[j.id] || '').trim() ? '#60a5fa60' : colors.border.default),
              color: (inviteEmails[j.id] || '').trim() ? colors.accent.blue : colors.text.faint,
              borderRadius: 6, padding: '5px 10px', fontSize: 11,
              fontWeight: 700, cursor: (inviteEmails[j.id] || '').trim() ? 'pointer' : 'default',
              whiteSpace: 'nowrap', transition: 'all 0.2s'
            }}
          >
            {invitingId === j.id ? '⏳' : '📧 Inviter'}
          </button>
        </div>
      ) : (
        <span style={{ fontSize: 11, color: colors.border.strong, fontStyle: 'italic' }}>Aucune invitation envoyée</span>
      )}
    </div>
  )

  const sauvegarderJoueur = async () => {
    if (!joueurEnEdition) return
    // Même correctif que ajouterJoueur : '' n'est pas une date Postgres valide.
    const { id, ...fields } = { ...joueurEnEdition, date_naissance: joueurEnEdition.date_naissance || null }
    // Optimistic : on connaît déjà exactement les nouvelles valeurs, donc la
    // liste locale se met à jour et la modale se ferme tout de suite, sans
    // attendre la réponse Supabase (aucune vérification d'erreur n'existait
    // avant, on en ajoute a minima).
    const avant = joueurs.find(j => j.id === id)
    setJoueurs(prev => prev.map(j => (j.id === id ? { ...j, ...fields } : j)))
    setSavingEdit(true)
    setJoueurEnEdition(null)
    const { error } = await supabase.from('equipe_joueurs').update(fields).eq('id', id)
    setSavingEdit(false)
    if (error) {
      alert('Erreur : ' + error.message)
      if (avant) setJoueurs(prev => prev.map(j => (j.id === id ? avant : j)))
      setJoueurEnEdition({ id, ...fields })
    }
  }

  const assignerCategorieClub = async (joueurId, categorieId) => {
    await supabase.from('equipe_joueurs').update({ club_categorie_id: categorieId || null }).eq('id', joueurId)
    await chargerJoueurs(userId)
  }

  const telechargerTemplate = () => {
    const csv = 'Prenom,Nom,Poste,Categorie,Numero Maillot,Date Naissance,Numero Licence\nJean,Dupont,Attaquant,U17,9,2007-03-15,123456\nMarie,Martin,Gardien,U15,1,2009-06-20,'
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'template_effectif.csv'
    a.click()
  }

  const handleImportFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImportError('')
    // .numbers est un format Protobuf binaire propriétaire Apple, illisible
    // en JS navigateur — et pas de conversion serveur viable ici : LibreOffice
    // n'est pas installé sur les fonctions serverless Vercel (ni installable
    // facilement, le binaire dépasse largement la limite de taille), un appel
    // execSync('libreoffice ...') échouerait systématiquement en production.
    // Autant guider tout de suite vers l'export xlsx/csv plutôt que de faire
    // un aller-retour serveur voué à échouer.
    if (file.name.toLowerCase().endsWith('.numbers')) {
      setImportError("Les fichiers Apple Numbers (.numbers) ne peuvent pas être importés directement. Dans Numbers : Fichier → Exporter vers → Excel (.xlsx) ou CSV, puis réimporte le fichier exporté.")
      e.target.value = ''
      return
    }
    try {
      const XLSX = await loadSheetJS()
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true, codepage: 65001 })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json(ws, { defval: '' })
      const rows = parseRows(raw)
      if (rows.length === 0) { setImportError('Aucun joueur trouvé. Vérifie que ton fichier a les colonnes Prenom et Nom.'); return }
      setImportPreview({ rows, importing: false, done: 0 })
    } catch (err) {
      setImportError('Erreur lecture fichier : ' + err.message)
    }
    e.target.value = ''
  }

  const confirmerImport = async () => {
    if (!importPreview) return
    setImportPreview(prev => ({ ...prev, importing: true, done: 0 }))
    let done = 0
    // Même repli que l'ajout manuel d'un joueur (cf. plus haut) : sans ça, les
    // lignes importées restent avec club_categorie_id = null indéfiniment —
    // le rattrapage auto de l'onglet Classements ne répare que les catégories
    // texte non vides, jamais celles laissées vides dans le fichier importé.
    for (const row of importPreview.rows) {
      await supabase.from('equipe_joueurs').insert({
        ...row,
        club_categorie_id: monCategorieClub?.id || null,
        categorie: row.categorie || monCategorieClub?.nom || '',
        educateur_id: userId,
      })
      done++
      setImportPreview(prev => ({ ...prev, done }))
    }
    await chargerJoueurs(userId)
    setImportPreview(null)
  }

  const afficherToast = (msg, type = 'succes') => {
    setToastMsg({ msg, type })
    setTimeout(() => setToastMsg(null), type === 'erreur' ? 5000 : 3000)
  }

  // Crée automatiquement une ligne Déplacements pour un match Extérieur nouvellement
  // ajouté au calendrier (véhicule, conducteur, km — restent vides, à compléter
  // manuellement dans l'onglet Déplacements). nb_personnes est pré-rempli avec un
  // effectif par défaut (14 joueurs, 16 en coupe, + 2 dirigeants — cf.
  // effectifParDefautMatch) — pas l'effectif total de l'équipe, un match n'en
  // convoque qu'une partie — sinon la répartition auto des mini-bus considère 0
  // personne et propose systématiquement le plus petit bus. Reste modifiable au
  // cas par cas (nombre réel de convoqués) via le formulaire de l'onglet
  // Déplacements. Nécessite un club affilié : deplacements.club_id est NOT NULL
  // en base.
  const creerDeplacementAutoMatch = async (m) => {
    if (m.domicile || !m.date) return
    if (!clubAffiliation?.club_id) return
    const { data: { user } } = await supabase.auth.getUser()
    const equipe = [profilEdu?.club, profilEdu?.categorie].filter(Boolean).join(' ')
    const { error } = await supabase.from('deplacements').insert({
      club_id: clubAffiliation.club_id,
      equipe: equipe || null,
      educateur_id: user?.id || null,
      date_depart: m.date,
      lieu_destination: m.lieu || m.adversaire || null,
      ville_destination: m.ville || null,
      nature: 'match',
      nb_personnes: effectifParDefautMatch(m.competition),
      created_by: user?.id || null,
    })
    if (!error) afficherToast('Déplacement créé automatiquement')
  }

  // Supprime le(s) déplacement(s) lié(s) à un match Extérieur qu'on vient de
  // supprimer. deplacements n'a pas de colonne match_id (pas de vraie clé
  // étrangère à faire suivre en cascade) : le lien se fait par date +
  // adversaire/lieu, la même heuristique que completerHorairesDepuisMatchs
  // dans Deplacements.jsx. Ne fait rien pour un match Domicile (jamais de
  // déplacement associé). Best-effort : une erreur ici n'annule pas la
  // suppression du match déjà effectuée, juste loggée.
  const supprimerDeplacementLieAuMatch = async (m) => {
    if (m.domicile || !clubAffiliation?.club_id) return
    const normalise = (s) => (s || '').trim().toLowerCase()
    const { data: candidats, error } = await supabase.from('deplacements').select('id, lieu_destination')
      .eq('club_id', clubAffiliation.club_id).eq('date_depart', m.date).eq('nature', 'match')
    if (error) { console.error('Erreur recherche déplacement lié au match supprimé:', error); return }
    const cible = (candidats || []).find(d => normalise(d.lieu_destination) === normalise(m.adversaire) || normalise(d.lieu_destination) === normalise(m.lieu))
      || (candidats?.length === 1 ? candidats[0] : null)
    if (cible) await supabase.from('deplacements').delete().eq('id', cible.id)
  }

  // Calcule automatiquement les horaires de départ/retour du déplacement lié à un
  // match Extérieur (ville du club + ville du match connues, token Mapbox configuré
  // — cf. lib/mapbox.js) et les applique : cache distance_km/duree_trajet_min sur le
  // match, et heure_depart/heure_retour_estimee sur le déplacement correspondant.
  // N'écrase jamais une heure de départ déjà saisie à la main (.is('heure_depart', null)).
  const estimerEtAppliquerHoraires = async (m) => {
    if (m.domicile || !m.date || !m.ville || !m.heure) return
    const clubVille = clubAffiliation?.club?.ville
    if (!clubVille || !clubAffiliation?.club_id) return
    const resultat = await estimerDeplacement(clubVille, m.ville, m.heure)
    if (!resultat) return
    await supabase.from('matchs_equipe').update({ distance_km: resultat.distance_km, duree_trajet_min: resultat.duree_trajet_min }).eq('id', m.id)
    await supabase.from('deplacements')
      .update({ heure_depart: resultat.heure_depart, heure_retour_estimee: resultat.heure_retour_estimee, ville_destination: m.ville, distance_km: resultat.distance_km, duree_trajet_min: resultat.duree_trajet_min })
      .eq('club_id', clubAffiliation.club_id).eq('date_depart', m.date).is('heure_depart', null)
  }

  const ajouterMatch = async () => {
    if (!newMatch.adversaire || !newMatch.date) return
    // Optimistic : le formulaire se ferme tout de suite. L'insert du match et
    // la création du déplacement associé ne dépendent pas l'un de l'autre
    // (creerDeplacementAutoMatch utilise les champs saisis localement, pas
    // l'id généré par l'insert) donc ils partent en parallèle ; l'estimation
    // auto des horaires, elle, a besoin du vrai id retourné par l'insert et
    // reste donc après.
    const snapshot = { ...newMatch }
    setSavingMatch(true)
    setNewMatch({ date: '', heure: '', lieu: '', ville: '', adversaire: '', domicile: true, competition: '', score_nous: '', score_eux: '' })
    setShowAddMatch(false)
    const [{ data, error }] = await Promise.all([
      supabase.from('matchs_equipe').insert({
        ...snapshot, educateur_id: userId, domicile: snapshot.domicile,
        // score_nous/score_eux sont des colonnes integer — une chaîne vide (score pas
        // encore saisi, le cas normal à la création) fait échouer l'insert avec
        // "invalid input syntax for type integer" si on l'envoie telle quelle.
        score_nous: snapshot.score_nous === '' ? null : parseInt(snapshot.score_nous),
        score_eux: snapshot.score_eux === '' ? null : parseInt(snapshot.score_eux),
      }).select().single(),
      creerDeplacementAutoMatch(snapshot).catch(e => console.error('Erreur création déplacement auto:', e)),
    ])
    setSavingMatch(false)
    if (error) {
      alert('Erreur : ' + error.message)
      setNewMatch(snapshot)
      setShowAddMatch(true)
      return
    }
    if (data) await estimerEtAppliquerHoraires(data)
    await chargerMatchs(userId)
  }

  // Un match est "joué" dès qu'un score (même 0-0) a été saisi. score_nous/score_eux
  // sont des colonnes integer (pas texte, malgré un commentaire précédent qui disait
  // le contraire — cf. le bug "invalid input syntax for type integer" que ça a causé
  // tant que les inserts envoyaient '' au lieu de null) : NULL = pas encore joué.
  // Le check triple reste utile côté lecture pour les lignes chargées avant ce fix
  // (potentiellement encore '' en base) et par robustesse générale.
  const matchJoue = (m) => m.score_nous !== '' && m.score_nous !== null && m.score_nous !== undefined

  const grouperMatchsParMois = (liste, moisDesc = true) => {
    const groupes = {}
    liste.forEach(m => {
      const d = new Date(m.date + 'T12:00:00')
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString(localeOf(lang), { month: 'long', year: 'numeric' })
      if (!groupes[key]) groupes[key] = { label, items: [] }
      groupes[key].items.push(m)
    })
    return Object.entries(groupes)
      .sort((a, b) => moisDesc ? b[0].localeCompare(a[0]) : a[0].localeCompare(b[0]))
      .map(([key, g]) => [key, { ...g, items: [...g.items].sort((x, y) => moisDesc ? y.date.localeCompare(x.date) : x.date.localeCompare(y.date)) }])
  }

  const fermerModalMatchJoue = () => {
    setModalMatchJoue(null)
    setScannerModalImageBase64(null)
    setScannerModalImagePreview(null)
    setScannerModalError(null)
  }

  const ouvrirModalMatchJoue = (m) => {
    setModalMatchJoue(m)
    setScoreJoueForm({ score_nous: m.score_nous || '', score_eux: m.score_eux || '' })
    setScannerModalImageBase64(null)
    setScannerModalImagePreview(null)
    setScannerModalError(null)
    setScannerModalButsDetail(m.buts_detail || [])
  }

  const marquerMatchJoue = async () => {
    if (!modalMatchJoue) return
    // Optimistic : la modale se ferme tout de suite. Le score du match et les
    // stats par joueur sont deux écritures indépendantes (tables différentes,
    // aucune ne dépend du résultat de l'autre) — elles partent en parallèle.
    const matchSnapshot = modalMatchJoue
    const matchId = matchSnapshot.id
    const scoreSnapshot = scoreJoueForm
    // Ne garde que les buts dont la minute a été renseignée (saisie manuelle
    // ou scan IA) — une ligne ajoutée puis laissée vide ne doit pas polluer
    // buts_detail ni fausser "Buts par quart d'heure" (StatsEquipe.jsx).
    const butsDetailSnapshot = scannerModalButsDetail.filter(b => typeof b.minute === 'number' && !isNaN(b.minute))
    setSavingMatchJoue(true)
    setModalMatchJoue(null)
    setScoreJoueForm({ score_nous: '', score_eux: '' })
    setScannerModalButsDetail([])
    const [{ error }] = await Promise.all([
      supabase.from('matchs_equipe').update({
        score_nous: scoreSnapshot.score_nous === '' ? null : parseInt(scoreSnapshot.score_nous),
        score_eux: scoreSnapshot.score_eux === '' ? null : parseInt(scoreSnapshot.score_eux),
        buts_detail: butsDetailSnapshot,
      }).eq('id', matchId),
      sauvegarderStatsMatch(matchId).catch(e => console.error('Erreur sauvegarde stats match:', e)), // upsert stats_match + recharge matchs
    ])
    setSavingMatchJoue(false)
    if (error) {
      alert("Erreur lors de l'enregistrement du score : " + error.message)
      setModalMatchJoue(matchSnapshot)
      setScoreJoueForm(scoreSnapshot)
    }
  }

  const matchFormVide = () => ({ id: null, adversaire: '', date: '', heure: '', competition: '', domicile: true, lieu: '', ville: '' })

  const ouvrirModalCreerMatch = () => setModalMatchForm(matchFormVide())

  const ouvrirModalModifierMatch = (m) => setModalMatchForm({
    id: m.id,
    adversaire: m.adversaire || '',
    date: m.date || '',
    heure: m.heure || '',
    competition: m.competition || '',
    domicile: m.domicile !== false,
    lieu: m.lieu || '',
    ville: m.ville || '',
  })

  const sauvegarderMatchForm = async () => {
    if (!modalMatchForm?.adversaire || !modalMatchForm?.date) return
    setSavingMatchForm(true)
    const { id, ...champs } = modalMatchForm
    if (id) {
      const { error } = await supabase.from('matchs_equipe').update(champs).eq('id', id)
      if (error) { afficherToast(`Erreur lors de la modification du match : ${error.message}`, 'erreur'); setSavingMatchForm(false); return }
      setMatchs(prev => prev.map(m => m.id === id ? { ...m, ...champs } : m))
      // Optimistic à partir d'ici : la modale se ferme tout de suite,
      // l'estimation des horaires continue en arrière-plan.
      setSavingMatchForm(false)
      setModalMatchForm(null)
      await estimerEtAppliquerHoraires({ ...champs, id })
      return
    }
    const { data, error } = await supabase.from('matchs_equipe').insert({
      ...champs, educateur_id: userId, score_nous: null, score_eux: null,
    }).select().single()
    if (error) { afficherToast(`Erreur lors de la création du match : ${error.message}`, 'erreur'); setSavingMatchForm(false); return }
    if (data) {
      setMatchs(prev => [data, ...prev])
      // Optimistic à partir d'ici : la modale se ferme tout de suite. L'ordre
      // création du déplacement puis estimation des horaires reste séquentiel
      // — la 2e requête cherche en base le déplacement que la 1re vient de
      // créer ; les paralléliser créerait une course où elle ne le trouverait
      // pas encore.
      setSavingMatchForm(false)
      setModalMatchForm(null)
      await creerDeplacementAutoMatch(data)
      await estimerEtAppliquerHoraires(data)
      return
    }
    setSavingMatchForm(false)
    setModalMatchForm(null)
  }

  const sauvegarderStatsMatch = async (matchId) => {
    const entries = Object.entries(statsMatch[matchId] || {})
    // Un upsert par joueur, chacun indépendant des autres (clé match_id+
    // joueur_id différente à chaque fois) — en parallèle plutôt qu'en
    // séquence.
    const resultats = await Promise.all(entries.map(([joueurId, s]) =>
      supabase.from('stats_match').upsert({
        match_id: matchId, joueur_id: joueurId, educateur_id: userId,
        minutes: s.minutes || 0, buts: s.buts || 0, passes_dec: s.passes_dec || 0,
        clean_sheet: s.clean_sheet || false, carton_jaune: s.carton_jaune || false, carton_rouge: s.carton_rouge || false
      }, { onConflict: 'match_id,joueur_id' })
    ))
    const erreurs = resultats.filter(r => r.error)
    if (erreurs.length > 0) {
      console.error('Erreur sauvegarde stats match:', erreurs.map(e => e.error.message))
      alert(`Erreur lors de l'enregistrement des stats de ${erreurs.length} joueur${erreurs.length > 1 ? 's' : ''}.`)
    }
    await chargerMatchs(userId)
    setMatchActif(null)
    setStatsMatch({})
  }

  const scannerCalendrier = async () => {
    if (!calendarImages.length) return
    setCalendarLoading(true)
    setCalendarError(null)
    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY
      if (!apiKey) throw new Error('Clé VITE_GROQ_API_KEY manquante dans .env')
      const prompt = `Tu analyses une ou plusieurs photos d'un calendrier de football.
Extrait TOUS les matchs visibles sur les photos.
Réponds UNIQUEMENT avec du JSON valide, sans texte autour:
{
  "matchs": [
    {
      "journee": "J1" ou null,
      "date": "YYYY-MM-DD" ou null,
      "heure": "HH:MM" ou null,
      "equipe_domicile": "Nom complet de l'équipe",
      "equipe_exterieur": "Nom complet de l'équipe",
      "competition": "Nom de la compétition" ou null
    }
  ]
}`
      const contentParts = [
        { type: 'text', text: prompt },
        ...calendarImages.map(img => ({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${img.base64}` } }))
      ]
      const data = await enqueueGroqRequest('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'qwen/qwen3.6-27b',
          messages: [
            { role: 'system', content: '/no_think\nRéponds uniquement avec du JSON valide. Aucune réflexion préalable.' },
            { role: 'user', content: contentParts }
          ],
          temperature: 0.7,
          max_completion_tokens: 4000
        })
      }, setCalendarStatus)
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error))
      const raw = data.choices?.[0]?.message?.content || ''
      const text = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Réponse invalide de l\'IA')
      const result = JSON.parse(jsonMatch[0])
      const newMatchs = (result.matchs || []).filter(m => m.equipe_domicile && m.equipe_exterieur)
      const merged = [
        ...calendarMatchs.filter(m => !newMatchs.find(nm => nm.date === m.date && nm.equipe_domicile === m.equipe_domicile && nm.equipe_exterieur === m.equipe_exterieur)),
        ...newMatchs
      ].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'))
      setCalendarMatchs(merged)
      localStorage.setItem('calendarMatchs', JSON.stringify(merged))
      setCalendarImages([])
    } catch (e) { setCalendarError(e.message) }
    finally { setCalendarLoading(false); setCalendarStatus(null) }
  }

  // Publie les matchs scannés (locaux, localStorage) dans matchs_equipe pour qu'ils
  // apparaissent partout (Accueil, Résultats, stats) — jusque là ils n'existaient
  // qu'en cache navigateur, invisibles du reste de l'app.
  // "Nous" est déterminé en comparant chaque équipe au nom du club (profilEdu.club) ;
  // si aucune des deux ne correspond, on part du principe qu'on est à domicile (à
  // corriger manuellement dans Résultats si besoin — le nom du club n'est pas fiable
  // à 100%, mieux vaut un défaut simple qu'une logique de matching plus fragile ici).
  const publierCalendrierVersMatchs = async () => {
    const clubNorm = normaliserCle(profilEdu?.club || '')
    const publiables = calendarMatchs.filter(m => m.date)
    if (publiables.length === 0) return
    setPublishingCalendrier(true)
    const payload = publiables.map(m => {
      const domNorm = normaliserCle(m.equipe_domicile || '')
      const extNorm = normaliserCle(m.equipe_exterieur || '')
      const estNousExterieur = clubNorm && extNorm.includes(clubNorm) && !domNorm.includes(clubNorm)
      return {
        educateur_id: userId,
        date: m.date,
        heure: m.heure || null,
        adversaire: estNousExterieur ? (m.equipe_domicile || '') : (m.equipe_exterieur || m.equipe_domicile || ''),
        competition: m.competition || null,
        domicile: !estNousExterieur,
      }
    })
    const { error } = await supabase.from('matchs_equipe').insert(payload)
    if (!error) {
      for (const m of payload) { await creerDeplacementAutoMatch(m) }
      const restants = calendarMatchs.filter(m => !m.date)
      setCalendarMatchs(restants)
      localStorage.setItem('calendarMatchs', JSON.stringify(restants))
      await chargerMatchs(userId)
    } else {
      setCalendarError(error.message)
    }
    setPublishingCalendrier(false)
  }

  // Matching fuzzy : trouve le joueur de notre équipe à partir d'un nom sur la feuille
  // La feuille affiche "PRENOM N." — on cherche par prénom (majuscule)
  const matcherJoueurParNom = (nomSurFeuille, listeJoueurs) => {
    if (!nomSurFeuille) return null
    const prenomFeuille = nomSurFeuille.trim().split(/\s+/)[0].toUpperCase()
    if (!prenomFeuille) return null
    return listeJoueurs.find(j =>
      j.prenom && j.prenom.toUpperCase() === prenomFeuille
    ) || null
  }

  // Redimensionne (sans jamais agrandir) et recompresse une photo de feuille de
  // match avant envoi à l'IA — les photos prises directement au téléphone sont
  // souvent bien plus larges que nécessaire, ce qui alourdit l'upload sans
  // gagner en lisibilité de texte ; 1600px de large garde largement assez de
  // détail pour lire des petits noms manuscrits/imprimés.
  const redimensionnerImagePourScan = (file, maxWidth = 1600) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = ev => {
      const img = new Image()
      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, 1)
        const canvas = document.createElement('canvas')
        canvas.width = img.width * ratio
        canvas.height = img.height * ratio
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
        resolve({ base64: dataUrl.split(',')[1], preview: dataUrl })
      }
      img.onerror = reject
      img.src = ev.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  // Cœur du scan de feuille de match (appel Groq + matching JS contre le roster) —
  // partagé entre le scanner "nouveau match" (scannerMatch) et le scanner de la
  // modale "Marquer comme joué" (scannerFeuilleModal), pour ne pas dupliquer la
  // logique d'extraction/matching.
  const scannerFeuilleDeMatch = async (imageBase64, setStatus) => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY
    if (!apiKey) throw new Error('Clé VITE_GROQ_API_KEY manquante dans .env')
    const prompt = `Analyse cette feuille de match football et extrais les données visibles.
Réponds UNIQUEMENT avec un objet JSON valide, aucun texte avant ou après, aucune balise markdown.

RÈGLE ABSOLUE : liste TOUS les joueurs visibles sur la feuille, dans les deux
colonnes (equipe_gauche ET equipe_droite), sans exception — titulaires,
remplaçants, joueurs sans but ni carton. Ne t'arrête pas après quelques noms.
Relis l'image de haut en bas deux fois avant de répondre : une feuille de
match contient généralement 11 à 20 noms par équipe, si tu en listes beaucoup
moins c'est probablement que tu en as manqué. Si tu n'es pas sûr d'un nom,
mets quand même ta meilleure lecture plutôt que de sauter le joueur.

Format exact attendu :
{
  "date": "YYYY-MM-DD ou null",
  "competition": "nom ou null",
  "equipe_adversaire": "nom de l'équipe adverse ou null",
  "domicile": true,
  "score_domicile": 0,
  "score_exterieur": 0,
  "equipe_gauche": ["PRENOM NOM", ...],
  "equipe_droite": ["PRENOM NOM", ...],
  "buts_gauche": ["PRENOM NOM", ...],
  "buts_droite": ["PRENOM NOM", ...],
  "cartons_jaunes": ["PRENOM NOM", ...],
  "cartons_rouges": ["PRENOM NOM", ...],
  "buts_minutes": [{ "colonne": "gauche ou droite", "minute": 23 }, ...]
}

Lis chaque nom exactement comme écrit sur la feuille.
Si une info n'est pas visible, mets un tableau vide [] ou null selon le champ.
Pour "buts_minutes" : un élément par but marqué, avec la colonne (gauche/droite,
même convention que equipe_gauche/equipe_droite) et la minute indiquée à côté du
but (souvent près d'un symbole ⚽). Si la minute d'un but n'est pas visible, ne
mets pas d'élément pour ce but plutôt qu'une minute inventée.`
    const data = await enqueueGroqRequest('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-27b',
        messages: [
          { role: 'system', content: '/no_think\nRéponds uniquement avec du JSON valide. Aucune réflexion préalable.' },
          { role: 'user', content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
          ]}
        ],
        temperature: 0.7,
        max_completion_tokens: 4000
      })
    }, setStatus)
    console.log('GROQ RESPONSE:', JSON.stringify(data))
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error))
    const raw = data.choices?.[0]?.message?.content || ''
    const text = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Réponse invalide de l\'IA')
    const parsed = JSON.parse(jsonMatch[0])

    // Identifie quelle colonne (gauche/droite) correspond à notre équipe : celle dont
    // le plus de noms matchent notre roster (matching JS, pas d'IA)
    const nomsGauche = parsed.equipe_gauche || []
    const nomsDroite = parsed.equipe_droite || []
    const scoreGaucheMatch = nomsGauche.filter(n => matcherJoueurParNom(n, joueurs)).length
    const scoreDroiteMatch = nomsDroite.filter(n => matcherJoueurParNom(n, joueurs)).length
    const notreEquipeCote = scoreGaucheMatch >= scoreDroiteMatch ? 'gauche' : 'droite'
    const nosNomsIA = notreEquipeCote === 'gauche' ? nomsGauche : nomsDroite
    const butsIA = notreEquipeCote === 'gauche' ? (parsed.buts_gauche || []) : (parsed.buts_droite || [])
    const scoreNous = notreEquipeCote === 'gauche' ? (parsed.score_domicile ?? 0) : (parsed.score_exterieur ?? 0)
    const scoreAdv = notreEquipeCote === 'gauche' ? (parsed.score_exterieur ?? 0) : (parsed.score_domicile ?? 0)

    const statsParJoueur = {}
    nosNomsIA.forEach(nom => {
      const joueur = matcherJoueurParNom(nom, joueurs)
      if (joueur) {
        const buts = butsIA.filter(b => matcherJoueurParNom(b, [joueur])).length
        const cartonJ = (parsed.cartons_jaunes || []).some(b => matcherJoueurParNom(b, [joueur]))
        const cartonR = (parsed.cartons_rouges || []).some(b => matcherJoueurParNom(b, [joueur]))
        statsParJoueur[joueur.id] = {
          minutes: 90,
          buts,
          passes_dec: 0,
          clean_sheet: false,
          carton_jaune: cartonJ,
          carton_rouge: cartonR
        }
      }
    })

    // Minutes des buts, pour les stats "par quart d'heure" (StatsEquipe.jsx) —
    // "gauche"/"droite" (convention de la feuille) reconverti en "nous"/"eux"
    // maintenant qu'on sait quel côté est le nôtre. Les buts sans minute lisible
    // ne sont pas gardés (mieux vaut absent qu'une minute inventée).
    const butsDetail = (parsed.buts_minutes || [])
      .filter(b => typeof b.minute === 'number' && (b.colonne === 'gauche' || b.colonne === 'droite'))
      .map(b => ({ minute: b.minute, equipe: b.colonne === notreEquipeCote ? 'nous' : 'eux' }))

    return { parsed, scoreNous, scoreAdv, statsParJoueur, butsDetail }
  }

  const scannerMatch = async () => {
    if (!scannerImageBase64) return
    setScannerLoading(true)
    setScannerError(null)
    try {
      const { parsed, scoreNous, scoreAdv, statsParJoueur, butsDetail } = await scannerFeuilleDeMatch(scannerImageBase64, setScannerStatus)
      setScannerResult(parsed)
      setScannerMatchData({
        date: parsed.date || '',
        adversaire: parsed.equipe_adversaire || '',
        competition: parsed.competition || '',
        score_nous: String(scoreNous),
        score_eux: String(scoreAdv),
        domicile: parsed.domicile !== false
      })
      setScannerStats(statsParJoueur)
      setScannerButsDetail(butsDetail)
      // Avertit si l'IA a détecté sensiblement moins de joueurs que l'effectif
      // de l'équipe — seuil relatif (70%) plutôt qu'un nombre fixe, une petite
      // équipe (U7...) pouvant légitimement avoir un effectif réduit.
      const nbDetectes = Object.keys(statsParJoueur).length
      setScannerWarning(
        joueurs.length > 0 && nbDetectes < joueurs.length * 0.7
          ? `⚠️ Seulement ${nbDetectes} joueur${nbDetectes > 1 ? 's' : ''} détecté${nbDetectes > 1 ? 's' : ''} sur ${joueurs.length} dans l'effectif. Vérifiez la liste ci-dessous et complétez les joueurs manquants (lignes grisées).`
          : null
      )
    } catch (e) {
      setScannerError(e.message)
    } finally {
      setScannerLoading(false)
      setScannerStatus(null)
    }
  }

  const scannerFeuilleModal = async () => {
    if (!scannerModalImageBase64 || !modalMatchJoue) return
    setScannerModalLoading(true)
    setScannerModalError(null)
    try {
      const { scoreNous, scoreAdv, statsParJoueur, butsDetail } = await scannerFeuilleDeMatch(scannerModalImageBase64, setScannerModalStatus)
      setScoreJoueForm({ score_nous: String(scoreNous), score_eux: String(scoreAdv) })
      setStatsMatch(prev => ({ ...prev, [modalMatchJoue.id]: statsParJoueur }))
      setScannerModalButsDetail(butsDetail)
    } catch (e) {
      setScannerModalError(e.message)
    } finally {
      setScannerModalLoading(false)
      setScannerModalStatus(null)
    }
  }

  const sauvegarderMatchScanne = async () => {
    if (!scannerMatchData.adversaire) return
    setScannerSaving(true)
    const { data: matchInserted } = await supabase.from('matchs_equipe').insert({
      ...scannerMatchData,
      educateur_id: userId,
      score_nous: parseInt(scannerMatchData.score_nous) || 0,
      score_eux: parseInt(scannerMatchData.score_eux) || 0,
      buts_detail: scannerButsDetail,
    }).select().single()
    if (matchInserted) {
      for (const [joueurId, s] of Object.entries(scannerStats)) {
        await supabase.from('stats_match').upsert({
          match_id: matchInserted.id, joueur_id: joueurId, educateur_id: userId,
          minutes: s.minutes || 0, buts: s.buts || 0, passes_dec: s.passes_dec || 0,
          clean_sheet: s.clean_sheet || false, carton_jaune: s.carton_jaune || false, carton_rouge: s.carton_rouge || false
        }, { onConflict: 'match_id,joueur_id' })
      }
    }
    await chargerMatchs(userId)
    setShowScanner(false)
    setScannerResult(null)
    setScannerImageBase64(null)
    setScannerImagePreview(null)
    setScannerStats({})
    setScannerButsDetail([])
    setScannerSaving(false)
  }

  const ajouterEntrainement = async () => {
    if (!newEntrainement.date) return
    if (!userId) {
      console.error('ajouterEntrainement: userId manquant au moment du submit', { newEntrainement, userId })
      afficherToast('Impossible de créer la séance : utilisateur non chargé, réessaie dans un instant.', 'erreur')
      return
    }
    const payload = { ...newEntrainement, educateur_id: userId }
    console.log('ajouterEntrainement: insert payload', payload)
    const { data, error } = await supabase.from('entrainements').insert(payload).select()
    console.log('ajouterEntrainement: résultat insert', { data, error })
    if (error) {
      afficherToast(`Erreur lors de la création de la séance : ${error.message}`, 'erreur')
      return
    }
    await chargerEntrainements(userId)
    setNewEntrainement({ date: '', description: '', heure: '', lieu: '', fiche_id: null })
    setShowAddEntrainement(false)
    setShowImportFiche(false)
  }

  const sauvegarderEntrainementEdite = async () => {
    if (!entrainementEnEdition?.date) return
    const { id, date, heure, description, lieu } = entrainementEnEdition
    // Optimistic : la liste locale se met à jour et la modale se ferme tout
    // de suite, sans attendre la réponse Supabase. Erreur → réouverte
    // (l'erreur était auparavant ignorée silencieusement).
    const avant = entrainements.find(e => e.id === id)
    const snapshot = entrainementEnEdition
    setEntrainements(prev => prev.map(e => e.id === id ? { ...e, date, heure, description, lieu } : e))
    setSavingEntrainementEdit(true)
    setEntrainementEnEdition(null)
    const { error } = await supabase.from('entrainements').update({ date, heure, description, lieu }).eq('id', id)
    setSavingEntrainementEdit(false)
    if (error) {
      alert('Erreur : ' + error.message)
      if (avant) setEntrainements(prev => prev.map(e => e.id === id ? avant : e))
      setEntrainementEnEdition(snapshot)
    }
  }

  const importerFicheDansEntrainement = (seance) => {
    setNewEntrainement(prev => ({ ...prev, description: seance.theme || prev.description, fiche_id: seance.id }))
    setShowImportFiche(false)
  }

  // Lie une fiche archivée à un entraînement déjà créé (bouton "+" sur chaque séance de la liste)
  const importerFicheDansEntrainementExistant = async (seance) => {
    if (!modalImportFicheEntrainement) return
    const entrainementId = modalImportFicheEntrainement
    await supabase.from('entrainements').update({ fiche_id: seance.id }).eq('id', entrainementId)
    setEntrainements(prev => prev.map(e => e.id === entrainementId ? { ...e, fiche_id: seance.id } : e))
    setModalImportFicheEntrainement(null)
  }

  const grouperParMois = (liste) => {
    const groupes = {}
    liste.forEach(e => {
      const d = new Date(e.date + 'T12:00:00')
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString(localeOf(lang), { month: 'long', year: 'numeric' })
      if (!groupes[key]) groupes[key] = { label, items: [] }
      groupes[key].items.push(e)
    })
    return Object.entries(groupes).sort((a, b) => b[0].localeCompare(a[0]))
  }

  const supprimerEntrainement = async (id) => {
    if (!confirm('Supprimer cette séance et toutes ses présences ?')) return
    await supabase.from('presences_entrainement').delete().eq('entrainement_id', id)
    await supabase.from('entrainements').delete().eq('id', id)
    setEntrainements(prev => prev.filter(e => e.id !== id))
  }

  const genererSaison = async () => {
    if (!planSaison.dateDebut || !planSaison.dateFin || !planSaison.joursActifs.length) return
    setGeneratingPlan(true)
    // Construire la liste de toutes les dates correspondantes
    const dates = []
    const cur = new Date(planSaison.dateDebut)
    const end = new Date(planSaison.dateFin)
    while (cur <= end) {
      if (planSaison.joursActifs.includes(cur.getDay())) {
        dates.push(cur.toISOString().split('T')[0])
      }
      cur.setDate(cur.getDate() + 1)
    }
    // Ne créer que les dates qui n'existent pas déjà
    const existingDates = new Set(entrainements.map(e => e.date?.substring(0, 10)))
    const newDates = dates.filter(d => !existingDates.has(d))
    setPlanProgress({ done: 0, total: newDates.length })
    for (let i = 0; i < newDates.length; i++) {
      const { data } = await supabase.from('entrainements').insert({
        date: newDates[i],
        description: planSaison.theme || '',
        educateur_id: userId
      }).select().single()
      // Pas de lignes pré-créées : la présence est saisie au clic (evite les faux "absents")
      setPlanProgress({ done: i + 1, total: newDates.length })
    }
    await chargerEntrainements(userId)
    setGeneratingPlan(false)
    setShowPlanificateur(false)
    setPlanSaison({ joursActifs: [], dateDebut: '', dateFin: '', theme: '' })
  }

  const toggleJourPlan = (jour) => {
    setPlanSaison(prev => ({
      ...prev,
      joursActifs: prev.joursActifs.includes(jour)
        ? prev.joursActifs.filter(j => j !== jour)
        : [...prev.joursActifs, jour]
    }))
  }

  // Statuts disponibles (cycle au clic)
  const STATUTS = ['absent', 'present', 'blesse', 'malade', 'convoque']
  const STATUT_CONFIG = {
    present:  { label: t('ent_present', lang),   emoji: '✅', bg: colors.accent.green + alpha.subtle, border: colors.accent.green + alpha.medium, color: colors.accent.green },
    absent:   { label: t('ent_absent', lang),    emoji: '❌', bg: colors.accent.red + alpha.subtle, border: colors.accent.red + alpha.medium, color: colors.accent.red },
    blesse:   { label: t('ent_blesse', lang),    emoji: '🤕', bg: colors.accent.orange + alpha.subtle, border: colors.accent.orange + alpha.medium, color: colors.accent.orange },
    malade:   { label: t('ent_malade', lang),    emoji: '🤒', bg: colors.accent.purple + alpha.subtle, border: colors.accent.purple + alpha.medium, color: colors.accent.purple },
    convoque: { label: t('ent_convoque', lang),  emoji: '🏆', bg: colors.accent.blue + alpha.subtle, border: colors.accent.blue + alpha.medium, color: colors.accent.blue },
  }

  // Réponses des joueurs à la dispo d'un match (disponibilites.match_id), triées
  // ✅ → 🏆 → ❌ → 🤕 → 🤒 → ⏳ pour la modale résultats du sondage.
  const reponsesDispoMatch = (matchId) => {
    const ordre = { present: 0, convoque: 1, absent: 2, blesse: 3, malade: 4 }
    return joueurs
      .map(j => ({ ...j, statut: j.joueur_id ? dispoJoueursMatch[matchId]?.[j.joueur_id] || null : null }))
      .sort((a, b) => (ordre[a.statut] ?? 5) - (ordre[b.statut] ?? 5))
  }
  const statsDispoMatch = (matchId) => {
    const stats = { present: 0, absent: 0, blesse: 0, malade: 0, convoque: 0, sans_reponse: 0 }
    reponsesDispoMatch(matchId).forEach(j => { if (j.statut) stats[j.statut]++; else stats.sans_reponse++ })
    return stats
  }

  const TIMELINE_DEFAUT = [
    { heure: '', label: 'RDV Vestiaire', icone: '🚪' },
    { heure: '', label: 'Causerie', icone: '🎙️' },
    { heure: '', label: 'Sortie échauffement', icone: '🏃' },
    { heure: '', label: "Coup d'envoi", icone: '⚽' },
  ]

  // Convocation déjà publiée pour ce match, si elle existe — pré-remplit le
  // formulaire et les cases cochées à l'ouverture de la modale "Sondage dispo".
  const chargerConvocation = async (matchId) => {
    const { data: conv } = await supabase.from('convocations').select('*').eq('match_id', matchId).maybeSingle()
    if (!conv) {
      setConvocationExistante(null)
      setConvocationForm({ type_terrain: 'Herbe', arbitre_nom: '', notes: '', timeline: TIMELINE_DEFAUT })
      return
    }
    setConvocationExistante(conv)
    setConvocationForm({
      type_terrain: conv.type_terrain || 'Herbe',
      arbitre_nom: conv.arbitre_nom || '',
      notes: conv.notes || '',
      timeline: conv.timeline?.length ? conv.timeline : TIMELINE_DEFAUT,
    })
    const { data: cj } = await supabase.from('convocation_joueurs').select('joueur_id').eq('convocation_id', conv.id)
    const parJoueurId = {}
    ;(cj || []).forEach(row => {
      const j = joueurs.find(x => x.joueur_id === row.joueur_id)
      if (j) parJoueurId[j.id] = true
    })
    setConvocationsCoches(parJoueurId)
  }

  // Dimanche suivant le match, 20h — le widget joueur (lecture filtrée sur
  // expire_at > now()) disparaît tout seul à ce moment-là, pas de tâche
  // planifiée nécessaire.
  const calculerExpirationConvocation = (dateMatch) => {
    const d = new Date(`${dateMatch}T00:00:00`)
    const jourSemaine = d.getDay() // 0=dimanche..6=samedi
    const joursVersDimanche = (7 - jourSemaine) % 7 || 7
    const dimanche = new Date(d)
    dimanche.setDate(d.getDate() + joursVersDimanche)
    dimanche.setHours(20, 0, 0, 0)
    return dimanche.toISOString()
  }

  const publierConvocation = async (match) => {
    setPubliantConvocation(true)
    const payload = {
      match_id: match.id,
      educateur_id: userId,
      type_terrain: convocationForm.type_terrain,
      arbitre_nom: convocationForm.arbitre_nom.trim() || null,
      notes: convocationForm.notes.trim() || null,
      timeline: convocationForm.timeline.filter(step => step.heure.trim() || step.label.trim()),
      publiee: true,
      publiee_at: new Date().toISOString(),
      expire_at: calculerExpirationConvocation(match.date),
    }
    const { data: conv, error } = await supabase.from('convocations').upsert(payload, { onConflict: 'match_id' }).select().single()
    if (error) { afficherToast(`Erreur : ${error.message}`, 'erreur'); setPubliantConvocation(false); return }

    const joueurIds = reponsesDispoMatch(match.id)
      .filter(j => (convocationsCoches[j.id] ?? (j.statut === 'present' || j.statut === 'convoque')) && j.joueur_id)
      .map(j => j.joueur_id)

    // Remplace le groupe convoqué en entier (delete + insert) plutôt que de
    // calculer un diff — plus simple, et le volume (effectif d'une équipe)
    // ne justifie pas l'optimisation.
    await supabase.from('convocation_joueurs').delete().eq('convocation_id', conv.id)
    if (joueurIds.length > 0) {
      await supabase.from('convocation_joueurs').insert(joueurIds.map(joueur_id => ({ convocation_id: conv.id, joueur_id })))
    }

    setConvocationExistante(conv)
    setPubliantConvocation(false)
    afficherToast(`✅ Convocation publiée — ${joueurIds.length} joueur${joueurIds.length > 1 ? 's' : ''}`)
  }

  // sondageEstClos importée de ../lib/sondage — partagée avec DashboardJoueur.jsx
  // (avant ce partage, seul ce fichier calculait la clôture en direct ; le
  // dashboard joueur se fiait au champ sondage_clos brut, jamais mis à jour
  // automatiquement, donc les joueurs pouvaient répondre après le délai).

  const cyclerPresence = async (entrainementId, joueurId, statutActuel) => {
    if (statutActuel === 'convoque') {
      // Dernier statut → retour à "non saisi" : on supprime la ligne
      await supabase.from('presences_entrainement')
        .delete()
        .eq('entrainement_id', entrainementId)
        .eq('joueur_id', joueurId)
    } else {
      const idx = statutActuel === 'non_saisi' ? -1 : STATUTS.indexOf(statutActuel)
      const prochain = STATUTS[(idx + 1) % STATUTS.length]
      await supabase.from('presences_entrainement').upsert(
        { entrainement_id: entrainementId, joueur_id: joueurId, educateur_id: userId, statut: prochain, present: prochain === 'present' || prochain === 'convoque' },
        { onConflict: 'entrainement_id,joueur_id' }
      )
    }
    await chargerEntrainements(userId)
  }

  // Convertit en vraies présences les réponses au sondage (dispoJoueurs, table
  // disponibilites) des joueurs pas encore saisis manuellement pour cet
  // entraînement — sans ça, "Stats joueurs" (basée uniquement sur
  // presences_entrainement) reste à 0%/vide pour un joueur qui a pourtant
  // répondu au sondage, tant que l'éducateur n'a pas cliqué manuellement sur
  // chacun. Les valeurs de statut sont déjà identiques entre les deux tables
  // (present/absent/blesse/malade/convoque), aucune conversion nécessaire.
  const importerReponsesSondage = async (entrainementId) => {
    const ent = entrainements.find(e => e.id === entrainementId)
    if (!ent) return
    const aImporter = joueurs.filter(j => {
      const p = (ent.presences_entrainement || []).find(p => p.joueur_id === j.id)
      const nonSaisi = !p || (!p.statut && !p.present)
      return nonSaisi && j.joueur_id && dispoJoueurs[entrainementId]?.[j.joueur_id]
    })
    if (aImporter.length === 0) { afficherToast('Aucune réponse au sondage à importer.', 'erreur'); return }
    const payload = aImporter.map(j => {
      const statut = dispoJoueurs[entrainementId][j.joueur_id]
      return { entrainement_id: entrainementId, joueur_id: j.id, educateur_id: userId, statut, present: statut === 'present' || statut === 'convoque' }
    })
    const { error } = await supabase.from('presences_entrainement').upsert(payload, { onConflict: 'entrainement_id,joueur_id' })
    if (error) { afficherToast(`Erreur : ${error.message}`, 'erreur'); return }
    await chargerEntrainements(userId)
    afficherToast(`${payload.length} présence${payload.length > 1 ? 's' : ''} importée${payload.length > 1 ? 's' : ''} depuis le sondage`)
  }

  // presences_entrainement.statut/present ont des valeurs par défaut en base
  // ('absent'/false) — si on ne les inclut pas dans l'upsert, elles ne sont
  // appliquées QUE quand la ligne n'existe pas encore (omises = valeur par
  // défaut à l'INSERT), ce qui changeait silencieusement le statut affiché
  // d'un joueur jamais saisi. On repasse explicitement les valeurs actuelles
  // (ou null si aucune ligne n'existe) pour que l'étoile ne touche jamais au
  // statut, qu'une présence ait déjà été saisie ou non.
  const togglePointSeance = async (entrainementId, joueurId, presenceActuelle) => {
    await supabase.from('presences_entrainement').upsert(
      {
        entrainement_id: entrainementId,
        joueur_id: joueurId,
        educateur_id: userId,
        statut: presenceActuelle?.statut ?? null,
        present: presenceActuelle?.present ?? null,
        point_seance: !presenceActuelle?.point_seance,
      },
      { onConflict: 'entrainement_id,joueur_id' }
    )
    await chargerEntrainements(userId)
  }

  const sauvegarderNote = async (joueurId, noteData) => {
    // Optimistic : la note locale se met à jour tout de suite, sans attendre
    // la réponse Supabase ni un rechargement complet de toutes les notes.
    const avantNotes = notes[joueurId]
    const avantLocal = localNotes[joueurId]
    setNotes(prev => ({ ...prev, [joueurId]: { ...prev[joueurId], joueur_id: joueurId, educateur_id: userId, ...noteData } }))
    setLocalNotes(prev => ({ ...prev, [joueurId]: { technique: noteData.technique || 0, physique: noteData.physique || 0, mental: noteData.mental || 0, tactique: noteData.tactique || 0, commentaire: noteData.commentaire || '', visible_joueur: noteData.visible_joueur || false } }))
    setSavingNote(true)
    const { error } = await supabase.from('notes_joueurs').upsert(
      { joueur_id: joueurId, educateur_id: userId, ...noteData },
      { onConflict: 'joueur_id,educateur_id' }
    )
    setSavingNote(false)
    if (error) {
      alert('Erreur : ' + error.message)
      setNotes(prev => ({ ...prev, [joueurId]: avantNotes }))
      setLocalNotes(prev => ({ ...prev, [joueurId]: avantLocal }))
    }
  }

  // Classement calculé
  const classement = () => {
    const equipes = {}
    matchs.filter(m => m.score_nous !== '' && m.score_eux !== '').forEach(m => {
      const nous = parseInt(m.score_nous)
      const eux = parseInt(m.score_eux)
      const nomNous = profil?.club || 'Mon équipe'
      if (!equipes[nomNous]) equipes[nomNous] = { nom: nomNous, j: 0, v: 0, n: 0, d: 0, bp: 0, bc: 0, pts: 0, moi: true }
      if (!equipes[m.adversaire]) equipes[m.adversaire] = { nom: m.adversaire, j: 0, v: 0, n: 0, d: 0, bp: 0, bc: 0, pts: 0, moi: false }
      equipes[nomNous].j++; equipes[m.adversaire].j++
      equipes[nomNous].bp += nous; equipes[nomNous].bc += eux
      equipes[m.adversaire].bp += eux; equipes[m.adversaire].bc += nous
      if (nous > eux) { equipes[nomNous].v++; equipes[nomNous].pts += 3; equipes[m.adversaire].d++ }
      else if (nous < eux) { equipes[m.adversaire].v++; equipes[m.adversaire].pts += 3; equipes[nomNous].d++ }
      else { equipes[nomNous].n++; equipes[nomNous].pts++; equipes[m.adversaire].n++; equipes[m.adversaire].pts++ }
    })
    return Object.values(equipes).sort((a, b) => b.pts - a.pts || (b.bp - b.bc) - (a.bp - a.bc))
  }

  // Stats globales joueur
  const statsGlobalesJoueur = (joueurId, matchsScope = matchs) => {
    const allStats = matchsScope.flatMap(m => {
      const ps = (m.stats_match || []).filter(s => s.joueur_id === joueurId)
      return ps.map(s => ({ ...s, _match: m }))
    })
    const joues = allStats.filter(s => s.minutes > 0)
    return {
      matchs: joues.length,
      minutes: allStats.reduce((s, r) => s + (r.minutes || 0), 0),
      buts: allStats.reduce((s, r) => s + (r.buts || 0), 0),
      passes_dec: allStats.reduce((s, r) => s + (r.passes_dec || 0), 0),
      clean_sheets: allStats.filter(s => s.clean_sheet).length,
      cartons_j: allStats.filter(s => s.carton_jaune).length,
      cartons_r: allStats.filter(s => s.carton_rouge).length,
      victoires: joues.filter(s => {
        const m = s._match
        return m && parseInt(m.score_nous) > parseInt(m.score_eux)
      }).length,
    }
  }

  const tauxPresence = (joueurId) => {
    // On prend en compte à la fois les saisies manuelles (presences_entrainement)
    // ET les réponses auto au sondage (dispoJoueurs) pour les joueurs non encore saisis.
    const joueur = joueurs.find(j => j.id === joueurId)
    const getStatutEffectif = (e) => {
      const p = (e.presences_entrainement || []).find(p => p.joueur_id === joueurId)
      const nonSaisi = !p || (!p.statut && !p.present)
      if (!nonSaisi) return p?.statut || (p?.present ? 'present' : 'absent')
      // Pas de saisie manuelle → on utilise la réponse auto au sondage si elle existe
      return joueur?.joueur_id ? (dispoJoueurs[e.id]?.[joueur.joueur_id] || null) : null
    }
    const saisies = entrainements.filter(e => getStatutEffectif(e) !== null)
    if (!saisies.length) return null
    const presents  = saisies.filter(e => getStatutEffectif(e) === 'present').length
    const convoque  = saisies.filter(e => getStatutEffectif(e) === 'convoque').length
    const absents   = saisies.filter(e => getStatutEffectif(e) === 'absent').length
    const blesses   = saisies.filter(e => getStatutEffectif(e) === 'blesse').length
    const malade    = saisies.filter(e => getStatutEffectif(e) === 'malade').length
    const total     = saisies.length
    return { taux: Math.round(((presents + convoque) / total) * 100), presents, convoque, absents, blesses, malade, total }
  }

  const postes = ['Gardien', 'Défenseur central', 'Latéral droit', 'Latéral gauche', 'Milieu défensif', 'Milieu central', 'Milieu offensif', 'Ailier droit', 'Ailier gauche', 'Attaquant']

  const st = {
    input: { width: '100%', background: colors.background.raised, border: `1px solid ${colors.border.default}`, borderRadius: '8px', color: colors.text.primary, padding: '9px 12px', fontSize: '13px', boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif' },
    label: { fontSize: '11px', color: colors.text.faint, marginBottom: '4px', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
    card: { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '1.25rem' },
    btn: (color = colors.accent.blue) => ({ background: color + '15', border: `1px solid ${color}40`, color, padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }),
    btnSolid: { background: colors.accent.blue, color: colors.black, border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
    // Bouton icône discret — pour les actions secondaires groupées sur une
    // carte (sondage/convocation/édition/suppression) : fond quasi
    // transparent, icône teintée mais atténuée, moins voyant qu'un st.btn
    // plein avec libellé texte à côté du CTA principal de la carte.
    iconBtnDiscret: (color) => ({ background: color + '0d', border: `1px solid ${color}25`, color: color + 'cc', width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }),
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: colors.background.base, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: colors.accent.blue, fontFamily: 'Inter, sans-serif' }}>{t('btn_chargement', lang)}</p>
    </div>
  )

  const sidebarSections = [
    { titre: 'MON ÉQUIPE', items: [
      { key: 'equipe', label: t('nav_equipe', lang), icon: <IcoUsers /> },
      { key: 'stats', label: t('nav_stats', lang), icon: <IcoChart /> },
      { key: 'matchs', label: t('nav_competition', lang), icon: <IcoTrophy /> },
      { key: 'causerie', label: t('nav_causerie', lang), icon: <IcoMic /> },
      { key: 'deplacements', label: t('nav_deplacements', lang), icon: <IcoBus /> },
      { key: 'terrains', label: t('nav_terrains', lang), icon: <IcoCalendar /> },
      { key: 'materiel', label: 'Mon matériel', icon: <IcoBox /> },
    ] },
    { titre: t('section_entrainement', lang), items: [
      { key: 'entrainements', label: t('nav_entrainements', lang), icon: <IcoRun /> },
      { key: 'mes_seances', label: t('nav_seances', lang), icon: <IcoFilm /> },
      { key: 'bibliotheque', label: t('nav_bibliotheque', lang), icon: <IcoBook /> },
      { key: 'prep_physique', label: t('nav_prep_physique', lang), icon: <IcoDumbbell /> },
      { key: 'tactipad', label: t('nav_tacticboard', lang), icon: <IcoLayout /> },
    ] },
    { titre: t('section_analyse', lang), items: [
      { key: 'analyse_video', label: t('nav_analyse', lang), icon: <IcoVideo /> },
      { key: 'notes', label: t('nav_evaluations', lang), icon: <IcoClipboard /> },
      { key: 'clotures_saison', label: t('nav_clotures', lang), icon: <IcoCalendar /> },
    ] },
    { titre: t('section_reseau', lang), items: [
      { key: 'recrutement', label: t('nav_recrutement', lang), icon: <IcoSearch /> },
      { key: 'dirigeants', label: t('nav_dirigeants', lang), icon: <IcoBuilding /> },
      { key: 'explorer', label: 'Explorer', icon: <IcoCompass /> },
    ] },
  ]

  // Gating par permissions (dirigeant délégué uniquement — permissions est undefined
  // pour l'éducateur lui-même, donc canView/canEdit renvoient toujours true).
  // Seules les sections avec une clé de permission correspondante sont masquables ;
  // les autres (séances, tactipad, recrutement, dirigeants...) restent visibles faute
  // de permission dédiée pour l'instant.
  const PERMISSION_PAR_SECTION = {
    equipe: 'effectif', stats: 'stats', matchs: 'competition',
    entrainements: 'entrainements', prep_physique: 'prep_physique', notes: 'notes',
  }
  const canView = (sidebarKey) => {
    if (!permissions) return true
    const permKey = PERMISSION_PAR_SECTION[sidebarKey]
    return !permKey || permissions[permKey] !== 'aucun'
  }
  const canEdit = (permKey) => !permissions || permissions[permKey] === 'edition'

  const sidebarSectionsVisibles = sidebarSections
    .map(section => ({ ...section, items: section.items.filter(item => canView(item.key)) }))
    .filter(section => section.items.length > 0)

  const chargerRecrutJoueurs = async () => {
    if (recrutLoaded) return
    const { data } = await supabase.from('profiles').select('id, prenom, nom, poste, categorie, region, club, niveau_equipe, pied, buts_total, passes_decisives, matchs_officiel, cleansheets, minutes_jouees, points_forts, a_ameliorer, avatar_url, clip_url, created_at').eq('plan', 'joueur_pro').eq('abonnement_actif', true)
    setRecrutJoueurs(data || [])
    setRecrutLoaded(true)
  }

  // Annuaire éducateurs/clubs — même source que l'onglet "Explorer" du
  // dashboard joueur (profiles.plan), club_recrutements pour les postes
  // ouverts affichés sur les cartes club (utile pour "postuler").
  const chargerExplorer = async () => {
    setExplorerLoading(true)
    const [{ data: edu }, { data: clu }, { data: recrut }] = await Promise.all([
      supabase.from('profiles').select('id, prenom, nom, club, region, niveau_equipe, avatar_url, description').eq('plan', 'educateur').neq('id', userId),
      supabase.from('profiles').select('id, prenom, nom, club, region, avatar_url, description, bio, verified').eq('plan', 'club'),
      supabase.from('club_recrutements').select('club_id, categorie, poste, niveau').eq('actif', true),
    ])
    setEducateursExplorer(edu || [])
    setClubsExplorer(clu || [])
    const parClub = {}
    ;(recrut || []).forEach(r => { (parClub[r.club_id] ||= []).push(r) })
    setRecrutementsParClubExplorer(parClub)
    setExplorerLoading(false)
  }

  // messages est une table générique sender_id/receiver_id (déjà utilisée
  // côté joueur pour parler à un coach/recruteur) — aucune restriction RLS
  // par rôle, donc réutilisable telle quelle entre deux éducateurs ou avec
  // un club, sans nouvelle table ni policy.
  const chargerMessagesExplorer = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(prenom, nom, avatar_url), receiver:profiles!messages_receiver_id_fkey(prenom, nom, avatar_url)')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: true })
    setExplorerMessages(data || [])
  }

  const conversationsExplorer = () => {
    const map = {}
    explorerMessages.forEach(msg => {
      const otherId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id
      const other = msg.sender_id === userId ? msg.receiver : msg.sender
      if (!map[otherId]) map[otherId] = { id: otherId, ...other, msgs: [] }
      map[otherId].msgs.push(msg)
    })
    return Object.values(map).sort((a, b) => (b.msgs.at(-1)?.created_at || '').localeCompare(a.msgs.at(-1)?.created_at || ''))
  }

  const ouvrirChatExplorer = (personne) => { setChatOuvert(personne); setNouveauMessageExplorer('') }

  const envoyerMessageExplorer = async () => {
    if (!nouveauMessageExplorer.trim() || !chatOuvert) return
    setEnvoyingMessageExplorer(true)
    await supabase.from('messages').insert({ sender_id: userId, receiver_id: chatOuvert.id, content: nouveauMessageExplorer.trim(), created_at: new Date().toISOString() })
    await notifierJoueur({
      type: 'message',
      userId: chatOuvert.id,
      titre: 'Nouveau message',
      contenu: { auteur: `${profilEdu?.prenom || ''} ${profilEdu?.nom || ''}`.trim() || 'Un éducateur', texte: nouveauMessageExplorer.trim() },
      lien: '/dashboard',
    })
    setNouveauMessageExplorer('')
    await chargerMessagesExplorer()
    setEnvoyingMessageExplorer(false)
  }

  // Matériel confié par le club (materiel_distribution.educateur_id = cet éducateur) —
  // demande de remise en fin de saison, validée/refusée côté club (Inventaire > Matériel).
  const chargerMonMateriel = async () => {
    const { data } = await supabase.from('materiel_distribution').select('*').eq('educateur_id', userId).order('date_distribution', { ascending: false })
    setMonMateriel(data || [])
  }

  // dist représente une ligne du lot (plusieurs articles distribués ensemble
  // partagent un lot_id) — la demande de remise porte sur tout le lot.
  const demanderRemiseMateriel = async (dist) => {
    const query = supabase.from('materiel_distribution').update({ statut: 'remise_demandee' })
    await (dist.lot_id ? query.eq('lot_id', dist.lot_id) : query.eq('id', dist.id))
    const cle = dist.lot_id || dist.id
    setMonMateriel(prev => prev.map(d => (d.lot_id || d.id) === cle ? { ...d, statut: 'remise_demandee' } : d))
  }

  const sauvegarderMaTailleEduc = async (champId, valeur) => {
    await supabase.from('equipement_tailles').upsert(
      { user_id: userId, club_id: clubAffiliation.club_id, champ_id: champId, valeur, updated_at: new Date().toISOString() },
      { onConflict: 'user_id, champ_id' }
    )
    setMesTaillesEduc(prev => {
      const idx = prev.findIndex(t => t.champ_id === champId)
      if (idx === -1) return [...prev, { user_id: userId, club_id: clubAffiliation.club_id, champ_id: champId, valeur }]
      const next = [...prev]
      next[idx] = { ...next[idx], valeur }
      return next
    })
  }

  const marquerEquipementRecupereEduc = async () => {
    if (!equipementPretEduc) return
    const maintenant = new Date().toISOString()
    // .select().single() : une simple .update() sans lecture du résultat ne
    // remonte aucune erreur si la policy RLS filtre la ligne (0 ligne affectée
    // sans exception côté Postgrest) — c'est exactement ce qui rendait le clic
    // silencieusement inopérant tant que la policy destinataire n'existait pas.
    const { error } = await supabase.from('equipement_commandes').update({ statut: 'recupere', recupere_le: maintenant }).eq('id', equipementPretEduc.id).select().single()
    if (error) { alert('Erreur : ' + error.message); return }
    // Historique séparé (insert-only) : equipement_commandes est upserted par
    // personne, une prochaine préparation écraserait recupere_le sans laisser
    // de trace de cette remise — cf. supabase_equipement_historique_recuperation.sql.
    await supabase.from('equipement_recuperations').insert({
      club_id: clubAffiliation.club_id, destinataire_id: userId,
      destinataire_nom: `${profil?.prenom || ''} ${profil?.nom || ''}`.trim(),
      valide_le: maintenant,
    })
    setEquipementPretEduc(null)
    setEquipementCommandeEduc(prev => prev ? { ...prev, statut: 'recupere', recupere_le: maintenant } : prev)
  }

  const notifEquipementPret = notifications.find(n => n.type === 'equipement_pret' && !n.lu)

  return (
    <>
    {notifEquipementPret && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.faint}`, borderRadius: '16px', padding: '28px', maxWidth: '380px', width: '100%', textAlign: 'center' }}>
          <p style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 800 }}>{notifEquipementPret.titre}</p>
          {notifEquipementPret.contenu && (
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: colors.text.faint, lineHeight: 1.5 }}>{notifEquipementPret.contenu}</p>
          )}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => marquerNotifLue(notifEquipementPret.id)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `1px solid ${colors.border.default}`, background: 'transparent', color: colors.text.faint, fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Fermer</button>
            <button onClick={() => { marquerNotifLue(notifEquipementPret.id); setActiveSection('materiel') }} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: colors.accent.blue, color: colors.black, fontSize: '13px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Voir mon matériel</button>
          </div>
        </div>
      </div>
    )}
    {toastMsg && (
      <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: toastMsg.type === 'erreur' ? colors.accent.red : colors.accent.green, color: toastMsg.type === 'erreur' ? colors.text.primary : colors.black, padding: '12px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '14px', zIndex: 9999, boxShadow: '0 4px 24px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '360px' }}>
        {toastMsg.type === 'erreur' ? '⚠️' : '✓'} {toastMsg.msg}
      </div>
    )}
    <OnboardingGuide key={onboardingKey} userId={userId} steps={EDUCATEUR_ONBOARDING_STEPS} accentColor={colors.accent.blue} />
    <FloatingHelper userId={userId} onReplayOnboarding={replayOnboarding} faq={EDUCATEUR_FAQ} accentColor={colors.accent.blue} />
    <div style={{ minHeight: '100vh', background: colors.background.base, color: colors.text.primary, fontFamily: 'Inter, sans-serif', display: 'flex', overflowX: 'hidden' }}>

      {/* Overlay mobile */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 40 }}
        />
      )}

      {/* SIDEBAR */}
      {isTablet && (
        <button onClick={() => setSidebarCollapsed(v => !v)} title={sidebarCollapsed ? 'Afficher le menu' : 'Réduire le menu'}
          style={{
            position: 'fixed', top: '50%', left: sidebarCollapsed ? 0 : '64px', transform: 'translateY(-50%)', zIndex: 51,
            width: '18px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: colors.background.raised, border: `1px solid ${colors.border.subtle}`, borderLeft: sidebarCollapsed ? `1px solid ${colors.border.subtle}` : 'none',
            borderRadius: sidebarCollapsed ? '0 8px 8px 0' : '0 8px 8px 0', color: colors.text.muted, cursor: 'pointer', transition: 'left 0.2s ease',
          }}>
          {sidebarCollapsed ? <IcoChevronRight /> : <IcoChevronLeft />}
        </button>
      )}
      <aside style={{
        width: isTablet ? (sidebarCollapsed ? '0px' : '64px') : '220px', background: colors.background.sunken, borderRight: `1px solid ${colors.border.subtle}`, display: 'flex', flexDirection: 'column', flexShrink: 0, overflowX: 'hidden',
        ...(isMobile ? {
          position: 'fixed', top: 0, left: sidebarOpen ? 0 : -240, height: '100%', zIndex: 50, transition: 'left 0.25s ease', overflowY: 'auto', paddingTop: 'env(safe-area-inset-top, 0px)',
        } : {
          position: 'sticky', top: 0, height: '100vh', minHeight: '100vh', overflowY: 'auto', transition: isTablet ? 'width 0.2s ease' : 'none',
        }),
      }}>
        <div style={{ padding: isMobile ? '16px 16px 12px' : isTablet ? '20px 8px 12px' : '24px 20px 16px', textAlign: isTablet ? 'center' : 'left', display: 'flex', alignItems: isMobile ? 'center' : undefined, justifyContent: isMobile ? 'space-between' : undefined }}>
          {isTablet ? (
            <div style={{ fontSize: '16px', fontWeight: 800, whiteSpace: 'nowrap' }}>D<span style={{ color: colors.accent.green }}>F</span></div>
          ) : (
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.5px' }}>
                Digital<span style={{ color: colors.accent.green }}>Football</span>
              </div>
              <span style={{ background: colors.accent.green + alpha.soft, color: colors.accent.green, fontSize: '11px', fontWeight: 700, padding: '2px 10px', borderRadius: '20px', display: 'inline-block', marginTop: '8px' }}>Éducateur</span>
              {profil?.club && <p style={{ fontSize: '12px', color: colors.text.faint, margin: '8px 0 0' }}>{profil.club}</p>}
            </div>
          )}
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} title="Réduire le menu"
              style={{ background: 'transparent', border: 'none', color: colors.text.muted, cursor: 'pointer', padding: '6px', display: 'flex' }}>
              <IcoX />
            </button>
          )}
        </div>

        {!(isTablet && sidebarCollapsed) && <>
        <div style={{ padding: isTablet ? '0 8px' : '0 10px' }}>
          <button onClick={() => { setActiveSection('accueil'); setSidebarOpen(false) }} title={isTablet ? 'Accueil' : undefined}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: isTablet ? 'center' : 'flex-start', gap: '10px', padding: isTablet ? '10px 0' : '10px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: activeSection === 'accueil' ? '#60a5fa12' : 'transparent', color: activeSection === 'accueil' ? colors.accent.blue : colors.text.muted, fontSize: '13px', fontWeight: activeSection === 'accueil' ? 700 : 400, textAlign: 'left', fontFamily: 'Inter, sans-serif' }}>
            <span style={{ flexShrink: 0 }}><IcoHome /></span>{!isTablet && <span style={{ flex: 1 }}>Accueil</span>}
          </button>
        </div>

        <nav style={{ flex: 1, padding: isTablet ? '8px' : '8px 10px', overflowY: 'auto' }}>
          {sidebarSectionsVisibles.map(section => (
            <div key={section.titre}>
              {!isTablet && (
                <div style={{ color: colors.border.strong, fontSize: '10px', fontWeight: 800, letterSpacing: '1.5px', padding: '16px 12px 6px', textTransform: 'uppercase' }}>
                  {section.titre}
                </div>
              )}
              {section.items.map(item => (
                <button key={item.key} id={`nav-${item.key}`} onClick={() => { setActiveSection(item.key); setSidebarOpen(false) }} title={isTablet ? item.label : undefined}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: isTablet ? 'center' : 'flex-start', gap: '10px', padding: isTablet ? '10px 0' : '10px 12px', marginTop: isTablet ? '4px' : 0, borderRadius: '10px', border: 'none', cursor: 'pointer', background: activeSection === item.key ? '#60a5fa12' : 'transparent', color: activeSection === item.key ? colors.accent.blue : item.locked ? colors.border.strong : colors.text.muted, fontSize: '13px', fontWeight: activeSection === item.key ? 700 : 400, textAlign: 'left', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s', position: 'relative' }}>
                  <span style={{ flexShrink: 0 }}>{item.icon}</span>
                  {!isTablet && <span style={{ flex: 1 }}>{item.label}</span>}
                  {item.locked && !isTablet && <span style={{ fontSize: '12px', opacity: 0.4 }}>🔒</span>}
                  {activeSection === item.key && (
                    <div style={{ position: 'absolute', left: 0, top: '20%', height: '60%', width: '3px', background: colors.accent.blue, borderRadius: '0 3px 3px 0' }} />
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div style={{ borderTop: `1px solid ${colors.border.subtle}`, padding: isTablet ? '8px' : '8px 10px' }}>
          <button id="nav-profil" onClick={() => { setActiveSection('profil'); setSidebarOpen(false) }} title={isTablet ? t('nav_profil', lang) : undefined}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: isTablet ? 'center' : 'flex-start', gap: '10px', padding: isTablet ? '10px 0' : '10px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: activeSection === 'profil' ? '#60a5fa12' : 'transparent', color: activeSection === 'profil' ? colors.accent.blue : colors.text.muted, fontSize: '13px', fontWeight: activeSection === 'profil' ? 700 : 400, textAlign: 'left', fontFamily: 'Inter, sans-serif' }}>
            <span style={{ flexShrink: 0 }}><IcoUser /></span>{!isTablet && <span style={{ flex: 1 }}>{t('nav_profil', lang)}</span>}
          </button>
          {staffClub && !isTablet && (
            <button onClick={() => navigate('/club')}
              style={{ width: '100%', marginTop: '4px', padding: '8px 12px', background: colors.background.raised, border: '1px solid #60a5fa', borderRadius: '8px', color: colors.accent.blue, cursor: 'pointer', fontSize: '12px', textAlign: 'left' }}>
              🏢 Vue Club{staffClub.profiles?.club ? ` — ${staffClub.profiles.club}` : ''}
            </button>
          )}

          {/* ── Sélecteur de langue — masqué en tablette réduite, pas la place pour la grille de drapeaux ── */}
          {!isTablet && (
            <div style={{ padding: '8px 2px', borderTop: `1px solid ${colors.border.subtle}`, marginTop: '4px', marginBottom: '4px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {LANGS.map(l => (
                  <button key={l.code} onClick={() => setLang(l.code)}
                    title={l.label}
                    style={{
                      padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                      background: lang === l.code ? colors.accent.blue + alpha.soft : 'transparent',
                      outline: lang === l.code ? '1px solid #60a5fa40' : 'none',
                      fontSize: '14px', lineHeight: 1,
                    }}>
                    {l.flag}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
            <button onClick={() => { signOutSafe(); navigate('/') }} title={isTablet ? t('btn_deconnexion', lang) : undefined}
              style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center', background: 'transparent', color: colors.text.faint, border: `1px solid ${colors.border.faint}`, padding: isTablet ? '8px 0' : '8px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', textAlign: 'left' }}>
              {isTablet ? <IcoLogOut /> : t('btn_deconnexion', lang)}
            </button>
            <ThemeToggleButton style={{ border: `1px solid ${colors.border.faint}` }} />
          </div>
        </div>
        </>}
      </aside>

      <div style={{ flex: 1, minWidth: 0, maxWidth: educateurIdOverride ? 'none' : (activeSection === 'accueil' ? '1600px' : '1400px'), margin: '0 auto', padding: isMobile ? '16px 14px' : '1.25rem 2rem', paddingTop: isMobile ? 'calc(16px + env(safe-area-inset-top, 0px))' : '1.25rem' }}>

        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', marginLeft: '-12px' }}>
            <button onClick={() => setSidebarOpen(true)}
              style={{
                padding: '12px', minWidth: '48px', minHeight: '48px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '8px',
              }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <span style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '-0.5px' }}>
              Digital<span style={{ color: colors.accent.green }}>Football</span>
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: colors.accent.blue, color: colors.background.base, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, marginRight: '2px' }}>
              {profil?.prenom?.[0] || profil?.nom?.[0] || 'E'}
            </div>
          </div>
        )}

        {/* ===== ACCUEIL ===== */}
        {activeSection === 'accueil' && (
          <>
            {equipementPretEduc && (
              <div style={{ ...st.card, marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: 800, color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '1px' }}>Alertes</p>
                <button onClick={() => setActiveSection('materiel')} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: colors.background.raised, border: 'none', borderRadius: '10px', cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'Inter, sans-serif' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.accent.amber, flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: '13px', color: colors.text.primary }}>Ton équipement est prêt</p>
                </button>
              </div>
            )}
            <AccueilEducateur
              clubId={clubAffiliation?.club_id}
              userId={userId}
              joueurs={joueurs}
              entrainements={entrainements}
              matchs={matchs}
              dispoJoueurs={dispoJoueurs}
              rapportsRecents={rapportsRecents}
              setActiveSection={setActiveSection}
              setSousOngletEnt={setSousOngletEnt}
              setStatsSubTab={setStatsSubTab}
              lang={lang}
              isMobile={isMobile}
              mesSeancesOuvertes={mesSeancesOuvertes}
            />
          </>
        )}

        {/* ===== MON ÉQUIPE ===== */}
        {activeSection === 'equipe' && (
          <>
            {/* Déclaration obligatoire de la catégorie/équipe gérée, à la première
                visite de cet onglet (affilié à un club, aucune ligne club_categories
                assignée à cet éducateur pour l'instant) — un dashboard educateur =
                une équipe, cf. declarerMaCategorie. Non dismissable : tant que ce
                n'est pas répondu, les nouveaux joueurs n'auraient nulle part où
                s'auto-rattacher. */}
            {clubCategoriesChargees && clubAffiliation?.statut === 'accepte' && !monCategorieClub && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div style={{ background: colors.background.base, border: `1px solid ${colors.border.subtle}`, borderRadius: '20px', width: '100%', maxWidth: '420px', padding: '28px' }}>
                  <p style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '17px' }}>Quelle catégorie et équipe gères-tu ?</p>
                  <p style={{ margin: '0 0 20px', fontSize: '13px', color: colors.text.faint }}>
                    Nécessaire une seule fois : tes prochains joueurs ajoutés seront ensuite rattachés automatiquement, sans avoir à le refaire à chaque fois.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                    <div>
                      <label style={st.label}>{t('equipe_categorie', lang)}</label>
                      <select style={st.input} value={promptCategorieForm.nom} onChange={e => setPromptCategorieForm(p => ({ ...p, nom: e.target.value }))}>
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={st.label}>{t('club_equipe_label', lang)}</label>
                      <select style={st.input} value={promptCategorieForm.equipe} onChange={e => setPromptCategorieForm(p => ({ ...p, equipe: e.target.value }))}>
                        {['A', 'B'].map(e => <option key={e}>{e}</option>)}
                      </select>
                    </div>
                  </div>
                  <button onClick={declarerMaCategorie} disabled={savingCategorieClub} style={{ ...st.btnSolid, width: '100%' }}>
                    {savingCategorieClub ? 'Enregistrement...' : 'Confirmer'}
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>{t('equipe_titre', lang)}</h1>
                <p style={{ color: colors.text.faint, fontSize: '13px', margin: '4px 0 0' }}>{joueurs.length} {t('equipe_joueurs', lang)} {t('equipe_dans_effectif', lang)}</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Toggle vue */}
                <div style={{ display: 'flex', background: colors.background.raised, borderRadius: '8px', padding: '3px', gap: '2px' }}>
                  {[['poste',`⊞ ${t('equipe_vue_postes', lang)}`],['liste',`☰ ${t('equipe_vue_liste', lang)}`]].map(([v, label]) => (
                    <button key={v} onClick={() => setVueEquipe(v)}
                      style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif', background: vueEquipe === v ? colors.accent.blue : 'transparent', color: vueEquipe === v ? colors.black : colors.text.faint, transition: 'all 0.15s' }}>
                      {label}
                    </button>
                  ))}
                </div>
                <button onClick={telechargerTemplate} style={st.btn(colors.accent.blue)} title={t('equipe_telecharger_modele', lang)}>{t('equipe_template', lang)}</button>
                {canEdit('effectif') && (
                  <>
                    <button onClick={() => importRef.current?.click()} style={st.btn(colors.accent.purpleLight)}>{t('equipe_importer_excel_csv', lang)}</button>
                    <input ref={importRef} type="file" accept=".xlsx,.xls,.csv,.numbers" style={{ display: 'none' }} onChange={handleImportFile} />
                    <button onClick={() => setShowAddJoueur(true)} style={st.btnSolid}>+ {t('equipe_ajouter', lang)}</button>
                  </>
                )}
              </div>
            </div>

            {permissions?.effectif === 'lecture' && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: colors.accent.blue + alpha.subtle, border: '1px solid #60a5fa30', color: colors.accent.blue, fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, marginBottom: 16 }}>
                👁 {t('equipe_mode_lecture', lang)}
              </div>
            )}

            {/* ── Calendrier de la semaine ── */}
            {(() => {
              const aujourdHui = new Date().toISOString().split('T')[0]
              const dans7jours = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
              const events = [
                ...entrainements.filter(e => e.date >= aujourdHui && e.date <= dans7jours).map(e => ({ type: 'entrainement', id: e.id, date: e.date, heure: e.heure, sondage_clos: e.sondage_clos, titre: e.description || t('ent_seance_generique', lang) })),
                ...matchs.filter(m => m.date >= aujourdHui && m.date <= dans7jours).map(m => ({ type: 'match', id: m.id, date: m.date, titre: m.adversaire ? `⚽ ${t('ent_vs', lang)} ${m.adversaire}` : t('ent_match_generique', lang) })),
              ].sort((a, b) => new Date(a.date) - new Date(b.date))

              if (events.length === 0) return null
              return (
                <div style={{ ...st.card, marginBottom: '16px' }}>
                  <p style={{ fontWeight: 800, fontSize: '14px', marginBottom: '16px' }}>📅 {t('ent_cette_semaine', lang)}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {events.map((ev, i) => {
                      const date = new Date(ev.date + 'T12:00:00')
                      const isToday = date.toDateString() === new Date().toDateString()
                      const isTomorrow = date.toDateString() === new Date(Date.now() + 86400000).toDateString()
                      const labelJour = isToday ? t('aff_aujourdhui', lang) : isTomorrow ? t('aff_demain', lang) : date.toLocaleDateString(localeOf(lang), { weekday: 'long', day: 'numeric', month: 'short' })
                      return (
                        <div key={i}
                          style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', background: isToday ? colors.accent.green + alpha.faint : colors.background.surfaceAlt, border: `1px solid ${isToday ? '#4ade8025' : colors.border.faint}`, borderRadius: '10px', cursor: ev.type === 'entrainement' ? 'pointer' : 'default' }}
                          onClick={() => { if (ev.type === 'entrainement') { setActiveSection('entrainements'); setSousOngletEnt('prochaine') } }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, background: ev.type === 'match' ? colors.accent.blue + alpha.subtle : 'rgba(96,165,250,0.06)', border: `1px solid ${ev.type === 'match' ? colors.accent.blue + alpha.light : 'rgba(96,165,250,0.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                            {ev.type === 'match' ? '⚽' : '🏃'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 700, fontSize: '13px', marginBottom: '2px' }}>{ev.titre}</p>
                            <p style={{ fontSize: '11px', color: colors.text.faint }}>{labelJour}{ev.heure ? ` · ${ev.heure}` : ''}</p>
                          </div>
                          {ev.type === 'entrainement' && (
                            <span style={{ fontSize: '10px', fontWeight: 700, color: ev.sondage_clos ? colors.accent.red : colors.accent.green, background: ev.sondage_clos ? colors.accent.red + alpha.subtle : colors.accent.green + alpha.subtle, border: `1px solid ${ev.sondage_clos ? colors.accent.red + alpha.light : colors.accent.green + alpha.light}`, borderRadius: '20px', padding: '2px 8px' }}>
                              {ev.sondage_clos ? t('ent_sondage_clos', lang) : t('ent_sondage_ouvert', lang)}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            {/* ── Groupe équipe (WhatsApp/Discord/Slack) ── */}
            {profilEdu?.lien_groupe ? (
              <div style={{ background: colors.background.sunken, border: `1px solid ${colors.border.subtle}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
                <p style={{ margin: '0 0 8px', fontSize: 11, color: colors.text.faint, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{t('equipe_groupe', lang)}</p>
                <a href={profilEdu.lien_groupe} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, background: colors.accent.blue + alpha.subtle, border: `1px solid ${colors.accent.blue}`, borderRadius: 10, padding: '10px 14px', textDecoration: 'none', color: colors.accent.blue, fontWeight: 700, fontSize: 13 }}>
                  💬 {t('equipe_ouvrir_groupe', lang)}
                </a>
                <button onClick={() => supabase.from('profil_educateur').update({ lien_groupe: null }).eq('user_id', userId).then(() => chargerProfilEdu(userId))}
                  style={{ marginTop: 8, fontSize: 11, color: colors.text.faint, background: 'none', border: 'none', cursor: 'pointer' }}>
                  {t('equipe_modifier_lien', lang)}
                </button>
              </div>
            ) : (
              <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
                <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700 }}>💬 {t('equipe_groupe', lang)}</p>
                <p style={{ margin: '0 0 12px', fontSize: 12, color: colors.text.faint }}>{t('equipe_colle_lien_groupe', lang)}</p>
                <input
                  placeholder="https://chat.whatsapp.com/..."
                  value={lienGroupe}
                  onChange={e => setLienGroupe(e.target.value)}
                  style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '9px 12px', color: colors.text.primary, fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none', marginBottom: 8, boxSizing: 'border-box' }}
                />
                <button onClick={async () => {
                  await supabase.from('profil_educateur').update({ lien_groupe: lienGroupe }).eq('user_id', userId)
                  await chargerProfilEdu(userId)
                }}
                  style={{ background: colors.accent.blue, color: colors.black, border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  {t('btn_sauvegarder', lang)}
                </button>
              </div>
            )}

            {/* ── Modal profil joueur ── */}
            {joueurProfil && (() => {
              const j = joueurProfil
              const tx = tauxPresence(j.id)
              const s = statsGlobalesJoueur(j.id)
              const ln = getLocalNote(j.id)
              const age = j.date_naissance ? Math.floor((new Date() - new Date(j.date_naissance)) / (365.25 * 24 * 3600 * 1000)) : null
              const noteGlobale = (ln.technique || ln.physique || ln.mental || ln.tactique)
                ? ((ln.technique + ln.physique + ln.mental + ln.tactique) / 4).toFixed(1) : null
              const posColor = j.poste?.toLowerCase().includes('gardien') ? '#f59e0b' : j.poste && ['défenseur','defenseur','latéral','lateral'].some(k => j.poste.toLowerCase().includes(k)) ? colors.accent.blue : j.poste?.toLowerCase().includes('milieu') ? colors.accent.purpleLight : colors.accent.green
              return (
                <div style={{ position: 'fixed', inset: 0, background: colors.background.overlay, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setJoueurProfil(null)}>
                  <div style={{ background: colors.background.sunken, border: `1px solid ${colors.border.subtle}`, borderRadius: '20px', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>

                    {/* Header */}
                    <div style={{ background: `linear-gradient(135deg, ${posColor}15, transparent)`, borderBottom: `1px solid ${colors.border.subtle}`, padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: posColor + '25', border: `2px solid ${posColor}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: posColor, fontWeight: 800, fontSize: '20px', flexShrink: 0 }}>
                        {j.numero_maillot || `${j.prenom?.[0] || ''}${j.nom?.[0] || ''}`}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>{j.prenom} {j.nom}</h2>
                        <p style={{ margin: '4px 0 0', color: posColor, fontSize: '13px', fontWeight: 600 }}>{j.poste || '—'}{age ? ` · ${age} ans` : ''}{j.categorie ? ` · ${j.categorie}` : ''}</p>
                        {j.numero_licence && <span style={{ fontSize: '11px', color: colors.accent.blue, background: colors.accent.blue + alpha.subtle, padding: '2px 8px', borderRadius: '10px', marginTop: '4px', display: 'inline-block' }}>🪪 Licencié {j.numero_licence}</span>}
                      </div>
                      {noteGlobale && <div style={{ textAlign: 'center' }}><p style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: colors.accent.amber }}>{noteGlobale}</p><p style={{ margin: 0, fontSize: '10px', color: colors.text.faint }}>NOTE ÉDU.</p></div>}
                      <button onClick={() => setJoueurProfil(null)} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '22px', cursor: 'pointer', padding: '4px', flexShrink: 0 }}>✕</button>
                    </div>

                    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                      {blocInvitationJoueur(j)}

                      {/* Présence - Donut multi + stats */}
                      <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '1.25rem' }}>
                        <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: '14px' }}>🏃 {t('equipe_presence_entrainements', lang)}</p>
                        {tx ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                            <DonutMulti presents={tx.presents} absents={tx.absents} blesses={tx.blesses} malade={tx.malade} convoque={tx.convoque} size={110} />
                            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px' }}>
                              {[
                                { emoji: '✅', label: t('ent_present', lang), val: tx.presents, color: colors.accent.green },
                                { emoji: '🏆', label: t('ent_convoque', lang), val: tx.convoque, color: colors.accent.blue },
                                { emoji: '❌', label: t('ent_absent', lang), val: tx.absents, color: colors.accent.red },
                                { emoji: '🤕', label: t('ent_blesse', lang), val: tx.blesses, color: colors.accent.orange },
                                { emoji: '🤒', label: t('ent_malade', lang), val: tx.malade, color: colors.accent.purple },
                                { emoji: '📅', label: t('nav_seances', lang), val: tx.total, color: colors.text.primary },
                              ].map(s => (
                                <div key={s.label} style={{ background: colors.background.base, borderRadius: '8px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12px', color: colors.text.faint }}>{s.emoji} {s.label}</span>
                                  <span style={{ fontWeight: 700, color: s.color, fontSize: '14px' }}>{s.val}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : <p style={{ color: colors.border.strong, fontSize: '13px', margin: 0 }}>{t('equipe_aucune_presence', lang)}</p>}
                      </div>

                      {/* Évaluations - Radial skills */}
                      {(ln.technique || ln.physique || ln.mental || ln.tactique) ? (
                        <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '1.25rem' }}>
                          <p style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '14px' }}>⭐ {t('equipe_evaluation_educateur', lang)}</p>
                          <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '12px' }}>
                            <RadialSkill value={ln.technique} color={colors.accent.green} label={t('eval_technique', lang)} size={90} />
                            <RadialSkill value={ln.physique} color={colors.accent.blue} label={t('eval_physique', lang)} size={90} />
                            <RadialSkill value={ln.mental} color={colors.accent.purpleLight} label={t('eval_mental', lang)} size={90} />
                            <RadialSkill value={ln.tactique} color={colors.accent.amber} label={t('eval_tactique', lang)} size={90} />
                          </div>
                          {ln.commentaire && <p style={{ margin: '14px 0 0', fontSize: '13px', color: colors.text.secondary, background: colors.background.base, borderRadius: '8px', padding: '10px 14px', fontStyle: 'italic' }}>"{ln.commentaire}"</p>}
                        </div>
                      ) : null}

                      {/* Stats matchs */}
                      {s.matchs > 0 && (() => {
                        const rang = (getVal) => {
                          const myVal = getVal(j.id)
                          if (!myVal) return null
                          const vals = joueurs.map(jj => getVal(jj.id))
                          const better = vals.filter(v => v > myVal).length
                          const rank = better + 1
                          const isTie = vals.filter(v => v === myVal).length > 1
                          const label = rank === 1 ? '1er' : `${rank}ème`
                          return `${label}${isTie ? ' ex æquo' : ''}`
                        }
                        const rangStats = [
                          { emoji: '🏆', label: 'Victoires', val: s.victoires, rang: rang(id => statsGlobalesJoueur(id).victoires), color: colors.accent.amber },
                          { emoji: '⚽', label: 'Buteur', val: s.buts, rang: rang(id => statsGlobalesJoueur(id).buts), color: colors.accent.green },
                          { emoji: '🎯', label: 'Passeur', val: s.passes_dec, rang: rang(id => statsGlobalesJoueur(id).passes_dec), color: colors.accent.blue },
                          { emoji: '🧤', label: 'Clean Sheet', val: s.clean_sheets, rang: rang(id => statsGlobalesJoueur(id).clean_sheets), color: colors.accent.purpleLight },
                          { emoji: '⏱️', label: 'Temps de jeu', val: `${s.minutes}'`, rang: rang(id => statsGlobalesJoueur(id).minutes), color: '#f59e0b' },
                          { emoji: '🏃', label: 'Présence entr.', val: tx ? `${tx.taux}%` : '—', rang: rang(id => tauxPresence(id)?.taux || 0), color: colors.accent.green },
                        ]
                        return (
                          <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '1.25rem' }}>
                            <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: '14px' }}>⚽ {t('equipe_stats_matchs', lang)}</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '8px', marginBottom: '16px' }}>
                              {[
                                { label: 'Matchs', val: s.matchs, color: colors.text.primary },
                                { label: 'Victoires', val: s.victoires, color: colors.accent.amber },
                                { label: 'Minutes', val: `${s.minutes}'`, color: colors.text.primary },
                                { label: 'Buts', val: s.buts, color: colors.accent.green },
                                { label: 'Passes D.', val: s.passes_dec, color: colors.accent.blue },
                                { label: 'Clean S.', val: s.clean_sheets, color: colors.accent.purpleLight },
                                { label: '🟨', val: s.cartons_j, color: '#f59e0b' },
                                { label: '🟥', val: s.cartons_r, color: colors.accent.red },
                              ].map(c => (
                                <div key={c.label} style={{ background: colors.background.base, borderRadius: '8px', padding: '10px 8px', textAlign: 'center' }}>
                                  <p style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: c.color }}>{c.val}</p>
                                  <p style={{ margin: '3px 0 0', fontSize: '10px', color: colors.text.faint, textTransform: 'uppercase' }}>{c.label}</p>
                                </div>
                              ))}
                            </div>
                            {/* Classements dans l'équipe */}
                            <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '12px', color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.5px' }}>🏅 {t('equipe_classements_equipe', lang)}</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {rangStats.filter(r => r.rang).map(r => (
                                <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', background: colors.background.base, borderRadius: '8px' }}>
                                  <span style={{ fontSize: '14px', width: '22px' }}>{r.emoji}</span>
                                  <span style={{ fontSize: '12px', color: colors.text.faint, flex: 1 }}>{r.label}</span>
                                  <span style={{ fontSize: '12px', fontWeight: 700, color: colors.text.secondary }}>{r.val}</span>
                                  <span style={{ fontSize: '12px', fontWeight: 800, color: r.rang.startsWith('1er') ? colors.accent.amber : r.rang.startsWith('2') ? '#9ca3af' : r.rang.startsWith('3') ? '#d97706' : colors.text.faint, background: colors.background.surface, padding: '2px 8px', borderRadius: '10px' }}>{r.rang}</span>
                                </div>
                              ))}
                            </div>

                            {/* Joueur du mois */}
                            {(() => {
                              const palmares = []
                              const totalPts = {}
                              entrainements.forEach(e => {
                                const dateStr = e.date || e.created_at
                                if (!dateStr) return
                                const d = new Date(dateStr)
                                const moisKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                                ;(e.presences_entrainement || []).forEach(p => {
                                  if (!p.point_seance) return
                                  if (!totalPts[moisKey]) totalPts[moisKey] = {}
                                  totalPts[moisKey][p.joueur_id] = (totalPts[moisKey][p.joueur_id] || 0) + 1
                                })
                              })
                              Object.entries(totalPts).sort().reverse().forEach(([moisKey, pts]) => {
                                const maxPts = Math.max(...Object.values(pts))
                                const winners = Object.entries(pts).filter(([, v]) => v === maxPts).map(([jid]) => jid)
                                if (winners.includes(j.id)) {
                                  const [y, m] = moisKey.split('-')
                                  palmares.push({ label: new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }), pts: maxPts, tie: winners.length > 1 })
                                }
                              })
                              if (!palmares.length) return null
                              return (
                                <div style={{ marginTop: '12px' }}>
                                  <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: '12px', color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.5px' }}>🌟 {t('equipe_joueur_du_mois', lang)}</p>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {palmares.map((p, i) => (
                                      <span key={i} style={{ background: colors.accent.amber + alpha.subtle, border: '1px solid #fbbf2440', color: colors.accent.amber, fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px' }}>
                                        🥇 {p.label}{p.tie ? ' (ex æquo)' : ''} · {p.pts}⭐
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )
                            })()}
                          </div>
                        )
                      })()}

                      {canEdit('effectif') && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => { setJoueurEnEdition({ ...j }); setJoueurProfil(null) }} style={{ background: colors.accent.blue + alpha.subtle, border: '1px solid #60a5fa30', color: colors.accent.blue, padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>✏️ {t('tactic_modifier_infos', lang)}</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* ── Modal édition joueur ── */}
            {joueurEnEdition && (
              <div style={{ position: 'fixed', inset: 0, background: '#000000aa', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: '16px' }}>✏️ Modifier {joueurEnEdition.prenom} {joueurEnEdition.nom}</p>
                    <button onClick={() => setJoueurEnEdition(null)} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '20px', cursor: 'pointer' }}>✕</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div><label style={st.label}>{t('equipe_prenom', lang)}</label><input style={st.input} value={joueurEnEdition.prenom || ''} onChange={e => setJoueurEnEdition(p => ({ ...p, prenom: e.target.value }))} /></div>
                    <div><label style={st.label}>{t('equipe_nom', lang)}</label><input style={st.input} value={joueurEnEdition.nom || ''} onChange={e => setJoueurEnEdition(p => ({ ...p, nom: e.target.value }))} /></div>
                    <div>
                      <label style={st.label}>{t('equipe_poste', lang)}</label>
                      <select style={st.input} value={joueurEnEdition.poste || ''} onChange={e => setJoueurEnEdition(p => ({ ...p, poste: e.target.value }))}>
                        <option value="">{t('equipe_choisir', lang)}</option>
                        {postes.map(po => <option key={po}>{po}</option>)}
                      </select>
                    </div>
                    <div><label style={st.label}>{t('equipe_numero', lang)}</label><input style={st.input} type="number" value={joueurEnEdition.numero_maillot || ''} onChange={e => setJoueurEnEdition(p => ({ ...p, numero_maillot: e.target.value }))} /></div>
                    <div><label style={st.label}>{t('equipe_date_naissance', lang)}</label><input style={st.input} type="date" value={joueurEnEdition.date_naissance || ''} onChange={e => setJoueurEnEdition(p => ({ ...p, date_naissance: e.target.value }))} /></div>
                    <div><label style={st.label}>{t('equipe_categorie', lang)}</label><input style={st.input} placeholder="U17, U18..." value={joueurEnEdition.categorie || ''} onChange={e => setJoueurEnEdition(p => ({ ...p, categorie: e.target.value }))} /></div>
                    <div style={{ gridColumn: '1 / -1' }}><label style={st.label}>{t('equipe_licence_fff', lang)}</label><input style={st.input} placeholder={t('equipe_numero_licence', lang)} value={joueurEnEdition.numero_licence || ''} onChange={e => setJoueurEnEdition(p => ({ ...p, numero_licence: e.target.value }))} /></div>
                    {clubCategories.length > 0 && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={st.label}>{t('equipe_categorie_club', lang)}</label>
                        <select style={st.input} value={joueurEnEdition.club_categorie_id || ''} onChange={e => setJoueurEnEdition(p => ({ ...p, club_categorie_id: e.target.value }))}>
                          <option value="">{t('equipe_non_assigne', lang)}</option>
                          {clubCategories.map(c => <option key={c.id} value={c.id}>{c.nom} — Équipe {c.equipe}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={sauvegarderJoueur} disabled={savingEdit} style={st.btnSolid}>{savingEdit ? 'Sauvegarde...' : `💾 ${t('btn_sauvegarder', lang)}`}</button>
                    <button onClick={() => setJoueurEnEdition(null)} style={st.btn(colors.text.dim)}>{t('btn_annuler', lang)}</button>
                  </div>
                </div>
              </div>
            )}

            {importError && (
              <div style={{ background: '#f8717115', border: '1px solid #f8717140', borderRadius: '10px', padding: '12px 16px', marginBottom: '1rem', color: '#f87171', fontSize: '13px' }}>
                ⚠️ {importError}
              </div>
            )}

            {/* ── Modal prévisualisation import ── */}
            {importPreview && (
              <div style={{ ...st.card, border: '1px solid #a78bfa40', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, color: colors.accent.purpleLight, fontSize: '15px' }}>📂 {importPreview.rows.length} joueur{importPreview.rows.length > 1 ? 's' : ''} détecté{importPreview.rows.length > 1 ? 's' : ''}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: colors.text.faint }}>{t('equipe_verifie_donnees', lang)}</p>
                  </div>
                  {!importPreview.importing && (
                    <button onClick={() => setImportPreview(null)} style={{ background: 'none', border: 'none', color: colors.text.faint, cursor: 'pointer', fontSize: '18px' }}>✕</button>
                  )}
                </div>

                {/* Table de prévisualisation */}
                <div style={{ overflow: 'auto', marginBottom: '1rem', maxHeight: '260px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${colors.border.default}` }}>
                        {[t('equipe_prenom', lang), t('equipe_nom', lang), t('equipe_poste', lang), t('equipe_categorie', lang), t('equipe_col_maillot', lang), t('equipe_col_naissance', lang), t('equipe_col_licence', lang)].map(h => (
                          <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: colors.text.faint, fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.rows.map((r, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${colors.border.subtle}`, background: i < importPreview.done ? colors.accent.green + alpha.faint : 'transparent' }}>
                          <td style={{ padding: '7px 10px', fontWeight: 600, color: i < importPreview.done ? colors.accent.green : colors.text.primary }}>{r.prenom}</td>
                          <td style={{ padding: '7px 10px', color: i < importPreview.done ? colors.accent.green : colors.text.primary }}>{r.nom}</td>
                          <td style={{ padding: '7px 10px', color: colors.text.secondary }}>{r.poste || '—'}</td>
                          <td style={{ padding: '7px 10px', color: colors.text.secondary }}>{r.categorie || '—'}</td>
                          <td style={{ padding: '7px 10px', color: colors.text.secondary }}>{r.numero_maillot || '—'}</td>
                          <td style={{ padding: '7px 10px', color: colors.text.secondary }}>{r.date_naissance || '—'}</td>
                          <td style={{ padding: '7px 10px', color: colors.text.secondary }}>{r.numero_licence || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {importPreview.importing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ flex: 1, background: colors.background.raised, borderRadius: '6px', height: '8px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: colors.accent.green, width: `${(importPreview.done / importPreview.rows.length) * 100}%`, transition: 'width 0.3s', borderRadius: '6px' }} />
                    </div>
                    <span style={{ fontSize: '13px', color: colors.accent.green, fontWeight: 700, flexShrink: 0 }}>{importPreview.done}/{importPreview.rows.length}</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={confirmerImport} style={st.btnSolid}>Importer {importPreview.rows.length} joueur{importPreview.rows.length > 1 ? 's' : ''}</button>
                    <button onClick={() => setImportPreview(null)} style={st.btn(colors.text.dim)}>{t('btn_annuler', lang)}</button>
                  </div>
                )}
              </div>
            )}

            {showAddJoueur && (
              <div style={{ ...st.card, border: '1px solid #4ade8030', marginBottom: '1.5rem' }}>
                <p style={{ fontWeight: 700, marginBottom: '1rem', color: colors.accent.green }}>{t('equipe_nouveau_joueur', lang)}</p>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
                  <div><label style={st.label}>{t('equipe_prenom', lang)} *</label><input style={st.input} value={newJoueur.prenom} onChange={e => setNewJoueur({ ...newJoueur, prenom: e.target.value })} /></div>
                  <div><label style={st.label}>{t('equipe_nom', lang)} *</label><input style={st.input} value={newJoueur.nom} onChange={e => setNewJoueur({ ...newJoueur, nom: e.target.value })} /></div>
                  <div><label style={st.label}>{t('equipe_numero', lang)}</label><input style={st.input} type="number" value={newJoueur.numero_maillot} onChange={e => setNewJoueur({ ...newJoueur, numero_maillot: e.target.value })} /></div>
                  <div>
                    <label style={st.label}>{t('equipe_poste', lang)}</label>
                    <select style={st.input} value={newJoueur.poste} onChange={e => setNewJoueur({ ...newJoueur, poste: e.target.value })}>
                      <option value="">{t('equipe_choisir', lang)}</option>
                      {postes.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div><label style={st.label}>{t('equipe_date_naissance', lang)}</label><input style={st.input} type="date" value={newJoueur.date_naissance} onChange={e => setNewJoueur({ ...newJoueur, date_naissance: e.target.value })} /></div>
                  <div><label style={st.label}>{t('equipe_licence_fff', lang)}</label><input style={st.input} placeholder={t('equipe_numero_licence', lang)} value={newJoueur.numero_licence} onChange={e => setNewJoueur({ ...newJoueur, numero_licence: e.target.value })} /></div>
                </div>
                {monCategorieClub && (
                  <p style={{ margin: '0 0 12px', fontSize: '12px', color: colors.text.faint }}>
                    Sera automatiquement rattaché à {monCategorieClub.nom} — Équipe {monCategorieClub.equipe}.
                  </p>
                )}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={ajouterJoueur} disabled={savingJoueur || !newJoueur.prenom || !newJoueur.nom} style={st.btnSolid}>{savingJoueur ? 'Ajout...' : t('btn_ajouter', lang)}</button>
                  <button onClick={() => setShowAddJoueur(false)} style={st.btn(colors.text.dim)}>{t('btn_annuler', lang)}</button>
                </div>
              </div>
            )}

            {joueurs.length === 0 ? (
              <div style={{ ...st.card, textAlign: 'center', padding: '4rem' }}>
                <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</p>
                <p style={{ color: colors.text.faint }}>{t('equipe_aucun_joueur_effectif', lang)}</p>
              </div>
            ) : vueEquipe === 'liste' ? (
              <div style={{ ...st.card, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${colors.border.subtle}` }}>
                      {['#', t('equipe_col_joueur', lang), t('equipe_poste', lang), t('equipe_col_age', lang), t('equipe_col_licence', lang), ''].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: colors.text.faint, fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...joueurs]
                      .sort((a, b) => {
                        const ordre = ['Gardien','Défenseur central','Latéral droit','Latéral gauche','Milieu défensif','Milieu central','Milieu offensif','Ailier droit','Ailier gauche','Attaquant']
                        return (ordre.indexOf(a.poste) === -1 ? 99 : ordre.indexOf(a.poste)) - (ordre.indexOf(b.poste) === -1 ? 99 : ordre.indexOf(b.poste))
                      })
                      .map((j, i) => {
                        const age = j.date_naissance ? Math.floor((new Date() - new Date(j.date_naissance)) / (365.25 * 24 * 3600 * 1000)) : null
                        const tx = tauxPresence(j.id)
                        const posColor = j.poste?.toLowerCase().includes('gardien') ? '#f59e0b' : j.poste && ['défenseur','defenseur','latéral','lateral'].some(k => j.poste.toLowerCase().includes(k)) ? colors.accent.blue : j.poste?.toLowerCase().includes('milieu') ? colors.accent.purpleLight : j.poste && ['attaquant','ailier'].some(k => j.poste.toLowerCase().includes(k)) ? colors.accent.green : colors.text.faint
                        return (
                          <tr key={j.id} style={{ borderBottom: '1px solid #0f0f0f' }}>
                            <td style={{ padding: '10px 12px', color: colors.text.faint, fontWeight: 700, width: '36px' }}>{j.numero_maillot || '—'}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 700 }}>{j.prenom} {j.nom}</td>
                            <td style={{ padding: '10px 12px' }}><span style={{ color: posColor, fontSize: '12px' }}>{j.poste || '—'}</span></td>
                            <td style={{ padding: '10px 12px', color: colors.text.faint, fontSize: '12px' }}>{age ? `${age} ans` : '—'}</td>
                            <td style={{ padding: '10px 12px' }}>{j.numero_licence ? <span style={{ color: colors.accent.blue, fontSize: '11px', fontWeight: 700 }}>🪪</span> : <span style={{ color: colors.border.strong, fontSize: '11px' }}>—</span>}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                {j.joueur_id ? (
                                  <span title="Compte lié" style={{ color: colors.accent.green, fontSize: 12 }}>✅</span>
                                ) : j.email ? (
                                  <span title={`Invitation envoyée · ${j.email}`} style={{ color: '#facc15', fontSize: 12 }}>✉️</span>
                                ) : (
                                  <button
                                    onClick={e => { e.stopPropagation(); setJoueurProfil(j) }}
                                    title="Inviter ce joueur"
                                    style={{ background: 'none', border: `1px solid ${colors.border.default}`, borderRadius: 4,
                                             color: colors.text.muted, fontSize: 11, padding: '2px 6px', cursor: 'pointer' }}
                                  >
                                    +
                                  </button>
                                )}
                                <button onClick={() => setJoueurProfil(j)} style={{ background: colors.accent.blue + alpha.subtle, border: '1px solid #60a5fa30', color: colors.accent.blue, borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'Inter,sans-serif' }}>👤 {t('equipe_profil', lang)}</button>
                                {canEdit('effectif') && (
                                  <>
                                    <button onClick={() => setJoueurEnEdition({ ...j })} style={{ background: '#ffffff08', border: `1px solid ${colors.border.default}`, color: colors.text.secondary, borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', fontSize: '12px' }}>✏️</button>
                                    <button onClick={() => supprimerJoueur(j.id)} style={{ background: 'none', border: 'none', color: colors.border.strong, cursor: 'pointer', fontSize: '14px' }}>✕</button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {[
                  { label: `🧤 ${t('stats_pres_gardiens', lang)}`, color: '#f59e0b', match: p => p?.toLowerCase().includes('gardien') },
                  { label: `🛡️ ${t('stats_pres_defenseurs', lang)}`, color: colors.accent.blue, match: p => p && ['défenseur','defenseur','latéral','lateral'].some(k => p.toLowerCase().includes(k)) },
                  { label: `⚙️ ${t('stats_pres_milieux', lang)}`, color: colors.accent.purpleLight, match: p => p?.toLowerCase().includes('milieu') },
                  { label: `⚡ ${t('stats_pres_attaquants', lang)}`, color: colors.accent.green, match: p => p && ['attaquant','ailier'].some(k => p.toLowerCase().includes(k)) },
                  { label: '❓ Sans poste', color: colors.text.faint, match: p => !p || !['gardien','défenseur','defenseur','latéral','lateral','milieu','attaquant','ailier'].some(k => p.toLowerCase().includes(k)) },
                ].map(groupe => {
                  const groupJoueurs = joueurs.filter(j => groupe.match(j.poste))
                  if (!groupJoueurs.length) return null
                  return (
                    <div key={groupe.label}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: groupe.color }}>{groupe.label}</h2>
                        <span style={{ fontSize: '12px', color: colors.text.disabled, background: colors.background.raised, padding: '2px 8px', borderRadius: '20px' }}>{groupJoueurs.length} joueur{groupJoueurs.length > 1 ? 's' : ''}</span>
                        <div style={{ flex: 1, height: '1px', background: groupe.color + '20' }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                        {groupJoueurs.map(j => {
                          const age = j.date_naissance ? Math.floor((new Date() - new Date(j.date_naissance)) / (365.25 * 24 * 3600 * 1000)) : null
                          const tx = tauxPresence(j.id)
                          return (
                            <div key={j.id} style={{ ...st.card, cursor: 'pointer', borderLeft: `3px solid ${groupe.color}30`, transition: 'border-color 0.2s', borderColor: joueurActif?.id === j.id ? groupe.color + '60' : undefined }} onClick={() => setJoueurActif(joueurActif?.id === j.id ? null : j)}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                {j.numero_maillot ? (
                                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: groupe.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', color: groupe.color, fontWeight: 800, fontSize: '13px', flexShrink: 0 }}>
                                    {j.numero_maillot}
                                  </div>
                                ) : (
                                  <Avatar person={j} size={40} bg={groupe.color + '20'} border="none" textColor={groupe.color} />
                                )}
                                <div style={{ flex: 1 }}>
                                  <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{j.prenom} {j.nom}</p>
                                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.faint }}>{j.poste || '—'}{age ? ` · ${age} ans` : ''}</p>
                                </div>
                                {canEdit('effectif') && (
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    <button onClick={e => { e.stopPropagation(); setJoueurEnEdition({ ...j }) }} style={{ background: colors.accent.blue + alpha.subtle, border: '1px solid #60a5fa30', color: colors.accent.blue, borderRadius: '6px', padding: '3px 7px', cursor: 'pointer', fontSize: '11px' }}>✏️</button>
                                    <button onClick={e => { e.stopPropagation(); supprimerJoueur(j.id) }} style={{ background: 'none', border: 'none', color: colors.border.strong, cursor: 'pointer', fontSize: '14px', padding: '4px' }}>✕</button>
                                  </div>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                {j.numero_licence && <span style={{ background: '#1a2e4a', border: '1px solid #3b82f630', color: colors.accent.blue, fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px' }}>🪪</span>}
                                {j.club_categorie_id && (() => {
                                  const cat = clubCategories.find(c => c.id === j.club_categorie_id)
                                  return cat ? <span style={{ background: colors.accent.green + alpha.subtle, border: '1px solid #4ade8030', color: colors.accent.green, fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px' }}>{cat.nom}-{cat.equipe}</span> : null
                                })()}
                                <button onClick={e => { e.stopPropagation(); setJoueurProfil(j) }} style={{ background: groupe.color + '15', border: `1px solid ${groupe.color}30`, color: groupe.color, borderRadius: '6px', padding: '3px 9px', cursor: 'pointer', fontSize: '11px', fontWeight: 600, fontFamily: 'Inter,sans-serif' }}>👤 {t('equipe_profil', lang)}</button>
                              </div>

                              {blocInvitationJoueur(j)}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ===== STATS JOUEURS ===== */}
        {activeSection === 'stats' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>{t('nav_stats', lang)}</h1>
            </div>

            {/* Sous-onglets */}
            <div className="sous-onglets" style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem', borderBottom: `1px solid ${colors.border.subtle}`, paddingBottom: '0', overflowX: 'auto', whiteSpace: 'nowrap', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
              {[['tableau',`📋 ${t('stats_tab_tableau', lang)}`],['classement',`🏆 ${t('stats_tab_classement', lang)}`],['graphiques',`📈 ${t('stats_tab_graphiques', lang)}`],['presence',`🏃 ${t('stats_tab_presences', lang)}`],['mois',`🌟 ${t('stats_tab_mois', lang)}`]].map(([k, label]) => (
                <button key={k} onClick={() => setStatsSubTab(k)} style={{ background: 'transparent', border: 'none', borderBottom: statsSubTab === k ? '2px solid #60a5fa' : '2px solid transparent', color: statsSubTab === k ? colors.accent.blue : colors.text.faint, padding: '10px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', flexShrink: 0 }}>{label}</button>
              ))}
            </div>

            {joueurs.length === 0 ? (
              <div style={{ ...st.card, textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: colors.text.faint }}>Ajoute d'abord des joueurs dans "Mon équipe"</p>
              </div>
            ) : (
              <>
                {/* ─ Tableau ─ */}
                {statsSubTab === 'tableau' && (() => {
                  // Compétitions réellement présentes dans les matchs (competition est un
                  // champ texte libre, pas un enum — pas de liste championnat/coupe/amical
                  // figée en dur, StatsEquipe.jsx utilise déjà ce même principe).
                  const competitionsDispo = [...new Set(matchs.map(m => m.competition).filter(Boolean))]
                  const matchsTableauFiltres = filtreCompTableau === 'all' ? matchs : matchs.filter(m => m.competition === filtreCompTableau)
                  const matchIdsFiltres = new Set(matchsTableauFiltres.map(m => m.id))
                  const noteMoyenne = (joueurId) => {
                    const notesJoueur = notationsMatch.filter(n => n.joueur_id === joueurId && matchIdsFiltres.has(n.match_id))
                    if (!notesJoueur.length) return null
                    const moy = notesJoueur.reduce((s, n) => s + Number(n.note), 0) / notesJoueur.length
                    return { moyenne: moy.toFixed(1), nb: notesJoueur.length }
                  }
                  // Regroupe par ligne (gardien → défenseurs → milieux →
                  // attaquants) plutôt que l'ordre brut du roster, avec une
                  // légère séparation entre chaque groupe pour la lisibilité.
                  // Postes détaillés (cf. select "Poste" du profil joueur,
                  // ligne ~3556) regroupés dans leur ligne correspondante.
                  const LIGNES_POSTE = [
                    { label: 'Gardiens', postes: ['Gardien'] },
                    { label: 'Défenseurs', postes: ['Défenseur central', 'Latéral droit', 'Latéral gauche'] },
                    { label: 'Milieux', postes: ['Milieu défensif', 'Milieu central', 'Milieu offensif'] },
                    { label: 'Attaquants', postes: ['Ailier droit', 'Ailier gauche', 'Attaquant'] },
                  ]
                  const ligneDuPoste = (poste) => LIGNES_POSTE.findIndex(l => l.postes.includes(poste))
                  const joueursTries = [...joueurs].sort((a, b) => {
                    const la = ligneDuPoste(a.poste), lb = ligneDuPoste(b.poste)
                    return (la === -1 ? LIGNES_POSTE.length : la) - (lb === -1 ? LIGNES_POSTE.length : lb)
                  })
                  return (
                  <div style={{ ...st.card, overflow: 'auto' }}>
                    {competitionsDispo.length > 1 && (
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                        {[{ key: 'all', label: 'Toutes compétitions' }, ...competitionsDispo.map(c => ({ key: c, label: c }))].map(f => (
                          <button
                            key={f.key}
                            onClick={() => setFiltreCompTableau(f.key)}
                            style={{
                              padding: '7px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '13px',
                              background: filtreCompTableau === f.key ? colors.accent.green : colors.background.raised,
                              color: filtreCompTableau === f.key ? colors.black : colors.text.dim,
                              fontWeight: filtreCompTableau === f.key ? 700 : 400,
                            }}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    )}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${colors.border.subtle}` }}>
                          {[t('equipe_col_joueur', lang), t('equipe_poste', lang), 'MJ', 'Min', t('comp_buts', lang), 'Passes D.', 'CS', '🟨', '🟥', t('stats_col_presence', lang), 'Note'].map(h => (
                            <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: colors.text.faint, fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {joueursTries.map((j, i) => {
                          const s = statsGlobalesJoueur(j.id, matchsTableauFiltres)
                          const tx = tauxPresence(j.id)
                          const note = noteMoyenne(j.id)
                          const ligne = ligneDuPoste(j.poste)
                          const nouvelleLigne = i === 0 || ligneDuPoste(joueursTries[i - 1].poste) !== ligne
                          return (
                            <Fragment key={j.id}>
                              {nouvelleLigne && ligne !== -1 && (
                                <tr>
                                  <td colSpan={11} style={{ padding: i === 0 ? '2px 12px 6px' : '16px 12px 6px', color: colors.text.disabled, fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.6px', borderBottom: `1px solid ${colors.border.subtle}` }}>
                                    {LIGNES_POSTE[ligne].label}
                                  </td>
                                </tr>
                              )}
                              <tr style={{ borderBottom: `1px solid ${colors.border.subtle}` }}>
                              <td style={{ padding: '10px 12px', fontWeight: 700 }}>{j.prenom} {j.nom}</td>
                              <td style={{ padding: '10px 12px', color: colors.text.faint, fontSize: '12px' }}>{j.poste || '—'}</td>
                              <td style={{ padding: '10px 12px', color: s.matchs > 0 ? colors.text.primary : colors.border.strong }}>{s.matchs}</td>
                              <td style={{ padding: '10px 12px', color: s.minutes > 0 ? colors.text.primary : colors.border.strong }}>{s.minutes}'</td>
                              <td style={{ padding: '10px 12px', color: s.buts > 0 ? colors.accent.green : colors.border.strong, fontWeight: s.buts > 0 ? 700 : 400 }}>{s.buts}</td>
                              <td style={{ padding: '10px 12px', color: s.passes_dec > 0 ? colors.accent.blue : colors.border.strong, fontWeight: s.passes_dec > 0 ? 700 : 400 }}>{s.passes_dec}</td>
                              <td style={{ padding: '10px 12px', color: s.clean_sheets > 0 ? colors.accent.green : colors.border.strong }}>{s.clean_sheets}</td>
                              <td style={{ padding: '10px 12px', color: s.cartons_j > 0 ? '#f59e0b' : colors.border.strong }}>{s.cartons_j}</td>
                              <td style={{ padding: '10px 12px', color: s.cartons_r > 0 ? '#f87171' : colors.border.strong }}>{s.cartons_r}</td>
                              <td style={{ padding: '10px 12px' }}>
                                {tx !== null
                                  ? <span style={{ color: tx.taux >= 80 ? colors.accent.green : tx.taux >= 50 ? '#f59e0b' : '#f87171', fontWeight: 700 }}>{tx.taux}%</span>
                                  : <span style={{ color: colors.border.strong }}>—</span>}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                {note ? (
                                  <div>
                                    <span style={{ fontWeight: 700, fontSize: '14px', color: note.moyenne >= 7 ? colors.accent.green : note.moyenne >= 5 ? colors.accent.amber : colors.accent.red }}>
                                      {note.moyenne}<span style={{ color: colors.text.ghost, fontSize: '10px', fontWeight: 400, marginLeft: '2px' }}>/10</span>
                                    </span>
                                    <div style={{ color: colors.text.ghost, fontSize: '10px' }}>{note.nb} match{note.nb > 1 ? 's' : ''}</div>
                                  </div>
                                ) : (
                                  <span style={{ color: colors.border.strong }}>—</span>
                                )}
                              </td>
                            </tr>
                            </Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  )
                })()}

                {/* ─ Stats équipe ─ */}
                {statsSubTab === 'tableau' && (() => {
                  const notesEquipeMatch = notationsMatch.filter(n => n.est_note_equipe)
                  const noteEquipe = notesEquipeMatch.length
                    ? { moyenne: (notesEquipeMatch.reduce((s, n) => s + Number(n.note), 0) / notesEquipeMatch.length).toFixed(1), nb: notesEquipeMatch.length }
                    : null
                  return (
                  <div style={{ ...st.card, marginTop: '16px' }}>
                    <p style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '14px' }}>Bilan de l'équipe</p>
                    <StatsEquipe matchs={matchs} noteEquipe={noteEquipe} />
                  </div>
                  )
                })()}

                {/* ─ Classement ─ */}
                {statsSubTab === 'classement' && (() => {
                  const withStats = joueurs.map(j => ({ ...j, s: statsGlobalesJoueur(j.id), tx: tauxPresence(j.id), note: notes[j.id] }))
                  const TRIS = [
                    { key: 'buts', label: t('stats_filtre_buteurs', lang), get: j => j.s.buts, color: colors.accent.green, unit: 'but' },
                    { key: 'passes_dec', label: t('stats_filtre_passeurs', lang), get: j => j.s.passes_dec, color: colors.accent.blue, unit: 'passe' },
                    { key: 'victoires', label: t('stats_filtre_victoires', lang), get: j => j.s.victoires, color: colors.accent.amber, unit: 'V' },
                    { key: 'minutes', label: t('stats_filtre_temps', lang), get: j => j.s.minutes, color: colors.accent.purpleLight, unit: "'" },
                    { key: 'presence', label: t('stats_filtre_presence', lang), get: j => j.tx?.taux ?? 0, color: '#34d399', unit: '%' },
                    { key: 'note', label: t('stats_filtre_note_edu', lang), get: j => j.note ? ((j.note.technique+j.note.physique+j.note.mental+j.note.tactique)/4) : 0, color: colors.accent.amber, unit: '/5' },
                  ]
                  const triActif = TRIS.find(t => t.key === statsTri) || TRIS[0]
                  const sorted = [...withStats].sort((a, b) => triActif.get(b) - triActif.get(a))
                  return (
                    <div>
                      {/* Sélecteur de critère */}
                      <div className="filtres-scroll" style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '4px', marginBottom: '1.5rem' }}>
                        {TRIS.map(t => (
                          <button key={t.key} onClick={() => setStatsTri(t.key)} style={{ flexShrink: 0, background: statsTri === t.key ? t.color + '20' : colors.background.surface, border: `1px solid ${statsTri === t.key ? t.color + '60' : colors.border.faint}`, color: statsTri === t.key ? t.color : colors.text.faint, padding: '7px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{t.label}</button>
                        ))}
                      </div>
                      {/* Podium top 3 */}
                      {sorted.length >= 3 && (
                        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '12px', marginBottom: '2rem' }}>
                          {[0, 1, 2].map(rank => {
                            const j = sorted[rank]
                            if (!j) return null
                            const heights = [130, 100, 80]
                            const medals = ['🥇','🥈','🥉']
                            const val = triActif.get(j)
                            return (
                              <div key={j.id} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ fontSize: '22px', marginBottom: '6px' }}>{medals[rank]}</div>
                                <Avatar person={j} size={44} bg={triActif.color + '20'} border={`2px solid ${triActif.color}40`} textColor={triActif.color} style={{ marginBottom: '6px' }} />
                                <p style={{ margin: '0 0 2px', fontSize: '12px', fontWeight: 700 }}>{j.prenom}</p>
                                <p style={{ margin: '0 0 8px', fontSize: '11px', color: colors.text.faint }}>{j.nom}</p>
                                <div style={{ background: triActif.color + '20', border: `1px solid ${triActif.color}40`, borderRadius: '8px', width: '70px', height: `${heights[rank]}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                                  <span style={{ color: triActif.color, fontWeight: 800, fontSize: '18px' }}>{typeof val === 'number' && !Number.isInteger(val) ? val.toFixed(1) : val}</span>
                                  <span style={{ color: triActif.color + 'aa', fontSize: '9px' }}>{triActif.unit}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {/* Liste complète */}
                      <div style={{ ...st.card, overflow: 'auto' }}>
                        <table className="tableau-classement" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <colgroup>
                            <col className="col-rang" />
                            <col className="col-joueur" />
                            <col className="col-poste" />
                            <col className="col-stat" />
                          </colgroup>
                          <thead>
                            <tr style={{ borderBottom: `1px solid ${colors.border.subtle}` }}>
                              <th style={{ padding: '8px 12px', color: colors.text.disabled, fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', width: '40px' }}>#</th>
                              <th style={{ padding: '8px 12px', color: colors.text.disabled, fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', textAlign: 'left' }}>{t('equipe_col_joueur', lang)}</th>
                              <th style={{ padding: '8px 12px', color: colors.text.disabled, fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', textAlign: 'left' }}>{t('equipe_poste', lang)}</th>
                              <th style={{ padding: '8px 12px', color: triActif.color, fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', textAlign: 'right' }}>{triActif.label}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sorted.map((j, i) => {
                              const val = triActif.get(j)
                              return (
                                <tr key={j.id} style={{ borderBottom: `1px solid ${colors.border.subtle}`, background: i === 0 ? triActif.color + '08' : 'transparent' }}>
                                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: i < 3 ? triActif.color : colors.text.disabled, fontSize: i === 0 ? '15px' : '13px' }}>{i + 1}</td>
                                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>{j.prenom} {j.nom}</td>
                                  <td style={{ padding: '10px 12px', color: colors.text.faint, fontSize: '12px' }}>{j.poste || '—'}</td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: triActif.color, fontSize: '15px' }}>
                                    {typeof val === 'number' && !Number.isInteger(val) ? val.toFixed(1) : val}{triActif.unit === '%' ? '%' : ''}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                })()}

                {/* ─ Graphiques ─ */}
                {statsSubTab === 'graphiques' && (() => {
                  const withStats = joueurs.map(j => ({ label: `${j.prenom} ${j.nom?.[0] || ""}.`, ...statsGlobalesJoueur(j.id) }))
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '20px', paddingLeft: '16px', paddingRight: '16px', boxSizing: 'border-box' }}>
                      {[
                        { title: t('stats_graph_buteurs', lang), key: 'buts', color: colors.accent.green },
                        { title: t('stats_graph_passes', lang), key: 'passes_dec', color: colors.accent.blue },
                        { title: t('stats_graph_minutes', lang), key: 'minutes', color: colors.accent.purpleLight, unit: "'" },
                        { title: t('stats_graph_matchs', lang), key: 'matchs', color: '#f59e0b' },
                        { title: t('stats_graph_cartons_j', lang), key: 'cartons_j', color: colors.accent.amber },
                        { title: t('stats_graph_cartons_r', lang), key: 'cartons_r', color: '#f87171' },
                      ].map(({ title, key, color, unit = '' }) => {
                        const data = [...withStats].sort((a, b) => b[key] - a[key]).filter(d => d[key] > 0)
                        return (
                          <div key={key} style={st.card}>
                            <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: '14px' }}>{title}</p>
                            {data.length === 0
                              ? <p style={{ color: colors.border.strong, fontSize: '13px' }}>{t('msg_aucune_donnee', lang)}</p>
                              : <BarChart data={data.map(d => ({ label: d.label, value: d[key] }))} color={color} unit={unit} />
                            }
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}

                {/* ─ Présences ─ */}
                {statsSubTab === 'presence' && (() => {
                  const allTx = joueurs.map(j => tauxPresence(j.id)).filter(Boolean)
                  const totalPresents  = allTx.reduce((s, t) => s + t.presents, 0)
                  const totalConvoques = allTx.reduce((s, t) => s + t.convoque, 0)
                  const totalAbsents   = allTx.reduce((s, t) => s + t.absents, 0)
                  const totalBlesses   = allTx.reduce((s, t) => s + t.blesses, 0)
                  const totalMalades   = allTx.reduce((s, t) => s + t.malade, 0)
                  const tauxMoyen      = allTx.length ? Math.round(allTx.reduce((s, t) => s + t.taux, 0) / allTx.length) : 0
                  const seancesSaisies = allTx.length ? allTx[0].total : 0
                  const presenceParMois = (joueurId) => {
                    const mois = {}
                    entrainements.forEach(e => {
                      const p = (e.presences_entrainement || []).find(pr => pr.joueur_id === joueurId)
                      if (!p || (!p.statut && !p.present)) return
                      const d = new Date(e.date)
                      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
                      if (!mois[key]) mois[key] = { presents:0, convoque:0, absents:0, blesses:0, malade:0, total:0 }
                      mois[key].total++
                      const st = p.statut || (p.present ? 'present' : 'absent')
                      if (st==='present') mois[key].presents++
                      else if (st==='convoque') mois[key].convoque++
                      else if (st==='absent') mois[key].absents++
                      else if (st==='blesse') mois[key].blesses++
                      else if (st==='malade') mois[key].malade++
                    })
                    return Object.entries(mois).sort(([a],[b])=>a.localeCompare(b)).map(([key,s])=>({
                      key, label: new Date(key+'-02').toLocaleDateString('fr-FR',{month:'long',year:'numeric'}),
                      ...s, taux: Math.round((s.presents+s.convoque)/s.total*100)
                    }))
                  }
                  return (
                    <div>
                      {/* ── % par catégorie en haut ── */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px', width: '100%', paddingLeft: '16px', paddingRight: '16px', boxSizing: 'border-box', marginBottom: '1.5rem' }}>
                        {(() => {
                          const tot = totalPresents + totalConvoques + totalAbsents + totalBlesses + totalMalades || 1
                          // Convoqués comptent comme présents (comme dans tauxPresence et
                          // presenceParMois) — donc "Absents" est calculé directement sur
                          // totalAbsents, pas en complément de la présence (100 - X), sinon
                          // les convoqués (et blessés/malades) se retrouveraient à tort
                          // inclus dans le taux d'absence.
                          const tauxPresenceGlobal = Math.round((totalPresents + totalConvoques) / tot * 100)
                          const tauxAbsentsGlobal = Math.round(totalAbsents / tot * 100)
                          return [
                            { label: `✅ ${t('stats_pres_presence', lang)}`, val: tauxPresenceGlobal, color: colors.accent.green, count: totalPresents + totalConvoques },
                            { label: `❌ ${t('stats_pres_absents', lang)}`,  val: tauxAbsentsGlobal,  color: colors.accent.red, note: t('stats_pres_dont', lang), count: totalAbsents },
                            { label: `🤕 ${t('stats_pres_blesses', lang)}`,  val: Math.round(totalBlesses / tot * 100),  color: colors.accent.orange, count: totalBlesses },
                            { label: `🤒 ${t('stats_pres_malades', lang)}`,  val: Math.round(totalMalades / tot * 100),  color: colors.accent.purple, count: totalMalades },
                            { label: `🏆 ${t('stats_pres_convoques', lang)}`,val: Math.round(totalConvoques / tot * 100), color: colors.accent.blue, count: totalConvoques },
                          ]
                        })().map(c => (
                          <div key={c.label} style={{ background: colors.background.surface, border: `1px solid ${c.color}20`, borderRadius: '12px', padding: '10px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '90px' }}>
                            <span style={{ fontSize: '22px', fontWeight: 800, color: c.color }}>
                              {c.val}%
                              {/* Compteur brut affiché même si l'arrondi tombe à 0% (ex: 1 ou 2
                                  cas sur des centaines de séances × joueurs) — sinon un vrai
                                  blessé/malade "Auto" devient invisible à tort. */}
                              {c.count > 0 && <span style={{ fontSize: '12px', fontWeight: 600, color: colors.text.faint }}> ({c.count})</span>}
                            </span>
                            <span style={{ fontSize: '11px', color: colors.text.faint, marginTop: '2px', textAlign: 'center' }}>{c.label}</span>
                            {c.note && (
                              <span style={{ fontSize: '9px', color: colors.text.disabled, marginTop: '2px', textAlign: 'center' }}>{c.note}</span>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* ── Cards joueurs par poste ── */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        {[
                          { label: `🧤 ${t('stats_pres_gardiens', lang)}`, color: '#f59e0b', match: p => p?.toLowerCase().includes('gardien') },
                          { label: `🛡️ ${t('stats_pres_defenseurs', lang)}`, color: colors.accent.blue, match: p => p && ['défenseur','defenseur','latéral','lateral'].some(k => p.toLowerCase().includes(k)) },
                          { label: `⚙️ ${t('stats_pres_milieux', lang)}`, color: colors.accent.purpleLight, match: p => p?.toLowerCase().includes('milieu') },
                          { label: `⚡ ${t('stats_pres_attaquants', lang)}`, color: colors.accent.green, match: p => p && ['attaquant','ailier'].some(k => p.toLowerCase().includes(k)) },
                          { label: '❓ Autres', color: colors.text.faint, match: p => !p || !['gardien','défenseur','defenseur','latéral','lateral','milieu','attaquant','ailier'].some(k => p.toLowerCase().includes(k)) },
                        ].map(groupe => {
                          const gJoueurs = joueurs.filter(j => groupe.match(j.poste))
                          if (!gJoueurs.length) return null
                          return (
                            <div key={groupe.label}>
                              <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '13px', color: groupe.color }}>{groupe.label}</p>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                                {gJoueurs.map(j => {
                                  const tx = tauxPresence(j.id)
                                  return (
                                    <div key={j.id} style={st.card}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <DonutMulti
                                          presents={tx?.presents || 0}
                                          absents={tx?.absents || 0}
                                          blesses={tx?.blesses || 0}
                                          malade={tx?.malade || 0}
                                          convoque={tx?.convoque || 0}
                                          size={72}
                                        />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.prenom} {j.nom}</p>
                                          <p style={{ margin: '2px 0 8px', fontSize: '11px', color: colors.text.faint }}>{j.poste || '—'}{tx ? ` · ${tx.total} ${tx.total > 1 ? t('stats_seances_plural', lang) : t('stats_seance_singular', lang)}` : ''}</p>
                                          {tx ? (
                                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '3px' }}>
                                              {[
                                                { emoji: '✅', label: t('stats_statut_present', lang), val: tx.presents, color: colors.accent.green },
                                                { emoji: '🏆', label: t('stats_statut_convoqu', lang), val: tx.convoque, color: colors.accent.blue },
                                                { emoji: '❌', label: t('stats_statut_absent', lang), val: tx.absents, color: colors.accent.red },
                                                { emoji: '🤕', label: t('stats_statut_blesse', lang), val: tx.blesses, color: colors.accent.orange },
                                                { emoji: '🤒', label: t('stats_statut_malade', lang), val: tx.malade, color: colors.accent.purple },
                                              ].filter(s => s.val > 0).map(s => (
                                                <span key={s.label} style={{ fontSize: '11px', color: s.color }}>
                                                  {s.emoji} {s.val} {s.label}
                                                </span>
                                              ))}
                                            </div>
                                          ) : (
                                            <span style={{ fontSize: '11px', color: colors.border.strong }}>Aucune présence saisie</span>
                                          )}
                                        </div>
                                        {tx && (
                                          <button
                                            onClick={() => setJoueurMoisDetail(joueurMoisDetail === j.id ? null : j.id)}
                                            style={{ background: joueurMoisDetail === j.id ? '#1a2e1a' : colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '8px', color: colors.text.secondary, fontSize: '11px', padding: '5px 8px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                                          >
                                            📅 {joueurMoisDetail === j.id ? '▲' : '▼'}
                                          </button>
                                        )}
                                      </div>
                                      {/* Détail par mois */}
                                      {joueurMoisDetail === j.id && (() => {
                                        const moisData = presenceParMois(j.id)
                                        if (!moisData.length) return null
                                        return (
                                          <div style={{ marginTop: '14px', borderTop: `1px solid ${colors.border.subtle}`, paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <p style={{ margin: '0 0 6px', fontSize: '11px', color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Présence par mois</p>
                                            {moisData.map(m => {
                                              const color = m.taux >= 80 ? colors.accent.green : m.taux >= 50 ? '#f59e0b' : colors.accent.red
                                              return (
                                                <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                  <span style={{ fontSize: '11px', color: colors.text.faint, minWidth: '110px', textTransform: 'capitalize' }}>{m.label}</span>
                                                  <div style={{ flex: 1, height: '6px', background: colors.background.raised, borderRadius: '3px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${m.taux}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.4s' }} />
                                                  </div>
                                                  <span style={{ fontSize: '12px', fontWeight: 700, color, minWidth: '36px', textAlign: 'right' }}>{m.taux}%</span>
                                                  <span style={{ fontSize: '10px', color: colors.text.disabled }}>{m.presents+m.convoque}/{m.total}</span>
                                                </div>
                                              )
                                            })}
                                          </div>
                                        )
                                      })()}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* ── Bar chart classement présence ── */}
                      <div style={st.card}>
                        <p style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '14px' }}>🏃 Classement par taux de présence</p>
                        <BarChart
                          data={[...joueurs]
                            .map(j => ({ label: `${j.prenom} ${j.nom?.[0] || ""}.`, value: tauxPresence(j.id)?.taux ?? 0 }))
                            .filter(d => d.value > 0)
                            .sort((a, b) => b.value - a.value)}
                          color={colors.accent.green}
                          unit="%"
                          max={100}
                        />
                        {joueurs.every(j => !tauxPresence(j.id)) && (
                          <p style={{ color: colors.border.strong, fontSize: '13px', margin: 0, textAlign: 'center', padding: '1rem' }}>Commence à saisir les présences dans l'onglet Entraînements</p>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </>
            )}

            {/* ─ Joueur du mois ─ */}
            {statsSubTab === 'mois' && (() => {
              // Group point_seance entries by month per player
              const pointsParJoueurMois = {}
              entrainements.forEach(e => {
                const dateStr = e.date || e.created_at
                if (!dateStr) return
                const d = new Date(dateStr)
                const moisKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                ;(e.presences_entrainement || []).forEach(p => {
                  if (!p.point_seance) return
                  const jid = p.joueur_id
                  if (!pointsParJoueurMois[moisKey]) pointsParJoueurMois[moisKey] = {}
                  pointsParJoueurMois[moisKey][jid] = (pointsParJoueurMois[moisKey][jid] || 0) + 1
                })
              })

              const moisKeys = Object.keys(pointsParJoueurMois).sort().reverse()
              const now = new Date()
              const moisCourant = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

              const moisLabel = (k) => {
                const [y, m] = k.split('-')
                return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString(localeOf(lang), { month: 'long', year: 'numeric' })
              }

              const getPodium = (moisKey) => {
                const pts = pointsParJoueurMois[moisKey] || {}
                return Object.entries(pts)
                  .map(([jid, count]) => ({ joueur: joueurs.find(j => j.id === jid), count }))
                  .filter(x => x.joueur)
                  .sort((a, b) => b.count - a.count)
              }

              const totalPoints = () => {
                const total = {}
                Object.values(pointsParJoueurMois).forEach(mois => {
                  Object.entries(mois).forEach(([jid, pts]) => {
                    total[jid] = (total[jid] || 0) + pts
                  })
                })
                return Object.entries(total)
                  .map(([jid, pts]) => ({ joueur: joueurs.find(j => j.id === jid), pts }))
                  .filter(x => x.joueur)
                  .sort((a, b) => b.pts - a.pts)
              }

              const podiumActuel = getPodium(moisCourant)
              const topAll = totalPoints()
              const medals = ['🥇', '🥈', '🥉']

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Mois en cours */}
                  <div style={st.card}>
                    <p style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '16px' }}>🌟 {t('stats_joueur_du_mois', lang)} — {moisLabel(moisCourant)}</p>
                    {podiumActuel.length === 0 ? (
                      <p style={{ color: colors.border.strong, fontSize: '13px', margin: 0, textAlign: 'center', padding: '1rem' }}>{t('stats_aucun_point_mois', lang)}</p>
                    ) : (
                      <>
                        {/* Podium top 3 */}
                        {podiumActuel.length >= 2 && (
                          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '16px', marginBottom: '2rem' }}>
                            {[0, 1, 2].filter(i => podiumActuel[i]).map((i) => {
                              const item = podiumActuel[i]
                              const heights = [130, 100, 80]
                              const medalColors = [colors.accent.amber, '#9ca3af', '#cd7f32']
                              return (
                                <div key={item.joueur.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '20px' }}>{medals[i]}</span>
                                  <Avatar person={item.joueur} size={70} bg={`${medalColors[i]}20`} border={`2px solid ${medalColors[i]}`} textColor={medalColors[i]} />
                                  <div style={{ textAlign: 'center' }}>
                                    <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{item.joueur.prenom}</p>
                                    <p style={{ margin: 0, fontSize: '11px', color: colors.text.faint }}>{item.joueur.nom}</p>
                                    <p style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: medalColors[i] }}>{item.count}⭐</p>
                                  </div>
                                  <div style={{ width: '80px', height: `${heights[i]}px`, background: `${medalColors[i]}30`, border: `1px solid ${medalColors[i]}50`, borderRadius: '6px 6px 0 0', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '8px' }}>
                                    <span style={{ fontWeight: 800, color: medalColors[i], fontSize: '18px' }}>{i === 0 ? '1er' : i === 1 ? '2ème' : '3ème'}</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                        {/* Liste complète */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {podiumActuel.map((item, idx) => (
                            <div key={item.joueur.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: colors.background.surface, borderRadius: '10px', border: idx === 0 ? '1px solid #fbbf2440' : `1px solid ${colors.border.subtle}` }}>
                              <span style={{ fontSize: '18px', width: '28px', textAlign: 'center' }}>{medals[idx] || `${idx + 1}.`}</span>
                              <div style={{ flex: 1 }}>
                                <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{item.joueur.prenom} {item.joueur.nom}</p>
                                <p style={{ margin: 0, fontSize: '11px', color: colors.text.faint }}>{item.joueur.poste || 'Joueur'}</p>
                              </div>
                              <span style={{ fontSize: '18px', fontWeight: 800, color: colors.accent.amber }}>{item.count} ⭐</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Classement historique total */}
                  {topAll.length > 0 && (
                    <div style={st.card}>
                      <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: '14px' }}>🏅 {t('stats_classement_general', lang)}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {topAll.map((item, idx) => (
                          <div key={item.joueur.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', background: colors.background.surface, borderRadius: '8px' }}>
                            <span style={{ fontSize: '16px', width: '24px', textAlign: 'center' }}>{medals[idx] || `${idx + 1}.`}</span>
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>{item.joueur.prenom} {item.joueur.nom}</p>
                            </div>
                            <span style={{ fontSize: '16px', fontWeight: 800, color: colors.accent.amber }}>{item.pts} ⭐</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Historique par mois */}
                  {moisKeys.filter(k => k !== moisCourant).length > 0 && (
                    <div style={st.card}>
                      <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: '14px' }}>📅 Historique des joueurs du mois</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {moisKeys.filter(k => k !== moisCourant).map(k => {
                          const podium = getPodium(k)
                          if (!podium.length) return null
                          const winner = podium[0]
                          return (
                            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: colors.background.surface, borderRadius: '10px', border: `1px solid ${colors.border.subtle}` }}>
                              <span style={{ fontSize: '20px' }}>🥇</span>
                              <div style={{ flex: 1 }}>
                                <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{winner.joueur.prenom} {winner.joueur.nom}</p>
                                <p style={{ margin: 0, fontSize: '11px', color: colors.text.faint, textTransform: 'capitalize' }}>{moisLabel(k)}</p>
                              </div>
                              <span style={{ fontSize: '15px', fontWeight: 700, color: colors.accent.amber }}>{winner.count} ⭐</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </>
        )}

        {/* ===== COMPÉTITION ===== */}
        {activeSection === 'matchs' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: permissions?.competition === 'lecture' ? '0.5rem' : '1.5rem' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>{t('comp_competition', lang)}</h1>
            </div>

            {permissions?.competition === 'lecture' && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: colors.accent.blue + alpha.subtle, border: '1px solid #60a5fa30', color: colors.accent.blue, fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, marginBottom: 16 }}>
                {t('equipe_mode_lecture', lang)}
              </div>
            )}

            {/* Sous-onglets */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem', borderBottom: `1px solid ${colors.border.subtle}`, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
              {[['resultats',`${t('comp_resultats', lang)}`],['calendrier',`${t('comp_calendrier', lang)}`],['classement',`${t('comp_classement', lang)}`]].map(([k, label]) => (
                <button key={k} onClick={() => setCompetitionSubTab(k)} style={{ background: 'transparent', border: 'none', borderBottom: competitionSubTab === k ? '2px solid #60a5fa' : '2px solid transparent', color: competitionSubTab === k ? colors.accent.blue : colors.text.faint, padding: '10px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', flexShrink: 0 }}>{label}</button>
              ))}
            </div>

            {/* ── Résultats ── */}
            {competitionSubTab === 'resultats' && (
              <div style={{ maxWidth: '640px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{t('comp_resultats', lang)}</h2>
                  {canEdit('competition') && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {canEdit('stats') && (
                        <button onClick={() => setShowScanner(true)} style={{ ...st.btn(), background: '#1a1a2e', border: '1px solid #60a5fa40', color: colors.accent.blue }}>{t('seance_scanner', lang)}</button>
                      )}
                      <button onClick={() => setShowAddMatch(true)} style={st.btn()}>+ {t('comp_bouton_match', lang)}</button>
                    </div>
                  )}
                </div>

                {showAddMatch && canEdit('competition') && (
                  <div style={{ ...st.card, border: '1px solid #4ade8030', marginBottom: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div><label style={st.label}>{t('ent_date', lang)}</label><input style={st.input} type="date" value={newMatch.date} onChange={e => setNewMatch({ ...newMatch, date: e.target.value })} /></div>
                      <div><label style={st.label}>{t('ent_heure_optionnel', lang)}</label><input style={st.input} type="time" value={newMatch.heure} onChange={e => setNewMatch({ ...newMatch, heure: e.target.value })} /></div>
                      <div><label style={st.label}>{t('comp_adversaire', lang)}</label><input style={st.input} placeholder="Nom de l'équipe" value={newMatch.adversaire} onChange={e => setNewMatch({ ...newMatch, adversaire: e.target.value })} /></div>
                      <div><label style={st.label}>{t('comp_competition', lang)}</label><input style={st.input} placeholder="Championnat, Coupe..." value={newMatch.competition} onChange={e => setNewMatch({ ...newMatch, competition: e.target.value })} /></div>
                      <div><label style={st.label}>{t('comp_lieu', lang)}</label><input style={st.input} placeholder="Ex: Stade municipal" value={newMatch.lieu} onChange={e => setNewMatch({ ...newMatch, lieu: e.target.value })} /></div>
                      {!newMatch.domicile && (
                        <div><label style={st.label}>Ville (pour calculer le trajet)</label><input style={st.input} placeholder="Ex: Lyon" value={newMatch.ville} onChange={e => setNewMatch({ ...newMatch, ville: e.target.value })} /></div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                        <div style={{ flex: 1 }}><label style={st.label}>Score (nous)</label><input style={st.input} type="number" min="0" value={newMatch.score_nous} onChange={e => setNewMatch({ ...newMatch, score_nous: e.target.value })} /></div>
                        <span style={{ color: colors.text.faint, paddingBottom: '10px', fontWeight: 700 }}>-</span>
                        <div style={{ flex: 1 }}><label style={st.label}>Score (eux)</label><input style={st.input} type="number" min="0" value={newMatch.score_eux} onChange={e => setNewMatch({ ...newMatch, score_eux: e.target.value })} /></div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: colors.text.secondary }}>
                        <input type="checkbox" checked={newMatch.domicile} onChange={e => setNewMatch({ ...newMatch, domicile: e.target.checked })} />
                        {t('comp_domicile', lang)}
                      </label>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={ajouterMatch} disabled={savingMatch} style={st.btnSolid}>{savingMatch ? 'Ajout...' : t('btn_ajouter', lang)}</button>
                      <button onClick={() => setShowAddMatch(false)} style={st.btn(colors.text.dim)}>{t('btn_annuler', lang)}</button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                  {grouperMatchsParMois(matchs.filter(matchJoue), true).map(([moisKey, { label, items }]) => (
                    <div key={moisKey}>
                      <p style={{ fontSize: '11px', fontWeight: 800, color: colors.accent.blue, textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 10px' }}>{label}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {items.map(m => {
                          const aScore = true
                          const nous = parseInt(m.score_nous)
                          const eux = parseInt(m.score_eux)
                          const resultat = nous > eux ? 'V' : nous < eux ? 'D' : 'N'
                          const couleur = resultat === 'V' ? colors.accent.green : resultat === 'D' ? '#f87171' : '#f59e0b'
                          return (
                      <div key={m.id} style={{ ...st.card }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setMatchActif(matchActif?.id === m.id ? null : m)}>
                          {resultat && <span style={{ background: couleur + '20', color: couleur, fontWeight: 800, fontSize: '12px', padding: '3px 10px', borderRadius: '20px', flexShrink: 0 }}>{resultat}</span>}
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>
                              {m.domicile ? 'vs' : '@'} {m.adversaire}
                            </p>
                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.faint }}>
                              {new Date(m.date).toLocaleDateString(localeOf(lang), { weekday: 'short', day: 'numeric', month: 'short' })}
                              {m.heure ? ` · ${m.heure}` : ''}
                              {m.competition ? ` · ${m.competition}` : ''}
                              {m.domicile ? ` · ${t('comp_domicile', lang)}` : ` · ${t('comp_exterieur', lang)}`}
                              {m.lieu ? ` · ${m.lieu}` : ''}
                            </p>
                          </div>
                          {aScore && <span style={{ fontWeight: 800, fontSize: '16px', color: couleur }}>{m.score_nous} - {m.score_eux}</span>}
                          {canEdit('competition') && (
                            <button
                              onClick={ev => { ev.stopPropagation(); ouvrirModalMatchJoue(m) }}
                              style={{ background: 'transparent', border: `1px solid ${colors.border?.default || '#2a2a2a'}`, color: colors.accent.blue, cursor: 'pointer', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}
                              title="Modifier le résultat"
                            >
                              Modifier
                            </button>
                          )}
                          {canEdit('competition') && (
                            <button
                              onClick={async ev => {
                                ev.stopPropagation()
                                if (!confirm('Supprimer ce résultat ?')) return
                                const { error: errStats } = await supabase.from('stats_match').delete().eq('match_id', m.id)
                                if (errStats) { alert('Erreur : ' + errStats.message); return }
                                const { error } = await supabase.from('matchs_equipe').delete().eq('id', m.id)
                                if (error) { alert('Erreur : ' + error.message); return }
                                setMatchs(prev => prev.filter(m2 => m2.id !== m.id))
                                if (matchActif?.id === m.id) setMatchActif(null)
                                supprimerDeplacementLieAuMatch(m)
                              }}
                              style={{ background: 'transparent', border: 'none', color: colors.text.dim, cursor: 'pointer', padding: '6px', borderRadius: '6px', fontSize: '16px', flexShrink: 0 }}
                              title="Supprimer ce résultat"
                            >

                            </button>
                          )}
                        </div>

                        {/* Feuille de match (édition des stats_match — gouvernée par la permission 'stats', pas 'competition') */}
                        {matchActif?.id === m.id && canEdit('stats') && (
                          <div style={{ marginTop: '14px', borderTop: `1px solid ${colors.border.subtle}`, paddingTop: '14px' }}>
                            <p style={{ fontSize: '11px', fontWeight: 700, color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>{t('comp_feuille_match', lang)}</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowX: 'auto' }}>
                              {joueurs.map(j => {
                                const key = m.id
                                const s = (statsMatch[key] || {})[j.id] || {}
                                const existingStat = (m.stats_match || []).find(st => st.joueur_id === j.id) || {}
                                const val = (field) => s[field] !== undefined ? s[field] : (existingStat[field] ?? '')
                                return (
                                  <div key={j.id} style={{ display: 'grid', gridTemplateColumns: '140px 64px 64px 64px 64px 36px 36px', gap: '6px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.prenom} {j.nom?.[0] || ""}.</span>
                                    <input type="number" placeholder="Min" min="0" max="120" value={val('minutes')}
                                      onChange={e => setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || existingStat), minutes: parseInt(e.target.value) || 0 } } }))}
                                      style={{ ...st.input, padding: '8px', fontSize: '15px', textAlign: 'center' }} />
                                    <input type="number" placeholder="Buts" min="0" value={val('buts')}
                                      onChange={e => setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || existingStat), buts: parseInt(e.target.value) || 0 } } }))}
                                      style={{ ...st.input, padding: '8px', fontSize: '15px', textAlign: 'center' }} />
                                    <input type="number" placeholder="PD" min="0" value={val('passes_dec')}
                                      onChange={e => setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || existingStat), passes_dec: parseInt(e.target.value) || 0 } } }))}
                                      style={{ ...st.input, padding: '8px', fontSize: '15px', textAlign: 'center' }} />
                                    <input type="number" placeholder="CS" min="0" max="1" value={val('clean_sheet') ? 1 : 0}
                                      onChange={e => setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || existingStat), clean_sheet: e.target.value === '1' } } }))}
                                      style={{ ...st.input, padding: '8px', fontSize: '15px', textAlign: 'center' }} />
                                    <span title={t('comp_carton_jaune', lang)} style={{ cursor: 'pointer', display: 'inline-block', width: '12px', height: '16px', borderRadius: '2px', background: colors.accent.amber, opacity: val('carton_jaune') ? 1 : 0.25 }}
                                      onClick={() => setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || existingStat), carton_jaune: !val('carton_jaune') } } }))} />
                                    <span title={t('comp_carton_rouge', lang)} style={{ cursor: 'pointer', display: 'inline-block', width: '12px', height: '16px', borderRadius: '2px', background: colors.accent.red, opacity: val('carton_rouge') ? 1 : 0.25 }}
                                      onClick={() => setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || existingStat), carton_rouge: !val('carton_rouge') } } }))} />
                                  </div>
                                )
                              })}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
                              <p style={{ fontSize: '13px', color: colors.text.faint, margin: '0', alignSelf: 'center' }}>Min · Buts · PD · CS</p>
                              <button onClick={() => setMatchANoter(m)} style={{
                                marginLeft: 'auto', padding: '7px 16px', fontSize: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700,
                                background: m.notations_match?.length > 0 ? colors.accent.green + alpha.subtle : colors.background.raised,
                                border: `1px solid ${m.notations_match?.length > 0 ? colors.accent.green : colors.border.strong}`,
                                color: m.notations_match?.length > 0 ? colors.accent.green : colors.text.secondary,
                              }}>{m.notations_match?.length > 0 ? 'Noté' : 'Noter'}</button>
                              <button onClick={() => sauvegarderStatsMatch(m.id)} style={{ ...st.btnSolid, padding: '7px 16px', fontSize: '12px' }}>{t('btn_sauvegarder', lang)}</button>
                            </div>
                          </div>
                        )}
                      </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  {matchs.filter(matchJoue).length === 0 && <div style={{ ...st.card, textAlign: 'center', padding: '3rem' }}><p style={{ color: colors.text.faint }}>{t('comp_aucun_match', lang)}</p></div>}
                </div>
              </div>
            )}

            {/* Modal notation match */}
            {matchANoter && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, overflowY: 'auto', padding: '24px' }}
                onClick={() => setMatchANoter(null)}>
                <div onClick={e => e.stopPropagation()}>
                  <NotationMatch
                    match={matchANoter}
                    joueurs={joueurs}
                    educateurId={userId}
                    onClose={() => { setMatchANoter(null); chargerMatchs(userId) }}
                  />
                </div>
              </div>
            )}

            {/* ── Calendrier ── */}
            {competitionSubTab === 'calendrier' && (
              <div style={{ maxWidth: '700px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* Upload zone */}
                <div style={st.card}>
                  <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '14px' }}>{t('comp_scanner_calendrier', lang)}</p>
                  <p style={{ margin: '0 0 14px', fontSize: '12px', color: colors.text.faint }}>{t('comp_uploade_photos', lang)}</p>

                  <label style={{ display: 'block', border: `2px dashed ${colors.border.default}`, borderRadius: '10px', padding: '24px', textAlign: 'center', cursor: 'pointer', marginBottom: '12px' }}>
                    <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                      onChange={e => {
                        const files = Array.from(e.target.files)
                        files.forEach(file => {
                          const reader = new FileReader()
                          reader.onload = ev => {
                            const base64 = ev.target.result.split(',')[1]
                            setCalendarImages(prev => [...prev, { base64, preview: ev.target.result, name: file.name }])
                          }
                          reader.readAsDataURL(file)
                        })
                        e.target.value = ''
                      }} />
                    <p style={{ margin: 0, color: colors.text.faint, fontSize: '13px' }}>{t('comp_cliquer_photos', lang)}<br/><span style={{ fontSize: '11px', color: colors.border.strong }}>{t('comp_jpg_png_plusieurs', lang)}</span></p>
                  </label>

                  {/* Thumbnails */}
                  {calendarImages.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                      {calendarImages.map((img, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          <img src={img.preview} alt={img.name} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: `1px solid ${colors.border.default}` }} />
                          <button onClick={() => setCalendarImages(prev => prev.filter((_, idx) => idx !== i))}
                            style={{ position: 'absolute', top: '-6px', right: '-6px', background: colors.accent.red, border: 'none', borderRadius: '50%', width: '18px', height: '18px', color: colors.text.primary, fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IcoX /></button>
                        </div>
                      ))}
                    </div>
                  )}

                  {calendarError && <p style={{ color: colors.accent.red, fontSize: '12px', margin: '0 0 10px' }}>{calendarError}</p>}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={scannerCalendrier} disabled={calendarLoading || !calendarImages.length}
                      style={{ ...st.btnSolid, opacity: calendarImages.length ? 1 : 0.4 }}>
                      {calendarLoading ? `${libelleStatutGroq(calendarStatus)}` : `${t('comp_extraire_matchs', lang)}${calendarImages.length ? ` (${calendarImages.length} photo${calendarImages.length > 1 ? 's' : ''})` : ''}`}
                    </button>
                    {calendarMatchs.length > 0 && (
                      <button onClick={() => { setCalendarMatchs([]); localStorage.removeItem('calendarMatchs') }}
                        style={st.btn(colors.accent.red)}>{t('comp_reinitialiser', lang)}</button>
                    )}
                  </div>
                </div>

                {/* Calendrier extrait */}
                {calendarMatchs.length > 0 && (
                  <div style={st.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{t('comp_calendrier', lang)} — {calendarMatchs.length} match{calendarMatchs.length > 1 ? 's' : ''}</p>
                      {calendarMatchs.some(m => m.date) && (
                        <button onClick={publierCalendrierVersMatchs} disabled={publishingCalendrier} style={st.btnSolid}>
                          {publishingCalendrier ? 'Publication...' : `${t('comp_publier_calendrier', lang)} (${calendarMatchs.filter(m => m.date).length})`}
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {calendarMatchs.map((m, i) => {
                        const isPast = m.date && new Date(m.date) < new Date()
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: colors.background.surface, borderRadius: '10px', border: `1px solid ${isPast ? colors.background.raised : colors.border.default}`, opacity: isPast ? 0.5 : 1 }}>
                            <div style={{ minWidth: '90px', textAlign: 'center' }}>
                              {m.date ? (
                                <>
                                  <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: isPast ? colors.text.faint : colors.text.primary }}>
                                    {new Date(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                  </p>
                                  {m.heure && <p style={{ margin: 0, fontSize: '10px', color: colors.text.faint }}>{m.heure}</p>}
                                </>
                              ) : (
                                <p style={{ margin: 0, fontSize: '11px', color: colors.text.disabled }}>{t('comp_date_tbd', lang)}</p>
                              )}
                              {m.journee && <p style={{ margin: 0, fontSize: '10px', color: colors.accent.green, fontWeight: 700 }}>{m.journee}</p>}
                            </div>
                            <div style={{ flex: 1, textAlign: 'center' }}>
                              <p style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>
                                {m.equipe_domicile} <span style={{ color: colors.text.faint, fontWeight: 400 }}>vs</span> {m.equipe_exterieur}
                              </p>
                              {m.competition && <p style={{ margin: '2px 0 0', fontSize: '10px', color: colors.text.faint }}>{m.competition}</p>}
                            </div>
                            <button onClick={() => { const updated = calendarMatchs.filter((_, idx) => idx !== i); setCalendarMatchs(updated); localStorage.setItem('calendarMatchs', JSON.stringify(updated)) }}
                              style={{ background: 'none', border: 'none', color: colors.border.strong, fontSize: '14px', cursor: 'pointer', flexShrink: 0 }}><IcoX /></button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {calendarMatchs.length === 0 && !calendarLoading && (
                  <div style={{ ...st.card, textAlign: 'center', padding: '2rem', border: `1px dashed ${colors.border.subtle}` }}>
                    <p style={{ color: colors.border.strong, fontSize: '13px', margin: 0 }}>{t('comp_aucun_calendrier', lang)}</p>
                  </div>
                )}

                {/* ── Matchs à venir (sans score) — publiés dans matchs_equipe ── */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                    <p style={{ fontWeight: 700, fontSize: '14px', margin: 0 }}>{t('comp_matchs_a_venir', lang)}</p>
                    {canEdit('competition') && (
                      <button onClick={ouvrirModalCreerMatch} style={st.btnSolid}>+ {t('comp_ajouter_match', lang)}</button>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                    {grouperMatchsParMois(matchs.filter(m => !matchJoue(m)), false).map(([moisKey, { label, items }]) => (
                      <div key={moisKey}>
                        <p style={{ fontSize: '11px', fontWeight: 800, color: colors.accent.blue, textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 10px' }}>{label}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {items.map(m => {
                            const dispoStats = statsDispoMatch(m.id)
                            const aDesReponses = dispoStats.present + dispoStats.absent + dispoStats.blesse + dispoStats.malade + dispoStats.convoque > 0
                            return (
                            <div key={m.id} style={{ ...st.card, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ flex: 1 }}>
                                  <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{m.domicile ? 'vs' : '@'} {m.adversaire}</p>
                                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.faint }}>
                                    {new Date(m.date).toLocaleDateString(localeOf(lang), { weekday: 'short', day: 'numeric', month: 'short' })}
                                    {m.heure ? ` · ${m.heure}` : ''}
                                    {m.competition ? ` · ${m.competition}` : ''}
                                    {m.domicile ? ` · ${t('comp_domicile', lang)}` : ` · ${t('comp_exterieur', lang)}`}
                                  </p>
                                </div>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                                  <button onClick={() => { setConvocationsCoches({}); setModalSondageMatch(m); chargerConvocation(m.id) }} title="Sondage dispo" style={st.iconBtnDiscret(colors.accent.purple)}><IcoClipboard /></button>
                                  <button onClick={() => { setConvocationsCoches({}); setModalSondageMatch(m); chargerConvocation(m.id); setScrollVersConvocation(true) }} title="Convocation" style={st.iconBtnDiscret(colors.accent.green)}><IcoSend /></button>
                                  {canEdit('competition') && (
                                    <button onClick={() => ouvrirModalModifierMatch(m)} title={t('comp_modifier_match', lang)} style={st.iconBtnDiscret(colors.accent.blue)}><IcoEdit /></button>
                                  )}
                                  {canEdit('competition') && (
                                    <button
                                      onClick={async () => {
                                        if (!confirm(`Supprimer le match ${m.domicile ? 'vs' : '@'} ${m.adversaire} ?`)) return
                                        const { error: errStats } = await supabase.from('stats_match').delete().eq('match_id', m.id)
                                        if (errStats) { afficherToast(`Erreur : ${errStats.message}`, 'erreur'); return }
                                        const { error } = await supabase.from('matchs_equipe').delete().eq('id', m.id)
                                        if (error) { afficherToast(`Erreur : ${error.message}`, 'erreur'); return }
                                        setMatchs(prev => prev.filter(m2 => m2.id !== m.id))
                                        supprimerDeplacementLieAuMatch(m)
                                      }}
                                      title="Supprimer ce match"
                                      style={st.iconBtnDiscret(colors.accent.red)}
                                    >

                                    </button>
                                  )}
                                  {canEdit('stats') && (
                                    <button onClick={() => ouvrirModalMatchJoue(m)} style={{ background: colors.accent.green + '15', border: `1px solid ${colors.accent.green}50`, color: colors.accent.green, padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif' }}>{t('comp_marquer_joue', lang)}</button>
                                  )}
                                </div>
                              </div>
                              {aDesReponses && (
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '12px' }}>
                                  <span style={{ color: colors.accent.green }}>{dispoStats.present}</span>
                                  <span style={{ color: colors.accent.red }}>{dispoStats.absent}</span>
                                  <span style={{ color: colors.accent.orange }}>{dispoStats.blesse}</span>
                                  {dispoStats.malade > 0 && <span style={{ color: colors.accent.purple }}>{dispoStats.malade}</span>}
                                  {dispoStats.convoque > 0 && <span style={{ color: colors.accent.blue }}>{dispoStats.convoque}</span>}
                                  <span style={{ color: colors.text.dim }}>{dispoStats.sans_reponse} en attente</span>
                                </div>
                              )}
                            </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                    {matchs.filter(m => !matchJoue(m)).length === 0 && (
                      <p style={{ color: colors.text.disabled, fontSize: '12px', margin: 0 }}>{t('comp_aucun_match_a_venir', lang)}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Classement ── */}
            {competitionSubTab === 'classement' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px' }}>

                {/* Lien vers le classement officiel — persisté sur profil_educateur.ligue_url
                    (même champ que "Profil" et que ce que voient les joueurs sur leur
                    dashboard ; avant ce fix, stocké seulement en localStorage donc perdu
                    d'un navigateur/appareil à l'autre, et jamais visible des joueurs). */}
                <div style={st.card}>
                  <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: '14px' }}>{t('comp_classement_officiel', lang)}</p>
                  <p style={{ margin: '0 0 14px', fontSize: '12px', color: colors.text.faint }}>{t('comp_colle_lien_classement', lang)}</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      style={{ ...st.input, flex: 1 }}
                      placeholder="https://fff.fr/... ou https://footeo.com/..."
                      value={ligueUrl || profilEdu?.ligue_url || ''}
                      onChange={e => setLigueUrl(e.target.value)}
                    />
                    <button
                      disabled={savingLigueUrl}
                      onClick={async () => {
                        const url = (ligueUrl || profilEdu?.ligue_url || '').trim()
                        // Optimistic : le lien local se met à jour tout de
                        // suite, sans attendre la réponse Supabase ni un
                        // rechargement complet. Erreur → on revient en arrière.
                        const avant = profilEdu
                        setProfilEdu(prev => ({ ...prev, ligue_url: url }))
                        setSavingLigueUrl(true)
                        setLigueUrl('')
                        const { error } = await supabase.from('profil_educateur').upsert({ user_id: userId, ligue_url: url }, { onConflict: 'user_id' })
                        setSavingLigueUrl(false)
                        if (error) {
                          setProfilEdu(avant)
                          alert('Erreur : ' + error.message)
                        }
                      }}
                      style={{ ...st.btnSolid, opacity: savingLigueUrl ? 0.6 : 1 }}>
                      {savingLigueUrl ? '...' : t('btn_sauvegarder', lang)}
                    </button>
                  </div>
                  {profilEdu?.ligue_url && (
                    <a href={profilEdu.ligue_url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '14px', background: colors.accent.green + alpha.subtle, border: '1px solid #4ade8030', color: colors.accent.green, padding: '10px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
                      {t('comp_voir_classement', lang)} ↗
                    </a>
                  )}
                </div>

              </div>
            )}

            {/* ── Modale résultats "Sondage dispo" match ── */}
            {modalSondageMatch && (() => {
              const m = modalSondageMatch
              const reponses = reponsesDispoMatch(m.id)
              const nomsCoches = reponses.filter(j => convocationsCoches[j.id] ?? (j.statut === 'present' || j.statut === 'convoque')).map(j => `${j.prenom} ${j.nom}`)
              const copierConvocations = async () => {
                try {
                  await navigator.clipboard.writeText(nomsCoches.join(', '))
                  afficherToast(`${nomsCoches.length} joueur${nomsCoches.length > 1 ? 's' : ''} copié${nomsCoches.length > 1 ? 's' : ''}`)
                } catch { /* clipboard indisponible (contexte non sécurisé, permission refusée...) */ }
              }
              return (
                <div style={{ position: 'fixed', inset: 0, background: colors.background.overlay, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}>
                  <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: '16px' }}>Sondage dispo — {m.domicile ? 'vs' : '@'} {m.adversaire}</p>
                      <button onClick={() => setModalSondageMatch(null)} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '20px', cursor: 'pointer' }}><IcoX /></button>
                    </div>
                    <p style={{ fontSize: '12px', color: colors.text.faint, margin: '0 0 16px' }}>
                      {new Date(m.date).toLocaleDateString(localeOf(lang), { weekday: 'long', day: 'numeric', month: 'long' })}
                      {m.heure ? ` · ${m.heure}` : ''}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                      {reponses.map(j => {
                        const cfg = j.statut ? STATUT_CONFIG[j.statut] : null
                        return (
                          <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: colors.background.surfaceAlt, borderRadius: '10px' }}>
                            <Avatar person={j} size={32} />
                            <div style={{ flex: 1 }}>
                              <p style={{ fontWeight: 600, fontSize: '13px', margin: 0 }}>{j.prenom} {j.nom}</p>
                              {j.poste && <p style={{ fontSize: '10px', color: colors.text.faint, margin: 0 }}>{j.poste}</p>}
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: cfg?.color || colors.border.strong, background: cfg?.bg || colors.background.raised, border: `1px solid ${cfg?.border || colors.border.faint}`, padding: '3px 10px', borderRadius: '20px' }}>
                              {cfg ? cfg.label : t('ent_en_attente', lang)}
                            </span>
                          </div>
                        )
                      })}
                      {reponses.length === 0 && (
                        <p style={{ color: colors.text.disabled, fontSize: '12px', margin: 0 }}>Aucun joueur dans l'effectif.</p>
                      )}
                    </div>

                    <div style={{ ...st.card, background: colors.background.sunken }}>
                      <p style={{ fontWeight: 700, fontSize: '13px', margin: '0 0 4px' }}>Générer les convocations</p>
                      <p style={{ fontSize: '11px', color: colors.text.faint, margin: '0 0 12px' }}>Pré-coché : joueurs disponibles ou déjà convoqués. Décoche/coche pour ajuster, puis copie la liste.</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px', maxHeight: '200px', overflowY: 'auto' }}>
                        {reponses.map(j => {
                          const coche = convocationsCoches[j.id] ?? (j.statut === 'present' || j.statut === 'convoque')
                          return (
                            <label key={j.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer', padding: '4px 0' }}>
                              <input type="checkbox" checked={coche} onChange={() => setConvocationsCoches(prev => ({ ...prev, [j.id]: !coche }))} />
                              {j.prenom} {j.nom}
                            </label>
                          )
                        })}
                      </div>
                      <button onClick={copierConvocations} style={st.btnSolid} disabled={nomsCoches.length === 0}>
                        Copier la liste ({nomsCoches.length})
                      </button>
                    </div>

                    {/* ── Convocation officielle — publiée, visible en widget sur le
                        dashboard de chaque joueur convoqué jusqu'à expiration ── */}
                    <div ref={convocationSectionRef} style={{ ...st.card, background: colors.background.sunken, marginTop: '16px' }}>
                      <p style={{ fontWeight: 700, fontSize: '13px', margin: '0 0 4px' }}>Convocation officielle</p>
                      <p style={{ fontSize: '11px', color: colors.text.faint, margin: '0 0 12px' }}>
                        {convocationExistante ? `Publiée — disparaît du dashboard des joueurs le dimanche à 20h.` : `Reprend le groupe coché ci-dessus. Publier l'affiche comme un widget sur le dashboard de chaque joueur convoqué.`}
                      </p>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                        <div>
                          <label style={st.label}>Terrain</label>
                          <select style={st.input} value={convocationForm.type_terrain} onChange={e => setConvocationForm(f => ({ ...f, type_terrain: e.target.value }))}>
                            <option>Herbe</option>
                            <option>Synthétique</option>
                            <option>Indoor</option>
                          </select>
                        </div>
                        <div>
                          <label style={st.label}>Arbitre</label>
                          <input style={st.input} placeholder="Nom de l'arbitre" value={convocationForm.arbitre_nom} onChange={e => setConvocationForm(f => ({ ...f, arbitre_nom: e.target.value }))} />
                        </div>
                      </div>

                      <label style={st.label}>Programme de la journée</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                        {convocationForm.timeline.map((step, i) => (
                          <div key={i} style={{ display: 'flex', gap: '6px' }}>
                            <input placeholder="19h15" value={step.heure}
                              onChange={e => setConvocationForm(f => ({ ...f, timeline: f.timeline.map((s, idx) => idx === i ? { ...s, heure: e.target.value } : s) }))}
                              style={{ ...st.input, width: '80px', flexShrink: 0 }} />
                            <input placeholder="Étape" value={step.label}
                              onChange={e => setConvocationForm(f => ({ ...f, timeline: f.timeline.map((s, idx) => idx === i ? { ...s, label: e.target.value } : s) }))}
                              style={{ ...st.input, flex: 1 }} />
                            <button onClick={() => setConvocationForm(f => ({ ...f, timeline: f.timeline.filter((_, idx) => idx !== i) }))}
                              style={{ background: 'none', border: `1px solid ${colors.border.default}`, color: colors.accent.red, borderRadius: '6px', padding: '0 10px', cursor: 'pointer', fontSize: '13px' }}><IcoX /></button>
                          </div>
                        ))}
                        <button onClick={() => setConvocationForm(f => ({ ...f, timeline: [...f.timeline, { heure: '', label: '', icone: '' }] }))}
                          style={{ background: 'none', border: `1px dashed ${colors.border.strong}`, color: colors.text.faint, padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                          + Ajouter une étape
                        </button>
                      </div>

                      <label style={st.label}>Notes (facultatif)</label>
                      <textarea style={{ ...st.input, minHeight: '50px', resize: 'vertical', marginBottom: '12px' }} placeholder="Infos utiles pour les joueurs (adversaire, consignes...)"
                        value={convocationForm.notes} onChange={e => setConvocationForm(f => ({ ...f, notes: e.target.value }))} />

                      <button onClick={() => publierConvocation(m)} disabled={publiantConvocation} style={{ ...st.btnSolid, background: colors.accent.green, width: '100%', opacity: publiantConvocation ? 0.6 : 1 }}>
                        {publiantConvocation ? '...' : convocationExistante ? 'Mettre à jour la convocation' : 'Publier la convocation'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* ── Modale "Marquer comme joué" ── */}
            {modalMatchJoue && (
              <div style={{ position: 'fixed', inset: 0, background: colors.background.overlay, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}>
                <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: '16px' }}>{matchJoue(modalMatchJoue) ? 'Modifier le résultat' : t('comp_marquer_joue', lang)} — {modalMatchJoue.domicile ? 'vs' : '@'} {modalMatchJoue.adversaire}</p>
                    <button onClick={fermerModalMatchJoue} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '20px', cursor: 'pointer' }}><IcoX /></button>
                  </div>

                  {/* ── Scanner la feuille (pré-remplit score + stats ci-dessous) ── */}
                  <div style={{ border: `2px dashed ${colors.border.default}`, borderRadius: '10px', padding: '14px', marginBottom: '18px', background: colors.background.base }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      {scannerModalImagePreview
                        ? <img src={scannerModalImagePreview} alt="Feuille" style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', border: `1px solid ${colors.border.default}` }} />
                        : <span style={{ color: colors.text.faint }}><IcoFileText /></span>
                      }
                      <div style={{ flex: 1, minWidth: '180px' }}>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>{t('scan_feuille_titre', lang)}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.faint }}>{t('scan_feuille_desc', lang)}</p>
                      </div>
                      <input id="scanner-modal-input" type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={async e => {
                          const file = e.target.files[0]; if (!file) return
                          const { base64, preview } = await redimensionnerImagePourScan(file)
                          setScannerModalImageBase64(base64); setScannerModalImagePreview(preview)
                        }} />
                      <button onClick={() => document.getElementById('scanner-modal-input').click()} style={st.btn(colors.accent.blue)}>{t('seance_scanner', lang)}</button>
                      <button onClick={scannerFeuilleModal} disabled={!scannerModalImageBase64 || scannerModalLoading} style={{ ...st.btnSolid, opacity: !scannerModalImageBase64 ? 0.4 : 1 }}>
                        {scannerModalLoading ? `${libelleStatutGroq(scannerModalStatus)}` : `${t('seance_analyser_ia', lang)}`}
                      </button>
                    </div>
                    {scannerModalError && <p style={{ color: '#f87171', fontSize: '12px', margin: '10px 0 0' }}>{scannerModalError}</p>}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginBottom: '18px' }}>
                    <div style={{ flex: 1 }}><label style={st.label}>Score (nous)</label><input style={st.input} type="number" min="0" value={scoreJoueForm.score_nous} onChange={e => setScoreJoueForm(f => ({ ...f, score_nous: e.target.value }))} /></div>
                    <span style={{ color: colors.text.faint, paddingBottom: '10px', fontWeight: 700 }}>-</span>
                    <div style={{ flex: 1 }}><label style={st.label}>Score (eux)</label><input style={st.input} type="number" min="0" value={scoreJoueForm.score_eux} onChange={e => setScoreJoueForm(f => ({ ...f, score_eux: e.target.value }))} /></div>
                  </div>

                  {/* ── Minutes des buts (manuel, ou pré-rempli par le scan IA ci-dessus) ── */}
                  <div style={{ marginBottom: '18px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Minutes des buts</p>
                    {scannerModalButsDetail.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                        {scannerModalButsDetail.map((b, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input type="number" min="0" max="120" placeholder="Min" value={b.minute}
                              onChange={e => setScannerModalButsDetail(prev => prev.map((x, i) => i === idx ? { ...x, minute: e.target.value === '' ? '' : parseInt(e.target.value) } : x))}
                              style={{ ...st.input, width: '70px', padding: '6px 8px', fontSize: '13px' }} />
                            <select value={b.equipe} onChange={e => setScannerModalButsDetail(prev => prev.map((x, i) => i === idx ? { ...x, equipe: e.target.value } : x))}
                              style={{ ...st.input, width: '110px', padding: '6px 8px', fontSize: '13px' }}>
                              <option value="nous">Nous</option>
                              <option value="eux">Eux</option>
                            </select>
                            <select value={b.nature || ''} onChange={e => setScannerModalButsDetail(prev => prev.map((x, i) => i === idx ? { ...x, nature: e.target.value } : x))}
                              style={{ ...st.input, width: '160px', padding: '6px 8px', fontSize: '13px' }}>
                              <option value="">Nature —</option>
                              {NATURES_BUT.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                            </select>
                            <select value={b.cote || ''} onChange={e => setScannerModalButsDetail(prev => prev.map((x, i) => i === idx ? { ...x, cote: e.target.value } : x))}
                              style={{ ...st.input, width: '110px', padding: '6px 8px', fontSize: '13px' }}>
                              <option value="">Côté —</option>
                              {COTES_BUT.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                            <button onClick={() => setScannerModalButsDetail(prev => prev.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: colors.accent.red, cursor: 'pointer', fontSize: '16px' }}><IcoX /></button>
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={() => setScannerModalButsDetail(prev => [...prev, { minute: '', equipe: 'nous', nature: '', cote: '' }])} style={{ ...st.btn(colors.text.dim), padding: '6px 12px', fontSize: '12px' }}>+ Ajouter un but</button>
                  </div>

                  <p style={{ fontSize: '11px', fontWeight: 700, color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>{t('comp_feuille_match', lang)}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowX: 'auto' }}>
                    {joueurs.map(j => {
                      const key = modalMatchJoue.id
                      const s = (statsMatch[key] || {})[j.id] || {}
                      const val = (field) => s[field] !== undefined ? s[field] : ''
                      return (
                        <div key={j.id} style={{ display: 'grid', gridTemplateColumns: '140px 64px 64px 64px 64px 36px 36px', gap: '6px', alignItems: 'center' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.prenom} {j.nom?.[0] || ""}.</span>
                          <input type="number" placeholder="Min" min="0" max="120" value={val('minutes')}
                            onChange={e => setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || {}), minutes: parseInt(e.target.value) || 0 } } }))}
                            style={{ ...st.input, padding: '8px', fontSize: '15px', textAlign: 'center' }} />
                          <input type="number" placeholder="Buts" min="0" value={val('buts')}
                            onChange={e => setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || {}), buts: parseInt(e.target.value) || 0 } } }))}
                            style={{ ...st.input, padding: '8px', fontSize: '15px', textAlign: 'center' }} />
                          <input type="number" placeholder="PD" min="0" value={val('passes_dec')}
                            onChange={e => setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || {}), passes_dec: parseInt(e.target.value) || 0 } } }))}
                            style={{ ...st.input, padding: '8px', fontSize: '15px', textAlign: 'center' }} />
                          <input type="number" placeholder="CS" min="0" max="1" value={val('clean_sheet') ? 1 : 0}
                            onChange={e => setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || {}), clean_sheet: e.target.value === '1' } } }))}
                            style={{ ...st.input, padding: '8px', fontSize: '15px', textAlign: 'center' }} />
                          <span title={t('comp_carton_jaune', lang)} style={{ cursor: 'pointer', display: 'inline-block', width: '12px', height: '16px', borderRadius: '2px', background: colors.accent.amber, opacity: val('carton_jaune') ? 1 : 0.25 }}
                            onClick={() => setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || {}), carton_jaune: !val('carton_jaune') } } }))} />
                          <span title={t('comp_carton_rouge', lang)} style={{ cursor: 'pointer', display: 'inline-block', width: '12px', height: '16px', borderRadius: '2px', background: colors.accent.red, opacity: val('carton_rouge') ? 1 : 0.25 }}
                            onClick={() => setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || {}), carton_rouge: !val('carton_rouge') } } }))} />
                        </div>
                      )
                    })}
                  </div>
                  <p style={{ fontSize: '13px', color: colors.text.faint, margin: '10px 0 0' }}>Min · Buts · PD · CS</p>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
                    <button onClick={marquerMatchJoue} disabled={savingMatchJoue} style={st.btnSolid}>{savingMatchJoue ? 'Sauvegarde...' : `${t('btn_sauvegarder', lang)}`}</button>
                    <button onClick={fermerModalMatchJoue} style={st.btn(colors.text.dim)}>{t('btn_annuler', lang)}</button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Modale "Ajouter / Modifier un match" ── */}
            {modalMatchForm && (
              <div style={{ position: 'fixed', inset: 0, background: colors.background.overlay, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: '16px' }}>
                      {modalMatchForm.id ? `${t('comp_modifier_match', lang)}` : `+ ${t('comp_ajouter_match', lang)}`}
                    </p>
                    <button onClick={() => setModalMatchForm(null)} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '20px', cursor: 'pointer' }}><IcoX /></button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ gridColumn: '1 / -1' }}><label style={st.label}>{t('comp_adversaire', lang)}</label><input style={st.input} placeholder="Nom de l'équipe" value={modalMatchForm.adversaire} onChange={e => setModalMatchForm(f => ({ ...f, adversaire: e.target.value }))} /></div>
                    <div><label style={st.label}>{t('ent_date', lang)}</label><input style={st.input} type="date" value={modalMatchForm.date} onChange={e => setModalMatchForm(f => ({ ...f, date: e.target.value }))} /></div>
                    <div><label style={st.label}>{t('ent_heure_optionnel', lang)}</label><input style={st.input} type="time" value={modalMatchForm.heure} onChange={e => setModalMatchForm(f => ({ ...f, heure: e.target.value }))} /></div>
                    <div>
                      <label style={st.label}>{t('comp_type_match', lang)}</label>
                      <select style={st.input} value={modalMatchForm.competition} onChange={e => setModalMatchForm(f => ({ ...f, competition: e.target.value }))}>
                        <option value="">—</option>
                        <option value="Championnat">{t('comp_type_championnat', lang)}</option>
                        <option value="Coupe">{t('comp_type_coupe', lang)}</option>
                        <option value="Amical">{t('comp_type_amical', lang)}</option>
                      </select>
                    </div>
                    <div>
                      <label style={st.label}>{t('comp_lieu', lang)}</label>
                      <input style={st.input} placeholder="Ex: Stade municipal" value={modalMatchForm.lieu} onChange={e => setModalMatchForm(f => ({ ...f, lieu: e.target.value }))} />
                    </div>
                    {!modalMatchForm.domicile && (
                      <div>
                        <label style={st.label}>Ville (pour calculer le trajet)</label>
                        <input style={st.input} placeholder="Ex: Lyon" value={modalMatchForm.ville} onChange={e => setModalMatchForm(f => ({ ...f, ville: e.target.value }))} />
                      </div>
                    )}
                    <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: colors.text.secondary }}>
                        <input type="checkbox" checked={modalMatchForm.domicile} onChange={e => setModalMatchForm(f => ({ ...f, domicile: e.target.checked }))} />
                        {t('comp_domicile', lang)}
                      </label>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={sauvegarderMatchForm} disabled={savingMatchForm || !modalMatchForm.adversaire || !modalMatchForm.date} style={st.btnSolid}>
                      {savingMatchForm ? 'Sauvegarde...' : `${t('btn_sauvegarder', lang)}`}
                    </button>
                    <button onClick={() => setModalMatchForm(null)} style={st.btn(colors.text.dim)}>{t('btn_annuler', lang)}</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ===== DÉPLACEMENTS ===== */}
        {activeSection === 'deplacements' && (
          clubAffiliation?.club_id && clubAffiliation.statut === 'accepte' ? (
            <Deplacements clubId={clubAffiliation.club_id} accentColor={colors.accent.blue} />
          ) : (
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>{t('nav_deplacements', lang)}</h1>
              <p style={{ color: colors.text.faint, fontSize: '13px', marginTop: '1rem' }}>
                {clubAffiliation?.statut === 'en_attente'
                  ? `Ta demande d'affiliation à ${clubAffiliation.club?.club || 'ce club'} est en attente d'acceptation — le club doit d'abord la valider (onglet Éducateurs).`
                  : 'Rejoins un club (code club, dans ton profil) pour accéder aux déplacements.'}
              </p>
            </div>
          )
        )}

        {/* ===== TERRAINS ===== */}
        {activeSection === 'terrains' && (
          clubAffiliation?.club_id && clubAffiliation.statut === 'accepte' ? (
            <PlanningTerrains clubId={clubAffiliation.club_id} mode="educateur" userId={userId} accentColor={colors.accent.blue} />
          ) : (
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>{t('nav_terrains', lang)}</h1>
              <p style={{ color: colors.text.faint, fontSize: '13px', marginTop: '1rem' }}>
                {clubAffiliation?.statut === 'en_attente'
                  ? `Ta demande d'affiliation à ${clubAffiliation.club?.club || 'ce club'} est en attente d'acceptation — le club doit d'abord la valider (onglet Éducateurs).`
                  : 'Rejoins un club (code club, dans ton profil) pour accéder au planning des terrains.'}
              </p>
            </div>
          )
        )}

        {/* ===== MON MATÉRIEL ===== */}
        {activeSection === 'materiel' && (() => {
          const STATUT_MATERIEL = {
            distribue:        { label: 'Distribué',        color: colors.accent.blue,  desc: 'En ta possession.' },
            remise_demandee:  { label: 'Remise demandée',  color: colors.accent.amber, desc: 'En attente de validation par le club.' },
            remis:            { label: 'Remis',            color: colors.accent.green, desc: 'Remise validée par le club.' },
            refuse:           { label: 'Refusé',            color: colors.accent.red,   desc: "La demande de remise n'a pas été validée." },
          }
          // Regroupe par lot_id (plusieurs articles distribués en une seule fois) —
          // les lignes sans lot_id (anciennes distributions) forment leur propre groupe.
          const lotsMateriel = []
          const lotsMaterielParId = {}
          monMateriel.forEach(d => {
            const cle = d.lot_id || d.id
            if (!lotsMaterielParId[cle]) { lotsMaterielParId[cle] = { cle, items: [], ref: d }; lotsMateriel.push(lotsMaterielParId[cle]) }
            lotsMaterielParId[cle].items.push(d)
          })
          return (
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>Mon matériel</h1>
            <p style={{ color: colors.text.faint, fontSize: '13px', marginBottom: '1.5rem' }}>Matériel confié par le club — demande la remise en fin de saison, le club valide.</p>
            {!clubAffiliation?.club_id || clubAffiliation.statut !== 'accepte' ? (
              <p style={{ color: colors.text.faint, fontSize: '13px' }}>Rejoins un club (code club, dans ton profil) pour voir ton matériel.</p>
            ) : (
              <>
              {equipementPretEduc && (
                <div style={{ background: '#1a1200', border: `2px solid ${colors.accent.amber}`, borderRadius: '16px', padding: '18px', marginBottom: '20px' }}>
                  <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '15px' }}>Ton équipement est prêt !</p>
                  <p style={{ margin: '0 0 12px', fontSize: '13px', color: colors.text.faint }}>
                    {equipementPretEduc.jours || 'Passe le récupérer auprès du club'}
                    {equipementPretEduc.heure_debut && equipementPretEduc.heure_fin ? ` · entre ${equipementPretEduc.heure_debut} et ${equipementPretEduc.heure_fin}` : ''}
                    {equipementPretEduc.heure_debut_2 && equipementPretEduc.heure_fin_2 ? ` puis entre ${equipementPretEduc.heure_debut_2} et ${equipementPretEduc.heure_fin_2}` : ''}
                  </p>
                  <button onClick={marquerEquipementRecupereEduc} style={{ background: colors.accent.amber, color: colors.black, border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>J'ai récupéré</button>
                </div>
              )}

              {equipementCommandeEduc?.statut === 'recupere' && equipementCommandeEduc?.recupere_le && (
                <div style={{ background: colors.accent.green + alpha.subtle, border: `1px solid ${colors.accent.green}40`, borderRadius: '16px', padding: '18px', marginBottom: '20px' }}>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '15px', color: colors.accent.green }}>Équipement remis le {new Date(equipementCommandeEduc.recupere_le).toLocaleDateString('fr-FR')} à {new Date(equipementCommandeEduc.recupere_le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              )}

              {champsEquipementEduc.length > 0 && (
                <div style={{ ...st.card, marginBottom: '20px' }}>
                  <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '15px' }}>Mon équipement — {packAttribueEduc?.icone} {packAttribueEduc?.nom}</p>
                  <p style={{ margin: '0 0 16px', fontSize: '12px', color: colors.text.faint }}>Renseigne tes tailles pour que le club puisse préparer ton équipement.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {champsEquipementEduc.map(c => {
                      const valeur = mesTaillesEduc.find(t => t.champ_id === c.id)?.valeur || ''
                      return (
                        <div key={c.id}>
                          <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 700, color: colors.text.dim, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{c.nom}</p>
                          {c.taille_unique ? (
                            <p style={{ margin: 0, fontSize: '13px', color: colors.text.faint, fontStyle: 'italic' }}>Taille unique</p>
                          ) : (
                            <select value={valeur} onChange={e => sauvegarderMaTailleEduc(c.id, e.target.value)}
                              style={{ width: '100%', maxWidth: '240px', background: colors.background.raised, border: `1px solid ${valeur ? colors.accent.green : colors.border.default}`, borderRadius: '8px', padding: '9px 12px', color: valeur ? colors.accent.green : colors.text.dim, fontSize: '13px', fontWeight: 700, fontFamily: 'Inter, sans-serif', outline: 'none', cursor: 'pointer' }}>
                              <option value="">Choisir une taille</option>
                              {c.options.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              </>
            )}
            {!clubAffiliation?.club_id || clubAffiliation.statut !== 'accepte' ? null : lotsMateriel.length === 0 ? (
              <p style={{ color: colors.text.disabled, fontSize: '13px', fontStyle: 'italic' }}>Aucun matériel confié pour l'instant.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {lotsMateriel.map(lot => {
                  const d = lot.ref
                  const conf = STATUT_MATERIEL[d.statut] || STATUT_MATERIEL.distribue
                  return (
                    <div key={lot.cle} style={st.card}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: conf.color, display: 'inline-block', flexShrink: 0, marginTop: '4px' }} />
                          <div>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{d.equipe_nom || 'Matériel'}</p>
                            <p style={{ margin: '0 0 6px', fontSize: '12px', color: colors.text.faint }}>Saison {d.saison} · <span style={{ color: conf.color, fontWeight: 600 }}>{conf.label}</span> — {conf.desc}</p>
                            {lot.items.map(item => (
                              <p key={item.id} style={{ margin: 0, fontSize: '12px', color: colors.text.dim }}>{item.nom_materiel} × {item.quantite}</p>
                            ))}
                          </div>
                        </div>
                        {d.statut === 'distribue' && (
                          <button onClick={() => demanderRemiseMateriel(d)} style={st.btn(colors.accent.amber)}>Remis</button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          )
        })()}

        {/* ===== ENTRAÎNEMENTS ===== */}
        {activeSection === 'entrainements' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>{t('ent_titre', lang)}</h1>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: colors.text.faint }}>{entrainements.length} {t('ent_seances_count', lang)} · {t('ent_sous_titre', lang)}</p>
              </div>
              {canEdit('entrainements') && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => { setShowPlanificateur(true); setShowAddEntrainement(false) }} style={st.btn(colors.accent.blue)}>📅 {t('ent_planifier_saison', lang)}</button>
                  <button onClick={() => { setShowAddEntrainement(true); setShowPlanificateur(false) }} style={st.btnSolid}>+ {t('ent_bouton_seance', lang)}</button>
                </div>
              )}
            </div>

            {/* ── Sous-onglets ── */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {[
                { id: 'prochaine', label: `📋 ${t('ent_sous_onglet_prochaine', lang)}` },
                { id: 'liste', label: `📁 ${t('ent_sous_onglet_liste', lang)}` },
              ].map(tab => (
                <button key={tab.id} onClick={() => setSousOngletEnt(tab.id)}
                  style={{ background: sousOngletEnt === tab.id ? colors.accent.blue + alpha.subtle : 'transparent', border: `1px solid ${sousOngletEnt === tab.id ? colors.accent.blue + alpha.medium : colors.border.default}`, color: sousOngletEnt === tab.id ? colors.accent.blue : colors.text.faint, padding: '8px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  {tab.label}
                </button>
              ))}
            </div>

            <SondageSemaine mode="educateur" userId={userId} accentColor={colors.accent.blue} />

            {sousOngletEnt === 'prochaine' && (() => {
              const aujourdHui = new Date().toISOString().split('T')[0]
              const prochaineSeance = [...entrainements].filter(e => e.date >= aujourdHui).sort((a, b) => new Date(a.date) - new Date(b.date))[0] || null

              if (!prochaineSeance) {
                return (
                  <div style={{ ...st.card, textAlign: 'center', padding: '3rem' }}>
                    <p style={{ color: colors.text.faint, margin: '0 0 8px' }}>{t('ent_aucune_prochaine_seance', lang)}</p>
                  </div>
                )
              }

              const reponses = joueurs.map(j => ({ ...j, statut: j.joueur_id ? dispoJoueurs[prochaineSeance.id]?.[j.joueur_id] || null : null }))
              const total = reponses.length
              const stats = { present: 0, absent: 0, blesse: 0, malade: 0, convoque: 0, sans_reponse: 0 }
              reponses.forEach(j => { if (j.statut) stats[j.statut]++; else stats.sans_reponse++ })
              const clos = sondageEstClos(prochaineSeance)
              const delaiCloture = prochaineSeance.cloture_sondage_avant ?? null

              // Les 4 actions ci-dessous suivent le même schéma optimistic :
              // l'état local (entrainements) se met à jour tout de suite, sans
              // attendre la réponse Supabase ; en cas d'erreur on revient en
              // arrière (aucune n'avait de gestion d'erreur avant).
              const cloturerSondage = async () => {
                setEntrainements(prev => prev.map(e => e.id === prochaineSeance.id ? { ...e, sondage_clos: true } : e))
                setSavingCloture(true)
                const { error } = await supabase.from('entrainements').update({ sondage_clos: true }).eq('id', prochaineSeance.id)
                setSavingCloture(false)
                if (error) {
                  setEntrainements(prev => prev.map(e => e.id === prochaineSeance.id ? { ...e, sondage_clos: false } : e))
                  alert('Erreur : ' + error.message)
                }
              }
              const rouvrirSondage = async () => {
                setEntrainements(prev => prev.map(e => e.id === prochaineSeance.id ? { ...e, sondage_clos: false } : e))
                const { error } = await supabase.from('entrainements').update({ sondage_clos: false }).eq('id', prochaineSeance.id)
                if (error) {
                  setEntrainements(prev => prev.map(e => e.id === prochaineSeance.id ? { ...e, sondage_clos: true } : e))
                  alert('Erreur : ' + error.message)
                }
              }
              const sauvegarderDelaiCloture = async (heures) => {
                const avant = prochaineSeance.cloture_sondage_avant
                setEntrainements(prev => prev.map(e => e.id === prochaineSeance.id ? { ...e, cloture_sondage_avant: heures } : e))
                const { error } = await supabase.from('entrainements').update({ cloture_sondage_avant: heures }).eq('id', prochaineSeance.id)
                if (error) {
                  setEntrainements(prev => prev.map(e => e.id === prochaineSeance.id ? { ...e, cloture_sondage_avant: avant } : e))
                  alert('Erreur : ' + error.message)
                }
              }
              // La clôture auto se calcule par rapport à l'heure de la séance (cf.
              // sondageHeureCloture) — sans heure renseignée, "1h/5h/24h avant" est
              // enregistré mais n'a aucun effet, ce qui donnait l'impression que ces
              // boutons ne faisaient rien.
              const heureCloture = sondageHeureCloture(prochaineSeance)
              const sauvegarderHeureSeance = async (heure) => {
                const avant = prochaineSeance.heure
                setEntrainements(prev => prev.map(e => e.id === prochaineSeance.id ? { ...e, heure } : e))
                setSavingHeureSeance(true)
                const { error } = await supabase.from('entrainements').update({ heure }).eq('id', prochaineSeance.id)
                setSavingHeureSeance(false)
                if (error) {
                  setEntrainements(prev => prev.map(e => e.id === prochaineSeance.id ? { ...e, heure: avant } : e))
                  alert('Erreur : ' + error.message)
                }
              }

              return (
                <div>
                  {/* En-tête séance */}
                  <div style={{ ...st.card, marginBottom: '16px', background: 'linear-gradient(135deg, #0d1a0d, #111)', border: '1px solid #4ade8020' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <p style={{ fontSize: '11px', color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>{t('ent_sous_onglet_prochaine', lang)}</p>
                        <h2 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '4px' }}>{prochaineSeance.description || t('ent_seance_generique', lang)}</h2>
                        <p style={{ fontSize: '13px', color: colors.text.faint }}>
                          {new Date(prochaineSeance.date + 'T12:00:00').toLocaleDateString(localeOf(lang), { weekday: 'long', day: 'numeric', month: 'long' })}
                          {prochaineSeance.heure ? ` · ${prochaineSeance.heure}` : ''}
                        </p>
                      </div>
                      <span style={{ background: clos ? colors.accent.red + alpha.subtle : colors.accent.green + alpha.subtle, border: `1px solid ${clos ? colors.accent.red + alpha.medium : colors.accent.green + alpha.medium}`, color: clos ? colors.accent.red : colors.accent.green, padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
                        {clos ? `🔒 ${t('ent_sondage_clos', lang)}` : `🟢 ${t('ent_sondage_ouvert', lang)}`}
                      </span>
                    </div>
                    {prochaineSeance.fiche_id ? (
                      <button
                        onClick={() => { const s = mesSeancesOuvertes.find(x => x.id === prochaineSeance.fiche_id); if (s) setFicheApercu(s) }}
                        style={{ marginTop: '14px', background: 'transparent', border: '1px solid #4ade8040', color: colors.accent.green, padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                        📄 Voir la fiche
                      </button>
                    ) : canEdit('entrainements') && (
                      <button
                        onClick={() => setModalImportFicheEntrainement(prochaineSeance.id)}
                        style={{ marginTop: '14px', background: 'transparent', border: '1px solid #4ade8040', color: colors.accent.green, padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                        🔗 Attacher une fiche
                      </button>
                    )}
                  </div>

                  {/* Stats réponses */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                    {[
                      { key: 'present', label: t('ent_stat_presents', lang), emoji: '✅', color: colors.accent.green },
                      { key: 'absent', label: t('ent_stat_absents', lang), emoji: '❌', color: colors.accent.red },
                      { key: 'blesse', label: t('ent_stat_blesses', lang), emoji: '🤕', color: colors.accent.orange },
                      { key: 'malade', label: t('ent_stat_malades', lang), emoji: '🤒', color: colors.accent.purple },
                      { key: 'convoque', label: t('ent_stat_convoques', lang), emoji: '🏆', color: colors.accent.blue },
                      { key: 'sans_reponse', label: t('ent_stat_sans_reponse', lang), emoji: '⏳', color: colors.text.faint },
                    ].map(s => (
                      <div key={s.key} style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                        <p style={{ fontSize: '22px', fontWeight: 900, color: s.color, lineHeight: 1 }}>{stats[s.key] || 0}</p>
                        <p style={{ fontSize: '9px', color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Barre de progression */}
                  <div style={{ ...st.card, marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <p style={{ fontSize: '12px', color: colors.text.faint }}>{t('ent_taux_reponse', lang)}</p>
                      <p style={{ fontSize: '12px', fontWeight: 700 }}>{total - stats.sans_reponse}/{total} {t('equipe_joueurs', lang)}</p>
                    </div>
                    <div style={{ background: colors.background.raised, borderRadius: '6px', height: '6px', overflow: 'hidden' }}>
                      <div style={{ width: `${total > 0 ? ((total - stats.sans_reponse) / total * 100) : 0}%`, height: '100%', background: colors.accent.green, borderRadius: '6px', transition: 'width 0.3s' }} />
                    </div>
                  </div>

                  {/* Réponses individuelles */}
                  <div style={{ ...st.card, marginBottom: '16px' }}>
                    <p style={{ fontWeight: 700, fontSize: '13px', marginBottom: '14px' }}>{t('ent_reponses_individuelles', lang)}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {reponses.map(j => {
                        const cfg = j.statut ? STATUT_CONFIG[j.statut] : null
                        return (
                          <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: colors.background.surfaceAlt, borderRadius: '10px' }}>
                            <Avatar person={j} size={32} />
                            <div style={{ flex: 1 }}>
                              <p style={{ fontWeight: 600, fontSize: '13px' }}>{j.prenom} {j.nom}</p>
                              <p style={{ fontSize: '10px', color: colors.text.faint }}>{j.poste}</p>
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: cfg?.color || colors.border.strong, background: cfg?.bg || colors.background.raised, border: `1px solid ${cfg?.border || colors.border.faint}`, padding: '3px 10px', borderRadius: '20px' }}>
                              {cfg ? `${cfg.emoji} ${cfg.label}` : `⏳ ${t('ent_en_attente', lang)}`}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Paramètres clôture */}
                  {canEdit('entrainements') && (
                    <div style={{ ...st.card, marginBottom: '16px' }}>
                      <p style={{ fontWeight: 700, fontSize: '13px', marginBottom: '14px' }}>⏱️ {t('ent_cloture_auto_titre', lang)}</p>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                        {[
                          { val: null, label: t('ent_pas_de_cloture', lang) },
                          { val: 1, label: `1h ${t('ent_avant', lang)}` },
                          { val: 5, label: `5h ${t('ent_avant', lang)}` },
                          { val: 24, label: `24h ${t('ent_avant', lang)}` },
                        ].map(opt => (
                          <button key={String(opt.val)} onClick={() => sauvegarderDelaiCloture(opt.val)}
                            style={{ background: delaiCloture === opt.val ? colors.accent.blue + alpha.soft : 'transparent', border: `1px solid ${delaiCloture === opt.val ? '#60a5fa50' : colors.border.default}`, color: delaiCloture === opt.val ? colors.accent.blue : colors.text.faint, padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <p style={{ fontSize: '11px', color: colors.text.disabled, marginBottom: '14px' }}>
                        {delaiCloture ? t('ent_cloture_desc', lang).replace('{h}', delaiCloture) : t('ent_pas_de_cloture_desc', lang)}
                        {delaiCloture && heureCloture && (
                          <> — clôture à {heureCloture.toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'short' })} {heureCloture.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</>
                        )}
                      </p>
                      {delaiCloture && !prochaineSeance.heure && (
                        <div style={{ background: colors.accent.orange + alpha.subtle, border: '1px solid #f9731640', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <p style={{ fontSize: '11px', color: colors.accent.orange, margin: 0, flex: 1, minWidth: '200px' }}>
                            ⚠️ Cette séance n'a pas d'heure renseignée : la clôture auto ne peut pas se déclencher tant qu'elle est absente.
                          </p>
                          <input type="time" style={{ ...st.input, width: 'auto' }} disabled={savingHeureSeance}
                            onChange={e => e.target.value && sauvegarderHeureSeance(e.target.value)} />
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '10px' }}>
                        {!clos ? (
                          <button onClick={cloturerSondage} disabled={savingCloture}
                            style={{ background: colors.accent.red + alpha.subtle, border: '1px solid #ef444430', color: colors.accent.red, padding: '9px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', opacity: savingCloture ? 0.5 : 1 }}>
                            🔒 {t('ent_cloturer_maintenant', lang)}
                          </button>
                        ) : (
                          <button onClick={rouvrirSondage}
                            style={{ background: colors.accent.blue + alpha.subtle, border: '1px solid #60a5fa30', color: colors.accent.blue, padding: '9px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                            🔓 {t('ent_rouvrir_sondage', lang)}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {sousOngletEnt === 'liste' && (
            <>
            {permissions?.entrainements === 'lecture' && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: colors.accent.blue + alpha.subtle, border: '1px solid #60a5fa30', color: colors.accent.blue, fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, marginBottom: 16 }}>
                👁 {t('equipe_mode_lecture', lang)}
              </div>
            )}

            {/* ── Ajout séance unique ── */}
            {showAddEntrainement && canEdit('entrainements') && (
              <div style={{ ...st.card, border: '1px solid #4ade8030', marginBottom: '1.5rem' }}>
                <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: '14px' }}>➕ {t('seance_nouvelle', lang)}</p>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 2fr', gap: '12px', marginBottom: '12px' }}>
                  <div><label style={st.label}>{t('ent_date', lang)}</label><input style={st.input} type="date" value={newEntrainement.date} onChange={e => setNewEntrainement({ ...newEntrainement, date: e.target.value })} /></div>
                  <div><label style={st.label}>{t('ent_heure_optionnel', lang)}</label><input style={st.input} type="time" value={newEntrainement.heure} onChange={e => setNewEntrainement({ ...newEntrainement, heure: e.target.value })} /></div>
                  <div><label style={st.label}>{t('ent_theme_optionnel', lang)}</label><input style={st.input} placeholder="Ex: Travail défensif, Jeu de transition..." value={newEntrainement.description} onChange={e => setNewEntrainement({ ...newEntrainement, description: e.target.value })} /></div>
                  <div><label style={st.label}>{t('ent_lieu', lang)}</label><input style={st.input} placeholder="Ex: Stade municipal" value={newEntrainement.lieu} onChange={e => setNewEntrainement({ ...newEntrainement, lieu: e.target.value })} /></div>
                </div>

                {/* ── Import d'une fiche archivée ── */}
                <div style={{ marginBottom: '12px' }}>
                  {newEntrainement.fiche_id ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: colors.accent.purpleLight + alpha.subtle, border: '1px solid #a78bfa30', color: colors.accent.purpleLight, fontSize: '12px', fontWeight: 600, padding: '6px 12px', borderRadius: '20px' }}>
                      📄 {t('ent_fiche_importee', lang)}
                      <span onClick={() => setNewEntrainement({ ...newEntrainement, fiche_id: null })} style={{ cursor: 'pointer', fontWeight: 900 }}>✕</span>
                    </div>
                  ) : (
                    <button onClick={() => setShowImportFiche(v => !v)} style={{ background: 'transparent', border: '1px solid #a78bfa40', color: colors.accent.purpleLight, padding: '7px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                      📥 {t('ent_importer_fiche', lang)}
                    </button>
                  )}

                  {showImportFiche && (
                    <div style={{ marginTop: '10px', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: '10px', padding: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                      {mesSeancesOuvertes.length === 0 ? (
                        <p style={{ fontSize: '12px', color: colors.text.disabled, padding: '8px' }}>{t('ent_aucune_fiche_archivee', lang)}</p>
                      ) : mesSeancesOuvertes.map(s => (
                        <div key={s.id} onClick={() => importerFicheDansEntrainement(s)}
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = colors.background.raised}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.theme || t('seance_sans_theme', lang)}</p>
                            <p style={{ margin: 0, fontSize: '11px', color: colors.text.faint }}>{s.date_seance ? new Date(s.date_seance).toLocaleDateString(localeOf(lang)) : ''}</p>
                          </div>
                          <span style={{ fontSize: '11px', color: colors.accent.purpleLight, flexShrink: 0 }}>{t('ent_choisir', lang)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={ajouterEntrainement} style={st.btnSolid}>{t('ent_creer_seance', lang)}</button>
                  <button onClick={() => { setShowAddEntrainement(false); setShowImportFiche(false) }} style={st.btn(colors.text.dim)}>{t('btn_annuler', lang)}</button>
                </div>
              </div>
            )}

            {/* ── Planificateur récurrent ── */}
            {showPlanificateur && canEdit('entrainements') && (
              <div style={{ ...st.card, border: '1px solid #60a5fa30', marginBottom: '1.5rem' }}>
                <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '15px', color: colors.accent.blue }}>📅 {t('ent_planifier_saison', lang)}</p>
                <p style={{ margin: '0 0 16px', fontSize: '12px', color: colors.text.faint }}>{t('ent_choisis_jours', lang)}</p>

                {/* Jours de la semaine */}
                <label style={st.label}>{t('ent_jours_entrainement', lang)}</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {[['Lun',1],['Mar',2],['Mer',3],['Jeu',4],['Ven',5],['Sam',6],['Dim',0]].map(([label, num]) => {
                    const actif = planSaison.joursActifs.includes(num)
                    return (
                      <button key={num} onClick={() => toggleJourPlan(num)}
                        style={{ padding: '8px 14px', borderRadius: '10px', border: `2px solid ${actif ? colors.accent.blue : colors.border.default}`, background: actif ? colors.accent.blue + alpha.soft : colors.background.raised, color: actif ? colors.accent.blue : colors.text.dim, fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s' }}>
                        {label}
                      </button>
                    )
                  })}
                </div>

                {/* Dates + thème */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 2fr', gap: '12px', marginBottom: '16px' }}>
                  <div><label style={st.label}>{t('ent_debut_saison', lang)}</label><input style={st.input} type="date" value={planSaison.dateDebut} onChange={e => setPlanSaison(p => ({ ...p, dateDebut: e.target.value }))} /></div>
                  <div><label style={st.label}>{t('ent_fin_saison', lang)}</label><input style={st.input} type="date" value={planSaison.dateFin} onChange={e => setPlanSaison(p => ({ ...p, dateFin: e.target.value }))} /></div>
                  <div><label style={st.label}>{t('ent_theme_defaut', lang)}</label><input style={st.input} placeholder="Ex: Entraînement, Préparation physique..." value={planSaison.theme} onChange={e => setPlanSaison(p => ({ ...p, theme: e.target.value }))} /></div>
                </div>

                {/* Aperçu du nombre de séances */}
                {planSaison.dateDebut && planSaison.dateFin && planSaison.joursActifs.length > 0 && (() => {
                  let count = 0
                  const cur = new Date(planSaison.dateDebut)
                  const end = new Date(planSaison.dateFin)
                  while (cur <= end) { if (planSaison.joursActifs.includes(cur.getDay())) count++; cur.setDate(cur.getDate() + 1) }
                  const existingDates = new Set(entrainements.map(e => e.date?.substring(0, 10)))
                  let newCount = 0
                  const cur2 = new Date(planSaison.dateDebut)
                  while (cur2 <= end) { if (planSaison.joursActifs.includes(cur2.getDay()) && !existingDates.has(cur2.toISOString().split('T')[0])) newCount++; cur2.setDate(cur2.getDate() + 1) }
                  return (
                    <div style={{ background: '#60a5fa10', border: '1px solid #60a5fa20', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: colors.accent.blue }}>
                      📊 <strong>{count}</strong> séances au total · <strong>{newCount}</strong> nouvelles à créer ({count - newCount} déjà existantes)
                    </div>
                  )
                })()}

                {/* Progression */}
                {generatingPlan && (
                  <div style={{ background: colors.background.raised, borderRadius: '8px', padding: '10px 14px', marginBottom: '14px' }}>
                    <p style={{ margin: '0 0 6px', fontSize: '12px', color: colors.accent.blue }}>Création en cours... {planProgress.done}/{planProgress.total}</p>
                    <div style={{ background: colors.background.raised, borderRadius: '4px', height: '6px' }}>
                      <div style={{ background: colors.accent.blue, borderRadius: '4px', height: '6px', width: `${planProgress.total > 0 ? (planProgress.done / planProgress.total) * 100 : 0}%`, transition: 'width 0.2s' }} />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={genererSaison} disabled={generatingPlan || !planSaison.dateDebut || !planSaison.dateFin || !planSaison.joursActifs.length}
                    style={{ ...st.btnSolid, background: colors.accent.blue, opacity: (generatingPlan || !planSaison.dateDebut || !planSaison.dateFin || !planSaison.joursActifs.length) ? 0.5 : 1 }}>
                    {generatingPlan ? 'Génération...' : `🚀 ${t('ent_generer_seances', lang)}`}
                  </button>
                  <button onClick={() => setShowPlanificateur(false)} style={st.btn(colors.text.dim)}>{t('btn_annuler', lang)}</button>
                </div>
              </div>
            )}

            {/* ── Liste des séances (groupées par mois) ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {grouperParMois(entrainements).map(([moisKey, { label, items }]) => {
                const moisOuvert = moisOuverts.has(moisKey)
                return (
                  <div key={moisKey} style={{ marginBottom: '8px' }}>
                    <div
                      onClick={() => setMoisOuverts(prev => { const next = new Set(prev); next.has(moisKey) ? next.delete(moisKey) : next.add(moisKey); return next })}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: colors.background.sunken, border: `1px solid ${colors.border.subtle}`, borderRadius: moisOuvert ? '10px 10px 0 0' : '10px', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '16px' }}>📅</span>
                        <span style={{ color: colors.text.primary, fontWeight: 700, fontSize: '15px', textTransform: 'capitalize' }}>{label}</span>
                        <span style={{ background: colors.background.raised, color: colors.text.muted, fontSize: '12px', padding: '2px 8px', borderRadius: '20px' }}>
                          {items.length} {items.length > 1 ? t('stats_seances_plural', lang) : t('stats_seance_singular', lang)}
                        </span>
                      </div>
                      <span style={{ color: colors.accent.green, fontSize: '14px', transition: 'transform 0.2s', display: 'inline-block', transform: moisOuvert ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                    </div>
                    {moisOuvert && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', border: `1px solid ${colors.border.subtle}`, borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '10px' }}>
                        {[...items].sort((a, b) => new Date(b.date) - new Date(a.date)).map(e => {
                const ouvert = entrainementActif === e.id
                const getStatutJoueur = (j) => {
                  const p = (e.presences_entrainement || []).find(pr => pr.joueur_id === j.id)
                  const nonSaisi = !p || (!p.statut && !p.present)
                  if (!nonSaisi) return p.statut || (p.present ? 'present' : 'absent')
                  return j.joueur_id ? (dispoJoueurs[e.id]?.[j.joueur_id] || null) : null
                }
                const nbPresents  = joueurs.filter(j => { const s = getStatutJoueur(j); return s === 'present' || s === 'convoque' }).length
                const nbBlesses   = joueurs.filter(j => getStatutJoueur(j) === 'blesse').length
                const nbMalades   = joueurs.filter(j => getStatutJoueur(j) === 'malade').length
                const nbConvoques = joueurs.filter(j => getStatutJoueur(j) === 'convoque').length
                const total = joueurs.length
                const dateObj = new Date(e.date + 'T12:00:00')
                const estFuture = dateObj > new Date()
                return (
                  <div key={e.id} style={{ ...st.card, borderLeft: `3px solid ${estFuture ? colors.accent.blue + alpha.medium : colors.accent.green + alpha.light}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setEntrainementActif(ouvert ? null : e.id)}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{dateObj.toLocaleDateString(localeOf(lang), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                          {e.heure && <span style={{ fontSize: '12px', color: colors.text.faint }}>{e.heure}</span>}
                          {e.description && <span style={{ fontSize: '12px', color: colors.text.faint }}>{e.description}</span>}
                          {e.lieu && <span style={{ fontSize: '12px', color: colors.text.faint }}>📍 {e.lieu}</span>}
                          {e.fiche_id && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '1px' }}>
                              <span
                                onClick={ev => { ev.stopPropagation(); const s = mesSeancesOuvertes.find(x => x.id === e.fiche_id); if (s) setFicheApercu(s) }}
                                style={{ fontSize: '11px', color: colors.accent.purpleLight, background: '#a78bfa10', border: '1px solid #a78bfa30', padding: '1px 8px', borderRadius: '10px 0 0 10px', cursor: 'pointer' }}>
                                📄 {t('ent_voir_fiche', lang)}
                              </span>
                              <span
                                onClick={async ev => {
                                  ev.stopPropagation()
                                  if (!confirm('Détacher cette fiche de la séance ?')) return
                                  // Optimiste : la fiche reste dans "Mes séances sauvegardées",
                                  // seul le lien avec cet entraînement est retiré.
                                  setEntrainements(prev => prev.map(x => (x.id === e.id ? { ...x, fiche_id: null } : x)))
                                  const { error } = await supabase.from('entrainements').update({ fiche_id: null }).eq('id', e.id)
                                  if (error) {
                                    setEntrainements(prev => prev.map(x => (x.id === e.id ? { ...x, fiche_id: e.fiche_id } : x)))
                                    alert('Erreur : ' + error.message)
                                  }
                                }}
                                title="Détacher cette fiche"
                                style={{ fontSize: '11px', color: colors.accent.purpleLight, background: '#a78bfa10', border: '1px solid #a78bfa30', borderLeft: 'none', padding: '1px 6px', borderRadius: '0 10px 10px 0', cursor: 'pointer', lineHeight: 1.5 }}>
                                ×
                              </span>
                            </span>
                          )}
                          {!estFuture && total > 0 && (
                            <>
                              <span style={{ fontSize: '11px', color: colors.accent.green, background: '#4ade8010', padding: '1px 7px', borderRadius: '10px' }}>✅ {nbPresents}</span>
                              {nbConvoques > 0 && <span style={{ fontSize: '11px', color: colors.accent.blue, background: '#60a5fa10', padding: '1px 7px', borderRadius: '10px' }}>🏆 {nbConvoques}</span>}
                              {nbBlesses > 0 && <span style={{ fontSize: '11px', color: colors.accent.orange, background: '#f9731610', padding: '1px 7px', borderRadius: '10px' }}>🤕 {nbBlesses}</span>}
                              {nbMalades > 0 && <span style={{ fontSize: '11px', color: colors.accent.purple, background: '#a855f710', padding: '1px 7px', borderRadius: '10px' }}>🤒 {nbMalades}</span>}
                            </>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {!estFuture && total > 0 && (
                          <span style={{ background: nbPresents >= total * 0.8 ? colors.accent.green + alpha.subtle : '#f59e0b15', border: `1px solid ${nbPresents >= total * 0.8 ? colors.accent.green + alpha.light : '#f59e0b30'}`, color: nbPresents >= total * 0.8 ? colors.accent.green : '#f59e0b', fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                            {nbPresents}/{total}
                          </span>
                        )}
                        {canEdit('entrainements') && !e.fiche_id && (
                          <button onClick={ev => { ev.stopPropagation(); setModalImportFicheEntrainement(e.id) }}
                            title={t('ent_importer_fiche', lang)}
                            style={{ background: '#1a2e1a', border: '1px solid #4ade80', borderRadius: '6px', color: colors.accent.green, width: '28px', height: '28px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            +
                          </button>
                        )}
                        {canEdit('entrainements') && (
                          <button onClick={ev => { ev.stopPropagation(); setEntrainementEnEdition({ id: e.id, date: e.date || '', heure: e.heure || '', description: e.description || '', lieu: e.lieu || '' }) }}
                            style={{ background: 'transparent', border: `1px solid ${colors.border.default}`, color: colors.accent.blue, padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }} title="Modifier la séance">✏️</button>
                        )}
                        {canEdit('entrainements') && (
                          <button onClick={() => supprimerEntrainement(e.id)} style={{ background: 'transparent', border: `1px solid ${colors.border.default}`, color: colors.text.disabled, padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }} title="Supprimer la séance">🗑️</button>
                        )}
                        <span style={{ color: colors.text.disabled, cursor: 'pointer' }} onClick={() => setEntrainementActif(ouvert ? null : e.id)}>{ouvert ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {ouvert && (
                      <div style={{ marginTop: '14px', borderTop: `1px solid ${colors.border.subtle}`, paddingTop: '14px' }}>
                        {joueurs.length === 0 ? (
                          <p style={{ color: colors.text.faint, fontSize: '13px', margin: 0 }}>{t('ent_ajoute_joueurs', lang)}</p>
                        ) : (
                          <>
                            {/* Légende */}
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px', alignItems: 'center' }}>
                              {Object.entries(STATUT_CONFIG).map(([key, s]) => (
                                <span key={key} style={{ fontSize: '11px', color: s.color, background: s.bg, border: `1px solid ${s.border}`, padding: '2px 8px', borderRadius: '10px' }}>
                                  {s.emoji} {s.label}
                                </span>
                              ))}
                              <span style={{ fontSize: '11px', color: colors.border.strong }}>· {t('ent_clique_statut', lang)}</span>
                            </div>
                            {canEdit('entrainements') && (
                              <button onClick={() => importerReponsesSondage(e.id)}
                                style={{ background: 'transparent', border: '1px solid #60a5fa40', color: colors.accent.blue, padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginBottom: '12px' }}>
                                📥 Importer les réponses au sondage
                              </button>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '7px' }}>
                              {joueurs.map(j => {
                                const p = (e.presences_entrainement || []).find(p => p.joueur_id === j.id)
                                const nonSaisi = !p || (!p.statut && !p.present)
                                const statut = p?.statut || (p?.present ? 'present' : 'absent')
                                // Dispo auto-déclarée par le joueur lui-même — seulement affichée si l'éducateur n'a pas encore saisi de présence
                                // (j.joueur_id est renseigné à l'acceptation de l'invitation, cf. AcceptInvite.jsx)
                                const dispoAuto = nonSaisi && j.joueur_id ? dispoJoueurs[e.id]?.[j.joueur_id] : null
                                const cfg = nonSaisi
                                  ? (dispoAuto
                                      ? { ...(STATUT_CONFIG[dispoAuto] || STATUT_CONFIG.absent) }
                                      : { emoji: '⬜', label: t('ent_non_saisi', lang), bg: '#ffffff05', border: colors.border.default, color: colors.text.disabled })
                                  : (STATUT_CONFIG[statut] || STATUT_CONFIG.absent)
                                const hasPoint = !!p?.point_seance
                                return (
                                  <div key={j.id}
                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: cfg.bg, border: `1px solid ${hasPoint ? '#fbbf2460' : cfg.border}`, borderRadius: '8px', transition: 'all 0.15s', position: 'relative' }}>
                                    <span onClick={() => canEdit('entrainements') && cyclerPresence(e.id, j.id, nonSaisi ? 'non_saisi' : statut)} style={{ fontSize: '15px', flexShrink: 0, cursor: canEdit('entrainements') ? 'pointer' : 'default' }}>{cfg.emoji}</span>
                                    <div onClick={() => canEdit('entrainements') && cyclerPresence(e.id, j.id, nonSaisi ? 'non_saisi' : statut)} style={{ flex: 1, minWidth: 0, cursor: canEdit('entrainements') ? 'pointer' : 'default' }}>
                                      <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.prenom} {j?.nom || ''}</p>
                                      <p style={{ margin: 0, fontSize: '10px', color: cfg.color, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        {cfg.label}
                                        {dispoAuto && (
                                          <span style={{ fontSize: '8px', color: colors.accent.blue, background: colors.accent.blue + alpha.subtle, border: '1px solid #60a5fa30', borderRadius: '20px', padding: '1px 6px', fontWeight: 700 }}>
                                            {t('ent_dispo_auto', lang)}
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                    {(canEdit('entrainements') || hasPoint) && (
                                      <span
                                        title={hasPoint ? 'Retirer le point séance' : 'Attribuer un point séance'}
                                        onClick={ev => { ev.stopPropagation(); canEdit('entrainements') && togglePointSeance(e.id, j.id, p) }}
                                        style={{ fontSize: '14px', cursor: canEdit('entrainements') ? 'pointer' : 'default', opacity: hasPoint ? 1 : 0.2, flexShrink: 0, transition: 'opacity 0.15s' }}>
                                        ⭐
                                      </span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
                      </div>
                    )}
                  </div>
                )
              })}
              {entrainements.length === 0 && (
                <div style={{ ...st.card, textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: colors.text.faint, margin: '0 0 8px' }}>{t('ent_aucune_seance', lang)}</p>
                  <p style={{ color: colors.border.strong, fontSize: '13px', margin: 0 }}>{t('ent_utilise_planificateur', lang)}</p>
                </div>
              )}
            </div>
            </>
            )}

            {/* ── Modale "Modifier la séance" ── */}
            {entrainementEnEdition && (
              <div style={{ position: 'fixed', inset: 0, background: '#000000aa', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: '16px' }}>✏️ {t('ent_modifier_seance', lang)}</p>
                    <button onClick={() => setEntrainementEnEdition(null)} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '20px', cursor: 'pointer' }}>✕</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div><label style={st.label}>{t('ent_date', lang)}</label><input style={st.input} type="date" value={entrainementEnEdition.date} onChange={e => setEntrainementEnEdition(p => ({ ...p, date: e.target.value }))} /></div>
                    <div><label style={st.label}>{t('ent_heure_optionnel', lang)}</label><input style={st.input} type="time" value={entrainementEnEdition.heure} onChange={e => setEntrainementEnEdition(p => ({ ...p, heure: e.target.value }))} /></div>
                    <div style={{ gridColumn: '1 / -1' }}><label style={st.label}>{t('ent_theme_optionnel', lang)}</label><input style={st.input} value={entrainementEnEdition.description} onChange={e => setEntrainementEnEdition(p => ({ ...p, description: e.target.value }))} /></div>
                    <div style={{ gridColumn: '1 / -1' }}><label style={st.label}>{t('ent_lieu', lang)}</label><input style={st.input} value={entrainementEnEdition.lieu} onChange={e => setEntrainementEnEdition(p => ({ ...p, lieu: e.target.value }))} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={sauvegarderEntrainementEdite} disabled={savingEntrainementEdit} style={st.btnSolid}>{savingEntrainementEdit ? 'Sauvegarde...' : `💾 ${t('btn_sauvegarder', lang)}`}</button>
                    <button onClick={() => setEntrainementEnEdition(null)} style={st.btn(colors.text.dim)}>{t('btn_annuler', lang)}</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ===== ÉVALUATIONS ===== */}
        {activeSection === 'notes' && (
          <>
            <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>{t('eval_titre_joueurs', lang)}</h1>
            <p style={{ color: colors.text.faint, fontSize: '13px', marginBottom: permissions?.notes === 'lecture' ? '0.5rem' : '1.5rem' }}>{t('eval_note_chaque', lang)}</p>
            {permissions?.notes === 'lecture' && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: colors.accent.blue + alpha.subtle, border: '1px solid #60a5fa30', color: colors.accent.blue, fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, marginBottom: 16 }}>
                {t('equipe_mode_lecture', lang)}
              </div>
            )}
            {joueurs.length === 0 ? (
              <div style={{ ...st.card, textAlign: 'center', padding: '3rem' }}><p style={{ color: colors.text.faint }}>{t('eval_ajoute_joueurs', lang)}</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {joueurs.map(j => {
                  const ln = getLocalNote(j.id)
                  const noteGlobale = ln.technique || ln.physique || ln.mental || ln.tactique
                    ? ((ln.technique + ln.physique + ln.mental + ln.tactique) / 4).toFixed(1)
                    : null
                  return (
                    <div key={j.id} style={st.card}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#1a2e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.accent.green, fontWeight: 800, fontSize: '13px' }}>
                          {j?.prenom?.[0] || ""}{j?.nom?.[0] || ""}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontWeight: 700 }}>{j.prenom} {j.nom}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '12px', color: colors.text.faint }}>{j.poste || '—'}</p>
                        </div>
                        {noteGlobale && <span style={{ background: colors.accent.green + alpha.subtle, border: '1px solid #4ade8030', color: colors.accent.green, fontWeight: 800, fontSize: '16px', padding: '4px 14px', borderRadius: '20px' }}>{noteGlobale}</span>}
                      </div>
                      <div className="criteres-grid" style={{ marginBottom: '12px' }}>
                        {[['technique', `${t('eval_technique', lang)}`], ['physique', `${t('eval_physique', lang)}`], ['mental', `${t('eval_mental', lang)}`], ['tactique', `${t('eval_tactique', lang)}`]].map(([key, label]) => (
                          <div key={key} className="critere-bloc">
                            <label className="critere-label" style={st.label}>{label}</label>
                            <div className="etoiles" style={{ display: 'flex', gap: '4px' }}>
                              {[1,2,3,4,5].map(n => (
                                <span key={n} onClick={() => canEdit('notes') && setLocalNote(j.id, { [key]: n })}
                                  style={{ cursor: canEdit('notes') ? 'pointer' : 'default', fontSize: '20px', color: colors.accent.amber, opacity: ln[key] >= n ? 1 : 0.2 }}>★</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Toggle visible par le joueur */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: ln.visible_joueur ? '#4ade8010' : colors.background.raised, border: `1px solid ${ln.visible_joueur ? colors.accent.green + alpha.light : colors.border.default}`, borderRadius: '8px', marginBottom: '12px', cursor: canEdit('notes') ? 'pointer' : 'default' }}
                        onClick={() => canEdit('notes') && setLocalNote(j.id, { visible_joueur: !ln.visible_joueur })}>
                        <div style={{ width: '36px', height: '20px', background: ln.visible_joueur ? colors.accent.green : colors.border.strong, borderRadius: '10px', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                          <div style={{ position: 'absolute', top: '3px', left: ln.visible_joueur ? '19px' : '3px', width: '14px', height: '14px', borderRadius: '50%', background: colors.text.primary, transition: 'left 0.2s' }} />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: ln.visible_joueur ? colors.accent.green : colors.text.secondary }}>
                            {ln.visible_joueur ? `${t('eval_visible', lang)}` : `${t('eval_prive_non_visible', lang)}`}
                          </p>
                          <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.faint }}>
                            {ln.visible_joueur ? t('eval_joueur_verra', lang) : t('eval_seul_vous', lang)}
                          </p>
                        </div>
                      </div>
                      <div style={{ marginBottom: '12px' }}>
                        <label style={st.label}>{ln.visible_joueur ? `${t('eval_commentaire_visible', lang)}` : `${t('eval_commentaire_prive', lang)}`}</label>
                        <textarea value={ln.commentaire} onChange={e => setLocalNote(j.id, { commentaire: e.target.value })}
                          placeholder={t('eval_placeholder_commentaire', lang)}
                          disabled={!canEdit('notes')}
                          style={{ ...st.input, minHeight: '70px', resize: 'vertical', fontFamily: 'Inter, sans-serif' }} />
                      </div>
                      {canEdit('notes') && (
                        <button onClick={() => sauvegarderNote(j.id, ln)} disabled={savingNote} style={st.btnSolid}>
                          {savingNote ? 'Sauvegarde...' : `${t('btn_sauvegarder', lang)}`}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ===== MON PROFIL ÉDUCATEUR ===== */}
        {activeSection === 'recrutement' && (() => {
          const postes = ['Tous', 'Gardien', 'Défenseur', 'Milieu', 'Attaquant']
          const categories = ['Toutes', ...CATEGORIES]
          const regions = ['Toutes', ...Array.from(new Set(recrutJoueurs.map(j => j.region).filter(Boolean))).sort()]
          const stylesDisponibles = recrutPoste !== 'Tous' && CARACTERISTIQUES_PAR_POSTE[recrutPoste]
            ? ['Tous', ...CARACTERISTIQUES_PAR_POSTE[recrutPoste]]
            : ['Tous']
          const filtered = recrutJoueurs.filter(j => {
            if (recrutPoste !== 'Tous' && j.poste !== recrutPoste) return false
            if (recrutCategorie !== 'Toutes' && j.categorie !== recrutCategorie) return false
            if (recrutRegion !== 'Toutes' && j.region !== recrutRegion) return false
            if (recrutStyleDeJeu !== 'Tous' && !(j.points_forts || '').toLowerCase().includes(recrutStyleDeJeu.toLowerCase())) return false
            if (recrutSearch) {
              const s = recrutSearch.toLowerCase()
              return `${j.prenom} ${j.nom}`.toLowerCase().includes(s) || (j.club || '').toLowerCase().includes(s) || (j.poste || '').toLowerCase().includes(s) || (j.region || '').toLowerCase().includes(s)
            }
            return true
          })
          const posteColor = (p) => {
            const map = { Gardien: { bg: '#f59e0b20', text: '#f59e0b' }, Défenseur: { bg: colors.accent.blue + alpha.soft, text: colors.accent.blue }, Milieu: { bg: colors.accent.green + alpha.soft, text: colors.accent.green }, Attaquant: { bg: colors.accent.orange + alpha.soft, text: colors.accent.orange } }
            return map[p] || { bg: '#ffffff10', text: colors.text.secondary }
          }
          if (recrutSelectedJoueur) {
            const j = recrutSelectedJoueur
            return (
              <div>
                <button onClick={() => setRecrutSelectedJoueur(null)} style={{ background: 'transparent', border: `1px solid ${colors.border.default}`, color: colors.text.secondary, padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', marginBottom: '1.5rem', fontSize: '13px' }}>← {t('recrut_retour_feed', lang)}</button>
                <div style={{ maxWidth: '680px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1.5rem' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: colors.accent.green + alpha.soft, border: '2px solid #4ade8040', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 800, color: colors.accent.green, flexShrink: 0 }}>{j.prenom?.[0]}{j.nom?.[0]}</div>
                    <div>
                      <h2 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 800 }}>{j.prenom} {j.nom}</h2>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {j.poste && <span style={{ background: posteColor(j.poste).bg, color: posteColor(j.poste).text, fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 600 }}>{j.poste}</span>}
                        {j.categorie && <span style={{ background: '#ffffff10', color: colors.text.secondary, fontSize: '11px', padding: '3px 10px', borderRadius: '20px' }}>{j.categorie}</span>}
                        {j.region && <span style={{ background: '#ffffff10', color: colors.text.secondary, fontSize: '11px', padding: '3px 10px', borderRadius: '20px' }}>{j.region}</span>}
                        {j.pied && <span style={{ background: '#ffffff10', color: colors.text.secondary, fontSize: '11px', padding: '3px 10px', borderRadius: '20px' }}>Pied {j.pied}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '10px', marginBottom: '1.5rem' }}>
                    {[{ label: 'Matchs officiels', val: j.matchs_officiel || 0 }, { label: t('comp_buts', lang), val: j.buts_total || 0 }, { label: t('comp_passes_dec', lang), val: j.passes_decisives || 0 }, { label: t('comp_clean_sheet', lang), val: j.cleansheets || 0 }, { label: t('comp_minutes', lang), val: j.minutes_jouees || 0 }, { label: 'Club', val: j.club || '—' }].map(s => (
                      <div key={s.label} style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: colors.accent.green }}>{s.val}</div>
                        <div style={{ fontSize: '10px', color: colors.text.faint, textTransform: 'uppercase', marginTop: '2px' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {j.points_forts && <div style={{ marginBottom: '1rem' }}>
                    <p style={{ margin: '0 0 8px', fontSize: '11px', color: colors.accent.green, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('recrut_points_forts', lang)}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>{j.points_forts.split(', ').filter(Boolean).map(t => <span key={t} style={{ background: colors.accent.green + alpha.soft, color: colors.accent.green, border: '1px solid #4ade8040', fontSize: '12px', padding: '4px 12px', borderRadius: '20px' }}>{t}</span>)}</div>
                  </div>}
                  {j.a_ameliorer && <div style={{ marginBottom: '1rem' }}>
                    <p style={{ margin: '0 0 8px', fontSize: '11px', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('recrut_axes_progression', lang)}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>{j.a_ameliorer.split(', ').filter(Boolean).map(t => <span key={t} style={{ background: '#f59e0b15', color: '#f59e0b', border: '1px solid #f59e0b30', fontSize: '12px', padding: '4px 12px', borderRadius: '20px' }}>{t}</span>)}</div>
                  </div>}
                  {recrutParcours.length > 0 && <div>
                    <p style={{ margin: '0 0 10px', fontSize: '11px', color: colors.text.faint, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('recrut_parcours', lang)}</p>
                    <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {recrutParcours.map(p => <div key={p.id} style={{ fontSize: '13px' }}><span style={{ fontWeight: 700 }}>{p.club}</span> <span style={{ color: colors.text.faint }}>· {[p.saison, p.niveau_championnat, p.poste].filter(Boolean).join(' · ')}</span></div>)}
                    </div>
                  </div>}
                  {j.clip_url && (() => {
                    const embed = youtubeEmbedUrl(j.clip_url)
                    const estVeo = j.clip_url.includes('veo.co')
                    return (
                      <div style={{ marginTop: '1.5rem' }}>
                        <p style={{ margin: '0 0 8px', fontSize: '11px', color: colors.text.faint, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('recrut_video', lang)}</p>
                        {embed ? (
                          <iframe src={embed} title={t('recrut_video', lang)} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen
                            style={{ width: '100%', aspectRatio: '16/9', borderRadius: '10px', border: 'none', background: colors.black }} />
                        ) : estVeo ? (
                          <a href={j.clip_url} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: colors.background.surface, border: `1px solid ${colors.border.default}`, color: colors.accent.blue, padding: '12px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, textDecoration: 'none', fontFamily: 'Inter, sans-serif' }}>
                            {t('recrut_voir_sur_veo', lang)} <IcoExternal />
                          </a>
                        ) : (
                          <video src={j.clip_url} controls style={{ width: '100%', borderRadius: '10px', maxHeight: '360px', background: colors.black }} />
                        )}
                      </div>
                    )
                  })()}
                </div>
              </div>
            )
          }
          return (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>{t('nav_recrutement', lang)}</h1>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => navigate('/feed')} style={{ background: '#ffffff10', border: `1px solid ${colors.border.default}`, color: colors.text.primary, padding: '8px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>{t('recrut_feed', lang)}</button>
                  <a href="/jogabonito" target="_blank" style={{ background: colors.accent.blue + alpha.subtle, border: '1px solid #60a5fa40', color: colors.accent.blue, padding: '8px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>Jogabonito →</a>
                </div>
              </div>
              {/* Filtres */}
              <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: '11px', color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('recrut_recherche', lang)}</p>
                  <input value={recrutSearch} onChange={e => setRecrutSearch(e.target.value)} placeholder="Nom, club, région..." style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: '8px', color: colors.text.primary, padding: '8px 10px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif', outline: 'none' }} />
                </div>
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: '11px', color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('equipe_poste', lang)}</p>
                  <select value={recrutPoste} onChange={e => { setRecrutPoste(e.target.value); setRecrutStyleDeJeu('Tous') }} style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: '8px', color: colors.text.primary, padding: '8px 10px', fontSize: '13px', boxSizing: 'border-box' }}>
                    {postes.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                {recrutPoste !== 'Tous' && (
                  <div>
                    <p style={{ margin: '0 0 6px', fontSize: '11px', color: colors.accent.blue, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('recrut_style_jeu', lang)}</p>
                    <select value={recrutStyleDeJeu} onChange={e => setRecrutStyleDeJeu(e.target.value)} style={{ width: '100%', background: colors.background.base, border: '1px solid #60a5fa40', borderRadius: '8px', color: colors.text.primary, padding: '8px 10px', fontSize: '13px', boxSizing: 'border-box' }}>
                      {stylesDisponibles.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: '11px', color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('equipe_categorie', lang)}</p>
                  <select value={recrutCategorie} onChange={e => setRecrutCategorie(e.target.value)} style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: '8px', color: colors.text.primary, padding: '8px 10px', fontSize: '13px', boxSizing: 'border-box' }}>
                    {categories.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: '11px', color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('profil_region', lang)}</p>
                  <select value={recrutRegion} onChange={e => setRecrutRegion(e.target.value)} style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: '8px', color: colors.text.primary, padding: '8px 10px', fontSize: '13px', boxSizing: 'border-box' }}>
                    {regions.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <p style={{ margin: '0 0 1rem', fontSize: '12px', color: colors.text.faint }}>{filtered.length} {t('recrut_joueurs_trouves', lang)}</p>
              {/* Grid joueurs */}
              {!recrutLoaded ? (
                <p style={{ color: colors.accent.blue, textAlign: 'center', padding: '3rem' }}>{t('btn_chargement', lang)}</p>
              ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: colors.text.disabled }}>
                  <p>{t('recrut_aucun_trouve', lang)}</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                  {filtered.map(j => (
                    <div key={j.id} onClick={async () => { setRecrutSelectedJoueur(j); const { data } = await supabase.from('parcours').select('*').eq('joueur_id', j.id).order('saison', { ascending: false }); setRecrutParcours(data || []) }}
                      style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '12px', padding: '1rem', cursor: 'pointer', transition: 'border-color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = colors.accent.green + alpha.medium}
                      onMouseLeave={e => e.currentTarget.style.borderColor = colors.background.raised}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: colors.accent.green + alpha.subtle, border: '1px solid #4ade8030', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, color: colors.accent.green, flexShrink: 0 }}>{j.prenom?.[0]}{j.nom?.[0]}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.prenom} {j.nom}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.faint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.club || '—'} {j.niveau_equipe ? `· ${j.niveau_equipe}` : ''}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        {j.poste && <span style={{ background: posteColor(j.poste).bg, color: posteColor(j.poste).text, fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>{j.poste}</span>}
                        {j.categorie && <span style={{ background: '#ffffff08', color: colors.text.dim, fontSize: '11px', padding: '2px 8px', borderRadius: '20px' }}>{j.categorie}</span>}
                        {j.region && <span style={{ background: '#ffffff08', color: colors.text.dim, fontSize: '11px', padding: '2px 8px', borderRadius: '20px' }}>{j.region}</span>}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '6px', borderTop: `1px solid ${colors.border.subtle}`, paddingTop: '10px' }}>
                        {[{ label: t('recrut_matchs', lang), val: j.matchs_officiel || 0 }, { label: t('comp_buts', lang), val: j.buts_total || 0 }, { label: t('recrut_passes', lang), val: j.passes_decisives || 0 }].map(s => (
                          <div key={s.label} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '17px', fontWeight: 800, color: colors.accent.green }}>{s.val}</div>
                            <div style={{ fontSize: '9px', color: colors.text.faint, textTransform: 'uppercase' }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })()}

        {/* ===== MES SÉANCES ===== */}
        {activeSection === 'mes_seances' && (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
              <button
                onClick={() => setModeSeance('enregistrer')}
                style={{ background: modeSeance === 'enregistrer' ? colors.accent.blue : colors.background.raised, color: modeSeance === 'enregistrer' ? colors.black : colors.text.dim, border: 'none', padding: '10px 16px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                📥 {t('seance_enregistrer_une', lang)}
              </button>
              <button
                onClick={() => setModalGenerationIA(true)}
                style={{ background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', color: colors.text.primary, border: 'none', padding: '10px 16px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                🤖 Générer avec l'IA
              </button>
              <button
                onClick={() => setModeSeance('rediger')}
                style={{ background: modeSeance === 'rediger' ? colors.accent.blue : colors.background.raised, color: modeSeance === 'rediger' ? colors.black : colors.text.dim, border: 'none', padding: '10px 16px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                ✏️ {t('seance_rediger_fiche', lang)}
              </button>
              <button
                onClick={() => setModeSeance('scanner')}
                style={{ background: modeSeance === 'scanner' ? colors.accent.blue : colors.background.raised, color: modeSeance === 'scanner' ? colors.black : colors.text.dim, border: 'none', padding: '10px 16px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                📷 {t('seance_scanner', lang)}
              </button>
              <button
                onClick={() => setModeSeance('club')}
                style={{ background: modeSeance === 'club' ? colors.accent.blue : colors.background.raised, color: modeSeance === 'club' ? colors.black : colors.text.dim, border: 'none', padding: '10px 16px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                🏟️ {t('seance_eval_club', lang)}
              </button>
            </div>

            {modalGenerationIA && (
              <div style={{ position: 'fixed', inset: 0, background: colors.background.overlay, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                onClick={() => !generatingIA && setModalGenerationIA(false)}>
                <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}
                  onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: '16px' }}>🤖 Générer une séance avec l'IA</p>
                    {!generatingIA && (
                      <button onClick={() => setModalGenerationIA(false)} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '20px', cursor: 'pointer' }}>✕</button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <label style={st.label}>Objectif tactique</label>
                      <input style={st.input} placeholder="Ex: pressing, conservation, transition..." value={generationIAForm.objectif}
                        onChange={e => setGenerationIAForm(f => ({ ...f, objectif: e.target.value }))} disabled={generatingIA} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={st.label}>Durée totale</label>
                        <select style={st.input} value={generationIAForm.duree} onChange={e => setGenerationIAForm(f => ({ ...f, duree: e.target.value }))} disabled={generatingIA}>
                          {['45', '60', '90'].map(d => <option key={d} value={d}>{d} min</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={st.label}>Nombre de joueurs</label>
                        <input style={st.input} type="number" min="1" placeholder="Ex: 16" value={generationIAForm.nb_joueurs}
                          onChange={e => setGenerationIAForm(f => ({ ...f, nb_joueurs: e.target.value }))} disabled={generatingIA} />
                      </div>
                      <div>
                        <label style={st.label}>Catégorie d'âge</label>
                        <select style={st.input} value={generationIAForm.categorie_age} onChange={e => setGenerationIAForm(f => ({ ...f, categorie_age: e.target.value }))} disabled={generatingIA}>
                          {['U10', 'U13', 'U15', 'U18', 'Senior'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={st.label}>Niveau</label>
                        <select style={st.input} value={generationIAForm.niveau} onChange={e => setGenerationIAForm(f => ({ ...f, niveau: e.target.value }))} disabled={generatingIA}>
                          {['Débutant', 'Intermédiaire', 'Compétitif'].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {generationIAError && (
                    <p style={{ color: colors.accent.red, fontSize: '13px', marginBottom: '12px' }}>❌ {generationIAError}</p>
                  )}

                  <button onClick={genererSeanceIA} disabled={generatingIA || !generationIAForm.objectif.trim()}
                    style={{ width: '100%', background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', color: colors.text.primary, border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', opacity: (generatingIA || !generationIAForm.objectif.trim()) ? 0.6 : 1 }}>
                    {generatingIA ? libelleStatutGroq(generationIAStatus) : '✨ Générer la séance'}
                  </button>
                </div>
              </div>
            )}

            {modeSeance === 'club' && (
            <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '28px', marginBottom: '24px' }}>
              {clubAffiliation?.statut === 'accepte' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '15px' }}>🏟️ {t('seance_eval_club_titre', lang)}</p>
                      <p style={{ margin: 0, fontSize: '13px', color: colors.text.secondary }}>{t('seance_uploade_2', lang)}</p>
                    </div>
                    <button onClick={() => setShowUploadSeance(true)} style={st.btnSolid}>+ {t('seance_uploader_une', lang)}</button>
                  </div>

                  {showUploadSeance && (
                    <div style={{ background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                        <div>
                          <label style={st.label}>{t('profil_saison', lang)}</label>
                          <select style={st.input} value={seanceSaison} onChange={e => setSeanceSaison(e.target.value)}>
                            {['2025-2026', '2024-2025', '2026-2027'].map(s => <option key={s}>{s}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={st.label}>{t('seance_date_seance', lang)}</label>
                          <input style={st.input} type="date" value={seanceDate} onChange={e => setSeanceDate(e.target.value)} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={st.label}>{t('seance_theme_seance', lang)}</label>
                          <input style={st.input} placeholder="Ex: Travail défensif, transition rapide..." value={seanceTheme} onChange={e => setSeanceTheme(e.target.value)} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={st.label}>{t('seance_video_seance', lang)}</label>
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                            {[{ val: 'upload', label: `📁 ${t('seance_uploader_fichier', lang)}` }, { val: 'veo', label: `🎥 ${t('seance_lien_veo', lang)}` }].map(opt => (
                              <button key={opt.val} onClick={() => setSeanceVideoMode(opt.val)}
                                style={{ flex: 1, background: seanceVideoMode === opt.val ? colors.accent.blue + alpha.subtle : colors.background.raised, border: `1px solid ${seanceVideoMode === opt.val ? colors.accent.blue : colors.border.strong}`, color: seanceVideoMode === opt.val ? colors.accent.blue : colors.text.secondary, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                          {seanceVideoMode === 'upload' ? (
                            <input type="file" accept="video/*" onChange={e => setSeanceVideoFile(e.target.files[0])} style={{ color: colors.text.secondary, fontSize: '13px' }} />
                          ) : (
                            <input style={st.input} type="url" placeholder="https://app.veo.co/matches/..." value={seanceVeoUrl} onChange={e => setSeanceVeoUrl(e.target.value)} />
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={uploaderSeance} disabled={uploadingSeance || (seanceVideoMode === 'upload' ? !seanceVideoFile : !seanceVeoUrl.trim())} style={st.btnSolid}>{uploadingSeance ? 'Upload...' : t('seance_envoyer_club', lang)}</button>
                        <button onClick={() => setShowUploadSeance(false)} style={st.btn(colors.text.dim)}>{t('btn_annuler', lang)}</button>
                      </div>
                    </div>
                  )}

                  {mesSeances.length === 0 ? (
                    <p style={{ color: colors.border.strong, fontSize: '13px' }}>{t('seance_aucune_uploadee', lang)}</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {mesSeances.map(s => {
                        return (
                        <div key={s.id} style={{ background: colors.background.base, border: `1px solid ${colors.border.subtle}`, borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                          <div>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{s.theme || t('seance_fallback', lang)} — {s.saison}</p>
                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.faint }}>{s.date_seance ? new Date(s.date_seance).toLocaleDateString('fr-FR') : ''}</p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                              background: s.statut === 'analyse' ? colors.accent.green + alpha.subtle : s.statut === 'transfere_coach' ? colors.accent.blue + alpha.subtle : '#f59e0b15',
                              color: s.statut === 'analyse' ? colors.accent.green : s.statut === 'transfere_coach' ? colors.accent.blue : '#f59e0b',
                            }}>
                              {s.statut === 'analyse' ? `✅ ${t('etat_analyse', lang)}` : s.statut === 'transfere_coach' ? `🎙️ ${t('seance_chez_coach', lang)}` : `⏳ ${t('etat_en_attente', lang)}`}
                            </span>
                            {confirmSuppr === s.id ? (
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', color: colors.accent.red }}>{t('seance_supprimer_q', lang)}</span>
                                <button onClick={() => supprimerDemande(s.id)}
                                  style={{ background: colors.accent.red + alpha.subtle, border: '1px solid #ef444440', color: colors.accent.red, padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                  {t('etat_oui', lang)}
                                </button>
                                <button onClick={() => setConfirmSuppr(null)}
                                  style={{ background: colors.background.raised, border: `1px solid ${colors.border.default}`, color: colors.text.dim, padding: '4px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                                  {t('etat_non', lang)}
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmSuppr(s.id)}
                                style={{ background: '#ef444410', border: '1px solid #ef444430', color: colors.accent.red, padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                🗑
                              </button>
                            )}
                          </div>
                        </div>
                        )
                      })}
                    </div>
                  )}
                </>
              ) : (
                <p style={{ color: colors.text.faint, fontSize: '13px' }}>{t('seance_rejoins_club', lang)}</p>
              )}
            </div>
            )}

            {modeSeance === 'scanner' && (
            <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '28px', marginBottom: '24px' }}>
              <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>📷 {t('seance_scanner_titre', lang)}</p>
              <p style={{ color: colors.text.secondary, fontSize: '13px', marginBottom: '16px' }}>
                {t('seance_prends_photo', lang)}
              </p>
              <div
                onClick={() => document.getElementById('scan-fiche-input').click()}
                style={{ border: `2px dashed ${colors.border.default}`, borderRadius: '12px', padding: '32px', textAlign: 'center', cursor: 'pointer', background: colors.background.base }}
              >
                {scanImagePreview
                  ? <img src={scanImagePreview} alt="Fiche scannée" style={{ maxHeight: '360px', maxWidth: '100%', borderRadius: '8px', objectFit: 'contain' }} />
                  : <div>
                      <p style={{ fontSize: '36px', margin: '0 0 10px' }}>📄</p>
                      <p style={{ margin: 0, fontWeight: 600, color: colors.text.secondary }}>{t('seance_clique_photo', lang)}</p>
                      <p style={{ margin: '6px 0 0', fontSize: '12px', color: colors.text.disabled }}>{t('seance_jpg_png', lang)}</p>
                    </div>
                }
              </div>
              <input
                id="scan-fiche-input"
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files[0]
                  if (!file) return
                  setScanFicheError(null)
                  setScanImageFile(file)
                  const reader = new FileReader()
                  reader.onload = ev => {
                    setScanImagePreview(ev.target.result)
                    setScanImageBase64(ev.target.result.split(',')[1])
                  }
                  reader.readAsDataURL(file)
                }}
              />
              {scanFicheError && (
                <p style={{ color: colors.accent.red, fontSize: '13px', marginTop: '12px' }}>❌ {scanFicheError}</p>
              )}
              <button
                onClick={analyserFicheScan}
                disabled={!scanImageFile || scanningFiche}
                style={{ ...st.btnSolid, marginTop: '16px', opacity: !scanImageFile || scanningFiche ? 0.5 : 1 }}
              >
                {scanningFiche ? `🔄 ${libelleStatutGroq(scanFicheStatus)}` : `🤖 ${t('seance_analyser_ia', lang)}`}
              </button>
              {scanningFiche && (
                <div style={{ marginTop: '14px', background: '#0d1a0d', border: '1px solid #1a3a1a', borderRadius: '10px', padding: '14px', fontSize: '13px', color: colors.accent.green }}>
                  🤖 {t('seance_ia_lit_fiche', lang)}
                </div>
              )}
            </div>
            )}

            {modeSeance === 'enregistrer' && (
            <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '28px', marginBottom: '24px' }}>
              <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '16px' }}>💾 {t('seance_enregistrer_une', lang)}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  placeholder={t('seance_placeholder_theme', lang)}
                  value={uploadSeanceOuverteForm.theme}
                  onChange={e => setUploadSeanceOuverteForm(prev => ({ ...prev, theme: e.target.value }))}
                  style={{ background: colors.background.base, border: `1px solid ${colors.border.faint}`, borderRadius: '10px', padding: '12px 14px', color: colors.text.primary, fontSize: '14px' }}
                />
                <input
                  type="date"
                  value={uploadSeanceOuverteForm.date_seance}
                  onChange={e => setUploadSeanceOuverteForm(prev => ({ ...prev, date_seance: e.target.value }))}
                  style={{ background: colors.background.base, border: `1px solid ${colors.border.faint}`, borderRadius: '10px', padding: '12px 14px', color: colors.text.primary, fontSize: '14px' }}
                />
                <select
                  value={uploadSeanceOuverteForm.categorie_tactique}
                  onChange={e => setUploadSeanceOuverteForm(prev => ({ ...prev, categorie_tactique: e.target.value }))}
                  style={{ background: colors.background.base, border: `1px solid ${colors.border.faint}`, borderRadius: '10px', padding: '12px 14px', color: colors.text.primary, fontSize: '14px' }}
                >
                  <option value="">{t('seance_choisis_categorie', lang)}</option>
                  {Object.entries(CATEGORIES_TACTIQUES_GROUPEES).map(([groupe, cats]) => (
                    <optgroup label={groupe} key={groupe}>
                      {cats.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <input
                  placeholder={t('seance_placeholder_video', lang)}
                  value={uploadSeanceOuverteForm.video_url}
                  onChange={e => setUploadSeanceOuverteForm(prev => ({ ...prev, video_url: e.target.value }))}
                  style={{ background: colors.background.base, border: `1px solid ${colors.border.faint}`, borderRadius: '10px', padding: '12px 14px', color: colors.text.primary, fontSize: '14px' }}
                />
                <div>
                  <p style={{ fontSize: '12px', color: colors.text.dim, marginBottom: '6px' }}>{t('seance_ou_upload', lang)}</p>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={async e => {
                      const file = e.target.files[0]
                      if (!file) return
                      setUploadingSeanceOuverte(true)
                      const url = await uploaderFichierSeance(file)
                      setUploadSeanceOuverteForm(prev => ({ ...prev, fichier_url: url }))
                      setUploadingSeanceOuverte(false)
                    }}
                    style={{ background: colors.background.base, border: `1px solid ${colors.border.faint}`, borderRadius: '10px', padding: '10px 14px', color: colors.text.primary, fontSize: '13px', width: '100%' }}
                  />
                  {uploadSeanceOuverteForm.fichier_url && (
                    <p style={{ fontSize: '12px', color: colors.accent.green, marginTop: '6px' }}>✅ {t('seance_fichier_pret', lang)}</p>
                  )}
                </div>
                <textarea
                  placeholder={t('seance_notes_perso', lang)}
                  value={uploadSeanceOuverteForm.commentaire_perso}
                  onChange={e => setUploadSeanceOuverteForm(prev => ({ ...prev, commentaire_perso: e.target.value }))}
                  rows={3}
                  style={{ background: colors.background.base, border: `1px solid ${colors.border.faint}`, borderRadius: '10px', padding: '12px 14px', color: colors.text.primary, fontSize: '14px', resize: 'vertical', fontFamily: 'inherit' }}
                />
                <button
                  onClick={uploaderMaSeance}
                  disabled={uploadingSeanceOuverte}
                  style={{ background: colors.accent.blue, color: colors.black, border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', opacity: uploadingSeanceOuverte ? 0.6 : 1 }}
                >
                  {uploadingSeanceOuverte ? 'Envoi...' : t('seance_enregistrer_ma', lang)}
                </button>
              </div>
            </div>
            )}

            {modeSeance === 'rediger' && (
            <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '28px', marginBottom: '24px' }}>
              <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '16px' }}>✏️ {t('seance_rediger_titre', lang)}</p>
              {ficheExtraite && (
                <div style={{ background: '#0d1a0d', border: '1px solid #1a3a1a', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', fontSize: '13px', color: colors.accent.green, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  <span>✅ {t('seance_fiche_extraite', lang)}</span>
                  <button onClick={() => setFicheExtraite(false)} style={{ background: 'none', border: 'none', color: colors.accent.green, cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>✕</button>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <input
                  placeholder={t('seance_theme_intitule', lang)}
                  value={fiche.theme}
                  onChange={e => setFiche(f => ({ ...f, theme: e.target.value }))}
                  style={{ background: colors.background.base, border: `1px solid ${colors.border.faint}`, borderRadius: '10px', padding: '12px 14px', color: colors.text.primary, fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
                />
                <div>
                  <label style={{ fontSize: '12px', color: colors.text.secondary, marginBottom: '4px', display: 'block' }}>
                    {t('seance_date_seance', lang)}
                  </label>
                  <input
                    type="date"
                    value={fiche.date}
                    onChange={e => setFiche(f => ({ ...f, date: e.target.value }))}
                    style={{ background: colors.background.base, border: `1px solid ${colors.border.faint}`, borderRadius: '10px', padding: '12px 14px', color: colors.text.primary, fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
                <select
                  value={fiche.categorie_tactique}
                  onChange={e => setFiche(f => ({ ...f, categorie_tactique: e.target.value }))}
                  style={{ background: colors.background.base, border: `1px solid ${colors.border.faint}`, borderRadius: '10px', padding: '12px 14px', color: colors.text.primary, fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
                >
                  <option value="">{t('seance_choisis_categorie', lang)}</option>
                  {Object.entries(CATEGORIES_TACTIQUES_GROUPEES).map(([groupe, cats]) => (
                    <optgroup label={groupe} key={groupe}>
                      {cats.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setSport('football')}
                    style={{ flex: 1, background: sport === 'football' ? colors.accent.blue : colors.background.base, color: sport === 'football' ? colors.black : colors.text.dim, border: `1px solid ${colors.border.faint}`, padding: '10px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                  >
                    ⚽ Football
                  </button>
                  <button
                    type="button"
                    onClick={() => setSport('futsal')}
                    style={{ flex: 1, background: sport === 'futsal' ? colors.accent.blue : colors.background.base, color: sport === 'futsal' ? colors.black : colors.text.dim, border: `1px solid ${colors.border.faint}`, padding: '10px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                  >
                    🏟️ Futsal
                  </button>
                </div>
                <input
                  placeholder={t('seance_nb_joueurs', lang)}
                  value={fiche.nb_joueurs}
                  onChange={e => setFiche(f => ({ ...f, nb_joueurs: e.target.value }))}
                  style={{ background: colors.background.base, border: `1px solid ${colors.border.faint}`, borderRadius: '10px', padding: '12px 14px', color: colors.text.primary, fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
                />
                <input
                  placeholder={t('seance_duree_totale', lang)}
                  value={fiche.duree_totale}
                  onChange={e => setFiche(f => ({ ...f, duree_totale: e.target.value }))}
                  style={{ background: colors.background.base, border: `1px solid ${colors.border.faint}`, borderRadius: '10px', padding: '12px 14px', color: colors.text.primary, fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
                />

                {/* ── Mode diplôme (BMF/BEF/DEF) — objectif_general existe déjà comme champ
                    de base de la fiche ; en mode diplôme il est déplacé/relabellisé dans
                    l'encart officiel ci-dessous plutôt que dupliqué, pour ne pas avoir deux
                    champs "objectif" à la fois. */}
                <div>
                  <p style={{ color: colors.text.faint, fontSize: '13px', marginBottom: '8px', fontWeight: 500 }}>🎓 Mode diplôme (optionnel)</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[null, 'BMF', 'BEF', 'DEF'].map(m => (
                      <button
                        key={m ?? 'libre'}
                        type="button"
                        onClick={() => setFiche(f => ({ ...f, mode_diplome: f.mode_diplome === m ? null : m }))}
                        style={{
                          padding: '7px 16px', borderRadius: '8px', border: '1px solid',
                          borderColor: fiche.mode_diplome === m ? colors.accent.green : colors.border.default,
                          background: fiche.mode_diplome === m ? 'rgba(74,222,128,0.12)' : colors.background.base,
                          color: fiche.mode_diplome === m ? colors.accent.green : colors.text.faint,
                          fontSize: '13px', fontWeight: fiche.mode_diplome === m ? 700 : 400, cursor: 'pointer',
                        }}>
                        {m === null ? 'Libre' : m}
                        {m === 'BMF' && ' — Moniteur'}
                        {m === 'BEF' && ' — Éducateur'}
                        {m === 'DEF' && ' — Diplôme Éducateur'}
                      </button>
                    ))}
                  </div>
                </div>

                {fiche.mode_diplome ? (() => {
                  const inputStyle = { background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: '8px', color: colors.text.primary, padding: '10px 12px', fontSize: '14px', width: '100%', boxSizing: 'border-box' }
                  const labelStyle = { color: colors.text.faint, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', display: 'block', marginTop: '10px' }
                  return (
                    <div style={{ background: '#071a0e', border: '1px solid #1a3a1a', borderRadius: '12px', padding: '18px' }}>
                      <p style={{ color: colors.accent.green, fontWeight: 700, fontSize: '14px', margin: '0 0 4px' }}>📋 Fiche officielle {fiche.mode_diplome}</p>

                      <label style={labelStyle}>Phase de jeu *</label>
                      <select value={fiche.phase_jeu || ''} onChange={e => setFiche(f => ({ ...f, phase_jeu: e.target.value }))} style={inputStyle}>
                        <option value="">— Choisir —</option>
                        {['Attaque', 'Défense', 'Transition offensive', 'Transition défensive', 'Animation collective'].map(o => <option key={o}>{o}</option>)}
                      </select>

                      <label style={labelStyle}>Principe de jeu *</label>
                      <input type="text" placeholder="Ex: Conservation du ballon, Pressing haut…" value={fiche.principe_jeu || ''} onChange={e => setFiche(f => ({ ...f, principe_jeu: e.target.value }))} style={inputStyle} />

                      <label style={labelStyle}>Objectif de séance *</label>
                      <textarea placeholder={t('seance_objectif_general', lang)} value={fiche.objectif_general} onChange={e => setFiche(f => ({ ...f, objectif_general: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />

                      {(fiche.mode_diplome === 'BEF' || fiche.mode_diplome === 'DEF') && (
                        <>
                          <div style={{ borderTop: '1px solid #1a3a1a', margin: '14px 0 4px' }} />
                          <p style={{ color: colors.accent.blue, fontSize: '12px', fontWeight: 600, margin: '0 0 4px' }}>Champs complémentaires {fiche.mode_diplome}</p>

                          <label style={labelStyle}>Constats réalisés (observation des joueurs)</label>
                          <textarea placeholder="Décris ce que tu as observé lors des matchs ou séances précédentes…" value={fiche.constats || ''} onChange={e => setFiche(f => ({ ...f, constats: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />

                          <label style={labelStyle}>Justification des choix pédagogiques</label>
                          <textarea placeholder="Pourquoi ces exercices ? Quel lien avec les constats ?" value={fiche.justification_pedagogique || ''} onChange={e => setFiche(f => ({ ...f, justification_pedagogique: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />

                          <label style={labelStyle}>Auto-évaluation de la séance</label>
                          <textarea placeholder="Bilan post-séance : ce qui a fonctionné, ce qui n'a pas fonctionné…" value={fiche.auto_evaluation || ''} onChange={e => setFiche(f => ({ ...f, auto_evaluation: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                        </>
                      )}

                      {fiche.mode_diplome === 'DEF' && (
                        <>
                          <div style={{ borderTop: '1px solid #1a3a1a', margin: '14px 0 4px' }} />
                          <p style={{ color: colors.accent.orange, fontSize: '12px', fontWeight: 600, margin: '0 0 4px' }}>Champs DEF — Analyse avancée</p>

                          <label style={labelStyle}>Analyse de l'équipe / Contexte (lien match → entraînement)</label>
                          <textarea placeholder="Situation de l'équipe, problèmes collectifs observés en match…" value={fiche.analyse_equipe || ''} onChange={e => setFiche(f => ({ ...f, analyse_equipe: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />

                          <label style={labelStyle}>Bilan et projection (prochaine séance)</label>
                          <textarea placeholder="Analyse post-séance approfondie et ce qui sera travaillé ensuite…" value={fiche.bilan_projection || ''} onChange={e => setFiche(f => ({ ...f, bilan_projection: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                        </>
                      )}
                    </div>
                  )
                })() : (
                  <textarea
                    placeholder={t('seance_objectif_general', lang)}
                    value={fiche.objectif_general}
                    onChange={e => setFiche(f => ({ ...f, objectif_general: e.target.value }))}
                    rows={2}
                    style={{ background: colors.background.base, border: `1px solid ${colors.border.faint}`, borderRadius: '10px', padding: '12px 14px', color: colors.text.primary, fontSize: '14px', resize: 'vertical', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }}
                  />
                )}
              </div>

              {fiche.procedes.map((p, i) => (
                <div key={i} style={{ background: colors.background.base, border: `1px solid ${colors.border.faint}`, borderRadius: '12px', padding: '18px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <p style={{ fontWeight: 700, fontSize: '14px', margin: 0, color: colors.accent.green }}>{t('seance_procede', lang)} {p.numero}</p>
                    {fiche.procedes.length > 1 && (
                      <button type="button" onClick={() => retirerProcedeFiche(i)}
                        style={{ background: 'none', border: 'none', color: colors.accent.red, cursor: 'pointer', fontSize: '16px', padding: '2px 6px' }}
                        title={t('btn_supprimer', lang)}>
                        ✕
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input
                      placeholder={t('seance_titre_procede', lang)}
                      value={p.titre}
                      onChange={e => updateProcede(i, 'titre', e.target.value)}
                      style={{ background: colors.background.surface, border: `1px solid ${colors.border.faint}`, borderRadius: '10px', padding: '10px 12px', color: colors.text.primary, fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
                    />
                    <div className="procede-duree-joueurs" style={{ display: 'flex', gap: '10px' }}>
                      <input
                        placeholder={t('seance_duree_min', lang)}
                        value={p.duree}
                        onChange={e => updateProcede(i, 'duree', e.target.value)}
                        style={{ flex: 1, background: colors.background.surface, border: `1px solid ${colors.border.faint}`, borderRadius: '10px', padding: '10px 12px', color: colors.text.primary, fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
                      />
                      <input
                        placeholder={t('seance_nb_joueurs', lang)}
                        value={p.nb_joueurs}
                        onChange={e => updateProcede(i, 'nb_joueurs', e.target.value)}
                        style={{ flex: 1, background: colors.background.surface, border: `1px solid ${colors.border.faint}`, borderRadius: '10px', padding: '10px 12px', color: colors.text.primary, fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button
                        type="button"
                        onClick={() => setTactipadModal(i)}
                        style={{ background: colors.accent.purpleLight + alpha.subtle, border: '1px solid #a78bfa40', color: colors.accent.purpleLight, padding: '9px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        🎨 {p.schema_png ? t('tactic_modifier_schema', lang) : t('tactic_ajouter_schema', lang)}
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalBiblioImport(i)}
                        style={{ background: colors.accent.blue + alpha.subtle, border: '1px solid #60a5fa40', color: colors.accent.blue, padding: '9px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        📚 {t('biblio_importer_procede', lang)}
                      </button>
                      <button
                        type="button"
                        onClick={() => sauvegarderProcedeDansBiblio(p)}
                        style={{ background: '#1a2e1a', border: '1px solid #60a5fa', color: colors.accent.blue, padding: '9px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        💾 {t('biblio_sauvegarder_procede', lang)}
                      </button>
                      {p.schema_png && (
                        <img src={p.schema_png} alt="Schéma tactique" style={{ height: '44px', borderRadius: '6px', border: `1px solid ${colors.border.faint}` }} />
                      )}
                    </div>
                    <textarea
                      placeholder={t('seance_but', lang)}
                      value={p.but}
                      onChange={e => updateProcede(i, 'but', e.target.value)}
                      rows={2}
                      style={{ background: colors.background.surface, border: `1px solid ${colors.border.faint}`, borderRadius: '10px', padding: '10px 12px', color: colors.text.primary, fontSize: '13px', resize: 'vertical', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }}
                    />
                    <textarea
                      placeholder={t('seance_organisation', lang)}
                      value={p.organisation}
                      onChange={e => updateProcede(i, 'organisation', e.target.value)}
                      rows={2}
                      style={{ background: colors.background.surface, border: `1px solid ${colors.border.faint}`, borderRadius: '10px', padding: '10px 12px', color: colors.text.primary, fontSize: '13px', resize: 'vertical', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }}
                    />
                    <textarea
                      placeholder={t('seance_consignes', lang)}
                      value={p.consignes}
                      onChange={e => updateProcede(i, 'consignes', e.target.value)}
                      rows={2}
                      style={{ background: colors.background.surface, border: `1px solid ${colors.border.faint}`, borderRadius: '10px', padding: '10px 12px', color: colors.text.primary, fontSize: '13px', resize: 'vertical', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }}
                    />
                    <textarea
                      placeholder={t('seance_variables', lang)}
                      value={p.variables}
                      onChange={e => updateProcede(i, 'variables', e.target.value)}
                      rows={2}
                      style={{ background: colors.background.surface, border: `1px solid ${colors.border.faint}`, borderRadius: '10px', padding: '10px 12px', color: colors.text.primary, fontSize: '13px', resize: 'vertical', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={ajouterProcedeFiche}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px dashed #4ade8040', background: 'transparent', color: colors.accent.green, fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginBottom: '8px' }}
              >
                + {t('seance_ajouter_procede', lang)}
              </button>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '20px' }}>
                <button
                  onClick={sauvegarderFiche}
                  disabled={savingFiche}
                  style={{ background: colors.accent.blue, color: colors.black, border: 'none', padding: '12px 18px', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', opacity: savingFiche ? 0.6 : 1 }}
                >
                  {savingFiche ? 'Enregistrement...' : `💾 ${t('seance_sauvegarder_fiche', lang)}`}
                </button>
                <button
                  onClick={() => window.print()}
                  style={{ background: 'transparent', color: colors.accent.blue, border: '1px solid #60a5fa40', padding: '12px 18px', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
                >
                  🖨️ {t('seance_imprimer_fiche', lang)}
                </button>
                {derniereGenerationIA && (
                  <button
                    onClick={() => exportFFF({
                      objectif: derniereGenerationIA.objectif,
                      duree: derniereGenerationIA.duree,
                      categorie: derniereGenerationIA.categorie_age,
                      club: profilEdu?.club || '',
                      educateur: `${profilEdu?.prenom || ''} ${profilEdu?.nom || ''}`.trim(),
                      phases: derniereGenerationIA.phases,
                    })}
                    style={{ background: '#003893', color: colors.text.primary, border: 'none', borderRadius: '10px', padding: '12px 18px', cursor: 'pointer', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    📋 Format FFF
                  </button>
                )}
                <button
                  onClick={() => { setFiche(ficheVide); setSport('football'); setFicheFichierUrl(null); setFicheExtraite(false); setDerniereGenerationIA(null); window.print() }}
                  style={{ background: 'transparent', color: colors.text.muted, border: `1px solid ${colors.border.strong}`, padding: '12px 18px', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
                >
                  📄 {t('seance_fiche_vierge', lang)}
                </button>
              </div>
            </div>
            )}

            <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '12px' }}>📋 {t('seance_mes_seances', lang)} ({mesSeancesOuvertes.length})</p>
            {mesSeancesOuvertes.length === 0 ? (
              <p style={{ color: colors.text.disabled, fontSize: '13px' }}>{t('seance_aucune_envoyee', lang)}</p>
            ) : (
              (() => {
                const seancesParCategorie = mesSeancesOuvertes.reduce((acc, s) => {
                  const cat = CATEGORIES_TACTIQUES.find(c => c.value === s.categorie_tactique)?.label || s.categorie_tactique || t('seance_sans_categorie', lang)
                  if (!acc[cat]) acc[cat] = []
                  acc[cat].push(s)
                  return acc
                }, {})
                return (
                  <>
                    {/* Grille de cartes dossiers */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                      {Object.entries(seancesParCategorie).map(([categorie, items]) => {
                        const ouvert = !!dossiersOuverts[categorie]
                        return (
                          <div key={categorie}
                            onClick={() => setDossiersOuverts(prev => ({ ...prev, [categorie]: !prev[categorie] }))}
                            style={{ background: colors.background.raised, border: `1px solid ${ouvert ? colors.accent.blue : colors.border.default}`, borderRadius: '14px', padding: '22px 16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', textAlign: 'center', transition: 'border-color 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = colors.accent.blue }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = ouvert ? colors.accent.blue : colors.border.default }}
                          >
                            <IcoDossier size={36} color={ouvert ? colors.accent.blue : colors.text.dim} />
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: colors.text.primary }}>{categorie}</p>
                            <span style={{ background: colors.accent.blue + alpha.subtle, border: '1px solid #60a5fa40', color: colors.accent.blue, fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' }}>{items.length}</span>
                          </div>
                        )
                      })}
                    </div>

                    {/* Séances des dossiers ouverts, affichées en dessous */}
                    {Object.entries(seancesParCategorie).filter(([categorie]) => dossiersOuverts[categorie]).map(([categorie, items]) => {
                      return (
                      <div key={categorie} style={{ marginBottom: '20px' }}>
                        <p style={{ fontWeight: 700, fontSize: '13px', color: colors.text.muted, marginBottom: '10px' }}>
                          📁 {categorie} ({items.length})
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {items.map(s => {
                            const eval_ = Array.isArray(s.evaluation) ? s.evaluation[0] : s.evaluation
                            return (
                              <div key={s.id} style={{ background: colors.background.surface, border: `1px solid ${colors.border.faint}`, borderRadius: '14px', padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                <div>
                                  <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>
                                    {s.theme || t('seance_sans_theme', lang)}
                                    {s.fiche_seance?.mode_diplome && (
                                      <span style={{
                                        fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', marginLeft: '8px',
                                        background: s.fiche_seance.mode_diplome === 'BMF' ? 'rgba(74,222,128,0.15)' : s.fiche_seance.mode_diplome === 'BEF' ? 'rgba(96,165,250,0.15)' : 'rgba(249,115,22,0.15)',
                                        color: s.fiche_seance.mode_diplome === 'BMF' ? colors.accent.green : s.fiche_seance.mode_diplome === 'BEF' ? colors.accent.blue : colors.accent.orange,
                                        border: `1px solid ${s.fiche_seance.mode_diplome === 'BMF' ? colors.accent.green : s.fiche_seance.mode_diplome === 'BEF' ? colors.accent.blue : colors.accent.orange}`,
                                      }}>
                                        {s.fiche_seance.mode_diplome}
                                      </span>
                                    )}
                                  </p>
                                  {s.date_seance && (
                                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: colors.text.dim }}>
                                      {new Date(s.date_seance).toLocaleDateString('fr-FR')}
                                    </p>
                                  )}
                                  {s.commentaire_perso && (
                                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: colors.text.muted, fontStyle: 'italic' }}>💭 {s.commentaire_perso}</p>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <button onClick={() => setFicheApercu(s)}
                                    style={{ background: colors.accent.green + alpha.subtle, border: '1px solid #4ade8030', color: colors.accent.green, padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    📋 {t('seance_voir', lang)}
                                  </button>
                                  {eval_ ? (
                                    <>
                                      <span style={{ background: colors.accent.green + alpha.subtle, color: colors.accent.green, border: '1px solid #4ade8040', fontSize: '13px', fontWeight: 700, padding: '5px 12px', borderRadius: '20px' }}>
                                        ✅ {Math.round(eval_.note_totale)}/100
                                      </span>
                                    </>
                                  ) : (
                                    <span style={{ background: '#ffffff08', color: colors.text.muted, border: `1px solid ${colors.border.strong}`, fontSize: '12px', fontWeight: 700, padding: '5px 12px', borderRadius: '20px' }}>
                                      📁 {t('seance_archivee', lang)}
                                    </span>
                                  )}
                                  {s.video_url && (
                                    <a href={s.video_url} target="_blank" rel="noreferrer" style={{ background: colors.accent.blue + alpha.subtle, border: '1px solid #60a5fa40', color: colors.accent.blue, padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>🎬 {t('seance_voir', lang)}</a>
                                  )}
                                  {s.fichier_url && (
                                    <a href={s.fichier_url} target="_blank" rel="noreferrer" style={{ background: colors.accent.purpleLight + alpha.subtle, border: '1px solid #a78bfa40', color: colors.accent.purpleLight, padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>📄 {t('seance_fichier', lang)}</a>
                                  )}
                                  {confirmSuppr === s.id ? (
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                      <span style={{ fontSize: '12px', color: colors.accent.red }}>{t('seance_supprimer_q', lang)}</span>
                                      <button onClick={() => supprimerDemande(s.id)}
                                        style={{ background: colors.accent.red + alpha.subtle, border: '1px solid #ef444440', color: colors.accent.red, padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                        {t('etat_oui', lang)}
                                      </button>
                                      <button onClick={() => setConfirmSuppr(null)}
                                        style={{ background: colors.background.raised, border: `1px solid ${colors.border.default}`, color: colors.text.dim, padding: '4px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                                        {t('etat_non', lang)}
                                      </button>
                                    </div>
                                  ) : (
                                    <button onClick={() => setConfirmSuppr(s.id)}
                                      style={{ background: '#ef444410', border: '1px solid #ef444430', color: colors.accent.red, padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                      🗑
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      )
                    })}
                  </>
                )
              })()
            )}
          </div>
        )}

        {activeSection === 'bibliotheque' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <IcoBiblioTitre size={24} color={colors.accent.green} />
                  {t('nav_bibliotheque', lang)}
                </h1>
                <p style={{ fontSize: '13px', color: colors.text.faint }}>{biblio.length} {biblio.length !== 1 ? t('biblio_procedes_plural', lang) : t('biblio_procede_singular', lang)}</p>
              </div>
              {canEdit('entrainements') && (
                <button onClick={() => { setProcedeEnEdition(null); setProcedeForm(PROCEDE_VIDE); setModalProcede(true) }}
                  style={{ background: colors.accent.blue, color: colors.black, border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '7px' }}>
                  + {t('biblio_nouveau_procede', lang)}
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {[
                { id: 'tous', label: t('biblio_tab_tous', lang), Icon: IcoTypeTous },
                { id: 'echauffement', label: t('biblio_tab_echauffement', lang), Icon: IcoTypeEchauffement },
                { id: 'jeu', label: t('biblio_tab_jeu', lang), Icon: IcoTypeJeu },
                { id: 'exercice', label: t('biblio_tab_exercice', lang), Icon: IcoTypeExercice },
                { id: 'situation', label: t('biblio_tab_situation', lang), Icon: IcoTypeSituation },
              ].map(tab => (
                <button key={tab.id} onClick={() => setBiblioTab(tab.id)}
                  style={{ background: biblioTab === tab.id ? colors.accent.blue + alpha.subtle : 'transparent', border: `1px solid ${biblioTab === tab.id ? colors.accent.blue + alpha.medium : colors.border.default}`, color: biblioTab === tab.id ? colors.accent.blue : colors.text.faint, padding: '7px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <tab.Icon size={14} color={biblioTab === tab.id ? colors.accent.blue : colors.text.faint} />
                  {tab.label}
                </button>
              ))}
            </div>

            <input value={biblioSearch} onChange={e => setBiblioSearch(e.target.value)} placeholder={t('biblio_rechercher_placeholder', lang)}
              style={{ width: '100%', background: colors.background.surfaceAlt, border: `1px solid ${colors.border.default}`, borderRadius: '10px', color: colors.text.primary, padding: '10px 14px', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box', marginBottom: '20px' }} />

            {biblioLoading ? (
              <p style={{ textAlign: 'center', color: colors.text.disabled, padding: '48px 0' }}>{t('jexp_chargement', lang)}</p>
            ) : (() => {
              const TYPE_CONFIG = {
                jeu: { label: t('biblio_tab_jeu', lang), emoji: '⚽', color: colors.accent.green, bg: colors.accent.green + alpha.subtle, border: colors.accent.green + alpha.light },
                exercice: { label: t('biblio_tab_exercice', lang), emoji: '🔄', color: colors.accent.blue, bg: colors.accent.blue + alpha.subtle, border: colors.accent.blue + alpha.light },
                situation: { label: t('biblio_tab_situation', lang), emoji: '🎯', color: colors.accent.orange, bg: colors.accent.orange + alpha.subtle, border: colors.accent.orange + alpha.light },
                echauffement: { label: t('biblio_tab_echauffement', lang), emoji: '🔥', color: '#f0c030', bg: '#f0c03015', border: '#f0c03030' },
              }
              const filtres = biblio.filter(p => {
                const matchTab = biblioTab === 'tous' || p.type === biblioTab
                const matchSearch = !biblioSearch.trim() || `${p.nom} ${p.theme} ${p.tags} ${p.description}`.toLowerCase().includes(biblioSearch.toLowerCase())
                return matchTab && matchSearch
              })
              if (filtres.length === 0) return (
                <div style={{ textAlign: 'center', padding: '64px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', opacity: 0.4 }}>
                    <IcoBiblioVide size={56} color={colors.accent.green} />
                  </div>
                  <p style={{ fontSize: '14px', color: colors.text.disabled, marginBottom: '4px' }}>{t('biblio_aucun_procede_trouve', lang)}</p>
                  <p style={{ fontSize: '12px', color: colors.border.strong }}>{t('biblio_creer_premier', lang)}</p>
                </div>
              )
              return (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                  {filtres.map(p => {
                    const cfg = TYPE_CONFIG[p.type] || TYPE_CONFIG.exercice
                    return (
                      <div key={p.id} style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, fontSize: '10px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {cfg.emoji} {cfg.label}
                          </span>
                          {canEdit('entrainements') && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => ouvrirEditionProcede(p)} style={{ background: 'transparent', border: 'none', color: colors.text.disabled, cursor: 'pointer', fontSize: '14px' }} title={t('btn_modifier', lang)}>✏️</button>
                              <button onClick={() => supprimerProcede(p.id)} style={{ background: 'transparent', border: 'none', color: colors.text.disabled, cursor: 'pointer', fontSize: '14px' }} title={t('btn_supprimer', lang)}>🗑️</button>
                            </div>
                          )}
                        </div>
                        <div>
                          <p style={{ fontWeight: 800, fontSize: '15px', marginBottom: '3px' }}>{p.nom}</p>
                          {p.theme && <p style={{ fontSize: '11px', color: cfg.color, fontWeight: 600 }}>{p.theme}</p>}
                        </div>
                        {p.description && (
                          <p style={{ fontSize: '12px', color: colors.text.dim, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.description}</p>
                        )}
                        {p.schema_png && (
                          <img src={p.schema_png} alt="Schéma tactique" style={{ width: '100%', maxHeight: '120px', objectFit: 'contain', borderRadius: '8px', border: `1px solid ${colors.border.faint}`, background: colors.background.base }} />
                        )}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {p.duree && <span style={{ fontSize: '10px', color: colors.text.faint, background: colors.background.raised, padding: '2px 8px', borderRadius: '6px' }}>⏱️ {p.duree} min</span>}
                          {p.nb_joueurs && <span style={{ fontSize: '10px', color: colors.text.faint, background: colors.background.raised, padding: '2px 8px', borderRadius: '6px' }}>👥 {p.nb_joueurs}</span>}
                        </div>
                        {p.tags && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {p.tags.split(',').map(tag => tag.trim()).filter(Boolean).map(tag => (
                              <span key={tag} style={{ fontSize: '9px', color: colors.text.disabled, background: colors.background.surfaceAlt, border: `1px solid ${colors.border.faint}`, padding: '2px 7px', borderRadius: '20px' }}>{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        )}

        {/* ── Modal Créer / Éditer un procédé ── */}
        {modalProcede && (
          <div style={{ position: 'fixed', inset: 0, background: colors.background.overlay, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}
            onClick={() => setModalProcede(false)}>
            <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '20px', padding: '28px', maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '17px', fontWeight: 800 }}>{procedeEnEdition ? t('biblio_modifier_procede_titre', lang) : t('biblio_nouveau_procede_titre', lang)}</h2>
                <button onClick={() => setModalProcede(false)} style={{ background: 'transparent', border: 'none', color: colors.text.faint, fontSize: '20px', cursor: 'pointer' }}>✕</button>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '8px' }}>{t('biblio_champ_type', lang)}</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { val: 'echauffement', label: `🔥 ${t('biblio_tab_echauffement', lang)}` },
                    { val: 'jeu', label: `⚽ ${t('biblio_tab_jeu', lang)}` },
                    { val: 'exercice', label: `🔄 ${t('biblio_tab_exercice', lang)}` },
                    { val: 'situation', label: `🎯 ${t('biblio_tab_situation', lang)}` },
                  ].map(opt => (
                    <button key={opt.val} onClick={() => setProcedeForm(f => ({ ...f, type: opt.val }))}
                      style={{ background: procedeForm.type === opt.val ? colors.accent.blue + alpha.subtle : 'transparent', border: `1px solid ${procedeForm.type === opt.val ? colors.accent.blue + alpha.medium : colors.border.default}`, color: procedeForm.type === opt.val ? colors.accent.blue : colors.text.faint, padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {[
                { key: 'nom', label: t('biblio_champ_nom', lang), placeholder: t('biblio_placeholder_nom', lang), required: true },
                { key: 'theme', label: t('biblio_champ_theme', lang), placeholder: t('biblio_placeholder_theme', lang) },
                { key: 'description', label: t('biblio_champ_description', lang), placeholder: t('biblio_placeholder_description', lang), multiline: true },
                { key: 'consignes', label: t('seance_consignes', lang), placeholder: t('biblio_placeholder_consignes', lang), multiline: true },
                { key: 'variables', label: t('seance_variables', lang), placeholder: t('biblio_placeholder_variables', lang), multiline: true },
                { key: 'nb_joueurs', label: t('biblio_champ_nb_joueurs', lang), placeholder: t('seance_nb_joueurs', lang) },
                { key: 'duree', label: t('biblio_champ_duree', lang), placeholder: 'Ex : 15', type: 'number' },
                { key: 'tags', label: t('biblio_champ_tags', lang), placeholder: t('biblio_placeholder_tags', lang) },
              ].map(field => (
                <div key={field.key} style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '6px' }}>{field.label}</label>
                  {field.multiline ? (
                    <textarea value={procedeForm[field.key]} onChange={e => setProcedeForm(f => ({ ...f, [field.key]: e.target.value }))} placeholder={field.placeholder}
                      style={{ width: '100%', background: colors.background.surfaceAlt, border: `1px solid ${colors.border.default}`, borderRadius: '10px', color: colors.text.primary, padding: '10px 14px', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none', resize: 'vertical', minHeight: '80px', boxSizing: 'border-box' }} />
                  ) : (
                    <input type={field.type || 'text'} value={procedeForm[field.key]} onChange={e => setProcedeForm(f => ({ ...f, [field.key]: e.target.value }))} placeholder={field.placeholder}
                      style={{ width: '100%', background: colors.background.surfaceAlt, border: `1px solid ${colors.border.default}`, borderRadius: '10px', color: colors.text.primary, padding: '10px 14px', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
                  )}
                </div>
              ))}

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '6px' }}>🎨 Schéma tactique</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => setShowTactipadBiblio(true)}
                    style={{ background: colors.background.surfaceAlt, border: `1px solid ${colors.border.default}`, color: colors.text.secondary, borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    {procedeForm.schema_png ? t('tactic_modifier_schema', lang) : t('tactic_ajouter_schema', lang)}
                  </button>
                  {procedeForm.schema_png && (
                    <>
                      <img src={procedeForm.schema_png} alt="Schéma tactique" style={{ height: '44px', borderRadius: '6px', border: `1px solid ${colors.border.faint}` }} />
                      <button type="button" onClick={() => setProcedeForm(f => ({ ...f, schema_png: '' }))}
                        style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '12px', cursor: 'pointer' }}>✕</button>
                    </>
                  )}
                </div>
              </div>

              <button onClick={sauvegarderProcede} disabled={savingProcede || !procedeForm.nom.trim()}
                style={{ width: '100%', background: colors.accent.blue, color: colors.black, border: 'none', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginTop: '8px', opacity: (savingProcede || !procedeForm.nom.trim()) ? 0.5 : 1 }}>
                {savingProcede ? t('biblio_enregistrement_cours', lang) : procedeEnEdition ? t('biblio_mettre_a_jour', lang) : t('biblio_enregistrer', lang)}
              </button>
            </div>
          </div>
        )}

        {/* ── Modal schéma tactique d'un procédé de bibliothèque (réutilise Tactipad, cf. tactipadModal pour le même mécanisme côté fiche de séance) ── */}
        {showTactipadBiblio && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 3000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px' }}>
            <div style={{ background: colors.background.base, border: `1px solid ${colors.border.subtle}`, borderRadius: '20px', width: '100%', maxWidth: '95vw', padding: '24px', margin: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: '16px' }}>🎨 {t('schema_procede', lang)} {procedeForm.nom || ''}</p>
                <button onClick={() => setShowTactipadBiblio(false)} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '20px', cursor: 'pointer' }}>✕</button>
              </div>
              <Tactipad
                userId={userId}
                mode="modal"
                vueParDefaut="demi"
                onValider={png => { setProcedeForm(f => ({ ...f, schema_png: png })); setShowTactipadBiblio(false) }}
                onFermer={() => setShowTactipadBiblio(false)}
                lang={lang}
              />
            </div>
          </div>
        )}

        {/* ── Modal import rapide depuis la bibliothèque (dans un bloc procédé de la fiche) ── */}
        {modalBiblioImport !== null && (
          <div style={{ position: 'fixed', inset: 0, background: colors.background.overlay, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
            onClick={() => setModalBiblioImport(null)}>
            <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '20px', padding: '24px', maxWidth: '520px', width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800 }}>📚 {t('biblio_importer_titre', lang)}</h3>
                <button onClick={() => setModalBiblioImport(null)} style={{ background: 'transparent', border: 'none', color: colors.text.faint, fontSize: '18px', cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                {[
                  { id: 'tous', label: t('biblio_tab_tous', lang) },
                  { id: 'echauffement', label: t('biblio_tab_echauffement', lang) },
                  { id: 'jeu', label: t('biblio_tab_jeu', lang) },
                  { id: 'exercice', label: t('biblio_tab_exercice', lang) },
                  { id: 'situation', label: t('biblio_tab_situation', lang) },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setBiblioTab(tab.id)}
                    style={{ background: biblioTab === tab.id ? colors.accent.blue + alpha.subtle : 'transparent', border: `1px solid ${biblioTab === tab.id ? colors.accent.blue + alpha.medium : colors.border.default}`, color: biblioTab === tab.id ? colors.accent.blue : colors.text.faint, padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    {tab.label}
                  </button>
                ))}
              </div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {biblio.filter(p => biblioTab === 'tous' || p.type === biblioTab).length === 0 ? (
                  <p style={{ fontSize: '12px', color: colors.text.disabled, padding: '8px' }}>{t('biblio_aucun_dans_categorie', lang)}</p>
                ) : biblio.filter(p => biblioTab === 'tous' || p.type === biblioTab).map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: colors.background.surfaceAlt, border: `1px solid ${colors.border.faint}`, borderRadius: '10px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: '13px', marginBottom: '2px' }}>{p.nom}</p>
                      <p style={{ fontSize: '11px', color: colors.text.faint }}>{p.theme || p.type}{p.duree ? ` · ${p.duree} min` : ''}</p>
                    </div>
                    <button onClick={() => importerProcedeDansBloc(modalBiblioImport, p)}
                      style={{ background: colors.accent.blue, color: colors.black, border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>
                      + {t('biblio_importer_action', lang)}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Modal import d'une fiche archivée sur un entraînement déjà créé ── */}
        {modalImportFicheEntrainement !== null && (
          <div style={{ position: 'fixed', inset: 0, background: colors.background.overlay, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
            onClick={() => setModalImportFicheEntrainement(null)}>
            <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '20px', padding: '24px', maxWidth: '520px', width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800 }}>📥 {t('ent_importer_fiche', lang)}</h3>
                <button onClick={() => setModalImportFicheEntrainement(null)} style={{ background: 'transparent', border: 'none', color: colors.text.faint, fontSize: '18px', cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {mesSeancesOuvertes.length === 0 ? (
                  <p style={{ fontSize: '12px', color: colors.text.disabled, padding: '8px' }}>{t('ent_aucune_fiche_archivee', lang)}</p>
                ) : mesSeancesOuvertes.map(s => (
                  <div key={s.id} onClick={() => importerFicheDansEntrainementExistant(s)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '12px 14px', background: colors.background.surfaceAlt, border: `1px solid ${colors.border.faint}`, borderRadius: '10px', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = colors.background.raised}
                    onMouseLeave={e => e.currentTarget.style.background = colors.background.surfaceAlt}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.theme || t('seance_sans_theme', lang)}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.faint }}>{s.date_seance ? new Date(s.date_seance).toLocaleDateString(localeOf(lang)) : ''}</p>
                    </div>
                    <span style={{ color: colors.accent.green, fontSize: '18px', flexShrink: 0 }}>→</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'analyse_video' && (
          <AnalyseVideo userId={userId} lang={lang} />
        )}

        {activeSection === 'prep_physique' && (
          <GestionPrepPhysique educateurId={userId} clubId={clubAffiliation?.club_id} readOnly={!canEdit('prep_physique')} isMobile={isMobile} lang={lang} />
        )}

        {activeSection === 'clotures_saison' && (
          <GestionCloturesSaison educateurId={userId} lang={lang} />
        )}

        {activeSection === 'tactipad' && (
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>🎨 {t('nav_tacticboard', lang)}</h1>
            <p style={{ color: colors.text.faint, fontSize: '13px', marginBottom: '1.5rem' }}>{t('tactic_dessine_schemas', lang)}</p>
            {isMobile ? (
              <div style={{ background: colors.background.raised, border: `1px solid ${colors.border.default}`, borderRadius: '16px', padding: '24px 20px', textAlign: 'center', marginTop: '1rem' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🖥️</div>
                <p style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px', color: colors.text.primary }}>{t('tactic_dispo_ordinateur', lang)}</p>
                <p style={{ color: colors.text.faint, fontSize: '13px', margin: 0 }}>{t('tactic_optimise_grands_ecrans', lang)}</p>
              </div>
            ) : (
              <Tactipad userId={userId} lang={lang} />
            )}
          </div>
        )}

        {activeSection === 'causerie' && (
          clubAffiliation?.club_id && clubAffiliation.statut === 'accepte' ? (
            <CauserieAvantMatch userId={userId} clubId={clubAffiliation.club_id} equipeNom={[profilEdu?.club, profilEdu?.categorie].filter(Boolean).join(' ')} joueurs={joueurs} />
          ) : (
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>🎙️ {t('nav_causerie', lang)}</h1>
              <p style={{ color: colors.text.faint, fontSize: '13px', marginTop: '1rem' }}>
                {clubAffiliation?.statut === 'en_attente'
                  ? `⏳ Ta demande d'affiliation à ${clubAffiliation.club?.club || 'ce club'} est en attente d'acceptation — le club doit d'abord la valider (onglet Éducateurs).`
                  : 'Rejoins un club (code club, dans ton profil) pour accéder à la causerie avant match.'}
              </p>
            </div>
          )
        )}

        {activeSection === 'dirigeants' && (
          <div style={{ maxWidth: 1100 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{t('dir_titre', lang)}</h2>
            <p style={{ color: colors.text.faint, fontSize: 13, marginBottom: 24 }}>
              {t('dir_invite_desc', lang)}
            </p>

            {/* Formulaire invitation — largeur propre, plus étroite que le
                conteneur : un input email + des lignes de permissions restent
                lisibles, pas besoin de s'étirer sur toute la page. */}
            <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 16, padding: 20, marginBottom: 20, maxWidth: 560 }}>
              <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: 14 }}>{t('dir_inviter', lang)}</p>
              <input
                value={newDirigeantEmail}
                onChange={e => setNewDirigeantEmail(e.target.value)}
                placeholder={t('dir_email_placeholder', lang)}
                type="email"
                style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '9px 12px', color: colors.text.primary, fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none', marginBottom: 16, boxSizing: 'border-box' }}
              />

              {/* Grille permissions */}
              <p style={{ margin: '0 0 10px', fontSize: 11, color: colors.text.faint, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{t('dir_permissions', lang)}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {[
                  { key: 'effectif', label: `${t('equipe_effectif', lang)}` },
                  { key: 'stats', label: `${t('nav_stats', lang)}` },
                  { key: 'competition', label: `${t('comp_competition', lang)}` },
                  { key: 'entrainements', label: `${t('nav_entrainements', lang)}` },
                  { key: 'prep_physique', label: `${t('nav_prep_physique', lang)}` },
                  { key: 'notes', label: 'Notes' },
                ].map(({ key, label }) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: colors.background.base, borderRadius: 8 }}>
                    <span style={{ fontSize: 13, color: colors.text.secondary }}>{label}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {['aucun', 'lecture', 'edition'].map(val => (
                        <button key={val} onClick={() => setNewDirigeantPerms(prev => ({ ...prev, [key]: val }))}
                          style={{
                            padding: '4px 10px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                            background: newDirigeantPerms[key] === val ? (val === 'edition' ? colors.accent.green + alpha.soft : val === 'lecture' ? colors.accent.blue + alpha.soft : colors.accent.red + alpha.soft) : colors.background.raised,
                            color: newDirigeantPerms[key] === val ? (val === 'edition' ? colors.accent.green : val === 'lecture' ? colors.accent.blue : colors.accent.red) : colors.text.disabled,
                          }}>
                          {val === 'aucun' ? `${t('dir_aucun', lang)}` : val === 'lecture' ? `${t('dir_lecture', lang)}` : `${t('dir_edition', lang)}`}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={inviterDirigeant} disabled={invitingDirigeant || !newDirigeantEmail.trim()}
                style={{ background: colors.accent.blue, color: colors.black, border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif', opacity: newDirigeantEmail.trim() ? 1 : 0.4 }}>
                {invitingDirigeant ? 'Envoi...' : `${t('dir_envoyer_invitation', lang)}`}
              </button>
            </div>

            {/* Liste dirigeants existants — grille plutôt qu'une colonne unique,
                pour remplir l'espace gagné sur la largeur du conteneur. */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
            {dirigeants.map(d => (
              <div key={d.id} style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 14, padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>{d.email}</p>
                    <p style={{ margin: '3px 0 0', fontSize: 11, color: colors.text.faint }}>
                      {Object.entries(d.permissions || {}).filter(([, v]) => v !== 'aucun').map(([k, v]) => `${k} (${v})`).join(' · ') || t('dir_aucun_acces', lang)}
                    </p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: d.statut === 'accepte' ? colors.accent.green + alpha.subtle : '#f59e0b15', color: d.statut === 'accepte' ? colors.accent.green : '#f59e0b' }}>
                    {d.statut === 'accepte' ? `${t('dir_actif', lang)}` : `${t('etat_en_attente', lang)}`}
                  </span>
                </div>

                {/* Modifier permissions inline */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { key: 'effectif', label: `${t('equipe_effectif', lang)}` },
                    { key: 'stats', label: `${t('nav_stats', lang)}` },
                    { key: 'competition', label: `${t('comp_competition', lang)}` },
                    { key: 'entrainements', label: `${t('nav_entrainements', lang)}` },
                    { key: 'prep_physique', label: `${t('nav_prep_physique', lang)}` },
                    { key: 'notes', label: 'Notes' },
                  ].map(({ key, label }) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px', background: colors.background.sunken, borderRadius: 6 }}>
                      <span style={{ fontSize: 11, color: colors.text.muted }}>{label}</span>
                      <div style={{ display: 'flex', gap: 3 }}>
                        {['aucun', 'lecture', 'edition'].map(val => (
                          <button key={val}
                            onClick={() => modifierPermissions(d.id, key, val)}
                            style={{
                              padding: '3px 8px', borderRadius: 5, border: 'none', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                              background: (d.permissions?.[key] || 'aucun') === val
                                ? (val === 'edition' ? colors.accent.green + alpha.soft : val === 'lecture' ? colors.accent.blue + alpha.soft : colors.accent.red + alpha.soft)
                                : colors.background.raised,
                              color: (d.permissions?.[key] || 'aucun') === val
                                ? (val === 'edition' ? colors.accent.green : val === 'lecture' ? colors.accent.blue : colors.accent.red)
                                : colors.border.strong,
                            }}>
                            {val === 'aucun' ? t('dir_aucun', lang) : val === 'lecture' ? t('dir_lecture', lang) : t('dir_edition', lang)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {d.statut === 'en_attente' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${colors.border.subtle}` }}>
                    <button onClick={() => renvoyerInvitationDirigeant(d)}
                      style={{ background: colors.background.raised, border: `1px solid ${colors.border.default}`, color: colors.accent.blue, borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                      {t('dir_renvoyer', lang)}
                    </button>
                    <button onClick={() => supprimerDirigeant(d.id)}
                      style={{ background: colors.background.raised, border: `1px solid ${colors.border.default}`, color: colors.accent.red, borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                      {t('btn_supprimer', lang)}
                    </button>
                  </div>
                )}
              </div>
            ))}
            </div>
          </div>
        )}

        {activeSection === 'explorer' && (() => {
          const conversations = conversationsExplorer()
          const q = explorerRecherche.trim().toLowerCase()
          const regionQ = explorerRegion.trim().toLowerCase()
          const listeActive = explorerOnglet === 'clubs' ? clubsExplorer : educateursExplorer
          const listeFiltree = explorerOnglet === 'messages' ? [] : listeActive.filter(p => {
            if (regionQ && !(p.region || '').toLowerCase().includes(regionQ)) return false
            if (!q) return true
            return `${p.prenom || ''} ${p.nom || ''} ${p.club || ''}`.toLowerCase().includes(q)
          })

          return (
            <div style={{ maxWidth: 1100 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}><IcoCompass /> Explorer</h2>
              <p style={{ color: colors.text.faint, fontSize: 13, marginBottom: 20 }}>
                Trouve d'autres éducateurs et des clubs pour organiser un amical, te renseigner sur un tournoi ou postuler — et échange directement par message.
              </p>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {[
                  { id: 'educateurs', label: `Éducateurs (${educateursExplorer.length})` },
                  { id: 'clubs', label: `Clubs (${clubsExplorer.length})` },
                  { id: 'messages', label: `Messages (${conversations.length})` },
                ].map(o => (
                  <button key={o.id} onClick={() => setExplorerOnglet(o.id)}
                    style={{ padding: '8px 18px', borderRadius: '20px', border: `1px solid ${explorerOnglet === o.id ? colors.accent.blue : colors.border.default}`, background: explorerOnglet === o.id ? colors.accent.blue + alpha.subtle : 'transparent', color: explorerOnglet === o.id ? colors.accent.blue : colors.text.faint, fontSize: '13px', fontWeight: explorerOnglet === o.id ? 700 : 400, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    {o.label}
                  </button>
                ))}
              </div>

              {explorerOnglet !== 'messages' && (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  <input value={explorerRecherche} onChange={e => setExplorerRecherche(e.target.value)}
                    placeholder="Rechercher un nom, un club..."
                    style={{ ...st.input, flex: 1, minWidth: '200px' }} />
                  <input value={explorerRegion} onChange={e => setExplorerRegion(e.target.value)}
                    placeholder="Toute région"
                    style={{ ...st.input, width: '180px' }} />
                </div>
              )}

              {explorerOnglet === 'messages' ? (
                conversations.length === 0 ? (
                  <p style={{ color: colors.text.disabled, fontSize: '13px', fontStyle: 'italic' }}>Aucune conversation pour l'instant — écris à un éducateur ou un club depuis les onglets ci-dessus.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {conversations.map(c => {
                      const dernier = c.msgs.at(-1)
                      return (
                        <div key={c.id} onClick={() => ouvrirChatExplorer(c)}
                          style={{ ...st.card, display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                          <Avatar person={c} size={40} border={`2px solid ${colors.accent.blue}40`} textColor={colors.accent.blue} bg={colors.accent.blue + '15'} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{c.prenom} {c.nom}</p>
                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: colors.text.faint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {dernier?.sender_id === userId ? 'Toi : ' : ''}{dernier?.content}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              ) : explorerLoading ? (
                <p style={{ color: colors.text.disabled, textAlign: 'center' }}>Chargement...</p>
              ) : listeFiltree.length === 0 ? (
                <p style={{ color: colors.text.disabled, fontSize: '13px', fontStyle: 'italic' }}>Aucun résultat.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                  {listeFiltree.map(p => {
                    const recrutements = explorerOnglet === 'clubs' ? (recrutementsParClubExplorer[p.id] || []) : []
                    const nomAffiche = explorerOnglet === 'clubs' ? (p.club || `${p.prenom || ''} ${p.nom || ''}`.trim()) : `${p.prenom || ''} ${p.nom || ''}`.trim()
                    return (
                      <div key={p.id} onClick={() => ouvrirChatExplorer(p)} style={{ ...st.card, cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                          <Avatar person={{ ...p, nom: nomAffiche }} size={48} border={`2px solid ${colors.accent.blue}30`} textColor={colors.accent.blue} bg={colors.accent.blue + '15'} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomAffiche || '—'}</p>
                              {explorerOnglet === 'clubs' && p.verified && <span title="Profil vérifié" style={{ fontSize: '12px' }}>✅</span>}
                            </div>
                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: colors.text.faint }}>
                              {explorerOnglet === 'educateurs' ? [p.niveau_equipe, p.region].filter(Boolean).join(' · ') : p.region}
                            </p>
                          </div>
                        </div>
                        {(p.description || p.bio) && (
                          <p style={{ margin: '0 0 8px', fontSize: '12px', color: colors.text.disabled, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description || p.bio}</p>
                        )}
                        {recrutements.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                            {recrutements.map((r, i) => (
                              <span key={i} style={{ background: colors.accent.green + alpha.subtle, border: `1px solid ${colors.accent.green}50`, color: colors.accent.green, padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                                Recrute · {r.categorie} · {r.poste}
                              </span>
                            ))}
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                          <button onClick={e => { e.stopPropagation(); navigate(`/clubs/${p.id}`) }}
                            style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '11px', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'Inter, sans-serif' }}>
                            Voir le profil public
                          </button>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: colors.accent.blue, fontSize: '12px', fontWeight: 600 }}><IcoSend /> Message</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {chatOuvert && (
                <div onClick={() => setChatOuvert(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <div onClick={e => e.stopPropagation()} style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '20px 20px 0 0', padding: '20px', width: '100%', maxWidth: '520px', maxHeight: '78vh', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Avatar person={chatOuvert} size={36} border={`2px solid ${colors.accent.blue}40`} textColor={colors.accent.blue} bg={colors.accent.blue + '15'} />
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{chatOuvert.club || `${chatOuvert.prenom || ''} ${chatOuvert.nom || ''}`.trim()}</p>
                      </div>
                      <button onClick={() => setChatOuvert(null)} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '20px', cursor: 'pointer' }}>✕</button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                      {explorerMessages.filter(m => m.sender_id === chatOuvert.id || m.receiver_id === chatOuvert.id).length === 0 ? (
                        <p style={{ color: colors.text.disabled, fontSize: '12px', fontStyle: 'italic', textAlign: 'center' }}>Aucun message pour l'instant — dis bonjour !</p>
                      ) : (
                        explorerMessages.filter(m => m.sender_id === chatOuvert.id || m.receiver_id === chatOuvert.id).map(m => (
                          <div key={m.id} style={{ alignSelf: m.sender_id === userId ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
                            <div style={{
                              background: m.sender_id === userId ? colors.accent.blue : colors.background.raised,
                              color: m.sender_id === userId ? colors.black : colors.text.primary,
                              borderRadius: '12px', padding: '8px 12px', fontSize: '13px', lineHeight: 1.4,
                            }}>{m.content}</div>
                          </div>
                        ))
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <input value={nouveauMessageExplorer} onChange={e => setNouveauMessageExplorer(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && envoyerMessageExplorer()}
                        placeholder="Écrire un message..." style={{ ...st.input, flex: 1 }} />
                      <button onClick={envoyerMessageExplorer} disabled={envoyingMessageExplorer || !nouveauMessageExplorer.trim()}
                        style={{ ...st.btnSolid, opacity: (envoyingMessageExplorer || !nouveauMessageExplorer.trim()) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <IcoSend />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {activeSection === 'profil' && profilEduEdit && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>👤 {t('profil_titre', lang)}</h1>
            </div>

            <div style={{ maxWidth: '900px', marginBottom: '1.5rem' }}>
              <ParrainageWidget userId={userId} accentColor={colors.accent.blue} />
            </div>

            <div className="profil-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', maxWidth: '900px' }}>

              {/* Infos principales */}
              <div className="profil-col-left" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="profil-informations" style={st.card}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '18px' }}>
                    <div style={{ position: 'relative', width: '72px', height: '72px', flexShrink: 0 }}>
                      {profilEduEdit.avatar_url ? (
                        <img src={profilEduEdit.avatar_url} alt="" style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${colors.accent.blue}40` }} />
                      ) : (
                        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: colors.accent.blue + '15', border: `2px solid ${colors.accent.blue}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 700, color: colors.accent.blue }}>
                          {(profilEduEdit.prenom?.[0] || '?')}{(profilEduEdit.nom?.[0] || '')}
                        </div>
                      )}
                      <label style={{ position: 'absolute', bottom: 0, right: 0, width: '24px', height: '24px', background: colors.accent.blue, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: avatarUploadingEdu ? 'wait' : 'pointer', border: '2.5px solid #0a0a0a' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUploadEdu} disabled={avatarUploadingEdu} />
                      </label>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: colors.text.faint }}>
                      {avatarUploadingEdu ? 'Envoi en cours...' : "Photo visible par le club et sur ta page publique."}
                    </p>
                  </div>
                  <p style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '14px' }}>📋 {t('profil_informations', lang)}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={st.label}>{t('equipe_prenom', lang)}</label>
                        <input style={st.input} value={profilEduEdit.prenom || ''} onChange={e => setProfilEduEdit(p => ({ ...p, prenom: e.target.value }))} placeholder="Ton prénom" />
                      </div>
                      <div>
                        <label style={st.label}>{t('equipe_nom', lang)}</label>
                        <input style={st.input} value={profilEduEdit.nom || ''} onChange={e => setProfilEduEdit(p => ({ ...p, nom: e.target.value }))} placeholder="Ton nom" />
                      </div>
                    </div>
                    <div>
                      <label style={st.label}>{t('profil_club', lang)}</label>
                      <input style={st.input} value={profilEduEdit.club || ''} onChange={e => setProfilEduEdit(p => ({ ...p, club: e.target.value }))} placeholder="Nom du club" />
                    </div>
                    <div>
                      <label style={st.label}>Téléphone</label>
                      <input style={st.input} type="tel" value={profilEduEdit.telephone || ''} onChange={e => setProfilEduEdit(p => ({ ...p, telephone: e.target.value }))} placeholder="06 00 00 00 00" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={st.label}>{t('profil_categorie_entrainee', lang)}</label>
                        <select style={st.input} value={profilEduEdit.categorie || ''} onChange={e => setProfilEduEdit(p => ({ ...p, categorie: e.target.value }))}>
                          <option value="">{t('equipe_choisir', lang)}</option>
                          {[...CATEGORIES, 'Vétérans'].map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={st.label}>{t('profil_niveau_championnat', lang)}</label>
                        <select style={st.input} value={profilEduEdit.niveau_championnat || ''} onChange={e => setProfilEduEdit(p => ({ ...p, niveau_championnat: e.target.value }))}>
                          <option value="">{t('equipe_choisir', lang)}</option>
                          {['National 3','Régional 1','Régional 2','Régional 3','Départemental 1','Départemental 2','Départemental 3','District','Loisir'].map(n => <option key={n}>{n}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={st.label}>🏆 {t('profil_lien_classement', lang)}</label>
                        <input style={st.input} type="url" placeholder="https://fff.fr/..." value={profilEduEdit.ligue_url || ''} onChange={e => setProfilEduEdit(p => ({ ...p, ligue_url: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Diplôme */}
                <div className="profil-diplome" style={st.card}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>🎓 {t('profil_diplome', lang)}</p>
                    {profilEdu?.diplome_verifie && (
                      <span style={{ background: colors.accent.green + alpha.soft, border: '1px solid #4ade8040', color: colors.accent.green, fontSize: '11px', fontWeight: 700, padding: '2px 10px', borderRadius: '20px' }}>✅ {t('profil_certifie', lang)}</span>
                    )}
                    {profilEdu?.diplome_url && !profilEdu?.diplome_verifie && (
                      <span style={{ background: '#f59e0b20', border: '1px solid #f59e0b40', color: '#f59e0b', fontSize: '11px', fontWeight: 700, padding: '2px 10px', borderRadius: '20px' }}>⏳ {t('profil_en_attente_verif', lang)}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={st.label}>{t('profil_diplome_obtenu', lang)}</label>
                      <select style={st.input} value={profilEduEdit.diplome || ''} onChange={e => setProfilEduEdit(p => ({ ...p, diplome: e.target.value }))}>
                        <option value="">{t('equipe_choisir', lang)}</option>
                        {['UEFA A','UEFA B','UEFA C','BEF (Brevet d\'État)','BMF','CFF1','CFF2','Animateur','Initiateur','Éducateur Sportif','Aucun diplôme'].map(d => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={st.label}>{t('profil_preuve_diplome', lang)}</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', background: colors.background.base, border: `1px dashed ${colors.border.default}`, borderRadius: '8px', padding: '10px 14px', cursor: 'pointer' }}>
                        <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => uploadDiplome(e.target.files[0])} />
                        <span style={{ fontSize: '13px', color: colors.text.faint }}>{uploadingDiplome ? '⏳ Upload...' : profilEdu?.diplome_url ? `✅ ${t('profil_preuve_uploadee', lang)}` : `📎 ${t('profil_uploader_preuve', lang)}`}</span>
                      </label>
                      {profilEdu?.diplome_url && (
                        <a href={profilEdu.diplome_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: colors.accent.green, marginTop: '4px', display: 'block' }}>{t('profil_voir_document', lang)} ↗</a>
                      )}
                    </div>
                  </div>
                </div>

                <button className="profil-save" onClick={sauvegarderProfilEdu} disabled={savingProfil} style={st.btnSolid}>
                  {savingProfil ? '⏳ Sauvegarde...' : `💾 ${t('profil_sauvegarder_profil', lang)}`}
                </button>
              </div>

              {/* Parcours football */}
              <div className="profil-col-right" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="profil-parcours" style={st.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>⚽ {t('profil_parcours_football', lang)}</p>
                    <button onClick={() => setShowAddParcours(true)} style={st.btn()}>+ {t('btn_ajouter', lang)}</button>
                  </div>

                  {showAddParcours && (
                    <div style={{ background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: '10px', padding: '14px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={st.label}>{t('profil_type', lang)}</label>
                          <select style={st.input} value={newParcours.type} onChange={e => setNewParcours(p => ({ ...p, type: e.target.value }))}>
                            <option value="coach">🎙️ Coach</option>
                            <option value="joueur">⚽ Joueur</option>
                          </select>
                        </div>
                        <div>
                          <label style={st.label}>{t('profil_club', lang)} *</label>
                          <input style={st.input} placeholder="Nom du club" value={newParcours.club} onChange={e => setNewParcours(p => ({ ...p, club: e.target.value }))} />
                        </div>
                        <div>
                          <label style={st.label}>{t('profil_role_poste', lang)}</label>
                          <input style={st.input} placeholder="Attaquant, Entraîneur principal..." value={newParcours.poste} onChange={e => setNewParcours(p => ({ ...p, poste: e.target.value }))} />
                        </div>
                        <div>
                          <label style={st.label}>{t('profil_niveau_parcours', lang)}</label>
                          <input style={st.input} placeholder="National, Régional..." value={newParcours.niveau} onChange={e => setNewParcours(p => ({ ...p, niveau: e.target.value }))} />
                        </div>
                        <div>
                          <label style={st.label}>{t('profil_saison_debut', lang)}</label>
                          <input style={st.input} placeholder="2018" value={newParcours.saison_debut} onChange={e => setNewParcours(p => ({ ...p, saison_debut: e.target.value }))} />
                        </div>
                        <div>
                          <label style={st.label}>{t('profil_saison_fin', lang)}</label>
                          <input style={st.input} placeholder="2022 ou En cours" value={newParcours.saison_fin} onChange={e => setNewParcours(p => ({ ...p, saison_fin: e.target.value }))} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={ajouterParcours} style={st.btnSolid}>{t('btn_ajouter', lang)}</button>
                        <button onClick={() => setShowAddParcours(false)} style={st.btn(colors.text.dim)}>{t('btn_annuler', lang)}</button>
                      </div>
                    </div>
                  )}

                  {parcoursEdu.length === 0 && !showAddParcours && (
                    <p style={{ color: colors.border.strong, fontSize: '13px', textAlign: 'center', padding: '1.5rem 0', margin: 0 }}>{t('profil_aucun_parcours', lang)}</p>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {parcoursEdu.map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: colors.background.base, borderRadius: '10px', border: `1px solid ${colors.border.subtle}` }}>
                        <span style={{ fontSize: '18px' }}>{p.type === 'coach' ? '🎙️' : '⚽'}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.club}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.faint }}>
                            {p.poste && `${p.poste} · `}{p.niveau && `${p.niveau} · `}
                            {p.saison_debut && p.saison_fin ? `${p.saison_debut} → ${p.saison_fin}` : p.saison_debut || ''}
                          </p>
                        </div>
                        <button onClick={() => supprimerParcours(p.id)} style={{ background: 'none', border: 'none', color: colors.border.strong, cursor: 'pointer', fontSize: '14px', flexShrink: 0 }}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Aperçu profil public */}
                {profilEdu && (
                  <div className="profil-apercu" style={{ ...st.card, border: '1px solid #4ade8020' }}>
                    <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: '13px', color: colors.accent.green }}>👁️ {t('profil_apercu_public', lang)}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
                      <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: colors.accent.green + alpha.soft, border: '2px solid #4ade8040', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800, color: colors.accent.green, flexShrink: 0 }}>
                        {profilEdu.prenom?.[0]}{profilEdu.nom?.[0]}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: '15px' }}>{profilEdu.prenom} {profilEdu.nom}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: colors.text.faint }}>{profilEdu.club || t('profil_club_non_renseigne', lang)} · {profilEdu.categorie || '—'}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {profilEdu.diplome && (
                        <span style={{ background: profilEdu.diplome_verifie ? colors.accent.green + alpha.subtle : colors.background.raised, border: `1px solid ${profilEdu.diplome_verifie ? colors.accent.green + alpha.medium : colors.border.default}`, color: profilEdu.diplome_verifie ? colors.accent.green : colors.text.dim, fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' }}>
                          {profilEdu.diplome_verifie ? '✅' : '🎓'} {profilEdu.diplome}
                        </span>
                      )}
                      {profilEdu.niveau_championnat && (
                        <span style={{ background: colors.background.raised, border: `1px solid ${colors.border.default}`, color: colors.text.muted, fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' }}>
                          🏆 {profilEdu.niveau_championnat}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Abonnement */}
                <div className="profil-abonnement" style={st.card}>
                  <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '14px' }}>💳 {t('edu_offre_titre', lang)}</p>
                  <p style={{ margin: '0 0 14px', fontSize: '12px', color: colors.text.faint, lineHeight: 1.6 }}>{t('edu_offre_desc', lang)}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button onClick={() => window.open(stripeUrl(STRIPE_LINKS_EDU.edu_mensuel, userId, profil?.email), '_blank')} style={{ background: 'transparent', color: 'white', border: `1px solid ${colors.border.default}`, padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{t('edu_offre_mensuel', lang)}</button>
                    <button onClick={() => window.open(stripeUrl(STRIPE_LINKS_EDU.edu_annuel, userId, profil?.email), '_blank')} style={{ background: colors.accent.blue, color: colors.black, border: 'none', padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{t('edu_offre_annuel', lang)}</button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Joueurs affiliés ── */}
            <div style={{ maxWidth: '900px', marginTop: '1.5rem' }}>
              <div style={st.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '14px' }}>👥 {t('profil_joueurs_affilies', lang)}</p>
                    <p style={{ margin: 0, fontSize: '12px', color: colors.text.faint }}>{t('profil_seuls_joueurs', lang)}</p>
                  </div>
                  {profilEdu?.code_equipe && (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ margin: '0 0 4px', fontSize: '11px', color: colors.text.faint }}>{t('profil_code_equipe', lang)}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ background: colors.accent.green + alpha.subtle, border: '1px solid #4ade8040', color: colors.accent.green, fontWeight: 800, fontSize: '16px', padding: '6px 14px', borderRadius: '8px', letterSpacing: '2px', fontFamily: 'monospace' }}>
                          {profilEdu.code_equipe.toUpperCase()}
                        </span>
                        <button onClick={() => navigator.clipboard.writeText(profilEdu.code_equipe.toUpperCase())}
                          style={{ background: colors.background.raised, border: `1px solid ${colors.border.default}`, color: colors.text.secondary, padding: '6px 10px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
                          📋
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Demandes en attente */}
                {affiliations.filter(a => a.statut === 'en_attente').length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 700, color: '#f59e0b' }}>⏳ {t('profil_demandes_attente', lang)} ({affiliations.filter(a => a.statut === 'en_attente').length})</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {affiliations.filter(a => a.statut === 'en_attente').map(a => (
                        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#f59e0b08', border: '1px solid #f59e0b20', borderRadius: '10px' }}>
                          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#f59e0b20', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, color: '#f59e0b', flexShrink: 0 }}>
                            {a.joueur_profil?.avatar_url
                              ? <img src={a.joueur_profil.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <>{a.joueur_profil?.prenom?.[0] || '?'}{a.joueur_profil?.nom?.[0] || ''}</>
                            }
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{a.joueur_profil ? `${a.joueur_profil.prenom || ''} ${a.joueur_profil.nom || ''}`.trim() : t('profil_compte_joueur', lang)}</p>
                            <p style={{ margin: 0, fontSize: '11px', color: colors.text.faint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.joueur_profil?.email || `ID: ${a.joueur_id?.slice(0, 8)}…`}</p>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => { setAffiliationEnCours(a); setJoueurLieId('') }}
                              style={{ background: colors.accent.blue + alpha.soft, border: '1px solid #60a5fa40', color: colors.accent.blue, padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                              ✅ {t('equipe_accepter', lang)}
                            </button>
                            <button onClick={() => gererAffiliation(a.id, 'refuse')}
                              style={{ background: colors.accent.red + alpha.soft, border: '1px solid #ef444440', color: colors.accent.red, padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                              ✕ {t('equipe_refuser', lang)}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Joueurs acceptés */}
                <div>
                  <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 700, color: colors.accent.green }}>
                    ✅ {t('profil_joueurs_affilies_count', lang)} ({affiliations.filter(a => a.statut === 'accepte').length})
                  </p>
                  {affiliations.filter(a => a.statut === 'accepte').length === 0 ? (
                    <p style={{ color: colors.border.strong, fontSize: '12px', margin: 0 }}>{t('profil_aucun_affilie', lang)}</p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {affiliations.filter(a => a.statut === 'accepte').map(a => (
                        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: '#4ade8010', border: '1px solid #4ade8025', borderRadius: '20px' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: colors.accent.green + alpha.soft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: colors.accent.green }}>
                            {a.joueur?.prenom?.[0] || '?'}{a.joueur?.nom?.[0] || ''}
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 600 }}>{a.joueur ? `${a.joueur.prenom} ${a.joueur.nom}` : t('profil_compte_joueur', lang)}</span>
                          <button onClick={() => gererAffiliation(a.id, 'refuse')}
                            style={{ background: 'none', border: 'none', color: colors.border.strong, cursor: 'pointer', fontSize: '12px', padding: 0 }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Mon club ── */}
            <div style={{ maxWidth: '900px', marginTop: '1.5rem' }}>
              <div style={st.card}>
                <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '14px' }}>🏟️ {t('profil_mon_club', lang)}</p>
                <p style={{ margin: '0 0 16px', fontSize: '12px', color: colors.text.faint }}>{t('profil_rejoins_club_code', lang)}</p>

                {clubAffiliation ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', background: clubAffiliation.statut === 'accepte' ? '#4ade8010' : '#f59e0b10', border: `1px solid ${clubAffiliation.statut === 'accepte' ? colors.accent.green + alpha.light : '#f59e0b30'}`, borderRadius: '10px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#1a2e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: colors.accent.green }}>
                      {(clubAffiliation.club?.club || clubAffiliation.club?.prenom || '?')[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{clubAffiliation.club?.club || `${clubAffiliation.club?.prenom} ${clubAffiliation.club?.nom}`}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: clubAffiliation.statut === 'accepte' ? colors.accent.green : '#f59e0b' }}>
                        {clubAffiliation.statut === 'accepte' ? `✅ ${t('profil_affilie', lang)}` : clubAffiliation.statut === 'en_attente' ? `⏳ ${t('profil_en_attente_club', lang)}` : `✕ ${t('profil_refuse', lang)}`}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      style={{ ...st.input, textTransform: 'uppercase', letterSpacing: '2px', fontFamily: 'monospace' }}
                      placeholder="CODE CLUB"
                      value={codeClubInput}
                      onChange={e => { setCodeClubInput(e.target.value.toUpperCase()); setCodeClubError(null) }}
                      onKeyDown={e => e.key === 'Enter' && rejoindreClub()}
                    />
                    <button onClick={rejoindreClub} disabled={sendingCodeClub || !codeClubInput.trim()} style={st.btnSolid}>
                      {sendingCodeClub ? '...' : t('profil_rejoindre', lang)}
                    </button>
                  </div>
                )}
                {codeClubError && <p style={{ color: colors.accent.red, fontSize: '12px', marginTop: '8px' }}>⚠️ {codeClubError}</p>}
                {codeClubSuccess && <p style={{ color: colors.accent.green, fontSize: '12px', marginTop: '8px' }}>✅ {t('profil_demande_envoyee', lang)}</p>}
              </div>
            </div>

            {/* ── Section avis & notations ── */}
            {(() => {
              // Calcul des moyennes par critère agrégé sur tous les avis
              const allCriteres = {}
              notesEdu.forEach(n => {
                if (!n.criteres) return
                Object.entries(n.criteres).forEach(([k, v]) => {
                  if (!allCriteres[k]) allCriteres[k] = []
                  allCriteres[k].push(v)
                })
              })
              const moyC = (key) => {
                const vals = allCriteres[key] || []
                return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null
              }
              const moyCategorie = (cat) => {
                const vals = cat.criteres.map(c => moyC(c.key)).filter(v => v !== null)
                return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null
              }
              const allMoys = CRITERES_EDU.map(c => moyCategorie(c)).filter(v => v !== null)
              const moyGlobale = allMoys.length ? allMoys.reduce((s, v) => s + v, 0) / allMoys.length : null

              return (
                <div style={{ maxWidth: '900px', marginTop: '1.5rem' }}>
                  {/* En-tête score global */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>⭐ {t('profil_evaluations_recues', lang)}</h2>
                    {moyGlobale !== null ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: colors.accent.amber + alpha.subtle, border: '1px solid #fbbf2430', borderRadius: '12px', padding: '6px 16px' }}>
                        <span style={{ fontSize: '24px', fontWeight: 900, color: colors.accent.amber }}>{moyGlobale.toFixed(1)}</span>
                        <div>
                          <div style={{ color: colors.accent.amber, fontSize: '14px', lineHeight: 1 }}>{'★'.repeat(Math.round(moyGlobale))}{'☆'.repeat(5 - Math.round(moyGlobale))}</div>
                          <div style={{ fontSize: '10px', color: colors.text.faint, marginTop: '2px' }}>{notesEdu.length} évaluation{notesEdu.length > 1 ? 's' : ''}</div>
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: colors.border.strong }}>{t('profil_aucune_evaluation', lang)}</span>
                    )}
                  </div>

                  {/* Grille 6 catégories */}
                  {moyGlobale !== null && (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                      {CRITERES_EDU.map(cat => {
                        const mCat = moyCategorie(cat)
                        return (
                          <div key={cat.key} style={{ ...st.card, border: `1px solid ${cat.color}20` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: cat.color }}>{cat.label}</p>
                              {mCat !== null && (
                                <span style={{ fontSize: '16px', fontWeight: 800, color: cat.color }}>{mCat.toFixed(1)}<span style={{ fontSize: '10px', color: colors.text.disabled }}>/5</span></span>
                              )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                              {cat.criteres.map(c => {
                                const val = moyC(c.key)
                                return (
                                  <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '11px', color: colors.text.dim, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</span>
                                    {val !== null ? (
                                      <>
                                        <div style={{ width: '80px', height: '5px', background: colors.background.raised, borderRadius: '3px', flexShrink: 0 }}>
                                          <div style={{ width: `${(val / 5) * 100}%`, height: '100%', background: cat.color, borderRadius: '3px' }} />
                                        </div>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: cat.color, width: '24px', textAlign: 'right', flexShrink: 0 }}>{val.toFixed(1)}</span>
                                      </>
                                    ) : (
                                      <span style={{ fontSize: '10px', color: colors.border.strong }}>—</span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Commentaires par saison */}
                  {notesEdu.filter(n => n.commentaire).length > 0 && (
                    <div style={st.card}>
                      <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: '13px' }}>💬 {t('profil_commentaires', lang)}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {notesEdu.filter(n => n.commentaire).map(n => (
                          <div key={n.id} style={{ display: 'flex', gap: '10px', padding: '10px 12px', background: colors.background.base, borderRadius: '10px', border: `1px solid ${colors.border.subtle}` }}>
                            <span style={{ fontSize: '18px', flexShrink: 0 }}>{n.auteur_type === 'club' ? '🏟️' : '⚽'}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700 }}>{n.profiles?.prenom} {n.profiles?.nom}</span>
                                <span style={{ fontSize: '10px', color: n.auteur_type === 'club' ? colors.accent.blue : colors.accent.green }}>{n.auteur_type === 'club' ? t('profil_club_label', lang) : t('profil_joueur_label', lang)}</span>
                                {n.saison && <span style={{ fontSize: '10px', color: colors.text.disabled }}>{n.saison}</span>}
                                {!n.visible_public && <span style={{ fontSize: '10px', color: colors.text.disabled, background: colors.background.surface, padding: '1px 6px', borderRadius: '6px', marginLeft: 'auto' }}>🔒 {t('profil_prive', lang)}</span>}
                              </div>
                              <p style={{ margin: 0, fontSize: '12px', color: colors.text.muted, fontStyle: 'italic' }}>"{n.commentaire}"</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </>
        )}

      </div>
    </div>

    {/* ===== MODALE SCANNER FEUILLE DE MATCH ===== */}
    {showScanner && (
      <div style={{ position: 'fixed', inset: 0, background: '#000000ee', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px' }}>
        <div style={{ background: colors.background.base, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', width: '100%', maxWidth: '900px', padding: '24px' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>📸 {t('scan_feuille_titre', lang)}</h2>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: colors.text.faint }}>{t('scan_feuille_desc', lang)}</p>
            </div>
            <button onClick={() => { setShowScanner(false); setScannerResult(null); setScannerImageBase64(null); setScannerImagePreview(null); setScannerError(null); setScannerWarning(null) }}
              style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '22px', cursor: 'pointer' }}>✕</button>
          </div>

          {!scannerResult ? (
            <div>
              <div
                onClick={() => document.getElementById('scanner-input').click()}
                onDragOver={e => e.preventDefault()}
                onDrop={async e => {
                  e.preventDefault()
                  const file = e.dataTransfer.files[0]; if (!file) return
                  const { base64, preview } = await redimensionnerImagePourScan(file)
                  setScannerImageBase64(base64); setScannerImagePreview(preview)
                }}
                style={{ border: `2px dashed ${colors.border.default}`, borderRadius: '12px', padding: '40px', textAlign: 'center', cursor: 'pointer', background: colors.background.base }}>
                {scannerImagePreview
                  ? <img src={scannerImagePreview} alt="Feuille" style={{ maxHeight: '400px', maxWidth: '100%', borderRadius: '8px', objectFit: 'contain' }} />
                  : <div>
                      <p style={{ fontSize: '40px', margin: '0 0 10px' }}>📄</p>
                      <p style={{ margin: 0, fontWeight: 600, color: colors.text.secondary }}>{t('scan_clique_glisse', lang)}</p>
                      <p style={{ margin: '6px 0 0', fontSize: '12px', color: colors.text.disabled }}>{t('seance_jpg_png', lang)}</p>
                    </div>
                }
              </div>
              <input id="scanner-input" type="file" accept="image/*" style={{ display: 'none' }}
                onChange={async e => {
                  const file = e.target.files[0]; if (!file) return
                  const { base64, preview } = await redimensionnerImagePourScan(file)
                  setScannerImageBase64(base64); setScannerImagePreview(preview)
                }} />
              {scannerError && <p style={{ color: '#f87171', fontSize: '13px', marginTop: '12px' }}>⚠️ {scannerError}</p>}
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button onClick={scannerMatch} disabled={!scannerImageBase64 || scannerLoading} style={{ ...st.btnSolid, flex: 1, opacity: !scannerImageBase64 ? 0.4 : 1 }}>
                  {scannerLoading ? `🔍 ${libelleStatutGroq(scannerStatus)}` : `✨ ${t('seance_analyser_ia', lang)}`}
                </button>
                <button onClick={() => { setShowScanner(false); setScannerError(null) }} style={st.btn(colors.text.dim)}>{t('btn_annuler', lang)}</button>
              </div>
              {scannerLoading && (
                <div style={{ marginTop: '16px', background: '#0d1a0d', border: '1px solid #1a3a1a', borderRadius: '10px', padding: '14px', fontSize: '13px', color: colors.accent.green }}>
                  🤖 {t('scan_ia_lit_feuille', lang)}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '300px 1fr', gap: '20px', alignItems: 'flex-start' }}>
                <div>
                  <img src={scannerImagePreview} alt="Feuille" style={{ width: '100%', borderRadius: '8px', objectFit: 'contain', maxHeight: '300px', background: colors.background.base }} />
                  <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div><label style={st.label}>{t('ent_date', lang)}</label><input style={st.input} type="date" value={scannerMatchData.date} onChange={e => setScannerMatchData(d => ({ ...d, date: e.target.value }))} /></div>
                    <div><label style={st.label}>{t('comp_adversaire', lang)}</label><input style={st.input} value={scannerMatchData.adversaire} onChange={e => setScannerMatchData(d => ({ ...d, adversaire: e.target.value }))} /></div>
                    <div><label style={st.label}>{t('comp_competition', lang)}</label><input style={st.input} value={scannerMatchData.competition || ''} onChange={e => setScannerMatchData(d => ({ ...d, competition: e.target.value }))} /></div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ flex: 1 }}><label style={st.label}>Score (nous)</label><input style={st.input} type="number" value={scannerMatchData.score_nous} onChange={e => setScannerMatchData(d => ({ ...d, score_nous: e.target.value }))} /></div>
                      <div style={{ flex: 1 }}><label style={st.label}>Score (eux)</label><input style={st.input} type="number" value={scannerMatchData.score_eux} onChange={e => setScannerMatchData(d => ({ ...d, score_eux: e.target.value }))} /></div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: colors.text.secondary, cursor: 'pointer' }}>
                      <input type="checkbox" checked={scannerMatchData.domicile} onChange={e => setScannerMatchData(d => ({ ...d, domicile: e.target.checked }))} />
                      {t('scan_match_domicile', lang)}
                    </label>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  {scannerWarning && (
                    <div style={{ background: '#2d1500', border: '1px solid #854d0e', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', color: '#facc15', fontSize: '13px' }}>
                      {scannerWarning}
                    </div>
                  )}
                  <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '13px', color: colors.accent.green }}>
                    ✅ {Object.keys(scannerStats).length} joueur{Object.keys(scannerStats).length > 1 ? 's' : ''} détecté{Object.keys(scannerStats).length > 1 ? 's' : ''} automatiquement
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 55px 55px 55px 55px 32px 32px', gap: '4px', marginBottom: '6px', minWidth: '380px' }}>
                    {['Joueur', 'Min', 'Buts', 'PD ✏️', 'CS', '🟨', '🟥'].map(h => (
                      <span key={h} style={{ fontSize: '10px', color: colors.text.disabled, textAlign: h === 'Joueur' ? 'left' : 'center', textTransform: 'uppercase' }}>{h}</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '460px', overflowY: 'auto' }}>
                    {joueurs.map(j => {
                      const s = scannerStats[j.id] || {}
                      const detected = !!scannerStats[j.id]
                      const setS = (field, val) => setScannerStats(prev => ({
                        ...prev,
                        [j.id]: { minutes: 0, buts: 0, passes_dec: 0, clean_sheet: false, carton_jaune: false, carton_rouge: false, ...(prev[j.id] || {}), [field]: val }
                      }))
                      return (
                        <div key={j.id} style={{ display: 'grid', gridTemplateColumns: '1fr 55px 55px 55px 55px 32px 32px', gap: '4px', alignItems: 'center', padding: '6px 8px', background: detected ? '#0d1a0d' : colors.background.base, borderRadius: '6px', border: `1px solid ${detected ? '#1a3a1a' : colors.background.surface}`, minWidth: '380px' }}>
                          <span style={{ fontSize: '12px', fontWeight: detected ? 700 : 500, color: detected ? colors.text.primary : colors.text.disabled, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {detected ? '✓ ' : ''}{j.prenom} {j.nom?.[0] || ''}.
                          </span>
                          <input type="number" min="0" max="120" value={s.minutes ?? ''} placeholder="—"
                            onChange={e => setS('minutes', parseInt(e.target.value) || 0)}
                            style={{ ...st.input, padding: '4px 6px', fontSize: '12px', textAlign: 'center', background: detected ? colors.background.surface : colors.background.sunken }} />
                          <input type="number" min="0" value={s.buts ?? ''} placeholder="—"
                            onChange={e => setS('buts', parseInt(e.target.value) || 0)}
                            style={{ ...st.input, padding: '4px 6px', fontSize: '12px', textAlign: 'center', background: detected ? colors.background.surface : colors.background.sunken }} />
                          <input type="number" min="0" value={s.passes_dec ?? ''} placeholder="—"
                            onChange={e => setS('passes_dec', parseInt(e.target.value) || 0)}
                            style={{ ...st.input, padding: '4px 6px', fontSize: '12px', textAlign: 'center' }} />
                          <input type="number" min="0" max="1" value={s.clean_sheet ? 1 : ''} placeholder="—"
                            onChange={e => setS('clean_sheet', e.target.value === '1')}
                            style={{ ...st.input, padding: '4px 6px', fontSize: '12px', textAlign: 'center', background: detected ? colors.background.surface : colors.background.sunken }} />
                          <span onClick={() => setS('carton_jaune', !s.carton_jaune)} style={{ textAlign: 'center', cursor: 'pointer', fontSize: '16px', opacity: s.carton_jaune ? 1 : 0.2 }}>🟨</span>
                          <span onClick={() => setS('carton_rouge', !s.carton_rouge)} style={{ textAlign: 'center', cursor: 'pointer', fontSize: '16px', opacity: s.carton_rouge ? 1 : 0.2 }}>🟥</span>
                        </div>
                      )
                    })}
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: '11px', color: colors.border.strong }}>✏️ PD (passes décisives) et CS (clean sheet) sont à compléter manuellement</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', borderTop: `1px solid ${colors.border.subtle}`, paddingTop: '16px' }}>
                <button onClick={sauvegarderMatchScanne} disabled={scannerSaving || !scannerMatchData.adversaire} style={{ ...st.btnSolid, flex: 1 }}>
                  {scannerSaving ? 'Enregistrement...' : `💾 ${t('scan_enregistrer_match', lang)}`}
                </button>
                <button onClick={() => { setScannerResult(null); setScannerError(null); setScannerWarning(null) }} style={st.btn(colors.text.dim)}>← {t('scan_rescanner', lang)}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    )}
    {/* ===== MODAL LIAISON JOUEUR AFFILIÉ ===== */}
    {affiliationEnCours && (
      <div style={{ position: 'fixed', inset: 0, background: '#000000ee', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ background: colors.background.base, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', width: '100%', maxWidth: '460px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
          <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '16px' }}>✅ {t('liaison_accepter_demande', lang)}</p>
          <p style={{ margin: '0 0 20px', fontSize: '12px', color: colors.text.dim }}>
            {t('liaison_lier_joueur', lang)} <strong style={{ color: colors.text.secondary }}>({affiliationEnCours.joueur_id?.slice(0, 8)}…)</strong> {t('liaison_a_joueur_effectif', lang)}
          </p>

          <label style={{ display: 'block', fontSize: '12px', color: colors.text.muted, marginBottom: '6px' }}>{t('liaison_joueur_correspondant', lang)}</label>
          <select
            value={joueurLieId}
            onChange={e => setJoueurLieId(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${colors.border.faint}`, background: colors.background.surface, color: colors.text.primary, fontSize: '13px', marginBottom: '20px' }}
          >
            <option value="">{t('liaison_selectionner_joueur', lang)}</option>
            {joueurs.map(j => (
              <option key={j.id} value={j.id}>{j.prenom} {j.nom}{j.poste ? ` — ${j.poste}` : ''}</option>
            ))}
          </select>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => gererAffiliation(affiliationEnCours.id, 'accepte', joueurLieId)}
              disabled={!joueurLieId}
              style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #60a5fa40', background: joueurLieId ? colors.accent.blue + alpha.soft : colors.background.raised, color: joueurLieId ? colors.accent.blue : colors.text.disabled, fontWeight: 700, fontSize: '13px', cursor: joueurLieId ? 'pointer' : 'not-allowed' }}
            >
              ✅ {t('liaison_confirmer', lang)}
            </button>
            <button
              onClick={() => { setAffiliationEnCours(null); setJoueurLieId('') }}
              style={{ padding: '10px 16px', borderRadius: '10px', border: `1px solid ${colors.border.strong}`, background: 'transparent', color: colors.text.dim, fontSize: '13px', cursor: 'pointer' }}
            >
              {t('btn_annuler', lang)}
            </button>
          </div>
          <p style={{ margin: '12px 0 0', fontSize: '11px', color: colors.text.disabled, textAlign: 'center' }}>
            {t('liaison_optionnelle', lang)}
          </p>
        </div>
      </div>
    )}

    <FicheSeancePrint fiche={{ ...fiche, sport }} categorieLabel={CATEGORIES_TACTIQUES.find(c => c.value === fiche.categorie_tactique)?.label} />

    {ficheApercu && (() => {
      // Le modal .fiche-render est une feuille blanche (texte noir, cf. index.css)
      // même en mode édition, pour rester visuellement cohérent avec l'aperçu en
      // lecture — juste un soulignement vert pour distinguer les champs éditables.
      const champEditStyle = { border: 'none', borderBottom: '1px solid #4ade80', background: 'transparent', color: colors.black, fontSize: '13px', width: '100%', outline: 'none', padding: '2px 0', fontFamily: 'inherit' }
      const champEditTextareaStyle = { ...champEditStyle, resize: 'vertical', display: 'block' }
      return (
      <div style={{ position: 'fixed', inset: 0, background: '#000000dd', zIndex: 3000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', paddingTop: 'calc(20px + env(safe-area-inset-top, 0px))', overflowY: 'auto' }}
        onClick={() => { if (!modeEditionApercu) setFicheApercu(null) }}>
        <div style={{ background: 'transparent', maxWidth: '840px', width: '100%' }} onClick={e => e.stopPropagation()}>
          <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '12px', background: '#000000dd', padding: '6px 0', borderRadius: '8px' }}>
            {ficheApercu.fichier_url && !modeEditionApercu && (
              <a href={ficheApercu.fichier_url} target="_blank" rel="noreferrer"
                style={{ background: colors.accent.blue, color: colors.black, padding: '8px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ⬇️ {t('seance_fichier', lang)}
              </a>
            )}
            {modeEditionApercu ? (
              <>
                <button onClick={sauvegarderFicheApercuEdit} disabled={savingFicheApercu}
                  style={{ background: colors.accent.green, color: colors.black, border: 'none', borderRadius: '8px', padding: '8px 18px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: savingFicheApercu ? 0.6 : 1 }}>
                  {savingFicheApercu ? 'Enregistrement...' : `✓ ${t('btn_sauvegarder', lang)}`}
                </button>
                <button onClick={annulerEditionApercu}
                  style={{ background: colors.background.raised, border: `1px solid ${colors.border.strong}`, color: colors.text.secondary, borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  {t('btn_annuler', lang)}
                </button>
              </>
            ) : (
              <>
                <button onClick={ouvrirEditionApercu}
                  style={{ background: colors.background.surface, border: `1px solid ${colors.border.strong}`, color: colors.text.primary, borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  ✏️ {t('btn_modifier', lang)}
                </button>
                <button onClick={() => setFicheApercu(null)} style={{ background: colors.background.raised, border: `1px solid ${colors.border.strong}`, color: colors.text.primary, borderRadius: '8px', padding: '8px 16px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  ✕ {t('btn_fermer', lang)}
                </button>
              </>
            )}
          </div>
          <div className="fiche-render" style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: '0 24px 80px #00000060', margin: '0 auto' }}>
            {modeEditionApercu && ficheApercuEdit ? (
              <>
                <div className="fiche-header">
                  <div className="fiche-row fiche-row-1">
                    <div className="fiche-champ large">
                      <label>Thème</label>
                      <input value={ficheApercuEdit.theme} onChange={e => setFicheApercuEdit(f => ({ ...f, theme: e.target.value }))} style={champEditStyle} />
                    </div>
                    <div className="fiche-champ">
                      <label>Date</label>
                      <input type="date" value={ficheApercuEdit.date} onChange={e => setFicheApercuEdit(f => ({ ...f, date: e.target.value }))} style={champEditStyle} />
                    </div>
                    <div className="fiche-champ">
                      <label>Catégorie</label>
                      <select value={ficheApercuEdit.categorie_tactique} onChange={e => setFicheApercuEdit(f => ({ ...f, categorie_tactique: e.target.value }))} style={champEditStyle}>
                        <option value="">—</option>
                        {CATEGORIES_TACTIQUES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                    <div className="fiche-champ">
                      <label>Nb joueurs</label>
                      <input value={ficheApercuEdit.nb_joueurs} onChange={e => setFicheApercuEdit(f => ({ ...f, nb_joueurs: e.target.value }))} style={champEditStyle} />
                    </div>
                  </div>
                  <div className="fiche-row fiche-row-2">
                    <div className="fiche-champ">
                      <label>Durée totale</label>
                      <input value={ficheApercuEdit.duree_totale} onChange={e => setFicheApercuEdit(f => ({ ...f, duree_totale: e.target.value }))} style={champEditStyle} />
                    </div>
                    <div className="fiche-champ large">
                      <label>Objectif général</label>
                      <input value={ficheApercuEdit.objectif_general} onChange={e => setFicheApercuEdit(f => ({ ...f, objectif_general: e.target.value }))} style={champEditStyle} />
                    </div>
                  </div>
                </div>
                <div className="procedes-grid">
                  {ficheApercuEdit.procedes.map((p, i) => (
                    <div className="procede-block" key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h3 style={{ margin: 0 }}>Procédé {p.numero}</h3>
                        {ficheApercuEdit.procedes.length > 1 && (
                          <button type="button" onClick={() => retirerProcedeApercu(i)} style={{ background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer', fontSize: '13px' }}>✕</button>
                        )}
                      </div>
                      <div className="procede-grid">
                        <div className="procede-field" style={{ gridColumn: '1 / -1' }}>
                          <label>Titre</label>
                          <input value={p.titre} onChange={e => updateProcedeApercu(i, 'titre', e.target.value)} style={champEditStyle} />
                        </div>
                        <div className="procede-field">
                          <label>Durée</label>
                          <input value={p.duree} onChange={e => updateProcedeApercu(i, 'duree', e.target.value)} style={champEditStyle} />
                        </div>
                        <div className="procede-field">
                          <label>Nombre de joueurs</label>
                          <input value={p.nb_joueurs} onChange={e => updateProcedeApercu(i, 'nb_joueurs', e.target.value)} style={champEditStyle} />
                        </div>
                        <div className="procede-field" style={{ gridColumn: '1 / -1' }}>
                          <label>But</label>
                          <textarea value={p.but} onChange={e => updateProcedeApercu(i, 'but', e.target.value)} rows={2} style={champEditTextareaStyle} />
                        </div>
                        <div className="procede-field" style={{ gridColumn: '1 / -1' }}>
                          <label>Organisation</label>
                          <textarea value={p.organisation} onChange={e => updateProcedeApercu(i, 'organisation', e.target.value)} rows={2} style={champEditTextareaStyle} />
                        </div>
                        <div className="procede-field" style={{ gridColumn: '1 / -1' }}>
                          <label>Consignes</label>
                          <textarea value={p.consignes} onChange={e => updateProcedeApercu(i, 'consignes', e.target.value)} rows={3} style={champEditTextareaStyle} />
                        </div>
                        <div className="procede-field" style={{ gridColumn: '1 / -1' }}>
                          <label>Variables / progressions</label>
                          <textarea value={p.variables} onChange={e => updateProcedeApercu(i, 'variables', e.target.value)} rows={2} style={champEditTextareaStyle} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={ajouterProcedeApercu}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px dashed #4ade8080', background: 'transparent', color: '#16a34a', fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginTop: '4px' }}>
                  + {t('seance_ajouter_procede', lang)}
                </button>
              </>
            ) : (
              <FicheContenu
                fiche={ficheApercu.fiche_seance || {}}
                categorieLabel={CATEGORIES_TACTIQUES.find(c => c.value === ficheApercu.categorie_tactique)?.label}
              />
            )}
          </div>
        </div>
      </div>
      )
    })()}

    {tactipadModal !== null && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 3000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px' }}>
        <div style={{ background: colors.background.base, border: `1px solid ${colors.border.subtle}`, borderRadius: '20px', width: '100%', maxWidth: '95vw', padding: '24px', margin: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: '16px' }}>🎨 {t('schema_procede', lang)} {fiche.procedes[tactipadModal]?.numero}</p>
            <button onClick={() => setTactipadModal(null)} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '20px', cursor: 'pointer' }}>✕</button>
          </div>
          <Tactipad
            userId={userId}
            mode="modal"
            vueParDefaut="demi"
            onValider={png => { updateProcede(tactipadModal, 'schema_png', png); setTactipadModal(null) }}
            onFermer={() => setTactipadModal(null)}
            lang={lang}
          />
        </div>
      </div>
    )}

    </>
  )
}

import { demanderSignatureUpload, demanderSignatureImage, ajouterChampsSignes } from '../lib/signatureUpload'
import { useState, useEffect, useLayoutEffect, useRef, Fragment, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { supabase, signOutSafe, avecRetrySession } from '../supabase'
import Avatar from '../components/Avatar'
import FicheBMFContenu from '../components/fiches/FicheBMFContenu'
import { TutorielEquipe, TutorielPlanning, TutorielSeance, TutorielCompetition, TutorielResultats } from '../components/tutoriels/TutorielsEducateur'
import { tutorielDejaVu, marquerTutorielVu, useTutorielsVus } from '../lib/tutoriels'
import BoutonTutoriel from '../components/tutoriels/BoutonTutoriel'
import { ZONES_RPE, DEFINITION_RPE, zoneRpe, rpeDeReponse } from '../lib/rpe'
import Tactipad from '../components/Tactipad'
import SponsorsBar from '../components/SponsorsBar'
import { CATEGORIES, CATEGORIES_MASCULIN, CATEGORIES_FEMININ, labelCategorie } from '../lib/categories'
import { saisonActuelle, bornesSaison } from '../lib/saison'
import { JOURS_SEMAINE } from '../lib/jours'
import { chargerMesRoles } from '../lib/multiRole'
import { THEMES_SEANCE, TOUS_THEMES_SEANCE, themeSeanceInfo } from '../lib/themesSeance'
import { PRINCIPES_OFFENSIFS, PRINCIPES_DEFENSIFS } from '../constants/principesJeu'
// Sections/modales chargées à la demande (lazy) plutôt qu'au chargement initial du
// dashboard : elles pesaient ~10 000 lignes à elles seules dans le chunk
// DashboardEducateur (1,06 Mo, le plus gros de l'app) alors que la plupart ne sont
// jamais ouvertes dans une session donnée (une seule section/modale à la fois).
const AnalyseVideo = lazy(() => import('../components/AnalyseVideo'))
const StagesModule = lazy(() => import('../components/stages/StagesModule'))
const RapportMatch = lazy(() => import('../components/RapportMatch'))
const GestionPrepPhysique = lazy(() => import('../components/prepphysique/GestionPrepPhysique'))
const SanteEquipe = lazy(() => import('../components/SanteEquipe'))
const GestionCloturesSaison = lazy(() => import('../components/prepphysique/GestionCloturesSaison'))
const Deplacements = lazy(() => import('../components/Deplacements'))
const PlanningTerrains = lazy(() => import('../components/PlanningTerrains'))
const CauserieAvantMatch = lazy(() => import('../components/CauserieAvantMatch'))
const BibliothequeVideos = lazy(() => import('../components/BibliothequeVideos'))
const ScannerProc = lazy(() => import('../components/ScannerProc'))
const MoteurRecrutement = lazy(() => import('./MoteurRecrutement'))
import { calculerMoyennes } from '../lib/statsRecrutement'
const SondageSemaine = lazy(() => import('../components/SondageSemaine'))
const StatsEquipe = lazy(() => import('../components/StatsEquipe'))
const NotationMatch = lazy(() => import('../components/NotationMatch'))
import TerrainsLiberesWidget from '../components/TerrainsLiberesWidget'
import DeplacementsAssignesWidget from '../components/DeplacementsAssignesWidget'
import AnnoncesClubWidget from '../components/AnnoncesClubWidget'
import DerniereCauserieWidget from '../components/DerniereCauserieWidget'
// Composant réduit lui-même (64 lignes) mais importe PlanificationAnnuelle
// (1200+ lignes, réutilisée du dashboard club) — sans lazy() ici, tout ce
// poids restait embarqué dans le chunk principal malgré la taille modeste
// du wrapper.
const ProjetSportifEducateur = lazy(() => import('../components/ProjetSportifEducateur'))
const ProjetClubCFF4 = lazy(() => import('../components/ProjetClubCFF4'))
const FicheEvaluationJoueur = lazy(() => import('../components/FicheEvaluationJoueur'))
import PlanningSemaineWidget from '../components/PlanningSemaineWidget'
import AlertesPanel from '../components/AlertesPanel'
import { estimerDeplacement } from '../lib/mapbox'
import { effectifParDefautMatch } from '../lib/repartitionBus'
const OnboardingGuide = lazy(() => import('../components/OnboardingGuide'))
const FloatingHelper = lazy(() => import('../components/FloatingHelper'))
import ParrainageWidget from '../components/ParrainageWidget'
import { t, LANGS, localeOf } from '../lib/translations'
import { enqueueIARequest, libelleStatutGroq } from '../lib/groqQueue'
import { schemaExerciceIA } from '../lib/schemasSeanceIA'
import { remplacerSchemaParLien, miniatureSchema } from '../lib/schemaUpload'
import LigneResultat from '../components/LigneResultat'
import CarteMatchAVenir from '../components/CarteMatchAVenir'
import { sondageEstClos, sondageHeureCloture } from '../lib/sondage'
import { useLang } from '../hooks/useLang'
import { useIsMobileOrTablet } from '../hooks/useIsMobileOrTablet'
import { STRIPE_LINKS_EDU, stripeUrl } from '../lib/stripeLinks'
import { normaliserCle } from '../lib/excelImport'
import { notifierJoueur } from '../lib/notifications'
import { statutPresenceEffectif, seanceComptable } from '../lib/presence'
import { fetchToutesLignes, fetchToutesLignesIn } from '../lib/supabasePagination'
import { colors, alpha } from '../tokens'
import { useColors } from '../lib/theme'
import { ThemeToggleButton } from '../lib/ThemeProvider'

// Fallback des sections/modales lazy ci-dessus — un spinner inline (pas plein
// écran comme Loader.jsx/ChargementPage, qui masquerait le reste du dashboard
// déjà affiché derrière) pendant le téléchargement du chunk à la demande.
const SectionLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 20px' }}>
    <div style={{ width: '32px', height: '32px', border: '3px solid #1a1a1a', borderTopColor: '#4ade80', borderRadius: '50%', animation: 'dfeduSpin 0.7s linear infinite' }} />
    <style>{'@keyframes dfeduSpin { to { transform: rotate(360deg) } }'}</style>
  </div>
)

// "Générer une séance avec l'IA" pas encore assez fiable pour être proposée à
// tous les éducateurs — visible seulement pour ce compte le temps de l'affiner
// en conditions réelles, à retirer de cette liste (ou vider) une fois prête.
const SEANCE_IA_BETA_EMAILS = ['clubtest@gmail.com']

// Onglet "Recrutement" masqué le temps de le préparer pour tout le monde sauf
// le compte test (AS CANNES) — pas supprimé, juste retiré de la nav ailleurs.
const recrutementActif = (email) => email === 'asclubtest@gmail.com'

// Parcours d'onboarding du dashboard éducateur (guide "Cedinho") — chaque étape
// cible l'id d'un bouton de nav (toujours monté, contrairement au contenu de
// l'onglet actif). Voir OnboardingGuide.jsx pour le composant générique.
const getEducateurOnboardingSteps = (email) => [
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
    message: "Ta première action : enregistre ton effectif à l'aide de l'email de tes joueurs.",
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
    message: "Dans Création entraînement, rédige tes fiches de séance, scanne-les si tu les as sur papier, et archive-les pour les réutiliser.",
    targetId: "nav-entrainements",
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
    message: "Dans Rapports & Évaluations, envoie et suis les analyses vidéo demandées pour tes joueurs.",
    targetId: "nav-suivi",
    position: "bottom",
  },
  {
    id: 8,
    title: "Évaluations",
    message: "Toujours dans Rapports & Évaluations, note chacun de tes joueurs sur des critères clés, saison après saison.",
    targetId: "nav-suivi",
    position: "bottom",
  },
  ...(recrutementActif(email) ? [{
    id: 9,
    title: "Recrutement",
    message: "Explore les profils de joueurs disponibles et repère de nouveaux talents pour ton équipe.",
    targetId: "nav-recrutement",
    position: "bottom",
  }] : []),
  {
    id: 10,
    title: "Déplacements",
    message: "Dans Organisation, organise les trajets pour les matchs à l'extérieur et répartis les joueurs dans les mini-bus.",
    targetId: "nav-organisation",
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
    title: "Ajoute tes dirigeants",
    message: "Dans Explorer → Dirigeants, invite tes dirigeants par email et choisis ce qu'ils peuvent voir et modifier.",
    targetId: "nav-explorer",
    position: "bottom",
  },
  {
    id: 13,
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

// Filtre "Résultats" par type de compétition — matchs_equipe.competition est
// déjà un champ à 3 valeurs fixes dans le formulaire de création de match
// (modalMatchForm : "Championnat" / "Coupe" / "Amical"), comparé ici en
// minuscule pour rester robuste aux quelques formulaires qui laissent encore
// ce champ en saisie libre (newMatch, scannerMatchData).
const FILTRES_COMPETITION = [
  { id: 'toutes', label: 'Toutes' },
  { id: 'championnat', label: 'Championnat' },
  { id: 'coupe', label: 'Coupe' },
  { id: 'amical', label: 'Amical' },
]
const matchCorrespondFiltreComp = (m, filtre) => filtre === 'toutes' || (m.competition || '').trim().toLowerCase() === filtre

// ── Icônes SVG menu ────────────────────────────────────────────────────────
const IcoUsers     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
const IcoMicro     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0014 0"/><line x1="12" y1="17" x2="12" y2="22"/></svg>
const IcoBallon    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 7l4 3-1.5 4.5h-5L8 10z"/><path d="M12 7V2.5M16 10l4-1.5M14.5 14.5l2.5 4M9.5 14.5L7 18.5M8 10L4 8.5"/></svg>
const IcoTrophy    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0018 9h-1.26A8 8 0 103 16.29"/></svg>
const IcoRun       = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="4" r="2"/><path d="M15.5 8.5L14 13l3 3-2 5"/><path d="M8.5 8.5L10 13l-3 3 2 5"/><path d="M10 13h4"/></svg>
const IcoDumbbell  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4v16M18 4v16M3 8h3M18 8h3M3 16h3M18 16h3M6 12h12"/></svg>
const IcoLayout    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
const IcoVideo     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
const IcoClipboard = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12l2 2 4-4"/></svg>
const IcoSearch    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
const IcoBuilding  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 22V12h6v10"/><path d="M9 7h1M14 7h1M9 11h1M14 11h1"/></svg>
const IcoCompass   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
const IcoSend      = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
const IcoBook      = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
const IcoBox       = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>
const IcoMegaphone = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l18-5v12L3 13z"/><path d="M11.6 16.8a3 3 0 01-5.8-1.6"/></svg>

// ── Icônes page Accueil éducateur (même style que la sidebar, sans emoji) ────
const IcoHome        = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/></svg>
// Ajoutée pour remplacer l'emoji 📅 du titre "Planning de la semaine" par une
// icône cohérente avec le reste des en-têtes de section (refonte visuelle
// Accueil éducateur, 2026-10-12) — même style trait/stroke que les icônes
// ci-dessus, aucune nouvelle dépendance.
const IcoCalendar    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
const IcoUser        = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
const IcoFileText    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
// Versions 20px des deux icônes ci-dessus — cartes Planning / Séances (SousOngletsBar).
const IcoCalendarLg  = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
const IcoFileTextLg  = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
const IcoPlus        = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IcoPin         = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
const IcoCrayon      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>
const IcoCorbeille   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
const IcoEtoileTrait = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>
const IcoChevronBas  = ({ ouvert }) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: ouvert ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
const IcoLink        = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.07 0l3-3a5 5 0 00-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07l1.5-1.5"/></svg>
const IcoCadenas     = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>
const IcoCheckCircle = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
const IcoCible       = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>
const IcoCoupe       = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0z"/><path d="M17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3"/></svg>
const IcoHorloge     = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>
const IcoPresence    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
const IcoStar        = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
const IcoLogOut      = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
const IcoChevronLeft  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
const IcoChevronRight = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
const IcoX            = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>

// ── Icônes SVG bibliothèque (tailles/couleurs paramétrables) ────────────────
const IcoCle = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/></svg>
const IcoMail = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22 6 12 13 2 6"/></svg>
const IcoImport = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
const IcoDownload = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
const IcoBulle = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.4 8.4 0 01-9 8.4 8.5 8.5 0 01-3.8-.9L3 21l1.9-5.2A8.4 8.4 0 1121 11.5z"/></svg>
const IcoProfil = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
const IcoCamera = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
const IcoOeil = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
const IcoChrono = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8"/><polyline points="12 9 12 13 14 15"/><line x1="10" y1="2" x2="14" y2="2"/></svg>
const IcoGroupe = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/></svg>
// Terrain stylisé pour les procédés sans schéma (au lieu d'un bloc vide).
const TerrainMiniature = ({ couleur }) => (
  <svg viewBox="0 0 200 110" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block' }}>
    <rect width="200" height="110" fill="#14301c" />
    <g fill="none" stroke={couleur} strokeOpacity="0.35" strokeWidth="1.2">
      <rect x="8" y="8" width="184" height="94" rx="2" />
      <line x1="100" y1="8" x2="100" y2="102" />
      <circle cx="100" cy="55" r="15" />
      <rect x="8" y="33" width="24" height="44" />
      <rect x="168" y="33" width="24" height="44" />
    </g>
  </svg>
)
const IcoBiblioTitre = ({ size = 22, color = colors.accent.green }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    <line x1="12" y1="6" x2="16" y2="6"/>
    <line x1="12" y1="10" x2="16" y2="10"/>
    <line x1="12" y1="14" x2="14" y2="14"/>
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

// ── Annonces réseau (onglet Annonces d'Explorer) ─────────────────────────────
const REGIONS_FRANCE = [
  'Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Bretagne', 'Centre-Val de Loire',
  'Corse', 'Grand Est', 'Hauts-de-France', 'Île-de-France', 'Normandie',
  'Nouvelle-Aquitaine', 'Occitanie', 'Pays de la Loire', "Provence-Alpes-Côte d'Azur",
  'Guadeloupe', 'Martinique', 'Guyane', 'La Réunion', 'Mayotte',
]
const TYPES_ANNONCE = [
  { key: 'recherche_educateur', label: '🔍 Recherche éducateur', color: '#4ade80' },
  { key: 'recherche_club', label: '🏟️ Recherche club', color: '#60a5fa' },
  { key: 'tournoi', label: '🏆 Tournoi', color: '#f59e0b' },
  { key: 'detection', label: '⚡ Détection', color: '#a78bfa' },
  { key: 'autre', label: '📢 Autre', color: '#6b7280' },
]

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

// ── Camembert multi-segment (présence / absence / blessure / maladie / convoc) ─
// person (optionnel) : la photo du joueur (ou ses initiales) prend le centre
// de l'anneau et le taux passe dans une pastille à cheval sur le bas.
function DonutMulti({ presents, absents, blesses, malade, convoque, size = 72, person = null }) {
  const colors = useColors()
  const total = (presents || 0) + (absents || 0) + (blesses || 0) + (malade || 0) + (convoque || 0)
  const taux = total ? Math.round(((presents || 0) + (convoque || 0)) / total * 100) : 0
  const color = taux >= 80 ? colors.accent.green : taux >= 50 ? '#f59e0b' : '#f87171'
  if (!total && person) return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, opacity: 0.6 }}>
      <Avatar person={person} size={size} bg={colors.background.raised} border={`${size * 0.09}px solid ${colors.background.raised}`} textColor={colors.text.secondary} />
    </div>
  )
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
      {person ? (
        <>
          <div style={{ position: 'absolute', inset: `${size * 0.09}px`, borderRadius: '50%', background: colors.background.base, padding: '2px', boxSizing: 'border-box' }}>
            <Avatar person={person} size={size * 0.82 - 4} bg={colors.background.raised} border="none" textColor={colors.text.secondary} />
          </div>
          <span style={{ position: 'absolute', left: '50%', bottom: -6, transform: 'translateX(-50%)', padding: '1px 6px', borderRadius: '8px', background: colors.background.base, border: `1px solid ${color}`, fontSize: '10px', fontWeight: 800, color, lineHeight: 1.3, fontFamily: 'Inter,sans-serif', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{taux}%</span>
        </>
      ) : (
        <div style={{ position: 'absolute', inset: `${size * 0.18}px`, borderRadius: '50%', background: colors.background.base, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <span style={{ fontSize: size * 0.19, fontWeight: 800, color, lineHeight: 1, fontFamily: 'Inter,sans-serif' }}>{taux}%</span>
        </div>
      )}
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
  <svg viewBox="0 0 300 200" width="100%" style={{ maxHeight: '220px', border: `1px solid ${colors.border.strong}`, display: 'block', margin: '6px 0' }}>
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
  <svg viewBox="0 0 300 200" width="100%" style={{ maxHeight: '240px', border: `1px solid ${colors.border.strong}`, display: 'block', margin: '6px 0' }}>
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
  <svg viewBox="0 0 300 180" width="100%" style={{ maxHeight: '240px', border: `1px solid ${colors.border.strong}`, display: 'block', margin: '6px 0' }}>
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
  <svg viewBox="0 0 300 180" width="100%" style={{ maxHeight: '220px', border: `1px solid ${colors.border.strong}`, display: 'block', margin: '6px 0' }}>
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
  // Pagination par page réelle du PDF, même principe que FicheBEFContenu : 2
  // procédés par page (la grille .procedes-grid a 2 colonnes, donc 1 ligne de
  // grille = 1 page) — l'en-tête ne se répète pas d'une page à l'autre ici
  // (pas d'exigence de gabarit fédéral sur ce rendu générique, contrairement à
  // BEF), il n'apparaît que sur la première. Chaque .fiche-page est capturée
  // séparément par genererPdfDepuisElement pour ne jamais couper un procédé
  // entre recto et verso (auparavant : une seule capture géante, découpée
  // mécaniquement par hauteur de page sans égard aux blocs procédé).
  const procedes = fiche.procedes || []
  const pages = []
  for (let i = 0; i < procedes.length; i += 2) pages.push(procedes.slice(i, i + 2))
  if (pages.length === 0) pages.push([])

  return (
    <>
      {pages.map((procedesPage, pageIndex) => (
        <div className="fiche-page" key={pageIndex}>
          {pageIndex === 0 && (
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
            </>
          )}
          <div className="procedes-grid">
            {procedesPage.map((p) => {
              const consignesLignes = (p.consignes || '').split('\n')
              return (
              <div className="procede-block" key={p.numero}>
                <h3>Procédé {p.numero} — {p.titre || 'Sans titre'}</h3>
                <div className="procede-grid">
                  <div className="procede-field"><label>Durée</label><div className="valeur">{p.duree}</div></div>
                  <div className="procede-field"><label>Nombre de joueurs</label><div className="valeur">{p.nb_joueurs}</div></div>
                  <div className="procede-field" style={{ gridColumn: '1 / -1' }}><label>But</label><div className="valeur">{p.but}</div></div>
                  <div className="procede-field" style={{ gridColumn: '1 / -1' }}><label>Organisation</label><div className="valeur">{p.organisation}</div></div>
                  <div className="procede-field" style={{ gridColumn: '1 / -1' }}>
                    {p.schema_png ? <img src={p.schema_png} alt="Schéma tactique" style={{ width: '100%', maxHeight: '260px', objectFit: 'contain', border: `1px solid ${colors.border.strong}`, display: 'block', margin: '6px 0' }} /> : getTerrainComponent(p.numero, fiche.sport)}
                  </div>
                  <div className="procede-field" style={{ gridColumn: '1 / -1' }}>
                    <label>Consignes</label>
                    {[0, 1, 2, 3].map(idx => (
                      <div key={idx} style={{ borderBottom: '1px solid #999', minHeight: '18px', marginBottom: '6px' }}>
                        {consignesLignes[idx] || ''}
                      </div>
                    ))}
                  </div>
                  <div className="procede-field" style={{ gridColumn: '1 / -1' }}><label>Critères de réalisation</label><div className="valeur">{p.criteres_realisation}</div></div>
                  <div className="procede-field" style={{ gridColumn: '1 / -1' }}><label>Variables / progressions</label><div className="valeur">{p.variables}</div></div>
                </div>
              </div>
              )
            })}
          </div>
        </div>
      ))}
    </>
  )
}

// Reproduction du gabarit officiel BEF (fiche fédérale, cf. document fourni par
// l'utilisateur) — un bloc par procédé (colonnes Organisation/Terrain/
// Comportements attendus/Descriptif/Critères + bilan), au lieu du rendu
// générique de FicheContenu. N'est utilisé que si fiche.mode_diplome === 'BEF'
// (BMF/DEF/libre gardent le rendu générique, structure trop différente pour
// être forcée dans ce gabarit précis).
function FicheBEFContenu({ fiche, categorieLabel, nomEducateur }) {
  const SOUS_BLOCS_DESCRIPTIF = [
    ['BUT', 'but_bef'], ['CONSIGNES', 'consignes_bef'], ['SYSTÈMES DE JEU (et postes)', 'systemes_jeu'], ['VARIANTES', 'variantes_bef'],
  ]
  const MINI_ORGA = [
    ['Durée', 'duree'], ['Tps de travail', 'tps_travail'], ['Tps de récup', 'tps_recup'],
    ['Nbr de séries', 'nb_series'], ['Nbr de répét', 'nb_repet'], ['Rpe', 'rpe'],
  ]
  // Pagination réelle du gabarit officiel : 2 procédés par page (avec l'en-tête
  // répété sur chaque page, cf. document fédéral page 1/page 2 identiques) —
  // chaque .bef-page est capturée séparément par le pipeline PDF (cf.
  // genererPdfFiche/genererEtPartagerFicheApercu) pour ne jamais écraser/
  // rétrécir le contenu en forçant tout sur une seule page.
  const pages = []
  const procedes = fiche.procedes || []
  for (let i = 0; i < procedes.length; i += 2) pages.push(procedes.slice(i, i + 2))
  if (pages.length === 0) pages.push([])

  return (
    <div className="bef-doc">
      {pages.map((procedesPage, pageIndex) => (
        <div className="bef-page" key={pageIndex}>
          <div className="bef-header-row">
            <div className="bef-header-cell"><b>NOM Prénom :</b>{nomEducateur || '—'}</div>
            <div className="bef-header-cell"><b>Catégorie :</b>{categorieLabel || '—'}</div>
            <div className="bef-header-cell"><b>Effectif :</b>{fiche.nb_joueurs || '—'}</div>
            <div className="bef-header-cell"><b>Heure de début :</b>{fiche.heure_debut || '—'}</div>
            <div className="bef-header-cell"><b>Durée :</b>{fiche.duree_totale || '—'}</div>
            <div className="bef-header-cell"><b>Date :</b>{fiche.date || '—'}</div>
            <div className="bef-header-cell"><b>Séance N° :</b>{fiche.numero_seance || '—'}</div>
          </div>
          <div className="bef-header-row2">
            <div className="bef-header-cell"><b>Phase de jeu :</b>{fiche.phase_jeu || '—'}</div>
            <div className="bef-header-cell"><b>Principe de jeu :</b>{fiche.principe_jeu || '—'}</div>
            <div className="bef-header-cell"><b>Thème :</b>{fiche.theme || '—'}</div>
          </div>

          {procedesPage.map((p) => (
            <div className="bef-procede" key={p.numero}>
              <div className="bef-col">
                {MINI_ORGA.map(([label, key]) => (
                  <div className="bef-mini-row" key={key}>
                    <div className="bef-mini-label">{label} :</div>
                    <div className="bef-mini-value">{p[key]}</div>
                  </div>
                ))}
                <div className="bef-head-yellow">Procédé</div>
                <div className="bef-value-block" style={{ flex: 'none', minHeight: '16px' }}>{p.titre}</div>
                <div className="bef-head-yellow">Pédagogie</div>
                <div className="bef-value-block" style={{ flex: 'none', minHeight: '16px' }}>{p.pedagogie}</div>
                <div className="bef-head-plain">Surface</div>
                <div className="bef-surface-box">{p.surface}</div>
              </div>
              <div className="bef-col bef-pitch-box">
                {p.schema_png ? <img src={p.schema_png} alt="Schéma tactique" style={{ width: '100%', maxHeight: '280px', objectFit: 'contain' }} /> : getTerrainComponent(p.numero, fiche.sport)}
              </div>
              <div className="bef-col">
                <div className="bef-head-blue">Comportements attendus</div>
                <div className="bef-value-block">{p.comportements_attendus}</div>
              </div>
              <div className="bef-col">
                <div className="bef-head-blue">Descriptif (but, consignes de départ, déroulé du procédé)</div>
                <div className="bef-value-block">
                  {SOUS_BLOCS_DESCRIPTIF.map(([label, key]) => p[key] && (
                    <div key={key} style={{ marginBottom: '4px' }}><span className="bef-sub-label">{label} : </span>{p[key]}</div>
                  ))}
                </div>
              </div>
              <div className="bef-col">
                <div className="bef-head-blue">Critères de réalisation</div>
                <div className="bef-value-block" style={{ flex: 'none', minHeight: '40px' }}>{p.criteres_realisation}</div>
                <div className="bef-head-purple">Critères de réussite (2 max)</div>
                <div className="bef-value-block" style={{ flex: 'none', minHeight: '40px' }}>{p.criteres_reussite}</div>
                <div className="bef-head-purple">Dominantes-Impacts Athlétiques</div>
                <div className="bef-value-block">{p.dominantes_impacts}</div>
              </div>
              <div className="bef-bilan-row">
                <div className="bef-bilan-label">BILAN</div>
                <div className="bef-bilan-col"><b>Sur ma posture, le niveau d'engagement (adhésion) des joueurs, "l'efficacité" de la séance :</b><span>{p.bilan_posture}</span></div>
                <div className="bef-bilan-col"><b>Remédiations, modifications à apporter sur l'aménagement et/ou les consignes :</b><span>{p.bilan_remediations}</span></div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// Orientation du PDF selon le gabarit : paysage pour les gabarits fédéraux
// larges (BEF, BMF), portrait pour le rendu générique (Libre, DEF).
const orientationFiche = (mode) => (mode === 'BEF' || mode === 'BMF' ? 'landscape' : 'portrait')

function FicheSeancePrint({ fiche, categorieLabel, nomEducateur, logoClub }) {
  return createPortal(
    <div id="fiche-print">
      {fiche.mode_diplome === 'BEF'
        ? <FicheBEFContenu fiche={fiche} categorieLabel={categorieLabel} nomEducateur={nomEducateur} />
        : fiche.mode_diplome === 'BMF'
          ? <FicheBMFContenu fiche={fiche} categorieLabel={categorieLabel} logo={logoClub} />
          : <FicheContenu fiche={fiche} categorieLabel={categorieLabel} />}
    </div>,
    document.body
  )
}

// Réduit à l'échelle un aperçu de fiche (.fiche-render, largeur fixe —
// 980px générique, 1500px gabarit BEF, cf. index.css) pour qu'il tienne
// dans l'écran plutôt que de déborder hors cadre sur tablette/téléphone.
// transform:scale uniquement pour L'AFFICHAGE : le contenu garde sa vraie
// largeur (mesurée via scrollWidth, jamais déformée), donc aucun impact sur
// le texte/la mise en page — juste la taille visuelle qui s'adapte. Le
// wrapper expose la classe "fiche-apercu-scale-wrap" : regenererPdfApercu
// (seule fonction qui capture .fiche-render en PDF, cf. plus bas) neutralise
// ce transform juste avant de capturer, pour ne jamais fausser l'export déjà
// en place (indépendant de ce changement, ne doit jamais changer de
// comportement).
function ApercuFicheResponsive({ children }) {
  const wrapRef = useRef(null)
  const contentRef = useRef(null)
  const [scale, setScale] = useState(1)
  const [hauteurMiseEchelle, setHauteurMiseEchelle] = useState(null)

  useLayoutEffect(() => {
    const wrap = wrapRef.current
    const content = contentRef.current
    if (!wrap || !content) return
    // Observe les deux : le conteneur (rotation d'écran, redimensionnement
    // fenêtre) ET le contenu lui-même (ex: une textarea qui grandit en mode
    // édition) — un seul recalcul idempotent couvre les deux cas.
    const recalculer = () => {
      const largeurDispo = wrap.clientWidth
      const largeurNaturelle = content.scrollWidth
      const hauteurNaturelle = content.scrollHeight
      const s = largeurNaturelle > largeurDispo && largeurDispo > 0 ? largeurDispo / largeurNaturelle : 1
      setScale(s)
      setHauteurMiseEchelle(hauteurNaturelle * s)
    }
    recalculer()
    const ro = new ResizeObserver(recalculer)
    ro.observe(wrap)
    ro.observe(content)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={wrapRef} style={{ width: '100%', overflow: 'hidden', height: hauteurMiseEchelle ?? undefined }}>
      <div ref={contentRef} className="fiche-apercu-scale-wrap" style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 'max-content' }}>
        {children}
      </div>
    </div>
  )
}

// Barre de sous-onglets pour les entrées de nav fusionnées (subKeys) — affichée
// une seule fois, positionnée juste avant le premier bloc de contenu du groupe
// dans l'ordre du JSX (les autres blocs, plus loin, ne rendent rien tant que
// activeSection ne correspond pas à leur propre clé).
// Variante « cartes » quand les items portent une description (ex. Planning /
// Séances de Création entraînement) : deux sections distinctes qu'on doit
// identifier au premier coup d'œil, pas juste deux libellés dans une pastille.
function SousOngletsBar({ items, activeSection, setActiveSection }) {
  const colors = useColors()
  if (items.some(it => it.description)) {
    return (
      <div role="tablist" style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, gap: 10, marginBottom: 24 }}>
        {items.map(it => {
          const actif = activeSection === it.key
          return (
            <button key={it.key} role="tab" aria-selected={actif} onClick={() => setActiveSection(it.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
                fontFamily: 'Inter, sans-serif', minWidth: 0, transition: 'all 0.15s',
                background: actif ? colors.accent.blue + '1a' : colors.background.surface,
                border: `${actif ? 2 : 1}px solid ${actif ? colors.accent.blue : colors.border.faint}`,
                boxShadow: actif ? `0 0 0 3px ${colors.accent.blue}1f` : 'none',
                margin: actif ? 0 : 1,
              }}>
              <span style={{
                width: 40, height: 40, borderRadius: 11, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: actif ? colors.accent.blue : colors.background.raised, color: actif ? colors.black : colors.text.faint,
              }}>{it.icon}</span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 16, fontWeight: 800, color: actif ? colors.text.primary : colors.text.secondary }}>{it.label}</span>
                <span className="sous-onglet-desc" style={{ display: 'block', fontSize: 12, marginTop: 2, color: actif ? colors.text.secondary : colors.text.faint, lineHeight: 1.35 }}>{it.description}</span>
              </span>
            </button>
          )
        })}
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', gap: 0, background: colors.background.sunken, borderRadius: 12, padding: 4, maxWidth: '100%', width: 'fit-content', marginBottom: 24, border: `1px solid ${colors.border.faint}`, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      {items.map(it => {
        const actif = activeSection === it.key
        return (
          <button key={it.key} onClick={() => setActiveSection(it.key)}
            style={{
              padding: '9px 22px', borderRadius: 9, border: 'none', cursor: 'pointer',
              background: actif ? colors.text.primary : 'transparent',
              color: actif ? colors.background.base : colors.text.faint,
              fontWeight: actif ? 700 : 400, fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0,
              fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
            }}>
            {it.label}
          </button>
        )
      })}
    </div>
  )
}

// Bloc d'explication + tutoriel carrousel en tête de la rubrique "Pts Séance"
// (statsSubTab === 'mois') — les images des slides sont volontairement des
// icônes de substitution (pas encore de vraies captures d'écran) : ajouter
// `image: '/tuto/....png'` à un slide et l'afficher via <img> à la place de
// l'icône dès que les captures seront prêtes.
function ExplicationPtsSeance() {
  const colors = useColors()
  const [showTuto, setShowTuto] = useState(false)
  const [slide, setSlide] = useState(0)

  const slides = [
    { titre: 'Étape 1 — Ouvrir le Planning', texte: "Dans le menu, va dans Création entraînement → Planning.", icone: '📅' },
    { titre: 'Étape 2 — Aller sur Mes séances', texte: "Dans le sous-onglet \"Mes séances\", retrouve la séance concernée.", icone: '📋' },
    { titre: 'Étape 3 — Ouvrir la séance', texte: "Clique sur la carte de la séance pour ouvrir le détail des présences.", icone: '➡️' },
    { titre: 'Étape 4 — Attribuer le point séance', texte: "Clique sur l'étoile à côté du ou des joueurs qui ont gagné le point séance.", icone: '⭐' },
  ]

  return (
    <div>
      <div style={{
        background: `linear-gradient(135deg, ${colors.accent.green}15, ${colors.accent.green}05)`,
        border: `1px solid ${colors.accent.green}30`,
        borderRadius: '14px', padding: '20px',
      }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          <div style={{ fontSize: '32px', flexShrink: 0 }}>⭐</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: colors.accent.green, fontWeight: 800, fontSize: '15px', marginBottom: '8px' }}>
              Qu'est-ce que les Points Séance ?
            </div>
            <p style={{ color: colors.text.secondary, fontSize: '13px', lineHeight: '1.7', margin: '0 0 14px' }}>
              Challenge tes joueurs et offre-leur sur chaque séance un point séance sur un de tes procédés.
              Le joueur qui aura additionné le plus de points séance peut gagner une récompense ou un privilège.
              <strong style={{ color: colors.text.primary }}> À toi d'en faire de vrais compétiteurs.</strong>
            </p>
            <button
              onClick={() => { setShowTuto(true); setSlide(0) }}
              style={{
                background: 'none', border: `1px solid ${colors.accent.green}`, color: colors.accent.green,
                borderRadius: '8px', padding: '8px 16px', fontSize: '13px',
                fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}>
              Comment inscrire les points séances ?
            </button>
          </div>
        </div>
      </div>

      {showTuto && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, padding: '20px',
        }}>
          <div style={{
            background: colors.background.surface, borderRadius: '16px',
            width: '100%', maxWidth: '520px', border: `1px solid ${colors.border.default}`,
            overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${colors.border.subtle}` }}>
              <div style={{ color: colors.accent.green, fontSize: '12px', fontWeight: 700 }}>
                Comment inscrire les points séances
              </div>
              <button onClick={() => setShowTuto(false)} style={{ background: 'none', border: 'none', color: colors.text.faint, cursor: 'pointer', fontSize: '20px' }}>×</button>
            </div>

            <div style={{
              background: colors.background.base, height: '220px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ fontSize: '48px' }}>{slides[slide].icone}</div>

              {slide > 0 && (
                <button onClick={() => setSlide(slide - 1)} style={{
                  position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: colors.background.raised, border: `1px solid ${colors.border.default}`, borderRadius: '50%',
                  width: '36px', height: '36px', cursor: 'pointer', color: colors.text.primary, fontSize: '16px',
                }}>‹</button>
              )}
              {slide < slides.length - 1 && (
                <button onClick={() => setSlide(slide + 1)} style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: colors.background.raised, border: `1px solid ${colors.border.default}`, borderRadius: '50%',
                  width: '36px', height: '36px', cursor: 'pointer', color: colors.text.primary, fontSize: '16px',
                }}>›</button>
              )}
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{ color: colors.accent.green, fontSize: '12px', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Étape {slide + 1} / {slides.length}
              </div>
              <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>
                {slides[slide].titre}
              </div>
              <p style={{ color: colors.text.secondary, fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
                {slides[slide].texte}
              </p>
            </div>

            <div style={{ padding: '0 20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {slides.map((_, i) => (
                  <button key={i} onClick={() => setSlide(i)} style={{
                    width: i === slide ? '20px' : '8px', height: '8px',
                    borderRadius: '4px', border: 'none', cursor: 'pointer',
                    background: i === slide ? colors.accent.green : colors.border.default,
                    transition: 'width 0.2s', padding: 0,
                  }} />
                ))}
              </div>
              {slide === slides.length - 1 ? (
                <button onClick={() => setShowTuto(false)} style={{
                  background: colors.accent.green, color: colors.black, border: 'none',
                  borderRadius: '8px', padding: '8px 20px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}>
                  C'est parti !
                </button>
              ) : (
                <button onClick={() => setSlide(slide + 1)} style={{
                  background: colors.accent.green, color: colors.black, border: 'none',
                  borderRadius: '8px', padding: '8px 20px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}>
                  Suivant →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AccueilEducateur({ clubId, club, userId, equipeActiveId, equipeUnique, joueurs, entrainements, matchs, setActiveSection, setSousOngletEnt, setStatsSubTab, setCompetitionSubTab, lang, isMobile, mesSeancesOuvertes, dispoJoueurs, setFicheApercu, setFicheApercuEnHaut, setModalImportFicheEntrainement }) {
  const colors = useColors()
  const aujourdHui = new Date().toISOString().split('T')[0]

  // Initiale de secours si le club n'a pas encore d'avatar_url — même logique
  // que clubInitiales (DashboardClub.jsx), dupliquée localement pour ce seul usage.
  const clubInitiale = (club?.club || '?').trim()[0]?.toUpperCase() || '?'

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

  // Résumé compact des alertes (briefing) — alimenté par AlertesPanel
  // lui-même (onResume) : mêmes alertes que le panneau détaillé, après
  // masquage, sans requête ni priorité supplémentaires. null = pas encore
  // chargé (rien n'est affiché plutôt qu'un "0" provisoire).
  const [resumeAlertes, setResumeAlertes] = useState(null)
  const panneauAlertesRef = useRef(null)
  const ouvrirPanneauAlertes = () => {
    const el = panneauAlertesRef.current
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    el.focus({ preventScroll: true })
  }
  // Une formulation par catégorie, fidèle à ce que signale le panneau
  // (ex. cartons : joueurs à 2 jaunes ou plus), accordée au nombre.
  const PHRASES_ALERTES = {
    carton: n => `${n} joueur${n > 1 ? 's' : ''} à 2 cartons jaunes ou plus`,
    materiel: n => `${n} pack${n > 1 ? 's' : ''} prêt${n > 1 ? 's' : ''} à récupérer`,
    deplacement: n => `${n} déplacement${n > 1 ? 's' : ''} avec places insuffisantes`,
    evenement: n => `${n} événement${n > 1 ? 's' : ''} club à venir`,
    tache: n => `${n} tâche${n > 1 ? 's' : ''} confiée${n > 1 ? 's' : ''}`,
    responsabilite: n => `${n} responsabilité${n > 1 ? 's' : ''}`,
    rdv_medical: n => `${n} rdv médica${n > 1 ? 'ux' : 'l'} à venir`,
  }
  const phraseResumeAlertes = (parCategorie) => {
    const morceaux = Object.entries(parCategorie).filter(([cat]) => PHRASES_ALERTES[cat]).map(([cat, n]) => PHRASES_ALERTES[cat](n))
    if (morceaux.length <= 1) return morceaux[0] || ''
    return `${morceaux.slice(0, -1).join(', ')} et ${morceaux[morceaux.length - 1]}`
  }

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
  // Statut via la règle commune (lib/presence) — seule différence avec
  // l'ancien calcul local : une ligne au statut 'non_saisi' est traitée comme
  // une absence de saisie (repli sur le sondage) et non plus comme une séance
  // saisie non présente. Période et effectif inchangés (filtre ci-dessous).
  const getStatutJoueurSemaine = (e, j) => statutPresenceEffectif(
    (e.presences_entrainement || []).find(pr => pr.joueur_id === j.id),
    j.joueur_id ? dispoJoueurs[e.id]?.[j.joueur_id] : null,
  )
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

  // Bilan V/N/D — calcul déplacé ici (hors IIFE) pour être partagé par la
  // bande de score (V2 "centre de commandement", 2026-10-12) ; même calcul
  // exact qu'avant, juste sorti de la fonction anonyme qui l'encapsulait.
  const matchsJoues = matchs.filter(m => matchJoue(m))
  const victoires = matchsJoues.filter(m => Number(m.score_nous) > Number(m.score_eux)).length
  const nuls = matchsJoues.filter(m => Number(m.score_nous) === Number(m.score_eux)).length
  const defaites = matchsJoues.filter(m => Number(m.score_nous) < Number(m.score_eux)).length
  const totalMatchsJoues = matchsJoues.length
  const pctBilan = (n) => totalMatchsJoues ? Math.round(n / totalMatchsJoues * 100) : 0

  // ── V2 "Centre de commandement" (2026-10-12) — styles partagés ──────────
  // Eyebrow éditorial (petites capitales + filet) : remplace les en-têtes de
  // section avec icône répétée par un dispositif typographique, cohérent
  // avec la direction "feuille de match" plutôt que "carte SaaS".
  const eyebrowSt = { fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.text.faint, margin: '0 0 12px', paddingBottom: '8px', borderBottom: `1px solid ${colors.border.subtle}` }
  // Carte standard : angles modérés (8px, pas 14-16px), pas de halo ni de
  // dégradé — seule la position dans la page porte la hiérarchie désormais.
  const cardSt = { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '8px', padding: '1.25rem' }
  // Segment de la bande de score : pas de bordure individuelle, la grille
  // parente dessine les filets (1px de fond visible dans les interstices).
  const segLabelSt = { fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: colors.text.faint, margin: '0 0 6px' }
  const segValueSt = { fontSize: '24px', fontWeight: 800, margin: 0, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.3px' }

  // Zone "Club" (annonces / terrains / déplacements) — définie une seule
  // fois, affichée soit en colonne latérale (desktop), soit juste après le
  // briefing (mobile, point 5 : une info club urgente n'est jamais reléguée
  // en bas de page faute de colonne). Contenu et comportement strictement
  // inchangés par rapport à la V1.
  // V2.5 : section pleine largeur sous le planning (plus de colonne
  // latérale). Desktop : rangée adaptative — annonces et créneaux ne
  // prennent une place que s'ils ont du contenu (les deux widgets
  // renvoient null sinon), le déplacement occupe alors toute la ligne.
  // Mobile : empilé.
  const zoneClub = (
    <div style={isMobile
      ? { display: 'flex', flexDirection: 'column', gap: '12px' }
      : { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', alignItems: 'start' }}>
      {clubId && <AnnoncesClubWidget clubId={clubId} userId={userId} accentColor={colors.accent.blue} onVoirTout={() => setActiveSection('annonces')} />}
      {clubId && <TerrainsLiberesWidget clubId={clubId} userId={userId} accentColor={colors.accent.blue} titre="Créneau libéré cette semaine" />}
      <DeplacementsAssignesWidget userId={userId} equipeActiveId={equipeActiveId} equipeUnique={equipeUnique} accentColor={colors.accent.blue} onOuvrirFiche={ouvrirFicheDeplacement} horizontal={!isMobile} />
    </div>
  )

  return (
    <div>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '6px' }}>
        {club && (
          club.avatar_url
            ? <img src={club.avatar_url} alt={club.club || ''} style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: `1px solid ${colors.border.subtle}`, flexShrink: 0 }} />
            : <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: colors.accent.green + '20', color: colors.accent.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '16px', flexShrink: 0 }}>{clubInitiale}</div>
        )}
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '10px' }}><IcoHome /> Accueil</h1>
          <p style={{ color: colors.text.secondary, fontSize: '14px', margin: '4px 0 0' }}>{club?.club ? `${club.club} · ` : ''}Vue d'ensemble de ton équipe</p>
        </div>
      </div>

      <div style={{ height: '1px', background: colors.border.subtle, margin: '1.25rem 0 1.5rem' }} />

      {/* Bande de score — remplace les 4 cartes KPI (demande de validation du
          2026-10-12, point 1). Une seule ligne continue, filets fins entre
          segments (via le gap sur fond coloré, pas de bordure par bloc),
          chiffres en tabular-nums. Données et calculs strictement inchangés. */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : '0.8fr 1.3fr 0.8fr 1.4fr', gap: '1px', background: colors.border.subtle, border: `1px solid ${colors.border.subtle}`, borderRadius: '8px', overflow: 'hidden', marginBottom: '1.75rem' }}>
        <div style={{ background: colors.background.surface, padding: '14px 18px', minWidth: 0 }}>
          <p style={segLabelSt}>Effectif</p>
          <p style={segValueSt}>{totalJoueurs}</p>
        </div>

        <div style={{ background: colors.background.surface, padding: '14px 18px', minWidth: 0 }}>
          <p style={segLabelSt}>Bilan</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <DonutVND v={victoires} n={nuls} d={defaites} size={38} />
            {/* Pourcentages en blanc, couleur portée par un repère discret
                (mêmes teintes que le donut). Calculs inchangés (pctBilan). */}
            <div style={{ display: 'flex', gap: isMobile ? '10px' : '16px', flexWrap: 'wrap', minWidth: 0 }}>
              {[
                { label: 'Victoires', val: victoires, color: '#4ade80' },
                { label: 'Nuls', val: nuls, color: '#facc15' },
                { label: 'Défaites', val: defaites, color: '#ef4444' },
              ].map(s => (
                <div key={s.label} style={{ minWidth: 0 }}>
                  <p style={{ margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: colors.text.faint, whiteSpace: 'nowrap' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />{s.label}
                  </p>
                  <p style={{ ...segValueSt, fontSize: '16px', color: colors.text.primary }}>{pctBilan(s.val)}<span style={{ fontSize: '10px', opacity: 0.6 }}>%</span></p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: colors.background.surface, padding: '14px 18px', minWidth: 0 }}>
          <p style={segLabelSt}>Présence S.</p>
          <p style={{ ...segValueSt, color: colors.accent.blue }}>{tauxPresenceSemaine != null ? `${tauxPresenceSemaine}%` : '—'}</p>
        </div>

        <div style={{ background: colors.background.surface, padding: '14px 18px', minWidth: 0, gridColumn: isMobile ? 'span 2' : 'auto' }}>
          <p style={segLabelSt}>Prochain match</p>
          {prochainMatch ? (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
              <p style={{ ...segValueSt, fontSize: '16px' }}>{new Date(prochainMatch.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}{prochainMatch.heure ? ` · ${prochainMatch.heure}` : ''}</p>
              <span style={{ fontSize: '12px', color: colors.text.faint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prochainMatch.adversaire || '—'}</span>
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', color: prochainMatch.domicile ? colors.accent.green : colors.accent.orange }}>
                {prochainMatch.domicile ? 'DOM' : 'EXT'}
              </span>
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: colors.text.disabled, margin: 0 }}>Aucun match planifié</p>
          )}
        </div>
      </div>

      {/* Ligne médiane — signature graphique football (filet + rond central),
          utilisée une seule fois, purement graphique, sans couleur ni glow. */}
      <div style={{ display: 'flex', alignItems: 'center', margin: '0 0 1.75rem' }}>
        <div style={{ flex: 1, height: '1px', background: colors.border.subtle }} />
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', border: `1.5px solid ${colors.border.strong}`, margin: '0 10px', flexShrink: 0 }} />
        <div style={{ flex: 1, height: '1px', background: colors.border.subtle }} />
      </div>

      {/* Prochaine séance — bloc prioritaire (demande de validation du
          2026-10-12) : regroupe les informations qui étaient éclatées entre
          la carte "Dernier sondage" (Actions rapides) et la carte
          "Présences — Prochain entraînement" (Activité, toujours affichée
          plus bas, qui elle détaille les 5 statuts de réponse — malade/blessé/
          convoqué distincts — alors qu'ici on n'affiche que les 3 compteurs
          demandés : présents/absents/en attente, pour rester lisible en un
          coup d'œil). Les deux raccourcis réutilisent exactement les mêmes
          mécanismes que le reste de l'app (setFicheApercu/setFicheApercuEnHaut,
          déjà utilisés ailleurs ; même garde `if (s)` en cas de fiche_id
          orphelin — cf. bouton "Voir la fiche" de l'onglet Entraînements). */}
      <p style={eyebrowSt}>Prochaine séance</p>
      {/* V2.1 : composition en 3 zones sur desktop (identité de la séance |
          compteurs | raccourcis) au lieu d'un empilement vertical qui laissait
          la largeur vide ; empilée sur mobile. Données, calculs et actions
          strictement inchangés — seule la disposition change. */}
      <div style={{ ...cardSt, marginBottom: '1.75rem' }}>
        {!prochainEnt ? (
          <p style={{ color: colors.text.disabled, fontSize: '13px', margin: 0 }}>Aucune séance planifiée.</p>
        ) : (() => {
          const presents = compterStatutPresence('present') + compterStatutPresence('convoque')
          const absents = compterStatutPresence('absent') + compterStatutPresence('blesse') + compterStatutPresence('malade')
          const enAttente = Math.max(0, totalJoueurs - dispoProchainEnt.length)
          const clos = sondageEstClos(prochainEnt)
          const dateEntr = new Date(prochainEnt.date + 'T12:00:00')
          const estAujourdHui = prochainEnt.date === aujourdHui
          const demain = new Date(); demain.setDate(demain.getDate() + 1)
          const estDemain = prochainEnt.date === demain.toISOString().split('T')[0]
          const labelDate = estAujourdHui ? "Aujourd'hui" : estDemain ? 'Demain' : dateEntr.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })
          const btnSeanceSt = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'transparent', padding: '8px 16px', minHeight: '40px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', flex: isMobile ? '1 1 auto' : 'none' }
          return (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.4fr) auto auto', gap: isMobile ? '16px' : '0', alignItems: 'center' }}>
              {/* Zone 1 — identité de la séance : pavé date façon feuille de
                  match + thème, date/heure et statut du sondage. */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, paddingRight: isMobile ? 0 : '24px' }}>
                <div style={{ width: '54px', flexShrink: 0, textAlign: 'center', border: `1px solid ${colors.border.default}`, borderRadius: '6px', overflow: 'hidden' }}>
                  <p style={{ margin: 0, padding: '3px 0', fontSize: '9px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: colors.text.faint, background: colors.background.raised }}>{dateEntr.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}</p>
                  <p style={{ margin: 0, padding: '4px 0 0', fontSize: '22px', fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{dateEntr.getDate()}</p>
                  <p style={{ margin: 0, padding: '2px 0 5px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: colors.text.faint }}>{dateEntr.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</p>
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: isMobile ? 'normal' : 'nowrap' }}>{prochainEnt.description || mesSeancesOuvertes.find(s => s.id === prochainEnt.fiche_id)?.theme || 'Entraînement'}</p>
                  <p style={{ margin: '4px 0 8px', fontSize: '12px', color: colors.text.faint }}>{labelDate}{prochainEnt.heure ? ` · ${prochainEnt.heure}` : ''}</p>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', background: clos ? colors.background.raised : colors.accent.green + alpha.subtle, border: `1px solid ${clos ? colors.border.strong : colors.accent.green + alpha.medium}`, color: clos ? colors.text.faint : colors.accent.green, whiteSpace: 'nowrap' }}>
                    {clos
                      ? <><IcoCadenas /> Sondage clos</>
                      : <><span style={{ width: '7px', height: '7px', borderRadius: '50%', background: colors.accent.green, flexShrink: 0 }} /> Sondage ouvert</>}
                  </span>
                </div>
              </div>

              {/* Zone 2 — compteurs, séparés par des filets (desktop :
                  verticaux ; mobile : horizontaux). */}
              <div style={{ display: 'flex', gap: isMobile ? '0' : '28px', justifyContent: isMobile ? 'space-around' : 'flex-start', padding: isMobile ? '14px 0' : '4px 28px', borderLeft: isMobile ? 'none' : `1px solid ${colors.border.subtle}`, borderRight: isMobile ? 'none' : `1px solid ${colors.border.subtle}`, borderTop: isMobile ? `1px solid ${colors.border.subtle}` : 'none', borderBottom: isMobile ? `1px solid ${colors.border.subtle}` : 'none' }}>
                <div><p style={segLabelSt}>Présents</p><p style={{ ...segValueSt, fontSize: '20px', color: colors.accent.green }}>{presents}</p></div>
                <div><p style={segLabelSt}>Absents</p><p style={{ ...segValueSt, fontSize: '20px', color: colors.accent.red }}>{absents}</p></div>
                <div><p style={segLabelSt}>En attente</p><p style={{ ...segValueSt, fontSize: '20px', color: colors.text.dim }}>{enAttente}</p></div>
              </div>

              {/* Zone 3 — raccourcis (mêmes actions qu'avant). */}
              <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', flexWrap: 'wrap', gap: '8px', paddingLeft: isMobile ? 0 : '24px', alignItems: 'stretch' }}>
                <button onClick={() => { setActiveSection('entrainements'); setSousOngletEnt('prochaine') }}
                  style={{ ...btnSeanceSt, border: `1px solid ${colors.border.default}`, color: colors.accent.blue }}>
                  <IcoCheckCircle /> Voir les joueurs présents
                </button>
                {prochainEnt.fiche_id ? (
                  <button
                    onClick={() => { const s = mesSeancesOuvertes.find(x => x.id === prochainEnt.fiche_id); if (s) { setFicheApercu(s); setFicheApercuEnHaut(true) } }}
                    style={{ ...btnSeanceSt, border: '1px solid #4ade8040', color: colors.accent.green }}>
                    <IcoFileText /> Voir la fiche séance
                  </button>
                ) : (
                  <button
                    onClick={() => setModalImportFicheEntrainement(prochainEnt.id)}
                    style={{ ...btnSeanceSt, border: '1px solid #4ade8040', color: colors.accent.green }}>
                    <IcoLink /> Attacher une fiche
                  </button>
                )}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Composition asymétrique : briefing du coach (colonne large) + club
          (colonne secondaire, toujours visible sur desktop — jamais reléguée
          en bas de page, demande de validation du 2026-10-12, points 2 et 5).
          V2.2 : ~80 % / ~20 % (club plancher 240px) pour faire du planning
          l'élément central ; tablette et mobile (isMobile) : une colonne. */}
      {/* V2.5 : une seule colonne pleine largeur (desktop et mobile) à
          partir du briefing — planning, Club, classement, actions, alertes. */}
      <div>
        <div style={{ minWidth: 0 }}>
          <p style={eyebrowSt}>Briefing de la semaine</p>

          {/* V2.1 — résumé compact des alertes : uniquement les catégories
              présentes dans le panneau "Alertes & infos" (même décompte,
              sans niveau d'urgence ajouté) + accès au panneau détaillé, qui
              reste affiché plus bas dans Activité. */}
          {resumeAlertes && (
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', padding: '10px 12px', marginBottom: '1rem', border: `1px solid ${colors.border.subtle}`, borderRadius: '8px', background: colors.background.surface }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: resumeAlertes.total === 0 ? colors.text.faint : colors.text.secondary, lineHeight: 1.5, flex: '1 1 220px', minWidth: 0 }}>
                {resumeAlertes.total === 0 ? 'Aucune alerte pour le moment.' : `${phraseResumeAlertes(resumeAlertes.parCategorie)}.`}
              </span>
              {resumeAlertes.total > 0 && (
                <button onClick={ouvrirPanneauAlertes}
                  style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: colors.accent.blue, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', padding: '6px 2px', minHeight: '32px' }}>
                  Voir le détail →
                </button>
              )}
            </div>
          )}

          {/* Planning hebdomadaire — widget partagé avec Club/Joueur, non modifié
              (demande de validation : les 7 jours doivent rester lisibles,
              donc placé dans la colonne large, pas la colonne secondaire). */}
          <div style={{ ...cardSt, marginBottom: '1.25rem' }}>
            <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 12px', color: colors.accent.blue, display: 'flex', alignItems: 'center', gap: '6px' }}><IcoCalendar /> {t('planning_semaine_titre', lang)}</p>
            <PlanningSemaineWidget
              entrainements={entrainements}
              matchs={matchs}
              onClickEntrainement={() => setActiveSection('entrainements')}
              onClickMatch={() => setActiveSection('matchs')}
            />
          </div>

          {/* Club — juste sous le planning, sur tous les formats. */}
          <div style={{ marginBottom: '1.75rem' }}>
            <p style={eyebrowSt}>Club</p>
            {zoneClub}
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
              <div style={{ marginBottom: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
                  <p style={{ ...eyebrowSt, margin: 0, border: 'none', padding: 0, flex: 1 }}>Classement du mois</p>
                  <button onClick={() => { setActiveSection('stats'); setStatsSubTab('mois') }}
                    style={{ background: 'transparent', border: 'none', color: colors.accent.blue, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    Voir tout →
                  </button>
                </div>
                <div style={{ height: '1px', background: colors.border.subtle, marginBottom: '14px' }} />

                {podiumActuel.length === 0 ? (
                  <p style={{ color: colors.text.disabled, fontSize: '13px', margin: 0 }}>Aucun point de séance attribué ce mois-ci.</p>
                ) : (() => {
                  // V3 : podium (n°1 au centre, mis en avant), photo du profil
                  // joueur (Avatar : initiales à défaut). Mêmes données qu'avant.
                  const METAUX = ['#fbbf24', '#cbd5e1', '#d08b4b']
                  const Etoile = ({ taille = 14 }) => <svg width={taille} height={taille} viewBox="0 0 24 24" fill={colors.accent.amber} aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" /></svg>
                  const top = podiumActuel.slice(0, 3).map((item, idx) => ({ ...item, rang: idx + 1 }))
                  const ordre = top.length === 3 ? [top[1], top[0], top[2]] : top.length === 2 ? [top[1], top[0]] : top
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${ordre.length}, minmax(0, 1fr))`, background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '10px', overflow: 'hidden' }}>
                      {ordre.map((item, i) => {
                        const premier = item.rang === 1
                        const taille = premier ? (isMobile ? 58 : 76) : (isMobile ? 44 : 58)
                        const metal = METAUX[item.rang - 1]
                        return (
                          <div key={item.joueur.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', textAlign: 'center', padding: isMobile ? '14px 6px' : '20px 12px', borderLeft: i > 0 ? `1px solid ${colors.border.subtle}` : 'none', background: premier ? colors.background.raised : 'transparent', minWidth: 0 }}>
                            <div style={{ position: 'relative', marginBottom: '10px' }}>
                              <Avatar person={item.joueur} size={taille} bg={metal + '22'} border={`${premier ? 3 : 2}px solid ${metal}`} textColor={metal} />
                              <span style={{ position: 'absolute', top: premier ? '-6px' : '-4px', left: premier ? '-6px' : '-4px', width: premier ? '26px' : '22px', height: premier ? '26px' : '22px', borderRadius: '50%', background: metal, color: colors.black, fontSize: premier ? '13px' : '11px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${premier ? colors.background.raised : colors.background.surface}` }}>
                                {item.rang}
                              </span>
                            </div>
                            <p style={{ margin: 0, fontSize: isMobile ? '12px' : (premier ? '15px' : '13px'), fontWeight: 800, color: colors.text.primary, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', maxWidth: '100%' }}>
                              {item.joueur.prenom} {item.joueur.nom}
                            </p>
                            {item.joueur.poste && !isMobile && <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.faint }}>{item.joueur.poste}</p>}
                            <p style={{ margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: '5px', fontSize: isMobile ? '18px' : (premier ? '26px' : '20px'), fontWeight: 800, color: colors.text.primary, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                              {item.count} <Etoile taille={premier ? 18 : 14} />
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}

                {podiumPrecedent.length > 0 && (
                  <>
                    <p style={{ fontSize: '10px', color: colors.text.faint, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '14px 0 8px' }}>
                      {moisPrecedentDate.toLocaleDateString(localeOf(lang), { month: 'long' })} (rappel)
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', opacity: 0.8 }}>
                      <Avatar person={podiumPrecedent[0].joueur} size={26} bg="#fbbf2422" border="2px solid #fbbf24" textColor="#fbbf24" />
                      <span style={{ flex: 1, fontSize: '12px' }}>{podiumPrecedent[0].joueur.prenom} {podiumPrecedent[0].joueur.nom}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: colors.text.secondary }}>
                        {podiumPrecedent[0].count}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill={colors.accent.amber} aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" /></svg>
                      </span>
                    </div>
                  </>
                )}
              </div>
            )
          })()}

          {/* Actions rapides */}
          <p style={eyebrowSt}>Actions rapides</p>
          {/* V2.1 : raccourcis compacts horizontaux (icône + libellé sur une
              ligne, hauteur 44px min. pour le tactile) au lieu de grandes
              cartes verticales. Mêmes actions, mêmes conditions, mêmes
              destinations. Sur mobile : 2 par ligne, causerie en pleine largeur. */}
          {(() => {
            const raccourciSt = { display: 'inline-flex', alignItems: 'center', gap: '10px', minHeight: '44px', padding: '10px 14px', background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '8px', cursor: 'pointer', color: colors.text.primary, fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif', textAlign: 'left', minWidth: 0, boxSizing: 'border-box', flex: isMobile ? '1 1 calc(50% - 4px)' : '0 1 auto' }
            const survol = { onMouseEnter: e => { e.currentTarget.style.borderColor = colors.accent.blue + alpha.medium }, onMouseLeave: e => { e.currentTarget.style.borderColor = colors.border.subtle } }
            return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '1.75rem' }}>
            {/* L'ancien slot conditionnel "Dernier sondage" (identique au
                contenu du bloc "Prochaine séance" ci-dessus) a été retiré
                pour éviter la redondance — son info vit maintenant uniquement
                dans ce bloc dédié. "Ajouter un joueur" devient inconditionnel
                (c'était déjà une action du dashboard, juste affichée en
                remplacement avant) plutôt que de laisser un slot vide. */}
            {[
              { Icon: IcoPlus, label: 'Ajouter un joueur', section: 'equipe' },
              { Icon: IcoRun, label: 'Créer un entraînement', section: 'entrainements' },
              { Icon: IcoVideo, label: 'Analyse rapport', section: 'analyse_video' },
            ].map(a => (
              <button key={a.section} onClick={() => setActiveSection(a.section)} style={raccourciSt} {...survol}>
                <span style={{ display: 'inline-flex', color: colors.accent.blue, flexShrink: 0 }}><a.Icon /></span>
                <span style={isMobile ? { lineHeight: 1.25, minWidth: 0 } : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{a.label}</span>
              </button>
            ))}
            {prochainMatch && (
              <DerniereCauserieWidget userId={userId} prochainMatch={prochainMatch} accentColor={colors.accent.green}
                variante="raccourci" styleRaccourci={{ ...raccourciSt, flex: isMobile ? '1 1 100%' : '0 1 auto' }}
                onOuvrir={() => { setActiveSection('matchs'); setCompetitionSubTab('causerie') }} />
            )}
          </div>
            )
          })()}

          {/* Alertes & infos — seul contenu restant de l'ex-zone Activité
              (V2.3) : pas de carte isolée, l'eyebrow porte le titre et la
              liste se répartit en colonnes (AlertesPanel compact) pour
              rester basse. Cible du lien "Voir le détail" du briefing. */}
          <div ref={panneauAlertesRef} tabIndex={-1} style={{ scrollMarginTop: '16px', outline: 'none' }}>
            <p style={eyebrowSt}>Alertes &amp; infos</p>
            <AlertesPanel compact educateurId={userId} clubId={clubId} joueurs={joueurs} matchs={matchs} setActiveSection={setActiveSection} onResume={setResumeAlertes} />

          </div>
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
  const [mesRoles, setMesRoles] = useState(null) // autres rôles de ce compte (club/joueur/parent), cf. lib/multiRole
  const [activeSection, setActiveSection] = useState('accueil')
  const [loading, setLoading] = useState(true)
  // Tablette alignée sur le comportement téléphone (menu en tiroir), sur
  // demande explicite — auparavant un troisième mode dédié (sidebar réduite
  // aux icônes, 64px, repliable) existait entre 768 et 1024px pour préserver
  // la largeur du contenu (ex: le canvas Tactipad) ; isTablet reste déclaré
  // (utilisé par de nombreux styles plus bas) mais toujours à false, pour ne
  // pas devoir toucher chacun de ces usages individuellement.
  const isMobile = useIsMobileOrTablet()
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
  const [moisPointsSeanceSelectionne, setMoisPointsSeanceSelectionne] = useState(null) // clé 'YYYY-MM' choisie dans l'historique (onglet Mois) — null = mois en cours
  const [biblioVideoTab, setBiblioVideoTab] = useState('perso') // 'perso' | 'club' | 'df'
  const [statsTri, setStatsTri] = useState('buts') // pour classement
  const [ressentiOuverts, setRessentiOuverts] = useState({}) // Stats > Ressenti joueurs : séances dépliées (la plus récente l'est par défaut)
  const [graphDeplies, setGraphDeplies] = useState({}) // Stats > Graphiques : cartes dépliées (« Voir tous »)

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
  // Menu ··· des cartes joueur (vue "poste") — fermé au clic en dehors, même
  // pattern que le menu ⋮ des cartes match (openMenuId, section Compétition).
  const [openMenuJoueurId, setOpenMenuJoueurId] = useState(null)
  useEffect(() => {
    if (!openMenuJoueurId) return
    const fermerSiClicDehors = (e) => { if (!e.target.closest('.joueur-menu-wrapper')) setOpenMenuJoueurId(null) }
    document.addEventListener('click', fermerSiClicDehors)
    return () => document.removeEventListener('click', fermerSiClicDehors)
  }, [openMenuJoueurId])
  const [joueurEnEdition, setJoueurEnEdition] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  // Jours actifs (affiliations.jours_actifs) pour la fiche en cours d'édition
  // — un joueur affilié à 2 équipes peut n'être attendu que certains jours
  // sur celle-ci (le reste de la semaine avec son autre équipe). Distinct de
  // joueurEnEdition car ça vit sur affiliations, pas equipe_joueurs.
  const [joursActifsEdit, setJoursActifsEdit] = useState([])
  const [joueurProfil, setJoueurProfil] = useState(null)
  const [joueurMoisDetail, setJoueurMoisDetail] = useState(null)
  const [inviteEmails, setInviteEmails] = useState({})
  const [invitingId, setInvitingId] = useState(null)
  const [inviteStatus, setInviteStatus] = useState({}) // { joueurId: 'sent' | 'error' }

  // Compétition
  const [competitionSubTab, setCompetitionSubTab] = useState('resultats')
  const [afficherScanCalendrier, setAfficherScanCalendrier] = useState(false) // zone « Scanner un calendrier », ouverte à la demande
  const [filtreCompResultats, setFiltreCompResultats] = useState('toutes') // championnat/coupe/amical, cf. matchs_equipe.competition (déjà un champ à 3 valeurs, modalMatchForm)
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
  const [menuResultatOuvert, setMenuResultatOuvert] = useState(null) // id du résultat dont le menu "⋯" (modifier/supprimer) est ouvert
  const [rapportMatchOuvert, setRapportMatchOuvert] = useState(null) // match pour lequel la modale "Rapport de match" est ouverte, ou null
  // Logos des clubs inscrits sur la plateforme, pour illustrer l'adversaire
  // dans les résultats : retrouvé par son nom (normalisé), écusson aux
  // initiales sinon. Chargé une fois, à la première ouverture de Résultats.
  const [logosClubs, setLogosClubs] = useState(null)
  const normaliserNomClub = (n) => String(n || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
  const logoAdversaire = (nom) => {
    if (!logosClubs || !nom) return null
    const cle = normaliserNomClub(nom)
    if (logosClubs[cle]) return logosClubs[cle]
    // « La Fontonne U20 » → club « La Fontonne » : préfixe d'au moins 5 caractères
    const prefixe = Object.keys(logosClubs).filter(k => k.length >= 5 && cle.startsWith(k)).sort((a, b) => b.length - a.length)[0]
    return prefixe ? logosClubs[prefixe] : null
  }
  const [matchIdsAvecRapport, setMatchIdsAvecRapport] = useState(new Set()) // Set des match_id ayant déjà un rapport (rapports_analyse.mode_analyse = 'match')
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

  // Menu ⋮ des cartes "Matchs à venir" — un seul ouvert à la fois (id du match),
  // fermé au clic en dehors via délégation sur document (évite un ref par carte).
  const [openMenuId, setOpenMenuId] = useState(null)
  useEffect(() => {
    if (!openMenuId) return
    const fermerSiClicDehors = (e) => { if (!e.target.closest('.match-menu-wrapper')) setOpenMenuId(null) }
    document.addEventListener('click', fermerSiClicDehors)
    return () => document.removeEventListener('click', fermerSiClicDehors)
  }, [openMenuId])
  const [scoreJoueForm, setScoreJoueForm] = useState({ score_nous: '', score_eux: '' })
  const [savingMatchJoue, setSavingMatchJoue] = useState(false)
  const [scannerModalButsDetail, setScannerModalButsDetail] = useState([]) // [{ minute, equipe, nature }] — pour matchs_equipe.buts_detail
  const [scannerModalImageBase64, setScannerModalImageBase64] = useState(null)
  const [scannerModalImagePreview, setScannerModalImagePreview] = useState(null)
  const [scannerModalLoading, setScannerModalLoading] = useState(false)
  const [scannerModalStatus, setScannerModalStatus] = useState(null)
  const [scannerModalError, setScannerModalError] = useState(null)
  const [scannerModalWarning, setScannerModalWarning] = useState(null) // avertissement si peu/pas de joueurs matchés (cf. scannerWarning, même logique pour le scan depuis "Marquer comme joué")

  // Entraînements
  const [entrainements, setEntrainements] = useState([])
  const [showAddEntrainement, setShowAddEntrainement] = useState(false)
  const [newEntrainement, setNewEntrainement] = useState({ date: '', description: '', heure: '', lieu: '', fiche_id: null })
  const [entrainementEnEdition, setEntrainementEnEdition] = useState(null)
  const [savingEntrainementEdit, setSavingEntrainementEdit] = useState(false)
  const [showImportFiche, setShowImportFiche] = useState(false)
  const [entrainementActif, setEntrainementActif] = useState(null)
  const [dispoJoueurs, setDispoJoueurs] = useState({}) // { [entrainement_id]: { [profil_joueur_id]: statut } } — auto-déclaré par le joueur
  const [demandesNote, setDemandesNote] = useState({}) // { [entrainement_id]: demande } — seances_notes_demandes
  const [demandeNoteEnCours, setDemandeNoteEnCours] = useState(null) // entrainement_id en cours d'envoi
  const [reponsesNote, setReponsesNote] = useState([]) // seances_notes_joueurs de toutes les demandes de l'éducateur, pour Stats Équipe → Notes joueurs
  const [rapportsRecents, setRapportsRecents] = useState([]) // derniers rapports d'analyse, pour le fil d'activité de l'accueil
  const [sousOngletEnt, setSousOngletEnt] = useState('liste') // 'liste' | 'prochaine'
  const [savingCloture, setSavingCloture] = useState(false)
  const [savingHeureSeance, setSavingHeureSeance] = useState(false)
  const [showPlanificateur, setShowPlanificateur] = useState(false)
  const [planSaison, setPlanSaison] = useState({ joursActifs: [], dateDebut: '', dateFin: '', heuresParJour: {}, theme: '' })
  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [planProgress, setPlanProgress] = useState({ done: 0, total: 0 })

  // Notes / Évaluations
  const [notationsMatch, setNotationsMatch] = useState([]) // notations_match brutes : [{ joueur_id, note, match_id }]
  const [filtreCompTableau, setFiltreCompTableau] = useState('all') // filtre compétition, onglet Stats > Tableau
  const [evalJoueurOuverte, setEvalJoueurOuverte] = useState(null) // joueur dont la fiche d'évaluation est ouverte

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
  const [explorerOnglet, setExplorerOnglet] = useState('educateurs') // 'educateurs' | 'clubs' | 'messages' | 'annonces'
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
  // ── Annonces réseau (onglet d'Explorer) ──
  const [annonces, setAnnonces] = useState([])
  const [annoncesLoading, setAnnoncesLoading] = useState(false)
  const [filtreTypeAnnonce, setFiltreTypeAnnonce] = useState('tous')
  const [filtreRegionAnnonce, setFiltreRegionAnnonce] = useState(null)
  const [showNouvelleAnnonce, setShowNouvelleAnnonce] = useState(false)
  const [nouvelleAnnonce, setNouvelleAnnonce] = useState({ type_annonce: 'recherche_educateur', titre: '', description: '', regions: [], date_evenement: '', contact: '' })
  const [savingAnnonce, setSavingAnnonce] = useState(false)
  const [newParcours, setNewParcours] = useState({ type: 'coach', club: '', poste: '', saison_debut: '', saison_fin: '', niveau: '' })

  useEffect(() => { init() }, [])

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
  useEffect(() => {
    if (activeSection !== 'explorer') return
    if (educateursExplorer.length === 0 && clubsExplorer.length === 0) chargerExplorer()
    chargerMessagesExplorer()
    if (annonces.length === 0) chargerAnnonces()
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
    if (!p) { navigate('/'); return }
    if (p.plan !== 'educateur') {
      // Un compte avec un autre plan d'origine (ex: 'club') peut avoir
      // accepté une invitation éducateur sans que plan ne change — plan
      // reste la propriété de son rôle principal, club_educateurs est la
      // vraie source de vérité pour cet accès-ci (même pattern que
      // staff_club côté DashboardClub.jsx). SmartDashboard (App.jsx) route
      // déjà vers /educateur sur cette même base, indépendamment du plan —
      // sans ce garde-fou ici, la page rejetait quand même ces comptes.
      const { data: accesEducateur } = await supabase.from('club_educateurs').select('id').eq('educateur_id', targetId).eq('statut', 'accepte').maybeSingle()
      if (!accesEducateur) { navigate('/'); return }
    }
    setUserId(targetId)
    setProfil(p)
    // Log de connexion (onglet Viewers, cf. supabase_connexions_log.sql) — pas
    // pour un dirigeant qui consulte le dashboard d'un éducateur (educateurIdOverride) :
    // ce n'est pas cet éducateur qui se connecte. Best-effort, pas d'attente ni
    // de gestion d'erreur : une connexion non tracée ne doit jamais bloquer le dashboard.
    if (!educateurIdOverride) supabase.from('connexions_log').insert({ user_id: targetId, role: 'educateur' }).then(() => {})
    // Phase 1 — chargeurs indépendants de l'équipe active, plus club_categories
    // (nécessaire pour savoir QUELLES équipes ce coach gère avant de pouvoir
    // charger joueurs/matchs/entraînements filtrés par équipe, cf. phase 2).
    // chargerMesSeances/chargerBiblio/chargerDirigeants ne servent qu'à des
    // onglets spécifiques (Mes séances, Bibliothèque, Explorer > Dirigeants),
    // jamais à l'Accueil — chargés à la demande via des useEffect scopés à
    // activeSection plus bas (même pattern que chargerMonMateriel), pas ici.
    // chargerMesSeancesOuvertes lancé SANS être attendu : ses fiches embarquent
    // les schémas tactiques en PNG (plusieurs Mo par fiche) — attendre ce
    // téléchargement retardait tout l'accueil d'environ 15 s (constaté en
    // production, onglet Réseau). Les listes de fiches affichent un état de
    // chargement d'ici là (mesSeancesOuvertesChargees).
    chargerMesSeancesOuvertes(targetId).catch(() => setMesSeancesOuvertesChargees(true))
    const [, clubAffiliationData, clubCategoriesData] = await Promise.all([chargerProfilEdu(targetId), chargerClubAffiliation(targetId), chargerClubCategories(targetId), chargerMesAutresRoles(user.id), chargerNotifications(targetId)])

    // Phase 2 — équipe active parmi celles de ce coach (mémorisée en
    // localStorage, sinon la première) : charge joueurs/matchs/entraînements
    // scopés à cette seule équipe pour ne jamais mélanger les données de 2
    // équipes gérées par le même coach.
    const mesEquipesData = clubCategoriesData.filter(c => c.educateur_id === targetId)
    // Priorité au choix mémorisé côté serveur (profiles.equipe_active_id) :
    // le localStorage est propre à CHAQUE appareil, donc une tablette jamais
    // utilisée avant retombait sur la première équipe de la liste au lieu de
    // celle réellement active sur l'ordi/téléphone du coach — ses widgets
    // (présences du prochain entraînement, etc.) semblaient alors vides
    // alors que les données existaient bien, juste pour une autre équipe.
    // Le localStorage reste un fallback pour les comptes pas encore
    // resynchronisés (valeur serveur encore nulle avant leur premier
    // changerEquipe post-migration).
    let idActif = p.equipe_active_id || null
    if (!idActif) {
      try { idActif = localStorage.getItem('equipe_active_id') } catch { /* ignore */ }
    }
    if (!mesEquipesData.some(e => e.id === idActif)) idActif = mesEquipesData[0]?.id || null
    if (idActif !== equipeActiveId) setEquipeActiveId(idActif)
    // chargerMesTaillesEquipementEduc (chargé ici, pas seulement quand l'onglet
    // "materiel" est ouvert, pour que le widget "Alertes" de l'accueil puisse
    // afficher "équipement prêt" dès l'arrivée) ne dépend que de
    // clubAffiliationData déjà résolu ci-dessus, pas de la phase 2 — lancé en
    // parallèle plutôt qu'avant, un aller-retour de moins avant l'affichage.
    // chargerNotationsMatch/chargerEvaluationsJoueurs idem : Stats et Mon Équipe
    // uniquement, chargés à la demande plus bas (useEffect activeSection).
    await Promise.all([
      chargerJoueurs(targetId, idActif), chargerMatchs(targetId, idActif), chargerEntrainements(targetId, idActif), chargerRapportsRecents(targetId, idActif),
      clubAffiliationData?.club_id ? chargerMesTaillesEquipementEduc(clubAffiliationData.club_id, targetId) : Promise.resolve(),
    ])
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

  const chargerMesAutresRoles = async (uid) => {
    // Ce compte éducateur a-t-il aussi accès à un dashboard club (plan='club'
    // ou staff_club), joueur (plan joueur ou affiliations) ou parent
    // (parents_acces) ? cf. lib/multiRole — centralisé pour les 4 dashboards.
    setMesRoles(await chargerMesRoles(uid))
  }

  const chargerClubAffiliation = async (uid) => {
    const { data, error } = await supabase
      .from('club_educateurs')
      .select('*, club:profiles_public!club_educateurs_club_id_fkey(club, prenom, nom, avatar_url, couleur_principale, image_fond_url, ville, educateurs_editent_projet_sportif, educateurs_editent_planification)')
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
    setMesSeancesOuvertesChargees(true)
  }

  const chargerClubCategories = async (uid) => {
    const { data: aff } = await supabase.from('club_educateurs').select('club_id').eq('educateur_id', uid).eq('statut', 'accepte').maybeSingle()
    if (!aff) { setClubCategories([]); setClubCategoriesChargees(true); return [] }
    const { data } = await supabase.from('club_categories').select('*').eq('club_id', aff.club_id).order('nom')
    setClubCategories(data || [])
    setClubCategoriesChargees(true)
    return data || []
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
    const { data: nouvelle, error } = vacante
      ? await supabase.from('club_categories').update({ educateur_id: userId }).eq('id', vacante.id).select().maybeSingle()
      : await supabase.from('club_categories').insert({ club_id: clubAffiliation.club_id, nom: promptCategorieForm.nom, equipe: promptCategorieForm.equipe, educateur_id: userId }).select().maybeSingle()
    setSavingCategorieClub(false)
    if (error) { alert('Erreur : ' + error.message); return }
    await chargerClubCategories(userId)
    setAjouterEquipeOuvert(false)
    // Bascule automatiquement sur l'équipe qu'on vient de déclarer/réclamer —
    // sinon elle serait créée mais invisible tant qu'on ne la sélectionne pas.
    if (nouvelle) changerEquipe(nouvelle)
  }

  // "Supprimer" une équipe = libérer la ligne club_categories (educateur_id →
  // null), pas la supprimer — c'est une catégorie appartenant au club, pas au
  // coach (même logique que declarerMaCategorie qui réclame une ligne vacante
  // plutôt que d'en recréer une). L'effectif/séances/matchs déjà enregistrés
  // pour cette équipe ne sont donc pas perdus, juste plus visibles depuis ce
  // dashboard tant que personne ne la reprend (cf. le bouton "+ Équipe").
  const supprimerEquipe = async (equipe) => {
    if (mesEquipes.length <= 1) return
    if (!confirm(`Retirer "${labelCategorie(equipe.nom)} — Équipe ${equipe.equipe}" de tes équipes ?\n\nLes joueurs, séances et matchs déjà enregistrés pour cette équipe resteront en base (rien n'est supprimé) mais ne seront plus visibles ici tant que tu ne la reprends pas depuis "+ Équipe".`)) return
    const { error } = await supabase.from('club_categories').update({ educateur_id: null }).eq('id', equipe.id).eq('educateur_id', userId)
    if (error) { alert('Erreur : ' + error.message); return }
    const toutes = await chargerClubCategories(userId)
    if (equipeActiveId === equipe.id) {
      const suivante = toutes.find(c => c.educateur_id === userId)
      if (suivante) changerEquipe(suivante)
      else { setEquipeActiveId(null); try { localStorage.removeItem('equipe_active_id') } catch { /* ignore */ } }
    }
  }

  // equipe_joueurs n'a pas de colonne avatar_url — la photo vit sur profiles,
  // reliée via joueur_id (absent pour un joueur ajouté manuellement, sans
  // compte lié). Un seul enrichissement ici : tous les consommateurs de
  // `joueurs` (Mon équipe, Évaluations, podiums stats, clôture de saison...)
  // héritent d'avatar_url sans requête supplémentaire de leur côté.
  const chargerJoueurs = async (uid, catId) => {
    let q = supabase.from('equipe_joueurs').select('*').eq('educateur_id', uid).order('nom')
    if (catId) q = q.eq('club_categorie_id', catId)
    const { data } = await q
    const roster = data || []
    const joueurIds = [...new Set(roster.map(j => j.joueur_id).filter(Boolean))]
    // Photo affichée (avatar_url) : celle ajoutée par le coach dans l'effectif
    // (equipe_joueurs.photo_url) en priorité, sinon celle du compte du joueur
    // (photo_profil), sinon initiales (Avatar).
    const avecPhotos = (parId) => roster.map(j => {
      const photoProfil = j.joueur_id ? parId[j.joueur_id] || null : null
      return { ...j, photo_profil: photoProfil, avatar_url: j.photo_url || photoProfil }
    })
    if (joueurIds.length === 0) { setJoueurs(avecPhotos({})); return }
    // profiles_public (vue publique, sans email/Stripe) et non profiles : depuis
    // la restriction de lecture de profiles, un éducateur ne peut plus lire le
    // profil de ses joueurs — toutes les photos avaient disparu.
    const { data: profils } = await supabase.from('profiles_public').select('id, avatar_url').in('id', joueurIds)
    const avatarParId = {}
    ;(profils || []).forEach(p => { avatarParId[p.id] = p.avatar_url })
    setJoueurs(avecPhotos(avatarParId))
  }

  const chargerMatchs = async (uid, catId) => {
    // Scopé à la saison en cours — sans borne, cette requête (jointe à
    // stats_match/notations_match) ramenait l'historique complet du compte,
    // toutes saisons confondues, à chaque chargement/changement d'équipe.
    // Les saisons passées ont leur propre vue (historique_saisons, alimentée
    // par GestionCloturesSaison), pas besoin de les relire ici.
    const { date_debut, date_fin } = bornesSaison(saisonActuelle())
    let q = supabase.from('matchs_equipe').select('*, stats_match(*), notations_match(id)').eq('educateur_id', uid)
      .gte('date', date_debut).lte('date', date_fin).order('date', { ascending: false })
    if (catId) q = q.eq('club_categorie_id', catId)
    // chargerMatchIdsAvecRapport ne dépend que de uid, indépendant de la
    // requête ci-dessus — lancé en parallèle plutôt qu'après. chargerMatchs
    // est la fonction de chargement la plus fréquemment déclenchée par un
    // clic dans ce dashboard (changement d'équipe, ajout/édition/suppression/
    // notation d'un match).
    const [{ data }] = await Promise.all([q, chargerMatchIdsAvecRapport(uid)])
    setMatchs(data || [])

    // Dispos auto-déclarées par les joueurs pour ces matchs (mêmes disponibilites
    // que pour les entraînements, via match_id — déjà écrites par les joueurs
    // depuis leur dashboard, juste jamais affichées côté éducateur)
    const matchIds = (data || []).map(m => m.id)
    if (matchIds.length > 0) {
      const { data: dispos } = await fetchToutesLignesIn(matchIds, ids => supabase.from('disponibilites').select('id, joueur_id, match_id, statut, created_at').in('match_id', ids).order('id'))
      const map = {}
      dispos?.forEach(d => { if (!map[d.match_id]) map[d.match_id] = {}; map[d.match_id][d.joueur_id] = d.statut })
      setDispoJoueursMatch(map)
    } else {
      setDispoJoueursMatch({})
    }
    return data || []
  }

  // Quels matchs ont déjà un rapport de match sauvegardé (rapports_analyse,
  // mode_analyse='match') — juste pour afficher un badge sur la carte
  // résultat, contenu du rapport chargé seulement à l'ouverture de la modale.
  const chargerMatchIdsAvecRapport = async (uid) => {
    const { data } = await supabase.from('rapports_analyse').select('contenu').eq('educateur_id', uid).eq('mode_analyse', 'match')
    setMatchIdsAvecRapport(new Set((data || []).map(r => r.contenu?.match_id).filter(Boolean)))
  }

  // Export PDF direct depuis la carte résultat, sans ouvrir la modale — si un
  // rapport a déjà été sauvegardé pour ce match, on exporte son contenu tel
  // quel (avec l'analyse/causerie déjà saisies) ; sinon on exporte un rapport
  // pré-rempli à la volée depuis la feuille de match (mêmes données que le
  // pré-remplissage de la modale), sans le sauvegarder.
  const exporterRapportMatchPdf = async (m) => {
    const { genererPDFMatch, preRemplirDepuisMatch } = await import('../components/RapportMatch')
    const { data } = await supabase.from('rapports_analyse').select('*').eq('educateur_id', userId).eq('mode_analyse', 'match')
    const existant = (data || []).find(r => r.contenu?.match_id === m.id)
    if (existant) {
      await genererPDFMatch(existant, profilEdu?.club)
      return
    }
    const p = preRemplirDepuisMatch(m, joueurs)
    await genererPDFMatch({
      date_analyse: m.date,
      contenu: { match_id: m.id, adversaire: m.adversaire, domicile: m.domicile, score_nous: m.score_nous, score_eux: m.score_eux, ...p },
    }, profilEdu?.club)
  }

  const chargerEntrainements = async (uid, catId) => {
    // Paginé (lib/supabasePagination) : toutes saisons et équipes confondues,
    // un éducateur finit par dépasser 1000 séances.
    const { data } = await fetchToutesLignes(() => {
      let q = supabase.from('entrainements').select('*, presences_entrainement(*)').eq('educateur_id', uid).order('date', { ascending: false }).order('id')
      if (catId) q = q.eq('club_categorie_id', catId)
      return q
    })
    setEntrainements(data || [])

    // Dispos auto-déclarées par les joueurs pour ces entraînements (RLS : lisible car éducateur affilié)
    const entrainementIds = (data || []).map(e => e.id)
    if (entrainementIds.length > 0) {
      // Paginé : une équipe dépasse vite les 1000 réponses sur une saison
      // (25 joueurs × 3 séances/semaine), plafond PostgREST au-delà duquel des
      // séances entières perdaient leurs réponses en silence (cf. lib/supabasePagination).
      const { data: dispos } = await fetchToutesLignesIn(entrainementIds, ids => supabase.from('disponibilites').select('id, joueur_id, seance_id, statut, created_at').in('seance_id', ids).order('id'))
      const map = {}
      dispos?.forEach(d => { if (!map[d.seance_id]) map[d.seance_id] = {}; map[d.seance_id][d.joueur_id] = d.statut })
      setDispoJoueurs(map)
    } else {
      setDispoJoueurs({})
    }

    const { data: demandes } = await supabase.from('seances_notes_demandes').select('*').eq('educateur_id', uid)
    const demandesMap = {}
    demandes?.forEach(d => { demandesMap[d.entrainement_id] = d })
    setDemandesNote(demandesMap)

    const demandeIds = (demandes || []).map(d => d.id)
    if (demandeIds.length > 0) {
      // ~25 réponses par demande : dépasse 1000 en une saison.
      const { data: reponses } = await fetchToutesLignesIn(demandeIds, ids => supabase.from('seances_notes_joueurs')
        .select('*, profiles:profiles_public!seances_notes_joueurs_joueur_id_fkey(prenom, nom, avatar_url)').in('demande_id', ids).order('id'))
      setReponsesNote(reponses || [])
    } else {
      setReponsesNote([])
    }
  }

  // Demande une note de séance aux joueurs affiliés (acceptés) — un seul
  // envoi par entraînement (UNIQUE(entrainement_id) côté SQL). Notifie
  // chaque joueur affilié à CET éducateur (pas toute la plateforme comme le
  // ferait un chargement non scopé côté joueur).
  async function demanderNoteSeance(e) {
    setDemandeNoteEnCours(e.id)
    const titre = `Séance du ${new Date(`${e.date}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`
    const { data, error } = await supabase.from('seances_notes_demandes').insert({
      entrainement_id: e.id, educateur_id: userId, club_categorie_id: e.club_categorie_id || null,
      titre, date_seance: e.date, statut: 'ouverte',
    }).select().single()
    if (error) { console.error('demanderNoteSeance error:', error); alert('Erreur : ' + error.message); setDemandeNoteEnCours(null); return }
    setDemandesNote(prev => ({ ...prev, [e.id]: data }))

    const { data: affiliesAcceptes } = await supabase.from('affiliations').select('joueur_id').eq('educateur_id', userId).eq('statut', 'accepte')
    await Promise.all((affiliesAcceptes || []).map(a => notifierJoueur({
      type: 'seance_note', userId: a.joueur_id, titre: 'Nouveau ressenti de séance à donner',
      contenu: { texte: titre }, lien: '/dashboard-joueur',
    }).catch(err => console.error('notifierJoueur seance_note error:', err))))
    setDemandeNoteEnCours(null)
  }

  async function fermerDemandeNote(demandeId, entrainementId) {
    const { error } = await supabase.from('seances_notes_demandes').update({ statut: 'fermee' }).eq('id', demandeId)
    if (error) { console.error('fermerDemandeNote error:', error); return }
    setDemandesNote(prev => ({ ...prev, [entrainementId]: { ...prev[entrainementId], statut: 'fermee' } }))
  }

  const chargerRapportsRecents = async (uid, catId) => {
    let q = supabase.from('rapports_analyse').select('id, prenom_joueur, poste, created_at, date_analyse').eq('educateur_id', uid).order('created_at', { ascending: false }).limit(5)
    if (catId) q = q.eq('club_categorie_id', catId)
    const { data } = await q
    setRapportsRecents(data || [])
  }

  // Notes de match (notations_match, une note/10 par joueur et par match — distinct
  // de la fiche d'évaluation par saison, cf. FicheEvaluationJoueur). Inclut aussi
  // les notes d'équipe (joueur_id NULL, est_note_equipe=true) pour la card "Note
  // globale équipe" — les lignes équipe n'ont jamais de joueur_id, donc elles ne
  // perturbent pas le calcul de moyenne par joueur ci-dessous.
  const chargerNotationsMatch = async (uid, matchIds = []) => {
    if (matchIds.length === 0) { setNotationsMatch([]); return }
    // Une note par joueur et par match : ~1000 lignes par saison et par équipe.
    const { data } = await fetchToutesLignesIn(matchIds, ids => supabase.from('notations_match').select('id, joueur_id, note, match_id, est_note_equipe').eq('educateur_id', uid).in('match_id', ids).order('id'))
    setNotationsMatch(data || [])
  }

  // Fiches d'évaluation (evaluations_joueur, cf. FicheEvaluationJoueur.jsx) —
  // distinct de notations_match (note/10 par match). equipe_joueur_id référence
  // equipe_joueurs.id (= joueurs[].id dans ce fichier), pas profiles.id.
  const [evaluationsJoueurs, setEvaluationsJoueurs] = useState([])
  const chargerEvaluationsJoueurs = async (uid) => {
    const { data } = await fetchToutesLignes(() => supabase.from('evaluations_joueur').select('id, equipe_joueur_id, note_globale_saison, updated_at').eq('educateur_id', uid).order('id'))
    setEvaluationsJoueurs(data || [])
  }
  // Dernière évaluation renseignée pour un joueur (toutes périodes/saisons
  // confondues), utilisée dans le profil joueur — seule note_globale_saison
  // est numérique dans la fiche, les 4 aspects (technique/physique/mental/
  // tactique) ne sont que du texte libre (points forts / à améliorer), pas
  // de score par aspect.
  const derniereEvaluation = (equipeJoueurId) => {
    const rows = evaluationsJoueurs.filter(e => e.equipe_joueur_id === equipeJoueurId && e.note_globale_saison != null)
    if (rows.length === 0) return null
    return rows.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0]
  }
  // Note moyenne "coach" d'un joueur sur tous ses matchs notés (notations_match,
  // /10) — même agrégat que "Note coach" sur l'Accueil joueur (DashboardJoueur.jsx,
  // moyennePerso), utilisé pour le tri "Note" du classement.
  const noteMoyenneMatch = (equipeJoueurId, matchIdsScope = null) => {
    const notesJoueur = notationsMatch.filter(n => n.joueur_id === equipeJoueurId && !n.est_note_equipe && (!matchIdsScope || matchIdsScope.has(n.match_id)))
    if (!notesJoueur.length) return null
    const moy = notesJoueur.reduce((s, n) => s + Number(n.note), 0) / notesJoueur.length
    return { moyenne: Number(moy.toFixed(1)), nb: notesJoueur.length }
  }

  const [notesEdu, setNotesEdu] = useState([])
  const [affiliations, setAffiliations] = useState([])

  const [clubAffiliation, setClubAffiliation] = useState(null) // liaison actuelle avec un club
  const [cancelling, setCancelling] = useState(false)
  const [cancelDone, setCancelDone] = useState(false)
  const [annoncesClub, setAnnoncesClub] = useState([])
  const [annoncesLuesIds, setAnnoncesLuesIds] = useState(new Set())
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

  // Actualités publiées par le club — visibles dès l'affiliation acceptée (pas
  // besoin d'ouvrir l'onglet, contrairement au matériel) pour que le badge de
  // non-lus dans la sidebar reflète l'état réel.
  const chargerAnnoncesClub = async () => {
    if (!clubAffiliation?.club_id) return
    const [{ data }, { data: lues }] = await Promise.all([
      supabase.from('annonces_club').select('*').eq('club_id', clubAffiliation.club_id).in('cible', ['tous', 'educateurs']).order('created_at', { ascending: false }),
      supabase.from('annonces_lues').select('annonce_id').eq('user_id', userId),
    ])
    setAnnoncesClub(data || [])
    setAnnoncesLuesIds(new Set((lues || []).map(l => l.annonce_id)))
  }
  useEffect(() => { if (clubAffiliation?.club_id && clubAffiliation.statut === 'accepte') chargerAnnoncesClub() }, [clubAffiliation])

  const marquerAnnonceLue = async (annonceId) => {
    if (annoncesLuesIds.has(annonceId)) return
    setAnnoncesLuesIds(prev => new Set(prev).add(annonceId))
    await supabase.from('annonces_lues').upsert({ annonce_id: annonceId, user_id: userId }, { onConflict: 'annonce_id,user_id' })
  }
  const [clubCategories, setClubCategories] = useState([])
  const [clubCategoriesChargees, setClubCategoriesChargees] = useState(false)
  const [promptCategorieForm, setPromptCategorieForm] = useState({ nom: 'U13', equipe: 'A' })
  const [savingCategorieClub, setSavingCategorieClub] = useState(false)
  const [ajouterEquipeOuvert, setAjouterEquipeOuvert] = useState(false)
  // Un éducateur peut gérer plusieurs équipes (switcher) — toutes les lignes
  // club_categories qui lui sont assignées, pas juste la première (cf.
  // declarerMaCategorie, appelable plusieurs fois pour ajouter une équipe).
  const mesEquipes = clubCategories.filter(c => c.educateur_id === userId)
  // Tutoriels guidés : ouverts à la demande (bouton « Tutoriel ») ou
  // automatiquement à la première visite de la page concernée (cf. tutoAuto
  // plus bas, dérivé au rendu plutôt que posé par un effet). tutoMaj force
  // un nouveau rendu une fois le tutoriel marqué comme vu.
  const [tutoOuvert, setTutoOuvert] = useState(null)
  useTutorielsVus()
  const [, setTutoMaj] = useState(0)
  const [equipeActiveId, setEquipeActiveId] = useState(() => {
    try { return localStorage.getItem('equipe_active_id') || null } catch { return null }
  })
  const equipeActive = mesEquipes.find(e => e.id === equipeActiveId) || mesEquipes[0] || null
  const changerEquipe = (equipe) => {
    setEquipeActiveId(equipe.id)
    try { localStorage.setItem('equipe_active_id', equipe.id) } catch { /* ignore */ }
    // Persisté aussi côté serveur (best-effort, fire-and-forget) pour que
    // les autres appareils du coach retrouvent la même équipe active —
    // cf. résolution dans init() ci-dessus.
    avecRetrySession(() => supabase.from('profiles').update({ equipe_active_id: equipe.id }).eq('id', userId)).then(() => {})
    chargerJoueurs(userId, equipe.id)
    chargerMatchs(userId, equipe.id).then(matchs => chargerNotationsMatch(userId, matchs.map(m => m.id)))
    chargerEvaluationsJoueurs(userId)
    chargerEntrainements(userId, equipe.id)
    chargerRapportsRecents(userId, equipe.id)
  }

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
  const [mesSeancesOuvertesChargees, setMesSeancesOuvertesChargees] = useState(false)
  const [uploadSeanceOuverteForm, setUploadSeanceOuverteForm] = useState({ theme: '', date_seance: '', categorie_tactique: '', categorie_age: '', type_seance: 'collectif', video_url: '', fichier_url: '', commentaire_perso: '' })
  const [dossiersOuverts, setDossiersOuverts] = useState({})
  // Sous-dossiers "principes de jeu" à l'intérieur d'un dossier Offensif/Défensif
  // — clé "phaseKey:principeId" (ex. "offensif:conservation") pour éviter toute
  // collision entre les deux listes de principes.
  const [principesOuverts, setPrincipesOuverts] = useState({})
  // Filtres "Mes séances" — actifs, on bascule des dossiers cliquables à une
  // liste plate filtrée (cf. rendu activeSection === 'mes_seances').
  const [filtrePhase, setFiltrePhase] = useState('tous') // 'tous' | 'offensif' | 'defensif'
  const [filtreTheme, setFiltreTheme] = useState('')
  const [filtreCategorieAge, setFiltreCategorieAge] = useState('')
  const [filtreTypeSeance, setFiltreTypeSeance] = useState('tous') // 'tous' | 'collectif' | 'individuel'
  const [filtreAnime, setFiltreAnime] = useState(false)
  const [modeSeance, setModeSeance] = useState('rediger')
  const [confirmSuppr, setConfirmSuppr] = useState(null) // id de la séance à confirmer

  // Bibliothèque de procédés d'entraînement
  const [biblio, setBiblio] = useState([])
  const [biblioLoading, setBiblioLoading] = useState(false)
  const [biblioTab, setBiblioTab] = useState('tous') // 'tous' | 'jeu' | 'exercice' | 'situation' | 'echauffement'
  const [biblioSearch, setBiblioSearch] = useState('')
  const [biblioFiltrePhase, setBiblioFiltrePhase] = useState('tous') // 'tous' | 'offensif' | 'defensif' — club/platform uniquement
  const [biblioFiltreTheme, setBiblioFiltreTheme] = useState('')
  const [biblioFiltreCategorieAge, setBiblioFiltreCategorieAge] = useState('')
  const [biblioRubrique, setBiblioRubrique] = useState('personal') // 'personal' | 'club' | 'platform' | 'videos'
  const PROCEDE_VIDE = { type: 'exercice', nom: '', theme: '', objectif: '', but: '', criteres_realisation: '', description: '', consignes: '', variables: '', duree: '', nb_joueurs: '', tags: '', schema_png: '', schema_data: null, categorie_age: ['Pour tous'], partage_club: false, partage_platform: false }
  // Filet de secours si l'enregistrement d'un procédé échoue (session expirée,
  // coupure réseau...) : la modale se ferme en optimiste AVANT la réponse
  // serveur (cf. sauvegarderProcede), donc sans ça une erreur fait disparaître
  // la saisie sans aucune trace. Conservé en localStorage (survit même à un
  // rechargement de page) jusqu'au prochain enregistrement réussi.
  const PROCEDE_BROUILLON_KEY = 'df_procede_brouillon'
  const CATEGORIES_AGE_PROCEDE = ['Pour tous', 'U6-U7', 'U8-U9', 'U10-U11', 'U12-U13', 'U14-U15', 'U16-U17', 'U18-U19', 'Senior']
  // Valeur stockée toujours en français (canonique, comparée telle quelle par
  // les filtres) — seul l'affichage est traduit ; les tranches U6-U7 etc.
  // sont déjà identiques dans toutes les langues proposées.
  const labelAgeProcede = c => c === 'Pour tous' ? t('biblio_age_pour_tous', lang) : c === 'Senior' ? t('biblio_age_senior', lang) : c
  // categorie_age est un tableau (un procédé peut s'adapter à plusieurs
  // tranches d'âge, cf. supabase_bibliotheque_categorie_age_multiple.sql) —
  // toggle générique réutilisé par les deux formulaires de sauvegarde
  // (modale complète + sauvegarde rapide depuis la fiche).
  const toggleDansListe = (liste, val) => (liste || []).includes(val) ? liste.filter(x => x !== val) : [...(liste || []), val]
  // Le thème d'un procédé peut être soit une valeur FFF (cf. themeSeanceInfo,
  // ex. 'conservation'), soit — depuis la modale de sauvegarde enrichie — un
  // libellé de phase brut ('Offensif'/'Défensif'/...) : les deux gardent leur
  // valeur française canonique en base, seul l'affichage passe par t().
  const THEME_PROCEDE_CLES = { 'Offensif': 'biblio_theme_offensif', 'Défensif': 'biblio_theme_defensif', 'Coup de pied arrêté': 'biblio_theme_cpa', 'Gardien de but': 'biblio_theme_gardien', 'Physique': 'biblio_theme_physique', 'Sans thème': 'biblio_theme_sans' }
  const labelThemeProcede = theme => THEME_PROCEDE_CLES[theme] ? t(THEME_PROCEDE_CLES[theme], lang) : themeSeanceInfo(theme)?.label || theme
  // Thèmes officiels FFF (categorie_tactique) — value → clé de traduction,
  // pour ne jamais afficher les libellés en dur de THEMES_SEANCE/themesSeance.js.
  const THEME_FFF_CLES = {
    conservation: 'theme_fff_conservation', utilisation_creation_espaces: 'theme_fff_utilisation_creation_espaces',
    dribble_elimination: 'theme_fff_dribble_elimination', fixer_renverser: 'theme_fff_fixer_renverser',
    agrandir_espace_jeu: 'theme_fff_agrandir_espace_jeu', desequilibrer_finir: 'theme_fff_desequilibrer_finir',
    progression: 'theme_fff_progression', coup_pied_arrete: 'theme_fff_coup_pied_arrete',
    defense_inferiorite_numerique: 'theme_fff_defense_inferiorite_numerique', remplacer_axe_ballon_but: 'theme_fff_remplacer_axe_ballon_but',
    duels: 'theme_fff_duels', reformer_bloc_equipe: 'theme_fff_reformer_bloc_equipe',
    recuperer_ballon_bloc: 'theme_fff_recuperer_ballon_bloc', proteger_but_desequilibre: 'theme_fff_proteger_but_desequilibre',
    gardien_de_but: 'theme_fff_gardien_de_but',
  }
  const labelTheme = value => THEME_FFF_CLES[value] ? t(THEME_FFF_CLES[value], lang) : themeSeanceInfo(value)?.label || value
  const labelPhase = phase => phase === 'offensif' ? t('biblio_theme_offensif', lang) : phase === 'defensif' ? t('biblio_theme_defensif', lang) : phase
  const METAPROC_VIDE = { nom: '', theme: '', principe: '', categorie_age: [], type: 'exercice', partage_platform: true }
  const [modalProcede, setModalProcede] = useState(false)
  const [showTactipadBiblio, setShowTactipadBiblio] = useState(false)
  const [procedeEnEdition, setProcedeEnEdition] = useState(null) // null = nouveau
  const [procedeForm, setProcedeForm] = useState(PROCEDE_VIDE)
  const [savingProcede, setSavingProcede] = useState(false)
  const [procedeBrouillon, setProcedeBrouillon] = useState(() => {
    try {
      const raw = localStorage.getItem(PROCEDE_BROUILLON_KEY)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })
  const [modalBiblioImport, setModalBiblioImport] = useState(null) // index du procédé cible dans la fiche, ou null si fermé
  const [procedeActif, setProcedeActif] = useState(null) // procédé affiché en grand (modale d'aperçu bibliothèque), ou null si fermée
  const [biblioSelectionMode, setBiblioSelectionMode] = useState(false)
  // Objets complets (pas juste des id) : la sélection doit survivre à un
  // changement de rubrique (personal/club/platform), qui recharge `biblio` et
  // ferait perdre les procédés sélectionnés ailleurs si on ne stockait qu'un id.
  const [biblioSelection, setBiblioSelection] = useState([])
  const [showVisibilityPicker, setShowVisibilityPicker] = useState(null) // procédé (bloc de la fiche) en cours de sauvegarde rapide, ou null si fermé
  const [metaProc, setMetaProc] = useState(METAPROC_VIDE) // métadonnées collectées par la modale de sauvegarde enrichie
  const [modalScannerProc, setModalScannerProc] = useState(false)
  const [modalImportFicheEntrainement, setModalImportFicheEntrainement] = useState(null) // id de l'entraînement cible, ou null si fermé
  const [moisOuverts, setMoisOuverts] = useState(() => {
    const now = new Date()
    return new Set([`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`])
  })
  const ficheVide = {
    theme: '', date: '', categorie_tactique: '', categorie_age: '', type_seance: 'collectif', nb_joueurs: '', duree_totale: '', objectif_general: '',
    // Mode diplôme (BMF/BEF/DEF) — optionnel, null = fiche libre. Fait partie de
    // `fiche` (et donc de fiche_seance à la sauvegarde) plutôt que des states
    // séparés : ce composant centralise déjà toute la fiche dans un seul objet.
    mode_diplome: null, phase_jeu: '', principe_jeu: '',
    // Séance N° / Heure de début : en-tête de la fiche officielle BEF (cf.
    // template fédéral) — nom_prenom vient du profil éducateur, pas resaisi ici.
    numero_seance: '', heure_debut: '',
    constats: '', justification_pedagogique: '', auto_evaluation: '',
    analyse_equipe: '', bilan_projection: '',
    procedes: Array(4).fill(null).map((_, i) => ({
      numero: i + 1, titre: '', duree: '', nb_joueurs: '', but: '', organisation: '', consignes: '', variables: '',
      // Champs du gabarit officiel BEF (cf. template fédéral "Fiche séance") —
      // remplacent l'affichage générique (but/organisation/consignes/variables)
      // à l'impression quand mode_diplome === 'BEF'. tps_travail/tps_recup/
      // nb_series/nb_repet/rpe/pedagogie/surface forment la colonne
      // "Organisation" du gabarit ; but_bef/consignes_bef/systemes_jeu/
      // variantes_bef forment la colonne "Descriptif".
      tps_travail: '', tps_recup: '', nb_series: '', nb_repet: '', rpe: '',
      pedagogie: '', surface: '',
      comportements_attendus: '',
      but_bef: '', consignes_bef: '', systemes_jeu: '', variantes_bef: '',
      criteres_realisation: '', criteres_reussite: '', dominantes_impacts: '',
      bilan_posture: '', bilan_remediations: '',
      // Gabarit officiel BMF (modèle FFF, cf. FicheBMFContenu) — surface,
      // comportements_attendus et criteres_reussite sont partagés avec BEF.
      objectif: '', sequence: '', gestion_rotations: '',
    }))
  }
  const [fiche, setFiche] = useState(ficheVide)
  const [sport, setSport] = useState('football')
  // Filet de sécurité contre les pertes de fiche en cours de rédaction (cf.
  // bug du 2026-09-22 : session expirée en plein milieu d'une longue
  // rédaction → l'enregistrement échouait et le contenu semblait perdu).
  // Sauvegarde locale (debounced) indépendante de Supabase, donc immunisée
  // contre les problèmes de session/réseau — restaurable au retour sur
  // l'onglet, effacée une fois la fiche réellement enregistrée en base.
  const [brouillonFiche, setBrouillonFiche] = useState(null) // { fiche, sport, savedAt } détecté au chargement, ou null
  const [tactipadModal, setTactipadModal] = useState(null) // index du procédé en cours d'édition de schéma
  const [savingFiche, setSavingFiche] = useState(false)
  const [uploadingSeanceOuverte, setUploadingSeanceOuverte] = useState(false)
  const [ficheFichierUrl, setFicheFichierUrl] = useState(null) // image du scan d'origine, portée jusqu'à la sauvegarde de la fiche
  const [ficheExtraite, setFicheExtraite] = useState(false) // bandeau "fiche extraite" affiché après un scan IA
  const [apercuFicheEnCoursOuvert, setApercuFicheEnCoursOuvert] = useState(false) // aperçu en grand de la fiche en cours de rédaction (lecture seule, ne touche pas à `fiche`)
  // Barre d'actions des modals d'aperçu fiche : pleine (avec libellés) tout
  // en haut du scroll, réduite à une simple croix flottante dès qu'on défile
  // — une barre noire opaque qui reste collée en permanence par-dessus le
  // contenu gênait la lecture (signalé sur mobile, cf. capture utilisateur).
  // Remis à true à chaque ouverture directement dans les onClick qui
  // affichent ces modals (cf. plus bas) plutôt que via un effet déclenché
  // par le changement d'état — sinon un modal rouvert après avoir défilé la
  // dernière fois repartirait directement en mode croix flottante.
  const [apercuEnCoursEnHaut, setApercuEnCoursEnHaut] = useState(true)
  const [ficheApercuEnHaut, setFicheApercuEnHaut] = useState(true)
  const [ficheApercu, setFicheApercu] = useState(null) // fiche archivée (seances_uploadees row) affichée dans le modal aperçu
  const [modeEditionApercu, setModeEditionApercu] = useState(false)
  const [ficheApercuEdit, setFicheApercuEdit] = useState(null) // copie éditable de ficheApercu.fiche_seance + categorie_tactique, tant que modeEditionApercu est actif
  const [savingFicheApercu, setSavingFicheApercu] = useState(false)
  const [generantPartage, setGenerantPartage] = useState(false)
  const [regenererApercuApresEdit, setRegenererApercuApresEdit] = useState(false) // déclenche la régénération auto du PDF une fois l'aperçu en lecture seule réaffiché après un save
  const [scanImageFile, setScanImageFile] = useState(null)
  const [scanImagePreview, setScanImagePreview] = useState(null)
  const [scanImageBase64, setScanImageBase64] = useState(null)
  const [scanningFiche, setScanningFiche] = useState(false)
  const [scanFicheStatus, setScanFicheStatus] = useState(null)
  const [scanFicheError, setScanFicheError] = useState(null)

  // Détecte un brouillon local laissé par une session précédente (ex:
  // enregistrement échoué, fermeture accidentelle) dès que l'identité de
  // l'éducateur est connue — propose de le restaurer via un bandeau, ne
  // l'applique jamais automatiquement pour ne pas écraser une saisie en cours.
  useEffect(() => {
    const detecter = async () => {
      if (!userId) return
      try {
        const brut = localStorage.getItem(`df_fiche_brouillon_${userId}`)
        if (brut) setBrouillonFiche(JSON.parse(brut))
      } catch { /* JSON invalide : ignoré */ }
    }
    detecter()
  }, [userId])

  // Sauvegarde locale continue (debounced) pendant la rédaction — indépendante
  // de Supabase (aucun appel réseau), donc toujours disponible même si
  // l'enregistrement échoue (session expirée, réseau coupé...).
  useEffect(() => {
    if (!userId || modeSeance !== 'rediger') return
    const vide = !fiche.theme?.trim() && !fiche.date && fiche.procedes.every(p => !p.titre?.trim() && !p.organisation?.trim() && !p.consignes?.trim())
    const timer = setTimeout(() => {
      try {
        if (vide) localStorage.removeItem(`df_fiche_brouillon_${userId}`)
        else localStorage.setItem(`df_fiche_brouillon_${userId}`, JSON.stringify({ fiche, sport, savedAt: Date.now() }))
      } catch { /* quota dépassé ou navigation privée : tant pis, pas de brouillon */ }
    }, 800)
    return () => clearTimeout(timer)
  }, [fiche, sport, userId, modeSeance])

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
    // Les 5 requêtes ne filtrent que sur `uid` (ou une constante), aucune ne
    // dépend du résultat d'une autre — lancées en parallèle plutôt qu'en
    // série (c'est l'une des 9 branches du Promise.all de init(), donc sa
    // propre lenteur interne pouvait à elle seule dicter la durée du
    // chargement initial du dashboard).
    // joueur (via equipe_joueur_id) ne résout que si la demande a déjà été
    // liée à une fiche du roster — c'est justement ce que l'éducateur choisit
    // au moment d'accepter (setAffiliationEnCours), donc toujours null pour
    // une demande "en attente" : joueur_profil (via joueur_id, le vrai
    // compte du demandeur) est la seule source fiable à ce stade.
    // equipe_joueurs n'a pas de colonne avatar_url (photo disponible seulement
    // via joueur_profil, la relation profiles) — ne pas la demander sur
    // l'embed equipe_joueur_id, PostgREST erreurait sur une colonne inexistante.
    const [
      { data: profilBase },
      { data: pe },
      { data: pa },
      { data: ne },
      { data: af },
    ] = await Promise.all([
      supabase.from('profiles').select('avatar_url').eq('id', uid).maybeSingle(),
      supabase.from('profil_educateur').select('*').eq('user_id', uid).single(),
      supabase.from('parcours_educateur').select('*').eq('user_id', uid).order('ordre'),
      supabase.from('notes_educateur').select('*, profiles:profiles_public!notes_educateur_auteur_id_fkey(prenom, nom, plan)').eq('educateur_id', uid),
      supabase.from('affiliations').select('*, joueur:equipe_joueur_id(prenom, nom), joueur_profil:joueur_id(prenom, nom, email, avatar_url)').eq('educateur_id', uid).order('created_at', { ascending: false }),
    ])
    if (pe) { setProfilEdu({ ...pe, avatar_url: profilBase?.avatar_url }); setProfilEduEdit({ ...pe, avatar_url: profilBase?.avatar_url }); setLienGroupe(pe.lien_groupe || '') }
    else { setProfilEduEdit({ prenom: '', nom: '', diplome: '', categorie: '', club: '', niveau_championnat: '', avatar_url: profilBase?.avatar_url }) }
    setParcoursEdu(pa || [])
    setNotesEdu(ne || [])
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
    // club_par_code (SECURITY DEFINER) : code_club n'est pas lisible
    // directement depuis la restriction de lecture de profiles.
    const { data: clubsTrouves } = await supabase.rpc('club_par_code', { p_code: codeClubInput.trim() })
    const clubProfile = clubsTrouves?.[0] || null
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
        const sig = await demanderSignatureUpload('video')
        const formData = new FormData()
        formData.append('file', seanceVideoFile)
        ajouterChampsSignes(formData, sig)
        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloud_name}/video/upload`, { method: 'POST', body: formData })
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
    const sig = await demanderSignatureImage({ usage: 'seance' })
    const { cloud_name } = sig
    const formData = new FormData()
    formData.append('file', file)
    ajouterChampsSignes(formData, sig)
    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, { method: 'POST', body: formData })
    const uploadData = await uploadRes.json()
    return uploadData.secure_url || null
  }

  const uploaderMaSeance = async () => {
    setUploadingSeanceOuverte(true)
    const { data: inserted, error } = await avecRetrySession(() => supabase.from('seances_uploadees').insert({
      educateur_id: userId,
      theme: uploadSeanceOuverteForm.theme || null,
      date_seance: uploadSeanceOuverteForm.date_seance || null,
      categorie_tactique: uploadSeanceOuverteForm.categorie_tactique || null,
      categorie_age: uploadSeanceOuverteForm.categorie_age || null,
      type_seance: uploadSeanceOuverteForm.type_seance || 'collectif',
      video_url: uploadSeanceOuverteForm.video_url || null,
      fichier_url: uploadSeanceOuverteForm.fichier_url || null,
      commentaire_perso: uploadSeanceOuverteForm.commentaire_perso || null,
      origine: 'ouvert',
      statut: 'en_attente',
      saison: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    }).select().single())
    setUploadingSeanceOuverte(false)
    if (error) {
      console.error('Erreur insertion séance:', error)
      alert('Erreur lors de l\'enregistrement : ' + error.message)
      return
    }
    await lierFicheAEntrainementCorrespondant(inserted.id, uploadSeanceOuverteForm.date_seance)
    setUploadSeanceOuverteForm({ theme: '', date_seance: '', categorie_tactique: '', categorie_age: '', type_seance: 'collectif', video_url: '', fichier_url: '', commentaire_perso: '' })
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
      procedes: [...f.procedes, {
        numero: f.procedes.length + 1, titre: '', duree: '', nb_joueurs: '', but: '', organisation: '', consignes: '', variables: '',
        tps_travail: '', tps_recup: '', nb_series: '', nb_repet: '', rpe: '', pedagogie: '', surface: '',
        comportements_attendus: '', but_bef: '', consignes_bef: '', systemes_jeu: '', variantes_bef: '',
        criteres_realisation: '', criteres_reussite: '', dominantes_impacts: '', bilan_posture: '', bilan_remediations: '',
      }],
    }))
  }

  const retirerProcedeFiche = (index) => {
    setFiche(f => {
      if (f.procedes.length <= 1) return f
      return { ...f, procedes: f.procedes.filter((_, i) => i !== index).map((p, i) => ({ ...p, numero: i + 1 })) }
    })
  }

  // direction: -1 (monter) ou +1 (descendre) — renumérote après le swap,
  // même logique que retirerProcedeFiche, pour que "Procédé N" affiché reste
  // toujours la position réelle dans l'ordre de la séance.
  const deplacerProcedeFiche = (index, direction) => {
    setFiche(f => {
      const cible = index + direction
      if (cible < 0 || cible >= f.procedes.length) return f
      const procedes = [...f.procedes]
      ;[procedes[index], procedes[cible]] = [procedes[cible], procedes[index]]
      return { ...f, procedes: procedes.map((p, i) => ({ ...p, numero: i + 1 })) }
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
      categorie_age: ficheApercu?.categorie_age || '', type_seance: ficheApercu?.type_seance || 'collectif',
      nb_joueurs: fs.nb_joueurs || '', duree_totale: fs.duree_totale || '', objectif_general: fs.objectif_general || '',
      sport: fs.sport || 'football',
      mode_diplome: fs.mode_diplome || null, phase_jeu: fs.phase_jeu || '', principe_jeu: fs.principe_jeu || '',
      numero_seance: fs.numero_seance || '', heure_debut: fs.heure_debut || '',
      constats: fs.constats || '', justification_pedagogique: fs.justification_pedagogique || '', auto_evaluation: fs.auto_evaluation || '',
      analyse_equipe: fs.analyse_equipe || '', bilan_projection: fs.bilan_projection || '',
      procedes: (fs.procedes && fs.procedes.length ? fs.procedes : [{ numero: 1, titre: '', duree: '', nb_joueurs: '', but: '', organisation: '', consignes: '', criteres_realisation: '', variables: '' }])
        .map(p => ({ criteres_realisation: '', ...p })),
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
      procedes: [...f.procedes, { numero: f.procedes.length + 1, titre: '', duree: '', nb_joueurs: '', but: '', organisation: '', consignes: '', criteres_realisation: '', variables: '' }],
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
      categorie_age: ficheApercuEdit.categorie_age || null,
      type_seance: ficheApercuEdit.type_seance || 'collectif',
      fiche_seance: ficheApercuEdit,
      // Le PDF déjà archivé (fichier_url) correspond au contenu d'AVANT cette
      // modification — signalé : un joueur qui télécharge/imprime depuis ce
      // lien voyait toujours l'ancien texte, la modification n'y apparaissait
      // jamais. Effacé ici, régénéré automatiquement juste en dessous une fois
      // l'aperçu en lecture seule réaffiché (cf. regenererApercuApresEdit) —
      // au moment précis de ce save, .fiche-render montre encore le formulaire
      // d'édition, pas le rendu imprimable propre, donc pas capturable ici.
      fichier_url: null,
    }
    const { error } = await avecRetrySession(() => supabase.from('seances_uploadees').update(payload).eq('id', ficheApercu.id))
    setSavingFicheApercu(false)
    if (error) { alert('Erreur lors de la sauvegarde : ' + error.message); return }
    const updated = { ...ficheApercu, ...payload }
    setFicheApercu(updated)
    setMesSeancesOuvertes(prev => prev.map(s => (s.id === updated.id ? updated : s)))
    setModeEditionApercu(false)
    setFicheApercuEdit(null)
    setRegenererApercuApresEdit(true)
  }

  // ── Bibliothèque de procédés ──────────────────────────────────────────────────
  // 3 niveaux de visibilité (cf. supabase_bibliotheque_visibilite.sql) : un
  // procédé vit dans EXACTEMENT une rubrique selon sa visibilité, pas de vue
  // "mixte" — même modèle que la bibliothèque vidéo (perso/df).
  // Bibliothèque allégée : schema_png (schéma tactique stocké en PNG haute
  // définition, plusieurs centaines de Ko) et schema_data (données d'édition)
  // ne sont PAS chargés avec la liste — c'est ce qui la rendait si lente.
  // Les miniatures arrivent ensuite en arrière-plan (chargerMiniaturesBiblio),
  // et le schéma complet d'un procédé est récupéré à la demande
  // (procedeComplet) avant toute action qui en a besoin. Les colonnes sont
  // lues depuis la base (1 ligne, une fois par session) plutôt qu'écrites en
  // dur : la table a des colonnes absentes des scripts SQL (ex. organisation),
  // une liste figée en aurait perdu. En cas d'échec : liste complète, comme avant.
  const colonnesBiblioRef = useRef(null)
  const requeteBiblioRef = useRef(0)
  const colonnesBiblioLegeres = async () => {
    if (colonnesBiblioRef.current) return colonnesBiblioRef.current
    const { data, error } = await supabase.from('bibliotheque_exercices').select('*').limit(1)
    if (error || !data?.length) return null
    colonnesBiblioRef.current = Object.keys(data[0]).filter(k => k !== 'schema_png' && k !== 'schema_data')
    return colonnesBiblioRef.current
  }

  const chargerMiniaturesBiblio = async (procedes, requete) => {
    const ids = procedes.map(p => p.id)
    for (let i = 0; i < ids.length; i += 24) {
      const { data, error } = await supabase.from('bibliotheque_exercices').select('id, schema_png').in('id', ids.slice(i, i + 24))
      if (requete !== requeteBiblioRef.current) return // rubrique changée entre-temps
      if (error) return
      const parId = Object.fromEntries((data || []).map(r => [r.id, r.schema_png]))
      setBiblio(prev => prev.map(p => (p.id in parId && !('schema_data' in p) ? { ...p, schema_png: parId[p.id] } : p)))
    }
  }

  // Procédé avec son schéma complet (png + données d'édition) — indispensable
  // avant copie, modification ou import, sinon le schéma serait perdu.
  // null si la récupération échoue (l'action est alors annulée, jamais faite
  // avec un procédé incomplet).
  const procedeComplet = async (p) => {
    if (!p || 'schema_data' in p) return p
    const { data, error } = await supabase.from('bibliotheque_exercices').select('schema_png, schema_data').eq('id', p.id).maybeSingle()
    if (error || !data) { alert('Impossible de récupérer le schéma de ce procédé. Vérifie ta connexion puis réessaie.'); return null }
    const complet = { ...p, schema_png: data.schema_png, schema_data: data.schema_data }
    setBiblio(prev => prev.map(x => (x.id === p.id ? { ...x, schema_png: data.schema_png, schema_data: data.schema_data } : x)))
    return complet
  }

  const ouvrirApercuProcede = (p) => {
    setProcedeActif(p)
    if (!('schema_data' in p)) procedeComplet(p).then(c => { if (c) setProcedeActif(cur => (cur?.id === c.id ? c : cur)) })
  }

  const chargerBiblio = async (uid, rubrique = 'personal') => {
    setBiblioLoading(true)
    const requete = ++requeteBiblioRef.current
    if (rubrique === 'club' && !clubAffiliation?.club_id) { setBiblio([]); setBiblioLoading(false); return }
    // Un procédé peut être partagé en club ET/OU en platform en plus de rester
    // dans "Ma bibliothèque" (pas de rubrique exclusive) — "Ma bibliothèque"
    // montre donc tout ce que ce coach a créé, peu importe ses partages.
    // Paginé : la bibliothèque partagée de toute la plateforme dépasse 1000 procédés.
    const colonnes = await colonnesBiblioLegeres()
    const lire = (base) => fetchToutesLignes(() => {
      let query = supabase.from('bibliotheque_exercices').select(rubrique === 'personal' ? base : `${base}, educateur:profiles_public!bibliotheque_exercices_educateur_id_fkey(prenom, nom)`)
      if (rubrique === 'club') query = query.eq('club_id', clubAffiliation.club_id).eq('partage_club', true)
      else if (rubrique === 'platform') query = query.eq('partage_platform', true)
      else query = query.eq('educateur_id', uid)
      return query.order('type').order('nom').order('id')
    })
    let { data, error } = colonnes ? await lire(colonnes.join(',')) : { data: null, error: true }
    const allegee = !!colonnes && !error
    if (!allegee) ({ data } = await lire('*'))
    if (requete !== requeteBiblioRef.current) return
    let procedes = data || []
    // Diplôme/catégorie de l'auteur (profil_educateur, pas profiles) — affichés
    // sur les cartes des bibliothèques partagées uniquement, un 2e aller-retour
    // groupé plutôt qu'un embed PostgREST imbriqué (même pattern que
    // DashboardClub.jsx pour le téléphone des éducateurs affiliés).
    if (rubrique !== 'personal' && procedes.length) {
      const idsAuteurs = [...new Set(procedes.filter(p => p.educateur_id !== uid).map(p => p.educateur_id))]
      if (idsAuteurs.length) {
        const { data: profils } = await supabase.from('profil_educateur').select('user_id, diplome, categorie').in('user_id', idsAuteurs)
        const profilParId = Object.fromEntries((profils || []).map(pe => [pe.user_id, pe]))
        procedes = procedes.map(p => p.educateur ? { ...p, educateur: { ...p.educateur, diplome: profilParId[p.educateur_id]?.diplome, categorie: profilParId[p.educateur_id]?.categorie } } : p)
      }
    }
    setBiblio(procedes)
    setBiblioLoading(false)
    if (allegee && procedes.length) chargerMiniaturesBiblio(procedes, requete)
  }

  // Signalé : "Importer un procédé" (depuis un bloc de Création entraînement,
  // modalBiblioImport) affichait "Aucun procédé" dans toutes les catégories,
  // sur toutes les plateformes — pas un souci mobile, biblio n'était chargée
  // que via l'onglet Bibliothèque ; un éducateur arrivant directement sur
  // Création entraînement sans jamais être passé par cet onglet dans la
  // session voyait donc toujours une bibliothèque vide depuis cette modale.
  useEffect(() => {
    if ((activeSection !== 'bibliotheque' && modalBiblioImport === null) || biblioRubrique === 'videos' || !userId) return
    chargerBiblio(userId, biblioRubrique)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, biblioRubrique, modalBiblioImport])

  // Chargeurs des autres onglets spécifiques (jamais utilisés sur l'Accueil,
  // cf. init()) — même pattern que ci-dessus, à la demande plutôt qu'au
  // chargement initial du dashboard.
  useEffect(() => { if (activeSection === 'mes_seances' && userId) chargerMesSeances(userId) }, [activeSection, userId])
  useEffect(() => {
    if (activeSection !== 'matchs' || !['resultats', 'calendrier', 'causerie'].includes(competitionSubTab) || logosClubs) return
    fetchToutesLignes(() => supabase.from('profiles_public').select('id, club, avatar_url').eq('plan', 'club').not('avatar_url', 'is', null).order('id'))
      .then(({ data }) => {
        const carte = {}
        ;(data || []).forEach(c => { const k = normaliserNomClub(c.club); if (k && !carte[k]) carte[k] = c.avatar_url })
        setLogosClubs(carte)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, competitionSubTab])
  useEffect(() => { if (activeSection === 'explorer' && userId) chargerDirigeants(userId) }, [activeSection, userId])
  useEffect(() => { if (['equipe', 'notes'].includes(activeSection) && userId) chargerEvaluationsJoueurs(userId) }, [activeSection, userId])
  useEffect(() => {
    if (activeSection !== 'stats' || !userId || matchs.length === 0) return
    chargerNotationsMatch(userId, matchs.map(m => m.id))
  }, [activeSection, matchs, userId])

  const sauvegarderProcede = async () => {
    if (!procedeForm.nom.trim()) return
    const payload = {
      ...procedeForm,
      educateur_id: userId,
      duree: procedeForm.duree ? parseInt(procedeForm.duree) : null,
      club_id: clubAffiliation?.club_id || null,
    }
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
    try {
      if (idEnEdition) {
        ;({ error } = await avecRetrySession(() => supabase.from('bibliotheque_exercices').update(payload).eq('id', idEnEdition.id)))
      } else {
        ;({ error } = await avecRetrySession(() => supabase.from('bibliotheque_exercices').insert(payload)))
      }
    } catch (e) {
      // Coupure réseau, refreshSession qui échoue... : avecRetrySession peut
      // rejeter au lieu de renvoyer { error }. Sans ce catch, la saisie
      // disparaissait silencieusement (modale déjà fermée en optimiste
      // ci-dessus) sans alerte ni trace nulle part.
      error = e
    }
    setSavingProcede(false)
    if (error) {
      try { localStorage.setItem(PROCEDE_BROUILLON_KEY, JSON.stringify({ form: formSnapshot, idEnEdition, savedAt: Date.now() })) } catch { /* ignore */ }
      setProcedeBrouillon({ form: formSnapshot, idEnEdition, savedAt: Date.now() })
      alert(`Erreur : ${error.message || 'connexion impossible'}\n\nTon procédé a été conservé en brouillon sur cet appareil (visible en haut de la bibliothèque) — tu pourras le ré-enregistrer dès que possible.`)
      setProcedeForm(formSnapshot)
      setProcedeEnEdition(idEnEdition)
      setModalProcede(true)
      return
    }
    try { localStorage.removeItem(PROCEDE_BROUILLON_KEY) } catch { /* ignore */ }
    setProcedeBrouillon(null)
    await chargerBiblio(userId, biblioRubrique === 'videos' ? 'personal' : biblioRubrique)
  }

  const restaurerProcedeBrouillon = () => {
    if (!procedeBrouillon) return
    setProcedeForm(procedeBrouillon.form)
    setProcedeEnEdition(procedeBrouillon.idEnEdition ? { id: procedeBrouillon.idEnEdition } : null)
    setModalProcede(true)
  }

  const ignorerProcedeBrouillon = () => {
    try { localStorage.removeItem(PROCEDE_BROUILLON_KEY) } catch { /* ignore */ }
    setProcedeBrouillon(null)
  }

  const supprimerProcede = async (id) => {
    if (!confirm(t('biblio_confirmer_suppr', lang))) return
    await supabase.from('bibliotheque_exercices').delete().eq('id', id)
    setBiblio(prev => prev.filter(p => p.id !== id))
  }

  // Clone un procédé partagé (club/platform) dans sa propre bibliothèque
  // personnelle — la propriété ne se transfère jamais, copier est le seul
  // moyen de se l'approprier pour le modifier ensuite.
  const copierProcede = async (procede) => {
    const p = await procedeComplet(procede)
    if (!p) return
    const rest = { ...p }
    delete rest.id
    delete rest.created_at
    delete rest.updated_at
    delete rest.educateur
    delete rest.club_id
    delete rest.partage_club
    delete rest.partage_platform
    const { error } = await avecRetrySession(() => supabase.from('bibliotheque_exercices').insert({ ...rest, educateur_id: userId, club_id: clubAffiliation?.club_id || null, partage_club: false, partage_platform: false }))
    if (error) { alert('Erreur : ' + error.message); return }
    alert('Copié dans ta bibliothèque personnelle.')
  }

  const ouvrirEditionProcede = async (procedeListe) => {
    const procede = await procedeComplet(procedeListe)
    if (!procede) return
    // procede peut venir d'une bibliothèque partagée (club/platform), chargée
    // avec le join `educateur:educateur_id(...)` — ce champ imbriqué n'est pas
    // une colonne de bibliotheque_exercices et ferait échouer l'update/insert
    // ("Could not find the 'educateur' column...") s'il restait dans le form.
    const { educateur: _educateur, ...rest } = procede
    setProcedeEnEdition(procede)
    setProcedeForm({ ...rest, duree: procede.duree?.toString() || '' })
    setModalProcede(true)
  }

  // Sauvegarde rapide d'un procédé de la fiche en cours de rédaction vers la
  // bibliothèque, avec choix direct du niveau de visibilité (picker "Bibliothèque")
  // — plus besoin de repasser par le modal Créer/Éditer complet.
  // Sauvegarde enrichie d'un procédé de la fiche en cours de rédaction vers la
  // bibliothèque — remplace l'ancien picker "personal/club/platform" par une
  // modale qui collecte nom/thème/principe/catégorie d'âge, avec le partage
  // club toujours actif et le partage plateforme en opt-out (coché par défaut).
  const sauvegarderProcedeBibliotheque = async () => {
    const p = showVisibilityPicker
    if (!p || !metaProc.nom.trim() || !metaProc.theme || !metaProc.categorie_age?.length) return
    const payload = {
      type: metaProc.type,
      nom: metaProc.nom.trim(),
      theme: metaProc.theme,
      principe_jeu: metaProc.principe || null,
      categorie_age: metaProc.categorie_age,
      but: p.but || '',
      description: p.organisation || '',
      consignes: p.consignes || '',
      variables: p.variables || '',
      criteres_realisation: p.criteres_realisation || '',
      duree: p.duree ? parseInt(p.duree) : null,
      nb_joueurs: p.nb_joueurs || '',
      tags: '',
      schema_png: p.schema_png || '',
      schema_data: p.schema_data || null,
      educateur_id: userId,
      club_id: clubAffiliation?.club_id || null,
      partage_club: true,
      partage_platform: metaProc.partage_platform,
    }
    setShowVisibilityPicker(null)
    const { error } = await avecRetrySession(() => supabase.from('bibliotheque_exercices').insert(payload))
    if (error) { alert('Erreur : ' + error.message); return }
    setMetaProc(METAPROC_VIDE)
    afficherToast('Ajouté à la bibliothèque')
  }

  // Injecte un procédé de la bibliothèque dans un bloc procédé de la fiche en cours de rédaction
  // (n'écrase que les champs vides du bloc cible, en un seul setFiche pour éviter les updates perdus)
  const importerProcedeDansBloc = async (index, procede) => {
    const p = await procedeComplet(procede)
    if (!p) return
    setFiche(prev => {
      const current = prev.procedes[index]
      const merged = {
        ...current,
        titre: current.titre || p.nom || current.titre,
        but: current.but || p.theme || current.but,
        organisation: current.organisation || p.description || current.organisation,
        consignes: current.consignes || p.consignes || current.consignes,
        criteres_realisation: current.criteres_realisation || p.criteres_realisation || current.criteres_realisation,
        variables: current.variables || p.variables || current.variables,
        duree: current.duree || (p.duree ? String(p.duree) : current.duree),
        nb_joueurs: current.nb_joueurs || p.nb_joueurs || current.nb_joueurs,
        schema_png: current.schema_png || p.schema_png || current.schema_png,
        schema_data: current.schema_data || p.schema_data || current.schema_data,
        // Gabarit BEF/DEF (fiche.mode_diplome) : ses blocs affichent leurs
        // propres champs (but_bef, consignes_bef, variantes_bef, surface) et
        // non but/consignes/variables/organisation — sans ces lignes, un
        // procédé importé dans une fiche BEF semblait ne rien importer.
        but_bef: current.but_bef || p.but || p.theme || '',
        consignes_bef: current.consignes_bef || p.consignes || '',
        variantes_bef: current.variantes_bef || p.variables || '',
        surface: current.surface || p.description || '',
        objectif: current.objectif || p.objectif || '',
      }
      const newProcedes = [...prev.procedes]
      newProcedes[index] = merged
      return { ...prev, procedes: newProcedes }
    })
    setModalBiblioImport(null)
  }

  // Démarre une nouvelle fiche séance avec ce procédé de bibliothèque déjà
  // importé dans le premier bloc — depuis la carte/l'aperçu, sans passer par
  // une fiche existante (contrairement à importerProcedeDansBloc ci-dessus).
  const procedeVersBlocFiche = (p, numero) => ({
    ...ficheVide.procedes[0],
    numero,
    titre: p.nom || '',
    but: p.but || p.theme || '',
    organisation: p.description || '',
    consignes: p.consignes || '',
    criteres_realisation: p.criteres_realisation || '',
    variables: p.variables || '',
    duree: p.duree ? String(p.duree) : '',
    nb_joueurs: p.nb_joueurs || '',
    schema_png: p.schema_png || '',
    schema_data: p.schema_data || null,
    // Mêmes champs côté gabarit BEF, si la fiche bascule ensuite en mode BEF.
    but_bef: p.but || p.theme || '',
    consignes_bef: p.consignes || '',
    variantes_bef: p.variables || '',
    surface: p.description || '',
    objectif: p.objectif || '',
  })

  const demarrerFicheDepuisProcedes = async (procedesListe) => {
    const procedes = await Promise.all(procedesListe.map(procedeComplet))
    if (procedes.some(p => !p)) return
    setFiche({ ...ficheVide, theme: procedes[0]?.theme || '', procedes: procedes.map((p, i) => procedeVersBlocFiche(p, i + 1)) })
    setSport('football')
    setFicheFichierUrl(null)
    setFicheExtraite(false)
    setModeSeance('rediger')
    setActiveSection('mes_seances')
    setProcedeActif(null)
    setBiblioSelectionMode(false)
    setBiblioSelection([])
  }

  const importerProcedeVersNouvelleSeance = async (p) => {
    await demarrerFicheDepuisProcedes([p])
    afficherToast(t('biblio_importe_vers_seance', lang))
  }

  const basculerSelectionBiblio = (p) => {
    setBiblioSelection(sel => sel.some(x => x.id === p.id) ? sel.filter(x => x.id !== p.id) : [...sel, p])
  }

  const importerSelectionVersNouvelleSeance = async () => {
    if (biblioSelection.length === 0) return
    await demarrerFicheDepuisProcedes(biblioSelection)
    afficherToast(t('biblio_selection_importee', lang))
  }

  // Capture #fiche-print (déjà stylé pour l'impression, cf. index.css) en PDF via html2canvas + jsPDF
  // Capture un conteneur imprimable en PDF. S'il contient des .bef-page ou
  // .fiche-page (pagination par 2 procédés — gabarit BEF via FicheBEFContenu,
  // ou rendu générique via FicheContenu), chaque page est capturée séparément
  // et posée sur SA PROPRE page PDF, pour ne jamais rétrécir le contenu ni
  // couper un procédé entre deux pages en écrasant tout sur une seule capture
  // mécanique (ce qui arrivait avant pour le rendu générique : tous les
  // procédés compressés sur une unique image géante, découpée par hauteur de
  // page sans égard aux blocs procédé). Sans page repérable (cas résiduel,
  // fiche sans aucun procédé), on retombe sur une capture unique de tout l'élément.
  const genererPdfDepuisElement = async (el, orientation) => {
    const html2canvas = (await import('html2canvas')).default
    const { jsPDF } = await import('jspdf')
    const pdf = new jsPDF({ orientation, unit: 'pt', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    const capturerEtAjouter = async (target, premierePage) => {
      const canvas = await html2canvas(target, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
      const imgWidth = pageWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      const imgData = canvas.toDataURL('image/png')
      let heightLeft = imgHeight
      let position = 0
      if (!premierePage) pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
      while (heightLeft > 0) {
        position -= pageHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }
    }

    const pageEls = el.querySelectorAll('.bef-page, .bmf-page, .fiche-page')
    if (pageEls.length > 0) {
      for (let i = 0; i < pageEls.length; i++) await capturerEtAjouter(pageEls[i], i === 0)
    } else {
      await capturerEtAjouter(el, true)
    }
    return pdf.output('blob')
  }

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
      // Paysage pour les gabarits officiels BEF/BMF (larges, cf. .bef-doc /
      // .bmf-doc), portrait pour le rendu générique (FicheContenu, plus étroit).
      return await genererPdfDepuisElement(el, orientationFiche(fiche.mode_diplome))
    } finally {
      el.style.display = prevDisplay
      el.style.position = prevPosition
      el.style.left = prevLeft
    }
  }

  // Partage d'une fiche déjà archivée (fichier_url = PDF public sur le storage) :
  // API Web Share natif quand disponible (menu de partage du téléphone, WhatsApp
  // inclus automatiquement parmi les apps installées) — sur desktop/navigateurs
  // sans support, repli sur un lien wa.me pré-rempli (uniquement le lien, pas le
  // fichier lui-même : wa.me ne sait pas joindre une pièce jointe).
  const partagerFiche = async (url, titre) => {
    if (navigator.share) {
      try {
        await navigator.share({ title: titre || 'Fiche séance', url })
        return
      } catch (e) {
        if (e.name === 'AbortError') return
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${titre ? titre + ' — ' : ''}${url}`)}`, '_blank')
  }

  // Génère un PDF depuis le rendu .fiche-render actuellement affiché dans le
  // modal d'aperçu (même styling imprimable que #fiche-print, cf. index.css),
  // l'archive au storage et met à jour fichier_url (DB + state local). Factorisé
  // de genererEtPartagerFicheApercu pour être réutilisé par la régénération
  // automatique après une édition (cf. l'effet sur regenererApercuApresEdit) —
  // seule la suite (partager ou non) diffère entre les deux appelants.
  const regenererPdfApercu = async () => {
    const el = document.querySelector('.fiche-render')
    if (!el) throw new Error('Rendu de la fiche introuvable')
    // .fiche-render est entouré d'un wrapper .fiche-apercu-scale-wrap qui le
    // réduit à l'échelle pour l'affichage (cf. ApercuFicheResponsive) — ne
    // doit jamais être actif pendant une capture, sinon html2canvas
    // capturerait la version réduite au lieu du document plein format.
    // Neutralisé ici, restauré juste après (même principe que genererPdfFiche
    // pour #fiche-print un peu plus haut) : l'export ne doit jamais changer
    // de comportement, qu'on l'ait regardé en petit ou en grand avant.
    const wrapperEchelle = el.closest('.fiche-apercu-scale-wrap')
    const transformAvant = wrapperEchelle?.style.transform
    if (wrapperEchelle) {
      wrapperEchelle.style.transform = 'none'
      await new Promise(r => requestAnimationFrame(r))
    }
    let blob
    try {
      blob = await genererPdfDepuisElement(el, orientationFiche(ficheApercu.fiche_seance?.mode_diplome))
    } finally {
      if (wrapperEchelle) wrapperEchelle.style.transform = transformAvant || ''
    }
    const path = `fiches/${userId}/${Date.now()}.pdf`
    const { error: uploadError } = await supabase.storage.from('documents').upload(path, blob, { contentType: 'application/pdf', upsert: true })
    if (uploadError) throw uploadError
    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
    await supabase.from('seances_uploadees').update({ fichier_url: publicUrl }).eq('id', ficheApercu.id)
    setFicheApercu(prev => (prev ? { ...prev, fichier_url: publicUrl } : prev))
    setMesSeancesOuvertes(prev => prev.map(s => s.id === ficheApercu.id ? { ...s, fichier_url: publicUrl } : s))
    return publicUrl
  }

  // Une fiche importée/saisie manuellement (uploaderMaSeance) n'a de fichier_url
  // que si un fichier a été explicitement uploadé — sinon rien à partager.
  const genererEtPartagerFicheApercu = async () => {
    if (!ficheApercu) return
    setGenerantPartage(true)
    try {
      const publicUrl = await regenererPdfApercu()
      await partagerFiche(publicUrl, ficheApercu.theme)
    } catch (e) {
      console.error('Erreur génération PDF pour partage:', e)
      alert('Impossible de générer le PDF pour le moment.')
    } finally {
      setGenerantPartage(false)
    }
  }

  // Régénération automatique du PDF archivé juste après une édition de fiche
  // déjà enregistrée (sauvegarderFicheApercuEdit met fichier_url à null et
  // arme ce déclencheur) — sans ce délai d'un effet, .fiche-render afficherait
  // encore le formulaire d'édition au lieu du rendu imprimable propre : il
  // faut attendre que modeEditionApercu soit passé à false et que l'aperçu en
  // lecture seule ait eu le temps de se (ré)afficher avant de le capturer.
  useEffect(() => {
    if (!regenererApercuApresEdit) return
    setGenerantPartage(true)
    regenererPdfApercu()
      .catch(e => console.error('Erreur régénération PDF après édition:', e))
      .finally(() => { setGenerantPartage(false); setRegenererApercuApresEdit(false) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regenererApercuApresEdit])

  const sauvegarderFiche = async () => {
    setSavingFiche(true)
    const { data: inserted, error } = await avecRetrySession(() => supabase.from('seances_uploadees').insert({
      educateur_id: userId,
      theme: fiche.theme || null,
      date_seance: fiche.date || null,
      categorie_tactique: fiche.categorie_tactique || null,
      categorie_age: fiche.categorie_age || null,
      type_seance: fiche.type_seance || 'collectif',
      saison: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      fiche_seance: { ...fiche, sport },
      fichier_url: ficheFichierUrl || null,
      origine: 'ouvert',
      statut: 'archivee',
    }).select().single())
    if (error) {
      setSavingFiche(false)
      console.error('Erreur insertion fiche:', error)
      alert('Erreur lors de l\'enregistrement : ' + error.message + '\n\nPas de panique, ton brouillon reste rempli à l\'écran — réessaie dans quelques secondes.')
      return
    }
    try { if (userId) localStorage.removeItem(`df_fiche_brouillon_${userId}`) } catch { /* navigation privée : tant pis */ }

    // Optimistic : l'insert principal ci-dessus est confirmé, donc on referme
    // côté UI tout de suite. La liaison à l'entraînement et la génération du
    // PDF ne dépendent pas l'une de l'autre (juste de l'id fraîchement créé)
    // — elles tournent en parallèle plutôt qu'en séquence, en arrière-plan.
    setSavingFiche(false)
    setFicheFichierUrl(null)
    setFicheExtraite(false)
    // Seule confirmation visible pour l'éducateur que l'enregistrement a
    // réussi — sans ça, le bouton reprend son libellé initial sans rien
    // indiquer de plus, ce qui poussait à cliquer plusieurs fois par doute
    // (créant autant de séances dupliquées dans "Mes séances").
    afficherToast('Séance enregistrée')

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
      // Prompt construit côté serveur (api/_promptsIA.js, modèle et
      // paramètres inchangés) : la clé Groq ne quitte plus le serveur.
      const data = await enqueueIARequest('seance_ia', {
        objectif: generationIAForm.objectif,
        duree: generationIAForm.duree,
        nb_joueurs: generationIAForm.nb_joueurs,
        categorie_age: generationIAForm.categorie_age,
        niveau: generationIAForm.niveau,
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

  // Recharge une image distante (logo club, Cloudinary — cf. profiles.avatar_url
  // via clubAffiliation.club) en data URL PNG, pour pouvoir l'injecter dans un
  // PDF jsPDF (addImage n'accepte pas une URL distante directement). Résout à
  // null en cas d'échec (pas de logo, CORS...) plutôt que de faire échouer
  // toute la génération de la fiche.
  const chargerLogoBase64 = (url) => new Promise(resolve => {
    if (!url) { resolve(null); return }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        canvas.getContext('2d').drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })

  // Fiche séance VIERGE imprimable (à remplir à la main, puis rescanner) — un
  // des 4 formats gérés par fiche.mode_diplome (null = Libre, 'BMF', 'BEF',
  // 'DEF'), mêmes champs que le formulaire "Rédiger" (~ligne 8611 et
  // suivantes). Étiquette [DF-...] imprimée en haut à droite de chaque page :
  // du texte simple lisible par l'IA de scan, pas un QR code — un QR/
  // code-barres image n'est pas fiable à décoder pour un modèle de vision,
  // alors qu'un texte imprimé est lu directement par l'OCR déjà utilisé pour
  // analyserFicheScan.
  const genererFicheVierge = async (modeDiplome) => {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const W = 210
    const HMAX = 282
    const margin = 12
    const NOIR = [30, 30, 30]
    const GRIS = [120, 120, 120]
    const GRIS_LIGNE = [195, 195, 195]
    const VERT = [74, 222, 128]
    const tag = `DF-${modeDiplome || 'LIBRE'}`
    const nomClub = clubAffiliation?.club?.club || ''
    const logoData = await chargerLogoBase64(clubAffiliation?.club?.avatar_url || null)

    let y = 0
    const enTete = () => {
      doc.setFillColor(20, 20, 20)
      doc.rect(margin, 10, W - margin * 2, 16, 'F')

      // Logo club — ou carré pointillé "Logo club" tant qu'il n'a pas encore
      // été uploadé (pas d'erreur, juste une incitation discrète).
      const logoX = margin + 3, logoY = 11.5, logoTaille = 13
      if (logoData) {
        try { doc.addImage(logoData, 'PNG', logoX, logoY, logoTaille, logoTaille) } catch { /* image illisible par jsPDF, ignorée */ }
      } else {
        doc.setDrawColor(110, 110, 110)
        doc.setLineWidth(0.3)
        doc.setLineDashPattern([1, 1], 0)
        doc.rect(logoX, logoY, logoTaille, logoTaille, 'S')
        doc.setLineDashPattern([], 0)
        doc.setFontSize(5.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(150, 150, 150)
        doc.text('Logo', logoX + logoTaille / 2, logoY + logoTaille / 2 - 1, { align: 'center' })
        doc.text('club', logoX + logoTaille / 2, logoY + logoTaille / 2 + 3, { align: 'center' })
      }

      const xTexte = logoX + logoTaille + 5
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text('DigitalFootball.academy', xTexte, 16.5)
      doc.setFontSize(12)
      doc.text('FICHE SÉANCE', xTexte, 23)

      if (nomClub) {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(220, 220, 220)
        doc.text(nomClub, W - margin - 38, 19.5, { align: 'right' })
      }

      doc.setFillColor(...VERT)
      doc.roundedRect(W - margin - 34, 13, 30, 10, 1.5, 1.5, 'F')
      doc.setFontSize(9)
      doc.setTextColor(0, 0, 0)
      doc.text(`[${tag}]`, W - margin - 19, 19.5, { align: 'center' })
      return 32
    }

    const nouvellePage = () => { doc.addPage(); y = enTete() }
    const assurerPlace = (h) => { if (y + h > HMAX) nouvellePage() }

    const champCourt = (label, x, xY, w) => {
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...GRIS)
      doc.text(label.toUpperCase(), x, xY)
      doc.setDrawColor(...GRIS_LIGNE)
      doc.setLineWidth(0.3)
      doc.line(x, xY + 6, x + w, xY + 6)
    }

    const zoneEcriture = (label, x, yDep, w, nbLignes = 2) => {
      let yy = yDep
      if (label) {
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...GRIS)
        doc.text(label.toUpperCase(), x, yy)
        yy += 4
      }
      for (let i = 0; i < nbLignes; i++) {
        yy += 6
        doc.setDrawColor(...GRIS_LIGNE)
        doc.setLineWidth(0.25)
        doc.line(x, yy, x + w, yy)
      }
      return yy + 3
    }

    const titreSection = (texte, yDep, extra = '') => {
      doc.setFillColor(230, 230, 230)
      doc.rect(margin, yDep, W - margin * 2, 7, 'F')
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...NOIR)
      doc.text(texte, margin + 3, yDep + 5)
      if (extra) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(...GRIS)
        doc.text(extra, W - margin - 3, yDep + 5, { align: 'right' })
      }
      return yDep + 10
    }

    y = enTete()

    // ── Bandeau Éducateur / Catégorie / Nb joueurs ──────────────
    const colW3 = (W - margin * 2 - 8) / 3
    champCourt('Éducateur', margin, y, colW3)
    champCourt('Catégorie', margin + colW3 + 4, y, colW3)
    champCourt('Nb joueurs', margin + (colW3 + 4) * 2, y, colW3)
    y += 12

    const colW2 = (W - margin * 2 - 6) / 2
    champCourt('Thème', margin, y, colW2)
    champCourt('Date', margin + colW2 + 6, y, colW2 * 0.45)
    champCourt('Durée totale', margin + colW2 + 6 + colW2 * 0.45 + 4, y, colW2 * 0.55 - 4)
    y += 14

    // ── Champs spécifiques au mode diplôme (mêmes noms que le formulaire
    // "Rédiger" : numero_seance/heure_debut, phase_jeu/principe_jeu/
    // objectif_general, constats/justification_pedagogique/auto_evaluation,
    // analyse_equipe/bilan_projection) ─────────────────────────
    if (modeDiplome === 'BEF') {
      assurerPlace(14)
      champCourt('Séance N°', margin, y, 40)
      champCourt('Heure de début', margin + 50, y, 50)
      y += 14
    }

    if (modeDiplome) {
      assurerPlace(14)
      champCourt('Phase de jeu', margin, y, colW2)
      champCourt('Principe de jeu', margin + colW2 + 6, y, colW2)
      y += 14
      assurerPlace(24)
      y = zoneEcriture('Objectif de séance', margin, y, W - margin * 2, 2)
    } else {
      assurerPlace(24)
      y = zoneEcriture('Objectif général', margin, y, W - margin * 2, 2)
    }

    if (modeDiplome === 'BEF' || modeDiplome === 'DEF') {
      assurerPlace(24); y = zoneEcriture('Constats (observation des joueurs)', margin, y, W - margin * 2, 2)
      assurerPlace(24); y = zoneEcriture('Justification pédagogique', margin, y, W - margin * 2, 2)
      assurerPlace(24); y = zoneEcriture('Auto-évaluation (post-séance)', margin, y, W - margin * 2, 2)
    }
    if (modeDiplome === 'DEF') {
      assurerPlace(24); y = zoneEcriture("Analyse de l'équipe / Contexte", margin, y, W - margin * 2, 2)
      assurerPlace(24); y = zoneEcriture('Bilan et projection', margin, y, W - margin * 2, 2)
    }

    // ── Échauffement ─────────────────────────────────────────────
    assurerPlace(30)
    y = titreSection('ÉCHAUFFEMENT', y, 'Durée : _______ min')
    y = zoneEcriture('', margin, y, W - margin * 2, 2)

    // ── Procédés ─────────────────────────────────────────────────
    // BEF : gabarit officiel dense (17 champs par procédé, cf. formulaire
    // "Rédiger" ~ligne 8766) — un procédé par page pour rester lisible.
    // Libre/BMF/DEF : bloc simple (but/organisation/consignes/variables),
    // les 3 tiennent sur la page courante grâce aux sauts de page auto.
    for (let i = 1; i <= 3; i++) {
      if (modeDiplome === 'BEF') {
        nouvellePage()
        y = titreSection(`PROCÉDÉ ${i}`, y, 'Durée : _____ min · Nb joueurs : _____')
        const colBW = (W - margin * 2 - 6) / 2
        const xG = margin, xD = margin + colBW + 6
        let yG = y, yD = y
        yG = zoneEcriture('Tps travail / Tps récup / Nb séries / Nb répét / RPE', xG, yG, colBW, 1)
        yG = zoneEcriture('Pédagogie', xG, yG, colBW, 2)
        yG = zoneEcriture('Surface (zone de terrain, aménagements)', xG, yG, colBW, 2)
        yG = zoneEcriture('Comportements attendus', xG, yG, colBW, 2)
        yG = zoneEcriture('But', xG, yG, colBW, 2)
        yG = zoneEcriture('Systèmes de jeu (et postes)', xG, yG, colBW, 2)
        yD = zoneEcriture('Consignes (départ, déroulé)', xD, yD, colBW, 3)
        yD = zoneEcriture('Variantes', xD, yD, colBW, 2)
        yD = zoneEcriture('Critères de réalisation (comment faire)', xD, yD, colBW, 2)
        yD = zoneEcriture('Critères de réussite (2 max)', xD, yD, colBW, 2)
        yD = zoneEcriture('Dominantes-impacts athlétiques', xD, yD, colBW, 2)
        yD = zoneEcriture('Bilan (posture, engagement, remédiations)', xD, yD, colBW, 3)
        y = Math.max(yG, yD)
      } else {
        assurerPlace(50)
        y = titreSection(`PROCÉDÉ ${i}`, y, 'Durée : _____ min · Nb joueurs : _____')
        y = zoneEcriture('But', margin, y, W - margin * 2, 1)
        y = zoneEcriture('Organisation', margin, y, W - margin * 2, 1)
        y = zoneEcriture('Consignes', margin, y, W - margin * 2, 1)
        y = zoneEcriture('Variables / progressions', margin, y, W - margin * 2, 1)
      }
    }

    // ── Retour au calme ──────────────────────────────────────────
    assurerPlace(24)
    y = titreSection('RETOUR AU CALME', y, 'Durée : _______ min')
    y = zoneEcriture('', margin, y, W - margin * 2, 2)

    // ── Pied de page (chaque page) ───────────────────────────────
    const totalPages = doc.internal.getNumberOfPages()
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(150, 150, 150)
      doc.text('Document généré par Digital Football Academy — digitalfootball.academy', W / 2, 291, { align: 'center' })
    }

    doc.save(`fiche_vierge_${(modeDiplome || 'libre').toLowerCase()}.pdf`)
  }

  // Scanner IA : lit une photo de fiche papier (Gemini Vision, via l'Edge Function
  // scan-fiche-seance — prompt et clé API côté serveur) et pré-remplit "Rédiger"
  const analyserFicheScan = async () => {
    if (!scanImageFile || !scanImageBase64) return
    setScanningFiche(true)
    setScanFicheError(null)
    try {
      const { data, error } = await supabase.functions.invoke('scan-fiche-seance', {
        body: { imageBase64: scanImageBase64, mimeType: scanImageFile.type },
      })
      // Sur une réponse en erreur, le corps (message + code : ia_saturee,
      // lecture_impossible…) est dans error.context — relu pour afficher la
      // vraie cause au lieu d'un message "image floue" systématique.
      if (error || data?.error) {
        let detail = data
        try { if (error?.context?.json) detail = await error.context.json() } catch { /* corps illisible */ }
        throw Object.assign(new Error(detail?.error || error?.message || 'Erreur scan'), { code: detail?.code })
      }
      const extrait = data.fiche

      let url
      try {
        url = await uploaderFichierSeance(scanImageFile)
      } catch (e) {
        throw Object.assign(e, { code: 'upload_image' })
      }

      // format_detecte vient de l'étiquette [DF-XXX] imprimée sur les fiches
      // officielles (cf. genererFicheVierge) — absente/invalide sur une fiche
      // manuscrite libre, mode_diplome reste alors null comme avant.
      const modeDetecte = ['BMF', 'BEF', 'DEF'].includes(extrait.format_detecte) ? extrait.format_detecte : null

      setFiche({
        ...ficheVide,
        mode_diplome: modeDetecte,
        theme: extrait.theme || '',
        date: extrait.date || '',
        nb_joueurs: extrait.nb_joueurs != null ? String(extrait.nb_joueurs) : '',
        duree_totale: extrait.duree_totale != null ? String(extrait.duree_totale) : '',
        objectif_general: extrait.objectif_general || '',
        numero_seance: extrait.numero_seance || '',
        heure_debut: extrait.heure_debut || '',
        phase_jeu: extrait.phase_jeu || '',
        principe_jeu: extrait.principe_jeu || '',
        constats: extrait.constats || '',
        justification_pedagogique: extrait.justification_pedagogique || '',
        auto_evaluation: extrait.auto_evaluation || '',
        analyse_equipe: extrait.analyse_equipe || '',
        bilan_projection: extrait.bilan_projection || '',
        procedes: ficheVide.procedes.map((base, i) => {
          const p = extrait.procedes?.[i]
          if (!p) return base
          // Neutralise les null (champs non détectés) en '' pour rester cohérent
          // avec le reste des champs contrôlés du formulaire "Rédiger".
          const pNettoye = Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v == null ? '' : v]))
          return {
            ...base, ...pNettoye, numero: i + 1,
            duree: pNettoye.duree !== '' ? String(pNettoye.duree) : '',
            nb_joueurs: pNettoye.nb_joueurs !== '' ? String(pNettoye.nb_joueurs) : '',
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
      setScanFicheError(
        e?.code === 'ia_saturee'
          ? 'Le service d\'analyse est momentanément saturé. Réessaie dans quelques instants.'
          : e?.code === 'upload_image'
            ? 'La fiche a été lue mais l\'image n\'a pas pu être enregistrée. Vérifie ta connexion puis réessaie.'
            : e?.code === 'lecture_impossible'
              ? 'L\'IA n\'a pas pu lire la fiche. Assure-toi que l\'image est nette et bien éclairée.'
              : 'L\'analyse n\'a pas pu aboutir. Réessaie dans quelques instants.'
      )
    } finally {
      setScanningFiche(false)
      setScanFicheStatus(null)
    }
  }

  const [affiliationEnCours, setAffiliationEnCours] = useState(null) // {id, profiles} — modal de liaison
  const [joueurLieId, setJoueurLieId] = useState('')

  const gererAffiliation = async (id, statut, equipeJoueurId = null, joueurId = null) => {
    const update = { statut }
    if (equipeJoueurId) update.equipe_joueur_id = equipeJoueurId
    await supabase.from('affiliations').update(update).eq('id', id)
    // equipe_joueurs.joueur_id doit aussi être renseigné ici — sinon l'affiliation
    // est bien "accepte" mais le joueur reste invisible dans le roster réel
    // (Mon équipe, décompte du sondage de présence) qui se base sur equipe_joueurs,
    // pas sur affiliations. Bug constaté : joueur affilié recevant bien
    // stats/planning (lus via affiliations) mais absent du sondage et non
    // marqué "compte lié" (lus via equipe_joueurs.joueur_id resté null).
    if (equipeJoueurId && joueurId) {
      await supabase.from('equipe_joueurs').update({ joueur_id: joueurId }).eq('id', equipeJoueurId)
      await chargerJoueurs(userId, equipeActive?.id)
    }
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

  const handleCancelSubscription = async () => {
    if (!window.confirm("Résilier ton abonnement ? Tu garderas l'accès jusqu'à la fin de la période en cours, puis ton compte sera désactivé. Toutes tes données (équipes, joueurs, séances, stats...) sont conservées et seront intactes si tu réactives plus tard.")) return
    setCancelling(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur résiliation')
      setCancelDone(true)
    } catch (e) {
      alert('Erreur : ' + e.message)
    }
    setCancelling(false)
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
      const sig = await demanderSignatureUpload('image')
      const formData = new FormData()
      formData.append('file', file)
      ajouterChampsSignes(formData, sig)
      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloud_name}/image/upload`, { method: 'POST', body: formData })
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
      const { avatar_url: _avatar_url, ...champsProfilEducateur } = updated
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
    // automatiquement de l'équipe active du coach (equipeActive, switcher) :
    // plus besoin de le choisir à chaque joueur (cf. declarerMaCategorie).
    const { error } = await supabase.from('equipe_joueurs').insert({
      ...snapshot,
      date_naissance: snapshot.date_naissance || null,
      club_categorie_id: equipeActive?.id || null,
      categorie: snapshot.categorie || equipeActive?.nom || '',
      educateur_id: userId,
    })
    setSavingJoueur(false)
    if (error) {
      alert('Erreur : ' + error.message)
      setNewJoueur(snapshot)
      setShowAddJoueur(true)
      return
    }
    await chargerJoueurs(userId, equipeActive?.id)
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
      await chargerJoueurs(userId, equipeActive?.id)
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: colors.accent.green, background: colors.accent.green + alpha.subtle,
                         padding: '3px 9px', borderRadius: 6, fontWeight: 700 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors.accent.green }} /> Compte lié
          </span>
          {j.numero_licence && <span style={{ fontSize: 11, color: colors.accent.blue, background: colors.accent.blue + alpha.subtle, padding: '3px 9px', borderRadius: 6, fontWeight: 700 }}>Licencié</span>}
          {canEdit('effectif') && (
            <button onClick={() => reinitialiserAccesJoueur(j)}
              style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, background: 'transparent', border: `1px solid ${colors.border.default}`, color: colors.text.faint, borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
              title="Envoyer un email de réinitialisation de mot de passe">
              <IcoCle /> Accès
            </button>
          )}
        </div>
      ) : inviteStatus[j.id] === 'sent' || (j.email && !j.joueur_id) ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: colors.accent.amber, minWidth: 0 }}>
            <IcoMail /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Invitation envoyée · {j.email}</span>
          </div>
          {canEdit('effectif') && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => inviterJoueur(j)}
                disabled={invitingId === j.id}
                style={{ fontSize: 11, background: '#facc1510', border: '1px solid #facc1430', color: '#facc14', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>
                {invitingId === j.id ? '...' : 'Renvoyer'}
              </button>
              <button
                onClick={async () => {
                  await supabase.from('equipe_joueurs').update({ email: null }).eq('id', j.id)
                  setInviteStatus(prev => { const next = { ...prev }; delete next[j.id]; return next })
                  await chargerJoueurs(userId, equipeActive?.id)
                }}
                style={{ fontSize: 11, background: '#ef444410', border: '1px solid #ef444430', color: colors.accent.red, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>
                Corriger l'email
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
            {invitingId === j.id ? '...' : 'Inviter'}
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
    // avatar_url est enrichi côté client depuis profiles (cf. chargerJoueurs) —
    // equipe_joueurs n'a pas cette colonne, il ne doit jamais partir dans l'update.
    delete fields.avatar_url
    delete fields.photo_profil
    // Optimistic : on connaît déjà exactement les nouvelles valeurs, donc la
    // liste locale se met à jour et la modale se ferme tout de suite, sans
    // attendre la réponse Supabase (aucune vérification d'erreur n'existait
    // avant, on en ajoute a minima).
    const avant = joueurs.find(j => j.id === id)
    setJoueurs(prev => prev.map(j => (j.id === id ? { ...j, ...fields, avatar_url: ('photo_url' in fields ? fields.photo_url : j.photo_url) || j.photo_profil || null } : j)))
    // jours_actifs vit sur affiliations (pas equipe_joueurs) — une seule
    // ligne possible pour ce roster précis (equipe_joueur_id), retrouvée
    // dans l'état affiliations déjà chargé pour cet éducateur.
    const affiliationCourante = affiliations.find(a => a.equipe_joueur_id === id)
    setSavingEdit(true)
    setJoueurEnEdition(null)
    const [{ error }, resAff] = await Promise.all([
      supabase.from('equipe_joueurs').update(fields).eq('id', id),
      affiliationCourante
        ? supabase.from('affiliations').update({ jours_actifs: joursActifsEdit.length ? joursActifsEdit : null }).eq('id', affiliationCourante.id)
        : Promise.resolve({ error: null }),
    ])
    setSavingEdit(false)
    if (affiliationCourante && !resAff.error) {
      setAffiliations(prev => prev.map(a => (a.id === affiliationCourante.id ? { ...a, jours_actifs: joursActifsEdit.length ? joursActifsEdit : null } : a)))
    }
    if (error || resAff.error) {
      const message = error?.message || resAff.error?.message || ''
      alert(/photo_url/.test(message)
        ? "La photo n'a pas pu être enregistrée : la colonne photo_url n'existe pas encore dans l'effectif (script supabase_equipe_joueurs_photo.sql à exécuter)."
        : 'Erreur : ' + message)
      if (avant) setJoueurs(prev => prev.map(j => (j.id === id ? avant : j)))
      setJoueurEnEdition({ id, ...fields })
    }
  }

  // Photo d'un joueur ajoutée par le coach (Cloudinary, dossier du coach),
  // enregistrée avec le reste de la fiche au clic sur Enregistrer.
  const [envoiPhotoJoueur, setEnvoiPhotoJoueur] = useState(false)
  const choisirPhotoJoueur = async (fichier) => {
    if (!fichier) return
    setEnvoiPhotoJoueur(true)
    try {
      const sig = await demanderSignatureImage({ usage: 'avatar' })
      const formData = ajouterChampsSignes(new FormData(), sig)
      formData.append('file', fichier)
      const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloud_name}/image/upload`, { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok || !data.secure_url) throw new Error(data?.error?.message || 'envoi impossible')
      setJoueurEnEdition(p => (p ? { ...p, photo_url: data.secure_url } : p))
    } catch (e) {
      alert("La photo n'a pas pu être envoyée : " + e.message)
    } finally {
      setEnvoiPhotoJoueur(false)
    }
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
        club_categorie_id: equipeActive?.id || null,
        categorie: row.categorie || equipeActive?.nom || '',
        educateur_id: userId,
      })
      done++
      setImportPreview(prev => ({ ...prev, done }))
    }
    await chargerJoueurs(userId, equipeActive?.id)
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
        ...snapshot, educateur_id: userId, club_categorie_id: equipeActive?.id || null, domicile: snapshot.domicile,
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
    await chargerMatchs(userId, equipeActive?.id)
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
    setScannerModalWarning(null)
  }

  const ouvrirModalMatchJoue = (m) => {
    setModalMatchJoue(m)
    setScoreJoueForm({ score_nous: m.score_nous || '', score_eux: m.score_eux || '' })
    setScannerModalImageBase64(null)
    setScannerModalImagePreview(null)
    setScannerModalError(null)
    setScannerModalWarning(null)
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
      // club_categorie_id republiée à chaque modif : "auto-guérit" les matchs
      // créés avant l'ajout de cette colonne (ou avant que les points d'insert
      // ne la renseignent), sans backfill SQL à refaire pour ceux-là.
      const { error } = await supabase.from('matchs_equipe').update({ ...champs, club_categorie_id: equipeActive?.id || null }).eq('id', id)
      if (error) { afficherToast(`Erreur lors de la modification du match : ${error.message}`, 'erreur'); setSavingMatchForm(false); return }
      setMatchs(prev => prev.map(m => m.id === id ? { ...m, ...champs, club_categorie_id: equipeActive?.id || null } : m))
      // Optimistic à partir d'ici : la modale se ferme tout de suite,
      // l'estimation des horaires continue en arrière-plan.
      setSavingMatchForm(false)
      setModalMatchForm(null)
      await estimerEtAppliquerHoraires({ ...champs, id })
      return
    }
    const { data, error } = await supabase.from('matchs_equipe').insert({
      ...champs, educateur_id: userId, club_categorie_id: equipeActive?.id || null, score_nous: null, score_eux: null,
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

  // Recrutement Phase 3 : remonte automatiquement les stats de base (minutes,
  // buts, passes déc., cartons) saisies par l'éducateur sur la feuille de
  // match vers stats_match_joueur — le joueur n'a pas à les ressaisir dans
  // MesStats.jsx. match_id permet de mettre à jour plutôt que dupliquer si
  // l'éducateur corrige la feuille plus tard. Ne renseigne que les champs
  // disponibles à cette source (pas de km/duels/passes tentées, saisis à la
  // main ou importés via Veo) — calculerMoyennes() ignore les champs absents.
  const remonterStatsVersJoueurs = async (matchInfo, statsParJoueur) => {
    const entries = Object.entries(statsParJoueur || {}).filter(([joueurId, s]) => joueurId && (s.minutes || 0) > 0)
    if (!entries.length) return
    for (const [joueurId, s] of entries) {
      const payload = {
        joueur_id: joueurId,
        match_id: matchInfo.id,
        date: matchInfo.date,
        adversaire: matchInfo.adversaire,
        niveau: matchInfo.competition || null,
        minutes: s.minutes || 0,
        buts: s.buts || 0,
        passes_decisives: s.passes_dec || 0,
        cartons_jaunes: s.carton_jaune ? 1 : 0,
        cartons_rouges: s.carton_rouge ? 1 : 0,
        source: 'feuille_match',
      }
      const { data: existant } = await supabase.from('stats_match_joueur').select('id').eq('joueur_id', joueurId).eq('match_id', matchInfo.id).maybeSingle()
      if (existant) await supabase.from('stats_match_joueur').update(payload).eq('id', existant.id)
      else await supabase.from('stats_match_joueur').insert(payload)
    }
    // Moyennes recalculées une fois par joueur concerné (pas par ligne insérée).
    await Promise.all(entries.map(async ([joueurId]) => {
      const { data: tousLesMatchs } = await supabase.from('stats_match_joueur').select('*').eq('joueur_id', joueurId)
      if (!tousLesMatchs?.length) return
      await supabase.from('profil_recrutement').upsert({ joueur_id: joueurId, ...calculerMoyennes(tousLesMatchs), updated_at: new Date().toISOString() }, { onConflict: 'joueur_id' })
    }))
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
      alert(`Erreur lors de l'enregistrement des stats de ${erreurs.length} joueur${erreurs.length > 1 ? 's' : ''} :\n${erreurs[0].error.message}`)
    }
    const matchInfo = matchs.find(m => m.id === matchId)
    if (matchInfo) {
      await remonterStatsVersJoueurs(matchInfo, statsMatch[matchId]).catch(e => console.error('Erreur remontée stats joueur:', e))
    }
    await chargerMatchs(userId, equipeActive?.id)
    setMatchActif(null)
    setStatsMatch({})
  }

  // Gemini Vision via l'Edge Function scan-calendrier (prompt + clé API côté serveur)
  const scannerCalendrier = async () => {
    if (!calendarImages.length) return
    setCalendarLoading(true)
    setCalendarError(null)
    try {
      const { data, error } = await supabase.functions.invoke('scan-calendrier', {
        body: { images: calendarImages.map(img => ({ base64: img.base64 })) },
      })
      if (error || data?.error) throw new Error(error?.message || data?.error)
      const newMatchs = (data.matchs || []).filter(m => m.equipe_domicile && m.equipe_exterieur)
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
      await chargerMatchs(userId, equipeActive?.id)
    } else {
      setCalendarError(error.message)
    }
    setPublishingCalendrier(false)
  }

  // Retire les diacritiques pour un matching insensible aux accents (Noé/NOE, Léa/LEA...)
  const normaliserPourMatching = (str) => (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim()

  // Matching fuzzy : trouve le joueur de notre équipe à partir d'un nom sur la feuille.
  // Selon la source (feuille papier, appli club, composition FFF...), l'ordre
  // varie et n'est pas annoncé à l'avance : "Prénom Nom" (le plus courant),
  // "Nom Prénom" (certaines compositions FFF), ou "L. Nom" (prénom abrégé à
  // son initiale, ex. résumés type Veo). On essaie les interprétations dans
  // cet ordre et on garde la première qui matche réellement un joueur de
  // l'effectif — pas de format présupposé, on laisse les données trancher.
  const matcherParPrenom = (prenom, resteNom, listeJoueurs) => {
    const prenomN = normaliserPourMatching(prenom).replace(/\.$/, '')
    if (!prenomN) return null
    const candidats = listeJoueurs.filter(j => j.prenom && normaliserPourMatching(j.prenom) === prenomN)
    if (candidats.length === 0) return null
    if (candidats.length === 1) return candidats[0]
    // Homonymes (ex. deux "Mathis") : départage avec l'initiale du nom.
    const initiale = normaliserPourMatching(resteNom).charAt(0)
    return candidats.find(j => j.nom && normaliserPourMatching(j.nom).charAt(0) === initiale) || candidats[0]
  }
  const matcherParNom = (nom, restePrenom, listeJoueurs) => {
    const nomN = normaliserPourMatching(nom)
    if (!nomN) return null
    const candidats = listeJoueurs.filter(j => j.nom && normaliserPourMatching(j.nom) === nomN)
    if (candidats.length === 0) return null
    if (candidats.length === 1) return candidats[0]
    // Homonymes de nom de famille : départage avec l'initiale du prénom.
    const initiale = normaliserPourMatching(restePrenom).replace(/\.$/, '').charAt(0)
    return candidats.find(j => j.prenom && normaliserPourMatching(j.prenom).charAt(0) === initiale) || candidats[0]
  }

  const matcherJoueurParNom = (nomSurFeuille, listeJoueurs) => {
    if (!nomSurFeuille) return null
    const mots = nomSurFeuille.trim().split(/\s+/).filter(Boolean)
    if (mots.length === 0) return null

    if (mots.length === 1) {
      return matcherParPrenom(mots[0], '', listeJoueurs) || matcherParNom(mots[0], '', listeJoueurs)
    }

    const premier = normaliserPourMatching(mots[0]).replace(/\.$/, '')
    // "L. Nom" : le 1er mot n'est qu'une initiale — forcément un prénom
    // abrégé, donc on matche directement par nom de famille (le reste, qui
    // peut être composé — "ZOZO BOLI").
    if (premier.length === 1) {
      return matcherParNom(mots.slice(1).join(' '), premier, listeJoueurs)
    }

    // Ordre inconnu entre "Prénom Nom" (essayé en premier, le plus courant)
    // et "Nom Prénom" (repli si le premier essai ne matche personne) — les
    // deux noms de famille composés (ex. "ZOZO BOLI K.") sont couverts en
    // prenant le dernier mot comme prénom et tout le reste comme nom.
    return matcherParPrenom(mots[0], mots.slice(1).join(' '), listeJoueurs)
      || matcherParNom(mots.slice(0, -1).join(' '), mots[mots.length - 1], listeJoueurs)
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

  // Cœur du scan de feuille de match (Gemini Vision via l'Edge Function
  // scan-feuille-match + matching JS contre le roster) — partagé entre le
  // scanner "nouveau match" (scannerMatch) et le scanner de la modale "Marquer
  // comme joué" (scannerFeuilleModal), pour ne pas dupliquer la logique
  // d'extraction/matching. setStatus n'a plus de file d'attente à refléter
  // (Edge Function directe, pas de rate-limit client) — conservé dans la
  // signature pour ne pas toucher les deux appelants.
  // domicileConnu (optionnel) : si le statut domicile/extérieur du match est
  // déjà connu avec certitude (match déjà au calendrier, indépendamment du
  // scan) plutôt que déduit du scan lui-même — sert de départage quand le
  // matching par nom ne donne aucun signal (cf. plus bas).
  const scannerFeuilleDeMatch = async (imageBase64, setStatus, domicileConnu) => {
    setStatus?.(null)
    const { data, error } = await supabase.functions.invoke('scan-feuille-match', {
      body: { imageBase64 },
    })
    if (error) {
      // supabase-js n'expose que "Edge Function returned a non-2xx status
      // code" sur `error.message` — le vrai message (ex: erreur Gemini) est
      // dans le corps de la réponse, accessible via error.context (le
      // Response brut), pas directement sur l'objet error.
      let detail = error.message
      try {
        const body = await error.context?.json()
        if (body?.error) detail = body.error
      } catch { /* corps non-JSON ou déjà consommé — on garde le message générique */ }
      throw new Error(detail)
    }
    if (data?.error) throw new Error(data.error)
    const parsed = data.resultat

    // Identifie quelle colonne (gauche/droite) correspond à notre équipe : celle dont
    // le plus de noms matchent notre roster (matching JS, pas d'IA) — c'est
    // le signal le plus fiable quand il en trouve un. Mais à égalité (le
    // plus souvent 0-0 : format de composition non reconnu par le matching,
    // ex. prénoms abrégés), ce signal ne dit rien du tout, et retomber
    // bêtement sur "gauche" se trompe une fois sur deux. On se rabat alors
    // sur la convention domicile à gauche / extérieur à droite — fiable
    // seulement si le statut domicile/extérieur est déjà connu indépendamment
    // du scan (domicileConnu, cf. scannerFeuilleModal : match déjà au
    // calendrier), pas déduit à l'aveugle d'un scan qui a déjà échoué une fois.
    const nomsGauche = parsed.equipe_gauche || []
    const nomsDroite = parsed.equipe_droite || []
    const scoreGaucheMatch = nomsGauche.filter(n => matcherJoueurParNom(n, joueurs)).length
    const scoreDroiteMatch = nomsDroite.filter(n => matcherJoueurParNom(n, joueurs)).length
    const notreEquipeCote = scoreGaucheMatch !== scoreDroiteMatch
      ? (scoreGaucheMatch > scoreDroiteMatch ? 'gauche' : 'droite')
      : (domicileConnu === undefined || domicileConnu ? 'gauche' : 'droite')
    const nosNomsIA = notreEquipeCote === 'gauche' ? nomsGauche : nomsDroite
    const butsIA = notreEquipeCote === 'gauche' ? (parsed.buts_gauche || []) : (parsed.buts_droite || [])
    const scoreNous = notreEquipeCote === 'gauche' ? (parsed.score_domicile ?? 0) : (parsed.score_exterieur ?? 0)
    const scoreAdv = notreEquipeCote === 'gauche' ? (parsed.score_exterieur ?? 0) : (parsed.score_domicile ?? 0)

    const statsParJoueur = {}
    nosNomsIA.forEach(nom => {
      const joueur = matcherJoueurParNom(nom, joueurs)
      if (joueur) {
        // Matche contre TOUT le roster (pas juste [joueur]) pour que le départage par
        // initiale en cas d'homonymes s'applique réellement — sinon un but/carton
        // "MATHIS" sans initiale lisible matchait n'importe quel Mathis testé
        // individuellement, et se retrouvait attribué à chacun des homonymes.
        const buts = butsIA.filter(b => matcherJoueurParNom(b, joueurs)?.id === joueur.id).length
        const cartonJ = (parsed.cartons_jaunes || []).some(b => matcherJoueurParNom(b, joueurs)?.id === joueur.id)
        const cartonR = (parsed.cartons_rouges || []).some(b => matcherJoueurParNom(b, joueurs)?.id === joueur.id)
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

    // nosNomsIA renvoyé pour diagnostic : si le matching échoue, c'est la
    // seule façon de voir CE QUE Gemini a réellement lu sans aller fouiller
    // les logs de l'Edge Function — utile pour distinguer une mauvaise OCR
    // d'un format "NOM Prénom" inversé par rapport à "PRENOM NOM" attendu.
    return { parsed, scoreNous, scoreAdv, statsParJoueur, butsDetail, nosNomsIA }
  }

  const scannerMatch = async () => {
    if (!scannerImageBase64) return
    setScannerLoading(true)
    setScannerError(null)
    try {
      const { parsed, scoreNous, scoreAdv, statsParJoueur, butsDetail, nosNomsIA } = await scannerFeuilleDeMatch(scannerImageBase64, setScannerStatus)
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
      // Avertit si l'IA a réussi à rapprocher sensiblement moins de joueurs
      // que ce qu'elle a réellement lu sur la photo — comparé au nombre de
      // noms lus (nosNomsIA), pas à l'effectif total du club : une
      // composition ne liste que les joueurs convoqués ce match-là (souvent
      // 15-18), pas les 20+ du roster. Comparer à l'effectif entier faisait
      // apparaître un faux avertissement même quand le scan avait bien
      // fonctionné sur tout ce qui était photographié. Seuil relatif (70%)
      // plutôt qu'un nombre fixe. Noms bruts affichés pour diagnostiquer les
      // vrais ratés sans aller fouiller les logs.
      const nbLus = nosNomsIA?.length || 0
      const nbDetectes = Object.keys(statsParJoueur).length
      setScannerWarning(
        nbLus > 0 && nbDetectes < nbLus * 0.7
          ? `⚠️ ${nbDetectes} joueur${nbDetectes > 1 ? 's' : ''} reconnu${nbDetectes > 1 ? 's' : ''} sur ${nbLus} lu${nbLus > 1 ? 's' : ''} par l'IA sur la photo. Vérifiez la liste ci-dessous et complétez les joueurs manquants (lignes grisées). Noms lus par l'IA : ${nosNomsIA.join(', ')}.`
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
    setScannerModalWarning(null)
    try {
      const { scoreNous, scoreAdv, statsParJoueur, butsDetail, nosNomsIA } = await scannerFeuilleDeMatch(scannerModalImageBase64, setScannerModalStatus, modalMatchJoue.domicile)
      setScoreJoueForm({ score_nous: String(scoreNous), score_eux: String(scoreAdv) })
      setStatsMatch(prev => ({ ...prev, [modalMatchJoue.id]: statsParJoueur }))
      setScannerModalButsDetail(butsDetail)
      // Même garde-fou que le scanner "nouveau match" (scannerMatch), comparé
      // au nombre de noms réellement lus sur la photo (nosNomsIA) et pas à
      // l'effectif total du club — une composition ne liste que les joueurs
      // convoqués ce match-là, pas tout le roster (cf. commentaire détaillé
      // dans scannerMatch). Sans ce garde-fou, un échec de lecture des noms
      // (photo floue, écriture peu lisible, format inattendu) laisse la
      // feuille de match entièrement vide sans aucun signal, comme si le
      // scan n'avait rien fait alors que le score, lui, a bien été lu.
      const nbLus = nosNomsIA?.length || 0
      const nbDetectes = Object.keys(statsParJoueur).length
      setScannerModalWarning(
        nbLus > 0 && nbDetectes < nbLus * 0.7
          ? `⚠️ ${nbDetectes} joueur${nbDetectes > 1 ? 's' : ''} reconnu${nbDetectes > 1 ? 's' : ''} sur ${nbLus} lu${nbLus > 1 ? 's' : ''} par l'IA sur la photo. Le score a bien été lu — vérifiez la netteté de la photo et complétez minutes/buts/cartons manuellement ci-dessous pour les joueurs non reconnus. Noms lus par l'IA : ${nosNomsIA.join(', ')}.`
          : null
      )
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
      club_categorie_id: equipeActive?.id || null,
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
    await chargerMatchs(userId, equipeActive?.id)
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
    // club_categorie_id est indispensable : chargerEntrainements() filtre
    // dessus dès qu'une équipe est active (.eq('club_categorie_id', catId)),
    // donc une séance créée sans ce champ est bien insérée en base mais
    // disparaît aussitôt de la liste au rechargement — elle semblait "ne pas
    // se créer" alors qu'aucune erreur n'était renvoyée par Supabase.
    const payload = { ...newEntrainement, educateur_id: userId, club_categorie_id: equipeActive?.id || null }
    const { error } = await supabase.from('entrainements').insert(payload).select()
    if (error) {
      afficherToast(`Erreur lors de la création de la séance : ${error.message}`, 'erreur')
      return
    }
    await chargerEntrainements(userId, equipeActive?.id)
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
    // Construire la liste de toutes les dates correspondantes, avec l'heure propre
    // à chaque jour de semaine (ex : mardi/jeudi 20h, vendredi 19h)
    const dates = []
    const cur = new Date(planSaison.dateDebut)
    const end = new Date(planSaison.dateFin)
    while (cur <= end) {
      if (planSaison.joursActifs.includes(cur.getDay())) {
        dates.push({ date: cur.toISOString().split('T')[0], heure: planSaison.heuresParJour[cur.getDay()] || null })
      }
      cur.setDate(cur.getDate() + 1)
    }
    // Ne créer que les dates qui n'existent pas déjà
    const existingDates = new Set(entrainements.map(e => e.date?.substring(0, 10)))
    const newDates = dates.filter(d => !existingDates.has(d.date))
    setPlanProgress({ done: 0, total: newDates.length })
    for (let i = 0; i < newDates.length; i++) {
      await supabase.from('entrainements').insert({
        date: newDates[i].date,
        heure: newDates[i].heure,
        description: planSaison.theme || '',
        educateur_id: userId,
        club_categorie_id: equipeActive?.id || null
      }).select().single()
      // Pas de lignes pré-créées : la présence est saisie au clic (evite les faux "absents")
      setPlanProgress({ done: i + 1, total: newDates.length })
    }
    await chargerEntrainements(userId, equipeActive?.id)
    setGeneratingPlan(false)
    setShowPlanificateur(false)
    setPlanSaison({ joursActifs: [], dateDebut: '', dateFin: '', heuresParJour: {}, theme: '' })
  }

  const toggleJourPlan = (jour) => {
    setPlanSaison(prev => {
      const actif = prev.joursActifs.includes(jour)
      const heuresParJour = { ...prev.heuresParJour }
      if (actif) delete heuresParJour[jour]
      return {
        ...prev,
        joursActifs: actif ? prev.joursActifs.filter(j => j !== jour) : [...prev.joursActifs, jour],
        heuresParJour,
      }
    })
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
    await chargerEntrainements(userId, equipeActive?.id)
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
    await chargerEntrainements(userId, equipeActive?.id)
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
    await chargerEntrainements(userId, equipeActive?.id)
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
    // Séances à venir exclues (seanceComptable) : une réponse au sondage n'est
    // pas encore une présence — mêmes règles que DashboardClub/DashboardJoueur.
    const joueur = joueurs.find(j => j.id === joueurId)
    const getStatutEffectif = (e) => statutPresenceEffectif(
      (e.presences_entrainement || []).find(p => p.joueur_id === joueurId),
      joueur?.joueur_id ? dispoJoueurs[e.id]?.[joueur.joueur_id] : null,
    )
    const saisies = entrainements.filter(e => seanceComptable(e.date) && getStatutEffectif(e) !== null)
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

  // ── ABONNEMENT NON ACTIF ──
  // profiles.plan est déjà posé à 'educateur' dès l'inscription, avant tout
  // paiement (cf. RegisterRecruteur.jsx : l'upsert initial écrit
  // plan: 'educateur' et abonnement_actif: false, PUIS ouvre Stripe dans un
  // nouvel onglet) — SmartDashboard route donc déjà vers ce dashboard sur la
  // seule valeur de plan. Sans ce garde-fou, un compte fraîchement inscrit
  // avait un accès complet et permanent sans jamais confirmer le paiement
  // (il suffisait de se connecter, ou de faire "retour" depuis Stripe).
  // Bypass si affilié (accepté) à un club : c'est alors le club qui paie
  // l'accès, pas l'éducateur individuellement (cf. chargerClubAffiliation).
  const clubAffilieAccepte = clubAffiliation?.statut === 'accepte'
  if (!profil?.abonnement_actif && !clubAffilieAccepte) {
    return (
      <div style={{ minHeight: '100vh', background: colors.background.base, color: colors.text.primary, fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '400px', width: '100%', background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '20px', padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.5px' }}>Digital<span style={{ color: colors.accent.green }}>Football</span></div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.3px' }}>Abonnement non actif</h1>
          <p style={{ fontSize: '13px', color: colors.text.faint, marginBottom: '1.5rem' }}>Ton paiement n'a pas encore été confirmé.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.5rem' }}>
            <button onClick={() => window.open(stripeUrl(STRIPE_LINKS_EDU.edu_mensuel, userId, profil?.email), '_blank')} style={{ background: 'transparent', color: colors.text.primary, border: `1px solid ${colors.border.default}`, padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Activer — {t('edu_offre_mensuel', lang)}</button>
            <button onClick={() => window.open(stripeUrl(STRIPE_LINKS_EDU.edu_annuel, userId, profil?.email), '_blank')} style={{ background: colors.accent.blue, color: colors.black, border: 'none', padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Activer — {t('edu_offre_annuel', lang)}</button>
          </div>
          <span onClick={() => { signOutSafe(); navigate('/') }} style={{ color: colors.text.disabled, fontSize: '12px', cursor: 'pointer' }}>{t('btn_deconnexion', lang)}</span>
        </div>
      </div>
    )
  }

  // Regroupement en 4 groupes logiques — les clés réelles de activeSection ne
  // changent pas (aucun contenu de page déplacé/renommé), seuls les points
  // d'entrée de la nav sont fusionnés via `subKeys` : un item avec subKeys
  // pointe vers plusieurs activeSection réels, sélectionnés via un petit
  // sous-onglet affiché au-dessus du contenu (cf. SousOngletsBar plus bas).
  // "annonces" n'est plus un lien dédié : son contenu (activeSection ===
  // 'annonces', inchangé) reste accessible via le widget Actualités sur
  // l'Accueil. "causerie" et "bibliotheque" sont désormais des onglets
  // internes (pas des subKeys) de 'matchs'/'entrainements' — cf. les
  // pastilles competitionSubTab / SousOngletsBar plus bas. "dirigeants" est
  // devenu un onglet interne d'Explorer (explorerOnglet), toujours masqué
  // pour un dirigeant délégué via canView('dirigeants') à cet endroit.
  const sidebarSections = [
    { titre: 'MON ÉQUIPE', items: [
      { key: 'equipe', label: 'Mon équipe', icon: <IcoUsers />, subKeys: ['equipe', 'stats', 'sante'] },
      { key: 'matchs', label: t('nav_competition', lang), icon: <IcoTrophy /> },
      { key: 'organisation', label: t('nav_organisation', lang), icon: <IcoBox />, subKeys: ['materiel', 'terrains', 'deplacements'] },
      // Stages du club : éducateur affilié accepté uniquement (droit appliqué
      // en base par peut_gerer_stages) ; jamais pour un dirigeant délégué,
      // qui agit sous son propre compte et n'a pas ce droit.
      ...(clubAffilieAccepte && !permissions ? [{ key: 'stages', label: 'Stages', icon: <IcoCalendar /> }] : []),
    ] },
    { titre: 'ENTRAÎNEMENT', items: [
      { key: 'entrainements', label: 'Création entraînement', icon: <IcoRun />, subKeys: ['entrainements', 'mes_seances'] },
      { key: 'prep_physique', label: t('nav_prep_physique', lang), icon: <IcoDumbbell /> },
      { key: 'tactipad', label: t('nav_tacticboard', lang), icon: <IcoLayout /> },
      { key: 'bibliotheque', label: t('nav_bibliotheque', lang), icon: <IcoBook /> },
    ] },
    { titre: 'THÈME PROJET', items: [
      { key: 'projet_sportif', label: 'Projet Sportif', icon: <IcoStar /> },
      { key: 'projet_club_cff4', label: 'Projet Club — CFF4', icon: <IcoBuilding /> },
    ] },
    { titre: t('section_suivi_reseau', lang), items: [
      { key: 'suivi', label: 'Rapports & Évaluations', icon: <IcoClipboard />, subKeys: ['analyse_video', 'notes', 'clotures_saison'] },
      ...(recrutementActif(profil?.email) ? [{ key: 'recrutement', label: t('nav_recrutement', lang), icon: <IcoSearch /> }] : []),
      { key: 'explorer', label: 'Explorer', icon: <IcoCompass /> },
    ] },
  ]

  // Gating par permissions (dirigeant délégué uniquement — permissions est undefined
  // pour l'éducateur lui-même, donc canView/canEdit renvoient toujours true).
  // Seules les sections avec une clé de permission correspondante sont masquables ;
  // les autres (séances, tactipad...) restent visibles faute de permission dédiée
  // pour l'instant. "recrutement" (recherche perso de joueurs par l'éducateur) et
  // "dirigeants" (gestion des accès délégués, réservée à l'éducateur lui-même) sont
  // toujours masqués pour un dirigeant délégué : non pertinents pour ce rôle.
  const SECTIONS_MASQUEES_DIRIGEANT = ['recrutement', 'dirigeants']
  const PERMISSION_PAR_SECTION = {
    equipe: 'effectif', stats: 'stats', matchs: 'competition',
    entrainements: 'entrainements', prep_physique: 'prep_physique', notes: 'notes',
  }
  const canView = (sidebarKey) => {
    if (!permissions) return true
    if (SECTIONS_MASQUEES_DIRIGEANT.includes(sidebarKey)) return false
    const permKey = PERMISSION_PAR_SECTION[sidebarKey]
    return !permKey || permissions[permKey] !== 'aucun'
  }
  const canEdit = (permKey) => !permissions || permissions[permKey] === 'edition'
  // Un item fusionné (subKeys) reste visible dès qu'au moins un de ses
  // sous-onglets est autorisé ; sinon comportement inchangé sur item.key.
  const itemVisible = (item) => item.subKeys ? item.subKeys.some(canView) : canView(item.key)

  const sidebarSectionsVisibles = sidebarSections
    .map(section => ({ ...section, items: section.items.filter(itemVisible) }))
    .filter(section => section.items.length > 0)

  // Annuaire éducateurs/clubs — même source que l'onglet "Explorer" du
  // dashboard joueur (profiles.plan), club_recrutements pour les postes
  // ouverts affichés sur les cartes club (utile pour "postuler").
  const chargerExplorer = async () => {
    setExplorerLoading(true)
    const [{ data: edu }, { data: clu }, { data: recrut }] = await Promise.all([
      // Annuaire de toute la plateforme : paginé (lib/supabasePagination).
      fetchToutesLignes(() => supabase.from('profiles_public').select('id, prenom, nom, club, region, niveau_equipe, avatar_url, description').eq('plan', 'educateur').neq('id', userId).order('id')),
      fetchToutesLignes(() => supabase.from('profiles_public').select('id, prenom, nom, club, region, avatar_url, description, bio, verified').eq('plan', 'club').order('id')),
      fetchToutesLignes(() => supabase.from('club_recrutements').select('club_id, categorie, poste, niveau').eq('actif', true).order('club_id').order('categorie').order('poste')),
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
    // Paginé : trié du plus ancien au plus récent, la troncature à 1000
    // lignes faisait disparaître les messages les PLUS RÉCENTS.
    const { data } = await fetchToutesLignes(() => supabase
      .from('messages')
      .select('*, sender:profiles_public!messages_sender_id_fkey(prenom, nom, avatar_url), receiver:profiles_public!messages_receiver_id_fkey(prenom, nom, avatar_url)')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: true }))
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

  const chargerAnnonces = async () => {
    setAnnoncesLoading(true)
    const { data } = await supabase.from('annonces_reseau').select('*').eq('actif', true).order('created_at', { ascending: false })
    setAnnonces(data || [])
    setAnnoncesLoading(false)
  }

  const publierAnnonce = async () => {
    if (!nouvelleAnnonce.titre.trim() || nouvelleAnnonce.regions.length === 0) return
    setSavingAnnonce(true)
    await supabase.from('annonces_reseau').insert({
      auteur_id: userId,
      auteur_type: 'educateur',
      auteur_nom: `${profilEdu?.prenom || profil?.prenom || ''} ${profilEdu?.nom || profil?.nom || ''}`.trim() || 'Un éducateur',
      auteur_photo: profilEdu?.avatar_url || profil?.avatar_url || null,
      auteur_region: profil?.region || null,
      type_annonce: nouvelleAnnonce.type_annonce,
      titre: nouvelleAnnonce.titre.trim(),
      description: nouvelleAnnonce.description.trim() || null,
      regions: nouvelleAnnonce.regions,
      date_evenement: nouvelleAnnonce.date_evenement || null,
      contact: nouvelleAnnonce.contact.trim() || null,
    })
    setSavingAnnonce(false)
    setShowNouvelleAnnonce(false)
    setNouvelleAnnonce({ type_annonce: 'recherche_educateur', titre: '', description: '', regions: [], date_evenement: '', contact: '' })
    chargerAnnonces()
  }

  const supprimerAnnonce = async (id) => {
    if (!confirm('Supprimer cette annonce ?')) return
    await supabase.from('annonces_reseau').delete().eq('id', id).eq('auteur_id', userId)
    setAnnonces(prev => prev.filter(a => a.id !== id))
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
    <Suspense fallback={null}>
      {(() => {
        // Mon équipe : « à la suite de la sélection de son équipe » — jamais
        // par-dessus la fenêtre obligatoire « Quelle catégorie et équipe
        // gères-tu ? », seulement une fois une équipe active (ou sans club).
        const equipePrete = clubCategoriesChargees && !ajouterEquipeOuvert
          && (mesEquipes.length > 0 || (!clubAffiliation && clubCategories.length === 0) || (clubAffiliation && clubAffiliation.statut !== 'accepte'))
        const candidat = activeSection === 'equipe' && equipePrete && canEdit('effectif') ? 'equipe'
          : activeSection === 'entrainements' ? 'planning'
          : activeSection === 'mes_seances' ? 'seance'
          : activeSection === 'matchs' && competitionSubTab === 'calendrier' && canEdit('competition') ? 'competition'
          : activeSection === 'matchs' && competitionSubTab === 'resultats' && canEdit('competition') ? 'resultats'
          : null
        const tutoAffiche = tutoOuvert || (userId && candidat && !tutorielDejaVu(candidat, userId) ? candidat : null)
        if (!tutoAffiche) return null
        const fermer = () => { marquerTutorielVu(tutoAffiche, userId); setTutoOuvert(null); setTutoMaj(n => n + 1) }
        if (tutoAffiche === 'equipe') return <TutorielEquipe onFermer={fermer} />
        if (tutoAffiche === 'planning') return <TutorielPlanning onFermer={fermer} />
        if (tutoAffiche === 'seance') return <TutorielSeance onFermer={fermer} />
        if (tutoAffiche === 'resultats') return <TutorielResultats onFermer={fermer} />
        return <TutorielCompetition onFermer={fermer} />
      })()}
      <OnboardingGuide key={onboardingKey} rejouer={onboardingKey > 0} userId={userId} steps={getEducateurOnboardingSteps(profil?.email)} accentColor={colors.accent.blue} />
      <FloatingHelper userId={userId} onReplayOnboarding={replayOnboarding} faq={EDUCATEUR_FAQ} accentColor={colors.accent.blue} estAccueil={activeSection === 'accueil'} />
    </Suspense>
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
              {mesEquipes.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '10px' }}>
                  {mesEquipes.length > 1 ? mesEquipes.map(equipe => (
                    <div key={equipe.id} style={{
                      display: 'inline-flex', alignItems: 'center', borderRadius: '20px',
                      background: equipeActive?.id === equipe.id ? colors.accent.green : colors.background.raised,
                    }}>
                      <button onClick={() => changerEquipe(equipe)} style={{
                        padding: '4px 4px 4px 10px', borderRadius: '20px 0 0 20px', border: 'none', cursor: 'pointer', background: 'transparent',
                        color: equipeActive?.id === equipe.id ? colors.black : colors.text.muted,
                        fontWeight: equipeActive?.id === equipe.id ? 800 : 500, fontSize: '11px', fontFamily: 'Inter, sans-serif',
                      }}>
                        {labelCategorie(equipe.nom)} {equipe.equipe}
                      </button>
                      <button onClick={() => supprimerEquipe(equipe)} title="Supprimer cette équipe" style={{
                        padding: '4px 8px 4px 2px', borderRadius: '0 20px 20px 0', border: 'none', cursor: 'pointer', background: 'transparent',
                        color: equipeActive?.id === equipe.id ? colors.black : colors.text.muted, fontSize: '12px', lineHeight: 1, opacity: 0.7,
                      }}>
                        ×
                      </button>
                    </div>
                  )) : (
                    <span style={{ fontSize: '11px', color: colors.text.faint }}>{labelCategorie(equipeActive.nom)} — Équipe {equipeActive.equipe}</span>
                  )}
                  <button onClick={() => { setActiveSection('equipe'); setAjouterEquipeOuvert(true) }} title="Ajouter une équipe"
                    style={{ padding: '4px 10px', borderRadius: '20px', border: `1px dashed ${colors.border.default}`, background: 'transparent', color: colors.text.faint, fontSize: '11px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    + Équipe
                  </button>
                </div>
              )}
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
              {section.items.map(item => {
                const actif = item.subKeys ? item.subKeys.includes(activeSection) : activeSection === item.key
                const cible = item.subKeys ? (item.subKeys.find(canView) || item.subKeys[0]) : item.key
                return (
                <button key={item.key} id={`nav-${item.key}`} onClick={() => { setActiveSection(cible); setSidebarOpen(false) }} title={isTablet ? item.label : undefined}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: isTablet ? 'center' : 'flex-start', gap: '10px', padding: isTablet ? '10px 0' : '10px 12px', marginTop: isTablet ? '4px' : 0, borderRadius: '10px', border: 'none', cursor: 'pointer', background: actif ? '#60a5fa12' : 'transparent', color: actif ? colors.accent.blue : item.locked ? colors.border.strong : colors.text.muted, fontSize: '13px', fontWeight: actif ? 700 : 400, textAlign: 'left', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s', position: 'relative' }}>
                  <span style={{ flexShrink: 0 }}>{item.icon}</span>
                  {!isTablet && <span style={{ flex: 1 }}>{item.label}</span>}
                  {!!item.badge && (
                    <span style={{ background: colors.accent.blue, color: colors.background.base, borderRadius: '10px', minWidth: '18px', height: '18px', padding: '0 5px', fontSize: '10px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.badge}</span>
                  )}
                  {item.locked && !isTablet && <span style={{ fontSize: '12px', opacity: 0.4 }}>🔒</span>}
                  {actif && (
                    <div style={{ position: 'absolute', left: 0, top: '20%', height: '60%', width: '3px', background: colors.accent.blue, borderRadius: '0 3px 3px 0' }} />
                  )}
                </button>
                )
              })}
            </div>
          ))}
        </nav>

        <div style={{ borderTop: `1px solid ${colors.border.subtle}`, padding: isTablet ? '8px' : '8px 10px' }}>
          <button id="nav-profil" onClick={() => { setActiveSection('profil'); setSidebarOpen(false) }} title={isTablet ? t('nav_profil', lang) : undefined}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: isTablet ? 'center' : 'flex-start', gap: '10px', padding: isTablet ? '10px 0' : '10px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: activeSection === 'profil' ? '#60a5fa12' : 'transparent', color: activeSection === 'profil' ? colors.accent.blue : colors.text.muted, fontSize: '13px', fontWeight: activeSection === 'profil' ? 700 : 400, textAlign: 'left', fontFamily: 'Inter, sans-serif' }}>
            <span style={{ flexShrink: 0 }}><IcoUser /></span>{!isTablet && <span style={{ flex: 1 }}>{t('nav_profil', lang)}</span>}
          </button>
          {mesRoles?.club && !isTablet && (
            <button onClick={() => navigate('/club')}
              style={{ width: '100%', marginTop: '4px', padding: '8px 12px', background: colors.background.raised, border: '1px solid #60a5fa', borderRadius: '8px', color: colors.accent.blue, cursor: 'pointer', fontSize: '12px', textAlign: 'left' }}>
              🏢 Vue Club{mesRoles.clubNom ? ` — ${mesRoles.clubNom}` : ''}
            </button>
          )}
          {mesRoles?.joueur && !isTablet && (
            <button onClick={() => navigate('/dashboard-joueur')}
              style={{ width: '100%', marginTop: '4px', padding: '8px 12px', background: colors.background.raised, border: `1px solid ${colors.accent.amber}`, borderRadius: '8px', color: colors.accent.amber, cursor: 'pointer', fontSize: '12px', textAlign: 'left' }}>
              ⚽ Vue Joueur
            </button>
          )}
          {mesRoles?.parent && !isTablet && (
            <button onClick={() => navigate('/dashboard-parent')}
              style={{ width: '100%', marginTop: '4px', padding: '8px 12px', background: colors.background.raised, border: `1px solid ${colors.accent.green}`, borderRadius: '8px', color: colors.accent.green, cursor: 'pointer', fontSize: '12px', textAlign: 'left' }}>
              👁️ Vue Parent{mesRoles.parentJoueurNom ? ` — ${mesRoles.parentJoueurNom}` : ''}
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

      <div style={{ flex: 1, minWidth: 0, maxWidth: educateurIdOverride ? 'none' : (activeSection === 'accueil' ? '1600px' : '1400px'), margin: '0 auto', padding: isMobile ? '16px 14px' : '1.25rem 2rem', paddingTop: isMobile ? 'calc(16px + env(safe-area-inset-top, 0px))' : '1.25rem', paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>

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
              club={clubAffiliation?.club}
              userId={userId}
              equipeActiveId={equipeActive?.id}
              equipeUnique={mesEquipes.length <= 1}
              joueurs={joueurs}
              entrainements={entrainements}
              matchs={matchs}
              dispoJoueurs={dispoJoueurs}
              rapportsRecents={rapportsRecents}
              setActiveSection={setActiveSection}
              setSousOngletEnt={setSousOngletEnt}
              setStatsSubTab={setStatsSubTab}
              setCompetitionSubTab={setCompetitionSubTab}
              lang={lang}
              isMobile={isMobile}
              mesSeancesOuvertes={mesSeancesOuvertes}
              setFicheApercu={setFicheApercu}
              setFicheApercuEnHaut={setFicheApercuEnHaut}
              setModalImportFicheEntrainement={setModalImportFicheEntrainement}
            />
          </>
        )}

        {['equipe', 'stats', 'sante'].includes(activeSection) && (
          <SousOngletsBar
            items={[{ key: 'equipe', label: t('equipe_effectif', lang) }, { key: 'stats', label: t('nav_stats', lang) }, { key: 'sante', label: t('nav_sante', lang) }].filter(it => canView(it.key))}
            activeSection={activeSection} setActiveSection={setActiveSection}
          />
        )}

        {/* ===== MON ÉQUIPE ===== */}
        {activeSection === 'equipe' && (
          <>
            {/* Déclaration de la catégorie/équipe gérée — obligatoire et non
                dismissable à la toute première visite de cet onglet (aucune
                équipe déclarée du tout, mesEquipes vide : les nouveaux joueurs
                n'auraient nulle part où s'auto-rattacher), ou ouverte
                volontairement ensuite via "Ajouter une équipe" pour gérer une
                équipe supplémentaire (cf. declarerMaCategorie, switcher).
                !permissions : réservé au compte éducateur lui-même — un
                dirigeant délégué (permissions défini) ne doit jamais se voir
                imposer cette déclaration, qui ne le concerne pas et n'a pas de
                bouton "Annuler" tant qu'aucune équipe n'existe. */}
            {!permissions && clubCategoriesChargees && clubAffiliation?.statut === 'accepte' && (mesEquipes.length === 0 || ajouterEquipeOuvert) && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div style={{ background: colors.background.base, border: `1px solid ${colors.border.subtle}`, borderRadius: '20px', width: '100%', maxWidth: '420px', padding: '28px' }}>
                  <p style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '17px' }}>Quelle catégorie et équipe gères-tu ?</p>
                  <p style={{ margin: '0 0 20px', fontSize: '13px', color: colors.text.faint }}>
                    {mesEquipes.length === 0
                      ? 'Nécessaire une seule fois : tes prochains joueurs ajoutés seront ensuite rattachés automatiquement, sans avoir à le refaire à chaque fois.'
                      : 'Cette équipe s\'ajoute aux tiennes — tu pourras basculer entre elles à tout moment.'}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                    <div>
                      <label style={st.label}>{t('equipe_categorie', lang)}</label>
                      <select style={st.input} value={promptCategorieForm.nom} onChange={e => setPromptCategorieForm(p => ({ ...p, nom: e.target.value }))}>
                        <optgroup label="Masculin">
                          {CATEGORIES_MASCULIN.map(c => <option key={c} value={c}>{labelCategorie(c)}</option>)}
                        </optgroup>
                        <optgroup label="Féminin">
                          {CATEGORIES_FEMININ.map(c => <option key={c} value={c}>{labelCategorie(c)}</option>)}
                        </optgroup>
                      </select>
                    </div>
                    <div>
                      <label style={st.label}>{t('club_equipe_label', lang)}</label>
                      <select style={st.input} value={promptCategorieForm.equipe} onChange={e => setPromptCategorieForm(p => ({ ...p, equipe: e.target.value }))}>
                        {['A', 'B', 'C', 'D', 'E'].map(e => <option key={e}>{e}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {mesEquipes.length > 0 && (
                      <button onClick={() => setAjouterEquipeOuvert(false)} disabled={savingCategorieClub} style={{ ...st.btn(colors.text.dim), color: colors.black }}>
                        {t('btn_annuler', lang)}
                      </button>
                    )}
                    <button onClick={declarerMaCategorie} disabled={savingCategorieClub} style={{ ...st.btnSolid, flex: 1 }}>
                      {savingCategorieClub ? 'Enregistrement...' : 'Confirmer'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {(() => {
              // V2 : en-tête avec actions, synthèse de l'effectif (lignes,
              // comptes liés, licenciés), semaine en cartes, groupe compact.
              const LIGNES_EFF = [
                { label: t('stats_pres_gardiens', lang), color: colors.accent.amber, match: p => p?.toLowerCase().includes('gardien') },
                { label: t('stats_pres_defenseurs', lang), color: colors.accent.blue, match: p => p && ['défenseur','defenseur','latéral','lateral'].some(k => p.toLowerCase().includes(k)) },
                { label: t('stats_pres_milieux', lang), color: colors.accent.purpleLight, match: p => p?.toLowerCase().includes('milieu') },
                { label: t('stats_pres_attaquants', lang), color: colors.accent.green, match: p => p && ['attaquant','ailier'].some(k => p.toLowerCase().includes(k)) },
              ]
              const nbLies = joueurs.filter(j => j.joueur_id).length
              const nbLicencies = joueurs.filter(j => j.numero_licence).length
              const eyebrowEq = { margin: 0, fontSize: '11px', fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.text.secondary }
              const aujourdHui = new Date().toISOString().split('T')[0]
              const dans7jours = new Date(new Date().getTime() + 7 * 86400000).toISOString().split('T')[0]
              const events = [
                ...entrainements.filter(e => e.date >= aujourdHui && e.date <= dans7jours).map(e => ({ type: 'entrainement', id: e.id, date: e.date, heure: e.heure, sondage_clos: e.sondage_clos, titre: e.description || t('ent_seance_generique', lang) })),
                ...matchs.filter(m => m.date >= aujourdHui && m.date <= dans7jours).map(m => ({ type: 'match', id: m.id, date: m.date, heure: m.heure, titre: m.adversaire ? `${t('ent_vs', lang)} ${m.adversaire}` : t('ent_match_generique', lang) })),
              ].sort((a, b) => new Date(a.date) - new Date(b.date))
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '22px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
                    <div>
                      <h1 style={{ fontSize: '26px', fontWeight: 800, color: colors.text.primary, margin: 0 }}>{t('equipe_titre', lang)}</h1>
                      <p style={{ color: colors.text.faint, fontSize: '13px', margin: '4px 0 0' }}>{joueurs.length} {t('equipe_joueurs', lang)} {t('equipe_dans_effectif', lang)}{equipeActive ? ` · ${labelCategorie(equipeActive.nom)} ${equipeActive.equipe || ''}` : ''}</p>
                    </div>
                    {canEdit('effectif') && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <BoutonTutoriel onClick={() => setTutoOuvert('equipe')} />
                        <button onClick={telechargerTemplate} title="Télécharger le modèle Excel" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 14px', borderRadius: '10px', border: `1px solid ${colors.border.default}`, background: 'transparent', color: colors.text.secondary, fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                          <IcoDownload /> {t('equipe_template', lang)}
                        </button>
                        <button onClick={() => importRef.current?.click()} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 14px', borderRadius: '10px', border: `1px solid ${colors.border.default}`, background: 'transparent', color: colors.text.secondary, fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                          <IcoImport /> {t('equipe_importer_excel_csv', lang)}
                        </button>
                        <button onClick={() => setShowAddJoueur(true)} style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', background: colors.accent.green, color: colors.black, fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                          + {t('equipe_ajouter', lang)}
                        </button>
                        <input ref={importRef} type="file" accept=".xlsx,.xls,.csv,.numbers" style={{ display: 'none' }} onChange={handleImportFile} />
                      </div>
                    )}
                  </div>

                  {permissions?.effectif === 'lecture' && (
                    <div style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, background: colors.accent.blue + alpha.subtle, border: `1px solid ${colors.accent.blue}30`, color: colors.accent.blue, fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>
                      {t('equipe_mode_lecture', lang)}
                    </div>
                  )}

                  {/* Synthèse de l'effectif */}
                  {joueurs.length > 0 && (
                    <div style={{ ...st.card, margin: 0, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1.4fr) minmax(0,1fr)', gap: isMobile ? '16px' : '28px', alignItems: 'center' }}>
                      <div>
                        <p style={{ ...eyebrowEq, marginBottom: '10px' }}>Répartition par ligne</p>
                        <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', gap: '2px', background: colors.background.base }}>
                          {LIGNES_EFF.map(l => {
                            const nb = joueurs.filter(j => l.match(j.poste)).length
                            return nb > 0 && <div key={l.label} style={{ width: `${(nb / joueurs.length) * 100}%`, background: l.color }} />
                          })}
                        </div>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '10px' }}>
                          {LIGNES_EFF.map(l => (
                            <span key={l.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: colors.text.faint }}>
                              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: l.color }} />
                              <strong style={{ color: colors.text.primary, fontVariantNumeric: 'tabular-nums' }}>{joueurs.filter(j => l.match(j.poste)).length}</strong> {l.label}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {[
                          { label: 'Comptes liés', val: nbLies, couleur: colors.accent.green },
                          { label: 'Licenciés', val: nbLicencies, couleur: colors.accent.blue },
                        ].map(k => (
                          <div key={k.label}>
                            <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: colors.text.faint }}>{k.label}</p>
                            <p style={{ margin: '4px 0 6px', fontSize: '22px', fontWeight: 800, lineHeight: 1, color: k.couleur, fontVariantNumeric: 'tabular-nums' }}>{k.val}<span style={{ fontSize: '13px', color: colors.text.faint, fontWeight: 600 }}> / {joueurs.length}</span></p>
                            <div style={{ height: '4px', borderRadius: '2px', background: colors.background.base, overflow: 'hidden' }}>
                              <div style={{ width: `${(k.val / joueurs.length) * 100}%`, height: '100%', background: k.couleur }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cette semaine + groupe */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile || events.length === 0 ? '1fr' : 'minmax(0,2fr) minmax(0,1fr)', gap: '12px', alignItems: 'stretch' }}>
                    {events.length > 0 && (
                      <div style={{ ...st.card, margin: 0 }}>
                        <p style={{ ...eyebrowEq, marginBottom: '12px' }}>{t('ent_cette_semaine', lang)}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                          {events.map((ev, i) => {
                            const date = new Date(ev.date + 'T12:00:00')
                            const isToday = date.toDateString() === new Date().toDateString()
                            const isTomorrow = date.toDateString() === new Date(new Date().getTime() + 86400000).toDateString()
                            const labelJour = isToday ? t('aff_aujourdhui', lang) : isTomorrow ? t('aff_demain', lang) : date.toLocaleDateString(localeOf(lang), { weekday: 'long' })
                            const couleurEv = ev.type === 'match' ? colors.accent.amber : colors.accent.blue
                            return (
                              <div key={i}
                                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: colors.background.base, border: `1px solid ${colors.border.subtle}`, borderLeft: `3px solid ${couleurEv}`, borderRadius: '10px', cursor: ev.type === 'entrainement' ? 'pointer' : 'default', minWidth: 0 }}
                                onClick={() => { if (ev.type === 'entrainement') { setActiveSection('entrainements'); setSousOngletEnt('prochaine') } }}>
                                <div style={{ width: '42px', textAlign: 'center', flexShrink: 0 }}>
                                  <p style={{ margin: 0, fontSize: '9px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: isToday ? couleurEv : colors.text.faint }}>{date.toLocaleDateString(localeOf(lang), { weekday: 'short' }).replace('.', '')}</p>
                                  <p style={{ margin: 0, fontSize: '20px', fontWeight: 800, lineHeight: 1.1 }}>{date.getDate()}</p>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ margin: 0, fontSize: '10px', fontWeight: 800, letterSpacing: '0.6px', textTransform: 'uppercase', color: couleurEv }}>{ev.type === 'match' ? 'Match' : 'Entraînement'}</p>
                                  <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.titre}</p>
                                  <p style={{ margin: '1px 0 0', color: colors.text.faint, fontSize: '11px', textTransform: 'capitalize' }}>{labelJour}{ev.heure ? ` · ${ev.heure.slice(0, 5)}` : ''}</p>
                                </div>
                                {ev.type === 'entrainement' && !ev.sondage_clos && (
                                  <span title={t('ent_sondage_ouvert', lang)} style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.accent.green, flexShrink: 0 }} />
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Groupe équipe (WhatsApp/Discord/Slack) */}
                    <div style={{ ...st.card, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ width: '34px', height: '34px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.accent.green + '1f', color: colors.accent.green, flexShrink: 0 }}><IcoBulle /></span>
                        <div style={{ minWidth: 0 }}>
                          <p style={eyebrowEq}>{t('equipe_groupe', lang)}</p>
                          {!profilEdu?.lien_groupe && <p style={{ margin: '2px 0 0', fontSize: '12px', color: colors.text.faint }}>{t('equipe_colle_lien_groupe', lang)}</p>}
                        </div>
                      </div>
                      {profilEdu?.lien_groupe ? (
                        <>
                          <a href={profilEdu.lien_groupe} target="_blank" rel="noopener noreferrer"
                            style={{ padding: '10px', borderRadius: '10px', border: `1px solid ${colors.accent.green}40`, background: colors.accent.green + '10', color: colors.accent.green, fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none' }}>
                            {t('equipe_ouvrir_groupe', lang)} →
                          </a>
                          <button onClick={() => supabase.from('profil_educateur').update({ lien_groupe: null }).eq('user_id', userId).then(() => chargerProfilEdu(userId))}
                            style={{ alignSelf: 'flex-start', fontSize: 11, color: colors.text.faint, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'Inter, sans-serif' }}>
                            {t('equipe_modifier_lien', lang)}
                          </button>
                        </>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input placeholder="https://chat.whatsapp.com/..." value={lienGroupe} onChange={e => setLienGroupe(e.target.value)}
                            style={{ flex: 1, minWidth: 0, background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '8px 10px', color: colors.text.primary, fontSize: 12, fontFamily: 'Inter, sans-serif', outline: 'none' }} />
                          <button onClick={async () => {
                            await supabase.from('profil_educateur').update({ lien_groupe: lienGroupe }).eq('user_id', userId)
                            await chargerProfilEdu(userId)
                          }}
                            style={{ background: colors.accent.blue, color: colors.black, border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                            {t('btn_sauvegarder', lang)}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Vue : Postes / Liste */}
                  {joueurs.length > 0 && (
                    <div style={{ display: 'inline-flex', alignSelf: 'flex-start', padding: '3px', borderRadius: '10px', background: colors.background.base, border: `1px solid ${colors.border.subtle}` }}>
                      {[{ key: 'poste', label: t('equipe_vue_postes', lang) }, { key: 'liste', label: t('equipe_vue_liste', lang) }].map(tab => (
                        <button key={tab.key} onClick={() => setVueEquipe(tab.key)}
                          style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: vueEquipe === tab.key ? 700 : 500, fontFamily: 'Inter, sans-serif', background: vueEquipe === tab.key ? colors.background.raised : 'transparent', color: vueEquipe === tab.key ? colors.text.primary : colors.text.faint }}>
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* ── Modal profil joueur ── */}
            {joueurProfil && (() => {
              const j = joueurProfil
              const tx = tauxPresence(j.id)
              const s = statsGlobalesJoueur(j.id)
              const age = j.date_naissance ? Math.floor((new Date() - new Date(j.date_naissance)) / (365.25 * 24 * 3600 * 1000)) : null
              const posColor = j.poste?.toLowerCase().includes('gardien') ? '#f59e0b' : j.poste && ['défenseur','defenseur','latéral','lateral'].some(k => j.poste.toLowerCase().includes(k)) ? colors.accent.blue : j.poste?.toLowerCase().includes('milieu') ? colors.accent.purpleLight : colors.accent.green
              return (
                <div style={{ position: 'fixed', inset: 0, background: colors.background.overlay, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setJoueurProfil(null)}>
                  <div style={{ background: colors.background.sunken, border: `1px solid ${colors.border.subtle}`, borderRadius: '20px', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>

                    {/* Header */}
                    <div style={{ background: `linear-gradient(135deg, ${posColor}15, transparent)`, borderBottom: `1px solid ${colors.border.subtle}`, padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {j.numero_maillot ? (
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: posColor + '25', border: `2px solid ${posColor}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: posColor, fontWeight: 800, fontSize: '20px', flexShrink: 0 }}>
                          {j.numero_maillot}
                        </div>
                      ) : (
                        <Avatar person={j} size={64} bg={posColor + '25'} border={`2px solid ${posColor}50`} textColor={posColor} style={{ fontSize: '20px' }} />
                      )}
                      <div style={{ flex: 1 }}>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>{j.prenom} {j.nom}</h2>
                        <p style={{ margin: '4px 0 0', color: posColor, fontSize: '13px', fontWeight: 600 }}>{j.poste || '—'}{age ? ` · ${age} ans` : ''}{j.categorie ? ` · ${labelCategorie(j.categorie)}` : ''}</p>
                        {j.numero_licence && <span style={{ fontSize: '11px', color: colors.accent.blue, background: colors.accent.blue + alpha.subtle, padding: '2px 8px', borderRadius: '10px', marginTop: '4px', display: 'inline-block' }}>🪪 Licencié {j.numero_licence}</span>}
                      </div>
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

                      {/* Dernière évaluation (evaluations_joueur.note_globale_saison, /20) —
                          seule valeur numérique de la fiche, les 4 aspects (technique/
                          physique/mental/tactique) ne sont que du texte libre côté fiche. */}
                      {(() => {
                        const evalJoueur = derniereEvaluation(j.id)
                        return evalJoueur ? (
                          <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '1.25rem' }}>
                            <p style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '14px' }}>⭐ {t('equipe_evaluation_educateur', lang)}</p>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <RadialSkill value={evalJoueur.note_globale_saison} max={20} color={colors.accent.amber} label="Note globale" size={90} />
                            </div>
                          </div>
                        ) : null
                      })()}

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
                          <button onClick={() => { setJoueurEnEdition({ ...j }); setJoueurProfil(null); setJoursActifsEdit(affiliations.find(a => a.equipe_joueur_id === j.id)?.jours_actifs || []) }} style={{ background: colors.accent.blue + alpha.subtle, border: '1px solid #60a5fa30', color: colors.accent.blue, padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>✏️ {t('tactic_modifier_infos', lang)}</button>
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
                  {/* Photo du joueur : celle du coach prime sur celle du compte. */}
                  {(() => {
                    const photo = ('photo_url' in joueurEnEdition && joueurEnEdition.photo_url !== undefined ? joueurEnEdition.photo_url : null) || joueurEnEdition.photo_profil
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px', padding: '12px', border: `1px solid ${colors.border.subtle}`, borderRadius: '10px' }}>
                        <Avatar person={{ ...joueurEnEdition, avatar_url: photo }} size={64} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <label style={{ ...st.btn(colors.accent.blue), display: 'inline-flex', alignItems: 'center', cursor: envoiPhotoJoueur ? 'wait' : 'pointer', opacity: envoiPhotoJoueur ? 0.6 : 1 }}>
                              {envoiPhotoJoueur ? 'Envoi…' : joueurEnEdition.photo_url ? 'Changer la photo' : 'Ajouter une photo'}
                              <input type="file" accept="image/*" style={{ display: 'none' }} disabled={envoiPhotoJoueur} onChange={e => { choisirPhotoJoueur(e.target.files?.[0]); e.target.value = '' }} />
                            </label>
                            {joueurEnEdition.photo_url && (
                              <button type="button" onClick={() => setJoueurEnEdition(p => ({ ...p, photo_url: null }))} style={st.btn(colors.text.dim)}>Retirer</button>
                            )}
                          </div>
                          <p style={{ margin: 0, fontSize: '11px', color: colors.text.faint }}>
                            {joueurEnEdition.photo_url ? 'Photo ajoutée par le coach.' : joueurEnEdition.photo_profil ? 'Photo du compte du joueur. Tu peux la remplacer.' : 'Aucune photo pour le moment.'}
                          </p>
                        </div>
                      </div>
                    )
                  })()}
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
                  {affiliations.some(a => a.equipe_joueur_id === joueurEnEdition.id) && (
                    <div style={{ marginBottom: '16px' }}>
                      <label style={st.label}>Jours actifs sur cette équipe (optionnel)</label>
                      <p style={{ color: colors.text.faint, fontSize: '11px', margin: '0 0 8px' }}>
                        Utile seulement si ce joueur est aussi affilié à une autre équipe — restreint son planning à ces jours-là pour celle-ci. Laisser vide = tous les jours.
                      </p>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {JOURS_SEMAINE.map(j => {
                          const actif = joursActifsEdit.includes(j.key)
                          return (
                            <button key={j.key} type="button"
                              onClick={() => setJoursActifsEdit(prev => actif ? prev.filter(k => k !== j.key) : [...prev, j.key])}
                              style={{
                                padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                                background: actif ? colors.accent.blue : colors.background.raised,
                                color: actif ? colors.black : colors.text.faint,
                                border: `1px solid ${actif ? colors.accent.blue : colors.border.default}`,
                              }}>{j.label.slice(0, 3)}</button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={sauvegarderJoueur} disabled={savingEdit} style={st.btnSolid}>{savingEdit ? 'Sauvegarde...' : `💾 ${t('btn_sauvegarder', lang)}`}</button>
                    <button onClick={() => setJoueurEnEdition(null)} style={st.btn(colors.text.dim)}>{t('btn_annuler', lang)}</button>
                  </div>
                </div>
              </div>
            )}

            {importError && (
              <div style={{ background: '#f8717115', border: '1px solid #f8717140', borderRadius: '10px', padding: '12px 16px', marginBottom: '1rem', color: '#f87171', fontSize: '13px' }}>
                {importError}
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
                {equipeActive && (
                  <p style={{ margin: '0 0 12px', fontSize: '12px', color: colors.text.faint }}>
                    Sera automatiquement rattaché à {labelCategorie(equipeActive.nom)} — Équipe {equipeActive.equipe}.
                  </p>
                )}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={ajouterJoueur} disabled={savingJoueur || !newJoueur.prenom || !newJoueur.nom} style={st.btnSolid}>{savingJoueur ? 'Ajout...' : t('btn_ajouter', lang)}</button>
                  <button onClick={() => setShowAddJoueur(false)} style={st.btn(colors.text.dim)}>{t('btn_annuler', lang)}</button>
                </div>
              </div>
            )}

            {joueurs.length === 0 ? (
              <div style={{ ...st.card, textAlign: 'center', padding: '3rem 1.5rem' }}>
                <p style={{ margin: 0, color: colors.text.secondary, fontWeight: 600 }}>{t('equipe_aucun_joueur_effectif', lang)}</p>
                {canEdit('effectif') && <p style={{ margin: '6px 0 0', color: colors.text.faint, fontSize: '12px' }}>Ajoute tes joueurs un par un ou importe un fichier Excel.</p>}
              </div>
            ) : vueEquipe === 'liste' ? (
              <div style={{ ...st.card, padding: 0, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '640px' }}>
                  <thead>
                    <tr>
                      {['#', t('equipe_col_joueur', lang), t('equipe_col_age', lang), 'Statut', ''].map((h, i) => (
                        <th key={i} style={{ padding: '11px 14px', textAlign: i === 0 ? 'center' : 'left', color: colors.text.faint, fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', whiteSpace: 'nowrap', background: colors.background.raised, borderBottom: `1px solid ${colors.border.subtle}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...joueurs]
                      .sort((a, b) => {
                        const ordre = ['Gardien','Défenseur central','Latéral droit','Latéral gauche','Milieu défensif','Milieu central','Milieu offensif','Ailier droit','Ailier gauche','Attaquant']
                        return (ordre.indexOf(a.poste) === -1 ? 99 : ordre.indexOf(a.poste)) - (ordre.indexOf(b.poste) === -1 ? 99 : ordre.indexOf(b.poste))
                      })
                      .map((j) => {
                        const age = j.date_naissance ? Math.floor((new Date() - new Date(j.date_naissance)) / (365.25 * 24 * 3600 * 1000)) : null
                        const posColor = j.poste?.toLowerCase().includes('gardien') ? colors.accent.amber : j.poste && ['défenseur','defenseur','latéral','lateral'].some(k => j.poste.toLowerCase().includes(k)) ? colors.accent.blue : j.poste?.toLowerCase().includes('milieu') ? colors.accent.purpleLight : j.poste && ['attaquant','ailier'].some(k => j.poste.toLowerCase().includes(k)) ? colors.accent.green : colors.text.faint
                        const td = { padding: '9px 14px', borderBottom: `1px solid ${colors.border.subtle}` }
                        return (
                          <tr key={j.id} className="effectif-ligne">
                            <td style={{ ...td, textAlign: 'center', color: colors.text.faint, fontWeight: 800, width: '44px', fontVariantNumeric: 'tabular-nums' }}>{j.numero_maillot || '–'}</td>
                            <td style={{ ...td, boxShadow: `inset 3px 0 0 ${posColor}` }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setJoueurProfil(j)}>
                                <Avatar person={j} size={30} bg={posColor + '22'} border="none" textColor={posColor} />
                                <div style={{ minWidth: 0 }}>
                                  <p style={{ margin: 0, fontWeight: 700 }}>{j.prenom} {j.nom}</p>
                                  <p style={{ margin: '1px 0 0', fontSize: '11px', color: colors.text.faint }}>{j.poste || '—'}</p>
                                </div>
                              </div>
                            </td>
                            <td style={{ ...td, color: colors.text.secondary, fontSize: '12px' }}>{age ? `${age} ans` : '–'}</td>
                            <td style={td}>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {j.joueur_id ? (
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: colors.accent.green, background: colors.accent.green + alpha.subtle, padding: '2px 8px', borderRadius: '6px' }}>Compte lié</span>
                                ) : j.email ? (
                                  <span title={j.email} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: colors.accent.amber, background: colors.accent.amber + alpha.subtle, padding: '2px 8px', borderRadius: '6px' }}><IcoMail />Invité</span>
                                ) : (
                                  <span style={{ fontSize: '11px', color: colors.text.faint }}>Sans compte</span>
                                )}
                                {j.numero_licence && <span style={{ fontSize: '11px', fontWeight: 700, color: colors.accent.blue, background: colors.accent.blue + alpha.subtle, padding: '2px 8px', borderRadius: '6px' }}>Licencié</span>}
                              </div>
                            </td>
                            <td style={{ ...td, textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                <button onClick={() => setJoueurProfil(j)} title={t('equipe_profil', lang)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', background: 'transparent', border: `1px solid ${colors.border.default}`, color: colors.text.secondary, borderRadius: '8px', cursor: 'pointer' }}><IcoProfil /></button>
                                {canEdit('effectif') && (
                                  <>
                                    <button onClick={() => setJoueurEnEdition({ ...j })} title={t('btn_modifier', lang)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', background: 'transparent', border: `1px solid ${colors.border.default}`, color: colors.text.secondary, borderRadius: '8px', cursor: 'pointer' }}><IcoCrayon /></button>
                                    <button onClick={() => supprimerJoueur(j.id)} title="Retirer de l'équipe" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', background: 'transparent', border: `1px solid ${colors.accent.red}40`, color: colors.accent.red, borderRadius: '8px', cursor: 'pointer' }}><IcoCorbeille /></button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
                <style>{`.effectif-ligne:hover td { background: ${colors.background.raised}; }`}</style>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {[
                  { label: t('stats_pres_gardiens', lang), color: colors.accent.amber, match: p => p?.toLowerCase().includes('gardien') },
                  { label: t('stats_pres_defenseurs', lang), color: colors.accent.blue, match: p => p && ['défenseur','defenseur','latéral','lateral'].some(k => p.toLowerCase().includes(k)) },
                  { label: t('stats_pres_milieux', lang), color: colors.accent.purpleLight, match: p => p?.toLowerCase().includes('milieu') },
                  { label: t('stats_pres_attaquants', lang), color: colors.accent.green, match: p => p && ['attaquant','ailier'].some(k => p.toLowerCase().includes(k)) },
                  { label: 'Sans poste', color: colors.text.faint, match: p => !p || !['gardien','défenseur','defenseur','latéral','lateral','milieu','attaquant','ailier'].some(k => p.toLowerCase().includes(k)) },
                ].map(groupe => {
                  const groupJoueurs = joueurs.filter(j => groupe.match(j.poste)).sort((a, b) => (Number(a.numero_maillot) || 99) - (Number(b.numero_maillot) || 99))
                  if (!groupJoueurs.length) return null
                  return (
                    <div key={groupe.label}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', paddingBottom: '8px', borderBottom: `1px solid ${colors.border.subtle}` }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: groupe.color }} />
                        <p style={{ margin: 0, fontSize: '11px', fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.text.secondary }}>{groupe.label}</p>
                        <span style={{ fontSize: '11px', color: colors.text.faint }}>{groupJoueurs.length}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(290px, 1fr))', gap: '10px' }}>
                        {groupJoueurs.map(j => {
                          const age = j.date_naissance ? Math.floor((new Date() - new Date(j.date_naissance)) / (365.25 * 24 * 3600 * 1000)) : null
                          const cat = j.club_categorie_id ? clubCategories.find(c => c.id === j.club_categorie_id) : null
                          // Catégorie affichée seulement si elle diffère de l'équipe active
                          // (sinon même étiquette répétée sur chaque carte).
                          const autreCat = cat && cat.id !== equipeActive?.id
                          return (
                            <div key={j.id} style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderLeft: `3px solid ${groupe.color}`, borderRadius: '12px', padding: '12px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <button onClick={() => setJoueurProfil(j)} title={t('equipe_profil', lang)} style={{ position: 'relative', flexShrink: 0, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                                  <Avatar person={j} size={46} bg={groupe.color + '22'} border={`2px solid ${groupe.color}55`} textColor={groupe.color} />
                                  {j.numero_maillot != null && j.numero_maillot !== '' && (
                                    <span style={{ position: 'absolute', bottom: '-4px', right: '-6px', minWidth: '20px', height: '20px', padding: '0 4px', borderRadius: '10px', background: colors.background.base, border: `1px solid ${colors.border.strong}`, fontSize: '10px', fontWeight: 800, color: colors.text.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>{j.numero_maillot}</span>
                                  )}
                                </button>
                                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setJoueurProfil(j)}>
                                  <p style={{ margin: 0, fontWeight: 700, color: colors.text.primary, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.prenom} {j.nom}</p>
                                  <p style={{ margin: '2px 0 0', color: colors.text.faint, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.poste || '—'}{age ? ` · ${age} ans` : ''}</p>
                                </div>
                                {autreCat && (
                                  <span style={{ padding: '3px 8px', borderRadius: '6px', background: colors.accent.green + '1a', color: colors.accent.green, fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>{cat.nom}-{cat.equipe}</span>
                                )}
                                <div className="joueur-menu-wrapper" style={{ position: 'relative', flexShrink: 0 }}>
                                  <button onClick={() => setOpenMenuJoueurId(openMenuJoueurId === j.id ? null : j.id)} title="Actions"
                                    style={{ background: 'transparent', border: `1px solid ${colors.border.default}`, borderRadius: '8px', color: colors.text.faint, fontSize: '14px', lineHeight: 1, width: '30px', height: '30px', cursor: 'pointer' }}>
                                    ···
                                  </button>
                                  {openMenuJoueurId === j.id && (
                                    <div style={{ position: 'absolute', right: 0, top: '110%', background: colors.background.surfaceAlt, border: `1px solid ${colors.border.default}`, borderRadius: '10px', zIndex: 100, minWidth: '190px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
                                      {[
                                        { Icone: IcoProfil, label: t('equipe_profil', lang), action: () => setJoueurProfil(j) },
                                        ...(canEdit('effectif') ? [{ Icone: IcoCrayon, label: t('btn_modifier', lang), action: () => setJoueurEnEdition({ ...j }) }] : []),
                                        ...(canEdit('effectif') ? [{ Icone: IcoCorbeille, label: 'Retirer de l\'équipe', action: () => supprimerJoueur(j.id), danger: true }] : []),
                                      ].map(item => (
                                        <button key={item.label} onClick={() => { item.action(); setOpenMenuJoueurId(null) }}
                                          style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '9px 12px', background: 'transparent', border: 'none', color: item.danger ? '#f87171' : colors.text.secondary, fontSize: '13px', cursor: 'pointer', textAlign: 'left', fontFamily: 'Inter, sans-serif' }}
                                          onMouseEnter={e => e.currentTarget.style.background = colors.background.raised}
                                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                          <item.Icone /> {item.label}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
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
              {[['tableau',t('stats_tab_tableau', lang)],['classement',t('stats_tab_classement', lang)],['graphiques',t('stats_tab_graphiques', lang)],['presence',t('stats_tab_presences', lang)],['mois',t('stats_tab_mois', lang)],['notes',t('stats_tab_notes', lang)]].map(([k, label]) => (
                <button key={k} onClick={() => setStatsSubTab(k)} style={{ background: 'transparent', border: 'none', borderBottom: statsSubTab === k ? '2px solid #60a5fa' : '2px solid transparent', color: statsSubTab === k ? colors.accent.blue : colors.text.faint, padding: '10px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', flexShrink: 0 }}>{label}</button>
              ))}
            </div>

            {joueurs.length === 0 ? (
              <div style={{ ...st.card, textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: colors.text.faint }}>Ajoute d'abord des joueurs dans "Mon équipe"</p>
              </div>
            ) : (
              <>
                {/* ─ Bilan de l'équipe (vue d'ensemble, avant le détail par joueur) ─ */}
                {statsSubTab === 'tableau' && (() => {
                  const notesEquipeMatch = notationsMatch.filter(n => n.est_note_equipe)
                  const noteEquipe = notesEquipeMatch.length
                    ? { moyenne: (notesEquipeMatch.reduce((s, n) => s + Number(n.note), 0) / notesEquipeMatch.length).toFixed(1), nb: notesEquipeMatch.length }
                    : null
                  return (
                  <div>
                    <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.text.secondary }}>Bilan de l'équipe</p>
                    <Suspense fallback={<SectionLoader />}><StatsEquipe matchs={matchs} noteEquipe={noteEquipe} /></Suspense>
                  </div>
                  )
                })()}

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
                    { label: 'Gardiens', postes: ['Gardien'], couleur: colors.accent.amber },
                    { label: 'Défenseurs', postes: ['Défenseur central', 'Latéral droit', 'Latéral gauche'], couleur: colors.accent.blue },
                    { label: 'Milieux', postes: ['Milieu défensif', 'Milieu central', 'Milieu offensif'], couleur: colors.accent.purpleLight },
                    { label: 'Attaquants', postes: ['Ailier droit', 'Ailier gauche', 'Attaquant'], couleur: colors.accent.green },
                  ]
                  const ligneDuPoste = (poste) => LIGNES_POSTE.findIndex(l => l.postes.includes(poste))
                  const joueursTries = [...joueurs].sort((a, b) => {
                    const la = ligneDuPoste(a.poste), lb = ligneDuPoste(b.poste)
                    return (la === -1 ? LIGNES_POSTE.length : la) - (lb === -1 ? LIGNES_POSTE.length : lb)
                  })
                  const nbParLigne = (idx) => joueurs.filter(j => ligneDuPoste(j.poste) === idx).length
                  const nbMatchsJoues = matchsTableauFiltres.filter(m => m.score_nous !== null && m.score_nous !== '').length
                  // Cartons dessinés en CSS (pas d'emoji) : petit rectangle coloré.
                  const carton = (c) => <span style={{ display: 'inline-block', width: '9px', height: '12px', borderRadius: '2px', background: c, verticalAlign: 'middle' }} />
                  const COLONNES = [
                    { k: 'joueur', l: t('equipe_col_joueur', lang), align: 'left' },
                    { k: 'mj', l: 'MJ', titre: 'Matchs joués' },
                    { k: 'min', l: 'Min', titre: 'Minutes jouées' },
                    { k: 'buts', l: t('comp_buts', lang) },
                    { k: 'pd', l: 'PD', titre: 'Passes décisives' },
                    { k: 'cs', l: 'CS', titre: 'Clean sheets' },
                    { k: 'cj', l: carton(colors.accent.amber), titre: 'Cartons jaunes' },
                    { k: 'cr', l: carton(colors.accent.red), titre: 'Cartons rouges' },
                    { k: 'presence', l: t('stats_col_presence', lang), align: 'left' },
                    { k: 'note', l: 'Note', titre: 'Note moyenne de match' },
                  ]
                  const tdBase = { padding: '10px 12px', textAlign: 'center', fontVariantNumeric: 'tabular-nums', borderBottom: `1px solid ${colors.border.subtle}`, whiteSpace: 'nowrap' }
                  const chiffre = (val, couleur, gras) => (
                    <td style={{ ...tdBase, color: val > 0 ? couleur : colors.text.ghost, fontWeight: val > 0 && gras ? 700 : 500 }}>{val > 0 ? val : '–'}</td>
                  )
                  const premiereCol = { position: 'sticky', left: 0, zIndex: 1, background: colors.background.surface }
                  return (
                  <div style={{ ...st.card, padding: 0, overflow: 'hidden', marginTop: '22px' }}>
                    <style>{`.stats-ligne-joueur:hover td { background: ${colors.background.raised} !important; }`}</style>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', padding: isMobile ? '14px' : '16px 18px', borderBottom: `1px solid ${colors.border.subtle}` }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '11px', fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.text.secondary }}>Statistiques individuelles</p>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: colors.text.faint }}>{joueurs.length} joueur{joueurs.length > 1 ? 's' : ''} · {nbMatchsJoues} match{nbMatchsJoues > 1 ? 's' : ''} joué{nbMatchsJoues > 1 ? 's' : ''}</p>
                      </div>
                      {competitionsDispo.length > 1 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {[{ key: 'all', label: 'Toutes compétitions' }, ...competitionsDispo.map(c => ({ key: c, label: c }))].map(f => {
                            const actif = filtreCompTableau === f.key
                            return (
                              <button key={f.key} onClick={() => setFiltreCompTableau(f.key)}
                                style={{ padding: '6px 14px', borderRadius: '16px', border: `1px solid ${actif ? colors.accent.green : colors.border.default}`, cursor: 'pointer', fontSize: '12px', fontFamily: 'Inter, sans-serif', background: actif ? colors.accent.green + '1f' : 'transparent', color: actif ? colors.accent.green : colors.text.faint, fontWeight: actif ? 700 : 500, whiteSpace: 'nowrap' }}>
                                {f.label}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '13px', minWidth: '760px' }}>
                      <thead>
                        <tr>
                          {COLONNES.map((c, idx) => (
                            <th key={c.k} title={c.titre} style={{ padding: '10px 12px', textAlign: c.align || 'center', color: colors.text.faint, fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', whiteSpace: 'nowrap', background: colors.background.raised, borderBottom: `1px solid ${colors.border.subtle}`, ...(idx === 0 ? { ...premiereCol, background: colors.background.raised, zIndex: 2 } : {}) }}>{c.l}</th>
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
                          const groupe = ligne === -1 ? { label: 'Autres', couleur: colors.text.faint } : LIGNES_POSTE[ligne]
                          const couleurTx = tx ? (tx.taux >= 80 ? colors.accent.green : tx.taux >= 50 ? colors.accent.amber : colors.accent.red) : null
                          const couleurNote = note ? (note.moyenne >= 7 ? colors.accent.green : note.moyenne >= 5 ? colors.accent.amber : colors.accent.red) : null
                          return (
                            <Fragment key={j.id}>
                              {nouvelleLigne && (
                                <tr>
                                  <td colSpan={COLONNES.length} style={{ padding: '14px 14px 8px', borderBottom: `1px solid ${colors.border.subtle}`, background: colors.background.surface }}>
                                    <span style={{ position: 'sticky', left: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: groupe.couleur }} />
                                      <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.text.secondary }}>{groupe.label}</span>
                                      <span style={{ fontSize: '11px', color: colors.text.faint }}>{ligne === -1 ? joueurs.length - LIGNES_POSTE.reduce((acc, _, k) => acc + nbParLigne(k), 0) : nbParLigne(ligne)}</span>
                                    </span>
                                  </td>
                                </tr>
                              )}
                              <tr className="stats-ligne-joueur">
                                <td style={{ ...tdBase, ...premiereCol, textAlign: 'left', boxShadow: `inset 3px 0 0 ${groupe.couleur}` }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '170px' }}>
                                    <Avatar person={j} size={32} bg={groupe.couleur + '22'} border={`1px solid ${groupe.couleur}55`} textColor={groupe.couleur} />
                                    <div style={{ minWidth: 0 }}>
                                      <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: colors.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>{j.prenom} {j.nom}</p>
                                      <p style={{ margin: '1px 0 0', fontSize: '11px', color: colors.text.faint }}>{j.poste || 'Poste non renseigné'}</p>
                                    </div>
                                  </div>
                                </td>
                                {chiffre(s.matchs, colors.text.primary)}
                                <td style={{ ...tdBase, color: s.minutes > 0 ? colors.text.secondary : colors.text.ghost }}>{s.minutes > 0 ? `${s.minutes}'` : '–'}</td>
                                {chiffre(s.buts, colors.accent.green, true)}
                                {chiffre(s.passes_dec, colors.accent.blue, true)}
                                {chiffre(s.clean_sheets, colors.accent.purpleLight, true)}
                                {chiffre(s.cartons_j, colors.accent.amber, true)}
                                {chiffre(s.cartons_r, colors.accent.red, true)}
                                <td style={{ ...tdBase, textAlign: 'left' }}>
                                  {tx !== null ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <div style={{ width: '56px', height: '5px', borderRadius: '3px', background: colors.background.base, overflow: 'hidden' }}>
                                        <div style={{ width: `${tx.taux}%`, height: '100%', background: couleurTx }} />
                                      </div>
                                      <span style={{ color: couleurTx, fontWeight: 700, fontSize: '12px', minWidth: '34px' }}>{tx.taux}%</span>
                                    </div>
                                  ) : <span style={{ color: colors.text.ghost }}>–</span>}
                                </td>
                                <td style={tdBase}>
                                  {note ? (
                                    <span title={`${note.nb} match${note.nb > 1 ? 's' : ''} noté${note.nb > 1 ? 's' : ''}`}
                                      style={{ display: 'inline-flex', alignItems: 'baseline', gap: '1px', padding: '3px 9px', borderRadius: '8px', background: couleurNote + '1a', border: `1px solid ${couleurNote}40`, color: couleurNote, fontWeight: 800, fontSize: '13px' }}>
                                      {note.moyenne}<span style={{ fontSize: '10px', fontWeight: 600, color: colors.text.faint }}>/10</span>
                                    </span>
                                  ) : <span style={{ color: colors.text.ghost }}>–</span>}
                                </td>
                              </tr>
                            </Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                    </div>
                    <p style={{ margin: 0, padding: '10px 18px', fontSize: '11px', color: colors.text.faint, borderTop: `1px solid ${colors.border.subtle}`, display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                      <span>MJ matchs joués</span><span>PD passes décisives</span><span>CS clean sheets</span><span>Note : moyenne des notes de match</span>
                    </p>
                  </div>
                  )
                })()}

                {/* ─ Classement ─ */}
                {statsSubTab === 'classement' && (() => {
                  // Même filtre compétition que l'onglet Tableau (filtreCompTableau
                  // partagé, cf. plus haut) — competition est un champ texte libre,
                  // pas d'enum figé Championnat/Coupe/Amical en dur. Ne joue que sur
                  // buts/passes/victoires/minutes (statsGlobalesJoueur accepte déjà un
                  // matchsScope) et la note éducateur (via matchIdsFiltres, même
                  // logique que noteMoyenne dans l'onglet Tableau) — la présence est
                  // basée sur les entraînements, pas les matchs, donc non affectée.
                  const competitionsDispo = [...new Set(matchs.map(m => m.competition).filter(Boolean))]
                  const matchsFiltres = filtreCompTableau === 'all' ? matchs : matchs.filter(m => m.competition === filtreCompTableau)
                  const matchIdsFiltresClassement = new Set(matchsFiltres.map(m => m.id))
                  const withStats = joueurs.map(j => ({ ...j, s: statsGlobalesJoueur(j.id, matchsFiltres), tx: tauxPresence(j.id), note: noteMoyenneMatch(j.id, matchIdsFiltresClassement) }))
                  const TRIS = [
                    { key: 'buts', label: t('stats_filtre_buteurs', lang), get: j => j.s.buts, color: colors.accent.green, unite: v => v > 1 ? 'buts' : 'but', Icone: IcoBallon },
                    { key: 'passes_dec', label: t('stats_filtre_passeurs', lang), get: j => j.s.passes_dec, color: colors.accent.blue, unite: v => v > 1 ? 'passes' : 'passe', Icone: IcoCible },
                    { key: 'victoires', label: t('stats_filtre_victoires', lang), get: j => j.s.victoires, color: colors.accent.amber, unite: v => v > 1 ? 'victoires' : 'victoire', Icone: IcoCoupe },
                    { key: 'minutes', label: t('stats_filtre_temps', lang), get: j => j.s.minutes, color: colors.accent.purpleLight, unite: () => 'min', Icone: IcoHorloge },
                    { key: 'presence', label: t('stats_filtre_presence', lang), get: j => j.tx?.taux ?? 0, color: '#34d399', unite: () => '%', Icone: IcoPresence },
                    { key: 'note', label: t('stats_filtre_note_edu', lang), get: j => j.note?.moyenne ?? 0, color: colors.accent.amber, unite: () => '/10', Icone: IcoStar },
                  ]
                  const triActif = TRIS.find(t => t.key === statsTri) || TRIS[0]
                  const sorted = [...withStats].sort((a, b) => triActif.get(b) - triActif.get(a))
                  const formater = (val) => typeof val === 'number' && !Number.isInteger(val) ? val.toFixed(1) : val
                  const podium = sorted.slice(0, 3)
                  const { Icone: IconeTri } = triActif
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <style>{`.classement-ligne:hover td { background: ${colors.background.raised}; }`}</style>
                      {/* Filtre compétition */}
                      {competitionsDispo.length > 1 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {[{ key: 'all', label: 'Toutes compétitions' }, ...competitionsDispo.map(c => ({ key: c, label: c }))].map(f => {
                            const actif = filtreCompTableau === f.key
                            return (
                              <button key={f.key} onClick={() => setFiltreCompTableau(f.key)}
                                style={{ padding: '7px 16px', borderRadius: '18px', border: `1px solid ${actif ? colors.accent.green : colors.border.default}`, cursor: 'pointer', fontSize: '13px', fontFamily: 'Inter, sans-serif', background: actif ? colors.accent.green + '1f' : 'transparent', color: actif ? colors.accent.green : colors.text.faint, fontWeight: actif ? 700 : 500, whiteSpace: 'nowrap' }}>
                                {f.label}
                              </button>
                            )
                          })}
                        </div>
                      )}

                      {/* Sélecteur de critère */}
                      <div className="filtres-scroll" style={{ display: 'flex', gap: '8px', flexWrap: isMobile ? 'nowrap' : 'wrap', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '2px' }}>
                        {TRIS.map(tr => {
                          const actif = triActif.key === tr.key
                          const { Icone } = tr
                          return (
                            <button key={tr.key} onClick={() => setStatsTri(tr.key)}
                              style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '7px', background: actif ? tr.color + '1f' : colors.background.surface, border: `1px solid ${actif ? tr.color + '70' : colors.border.default}`, color: actif ? tr.color : colors.text.secondary, padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: actif ? 700 : 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                              <span style={{ display: 'inline-flex', color: actif ? tr.color : colors.text.faint }}><Icone /></span>{tr.label}
                            </button>
                          )
                        })}
                      </div>

                      {/* Podium : le n°1 au centre, en avant ; le n°2 à gauche, le n°3 à droite. */}
                      {podium.length > 0 && (
                        <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: isMobile ? '14px 10px 16px' : '18px 24px 22px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: isMobile ? '14px' : '20px', color: colors.text.primary }}>
                            <span style={{ display: 'inline-flex', color: triActif.color }}><IconeTri /></span>
                            <span style={{ fontSize: '15px', fontWeight: 800 }}>Meilleurs {triActif.label.toLowerCase()}</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${[1, 0, 2].filter(r => podium[r]).length}, minmax(0,1fr))`, alignItems: 'end', gap: isMobile ? '6px' : '20px' }}>
                            {[1, 0, 2].filter(r => podium[r]).map(rang => {
                              const j = podium[rang]
                              const val = triActif.get(j)
                              const premier = rang === 0
                              const taille = isMobile ? (premier ? 64 : 46) : (premier ? 92 : 64)
                              return (
                                <div key={j.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minWidth: 0, paddingBottom: premier ? 0 : (isMobile ? 4 : 10) }}>
                                  <div style={{ position: 'relative', marginBottom: '10px' }}>
                                    <span style={{ display: 'flex', borderRadius: '50%', padding: '3px', border: `2px solid ${premier ? triActif.color : colors.border.default}`, boxShadow: premier ? `0 0 0 4px ${triActif.color}22` : 'none' }}>
                                      <Avatar person={j} size={taille} bg={triActif.color + '20'} border="none" textColor={triActif.color} />
                                    </span>
                                    <span style={{ position: 'absolute', top: premier ? '-6px' : '-4px', left: '50%', transform: 'translateX(-50%)', minWidth: premier ? '26px' : '22px', height: premier ? '26px' : '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: premier ? '13px' : '12px', fontWeight: 800, color: premier ? colors.black : colors.text.secondary, background: premier ? triActif.color : colors.background.raised, border: `1px solid ${premier ? triActif.color : colors.border.default}` }}>{rang + 1}</span>
                                  </div>
                                  <p style={{ margin: 0, maxWidth: '100%', fontWeight: 800, fontSize: isMobile ? (premier ? '13px' : '11px') : (premier ? '16px' : '14px'), lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: isMobile ? 'normal' : 'nowrap' }}>{j.prenom} {j.nom}</p>
                                  <p style={{ margin: '2px 0 0', maxWidth: '100%', fontSize: '11px', color: colors.text.faint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.poste || 'Poste non renseigné'}</p>
                                  <p style={{ margin: '8px 0 0', fontSize: isMobile ? (premier ? '28px' : '22px') : (premier ? '40px' : '30px'), fontWeight: 800, lineHeight: 1, color: triActif.color, fontVariantNumeric: 'tabular-nums' }}>{formater(val)}</p>
                                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: colors.text.faint }}>{triActif.unite(Number(val))}</p>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Classement complet */}
                      <div style={{ ...st.card, margin: 0, padding: 0, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', tableLayout: 'fixed' }}>
                          <colgroup>
                            <col style={{ width: isMobile ? '36px' : '64px' }} />
                            <col />
                            {!isMobile && <col style={{ width: '30%' }} />}
                            <col style={{ width: isMobile ? '70px' : '140px' }} />
                          </colgroup>
                          <thead>
                            <tr>
                              {['#', t('equipe_col_joueur', lang), ...(isMobile ? [] : [t('equipe_poste', lang)])].map((h, idx) => (
                                <th key={idx} style={{ padding: '12px', color: colors.text.faint, fontWeight: 700, fontSize: '11px', letterSpacing: '0.6px', textTransform: 'uppercase', textAlign: idx === 0 ? 'center' : 'left', background: colors.background.raised, borderBottom: `1px solid ${colors.border.subtle}` }}>{h}</th>
                              ))}
                              <th style={{ padding: '12px 16px', color: triActif.color, fontWeight: 700, fontSize: '11px', letterSpacing: '0.6px', textTransform: 'uppercase', textAlign: 'right', background: colors.background.raised, borderBottom: `1px solid ${colors.border.subtle}` }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><IconeTri />{isMobile ? '' : triActif.label}</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {sorted.map((j, i) => {
                              const val = triActif.get(j)
                              const nul = !Number(val)
                              return (
                                <tr key={j.id} className="classement-ligne">
                                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: i < 3 ? colors.text.secondary : colors.text.faint, borderBottom: `1px solid ${colors.border.subtle}` }}>{i + 1}</td>
                                  <td style={{ padding: '8px 12px', borderBottom: `1px solid ${colors.border.subtle}` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                      <Avatar person={j} size={30} />
                                      <div style={{ minWidth: 0 }}>
                                        <p style={{ margin: 0, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.prenom} {j.nom}</p>
                                        {isMobile && <p style={{ margin: '1px 0 0', fontSize: '11px', color: colors.text.faint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.poste || '—'}</p>}
                                      </div>
                                    </div>
                                  </td>
                                  {!isMobile && <td style={{ padding: '10px 12px', color: colors.text.faint, borderBottom: `1px solid ${colors.border.subtle}`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.poste || '—'}</td>}
                                  <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 800, fontSize: '15px', fontVariantNumeric: 'tabular-nums', color: nul ? colors.text.ghost : triActif.color, borderBottom: `1px solid ${colors.border.subtle}` }}>
                                    {formater(val)}{triActif.key === 'presence' ? '%' : triActif.key === 'minutes' && !nul ? "'" : ''}
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
                  // V2 : graphiques rangés par thème (attaque / temps de jeu /
                  // discipline), même filtre compétition que Tableau et Classement,
                  // top 8 par carte avec « Voir tous » pour éviter les listes de 20
                  // lignes. Titres traduits partagés avec DashboardClub : emoji retiré
                  // à l'affichage plutôt que dans translations.js.
                  const sansEmoji = (txt) => txt.replace(/^[^\p{L}\p{N}]+/u, '')
                  const competitionsDispo = [...new Set(matchs.map(m => m.competition).filter(Boolean))]
                  const matchsFiltres = filtreCompTableau === 'all' ? matchs : matchs.filter(m => m.competition === filtreCompTableau)
                  const withStats = joueurs.map(j => ({ j, label: `${j.prenom} ${j.nom?.[0] || ''}.`, ...statsGlobalesJoueur(j.id, matchsFiltres) }))
                  const carton = (c) => <span style={{ display: 'inline-block', width: '11px', height: '15px', borderRadius: '2px', background: c }} />
                  const SECTIONS = [
                    { titre: 'Attaque', graphiques: [
                      { title: t('stats_graph_buteurs', lang), key: 'buts', color: colors.accent.green, icone: <IcoBallon /> },
                      { title: t('stats_graph_passes', lang), key: 'passes_dec', color: colors.accent.blue, icone: <IcoCible /> },
                    ] },
                    { titre: 'Temps de jeu', graphiques: [
                      { title: t('stats_graph_minutes', lang), key: 'minutes', color: colors.accent.purpleLight, unit: "'", icone: <IcoHorloge />, moyenne: true },
                      { title: t('stats_graph_matchs', lang), key: 'matchs', color: colors.accent.amber, icone: <IcoCalendar />, moyenne: true },
                    ] },
                    { titre: 'Discipline', graphiques: [
                      { title: t('stats_graph_cartons_j', lang), key: 'cartons_j', color: colors.accent.amber, icone: carton(colors.accent.amber), vide: 'Aucun carton jaune' },
                      { title: t('stats_graph_cartons_r', lang), key: 'cartons_r', color: colors.accent.red, icone: carton(colors.accent.red), vide: 'Aucun carton rouge' },
                    ] },
                  ]
                  const LIMITE = 8
                  const carteGraphique = ({ title, key, color, unit = '', icone, moyenne, vide }) => {
                    const data = [...withStats].sort((a, b) => b[key] - a[key]).filter(d => d[key] > 0)
                    const totalVal = data.reduce((acc, d) => acc + d[key], 0)
                    const max = data[0]?.[key] || 1
                    const deplie = !!graphDeplies[key]
                    const visibles = deplie ? data : data.slice(0, LIMITE)
                    const resume = data.length === 0 ? null
                      : moyenne ? `Moyenne ${Math.round(totalVal / data.length)}${unit} · ${data.length} joueurs`
                      : `Total ${totalVal} · ${data.length} joueur${data.length > 1 ? 's' : ''}`
                    return (
                      <div key={key} style={{ ...st.card, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ width: '34px', height: '34px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: color + '1f', color, flexShrink: 0 }}>{icone}</span>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{sansEmoji(title)}</p>
                            {resume && <p style={{ margin: '2px 0 0', fontSize: '12px', color: colors.text.faint }}>{resume}</p>}
                          </div>
                        </div>
                        {data.length === 0 ? (
                          <p style={{ margin: 0, padding: '14px', borderRadius: '10px', background: colors.background.base, color: colors.text.faint, fontSize: '13px', textAlign: 'center' }}>{vide || t('msg_aucune_donnee', lang)}</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {visibles.map((d, i) => (
                              <div key={d.j.id} style={{ display: 'grid', gridTemplateColumns: `18px 26px ${isMobile ? '84px' : '110px'} minmax(0,1fr) 48px`, alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: i === 0 ? color : colors.text.faint, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                                <Avatar person={d.j} size={26} />
                                <span title={`${d.j.prenom} ${d.j.nom}`} style={{ fontSize: '13px', fontWeight: i === 0 ? 700 : 500, color: i === 0 ? colors.text.primary : colors.text.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
                                <div style={{ height: '8px', borderRadius: '4px', background: colors.background.base, overflow: 'hidden' }}>
                                  <div style={{ width: `${(d[key] / max) * 100}%`, minWidth: '6px', height: '100%', borderRadius: '4px', background: color, opacity: i === 0 ? 1 : 0.7, transition: 'width 0.4s ease' }} />
                                </div>
                                <span style={{ fontSize: '13px', fontWeight: 800, color: i === 0 ? color : colors.text.primary, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{d[key]}{unit}</span>
                              </div>
                            ))}
                            {data.length > LIMITE && (
                              <button onClick={() => setGraphDeplies(prev => ({ ...prev, [key]: !prev[key] }))}
                                style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '2px', background: 'transparent', border: 'none', padding: '4px 0', color: colors.text.faint, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                                {deplie ? 'Réduire' : `Voir les ${data.length} joueurs`}<IcoChevronBas ouvert={deplie} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  }
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                      {competitionsDispo.length > 1 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {[{ key: 'all', label: 'Toutes compétitions' }, ...competitionsDispo.map(c => ({ key: c, label: c }))].map(f => {
                            const actif = filtreCompTableau === f.key
                            return (
                              <button key={f.key} onClick={() => setFiltreCompTableau(f.key)}
                                style={{ padding: '7px 16px', borderRadius: '18px', border: `1px solid ${actif ? colors.accent.green : colors.border.default}`, cursor: 'pointer', fontSize: '13px', fontFamily: 'Inter, sans-serif', background: actif ? colors.accent.green + '1f' : 'transparent', color: actif ? colors.accent.green : colors.text.faint, fontWeight: actif ? 700 : 500, whiteSpace: 'nowrap' }}>
                                {f.label}
                              </button>
                            )
                          })}
                        </div>
                      )}
                      {SECTIONS.map(sec => (
                        <div key={sec.titre}>
                          <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.text.secondary }}>{sec.titre}</p>
                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0,1fr))', gap: '16px', alignItems: 'start' }}>
                            {sec.graphiques.map(carteGraphique)}
                          </div>
                        </div>
                      ))}
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
                  // Même repli sur le sondage que tauxPresence — sans lui, un mois
                  // où l'éducateur n'avait pas validé les présences (seulement les
                  // réponses des joueurs) disparaissait du détail mensuel.
                  const presenceParMois = (joueurId) => {
                    const joueur = joueurs.find(j => j.id === joueurId)
                    const mois = {}
                    entrainements.forEach(e => {
                      if (!seanceComptable(e.date)) return
                      const st = statutPresenceEffectif(
                        (e.presences_entrainement || []).find(pr => pr.joueur_id === joueurId),
                        joueur?.joueur_id ? dispoJoueurs[e.id]?.[joueur.joueur_id] : null,
                      )
                      if (!st) return
                      const d = new Date(e.date)
                      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
                      if (!mois[key]) mois[key] = { presents:0, convoque:0, absents:0, blesses:0, malade:0, total:0 }
                      mois[key].total++
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
                  // V2 : synthèse unique (taux global + barre segmentée par statut),
                  // joueurs par poste en cartes compactes (statuts en pastilles, pas
                  // d'emoji), classement en lignes avec photo, top 10 + « Voir tous ».
                  const STATUTS_PRES = [
                    { key: 'presents', label: t('stats_statut_present', lang), color: colors.accent.green },
                    { key: 'convoque', label: t('stats_statut_convoqu', lang), color: colors.accent.blue },
                    { key: 'absents', label: t('stats_statut_absent', lang), color: colors.accent.red },
                    { key: 'blesses', label: t('stats_statut_blesse', lang), color: colors.accent.orange },
                    { key: 'malade', label: t('stats_statut_malade', lang), color: colors.accent.purple },
                  ]
                  const totauxPres = { presents: totalPresents, convoque: totalConvoques, absents: totalAbsents, blesses: totalBlesses, malade: totalMalades }
                  const totPres = totalPresents + totalConvoques + totalAbsents + totalBlesses + totalMalades
                  // Convoqués comptés comme présents (même règle que tauxPresence).
                  const tauxGlobal = totPres ? Math.round((totalPresents + totalConvoques) / totPres * 100) : 0
                  const couleurTaux = (tx) => tx >= 80 ? colors.accent.green : tx >= 50 ? colors.accent.amber : colors.accent.red
                  const GROUPES_PRES = [
                    { label: t('stats_pres_gardiens', lang), color: colors.accent.amber, match: p => p?.toLowerCase().includes('gardien') },
                    { label: t('stats_pres_defenseurs', lang), color: colors.accent.blue, match: p => p && ['défenseur','defenseur','latéral','lateral'].some(k => p.toLowerCase().includes(k)) },
                    { label: t('stats_pres_milieux', lang), color: colors.accent.purpleLight, match: p => p?.toLowerCase().includes('milieu') },
                    { label: t('stats_pres_attaquants', lang), color: colors.accent.green, match: p => p && ['attaquant','ailier'].some(k => p.toLowerCase().includes(k)) },
                    { label: 'Autres', color: colors.text.faint, match: p => !p || !['gardien','défenseur','defenseur','latéral','lateral','milieu','attaquant','ailier'].some(k => p.toLowerCase().includes(k)) },
                  ]
                  const eyebrowPres = { margin: 0, fontSize: '11px', fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.text.secondary }
                  const classementPres = joueurs.map(j => ({ j, tx: tauxPresence(j.id) })).filter(d => d.tx).sort((a, b) => b.tx.taux - a.tx.taux)
                  const presDeplie = !!graphDeplies.classement_presence
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                      {/* Synthèse */}
                      <div style={{ ...st.card, margin: 0 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'auto minmax(0,1fr)', gap: isMobile ? '14px' : '32px', alignItems: 'center' }}>
                          <div>
                            <p style={eyebrowPres}>{t('stats_pres_presence', lang)}</p>
                            <p style={{ margin: '6px 0 0', fontSize: '36px', fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: totPres ? couleurTaux(tauxGlobal) : colors.text.faint }}>
                              {tauxGlobal}<span style={{ fontSize: '16px', color: colors.text.faint, marginLeft: '2px' }}>%</span>
                            </p>
                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: colors.text.faint }}>{totalPresents + totalConvoques} présences sur {totPres} réponses</p>
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', height: '10px', borderRadius: '6px', overflow: 'hidden', background: colors.background.base, gap: totPres ? '2px' : 0 }}>
                              {STATUTS_PRES.map(sp => totauxPres[sp.key] > 0 && <div key={sp.key} style={{ width: `${(totauxPres[sp.key] / totPres) * 100}%`, background: sp.color }} />)}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, minmax(0,1fr))' : 'repeat(5, minmax(0,1fr))', gap: '10px', marginTop: '14px' }}>
                              {STATUTS_PRES.map(sp => (
                                <div key={sp.key} style={{ display: 'flex', flexDirection: 'column', gap: '2px', opacity: totauxPres[sp.key] ? 1 : 0.45 }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: colors.text.faint, whiteSpace: 'nowrap' }}>
                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: sp.color, flexShrink: 0 }} />{sp.label}
                                  </span>
                                  {/* Compteur brut affiché même si l'arrondi tombe à 0 % (1 ou 2 cas
                                      sur des centaines de réponses), sinon le statut paraît absent. */}
                                  <span style={{ fontSize: '17px', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: totauxPres[sp.key] ? sp.color : colors.text.faint }}>
                                    {totPres ? Math.round(totauxPres[sp.key] / totPres * 100) : 0}%
                                    <span style={{ fontSize: '11px', fontWeight: 600, color: colors.text.faint, marginLeft: '4px' }}>{totauxPres[sp.key]}</span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Joueurs par poste */}
                      {GROUPES_PRES.map(groupe => {
                        const gJoueurs = joueurs.filter(j => groupe.match(j.poste))
                        if (!gJoueurs.length) return null
                        return (
                          <div key={groupe.label}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', paddingBottom: '8px', borderBottom: `1px solid ${colors.border.subtle}` }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: groupe.color }} />
                              <p style={eyebrowPres}>{groupe.label}</p>
                              <span style={{ fontSize: '11px', color: colors.text.faint }}>{gJoueurs.length}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(290px, 1fr))', gap: '10px', alignItems: 'start' }}>
                              {gJoueurs.map(j => {
                                const tx = tauxPresence(j.id)
                                const ouvert = joueurMoisDetail === j.id
                                return (
                                  <div key={j.id} style={{ ...st.card, margin: 0, padding: '14px 16px', borderLeft: `3px solid ${groupe.color}` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                      <DonutMulti presents={tx?.presents || 0} absents={tx?.absents || 0} blesses={tx?.blesses || 0} malade={tx?.malade || 0} convoque={tx?.convoque || 0} size={64} person={j} />
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.prenom} {j.nom}</p>
                                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.faint }}>{j.poste || '—'}{tx ? ` · ${tx.total} ${tx.total > 1 ? t('stats_seances_plural', lang) : t('stats_seance_singular', lang)}` : ''}</p>
                                        {tx ? (
                                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', marginTop: '8px' }}>
                                            {STATUTS_PRES.filter(sp => tx[sp.key] > 0).map(sp => (
                                              <span key={sp.key} title={sp.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: colors.text.secondary }}>
                                                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: sp.color }} />
                                                <strong style={{ color: sp.color, fontVariantNumeric: 'tabular-nums' }}>{tx[sp.key]}</strong>{sp.label}
                                              </span>
                                            ))}
                                          </div>
                                        ) : (
                                          <p style={{ margin: '6px 0 0', fontSize: '11px', color: colors.text.faint }}>Aucune présence saisie</p>
                                        )}
                                      </div>
                                    </div>
                                    {tx && (
                                      <button onClick={() => setJoueurMoisDetail(ouvert ? null : j.id)}
                                        style={{ marginTop: '12px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: ouvert ? colors.background.raised : 'transparent', border: `1px solid ${colors.border.subtle}`, borderRadius: '8px', color: colors.text.faint, fontSize: '12px', fontWeight: 600, padding: '6px 10px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                                        Détail par mois <IcoChevronBas ouvert={ouvert} />
                                      </button>
                                    )}
                                    {ouvert && (() => {
                                      const moisData = presenceParMois(j.id)
                                      if (!moisData.length) return null
                                      return (
                                        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                          {moisData.map(m => {
                                            const color = couleurTaux(m.taux)
                                            return (
                                              <div key={m.key} style={{ display: 'grid', gridTemplateColumns: '96px minmax(0,1fr) 38px 36px', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '11px', color: colors.text.faint, textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.label}</span>
                                                <div style={{ height: '6px', background: colors.background.base, borderRadius: '3px', overflow: 'hidden' }}>
                                                  <div style={{ width: `${m.taux}%`, height: '100%', background: color, borderRadius: '3px' }} />
                                                </div>
                                                <span style={{ fontSize: '12px', fontWeight: 700, color, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{m.taux}%</span>
                                                <span style={{ fontSize: '10px', color: colors.text.faint, fontVariantNumeric: 'tabular-nums' }}>{m.presents + m.convoque}/{m.total}</span>
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

                      {/* Classement par taux de présence */}
                      <div style={{ ...st.card, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ width: '34px', height: '34px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.accent.green + '1f', color: colors.accent.green, flexShrink: 0 }}><IcoPresence /></span>
                          <div>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>Classement par taux de présence</p>
                            {classementPres.length > 0 && <p style={{ margin: '2px 0 0', fontSize: '12px', color: colors.text.faint }}>{classementPres.filter(d => d.tx.taux >= 80).length} joueur{classementPres.filter(d => d.tx.taux >= 80).length > 1 ? 's' : ''} à 80 % ou plus</p>}
                          </div>
                        </div>
                        {classementPres.length === 0 ? (
                          <p style={{ margin: 0, padding: '14px', borderRadius: '10px', background: colors.background.base, color: colors.text.faint, fontSize: '13px', textAlign: 'center' }}>Commence à saisir les présences dans l'onglet Entraînements</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {(presDeplie ? classementPres : classementPres.slice(0, 10)).map(({ j, tx }, i) => {
                              const color = couleurTaux(tx.taux)
                              return (
                                <div key={j.id} style={{ display: 'grid', gridTemplateColumns: `20px 26px ${isMobile ? '90px' : '160px'} minmax(0,1fr) 46px`, alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: colors.text.faint, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                                  <Avatar person={j} size={26} />
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: colors.text.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isMobile ? `${j.prenom} ${j.nom?.[0] || ''}.` : `${j.prenom} ${j.nom}`}</span>
                                  <div style={{ height: '8px', borderRadius: '4px', background: colors.background.base, overflow: 'hidden' }}>
                                    <div style={{ width: `${tx.taux}%`, height: '100%', borderRadius: '4px', background: color }} />
                                  </div>
                                  <span style={{ fontSize: '13px', fontWeight: 800, color, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{tx.taux}%</span>
                                </div>
                              )
                            })}
                            {classementPres.length > 10 && (
                              <button onClick={() => setGraphDeplies(prev => ({ ...prev, classement_presence: !prev.classement_presence }))}
                                style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', padding: '4px 0', color: colors.text.faint, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                                {presDeplie ? 'Réduire' : `Voir les ${classementPres.length} joueurs`}<IcoChevronBas ouvert={presDeplie} />
                              </button>
                            )}
                          </div>
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

              // Historique : mois choisi dans la frise ci-dessous, mois en
              // cours par défaut tant qu'aucun n'a été cliqué. Si le mois
              // sélectionné n'a plus de données (ex: changement d'équipe),
              // on retombe silencieusement sur le mois en cours.
              const moisActif = (moisPointsSeanceSelectionne && pointsParJoueurMois[moisPointsSeanceSelectionne]) ? moisPointsSeanceSelectionne : moisCourant
              const podiumActuel = getPodium(moisActif)
              const topAll = totalPoints()
              const medals = ['🥇', '🥈', '🥉']

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <ExplicationPtsSeance />
                  {/* Historique des mois — clique un mois pour voir son classement */}
                  {moisKeys.length > 1 && (
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                      {moisKeys.map(k => (
                        <button key={k} onClick={() => setMoisPointsSeanceSelectionne(k)} style={{
                          flexShrink: 0, padding: '8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                          whiteSpace: 'nowrap', textTransform: 'capitalize',
                          background: k === moisActif ? colors.accent.amber : colors.background.surface,
                          color: k === moisActif ? colors.black : colors.text.secondary,
                          border: `1px solid ${k === moisActif ? colors.accent.amber : colors.border.subtle}`,
                        }}>
                          {k === moisCourant ? t('stats_mois_en_cours', lang) : moisLabel(k)}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Mois sélectionné (en cours par défaut) */}
                  <div style={st.card}>
                    <p style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '16px' }}>🌟 {t('stats_joueur_du_mois', lang)} — {moisLabel(moisActif)}</p>
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

            {/* ─ Notes de séance (ressenti joueurs) ─ */}
            {statsSubTab === 'notes' && (() => {
              const demandesTriees = Object.values(demandesNote).sort((a, b) => (b.date_seance || '').localeCompare(a.date_seance || ''))
              // Légende de l'échelle RPE (cf. lib/rpe) — repliable, ouverte
              // tant que l'éducateur n'a encore aucune demande de ressenti.
              const legendeRpe = (
                <details open={demandesTriees.length === 0} style={{ ...st.card, margin: '0 0 12px', padding: '14px 18px' }}>
                  <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', listStyle: 'none' }}>
                    <span>
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.text.secondary }}>Échelle RPE · effort perçu</span>
                      <span style={{ display: 'block', marginTop: '4px', fontSize: '12px', color: colors.text.faint, lineHeight: 1.5 }}>{DEFINITION_RPE}</span>
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: colors.accent.blue, whiteSpace: 'nowrap' }}>Légende</span>
                  </summary>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: '8px', marginTop: '12px' }}>
                    {ZONES_RPE.map(z => {
                      const c = colors.accent[z.couleur]
                      return (
                        <div key={z.min} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '10px', background: c + '12', border: `1px solid ${c}33` }}>
                          <span style={{ minWidth: '42px', padding: '4px 0', textAlign: 'center', borderRadius: '7px', background: c, color: colors.black, fontSize: '13px', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{z.min === z.max ? z.min : `${z.min}-${z.max}`}</span>
                          <span style={{ minWidth: 0 }}>
                            <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: colors.text.primary }}>{z.label}</span>
                            {z.exemple && <span style={{ display: 'block', fontSize: '11px', color: colors.text.faint }}>{z.exemple}</span>}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <p style={{ margin: '10px 0 0', fontSize: '11px', color: colors.text.faint }}>Le plaisir reste noté de 1 à 5. Les réponses données avant le passage au RPE (charge de travail sur 5) sont converties sur 10 et marquées « ≈ ».</p>
                </details>
              )
              if (demandesTriees.length === 0) {
                return (
                  <>
                  {legendeRpe}
                  <div style={{ ...st.card, textAlign: 'center', padding: '40px 20px' }}>
                    <p style={{ margin: 0, color: colors.text.secondary, fontSize: '14px', fontWeight: 600 }}>Aucune demande de ressenti envoyée</p>
                    <p style={{ margin: '6px 0 0', color: colors.text.faint, fontSize: '12px' }}>Demande le ressenti RPE depuis une séance, dans l'onglet Entraînements.</p>
                  </div>
                  </>
                )
              }
              // Pas de colonne "humeur" en base (seances_notes_joueurs n'a que
              // rpe (ou charge_travail avant le RPE)/notion_plaisir/mots_cles) — dérivée du plaisir,
              // nuancée à la baisse quand la séance était à la fois dure et peu
              // appréciée (charge haute + plaisir moyen/bas), plutôt qu'une
              // simple redite du chiffre déjà affiché dans la colonne Plaisir.
              const NIVEAUX_RESSENTI = [
                { label: 'Très bien', color: colors.accent.green },
                { label: 'Bien', color: colors.accent.amber },
                { label: 'Moyen', color: colors.accent.orange },
                { label: 'Difficile', color: colors.accent.red },
              ]
              const ressenti = (r) => {
                const score = r.notion_plaisir - ((rpeDeReponse(r)?.valeur ?? 0) >= 8 && r.notion_plaisir <= 3 ? 1 : 0)
                return NIVEAUX_RESSENTI[score >= 4 ? 0 : score >= 3 ? 1 : score >= 2 ? 2 : 3]
              }
              const couleurRpe = (v) => colors.accent[zoneRpe(v)?.couleur] || colors.text.faint
              // RPE d'une réponse : jauge sur 10 colorée selon la zone de
              // l'échelle, « ≈ » si convertie depuis l'ancienne charge sur 5.
              const jaugeRpe = (r) => {
                const rp = rpeDeReponse(r)
                if (!rp) return <span style={{ color: colors.text.ghost, fontSize: '12px' }}>—</span>
                const c = couleurRpe(rp.valeur)
                return (
                  <div title={rp.estime ? 'Converti depuis l’ancienne charge de travail sur 5' : zoneRpe(rp.valeur)?.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {Array.from({ length: 10 }, (_, k) => <span key={k} style={{ width: '5px', height: '6px', borderRadius: '2px', background: k < rp.valeur ? c : colors.background.base }} />)}
                    </div>
                    <span style={{ color: c, fontSize: '13px', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{rp.estime ? '≈' : ''}{rp.valeur}</span>
                  </div>
                )
              }
              const couleurPlaisir = (v) => v >= 4 ? colors.accent.green : v >= 3 ? colors.accent.amber : colors.accent.red
              const jauge = (val, color) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[1, 2, 3, 4, 5].map(n => <span key={n} style={{ width: '9px', height: '6px', borderRadius: '2px', background: n <= val ? color : colors.background.base }} />)}
                  </div>
                  <span style={{ color, fontSize: '13px', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{val}</span>
                </div>
              )
              const GRID_RESSENTI = 'minmax(170px, 1.1fr) minmax(0, 1.6fr) 110px 110px 104px'
              const ouvertParDefaut = demandesTriees[0].id
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {legendeRpe}
                  {demandesTriees.map(d => {
                    const reponses = reponsesNote.filter(r => r.demande_id === d.id)
                    const moy = (cle) => reponses.length ? (reponses.reduce((acc, r) => acc + r[cle], 0) / reponses.length) : null
                    const mPlaisir = moy('notion_plaisir')
                    const rpes = reponses.map(rpeDeReponse).filter(Boolean)
                    const mRpe = rpes.length ? rpes.reduce((acc, x) => acc + x.valeur, 0) / rpes.length : null
                    const rpeEstime = rpes.some(x => x.estime)
                    const ouvert = ressentiOuverts[d.id] ?? d.id === ouvertParDefaut
                    const dateD = new Date(`${d.date_seance}T12:00:00`)
                    const repartition = NIVEAUX_RESSENTI.map(n => ({ ...n, nb: reponses.filter(r => ressenti(r).label === n.label).length }))
                    const ouverte = d.statut === 'ouverte'
                    return (
                      <div key={d.id} style={{ background: colors.background.surface, borderRadius: '14px', border: `1px solid ${colors.border.subtle}`, overflow: 'hidden' }}>
                        <button onClick={() => setRessentiOuverts(prev => ({ ...prev, [d.id]: !ouvert }))}
                          style={{ width: '100%', display: 'grid', gridTemplateColumns: isMobile ? 'auto minmax(0,1fr) auto' : 'auto minmax(0,1fr) auto auto', alignItems: 'center', gap: isMobile ? '12px' : '20px', padding: isMobile ? '12px 14px' : '14px 18px', background: 'transparent', border: 'none', color: 'inherit', textAlign: 'left', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                          <div style={{ width: '52px', textAlign: 'center', border: `1px solid ${colors.border.default}`, borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                            <p style={{ margin: 0, padding: '2px 0', fontSize: '9px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: ouverte ? colors.black : colors.text.faint, background: ouverte ? colors.accent.green : colors.background.raised }}>{dateD.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}</p>
                            <p style={{ margin: 0, padding: '4px 0 0', fontSize: '20px', fontWeight: 800, lineHeight: 1 }}>{dateD.getDate()}</p>
                            <p style={{ margin: 0, padding: '1px 0 4px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: colors.text.faint }}>{dateD.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</p>
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.titre}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '6px', color: ouverte ? colors.accent.green : colors.text.faint, background: ouverte ? colors.accent.green + '1a' : colors.background.raised, border: `1px solid ${ouverte ? colors.accent.green + '40' : colors.border.default}` }}>{ouverte ? 'En cours' : 'Fermée'}</span>
                              <span style={{ fontSize: '12px', color: colors.text.faint }}>{reponses.length} réponse{reponses.length !== 1 ? 's' : ''}{joueurs.length ? ` / ${joueurs.length}` : ''}</span>
                            </div>
                            {reponses.length > 0 && (
                              <div style={{ display: 'flex', height: '5px', borderRadius: '3px', overflow: 'hidden', gap: '2px', marginTop: '8px', maxWidth: '260px' }}>
                                {repartition.map(n => n.nb > 0 && <div key={n.label} title={`${n.nb} ${n.label}`} style={{ width: `${(n.nb / reponses.length) * 100}%`, background: n.color }} />)}
                              </div>
                            )}
                          </div>
                          {!isMobile && reponses.length > 0 && (
                            <div style={{ display: 'flex', gap: '18px' }}>
                              {[['RPE', mRpe, couleurRpe, 10, rpeEstime], ['Plaisir', mPlaisir, couleurPlaisir, 5, false]].filter(([, val]) => val != null).map(([lab, val, coul, sur, estime]) => (
                                <div key={lab} style={{ textAlign: 'center' }}>
                                  <p style={{ margin: 0, fontSize: '20px', fontWeight: 800, lineHeight: 1, color: coul(val), fontVariantNumeric: 'tabular-nums' }}>{estime ? '≈' : ''}{val.toFixed(1)}<span style={{ fontSize: '11px', color: colors.text.faint, fontWeight: 600 }}>/{sur}</span></p>
                                  <p style={{ margin: '4px 0 0', fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: colors.text.faint }}>{lab}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          <span style={{ color: colors.text.faint, display: 'inline-flex' }}><IcoChevronBas ouvert={ouvert} /></span>
                        </button>

                        {ouvert && (
                          reponses.length === 0 ? (
                            <p style={{ margin: 0, padding: '16px 18px', borderTop: `1px solid ${colors.border.subtle}`, fontSize: '13px', color: colors.text.faint }}>Aucune réponse pour l'instant.</p>
                          ) : isMobile ? (
                            <div style={{ borderTop: `1px solid ${colors.border.subtle}` }}>
                              <div style={{ display: 'flex', gap: '18px', padding: '12px 14px', borderBottom: `1px solid ${colors.border.subtle}` }}>
                                {mRpe != null && <span style={{ fontSize: '12px', color: colors.text.faint }}>RPE moy. <strong style={{ color: couleurRpe(mRpe) }}>{rpeEstime ? '≈' : ''}{mRpe.toFixed(1)}/10</strong></span>}
                                <span style={{ fontSize: '12px', color: colors.text.faint }}>Plaisir moy. <strong style={{ color: couleurPlaisir(mPlaisir) }}>{mPlaisir.toFixed(1)}</strong></span>
                              </div>
                              {reponses.map(r => {
                                const res = ressenti(r)
                                return (
                                  <div key={r.joueur_id} style={{ padding: '12px 14px', borderBottom: `1px solid ${colors.border.subtle}`, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <Avatar person={r.profiles || {}} size={30} />
                                      <span style={{ flex: 1, minWidth: 0, fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.profiles?.prenom} {r.profiles?.nom}</span>
                                      <span style={{ padding: '3px 8px', borderRadius: '6px', background: res.color + '1a', color: res.color, fontSize: '11px', fontWeight: 700, border: `1px solid ${res.color}40` }}>{res.label}</span>
                                    </div>
                                    {r.mots_cles && r.mots_cles.replace(/[\s./]/g, '') && <p style={{ margin: 0, fontSize: '12px', color: colors.text.secondary, fontStyle: 'italic' }}>« {r.mots_cles} »</p>}
                                    <div style={{ display: 'flex', gap: '18px' }}>
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: colors.text.faint }}>RPE {jaugeRpe(r)}</span>
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: colors.text.faint }}>Plaisir {jauge(r.notion_plaisir, couleurPlaisir(r.notion_plaisir))}</span>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div style={{ borderTop: `1px solid ${colors.border.subtle}` }}>
                              <div style={{ padding: '10px 18px', display: 'grid', gridTemplateColumns: GRID_RESSENTI, gap: '14px', background: colors.background.raised, borderBottom: `1px solid ${colors.border.subtle}` }}>
                                {['Joueur', 'Thème retenu', 'RPE', 'Plaisir', 'Ressenti'].map(h => (
                                  <span key={h} style={{ color: colors.text.faint, fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase' }}>{h}</span>
                                ))}
                              </div>
                              {reponses.map(r => {
                                const res = ressenti(r)
                                const motsUtiles = r.mots_cles && r.mots_cles.replace(/[\s./]/g, '')
                                return (
                                  <div key={r.joueur_id} className="ressenti-ligne" style={{ padding: '10px 18px', display: 'grid', gridTemplateColumns: GRID_RESSENTI, alignItems: 'center', gap: '14px', borderBottom: `1px solid ${colors.border.subtle}` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                      <Avatar person={r.profiles || {}} size={30} />
                                      <span style={{ fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.profiles?.prenom} {r.profiles?.nom}</span>
                                    </div>
                                    <span title={r.mots_cles || ''} style={{ color: motsUtiles ? colors.text.secondary : colors.text.ghost, fontSize: '12px', fontStyle: motsUtiles ? 'italic' : 'normal', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{motsUtiles ? r.mots_cles : '–'}</span>
                                    {jaugeRpe(r)}
                                    {jauge(r.notion_plaisir, couleurPlaisir(r.notion_plaisir))}
                                    <span style={{ padding: '4px 8px', borderRadius: '6px', background: res.color + '1a', color: res.color, fontSize: '11px', fontWeight: 700, border: `1px solid ${res.color}40`, textAlign: 'center' }}>{res.label}</span>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        )}
                      </div>
                    )
                  })}
                  <style>{`.ressenti-ligne:hover { background: ${colors.background.raised}; }`}</style>
                </div>
              )
            })()}
          </>
        )}

        {/* ===== SANTÉ ===== */}
        {activeSection === 'sante' && (
          <Suspense fallback={<SectionLoader />}><SanteEquipe joueurs={joueurs} educateurId={userId} /></Suspense>
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
              {/* Icônes au trait à la place des emojis (même style que la navigation). */}
              {[['causerie', IcoMicro, t('nav_causerie', lang)], ['resultats', IcoBallon, t('comp_resultats', lang)], ['classement', IcoTrophy, t('comp_classement', lang)], ['calendrier', IcoCalendar, t('comp_calendrier', lang)]].map(([k, Icone, label]) => (
                <button key={k} onClick={() => setCompetitionSubTab(k)} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'transparent', border: 'none', borderBottom: competitionSubTab === k ? '2px solid #60a5fa' : '2px solid transparent', color: competitionSubTab === k ? colors.accent.blue : colors.text.faint, padding: '10px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', flexShrink: 0 }}><Icone />{label}</button>
              ))}
            </div>

            {/* ── Causerie ── */}
            {competitionSubTab === 'causerie' && (
              // Outil personnel de l'éducateur (cf. supabase_causeries.sql : "pas
              // une donnée partagée avec le club, pas de club_id nécessaire") —
              // accessible que le coach soit affilié à un club ou non, club_id
              // reste optionnel côté CauserieAvantMatch.
              <Suspense fallback={<SectionLoader />}><CauserieAvantMatch userId={userId} clubId={clubAffiliation?.club_id} equipeActiveId={equipeActive?.id} equipeUnique={mesEquipes.length <= 1} equipeNom={[profilEdu?.club, profilEdu?.categorie].filter(Boolean).join(' ')} joueurs={joueurs} nomClub={clubAffiliation?.club?.club || profil?.club || ''} logoClub={clubAffiliation?.club?.avatar_url || null} couleurClub={clubAffiliation?.club?.couleur_principale || null} photoClub={clubAffiliation?.club?.image_fond_url || null} logoAdversaire={logoAdversaire} /></Suspense>
            )}

            {/* ── Résultats ── */}
            {competitionSubTab === 'resultats' && (
              <div style={{ maxWidth: '1100px' }}>
                {/* V3 : en-tête façon feuille de match — titre à gauche, Scanner
                    et + Match à droite (en dessous sur mobile). Mêmes actions. */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>{t('comp_resultats', lang)}</h2>
                  {canEdit('competition') && (
                    <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
                      <BoutonTutoriel onClick={() => setTutoOuvert('resultats')} />
                      {canEdit('stats') && (
                        <button onClick={() => setShowScanner(true)} style={{ flex: isMobile ? 1 : 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 18px', minHeight: '40px', borderRadius: '8px', border: `1px solid ${colors.border.strong}`, background: 'transparent', color: colors.text.primary, fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>
                          {t('seance_scanner', lang)}
                        </button>
                      )}
                      <button onClick={() => setShowAddMatch(true)} style={{ flex: isMobile ? 1 : 'none', padding: '10px 22px', minHeight: '40px', borderRadius: '8px', border: 'none', background: colors.accent.green, color: colors.black, fontWeight: 800, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                        + {t('comp_bouton_match', lang)}
                      </button>
                    </div>
                  )}
                </div>

                {showAddMatch && canEdit('competition') && (
                  <div style={{ ...st.card, border: '1px solid #4ade8030', marginBottom: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div><label style={st.label}>{t('ent_date', lang)}</label><input style={st.input} type="date" value={newMatch.date} onChange={e => setNewMatch({ ...newMatch, date: e.target.value })} /></div>
                      <div><label style={st.label}>{t('ent_heure_optionnel', lang)}</label><input style={st.input} type="time" value={newMatch.heure} onChange={e => setNewMatch({ ...newMatch, heure: e.target.value })} /></div>
                      <div><label style={st.label}>{t('comp_adversaire', lang)}</label><input style={st.input} placeholder="Nom de l'équipe" value={newMatch.adversaire} onChange={e => setNewMatch({ ...newMatch, adversaire: e.target.value })} /></div>
                      <div>
                        <label style={st.label}>{t('comp_type_match', lang)}</label>
                        <select style={st.input} value={newMatch.competition} onChange={e => setNewMatch({ ...newMatch, competition: e.target.value })}>
                          <option value="">—</option>
                          <option value="Championnat">{t('comp_type_championnat', lang)}</option>
                          <option value="Coupe">{t('comp_type_coupe', lang)}</option>
                          <option value="Amical">{t('comp_type_amical', lang)}</option>
                        </select>
                      </div>
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

                <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  {FILTRES_COMPETITION.map(f => (
                    <button key={f.id} onClick={() => setFiltreCompResultats(f.id)} style={{
                      padding: '7px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                      background: filtreCompResultats === f.id ? '#4ade80' : '#1a1a1a',
                      color: filtreCompResultats === f.id ? '#0a0a0a' : '#888',
                      border: `1px solid ${filtreCompResultats === f.id ? '#4ade80' : '#333'}`,
                    }}>{f.label}</button>
                  ))}
                </div>

                {/* ── Bilan de saison — calculé depuis les matchs joués (pas de colonne
                    "resultat" en base, on compare score_nous/score_eux comme partout
                    ailleurs dans ce fichier, ex. widget Accueil) ── */}
                {(() => {
                  const matchsJoues = matchs.filter(matchJoue).filter(m => matchCorrespondFiltreComp(m, filtreCompResultats))
                  if (matchsJoues.length === 0) return null
                  const victoires = matchsJoues.filter(m => Number(m.score_nous) > Number(m.score_eux)).length
                  const nuls = matchsJoues.filter(m => Number(m.score_nous) === Number(m.score_eux)).length
                  const defaites = matchsJoues.filter(m => Number(m.score_nous) < Number(m.score_eux)).length
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? '8px' : '12px', marginBottom: '22px' }}>
                      {[
                        { label: 'Victoires', count: victoires, color: colors.accent.green },
                        { label: 'Nuls', count: nuls, color: colors.text.secondary, fond: colors.background.raised, cadre: colors.border.strong },
                        { label: 'Défaites', count: defaites, color: colors.accent.red },
                      ].map(item => (
                        <div key={item.label} style={{ background: item.fond || item.color + '14', border: `1px solid ${item.cadre || item.color + '40'}`, borderRadius: '10px', padding: isMobile ? '12px 8px' : '18px 12px', textAlign: 'center' }}>
                          <div style={{ fontSize: isMobile ? '26px' : '34px', fontWeight: 800, color: item.color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{item.count}</div>
                          <div style={{ fontSize: isMobile ? '12px' : '14px', color: item.color, fontWeight: 600, marginTop: '6px' }}>{item.label}</div>
                        </div>
                      ))}
                    </div>
                  )
                })()}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                  {(() => {
                    const joues = matchs.filter(matchJoue).filter(m => matchCorrespondFiltreComp(m, filtreCompResultats))
                    const dernierMatchId = [...joues].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.heure || '').localeCompare(a.heure || ''))[0]?.id
                    return grouperMatchsParMois(joues, true).map(([moisKey, { label, items }]) => (
                    <div key={moisKey}>
                      <p style={{ fontSize: '11px', fontWeight: 800, color: colors.accent.blue, textTransform: 'uppercase', letterSpacing: '1.2px', margin: '0 0 10px' }}>{label}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {items.map(m => {
                          return (
                      <div key={m.id}>
                        <LigneResultat
                          m={m}
                          nomClub={clubAffiliation?.club?.club || profil?.club || 'Mon équipe'}
                          logoClub={clubAffiliation?.club?.avatar_url || null}
                          logoAdversaire={logoAdversaire(m.adversaire)}
                          enVedette={m.id === dernierMatchId}
                          isMobile={isMobile}
                          locale={localeOf(lang)}
                          aRapport={matchIdsAvecRapport.has(m.id)}
                          afficherRapport={canEdit('competition') || matchIdsAvecRapport.has(m.id)}
                          onOuvrir={() => setMatchActif(matchActif?.id === m.id ? null : m)}
                          onRapport={() => setRapportMatchOuvert(m)}
                          menu={canEdit('competition') ? (
                            <div style={{ position: 'relative', flexShrink: 0 }} onClick={ev => ev.stopPropagation()}>
                              <button
                                onClick={() => setMenuResultatOuvert(menuResultatOuvert === m.id ? null : m.id)}
                                style={{ background: colors.background.raised, border: `1px solid ${colors.border.default}`, borderRadius: '8px', color: colors.text.faint, fontSize: '16px', padding: '6px 10px', cursor: 'pointer', lineHeight: 1, fontFamily: 'Inter, sans-serif' }}
                              >···</button>
                              {menuResultatOuvert === m.id && (
                                <>
                                  <div onClick={() => setMenuResultatOuvert(null)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                                  <div style={{ position: 'absolute', top: '38px', right: 0, background: colors.background.surfaceAlt, border: `1px solid ${colors.border.default}`, borderRadius: '10px', overflow: 'hidden', zIndex: 11, minWidth: '170px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                                    <button onClick={() => { setMenuResultatOuvert(null); setRapportMatchOuvert(m) }}
                                      style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: colors.text.secondary, fontSize: '13px', padding: '10px 14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                                      📄 {matchIdsAvecRapport.has(m.id) ? 'Voir le rapport de match' : 'Rapport de match'}
                                    </button>
                                    <button onClick={() => { setMenuResultatOuvert(null); exporterRapportMatchPdf(m) }}
                                      style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: colors.text.secondary, fontSize: '13px', padding: '10px 14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', borderTop: `1px solid ${colors.border.faint}` }}>
                                      ⬇️ Extraire en PDF
                                    </button>
                                    <button onClick={() => { setMenuResultatOuvert(null); ouvrirModalMatchJoue(m) }}
                                      style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: colors.text.secondary, fontSize: '13px', padding: '10px 14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', borderTop: `1px solid ${colors.border.faint}` }}>
                                      Modifier
                                    </button>
                                    <button onClick={async () => {
                                        setMenuResultatOuvert(null)
                                        if (!confirm('Supprimer ce résultat ?')) return
                                        const { error: errStats } = await supabase.from('stats_match').delete().eq('match_id', m.id)
                                        if (errStats) { alert('Erreur : ' + errStats.message); return }
                                        const { error } = await supabase.from('matchs_equipe').delete().eq('id', m.id)
                                        if (error) { alert('Erreur : ' + error.message); return }
                                        setMatchs(prev => prev.filter(m2 => m2.id !== m.id))
                                        if (matchActif?.id === m.id) setMatchActif(null)
                                        supprimerDeplacementLieAuMatch(m)
                                      }}
                                      style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#f87171', fontSize: '13px', padding: '10px 14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', borderTop: `1px solid ${colors.border.faint}` }}>
                                      Supprimer
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ) : null}
                        />

                        {/* Feuille de match (édition des stats_match — gouvernée par la permission 'stats', pas 'competition') */}
                        {matchActif?.id === m.id && canEdit('stats') && (
                          <div style={{ marginTop: '6px', background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '10px', padding: '14px' }}>
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
                  ))
                  })()}
                  {matchs.filter(matchJoue).filter(m => matchCorrespondFiltreComp(m, filtreCompResultats)).length === 0 && <div style={{ ...st.card, textAlign: 'center', padding: '3rem' }}><p style={{ color: colors.text.faint }}>{t('comp_aucun_match', lang)}</p></div>}
                </div>
              </div>
            )}

            {/* Modal notation match */}
            {matchANoter && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, overflowY: 'auto', padding: '24px' }}
                onClick={() => setMatchANoter(null)}>
                <div onClick={e => e.stopPropagation()}>
                  <Suspense fallback={<SectionLoader />}>
                  <NotationMatch
                    match={matchANoter}
                    joueurs={joueurs}
                    educateurId={userId}
                    onClose={() => { setMatchANoter(null); chargerMatchs(userId, equipeActive?.id) }}
                  />
                  </Suspense>
                </div>
              </div>
            )}

            {/* ── Calendrier ── */}
            {competitionSubTab === 'calendrier' && (
              <div style={{ maxWidth: '1100px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* V3 : en-tête comme Résultats — Matchs à venir en priorité,
                    le scan de calendrier s'ouvre à la demande (bouton Scanner). */}
                {(() => {
                  const nbAVenir = matchs.filter(m => !matchJoue(m)).length
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                      <div>
                        <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>{t('comp_matchs_a_venir', lang)}</h2>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: colors.text.faint }}>{nbAVenir === 0 ? 'Aucun match programmé' : `${nbAVenir} match${nbAVenir > 1 ? 's' : ''} programmé${nbAVenir > 1 ? 's' : ''}`}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
                        <BoutonTutoriel onClick={() => setTutoOuvert('competition')} />
                        <button onClick={() => setAfficherScanCalendrier(v => !v)} style={{ flex: isMobile ? 1 : 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 18px', minHeight: '40px', borderRadius: '8px', border: `1px solid ${afficherScanCalendrier ? colors.accent.blue : colors.border.strong}`, background: 'transparent', color: afficherScanCalendrier ? colors.accent.blue : colors.text.primary, fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>
                          {t('seance_scanner', lang)}
                        </button>
                        {canEdit('competition') && (
                          <button onClick={ouvrirModalCreerMatch} style={{ flex: isMobile ? 1 : 'none', padding: '10px 22px', minHeight: '40px', borderRadius: '8px', border: 'none', background: colors.accent.green, color: colors.black, fontWeight: 800, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                            + {t('comp_bouton_match', lang)}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })()}

                {/* Zone de scan : à la demande, ou tant qu'un scan est en cours / à publier */}
                {(afficherScanCalendrier || calendarImages.length > 0 || calendarMatchs.length > 0 || calendarLoading) && (
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
                )}

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

                {/* ── Matchs à venir (sans score) — publiés dans matchs_equipe ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                  {(() => {
                    const aVenir = matchs.filter(m => !matchJoue(m))
                    const prochainId = [...aVenir].sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.heure || '').localeCompare(b.heure || ''))[0]?.id
                    return grouperMatchsParMois(aVenir, false).map(([moisKey, { label, items }]) => (
                      <div key={moisKey}>
                        <p style={{ fontSize: '11px', fontWeight: 800, color: colors.accent.blue, textTransform: 'uppercase', letterSpacing: '1.2px', margin: '0 0 10px' }}>{label}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {items.map(m => {
                            const itemsMenu = [
                              { label: 'Sondage dispo', action: () => { setConvocationsCoches({}); setModalSondageMatch(m); chargerConvocation(m.id) } },
                              { label: 'Convocation', action: () => { setConvocationsCoches({}); setModalSondageMatch(m); chargerConvocation(m.id); setScrollVersConvocation(true) } },
                              ...(canEdit('competition') ? [{ label: t('comp_modifier_match', lang), action: () => ouvrirModalModifierMatch(m) }] : []),
                              ...(canEdit('competition') ? [{
                                label: 'Supprimer', danger: true, action: async () => {
                                  if (!confirm(`Supprimer le match ${m.domicile ? 'vs' : '@'} ${m.adversaire} ?`)) return
                                  const { error: errStats } = await supabase.from('stats_match').delete().eq('match_id', m.id)
                                  if (errStats) { afficherToast(`Erreur : ${errStats.message}`, 'erreur'); return }
                                  const { error } = await supabase.from('matchs_equipe').delete().eq('id', m.id)
                                  if (error) { afficherToast(`Erreur : ${error.message}`, 'erreur'); return }
                                  setMatchs(prev => prev.filter(m2 => m2.id !== m.id))
                                  supprimerDeplacementLieAuMatch(m)
                                },
                              }] : []),
                            ]
                            const menu = (
                              <div className="match-menu-wrapper" style={{ position: 'relative' }}>
                                <button onClick={() => setOpenMenuId(openMenuId === m.id ? null : m.id)} aria-label="Plus d'actions"
                                  style={{ background: colors.background.raised, border: `1px solid ${colors.border.default}`, borderRadius: '8px', color: colors.text.faint, fontSize: '18px', padding: '6px 12px', minHeight: '36px', cursor: 'pointer', lineHeight: 1, fontFamily: 'Inter, sans-serif' }}>
                                  ⋮
                                </button>
                                {openMenuId === m.id && (
                                  <div style={{ position: 'absolute', right: 0, top: '110%', background: colors.background.raised, border: `1px solid ${colors.border.default}`, borderRadius: '10px', zIndex: 100, minWidth: '190px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
                                    {itemsMenu.map((item, idx) => (
                                      <button key={item.label} onClick={() => { item.action(); setOpenMenuId(null) }}
                                        style={{ display: 'block', width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', borderTop: idx > 0 ? `1px solid ${colors.border.faint}` : 'none', color: item.danger ? colors.accent.red : colors.text.secondary, fontSize: '13px', cursor: 'pointer', textAlign: 'left', fontFamily: 'Inter, sans-serif' }}
                                        onMouseEnter={e => { e.currentTarget.style.background = colors.border.default }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                                        {item.label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                            return (
                              <CarteMatchAVenir
                                key={m.id}
                                m={m}
                                nomClub={clubAffiliation?.club?.club || profil?.club || 'Mon équipe'}
                                logoClub={clubAffiliation?.club?.avatar_url || null}
                                logoAdversaire={logoAdversaire(m.adversaire)}
                                enVedette={m.id === prochainId}
                                isMobile={isMobile}
                                locale={localeOf(lang)}
                                dispo={statsDispoMatch(m.id)}
                                actionPrincipale={canEdit('stats') ? (
                                  <button onClick={() => ouvrirModalMatchJoue(m)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', minHeight: '36px', borderRadius: '8px', border: `1px solid ${colors.accent.green}60`, background: 'transparent', color: colors.accent.green, fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                    {t('comp_marquer_joue', lang)}
                                  </button>
                                ) : null}
                                menu={menu}
                              />
                            )
                          })}
                        </div>
                      </div>
                    ))
                  })()}
                  {matchs.filter(m => !matchJoue(m)).length === 0 && (
                    <div style={{ ...st.card, textAlign: 'center', padding: '2rem' }}>
                      <p style={{ color: colors.text.faint, fontSize: '13px', margin: 0 }}>{t('comp_aucun_match_a_venir', lang)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Classement ── */}
            {competitionSubTab === 'classement' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '960px' }}>

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
                  await navigator.clipboard.writeText(`Les convoqués sont :\n\n${nomsCoches.join('\n')}`)
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

            {/* ── Modale "Rapport de match" ── */}
            {rapportMatchOuvert && (
              <Suspense fallback={<SectionLoader />}>
              <RapportMatch
                match={rapportMatchOuvert}
                joueurs={joueurs}
                userId={userId}
                equipeActiveId={equipeActive?.id}
                clubNom={profilEdu?.club}
                onClose={() => setRapportMatchOuvert(null)}
                onSaved={() => {
                  afficherToast('Rapport de match enregistré')
                  setMatchIdsAvecRapport(prev => new Set(prev).add(rapportMatchOuvert.id))
                }}
              />
              </Suspense>
            )}

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
                    {scannerModalWarning && <p style={{ color: colors.accent.amber, fontSize: '12px', margin: '10px 0 0' }}>{scannerModalWarning}</p>}
                  </div>

                  <div style={{ background: colors.accent.blue + alpha.subtle, border: '1px solid #60a5fa30', borderRadius: '10px', padding: '10px 14px', marginBottom: '18px', fontSize: '12px', color: colors.text.secondary, lineHeight: 1.5 }}>
                    <strong style={{ color: colors.accent.blue }}>Après le scan : </strong>
                    vérifiez que les informations détectées sont correctes. Les minutes sont pré-remplies à 90, à corriger selon les remplacements. Les passes décisives ne sont pas lues par le scan, à compléter manuellement. Pensez aussi à ajouter les buts avec leur nature et leur côté ci-dessous : ces infos alimentent les statistiques d'équipe sur les périodes et les zones où l'équipe marque ou encaisse.
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
                      // Même repère visuel que le scanner "nouveau match" : une
                      // ligne avec au moins une valeur (scan ou saisie manuelle)
                      // ressort en vert — sinon, avec 15-20 lignes identiques,
                      // impossible de voir d'un coup d'œil qui reste à compléter
                      // sans comparer à la main avec la liste de noms du
                      // bandeau d'avertissement.
                      const detected = Object.keys(s).length > 0
                      const val = (field) => s[field] !== undefined ? s[field] : ''
                      return (
                        <div key={j.id} style={{ display: 'grid', gridTemplateColumns: '140px 64px 64px 64px 64px 36px 36px', gap: '6px', alignItems: 'center', padding: '4px 6px', background: detected ? '#0d1a0d' : 'transparent', borderRadius: '6px', border: `1px solid ${detected ? '#1a3a1a' : 'transparent'}` }}>
                          <span style={{ fontSize: '14px', fontWeight: detected ? 700 : 600, color: detected ? colors.text.primary : colors.text.disabled, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {detected ? '✓ ' : ''}{j.prenom} {j.nom?.[0] || ""}.
                          </span>
                          <input type="number" placeholder="Min" min="0" max="120" value={val('minutes')}
                            onChange={e => setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || {}), minutes: parseInt(e.target.value) || 0 } } }))}
                            style={{ ...st.input, padding: '8px', fontSize: '15px', textAlign: 'center', background: detected ? colors.background.surface : colors.background.sunken }} />
                          <input type="number" placeholder="Buts" min="0" value={val('buts')}
                            onChange={e => setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || {}), buts: parseInt(e.target.value) || 0 } } }))}
                            style={{ ...st.input, padding: '8px', fontSize: '15px', textAlign: 'center', background: detected ? colors.background.surface : colors.background.sunken }} />
                          <input type="number" placeholder="PD" min="0" value={val('passes_dec')}
                            onChange={e => setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || {}), passes_dec: parseInt(e.target.value) || 0 } } }))}
                            style={{ ...st.input, padding: '8px', fontSize: '15px', textAlign: 'center' }} />
                          <input type="number" placeholder="CS" min="0" max="1" value={val('clean_sheet') ? 1 : 0}
                            onChange={e => setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || {}), clean_sheet: e.target.value === '1' } } }))}
                            style={{ ...st.input, padding: '8px', fontSize: '15px', textAlign: 'center', background: detected ? colors.background.surface : colors.background.sunken }} />
                          <span title={t('comp_carton_jaune', lang)} style={{ cursor: 'pointer', display: 'inline-block', width: '12px', height: '16px', borderRadius: '2px', background: colors.accent.amber, opacity: val('carton_jaune') ? 1 : 0.25 }}
                            onClick={() => setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || {}), carton_jaune: !val('carton_jaune') } } }))} />
                          <span title={t('comp_carton_rouge', lang)} style={{ cursor: 'pointer', display: 'inline-block', width: '12px', height: '16px', borderRadius: '2px', background: colors.accent.red, opacity: val('carton_rouge') ? 1 : 0.25 }}
                            onClick={() => setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || {}), carton_rouge: !val('carton_rouge') } } }))} />
                        </div>
                      )
                    })}
                  </div>
                  <p style={{ fontSize: '13px', color: colors.text.faint, margin: '10px 0 0' }}>✓ = ligne avec une donnée (scan ou saisie manuelle) · Min · Buts · PD · CS</p>

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

        {['materiel', 'terrains', 'deplacements'].includes(activeSection) && (
          <SousOngletsBar
            items={[{ key: 'materiel', label: t('nav_materiel', lang) }, { key: 'terrains', label: t('nav_terrains', lang) }, { key: 'deplacements', label: t('nav_deplacements', lang) }]}
            activeSection={activeSection} setActiveSection={setActiveSection}
          />
        )}

        {/* ===== DÉPLACEMENTS ===== */}
        {activeSection === 'deplacements' && (
          clubAffiliation?.club_id && clubAffiliation.statut === 'accepte' ? (
            <Suspense fallback={<SectionLoader />}><Deplacements clubId={clubAffiliation.club_id} equipeActiveId={equipeActive?.id} equipeUnique={mesEquipes.length <= 1} accentColor={colors.accent.blue} readOnly retourEditable /></Suspense>
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
            <Suspense fallback={<SectionLoader />}><PlanningTerrains clubId={clubAffiliation.club_id} mode="educateur" userId={userId} equipeActiveId={equipeActive?.id} accentColor={colors.accent.blue} /></Suspense>
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

        {/* ===== ACTUALITÉS DU CLUB ===== */}
        {activeSection === 'annonces' && (
          <div style={{ maxWidth: 700 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}><IcoMegaphone /> Actualités du club</h2>
            <p style={{ color: colors.text.faint, fontSize: 13, marginBottom: 20 }}>Communiqués publiés par {profilEdu?.club || 'ton club'}.</p>
            {!clubAffiliation?.club_id || clubAffiliation.statut !== 'accepte' ? (
              <p style={{ color: colors.text.disabled, fontSize: '13px', fontStyle: 'italic' }}>Rejoins un club pour voir ses actualités.</p>
            ) : annoncesClub.length === 0 ? (
              <p style={{ color: colors.text.disabled, fontSize: '13px', fontStyle: 'italic' }}>Aucune actualité pour le moment.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {annoncesClub.map(a => {
                  const lue = annoncesLuesIds.has(a.id)
                  return (
                    <div key={a.id} onClick={() => marquerAnnonceLue(a.id)}
                      style={{ background: colors.background.sunken, border: `1px solid ${lue ? colors.border.faint : colors.accent.blue}`, borderRadius: '12px', padding: '18px', cursor: lue ? 'default' : 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                        <h3 style={{ color: colors.text.primary, margin: 0, fontSize: '14px', fontWeight: 700 }}>{a.titre}</h3>
                        {!lue && <span style={{ background: colors.accent.blue + '22', color: colors.accent.blue, borderRadius: '6px', padding: '2px 7px', fontSize: '10px', fontWeight: 700 }}>Nouveau</span>}
                      </div>
                      <div style={{ color: colors.text.faint, fontSize: '11px', marginBottom: '8px' }}>
                        {a.auteur_nom} · {new Date(a.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                      <p style={{ color: colors.text.secondary, fontSize: '13px', lineHeight: '1.5', margin: 0, whiteSpace: 'pre-wrap' }}>{a.contenu}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
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
          // V2 : bandeau d'état (prêt à récupérer / remis), tailles en grille
          // de tuiles avec compteur de progression, matériel confié en cartes.
          const champsAvecTaille = champsEquipementEduc.filter(c => !c.taille_unique)
          const nbTaillesOk = champsAvecTaille.filter(c => mesTaillesEduc.find(t => t.champ_id === c.id)?.valeur).length
          const eyebrowMat = { margin: 0, fontSize: '11px', fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.text.secondary }
          const bandeau = (couleur, titre, texte, action) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', background: couleur + '12', border: `1px solid ${couleur}40`, borderLeft: `4px solid ${couleur}`, borderRadius: '12px', padding: '14px 18px' }}>
              <span style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: couleur + '22', color: couleur, flexShrink: 0 }}><IcoBox /></span>
              <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: '14px', color: couleur }}>{titre}</p>
                {texte && <p style={{ margin: '2px 0 0', fontSize: '12px', color: colors.text.faint }}>{texte}</p>}
              </div>
              {action}
            </div>
          )
          return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>Mon matériel</h1>
              <p style={{ color: colors.text.faint, fontSize: '13px', margin: '4px 0 0' }}>Matériel confié par le club — demande la remise en fin de saison, le club valide.</p>
            </div>
            {!clubAffiliation?.club_id || clubAffiliation.statut !== 'accepte' ? (
              <div style={{ ...st.card, margin: 0, textAlign: 'center', padding: '32px 20px' }}>
                <p style={{ margin: 0, color: colors.text.faint, fontSize: '13px' }}>Rejoins un club (code club, dans ton profil) pour voir ton matériel.</p>
              </div>
            ) : (
              <>
              {equipementPretEduc && bandeau(colors.accent.amber, 'Ton équipement est prêt',
                `${equipementPretEduc.jours || 'Passe le récupérer auprès du club'}${equipementPretEduc.heure_debut && equipementPretEduc.heure_fin ? ` · entre ${equipementPretEduc.heure_debut} et ${equipementPretEduc.heure_fin}` : ''}${equipementPretEduc.heure_debut_2 && equipementPretEduc.heure_fin_2 ? ` puis entre ${equipementPretEduc.heure_debut_2} et ${equipementPretEduc.heure_fin_2}` : ''}`,
                <button onClick={marquerEquipementRecupereEduc} style={{ background: colors.accent.amber, color: colors.black, border: 'none', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>J'ai récupéré</button>
              )}

              {equipementCommandeEduc?.statut === 'recupere' && equipementCommandeEduc?.recupere_le && bandeau(colors.accent.green, 'Équipement remis',
                `Le ${new Date(equipementCommandeEduc.recupere_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} à ${new Date(equipementCommandeEduc.recupere_le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`)}

              {champsEquipementEduc.length > 0 && (
                <div style={{ ...st.card, margin: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    <div>
                      <p style={eyebrowMat}>Mes tailles{packAttribueEduc?.nom ? ` · ${packAttribueEduc.nom}` : ''}</p>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: colors.text.faint }}>Renseigne tes tailles pour que le club puisse préparer ton équipement.</p>
                    </div>
                    {champsAvecTaille.length > 0 && (
                      <div style={{ minWidth: '150px' }}>
                        <p style={{ margin: 0, fontSize: '12px', color: colors.text.faint, textAlign: 'right' }}>
                          <strong style={{ color: nbTaillesOk === champsAvecTaille.length ? colors.accent.green : colors.text.primary }}>{nbTaillesOk}</strong> / {champsAvecTaille.length} renseignées
                        </p>
                        <div style={{ height: '5px', borderRadius: '3px', background: colors.background.base, overflow: 'hidden', marginTop: '6px' }}>
                          <div style={{ width: `${(nbTaillesOk / champsAvecTaille.length) * 100}%`, height: '100%', background: colors.accent.green }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(auto-fill, minmax(190px, 1fr))', gap: '10px' }}>
                    {champsEquipementEduc.map(c => {
                      const valeur = mesTaillesEduc.find(t => t.champ_id === c.id)?.valeur || ''
                      const ok = c.taille_unique || !!valeur
                      return (
                        <div key={c.id} style={{ background: colors.background.base, border: `1px solid ${ok ? colors.accent.green + '40' : colors.border.subtle}`, borderRadius: '10px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: colors.text.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nom}</span>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: ok ? colors.accent.green : colors.border.strong, flexShrink: 0 }} />
                          </div>
                          {c.taille_unique ? (
                            <p style={{ margin: 0, padding: '8px 0', fontSize: '13px', color: colors.text.faint }}>Taille unique</p>
                          ) : (
                            <select value={valeur} onChange={e => sauvegarderMaTailleEduc(c.id, e.target.value)}
                              style={{ width: '100%', background: colors.background.raised, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '8px 10px', color: valeur ? colors.text.primary : colors.text.faint, fontSize: '14px', fontWeight: 700, fontFamily: 'Inter, sans-serif', outline: 'none', cursor: 'pointer' }}>
                              <option value="">Choisir…</option>
                              {c.options.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div>
                <p style={{ ...eyebrowMat, marginBottom: '10px' }}>Matériel confié</p>
                {lotsMateriel.length === 0 ? (
                  <div style={{ ...st.card, margin: 0, textAlign: 'center', padding: '24px 20px' }}>
                    <p style={{ margin: 0, color: colors.text.faint, fontSize: '13px' }}>Aucun matériel confié pour l'instant.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))', gap: '10px' }}>
                    {lotsMateriel.map(lot => {
                      const d = lot.ref
                      const conf = STATUT_MATERIEL[d.statut] || STATUT_MATERIEL.distribue
                      return (
                        <div key={lot.cle} style={{ ...st.card, margin: 0, borderLeft: `3px solid ${conf.color}`, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{d.equipe_nom || 'Matériel'}</p>
                              <p style={{ margin: '2px 0 0', fontSize: '12px', color: colors.text.faint }}>Saison {d.saison}</p>
                            </div>
                            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', padding: '3px 8px', borderRadius: '6px', color: conf.color, background: conf.color + '1a', border: `1px solid ${conf.color}40`, whiteSpace: 'nowrap' }}>{conf.label}</span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {lot.items.map(item => (
                              <span key={item.id} style={{ fontSize: '12px', color: colors.text.secondary, background: colors.background.base, border: `1px solid ${colors.border.subtle}`, borderRadius: '8px', padding: '4px 10px' }}>
                                {item.nom_materiel} <strong style={{ color: colors.text.primary }}>× {item.quantite}</strong>
                              </span>
                            ))}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '12px', color: colors.text.faint }}>{conf.desc}</span>
                            {d.statut === 'distribue' && (
                              <button onClick={() => demanderRemiseMateriel(d)} style={st.btn(colors.accent.amber)}>Demander la remise</button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              </>
            )}
          </div>
          )
        })()}

        {['entrainements', 'mes_seances'].includes(activeSection) && (
          <SousOngletsBar
            items={[
              { key: 'entrainements', label: t('nav_planning', lang), description: t('nav_planning_desc', lang), icon: <IcoCalendarLg /> },
              { key: 'mes_seances', label: t('nav_seances', lang), description: t('nav_seances_desc', lang), icon: <IcoFileTextLg /> },
            ].filter(it => canView(it.key))}
            activeSection={activeSection} setActiveSection={setActiveSection}
          />
        )}

        {/* ===== ENTRAÎNEMENTS ===== */}
        {activeSection === 'entrainements' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>{t('ent_titre', lang)}</h1>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: colors.text.faint }}>{entrainements.length} {t('ent_seances_count', lang)} · {t('ent_sous_titre', lang)}</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <BoutonTutoriel onClick={() => setTutoOuvert('planning')} />
              {canEdit('entrainements') && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  {/* Les deux formulaires vivent dans le sous-onglet "Mes séances" :
                      on y bascule puis on défile jusqu'au formulaire ouvert, sinon
                      le clic depuis "Prochaine séance" semblait sans effet. */}
                  <button onClick={() => { setSousOngletEnt('liste'); setShowPlanificateur(true); setShowAddEntrainement(false); setTimeout(() => document.getElementById('ent-form-planificateur')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60) }} style={{ ...st.btn(colors.accent.blue), display: 'inline-flex', alignItems: 'center', gap: '8px' }}><IcoCalendar /> {t('ent_planifier_saison', lang)}</button>
                  <button onClick={() => { setSousOngletEnt('liste'); setShowAddEntrainement(true); setShowPlanificateur(false); setTimeout(() => document.getElementById('ent-form-seance')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60) }} style={st.btnSolid}>+ {t('ent_bouton_seance', lang)}</button>
                </div>
              )}
              </div>
            </div>

            {/* ── Sous-onglets ── */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {[
                { id: 'prochaine', label: t('ent_sous_onglet_prochaine', lang) },
                { id: 'liste', label: t('ent_sous_onglet_liste', lang) },
              ].map(tab => (
                <button key={tab.id} onClick={() => setSousOngletEnt(tab.id)}
                  style={{ background: sousOngletEnt === tab.id ? colors.accent.blue + alpha.subtle : 'transparent', border: `1px solid ${sousOngletEnt === tab.id ? colors.accent.blue + alpha.medium : colors.border.default}`, color: sousOngletEnt === tab.id ? colors.accent.blue : colors.text.faint, padding: '8px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  {tab.label}
                </button>
              ))}
            </div>

            <Suspense fallback={<SectionLoader />}>
            <SondageSemaine mode="educateur" userId={userId} equipeCategorieId={equipeActive?.id} accentColor={colors.accent.blue}
              onVoirFiche={ficheId => { const s = mesSeancesOuvertes.find(x => x.id === ficheId); if (s) { setFicheApercu(s); setFicheApercuEnHaut(true) } }} />
            </Suspense>

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

              // V2 : en-tête façon feuille de match (pavé date), synthèse unique
              // (taux de réponse + barre segmentée par statut) à la place des 6
              // tuiles + barre séparée, réponses regroupées par statut (« En
              // attente » en premier : c'est la liste à relancer).
              const dateSeance = new Date(prochaineSeance.date + 'T12:00:00')
              const midi = new Date(); midi.setHours(12, 0, 0, 0)
              const joursAvant = Math.round((dateSeance - midi) / 86400000)
              const echeance = joursAvant <= 0 ? "Aujourd'hui" : joursAvant === 1 ? 'Demain' : `Dans ${joursAvant} jours`
              const nbRepondu = total - stats.sans_reponse
              const tauxReponse = total > 0 ? Math.round(nbRepondu / total * 100) : 0
              const STATUTS_ORDRE = [
                { key: 'sans_reponse', label: t('ent_en_attente', lang), color: colors.text.faint },
                { key: 'present', label: t('ent_stat_presents', lang), color: colors.accent.green },
                { key: 'convoque', label: t('ent_stat_convoques', lang), color: colors.accent.blue },
                { key: 'absent', label: t('ent_stat_absents', lang), color: colors.accent.red },
                { key: 'blesse', label: t('ent_stat_blesses', lang), color: colors.accent.orange },
                { key: 'malade', label: t('ent_stat_malades', lang), color: colors.accent.purple },
              ]
              const SEGMENTS_BARRE = STATUTS_ORDRE.slice(1).concat(STATUTS_ORDRE[0])
              const groupesReponses = STATUTS_ORDRE
                .map(g => ({ ...g, joueurs: reponses.filter(j => (j.statut || 'sans_reponse') === g.key).sort((a, b) => (a.nom || '').localeCompare(b.nom || '')) }))
                .filter(g => g.joueurs.length)
              const eyebrowEnt = { margin: 0, fontSize: '11px', fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.text.secondary }
              const btnFiche = { display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'transparent', border: `1px solid ${colors.accent.green}40`, color: colors.accent.green, padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* En-tête séance */}
                  <div style={{ ...st.card, margin: 0, borderLeft: `4px solid ${colors.accent.green}` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'auto minmax(0,1fr)' : 'auto minmax(0,1fr) auto', alignItems: 'center', gap: isMobile ? '14px' : '20px' }}>
                      <div style={{ width: isMobile ? '58px' : '68px', textAlign: 'center', border: `1px solid ${colors.border.default}`, borderRadius: '8px', overflow: 'hidden' }}>
                        <p style={{ margin: 0, padding: '3px 0', fontSize: '10px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: colors.black, background: colors.accent.green }}>
                          {dateSeance.toLocaleDateString(localeOf(lang), { weekday: 'short' }).replace('.', '')}
                        </p>
                        <p style={{ margin: 0, padding: '5px 0 0', fontSize: isMobile ? '22px' : '26px', fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{dateSeance.getDate()}</p>
                        <p style={{ margin: 0, padding: '2px 0 4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: colors.text.faint }}>{dateSeance.toLocaleDateString(localeOf(lang), { month: 'short' }).replace('.', '')}</p>
                        {prochaineSeance.heure && <p style={{ margin: 0, padding: '3px 0', fontSize: '11px', fontWeight: 800, borderTop: `1px solid ${colors.border.default}`, fontVariantNumeric: 'tabular-nums' }}>{prochaineSeance.heure.slice(0, 5)}</p>}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={eyebrowEnt}>{t('ent_sous_onglet_prochaine', lang)}</p>
                        <h2 style={{ margin: '4px 0 8px', fontSize: isMobile ? '18px' : '21px', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prochaineSeance.description || t('ent_seance_generique', lang)}</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', padding: '3px 8px', borderRadius: '6px', color: colors.accent.green, background: colors.accent.green + '1a', border: `1px solid ${colors.accent.green}40` }}>{echeance}</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', padding: '3px 8px', borderRadius: '6px', color: clos ? colors.accent.red : colors.text.secondary, background: clos ? colors.accent.red + '1a' : colors.background.raised, border: `1px solid ${clos ? colors.accent.red + '40' : colors.border.default}` }}>
                            {clos ? <IcoCadenas /> : <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors.accent.green }} />}
                            {clos ? t('ent_sondage_clos', lang) : t('ent_sondage_ouvert', lang)}
                          </span>
                          {prochaineSeance.lieu && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: colors.text.faint }}><IcoPin />{prochaineSeance.lieu}</span>}
                        </div>
                      </div>
                      <div style={{ gridColumn: isMobile ? '1 / -1' : 'auto' }}>
                        {prochaineSeance.fiche_id ? (
                          <button onClick={() => { const s = mesSeancesOuvertes.find(x => x.id === prochaineSeance.fiche_id); if (s) { setFicheApercu(s); setFicheApercuEnHaut(true) } }} style={btnFiche}>
                            <IcoFileText /> Voir la fiche
                          </button>
                        ) : canEdit('entrainements') && (
                          <button onClick={() => setModalImportFicheEntrainement(prochaineSeance.id)} style={btnFiche}>
                            <IcoLink /> Attacher une fiche
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Synthèse des réponses */}
                  <div style={{ ...st.card, margin: 0 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'auto minmax(0,1fr)', gap: isMobile ? '14px' : '28px', alignItems: 'center' }}>
                      <div>
                        <p style={eyebrowEnt}>{t('ent_taux_reponse', lang)}</p>
                        <p style={{ margin: '6px 0 0', fontSize: '32px', fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: tauxReponse >= 80 ? colors.accent.green : tauxReponse >= 50 ? colors.accent.amber : colors.text.primary }}>
                          {tauxReponse}<span style={{ fontSize: '15px', color: colors.text.faint, marginLeft: '2px' }}>%</span>
                        </p>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: colors.text.faint }}>{nbRepondu}/{total} {t('equipe_joueurs', lang)}</p>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', height: '10px', borderRadius: '6px', overflow: 'hidden', background: colors.background.base, gap: '2px' }}>
                          {SEGMENTS_BARRE.map(g => stats[g.key] > 0 && (
                            <div key={g.key} title={`${stats[g.key]} ${g.label}`} style={{ width: `${(stats[g.key] / total) * 100}%`, background: g.key === 'sans_reponse' ? colors.border.strong : g.color, transition: 'width 0.3s' }} />
                          ))}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, minmax(0,1fr))' : 'repeat(6, minmax(0,1fr))', gap: '8px', marginTop: '14px' }}>
                          {SEGMENTS_BARRE.map(g => (
                            <div key={g.key} style={{ display: 'flex', flexDirection: 'column', gap: '2px', opacity: stats[g.key] ? 1 : 0.45 }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: colors.text.faint, whiteSpace: 'nowrap' }}>
                                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: g.key === 'sans_reponse' ? colors.border.strong : g.color, flexShrink: 0 }} />{g.label}
                              </span>
                              <span style={{ fontSize: '18px', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: stats[g.key] ? (g.key === 'sans_reponse' ? colors.text.primary : g.color) : colors.text.faint }}>{stats[g.key] || 0}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Réponses individuelles, regroupées par statut */}
                  <div style={{ ...st.card, margin: 0 }}>
                    <p style={{ ...eyebrowEnt, marginBottom: '16px' }}>{t('ent_reponses_individuelles', lang)}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                      {groupesReponses.map(g => {
                        const c = g.key === 'sans_reponse' ? colors.border.strong : g.color
                        return (
                          <div key={g.key}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', paddingBottom: '8px', borderBottom: `1px solid ${colors.border.subtle}` }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: c }} />
                              <span style={{ fontSize: '12px', fontWeight: 700, color: g.key === 'sans_reponse' ? colors.text.secondary : g.color }}>{g.label}</span>
                              <span style={{ fontSize: '11px', color: colors.text.faint }}>{g.joueurs.length}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(230px, 1fr))', gap: '8px' }}>
                              {g.joueurs.map(j => (
                                <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: colors.background.surfaceAlt || colors.background.raised, border: `1px solid ${colors.border.subtle}`, borderLeft: `3px solid ${c}`, borderRadius: '10px', minWidth: 0, opacity: g.key === 'sans_reponse' ? 0.85 : 1 }}>
                                  <Avatar person={j} size={32} />
                                  <div style={{ minWidth: 0 }}>
                                    <p style={{ margin: 0, fontWeight: 600, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.prenom} {j.nom}</p>
                                    <p style={{ margin: '1px 0 0', fontSize: '11px', color: colors.text.faint }}>{j.poste || 'Poste non renseigné'}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Paramètres clôture */}
                  {canEdit('entrainements') && (
                    <div style={{ ...st.card, margin: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
                        <div style={{ minWidth: 0, flex: '1 1 320px' }}>
                          <p style={eyebrowEnt}>{t('ent_cloture_auto_titre', lang)}</p>
                          <div style={{ display: 'inline-flex', flexWrap: 'wrap', padding: '3px', marginTop: '12px', borderRadius: '10px', background: colors.background.base, border: `1px solid ${colors.border.subtle}` }}>
                            {[
                              { val: null, label: t('ent_pas_de_cloture', lang) },
                              { val: 1, label: `1h ${t('ent_avant', lang)}` },
                              { val: 5, label: `5h ${t('ent_avant', lang)}` },
                              { val: 24, label: `24h ${t('ent_avant', lang)}` },
                            ].map(opt => {
                              const actif = delaiCloture === opt.val
                              return (
                                <button key={String(opt.val)} onClick={() => sauvegarderDelaiCloture(opt.val)}
                                  style={{ background: actif ? colors.background.raised : 'transparent', border: 'none', color: actif ? colors.text.primary : colors.text.faint, padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: actif ? 700 : 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                                  {opt.label}
                                </button>
                              )
                            })}
                          </div>
                          <p style={{ fontSize: '12px', color: colors.text.faint, margin: '10px 0 0' }}>
                            {delaiCloture ? t('ent_cloture_desc', lang).replace('{h}', delaiCloture) : t('ent_pas_de_cloture_desc', lang)}
                            {delaiCloture && heureCloture && (
                              <> — clôture à {heureCloture.toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'short' })} {heureCloture.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</>
                            )}
                          </p>
                        </div>
                        {!clos ? (
                          <button onClick={cloturerSondage} disabled={savingCloture}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: colors.accent.red + alpha.subtle, border: `1px solid ${colors.accent.red}40`, color: colors.accent.red, padding: '9px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', opacity: savingCloture ? 0.5 : 1 }}>
                            <IcoCadenas /> {t('ent_cloturer_maintenant', lang)}
                          </button>
                        ) : (
                          <button onClick={rouvrirSondage}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: colors.accent.blue + alpha.subtle, border: `1px solid ${colors.accent.blue}40`, color: colors.accent.blue, padding: '9px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                            {t('ent_rouvrir_sondage', lang)}
                          </button>
                        )}
                      </div>
                      {delaiCloture && !prochaineSeance.heure && (
                        <div style={{ background: colors.accent.orange + alpha.subtle, border: `1px solid ${colors.accent.orange}40`, borderRadius: '10px', padding: '10px 14px', marginTop: '14px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <p style={{ fontSize: '12px', color: colors.accent.orange, margin: 0, flex: 1, minWidth: '200px' }}>
                            Cette séance n'a pas d'heure renseignée : la clôture auto ne peut pas se déclencher tant qu'elle est absente.
                          </p>
                          <input type="time" style={{ ...st.input, width: 'auto' }} disabled={savingHeureSeance}
                            onChange={e => e.target.value && sauvegarderHeureSeance(e.target.value)} />
                        </div>
                      )}
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
              <div id="ent-form-seance" style={{ ...st.card, border: '1px solid #4ade8030', marginBottom: '1.5rem', scrollMarginTop: '16px' }}>
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
                        <p style={{ fontSize: '12px', color: colors.text.disabled, padding: '8px' }}>{t(mesSeancesOuvertesChargees ? 'ent_aucune_fiche_archivee' : 'seance_chargement_fiches', lang)}</p>
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
              <div id="ent-form-planificateur" style={{ ...st.card, border: '1px solid #60a5fa30', marginBottom: '1.5rem', scrollMarginTop: '16px' }}>
                <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '15px', color: colors.accent.blue }}>📅 {t('ent_planifier_saison', lang)}</p>
                <p style={{ margin: '0 0 16px', fontSize: '12px', color: colors.text.faint }}>{t('ent_choisis_jours', lang)}</p>

                {/* Jours de la semaine — chacun avec sa propre heure (ex: mar/jeu 20h, ven 19h) */}
                <label style={st.label}>{t('ent_jours_entrainement', lang)}</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {[['Lun',1],['Mar',2],['Mer',3],['Jeu',4],['Ven',5],['Sam',6],['Dim',0]].map(([label, num]) => {
                    const actif = planSaison.joursActifs.includes(num)
                    return (
                      <div key={num} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button onClick={() => toggleJourPlan(num)}
                          style={{ padding: '8px 14px', borderRadius: '10px', border: `2px solid ${actif ? colors.accent.blue : colors.border.default}`, background: actif ? colors.accent.blue + alpha.soft : colors.background.raised, color: actif ? colors.accent.blue : colors.text.dim, fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s' }}>
                          {label}
                        </button>
                        {actif && (
                          <input type="time" value={planSaison.heuresParJour[num] || ''}
                            onChange={e => setPlanSaison(p => ({ ...p, heuresParJour: { ...p.heuresParJour, [num]: e.target.value } }))}
                            style={{ ...st.input, width: '110px', padding: '6px 8px' }} />
                        )}
                      </div>
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
            {/* V3 : mois en 3 groupes — ce mois-ci (ouvert par défaut), mois à
                venir (chronologique), mois passés (du plus récent) — au lieu
                d'un tri du plus lointain au plus proche. Taux de présence du
                mois (séances passées) dans l'en-tête. */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {(() => {
                const maintenant = new Date()
                const moisCourantCle = `${maintenant.getFullYear()}-${String(maintenant.getMonth() + 1).padStart(2, '0')}`
                const groupes = grouperParMois(entrainements)
                const sections = [
                  ['Ce mois-ci', groupes.filter(([k]) => k === moisCourantCle), 'asc'],
                  ['Mois à venir', groupes.filter(([k]) => k > moisCourantCle).sort((a, b) => a[0].localeCompare(b[0])), 'asc'],
                  ['Mois passés', groupes.filter(([k]) => k < moisCourantCle), 'desc'],
                ]
                const statutSeance = (e, j) => {
                  const p = (e.presences_entrainement || []).find(pr => pr.joueur_id === j.id)
                  if (p && (p.statut || p.present)) return p.statut || (p.present ? 'present' : 'absent')
                  return j.joueur_id ? (dispoJoueurs[e.id]?.[j.joueur_id] || null) : null
                }
                const tauxMois = (items) => {
                  let presents = 0, saisis = 0
                  items.filter(e => new Date(e.date + 'T12:00:00') <= maintenant).forEach(e => joueurs.forEach(j => {
                    const st2 = statutSeance(e, j)
                    if (!st2) return
                    saisis++
                    if (st2 === 'present' || st2 === 'convoque') presents++
                  }))
                  return saisis ? Math.round((presents / saisis) * 100) : null
                }
                return sections.filter(([, g]) => g.length).map(([titreSection, g, ordre]) => (
                  <div key={titreSection}>
                    <p style={{ fontSize: '11px', fontWeight: 800, color: colors.accent.blue, textTransform: 'uppercase', letterSpacing: '1.2px', margin: '0 0 10px' }}>{titreSection}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {g.map(([moisKey, { label, items }]) => {
                const moisOuvert = moisOuverts.has(moisKey)
                const taux = tauxMois(items)
                return (
                  <div key={moisKey}>
                    <div
                      onClick={() => setMoisOuverts(prev => { const next = new Set(prev); next.has(moisKey) ? next.delete(moisKey) : next.add(moisKey); return next })}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '12px 16px', background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: moisOuvert ? '10px 10px 0 0' : '10px', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flexWrap: 'wrap' }}>
                        <span style={{ color: colors.accent.blue, display: 'inline-flex' }}><IcoCalendar /></span>
                        <span style={{ color: colors.text.primary, fontWeight: 800, fontSize: '15px', textTransform: 'capitalize' }}>{label}</span>
                        <span style={{ background: colors.background.raised, color: colors.text.muted, fontSize: '12px', padding: '2px 8px', borderRadius: '20px' }}>
                          {items.length} {items.length > 1 ? t('stats_seances_plural', lang) : t('stats_seance_singular', lang)}
                        </span>
                        {taux != null && (
                          <span style={{ fontSize: '12px', fontWeight: 700, color: taux >= 80 ? colors.accent.green : taux >= 60 ? colors.accent.amber : colors.accent.red }}>Présence {taux}%</span>
                        )}
                      </div>
                      <span style={{ color: colors.text.faint, display: 'inline-flex' }}><IcoChevronBas ouvert={moisOuvert} /></span>
                    </div>
                    {moisOuvert && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', border: `1px solid ${colors.border.subtle}`, borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '10px' }}>
                        {[...items].sort((a, b) => ordre === 'asc' ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date)).map(e => {
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
                const nbAbsents   = joueurs.filter(j => getStatutJoueur(j) === 'absent').length
                const total = joueurs.length
                const dateObj = new Date(e.date + 'T12:00:00')
                const estFuture = dateObj > new Date()
                return (
                  <div key={e.id} style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderLeft: `3px solid ${estFuture ? colors.accent.blue : colors.accent.green}`, borderRadius: '10px', padding: isMobile ? '12px' : '12px 16px' }}>
                    {/* V3 : pavé date, titre, heure/lieu, fiche, présences en barre
                        segmentée + légende, actions en icônes au trait. Mêmes actions. */}
                    {(() => {
                      const titre = e.description || mesSeancesOuvertes.find(s2 => s2.id === e.fiche_id)?.theme || 'Entraînement'
                      const joursRestants = Math.round((dateObj - new Date(new Date().toDateString())) / 86400000)
                      const taux = total > 0 ? nbPresents / total : 0
                      const nbConvoquesSeuls = nbConvoques
                      const nbPresentsSeuls = nbPresents - nbConvoques
                      const segments = [
                        [nbPresentsSeuls, colors.accent.green, 'présent', 'présents'],
                        [nbConvoquesSeuls, colors.accent.blue, 'convoqué', 'convoqués'],
                        [nbAbsents, colors.accent.red, 'absent', 'absents'],
                        [nbBlesses, colors.accent.orange, 'blessé', 'blessés'],
                        [nbMalades, colors.accent.purple, 'malade', 'malades'],
                      ]
                      const sansReponse = Math.max(0, total - segments.reduce((x, [n]) => x + n, 0))
                      const btnIcone = (couleur) => ({ background: 'transparent', border: `1px solid ${colors.border.default}`, color: couleur, width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 })
                      const actions = (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }} onClick={ev => ev.stopPropagation()}>
                          {!estFuture && total > 0 && (
                            <span style={{ background: (taux >= 0.8 ? colors.accent.green : colors.accent.amber) + '1a', border: `1px solid ${(taux >= 0.8 ? colors.accent.green : colors.accent.amber)}40`, color: taux >= 0.8 ? colors.accent.green : colors.accent.amber, fontSize: '12px', fontWeight: 800, padding: '5px 10px', borderRadius: '8px', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                              {nbPresents}/{total}
                            </span>
                          )}
                          {canEdit('entrainements') && (
                            demandesNote[e.id] ? (
                              <span onClick={() => { if (demandesNote[e.id].statut === 'ouverte') fermerDemandeNote(demandesNote[e.id].id, e.id) }}
                                title={demandesNote[e.id].statut === 'ouverte' ? 'Ressenti RPE demandé — clique pour fermer' : 'Ressenti RPE fermé'}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: demandesNote[e.id].statut === 'ouverte' ? colors.accent.amber + '1a' : 'transparent', border: `1px solid ${demandesNote[e.id].statut === 'ouverte' ? colors.accent.amber + '55' : colors.border.default}`, color: demandesNote[e.id].statut === 'ouverte' ? colors.accent.amber : colors.text.disabled, padding: '5px 9px', borderRadius: '8px', cursor: demandesNote[e.id].statut === 'ouverte' ? 'pointer' : 'default', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                <IcoEtoileTrait /> {demandesNote[e.id].statut === 'ouverte' ? 'RPE en cours' : 'RPE fermé'}
                              </span>
                            ) : (
                              <button onClick={() => demanderNoteSeance(e)} disabled={demandeNoteEnCours === e.id}
                                title="Demander le ressenti RPE aux joueurs sur cette séance" aria-label="Demander le ressenti RPE"
                                style={btnIcone(colors.accent.amber)}>
                                {demandeNoteEnCours === e.id ? '…' : <IcoEtoileTrait />}
                              </button>
                            )
                          )}
                          {canEdit('entrainements') && !e.fiche_id && (
                            <button onClick={() => setModalImportFicheEntrainement(e.id)} title={t('ent_importer_fiche', lang)} aria-label={t('ent_importer_fiche', lang)} style={btnIcone(colors.accent.green)}>
                              <IcoLink />
                            </button>
                          )}
                          {canEdit('entrainements') && (
                            <button onClick={() => setEntrainementEnEdition({ id: e.id, date: e.date || '', heure: e.heure || '', description: e.description || '', lieu: e.lieu || '' })} title="Modifier la séance" aria-label="Modifier la séance" style={btnIcone(colors.accent.blue)}>
                              <IcoCrayon />
                            </button>
                          )}
                          {canEdit('entrainements') && (
                            <button onClick={() => supprimerEntrainement(e.id)} title="Supprimer la séance" aria-label="Supprimer la séance" style={btnIcone(colors.text.faint)}>
                              <IcoCorbeille />
                            </button>
                          )}
                          <button onClick={() => setEntrainementActif(ouvert ? null : e.id)} title={ouvert ? 'Replier' : 'Saisir les présences'} aria-label={ouvert ? 'Replier' : 'Saisir les présences'} style={{ ...btnIcone(colors.text.secondary), border: 'none' }}>
                            <IcoChevronBas ouvert={ouvert} />
                          </button>
                        </div>
                      )
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'auto minmax(0,1fr)' : 'auto minmax(0,1fr) auto', alignItems: 'center', gap: isMobile ? '12px' : '16px' }}>
                          {/* Pavé date */}
                          <div onClick={() => setEntrainementActif(ouvert ? null : e.id)} style={{ width: '54px', textAlign: 'center', border: `1px solid ${colors.border.default}`, borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', alignSelf: 'start' }}>
                            <p style={{ margin: 0, padding: '3px 0', fontSize: '10px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: estFuture ? colors.black : colors.text.faint, background: estFuture ? colors.accent.blue : colors.background.raised }}>{dateObj.toLocaleDateString(localeOf(lang), { weekday: 'short' }).replace('.', '')}</p>
                            <p style={{ margin: 0, padding: '4px 0 0', fontSize: '20px', fontWeight: 800, lineHeight: 1, color: colors.text.primary }}>{dateObj.getDate()}</p>
                            <p style={{ margin: 0, padding: '2px 0 4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: colors.text.faint }}>{dateObj.toLocaleDateString(localeOf(lang), { month: 'short' }).replace('.', '')}</p>
                          </div>

                          {/* Titre, infos, présences */}
                          <div style={{ minWidth: 0, cursor: 'pointer' }} onClick={() => setEntrainementActif(ouvert ? null : e.id)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <p style={{ margin: 0, fontWeight: 800, fontSize: '14px', color: colors.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{titre}</p>
                              {estFuture && (
                                <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', padding: '2px 7px', borderRadius: '6px', color: colors.accent.blue, background: colors.accent.blue + '1a', border: `1px solid ${colors.accent.blue}40` }}>
                                  {joursRestants <= 0 ? "Aujourd'hui" : joursRestants === 1 ? 'Demain' : `Dans ${joursRestants} j`}
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', flexWrap: 'wrap', fontSize: '12px', color: colors.text.faint }}>
                              {e.heure && <span style={{ fontWeight: 700, color: colors.text.secondary, fontVariantNumeric: 'tabular-nums' }}>{String(e.heure).slice(0, 5)}</span>}
                              {e.lieu && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><IcoPin /> {e.lieu}</span>}
                              {e.fiche_id && (
                                <span style={{ display: 'inline-flex', alignItems: 'center' }} onClick={ev => ev.stopPropagation()}>
                                  <span
                                    onClick={() => { const s2 = mesSeancesOuvertes.find(x => x.id === e.fiche_id); if (s2) { setFicheApercu(s2); setFicheApercuEnHaut(true) } }}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: colors.accent.purpleLight, background: '#a78bfa10', border: '1px solid #a78bfa30', padding: '2px 8px', borderRadius: '6px 0 0 6px', cursor: 'pointer' }}>
                                    <IcoFileText /> {t('ent_voir_fiche', lang)}
                                  </span>
                                  <span
                                    onClick={async () => {
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
                                    style={{ fontSize: '11px', color: colors.accent.purpleLight, background: '#a78bfa10', border: '1px solid #a78bfa30', borderLeft: 'none', padding: '2px 7px', borderRadius: '0 6px 6px 0', cursor: 'pointer', lineHeight: 1.5 }}>
                                    ×
                                  </span>
                                </span>
                              )}
                            </div>
                            {!estFuture && total > 0 && (
                              <div style={{ marginTop: '8px', maxWidth: '460px' }}>
                                <div style={{ display: 'flex', height: '5px', borderRadius: '3px', overflow: 'hidden', background: colors.background.base }}>
                                  {segments.map(([n, c], i) => n > 0 && <div key={i} style={{ width: `${(n / total) * 100}%`, background: c }} />)}
                                </div>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '5px', fontSize: '11px', color: colors.text.faint }}>
                                  {segments.filter(([n]) => n > 0).map(([n, c, un, plusieurs]) => (
                                    <span key={un} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: c }} />
                                      <strong style={{ color: colors.text.secondary }}>{n}</strong> {n > 1 ? plusieurs : un}
                                    </span>
                                  ))}
                                  {sansReponse > 0 && <span><strong style={{ color: colors.text.secondary }}>{sansReponse}</strong> sans réponse</span>}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Actions (desktop à droite, mobile en dessous) */}
                          {isMobile ? <div style={{ gridColumn: '1 / -1' }}>{actions}</div> : actions}
                        </div>
                      )
                    })()}

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
                    </div>
                  </div>
                ))
              })()}
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

        {['analyse_video', 'notes', 'clotures_saison'].includes(activeSection) && (
          <SousOngletsBar
            items={[
              { key: 'analyse_video', label: t('nav_analyse', lang) },
              { key: 'notes', label: t('nav_evaluations', lang) },
              { key: 'clotures_saison', label: t('nav_clotures', lang) },
            ].filter(it => canView(it.key))}
            activeSection={activeSection} setActiveSection={setActiveSection}
          />
        )}

        {/* ===== ÉVALUATIONS ===== */}
        {activeSection === 'notes' && (
          <>
            <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>{t('eval_titre_joueurs', lang)}</h1>
            <p style={{ color: colors.text.faint, fontSize: '13px', marginBottom: permissions?.notes === 'lecture' ? '0.5rem' : '1.5rem' }}>Fiche d'évaluation par saison — début, mi-saison, fin de saison.</p>
            {permissions?.notes === 'lecture' && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: colors.accent.blue + alpha.subtle, border: '1px solid #60a5fa30', color: colors.accent.blue, fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, marginBottom: 16 }}>
                {t('equipe_mode_lecture', lang)}
              </div>
            )}
            {joueurs.length === 0 ? (
              <div style={{ ...st.card, textAlign: 'center', padding: '3rem' }}><p style={{ color: colors.text.faint }}>{t('eval_ajoute_joueurs', lang)}</p></div>
            ) : (
              (() => {
                // V3 : regroupement par ligne, même règle que Mon équipe
                // (LIGNES_POSTE du tableau Stats) — postes non reconnus en
                // « Autres ». Cartes en grille avec photo, numéro et dernière
                // note de la fiche d'évaluation (/20).
                const LIGNES = [
                  { label: 'Gardiens', postes: ['Gardien'], couleur: colors.accent.amber },
                  { label: 'Défenseurs', postes: ['Défenseur central', 'Latéral droit', 'Latéral gauche'], couleur: colors.accent.blue },
                  { label: 'Milieux', postes: ['Milieu défensif', 'Milieu central', 'Milieu offensif'], couleur: colors.accent.purpleLight },
                  { label: 'Attaquants', postes: ['Ailier droit', 'Ailier gauche', 'Attaquant'], couleur: colors.accent.green },
                ]
                const groupes = [...LIGNES.map(l => ({ ...l, joueurs: [] })), { label: 'Autres', couleur: colors.text.faint, joueurs: [] }]
                joueurs.forEach(j => {
                  const idx = LIGNES.findIndex(l => l.postes.includes(j.poste))
                  groupes[idx === -1 ? LIGNES.length : idx].joueurs.push(j)
                })
                groupes.forEach(g => g.joueurs.sort((a, b) => (a.nom || '').localeCompare(b.nom || '')))
                const nbEvalues = joueurs.filter(j => derniereEvaluation(j.id)).length
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', color: colors.text.faint }}><strong style={{ color: colors.text.primary }}>{nbEvalues}</strong> / {joueurs.length} joueurs évalués</span>
                      <div style={{ flex: '0 1 220px', height: '5px', borderRadius: '3px', background: colors.background.raised, overflow: 'hidden' }}>
                        <div style={{ width: `${joueurs.length ? (nbEvalues / joueurs.length) * 100 : 0}%`, height: '100%', background: colors.accent.green }} />
                      </div>
                    </div>
                    {groupes.filter(g => g.joueurs.length).map(g => (
                      <div key={g.label}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 10px', paddingBottom: '8px', borderBottom: `1px solid ${colors.border.subtle}` }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: g.couleur }} />
                          <p style={{ margin: 0, fontSize: '11px', fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.text.secondary }}>{g.label}</p>
                          <span style={{ fontSize: '11px', color: colors.text.faint }}>{g.joueurs.length}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                          {g.joueurs.map(j => {
                            const ev = derniereEvaluation(j.id)
                            const note = ev ? Number(ev.note_globale_saison) : null
                            const couleurNote = note == null ? colors.text.faint : note >= 14 ? colors.accent.green : note >= 10 ? colors.accent.amber : colors.accent.red
                            return (
                              <button key={j.id} onClick={() => setEvalJoueurOuverte(j)}
                                style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', width: '100%', background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderLeft: `3px solid ${g.couleur}`, borderRadius: '10px', padding: '12px 14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', color: colors.text.primary }}
                                onMouseEnter={e => { e.currentTarget.style.background = colors.background.raised }}
                                onMouseLeave={e => { e.currentTarget.style.background = colors.background.surface }}>
                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                  <Avatar person={j} size={48} bg={g.couleur + '22'} border={`2px solid ${g.couleur}55`} textColor={g.couleur} />
                                  {j.numero_maillot != null && j.numero_maillot !== '' && (
                                    <span style={{ position: 'absolute', bottom: '-4px', right: '-6px', minWidth: '20px', height: '20px', padding: '0 4px', borderRadius: '10px', background: colors.background.base, border: `1px solid ${colors.border.strong}`, fontSize: '10px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>{j.numero_maillot}</span>
                                  )}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.prenom} {j.nom}</p>
                                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: colors.text.faint }}>{j.poste || 'Poste non renseigné'}</p>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                  {note != null ? (
                                    <>
                                      <p style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: couleurNote, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{note}<span style={{ fontSize: '10px', color: colors.text.faint, fontWeight: 600 }}>/20</span></p>
                                      <p style={{ margin: '3px 0 0', fontSize: '10px', color: colors.text.faint }}>{new Date(ev.updated_at).toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'short' })}</p>
                                    </>
                                  ) : (
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: colors.accent.blue, border: `1px solid ${colors.accent.blue}55`, borderRadius: '6px', padding: '4px 8px', whiteSpace: 'nowrap' }}>À évaluer</span>
                                  )}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()
            )}
            {evalJoueurOuverte && (
              <Suspense fallback={<SectionLoader />}>
              <FicheEvaluationJoueur
                equipeJoueurId={evalJoueurOuverte.id}
                educateurId={userId}
                joueurNom={`${evalJoueurOuverte.prenom} ${evalJoueurOuverte.nom}`}
                role="educateur"
                readOnly={!canEdit('notes')}
                onClose={() => setEvalJoueurOuverte(null)}
              />
              </Suspense>
            )}
          </>
        )}

        {/* ===== RECRUTEMENT (Mon Réseau) ===== */}
        {activeSection === 'recrutement' && recrutementActif(profil?.email) && <Suspense fallback={<SectionLoader />}><MoteurRecrutement userId={userId} /></Suspense>}

        {/* ===== MES SÉANCES ===== */}
        {activeSection === 'mes_seances' && (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
              <button
                onClick={() => setModeSeance('rediger')}
                style={{ background: modeSeance === 'rediger' ? colors.accent.blue : colors.background.raised, color: modeSeance === 'rediger' ? colors.black : colors.text.dim, border: 'none', padding: '10px 16px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                ✏️ {t('seance_rediger_fiche', lang)}
              </button>
              <button
                onClick={() => setModeSeance('enregistrer')}
                style={{ background: modeSeance === 'enregistrer' ? colors.accent.blue : colors.background.raised, color: modeSeance === 'enregistrer' ? colors.black : colors.text.dim, border: 'none', padding: '10px 16px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                📥 {t('seance_enregistrer_une', lang)}
              </button>
              {SEANCE_IA_BETA_EMAILS.includes(profil?.email) && (
                <button
                  onClick={() => setModalGenerationIA(true)}
                  style={{ background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', color: colors.text.primary, border: 'none', padding: '10px 16px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
                >
                  🤖 Générer avec l'IA
                </button>
              )}
              <button
                onClick={() => setModeSeance('scanner')}
                style={{ background: modeSeance === 'scanner' ? colors.accent.blue : colors.background.raised, color: modeSeance === 'scanner' ? colors.black : colors.text.dim, border: 'none', padding: '10px 16px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                📷 {t('seance_scanner', lang)}
              </button>
              {SEANCE_IA_BETA_EMAILS.includes(profil?.email) && (
                <button
                  onClick={() => setModeSeance('club')}
                  style={{ background: modeSeance === 'club' ? colors.accent.blue : colors.background.raised, color: modeSeance === 'club' ? colors.black : colors.text.dim, border: 'none', padding: '10px 16px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
                >
                  🏟️ {t('seance_eval_club', lang)}
                </button>
              )}
              <BoutonTutoriel onClick={() => setTutoOuvert('seance')} style={{ marginLeft: 'auto', minHeight: 0, padding: '10px 14px' }} />
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

              {/* Fiches vierges officielles — plus fiables à scanner que du manuscrit
                  libre, mais n'excluent pas le scan libre ci-dessous. */}
              <div style={{ background: colors.background.base, border: `1px solid ${colors.border.faint}`, borderRadius: '10px', padding: '14px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <p style={{ color: colors.accent.green, fontWeight: 700, fontSize: '13px', margin: 0 }}>{t('seance_fiche_officielle_titre', lang)}</p>
                  <p style={{ color: colors.text.faint, fontSize: '12px', margin: '2px 0 0' }}>{t('seance_fiche_officielle_desc', lang)}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { mode: null, label: 'Libre', color: colors.accent.green },
                    { mode: 'BMF', label: 'BMF', color: colors.accent.blue },
                    { mode: 'BEF', label: 'BEF', color: colors.accent.purple },
                    { mode: 'DEF', label: 'DEF', color: colors.accent.orange },
                  ].map(f => (
                    <button key={f.label} type="button" onClick={() => genererFicheVierge(f.mode)}
                      style={{ background: f.color, border: 'none', borderRadius: '8px', padding: '8px 14px', color: colors.black, fontWeight: 700, fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

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
                  {Object.entries(THEMES_SEANCE).map(([phase, groupe]) => (
                    <optgroup label={labelPhase(phase)} key={phase}>
                      {groupe.themes.map(th => (
                        <option key={th.value} value={th.value}>{labelTheme(th.value)}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <select
                  value={uploadSeanceOuverteForm.categorie_age}
                  onChange={e => setUploadSeanceOuverteForm(prev => ({ ...prev, categorie_age: e.target.value }))}
                  style={{ background: colors.background.base, border: `1px solid ${colors.border.faint}`, borderRadius: '10px', padding: '12px 14px', color: colors.text.primary, fontSize: '14px' }}
                >
                  <option value="">Catégorie d'âge (optionnel)</option>
                  <optgroup label="Masculin">
                    {CATEGORIES_MASCULIN.map(c => <option key={c} value={c}>{labelCategorie(c)}</option>)}
                  </optgroup>
                  <optgroup label="Féminin">
                    {CATEGORIES_FEMININ.map(c => <option key={c} value={c}>{labelCategorie(c)}</option>)}
                  </optgroup>
                </select>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['collectif', 'individuel'].map(ty => (
                    <button key={ty} type="button" onClick={() => setUploadSeanceOuverteForm(prev => ({ ...prev, type_seance: ty }))}
                      style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `1px solid ${uploadSeanceOuverteForm.type_seance === ty ? colors.accent.blue : colors.border.faint}`, background: uploadSeanceOuverteForm.type_seance === ty ? colors.accent.blue + alpha.subtle : colors.background.base, color: uploadSeanceOuverteForm.type_seance === ty ? colors.accent.blue : colors.text.faint, fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                      {ty === 'collectif' ? 'Collectif' : 'Individuel'}
                    </button>
                  ))}
                </div>
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
              {brouillonFiche && (
                <div style={{ background: colors.accent.blue + '15', border: `1px solid ${colors.accent.blue}44`, borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ color: colors.text.secondary }}>
                    Un brouillon non enregistré du {new Date(brouillonFiche.savedAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} a été retrouvé.
                  </span>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button onClick={() => { setFiche(brouillonFiche.fiche); setSport(brouillonFiche.sport || 'football'); setBrouillonFiche(null) }}
                      style={{ background: colors.accent.blue, color: colors.black, border: 'none', borderRadius: '8px', padding: '7px 14px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
                      Restaurer
                    </button>
                    <button onClick={() => { try { localStorage.removeItem(`df_fiche_brouillon_${userId}`) } catch { /* ignore */ } setBrouillonFiche(null) }}
                      style={{ background: 'none', border: `1px solid ${colors.border.default}`, color: colors.text.faint, borderRadius: '8px', padding: '7px 14px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
                      Ignorer
                    </button>
                  </div>
                </div>
              )}
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
                  {Object.entries(THEMES_SEANCE).map(([phase, groupe]) => (
                    <optgroup label={labelPhase(phase)} key={phase}>
                      {groupe.themes.map(th => (
                        <option key={th.value} value={th.value}>{labelTheme(th.value)}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {/* Séance libre uniquement (pas BMF/BEF/DEF, qui ont leur propre champ
                    "Principe de jeu" en texte libre plus bas) — dropdown plutôt que texte
                    libre pour que le classement en sous-dossiers dans "Mes séances"
                    fonctionne de façon fiable. */}
                {!fiche.mode_diplome && themeSeanceInfo(fiche.categorie_tactique) && (
                  <select
                    value={fiche.principe_jeu || ''}
                    onChange={e => setFiche(f => ({ ...f, principe_jeu: e.target.value }))}
                    style={{ background: colors.background.base, border: `1px solid ${colors.border.faint}`, borderRadius: '10px', padding: '12px 14px', color: colors.text.primary, fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
                  >
                    <option value="">{t('biblio_principe_optionnel', lang)}</option>
                    {(themeSeanceInfo(fiche.categorie_tactique).phase === 'offensif' ? PRINCIPES_OFFENSIFS : PRINCIPES_DEFENSIFS).map(p => (
                      <option key={p.id} value={p.label}>{t(`principe_${p.id}`, lang)}</option>
                    ))}
                  </select>
                )}
                <select
                  value={fiche.categorie_age}
                  onChange={e => setFiche(f => ({ ...f, categorie_age: e.target.value }))}
                  style={{ background: colors.background.base, border: `1px solid ${colors.border.faint}`, borderRadius: '10px', padding: '12px 14px', color: colors.text.primary, fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
                >
                  <option value="">Catégorie d'âge (optionnel)</option>
                  <optgroup label="Masculin">
                    {CATEGORIES_MASCULIN.map(c => <option key={c} value={c}>{labelCategorie(c)}</option>)}
                  </optgroup>
                  <optgroup label="Féminin">
                    {CATEGORIES_FEMININ.map(c => <option key={c} value={c}>{labelCategorie(c)}</option>)}
                  </optgroup>
                </select>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['collectif', 'individuel'].map(ty => (
                    <button key={ty} type="button" onClick={() => setFiche(f => ({ ...f, type_seance: ty }))}
                      style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `1px solid ${fiche.type_seance === ty ? colors.accent.blue : colors.border.faint}`, background: fiche.type_seance === ty ? colors.accent.blue + alpha.subtle : colors.background.base, color: fiche.type_seance === ty ? colors.accent.blue : colors.text.faint, fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                      {ty === 'collectif' ? 'Collectif' : 'Individuel'}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setSport('football')}
                    style={{ flex: 1, borderRadius: '10px', padding: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', ...(sport === 'football' ? { background: '#4ade80', color: '#0a0a0a', border: 'none' } : { background: '#1a1a1a', color: '#888', border: '1px solid #2a2a2a' }) }}
                  >
                    ⚽ Football
                  </button>
                  <button
                    type="button"
                    onClick={() => setSport('futsal')}
                    style={{ flex: 1, borderRadius: '10px', padding: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', ...(sport === 'futsal' ? { background: '#4ade80', color: '#0a0a0a', border: 'none' } : { background: '#1a1a1a', color: '#888', border: '1px solid #2a2a2a' }) }}
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[null, 'BMF', 'BEF', 'DEF'].map(m => (
                      <button
                        key={m ?? 'libre'}
                        type="button"
                        onClick={() => setFiche(f => ({ ...f, mode_diplome: f.mode_diplome === m ? null : m }))}
                        style={{
                          padding: '10px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                          border: fiche.mode_diplome === m ? '2px solid #4ade80' : '1px solid #2a2a2a',
                          background: fiche.mode_diplome === m ? 'rgba(74,222,128,0.1)' : '#1a1a1a',
                          color: fiche.mode_diplome === m ? '#4ade80' : '#888',
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

                      {(fiche.mode_diplome === 'BEF' || fiche.mode_diplome === 'BMF') && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div>
                            <label style={labelStyle}>Séance N°</label>
                            <input type="text" placeholder="Ex: 1" value={fiche.numero_seance || ''} onChange={e => setFiche(f => ({ ...f, numero_seance: e.target.value }))} style={inputStyle} />
                          </div>
                          {fiche.mode_diplome === 'BEF' && <div>
                            <label style={labelStyle}>Heure de début</label>
                            <input type="time" value={fiche.heure_debut || ''} onChange={e => setFiche(f => ({ ...f, heure_debut: e.target.value }))} style={inputStyle} />
                          </div>}
                        </div>
                      )}

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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {fiche.procedes.length > 1 && (
                        <>
                          <button type="button" onClick={() => deplacerProcedeFiche(i, -1)} disabled={i === 0}
                            style={{ background: 'none', border: 'none', color: i === 0 ? colors.text.disabled : colors.text.faint, cursor: i === 0 ? 'default' : 'pointer', fontSize: '16px', padding: '2px 6px' }}
                            title="Monter">
                            ↑
                          </button>
                          <button type="button" onClick={() => deplacerProcedeFiche(i, 1)} disabled={i === fiche.procedes.length - 1}
                            style={{ background: 'none', border: 'none', color: i === fiche.procedes.length - 1 ? colors.text.disabled : colors.text.faint, cursor: i === fiche.procedes.length - 1 ? 'default' : 'pointer', fontSize: '16px', padding: '2px 6px' }}
                            title="Descendre">
                            ↓
                          </button>
                        </>
                      )}
                      {fiche.procedes.length > 1 && (
                        <button type="button" onClick={() => retirerProcedeFiche(i)}
                          style={{ background: 'none', border: 'none', color: colors.accent.red, cursor: 'pointer', fontSize: '16px', padding: '2px 6px' }}
                          title={t('btn_supprimer', lang)}>
                          ✕
                        </button>
                      )}
                    </div>
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {[
                        { icon: '🎨', label: p.schema_png ? t('tactic_modifier_schema', lang) : t('tactic_ajouter_schema', lang), action: () => setTactipadModal(i), color: '#a78bfa' },
                        { icon: '📚', label: t('biblio_importer_procede', lang), action: () => setModalBiblioImport(i), color: '#60a5fa' },
                        { icon: '💾', label: t('biblio_sauvegarder_procede', lang), action: () => { setShowVisibilityPicker(p); setMetaProc({ ...METAPROC_VIDE, nom: p.titre || '' }) }, color: '#4ade80' },
                      ].map(btn => (
                        <button key={btn.label} type="button" onClick={btn.action} style={{
                          flex: 1, padding: '10px 6px', borderRadius: '10px',
                          border: `1px solid ${btn.color}40`,
                          background: `${btn.color}10`,
                          color: btn.color, fontWeight: 600, fontSize: '12px',
                          cursor: 'pointer', textAlign: 'center', lineHeight: 1.4,
                        }}>
                          <div style={{ fontSize: '20px', marginBottom: '4px' }}>{btn.icon}</div>
                          {btn.label}
                        </button>
                      ))}
                      {p.schema_png && (
                        <img src={miniatureSchema(p.schema_png, 200)} alt="Schéma tactique" style={{ height: '44px', borderRadius: '6px', border: `1px solid ${colors.border.faint}`, flexShrink: 0 }} />
                      )}
                    </div>
                    {fiche.mode_diplome === 'BEF' ? (() => {
                      const befInput = { background: colors.background.surface, border: `1px solid ${colors.border.faint}`, borderRadius: '10px', padding: '10px 12px', color: colors.text.primary, fontSize: '13px', resize: 'vertical', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }
                      const befLabel = { color: colors.text.faint, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', marginTop: '10px', display: 'block' }
                      return (
                        <>
                          <p style={{ color: colors.accent.blue, fontSize: '12px', fontWeight: 700, margin: '4px 0 0' }}>Gabarit officiel BEF — Organisation</p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                            {[['Tps de travail', 'tps_travail'], ['Tps de récup', 'tps_recup'], ['Nbr de séries', 'nb_series'], ['Nbr de répét', 'nb_repet'], ['Rpe', 'rpe']].map(([label, key]) => (
                              <input key={key} placeholder={label} value={p[key]} onChange={e => updateProcede(i, key, e.target.value)} style={befInput} />
                            ))}
                          </div>
                          <label style={befLabel}>Pédagogie</label>
                          <textarea value={p.pedagogie} onChange={e => updateProcede(i, 'pedagogie', e.target.value)} rows={2} style={befInput} />
                          <label style={befLabel}>Surface (zone de terrain, aménagements)</label>
                          <textarea value={p.surface} onChange={e => updateProcede(i, 'surface', e.target.value)} rows={2} style={befInput} />
                          <label style={befLabel}>Comportements attendus (individuels et collectifs)</label>
                          <textarea value={p.comportements_attendus} onChange={e => updateProcede(i, 'comportements_attendus', e.target.value)} rows={3} style={befInput} />

                          <p style={{ color: colors.accent.blue, fontSize: '12px', fontWeight: 700, margin: '10px 0 0' }}>Descriptif</p>
                          <label style={befLabel}>But</label>
                          <textarea value={p.but_bef} onChange={e => updateProcede(i, 'but_bef', e.target.value)} rows={2} style={befInput} />
                          <label style={befLabel}>Consignes (départ, déroulé)</label>
                          <textarea value={p.consignes_bef} onChange={e => updateProcede(i, 'consignes_bef', e.target.value)} rows={2} style={befInput} />
                          <label style={befLabel}>Systèmes de jeu (et postes)</label>
                          <textarea value={p.systemes_jeu} onChange={e => updateProcede(i, 'systemes_jeu', e.target.value)} rows={2} style={befInput} />
                          <label style={befLabel}>Variantes</label>
                          <textarea value={p.variantes_bef} onChange={e => updateProcede(i, 'variantes_bef', e.target.value)} rows={2} style={befInput} />

                          <p style={{ color: colors.accent.blue, fontSize: '12px', fontWeight: 700, margin: '10px 0 0' }}>Critères</p>
                          <label style={befLabel}>Critères de réalisation (comment faire)</label>
                          <textarea value={p.criteres_realisation} onChange={e => updateProcede(i, 'criteres_realisation', e.target.value)} rows={2} style={befInput} />
                          <label style={befLabel}>Critères de réussite (2 max)</label>
                          <textarea value={p.criteres_reussite} onChange={e => updateProcede(i, 'criteres_reussite', e.target.value)} rows={2} style={befInput} />
                          <label style={befLabel}>Dominantes-Impacts Athlétiques</label>
                          <textarea value={p.dominantes_impacts} onChange={e => updateProcede(i, 'dominantes_impacts', e.target.value)} rows={2} style={befInput} />

                          <p style={{ color: colors.accent.blue, fontSize: '12px', fontWeight: 700, margin: '10px 0 0' }}>Bilan</p>
                          <label style={befLabel}>Posture, engagement des joueurs, efficacité de la séance</label>
                          <textarea value={p.bilan_posture} onChange={e => updateProcede(i, 'bilan_posture', e.target.value)} rows={2} style={befInput} />
                          <label style={befLabel}>Remédiations (aménagement et/ou consignes)</label>
                          <textarea value={p.bilan_remediations} onChange={e => updateProcede(i, 'bilan_remediations', e.target.value)} rows={2} style={befInput} />
                        </>
                      )
                    })() : fiche.mode_diplome === 'BMF' ? (() => {
                      // Rubriques du modèle FFF BMF, dans l'ordre de la fiche
                      // papier (cf. FicheBMFContenu). Consignes et Variables
                      // restent deux champs (partagés avec la bibliothèque) mais
                      // s'impriment dans la même case « Consignes/Variables ».
                      const bmfInput = { background: colors.background.surface, border: `1px solid ${colors.border.faint}`, borderRadius: '10px', padding: '10px 12px', color: colors.text.primary, fontSize: '13px', resize: 'vertical', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }
                      const bmfLabel = { color: colors.text.faint, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', marginTop: '10px', display: 'block' }
                      return (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                              <label style={bmfLabel}>Surface</label>
                              <input value={p.surface || ''} onChange={e => updateProcede(i, 'surface', e.target.value)} placeholder="Ex: 30 × 20 m" style={bmfInput} />
                            </div>
                            <div>
                              <label style={bmfLabel}>Séquence</label>
                              <input value={p.sequence || ''} onChange={e => updateProcede(i, 'sequence', e.target.value)} placeholder="Ex: 4 × 5 min" style={bmfInput} />
                            </div>
                          </div>
                          <label style={bmfLabel}>Objectif</label>
                          <textarea value={p.objectif || ''} onChange={e => updateProcede(i, 'objectif', e.target.value)} rows={2} style={bmfInput} />
                          <label style={bmfLabel}>But(s)</label>
                          <textarea value={p.but || ''} onChange={e => updateProcede(i, 'but', e.target.value)} rows={2} style={bmfInput} />
                          <label style={bmfLabel}>Consignes</label>
                          <textarea value={p.consignes || ''} onChange={e => updateProcede(i, 'consignes', e.target.value)} rows={3} style={bmfInput} />
                          <label style={bmfLabel}>Variables</label>
                          <textarea value={p.variables || ''} onChange={e => updateProcede(i, 'variables', e.target.value)} rows={2} style={bmfInput} />
                          <label style={bmfLabel}>Gestion des rotations</label>
                          <textarea value={p.gestion_rotations || ''} onChange={e => updateProcede(i, 'gestion_rotations', e.target.value)} rows={2} style={bmfInput} />
                          <label style={bmfLabel}>Comportements attendus</label>
                          <textarea value={p.comportements_attendus || ''} onChange={e => updateProcede(i, 'comportements_attendus', e.target.value)} rows={2} style={bmfInput} />
                          <label style={bmfLabel}>Critères de réussite</label>
                          <textarea value={p.criteres_reussite || ''} onChange={e => updateProcede(i, 'criteres_reussite', e.target.value)} rows={2} style={bmfInput} />
                        </>
                      )
                    })() : (
                      <>
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
                          placeholder={t('seance_criteres_realisation', lang)}
                          value={p.criteres_realisation}
                          onChange={e => updateProcede(i, 'criteres_realisation', e.target.value)}
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
                      </>
                    )}
                  </div>
                </div>
              ))}

              {showVisibilityPicker && (() => {
                const champLabel = { color: colors.text.faint, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '6px' }
                const champInput = { width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '10px 12px', color: colors.text.primary, fontSize: '14px', boxSizing: 'border-box' }
                const pastilleMeta = (actif) => ({ padding: '7px 14px', borderRadius: '20px', border: `1px solid ${actif ? colors.accent.green : colors.border.default}`, background: actif ? colors.accent.green + alpha.subtle : 'transparent', color: actif ? colors.accent.green : colors.text.faint, fontSize: '13px', cursor: 'pointer', fontWeight: actif ? 700 : 400, fontFamily: 'Inter, sans-serif' })
                const invalide = !metaProc.nom.trim() || !metaProc.theme || !metaProc.categorie_age?.length
                return (
                  <div style={{ position: 'fixed', inset: 0, background: colors.background.overlay, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}
                    onClick={() => setShowVisibilityPicker(null)}>
                    <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '16px', padding: '28px', width: '460px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }}
                      onClick={e => e.stopPropagation()}>
                      <h2 style={{ color: colors.text.primary, margin: '0 0 20px', fontSize: '18px', fontWeight: 800 }}>💾 {t('biblio_sauver_titre', lang)}</h2>

                      <div style={{ marginBottom: '16px' }}>
                        <label style={champLabel}>{t('biblio_champ_type', lang)}</label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {[
                            { val: 'echauffement', label: `🔥 ${t('biblio_tab_echauffement', lang)}` },
                            { val: 'jeu', label: `⚽ ${t('biblio_tab_jeu', lang)}` },
                            { val: 'exercice', label: `🔄 ${t('biblio_tab_exercice', lang)}` },
                            { val: 'situation', label: `🎯 ${t('biblio_tab_situation', lang)}` },
                          ].map(opt => (
                            <button key={opt.val} type="button" onClick={() => setMetaProc(p => ({ ...p, type: opt.val }))} style={pastilleMeta(metaProc.type === opt.val)}>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <label style={champLabel}>{t('biblio_nom_procede', lang)} *</label>
                        <input value={metaProc.nom} onChange={e => setMetaProc(p => ({ ...p, nom: e.target.value }))}
                          placeholder={t('biblio_nom_procede_placeholder', lang)} style={champInput} />
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <label style={champLabel}>{t('biblio_champ_theme', lang)} *</label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {[
                            { valeur: 'Offensif', cle: 'biblio_theme_offensif' },
                            { valeur: 'Défensif', cle: 'biblio_theme_defensif' },
                            { valeur: 'Coup de pied arrêté', cle: 'biblio_theme_cpa' },
                            { valeur: 'Gardien de but', cle: 'biblio_theme_gardien' },
                            { valeur: 'Physique', cle: 'biblio_theme_physique' },
                            { valeur: 'Sans thème', cle: 'biblio_theme_sans' },
                          ].map(th => (
                            <button key={th.valeur} type="button" onClick={() => setMetaProc(p => ({ ...p, theme: th.valeur, principe: '' }))} style={pastilleMeta(metaProc.theme === th.valeur)}>
                              {t(th.cle, lang)}
                            </button>
                          ))}
                        </div>
                      </div>

                      {(metaProc.theme === 'Offensif' || metaProc.theme === 'Défensif') && (
                        <div style={{ marginBottom: '16px' }}>
                          <label style={champLabel}>{t('biblio_principe_label', lang)}</label>
                          <select value={metaProc.principe} onChange={e => setMetaProc(p => ({ ...p, principe: e.target.value }))} style={champInput}>
                            <option value="">{t('biblio_choisir_principe', lang)}</option>
                            {(metaProc.theme === 'Offensif' ? PRINCIPES_OFFENSIFS : PRINCIPES_DEFENSIFS).map(p => (
                              <option key={p.id} value={p.label}>{t(`principe_${p.id}`, lang)}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div style={{ marginBottom: '20px' }}>
                        <label style={champLabel}>{t('biblio_categorie_age_label', lang)} * <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>({t('biblio_plusieurs_choix', lang)})</span></label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {CATEGORIES_AGE_PROCEDE.map(c => (
                            <button key={c} type="button" onClick={() => setMetaProc(p => ({ ...p, categorie_age: toggleDansListe(p.categorie_age, c) }))} style={pastilleMeta(metaProc.categorie_age?.includes(c))}>
                              {labelAgeProcede(c)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ background: colors.accent.green + alpha.subtle, border: `1px solid ${colors.accent.green}30`, borderRadius: '10px', padding: '12px 14px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <input type="checkbox" id="partage-platform-proc" checked={metaProc.partage_platform}
                          onChange={e => setMetaProc(p => ({ ...p, partage_platform: e.target.checked }))}
                          style={{ marginTop: '2px', accentColor: colors.accent.green, width: '15px', height: '15px', flexShrink: 0, cursor: 'pointer' }} />
                        <label htmlFor="partage-platform-proc" style={{ cursor: 'pointer' }}>
                          <div style={{ color: colors.accent.green, fontSize: '12px', fontWeight: 700 }}>{t('biblio_partage_communaute_titre', lang)}</div>
                          <div style={{ color: colors.text.faint, fontSize: '11px', marginTop: '2px', lineHeight: 1.4 }}>
                            {t('biblio_partage_communaute_desc', lang)}
                          </div>
                        </label>
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => setShowVisibilityPicker(null)}
                          style={{ flex: 1, background: 'transparent', border: `1px solid ${colors.border.default}`, borderRadius: '10px', padding: '12px', color: colors.text.faint, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                          {t('btn_annuler', lang)}
                        </button>
                        <button onClick={sauvegarderProcedeBibliotheque} disabled={invalide}
                          style={{ flex: 2, background: invalide ? colors.background.raised : colors.accent.green, border: 'none', borderRadius: '10px', padding: '12px', color: invalide ? colors.text.disabled : colors.black, fontWeight: 800, cursor: invalide ? 'default' : 'pointer', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>
                          💾 {t('biblio_sauvegarder_bouton', lang)}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })()}

              <button
                type="button"
                onClick={ajouterProcedeFiche}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px dashed #4ade8040', background: 'transparent', color: colors.accent.green, fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginBottom: '8px' }}
              >
                + {t('seance_ajouter_procede', lang)}
              </button>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '20px' }}>
                <button
                  onClick={sauvegarderFiche}
                  disabled={savingFiche}
                  style={{ flex: 2, minWidth: '160px', padding: '13px', borderRadius: '10px', border: 'none', background: '#4ade80', color: '#0a0a0a', fontWeight: 700, fontSize: '14px', cursor: 'pointer', opacity: savingFiche ? 0.6 : 1 }}
                >
                  {savingFiche ? 'Enregistrement...' : `💾 ${t('seance_sauvegarder_fiche', lang)}`}
                </button>
                <button
                  onClick={() => window.print()}
                  style={{ flex: 1, minWidth: '110px', padding: '13px', borderRadius: '10px', border: '1px solid #2a2a2a', background: '#1a1a1a', color: '#ccc', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
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
                    style={{ flex: 1, minWidth: '110px', padding: '13px', borderRadius: '10px', border: 'none', background: '#003893', color: colors.text.primary, fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                  >
                    📋 Format FFF
                  </button>
                )}
                <button
                  onClick={() => { setApercuFicheEnCoursOuvert(true); setApercuEnCoursEnHaut(true) }}
                  style={{ flex: 1, minWidth: '110px', padding: '13px', borderRadius: '10px', border: '1px solid #2a2a2a', background: '#1a1a1a', color: '#ccc', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                >
                  {t('seance_apercu', lang)}
                </button>
              </div>
            </div>
            )}

            <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '12px' }}>📋 {t('seance_mes_seances', lang)} ({mesSeancesOuvertes.length})</p>
            {mesSeancesOuvertes.length === 0 ? (
              <p style={{ color: colors.text.disabled, fontSize: '13px' }}>{t(mesSeancesOuvertesChargees ? 'seance_aucune_envoyee' : 'seance_chargement_fiches', lang)}</p>
            ) : (
              (() => {
                const pastille = (actif, couleur) => ({
                  padding: '6px 14px', border: `1px solid ${actif ? couleur : colors.border.default}`, borderRadius: '20px', cursor: 'pointer',
                  fontWeight: actif ? 700 : 500, fontSize: '12px', fontFamily: 'Inter, sans-serif',
                  background: actif ? couleur + alpha.subtle : 'transparent', color: actif ? couleur : colors.text.faint,
                })

                const themesDeLaPhase = filtrePhase !== 'tous' ? THEMES_SEANCE[filtrePhase].themes : []
                const filtresActifs = filtrePhase !== 'tous' || !!filtreTheme || !!filtreCategorieAge || filtreTypeSeance !== 'tous' || filtreAnime

                const seancesFiltrees = mesSeancesOuvertes.filter(s => {
                  const info = themeSeanceInfo(s.categorie_tactique)
                  if (filtrePhase !== 'tous' && info?.phase !== filtrePhase) return false
                  if (filtreTheme && s.categorie_tactique !== filtreTheme) return false
                  if (filtreCategorieAge && s.categorie_age !== filtreCategorieAge) return false
                  if (filtreTypeSeance !== 'tous' && (s.type_seance || 'collectif') !== filtreTypeSeance) return false
                  if (filtreAnime && !s.video_url) return false
                  return true
                })

                const renderCarteSeance = (s) => {
                  const eval_ = Array.isArray(s.evaluation) ? s.evaluation[0] : s.evaluation
                  const infoTheme = themeSeanceInfo(s.categorie_tactique)
                  return (
                    <div key={s.id} style={{ background: colors.background.surface, border: `1px solid ${colors.border.faint}`, borderRadius: '14px', padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>
                          {infoTheme && (
                            <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', marginRight: '8px', background: infoTheme.color + alpha.subtle, color: infoTheme.color }}>
                              {labelTheme(s.categorie_tactique)}
                            </span>
                          )}
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
                        {(s.categorie_age || s.type_seance === 'individuel') && (
                          <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                            {s.categorie_age && (
                              <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', background: colors.background.raised, color: colors.text.secondary, border: `1px solid ${colors.border.default}` }}>
                                {labelCategorie(s.categorie_age)}
                              </span>
                            )}
                            {s.type_seance === 'individuel' && (
                              <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', background: colors.background.raised, color: colors.text.secondary, border: `1px solid ${colors.border.default}` }}>
                                Individuel
                              </span>
                            )}
                          </div>
                        )}
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
                        <button onClick={() => { setFicheApercu(s); setFicheApercuEnHaut(true) }}
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
                        <button onClick={(ev) => { ev.stopPropagation(); if (s.fichier_url) { partagerFiche(s.fichier_url, s.theme) } else { setFicheApercu(s); setFicheApercuEnHaut(true) } }}
                          style={{ background: colors.background.raised, border: `1px solid ${colors.border.default}`, color: colors.text.secondary, padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                          Partager
                        </button>
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
                }

                return (
                  <>
                    {/* Barre de filtres */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', background: colors.background.surface, border: `1px solid ${colors.border.faint}`, borderRadius: '12px', padding: '16px' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ color: colors.text.faint, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginRight: '4px' }}>{t('theme_phase_label', lang)}</span>
                        {['tous', 'offensif', 'defensif'].map(p => (
                          <button key={p} onClick={() => { setFiltrePhase(p); setFiltreTheme('') }}
                            style={pastille(filtrePhase === p, p === 'offensif' ? THEMES_SEANCE.offensif.color : p === 'defensif' ? THEMES_SEANCE.defensif.color : colors.accent.green)}>
                            {p === 'tous' ? t('theme_phase_toutes', lang) : labelPhase(p)}
                          </button>
                        ))}
                      </div>

                      {filtrePhase !== 'tous' && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ color: colors.text.faint, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginRight: '4px' }}>{t('biblio_champ_theme', lang)}</span>
                          <button onClick={() => setFiltreTheme('')} style={pastille(!filtreTheme, colors.accent.green)}>{t('biblio_tab_tous', lang)}</button>
                          {themesDeLaPhase.map(th => (
                            <button key={th.value} onClick={() => setFiltreTheme(th.value === filtreTheme ? '' : th.value)}
                              style={pastille(filtreTheme === th.value, THEMES_SEANCE[filtrePhase].color)}>
                              {labelTheme(th.value)}
                            </button>
                          ))}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ color: colors.text.faint, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Filtres</span>

                        <select value={filtreCategorieAge} onChange={e => setFiltreCategorieAge(e.target.value)}
                          style={{ background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '6px 12px', color: colors.text.primary, fontSize: '12px', cursor: 'pointer' }}>
                          <option value="">{t('toutes_categories', lang)}</option>
                          <optgroup label={t('categorie_masculin', lang)}>
                            {CATEGORIES_MASCULIN.map(c => <option key={c} value={c}>{labelCategorie(c)}</option>)}
                          </optgroup>
                          <optgroup label={t('categorie_feminin', lang)}>
                            {CATEGORIES_FEMININ.map(c => <option key={c} value={c}>{labelCategorie(c)}</option>)}
                          </optgroup>
                        </select>

                        {['tous', 'collectif', 'individuel'].map(ty => (
                          <button key={ty} onClick={() => setFiltreTypeSeance(ty)} style={pastille(filtreTypeSeance === ty, colors.accent.green)}>
                            {ty === 'tous' ? 'Collectif + Individuel' : ty === 'collectif' ? 'Collectif' : 'Individuel'}
                          </button>
                        ))}

                        <button onClick={() => setFiltreAnime(!filtreAnime)} style={pastille(filtreAnime, colors.accent.purpleLight)}>
                          Séances animées
                        </button>

                        {filtresActifs && (
                          <button onClick={() => { setFiltrePhase('tous'); setFiltreTheme(''); setFiltreCategorieAge(''); setFiltreTypeSeance('tous'); setFiltreAnime(false) }}
                            style={pastille(false, colors.accent.red)}>
                            Réinitialiser
                          </button>
                        )}
                      </div>

                      {filtresActifs && (
                        <div style={{ color: colors.text.faint, fontSize: '12px' }}>
                          {seancesFiltrees.length} séance{seancesFiltrees.length > 1 ? 's' : ''} trouvée{seancesFiltrees.length > 1 ? 's' : ''} sur {mesSeancesOuvertes.length}
                        </div>
                      )}
                    </div>

                    {filtresActifs ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {seancesFiltrees.length === 0 ? (
                          <p style={{ color: colors.text.disabled, fontSize: '13px' }}>Aucune séance ne correspond à ces filtres.</p>
                        ) : seancesFiltrees.map(renderCarteSeance)}
                      </div>
                    ) : (() => {
                      const DOSSIERS_PHASE = [
                        { key: 'offensif', label: labelPhase('offensif'), color: THEMES_SEANCE.offensif.color },
                        { key: 'defensif', label: labelPhase('defensif'), color: THEMES_SEANCE.defensif.color },
                        { key: 'aucune', label: t('seance_sans_categorie', lang), color: colors.text.faint },
                      ]
                      const seancesParPhase = mesSeancesOuvertes.reduce((acc, s) => {
                        const phase = themeSeanceInfo(s.categorie_tactique)?.phase || 'aucune'
                        if (!acc[phase]) acc[phase] = []
                        acc[phase].push(s)
                        return acc
                      }, {})
                      const dossiersVisibles = DOSSIERS_PHASE.filter(d => seancesParPhase[d.key]?.length > 0)
                      return (
                        <>
                          {/* Grille de cartes dossiers, groupées par phase */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                            {dossiersVisibles.map(d => {
                              const items = seancesParPhase[d.key]
                              const ouvert = !!dossiersOuverts[d.key]
                              return (
                                <div key={d.key}
                                  onClick={() => setDossiersOuverts(prev => ({ ...prev, [d.key]: !prev[d.key] }))}
                                  style={{ background: d.color + alpha.faint, border: `1px solid ${ouvert ? d.color : d.color + alpha.medium}`, borderRadius: '14px', padding: '22px 16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', textAlign: 'center', transition: 'border-color 0.15s' }}
                                >
                                  <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: colors.text.primary }}>{d.label}</p>
                                  <span style={{ background: d.color, color: '#0a0a0a', fontWeight: 700, fontSize: '11px', padding: '3px 10px', borderRadius: '20px' }}>{items.length}</span>
                                </div>
                              )
                            })}
                          </div>

                          {/* Séances des dossiers ouverts, affichées en dessous — pour Offensif/Défensif,
                              un niveau intermédiaire de sous-dossiers "principes de jeu" (cf.
                              src/constants/principesJeu.js) ; "Sans catégorie" reste une liste plate. */}
                          {dossiersVisibles.filter(d => dossiersOuverts[d.key]).map(d => {
                            const items = seancesParPhase[d.key]
                            const principes = d.key === 'offensif' ? PRINCIPES_OFFENSIFS : d.key === 'defensif' ? PRINCIPES_DEFENSIFS : null
                            if (!principes) {
                              return (
                                <div key={d.key} style={{ marginBottom: '20px' }}>
                                  <p style={{ fontWeight: 700, fontSize: '13px', color: colors.text.muted, marginBottom: '10px' }}>
                                    📁 {d.label} ({items.length})
                                  </p>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {items.map(renderCarteSeance)}
                                  </div>
                                </div>
                              )
                            }
                            // Un principe de jeu regroupe plusieurs libellés (cf. champ
                            // fiche_seance.principe_jeu, rempli via le select "Principe de jeu"
                            // du formulaire de rédaction — pas categorie_tactique, qui sert déjà
                            // au tri Offensif/Défensif du niveau au-dessus) — une même séance
                            // peut donc apparaître dans plusieurs sous-dossiers, par design.
                            const principeSeance = s => s.fiche_seance?.principe_jeu || ''
                            const matchePrincipe = (s, p) => {
                              const val = principeSeance(s)
                              return !!val && (val === p.label || p.themes.some(th => val.includes(th)))
                            }
                            const principesAvecItems = principes
                              .map(p => ({ ...p, items: items.filter(s => matchePrincipe(s, p)) }))
                              .filter(p => p.items.length > 0)
                            // Séances sans principe reconnu (champ vide, ou pas encore migrées) —
                            // toujours accessibles, dans un dossier à part plutôt que masquées.
                            const nonClasses = items.filter(s => !principes.some(p => matchePrincipe(s, p)))
                            return (
                              <div key={d.key} style={{ marginBottom: '20px' }}>
                                <p style={{ fontWeight: 700, fontSize: '13px', color: colors.text.muted, marginBottom: '10px' }}>
                                  📁 {d.label} ({items.length})
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                                  {principesAvecItems.map(p => {
                                    const clePrincipe = `${d.key}:${p.id}`
                                    const ouvertP = !!principesOuverts[clePrincipe]
                                    return (
                                      <div key={p.id}
                                        onClick={() => setPrincipesOuverts(prev => ({ ...prev, [clePrincipe]: !prev[clePrincipe] }))}
                                        style={{ background: colors.background.surface, border: `1px solid ${ouvertP ? d.color : colors.border.faint}`, borderRadius: '10px', padding: '12px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', transition: 'border-color 0.15s' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 600, color: colors.text.dim }}>📁 {t(`principe_${p.id}`, lang)}</span>
                                        <span style={{ background: d.color, color: '#0a0a0a', fontWeight: 700, fontSize: '11px', padding: '2px 9px', borderRadius: '20px', flexShrink: 0 }}>{p.items.length}</span>
                                      </div>
                                    )
                                  })}
                                  {nonClasses.length > 0 && (
                                    <div
                                      onClick={() => setPrincipesOuverts(prev => ({ ...prev, [`${d.key}:_non_classe`]: !prev[`${d.key}:_non_classe`] }))}
                                      style={{ background: colors.background.surface, border: `1px solid ${principesOuverts[`${d.key}:_non_classe`] ? colors.text.faint : colors.border.faint}`, borderRadius: '10px', padding: '12px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', transition: 'border-color 0.15s' }}>
                                      <span style={{ fontSize: '12px', fontWeight: 600, color: colors.text.faint }}>📁 {t('biblio_non_classe', lang)}</span>
                                      <span style={{ background: colors.background.raised, color: colors.text.faint, fontWeight: 700, fontSize: '11px', padding: '2px 9px', borderRadius: '20px', flexShrink: 0 }}>{nonClasses.length}</span>
                                    </div>
                                  )}
                                </div>
                                {principesAvecItems.filter(p => principesOuverts[`${d.key}:${p.id}`]).map(p => (
                                  <div key={p.id} style={{ marginTop: '16px' }}>
                                    <p style={{ fontWeight: 600, fontSize: '12px', color: colors.text.faint, marginBottom: '8px' }}>{t(`principe_${p.id}`, lang)} ({p.items.length})</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                      {p.items.map(renderCarteSeance)}
                                    </div>
                                  </div>
                                ))}
                                {principesOuverts[`${d.key}:_non_classe`] && nonClasses.length > 0 && (
                                  <div style={{ marginTop: '16px' }}>
                                    <p style={{ fontWeight: 600, fontSize: '12px', color: colors.text.faint, marginBottom: '8px' }}>{t('biblio_non_classe', lang)} ({nonClasses.length})</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                      {nonClasses.map(renderCarteSeance)}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </>
                      )
                    })()}
                  </>
                )
              })()
            )}
          </div>
        )}

        {activeSection === 'stages' && clubAffilieAccepte && !permissions && clubAffiliation?.club_id && (
          <Suspense fallback={<SectionLoader />}>
            <StagesModule clubId={clubAffiliation.club_id} accentColor={colors.accent.blue} />
          </Suspense>
        )}

        {activeSection === 'bibliotheque' && (
          <div>
            <div style={{ display: 'flex', gap: 0, background: colors.background.sunken, borderRadius: 12, padding: 4, maxWidth: '100%', width: 'fit-content', marginBottom: 24, border: `1px solid ${colors.border.faint}`, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              {[
                { id: 'personal', label: 'Ma bibliothèque' },
                { id: 'club', label: 'Bibliothèque club' },
                { id: 'platform', label: 'Digital Football' },
                { id: 'videos', label: 'Vidéos' },
              ].map(r => (
                <button key={r.id} onClick={() => setBiblioRubrique(r.id)}
                  style={{
                    padding: '9px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
                    background: biblioRubrique === r.id ? colors.text.primary : 'transparent',
                    color: biblioRubrique === r.id ? colors.background.base : colors.text.faint,
                    fontWeight: biblioRubrique === r.id ? 700 : 400, fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0,
                    fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
                  }}>
                  {r.label}
                </button>
              ))}
            </div>

            {['personal', 'club', 'platform'].includes(biblioRubrique) && (
            <>
            {biblioRubrique === 'club' && !clubAffiliation?.club_id ? (
              <p style={{ color: colors.text.disabled, fontSize: '13px', fontStyle: 'italic' }}>Rejoins un club (code club, dans ton profil) pour accéder à sa bibliothèque partagée.</p>
            ) : (
            <>
            {biblioRubrique === 'personal' && procedeBrouillon && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', background: colors.accent.amber + alpha.subtle, border: `1px solid ${colors.accent.amber}`, borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: colors.text.primary }}>
                  Un procédé n'a pas pu être enregistré (« {procedeBrouillon.form?.nom || 'sans titre'} ») — conservé en brouillon sur cet appareil.
                </p>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button onClick={restaurerProcedeBrouillon} style={{ background: colors.accent.amber, color: colors.black, border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    Restaurer
                  </button>
                  <button onClick={ignorerProcedeBrouillon} style={{ background: 'transparent', color: colors.text.faint, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    Ignorer
                  </button>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <IcoBiblioTitre size={24} color={colors.accent.green} />
                  {t('nav_bibliotheque', lang)}
                </h1>
                <p style={{ fontSize: '13px', color: colors.text.faint }}>{biblio.length} {biblio.length !== 1 ? t('biblio_procedes_plural', lang) : t('biblio_procede_singular', lang)}</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={() => { setBiblioSelectionMode(m => !m); if (biblioSelectionMode) setBiblioSelection([]) }}
                  style={{ background: biblioSelectionMode ? colors.accent.green + alpha.subtle : 'transparent', border: `1px solid ${biblioSelectionMode ? colors.accent.green : colors.border.default}`, color: biblioSelectionMode ? colors.accent.green : colors.text.faint, borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  {biblioSelectionMode ? t('biblio_annuler_selection', lang) : t('biblio_selection_multiple', lang)}
                </button>
                {biblioRubrique === 'personal' && canEdit('entrainements') && (
                  <>
                    <button onClick={() => setModalScannerProc(true)}
                      style={{ background: 'transparent', color: colors.accent.green, border: `1px solid ${colors.accent.green}`, borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <IcoCamera /> {t('scanproc_bouton', lang)}
                    </button>
                    <button onClick={() => { setProcedeEnEdition(null); setProcedeForm(PROCEDE_VIDE); setModalProcede(true) }}
                      style={{ background: colors.accent.blue, color: colors.black, border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '7px' }}>
                      + {t('biblio_nouveau_procede', lang)}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {[
                { id: 'tous', label: t('biblio_tab_tous', lang), Icon: IcoTypeTous },
                { id: 'echauffement', label: t('biblio_tab_echauffement', lang), Icon: IcoTypeEchauffement },
                { id: 'jeu', label: t('biblio_tab_jeu', lang), Icon: IcoTypeJeu },
                { id: 'exercice', label: t('biblio_tab_exercice', lang), Icon: IcoTypeExercice },
                { id: 'situation', label: t('biblio_tab_situation', lang), Icon: IcoTypeSituation },
              ].map(tab => {
                const nb = tab.id === 'tous' ? biblio.length : biblio.filter(p => p.type === tab.id).length
                const actif = biblioTab === tab.id
                return (
                  <button key={tab.id} onClick={() => setBiblioTab(tab.id)}
                    style={{ background: actif ? colors.accent.blue + alpha.subtle : 'transparent', border: `1px solid ${actif ? colors.accent.blue + alpha.medium : colors.border.default}`, color: actif ? colors.accent.blue : colors.text.secondary, padding: '7px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: actif ? 700 : 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '7px', opacity: nb === 0 && !actif ? 0.55 : 1 }}>
                    <tab.Icon size={14} color={actif ? colors.accent.blue : colors.text.faint} />
                    {tab.label}
                    <span style={{ fontSize: '11px', fontWeight: 700, color: actif ? colors.accent.blue : colors.text.faint, fontVariantNumeric: 'tabular-nums' }}>{nb}</span>
                  </button>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div style={{ flex: 2, minWidth: '200px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.text.faint, display: 'flex', pointerEvents: 'none' }}><IcoSearch /></span>
                <input value={biblioSearch} onChange={e => setBiblioSearch(e.target.value)} placeholder={t('biblio_rechercher_placeholder', lang)}
                  style={{ width: '100%', background: colors.background.surfaceAlt, border: `1px solid ${colors.border.default}`, borderRadius: '10px', color: colors.text.primary, padding: '10px 14px 10px 38px', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <select value={biblioFiltreCategorieAge} onChange={e => setBiblioFiltreCategorieAge(e.target.value)}
                style={{ flex: 1, minWidth: '160px', background: colors.background.surfaceAlt, border: `1px solid ${colors.border.default}`, borderRadius: '10px', color: colors.text.primary, padding: '10px 14px', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}>
                <option value="">{t('biblio_toutes_categories_age', lang)}</option>
                {CATEGORIES_AGE_PROCEDE.map(c => <option key={c} value={c}>{labelAgeProcede(c)}</option>)}
              </select>
            </div>

            {biblioLoading ? (
              <p style={{ textAlign: 'center', color: colors.text.disabled, padding: '48px 0' }}>{t('jexp_chargement', lang)}</p>
            ) : (() => {
              const TYPE_CONFIG = {
                jeu: { label: t('biblio_tab_jeu', lang), Icon: IcoTypeJeu, color: colors.accent.green, bg: colors.accent.green + alpha.subtle, border: colors.accent.green + alpha.light },
                exercice: { label: t('biblio_tab_exercice', lang), Icon: IcoTypeExercice, color: colors.accent.blue, bg: colors.accent.blue + alpha.subtle, border: colors.accent.blue + alpha.light },
                situation: { label: t('biblio_tab_situation', lang), Icon: IcoTypeSituation, color: colors.accent.orange, bg: colors.accent.orange + alpha.subtle, border: colors.accent.orange + alpha.light },
                echauffement: { label: t('biblio_tab_echauffement', lang), Icon: IcoTypeEchauffement, color: '#f0c030', bg: '#f0c03015', border: '#f0c03030' },
              }
              const pastille = (actif, couleur) => ({
                padding: '6px 14px', border: `1px solid ${actif ? couleur : colors.border.default}`, borderRadius: '20px', cursor: 'pointer',
                fontWeight: actif ? 700 : 500, fontSize: '12px', fontFamily: 'Inter, sans-serif',
                background: actif ? couleur + alpha.subtle : 'transparent', color: actif ? couleur : colors.text.faint,
              })
              // Filtre thème (phase Offensif/Défensif + thème officiel FFF, cf.
              // src/lib/themesSeance.js — même système que "Mes séances") :
              // disponible partout, y compris "Ma bibliothèque", dès qu'elle
              // contient assez de procédés pour en justifier le tri. Le
              // classement en dossiers reste réservé aux bibliothèques
              // partagées (avecDossiers, plus bas) — une liste perso reste en
              // général trop réduite pour ça, mais le filtre seul s'applique
              // bien à tout volume.
              const avecThemes = ['personal', 'club', 'platform'].includes(biblioRubrique)
              const themesDeLaPhase = biblioFiltrePhase !== 'tous' ? THEMES_SEANCE[biblioFiltrePhase].themes : []
              // Deux échelles de thème coexistent sur `theme` : les valeurs FFF (cf.
              // THEMES_SEANCE, ex. 'conservation') pour les procédés créés via le
              // formulaire complet, et depuis la modale de sauvegarde enrichie les
              // libellés de phase bruts 'Offensif'/'Défensif' — les deux doivent
              // alimenter les mêmes filtres et dossiers par phase.
              const phaseDuTheme = theme => theme === 'Offensif' ? 'offensif' : theme === 'Défensif' ? 'defensif' : themeSeanceInfo(theme)?.phase
              const filtres = biblio.filter(p => {
                const matchTab = biblioTab === 'tous' || p.type === biblioTab
                const matchSearch = !biblioSearch.trim() || `${p.nom} ${p.theme} ${p.tags} ${p.description}`.toLowerCase().includes(biblioSearch.toLowerCase())
                const matchPhase = !avecThemes || biblioFiltrePhase === 'tous' || phaseDuTheme(p.theme) === biblioFiltrePhase
                const matchTheme = !avecThemes || !biblioFiltreTheme || p.theme === biblioFiltreTheme
                const matchCategorieAge = !biblioFiltreCategorieAge || (p.categorie_age || []).includes(biblioFiltreCategorieAge)
                return matchTab && matchSearch && matchPhase && matchTheme && matchCategorieAge
              })
              const barreThemes = avecThemes && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', paddingBottom: '16px', borderBottom: `1px solid ${colors.border.subtle}` }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ color: colors.text.faint, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginRight: '4px' }}>{t('theme_phase_label', lang)}</span>
                    {['tous', 'offensif', 'defensif'].map(p => (
                      <button key={p} onClick={() => { setBiblioFiltrePhase(p); setBiblioFiltreTheme('') }}
                        style={pastille(biblioFiltrePhase === p, p === 'offensif' ? THEMES_SEANCE.offensif.color : p === 'defensif' ? THEMES_SEANCE.defensif.color : colors.accent.green)}>
                        {p === 'tous' ? t('theme_phase_toutes', lang) : labelPhase(p)}
                      </button>
                    ))}
                  </div>
                  {biblioFiltrePhase !== 'tous' && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ color: colors.text.faint, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginRight: '4px' }}>{t('biblio_champ_theme', lang)}</span>
                      <button onClick={() => setBiblioFiltreTheme('')} style={pastille(!biblioFiltreTheme, colors.accent.green)}>{t('biblio_tab_tous', lang)}</button>
                      {themesDeLaPhase.map(th => (
                        <button key={th.value} onClick={() => setBiblioFiltreTheme(th.value === biblioFiltreTheme ? '' : th.value)}
                          style={pastille(biblioFiltreTheme === th.value, THEMES_SEANCE[biblioFiltrePhase].color)}>
                          {labelTheme(th.value)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
              if (filtres.length === 0) return (
                <>
                  {barreThemes}
                  <div style={{ textAlign: 'center', padding: '64px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', opacity: 0.4 }}>
                      <IcoBiblioVide size={56} color={colors.accent.green} />
                    </div>
                    <p style={{ fontSize: '14px', color: colors.text.disabled, marginBottom: '4px' }}>{t('biblio_aucun_procede_trouve', lang)}</p>
                    <p style={{ fontSize: '12px', color: colors.border.strong }}>{t('biblio_creer_premier', lang)}</p>
                  </div>
                </>
              )
              const renderCarteProcede = (p) => {
                const cfg = TYPE_CONFIG[p.type] || TYPE_CONFIG.exercice
                const estSelectionne = biblioSelection.some(x => x.id === p.id)
                // Pas de colonne "source" en base : le badge Digital Football/Club se
                // déduit du rubrique actif (biblioRubrique), qui détermine déjà quelle
                // requête a chargé `biblio` (partage_platform vs partage_club) — inutile
                // de dupliquer cette info dans une colonne, cf. bibliotheque_exercices.
                const sourceBadge = biblioRubrique === 'platform' ? { label: 'Digital Football', couleur: true }
                  : biblioRubrique === 'club' ? { label: 'Club', couleur: false } : null
                const ombreBase = estSelectionne ? `0 0 0 2px ${colors.accent.green}` : 'none'
                const ombreHover = `${estSelectionne ? `0 0 0 2px ${colors.accent.green}, ` : ''}0 10px 28px rgba(0,0,0,0.35)`
                return (
                  <div key={p.id} onClick={() => biblioSelectionMode && basculerSelectionBiblio(p)}
                    style={{ background: colors.background.surface, borderRadius: '14px', border: `1px solid ${estSelectionne ? colors.accent.green : colors.border.subtle}`, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: ombreBase, transition: 'transform 0.15s, box-shadow 0.15s', position: 'relative', cursor: biblioSelectionMode ? 'pointer' : 'default' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = ombreHover }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ombreBase }}>

                    {/* Image (schéma tactique) ou terrain stylisé */}
                    <div style={{ height: '140px', background: colors.background.base, position: 'relative', overflow: 'hidden', flexShrink: 0, borderBottom: `2px solid ${cfg.color}` }}>
                      {p.schema_png ? (
                        <img src={miniatureSchema(p.schema_png, 500)} loading="lazy" alt="Schéma tactique" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <>
                          <TerrainMiniature couleur="#ffffff" />
                          <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: cfg.color + '30', border: `1px solid ${cfg.color}70` }}>
                            <cfg.Icon size={18} color={cfg.color} />
                          </span>
                        </>
                      )}

                      {sourceBadge && (
                        <div style={{ position: 'absolute', top: '8px', left: '8px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '6px', background: sourceBadge.couleur ? colors.accent.green + '20' : '#00000080', color: sourceBadge.couleur ? colors.accent.green : colors.text.secondary, fontSize: '10px', fontWeight: 700, backdropFilter: 'blur(4px)', border: `1px solid ${sourceBadge.couleur ? colors.accent.green + '30' : colors.border.strong}` }}>
                            {sourceBadge.label}
                          </span>
                        </div>
                      )}

                      <div style={{ position: 'absolute', bottom: '8px', right: '8px', display: 'flex', gap: '6px' }}>
                        {p.duree && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', background: '#000000b3', color: '#e5e7eb', fontSize: '11px', fontWeight: 600, backdropFilter: 'blur(4px)' }}><IcoChrono />{p.duree} min</span>}
                        {p.nb_joueurs && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', background: '#000000b3', color: '#e5e7eb', fontSize: '11px', fontWeight: 600, backdropFilter: 'blur(4px)', maxWidth: '130px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}><IcoGroupe />{p.nb_joueurs}</span>}
                      </div>

                      {biblioSelectionMode && (
                        <span style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 1, width: '20px', height: '20px', borderRadius: '6px', border: `2px solid ${estSelectionne ? colors.accent.green : colors.border.default}`, background: estSelectionne ? colors.accent.green : colors.background.overlay, color: colors.black, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 900 }}>
                          {estSelectionne ? '✓' : ''}
                        </span>
                      )}

                      {!biblioSelectionMode && (
                        p.educateur_id === userId ? (
                          canEdit('entrainements') && (
                            <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '4px' }}>
                              <button onClick={(e) => { e.stopPropagation(); ouvrirEditionProcede(p) }} style={{ background: '#000000b3', border: 'none', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e5e7eb', cursor: 'pointer', backdropFilter: 'blur(4px)' }} title={t('btn_modifier', lang)}><IcoCrayon /></button>
                              <button onClick={(e) => { e.stopPropagation(); supprimerProcede(p.id) }} style={{ background: '#000000b3', border: 'none', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fca5a5', cursor: 'pointer', backdropFilter: 'blur(4px)' }} title={t('btn_supprimer', lang)}><IcoCorbeille /></button>
                            </div>
                          )
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); copierProcede(p) }}
                            style={{ position: 'absolute', top: '8px', right: '8px', background: colors.accent.blue + alpha.subtle, border: `1px solid ${colors.accent.blue}50`, color: colors.accent.blue, borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                            Copier
                          </button>
                        )
                      )}
                    </div>

                    {/* Corps */}
                    <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: cfg.color + '1a', color: cfg.color, fontSize: '10px', fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', padding: '3px 8px', borderRadius: '6px', width: 'fit-content' }}>
                        <cfg.Icon size={11} color={cfg.color} /> {cfg.label}
                      </span>

                      <h4 style={{ color: colors.text.primary, fontWeight: 800, fontSize: '14px', margin: 0, lineHeight: 1.3 }}>{p.nom}</h4>

                      {p.objectif && <p style={{ color: cfg.color, fontSize: '12px', margin: 0, fontWeight: 600 }}>{p.objectif}</p>}

                      {p.educateur_id !== userId && p.educateur && (
                        <p style={{ fontSize: '11px', color: colors.text.faint, margin: 0 }}>Par {p.educateur.prenom} {p.educateur.nom}</p>
                      )}

                      {p.theme && p.theme !== 'Sans thème' && <p style={{ display: 'flex', alignItems: 'center', gap: '5px', color: colors.text.faint, fontSize: '12px', margin: 0 }}><IcoPin />{labelThemeProcede(p.theme)}</p>}
                    </div>

                    {/* Actions footer — toujours visibles mais discrètes */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: `1px solid ${colors.border.subtle}` }}>
                      <button onClick={(e) => { e.stopPropagation(); ouvrirApercuProcede(p) }}
                        style={{ padding: '11px', border: 'none', borderRight: `1px solid ${colors.border.subtle}`, background: 'transparent', color: colors.text.secondary, fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'Inter, sans-serif' }}
                        onMouseEnter={e => { e.currentTarget.style.background = colors.background.raised; e.currentTarget.style.color = colors.text.primary }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = colors.text.secondary }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><IcoOeil />{t('biblio_voir', lang)}</span>
                      </button>
                      {biblioSelectionMode ? (
                        <button onClick={(e) => { e.stopPropagation(); basculerSelectionBiblio(p) }}
                          style={{ padding: '11px', border: 'none', background: 'transparent', color: colors.accent.green, fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = colors.accent.green + '10'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          {estSelectionne ? t('biblio_selectionne', lang) : t('biblio_selectionner', lang)}
                        </button>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); importerProcedeVersNouvelleSeance(p) }}
                          style={{ padding: '11px', border: 'none', background: 'transparent', color: colors.accent.green, fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = colors.accent.green + '10'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          + {t('biblio_importer_ma_seance', lang)}
                        </button>
                      )}
                    </div>
                  </div>
                )
              }
              // Dossiers par phase (Offensif/Défensif, comme "Mes séances") : pour
              // les bibliothèques partagées (club/platform), potentiellement
              // fournies par plusieurs éducateurs ; "Ma bibliothèque" reste une
              // liste plate (le filtre thème ci-dessus y suffit), en général
              // trop réduite pour justifier des dossiers en plus.
              // Masqués dès qu'un type précis (pastilles au-dessus) ou un
              // thème/phase (barre ci-dessus) est déjà sélectionné — le
              // classement ferait alors doublon avec le filtre.
              const avecDossiers = ['club', 'platform'].includes(biblioRubrique) && biblioTab === 'tous' && biblioFiltrePhase === 'tous' && !biblioFiltreTheme
              if (!avecDossiers) return (
                <>
                  {barreThemes}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                    {filtres.map(renderCarteProcede)}
                  </div>
                </>
              )
              const DOSSIERS_PHASE = [
                { key: 'offensif', label: labelPhase('offensif'), color: THEMES_SEANCE.offensif.color },
                { key: 'defensif', label: labelPhase('defensif'), color: THEMES_SEANCE.defensif.color },
                { key: 'aucun', label: t('biblio_theme_sans', lang), color: colors.text.faint },
              ]
              const parPhase = filtres.reduce((acc, p) => {
                const phase = phaseDuTheme(p.theme) || 'aucun'
                if (!acc[phase]) acc[phase] = []
                acc[phase].push(p)
                return acc
              }, {})
              const dossiersVisibles = DOSSIERS_PHASE.filter(d => parPhase[d.key]?.length > 0)
              return (
                <>
                  {barreThemes}
                  {dossiersVisibles.map(d => (
                    <div key={d.key} style={{ marginBottom: '28px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <p style={{ color: d.color, fontWeight: 800, fontSize: '15px', margin: 0 }}>{d.label}</p>
                        <span style={{ color: colors.text.disabled, fontSize: '12px' }}>{parPhase[d.key].length} {parPhase[d.key].length > 1 ? t('biblio_procedes_plural', lang) : t('biblio_procede_singular', lang)}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                        {parPhase[d.key].map(renderCarteProcede)}
                      </div>
                    </div>
                  ))}
                </>
              )
            })()}
            </>
            )}
            </>
            )}

            {biblioRubrique === 'videos' && (
              <div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'perso', label: 'Ma bibliothèque' },
                    { id: 'df', label: 'Digital Football' },
                  ].map(t2 => (
                    <button key={t2.id} onClick={() => setBiblioVideoTab(t2.id)}
                      style={{ padding: '8px 16px', borderRadius: '8px', border: biblioVideoTab === t2.id ? `1px solid ${colors.accent.blue}` : `1px solid ${colors.border.default}`, background: biblioVideoTab === t2.id ? colors.accent.blue + '20' : colors.background.surface, color: biblioVideoTab === t2.id ? colors.accent.blue : colors.text.faint, fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                      {t2.label}
                    </button>
                  ))}
                </div>
                {biblioVideoTab === 'perso' && (
                  <Suspense fallback={<SectionLoader />}><BibliothequeVideos type="perso" proprietaireId={userId} peutAjouter accentColor={colors.accent.blue} /></Suspense>
                )}
                {biblioVideoTab === 'df' && (
                  <Suspense fallback={<SectionLoader />}><BibliothequeVideos type="df" peutAjouter={false} accentColor={colors.accent.blue} /></Suspense>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Barre flottante : sélection multiple de procédés → créer une séance ── */}
        {biblioSelectionMode && biblioSelection.length > 0 && (
          <div style={{ position: 'fixed', left: '50%', bottom: '24px', transform: 'translateX(-50%)', zIndex: 250, background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '14px', padding: '12px 16px', boxShadow: '0 8px 24px rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', gap: '14px', maxWidth: 'calc(100vw - 32px)', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: colors.text.primary, whiteSpace: 'nowrap' }}>
              {biblioSelection.length} {biblioSelection.length > 1 ? t('biblio_procedes_plural', lang) : t('biblio_procede_singular', lang)}
            </span>
            <button onClick={() => { setBiblioSelectionMode(false); setBiblioSelection([]) }}
              style={{ background: 'transparent', border: `1px solid ${colors.border.default}`, color: colors.text.faint, borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
              {t('biblio_annuler_selection', lang)}
            </button>
            <button onClick={importerSelectionVersNouvelleSeance}
              style={{ background: colors.accent.green, color: colors.black, border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
              {t('biblio_creer_seance_selection', lang)}
            </button>
          </div>
        )}

        {/* ── Modal Scanner un procédé (photo → IA → bibliothèque) ── */}
        {modalScannerProc && (
          <div style={{ position: 'fixed', inset: 0, background: colors.background.overlay, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}
            onClick={() => setModalScannerProc(false)}>
            <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '16px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}
              onClick={e => e.stopPropagation()}>
              <Suspense fallback={<SectionLoader />}>
              <ScannerProc
                userId={userId}
                clubId={clubAffiliation?.club_id}
                lang={lang}
                onFermer={() => setModalScannerProc(false)}
                onImporte={() => { setModalScannerProc(false); chargerBiblio(userId, biblioRubrique === 'videos' ? 'personal' : biblioRubrique); afficherToast('Ajouté à la bibliothèque') }}
              />
              </Suspense>
            </div>
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

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '8px' }}>Visible dans</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 140px', minWidth: '140px', textAlign: 'left', padding: '12px', border: `2px solid ${colors.accent.blue}`, borderRadius: '10px', background: colors.accent.blue + alpha.subtle, fontFamily: 'Inter, sans-serif' }}>
                    <div style={{ fontWeight: 700, color: colors.text.primary, fontSize: '13px', marginBottom: '3px' }}>Ma bibliothèque</div>
                    <div style={{ color: colors.text.faint, fontSize: '11px' }}>Toujours visible par toi</div>
                  </div>
                  {[
                    { key: 'partage_club', label: 'Bibliothèque club', desc: 'Partagé avec ton club', disabled: !clubAffiliation?.club_id },
                    { key: 'partage_platform', label: 'Digital Football', desc: 'Partagé avec tous les éducateurs' },
                  ].map(opt => (
                    <button key={opt.key} type="button" disabled={opt.disabled}
                      onClick={() => !opt.disabled && setProcedeForm(f => ({ ...f, [opt.key]: !f[opt.key] }))}
                      style={{
                        flex: '1 1 140px', minWidth: '140px', textAlign: 'left', padding: '12px',
                        border: `2px solid ${procedeForm[opt.key] ? colors.accent.blue : colors.border.default}`,
                        borderRadius: '10px', cursor: opt.disabled ? 'not-allowed' : 'pointer',
                        background: procedeForm[opt.key] ? colors.accent.blue + alpha.subtle : colors.background.surfaceAlt,
                        opacity: opt.disabled ? 0.4 : 1, fontFamily: 'Inter, sans-serif',
                      }}>
                      <div style={{ fontWeight: 700, color: colors.text.primary, fontSize: '13px', marginBottom: '3px' }}>{opt.label}</div>
                      <div style={{ color: colors.text.faint, fontSize: '11px' }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {[
                { key: 'nom', label: t('biblio_champ_nom', lang), placeholder: t('biblio_placeholder_nom', lang), required: true },
              ].map(field => (
                <div key={field.key} style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '6px' }}>{field.label}</label>
                  <input type="text" value={procedeForm[field.key]} onChange={e => setProcedeForm(f => ({ ...f, [field.key]: e.target.value }))} placeholder={field.placeholder}
                    style={{ width: '100%', background: colors.background.surfaceAlt, border: `1px solid ${colors.border.default}`, borderRadius: '10px', color: colors.text.primary, padding: '10px 14px', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '6px' }}>{t('biblio_champ_theme', lang)}</label>
                <select value={procedeForm.theme} onChange={e => setProcedeForm(f => ({ ...f, theme: e.target.value }))}
                  style={{ width: '100%', background: colors.background.surfaceAlt, border: `1px solid ${colors.border.default}`, borderRadius: '10px', color: colors.text.primary, padding: '10px 14px', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}>
                  <option value="">{t('seance_choisis_categorie', lang)}</option>
                  {Object.entries(THEMES_SEANCE).map(([phase, groupe]) => (
                    <optgroup label={labelPhase(phase)} key={phase}>
                      {groupe.themes.map(th => (
                        <option key={th.value} value={th.value}>{labelTheme(th.value)}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '6px' }}>
                  {t('biblio_categorie_age_label', lang)} <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>({t('biblio_plusieurs_choix', lang)})</span>
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {CATEGORIES_AGE_PROCEDE.map(c => {
                    const actif = procedeForm.categorie_age?.includes(c)
                    return (
                      <button key={c} type="button" onClick={() => setProcedeForm(f => ({ ...f, categorie_age: toggleDansListe(f.categorie_age, c) }))}
                        style={{ padding: '7px 14px', borderRadius: '20px', border: `1px solid ${actif ? colors.accent.blue : colors.border.default}`, background: actif ? colors.accent.blue + alpha.subtle : 'transparent', color: actif ? colors.accent.blue : colors.text.faint, fontSize: '13px', cursor: 'pointer', fontWeight: actif ? 700 : 400, fontFamily: 'Inter, sans-serif' }}>
                        {labelAgeProcede(c)}
                      </button>
                    )
                  })}
                </div>
              </div>

              {[
                { key: 'objectif', label: t('biblio_champ_objectif', lang), placeholder: t('biblio_placeholder_objectif', lang), multiline: true },
                { key: 'but', label: t('biblio_champ_but', lang), placeholder: t('biblio_placeholder_but', lang), multiline: true },
                { key: 'criteres_realisation', label: t('biblio_champ_criteres', lang), placeholder: t('biblio_placeholder_criteres', lang), multiline: true },
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
                      <img src={miniatureSchema(procedeForm.schema_png, 200)} alt="Schéma tactique" style={{ height: '44px', borderRadius: '6px', border: `1px solid ${colors.border.faint}` }} />
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
                initialSchema={procedeForm.schema_data}
                onValider={(png, schema) => {
                  setProcedeForm(f => ({ ...f, schema_png: png, schema_data: schema }))
                  setShowTactipadBiblio(false)
                  // PNG envoyé sur Cloudinary en arrière-plan, lien substitué
                  // seulement si le schéma n'a pas été changé entre-temps.
                  remplacerSchemaParLien(png, lien => setProcedeForm(f => (f.schema_png === png ? { ...f, schema_png: lien } : f)))
                }}
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
                      <p style={{ fontSize: '11px', color: colors.text.faint }}>{labelThemeProcede(p.theme) || p.type}{p.duree ? ` · ${p.duree} min` : ''}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                      <button onClick={() => ouvrirApercuProcede(p)}
                        style={{ background: 'transparent', border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '6px 12px', color: colors.text.dim, fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                        {t('biblio_voir', lang)}
                      </button>
                      <button onClick={() => importerProcedeDansBloc(modalBiblioImport, p)}
                        style={{ background: colors.accent.blue, color: colors.black, border: 'none', borderRadius: '8px', width: '32px', height: '32px', fontSize: '18px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}
                        title={t('biblio_importer_action', lang)}>
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Modal aperçu en grand d'un procédé de bibliothèque (bouton "Voir") ── */}
        {procedeActif && (() => {
          const APERCU_TYPE = {
            jeu: { label: t('biblio_tab_jeu', lang), emoji: '⚽', color: colors.accent.green },
            exercice: { label: t('biblio_tab_exercice', lang), emoji: '🔄', color: colors.accent.blue },
            situation: { label: t('biblio_tab_situation', lang), emoji: '🎯', color: colors.accent.orange },
            echauffement: { label: t('biblio_tab_echauffement', lang), emoji: '🔥', color: '#f0c030' },
          }
          const cfg = APERCU_TYPE[procedeActif.type] || APERCU_TYPE.exercice
          const champ = (label, valeur) => valeur && (
            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>{label}</p>
              <p style={{ fontSize: '13px', color: colors.text.dim, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{valeur}</p>
            </div>
          )
          return (
            <div style={{ position: 'fixed', inset: 0, background: colors.background.overlay, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
              onClick={() => setProcedeActif(null)}>
              <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '20px', padding: '28px', maxWidth: '640px', width: '100%', maxHeight: '88vh', overflowY: 'auto' }}
                onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '12px' }}>
                  <div>
                    <span style={{ background: cfg.color + alpha.subtle, border: `1px solid ${cfg.color}40`, color: cfg.color, fontSize: '10px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                      {cfg.emoji} {cfg.label}
                    </span>
                    <h2 style={{ fontSize: '19px', fontWeight: 800, marginBottom: '2px' }}>{procedeActif.nom}</h2>
                    {procedeActif.theme && <p style={{ fontSize: '12px', color: themeSeanceInfo(procedeActif.theme)?.color || cfg.color, fontWeight: 600 }}>{labelThemeProcede(procedeActif.theme)}</p>}
                    {procedeActif.educateur_id !== userId && procedeActif.educateur && (
                      <div style={{ marginTop: '4px' }}>
                        <p style={{ fontSize: '12px', color: colors.text.faint, margin: 0 }}>Par {procedeActif.educateur.prenom} {procedeActif.educateur.nom}</p>
                        {(procedeActif.educateur.diplome && procedeActif.educateur.diplome !== 'Aucun diplôme' || procedeActif.educateur.categorie) && (
                          <p style={{ fontSize: '11px', color: colors.text.disabled, margin: '1px 0 0' }}>
                            {[procedeActif.educateur.diplome && procedeActif.educateur.diplome !== 'Aucun diplôme' ? procedeActif.educateur.diplome : null, procedeActif.educateur.categorie].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <button onClick={() => setProcedeActif(null)} style={{ background: 'transparent', border: 'none', color: colors.text.faint, fontSize: '20px', cursor: 'pointer', flexShrink: 0 }}>✕</button>
                </div>

                {procedeActif.schema_png && (
                  <img src={procedeActif.schema_png} alt="Schéma tactique" style={{ width: '100%', maxHeight: '320px', objectFit: 'contain', borderRadius: '10px', border: `1px solid ${colors.border.faint}`, background: colors.background.base, marginBottom: '16px' }} />
                )}

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {procedeActif.duree && <span style={{ fontSize: '11px', color: colors.text.faint, background: colors.background.raised, padding: '3px 10px', borderRadius: '6px' }}>⏱️ {procedeActif.duree} min</span>}
                  {procedeActif.nb_joueurs && <span style={{ fontSize: '11px', color: colors.text.faint, background: colors.background.raised, padding: '3px 10px', borderRadius: '6px' }}>👥 {procedeActif.nb_joueurs}</span>}
                </div>

                {champ(t('biblio_champ_objectif', lang), procedeActif.objectif)}
                {champ(t('biblio_champ_but', lang), procedeActif.but)}
                {champ(t('biblio_champ_criteres', lang), procedeActif.criteres_realisation)}
                {champ(t('biblio_champ_description', lang), procedeActif.description)}
                {champ(t('biblio_champ_consignes', lang), procedeActif.consignes)}
                {champ(t('biblio_champ_variables', lang), procedeActif.variables)}

                {procedeActif.tags && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '18px' }}>
                    {procedeActif.tags.split(',').map(tag => tag.trim()).filter(Boolean).map(tag => (
                      <span key={tag} style={{ fontSize: '10px', color: colors.text.disabled, background: colors.background.surfaceAlt, border: `1px solid ${colors.border.faint}`, padding: '2px 8px', borderRadius: '20px' }}>{tag}</span>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {modalBiblioImport !== null ? (
                    // Ouverte depuis "Importer un procédé" (dans un bloc précis d'une fiche
                    // en rédaction) : l'action doit remplir CE bloc, pas créer une séance.
                    <button onClick={() => { importerProcedeDansBloc(modalBiblioImport, procedeActif); setProcedeActif(null); setModalBiblioImport(null) }}
                      style={{ flex: 1, background: colors.accent.blue, color: colors.black, border: 'none', borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                      + {t('biblio_importer_action', lang)}
                    </button>
                  ) : (
                    <button onClick={() => importerProcedeVersNouvelleSeance(procedeActif)}
                      style={{ flex: 1, background: colors.accent.green, color: colors.black, border: 'none', borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                      {t('biblio_importer_ma_seance', lang)}
                    </button>
                  )}
                  {procedeActif.educateur_id === userId ? (
                    canEdit('entrainements') && (
                      <button onClick={() => { const p = procedeActif; setProcedeActif(null); ouvrirEditionProcede(p) }}
                        style={{ background: 'transparent', border: `1px solid ${colors.border.default}`, color: colors.text.dim, borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                        {t('btn_modifier', lang)}
                      </button>
                    )
                  ) : (
                    <button onClick={() => { copierProcede(procedeActif); setProcedeActif(null) }}
                      style={{ background: 'transparent', border: `1px solid ${colors.border.default}`, color: colors.text.dim, borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                      Copier
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })()}

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
                <button
                  onClick={() => {
                    const cible = entrainements.find(x => x.id === modalImportFicheEntrainement)
                    setFiche({ ...ficheVide, date: cible?.date || '' })
                    setSport('football')
                    setFicheFichierUrl(null)
                    setFicheExtraite(false)
                    setModeSeance('rediger')
                    setActiveSection('mes_seances')
                    setModalImportFicheEntrainement(null)
                  }}
                  style={{ padding: '12px 14px', marginBottom: '6px', background: colors.accent.blue + '15', border: `1px solid ${colors.accent.blue}40`, borderRadius: '10px', color: colors.accent.blue, fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  {t('ent_rediger_nouvelle_fiche_jour', lang)}
                </button>
                <p style={{ margin: '4px 0 2px', fontSize: '11px', fontWeight: 700, color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('ent_ou_choisir_fiche', lang)}</p>
                {mesSeancesOuvertes.length === 0 ? (
                  <p style={{ fontSize: '12px', color: colors.text.disabled, padding: '8px' }}>{t(mesSeancesOuvertesChargees ? 'ent_aucune_fiche_archivee' : 'seance_chargement_fiches', lang)}</p>
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
          <Suspense fallback={<SectionLoader />}><AnalyseVideo userId={userId} equipeActiveId={equipeActive?.id} equipeUnique={mesEquipes.length <= 1} clubNom={profilEdu?.club} lang={lang} joueurs={joueurs} /></Suspense>
        )}

        {activeSection === 'prep_physique' && (
          <Suspense fallback={<SectionLoader />}><GestionPrepPhysique educateurId={userId} clubId={clubAffiliation?.club_id} equipeActiveId={equipeActive?.id} equipeUnique={mesEquipes.length <= 1} readOnly={!canEdit('prep_physique')} isMobile={isMobile} lang={lang} /></Suspense>
        )}

        {activeSection === 'clotures_saison' && (
          <Suspense fallback={<SectionLoader />}><GestionCloturesSaison educateurId={userId} equipeActiveId={equipeActive?.id} lang={lang} /></Suspense>
        )}

        {activeSection === 'tactipad' && (
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>{t('nav_tacticboard', lang)}</h1>
            <p style={{ color: colors.text.faint, fontSize: '13px', marginBottom: '1.5rem' }}>{t('tactic_dessine_schemas', lang)}</p>
            <Tactipad userId={userId} lang={lang} equipeActiveId={equipeActive?.id} categories={mesEquipes} lectureSeule={!!permissions} />
          </div>
        )}

        {activeSection === 'projet_sportif' && (
          <Suspense fallback={<SectionLoader />}>
          <ProjetSportifEducateur categorie={equipeActive?.nom} clubId={clubAffiliation?.club_id}
            readOnlyProjet={!(clubAffiliation?.peut_editer_projet_sportif ?? clubAffiliation?.club?.educateurs_editent_projet_sportif ?? false)}
            readOnlyPlanification={!(clubAffiliation?.peut_editer_planification ?? clubAffiliation?.club?.educateurs_editent_planification ?? false)} />
          </Suspense>
        )}

        {activeSection === 'projet_club_cff4' && (
          <Suspense fallback={<SectionLoader />}><ProjetClubCFF4 userId={userId} clubId={clubAffiliation?.club_id} /></Suspense>
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
                  { id: 'annonces', label: `Annonces (${annonces.length})` },
                  { id: 'dirigeants', label: t('nav_dirigeants', lang) },
                ].filter(o => o.id !== 'dirigeants' || canView('dirigeants')).map(o => (
                  <button key={o.id} onClick={() => setExplorerOnglet(o.id)}
                    style={{ padding: '8px 18px', borderRadius: '20px', border: `1px solid ${explorerOnglet === o.id ? colors.accent.blue : colors.border.default}`, background: explorerOnglet === o.id ? colors.accent.blue + alpha.subtle : 'transparent', color: explorerOnglet === o.id ? colors.accent.blue : colors.text.faint, fontSize: '13px', fontWeight: explorerOnglet === o.id ? 700 : 400, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    {o.label}
                  </button>
                ))}
              </div>

              {!['messages', 'dirigeants', 'annonces'].includes(explorerOnglet) && (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  <input value={explorerRecherche} onChange={e => setExplorerRecherche(e.target.value)}
                    placeholder="Rechercher un nom, un club..."
                    style={{ ...st.input, flex: 1, minWidth: '200px' }} />
                  <input value={explorerRegion} onChange={e => setExplorerRegion(e.target.value)}
                    placeholder="Toute région"
                    style={{ ...st.input, width: '180px' }} />
                </div>
              )}

              {explorerOnglet === 'dirigeants' ? (
                <div>
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
              ) : explorerOnglet === 'annonces' ? (() => {
                const annoncesFiltrees = annonces.filter(a => {
                  if (filtreTypeAnnonce !== 'tous' && a.type_annonce !== filtreTypeAnnonce) return false
                  if (filtreRegionAnnonce && !(a.regions || []).includes(filtreRegionAnnonce)) return false
                  return true
                })
                return (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button onClick={() => setFiltreTypeAnnonce('tous')} style={{ padding: '6px 14px', border: 'none', borderRadius: 20, cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'Inter, sans-serif', background: filtreTypeAnnonce === 'tous' ? colors.accent.blue : colors.background.raised, color: filtreTypeAnnonce === 'tous' ? colors.black : colors.text.faint }}>Toutes</button>
                        {TYPES_ANNONCE.map(ty => (
                          <button key={ty.key} onClick={() => setFiltreTypeAnnonce(ty.key)} style={{ padding: '6px 14px', border: 'none', borderRadius: 20, cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'Inter, sans-serif', background: filtreTypeAnnonce === ty.key ? ty.color : colors.background.raised, color: filtreTypeAnnonce === ty.key ? colors.black : colors.text.faint }}>{ty.label}</button>
                        ))}
                      </div>
                      <button onClick={() => setShowNouvelleAnnonce(true)} style={{ background: colors.accent.blue, color: colors.black, border: 'none', borderRadius: 8, padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
                        📢 Publier une annonce
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
                      <button onClick={() => setFiltreRegionAnnonce(null)} style={{ padding: '4px 10px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 11, fontFamily: 'Inter, sans-serif', background: !filtreRegionAnnonce ? colors.accent.blue + alpha.soft : colors.background.raised, color: !filtreRegionAnnonce ? colors.accent.blue : colors.text.faint }}>🇫🇷 Toute la France</button>
                      {REGIONS_FRANCE.map(r => (
                        <button key={r} onClick={() => setFiltreRegionAnnonce(r === filtreRegionAnnonce ? null : r)} style={{ padding: '4px 10px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 11, fontFamily: 'Inter, sans-serif', background: filtreRegionAnnonce === r ? colors.accent.blue + alpha.soft : colors.background.raised, color: filtreRegionAnnonce === r ? colors.accent.blue : colors.text.faint }}>{r}</button>
                      ))}
                    </div>

                    {annoncesLoading ? (
                      <p style={{ color: colors.text.faint, fontSize: 13 }}>Chargement...</p>
                    ) : annoncesFiltrees.length === 0 ? (
                      <p style={{ color: colors.text.disabled, fontSize: '13px', fontStyle: 'italic' }}>Aucune annonce pour l'instant.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {annoncesFiltrees.map(a => {
                          const ty = TYPES_ANNONCE.find(x => x.key === a.type_annonce) || TYPES_ANNONCE[4]
                          const isOwner = a.auteur_id === userId
                          return (
                            <div key={a.id} style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderLeft: `3px solid ${ty.color}`, borderRadius: 12, padding: 18 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                                <div>
                                  <div style={{ color: colors.text.primary, fontWeight: 800, fontSize: 15 }}>{a.titre}</div>
                                  <div style={{ color: colors.text.faint, fontSize: 12, marginTop: 2 }}>
                                    {a.auteur_nom}{a.auteur_region ? ` · 📍 ${a.auteur_region}` : ''} · {new Date(a.created_at).toLocaleDateString('fr-FR')}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                  <span style={{ background: ty.color + '22', color: ty.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>{ty.label}</span>
                                  {isOwner && (
                                    <button onClick={() => supprimerAnnonce(a.id)} style={{ background: 'none', border: 'none', color: colors.text.disabled, cursor: 'pointer', fontSize: 18 }}>×</button>
                                  )}
                                </div>
                              </div>
                              {a.description && <p style={{ color: colors.text.secondary, fontSize: 13, margin: '12px 0 0', lineHeight: 1.6 }}>{a.description}</p>}
                              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                                {a.date_evenement && <span style={{ color: colors.text.faint, fontSize: 12 }}>📅 {new Date(a.date_evenement).toLocaleDateString('fr-FR')}</span>}
                                {(a.regions || []).slice(0, 3).map(r => (
                                  <span key={r} style={{ background: colors.background.raised, color: colors.text.faint, fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>📍 {r}</span>
                                ))}
                                {(a.regions || []).length > 3 && <span style={{ color: colors.text.faint, fontSize: 11 }}>+{a.regions.length - 3} régions</span>}
                                {a.contact && (
                                  <a href={a.contact.includes('@') ? `mailto:${a.contact}` : `tel:${a.contact}`} style={{ color: colors.accent.blue, fontSize: 12, fontWeight: 700, textDecoration: 'none', marginLeft: 'auto' }}>✉️ Contacter</a>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })() : explorerOnglet === 'messages' ? (
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {listeFiltree.map(p => {
                    const recrutements = explorerOnglet === 'clubs' ? (recrutementsParClubExplorer[p.id] || []) : []
                    const nomAffiche = explorerOnglet === 'clubs' ? (p.club || `${p.prenom || ''} ${p.nom || ''}`.trim()) : `${p.prenom || ''} ${p.nom || ''}`.trim()
                    return (
                      <div key={p.id} onClick={() => ouvrirChatExplorer(p)}
                        style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: isMobile ? 'wrap' : 'nowrap', background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '12px', padding: '10px 16px', cursor: 'pointer' }}>
                        <Avatar person={{ ...p, nom: nomAffiche }} size={40} border={`2px solid ${colors.accent.blue}30`} textColor={colors.accent.blue} bg={colors.accent.blue + '15'} />
                        <div style={{ flex: 1, minWidth: '180px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomAffiche || '—'}</p>
                            {explorerOnglet === 'clubs' && p.verified && <span title="Profil vérifié" style={{ fontSize: '12px' }}>✅</span>}
                            <span style={{ fontSize: '11px', color: colors.text.faint, whiteSpace: 'nowrap' }}>
                              {explorerOnglet === 'educateurs' ? [p.niveau_equipe, p.region].filter(Boolean).join(' · ') : p.region}
                            </span>
                          </div>
                          {(p.description || p.bio) && (
                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: colors.text.disabled, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description || p.bio}</p>
                          )}
                          {recrutements.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                              {recrutements.map((r, i) => (
                                <span key={i} style={{ background: colors.accent.green + alpha.subtle, border: `1px solid ${colors.accent.green}50`, color: colors.accent.green, padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                                  Recrute · {labelCategorie(r.categorie)} · {r.poste}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0, paddingLeft: isMobile ? '54px' : 0 }}>
                          <a href={`/clubs/${p.id}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                            style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '11px', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
                            Voir le profil public
                          </a>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: colors.accent.blue, fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}><IcoSend /> Message</span>
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

              {showNouvelleAnnonce && (
                <div onClick={() => setShowNouvelleAnnonce(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                  <div onClick={e => e.stopPropagation()} style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 580, maxHeight: '85vh', overflowY: 'auto' }}>
                    <h3 style={{ color: colors.text.primary, margin: '0 0 20px', fontSize: 18 }}>📢 Publier une annonce</h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div>
                        <label style={st.label}>Type d'annonce</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {TYPES_ANNONCE.map(ty => (
                            <button key={ty.key} onClick={() => setNouvelleAnnonce(f => ({ ...f, type_annonce: ty.key }))} style={{ padding: '6px 12px', border: 'none', borderRadius: 20, cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'Inter, sans-serif', background: nouvelleAnnonce.type_annonce === ty.key ? ty.color : colors.background.raised, color: nouvelleAnnonce.type_annonce === ty.key ? colors.black : colors.text.faint }}>{ty.label}</button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label style={st.label}>Titre *</label>
                        <input value={nouvelleAnnonce.titre} onChange={e => setNouvelleAnnonce(f => ({ ...f, titre: e.target.value }))}
                          placeholder="Ex : Tournoi U15 recherche équipes" style={st.input} />
                      </div>

                      <div>
                        <label style={st.label}>Description</label>
                        <textarea value={nouvelleAnnonce.description} onChange={e => setNouvelleAnnonce(f => ({ ...f, description: e.target.value }))}
                          rows={3} placeholder="Détails de ton annonce..." style={{ ...st.input, resize: 'vertical' }} />
                      </div>

                      <div>
                        <label style={st.label}>Régions de diffusion * <span style={{ color: colors.text.disabled, fontWeight: 400, textTransform: 'none' }}>(clique où diffuser)</span></label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          <button onClick={() => setNouvelleAnnonce(f => ({ ...f, regions: f.regions.length === REGIONS_FRANCE.length ? [] : [...REGIONS_FRANCE] }))}
                            style={{ padding: '5px 12px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 11, fontFamily: 'Inter, sans-serif', background: nouvelleAnnonce.regions.length === REGIONS_FRANCE.length ? colors.accent.blue : colors.background.raised, color: nouvelleAnnonce.regions.length === REGIONS_FRANCE.length ? colors.black : colors.text.faint }}>
                            🇫🇷 Toute la France
                          </button>
                          {REGIONS_FRANCE.map(r => (
                            <button key={r} onClick={() => setNouvelleAnnonce(f => ({ ...f, regions: f.regions.includes(r) ? f.regions.filter(x => x !== r) : [...f.regions, r] }))}
                              style={{ padding: '4px 10px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 11, fontFamily: 'Inter, sans-serif', background: nouvelleAnnonce.regions.includes(r) ? colors.accent.blue : colors.background.raised, color: nouvelleAnnonce.regions.includes(r) ? colors.black : colors.text.faint }}>
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={st.label}>Date (si événement)</label>
                          <input type="date" value={nouvelleAnnonce.date_evenement} onChange={e => setNouvelleAnnonce(f => ({ ...f, date_evenement: e.target.value }))} style={st.input} />
                        </div>
                        <div>
                          <label style={st.label}>Contact (email ou tél.)</label>
                          <input value={nouvelleAnnonce.contact} onChange={e => setNouvelleAnnonce(f => ({ ...f, contact: e.target.value }))} style={st.input} />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
                      <button onClick={() => setShowNouvelleAnnonce(false)} style={st.btn(colors.text.dim)}>Annuler</button>
                      <button onClick={publierAnnonce} disabled={savingAnnonce || !nouvelleAnnonce.titre.trim() || nouvelleAnnonce.regions.length === 0}
                        style={{ ...st.btnSolid, opacity: (savingAnnonce || !nouvelleAnnonce.titre.trim() || nouvelleAnnonce.regions.length === 0) ? 0.5 : 1 }}>
                        {savingAnnonce ? 'Publication...' : 'Publier'}
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
                  {profil?.abonnement_actif ? (
                    cancelDone ? (
                      <div>
                        <p style={{ fontSize: '13px', color: colors.accent.orange, fontWeight: 700, marginBottom: '4px' }}>Résiliation programmée</p>
                        <p style={{ fontSize: '12px', color: colors.text.faint, lineHeight: 1.6 }}>Ton accès reste actif jusqu'à la fin de la période déjà payée. Tes données ne sont pas supprimées : si tu réactives un jour, tu retrouves tout exactement comme avant.</p>
                      </div>
                    ) : (
                      <div>
                        <p style={{ margin: '0 0 14px', fontSize: '12px', color: colors.text.faint, lineHeight: 1.6 }}>{t('edu_offre_desc', lang)}</p>
                        <button onClick={handleCancelSubscription} disabled={cancelling} style={{ background: 'transparent', border: '1px solid #ef444425', color: cancelling ? colors.text.disabled : colors.accent.red, padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: cancelling ? 'wait' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
                          {cancelling ? 'Résiliation en cours...' : 'Résilier mon abonnement'}
                        </button>
                      </div>
                    )
                  ) : (
                    <>
                      <p style={{ margin: '0 0 14px', fontSize: '12px', color: colors.text.faint, lineHeight: 1.6 }}>{t('edu_offre_desc', lang)}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button onClick={() => window.open(stripeUrl(STRIPE_LINKS_EDU.edu_mensuel, userId, profil?.email), '_blank')} style={{ background: 'transparent', color: 'white', border: `1px solid ${colors.border.default}`, padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{t('edu_offre_mensuel', lang)}</button>
                        <button onClick={() => window.open(stripeUrl(STRIPE_LINKS_EDU.edu_annuel, userId, profil?.email), '_blank')} style={{ background: colors.accent.blue, color: colors.black, border: 'none', padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{t('edu_offre_annuel', lang)}</button>
                      </div>
                    </>
                  )}
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
                          <Avatar person={{ ...a.joueur, avatar_url: a.joueur_profil?.avatar_url }} size={24} bg={colors.accent.green + alpha.soft} border="none" textColor={colors.accent.green} />
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
              onClick={() => gererAffiliation(affiliationEnCours.id, 'accepte', joueurLieId, affiliationEnCours.joueur_id)}
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

    <FicheSeancePrint fiche={{ ...fiche, sport }} categorieLabel={themeSeanceInfo(fiche.categorie_tactique)?.label} nomEducateur={`${profilEdu?.prenom || ''} ${profilEdu?.nom || ''}`.trim()} logoClub={clubAffiliation?.club?.avatar_url || null} />

    {/* Aperçu en grand de la fiche en cours de rédaction — purement lecture
        seule (ne touche jamais à `fiche`/`sport`), contrairement à l'ancien
        bouton "Fiche vierge" qui vidait la fiche puis imprimait : à cause du
        batching React, window.print() capturait encore le DOM rempli (d'où
        l'illusion que ça marchait), mais l'état repassait bien à ficheVide
        juste après — fermer l'aperçu faisait donc disparaître la séance. */}
    {apercuFicheEnCoursOuvert && (
      <div style={{ position: 'fixed', inset: 0, background: '#000000dd', zIndex: 3000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', paddingTop: 'calc(20px + env(safe-area-inset-top, 0px))', overflowY: 'auto' }}
        onClick={() => setApercuFicheEnCoursOuvert(false)}
        onScroll={e => setApercuEnCoursEnHaut(e.currentTarget.scrollTop <= 20)}>
        <div style={{ background: 'transparent', maxWidth: '840px', width: '100%' }} onClick={e => e.stopPropagation()}>
          {apercuEnCoursEnHaut ? (
            <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '12px', background: '#000000dd', padding: '6px 0', borderRadius: '8px' }}>
              <button onClick={() => setApercuFicheEnCoursOuvert(false)} style={{ background: colors.background.raised, border: `1px solid ${colors.border.strong}`, color: colors.text.primary, borderRadius: '8px', padding: '8px 16px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                ✕ {t('btn_fermer', lang)}
              </button>
            </div>
          ) : (
            <button onClick={() => setApercuFicheEnCoursOuvert(false)} title={t('btn_fermer', lang)}
              style={{ position: 'fixed', top: 'calc(16px + env(safe-area-inset-top, 0px))', right: '16px', zIndex: 20, width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(20,20,20,0.6)', border: `1px solid ${colors.border.strong}`, color: colors.text.primary, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
              ✕
            </button>
          )}
          {(fiche.mode_diplome === 'BEF' || fiche.mode_diplome === 'BMF') && (
            <p className="fiche-apercu-hint-paysage" style={{ display: 'none', color: colors.accent.amber, fontSize: '12px', textAlign: 'center', margin: '0 0 10px' }}>
              📱 Tourne ton téléphone en paysage pour une meilleure lecture
            </p>
          )}
          <ApercuFicheResponsive>
            <div className="fiche-render" style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: '0 24px 80px #00000060', margin: '0 auto' }}>
              {fiche.mode_diplome === 'BEF'
                ? <FicheBEFContenu fiche={fiche} categorieLabel={themeSeanceInfo(fiche.categorie_tactique)?.label} nomEducateur={`${profilEdu?.prenom || ''} ${profilEdu?.nom || ''}`.trim()} />
                : fiche.mode_diplome === 'BMF'
                  ? <FicheBMFContenu fiche={fiche} categorieLabel={themeSeanceInfo(fiche.categorie_tactique)?.label} logo={clubAffiliation?.club?.avatar_url || null} />
                  : <FicheContenu fiche={{ ...fiche, sport }} categorieLabel={themeSeanceInfo(fiche.categorie_tactique)?.label} />}
            </div>
          </ApercuFicheResponsive>
        </div>
      </div>
    )}

    {ficheApercu && (() => {
      // Le modal .fiche-render est une feuille blanche (texte noir, cf. index.css)
      // même en mode édition, pour rester visuellement cohérent avec l'aperçu en
      // lecture — juste un soulignement vert pour distinguer les champs éditables.
      const champEditStyle = { border: 'none', borderBottom: '1px solid #4ade80', background: 'transparent', color: colors.black, fontSize: '13px', width: '100%', outline: 'none', padding: '2px 0', fontFamily: 'inherit' }
      const champEditTextareaStyle = { ...champEditStyle, resize: 'vertical', display: 'block' }
      return (
      <div style={{ position: 'fixed', inset: 0, background: '#000000dd', zIndex: 3000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', paddingTop: 'calc(20px + env(safe-area-inset-top, 0px))', overflowY: 'auto' }}
        onClick={() => { if (!modeEditionApercu) setFicheApercu(null) }}
        onScroll={e => setFicheApercuEnHaut(e.currentTarget.scrollTop <= 20)}>
        <div style={{ background: 'transparent', maxWidth: '840px', width: '100%' }} onClick={e => e.stopPropagation()}>
          {(modeEditionApercu || ficheApercuEnHaut) ? (
          <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '12px', background: '#000000dd', padding: '6px 0', borderRadius: '8px' }}>
            {!modeEditionApercu && (
              ficheApercu.fichier_url ? (
                <>
                  <a href={ficheApercu.fichier_url} target="_blank" rel="noreferrer"
                    style={{ background: colors.accent.blue, color: colors.black, padding: '8px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    ⬇️ {t('seance_fichier', lang)}
                  </a>
                  <button onClick={() => partagerFiche(ficheApercu.fichier_url, ficheApercu.theme)}
                    style={{ background: 'transparent', border: `1px solid ${colors.accent.blue}`, color: colors.accent.blue, padding: '8px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    Partager
                  </button>
                </>
              ) : (
                // Fiche sans PDF déjà archivé (import manuel sans fichier, ou
                // fiche rédigée avant l'ajout de la génération automatique) —
                // on le génère à la volée à partir de l'aperçu affiché.
                <button onClick={genererEtPartagerFicheApercu} disabled={generantPartage}
                  style={{ background: 'transparent', border: `1px solid ${colors.accent.blue}`, color: colors.accent.blue, padding: '8px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', opacity: generantPartage ? 0.6 : 1 }}>
                  {generantPartage ? 'Génération...' : 'Partager'}
                </button>
              )
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
          ) : (
            <button onClick={() => setFicheApercu(null)} title={t('btn_fermer', lang)}
              style={{ position: 'fixed', top: 'calc(16px + env(safe-area-inset-top, 0px))', right: '16px', zIndex: 20, width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(20,20,20,0.6)', border: `1px solid ${colors.border.strong}`, color: colors.text.primary, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
              ✕
            </button>
          )}
          {!modeEditionApercu && ['BEF', 'BMF'].includes(ficheApercu.fiche_seance?.mode_diplome) && (
            <p className="fiche-apercu-hint-paysage" style={{ display: 'none', color: colors.accent.amber, fontSize: '12px', textAlign: 'center', margin: '0 0 10px' }}>
              📱 Tourne ton téléphone en paysage pour une meilleure lecture
            </p>
          )}
          <ApercuFicheResponsive>
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
                        {TOUS_THEMES_SEANCE.map(c => <option key={c.value} value={c.value}>{labelTheme(c.value)}</option>)}
                      </select>
                    </div>
                    {!ficheApercuEdit.mode_diplome && themeSeanceInfo(ficheApercuEdit.categorie_tactique) && (
                      <div className="fiche-champ">
                        <label>{t('biblio_principe_label', lang)}</label>
                        <select value={ficheApercuEdit.principe_jeu || ''} onChange={e => setFicheApercuEdit(f => ({ ...f, principe_jeu: e.target.value }))} style={champEditStyle}>
                          <option value="">—</option>
                          {(themeSeanceInfo(ficheApercuEdit.categorie_tactique).phase === 'offensif' ? PRINCIPES_OFFENSIFS : PRINCIPES_DEFENSIFS).map(p => (
                            <option key={p.id} value={p.label}>{t(`principe_${p.id}`, lang)}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="fiche-champ">
                      <label>Catégorie d'âge</label>
                      <select value={ficheApercuEdit.categorie_age} onChange={e => setFicheApercuEdit(f => ({ ...f, categorie_age: e.target.value }))} style={champEditStyle}>
                        <option value="">—</option>
                        <optgroup label="Masculin">
                          {CATEGORIES_MASCULIN.map(c => <option key={c} value={c}>{labelCategorie(c)}</option>)}
                        </optgroup>
                        <optgroup label="Féminin">
                          {CATEGORIES_FEMININ.map(c => <option key={c} value={c}>{labelCategorie(c)}</option>)}
                        </optgroup>
                      </select>
                    </div>
                    <div className="fiche-champ">
                      <label>Type</label>
                      <select value={ficheApercuEdit.type_seance} onChange={e => setFicheApercuEdit(f => ({ ...f, type_seance: e.target.value }))} style={champEditStyle}>
                        <option value="collectif">Collectif</option>
                        <option value="individuel">Individuel</option>
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
                  {ficheApercuEdit.mode_diplome === 'BMF' && (
                    <div className="fiche-row fiche-row-2">
                      <div className="fiche-champ">
                        <label>Séance n°</label>
                        <input value={ficheApercuEdit.numero_seance || ''} onChange={e => setFicheApercuEdit(f => ({ ...f, numero_seance: e.target.value }))} style={champEditStyle} />
                      </div>
                      <div className="fiche-champ large">
                        <label>Phase de jeu</label>
                        <input value={ficheApercuEdit.phase_jeu || ''} onChange={e => setFicheApercuEdit(f => ({ ...f, phase_jeu: e.target.value }))} style={champEditStyle} />
                      </div>
                    </div>
                  )}
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
                          <label>Critères de réalisation</label>
                          <textarea value={p.criteres_realisation} onChange={e => updateProcedeApercu(i, 'criteres_realisation', e.target.value)} rows={2} style={champEditTextareaStyle} />
                        </div>
                        <div className="procede-field" style={{ gridColumn: '1 / -1' }}>
                          <label>Variables / progressions</label>
                          <textarea value={p.variables} onChange={e => updateProcedeApercu(i, 'variables', e.target.value)} rows={2} style={champEditTextareaStyle} />
                        </div>
                        {ficheApercuEdit.mode_diplome === 'BMF' && [
                          ['Surface', 'surface', 1], ['Séquence', 'sequence', 1], ['Objectif', 'objectif', 2],
                          ['Gestion des rotations', 'gestion_rotations', 2], ['Comportements attendus', 'comportements_attendus', 2], ['Critères de réussite', 'criteres_reussite', 2],
                        ].map(([label, cle, rows]) => (
                          <div key={cle} className="procede-field" style={{ gridColumn: rows > 1 ? '1 / -1' : undefined }}>
                            <label>{label}</label>
                            {rows > 1
                              ? <textarea value={p[cle] || ''} onChange={e => updateProcedeApercu(i, cle, e.target.value)} rows={rows} style={champEditTextareaStyle} />
                              : <input value={p[cle] || ''} onChange={e => updateProcedeApercu(i, cle, e.target.value)} style={champEditStyle} />}
                          </div>
                        ))}
                        <div className="procede-field" style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <button type="button" onClick={() => setTactipadModal(i)}
                            style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #a78bfa40', background: '#a78bfa10', color: '#a78bfa', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>
                            🎨 {p.schema_png ? t('tactic_modifier_schema', lang) : t('tactic_ajouter_schema', lang)}
                          </button>
                          {p.schema_png && (
                            <img src={miniatureSchema(p.schema_png, 200)} alt="Schéma tactique" style={{ height: '48px', borderRadius: '6px', border: `1px solid ${colors.border.faint}` }} />
                          )}
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
            ) : ficheApercu.fiche_seance?.mode_diplome === 'BEF' ? (
              <FicheBEFContenu
                fiche={ficheApercu.fiche_seance || {}}
                categorieLabel={themeSeanceInfo(ficheApercu.categorie_tactique)?.label}
                nomEducateur={`${profilEdu?.prenom || ''} ${profilEdu?.nom || ''}`.trim()}
              />
            ) : ficheApercu.fiche_seance?.mode_diplome === 'BMF' ? (
              <FicheBMFContenu
                fiche={{ ...ficheApercu.fiche_seance, categorie_age: ficheApercu.fiche_seance?.categorie_age || ficheApercu.categorie_age }}
                categorieLabel={themeSeanceInfo(ficheApercu.categorie_tactique)?.label}
                logo={clubAffiliation?.club?.avatar_url || null}
              />
            ) : (
              <FicheContenu
                fiche={ficheApercu.fiche_seance || {}}
                categorieLabel={themeSeanceInfo(ficheApercu.categorie_tactique)?.label}
              />
            )}
          </div>
          </ApercuFicheResponsive>
        </div>
      </div>
      )
    })()}

    {tactipadModal !== null && (() => {
      // Deux contextes partagent ce même modal : la rédaction d'une nouvelle
      // fiche (`fiche`) et l'édition d'une fiche déjà archivée (`ficheApercuEdit`,
      // actif quand modeEditionApercu) — ce dernier n'avait jusqu'ici aucun moyen
      // d'ouvrir Tactipad, le bouton 🎨 n'existant que côté rédaction.
      const enEditionApercu = modeEditionApercu && ficheApercuEdit
      const procedesActifs = enEditionApercu ? ficheApercuEdit.procedes : fiche.procedes
      return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 3000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px' }}>
        <div style={{ background: colors.background.base, border: `1px solid ${colors.border.subtle}`, borderRadius: '20px', width: '100%', maxWidth: '95vw', padding: '24px', margin: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: '16px' }}>🎨 {t('schema_procede', lang)} {procedesActifs[tactipadModal]?.numero}</p>
            <button onClick={() => setTactipadModal(null)} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '20px', cursor: 'pointer' }}>✕</button>
          </div>
          <Tactipad
            userId={userId}
            mode="modal"
            vueParDefaut="demi"
            initialSchema={procedesActifs[tactipadModal]?.schema_data}
            onValider={(png, schema) => {
              const index = tactipadModal
              // PNG envoyé sur Cloudinary en arrière-plan : le lien remplace la
              // data URL dans ce procédé seulement si elle n'a pas changé.
              const avecLien = lien => prev => {
                if (prev.procedes?.[index]?.schema_png !== png) return prev
                const procedes = [...prev.procedes]
                procedes[index] = { ...procedes[index], schema_png: lien }
                return { ...prev, procedes }
              }
              if (enEditionApercu) {
                const newProcedes = [...ficheApercuEdit.procedes]
                newProcedes[index] = { ...newProcedes[index], schema_png: png, schema_data: schema }
                setFicheApercuEdit({ ...ficheApercuEdit, procedes: newProcedes })
                remplacerSchemaParLien(png, lien => setFicheApercuEdit(prev => (prev ? avecLien(lien)(prev) : prev)))
              } else {
                const newProcedes = [...fiche.procedes]
                newProcedes[index] = { ...newProcedes[index], schema_png: png, schema_data: schema }
                setFiche({ ...fiche, procedes: newProcedes })
                remplacerSchemaParLien(png, lien => setFiche(avecLien(lien)))
              }
              setTactipadModal(null)
            }}
            onFermer={() => setTactipadModal(null)}
            lang={lang}
          />
        </div>
      </div>
      )
    })()}

    {activeSection === 'accueil' && <SponsorsBar clubId={clubAffiliation?.club_id} sidebarWidth={220} />}

    </>
  )
}

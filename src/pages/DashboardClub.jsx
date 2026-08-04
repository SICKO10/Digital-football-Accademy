import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import ScoutCenter from '../components/ScoutCenter'
import { CRITERES_EDU } from './DashboardEducateur'
import { ModalGrilleSeance } from '../components/GrilleSeance'
import { CATEGORIES as CATEGORIES_STANDARD } from '../lib/categories'
import GestionSponsors from '../components/sponsors/GestionSponsors'
import Deplacements from '../components/Deplacements'
import RepartitionMiniBus from '../components/RepartitionMiniBus'
import PlanningTerrains from '../components/PlanningTerrains'
import TerrainsLiberesWidget from '../components/TerrainsLiberesWidget'
import { useLang } from '../hooks/useLang'
import { t, LANGS, localeOf } from '../lib/translations'
import { STRIPE_LINKS_CLUB, CONTACT_EMAIL } from '../lib/stripeLinks'
import OnboardingGuide from '../components/OnboardingGuide'
import FloatingHelper from '../components/FloatingHelper'

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
const IcoCalculator = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><circle cx="8" cy="11" r="1"/><circle cx="12" cy="11" r="1"/><circle cx="16" cy="11" r="1"/><circle cx="8" cy="15" r="1"/><circle cx="12" cy="15" r="1"/><circle cx="16" cy="15" r="1"/></svg>
const IcoStar      = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
const IcoWallet    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6.5v11M15 9.5c0-1.4-1.5-2.3-3-2.3s-3 .9-3 2.3 1.5 1.8 3 2.3 3 .9 3 2.3-1.5 2.3-3 2.3-3-.9-3-2.3"/></svg>

const EQUIPES = ['A', 'B']

const ROLES_STAFF = [
  { val: 'president', label: 'Président' },
  { val: 'directeur_sportif', label: 'Directeur sportif' },
  { val: 'marketing', label: 'Marketing' },
  { val: 'secretaire', label: 'Secrétaire' },
  { val: 'coach_adjoint', label: 'Coach adjoint' },
  { val: 'kine', label: 'Kinésithérapeute' },
  { val: 'intendant', label: 'Intendant' },
  { val: 'preparateur_physique', label: 'Préparateur physique' },
  { val: 'comptable', label: 'Comptable' },
]
const ROLE_STAFF_LABEL = (role) => ROLES_STAFF.find(r => r.val === role)?.label || role

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
  { id: 'repartition_bus', label: 'Mini-bus' },
  { id: 'profil', label: 'Profil club' },
]

// Comportement avant toute configuration explicite par le président (aucune ligne
// en base pour ce club/rôle/section) — reproduit les règles d'accès qui existaient
// avant ce système, pour ne rien casser pour les clubs déjà en production.
const PERMISSION_DEFAULTS = {
  sportif: ['president', 'directeur_sportif'],
  terrains: ['president', 'directeur_sportif'],
  deplacements: ['president', 'marketing', 'secretaire'],
  budget: ['president', 'secretaire'],
  sponsors: ['president', 'marketing', 'secretaire'],
  repartition_bus: ['president', 'marketing', 'secretaire'],
  profil: ['president', 'marketing', 'secretaire'],
}

const STAT_CARD_COLORS = { green: '#4ade80', orange: '#f59e0b', red: '#ef4444' }
function StatCard({ label, valeur, couleur }) {
  const color = STAT_CARD_COLORS[couleur] || '#fff'
  return (
    <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
      <p style={{ margin: '0 0 4px', fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
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
  '#4ade80', '#60a5fa', '#f59e0b', '#a78bfa',
  '#f472b6', '#34d399', '#fb923c', '#38bdf8', '#e879f9',
]

function DonutChart({ segments, total, label, couleurCentrale = '#fff', lang = 'fr' }) {
  const R = 70
  const STROKE = 18
  const C = 2 * Math.PI * R

  if (total === 0) return (
    <div style={{ width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={R} fill="none" stroke="#1a1a1a" strokeWidth={STROKE} />
        <text x="90" y="86" textAnchor="middle" fill="#555" fontSize="11" fontFamily="Inter, sans-serif">Aucune</text>
        <text x="90" y="102" textAnchor="middle" fill="#555" fontSize="11" fontFamily="Inter, sans-serif">entrée</text>
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
        <circle cx="90" cy="90" r={R} fill="none" stroke="#1a1a1a" strokeWidth={STROKE} />
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
        <span style={{ fontSize: 10, color: '#555', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>{label}</span>
      </div>
    </div>
  )
}

function AccueilClub({ clubId, categories, educateursAcceptes, educateursEnAttente, joueursClub, matchsClub, setActiveCategorie, setActiveTab, lang }) {
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
      <p style={{ color: '#555', fontSize: '13px', marginBottom: '1.5rem' }}>{t('club_accueil_sous_titre', lang)}</p>

      <TerrainsLiberesWidget clubId={clubId} accentColor="#4ade80" titre="Terrains disponibles ce jour" />

      {/* Widgets résumé */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '2rem' }}>
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' }}>
          <p style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}><IcoCarteBadge /> {t('club_licencies', lang)}</p>
          <p style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>{totalLicencies}</p>
          <p style={{ fontSize: '12px', color: '#555', margin: '4px 0 0' }}>{t('club_toutes_equipes', lang)}</p>
        </div>

        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' }}>
          <p style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}><IcoBallon /> {t('club_equipes_actives', lang)}</p>
          <p style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>{nbEquipes}</p>
          <p style={{ fontSize: '12px', color: '#555', margin: '4px 0 0' }}>{nbEquipes > 1 ? t('club_categorie_plur', lang) : t('club_categorie_sing', lang)}</p>
        </div>

        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' }}>
          <p style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}><IcoUsers /> {t('club_tab_educateurs', lang)}</p>
          <p style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>{nbEducateurs}</p>
          <p style={{ fontSize: '12px', color: '#555', margin: '4px 0 0' }}>{nbEducateurs > 1 ? t('club_educateur_affilie_plur', lang) : t('club_educateur_affilie_sing', lang)}</p>
        </div>

        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' }}>
          <p style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}><IcoHorloge /> {t('club_demandes_affiliation', lang)}</p>
          <p style={{ fontSize: '28px', fontWeight: 800, margin: 0, color: nbEnAttente > 0 ? '#4ade80' : '#fff' }}>{nbEnAttente}</p>
          <p style={{ fontSize: '12px', color: '#555', margin: '4px 0 0' }}>{t('club_en_attente', lang)}</p>
        </div>
      </div>

      {/* Actions rapides */}
      <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 12px' }}>{t('club_actions_rapides', lang)}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '2rem' }}>
        {ACTIONS.map(a => (
          <button key={a.label} onClick={() => { setActiveCategorie(a.categorie); setActiveTab(a.tab) }}
            style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1.25rem 1rem', cursor: 'pointer', textAlign: 'center', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', fontFamily: 'Inter, sans-serif' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#4ade8040'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#1a1a1a'}>
            <span style={{ fontSize: '26px' }}>{a.emoji}</span>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>{a.label}</span>
          </button>
        ))}
      </div>

      {/* Fil d'activité récente */}
      <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 12px' }}>{t('club_activite_recente', lang)}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' }}>
          <p style={{ fontWeight: 700, fontSize: '13px', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}><IcoTrophy /> {t('club_derniers_resultats', lang)}</p>
          {derniersResultats.length === 0 ? (
            <p style={{ color: '#444', fontSize: '12px', margin: 0 }}>{t('club_aucun_resultat_accueil', lang)}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {derniersResultats.map(m => {
                const nous = parseInt(m.score_nous)
                const eux = parseInt(m.score_eux)
                const resultat = nous > eux ? 'V' : nous < eux ? 'D' : 'N'
                const couleur = resultat === 'V' ? '#4ade80' : resultat === 'D' ? '#ef4444' : '#f59e0b'
                const label = catLabel(m.educateur_id)
                return (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ background: couleur + '20', color: couleur, fontWeight: 800, fontSize: '11px', padding: '2px 8px', borderRadius: '20px', flexShrink: 0 }}>{resultat}</span>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.domicile ? 'vs' : '@'} {m.adversaire || '—'}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#555' }}>{label ? `${label} · ` : ''}{new Date(m.date).toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'short' })}</p>
                      </div>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '13px', color: couleur, whiteSpace: 'nowrap' }}>{m.score_nous} - {m.score_eux}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' }}>
          <p style={{ fontWeight: 700, fontSize: '13px', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}><IcoCalendar /> {t('club_prochains_matchs', lang)}</p>
          {prochainsMatchs.length === 0 ? (
            <p style={{ color: '#444', fontSize: '12px', margin: 0 }}>{t('club_aucun_match_venir', lang)}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {prochainsMatchs.map(m => {
                const label = catLabel(m.educateur_id)
                return (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.adversaire || '—'}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#555' }}>{label ? `${label} · ` : ''}{new Date(m.date).toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'short' })}{m.heure ? ` · ${m.heure}` : ''}</p>
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0, background: m.domicile ? '#4ade8020' : '#60a5fa20', color: m.domicile ? '#4ade80' : '#60a5fa', border: `1px solid ${m.domicile ? '#4ade8040' : '#60a5fa40'}` }}>
                      {m.domicile ? <IcoHome /> : <IcoBus />} {m.domicile ? t('comp_domicile', lang) : t('club_deplacement', lang)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' }}>
          <p style={{ fontWeight: 700, fontSize: '13px', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}><IcoUserPlus /> {t('club_nouveaux_joueurs', lang)}</p>
          {joueursRecents.length === 0 ? (
            <p style={{ color: '#444', fontSize: '12px', margin: 0 }}>{t('club_aucun_joueur_recent', lang)}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {joueursRecents.map(j => (
                <div key={j.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.prenom} {j.nom}{j.poste ? ` — ${j.poste}` : ''}</p>
                  <span style={{ fontSize: '11px', color: '#555', whiteSpace: 'nowrap', flexShrink: 0 }}>{j.created_at ? new Date(j.created_at).toLocaleDateString(localeOf(lang)) : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Matrice de permissions par rôle (Staff → "Gérer les permissions") ────────
// Grille : colonnes = PERMISSION_SECTIONS, lignes = ROLES_STAFF (hors président,
// qui a tout et n'apparaît pas ici). Édite une copie locale, ne touche la base
// qu'au clic sur "Enregistrer" via onSave (upsert complet de la matrice).
function PermissionsModal({ rolePermissions, saving, onSave, onClose }) {
  const rolesConfigurables = ROLES_STAFF.filter(r => r.val !== 'president')

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

  const cellBtn = (active, label, color) => ({
    padding: '3px 9px', borderRadius: 5, border: 'none', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
    background: active ? `${color}20` : '#1a1a1a', color: active ? color : '#3a3a3a',
  })

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '20px', width: '100%', maxWidth: '820px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '16px' }}>🔐 Permissions par rôle</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>
        <p style={{ margin: '0 0 18px', fontSize: '12px', color: '#666' }}>
          Le Président voit et modifie tout, ce n'est pas configurable. Pour les autres rôles : « Voir » affiche l'onglet, « Modifier » autorise les actions d'écriture (ajout/suppression) dans cet onglet.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '640px' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rôle</th>
                {PERMISSION_SECTIONS.map(s => (
                  <th key={s.id} style={{ textAlign: 'center', padding: '8px 10px', fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{s.label}</th>
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
                          <button onClick={() => toggle(role.val, section.id, 'can_view')} style={cellBtn(cell.can_view, 'Voir', '#60a5fa')}>👁 Voir</button>
                          <button onClick={() => toggle(role.val, section.id, 'can_edit')} style={cellBtn(cell.can_edit, 'Modifier', '#4ade80')}>✏️ Modifier</button>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={() => onSave(matrice)} disabled={saving}
            style={{ background: '#4ade80', color: '#000', border: 'none', borderRadius: 10, padding: '10px 22px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Enregistrement...' : '✓ Enregistrer'}
          </button>
          <button onClick={onClose} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888', borderRadius: 10, padding: '10px 22px', fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            Annuler
          </button>
        </div>
      </div>
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

  // Permissions par rôle (section Staff → "Gérer les permissions")
  const [rolePermissions, setRolePermissions] = useState([]) // [{ role, section, can_view, can_edit }]
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

  // Profil club
  const [profilClubEdit, setProfilClubEdit] = useState({ club: '', region: '', description: '' })
  const [savingProfilClub, setSavingProfilClub] = useState(false)
  const [avatarClubUploading, setAvatarClubUploading] = useState(false)
  const [avisRecus, setAvisRecus] = useState([])

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

  const st = {
    page: { background: '#0a0a0a', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif' },
    navbar: { background: '#111', borderBottom: '1px solid #222', padding: isMobile ? '0 1rem' : '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px', gap: '8px' },
    logo: { color: '#4ade80', fontWeight: 700, fontSize: isMobile ? '0.85rem' : '1.1rem', letterSpacing: '1px', flexShrink: 0 },
    content: { padding: isMobile ? '1rem' : '2rem', maxWidth: '1100px', margin: '0 auto' },
    tabs: { display: 'flex', gap: '8px', marginBottom: '1.5rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', paddingBottom: '2px' },
    tab: (active) => ({ padding: isMobile ? '8px 14px' : '10px 20px', borderRadius: '8px', border: active ? 'none' : '1px solid #333', background: active ? '#4ade80' : 'transparent', color: active ? '#000' : '#aaa', fontWeight: active ? 700 : 400, cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap', flexShrink: 0 }),
    card: { background: '#111', border: '1px solid #222', borderRadius: '12px', padding: isMobile ? '1rem' : '1.25rem' },
    btnSolid: { background: '#4ade80', color: '#000', border: 'none', padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' },
    btnSecondary: { background: 'transparent', border: '1px solid #333', color: '#aaa', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px' },
    input: { background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', padding: '9px 12px', fontSize: '13px', boxSizing: 'border-box', width: '100%' },
    label: { fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' },
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
    const administratifSections = ['sponsors', 'deplacements', 'repartition_bus', 'profil', 'budget']
    const administratifVisible = monRole === 'president' || administratifSections.some(canViewSection)
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
      const adminOnglets = administratifSections.filter(canViewSection).concat(monRole === 'president' ? ['staff'] : [])
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
    setProfilClubEdit({ club: clubProfile.club || '', region: clubProfile.region || '', description: clubProfile.description || '' })

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

    await Promise.all([chargerCategories(resolvedClubId), chargerEducateurs(resolvedClubId), chargerAvisClub(resolvedClubId), chargerSeancesRecues(resolvedClubId), chargerStaff(resolvedClubId), chargerBudget(resolvedClubId), chargerAccueilData(resolvedClubId), chargerRolePermissions(resolvedClubId)])
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

  // Sauvegarde toute la matrice en une fois (upsert ligne par ligne, clé (club_id, role, section)).
  // Le président n'a jamais de ligne : il garde tout, en dur, quoi qu'il arrive (cf. canViewSection).
  const sauvegarderPermissions = async (matrice) => {
    if (!clubId) return
    setSavingPermissions(true)
    const rows = []
    for (const role of Object.keys(matrice)) {
      if (role === 'president') continue
      for (const section of Object.keys(matrice[role])) {
        rows.push({ club_id: clubId, role, section, can_view: matrice[role][section].can_view, can_edit: matrice[role][section].can_edit })
      }
    }
    const { error } = await supabase.from('role_permissions').upsert(rows, { onConflict: 'club_id,role,section' })
    if (!error) await chargerRolePermissions(clubId)
    setSavingPermissions(false)
    if (!error) setShowPermissionsModal(false)
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
        presenceEffectifPresents: pr.filter(p => p.statut === 'present').length,
        pointsSeance: points,
        noteGlobale,
        presenceMensuelle,
      }
    }

    const grouped = {}
    categories.forEach(cat => {
      const joueursCat = joueurs.filter(j => j.club_categorie_id === cat.id)
      grouped[cat.id] = { categorie: cat, joueurs: joueursCat.map(j => ({ ...j, stats: buildStats(j.id) })) }
    })

    setStatsParCategorie(grouped)
    if (!categorieActive && categories.length > 0) setCategorieActive(categories[0].id)
    setLoadingClassements(false)
  }

  const GROUPES_POSTE = [
    { label: `🧤 ${t('stats_pres_gardiens', lang)}`, color: '#f59e0b', match: p => p?.toLowerCase().includes('gardien') },
    { label: `🛡️ ${t('stats_pres_defenseurs', lang)}`, color: '#60a5fa', match: p => p && ['défenseur', 'defenseur', 'latéral', 'lateral'].some(k => p.toLowerCase().includes(k)) },
    { label: `⚙️ ${t('stats_pres_milieux', lang)}`, color: '#a78bfa', match: p => p?.toLowerCase().includes('milieu') },
    { label: `⚡ ${t('stats_pres_attaquants', lang)}`, color: '#4ade80', match: p => p && ['attaquant', 'ailier'].some(k => p.toLowerCase().includes(k)) },
    { label: '❓ Autres', color: '#555', match: p => !p || !['gardien', 'défenseur', 'defenseur', 'latéral', 'lateral', 'milieu', 'attaquant', 'ailier'].some(k => p.toLowerCase().includes(k)) },
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
    setSavingCategorie(true)
    await supabase.from('club_categories').insert({
      club_id: clubId,
      nom: newCategorie.nom,
      equipe: newCategorie.equipe,
      educateur_id: newCategorie.educateur_id || null,
    })
    await chargerCategories(clubId)
    setNewCategorie({ nom: 'U13', equipe: 'A', educateur_id: '' })
    setShowAddCategorie(false)
    setSavingCategorie(false)
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
    setSavingProfilClub(true)
    await supabase.from('profiles').update({
      club: profilClubEdit.club,
      region: profilClubEdit.region,
      description: profilClubEdit.description,
    }).eq('id', clubId)
    setClub(prev => ({ ...prev, ...profilClubEdit }))
    setSavingProfilClub(false)
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
    setSavingEduNote(true)
    const moyGlobale = allKeys.reduce((s, k) => s + (eduNoteCriteres[k] || 0), 0) / allKeys.length
    await supabase.from('notes_educateur').upsert({
      educateur_id: eduNoteModal.educateur_id,
      auteur_id: clubId,
      auteur_type: 'club',
      saison: eduNoteSaison,
      note: Math.round(moyGlobale * 10) / 10,
      criteres: eduNoteCriteres,
      commentaire: eduNoteCommentaire,
      visible_public: true,
    }, { onConflict: 'educateur_id,auteur_id,saison' })
    setSavingEduNote(false)
    setEduNoteModal(null)
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
    await supabase.from('evaluations_seance').upsert({
      seance_id: seanceEvalModal.id,
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
    }, { onConflict: 'seance_id' })
    await supabase.from('seances_uploadees').update({ statut: 'analyse' }).eq('id', seanceEvalModal.id)
    await chargerSeancesRecues(clubId)
    setSeanceEvalModal(null)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/') }

  if (loading) return <div style={{ ...st.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#4ade80' }}>Chargement...</p></div>

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
  const administratifVisible = monRole === 'president' || ['sponsors', 'deplacements', 'repartition_bus', 'profil', 'budget'].some(canViewSection)

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
    ...(canViewSection('repartition_bus') ? [{ id: 'repartition_bus', label: iconLabel(IcoCalculator, 'Répartition mini-bus') }] : []),
    ...(canViewSection('profil') ? [{ id: 'profil', label: iconLabel(IcoStar, t('club_tab_profil', lang)) }] : []),
    ...(canViewSection('budget') ? [{ id: 'budget', label: iconLabel(IcoWallet, t('club_tab_budget', lang)) }] : []),
    ...(monRole === 'president' ? [{ id: 'staff', label: iconLabel(IcoUsers, t('club_tab_staff', lang)) }] : []),
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
      <OnboardingGuide key={onboardingKey} userId={clubId} steps={clubOnboardingSteps} accentColor="#4ade80" />
      <FloatingHelper userId={clubId} onReplayOnboarding={replayOnboarding} faq={CLUB_FAQ} />
      <nav style={st.navbar}>
        <span style={st.logo}>⬡ DIGITAL FOOTBALL — Club</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '1rem', flexShrink: 0 }}>
          {!isMobile && <span style={{ fontSize: '13px', color: '#666' }}>{club?.club || club?.prenom}</span>}
          {!isMobile && (
            <div style={{ display: 'flex', gap: '4px' }}>
              {LANGS.map(l => (
                <button key={l.code} onClick={() => setLang(l.code)}
                  style={{ background: lang === l.code ? '#4ade8020' : 'transparent', border: `1px solid ${lang === l.code ? '#4ade80' : '#2a2a2a'}`, borderRadius: '6px', padding: '3px 6px', cursor: 'pointer', fontSize: '12px' }}>
                  {l.flag}
                </button>
              ))}
            </div>
          )}
          {autreRole === 'educateur' && (
            <button onClick={() => navigate('/educateur')}
              style={{ padding: isMobile ? '6px 10px' : '6px 16px', background: '#1a1a1a', border: '1px solid #4ade80', borderRadius: '8px', color: '#4ade80', cursor: 'pointer', fontSize: isMobile ? '11px' : '13px', fontWeight: 700 }}>
              {isMobile ? '🎓' : `🎓 ${t('club_vue_educateur', lang)}`}
            </button>
          )}
          {autreRole === 'joueur' && (
            <button onClick={() => navigate('/dashboard-joueur')}
              style={{ padding: isMobile ? '6px 10px' : '6px 16px', background: '#1a1a1a', border: '1px solid #4ade80', borderRadius: '8px', color: '#4ade80', cursor: 'pointer', fontSize: isMobile ? '11px' : '13px', fontWeight: 700 }}>
              {isMobile ? '⚽' : `⚽ ${t('club_vue_joueur', lang)}`}
            </button>
          )}
          <button style={{ ...st.btnSecondary, fontSize: isMobile ? '11px' : '13px', padding: isMobile ? '6px 10px' : '8px 14px' }} onClick={handleLogout}>
            {isMobile ? '⏏️' : t('btn_deconnexion', lang)}
          </button>
        </div>
      </nav>

      <div style={st.content}>
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {club?.avatar_url
              ? <img src={club.avatar_url} alt="" style={{ width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #4ade8040' }} />
              : <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: '#1a2e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 800, color: '#4ade80' }}>
                  {clubInitiales}
                </div>
            }
            <label style={{ position: 'absolute', bottom: 0, right: 0, width: '28px', height: '28px', background: '#4ade80', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: avatarClubUploading ? 'wait' : 'pointer', border: '2px solid #0a0a0a', fontSize: '13px' }}>
              {avatarClubUploading ? '…' : '✎'}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarClubUpload} disabled={avatarClubUploading} />
            </label>
          </div>
          <div>
            <h1 style={{ margin: '0 0 4px', fontSize: '1.4rem', fontWeight: 800 }}>{club?.club || t('club_mon_club', lang)}</h1>
            <p style={{ margin: 0, color: '#555', fontSize: '13px' }}>{categories.length} {categories.length !== 1 ? t('club_categorie_plur', lang) : t('club_categorie_sing', lang)} · {educateursAcceptes.length} {educateursAcceptes.length !== 1 ? t('club_educateur_affilie_plur', lang) : t('club_educateur_affilie_sing', lang)}</p>
          </div>
        </div>

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
                    background: activeCategorie === cat.id ? '#4ade80' : '#1a1a1a',
                    color: activeCategorie === cat.id ? '#000' : '#666',
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
              style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', background: '#111', border: '1px solid #222', borderRadius: '10px', padding: '12px 14px', marginBottom: '1.5rem', color: '#fff', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              <span style={{ fontSize: '18px', lineHeight: 1 }}>☰</span>
              <span style={{ fontSize: '13px', fontWeight: 700, flex: 1, textAlign: 'left' }}>
                {categoriesVisibles.find(c => c.id === activeCategorie)?.label}
                {activeCategorie !== 'accueil' && sousOnglets.find(t => t.id === activeTab) && (
                  <span style={{ color: '#555', fontWeight: 400 }}> › {sousOnglets.find(t => t.id === activeTab)?.label}</span>
                )}
              </span>
            </button>

            {/* Overlay + drawer */}
            {sidebarOpen && (
              <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 90 }} />
            )}
            <div style={{
              position: 'fixed', top: 0, left: sidebarOpen ? 0 : '-85%', width: '85%', maxWidth: '320px', height: '100%',
              background: '#0d0d0d', borderRight: '1px solid #1a1a1a', zIndex: 100, transition: 'left 0.25s ease',
              overflowY: 'auto', padding: '1.25rem 1rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <span style={{ fontWeight: 800, fontSize: '14px', color: '#4ade80' }}>⬡ Menu</span>
                <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer' }}>✕</button>
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
                      background: activeCategorie === cat.id ? '#4ade8015' : 'transparent',
                      color: activeCategorie === cat.id ? '#4ade80' : '#aaa',
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
                        background: activeTab === tab.id ? '#60a5fa15' : 'transparent',
                        color: activeTab === tab.id ? '#60a5fa' : '#888',
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
            setActiveCategorie={setActiveCategorie}
            setActiveTab={setActiveTab}
            lang={lang}
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
              <div style={{ background: '#4ade8010', border: '1px solid #4ade8030', borderRadius: '10px', padding: '10px 16px', marginBottom: '1rem', color: '#4ade80', fontSize: '13px' }}>
                ✅ {autoAssignResult.count} {t('club_joueur_assigne_auto', lang)}
              </div>
            )}

            {showAddCategorie && (
              <div style={{ ...st.card, border: '1px solid #4ade8030', marginBottom: '1rem' }}>
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
              <div style={{ ...st.card, textAlign: 'center', padding: '3rem', color: '#555' }}>
                {t('club_aucune_categorie', lang)}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                {CATEGORIES_STANDARD.map(nom => {
                  const cats = categories.filter(c => c.nom === nom)
                  if (!cats.length) return null
                  return (
                    <div key={nom} style={st.card}>
                      <p style={{ margin: '0 0 10px', fontWeight: 800, color: '#4ade80', fontSize: '14px' }}>{nom}</p>
                      {cats.map(c => (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1a1a1a', borderRadius: '8px', padding: '10px 12px', marginBottom: '6px' }}>
                          <div>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{t('club_equipe_label', lang)} {c.equipe}</p>
                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#666' }}>
                              {c.educateur ? `${c.educateur.prenom} ${c.educateur.nom}` : t('club_pas_educateur_assigne', lang)}
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => { setEffectifModal(c.id); chargerClassements() }} style={{ background: '#60a5fa15', border: '1px solid #60a5fa40', color: '#60a5fa', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>👥 {t('club_effectif', lang)}</button>
                            {canEditSection('sportif') && (
                              <button onClick={() => supprimerCategorie(c.id)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer' }}>✕</button>
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
          <PlanningTerrains clubId={clubId} mode="dirigeant" readOnly={!canEditSection('terrains')} />
        )}

        {/* ── ÉDUCATEURS ── */}
        {activeTab === 'educateurs' && canViewSection('sportif') && (
          <>
            {/* Code club */}
            <div style={{ ...st.card, border: '1px solid #4ade8030', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '14px' }}>🔑 {t('club_ton_code', lang)}</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>{t('club_partage_code_desc', lang)}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: '#4ade8015', border: '1px solid #4ade8040', color: '#4ade80', fontWeight: 800, fontSize: '18px', padding: '8px 18px', borderRadius: '10px', letterSpacing: '3px', fontFamily: 'monospace' }}>{codeClub}</span>
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
                      <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1a1a1a', borderRadius: '8px', padding: '10px 14px' }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>{e.prenom} {e.nom}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#666' }}>{e.club || e.email}</p>
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

            {/* En attente */}
            {educateursEnAttente.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '13px', color: '#f59e0b' }}>⏳ {t('club_en_attente_validation', lang)} ({educateursEnAttente.length})</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {educateursEnAttente.map(e => (
                    <div key={e.id} style={{ ...st.card, borderColor: '#f59e0b30', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>{e.educateur?.prenom} {e.educateur?.nom}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#666' }}>{t('club_methode_label', lang)} {e.methode === 'code' ? t('club_methode_code', lang) : t('club_methode_invite', lang)}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
                        <button onClick={() => accepterEducateur(e.id)} style={{ ...st.btnSolid, flex: isMobile ? 1 : 'none' }}>✅ {t('club_accepter', lang)}</button>
                        <button onClick={() => retirerEducateur(e.id)} style={{ ...st.btnSecondary, color: '#ef4444', borderColor: '#ef444440', flex: isMobile ? 1 : 'none' }}>{t('club_refuser', lang)}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Affiliés */}
            <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '13px', color: '#4ade80' }}>✅ {t('club_educateurs_affilies_titre', lang)} ({educateursAcceptes.length})</p>
            {educateursAcceptes.length === 0 ? (
              <p style={{ color: '#444', fontSize: '13px' }}>{t('club_aucun_educateur_affilie', lang)}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {educateursAcceptes.map(e => (
                  <div key={e.id} style={{ ...st.card, display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1a2e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', fontWeight: 700, fontSize: '12px', flexShrink: 0 }}>
                        {e.educateur?.prenom?.[0]}{e.educateur?.nom?.[0]}
                      </div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>{e.educateur?.prenom} {e.educateur?.nom}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
                      <button onClick={() => ouvrirNotationEducateur(e)} style={{ background: '#fbbf2415', border: '1px solid #fbbf2440', color: '#fbbf24', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', flex: isMobile ? 1 : 'none' }}>⭐ {t('club_noter', lang)}</button>
                      <button onClick={() => retirerEducateur(e.id)} style={{ ...st.btnSecondary, color: '#ef4444', borderColor: '#ef444440', flex: isMobile ? 1 : 'none' }}>{t('club_retirer', lang)}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Séances reçues pour évaluation ── */}
            <div style={{ marginTop: '2rem' }}>
              <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '13px', color: '#60a5fa' }}>🎥 {t('club_seances_recues_titre', lang)} ({seancesRecues.length})</p>
              {seancesRecues.length === 0 ? (
                <p style={{ color: '#444', fontSize: '13px' }}>{t('club_aucune_seance_uploadee', lang)}</p>
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
                          gap: '10px', padding: '10px 16px', background: '#1a1a1a',
                          border: '1px solid #2a2a2a', borderRadius: '10px',
                          color: '#4ade80', fontWeight: 700, fontSize: '14px',
                          cursor: 'pointer', textAlign: 'left',
                        }}>
                        <span>{ouverte ? '📂' : '📁'}</span>
                        <span>{t('profil_saison', lang)} {saison}</span>
                        <span style={{ marginLeft: 'auto', color: '#666', fontSize: '12px' }}>
                          {parSaison[saison].length} {parSaison[saison].length > 1 ? t('stats_seances_plural', lang) : t('stats_seance_singular', lang)}
                        </span>
                        <span style={{ color: '#444' }}>{ouverte ? '▼' : '▶'}</span>
                      </button>

                      {ouverte && parSaison[saison].map(s => {
                        const eval_ = Array.isArray(s.evaluation) ? s.evaluation[0] : s.evaluation
                        return (
                          <div key={s.id} style={{ ...st.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginTop: '6px', marginLeft: '16px' }}>
                            <div>
                              <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{s.educateur?.prenom} {s.educateur?.nom} — {s.theme || t('seance_fallback', lang)}</p>
                              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#555' }}>{s.date_seance ? new Date(s.date_seance).toLocaleDateString(localeOf(lang)) : ''}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
                              <a href={s.video_url} target="_blank" rel="noreferrer" style={{ ...st.btnSecondary, textDecoration: 'none' }}>🎬 {t('btn_voir', lang)}</a>
                              {s.statut === 'a_analyser' && (
                                <>
                                  <button onClick={() => ouvrirGrilleEvaluation(s)} style={st.btnSolid}>📋 {t('club_analyser', lang)}</button>
                                  <button onClick={() => transfererAuCoach(s.id)} style={{ background: '#60a5fa15', border: '1px solid #60a5fa40', color: '#60a5fa', padding: '9px 14px', borderRadius: '8px', fontSize: isMobile ? '12px' : '13px', fontWeight: 700, cursor: 'pointer' }}>{isMobile ? `🎙️ ${t('club_coach_mobile', lang)}` : `🎙️ ${t('club_transferer_coach', lang)}`}</button>
                                </>
                              )}
                              {s.statut === 'transfere_coach' && <span style={{ background: '#60a5fa15', color: '#60a5fa', fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px' }}>🎙️ {t('club_chez_coach', lang)}</span>}
                              {s.statut === 'analyse' && eval_ && (
                                <span style={{ background: '#4ade8015', color: '#4ade80', fontSize: '13px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px' }}>✅ {Math.round(eval_.note_totale)}/100</span>
                              )}
                              <button onClick={() => supprimerSeance(s.id)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer' }}>✕</button>
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
            { key: 'buts', label: t('stats_graph_buteurs', lang), color: '#4ade80' },
            { key: 'passes', label: t('stats_filtre_passeurs', lang), color: '#60a5fa' },
            { key: 'matchsJoues', label: t('stats_graph_matchs', lang), color: '#a78bfa' },
            { key: 'tauxPresence', label: t('stats_filtre_presence', lang), color: '#34d399', unit: '%' },
            { key: 'pointsSeance', label: t('club_points_seance', lang), color: '#fbbf24' },
            { key: 'noteGlobale', label: t('club_note_educateur', lang), color: '#f59e0b', unit: '/5' },
          ]
          const catData = categorieActive ? statsParCategorie[categorieActive] : null
          const triActif = TRIS.find(t => t.key === triClassement) || TRIS[0]
          const sorted = catData ? [...catData.joueurs].sort((a, b) => (b.stats[triClassement] || 0) - (a.stats[triClassement] || 0)) : []

          if (categories.length === 0) {
            return <div style={{ ...st.card, textAlign: 'center', padding: '3rem', color: '#555' }}>{t('club_creer_categories_dabord', lang)}</div>
          }
          if (loadingClassements) {
            return <p style={{ color: '#4ade80', textAlign: 'center', padding: '2rem' }}>{t('club_chargement_classements', lang)}</p>
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
                    {totalPresencesEffectif > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '10px', marginBottom: '1.5rem' }}>
                        <StatCard label={t('club_taux_presence_effectif', lang)} valeur={`${tauxPresenceEffectif}%`} couleur="green" />
                        <StatCard label={t('club_taux_absence_effectif', lang)} valeur={`${tauxAbsenceEffectif}%`} couleur="red" />
                      </div>
                    )}
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#4ade80', marginBottom: '10px' }}>🏆 {t('club_classement_officiel', lang)}</p>
                    {ligueUrls[categorieActive] ? (
                      <a href={ligueUrls[categorieActive]} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#4ade8015', border: '1px solid #4ade8040', color: '#4ade80', padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, textDecoration: 'none', marginBottom: '1.5rem' }}>
                        🏆 {t('club_voir_classement_ligue', lang)}
                      </a>
                    ) : (
                      <p style={{ color: '#444', fontSize: '13px', marginBottom: '1.5rem' }}>{t('club_lien_classement_manquant', lang)}</p>
                    )}

                    {derniersMatchs.length > 0 && (
                      <>
                        <p style={{ fontSize: '13px', fontWeight: 700, color: '#60a5fa', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}><IcoTrophy /> {t('club_derniers_resultats', lang)}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1.5rem' }}>
                          {derniersMatchs.map(m => {
                            const aScore = m.score_nous !== '' && m.score_nous !== null
                            const nous = parseInt(m.score_nous)
                            const eux = parseInt(m.score_eux)
                            const resultat = aScore ? (nous > eux ? 'V' : nous < eux ? 'D' : 'N') : null
                            const couleur = resultat === 'V' ? '#4ade80' : resultat === 'D' ? '#ef4444' : '#f59e0b'
                            return (
                              <div key={m.id} style={{ ...st.card, display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px' }}>
                                {resultat && <span style={{ background: couleur + '20', color: couleur, fontWeight: 800, fontSize: '11px', padding: '3px 10px', borderRadius: '20px' }}>{resultat}</span>}
                                <div style={{ flex: 1 }}>
                                  <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{m.domicile ? 'vs' : '@'} {m.adversaire}</p>
                                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#555' }}>{new Date(m.date).toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'short' })}{m.competition ? ` · ${m.competition}` : ''}</p>
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
                <div style={{ ...st.card, textAlign: 'center', padding: '3rem', color: '#555' }}>
                  {t('club_aucun_joueur_categorie', lang)}<br />
                  <span style={{ fontSize: '12px', color: '#444' }}>{t('club_educateur_doit_lier', lang)}</span>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                    {TRIS.map(t => (
                      <button key={t.key} onClick={() => setTriClassement(t.key)}
                        style={{ background: triClassement === t.key ? t.color + '20' : '#111', border: `1px solid ${triClassement === t.key ? t.color + '60' : '#222'}`, color: triClassement === t.key ? t.color : '#555', padding: '7px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div style={{ ...st.card, overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'center', color: '#444', fontSize: '11px', width: '40px' }}>#</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', color: '#444', fontSize: '11px' }}>{t('equipe_col_joueur', lang)}</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', color: '#444', fontSize: '11px' }}>{t('equipe_poste', lang)}</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', color: triActif.color, fontSize: '11px' }}>{triActif.label}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((j, i) => {
                          const val = j.stats[triClassement]
                          return (
                            <tr key={j.id} style={{ borderBottom: '1px solid #141414' }}>
                              <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: i < 3 ? triActif.color : '#444' }}>{i + 1}</td>
                              <td style={{ padding: '10px 12px', fontWeight: 700 }}>{j.prenom} {j.nom}</td>
                              <td style={{ padding: '10px 12px', color: '#666' }}>{j.poste || '—'}</td>
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
          <GestionSponsors clubId={clubId} saison={saisonActuelle} readOnly={!canEditSection('sponsors')} />
        )}
        {activeTab === 'deplacements' && canViewSection('deplacements') && (
          <Deplacements clubId={clubId} readOnly={!canEditSection('deplacements')} />
        )}
        {activeTab === 'repartition_bus' && canViewSection('repartition_bus') && (
          <RepartitionMiniBus clubId={clubId} readOnly={!canEditSection('repartition_bus')} />
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
                    ? <img src={club.avatar_url} alt="" style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #4ade8040' }} />
                    : <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#1a2e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 800, color: '#4ade80' }}>
                        {(profilClubEdit.club || club?.club || '?')[0]}
                      </div>
                  }
                  <label style={{ position: 'absolute', bottom: 0, right: 0, width: '24px', height: '24px', background: '#4ade80', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: avatarClubUploading ? 'wait' : 'pointer', border: '2px solid #0a0a0a', fontSize: '11px' }}>
                    {avatarClubUploading ? '…' : '✎'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarClubUpload} disabled={avatarClubUploading} />
                  </label>
                </div>
                <div>
                  <p style={{ fontWeight: 800, fontSize: '18px', margin: '0 0 4px' }}>{profilClubEdit.club || 'Nom du club'}</p>
                  {moyenne !== null ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#fbbf24', fontSize: '16px' }}>{'★'.repeat(Math.round(moyenne))}{'☆'.repeat(5 - Math.round(moyenne))}</span>
                      <span style={{ fontSize: '13px', color: '#666' }}>{moyenne.toFixed(1)} ({avisRecus.length} avis)</span>
                    </div>
                  ) : (
                    <p style={{ fontSize: '13px', color: '#444', margin: 0 }}>{t('club_aucun_avis_recu', lang)}</p>
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
                    <label style={st.label}>{t('seance_description', lang)}</label>
                    <textarea
                      style={{ ...st.input, minHeight: '100px', resize: 'vertical', fontFamily: 'Inter, sans-serif' }}
                      value={profilClubEdit.description}
                      onChange={e => setProfilClubEdit(p => ({ ...p, description: e.target.value }))}
                      placeholder={t('club_desc_placeholder', lang)}
                      disabled={!canEditSection('profil')}
                    />
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
                <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#555', lineHeight: 1.6 }}>{t('club_abonnement_desc', lang)}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                  {Object.values(STRIPE_LINKS_CLUB).map(p => (
                    <div key={p.label} style={{ background: '#141414', borderRadius: '10px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#aaa' }}>{p.label}</span>
                      <span style={{ fontSize: '13px', color: '#4ade80', fontWeight: 700 }}>{p.mensuelPrix} · {p.annuelPrix}</span>
                    </div>
                  ))}
                </div>
                <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Activation abonnement club — ' + (profilClubEdit.club || club?.club || ''))}`}
                  style={{ display: 'inline-block', background: '#4ade80', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
                  {t('club_contacter_support', lang)}
                </a>
              </div>

              {/* Avis reçus */}
              <div style={st.card}>
                <p style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '14px' }}>⭐ {t('club_avis_recus_titre', lang)} ({avisRecus.length})</p>
                {avisRecus.length === 0 ? (
                  <p style={{ color: '#444', fontSize: '13px' }}>{t('club_aucun_avis_desc', lang)}</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {avisRecus.map(a => (
                      <div key={a.id} style={{ background: '#1a1a1a', borderRadius: '10px', padding: '12px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 600, fontSize: '13px' }}>{a.auteur?.prenom} {a.auteur?.nom}</span>
                          <span style={{ color: '#fbbf24', fontSize: '13px' }}>{'★'.repeat(a.note)}{'☆'.repeat(5 - a.note)}</span>
                        </div>
                        {a.commentaire && <p style={{ margin: 0, fontSize: '13px', color: '#aaa', fontStyle: 'italic' }}>"{a.commentaire}"</p>}
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
            .map(([cat, montant], i) => ({ cat, montant, pct: totalDepenses > 0 ? (montant / totalDepenses) * 100 : 0, color: ['#ef4444', '#f97316', '#f59e0b', '#fb923c', '#fbbf24', '#fca5a5', '#fed7aa', '#fde68a', '#fef3c7'][i % 9] }))

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
                  <p style={{ color: '#555', fontSize: 13, margin: '4px 0 0' }}>{t('club_budget_desc', lang)}</p>
                </div>
                {canEditSection('budget') && (
                <button onClick={() => setBudgetFormOuvert(v => !v)}
                  style={{ background: '#4ade80', color: '#000', border: 'none', borderRadius: 10, padding: '9px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  {budgetFormOuvert ? `✕ ${t('btn_annuler', lang)}` : `+ ${t('btn_ajouter', lang)}`}
                </button>
                )}
              </div>

              {budgetFormOuvert && canEditSection('budget') && (
                <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 16, padding: 20, marginBottom: 20 }}>
                  <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: 14 }}>{t('club_nouvelle_entree', lang)}</p>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    {['depense', 'recette'].map(bt => (
                      <button key={bt} onClick={() => setBudgetForm(f => ({ ...f, type: bt, categorie: '' }))}
                        style={{ padding: '7px 18px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif', background: budgetForm.type === bt ? (bt === 'recette' ? '#4ade8020' : '#ef444420') : '#1a1a1a', color: budgetForm.type === bt ? (bt === 'recette' ? '#4ade80' : '#ef4444') : '#555' }}>
                        {bt === 'recette' ? `↑ ${t('club_recette', lang)}` : `↓ ${t('club_depense', lang)}`}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, color: '#555', fontWeight: 600, display: 'block', marginBottom: 4 }}>{t('equipe_categorie', lang)}</label>
                      <select value={budgetForm.categorie} onChange={e => setBudgetForm(f => ({ ...f, categorie: e.target.value }))}
                        style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 10px', color: budgetForm.categorie ? '#fff' : '#555', fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none' }}>
                        <option value="">{t('club_choisir_pts', lang)}</option>
                        {(budgetForm.type === 'recette' ? CATEGORIES_RECETTE : CATEGORIES_DEPENSE).map(c => (
                          <option key={c.label} value={c.label}>{c.emoji} {c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#555', fontWeight: 600, display: 'block', marginBottom: 4 }}>{t('club_montant', lang)}</label>
                      <input type="number" min="0" step="0.01" placeholder="0,00" value={budgetForm.montant} onChange={e => setBudgetForm(f => ({ ...f, montant: e.target.value }))}
                        style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 10px', color: '#fff', fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#555', fontWeight: 600, display: 'block', marginBottom: 4 }}>{t('club_libelle', lang)}</label>
                      <input type="text" placeholder={t('club_description_placeholder', lang)} value={budgetForm.libelle} onChange={e => setBudgetForm(f => ({ ...f, libelle: e.target.value }))}
                        style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 10px', color: '#fff', fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#555', fontWeight: 600, display: 'block', marginBottom: 4 }}>{t('ent_date', lang)}</label>
                      <input type="date" value={budgetForm.date} onChange={e => setBudgetForm(f => ({ ...f, date: e.target.value }))}
                        style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 10px', color: '#fff', fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <input type="text" placeholder={t('club_note_optionnel_placeholder', lang)} value={budgetForm.note} onChange={e => setBudgetForm(f => ({ ...f, note: e.target.value }))}
                    style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 10px', color: '#fff', fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box', marginBottom: 14 }} />
                  <button onClick={ajouterEntreeBudget} disabled={budgetSaving || !budgetForm.libelle.trim() || !budgetForm.montant || !budgetForm.categorie}
                    style={{ background: '#4ade80', color: '#000', border: 'none', borderRadius: 10, padding: '10px 22px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif', opacity: (!budgetForm.libelle.trim() || !budgetForm.montant || !budgetForm.categorie) ? 0.4 : 1 }}>
                    {budgetSaving ? t('jp_enregistrement', lang) : t('club_enregistrer', lang)}
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {[['mois', t('club_ce_mois', lang)], ['saison', t('club_cette_saison', lang)], ['tout', t('club_tout', lang)]].map(([val, label]) => (
                  <button key={val} onClick={() => setBudgetPeriode(val)}
                    style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${budgetPeriode === val ? '#4ade8040' : '#1a1a1a'}`, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', background: budgetPeriode === val ? '#4ade8020' : '#111', color: budgetPeriode === val ? '#4ade80' : '#555' }}>
                    {label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
                {[
                  { label: t('club_recettes', lang), val: totalRecettes, color: '#4ade80', bg: '#4ade8010', sign: '+' },
                  { label: t('club_depenses', lang), val: totalDepenses, color: '#ef4444', bg: '#ef444410', sign: '−' },
                  { label: t('club_solde', lang), val: Math.abs(solde), color: solde >= 0 ? '#4ade80' : '#ef4444', bg: solde >= 0 ? '#4ade8010' : '#ef444410', sign: solde >= 0 ? '+' : '−' },
                ].map(({ label, val, color, bg, sign }) => (
                  <div key={label} style={{ background: bg, border: `1px solid ${color}25`, borderRadius: 16, padding: '16px 18px' }}>
                    <p style={{ margin: '0 0 6px', fontSize: 11, color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</p>
                    <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color, fontVariantNumeric: 'tabular-nums' }}>
                      {sign}{val.toLocaleString(localeOf(lang), { minimumFractionDigits: 2 })} €
                    </p>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 16 : 20, marginBottom: 20 }}>
                {/* Donut Recettes */}
                <div style={{ flex: isMobile ? 'none' : 1, width: '100%', boxSizing: 'border-box', background: '#111', border: '1px solid #1a1a1a', borderRadius: 18, padding: isMobile ? '20px 16px' : 24 }}>
                  <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: 0.5 }}>↑ {t('club_recettes', lang)}</p>
                  <DonutChart segments={categoriesRecetteArr} total={totalRecettes} label={t('club_recu', lang)} lang={lang} />
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {categoriesRecetteArr.length === 0 && (
                      <p style={{ margin: 0, fontSize: 11, color: '#333' }}>{t('club_aucune_entree', lang)}</p>
                    )}
                    {categoriesRecetteArr.slice(0, 4).map((seg, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#aaa' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: seg.color, flexShrink: 0, display: 'inline-block' }} />
                          {seg.cat}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{Math.round(seg.pct)}%</span>
                      </div>
                    ))}
                    {categoriesRecetteArr.length > 4 && <p style={{ margin: 0, fontSize: 10, color: '#333' }}>+{categoriesRecetteArr.length - 4} {t('club_autres_suffix', lang)}</p>}
                  </div>
                </div>

                {/* Donut Dépenses */}
                <div style={{ flex: isMobile ? 'none' : 1, width: '100%', boxSizing: 'border-box', background: '#111', border: '1px solid #1a1a1a', borderRadius: 18, padding: isMobile ? '20px 16px' : 24 }}>
                  <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: 0.5 }}>↓ {t('club_depenses', lang)}</p>
                  <DonutChart segments={categoriesDepenseArr} total={totalDepenses} label={t('club_depense_mot', lang)} lang={lang} />
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {categoriesDepenseArr.length === 0 && (
                      <p style={{ margin: 0, fontSize: 11, color: '#333' }}>{t('club_aucune_entree', lang)}</p>
                    )}
                    {categoriesDepenseArr.slice(0, 4).map((seg, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#aaa' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: seg.color, flexShrink: 0, display: 'inline-block' }} />
                          {seg.cat}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{Math.round(seg.pct)}%</span>
                      </div>
                    ))}
                    {categoriesDepenseArr.length > 4 && <p style={{ margin: 0, fontSize: 10, color: '#333' }}>+{categoriesDepenseArr.length - 4} {t('club_autres_suffix', lang)}</p>}
                  </div>
                </div>

                {/* Donut Global */}
                <div style={{ flex: isMobile ? 'none' : 1, width: '100%', boxSizing: 'border-box', background: '#111', border: '1px solid #1a1a1a', borderRadius: 18, padding: isMobile ? '20px 16px' : 24 }}>
                  <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5 }}>⚖️ {t('club_global', lang)}</p>
                  <DonutChart
                    segments={totalRecettes + totalDepenses > 0 ? [
                      { pct: (totalRecettes / (totalRecettes + totalDepenses)) * 100, color: '#4ade80' },
                      { pct: (totalDepenses / (totalRecettes + totalDepenses)) * 100, color: '#ef4444' },
                    ] : []}
                    total={Math.abs(solde)}
                    label={solde >= 0 ? t('club_benefice', lang) : t('club_deficit', lang)}
                    couleurCentrale={solde >= 0 ? '#4ade80' : '#ef4444'}
                    lang={lang}
                  />
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[{ label: t('club_recettes', lang), color: '#4ade80', val: totalRecettes }, { label: t('club_depenses', lang), color: '#ef4444', val: totalDepenses }].map(({ label, color, val }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#aaa' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                          {label}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color }}>{val.toLocaleString(localeOf(lang), { minimumFractionDigits: 2 })} €</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <p style={{ fontSize: 11, color: '#555', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>{t('jcoach_historique', lang)}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {entriesFiltrees.length === 0 && (
                  <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 12, padding: '28px 20px', textAlign: 'center', color: '#333', fontSize: 13 }}>
                    {t('club_aucune_entree_periode', lang)}
                  </div>
                )}
                {entriesFiltrees.map(e => {
                  const cats = e.type === 'depense' ? CATEGORIES_DEPENSE : CATEGORIES_RECETTE
                  const meta = cats.find(c => c.label === e.categorie)
                  const categoriesArr = e.type === 'depense' ? categoriesDepenseArr : categoriesRecetteArr
                  const segCat = categoriesArr.find(c => c.cat === e.categorie)
                  const couleur = segCat?.color || '#555'
                  return (
                    <div key={e.id} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, background: e.type === 'recette' ? '#4ade8015' : '#ef444415' }}>
                        {meta?.emoji || (e.type === 'recette' ? '↑' : '↓')}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>{e.libelle}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#555' }}>
                          <span style={{ color: couleur }}>{e.categorie}</span>
                          {' · '}{new Date(e.date).toLocaleDateString(localeOf(lang), { day: '2-digit', month: 'short', year: 'numeric' })}
                          {e.note ? ` · ${e.note}` : ''}
                        </p>
                      </div>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: 15, flexShrink: 0, color: e.type === 'recette' ? '#4ade80' : '#ef4444' }}>
                        {e.type === 'recette' ? '+' : '−'}{parseFloat(e.montant).toLocaleString(localeOf(lang), { minimumFractionDigits: 2 })} €
                      </p>
                      {canEditSection('budget') && (
                        <button onClick={() => supprimerEntreeBudget(e.id)}
                          style={{ background: 'transparent', border: 'none', color: '#2a2a2a', cursor: 'pointer', fontSize: 16, padding: '4px 6px', borderRadius: 6, flexShrink: 0, transition: 'color 0.15s' }}
                          onMouseEnter={ev => ev.target.style.color = '#ef4444'}
                          onMouseLeave={ev => ev.target.style.color = '#2a2a2a'}
                          title={t('btn_supprimer', lang)}>✕</button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* ── STAFF (président uniquement) ── */}
        {activeTab === 'staff' && monRole === 'president' && (
          <div style={{ maxWidth: '700px' }}>
            <div style={{ ...st.card, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '14px' }}>🔐 Permissions par rôle</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Contrôle ce que chaque rôle du staff peut voir et modifier.</p>
              </div>
              <button onClick={() => setShowPermissionsModal(true)} style={st.btnSolid}>Gérer les permissions</button>
            </div>

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
                  {ROLES_STAFF.map(r => <option key={r.val} value={r.val}>{r.label}</option>)}
                </select>
              </div>
              {resultatsStaff.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {resultatsStaff.map(u => {
                    const dejaMembre = staffMembers.some(m => m.user_id === u.id)
                    return (
                      <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1a1a1a', borderRadius: '8px', padding: '10px 14px' }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>{u.prenom} {u.nom}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#666' }}>{u.email}</p>
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
              <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#666' }}>{t('club_inviter_email_desc_avant', lang)} {ROLE_STAFF_LABEL(roleAAssigner)}.</p>
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
                <p style={{ margin: '10px 0 0', fontSize: '12px', color: inviteMessage.type === 'ok' ? '#4ade80' : '#ef4444' }}>
                  {inviteMessage.type === 'ok' ? '✅' : '⚠️'} {inviteMessage.texte}
                </p>
              )}
            </div>

            <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '13px', color: '#4ade80' }}>👥 {t('club_membres_staff_titre', lang)} ({staffMembers.length + 1})</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ ...st.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1a2e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', fontWeight: 700, fontSize: '12px' }}>
                    {(club?.club || club?.prenom || '?')[0]}
                  </div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>{club?.club || club?.prenom} <span style={{ color: '#555', fontWeight: 400 }}>{t('club_vous', lang)}</span></p>
                </div>
                <span style={{ background: '#4ade8015', border: '1px solid #4ade8040', color: '#4ade80', padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700 }}>{t('club_president_badge', lang)}</span>
              </div>
              {staffMembers.map(m => (
                <div key={m.id} style={{ ...st.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', fontWeight: 700, fontSize: '12px' }}>
                      {m.membre?.prenom?.[0]}{m.membre?.nom?.[0]}
                    </div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>{m.membre?.prenom} {m.membre?.nom}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select style={{ ...st.input, width: 'auto' }} value={m.role} onChange={e => modifierRoleStaff(m.id, e.target.value)}>
                      {ROLES_STAFF.map(r => <option key={r.val} value={r.val}>{r.label}</option>)}
                    </select>
                    <button onClick={() => retirerStaff(m.id)} style={{ ...st.btnSecondary, color: '#ef4444', borderColor: '#ef444440' }}>{t('club_retirer', lang)}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal gestion des permissions par rôle */}
      {showPermissionsModal && (
        <PermissionsModal
          rolePermissions={rolePermissions}
          saving={savingPermissions}
          onSave={sauvegarderPermissions}
          onClose={() => setShowPermissionsModal(false)}
        />
      )}

      {/* Modal notation éducateur */}
      {eduNoteModal && (
        <div onClick={() => setEduNoteModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '20px', width: '100%', maxWidth: '640px', padding: '24px', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <p style={{ margin: '0 0 2px', fontWeight: 800, fontSize: '16px' }}>⭐ {t('club_evaluer', lang)} {eduNoteModal.educateur?.prenom} {eduNoteModal.educateur?.nom}</p>
              </div>
              <button onClick={() => setEduNoteModal(null)} style={{ background: 'none', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', color: '#555' }}>{t('club_saison_evaluee', lang)}</label>
              <select value={eduNoteSaison} onChange={e => setEduNoteSaison(e.target.value)} style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff', padding: '6px 10px', fontSize: '13px' }}>
                {['2025-2026', '2024-2025', '2023-2024'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
              {CRITERES_EDU.map(cat => (
                <div key={cat.key} style={{ background: '#111', borderRadius: '12px', padding: '14px', border: `1px solid ${cat.color}20` }}>
                  <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: '13px', color: cat.color }}>{cat.label}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {cat.criteres.map(c => (
                      <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ flex: 1, fontSize: '12px', color: '#aaa' }}>{c.label}</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {[1,2,3,4,5].map(n => (
                            <button key={n} onClick={() => setEduNoteCriteres(prev => ({ ...prev, [c.key]: n }))}
                              style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: (eduNoteCriteres[c.key] || 0) >= n ? cat.color : '#2a2a2a', padding: '2px', lineHeight: 1 }}>★</button>
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
              style={{ width: '100%', background: '#111', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '13px', resize: 'vertical', minHeight: '80px', boxSizing: 'border-box', marginBottom: '16px' }} />

            <button onClick={soumettreNotationEducateur} disabled={savingEduNote || CRITERES_EDU.flatMap(c => c.criteres).some(c => !eduNoteCriteres[c.key])}
              style={{ width: '100%', background: '#4ade80', color: '#000', border: 'none', borderRadius: '12px', padding: '14px', fontWeight: 800, fontSize: '14px', cursor: 'pointer', opacity: CRITERES_EDU.flatMap(c => c.criteres).every(c => eduNoteCriteres[c.key]) ? 1 : 0.4 }}>
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
            <div onClick={e => e.stopPropagation()} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '20px', width: '100%', maxWidth: '900px', padding: '24px', margin: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: '16px' }}>👥 {t('club_effectif', lang)} — {cat?.nom} {cat?.equipe}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', background: '#111', borderRadius: '8px', padding: '3px' }}>
                    {[['poste', `⊞ ${t('equipe_vue_postes', lang)}`], ['liste', `☰ ${t('equipe_vue_liste', lang)}`]].map(([v, label]) => (
                      <button key={v} onClick={() => setEffectifVue(v)}
                        style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif', background: effectifVue === v ? '#4ade80' : 'transparent', color: effectifVue === v ? '#000' : '#555', transition: 'all 0.15s' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => { setEffectifModal(null); setJoueurDetail(null) }} style={{ background: 'none', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                </div>
              </div>

              {!catData ? (
                <p style={{ color: '#4ade80', textAlign: 'center', padding: '2rem' }}>{t('jexp_chargement', lang)}</p>
              ) : catData.joueurs.length === 0 ? (
                <p style={{ color: '#444', textAlign: 'center', padding: '2rem' }}>{t('club_aucun_joueur_categorie_court', lang)}</p>
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
                            <th key={h} style={{ padding: '10px 12px', textAlign: hi === 1 || hi === 2 ? 'left' : 'center', color: '#555', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {joueursTries.map(j => {
                          const groupe = GROUPES_POSTE.find(g => g.match(j.poste)) || GROUPES_POSTE[GROUPES_POSTE.length - 1]
                          return (
                            <tr key={j.id} onClick={() => setJoueurDetail(j.id)} style={{ borderBottom: '1px solid #141414', cursor: 'pointer' }}>
                              <td style={{ padding: '10px 12px', textAlign: 'center', color: '#555', fontWeight: 700 }}>{j.numero_maillot || '—'}</td>
                              <td style={{ padding: '10px 12px', fontWeight: 700 }}>{j.prenom} {j.nom}</td>
                              <td style={{ padding: '10px 12px' }}><span style={{ color: groupe.color, fontSize: '12px' }}>{j.poste || '—'}</span></td>
                              <td style={{ padding: '10px 12px', textAlign: 'center', color: '#4ade80', fontWeight: 700 }}>{j.stats.buts}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'center', color: '#60a5fa', fontWeight: 700 }}>{j.stats.passes}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'center', color: '#a78bfa', fontWeight: 700 }}>{j.stats.matchsJoues}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                {j.stats.tauxPresence !== null ? <span style={{ color: j.stats.tauxPresence >= 80 ? '#4ade80' : '#f59e0b', fontSize: '12px' }}>{j.stats.tauxPresence}%</span> : <span style={{ color: '#333' }}>—</span>}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                {j.stats.noteGlobale !== null ? <span style={{ color: '#f59e0b', fontSize: '12px' }}>{j.stats.noteGlobale.toFixed(1)}/5</span> : <span style={{ color: '#333' }}>—</span>}
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
                            <div key={j.id} onClick={() => setJoueurDetail(j.id)} style={{ background: '#111', border: `1px solid ${groupe.color}20`, borderRadius: '12px', padding: '14px', cursor: 'pointer' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: groupe.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', color: groupe.color, fontWeight: 800, fontSize: '12px', flexShrink: 0 }}>
                                  {j.numero_maillot || `${j.prenom?.[0] || ''}${j.nom?.[0] || ''}`}
                                </div>
                                <div>
                                  <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{j.prenom} {j.nom}</p>
                                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#555' }}>{j.poste || '—'}</p>
                                </div>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '6px' }}>
                                {[
                                  { label: t('comp_buts', lang), val: j.stats.buts, color: '#4ade80' },
                                  { label: t('recrut_passes', lang), val: j.stats.passes, color: '#60a5fa' },
                                  { label: t('recrut_matchs', lang), val: j.stats.matchsJoues, color: '#a78bfa' },
                                ].map(s => (
                                  <div key={s.label} style={{ background: '#0a0a0a', borderRadius: '8px', padding: '6px', textAlign: 'center' }}>
                                    <p style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: s.color }}>{s.val}</p>
                                    <p style={{ margin: 0, fontSize: '9px', color: '#555', textTransform: 'uppercase' }}>{s.label}</p>
                                  </div>
                                ))}
                              </div>
                              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                                {j.stats.tauxPresence !== null && (
                                  <span style={{ fontSize: '11px', color: j.stats.tauxPresence >= 80 ? '#4ade80' : '#f59e0b' }}>🏃 {j.stats.tauxPresence}%</span>
                                )}
                                {j.stats.pointsSeance > 0 && <span style={{ fontSize: '11px', color: '#fbbf24' }}>⭐ {j.stats.pointsSeance}</span>}
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
            <div onClick={e => e.stopPropagation()} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '20px', width: '100%', maxWidth: '640px', padding: '24px', margin: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <p style={{ margin: '0 0 2px', fontWeight: 800, fontSize: '16px' }}>{j.prenom} {j.nom}</p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#555' }}>{j.poste || '—'}{j.numero_maillot ? ` · #${j.numero_maillot}` : ''}</p>
                </div>
                <button onClick={() => setJoueurDetail(null)} style={{ background: 'none', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer' }}>✕</button>
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
                  <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '13px', color: '#a78bfa' }}>📅 {t('club_presence_par_mois', lang)}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {s.presenceMensuelle.map(({ month, taux, present, total }) => {
                      const label = new Date(month + '-02').toLocaleDateString(localeOf(lang), { month: 'short', year: '2-digit' })
                      const color = taux >= 80 ? '#4ade80' : taux >= 60 ? '#f59e0b' : '#ef4444'
                      return (
                        <div key={month} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: '#555', width: '44px', flexShrink: 0 }}>{label}</span>
                          <div style={{ flex: 1, height: '6px', background: '#1a1a1a', borderRadius: '3px' }}>
                            <div style={{ width: `${taux}%`, height: '100%', background: color, borderRadius: '3px' }} />
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, color, width: '36px', textAlign: 'right', flexShrink: 0 }}>{taux}%</span>
                          <span style={{ fontSize: '10px', color: '#444', flexShrink: 0 }}>{present}/{total}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Position points séance par mois */}
              {positionParMois.length > 0 && (
                <div>
                  <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '13px', color: '#fbbf24' }}>⭐ {t('club_position_points_mois', lang)}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {positionParMois.map(({ month, label, rank, total, points }) => (
                      <div key={month} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#111', borderRadius: '8px', padding: '8px 12px' }}>
                        <span style={{ fontSize: '11px', color: '#555' }}>{label}</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: rank === 1 ? '#fbbf24' : '#888' }}>#{rank}/{total} {rank === 1 ? '🏆' : ''}</span>
                        <span style={{ fontSize: '11px', color: '#fbbf24' }}>{points} {t('club_pts', lang)}</span>
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

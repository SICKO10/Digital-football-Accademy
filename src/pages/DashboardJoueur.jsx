import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, signOutSafe } from '../supabase'
import { colors, alpha } from '../tokens'
import { useColors } from '../lib/theme'
import { ThemeToggleButton } from '../lib/ThemeProvider'
import EmptyState from '../components/EmptyState'
import Loader from '../components/Loader'
import Avatar from '../components/Avatar'
import { notifierJoueur } from '../lib/notifications'
import NotificationBanner from '../components/NotificationBanner'
import { COACH_ADMIN_EMAILS } from '../lib/coachAdmin'
import { FifaCardGenerator } from '../components/FifaCard'
import { ModalNotation, BadgeNote } from '../components/Notation'
import { CRITERES_EDU as CRITERES_EDU_KEYS } from './DashboardEducateur'
import { CATEGORIES } from '../lib/categories'
import PrepPhysiqueJoueur from '../components/prepphysique/PrepPhysiqueJoueur'
import HistoriqueSaisons from '../components/saisons/HistoriqueSaisons'
import { useLang } from '../hooks/useLang'
import { t, localeOf } from '../lib/translations'
import { STRIPE_LINKS, stripeUrl } from '../lib/stripeLinks'
import PlanningSemaineWidget from '../components/PlanningSemaineWidget'
import OnboardingGuide from '../components/OnboardingGuide'
import CompositionTerrain from '../components/CompositionTerrain'
import FloatingHelper from '../components/FloatingHelper'
import ParrainageWidget from '../components/ParrainageWidget'
import SondageSemaine from '../components/SondageSemaine'
import StatsEquipe from '../components/StatsEquipe'

// Boutons standardisés — même pattern que st.btn(color)/st.btnSolid déjà utilisé
// dans DashboardEducateur.jsx/DashboardCoach.jsx/GestionSponsors.jsx. Défini au
// niveau module (pas dans un composant) car ce fichier a plusieurs composants
// frères (UpgradeCard, ProfilAffilieOnglet...) qui utilisent tous des boutons —
// colors/alpha sont des imports statiques, pas de state, donc pas besoin de
// redéfinir st par composant.
const st = {
  btn: (color = colors.accent.green) => ({ background: color + alpha.subtle, border: `1px solid ${color}${alpha.medium}`, color, padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }),
  btnSolid: (color = colors.accent.green) => ({ background: color, color: colors.black, border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }),
}

// CATEGORIES + valeurs historiques encore utilisées par certains profils (U21, Veteran)
const CATEGORIES_JOUEUR = [...CATEGORIES.filter(c => c !== 'Seniors'), 'U21', 'Seniors', 'Veteran']
const CATEGORIES_CLUB_HISTORIQUE = [...CATEGORIES.filter(c => c !== 'Seniors'), 'U21', 'Seniors']

const IconHome = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)
const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
)
const IconChart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
)
const IconMessage = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
)
const IconMic = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
)
const IconPlay = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
)
const IconGlobe = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
)
const IconUpload = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
  </svg>
)
const IconVideoOff = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
    <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
  </svg>
)
const IconLock = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)
const IconSearch = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)
const IconCard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="3"/><path d="M7 15h4M15 15h2M7 11h2"/>
  </svg>
)
const IconBadge = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
  </svg>
)
const IconShirt = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 3l5 4-3 3-2-2v12a1 1 0 01-1 1H9a1 1 0 01-1-1V8l-2 2-3-3 5-4a4 4 0 008 0z"/>
  </svg>
)
const IconBuilding = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 22V12h6v10"/><path d="M9 7h1M14 7h1M9 11h1M14 11h1"/>
  </svg>
)
const IconDumbbell = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 4v16M18 4v16M3 8h3M18 8h3M3 16h3M18 16h3M6 12h12"/>
  </svg>
)
const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)
const IconTrophy = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
    <path d="M4 22h16"/>
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
  </svg>
)

function UpgradeCard({ titre, texte, lang = 'fr', userId, email }) {
  const colors = useColors()
  return (
    <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '20px', padding: '3rem 2rem', textAlign: 'center', maxWidth: '480px', margin: '0 auto' }}>
      <div style={{ color: colors.icon.muted, display: 'flex', justifyContent: 'center', marginBottom: '16px' }}><IconLock /></div>
      <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>{titre}</h2>
      <p style={{ fontSize: '13px', color: colors.text.faint, maxWidth: '300px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>{texte}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button onClick={() => window.open(stripeUrl(STRIPE_LINKS.starter, userId, email), '_blank')} style={{ background: 'transparent', color: colors.text.primary, border: `1px solid ${colors.border.default}`, padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{t('aff_starter_prix', lang)}</button>
        <button onClick={() => window.open(stripeUrl(STRIPE_LINKS.pro, userId, email), '_blank')} style={st.btnSolid()}>{t('aff_pro_prix', lang)}</button>
      </div>
    </div>
  )
}

function ProfilAffilieOnglet({ profil, userId, setProfil, lang = 'fr', readOnly }) {
  const colors = useColors()
  const [editProfil, setEditProfil] = useState(false)
  const [profilForm, setProfilForm] = useState({
    prenom: profil?.prenom || '', nom: profil?.nom || '',
    poste: profil?.poste || '', categorie: profil?.categorie || '',
    numero_licence: profil?.numero_licence || '', date_naissance: profil?.date_naissance || '',
    club: profil?.club || '', region: profil?.region || '', pied: profil?.pied || 'droit',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const sauvegarder = async () => {
    if (readOnly) return
    // Optimistic : profil local mis à jour et confirmation affichée tout de
    // suite, sans attendre la réponse Supabase. Erreur → on revient à
    // l'ancien profil (aucune vérification d'erreur n'existait avant).
    const avant = profil
    setProfil(prev => ({ ...prev, ...profilForm }))
    setSaving(true)
    setSaved(true)
    const { error } = await supabase.from('profiles').update(profilForm).eq('id', userId)
    setSaving(false)
    if (error) {
      // Le timer de fermeture ne démarre qu'une fois l'écriture confirmée
      // (ci-dessous) — sur erreur on annule le check "sauvegardé" tout de
      // suite au lieu de laisser le formulaire se refermer 1,5s plus tard
      // sur une sauvegarde qui a en fait échoué.
      setSaved(false)
      setProfil(avant)
      alert('Erreur lors de la sauvegarde : ' + error.message)
      return
    }
    setTimeout(() => { setSaved(false); setEditProfil(false) }, 1500)
  }

  const postes = ['Gardien', 'Défenseur central', 'Latéral droit', 'Latéral gauche', 'Milieu défensif', 'Milieu central', 'Milieu offensif', 'Ailier droit', 'Ailier gauche', 'Attaquant']

  return (
    <div style={{ maxWidth: '560px' }}>
      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${colors.accent.green}${alpha.subtle}, ${colors.background.surface})`, border: `1px solid ${colors.accent.green}${alpha.light}`, borderRadius: '20px', padding: '28px 24px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Avatar person={profil} size={72} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '20px', letterSpacing: '-0.5px' }}>
            {profil?.prenom || '—'} {profil?.nom || ''}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: colors.accent.green }}>
            {profil?.poste || t('aff_poste_non_renseigne', lang)}
          </p>
          {profil?.categorie && (
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: colors.text.faint }}>{profil.categorie}{profil?.club ? ` · ${profil.club}` : ''}</p>
          )}
        </div>
        <button onClick={() => setEditProfil(!editProfil)}
          style={{ background: editProfil ? colors.accent.green + alpha.soft : colors.background.surface, border: `1px solid ${editProfil ? '#4ade8060' : colors.border.default}`, color: editProfil ? colors.accent.green : colors.text.faint, borderRadius: '10px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>
          {editProfil ? t('btn_annuler', lang) : `✏️ ${t('btn_modifier', lang)}`}
        </button>
      </div>

      {/* Infos / Formulaire */}
      <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {editProfil ? (
          <>
            {[
              { label: t('equipe_prenom', lang), key: 'prenom', type: 'text' },
              { label: t('equipe_nom', lang), key: 'nom', type: 'text' },
              { label: t('profil_club_label', lang), key: 'club', type: 'text' },
              { label: t('profil_region', lang), key: 'region', type: 'text' },
              { label: t('aff_n_licence', lang), key: 'numero_licence', type: 'text' },
              { label: t('aff_date_naissance', lang), key: 'date_naissance', type: 'date' },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label style={{ fontSize: '11px', color: colors.text.faint, display: 'block', marginBottom: '4px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{label}</label>
                <input type={type} value={profilForm[key]}
                  onChange={e => setProfilForm(prev => ({ ...prev, [key]: e.target.value }))}
                  style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '9px 12px', color: colors.text.primary, fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none' }} />
              </div>
            ))}
            <div>
              <label style={{ fontSize: '11px', color: colors.text.faint, display: 'block', marginBottom: '4px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{t('equipe_poste', lang)}</label>
              <select value={profilForm.poste} onChange={e => setProfilForm(prev => ({ ...prev, poste: e.target.value }))}
                style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '9px 12px', color: colors.text.primary, fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none' }}>
                <option value="">{t('aff_selectionner', lang)}</option>
                {postes.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: colors.text.faint, display: 'block', marginBottom: '4px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{t('equipe_pied', lang)}</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[['droit', t('equipe_droit', lang)], ['gauche', t('equipe_gauche', lang)], ['les deux', t('equipe_les_deux', lang)]].map(([p, label]) => (
                  <button key={p} onClick={() => setProfilForm(prev => ({ ...prev, pied: p }))}
                    style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `1px solid ${profilForm.pied === p ? '#4ade8060' : colors.border.default}`, background: profilForm.pied === p ? colors.accent.green + alpha.subtle : colors.background.base, color: profilForm.pied === p ? colors.accent.green : colors.text.faint, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', textTransform: 'capitalize' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={sauvegarder} disabled={saving}
              style={{ ...st.btnSolid(), marginTop: '4px' }}>
              {saving ? t('jp_sauvegarde_cours', lang) : saved ? `✅ ${t('msg_sauvegarde_ok', lang)}` : t('btn_sauvegarder', lang)}
            </button>
          </>
        ) : (
          <>
            {[
              { label: t('aff_email', lang), val: profil?.email },
              { label: t('equipe_poste', lang), val: profil?.poste },
              { label: t('equipe_pied', lang), val: profil?.pied },
              { label: t('equipe_categorie', lang), val: profil?.categorie },
              { label: t('profil_club_label', lang), val: profil?.club },
              { label: t('profil_region', lang), val: profil?.region },
              { label: t('aff_n_licence', lang), val: profil?.numero_licence },
              { label: t('aff_date_naissance', lang), val: profil?.date_naissance ? new Date(profil.date_naissance).toLocaleDateString(localeOf(lang)) : null },
            ].filter(r => r.val).map(({ label, val }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '4px 0', borderBottom: `1px solid ${colors.border.subtle}` }}>
                <span style={{ color: colors.text.faint }}>{label}</span>
                <span style={{ fontWeight: 600, color: colors.text.secondary }}>{val}</span>
              </div>
            ))}
            {[profil?.prenom, profil?.nom, profil?.poste].every(v => !v) && (
              <p style={{ margin: 0, fontSize: '13px', color: colors.border.strong, textAlign: 'center', padding: '12px 0' }}>
                {t('aff_clique_sur', lang)} <strong style={{ color: colors.text.faint }}>{t('btn_modifier', lang)}</strong> {t('aff_clique_modifier_profil', lang)}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Un joueur "convoqué" (équipe supérieure, etc.) compte comme présent — même
// convention que tauxPresence côté DashboardEducateur.jsx. Valeurs canoniques
// uniquement (present/convoque) : présences_entrainement n'a jamais eu de
// variantes accentuées/anglaises/booléennes, cf. sessions précédentes.
const estPresent = (statut) => statut === 'present' || statut === 'convoque'

// Saison "YYYY-YYYY" (juillet N → juin N+1) — même convention que getSaison()
// dans GestionCloturesSaison.jsx, appliquée ici à la date d'un match plutôt
// qu'à "aujourd'hui" pour pouvoir regrouper un historique par saison.
const saisonDeDate = (dateStr) => {
  const d = new Date(dateStr)
  const y = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1
  return `${y}-${y + 1}`
}

// Camembert multi-segment (présence / convocation / absence / blessure / maladie)
// — même technique et mêmes couleurs que DonutMulti côté éducateur
// (DashboardEducateur.jsx), pour rester cohérent entre les deux dashboards.
function DonutPresenceMulti({ presents, convoque, absents, blesses, malade, size = 96 }) {
  const colors = useColors()
  const total = (presents || 0) + (convoque || 0) + (absents || 0) + (blesses || 0) + (malade || 0)
  const taux = total ? Math.round(((presents || 0) + (convoque || 0)) / total * 100) : 0
  const color = taux >= 80 ? colors.accent.green : taux >= 50 ? '#f59e0b' : '#f87171'
  if (!total) return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: colors.background.raised, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ color: colors.border.strong, fontSize: '10px' }}>—</span>
    </div>
  )
  const p = (presents || 0) / total * 100
  const c = (convoque || 0) / total * 100
  const a = (absents || 0) / total * 100
  const b = (blesses || 0) / total * 100
  const pEnd = p + c
  const aEnd = pEnd + a
  const bEnd = aEnd + b
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: `conic-gradient(#4ade80 0% ${p}%, #60a5fa ${p}% ${pEnd}%, #ef4444 ${pEnd}% ${aEnd}%, #f97316 ${aEnd}% ${bEnd}%, #a855f7 ${bEnd}% 100%)`,
      }} />
      <div style={{ position: 'absolute', inset: `${size * 0.18}px`, borderRadius: '50%', background: colors.background.base, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.19, fontWeight: 800, color, lineHeight: 1 }}>{taux}%</span>
      </div>
    </div>
  )
}

function CerclePresence({ presents, convoque, absents, blesses, malade, total, style }) {
  const colors = useColors()
  return (
    <div style={{ background: colors.background.surface, borderRadius: '16px', padding: '18px', border: `1px solid ${colors.border.subtle}`, display: 'flex', flexDirection: 'column', alignItems: 'center', boxSizing: 'border-box', ...style }}>
      <DonutPresenceMulti presents={presents} convoque={convoque} absents={absents} blesses={blesses} malade={malade} size={88} />
      <div style={{ fontSize: '11px', color: colors.text.dim, margin: '8px 0 10px' }}>{total} séance{total > 1 ? 's' : ''} au total</div>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {[
          { emoji: '✅', label: 'Présent', val: presents, color: colors.accent.green },
          { emoji: '🏆', label: 'Convoqué', val: convoque, color: colors.accent.blue },
          { emoji: '❌', label: 'Absent', val: absents, color: colors.accent.red },
          { emoji: '🤕', label: 'Blessé', val: blesses, color: colors.accent.orange },
          { emoji: '🤒', label: 'Malade', val: malade, color: colors.accent.purple },
        ].filter(s => s.val > 0).map(s => (
          <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
            <span style={{ color: colors.text.faint }}>{s.emoji} {s.label}</span>
            <span style={{ fontWeight: 700, color: s.color }}>{s.val}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// joueurIdOverride/readOnly : rendu pour un parent qui consulte le profil de
// son enfant (cf. DashboardParent.jsx), même principe que educateurIdOverride
// sur DashboardEducateur.jsx pour un dirigeant délégué. userId (state, utilisé
// ~80 fois dans tout le fichier pour les lectures) est résolu une seule fois
// dans getProfil() vers joueurIdOverride quand présent — tout le reste du
// fichier n'a rien à changer pour afficher les bonnes données. En écriture,
// deux filets : un bloqueur de clics au niveau conteneur (capture phase, seule
// la navigation par onglet passe) + un guard explicite au début de chaque
// fonction qui écrit en base, pour ne pas dépendre uniquement de la RLS.
function DashboardJoueur({ joueurIdOverride, readOnly } = {}) {
  const navigate = useNavigate()
  const colors = useColors()
  const [hoveredCard, setHoveredCard] = useState(null)
  const [profil, setProfil] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState({ email_analyse: true, email_like: true, email_commentaire: true, email_message: true })
  const [parentsInvites, setParentsInvites] = useState([])
  const [emailParentInput, setEmailParentInput] = useState('')
  const [invitantParent, setInvitantParent] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [demandes, setDemandes] = useState([])
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet] = useState('dashboard')
  const [classementActif, setClassementActif] = useState('buteurs')
  const [stats, setStats] = useState({})
  const [savingStats, setSavingStats] = useState(false)
  const [statsSaved, setStatsSaved] = useState(false)
  const [userId, setUserId] = useState(null)
  const [deletingVideo, setDeletingVideo] = useState(false)
  const [reelJogabonito, setReelJogabonito] = useState(null)
  const [deletingReel, setDeletingReel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelDone, setCancelDone] = useState(false)
  const [fanOnglet, setFanOnglet] = useState('accueil')
  const [fanFavoris, setFanFavoris] = useState([])
  const [loadingFanFavoris, setLoadingFanFavoris] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)

  const [conversations, setConversations] = useState([])
  const [messageActif, setMessageActif] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [messages, setMessages] = useState([])

  const [pointsForts, setPointsForts] = useState([])
  const [aAmeliorer, setAAmeliorer] = useState([])
  const [styleDeJeu, setStyleDeJeu] = useState('')

  // Certification
  const [certifications, setCertifications] = useState([])
  const [nouvelleCertif, setNouvelleCertif] = useState({ niveau: '', saison: '' })
  const [certifDocs, setCertifDocs] = useState([])
  const [uploadingCertif, setUploadingCertif] = useState(false)
  const [submittingCertif, setSubmittingCertif] = useState(false)
  const [certifSent, setCertifSent] = useState(false)

  const [parcours, setParcours] = useState([])
  const [nouveauClub, setNouveauClub] = useState({ club: '', saison: '', categorie: '', poste: '', logo_url: '', niveau_championnat: '', matchs_joues: '', buts: '', passes_decisives: '', cleansheets: '' })
  const [savingParcours, setSavingParcours] = useState(false)
  const [editingParcoursId, setEditingParcoursId] = useState(null)
  const [clubSuggestions, setClubSuggestions] = useState([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const [coaches, setCoaches] = useState([])
  const [coachSelectionne, setCoachSelectionne] = useState(null)
  const [messageCoach, setMessageCoach] = useState('')
  const [sendingCoach, setSendingCoach] = useState(false)
  const [coachSent, setCoachSent] = useState(false)
  const [convCoach, setConvCoach] = useState([])
  const [coachUnread, setCoachUnread] = useState(0)
  const [recruteurModal, setRecruteurModal] = useState(null)
  const [notationCible, setNotationCible] = useState(null)

  // Explorer (éducateurs + clubs + scouts) — 3 onglets distincts, chacun sur
  // sa vraie valeur profiles.plan ('educateur' / 'club' / 'scout' — 'recruteur'
  // n'existe pas en base, cf. RegisterRecruteur.jsx, vérifié directement
  // contre la base : la contrainte CHECK de profiles.plan la rejette).
  const [educateursListe, setEducateursListe] = useState([])
  const [clubsListe, setClubsListe] = useState([])
  const [recruteursList, setRecruteursList] = useState([])
  const [recrutementsParClub, setRecrutementsParClub] = useState({}) // { [club_id]: [{categorie,poste,niveau}] }
  const [clubsLoading, setClubsLoading] = useState(false)
  const [explorerOnglet, setExplorerOnglet] = useState('educateurs') // 'educateurs' | 'clubs' | 'scouts'
  const [explorerRecherche, setExplorerRecherche] = useState('')
  const [explorerRegion, setExplorerRegion] = useState('')
  // Tablette alignée sur le comportement téléphone (menu en tiroir plutôt que
  // sidebar fixe) — même décision que DashboardEducateur.jsx.
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [onboardingKey, setOnboardingKey] = useState(0)
  const replayOnboarding = () => setOnboardingKey(k => k + 1)

  // Mon Équipe (affiliation éducateur)
  const [mesAffiliations, setMesAffiliations] = useState([])
  // Widget sondage présence + calendrier (accueil joueur affilié)
  const [widgetProchainEnt, setWidgetProchainEnt] = useState(null)
  const [widgetProchainMatch, setWidgetProchainMatch] = useState(null)
  const [widgetDispoEnt, setWidgetDispoEnt] = useState(null)
  const [widgetDispoMatch, setWidgetDispoMatch] = useState(null)
  const [widgetCalendrier, setWidgetCalendrier] = useState([])
  const [tauxPresenceAccueil, setTauxPresenceAccueil] = useState(null) // { taux, present, total, serie, buts, passes, minutesJouees, matchsJoues } | null
  const [convocationActive, setConvocationActive] = useState(null) // convocation publiée non expirée pour ce joueur, avec le match joint
  const [repConvoc, setRepConvoc] = useState(null) // 'present' | 'absent' | null — réponse du joueur à convocationActive
  const [compositionActive, setCompositionActive] = useState(null) // composition (causerie) publiée la plus pertinente, cf. chargerCompositionActive
  // Inventaire club (Équipement) — tailles déclarées par le joueur + statut de préparation
  const [clubIdInventaire, setClubIdInventaire] = useState(null)
  const [annoncesClub, setAnnoncesClub] = useState([])
  const [annoncesLuesIds, setAnnoncesLuesIds] = useState(new Set())
  const [champsEquipement, setChampsEquipement] = useState([])
  const [mesTailles, setMesTailles] = useState([])
  const [equipementPret, setEquipementPret] = useState(null) // ligne equipement_commandes si statut='pret'
  const [equipementCommande, setEquipementCommande] = useState(null) // ligne equipement_commandes quel que soit le statut (affichage "Remis le ...")
  const [packAttribue, setPackAttribue] = useState(null) // equipement_packs attribué à ce joueur (equipement_attributions)
  const [mesNotes, setMesNotes] = useState([]) // notations_match reçues, la plus récente d'abord
  const [evalOuverte, setEvalOuverte] = useState(null) // { affiliationId, index } — carré de note ouvert dans "Mes évaluations"
  const [moyennePerso, setMoyennePerso] = useState(null)
  // Onglet Compétition (lecture seule) — résultats/calendrier/classement de l'équipe de l'éducateur affilié
  const [resultatsCompetition, setResultatsCompetition] = useState([])
  const [calendrierCompetition, setCalendrierCompetition] = useState([])
  const [lienClassementCompetition, setLienClassementCompetition] = useState(null)
  // Mois affiché dans "Prochains matchs" (1er du mois, pour comparer par mois/année) — navigable via les flèches ‹ ›
  const [moisCalendrierCompetition, setMoisCalendrierCompetition] = useState(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d
  })
  // Idem pour "Derniers résultats" — null tant que l'utilisateur n'a pas navigué,
  // pour partir du mois du dernier match joué plutôt que du mois en cours (souvent
  // vide côté résultats passés) une fois resultatsCompetition chargé.
  const [moisResultatsCompetition, setMoisResultatsCompetition] = useState(null)
  const [savingDispo, setSavingDispo] = useState(false)
  const [dispoMap, setDispoMap] = useState({}) // { [entrainementOuMatchId]: statut } — pour la liste des 4 prochaines échéances
  const [codeEquipe, setCodeEquipe] = useState('')
  const [sendingCode, setSendingCode] = useState(false)
  const [codeError, setCodeError] = useState(null)
  const [codeSuccess, setCodeSuccess] = useState(false)
  const [eduNote, setEduNote] = useState(null) // éducateur en cours de notation
  const [noteCriteres, setNoteCriteres] = useState({})
  const [noteCommentaire, setNoteCommentaire] = useState('')
  const [notePublic, setNotePublic] = useState(true)
  const [noteSaison, setNoteSaison] = useState('2024-2025')
  const [savingNote, setSavingNoteEdu] = useState(false)
  const [noteSaved, setNoteSaved] = useState(false)
  const [cloturesAEvaluer, setCloturesAEvaluer] = useState([]) // saisons clôturées par le coach, pas encore évaluées
  const [rappelClotureFerme, setRappelClotureFerme] = useState(false)

  const { lang, setLang } = useLang()

  // Calendrier hebdomadaire (widget PlanningSemaineWidget, lecture seule) — tous les
  // entrainements/matchs de l'éducateur, sans limite de date (navigation ← → dans le widget).
  const [planningEntrainements, setPlanningEntrainements] = useState([])
  const [planningMatchs, setPlanningMatchs] = useState([])
  const chargerPlanningSemaine = async (educateurId) => {
    if (!educateurId) return
    const [{ data: ents }, { data: mts }] = await Promise.all([
      supabase.from('entrainements').select('id, date, description, heure').eq('educateur_id', educateurId),
      supabase.from('matchs_equipe').select('id, date, heure, adversaire, domicile').eq('educateur_id', educateurId),
    ])
    setPlanningEntrainements(ents || [])
    setPlanningMatchs(mts || [])
  }

  useEffect(() => { getProfil() }, [])

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Taux de présence (widget Accueil, à côté de "Prochaines échéances") — basé
  // sur presences_entrainement (constat de l'éducateur après la séance), donc
  // equipeJoueurId (equipe_joueurs.id), PAS userId : contrairement à
  // disponibilites (le sondage, où joueur_id = le compte du joueur), les
  // présences sont rattachées à la fiche joueur du roster de l'éducateur. Ne
  // compte que present/convoque comme "présent" (même convention que
  // tauxPresence côté DashboardEducateur.jsx — un joueur convoqué en équipe
  // sup n'est pas un absent).
  async function chargerTauxPresence(equipeJoueurId, educateurId) {
    if (!equipeJoueurId) { setTauxPresenceAccueil(null); return }
    // Le total ne doit pas se limiter aux séances déjà saisies manuellement par
    // l'éducateur dans presences_entrainement (souvent très partiel, l'éducateur
    // n'ayant pas forcément pointé chaque séance) : on part de TOUTES les séances
    // de l'équipe (entrainements), et pour chacune, on prend le statut saisi
    // manuellement si présent, sinon on retombe sur la réponse au sondage de
    // présence (disponibilites) — même logique que tauxPresence() côté éducateur
    // (DashboardEducateur.jsx), pour rester cohérent des deux côtés.
    const [{ data: entrainementsData }, { data: presences }, { data: dispos }, { data: statsMatch }] = await Promise.all([
      supabase.from('entrainements').select('id, date').eq('educateur_id', educateurId).lte('date', new Date().toISOString().split('T')[0]),
      supabase.from('presences_entrainement').select('statut, entrainement_id').eq('joueur_id', equipeJoueurId),
      supabase.from('disponibilites').select('seance_id, statut').eq('joueur_id', userId),
      supabase.from('stats_match').select('buts, passes_dec, minutes').eq('joueur_id', equipeJoueurId),
    ])

    const presenceMap = {}
    presences?.forEach(p => { presenceMap[p.entrainement_id] = p.statut })
    const dispoMap = {}
    dispos?.forEach(d => { if (d.seance_id) dispoMap[d.seance_id] = d.statut })
    const statutEffectif = (entId) => presenceMap[entId] || dispoMap[entId] || null

    const saisies = (entrainementsData || []).filter(e => statutEffectif(e.id) !== null)
    if (saisies.length === 0) { setTauxPresenceAccueil(null); return }
    const total = saisies.length
    const statuts = saisies.map(e => statutEffectif(e.id))
    const presents = statuts.filter(s => s === 'present').length
    const convoque = statuts.filter(s => s === 'convoque').length
    const absents = statuts.filter(s => s === 'absent').length
    const blesses = statuts.filter(s => s === 'blesse').length
    const malade = statuts.filter(s => s === 'malade').length
    const present = presents + convoque // présent + convoqué comptent comme présence, cf. estPresent

    // Série de présences consécutives : mêmes séances "saisies", triées de la
    // plus récente à la plus ancienne, jusqu'à la première absence.
    const parDate = saisies.slice().sort((a, b) => new Date(b.date) - new Date(a.date))
    let serie = 0
    for (const e of parDate) { if (estPresent(statutEffectif(e.id))) serie++; else break }

    const buts = statsMatch?.reduce((s, m) => s + (m.buts || 0), 0) || 0
    const passes = statsMatch?.reduce((s, m) => s + (m.passes_dec || 0), 0) || 0
    const minutesJouees = statsMatch?.reduce((s, m) => s + (m.minutes || 0), 0) || 0
    const matchsJoues = statsMatch?.filter(m => (m.minutes || 0) > 0).length || 0

    setTauxPresenceAccueil({
      taux: Math.round((present / total) * 100), present, total, serie,
      presents, convoque, absents, blesses, malade,
      buts, passes, minutesJouees, matchsJoues,
    })
  }

  async function chargerMesNotes(equipeJoueurId) {
    if (!equipeJoueurId) { setMesNotes([]); setMoyennePerso(null); return }
    const { data } = await supabase
      .from('notations_match')
      .select('note, commentaire, created_at, matchs_equipe(adversaire, date, domicile, score_nous, score_eux)')
      .eq('joueur_id', equipeJoueurId)
      .eq('est_note_equipe', false)
      .order('created_at', { ascending: false })
    const notes = data || []
    setMesNotes(notes)
    setMoyennePerso(notes.length ? (notes.reduce((s, n) => s + Number(n.note), 0) / notes.length).toFixed(1) : null)
  }

  useEffect(() => {
    if (onglet === 'coach' && userId) {
      localStorage.setItem(`coach_read_${userId}`, new Date().toISOString())
      setCoachUnread(0)
    }
    if (onglet === 'analyses' && userId) {
      marquerAnalysesLues(userId)
    }
    if (onglet === 'clubs' && educateursListe.length === 0 && clubsListe.length === 0 && recruteursList.length === 0) {
      setClubsLoading(true)
      Promise.all([
        supabase.from('profiles').select('id, prenom, nom, club, region, niveau_equipe, avatar_url, description').eq('plan', 'educateur'),
        supabase.from('profiles').select('id, prenom, nom, club, region, avatar_url, description, bio, verified').eq('plan', 'club'),
        supabase.from('profiles').select('id, prenom, nom, club, region, type_recruteur, avatar_url, description').eq('plan', 'scout'),
        supabase.from('club_recrutements').select('club_id, categorie, poste, niveau').eq('actif', true),
      ]).then(([{ data: edu }, { data: clu }, { data: rec }, { data: recrut }]) => {
        setEducateursListe(edu || [])
        setClubsListe(clu || [])
        setRecruteursList(rec || [])
        const parClub = {}
        ;(recrut || []).forEach(r => { if (!parClub[r.club_id]) parClub[r.club_id] = []; parClub[r.club_id].push(r) })
        setRecrutementsParClub(parClub)
        setClubsLoading(false)
      })
    }
    // Joueur affilié : charge ses stats dès l'ouverture de l'onglet, pas seulement
    // via le bouton de l'onglet "Mon Équipe" (chargerStatsJoueur est déjà idempotent).
    // Seulement s'il a une affiliation active — une affiliation archivée n'a plus de
    // stats pertinentes à recharger.
    if (onglet === 'stats') {
      const a = mesAffiliations.find(af => af.statut === 'accepte')
      if (a) chargerStatsJoueur(a.id, a.equipe_joueur_id, a.educateur_id)
    }
    if (onglet === 'accueil' || onglet === 'dashboard') {
      const a = mesAffiliations.find(af => af.statut === 'accepte')
      if (a) { chargerCalendrierEtDispos(a.educateur_id); chargerPlanningSemaine(a.educateur_id); chargerTauxPresence(a.equipe_joueur_id, a.educateur_id); chargerMesNotes(a.equipe_joueur_id) }
    }
    if (onglet === 'competition') {
      const a = mesAffiliations.find(af => af.statut === 'accepte')
      if (a) chargerCompetition(a.educateur_id)
    }
  }, [onglet, userId, mesAffiliations])

  // Rediriger vers 'accueil' si joueur affilié et onglet non reconnu
  useEffect(() => {
    const estAffilie = profil?.plan === 'fan' && mesAffiliations.length > 0
    if (estAffilie && onglet === 'dashboard') {
      setOnglet('accueil')
    }
  }, [profil, mesAffiliations])

  const getProfil = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/login'); return }
    const targetId = joueurIdOverride || user.id
    setUserId(targetId)
    await chargerNotifications(targetId)
    await chargerNotifPrefs(targetId)
    const { data } = await supabase.from('profiles').select('*').eq('id', targetId).maybeSingle()
    const { data: demandesData } = await supabase.from('demandes').select('*').eq('joueur_id', targetId).order('created_at', { ascending: false })
    // plan='coach' ne renvoie jamais rien : la contrainte CHECK de profiles.plan
    // interdit cette valeur (cf. lib/coachAdmin.js) — les comptes coach analyseur
    // sont identifiés par email. Avec le filtre par plan, cette liste était donc
    // toujours vide et le joueur ne pouvait jamais démarrer de conversation.
    const { data: coachData } = await supabase.from('profiles').select('*').in('email', COACH_ADMIN_EMAILS)
    setProfil(data)
    setStats({
      club: data?.club || '', niveau_equipe: data?.niveau_equipe || '', categorie: data?.categorie || '',
      region: data?.region || '', numero_licence: data?.numero_licence || '', pied: data?.pied || 'droit', matchs_officiel: data?.matchs_officiel || 0,
      matchs_amical: data?.matchs_amical || 0, minutes_jouees: data?.minutes_jouees || 0,
      buts_pied_droit: data?.buts_pied_droit || 0, buts_pied_gauche: data?.buts_pied_gauche || 0,
      buts_tete: data?.buts_tete || 0, buts_total: data?.buts_total || 0,
      passes_decisives: data?.passes_decisives || 0, cleansheets: data?.cleansheets || 0,
    })
    setPointsForts(data?.points_forts ? data.points_forts.split(', ').filter(Boolean) : [])
    setAAmeliorer(data?.a_ameliorer ? data.a_ameliorer.split(', ').filter(Boolean) : [])
    setStyleDeJeu(data?.style_de_jeu || '')
    const { data: parcoursData } = await supabase.from('parcours').select('*').eq('joueur_id', targetId).order('saison', { ascending: false })
    setParcours(parcoursData || [])
    const { data: certifData } = await supabase.from('certifications').select('*').eq('joueur_id', targetId).order('created_at', { ascending: false })
    setCertifications(certifData || [])
    setDemandes(demandesData || [])
    setCoaches(coachData || [])
    if (coachData && coachData.length > 0) setCoachSelectionne(coachData[0])
    const { data: reelRows, error: reelErr } = await supabase.from('reels').select('id, video_url').eq('joueur_id', targetId).order('created_at', { ascending: false }).limit(1)
    console.log('[DashboardJoueur] reelRows:', reelRows, 'error:', reelErr)
    setReelJogabonito(reelRows?.[0] || null)
    await chargerConversations(targetId)
    const mesAff = await chargerAffiliations(targetId)
    await verifierCloturesSaison(targetId, mesAff || [])
    const clubIdAffilie = await chargerInventaireJoueur(targetId, mesAff || [])
    await chargerAnnoncesJoueur(targetId, clubIdAffilie)
    await chargerConvocationActive(targetId)
    await chargerCompositionActive()
    await chargerParentsInvites(targetId)
    setLoading(false)
  }

  const chargerParentsInvites = async (uid) => {
    const { data } = await supabase.from('parents_acces').select('*').eq('joueur_id', uid)
    setParentsInvites(data || [])
  }

  // Réutilise l'edge function envoyer-invitation existante (Resend + table
  // invitations, cf. dirigeant_acces) plutôt qu'une fonction séparée basée sur
  // supabase.auth.admin.inviteUserByEmail — jamais utilisé ailleurs dans ce
  // projet, aurait fait cohabiter deux flows d'invitation et deux templates
  // d'email différents pour le même besoin.
  const inviterParent = async () => {
    if (readOnly) return
    const email = emailParentInput.trim()
    if (!email) return
    if (parentsInvites.length >= 2) { alert('Maximum 2 parents autorisés.'); return }
    if (parentsInvites.some(p => p.email_invite.toLowerCase() === email.toLowerCase())) { alert('Cet email a déjà été invité.'); return }

    setInvitantParent(true)
    const { data, error } = await supabase.functions.invoke('envoyer-invitation', {
      body: { email, role: 'parent', joueur_id: userId },
    })
    setInvitantParent(false)
    if (error || data?.error) {
      // supabase.functions.invoke() ne remonte pas le corps JSON de la réponse
      // dans error.message sur un non-2xx (juste "Edge Function returned a
      // non-2xx status code") — le vrai message (envoyer-invitation renvoie
      // bien { error: '...' } avec un texte explicite) est dans
      // error.context, la Response brute, à relire manuellement.
      let message = data?.error || error?.message
      if (error?.context?.json) {
        try { const body = await error.context.json(); if (body?.error) message = body.error } catch { /* corps non-JSON, on garde error.message */ }
      }
      alert('Erreur : ' + message)
      return
    }
    setEmailParentInput('')
    await chargerParentsInvites(userId)
  }

  const supprimerInvitationParent = async (emailInvite) => {
    if (readOnly) return
    await supabase.from('parents_acces').delete().eq('joueur_id', userId).eq('email_invite', emailInvite)
    setParentsInvites(prev => prev.filter(p => p.email_invite !== emailInvite))
  }

  // Convocation active : jointure via convocation_joueurs (le joueur ne voit,
  // par RLS, que ses lignes) → convocations (RLS limitée à publiee=true et
  // expire_at > now(), un nettoyage tardif — dimanche suivant le match, cf.
  // calculerExpirationConvocation dans DashboardEducateur.jsx — qui sert
  // surtout à purger la lecture sans tâche planifiée). Le widget joueur doit
  // disparaître plus tôt que ça : dès que la date+heure du match elle-même
  // est passée, pas seulement à l'expiration RLS de fin de semaine — d'où le
  // filtre estPasse ci-dessous, en plus (pas à la place) du filtre RLS.
  // 3 requêtes manuelles plutôt qu'un embed PostgREST imbriqué
  // convocations(*, matchs_equipe(...)) : aucune contrainte FK réelle entre
  // convocations.match_id et matchs_equipe côté base (juste une convention
  // applicative), donc PostgREST ne sait pas résoudre cet embed
  // (PGRST200 "Could not find a relationship").
  const chargerConvocationActive = async (uid) => {
    const { data: cj } = await supabase.from('convocation_joueurs').select('convocation_id').eq('joueur_id', uid)
    const convocationIds = [...new Set((cj || []).map(r => r.convocation_id).filter(Boolean))]
    if (convocationIds.length === 0) { setConvocationActive(null); return }

    const { data: convs } = await supabase.from('convocations').select('*').in('id', convocationIds)
    const matchIds = [...new Set((convs || []).map(c => c.match_id).filter(Boolean))]
    const { data: matchs } = matchIds.length > 0
      ? await supabase.from('matchs_equipe').select('id, adversaire, date, heure, lieu, domicile, competition').in('id', matchIds)
      : { data: [] }
    const matchsParId = Object.fromEntries((matchs || []).map(m => [m.id, m]))

    // Sans heure connue, on garde le match visible jusqu'à la fin de sa
    // journée plutôt que de risquer de masquer une convocation pour un match
    // pas encore joué.
    const estPasse = (m) => new Date(`${m.date}T${m.heure || '23:59'}:00`) < new Date()

    const convocations = (convs || [])
      .map(c => ({ ...c, matchs_equipe: matchsParId[c.match_id] }))
      .filter(c => c.matchs_equipe && !estPasse(c.matchs_equipe))
    convocations.sort((a, b) => (a.matchs_equipe?.date || '').localeCompare(b.matchs_equipe?.date || ''))
    const active = convocations[0] || null
    setConvocationActive(active)
    if (active) {
      const { data: rep } = await supabase.from('convocation_reponses').select('reponse').eq('convocation_id', active.id).eq('joueur_id', uid).maybeSingle()
      setRepConvoc(rep?.reponse || null)
    } else {
      setRepConvoc(null)
    }
  }

  // mes_compositions_publiees() est SECURITY DEFINER et filtre sur auth.uid()
  // en interne (pas de paramètre uid) — comme convocations, ne renvoie donc
  // rien quand ce dashboard est consulté en readOnly par un tiers (coach,
  // parent) via joueurIdOverride, faute de policy dédiée à ce cas déjà
  // existante côté convocations non plus.
  const chargerCompositionActive = async () => {
    const { data, error } = await supabase.rpc('mes_compositions_publiees')
    if (error || !data?.length) { setCompositionActive(null); return }
    const aujourdhui = new Date().toISOString().slice(0, 10)
    const aVenir = data.filter(c => c.date_match >= aujourdhui).sort((a, b) => a.date_match.localeCompare(b.date_match))
    const passees = data.filter(c => c.date_match < aujourdhui).sort((a, b) => b.date_match.localeCompare(a.date_match))
    setCompositionActive(aVenir[0] || passees[0] || null)
  }

  const repondreConvocation = async (reponse) => {
    if (readOnly || !convocationActive) return
    setRepConvoc(reponse)
    await supabase.from('convocation_reponses').upsert(
      { convocation_id: convocationActive.id, joueur_id: userId, reponse, updated_at: new Date().toISOString() },
      { onConflict: 'convocation_id, joueur_id' }
    )
  }

  const chargerNotifications = async (uid) => {
    const { data } = await supabase.from('notifications').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(30)
    setNotifications(data || [])
  }

  const chargerNotifPrefs = async (uid) => {
    const { data } = await supabase.from('notification_preferences').select('*').eq('user_id', uid).maybeSingle()
    if (data) setNotifPrefs(data)
  }

  const marquerNotifLue = async (notifId) => {
    if (readOnly) return
    await supabase.from('notifications').update({ lu: true }).eq('id', notifId)
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, lu: true } : n))
  }

  const marquerToutLu = async (uid) => {
    if (readOnly) return
    await supabase.from('notifications').update({ lu: true }).eq('user_id', uid).eq('lu', false)
    setNotifications(prev => prev.map(n => ({ ...n, lu: true })))
  }

  // Notifications de la clochette de type 'analyse' (cf. notifierJoueur dans
  // DashboardCoach.jsx, envoyerAnalyse) — jusqu'ici seul le clic sur la notif
  // elle-même dans la clochette la marquait lue ; ouvrir l'onglet Analyses
  // directement depuis la sidebar ne le faisait pas, donc le badge restait affiché.
  const marquerAnalysesLues = async (uid) => {
    if (readOnly) return
    // Pas de garde sur l'état local `notifications` avant d'écrire : si l'onglet
    // Analyses est ouvert directement (ex. lien profond) avant la fin du chargement
    // initial des notifications, une garde ici raterait la mise à jour en base.
    await supabase.from('notifications').update({ lu: true }).eq('user_id', uid).eq('type', 'analyse').eq('lu', false)
    setNotifications(prev => prev.map(n => n.type === 'analyse' ? { ...n, lu: true } : n))
  }

  const sauvegarderNotifPrefs = async (newPrefs) => {
    if (readOnly) return
    // Optimistic : préférences locales mises à jour tout de suite, sans
    // attendre la réponse Supabase. Erreur → on revient aux anciennes
    // préférences (aucune vérification d'erreur n'existait avant).
    const avant = notifPrefs
    setNotifPrefs(newPrefs)
    setSavingPrefs(true)
    const { error } = await supabase.from('notification_preferences').upsert({ user_id: userId, ...newPrefs }, { onConflict: 'user_id' })
    setSavingPrefs(false)
    if (error) {
      setNotifPrefs(avant)
      alert('Erreur lors de la sauvegarde : ' + error.message)
    }
  }

  const chargerAffiliations = async (uid) => {
    // Fetch affiliations sans join pour éviter les erreurs FK
    const { data: afData } = await supabase
      .from('affiliations')
      .select('*')
      .eq('joueur_id', uid)
      .order('date_fin', { ascending: false, nullsFirst: true })
    if (!afData || afData.length === 0) { setMesAffiliations([]); return [] }

    // Charger les profils éducateurs séparément
    const educateurIds = [...new Set(afData.map(a => a.educateur_id))]
    const { data: peData } = await supabase
      .from('profil_educateur')
      .select('user_id, prenom, nom, club, categorie, niveau_championnat, diplome, diplome_verifie, code_equipe, lien_groupe')
      .in('user_id', educateurIds)

    const peMap = {}
    peData?.forEach(pe => { peMap[pe.user_id] = pe })

    const enrichies = afData.map(a => ({ ...a, profil_educateur: peMap[a.educateur_id] || null }))
    setMesAffiliations(enrichies)
    return enrichies
  }

  // Inventaire (Équipement) du club auquel appartient l'éducateur affilié —
  // même résolution educateur_id → club_id que côté club (club_educateurs),
  // il n'y a pas de club_id direct sur affiliations/equipe_joueurs.
  const chargerInventaireJoueur = async (uid, affiliations) => {
    const a = (affiliations || []).find(af => af.statut === 'accepte')
    if (!a) { setClubIdInventaire(null); setChampsEquipement([]); setMesTailles([]); setEquipementPret(null); setEquipementCommande(null); setPackAttribue(null); return null }
    const { data: ce } = await supabase.from('club_educateurs').select('club_id').eq('educateur_id', a.educateur_id).eq('statut', 'accepte').maybeSingle()
    if (!ce?.club_id) { setClubIdInventaire(null); setChampsEquipement([]); setMesTailles([]); setEquipementPret(null); setEquipementCommande(null); setPackAttribue(null); return null }
    setClubIdInventaire(ce.club_id)
    const [{ data: attribution }, { data: tailles }, { data: commande }] = await Promise.all([
      supabase.from('equipement_attributions').select('*, pack:pack_id(*)').eq('club_id', ce.club_id).eq('user_id', uid).maybeSingle(),
      supabase.from('equipement_tailles').select('*').eq('user_id', uid),
      supabase.from('equipement_commandes').select('*').eq('destinataire_id', uid).maybeSingle(),
    ])
    // "Mon équipement" n'affiche que les champs du pack qui a été attribué à
    // ce joueur — pas tous les champs du club, qui peuvent appartenir à
    // d'autres packs (staff, autres catégories...) qui ne le concernent pas.
    const pack = attribution?.pack || null
    setPackAttribue(pack)
    if (pack?.champs_ids?.length) {
      const { data: champs } = await supabase.from('equipement_champs').select('*').in('id', pack.champs_ids).eq('actif', true).order('ordre')
      setChampsEquipement(champs || [])
    } else {
      setChampsEquipement([])
    }
    setMesTailles(tailles || [])
    setEquipementCommande(commande || null)
    setEquipementPret(commande?.statut === 'pret' ? commande : null)
    return ce.club_id
  }

  // Annonces publiées par le club de l'éducateur affilié — même résolution
  // club_id que chargerInventaireJoueur, réutilisée pour éviter une 2e requête
  // club_educateurs (le club_id retourné par chargerInventaireJoueur suffit).
  const chargerAnnoncesJoueur = async (uid, clubId) => {
    if (!clubId) { setAnnoncesClub([]); setAnnoncesLuesIds(new Set()); return }
    const { data } = await supabase.from('annonces_club').select('*').eq('club_id', clubId).in('cible', ['tous', 'joueurs']).order('created_at', { ascending: false })
    setAnnoncesClub(data || [])
    const { data: lues } = await supabase.from('annonces_lues').select('annonce_id').eq('user_id', uid)
    setAnnoncesLuesIds(new Set((lues || []).map(l => l.annonce_id)))
  }

  const marquerAnnonceLue = async (annonceId) => {
    if (annoncesLuesIds.has(annonceId)) return
    setAnnoncesLuesIds(prev => new Set(prev).add(annonceId))
    await supabase.from('annonces_lues').upsert({ annonce_id: annonceId, user_id: userId }, { onConflict: 'annonce_id,user_id' })
  }

  const sauvegarderMaTaille = async (champId, valeur) => {
    if (readOnly) return
    await supabase.from('equipement_tailles').upsert(
      { user_id: userId, club_id: clubIdInventaire, champ_id: champId, valeur, updated_at: new Date().toISOString() },
      { onConflict: 'user_id, champ_id' }
    )
    setMesTailles(prev => {
      const idx = prev.findIndex(t => t.champ_id === champId)
      if (idx === -1) return [...prev, { user_id: userId, club_id: clubIdInventaire, champ_id: champId, valeur }]
      const next = [...prev]
      next[idx] = { ...next[idx], valeur }
      return next
    })
  }

  const marquerEquipementRecupere = async () => {
    if (readOnly) return
    if (!equipementPret) return
    const maintenant = new Date().toISOString()
    // .select().single() : une simple .update() sans lecture du résultat ne
    // remonte aucune erreur si la policy RLS filtre la ligne (0 ligne affectée
    // sans exception côté Postgrest) — c'est ce qui rendait le clic
    // silencieusement inopérant tant que la policy destinataire n'existait pas.
    const { error } = await supabase.from('equipement_commandes').update({ statut: 'recupere', recupere_le: maintenant }).eq('id', equipementPret.id).select().single()
    if (error) { alert('Erreur : ' + error.message); return }
    // Historique séparé (insert-only) : equipement_commandes est upserted par
    // personne, une prochaine préparation écraserait recupere_le sans laisser
    // de trace de cette remise — cf. supabase_equipement_historique_recuperation.sql.
    await supabase.from('equipement_recuperations').insert({
      club_id: clubIdInventaire, destinataire_id: userId,
      destinataire_nom: `${profil?.prenom || ''} ${profil?.nom || ''}`.trim(),
      valide_le: maintenant,
    })
    setEquipementPret(null)
    setEquipementCommande(prev => prev ? { ...prev, statut: 'recupere', recupere_le: maintenant } : prev)
  }

  // Saisons clôturées par le coach (historique_saisons.cloturee) pour
  // lesquelles ce joueur n'a pas encore laissé de note (notes_educateur) —
  // déclenche le rappel d'évaluation au chargement du dashboard, plutôt que
  // d'afficher le bouton "Évaluer" en permanence à côté des stats.
  const verifierCloturesSaison = async (uid, affiliations) => {
    const educateurIds = [...new Set(affiliations.filter(a => a.statut === 'accepte').map(a => a.educateur_id))]
    if (educateurIds.length === 0) return
    const [{ data: histData }, { data: notesData }] = await Promise.all([
      supabase.from('historique_saisons').select('educateur_id, saison').eq('joueur_id', uid).eq('cloturee', true).in('educateur_id', educateurIds),
      supabase.from('notes_educateur').select('educateur_id, saison').eq('auteur_id', uid).in('educateur_id', educateurIds),
    ])
    const dejaNotes = new Set((notesData || []).map(n => `${n.educateur_id}_${n.saison}`))
    const enAttente = (histData || [])
      .filter(h => !dejaNotes.has(`${h.educateur_id}_${h.saison}`))
      .map(h => ({ ...h, affiliation: affiliations.find(a => a.educateur_id === h.educateur_id) }))
      .filter(x => x.affiliation)
    setCloturesAEvaluer(enAttente)
  }

  // Widget accueil : prochain entraînement + prochain match de l'éducateur, avec ma dispo déclarée
  const chargerCalendrierEtDispos = async (educateurId) => {
    if (!userId || !educateurId) return
    const aujourdHui = new Date().toISOString().split('T')[0]
    const dans30jours = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const [{ data: entrainements }, { data: matchs }] = await Promise.all([
      supabase.from('entrainements').select('id, date, description, heure, lieu, sondage_clos, cloture_sondage_avant').eq('educateur_id', educateurId).gte('date', aujourdHui).lte('date', dans30jours).order('date', { ascending: true }).limit(4),
      supabase.from('matchs_equipe').select('id, date, heure, lieu, adversaire, competition, domicile').eq('educateur_id', educateurId).gte('date', aujourdHui).lte('date', dans30jours).order('date', { ascending: true }).limit(4),
    ])

    const events = [
      ...(entrainements || []).map(e => ({ type: 'entrainement', id: e.id, titre: e.description || t('aff_entrainement_titre', lang), date: e.date, heure: e.heure, lieu: e.lieu, sondage_clos: e.sondage_clos, cloture_sondage_avant: e.cloture_sondage_avant })),
      ...(matchs || []).map(m => ({ type: 'match', id: m.id, titre: m.adversaire || t('aff_match_titre', lang), date: m.date, heure: m.heure, lieu: m.lieu })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 4)
    setWidgetCalendrier(events)

    const prochainEnt = events.find(e => e.type === 'entrainement') ? (entrainements || []).find(e => e.id === events.find(ev => ev.type === 'entrainement').id) : null
    setWidgetProchainEnt(prochainEnt)
    const prochainM = events.find(e => e.type === 'match') ? (matchs || []).find(m => m.id === events.find(ev => ev.type === 'match').id) : null
    setWidgetProchainMatch(prochainM)

    // Dispos déclarées par le joueur pour les événements affichés (jusqu'à 4)
    const entrainementIds = events.filter(e => e.type === 'entrainement').map(e => e.id)
    const matchIds = events.filter(e => e.type === 'match').map(e => e.id)
    const [{ data: disposEnt }, { data: disposMatch }] = await Promise.all([
      entrainementIds.length > 0 ? supabase.from('disponibilites').select('seance_id, statut').eq('joueur_id', userId).in('seance_id', entrainementIds) : Promise.resolve({ data: [] }),
      matchIds.length > 0 ? supabase.from('disponibilites').select('match_id, statut').eq('joueur_id', userId).in('match_id', matchIds) : Promise.resolve({ data: [] }),
    ])
    const map = {}
    disposEnt?.forEach(d => { map[d.seance_id] = d.statut })
    disposMatch?.forEach(d => { map[d.match_id] = d.statut })
    setDispoMap(map)
    setWidgetDispoEnt(prochainEnt ? map[prochainEnt.id] || null : null)
    setWidgetDispoMatch(prochainM ? map[prochainM.id] || null : null)
  }

  // Onglet Compétition — lecture seule, mêmes données que Compétition côté éducateur
  // (matchs_equipe : domicile est un booléen, le score joué se lit sur score_nous,
  // pas de table calendrier_matchs séparée pour les matchs à venir — cf. la logique
  // équivalente dans DashboardEducateur.jsx, grouperMatchsParMois/matchJoue).
  const chargerCompetition = async (eduId) => {
    if (!eduId) return
    const [{ data: matchs }, { data: pe }] = await Promise.all([
      supabase.from('matchs_equipe').select('*').eq('educateur_id', eduId).order('date', { ascending: false }),
      supabase.from('profil_educateur').select('ligue_url').eq('user_id', eduId).maybeSingle(),
    ])
    const joues = (matchs || []).filter(m => m.score_nous !== '' && m.score_nous !== null && m.score_nous !== undefined)
    const aVenir = (matchs || [])
      .filter(m => m.score_nous === '' || m.score_nous === null || m.score_nous === undefined)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
    setResultatsCompetition(joues) // pas de slice ici — navigation mois par mois dans renduCompetition
    setCalendrierCompetition(aVenir) // idem
    setLienClassementCompetition(pe?.ligue_url || null)
  }

  const repondreDisponibilite = async (eventId, eventType, statut) => {
    if (readOnly) return
    if (!eventId || !userId) return
    // Déjà optimiste (dispoMap/widgets mis à jour avant l'écriture) — il
    // manquait juste la gestion d'erreur pour revenir en arrière si l'upsert
    // échoue, maintenant que l'UI ne dépend plus du retour serveur.
    const avantDispo = dispoMap[eventId]
    const avantEnt = widgetDispoEnt
    const avantMatch = widgetDispoMatch
    setSavingDispo(true)
    setDispoMap(prev => ({ ...prev, [eventId]: statut }))
    if (eventType === 'entrainement' && widgetProchainEnt?.id === eventId) setWidgetDispoEnt(statut)
    if (eventType === 'match' && widgetProchainMatch?.id === eventId) setWidgetDispoMatch(statut)
    const payload = {
      joueur_id: userId,
      statut,
      ...(eventType === 'entrainement' ? { seance_id: eventId } : { match_id: eventId }),
    }
    const { error } = await supabase.from('disponibilites').upsert(payload, { onConflict: eventType === 'entrainement' ? 'joueur_id,seance_id' : 'joueur_id,match_id' })
    setSavingDispo(false)
    if (error) {
      setDispoMap(prev => ({ ...prev, [eventId]: avantDispo }))
      if (eventType === 'entrainement' && widgetProchainEnt?.id === eventId) setWidgetDispoEnt(avantEnt)
      if (eventType === 'match' && widgetProchainMatch?.id === eventId) setWidgetDispoMatch(avantMatch)
      alert('Erreur lors de l\'envoi de ta disponibilité : ' + error.message)
    }
  }

  const [statsJoueur, setStatsJoueur] = useState({}) // key: affiliation.id → { presences, matchs }
  const [statsLoading, setStatsLoading] = useState({})

  const chargerStatsJoueur = async (affiliationId, equipeJoueurId, educateurId) => {
    if (!equipeJoueurId || statsJoueur[affiliationId]) return
    setStatsLoading(prev => ({ ...prev, [affiliationId]: true }))

    console.log('[stats] equipeJoueurId:', equipeJoueurId, '| educateurId:', educateurId)

    // 1. Mes présences (sans join)
    const { data: presencesMoi, error: errP } = await supabase
      .from('presences_entrainement')
      .select('statut, point_seance, entrainement_id')
      .eq('joueur_id', equipeJoueurId)
    console.log('[stats] presencesMoi:', presencesMoi, errP)

    // 2. Dates des entraînements pour le mensuel
    const entrainementIds = presencesMoi?.map(p => p.entrainement_id).filter(Boolean) || []
    const { data: entDates } = entrainementIds.length
      ? await supabase.from('entrainements').select('id, date').in('id', entrainementIds)
      : { data: [] }
    const dateMap = {}
    entDates?.forEach(e => { dateMap[e.id] = e.date })

    // 3. Tous les entraînements de l'éducateur pour classements présence
    const { data: tousEntrainements } = await supabase
      .from('entrainements').select('id').eq('educateur_id', educateurId)
    const tousEntIds = tousEntrainements?.map(e => e.id) || []
    const { data: toutesPresences } = tousEntIds.length
      ? await supabase.from('presences_entrainement').select('joueur_id, statut, point_seance').in('entrainement_id', tousEntIds)
      : { data: [] }

    // 4. Stats match
    const [
      { data: matchsMoi },
      { data: tousMatchs },
      { data: noteEdu },
      { data: profilEdu },
      { data: prochainMatchs },
      { data: effectif },
      { data: matchsEquipe },
      { data: notationsMoi },
    ] = await Promise.all([
      supabase.from('stats_match').select('buts, passes_dec, minutes, clean_sheet, carton_jaune, carton_rouge, victoire').eq('joueur_id', equipeJoueurId),
      supabase.from('stats_match').select('joueur_id, buts, passes_dec, minutes, clean_sheet, match_id').eq('educateur_id', educateurId),
      supabase.from('notes_joueurs').select('technique, physique, mental, tactique, commentaire').eq('joueur_id', equipeJoueurId).eq('visible_joueur', true).maybeSingle(),
      supabase.from('profil_educateur').select('ligue_url').eq('user_id', educateurId).single(),
      supabase.from('calendrier_matchs').select('date, heure, equipe_domicile, equipe_exterieur, competition, lieu').eq('educateur_id', educateurId).gte('date', new Date().toISOString().split('T')[0]).order('date', { ascending: true }).limit(5),
      supabase.from('equipe_joueurs').select('id, prenom, nom').eq('educateur_id', educateurId),
      supabase.from('matchs_equipe').select('id, date, adversaire, domicile, competition, score_nous, score_eux, buts_detail').eq('educateur_id', educateurId),
      supabase.from('notations_match').select('note, commentaire, criteres, created_at, matchs_equipe(adversaire, date, domicile, competition, score_nous, score_eux)').eq('joueur_id', equipeJoueurId).eq('est_note_equipe', false).order('created_at', { ascending: false }),
    ])

    // --- Stats personnelles ---
    const total = presencesMoi?.length || 0
    const present = presencesMoi?.filter(p => estPresent(p.statut)).length || 0
    const points = presencesMoi?.filter(p => p.point_seance).length || 0
    const buts = matchsMoi?.reduce((s, m) => s + (m.buts || 0), 0) || 0
    const passes = matchsMoi?.reduce((s, m) => s + (m.passes_dec || 0), 0) || 0
    const matchsJoues = matchsMoi?.filter(m => (m.minutes || 0) > 0).length || 0
    const cleanSheets = matchsMoi?.filter(m => m.clean_sheet).length || 0
    const jaunes = matchsMoi?.filter(m => m.carton_jaune).length || 0
    const rouges = matchsMoi?.filter(m => m.carton_rouge).length || 0
    const minutesJouees = matchsMoi?.reduce((s, m) => s + (m.minutes || 0), 0) || 0

    // --- Présence par mois ---
    const byMonth = {}
    presencesMoi?.forEach(p => {
      const date = dateMap[p.entrainement_id]
      if (!date) return
      const month = date.slice(0, 7)
      if (!byMonth[month]) byMonth[month] = { present: 0, total: 0 }
      byMonth[month].total++
      if (estPresent(p.statut)) byMonth[month].present++
    })
    const presenceMensuelle = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({
      month, taux: v.total ? Math.round((v.present / v.total) * 100) : 0, present: v.present, total: v.total
    }))

    // --- Classements équipe ---
    const calcRank = (playerVal, allData, keyFn, idKey = 'joueur_id', higher = true) => {
      const vals = {}
      allData?.forEach(r => {
        const id = r[idKey]
        if (!vals[id]) vals[id] = 0
        vals[id] += keyFn(r)
      })
      const sorted = Object.values(vals).sort((a, b) => higher ? b - a : a - b)
      const myVal = vals[equipeJoueurId] || 0
      return { rank: sorted.findIndex(v => v <= myVal) + 1, total: Object.keys(vals).length }
    }

    const rankButs = calcRank(buts, tousMatchs, r => r.buts || 0, 'joueur_id')
    const rankPasses = calcRank(passes, tousMatchs, r => r.passes_dec || 0, 'joueur_id')
    const rankMatchs = calcRank(matchsJoues, tousMatchs, r => (r.minutes || 0) > 0 ? 1 : 0, 'joueur_id')
    const rankClean = calcRank(cleanSheets, tousMatchs, r => r.clean_sheet ? 1 : 0, 'joueur_id')
    const rankPoints = calcRank(points, toutesPresences, r => r.point_seance ? 1 : 0, 'joueur_id')

    // --- Leaderboards internes ---
    const buildLeader = (allData, keyFn, idKey = 'joueur_id') => {
      const map = {}
      allData?.forEach(r => {
        if (!map[r[idKey]]) map[r[idKey]] = 0
        map[r[idKey]] += keyFn(r)
      })
      return Object.entries(map)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([id, val]) => {
          const j = effectif?.find(e => e.id === id)
          return { nom: j ? `${j.prenom} ${j.nom}` : '?', val, isMe: id === equipeJoueurId }
        })
    }
    // Map match_id → victoire (score_nous > score_eux)
    const victoireMap = {}
    matchsEquipe?.forEach(m => { victoireMap[m.id] = parseInt(m.score_nous) > parseInt(m.score_eux) })

    const leaderButs = buildLeader(tousMatchs, r => r.buts || 0)
    const leaderPasses = buildLeader(tousMatchs, r => r.passes_dec || 0)
    const leaderVictoires = buildLeader(tousMatchs, r => (r.match_id && victoireMap[r.match_id]) ? 1 : 0)
    const leaderPoints = buildLeader(toutesPresences, r => r.point_seance ? 1 : 0)

    // --- Évaluations coach par match (notations_match) — regroupées par saison
    // (juillet-juin) à partir de la date du match, pas d'archivage séparé : les
    // lignes restent en base indéfiniment, seule la lecture est bucketée.
    const saisonActuelle = saisonDeDate(new Date().toISOString())
    const notationsAvecDate = (notationsMoi || []).filter(n => n.matchs_equipe?.date)
    const evals = notationsAvecDate.filter(n => saisonDeDate(n.matchs_equipe.date) === saisonActuelle)
    const evalsParSaison = {}
    notationsAvecDate.forEach(n => {
      const s = saisonDeDate(n.matchs_equipe.date)
      if (s === saisonActuelle) return
      if (!evalsParSaison[s]) evalsParSaison[s] = []
      evalsParSaison[s].push(n)
    })

    setStatsJoueur(prev => ({
      ...prev,
      [affiliationId]: {
        total, present, points, tauxPresence: total ? Math.round((present / total) * 100) : null,
        buts, passes, matchsJoues, cleanSheets, jaunes, rouges, minutesJouees,
        presenceMensuelle,
        rankButs, rankPasses, rankMatchs, rankClean, rankPoints,
        noteEdu: noteEdu || null,
        ligueUrl: profilEdu?.ligue_url || null,
        prochainMatchs: prochainMatchs || [],
        leaderButs, leaderPasses, leaderVictoires, leaderPoints,
        matchsEquipe: matchsEquipe || [],
        evals, evalsParSaison, saisonActuelle,
      }
    }))
    setStatsLoading(prev => ({ ...prev, [affiliationId]: false }))
  }

  const rejoindreEquipe = async () => {
    if (readOnly) return
    if (!codeEquipe.trim()) return
    setSendingCode(true)
    setCodeError(null)
    setCodeSuccess(false)
    // Chercher l'éducateur par code
    const { data: pe } = await supabase
      .from('profil_educateur')
      .select('user_id, prenom, nom')
      .ilike('code_equipe', codeEquipe.trim())
      .single()
    if (!pe) { setCodeError('Code invalide — vérifie auprès de ton éducateur.'); setSendingCode(false); return }
    // Vérifier si déjà affilié
    const { data: exist } = await supabase.from('affiliations').select('id, statut').eq('educateur_id', pe.user_id).eq('joueur_id', userId).single()
    if (exist) {
      if (exist.statut === 'accepte') { setCodeError('Tu es déjà affilié à cet éducateur.') }
      else if (exist.statut === 'en_attente') { setCodeError('Ta demande est déjà en attente de validation.') }
      else { setCodeError('Ta demande a été refusée. Contacte ton éducateur.') }
      setSendingCode(false); return
    }
    await supabase.from('affiliations').insert({ educateur_id: pe.user_id, joueur_id: userId, statut: 'en_attente' })
    setCodeSuccess(true)
    setCodeEquipe('')
    await chargerAffiliations(userId)
    setSendingCode(false)
  }

  const soumettreNoteEdu = async () => {
    if (readOnly) return
    if (!eduNote) return
    const allKeys = CRITERES_EDU_KEYS.flatMap(c => c.criteres.map(cr => cr.key))
    const allFilled = allKeys.every(k => noteCriteres[k])
    if (!allFilled) return
    const moyGlobale = allKeys.reduce((s, k) => s + (noteCriteres[k] || 0), 0) / allKeys.length
    // Optimistic : la modale se ferme et la confirmation s'affiche tout de
    // suite, sans attendre la réponse Supabase. Erreur → réouverte.
    const eduNoteSnapshot = eduNote
    const saisonSnapshot = noteSaison
    setSavingNoteEdu(true)
    setNoteSaved(true)
    setEduNote(null)
    setCloturesAEvaluer(prev => prev.filter(h => !(h.educateur_id === eduNoteSnapshot.educateur_id && h.saison === saisonSnapshot)))
    setTimeout(() => setNoteSaved(false), 3000)
    const { error } = await supabase.from('notes_educateur').upsert({
      educateur_id: eduNoteSnapshot.educateur_id,
      auteur_id: userId,
      auteur_type: 'joueur',
      saison: noteSaison,
      note: Math.round(moyGlobale * 10) / 10,
      criteres: noteCriteres,
      commentaire: noteCommentaire,
      visible_public: notePublic,
    }, { onConflict: 'educateur_id,auteur_id,saison' })
    setSavingNoteEdu(false)
    if (error) {
      setNoteSaved(false)
      setEduNote(eduNoteSnapshot)
      alert('Erreur lors de l\'envoi de la note : ' + error.message)
    }
  }

  const chargerConversations = async (uid) => {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(prenom, nom, plan, email), receiver:profiles!messages_receiver_id_fkey(prenom, nom, plan, email)')
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
      .order('created_at', { ascending: false })
    if (!data) return
    setMessages(data)
    const map = {}
    data.forEach(msg => {
      const otherId = msg.sender_id === uid ? msg.receiver_id : msg.sender_id
      const other = msg.sender_id === uid ? msg.receiver : msg.sender
      if (!map[otherId]) map[otherId] = { otherId, other, msgs: [] }
      map[otherId].msgs.push(msg)
    })
    const allConvs = Object.values(map)
    // Les comptes coach analyseur ne sont PAS identifiables via profiles.plan : la
    // contrainte CHECK en base interdit la valeur 'coach' (cf. lib/coachAdmin.js),
    // donc other?.plan === 'coach' n'est jamais vrai et leurs messages tombaient
    // par défaut dans "Recruteurs". Seul l'email (liste blanche) les identifie de
    // façon fiable — même source que App.jsx pour le routing post-connexion.
    const isCoachAnalyseur = (email) => COACH_ADMIN_EMAILS.includes(email)
    setConversations(allConvs.filter(c => !isCoachAnalyseur(c.other?.email)))
    setConvCoach(allConvs.filter(c => isCoachAnalyseur(c.other?.email)))
    // Compter messages coach non lus (reçus après la dernière visite de l'onglet)
    const lastRead = localStorage.getItem(`coach_read_${uid}`) || '1970-01-01'
    const nonLus = data.filter(msg =>
      isCoachAnalyseur(msg.sender?.email) &&
      msg.receiver_id === uid &&
      new Date(msg.created_at) > new Date(lastRead)
    )
    setCoachUnread(nonLus.length)
  }

  const envoyerMessage = async () => {
    if (readOnly) return
    if (!newMessage.trim() || !messageActif || !userId) return
    await supabase.from('messages').insert({ sender_id: userId, receiver_id: messageActif.otherId, content: newMessage.trim(), created_at: new Date().toISOString() })
    await notifierJoueur({ type: 'message', userId: messageActif.otherId, titre: 'Nouveau message', contenu: { auteur: profil?.prenom, texte: newMessage.trim() }, lien: '/dashboard' })
    setNewMessage('')
    await chargerConversations(userId)
  }

  const envoyerMessageCoach = async () => {
    if (readOnly) return
    if (!messageCoach.trim() || !coachSelectionne || !userId) return
    setSendingCoach(true)
    await supabase.from('messages').insert({ sender_id: userId, receiver_id: coachSelectionne.id, content: messageCoach.trim(), created_at: new Date().toISOString() })
    setSendingCoach(false)
    setCoachSent(true)
    setMessageCoach('')
    await chargerConversations(userId)
    setTimeout(() => setCoachSent(false), 3000)
  }

  const handleLogout = async () => { await signOutSafe(); navigate('/') }

  const handleCertifDocUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length || !userId) return
    setUploadingCertif(true)
    const uploaded = []
    for (const file of files) {
      try {
        const sigRes = await fetch('/api/upload-image', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
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
          uploaded.push(uploadData.secure_url)
        } else {
          console.error('Cloudinary upload failed:', uploadData)
        }
      } catch (err) { console.error('Upload certif error:', err) }
    }
    setCertifDocs(prev => [...prev, ...uploaded])
    setUploadingCertif(false)
  }

  const soumettreDemandesCertification = async () => {
    if (readOnly) return
    if (!nouvelleCertif.niveau || !nouvelleCertif.saison || certifDocs.length < 5 || !userId) return
    setSubmittingCertif(true)
    const { error } = await supabase.from('certifications').insert({
      joueur_id: userId,
      niveau: nouvelleCertif.niveau,
      saison: nouvelleCertif.saison,
      documents: certifDocs,
      statut: 'en_attente',
    })
    if (!error) {
      const { data } = await supabase.from('certifications').select('*').eq('joueur_id', userId).order('created_at', { ascending: false })
      setCertifications(data || [])
      setNouvelleCertif({ niveau: '', saison: '' })
      setCertifDocs([])
      setCertifSent(true)
      setTimeout(() => setCertifSent(false), 4000)
    }
    setSubmittingCertif(false)
  }

  const handleFifaCardSave = async (blob) => {
    if (readOnly) return
    if (!userId) return
    try {
      const file = new File([blob], 'carte-fifa.png', { type: 'image/png' })
      const sigRes = await fetch('/api/upload-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      const { signature, timestamp, folder, public_id, cloud_name, api_key } = await sigRes.json()
      const formData = new FormData()
      formData.append('file', file)
      formData.append('signature', signature)
      formData.append('timestamp', timestamp)
      formData.append('folder', folder)
      formData.append('public_id', public_id + '_carte_fifa')
      formData.append('api_key', api_key)
      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, { method: 'POST', body: formData })
      const uploadData = await uploadRes.json()
      if (uploadData.secure_url) {
        await supabase.from('profiles').update({ carte_fifa_url: uploadData.secure_url }).eq('id', userId)
        setProfil(prev => ({ ...prev, carte_fifa_url: uploadData.secure_url }))
      }
    } catch (err) {
      console.error('Carte FIFA upload error:', err)
    }
  }

  const handleAvatarUpload = async (e) => {
    if (readOnly) return
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setAvatarUploading(true)
    try {
      const sigRes = await fetch('/api/upload-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
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
        setProfil(prev => ({ ...prev, avatar_url: uploadData.secure_url }))
      }
    } catch (err) {
      console.error('Avatar upload error:', err)
    }
    setAvatarUploading(false)
  }

  const handleSaveStats = async () => {
    if (readOnly) return
    const { data: { user } } = await supabase.auth.getUser()
    // Optimistic : confirmation affichée tout de suite (une fois l'utilisateur
    // résolu, nécessaire pour l'écriture) sans attendre la réponse Supabase.
    setSavingStats(true)
    setStatsSaved(true)
    setTimeout(() => setStatsSaved(false), 3000)
    const { error } = await supabase.from('profiles').update({ ...stats, points_forts: pointsForts.join(', '), a_ameliorer: aAmeliorer.join(', '), style_de_jeu: styleDeJeu }).eq('id', user.id)
    setSavingStats(false)
    if (error) {
      setStatsSaved(false)
      alert('Erreur lors de la sauvegarde : ' + error.message)
    }
  }

  const caracteristiquesParPoste = {
    Gardien: ['Jeu au pied', 'Sortie aérienne', 'Sur sa ligne', 'Penalties', 'Leadership', '1 contre 1', 'Lecture du jeu', 'Anticipation', 'Relance longue', 'Commandement défensif', 'Détente', 'Sang-froid'],
    Defenseur: ['Impact physique / Duel', 'Jeu aérien', 'Anticipation / Lecture du jeu', 'Relance longue', 'Relance courte', 'Vitesse', 'Gestion infériorité numérique', 'Leadership', 'Centre', '1 contre 1', 'Pressing', 'Marquage', 'Placement', 'Récupération de balle', 'Jeu propre', 'Combativité'],
    Milieu: ['Vision du jeu', 'Pressing', 'Passes longues', 'Box-to-box', 'Dribble', 'Récupération', 'Créativité', 'Endurance', 'Pointe basse', "Déséquilibre l'adversaire", 'Vitesse', 'Impact physique / Duel', 'Technique', 'CPA', 'Corner', 'Frappe de loin', 'Finition', 'Centre', 'Passes courtes', 'Transition rapide', 'Jeu entre les lignes', 'Leadership'],
    Attaquant: ['Finition', 'Vitesse', 'Dribble', 'Jeu dos au but', 'Jeu aérien', 'Appels de balle', 'Technique', 'Pressing', 'CPA', 'Corner', 'Renard des surfaces', 'Profondeur', 'Duel 1 contre 1', 'Frappe de loin', 'Décalage', 'Combinaison', 'Mouvement sans ballon', 'Leadership offensif'],
  }

  const toggleCaracteristique = (liste, setListe, valeur) => {
    if (liste.includes(valeur)) {
      setListe(liste.filter(v => v !== valeur))
    } else if (liste.length < 4) {
      setListe([...liste, valeur])
    }
  }

  const getClubInitials = (name) => {
    const words = name.trim().split(/\s+/).filter(w => !['AS', 'FC', 'OC', 'US', 'SC', 'AC', 'RC', 'ES', 'OGC', 'SM', 'EA', 'En'].includes(w))
    if (words.length === 0) return name.slice(0, 2).toUpperCase()
    return words.length >= 2 ? (words[0][0] + words[1][0]).toUpperCase() : words[0].slice(0, 2).toUpperCase()
  }

  const getClubColor = (name) => {
    const clubColors = ['#3b82f6', '#8b5cf6', '#f59e0b', colors.accent.red, '#10b981', colors.accent.orange, '#06b6d4', '#ec4899']
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return clubColors[Math.abs(hash) % clubColors.length]
  }

  const searchClubDebounceRef = useRef(null)

  const searchClubs = useCallback((query) => {
    if (searchClubDebounceRef.current) clearTimeout(searchClubDebounceRef.current)
    if (!query || query.length < 2) { setClubSuggestions([]); setShowSuggestions(false); return }
    searchClubDebounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true)
      try {
        const res = await fetch(`https://www.thesportsdb.com/api/v1/json/1/searchteams.php?t=${encodeURIComponent(query)}`)
        const json = await res.json()
        const teams = (json.teams || []).filter(t => t.strSport === 'Soccer' && t.strTeamBadge)
        setClubSuggestions(teams.slice(0, 6))
        setShowSuggestions(teams.length > 0)
      } catch {
        setClubSuggestions([])
        setShowSuggestions(false)
      } finally {
        setLoadingSuggestions(false)
      }
    }, 350)
  }, [])

  const selectClubSuggestion = (team) => {
    setNouveauClub(prev => ({ ...prev, club: team.strTeam, logo_url: team.strTeamBadge || '' }))
    setClubSuggestions([])
    setShowSuggestions(false)
  }

  const ajouterClub = async () => {
    if (readOnly) return
    if (!nouveauClub.club.trim() || !userId) return
    setSavingParcours(true)
    if (editingParcoursId) {
      const { error } = await supabase.from('parcours').update({ ...nouveauClub }).eq('id', editingParcoursId)
      if (error) { alert('Erreur modification : ' + error.message); setSavingParcours(false); return }
      setEditingParcoursId(null)
    } else {
      const { error: insertError } = await supabase.from('parcours').insert({ ...nouveauClub, joueur_id: userId })
      if (insertError) { alert('Erreur ajout parcours : ' + insertError.message); setSavingParcours(false); return }
    }
    // Optimistic à partir d'ici : l'écriture elle-même est déjà confirmée
    // (erreur gérée ci-dessus), donc le formulaire se réinitialise tout de
    // suite sans attendre le rechargement complet de la liste qui suit.
    setNouveauClub({ club: '', saison: '', categorie: '', poste: '', logo_url: '', niveau_championnat: '', matchs_joues: '', buts: '', passes_decisives: '', cleansheets: '' })
    setClubSuggestions([])
    setShowSuggestions(false)
    setSavingParcours(false)
    const { data, error: fetchError } = await supabase.from('parcours').select('*').eq('joueur_id', userId).order('saison', { ascending: false })
    if (fetchError) console.error('Erreur chargement parcours :', fetchError.message)
    setParcours(data || [])
  }

  const modifierClub = (p) => {
    setEditingParcoursId(p.id)
    setNouveauClub({ club: p.club || '', saison: p.saison || '', categorie: p.categorie || '', poste: p.poste || '', logo_url: p.logo_url || '', niveau_championnat: p.niveau_championnat || '', matchs_joues: p.matchs_joues || '', buts: p.buts || '', passes_decisives: p.passes_decisives || '', cleansheets: p.cleansheets || '' })
    setClubSuggestions([])
    setShowSuggestions(false)
    setTimeout(() => document.getElementById('parcours-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const supprimerClub = async (id) => {
    if (readOnly) return
    if (!window.confirm('Supprimer cette entrée du parcours ?')) return
    const { error } = await supabase.from('parcours').delete().eq('id', id)
    if (error) { alert('Erreur suppression : ' + error.message); return }
    if (editingParcoursId === id) { setEditingParcoursId(null); setNouveauClub({ club: '', saison: '', categorie: '', poste: '', logo_url: '', niveau_championnat: '', matchs_joues: '', buts: '', passes_decisives: '', cleansheets: '' }) }
    setParcours(prev => prev.filter(p => p.id !== id))
  }

  const handleDeleteVideo = async () => {
    if (readOnly) return
    if (!window.confirm('Supprimer ta vidéo ? Elle sera retirée du feed et de Jogabonito.')) return
    setDeletingVideo(true)
    const { error: errProfile } = await supabase.from('profiles').update({ clip_url: null }).eq('id', userId)
    const { error: errReel } = await supabase.from('reels').delete().eq('joueur_id', userId)
    setDeletingVideo(false)
    if (errProfile) { alert('Erreur suppression profil : ' + errProfile.message); return }
    if (errReel) { alert('Erreur suppression reel : ' + errReel.message); return }
    setProfil(prev => ({ ...prev, clip_url: null }))
  }

  const handleDeleteReel = async () => {
    if (readOnly) return
    if (!window.confirm('Supprimer ta vidéo Jogabonito ? Elle ne sera plus visible dans le feed.')) return
    setDeletingReel(true)
    const { error: errReel } = await supabase.from('reels').delete().eq('joueur_id', userId)
    const { error: errProfile } = await supabase.from('profiles').update({ clip_url: null }).eq('id', userId)
    setDeletingReel(false)
    if (errReel) { alert('Erreur suppression reel : ' + errReel.message); return }
    if (errProfile) { alert('Erreur suppression profil : ' + errProfile.message); return }
    setReelJogabonito(null)
    setProfil(prev => ({ ...prev, clip_url: null }))
  }

  const chargerFanFavoris = async () => {
    if (!userId) return
    setLoadingFanFavoris(true)
    const { data: favData } = await supabase.from('video_favoris').select('joueur_id').eq('user_id', userId)
    const joueurIds = favData?.map(f => f.joueur_id) || []
    if (joueurIds.length > 0) {
      const { data: reelsData } = await supabase
        .from('reels')
        .select('*, profiles(prenom, nom, poste, categorie, club, avatar_url)')
        .in('joueur_id', joueurIds)
        .order('created_at', { ascending: false })
      setFanFavoris(reelsData || [])
    } else {
      setFanFavoris([])
    }
    setLoadingFanFavoris(false)
  }

  const handleCancelSubscription = async () => {
    if (!window.confirm('Résilier ton abonnement ? Tu garderas l\'accès jusqu\'à la fin de la période en cours, puis ton compte passera en Starter.')) return
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

  const inputStyle = {
    width: '100%', background: colors.background.surfaceAlt, border: `1px solid ${colors.border.default}`, borderRadius: '10px',
    padding: '11px 14px', color: colors.text.primary, fontSize: '14px', boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif', outline: 'none',
  }
  const labelStyle = {
    fontSize: '11px', color: colors.text.faint, display: 'block', marginBottom: '7px',
    fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase',
  }
  const msgBubble = (mine) => ({
    maxWidth: '70%', padding: '10px 14px',
    borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
    background: mine ? colors.accent.green : colors.background.raised, color: mine ? colors.black : colors.text.primary,
    fontSize: '14px', alignSelf: mine ? 'flex-end' : 'flex-start', marginBottom: '8px',
  })

  if (loading) return <Loader />

  // ── BANNI ──
  if (profil?.banni) {
    return (
      <div style={{ minHeight: '100vh', background: colors.background.base, color: colors.text.primary, fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '440px', width: '100%', background: colors.background.surface, border: '1px solid #ef444430', borderRadius: '20px', padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '2rem', letterSpacing: '-0.5px' }}>Digital<span style={{ color: colors.accent.green }}>Football</span></div>
          <div style={{ color: colors.accent.red, display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: colors.accent.red, marginBottom: '0.75rem' }}>Compte suspendu</h1>
          <p style={{ fontSize: '14px', color: colors.text.faint, marginBottom: '1rem', lineHeight: 1.6 }}>
            Ton compte a été suspendu pour violation des CGU et du règlement de la plateforme.
          </p>
          {profil?.banni_motif && (
            <div style={{ background: colors.background.raised, border: '1px solid #ef444420', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '13px', color: colors.text.muted, margin: 0 }}>
                <strong style={{ color: colors.accent.red }}>Motif :</strong> {profil.banni_motif}
              </p>
            </div>
          )}
          <p style={{ fontSize: '12px', color: colors.text.disabled, marginBottom: '1.5rem' }}>
            Conformément aux CGU acceptées lors de ton inscription, aucun remboursement ne sera effectué.
          </p>
          <span onClick={handleLogout} style={{ color: colors.text.faint, fontSize: '13px', cursor: 'pointer' }}>Déconnexion</span>
        </div>
      </div>
    )
  }

  // Onglet Compétition — lecture seule (résultats/calendrier/classement de l'équipe
  // de l'éducateur affilié), partagé entre les deux mises en page du dashboard
  // (plan fan affilié vs dashboard principal) pour ne pas dupliquer le rendu.
  const renduCompetition = () => {
    const hasAffiliation = mesAffiliations.some(a => a.statut === 'accepte')
    if (!hasAffiliation) {
      return (
        <div style={{ padding: '24px 20px' }}>
          <h2 style={{ color: colors.text.primary, fontWeight: 800, marginBottom: '12px' }}>🏆 {t('jnav_competition', lang)}</h2>
          <p style={{ color: colors.text.dim, fontSize: '13px' }}>Rejoins une équipe (onglet "{t('jnav_equipe', lang)}") pour voir ses résultats, son calendrier et son classement.</p>
        </div>
      )
    }
    return (
      <div style={{ padding: '24px 20px' }}>
        <h2 style={{ color: colors.text.primary, fontWeight: 800, marginBottom: '24px' }}>🏆 {t('jnav_competition', lang)}</h2>

        {lienClassementCompetition && (
          <div style={{ background: colors.background.surface, borderRadius: '12px', padding: '16px', marginBottom: '20px', border: `1px solid ${colors.border.subtle}` }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: colors.accent.green, marginBottom: '10px' }}>🔗 Classement officiel</div>
            <a href={lienClassementCompetition} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: colors.accent.green, color: colors.background.base, padding: '10px 20px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', textDecoration: 'none' }}>
              🏆 Voir le classement ↗
            </a>
          </div>
        )}

        {(() => {
          const moisMatchs = calendrierCompetition.filter(m => {
            const d = new Date(m.date + 'T12:00:00')
            return d.getFullYear() === moisCalendrierCompetition.getFullYear() && d.getMonth() === moisCalendrierCompetition.getMonth()
          })
          const changerMois = (delta) => setMoisCalendrierCompetition(prev => {
            const d = new Date(prev); d.setMonth(d.getMonth() + delta); return d
          })
          return (
            <div style={{ background: colors.background.surface, borderRadius: '12px', padding: '16px', marginBottom: '20px', border: `1px solid ${colors.border.subtle}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: colors.text.primary }}>📅 Prochains matchs</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button onClick={() => changerMois(-1)} aria-label="Mois précédent"
                    style={{ background: 'transparent', border: `1px solid ${colors.border.subtle}`, color: colors.text.faint, width: '26px', height: '26px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', lineHeight: 1 }}>‹</button>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: colors.text.secondary, minWidth: '90px', textAlign: 'center', textTransform: 'capitalize' }}>
                    {moisCalendrierCompetition.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                  </span>
                  <button onClick={() => changerMois(1)} aria-label="Mois suivant"
                    style={{ background: 'transparent', border: `1px solid ${colors.border.subtle}`, color: colors.text.faint, width: '26px', height: '26px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', lineHeight: 1 }}>›</button>
                </div>
              </div>
              {moisMatchs.length === 0 ? (
                <EmptyState compact title="Aucun match ce mois-ci" />
              ) : moisMatchs.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${colors.border.subtle}` }}>
                  <div>
                    <div style={{ fontWeight: 600, color: colors.text.primary, fontSize: '14px' }}>{m.domicile ? 'vs ' : '@ '}{m.adversaire}</div>
                    <div style={{ fontSize: '12px', color: colors.text.dim, marginTop: '2px' }}>
                      {new Date(m.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {m.heure ? ` · ${m.heure}` : ''}
                      {m.competition ? ` · ${m.competition}` : ''}
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '8px', background: m.domicile ? 'rgba(74,222,128,0.1)' : 'rgba(96,165,250,0.15)', color: m.domicile ? colors.accent.green : colors.accent.blue }}>
                    {m.domicile ? 'Domicile' : 'Extérieur'}
                  </span>
                </div>
              ))}
            </div>
          )
        })()}

        {(() => {
          const moisEffectif = moisResultatsCompetition || (() => {
            const base = resultatsCompetition[0] ? new Date(resultatsCompetition[0].date + 'T12:00:00') : new Date()
            base.setDate(1); base.setHours(0, 0, 0, 0)
            return base
          })()
          const moisResultats = resultatsCompetition.filter(r => {
            const d = new Date(r.date + 'T12:00:00')
            return d.getFullYear() === moisEffectif.getFullYear() && d.getMonth() === moisEffectif.getMonth()
          })
          const changerMois = (delta) => setMoisResultatsCompetition(() => {
            const d = new Date(moisEffectif); d.setMonth(d.getMonth() + delta); return d
          })
          return (
            <div style={{ background: colors.background.surface, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border.subtle}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: colors.text.primary }}>⚽ Derniers résultats</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button onClick={() => changerMois(-1)} aria-label="Mois précédent"
                    style={{ background: 'transparent', border: `1px solid ${colors.border.subtle}`, color: colors.text.faint, width: '26px', height: '26px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', lineHeight: 1 }}>‹</button>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: colors.text.secondary, minWidth: '90px', textAlign: 'center', textTransform: 'capitalize' }}>
                    {moisEffectif.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                  </span>
                  <button onClick={() => changerMois(1)} aria-label="Mois suivant"
                    style={{ background: 'transparent', border: `1px solid ${colors.border.subtle}`, color: colors.text.faint, width: '26px', height: '26px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', lineHeight: 1 }}>›</button>
                </div>
              </div>
              {moisResultats.length === 0 ? (
                <EmptyState compact title="Aucun résultat ce mois-ci" />
              ) : moisResultats.map(r => {
                const scoreNous = Number(r.score_nous)
                const scoreEux = Number(r.score_eux)
                const victoire = scoreNous > scoreEux
                const nul = scoreNous === scoreEux
                return (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${colors.border.subtle}` }}>
                    <div>
                      <div style={{ fontWeight: 600, color: colors.text.primary, fontSize: '14px' }}>{r.domicile ? 'vs ' : '@ '}{r.adversaire}</div>
                      <div style={{ fontSize: '12px', color: colors.text.dim, marginTop: '2px' }}>{new Date(r.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: colors.text.primary }}>{r.score_nous} - {r.score_eux}</span>
                      <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: victoire ? 'rgba(74,222,128,0.15)' : nul ? 'rgba(250,204,21,0.15)' : 'rgba(239,68,68,0.15)', color: victoire ? colors.accent.green : nul ? '#facc15' : colors.accent.red }}>
                        {victoire ? 'V' : nul ? 'N' : 'D'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>
    )
  }

  // ── JOUEUR AFFILIÉ (plan fan + éducateur lié) ──
  // Note : basé sur "a une affiliation" (active OU archivée), pas seulement active.
  // Un joueur dont la saison vient d'être clôturée (toutes ses affiliations archivées)
  // doit quand même voir son historique et pouvoir rejoindre une nouvelle équipe depuis
  // cet écran — si on exigeait une affiliation active ici, il retomberait sur le dashboard
  // "fan" classique et cet historique/CTA (plus bas) ne serait jamais atteignable.
  const estAffilie = profil?.plan === 'fan' && mesAffiliations.length > 0

  const notifEquipementPret = notifications.find(n => n.type === 'equipement_pret' && !n.lu)
  const popupEquipementPret = notifEquipementPret && (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.faint}`, borderRadius: '16px', padding: '28px', maxWidth: '380px', width: '100%', textAlign: 'center' }}>
        <p style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 800 }}>{notifEquipementPret.titre}</p>
        {notifEquipementPret.contenu && (
          <p style={{ margin: '0 0 20px', fontSize: '13px', color: colors.text.faint, lineHeight: 1.5 }}>{notifEquipementPret.contenu}</p>
        )}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => marquerNotifLue(notifEquipementPret.id)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `1px solid ${colors.border.default}`, background: 'transparent', color: colors.text.faint, fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Fermer</button>
          <button onClick={() => { marquerNotifLue(notifEquipementPret.id); setOnglet('equipement') }} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: colors.accent.green, color: colors.black, fontSize: '13px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Voir mon équipement</button>
        </div>
      </div>
    </div>
  )

  if (estAffilie) {
    const affiliation = mesAffiliations.find(a => a.statut === 'accepte')
    const edu = affiliation?.profil_educateur
    const labelSection = edu?.club
      ? (edu.club + (edu.categorie ? ` ${edu.categorie}` : '')).toUpperCase()
      : t('jsec_equipe', lang)

    const secAffilie = [
      { id: 'accueil',       label: t('jnav_accueil', lang),        icon: <IconHome /> },

      { id: 'equipe',        label: t('jnav_equipe', lang),         icon: <IconUsers />, section: labelSection },
      { id: 'competition',   label: t('jnav_competition', lang),    icon: <IconTrophy /> },
      { id: 'stats',         label: t('aff_mes_stats', lang),       icon: <IconChart /> },
      { id: 'prep_physique', label: t('jnav_prep_physique', lang),  icon: <IconDumbbell /> },
      { id: 'equipement',    label: 'Équipement',                   icon: <IconShirt /> },
      { id: 'annonces',      label: 'Actualités du club',             icon: <IconMessage />, badge: annoncesClub.filter(a => !annoncesLuesIds.has(a.id)).length },

      { id: 'jogabonito',    label: 'Jogabonito',                   icon: <span style={{ fontSize: '18px' }}>🎬</span>, section: t('aff_explorer', lang) },
      { id: 'feed',          label: t('recrut_feed', lang),         icon: <IconGlobe />,  locked: true },
      { id: 'recruteurs',    label: t('jnav_recruteurs', lang),     icon: <IconMessage />, locked: true },

      { id: 'profil',        label: t('jnav_profil', lang),         icon: <IconUser />, section: t('section_compte', lang) },
    ]

    return (
      <div style={{ minHeight: '100vh', background: colors.background.base, color: colors.text.primary, fontFamily: 'Inter, sans-serif', display: 'flex', overflowX: 'hidden' }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; } ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: ${colors.border.default}; border-radius: 2px; } .af-nav-btn:hover { background: ${colors.background.sunken} !important; color: ${colors.text.secondary} !important; }`}</style>

        {popupEquipementPret}

        {isMobile && sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 40 }} />
        )}

        <aside style={{
          width: '220px', background: colors.background.sunken, borderRight: `1px solid ${colors.border.subtle}`, display: 'flex', flexDirection: 'column', flexShrink: 0,
          ...(isMobile ? {
            position: 'fixed', top: 0, left: sidebarOpen ? 0 : -240, height: '100%', zIndex: 50, transition: 'left 0.25s ease', overflowY: 'auto', paddingTop: 'env(safe-area-inset-top, 0px)',
          } : {
            position: 'sticky', top: 0, height: '100vh', minHeight: '100vh', overflowY: 'auto',
          }),
        }}>
          <div style={{ padding: '24px 20px 20px', borderBottom: `1px solid ${colors.border.subtle}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.5px' }}>Digital<span style={{ color: colors.accent.green }}>Football</span></div>
              <div style={{ marginTop: '4px', fontSize: '11px', color: colors.accent.green, fontWeight: 600 }}>{t('aff_joueur_affilie', lang)}</div>
            </div>
            {isMobile && (
              <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: 20, cursor: 'pointer' }}>✕</button>
            )}
          </div>
          <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {secAffilie.map(item => (
              <div key={item.id}>
                {item.section && (
                  <div style={{ color: colors.border.strong, fontSize: '10px', fontWeight: 800, letterSpacing: '1.5px', padding: '16px 12px 6px', textTransform: 'uppercase' }}>
                    {item.section}
                  </div>
                )}
                <button className="af-nav-btn" onClick={() => { if (item.id === 'jogabonito') navigate('/jogabonito'); else setOnglet(item.id); setSidebarOpen(false) }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: onglet === item.id ? '#4ade8012' : 'transparent', color: onglet === item.id ? colors.accent.green : item.locked ? colors.border.strong : colors.text.faint, fontSize: '13px', fontWeight: onglet === item.id ? 700 : 400, textAlign: 'left', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s', position: 'relative' }}>
                  <span style={{ flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge > 0 && (
                    <span style={{ background: colors.accent.green, color: colors.black, fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '20px', letterSpacing: '0.3px' }}>
                      {item.badge}
                    </span>
                  )}
                  {item.locked && <span style={{ fontSize: '12px', opacity: 0.4 }}>🔒</span>}
                  {onglet === item.id && <div style={{ position: 'absolute', left: 0, top: '20%', height: '60%', width: '3px', background: colors.accent.green, borderRadius: '0 3px 3px 0' }} />}
                </button>
              </div>
            ))}
          </nav>
          <div style={{ padding: '16px 12px', borderTop: `1px solid ${colors.border.subtle}` }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[['fr','🇫🇷'],['en','🇬🇧'],['pt','🇧🇷'],['es','🇪🇸'],['it','🇮🇹'],['de','🇩🇪']].map(([code, flag]) => (
                <button key={code} onClick={() => setLang(code)}
                  style={{ background: lang === code ? colors.accent.green + alpha.soft : 'transparent', border: `1px solid ${lang === code ? colors.accent.green : colors.border.default}`, borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '14px', color: lang === code ? colors.accent.green : colors.text.faint }}>
                  {flag}
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: '12px 10px 20px', borderTop: `1px solid ${colors.border.subtle}`, display: 'flex', gap: '4px', alignItems: 'center' }}>
            <button onClick={handleLogout} style={{ flex: 1, minWidth: 0, padding: '9px 12px', borderRadius: '10px', border: 'none', background: 'transparent', color: colors.text.disabled, fontSize: '12px', cursor: 'pointer', textAlign: 'left', fontFamily: 'Inter, sans-serif' }}>{t('btn_deconnexion', lang)}</button>
            <ThemeToggleButton />
          </div>
        </aside>

        <main style={{ flex: 1, minWidth: 0, padding: isMobile ? '16px 14px' : '32px 36px', paddingTop: isMobile ? 'calc(16px + env(safe-area-inset-top, 0px))' : '32px', overflowY: 'auto' }}>
          {!readOnly && (
            <div style={{ marginBottom: '16px', borderRadius: '10px', overflow: 'hidden' }}>
              <NotificationBanner userId={userId} cibles={['tous', 'joueurs']} />
            </div>
          )}
          {isMobile && (
            <button onClick={() => setSidebarOpen(true)}
              style={{ background: 'none', border: 'none', color: colors.text.primary, fontSize: 24, cursor: 'pointer', padding: '0 0 16px 0', display: 'block' }}>
              ☰
            </button>
          )}
          {onglet === 'accueil' && (
            <div style={{ maxWidth: '640px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '6px', letterSpacing: '-0.5px' }}>{t('aff_bonjour', lang)} {profil?.prenom} 👋</h1>
              <p style={{ color: colors.text.faint, fontSize: '13px', marginBottom: '28px' }}>{t('aff_espace_joueur', lang)}</p>

              {/* ── Alertes — raccourcis vers ce qui vient de changer (convocation,
                  équipement prêt, dernier commentaire coach) plutôt que de devoir
                  les trouver en cherchant plus bas sur la page. ── */}
              {(convocationActive || equipementPret || mesNotes[0]?.commentaire) && (
                <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '16px', padding: '16px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ margin: '0 0 2px', fontSize: '11px', fontWeight: 800, color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '1px' }}>Alertes</p>
                  {convocationActive && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: colors.background.raised, borderRadius: '10px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.accent.green, flexShrink: 0 }} />
                      <p style={{ margin: 0, fontSize: '13px' }}>Convoqué {convocationActive.matchs_equipe?.domicile ? 'vs' : '@'} {convocationActive.matchs_equipe?.adversaire}</p>
                    </div>
                  )}
                  {equipementPret && (
                    <button onClick={() => setOnglet('profil')} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: colors.background.raised, border: 'none', borderRadius: '10px', cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'Inter, sans-serif' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.accent.amber, flexShrink: 0 }} />
                      <p style={{ margin: 0, fontSize: '13px', color: colors.text.primary }}>Ton équipement est prêt</p>
                    </button>
                  )}
                  {mesNotes[0]?.commentaire && (
                    <div style={{ padding: '8px 10px', background: colors.background.raised, borderRadius: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.accent.blue, flexShrink: 0 }} />
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>Commentaire du coach — vs {mesNotes[0].matchs_equipe?.adversaire}</p>
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: colors.text.faint, paddingLeft: '18px' }}>{mesNotes[0].commentaire}</p>
                    </div>
                  )}
                </div>
              )}

              <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '20px', marginBottom: '14px' }}>
                <div style={{ fontSize: '10px', color: colors.accent.green, fontWeight: 800, letterSpacing: '1.5px', marginBottom: '12px' }}>{t('aff_ton_educateur', lang)}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: colors.accent.green + alpha.soft, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.accent.green, fontWeight: 800, fontSize: '16px', flexShrink: 0 }}>{(edu?.prenom?.[0] || '?').toUpperCase()}</div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '15px' }}>{edu?.prenom} {edu?.nom}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: colors.text.faint }}>{edu?.club || ''}{edu?.categorie ? ` · ${edu.categorie}` : ''}</p>
                  </div>
                </div>
              </div>

              {edu && (
                <div style={{ background: colors.background.surface, border: '2px solid #4ade8050', borderRadius: '16px', padding: '20px', marginBottom: '14px', boxShadow: '0 0 0 1px #4ade8010' }}>
                  <p style={{ fontWeight: 800, fontSize: '13px', margin: '0 0 12px', color: colors.accent.green, display: 'flex', alignItems: 'center', gap: '6px' }}>📅 {t('planning_semaine_titre', lang)}</p>
                  <PlanningSemaineWidget entrainements={planningEntrainements} matchs={planningMatchs} />
                </div>
              )}

              {(() => {
                const STATUT_OPTIONS = [
                  { val: 'present',  label: t('ent_present', lang),  emoji: '✅', color: colors.accent.green, bg: colors.accent.green + alpha.subtle, border: colors.accent.green + alpha.medium },
                  { val: 'absent',   label: t('ent_absent', lang),   emoji: '❌', color: colors.accent.red, bg: colors.accent.red + alpha.subtle, border: colors.accent.red + alpha.medium },
                  { val: 'blesse',   label: t('ent_blesse', lang),   emoji: '🤕', color: colors.accent.orange, bg: colors.accent.orange + alpha.subtle, border: colors.accent.orange + alpha.medium },
                  { val: 'malade',   label: t('ent_malade', lang),   emoji: '🤒', color: colors.accent.purple, bg: colors.accent.purple + alpha.subtle, border: colors.accent.purple + alpha.medium },
                  { val: 'convoque', label: t('ent_convoque', lang), emoji: '🏆', color: colors.accent.blue, bg: colors.accent.blue + alpha.subtle, border: colors.accent.blue + alpha.medium },
                ]
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '14px' }}>
                    {widgetProchainEnt && (
                      <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                          <span style={{ fontSize: '20px' }}>📋</span>
                          <div>
                            <p style={{ fontWeight: 800, fontSize: '14px', marginBottom: '2px' }}>{t('aff_prochain_entrainement', lang)}</p>
                            <p style={{ fontSize: '12px', color: colors.text.faint }}>{new Date(widgetProchainEnt.date).toLocaleDateString(localeOf(lang), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                          </div>
                        </div>
                        <p style={{ fontSize: '12px', color: colors.text.muted, marginBottom: '12px' }}>{t('aff_seras_tu_present', lang)}</p>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {STATUT_OPTIONS.map(opt => (
                            <button key={opt.val} onClick={() => repondreDisponibilite(widgetProchainEnt.id, 'entrainement', opt.val)} disabled={savingDispo}
                              style={{ background: widgetDispoEnt === opt.val ? opt.bg : 'transparent', border: `1px solid ${widgetDispoEnt === opt.val ? opt.border : colors.border.default}`, color: widgetDispoEnt === opt.val ? opt.color : colors.text.faint, padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: widgetDispoEnt === opt.val ? 700 : 400, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                              {opt.emoji} {opt.label}
                            </button>
                          ))}
                        </div>
                        {widgetDispoEnt && <p style={{ fontSize: '11px', color: colors.text.disabled, marginTop: '10px' }}>✓ {t('aff_reponse_envoyee', lang)}</p>}
                      </div>
                    )}

                    {widgetProchainMatch && (
                      <div style={{ background: colors.background.surface, border: '1px solid #60a5fa20', borderRadius: '16px', padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                          <span style={{ fontSize: '20px' }}>⚽</span>
                          <div>
                            <p style={{ fontWeight: 800, fontSize: '14px', marginBottom: '2px' }}>{t('aff_prochain_match', lang)} — {widgetProchainMatch.adversaire || t('aff_match_titre', lang)}</p>
                            <p style={{ fontSize: '12px', color: colors.text.faint }}>{new Date(widgetProchainMatch.date).toLocaleDateString(localeOf(lang), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                          </div>
                        </div>
                        <p style={{ fontSize: '12px', color: colors.text.muted, marginBottom: '12px' }}>{t('aff_dispo_pour_match', lang)}</p>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {STATUT_OPTIONS.map(opt => (
                            <button key={opt.val} onClick={() => repondreDisponibilite(widgetProchainMatch.id, 'match', opt.val)} disabled={savingDispo}
                              style={{ background: widgetDispoMatch === opt.val ? opt.bg : 'transparent', border: `1px solid ${widgetDispoMatch === opt.val ? opt.border : colors.border.default}`, color: widgetDispoMatch === opt.val ? opt.color : colors.text.faint, padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: widgetDispoMatch === opt.val ? 700 : 400, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                              {opt.emoji} {opt.label}
                            </button>
                          ))}
                        </div>
                        {widgetDispoMatch && <p style={{ fontSize: '11px', color: colors.text.disabled, marginTop: '10px' }}>✓ {t('aff_reponse_envoyee', lang)}</p>}
                      </div>
                    )}

                    {widgetCalendrier.length > 0 && (
                      <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '20px' }}>
                        <p style={{ fontWeight: 800, fontSize: '14px', marginBottom: '16px' }}>📅 {t('aff_cette_semaine', lang)}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {widgetCalendrier.map((ev, i) => {
                            const date = new Date(ev.date)
                            const isToday = date.toDateString() === new Date().toDateString()
                            const isTomorrow = date.toDateString() === new Date(Date.now() + 86400000).toDateString()
                            const labelJour = isToday ? t('aff_aujourdhui', lang) : isTomorrow ? t('aff_demain', lang) : date.toLocaleDateString(localeOf(lang), { weekday: 'long', day: 'numeric', month: 'short' })
                            const statut = ev.type === 'entrainement' && ev.id === widgetProchainEnt?.id ? widgetDispoEnt
                              : ev.type === 'match' && ev.id === widgetProchainMatch?.id ? widgetDispoMatch
                              : null
                            const optStatut = STATUT_OPTIONS.find(o => o.val === statut)
                            return (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', background: isToday ? colors.accent.green + alpha.faint : colors.background.surfaceAlt, border: `1px solid ${isToday ? '#4ade8025' : colors.border.faint}`, borderRadius: '10px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: ev.type === 'match' ? colors.accent.blue + alpha.subtle : colors.accent.green + alpha.subtle, border: `1px solid ${ev.type === 'match' ? colors.accent.blue + alpha.light : colors.accent.green + alpha.light}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                                  {ev.type === 'match' ? '⚽' : '🏃'}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontWeight: 700, fontSize: '13px', marginBottom: '2px' }}>{ev.titre}</p>
                                  <p style={{ fontSize: '11px', color: colors.text.faint }}>{labelJour}</p>
                                </div>
                                {optStatut && <span style={{ fontSize: '16px' }}>{optStatut.emoji}</span>}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                {[{ id: 'prep_physique', label: t('aff_prepa_physique_court', lang), emoji: '🏋️', desc: t('aff_tes_seances_exercices', lang) }, { id: 'stats', label: t('aff_mes_stats', lang), emoji: '📊', desc: t('aff_presences_performance', lang) }].map(item => (
                  <button key={item.id} onClick={() => setOnglet(item.id)} style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '18px 16px', cursor: 'pointer', textAlign: 'left', fontFamily: 'Inter, sans-serif', color: colors.text.primary }}>
                    <div style={{ fontSize: '22px', marginBottom: '8px' }}>{item.emoji}</div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{item.label}</p>
                    <p style={{ margin: '3px 0 0', fontSize: '11px', color: colors.text.faint }}>{item.desc}</p>
                  </button>
                ))}
              </div>
              <div style={{ background: `linear-gradient(135deg, ${colors.accent.green}${alpha.faint}, ${colors.background.base})`, border: `1px solid ${colors.accent.green}${alpha.light}`, borderRadius: '16px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{t('aff_passe_niveau_sup', lang)}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: colors.text.faint, lineHeight: 1.5 }}>{t('aff_analyses_feed_desc', lang)}</p>
                </div>
                <button onClick={() => window.open(stripeUrl(STRIPE_LINKS.starter, userId, profil?.email), '_blank')} style={{ ...st.btnSolid(), whiteSpace: 'nowrap', flexShrink: 0 }}>{t('aff_voir_packs', lang)}</button>
              </div>
            </div>
          )}
          {onglet === 'prep_physique' && <PrepPhysiqueJoueur joueurId={userId} isMobile={isMobile} />}
          {onglet === 'competition' && renduCompetition()}
          {onglet === 'stats' && (
            <div style={{ maxWidth: '640px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '20px' }}>{t('aff_mes_stats', lang)}</h2>

              {!affiliation ? (
                <p style={{ color: colors.border.strong, fontSize: '13px', fontStyle: 'italic' }}>{t('aff_rejoins_equipe_stats', lang)}</p>
              ) : (
              <>
              {statsLoading[affiliation.id] && (
                <p style={{ color: colors.accent.green, fontSize: '13px' }}>{t('jexp_chargement', lang)}</p>
              )}

              {statsJoueur[affiliation.id] && (() => {
                const s = statsJoueur[affiliation.id]

                const hasDonnees = s.present || s.points || s.matchsJoues || s.noteEdu ||
                  s.prochainMatchs?.length > 0 || s.leaderButs?.length > 0 || s.leaderPoints?.length > 0
                if (!hasDonnees) return (
                  <EmptyState compact title={t('aff_aucune_seance_match', lang)} />
                )

                // ── Badges / streaks ──────────────────────────────────────
                const badges = []
                if (s.tauxPresence === 100) badges.push({ label: t('aff_badge_100pct', lang), color: colors.accent.green })
                else if (s.tauxPresence >= 80) badges.push({ label: t('aff_badge_assidu', lang), color: colors.accent.green })
                if (s.rankPoints?.rank === 1) badges.push({ label: t('aff_badge_top_points', lang), color: colors.accent.amber })
                if (s.rankButs?.rank === 1) badges.push({ label: t('aff_badge_top_buteur', lang), color: colors.accent.orange })
                if (s.buts >= 5) badges.push({ label: `${s.buts} ${t('comp_buts', lang)}`, color: colors.accent.orange })

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* Entraînement */}
                    <div>
                      <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 800, color: colors.accent.amber, letterSpacing: '1px', textTransform: 'uppercase' }}>⭐ {t('aff_entrainement_titre', lang)}</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        {[
                          { label: t('stats_tab_presences', lang), val: `${s.present ?? 0}/${s.total ?? 0}` },
                          { label: t('aff_taux_presence', lang), val: `${s.tauxPresence ?? 0}%`, color: s.tauxPresence >= 75 ? colors.accent.green : s.tauxPresence >= 50 ? '#facc15' : colors.accent.red },
                          { label: t('aff_points_seance', lang), val: s.points ?? 0, color: colors.accent.amber },
                        ].map(({ label, val, color }) => (
                          <div key={label} style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                            <p style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: color || colors.accent.green }}>{val}</p>
                            <p style={{ margin: '4px 0 0', fontSize: '10px', color: colors.text.faint }}>{label}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Badges */}
                    {badges.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {badges.map((b, i) => (
                          <span key={i} style={{ background: b.color + '15', border: `1px solid ${b.color}40`, color: b.color, fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px' }}>
                            {b.label}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Présence par mois */}
                    {s.presenceMensuelle?.length > 0 && (
                      <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '12px', padding: '16px' }}>
                        <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 800, color: colors.accent.purpleLight, letterSpacing: '1px', textTransform: 'uppercase' }}>📅 {t('aff_points_seance_par_mois', lang)}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {s.presenceMensuelle.map(({ month, taux, present, total }) => {
                            const [y, m] = month.split('-')
                            const label = new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString(localeOf(lang), { month: 'long', year: '2-digit' })
                            const color = taux >= 75 ? colors.accent.green : taux >= 50 ? '#facc15' : colors.accent.red
                            return (
                              <div key={month} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '11px', color: colors.text.faint, width: '70px', flexShrink: 0, textTransform: 'capitalize' }}>{label}</span>
                                <div style={{ flex: 1, height: '6px', background: colors.background.raised, borderRadius: '3px' }}>
                                  <div style={{ width: `${taux}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.5s' }} />
                                </div>
                                <span style={{ fontSize: '11px', fontWeight: 700, color, width: '36px', textAlign: 'right', flexShrink: 0 }}>{taux}%</span>
                                <span style={{ fontSize: '10px', color: colors.border.strong, flexShrink: 0 }}>{present}/{total}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Stats de match */}
                    {(s.matchsJoues > 0 || s.buts > 0 || s.passes > 0) && (
                      <div>
                        <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 800, color: colors.accent.blue, letterSpacing: '1px', textTransform: 'uppercase' }}>⚽ {t('aff_stats_match_titre', lang)}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                          {[
                            { label: t('jp_matchs_joues', lang), val: s.matchsJoues ?? 0, color: colors.accent.blue },
                            { label: t('comp_buts', lang), val: s.buts ?? 0, color: colors.accent.green },
                            { label: t('club_passes_dec_emoji', lang), val: s.passes ?? 0, color: colors.accent.purpleLight },
                            { label: t('jp_minutes', lang), val: s.minutesJouees ?? 0, color: '#34d399' },
                            { label: t('jp_clean_sheets', lang), val: s.cleanSheets ?? 0, color: '#34d399' },
                          ].map(({ label, val, color }) => (
                            <div key={label} style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                              <p style={{ margin: 0, fontSize: '22px', fontWeight: 800, color }}>{val}</p>
                              <p style={{ margin: '4px 0 0', fontSize: '10px', color: colors.text.faint }}>{label}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Avis éducateur */}
                    <div>
                      <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 800, color: '#f59e0b', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('aff_avis_ton_educateur', lang)}</p>
                      <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '12px', padding: '16px' }}>
                        {s.noteEdu ? (
                          <>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: s.noteEdu.commentaire ? '14px' : '0' }}>
                              {[
                                { label: t('aff_technique', lang), value: s.noteEdu.technique, color: colors.accent.blue },
                                { label: t('aff_physique', lang), value: s.noteEdu.physique, color: colors.accent.green },
                                { label: t('aff_mental', lang), value: s.noteEdu.mental, color: colors.accent.purpleLight },
                                { label: t('aff_tactique', lang), value: s.noteEdu.tactique, color: '#f59e0b' },
                              ].map(n => (
                                <div key={n.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '11px', color: colors.text.faint, flex: 1 }}>{n.label}</span>
                                  <div style={{ display: 'flex', gap: '2px' }}>
                                    {[1, 2, 3, 4, 5].map(i => (
                                      <span key={i} style={{ fontSize: '12px', color: i <= (n.value || 0) ? n.color : colors.text.ghost }}>★</span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                            {s.noteEdu.commentaire && (
                              <p style={{ margin: 0, fontSize: '12px', color: colors.text.muted, fontStyle: 'italic', borderTop: `1px solid ${colors.border.subtle}`, paddingTop: '12px', lineHeight: 1.6 }}>
                                "{s.noteEdu.commentaire}"
                              </p>
                            )}
                          </>
                        ) : (
                          <p style={{ margin: 0, fontSize: '12px', color: colors.border.strong, fontStyle: 'italic' }}>
                            {t('aff_pas_note_partagee', lang)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Classements équipe */}
                    {(s.leaderButs?.length > 0 || s.leaderPoints?.length > 0) && (
                      <div>
                        <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 800, color: colors.accent.orange, letterSpacing: '1px', textTransform: 'uppercase' }}>{t('aff_classements_equipe', lang)}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          {[
                            { title: t('aff_top_buteurs', lang), data: s.leaderButs },
                            { title: t('aff_points_seance', lang), data: s.leaderPoints },
                          ].map(({ title, data }) => data?.length > 0 && (
                            <div key={title} style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '12px', padding: '12px 14px' }}>
                              <p style={{ margin: '0 0 8px', fontSize: '10px', fontWeight: 700, color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</p>
                              {data.slice(0, 3).map((row, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', background: row.isMe ? '#4ade8010' : 'transparent', borderRadius: '6px', padding: '2px 4px', border: row.isMe ? '1px solid #4ade8030' : '1px solid transparent' }}>
                                  <span style={{ fontSize: '9px', color: i === 0 ? colors.accent.amber : colors.border.strong, fontWeight: 800, width: '12px' }}>{i + 1}</span>
                                  <span style={{ fontSize: '11px', color: row.isMe ? colors.accent.green : colors.text.muted, flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontWeight: row.isMe ? 700 : 400 }}>
                                    {row.isMe ? t('aff_fleche_toi', lang) : row.nom?.split(' ')[0] || '—'}
                                  </span>
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: row.isMe ? colors.accent.green : colors.text.faint }}>{row.val}</span>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Prochains matchs */}
                    {s.prochainMatchs?.length > 0 && (
                      <div>
                        <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 800, color: '#34d399', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('aff_prochains_matchs', lang)}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {s.prochainMatchs.map((m, i) => {
                            const d = new Date(m.date)
                            const label = d.toLocaleDateString(localeOf(lang), { weekday: 'short', day: 'numeric', month: 'short' })
                            return (
                              <div key={i} style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '12px', padding: '12px 14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                  <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 700 }}>{label}{m.heure ? ` · ${m.heure}` : ''}</span>
                                  {m.competition && <span style={{ fontSize: '10px', color: colors.text.disabled, background: colors.background.raised, padding: '1px 7px', borderRadius: '6px' }}>{m.competition}</span>}
                                </div>
                                <p style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>{m.equipe_domicile} <span style={{ color: colors.border.strong, fontWeight: 400 }}>vs</span> {m.equipe_exterieur}</p>
                                {m.lieu && <p style={{ margin: '2px 0 0', fontSize: '10px', color: colors.text.disabled }}>📍 {m.lieu}</p>}
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
            </div>
          )}
          {onglet === 'equipe' && (
            <div style={{ padding: isMobile ? '16px' : '24px 32px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '2rem' }}>{t('jeq_titre', lang)}</h1>

              {/* Mes affiliations actives / en attente / refusées (l'historique archivé est plus bas) */}
              {mesAffiliations.filter(a => a.statut !== 'archive').length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{t('jeq_mes_educateurs', lang)}</p>
                  {mesAffiliations.filter(a => a.statut !== 'archive').map(a => {
                    const pe = a.profil_educateur
                    const isAccepted = a.statut === 'accepte'
                    return (
                      <div key={a.id} style={{ background: colors.background.raised, borderRadius: '16px', overflow: 'hidden', border: `1px solid ${isAccepted ? colors.border.default : colors.border.default}` }}>
                        {isAccepted ? (
                          <div style={{ background: `linear-gradient(135deg, ${colors.accent.green}${alpha.subtle} 0%, ${colors.background.surface} 100%)`, padding: '20px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px', color: '#052e16', flexShrink: 0 }}>
                              {pe?.prenom?.[0]}{pe?.nom?.[0]}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 'bold', fontSize: '17px' }}>{pe?.prenom} {pe?.nom}</div>
                              <div style={{ color: colors.accent.green, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[pe?.club, pe?.categorie, pe?.niveau_championnat].filter(Boolean).join(' · ')}</div>
                              <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                <span style={{ background: '#22c55e' + alpha.subtle, border: '1px solid #22c55e', borderRadius: '20px', padding: '2px 10px', fontSize: '12px', color: '#22c55e' }}>
                                  ✅ {t('profil_affilie', lang)}
                                </span>
                                {pe?.diplome && (
                                  <span style={{ fontSize: '12px', color: colors.accent.green }}>🎓 {pe.diplome}</span>
                                )}
                              </div>
                              {pe?.lien_groupe && (
                                <a href={pe.lien_groupe} target="_blank" rel="noopener noreferrer"
                                  style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#25D36615', border: '1px solid #25D36640', borderRadius: 10, padding: '10px 14px', textDecoration: 'none', color: '#25D366', fontWeight: 700, fontSize: 13, marginTop: 12 }}>
                                  💬 {t('aff_rejoindre_groupe', lang)}
                                </a>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: colors.background.raised, border: `2px solid ${colors.border.default}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, color: colors.text.faint, flexShrink: 0 }}>
                              {pe?.prenom?.[0]}{pe?.nom?.[0]}
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{pe?.prenom} {pe?.nom}</p>
                              <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.faint }}>{pe?.club} · {pe?.categorie} · {pe?.niveau_championnat}</p>
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                              background: a.statut === 'en_attente' ? '#f59e0b15' : colors.accent.red + alpha.subtle,
                              color: a.statut === 'en_attente' ? '#f59e0b' : colors.accent.red,
                              border: `1px solid ${a.statut === 'en_attente' ? '#f59e0b30' : colors.accent.red + alpha.light}` }}>
                              {a.statut === 'en_attente' ? `⏳ ${t('etat_en_attente', lang)}` : `✕ ${t('etat_refuse', lang)}`}
                            </span>
                          </div>
                        )}

                        {isAccepted && (
                          <div style={{ padding: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '4px' }}>
                              <button
                                onClick={() => chargerStatsJoueur(a.id, a.equipe_joueur_id, a.educateur_id)}
                                disabled={!a.equipe_joueur_id || statsLoading[a.id]}
                                style={{ background: '#22c55e', color: 'black', border: 'none', borderRadius: '10px', padding: '14px', fontWeight: 'bold', fontSize: '15px', cursor: a.equipe_joueur_id ? 'pointer' : 'not-allowed', opacity: a.equipe_joueur_id ? 1 : 0.4 }}>
                                {statsLoading[a.id] ? '...' : `📊 ${t('aff_mes_stats', lang)}`}
                              </button>
                              <button
                                onClick={() => { setEduNote(a); setNoteCriteres({}); setNoteCommentaire(''); setNotePublic(true) }}
                                style={{ background: colors.background.raised, color: colors.text.primary, border: `1px solid ${colors.border.strong}`, borderRadius: '10px', padding: '14px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>
                                ⭐ {t('club_evaluer', lang)}
                              </button>
                            </div>

                            {/* Stats chargées */}
                            {statsJoueur[a.id] && (() => {
                              const s = statsJoueur[a.id]
                              const pct = s.tauxPresence ?? 0
                              const r = 44
                              const circ = 2 * Math.PI * r
                              const dash = (pct / 100) * circ
                              const presColor = pct >= 80 ? colors.accent.green : pct >= 60 ? '#f59e0b' : colors.accent.red
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                                  {/* Présence + Stats match côte à côte */}
                                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '200px 1fr', gap: '16px', alignItems: 'stretch' }}>
                                    <div style={{ background: colors.background.surface, borderRadius: '20px', padding: '24px 20px', border: `1px solid ${colors.border.subtle}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                                      <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, color: colors.text.disabled, letterSpacing: '2px', textTransform: 'uppercase' }}>{t('aff_taux_presence', lang)}</p>
                                      <svg width="110" height="110" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r={r} fill="none" stroke={colors.border.subtle} strokeWidth="9" />
                                        <circle cx="50" cy="50" r={r} fill="none" stroke={presColor} strokeWidth="9"
                                          strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ / 4} strokeLinecap="round"
                                          style={{ filter: `drop-shadow(0 0 8px ${presColor}50)` }} />
                                        <text x="50" y="46" textAnchor="middle" fill={presColor} fontSize="16" fontWeight="800" fontFamily="Inter, sans-serif">{pct}%</text>
                                        <text x="50" y="62" textAnchor="middle" fill={colors.text.disabled} fontSize="9" fontFamily="Inter, sans-serif">{s.present}/{s.total} {t('stats_seances_plural', lang)}</text>
                                      </svg>
                                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                        <span style={{ background: colors.accent.amber + alpha.subtle, border: '1px solid #fbbf2430', color: colors.accent.amber, fontSize: '11px', padding: '4px 12px', borderRadius: '20px', fontWeight: 600 }}>⭐ {s.points} pts</span>
                                        {s.rankPoints?.rank === 1 && <span style={{ background: '#fbbf2412', border: '1px solid #fbbf2430', color: colors.accent.amber, fontSize: '11px', padding: '4px 12px', borderRadius: '20px' }}>🏆 {t('aff_meilleur_equipe', lang)}</span>}
                                      </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                                      {[
                                        { label: t('jp_matchs_joues', lang), value: s.matchsJoues, color: colors.accent.blue, rank: s.rankMatchs },
                                        { label: t('comp_buts', lang), value: s.buts, color: colors.accent.green, rank: s.rankButs },
                                        { label: t('club_passes_dec_emoji', lang), value: s.passes, color: colors.accent.purpleLight, rank: s.rankPasses },
                                        { label: t('jp_clean_sheets', lang), value: s.cleanSheets, color: '#34d399', rank: s.rankClean },
                                      ].map(stat => (
                                        <div key={stat.label} style={{ background: colors.background.surface, borderRadius: '18px', padding: '18px 16px', border: `1px solid ${stat.color}18`, position: 'relative', overflow: 'hidden' }}>
                                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${stat.color}, transparent)` }} />
                                          <p style={{ margin: '0 0 10px', fontSize: '10px', color: colors.text.disabled, textTransform: 'uppercase', letterSpacing: '1px' }}>{stat.label}</p>
                                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '40px', fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value}</span>
                                            {stat.rank?.rank && stat.rank?.total > 1 && (
                                              <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '20px', background: stat.rank.rank === 1 ? colors.accent.amber + alpha.soft : '#ffffff08', color: stat.rank.rank === 1 ? colors.accent.amber : colors.text.faint, border: `1px solid ${stat.rank.rank === 1 ? colors.accent.amber + alpha.medium : colors.border.subtle}` }}>
                                                #{stat.rank.rank}/{stat.rank.total}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Pills minutes/cartons */}
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '12px', color: colors.accent.blue, background: '#60a5fa12', border: '1px solid #60a5fa25', padding: '5px 14px', borderRadius: '20px', fontWeight: 600 }}>⏱ {s.minutesJouees} min</span>
                                    {s.jaunes > 0 && <span style={{ fontSize: '12px', color: '#f59e0b', background: '#f59e0b12', border: '1px solid #f59e0b25', padding: '5px 14px', borderRadius: '20px', fontWeight: 600 }}>🟨 {s.jaunes}</span>}
                                    {s.rouges > 0 && <span style={{ fontSize: '12px', color: colors.accent.red, background: '#ef444412', border: '1px solid #ef444425', padding: '5px 14px', borderRadius: '20px', fontWeight: 600 }}>🟥 {s.rouges}</span>}
                                  </div>

                                  {/* Présence mensuelle + Avis éducateur côte à côte */}
                                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                                    {s.presenceMensuelle?.length > 0 && (
                                      <div style={{ background: colors.background.surface, borderRadius: '20px', padding: '20px 22px', border: `1px solid ${colors.border.subtle}` }}>
                                        <p style={{ margin: '0 0 16px', fontSize: '10px', fontWeight: 700, color: colors.text.disabled, letterSpacing: '2px', textTransform: 'uppercase' }}>{t('club_presence_par_mois', lang)}</p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                          {s.presenceMensuelle.map(({ month, taux, present, total }) => {
                                            const [y, m] = month.split('-')
                                            const label = new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString(localeOf(lang), { month: 'long', year: '2-digit' })
                                            const color = taux >= 80 ? colors.accent.green : taux >= 60 ? '#f59e0b' : colors.accent.red
                                            return (
                                              <div key={month}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                  <span style={{ fontSize: '11px', color: colors.text.dim, textTransform: 'capitalize' }}>{label}</span>
                                                  <span style={{ fontSize: '11px', fontWeight: 700, color }}>{taux}% <span style={{ color: colors.border.strong, fontWeight: 400 }}>({present}/{total})</span></span>
                                                </div>
                                                <div style={{ height: '6px', background: colors.background.raised, borderRadius: '3px', overflow: 'hidden' }}>
                                                  <div style={{ width: `${taux}%`, height: '100%', background: `linear-gradient(90deg, ${color}, ${color}88)`, borderRadius: '3px' }} />
                                                </div>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    )}
                                    <div style={{ background: colors.background.surface, borderRadius: '20px', padding: '20px 22px', border: `1px solid ${colors.border.subtle}` }}>
                                      <p style={{ margin: '0 0 16px', fontSize: '10px', fontWeight: 700, color: colors.text.disabled, letterSpacing: '2px', textTransform: 'uppercase' }}>{t('aff_avis_educateur_court', lang)}</p>
                                      {s.noteEdu ? (
                                        <>
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: s.noteEdu.commentaire ? '14px' : '0' }}>
                                            {[
                                              { label: t('aff_technique', lang), value: s.noteEdu.technique, color: colors.accent.blue },
                                              { label: t('aff_physique', lang), value: s.noteEdu.physique, color: colors.accent.green },
                                              { label: t('aff_mental', lang), value: s.noteEdu.mental, color: colors.accent.purpleLight },
                                              { label: t('aff_tactique', lang), value: s.noteEdu.tactique, color: '#f59e0b' },
                                            ].map(n => (
                                              <div key={n.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontSize: '11px', color: colors.text.faint, width: '70px', flexShrink: 0 }}>{n.label}</span>
                                                <div style={{ flex: 1, height: '6px', background: colors.background.raised, borderRadius: '3px', overflow: 'hidden' }}>
                                                  <div style={{ width: `${((n.value || 0) / 5) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${n.color}, ${n.color}88)`, borderRadius: '3px' }} />
                                                </div>
                                                <span style={{ fontSize: '13px', fontWeight: 700, color: n.color, width: '16px', textAlign: 'right', flexShrink: 0 }}>{n.value || 0}</span>
                                              </div>
                                            ))}
                                          </div>
                                          {s.noteEdu.commentaire && (
                                            <p style={{ margin: 0, fontSize: '12px', color: colors.text.muted, fontStyle: 'italic', borderTop: `1px solid ${colors.border.subtle}`, paddingTop: '12px', lineHeight: 1.6 }}>"{s.noteEdu.commentaire}"</p>
                                          )}
                                        </>
                                      ) : <p style={{ margin: 0, fontSize: '12px', color: colors.border.strong, fontStyle: 'italic' }}>{t('aff_pas_note_partagee', lang)}</p>}
                                    </div>
                                  </div>

                                  {/* Prochains matchs */}
                                  {s.prochainMatchs?.length > 0 && (
                                    <div>
                                      <p style={{ margin: '0 0 12px', fontSize: '10px', fontWeight: 700, color: colors.text.disabled, letterSpacing: '2px', textTransform: 'uppercase' }}>{t('aff_prochains_matchs', lang)}</p>
                                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px' }}>
                                        {s.prochainMatchs.map((m, i) => {
                                          const d = new Date(m.date)
                                          return (
                                            <div key={i} style={{ background: colors.background.surface, borderRadius: '16px', padding: '14px 18px', border: `1px solid ${colors.border.subtle}`, display: 'flex', alignItems: 'center', gap: '16px' }}>
                                              <div style={{ background: 'linear-gradient(135deg, #4ade8020, #4ade8008)', border: '1px solid #4ade8030', borderRadius: '12px', padding: '8px 12px', textAlign: 'center', flexShrink: 0, minWidth: '50px' }}>
                                                <p style={{ margin: 0, fontSize: '9px', color: colors.accent.green, fontWeight: 700, textTransform: 'uppercase' }}>{d.toLocaleDateString(localeOf(lang), { weekday: 'short' })}</p>
                                                <p style={{ margin: '2px 0', fontSize: '22px', fontWeight: 800, color: colors.accent.green, lineHeight: 1 }}>{d.getDate()}</p>
                                                <p style={{ margin: 0, fontSize: '9px', color: '#4ade8070', textTransform: 'uppercase' }}>{d.toLocaleDateString(localeOf(lang), { month: 'short' })}</p>
                                              </div>
                                              <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: colors.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                  {m.equipe_domicile} <span style={{ color: colors.border.strong, fontWeight: 400, fontSize: '12px' }}>vs</span> {m.equipe_exterieur}
                                                </p>
                                                <p style={{ margin: 0, fontSize: '11px', color: colors.text.faint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                  {[m.heure, m.competition, m.lieu ? `📍 ${m.lieu}` : ''].filter(Boolean).join(' · ')}
                                                </p>
                                              </div>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Classements — pleine largeur */}
                                  <div>
                                    <p style={{ margin: '0 0 12px', fontSize: '10px', fontWeight: 700, color: colors.text.disabled, letterSpacing: '2px', textTransform: 'uppercase' }}>{t('aff_classements_equipe', lang)}</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '12px' }}>
                                      {[
                                        { title: t('aff_top_buteurs', lang), icon: '⚽', data: s.leaderButs, color: colors.accent.green },
                                        { title: t('aff_top_passeurs', lang), icon: '🎯', data: s.leaderPasses, color: colors.accent.blue },
                                        { title: t('aff_top_victoires', lang), icon: '🏆', data: s.leaderVictoires, color: colors.accent.amber },
                                        { title: t('aff_points_seance', lang), icon: '⭐', data: s.leaderPoints, color: colors.accent.purpleLight },
                                      ].map(({ title, icon, data, color }) => (
                                        <div key={title} style={{ background: colors.background.surface, borderRadius: '18px', padding: '16px', border: `1px solid ${colors.border.subtle}`, position: 'relative', overflow: 'hidden' }}>
                                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${color}60, transparent)` }} />
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                                            <span>{icon}</span>
                                            <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</p>
                                          </div>
                                          {data?.length > 0 ? data.slice(0, 5).map((row, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', background: row.isMe ? `${color}10` : 'transparent', borderRadius: '8px', padding: '5px 6px', border: row.isMe ? `1px solid ${color}25` : '1px solid transparent' }}>
                                              <span style={{ fontSize: '10px', fontWeight: 800, color: i === 0 ? colors.accent.amber : colors.icon.muted, width: '14px', flexShrink: 0 }}>{i + 1}</span>
                                              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: row.isMe ? `${color}20` : colors.background.raised, border: `1px solid ${row.isMe ? color + '40' : colors.border.default}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 800, color: row.isMe ? color : colors.text.faint, flexShrink: 0 }}>
                                                {row.nom.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                              </div>
                                              <span style={{ fontSize: '11px', color: row.isMe ? color : colors.text.dim, flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontWeight: row.isMe ? 700 : 400 }}>
                                                {row.isMe ? t('jcoach_toi', lang) : row.nom.split(' ')[0]}
                                              </span>
                                              <span style={{ fontSize: '12px', fontWeight: 800, color: row.isMe ? color : colors.text.faint, flexShrink: 0 }}>{row.val}</span>
                                            </div>
                                          )) : <p style={{ margin: 0, fontSize: '11px', color: colors.border.strong }}>—</p>}
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {s.ligueUrl && (
                                    <a href={s.ligueUrl} target="_blank" rel="noopener noreferrer"
                                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '14px', border: '1px solid #fbbf2430', background: 'linear-gradient(135deg, #fbbf2410, #f59e0b08)', color: colors.accent.amber, fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
                                      🏆 {t('aff_classement_championnat', lang)} →
                                    </a>
                                  )}
                                </div>
                              )
                            })()}

                            {/* Joueur lié mais pas encore dans l'effectif */}
                            {!a.equipe_joueur_id && (
                              <p style={{ margin: '8px 0 0', fontSize: '11px', color: colors.text.disabled, fontStyle: 'italic' }}>
                                ⏳ {t('aff_educateur_doit_lier', lang)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Historique */}
              {mesAffiliations.filter(a => a.statut === 'archive').length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <p style={{ fontSize: 11, color: colors.border.strong, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10 }}>
                    {t('jcoach_historique', lang).toUpperCase()}
                  </p>
                  {mesAffiliations.filter(a => a.statut === 'archive').map(af => {
                    const e = af.profil_educateur
                    return (
                      <div key={af.id} style={{ background: colors.background.sunken, border: `1px solid ${colors.border.subtle}`, borderRadius: 12, padding: '14px 16px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: colors.text.dim }}>{e?.prenom} {e?.nom}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: colors.border.strong }}>{e?.club}{e?.categorie ? ` · ${e.categorie}` : ''}</p>
                        </div>
                        {af.saison && (
                          <span style={{ fontSize: 11, color: colors.border.strong, background: colors.background.raised, padding: '3px 10px', borderRadius: 20 }}>
                            {af.saison}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Aucune affiliation active → inviter à rejoindre */}
              {mesAffiliations.filter(a => a.statut === 'accepte').length === 0 && (
                <div style={{ marginTop: 16 }}>
                  <EmptyState icon="🏟️" title={t('aff_nouvelle_saison', lang)} subtitle={t('aff_rejoins_equipe_code', lang)}>
                    <input
                      placeholder="CODE ÉQUIPE"
                      value={codeEquipe}
                      onChange={e => setCodeEquipe(e.target.value.toUpperCase())}
                      style={{ background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 10, padding: '10px 14px', color: colors.text.primary, fontSize: 15, fontFamily: 'monospace', letterSpacing: 2, textTransform: 'uppercase', width: '100%', marginBottom: 10, outline: 'none', boxSizing: 'border-box' }}
                    />
                    <button onClick={rejoindreEquipe} disabled={!codeEquipe.trim()}
                      style={{ ...st.btnSolid(), width: '100%' }}>
                      {t('jeq_rejoindre_btn', lang)}
                    </button>
                  </EmptyState>
                </div>
              )}
            </div>
          )}
          {onglet === 'annonces' && (
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 20px' }}>Actualités du club</h1>
              {annoncesClub.length === 0 ? (
                <p style={{ color: colors.text.disabled, fontSize: '13px', fontStyle: 'italic' }}>Aucune annonce pour le moment.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {annoncesClub.map(a => {
                    const lue = annoncesLuesIds.has(a.id)
                    return (
                      <div key={a.id} onClick={() => marquerAnnonceLue(a.id)}
                        style={{ background: colors.background.sunken, border: `1px solid ${lue ? colors.border.faint : colors.accent.green}`, borderRadius: '12px', padding: '18px', cursor: lue ? 'default' : 'pointer' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                          <h3 style={{ color: colors.text.primary, margin: 0, fontSize: '14px', fontWeight: 700 }}>{a.titre}</h3>
                          {!lue && <span style={{ background: colors.accent.green + '22', color: colors.accent.green, borderRadius: '6px', padding: '2px 7px', fontSize: '10px', fontWeight: 700 }}>Nouveau</span>}
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
          {onglet === 'profil' && (
            <div>
              <ProfilAffilieOnglet profil={profil} userId={userId} setProfil={setProfil} lang={lang} readOnly={readOnly} />
            </div>
          )}
          {onglet === 'equipement' && (
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 20px' }}>Mon équipement</h1>

              {equipementPret && (
                <div style={{ background: '#1a1200', border: `2px solid ${colors.accent.amber}`, borderRadius: '16px', padding: '18px', marginBottom: '20px' }}>
                  <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: 15 }}>Ton équipement est prêt !</p>
                  <p style={{ margin: '0 0 12px', fontSize: 13, color: colors.text.faint }}>
                    {equipementPret.jours || 'Passe le récupérer auprès du club'}
                    {equipementPret.heure_debut && equipementPret.heure_fin ? ` · entre ${equipementPret.heure_debut} et ${equipementPret.heure_fin}` : ''}
                    {equipementPret.heure_debut_2 && equipementPret.heure_fin_2 ? ` puis entre ${equipementPret.heure_debut_2} et ${equipementPret.heure_fin_2}` : ''}
                  </p>
                  <button onClick={marquerEquipementRecupere} style={{ background: colors.accent.amber, color: colors.black, border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>J'ai récupéré</button>
                </div>
              )}

              {equipementCommande?.statut === 'recupere' && equipementCommande?.recupere_le && (
                <div style={{ background: colors.accent.green + alpha.subtle, border: `1px solid ${colors.accent.green}40`, borderRadius: '16px', padding: '18px', marginBottom: '20px' }}>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: colors.accent.green }}>Équipement remis le {new Date(equipementCommande.recupere_le).toLocaleDateString('fr-FR')} à {new Date(equipementCommande.recupere_le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              )}

              {!packAttribue ? (
                <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
                  <p style={{ color: colors.text.faint, fontSize: 14 }}>Aucun pack ne t'a encore été attribué. Ton club te l'assignera prochainement.</p>
                </div>
              ) : (
                <>
                  <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '12px', padding: '18px 22px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '24px' }}>{packAttribue.icone}</span>
                    <div>
                      <p style={{ margin: 0, color: colors.accent.green, fontWeight: 700, fontSize: 15 }}>{packAttribue.nom}</p>
                      <p style={{ margin: 0, color: colors.text.faint, fontSize: 12 }}>{champsEquipement.length} article{champsEquipement.length > 1 ? 's' : ''} à renseigner</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {champsEquipement.map(c => {
                      const valeur = mesTailles.find(t => t.champ_id === c.id)?.valeur || ''
                      return (
                        <div key={c.id}>
                          <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: colors.text.dim, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{c.nom}</p>
                          {c.taille_unique ? (
                            <p style={{ margin: 0, fontSize: 13, color: colors.text.faint, fontStyle: 'italic' }}>Taille unique</p>
                          ) : (
                            <select value={valeur} onChange={e => sauvegarderMaTaille(c.id, e.target.value)}
                              style={{ width: '100%', maxWidth: '240px', background: colors.background.raised, border: `1px solid ${valeur ? colors.accent.green : colors.border.default}`, borderRadius: '8px', padding: '9px 12px', color: valeur ? colors.accent.green : colors.text.dim, fontSize: 13, fontWeight: 700, fontFamily: 'Inter, sans-serif', outline: 'none', cursor: 'pointer' }}>
                              <option value="">Choisir une taille</option>
                              {c.options.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}
          {onglet === 'analyses' && <UpgradeCard titre={t('aff_analyse_video_titre', lang)} texte={t('aff_analyse_video_desc', lang)} lang={lang} userId={userId} email={profil?.email} />}
          {onglet === 'feed' && <UpgradeCard titre={t('recrut_feed', lang)} texte={t('aff_feed_desc', lang)} lang={lang} userId={userId} email={profil?.email} />}
          {onglet === 'recruteurs' && <UpgradeCard titre={t('aff_messagerie_recruteurs_titre', lang)} texte={t('aff_messagerie_recruteurs_desc', lang)} lang={lang} userId={userId} email={profil?.email} />}
        </main>
      </div>
    )
  }

  // ── FAN ──
  if (profil?.plan === 'fan') {
    const fanNavItems = [
      { id: 'accueil', label: 'Accueil' },
      { id: 'favoris', label: 'Mes Favoris' },
      { id: 'messages', label: 'Messages' },
    ]
    const allerVersFanOnglet = (id) => {
      setFanOnglet(id)
      if (id === 'favoris') chargerFanFavoris()
      setSidebarOpen(false)
    }
    return (
      <div style={{ minHeight: '100vh', background: colors.background.base, color: colors.text.primary, fontFamily: 'Inter, sans-serif', display: 'flex' }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'); * { box-sizing: border-box; } .fan-nav-btn:hover { background: ${colors.background.surface} !important; }`}</style>

        {isMobile && sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 190 }} />
        )}

        {/* ── Sidebar fixe (drawer sur mobile) ── */}
        <aside style={{
          position: 'fixed', top: 0, left: isMobile ? (sidebarOpen ? 0 : -240) : 0, height: '100vh', width: '220px',
          background: colors.background.base, borderRight: `1px solid ${colors.border.subtle}`, display: 'flex', flexDirection: 'column',
          padding: '24px 12px', zIndex: 200, transition: isMobile ? 'left 0.25s ease' : 'none',
        }}>
          <div style={{ fontSize: '14px', fontWeight: 800, padding: '0 8px', marginBottom: '28px' }}>
            Digital<span style={{ color: colors.accent.green }}>Football</span>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
            {fanNavItems.map(item => (
              <button key={item.id} className="fan-nav-btn" onClick={() => allerVersFanOnglet(item.id)}
                style={{
                  padding: '10px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                  background: fanOnglet === item.id ? colors.accent.green + alpha.soft : 'transparent',
                  color: fanOnglet === item.id ? colors.accent.green : colors.text.dim,
                  border: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'background 0.15s',
                }}>
                {item.label}
              </button>
            ))}
          </nav>
          <div style={{ paddingTop: '12px', borderTop: `1px solid ${colors.border.subtle}` }}>
            <p style={{ fontSize: '11px', color: colors.text.disabled, padding: '0 8px', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profil?.prenom}</p>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={handleLogout}
                style={{ flex: 1, minWidth: 0, padding: '10px 14px', borderRadius: '10px', border: 'none', background: 'transparent', color: colors.text.disabled, fontSize: '12px', cursor: 'pointer', textAlign: 'left', fontFamily: 'Inter, sans-serif' }}>
                Déconnexion
              </button>
              <ThemeToggleButton />
            </div>
          </div>
        </aside>

        {/* ── Contenu ── */}
        <div style={{ flex: 1, minWidth: 0, marginLeft: isMobile ? 0 : '220px' }}>
          {isMobile && (
            <button onClick={() => setSidebarOpen(true)}
              style={{ background: 'none', border: 'none', color: colors.text.primary, fontSize: 24, cursor: 'pointer', padding: '1rem 1.5rem 0' }}>
              ☰
            </button>
          )}

          <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
          {fanOnglet === 'accueil' && (
            <>
              <div style={{ background: colors.background.surface, border: '1px solid #4ade8020', borderRadius: '20px', padding: '2.5rem', marginBottom: '16px', textAlign: 'center' }}>
                <div style={{ width: '64px', height: '64px', background: '#4ade8010', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: colors.accent.green }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
                </div>
                <h1 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.5px' }}>Compte Fan</h1>
                <p style={{ color: colors.text.faint, fontSize: '14px', margin: '0 0 1.5rem', lineHeight: 1.6 }}>Like, commente et sauvegarde les meilleurs reels Jogabonito.</p>
                <button onClick={() => navigate('/jogabonito')} style={st.btnSolid()}>
                  Voir Jogabonito
                </button>
              </div>
              <div style={{ background: colors.background.surface, border: '1px solid #4ade8030', borderRadius: '20px', padding: '2rem' }}>
                <div style={{ display: 'inline-block', background: colors.accent.green + alpha.subtle, color: colors.accent.green, fontSize: '10px', fontWeight: 800, padding: '4px 12px', borderRadius: '20px', marginBottom: '14px', letterSpacing: '1px' }}>PASSE JOUEUR</div>
                <h2 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.3px' }}>Expose ton talent aux recruteurs</h2>
                <p style={{ color: colors.text.faint, fontSize: '13px', marginBottom: '1.5rem', lineHeight: 1.6 }}>Publie tes vidéos, reçois des analyses d'expert et sois visible des clubs et agents.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
                  {[{ plan: 'Mensuel', prix: '10€/mois', desc: '2 analyses / mois · Reels Jogabonito' }, { plan: 'Annuel', prix: '100€/an', desc: '3 analyses / mois · Feed · Visible recruteurs' }].map(p => (
                    <div key={p.plan} style={{ background: colors.background.surfaceAlt, borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div><p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{p.plan}</p><p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.disabled }}>{p.desc}</p></div>
                      <span style={{ color: colors.accent.green, fontWeight: 700, fontSize: '14px' }}>{p.prix}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => navigate('/register')} style={{ ...st.btnSolid(), width: '100%' }}>Devenir joueur</button>
              </div>
            </>
          )}

          {fanOnglet === 'favoris' && (
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '1.5rem', letterSpacing: '-0.3px' }}>Reels sauvegardés</h2>
              {loadingFanFavoris ? (
                <p style={{ color: colors.accent.green, textAlign: 'center', fontSize: '14px' }}>Chargement...</p>
              ) : fanFavoris.length === 0 ? (
                <EmptyState
                  icon={<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
                  title="Aucun reel sauvegardé"
                  subtitle="Swipe sur Jogabonito et tape Save pour les retrouver ici."
                  cta={{ label: 'Aller sur Jogabonito', onClick: () => navigate('/jogabonito') }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {fanFavoris.map(reel => (
                    <div key={reel.id} style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '12px', padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <Avatar person={reel.profiles} size={44} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{reel.profiles?.prenom} {reel.profiles?.nom}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.accent.green }}>{reel.profiles?.poste}{reel.profiles?.categorie ? ` · ${reel.profiles.categorie}` : ''}</p>
                        {reel.titre && <p style={{ margin: '4px 0 0', fontSize: '12px', color: colors.text.disabled, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{reel.titre}</p>}
                      </div>
                      <button onClick={() => navigate('/jogabonito')} style={{ background: '#4ade8010', border: '1px solid #4ade8030', color: colors.accent.green, padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', flexShrink: 0, fontFamily: 'Inter, sans-serif' }}>Voir</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {fanOnglet === 'messages' && (
            <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '20px', padding: '3rem 2rem', textAlign: 'center' }}>
              <div style={{ color: colors.icon.muted, display: 'flex', justifyContent: 'center', marginBottom: '16px' }}><IconLock /></div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.3px' }}>Plan Pro requis</h2>
              <p style={{ fontSize: '13px', color: colors.text.faint, maxWidth: '340px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>Passe au Plan Pro pour recevoir des messages de recruteurs et clubs.</p>
              <button onClick={() => window.open(stripeUrl(STRIPE_LINKS.pro, userId, profil?.email), '_blank')} style={st.btnSolid()}>{t('aff_pro_prix', lang)}</button>
            </div>
          )}
          </div>
        </div>
      </div>
    )
  }

  // ── PAS ABONNÉ ──
  // Un joueur affilié (accepté) à un éducateur/club a un accès inclus via son
  // club — abonnement_actif ne concerne que les comptes "fan" indépendants,
  // pas encore rattachés à une équipe. mesAffiliations est déjà chargé à ce
  // stade (chargerAffiliations() termine avant setLoading(false), cf. getProfil()).
  const affilieAccepte = mesAffiliations.some(a => a.statut === 'accepte')
  if (!profil?.abonnement_actif && !affilieAccepte) {
    return (
      <div style={{ minHeight: '100vh', background: colors.background.base, color: colors.text.primary, fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');`}</style>
        <div style={{ maxWidth: '400px', width: '100%', background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '20px', padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.5px' }}>Digital<span style={{ color: colors.accent.green }}>Football</span></div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.3px' }}>Abonnement non actif</h1>
          <p style={{ fontSize: '13px', color: colors.text.faint, marginBottom: '1.5rem' }}>Ton paiement n'a pas encore été confirmé.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.5rem' }}>
            <button onClick={() => window.open(stripeUrl(STRIPE_LINKS.starter, userId, profil?.email), '_blank')} style={{ background: 'transparent', color: colors.text.primary, border: `1px solid ${colors.border.default}`, padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Activer — {t('aff_starter_prix', lang)}</button>
            <button onClick={() => window.open(stripeUrl(STRIPE_LINKS.pro, userId, profil?.email), '_blank')} style={{ background: colors.accent.green, color: colors.background.base, border: 'none', padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Activer — {t('aff_pro_prix', lang)}</button>
          </div>
          <span onClick={handleLogout} style={{ color: colors.text.disabled, fontSize: '12px', cursor: 'pointer' }}>Déconnexion</span>
        </div>
      </div>
    )
  }

  // ── DASHBOARD PRINCIPAL ──
  const isPro = profil?.plan === 'joueur_pro'

  const navItems = [
    { id: 'dashboard', label: t('jnav_accueil', lang), icon: <IconHome /> },
    { id: 'equipe', label: t('jnav_equipe', lang), icon: <IconUsers />, badge: mesAffiliations.filter(a => a.statut === 'en_attente').length, section: t('jsec_equipe', lang) },
    { id: 'annonces', label: 'Actualités du club', icon: <IconMessage />, badge: annoncesClub.filter(a => !annoncesLuesIds.has(a.id)).length },
    { id: 'competition', label: t('jnav_competition', lang), icon: <IconTrophy /> },
    { id: 'prep_physique', label: t('jnav_prep_physique', lang), icon: <IconDumbbell /> },
    { id: 'equipement', label: 'Équipement', icon: <IconShirt /> },
    { id: 'analyses', label: t('jnav_analyses', lang), icon: <IconChart />, badge: demandes.filter(d => d.statut === 'analyse').length, section: t('jsec_developpement', lang) },
    { id: 'coach', label: t('jnav_coach', lang), icon: <IconMic />, badge: coachUnread, section: t('jsec_developpement', lang) },
    { id: 'profil', label: t('jnav_profil', lang), icon: <IconUser />, section: t('jsec_profil', lang) },
    { id: 'carte', label: t('jnav_carte', lang), icon: <IconCard />, section: t('jsec_profil', lang) },
    { id: 'certif', label: t('jnav_certif', lang), icon: <IconBadge />, section: t('jsec_profil', lang) },
    { id: 'clubs', label: t('jnav_explorer', lang), icon: <IconBuilding />, section: t('jsec_reseau', lang) },
    { id: 'messages', label: t('jnav_recruteurs', lang), icon: <IconMessage />, badge: conversations.length, section: t('jsec_reseau', lang) },
  ]

  // Ids DOM sur les boutons de nav (toujours montés, contrairement au contenu des
  // onglets) — cibles utilisées par OnboardingGuide pour surligner chaque rubrique.
  const NAV_SECTION_IDS = {
    equipe: 'equipe-section',
    prep_physique: 'prep-physique-section',
    analyses: 'analyses-section',
    coach: 'coach-section',
    profil: 'profile-section',
    carte: 'carte-section',
    certif: 'certif-section',
    clubs: 'clubs-section',
    messages: 'messages-section',
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.background.base, color: colors.text.primary, fontFamily: 'Inter, sans-serif', display: 'flex', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${colors.border.default}; border-radius: 2px; }
        input:focus, select:focus, textarea:focus { border-color: #4ade8060 !important; box-shadow: 0 0 0 3px #4ade8008; }
        .dj-nav-btn:hover { background: ${colors.background.sunken} !important; color: ${colors.text.secondary} !important; }
        .dj-action-card:hover { transform: translateY(-2px); border-color: ${colors.border.default} !important; }
        .dj-btn-green:hover { background: #22c55e !important; }
        .dj-bottom-nav-btn:hover { color: ${colors.text.secondary} !important; }
      `}</style>

      {/* ── Guide onboarding (1ère connexion) + aide flottante (toujours visible) ── */}
      <OnboardingGuide key={onboardingKey} userId={userId} accentColor={colors.accent.green} />
      <FloatingHelper userId={userId} onReplayOnboarding={replayOnboarding} accentColor={colors.accent.green} estAccueil={onglet === 'accueil' || onglet === 'dashboard'} />

      {popupEquipementPret}

      {/* ── SIDEBAR ── */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 40 }} />
      )}

      <aside style={{
        width: '220px', background: colors.background.sunken, borderRight: `1px solid ${colors.border.subtle}`, display: 'flex', flexDirection: 'column', flexShrink: 0,
        ...(isMobile ? {
          position: 'fixed', top: 0, left: sidebarOpen ? 0 : -240, height: '100%', zIndex: 50, transition: 'left 0.25s ease', overflowY: 'auto', paddingTop: 'env(safe-area-inset-top, 0px)',
        } : {
          position: 'sticky', top: 0, height: '100vh', minHeight: '100vh', overflowY: 'auto',
        }),
      }}>
        <div style={{ padding: '24px 20px 20px', borderBottom: `1px solid ${colors.border.subtle}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.5px' }}>
            Digital<span style={{ color: colors.accent.green }}>Football</span>
          </div>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: 20, cursor: 'pointer' }}>✕</button>
          )}
        </div>

        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {navItems.map((item, i) => (
            <div key={item.id}>
              {item.section && item.section !== navItems[i - 1]?.section && (
                <div style={{ color: colors.border.strong, fontSize: '10px', fontWeight: 800, letterSpacing: '1.5px', padding: '16px 12px 6px', textTransform: 'uppercase' }}>
                  {item.section}
                </div>
              )}
              <button className="dj-nav-btn"
                id={NAV_SECTION_IDS[item.id]}
                onClick={() => { setOnglet(item.id); setSidebarOpen(false) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: onglet === item.id ? '#4ade8012' : 'transparent', color: onglet === item.id ? colors.accent.green : item.locked ? colors.border.strong : colors.text.faint, fontSize: '13px', fontWeight: onglet === item.id ? 700 : 400, textAlign: 'left', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s', position: 'relative' }}>
                <span style={{ flexShrink: 0 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.locked && <span style={{ fontSize: '12px', opacity: 0.4 }}>🔒</span>}
                {item.badge > 0 && (
                  <span style={{ background: colors.accent.green, color: colors.black, fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '20px', letterSpacing: '0.3px' }}>
                    {item.badge}
                  </span>
                )}
                {onglet === item.id && (
                  <div style={{ position: 'absolute', left: 0, top: '20%', height: '60%', width: '3px', background: colors.accent.green, borderRadius: '0 3px 3px 0' }} />
                )}
              </button>
            </div>
          ))}
        </nav>

        {/* Clochette notifications */}
        <div style={{ padding: '0 10px 12px', position: 'relative' }}>
          <button onClick={() => setNotifDropdownOpen(!notifDropdownOpen)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'transparent', color: colors.text.faint, fontSize: '13px', fontFamily: 'Inter, sans-serif', position: 'relative' }}>
            <span style={{ fontSize: '16px' }}>🔔</span>
            <span style={{ flex: 1, textAlign: 'left' }}>Notifications</span>
            {notifications.filter(n => !n.lu).length > 0 && (
              <span style={{ background: colors.accent.green, color: colors.black, fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '20px' }}>
                {notifications.filter(n => !n.lu).length}
              </span>
            )}
          </button>

          {notifDropdownOpen && (
            <div style={{ position: 'absolute', bottom: '100%', left: '10px', right: '10px', background: colors.background.surface, border: `1px solid ${colors.border.faint}`, borderRadius: '14px', maxHeight: '400px', overflowY: 'auto', marginBottom: '8px', zIndex: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border.subtle}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>Notifications</p>
                {notifications.some(n => !n.lu) && (
                  <button onClick={() => marquerToutLu(userId)} style={{ background: 'none', border: 'none', color: colors.accent.green, fontSize: '11px', cursor: 'pointer' }}>Tout marquer lu</button>
                )}
              </div>
              {notifications.length === 0 ? (
                <EmptyState compact title="Aucune notification" />
              ) : (
                notifications.map(n => (
                  <div key={n.id} onClick={() => { marquerNotifLue(n.id); setNotifDropdownOpen(false); if (n.lien) navigate(n.lien) }}
                    style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border.subtle}`, cursor: 'pointer', background: n.lu ? 'transparent' : colors.accent.green + alpha.faint }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      {!n.lu && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors.accent.green, marginTop: '5px', flexShrink: 0 }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: '12px', fontWeight: n.lu ? 400 : 700 }}>{n.titre}</p>
                        {n.contenu && <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.contenu}</p>}
                        <p style={{ margin: '4px 0 0', fontSize: '10px', color: colors.border.strong }}>{new Date(n.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div style={{ padding: '16px 12px', borderTop: `1px solid ${colors.border.subtle}`, marginTop: 'auto' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[['fr','🇫🇷'],['en','🇬🇧'],['pt','🇧🇷'],['es','🇪🇸'],['it','🇮🇹'],['de','🇩🇪']].map(([code, flag]) => (
              <button key={code} onClick={() => setLang(code)}
                style={{ background: lang === code ? colors.accent.green + alpha.soft : 'transparent', border: `1px solid ${lang === code ? colors.accent.green : colors.border.default}`, borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '14px', color: lang === code ? colors.accent.green : colors.text.faint }}>
                {flag}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '12px 10px 20px', borderTop: `1px solid ${colors.border.subtle}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', marginBottom: '8px' }}>
            <Avatar person={profil} size={32} border="1.5px solid #4ade8040" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profil?.prenom} {profil?.nom}</p>
              <p style={{ margin: '1px 0 0', fontSize: '10px', color: colors.accent.green, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>{profil?.plan}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={handleLogout} style={{ flex: 1, minWidth: 0, background: 'transparent', border: `1px solid ${colors.border.subtle}`, color: colors.text.disabled, padding: '8px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              Déconnexion
            </button>
            <ThemeToggleButton />
          </div>
        </div>
      </aside>

      {isMobile && (
        <div style={{ position: 'fixed', top: 'calc(16px + env(safe-area-inset-top, 0px))', right: '16px', zIndex: 150 }}>
          <button onClick={() => setNotifDropdownOpen(!notifDropdownOpen)} style={{ width: '40px', height: '40px', borderRadius: '50%', background: colors.background.surface, border: `1px solid ${colors.border.faint}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
          <span style={{ fontSize: '18px' }}>🔔</span>
          {notifications.filter(n => !n.lu).length > 0 && (
            <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: colors.accent.green, color: colors.black, fontSize: '9px', fontWeight: 800, width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {notifications.filter(n => !n.lu).length}
            </span>
          )}
          </button>
          {notifDropdownOpen && (
            <div style={{ position: 'absolute', top: '48px', right: 0, width: '300px', background: colors.background.surface, border: `1px solid ${colors.border.faint}`, borderRadius: '14px', maxHeight: '400px', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border.subtle}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>Notifications</p>
                {notifications.some(n => !n.lu) && (
                  <button onClick={() => marquerToutLu(userId)} style={{ background: 'none', border: 'none', color: colors.accent.green, fontSize: '11px', cursor: 'pointer' }}>Tout marquer lu</button>
                )}
              </div>
              {notifications.length === 0 ? (
                <EmptyState compact title="Aucune notification" />
              ) : (
                notifications.map(n => (
                  <div key={n.id} onClick={() => { marquerNotifLue(n.id); setNotifDropdownOpen(false); if (n.lien) navigate(n.lien) }}
                    style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border.subtle}`, cursor: 'pointer', background: n.lu ? 'transparent' : colors.accent.green + alpha.faint }}>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: n.lu ? 400 : 700 }}>{n.titre}</p>
                    {n.contenu && <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.dim }}>{n.contenu}</p>}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', minHeight: '100vh' }}>

        {!readOnly && <NotificationBanner userId={userId} cibles={['tous', 'joueurs']} />}

        {isMobile && (
          <button onClick={() => setSidebarOpen(true)}
            style={{ background: 'none', border: 'none', color: colors.text.primary, fontSize: 24, cursor: 'pointer', padding: 'calc(20px + env(safe-area-inset-top, 0px)) 16px 0', display: 'block' }}>
            ☰
          </button>
        )}

        {/* ── ACCUEIL ── */}
        {onglet === 'dashboard' && (
          <div style={{ padding: isMobile ? '16px' : '24px 40px' }}>

            {/* HERO CARD — pleine largeur */}
            <div style={{ position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${colors.accent.green}${alpha.faint} 0%, ${colors.background.sunken} 100%)`, border: `1px solid ${colors.accent.green}${alpha.light}`, borderRadius: 16, padding: 20, marginBottom: '20px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'center' : 'center', textAlign: isMobile ? 'center' : 'left', gap: isMobile ? '14px' : '24px', flexWrap: 'wrap' }}>
              <div style={{ position: 'absolute', top: '-40%', right: '-10%', width: '420px', height: '420px', background: 'radial-gradient(circle, #4ade8014 0%, transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Avatar person={profil} size={88} border="2.5px solid #4ade80" />
                <label style={{ position: 'absolute', bottom: 0, right: 0, width: '26px', height: '26px', background: colors.accent.green, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: avatarUploading ? 'wait' : 'pointer', border: `2.5px solid ${colors.background.surface}` }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} disabled={avatarUploading} />
                </label>
              </div>
              <div style={{ position: 'relative', flex: 1, minWidth: isMobile ? '100%' : '200px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px' }}>{profil?.prenom} {profil?.nom}</h1>
                  <span style={{ background: isPro ? colors.accent.green : '#3b82f6', color: colors.black, fontSize: '10px', fontWeight: 800, padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.8px', textTransform: 'uppercase', flexShrink: 0, boxShadow: '0 0 12px rgba(74,222,128,0.2)' }}>
                    {profil?.plan}
                  </span>
                  {profil?.numero_licence && (
                    <span style={{ background: '#1a2e4a', border: '1px solid #3b82f640', color: colors.accent.blue, fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.5px', flexShrink: 0 }}>
                      🪪 {t('jd_licencie', lang)}
                    </span>
                  )}
                </div>
                <p style={{ color: colors.text.faint, fontSize: '13px', marginBottom: '20px' }}>
                  {profil?.poste || '—'}{profil?.club ? ` · ${profil.club}` : ''}{profil?.region ? ` · ${profil.region}` : ''}
                </p>
                <div style={{ display: 'flex', justifyContent: isMobile ? 'center' : 'flex-start', gap: isMobile ? '16px' : '32px', flexWrap: 'wrap' }}>
                  {[
                    { val: profil?.analyses_restantes ?? '—', label: t('jd_analyses_stat', lang) },
                    { val: demandes.length, label: t('jd_demandes_stat', lang) },
                    { val: profil?.categorie || '—', label: t('equipe_categorie', lang) },
                  ].map((s, i, arr) => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '16px' : '32px' }}>
                      <div>
                        <p style={{ fontSize: isMobile ? '20px' : '30px', fontWeight: 800, lineHeight: 1, color: colors.text.primary }}>{s.val}</p>
                        <p style={{ fontSize: isMobile ? '9px' : '10px', color: colors.text.disabled, textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600, marginTop: '4px' }}>{s.label}</p>
                      </div>
                      {i < arr.length - 1 && <div style={{ width: '1px', height: '36px', background: colors.border.faint }} />}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CONVOCATION — publiée par l'éducateur pour un match à venir, disparaît
                automatiquement le dimanche 20h suivant le match (filtré côté RLS, cf.
                chargerConvocationActive) */}
            {convocationActive && (() => {
              const m = convocationActive.matchs_equipe
              return (
                <div style={{ background: `linear-gradient(135deg, ${colors.accent.green}${alpha.subtle} 0%, ${colors.background.surface} 100%)`, border: '2px solid #4ade80', borderRadius: isMobile ? '16px' : '20px', padding: isMobile ? '20px' : '28px', marginBottom: isMobile ? '16px' : '20px', position: 'relative', overflow: 'hidden' }}>
                  {m?.competition && (
                    <div style={{ position: 'absolute', top: isMobile ? 12 : 20, right: isMobile ? 12 : 20, background: colors.accent.green, color: colors.black, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                      {m.competition}
                    </div>
                  )}
                  <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: colors.text.primary, marginBottom: 4 }}>📋 Tu es convoqué !</div>
                  <div style={{ color: colors.accent.green, fontWeight: 700, fontSize: isMobile ? 20 : 26, marginBottom: 8 }}>
                    {m?.domicile ? 'vs' : '@'} {m?.adversaire}
                  </div>
                  <div style={{ color: colors.text.faint, fontSize: isMobile ? 13 : 15, marginBottom: 16 }}>
                    {m?.date && new Date(`${m.date}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    {m?.heure ? ` · ${m.heure.slice(0, 5)}` : ''}
                    {m?.lieu ? ` · ${m.lieu}` : ''}
                  </div>

                  {convocationActive.timeline?.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ color: colors.text.disabled, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Programme</div>
                      {convocationActive.timeline.map((step, i) => (
                        <div key={i} style={{ display: 'flex', gap: isMobile ? 12 : 16, alignItems: 'center', padding: isMobile ? '6px 0' : '8px 0', borderBottom: i < convocationActive.timeline.length - 1 ? `1px solid ${colors.border.subtle}` : 'none' }}>
                          <span style={{ color: colors.accent.green, fontWeight: 700, fontSize: isMobile ? 13 : 15, minWidth: 50 }}>{step.heure}</span>
                          <span style={{ fontSize: isMobile ? 14 : 18 }}>{step.icone || '📌'}</span>
                          <span style={{ color: colors.text.secondary, fontSize: isMobile ? 13 : 15 }}>{step.label}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {convocationActive.notes && (
                    <p style={{ color: colors.text.secondary, fontSize: isMobile ? 13 : 14, fontStyle: 'italic', background: colors.background.base, borderRadius: 8, padding: '10px 12px', marginBottom: 16 }}>
                      {convocationActive.notes}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: isMobile ? 10 : 12, marginBottom: 16 }}>
                    <button onClick={() => repondreConvocation('present')}
                      style={{ flex: 1, background: repConvoc === 'present' ? colors.accent.green : colors.background.raised, color: repConvoc === 'present' ? colors.black : colors.text.primary, border: 'none', borderRadius: 10, padding: isMobile ? '10px 20px' : '14px 20px', fontWeight: 700, fontSize: isMobile ? 13 : 15, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                      ✅ Présent
                    </button>
                    <button onClick={() => repondreConvocation('absent')}
                      style={{ flex: 1, background: repConvoc === 'absent' ? colors.accent.red : colors.background.raised, color: colors.text.primary, border: 'none', borderRadius: 10, padding: isMobile ? '10px 20px' : '14px 20px', fontWeight: 700, fontSize: isMobile ? 13 : 15, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                      ❌ Absent
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {convocationActive.type_terrain && (
                      <div style={{ background: colors.background.raised, borderRadius: 8, padding: '6px 12px', fontSize: 12, color: colors.text.dim }}>🌿 {convocationActive.type_terrain}</div>
                    )}
                    {convocationActive.arbitre_nom && (
                      <div style={{ background: colors.background.raised, borderRadius: 8, padding: '6px 12px', fontSize: 12, color: colors.text.dim }}>🏳️ Arbitre : {convocationActive.arbitre_nom}</div>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* COMPOSITION — terrain visuel de la composition, publiée par
                l'éducateur depuis sa fiche de causerie avant-match (lecture
                seule ici). Indépendante de la convocation ci-dessus : deux
                fonctionnalités distinctes côté éducateur, cf. CauserieAvantMatch.jsx. */}
            {compositionActive && (
              <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: isMobile ? '16px' : '20px', padding: isMobile ? '16px' : '24px', marginBottom: isMobile ? '16px' : '20px' }}>
                <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: isMobile ? '16px' : '18px', color: colors.text.primary }}>Composition</p>
                <p style={{ margin: '0 0 16px', color: colors.text.faint, fontSize: 13 }}>
                  vs {compositionActive.adversaire}
                  {compositionActive.date_match && ` · ${new Date(`${compositionActive.date_match}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`}
                </p>
                <CompositionTerrain
                  formation={compositionActive.formation || '4-4-2'}
                  titulaires={compositionActive.titulaires || []}
                  remplacants={compositionActive.remplacants || []}
                  modeEdit={false}
                  affichageNom={compositionActive.composition_affichage_nom || 'nom'}
                />
              </div>
            )}

            {/* PLANNING DE LA SEMAINE — fusionné avec le sondage de présence (une seule
                section : mêmes événements, boutons de présence en plus) au lieu de deux
                blocs redondants côte à côte (si affilié à un éducateur) */}
            {(() => {
              const aff = mesAffiliations.find(af => af.statut === 'accepte')
              if (!aff) return null
              return <SondageSemaine mode="joueur" userId={userId} educateurId={aff.educateur_id} accentColor={colors.accent.green} />
            })()}
            {tauxPresenceAccueil && (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
                <CerclePresence {...tauxPresenceAccueil} style={{ minWidth: 0, width: '100%' }} />
                <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                  <p style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: colors.accent.green }}>{tauxPresenceAccueil.buts}<span style={{ fontSize: '15px', fontWeight: 700, color: colors.text.faint }}> / {tauxPresenceAccueil.passes}</span></p>
                  <p style={{ margin: '8px 0 0', fontSize: '12px', fontWeight: 700, color: colors.text.primary }}>Buts / Passes D.</p>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.faint }}>cette saison</p>
                </div>
                <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                  <p style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: colors.accent.blue }}>{tauxPresenceAccueil.minutesJouees}</p>
                  <p style={{ margin: '8px 0 0', fontSize: '12px', fontWeight: 700, color: colors.text.primary }}>Minutes jouées</p>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.faint }}>
                    {tauxPresenceAccueil.matchsJoues > 0 ? `${Math.round(tauxPresenceAccueil.minutesJouees / tauxPresenceAccueil.matchsJoues)} min/match` : '—'}
                  </p>
                </div>
                <div style={{
                  background: colors.background.surface,
                  border: moyennePerso ? `1px solid ${moyennePerso >= 7 ? colors.accent.green : moyennePerso >= 5 ? colors.accent.amber : colors.accent.red}` : `1px solid ${colors.border.default}`,
                  borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box'
                }}>
                  {moyennePerso ? (
                    <>
                      <p style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: moyennePerso >= 7 ? colors.accent.green : moyennePerso >= 5 ? colors.accent.amber : colors.accent.red }}>
                        {moyennePerso}<span style={{ fontSize: '14px', color: colors.text.faint, marginLeft: '2px' }}>/10</span>
                      </p>
                      <p style={{ margin: '8px 0 0', fontSize: '12px', fontWeight: 700, color: colors.text.primary }}>Note coach</p>
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.faint, textAlign: 'center' }}>
                        sur {mesNotes.length} match{mesNotes.length > 1 ? 's' : ''} évalué{mesNotes.length > 1 ? 's' : ''}
                      </p>
                    </>
                  ) : (
                    <>
                      <p style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: colors.accent.amber }}>{tauxPresenceAccueil.serie}</p>
                      <p style={{ margin: '8px 0 0', fontSize: '12px', fontWeight: 700, color: colors.text.primary, textAlign: 'center' }}>
                        {tauxPresenceAccueil.serie > 1 ? 'présences de suite' : tauxPresenceAccueil.serie === 1 ? 'présent au dernier entraînement' : 'aucune série en cours'}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {mesNotes.length > 0 && (
              <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ color: colors.text.primary, fontSize: '15px', fontWeight: 600, margin: 0 }}>Mes évaluations coach</h3>
                  <span style={{ color: colors.text.faint, fontSize: '12px' }}>
                    Moyenne : <strong style={{ color: moyennePerso >= 7 ? colors.accent.green : moyennePerso >= 5 ? colors.accent.amber : colors.accent.red }}>{moyennePerso}/10</strong>
                  </span>
                </div>
                {(() => {
                  const n = mesNotes[0]
                  return (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 0' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: colors.text.primary, fontWeight: 600, fontSize: '14px' }}>
                          {n.matchs_equipe?.domicile ? 'vs' : '@'} {n.matchs_equipe?.adversaire || 'Match'}
                        </div>
                        <div style={{ color: colors.text.ghost, fontSize: '12px', marginTop: '2px' }}>
                          {n.matchs_equipe?.date ? new Date(n.matchs_equipe.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : ''}
                          {n.matchs_equipe?.score_nous != null ? ` · ${n.matchs_equipe.score_nous} - ${n.matchs_equipe.score_eux}` : ''}
                        </div>
                        {n.commentaire && (
                          <div style={{ color: colors.text.secondary, fontSize: '12px', fontStyle: 'italic', marginTop: '6px' }}>"{n.commentaire}"</div>
                        )}
                      </div>
                      <div style={{
                        fontSize: '22px', fontWeight: 700, marginLeft: '16px', flexShrink: 0,
                        color: n.note >= 7 ? colors.accent.green : n.note >= 5 ? colors.accent.amber : colors.accent.red
                      }}>
                        {n.note}/10
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Grille 2 colonnes desktop (1fr / 340px) — 1 colonne pleine largeur sur mobile */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 340px', gap: '20px', alignItems: 'start' }}>

              {/* ── Colonne gauche ── */}
              <div style={{ minWidth: 0 }}>

                {/* ACTION CARDS */}
                <div style={{ display: 'grid', gridTemplateColumns: isPro ? 'repeat(3, 1fr)' : '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                  <button className="dj-action-card" onClick={() => navigate('/jogabonito')}
                    style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '24px 20px', cursor: 'pointer', textAlign: 'left', color: colors.text.primary, fontFamily: 'Inter, sans-serif', transition: 'all 0.2s' }}>
                    <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#f9731612', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: colors.accent.orange }}>
                      <IconPlay />
                    </div>
                    <p style={{ fontWeight: 800, fontSize: '15px', marginBottom: '4px', letterSpacing: '-0.3px' }}>Jogabonito</p>
                    <p style={{ fontSize: '12px', color: colors.text.faint, lineHeight: 1.5 }}>Feed vertical · Reels des talents</p>
                  </button>

                  {isPro && (
                    <button className="dj-action-card" onClick={() => navigate('/feed')}
                      style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '24px 20px', cursor: 'pointer', textAlign: 'left', color: colors.text.primary, fontFamily: 'Inter, sans-serif', transition: 'all 0.2s' }}>
                      <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#4ade8012', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: colors.accent.green }}>
                        <IconGlobe />
                      </div>
                      <p style={{ fontWeight: 800, fontSize: '15px', marginBottom: '4px', letterSpacing: '-0.3px' }}>Feed</p>
                      <p style={{ fontSize: '12px', color: colors.text.faint, lineHeight: 1.5 }}>Talents · Visible recruteurs</p>
                    </button>
                  )}

                  <button id="upload-section" className="dj-action-card" onClick={() => navigate(isPro ? '/upload-clip' : '/upload-reel')}
                    style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '24px 20px', cursor: 'pointer', textAlign: 'left', color: colors.text.primary, fontFamily: 'Inter, sans-serif', transition: 'all 0.2s' }}>
                    <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#60a5fa12', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: colors.accent.blue }}>
                      <IconUpload />
                    </div>
                    <p style={{ fontWeight: 800, fontSize: '15px', marginBottom: '4px', letterSpacing: '-0.3px' }}>Publier</p>
                    <p style={{ fontSize: '12px', color: colors.text.faint, lineHeight: 1.5 }}>{isPro ? 'Clip Feed · Visible agents & clubs' : 'Reel Jogabonito · MP4 · TikTok'}</p>
                  </button>
                </div>

                {/* TEASER MON ÉQUIPE */}
                {(() => {
                  const aff = mesAffiliations.find(a => a.statut === 'accepte')
                  const pending = !aff && mesAffiliations.find(a => a.statut === 'en_attente')
                  if (aff) {
                    const pe = aff.profil_educateur
                    return (
                      <button onClick={() => setOnglet('equipe')} style={{ width: '100%', textAlign: 'left', background: `linear-gradient(135deg, ${colors.accent.green}${alpha.subtle} 0%, ${colors.background.surface} 100%)`, border: `1px solid ${colors.accent.green}${alpha.light}`, borderRadius: '16px', padding: '16px 20px', marginBottom: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', fontFamily: 'Inter, sans-serif', color: colors.text.primary }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: colors.accent.green + alpha.soft, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.accent.green, fontWeight: 800, fontSize: '16px', flexShrink: 0 }}>
                          {pe?.prenom?.[0]}{pe?.nom?.[0]}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pe?.club || `${pe?.prenom} ${pe?.nom}`}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '12px', color: colors.accent.green }}>{t('jeq_titre', lang)}</p>
                        </div>
                        <span style={{ color: colors.accent.green, fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>Stats →</span>
                      </button>
                    )
                  }
                  if (pending) {
                    return (
                      <div style={{ background: '#1f150a', border: '1px solid #f9731630', borderRadius: '16px', padding: '16px 20px', marginBottom: '20px' }}>
                        <p style={{ margin: 0, fontSize: '13px', color: colors.accent.orange, fontWeight: 700 }}>⏳ {t('profil_en_attente_club', lang)}</p>
                      </div>
                    )
                  }
                  return (
                    <button onClick={() => setOnglet('equipe')} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: `1px dashed ${colors.border.default}`, borderRadius: '16px', padding: '16px 20px', marginBottom: '20px', cursor: 'pointer', color: colors.text.faint, fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>
                      🔑 Rejoins ton équipe avec le code fourni par ton éducateur
                    </button>
                  )
                })()}

                {/* MESSAGES PREVIEW */}
                {conversations.length > 0 && (
                  <div style={{ background: colors.background.surface, border: '1px solid #4ade8018', borderRadius: '16px', padding: '20px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <p style={{ fontWeight: 700, fontSize: '13px', color: colors.accent.green }}>{t('jd_messages_rec', lang)}</p>
                      <button onClick={() => setOnglet('messages')} style={{ background: 'transparent', border: 'none', color: colors.text.disabled, fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{t('jd_voir_tout', lang)}</button>
                    </div>
                    {conversations.slice(0, 2).map(conv => (
                      <div key={conv.otherId}
                        onClick={() => { setMessageActif(conv); setOnglet('messages') }}
                        onMouseEnter={() => setHoveredCard(`msgprev-${conv.otherId}`)}
                        onMouseLeave={() => setHoveredCard(null)}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: colors.background.surfaceAlt, borderRadius: '10px', cursor: 'pointer', marginBottom: '6px', border: `1px solid ${hoveredCard === `msgprev-${conv.otherId}` ? colors.accent.green : 'transparent'}`, transform: hoveredCard === `msgprev-${conv.otherId}` ? 'translateY(-1px)' : 'none', transition: 'all 0.15s ease' }}>
                        <Avatar person={conv.other} size={32} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 700, fontSize: '13px', marginBottom: '1px' }}>{conv.other?.prenom} {conv.other?.nom}</p>
                          <p style={{ fontSize: '11px', color: colors.accent.green }}>{t('jd_recruteur_badge', lang)}</p>
                        </div>
                        <p style={{ fontSize: '12px', color: colors.border.strong, maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.msgs[0]?.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {convCoach.length > 0 && (
                  <div style={{ background: colors.background.surface, border: '1px solid #f9731618', borderRadius: '16px', padding: '20px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <p style={{ fontWeight: 700, fontSize: '13px', color: colors.accent.orange }}>{t('jd_reponses_coach', lang)}</p>
                      <button onClick={() => setOnglet('coach')} style={{ background: 'transparent', border: 'none', color: colors.text.disabled, fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{t('jd_voir_tout', lang)}</button>
                    </div>
                    {convCoach.slice(0, 1).map(conv => (
                      <div key={conv.otherId}
                        onClick={() => setOnglet('coach')}
                        onMouseEnter={() => setHoveredCard(`coachprev-${conv.otherId}`)}
                        onMouseLeave={() => setHoveredCard(null)}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: colors.background.surfaceAlt, borderRadius: '10px', cursor: 'pointer', border: `1px solid ${hoveredCard === `coachprev-${conv.otherId}` ? colors.accent.orange : 'transparent'}`, transform: hoveredCard === `coachprev-${conv.otherId}` ? 'translateY(-1px)' : 'none', transition: 'all 0.15s ease' }}>
                        <Avatar person={conv.other} size={32} bg="#f9731612" border="1.5px solid #f9731630" textColor={colors.accent.orange} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 700, fontSize: '13px', marginBottom: '1px' }}>{conv.other?.prenom} {conv.other?.nom}</p>
                          <p style={{ fontSize: '11px', color: colors.accent.orange }}>{t('jnav_coach', lang)}</p>
                        </div>
                        <p style={{ fontSize: '12px', color: colors.border.strong, maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.msgs[0]?.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Colonne droite ── */}
              <div style={{ minWidth: 0 }}>

                {/* QUOTA ANALYSES */}
                <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: colors.text.secondary, marginBottom: '3px' }}>{t('jd_quota_titre', lang)}</p>
                      <p style={{ fontSize: '11px', color: colors.text.disabled }}>{t('jd_quota_reset', lang)}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '26px', fontWeight: 900, color: (profil?.analyses_restantes || 0) > 0 ? colors.accent.green : colors.accent.red, lineHeight: 1 }}>
                        {profil?.analyses_restantes ?? 0}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {(profil?.analyses_restantes || 0) > 0 ? (
                      <button className="dj-btn-green" onClick={() => navigate('/upload')} style={{ ...st.btnSolid(), transition: 'background 0.15s' }}>
                        {t('jd_envoyer_video', lang)} →
                      </button>
                    ) : (
                      <p style={{ fontSize: '12px', color: colors.text.disabled, margin: 0, alignSelf: 'center' }}>{t('jd_quota_epuise', lang)}</p>
                    )}
                    <button onClick={() => window.open(stripeUrl(STRIPE_LINKS.analyse_unite, userId, profil?.email), '_blank')} style={{ background: 'transparent', color: colors.accent.green, border: '1px solid #4ade8040', padding: '10px 24px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                      {t('aff_acheter_analyse_cta', lang)}
                    </button>
                  </div>
                </div>

                {/* VIDÉO */}
                {profil?.clip_url ? (
                  <div style={{ background: colors.background.surface, border: '1px solid #4ade8020', borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '3px' }}>{t('jvid_partagee', lang)}</p>
                        <p style={{ fontSize: '11px', color: colors.text.disabled }}>{isPro ? t('jvid_feed_visible', lang) : 'Jogabonito uniquement'}</p>
                      </div>
                      <span style={{ background: colors.accent.green + alpha.subtle, color: colors.accent.green, fontSize: '10px', fontWeight: 800, padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.5px' }}>LIVE</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <a href={profil.clip_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: colors.accent.green, color: colors.black, padding: '9px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', textDecoration: 'none' }}>
                        {t('jvid_voir', lang)}
                      </a>
                      <button onClick={() => navigate('/upload-clip')} style={{ background: 'transparent', color: colors.text.faint, border: `1px solid ${colors.border.faint}`, padding: '9px 20px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{t('jvid_changer', lang)}</button>
                      <button onClick={handleDeleteVideo} disabled={deletingVideo} style={{ background: 'transparent', color: deletingVideo ? colors.text.disabled : colors.accent.red, border: '1px solid #ef444425', padding: '9px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: deletingVideo ? 'wait' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
                        {deletingVideo ? t('jvid_suppression', lang) : t('btn_supprimer', lang)}
                      </button>
                    </div>
                  </div>
                ) : reelJogabonito ? (
                  <div style={{ background: colors.background.surface, border: '1px solid #f9731620', borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '3px' }}>{t('jvid_jogabonito', lang)}</p>
                        <p style={{ fontSize: '11px', color: colors.text.disabled }}>{t('jvid_visible_joga', lang)}</p>
                      </div>
                      <span style={{ background: colors.accent.orange + alpha.subtle, color: colors.accent.orange, fontSize: '10px', fontWeight: 800, padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.5px' }}>LIVE</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <a href={reelJogabonito.video_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: colors.accent.orange, color: colors.text.primary, padding: '9px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', textDecoration: 'none' }}>
                        {t('jvid_voir', lang)}
                      </a>
                      <button onClick={() => navigate('/upload-reel')} style={{ background: 'transparent', color: colors.text.faint, border: `1px solid ${colors.border.faint}`, padding: '9px 20px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{t('jvid_changer', lang)}</button>
                      <button onClick={handleDeleteReel} disabled={deletingReel} style={{ background: 'transparent', color: deletingReel ? colors.text.disabled : colors.accent.red, border: '1px solid #ef444425', padding: '9px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: deletingReel ? 'wait' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
                        {deletingReel ? t('jvid_suppression', lang) : t('btn_supprimer', lang)}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: '16px' }}>
                    <EmptyState
                      dashed
                      icon={<IconVideoOff />}
                      title={t('jvid_aucune', lang)}
                      subtitle={isPro ? 'Publie un clip pour apparaître dans le Feed et Jogabonito' : 'Publie un reel pour apparaître dans Jogabonito'}
                      cta={{ label: isPro ? t('jvid_publier_clip', lang) : t('jvid_publier_reel', lang), onClick: () => navigate(isPro ? '/upload-clip' : '/upload-reel') }}
                    />
                  </div>
                )}

                {/* UPSELL PRO */}
                {!isPro && (
                  <div style={{ background: `linear-gradient(135deg, ${colors.accent.green}${alpha.subtle} 0%, ${colors.background.surface} 100%)`, border: `1px solid ${colors.accent.green}${alpha.light}`, borderRadius: '16px', padding: '22px 24px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <p style={{ fontWeight: 800, fontSize: '14px', marginBottom: '4px', letterSpacing: '-0.2px' }}>{t('jd_upsell_titre', lang)}</p>
                      <p style={{ fontSize: '12px', color: colors.text.faint }}>{t('jd_upsell_desc', lang)}</p>
                    </div>
                    <button onClick={() => window.open(stripeUrl(STRIPE_LINKS.pro, userId, profil?.email), '_blank')} style={{ ...st.btnSolid(), whiteSpace: 'nowrap' }}>
                      {t('jd_plan_pro_cta', lang)}
                    </button>
                  </div>
                )}

                {/* ABONNEMENT */}
                <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '18px 20px' }}>
                  {cancelDone ? (
                    <div>
                      <p style={{ fontSize: '13px', color: colors.accent.orange, fontWeight: 700, marginBottom: '4px' }}>{t('jd_resiliation_prog', lang)}</p>
                      <p style={{ fontSize: '12px', color: colors.text.disabled }}>{t('jd_resiliation_desc', lang)}</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
                      <p style={{ fontSize: '12px', color: colors.text.disabled }}>
                        {t('jd_plan_actif', lang)} <span style={{ color: colors.accent.green, fontWeight: 700, textTransform: 'capitalize' }}>{profil?.plan}</span>
                      </p>
                      <button onClick={handleCancelSubscription} disabled={cancelling} style={{ background: 'transparent', border: '1px solid #ef444425', color: cancelling ? colors.text.disabled : colors.accent.red, padding: '7px 14px', borderRadius: '8px', fontSize: '12px', cursor: cancelling ? 'wait' : 'pointer', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                        {cancelling ? t('jd_en_cours', lang) : t('jd_resilier', lang)}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── MON PROFIL ── */}
        {onglet === 'profil' && (
          <div style={{ maxWidth: '960px', margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 32px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '28px' }}>{t('jp_titre', lang)}</h1>

            <div style={{ marginBottom: '16px' }}>
              <ParrainageWidget userId={userId} accentColor={colors.accent.green} />
            </div>

            <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '28px', marginBottom: '16px' }}>
              <p style={labelStyle}>{t('jp_photo', lang)}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '12px' }}>
                <Avatar person={profil} size={80} border="2px solid #4ade8050" />
                <div>
                  <label style={{ display: 'inline-block', background: colors.background.surfaceAlt, border: `1px solid ${colors.border.default}`, borderRadius: '10px', padding: '10px 20px', cursor: avatarUploading ? 'not-allowed' : 'pointer', fontSize: '13px', color: avatarUploading ? colors.text.disabled : colors.text.secondary, fontFamily: 'Inter, sans-serif' }}>
                    {avatarUploading ? t('jp_upload_cours', lang) : t('jp_choisir_photo', lang)}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} disabled={avatarUploading} />
                  </label>
                  <p style={{ fontSize: '11px', color: colors.text.disabled, marginTop: '8px' }}>JPG, PNG, WEBP · Max 5 MB</p>
                </div>
              </div>
            </div>

            <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '28px', marginBottom: '16px' }}>
              <p style={{ ...labelStyle, marginBottom: '20px' }}>{t('jp_infos_club', lang)}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div><label style={labelStyle}>{t('jp_club_actuel', lang)}</label><input value={stats.club} onChange={e => setStats({ ...stats, club: e.target.value })} placeholder="AS Saint-Etienne" style={inputStyle} /></div>
                <div>
                  <label style={labelStyle}>{t('jp_niveau_equipe', lang)}</label>
                  <select value={stats.niveau_equipe} onChange={e => setStats({ ...stats, niveau_equipe: e.target.value })} style={inputStyle}>
                    <option value="">{t('equipe_choisir', lang)}</option>
                    {['Ligue 1', 'Ligue 2', 'National', 'Regional 1', 'Regional 2', 'Regional 3', 'Departemental', 'Amateur'].map(n => <option key={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{t('equipe_categorie', lang)}</label>
                  <select value={stats.categorie} onChange={e => setStats({ ...stats, categorie: e.target.value })} style={inputStyle}>
                    <option value="">{t('equipe_choisir', lang)}</option>
                    {CATEGORIES_JOUEUR.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>{t('profil_region', lang)}</label><input value={stats.region} onChange={e => setStats({ ...stats, region: e.target.value })} placeholder="Ile-de-France" style={inputStyle} /></div>
                <div>
                  <label style={labelStyle}>{t('jp_licence', lang)}</label>
                  <input value={stats.numero_licence || ''} onChange={e => setStats({ ...stats, numero_licence: e.target.value })} placeholder="Ex: 123456789" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>{t('equipe_pied', lang)}</label>
                  <select value={stats.pied} onChange={e => setStats({ ...stats, pied: e.target.value })} style={inputStyle}>
                    <option value="droit">{t('equipe_droit', lang)}</option>
                    <option value="gauche">{t('equipe_gauche', lang)}</option>
                    <option value="ambidextre">{t('jp_ambidextre', lang)}</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '28px', marginBottom: '20px' }}>
              <p style={{ ...labelStyle, marginBottom: '20px' }}>{t('jp_stats', lang)}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                {[['matchs_officiel', t('jp_matchs_off', lang)], ['matchs_amical', t('jp_matchs_amical', lang)], ['minutes_jouees', t('jp_minutes', lang)], ['buts_pied_droit', t('jp_buts_droit', lang)], ['buts_pied_gauche', t('jp_buts_gauche', lang)], ['buts_tete', t('jp_buts_tete', lang)], ['buts_total', t('jp_buts_total', lang)], ['passes_decisives', t('jp_passes_dec', lang)], ['cleansheets', t('jp_cleansheets', lang)]].map(([key, label]) => (
                  <div key={key}><label style={labelStyle}>{label}</label><input type="number" min="0" value={stats[key]} onChange={e => setStats({ ...stats, [key]: parseInt(e.target.value) || 0 })} style={inputStyle} /></div>
                ))}
              </div>
            </div>

            {caracteristiquesParPoste[profil?.poste] && (
              <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '28px', marginBottom: '20px' }}>
                <p style={{ ...labelStyle, marginBottom: '20px' }}>{t('jp_style_jeu', lang)}</p>

                <div style={{ marginBottom: '24px' }}>
                  <label style={labelStyle}>{t('jp_mon_style', lang)}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                    {['Dos au jeu', 'Technique / Dribbleur', 'Physique / Aérien', 'Vitesse / Percussion', 'Créateur / Vision', 'Box-to-box', 'Renard des surfaces', 'Défensif / Récupérateur', 'Meneur / Leadership', 'Centreur', 'Buteur / Finisseur', 'Pressing intense', 'Ailier percutant', 'Polyvalent'].map(s => (
                      <div key={s} onClick={() => setStyleDeJeu(styleDeJeu === s ? '' : s)}
                        style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer',
                          background: styleDeJeu === s ? colors.accent.blue + alpha.soft : colors.background.raised,
                          border: styleDeJeu === s ? '1px solid #60a5fa' : `1px solid ${colors.border.strong}`,
                          color: styleDeJeu === s ? colors.accent.blue : colors.text.secondary,
                          fontWeight: styleDeJeu === s ? 700 : 400,
                        }}>
                        {s}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>{t('jp_points_forts', lang)}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                    {caracteristiquesParPoste[profil.poste].map(c => {
                      const selected = pointsForts.includes(c)
                      const disabled = !selected && pointsForts.length >= 4
                      return (
                        <div
                          key={c}
                          onClick={() => !disabled && toggleCaracteristique(pointsForts, setPointsForts, c)}
                          style={{
                            padding: '6px 12px', borderRadius: '20px', fontSize: '13px',
                            background: selected ? colors.accent.green + alpha.soft : colors.background.raised,
                            border: selected ? '1px solid #4ade80' : `1px solid ${colors.border.strong}`,
                            color: selected ? colors.accent.green : disabled ? colors.text.disabled : 'white',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            opacity: disabled ? 0.5 : 1,
                          }}
                        >
                          {c}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>{t('jp_ameliorer', lang)}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                    {caracteristiquesParPoste[profil.poste].map(c => {
                      const selected = aAmeliorer.includes(c)
                      const disabled = !selected && aAmeliorer.length >= 4
                      return (
                        <div
                          key={c}
                          onClick={() => !disabled && toggleCaracteristique(aAmeliorer, setAAmeliorer, c)}
                          style={{
                            padding: '6px 12px', borderRadius: '20px', fontSize: '13px',
                            background: selected ? colors.accent.green + alpha.soft : colors.background.raised,
                            border: selected ? '1px solid #4ade80' : `1px solid ${colors.border.strong}`,
                            color: selected ? colors.accent.green : disabled ? colors.text.disabled : 'white',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            opacity: disabled ? 0.5 : 1,
                          }}
                        >
                          {c}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '28px', marginBottom: '20px' }}>
              <p style={{ ...labelStyle, marginBottom: '20px' }}>{t('jp_parcours', lang)}</p>

              {parcours.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  {parcours.map((p, i) => (
                    <div key={p.id} style={{ display: 'flex', gap: '14px', position: 'relative' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: colors.accent.green, marginTop: '4px', flexShrink: 0 }} />
                        {i < parcours.length - 1 && <div style={{ width: '1px', flex: 1, background: colors.border.faint, marginTop: '2px' }} />}
                      </div>
                      <div style={{ flex: 1, paddingBottom: i < parcours.length - 1 ? '20px' : 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {p.logo_url
                            ? <img src={p.logo_url} alt={p.club} style={{ width: '28px', height: '28px', objectFit: 'contain', flexShrink: 0 }} />
                            : <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: getClubColor(p.club || '?'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: colors.text.primary, flexShrink: 0 }}>{getClubInitials(p.club || '?')}</div>
                          }
                          <div>
                            <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '3px' }}>{p.club}</p>
                            <p style={{ fontSize: '11px', color: colors.text.faint, marginBottom: '4px' }}>
                              {[p.saison, p.niveau_championnat, p.categorie, p.poste].filter(Boolean).join(' · ')}
                            </p>
                            {(p.matchs_joues > 0 || p.buts > 0 || p.passes_decisives > 0 || p.cleansheets > 0) && (
                              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {p.matchs_joues > 0 && <span style={{ fontSize: '11px', color: colors.accent.green }}>⚽ {p.matchs_joues} matchs</span>}
                                {p.buts > 0 && <span style={{ fontSize: '11px', color: colors.accent.orange }}>⚽ {p.buts} buts</span>}
                                {p.passes_decisives > 0 && <span style={{ fontSize: '11px', color: colors.accent.blue }}>🎯 {p.passes_decisives} passes</span>}
                                {p.cleansheets > 0 && <span style={{ fontSize: '11px', color: colors.accent.purple }}>🧤 {p.cleansheets} CS</span>}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                          <button onClick={() => modifierClub(p)} title="Modifier" style={{ background: 'transparent', border: 'none', color: '#4ade8080', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button onClick={() => supprimerClub(p.id)} title="Supprimer" style={{ background: 'transparent', border: 'none', color: '#ef444480', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div id="parcours-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div style={{ position: 'relative' }}>
                  <label style={labelStyle}>{t('profil_club_label', lang)}</label>
                  <div style={{ position: 'relative' }}>
                    {nouveauClub.club.trim() && (
                      nouveauClub.logo_url
                        ? <img src={nouveauClub.logo_url} alt="" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', objectFit: 'contain', zIndex: 1 }} />
                        : <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', borderRadius: '50%', background: getClubColor(nouveauClub.club), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 800, color: colors.text.primary, zIndex: 1 }}>{getClubInitials(nouveauClub.club)}</div>
                    )}
                    <input
                      value={nouveauClub.club}
                      onChange={e => {
                        const val = e.target.value
                        setNouveauClub(prev => ({ ...prev, club: val, logo_url: '' }))
                        searchClubs(val)
                      }}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      onFocus={() => clubSuggestions.length > 0 && setShowSuggestions(true)}
                      placeholder="AS Saint-Etienne"
                      style={{ ...inputStyle, paddingLeft: nouveauClub.club.trim() ? '36px' : '14px' }}
                    />
                    {loadingSuggestions && (
                      <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: colors.text.faint }}>…</span>
                    )}
                  </div>
                  {showSuggestions && clubSuggestions.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: colors.background.raised, border: `1px solid ${colors.border.default}`, borderRadius: '10px', zIndex: 100, overflow: 'hidden', marginTop: '4px' }}>
                      {clubSuggestions.map(team => (
                        <div
                          key={team.idTeam}
                          onMouseDown={() => selectClubSuggestion(team)}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', cursor: 'pointer', borderBottom: `1px solid ${colors.border.faint}` }}
                          onMouseEnter={e => e.currentTarget.style.background = colors.background.raised}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          {team.strTeamBadge && <img src={team.strTeamBadge} alt="" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />}
                          <div>
                            <p style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>{team.strTeam}</p>
                            {team.strCountry && <p style={{ fontSize: '10px', color: colors.text.faint, margin: 0 }}>{team.strCountry}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>{t('profil_saison', lang)}</label>
                  <input value={nouveauClub.saison} onChange={e => setNouveauClub({ ...nouveauClub, saison: e.target.value })} placeholder="2023-2024" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>{t('equipe_categorie', lang)}</label>
                  <select value={nouveauClub.categorie} onChange={e => setNouveauClub({ ...nouveauClub, categorie: e.target.value })} style={inputStyle}>
                    <option value="">{t('equipe_choisir', lang)}</option>
                    {CATEGORIES_CLUB_HISTORIQUE.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{t('equipe_poste', lang)}</label>
                  <select value={nouveauClub.poste} onChange={e => setNouveauClub({ ...nouveauClub, poste: e.target.value })} style={inputStyle}>
                    <option value="">{t('equipe_choisir', lang)}</option>
                    <option>Gardien</option>
                    <option>Defenseur</option>
                    <option>Milieu</option>
                    <option>Attaquant</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{t('jp_niveau_champ', lang)}</label>
                  <select value={nouveauClub.niveau_championnat} onChange={e => setNouveauClub({ ...nouveauClub, niveau_championnat: e.target.value })} style={inputStyle}>
                    <option value="">{t('equipe_choisir', lang)}</option>
                    {['Ligue 1','Ligue 2','National 1','National 2','National 3','R1','R2','R3','D1','D2','Futsal'].map(n => <option key={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{t('jp_matchs_joues', lang)}</label>
                  <input type="number" min="0" value={nouveauClub.matchs_joues} onChange={e => setNouveauClub({ ...nouveauClub, matchs_joues: e.target.value })} placeholder="0" style={inputStyle} />
                </div>
                {nouveauClub.poste === 'Gardien' ? (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>{t('jp_clean_sheets', lang)}</label>
                    <input type="number" min="0" value={nouveauClub.cleansheets} onChange={e => setNouveauClub({ ...nouveauClub, cleansheets: e.target.value })} placeholder="0" style={inputStyle} />
                  </div>
                ) : (
                  <>
                    <div>
                      <label style={labelStyle}>{t('comp_buts', lang)}</label>
                      <input type="number" min="0" value={nouveauClub.buts} onChange={e => setNouveauClub({ ...nouveauClub, buts: e.target.value })} placeholder="0" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>{t('jp_passes_dec', lang)}</label>
                      <input type="number" min="0" value={nouveauClub.passes_decisives} onChange={e => setNouveauClub({ ...nouveauClub, passes_decisives: e.target.value })} placeholder="0" style={inputStyle} />
                    </div>
                  </>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button className="dj-btn-green" onClick={ajouterClub} disabled={savingParcours || !nouveauClub.club.trim()}
                  style={{ ...st.btnSolid(), transition: 'background 0.15s', opacity: (savingParcours || !nouveauClub.club.trim()) ? 0.5 : 1 }}>
                  {savingParcours ? (editingParcoursId ? t('jp_modif_cours', lang) : t('jp_ajout_cours', lang)) : (editingParcoursId ? t('jp_modifier_parcours', lang) : t('jp_ajouter_club', lang))}
                </button>
                {editingParcoursId && (
                  <button onClick={() => { setEditingParcoursId(null); setNouveauClub({ club: '', saison: '', categorie: '', poste: '', logo_url: '', niveau_championnat: '', matchs_joues: '', buts: '', passes_decisives: '', cleansheets: '' }) }}
                    style={{ background: 'transparent', border: `1px solid ${colors.border.strong}`, color: colors.text.faint, padding: '10px 16px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    {t('btn_annuler', lang)}
                  </button>
                )}
              </div>
            </div>

            <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '28px', marginBottom: '20px' }}>
              <p style={{ ...labelStyle, marginBottom: '20px' }}>{t('jp_historique_saisons', lang)}</p>
              <HistoriqueSaisons joueurId={userId} />
            </div>

            <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '28px', marginBottom: '20px' }}>
              <p style={{ ...labelStyle, marginBottom: '6px' }}>{t('jp_notif_prefs', lang)}</p>
              <p style={{ fontSize: '13px', color: colors.text.faint, marginBottom: '20px' }}>{t('jp_notif_desc', lang)}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { key: 'email_analyse', label: t('jp_notif_analyse', lang) },
                  { key: 'email_like', label: t('jp_notif_like', lang) },
                  { key: 'email_commentaire', label: t('jp_notif_commentaire', lang) },
                  { key: 'email_message', label: t('jp_notif_message', lang) },
                ].map(pref => (
                  <div key={pref.key} onClick={() => sauvegarderNotifPrefs({ ...notifPrefs, [pref.key]: !notifPrefs[pref.key] })}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: colors.background.surfaceAlt, borderRadius: '10px', cursor: 'pointer' }}>
                    <span style={{ fontSize: '14px' }}>{pref.label}</span>
                    <div style={{ width: '40px', height: '22px', background: notifPrefs[pref.key] ? colors.accent.green : colors.border.strong, borderRadius: '20px', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                      <div style={{ position: 'absolute', top: '3px', left: notifPrefs[pref.key] ? '21px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: colors.text.primary, transition: 'left 0.2s' }} />
                    </div>
                  </div>
                ))}
              </div>
              {savingPrefs && <p style={{ fontSize: '12px', color: colors.accent.green, marginTop: '10px' }}>{t('jp_enregistrement', lang)}</p>}
            </div>

            <button className="dj-btn-green" onClick={handleSaveStats} disabled={savingStats}
              style={{ ...st.btnSolid(statsSaved ? '#22c55e' : colors.accent.green), width: '100%', transition: 'background 0.2s', letterSpacing: '-0.2px' }}>
              {savingStats ? t('jp_sauvegarde_cours', lang) : statsSaved ? t('jp_profil_sauvegarde', lang) : t('profil_sauvegarder_profil', lang)}
            </button>

            {/* ── ACCÈS PARENTS ── */}
            <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '16px', padding: '28px', marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <span style={{ fontSize: '20px' }}>👨‍👩‍👦</span>
                <div>
                  <p style={{ ...labelStyle, margin: 0 }}>Accès parents</p>
                  <p style={{ color: colors.text.ghost, fontSize: '12px', margin: '2px 0 0' }}>Invite jusqu'à 2 parents — accès lecture seule à ton profil</p>
                </div>
              </div>

              {parentsInvites.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: '10px', padding: '10px 14px', marginBottom: '8px' }}>
                  <div>
                    <p style={{ color: colors.text.secondary, fontSize: '13px', margin: 0 }}>{p.email_invite}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: p.statut === 'accepte' ? colors.accent.green : p.statut === 'refuse' ? colors.accent.red : colors.accent.amber }}>
                      {p.statut === 'accepte' ? '✅ Compte créé' : p.statut === 'refuse' ? '❌ Refusé' : '⏳ Invitation en attente'}
                    </p>
                  </div>
                  <button onClick={() => supprimerInvitationParent(p.email_invite)} style={{ background: 'none', border: 'none', color: colors.text.ghost, fontSize: '16px', cursor: 'pointer' }}>✕</button>
                </div>
              ))}

              {parentsInvites.length < 2 ? (
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <input type="email" placeholder="Email du parent" value={emailParentInput} onChange={e => setEmailParentInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && inviterParent()}
                    style={{ flex: 1, background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '10px 14px', color: colors.text.primary, fontSize: '13px', fontFamily: 'Inter, sans-serif' }} />
                  <button onClick={inviterParent} disabled={invitantParent || !emailParentInput.trim()}
                    style={{ background: colors.accent.green + alpha.subtle, border: `1px solid ${colors.accent.green}40`, color: colors.accent.green, padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', opacity: invitantParent ? 0.6 : 1 }}>
                    {invitantParent ? '...' : '📧 Inviter'}
                  </button>
                </div>
              ) : (
                <p style={{ color: colors.text.ghost, fontSize: '12px', marginTop: '8px', fontStyle: 'italic' }}>Maximum atteint (2 parents)</p>
              )}
            </div>
          </div>
        )}

        {/* ── ANNONCES DU CLUB ── */}
        {onglet === 'annonces' && (
          <div style={{ maxWidth: '760px', margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 32px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '28px' }}>Actualités du club</h1>
            {annoncesClub.length === 0 ? (
              <p style={{ color: colors.text.disabled, fontSize: '13px', fontStyle: 'italic' }}>Aucune annonce pour le moment.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {annoncesClub.map(a => {
                  const lue = annoncesLuesIds.has(a.id)
                  return (
                    <div key={a.id} onClick={() => marquerAnnonceLue(a.id)}
                      style={{ background: colors.background.sunken, border: `1px solid ${lue ? colors.border.faint : colors.accent.green}`, borderRadius: '12px', padding: '18px', cursor: lue ? 'default' : 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                        <h3 style={{ color: colors.text.primary, margin: 0, fontSize: '14px', fontWeight: 700 }}>{a.titre}</h3>
                        {!lue && <span style={{ background: colors.accent.green + '22', color: colors.accent.green, borderRadius: '6px', padding: '2px 7px', fontSize: '10px', fontWeight: 700 }}>Nouveau</span>}
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

        {/* ── ÉQUIPEMENT ── */}
        {onglet === 'equipement' && (
          <div style={{ maxWidth: '960px', margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 32px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '28px' }}>Mon équipement</h1>

            {equipementPret && (
              <div style={{ background: '#1a1200', border: `2px solid ${colors.accent.amber}`, borderRadius: '16px', padding: '18px', marginBottom: '20px' }}>
                <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: 15 }}>Ton équipement est prêt !</p>
                <p style={{ margin: '0 0 12px', fontSize: 13, color: colors.text.faint }}>
                  {equipementPret.jours || 'Passe le récupérer auprès du club'}
                  {equipementPret.heure_debut && equipementPret.heure_fin ? ` · entre ${equipementPret.heure_debut} et ${equipementPret.heure_fin}` : ''}
                  {equipementPret.heure_debut_2 && equipementPret.heure_fin_2 ? ` puis entre ${equipementPret.heure_debut_2} et ${equipementPret.heure_fin_2}` : ''}
                </p>
                <button onClick={marquerEquipementRecupere} style={{ background: colors.accent.amber, color: colors.black, border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>J'ai récupéré</button>
              </div>
            )}

            {equipementCommande?.statut === 'recupere' && equipementCommande?.recupere_le && (
              <div style={{ background: colors.accent.green + alpha.subtle, border: `1px solid ${colors.accent.green}40`, borderRadius: '16px', padding: '18px', marginBottom: '20px' }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: colors.accent.green }}>Équipement remis le {new Date(equipementCommande.recupere_le).toLocaleDateString('fr-FR')} à {new Date(equipementCommande.recupere_le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            )}

            {!packAttribue ? (
              <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
                <p style={{ color: colors.text.faint, fontSize: 14 }}>Aucun pack ne t'a encore été attribué. Ton club te l'assignera prochainement.</p>
              </div>
            ) : (
              <>
                <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '12px', padding: '18px 22px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>{packAttribue.icone}</span>
                  <div>
                    <p style={{ margin: 0, color: colors.accent.green, fontWeight: 700, fontSize: 15 }}>{packAttribue.nom}</p>
                    <p style={{ margin: 0, color: colors.text.faint, fontSize: 12 }}>{champsEquipement.length} article{champsEquipement.length > 1 ? 's' : ''} à renseigner</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {champsEquipement.map(c => {
                    const valeur = mesTailles.find(t => t.champ_id === c.id)?.valeur || ''
                    return (
                      <div key={c.id}>
                        <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: colors.text.dim, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{c.nom}</p>
                        {c.taille_unique ? (
                          <p style={{ margin: 0, fontSize: 13, color: colors.text.faint, fontStyle: 'italic' }}>Taille unique</p>
                        ) : (
                          <select value={valeur} onChange={e => sauvegarderMaTaille(c.id, e.target.value)}
                            style={{ width: '100%', maxWidth: '240px', background: colors.background.raised, border: `1px solid ${valeur ? colors.accent.green : colors.border.default}`, borderRadius: '8px', padding: '9px 12px', color: valeur ? colors.accent.green : colors.text.dim, fontSize: 13, fontWeight: 700, fontFamily: 'Inter, sans-serif', outline: 'none', cursor: 'pointer' }}>
                            <option value="">Choisir une taille</option>
                            {c.options.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── ANALYSES ── */}
        {onglet === 'analyses' && (
          <div style={{ maxWidth: '960px', margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px' }}>{t('ja_titre', lang)}</h1>
              {(profil?.analyses_restantes || 0) > 0 && (
                <button onClick={() => navigate('/upload')} style={st.btnSolid()}>
                  {t('ja_nouvelle', lang)}
                </button>
              )}
            </div>
            {demandes.length === 0 ? (
              <EmptyState compact icon={<IconSearch />} title={t('ja_aucune', lang)} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {demandes.map(demande => (
                  <div key={demande.id} style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.2px' }}>{demande.titre}</h3>
                      <span style={{ background: demande.statut === 'analyse' ? '#4ade8012' : '#f59e0b12', color: demande.statut === 'analyse' ? colors.accent.green : '#f59e0b', fontSize: '10px', padding: '3px 10px', borderRadius: '20px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 }}>
                        {demande.statut === 'analyse' ? t('ja_recue', lang) : t('etat_en_attente', lang)}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: colors.text.disabled, marginBottom: '12px' }}>{demande.poste} · {new Date(demande.created_at).toLocaleDateString('fr-FR')}</p>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {demande.loom_url && (
                        <a href={demande.loom_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: colors.accent.green, color: colors.black, padding: '8px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>
                          {t('ja_voir', lang)}
                        </a>
                      )}
                      {demande.rapport_pdf_url && (
                        <a href={demande.rapport_pdf_url} target="_blank" rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            background: colors.accent.green + alpha.subtle, border: '1px solid #4ade8030',
                            color: colors.accent.green, borderRadius: 8, padding: '7px 14px',
                            fontSize: 12, fontWeight: 700, textDecoration: 'none',
                            fontFamily: 'Inter, sans-serif',
                          }}>
                          {t('ja_telecharger_rapport', lang)}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MESSAGES ── */}
        {onglet === 'messages' && (profil?.plan === 'starter' || profil?.plan === 'fan' || profil?.plan === 'joueur_starter') && (
          <div style={{ maxWidth: '960px', margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 32px' }}>
            <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '20px', padding: '72px 32px', textAlign: 'center' }}>
              <div style={{ color: colors.icon.muted, display: 'flex', justifyContent: 'center', marginBottom: '20px' }}><IconLock /></div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.3px' }}>{t('jm_plan_pro', lang)}</h2>
              <p style={{ fontSize: '13px', color: colors.text.faint, maxWidth: '340px', margin: '0 auto 24px', lineHeight: 1.7 }}>
                {t('jm_plan_pro_desc', lang)}
              </p>
              <button onClick={() => window.open(stripeUrl(STRIPE_LINKS.pro, userId, profil?.email), '_blank')} style={st.btnSolid()}>
                {t('jd_plan_pro_cta', lang)}
              </button>
            </div>
          </div>
        )}

        {onglet === 'messages' && profil?.plan !== 'starter' && profil?.plan !== 'fan' && profil?.plan !== 'joueur_starter' && (() => {
          const panelConversation = messageActif ? (
            <>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${colors.border.subtle}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Avatar person={messageActif.other} size={36} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '1px' }}>{messageActif.other?.prenom} {messageActif.other?.nom}</p>
                  <p style={{ fontSize: '11px', color: colors.accent.green }}>{t('jd_recruteur_badge', lang)}</p>
                </div>
                <button onClick={async () => {
                  const { data } = await supabase.from('profiles').select('*').eq('id', messageActif.otherId).maybeSingle()
                  if (data) setRecruteurModal(data)
                }} style={{ ...st.btn(colors.accent.green), padding: '6px 14px', fontSize: '12px' }}>
                  {t('jm_voir_profil', lang)}
                </button>
              </div>
              <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                {messages.filter(m => m.sender_id === messageActif.otherId || m.receiver_id === messageActif.otherId).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map((m, i) => (
                  <div key={i} style={msgBubble(m.sender_id === userId)}>
                    <p style={{ margin: 0 }}>{m.content}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '10px', opacity: 0.5 }}>{new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                ))}
              </div>
              <div style={{ padding: '14px 16px', borderTop: `1px solid ${colors.border.subtle}`, display: 'flex', gap: '10px' }}>
                <input style={{ flex: 1, background: colors.background.surfaceAlt, border: `1px solid ${colors.border.faint}`, borderRadius: '10px', color: colors.text.primary, padding: '10px 14px', fontSize: '13px', outline: 'none', fontFamily: 'Inter, sans-serif' }} placeholder={t('jm_repondre', lang)} value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && envoyerMessage()} />
                <button onClick={envoyerMessage} style={st.btnSolid()}>{t('btn_envoyer', lang)}</button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '10px', color: colors.icon.muted }}>
              <IconMessage />
              <p style={{ fontSize: '13px', color: colors.border.strong }}>{t('jm_select_conv', lang)}</p>
            </div>
          )

          // ── MOBILE : pattern liste → détail (une seule vue visible à la fois) ──
          if (isMobile) {
            if (messageActif) {
              return (
                <div style={{ padding: '12px', height: 'calc(100vh)', display: 'flex', flexDirection: 'column' }}>
                  <button onClick={() => setMessageActif(null)} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: colors.accent.green, fontSize: '14px', fontWeight: 600, cursor: 'pointer', padding: '4px 8px 12px', fontFamily: 'Inter, sans-serif' }}>
                    {t('jm_retour', lang)}
                  </button>
                  <div style={{ flex: 1, minHeight: 0, background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {panelConversation}
                  </div>
                </div>
              )
            }
            return (
              <div style={{ padding: '12px', height: 'calc(100vh)', display: 'flex', flexDirection: 'column' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '16px', padding: '0 8px' }}>{t('jm_titre', lang)}</h1>
                {conversations.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '13px', color: colors.text.disabled, marginBottom: '6px' }}>{t('jm_aucun', lang)}</p>
                    <p style={{ fontSize: '11px', color: colors.border.strong, lineHeight: 1.5 }}>{t('jm_scout_contact', lang)}</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
                    {conversations.map(conv => (
                      <div key={conv.otherId} onClick={() => setMessageActif(conv)}
                        onMouseEnter={() => setHoveredCard(`msg-${conv.otherId}`)}
                        onMouseLeave={() => setHoveredCard(null)}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: colors.background.surface, border: `1px solid ${hoveredCard === `msg-${conv.otherId}` ? colors.accent.green : colors.background.raised}`, borderRadius: '14px', cursor: 'pointer', transform: hoveredCard === `msg-${conv.otherId}` ? 'translateY(-1px)' : 'none', transition: 'all 0.15s ease' }}>
                        <Avatar person={conv.other} size={44} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                            <p style={{ fontWeight: 700, fontSize: '14px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.other?.prenom} {conv.other?.nom}</p>
                            {conv.msgs[0]?.created_at && (
                              <span style={{ fontSize: '10px', color: colors.text.disabled, flexShrink: 0 }}>{new Date(conv.msgs[0].created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                            )}
                          </div>
                          <p style={{ fontSize: '12px', color: colors.text.faint, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.msgs[0]?.content}</p>
                        </div>
                        <span style={{ color: colors.border.strong, fontSize: '18px', flexShrink: 0 }}>›</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          // ── DESKTOP : layout 2 colonnes inchangé ──
          return (
            <div style={{ padding: '24px', height: 'calc(100vh)', display: 'flex', flexDirection: 'column' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '16px', padding: '0 8px' }}>{t('jm_titre', lang)}</h1>
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '260px 1fr', gap: '14px', minHeight: 0 }}>
                <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '14px 16px', borderBottom: `1px solid ${colors.border.subtle}` }}>
                    <p style={{ fontWeight: 700, color: colors.accent.green, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('jm_conversations', lang)}</p>
                  </div>
                  {conversations.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
                      <p style={{ fontSize: '13px', color: colors.text.disabled, marginBottom: '6px' }}>{t('jm_aucun', lang)}</p>
                      <p style={{ fontSize: '11px', color: colors.border.strong, lineHeight: 1.5 }}>{t('jm_scout_contact', lang)}</p>
                    </div>
                  ) : conversations.map(conv => (
                    <div key={conv.otherId} onClick={() => setMessageActif(conv)}
                      style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border.subtle}`, cursor: 'pointer', background: messageActif?.otherId === conv.otherId ? colors.accent.green + alpha.faint : 'transparent', borderLeft: messageActif?.otherId === conv.otherId ? '2px solid #4ade80' : '2px solid transparent' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <Avatar person={conv.other} size={30} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 700, fontSize: '13px', marginBottom: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.other?.prenom} {conv.other?.nom}</p>
                          <p style={{ fontSize: '10px', color: colors.accent.green, fontWeight: 600 }}>{t('jd_recruteur_badge', lang)}</p>
                        </div>
                      </div>
                      <p style={{ fontSize: '11px', color: colors.border.strong, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.msgs[0]?.content}</p>
                    </div>
                  ))}
                </div>
                <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {panelConversation}
                </div>
              </div>
            </div>
          )
        })()}

        {/* ── COACH ── */}
        {onglet === 'carte' && (
          <div style={{ maxWidth: '520px', margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 32px' }}>
            <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.3px', marginBottom: '4px' }}>
                {t('jcarte_titre', lang)}
                <span style={{ marginLeft: '10px', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                  background: isPro ? '#f0c03020' : '#c8c8c820',
                  color: isPro ? '#f0c030' : '#c8c8c8',
                  border: `1px solid ${isPro ? '#f0c03040' : '#c8c8c840'}`,
                  verticalAlign: 'middle',
                }}>
                  {isPro ? '⭐ PRO' : 'STARTER'}
                </span>
              </h2>
              <p style={{ fontSize: '13px', color: colors.text.faint }}>
                {t('jcarte_desc', lang)}
              </p>
            </div>

            {(!profil?.plan || profil.plan === 'fan') ? (
              <EmptyState dashed icon="🎮" title={t('jcarte_feature', lang)} subtitle={t('jcarte_abo', lang)} />
            ) : (
              <>
                {profil?.carte_fifa_url && (
                  <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <img src={profil.carte_fifa_url} alt="Ma carte FIFA" style={{ width: '72px', height: '100px', objectFit: 'contain', borderRadius: '6px' }} />
                    <div>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: colors.accent.green, marginBottom: '4px' }}>✓ Carte sauvegardée</p>
                      <p style={{ fontSize: '12px', color: colors.text.faint }}>Visible dans ton profil recruteur.</p>
                    </div>
                  </div>
                )}
                <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '24px' }}>
                  <FifaCardGenerator
                    plan={isPro ? 'pro' : 'starter'}
                    profil={profil}
                    onSave={handleFifaCardSave}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {onglet === 'certif' && (
          <div style={{ maxWidth: '640px', margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 32px' }}>
            <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.3px', marginBottom: '4px' }}>
                {t('jcertif_titre', lang)}
                <span style={{ marginLeft: '10px', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: '#f0c03020', color: '#f0c030', border: '1px solid #f0c03040', verticalAlign: 'middle' }}>⭐ Officiel</span>
              </h2>
              <p style={{ fontSize: '13px', color: colors.text.faint, lineHeight: 1.6 }}>
                {t('jcertif_desc', lang)}
              </p>
            </div>

            {/* Certifications existantes */}
            {certifications.length > 0 && (
              <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: colors.text.muted, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '14px' }}>{t('jcertif_mes_demandes', lang)}</p>
                {certifications.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${colors.border.subtle}` }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 2px' }}>{c.niveau} — {c.saison}</p>
                      <p style={{ fontSize: '12px', color: colors.text.faint, margin: 0 }}>{c.documents?.length || 0} feuille{(c.documents?.length || 0) > 1 ? 's' : ''} envoyée{(c.documents?.length || 0) > 1 ? 's' : ''}</p>
                      {c.commentaire_admin && <p style={{ fontSize: '12px', color: colors.accent.orange, margin: '4px 0 0' }}>💬 {c.commentaire_admin}</p>}
                    </div>
                    <span style={{
                      fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px',
                      background: c.statut === 'validé' ? colors.accent.green + alpha.soft : c.statut === 'rejeté' ? colors.accent.red + alpha.soft : '#f0c03020',
                      color: c.statut === 'validé' ? colors.accent.green : c.statut === 'rejeté' ? colors.accent.red : '#f0c030',
                      border: `1px solid ${c.statut === 'validé' ? colors.accent.green + alpha.medium : c.statut === 'rejeté' ? colors.accent.red + alpha.medium : '#f0c03040'}`,
                    }}>
                      {c.statut === 'validé' ? t('jcertif_valide', lang) : c.statut === 'rejeté' ? t('jcertif_rejete', lang) : t('jcertif_attente', lang)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Nouvelle demande */}
            {certifSent ? (
              <div style={{ background: colors.background.surface, border: '1px solid #4ade8030', borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
                <p style={{ fontSize: '32px', marginBottom: '12px' }}>✅</p>
                <p style={{ fontWeight: 800, fontSize: '16px', color: colors.accent.green, marginBottom: '6px' }}>{t('jcertif_envoyee', lang)}</p>
                <p style={{ fontSize: '13px', color: colors.text.faint }}>{t('jcertif_verif_48h', lang)}</p>
              </div>
            ) : (
              <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '24px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: colors.text.muted, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px' }}>{t('jcertif_nouvelle', lang)}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                  <div>
                    <label style={labelStyle}>{t('jcertif_niveau', lang)}</label>
                    <select value={nouvelleCertif.niveau} onChange={e => setNouvelleCertif({ ...nouvelleCertif, niveau: e.target.value })} style={inputStyle}>
                      <option value="">{t('equipe_choisir', lang)}</option>
                      {['Ligue 1', 'Ligue 2', 'National 1', 'National 2', 'National 3', 'R1', 'R2', 'R3', 'D1', 'D2', 'Futsal'].map(n => <option key={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>{t('profil_saison', lang)}</label>
                    <select value={nouvelleCertif.saison} onChange={e => setNouvelleCertif({ ...nouvelleCertif, saison: e.target.value })} style={inputStyle}>
                      <option value="">{t('equipe_choisir', lang)}</option>
                      {['2024/2025', '2025/2026', '2026/2027'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>{t('jcertif_feuilles', lang)} ({certifDocs.length}/5 minimum)</label>
                  <p style={{ fontSize: '12px', color: colors.text.faint, marginBottom: '10px' }}>{t('jcertif_min5', lang)}</p>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: colors.background.surfaceAlt, border: `1px dashed ${colors.border.strong}`, borderRadius: '10px', cursor: 'pointer', fontSize: '13px', color: colors.text.secondary }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
                    {uploadingCertif ? t('jp_upload_cours', lang) : t('jcertif_selectionner', lang)}
                    <input type="file" accept="image/*,.pdf" multiple onChange={handleCertifDocUpload} style={{ display: 'none' }} disabled={uploadingCertif} />
                  </label>
                  {certifDocs.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                      {certifDocs.map((url, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: colors.accent.green + alpha.subtle, border: '1px solid #4ade8030', borderRadius: '8px', padding: '4px 10px' }}>
                          <span style={{ fontSize: '11px', color: colors.accent.green }}>✓ Feuille {i + 1}</span>
                          <button onClick={() => setCertifDocs(prev => prev.filter((_, j) => j !== i))}
                            style={{ background: 'none', border: 'none', color: '#4ade8080', cursor: 'pointer', fontSize: '12px', padding: '0 2px' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={soumettreDemandesCertification}
                  disabled={submittingCertif || !nouvelleCertif.niveau || !nouvelleCertif.saison || certifDocs.length < 5}
                  style={{ width: '100%', background: '#f0c030', color: '#1a0800', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, sans-serif', opacity: (submittingCertif || !nouvelleCertif.niveau || !nouvelleCertif.saison || certifDocs.length < 5) ? 0.4 : 1, transition: 'opacity 0.2s' }}>
                  {submittingCertif ? t('etat_envoi_cours', lang) : `⭐ Soumettre la demande (${certifDocs.length}/5 feuilles)`}
                </button>
              </div>
            )}
          </div>
        )}

        {onglet === 'coach' && (
          <div style={{ maxWidth: '960px', margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 32px' }}>
            <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.3px', marginBottom: '4px' }}>{t('jcoach_titre', lang)}</h2>
              <p style={{ fontSize: '13px', color: colors.text.faint }}>{t('jcoach_desc', lang)}</p>
            </div>
            {convCoach.length > 0 && (
              <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', marginBottom: '20px', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${colors.border.subtle}` }}>
                  <p style={{ fontWeight: 700, color: colors.accent.orange, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('jcoach_historique', lang)}</p>
                </div>
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', maxHeight: '380px', overflowY: 'auto' }}>
                  {(() => {
                    const coachIds = coaches.map(c => c.id)
                    return messages.filter(m => coachIds.includes(m.sender_id) || coachIds.includes(m.receiver_id)).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map((m, i) => (
                      <div key={i} style={msgBubble(m.sender_id === userId)}>
                        <p style={{ margin: 0 }}>{m.content}</p>
                        <p style={{ margin: '4px 0 0', fontSize: '10px', opacity: 0.5 }}>{new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · {m.sender_id === userId ? t('jcoach_toi', lang) : t('jnav_coach', lang)}</p>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            )}
            {coaches.length === 0 ? (
              <EmptyState dashed icon={<IconMic size={40} />} title={t('jcoach_aucun', lang)} />
            ) : (
              <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '24px' }}>
                {coaches.length > 1 && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={labelStyle}>{t('jcoach_coach', lang)}</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {coaches.map(c => (
                        <button key={c.id} onClick={() => setCoachSelectionne(c)}
                          style={{ background: coachSelectionne?.id === c.id ? colors.accent.orange : 'transparent', color: coachSelectionne?.id === c.id ? colors.black : colors.text.faint, border: `1px solid ${coachSelectionne?.id === c.id ? colors.accent.orange : colors.border.default}`, padding: '7px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: coachSelectionne?.id === c.id ? 700 : 400, fontFamily: 'Inter, sans-serif' }}>
                          {c.prenom} {c.nom}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <label style={{ ...labelStyle, marginBottom: '10px', display: 'block' }}>
                  {convCoach.length > 0 ? t('jcoach_nouveau_msg', lang) : `Écrire à ${coachSelectionne?.prenom || 'votre coach analyseur'}`}
                </label>
                {coachSent ? (
                  <div style={{ textAlign: 'center', padding: '36px 0', color: colors.accent.orange }}>
                    <p style={{ fontSize: '28px', marginBottom: '8px' }}>✓</p>
                    <p style={{ fontWeight: 700, fontSize: '14px' }}>{t('jcoach_msg_envoye', lang)}</p>
                  </div>
                ) : (
                  <>
                    <textarea value={messageCoach} onChange={e => setMessageCoach(e.target.value)}
                      placeholder={`Bonjour ${coachSelectionne?.prenom || ''}, j'aurais une question sur...`}
                      style={{ width: '100%', background: colors.background.surfaceAlt, border: `1px solid ${colors.border.default}`, borderRadius: '10px', color: colors.text.primary, padding: '14px', fontSize: '13px', resize: 'vertical', minHeight: '140px', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif', outline: 'none' }} />
                    <button onClick={envoyerMessageCoach} disabled={sendingCoach || !messageCoach.trim()}
                      style={{ ...st.btnSolid(colors.accent.orange), marginTop: '12px', width: '100%', opacity: (sendingCoach || !messageCoach.trim()) ? 0.4 : 1, transition: 'opacity 0.2s' }}>
                      {sendingCoach ? t('etat_envoi_cours', lang) : t('jcoach_envoyer', lang)}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
        {/* ── PRÉPARATION PHYSIQUE ── */}
        {onglet === 'prep_physique' && (
          <div style={{ maxWidth: '960px', margin: '0 auto' }}>
            <PrepPhysiqueJoueur joueurId={userId} isMobile={isMobile} />
          </div>
        )}
        {/* ── EXPLORER ── */}
        {onglet === 'clubs' && (() => {
          const ONGLETS_EXPLORER = [
            { id: 'educateurs', label: t('jexp_tab_educateurs', lang), liste: educateursListe, accent: colors.accent.green },
            { id: 'clubs', label: t('jexp_tab_clubs', lang), liste: clubsListe, accent: colors.accent.green },
            { id: 'scouts', label: t('jexp_tab_scouts', lang), liste: recruteursList, accent: colors.accent.blue },
          ]
          const active = ONGLETS_EXPLORER.find(o => o.id === explorerOnglet) || ONGLETS_EXPLORER[0]
          const q = explorerRecherche.trim().toLowerCase()
          const regionQ = explorerRegion.trim().toLowerCase()
          const listeFiltree = active.liste.filter(p => {
            if (regionQ && !(p.region || '').toLowerCase().includes(regionQ)) return false
            if (!q) return true
            const hay = `${p.prenom || ''} ${p.nom || ''} ${p.club || ''}`.toLowerCase()
            return hay.includes(q)
          })

          return (
            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 32px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '4px' }}>{t('jexp_titre', lang)}</h1>
              <p style={{ fontSize: '13px', color: colors.text.faint, marginBottom: '20px' }}>{t('jexp_desc', lang)}</p>

              {/* Onglets */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {ONGLETS_EXPLORER.map(o => (
                  <button key={o.id} onClick={() => setExplorerOnglet(o.id)}
                    style={{ padding: '8px 18px', borderRadius: '20px', border: `1px solid ${explorerOnglet === o.id ? o.accent : colors.border.default}`, background: explorerOnglet === o.id ? o.accent + alpha.subtle : 'transparent', color: explorerOnglet === o.id ? o.accent : colors.text.faint, fontSize: '13px', fontWeight: explorerOnglet === o.id ? 700 : 400, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    {o.label} ({o.liste.length})
                  </button>
                ))}
              </div>

              {/* Recherche + région */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <input value={explorerRecherche} onChange={e => setExplorerRecherche(e.target.value)}
                  placeholder={t('jexp_recherche_placeholder', lang)}
                  style={{ flex: 1, minWidth: '200px', background: colors.background.surface, color: colors.text.primary, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '9px 14px', fontSize: '13px', fontFamily: 'Inter, sans-serif' }} />
                <input value={explorerRegion} onChange={e => setExplorerRegion(e.target.value)}
                  placeholder={t('jexp_toute_region', lang)}
                  style={{ width: '180px', background: colors.background.surface, color: colors.text.primary, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '9px 14px', fontSize: '13px', fontFamily: 'Inter, sans-serif' }} />
              </div>

              {clubsLoading && <p style={{ color: colors.text.disabled, textAlign: 'center' }}>{t('jexp_chargement', lang)}</p>}

              {!clubsLoading && listeFiltree.length === 0 ? (
                <EmptyState dashed icon="🔍" title={t('jexp_aucun', lang)} />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                  {listeFiltree.map(p => {
                    const cardKey = `${active.id}-${p.id}`
                    const recrutements = explorerOnglet === 'clubs' ? (recrutementsParClub[p.id] || []) : []
                    const nomAffiche = explorerOnglet === 'scouts' ? `${p.prenom || ''} ${p.nom || ''}`.trim() : (p.club || `${p.prenom || ''} ${p.nom || ''}`.trim())
                    return (
                      <div key={cardKey}
                        style={{ background: colors.background.surface, border: `1px solid ${hoveredCard === cardKey ? active.accent : colors.background.raised}`, borderRadius: '14px', padding: '18px', cursor: 'pointer', transform: hoveredCard === cardKey ? 'translateY(-2px)' : 'none', transition: 'all 0.15s ease' }}
                        onClick={() => explorerOnglet === 'scouts' ? setRecruteurModal(p) : navigate(`/clubs/${p.id}`)}
                        onMouseEnter={() => setHoveredCard(cardKey)}
                        onMouseLeave={() => setHoveredCard(null)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                          {p.avatar_url
                            ? <img src={p.avatar_url} alt="" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${active.accent}30`, flexShrink: 0 }} />
                            : <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: colors.background.raised, border: `2px solid ${active.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', fontWeight: 800, color: active.accent, flexShrink: 0 }}>
                                {(nomAffiche || '?')[0].toUpperCase()}
                              </div>
                          }
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomAffiche || '—'}</p>
                              {explorerOnglet === 'clubs' && p.verified && <span title="Profil vérifié" style={{ fontSize: '12px' }}>✅</span>}
                            </div>
                            <BadgeNote cibleId={p.id} />
                          </div>
                        </div>

                        <p style={{ margin: '0 0 6px', fontSize: '12px', color: colors.text.faint }}>
                          {explorerOnglet === 'educateurs' && [p.niveau_equipe, p.region].filter(Boolean).join(' · ')}
                          {explorerOnglet === 'clubs' && p.region}
                          {explorerOnglet === 'scouts' && [p.type_recruteur, p.club, p.region].filter(Boolean).join(' · ')}
                        </p>
                        {(p.description || p.bio) && (
                          <p style={{ margin: '0 0 8px', fontSize: '12px', color: colors.text.disabled, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description || p.bio}</p>
                        )}

                        {recrutements.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '4px' }}>
                            {recrutements.map((r, i) => (
                              <span key={i} style={{ background: colors.accent.green + alpha.subtle, border: `1px solid ${colors.accent.green}50`, color: colors.accent.green, padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                                {t('jexp_recrute', lang)} · {r.categorie} · {r.poste}
                              </span>
                            ))}
                          </div>
                        )}

                        <p style={{ margin: '8px 0 0', color: active.accent, fontSize: '12px', textAlign: 'right' }}>Voir le profil →</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })()}

        {/* ── COMPÉTITION (lecture seule) ── */}
        {onglet === 'competition' && renduCompetition()}

        {/* ── MON ÉQUIPE ── */}
        {onglet === 'equipe' && (
          <div style={{ padding: isMobile ? '16px' : '24px 32px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px' }}>{t('jeq_titre', lang)}</h1>
            <p style={{ color: colors.text.faint, fontSize: '13px', marginBottom: '2rem' }}>{t('jeq_desc', lang)}</p>

            {/* Code d'entrée */}
            <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '20px', marginBottom: '1.5rem' }}>
              <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: '14px' }}>🔑 {t('jeq_rejoindre', lang)}</p>
              <p style={{ margin: '0 0 14px', fontSize: '12px', color: colors.text.faint }}>{t('jeq_rejoindre_desc', lang)}</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  style={{ flex: 1, background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: '10px', padding: '10px 14px', color: colors.text.primary, fontSize: '15px', fontFamily: 'monospace', letterSpacing: '2px', textTransform: 'uppercase' }}
                  placeholder="CODE ÉQUIPE"
                  value={codeEquipe}
                  onChange={e => { setCodeEquipe(e.target.value.toUpperCase()); setCodeError(null); setCodeSuccess(false) }}
                  onKeyDown={e => e.key === 'Enter' && rejoindreEquipe()}
                />
                <button onClick={rejoindreEquipe} disabled={sendingCode || !codeEquipe.trim()}
                  style={{ ...st.btnSolid(), opacity: codeEquipe.trim() ? 1 : 0.4 }}>
                  {sendingCode ? '...' : t('jeq_rejoindre_btn', lang)}
                </button>
              </div>
              {codeError && <p style={{ color: colors.accent.red, fontSize: '12px', marginTop: '8px', margin: '8px 0 0' }}>⚠️ {codeError}</p>}
              {codeSuccess && <p style={{ color: colors.accent.green, fontSize: '12px', marginTop: '8px', margin: '8px 0 0' }}>✅ {t('jeq_demande_envoyee', lang)}</p>}
            </div>

            {/* Mes affiliations */}
            {mesAffiliations.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{t('jeq_mes_educateurs', lang)}</p>
                {mesAffiliations.map(a => {
                  const pe = a.profil_educateur
                  const isAccepted = a.statut === 'accepte'
                  return (
                    <div key={a.id} style={{ background: colors.background.raised, borderRadius: '16px', overflow: 'hidden', border: `1px solid ${isAccepted ? colors.border.default : colors.border.default}` }}>
                      {isAccepted ? (
                        <div style={{ background: `linear-gradient(135deg, ${colors.accent.green}${alpha.subtle} 0%, ${colors.background.surface} 100%)`, padding: '20px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px', color: '#052e16', flexShrink: 0 }}>
                            {pe?.prenom?.[0]}{pe?.nom?.[0]}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 'bold', fontSize: '17px' }}>{pe?.prenom} {pe?.nom}</div>
                            <div style={{ color: colors.accent.green, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[pe?.club, pe?.categorie, pe?.niveau_championnat].filter(Boolean).join(' · ')}</div>
                            <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              <span style={{ background: '#22c55e' + alpha.subtle, border: '1px solid #22c55e', borderRadius: '20px', padding: '2px 10px', fontSize: '12px', color: '#22c55e' }}>
                                ✅ {t('profil_affilie', lang)}
                              </span>
                              {pe?.diplome && (
                                <span style={{ fontSize: '12px', color: colors.accent.green }}>🎓 {pe.diplome}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: colors.background.raised, border: `2px solid ${colors.border.default}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, color: colors.text.faint, flexShrink: 0 }}>
                            {pe?.prenom?.[0]}{pe?.nom?.[0]}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{pe?.prenom} {pe?.nom}</p>
                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.faint }}>{pe?.club} · {pe?.categorie} · {pe?.niveau_championnat}</p>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                            background: a.statut === 'en_attente' ? '#f59e0b15' : colors.accent.red + alpha.subtle,
                            color: a.statut === 'en_attente' ? '#f59e0b' : colors.accent.red,
                            border: `1px solid ${a.statut === 'en_attente' ? '#f59e0b30' : colors.accent.red + alpha.light}` }}>
                            {a.statut === 'en_attente' ? '⏳ En attente' : '✕ Refusé'}
                          </span>
                        </div>
                      )}

                      {isAccepted && (
                        <div style={{ padding: '16px' }}>
                          <button
                            onClick={() => chargerStatsJoueur(a.id, a.equipe_joueur_id, a.educateur_id)}
                            disabled={!a.equipe_joueur_id || statsLoading[a.id]}
                            style={{ width: '100%', background: '#22c55e', color: 'black', border: 'none', borderRadius: '10px', padding: '14px', fontWeight: 'bold', fontSize: '15px', cursor: a.equipe_joueur_id ? 'pointer' : 'not-allowed', opacity: a.equipe_joueur_id ? 1 : 0.4 }}>
                            {statsLoading[a.id] ? '...' : '📊 Mes stats'}
                          </button>
                          {/* Plus de bouton "Évaluer" ici — le rappel apparaît en pop-up
                              quand le coach clôture la saison (cf. cloturesAEvaluer). */}

                          {/* Stats chargées */}
                          {statsJoueur[a.id] && (() => {
                            const s = statsJoueur[a.id]
                            const pct = s.tauxPresence ?? 0
                            const r = 44
                            const circ = 2 * Math.PI * r
                            const dash = (pct / 100) * circ
                            const presColor = pct >= 80 ? colors.accent.green : pct >= 60 ? '#f59e0b' : colors.accent.red
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '18px', paddingTop: '24px', borderTop: `1px solid ${colors.border.subtle}` }}>

                                {/* Présence + Stats match côte à côte */}
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '200px 1fr', gap: '16px', alignItems: 'stretch' }}>
                                  <div style={{ background: colors.background.surface, borderRadius: '20px', padding: '24px 20px', border: `1px solid ${colors.border.subtle}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                                    <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, color: colors.text.disabled, letterSpacing: '2px', textTransform: 'uppercase' }}>{t('aff_taux_presence', lang)}</p>
                                    <svg width="110" height="110" viewBox="0 0 100 100">
                                      <circle cx="50" cy="50" r={r} fill="none" stroke={colors.border.subtle} strokeWidth="9" />
                                      <circle cx="50" cy="50" r={r} fill="none" stroke={presColor} strokeWidth="9"
                                        strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ / 4} strokeLinecap="round"
                                        style={{ filter: `drop-shadow(0 0 8px ${presColor}50)` }} />
                                      <text x="50" y="46" textAnchor="middle" fill={presColor} fontSize="16" fontWeight="800" fontFamily="Inter, sans-serif">{pct}%</text>
                                      <text x="50" y="62" textAnchor="middle" fill={colors.text.disabled} fontSize="9" fontFamily="Inter, sans-serif">{s.present}/{s.total} {t('stats_seances_plural', lang)}</text>
                                    </svg>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                      <span style={{ background: colors.accent.amber + alpha.subtle, border: '1px solid #fbbf2430', color: colors.accent.amber, fontSize: '11px', padding: '4px 12px', borderRadius: '20px', fontWeight: 600 }}>⭐ {s.points} pts</span>
                                      {s.rankPoints?.rank === 1 && <span style={{ background: '#fbbf2412', border: '1px solid #fbbf2430', color: colors.accent.amber, fontSize: '11px', padding: '4px 12px', borderRadius: '20px' }}>🏆 {t('aff_meilleur_equipe', lang)}</span>}
                                    </div>
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                                    {[
                                      { label: t('jp_matchs_joues', lang), value: s.matchsJoues, color: colors.accent.blue, rank: s.rankMatchs },
                                      { label: t('comp_buts', lang), value: s.buts, color: colors.accent.green, rank: s.rankButs },
                                      { label: t('club_passes_dec_emoji', lang), value: s.passes, color: colors.accent.purpleLight, rank: s.rankPasses },
                                      { label: t('jp_clean_sheets', lang), value: s.cleanSheets, color: '#34d399', rank: s.rankClean },
                                    ].map(stat => (
                                      <div key={stat.label} style={{ background: colors.background.surface, borderRadius: '18px', padding: '18px 16px', border: `1px solid ${stat.color}18`, position: 'relative', overflow: 'hidden' }}>
                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${stat.color}, transparent)` }} />
                                        <p style={{ margin: '0 0 10px', fontSize: '10px', color: colors.text.disabled, textTransform: 'uppercase', letterSpacing: '1px' }}>{stat.label}</p>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                                          <span style={{ fontSize: '40px', fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value}</span>
                                          {stat.rank?.rank && stat.rank?.total > 1 && (
                                            <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '20px', background: stat.rank.rank === 1 ? colors.accent.amber + alpha.soft : '#ffffff08', color: stat.rank.rank === 1 ? colors.accent.amber : colors.text.faint, border: `1px solid ${stat.rank.rank === 1 ? colors.accent.amber + alpha.medium : colors.border.subtle}` }}>
                                              #{stat.rank.rank}/{stat.rank.total}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Pills minutes/cartons */}
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '12px', color: colors.accent.blue, background: '#60a5fa12', border: '1px solid #60a5fa25', padding: '5px 14px', borderRadius: '20px', fontWeight: 600 }}>⏱ {s.minutesJouees} min</span>
                                  {s.jaunes > 0 && <span style={{ fontSize: '12px', color: '#f59e0b', background: '#f59e0b12', border: '1px solid #f59e0b25', padding: '5px 14px', borderRadius: '20px', fontWeight: 600 }}>🟨 {s.jaunes}</span>}
                                  {s.rouges > 0 && <span style={{ fontSize: '12px', color: colors.accent.red, background: '#ef444412', border: '1px solid #ef444425', padding: '5px 14px', borderRadius: '20px', fontWeight: 600 }}>🟥 {s.rouges}</span>}
                                </div>

                                {/* Présence mensuelle + Avis éducateur côte à côte */}
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                                  {s.presenceMensuelle?.length > 0 && (
                                    <div style={{ background: colors.background.surface, borderRadius: '20px', padding: '20px 22px', border: `1px solid ${colors.border.subtle}` }}>
                                      <p style={{ margin: '0 0 16px', fontSize: '10px', fontWeight: 700, color: colors.text.disabled, letterSpacing: '2px', textTransform: 'uppercase' }}>{t('club_presence_par_mois', lang)}</p>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {s.presenceMensuelle.map(({ month, taux, present, total }) => {
                                          const [y, m] = month.split('-')
                                          const label = new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString(localeOf(lang), { month: 'long', year: '2-digit' })
                                          const color = taux >= 80 ? colors.accent.green : taux >= 60 ? '#f59e0b' : colors.accent.red
                                          return (
                                            <div key={month}>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                <span style={{ fontSize: '11px', color: colors.text.dim, textTransform: 'capitalize' }}>{label}</span>
                                                <span style={{ fontSize: '11px', fontWeight: 700, color }}>{taux}% <span style={{ color: colors.border.strong, fontWeight: 400 }}>({present}/{total})</span></span>
                                              </div>
                                              <div style={{ height: '6px', background: colors.background.raised, borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{ width: `${taux}%`, height: '100%', background: `linear-gradient(90deg, ${color}, ${color}88)`, borderRadius: '3px' }} />
                                              </div>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )}
                                  <div style={{ background: colors.background.surface, borderRadius: '20px', padding: '20px 22px', border: `1px solid ${colors.border.subtle}` }}>
                                    <p style={{ margin: '0 0 16px', fontSize: '10px', fontWeight: 700, color: colors.text.disabled, letterSpacing: '2px', textTransform: 'uppercase' }}>{t('aff_avis_educateur_court', lang)}</p>
                                    {s.noteEdu ? (
                                      <>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: s.noteEdu.commentaire ? '14px' : '0' }}>
                                          {[
                                            { label: t('aff_technique', lang), value: s.noteEdu.technique, color: colors.accent.blue },
                                            { label: t('aff_physique', lang), value: s.noteEdu.physique, color: colors.accent.green },
                                            { label: t('aff_mental', lang), value: s.noteEdu.mental, color: colors.accent.purpleLight },
                                            { label: t('aff_tactique', lang), value: s.noteEdu.tactique, color: '#f59e0b' },
                                          ].map(n => (
                                            <div key={n.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                              <span style={{ fontSize: '11px', color: colors.text.faint, width: '70px', flexShrink: 0 }}>{n.label}</span>
                                              <div style={{ flex: 1, height: '6px', background: colors.background.raised, borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{ width: `${((n.value || 0) / 5) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${n.color}, ${n.color}88)`, borderRadius: '3px' }} />
                                              </div>
                                              <span style={{ fontSize: '13px', fontWeight: 700, color: n.color, width: '16px', textAlign: 'right', flexShrink: 0 }}>{n.value || 0}</span>
                                            </div>
                                          ))}
                                        </div>
                                        {s.noteEdu.commentaire && (
                                          <p style={{ margin: 0, fontSize: '12px', color: colors.text.muted, fontStyle: 'italic', borderTop: `1px solid ${colors.border.subtle}`, paddingTop: '12px', lineHeight: 1.6 }}>"{s.noteEdu.commentaire}"</p>
                                        )}
                                      </>
                                    ) : <p style={{ margin: 0, fontSize: '12px', color: colors.border.strong, fontStyle: 'italic' }}>{t('aff_pas_note_partagee', lang)}</p>}
                                  </div>
                                </div>

                                {/* Prochains matchs */}
                                {s.prochainMatchs?.length > 0 && (
                                  <div>
                                    <p style={{ margin: '0 0 12px', fontSize: '10px', fontWeight: 700, color: colors.text.disabled, letterSpacing: '2px', textTransform: 'uppercase' }}>{t('aff_prochains_matchs', lang)}</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px' }}>
                                      {s.prochainMatchs.map((m, i) => {
                                        const d = new Date(m.date)
                                        return (
                                          <div key={i} style={{ background: colors.background.surface, borderRadius: '16px', padding: '14px 18px', border: `1px solid ${colors.border.subtle}`, display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <div style={{ background: 'linear-gradient(135deg, #4ade8020, #4ade8008)', border: '1px solid #4ade8030', borderRadius: '12px', padding: '8px 12px', textAlign: 'center', flexShrink: 0, minWidth: '50px' }}>
                                              <p style={{ margin: 0, fontSize: '9px', color: colors.accent.green, fontWeight: 700, textTransform: 'uppercase' }}>{d.toLocaleDateString(localeOf(lang), { weekday: 'short' })}</p>
                                              <p style={{ margin: '2px 0', fontSize: '22px', fontWeight: 800, color: colors.accent.green, lineHeight: 1 }}>{d.getDate()}</p>
                                              <p style={{ margin: 0, fontSize: '9px', color: '#4ade8070', textTransform: 'uppercase' }}>{d.toLocaleDateString(localeOf(lang), { month: 'short' })}</p>
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                              <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: colors.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {m.equipe_domicile} <span style={{ color: colors.border.strong, fontWeight: 400, fontSize: '12px' }}>vs</span> {m.equipe_exterieur}
                                              </p>
                                              <p style={{ margin: 0, fontSize: '11px', color: colors.text.faint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {[m.heure, m.competition, m.lieu ? `📍 ${m.lieu}` : ''].filter(Boolean).join(' · ')}
                                              </p>
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Classements — pleine largeur */}
                                <div>
                                  <p style={{ margin: '0 0 12px', fontSize: '10px', fontWeight: 700, color: colors.text.disabled, letterSpacing: '2px', textTransform: 'uppercase' }}>{t('aff_classements_equipe', lang)}</p>
                                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '12px' }}>
                                    {[
                                      { title: t('aff_top_buteurs', lang), icon: '⚽', data: s.leaderButs, color: colors.accent.green },
                                      { title: t('aff_top_passeurs', lang), icon: '🎯', data: s.leaderPasses, color: colors.accent.blue },
                                      { title: t('aff_top_victoires', lang), icon: '🏆', data: s.leaderVictoires, color: colors.accent.amber },
                                      { title: t('aff_points_seance', lang), icon: '⭐', data: s.leaderPoints, color: colors.accent.purpleLight },
                                    ].map(({ title, icon, data, color }) => (
                                      <div key={title} style={{ background: colors.background.surface, borderRadius: '18px', padding: '16px', border: `1px solid ${colors.border.subtle}`, position: 'relative', overflow: 'hidden' }}>
                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${color}60, transparent)` }} />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                                          <span>{icon}</span>
                                          <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</p>
                                        </div>
                                        {data?.length > 0 ? data.slice(0, 5).map((row, i) => (
                                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', background: row.isMe ? `${color}10` : 'transparent', borderRadius: '8px', padding: '5px 6px', border: row.isMe ? `1px solid ${color}25` : '1px solid transparent' }}>
                                            <span style={{ fontSize: '10px', fontWeight: 800, color: i === 0 ? colors.accent.amber : colors.icon.muted, width: '14px', flexShrink: 0 }}>{i + 1}</span>
                                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: row.isMe ? `${color}20` : colors.background.raised, border: `1px solid ${row.isMe ? color + '40' : colors.border.default}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 800, color: row.isMe ? color : colors.text.faint, flexShrink: 0 }}>
                                              {row.nom.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                            </div>
                                            <span style={{ fontSize: '11px', color: row.isMe ? color : colors.text.dim, flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontWeight: row.isMe ? 700 : 400 }}>
                                              {row.isMe ? t('jcoach_toi', lang) : row.nom.split(' ')[0]}
                                            </span>
                                            <span style={{ fontSize: '12px', fontWeight: 800, color: row.isMe ? color : colors.text.faint, flexShrink: 0 }}>{row.val}</span>
                                          </div>
                                        )) : <p style={{ margin: 0, fontSize: '11px', color: colors.border.strong }}>—</p>}
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {s.ligueUrl && (
                                  <a href={s.ligueUrl} target="_blank" rel="noopener noreferrer"
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '14px', border: '1px solid #fbbf2430', background: 'linear-gradient(135deg, #fbbf2410, #f59e0b08)', color: colors.accent.amber, fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
                                    🏆 {t('aff_classement_championnat', lang)} →
                                  </a>
                                )}

                                {/* Stats équipe */}
                                <div style={{ paddingTop: '20px', borderTop: `1px solid ${colors.border.subtle}` }}>
                                  <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: '14px' }}>📊 Stats de l'équipe</p>
                                  <StatsEquipe matchs={s.matchsEquipe || []} />
                                </div>

                                {/* Mes évaluations — notations_match par match, regroupées par saison
                                    (juillet-juin) à partir de la date du match plutôt qu'un archivage
                                    séparé : ces lignes ne sont jamais "remises à zéro", elles restent
                                    consultables indéfiniment. */}
                                <div style={{ paddingTop: '20px', borderTop: `1px solid ${colors.border.subtle}` }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                                    <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>📝 Mes évaluations</p>
                                    <span style={{ color: colors.text.ghost, fontSize: '11px' }}>Saison {s.saisonActuelle}</span>
                                  </div>

                                  {(!s.evals || s.evals.length === 0) ? (
                                    <p style={{ color: colors.text.disabled, fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>Aucune évaluation cette saison.</p>
                                  ) : (() => {
                                    const moy = (s.evals.reduce((sum, n) => sum + Number(n.note), 0) / s.evals.length).toFixed(1)
                                    const couleurMoy = moy >= 7 ? colors.accent.green : moy >= 5 ? colors.accent.amber : colors.accent.red
                                    const ouvert = evalOuverte?.affiliationId === a.id ? evalOuverte.index : null
                                    return (
                                      <>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', padding: '12px 16px', background: colors.background.surface, borderRadius: '10px', border: `1px solid ${couleurMoy}` }}>
                                          <span style={{ color: colors.text.faint, fontSize: '13px' }}>Moyenne saison :</span>
                                          <span style={{ fontSize: '20px', fontWeight: 800, color: couleurMoy }}>{moy}/10</span>
                                          <span style={{ color: colors.text.ghost, fontSize: '12px', marginLeft: 'auto' }}>{s.evals.length} match{s.evals.length > 1 ? 's' : ''} évalué{s.evals.length > 1 ? 's' : ''}</span>
                                        </div>

                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: ouvert !== null ? '16px' : 0 }}>
                                          {s.evals.map((n, i) => {
                                            const note = Number(n.note)
                                            const c = note >= 7 ? colors.accent.green : note >= 5 ? colors.accent.amber : colors.accent.red
                                            const m = n.matchs_equipe
                                            return (
                                              <div key={i}
                                                onClick={() => setEvalOuverte(ouvert === i ? null : { affiliationId: a.id, index: i })}
                                                title={`${m?.domicile ? 'vs' : '@'} ${m?.adversaire || 'Match'}${m?.date ? ' · ' + new Date(m.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}`}
                                                style={{
                                                  width: '52px', height: '52px', borderRadius: '10px', cursor: 'pointer',
                                                  background: c + alpha.subtle, border: `2px solid ${ouvert === i ? c : c + alpha.light}`,
                                                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                  transform: ouvert === i ? 'scale(1.08)' : 'scale(1)', transition: 'transform 0.15s',
                                                }}>
                                                <span style={{ color: c, fontWeight: 800, fontSize: '17px', lineHeight: 1 }}>{n.note}</span>
                                                <span style={{ color: colors.text.ghost, fontSize: '9px' }}>/10</span>
                                              </div>
                                            )
                                          })}
                                        </div>

                                        {ouvert !== null && s.evals[ouvert] && (() => {
                                          const ev = s.evals[ouvert]
                                          const m = ev.matchs_equipe
                                          const note = Number(ev.note)
                                          const c = note >= 7 ? colors.accent.green : note >= 5 ? colors.accent.amber : colors.accent.red
                                          const criteres = ev.criteres || {}
                                          const aCriteres = criteres.technique || criteres.physique || criteres.mental || criteres.tactique
                                          return (
                                            <div style={{ background: colors.background.surface, border: `1px solid ${c}40`, borderRadius: '14px', padding: '18px', marginBottom: '4px' }}>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: aCriteres || ev.commentaire ? '14px' : 0 }}>
                                                <div>
                                                  <p style={{ margin: 0, color: colors.text.primary, fontWeight: 700, fontSize: '15px' }}>
                                                    {m?.domicile ? 'vs' : '@'} {m?.adversaire || 'Match'}
                                                    {m?.score_nous != null ? ` · ${m.score_nous} - ${m.score_eux}` : ''}
                                                  </p>
                                                  <p style={{ margin: '2px 0 0', color: colors.text.ghost, fontSize: '12px' }}>
                                                    {m?.date ? new Date(m.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
                                                    {m?.competition ? ` · ${m.competition}` : ''}
                                                  </p>
                                                </div>
                                                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                                                  <p style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: c }}>{ev.note}<span style={{ fontSize: '13px', color: colors.text.ghost }}>/10</span></p>
                                                </div>
                                              </div>
                                              {aCriteres && (
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: ev.commentaire ? '14px' : 0 }}>
                                                  {['technique', 'physique', 'mental', 'tactique'].map(cl => criteres[cl] ? (
                                                    <div key={cl} style={{ background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                                                      <p style={{ margin: 0, color: colors.text.primary, fontWeight: 700, fontSize: '14px' }}>{criteres[cl]}</p>
                                                      <p style={{ margin: 0, color: colors.text.ghost, fontSize: '10px', textTransform: 'capitalize' }}>{cl}</p>
                                                    </div>
                                                  ) : null)}
                                                </div>
                                              )}
                                              {ev.commentaire && (
                                                <div style={{ background: colors.background.base, borderRadius: '8px', padding: '12px 14px', borderLeft: `3px solid ${c}` }}>
                                                  <p style={{ margin: 0, color: colors.text.secondary, fontSize: '13px', fontStyle: 'italic', lineHeight: 1.5 }}>"{ev.commentaire}"</p>
                                                </div>
                                              )}
                                            </div>
                                          )
                                        })()}
                                      </>
                                    )
                                  })()}

                                  {s.evalsParSaison && Object.keys(s.evalsParSaison).length > 0 && (
                                    <div style={{ marginTop: '20px' }}>
                                      <p style={{ margin: '0 0 12px', color: colors.text.faint, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Saisons précédentes</p>
                                      {Object.entries(s.evalsParSaison).sort(([a2], [b2]) => b2.localeCompare(a2)).map(([saison, list]) => {
                                        const moySaison = (list.reduce((sum, n) => sum + Number(n.note), 0) / list.length).toFixed(1)
                                        const c = moySaison >= 7 ? colors.accent.green : moySaison >= 5 ? colors.accent.amber : colors.accent.red
                                        return (
                                          <div key={saison} style={{ background: colors.background.base, border: `1px solid ${colors.border.faint}`, borderRadius: '10px', padding: '12px 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                              <p style={{ margin: 0, color: colors.text.primary, fontWeight: 600, fontSize: '13px' }}>Saison {saison}</p>
                                              <p style={{ margin: 0, color: colors.text.ghost, fontSize: '11px' }}>{list.length} match{list.length > 1 ? 's' : ''} évalué{list.length > 1 ? 's' : ''}</p>
                                            </div>
                                            <p style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: c }}>{moySaison}<span style={{ fontSize: '10px', color: colors.text.ghost }}>/10</span></p>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })()}

                          {/* Joueur lié mais pas encore dans l'effectif */}
                          {!a.equipe_joueur_id && (
                            <p style={{ margin: '8px 0 0', fontSize: '11px', color: colors.text.disabled, fontStyle: 'italic' }}>
                              ⏳ {t('aff_educateur_doit_lier', lang)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {mesAffiliations.length === 0 && (
              <EmptyState icon="🏟️" title="Tu n'es encore affilié à aucune équipe" subtitle="Entre un code d'équipe pour commencer." />
            )}
          </div>
        )}

      </main>

      {/* Rappel d'évaluation — apparaît quand le coach a clôturé une saison
          (historique_saisons.cloturee) et que ce joueur ne l'a pas encore
          évalué pour cette saison (notes_educateur). Remplace l'ancien bouton
          "Évaluer" permanent à côté des stats. */}
      {cloturesAEvaluer.length > 0 && !rappelClotureFerme && !eduNote && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: colors.background.base, border: '2px solid #4ade8050', boxShadow: '0 0 0 1px #4ade8010', borderRadius: '20px', width: '100%', maxWidth: '440px', padding: '28px', textAlign: 'center' }}>
            <p style={{ fontSize: '32px', margin: '0 0 12px' }}>🏆</p>
            <p style={{ margin: '0 0 8px', fontWeight: 800, fontSize: '17px' }}>Saison terminée !</p>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: colors.text.faint, lineHeight: 1.5 }}>
              {cloturesAEvaluer[0].affiliation?.profil_educateur?.prenom} {cloturesAEvaluer[0].affiliation?.profil_educateur?.nom} a clôturé la saison {cloturesAEvaluer[0].saison}. Donne ton avis sur ton coach !
            </p>
            <button
              onClick={() => {
                const h = cloturesAEvaluer[0]
                setNoteSaison(h.saison)
                setEduNote(h.affiliation)
                setNoteCriteres({})
                setNoteCommentaire('')
                setNotePublic(true)
              }}
              style={{ width: '100%', background: colors.accent.green, color: colors.background.base, border: 'none', padding: '13px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', marginBottom: '10px' }}>
              ⭐ Évaluer maintenant
            </button>
            <button
              onClick={() => setRappelClotureFerme(true)}
              style={{ width: '100%', background: 'none', border: 'none', color: colors.text.faint, fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>
              Plus tard
            </button>
          </div>
        </div>
      )}

      {/* Modal notation éducateur */}
      {eduNote && (
        <div onClick={() => setEduNote(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: colors.background.base, border: `1px solid ${colors.border.subtle}`, borderRadius: '20px', width: '100%', maxWidth: '640px', padding: '24px', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <p style={{ margin: '0 0 2px', fontWeight: 800, fontSize: '16px' }}>⭐ Évaluer {eduNote.profil_educateur?.prenom} {eduNote.profil_educateur?.nom}</p>
                <p style={{ margin: 0, fontSize: '12px', color: colors.text.faint }}>Ton évaluation est anonyme et aide à améliorer la qualité de l'encadrement.</p>
              </div>
              <button onClick={() => setEduNote(null)} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Saison */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', color: colors.text.faint, flexShrink: 0 }}>Saison évaluée :</label>
              <select value={noteSaison} onChange={e => setNoteSaison(e.target.value)}
                style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '8px', color: colors.text.primary, padding: '6px 10px', fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>
                {['2024-2025','2023-2024','2022-2023'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            {/* 6 catégories */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
              {CRITERES_EDU_KEYS.map(cat => (
                <div key={cat.key} style={{ background: colors.background.surface, borderRadius: '12px', padding: '14px', border: `1px solid ${cat.color}20` }}>
                  <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: '13px', color: cat.color }}>{cat.label}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {cat.criteres.map(c => (
                      <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ flex: 1, fontSize: '12px', color: colors.text.secondary }}>{c.label}</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {[1,2,3,4,5].map(n => (
                            <button key={n} onClick={() => setNoteCriteres(prev => ({ ...prev, [c.key]: n }))}
                              style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: (noteCriteres[c.key] || 0) >= n ? cat.color : colors.icon.muted, padding: '2px', lineHeight: 1 }}>
                              ★
                            </button>
                          ))}
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: cat.color, width: '16px', textAlign: 'right' }}>{noteCriteres[c.key] || ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Commentaire */}
            <div style={{ marginBottom: '14px' }}>
              <textarea value={noteCommentaire} onChange={e => setNoteCommentaire(e.target.value)}
                placeholder="Commentaire (optionnel)..."
                style={{ width: '100%', background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '10px', padding: '10px 14px', color: colors.text.primary, fontSize: '13px', fontFamily: 'Inter, sans-serif', resize: 'vertical', minHeight: '80px', boxSizing: 'border-box' }} />
            </div>

            {/* Visibilité */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: colors.text.secondary, marginBottom: '16px' }}>
              <input type="checkbox" checked={notePublic} onChange={e => setNotePublic(e.target.checked)} />
              Rendre mon commentaire public (visible par les recruteurs)
            </label>

            <button onClick={soumettreNoteEdu} disabled={savingNote || CRITERES_EDU_KEYS.flatMap(c => c.criteres).some(c => !noteCriteres[c.key])}
              style={{ ...st.btnSolid(), width: '100%', opacity: CRITERES_EDU_KEYS.flatMap(c => c.criteres).every(c => noteCriteres[c.key]) ? 1 : 0.4 }}>
              {savingNote ? '⏳ Envoi...' : '✅ Soumettre l\'évaluation'}
            </button>
          </div>
        </div>
      )}

      {/* Modal profil recruteur */}
      {recruteurModal && (
        <div onClick={() => setRecruteurModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: colors.background.surface, border: `1px solid ${colors.border.faint}`, borderRadius: '20px', padding: '2rem', maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                {recruteurModal.avatar_url
                  ? <img src={recruteurModal.avatar_url} alt="" style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #4ade8040' }} />
                  : <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#1a2e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800, color: colors.accent.green }}>
                      {(recruteurModal.prenom || '?')[0]}{(recruteurModal.nom || '?')[0]}
                    </div>
                }
                <div>
                  <h2 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 800 }}>{recruteurModal.prenom} {recruteurModal.nom}</h2>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {recruteurModal.type_recruteur && <span style={{ background: colors.accent.green + alpha.subtle, border: '1px solid #4ade8030', color: colors.accent.green, fontSize: '11px', fontWeight: 700, padding: '2px 10px', borderRadius: '20px' }}>{recruteurModal.type_recruteur}</span>}
                    <BadgeNote cibleId={recruteurModal.id} />
                  </div>
                </div>
              </div>
              <button onClick={() => setRecruteurModal(null)} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1.5rem' }}>
              {recruteurModal.club && <div style={{ background: colors.background.raised, borderRadius: '8px', padding: '10px 14px' }}><p style={{ margin: 0, fontSize: '11px', color: colors.text.faint }}>🏟️ Club / Agence</p><p style={{ margin: '4px 0 0', fontWeight: 600, fontSize: '14px' }}>{recruteurModal.club}</p></div>}
              {recruteurModal.region && <div style={{ background: colors.background.raised, borderRadius: '8px', padding: '10px 14px' }}><p style={{ margin: 0, fontSize: '11px', color: colors.text.faint }}>📍 Région</p><p style={{ margin: '4px 0 0', fontWeight: 600, fontSize: '14px' }}>{recruteurModal.region}</p></div>}
            </div>

            {recruteurModal.description && (
              <div style={{ background: colors.background.raised, borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
                <p style={{ fontSize: '11px', color: colors.accent.green, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px' }}>Présentation</p>
                <p style={{ fontSize: '13px', color: colors.text.secondary, lineHeight: 1.6, margin: 0 }}>{recruteurModal.description}</p>
              </div>
            )}

            {recruteurModal.recherche_profil && (
              <div style={{ background: colors.background.raised, borderRadius: '10px', padding: '14px' }}>
                <p style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px' }}>🔍 Ce qu'il recherche</p>
                <p style={{ fontSize: '13px', color: colors.text.secondary, lineHeight: 1.6, margin: 0 }}>{recruteurModal.recherche_profil}</p>
              </div>
            )}

            {!recruteurModal.description && !recruteurModal.recherche_profil && (
              <EmptyState compact title="Ce recruteur n'a pas encore complété son profil." />
            )}

            <button
              onClick={() => { setNotationCible(recruteurModal); setRecruteurModal(null) }}
              style={{ ...st.btn(colors.accent.amber), width: '100%', marginTop: '1rem', padding: '10px', borderRadius: '10px', fontWeight: 700 }}>
              ⭐ {(() => {
                const t = (recruteurModal?.type_recruteur || '').toLowerCase()
                if (t.includes('club') || t.includes('directeur')) return 'Noter ce club'
                if (t.includes('éducateur') || t.includes('educateur') || t.includes('coach') || t.includes('entraîneur')) return 'Noter cet éducateur'
                if (t.includes('agent')) return 'Noter cet agent'
                return 'Noter ce recruteur'
              })()}
            </button>
          </div>
        </div>
      )}

      {/* Modal notation */}
      {notationCible && (
        <ModalNotation
          auteurId={userId}
          cible={notationCible}
          onClose={() => setNotationCible(null)}
          onDone={() => setNotationCible(null)}
        />
      )}
    </div>
  )
}

export default DashboardJoueur

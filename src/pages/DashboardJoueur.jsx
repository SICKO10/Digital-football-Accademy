import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'
import Loader from '../components/Loader'
import Avatar from '../components/Avatar'
import { notifierJoueur } from '../lib/notifications'
import { FifaCardGenerator } from '../components/FifaCard'
import { ModalNotation, BadgeNote } from '../components/Notation'
import { CRITERES_EDU as CRITERES_EDU_KEYS } from './DashboardEducateur'
import { CATEGORIES } from '../lib/categories'
import PrepPhysiqueJoueur from '../components/prepphysique/PrepPhysiqueJoueur'
import HistoriqueSaisons from '../components/saisons/HistoriqueSaisons'
import { useLang } from '../hooks/useLang'
import { t, localeOf } from '../lib/translations'
import { STRIPE_LINKS, stripeUrl } from '../lib/stripeLinks'

// CATEGORIES + valeurs historiques encore utilisées par certains profils (U21, Veteran)
const CATEGORIES_JOUEUR = [...CATEGORIES.slice(0, -1), 'U21', 'Seniors', 'Veteran']
const CATEGORIES_CLUB_HISTORIQUE = [...CATEGORIES.slice(0, -1), 'U21', 'Seniors']

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
const IconMic = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
const IconVideoOff = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
    <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
  </svg>
)
const IconLock = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)
const IconSearch = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
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

function UpgradeCard({ titre, texte, lang = 'fr', userId }) {
  return (
    <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '20px', padding: '3rem 2rem', textAlign: 'center', maxWidth: '480px', margin: '0 auto' }}>
      <div style={{ color: '#2a2a2a', display: 'flex', justifyContent: 'center', marginBottom: '16px' }}><IconLock /></div>
      <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>{titre}</h2>
      <p style={{ fontSize: '13px', color: '#555', maxWidth: '300px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>{texte}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button onClick={() => window.location.href = stripeUrl(STRIPE_LINKS.starter, userId)} style={{ background: 'transparent', color: 'white', border: '1px solid #2a2a2a', padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{t('aff_starter_prix', lang)}</button>
        <button onClick={() => window.location.href = stripeUrl(STRIPE_LINKS.pro, userId)} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{t('aff_pro_prix', lang)}</button>
      </div>
    </div>
  )
}

function ProfilAffilieOnglet({ profil, userId, setProfil, lang = 'fr' }) {
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
    setSaving(true)
    await supabase.from('profiles').update(profilForm).eq('id', userId)
    setProfil(prev => ({ ...prev, ...profilForm }))
    setSaving(false); setSaved(true)
    setTimeout(() => { setSaved(false); setEditProfil(false) }, 1500)
  }

  const postes = ['Gardien', 'Défenseur central', 'Latéral droit', 'Latéral gauche', 'Milieu défensif', 'Milieu central', 'Milieu offensif', 'Ailier droit', 'Ailier gauche', 'Attaquant']

  return (
    <div style={{ maxWidth: '560px' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #0d1f0d, #111)', border: '1px solid #1a2e1a', borderRadius: '20px', padding: '28px 24px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Avatar person={profil} size={72} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '20px', letterSpacing: '-0.5px' }}>
            {profil?.prenom || '—'} {profil?.nom || ''}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#4ade80' }}>
            {profil?.poste || t('aff_poste_non_renseigne', lang)}
          </p>
          {profil?.categorie && (
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#555' }}>{profil.categorie}{profil?.club ? ` · ${profil.club}` : ''}</p>
          )}
        </div>
        <button onClick={() => setEditProfil(!editProfil)}
          style={{ background: editProfil ? '#4ade8020' : '#111', border: `1px solid ${editProfil ? '#4ade8060' : '#2a2a2a'}`, color: editProfil ? '#4ade80' : '#555', borderRadius: '10px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>
          {editProfil ? t('btn_annuler', lang) : `✏️ ${t('btn_modifier', lang)}`}
        </button>
      </div>

      {/* Infos / Formulaire */}
      <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                <label style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{label}</label>
                <input type={type} value={profilForm[key]}
                  onChange={e => setProfilForm(prev => ({ ...prev, [key]: e.target.value }))}
                  style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '9px 12px', color: '#fff', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none' }} />
              </div>
            ))}
            <div>
              <label style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{t('equipe_poste', lang)}</label>
              <select value={profilForm.poste} onChange={e => setProfilForm(prev => ({ ...prev, poste: e.target.value }))}
                style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '9px 12px', color: '#fff', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none' }}>
                <option value="">{t('aff_selectionner', lang)}</option>
                {postes.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{t('equipe_pied', lang)}</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[['droit', t('equipe_droit', lang)], ['gauche', t('equipe_gauche', lang)], ['les deux', t('equipe_les_deux', lang)]].map(([p, label]) => (
                  <button key={p} onClick={() => setProfilForm(prev => ({ ...prev, pied: p }))}
                    style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `1px solid ${profilForm.pied === p ? '#4ade8060' : '#2a2a2a'}`, background: profilForm.pied === p ? '#4ade8015' : '#0a0a0a', color: profilForm.pied === p ? '#4ade80' : '#555', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', textTransform: 'capitalize' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={sauvegarder} disabled={saving}
              style={{ background: '#4ade80', color: '#000', border: 'none', borderRadius: '10px', padding: '12px', fontWeight: 800, fontSize: '14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginTop: '4px' }}>
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
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '4px 0', borderBottom: '1px solid #141414' }}>
                <span style={{ color: '#555' }}>{label}</span>
                <span style={{ fontWeight: 600, color: '#ccc' }}>{val}</span>
              </div>
            ))}
            {[profil?.prenom, profil?.nom, profil?.poste].every(v => !v) && (
              <p style={{ margin: 0, fontSize: '13px', color: '#333', textAlign: 'center', padding: '12px 0' }}>
                {t('aff_clique_sur', lang)} <strong style={{ color: '#555' }}>{t('btn_modifier', lang)}</strong> {t('aff_clique_modifier_profil', lang)}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function DashboardJoueur() {
  const navigate = useNavigate()
  const [profil, setProfil] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState({ email_analyse: true, email_like: true, email_commentaire: true, email_message: true })
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

  // Explorer (clubs + recruteurs)
  const [clubsListe, setClubsListe] = useState([])
  const [recruteursList, setRecruteursList] = useState([])
  const [clubsLoading, setClubsLoading] = useState(false)
  const [explorerFiltre, setExplorerFiltre] = useState('tous') // 'tous' | 'clubs' | 'recruteurs'
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Mon Équipe (affiliation éducateur)
  const [mesAffiliations, setMesAffiliations] = useState([])
  // Widget sondage présence + calendrier (accueil joueur affilié)
  const [widgetProchainEnt, setWidgetProchainEnt] = useState(null)
  const [widgetProchainMatch, setWidgetProchainMatch] = useState(null)
  const [widgetDispoEnt, setWidgetDispoEnt] = useState(null)
  const [widgetDispoMatch, setWidgetDispoMatch] = useState(null)
  const [widgetCalendrier, setWidgetCalendrier] = useState([])
  const [savingDispo, setSavingDispo] = useState(false)
  const [dispoMap, setDispoMap] = useState({}) // { [entrainementOuMatchId]: statut } — pour la liste des 4 prochaines échéances
  const [pendingDispo, setPendingDispo] = useState({}) // { [eventId]: statut } — choix pas encore validé (avant clic sur "Valider")
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

  const { lang, setLang } = useLang()

  useEffect(() => { getProfil() }, [])

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (onglet === 'coach' && userId) {
      localStorage.setItem(`coach_read_${userId}`, new Date().toISOString())
      setCoachUnread(0)
    }
    if (onglet === 'clubs' && clubsListe.length === 0 && recruteursList.length === 0) {
      setClubsLoading(true)
      Promise.all([
        supabase.from('profiles').select('id, prenom, nom, club, region, niveau_equipe, avatar_url, description').eq('plan', 'educateur'),
        supabase.from('profiles').select('id, prenom, nom, club, region, type_recruteur, avatar_url, description').eq('plan', 'recruteur'),
      ]).then(([{ data: edu }, { data: rec }]) => {
        setClubsListe(edu || [])
        setRecruteursList(rec || [])
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
      if (a) chargerCalendrierEtDispos(a.educateur_id)
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
    setUserId(user.id)
    await chargerNotifications(user.id)
    await chargerNotifPrefs(user.id)
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    const { data: demandesData } = await supabase.from('demandes').select('*').eq('joueur_id', user.id).order('created_at', { ascending: false })
    const { data: coachData } = await supabase.from('profiles').select('*').eq('plan', 'coach')
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
    const { data: parcoursData } = await supabase.from('parcours').select('*').eq('joueur_id', user.id).order('saison', { ascending: false })
    setParcours(parcoursData || [])
    const { data: certifData } = await supabase.from('certifications').select('*').eq('joueur_id', user.id).order('created_at', { ascending: false })
    setCertifications(certifData || [])
    setDemandes(demandesData || [])
    setCoaches(coachData || [])
    if (coachData && coachData.length > 0) setCoachSelectionne(coachData[0])
    const { data: reelRows, error: reelErr } = await supabase.from('reels').select('id, video_url').eq('joueur_id', user.id).order('created_at', { ascending: false }).limit(1)
    console.log('[DashboardJoueur] reelRows:', reelRows, 'error:', reelErr)
    setReelJogabonito(reelRows?.[0] || null)
    await chargerConversations(user.id)
    await chargerAffiliations(user.id)
    setLoading(false)
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
    await supabase.from('notifications').update({ lu: true }).eq('id', notifId)
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, lu: true } : n))
  }

  const marquerToutLu = async (uid) => {
    await supabase.from('notifications').update({ lu: true }).eq('user_id', uid).eq('lu', false)
    setNotifications(prev => prev.map(n => ({ ...n, lu: true })))
  }

  const sauvegarderNotifPrefs = async (newPrefs) => {
    setSavingPrefs(true)
    await supabase.from('notification_preferences').upsert({ user_id: userId, ...newPrefs }, { onConflict: 'user_id' })
    setNotifPrefs(newPrefs)
    setSavingPrefs(false)
  }

  const chargerAffiliations = async (uid) => {
    // Fetch affiliations sans join pour éviter les erreurs FK
    const { data: afData } = await supabase
      .from('affiliations')
      .select('*')
      .eq('joueur_id', uid)
      .order('date_fin', { ascending: false, nullsFirst: true })
    if (!afData || afData.length === 0) { setMesAffiliations([]); return }

    // Charger les profils éducateurs séparément
    const educateurIds = [...new Set(afData.map(a => a.educateur_id))]
    const { data: peData } = await supabase
      .from('profil_educateur')
      .select('user_id, prenom, nom, club, categorie, niveau_championnat, diplome, diplome_verifie, code_equipe, lien_groupe')
      .in('user_id', educateurIds)

    const peMap = {}
    peData?.forEach(pe => { peMap[pe.user_id] = pe })

    setMesAffiliations(afData.map(a => ({ ...a, profil_educateur: peMap[a.educateur_id] || null })))
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
      ...(entrainements || []).map(e => ({ type: 'entrainement', id: e.id, titre: e.description || t('aff_entrainement_titre', lang), date: e.date, heure: e.heure, lieu: e.lieu, sondage_clos: e.sondage_clos })),
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

  const repondreDisponibilite = async (eventId, eventType, statut) => {
    if (!eventId || !userId) return
    setSavingDispo(true)
    setDispoMap(prev => ({ ...prev, [eventId]: statut }))
    if (eventType === 'entrainement' && widgetProchainEnt?.id === eventId) setWidgetDispoEnt(statut)
    if (eventType === 'match' && widgetProchainMatch?.id === eventId) setWidgetDispoMatch(statut)
    const payload = {
      joueur_id: userId,
      statut,
      ...(eventType === 'entrainement' ? { seance_id: eventId } : { match_id: eventId }),
    }
    await supabase.from('disponibilites').upsert(payload, { onConflict: eventType === 'entrainement' ? 'joueur_id,seance_id' : 'joueur_id,match_id' })
    setSavingDispo(false)
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
    ] = await Promise.all([
      supabase.from('stats_match').select('buts, passes_dec, minutes, clean_sheet, carton_jaune, carton_rouge, victoire').eq('joueur_id', equipeJoueurId),
      supabase.from('stats_match').select('joueur_id, buts, passes_dec, minutes, clean_sheet, match_id').eq('educateur_id', educateurId),
      supabase.from('notes_joueurs').select('technique, physique, mental, tactique, commentaire').eq('joueur_id', equipeJoueurId).eq('visible_joueur', true).maybeSingle(),
      supabase.from('profil_educateur').select('ligue_url').eq('user_id', educateurId).single(),
      supabase.from('calendrier_matchs').select('date, heure, equipe_domicile, equipe_exterieur, competition, lieu').eq('educateur_id', educateurId).gte('date', new Date().toISOString().split('T')[0]).order('date', { ascending: true }).limit(5),
      supabase.from('equipe_joueurs').select('id, prenom, nom').eq('educateur_id', educateurId),
      supabase.from('matchs_equipe').select('id, score_nous, score_eux').eq('educateur_id', educateurId),
    ])

    // --- Stats personnelles ---
    const total = presencesMoi?.length || 0
    const present = presencesMoi?.filter(p => p.statut === 'present').length || 0
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
      if (p.statut === 'present') byMonth[month].present++
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
      }
    }))
    setStatsLoading(prev => ({ ...prev, [affiliationId]: false }))
  }

  const rejoindreEquipe = async () => {
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
    if (!eduNote) return
    setSavingNoteEdu(true)
    const allKeys = CRITERES_EDU_KEYS.flatMap(c => c.criteres.map(cr => cr.key))
    const allFilled = allKeys.every(k => noteCriteres[k])
    if (!allFilled) { setSavingNoteEdu(false); return }
    const moyGlobale = allKeys.reduce((s, k) => s + (noteCriteres[k] || 0), 0) / allKeys.length
    await supabase.from('notes_educateur').upsert({
      educateur_id: eduNote.educateur_id,
      auteur_id: userId,
      auteur_type: 'joueur',
      saison: noteSaison,
      note: Math.round(moyGlobale * 10) / 10,
      criteres: noteCriteres,
      commentaire: noteCommentaire,
      visible_public: notePublic,
    }, { onConflict: 'educateur_id,auteur_id,saison' })
    setNoteSaved(true)
    setEduNote(null)
    setTimeout(() => setNoteSaved(false), 3000)
    setSavingNoteEdu(false)
  }

  const chargerConversations = async (uid) => {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(prenom, nom, plan), receiver:profiles!messages_receiver_id_fkey(prenom, nom, plan)')
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
    const isCoachAnalyseur = (plan) => plan === 'coach' || plan === 'coach_analyseur'
    setConversations(allConvs.filter(c => !isCoachAnalyseur(c.other?.plan)))
    setConvCoach(allConvs.filter(c => isCoachAnalyseur(c.other?.plan)))
    // Compter messages coach non lus (reçus après la dernière visite de l'onglet)
    const lastRead = localStorage.getItem(`coach_read_${uid}`) || '1970-01-01'
    const nonLus = data.filter(msg =>
      isCoachAnalyseur(msg.sender?.plan) &&
      msg.receiver_id === uid &&
      new Date(msg.created_at) > new Date(lastRead)
    )
    setCoachUnread(nonLus.length)
  }

  const envoyerMessage = async () => {
    if (!newMessage.trim() || !messageActif || !userId) return
    await supabase.from('messages').insert({ sender_id: userId, receiver_id: messageActif.otherId, content: newMessage.trim(), created_at: new Date().toISOString() })
    await notifierJoueur({ type: 'message', userId: messageActif.otherId, titre: 'Nouveau message', contenu: { auteur: profil?.prenom, texte: newMessage.trim() }, lien: '/dashboard' })
    setNewMessage('')
    await chargerConversations(userId)
  }

  const envoyerMessageCoach = async () => {
    if (!messageCoach.trim() || !coachSelectionne || !userId) return
    setSendingCoach(true)
    await supabase.from('messages').insert({ sender_id: userId, receiver_id: coachSelectionne.id, content: messageCoach.trim(), created_at: new Date().toISOString() })
    setSendingCoach(false)
    setCoachSent(true)
    setMessageCoach('')
    await chargerConversations(userId)
    setTimeout(() => setCoachSent(false), 3000)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/') }

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
    setSavingStats(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('profiles').update({ ...stats, points_forts: pointsForts.join(', '), a_ameliorer: aAmeliorer.join(', '), style_de_jeu: styleDeJeu }).eq('id', user.id)
    setSavingStats(false)
    setStatsSaved(true)
    setTimeout(() => setStatsSaved(false), 3000)
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
    const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#f97316', '#06b6d4', '#ec4899']
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return colors[Math.abs(hash) % colors.length]
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
    const { data, error: fetchError } = await supabase.from('parcours').select('*').eq('joueur_id', userId).order('saison', { ascending: false })
    if (fetchError) console.error('Erreur chargement parcours :', fetchError.message)
    setParcours(data || [])
    setNouveauClub({ club: '', saison: '', categorie: '', poste: '', logo_url: '', niveau_championnat: '', matchs_joues: '', buts: '', passes_decisives: '', cleansheets: '' })
    setClubSuggestions([])
    setShowSuggestions(false)
    setSavingParcours(false)
  }

  const modifierClub = (p) => {
    setEditingParcoursId(p.id)
    setNouveauClub({ club: p.club || '', saison: p.saison || '', categorie: p.categorie || '', poste: p.poste || '', logo_url: p.logo_url || '', niveau_championnat: p.niveau_championnat || '', matchs_joues: p.matchs_joues || '', buts: p.buts || '', passes_decisives: p.passes_decisives || '', cleansheets: p.cleansheets || '' })
    setClubSuggestions([])
    setShowSuggestions(false)
    setTimeout(() => document.getElementById('parcours-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const supprimerClub = async (id) => {
    if (!window.confirm('Supprimer cette entrée du parcours ?')) return
    const { error } = await supabase.from('parcours').delete().eq('id', id)
    if (error) { alert('Erreur suppression : ' + error.message); return }
    if (editingParcoursId === id) { setEditingParcoursId(null); setNouveauClub({ club: '', saison: '', categorie: '', poste: '', logo_url: '', niveau_championnat: '', matchs_joues: '', buts: '', passes_decisives: '', cleansheets: '' }) }
    setParcours(prev => prev.filter(p => p.id !== id))
  }

  const handleDeleteVideo = async () => {
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
    width: '100%', background: '#141414', border: '1px solid #2a2a2a', borderRadius: '10px',
    padding: '11px 14px', color: 'white', fontSize: '14px', boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif', outline: 'none',
  }
  const labelStyle = {
    fontSize: '11px', color: '#555', display: 'block', marginBottom: '7px',
    fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase',
  }
  const msgBubble = (mine) => ({
    maxWidth: '70%', padding: '10px 14px',
    borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
    background: mine ? '#4ade80' : '#1a1a1a', color: mine ? '#000' : '#fff',
    fontSize: '14px', alignSelf: mine ? 'flex-end' : 'flex-start', marginBottom: '8px',
  })

  if (loading) return <Loader />

  // ── BANNI ──
  if (profil?.banni) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '440px', width: '100%', background: '#111', border: '1px solid #ef444430', borderRadius: '20px', padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '2rem', letterSpacing: '-0.5px' }}>Digital<span style={{ color: '#4ade80' }}>Football</span></div>
          <div style={{ color: '#ef4444', display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#ef4444', marginBottom: '0.75rem' }}>Compte suspendu</h1>
          <p style={{ fontSize: '14px', color: '#555', marginBottom: '1rem', lineHeight: 1.6 }}>
            Ton compte a été suspendu pour violation des CGU et du règlement de la plateforme.
          </p>
          {profil?.banni_motif && (
            <div style={{ background: '#1a1a1a', border: '1px solid #ef444420', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
                <strong style={{ color: '#ef4444' }}>Motif :</strong> {profil.banni_motif}
              </p>
            </div>
          )}
          <p style={{ fontSize: '12px', color: '#444', marginBottom: '1.5rem' }}>
            Conformément aux CGU acceptées lors de ton inscription, aucun remboursement ne sera effectué.
          </p>
          <span onClick={handleLogout} style={{ color: '#555', fontSize: '13px', cursor: 'pointer' }}>Déconnexion</span>
        </div>
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

  if (estAffilie) {
    const affiliation = mesAffiliations.find(a => a.statut === 'accepte')
    const edu = affiliation?.profil_educateur
    const labelSection = edu?.club
      ? (edu.club + (edu.categorie ? ` ${edu.categorie}` : '')).toUpperCase()
      : t('jsec_equipe', lang)

    const secAffilie = [
      { id: 'accueil',       label: t('jnav_accueil', lang),        icon: <IconHome /> },

      { id: 'equipe',        label: t('jnav_equipe', lang),         icon: <IconUsers />, section: labelSection },
      { id: 'stats',         label: t('aff_mes_stats', lang),       icon: <IconChart /> },
      { id: 'prep_physique', label: t('jnav_prep_physique', lang),  icon: <IconDumbbell /> },

      { id: 'jogabonito',    label: 'Jogabonito',                   icon: <span style={{ fontSize: '18px' }}>🎬</span>, section: t('aff_explorer', lang) },
      { id: 'feed',          label: t('recrut_feed', lang),         icon: <IconGlobe />,  locked: true },
      { id: 'recruteurs',    label: t('jnav_recruteurs', lang),     icon: <IconMessage />, locked: true },

      { id: 'profil',        label: t('jnav_profil', lang),         icon: <IconUser />, section: t('section_compte', lang) },
    ]

    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', fontFamily: 'Inter, sans-serif', display: 'flex' }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; } ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; } .af-nav-btn:hover { background: #141414 !important; color: #ccc !important; }`}</style>

        {isMobile && sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 40 }} />
        )}

        <aside style={{
          width: '220px', background: '#0d0d0d', borderRight: '1px solid #141414', display: 'flex', flexDirection: 'column', flexShrink: 0,
          ...(isMobile ? {
            position: 'fixed', top: 0, left: sidebarOpen ? 0 : -240, height: '100%', zIndex: 50, transition: 'left 0.25s ease', overflowY: 'auto',
          } : {
            position: 'sticky', top: 0, height: '100vh', minHeight: '100vh', overflowY: 'auto',
          }),
        }}>
          <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #141414', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.5px' }}>Digital<span style={{ color: '#4ade80' }}>Football</span></div>
              <div style={{ marginTop: '4px', fontSize: '11px', color: '#4ade80', fontWeight: 600 }}>{t('aff_joueur_affilie', lang)}</div>
            </div>
            {isMobile && (
              <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#555', fontSize: 20, cursor: 'pointer' }}>✕</button>
            )}
          </div>
          <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {secAffilie.map(item => (
              <div key={item.id}>
                {item.section && (
                  <div style={{ color: '#333', fontSize: '10px', fontWeight: 800, letterSpacing: '1.5px', padding: '16px 12px 6px', textTransform: 'uppercase' }}>
                    {item.section}
                  </div>
                )}
                <button className="af-nav-btn" onClick={() => { if (item.id === 'jogabonito') navigate('/jogabonito'); else setOnglet(item.id); setSidebarOpen(false) }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: onglet === item.id ? '#4ade8012' : 'transparent', color: onglet === item.id ? '#4ade80' : item.locked ? '#333' : '#555', fontSize: '13px', fontWeight: onglet === item.id ? 700 : 400, textAlign: 'left', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s', position: 'relative' }}>
                  <span style={{ flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.locked && <span style={{ fontSize: '12px', opacity: 0.4 }}>🔒</span>}
                  {onglet === item.id && <div style={{ position: 'absolute', left: 0, top: '20%', height: '60%', width: '3px', background: '#4ade80', borderRadius: '0 3px 3px 0' }} />}
                </button>
              </div>
            ))}
          </nav>
          <div style={{ padding: '16px 12px', borderTop: '1px solid #1a1a1a' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[['fr','🇫🇷'],['en','🇬🇧'],['pt','🇧🇷'],['es','🇪🇸'],['it','🇮🇹'],['de','🇩🇪']].map(([code, flag]) => (
                <button key={code} onClick={() => setLang(code)}
                  style={{ background: lang === code ? '#4ade8020' : 'transparent', border: `1px solid ${lang === code ? '#4ade80' : '#2a2a2a'}`, borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '14px', color: lang === code ? '#4ade80' : '#555' }}>
                  {flag}
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: '12px 10px 20px', borderTop: '1px solid #141414' }}>
            <button onClick={handleLogout} style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: 'none', background: 'transparent', color: '#444', fontSize: '12px', cursor: 'pointer', textAlign: 'left', fontFamily: 'Inter, sans-serif' }}>{t('btn_deconnexion', lang)}</button>
          </div>
        </aside>

        <main style={{ flex: 1, padding: isMobile ? '16px 14px' : '32px 36px', overflowY: 'auto' }}>
          {isMobile && (
            <button onClick={() => setSidebarOpen(true)}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', padding: '0 0 16px 0', display: 'block' }}>
              ☰
            </button>
          )}
          {onglet === 'accueil' && (
            <div style={{ maxWidth: '640px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '6px', letterSpacing: '-0.5px' }}>{t('aff_bonjour', lang)} {profil?.prenom} 👋</h1>
              <p style={{ color: '#555', fontSize: '13px', marginBottom: '28px' }}>{t('aff_espace_joueur', lang)}</p>
              <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '20px', marginBottom: '14px' }}>
                <div style={{ fontSize: '10px', color: '#4ade80', fontWeight: 800, letterSpacing: '1.5px', marginBottom: '12px' }}>{t('aff_ton_educateur', lang)}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#4ade8020', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', fontWeight: 800, fontSize: '16px', flexShrink: 0 }}>{(edu?.prenom?.[0] || '?').toUpperCase()}</div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '15px' }}>{edu?.prenom} {edu?.nom}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#555' }}>{edu?.club || ''}{edu?.categorie ? ` · ${edu.categorie}` : ''}</p>
                  </div>
                </div>
              </div>

              {(() => {
                const STATUT_OPTIONS = [
                  { val: 'present',  label: t('ent_present', lang),  emoji: '✅', color: '#4ade80', bg: '#4ade8015', border: '#4ade8040' },
                  { val: 'absent',   label: t('ent_absent', lang),   emoji: '❌', color: '#ef4444', bg: '#ef444415', border: '#ef444440' },
                  { val: 'blesse',   label: t('ent_blesse', lang),   emoji: '🤕', color: '#f97316', bg: '#f9731615', border: '#f9731640' },
                  { val: 'malade',   label: t('ent_malade', lang),   emoji: '🤒', color: '#a855f7', bg: '#a855f715', border: '#a855f740' },
                  { val: 'convoque', label: t('ent_convoque', lang), emoji: '🏆', color: '#60a5fa', bg: '#60a5fa15', border: '#60a5fa40' },
                ]
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '14px' }}>
                    {widgetProchainEnt && (
                      <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                          <span style={{ fontSize: '20px' }}>📋</span>
                          <div>
                            <p style={{ fontWeight: 800, fontSize: '14px', marginBottom: '2px' }}>{t('aff_prochain_entrainement', lang)}</p>
                            <p style={{ fontSize: '12px', color: '#555' }}>{new Date(widgetProchainEnt.date).toLocaleDateString(localeOf(lang), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                          </div>
                        </div>
                        <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>{t('aff_seras_tu_present', lang)}</p>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {STATUT_OPTIONS.map(opt => (
                            <button key={opt.val} onClick={() => repondreDisponibilite(widgetProchainEnt.id, 'entrainement', opt.val)} disabled={savingDispo}
                              style={{ background: widgetDispoEnt === opt.val ? opt.bg : 'transparent', border: `1px solid ${widgetDispoEnt === opt.val ? opt.border : '#2a2a2a'}`, color: widgetDispoEnt === opt.val ? opt.color : '#555', padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: widgetDispoEnt === opt.val ? 700 : 400, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                              {opt.emoji} {opt.label}
                            </button>
                          ))}
                        </div>
                        {widgetDispoEnt && <p style={{ fontSize: '11px', color: '#444', marginTop: '10px' }}>✓ {t('aff_reponse_envoyee', lang)}</p>}
                      </div>
                    )}

                    {widgetProchainMatch && (
                      <div style={{ background: '#111', border: '1px solid #60a5fa20', borderRadius: '16px', padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                          <span style={{ fontSize: '20px' }}>⚽</span>
                          <div>
                            <p style={{ fontWeight: 800, fontSize: '14px', marginBottom: '2px' }}>{t('aff_prochain_match', lang)} — {widgetProchainMatch.adversaire || t('aff_match_titre', lang)}</p>
                            <p style={{ fontSize: '12px', color: '#555' }}>{new Date(widgetProchainMatch.date).toLocaleDateString(localeOf(lang), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                          </div>
                        </div>
                        <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>{t('aff_dispo_pour_match', lang)}</p>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {STATUT_OPTIONS.map(opt => (
                            <button key={opt.val} onClick={() => repondreDisponibilite(widgetProchainMatch.id, 'match', opt.val)} disabled={savingDispo}
                              style={{ background: widgetDispoMatch === opt.val ? opt.bg : 'transparent', border: `1px solid ${widgetDispoMatch === opt.val ? opt.border : '#2a2a2a'}`, color: widgetDispoMatch === opt.val ? opt.color : '#555', padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: widgetDispoMatch === opt.val ? 700 : 400, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                              {opt.emoji} {opt.label}
                            </button>
                          ))}
                        </div>
                        {widgetDispoMatch && <p style={{ fontSize: '11px', color: '#444', marginTop: '10px' }}>✓ {t('aff_reponse_envoyee', lang)}</p>}
                      </div>
                    )}

                    {widgetCalendrier.length > 0 && (
                      <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '20px' }}>
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
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', background: isToday ? '#4ade8008' : '#141414', border: `1px solid ${isToday ? '#4ade8025' : '#1f1f1f'}`, borderRadius: '10px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: ev.type === 'match' ? '#60a5fa15' : '#4ade8015', border: `1px solid ${ev.type === 'match' ? '#60a5fa30' : '#4ade8030'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                                  {ev.type === 'match' ? '⚽' : '🏃'}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontWeight: 700, fontSize: '13px', marginBottom: '2px' }}>{ev.titre}</p>
                                  <p style={{ fontSize: '11px', color: '#555' }}>{labelJour}</p>
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
                  <button key={item.id} onClick={() => setOnglet(item.id)} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '18px 16px', cursor: 'pointer', textAlign: 'left', fontFamily: 'Inter, sans-serif', color: 'white' }}>
                    <div style={{ fontSize: '22px', marginBottom: '8px' }}>{item.emoji}</div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{item.label}</p>
                    <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#555' }}>{item.desc}</p>
                  </button>
                ))}
              </div>
              <div style={{ background: 'linear-gradient(135deg, #4ade8010, #0a0a0a)', border: '1px solid #4ade8025', borderRadius: '16px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{t('aff_passe_niveau_sup', lang)}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#555', lineHeight: 1.5 }}>{t('aff_analyses_feed_desc', lang)}</p>
                </div>
                <button onClick={() => window.location.href = stripeUrl(STRIPE_LINKS.starter, userId)} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', flexShrink: 0 }}>{t('aff_voir_packs', lang)}</button>
              </div>
            </div>
          )}
          {onglet === 'prep_physique' && <PrepPhysiqueJoueur joueurId={userId} isMobile={isMobile} />}
          {onglet === 'stats' && (
            <div style={{ maxWidth: '640px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '20px' }}>{t('aff_mes_stats', lang)}</h2>

              {!affiliation ? (
                <p style={{ color: '#333', fontSize: '13px', fontStyle: 'italic' }}>{t('aff_rejoins_equipe_stats', lang)}</p>
              ) : (
              <>
              {statsLoading[affiliation.id] && (
                <p style={{ color: '#4ade80', fontSize: '13px' }}>{t('jexp_chargement', lang)}</p>
              )}

              {statsJoueur[affiliation.id] && (() => {
                const s = statsJoueur[affiliation.id]

                const hasDonnees = s.present || s.points || s.matchsJoues || s.noteEdu ||
                  s.prochainMatchs?.length > 0 || s.leaderButs?.length > 0 || s.leaderPoints?.length > 0
                if (!hasDonnees) return (
                  <p style={{ color: '#333', fontSize: '13px', fontStyle: 'italic' }}>
                    {t('aff_aucune_seance_match', lang)}
                  </p>
                )

                // ── Badges / streaks ──────────────────────────────────────
                const badges = []
                if (s.tauxPresence === 100) badges.push({ label: t('aff_badge_100pct', lang), color: '#4ade80' })
                else if (s.tauxPresence >= 80) badges.push({ label: t('aff_badge_assidu', lang), color: '#4ade80' })
                if (s.rankPoints?.rank === 1) badges.push({ label: t('aff_badge_top_points', lang), color: '#fbbf24' })
                if (s.rankButs?.rank === 1) badges.push({ label: t('aff_badge_top_buteur', lang), color: '#f97316' })
                if (s.buts >= 5) badges.push({ label: `${s.buts} ${t('comp_buts', lang)}`, color: '#f97316' })

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* Entraînement */}
                    <div>
                      <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 800, color: '#fbbf24', letterSpacing: '1px', textTransform: 'uppercase' }}>⭐ {t('aff_entrainement_titre', lang)}</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        {[
                          { label: t('stats_tab_presences', lang), val: `${s.present ?? 0}/${s.total ?? 0}` },
                          { label: t('aff_taux_presence', lang), val: `${s.tauxPresence ?? 0}%`, color: s.tauxPresence >= 80 ? '#4ade80' : s.tauxPresence >= 60 ? '#f59e0b' : '#ef4444' },
                          { label: t('aff_points_seance', lang), val: s.points ?? 0, color: '#fbbf24' },
                        ].map(({ label, val, color }) => (
                          <div key={label} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                            <p style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: color || '#4ade80' }}>{val}</p>
                            <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#555' }}>{label}</p>
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
                      <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '16px' }}>
                        <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 800, color: '#a78bfa', letterSpacing: '1px', textTransform: 'uppercase' }}>📅 {t('aff_points_seance_par_mois', lang)}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {s.presenceMensuelle.map(({ month, taux, present, total }) => {
                            const [y, m] = month.split('-')
                            const label = new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString(localeOf(lang), { month: 'long', year: '2-digit' })
                            const color = taux >= 80 ? '#4ade80' : taux >= 60 ? '#f59e0b' : '#ef4444'
                            return (
                              <div key={month} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '11px', color: '#555', width: '70px', flexShrink: 0, textTransform: 'capitalize' }}>{label}</span>
                                <div style={{ flex: 1, height: '6px', background: '#1a1a1a', borderRadius: '3px' }}>
                                  <div style={{ width: `${taux}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.5s' }} />
                                </div>
                                <span style={{ fontSize: '11px', fontWeight: 700, color, width: '36px', textAlign: 'right', flexShrink: 0 }}>{taux}%</span>
                                <span style={{ fontSize: '10px', color: '#333', flexShrink: 0 }}>{present}/{total}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Stats de match */}
                    {(s.matchsJoues > 0 || s.buts > 0 || s.passes > 0) && (
                      <div>
                        <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 800, color: '#60a5fa', letterSpacing: '1px', textTransform: 'uppercase' }}>⚽ {t('aff_stats_match_titre', lang)}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                          {[
                            { label: t('jp_matchs_joues', lang), val: s.matchsJoues ?? 0, color: '#60a5fa' },
                            { label: t('comp_buts', lang), val: s.buts ?? 0, color: '#4ade80' },
                            { label: t('club_passes_dec_emoji', lang), val: s.passes ?? 0, color: '#a78bfa' },
                            { label: t('jp_minutes', lang), val: s.minutesJouees ?? 0, color: '#34d399' },
                            { label: t('jp_clean_sheets', lang), val: s.cleanSheets ?? 0, color: '#34d399' },
                          ].map(({ label, val, color }) => (
                            <div key={label} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                              <p style={{ margin: 0, fontSize: '22px', fontWeight: 800, color }}>{val}</p>
                              <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#555' }}>{label}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Avis éducateur */}
                    <div>
                      <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 800, color: '#f59e0b', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('aff_avis_ton_educateur', lang)}</p>
                      <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '16px' }}>
                        {s.noteEdu ? (
                          <>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: s.noteEdu.commentaire ? '14px' : '0' }}>
                              {[
                                { label: t('aff_technique', lang), value: s.noteEdu.technique, color: '#60a5fa' },
                                { label: t('aff_physique', lang), value: s.noteEdu.physique, color: '#4ade80' },
                                { label: t('aff_mental', lang), value: s.noteEdu.mental, color: '#a78bfa' },
                                { label: t('aff_tactique', lang), value: s.noteEdu.tactique, color: '#f59e0b' },
                              ].map(n => (
                                <div key={n.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '11px', color: '#555', flex: 1 }}>{n.label}</span>
                                  <div style={{ display: 'flex', gap: '2px' }}>
                                    {[1, 2, 3, 4, 5].map(i => (
                                      <span key={i} style={{ fontSize: '12px', color: i <= (n.value || 0) ? n.color : '#222' }}>★</span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                            {s.noteEdu.commentaire && (
                              <p style={{ margin: 0, fontSize: '12px', color: '#888', fontStyle: 'italic', borderTop: '1px solid #1a1a1a', paddingTop: '12px', lineHeight: 1.6 }}>
                                "{s.noteEdu.commentaire}"
                              </p>
                            )}
                          </>
                        ) : (
                          <p style={{ margin: 0, fontSize: '12px', color: '#333', fontStyle: 'italic' }}>
                            {t('aff_pas_note_partagee', lang)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Classements équipe */}
                    {(s.leaderButs?.length > 0 || s.leaderPoints?.length > 0) && (
                      <div>
                        <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 800, color: '#f97316', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('aff_classements_equipe', lang)}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          {[
                            { title: t('aff_top_buteurs', lang), data: s.leaderButs },
                            { title: t('aff_points_seance', lang), data: s.leaderPoints },
                          ].map(({ title, data }) => data?.length > 0 && (
                            <div key={title} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '12px 14px' }}>
                              <p style={{ margin: '0 0 8px', fontSize: '10px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</p>
                              {data.slice(0, 3).map((row, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', background: row.isMe ? '#4ade8010' : 'transparent', borderRadius: '6px', padding: '2px 4px', border: row.isMe ? '1px solid #4ade8030' : '1px solid transparent' }}>
                                  <span style={{ fontSize: '9px', color: i === 0 ? '#fbbf24' : '#333', fontWeight: 800, width: '12px' }}>{i + 1}</span>
                                  <span style={{ fontSize: '11px', color: row.isMe ? '#4ade80' : '#888', flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontWeight: row.isMe ? 700 : 400 }}>
                                    {row.isMe ? t('aff_fleche_toi', lang) : row.nom?.split(' ')[0] || '—'}
                                  </span>
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: row.isMe ? '#4ade80' : '#555' }}>{row.val}</span>
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
                              <div key={i} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '12px 14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                  <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 700 }}>{label}{m.heure ? ` · ${m.heure}` : ''}</span>
                                  {m.competition && <span style={{ fontSize: '10px', color: '#444', background: '#1a1a1a', padding: '1px 7px', borderRadius: '6px' }}>{m.competition}</span>}
                                </div>
                                <p style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>{m.equipe_domicile} <span style={{ color: '#333', fontWeight: 400 }}>vs</span> {m.equipe_exterieur}</p>
                                {m.lieu && <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#444' }}>📍 {m.lieu}</p>}
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
            <div style={{ maxWidth: '960px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '2rem' }}>{t('jeq_titre', lang)}</h1>

              {/* Mes affiliations actives / en attente / refusées (l'historique archivé est plus bas) */}
              {mesAffiliations.filter(a => a.statut !== 'archive').length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{t('jeq_mes_educateurs', lang)}</p>
                  {mesAffiliations.filter(a => a.statut !== 'archive').map(a => {
                    const pe = a.profil_educateur
                    const isAccepted = a.statut === 'accepte'
                    return (
                      <div key={a.id} style={{ background: '#1a1a1a', borderRadius: '16px', overflow: 'hidden', border: `1px solid ${isAccepted ? '#2a2a2a' : '#2a2a2a'}` }}>
                        {isAccepted ? (
                          <div style={{ background: 'linear-gradient(135deg, #14532d, #166534)', padding: '20px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px', color: '#052e16', flexShrink: 0 }}>
                              {pe?.prenom?.[0]}{pe?.nom?.[0]}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 'bold', fontSize: '17px' }}>{pe?.prenom} {pe?.nom}</div>
                              <div style={{ color: '#86efac', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[pe?.club, pe?.categorie, pe?.niveau_championnat].filter(Boolean).join(' · ')}</div>
                              <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                <span style={{ background: '#166534', border: '1px solid #22c55e', borderRadius: '20px', padding: '2px 10px', fontSize: '12px', color: '#22c55e' }}>
                                  ✅ {t('profil_affilie', lang)}
                                </span>
                                {pe?.diplome && (
                                  <span style={{ fontSize: '12px', color: '#86efac' }}>🎓 {pe.diplome}</span>
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
                            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#1a1a1a', border: '2px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, color: '#555', flexShrink: 0 }}>
                              {pe?.prenom?.[0]}{pe?.nom?.[0]}
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{pe?.prenom} {pe?.nom}</p>
                              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#555' }}>{pe?.club} · {pe?.categorie} · {pe?.niveau_championnat}</p>
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                              background: a.statut === 'en_attente' ? '#f59e0b15' : '#ef444415',
                              color: a.statut === 'en_attente' ? '#f59e0b' : '#ef4444',
                              border: `1px solid ${a.statut === 'en_attente' ? '#f59e0b30' : '#ef444430'}` }}>
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
                                style={{ background: '#1f2937', color: 'white', border: '1px solid #374151', borderRadius: '10px', padding: '14px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>
                                ⭐ {t('club_evaluer', lang)}
                              </button>
                            </div>

                            {/* Stats chargées */}
                            {statsJoueur[a.id] && (() => {
                              const s = statsJoueur[a.id]
                              const RankBadge = ({ rank, total }) => rank && total > 1 ? (
                                <span style={{ fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '8px', background: rank === 1 ? '#fbbf2420' : '#ffffff10', color: rank === 1 ? '#fbbf24' : '#555', marginLeft: '4px' }}>
                                  #{rank}/{total}
                                </span>
                              ) : null
                              return (
                                <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                                  {/* Stats match */}
                                  <div>
                                    <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: '#60a5fa' }}>⚽ {t('aff_stats_match_titre', lang)}</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                                      {[
                                        { label: t('jp_matchs_joues', lang), value: s.matchsJoues, color: '#60a5fa', rank: s.rankMatchs },
                                        { label: t('comp_buts', lang), value: s.buts, color: '#4ade80', rank: s.rankButs },
                                        { label: t('club_passes_dec_emoji', lang), value: s.passes, color: '#a78bfa', rank: s.rankPasses },
                                        { label: t('jp_clean_sheets', lang), value: s.cleanSheets, color: '#34d399', rank: s.rankClean },
                                      ].map(stat => (
                                        <div key={stat.label} style={{ background: '#0a0a0a', borderRadius: '10px', padding: '10px 12px', border: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                          <div>
                                            <p style={{ margin: 0, fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</p>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                              <span style={{ fontSize: '20px', fontWeight: 800, color: stat.color }}>{stat.value}</span>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                                      <span style={{ fontSize: '11px', color: '#60a5fa', background: '#60a5fa15', border: '1px solid #60a5fa30', padding: '2px 8px', borderRadius: '8px' }}>⏱ {s.minutesJouees} min</span>
                                      {s.jaunes > 0 && <span style={{ fontSize: '11px', color: '#f59e0b', background: '#f59e0b15', border: '1px solid #f59e0b30', padding: '2px 8px', borderRadius: '8px' }}>🟨 {s.jaunes}</span>}
                                      {s.rouges > 0 && <span style={{ fontSize: '11px', color: '#ef4444', background: '#ef444415', border: '1px solid #ef444430', padding: '2px 8px', borderRadius: '8px' }}>🟥 {s.rouges}</span>}
                                    </div>
                                  </div>

                                  {/* Présence + Points séance */}
                                  <div>
                                    <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: '#fbbf24' }}>⭐ {t('aff_entrainement_titre', lang)}</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                                      {/* Taux de présence */}
                                      <div style={{ background: '#0a0a0a', borderRadius: '10px', padding: '10px 12px', border: '1px solid #1a1a1a' }}>
                                        <p style={{ margin: 0, fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('aff_taux_presence', lang)}</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <span style={{ fontSize: '20px', fontWeight: 800, color: s.tauxPresence >= 80 ? '#4ade80' : s.tauxPresence >= 60 ? '#f59e0b' : '#ef4444' }}>
                                            {s.tauxPresence ?? '—'}%
                                          </span>
                                        </div>
                                        <span style={{ fontSize: '9px', color: '#333' }}>{s.present}/{s.total} {t('stats_seances_plural', lang)}</span>
                                      </div>
                                      {/* Points séance */}
                                      <div style={{ background: '#0a0a0a', borderRadius: '10px', padding: '10px 12px', border: '1px solid #fbbf2420' }}>
                                        <p style={{ margin: 0, fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('aff_points_seance', lang)}</p>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                          <span style={{ fontSize: '20px', fontWeight: 800, color: '#fbbf24' }}>{s.points}</span>
                                          <RankBadge rank={s.rankPoints?.rank} total={s.rankPoints?.total} />
                                        </div>
                                        {s.rankPoints?.rank === 1 && <span style={{ fontSize: '9px', color: '#fbbf24' }}>🏆 {t('aff_meilleur_equipe', lang)}</span>}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Présence par mois */}
                                  {s.presenceMensuelle?.length > 0 && (
                                    <div>
                                      <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: '#a78bfa' }}>📅 {t('club_presence_par_mois', lang)}</p>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        {s.presenceMensuelle.map(({ month, taux, present, total }) => {
                                          const [y, m] = month.split('-')
                                          const label = new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString(localeOf(lang), { month: 'short', year: '2-digit' })
                                          const color = taux >= 80 ? '#4ade80' : taux >= 60 ? '#f59e0b' : '#ef4444'
                                          return (
                                            <div key={month} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                              <span style={{ fontSize: '10px', color: '#555', width: '40px', flexShrink: 0 }}>{label}</span>
                                              <div style={{ flex: 1, height: '6px', background: '#1a1a1a', borderRadius: '3px' }}>
                                                <div style={{ width: `${taux}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.5s' }} />
                                              </div>
                                              <span style={{ fontSize: '10px', fontWeight: 700, color, width: '32px', textAlign: 'right', flexShrink: 0 }}>{taux}%</span>
                                              <span style={{ fontSize: '9px', color: '#333', flexShrink: 0 }}>{present}/{total}</span>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Avis éducateur */}
                                  <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 14, padding: '12px 16px' }}>
                                    <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 13 }}>📝 {t('aff_avis_educateur_court', lang)}</p>
                                    {s.noteEdu ? (
                                      <>
                                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                                          {[[t('aff_technique', lang), s.noteEdu.technique], [t('aff_physique', lang), s.noteEdu.physique], [t('aff_mental', lang), s.noteEdu.mental], [t('aff_tactique', lang), s.noteEdu.tactique]].map(([label, note]) => note ? (
                                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                              <span style={{ fontSize: 11, color: '#555' }}>{label}</span>
                                              <span style={{ color: '#f59e0b', fontSize: 12 }}>{'★'.repeat(note)}{'☆'.repeat(5 - note)}</span>
                                            </div>
                                          ) : null)}
                                        </div>
                                        {s.noteEdu.commentaire && <p style={{ margin: '8px 0 0', fontSize: 11, color: '#555', fontStyle: 'italic' }}>"{s.noteEdu.commentaire}"</p>}
                                      </>
                                    ) : (
                                      <p style={{ margin: 0, fontSize: '11px', color: '#333', fontStyle: 'italic' }}>{t('aff_pas_note_partagee', lang)}</p>
                                    )}
                                  </div>

                                  {/* Calendrier prochains matchs */}
                                  <div>
                                    <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: '#34d399' }}>📅 {t('aff_prochains_matchs', lang)}</p>
                                    {s.prochainMatchs?.length > 0 ? (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {s.prochainMatchs.map((m, i) => {
                                          const d = new Date(m.date)
                                          const label = d.toLocaleDateString(localeOf(lang), { weekday: 'short', day: 'numeric', month: 'short' })
                                          return (
                                            <div key={i} style={{ background: '#0a0a0a', borderRadius: '10px', padding: '10px 12px', border: '1px solid #1a1a1a' }}>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '10px', color: '#34d399', fontWeight: 700 }}>{label}{m.heure ? ` · ${m.heure}` : ''}</span>
                                                {m.competition && <span style={{ fontSize: '9px', color: '#444', background: '#1a1a1a', padding: '1px 6px', borderRadius: '6px' }}>{m.competition}</span>}
                                              </div>
                                              <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: 'white' }}>{m.equipe_domicile} <span style={{ color: '#333' }}>vs</span> {m.equipe_exterieur}</p>
                                              {m.lieu && <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#444' }}>📍 {m.lieu}</p>}
                                            </div>
                                          )
                                        })}
                                      </div>
                                    ) : (
                                      <p style={{ margin: 0, fontSize: '11px', color: '#333', fontStyle: 'italic' }}>{t('aff_aucun_match_programme', lang)}</p>
                                    )}
                                  </div>

                                  {/* Classements internes */}
                                  <div>
                                    <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: '#f97316' }}>🏅 {t('aff_classements_equipe', lang)}</p>
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                      {[
                                        { key: 'buteurs', label: `⚽ ${t('aff_top_buteurs', lang)}`, data: s.leaderButs },
                                        { key: 'passeurs', label: `🎯 ${t('aff_top_passeurs', lang)}`, data: s.leaderPasses },
                                        { key: 'victoires', label: `🏆 ${t('aff_top_victoires', lang)}`, data: s.leaderVictoires },
                                        { key: 'points', label: `⭐ ${t('aff_points_seance', lang)}`, data: s.leaderPoints },
                                      ].map(c => (
                                        <button key={c.key} onClick={() => setClassementActif(c.key)}
                                          style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', background: classementActif === c.key ? '#4ade80' : '#0a0a0a', color: classementActif === c.key ? '#000' : '#555' }}>
                                          {c.label}
                                        </button>
                                      ))}
                                    </div>
                                    {(() => {
                                      const actif = { buteurs: s.leaderButs, passeurs: s.leaderPasses, victoires: s.leaderVictoires, points: s.leaderPoints }[classementActif] || []
                                      return (
                                        <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '10px', overflow: 'hidden' }}>
                                          {actif.length > 0 ? actif.map((row, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderBottom: i < actif.length - 1 ? '1px solid #1a1a1a' : 'none', background: row.isMe ? '#4ade8010' : 'transparent' }}>
                                              <span style={{ fontSize: '12px', fontWeight: 800, color: i < 3 ? '#4ade80' : '#555', minWidth: '18px' }}>{i + 1}</span>
                                              <span style={{ flex: 1, fontSize: '12px', fontWeight: row.isMe ? 800 : 400, color: row.isMe ? '#4ade80' : '#ccc', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{row.isMe ? t('jcoach_toi', lang) : row.nom}</span>
                                              <span style={{ fontSize: '12px', fontWeight: 700, color: row.isMe ? '#4ade80' : '#888' }}>{row.val}</span>
                                            </div>
                                          )) : <p style={{ margin: 0, padding: '12px', fontSize: '11px', color: '#333' }}>—</p>}
                                        </div>
                                      )
                                    })()}
                                  </div>

                                  {/* Lien classement ligue */}
                                  {s.ligueUrl && (
                                    <a href={s.ligueUrl} target="_blank" rel="noopener noreferrer"
                                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', borderRadius: '10px', border: '1px solid #fbbf2430', background: '#fbbf2410', color: '#fbbf24', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>
                                      🏆 {t('aff_classement_championnat', lang)}
                                    </a>
                                  )}

                                </div>
                              )
                            })()}

                            {/* Joueur lié mais pas encore dans l'effectif */}
                            {!a.equipe_joueur_id && (
                              <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#444', fontStyle: 'italic' }}>
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
                  <p style={{ fontSize: 11, color: '#333', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10 }}>
                    {t('jcoach_historique', lang).toUpperCase()}
                  </p>
                  {mesAffiliations.filter(a => a.statut === 'archive').map(af => {
                    const e = af.profil_educateur
                    return (
                      <div key={af.id} style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 12, padding: '14px 16px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#666' }}>{e?.prenom} {e?.nom}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#333' }}>{e?.club}{e?.categorie ? ` · ${e.categorie}` : ''}</p>
                        </div>
                        {af.saison && (
                          <span style={{ fontSize: 11, color: '#333', background: '#1a1a1a', padding: '3px 10px', borderRadius: 20 }}>
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
                <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 16, padding: 24, textAlign: 'center', marginTop: 16 }}>
                  <p style={{ fontSize: 32, marginBottom: 12 }}>🏟️</p>
                  <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{t('aff_nouvelle_saison', lang)}</p>
                  <p style={{ fontSize: 13, color: '#555', marginBottom: 16 }}>{t('aff_rejoins_equipe_code', lang)}</p>
                  <input
                    placeholder="CODE ÉQUIPE"
                    value={codeEquipe}
                    onChange={e => setCodeEquipe(e.target.value.toUpperCase())}
                    style={{ background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 15, fontFamily: 'monospace', letterSpacing: 2, textTransform: 'uppercase', width: '100%', marginBottom: 10, outline: 'none', boxSizing: 'border-box' }}
                  />
                  <button onClick={rejoindreEquipe} disabled={!codeEquipe.trim()}
                    style={{ width: '100%', background: '#4ade80', color: '#000', border: 'none', borderRadius: 10, padding: 12, fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    {t('jeq_rejoindre_btn', lang)}
                  </button>
                </div>
              )}
            </div>
          )}
          {onglet === 'profil' && <ProfilAffilieOnglet profil={profil} userId={userId} setProfil={setProfil} lang={lang} />}
          {onglet === 'analyses' && <UpgradeCard titre={t('aff_analyse_video_titre', lang)} texte={t('aff_analyse_video_desc', lang)} lang={lang} userId={userId} />}
          {onglet === 'feed' && <UpgradeCard titre={t('recrut_feed', lang)} texte={t('aff_feed_desc', lang)} lang={lang} userId={userId} />}
          {onglet === 'recruteurs' && <UpgradeCard titre={t('aff_messagerie_recruteurs_titre', lang)} texte={t('aff_messagerie_recruteurs_desc', lang)} lang={lang} userId={userId} />}
        </main>
      </div>
    )
  }

  // ── FAN ──
  if (profil?.plan === 'fan') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', fontFamily: 'Inter, sans-serif' }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'); * { box-sizing: border-box; }`}</style>
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', borderBottom: '1px solid #141414' }}>
          <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.5px' }}>Digital<span style={{ color: '#4ade80' }}>Football</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', color: '#555' }}>Bonjour {profil?.prenom}</span>
            <button onClick={handleLogout} style={{ background: 'transparent', color: '#555', border: '1px solid #222', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Déconnexion</button>
          </div>
        </nav>

        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
          <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #141414', marginBottom: '2rem', paddingBottom: '0' }}>
            {[['accueil', 'Accueil'], ['favoris', 'Mes Favoris'], ['messages', 'Messages']].map(([id, label]) => (
              <button key={id} onClick={() => { setFanOnglet(id); if (id === 'favoris') chargerFanFavoris() }}
                style={{ background: 'transparent', border: 'none', color: fanOnglet === id ? '#4ade80' : '#555', fontSize: '13px', fontWeight: fanOnglet === id ? 700 : 400, cursor: 'pointer', padding: '10px 16px', borderBottom: fanOnglet === id ? '2px solid #4ade80' : '2px solid transparent', fontFamily: 'Inter, sans-serif', marginBottom: '-1px' }}>
                {label}
              </button>
            ))}
          </div>

          {fanOnglet === 'accueil' && (
            <>
              <div style={{ background: '#111', border: '1px solid #4ade8020', borderRadius: '20px', padding: '2.5rem', marginBottom: '16px', textAlign: 'center' }}>
                <div style={{ width: '64px', height: '64px', background: '#4ade8010', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#4ade80' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
                </div>
                <h1 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.5px' }}>Compte Fan</h1>
                <p style={{ color: '#555', fontSize: '14px', margin: '0 0 1.5rem', lineHeight: 1.6 }}>Like, commente et sauvegarde les meilleurs reels Jogabonito.</p>
                <button onClick={() => navigate('/jogabonito')} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '12px 32px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  Voir Jogabonito
                </button>
              </div>
              <div style={{ background: '#111', border: '1px solid #4ade8030', borderRadius: '20px', padding: '2rem' }}>
                <div style={{ display: 'inline-block', background: '#4ade8015', color: '#4ade80', fontSize: '10px', fontWeight: 800, padding: '4px 12px', borderRadius: '20px', marginBottom: '14px', letterSpacing: '1px' }}>PASSE JOUEUR</div>
                <h2 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.3px' }}>Expose ton talent aux recruteurs</h2>
                <p style={{ color: '#555', fontSize: '13px', marginBottom: '1.5rem', lineHeight: 1.6 }}>Publie tes vidéos, reçois des analyses d'expert et sois visible des clubs et agents.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
                  {[{ plan: 'Mensuel', prix: '10€/mois', desc: '2 analyses / mois · Reels Jogabonito' }, { plan: 'Annuel', prix: '100€/an', desc: '3 analyses / mois · Feed · Visible recruteurs' }].map(p => (
                    <div key={p.plan} style={{ background: '#141414', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div><p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{p.plan}</p><p style={{ margin: '2px 0 0', fontSize: '11px', color: '#444' }}>{p.desc}</p></div>
                      <span style={{ color: '#4ade80', fontWeight: 700, fontSize: '14px' }}>{p.prix}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => navigate('/register')} style={{ width: '100%', background: '#4ade80', color: '#000', border: 'none', padding: '13px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Devenir joueur</button>
              </div>
            </>
          )}

          {fanOnglet === 'favoris' && (
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '1.5rem', letterSpacing: '-0.3px' }}>Reels sauvegardés</h2>
              {loadingFanFavoris ? (
                <p style={{ color: '#4ade80', textAlign: 'center', fontSize: '14px' }}>Chargement...</p>
              ) : fanFavoris.length === 0 ? (
                <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '3rem', textAlign: 'center' }}>
                  <p style={{ color: '#333', margin: '0 0 12px', display: 'flex', justifyContent: 'center' }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  </p>
                  <p style={{ color: '#555', fontSize: '14px', lineHeight: 1.6 }}>Aucun reel sauvegardé.<br />Swipe sur Jogabonito et tape Save pour les retrouver ici.</p>
                  <button onClick={() => navigate('/jogabonito')} style={{ marginTop: '1rem', background: '#4ade80', color: '#000', border: 'none', padding: '10px 24px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>Aller sur Jogabonito</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {fanFavoris.map(reel => (
                    <div key={reel.id} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <Avatar person={reel.profiles} size={44} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{reel.profiles?.prenom} {reel.profiles?.nom}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#4ade80' }}>{reel.profiles?.poste}{reel.profiles?.categorie ? ` · ${reel.profiles.categorie}` : ''}</p>
                        {reel.titre && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#444', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{reel.titre}</p>}
                      </div>
                      <button onClick={() => navigate('/jogabonito')} style={{ background: '#4ade8010', border: '1px solid #4ade8030', color: '#4ade80', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', flexShrink: 0, fontFamily: 'Inter, sans-serif' }}>Voir</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {fanOnglet === 'messages' && (
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '20px', padding: '3rem 2rem', textAlign: 'center' }}>
              <div style={{ color: '#2a2a2a', display: 'flex', justifyContent: 'center', marginBottom: '16px' }}><IconLock /></div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.3px' }}>Plan Pro requis</h2>
              <p style={{ fontSize: '13px', color: '#555', maxWidth: '340px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>Passe au Plan Pro pour recevoir des messages de recruteurs et clubs.</p>
              <button onClick={() => window.location.href = stripeUrl(STRIPE_LINKS.pro, userId)} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '12px 28px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{t('aff_pro_prix', lang)}</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── PAS ABONNÉ ──
  if (!profil?.abonnement_actif) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');`}</style>
        <div style={{ maxWidth: '400px', width: '100%', background: '#111', border: '1px solid #1a1a1a', borderRadius: '20px', padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.5px' }}>Digital<span style={{ color: '#4ade80' }}>Football</span></div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.3px' }}>Abonnement non actif</h1>
          <p style={{ fontSize: '13px', color: '#555', marginBottom: '1.5rem' }}>Ton paiement n'a pas encore été confirmé.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.5rem' }}>
            <button onClick={() => window.location.href = stripeUrl(STRIPE_LINKS.starter, userId)} style={{ background: 'transparent', color: 'white', border: '1px solid #2a2a2a', padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Activer — {t('aff_starter_prix', lang)}</button>
            <button onClick={() => window.location.href = stripeUrl(STRIPE_LINKS.pro, userId)} style={{ background: '#4ade80', color: '#0a0a0a', border: 'none', padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Activer — {t('aff_pro_prix', lang)}</button>
          </div>
          <span onClick={handleLogout} style={{ color: '#444', fontSize: '12px', cursor: 'pointer' }}>Déconnexion</span>
        </div>
      </div>
    )
  }

  // ── DASHBOARD PRINCIPAL ──
  const isPro = profil?.plan === 'pro' || profil?.plan === 'joueur_pro'

  const navItems = [
    { id: 'dashboard', label: t('jnav_accueil', lang), icon: <IconHome /> },
    { id: 'equipe', label: t('jnav_equipe', lang), icon: <IconUsers />, badge: mesAffiliations.filter(a => a.statut === 'en_attente').length, section: t('jsec_equipe', lang) },
    { id: 'prep_physique', label: t('jnav_prep_physique', lang), icon: <IconDumbbell /> },
    { id: 'analyses', label: t('jnav_analyses', lang), icon: <IconChart />, badge: demandes.filter(d => d.statut === 'analyse').length, section: t('jsec_developpement', lang) },
    { id: 'coach', label: t('jnav_coach', lang), icon: <IconMic />, badge: coachUnread, section: t('jsec_developpement', lang) },
    { id: 'profil', label: t('jnav_profil', lang), icon: <IconUser />, section: t('jsec_profil', lang) },
    { id: 'carte', label: t('jnav_carte', lang), icon: <IconCard />, section: t('jsec_profil', lang) },
    { id: 'certif', label: t('jnav_certif', lang), icon: <IconBadge />, section: t('jsec_profil', lang) },
    { id: 'clubs', label: t('jnav_explorer', lang), icon: <IconBuilding />, section: t('jsec_reseau', lang) },
    { id: 'messages', label: t('jnav_recruteurs', lang), icon: <IconMessage />, badge: conversations.length, section: t('jsec_reseau', lang) },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', fontFamily: 'Inter, sans-serif', display: 'flex' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
        input:focus, select:focus, textarea:focus { border-color: #4ade8060 !important; box-shadow: 0 0 0 3px #4ade8008; }
        .dj-nav-btn:hover { background: #141414 !important; color: #ccc !important; }
        .dj-action-card:hover { transform: translateY(-2px); border-color: #2a2a2a !important; }
        .dj-btn-green:hover { background: #22c55e !important; }
        .dj-bottom-nav-btn:hover { color: #ccc !important; }
      `}</style>

      {/* ── SIDEBAR ── */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 40 }} />
      )}

      <aside style={{
        width: '220px', background: '#0d0d0d', borderRight: '1px solid #141414', display: 'flex', flexDirection: 'column', flexShrink: 0,
        ...(isMobile ? {
          position: 'fixed', top: 0, left: sidebarOpen ? 0 : -240, height: '100%', zIndex: 50, transition: 'left 0.25s ease', overflowY: 'auto',
        } : {
          position: 'sticky', top: 0, height: '100vh', minHeight: '100vh', overflowY: 'auto',
        }),
      }}>
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #141414', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.5px' }}>
            Digital<span style={{ color: '#4ade80' }}>Football</span>
          </div>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#555', fontSize: 20, cursor: 'pointer' }}>✕</button>
          )}
        </div>

        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {navItems.map((item, i) => (
            <div key={item.id}>
              {item.section && item.section !== navItems[i - 1]?.section && (
                <div style={{ color: '#333', fontSize: '10px', fontWeight: 800, letterSpacing: '1.5px', padding: '16px 12px 6px', textTransform: 'uppercase' }}>
                  {item.section}
                </div>
              )}
              <button className="dj-nav-btn" onClick={() => { setOnglet(item.id); setSidebarOpen(false) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: onglet === item.id ? '#4ade8012' : 'transparent', color: onglet === item.id ? '#4ade80' : item.locked ? '#333' : '#555', fontSize: '13px', fontWeight: onglet === item.id ? 700 : 400, textAlign: 'left', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s', position: 'relative' }}>
                <span style={{ flexShrink: 0 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.locked && <span style={{ fontSize: '12px', opacity: 0.4 }}>🔒</span>}
                {item.badge > 0 && (
                  <span style={{ background: '#4ade80', color: '#000', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '20px', letterSpacing: '0.3px' }}>
                    {item.badge}
                  </span>
                )}
                {onglet === item.id && (
                  <div style={{ position: 'absolute', left: 0, top: '20%', height: '60%', width: '3px', background: '#4ade80', borderRadius: '0 3px 3px 0' }} />
                )}
              </button>
            </div>
          ))}
        </nav>

        {/* Clochette notifications */}
        <div style={{ padding: '0 10px 12px', position: 'relative' }}>
          <button onClick={() => setNotifDropdownOpen(!notifDropdownOpen)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'transparent', color: '#555', fontSize: '13px', fontFamily: 'Inter, sans-serif', position: 'relative' }}>
            <span style={{ fontSize: '16px' }}>🔔</span>
            <span style={{ flex: 1, textAlign: 'left' }}>Notifications</span>
            {notifications.filter(n => !n.lu).length > 0 && (
              <span style={{ background: '#4ade80', color: '#000', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '20px' }}>
                {notifications.filter(n => !n.lu).length}
              </span>
            )}
          </button>

          {notifDropdownOpen && (
            <div style={{ position: 'absolute', bottom: '100%', left: '10px', right: '10px', background: '#111', border: '1px solid #222', borderRadius: '14px', maxHeight: '400px', overflowY: 'auto', marginBottom: '8px', zIndex: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>Notifications</p>
                {notifications.some(n => !n.lu) && (
                  <button onClick={() => marquerToutLu(userId)} style={{ background: 'none', border: 'none', color: '#4ade80', fontSize: '11px', cursor: 'pointer' }}>Tout marquer lu</button>
                )}
              </div>
              {notifications.length === 0 ? (
                <p style={{ padding: '24px', textAlign: 'center', color: '#444', fontSize: '13px' }}>Aucune notification</p>
              ) : (
                notifications.map(n => (
                  <div key={n.id} onClick={() => { marquerNotifLue(n.id); setNotifDropdownOpen(false); if (n.lien) navigate(n.lien) }}
                    style={{ padding: '12px 16px', borderBottom: '1px solid #141414', cursor: 'pointer', background: n.lu ? 'transparent' : '#4ade8008' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      {!n.lu && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', marginTop: '5px', flexShrink: 0 }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: '12px', fontWeight: n.lu ? 400 : 700 }}>{n.titre}</p>
                        {n.contenu && <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.contenu}</p>}
                        <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#333' }}>{new Date(n.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div style={{ padding: '16px 12px', borderTop: '1px solid #1a1a1a', marginTop: 'auto' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[['fr','🇫🇷'],['en','🇬🇧'],['pt','🇧🇷'],['es','🇪🇸'],['it','🇮🇹'],['de','🇩🇪']].map(([code, flag]) => (
              <button key={code} onClick={() => setLang(code)}
                style={{ background: lang === code ? '#4ade8020' : 'transparent', border: `1px solid ${lang === code ? '#4ade80' : '#2a2a2a'}`, borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '14px', color: lang === code ? '#4ade80' : '#555' }}>
                {flag}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '12px 10px 20px', borderTop: '1px solid #141414' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', marginBottom: '8px' }}>
            <Avatar person={profil} size={32} border="1.5px solid #4ade8040" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profil?.prenom} {profil?.nom}</p>
              <p style={{ margin: '1px 0 0', fontSize: '10px', color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>{profil?.plan}</p>
            </div>
          </div>
          <button onClick={handleLogout} style={{ width: '100%', background: 'transparent', border: '1px solid #1a1a1a', color: '#444', padding: '8px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            Déconnexion
          </button>
        </div>
      </aside>

      {isMobile && (
        <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 150 }}>
          <button onClick={() => setNotifDropdownOpen(!notifDropdownOpen)} style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#111', border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
          <span style={{ fontSize: '18px' }}>🔔</span>
          {notifications.filter(n => !n.lu).length > 0 && (
            <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: '#4ade80', color: '#000', fontSize: '9px', fontWeight: 800, width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {notifications.filter(n => !n.lu).length}
            </span>
          )}
          </button>
          {notifDropdownOpen && (
            <div style={{ position: 'absolute', top: '48px', right: 0, width: '300px', background: '#111', border: '1px solid #222', borderRadius: '14px', maxHeight: '400px', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>Notifications</p>
                {notifications.some(n => !n.lu) && (
                  <button onClick={() => marquerToutLu(userId)} style={{ background: 'none', border: 'none', color: '#4ade80', fontSize: '11px', cursor: 'pointer' }}>Tout marquer lu</button>
                )}
              </div>
              {notifications.length === 0 ? (
                <p style={{ padding: '24px', textAlign: 'center', color: '#444', fontSize: '13px' }}>Aucune notification</p>
              ) : (
                notifications.map(n => (
                  <div key={n.id} onClick={() => { marquerNotifLue(n.id); setNotifDropdownOpen(false); if (n.lien) navigate(n.lien) }}
                    style={{ padding: '12px 16px', borderBottom: '1px solid #141414', cursor: 'pointer', background: n.lu ? 'transparent' : '#4ade8008' }}>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: n.lu ? 400 : 700 }}>{n.titre}</p>
                    {n.contenu && <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#666' }}>{n.contenu}</p>}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex: 1, overflowY: 'auto', minHeight: '100vh' }}>

        {isMobile && (
          <button onClick={() => setSidebarOpen(true)}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', padding: '20px 16px 0', display: 'block' }}>
            ☰
          </button>
        )}

        {/* ── ACCUEIL ── */}
        {onglet === 'dashboard' && (
          <div style={{ maxWidth: '960px', margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 32px' }}>

            {/* HERO CARD */}
            <div style={{ background: 'linear-gradient(135deg, #111 0%, #141414 100%)', border: '1px solid #1a1a1a', borderRadius: '20px', padding: '32px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Avatar person={profil} size={80} border="2.5px solid #4ade80" />
                <label style={{ position: 'absolute', bottom: 0, right: 0, width: '26px', height: '26px', background: '#4ade80', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: avatarUploading ? 'wait' : 'pointer', border: '2.5px solid #0a0a0a' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} disabled={avatarUploading} />
                </label>
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px' }}>{profil?.prenom} {profil?.nom}</h1>
                  <span style={{ background: isPro ? '#4ade80' : '#3b82f6', color: '#000', fontSize: '10px', fontWeight: 800, padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.8px', textTransform: 'uppercase', flexShrink: 0 }}>
                    {profil?.plan}
                  </span>
                  {profil?.numero_licence && (
                    <span style={{ background: '#1a2e4a', border: '1px solid #3b82f640', color: '#60a5fa', fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.5px', flexShrink: 0 }}>
                      🪪 {t('jd_licencie', lang)}
                    </span>
                  )}
                </div>
                <p style={{ color: '#555', fontSize: '13px', marginBottom: '20px' }}>
                  {profil?.poste || '—'}{profil?.club ? ` · ${profil.club}` : ''}{profil?.region ? ` · ${profil.region}` : ''}
                </p>
                <div style={{ display: 'flex', gap: isMobile ? '16px' : '28px', flexWrap: 'wrap' }}>
                  {[
                    { val: profil?.analyses_restantes ?? '—', label: t('jd_analyses_stat', lang) },
                    { val: demandes.length, label: t('jd_demandes_stat', lang) },
                    { val: profil?.categorie || '—', label: t('equipe_categorie', lang) },
                  ].map((s, i, arr) => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '16px' : '28px' }}>
                      <div>
                        <p style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: 800, lineHeight: 1, color: '#fff' }}>{s.val}</p>
                        <p style={{ fontSize: isMobile ? '9px' : '10px', color: '#444', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600, marginTop: '3px' }}>{s.label}</p>
                      </div>
                      {i < arr.length - 1 && <div style={{ width: '1px', height: '32px', background: '#1f1f1f' }} />}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* PROCHAINES ÉCHÉANCES (si affilié à un éducateur) */}
            {widgetCalendrier.length > 0 && (() => {
              const OPTIONS_SONDAGE = [
                { val: 'present',  label: t('ent_present', lang),  emoji: '✅', color: '#4ade80' },
                { val: 'absent',   label: t('ent_absent', lang),   emoji: '❌', color: '#ef4444' },
                { val: 'blesse',   label: t('ent_blesse', lang),   emoji: '🤕', color: '#f97316' },
                { val: 'malade',   label: t('ent_malade', lang),   emoji: '😷', color: '#a855f7' },
                { val: 'convoque', label: t('ent_convoque', lang), emoji: '🏆', color: '#60a5fa' },
              ]
              return (
                <div style={{ marginBottom: '20px' }}>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
                    {t('jd_prochaines_echeances', lang)}
                  </p>
                  <div style={{ display: 'flex', overflowX: 'auto', gap: '10px', paddingBottom: '6px' }}>
                    {widgetCalendrier.map(ev => {
                      const date = new Date(ev.date + 'T12:00:00')
                      const isToday = date.toDateString() === new Date().toDateString()
                      const isTomorrow = date.toDateString() === new Date(Date.now() + 86400000).toDateString()
                      const labelJour = isToday ? t('aff_aujourdhui', lang) : isTomorrow ? t('aff_demain', lang) : date.toLocaleDateString(localeOf(lang), { weekday: 'short', day: 'numeric', month: 'short' })
                      const isMatch = ev.type === 'match'
                      const statut = dispoMap[ev.id] || null
                      const sondageClos = ev.sondage_clos
                      const accentColor = isMatch ? '#60a5fa' : '#4ade80'
                      const optStatut = OPTIONS_SONDAGE.find(o => o.val === statut)
                      const pending = pendingDispo[ev.id]
                      const selected = pending !== undefined ? pending : statut
                      const hasUnsavedChoice = pending !== undefined && pending !== statut

                      return (
                        <div key={ev.id} style={{
                          flexShrink: 0, width: '150px', minHeight: '158px',
                          background: isMatch ? 'linear-gradient(135deg, #0d1220 0%, #0f0f0f 100%)' : 'linear-gradient(135deg, #0d1a0d 0%, #0f0f0f 100%)',
                          border: `1px solid ${isToday ? accentColor + '40' : accentColor + '20'}`,
                          borderRadius: '16px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                            {isToday && (
                              <span style={{ fontSize: '8px', fontWeight: 800, color: '#f0c030', background: '#f0c03015', border: '1px solid #f0c03030', padding: '1px 6px', borderRadius: '20px' }}>
                                {t('aff_aujourdhui', lang)}
                              </span>
                            )}
                            {sondageClos && <span style={{ fontSize: '10px' }} title={t('ent_sondage_clos', lang)}>🔒</span>}
                          </div>
                          <p style={{ fontWeight: 800, fontSize: '12px', margin: 0, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{ev.titre}</p>
                          <p style={{ fontSize: '10px', color: '#555', margin: 0 }}>{labelJour}{ev.heure ? ` · ${ev.heure}` : ''}</p>
                          {ev.lieu && <p style={{ fontSize: '10px', color: '#555', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📍 {ev.lieu}</p>}

                          {!sondageClos ? (
                            <div style={{ marginTop: 'auto', paddingTop: '6px', borderTop: `1px solid ${accentColor}12` }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                                {OPTIONS_SONDAGE.map(opt => {
                                  const isSelected = selected === opt.val
                                  return (
                                    <button key={opt.val} title={opt.label}
                                      onClick={() => setPendingDispo(prev => ({ ...prev, [ev.id]: opt.val }))} disabled={savingDispo}
                                      style={{ flexShrink: 0, width: '24px', height: '24px', padding: 0, borderRadius: '50%', background: isSelected ? `${opt.color}20` : 'transparent', border: `1px solid ${isSelected ? opt.color + '60' : '#2a2a2a'}`, color: isSelected ? opt.color : '#555', fontSize: '12px', lineHeight: 1, cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      {opt.emoji}
                                    </button>
                                  )
                                })}
                              </div>
                              {hasUnsavedChoice && (
                                <button disabled={savingDispo}
                                  onClick={async () => {
                                    await repondreDisponibilite(ev.id, ev.type, pending)
                                    setPendingDispo(prev => { const next = { ...prev }; delete next[ev.id]; return next })
                                  }}
                                  style={{ width: '100%', background: '#4ade80', color: '#000', border: 'none', padding: '5px 0', borderRadius: '8px', fontSize: '10px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                                  {t('aff_valider', lang)}
                                </button>
                              )}
                              {statut && !hasUnsavedChoice && <p style={{ fontSize: '9px', color: '#4ade80', margin: 0 }}>✓ {t('aff_reponse_envoyee', lang)}</p>}
                            </div>
                          ) : statut && (
                            <div style={{ marginTop: 'auto', paddingTop: '6px', borderTop: `1px solid ${accentColor}12` }}>
                              <p style={{ fontSize: '10px', color: optStatut?.color, fontWeight: 700, margin: 0 }}>{optStatut?.emoji} {optStatut?.label}</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            {/* QUOTA ANALYSES */}
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#ccc', marginBottom: '3px' }}>{t('jd_quota_titre', lang)}</p>
                  <p style={{ fontSize: '11px', color: '#444' }}>{t('jd_quota_reset', lang)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '26px', fontWeight: 900, color: (profil?.analyses_restantes || 0) > 0 ? '#4ade80' : '#ef4444', lineHeight: 1 }}>
                    {profil?.analyses_restantes ?? 0}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {(profil?.analyses_restantes || 0) > 0 ? (
                  <button className="dj-btn-green" onClick={() => navigate('/upload')} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '10px 24px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'background 0.15s' }}>
                    {t('jd_envoyer_video', lang)}
                  </button>
                ) : (
                  <p style={{ fontSize: '12px', color: '#444', margin: 0, alignSelf: 'center' }}>{t('jd_quota_epuise', lang)}</p>
                )}
                <button onClick={() => window.location.href = stripeUrl(STRIPE_LINKS.analyse_unite, userId)} style={{ background: 'transparent', color: '#4ade80', border: '1px solid #4ade8040', padding: '10px 24px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  {t('aff_acheter_analyse_cta', lang)}
                </button>
              </div>
            </div>

            {/* ACTION CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: isPro ? 'repeat(3, 1fr)' : '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
              <button className="dj-action-card" onClick={() => navigate('/jogabonito')}
                style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '24px 20px', cursor: 'pointer', textAlign: 'left', color: '#fff', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#f9731612', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: '#f97316' }}>
                  <IconPlay />
                </div>
                <p style={{ fontWeight: 800, fontSize: '15px', marginBottom: '4px', letterSpacing: '-0.3px' }}>Jogabonito</p>
                <p style={{ fontSize: '12px', color: '#555', lineHeight: 1.5 }}>Feed vertical · Reels des talents</p>
              </button>

              {isPro && (
                <button className="dj-action-card" onClick={() => navigate('/feed')}
                  style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '24px 20px', cursor: 'pointer', textAlign: 'left', color: '#fff', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#4ade8012', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: '#4ade80' }}>
                    <IconGlobe />
                  </div>
                  <p style={{ fontWeight: 800, fontSize: '15px', marginBottom: '4px', letterSpacing: '-0.3px' }}>Feed</p>
                  <p style={{ fontSize: '12px', color: '#555', lineHeight: 1.5 }}>Talents · Visible recruteurs</p>
                </button>
              )}

              <button className="dj-action-card" onClick={() => navigate(isPro ? '/upload-clip' : '/upload-reel')}
                style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '24px 20px', cursor: 'pointer', textAlign: 'left', color: '#fff', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#60a5fa12', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: '#60a5fa' }}>
                  <IconUpload />
                </div>
                <p style={{ fontWeight: 800, fontSize: '15px', marginBottom: '4px', letterSpacing: '-0.3px' }}>Publier</p>
                <p style={{ fontSize: '12px', color: '#555', lineHeight: 1.5 }}>{isPro ? 'Clip Feed · Visible agents & clubs' : 'Reel Jogabonito · MP4 · TikTok'}</p>
              </button>
            </div>

            {/* VIDÉO */}
            {profil?.clip_url ? (
              <div style={{ background: '#111', border: '1px solid #4ade8020', borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '3px' }}>{t('jvid_partagee', lang)}</p>
                    <p style={{ fontSize: '11px', color: '#444' }}>{isPro ? t('jvid_feed_visible', lang) : 'Jogabonito uniquement'}</p>
                  </div>
                  <span style={{ background: '#4ade8015', color: '#4ade80', fontSize: '10px', fontWeight: 800, padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.5px' }}>LIVE</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <a href={profil.clip_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#4ade80', color: '#000', padding: '9px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', textDecoration: 'none' }}>
                    {t('jvid_voir', lang)}
                  </a>
                  <button onClick={() => navigate('/upload-clip')} style={{ background: 'transparent', color: '#555', border: '1px solid #222', padding: '9px 20px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{t('jvid_changer', lang)}</button>
                  <button onClick={handleDeleteVideo} disabled={deletingVideo} style={{ background: 'transparent', color: deletingVideo ? '#444' : '#ef4444', border: '1px solid #ef444425', padding: '9px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: deletingVideo ? 'wait' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    {deletingVideo ? t('jvid_suppression', lang) : t('btn_supprimer', lang)}
                  </button>
                </div>
              </div>
            ) : reelJogabonito ? (
              <div style={{ background: '#111', border: '1px solid #f9731620', borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '3px' }}>{t('jvid_jogabonito', lang)}</p>
                    <p style={{ fontSize: '11px', color: '#444' }}>{t('jvid_visible_joga', lang)}</p>
                  </div>
                  <span style={{ background: '#f9731615', color: '#f97316', fontSize: '10px', fontWeight: 800, padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.5px' }}>LIVE</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <a href={reelJogabonito.video_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f97316', color: '#fff', padding: '9px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', textDecoration: 'none' }}>
                    {t('jvid_voir', lang)}
                  </a>
                  <button onClick={() => navigate('/upload-reel')} style={{ background: 'transparent', color: '#555', border: '1px solid #222', padding: '9px 20px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{t('jvid_changer', lang)}</button>
                  <button onClick={handleDeleteReel} disabled={deletingReel} style={{ background: 'transparent', color: deletingReel ? '#444' : '#ef4444', border: '1px solid #ef444425', padding: '9px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: deletingReel ? 'wait' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    {deletingReel ? t('jvid_suppression', lang) : t('btn_supprimer', lang)}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ background: '#111', border: '1px dashed #222', borderRadius: '16px', padding: '36px', marginBottom: '16px', textAlign: 'center' }}>
                <div style={{ color: '#2a2a2a', display: 'flex', justifyContent: 'center', marginBottom: '12px' }}><IconVideoOff /></div>
                <p style={{ fontWeight: 700, fontSize: '14px', color: '#444', marginBottom: '6px' }}>{t('jvid_aucune', lang)}</p>
                <p style={{ fontSize: '12px', color: '#333', marginBottom: '20px', lineHeight: 1.6 }}>
                  {isPro ? 'Publie un clip pour apparaître dans le Feed et Jogabonito' : 'Publie un reel pour apparaître dans Jogabonito'}
                </p>
                <button onClick={() => navigate(isPro ? '/upload-clip' : '/upload-reel')} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '10px 24px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  {isPro ? t('jvid_publier_clip', lang) : t('jvid_publier_reel', lang)}
                </button>
              </div>
            )}

            {/* MESSAGES PREVIEW */}
            {conversations.length > 0 && (
              <div style={{ background: '#111', border: '1px solid #4ade8018', borderRadius: '16px', padding: '20px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <p style={{ fontWeight: 700, fontSize: '13px', color: '#4ade80' }}>{t('jd_messages_rec', lang)}</p>
                  <button onClick={() => setOnglet('messages')} style={{ background: 'transparent', border: 'none', color: '#444', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{t('jd_voir_tout', lang)}</button>
                </div>
                {conversations.slice(0, 2).map(conv => (
                  <div key={conv.otherId} onClick={() => { setMessageActif(conv); setOnglet('messages') }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: '#141414', borderRadius: '10px', cursor: 'pointer', marginBottom: '6px' }}>
                    <Avatar person={conv.other} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: '13px', marginBottom: '1px' }}>{conv.other?.prenom} {conv.other?.nom}</p>
                      <p style={{ fontSize: '11px', color: '#4ade80' }}>{t('jd_recruteur_badge', lang)}</p>
                    </div>
                    <p style={{ fontSize: '12px', color: '#333', maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.msgs[0]?.content}</p>
                  </div>
                ))}
              </div>
            )}

            {convCoach.length > 0 && (
              <div style={{ background: '#111', border: '1px solid #f9731618', borderRadius: '16px', padding: '20px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <p style={{ fontWeight: 700, fontSize: '13px', color: '#f97316' }}>{t('jd_reponses_coach', lang)}</p>
                  <button onClick={() => setOnglet('coach')} style={{ background: 'transparent', border: 'none', color: '#444', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{t('jd_voir_tout', lang)}</button>
                </div>
                {convCoach.slice(0, 1).map(conv => (
                  <div key={conv.otherId} onClick={() => setOnglet('coach')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: '#141414', borderRadius: '10px', cursor: 'pointer' }}>
                    <Avatar person={conv.other} size={32} bg="#f9731612" border="1.5px solid #f9731630" textColor="#f97316" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: '13px', marginBottom: '1px' }}>{conv.other?.prenom} {conv.other?.nom}</p>
                      <p style={{ fontSize: '11px', color: '#f97316' }}>{t('jnav_coach', lang)}</p>
                    </div>
                    <p style={{ fontSize: '12px', color: '#333', maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.msgs[0]?.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* UPSELL PRO */}
            {!isPro && (
              <div style={{ background: 'linear-gradient(135deg, #0d1a0d 0%, #111 100%)', border: '1px solid #4ade8025', borderRadius: '16px', padding: '22px 24px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <p style={{ fontWeight: 800, fontSize: '14px', marginBottom: '4px', letterSpacing: '-0.2px' }}>{t('jd_upsell_titre', lang)}</p>
                  <p style={{ fontSize: '12px', color: '#555' }}>{t('jd_upsell_desc', lang)}</p>
                </div>
                <button onClick={() => window.location.href = stripeUrl(STRIPE_LINKS.pro, userId)} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '10px 22px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
                  {t('jd_plan_pro_cta', lang)}
                </button>
              </div>
            )}

            {/* ABONNEMENT */}
            <div style={{ background: '#111', border: '1px solid #141414', borderRadius: '14px', padding: '18px 20px' }}>
              {cancelDone ? (
                <div>
                  <p style={{ fontSize: '13px', color: '#f97316', fontWeight: 700, marginBottom: '4px' }}>{t('jd_resiliation_prog', lang)}</p>
                  <p style={{ fontSize: '12px', color: '#444' }}>{t('jd_resiliation_desc', lang)}</p>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <p style={{ fontSize: '12px', color: '#444' }}>
                    {t('jd_plan_actif', lang)} <span style={{ color: '#4ade80', fontWeight: 700, textTransform: 'capitalize' }}>{profil?.plan}</span>
                  </p>
                  <button onClick={handleCancelSubscription} disabled={cancelling} style={{ background: 'transparent', border: '1px solid #ef444425', color: cancelling ? '#444' : '#ef4444', padding: '7px 14px', borderRadius: '8px', fontSize: '12px', cursor: cancelling ? 'wait' : 'pointer', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                    {cancelling ? t('jd_en_cours', lang) : t('jd_resilier', lang)}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MON PROFIL ── */}
        {onglet === 'profil' && (
          <div style={{ maxWidth: '960px', margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 32px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '28px' }}>{t('jp_titre', lang)}</h1>

            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '28px', marginBottom: '16px' }}>
              <p style={labelStyle}>{t('jp_photo', lang)}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '12px' }}>
                <Avatar person={profil} size={80} border="2px solid #4ade8050" />
                <div>
                  <label style={{ display: 'inline-block', background: '#141414', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '10px 20px', cursor: avatarUploading ? 'not-allowed' : 'pointer', fontSize: '13px', color: avatarUploading ? '#444' : '#aaa', fontFamily: 'Inter, sans-serif' }}>
                    {avatarUploading ? t('jp_upload_cours', lang) : t('jp_choisir_photo', lang)}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} disabled={avatarUploading} />
                  </label>
                  <p style={{ fontSize: '11px', color: '#444', marginTop: '8px' }}>JPG, PNG, WEBP · Max 5 MB</p>
                </div>
              </div>
            </div>

            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '28px', marginBottom: '16px' }}>
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

            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '28px', marginBottom: '20px' }}>
              <p style={{ ...labelStyle, marginBottom: '20px' }}>{t('jp_stats', lang)}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                {[['matchs_officiel', t('jp_matchs_off', lang)], ['matchs_amical', t('jp_matchs_amical', lang)], ['minutes_jouees', t('jp_minutes', lang)], ['buts_pied_droit', t('jp_buts_droit', lang)], ['buts_pied_gauche', t('jp_buts_gauche', lang)], ['buts_tete', t('jp_buts_tete', lang)], ['buts_total', t('jp_buts_total', lang)], ['passes_decisives', t('jp_passes_dec', lang)], ['cleansheets', t('jp_cleansheets', lang)]].map(([key, label]) => (
                  <div key={key}><label style={labelStyle}>{label}</label><input type="number" min="0" value={stats[key]} onChange={e => setStats({ ...stats, [key]: parseInt(e.target.value) || 0 })} style={inputStyle} /></div>
                ))}
              </div>
            </div>

            {caracteristiquesParPoste[profil?.poste] && (
              <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '28px', marginBottom: '20px' }}>
                <p style={{ ...labelStyle, marginBottom: '20px' }}>{t('jp_style_jeu', lang)}</p>

                <div style={{ marginBottom: '24px' }}>
                  <label style={labelStyle}>{t('jp_mon_style', lang)}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                    {['Dos au jeu', 'Technique / Dribbleur', 'Physique / Aérien', 'Vitesse / Percussion', 'Créateur / Vision', 'Box-to-box', 'Renard des surfaces', 'Défensif / Récupérateur', 'Meneur / Leadership', 'Centreur', 'Buteur / Finisseur', 'Pressing intense', 'Ailier percutant', 'Polyvalent'].map(s => (
                      <div key={s} onClick={() => setStyleDeJeu(styleDeJeu === s ? '' : s)}
                        style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer',
                          background: styleDeJeu === s ? '#60a5fa20' : '#1a1a1a',
                          border: styleDeJeu === s ? '1px solid #60a5fa' : '1px solid #333',
                          color: styleDeJeu === s ? '#60a5fa' : '#aaa',
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
                            background: selected ? '#4ade8020' : '#1a1a1a',
                            border: selected ? '1px solid #4ade80' : '1px solid #333',
                            color: selected ? '#4ade80' : disabled ? '#444' : 'white',
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
                            background: selected ? '#4ade8020' : '#1a1a1a',
                            border: selected ? '1px solid #4ade80' : '1px solid #333',
                            color: selected ? '#4ade80' : disabled ? '#444' : 'white',
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

            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '28px', marginBottom: '20px' }}>
              <p style={{ ...labelStyle, marginBottom: '20px' }}>{t('jp_parcours', lang)}</p>

              {parcours.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  {parcours.map((p, i) => (
                    <div key={p.id} style={{ display: 'flex', gap: '14px', position: 'relative' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#4ade80', marginTop: '4px', flexShrink: 0 }} />
                        {i < parcours.length - 1 && <div style={{ width: '1px', flex: 1, background: '#1f1f1f', marginTop: '2px' }} />}
                      </div>
                      <div style={{ flex: 1, paddingBottom: i < parcours.length - 1 ? '20px' : 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {p.logo_url
                            ? <img src={p.logo_url} alt={p.club} style={{ width: '28px', height: '28px', objectFit: 'contain', flexShrink: 0 }} />
                            : <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: getClubColor(p.club || '?'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: '#fff', flexShrink: 0 }}>{getClubInitials(p.club || '?')}</div>
                          }
                          <div>
                            <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '3px' }}>{p.club}</p>
                            <p style={{ fontSize: '11px', color: '#555', marginBottom: '4px' }}>
                              {[p.saison, p.niveau_championnat, p.categorie, p.poste].filter(Boolean).join(' · ')}
                            </p>
                            {(p.matchs_joues > 0 || p.buts > 0 || p.passes_decisives > 0 || p.cleansheets > 0) && (
                              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {p.matchs_joues > 0 && <span style={{ fontSize: '11px', color: '#4ade80' }}>⚽ {p.matchs_joues} matchs</span>}
                                {p.buts > 0 && <span style={{ fontSize: '11px', color: '#f97316' }}>⚽ {p.buts} buts</span>}
                                {p.passes_decisives > 0 && <span style={{ fontSize: '11px', color: '#60a5fa' }}>🎯 {p.passes_decisives} passes</span>}
                                {p.cleansheets > 0 && <span style={{ fontSize: '11px', color: '#a855f7' }}>🧤 {p.cleansheets} CS</span>}
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
                        : <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', borderRadius: '50%', background: getClubColor(nouveauClub.club), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 800, color: '#fff', zIndex: 1 }}>{getClubInitials(nouveauClub.club)}</div>
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
                      <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: '#555' }}>…</span>
                    )}
                  </div>
                  {showSuggestions && clubSuggestions.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', zIndex: 100, overflow: 'hidden', marginTop: '4px' }}>
                      {clubSuggestions.map(team => (
                        <div
                          key={team.idTeam}
                          onMouseDown={() => selectClubSuggestion(team)}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #222' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#222'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          {team.strTeamBadge && <img src={team.strTeamBadge} alt="" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />}
                          <div>
                            <p style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>{team.strTeam}</p>
                            {team.strCountry && <p style={{ fontSize: '10px', color: '#555', margin: 0 }}>{team.strCountry}</p>}
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
                  style={{ background: '#4ade80', color: '#000', border: 'none', padding: '10px 24px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'background 0.15s', opacity: (savingParcours || !nouveauClub.club.trim()) ? 0.5 : 1 }}>
                  {savingParcours ? (editingParcoursId ? t('jp_modif_cours', lang) : t('jp_ajout_cours', lang)) : (editingParcoursId ? t('jp_modifier_parcours', lang) : t('jp_ajouter_club', lang))}
                </button>
                {editingParcoursId && (
                  <button onClick={() => { setEditingParcoursId(null); setNouveauClub({ club: '', saison: '', categorie: '', poste: '', logo_url: '', niveau_championnat: '', matchs_joues: '', buts: '', passes_decisives: '', cleansheets: '' }) }}
                    style={{ background: 'transparent', border: '1px solid #333', color: '#555', padding: '10px 16px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    {t('btn_annuler', lang)}
                  </button>
                )}
              </div>
            </div>

            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '28px', marginBottom: '20px' }}>
              <p style={{ ...labelStyle, marginBottom: '20px' }}>{t('jp_historique_saisons', lang)}</p>
              <HistoriqueSaisons joueurId={userId} />
            </div>

            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '28px', marginBottom: '20px' }}>
              <p style={{ ...labelStyle, marginBottom: '6px' }}>{t('jp_notif_prefs', lang)}</p>
              <p style={{ fontSize: '13px', color: '#555', marginBottom: '20px' }}>{t('jp_notif_desc', lang)}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { key: 'email_analyse', label: t('jp_notif_analyse', lang) },
                  { key: 'email_like', label: t('jp_notif_like', lang) },
                  { key: 'email_commentaire', label: t('jp_notif_commentaire', lang) },
                  { key: 'email_message', label: t('jp_notif_message', lang) },
                ].map(pref => (
                  <div key={pref.key} onClick={() => sauvegarderNotifPrefs({ ...notifPrefs, [pref.key]: !notifPrefs[pref.key] })}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#141414', borderRadius: '10px', cursor: 'pointer' }}>
                    <span style={{ fontSize: '14px' }}>{pref.label}</span>
                    <div style={{ width: '40px', height: '22px', background: notifPrefs[pref.key] ? '#4ade80' : '#333', borderRadius: '20px', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                      <div style={{ position: 'absolute', top: '3px', left: notifPrefs[pref.key] ? '21px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                    </div>
                  </div>
                ))}
              </div>
              {savingPrefs && <p style={{ fontSize: '12px', color: '#4ade80', marginTop: '10px' }}>{t('jp_enregistrement', lang)}</p>}
            </div>

            <button className="dj-btn-green" onClick={handleSaveStats} disabled={savingStats}
              style={{ width: '100%', background: statsSaved ? '#22c55e' : '#4ade80', color: '#000', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'background 0.2s', letterSpacing: '-0.2px' }}>
              {savingStats ? t('jp_sauvegarde_cours', lang) : statsSaved ? t('jp_profil_sauvegarde', lang) : t('profil_sauvegarder_profil', lang)}
            </button>
          </div>
        )}

        {/* ── ANALYSES ── */}
        {onglet === 'analyses' && (
          <div style={{ maxWidth: '960px', margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px' }}>{t('ja_titre', lang)}</h1>
              {(profil?.analyses_restantes || 0) > 0 && (
                <button onClick={() => navigate('/upload')} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  {t('ja_nouvelle', lang)}
                </button>
              )}
            </div>
            {demandes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <div style={{ color: '#222', display: 'flex', justifyContent: 'center', marginBottom: '16px' }}><IconSearch /></div>
                <p style={{ color: '#444', fontSize: '14px' }}>{t('ja_aucune', lang)}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {demandes.map(demande => (
                  <div key={demande.id} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.2px' }}>{demande.titre}</h3>
                      <span style={{ background: demande.statut === 'analyse' ? '#4ade8012' : '#f59e0b12', color: demande.statut === 'analyse' ? '#4ade80' : '#f59e0b', fontSize: '10px', padding: '3px 10px', borderRadius: '20px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 }}>
                        {demande.statut === 'analyse' ? t('ja_recue', lang) : t('etat_en_attente', lang)}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#444', marginBottom: '12px' }}>{demande.poste} · {new Date(demande.created_at).toLocaleDateString('fr-FR')}</p>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {demande.loom_url && (
                        <a href={demande.loom_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: '#4ade80', color: '#000', padding: '8px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>
                          {t('ja_voir', lang)}
                        </a>
                      )}
                      {demande.rapport_pdf_url && (
                        <a href={demande.rapport_pdf_url} target="_blank" rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            background: '#4ade8015', border: '1px solid #4ade8030',
                            color: '#4ade80', borderRadius: 8, padding: '7px 14px',
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
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '20px', padding: '72px 32px', textAlign: 'center' }}>
              <div style={{ color: '#222', display: 'flex', justifyContent: 'center', marginBottom: '20px' }}><IconLock /></div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.3px' }}>{t('jm_plan_pro', lang)}</h2>
              <p style={{ fontSize: '13px', color: '#555', maxWidth: '340px', margin: '0 auto 24px', lineHeight: 1.7 }}>
                {t('jm_plan_pro_desc', lang)}
              </p>
              <button onClick={() => window.location.href = stripeUrl(STRIPE_LINKS.pro, userId)} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '13px 32px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                {t('jd_plan_pro_cta', lang)}
              </button>
            </div>
          </div>
        )}

        {onglet === 'messages' && profil?.plan !== 'starter' && profil?.plan !== 'fan' && profil?.plan !== 'joueur_starter' && (() => {
          const panelConversation = messageActif ? (
            <>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #141414', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Avatar person={messageActif.other} size={36} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '1px' }}>{messageActif.other?.prenom} {messageActif.other?.nom}</p>
                  <p style={{ fontSize: '11px', color: '#4ade80' }}>{t('jd_recruteur_badge', lang)}</p>
                </div>
                <button onClick={async () => {
                  const { data } = await supabase.from('profiles').select('*').eq('id', messageActif.otherId).single()
                  if (data) setRecruteurModal(data)
                }} style={{ background: '#4ade8015', border: '1px solid #4ade8040', color: '#4ade80', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
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
              <div style={{ padding: '14px 16px', borderTop: '1px solid #141414', display: 'flex', gap: '10px' }}>
                <input style={{ flex: 1, background: '#141414', border: '1px solid #222', borderRadius: '10px', color: '#fff', padding: '10px 14px', fontSize: '13px', outline: 'none', fontFamily: 'Inter, sans-serif' }} placeholder={t('jm_repondre', lang)} value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && envoyerMessage()} />
                <button onClick={envoyerMessage} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>{t('btn_envoyer', lang)}</button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '10px', color: '#2a2a2a' }}>
              <IconMessage />
              <p style={{ fontSize: '13px', color: '#333' }}>{t('jm_select_conv', lang)}</p>
            </div>
          )

          // ── MOBILE : pattern liste → détail (une seule vue visible à la fois) ──
          if (isMobile) {
            if (messageActif) {
              return (
                <div style={{ padding: '12px', height: 'calc(100vh)', display: 'flex', flexDirection: 'column' }}>
                  <button onClick={() => setMessageActif(null)} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: '#4ade80', fontSize: '14px', fontWeight: 600, cursor: 'pointer', padding: '4px 8px 12px', fontFamily: 'Inter, sans-serif' }}>
                    {t('jm_retour', lang)}
                  </button>
                  <div style={{ flex: 1, minHeight: 0, background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
                    <p style={{ fontSize: '13px', color: '#444', marginBottom: '6px' }}>{t('jm_aucun', lang)}</p>
                    <p style={{ fontSize: '11px', color: '#333', lineHeight: 1.5 }}>{t('jm_scout_contact', lang)}</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
                    {conversations.map(conv => (
                      <div key={conv.otherId} onClick={() => setMessageActif(conv)}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', cursor: 'pointer' }}>
                        <Avatar person={conv.other} size={44} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                            <p style={{ fontWeight: 700, fontSize: '14px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.other?.prenom} {conv.other?.nom}</p>
                            {conv.msgs[0]?.created_at && (
                              <span style={{ fontSize: '10px', color: '#444', flexShrink: 0 }}>{new Date(conv.msgs[0].created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                            )}
                          </div>
                          <p style={{ fontSize: '12px', color: '#555', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.msgs[0]?.content}</p>
                        </div>
                        <span style={{ color: '#333', fontSize: '18px', flexShrink: 0 }}>›</span>
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
                <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid #141414' }}>
                    <p style={{ fontWeight: 700, color: '#4ade80', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('jm_conversations', lang)}</p>
                  </div>
                  {conversations.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
                      <p style={{ fontSize: '13px', color: '#444', marginBottom: '6px' }}>{t('jm_aucun', lang)}</p>
                      <p style={{ fontSize: '11px', color: '#333', lineHeight: 1.5 }}>{t('jm_scout_contact', lang)}</p>
                    </div>
                  ) : conversations.map(conv => (
                    <div key={conv.otherId} onClick={() => setMessageActif(conv)}
                      style={{ padding: '12px 16px', borderBottom: '1px solid #141414', cursor: 'pointer', background: messageActif?.otherId === conv.otherId ? '#4ade8008' : 'transparent', borderLeft: messageActif?.otherId === conv.otherId ? '2px solid #4ade80' : '2px solid transparent' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <Avatar person={conv.other} size={30} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 700, fontSize: '13px', marginBottom: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.other?.prenom} {conv.other?.nom}</p>
                          <p style={{ fontSize: '10px', color: '#4ade80', fontWeight: 600 }}>{t('jd_recruteur_badge', lang)}</p>
                        </div>
                      </div>
                      <p style={{ fontSize: '11px', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.msgs[0]?.content}</p>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {panelConversation}
                </div>
              </div>
            </div>
          )
        })()}

        {/* ── COACH ── */}
        {onglet === 'carte' && (
          <div style={{ maxWidth: '520px', margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 32px' }}>
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
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
              <p style={{ fontSize: '13px', color: '#555' }}>
                {t('jcarte_desc', lang)}
              </p>
            </div>

            {(!profil?.plan || profil.plan === 'fan') ? (
              <div style={{ background: '#111', border: '1px dashed #222', borderRadius: '16px', padding: '56px', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎮</div>
                <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '8px' }}>{t('jcarte_feature', lang)}</p>
                <p style={{ fontSize: '13px', color: '#555' }}>{t('jcarte_abo', lang)}</p>
              </div>
            ) : (
              <>
                {profil?.carte_fifa_url && (
                  <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <img src={profil.carte_fifa_url} alt="Ma carte FIFA" style={{ width: '72px', height: '100px', objectFit: 'contain', borderRadius: '6px' }} />
                    <div>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: '#4ade80', marginBottom: '4px' }}>✓ Carte sauvegardée</p>
                      <p style={{ fontSize: '12px', color: '#555' }}>Visible dans ton profil recruteur.</p>
                    </div>
                  </div>
                )}
                <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '24px' }}>
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
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.3px', marginBottom: '4px' }}>
                {t('jcertif_titre', lang)}
                <span style={{ marginLeft: '10px', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: '#f0c03020', color: '#f0c030', border: '1px solid #f0c03040', verticalAlign: 'middle' }}>⭐ Officiel</span>
              </h2>
              <p style={{ fontSize: '13px', color: '#555', lineHeight: 1.6 }}>
                {t('jcertif_desc', lang)}
              </p>
            </div>

            {/* Certifications existantes */}
            {certifications.length > 0 && (
              <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#888', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '14px' }}>{t('jcertif_mes_demandes', lang)}</p>
                {certifications.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #1a1a1a' }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 2px' }}>{c.niveau} — {c.saison}</p>
                      <p style={{ fontSize: '12px', color: '#555', margin: 0 }}>{c.documents?.length || 0} feuille{(c.documents?.length || 0) > 1 ? 's' : ''} envoyée{(c.documents?.length || 0) > 1 ? 's' : ''}</p>
                      {c.commentaire_admin && <p style={{ fontSize: '12px', color: '#f97316', margin: '4px 0 0' }}>💬 {c.commentaire_admin}</p>}
                    </div>
                    <span style={{
                      fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px',
                      background: c.statut === 'validé' ? '#4ade8020' : c.statut === 'rejeté' ? '#ef444420' : '#f0c03020',
                      color: c.statut === 'validé' ? '#4ade80' : c.statut === 'rejeté' ? '#ef4444' : '#f0c030',
                      border: `1px solid ${c.statut === 'validé' ? '#4ade8040' : c.statut === 'rejeté' ? '#ef444440' : '#f0c03040'}`,
                    }}>
                      {c.statut === 'validé' ? t('jcertif_valide', lang) : c.statut === 'rejeté' ? t('jcertif_rejete', lang) : t('jcertif_attente', lang)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Nouvelle demande */}
            {certifSent ? (
              <div style={{ background: '#111', border: '1px solid #4ade8030', borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
                <p style={{ fontSize: '32px', marginBottom: '12px' }}>✅</p>
                <p style={{ fontWeight: 800, fontSize: '16px', color: '#4ade80', marginBottom: '6px' }}>{t('jcertif_envoyee', lang)}</p>
                <p style={{ fontSize: '13px', color: '#555' }}>{t('jcertif_verif_48h', lang)}</p>
              </div>
            ) : (
              <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '24px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#888', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px' }}>{t('jcertif_nouvelle', lang)}</p>
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
                  <p style={{ fontSize: '12px', color: '#555', marginBottom: '10px' }}>{t('jcertif_min5', lang)}</p>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: '#141414', border: '1px dashed #333', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', color: '#aaa' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
                    {uploadingCertif ? t('jp_upload_cours', lang) : t('jcertif_selectionner', lang)}
                    <input type="file" accept="image/*,.pdf" multiple onChange={handleCertifDocUpload} style={{ display: 'none' }} disabled={uploadingCertif} />
                  </label>
                  {certifDocs.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                      {certifDocs.map((url, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#4ade8015', border: '1px solid #4ade8030', borderRadius: '8px', padding: '4px 10px' }}>
                          <span style={{ fontSize: '11px', color: '#4ade80' }}>✓ Feuille {i + 1}</span>
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
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.3px', marginBottom: '4px' }}>{t('jcoach_titre', lang)}</h2>
              <p style={{ fontSize: '13px', color: '#555' }}>{t('jcoach_desc', lang)}</p>
            </div>
            {convCoach.length > 0 && (
              <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', marginBottom: '20px', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #141414' }}>
                  <p style={{ fontWeight: 700, color: '#f97316', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('jcoach_historique', lang)}</p>
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
              <div style={{ background: '#111', border: '1px dashed #222', borderRadius: '16px', padding: '56px', textAlign: 'center', color: '#2a2a2a' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}><IconMic /></div>
                <p style={{ fontSize: '13px', color: '#444' }}>{t('jcoach_aucun', lang)}</p>
              </div>
            ) : (
              <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '24px' }}>
                {coaches.length > 1 && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={labelStyle}>{t('jcoach_coach', lang)}</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {coaches.map(c => (
                        <button key={c.id} onClick={() => setCoachSelectionne(c)}
                          style={{ background: coachSelectionne?.id === c.id ? '#f97316' : 'transparent', color: coachSelectionne?.id === c.id ? '#000' : '#555', border: `1px solid ${coachSelectionne?.id === c.id ? '#f97316' : '#2a2a2a'}`, padding: '7px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: coachSelectionne?.id === c.id ? 700 : 400, fontFamily: 'Inter, sans-serif' }}>
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
                  <div style={{ textAlign: 'center', padding: '36px 0', color: '#f97316' }}>
                    <p style={{ fontSize: '28px', marginBottom: '8px' }}>✓</p>
                    <p style={{ fontWeight: 700, fontSize: '14px' }}>{t('jcoach_msg_envoye', lang)}</p>
                  </div>
                ) : (
                  <>
                    <textarea value={messageCoach} onChange={e => setMessageCoach(e.target.value)}
                      placeholder={`Bonjour ${coachSelectionne?.prenom || ''}, j'aurais une question sur...`}
                      style={{ width: '100%', background: '#141414', border: '1px solid #2a2a2a', borderRadius: '10px', color: '#fff', padding: '14px', fontSize: '13px', resize: 'vertical', minHeight: '140px', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif', outline: 'none' }} />
                    <button onClick={envoyerMessageCoach} disabled={sendingCoach || !messageCoach.trim()}
                      style={{ marginTop: '12px', width: '100%', background: '#f97316', color: '#000', border: 'none', borderRadius: '10px', padding: '13px', fontWeight: 800, fontSize: '14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', opacity: (sendingCoach || !messageCoach.trim()) ? 0.4 : 1, transition: 'opacity 0.2s' }}>
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
        {onglet === 'clubs' && (
          <div style={{ maxWidth: '960px', margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 32px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '4px' }}>{t('jexp_titre', lang)}</h1>
            <p style={{ fontSize: '13px', color: '#555', marginBottom: '20px' }}>{t('jexp_desc', lang)}</p>

            {/* Filtres */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {[
                { id: 'tous', label: `${t('jexp_filtre_tous', lang)} (${clubsListe.length + recruteursList.length})` },
                { id: 'clubs', label: `🏟️ ${t('jexp_filtre_clubs', lang)} (${clubsListe.length})` },
                { id: 'recruteurs', label: `🔍 ${t('jexp_filtre_rec', lang)} (${recruteursList.length})` },
              ].map(f => (
                <button key={f.id} onClick={() => setExplorerFiltre(f.id)}
                  style={{ padding: '7px 16px', borderRadius: '20px', border: `1px solid ${explorerFiltre === f.id ? '#4ade80' : '#2a2a2a'}`, background: explorerFiltre === f.id ? '#4ade8015' : 'transparent', color: explorerFiltre === f.id ? '#4ade80' : '#555', fontSize: '12px', fontWeight: explorerFiltre === f.id ? 700 : 400, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  {f.label}
                </button>
              ))}
            </div>

            {clubsLoading && <p style={{ color: '#444', textAlign: 'center' }}>{t('jexp_chargement', lang)}</p>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

              {/* Clubs / Éducateurs */}
              {(explorerFiltre === 'tous' || explorerFiltre === 'clubs') && clubsListe.map(edu => (
                <div key={`edu-${edu.id}`}
                  style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}
                  onClick={() => navigate(`/clubs/${edu.id}`)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#4ade8040'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#1a1a1a'}>
                  {edu.avatar_url
                    ? <img src={edu.avatar_url} alt="" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #4ade8030', flexShrink: 0 }} />
                    : <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#0d1a0d', border: '2px solid #4ade8020', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: '#4ade80', flexShrink: 0 }}>
                        {(edu.club || edu.prenom || '?')[0].toUpperCase()}
                      </div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{edu.club || `${edu.prenom} ${edu.nom}`}</p>
                      <span style={{ background: '#4ade8015', color: '#4ade80', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', border: '1px solid #4ade8030' }}>{t('jexp_club_badge', lang)}</span>
                      <BadgeNote cibleId={edu.id} />
                    </div>
                    <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#555' }}>
                      {[edu.niveau_equipe, edu.region].filter(Boolean).join(' · ')}
                    </p>
                    {edu.description && <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{edu.description}</p>}
                  </div>
                  <span style={{ color: '#4ade80', fontSize: '16px', flexShrink: 0 }}>→</span>
                </div>
              ))}

              {/* Recruteurs */}
              {(explorerFiltre === 'tous' || explorerFiltre === 'recruteurs') && recruteursList.map(rec => (
                <div key={`rec-${rec.id}`}
                  style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}
                  onClick={() => setRecruteurModal(rec)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#60a5fa40'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#1a1a1a'}>
                  {rec.avatar_url
                    ? <img src={rec.avatar_url} alt="" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #60a5fa30', flexShrink: 0 }} />
                    : <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#0d0d1a', border: '2px solid #60a5fa20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: '#60a5fa', flexShrink: 0 }}>
                        {(rec.prenom || '?')[0]}{(rec.nom || '')[0]}
                      </div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{rec.prenom} {rec.nom}</p>
                      <span style={{ background: '#60a5fa15', color: '#60a5fa', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', border: '1px solid #60a5fa30' }}>{t('jexp_rec_badge', lang)}</span>
                      <BadgeNote cibleId={rec.id} />
                    </div>
                    <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#555' }}>
                      {[rec.type_recruteur, rec.club, rec.region].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span style={{ color: '#60a5fa', fontSize: '16px', flexShrink: 0 }}>⭐</span>
                </div>
              ))}

              {!clubsLoading && (explorerFiltre === 'tous' ? clubsListe.length + recruteursList.length : explorerFiltre === 'clubs' ? clubsListe.length : recruteursList.length) === 0 && (
                <div style={{ background: '#111', border: '1px dashed #222', borderRadius: '16px', padding: '56px', textAlign: 'center' }}>
                  <p style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</p>
                  <p style={{ fontSize: '14px', color: '#444' }}>{t('jexp_aucun', lang)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MON ÉQUIPE ── */}
        {onglet === 'equipe' && (
          <div style={{ maxWidth: '960px', margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 32px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px' }}>{t('jeq_titre', lang)}</h1>
            <p style={{ color: '#555', fontSize: '13px', marginBottom: '2rem' }}>{t('jeq_desc', lang)}</p>

            {/* Code d'entrée */}
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '20px', marginBottom: '1.5rem' }}>
              <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: '14px' }}>🔑 {t('jeq_rejoindre', lang)}</p>
              <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#555' }}>{t('jeq_rejoindre_desc', lang)}</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  style={{ flex: 1, background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '15px', fontFamily: 'monospace', letterSpacing: '2px', textTransform: 'uppercase' }}
                  placeholder="CODE ÉQUIPE"
                  value={codeEquipe}
                  onChange={e => { setCodeEquipe(e.target.value.toUpperCase()); setCodeError(null); setCodeSuccess(false) }}
                  onKeyDown={e => e.key === 'Enter' && rejoindreEquipe()}
                />
                <button onClick={rejoindreEquipe} disabled={sendingCode || !codeEquipe.trim()}
                  style={{ background: '#4ade80', color: '#000', border: 'none', borderRadius: '10px', padding: '10px 20px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', opacity: codeEquipe.trim() ? 1 : 0.4 }}>
                  {sendingCode ? '...' : t('jeq_rejoindre_btn', lang)}
                </button>
              </div>
              {codeError && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px', margin: '8px 0 0' }}>⚠️ {codeError}</p>}
              {codeSuccess && <p style={{ color: '#4ade80', fontSize: '12px', marginTop: '8px', margin: '8px 0 0' }}>✅ {t('jeq_demande_envoyee', lang)}</p>}
            </div>

            {/* Mes affiliations */}
            {mesAffiliations.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{t('jeq_mes_educateurs', lang)}</p>
                {mesAffiliations.map(a => {
                  const pe = a.profil_educateur
                  const isAccepted = a.statut === 'accepte'
                  return (
                    <div key={a.id} style={{ background: '#1a1a1a', borderRadius: '16px', overflow: 'hidden', border: `1px solid ${isAccepted ? '#2a2a2a' : '#2a2a2a'}` }}>
                      {isAccepted ? (
                        <div style={{ background: 'linear-gradient(135deg, #14532d, #166534)', padding: '20px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px', color: '#052e16', flexShrink: 0 }}>
                            {pe?.prenom?.[0]}{pe?.nom?.[0]}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 'bold', fontSize: '17px' }}>{pe?.prenom} {pe?.nom}</div>
                            <div style={{ color: '#86efac', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[pe?.club, pe?.categorie, pe?.niveau_championnat].filter(Boolean).join(' · ')}</div>
                            <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              <span style={{ background: '#166534', border: '1px solid #22c55e', borderRadius: '20px', padding: '2px 10px', fontSize: '12px', color: '#22c55e' }}>
                                ✅ {t('profil_affilie', lang)}
                              </span>
                              {pe?.diplome && (
                                <span style={{ fontSize: '12px', color: '#86efac' }}>🎓 {pe.diplome}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#1a1a1a', border: '2px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, color: '#555', flexShrink: 0 }}>
                            {pe?.prenom?.[0]}{pe?.nom?.[0]}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{pe?.prenom} {pe?.nom}</p>
                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#555' }}>{pe?.club} · {pe?.categorie} · {pe?.niveau_championnat}</p>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                            background: a.statut === 'en_attente' ? '#f59e0b15' : '#ef444415',
                            color: a.statut === 'en_attente' ? '#f59e0b' : '#ef4444',
                            border: `1px solid ${a.statut === 'en_attente' ? '#f59e0b30' : '#ef444430'}` }}>
                            {a.statut === 'en_attente' ? '⏳ En attente' : '✕ Refusé'}
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
                              {statsLoading[a.id] ? '...' : '📊 Mes stats'}
                            </button>
                            <button
                              onClick={() => { setEduNote(a); setNoteCriteres({}); setNoteCommentaire(''); setNotePublic(true) }}
                              style={{ background: '#1f2937', color: 'white', border: '1px solid #374151', borderRadius: '10px', padding: '14px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>
                              ⭐ Évaluer
                            </button>
                          </div>

                          {/* Stats chargées */}
                          {statsJoueur[a.id] && (() => {
                            const s = statsJoueur[a.id]
                            const RankBadge = ({ rank, total }) => rank && total > 1 ? (
                              <span style={{ fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '8px', background: rank === 1 ? '#fbbf2420' : '#ffffff10', color: rank === 1 ? '#fbbf24' : '#555', marginLeft: '4px' }}>
                                #{rank}/{total}
                              </span>
                            ) : null
                            return (
                              <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                                {/* Stats match */}
                                <div>
                                  <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: '#60a5fa' }}>⚽ {t('aff_stats_match_titre', lang)}</p>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                                    {[
                                      { label: t('jp_matchs_joues', lang), value: s.matchsJoues, color: '#60a5fa', rank: s.rankMatchs },
                                      { label: t('comp_buts', lang), value: s.buts, color: '#4ade80', rank: s.rankButs },
                                      { label: t('club_passes_dec_emoji', lang), value: s.passes, color: '#a78bfa', rank: s.rankPasses },
                                      { label: t('jp_clean_sheets', lang), value: s.cleanSheets, color: '#34d399', rank: s.rankClean },
                                    ].map(stat => (
                                      <div key={stat.label} style={{ background: '#0a0a0a', borderRadius: '10px', padding: '10px 12px', border: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div>
                                          <p style={{ margin: 0, fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</p>
                                          <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <span style={{ fontSize: '20px', fontWeight: 800, color: stat.color }}>{stat.value}</span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '11px', color: '#60a5fa', background: '#60a5fa15', border: '1px solid #60a5fa30', padding: '2px 8px', borderRadius: '8px' }}>⏱ {s.minutesJouees} min</span>
                                    {s.jaunes > 0 && <span style={{ fontSize: '11px', color: '#f59e0b', background: '#f59e0b15', border: '1px solid #f59e0b30', padding: '2px 8px', borderRadius: '8px' }}>🟨 {s.jaunes}</span>}
                                    {s.rouges > 0 && <span style={{ fontSize: '11px', color: '#ef4444', background: '#ef444415', border: '1px solid #ef444430', padding: '2px 8px', borderRadius: '8px' }}>🟥 {s.rouges}</span>}
                                  </div>
                                </div>

                                {/* Présence + Points séance */}
                                <div>
                                  <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: '#fbbf24' }}>⭐ {t('aff_entrainement_titre', lang)}</p>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                                    {/* Taux de présence */}
                                    <div style={{ background: '#0a0a0a', borderRadius: '10px', padding: '10px 12px', border: '1px solid #1a1a1a' }}>
                                      <p style={{ margin: 0, fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('aff_taux_presence', lang)}</p>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '20px', fontWeight: 800, color: s.tauxPresence >= 80 ? '#4ade80' : s.tauxPresence >= 60 ? '#f59e0b' : '#ef4444' }}>
                                          {s.tauxPresence ?? '—'}%
                                        </span>
                                      </div>
                                      <span style={{ fontSize: '9px', color: '#333' }}>{s.present}/{s.total} {t('stats_seances_plural', lang)}</span>
                                    </div>
                                    {/* Points séance */}
                                    <div style={{ background: '#0a0a0a', borderRadius: '10px', padding: '10px 12px', border: '1px solid #fbbf2420' }}>
                                      <p style={{ margin: 0, fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('aff_points_seance', lang)}</p>
                                      <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span style={{ fontSize: '20px', fontWeight: 800, color: '#fbbf24' }}>{s.points}</span>
                                        <RankBadge rank={s.rankPoints?.rank} total={s.rankPoints?.total} />
                                      </div>
                                      {s.rankPoints?.rank === 1 && <span style={{ fontSize: '9px', color: '#fbbf24' }}>🏆 {t('aff_meilleur_equipe', lang)}</span>}
                                    </div>
                                  </div>
                                </div>

                                {/* Présence par mois */}
                                {s.presenceMensuelle?.length > 0 && (
                                  <div>
                                    <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: '#a78bfa' }}>📅 Présence par mois</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                      {s.presenceMensuelle.map(({ month, taux, present, total }) => {
                                        const [y, m] = month.split('-')
                                        const label = new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString(localeOf(lang), { month: 'short', year: '2-digit' })
                                        const color = taux >= 80 ? '#4ade80' : taux >= 60 ? '#f59e0b' : '#ef4444'
                                        return (
                                          <div key={month} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '10px', color: '#555', width: '40px', flexShrink: 0 }}>{label}</span>
                                            <div style={{ flex: 1, height: '6px', background: '#1a1a1a', borderRadius: '3px' }}>
                                              <div style={{ width: `${taux}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.5s' }} />
                                            </div>
                                            <span style={{ fontSize: '10px', fontWeight: 700, color, width: '32px', textAlign: 'right', flexShrink: 0 }}>{taux}%</span>
                                            <span style={{ fontSize: '9px', color: '#333', flexShrink: 0 }}>{present}/{total}</span>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Avis éducateur */}
                                <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 14, padding: '12px 16px' }}>
                                  <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 13 }}>📝 Avis de l'éducateur</p>
                                  {s.noteEdu ? (
                                    <>
                                      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                                        {[['Technique', s.noteEdu.technique], ['Physique', s.noteEdu.physique], ['Mental', s.noteEdu.mental], ['Tactique', s.noteEdu.tactique]].map(([label, note]) => note ? (
                                          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ fontSize: 11, color: '#555' }}>{label}</span>
                                            <span style={{ color: '#f59e0b', fontSize: 12 }}>{'★'.repeat(note)}{'☆'.repeat(5 - note)}</span>
                                          </div>
                                        ) : null)}
                                      </div>
                                      {s.noteEdu.commentaire && <p style={{ margin: '8px 0 0', fontSize: 11, color: '#555', fontStyle: 'italic' }}>"{s.noteEdu.commentaire}"</p>}
                                    </>
                                  ) : (
                                    <p style={{ margin: 0, fontSize: '11px', color: '#333', fontStyle: 'italic' }}>Pas encore de note partagée par ton éducateur.</p>
                                  )}
                                </div>

                                {/* Calendrier prochains matchs */}
                                <div>
                                  <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: '#34d399' }}>📅 Prochains matchs</p>
                                  {s.prochainMatchs?.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                      {s.prochainMatchs.map((m, i) => {
                                        const d = new Date(m.date)
                                        const label = d.toLocaleDateString(localeOf(lang), { weekday: 'short', day: 'numeric', month: 'short' })
                                        return (
                                          <div key={i} style={{ background: '#0a0a0a', borderRadius: '10px', padding: '10px 12px', border: '1px solid #1a1a1a' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                              <span style={{ fontSize: '10px', color: '#34d399', fontWeight: 700 }}>{label}{m.heure ? ` · ${m.heure}` : ''}</span>
                                              {m.competition && <span style={{ fontSize: '9px', color: '#444', background: '#1a1a1a', padding: '1px 6px', borderRadius: '6px' }}>{m.competition}</span>}
                                            </div>
                                            <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: 'white' }}>{m.equipe_domicile} <span style={{ color: '#333' }}>vs</span> {m.equipe_exterieur}</p>
                                            {m.lieu && <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#444' }}>📍 {m.lieu}</p>}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  ) : (
                                    <p style={{ margin: 0, fontSize: '11px', color: '#333', fontStyle: 'italic' }}>Aucun match programmé.</p>
                                  )}
                                </div>

                                {/* Classements internes */}
                                <div>
                                  <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: '#f97316' }}>🏅 Classements équipe</p>
                                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                    {[
                                      { key: 'buteurs', label: '⚽ Top buteurs', data: s.leaderButs },
                                      { key: 'passeurs', label: '🎯 Top passeurs', data: s.leaderPasses },
                                      { key: 'victoires', label: '🏆 Top victoires', data: s.leaderVictoires },
                                      { key: 'points', label: '⭐ Points séance', data: s.leaderPoints },
                                    ].map(c => (
                                      <button key={c.key} onClick={() => setClassementActif(c.key)}
                                        style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', background: classementActif === c.key ? '#4ade80' : '#0a0a0a', color: classementActif === c.key ? '#000' : '#555' }}>
                                        {c.label}
                                      </button>
                                    ))}
                                  </div>
                                  {(() => {
                                    const actif = { buteurs: s.leaderButs, passeurs: s.leaderPasses, victoires: s.leaderVictoires, points: s.leaderPoints }[classementActif] || []
                                    return (
                                      <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '10px', overflow: 'hidden' }}>
                                        {actif.length > 0 ? actif.map((row, i) => (
                                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderBottom: i < actif.length - 1 ? '1px solid #1a1a1a' : 'none', background: row.isMe ? '#4ade8010' : 'transparent' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 800, color: i < 3 ? '#4ade80' : '#555', minWidth: '18px' }}>{i + 1}</span>
                                            <span style={{ flex: 1, fontSize: '12px', fontWeight: row.isMe ? 800 : 400, color: row.isMe ? '#4ade80' : '#ccc', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{row.isMe ? 'Toi' : row.nom}</span>
                                            <span style={{ fontSize: '12px', fontWeight: 700, color: row.isMe ? '#4ade80' : '#888' }}>{row.val}</span>
                                          </div>
                                        )) : <p style={{ margin: 0, padding: '12px', fontSize: '11px', color: '#333' }}>—</p>}
                                      </div>
                                    )
                                  })()}
                                </div>

                                {/* Lien classement ligue */}
                                {s.ligueUrl && (
                                  <a href={s.ligueUrl} target="_blank" rel="noopener noreferrer"
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', borderRadius: '10px', border: '1px solid #fbbf2430', background: '#fbbf2410', color: '#fbbf24', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>
                                    🏆 {t('aff_classement_championnat', lang)}
                                  </a>
                                )}

                              </div>
                            )
                          })()}

                          {/* Joueur lié mais pas encore dans l'effectif */}
                          {!a.equipe_joueur_id && (
                            <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#444', fontStyle: 'italic' }}>
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
              <div style={{ textAlign: 'center', padding: '3rem', color: '#333', fontSize: '13px' }}>
                <p style={{ fontSize: '32px', marginBottom: '12px' }}>🏟️</p>
                <p>Tu n'es encore affilié à aucune équipe.<br/>Entre un code d'équipe pour commencer.</p>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Modal notation éducateur */}
      {eduNote && (
        <div onClick={() => setEduNote(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '20px', width: '100%', maxWidth: '640px', padding: '24px', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <p style={{ margin: '0 0 2px', fontWeight: 800, fontSize: '16px' }}>⭐ Évaluer {eduNote.profil_educateur?.prenom} {eduNote.profil_educateur?.nom}</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#555' }}>Ton évaluation est anonyme et aide à améliorer la qualité de l'encadrement.</p>
              </div>
              <button onClick={() => setEduNote(null)} style={{ background: 'none', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Saison */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', color: '#555', flexShrink: 0 }}>Saison évaluée :</label>
              <select value={noteSaison} onChange={e => setNoteSaison(e.target.value)}
                style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff', padding: '6px 10px', fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>
                {['2024-2025','2023-2024','2022-2023'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            {/* 6 catégories */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
              {CRITERES_EDU_KEYS.map(cat => (
                <div key={cat.key} style={{ background: '#111', borderRadius: '12px', padding: '14px', border: `1px solid ${cat.color}20` }}>
                  <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: '13px', color: cat.color }}>{cat.label}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {cat.criteres.map(c => (
                      <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ flex: 1, fontSize: '12px', color: '#aaa' }}>{c.label}</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {[1,2,3,4,5].map(n => (
                            <button key={n} onClick={() => setNoteCriteres(prev => ({ ...prev, [c.key]: n }))}
                              style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: (noteCriteres[c.key] || 0) >= n ? cat.color : '#2a2a2a', padding: '2px', lineHeight: 1 }}>
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
                style={{ width: '100%', background: '#111', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '13px', fontFamily: 'Inter, sans-serif', resize: 'vertical', minHeight: '80px', boxSizing: 'border-box' }} />
            </div>

            {/* Visibilité */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#aaa', marginBottom: '16px' }}>
              <input type="checkbox" checked={notePublic} onChange={e => setNotePublic(e.target.checked)} />
              Rendre mon commentaire public (visible par les recruteurs)
            </label>

            <button onClick={soumettreNoteEdu} disabled={savingNote || CRITERES_EDU_KEYS.flatMap(c => c.criteres).some(c => !noteCriteres[c.key])}
              style={{ width: '100%', background: '#4ade80', color: '#000', border: 'none', borderRadius: '12px', padding: '14px', fontWeight: 800, fontSize: '14px', cursor: 'pointer', opacity: CRITERES_EDU_KEYS.flatMap(c => c.criteres).every(c => noteCriteres[c.key]) ? 1 : 0.4 }}>
              {savingNote ? '⏳ Envoi...' : '✅ Soumettre l\'évaluation'}
            </button>
          </div>
        </div>
      )}

      {/* Modal profil recruteur */}
      {recruteurModal && (
        <div onClick={() => setRecruteurModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#111', border: '1px solid #222', borderRadius: '20px', padding: '2rem', maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                {recruteurModal.avatar_url
                  ? <img src={recruteurModal.avatar_url} alt="" style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #4ade8040' }} />
                  : <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#1a2e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800, color: '#4ade80' }}>
                      {(recruteurModal.prenom || '?')[0]}{(recruteurModal.nom || '?')[0]}
                    </div>
                }
                <div>
                  <h2 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 800 }}>{recruteurModal.prenom} {recruteurModal.nom}</h2>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {recruteurModal.type_recruteur && <span style={{ background: '#4ade8015', border: '1px solid #4ade8030', color: '#4ade80', fontSize: '11px', fontWeight: 700, padding: '2px 10px', borderRadius: '20px' }}>{recruteurModal.type_recruteur}</span>}
                    <BadgeNote cibleId={recruteurModal.id} />
                  </div>
                </div>
              </div>
              <button onClick={() => setRecruteurModal(null)} style={{ background: 'none', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1.5rem' }}>
              {recruteurModal.club && <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '10px 14px' }}><p style={{ margin: 0, fontSize: '11px', color: '#555' }}>🏟️ Club / Agence</p><p style={{ margin: '4px 0 0', fontWeight: 600, fontSize: '14px' }}>{recruteurModal.club}</p></div>}
              {recruteurModal.region && <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '10px 14px' }}><p style={{ margin: 0, fontSize: '11px', color: '#555' }}>📍 Région</p><p style={{ margin: '4px 0 0', fontWeight: 600, fontSize: '14px' }}>{recruteurModal.region}</p></div>}
            </div>

            {recruteurModal.description && (
              <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
                <p style={{ fontSize: '11px', color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px' }}>Présentation</p>
                <p style={{ fontSize: '13px', color: '#ccc', lineHeight: 1.6, margin: 0 }}>{recruteurModal.description}</p>
              </div>
            )}

            {recruteurModal.recherche_profil && (
              <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '14px' }}>
                <p style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px' }}>🔍 Ce qu'il recherche</p>
                <p style={{ fontSize: '13px', color: '#ccc', lineHeight: 1.6, margin: 0 }}>{recruteurModal.recherche_profil}</p>
              </div>
            )}

            {!recruteurModal.description && !recruteurModal.recherche_profil && (
              <p style={{ fontSize: '13px', color: '#444', textAlign: 'center', padding: '1rem 0' }}>Ce recruteur n'a pas encore complété son profil.</p>
            )}

            <button
              onClick={() => { setNotationCible(recruteurModal); setRecruteurModal(null) }}
              style={{ width: '100%', marginTop: '1rem', background: '#fbbf2415', border: '1px solid #fbbf2440', color: '#fbbf24', padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
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

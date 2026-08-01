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
import { useLang } from '../hooks/useLang'
import { t, LANGS, localeOf } from '../lib/translations'
import { STRIPE_LINKS_CLUB, CONTACT_EMAIL } from '../lib/stripeLinks'
const EQUIPES = ['A', 'B']

const ROLES_STAFF = [
  { val: 'president', label: 'Président' },
  { val: 'directeur_sportif', label: 'Directeur sportif' },
  { val: 'marketing', label: 'Marketing' },
  { val: 'secretaire', label: 'Secrétaire' },
]
const ROLE_STAFF_LABEL = (role) => ROLES_STAFF.find(r => r.val === role)?.label || role

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

function AccueilClub({ categories, educateursAcceptes, educateursEnAttente, joueursClub, matchsClub, setActiveCategorie, setActiveTab, lang }) {
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
      <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>🏠 {t('club_accueil', lang)}</h1>
      <p style={{ color: '#555', fontSize: '13px', marginBottom: '1.5rem' }}>{t('club_accueil_sous_titre', lang)}</p>

      {/* Widgets résumé */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '2rem' }}>
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' }}>
          <p style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px' }}>🎽 {t('club_licencies', lang)}</p>
          <p style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>{totalLicencies}</p>
          <p style={{ fontSize: '12px', color: '#555', margin: '4px 0 0' }}>{t('club_toutes_equipes', lang)}</p>
        </div>

        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' }}>
          <p style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px' }}>⚽ {t('club_equipes_actives', lang)}</p>
          <p style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>{nbEquipes}</p>
          <p style={{ fontSize: '12px', color: '#555', margin: '4px 0 0' }}>{nbEquipes > 1 ? t('club_categorie_plur', lang) : t('club_categorie_sing', lang)}</p>
        </div>

        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' }}>
          <p style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px' }}>👥 {t('club_tab_educateurs', lang)}</p>
          <p style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>{nbEducateurs}</p>
          <p style={{ fontSize: '12px', color: '#555', margin: '4px 0 0' }}>{nbEducateurs > 1 ? t('club_educateur_affilie_plur', lang) : t('club_educateur_affilie_sing', lang)}</p>
        </div>

        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' }}>
          <p style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px' }}>⏳ {t('club_demandes_affiliation', lang)}</p>
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
          <p style={{ fontWeight: 700, fontSize: '13px', margin: '0 0 12px' }}>⚽ {t('club_derniers_resultats', lang)}</p>
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
          <p style={{ fontWeight: 700, fontSize: '13px', margin: '0 0 12px' }}>📅 {t('club_prochains_matchs', lang)}</p>
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
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0, background: m.domicile ? '#4ade8020' : '#60a5fa20', color: m.domicile ? '#4ade80' : '#60a5fa', border: `1px solid ${m.domicile ? '#4ade8040' : '#60a5fa40'}` }}>
                      {m.domicile ? `🏠 ${t('comp_domicile', lang)}` : `🚌 ${t('club_deplacement', lang)}`}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' }}>
          <p style={{ fontWeight: 700, fontSize: '13px', margin: '0 0 12px' }}>🆕 {t('club_nouveaux_joueurs', lang)}</p>
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

export default function DashboardClub() {
  const navigate = useNavigate()
  const { lang, setLang } = useLang()
  const [club, setClub] = useState(null)
  const [clubId, setClubId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
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

  // Corrige la catégorie/onglet actifs si le rôle détecté ne peut pas voir le défaut
  // ('sportif' + 'categories' par défaut, ce qui exclut par ex. un rôle 'marketing').
  useEffect(() => {
    if (!monRole) return
    const sportifVisible = ['president', 'directeur_sportif'].includes(monRole)
    const administratifVisible = ['president', 'marketing', 'secretaire'].includes(monRole)
    if (activeCategorie === 'sportif' && !sportifVisible && administratifVisible) {
      setActiveCategorie('administratif')
      setActiveTab('sponsors')
    } else if (activeCategorie === 'administratif' && !administratifVisible && sportifVisible) {
      setActiveCategorie('sportif')
      setActiveTab('categories')
    }
  }, [monRole])

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

    await Promise.all([chargerCategories(resolvedClubId), chargerEducateurs(resolvedClubId), chargerAvisClub(resolvedClubId), chargerSeancesRecues(resolvedClubId), chargerStaff(resolvedClubId), chargerBudget(resolvedClubId), chargerAccueilData(resolvedClubId)])
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

  const categoriesVisibles = [
    { id: 'accueil', label: `🏠 ${t('club_accueil', lang)}`, defaultTab: 'accueil', visible: true },
    { id: 'sportif', label: `⚽ ${t('club_sportif', lang)}`, defaultTab: 'categories',
      visible: ['president', 'directeur_sportif'].includes(monRole) },
    { id: 'administratif', label: `🏢 ${t('club_administratif', lang)}`, defaultTab: 'sponsors',
      visible: ['president', 'marketing', 'secretaire'].includes(monRole) },
  ].filter(c => c.visible)

  return (
    <div style={st.page}>
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
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ margin: '0 0 4px', fontSize: '1.4rem', fontWeight: 800 }}>{club?.club || t('club_mon_club', lang)}</h1>
          <p style={{ margin: 0, color: '#555', fontSize: '13px' }}>{categories.length} {categories.length !== 1 ? t('club_categorie_plur', lang) : t('club_categorie_sing', lang)} · {educateursAcceptes.length} {educateursAcceptes.length !== 1 ? t('club_educateur_affilie_plur', lang) : t('club_educateur_affilie_sing', lang)}</p>
        </div>

        {/* Niveau 1 — SPORTIF / ADMINISTRATIF (filtré par rôle) */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          {categoriesVisibles.map(cat => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategorie(cat.id); setActiveTab(cat.defaultTab) }}
              style={{
                padding: '12px 28px', borderRadius: '10px', border: 'none',
                background: activeCategorie === cat.id ? '#4ade80' : '#1a1a1a',
                color: activeCategorie === cat.id ? '#000' : '#666',
                fontWeight: 800, fontSize: '13px', cursor: 'pointer', letterSpacing: '1px',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Niveau 2 — sous-onglets (pas de sous-onglets sur l'accueil) */}
        {activeCategorie !== 'accueil' && (
          <div style={st.tabs}>
            {(activeCategorie === 'sportif' ? [
              { id: 'categories', label: `📋 ${t('club_tab_categories', lang)}` },
              { id: 'classements', label: `🏆 ${t('club_tab_classements', lang)}` },
              { id: 'recrutement', label: `🔍 ${t('club_tab_recrutement', lang)}` },
              { id: 'educateurs', label: `👥 ${t('club_tab_educateurs', lang)}${educateursEnAttente.length ? ` (${educateursEnAttente.length})` : ''}` },
            ] : [
              { id: 'sponsors', label: `🤝 ${t('club_tab_sponsors', lang)}` },
              { id: 'deplacements', label: `🚌 ${t('nav_deplacements', lang)}` },
              { id: 'repartition_bus', label: '🧮 Répartition mini-bus' },
              { id: 'profil', label: `⭐ ${t('club_tab_profil', lang)}` },
              ...(['president', 'secretaire'].includes(monRole) ? [{ id: 'budget', label: `💰 ${t('club_tab_budget', lang)}` }] : []),
              ...(monRole === 'president' ? [{ id: 'staff', label: `👥 ${t('club_tab_staff', lang)}` }] : []),
            ]).map(tab => (
              <button key={tab.id} style={st.tab(activeTab === tab.id)} onClick={() => setActiveTab(tab.id)}>
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* ── ACCUEIL ── */}
        {activeTab === 'accueil' && (
          <AccueilClub
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
        {activeTab === 'categories' && (
          <>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'flex-end', gap: '10px', marginBottom: '1rem' }}>
              <button style={{ ...st.btnSecondary, width: isMobile ? '100%' : 'auto' }} onClick={autoAssignerJoueurs} disabled={autoAssignLoading}>
                {autoAssignLoading ? `⏳ ${t('club_assignation_cours', lang)}` : `⚡ ${t('club_auto_assigner', lang)}`}
              </button>
              <button style={{ ...st.btnSolid, width: isMobile ? '100%' : 'auto' }} onClick={() => setShowAddCategorie(true)}>{t('club_ajouter_categorie', lang)}</button>
            </div>

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
                            <button onClick={() => supprimerCategorie(c.id)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer' }}>✕</button>
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

        {/* ── ÉDUCATEURS ── */}
        {activeTab === 'educateurs' && (
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

        {activeTab === 'classements' && (() => {
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
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '1.5rem' }}>
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
                        <p style={{ fontSize: '13px', fontWeight: 700, color: '#60a5fa', marginBottom: '10px' }}>⚽ {t('club_derniers_resultats', lang)}</p>
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
        {activeTab === 'sponsors' && (
          <GestionSponsors clubId={clubId} saison={saisonActuelle} />
        )}
        {activeTab === 'deplacements' && (
          <Deplacements clubId={clubId} />
        )}
        {activeTab === 'repartition_bus' && (
          <RepartitionMiniBus clubId={clubId} />
        )}
        {activeTab === 'recrutement' && (
          <ScoutCenter userId={clubId} profil={club} embedded={true} />
        )}
        {activeTab === 'profil' && (() => {
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
                    <input style={st.input} value={profilClubEdit.club} onChange={e => setProfilClubEdit(p => ({ ...p, club: e.target.value }))} placeholder="Ex: AS Cannes" />
                  </div>
                  <div>
                    <label style={st.label}>{t('profil_region', lang)}</label>
                    <input style={st.input} value={profilClubEdit.region} onChange={e => setProfilClubEdit(p => ({ ...p, region: e.target.value }))} placeholder="Ex: Provence-Alpes-Côte d'Azur" />
                  </div>
                  <div>
                    <label style={st.label}>{t('seance_description', lang)}</label>
                    <textarea
                      style={{ ...st.input, minHeight: '100px', resize: 'vertical', fontFamily: 'Inter, sans-serif' }}
                      value={profilClubEdit.description}
                      onChange={e => setProfilClubEdit(p => ({ ...p, description: e.target.value }))}
                      placeholder={t('club_desc_placeholder', lang)}
                    />
                  </div>
                </div>
                <button onClick={sauvegarderProfilClub} disabled={savingProfilClub} style={{ ...st.btnSolid, marginTop: '16px' }}>
                  {savingProfilClub ? t('jp_enregistrement', lang) : `✓ ${t('btn_sauvegarder', lang)}`}
                </button>
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
        {activeTab === 'budget' && ['president', 'secretaire'].includes(monRole) && (() => {
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
                <button onClick={() => setBudgetFormOuvert(v => !v)}
                  style={{ background: '#4ade80', color: '#000', border: 'none', borderRadius: 10, padding: '9px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  {budgetFormOuvert ? `✕ ${t('btn_annuler', lang)}` : `+ ${t('btn_ajouter', lang)}`}
                </button>
              </div>

              {budgetFormOuvert && (
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
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
                      <button onClick={() => supprimerEntreeBudget(e.id)}
                        style={{ background: 'transparent', border: 'none', color: '#2a2a2a', cursor: 'pointer', fontSize: 16, padding: '4px 6px', borderRadius: 6, flexShrink: 0, transition: 'color 0.15s' }}
                        onMouseEnter={ev => ev.target.style.color = '#ef4444'}
                        onMouseLeave={ev => ev.target.style.color = '#2a2a2a'}
                        title={t('btn_supprimer', lang)}>✕</button>
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
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1.5rem' }}>
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

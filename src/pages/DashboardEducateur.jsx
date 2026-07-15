import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

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

// ── Normalise les en-têtes Excel vers nos champs ──────────────────────────────
const HEADER_MAP = {
  prenom: 'prenom', prénom: 'prenom', firstname: 'prenom', 'first name': 'prenom',
  nom: 'nom', lastname: 'nom', 'last name': 'nom',
  poste: 'poste', position: 'poste',
  categorie: 'categorie', catégorie: 'categorie', category: 'categorie',
  'numero maillot': 'numero_maillot', 'numéro maillot': 'numero_maillot', maillot: 'numero_maillot', numero: 'numero_maillot', '#': 'numero_maillot',
  'date naissance': 'date_naissance', 'date de naissance': 'date_naissance', ddn: 'date_naissance', birthdate: 'date_naissance',
  'numero licence': 'numero_licence', 'numéro licence': 'numero_licence', licence: 'numero_licence',
}

function parseRows(raw) {
  return raw
    .map(row => {
      const j = {}
      for (const [k, v] of Object.entries(row)) {
        const key = HEADER_MAP[k.toLowerCase().trim()]
        if (key && v !== undefined && v !== null && String(v).trim() !== '') {
          j[key] = String(v).trim()
        }
      }
      return j
    })
    .filter(j => j.prenom)
}

// ── Bar chart horizontal SVG ──────────────────────────────────────────────────
function BarChart({ data, color = '#4ade80', unit = '', max: forceMax }) {
  if (!data.length) return null
  const max = forceMax ?? Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '110px', fontSize: '12px', color: '#aaa', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.label}>{d.label}</div>
          <div style={{ flex: 1, background: '#1a1a1a', borderRadius: '4px', height: '22px', position: 'relative', overflow: 'hidden' }}>
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
  const r = size * 0.36, cx = size / 2, cy = size / 2
  const circ = 2 * Math.PI * r
  const fill = (value / max) * circ
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a1a1a" strokeWidth={size * 0.09} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={size * 0.09}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: 'stroke-dasharray 0.6s ease' }} />
        <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
          fontSize={size * 0.22} fontWeight="800" fill="#fff" fontFamily="Inter,sans-serif">{value || 0}</text>
        <text x={cx} y={cy + size * 0.2} textAnchor="middle"
          fontSize={size * 0.11} fill="#555" fontFamily="Inter,sans-serif">/{max}</text>
      </svg>
      <span style={{ fontSize: '11px', color: '#555', fontFamily: 'Inter,sans-serif', textAlign: 'center', fontWeight: 600 }}>{label}</span>
    </div>
  )
}

// ── Mini donut présence (anneau simple) ──────────────────────────────────────
function DonutPresence({ taux }) {
  const r = 16, circ = 2 * Math.PI * r
  const dash = (taux / 100) * circ
  const color = taux >= 80 ? '#4ade80' : taux >= 50 ? '#f59e0b' : '#f87171'
  return (
    <svg width="42" height="42" viewBox="0 0 42 42">
      <circle cx="21" cy="21" r={r} fill="none" stroke="#1a1a1a" strokeWidth="5" />
      <circle cx="21" cy="21" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 21 21)" />
      <text x="21" y="25" textAnchor="middle" fontSize="9" fontWeight="700" fill={color} fontFamily="Inter,sans-serif">{taux}%</text>
    </svg>
  )
}

// ── Camembert multi-segment (présence / absence / blessure / maladie / convoc) ─
function DonutMulti({ presents, absents, blesses, malade, convoque, size = 72 }) {
  const total = (presents || 0) + (absents || 0) + (blesses || 0) + (malade || 0) + (convoque || 0)
  const taux = total ? Math.round(((presents || 0) + (convoque || 0)) / total * 100) : 0
  const color = taux >= 80 ? '#4ade80' : taux >= 50 ? '#f59e0b' : '#f87171'
  if (!total) return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#333', fontSize: '10px', fontFamily: 'Inter,sans-serif' }}>—</span>
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
      <div style={{ position: 'absolute', inset: `${size * 0.18}px`, borderRadius: '50%', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <span style={{ fontSize: size * 0.19, fontWeight: 800, color, lineHeight: 1, fontFamily: 'Inter,sans-serif' }}>{taux}%</span>
      </div>
    </div>
  )
}

export default function DashboardEducateur() {
  const navigate = useNavigate()
  const [userId, setUserId] = useState(null)
  const [profil, setProfil] = useState(null)
  const [activeSection, setActiveSection] = useState('equipe')
  const [loading, setLoading] = useState(true)
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

  // Matchs
  const [matchs, setMatchs] = useState([])
  const [showAddMatch, setShowAddMatch] = useState(false)
  const [newMatch, setNewMatch] = useState({ date: '', adversaire: '', domicile: true, competition: '', score_nous: '', score_eux: '' })
  const [savingMatch, setSavingMatch] = useState(false)
  const [matchActif, setMatchActif] = useState(null)
  const [statsMatch, setStatsMatch] = useState({})

  // Entraînements
  const [entrainements, setEntrainements] = useState([])
  const [showAddEntrainement, setShowAddEntrainement] = useState(false)
  const [newEntrainement, setNewEntrainement] = useState({ date: '', description: '' })
  const [presences, setPresences] = useState({})
  const [entrainementActif, setEntrainementActif] = useState(null)
  const [showPlanificateur, setShowPlanificateur] = useState(false)
  const [planSaison, setPlanSaison] = useState({ joursActifs: [], dateDebut: '', dateFin: '', theme: '' })
  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [planProgress, setPlanProgress] = useState({ done: 0, total: 0 })

  // Notes / Évaluations
  const [notes, setNotes] = useState({})
  const [localNotes, setLocalNotes] = useState({}) // édition en cours par joueur_id
  const [savingNote, setSavingNote] = useState(false)

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/login'); return }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!p || p.plan !== 'educateur') { navigate('/'); return }
    setUserId(user.id)
    setProfil(p)
    await Promise.all([chargerJoueurs(user.id), chargerMatchs(user.id), chargerEntrainements(user.id), chargerNotes(user.id)])
    setLoading(false)
  }

  const chargerJoueurs = async (uid) => {
    const { data } = await supabase.from('equipe_joueurs').select('*').eq('educateur_id', uid).order('nom')
    setJoueurs(data || [])
  }

  const chargerMatchs = async (uid) => {
    const { data } = await supabase.from('matchs_equipe').select('*, stats_match(*)').eq('educateur_id', uid).order('date', { ascending: false })
    setMatchs(data || [])
  }

  const chargerEntrainements = async (uid) => {
    const { data } = await supabase.from('entrainements').select('*, presences_entrainement(*)').eq('educateur_id', uid).order('date', { ascending: false })
    setEntrainements(data || [])
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

  const getLocalNote = (joueurId) => localNotes[joueurId] || { technique: 0, physique: 0, mental: 0, tactique: 0, commentaire: '', visible_joueur: false }

  const setLocalNote = (joueurId, update) => {
    setLocalNotes(prev => ({ ...prev, [joueurId]: { ...getLocalNote(joueurId), ...update } }))
  }

  const ajouterJoueur = async () => {
    if (!newJoueur.prenom || !newJoueur.nom) return
    setSavingJoueur(true)
    await supabase.from('equipe_joueurs').insert({ ...newJoueur, educateur_id: userId })
    await chargerJoueurs(userId)
    setNewJoueur({ prenom: '', nom: '', poste: '', categorie: '', numero_maillot: '', date_naissance: '', numero_licence: '' })
    setShowAddJoueur(false)
    setSavingJoueur(false)
  }

  const supprimerJoueur = async (id) => {
    if (!confirm('Supprimer ce joueur ?')) return
    await supabase.from('equipe_joueurs').delete().eq('id', id)
    setJoueurs(prev => prev.filter(j => j.id !== id))
    if (joueurActif?.id === id) setJoueurActif(null)
  }

  const sauvegarderJoueur = async () => {
    if (!joueurEnEdition) return
    setSavingEdit(true)
    const { id, ...fields } = joueurEnEdition
    await supabase.from('equipe_joueurs').update(fields).eq('id', id)
    await chargerJoueurs(userId)
    setJoueurEnEdition(null)
    setSavingEdit(false)
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
    for (const row of importPreview.rows) {
      await supabase.from('equipe_joueurs').insert({ ...row, educateur_id: userId })
      done++
      setImportPreview(prev => ({ ...prev, done }))
    }
    await chargerJoueurs(userId)
    setImportPreview(null)
  }

  const ajouterMatch = async () => {
    if (!newMatch.adversaire || !newMatch.date) return
    setSavingMatch(true)
    await supabase.from('matchs_equipe').insert({ ...newMatch, educateur_id: userId, domicile: newMatch.domicile })
    await chargerMatchs(userId)
    setNewMatch({ date: '', adversaire: '', domicile: true, competition: '', score_nous: '', score_eux: '' })
    setShowAddMatch(false)
    setSavingMatch(false)
  }

  const sauvegarderStatsMatch = async (matchId) => {
    const entries = Object.entries(statsMatch[matchId] || {})
    for (const [joueurId, s] of entries) {
      await supabase.from('stats_match').upsert({
        match_id: matchId, joueur_id: joueurId, educateur_id: userId,
        minutes: s.minutes || 0, buts: s.buts || 0, passes_dec: s.passes_dec || 0,
        clean_sheet: s.clean_sheet || false, carton_jaune: s.carton_jaune || false, carton_rouge: s.carton_rouge || false
      }, { onConflict: 'match_id,joueur_id' })
    }
    await chargerMatchs(userId)
    setMatchActif(null)
    setStatsMatch({})
  }

  const ajouterEntrainement = async () => {
    if (!newEntrainement.date) return
    await supabase.from('entrainements').insert({ ...newEntrainement, educateur_id: userId })
    await chargerEntrainements(userId)
    setNewEntrainement({ date: '', description: '' })
    setShowAddEntrainement(false)
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
    present:  { label: 'Présent',   emoji: '✅', bg: '#4ade8015', border: '#4ade8040', color: '#4ade80' },
    absent:   { label: 'Absent',    emoji: '❌', bg: '#ef444415', border: '#ef444440', color: '#ef4444' },
    blesse:   { label: 'Blessé',    emoji: '🤕', bg: '#f9731615', border: '#f9731640', color: '#f97316' },
    malade:   { label: 'Malade',    emoji: '🤒', bg: '#a855f715', border: '#a855f740', color: '#a855f7' },
    convoque: { label: 'Convoqué',  emoji: '🏆', bg: '#60a5fa15', border: '#60a5fa40', color: '#60a5fa' },
  }

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

  const sauvegarderNote = async (joueurId, noteData) => {
    setSavingNote(true)
    await supabase.from('notes_joueurs').upsert(
      { joueur_id: joueurId, educateur_id: userId, ...noteData },
      { onConflict: 'joueur_id,educateur_id' }
    )
    await chargerNotes(userId)
    setSavingNote(false)
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
  const statsGlobalesJoueur = (joueurId) => {
    const allStats = matchs.flatMap(m => (m.stats_match || []).filter(s => s.joueur_id === joueurId))
    return {
      matchs: allStats.filter(s => s.minutes > 0).length,
      minutes: allStats.reduce((s, r) => s + (r.minutes || 0), 0),
      buts: allStats.reduce((s, r) => s + (r.buts || 0), 0),
      passes_dec: allStats.reduce((s, r) => s + (r.passes_dec || 0), 0),
      clean_sheets: allStats.filter(s => s.clean_sheet).length,
      cartons_j: allStats.filter(s => s.carton_jaune).length,
      cartons_r: allStats.filter(s => s.carton_rouge).length,
    }
  }

  const tauxPresence = (joueurId) => {
    // Seulement les séances où la présence a été effectivement saisie
    // (row existe ET a un statut intentionnel, pas juste la valeur par défaut vide)
    const saisies = entrainements.filter(e =>
      (e.presences_entrainement || []).some(p => p.joueur_id === joueurId && (p.statut || p.present))
    )
    if (!saisies.length) return null
    const getStatut = (e) => {
      const p = (e.presences_entrainement || []).find(p => p.joueur_id === joueurId)
      return p?.statut || (p?.present ? 'present' : 'absent')
    }
    const presents  = saisies.filter(e => getStatut(e) === 'present').length
    const convoque  = saisies.filter(e => getStatut(e) === 'convoque').length
    const absents   = saisies.filter(e => getStatut(e) === 'absent').length
    const blesses   = saisies.filter(e => getStatut(e) === 'blesse').length
    const malade    = saisies.filter(e => getStatut(e) === 'malade').length
    const total     = saisies.length
    return { taux: Math.round(((presents + convoque) / total) * 100), presents, convoque, absents, blesses, malade, total }
  }

  const postes = ['Gardien', 'Défenseur central', 'Latéral droit', 'Latéral gauche', 'Milieu défensif', 'Milieu central', 'Milieu offensif', 'Ailier droit', 'Ailier gauche', 'Attaquant']

  const st = {
    input: { width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff', padding: '9px 12px', fontSize: '13px', boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif' },
    label: { fontSize: '11px', color: '#555', marginBottom: '4px', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
    card: { background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' },
    btn: (color = '#4ade80') => ({ background: color + '15', border: `1px solid ${color}40`, color, padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }),
    btnSolid: { background: '#4ade80', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#4ade80', fontFamily: 'Inter, sans-serif' }}>Chargement...</p>
    </div>
  )

  const tabs = [
    { key: 'equipe', label: '👥 Mon équipe' },
    { key: 'stats', label: '📊 Stats joueurs' },
    { key: 'matchs', label: '⚽ Matchs & Classement' },
    { key: 'entrainements', label: '🏃 Entraînements' },
    { key: 'notes', label: '📝 Évaluations' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'Inter, sans-serif' }}>

      {/* NAV */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', borderBottom: '1px solid #1a1a1a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '18px', fontWeight: 700 }}>Digital<span style={{ color: '#4ade80' }}>Football</span></span>
          <span style={{ background: '#4ade8020', color: '#4ade80', fontSize: '11px', fontWeight: 700, padding: '2px 10px', borderRadius: '20px' }}>Éducateur</span>
          {profil?.club && <span style={{ fontSize: '13px', color: '#555' }}>· {profil.club}</span>}
        </div>
        <button onClick={() => { supabase.auth.signOut(); navigate('/') }}
          style={{ background: 'transparent', color: '#555', border: '1px solid #222', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
          Déconnexion
        </button>
      </nav>

      {/* TABS */}
      <div style={{ borderBottom: '1px solid #1a1a1a', padding: '0 2rem', display: 'flex', gap: '4px', overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveSection(tab.key)}
            style={{ background: 'transparent', border: 'none', borderBottom: activeSection === tab.key ? '2px solid #4ade80' : '2px solid transparent', color: activeSection === tab.key ? '#4ade80' : '#555', padding: '14px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif' }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem' }}>

        {/* ===== MON ÉQUIPE ===== */}
        {activeSection === 'equipe' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>Mon équipe</h1>
                <p style={{ color: '#555', fontSize: '13px', margin: '4px 0 0' }}>{joueurs.length} joueur{joueurs.length > 1 ? 's' : ''} dans l'effectif</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Toggle vue */}
                <div style={{ display: 'flex', background: '#1a1a1a', borderRadius: '8px', padding: '3px', gap: '2px' }}>
                  {[['poste','⊞ Postes'],['liste','☰ Liste']].map(([v, label]) => (
                    <button key={v} onClick={() => setVueEquipe(v)}
                      style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif', background: vueEquipe === v ? '#4ade80' : 'transparent', color: vueEquipe === v ? '#000' : '#555', transition: 'all 0.15s' }}>
                      {label}
                    </button>
                  ))}
                </div>
                <button onClick={telechargerTemplate} style={st.btn('#60a5fa')} title="Télécharger un modèle Excel/CSV">📥 Template</button>
                <button onClick={() => importRef.current?.click()} style={st.btn('#a78bfa')}>📂 Importer Excel/CSV</button>
                <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleImportFile} />
                <button onClick={() => setShowAddJoueur(true)} style={st.btnSolid}>+ Ajouter un joueur</button>
              </div>
            </div>

            {/* ── Modal profil joueur ── */}
            {joueurProfil && (() => {
              const j = joueurProfil
              const tx = tauxPresence(j.id)
              const s = statsGlobalesJoueur(j.id)
              const ln = getLocalNote(j.id)
              const age = j.date_naissance ? Math.floor((new Date() - new Date(j.date_naissance)) / (365.25 * 24 * 3600 * 1000)) : null
              const noteGlobale = (ln.technique || ln.physique || ln.mental || ln.tactique)
                ? ((ln.technique + ln.physique + ln.mental + ln.tactique) / 4).toFixed(1) : null
              const posColor = j.poste?.toLowerCase().includes('gardien') ? '#f59e0b' : j.poste && ['défenseur','defenseur','latéral','lateral'].some(k => j.poste.toLowerCase().includes(k)) ? '#60a5fa' : j.poste?.toLowerCase().includes('milieu') ? '#a78bfa' : '#4ade80'
              return (
                <div style={{ position: 'fixed', inset: 0, background: '#000000cc', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setJoueurProfil(null)}>
                  <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '20px', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>

                    {/* Header */}
                    <div style={{ background: `linear-gradient(135deg, ${posColor}15, transparent)`, borderBottom: '1px solid #1a1a1a', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: posColor + '25', border: `2px solid ${posColor}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: posColor, fontWeight: 800, fontSize: '20px', flexShrink: 0 }}>
                        {j.numero_maillot || `${j.prenom?.[0] || ''}${j.nom?.[0] || ''}`}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>{j.prenom} {j.nom}</h2>
                        <p style={{ margin: '4px 0 0', color: posColor, fontSize: '13px', fontWeight: 600 }}>{j.poste || '—'}{age ? ` · ${age} ans` : ''}{j.categorie ? ` · ${j.categorie}` : ''}</p>
                        {j.numero_licence && <span style={{ fontSize: '11px', color: '#60a5fa', background: '#60a5fa15', padding: '2px 8px', borderRadius: '10px', marginTop: '4px', display: 'inline-block' }}>🪪 Licencié {j.numero_licence}</span>}
                      </div>
                      {noteGlobale && <div style={{ textAlign: 'center' }}><p style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#fbbf24' }}>{noteGlobale}</p><p style={{ margin: 0, fontSize: '10px', color: '#555' }}>NOTE ÉDU.</p></div>}
                      <button onClick={() => setJoueurProfil(null)} style={{ background: 'none', border: 'none', color: '#555', fontSize: '22px', cursor: 'pointer', padding: '4px', flexShrink: 0 }}>✕</button>
                    </div>

                    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                      {/* Présence - Donut multi + stats */}
                      <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' }}>
                        <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: '14px' }}>🏃 Présence aux entraînements</p>
                        {tx ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                            <DonutMulti presents={tx.presents} absents={tx.absents} blesses={tx.blesses} malade={tx.malade} convoque={tx.convoque} size={110} />
                            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              {[
                                { emoji: '✅', label: 'Présent', val: tx.presents, color: '#4ade80' },
                                { emoji: '🏆', label: 'Convoqué', val: tx.convoque, color: '#60a5fa' },
                                { emoji: '❌', label: 'Absent', val: tx.absents, color: '#ef4444' },
                                { emoji: '🤕', label: 'Blessé', val: tx.blesses, color: '#f97316' },
                                { emoji: '🤒', label: 'Malade', val: tx.malade, color: '#a855f7' },
                                { emoji: '📅', label: 'Séances', val: tx.total, color: '#fff' },
                              ].map(s => (
                                <div key={s.label} style={{ background: '#0a0a0a', borderRadius: '8px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12px', color: '#555' }}>{s.emoji} {s.label}</span>
                                  <span style={{ fontWeight: 700, color: s.color, fontSize: '14px' }}>{s.val}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : <p style={{ color: '#333', fontSize: '13px', margin: 0 }}>Aucune présence saisie pour ce joueur.</p>}
                      </div>

                      {/* Évaluations - Radial skills */}
                      {(ln.technique || ln.physique || ln.mental || ln.tactique) ? (
                        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' }}>
                          <p style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '14px' }}>⭐ Évaluation éducateur</p>
                          <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '12px' }}>
                            <RadialSkill value={ln.technique} color="#4ade80" label="Technique" size={90} />
                            <RadialSkill value={ln.physique} color="#60a5fa" label="Physique" size={90} />
                            <RadialSkill value={ln.mental} color="#a78bfa" label="Mental" size={90} />
                            <RadialSkill value={ln.tactique} color="#fbbf24" label="Tactique" size={90} />
                          </div>
                          {ln.commentaire && <p style={{ margin: '14px 0 0', fontSize: '13px', color: '#aaa', background: '#0a0a0a', borderRadius: '8px', padding: '10px 14px', fontStyle: 'italic' }}>"{ln.commentaire}"</p>}
                        </div>
                      ) : null}

                      {/* Stats matchs */}
                      {s.matchs > 0 && (
                        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' }}>
                          <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: '14px' }}>⚽ Stats matchs</p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '8px' }}>
                            {[
                              { label: 'Matchs', val: s.matchs, color: '#fff' },
                              { label: 'Minutes', val: `${s.minutes}'`, color: '#fff' },
                              { label: 'Buts', val: s.buts, color: '#4ade80' },
                              { label: 'Passes D.', val: s.passes_dec, color: '#60a5fa' },
                              { label: 'Clean S.', val: s.clean_sheets, color: '#a78bfa' },
                              { label: '🟨', val: s.cartons_j, color: '#f59e0b' },
                              { label: '🟥', val: s.cartons_r, color: '#ef4444' },
                            ].map(c => (
                              <div key={c.label} style={{ background: '#0a0a0a', borderRadius: '8px', padding: '10px 8px', textAlign: 'center' }}>
                                <p style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: c.color }}>{c.val}</p>
                                <p style={{ margin: '3px 0 0', fontSize: '10px', color: '#555', textTransform: 'uppercase' }}>{c.label}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => { setJoueurEnEdition({ ...j }); setJoueurProfil(null) }} style={{ background: '#4ade8015', border: '1px solid #4ade8030', color: '#4ade80', padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>✏️ Modifier les infos</button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* ── Modal édition joueur ── */}
            {joueurEnEdition && (
              <div style={{ position: 'fixed', inset: 0, background: '#000000aa', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '520px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: '16px' }}>✏️ Modifier {joueurEnEdition.prenom} {joueurEnEdition.nom}</p>
                    <button onClick={() => setJoueurEnEdition(null)} style={{ background: 'none', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div><label style={st.label}>Prénom</label><input style={st.input} value={joueurEnEdition.prenom || ''} onChange={e => setJoueurEnEdition(p => ({ ...p, prenom: e.target.value }))} /></div>
                    <div><label style={st.label}>Nom</label><input style={st.input} value={joueurEnEdition.nom || ''} onChange={e => setJoueurEnEdition(p => ({ ...p, nom: e.target.value }))} /></div>
                    <div>
                      <label style={st.label}>Poste</label>
                      <select style={st.input} value={joueurEnEdition.poste || ''} onChange={e => setJoueurEnEdition(p => ({ ...p, poste: e.target.value }))}>
                        <option value="">— Choisir —</option>
                        {postes.map(po => <option key={po}>{po}</option>)}
                      </select>
                    </div>
                    <div><label style={st.label}>N° maillot</label><input style={st.input} type="number" value={joueurEnEdition.numero_maillot || ''} onChange={e => setJoueurEnEdition(p => ({ ...p, numero_maillot: e.target.value }))} /></div>
                    <div><label style={st.label}>Date de naissance</label><input style={st.input} type="date" value={joueurEnEdition.date_naissance || ''} onChange={e => setJoueurEnEdition(p => ({ ...p, date_naissance: e.target.value }))} /></div>
                    <div><label style={st.label}>Catégorie</label><input style={st.input} placeholder="U17, U18..." value={joueurEnEdition.categorie || ''} onChange={e => setJoueurEnEdition(p => ({ ...p, categorie: e.target.value }))} /></div>
                    <div style={{ gridColumn: '1 / -1' }}><label style={st.label}>N° licence FFF</label><input style={st.input} placeholder="Numéro de licence" value={joueurEnEdition.numero_licence || ''} onChange={e => setJoueurEnEdition(p => ({ ...p, numero_licence: e.target.value }))} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={sauvegarderJoueur} disabled={savingEdit} style={st.btnSolid}>{savingEdit ? 'Sauvegarde...' : '💾 Sauvegarder'}</button>
                    <button onClick={() => setJoueurEnEdition(null)} style={st.btn('#666')}>Annuler</button>
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
                    <p style={{ margin: 0, fontWeight: 700, color: '#a78bfa', fontSize: '15px' }}>📂 {importPreview.rows.length} joueur{importPreview.rows.length > 1 ? 's' : ''} détecté{importPreview.rows.length > 1 ? 's' : ''}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#555' }}>Vérifie les données avant d'importer</p>
                  </div>
                  {!importPreview.importing && (
                    <button onClick={() => setImportPreview(null)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '18px' }}>✕</button>
                  )}
                </div>

                {/* Table de prévisualisation */}
                <div style={{ overflow: 'auto', marginBottom: '1rem', maxHeight: '260px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                        {['Prénom', 'Nom', 'Poste', 'Catégorie', 'Maillot', 'Naissance', 'Licence'].map(h => (
                          <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: '#555', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.rows.map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #1a1a1a', background: i < importPreview.done ? '#4ade8008' : 'transparent' }}>
                          <td style={{ padding: '7px 10px', fontWeight: 600, color: i < importPreview.done ? '#4ade80' : '#fff' }}>{r.prenom}</td>
                          <td style={{ padding: '7px 10px', color: i < importPreview.done ? '#4ade80' : '#fff' }}>{r.nom}</td>
                          <td style={{ padding: '7px 10px', color: '#aaa' }}>{r.poste || '—'}</td>
                          <td style={{ padding: '7px 10px', color: '#aaa' }}>{r.categorie || '—'}</td>
                          <td style={{ padding: '7px 10px', color: '#aaa' }}>{r.numero_maillot || '—'}</td>
                          <td style={{ padding: '7px 10px', color: '#aaa' }}>{r.date_naissance || '—'}</td>
                          <td style={{ padding: '7px 10px', color: '#aaa' }}>{r.numero_licence || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {importPreview.importing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ flex: 1, background: '#1a1a1a', borderRadius: '6px', height: '8px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#4ade80', width: `${(importPreview.done / importPreview.rows.length) * 100}%`, transition: 'width 0.3s', borderRadius: '6px' }} />
                    </div>
                    <span style={{ fontSize: '13px', color: '#4ade80', fontWeight: 700, flexShrink: 0 }}>{importPreview.done}/{importPreview.rows.length}</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={confirmerImport} style={st.btnSolid}>✅ Importer {importPreview.rows.length} joueur{importPreview.rows.length > 1 ? 's' : ''}</button>
                    <button onClick={() => setImportPreview(null)} style={st.btn('#666')}>Annuler</button>
                  </div>
                )}
              </div>
            )}

            {showAddJoueur && (
              <div style={{ ...st.card, border: '1px solid #4ade8030', marginBottom: '1.5rem' }}>
                <p style={{ fontWeight: 700, marginBottom: '1rem', color: '#4ade80' }}>Nouveau joueur</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
                  <div><label style={st.label}>Prénom *</label><input style={st.input} value={newJoueur.prenom} onChange={e => setNewJoueur({ ...newJoueur, prenom: e.target.value })} /></div>
                  <div><label style={st.label}>Nom *</label><input style={st.input} value={newJoueur.nom} onChange={e => setNewJoueur({ ...newJoueur, nom: e.target.value })} /></div>
                  <div><label style={st.label}>N° maillot</label><input style={st.input} type="number" value={newJoueur.numero_maillot} onChange={e => setNewJoueur({ ...newJoueur, numero_maillot: e.target.value })} /></div>
                  <div>
                    <label style={st.label}>Poste</label>
                    <select style={st.input} value={newJoueur.poste} onChange={e => setNewJoueur({ ...newJoueur, poste: e.target.value })}>
                      <option value="">— Choisir —</option>
                      {postes.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div><label style={st.label}>Date de naissance</label><input style={st.input} type="date" value={newJoueur.date_naissance} onChange={e => setNewJoueur({ ...newJoueur, date_naissance: e.target.value })} /></div>
                  <div><label style={st.label}>Licence FFF</label><input style={st.input} placeholder="N° de licence" value={newJoueur.numero_licence} onChange={e => setNewJoueur({ ...newJoueur, numero_licence: e.target.value })} /></div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={ajouterJoueur} disabled={savingJoueur || !newJoueur.prenom || !newJoueur.nom} style={st.btnSolid}>{savingJoueur ? 'Ajout...' : 'Ajouter'}</button>
                  <button onClick={() => setShowAddJoueur(false)} style={st.btn('#666')}>Annuler</button>
                </div>
              </div>
            )}

            {joueurs.length === 0 ? (
              <div style={{ ...st.card, textAlign: 'center', padding: '4rem' }}>
                <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</p>
                <p style={{ color: '#555' }}>Aucun joueur dans l'effectif. Commence par en ajouter un !</p>
              </div>
            ) : vueEquipe === 'liste' ? (
              <div style={{ ...st.card, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                      {['#', 'Joueur', 'Poste', 'Âge', 'Licence', ''].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#555', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
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
                        const posColor = j.poste?.toLowerCase().includes('gardien') ? '#f59e0b' : j.poste && ['défenseur','defenseur','latéral','lateral'].some(k => j.poste.toLowerCase().includes(k)) ? '#60a5fa' : j.poste?.toLowerCase().includes('milieu') ? '#a78bfa' : j.poste && ['attaquant','ailier'].some(k => j.poste.toLowerCase().includes(k)) ? '#4ade80' : '#555'
                        return (
                          <tr key={j.id} style={{ borderBottom: '1px solid #0f0f0f' }}>
                            <td style={{ padding: '10px 12px', color: '#555', fontWeight: 700, width: '36px' }}>{j.numero_maillot || '—'}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 700 }}>{j.prenom} {j.nom}</td>
                            <td style={{ padding: '10px 12px' }}><span style={{ color: posColor, fontSize: '12px' }}>{j.poste || '—'}</span></td>
                            <td style={{ padding: '10px 12px', color: '#555', fontSize: '12px' }}>{age ? `${age} ans` : '—'}</td>
                            <td style={{ padding: '10px 12px' }}>{j.numero_licence ? <span style={{ color: '#60a5fa', fontSize: '11px', fontWeight: 700 }}>🪪</span> : <span style={{ color: '#333', fontSize: '11px' }}>—</span>}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                <button onClick={() => setJoueurProfil(j)} style={{ background: '#4ade8015', border: '1px solid #4ade8030', color: '#4ade80', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'Inter,sans-serif' }}>👤 Profil</button>
                                <button onClick={() => setJoueurEnEdition({ ...j })} style={{ background: '#ffffff08', border: '1px solid #2a2a2a', color: '#aaa', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', fontSize: '12px' }}>✏️</button>
                                <button onClick={() => supprimerJoueur(j.id)} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: '14px' }}>✕</button>
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
                  { label: '🧤 Gardiens', color: '#f59e0b', match: p => p?.toLowerCase().includes('gardien') },
                  { label: '🛡️ Défenseurs', color: '#60a5fa', match: p => p && ['défenseur','defenseur','latéral','lateral'].some(k => p.toLowerCase().includes(k)) },
                  { label: '⚙️ Milieux', color: '#a78bfa', match: p => p?.toLowerCase().includes('milieu') },
                  { label: '⚡ Attaquants', color: '#4ade80', match: p => p && ['attaquant','ailier'].some(k => p.toLowerCase().includes(k)) },
                  { label: '❓ Sans poste', color: '#555', match: p => !p || !['gardien','défenseur','defenseur','latéral','lateral','milieu','attaquant','ailier'].some(k => p.toLowerCase().includes(k)) },
                ].map(groupe => {
                  const groupJoueurs = joueurs.filter(j => groupe.match(j.poste))
                  if (!groupJoueurs.length) return null
                  return (
                    <div key={groupe.label}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: groupe.color }}>{groupe.label}</h2>
                        <span style={{ fontSize: '12px', color: '#444', background: '#1a1a1a', padding: '2px 8px', borderRadius: '20px' }}>{groupJoueurs.length} joueur{groupJoueurs.length > 1 ? 's' : ''}</span>
                        <div style={{ flex: 1, height: '1px', background: groupe.color + '20' }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                        {groupJoueurs.map(j => {
                          const age = j.date_naissance ? Math.floor((new Date() - new Date(j.date_naissance)) / (365.25 * 24 * 3600 * 1000)) : null
                          const tx = tauxPresence(j.id)
                          return (
                            <div key={j.id} style={{ ...st.card, cursor: 'pointer', borderLeft: `3px solid ${groupe.color}30`, transition: 'border-color 0.2s', borderColor: joueurActif?.id === j.id ? groupe.color + '60' : undefined }} onClick={() => setJoueurActif(joueurActif?.id === j.id ? null : j)}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: groupe.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', color: groupe.color, fontWeight: 800, fontSize: '13px', flexShrink: 0 }}>
                                  {j.numero_maillot || `${j.prenom?.[0] || ''}${j.nom?.[0] || ''}`}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{j.prenom} {j.nom}</p>
                                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#555' }}>{j.poste || '—'}{age ? ` · ${age} ans` : ''}</p>
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button onClick={e => { e.stopPropagation(); setJoueurEnEdition({ ...j }) }} style={{ background: '#4ade8015', border: '1px solid #4ade8030', color: '#4ade80', borderRadius: '6px', padding: '3px 7px', cursor: 'pointer', fontSize: '11px' }}>✏️</button>
                                  <button onClick={e => { e.stopPropagation(); supprimerJoueur(j.id) }} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: '14px', padding: '4px' }}>✕</button>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                {j.numero_licence && <span style={{ background: '#1a2e4a', border: '1px solid #3b82f630', color: '#60a5fa', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px' }}>🪪</span>}
                                <button onClick={e => { e.stopPropagation(); setJoueurProfil(j) }} style={{ background: groupe.color + '15', border: `1px solid ${groupe.color}30`, color: groupe.color, borderRadius: '6px', padding: '3px 9px', cursor: 'pointer', fontSize: '11px', fontWeight: 600, fontFamily: 'Inter,sans-serif' }}>👤 Profil</button>
                              </div>
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
              <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>Stats joueurs</h1>
            </div>

            {/* Sous-onglets */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem', borderBottom: '1px solid #1a1a1a', paddingBottom: '0' }}>
              {[['tableau','📋 Tableau'],['classement','🏆 Classement'],['graphiques','📈 Graphiques'],['presence','🏃 Présences']].map(([k, label]) => (
                <button key={k} onClick={() => setStatsSubTab(k)} style={{ background: 'transparent', border: 'none', borderBottom: statsSubTab === k ? '2px solid #4ade80' : '2px solid transparent', color: statsSubTab === k ? '#4ade80' : '#555', padding: '10px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>{label}</button>
              ))}
            </div>

            {joueurs.length === 0 ? (
              <div style={{ ...st.card, textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: '#555' }}>Ajoute d'abord des joueurs dans "Mon équipe"</p>
              </div>
            ) : (
              <>
                {/* ─ Tableau ─ */}
                {statsSubTab === 'tableau' && (
                  <div style={{ ...st.card, overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                          {['Joueur', 'Poste', 'MJ', 'Min', 'Buts', 'Passes D.', 'CS', '🟨', '🟥', 'Présence'].map(h => (
                            <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#555', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {joueurs.map(j => {
                          const s = statsGlobalesJoueur(j.id)
                          const tx = tauxPresence(j.id)
                          return (
                            <tr key={j.id} style={{ borderBottom: '1px solid #141414' }}>
                              <td style={{ padding: '10px 12px', fontWeight: 700 }}>{j.prenom} {j.nom}</td>
                              <td style={{ padding: '10px 12px', color: '#555', fontSize: '12px' }}>{j.poste || '—'}</td>
                              <td style={{ padding: '10px 12px', color: s.matchs > 0 ? '#fff' : '#333' }}>{s.matchs}</td>
                              <td style={{ padding: '10px 12px', color: s.minutes > 0 ? '#fff' : '#333' }}>{s.minutes}'</td>
                              <td style={{ padding: '10px 12px', color: s.buts > 0 ? '#4ade80' : '#333', fontWeight: s.buts > 0 ? 700 : 400 }}>{s.buts}</td>
                              <td style={{ padding: '10px 12px', color: s.passes_dec > 0 ? '#60a5fa' : '#333', fontWeight: s.passes_dec > 0 ? 700 : 400 }}>{s.passes_dec}</td>
                              <td style={{ padding: '10px 12px', color: s.clean_sheets > 0 ? '#4ade80' : '#333' }}>{s.clean_sheets}</td>
                              <td style={{ padding: '10px 12px', color: s.cartons_j > 0 ? '#f59e0b' : '#333' }}>{s.cartons_j}</td>
                              <td style={{ padding: '10px 12px', color: s.cartons_r > 0 ? '#f87171' : '#333' }}>{s.cartons_r}</td>
                              <td style={{ padding: '10px 12px' }}>
                                {tx !== null
                                  ? <span style={{ color: tx.taux >= 80 ? '#4ade80' : tx.taux >= 50 ? '#f59e0b' : '#f87171', fontWeight: 700 }}>{tx.taux}%</span>
                                  : <span style={{ color: '#333' }}>—</span>}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ─ Classement ─ */}
                {statsSubTab === 'classement' && (() => {
                  const withStats = joueurs.map(j => ({ ...j, s: statsGlobalesJoueur(j.id), tx: tauxPresence(j.id), note: notes[j.id] }))
                  const TRIS = [
                    { key: 'buts', label: '⚽ Buteurs', get: j => j.s.buts, color: '#4ade80', unit: 'but' },
                    { key: 'passes_dec', label: '🎯 Passeurs', get: j => j.s.passes_dec, color: '#60a5fa', unit: 'passe' },
                    { key: 'matchs', label: '📅 Temps de jeu', get: j => j.s.matchs, color: '#a78bfa', unit: 'match' },
                    { key: 'presence', label: '🏃 Présence', get: j => j.tx?.taux ?? 0, color: '#34d399', unit: '%' },
                    { key: 'note', label: '⭐ Note éducateur', get: j => j.note ? ((j.note.technique+j.note.physique+j.note.mental+j.note.tactique)/4) : 0, color: '#fbbf24', unit: '/5' },
                  ]
                  const triActif = TRIS.find(t => t.key === statsTri) || TRIS[0]
                  const sorted = [...withStats].sort((a, b) => triActif.get(b) - triActif.get(a))
                  return (
                    <div>
                      {/* Sélecteur de critère */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                        {TRIS.map(t => (
                          <button key={t.key} onClick={() => setStatsTri(t.key)} style={{ background: statsTri === t.key ? t.color + '20' : '#111', border: `1px solid ${statsTri === t.key ? t.color + '60' : '#222'}`, color: statsTri === t.key ? t.color : '#555', padding: '7px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{t.label}</button>
                        ))}
                      </div>
                      {/* Podium top 3 */}
                      {sorted.length >= 3 && (
                        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '12px', marginBottom: '2rem' }}>
                          {[1, 0, 2].map(rank => {
                            const j = sorted[rank]
                            if (!j) return null
                            const heights = [100, 130, 80]
                            const medals = ['🥇','🥈','🥉']
                            const val = triActif.get(j)
                            return (
                              <div key={j.id} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ fontSize: '22px', marginBottom: '6px' }}>{medals[rank]}</div>
                                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: triActif.color + '20', border: `2px solid ${triActif.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: triActif.color, fontWeight: 800, fontSize: '13px', marginBottom: '6px' }}>{j?.prenom?.[0] || ""}{j?.nom?.[0] || ""}</div>
                                <p style={{ margin: '0 0 2px', fontSize: '12px', fontWeight: 700 }}>{j.prenom}</p>
                                <p style={{ margin: '0 0 8px', fontSize: '11px', color: '#555' }}>{j.nom}</p>
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
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                              <th style={{ padding: '8px 12px', color: '#444', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', width: '40px' }}>#</th>
                              <th style={{ padding: '8px 12px', color: '#444', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', textAlign: 'left' }}>Joueur</th>
                              <th style={{ padding: '8px 12px', color: '#444', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', textAlign: 'left' }}>Poste</th>
                              <th style={{ padding: '8px 12px', color: triActif.color, fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', textAlign: 'right' }}>{triActif.label}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sorted.map((j, i) => {
                              const val = triActif.get(j)
                              return (
                                <tr key={j.id} style={{ borderBottom: '1px solid #141414', background: i === 0 ? triActif.color + '08' : 'transparent' }}>
                                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: i < 3 ? triActif.color : '#444', fontSize: i === 0 ? '15px' : '13px' }}>{i + 1}</td>
                                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>{j.prenom} {j.nom}</td>
                                  <td style={{ padding: '10px 12px', color: '#555', fontSize: '12px' }}>{j.poste || '—'}</td>
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      {[
                        { title: '⚽ Buteurs', key: 'buts', color: '#4ade80' },
                        { title: '🎯 Passes décisives', key: 'passes_dec', color: '#60a5fa' },
                        { title: '⏱️ Minutes jouées', key: 'minutes', color: '#a78bfa', unit: "'" },
                        { title: '📅 Matchs joués', key: 'matchs', color: '#f59e0b' },
                        { title: '🟨 Cartons jaunes', key: 'cartons_j', color: '#fbbf24' },
                        { title: '🟥 Cartons rouges', key: 'cartons_r', color: '#f87171' },
                      ].map(({ title, key, color, unit = '' }) => {
                        const data = [...withStats].sort((a, b) => b[key] - a[key]).filter(d => d[key] > 0)
                        return (
                          <div key={key} style={st.card}>
                            <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: '14px' }}>{title}</p>
                            {data.length === 0
                              ? <p style={{ color: '#333', fontSize: '13px' }}>Aucune donnée</p>
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
                  return (
                    <div>
                      {/* ── Résumé global équipe ── */}
                      <div style={{ ...st.card, marginBottom: '1.5rem', border: '1px solid #1a2e1a' }}>
                        <p style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '15px' }}>📊 Stats globales équipe</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                          <DonutMulti presents={totalPresents} absents={totalAbsents} blesses={totalBlesses} malade={totalMalades} convoque={totalConvoques} size={100} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px' }}>
                              {[
                                { label: 'Séances saisies', val: seancesSaisies, color: '#fff' },
                                { label: 'Taux moyen', val: tauxMoyen + '%', color: tauxMoyen >= 80 ? '#4ade80' : tauxMoyen >= 50 ? '#f59e0b' : '#f87171' },
                                { label: 'Présents', val: totalPresents, color: '#4ade80' },
                                { label: 'Convoqués', val: totalConvoques, color: '#60a5fa' },
                                { label: 'Absents', val: totalAbsents, color: '#ef4444' },
                                { label: 'Blessés', val: totalBlesses, color: '#f97316' },
                                { label: 'Malades', val: totalMalades, color: '#a855f7' },
                              ].map(c => (
                                <div key={c.label} style={{ textAlign: 'center', background: '#0a0a0a', borderRadius: '10px', padding: '10px 6px' }}>
                                  <p style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: c.color }}>{c.val}</p>
                                  <p style={{ margin: '3px 0 0', fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{c.label}</p>
                                </div>
                              ))}
                            </div>
                            {/* Légende camembert */}
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
                              {[['#4ade80','Présent'],['#60a5fa','Convoqué'],['#ef4444','Absent'],['#f97316','Blessé'],['#a855f7','Malade']].map(([color, label]) => (
                                <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#aaa' }}>
                                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />{label}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ── Cards joueurs avec camembert ── */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px', marginBottom: '1.5rem' }}>
                        {[...joueurs]
                          .sort((a, b) => (tauxPresence(b.id)?.taux ?? -1) - (tauxPresence(a.id)?.taux ?? -1))
                          .map(j => {
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
                                    <p style={{ margin: '2px 0 8px', fontSize: '11px', color: '#555' }}>{j.poste || '—'}{tx ? ` · ${tx.total} séance${tx.total > 1 ? 's' : ''}` : ''}</p>
                                    {tx ? (
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px' }}>
                                        {[
                                          { emoji: '✅', label: 'Présent', val: tx.presents, color: '#4ade80' },
                                          { emoji: '🏆', label: 'Convoqué', val: tx.convoque, color: '#60a5fa' },
                                          { emoji: '❌', label: 'Absent', val: tx.absents, color: '#ef4444' },
                                          { emoji: '🤕', label: 'Blessé', val: tx.blesses, color: '#f97316' },
                                          { emoji: '🤒', label: 'Malade', val: tx.malade, color: '#a855f7' },
                                        ].filter(s => s.val > 0).map(s => (
                                          <span key={s.label} style={{ fontSize: '11px', color: s.color }}>
                                            {s.emoji} {s.val} {s.label}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span style={{ fontSize: '11px', color: '#333' }}>Aucune présence saisie</span>
                                    )}
                                  </div>
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
                          color="#4ade80"
                          unit="%"
                          max={100}
                        />
                        {joueurs.every(j => !tauxPresence(j.id)) && (
                          <p style={{ color: '#333', fontSize: '13px', margin: 0, textAlign: 'center', padding: '1rem' }}>Commence à saisir les présences dans l'onglet Entraînements</p>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </>
            )}
          </>
        )}

        {/* ===== MATCHS & CLASSEMENT ===== */}
        {activeSection === 'matchs' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

              {/* Matchs */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>⚽ Calendrier & Résultats</h2>
                  <button onClick={() => setShowAddMatch(true)} style={st.btn()}>+ Match</button>
                </div>

                {showAddMatch && (
                  <div style={{ ...st.card, border: '1px solid #4ade8030', marginBottom: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div><label style={st.label}>Date</label><input style={st.input} type="date" value={newMatch.date} onChange={e => setNewMatch({ ...newMatch, date: e.target.value })} /></div>
                      <div><label style={st.label}>Adversaire</label><input style={st.input} placeholder="Nom de l'équipe" value={newMatch.adversaire} onChange={e => setNewMatch({ ...newMatch, adversaire: e.target.value })} /></div>
                      <div><label style={st.label}>Compétition</label><input style={st.input} placeholder="Championnat, Coupe..." value={newMatch.competition} onChange={e => setNewMatch({ ...newMatch, competition: e.target.value })} /></div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                        <div style={{ flex: 1 }}><label style={st.label}>Score (nous)</label><input style={st.input} type="number" min="0" value={newMatch.score_nous} onChange={e => setNewMatch({ ...newMatch, score_nous: e.target.value })} /></div>
                        <span style={{ color: '#555', paddingBottom: '10px', fontWeight: 700 }}>-</span>
                        <div style={{ flex: 1 }}><label style={st.label}>Score (eux)</label><input style={st.input} type="number" min="0" value={newMatch.score_eux} onChange={e => setNewMatch({ ...newMatch, score_eux: e.target.value })} /></div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: '#aaa' }}>
                        <input type="checkbox" checked={newMatch.domicile} onChange={e => setNewMatch({ ...newMatch, domicile: e.target.checked })} />
                        Domicile
                      </label>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={ajouterMatch} disabled={savingMatch} style={st.btnSolid}>{savingMatch ? 'Ajout...' : 'Ajouter'}</button>
                      <button onClick={() => setShowAddMatch(false)} style={st.btn('#666')}>Annuler</button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {matchs.map(m => {
                    const aScore = m.score_nous !== '' && m.score_nous !== null
                    const nous = parseInt(m.score_nous)
                    const eux = parseInt(m.score_eux)
                    const resultat = aScore ? (nous > eux ? 'V' : nous < eux ? 'D' : 'N') : null
                    const couleur = resultat === 'V' ? '#4ade80' : resultat === 'D' ? '#f87171' : '#f59e0b'
                    return (
                      <div key={m.id} style={{ ...st.card, cursor: 'pointer' }} onClick={() => setMatchActif(matchActif?.id === m.id ? null : m)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {resultat && <span style={{ background: couleur + '20', color: couleur, fontWeight: 800, fontSize: '12px', padding: '3px 10px', borderRadius: '20px', flexShrink: 0 }}>{resultat}</span>}
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>
                              {m.domicile ? 'vs' : '@'} {m.adversaire}
                            </p>
                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#555' }}>
                              {new Date(m.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                              {m.competition ? ` · ${m.competition}` : ''}
                              {m.domicile ? ' · Domicile' : ' · Extérieur'}
                            </p>
                          </div>
                          {aScore && <span style={{ fontWeight: 800, fontSize: '16px', color: couleur }}>{m.score_nous} - {m.score_eux}</span>}
                        </div>

                        {/* Feuille de match */}
                        {matchActif?.id === m.id && (
                          <div style={{ marginTop: '14px', borderTop: '1px solid #1a1a1a', paddingTop: '14px' }}>
                            <p style={{ fontSize: '11px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Feuille de match</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {joueurs.map(j => {
                                const key = m.id
                                const s = (statsMatch[key] || {})[j.id] || {}
                                const existingStat = (m.stats_match || []).find(st => st.joueur_id === j.id) || {}
                                const val = (field) => s[field] !== undefined ? s[field] : (existingStat[field] ?? '')
                                return (
                                  <div key={j.id} style={{ display: 'grid', gridTemplateColumns: '120px 50px 50px 50px 50px 30px 30px', gap: '6px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.prenom} {j.nom?.[0] || ""}.</span>
                                    <input type="number" placeholder="Min" min="0" max="120" value={val('minutes')}
                                      onChange={e => setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || existingStat), minutes: parseInt(e.target.value) || 0 } } }))}
                                      style={{ ...st.input, padding: '5px 8px', fontSize: '12px', textAlign: 'center' }} />
                                    <input type="number" placeholder="Buts" min="0" value={val('buts')}
                                      onChange={e => setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || existingStat), buts: parseInt(e.target.value) || 0 } } }))}
                                      style={{ ...st.input, padding: '5px 8px', fontSize: '12px', textAlign: 'center' }} />
                                    <input type="number" placeholder="PD" min="0" value={val('passes_dec')}
                                      onChange={e => setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || existingStat), passes_dec: parseInt(e.target.value) || 0 } } }))}
                                      style={{ ...st.input, padding: '5px 8px', fontSize: '12px', textAlign: 'center' }} />
                                    <input type="number" placeholder="CS" min="0" max="1" value={val('clean_sheet') ? 1 : 0}
                                      onChange={e => setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || existingStat), clean_sheet: e.target.value === '1' } } }))}
                                      style={{ ...st.input, padding: '5px 8px', fontSize: '12px', textAlign: 'center' }} />
                                    <span title="Carton jaune" style={{ cursor: 'pointer', fontSize: '16px', opacity: val('carton_jaune') ? 1 : 0.25 }}
                                      onClick={e => { e.stopPropagation(); setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || existingStat), carton_jaune: !val('carton_jaune') } } })) }}>🟨</span>
                                    <span title="Carton rouge" style={{ cursor: 'pointer', fontSize: '16px', opacity: val('carton_rouge') ? 1 : 0.25 }}
                                      onClick={e => { e.stopPropagation(); setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || existingStat), carton_rouge: !val('carton_rouge') } } })) }}>🟥</span>
                                  </div>
                                )
                              })}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
                              <p style={{ fontSize: '10px', color: '#444', margin: '0', alignSelf: 'center' }}>Min · Buts · PD · CS</p>
                              <button onClick={e => { e.stopPropagation(); sauvegarderStatsMatch(m.id) }} style={{ ...st.btnSolid, marginLeft: 'auto', padding: '7px 16px', fontSize: '12px' }}>💾 Sauvegarder</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {matchs.length === 0 && <div style={{ ...st.card, textAlign: 'center', padding: '3rem' }}><p style={{ color: '#555' }}>Aucun match enregistré</p></div>}
                </div>
              </div>

              {/* Classement */}
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '1rem' }}>🏆 Classement</h2>
                {classement().length === 0 ? (
                  <div style={{ ...st.card, textAlign: 'center', padding: '3rem' }}>
                    <p style={{ color: '#555' }}>Le classement apparaîtra dès que des résultats sont saisis</p>
                  </div>
                ) : (
                  <div style={st.card}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                          {['#', 'Équipe', 'J', 'V', 'N', 'D', 'BP', 'BC', 'Diff', 'Pts'].map(h => (
                            <th key={h} style={{ padding: '8px', textAlign: h === 'Équipe' ? 'left' : 'center', color: '#444', fontWeight: 700, fontSize: '11px' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {classement().map((e, i) => (
                          <tr key={e.nom} style={{ borderBottom: '1px solid #141414', background: e.moi ? '#4ade8008' : 'transparent' }}>
                            <td style={{ padding: '8px', textAlign: 'center', color: '#555', fontWeight: 600 }}>{i + 1}</td>
                            <td style={{ padding: '8px', fontWeight: e.moi ? 800 : 600, color: e.moi ? '#4ade80' : '#fff' }}>{e.nom}{e.moi ? ' ⬅' : ''}</td>
                            <td style={{ padding: '8px', textAlign: 'center', color: '#aaa' }}>{e.j}</td>
                            <td style={{ padding: '8px', textAlign: 'center', color: '#4ade80' }}>{e.v}</td>
                            <td style={{ padding: '8px', textAlign: 'center', color: '#f59e0b' }}>{e.n}</td>
                            <td style={{ padding: '8px', textAlign: 'center', color: '#f87171' }}>{e.d}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>{e.bp}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>{e.bc}</td>
                            <td style={{ padding: '8px', textAlign: 'center', color: e.bp - e.bc > 0 ? '#4ade80' : e.bp - e.bc < 0 ? '#f87171' : '#aaa' }}>{e.bp - e.bc > 0 ? '+' : ''}{e.bp - e.bc}</td>
                            <td style={{ padding: '8px', textAlign: 'center', fontWeight: 800, color: '#fff', fontSize: '15px' }}>{e.pts}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ===== ENTRAÎNEMENTS ===== */}
        {activeSection === 'entrainements' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>Entraînements</h1>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#555' }}>{entrainements.length} séance{entrainements.length !== 1 ? 's' : ''} · Clique sur une séance pour saisir les présences</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { setShowPlanificateur(true); setShowAddEntrainement(false) }} style={st.btn('#60a5fa')}>📅 Planifier la saison</button>
                <button onClick={() => { setShowAddEntrainement(true); setShowPlanificateur(false) }} style={st.btnSolid}>+ Séance</button>
              </div>
            </div>

            {/* ── Ajout séance unique ── */}
            {showAddEntrainement && (
              <div style={{ ...st.card, border: '1px solid #4ade8030', marginBottom: '1.5rem' }}>
                <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: '14px' }}>➕ Nouvelle séance</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '12px' }}>
                  <div><label style={st.label}>Date</label><input style={st.input} type="date" value={newEntrainement.date} onChange={e => setNewEntrainement({ ...newEntrainement, date: e.target.value })} /></div>
                  <div><label style={st.label}>Thème (optionnel)</label><input style={st.input} placeholder="Ex: Travail défensif, Jeu de transition..." value={newEntrainement.description} onChange={e => setNewEntrainement({ ...newEntrainement, description: e.target.value })} /></div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={ajouterEntrainement} style={st.btnSolid}>Créer la séance</button>
                  <button onClick={() => setShowAddEntrainement(false)} style={st.btn('#666')}>Annuler</button>
                </div>
              </div>
            )}

            {/* ── Planificateur récurrent ── */}
            {showPlanificateur && (
              <div style={{ ...st.card, border: '1px solid #60a5fa30', marginBottom: '1.5rem' }}>
                <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '15px', color: '#60a5fa' }}>📅 Planifier la saison</p>
                <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#555' }}>Choisis les jours récurrents et la période — toutes les séances seront créées automatiquement.</p>

                {/* Jours de la semaine */}
                <label style={st.label}>Jours d'entraînement</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {[['Lun',1],['Mar',2],['Mer',3],['Jeu',4],['Ven',5],['Sam',6],['Dim',0]].map(([label, num]) => {
                    const actif = planSaison.joursActifs.includes(num)
                    return (
                      <button key={num} onClick={() => toggleJourPlan(num)}
                        style={{ padding: '8px 14px', borderRadius: '10px', border: `2px solid ${actif ? '#60a5fa' : '#2a2a2a'}`, background: actif ? '#60a5fa20' : '#1a1a1a', color: actif ? '#60a5fa' : '#666', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s' }}>
                        {label}
                      </button>
                    )
                  })}
                </div>

                {/* Dates + thème */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '12px', marginBottom: '16px' }}>
                  <div><label style={st.label}>Début de saison</label><input style={st.input} type="date" value={planSaison.dateDebut} onChange={e => setPlanSaison(p => ({ ...p, dateDebut: e.target.value }))} /></div>
                  <div><label style={st.label}>Fin de saison</label><input style={st.input} type="date" value={planSaison.dateFin} onChange={e => setPlanSaison(p => ({ ...p, dateFin: e.target.value }))} /></div>
                  <div><label style={st.label}>Thème par défaut (optionnel)</label><input style={st.input} placeholder="Ex: Entraînement, Préparation physique..." value={planSaison.theme} onChange={e => setPlanSaison(p => ({ ...p, theme: e.target.value }))} /></div>
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
                    <div style={{ background: '#60a5fa10', border: '1px solid #60a5fa20', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: '#60a5fa' }}>
                      📊 <strong>{count}</strong> séances au total · <strong>{newCount}</strong> nouvelles à créer ({count - newCount} déjà existantes)
                    </div>
                  )
                })()}

                {/* Progression */}
                {generatingPlan && (
                  <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px' }}>
                    <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#60a5fa' }}>Création en cours... {planProgress.done}/{planProgress.total}</p>
                    <div style={{ background: '#222', borderRadius: '4px', height: '6px' }}>
                      <div style={{ background: '#60a5fa', borderRadius: '4px', height: '6px', width: `${planProgress.total > 0 ? (planProgress.done / planProgress.total) * 100 : 0}%`, transition: 'width 0.2s' }} />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={genererSaison} disabled={generatingPlan || !planSaison.dateDebut || !planSaison.dateFin || !planSaison.joursActifs.length}
                    style={{ ...st.btnSolid, background: '#60a5fa', opacity: (generatingPlan || !planSaison.dateDebut || !planSaison.dateFin || !planSaison.joursActifs.length) ? 0.5 : 1 }}>
                    {generatingPlan ? 'Génération...' : '🚀 Générer les séances'}
                  </button>
                  <button onClick={() => setShowPlanificateur(false)} style={st.btn('#666')}>Annuler</button>
                </div>
              </div>
            )}

            {/* ── Liste des séances ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[...entrainements].sort((a, b) => new Date(b.date) - new Date(a.date)).map(e => {
                const ouvert = entrainementActif === e.id
                const nbPresents = (e.presences_entrainement || []).filter(p => p.statut === 'present' || p.statut === 'convoque' || (!p.statut && p.present)).length
                const nbBlesses = (e.presences_entrainement || []).filter(p => p.statut === 'blesse').length
                const nbMalades = (e.presences_entrainement || []).filter(p => p.statut === 'malade').length
                const nbConvoques = (e.presences_entrainement || []).filter(p => p.statut === 'convoque').length
                const total = joueurs.length
                const dateObj = new Date(e.date + 'T12:00:00')
                const estFuture = dateObj > new Date()
                return (
                  <div key={e.id} style={{ ...st.card, borderLeft: `3px solid ${estFuture ? '#60a5fa40' : '#4ade8030'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Indicateur passé/futur */}
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: estFuture ? '#60a5fa15' : '#4ade8015', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                        {estFuture ? '📅' : '✅'}
                      </div>
                      <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setEntrainementActif(ouvert ? null : e.id)}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                          {e.description && <span style={{ fontSize: '12px', color: '#555' }}>{e.description}</span>}
                          {!estFuture && total > 0 && (
                            <>
                              <span style={{ fontSize: '11px', color: '#4ade80', background: '#4ade8010', padding: '1px 7px', borderRadius: '10px' }}>✅ {nbPresents}</span>
                              {nbConvoques > 0 && <span style={{ fontSize: '11px', color: '#60a5fa', background: '#60a5fa10', padding: '1px 7px', borderRadius: '10px' }}>🏆 {nbConvoques}</span>}
                              {nbBlesses > 0 && <span style={{ fontSize: '11px', color: '#f97316', background: '#f9731610', padding: '1px 7px', borderRadius: '10px' }}>🤕 {nbBlesses}</span>}
                              {nbMalades > 0 && <span style={{ fontSize: '11px', color: '#a855f7', background: '#a855f710', padding: '1px 7px', borderRadius: '10px' }}>🤒 {nbMalades}</span>}
                            </>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {!estFuture && total > 0 && (
                          <span style={{ background: nbPresents >= total * 0.8 ? '#4ade8015' : '#f59e0b15', border: `1px solid ${nbPresents >= total * 0.8 ? '#4ade8030' : '#f59e0b30'}`, color: nbPresents >= total * 0.8 ? '#4ade80' : '#f59e0b', fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                            {nbPresents}/{total}
                          </span>
                        )}
                        <button onClick={() => supprimerEntrainement(e.id)} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#444', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }} title="Supprimer la séance">🗑️</button>
                        <span style={{ color: '#444', cursor: 'pointer' }} onClick={() => setEntrainementActif(ouvert ? null : e.id)}>{ouvert ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {ouvert && (
                      <div style={{ marginTop: '14px', borderTop: '1px solid #1a1a1a', paddingTop: '14px' }}>
                        {joueurs.length === 0 ? (
                          <p style={{ color: '#555', fontSize: '13px', margin: 0 }}>Ajoute des joueurs dans "Mon équipe" pour saisir les présences.</p>
                        ) : (
                          <>
                            {/* Légende */}
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px', alignItems: 'center' }}>
                              {Object.entries(STATUT_CONFIG).map(([key, s]) => (
                                <span key={key} style={{ fontSize: '11px', color: s.color, background: s.bg, border: `1px solid ${s.border}`, padding: '2px 8px', borderRadius: '10px' }}>
                                  {s.emoji} {s.label}
                                </span>
                              ))}
                              <span style={{ fontSize: '11px', color: '#333' }}>· Clique pour changer le statut</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '7px' }}>
                              {joueurs.map(j => {
                                const p = (e.presences_entrainement || []).find(p => p.joueur_id === j.id)
                                const nonSaisi = !p || (!p.statut && !p.present)
                                const statut = p?.statut || (p?.present ? 'present' : 'absent')
                                const cfg = nonSaisi
                                  ? { emoji: '⬜', label: 'Non saisi', bg: '#ffffff05', border: '#2a2a2a', color: '#444' }
                                  : (STATUT_CONFIG[statut] || STATUT_CONFIG.absent)
                                return (
                                  <div key={j.id} onClick={() => cyclerPresence(e.id, j.id, nonSaisi ? 'non_saisi' : statut)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s' }}>
                                    <span style={{ fontSize: '15px', flexShrink: 0 }}>{cfg.emoji}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.prenom} {j?.nom || ''}</p>
                                      <p style={{ margin: 0, fontSize: '10px', color: cfg.color, fontWeight: 700 }}>{cfg.label}</p>
                                    </div>
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
              {entrainements.length === 0 && (
                <div style={{ ...st.card, textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: '#555', margin: '0 0 8px' }}>Aucune séance enregistrée</p>
                  <p style={{ color: '#333', fontSize: '13px', margin: 0 }}>Utilise "📅 Planifier la saison" pour générer toute l'année en un clic</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ===== ÉVALUATIONS ===== */}
        {activeSection === 'notes' && (
          <>
            <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>📝 Évaluations joueurs</h1>
            <p style={{ color: '#555', fontSize: '13px', marginBottom: '1.5rem' }}>Note chaque joueur sur 4 critères. Active le toggle pour partager ta note avec le joueur dans son propre dashboard.</p>
            {joueurs.length === 0 ? (
              <div style={{ ...st.card, textAlign: 'center', padding: '3rem' }}><p style={{ color: '#555' }}>Ajoute d'abord des joueurs dans "Mon équipe"</p></div>
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
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#1a2e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', fontWeight: 800, fontSize: '13px' }}>
                          {j?.prenom?.[0] || ""}{j?.nom?.[0] || ""}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontWeight: 700 }}>{j.prenom} {j.nom}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#555' }}>{j.poste || '—'}</p>
                        </div>
                        {noteGlobale && <span style={{ background: '#4ade8015', border: '1px solid #4ade8030', color: '#4ade80', fontWeight: 800, fontSize: '16px', padding: '4px 14px', borderRadius: '20px' }}>⭐ {noteGlobale}</span>}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '12px' }}>
                        {[['technique', '🎯 Technique'], ['physique', '💪 Physique'], ['mental', '🧠 Mental'], ['tactique', '♟️ Tactique']].map(([key, label]) => (
                          <div key={key}>
                            <label style={st.label}>{label}</label>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {[1,2,3,4,5].map(n => (
                                <span key={n} onClick={() => setLocalNote(j.id, { [key]: n })}
                                  style={{ cursor: 'pointer', fontSize: '20px', opacity: ln[key] >= n ? 1 : 0.2 }}>⭐</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Toggle visible par le joueur */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: ln.visible_joueur ? '#4ade8010' : '#1a1a1a', border: `1px solid ${ln.visible_joueur ? '#4ade8030' : '#2a2a2a'}`, borderRadius: '8px', marginBottom: '12px', cursor: 'pointer' }}
                        onClick={() => setLocalNote(j.id, { visible_joueur: !ln.visible_joueur })}>
                        <div style={{ width: '36px', height: '20px', background: ln.visible_joueur ? '#4ade80' : '#333', borderRadius: '10px', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                          <div style={{ position: 'absolute', top: '3px', left: ln.visible_joueur ? '19px' : '3px', width: '14px', height: '14px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: ln.visible_joueur ? '#4ade80' : '#aaa' }}>
                            {ln.visible_joueur ? '👁️ Visible par le joueur' : '🔒 Privé (non visible)'}
                          </p>
                          <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#555' }}>
                            {ln.visible_joueur ? 'Le joueur verra cette note dans son dashboard' : 'Seul vous voyez cette évaluation'}
                          </p>
                        </div>
                      </div>
                      <div style={{ marginBottom: '12px' }}>
                        <label style={st.label}>{ln.visible_joueur ? '💬 Commentaire (visible par le joueur)' : '💬 Commentaire (privé)'}</label>
                        <textarea value={ln.commentaire} onChange={e => setLocalNote(j.id, { commentaire: e.target.value })}
                          placeholder="Points forts, axes de progression, comportement..."
                          style={{ ...st.input, minHeight: '70px', resize: 'vertical', fontFamily: 'Inter, sans-serif' }} />
                      </div>
                      <button onClick={() => sauvegarderNote(j.id, ln)} disabled={savingNote} style={st.btnSolid}>
                        {savingNote ? 'Sauvegarde...' : '💾 Sauvegarder'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}

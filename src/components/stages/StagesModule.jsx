import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { formatDate, formatPeriode, heure, joursDuStage, CATEGORIES_TACHE, STATUTS_TACHE, nomsEncadrantsTache } from '../../lib/stages'
import StageOffres from './StageOffres'
import StageInscriptions from './StageInscriptions'
import StageOrganisation from './StageOrganisation'
import StageActualites from './StageActualites'
import StageSponsors from './StageSponsors'

// Module Stages — étape 1 : création d'un stage, planning journalier, lien
// public (+ QR code). Monté dans le dashboard club et dans le dashboard
// éducateur (éducateur affilié accepté). Les droits réels sont appliqués en
// base (peut_gerer_stages, cf. supabase_stages_etape1.sql) : ce composant ne
// fait qu'afficher ce que Supabase autorise.

const STATUTS = [
  { id: 'brouillon', label: 'Brouillon', aide: 'Visible uniquement par l\'équipe du club. Le lien public ne fonctionne pas encore.' },
  { id: 'ouvert', label: 'Ouvert', aide: 'Publié : la page publique est accessible aux parents et joueurs.' },
  { id: 'complet', label: 'Complet', aide: 'Publié, mais toutes les places sont prises.' },
  { id: 'termine', label: 'Terminé', aide: 'Le stage est passé. La page publique reste consultable.' },
]
const COULEURS_CRENEAU = [
  { label: 'Terrain', valeur: '#4ade80' },
  { label: 'Repas', valeur: '#facc15' },
  { label: 'Transport', valeur: '#60a5fa' },
  { label: 'Détente', valeur: '#c084fc' },
  { label: 'Activité', valeur: '#f97316' },
  { label: 'Nuit', valeur: '#374151' },
]
const STAGE_VIDE = { nom: '', description: '', date_debut: '', date_fin: '', lieu: '', places_max: 20, reglement: '', liste_materiel: '' }

const lienPublicComplet = (stage) => `${window.location.origin}/stage/${stage.lien_public}`

export default function StagesModule({ clubId, accentColor }) {
  const colors = useColors()
  const accent = accentColor || colors.accent.green
  const [stages, setStages] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [vue, setVue] = useState('liste') // 'liste' | 'creation' | id du stage ouvert

  const st = {
    carte: { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '1.25rem' },
    label: { fontSize: '11px', color: colors.text.faint, marginBottom: '4px', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
    input: { width: '100%', background: colors.background.raised, border: `1px solid ${colors.border.default}`, borderRadius: '8px', color: colors.text.primary, padding: '9px 12px', fontSize: '13px', boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif' },
    bouton: { background: accent + '18', border: `1px solid ${accent}50`, color: accent, padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
    boutonPlein: { background: accent, color: '#000', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
    boutonDiscret: { background: 'transparent', border: `1px solid ${colors.border.default}`, color: colors.text.dim, padding: '8px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
    erreur: { color: '#f87171', fontSize: '13px', margin: '8px 0 0' },
  }

  useEffect(() => {
    if (!clubId) return
    let annule = false
    supabase.from('stages').select('*').eq('club_id', clubId).order('date_debut', { ascending: false })
      .then(({ data, error }) => {
        if (annule) return
        if (error) setErreur('Impossible de charger les stages : ' + error.message)
        setStages(data || [])
        setChargement(false)
      })
    return () => { annule = true }
  }, [clubId])

  const stageOuvert = stages.find(s => s.id === vue)

  if (vue === 'creation') {
    return (
      <FormulaireStage st={st} colors={colors} titre="Nouveau stage" initial={STAGE_VIDE}
        onAnnuler={() => setVue('liste')}
        onEnregistrer={async (valeurs) => {
          const { data: { user } } = await supabase.auth.getUser()
          const { data, error } = await supabase.from('stages').insert({ ...valeurs, club_id: clubId, created_by: user.id }).select().single()
          if (error) return error.message
          setStages(prev => [data, ...prev])
          setVue(data.id)
          return null
        }} />
    )
  }

  if (stageOuvert) {
    return (
      <DetailStage st={st} colors={colors} accent={accent} stage={stageOuvert}
        onRetour={() => setVue('liste')}
        onMisAJour={(maj) => setStages(prev => prev.map(s => s.id === maj.id ? maj : s))}
        onSupprime={(id) => { setStages(prev => prev.filter(s => s.id !== id)); setVue('liste') }}
        onDuplique={(nouveau) => { setStages(prev => [nouveau, ...prev]); setVue(nouveau.id) }} />
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: colors.text.primary }}>Stages</h1>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: colors.text.faint }}>Organise les stages du club : planning, page publique pour les familles.</p>
        </div>
        <button onClick={() => setVue('creation')} style={st.boutonPlein}>+ Nouveau stage</button>
      </div>

      {erreur && <p style={st.erreur}>{erreur}</p>}
      {chargement ? (
        <p style={{ color: colors.text.faint, fontSize: '13px' }}>Chargement…</p>
      ) : stages.length === 0 ? (
        <div style={{ ...st.carte, textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: colors.text.faint, margin: '0 0 12px' }}>Aucun stage pour l'instant.</p>
          <button onClick={() => setVue('creation')} style={st.bouton}>Créer le premier stage</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
          {stages.map(s => (
            <button key={s.id} onClick={() => setVue(s.id)} style={{ ...st.carte, textAlign: 'left', cursor: 'pointer', color: colors.text.primary, fontFamily: 'Inter, sans-serif' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 700, fontSize: '15px' }}>{s.nom}</span>
                <BadgeStatut statut={s.statut} accent={accent} colors={colors} />
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: colors.text.dim }}>{formatPeriode(s.date_debut, s.date_fin)}</p>
              {s.lieu && <p style={{ margin: '2px 0 0', fontSize: '12px', color: colors.text.faint }}>{s.lieu}</p>}
              <p style={{ margin: '10px 0 0', fontSize: '12px', color: colors.text.faint }}>
                {s.places_max} places par jour
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function BadgeStatut({ statut, accent, colors }) {
  const libelle = STATUTS.find(s => s.id === statut)?.label || statut
  const couleur = statut === 'brouillon' ? colors.text.faint : statut === 'termine' ? colors.text.dim : accent
  return <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: couleur, border: `1px solid ${couleur}60`, borderRadius: '6px', padding: '2px 7px', whiteSpace: 'nowrap' }}>{libelle}</span>
}

function FormulaireStage({ st, colors, titre, initial, onAnnuler, onEnregistrer }) {
  const [v, setV] = useState({ ...STAGE_VIDE, ...initial })
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')
  const champ = (cle) => ({ value: v[cle] ?? '', onChange: e => setV(prev => ({ ...prev, [cle]: e.target.value })), style: st.input })

  const enregistrer = async () => {
    if (!v.nom.trim()) return setErreur('Le nom du stage est obligatoire.')
    if (!v.date_debut || !v.date_fin) return setErreur('Les dates de début et de fin sont obligatoires.')
    if (v.date_fin < v.date_debut) return setErreur('La date de fin doit être après la date de début.')
    const places = parseInt(v.places_max, 10)
    if (!(places > 0)) return setErreur('Le nombre de places doit être supérieur à 0.')
    setEnCours(true)
    setErreur('')
    const message = await onEnregistrer({
      nom: v.nom.trim(), description: v.description?.trim() || null,
      date_debut: v.date_debut, date_fin: v.date_fin, lieu: v.lieu?.trim() || null,
      places_max: places,
      reglement: v.reglement?.trim() || null, liste_materiel: v.liste_materiel?.trim() || null,
    })
    setEnCours(false)
    if (message) setErreur('Enregistrement impossible : ' + message)
  }

  return (
    <div style={st.carte}>
      <p style={{ margin: '0 0 16px', fontWeight: 800, fontSize: '16px', color: colors.text.primary }}>{titre}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div style={{ gridColumn: '1 / -1' }}><label style={st.label}>Nom du stage *</label><input {...champ('nom')} placeholder="Stage de Toussaint U11-U13" /></div>
        <div><label style={st.label}>Date de début *</label><input type="date" {...champ('date_debut')} /></div>
        <div><label style={st.label}>Date de fin *</label><input type="date" {...champ('date_fin')} /></div>
        <div><label style={st.label}>Lieu</label><input {...champ('lieu')} placeholder="Stade municipal" /></div>
        <div><label style={st.label}>Places par jour</label><input type="number" min="1" {...champ('places_max')} /></div>
        <div style={{ gridColumn: '1 / -1' }}><label style={st.label}>Description</label><textarea rows={3} {...champ('description')} style={{ ...st.input, resize: 'vertical' }} /></div>
        <div style={{ gridColumn: '1 / -1' }}><label style={st.label}>Règlement (affiché aux familles)</label><textarea rows={4} {...champ('reglement')} style={{ ...st.input, resize: 'vertical' }} /></div>
        <div style={{ gridColumn: '1 / -1' }}><label style={st.label}>Matériel à apporter</label><textarea rows={3} {...champ('liste_materiel')} style={{ ...st.input, resize: 'vertical' }} /></div>
      </div>
      {erreur && <p style={st.erreur}>{erreur}</p>}
      <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
        <button onClick={enregistrer} disabled={enCours} style={{ ...st.boutonPlein, opacity: enCours ? 0.6 : 1 }}>{enCours ? 'Enregistrement…' : 'Enregistrer'}</button>
        <button onClick={onAnnuler} style={st.boutonDiscret}>Annuler</button>
      </div>
    </div>
  )
}

function DetailStage({ st, colors, accent, stage, onRetour, onMisAJour, onSupprime, onDuplique }) {
  const [onglet, setOnglet] = useState('apercu')
  const ONGLETS = [
    { id: 'apercu', label: 'Vue d\'ensemble' }, { id: 'inscriptions', label: 'Inscriptions' },
    { id: 'planning', label: 'Planning' }, { id: 'organisation', label: 'Organisation' }, { id: 'actualites', label: 'Actualités' },
    { id: 'sponsors', label: 'Sponsors' }, { id: 'offres', label: 'Offres & tarifs' }, { id: 'parametres', label: 'Paramètres' },
  ]

  return (
    <div>
      <button onClick={onRetour} style={{ ...st.boutonDiscret, marginBottom: '14px' }}>← Tous les stages</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: colors.text.primary }}>{stage.nom}</h1>
        <BadgeStatut statut={stage.statut} accent={accent} colors={colors} />
      </div>
      <p style={{ margin: '0 0 16px', fontSize: '13px', color: colors.text.dim }}>{formatPeriode(stage.date_debut, stage.date_fin)}{stage.lieu ? ` · ${stage.lieu}` : ''}</p>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '18px', flexWrap: 'wrap' }}>
        {ONGLETS.map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id)} style={{
            padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            background: onglet === o.id ? accent + '18' : 'transparent',
            border: `1px solid ${onglet === o.id ? accent + '60' : colors.border.default}`,
            color: onglet === o.id ? accent : colors.text.dim,
          }}>{o.label}</button>
        ))}
      </div>

      {onglet === 'apercu' && <ApercuStage st={st} colors={colors} accent={accent} stage={stage} onMisAJour={onMisAJour} />}
      {onglet === 'inscriptions' && <StageInscriptions st={st} colors={colors} accent={accent} stage={stage} />}
      {onglet === 'planning' && <PlanningStage st={st} colors={colors} stage={stage} />}
      {onglet === 'organisation' && <StageOrganisation st={st} colors={colors} accent={accent} stage={stage} />}
      {onglet === 'actualites' && <StageActualites st={st} colors={colors} accent={accent} stage={stage} />}
      {onglet === 'sponsors' && <StageSponsors st={st} colors={colors} stage={stage} />}
      {onglet === 'offres' && <StageOffres st={st} colors={colors} accent={accent} stage={stage} onMisAJour={onMisAJour} />}
      {onglet === 'parametres' && <ParametresStage key={stage.id} st={st} colors={colors} stage={stage} onMisAJour={onMisAJour} onSupprime={onSupprime} onDuplique={onDuplique} />}
    </div>
  )
}

function ApercuStage({ st, colors, accent, stage, onMisAJour }) {
  const [erreur, setErreur] = useState('')
  const [copie, setCopie] = useState(false)
  const lien = lienPublicComplet(stage)
  const publie = stage.statut !== 'brouillon'

  const changerStatut = async (statut) => {
    setErreur('')
    const { data, error } = await supabase.from('stages').update({ statut }).eq('id', stage.id).select().single()
    if (error) return setErreur('Changement impossible : ' + error.message)
    onMisAJour(data)
  }

  const copier = async () => {
    try { await navigator.clipboard.writeText(lien); setCopie(true); setTimeout(() => setCopie(false), 2000) } catch { setErreur('Copie impossible : sélectionne le lien à la main.') }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
      <div style={st.carte}>
        <span style={st.label}>Informations</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
          {[['Places par jour', stage.places_max], ['Jours', joursDuStage(stage).length],
            ['Début', formatDate(stage.date_debut, { day: 'numeric', month: 'short' })], ['Fin', formatDate(stage.date_fin, { day: 'numeric', month: 'short' })]].map(([k, val]) => (
            <div key={k} style={{ background: colors.background.raised, borderRadius: '10px', padding: '10px 12px' }}>
              <div style={{ fontSize: '11px', color: colors.text.faint }}>{k}</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: colors.text.primary }}>{val}</div>
            </div>
          ))}
        </div>
        {stage.description && <p style={{ margin: '12px 0 0', fontSize: '13px', color: colors.text.dim, whiteSpace: 'pre-line' }}>{stage.description}</p>}
      </div>

      <div style={st.carte}>
        <span style={st.label}>Statut</span>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '8px 0' }}>
          {STATUTS.map(s => (
            <button key={s.id} onClick={() => s.id !== stage.statut && changerStatut(s.id)} style={{
              padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              background: stage.statut === s.id ? accent + '20' : 'transparent',
              border: `1px solid ${stage.statut === s.id ? accent : colors.border.default}`,
              color: stage.statut === s.id ? accent : colors.text.dim,
            }}>{s.label}</button>
          ))}
        </div>
        <p style={{ margin: 0, fontSize: '12px', color: colors.text.faint }}>{STATUTS.find(s => s.id === stage.statut)?.aide}</p>
        {erreur && <p style={st.erreur}>{erreur}</p>}
      </div>

      <div style={st.carte}>
        <span style={st.label}>Page publique</span>
        {!publie && <p style={{ margin: '8px 0', fontSize: '12px', color: '#facc15' }}>Passe le stage en « Ouvert » pour que ce lien fonctionne.</p>}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', marginTop: '8px' }}>
          <div style={{ background: '#fff', padding: '8px', borderRadius: '10px', lineHeight: 0 }}>
            <QRCodeSVG value={lien} size={112} />
          </div>
          <div style={{ flex: 1, minWidth: '160px' }}>
            <p style={{ margin: '0 0 8px', fontSize: '12px', color: colors.text.dim, wordBreak: 'break-all' }}>{lien}</p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button onClick={copier} style={st.bouton}>{copie ? 'Lien copié' : 'Copier le lien'}</button>
              <a href={lien} target="_blank" rel="noreferrer" style={{ ...st.boutonDiscret, textDecoration: 'none' }}>Ouvrir la page</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const CRENEAU_VIDE = { date: '', heure_debut: '', heure_fin: '', activite: '', lieu: '', responsable: '', groupe: '', plan_b: '', notes: '', couleur: '#4ade80' }

function PlanningStage({ st, colors, stage }) {
  const [creneaux, setCreneaux] = useState([])
  const [taches, setTaches] = useState([])
  const [encadrants, setEncadrants] = useState([])
  const [chargement, setChargement] = useState(true)
  const [edition, setEdition] = useState(null) // null | créneau en cours d'édition (id absent = nouveau)
  const [erreur, setErreur] = useState('')
  const [dupli, setDupli] = useState(null) // { source, cibles, creneaux, taches, remplacer, enCours, erreur }

  // Les tâches de l'onglet Organisation s'affichent aussi ici, dans chaque
  // journée (lecture seule : elles se modifient dans Organisation).
  useEffect(() => {
    let annule = false
    Promise.all([
      supabase.from('stages_planning').select('*').eq('stage_id', stage.id).order('date').order('heure_debut'),
      supabase.from('stages_taches').select('*').eq('stage_id', stage.id).order('date').order('heure_debut'),
      supabase.from('stages_encadrants').select('id, nom').eq('stage_id', stage.id),
    ]).then(([p, t, e]) => {
      if (annule) return
      if (p.error) setErreur('Impossible de charger le planning : ' + p.error.message)
      setCreneaux(p.data || [])
      setTaches(t.data || [])
      setEncadrants(e.data || [])
      setChargement(false)
    })
    return () => { annule = true }
  }, [stage.id])

  const enregistrer = async () => {
    const c = edition
    if (!c.date || !c.heure_debut || !c.heure_fin || !c.activite.trim()) return setErreur('Date, horaires et activité sont obligatoires.')
    if (c.date < stage.date_debut || c.date > stage.date_fin) return setErreur('La date doit être comprise dans les dates du stage.')
    setErreur('')
    const valeurs = {
      date: c.date, heure_debut: c.heure_debut, heure_fin: c.heure_fin, activite: c.activite.trim(),
      lieu: c.lieu?.trim() || null, responsable: c.responsable?.trim() || null, groupe: c.groupe?.trim() || null,
      plan_b: c.plan_b?.trim() || null, notes: c.notes?.trim() || null, couleur: c.couleur || '#4ade80',
    }
    const requete = c.id
      ? supabase.from('stages_planning').update(valeurs).eq('id', c.id).select().single()
      : supabase.from('stages_planning').insert({ ...valeurs, stage_id: stage.id }).select().single()
    const { data, error } = await requete
    if (error) return setErreur('Enregistrement impossible : ' + error.message)
    setCreneaux(prev => [...prev.filter(x => x.id !== data.id), data]
      .sort((a, b) => (a.date + a.heure_debut).localeCompare(b.date + b.heure_debut)))
    setEdition(null)
  }

  const supprimer = async (id) => {
    if (!window.confirm('Supprimer ce créneau ?')) return
    const { error } = await supabase.from('stages_planning').delete().eq('id', id)
    if (error) return setErreur('Suppression impossible : ' + error.message)
    setCreneaux(prev => prev.filter(x => x.id !== id))
  }

  // Journées : créneaux du programme + tâches datées, triés par heure
  // (tâches sans horaire en tête). Tâches sans date : bloc « Tout le stage ».
  const parJour = {}
  for (const c of creneaux) (parJour[c.date] = parJour[c.date] || []).push({ ...c, _type: 'creneau' })
  for (const t of taches.filter(x => x.date)) (parJour[t.date] = parJour[t.date] || []).push({ ...t, _type: 'tache' })
  for (const jour of Object.keys(parJour)) parJour[jour].sort((a, b) => (a.heure_debut || '').localeCompare(b.heure_debut || ''))
  const joursTries = Object.keys(parJour).sort()
  const joursStage = joursDuStage(stage)

  // Duplication d'une journée (créneaux et/ou tâches) vers d'autres jours,
  // en ajoutant ou en remplaçant leur contenu. Les tâches copiées repartent
  // « à faire ». Toutes les écritures passent par les règles d'accès.
  const dupliquerJournee = async () => {
    const d = dupli
    if (d.cibles.length === 0) return setDupli(x => ({ ...x, erreur: 'Choisis au moins un jour de destination.' }))
    if (!d.creneaux && !d.taches) return setDupli(x => ({ ...x, erreur: 'Choisis ce qu\'il faut copier.' }))
    const sourcesC = d.creneaux ? creneaux.filter(c => c.date === d.source) : []
    const sourcesT = d.taches ? taches.filter(t => t.date === d.source) : []
    if (sourcesC.length + sourcesT.length === 0) return setDupli(x => ({ ...x, erreur: 'Cette journée est vide.' }))
    if (d.remplacer && !window.confirm(`Remplacer le contenu de ${d.cibles.length} jour(s) ? Les ${d.creneaux && d.taches ? 'créneaux et tâches' : d.creneaux ? 'créneaux' : 'tâches'} déjà présents sur ces jours seront supprimés.`)) return
    setDupli(x => ({ ...x, enCours: true, erreur: '' }))
    try {
      if (d.remplacer) {
        if (d.creneaux) { const { error } = await supabase.from('stages_planning').delete().eq('stage_id', stage.id).in('date', d.cibles); if (error) throw error }
        if (d.taches) { const { error } = await supabase.from('stages_taches').delete().eq('stage_id', stage.id).in('date', d.cibles); if (error) throw error }
      }
      let nouveauxC = [], nouveauxT = []
      if (sourcesC.length) {
        const lignes = d.cibles.flatMap(date => sourcesC.map(c => ({
          stage_id: stage.id, date, heure_debut: c.heure_debut, heure_fin: c.heure_fin, activite: c.activite, lieu: c.lieu,
          responsable: c.responsable, groupe: c.groupe, plan_b: c.plan_b, notes: c.notes, couleur: c.couleur,
        })))
        const { data, error } = await supabase.from('stages_planning').insert(lignes).select()
        if (error) throw error
        nouveauxC = data || []
      }
      if (sourcesT.length) {
        const lignes = d.cibles.flatMap(date => sourcesT.map(t => ({
          stage_id: stage.id, date, tache: t.tache, categorie: t.categorie, heure_debut: t.heure_debut, heure_fin: t.heure_fin,
          statut: 'a_faire', notes: t.notes, encadrant_ids: t.encadrant_ids || [], tous_encadrants: !!t.tous_encadrants,
        })))
        const { data, error } = await supabase.from('stages_taches').insert(lignes).select()
        if (error) throw error
        nouveauxT = data || []
      }
      const trier = (a, b) => `${a.date}${a.heure_debut || ''}`.localeCompare(`${b.date}${b.heure_debut || ''}`)
      if (d.creneaux) setCreneaux(prev => [...(d.remplacer ? prev.filter(c => !d.cibles.includes(c.date)) : prev), ...nouveauxC].sort(trier))
      if (d.taches) setTaches(prev => [...(d.remplacer ? prev.filter(t => !d.cibles.includes(t.date)) : prev), ...nouveauxT].sort(trier))
      setDupli(null)
    } catch (e) {
      setDupli(x => ({ ...x, enCours: false, erreur: 'Duplication impossible : ' + e.message }))
    }
  }
  const panneauDuplication = (jour) => {
    const autres = joursStage.filter(j => j !== jour)
    const coche = (j) => setDupli(x => ({ ...x, cibles: x.cibles.includes(j) ? x.cibles.filter(y => y !== j) : [...x.cibles, j] }))
    const pastille = (actif) => ({
      padding: '6px 11px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', textTransform: 'capitalize',
      background: actif ? '#60a5fa22' : 'transparent', border: `1px solid ${actif ? '#60a5fa' : colors.border.default}`, color: actif ? '#60a5fa' : colors.text.dim,
    })
    return (
      <div style={{ margin: '0 0 12px', padding: '12px', borderRadius: '10px', border: `1px dashed ${colors.border.default}`, background: colors.background.base }}>
        <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 700, color: colors.text.primary }}>Copier cette journée vers…</p>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setDupli(x => ({ ...x, cibles: x.cibles.length === autres.length ? [] : autres }))} style={pastille(dupli.cibles.length === autres.length && autres.length > 0)}>Tous les autres jours</button>
          {autres.map(j => <button key={j} type="button" onClick={() => coche(j)} style={pastille(dupli.cibles.includes(j))}>{formatDate(j, { weekday: 'short', day: 'numeric', month: 'short' })}</button>)}
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '10px', fontSize: '13px', color: colors.text.dim }}>
          <label style={{ display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer' }}><input type="checkbox" checked={dupli.creneaux} onChange={e => setDupli(x => ({ ...x, creneaux: e.target.checked }))} /> Créneaux du programme</label>
          <label style={{ display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer' }}><input type="checkbox" checked={dupli.taches} onChange={e => setDupli(x => ({ ...x, taches: e.target.checked }))} /> Tâches</label>
          <label style={{ display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer' }}><input type="checkbox" checked={dupli.remplacer} onChange={e => setDupli(x => ({ ...x, remplacer: e.target.checked }))} /> Remplacer le contenu existant de ces jours</label>
        </div>
        {dupli.erreur && <p style={st.erreur}>{dupli.erreur}</p>}
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
          <button onClick={dupliquerJournee} disabled={dupli.enCours} style={{ ...st.boutonPlein, padding: '8px 16px', opacity: dupli.enCours ? 0.6 : 1 }}>{dupli.enCours ? 'Copie…' : `Copier${dupli.cibles.length ? ` vers ${dupli.cibles.length} jour(s)` : ''}`}</button>
          <button onClick={() => setDupli(null)} style={st.boutonDiscret}>Annuler</button>
        </div>
      </div>
    )
  }
  const tachesToutLeStage = taches.filter(x => !x.date)
  const carteTache = (t) => (
    <div key={`t${t.id}`} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: colors.background.raised, borderRadius: '10px', padding: '10px 12px', borderLeft: '4px dashed #60a5fa' }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color: colors.text.secondary, minWidth: '86px' }}>{t.heure_debut ? `${heure(t.heure_debut)}${t.heure_fin ? ` – ${heure(t.heure_fin)}` : ''}` : 'Sans horaire'}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: colors.text.primary, textDecoration: t.statut === 'fait' ? 'line-through' : 'none' }}>
          {t.tache} <span style={{ marginLeft: '4px', fontSize: '10px', fontWeight: 700, color: '#60a5fa', border: '1px solid #60a5fa60', borderRadius: '6px', padding: '1px 6px' }}>TÂCHE</span>
        </div>
        <div style={{ fontSize: '12px', color: colors.text.dim }}>{[CATEGORIES_TACHE[t.categorie], STATUTS_TACHE[t.statut], nomsEncadrantsTache(t, encadrants) || 'Non attribuée'].filter(Boolean).join(' · ')}</div>
      </div>
    </div>
  )
  const champ = (cle) => ({ value: edition?.[cle] ?? '', onChange: e => setEdition(prev => ({ ...prev, [cle]: e.target.value })), style: st.input })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px', flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontSize: '13px', color: colors.text.faint }}>Le plan B et les notes restent internes : ils n'apparaissent jamais sur la page publique. Les tâches (en pointillés bleus) se gèrent dans l'onglet Organisation.</p>
        {!edition && <button onClick={() => { setErreur(''); setEdition({ ...CRENEAU_VIDE, date: stage.date_debut }) }} style={st.boutonPlein}>+ Ajouter un créneau</button>}
      </div>

      {edition && (
        <div style={{ ...st.carte, marginBottom: '14px' }}>
          <p style={{ margin: '0 0 12px', fontWeight: 700, color: colors.text.primary }}>{edition.id ? 'Modifier le créneau' : 'Nouveau créneau'}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
            <div><label style={st.label}>Date *</label><input type="date" min={stage.date_debut} max={stage.date_fin} {...champ('date')} /></div>
            <div><label style={st.label}>Début *</label><input type="time" {...champ('heure_debut')} /></div>
            <div><label style={st.label}>Fin *</label><input type="time" {...champ('heure_fin')} /></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={st.label}>Activité *</label><input {...champ('activite')} placeholder="Séance technique, déjeuner, sortie…" /></div>
            <div><label style={st.label}>Lieu</label><input {...champ('lieu')} /></div>
            <div><label style={st.label}>Responsable</label><input {...champ('responsable')} /></div>
            <div><label style={st.label}>Groupe</label><input {...champ('groupe')} placeholder="U11, groupe A…" /></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={st.label}>Plan B (pluie, météo) — interne</label><input {...champ('plan_b')} /></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={st.label}>Notes — internes</label><textarea rows={2} {...champ('notes')} style={{ ...st.input, resize: 'vertical' }} /></div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={st.label}>Couleur</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {COULEURS_CRENEAU.map(c => (
                  <button key={c.valeur} type="button" onClick={() => setEdition(prev => ({ ...prev, couleur: c.valeur }))} style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    background: 'transparent', color: colors.text.dim,
                    border: `1px solid ${edition.couleur === c.valeur ? c.valeur : colors.border.default}`,
                  }}><span style={{ width: 10, height: 10, borderRadius: 3, background: c.valeur }} />{c.label}</button>
                ))}
              </div>
            </div>
          </div>
          {erreur && <p style={st.erreur}>{erreur}</p>}
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
            <button onClick={enregistrer} style={st.boutonPlein}>Enregistrer</button>
            <button onClick={() => { setEdition(null); setErreur('') }} style={st.boutonDiscret}>Annuler</button>
          </div>
        </div>
      )}

      {!edition && erreur && <p style={st.erreur}>{erreur}</p>}
      {chargement ? (
        <p style={{ color: colors.text.faint, fontSize: '13px' }}>Chargement…</p>
      ) : creneaux.length === 0 && taches.length === 0 ? (
        <div style={{ ...st.carte, textAlign: 'center', padding: '2.5rem', color: colors.text.faint, fontSize: '13px' }}>Aucun créneau. Ajoute le premier pour construire le programme du stage.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {tachesToutLeStage.length > 0 && (
            <div style={st.carte}>
              <p style={{ margin: '0 0 10px', fontWeight: 800, fontSize: '14px', color: colors.text.primary }}>Tout le stage</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{tachesToutLeStage.map(carteTache)}</div>
            </div>
          )}
          {joursTries.map(jour => [jour, parJour[jour]]).map(([jour, liste]) => (
            <div key={jour} style={st.carte}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', margin: '0 0 10px' }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: '14px', color: colors.text.primary, textTransform: 'capitalize' }}>{formatDate(jour)}</p>
                {joursStage.length > 1 && dupli?.source !== jour && (
                  <button onClick={() => setDupli({ source: jour, cibles: [], creneaux: true, taches: true, remplacer: false, enCours: false, erreur: '' })} style={{ ...st.boutonDiscret, padding: '4px 10px', fontSize: '12px' }}>Dupliquer cette journée</button>
                )}
              </div>
              {dupli?.source === jour && panneauDuplication(jour)}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {liste.map(c => c._type === 'tache' ? carteTache(c) : (
                  <div key={c.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: colors.background.raised, borderRadius: '10px', padding: '10px 12px', borderLeft: `4px solid ${c.couleur}` }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: colors.text.secondary, minWidth: '86px' }}>{heure(c.heure_debut)} – {heure(c.heure_fin)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: colors.text.primary }}>{c.activite}{c.groupe ? <span style={{ fontWeight: 400, color: colors.text.faint }}> · {c.groupe}</span> : null}</div>
                      {(c.lieu || c.responsable) && <div style={{ fontSize: '12px', color: colors.text.dim }}>{[c.lieu, c.responsable && `Resp. ${c.responsable}`].filter(Boolean).join(' · ')}</div>}
                      {c.plan_b && <div style={{ fontSize: '12px', color: '#60a5fa', marginTop: '2px' }}>Plan B : {c.plan_b}</div>}
                      {c.notes && <div style={{ fontSize: '12px', color: colors.text.faint, marginTop: '2px', whiteSpace: 'pre-line' }}>{c.notes}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button onClick={() => { setErreur(''); setEdition({ ...CRENEAU_VIDE, ...c, heure_debut: heure(c.heure_debut), heure_fin: heure(c.heure_fin) }) }} style={{ ...st.boutonDiscret, padding: '4px 10px', fontSize: '12px' }}>Modifier</button>
                      <button onClick={() => supprimer(c.id)} style={{ ...st.boutonDiscret, padding: '4px 10px', fontSize: '12px', color: '#f87171' }}>Supprimer</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ParametresStage({ st, colors, stage, onMisAJour, onSupprime, onDuplique }) {
  const [erreur, setErreur] = useState('')
  const [enregistre, setEnregistre] = useState(false)
  const [copie, setCopie] = useState({ nom: `${stage.nom} (copie)`, date_debut: '', sponsors: false })
  const [copieEnCours, setCopieEnCours] = useState(false)
  const [erreurCopie, setErreurCopie] = useState('')

  const dupliquer = async () => {
    if (!copie.nom.trim() || !copie.date_debut) return setErreurCopie('Indique le nom et la date de début de la copie.')
    setCopieEnCours(true); setErreurCopie('')
    const { data: nouvelId, error } = await supabase.rpc('dupliquer_stage', {
      p_stage_id: stage.id, p_nom: copie.nom.trim(), p_date_debut: copie.date_debut, p_copier_sponsors: copie.sponsors,
    })
    if (error) { setCopieEnCours(false); return setErreurCopie('Duplication impossible : ' + error.message) }
    const { data: nouveau, error: e2 } = await supabase.from('stages').select('*').eq('id', nouvelId).single()
    setCopieEnCours(false)
    if (e2) return setErreurCopie('Copie créée, mais impossible de l\'ouvrir : recharge la page.')
    onDuplique(nouveau)
  }

  const supprimer = async () => {
    if (!window.confirm(`Supprimer définitivement le stage « ${stage.nom} » et tout son planning ?`)) return
    const { error } = await supabase.from('stages').delete().eq('id', stage.id)
    if (error) return setErreur('Suppression impossible : ' + error.message)
    onSupprime(stage.id)
  }

  return (
    <div>
      <FormulaireStage st={st} colors={colors} titre="Modifier le stage" initial={stage}
        onAnnuler={() => setEnregistre(false)}
        onEnregistrer={async (valeurs) => {
          const { data, error } = await supabase.from('stages').update(valeurs).eq('id', stage.id).select().single()
          if (error) return error.message
          onMisAJour(data)
          setEnregistre(true)
          return null
        }} />
      {enregistre && <p style={{ color: '#4ade80', fontSize: '13px', margin: '10px 0 0' }}>Modifications enregistrées.</p>}
      <div style={{ ...st.carte, marginTop: '14px' }}>
        <span style={st.label}>Dupliquer ce stage</span>
        <p style={{ margin: '6px 0 12px', fontSize: '12px', color: colors.text.faint }}>Recopie les offres, repas, jours, planning, encadrants, matériel (remis « à trouver ») et tâches (remises « à faire »), en décalant toutes les dates. Les inscriptions et les actualités ne sont pas recopiées. La copie démarre en brouillon, avec un nouveau lien public.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', alignItems: 'end' }}>
          <div><label style={st.label}>Nom de la copie</label><input value={copie.nom} onChange={e => setCopie(c => ({ ...c, nom: e.target.value }))} style={st.input} /></div>
          <div><label style={st.label}>Nouvelle date de début</label><input type="date" value={copie.date_debut} onChange={e => setCopie(c => ({ ...c, date_debut: e.target.value }))} style={st.input} /></div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: colors.text.dim, cursor: 'pointer' }}>
            <input type="checkbox" checked={copie.sponsors} onChange={e => setCopie(c => ({ ...c, sponsors: e.target.checked }))} /> Recopier les sponsors
          </label>
        </div>
        <button onClick={dupliquer} disabled={copieEnCours} style={{ ...st.bouton, marginTop: '12px', opacity: copieEnCours ? 0.6 : 1 }}>{copieEnCours ? 'Duplication…' : 'Dupliquer le stage'}</button>
        {erreurCopie && <p style={st.erreur}>{erreurCopie}</p>}
      </div>
      <div style={{ ...st.carte, marginTop: '14px', borderColor: '#f8717140' }}>
        <span style={st.label}>Zone sensible</span>
        <p style={{ margin: '6px 0 10px', fontSize: '12px', color: colors.text.faint }}>La suppression efface le stage et tout son planning. Elle est définitive.</p>
        <button onClick={supprimer} style={{ ...st.boutonDiscret, color: '#f87171', borderColor: '#f8717160' }}>Supprimer le stage</button>
        {erreur && <p style={st.erreur}>{erreur}</p>}
      </div>
    </div>
  )
}

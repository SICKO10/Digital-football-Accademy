import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'
import { labelCategorie } from '../lib/categories'

const VUES = ['Jour', 'Semaine', 'Mois', 'Année']

const TYPE_COULEURS = {
  entrainement: '#3b82f6',
  match_dom:    '#4ade80',
  match_ext:    '#f97316',
  evenement:    '#a78bfa',
  projet:       '#fb7185',
}

const TYPE_LABELS = {
  entrainement: 'Entraînement',
  match_dom:    'Match · Domicile',
  match_ext:    'Match · Extérieur',
  evenement:    'Événement',
  projet:       'Projet',
}

// Date locale au format YYYY-MM-DD — jamais toISOString() (convertit en UTC,
// ce qui décale la date d'un jour en France), même règle que partout ailleurs
// dans l'app (cf. PlanningTerrains.jsx/getDatesSemaine).
const dateLocaleStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Vue générale de toutes les équipes du club (matchs, entraînements,
// événements, projets) sur un calendrier Jour/Semaine/Mois/Année.
// matchs/evenements/projets/categories sont déjà chargés par DashboardClub.jsx
// (matchsClub, evenementsClub, projetsClub, categories) — pas de requête
// dupliquée ici. Seuls les entraînements (aucune vue "toutes catégories" du
// club n'existe encore ailleurs) sont chargés par ce composant, une fois,
// scopés aux éducateurs affiliés (dérivés de `categories`).
export default function Planning({ matchs = [], evenements = [], projets = [], categories = [] }) {
  const colors = useColors()
  const [vue, setVue] = useState('Semaine')
  const [dateRef, setDateRef] = useState(new Date())
  const [entrainements, setEntrainements] = useState([])
  const [filtres, setFiltres] = useState({
    entrainement: true, match_dom: true, match_ext: true,
    evenement: true, projet: true,
  })
  const [popup, setPopup] = useState(null)
  // Seuil aligné sur PlanningSemaineWidget.jsx (déjà en place ailleurs dans
  // l'app pour le même problème : grille 7 colonnes illisible sur téléphone).
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640)
  // Tablette (portrait/paysage, 640-1024px) : reste sur la grille desktop
  // (isMobile ne se déclenche qu'en dessous de 640) mais avec des cellules
  // resserrées — cf. isTablet passé aux vues ci-dessous.
  const [isTablet, setIsTablet] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 640 && window.innerWidth < 1024)
  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < 640)
      setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const educateurIds = useMemo(() => [...new Set(categories.map(c => c.educateur_id).filter(Boolean))], [categories])

  useEffect(() => {
    const charger = async () => {
      if (educateurIds.length === 0) { setEntrainements([]); return }
      const { data } = await supabase.from('entrainements').select('id, date, heure, description, lieu, educateur_id').in('educateur_id', educateurIds)
      setEntrainements(data || [])
    }
    charger()
  }, [educateurIds])

  const catLabel = (educateurId) => {
    const cat = categories.find(c => c.educateur_id === educateurId)
    return cat ? `${labelCategorie(cat.nom)}${cat.equipe ? ` ${cat.equipe}` : ''}` : null
  }

  // Fusionne les 4 sources en une liste normalisée { id, type, date, heure,
  // titre, sousTitre, description } — un projet (date_debut/date_fin, pas de
  // date unique) est ancré sur sa date de début.
  const tousEvenements = useMemo(() => {
    const tous = []
    entrainements.forEach(e => tous.push({
      id: `s_${e.id}`, type: 'entrainement', date: e.date, heure: e.heure?.slice(0, 5) || null,
      titre: `${catLabel(e.educateur_id) ? catLabel(e.educateur_id) + ' · ' : ''}${e.description || 'Entraînement'}`,
      sousTitre: e.lieu || '',
    }))
    matchs.forEach(m => tous.push({
      id: `m_${m.id}`, type: m.domicile ? 'match_dom' : 'match_ext', date: m.date, heure: m.heure?.slice(0, 5) || null,
      titre: `${catLabel(m.educateur_id) ? catLabel(m.educateur_id) + ' · ' : ''}${m.domicile ? 'vs' : '@'} ${m.adversaire || 'Match'}`,
      sousTitre: `${m.domicile ? 'Domicile' : 'Extérieur'}${m.lieu ? ' · ' + m.lieu : ''}`,
    }))
    evenements.forEach(e => tous.push({
      id: `e_${e.id}`, type: 'evenement', date: e.date, heure: e.heure?.slice(0, 5) || null,
      titre: e.titre, sousTitre: e.lieu || '', description: e.description,
    }))
    projets.forEach(p => tous.push({
      id: `p_${p.id}`, type: 'projet', date: p.date_debut, heure: null,
      titre: p.nom,
      sousTitre: p.date_fin && p.date_fin !== p.date_debut ? `Jusqu'au ${new Date(`${p.date_fin}T12:00:00`).toLocaleDateString('fr-FR')}` : '',
      description: p.description,
    }))
    return tous.filter(e => e.date)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entrainements, matchs, evenements, projets, categories])

  const evtsFiltres = tousEvenements.filter(e => filtres[e.type])

  const getPlageDates = (ref, v) => {
    const d = new Date(ref)
    if (v === 'Jour') return { debut: d, fin: d }
    if (v === 'Semaine') {
      const lundi = new Date(d)
      lundi.setDate(d.getDate() - ((d.getDay() + 6) % 7))
      const dim = new Date(lundi); dim.setDate(lundi.getDate() + 6)
      return { debut: lundi, fin: dim }
    }
    if (v === 'Mois') return {
      debut: new Date(d.getFullYear(), d.getMonth(), 1),
      fin: new Date(d.getFullYear(), d.getMonth() + 1, 0),
    }
    return {
      debut: new Date(d.getFullYear(), 0, 1),
      fin: new Date(d.getFullYear(), 11, 31),
    }
  }

  const naviguer = (dir) => {
    const d = new Date(dateRef)
    if (vue === 'Jour') d.setDate(d.getDate() + dir)
    if (vue === 'Semaine') d.setDate(d.getDate() + dir * 7)
    if (vue === 'Mois') d.setMonth(d.getMonth() + dir)
    if (vue === 'Année') d.setFullYear(d.getFullYear() + dir)
    setDateRef(d)
  }

  const labelPeriode = () => {
    const { debut, fin } = getPlageDates(dateRef, vue)
    const fmt = (d, opts) => d.toLocaleDateString('fr-FR', opts)
    if (vue === 'Jour') return fmt(debut, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    if (vue === 'Semaine') return `${fmt(debut, { day: 'numeric', month: 'short' })} – ${fmt(fin, { day: 'numeric', month: 'long', year: 'numeric' })}`
    if (vue === 'Mois') return fmt(debut, { month: 'long', year: 'numeric' })
    return String(debut.getFullYear())
  }

  return (
    <div style={{ padding: isMobile ? '16px' : '24px', maxWidth: '1100px' }}>
      <h2 style={{ color: colors.text.primary, fontSize: isMobile ? '18px' : '22px', fontWeight: 800, marginBottom: '4px' }}>Planning</h2>
      <p style={{ color: colors.text.faint, fontSize: '13px', marginBottom: isMobile ? '16px' : '24px' }}>Vue générale de toutes les équipes</p>

      <div style={{ display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', marginBottom: isMobile ? '14px' : '20px', flexWrap: 'wrap', gap: '12px', flexDirection: isMobile ? 'column' : 'row' }}>
        <div style={{ display: 'flex', background: colors.background.surface, borderRadius: '10px', padding: '3px', gap: '2px', overflowX: isMobile ? 'auto' : 'visible' }}>
          {VUES.map(v => (
            <button key={v} onClick={() => setVue(v)} style={{
              padding: isMobile ? '7px 12px' : '7px 16px', borderRadius: '8px', border: 'none', flex: isMobile ? 1 : 'none',
              background: vue === v ? '#4ade80' : 'transparent',
              color: vue === v ? '#000' : colors.text.faint,
              fontWeight: vue === v ? 700 : 400,
              fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap',
            }}>{v}</button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'flex-start', gap: isMobile ? '8px' : '12px' }}>
          <button onClick={() => naviguer(-1)} style={{ background: colors.background.surface, border: `1px solid ${colors.border.faint}`, color: colors.text.primary, borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontSize: '16px', fontFamily: 'Inter, sans-serif' }}>‹</button>
          <span style={{ color: colors.text.primary, fontWeight: 600, fontSize: isMobile ? '13px' : '14px', minWidth: isMobile ? 0 : '240px', textAlign: 'center', flex: isMobile ? 1 : 'none' }}>{labelPeriode()}</span>
          <button onClick={() => naviguer(1)} style={{ background: colors.background.surface, border: `1px solid ${colors.border.faint}`, color: colors.text.primary, borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontSize: '16px', fontFamily: 'Inter, sans-serif' }}>›</button>
          {!isMobile && <button onClick={() => setDateRef(new Date())} style={{ background: 'none', border: `1px solid ${colors.border.default}`, color: colors.text.faint, borderRadius: '8px', padding: '7px 12px', cursor: 'pointer', fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>Aujourd'hui</button>}
        </div>
        {isMobile && (
          <button onClick={() => setDateRef(new Date())} style={{ background: 'none', border: `1px solid ${colors.border.default}`, color: colors.text.faint, borderRadius: '8px', padding: '7px 12px', cursor: 'pointer', fontSize: '12px', fontFamily: 'Inter, sans-serif', alignSelf: 'center' }}>Aujourd'hui</button>
        )}

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-start' }}>
          {Object.entries(TYPE_COULEURS).map(([type, couleur]) => (
            <button key={type} onClick={() => setFiltres(p => ({ ...p, [type]: !p[type] }))} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '5px 10px', borderRadius: '20px',
              border: `1px solid ${filtres[type] ? couleur + '44' : colors.border.faint}`,
              background: filtres[type] ? couleur + '18' : 'transparent',
              color: filtres[type] ? couleur : colors.text.disabled,
              fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: filtres[type] ? couleur : colors.border.strong, display: 'inline-block' }} />
              {TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {vue === 'Jour' && <VueJour dateRef={dateRef} evenements={evtsFiltres} onClic={setPopup} isMobile={isMobile} />}
      {vue === 'Semaine' && <VueSemaine dateRef={dateRef} evenements={evtsFiltres} onClic={setPopup} isMobile={isMobile} isTablet={isTablet} />}
      {vue === 'Mois' && <VueMois dateRef={dateRef} evenements={evtsFiltres} onClic={setPopup} isMobile={isMobile} isTablet={isTablet} />}
      {vue === 'Année' && <VueAnnee dateRef={dateRef} evenements={evtsFiltres} onClic={setPopup} isMobile={isMobile} isTablet={isTablet} />}

      {popup && (
        <div onClick={() => setPopup(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: colors.background.sunken, border: `1px solid ${TYPE_COULEURS[popup.type]}44`, borderRadius: '16px', padding: isMobile ? '20px' : '28px', maxWidth: '420px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: TYPE_COULEURS[popup.type], textTransform: 'uppercase', letterSpacing: '1px' }}>{TYPE_LABELS[popup.type]}</span>
              <button onClick={() => setPopup(null)} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <h3 style={{ color: colors.text.primary, fontSize: '18px', margin: '0 0 8px' }}>{popup.titre}</h3>
            {popup.sousTitre && <p style={{ color: colors.text.dim, fontSize: '13px', margin: '0 0 8px' }}>{popup.sousTitre}</p>}
            <p style={{ color: '#4ade80', fontSize: '13px', margin: '0 0 12px' }}>
              {new Date(`${popup.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              {popup.heure && ` · ${popup.heure}`}
            </p>
            {popup.description && <p style={{ color: colors.text.secondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{popup.description}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

function VueJour({ dateRef, evenements, onClic, isMobile }) {
  const colors = useColors()
  const dateStr = dateLocaleStr(dateRef)
  const evts = evenements.filter(e => e.date === dateStr).sort((a, b) => (a.heure || '').localeCompare(b.heure || ''))
  return (
    <div style={{ maxWidth: '640px' }}>
      {evts.length === 0
        ? <p style={{ color: colors.text.disabled, fontStyle: 'italic' }}>Aucun événement ce jour.</p>
        : evts.map(e => (
          <div key={e.id} onClick={() => onClic(e)} style={{
            display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '16px',
            padding: isMobile ? '12px 14px' : '14px 18px', marginBottom: '8px',
            background: colors.background.base,
            border: `1px solid ${TYPE_COULEURS[e.type]}22`,
            borderLeft: `4px solid ${TYPE_COULEURS[e.type]}`,
            borderRadius: '10px', cursor: 'pointer',
          }}>
            <div style={{ color: TYPE_COULEURS[e.type], fontWeight: 700, fontSize: '14px', minWidth: '54px' }}>{e.heure || '—'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: colors.text.primary, fontWeight: 600, fontSize: '14px' }}>{e.titre}</div>
              {e.sousTitre && <div style={{ color: colors.text.faint, fontSize: '12px', marginTop: '2px' }}>{e.sousTitre}</div>}
            </div>
            <span style={{ fontSize: '10px', fontWeight: 700, color: TYPE_COULEURS[e.type], textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 }}>{TYPE_LABELS[e.type]}</span>
          </div>
        ))
      }
    </div>
  )
}

function VueSemaine({ dateRef, evenements, onClic, isMobile, isTablet }) {
  const colors = useColors()
  const lundi = new Date(dateRef)
  lundi.setDate(dateRef.getDate() - ((dateRef.getDay() + 6) % 7))
  const jours = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lundi); d.setDate(lundi.getDate() + i); return d
  })
  const today = dateLocaleStr(new Date())

  // Grille 7 colonnes illisible sous 640px (chaque colonne ~50px) — liste
  // verticale à la place, un jour par ligne, même pattern déjà en place dans
  // PlanningSemaineWidget.jsx pour le même problème.
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {jours.map(jour => {
          const dateStr = dateLocaleStr(jour)
          const evts = evenements.filter(e => e.date === dateStr).sort((a, b) => (a.heure || '').localeCompare(b.heure || ''))
          const isToday = dateStr === today
          return (
            <div key={dateStr} style={{ background: isToday ? '#0d1a0d' : colors.background.base, border: `1px solid ${isToday ? '#4ade8033' : colors.border.subtle}`, borderRadius: '10px', padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: evts.length ? '8px' : 0 }}>
                <div style={{ fontSize: '17px', fontWeight: 800, color: isToday ? '#4ade80' : colors.text.primary }}>{jour.getDate()}</div>
                <div style={{ fontSize: '11px', color: colors.text.faint, textTransform: 'capitalize' }}>{jour.toLocaleDateString('fr-FR', { weekday: 'long' })}</div>
              </div>
              {evts.map(e => (
                <div key={e.id} onClick={() => onClic(e)} style={{
                  background: `${TYPE_COULEURS[e.type]}18`,
                  borderLeft: `3px solid ${TYPE_COULEURS[e.type]}`,
                  borderRadius: '4px', padding: '6px 8px', marginBottom: '4px', cursor: 'pointer',
                }}>
                  <div style={{ color: colors.text.primary, fontSize: '12px', fontWeight: 600 }}>
                    {e.heure && <span style={{ color: TYPE_COULEURS[e.type], marginRight: '6px' }}>{e.heure}</span>}
                    {e.titre}
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isTablet ? '5px' : '8px' }}>
      {jours.map(jour => {
        const dateStr = dateLocaleStr(jour)
        const evts = evenements.filter(e => e.date === dateStr).sort((a, b) => (a.heure || '').localeCompare(b.heure || ''))
        const isToday = dateStr === today
        return (
          // minWidth: 0 — sans ça, un titre en white-space:nowrap plus bas
          // impose sa largeur de contenu minimale à la cellule (comportement
          // par défaut d'un enfant de grid), ce qui pousse les 7 colonnes
          // au-delà de leur 1fr et fait déborder toute la grille de l'écran
          // sur tablette (jamais visible sur desktop, où il y a de la marge).
          <div key={dateStr} style={{ minWidth: 0, overflow: 'hidden', background: isToday ? '#0d1a0d' : colors.background.base, border: `1px solid ${isToday ? '#4ade8033' : colors.border.subtle}`, borderRadius: '10px', padding: isTablet ? '6px' : '10px', minHeight: isTablet ? '110px' : '160px' }}>
            <div style={{ fontSize: isTablet ? '9px' : '10px', color: colors.text.faint, textTransform: 'uppercase', marginBottom: '4px' }}>
              {jour.toLocaleDateString('fr-FR', { weekday: 'short' })}
            </div>
            <div style={{ fontSize: isTablet ? '16px' : '20px', fontWeight: 800, color: isToday ? '#4ade80' : colors.text.primary, marginBottom: isTablet ? '6px' : '10px' }}>
              {jour.getDate()}
            </div>
            {evts.map(e => (
              <div key={e.id} onClick={() => onClic(e)} style={{
                background: `${TYPE_COULEURS[e.type]}18`,
                borderLeft: `3px solid ${TYPE_COULEURS[e.type]}`,
                borderRadius: '4px', padding: isTablet ? '3px 4px' : '4px 6px', marginBottom: '4px', cursor: 'pointer',
              }}>
                <div style={{ color: colors.text.primary, fontSize: isTablet ? '9px' : '10px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {e.heure && <span style={{ color: TYPE_COULEURS[e.type], marginRight: '4px' }}>{e.heure}</span>}
                  {e.titre}
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function VueMois({ dateRef, evenements, onClic, isMobile }) {
  const colors = useColors()
  const annee = dateRef.getFullYear()
  const mois = dateRef.getMonth()
  const decalage = (new Date(annee, mois, 1).getDay() + 6) % 7
  const nbJours = new Date(annee, mois + 1, 0).getDate()
  const today = dateLocaleStr(new Date())
  const cellules = Array(decalage).fill(null).concat(Array.from({ length: nbJours }, (_, i) => i + 1))
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? '3px' : '4px', marginBottom: '4px' }}>
        {(isMobile ? ['L', 'M', 'M', 'J', 'V', 'S', 'D'] : ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']).map((j, i) =>
          <div key={i} style={{ color: colors.text.disabled, fontSize: isMobile ? '10px' : '11px', textAlign: 'center', padding: isMobile ? '4px 0' : '6px 0', textTransform: 'uppercase' }}>{j}</div>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? '3px' : '4px' }}>
        {cellules.map((jour, idx) => {
          if (!jour) return <div key={`v${idx}`} />
          const dateStr = `${annee}-${String(mois + 1).padStart(2, '0')}-${String(jour).padStart(2, '0')}`
          const evts = evenements.filter(e => e.date === dateStr)
          const isToday = dateStr === today
          // Sous 640px, un titre par cellule ne rentre pas (colonnes ~45px) —
          // pastilles de couleur à la place (une par événement, au clic ouvre
          // le premier), même esprit que le calendrier joueur déjà réglé.
          if (isMobile) {
            return (
              <div key={dateStr} onClick={() => evts[0] && onClic(evts[0])} style={{ background: isToday ? '#0d1a0d' : colors.background.base, border: `1px solid ${isToday ? '#4ade8044' : colors.border.subtle}`, borderRadius: '6px', padding: '4px', minHeight: '44px', cursor: evts.length ? 'pointer' : 'default', textAlign: 'center' }}>
                <div style={{ color: isToday ? '#4ade80' : colors.text.secondary, fontSize: '11px', fontWeight: isToday ? 800 : 400 }}>{jour}</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', marginTop: '3px', flexWrap: 'wrap' }}>
                  {evts.slice(0, 4).map(e => (
                    <span key={e.id} style={{ width: '5px', height: '5px', borderRadius: '50%', background: TYPE_COULEURS[e.type], display: 'inline-block' }} />
                  ))}
                </div>
              </div>
            )
          }
          return (
            <div key={dateStr} style={{ background: isToday ? '#0d1a0d' : colors.background.base, border: `1px solid ${isToday ? '#4ade8044' : colors.border.subtle}`, borderRadius: '8px', padding: '8px', minHeight: '90px' }}>
              <div style={{ color: isToday ? '#4ade80' : colors.text.secondary, fontSize: '13px', fontWeight: isToday ? 800 : 400, marginBottom: '6px' }}>{jour}</div>
              {evts.slice(0, 3).map(e => (
                <div key={e.id} onClick={() => onClic(e)} style={{
                  background: `${TYPE_COULEURS[e.type]}22`,
                  borderLeft: `2px solid ${TYPE_COULEURS[e.type]}`,
                  borderRadius: '3px', padding: '2px 5px', marginBottom: '3px',
                  fontSize: '10px', color: colors.text.primary, cursor: 'pointer',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{e.titre}</div>
              ))}
              {evts.length > 3 && <div style={{ color: colors.text.faint, fontSize: '9px' }}>+{evts.length - 3} de plus</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function VueAnnee({ dateRef, evenements, isMobile }) {
  const colors = useColors()
  const annee = dateRef.getFullYear()
  const moisNoms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? '8px' : '12px' }}>
      {moisNoms.map((nom, i) => {
        const evtsMois = evenements.filter(e => {
          const d = new Date(`${e.date}T12:00:00`)
          return d.getFullYear() === annee && d.getMonth() === i
        })
        const parType = {}
        evtsMois.forEach(e => { parType[e.type] = (parType[e.type] || 0) + 1 })
        return (
          <div key={nom} style={{ background: colors.background.base, border: `1px solid ${colors.border.subtle}`, borderRadius: '10px', padding: isMobile ? '10px' : '14px' }}>
            <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: '13px', marginBottom: '10px' }}>{nom}</div>
            {evtsMois.length === 0
              ? <div style={{ color: colors.text.ghost, fontSize: '12px' }}>—</div>
              : Object.entries(parType).map(([type, count]) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: TYPE_COULEURS[type], flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ color: colors.text.faint, fontSize: '11px' }}>{count} {TYPE_LABELS[type].toLowerCase()}{count > 1 ? 's' : ''}</span>
                </div>
              ))
            }
          </div>
        )
      })}
    </div>
  )
}

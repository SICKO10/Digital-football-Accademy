import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'

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
  const [vue, setVue] = useState('Semaine')
  const [dateRef, setDateRef] = useState(new Date())
  const [entrainements, setEntrainements] = useState([])
  const [filtres, setFiltres] = useState({
    entrainement: true, match_dom: true, match_ext: true,
    evenement: true, projet: true,
  })
  const [popup, setPopup] = useState(null)

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
    return cat ? `${cat.nom}${cat.equipe ? ` ${cat.equipe}` : ''}` : null
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
    <div style={{ padding: '24px', maxWidth: '1100px' }}>
      <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>Planning</h2>
      <p style={{ color: '#555', fontSize: '13px', marginBottom: '24px' }}>Vue générale de toutes les équipes</p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', background: '#111', borderRadius: '10px', padding: '3px', gap: '2px' }}>
          {VUES.map(v => (
            <button key={v} onClick={() => setVue(v)} style={{
              padding: '7px 16px', borderRadius: '8px', border: 'none',
              background: vue === v ? '#4ade80' : 'transparent',
              color: vue === v ? '#000' : '#666',
              fontWeight: vue === v ? 700 : 400,
              fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}>{v}</button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => naviguer(-1)} style={{ background: '#111', border: '1px solid #222', color: '#fff', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontSize: '16px', fontFamily: 'Inter, sans-serif' }}>‹</button>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px', minWidth: '240px', textAlign: 'center' }}>{labelPeriode()}</span>
          <button onClick={() => naviguer(1)} style={{ background: '#111', border: '1px solid #222', color: '#fff', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontSize: '16px', fontFamily: 'Inter, sans-serif' }}>›</button>
          <button onClick={() => setDateRef(new Date())} style={{ background: 'none', border: '1px solid #2a2a2a', color: '#555', borderRadius: '8px', padding: '7px 12px', cursor: 'pointer', fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>Aujourd'hui</button>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {Object.entries(TYPE_COULEURS).map(([type, couleur]) => (
            <button key={type} onClick={() => setFiltres(p => ({ ...p, [type]: !p[type] }))} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '5px 10px', borderRadius: '20px',
              border: `1px solid ${filtres[type] ? couleur + '44' : '#222'}`,
              background: filtres[type] ? couleur + '18' : 'transparent',
              color: filtres[type] ? couleur : '#444',
              fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: filtres[type] ? couleur : '#333', display: 'inline-block' }} />
              {TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {vue === 'Jour' && <VueJour dateRef={dateRef} evenements={evtsFiltres} onClic={setPopup} />}
      {vue === 'Semaine' && <VueSemaine dateRef={dateRef} evenements={evtsFiltres} onClic={setPopup} />}
      {vue === 'Mois' && <VueMois dateRef={dateRef} evenements={evtsFiltres} onClic={setPopup} />}
      {vue === 'Année' && <VueAnnee dateRef={dateRef} evenements={evtsFiltres} onClic={setPopup} />}

      {popup && (
        <div onClick={() => setPopup(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#0d0d0d', border: `1px solid ${TYPE_COULEURS[popup.type]}44`, borderRadius: '16px', padding: '28px', maxWidth: '420px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: TYPE_COULEURS[popup.type], textTransform: 'uppercase', letterSpacing: '1px' }}>{TYPE_LABELS[popup.type]}</span>
              <button onClick={() => setPopup(null)} style={{ background: 'none', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <h3 style={{ color: '#fff', fontSize: '18px', margin: '0 0 8px' }}>{popup.titre}</h3>
            {popup.sousTitre && <p style={{ color: '#666', fontSize: '13px', margin: '0 0 8px' }}>{popup.sousTitre}</p>}
            <p style={{ color: '#4ade80', fontSize: '13px', margin: '0 0 12px' }}>
              {new Date(`${popup.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              {popup.heure && ` · ${popup.heure}`}
            </p>
            {popup.description && <p style={{ color: '#aaa', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{popup.description}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

function VueJour({ dateRef, evenements, onClic }) {
  const dateStr = dateLocaleStr(dateRef)
  const evts = evenements.filter(e => e.date === dateStr).sort((a, b) => (a.heure || '').localeCompare(b.heure || ''))
  return (
    <div style={{ maxWidth: '640px' }}>
      {evts.length === 0
        ? <p style={{ color: '#444', fontStyle: 'italic' }}>Aucun événement ce jour.</p>
        : evts.map(e => (
          <div key={e.id} onClick={() => onClic(e)} style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            padding: '14px 18px', marginBottom: '8px',
            background: '#0a0a0a',
            border: `1px solid ${TYPE_COULEURS[e.type]}22`,
            borderLeft: `4px solid ${TYPE_COULEURS[e.type]}`,
            borderRadius: '10px', cursor: 'pointer',
          }}>
            <div style={{ color: TYPE_COULEURS[e.type], fontWeight: 700, fontSize: '14px', minWidth: '54px' }}>{e.heure || '—'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>{e.titre}</div>
              {e.sousTitre && <div style={{ color: '#555', fontSize: '12px', marginTop: '2px' }}>{e.sousTitre}</div>}
            </div>
            <span style={{ fontSize: '10px', fontWeight: 700, color: TYPE_COULEURS[e.type], textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 }}>{TYPE_LABELS[e.type]}</span>
          </div>
        ))
      }
    </div>
  )
}

function VueSemaine({ dateRef, evenements, onClic }) {
  const lundi = new Date(dateRef)
  lundi.setDate(dateRef.getDate() - ((dateRef.getDay() + 6) % 7))
  const jours = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lundi); d.setDate(lundi.getDate() + i); return d
  })
  const today = dateLocaleStr(new Date())
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
      {jours.map(jour => {
        const dateStr = dateLocaleStr(jour)
        const evts = evenements.filter(e => e.date === dateStr).sort((a, b) => (a.heure || '').localeCompare(b.heure || ''))
        const isToday = dateStr === today
        return (
          <div key={dateStr} style={{ background: isToday ? '#0d1a0d' : '#0a0a0a', border: `1px solid ${isToday ? '#4ade8033' : '#1a1a1a'}`, borderRadius: '10px', padding: '10px', minHeight: '160px' }}>
            <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', marginBottom: '4px' }}>
              {jour.toLocaleDateString('fr-FR', { weekday: 'short' })}
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: isToday ? '#4ade80' : '#fff', marginBottom: '10px' }}>
              {jour.getDate()}
            </div>
            {evts.map(e => (
              <div key={e.id} onClick={() => onClic(e)} style={{
                background: `${TYPE_COULEURS[e.type]}18`,
                borderLeft: `3px solid ${TYPE_COULEURS[e.type]}`,
                borderRadius: '4px', padding: '4px 6px', marginBottom: '4px', cursor: 'pointer',
              }}>
                <div style={{ color: '#fff', fontSize: '10px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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

function VueMois({ dateRef, evenements, onClic }) {
  const annee = dateRef.getFullYear()
  const mois = dateRef.getMonth()
  const decalage = (new Date(annee, mois, 1).getDay() + 6) % 7
  const nbJours = new Date(annee, mois + 1, 0).getDate()
  const today = dateLocaleStr(new Date())
  const cellules = Array(decalage).fill(null).concat(Array.from({ length: nbJours }, (_, i) => i + 1))
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(j =>
          <div key={j} style={{ color: '#444', fontSize: '11px', textAlign: 'center', padding: '6px 0', textTransform: 'uppercase' }}>{j}</div>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {cellules.map((jour, idx) => {
          if (!jour) return <div key={`v${idx}`} />
          const dateStr = `${annee}-${String(mois + 1).padStart(2, '0')}-${String(jour).padStart(2, '0')}`
          const evts = evenements.filter(e => e.date === dateStr)
          const isToday = dateStr === today
          return (
            <div key={dateStr} style={{ background: isToday ? '#0d1a0d' : '#0a0a0a', border: `1px solid ${isToday ? '#4ade8044' : '#1a1a1a'}`, borderRadius: '8px', padding: '8px', minHeight: '90px' }}>
              <div style={{ color: isToday ? '#4ade80' : '#aaa', fontSize: '13px', fontWeight: isToday ? 800 : 400, marginBottom: '6px' }}>{jour}</div>
              {evts.slice(0, 3).map(e => (
                <div key={e.id} onClick={() => onClic(e)} style={{
                  background: `${TYPE_COULEURS[e.type]}22`,
                  borderLeft: `2px solid ${TYPE_COULEURS[e.type]}`,
                  borderRadius: '3px', padding: '2px 5px', marginBottom: '3px',
                  fontSize: '10px', color: '#fff', cursor: 'pointer',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{e.titre}</div>
              ))}
              {evts.length > 3 && <div style={{ color: '#555', fontSize: '9px' }}>+{evts.length - 3} de plus</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function VueAnnee({ dateRef, evenements }) {
  const annee = dateRef.getFullYear()
  const moisNoms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
      {moisNoms.map((nom, i) => {
        const evtsMois = evenements.filter(e => {
          const d = new Date(`${e.date}T12:00:00`)
          return d.getFullYear() === annee && d.getMonth() === i
        })
        const parType = {}
        evtsMois.forEach(e => { parType[e.type] = (parType[e.type] || 0) + 1 })
        return (
          <div key={nom} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '14px' }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '13px', marginBottom: '10px' }}>{nom}</div>
            {evtsMois.length === 0
              ? <div style={{ color: '#2a2a2a', fontSize: '12px' }}>—</div>
              : Object.entries(parType).map(([type, count]) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: TYPE_COULEURS[type], flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ color: '#888', fontSize: '11px' }}>{count} {TYPE_LABELS[type].toLowerCase()}{count > 1 ? 's' : ''}</span>
                </div>
              ))
            }
          </div>
        )
      })}
    </div>
  )
}

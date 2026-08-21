import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { colors } from '../tokens'
import { sondageEstClos } from '../lib/sondage'
import { EvenementsJour } from './PlanningSemaineWidget'

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const dateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Même calcul que lundiDeSemaine dans PlanningSemaineWidget.jsx
const lundiDeSemaine = (offset) => {
  const now = new Date()
  const decalage = (now.getDay() + 6) % 7
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - decalage + offset * 7)
}

// Même calcul que grilleDuMois dans PlanningSemaineWidget.jsx (semaines
// complètes lundi→dimanche, avec padding du mois précédent/suivant).
const grilleDuMois = (offset) => {
  const now = new Date()
  const premier = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const dernier = new Date(premier.getFullYear(), premier.getMonth() + 1, 0)
  const debut = new Date(premier)
  debut.setDate(premier.getDate() - ((premier.getDay() + 6) % 7))
  const fin = new Date(dernier)
  fin.setDate(dernier.getDate() + (6 - (dernier.getDay() + 6) % 7))
  const jours = []
  const cur = new Date(debut)
  while (cur <= fin) { jours.push(new Date(cur)); cur.setDate(cur.getDate() + 1) }
  return { jours, moisCourant: premier.getMonth() }
}

const OPTIONS_SONDAGE = [
  { val: 'present', label: 'Présent', emoji: '✅', color: colors.accent.green },
  { val: 'absent', label: 'Absent', emoji: '❌', color: colors.accent.red },
  { val: 'blesse', label: 'Blessé', emoji: '🤕', color: colors.accent.orange },
  { val: 'malade', label: 'Malade', emoji: '😷', color: colors.accent.purple },
  { val: 'convoque', label: 'Convoqué', emoji: '🏆', color: colors.accent.blue },
]

// Calendrier hebdomadaire du sondage de présence — même visuel que
// PlanningSemaineWidget (nav ‹ ›, grille 7 jours, seuls les jours avec
// événement affichent quelque chose), mais chaque entraînement/match y
// devient interactif : le joueur y répond directement (présent / absent /
// blessé / malade / convoqué, la table `disponibilites` existante), et
// l'éducateur y voit la réponse de toute l'équipe, semaine par semaine,
// avant de placer ses séances.
export default function SondageSemaine({ mode, userId, educateurId, accentColor = colors.accent.blue }) {
  // Vue mois : réservée au mode joueur (lecture/navigation seulement, cliquer un
  // événement ramène sur la semaine correspondante pour répondre au sondage) —
  // le mode éducateur garde ses cartes détaillées par événement, trop denses
  // pour tenir dans une cellule de calendrier mensuel.
  const [vue, setVue] = useState('semaine')
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [entrainements, setEntrainements] = useState([])
  const [matchs, setMatchs] = useState([])
  const [mesDispos, setMesDispos] = useState({}) // mode joueur : { [eventId]: statut }
  const [dispoEquipe, setDispoEquipe] = useState({}) // mode educateur : { [eventId]: { [joueurId]: statut } }
  const [roster, setRoster] = useState([])
  const [saving, setSaving] = useState(null) // eventId en cours de sauvegarde
  const [evenementOuvert, setEvenementOuvert] = useState(null) // mode educateur : détail dépliable
  const grilleRef = useRef(null)

  const changerVue = (v) => { setVue(v); setOffset(0) }

  let jours, label, moisCourant = null
  if (vue === 'mois') {
    const grille = grilleDuMois(offset)
    jours = grille.jours
    moisCourant = grille.moisCourant
    const nomMois = jours.find(d => d.getMonth() === moisCourant).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    label = nomMois.charAt(0).toUpperCase() + nomMois.slice(1)
  } else {
    const lundi = lundiDeSemaine(offset)
    jours = Array.from({ length: 7 }, (_, i) => new Date(lundi.getFullYear(), lundi.getMonth(), lundi.getDate() + i))
    label = `${jours[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${jours[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
  }
  const debutStr = dateStr(jours[0]), finStr = dateStr(jours[jours.length - 1])
  const aujourdhuiStr = dateStr(new Date())
  const eduId = mode === 'joueur' ? educateurId : userId

  // Bascule vers la semaine contenant cette date (clic sur un jour/événement en
  // vue mois) — la vue mois est volontairement une simple prévisualisation,
  // répondre au sondage se fait toujours en vue semaine.
  const allerVersSemaineDe = (d) => {
    const lundiRef = lundiDeSemaine(0)
    const lundiCible = new Date(d)
    lundiCible.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    const diffSemaines = Math.round((lundiCible - lundiRef) / (7 * 24 * 60 * 60 * 1000))
    setVue('semaine')
    setOffset(diffSemaines)
  }

  const charger = async () => {
    if (!eduId) return
    setLoading(true)
    const [{ data: ents }, { data: mts }] = await Promise.all([
      supabase.from('entrainements').select('id, date, heure, description, lieu, sondage_clos, cloture_sondage_avant').eq('educateur_id', eduId).gte('date', debutStr).lte('date', finStr).order('date', { ascending: true }),
      supabase.from('matchs_equipe').select('id, date, heure, adversaire, lieu, domicile').eq('educateur_id', eduId).gte('date', debutStr).lte('date', finStr).order('date', { ascending: true }),
    ])
    setEntrainements(ents || [])
    setMatchs(mts || [])
    const entIds = (ents || []).map(e => e.id)
    const matchIds = (mts || []).map(m => m.id)

    if (mode === 'joueur') {
      const [{ data: de }, { data: dm }] = await Promise.all([
        entIds.length ? supabase.from('disponibilites').select('seance_id, statut').eq('joueur_id', userId).in('seance_id', entIds) : Promise.resolve({ data: [] }),
        matchIds.length ? supabase.from('disponibilites').select('match_id, statut').eq('joueur_id', userId).in('match_id', matchIds) : Promise.resolve({ data: [] }),
      ])
      const map = {}
      de?.forEach(d => { map[d.seance_id] = d.statut })
      dm?.forEach(d => { map[d.match_id] = d.statut })
      setMesDispos(map)
    } else {
      const { data: eq } = await supabase.from('equipe_joueurs').select('id, joueur_id, prenom, nom').eq('educateur_id', userId).not('joueur_id', 'is', null)
      setRoster(eq || [])
      const [{ data: de }, { data: dm }] = await Promise.all([
        entIds.length ? supabase.from('disponibilites').select('joueur_id, seance_id, statut').in('seance_id', entIds) : Promise.resolve({ data: [] }),
        matchIds.length ? supabase.from('disponibilites').select('joueur_id, match_id, statut').in('match_id', matchIds) : Promise.resolve({ data: [] }),
      ])
      const map = {}
      de?.forEach(d => { if (!map[d.seance_id]) map[d.seance_id] = {}; map[d.seance_id][d.joueur_id] = d.statut })
      dm?.forEach(d => { if (!map[d.match_id]) map[d.match_id] = {}; map[d.match_id][d.joueur_id] = d.statut })
      setDispoEquipe(map)
    }
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { charger() }, [eduId, debutStr, finStr, mode, userId])

  // Sur mobile/tablette, la grille 7 colonnes défile horizontalement (chaque
  // jour garde une largeur lisible plutôt que d'être écrasé) — centre la
  // semaine courante sur "aujourd'hui" plutôt que de laisser l'utilisateur
  // atterrir sur lundi et devoir swiper pour trouver le jour qui l'intéresse.
  useEffect(() => {
    if (loading || offset !== 0 || !grilleRef.current) return
    const cible = grilleRef.current.querySelector('[data-aujourdhui="true"]')
    cible?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [loading, offset])

  const repondre = async (ev, statut) => {
    setSaving(ev.id)
    const avant = mesDispos[ev.id]
    setMesDispos(prev => ({ ...prev, [ev.id]: statut }))
    const payload = { joueur_id: userId, statut, ...(ev.type === 'entrainement' ? { seance_id: ev.id } : { match_id: ev.id }) }
    const { error } = await supabase.from('disponibilites').upsert(payload, { onConflict: ev.type === 'entrainement' ? 'joueur_id,seance_id' : 'joueur_id,match_id' })
    setSaving(null)
    if (error) {
      console.error('disponibilites upsert error:', error)
      alert('Erreur : ' + error.message)
      setMesDispos(prev => ({ ...prev, [ev.id]: avant }))
    }
  }

  const evenementsDuJour = (dStr) => [
    ...entrainements.filter(e => e.date === dStr).map(e => ({ ...e, type: 'entrainement', titre: e.description || 'Entraînement' })),
    ...matchs.filter(m => m.date === dStr).map(m => ({ ...m, type: 'match', titre: m.adversaire ? `vs ${m.adversaire}` : 'Match' })),
  ].sort((a, b) => (a.heure || '').localeCompare(b.heure || ''))

  const evenementsSemaine = jours.flatMap(d => evenementsDuJour(dateStr(d)))

  const card = { background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '16px', padding: '20px', marginBottom: '20px' }

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
      <p style={{ margin: 0, fontWeight: 800, fontSize: '14px', color: colors.text.primary }}>📅 {mode === 'joueur' ? 'Planning de la semaine' : 'Sondage de présence — semaine'}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button onClick={() => setOffset(o => o - 1)} style={{ background: 'transparent', border: `1px solid ${colors.border.default}`, color: accentColor, borderRadius: '8px', width: '26px', height: '26px', cursor: 'pointer', fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>‹</button>
        <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: colors.text.faint, minWidth: '150px', textAlign: 'center' }}>{label}</p>
        <button onClick={() => setOffset(o => o + 1)} style={{ background: 'transparent', border: `1px solid ${colors.border.default}`, color: accentColor, borderRadius: '8px', width: '26px', height: '26px', cursor: 'pointer', fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>›</button>
        {offset !== 0 && <button onClick={() => setOffset(0)} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '11px', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'Inter, sans-serif' }}>{vue === 'mois' ? 'Ce mois' : 'Cette semaine'}</button>}
        {mode === 'joueur' && (
          <div style={{ display: 'flex', background: colors.background.sunken, borderRadius: '8px', padding: '2px', gap: '2px' }}>
            {[['semaine', 'Semaine'], ['mois', 'Mois']].map(([v, lbl]) => (
              <button key={v} onClick={() => changerVue(v)}
                style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', background: vue === v ? accentColor : 'transparent', color: vue === v ? colors.black : colors.text.faint }}>
                {lbl}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  if (loading) return null

  if (mode === 'educateur') {
    return (
      <div style={card}>
        {header}
        {evenementsSemaine.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <p style={{ color: colors.text.ghost, fontSize: '13px', margin: 0 }}>Aucun entraînement ni match planifié cette semaine</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {evenementsSemaine.map(ev => (
              <CarteEvenementEducateur key={ev.id} ev={ev} roster={roster} reponses={dispoEquipe[ev.id] || {}}
                ouvert={evenementOuvert === ev.id} onToggle={() => setEvenementOuvert(o => o === ev.id ? null : ev.id)} accentColor={accentColor} />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (vue === 'mois') {
    // Même rendu que le calendrier éducateur/club (PlanningSemaineWidget) :
    // les événements s'affichent en puces directement dans chaque case, pas
    // de liste séparée en dessous. EvenementsJour est le composant partagé —
    // pas de sondage ici (réservé à la vue semaine), donc pas de callbacks
    // onClickEntrainement/onClickMatch ; le clic sur la case entière ramène
    // sur la semaine correspondante pour répondre.
    return (
      <div style={card}>
        {header}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', minWidth: 0 }}>
          {jours.map(d => {
            const dStr = dateStr(d)
            const ents = entrainements.filter(e => e.date === dStr)
            const mts = matchs.filter(m => m.date === dStr)
            const estAujourdhui = dStr === aujourdhuiStr
            const horsMois = d.getMonth() !== moisCourant
            const vide = ents.length === 0 && mts.length === 0
            return (
              <div key={dStr} onClick={() => !vide && allerVersSemaineDe(d)} style={{
                minHeight: '56px', background: colors.background.sunken, borderRadius: '10px', padding: '5px',
                border: `1px solid ${estAujourdhui ? accentColor : colors.border.faint}`,
                opacity: horsMois ? 0.35 : 1, display: 'flex', flexDirection: 'column', gap: '3px',
                cursor: vide ? 'default' : 'pointer', minWidth: 0,
              }}>
                <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, color: estAujourdhui ? accentColor : vide ? colors.text.ghost : colors.text.faint }}>{d.getDate()}</p>
                <EvenementsJour ents={ents} mts={mts} evts={[]} compact />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div style={card}>
      {header}
      <div ref={grilleRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', overflowX: 'auto', scrollSnapType: 'x proximity', paddingBottom: '4px' }}>
        {jours.map((d, i) => {
          const dStr = dateStr(d)
          const evs = evenementsDuJour(dStr)
          const estAujourdhui = dStr === aujourdhuiStr
          return (
            <div key={dStr} data-aujourdhui={estAujourdhui} style={{
              minWidth: '112px', background: colors.background.sunken, borderRadius: '10px', padding: '10px 8px',
              border: `1px solid ${estAujourdhui ? accentColor : colors.border.faint}`,
              display: 'flex', flexDirection: 'column', gap: '6px', scrollSnapAlign: 'start',
            }}>
              <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: estAujourdhui ? accentColor : evs.length ? colors.text.faint : colors.text.ghost, textAlign: 'center' }}>
                {JOURS[i]} {d.getDate()}
              </p>
              {evs.length === 0 ? (
                <p style={{ margin: 0, fontSize: '11px', color: colors.text.ghost, textAlign: 'center' }}>—</p>
              ) : evs.map(ev => (
                <EvenementJoueur key={ev.id} ev={ev} statut={mesDispos[ev.id]} onChoisir={s => repondre(ev, s)} saving={saving === ev.id} />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EvenementJoueur({ ev, statut, onChoisir, saving }) {
  const clos = ev.type === 'entrainement' && sondageEstClos(ev)
  const couleurType = ev.type === 'match' ? colors.accent.blue : colors.accent.green
  return (
    <div style={{ background: colors.background.surface, border: `1px solid ${couleurType}25`, borderRadius: '8px', padding: '8px' }}>
      <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, color: couleurType, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.titre}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: '1px 0 5px', flexWrap: 'wrap' }}>
        {ev.heure && <p style={{ margin: 0, fontSize: '9px', color: colors.text.faint }}>{ev.heure.slice(0, 5)}</p>}
        {ev.type === 'match' && (
          <span style={{ background: ev.domicile ? '#166534' : '#7c2d12', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontSize: '8px', fontWeight: 700 }}>
            {ev.domicile ? 'Domicile' : 'Extérieur'}
          </span>
        )}
      </div>
      {clos ? (
        <p style={{ margin: '5px 0 0', fontSize: '9px', color: colors.text.ghost }}>🔒 Clos</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', justifyContent: 'center' }}>
          {OPTIONS_SONDAGE.map(opt => {
            const actif = statut === opt.val
            return (
              <button key={opt.val} title={opt.label} disabled={saving} onClick={() => onChoisir(opt.val)}
                style={{ width: '26px', height: '26px', padding: 0, borderRadius: '50%', background: actif ? `${opt.color}25` : 'transparent', border: `1px solid ${actif ? opt.color : colors.border.default}`, fontSize: '14px', lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {opt.emoji}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

const SANS_REPONSE = { val: 'sans_reponse', label: 'Sans réponse', emoji: '⏳', color: colors.text.faint }

// Carte détaillée par événement (entraînement/match) : compteurs par statut,
// taux de réponse avec barre de progression, clic → détail des joueurs
// groupés par statut (y compris "sans réponse", qui n'est pas un statut
// stocké mais l'absence de ligne dans `disponibilites` pour ce joueur).
function CarteEvenementEducateur({ ev, roster, reponses, ouvert, onToggle, accentColor }) {
  const couleurType = ev.type === 'match' ? colors.accent.blue : colors.accent.green
  const compte = (val) => Object.values(reponses).filter(s => s === val).length
  const repondu = Object.keys(reponses).length
  const total = roster.length
  const sansReponse = Math.max(0, total - repondu)
  const tauxReponse = total > 0 ? Math.round((repondu / total) * 100) : 0
  const couleurTaux = tauxReponse >= 70 ? colors.accent.green : tauxReponse >= 40 ? colors.accent.amber : colors.accent.red
  const dateLabel = new Date(ev.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })

  const joueursParStatut = (val) => roster.filter(j => (reponses[j.joueur_id] || 'sans_reponse') === val)

  return (
    <div>
      <div onClick={onToggle} style={{
        background: ouvert ? `${accentColor}0d` : colors.background.sunken,
        border: `1px solid ${ouvert ? `${accentColor}55` : colors.border.faint}`,
        borderRadius: ouvert ? '14px 14px 0 0' : '14px', padding: '14px 16px', cursor: 'pointer',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ minWidth: '140px' }}>
            <p style={{ margin: 0, color: couleurType, fontWeight: 700, fontSize: '13px', textTransform: 'capitalize' }}>{dateLabel}</p>
            <p style={{ margin: '2px 0 0', color: colors.text.faint, fontSize: '11px' }}>{ev.heure ? ev.heure.slice(0, 5) : '—'} · {ev.titre}</p>
          </div>

          <div style={{ display: 'flex', gap: '6px', flex: 1, flexWrap: 'wrap' }}>
            {[...OPTIONS_SONDAGE, SANS_REPONSE].map(opt => {
              const n = opt.val === 'sans_reponse' ? sansReponse : compte(opt.val)
              if (n === 0 && opt.val !== 'present' && opt.val !== 'sans_reponse') return null
              return (
                <div key={opt.val} style={{ background: `${opt.color}18`, border: `1px solid ${opt.color}33`, borderRadius: '8px', padding: '4px 10px', textAlign: 'center', minWidth: '48px' }}>
                  <p style={{ margin: 0, color: opt.color, fontWeight: 800, fontSize: '15px', lineHeight: 1 }}>{n}</p>
                  <p style={{ margin: '1px 0 0', color: opt.color, fontSize: '9px', fontWeight: 600, opacity: 0.85 }}>{opt.label.split(' ')[0]}</p>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, color: couleurTaux, fontWeight: 700, fontSize: '14px' }}>{tauxReponse}%</p>
              <p style={{ margin: 0, color: colors.text.faint, fontSize: '9px' }}>{repondu}/{total}</p>
            </div>
            <span style={{ color: colors.text.faint, fontSize: '16px', transition: 'transform 0.2s', transform: ouvert ? 'rotate(90deg)' : 'none' }}>›</span>
          </div>
        </div>

        <div style={{ marginTop: '10px', height: '4px', background: colors.border.faint, borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${tauxReponse}%`, background: couleurTaux, borderRadius: '2px' }} />
        </div>
      </div>

      {ouvert && (
        <div style={{ background: colors.background.sunken, border: `1px solid ${accentColor}55`, borderTop: 'none', borderRadius: '0 0 14px 14px', padding: '14px 16px' }}>
          {[...OPTIONS_SONDAGE, SANS_REPONSE].map(opt => {
            const js = joueursParStatut(opt.val)
            if (js.length === 0) return null
            return (
              <div key={opt.val} style={{ marginBottom: '12px' }}>
                <p style={{ margin: '0 0 6px', color: opt.color, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{opt.emoji} {opt.label} ({js.length})</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {js.map(j => (
                    <div key={j.id} style={{ background: `${opt.color}18`, border: `1px solid ${opt.color}33`, borderRadius: '8px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: `${opt.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: opt.color, flexShrink: 0 }}>
                        {(j.prenom?.[0] || '') + (j.nom?.[0] || '')}
                      </div>
                      <p style={{ margin: 0, color: colors.text.primary, fontSize: '12px', fontWeight: 600 }}>{j.prenom} {j.nom}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { colors } from '../tokens'
import { sondageEstClos } from '../lib/sondage'

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const dateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Même calcul que lundiDeSemaine dans PlanningSemaineWidget.jsx
const lundiDeSemaine = (offset) => {
  const now = new Date()
  const decalage = (now.getDay() + 6) % 7
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - decalage + offset * 7)
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
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [entrainements, setEntrainements] = useState([])
  const [matchs, setMatchs] = useState([])
  const [mesDispos, setMesDispos] = useState({}) // mode joueur : { [eventId]: statut }
  const [dispoEquipe, setDispoEquipe] = useState({}) // mode educateur : { [eventId]: { [joueurId]: statut } }
  const [roster, setRoster] = useState([])
  const [saving, setSaving] = useState(null) // eventId en cours de sauvegarde
  const [evenementOuvert, setEvenementOuvert] = useState(null) // mode educateur : détail dépliable

  const lundi = lundiDeSemaine(offset)
  const jours = Array.from({ length: 7 }, (_, i) => new Date(lundi.getFullYear(), lundi.getMonth(), lundi.getDate() + i))
  const debutStr = dateStr(jours[0]), finStr = dateStr(jours[6])
  const label = `${jours[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${jours[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
  const aujourdhuiStr = dateStr(new Date())
  const eduId = mode === 'joueur' ? educateurId : userId

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

  const repondre = async (ev, statut) => {
    setSaving(ev.id)
    setMesDispos(prev => ({ ...prev, [ev.id]: statut }))
    const payload = { joueur_id: userId, statut, ...(ev.type === 'entrainement' ? { seance_id: ev.id } : { match_id: ev.id }) }
    const { error } = await supabase.from('disponibilites').upsert(payload, { onConflict: ev.type === 'entrainement' ? 'joueur_id,seance_id' : 'joueur_id,match_id' })
    setSaving(null)
    if (error) charger()
  }

  const evenementsDuJour = (dStr) => [
    ...entrainements.filter(e => e.date === dStr).map(e => ({ ...e, type: 'entrainement', titre: e.description || 'Entraînement' })),
    ...matchs.filter(m => m.date === dStr).map(m => ({ ...m, type: 'match', titre: m.adversaire ? `vs ${m.adversaire}` : 'Match' })),
  ].sort((a, b) => (a.heure || '').localeCompare(b.heure || ''))

  const card = { background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '16px', padding: '20px', marginBottom: '20px' }

  if (loading) return null

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <p style={{ margin: 0, fontWeight: 800, fontSize: '14px', color: colors.text.primary }}>📅 Sondage de présence — semaine</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => setOffset(o => o - 1)} style={{ background: 'transparent', border: `1px solid ${colors.border.default}`, color: accentColor, borderRadius: '8px', width: '26px', height: '26px', cursor: 'pointer', fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>‹</button>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: colors.text.faint, minWidth: '150px', textAlign: 'center' }}>{label}</p>
          <button onClick={() => setOffset(o => o + 1)} style={{ background: 'transparent', border: `1px solid ${colors.border.default}`, color: accentColor, borderRadius: '8px', width: '26px', height: '26px', cursor: 'pointer', fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>›</button>
          {offset !== 0 && <button onClick={() => setOffset(0)} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '11px', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'Inter, sans-serif' }}>Cette semaine</button>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', overflowX: 'auto' }}>
        {jours.map((d, i) => {
          const dStr = dateStr(d)
          const evs = evenementsDuJour(dStr)
          const estAujourdhui = dStr === aujourdhuiStr
          return (
            <div key={dStr} style={{
              minWidth: '92px', background: colors.background.sunken, borderRadius: '10px', padding: '8px 6px',
              border: `1px solid ${estAujourdhui ? accentColor : colors.border.faint}`,
              display: 'flex', flexDirection: 'column', gap: '6px',
            }}>
              <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: estAujourdhui ? accentColor : evs.length ? colors.text.faint : colors.text.ghost, textAlign: 'center' }}>
                {JOURS[i]} {d.getDate()}
              </p>
              {evs.length === 0 ? (
                <p style={{ margin: 0, fontSize: '11px', color: colors.text.ghost, textAlign: 'center' }}>—</p>
              ) : evs.map(ev => (
                mode === 'joueur'
                  ? <EvenementJoueur key={ev.id} ev={ev} statut={mesDispos[ev.id]} onChoisir={s => repondre(ev, s)} saving={saving === ev.id} />
                  : <EvenementEducateur key={ev.id} ev={ev} roster={roster} reponses={dispoEquipe[ev.id] || {}} ouvert={evenementOuvert === ev.id} onToggle={() => setEvenementOuvert(o => o === ev.id ? null : ev.id)} />
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
    <div style={{ background: colors.background.surface, border: `1px solid ${couleurType}25`, borderRadius: '8px', padding: '6px' }}>
      <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, color: couleurType, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.titre}</p>
      {ev.heure && <p style={{ margin: '1px 0 5px', fontSize: '9px', color: colors.text.faint }}>{ev.heure.slice(0, 5)}</p>}
      {clos ? (
        <p style={{ margin: '5px 0 0', fontSize: '9px', color: colors.text.ghost }}>🔒 Clos</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
          {OPTIONS_SONDAGE.map(opt => {
            const actif = statut === opt.val
            return (
              <button key={opt.val} title={opt.label} disabled={saving} onClick={() => onChoisir(opt.val)}
                style={{ width: '20px', height: '20px', padding: 0, borderRadius: '50%', background: actif ? `${opt.color}25` : 'transparent', border: `1px solid ${actif ? opt.color : colors.border.default}`, fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {opt.emoji}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EvenementEducateur({ ev, roster, reponses, ouvert, onToggle }) {
  const couleurType = ev.type === 'match' ? colors.accent.blue : colors.accent.green
  const compte = (val) => Object.values(reponses).filter(s => s === val).length
  return (
    <div style={{ background: colors.background.surface, border: `1px solid ${couleurType}25`, borderRadius: '8px', padding: '6px', cursor: 'pointer' }} onClick={onToggle}>
      <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, color: couleurType, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.titre}</p>
      {ev.heure && <p style={{ margin: '1px 0 4px', fontSize: '9px', color: colors.text.faint }}>{ev.heure.slice(0, 5)}</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', fontSize: '9px' }}>
        {OPTIONS_SONDAGE.map(opt => compte(opt.val) > 0 && (
          <span key={opt.val} style={{ color: opt.color, fontWeight: 700 }}>{opt.emoji}{compte(opt.val)}</span>
        ))}
        {Object.keys(reponses).length === 0 && <span style={{ color: colors.text.ghost }}>Aucune réponse</span>}
      </div>
      {ouvert && (
        <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: `1px solid ${colors.border.faint}`, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {roster.map(j => {
            const s = reponses[j.joueur_id]
            const opt = OPTIONS_SONDAGE.find(o => o.val === s)
            return (
              <div key={j.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '4px', fontSize: '9px' }}>
                <span style={{ color: colors.text.faint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.prenom}</span>
                <span style={{ color: opt?.color || colors.text.ghost, flexShrink: 0 }}>{opt ? opt.emoji : '?'}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

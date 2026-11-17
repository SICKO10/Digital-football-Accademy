import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { ZONES, couleurZone } from '../lib/terrainZones'
import { useColors } from '../lib/theme'
import { MapPin } from 'lucide-react'
import { styleCarteLiseree, styleTitreEcran, styleBoutonPrincipal, CLASSE_BOUTON } from '../lib/identite'
import { EtiquetteStatut } from './identite'
import { police } from '../tokens'

// Date du jour au format local YYYY-MM-DD — jamais toISOString() (convertit en
// UTC, ce qui décale la date d'un jour en France, cf. le même bug déjà corrigé
// dans PlanningTerrains.jsx/getDatesSemaine).
const aujourdhuiStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 7 jours glissants (aujourd'hui inclus) au format local YYYY-MM-DD — même
// logique que aujourdhuiStr, jamais toISOString().
const dansSeptJoursStr = () => {
  const d = new Date()
  d.setDate(d.getDate() + 6)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const labelZone = (zone) => ZONES.find(z => z.val === zone)?.label

// Badge de zone : marqueur à la couleur de la zone (mêmes couleurs que le planning
// terrain, pour qu'un créneau libéré en zone 3 se reconnaisse d'un coup d'œil ici
// comme là-bas). 'plein' n'a pas de couleur dédiée dans le planning, donc pas de badge ici.
const BadgeZone = ({ zone, couleurDefaut }) => {
  if (!zone || zone === 'plein') return null
  return <EtiquetteStatut couleur={couleurZone(zone, couleurDefaut)}>{labelZone(zone)}</EtiquetteStatut>
}

export default function TerrainsLiberesWidget({ clubId, userId, titre = 'Terrains disponibles cette semaine' }) {
  const colors = useColors()
  const [creneaux, setCreneaux] = useState([])
  const [recuperes, setRecuperes] = useState([])
  const [loading, setLoading] = useState(true)
  const [reclamingId, setReclamingId] = useState(null)

  // Les libérations passent par planning_terrains_exceptions (date précise),
  // pas par l'ancienne colonne planning_terrains.libere (recurrente par jour
  // de semaine, plus jamais écrite depuis l'introduction des exceptions —
  // cf. liberer_creneau_date dans PlanningTerrains.jsx) : interroger cette
  // colonne ne renvoyait donc plus jamais rien.
  // type='remplacement' = créneau libéré puis repris par un autre éducateur
  // (reclamer_creneau_date) — affiché à part, en confirmation positive.
  // Fenêtre de 7 jours glissants (pas seulement aujourd'hui) : une libération
  // pour un jour à venir (ex: la semaine prochaine) ne remontait jamais tant
  // que ce jour n'était pas encore arrivé.
  const charger = async () => {
    const { data } = await supabase
      .from('planning_terrains_exceptions')
      .select('id, creneau_id, type, date_exception, educateur_id, libere_par, equipe_remplacante, creneau:creneau_id(heure_debut, heure_fin, zone, terrain:terrain_id(nom))')
      .eq('club_id', clubId)
      .in('type', ['liberation', 'remplacement'])
      .gte('date_exception', aujourdhuiStr())
      .lte('date_exception', dansSeptJoursStr())
    const liberes = (data || []).filter(c => c.type === 'liberation')
    const pris = (data || []).filter(c => c.type === 'remplacement')
    const parDateHeure = (a, b) => a.date_exception === b.date_exception
      ? (a.creneau?.heure_debut || '').localeCompare(b.creneau?.heure_debut || '')
      : a.date_exception.localeCompare(b.date_exception)
    setCreneaux(liberes.slice().sort(parDateHeure))
    setRecuperes(pris.slice().sort(parDateHeure))
    setLoading(false)
  }

  // Réutilise la RPC reclamer_creneau_date existante (cf. PlanningTerrains.jsx)
  // plutôt qu'un UPDATE direct : planning_terrains_exceptions n'autorise
  // l'écriture directe qu'aux dirigeants, la RPC (security definer) vérifie
  // elle-même l'affiliation au club avant de faire passer l'exception en
  // 'remplacement'. userId n'est passé que par l'usage éducateur du widget
  // (dashboard club = lecture seule, pas de bouton).
  const prendreCreneau = async (c) => {
    if (!window.confirm(`Prendre le créneau ${c.creneau?.terrain?.nom || 'terrain'} — ${c.creneau?.heure_debut?.slice(0, 5)}–${c.creneau?.heure_fin?.slice(0, 5)} le ${new Date(`${c.date_exception}T00:00:00`).toLocaleDateString('fr-FR')} ?`)) return
    setReclamingId(c.id)
    const { error } = await supabase.rpc('reclamer_creneau_date', { p_creneau_id: c.creneau_id, p_date: c.date_exception })
    setReclamingId(null)
    if (error) { alert('Erreur : ' + error.message); return }
    charger()
  }

  useEffect(() => {
    if (!clubId) return
    charger()

    // Live : dès qu'un éducateur libère (ou reprend) un créneau, le bandeau se met à jour sans reload.
    const channel = supabase
      .channel(`terrains_liberes_${clubId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'planning_terrains_exceptions', filter: `club_id=eq.${clubId}` }, () => charger())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId])

  if (loading || (creneaux.length === 0 && recuperes.length === 0)) return null

  const titreCarte = { ...styleTitreEcran(colors), fontSize: '20px', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '8px' }
  const dateSt = { fontFamily: police.titre, fontWeight: 700, fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.02em', color: colors.text.primary, marginRight: '8px' }
  const ligne = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', fontFamily: police.texte, fontSize: '14px', color: colors.text.secondary, flexWrap: 'wrap' }
  const detail = { color: colors.text.secondary, fontSize: '13px' }

  return (
    <div style={{ ...styleCarteLiseree(colors), marginBottom: '1.5rem' }}>
      {creneaux.length > 0 && (
        <>
          <p style={titreCarte}><MapPin size={18} strokeWidth={2} aria-hidden="true" focusable="false" style={{ flexShrink: 0 }} />{titre}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {creneaux.map(c => (
              <div key={c.id} style={ligne}>
                <span>
                  <span style={dateSt}>
                    {new Date(`${c.date_exception}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })}
                  </span>
                  · {c.creneau?.terrain?.nom || 'Terrain'} · {c.creneau?.heure_debut?.slice(0, 5)}–{c.creneau?.heure_fin?.slice(0, 5)}
                  {' '}<BadgeZone zone={c.creneau?.zone} couleurDefaut={colors.text.dim} />
                  <br />
                  <span style={detail}>libéré par {c.libere_par || '—'}</span>
                </span>
                {userId && c.educateur_id === userId ? (
                  <span style={{ ...detail, fontStyle: 'italic', whiteSpace: 'nowrap' }}>Libéré par moi</span>
                ) : userId ? (
                  <button type="button" onClick={() => prendreCreneau(c)} disabled={reclamingId === c.id} className={CLASSE_BOUTON}
                    style={{ ...styleBoutonPrincipal(colors), minHeight: '36px', padding: '0 14px', fontSize: '13px', flexShrink: 0 }}>
                    {reclamingId === c.id ? '...' : 'Prendre ce créneau'}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </>
      )}

      {recuperes.length > 0 && (
        <div style={{ marginTop: creneaux.length > 0 ? '16px' : 0 }}>
          <p style={titreCarte}>Créneaux récupérés</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recuperes.map(c => (
              <div key={c.id} style={ligne}>
                <span>
                  <span style={dateSt}>
                    {new Date(`${c.date_exception}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })}
                  </span>
                  · {c.creneau?.terrain?.nom || 'Terrain'} · {c.creneau?.heure_debut?.slice(0, 5)}–{c.creneau?.heure_fin?.slice(0, 5)}
                </span>
                <span style={{ ...detail, whiteSpace: 'nowrap' }}>récupéré par {c.equipe_remplacante || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { useColors } from '../lib/theme'
import TerrainZonesSvg from './TerrainZonesSvg'
import PastillePlan from './PastillePlan'
import { principesDeLaPhase, numerosParZone, basculerSelection, selectionDerivee } from '../lib/planDeJeu'

// Affichage en lecture seule d'UNE phase du plan de jeu : le terrain avec ses
// zones et leurs pastilles numérotées, et les principes numérotés à côté (empilés
// sur téléphone). Toucher un principe met sa zone en évidence, toucher une zone
// met ses principes en évidence ; tout est accessible au clavier. Aucune requête
// ici : les données arrivent en props, donc le composant sert aussi bien au
// dashboard joueur qu'à la fiche A4 imprimable.
//
// zones      : lignes terrain_zones de la phase
// principes  : lignes principes_jeu (de cette phase ou de toutes : le tri se fait ici)
// phase      : clé de la phase affichée
// fondUrl    : image de fond du terrain (facultatif)
// photoUrl   : illustration affichée sous les principes (facultatif)
// libelleVide: texte si aucun principe
// ligneSup(p): rendu facultatif ajouté sous un principe (ex. étiquette « Consigne de ton coach »)
// groupes    : facultatif, [{ cle, titre }] pour ranger les principes sous des titres
//              (ex. « Ton poste » puis « Toute l'équipe »). groupeDe(p) donne la clé du groupe.
//              La numérotation ne change pas : elle suit toujours l'ordre de la phase, pour que
//              les pastilles du terrain restent les mêmes que chez le club.
// sansTerrain: n'affiche que la liste des principes (page des coups de pied arrêtés)
// legendeZones: ajoute la liste des zones avec leur explication sous les principes
export default function PlanPhaseLecture({ zones = [], principes = [], phase, fondUrl = null, photoUrl = null, couleur = null, libelleVide = "Aucun principe n'est encore écrit pour cette phase.", ligneSup = null, groupes = null, groupeDe = null, sansTerrain = false, legendeZones = false }) {
  const colors = useColors()
  const [selection, setSelection] = useState(null)
  const zonesPhase = zones.filter(z => !phase || z.phase === phase)
  const liste = principesDeLaPhase(principes, phase)
  const numeros = numerosParZone(liste, zonesPhase)
  const { zoneActiveId, principesActifs } = selectionDerivee(selection, liste)
  const accent = couleur || colors.accent.blue
  const basculer = (type, id) => setSelection(prev => basculerSelection(prev, type, id))

  const ligneDuPrincipe = (p, i) => {
    const zone = zonesPhase.find(z => z.id === p.zone_id) || null
    const actif = principesActifs.has(p.id)
    return (
      <li key={p.id}>
        <button type="button" onClick={() => basculer('principe', p.id)} aria-pressed={actif}
          aria-label={`Principe ${i + 1}${zone ? `, zone ${zone.label}` : ''} : ${p.principe}`}
          style={{
            width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left', cursor: 'pointer', font: 'inherit',
            padding: '10px 12px', borderRadius: 6, minHeight: 44,
            background: actif ? accent + '18' : colors.background.surface,
            border: `1px solid ${actif ? accent : colors.border.subtle}`,
          }}>
          <PastillePlan numero={i + 1} couleur={zone?.couleur || null} actif={actif} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', color: colors.text.primary, fontSize: 14, lineHeight: 1.4 }}>{p.principe}</span>
            {zone && <span style={{ display: 'block', color: colors.text.dim, fontSize: 11, marginTop: 2 }}>Zone : {zone.label}</span>}
            {ligneSup && ligneSup(p)}
          </span>
        </button>
      </li>
    )
  }

  const listeOl = (items) => (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map(({ p, i }) => ligneDuPrincipe(p, i))}
    </ol>
  )
  const indexes = liste.map((p, i) => ({ p, i }))
  const groupesAffiches = groupes && groupeDe
    ? groupes.map(g => ({ ...g, items: indexes.filter(({ p }) => groupeDe(p) === g.cle) })).filter(g => g.items.length > 0)
    : null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: sansTerrain ? '1fr' : 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 24, alignItems: 'start' }}>
      {!sansTerrain && (
        <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 6, padding: 16, display: 'flex', justifyContent: 'center' }}>
          <TerrainZonesSvg zones={zonesPhase} fondUrl={fondUrl} numeros={numeros} zoneActiveId={zoneActiveId} onZoneClick={id => basculer('zone', id)} />
        </div>
      )}

      <div style={{ minWidth: 0 }}>
        {liste.length === 0 ? (
          <p style={{ color: colors.text.dim, fontSize: 13, fontStyle: 'italic', margin: 0 }}>{libelleVide}</p>
        ) : (
          groupesAffiches ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {groupesAffiches.map(g => (
                <section key={g.cle} aria-label={g.titre}>
                  <h3 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: colors.text.dim }}>{g.titre}</h3>
                  {listeOl(g.items)}
                </section>
              ))}
            </div>
          ) : listeOl(indexes)
        )}
        {legendeZones && !sansTerrain && zonesPhase.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: colors.text.dim }}>Les zones du terrain</h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {zonesPhase.map(z => {
                const c = z.couleur || accent
                const actif = zoneActiveId === z.id
                return (
                  <li key={z.id}>
                    <button type="button" onClick={() => basculer('zone', z.id)} aria-pressed={actif}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left', cursor: 'pointer', font: 'inherit',
                        padding: '8px 12px', borderRadius: 6, minHeight: 44,
                        background: actif ? c + '22' : colors.background.surface,
                        border: `1px solid ${actif ? c : colors.border.subtle}`,
                      }}>
                      <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: 3, background: c, flexShrink: 0, marginTop: 4 }} />
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', color: colors.text.primary, fontSize: 13, fontWeight: 700 }}>{z.label}</span>
                        {z.description && <span style={{ display: 'block', color: colors.text.dim, fontSize: 12, lineHeight: 1.4, marginTop: 2 }}>{z.description}</span>}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
        {photoUrl && <img src={photoUrl} alt="" style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 6, display: 'block', marginTop: 14 }} />}
      </div>
    </div>
  )
}

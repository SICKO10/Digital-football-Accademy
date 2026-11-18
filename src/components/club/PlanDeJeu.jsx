import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { basculerSelection } from '../../lib/planDeJeu'
import { PHASES_JEU, RUBRIQUE_CPA } from '../../constants/phasesJeu'
import { SectionPrincipes, SectionZones } from './ProjetSportif'
import BoutonImprimerPlan from '../FichePlanPhase'

// Onglet unique « Plan de jeu » : il remplace les anciens onglets « Principes
// de jeu » et « Zones de terrain ». Une phase à la fois (sélecteur commun) :
// le terrain et ses zones à gauche, les principes à droite ; sur téléphone la
// grille s'empile (terrain en haut, principes dessous). La logique
// d'enregistrement reste celle de SectionZones et SectionPrincipes, qui sont
// réutilisées telles quelles (club et éducateur, lecture seule ou édition).
// Lien principe ↔ zone : principes et zones sont chargés ici une seule fois et
// partagés avec les deux sections (prop « lien »). Un principe peut être
// rattaché à une zone ; sa pastille numérotée apparaît sur la zone, et toucher
// l'un met l'autre en évidence (sélection commune, remise à zéro à chaque
// changement de phase).
// Page CPA : le texte des coups de pied arrêtés, puis les schémas CPA
// offensifs et défensifs l'un sous l'autre.
const PHASES_PLAN = [
  ...PHASES_JEU.map(p => ({ val: p.cle, label: p.long })),
  { val: 'coups_pied_arretes', label: 'Coups de pied arrêtés' },
]

// Deux niveaux : le plan du club (club_categorie_id vide) et les ajouts d'une
// équipe (club_categorie_id rempli).
// - Vue club : tout est affiché, les ajouts des équipes sont en lecture seule
//   avec le nom de l'équipe.
// - Vue éducateur (prop « equipes » = ses équipes de ce pôle) : le plan du club
//   est toujours en lecture seule ; l'éducateur n'ajoute et ne modifie que les
//   lignes de l'équipe choisie, et seulement si « peutAjouter » (droit d'éditer).
export default function PlanDeJeu({ pole, clubId, readOnly, equipes = null, peutAjouter = false }) {
  const colors = useColors()
  const [phase, setPhase] = useState(PHASES_PLAN[0].val)
  const estCpa = phase === 'coups_pied_arretes'
  const [principes, setPrincipes] = useState([])
  const [zones, setZones] = useState([])
  const [selection, setSelection] = useState(null)
  const modeEquipe = Array.isArray(equipes)
  const [equipeChoisie, setEquipeChoisie] = useState(null)
  const equipeId = modeEquipe ? ((equipes.find(e => e.id === equipeChoisie) || equipes[0])?.id || null) : null
  const [nomsClub, setNomsClub] = useState({})
  const nomsEquipes = useMemo(() => {
    if (modeEquipe) return Object.fromEntries(equipes.map(e => [e.id, e.nom]))
    return nomsClub
  }, [modeEquipe, equipes, nomsClub])

  // Vue club : noms des équipes pour étiqueter leurs ajouts
  useEffect(() => {
    if (modeEquipe || !clubId) return
    supabase.from('club_categories').select('id, nom').eq('club_id', clubId)
      .then(({ data }) => setNomsClub(Object.fromEntries((data || []).map(c => [c.id, c.nom]))))
  }, [modeEquipe, clubId])

  // Vue éducateur : le plan du club + les lignes de l'équipe choisie seulement
  const visible = useCallback((l) => !modeEquipe || !l.club_categorie_id || l.club_categorie_id === equipeId, [modeEquipe, equipeId])

  const rechargerPrincipes = useCallback(async () => {
    const { data } = await supabase.from('principes_jeu').select('*').eq('club_id', clubId).eq('pole_key', pole.key).order('ordre')
    setPrincipes(data || [])
  }, [clubId, pole.key])
  const rechargerZones = useCallback(async () => {
    const { data } = await supabase.from('terrain_zones').select('*').eq('club_id', clubId).eq('pole_key', pole.key).order('ordre')
    setZones(data || [])
  }, [clubId, pole.key])
  useEffect(() => { rechargerPrincipes(); rechargerZones() }, [rechargerPrincipes, rechargerZones])

  const principesVisibles = useMemo(() => principes.filter(visible), [principes, visible])
  const zonesVisibles = useMemo(() => zones.filter(visible), [zones, visible])

  const lien = useMemo(() => ({
    principes: principesVisibles, zones: zonesVisibles, rechargerPrincipes, rechargerZones, selection,
    onSelect: (type, id) => setSelection(prev => basculerSelection(prev, type, id)),
    niveau: { equipe: modeEquipe, equipeId, peutAjouter: modeEquipe ? (peutAjouter && !!equipeId) : !readOnly, nomsEquipes },
  }), [principesVisibles, zonesVisibles, rechargerPrincipes, rechargerZones, selection, modeEquipe, equipeId, peutAjouter, readOnly, nomsEquipes])
  // En vue éducateur, le reste du plan (fonds, photos, galerie, CPA) reste celui du club
  const readOnlyClub = readOnly || modeEquipe

  return (
    <div>
      <p style={{ color: colors.text.dim, fontSize: 13, margin: '0 0 16px' }}>
        {readOnlyClub
          ? 'Le plan de jeu du club pour chaque phase : le terrain avec ses zones, et les principes à appliquer.'
          : 'Pour chaque phase de jeu : dessine les zones sur le terrain et écris les principes. Tes joueurs retrouvent le tout dans leur Préparation tactique.'}
      </p>

      {modeEquipe && equipeId && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16, color: colors.text.secondary, fontSize: 13 }}>
          {equipes.length > 1 ? (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Équipe</span>
              <select value={equipeId} onChange={e => { setEquipeChoisie(e.target.value); setSelection(null) }}
                style={{ background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 6, padding: '6px 8px', color: colors.text.primary, fontSize: 13, fontFamily: 'Barlow, sans-serif' }}>
                {equipes.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
              </select>
            </label>
          ) : <span>Équipe : <strong>{equipes[0].nom}</strong></span>}
          <span style={{ color: colors.text.dim, fontSize: 12 }}>
            {peutAjouter ? 'Le plan du club est en lecture seule. Tes ajouts sont visibles seulement par les joueurs de cette équipe.' : 'Le plan du club et ceux de ton équipe sont en lecture seule.'}
          </span>
        </div>
      )}

      <div role="tablist" aria-label="Phases de jeu" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {PHASES_PLAN.map(ph => {
          const actif = phase === ph.val
          return (
            <button key={ph.val} type="button" role="tab" aria-selected={actif} onClick={() => { setPhase(ph.val); setSelection(null) }}
              style={{
                padding: '7px 14px', borderRadius: 4, minHeight: 36, border: `1px solid ${actif ? pole.couleur : colors.border.faint}`,
                background: actif ? pole.couleur + '22' : 'transparent',
                color: actif ? colors.text.primary : colors.text.dim,
                fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Barlow, sans-serif',
              }}>
              {ph.label}
            </button>
          )
        })}
      </div>

      {!estCpa && (
        <div style={{ marginBottom: 16 }}>
          <BoutonImprimerPlan clubId={clubId} poleKey={pole.key} phase={phase} phaseLabel={PHASES_PLAN.find(x => x.val === phase)?.label || ''}
            soustitre={[pole.label, modeEquipe ? equipes.find(e => e.id === equipeId)?.nom : null].filter(Boolean).join(' · ')}
            zones={zonesVisibles} principes={principesVisibles} couleur={pole.couleur} />
        </div>
      )}

      {estCpa ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <SectionPrincipes key="cpa-principes" pole={pole} clubId={clubId} readOnly={readOnlyClub} phaseUnique="coups_pied_arretes" lien={lien} />
          <SectionZones key={RUBRIQUE_CPA.offensif.cle} pole={pole} clubId={clubId} readOnly={readOnlyClub} phaseFixe={RUBRIQUE_CPA.offensif.cle} titre="CPA offensifs" />
          <SectionZones key={RUBRIQUE_CPA.defensif.cle} pole={pole} clubId={clubId} readOnly={readOnlyClub} phaseFixe={RUBRIQUE_CPA.defensif.cle} titre="CPA défensifs" />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 24, alignItems: 'start' }}>
          <SectionZones key={`zones-${phase}`} pole={pole} clubId={clubId} readOnly={readOnlyClub} phaseFixe={phase} compact titre="Terrain" lien={lien} />
          <SectionPrincipes key={`principes-${phase}`} pole={pole} clubId={clubId} readOnly={readOnlyClub} phaseUnique={phase} lien={lien} />
        </div>
      )}
    </div>
  )
}

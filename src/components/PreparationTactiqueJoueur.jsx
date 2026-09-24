import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'
import { getPoleDeCategorie } from '../constants/poles'
import TactipadViewer from './TactipadViewer'
import TerrainZonesSvg from './TerrainZonesSvg'
import DemiTerrainSchema from './DemiTerrainSchema'

// Un terrain + sa légende, pour une phase donnée — brique de base réutilisée
// pour les 6 phases (offensif/défensif/transitions×2/CPA×2). La légende est
// cliquable : sélectionner une zone la fait ressortir sur le terrain (fond
// éclairci pour les autres) — purement une interaction d'affichage, ne
// dépend d'aucun champ supplémentaire côté terrain_zones.
function PanneauZones({ zones, titre, colors, fondUrl }) {
  const [zoneActiveId, setZoneActiveId] = useState(null)
  const st = {
    card: { background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '16px', padding: '16px' },
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '20px', alignItems: 'start' }}>
      <div style={st.card}>
        {titre && <p style={{ color: colors.text.faint, fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px', textAlign: 'center' }}>{titre}</p>}
        <TerrainZonesSvg zones={zones} fondUrl={fondUrl} zoneActiveId={zoneActiveId} onZoneClick={id => setZoneActiveId(prev => prev === id ? null : id)} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {zones.length === 0 ? (
          <div style={{ ...st.card, textAlign: 'center', padding: '32px 16px' }}>
            <p style={{ color: colors.text.disabled, fontSize: '12px', margin: 0 }}>Ton club n'a pas encore personnalisé cette page.</p>
          </div>
        ) : zones.map(z => {
          const couleur = z.couleur || '#4ade80'
          const active = zoneActiveId === z.id
          return (
            <div key={z.id} onClick={() => setZoneActiveId(prev => prev === z.id ? null : z.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', ...st.card, padding: '10px 14px', cursor: 'pointer',
                borderLeft: `3px solid ${active ? couleur : 'transparent'}`,
                background: active ? couleur + '14' : st.card.background,
              }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: couleur, flexShrink: 0 }} />
              <div>
                <div style={{ color: colors.text.primary, fontSize: '12px', fontWeight: 700 }}>{z.label}</div>
                {z.description && <div style={{ color: colors.text.faint, fontSize: '11px' }}>{z.description}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Galerie en lecture seule des schémas CPA d'une phase (autant que le club en
// a créé, cf. ProjetSportif.jsx → SectionZones → "Schémas CPA").
function GalerieCpa({ schemas, colors }) {
  if (schemas.length === 0) return null
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '14px', marginTop: '12px' }}>
      {schemas.map(s => {
        const numeros = Object.keys(s.legende || {}).sort((a, b) => (Number(a) || 0) - (Number(b) || 0))
        return (
          <div key={s.id} style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '12px', padding: '10px' }}>
            <DemiTerrainSchema elements={s.elements || []} />
            <p style={{ margin: '8px 0 0', fontSize: '11px', fontWeight: 700, color: colors.text.primary, textAlign: 'center' }}>{s.nom}</p>
            {numeros.length > 0 && (
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {numeros.map(num => (
                  <p key={num} style={{ margin: 0, fontSize: '10px', color: colors.text.faint }}>
                    <strong style={{ color: colors.text.secondary }}>{num}</strong> — {s.legende[num]}
                  </p>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Galerie en lecture seule d'images de référence supplémentaires d'une phase
// (plusieurs par pôle+phase, sans zones dessus) — cf. ProjetSportif.jsx →
// SectionZones → "Galerie d'images supplémentaires" (terrain_galerie).
function GalerieImages({ images, colors }) {
  if (images.length === 0) return null
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px', marginTop: '12px' }}>
      {images.map(g => (
        <img key={g.id} src={g.image_url} alt="" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: '10px', border: `1px solid ${colors.border.default}`, display: 'block' }} />
      ))}
    </div>
  )
}

const ONGLETS = [
  { key: 'offensif', label: 'Projet Offensif' },
  { key: 'defensif', label: 'Projet Défensif' },
  { key: 'transitions', label: 'Transitions' },
  { key: 'pressing', label: 'Pressing' },
  { key: 'cpa', label: 'CPA' },
  { key: 'schemas', label: 'Schémas partagés' },
]

// Vue joueur du projet tactique du club : les zones de terrain que le club/
// éducateur a personnalisées (table terrain_zones, éditées côté club dans
// ProjetSportif.jsx → SectionZones, et côté éducateur si autorisé), pour son
// propre pôle (déduit de sa catégorie), plus l'onglet "Schémas partagés" qui,
// lui, lit les vrais schémas Tactipad (table tactipads) où
// visible_joueurs = true, appartenant à l'un des éducateurs affiliés au
// joueur (educateurIds). Partage interne distinct du lien public
// (tactipads.partage/partage_slug) : cf. supabase_tactipads_visible_joueurs.sql
// pour la policy RLS qui vérifie l'affiliation acceptée côté base.
export default function PreparationTactiqueJoueur({ educateurIds = [], clubId, categorie, accentColor }) {
  const colors = useColors()
  const accent = accentColor || colors.accent.blue
  const pole = categorie ? getPoleDeCategorie(categorie) : null
  const [onglet, setOnglet] = useState('offensif')
  const [zones, setZones] = useState([])
  const [fondUrls, setFondUrls] = useState({})
  const [cpaSchemas, setCpaSchemas] = useState([])
  const [galerieImages, setGalerieImages] = useState([])
  const [schemas, setSchemas] = useState([])
  const [loadingSchemas, setLoadingSchemas] = useState(true)
  const [schemaActif, setSchemaActif] = useState(null)

  const idsKey = educateurIds.join(',')

  useEffect(() => {
    const charger = async () => {
      if (!educateurIds.length) { setSchemas([]); setLoadingSchemas(false); return }
      setLoadingSchemas(true)
      const { data } = await supabase.from('tactipads').select('*')
        .in('educateur_id', educateurIds).eq('visible_joueurs', true)
        .order('created_at', { ascending: false })
      setSchemas(data || [])
      setLoadingSchemas(false)
    }
    charger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey])

  useEffect(() => {
    const charger = async () => {
      if (!clubId || !pole) { setZones([]); return }
      const { data } = await supabase.from('terrain_zones').select('*').eq('club_id', clubId).eq('pole_key', pole.key).order('ordre')
      setZones(data || [])
    }
    charger()
  }, [clubId, pole?.key])

  // Une image de fond par phase (table terrain_fonds, cf. ProjetSportif.jsx
  // → SectionZones côté club) — pas un seul fond partagé pour tout le club.
  useEffect(() => {
    if (!clubId || !pole) { setFondUrls({}); return }
    supabase.from('terrain_fonds').select('phase, image_url').eq('club_id', clubId).eq('pole_key', pole.key)
      .then(({ data }) => {
        const map = {}
        data?.forEach(f => { map[f.phase] = f.image_url })
        setFondUrls(map)
      })
  }, [clubId, pole?.key])

  useEffect(() => {
    const charger = async () => {
      if (!clubId || !pole) { setCpaSchemas([]); return }
      const { data } = await supabase.from('cpa_schemas').select('*').eq('club_id', clubId).eq('pole_key', pole.key)
        .in('phase', ['cpa_offensif', 'cpa_defensif']).order('ordre')
      setCpaSchemas(data || [])
    }
    charger()
  }, [clubId, pole?.key])

  useEffect(() => {
    if (!clubId || !pole) { setGalerieImages([]); return }
    supabase.from('terrain_galerie').select('*').eq('club_id', clubId).eq('pole_key', pole.key).order('ordre')
      .then(({ data }) => setGalerieImages(data || []))
  }, [clubId, pole?.key])

  const st = {
    card: { background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '16px', padding: '20px' },
  }

  if (schemaActif) {
    return (
      <div style={{ maxWidth: '900px' }}>
        <button onClick={() => setSchemaActif(null)}
          style={{ background: 'none', border: 'none', color: accent, cursor: 'pointer', fontSize: '13px', fontWeight: 700, marginBottom: '16px', padding: 0 }}>
          ← Retour aux schémas
        </button>
        <div style={st.card}>
          <h2 style={{ color: colors.text.primary, margin: '0 0 16px', fontSize: '18px' }}>{schemaActif.nom || 'Sans titre'}</h2>
          <TactipadViewer schema={schemaActif.schema} width={800} />
        </div>
      </div>
    )
  }

  const tabStyle = (actif) => ({
    padding: '10px 16px', borderRadius: '10px', border: 'none',
    background: actif ? colors.background.raised : 'transparent',
    color: actif ? colors.text.primary : colors.text.faint,
    fontWeight: actif ? 700 : 400, fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap',
  })

  const zonesPhase = (phase) => zones.filter(z => z.phase === phase)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '900px' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px', color: colors.text.primary }}>Préparation tactique</h2>
        <p style={{ color: colors.text.faint, fontSize: '13px', margin: 0 }}>Le projet de jeu du club et les schémas partagés par ton éducateur.</p>
      </div>

      <div style={{ display: 'flex', gap: '4px', background: colors.background.sunken, borderRadius: '12px', padding: '4px', width: 'fit-content', maxWidth: '100%', overflowX: 'auto', border: `1px solid ${colors.border.subtle}` }}>
        {ONGLETS.map(o => <button key={o.key} style={tabStyle(onglet === o.key)} onClick={() => setOnglet(o.key)}>{o.label}</button>)}
      </div>

      {!clubId && onglet !== 'schemas' && (
        <div style={{ ...st.card, textAlign: 'center', color: colors.text.faint, fontSize: '13px' }}>
          Affilie-toi à un club pour voir son projet de jeu.
        </div>
      )}

      {clubId && onglet === 'offensif' && (
        <>
          <PanneauZones zones={zonesPhase('attaque')} colors={colors} fondUrl={fondUrls.attaque} />
          <GalerieImages images={galerieImages.filter(g => g.phase === 'attaque')} colors={colors} />
        </>
      )}
      {clubId && onglet === 'defensif' && (
        <>
          <PanneauZones zones={zonesPhase('defense')} colors={colors} fondUrl={fondUrls.defense} />
          <GalerieImages images={galerieImages.filter(g => g.phase === 'defense')} colors={colors} />
        </>
      )}

      {clubId && onglet === 'transitions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <p style={{ color: colors.text.secondary, fontWeight: 700, fontSize: '13px', marginBottom: '12px' }}>Transition offensive</p>
            <PanneauZones zones={zonesPhase('transition_att')} colors={colors} fondUrl={fondUrls.transition_att} />
            <GalerieImages images={galerieImages.filter(g => g.phase === 'transition_att')} colors={colors} />
          </div>
          <div>
            <p style={{ color: colors.text.secondary, fontWeight: 700, fontSize: '13px', marginBottom: '12px' }}>Transition défensive</p>
            <PanneauZones zones={zonesPhase('transition_def')} colors={colors} fondUrl={fondUrls.transition_def} />
            <GalerieImages images={galerieImages.filter(g => g.phase === 'transition_def')} colors={colors} />
          </div>
        </div>
      )}

      {clubId && onglet === 'pressing' && (
        <>
          <PanneauZones zones={zonesPhase('pressing')} colors={colors} fondUrl={fondUrls.pressing} />
          <GalerieImages images={galerieImages.filter(g => g.phase === 'pressing')} colors={colors} />
        </>
      )}

      {clubId && onglet === 'cpa' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <p style={{ color: colors.text.secondary, fontWeight: 700, fontSize: '13px', marginBottom: '12px' }}>CPA offensifs</p>
            <PanneauZones zones={zonesPhase('cpa_offensif')} colors={colors} fondUrl={fondUrls.cpa_offensif} />
            <GalerieCpa schemas={cpaSchemas.filter(s => s.phase === 'cpa_offensif')} colors={colors} />
            <GalerieImages images={galerieImages.filter(g => g.phase === 'cpa_offensif')} colors={colors} />
          </div>
          <div>
            <p style={{ color: colors.text.secondary, fontWeight: 700, fontSize: '13px', marginBottom: '12px' }}>CPA défensifs</p>
            <PanneauZones zones={zonesPhase('cpa_defensif')} colors={colors} fondUrl={fondUrls.cpa_defensif} />
            <GalerieCpa schemas={cpaSchemas.filter(s => s.phase === 'cpa_defensif')} colors={colors} />
            <GalerieImages images={galerieImages.filter(g => g.phase === 'cpa_defensif')} colors={colors} />
          </div>
        </div>
      )}

      {onglet === 'schemas' && (
        loadingSchemas ? <p style={{ color: colors.text.disabled, fontSize: '13px' }}>Chargement...</p> : (
          schemas.length === 0 ? (
            <div style={{ ...st.card, padding: '48px 20px', textAlign: 'center' }}>
              <p style={{ color: colors.text.disabled, fontWeight: 600, fontSize: '14px', margin: '0 0 4px' }}>Aucun schéma disponible</p>
              <p style={{ color: colors.text.ghost, fontSize: '12px', margin: 0 }}>Ton éducateur n'a pas encore partagé de schéma tactique.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
              {schemas.map(s => (
                <div key={s.id} onClick={() => setSchemaActif(s)}
                  style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '12px', padding: '16px', cursor: 'pointer' }}>
                  <div style={{ background: colors.background.sunken, borderRadius: '8px', height: '100px', marginBottom: '12px' }} />
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: colors.text.primary }}>{s.nom || 'Sans titre'}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: colors.text.faint }}>
                    Mis à jour le {new Date(s.updated_at || s.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              ))}
            </div>
          )
        )
      )}
    </div>
  )
}

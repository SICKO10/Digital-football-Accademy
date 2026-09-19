import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'
import TactipadViewer from './TactipadViewer'

function TerrainOffensif() {
  const W = 260, H = 360
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: 280, borderRadius: 12, display: 'block' }}>
      <rect width={W} height={H} fill="#2d5a1b" rx="8" />
      <rect x={0} y={0} width={32} height={H} fill="#3a7a22" />
      <text x={16} y={H / 2} fill="white" fontSize={9} fontWeight="700" textAnchor="middle" dominantBaseline="middle" transform={`rotate(-90,16,${H / 2})`} letterSpacing="1">COULOIR GAUCHE</text>
      <rect x={W - 32} y={0} width={32} height={H} fill="#3a7a22" />
      <text x={W - 16} y={H / 2} fill="white" fontSize={9} fontWeight="700" textAnchor="middle" dominantBaseline="middle" transform={`rotate(90,${W - 16},${H / 2})`} letterSpacing="1">COULOIR DROIT</text>

      <rect x={32} y={H * 0.72} width={W - 64} height={H * 0.28} fill="#c8d8c0" />
      <text x={W / 2} y={H * 0.86} fill="#2d5a1b" fontSize={10} fontWeight="700" textAnchor="middle" dominantBaseline="middle">ZONE D'INITIATION</text>
      <rect x={W / 2 - 22} y={H - 18} width={44} height={14} fill="none" stroke="white" strokeWidth="1.5" />

      <rect x={32} y={H * 0.57} width={W - 64} height={H * 0.15} fill="#b8791a" />
      <text x={W / 2} y={H * 0.645} fill="white" fontSize={11} fontWeight="800" textAnchor="middle" dominantBaseline="middle">LA BASE</text>

      <rect x={32} y={H * 0.42} width={(W - 64) / 3} height={H * 0.15} fill="#c9a227" />
      <text x={32 + (W - 64) / 6} y={H * 0.485} fill="white" fontSize={8} fontWeight="700" textAnchor="middle" dominantBaseline="middle">CARRÉ</text>
      <text x={32 + (W - 64) / 6} y={H * 0.505} fill="white" fontSize={8} fontWeight="700" textAnchor="middle" dominantBaseline="middle">GAUCHE</text>
      <rect x={32 + (W - 64) / 3} y={H * 0.42} width={(W - 64) / 3} height={H * 0.15} fill="#b89020" />
      <text x={W / 2} y={H * 0.495} fill="white" fontSize={8} fontWeight="700" textAnchor="middle" dominantBaseline="middle">CARRÉ AXE</text>
      <rect x={32 + (W - 64) * 2 / 3} y={H * 0.42} width={(W - 64) / 3} height={H * 0.15} fill="#c9a227" />
      <text x={W - 32 - (W - 64) / 6} y={H * 0.485} fill="white" fontSize={8} fontWeight="700" textAnchor="middle" dominantBaseline="middle">CARRÉ</text>
      <text x={W - 32 - (W - 64) / 6} y={H * 0.505} fill="white" fontSize={8} fontWeight="700" textAnchor="middle" dominantBaseline="middle">DROIT</text>

      <rect x={32} y={H * 0.16} width={W - 64} height={H * 0.26} fill="#1a6ba8" />
      <text x={W / 2} y={H * 0.29} fill="white" fontSize={13} fontWeight="800" textAnchor="middle" dominantBaseline="middle">PROFONDEUR</text>
      <circle cx={W / 2} cy={H * 0.42} r={20} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />

      <rect x={W / 2 - 24} y={H * 0.06} width={48} height={H * 0.10} fill="#c0392b" rx="4" />
      <text x={W / 2} y={H * 0.11} fill="white" fontSize={8} fontWeight="800" textAnchor="middle" dominantBaseline="middle">GOLDEN</text>
      <text x={W / 2} y={H * 0.135} fill="white" fontSize={8} fontWeight="800" textAnchor="middle" dominantBaseline="middle">ZONE</text>

      <rect x={W / 2 - 22} y={4} width={44} height={14} fill="none" stroke="white" strokeWidth="1.5" />
      <rect x={W / 2 - 44} y={4} width={88} height={38} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />

      <rect x={32} y={4} width={W - 64} height={H - 8} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
    </svg>
  )
}

function TerrainDefensif() {
  const W = 260, H = 360
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: 280, borderRadius: 12, display: 'block' }}>
      <rect width={W} height={H} fill="#2d5a1b" rx="8" />
      <rect x={0} y={0} width={32} height={H} fill="#3a7a22" />
      <text x={16} y={H / 2} fill="white" fontSize={9} fontWeight="700" textAnchor="middle" dominantBaseline="middle" transform={`rotate(-90,16,${H / 2})`} letterSpacing="1">COULOIR GAUCHE</text>
      <rect x={W - 32} y={0} width={32} height={H} fill="#3a7a22" />
      <text x={W - 16} y={H / 2} fill="white" fontSize={9} fontWeight="700" textAnchor="middle" dominantBaseline="middle" transform={`rotate(90,${W - 16},${H / 2})`} letterSpacing="1">COULOIR DROIT</text>

      <rect x={32} y={H * 0.04} width={W - 64} height={H * 0.24} fill="#a8c4d4" />
      <text x={W / 2} y={H * 0.12} fill="#1a3a4a" fontSize={9} fontWeight="700" textAnchor="middle" dominantBaseline="middle">ZONE D'INITIATION</text>
      <text x={W / 2} y={H * 0.155} fill="#1a3a4a" fontSize={9} fontWeight="700" textAnchor="middle" dominantBaseline="middle">DÉFENSIVE</text>
      <rect x={W / 2 - 22} y={4} width={44} height={14} fill="none" stroke="white" strokeWidth="1.5" />
      <rect x={W / 2 - 44} y={4} width={88} height={38} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />

      <rect x={32} y={H * 0.28} width={W - 64} height={H * 0.15} fill="#b8791a" />
      <text x={W / 2} y={H * 0.355} fill="white" fontSize={11} fontWeight="800" textAnchor="middle" dominantBaseline="middle">LA BASE DÉFENSIVE</text>

      <rect x={32} y={H * 0.43} width={(W - 64) / 3} height={H * 0.15} fill="#c9a227" />
      <text x={32 + (W - 64) / 6} y={H * 0.505} fill="white" fontSize={7.5} fontWeight="700" textAnchor="middle" dominantBaseline="middle">CARRÉ DÉF.</text>
      <text x={32 + (W - 64) / 6} y={H * 0.525} fill="white" fontSize={7.5} fontWeight="700" textAnchor="middle" dominantBaseline="middle">GAUCHE</text>
      <rect x={32 + (W - 64) / 3} y={H * 0.43} width={(W - 64) / 3} height={H * 0.15} fill="#b89020" />
      <text x={W / 2} y={H * 0.505} fill="white" fontSize={7.5} fontWeight="700" textAnchor="middle" dominantBaseline="middle">CARRÉ DÉF.</text>
      <text x={W / 2} y={H * 0.525} fill="white" fontSize={7.5} fontWeight="700" textAnchor="middle" dominantBaseline="middle">AXE</text>
      <rect x={32 + (W - 64) * 2 / 3} y={H * 0.43} width={(W - 64) / 3} height={H * 0.15} fill="#c9a227" />
      <text x={W - 32 - (W - 64) / 6} y={H * 0.505} fill="white" fontSize={7.5} fontWeight="700" textAnchor="middle" dominantBaseline="middle">CARRÉ DÉF.</text>
      <text x={W - 32 - (W - 64) / 6} y={H * 0.525} fill="white" fontSize={7.5} fontWeight="700" textAnchor="middle" dominantBaseline="middle">DROIT</text>

      <circle cx={W / 2} cy={H * 0.58} r={20} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />

      <rect x={32} y={H * 0.58} width={W - 64} height={H * 0.38} fill="#1a6ba8" />
      <text x={W / 2} y={H * 0.77} fill="white" fontSize={13} fontWeight="800" textAnchor="middle" dominantBaseline="middle">PROFONDEUR</text>
      <text x={W / 2} y={H * 0.80} fill="white" fontSize={13} fontWeight="800" textAnchor="middle" dominantBaseline="middle">DÉFENSIVE</text>
      <rect x={W / 2 - 22} y={H - 18} width={44} height={14} fill="none" stroke="white" strokeWidth="1.5" />
      <rect x={W / 2 - 44} y={H - 52} width={88} height={38} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />

      <rect x={32} y={4} width={W - 64} height={H - 8} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
    </svg>
  )
}

const IDEES_OFFENSIVES = [
  { num: '01', titre: 'Attraction', couleur: '#888', desc: "Attirer la pression pour jouer son contre-pied et progresser." },
  { num: '02', titre: 'Rythme — Éliminer', couleur: '#e74c3c', desc: "Contrôler le tempo pour désynchroniser l'adversaire. Alterner fixation, pause et accélération." },
  { num: '03', titre: 'Profondeur', couleur: '#b8860b', desc: "Menacer la dernière ligne pour étirer le bloc et ouvrir des intervalles." },
]

const ZONES_OFFENSIVES = [
  { label: "Zone d'initiation", desc: 'Construction depuis la défense', color: '#c8d8c0' },
  { label: 'La Base', desc: 'Zone de transition et relance', color: '#b8791a' },
  { label: 'Carrés (G / Axe / D)', desc: 'Zone de combinaison et fixation', color: '#c9a227' },
  { label: 'Profondeur', desc: 'Attaque de l\'espace dans le dos', color: '#1a6ba8' },
  { label: 'Golden Zone', desc: 'Zone de finition prioritaire', color: '#c0392b' },
]

const ZONES_DEFENSIVES = [
  { label: "Zone d'initiation déf.", desc: "Pressing haut — forcer l'erreur", color: '#a8c4d4' },
  { label: 'La Base défensive', desc: 'Organisation du bloc', color: '#b8791a' },
  { label: 'Carrés défensifs', desc: 'Fermeture des couloirs internes', color: '#c9a227' },
  { label: 'Profondeur défensive', desc: 'Bloc bas — défendre la surface', color: '#1a6ba8' },
]

const PRESSINGS = [
  { label: 'Pressing 6m', color: '#888' },
  { label: 'Pressing haut', color: '#8b4513' },
  { label: 'Bloc médian', color: '#c9a227' },
  { label: 'Bloc bas', color: '#8b4513' },
]

const PRINCIPES_DEFENSIFS = [
  { titre: 'PROACTIF', desc: "Prise d'initiative, anticiper l'action", color: '#4ade80' },
  { titre: 'AGRESSIF', desc: 'Pression immédiate sur le porteur', color: '#f59e0b' },
  { titre: 'ÉNERGIQUE', desc: 'Bloc compact, pressing collectif intense', color: '#f87171' },
]

// Vue joueur du projet tactique du club : deux onglets pédagogiques (idées
// et zones du terrain, offensif/défensif — contenu fixe, mêmes principes
// pour tous les joueurs) et un onglet "Schémas partagés" qui, lui, lit les
// vrais schémas Tactipad (table tactipads) où visible_joueurs = true,
// appartenant à l'un des éducateurs affiliés au joueur (educateurIds).
// Partage interne distinct du lien public (tactipads.partage/partage_slug) :
// cf. supabase_tactipads_visible_joueurs.sql pour la policy RLS qui vérifie
// l'affiliation acceptée côté base.
export default function PreparationTactiqueJoueur({ educateurIds = [], accentColor }) {
  const colors = useColors()
  const accent = accentColor || colors.accent.blue
  const [onglet, setOnglet] = useState('offensif')
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

  const st = {
    card: { background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '16px', padding: '20px' },
    label: { color: colors.text.faint, fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' },
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
    padding: '10px 18px', borderRadius: '10px', border: 'none',
    background: actif ? colors.background.raised : 'transparent',
    color: actif ? colors.text.primary : colors.text.faint,
    fontWeight: actif ? 700 : 400, fontSize: '13px', cursor: 'pointer',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '900px' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px', color: colors.text.primary }}>Préparation tactique</h2>
        <p style={{ color: colors.text.faint, fontSize: '13px', margin: 0 }}>Le projet de jeu du club et les schémas partagés par ton éducateur.</p>
      </div>

      <div style={{ display: 'flex', gap: '4px', background: colors.background.sunken, borderRadius: '12px', padding: '4px', width: 'fit-content', border: `1px solid ${colors.border.subtle}` }}>
        <button style={tabStyle(onglet === 'offensif')} onClick={() => setOnglet('offensif')}>Projet Offensif</button>
        <button style={tabStyle(onglet === 'defensif')} onClick={() => setOnglet('defensif')}>Projet Défensif</button>
        <button style={tabStyle(onglet === 'schemas')} onClick={() => setOnglet('schemas')}>Schémas partagés</button>
      </div>

      {onglet === 'offensif' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={st.card}>
            <p style={st.label}>Structure en 3 idées</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
              {IDEES_OFFENSIVES.map(i => (
                <div key={i.num} style={{ background: colors.background.sunken, borderRadius: '12px', padding: '16px 14px', border: `1px solid ${i.couleur}30` }}>
                  <div style={{ color: i.couleur, fontSize: '26px', fontWeight: 900, lineHeight: 1, marginBottom: '6px' }}>{i.num}</div>
                  <div style={{ color: colors.text.primary, fontWeight: 800, fontSize: '13px', marginBottom: '8px', lineHeight: 1.3 }}>{i.titre}</div>
                  <div style={{ color: colors.text.faint, fontSize: '11px', lineHeight: 1.5 }}>{i.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '20px', alignItems: 'start' }}>
            <div style={st.card}>
              <p style={{ ...st.label, textAlign: 'center' }}>Ce qui se passe en bas détermine ce qui va se passer en haut</p>
              <TerrainOffensif />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={st.label}>Légende des zones</p>
              {ZONES_OFFENSIVES.map(z => (
                <div key={z.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', ...st.card, padding: '10px 14px' }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: z.color, flexShrink: 0 }} />
                  <div>
                    <div style={{ color: colors.text.primary, fontSize: '12px', fontWeight: 700 }}>{z.label}</div>
                    <div style={{ color: colors.text.faint, fontSize: '11px' }}>{z.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {onglet === 'defensif' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={st.card}>
            <p style={st.label}>Intensité défensive</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
              {PRINCIPES_DEFENSIFS.map(p => (
                <div key={p.titre} style={{ background: colors.background.sunken, borderRadius: '12px', padding: '16px 14px', borderLeft: `3px solid ${p.color}` }}>
                  <div style={{ color: p.color, fontWeight: 800, fontSize: '13px', marginBottom: '6px' }}>{p.titre}</div>
                  <div style={{ color: colors.text.faint, fontSize: '11px', lineHeight: 1.5 }}>{p.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '20px', alignItems: 'start' }}>
            <div style={st.card}>
              <p style={{ ...st.label, textAlign: 'center' }}>Ce qui se passe en haut détermine ce qui va se passer en bas</p>
              <TerrainDefensif />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={st.label}>Légende des zones</p>
              {ZONES_DEFENSIVES.map(z => (
                <div key={z.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', ...st.card, padding: '10px 14px' }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: z.color, flexShrink: 0 }} />
                  <div>
                    <div style={{ color: colors.text.primary, fontSize: '12px', fontWeight: 700 }}>{z.label}</div>
                    <div style={{ color: colors.text.faint, fontSize: '11px' }}>{z.desc}</div>
                  </div>
                </div>
              ))}
              <div style={{ ...st.card, marginTop: '8px' }}>
                <p style={{ ...st.label, marginBottom: '10px' }}>Types de pressing</p>
                {PRESSINGS.map(p => (
                  <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: p.color, flexShrink: 0 }} />
                    <span style={{ color: colors.text.secondary, fontSize: '11px' }}>{p.label}</span>
                  </div>
                ))}
              </div>
            </div>
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

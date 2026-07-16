import { useState } from 'react'

export const GRILLE_SEANCE = [
  { key: 'preparation', label: '1. Préparation de la séance', criteres: [
    { key: 'objectif_clair', label: 'Objectif clair' },
    { key: 'organisation_materiel', label: 'Organisation du matériel' },
    { key: 'installation_avant', label: "Installation avant l'arrivée des joueurs" },
  ]},
  { key: 'animation', label: '2. Animation de la séance', criteres: [
    { key: 'dynamisme', label: 'Dynamisme' },
    { key: 'gestion_temps', label: 'Gestion du temps' },
    { key: 'rythme', label: 'Rythme de la séance' },
    { key: 'fluidite_transitions', label: 'Fluidité des transitions' },
    { key: 'intensite', label: 'Intensité recherchée' },
    { key: 'gestion_temps_morts', label: 'Gestion des temps morts' },
  ]},
  { key: 'pedagogie', label: '3. Qualité pédagogique', criteres: [
    { key: 'explications', label: 'Explications simples et précises' },
    { key: 'demonstrations', label: 'Démonstrations' },
    { key: 'corrections_individuelles', label: 'Corrections individuelles' },
    { key: 'corrections_collectives', label: 'Corrections collectives' },
    { key: 'adaptation_exercices', label: 'Adaptation des exercices' },
  ]},
  { key: 'management', label: '4. Management', criteres: [
    { key: 'leadership', label: 'Leadership' },
    { key: 'communication', label: 'Communication' },
    { key: 'motivation', label: 'Motivation des joueurs' },
    { key: 'discipline', label: 'Discipline' },
    { key: 'gestion_comportements', label: 'Gestion des comportements' },
  ]},
  { key: 'football', label: '5. Contenu footballistique', criteres: [
    { key: 'coherence_theme', label: 'Cohérence avec le thème' },
    { key: 'travail_tactique', label: 'Travail tactique' },
    { key: 'travail_technique', label: 'Travail technique' },
    { key: 'sollicitations_cognitives', label: "Sollicitations cognitives (prise d'information, choix...)" },
    { key: 'respect_projet', label: 'Respect du projet de jeu' },
  ]},
]

export const GRILLE_BONUS = [
  { key: 'climat_positif', label: 'Climat positif' },
  { key: 'plaisir_joueurs', label: 'Plaisir des joueurs' },
  { key: 'exigence', label: 'Exigence' },
  { key: 'individualisation', label: 'Individualisation' },
]

export const calculerNoteDomaine = (grilleCriteres, domaineKey) => {
  const domaine = GRILLE_SEANCE.find(d => d.key === domaineKey)
  const vals = domaine.criteres.map(c => grilleCriteres[c.key]).filter(Boolean)
  if (vals.length === 0) return 0
  const moyenneSur5 = vals.reduce((s, v) => s + v, 0) / vals.length
  return Math.round((moyenneSur5 / 5) * 20 * 10) / 10
}

// Composant modal réutilisable de la grille (le formulaire lui-même)
export function ModalGrilleSeance({ seance, onClose, onSubmit, evaluateurType }) {
  const [grilleCriteres, setGrilleCriteres] = useState({})
  const [grilleObservations, setGrilleObservations] = useState({ points_forts: '', axes_amelioration: '', actions: '' })
  const [saving, setSaving] = useState(false)

  const st = {
    label: { fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' },
    input: { background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', padding: '9px 12px', fontSize: '13px', boxSizing: 'border-box', width: '100%' },
  }

  const handleSubmit = async () => {
    setSaving(true)
    const notesDomaines = {
      note_preparation: calculerNoteDomaine(grilleCriteres, 'preparation'),
      note_animation: calculerNoteDomaine(grilleCriteres, 'animation'),
      note_pedagogie: calculerNoteDomaine(grilleCriteres, 'pedagogie'),
      note_management: calculerNoteDomaine(grilleCriteres, 'management'),
      note_football: calculerNoteDomaine(grilleCriteres, 'football'),
    }
    const note_totale = Math.round(Object.values(notesDomaines).reduce((s, v) => s + v, 0) * 10) / 10
    await onSubmit({ criteres: grilleCriteres, ...notesDomaines, note_totale, ...grilleObservations, evaluateurType })
    setSaving(false)
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '20px', width: '100%', maxWidth: '700px', padding: '24px', margin: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '16px' }}>📋 Grille d'évaluation — {seance.theme || 'Séance'}</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>
        <p style={{ margin: '0 0 20px', fontSize: '12px', color: '#666' }}>{seance.educateur?.prenom} {seance.educateur?.nom} — {seance.saison}</p>

        {GRILLE_SEANCE.map(domaine => (
          <div key={domaine.key} style={{ background: '#111', borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: '#4ade80' }}>{domaine.label}</p>
              <span style={{ fontSize: '12px', color: '#666' }}>{calculerNoteDomaine(grilleCriteres, domaine.key)}/20</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {domaine.criteres.map(c => (
                <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ flex: 1, fontSize: '12px', color: '#aaa' }}>{c.label}</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => setGrilleCriteres(prev => ({ ...prev, [c.key]: n }))}
                        style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: (grilleCriteres[c.key] || 0) >= n ? '#4ade80' : '#2a2a2a', padding: '2px', lineHeight: 1 }}>★</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={{ background: '#111', borderRadius: '12px', padding: '14px', marginBottom: '16px', border: '1px solid #fbbf2430' }}>
          <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '13px', color: '#fbbf24' }}>✨ Bonus</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {GRILLE_BONUS.map(c => (
              <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ flex: 1, fontSize: '12px', color: '#aaa' }}>{c.label}</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setGrilleCriteres(prev => ({ ...prev, [c.key]: n }))}
                      style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: (grilleCriteres[c.key] || 0) >= n ? '#fbbf24' : '#2a2a2a', padding: '2px', lineHeight: 1 }}>★</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#4ade8010', border: '1px solid #4ade8030', borderRadius: '12px', padding: '14px', marginBottom: '16px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#4ade80', fontWeight: 700 }}>
            NOTE TOTALE : {GRILLE_SEANCE.reduce((s, d) => s + calculerNoteDomaine(grilleCriteres, d.key), 0).toFixed(1)}/100
          </p>
        </div>

        {[
          { key: 'points_forts', label: 'Points forts' },
          { key: 'axes_amelioration', label: "Axes d'amélioration" },
          { key: 'actions', label: 'Actions à mettre en place' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: '12px' }}>
            <label style={st.label}>{f.label}</label>
            <textarea
              value={grilleObservations[f.key]}
              onChange={e => setGrilleObservations(prev => ({ ...prev, [f.key]: e.target.value }))}
              style={{ ...st.input, minHeight: '60px', resize: 'vertical', fontFamily: 'Inter, sans-serif' }}
            />
          </div>
        ))}

        <button onClick={handleSubmit} disabled={saving}
          style={{ width: '100%', background: '#4ade80', color: '#000', border: 'none', borderRadius: '12px', padding: '14px', fontWeight: 800, fontSize: '14px', cursor: 'pointer', marginTop: '10px' }}>
          {saving ? '⏳ Envoi...' : '✅ Valider l\'évaluation'}
        </button>
      </div>
    </div>
  )
}

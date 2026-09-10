import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'

// ── Guide Projet FFF — certification CFF4 (BMF) ─────────────────────────────

const ETAPES = [
  { key: 'identite',   label: 'Identité',      desc: "Carte d'identité du club" },
  { key: 'diagnostic', label: 'Diagnostic',    desc: "Toile d'araignée — 10 axes" },
  { key: 'objectifs',  label: 'Objectifs',     desc: "Axes d'amélioration" },
  { key: 'actions',    label: "Plan d'actions", desc: 'Fiches action + calendrier' },
  { key: 'suivi',      label: 'Suivi',         desc: 'Évaluation & bilan' },
]

const AXES_DIAGNOSTIC = [
  { key: 'note_attraction',     label: "Pouvoir d'attraction",         projet: 'Associatif', color: '#3b82f6' },
  { key: 'note_accueil',        label: "Qualité de l'accueil",         projet: 'Associatif', color: '#3b82f6' },
  { key: 'note_fidelisation',   label: 'Fidélisation',                 projet: 'Associatif', color: '#3b82f6' },
  { key: 'note_environnement',  label: 'Environnement',                projet: 'Associatif', color: '#3b82f6' },
  { key: 'note_encadrement',    label: 'Encadrement',                  projet: 'Sportif',    color: '#4ade80' },
  { key: 'note_offre_pratiques',label: 'Offre de pratiques',           projet: 'Sportif',    color: '#4ade80' },
  { key: 'note_niveau_normes',  label: 'Niveau & normes',              projet: 'Sportif',    color: '#4ade80' },
  { key: 'note_esprit_jeu',     label: 'Esprit du jeu',                projet: 'Éducatif',   color: '#f59e0b' },
  { key: 'note_regles_vie',     label: 'Règles de vie / citoyenneté',  projet: 'Éducatif',   color: '#f59e0b' },
  { key: 'note_regles_jeu',     label: 'Règles du jeu / arbitrage',    projet: 'Éducatif',   color: '#f59e0b' },
]

const OBJECTIFS_PAR_PROJET = {
  associatif: [
    "Renforcer le pouvoir d'attraction",
    "Optimiser la qualité de l'accueil",
    'Renforcer la fidélisation',
    "Améliorer les relations avec l'environnement",
  ],
  sportif: [
    "Renforcer l'encadrement",
    'Augmenter les niveaux et normes de pratiques',
    "Développer l'offre de pratiques",
  ],
  educatif: [
    'Développer les règles de vie et la citoyenneté',
    "Intégrer les règles du jeu et sensibiliser à l'arbitrage",
    "Développer l'esprit du jeu",
  ],
}

const MOIS = ['Sept', 'Oct', 'Nov', 'Déc', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août']

const IDENTITE_VIDE = {
  valeurs: ['', '', '', '', ''],
  slogan: '', date_creation: '', numero_affiliation: '',
  couleurs: '', club_omnisport: false, nb_licencies: '',
  competition_plus_haute: '', president: '', secretaire: '', tresorier: '',
}
const DIAGNOSTIC_VIDE = {
  note_attraction: 0, note_accueil: 0, note_fidelisation: 0,
  note_environnement: 0, note_encadrement: 0, note_offre_pratiques: 0,
  note_niveau_normes: 0, note_esprit_jeu: 0, note_regles_vie: 0,
  note_regles_jeu: 0, details: {},
}
const ACTION_VIDE = {
  sous_projet: 'associatif', objectif_general: 1, axe_amelioration: '',
  intitule: '', resume: '', date_action: '', public_concerne: '',
  responsable: '', budget_recettes: 0, budget_depenses: 0,
  criteres_qualitatifs: '', criteres_quantitatifs: '',
  mois_calendrier: [], statut: 'planifiee',
}

export default function ProjetClubCFF4({ userId, clubId }) {
  const colors = useColors()
  const [etape, setEtape] = useState('identite')
  const [saison, setSaison] = useState('2026-2027')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const [identite, setIdentite] = useState(IDENTITE_VIDE)
  const [diagnostic, setDiagnostic] = useState(DIAGNOSTIC_VIDE)
  const [objectifs, setObjectifs] = useState({})
  const [actions, setActions] = useState([])
  const [showNewAction, setShowNewAction] = useState(false)
  const [newAction, setNewAction] = useState(ACTION_VIDE)

  useEffect(() => { if (clubId) charger() }, [clubId, saison])

  async function charger() {
    setLoading(true)
    const [r1, r2, r3, r4] = await Promise.all([
      supabase.from('cff4_identite').select('*').eq('club_id', clubId).eq('saison', saison).maybeSingle(),
      supabase.from('cff4_diagnostic').select('*').eq('club_id', clubId).eq('saison', saison).maybeSingle(),
      supabase.from('cff4_objectifs').select('*').eq('club_id', clubId).eq('saison', saison),
      supabase.from('cff4_actions').select('*').eq('club_id', clubId).eq('saison', saison).order('created_at'),
    ])
    setIdentite(r1.data || IDENTITE_VIDE)
    setDiagnostic(r2.data || DIAGNOSTIC_VIDE)
    const obj = {}
    ;(r3.data || []).forEach(o => { obj[`${o.sous_projet}_${o.objectif_general}`] = o })
    setObjectifs(obj)
    setActions(r4.data || [])
    setLoading(false)
  }

  async function sauvegarderIdentite() {
    await supabase.from('cff4_identite').upsert({
      club_id: clubId, educateur_id: userId, saison, ...identite,
    }, { onConflict: 'club_id,saison' })
    flashSaved()
  }

  async function sauvegarderDiagnostic() {
    await supabase.from('cff4_diagnostic').upsert({
      club_id: clubId, educateur_id: userId, saison, ...diagnostic,
    }, { onConflict: 'club_id,saison' })
    flashSaved()
  }

  async function ajouterAction() {
    if (!newAction.intitule) return
    await supabase.from('cff4_actions').insert({
      club_id: clubId, educateur_id: userId, saison, ...newAction,
    })
    setShowNewAction(false)
    setNewAction(ACTION_VIDE)
    charger()
  }

  async function supprimerAction(id) {
    await supabase.from('cff4_actions').delete().eq('id', id)
    charger()
  }

  function flashSaved() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // ── Score global
  const scoreTotal = Math.round(
    AXES_DIAGNOSTIC.reduce((s, a) => s + (diagnostic[a.key] || 0), 0) / AXES_DIAGNOSTIC.length * 10
  ) / 10

  // ── Styles
  const inp = {
    width: '100%', background: colors.background.raised,
    border: `1px solid ${colors.border.subtle}`, borderRadius: '8px',
    padding: '10px 14px', color: colors.text.primary,
    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  }
  const btn = {
    background: '#4ade80', color: '#000', border: 'none',
    borderRadius: '8px', padding: '10px 20px', fontWeight: 700,
    fontSize: '14px', cursor: 'pointer',
  }
  const label = { color: colors.text.faint, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '6px' }
  const card = { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '12px', padding: '24px' }

  if (!clubId) {
    return <p style={{ color: colors.text.faint, fontSize: '13px', textAlign: 'center', padding: '40px' }}>Affilie-toi d'abord à un club pour accéder au Projet Club — CFF4.</p>
  }

  return (
    <div style={{ padding: '4px', maxWidth: '1000px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ color: '#4ade80', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>Formation fédérale</div>
          <h1 style={{ color: colors.text.primary, fontSize: '22px', fontWeight: 900, margin: 0 }}>Projet Club — CFF4</h1>
          <p style={{ color: colors.text.faint, fontSize: '13px', margin: '4px 0 0' }}>Certificat Fédéral de Football 4 · BMF · FFF</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {saved && <span style={{ color: '#4ade80', fontSize: '13px', fontWeight: 700 }}>Enregistré</span>}
          <select value={saison} onChange={e => setSaison(e.target.value)} style={{ ...inp, width: 'auto', padding: '8px 12px' }}>
            {['2024-2025', '2025-2026', '2026-2027', '2027-2028'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Score global */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '10px', padding: '12px 20px', fontSize: '13px', color: colors.text.secondary }}>
          Score moyen : <span style={{ color: '#4ade80', fontWeight: 800, fontSize: '16px' }}>{scoreTotal}/5</span>
        </div>
        <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '10px', padding: '12px 20px', fontSize: '13px', color: colors.text.secondary }}>
          Actions planifiées : <span style={{ color: '#f59e0b', fontWeight: 800 }}>{actions.length}</span>
        </div>
      </div>

      {/* Navigation étapes */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: `1px solid ${colors.border.subtle}`, marginBottom: '28px', overflowX: 'auto' }}>
        {ETAPES.map(e => (
          <button key={e.key} onClick={() => setEtape(e.key)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '10px 16px',
            fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap',
            color: etape === e.key ? '#4ade80' : colors.text.faint,
            borderBottom: etape === e.key ? '2px solid #4ade80' : '2px solid transparent',
          }}>
            {e.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ color: colors.text.faint, textAlign: 'center', padding: '60px' }}>Chargement...</div>}

      {/* ══ ÉTAPE 1 — IDENTITÉ ══ */}
      {!loading && etape === 'identite' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={card}>
            <h3 style={{ color: colors.text.primary, margin: '0 0 20px', fontSize: '16px' }}>Valeurs du club</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[0, 1, 2, 3, 4].map(i => (
                <input key={i} value={identite.valeurs?.[i] || ''} onChange={e => {
                  const v = [...(identite.valeurs || ['', '', '', '', ''])]
                  v[i] = e.target.value
                  setIdentite({ ...identite, valeurs: v })
                }} placeholder={`Valeur ${i + 1}`} style={inp} />
              ))}
            </div>
            <div style={{ marginTop: '12px' }}>
              <label style={label}>Slogan</label>
              <input value={identite.slogan || ''} onChange={e => setIdentite({ ...identite, slogan: e.target.value })} placeholder="Ex : Plus qu'un club, une famille" style={inp} />
            </div>
          </div>

          <div style={card}>
            <h3 style={{ color: colors.text.primary, margin: '0 0 20px', fontSize: '16px' }}>État civil</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {[
                { key: 'date_creation', label: 'Date de création', placeholder: 'Ex: 1972' },
                { key: 'numero_affiliation', label: "N° d'affiliation", placeholder: '' },
                { key: 'couleurs', label: 'Couleurs', placeholder: 'Ex: Rouge et blanc' },
                { key: 'competition_plus_haute', label: 'Compétition la plus haute', placeholder: 'Ex: Régionale 1' },
              ].map(f => (
                <div key={f.key}>
                  <label style={label}>{f.label}</label>
                  <input value={identite[f.key] || ''} onChange={e => setIdentite({ ...identite, [f.key]: e.target.value })} placeholder={f.placeholder} style={inp} />
                </div>
              ))}
              <div>
                <label style={label}>Nombre total de licenciés</label>
                <input type="number" value={identite.nb_licencies || ''} onChange={e => setIdentite({ ...identite, nb_licencies: e.target.value })} style={inp} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '20px' }}>
                <input type="checkbox" id="omnisport" checked={identite.club_omnisport || false} onChange={e => setIdentite({ ...identite, club_omnisport: e.target.checked })} />
                <label htmlFor="omnisport" style={{ color: colors.text.primary, fontSize: '14px' }}>Club omnisport</label>
              </div>
            </div>
          </div>

          <div style={card}>
            <h3 style={{ color: colors.text.primary, margin: '0 0 20px', fontSize: '16px' }}>Bureau</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              {['president', 'secretaire', 'tresorier'].map(r => (
                <div key={r}>
                  <label style={label}>{r.charAt(0).toUpperCase() + r.slice(1)}</label>
                  <input value={identite[r] || ''} onChange={e => setIdentite({ ...identite, [r]: e.target.value })} style={inp} />
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={sauvegarderIdentite} style={btn}>Enregistrer</button>
          </div>
        </div>
      )}

      {/* ══ ÉTAPE 2 — DIAGNOSTIC ══ */}
      {!loading && etape === 'diagnostic' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ color: colors.text.secondary, fontSize: '13px', margin: '0 0 8px' }}>
            Notez chaque axe de 0 à 5. La toile d'araignée se génère automatiquement.
          </p>

          {['Associatif', 'Sportif', 'Éducatif'].map(projet => (
            <div key={projet} style={card}>
              <h3 style={{ color: colors.text.primary, margin: '0 0 16px', fontSize: '15px' }}>
                Projet {projet}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {AXES_DIAGNOSTIC.filter(a => a.projet === projet).map(axe => (
                  <div key={axe.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label style={{ color: colors.text.primary, fontSize: '13px', fontWeight: 600 }}>{axe.label}</label>
                      <span style={{ color: axe.color, fontWeight: 800, fontSize: '15px' }}>{diagnostic[axe.key]}/5</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[0, 1, 2, 3, 4, 5].map(n => (
                        <button key={n} onClick={() => setDiagnostic({ ...diagnostic, [axe.key]: n })}
                          style={{
                            flex: 1, padding: '8px 0', border: 'none', borderRadius: '6px', cursor: 'pointer',
                            fontWeight: 700, fontSize: '13px',
                            background: diagnostic[axe.key] >= n && n > 0 ? axe.color : colors.background.raised,
                            color: diagnostic[axe.key] >= n && n > 0 ? '#000' : colors.text.faint,
                          }}>{n}</button>
                      ))}
                    </div>
                    {/* Points + / Points - */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                      <input
                        value={diagnostic.details?.[axe.key]?.plus || ''}
                        onChange={e => setDiagnostic({ ...diagnostic, details: { ...diagnostic.details, [axe.key]: { ...diagnostic.details?.[axe.key], plus: e.target.value } } })}
                        placeholder="Points + / Opportunités"
                        style={{ ...inp, fontSize: '12px', padding: '8px 12px', borderColor: colors.accent.green + '40' }}
                      />
                      <input
                        value={diagnostic.details?.[axe.key]?.moins || ''}
                        onChange={e => setDiagnostic({ ...diagnostic, details: { ...diagnostic.details, [axe.key]: { ...diagnostic.details?.[axe.key], moins: e.target.value } } })}
                        placeholder="Points - / Menaces"
                        style={{ ...inp, fontSize: '12px', padding: '8px 12px', borderColor: colors.accent.red + '40' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Toile d'araignée SVG */}
          <div style={{ ...card, textAlign: 'center' }}>
            <h3 style={{ color: colors.text.primary, margin: '0 0 16px', fontSize: '15px' }}>Vision globale du club</h3>
            <RadarChart diagnostic={diagnostic} colors={colors} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={sauvegarderDiagnostic} style={btn}>Enregistrer</button>
          </div>
        </div>
      )}

      {/* ══ ÉTAPE 3 — OBJECTIFS ══ */}
      {!loading && etape === 'objectifs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {Object.entries(OBJECTIFS_PAR_PROJET).map(([projet, objList]) => (
            <div key={projet} style={card}>
              <h3 style={{ color: colors.text.primary, margin: '0 0 16px', fontSize: '15px', textTransform: 'capitalize' }}>
                Projet {projet}
              </h3>
              {objList.map((obj, idx) => {
                const key = `${projet}_${idx + 1}`
                const data = objectifs[key] || { axes: ['', '', '', '', ''] }
                return (
                  <div key={idx} style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: `1px solid ${colors.border.subtle}` }}>
                    <div style={{ color: '#4ade80', fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>
                      Objectif {idx + 1} — {obj}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {[0, 1, 2, 3, 4].map(i => (
                        <input key={i}
                          value={data.axes?.[i] || ''}
                          onChange={async e => {
                            const axes = [...(data.axes || ['', '', '', '', ''])]
                            axes[i] = e.target.value
                            const updated = { ...objectifs, [key]: { ...data, axes } }
                            setObjectifs(updated)
                            await supabase.from('cff4_objectifs').upsert({
                              club_id: clubId, educateur_id: userId, saison,
                              sous_projet: projet, objectif_general: idx + 1,
                              objectif_label: obj, axes,
                            }, { onConflict: 'club_id,saison,sous_projet,objectif_general' })
                          }}
                          placeholder={`Axe d'amélioration ${i + 1}`}
                          style={{ ...inp, fontSize: '13px' }}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* ══ ÉTAPE 4 — PLAN D'ACTIONS ══ */}
      {!loading && etape === 'actions' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button onClick={() => setShowNewAction(true)} style={btn}>+ Nouvelle fiche action</button>
          </div>

          {/* Calendrier saison */}
          {actions.length > 0 && (
            <div style={{ ...card, marginBottom: '20px', overflowX: 'auto' }}>
              <h3 style={{ color: colors.text.primary, margin: '0 0 16px', fontSize: '15px' }}>Calendrier de saison</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '700px' }}>
                <thead>
                  <tr>
                    <th style={{ color: colors.text.secondary, textAlign: 'left', padding: '6px 10px', fontWeight: 700 }}>Action</th>
                    {MOIS.map(m => <th key={m} style={{ color: colors.text.secondary, padding: '6px 8px', fontWeight: 700 }}>{m}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {actions.map(a => (
                    <tr key={a.id}>
                      <td style={{ color: colors.text.primary, padding: '6px 10px', fontWeight: 600 }}>{a.intitule}</td>
                      {MOIS.map(m => (
                        <td key={m} style={{ textAlign: 'center', padding: '6px 8px' }}>
                          {a.mois_calendrier?.includes(m.toLowerCase()) && (
                            <div style={{ width: '12px', height: '12px', background: '#4ade80', borderRadius: '50%', margin: 'auto' }} />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Liste fiches */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {actions.length === 0 && (
              <div style={{ textAlign: 'center', color: colors.text.faint, padding: '40px', background: colors.background.surface, borderRadius: '12px' }}>
                Aucune fiche action — cliquez sur "+ Nouvelle fiche action"
              </div>
            )}
            {actions.map(a => (
              <div key={a.id} style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '10px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: '14px' }}>{a.intitule}</div>
                  <div style={{ color: colors.text.faint, fontSize: '12px', marginTop: '3px' }}>
                    Projet {a.sous_projet} · Objectif {a.objectif_general}
                    {a.responsable && ` · ${a.responsable}`}
                    {a.date_action && ` · ${new Date(a.date_action).toLocaleDateString('fr-FR')}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                    background: a.statut === 'realisee' ? colors.accent.green + '20' : a.statut === 'en_cours' ? colors.accent.amber + '20' : colors.accent.red + '20',
                    color: a.statut === 'realisee' ? colors.accent.green : a.statut === 'en_cours' ? colors.accent.amber : colors.accent.red,
                  }}>
                    {a.statut === 'realisee' ? 'Réalisée' : a.statut === 'en_cours' ? 'En cours' : 'Planifiée'}
                  </span>
                  <button onClick={() => supprimerAction(a.id)} style={{ background: 'none', border: 'none', color: colors.text.faint, cursor: 'pointer', fontSize: '18px' }}>×</button>
                </div>
              </div>
            ))}
          </div>

          {/* Modale nouvelle action */}
          {showNewAction && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
              <div style={{ background: colors.background.surface, borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto', border: `1px solid ${colors.border.default}` }}>
                <h3 style={{ color: colors.text.primary, margin: '0 0 20px', fontSize: '18px' }}>Nouvelle fiche action</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={label}>Sous-projet</label>
                      <select value={newAction.sous_projet} onChange={e => setNewAction({ ...newAction, sous_projet: e.target.value })} style={inp}>
                        <option value="associatif">Associatif</option>
                        <option value="sportif">Sportif</option>
                        <option value="educatif">Éducatif</option>
                      </select>
                    </div>
                    <div>
                      <label style={label}>Objectif général N°</label>
                      <select value={newAction.objectif_general} onChange={e => setNewAction({ ...newAction, objectif_general: parseInt(e.target.value) })} style={inp}>
                        {(OBJECTIFS_PAR_PROJET[newAction.sous_projet] || []).map((o, i) => (
                          <option key={i} value={i + 1}>{i + 1} — {o}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={label}>Intitulé de l'action *</label>
                    <input value={newAction.intitule} onChange={e => setNewAction({ ...newAction, intitule: e.target.value })} placeholder="Ex: Tournoi de recrutement U8-U11" style={inp} />
                  </div>
                  <div>
                    <label style={label}>Résumé</label>
                    <textarea value={newAction.resume} onChange={e => setNewAction({ ...newAction, resume: e.target.value })} rows={3} style={{ ...inp, resize: 'vertical' }} placeholder="Description de l'action..." />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={label}>Date</label>
                      <input type="date" value={newAction.date_action} onChange={e => setNewAction({ ...newAction, date_action: e.target.value })} style={inp} />
                    </div>
                    <div>
                      <label style={label}>Responsable</label>
                      <input value={newAction.responsable} onChange={e => setNewAction({ ...newAction, responsable: e.target.value })} style={inp} />
                    </div>
                    <div>
                      <label style={label}>Public concerné</label>
                      <input value={newAction.public_concerne} onChange={e => setNewAction({ ...newAction, public_concerne: e.target.value })} placeholder="Ex: Jeunes U8-U11" style={inp} />
                    </div>
                    <div>
                      <label style={label}>Statut</label>
                      <select value={newAction.statut} onChange={e => setNewAction({ ...newAction, statut: e.target.value })} style={inp}>
                        <option value="planifiee">Planifiée</option>
                        <option value="en_cours">En cours</option>
                        <option value="realisee">Réalisée</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={label}>Mois au calendrier</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {MOIS.map(m => (
                        <button key={m} onClick={() => {
                          const ml = m.toLowerCase()
                          const mois = newAction.mois_calendrier.includes(ml)
                            ? newAction.mois_calendrier.filter(x => x !== ml)
                            : [...newAction.mois_calendrier, ml]
                          setNewAction({ ...newAction, mois_calendrier: mois })
                        }} style={{
                          padding: '5px 10px', border: 'none', borderRadius: '6px', cursor: 'pointer',
                          background: newAction.mois_calendrier.includes(m.toLowerCase()) ? '#4ade80' : colors.background.raised,
                          color: newAction.mois_calendrier.includes(m.toLowerCase()) ? '#000' : colors.text.faint,
                          fontWeight: 700, fontSize: '12px',
                        }}>{m}</button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={label}>Budget recettes (€)</label>
                      <input type="number" value={newAction.budget_recettes} onChange={e => setNewAction({ ...newAction, budget_recettes: parseFloat(e.target.value) })} style={inp} />
                    </div>
                    <div>
                      <label style={label}>Budget dépenses (€)</label>
                      <input type="number" value={newAction.budget_depenses} onChange={e => setNewAction({ ...newAction, budget_depenses: parseFloat(e.target.value) })} style={inp} />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '24px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowNewAction(false)} style={{ background: 'none', border: `1px solid ${colors.border.strong}`, color: colors.text.secondary, borderRadius: '8px', padding: '10px 20px', cursor: 'pointer' }}>Annuler</button>
                  <button onClick={ajouterAction} style={btn}>Ajouter</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ ÉTAPE 5 — SUIVI ══ */}
      {!loading && etape === 'suivi' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {actions.length === 0 && (
            <div style={{ textAlign: 'center', color: colors.text.faint, padding: '40px', background: colors.background.surface, borderRadius: '12px' }}>
              Créez d'abord des fiches action dans l'étape Plan d'actions.
            </div>
          )}
          {actions.map(a => (
            <SuiviAction key={a.id} action={a} userId={userId} clubId={clubId} inp={inp} colors={colors} />
          ))}

          {/* Attestation */}
          {actions.length > 0 && (
            <div style={{ background: colors.background.surface, border: `1px solid ${colors.accent.green}40`, borderRadius: '12px', padding: '20px', marginTop: '8px' }}>
              <h3 style={{ color: '#4ade80', margin: '0 0 12px', fontSize: '15px' }}>Attestation de stage pédagogique</h3>
              <p style={{ color: colors.text.secondary, fontSize: '13px', margin: '0 0 12px' }}>
                À faire signer par le président du club après la réalisation de chaque action.
              </p>
              <button onClick={() => window.print()} style={{ ...btn, background: 'transparent', border: '1px solid #4ade80', color: '#4ade80' }}>
                Imprimer l'attestation
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── COMPOSANT RADAR CHART SVG ────────────────────────────────────────────────

function RadarChart({ diagnostic, colors }) {
  const axes = AXES_DIAGNOSTIC
  const n = axes.length
  const cx = 200, cy = 200, r = 150
  const angles = axes.map((_, i) => (i / n) * 2 * Math.PI - Math.PI / 2)

  const gridPolygon = (level) =>
    axes.map((_, i) => {
      const a = angles[i]
      const rr = (r * level) / 5
      return `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`
    }).join(' ')

  const dataPolygon = axes.map((axe, i) => {
    const val = diagnostic[axe.key] || 0
    const a = angles[i]
    const rr = (r * val) / 5
    return `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`
  }).join(' ')

  return (
    <svg width="400" height="400" viewBox="0 0 400 400" style={{ maxWidth: '100%' }}>
      {/* Grilles */}
      {[1, 2, 3, 4, 5].map(l => (
        <polygon key={l} points={gridPolygon(l)} fill="none" stroke={colors.border.default} strokeWidth="1" />
      ))}
      {/* Axes */}
      {axes.map((_, i) => (
        <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(angles[i])} y2={cy + r * Math.sin(angles[i])} stroke={colors.border.default} strokeWidth="1" />
      ))}
      {/* Data */}
      <polygon points={dataPolygon} fill="rgba(74,222,128,0.2)" stroke="#4ade80" strokeWidth="2" />
      {/* Labels */}
      {axes.map((axe, i) => {
        const a = angles[i]
        const lx = cx + (r + 20) * Math.cos(a)
        const ly = cy + (r + 20) * Math.sin(a)
        return (
          <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
            fill={axe.color} fontSize="9" fontWeight="600">
            {axe.label.length > 14 ? axe.label.substring(0, 13) + '…' : axe.label}
          </text>
        )
      })}
      {/* Points */}
      {axes.map((axe, i) => {
        const val = diagnostic[axe.key] || 0
        const a = angles[i]
        const rr = (r * val) / 5
        return <circle key={i} cx={cx + rr * Math.cos(a)} cy={cy + rr * Math.sin(a)} r="4" fill="#4ade80" />
      })}
    </svg>
  )
}

// ── COMPOSANT SUIVI PAR ACTION ───────────────────────────────────────────────

function SuiviAction({ action, userId, clubId, inp, colors }) {
  const [suivi, setSuivi] = useState({
    avant: '', apres: '', objectifs_atteints: null, budget_respecte: null,
    points_positifs: '', points_ameliorer: '', evaluation_quantitative: '',
    reconductible: null, conditions_reconduction: '',
  })
  const [open, setOpen] = useState(false)

  useEffect(() => {
    supabase.from('cff4_suivi').select('*').eq('action_id', action.id).maybeSingle().then(r => {
      if (r.data) setSuivi(r.data)
    })
  }, [action.id])

  async function sauvegarder() {
    await supabase.from('cff4_suivi').upsert({
      action_id: action.id, club_id: clubId, educateur_id: userId, ...suivi,
    }, { onConflict: 'action_id' })
  }

  const label = { color: colors.text.faint, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '6px' }

  return (
    <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '12px', overflow: 'hidden' }}>
      <div onClick={() => setOpen(!open)} style={{ padding: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: colors.text.primary, fontWeight: 700 }}>{action.intitule}</div>
          <div style={{ color: colors.text.faint, fontSize: '12px', marginTop: '2px' }}>Projet {action.sous_projet}</div>
        </div>
        <span style={{ color: colors.text.faint, fontSize: '18px' }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '14px', borderTop: `1px solid ${colors.border.subtle}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '14px' }}>
            <div>
              <label style={label}>Avant (ce qu'on attendait)</label>
              <textarea value={suivi.avant} onChange={e => setSuivi({ ...suivi, avant: e.target.value })} rows={3} style={{ ...inp, resize: 'vertical' }} />
            </div>
            <div>
              <label style={label}>Après (ce qui a été réalisé)</label>
              <textarea value={suivi.apres} onChange={e => setSuivi({ ...suivi, apres: e.target.value })} rows={3} style={{ ...inp, resize: 'vertical' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            {[
              { key: 'objectifs_atteints', label: 'Objectifs atteints ?' },
              { key: 'budget_respecte', label: 'Budget respecté ?' },
              { key: 'reconductible', label: 'Action reconductible ?' },
            ].map(f => (
              <div key={f.key}>
                <label style={label}>{f.label}</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[true, false].map(v => (
                    <button key={String(v)} onClick={() => setSuivi({ ...suivi, [f.key]: v })} style={{
                      flex: 1, padding: '8px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '12px',
                      background: suivi[f.key] === v ? (v ? colors.accent.green : colors.accent.red) : colors.background.raised,
                      color: suivi[f.key] === v ? '#000' : colors.text.faint,
                    }}>{v ? 'Oui' : 'Non'}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={label}>Points positifs</label>
              <textarea value={suivi.points_positifs} onChange={e => setSuivi({ ...suivi, points_positifs: e.target.value })} rows={2} style={{ ...inp, resize: 'none' }} />
            </div>
            <div>
              <label style={label}>Points à améliorer</label>
              <textarea value={suivi.points_ameliorer} onChange={e => setSuivi({ ...suivi, points_ameliorer: e.target.value })} rows={2} style={{ ...inp, resize: 'none' }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={sauvegarder} style={{ background: '#4ade80', color: '#000', border: 'none', borderRadius: '8px', padding: '8px 18px', fontWeight: 700, cursor: 'pointer' }}>Enregistrer</button>
          </div>
        </div>
      )}
    </div>
  )
}

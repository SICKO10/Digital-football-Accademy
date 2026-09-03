import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'
import { saisonActuelle } from '../lib/saison'
import { PERIODES, ASPECTS, evaluationVide } from '../constants/evaluation'

function RatingStars({ value, onChange, readOnly, couleur }) {
  const colors = useColors()
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} onClick={() => !readOnly && onChange(n === value ? null : n)}
          style={{ fontSize: 18, cursor: readOnly ? 'default' : 'pointer', color: (value || 0) >= n ? couleur : colors.text.ghost }}>
          ★
        </span>
      ))}
    </div>
  )
}

function ChampTexte({ label, value, onChange, readOnly, colors }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ color: colors.text.faint, fontSize: 10, fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {readOnly ? (
        <p style={{ margin: 0, fontSize: 12, color: value ? colors.text.secondary : colors.text.faint, fontStyle: value ? 'normal' : 'italic', whiteSpace: 'pre-wrap' }}>
          {value || 'Non renseigné'}
        </p>
      ) : (
        <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={2}
          style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: 8, color: colors.text.primary, fontSize: 12, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
      )}
    </div>
  )
}

// Fiche d'évaluation d'un joueur — 3 évaluations par saison (début / mi-saison
// / fin de saison). Un seul jeu de champs, partagé entre l'éducateur (accès
// complet) et le joueur (pré-remplissage s'il y est autorisé, tant que
// l'éducateur n'a pas encore enregistré sa version — cf. verrouillee_joueur).
export default function FicheEvaluationJoueur({ equipeJoueurId, educateurId, joueurNom, role, readOnly = false, onClose }) {
  const colors = useColors()
  const saison = saisonActuelle()
  const [periodeActive, setPeriodeActive] = useState('debut')
  const [rows, setRows] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  const charger = async () => {
    const { data } = await supabase.from('evaluations_joueur').select('*')
      .eq('equipe_joueur_id', equipeJoueurId).eq('educateur_id', educateurId).eq('saison', saison)
    const parPeriode = {}
    ;(data || []).forEach(r => { parPeriode[r.periode] = r })
    setRows(parPeriode)
  }
  useEffect(() => { charger() }, [equipeJoueurId, educateurId, saison])

  useEffect(() => {
    if (!rows) return
    setForm(rows[periodeActive] ? { ...rows[periodeActive] } : evaluationVide(equipeJoueurId, educateurId, saison, periodeActive))
  }, [rows, periodeActive])

  if (!form) return null

  const existeDeja = !!rows[periodeActive]
  const peutEditer = readOnly ? false : role === 'educateur' ? true : (existeDeja && form.autorise_prefill_joueur && !form.verrouillee_joueur)
  const champ = (key) => (val) => setForm(f => ({ ...f, [key]: val }))

  // Bascule immédiate (indépendante du bouton "Enregistrer") — l'éducateur
  // doit pouvoir autoriser le pré-remplissage avant même d'avoir écrit quoi
  // que ce soit, et la visibilité peut changer à tout moment sans re-verrouiller.
  const basculerFlag = async (flagKey, valeur) => {
    const payload = { equipe_joueur_id: equipeJoueurId, educateur_id: educateurId, saison, periode: periodeActive, [flagKey]: valeur }
    const { data } = await supabase.from('evaluations_joueur').upsert(payload, { onConflict: 'equipe_joueur_id,educateur_id,saison,periode' }).select().single()
    if (data) setRows(prev => ({ ...prev, [periodeActive]: data }))
  }

  const sauvegarder = async () => {
    setSaving(true)
    const { id, created_at, ...reste } = form
    const payload = { ...reste, equipe_joueur_id: equipeJoueurId, educateur_id: educateurId, saison, periode: periodeActive, updated_at: new Date().toISOString() }
    if (role === 'educateur') payload.verrouillee_joueur = true
    const { data, error } = await supabase.from('evaluations_joueur').upsert(payload, { onConflict: 'equipe_joueur_id,educateur_id,saison,periode' }).select().single()
    setSaving(false)
    if (!error && data) setRows(prev => ({ ...prev, [periodeActive]: data }))
  }

  const estFinSaison = periodeActive === 'fin_saison'

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: colors.background.sunken, border: `1px solid ${colors.border.default}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h3 style={{ color: colors.text.primary, margin: '0 0 4px', fontSize: 17, fontWeight: 800 }}>Fiche d'évaluation{joueurNom ? ` — ${joueurNom}` : ''}</h3>
            <p style={{ color: colors.text.faint, fontSize: 12, margin: 0 }}>Saison {saison}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${colors.border.subtle}`, marginBottom: 20, overflowX: 'auto' }}>
          {PERIODES.map(p => (
            <button key={p.key} onClick={() => setPeriodeActive(p.key)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '10px 16px', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif',
                color: periodeActive === p.key ? colors.accent.blue : colors.text.faint,
                borderBottom: periodeActive === p.key ? `2px solid ${colors.accent.blue}` : '2px solid transparent',
              }}>
              {p.label}
              {rows[p.key]?.verrouillee_joueur && (
                <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, color: colors.text.faint, textTransform: 'uppercase' }}>Verrouillée</span>
              )}
            </button>
          ))}
        </div>

        {role === 'educateur' && !readOnly && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
            <button onClick={() => basculerFlag('visible_joueur', !form.visible_joueur)}
              style={{ flex: '1 1 220px', textAlign: 'left', background: form.visible_joueur ? colors.accent.green + '15' : colors.background.surface, border: `1px solid ${form.visible_joueur ? colors.accent.green : colors.border.default}`, borderRadius: 10, padding: 12, cursor: 'pointer' }}>
              <div style={{ color: form.visible_joueur ? colors.accent.green : colors.text.faint, fontWeight: 700, fontSize: 12 }}>
                {form.visible_joueur ? 'Visible par le joueur' : 'Masquée au joueur'}
              </div>
              <div style={{ color: colors.text.faint, fontSize: 11, marginTop: 2 }}>
                {form.visible_joueur ? 'Le joueur voit cette évaluation dans son dashboard' : 'Seul toi vois cette évaluation'}
              </div>
            </button>
            <button onClick={() => basculerFlag('autorise_prefill_joueur', !form.autorise_prefill_joueur)} disabled={form.verrouillee_joueur}
              style={{ flex: '1 1 220px', textAlign: 'left', background: form.autorise_prefill_joueur ? colors.accent.blue + '15' : colors.background.surface, border: `1px solid ${form.autorise_prefill_joueur ? colors.accent.blue : colors.border.default}`, borderRadius: 10, padding: 12, cursor: form.verrouillee_joueur ? 'default' : 'pointer', opacity: form.verrouillee_joueur ? 0.6 : 1 }}>
              <div style={{ color: form.autorise_prefill_joueur ? colors.accent.blue : colors.text.faint, fontWeight: 700, fontSize: 12 }}>
                {form.autorise_prefill_joueur ? 'Pré-remplissage autorisé' : 'Pré-remplissage non autorisé'}
              </div>
              <div style={{ color: colors.text.faint, fontSize: 11, marginTop: 2 }}>
                {form.verrouillee_joueur ? 'Déjà verrouillée' : 'Le joueur peut compléter cette évaluation avant toi'}
              </div>
            </button>
          </div>
        )}

        {form.verrouillee_joueur && role === 'joueur' && (
          <p style={{ color: colors.text.faint, fontSize: 12, fontStyle: 'italic', marginBottom: 16 }}>
            Cette évaluation a été finalisée par ton éducateur — modification impossible.
          </p>
        )}
        {!existeDeja && role === 'joueur' && (
          <p style={{ color: colors.text.faint, fontSize: 13, fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
            Aucune évaluation pour cette période pour l'instant.
          </p>
        )}

        {(existeDeja || role === 'educateur') && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 20 }}>
              {ASPECTS.map(asp => (
                <div key={asp.key} style={{ background: colors.background.surface, border: `1px solid ${asp.couleur}33`, borderRadius: 12, padding: 14 }}>
                  <div style={{ color: asp.couleur, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginBottom: 10 }}>{asp.label}</div>
                  <ChampTexte label="Points forts" value={form[`${asp.key}_points_forts`]} onChange={champ(`${asp.key}_points_forts`)} readOnly={!peutEditer} colors={colors} />
                  <ChampTexte label="Points à améliorer" value={form[`${asp.key}_a_ameliorer`]} onChange={champ(`${asp.key}_a_ameliorer`)} readOnly={!peutEditer} colors={colors} />
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 20 }}>
              <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 12, padding: 14 }}>
                <ChampTexte label="Objectif personnel" value={form.objectif_personnel} onChange={champ('objectif_personnel')} readOnly={!peutEditer} colors={colors} />
                <ChampTexte label="Objectif collectif" value={form.objectif_collectif} onChange={champ('objectif_collectif')} readOnly={!peutEditer} colors={colors} />
              </div>
              <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ color: colors.text.faint, fontSize: 11, fontWeight: 700 }}>Satisfaction staff</span>
                  <RatingStars value={form.satisfaction_staff} onChange={champ('satisfaction_staff')} readOnly={!peutEditer} couleur={colors.accent.amber} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: estFinSaison ? 10 : 0 }}>
                  <span style={{ color: colors.text.faint, fontSize: 11, fontWeight: 700 }}>Satisfaction équipe</span>
                  <RatingStars value={form.satisfaction_equipe} onChange={champ('satisfaction_equipe')} readOnly={!peutEditer} couleur={colors.accent.blue} />
                </div>
                {estFinSaison && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: colors.text.faint, fontSize: 11, fontWeight: 700 }}>Plaisir terrain</span>
                    <RatingStars value={form.plaisir_terrain} onChange={champ('plaisir_terrain')} readOnly={!peutEditer} couleur={colors.accent.green} />
                  </div>
                )}
              </div>
            </div>

            {estFinSaison && (
              <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 12, padding: 14, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: colors.text.primary, fontWeight: 700, fontSize: 13 }}>Note globale de saison</span>
                {peutEditer ? (
                  <input type="number" min={0} max={20} step={0.5} value={form.note_globale_saison ?? ''} onChange={e => champ('note_globale_saison')(e.target.value === '' ? null : parseFloat(e.target.value))}
                    style={{ width: 80, background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '6px 10px', color: colors.text.primary, fontSize: 14, fontWeight: 700, textAlign: 'center', fontFamily: 'Inter, sans-serif' }} />
                ) : (
                  <span style={{ color: colors.accent.green, fontWeight: 800, fontSize: 16 }}>{form.note_globale_saison != null ? `${form.note_globale_saison}/20` : '—'}</span>
                )}
              </div>
            )}

            {peutEditer && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={sauvegarder} disabled={saving}
                  style={{ background: colors.accent.blue, color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '10px 22px', fontWeight: 800, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Enregistrement...' : role === 'educateur' ? 'Enregistrer (verrouille la fiche)' : 'Enregistrer mon pré-remplissage'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

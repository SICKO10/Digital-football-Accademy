// Acceptation des conditions d'utilisation des fiches d'évaluation (bloc 11b).
// INTERRUPTEUR ÉTEINT : tant qu'aucune version n'est en vigueur en base, ce composant n'affiche rien.
// Une fois allumé, il demande au compte du club ou au président (ou à l'éducateur indépendant)
// d'accepter la version en vigueur. L'écran affiche le texte et vérifie son empreinte SHA-256
// contre celle de la base : si elle diffère, aucune acceptation n'est proposée.
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { CONDITIONS_EVALUATION } from '../../lib/conditionsEvaluationTexte'

async function sha256(texte) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texte))
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

// proprietaireId : id du club, ou de l'éducateur indépendant. Vide (éducateur affilié) : rien à afficher.
export default function ConditionsEvaluation({ proprietaireId }) {
  const colors = useColors()
  const [etat, setEtat] = useState({ chargement: true, version: null, acceptee: true, conforme: false })
  const [coche, setCoche] = useState(false)
  const [erreur, setErreur] = useState('')
  const [occupe, setOccupe] = useState(false)

  const charger = useCallback(async () => {
    if (!proprietaireId) { setEtat({ chargement: false, version: null, acceptee: true, conforme: false }); return }
    const { data: version } = await supabase.rpc('conditions_evaluation_version_en_vigueur')
    if (!version) { setEtat({ chargement: false, version: null, acceptee: true, conforme: false }); return }
    const [{ data: acceptee }, { data: ligne }] = await Promise.all([
      supabase.rpc('conditions_evaluation_acceptees', { p_proprietaire_id: proprietaireId }),
      supabase.from('conditions_evaluation_versions').select('texte_sha256').eq('version', version).maybeSingle(),
    ])
    const texte = CONDITIONS_EVALUATION[version]
    let conforme = false
    try { conforme = !!texte && !!ligne && (await sha256(texte)) === ligne.texte_sha256 } catch { conforme = false }
    setEtat({ chargement: false, version, acceptee: !!acceptee, conforme })
  }, [proprietaireId])

  useEffect(() => { charger() }, [charger])

  if (etat.chargement || !etat.version || etat.acceptee) return null

  const accepter = async () => {
    setOccupe(true); setErreur('')
    const { error } = await supabase.rpc('accepter_conditions_evaluation', { p_proprietaire_id: proprietaireId, p_version: etat.version })
    setOccupe(false)
    if (error) { setErreur((error.message || '').replace(/^.*?exception:\s*/i, '') || 'Acceptation impossible.'); return }
    charger()
  }

  return (
    <section role="region" aria-label="Conditions d'utilisation des fiches d'évaluation"
      style={{ background: colors.background.surface, border: `1px solid ${colors.accent.amber}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <h3 style={{ margin: '0 0 6px', color: colors.text.primary, fontSize: 16, fontWeight: 800 }}>Conditions d'utilisation des fiches d'évaluation</h3>
      <p style={{ margin: '0 0 10px', color: colors.text.secondary, fontSize: 13, lineHeight: 1.5 }}>
        Pour publier une fiche, créer une évaluation ou une note, il faut accepter ces conditions (version {etat.version}).
      </p>
      {etat.conforme ? (
        <>
          <div style={{ maxHeight: 240, overflowY: 'auto', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: 12, whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.6, color: colors.text.secondary }}>
            {CONDITIONS_EVALUATION[etat.version]}
          </div>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', margin: '12px 0', fontSize: 13, color: colors.text.primary, cursor: 'pointer', minHeight: 36 }}>
            <input type="checkbox" checked={coche} onChange={e => setCoche(e.target.checked)} style={{ marginTop: 3, width: 18, height: 18 }} />
            <span>J'ai lu et j'accepte ces conditions, au nom du club ou en mon nom.</span>
          </label>
          <button disabled={!coche || occupe} onClick={accepter}
            style={{ padding: '10px 18px', minHeight: 44, borderRadius: 8, border: 'none', fontWeight: 800, fontSize: 13, fontFamily: 'Barlow, sans-serif', cursor: coche && !occupe ? 'pointer' : 'not-allowed',
              background: coche ? colors.accent.blue : colors.background.raised, color: coche ? (colors.accent.onBrand || '#0a0a0a') : colors.text.faint }}>
            Accepter les conditions
          </button>
          <p style={{ margin: '8px 0 0', color: colors.text.ghost, fontSize: 11 }}>Réservé au compte du club et au président. Votre acceptation est enregistrée (qui, quand, quelle version).</p>
        </>
      ) : (
        <p role="alert" style={{ margin: 0, color: colors.accent.red, fontSize: 13 }}>Le texte de ces conditions n'est pas disponible dans cette version de l'application. Contactez Digital Football : l'acceptation n'est pas possible pour le moment.</p>
      )}
      {erreur && <p role="alert" style={{ margin: '8px 0 0', color: colors.accent.red, fontSize: 13 }}>{erreur}</p>}
    </section>
  )
}

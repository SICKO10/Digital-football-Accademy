import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'
import { alpha } from '../tokens'

const STATUT_META_KEYS = {
  en_cours: 'En cours',
  en_soin: 'En soin',
  retour_prog: 'Retour programmé',
  gueri: 'Guéri',
}

const GRAVITE_LABELS = { legere: 'Légère', moderee: 'Modérée', grave: 'Grave' }

const STATUT_ETAPE_KEYS = { a_faire: 'À faire', en_cours: 'En cours', validee: 'Validée' }

// Section Santé en lecture seule, Dashboard Joueur — mêmes tables que côté
// éducateur (blessures/suivi_medical), la RLS scope automatiquement aux
// blessures du joueur connecté (via affiliations) ou de son enfant s'il est
// parent, donc aucune requête ne passe explicitement equipe_joueur_id ici.
export default function SanteJoueur() {
  const colors = useColors()
  const [blessures, setBlessures] = useState([])
  const [suivisParBlessure, setSuivisParBlessure] = useState({})
  const [etapesParBlessure, setEtapesParBlessure] = useState({})
  const [ouverte, setOuverte] = useState(null)
  const [loading, setLoading] = useState(true)

  const STATUT_META = {
    en_cours: { label: STATUT_META_KEYS.en_cours, color: colors.accent.orange },
    en_soin: { label: STATUT_META_KEYS.en_soin, color: colors.accent.amber },
    retour_prog: { label: STATUT_META_KEYS.retour_prog, color: colors.accent.blue },
    gueri: { label: STATUT_META_KEYS.gueri, color: colors.accent.green },
  }
  const STATUT_ETAPE_META = {
    a_faire: { label: STATUT_ETAPE_KEYS.a_faire, color: colors.text.disabled },
    en_cours: { label: STATUT_ETAPE_KEYS.en_cours, color: colors.accent.orange },
    validee: { label: STATUT_ETAPE_KEYS.validee, color: colors.accent.green },
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('blessures').select('*').order('date_debut', { ascending: false })
      setBlessures(data || [])
      setLoading(false)
    })()
  }, [])

  const ouvrirBlessure = async (b) => {
    if (ouverte === b.id) { setOuverte(null); return }
    setOuverte(b.id)
    if (!suivisParBlessure[b.id]) {
      const { data } = await supabase.from('suivi_medical').select('*').eq('blessure_id', b.id).order('date_consultation', { ascending: false })
      setSuivisParBlessure(prev => ({ ...prev, [b.id]: data || [] }))
    }
    if (!etapesParBlessure[b.id]) {
      const { data } = await supabase.from('reeducation_etapes').select('*').eq('blessure_id', b.id).order('ordre')
      setEtapesParBlessure(prev => ({ ...prev, [b.id]: data || [] }))
    }
  }

  const ouvrirDocument = async (path) => {
    const { data, error } = await supabase.storage.from('documents-medicaux').createSignedUrl(path, 300)
    if (error || !data?.signedUrl) { alert("Impossible d'ouvrir ce document."); return }
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  const s = {
    card: { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '18px 20px', marginBottom: '12px' },
    pill: (color) => ({ background: color + alpha.soft, color, border: `1px solid ${color}${alpha.medium}`, borderRadius: '20px', padding: '3px 12px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }),
  }

  if (loading) return <div style={{ color: colors.text.faint, fontSize: '13px', textAlign: 'center', padding: '32px 0' }}>Chargement…</div>

  const enCours = blessures.filter(b => b.statut !== 'gueri')

  return (
    <div>
      {enCours.length > 0 && (
        <div style={{ ...s.card, borderLeft: `3px solid ${STATUT_META[enCours[0].statut]?.color}`, marginBottom: '20px' }}>
          <div style={{ color: colors.text.primary, fontWeight: 800, fontSize: '15px', marginBottom: '4px' }}>
            Tu es actuellement {STATUT_META[enCours[0].statut]?.label?.toLowerCase()}
          </div>
          <div style={{ color: colors.text.faint, fontSize: '13px' }}>
            {enCours[0].type_blessure}{enCours[0].zone_corps && ` — ${enCours[0].zone_corps}`}
            {enCours[0].date_retour_estimee && ` · Retour estimé le ${new Date(`${enCours[0].date_retour_estimee}T12:00:00`).toLocaleDateString('fr-FR')}`}
          </div>
        </div>
      )}

      {blessures.length === 0 ? (
        <div style={{ color: colors.text.disabled, fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>Aucune blessure enregistrée</div>
      ) : blessures.map(b => {
        const meta = STATUT_META[b.statut] || STATUT_META.en_cours
        const estOuverte = ouverte === b.id
        const suivis = suivisParBlessure[b.id] || []
        const etapes = etapesParBlessure[b.id] || []
        const progression = etapes.length > 0 ? Math.round((etapes.filter(e => e.statut === 'validee').length / etapes.length) * 100) : 0
        return (
          <div key={b.id} style={s.card}>
            <div onClick={() => ouvrirBlessure(b)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: '14px' }}>{b.type_blessure}{b.zone_corps && ` — ${b.zone_corps}`}</div>
                <div style={{ color: colors.text.faint, fontSize: '12px', marginTop: '2px' }}>
                  Depuis le {new Date(`${b.date_debut}T12:00:00`).toLocaleDateString('fr-FR')} · Gravité {GRAVITE_LABELS[b.gravite] || b.gravite}
                </div>
              </div>
              <span style={s.pill(meta.color)}>{meta.label}</span>
            </div>

            {estOuverte && (
              <div style={{ borderTop: `1px solid ${colors.border.subtle}`, marginTop: '14px', paddingTop: '14px' }}>
                {b.notes && (
                  <p style={{ color: colors.text.secondary, fontSize: '13px', margin: '0 0 14px', lineHeight: 1.5 }}>{b.notes}</p>
                )}
                <div style={{ color: colors.text.faint, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Suivi médical</div>
                {suivis.length === 0 && <div style={{ color: colors.text.disabled, fontSize: '13px' }}>Aucun suivi médical enregistré</div>}
                {suivis.map(sv => (
                  <div key={sv.id} style={{ borderTop: `1px solid ${colors.border.subtle}`, paddingTop: '10px', marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
                      <div>
                        <span style={{ color: colors.text.primary, fontWeight: 700, fontSize: '13px' }}>
                          {new Date(`${sv.date_consultation}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                        {sv.specialiste && <span style={{ color: colors.accent.green, fontSize: '12px', marginLeft: '8px' }}>{sv.specialiste}</span>}
                      </div>
                      {sv.document_path && (
                        <button onClick={() => ouvrirDocument(sv.document_path)} style={{ background: 'transparent', border: 'none', color: colors.accent.blue, fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', padding: 0 }}>
                          📎 {sv.document_nom || 'Document'}
                        </button>
                      )}
                    </div>
                    <p style={{ color: colors.text.secondary, fontSize: '13px', marginTop: '6px', lineHeight: 1.5 }}>{sv.compte_rendu}</p>
                  </div>
                ))}

                {etapes.length > 0 && (
                  <div style={{ borderTop: `1px solid ${colors.border.subtle}`, marginTop: '16px', paddingTop: '14px' }}>
                    <div style={{ color: colors.text.faint, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Ton programme de rééducation</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: colors.text.secondary, fontSize: '12px' }}>Progression</span>
                      <span style={{ color: colors.accent.green, fontWeight: 700, fontSize: '12px' }}>{progression}%</span>
                    </div>
                    <div style={{ background: colors.background.raised, borderRadius: '4px', height: '6px', marginBottom: '14px' }}>
                      <div style={{ background: colors.accent.green, width: `${progression}%`, height: '6px', borderRadius: '4px' }} />
                    </div>
                    {etapes.map((etape, idx) => {
                      const stMeta = STATUT_ETAPE_META[etape.statut] || STATUT_ETAPE_META.a_faire
                      return (
                        <div key={etape.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <div style={{
                            width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                            background: etape.statut === 'validee' ? colors.accent.green : colors.background.raised,
                            color: etape.statut === 'validee' ? colors.black : colors.text.faint,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '11px',
                          }}>{idx + 1}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ color: colors.text.primary, fontWeight: 700, fontSize: '13px' }}>{etape.titre}</span>
                              <span style={{ color: stMeta.color, fontSize: '11px', fontWeight: 600 }}>{stMeta.label}</span>
                            </div>
                            {etape.duree_estimee && <div style={{ color: colors.text.faint, fontSize: '11px', marginTop: '2px' }}>{etape.duree_estimee}</div>}
                            {etape.description && <p style={{ color: colors.text.secondary, fontSize: '12px', marginTop: '4px', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{etape.description}</p>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

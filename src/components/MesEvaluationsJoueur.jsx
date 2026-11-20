// Vue joueur et parent des nouvelles fiches d'évaluation (bloc 9 de PLAN-fiches-evaluation.md).
// Le joueur voit les évaluations et tests TERMINÉS que l'éducateur a rendus visibles, et remplit son
// auto-évaluation quand l'éducateur l'a autorisée (et tant qu'elle n'est pas verrouillée).
// Le parent voit la même chose en lecture seule. Les notes de suivi ne sont jamais lues ici.
// Les droits sont tenus par la base (RLS du bloc 2) : cet écran ne fait que demander.
// S'il n'existe aucune nouvelle évaluation pour ce joueur, on ouvre l'ancienne fiche, inchangée.
import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'
import FicheEvaluationJoueur from './FicheEvaluationJoueur'
import { InfoRgpdJoueur, DemandeCorrection, telechargerEvaluations } from './RgpdJoueur'

const ECHELLE = [
  { v: 1, label: 'Non acquis' },
  { v: 2, label: 'En cours' },
  { v: 3, label: 'Acquis' },
]
const ORDRE_PILIERS = ['Tactique', 'Technique', 'Physique', 'Mental']
const COULEUR_PILIER = { Tactique: '#f59e0b', Technique: '#3b82f6', Physique: '#4ade80', Mental: '#a78bfa' }

const fr1 = (x) => (x == null ? '' : (Math.round(x * 10) / 10).toString().replace('.', ','))
const moyenne = (l) => (l.length ? l.reduce((s, x) => s + x, 0) / l.length : null)
const dateFr = (d) => { try { return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) } catch { return d } }

function critereCorrespondant(c, anciens) {
  return anciens.find(p => c.critere_origine_id === p.id)
    || (c.bibliotheque_critere_id ? anciens.find(p => p.bibliotheque_critere_id === c.bibliotheque_critere_id) : null)
    || anciens.find(p => p.pilier === c.pilier && p.libelle.trim().toLowerCase() === c.libelle.trim().toLowerCase())
    || null
}

export default function MesEvaluationsJoueur({ equipeJoueurId, educateurId, role = 'joueur', readOnly = false, onClose }) {
  const colors = useColors()
  const [etat, setEtat] = useState('chargement') // chargement | ancienne | pret
  const [evals, setEvals] = useState([])
  const [criteres, setCriteres] = useState([]) // tous critères des versions concernées
  const [res, setRes] = useState({}) // evaluation_id -> { 'educateur:critere' | 'joueur:critere' -> ligne }
  const [choisie, setChoisie] = useState(null)
  const [message, setMessage] = useState('')

  const charger = useCallback(async () => {
    const { data: ev, error } = await supabase.from('evaluations').select('*')
      .eq('equipe_joueur_id', equipeJoueurId).order('date_evaluation', { ascending: false }).order('created_at', { ascending: false })
    if (error) { setMessage('Impossible de charger tes évaluations.'); setEtat('pret'); return }
    const liste = ev || []
    if (!liste.length) { setEtat('ancienne'); return }
    const versionIds = [...new Set(liste.map(e => e.version_id))]
    const [{ data: crit }, { data: rs }] = await Promise.all([
      supabase.from('criteres_evaluation').select('*').in('version_id', versionIds).order('ordre', { ascending: true }),
      supabase.from('evaluation_resultats').select('*').in('evaluation_id', liste.map(e => e.id)),
    ])
    const m = {}
    for (const r of rs || []) { (m[r.evaluation_id] ||= {})[`${r.source}:${r.critere_id}`] = r }
    setEvals(liste); setCriteres(crit || []); setRes(m)
    setChoisie(c => c && liste.some(e => e.id === c) ? c : liste[0].id)
    setEtat('pret')
  }, [equipeJoueurId])

  useEffect(() => { charger() }, [charger])

  const ev = evals.find(e => e.id === choisie) || null
  const critDeLaFiche = useMemo(() => (ev ? criteres.filter(c => c.version_id === ev.version_id) : []), [ev, criteres])
  const resEv = (ev && res[ev.id]) || {}
  const resultatsVisibles = !!ev && ev.visible_joueur && ev.statut === 'terminee'
  const peutAuto = !!ev && !readOnly && role === 'joueur' && ev.autorise_prefill_joueur && !ev.verrouillee_joueur

  const enregistrer = async (c, champs) => {
    if (!ev) return
    setMessage('')
    const cle = `joueur:${c.id}`
    const vide = Object.values(champs).every(v => v == null)
    let erreur = null
    if (vide) {
      ;({ error: erreur } = await supabase.from('evaluation_resultats').delete().eq('evaluation_id', ev.id).eq('critere_id', c.id).eq('source', 'joueur'))
    } else {
      ;({ error: erreur } = await supabase.from('evaluation_resultats')
        .upsert({ evaluation_id: ev.id, critere_id: c.id, source: 'joueur', ...champs }, { onConflict: 'evaluation_id,critere_id,source' }))
    }
    if (erreur) { setMessage("Ce n'est pas enregistré : l'évaluation a peut-être été verrouillée par ton éducateur."); return }
    setRes(prev => {
      const copie = { ...prev, [ev.id]: { ...(prev[ev.id] || {}) } }
      if (vide) delete copie[ev.id][cle]; else copie[ev.id][cle] = { ...(copie[ev.id][cle] || {}), ...champs }
      return copie
    })
  }

  // Évaluation précédente de même nature (pour montrer l'évolution)
  const precedente = useMemo(() => {
    if (!ev) return null
    return evals.filter(e => e.nature === ev.nature && e.id !== ev.id && e.statut === 'terminee' && e.visible_joueur
      && (e.date_evaluation < ev.date_evaluation || (e.date_evaluation === ev.date_evaluation && e.created_at < ev.created_at)))
      .sort((a, b) => (b.date_evaluation + b.created_at).localeCompare(a.date_evaluation + a.created_at))[0] || null
  }, [ev, evals])

  if (etat === 'ancienne') {
    return <FicheEvaluationJoueur equipeJoueurId={equipeJoueurId} educateurId={educateurId} role={role === 'parent' ? 'joueur' : role} readOnly={readOnly} onClose={onClose} />
  }

  const carte = { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 12, padding: 14, marginBottom: 12 }
  const libelleEval = (e) => e.nature === 'tests' ? `Tests du ${dateFr(e.date_evaluation)}` : (e.numero ? `Évaluation ${e.numero}` : 'Évaluation') + ` · ${dateFr(e.date_evaluation)}`

  const notes = critDeLaFiche.filter(c => c.type === 'note' && (!c.poste || resEv[`educateur:${c.id}`] || resEv[`joueur:${c.id}`]))
  const piliers = [...new Set(notes.map(c => c.pilier))].sort((a, b) => {
    const ia = ORDRE_PILIERS.indexOf(a), ib = ORDRE_PILIERS.indexOf(b)
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
  })
  const tests = critDeLaFiche.filter(c => c.type === 'test')
  const ouiNon = critDeLaFiche.filter(c => c.type === 'oui_non')

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-label="Mes évaluations"
        style={{ background: colors.background.sunken, border: `1px solid ${colors.border.default}`, borderRadius: 16, padding: 20, width: '100%', maxWidth: 720, maxHeight: '92vh', overflowY: 'auto', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 10 }}>
          <div>
            <h3 style={{ color: colors.text.primary, margin: '0 0 4px', fontSize: 17, fontWeight: 800 }}>{role === 'joueur' ? 'Mes évaluations' : 'Évaluations du joueur'}</h3>
            <p style={{ color: colors.text.faint, fontSize: 12, margin: 0 }}>Ce que ton éducateur a choisi de partager. Les notes de travail de l'éducateur ne sont jamais affichées ici.</p>
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: 24, cursor: 'pointer', lineHeight: 1, minWidth: 36, minHeight: 36 }}>×</button>
        </div>

        {etat === 'chargement' && <p style={{ color: colors.text.faint, fontSize: 13 }}>Chargement...</p>}
        {message && <p role="alert" style={{ color: colors.accent.red, fontSize: 13 }}>{message}</p>}

        {etat === 'pret' && <InfoRgpdJoueur role={role} />}

        {etat === 'pret' && evals.length > 0 && (
          <>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {evals.map(e => (
                <button key={e.id} onClick={() => setChoisie(e.id)} style={{
                  padding: '7px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Barlow, sans-serif', minHeight: 36,
                  background: choisie === e.id ? colors.accent.blue : colors.background.surface,
                  color: choisie === e.id ? (colors.accent.onBrand || '#0a0a0a') : colors.text.secondary,
                  border: `1px solid ${choisie === e.id ? colors.accent.blue : colors.border.default}`,
                }}>{libelleEval(e)}</button>
              ))}
            </div>

            {ev && (
              <>
                {!resultatsVisibles && (
                  <div style={{ ...carte, borderColor: colors.accent.amber }}>
                    <p style={{ margin: 0, color: colors.text.secondary, fontSize: 13, lineHeight: 1.5 }}>
                      {ev.statut !== 'terminee'
                        ? "Ton éducateur n'a pas encore terminé cette évaluation."
                        : "Ton éducateur n'a pas rendu les résultats visibles."}
                      {peutAuto ? ' Tu peux remplir ton auto-évaluation ci-dessous : il la verra à côté de sa note.' : ''}
                    </p>
                  </div>
                )}
                {ev.verrouillee_joueur && ev.autorise_prefill_joueur && (
                  <p style={{ color: colors.text.faint, fontSize: 12, margin: '0 0 10px' }}>Ton auto-évaluation est verrouillée par ton éducateur.</p>
                )}

                {resultatsVisibles && (ev.objectif_personnel || ev.objectif_collectif || ev.commentaire) && (
                  <div style={carte}>
                    {ev.commentaire && <p style={{ margin: '0 0 8px', color: colors.text.primary, fontSize: 14, lineHeight: 1.5 }}>{ev.commentaire}</p>}
                    {ev.objectif_personnel && <p style={{ margin: '0 0 6px', color: colors.text.secondary, fontSize: 13 }}><strong>Ton objectif :</strong> {ev.objectif_personnel}</p>}
                    {ev.objectif_collectif && <p style={{ margin: 0, color: colors.text.secondary, fontSize: 13 }}><strong>Objectif collectif :</strong> {ev.objectif_collectif}</p>}
                  </div>
                )}

                {ev.nature === 'evaluation' && piliers.map(p => {
                  const lignes = notes.filter(c => c.pilier === p)
                  const mEdu = moyenne(lignes.map(c => resEv[`educateur:${c.id}`]?.note).filter(n => n != null))
                  const mMoi = moyenne(lignes.map(c => resEv[`joueur:${c.id}`]?.note).filter(n => n != null))
                  const couleur = COULEUR_PILIER[p] || colors.accent.blue
                  return (
                    <div key={p} style={{ ...carte, borderLeft: `4px solid ${couleur}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                        <h4 style={{ margin: 0, color: couleur, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>{p}</h4>
                        <span style={{ color: colors.text.faint, fontSize: 12 }}>
                          {resultatsVisibles && mEdu != null ? `Éducateur ${fr1(mEdu)}/3` : ''}{resultatsVisibles && mEdu != null && mMoi != null ? ' · ' : ''}{mMoi != null ? `Moi ${fr1(mMoi)}/3` : ''}
                        </span>
                      </div>
                      {lignes.map(c => {
                        const rEdu = resultatsVisibles ? resEv[`educateur:${c.id}`] : null
                        const rMoi = resEv[`joueur:${c.id}`]
                        const ecart = rEdu?.note != null && rMoi?.note != null && Math.abs(rEdu.note - rMoi.note) >= 2
                        return (
                          <div key={c.id} style={{ padding: '8px 0', borderTop: `1px solid ${colors.border.subtle}` }}>
                            <div style={{ color: colors.text.primary, fontSize: 14, fontWeight: 600 }}>{c.libelle}</div>
                            {c.acquis_quand && <div style={{ color: colors.text.faint, fontSize: 11, margin: '2px 0 6px' }}>Acquis quand : {c.acquis_quand}</div>}
                            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
                              {resultatsVisibles && (
                                <span style={{ fontSize: 12, color: colors.text.secondary }}>
                                  Éducateur : <strong style={{ color: colors.text.primary }}>{rEdu?.note ? ECHELLE[rEdu.note - 1].label : 'pas noté'}</strong>
                                </span>
                              )}
                              {peutAuto ? (
                                <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: 12, color: colors.text.secondary }}>Moi :</span>
                                  {ECHELLE.map(o => (
                                    <button key={o.v} onClick={() => enregistrer(c, { note: rMoi?.note === o.v ? null : o.v })}
                                      aria-pressed={rMoi?.note === o.v}
                                      style={{
                                        padding: '6px 10px', minHeight: 36, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Barlow, sans-serif',
                                        background: rMoi?.note === o.v ? couleur : colors.background.surface,
                                        color: rMoi?.note === o.v ? '#0a0a0a' : colors.text.secondary,
                                        border: `1px solid ${rMoi?.note === o.v ? couleur : colors.border.default}`,
                                      }}>{o.label}</button>
                                  ))}
                                </span>
                              ) : (
                                rMoi?.note ? <span style={{ fontSize: 12, color: colors.text.secondary }}>Moi : <strong style={{ color: colors.text.primary }}>{ECHELLE[rMoi.note - 1].label}</strong></span> : null
                              )}
                              {ecart && <span style={{ fontSize: 11, fontWeight: 800, color: colors.accent.amber }}>Gros écart : à discuter avec ton éducateur</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}

                {(resultatsVisibles || peutAuto) && tests.length > 0 && (
                  <div style={carte}>
                    <h4 style={{ margin: '0 0 8px', color: colors.text.primary, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Tests</h4>
                    {tests.map(c => {
                      const r = resultatsVisibles ? resEv[`educateur:${c.id}`] : null
                      const rMoi = resEv[`joueur:${c.id}`]
                      const cPrec = precedente ? critereCorrespondant(c, criteres.filter(x => x.version_id === precedente.version_id && x.type === 'test')) : null
                      const rPrec = cPrec ? res[precedente.id]?.[`educateur:${cPrec.id}`] : null
                      const delta = r?.valeur != null && rPrec?.valeur != null ? r.valeur - rPrec.valeur : null
                      const bon = delta == null ? null : (c.sens === 'plus_bas' ? delta < 0 : delta > 0)
                      return (
                        <div key={c.id} style={{ padding: '8px 0', borderTop: `1px solid ${colors.border.subtle}`, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ color: colors.text.primary, fontSize: 14, fontWeight: 600 }}>{c.libelle}</span>
                          <span style={{ fontSize: 13, color: colors.text.secondary, display: 'inline-flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                            {resultatsVisibles && (
                              <span>
                                {r?.valeur != null ? <strong style={{ color: colors.text.primary }}>{fr1(r.valeur)} {c.unite || ''}</strong> : 'pas mesuré'}
                                {c.objectif != null && <span style={{ color: colors.text.faint }}> · objectif {fr1(c.objectif)} {c.unite || ''}</span>}
                                {delta != null && Math.abs(delta) > 0.0001 && (
                                  <span style={{ marginLeft: 8, fontWeight: 800, color: bon ? colors.accent.green : colors.accent.red }}>
                                    {delta > 0 ? '▲' : '▼'} {fr1(Math.abs(delta))}
                                  </span>
                                )}
                              </span>
                            )}
                            {peutAuto ? (
                              <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12 }}>
                                Ma mesure
                                <input type="text" inputMode="decimal" defaultValue={rMoi?.valeur != null ? fr1(rMoi.valeur) : ''}
                                  onBlur={e => {
                                    const t = e.target.value.trim().replace(',', '.')
                                    const n = t === '' ? null : Number(t)
                                    if (t !== '' && (!Number.isFinite(n) || n < 0)) { setMessage('Entre un nombre positif.'); return }
                                    if ((n ?? null) !== (rMoi?.valeur ?? null)) enregistrer(c, { valeur: n })
                                  }}
                                  style={{ width: 80, background: colors.background.raised, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '8px 10px', color: colors.text.primary, fontSize: 14, minHeight: 36, boxSizing: 'border-box' }} />
                                {c.unite}
                              </label>
                            ) : (rMoi?.valeur != null ? <span>Moi : <strong style={{ color: colors.text.primary }}>{fr1(rMoi.valeur)} {c.unite || ''}</strong></span> : null)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {resultatsVisibles && ouiNon.length > 0 && ev.nature === 'evaluation' && (
                  <div style={carte}>
                    <h4 style={{ margin: '0 0 8px', color: colors.text.primary, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Oui / non</h4>
                    {ouiNon.map(c => {
                      const r = resEv[`educateur:${c.id}`]
                      return (
                        <div key={c.id} style={{ padding: '6px 0', borderTop: `1px solid ${colors.border.subtle}`, display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 14 }}>
                          <span style={{ color: colors.text.primary }}>{c.libelle}</span>
                          <strong style={{ color: colors.text.secondary }}>{r?.oui_non == null ? '—' : (r.oui_non ? 'Oui' : 'Non')}</strong>
                        </div>
                      )
                    })}
                  </div>
                )}

                {resultatsVisibles && ev.nature === 'evaluation' && !piliers.length && !tests.length && (
                  <p style={{ color: colors.text.faint, fontSize: 13 }}>Cette évaluation ne contient pas encore de critère noté.</p>
                )}

                {resultatsVisibles && <DemandeCorrection key={ev.id} cible={{ evaluation_id: ev.id }} role={role} libelle={libelleEval(ev)} />}
              </>
            )}
          </>
        )}
        {etat === 'pret' && evals.some(e => e.visible_joueur && e.statut === 'terminee') && (
          <div style={{ marginTop: 12 }}>
            <button onClick={() => { const n = telechargerEvaluations({ evals, criteres, res }); setMessage(n ? '' : "Aucune évaluation visible à télécharger.") }}
              style={{ padding: '8px 14px', minHeight: 40, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Barlow, sans-serif', background: 'transparent', color: colors.text.secondary, border: `1px solid ${colors.border.default}` }}>
              Télécharger {role === 'joueur' ? 'mes évaluations' : 'les évaluations'}
            </button>
            <p style={{ color: colors.text.ghost, fontSize: 11, margin: '6px 0 0', lineHeight: 1.5 }}>Un fichier avec toutes les évaluations, tests et auto-évaluations qui {role === 'joueur' ? 'te' : 'vous'} sont visibles. Pour recevoir aussi les notes de l'éducateur, faites la demande à {role === 'joueur' ? 'ton' : 'votre'} club.</p>
          </div>
        )}
        <p style={{ color: colors.text.ghost, fontSize: 11, margin: '12px 0 0', lineHeight: 1.5 }}>
          Ces informations sont visibles par toi{role === 'joueur' ? ', par tes parents si tu les as invités,' : ' et par le joueur'} et par le club. Pour toute autre question sur tes données, parles-en à ton club.
        </p>
      </div>
    </div>
  )
}

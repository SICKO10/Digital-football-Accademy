import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { alpha } from '../../tokens'
import { labelCategorie } from '../../lib/categories'
import { libelleSaison } from '../../lib/saison'
import {
  actionsDemandeClub, categoriePourDroit, libelleDemandeClub, libelleValideurs, notificationCoach,
} from '../../lib/demandesSaison'

// Page Éducateurs, côté club : demandes des coachs à valider (rester affilié,
// responsable d'une catégorie). La règle des rôles est appliquée par la base
// (saison_traiter_demande) ; saison_peut_valider sert seulement à afficher ou non
// les boutons. Les règles d'affichage sont dans lib/demandesSaison.js.
export default function DemandesClub({ clubId, userId, staff, libelleRole, onChangement, onCompte }) {
  const colors = useColors()
  const [demandes, setDemandes] = useState(null)
  const [droits, setDroits] = useState({})
  const [erreurChargement, setErreurChargement] = useState(false)
  const [enCours, setEnCours] = useState(null)
  const [message, setMessage] = useState({})
  const [refusDe, setRefusDe] = useState(null)
  const [motif, setMotif] = useState('')
  const [departDe, setDepartDe] = useState(null)

  const lire = useCallback(async () => {
    const { data, error } = await supabase
      .from('saison_demandes')
      .select('*, educateur:educateur_id(prenom, nom, avatar_url)')
      .eq('club_id', clubId)
      .eq('statut', 'en_attente')
      .order('created_at', { ascending: true })
    if (error) return null
    const liste = data || []
    // Un appel par catégorie différente (null = affiliation), pas un par demande.
    const cles = [...new Set(liste.map(d => categoriePourDroit(d) ?? ''))]
    const reponses = await Promise.all(cles.map(c =>
      supabase.rpc('saison_peut_valider', { p_club_id: clubId, p_categorie: c || null })
    ))
    if (reponses.some(r => r.error)) return null
    const table = {}
    cles.forEach((c, i) => { table[c] = reponses[i].data === true })
    return { liste, table }
  }, [clubId])

  const appliquer = useCallback((d) => {
    setErreurChargement(!d)
    if (!d) return
    setDemandes(d.liste)
    setDroits(d.table)
    onCompte?.(d.liste.length)
  }, [onCompte])

  const charger = useCallback(async () => { appliquer(await lire()) }, [lire, appliquer])

  useEffect(() => {
    let annule = false
    lire().then(d => { if (!annule) appliquer(d) })
    return () => { annule = true }
  }, [lire, appliquer])

  // Un coach peut envoyer une demande pendant que la page est ouverte.
  useEffect(() => {
    const auRetour = () => { if (document.visibilityState === 'visible') charger() }
    document.addEventListener('visibilitychange', auRetour)
    return () => document.removeEventListener('visibilitychange', auRetour)
  }, [charger])

  const traiter = async (d, decision) => {
    setEnCours(d.id)
    setMessage(m => ({ ...m, [d.id]: '' }))
    const { error } = await supabase.rpc('saison_traiter_demande', {
      p_demande_id: d.id,
      p_decision: decision,
      p_commentaire: decision === 'refusee' ? motif.trim() || null : null,
    })
    if (error) {
      setEnCours(null)
      setMessage(m => ({ ...m, [d.id]: error.message }))
      return
    }
    // Notification dans l'appli seulement (pas d'email). Un échec ici ne défait pas la décision.
    const notif = notificationCoach({ demande: d, decision, labelCategorie })
    await supabase.from('notifications').insert({
      user_id: d.educateur_id, type: 'saison_demande', titre: notif.titre, contenu: notif.contenu, lien: '/educateur', lu: false,
    })
    setRefusDe(null)
    setDepartDe(null)
    setMotif('')
    await charger()
    await onChangement?.()
    setEnCours(null)
  }

  if (erreurChargement) {
    return (
      <div style={carte(colors)}>
        <p style={{ margin: 0, fontSize: 13, color: colors.accent.red }}>Impossible de lire les demandes des éducateurs pour le moment.</p>
        <button onClick={charger} style={{ ...bouton(colors, false), marginTop: 10 }}>Réessayer</button>
      </div>
    )
  }
  if (!demandes || demandes.length === 0) return null

  return (
    <div style={{ ...carte(colors), borderLeft: `4px solid ${colors.accent.blue}` }}>
      <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.accent.blue }}>
        Demandes des éducateurs à traiter · {demandes.length}
      </p>
      <p style={{ margin: '0 0 12px', fontSize: 12, color: colors.text.faint }}>
        Rien n'est accordé au coach tant que le club n'a pas répondu.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {demandes.map(d => {
          const categorie = categoriePourDroit(d)
          const action = actionsDemandeClub({ demande: d, peutValider: droits[categorie ?? ''] === true, userId })
          const nom = [d.educateur?.prenom, d.educateur?.nom].filter(Boolean).join(' ') || 'Éducateur'
          const occupe = enCours === d.id
          return (
            <div key={d.id} style={{ background: colors.background.base, borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <Photo personne={d.educateur} colors={colors} />
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: colors.text.primary }}>{nom}</div>
                  <div style={{ fontSize: 12, color: colors.text.secondary }}>{libelleDemandeClub(d, labelCategorie)}</div>
                  <div style={{ fontSize: 11, color: colors.text.faint }}>Saison {libelleSaison(d.saison)}</div>
                </div>

                {(action === 'valider' || action === 'confirmer_depart') && refusDe !== d.id && departDe !== d.id && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {action === 'valider' && (
                      <>
                        <button onClick={() => traiter(d, 'validee')} disabled={occupe} style={bouton(colors, true)}>{occupe ? '...' : 'Valider'}</button>
                        <button onClick={() => { setRefusDe(d.id); setMotif('') }} disabled={occupe} style={{ ...bouton(colors, false), color: colors.accent.red, borderColor: colors.accent.red + alpha.medium }}>Refuser</button>
                      </>
                    )}
                    {action === 'confirmer_depart' && (
                      <button onClick={() => setDepartDe(d.id)} disabled={occupe} style={bouton(colors, true)}>Confirmer le départ</button>
                    )}
                  </div>
                )}
              </div>

              {action === 'refuse' && (
                <p style={{ margin: 0, fontSize: 12, color: colors.accent.amber }}>
                  À valider par {libelleValideurs({ staff, categorie, libelleRole })}.
                </p>
              )}
              {action === 'propre' && (
                <p style={{ margin: 0, fontSize: 12, color: colors.accent.amber }}>
                  C'est ta propre demande : quelqu'un d'autre au club doit la traiter.
                </p>
              )}

              {departDe === d.id && (
                <div>
                  <p style={{ margin: '0 0 8px', fontSize: 12, color: colors.text.secondary }}>
                    Ce coach sera retiré du club et ses équipes seront libérées, comme avec le bouton Retirer. Ses séances et ses matchs déjà enregistrés ne sont pas supprimés.
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setDepartDe(null)} disabled={occupe} style={bouton(colors, false)}>Retour</button>
                    <button onClick={() => traiter(d, 'validee')} disabled={occupe} style={bouton(colors, true)}>{occupe ? '...' : 'Oui, confirmer le départ'}</button>
                  </div>
                </div>
              )}

              {refusDe === d.id && (
                <div>
                  <label style={{ fontSize: 11, color: colors.text.faint, display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Motif (facultatif, le coach le verra)
                  </label>
                  <input
                    value={motif}
                    onChange={e => setMotif(e.target.value)}
                    maxLength={200}
                    placeholder="Ex. cette équipe est déjà confiée à un autre éducateur"
                    style={{ width: '100%', background: colors.background.raised, border: `1px solid ${colors.border.default}`, borderRadius: 8, color: colors.text.primary, padding: '9px 12px', fontSize: 13, boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif', marginBottom: 8 }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setRefusDe(null)} disabled={occupe} style={bouton(colors, false)}>Retour</button>
                    <button onClick={() => traiter(d, 'refusee')} disabled={occupe} style={{ ...bouton(colors, false), color: colors.accent.red, borderColor: colors.accent.red + alpha.medium }}>
                      {occupe ? '...' : 'Confirmer le refus'}
                    </button>
                  </div>
                </div>
              )}

              {message[d.id] && <p style={{ margin: 0, fontSize: 12, color: colors.accent.red }}>{message[d.id]}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Photo({ personne, colors }) {
  const initiales = `${personne?.prenom?.[0] || ''}${personne?.nom?.[0] || ''}`.toUpperCase() || '?'
  const style = { width: 34, height: 34, borderRadius: '50%', flexShrink: 0 }
  return personne?.avatar_url
    ? <img src={personne.avatar_url} alt="" style={{ ...style, objectFit: 'cover' }} />
    : <span style={{ ...style, background: colors.background.raised, color: colors.text.secondary, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>{initiales}</span>
}

const carte = (colors) => ({ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 14, padding: '16px 18px' })
const bouton = (colors, plein) => plein
  ? { background: colors.accent.blue, color: colors.black, border: 'none', padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }
  : { background: 'transparent', color: colors.text.secondary, border: `1px solid ${colors.border.default}`, padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }

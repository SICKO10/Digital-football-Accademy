import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { police, forme } from '../../tokens'
import { Etiquette } from '../identite'
import { Message } from '../categories/UiCategories'
import { styleCarte, styleBoutonPrincipal, styleBoutonSecondaire, styleChamp, styleEtiquette, couleurCraie, CLASSE_BOUTON, CLASSE_BOUTON_SECONDAIRE, CLASSE_CHAMP } from '../../lib/identite'
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
      <div style={{ ...styleCarte(colors), display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
        <Message ton="erreur" style={{ width: '100%', boxSizing: 'border-box' }}>Impossible de lire les demandes des éducateurs pour le moment.</Message>
        <button onClick={charger} className={CLASSE_BOUTON_SECONDAIRE} style={styleBoutonSecondaire(colors)}>Réessayer</button>
      </div>
    )
  }
  if (!demandes || demandes.length === 0) return null

  const craie = `1px solid ${couleurCraie(colors)}`
  const boutonRefus = { ...styleBoutonSecondaire(colors), borderColor: colors.accent.red }
  const note = { margin: 0, fontFamily: police.texte, fontSize: 13, lineHeight: 1.45, color: colors.text.secondary }

  return (
    <div style={{ ...styleCarte(colors), padding: '16px 18px 16px 21px', boxShadow: `inset ${forme.lisere} 0 0 ${colors.accent.info}` }}>
      <Etiquette as="p" style={{ marginBottom: 4 }}>Demandes des éducateurs à traiter · {demandes.length}</Etiquette>
      <p style={{ ...note, fontSize: 13, margin: '0 0 12px' }}>
        Rien n'est accordé au coach tant que le club n'a pas répondu.
      </p>
      <div>
        {demandes.map((d, i) => {
          const categorie = categoriePourDroit(d)
          const action = actionsDemandeClub({ demande: d, peutValider: droits[categorie ?? ''] === true, userId })
          const nom = [d.educateur?.prenom, d.educateur?.nom].filter(Boolean).join(' ') || 'Éducateur'
          const occupe = enCours === d.id
          return (
            <div key={d.id} style={{ padding: '12px 0', borderTop: i === 0 ? craie : 'none', borderBottom: craie, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Photo personne={d.educateur} colors={colors} />
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontFamily: police.texte, fontSize: 14, fontWeight: 700, color: colors.text.primary }}>{nom}</div>
                  <div style={{ fontFamily: police.texte, fontSize: 13, color: colors.text.secondary }}>{libelleDemandeClub(d, labelCategorie)}</div>
                  <div style={{ fontFamily: police.texte, fontSize: 12, color: colors.text.secondary }}>Saison {libelleSaison(d.saison)}</div>
                </div>

                {(action === 'valider' || action === 'confirmer_depart') && refusDe !== d.id && departDe !== d.id && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {action === 'valider' && (
                      <>
                        <button onClick={() => traiter(d, 'validee')} disabled={occupe} className={CLASSE_BOUTON} style={styleBoutonPrincipal(colors)}>{occupe ? '...' : 'Valider'}</button>
                        <button onClick={() => { setRefusDe(d.id); setMotif('') }} disabled={occupe} className={CLASSE_BOUTON_SECONDAIRE} style={boutonRefus}>Refuser</button>
                      </>
                    )}
                    {action === 'confirmer_depart' && (
                      <button onClick={() => setDepartDe(d.id)} disabled={occupe} className={CLASSE_BOUTON} style={styleBoutonPrincipal(colors)}>Confirmer le départ</button>
                    )}
                  </div>
                )}
              </div>

              {action === 'refuse' && (
                <Message ton="alerte">À valider par {libelleValideurs({ staff, categorie, libelleRole })}.</Message>
              )}
              {action === 'propre' && (
                <Message ton="alerte">C'est ta propre demande : quelqu'un d'autre au club doit la traiter.</Message>
              )}

              {departDe === d.id && (
                <div>
                  <p style={{ ...note, margin: '0 0 8px' }}>
                    Ce coach sera retiré du club et ses équipes seront libérées, comme avec le bouton Retirer. Ses séances et ses matchs déjà enregistrés ne sont pas supprimés.
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => setDepartDe(null)} disabled={occupe} className={CLASSE_BOUTON_SECONDAIRE} style={styleBoutonSecondaire(colors)}>Retour</button>
                    <button onClick={() => traiter(d, 'validee')} disabled={occupe} className={CLASSE_BOUTON} style={styleBoutonPrincipal(colors)}>{occupe ? '...' : 'Oui, confirmer le départ'}</button>
                  </div>
                </div>
              )}

              {refusDe === d.id && (
                <div>
                  <label htmlFor={`motif-${d.id}`} style={{ ...styleEtiquette(colors), display: 'block', marginBottom: 6 }}>
                    Motif (facultatif, le coach le verra)
                  </label>
                  <input
                    id={`motif-${d.id}`}
                    value={motif}
                    onChange={e => setMotif(e.target.value)}
                    maxLength={200}
                    placeholder="Ex. cette équipe est déjà confiée à un autre éducateur"
                    className={CLASSE_CHAMP}
                    style={{ ...styleChamp(colors), marginBottom: 8 }}
                  />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => setRefusDe(null)} disabled={occupe} className={CLASSE_BOUTON_SECONDAIRE} style={styleBoutonSecondaire(colors)}>Retour</button>
                    <button onClick={() => traiter(d, 'refusee')} disabled={occupe} className={CLASSE_BOUTON_SECONDAIRE} style={boutonRefus}>
                      {occupe ? '...' : 'Confirmer le refus'}
                    </button>
                  </div>
                </div>
              )}

              {message[d.id] && <Message ton="erreur">{message[d.id]}</Message>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Photo({ personne, colors }) {
  const initiales = `${personne?.prenom?.[0] || ''}${personne?.nom?.[0] || ''}`.toUpperCase() || '?'
  const style = { width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }
  return personne?.avatar_url
    ? <img src={personne.avatar_url} alt="" style={{ ...style, objectFit: 'cover' }} />
    : <span aria-hidden="true" style={{ ...style, background: colors.background.sunken, border: `1px solid ${couleurCraie(colors)}`, color: colors.text.primary, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: police.titre, fontSize: 15, fontWeight: 700, boxSizing: 'border-box' }}>{initiales}</span>
}

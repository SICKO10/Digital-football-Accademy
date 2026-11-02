import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'
import { colors } from '../tokens'
import { getPosteFamille } from '../lib/postes'
import { dateParisAujourdhui, heureParis, NOTIF_SEANCE_PUBLIEE } from '../lib/seancePubliee'

// « Séance du jour » publiée aux joueurs (PLAN-entrainement.md bloc 2).
// L'éducateur coche les procédés de la fiche liée à l'entraînement, choisit
// les destinataires (équipe entière, familles de poste, joueurs un par un),
// puis publie une copie figée dans seances_publiees. Les groupes sont résolus
// ici en une liste de joueurs (seances_publiees_destinataires), même calcul
// de poste que le reste de l'app (getPosteFamille).
// Visibilité côté joueur (dès la publication, jusqu'à 22h Paris le jour J)
// et droits : règles en base, cf. supabase_entrainement_publie*.sql.

const FAMILLES = [
  ['Gardien', 'Gardiens'],
  ['Défenseur', 'Défenseurs'],
  ['Milieu', 'Milieux'],
  ['Attaquant', 'Attaquants'],
]

// Un bloc de gabarit laissé vide (fiche à 4 blocs par défaut) n'est pas un procédé.
const procedeRempli = p => !!(p && (p.titre?.trim() || p.consignes?.trim() || p.consignes_bef?.trim() || p.organisation?.trim() || p.schema_png))

// Copie figée de ce que le joueur a besoin de voir. Gabarit BEF/BMF : ses
// blocs écrivent but_bef/consignes_bef, d'où les replis.
const copieProcede = p => ({
  numero: p.numero,
  titre: p.titre || '',
  duree: p.duree || '',
  nb_joueurs: p.nb_joueurs || '',
  but: p.but || p.but_bef || '',
  organisation: p.organisation || p.surface || '',
  consignes: p.consignes || p.consignes_bef || '',
  criteres_realisation: p.criteres_realisation || '',
  criteres_reussite: p.criteres_reussite || '',
  schema_png: p.schema_png || '',
  schema_data: p.schema_data || null,
})

const cleProcede = p => `${p.numero}|${(p.titre || '').trim()}`

export default function PublierSeanceJoueurs({ userId, entrainement, fiche, clubCategorieId, equipeNom, joueurs, publication, onFermer, onChange }) {
  const procedes = useMemo(() => (fiche?.fiche_seance?.procedes || []).filter(procedeRempli), [fiche])
  const [eligibles, setEligibles] = useState(null) // [{ joueur_id, nom, prenom, famille }]
  const [coches, setCoches] = useState(() => new Set((publication?.procedes || []).map(cleProcede)))
  const [groupes, setGroupes] = useState(() => new Set((publication?.groupes || []).filter(g => g !== 'joueurs')))
  const [joueursChoisis, setJoueursChoisis] = useState(new Set())
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')

  // Seuls les joueurs avec un compte relié ET une affiliation acceptée à
  // cette équipe peuvent recevoir (même condition que la règle d'ajout en base).
  useEffect(() => {
    let annule = false
    const charger = async () => {
      const roster = joueurs || []
      if (!roster.length) { setEligibles([]); return }
      const { data, error } = await supabase.from('affiliations').select('joueur_id, equipe_joueur_id')
        .eq('educateur_id', userId).eq('statut', 'accepte').in('equipe_joueur_id', roster.map(j => j.id))
      if (annule) return
      if (error) { setErreur('Impossible de charger les joueurs : ' + error.message); setEligibles([]); return }
      const compteParFiche = {}
      ;(data || []).forEach(a => { if (a.joueur_id) compteParFiche[a.equipe_joueur_id] = a.joueur_id })
      const liste = roster.filter(j => compteParFiche[j.id]).map(j => ({
        joueur_id: compteParFiche[j.id], prenom: j.prenom || '', nom: j.nom || '', famille: getPosteFamille(j.poste),
      }))
      setEligibles(liste)
      // Republication : les joueurs déjà destinataires que les groupes
      // cochés ne couvrent pas ont été choisis un par un.
      if (publication) {
        const dejaGroupes = new Set((publication.groupes || []).filter(g => g !== 'joueurs'))
        const parGroupe = dejaGroupes.has('equipe') ? new Set(liste.map(j => j.joueur_id)) : new Set(liste.filter(j => dejaGroupes.has(j.famille)).map(j => j.joueur_id))
        setJoueursChoisis(new Set((publication.destinataires || []).filter(id => !parGroupe.has(id))))
      }
    }
    charger()
    return () => { annule = true }
  }, [userId, joueurs, publication])

  const destinataires = useMemo(() => {
    if (!eligibles) return []
    if (groupes.has('equipe')) return eligibles
    return eligibles.filter(j => groupes.has(j.famille) || joueursChoisis.has(j.joueur_id))
  }, [eligibles, groupes, joueursChoisis])

  const nbSansCompte = (joueurs || []).length - (eligibles?.length || 0)
  const aujourdhui = dateParisAujourdhui()
  const tropTard = entrainement.date < aujourdhui || (entrainement.date === aujourdhui && heureParis() >= 22)
  const procedesCoches = procedes.filter(p => coches.has(cleProcede(p)))
  const peutPublier = !enCours && !tropTard && clubCategorieId && procedesCoches.length > 0 && destinataires.length > 0

  const basculer = (setter, valeur) => setter(prev => {
    const s = new Set(prev)
    if (s.has(valeur)) s.delete(valeur)
    else s.add(valeur)
    return s
  })

  const publier = async () => {
    if (!peutPublier) return
    setEnCours(true)
    setErreur('')
    const groupesListe = [...groupes]
    if (!groupes.has('equipe') && joueursChoisis.size > 0) groupesListe.push('joueurs')
    const payload = {
      educateur_id: userId,
      club_categorie_id: clubCategorieId,
      entrainement_id: entrainement.id,
      fiche_id: fiche?.id || null,
      date_seance: entrainement.date,
      heure: entrainement.heure ? String(entrainement.heure).slice(0, 5) : null,
      lieu: entrainement.lieu || null,
      theme: entrainement.description || fiche?.theme || null,
      procedes: procedesCoches.map(copieProcede),
      groupes: groupesListe,
    }
    const requete = publication
      ? supabase.from('seances_publiees').update(payload).eq('id', publication.id).select('id').single()
      : supabase.from('seances_publiees').insert(payload).select('id').single()
    const { data, error } = await requete
    if (error) {
      setEnCours(false)
      setErreur(error.code === '23505'
        ? 'Une séance est déjà publiée pour cette équipe ce jour-là. Modifie-la depuis l\'entraînement concerné.'
        : 'Publication impossible : ' + error.message)
      return
    }
    // Destinataires : on retire ceux qui ne le sont plus et on ajoute les
    // nouveaux, plutôt que tout effacer puis tout réécrire (un échec au
    // milieu laisserait la séance sans aucun destinataire).
    const avant = new Set(publication?.destinataires || [])
    const apres = new Set(destinataires.map(j => j.joueur_id))
    const aRetirer = [...avant].filter(id => !apres.has(id))
    const aAjouter = [...apres].filter(id => !avant.has(id))
    if (aRetirer.length) {
      const { error: e1 } = await supabase.from('seances_publiees_destinataires').delete().eq('publication_id', data.id).in('joueur_id', aRetirer)
      if (e1) { setEnCours(false); setErreur('Séance enregistrée, mais la liste des joueurs n\'a pas pu être mise à jour : ' + e1.message); return }
    }
    if (aAjouter.length) {
      const { error: e2 } = await supabase.from('seances_publiees_destinataires').insert(aAjouter.map(joueur_id => ({ publication_id: data.id, joueur_id })))
      if (e2) { setEnCours(false); setErreur('Séance enregistrée, mais certains joueurs n\'ont pas pu être ajoutés : ' + e2.message); return }
    }
    // Clochette pour les joueurs qui reçoivent la séance pour la première fois.
    // Un échec ici ne doit pas bloquer la publication, qui est déjà enregistrée.
    if (aAjouter.length) {
      const { error: e3 } = await supabase.from('notifications').insert(aAjouter.map(joueurId => ({
        user_id: joueurId,
        type: NOTIF_SEANCE_PUBLIEE.type,
        titre: NOTIF_SEANCE_PUBLIEE.titre,
        contenu: NOTIF_SEANCE_PUBLIEE.texte(payload.date_seance, payload.heure),
        lien: '/dashboard',
      })))
      if (e3) console.error('Erreur notification séance publiée:', e3)
    }
    setEnCours(false)
    onChange({ id: data.id, ...payload, destinataires: [...apres] })
    onFermer()
  }

  const retirer = async () => {
    if (!publication || !confirm('Retirer cette séance ? Les joueurs ne la verront plus.')) return
    setEnCours(true)
    const { error } = await supabase.from('seances_publiees').delete().eq('id', publication.id)
    setEnCours(false)
    if (error) { setErreur('Retrait impossible : ' + error.message); return }
    onChange(null)
    onFermer()
  }

  const dateLabel = new Date(entrainement.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const titreSection = { margin: '18px 0 8px', fontSize: '11px', fontWeight: 700, color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.5px' }
  const puce = actif => ({ padding: '7px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', border: `1px solid ${actif ? colors.accent.green : colors.border.default}`, background: actif ? colors.accent.green + '1a' : 'transparent', color: actif ? colors.accent.green : colors.text.secondary })

  return (
    <div style={{ position: 'fixed', inset: 0, background: colors.background.overlay, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={onFermer}>
      <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '20px', padding: '22px', maxWidth: '560px', width: '100%', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>{publication ? 'Séance publiée aux joueurs' : 'Publier aux joueurs'}</h3>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: colors.text.faint, textTransform: 'capitalize' }}>
              {dateLabel}{entrainement.heure ? ` · ${String(entrainement.heure).slice(0, 5)}` : ''}{equipeNom ? ` · ${equipeNom}` : ''}
            </p>
          </div>
          <button onClick={onFermer} aria-label="Fermer" style={{ background: 'transparent', border: 'none', color: colors.text.faint, fontSize: '18px', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', marginTop: '6px' }}>
          <p style={{ margin: '10px 0 0', fontSize: '12px', color: colors.text.muted, lineHeight: 1.5 }}>
            Les joueurs la voient dès la publication, jusqu'à 22h le jour de la séance.
          </p>

          <p style={titreSection}>Procédés visibles par les joueurs</p>
          {procedes.length === 0 ? (
            <p style={{ fontSize: '13px', color: colors.text.disabled }}>{fiche ? 'La fiche liée n\'a aucun procédé rempli.' : 'Aucune fiche liée à cet entraînement : tu peux seulement retirer la séance publiée.'}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {procedes.map(p => {
                const cle = cleProcede(p)
                const coche = coches.has(cle)
                return (
                  <label key={cle} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', background: coche ? colors.accent.green + '12' : colors.background.surfaceAlt, border: `1px solid ${coche ? colors.accent.green + '55' : colors.border.faint}` }}>
                    <input type="checkbox" checked={coche} onChange={() => basculer(setCoches, cle)} style={{ width: '18px', height: '18px', accentColor: colors.accent.green, flexShrink: 0 }} />
                    {p.schema_png && <img src={p.schema_png} alt="" style={{ width: '48px', height: '34px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} />}
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: colors.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.numero}. {p.titre?.trim() || 'Procédé sans titre'}
                      </span>
                      <span style={{ fontSize: '11px', color: colors.text.faint }}>
                        {[p.duree && `${p.duree} min`, p.schema_data ? 'schéma animé' : p.schema_png ? 'schéma' : null].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          )}

          <p style={titreSection}>Pour qui</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <button type="button" onClick={() => basculer(setGroupes, 'equipe')} style={puce(groupes.has('equipe'))}>Toute l'équipe</button>
            {FAMILLES.map(([famille, libelle]) => (
              <button key={famille} type="button" disabled={groupes.has('equipe')} onClick={() => basculer(setGroupes, famille)}
                style={{ ...puce(groupes.has('equipe') || groupes.has(famille)), opacity: groupes.has('equipe') ? 0.5 : 1, cursor: groupes.has('equipe') ? 'default' : 'pointer' }}>
                {libelle}
              </button>
            ))}
          </div>

          {!groupes.has('equipe') && eligibles && eligibles.length > 0 && (
            <>
              <p style={{ ...titreSection, marginTop: '14px' }}>Ou joueurs un par un</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '4px' }}>
                {eligibles.map(j => {
                  const parGroupe = groupes.has(j.famille)
                  const coche = parGroupe || joueursChoisis.has(j.joueur_id)
                  return (
                    <label key={j.joueur_id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '8px', fontSize: '13px', cursor: parGroupe ? 'default' : 'pointer', color: parGroupe ? colors.text.faint : colors.text.secondary }}>
                      <input type="checkbox" checked={coche} disabled={parGroupe} onChange={() => basculer(setJoueursChoisis, j.joueur_id)} style={{ width: '16px', height: '16px', accentColor: colors.accent.green, flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.prenom} {j.nom}</span>
                    </label>
                  )
                })}
              </div>
            </>
          )}

          <div style={{ marginTop: '14px', padding: '10px 12px', borderRadius: '10px', background: colors.background.surfaceAlt, fontSize: '12px', color: colors.text.muted, lineHeight: 1.6 }}>
            {eligibles === null ? 'Chargement des joueurs…' : (
              <>
                <strong style={{ color: colors.text.primary }}>{destinataires.length} joueur{destinataires.length > 1 ? 's' : ''}</strong> recevr{destinataires.length > 1 ? 'ont' : 'a'} la séance.
                {nbSansCompte > 0 && <> {nbSansCompte} joueur{nbSansCompte > 1 ? 's' : ''} de l'effectif sans compte relié ne {nbSansCompte > 1 ? 'peuvent' : 'peut'} pas la recevoir.</>}
              </>
            )}
          </div>

          {!clubCategorieId && <p style={{ margin: '10px 0 0', fontSize: '12px', color: colors.accent.amber }}>Choisis d'abord ton équipe active pour publier.</p>}
          {tropTard && <p style={{ margin: '10px 0 0', fontSize: '12px', color: colors.accent.amber }}>Il est trop tard : après 22h le jour de la séance, les joueurs ne la voient plus.</p>}
          {erreur && <p style={{ margin: '10px 0 0', fontSize: '12px', color: colors.accent.red }}>{erreur}</p>}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {publication && (
            <button type="button" onClick={retirer} disabled={enCours}
              style={{ marginRight: 'auto', padding: '10px 14px', borderRadius: '10px', background: 'transparent', border: `1px solid ${colors.accent.red}55`, color: colors.accent.red, fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              Retirer
            </button>
          )}
          <button type="button" onClick={onFermer}
            style={{ padding: '10px 14px', borderRadius: '10px', background: 'transparent', border: `1px solid ${colors.border.default}`, color: colors.text.secondary, fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            Annuler
          </button>
          <button type="button" onClick={publier} disabled={!peutPublier}
            style={{ padding: '10px 16px', borderRadius: '10px', border: 'none', background: peutPublier ? colors.accent.green : colors.background.raised, color: peutPublier ? colors.black : colors.text.disabled, fontWeight: 800, fontSize: '13px', cursor: peutPublier ? 'pointer' : 'default', fontFamily: 'Inter, sans-serif' }}>
            {enCours ? '…' : publication ? 'Mettre à jour' : 'Publier'}
          </button>
        </div>
      </div>
    </div>
  )
}

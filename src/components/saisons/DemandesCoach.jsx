import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { CATEGORIES_MASCULIN, CATEGORIES_FEMININ, labelCategorie } from '../../lib/categories'
import { libelleSaison } from '../../lib/saison'
import { etapeDemandes, preparerDemandeCategorie, libelleStatutDemande } from '../../lib/demandesSaison'

// Mon équipe, côté coach : les deux questions posées au club (rester affilié,
// puis catégorie dont on est responsable). Chaque réponse devient une demande
// (table saison_demandes) que le club valide ; rien n'est accordé tant que le
// club n'a pas répondu. Les règles de décision sont dans lib/demandesSaison.js.
export default function DemandesCoach({ userId, clubId, clubNom, clubCategories, nbEquipes, ajoutOuvert, onFermerAjout, onChangement }) {
  const colors = useColors()
  const [donnees, setDonnees] = useState(null)
  const [erreurChargement, setErreurChargement] = useState(false)
  const [formulaire, setFormulaire] = useState({ nom: 'U13', equipe: 'A' })
  const [envoi, setEnvoi] = useState(false)
  const [message, setMessage] = useState('')
  const [confirmerDepart, setConfirmerDepart] = useState(false)

  const lire = useCallback(async () => {
    const [dem, aff] = await Promise.all([
      supabase.from('saison_demandes').select('*').eq('educateur_id', userId).eq('club_id', clubId).order('created_at', { ascending: false }),
      supabase.from('affiliations').select('saison').eq('educateur_id', userId).eq('statut', 'archive').not('saison', 'is', null).order('saison', { ascending: false }).limit(1),
    ])
    if (dem.error || aff.error) return null
    return { demandes: dem.data || [], derniereClose: aff.data?.[0]?.saison || null }
  }, [userId, clubId])

  const charger = useCallback(async () => {
    const d = await lire()
    setErreurChargement(!d)
    if (d) setDonnees(d)
  }, [lire])

  useEffect(() => {
    let annule = false
    lire().then(d => {
      if (annule) return
      setErreurChargement(!d)
      if (d) setDonnees(d)
    })
    return () => { annule = true }
  }, [lire])

  const verifier = useCallback(async () => {
    await charger()
    await onChangement?.()
  }, [charger, onChangement])

  // Le club peut répondre pendant que la page est ouverte : on relit au retour sur l'onglet.
  useEffect(() => {
    const auRetour = () => { if (document.visibilityState === 'visible') verifier() }
    document.addEventListener('visibilitychange', auRetour)
    return () => document.removeEventListener('visibilitychange', auRetour)
  }, [verifier])

  if (erreurChargement) {
    return (
      <div style={carte(colors)}>
        <p style={{ margin: 0, fontSize: 13, color: colors.accent.red }}>Impossible de lire tes demandes au club pour le moment.</p>
        <button onClick={charger} style={{ ...bouton(colors, false), marginTop: 10 }}>Réessayer</button>
      </div>
    )
  }
  if (!donnees) return null

  const { demandes, derniereClose } = donnees
  const r = etapeDemandes({ nbEquipes, ajoutOuvert, demandes, derniereClose })
  const saisonTxt = libelleSaison(r.cible)

  const envoyer = async (ligne) => {
    setEnvoi(true)
    setMessage('')
    const { error } = await supabase.from('saison_demandes').insert({ club_id: clubId, educateur_id: userId, saison: r.cible, ...ligne })
    setEnvoi(false)
    if (error) {
      setMessage(error.code === '23505'
        ? 'Une demande identique est déjà en attente.'
        : 'La demande n\'a pas pu être envoyée. Réessaie dans un instant.')
      return false
    }
    setConfirmerDepart(false)
    await charger()
    return true
  }

  const repondreAffiliation = (reste) => envoyer({ type: 'affiliation', souhaite_rester: reste })

  const demanderCategorie = async () => {
    const prep = preparerDemandeCategorie({ clubCategories, userId, nom: formulaire.nom, equipe: formulaire.equipe })
    if (prep.erreur) { setMessage(prep.erreur); return }
    const ok = await envoyer({ type: 'categorie', categorie_nom: formulaire.nom, categorie_equipe: formulaire.equipe, club_categorie_id: prep.club_categorie_id })
    if (ok) onFermerAjout?.()
  }

  const annuler = async (id) => {
    setEnvoi(true)
    const { error } = await supabase.rpc('saison_annuler_demande', { p_demande_id: id })
    setEnvoi(false)
    if (error) setMessage(error.message)
    await charger()
  }

  const listeAttente = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {r.enAttente.map(d => (
        <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', background: colors.background.raised, border: `1px solid ${colors.border.default}`, borderRadius: 10, padding: '10px 12px' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: colors.text.primary }}>{d.type === 'categorie' ? `${libelleStatutDemande({ ...d, categorie_nom: labelCategorie(d.categorie_nom) })}` : libelleStatutDemande(d)}</div>
            <div style={{ fontSize: 11, color: colors.text.faint }}>Demande envoyée, en attente du club</div>
          </div>
          <button onClick={() => annuler(d.id)} disabled={envoi} style={bouton(colors, false)}>Annuler la demande</button>
        </div>
      ))}
    </div>
  )

  // Rien à répondre, le club doit traiter : carte dans la page (le coach peut naviguer).
  if (r.etape === 'attente') {
    return (
      <div style={{ ...carte(colors), marginBottom: 18 }}>
        <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: 15, color: colors.text.primary }}>
          {nbEquipes === 0 ? `Demande envoyée à ${clubNom || 'ton club'}, en attente` : 'Demande en attente du club'}
        </p>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: colors.text.faint }}>
          {nbEquipes === 0
            ? `Tant que le club n'a pas validé, tu n'as pas accès à ton équipe ${saisonTxt}. Tu seras averti ici dès qu'il aura répondu.`
            : 'Ton équipe actuelle reste accessible en attendant.'}
        </p>
        {listeAttente}
        {message && <p style={{ margin: '10px 0 0', fontSize: 12, color: colors.accent.red }}>{message}</p>}
        <button onClick={verifier} disabled={envoi} style={{ ...bouton(colors, false), marginTop: 12 }}>Vérifier la réponse du club</button>
      </div>
    )
  }

  if (r.etape === 'aucune') return null

  const surCouche = (contenu) => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }}>
      <div style={{ background: colors.background.base, border: `1px solid ${colors.border.subtle}`, borderRadius: 20, width: '100%', maxWidth: 440, padding: 28 }}>
        {contenu}
      </div>
    </div>
  )

  if (r.etape === 'affiliation') {
    if (confirmerDepart) {
      return surCouche(
        <>
          <p style={titre(colors)}>Quitter {clubNom || 'le club'} ?</p>
          <p style={texte(colors)}>
            Ta demande part au club et rien ne change tant qu'il n'a pas validé. Quand le club valide, tu n'es plus affilié à {clubNom || 'ce club'} : tes équipes y sont libérées et tu perds l'accès à ce qui vient du club (équipe, planning, annonces).
          </p>
          <p style={texte(colors)}>Tes séances et tes matchs déjà enregistrés ne sont pas supprimés.</p>
          {message && <p style={{ margin: '0 0 12px', fontSize: 12, color: colors.accent.red }}>{message}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setConfirmerDepart(false)} disabled={envoi} style={bouton(colors, false)}>Retour</button>
            <button onClick={() => repondreAffiliation(false)} disabled={envoi} style={{ ...bouton(colors, true), flex: 1 }}>
              {envoi ? 'Envoi...' : 'Envoyer ma demande de départ'}
            </button>
          </div>
        </>
      )
    }
    return surCouche(
      <>
        <p style={titre(colors)}>Restes-tu affilié à {clubNom || 'ton club'} ?</p>
        <p style={texte(colors)}>
          Ta saison est clôturée. Pour la saison {saisonTxt}, le club doit confirmer que tu restes dans son équipe d'éducateurs.
        </p>
        {message && <p style={{ margin: '0 0 12px', fontSize: 12, color: colors.accent.red }}>{message}</p>}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => { setMessage(''); setConfirmerDepart(true) }} disabled={envoi} style={bouton(colors, false)}>Non, je pars</button>
          <button onClick={() => repondreAffiliation(true)} disabled={envoi} style={{ ...bouton(colors, true), flex: 1 }}>
            {envoi ? 'Envoi...' : 'Oui, je reste'}
          </button>
        </div>
      </>
    )
  }

  // Question 2 : catégorie et équipe.
  const affEnAttente = r.enAttente.find(d => d.type === 'affiliation')
  return surCouche(
    <>
      <p style={titre(colors)}>De quelle catégorie es-tu responsable ?</p>
      <p style={texte(colors)}>
        {nbEquipes === 0
          ? `Le club valide ta demande pour la saison ${saisonTxt}. Une fois acceptée, tes prochains joueurs ajoutés sont rattachés automatiquement à cette équipe.`
          : 'Cette équipe s\'ajoute aux tiennes une fois la demande validée par le club.'}
      </p>
      {affEnAttente && <p style={{ ...texte(colors), color: colors.accent.blue }}>Ta demande de rester au club est envoyée, en attente.</p>}
      {r.refusee && (
        <p style={{ ...texte(colors), color: colors.accent.red }}>
          Ta dernière demande ({labelCategorie(r.refusee.categorie_nom)} équipe {r.refusee.categorie_equipe}) a été refusée{r.refusee.commentaire ? ` : ${r.refusee.commentaire}` : ''}. Tu peux en faire une autre.
        </p>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div>
          <label style={etiquette(colors)}>Catégorie</label>
          <select style={champ(colors)} value={formulaire.nom} onChange={e => setFormulaire(p => ({ ...p, nom: e.target.value }))}>
            <optgroup label="Masculin">
              {CATEGORIES_MASCULIN.map(c => <option key={c} value={c}>{labelCategorie(c)}</option>)}
            </optgroup>
            <optgroup label="Féminin">
              {CATEGORIES_FEMININ.map(c => <option key={c} value={c}>{labelCategorie(c)}</option>)}
            </optgroup>
          </select>
        </div>
        <div>
          <label style={etiquette(colors)}>Équipe</label>
          <select style={champ(colors)} value={formulaire.equipe} onChange={e => setFormulaire(p => ({ ...p, equipe: e.target.value }))}>
            {['A', 'B', 'C', 'D', 'E'].map(e => <option key={e}>{e}</option>)}
          </select>
        </div>
      </div>
      {message && <p style={{ margin: '0 0 12px', fontSize: 12, color: colors.accent.red }}>{message}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        {nbEquipes > 0 && (
          <button onClick={() => { setMessage(''); onFermerAjout?.() }} disabled={envoi} style={bouton(colors, false)}>Annuler</button>
        )}
        <button onClick={demanderCategorie} disabled={envoi} style={{ ...bouton(colors, true), flex: 1 }}>
          {envoi ? 'Envoi...' : 'Envoyer la demande au club'}
        </button>
      </div>
    </>
  )
}

const carte = (colors) => ({ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: 14, padding: 18 })
const titre = (colors) => ({ margin: '0 0 8px', fontWeight: 800, fontSize: 17, color: colors.text.primary })
const texte = (colors) => ({ margin: '0 0 16px', fontSize: 13, lineHeight: 1.5, color: colors.text.secondary })
const etiquette = (colors) => ({ fontSize: 11, color: colors.text.faint, marginBottom: 4, display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' })
const champ = (colors) => ({ width: '100%', background: colors.background.raised, border: `1px solid ${colors.border.default}`, borderRadius: 8, color: colors.text.primary, padding: '9px 12px', fontSize: 13, boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif' })
const bouton = (colors, plein) => plein
  ? { background: colors.accent.blue, color: colors.black, border: 'none', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }
  : { background: 'transparent', color: colors.text.secondary, border: `1px solid ${colors.border.default}`, padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }

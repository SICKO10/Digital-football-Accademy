import { useCallback, useEffect, useState } from 'react'
import { useColors } from '../../lib/theme'
import { appelerOutils, ouvrirPortail, retourDuPortail, effacerRetourPaiement } from '../../lib/outilsApi'
import { FORFAITS_CLUB, PALIERS_EDUCATEUR, clePourPeriodicite, outilsDuPack, phrasePlacesClub, planModification, tarifParCle, trouverForfait, trouverOutil } from '../../lib/catalogueOutils'
import CarteOutil from './CarteOutil'

// Bloc « Mon abonnement » de Mes outils (bloc 8), pour un compte qui a un
// abonnement des outils en cours : tarif et échéance lus chez Stripe, changer
// ses outils (éducateur) ou son forfait (club), passer de mensuel à annuel ou
// l'inverse à l'échéance (bloc 9), résilier ou reprendre, factures et carte
// (portail Stripe). Rien n'est écrit ici : le serveur modifie Stripe,
// le webhook met la base à jour, puis on recharge les outils.
const dateFr = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
const unite = (periodicite) => (periodicite === 'annuel' ? 'par an' : 'par mois')
const liste = (ids) => ids.map(id => trouverOutil('educateur', id)?.nom || id).join(', ')

// Club du nouveau modèle : `forfaitClub` ({ palier, places, actif, nbEducateurs })
// ajoute le forfait en grand, les dates et les places. `lectureSeule` : on n'appelle
// pas Stripe (personne d'autre que le président ne gère le forfait).
export default function MonAbonnement({ role, outils, forfaitClub = null, lectureSeule = false }) {
  const colors = useColors()
  const [infos, setInfos] = useState(null)
  const [erreurLecture, setErreurLecture] = useState('')
  const [version, setVersion] = useState(0)
  const [mode, setMode] = useState(null)
  const [choix, setChoix] = useState(null)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [message, setMessage] = useState('')
  const [attente, setAttente] = useState(0)

  useEffect(() => {
    if (retourDuPortail()) effacerRetourPaiement()
  }, [])

  useEffect(() => {
    if (lectureSeule) return undefined
    let annule = false
    appelerOutils('abonnement')
      .then(r => { if (!annule) { setInfos(r); setErreurLecture('') } })
      .catch(e => { if (!annule) setErreurLecture(e.message) })
    return () => { annule = true }
  }, [version, lectureSeule])

  // Après un changement, le webhook met quelques secondes à mettre la base à jour.
  const { recharger } = outils
  useEffect(() => {
    if (!attente) return undefined
    const t = setTimeout(() => { recharger(); setVersion(v => v + 1); setAttente(n => n - 1) }, 2500)
    return () => clearTimeout(t)
  }, [attente, recharger])

  const agir = useCallback(async (action, params, texte) => {
    setEnvoi(true)
    setErreur('')
    setMessage('')
    try {
      const r = await appelerOutils(action, params)
      setMessage(texte)
      if (r?.avertissement) setErreur(r.avertissement)
      setMode(null)
      setChoix(null)
      setAttente(4)
    } catch (e) {
      setErreur(e.message)
    } finally {
      setEnvoi(false)
    }
  }, [])

  const portail = async () => {
    setEnvoi(true)
    setErreur('')
    try {
      await ouvrirPortail()
    } catch (e) {
      setErreur(e.message)
      setEnvoi(false)
    }
  }

  const police = 'Inter, sans-serif'
  const titreSection = { margin: '0 0 12px', fontSize: '11px', fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.text.secondary }
  const carte = { background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: 16, padding: '16px 18px' }
  const texte = { margin: 0, fontSize: 13, lineHeight: 1.55, color: colors.text.secondary }
  const bouton = (principal) => ({
    border: principal ? 'none' : `1px solid ${colors.border.default}`, borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700,
    fontFamily: police, cursor: envoi ? 'not-allowed' : 'pointer', opacity: envoi ? 0.7 : 1,
    background: principal ? colors.accent.brand : colors.background.raised, color: principal ? colors.accent.onBrand : colors.text.primary,
  })
  const lien = { background: 'none', border: 'none', padding: '10px 4px', fontSize: 13, fontWeight: 600, fontFamily: police, color: colors.text.faint, cursor: 'pointer', textDecoration: 'underline' }

  if (erreurLecture) return <p role="alert" style={{ ...texte, marginBottom: 24, color: colors.accent.red }}>Abonnement : {erreurLecture}</p>

  const pastille = (libelle, couleur) => (
    <span style={{ fontSize: 12, fontWeight: 800, padding: '4px 11px', borderRadius: 999, color: couleur, background: couleur + '22', whiteSpace: 'nowrap' }}>{libelle}</span>
  )
  const fait = (etiquette, valeur) => (
    <div style={{ minWidth: 0 }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase', color: colors.text.faint }}>{etiquette}</p>
      <p style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 700, color: colors.text.primary }}>{valeur}</p>
    </div>
  )
  const grilleFaits = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16, marginTop: 18, paddingTop: 18, borderTop: `1px solid ${colors.border.subtle}` }
  // Places : éducateurs affiliés par rapport à la limite du forfait, avec une jauge.
  const blocPlaces = forfaitClub && forfaitClub.actif && forfaitClub.places > 0 && (() => {
    const plein = forfaitClub.nbEducateurs >= forfaitClub.places
    const depasse = forfaitClub.nbEducateurs > forfaitClub.places
    const couleur = depasse ? colors.accent.red : plein ? colors.accent.amber : colors.accent.success
    return (
      <div style={{ marginTop: 18, paddingTop: 18, borderTop: `1px solid ${colors.border.subtle}` }}>
        <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: colors.text.primary }}>{phrasePlacesClub(forfaitClub)}</p>
        <div style={{ height: 8, borderRadius: 999, background: colors.background.raised, overflow: 'hidden' }} role="img" aria-label={phrasePlacesClub(forfaitClub)}>
          <div style={{ height: '100%', width: `${Math.min(100, (forfaitClub.nbEducateurs / forfaitClub.places) * 100)}%`, background: couleur, borderRadius: 999 }} />
        </div>
        <p style={{ ...texte, marginTop: 8 }}>
          {depasse
            ? 'Plus d\'éducateurs que de places : les derniers affiliés n\'ont que le socle gratuit. Passe au forfait supérieur pour tous les couvrir.'
            : 'Chaque place donne à un éducateur affilié les outils que tu lui fournis, sans rien payer de son côté.'}
        </p>
      </div>
    )
  })()

  // Club sans abonnement géré ici (accès en lecture seule, compte d'essai ou forfait attribué à la main).
  if (role === 'club' && forfaitClub && (lectureSeule || !infos?.abonnement)) {
    if (!lectureSeule && infos === null) return null
    const f = trouverForfait(forfaitClub.palier)
    return (
      <section aria-labelledby="titre-abonnement" style={{ marginBottom: 32, fontFamily: police }}>
        <h2 id="titre-abonnement" style={titreSection}>Mon forfait</h2>
        <div style={carte}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: colors.text.primary }}>
              {forfaitClub.actif && f ? `Forfait ${f.equipes} équipes` : 'Aucun forfait actif'}
            </p>
            {pastille(forfaitClub.actif ? 'Actif' : 'Inactif', forfaitClub.actif ? colors.accent.success : colors.accent.amber)}
          </div>
          {forfaitClub.actif ? (
            <p style={{ ...texte, marginTop: 6 }}>
              {lectureSeule
                ? 'Seul le président voit le détail de l\'abonnement et peut le changer.'
                : 'Aucun abonnement de paiement n\'est rattaché à ce forfait : il n\'y a donc ni date de renouvellement ni résiliation à gérer ici.'}
            </p>
          ) : (
            <p style={{ ...texte, marginTop: 6 }}>Ton club n'a pas de forfait actif : aucun outil n'est fourni à tes éducateurs pour le moment.</p>
          )}
          {blocPlaces}
        </div>
      </section>
    )
  }
  if (!infos?.abonnement) return null
  const abo = infos.abonnement
  const tarif = tarifParCle(abo.cle)
  const fin = abo.finPeriode ? dateFr(abo.finPeriode) : ''
  const enRetard = abo.statut === 'past_due' || abo.statut === 'unpaid'
  const educateur = role === 'educateur'
  // Changement de périodicité : programmé (lu chez Stripe) ou proposé.
  const programme = abo.changement ? tarifParCle(abo.changement.cle) : null
  const autrePeriodicite = tarifParCle(clePourPeriodicite(abo.cle, tarif?.periodicite === 'annuel' ? 'mensuel' : 'annuel'))
  const economie = autrePeriodicite?.periodicite === 'annuel' ? tarif.prix * 12 - autrePeriodicite.prix : 0

  // Changement prévu, calculé comme le fera le serveur.
  const demande = educateur ? { outils: choix ?? abo.outils } : { palier: choix }
  const change = educateur
    ? choix !== null && (choix.length !== abo.outils.length || choix.some(o => !abo.outils.includes(o)))
    : !!choix
  const plan = mode === 'modifier' && change ? planModification(role, { cleActuelle: abo.cle, outilsActuels: abo.outils }, demande, infos.nbEquipes) : null
  const nouveau = plan && !plan.erreur ? tarifParCle(plan.cle) : null
  const ajoutes = plan?.outils ? plan.outils.filter(o => !abo.outils.includes(o)) : []
  const retires = plan?.outils ? abo.outils.filter(o => !plan.outils.includes(o)) : []

  const explication = () => {
    if (!plan) return educateur ? 'Coche ou décoche tes outils.' : 'Choisis ton nouveau forfait.'
    if (plan.erreur && educateur && choisis.length === 0) return 'Garde au moins un outil. Pour tout arrêter, utilise « Résilier ».'
    if (plan.erreur && educateur && choisis.length >= 7) return `À partir de 7 outils, ton palier donne les ${outilsDuPack().length} : rien ne change.`
    if (plan.erreur) return plan.erreur
    const prix = `${nouveau.prix} € ${unite(nouveau.periodicite)}`
    // Passage de périodicité programmé : à l'échéance, c'est le nouveau tarif dans l'autre périodicité.
    const suite = programme && tarifParCle(clePourPeriodicite(plan.cle, programme.periodicite))
    const prixSuite = suite ? `${suite.prix} € ${unite(suite.periodicite)}` : prix
    const parties = []
    if (plan.sens === 'hausse') {
      parties.push(`Tu passes à « ${nouveau.nom} » : ${prix}. Tu paies aujourd'hui, avec ta carte enregistrée, la différence pour les jours restants jusqu'au ${fin}, puis ${prixSuite}.`)
      if (ajoutes.length) parties.push(`${liste(ajoutes)} : ${ajoutes.length > 1 ? 'actifs' : 'actif'} dès le paiement validé.`)
      if (retires.length) parties.push(`${liste(retires)} : ${retires.length > 1 ? 'arrêtés' : 'arrêté'} tout de suite.`)
    } else if (plan.sens === 'baisse') {
      parties.push(`Ton prix passe à ${prixSuite} à partir du ${fin}, sans remboursement de la période en cours.`)
      if (ajoutes.length) parties.push(`${liste(ajoutes)} : ${ajoutes.length > 1 ? 'actifs' : 'actif'} tout de suite.`)
      if (retires.length) parties.push(`${liste(retires)} : ${retires.length > 1 ? 'restent actifs' : 'reste actif'} jusqu'au ${fin}.`)
    } else {
      parties.push('Même prix.')
      if (ajoutes.length) parties.push(`${liste(ajoutes)} : ${ajoutes.length > 1 ? 'actifs' : 'actif'} tout de suite.`)
      if (retires.length && ajoutes.length) parties.push(`${liste(retires)} : ${retires.length > 1 ? 'arrêtés' : 'arrêté'} tout de suite, ${ajoutes.length > 1 ? 'les nouveaux prennent leur place' : 'le nouveau prend sa place'}.`)
      else if (retires.length) parties.push(`${liste(retires)} : ${retires.length > 1 ? 'arrêtés' : 'arrêté'} tout de suite. Tu peux ${retires.length > 1 ? 'les' : 'le'} reprendre quand tu veux, sans supplément.`)
    }
    if (suite) parties.push(`Ton passage au paiement ${programme.periodicite} le ${dateFr(abo.changement.date)} est gardé${plan.sens === 'meme' ? ` : ${prixSuite}` : ''}.`)
    return parties.join(' ')
  }

  const confirmer = () => {
    const params = educateur ? { outils: plan.outils } : { palier: plan.palier }
    const merci = plan.sens === 'hausse'
      ? 'Changement payé. Mise à jour de tes outils en cours...'
      : 'Changement enregistré. Mise à jour en cours...'
    agir('modifier', params, merci)
  }

  const choisis = choix ?? abo.outils
  const basculer = (id) => setChoix(choisis.includes(id) ? choisis.filter(x => x !== id) : [...choisis, id])
  const forfaitsPossibles = FORFAITS_CLUB.filter(f => f.equipes >= (infos.nbEquipes || 0))
  // Forfait juste au-dessus de l'actuel (le suivant dans la liste des forfaits du club).
  const forfaitSuperieur = !educateur && tarif?.forfait ? FORFAITS_CLUB.find(f => f.equipes > tarif.forfait.equipes) || null : null

  return (
    <section aria-labelledby="titre-abonnement" style={{ marginBottom: 32, fontFamily: police }}>
      <h2 id="titre-abonnement" style={titreSection}>{educateur ? 'Mon abonnement' : 'Mon forfait'}</h2>
      <div style={carte}>
        {educateur ? (
          <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: colors.text.primary }}>
            {tarif ? `${tarif.nom} : ${tarif.prix} € ${unite(tarif.periodicite)}` : 'Abonnement des outils'}
          </p>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px', color: colors.text.primary }}>
                  {tarif?.forfait ? `Forfait ${tarif.forfait.equipes} équipes` : 'Forfait du club'}
                </p>
                {tarif && (
                  <p style={{ margin: '4px 0 0', fontSize: 15, color: colors.text.secondary }}>
                    <strong style={{ color: colors.text.primary }}>{tarif.prix} €</strong> {unite(tarif.periodicite)}
                  </p>
                )}
              </div>
              {enRetard
                ? pastille('Paiement en retard', colors.accent.red)
                : abo.resiliation ? pastille('Résilié', colors.accent.amber) : pastille('Actif', colors.accent.success)}
            </div>
            <div style={grilleFaits}>
              {abo.debut && fait('Souscrit le', dateFr(abo.debut))}
              {fin && fait(abo.resiliation ? 'Prend fin le' : 'Prochain renouvellement', fin)}
              {tarif && fait('Paiement', tarif.periodicite === 'annuel' ? 'Annuel' : 'Mensuel')}
              {tarif?.forfait && fait('Équipes couvertes', `Jusqu'à ${tarif.forfait.equipes}`)}
            </div>
            {blocPlaces}
            <div style={{ height: 14 }} />
          </>
        )}
        {abo.resiliation ? (
          <p style={{ ...texte, color: colors.accent.amber, fontWeight: 600 }}>
            Résilié : {educateur ? 'tes outils restent actifs' : 'ton club garde l\'accès complet'} jusqu'au {fin}.
            Ensuite, {educateur ? 'ton compte revient au socle gratuit' : 'ton club passe en accès limité'}. Tes données sont conservées.
          </p>
        ) : (
          <p style={texte}>{educateur ? `Prochaine échéance le ${fin}. Sans engagement.` : 'Sans engagement : tu peux résilier à tout moment, le forfait reste actif jusqu\'à la date de fin de période.'}</p>
        )}
        {programme && (
          <p style={{ ...texte, marginTop: 8, color: colors.text.primary, fontWeight: 600 }}>
            Passage au paiement {programme.periodicite} le {dateFr(abo.changement.date)} : {programme.prix} € {unite(programme.periodicite)}, {educateur ? 'mêmes outils' : 'même forfait'}.
            {mode === null && (
              <button type="button" disabled={envoi} style={{ ...lien, padding: '0 0 0 8px' }} onClick={() => agir('periodicite', { annuler: true }, `Changement annulé : tu restes en paiement ${tarif?.periodicite}.`)}>
                Annuler ce changement
              </button>
            )}
          </p>
        )}
        {enRetard && (
          <p role="alert" style={{ ...texte, marginTop: 8, color: colors.accent.red, fontWeight: 600 }}>
            Ton dernier paiement n'est pas passé. Stripe va réessayer : mets à jour ta carte dans « Factures et carte » pour garder {educateur ? 'tes outils' : 'l\'accès de ton club'}.
          </p>
        )}
        {message && <p role="status" style={{ ...texte, marginTop: 8, color: colors.accent.success, fontWeight: 600 }}>{message}</p>}
        {erreur && <p role="alert" style={{ ...texte, marginTop: 8, color: colors.accent.red, fontWeight: 600 }}>{erreur}</p>}

        {mode === null && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 14 }}>
            {abo.resiliation ? (
              <button type="button" disabled={envoi} style={bouton(true)} onClick={() => agir('reprendre', {}, 'Abonnement repris : rien ne change pour toi.')}>
                Reprendre mon abonnement
              </button>
            ) : (
              <>
                {!educateur && forfaitSuperieur && (
                  <button type="button" disabled={envoi || enRetard} style={bouton(true)} onClick={() => { setMode('modifier'); setChoix(forfaitSuperieur.palier); setMessage('') }}>
                    Passer au forfait supérieur
                  </button>
                )}
                <button type="button" disabled={envoi || enRetard} style={bouton(educateur || !forfaitSuperieur)} onClick={() => { setMode('modifier'); setChoix(educateur ? abo.outils : null); setMessage('') }}>
                  {educateur ? 'Modifier mes outils' : 'Changer de forfait'}
                </button>
              </>
            )}
            {!abo.resiliation && !programme && autrePeriodicite && (
              <button type="button" disabled={envoi || enRetard} style={bouton(false)} onClick={() => { setMode('periodicite'); setMessage('') }}>
                Passer au paiement {autrePeriodicite.periodicite}
              </button>
            )}
            <button type="button" disabled={envoi} style={bouton(false)} onClick={portail}>Factures et carte</button>
            {!abo.resiliation && (
              <button type="button" disabled={envoi} style={lien} onClick={() => { setMode('resilier'); setMessage('') }}>Résilier</button>
            )}
          </div>
        )}

        {mode === 'resilier' && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${colors.border.subtle}` }}>
            <p style={{ ...texte, color: colors.text.primary }}>
              {educateur ? 'Tes outils restent actifs' : 'Ton club garde l\'accès complet'} jusqu'au {fin}, sans nouveau prélèvement.
              Ensuite, {educateur ? 'ton compte revient au socle gratuit' : 'ton club passe en accès limité'}. Tes données sont conservées et réapparaissent si tu reprends.
              {programme && ` Le passage au paiement ${programme.periodicite} prévu est annulé.`}
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
              <button type="button" disabled={envoi} style={{ ...bouton(true), background: colors.accent.red }} onClick={() => agir('resilier', {}, `Résiliation enregistrée : fin le ${fin}.`)}>
                {envoi ? 'Un instant...' : 'Confirmer la résiliation'}
              </button>
              <button type="button" disabled={envoi} style={bouton(false)} onClick={() => setMode(null)}>Garder mon abonnement</button>
            </div>
          </div>
        )}

        {mode === 'periodicite' && autrePeriodicite && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${colors.border.subtle}` }}>
            <p style={{ ...texte, color: colors.text.primary }}>
              À partir du {fin}, tu paieras {autrePeriodicite.prix} € {unite(autrePeriodicite.periodicite)} au lieu de {tarif.prix} € {unite(tarif.periodicite)}, {educateur ? 'avec les mêmes outils' : 'avec le même forfait'}.
              {economie > 0 && ` Sur 12 mois, tu économises ${economie} €.`}
              {' '}Rien ne change d'ici là, et tu peux annuler ce changement jusqu'au {fin}.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
              <button type="button" disabled={envoi} style={bouton(true)} onClick={() => agir('periodicite', { periodicite: autrePeriodicite.periodicite }, `Changement programmé : paiement ${autrePeriodicite.periodicite} à partir du ${fin}.`)}>
                {envoi ? 'Un instant...' : `Passer au paiement ${autrePeriodicite.periodicite}`}
              </button>
              <button type="button" disabled={envoi} style={bouton(false)} onClick={() => setMode(null)}>Annuler</button>
            </div>
          </div>
        )}

        {mode === 'modifier' && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${colors.border.subtle}` }}>
            {educateur ? (
              <>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '0 0 12px' }}>
                  {PALIERS_EDUCATEUR.map((p, i) => {
                    const debut = i === 0 ? 1 : PALIERS_EDUCATEUR[i - 1].max + 1
                    const courant = (nouveau || tarif)?.palier?.id === p.id
                    return (
                      <span key={p.id} style={{
                        fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 999,
                        color: courant ? colors.accent.onBrand : colors.text.secondary,
                        background: courant ? colors.accent.brand : colors.background.raised,
                      }}>
                        {debut} à {p.max} outils : {tarif?.periodicite === 'annuel' ? p.prixAnnuel : p.prixMensuel} € {unite(tarif?.periodicite)}
                      </span>
                    )
                  })}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12, marginBottom: 14 }}>
                  {outilsDuPack().map(id => {
                    const o = trouverOutil('educateur', id)
                    return <CarteOutil key={id} nom={o.nom} promesse={o.promesse} coche={choisis.includes(id)} onSelection={() => basculer(id)} />
                  })}
                </div>
              </>
            ) : (
              <select aria-label="Nouveau forfait" value={choix || ''} onChange={e => setChoix(e.target.value || null)} style={{
                width: '100%', maxWidth: 420, marginBottom: 12, padding: '11px 14px', borderRadius: 10, border: `1px solid ${colors.border.default}`,
                background: colors.background.raised, color: colors.text.primary, fontSize: 14, fontFamily: police, cursor: 'pointer',
              }}>
                <option value="">Choisis un forfait ({infos.nbEquipes} équipes aujourd'hui)</option>
                {forfaitsPossibles.filter(f => f.palier !== tarif?.forfait?.palier).map(f => (
                  <option key={f.palier} value={f.palier}>{f.nom} : {tarif?.periodicite === 'annuel' ? f.prixAnnuel : f.prixMensuel} € {unite(tarif?.periodicite)}</option>
                ))}
              </select>
            )}
            <p style={{ ...texte, color: plan?.erreur ? colors.accent.amber : colors.text.primary }}>{explication()}</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
              <button type="button" disabled={envoi || !plan || !!plan.erreur} style={{ ...bouton(true), opacity: envoi || !plan || plan.erreur ? 0.5 : 1 }} onClick={confirmer}>
                {envoi ? 'Un instant...' : plan?.sens === 'hausse' ? 'Confirmer et payer la différence' : 'Confirmer le changement'}
              </button>
              <button type="button" disabled={envoi} style={bouton(false)} onClick={() => { setMode(null); setChoix(null); setErreur('') }}>Annuler</button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

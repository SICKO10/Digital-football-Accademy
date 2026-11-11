import { useCallback, useEffect, useState } from 'react'
import { useColors } from '../../lib/theme'
import { appelerOutils, ouvrirPortail, retourDuPortail, effacerRetourPaiement } from '../../lib/outilsApi'
import { FORFAITS_CLUB, PALIERS_EDUCATEUR, outilsDuPack, planModification, tarifParCle, trouverOutil } from '../../lib/catalogueOutils'
import CarteOutil from './CarteOutil'

// Bloc « Mon abonnement » de Mes outils (bloc 8), pour un compte qui a un
// abonnement des outils en cours : tarif et échéance lus chez Stripe, changer
// ses outils (éducateur) ou son forfait (club), résilier ou reprendre, factures
// et carte (portail Stripe). Rien n'est écrit ici : le serveur modifie Stripe,
// le webhook met la base à jour, puis on recharge les outils.
const dateFr = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
const unite = (periodicite) => (periodicite === 'annuel' ? 'par an' : 'par mois')
const liste = (ids) => ids.map(id => trouverOutil('educateur', id)?.nom || id).join(', ')

export default function MonAbonnement({ role, outils }) {
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
    let annule = false
    appelerOutils('abonnement')
      .then(r => { if (!annule) { setInfos(r); setErreurLecture('') } })
      .catch(e => { if (!annule) setErreurLecture(e.message) })
    return () => { annule = true }
  }, [version])

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
      await appelerOutils(action, params)
      setMessage(texte)
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
  if (!infos?.abonnement) return null
  const abo = infos.abonnement
  const tarif = tarifParCle(abo.cle)
  const fin = abo.finPeriode ? dateFr(abo.finPeriode) : ''
  const enRetard = abo.statut === 'past_due' || abo.statut === 'unpaid'
  const educateur = role === 'educateur'

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
    const parties = []
    if (plan.sens === 'hausse') {
      parties.push(`Tu passes à « ${nouveau.nom} » : ${prix}. Tu paies aujourd'hui, avec ta carte enregistrée, la différence pour les jours restants jusqu'au ${fin}, puis ${prix}.`)
      if (ajoutes.length) parties.push(`${liste(ajoutes)} : ${ajoutes.length > 1 ? 'actifs' : 'actif'} dès le paiement validé.`)
      if (retires.length) parties.push(`${liste(retires)} : ${retires.length > 1 ? 'arrêtés' : 'arrêté'} tout de suite.`)
    } else if (plan.sens === 'baisse') {
      parties.push(`Ton prix passe à ${prix} à partir du ${fin}, sans remboursement de la période en cours.`)
      if (ajoutes.length) parties.push(`${liste(ajoutes)} : ${ajoutes.length > 1 ? 'actifs' : 'actif'} tout de suite.`)
      if (retires.length) parties.push(`${liste(retires)} : ${retires.length > 1 ? 'restent actifs' : 'reste actif'} jusqu'au ${fin}.`)
    } else {
      parties.push('Même prix.')
      if (ajoutes.length) parties.push(`${liste(ajoutes)} : ${ajoutes.length > 1 ? 'actifs' : 'actif'} tout de suite.`)
      if (retires.length && ajoutes.length) parties.push(`${liste(retires)} : ${retires.length > 1 ? 'arrêtés' : 'arrêté'} tout de suite, ${ajoutes.length > 1 ? 'les nouveaux prennent leur place' : 'le nouveau prend sa place'}.`)
      else if (retires.length) parties.push(`${liste(retires)} : ${retires.length > 1 ? 'arrêtés' : 'arrêté'} tout de suite. Tu peux ${retires.length > 1 ? 'les' : 'le'} reprendre quand tu veux, sans supplément.`)
    }
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

  return (
    <section aria-labelledby="titre-abonnement" style={{ marginBottom: 32, fontFamily: police }}>
      <h2 id="titre-abonnement" style={titreSection}>Mon abonnement</h2>
      <div style={carte}>
        <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: colors.text.primary }}>
          {tarif ? `${tarif.nom} : ${tarif.prix} € ${unite(tarif.periodicite)}` : 'Abonnement des outils'}
        </p>
        {abo.resiliation ? (
          <p style={{ ...texte, color: colors.accent.amber, fontWeight: 600 }}>
            Résilié : {educateur ? 'tes outils restent actifs' : 'ton club garde l\'accès complet'} jusqu'au {fin}.
            Ensuite, {educateur ? 'ton compte revient au socle gratuit' : 'ton club passe en accès limité'}. Tes données sont conservées.
          </p>
        ) : (
          <p style={texte}>Prochaine échéance le {fin}. Sans engagement.</p>
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
              <button type="button" disabled={envoi || enRetard} style={bouton(true)} onClick={() => { setMode('modifier'); setChoix(educateur ? abo.outils : null); setMessage('') }}>
                {educateur ? 'Modifier mes outils' : 'Changer de forfait'}
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
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
              <button type="button" disabled={envoi} style={{ ...bouton(true), background: colors.accent.red }} onClick={() => agir('resilier', {}, `Résiliation enregistrée : fin le ${fin}.`)}>
                {envoi ? 'Un instant...' : 'Confirmer la résiliation'}
              </button>
              <button type="button" disabled={envoi} style={bouton(false)} onClick={() => setMode(null)}>Garder mon abonnement</button>
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

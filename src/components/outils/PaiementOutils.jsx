import { useEffect, useState } from 'react'
import { useColors } from '../../lib/theme'
import { PALIERS_EDUCATEUR, PACK_EDUCATEUR, palierPourNombre, outilsDuPack } from '../../lib/catalogueOutils'
import { payerOutils, retourPaiementOutils, effacerRetourPaiement } from '../../lib/outilsApi'
import CarteOutil from './CarteOutil'

// Boutique de l'éducateur (premier paiement, bloc 7 bis) : il choisit « tous les
// outils » ou sélectionne les siens, mensuel ou annuel. Le prix dépend du nombre
// d'outils choisis (paliers de 3, 6 et 9 outils) ; il voit le total et part payer
// chez Stripe. `payables` : états des outils qu'il peut payer, calculés par MesOutils,
// qui masque la boutique dès qu'un abonnement est en cours (ajout : bloc 8).
const PERIODES = [['mensuel', 'Mensuel', 'par mois'], ['annuel', 'Annuel', 'par an']]

const aUnAbonnement = (outils) => outils.lignes.some(l => l.source === 'achat')

export function PaiementOutils({ payables }) {
  const colors = useColors()
  const parDefaut = payables.filter(e => e.etat === 'essai' || e.etat === 'essai_termine').map(e => e.outil.id)
  const [coches, setCoches] = useState(null)
  const [periodicite, setPeriodicite] = useState('mensuel')
  const [pack, setPack] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')

  const choisis = pack
    ? payables.map(e => e.outil.id)
    : (coches ?? parDefaut).filter(id => payables.some(e => e.outil.id === id))
  const basculer = (id) => setCoches(choisis.includes(id) ? choisis.filter(x => x !== id) : [...choisis, id])
  const annuel = periodicite === 'annuel'
  const palier = pack ? PACK_EDUCATEUR : palierPourNombre(choisis.length)
  const prixDe = (p) => (annuel ? p.prixAnnuel : p.prixMensuel)
  const total = palier ? prixDe(palier) : 0
  // Économie de l'annuel par rapport à 12 mensualités du même palier.
  const economie = annuel && palier ? palier.prixMensuel * 12 - palier.prixAnnuel : 0
  const nbTous = outilsDuPack().length
  const reste = palier && !pack ? palier.max - choisis.length : 0
  const palierSuivant = palier && PALIERS_EDUCATEUR[PALIERS_EDUCATEUR.indexOf(palier) + 1]
  // Aide sous la grille : combien d'outils de plus sans supplément, ou ce que coûte le palier suivant.
  const aide = pack || choisis.length === 0 ? null
    : palier.max === nbTous ? `Ce palier donne les ${nbTous} outils.`
      : reste > 0 ? `Tu peux ajouter ${reste} ${reste > 1 ? 'outils' : 'outil'} sans supplément.`
        : `Un outil de plus passe à ${prixDe(palierSuivant)} € ${PERIODES.find(p => p[0] === periodicite)[2]}.`
  const unite = PERIODES.find(p => p[0] === periodicite)[2]
  const avecEssai = choisis.some(id => payables.find(e => e.outil.id === id)?.etat === 'essai')

  const payer = async () => {
    setEnvoi(true)
    setErreur('')
    try {
      await payerOutils(pack ? { pack: true, periodicite } : { outils: choisis, periodicite })
    } catch (e) {
      setErreur(e.message)
      setEnvoi(false)
    }
  }

  const badge = ({ etat, joursRestants }) => {
    if (etat === 'essai') return { texte: `En essai : ${joursRestants} ${joursRestants > 1 ? 'jours restants' : 'jour restant'}`, couleur: colors.accent.info }
    if (etat === 'offre') return { texte: `Offert : ${joursRestants} ${joursRestants > 1 ? 'jours restants' : 'jour restant'}`, couleur: colors.accent.success }
    if (etat === 'essai_termine') return { texte: 'Essai terminé', couleur: colors.accent.amber }
    return null
  }

  const police = 'Inter, sans-serif'
  return (
    <section aria-labelledby="titre-boutique" style={{ marginBottom: 32, fontFamily: police }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <h2 id="titre-boutique" style={{ margin: 0, fontSize: '11px', fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.text.secondary }}>Ajouter des outils</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: colors.text.faint }}>Un seul paiement pour tous tes outils, sans engagement.</p>
        </div>
        <div role="radiogroup" aria-label="Périodicité" style={{ display: 'inline-flex', padding: 3, gap: 2, background: colors.background.raised, borderRadius: 999 }}>
          {PERIODES.map(([val, label]) => (
            <button key={val} type="button" role="radio" aria-checked={periodicite === val} onClick={() => setPeriodicite(val)} style={{
              padding: '8px 18px', border: 'none', borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: police,
              background: periodicite === val ? colors.background.surface : 'transparent',
              color: periodicite === val ? colors.text.primary : colors.text.secondary,
              boxShadow: periodicite === val ? '0 1px 3px rgba(0,0,0,0.25)' : 'none',
            }}>{label}</button>
          ))}
        </div>
      </div>

      <button type="button" role="switch" aria-checked={pack} onClick={() => setPack(!pack)} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
        width: '100%', boxSizing: 'border-box', textAlign: 'left', cursor: 'pointer', fontFamily: police, marginBottom: 18,
        padding: '18px 20px', borderRadius: 16, color: colors.text.primary,
        background: `linear-gradient(135deg, ${colors.accent.brand}26, ${colors.accent.brand}08)`,
        border: `2px solid ${pack ? colors.accent.brand : colors.accent.brand + '55'}`,
      }}>
        <span style={{ flex: '1 1 260px', minWidth: 0 }}>
          <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', color: colors.accent.brand, marginBottom: 6 }}>
            Le plus avantageux
          </span>
          <span style={{ display: 'block', fontSize: 17, fontWeight: 800 }}>{PACK_EDUCATEUR.nom}</span>
          <span style={{ display: 'block', fontSize: 13, lineHeight: 1.5, color: colors.text.secondary, marginTop: 4 }}>
            Les {nbTous} outils réunis, au meilleur prix.
          </span>
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <span style={{ fontSize: 26, fontWeight: 900, lineHeight: 1 }}>
            {prixDe(PACK_EDUCATEUR)} €<span style={{ fontSize: 13, fontWeight: 600, color: colors.text.secondary }}> {unite}</span>
          </span>
          <span style={{
            fontSize: 13, fontWeight: 800, borderRadius: 999, padding: '7px 14px',
            background: pack ? colors.accent.brand : 'transparent', color: pack ? colors.accent.onBrand : colors.accent.brand,
            border: `1.5px solid ${colors.accent.brand}`,
          }}>{pack ? 'Pack choisi' : 'Choisir le pack'}</span>
        </span>
      </button>

      <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: colors.text.faint }}>
        {pack ? 'Tous ces outils sont compris dans le pack' : 'Ou choisis seulement ceux dont tu as besoin'}
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '0 0 12px' }}>
        {PALIERS_EDUCATEUR.map((p, i) => {
          const debut = i === 0 ? 1 : PALIERS_EDUCATEUR[i - 1].max + 1
          const courant = palier?.id === p.id
          return (
            <span key={p.id} style={{
              fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 999,
              color: courant ? colors.accent.onBrand : colors.text.secondary,
              background: courant ? colors.accent.brand : colors.background.raised,
            }}>
              {debut === p.max ? debut : `${debut} à ${p.max}`} outils : {prixDe(p)} € {unite}
            </span>
          )
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12, marginBottom: 18 }}>
        {payables.map(e => (
          <CarteOutil
            key={e.outil.id}
            nom={e.outil.nom}
            promesse={e.outil.promesse}
            badge={badge(e)}
            coche={choisis.includes(e.outil.id)}
            desactive={pack}
            onSelection={() => basculer(e.outil.id)}
          />
        ))}
      </div>

      <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: 16, padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, color: colors.text.secondary }}>
              {pack ? PACK_EDUCATEUR.nom : `${choisis.length} ${choisis.length > 1 ? 'outils choisis' : 'outil choisi'}`}{palier && !pack ? ` : palier jusqu'à ${palier.max} outils` : ''}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 900, color: colors.text.primary }}>
              {total} €<span style={{ fontSize: 13, fontWeight: 600, color: colors.text.secondary }}> {unite}</span>
            </p>
            {economie > 0 && (
              <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: colors.accent.success }}>
                Tu économises {economie} € sur l'année par rapport au mensuel
              </p>
            )}
          </div>
          <button type="button" disabled={envoi || (!pack && choisis.length === 0)} onClick={payer} style={{
            background: total ? colors.accent.brand : colors.background.raised, color: total ? colors.accent.onBrand : colors.text.faint,
            border: 'none', borderRadius: 12, padding: '13px 22px', fontSize: 15, fontWeight: 800, fontFamily: police,
            cursor: envoi || !total ? 'not-allowed' : 'pointer', opacity: envoi ? 0.7 : 1,
          }}>
            {envoi ? 'Ouverture du paiement...' : total ? `Payer ${total} € ${unite}` : 'Choisis au moins un outil'}
          </button>
        </div>
        {aide && <p style={{ margin: '10px 0 0', fontSize: 13, fontWeight: 600, color: colors.accent.brand }}>{aide}</p>}
        {erreur && <p role="alert" style={{ margin: '12px 0 0', fontSize: 13, fontWeight: 600, color: colors.accent.red }}>{erreur}</p>}
        <p style={{ margin: '12px 0 0', fontSize: 12, lineHeight: 1.5, color: colors.text.faint }}>
          Sans engagement : tu arrêtes quand tu veux, l'abonnement s'arrête à la fin de la période déjà payée. Paiement sécurisé par Stripe. Tu paies {total} € aujourd'hui, puis {annuel ? 'chaque année' : 'chaque mois'} à la même date.
          {avecEssai && !pack && ' Pour un outil en essai, l\'abonnement remplace l\'essai dès aujourd\'hui.'}
        </p>
      </div>
    </section>
  )
}

// Message au retour de Stripe. Après un paiement, recharge les outils toutes les
// 2 secondes (30 secondes au plus) jusqu'à ce que le webhook les ait activés.
export function RetourPaiement({ outils }) {
  const colors = useColors()
  const [retour] = useState(retourPaiementOutils)
  const [essais, setEssais] = useState(0)
  const active = aUnAbonnement(outils)
  const enAttente = retour === 'paye' && !active && essais < 15

  useEffect(() => {
    if (retour === 'annule' || (retour === 'paye' && active)) effacerRetourPaiement()
  }, [retour, active])

  const { recharger } = outils
  useEffect(() => {
    if (!enAttente) return undefined
    const t = setTimeout(() => { recharger(); setEssais(n => n + 1) }, 2000)
    return () => clearTimeout(t)
  }, [enAttente, essais, recharger])

  if (!retour) return null
  const [texte, couleur] = retour === 'annule'
    ? ['Paiement annulé : rien n\'a été prélevé.', colors.text.secondary]
    : active
      ? ['Paiement validé : tes outils sont actifs.', colors.accent.success]
      : enAttente
        ? ['Paiement validé. Activation de tes outils en cours...', colors.accent.info]
        : ['Ton paiement est validé, mais l\'activation prend plus de temps que prévu. Recharge la page dans quelques minutes.', colors.accent.amber]
  return (
    <p role="status" style={{ margin: '0 0 16px', padding: '10px 14px', borderRadius: 10, border: `1px solid ${couleur}`, fontSize: 13, fontWeight: 600, color: couleur, fontFamily: 'Inter, sans-serif' }}>
      {texte}
    </p>
  )
}

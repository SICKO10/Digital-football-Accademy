import { useEffect, useMemo, useState } from 'react'
import { useColors } from '../../lib/theme'
import { totalComposition } from '../../lib/catalogueOutils'
import { payerOutils, retourPaiementOutils, effacerRetourPaiement } from '../../lib/outilsApi'

// Premier paiement de l'éducateur (bloc 7) : il coche ses outils, choisit
// mensuel ou annuel, voit le total et part payer chez Stripe. Masqué dès qu'un
// abonnement est en cours : l'ajout d'un outil à cet abonnement vient au bloc 8.
const ETATS_PAYABLES = ['disponible', 'essai', 'essai_termine', 'offre']
const PERIODES = [['mensuel', 'Mensuel', 'par mois'], ['annuel', 'Annuel', 'par an']]

const aUnAbonnement = (outils) => outils.lignes.some(l => l.source === 'achat')

export function PaiementOutils({ outils }) {
  const colors = useColors()
  const payables = useMemo(
    () => outils.etats.filter(e => ETATS_PAYABLES.includes(e.etat) && e.outil.achetable && !e.outil.inclus),
    [outils.etats],
  )
  const parDefaut = payables.filter(e => e.etat === 'essai' || e.etat === 'essai_termine').map(e => e.outil.id)
  const [coches, setCoches] = useState(null)
  const [periodicite, setPeriodicite] = useState('mensuel')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')

  if (!outils.pret || aUnAbonnement(outils) || payables.length === 0) return null

  const choisis = (coches ?? parDefaut).filter(id => payables.some(e => e.outil.id === id))
  const basculer = (id) => setCoches(choisis.includes(id) ? choisis.filter(x => x !== id) : [...choisis, id])
  const total = choisis.length ? totalComposition('educateur', choisis, periodicite) : 0
  const totalMensuel = totalComposition('educateur', choisis, 'mensuel')
  const economie = periodicite === 'annuel' && total ? totalMensuel * 12 - total : 0
  const unite = PERIODES.find(p => p[0] === periodicite)[2]
  const avecEssai = choisis.some(id => payables.find(e => e.outil.id === id)?.etat === 'essai')

  const payer = async () => {
    setEnvoi(true)
    setErreur('')
    try {
      await payerOutils({ outils: choisis, periodicite })
    } catch (e) {
      setErreur(e.message)
      setEnvoi(false)
    }
  }

  const police = 'Inter, sans-serif'
  return (
    <div style={{ background: colors.background.surface, border: `1px solid ${colors.accent.brand}`, borderRadius: 14, padding: '16px 18px', marginBottom: 16, fontFamily: police }}>
      <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: colors.text.primary }}>Payer mes outils</p>
      <p style={{ margin: '4px 0 12px', fontSize: 13, lineHeight: 1.5, color: colors.text.secondary }}>
        Coche les outils à garder. Un seul paiement pour tous, au mois ou à l'année.
      </p>

      <div role="radiogroup" aria-label="Périodicité" style={{ display: 'inline-flex', border: `1px solid ${colors.border.default}`, borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
        {PERIODES.map(([val, label]) => (
          <button key={val} type="button" role="radio" aria-checked={periodicite === val} onClick={() => setPeriodicite(val)} style={{
            padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: police,
            background: periodicite === val ? colors.accent.brand : 'transparent',
            color: periodicite === val ? colors.accent.onBrand : colors.text.secondary,
          }}>{label}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        {payables.map(({ outil, etat }) => (
          <label key={outil.id} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 36, fontSize: 14, color: colors.text.primary, cursor: 'pointer' }}>
            <input type="checkbox" checked={choisis.includes(outil.id)} onChange={() => basculer(outil.id)} style={{ width: 18, height: 18, accentColor: colors.accent.brand, flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              {outil.nom}
              {etat === 'essai' && <span style={{ color: colors.text.faint, fontSize: 12 }}> (en essai)</span>}
              {etat === 'essai_termine' && <span style={{ color: colors.text.faint, fontSize: 12 }}> (essai terminé)</span>}
            </span>
            <span style={{ color: colors.text.secondary, fontSize: 13, whiteSpace: 'nowrap' }}>
              {periodicite === 'annuel' ? outil.prixAnnuel : outil.prixMensuel} € {unite}
            </span>
          </label>
        ))}
      </div>

      <div style={{ borderTop: `1px solid ${colors.border.subtle}`, paddingTop: 12 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: colors.text.primary }}>
          Total : {total} € {unite}
          {economie > 0 && <span style={{ fontSize: 13, fontWeight: 600, color: colors.accent.success }}> (tu économises {economie} € sur l'année)</span>}
        </p>
        <p style={{ margin: '4px 0 12px', fontSize: 12, lineHeight: 1.5, color: colors.text.faint }}>
          Paiement sécurisé par Stripe. Tu paies {total} € aujourd'hui, puis {periodicite === 'annuel' ? 'chaque année' : 'chaque mois'} à la même date.
          {avecEssai && ' Pour un outil en essai, l\'abonnement remplace l\'essai dès aujourd\'hui.'}
        </p>
        {erreur && <p role="alert" style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: colors.accent.red }}>{erreur}</p>}
        <button type="button" disabled={envoi || choisis.length === 0} onClick={payer} style={{
          background: choisis.length ? colors.accent.brand : colors.background.raised, color: choisis.length ? colors.accent.onBrand : colors.text.faint,
          border: 'none', borderRadius: 10, padding: '11px 18px', fontSize: 14, fontWeight: 800, fontFamily: police,
          cursor: envoi || !choisis.length ? 'not-allowed' : 'pointer', opacity: envoi ? 0.7 : 1,
        }}>
          {envoi ? 'Ouverture du paiement...' : choisis.length ? `Payer ${total} € ${unite}` : 'Coche au moins un outil'}
        </button>
      </div>
    </div>
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

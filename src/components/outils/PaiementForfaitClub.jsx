import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { FORFAITS_CLUB, forfaitPourEquipes } from '../../lib/catalogueOutils'
import { payerOutils, retourPaiementOutils, effacerRetourPaiement } from '../../lib/outilsApi'
import { CONTACT_EMAIL } from '../../lib/stripeLinks'

// Écran « abonnement non actif » d'un club du nouveau modèle (`modele_outils`) :
// le forfait selon ses équipes se paie ici, en une fois (bloc 7). Remplace pour
// ces clubs l'écran des anciens liens de paiement, qui ne change pas pour les autres.
// Au retour de Stripe, attend que le webhook ait activé l'abonnement puis recharge.
export default function PaiementForfaitClub({ clubId, nomClub, nbEquipes, peutPayer, onDeconnexion }) {
  const colors = useColors()
  const possibles = FORFAITS_CLUB.filter(f => f.equipes >= nbEquipes)
  const [palier, setPalier] = useState(() => forfaitPourEquipes(nbEquipes)?.palier || '')
  const [periodicite, setPeriodicite] = useState('mensuel')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [retour] = useState(retourPaiementOutils)
  const [essais, setEssais] = useState(0)
  const enAttente = retour === 'paye' && essais < 15

  useEffect(() => {
    if (retour === 'annule') effacerRetourPaiement()
  }, [retour])

  useEffect(() => {
    if (!enAttente) return undefined
    const t = setTimeout(async () => {
      const { data } = await supabase.from('profiles').select('abonnement_actif').eq('id', clubId).maybeSingle()
      if (data?.abonnement_actif) window.location.replace(window.location.pathname)
      else setEssais(n => n + 1)
    }, 2000)
    return () => clearTimeout(t)
  }, [enAttente, essais, clubId])

  const forfait = FORFAITS_CLUB.find(f => f.palier === palier)
  const annuel = periodicite === 'annuel'
  const prix = (f) => `${annuel ? f.prixAnnuel : f.prixMensuel} € ${annuel ? 'par an' : 'par mois'}`

  const payer = async () => {
    setEnvoi(true)
    setErreur('')
    try {
      await payerOutils({ palier, periodicite })
    } catch (e) {
      setErreur(e.message)
      setEnvoi(false)
    }
  }

  const police = 'Inter, sans-serif'
  const champ = { padding: '11px 14px', borderRadius: 10, border: `1px solid ${colors.border.default}`, background: colors.background.raised, color: colors.text.primary, fontSize: 14, fontFamily: police }
  return (
    <div style={{ minHeight: '100vh', background: colors.background.base, color: colors.text.primary, fontFamily: police, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 460, width: '100%', background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 20, padding: '2rem 1.5rem', textAlign: 'center', boxSizing: 'border-box' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 0.75rem' }}>Active le forfait de ton club</h1>

        {retour === 'paye' ? (
          <p role="status" style={{ fontSize: 14, lineHeight: 1.5, color: enAttente ? colors.accent.info : colors.accent.amber, margin: '0 0 1.5rem' }}>
            {enAttente
              ? 'Paiement validé. Activation de ton forfait en cours...'
              : 'Ton paiement est validé, mais l\'activation prend plus de temps que prévu. Recharge la page dans quelques minutes.'}
          </p>
        ) : (
          <>
            <p style={{ fontSize: 13, lineHeight: 1.5, color: colors.text.secondary, margin: '0 0 1.25rem' }}>
              Le forfait de {nomClub || 'ton club'} dépend de son nombre d'équipes ({nbEquipes} aujourd'hui). Tous les outils du club sont inclus, et ton forfait couvre aussi tes éducateurs affiliés, à raison d'un éducateur par équipe couverte : tu choisis ensuite ceux que tu leur offres, dans Mon club.
            </p>
            {retour === 'annule' && <p style={{ fontSize: 13, color: colors.text.faint, margin: '0 0 1rem' }}>Paiement annulé : rien n'a été prélevé.</p>}

            {possibles.length === 0 ? (
              <p style={{ fontSize: 13, color: colors.text.secondary, margin: '0 0 1.5rem' }}>
                Ton club a plus de {FORFAITS_CLUB[FORFAITS_CLUB.length - 1].equipes} équipes : écris-nous à {CONTACT_EMAIL} pour une offre adaptée.
              </p>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                  <select aria-label="Forfait" value={palier} onChange={e => setPalier(e.target.value)} style={{ ...champ, flex: 1, minWidth: 200, cursor: 'pointer' }}>
                    {possibles.map(f => <option key={f.palier} value={f.palier}>{f.nom} : {prix(f)}</option>)}
                  </select>
                  <div role="radiogroup" aria-label="Périodicité" style={{ display: 'flex', border: `1px solid ${colors.border.default}`, borderRadius: 10, overflow: 'hidden' }}>
                    {[['mensuel', 'Mensuel'], ['annuel', 'Annuel']].map(([val, label]) => (
                      <button key={val} type="button" role="radio" aria-checked={periodicite === val} onClick={() => setPeriodicite(val)} style={{
                        padding: '11px 16px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: police,
                        background: periodicite === val ? colors.accent.brand : 'transparent',
                        color: periodicite === val ? colors.accent.onBrand : colors.text.faint,
                      }}>{label}</button>
                    ))}
                  </div>
                </div>
                {erreur && <p role="alert" style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: colors.accent.red }}>{erreur}</p>}
                {peutPayer ? (
                  <button type="button" disabled={envoi || !forfait} onClick={payer} style={{
                    display: 'block', width: '100%', padding: 14, borderRadius: 10, border: 'none', marginBottom: 8,
                    background: colors.accent.brand, color: colors.accent.onBrand, fontWeight: 800, fontSize: 14, fontFamily: police,
                    cursor: envoi ? 'not-allowed' : 'pointer', opacity: envoi ? 0.7 : 1,
                  }}>
                    {envoi ? 'Ouverture du paiement...' : forfait ? `Payer ${prix(forfait)}` : 'Choisis un forfait'}
                  </button>
                ) : (
                  <p style={{ fontSize: 13, color: colors.text.faint, margin: '0 0 8px' }}>Seul le compte du club peut payer le forfait.</p>
                )}
                <p style={{ fontSize: 12, color: colors.text.faint, margin: '0 0 1.5rem' }}>
                  Paiement sécurisé par Stripe. Tu paies aujourd'hui, puis {annuel ? 'chaque année' : 'chaque mois'} à la même date.
                </p>
              </>
            )}
          </>
        )}

        <button type="button" onClick={onDeconnexion} style={{ background: 'none', border: 'none', color: colors.text.disabled, fontSize: 12, cursor: 'pointer', fontFamily: police }}>Se déconnecter</button>
      </div>
    </div>
  )
}

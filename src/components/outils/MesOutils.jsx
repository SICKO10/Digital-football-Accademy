import { useState } from 'react'
import { useColors } from '../../lib/theme'
import { appelerOutils } from '../../lib/outilsApi'
import { ESSAI_JOURS, ESSAIS_GRATUITS } from '../../lib/catalogueOutils'
import { PaiementOutils, RetourPaiement } from './PaiementOutils'

const euros = (n) => `${n} €`
const dateFr = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

// Page « Mes outils ». Éducateur : outils actifs, en essai (jours restants),
// disponibles avec leur prix, et essai gratuit de 14 jours. Club : cases à
// cocher, tous les outils sont inclus dans le forfait. Premier paiement des
// outils de l'éducateur : encadré « Payer mes outils » (bloc 7) ; ajout et
// retrait sur un abonnement en cours : bloc 8.
// `outils` : résultat de useOutils ; `peutModifier` : seul le compte club choisit.
export default function MesOutils({ role, outils, peutModifier = true }) {
  const colors = useColors()
  const [enCours, setEnCours] = useState(null)
  const [erreur, setErreur] = useState('')

  const agir = async (outilId, action, params) => {
    setEnCours(outilId)
    setErreur('')
    try {
      await appelerOutils(action, { outil: outilId, ...params })
      outils.recharger()
    } catch (e) {
      setErreur(e.message)
    } finally {
      setEnCours(null)
    }
  }

  const etats = outils.etats
  const carte = { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 14, padding: '16px 18px', fontFamily: 'Inter, sans-serif' }
  const bouton = (principal) => ({
    background: principal ? colors.accent.brand : 'transparent', color: principal ? colors.accent.onBrand : colors.text.primary,
    border: principal ? 'none' : `1px solid ${colors.border.default}`, borderRadius: 10, padding: '9px 16px',
    fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
  })
  const pastille = (couleur) => ({
    display: 'inline-block', fontSize: 11, fontWeight: 700, color: couleur, border: `1px solid ${couleur}`,
    borderRadius: 999, padding: '2px 10px', marginLeft: 8, verticalAlign: 'middle',
  })

  const ligneStatut = ({ etat, finLe, joursRestants, fourniParLeClub }) => {
    if (role === 'club') {
      return etat === 'actif' ? <span style={pastille(colors.accent.success)}>Actif</span> : null
    }
    if (etat === 'actif') return <span style={pastille(colors.accent.success)}>Actif{fourniParLeClub ? ', aussi fourni par ton club' : ''}</span>
    if (etat === 'essai') return <span style={pastille(colors.accent.info)}>Essai : {joursRestants} {joursRestants > 1 ? 'jours restants' : 'jour restant'}</span>
    if (etat === 'retire' || etat === 'offre') return <span style={pastille(colors.accent.amber)}>Actif jusqu'au {dateFr(finLe)}</span>
    if (etat === 'club') return <span style={pastille(colors.accent.info)}>Fourni par ton club</span>
    if (etat === 'essai_termine') return <span style={pastille(colors.accent.amber)}>Essai terminé</span>
    return null
  }

  const action = (e) => {
    const { outil, etat } = e
    if (role === 'club') {
      if (!peutModifier) return null
      const actif = etat === 'actif'
      return (
        <button disabled={enCours === outil.id} onClick={() => agir(outil.id, 'choisir_club', { actif: !actif })} style={bouton(!actif)}>
          {enCours === outil.id ? 'Un instant...' : actif ? 'Retirer de mon dashboard' : 'Ajouter à mon dashboard'}
        </button>
      )
    }
    if (etat === 'disponible' && ESSAIS_GRATUITS) {
      return (
        <button disabled={enCours === outil.id} onClick={() => agir(outil.id, 'essai')} style={bouton(true)}>
          {enCours === outil.id ? 'Un instant...' : `Essayer ${ESSAI_JOURS} jours gratuitement`}
        </button>
      )
    }
    return null
  }

  const prix = (e) => {
    if (role === 'club') return <span style={{ color: colors.text.faint }}>Inclus dans ton forfait</span>
    if (e.etat === 'club') return <span style={{ color: colors.text.faint }}>Inclus par ton club</span>
    return <span style={{ color: colors.text.secondary }}>{euros(e.outil.prixMensuel)} par mois ou {euros(e.outil.prixAnnuel)} par an</span>
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <h1 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 800, color: colors.text.primary }}>Mes outils</h1>
      <p style={{ margin: '0 0 20px', fontSize: 14, lineHeight: 1.5, color: colors.text.secondary }}>
        {role === 'club'
          ? 'Choisis les outils qui apparaissent sur le dashboard de ton club. Ils sont tous inclus dans ton forfait : tu peux en ajouter ou en retirer quand tu veux, sans supplément.'
          : ESSAIS_GRATUITS
            ? `Garde le socle gratuit et ajoute seulement ce dont tu as besoin. Chaque outil s'essaie ${ESSAI_JOURS} jours gratuitement, sans carte bancaire.`
            : 'Garde le socle gratuit et ajoute seulement ce dont tu as besoin : coche tes outils dans « Payer mes outils », au mois ou à l\'année.'}
      </p>
      {role === 'club' && !peutModifier && (
        <p style={{ margin: '0 0 16px', fontSize: 13, color: colors.text.faint }}>Seul le compte du club peut modifier ces choix.</p>
      )}
      {role === 'educateur' && <RetourPaiement outils={outils} />}
      {role === 'educateur' && <PaiementOutils outils={outils} />}
      {erreur && <p role="alert" style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: colors.accent.red }}>{erreur}</p>}
      {!outils.pret && <p style={{ fontSize: 13, color: colors.text.faint }}>Chargement de tes outils...</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {etats.map(e => (
          <div key={e.outil.id} style={carte}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: colors.text.primary }}>
                  {e.outil.nom}{ligneStatut(e)}
                </p>
                <p style={{ margin: '6px 0 8px', fontSize: 13, lineHeight: 1.5, color: colors.text.secondary }}>{e.outil.promesse}</p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{prix(e)}</p>
                {role === 'educateur' && e.etat === 'essai_termine' && (
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: colors.text.secondary }}>
                    Ton essai est terminé. Pour garder cet outil, coche-le dans « Payer mes outils ».
                  </p>
                )}
              </div>
              <div style={{ flexShrink: 0 }}>{action(e)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

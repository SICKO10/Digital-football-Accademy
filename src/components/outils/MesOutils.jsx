import { useMemo, useState } from 'react'
import { useColors } from '../../lib/theme'
import { appelerOutils } from '../../lib/outilsApi'
import { ESSAI_JOURS, ESSAIS_GRATUITS, PALIERS_EDUCATEUR } from '../../lib/catalogueOutils'
import { PaiementOutils, RetourPaiement } from './PaiementOutils'
import CarteOutil from './CarteOutil'

const euros = (n) => `${n} €`
const dateFr = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

// Outils que l'éducateur peut payer dans la boutique (premier paiement).
const ETATS_PAYABLES = ['disponible', 'essai', 'essai_termine', 'offre']
const ETATS_ACTIFS = ['actif', 'retire', 'club', 'essai', 'offre']

// Page « Mes outils ». Éducateur : ses outils actifs en haut, puis la boutique
// (pack ou outils à la carte, bloc 7) tant qu'aucun abonnement n'est en cours ;
// ensuite, les autres outils avec leur prix (ajout sur abonnement : bloc 8).
// Club : une carte par outil avec un interrupteur, tout est inclus dans le forfait.
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
  const abonnement = outils.lignes.some(l => l.source === 'achat')
  const payables = useMemo(
    () => etats.filter(e => ETATS_PAYABLES.includes(e.etat) && e.outil.achetable && !e.outil.inclus),
    [etats],
  )
  const boutique = role === 'educateur' && outils.pret && !abonnement && payables.length > 0
  const dansBoutique = (e) => boutique && payables.includes(e)
  // Un outil en essai ou offert apparaît dans la boutique (pour le garder), pas en double ici.
  const actifs = etats.filter(e => ETATS_ACTIFS.includes(e.etat) && !dansBoutique(e))
  const autres = etats.filter(e => !ETATS_ACTIFS.includes(e.etat) && !dansBoutique(e))

  // Intertitre au format des sections du dashboard éducateur.
  const titreSection = { margin: '0 0 12px', fontSize: '11px', fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.text.secondary }
  const grille = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }

  const badge = ({ etat, finLe, joursRestants, fourniParLeClub }) => {
    if (etat === 'actif') return { texte: fourniParLeClub ? 'Actif, aussi fourni par ton club' : 'Actif', couleur: colors.accent.success }
    if (etat === 'essai') return { texte: `Essai : ${joursRestants} ${joursRestants > 1 ? 'jours restants' : 'jour restant'}`, couleur: colors.accent.info }
    if (etat === 'retire' || etat === 'offre') return { texte: `Actif jusqu'au ${dateFr(finLe)}`, couleur: colors.accent.amber }
    if (etat === 'club') return { texte: 'Fourni par ton club', couleur: colors.accent.info }
    if (etat === 'essai_termine') return { texte: 'Essai terminé', couleur: colors.accent.amber }
    return null
  }

  const prix = (e) => {
    if (e.etat === 'club') return 'Inclus par ton club'
    return `Dans les paliers à partir de ${euros(PALIERS_EDUCATEUR[0].prixMensuel)} par mois`
  }

  const essai = (e) => {
    if (e.etat !== 'disponible' || !ESSAIS_GRATUITS) return null
    return (
      <button type="button" disabled={enCours === e.outil.id} onClick={() => agir(e.outil.id, 'essai')} style={{
        alignSelf: 'flex-start', background: colors.accent.brand, color: colors.accent.onBrand, border: 'none', borderRadius: 10,
        padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
      }}>
        {enCours === e.outil.id ? 'Un instant...' : `Essayer ${ESSAI_JOURS} jours gratuitement`}
      </button>
    )
  }

  const interrupteur = (e) => {
    const actif = e.etat === 'actif'
    if (!peutModifier) return null
    return (
      <button
        type="button" role="switch" aria-checked={actif} aria-label={`${e.outil.nom} sur mon dashboard`}
        disabled={enCours === e.outil.id} onClick={() => agir(e.outil.id, 'choisir_club', { actif: !actif })}
        style={{
          flexShrink: 0, width: 46, height: 26, borderRadius: 999, border: 'none', padding: 3, cursor: 'pointer',
          background: actif ? colors.accent.brand : colors.border.strong, opacity: enCours === e.outil.id ? 0.6 : 1,
          display: 'flex', justifyContent: actif ? 'flex-end' : 'flex-start', transition: 'background .15s',
        }}
      >
        <span style={{ width: 20, height: 20, borderRadius: 999, background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.3)' }} />
      </button>
    )
  }

  const nbClub = etats.filter(e => e.etat === 'actif').length

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '10px', color: colors.text.primary }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.accent.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
          </svg>
          Mes outils
        </h1>
        <p style={{ margin: 0, maxWidth: 620, fontSize: '13px', lineHeight: 1.55, color: colors.text.faint }}>
          {role === 'club'
            ? 'Choisis les outils qui apparaissent sur le dashboard de ton club. Ils sont tous inclus dans ton forfait : tu en ajoutes ou en retires quand tu veux, sans supplément.'
            : ESSAIS_GRATUITS
              ? `Garde le socle gratuit et ajoute seulement ce dont tu as besoin. Chaque outil s'essaie ${ESSAI_JOURS} jours gratuitement, sans carte bancaire.`
              : 'Garde le socle gratuit et ajoute seulement ce dont tu as besoin, au mois ou à l\'année.'}
        </p>
        {role === 'club' && !peutModifier && (
          <p style={{ margin: '10px 0 0', fontSize: 13, color: colors.text.faint }}>Seul le compte du club peut modifier ces choix.</p>
        )}
      </header>

      {role === 'educateur' && <RetourPaiement outils={outils} />}
      {erreur && <p role="alert" style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: colors.accent.red }}>{erreur}</p>}
      {!outils.pret && <p style={{ fontSize: 13, color: colors.text.faint }}>Chargement de tes outils...</p>}

      {outils.pret && role === 'club' && (
        <section aria-labelledby="titre-club">
          <h2 id="titre-club" style={titreSection}>
            Sur ton dashboard <span style={{ fontWeight: 700, color: colors.text.faint }}>· {nbClub} sur {etats.length}</span>
          </h2>
          <div style={grille}>
            {etats.map(e => (
              <CarteOutil
                key={e.outil.id}
                nom={e.outil.nom}
                promesse={e.outil.promesse}
                badge={!peutModifier && e.etat === 'actif' ? badge(e) : null}
                pied="Inclus dans ton forfait"
                action={interrupteur(e)}
              />
            ))}
          </div>
        </section>
      )}

      {outils.pret && role === 'educateur' && (
        <>
          {actifs.length > 0 && (
            <section aria-labelledby="titre-actifs" style={{ marginBottom: 32 }}>
              <h2 id="titre-actifs" style={titreSection}>Tes outils actifs</h2>
              <div style={grille}>
                {actifs.map(e => <CarteOutil key={e.outil.id} nom={e.outil.nom} promesse={e.outil.promesse} badge={badge(e)} />)}
              </div>
            </section>
          )}
          {boutique && <PaiementOutils payables={payables} />}
          {autres.length > 0 && (
            <section aria-labelledby="titre-autres">
              <h2 id="titre-autres" style={titreSection}>Autres outils</h2>
              <div style={grille}>
                {autres.map(e => (
                  <CarteOutil key={e.outil.id} nom={e.outil.nom} promesse={e.outil.promesse} badge={badge(e)} pied={prix(e)}>
                    {essai(e)}
                  </CarteOutil>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

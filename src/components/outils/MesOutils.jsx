import { useMemo, useState } from 'react'
import { useColors } from '../../lib/theme'
import { supabase } from '../../supabase'
import { appelerOutils } from '../../lib/outilsApi'
import { outilsPourEducateurs } from '../../lib/outilsAcces'
import { ESSAI_JOURS, ESSAIS_GRATUITS, PALIERS_EDUCATEUR } from '../../lib/catalogueOutils'
import { PaiementOutils, RetourPaiement } from './PaiementOutils'
import CarteOutil from './CarteOutil'
import Interrupteur from './Interrupteur'
import MonAbonnement from './MonAbonnement'

const euros = (n) => `${n} €`
const dateFr = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

// Outils que l'éducateur peut payer dans la boutique (premier paiement).
const ETATS_PAYABLES = ['disponible', 'essai', 'essai_termine', 'offre']
const ETATS_ACTIFS = ['actif', 'retire', 'club', 'essai', 'offre']

// Page « Mes outils ». Éducateur : son abonnement (MonAbonnement, bloc 8) et ses
// outils actifs en haut, puis la boutique (premier paiement, bloc 7) tant
// qu'aucun abonnement n'est en cours ; ensuite, les autres outils.
// Club : son abonnement (compte du club seulement), puis une carte par outil
// avec un interrupteur, tout est inclus dans le forfait.
// Côté club, une seconde section ouvre certains outils aux éducateurs affiliés
// (bloc 10). Côté éducateur affilié, les outils fournis par le club forment une
// section à part, avec un choix « afficher sur mon dashboard ».
// `outils` : résultat de useOutils ; `peutModifier` : seul le compte club choisit ;
// `userId` : compte de l'éducateur (affichage des outils du club).
export default function MesOutils({ role, outils, peutModifier = true, userId }) {
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
  const duClub = etats.filter(e => e.etat === 'club')
  const actifs = etats.filter(e => ETATS_ACTIFS.includes(e.etat) && e.etat !== 'club' && !dansBoutique(e))
  const autres = etats.filter(e => !ETATS_ACTIFS.includes(e.etat) && !dansBoutique(e))

  // Intertitre au format des sections du dashboard éducateur.
  const titreSection = { margin: '0 0 12px', fontSize: '11px', fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.text.secondary }
  const grille = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }

  const badge = ({ etat, finLe, joursRestants, fourniParLeClub }) => {
    if (etat === 'actif') return { texte: fourniParLeClub ? 'Actif, aussi fourni par ton club' : 'Actif', couleur: colors.accent.success }
    if (etat === 'essai') return { texte: `Essai : ${joursRestants} ${joursRestants > 1 ? 'jours restants' : 'jour restant'}`, couleur: colors.accent.info }
    if (etat === 'offre') return { texte: `Offert : ${joursRestants} ${joursRestants > 1 ? 'jours restants' : 'jour restant'}`, couleur: colors.accent.success }
    if (etat === 'retire') return { texte: `Actif jusqu'au ${dateFr(finLe)}`, couleur: colors.accent.amber }
    if (etat === 'club') return { texte: 'Fourni par ton club', couleur: colors.accent.info }
    if (etat === 'essai_termine') return { texte: 'Essai terminé', couleur: colors.accent.amber }
    return null
  }

  const prix = (e) => {
    if (e.etat === 'club') return 'Inclus par ton club'
    if (abonnement) return 'À ajouter avec « Modifier mes outils »'
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

  const commutateur = ({ actif, libelle, id, onClick, desactive = false }) => (
    <Interrupteur actif={actif} libelle={libelle} onClick={onClick} occupe={enCours === id} desactive={desactive} />
  )

  const interrupteur = (e) => {
    if (!peutModifier) return null
    const actif = e.etat === 'actif'
    return commutateur({
      actif, id: e.outil.id, libelle: `${e.outil.nom} sur mon dashboard`,
      onClick: () => agir(e.outil.id, 'choisir_club', { actif: !actif }),
    })
  }

  // Club : ouvrir un de ses outils à ses éducateurs affiliés (action serveur,
  // qui prévient les éducateurs quand l'outil est fermé).
  const pourEducateurs = outilsPourEducateurs({ etats, ouverts: outils.ouverts })

  // Éducateur affilié : afficher ou masquer un outil fourni par le club (son
  // choix, écrit directement : la règle d'accès ne laisse écrire que ses lignes).
  const afficher = async (outilId, visible) => {
    if (!userId) return
    setEnCours(outilId)
    setErreur('')
    const { error } = await supabase.from('outils_affichage_educateur')
      .upsert({ educateur_id: userId, outil: outilId, visible, maj_le: new Date().toISOString() }, { onConflict: 'educateur_id,outil' })
    setEnCours(null)
    if (error) { setErreur('Ton choix n\'a pas été enregistré, réessaie dans un instant'); return }
    outils.recharger()
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

      {outils.pret && role === 'club' && peutModifier && <MonAbonnement role="club" outils={outils} />}

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

      {outils.pret && role === 'club' && peutModifier && (
        <section aria-labelledby="titre-educateurs" style={{ marginTop: 32 }}>
          <h2 id="titre-educateurs" style={titreSection}>Outils pour mes éducateurs</h2>
          <p style={{ margin: '0 0 14px', maxWidth: 620, fontSize: 13, lineHeight: 1.55, color: colors.text.faint }}>
            Tes éducateurs affiliés reçoivent gratuitement les outils que tu leur ouvres, et choisissent ceux qu'ils affichent. Si tu fermes un outil, ils le perdent tout de suite et sont prévenus.
          </p>
          <div style={grille}>
            {pourEducateurs.map(({ outil, possede, ouvert }) => (
              <CarteOutil
                key={outil.id}
                nom={outil.nom}
                promesse={outil.promesse}
                pied={possede ? (ouvert ? 'Ouvert à tes éducateurs' : 'Fermé pour tes éducateurs') : 'Active d\'abord cet outil sur ton dashboard'}
                action={commutateur({
                  actif: ouvert, id: `ouvert_${outil.id}`, desactive: !possede && !ouvert,
                  libelle: `${outil.nom} pour mes éducateurs`,
                  onClick: () => agir(`ouvert_${outil.id}`, 'ouvrir_club', { outil: outil.id, ouvert: !ouvert }),
                })}
              />
            ))}
          </div>
        </section>
      )}

      {outils.pret && role === 'educateur' && (
        <>
          {abonnement && <MonAbonnement role="educateur" outils={outils} />}
          {actifs.length > 0 && (
            <section aria-labelledby="titre-actifs" style={{ marginBottom: 32 }}>
              <h2 id="titre-actifs" style={titreSection}>Tes outils actifs</h2>
              <div style={grille}>
                {actifs.map(e => <CarteOutil key={e.outil.id} nom={e.outil.nom} promesse={e.outil.promesse} badge={badge(e)} />)}
              </div>
            </section>
          )}
          {duClub.length > 0 && (
            <section aria-labelledby="titre-club-educ" style={{ marginBottom: 32 }}>
              <h2 id="titre-club-educ" style={titreSection}>Fournis par ton club</h2>
              <div style={grille}>
                {duClub.map(e => (
                  <CarteOutil
                    key={e.outil.id} nom={e.outil.nom} promesse={e.outil.promesse} badge={badge(e)}
                    pied={e.masque ? 'Masqué sur ton dashboard' : 'Affiché sur ton dashboard'}
                    action={commutateur({
                      actif: !e.masque, id: e.outil.id, libelle: `${e.outil.nom} sur mon dashboard`,
                      onClick: () => afficher(e.outil.id, e.masque),
                    })}
                  />
                ))}
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

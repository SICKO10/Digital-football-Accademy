import { useCallback, useMemo, useRef, useState } from 'react'
import { useColors } from '../../lib/theme'
import { ecrireAffichageClub } from './ecritures'
import { appelerOutils } from '../../lib/outilsApi'
import { OUTILS, THEMES_CLUB } from '../../lib/catalogueOutils'
import CarteOutil from '../outils/CarteOutil'
import Interrupteur from '../outils/Interrupteur'
import BandeauAnnuler from './BandeauAnnuler'
import ModelesDepart from './ModelesDepart'

const OUTILS_CLUB = OUTILS.filter(o => o.role === 'club')

// Étape 2 de Mon club : tous les outils du club rangés par thème, un
// interrupteur et une ligne d'explication par outil.
// - Ancien modèle : tout est affiché ; l'interrupteur retire seulement l'entrée
//   du menu du club (table mon_club_affichage).
// - Nouveau modèle : l'interrupteur est celui de « Mes outils » (action serveur
//   choisir_club, outils inclus dans le forfait). Seul le compte du club peut
//   l'utiliser, comme dans Mes outils.
// `outils` : résultat de useOutils ; `clubId` : compte du club ; `estCompteClub` :
// la personne connectée est le compte du club lui-même ; `educateurs` : éducateurs
// affiliés acceptés (lignes de club_educateurs), pour les modèles de départ.
export default function EtapeOutils({ outils, clubId, estCompteClub, educateurs, couleurPrincipale }) {
  const colors = useColors()
  const nouveauModele = outils.actif
  const [enCours, setEnCours] = useState(null)
  const [erreur, setErreur] = useState('')
  const [changement, setChangement] = useState(null)
  const finChangement = useCallback(() => setChangement(null), [])
  const numero = useRef(0)

  const pret = nouveauModele ? outils.pret : outils.masquesClubLus
  const peutAgir = !nouveauModele || estCompteClub
  const allume = (o) => (nouveauModele
    ? outils.etats.some(e => e.outil.id === o.id && e.etat === 'actif')
    : !outils.masquesClub.includes(o.id))

  const appliquer = async (o, visible) => {
    if (nouveauModele) await appelerOutils('choisir_club', { outil: o.id, actif: visible })
    else await ecrireAffichageClub(clubId, o.id, visible)
    outils.recharger()
  }

  const changer = async (o) => {
    const visible = !allume(o)
    setEnCours(o.id)
    setErreur('')
    try {
      await appliquer(o, visible)
      // Un outil désactivé est aussi fermé à ses éducateurs (serveur) : l'annulation ne le rouvre pas.
      const fermeAuxEducateurs = nouveauModele && !visible && outils.ouverts.includes(o.id)
      setChangement({
        id: ++numero.current,
        message: `${o.nom} : ${visible ? 'affiché' : (nouveauModele ? 'désactivé' : 'retiré du menu')}.${fermeAuxEducateurs ? ' Il faudra le rouvrir à vos éducateurs.' : ''}`,
        annuler: async () => {
          setChangement(null)
          setErreur('')
          try { await appliquer(o, !visible) } catch (e) { setErreur(e.message) }
        },
      })
    } catch (e) {
      setErreur(e.message || 'Le changement n\'a pas été enregistré, réessayez dans un instant.')
    } finally {
      setEnCours(null)
    }
  }

  const listeEducateurs = useMemo(() => (educateurs || []).map(e => ({
    id: e.educateur_id,
    nom: [e.educateur?.prenom, e.educateur?.nom].filter(Boolean).join(' ') || e.educateur?.email || 'Éducateur',
  })), [educateurs])

  const parTheme = useMemo(
    () => THEMES_CLUB.map(t => ({ ...t, outils: OUTILS_CLUB.filter(o => o.theme === t.id) })).filter(t => t.outils.length > 0),
    [],
  )
  const titreTheme = { margin: '0 0 12px', fontSize: '11px', fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.text.secondary }
  const grille = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <p style={{ margin: '0 0 16px', maxWidth: 620, fontSize: 13, lineHeight: 1.55, color: colors.text.faint }}>
        {nouveauModele
          ? 'Ces outils sont inclus dans votre forfait. Un outil désactivé disparaît du dashboard du club ; vos données restent là et reviennent dès que vous le réactivez.'
          : 'Tous vos outils sont affichés. Retirer un outil enlève seulement son entrée du menu du club : rien n\'est supprimé, et en le réaffichant vous retrouvez tout.'}
      </p>
      {nouveauModele && !estCompteClub && (
        <p style={{ margin: '0 0 16px', fontSize: 13, color: colors.text.faint }}>
          Seul le compte du club active ou désactive les outils de son forfait. Vous voyez ici leur état.
        </p>
      )}
      {erreur && <p role="alert" style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: colors.accent.red }}>{erreur}</p>}
      {!pret && <p style={{ fontSize: 13, color: colors.text.faint }}>Chargement des outils...</p>}

      {pret && peutAgir && (
        <ModelesDepart clubId={clubId} educateurs={listeEducateurs} nouveauModele={nouveauModele} clubAffiche={allume}
          appliquerClub={appliquer} couleur={couleurPrincipale} />
      )}

      {pret && parTheme.map(t => (
        <section key={t.id} aria-labelledby={`theme-${t.id}`} style={{ marginBottom: 28 }}>
          <h3 id={`theme-${t.id}`} style={titreTheme}>{t.titre}</h3>
          <div style={grille}>
            {t.outils.map(o => {
              const actif = allume(o)
              return (
                <CarteOutil
                  key={o.id}
                  nom={o.nom}
                  promesse={o.promesse}
                  badge={actif ? null : { texte: nouveauModele ? 'Désactivé' : 'Retiré du menu', couleur: colors.accent.amber }}
                  pied={o.explication}
                  action={peutAgir
                    ? <Interrupteur actif={actif} libelle={`${o.nom} sur le dashboard du club`} onClick={() => changer(o)} occupe={enCours === o.id} />
                    : null}
                />
              )
            })}
          </div>
        </section>
      ))}

      <BandeauAnnuler changement={changement} onFin={finChangement} />
    </div>
  )
}

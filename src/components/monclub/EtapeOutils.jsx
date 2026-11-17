import { useCallback, useMemo, useRef, useState } from 'react'
import { useColors } from '../../lib/theme'
import { ecrireAffichageClub } from './ecritures'
import { appelerOutils } from '../../lib/outilsApi'
import { OUTILS, THEMES_CLUB } from '../../lib/catalogueOutils'
import { EnteteEtape, CarteReglage, Encart } from './ui'
import { ICONES, stylesMonClub } from './uiMonClub'
import Interrupteur from '../outils/Interrupteur'
import { styleCarte, styleEtiquette, styleChiffreHeros, couleurCraie } from '../../lib/identite'
import { forme, police } from '../../tokens'
import BandeauAnnuler from './BandeauAnnuler'

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
export default function EtapeOutils({ outils, clubId, estCompteClub }) {
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

  const parTheme = useMemo(
    () => THEMES_CLUB.map(t => ({ ...t, outils: OUTILS_CLUB.filter(o => o.theme === t.id) })).filter(t => t.outils.length > 0),
    [],
  )
  const st = stylesMonClub(colors)
  const nbAffiches = pret ? OUTILS_CLUB.filter(allume).length : 0
  const grille = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }
  const texte = nouveauModele
    ? 'Ces outils sont inclus dans votre forfait. Un outil désactivé disparaît du dashboard du club ; vos données restent là et reviennent dès que vous le réactivez.'
    : 'Tous vos outils sont affichés. Retirer un outil enlève seulement son entrée du menu du club : rien n\'est supprimé, et en le réaffichant vous retrouvez tout.'

  return (
    <div style={{ fontFamily: 'Barlow, sans-serif' }}>
      <EnteteEtape icone={ICONES.outils} titre="Outils du club" texte={texte}>
        {pret && (
          <div style={{ flex: '0 1 220px', minWidth: 170, ...styleCarte(colors), padding: '12px 16px' }}>
            <p style={{ margin: 0, fontSize: 13, color: colors.text.secondary }}><strong style={{ ...styleChiffreHeros(colors, 26), marginRight: 4 }}>{nbAffiches}</strong> sur {OUTILS_CLUB.length} affichés</p>
            <div role="meter" aria-valuemin={0} aria-valuemax={OUTILS_CLUB.length} aria-valuenow={nbAffiches} aria-label="Outils affichés" style={{ height: 6, borderRadius: forme.rayonPastille, marginTop: 8, background: colors.border.default, overflow: 'hidden' }}>
              <div style={{ width: `${(nbAffiches / OUTILS_CLUB.length) * 100}%`, height: '100%', background: st.marque }} />
            </div>
          </div>
        )}
      </EnteteEtape>
      {nouveauModele && !estCompteClub && (
        <Encart>Seul le compte du club active ou désactive les outils de son forfait. Vous voyez ici leur état.</Encart>
      )}
      {erreur && <p role="alert" style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: colors.accent.red }}>{erreur}</p>}
      {!pret && <p style={{ fontSize: 13, color: colors.text.secondary }}>Chargement des outils...</p>}

      {pret && parTheme.map(t => {
        const nb = t.outils.filter(allume).length
        return (
          <section key={t.id} aria-labelledby={`theme-${t.id}`} style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <h3 id={`theme-${t.id}`} style={{ ...styleEtiquette(colors), margin: 0 }}>{t.titre}</h3>
              <span aria-hidden="true" style={{ flex: 1, height: 1, background: couleurCraie(colors) }} />
              <span style={{ ...styleEtiquette(colors), fontFamily: police.titre, fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>{nb} sur {t.outils.length}</span>
            </div>
            <div style={grille}>
              {t.outils.map(o => {
                const actif = allume(o)
                return (
                  <CarteReglage
                    key={o.id}
                    nom={o.nom}
                    description={o.promesse}
                    pied={o.explication}
                    actif={actif}
                    badge={actif ? null : { texte: nouveauModele ? 'Désactivé' : 'Retiré du menu', couleur: colors.accent.amber }}
                    action={peutAgir
                      ? <Interrupteur actif={actif} libelle={`${o.nom} sur le dashboard du club`} onClick={() => changer(o)} occupe={enCours === o.id} />
                      : null}
                  />
                )
              })}
            </div>
          </section>
        )
      })}

      <BandeauAnnuler changement={changement} onFin={finChangement} />
    </div>
  )
}

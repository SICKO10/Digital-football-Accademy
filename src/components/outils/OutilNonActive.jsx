import { useColors } from '../../lib/theme'
import { styleCarte, styleTitreEcran, styleBoutonPrincipal, styleBoutonSecondaire, CLASSE_BOUTON, CLASSE_BOUTON_SECONDAIRE } from '../../lib/identite'
import { police } from '../../tokens'
import Etiquette from '../identite/Etiquette'
import { infosOutilPourMenu, infosOutil } from '../../lib/outilsAcces'

// Carte affichée à la place d'une page dont l'outil n'est pas actif sur le
// compte. Le bouton vers « Mes outils » (essai gratuit ou choix des outils du club)
// n'apparaît que si le dashboard fournit `onMesOutils`; le paiement viendra
// aux blocs 6 à 8.
// `cle` : entrée de menu d'une page verrouillée ; `outilId` : outil nommé par un
// bouton d'une page ouverte (avec `detail`, la fonction précise et `enModale`).
export default function OutilNonActive({ role, cle, outilId, detail, libelleBouton = 'Retour à l\'accueil', enModale = false, onRetour, onMesOutils }) {
  const colors = useColors()
  const outil = outilId ? infosOutil(role, outilId) : infosOutilPourMenu(role, cle)
  if (!outil) return null
  const viaClub = !!outil.viaClub
  const Titre = enModale ? 'h2' : 'h1'
  return (
    <div style={{ ...styleCarte(colors), maxWidth: 560, margin: enModale ? 0 : '48px auto', padding: '28px 24px', textAlign: 'center' }}>
      <Etiquette as="p" style={{ margin: 0 }}>Outil non activé</Etiquette>
      <Titre style={{ ...styleTitreEcran(colors), margin: '8px 0 10px' }}>{outil.nom}</Titre>
      {detail && <p style={{ margin: '0 0 10px', fontFamily: police.texte, fontSize: 15, lineHeight: 1.5, fontWeight: 600, color: colors.text.primary }}>{detail}</p>}
      <p style={{ margin: '0 0 14px', fontFamily: police.texte, fontSize: 15, lineHeight: 1.5, color: colors.text.secondary }}>{outil.promesse}</p>
      <p style={{ margin: '0 0 22px', fontFamily: police.texte, fontSize: 14, lineHeight: 1.5, color: colors.text.secondary }}>
        {outil.achetable
          ? (viaClub ? 'Cet outil n\'est pas actif sur ton compte. Il est aussi fourni par ton club quand il l\'a souscrit.' : role === 'educateur' ? 'Cet outil n\'est pas actif sur ton compte. Ton club peut aussi te le fournir.' : 'Cet outil n\'est pas actif sur ton compte.')
          : 'Cet outil est fourni par ton club quand il l\'a souscrit.'}
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        {onMesOutils && (
          <button type="button" onClick={onMesOutils} className={CLASSE_BOUTON} style={styleBoutonPrincipal(colors)}>
            {role === 'club' ? 'Ajouter dans Mes outils' : 'Voir dans Mes outils'}
          </button>
        )}
        <button type="button" onClick={onRetour} className={onMesOutils ? CLASSE_BOUTON_SECONDAIRE : CLASSE_BOUTON} style={onMesOutils ? styleBoutonSecondaire(colors) : styleBoutonPrincipal(colors)}>{libelleBouton}</button>
      </div>
    </div>
  )
}

import { useColors } from '../../lib/theme'
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
  return (
    <div style={{
      maxWidth: 560, margin: enModale ? 0 : '48px auto', padding: '28px 24px', textAlign: 'center',
      background: colors.background.surface, border: `1px solid ${colors.border.subtle}`,
      borderRadius: 16, fontFamily: 'Inter, sans-serif',
    }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.text.faint }}>
        Outil non activé
      </p>
      <h1 style={{ margin: '8px 0 10px', fontSize: 22, fontWeight: 800, color: colors.text.primary }}>{outil.nom}</h1>
      {detail && <p style={{ margin: '0 0 10px', fontSize: 14, lineHeight: 1.5, fontWeight: 600, color: colors.text.primary }}>{detail}</p>}
      <p style={{ margin: '0 0 14px', fontSize: 14, lineHeight: 1.5, color: colors.text.secondary }}>{outil.promesse}</p>
      <p style={{ margin: '0 0 22px', fontSize: 13, lineHeight: 1.5, color: colors.text.faint }}>
        {outil.achetable
          ? (viaClub ? 'Cet outil n\'est pas actif sur ton compte. Il est aussi fourni par ton club quand il l\'a souscrit.' : 'Cet outil n\'est pas actif sur ton compte.')
          : 'Cet outil est fourni par ton club quand il l\'a souscrit.'}
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        {onMesOutils && (
          <button onClick={onMesOutils} style={{
            background: colors.accent.brand, color: colors.accent.onBrand, border: 'none', borderRadius: 10,
            padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}>{role === 'club' ? 'Ajouter dans Mes outils' : 'Voir dans Mes outils'}</button>
        )}
        <button onClick={onRetour} style={onMesOutils ? {
          background: 'transparent', color: colors.text.primary, border: `1px solid ${colors.border.default}`, borderRadius: 10,
          padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
        } : {
          background: colors.accent.brand, color: colors.accent.onBrand, border: 'none', borderRadius: 10,
          padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
        }}>{libelleBouton}</button>
      </div>
    </div>
  )
}

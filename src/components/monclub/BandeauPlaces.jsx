import { useColors } from '../../lib/theme'
import { etatPlacesClub } from '../../lib/catalogueOutils'
import { CONTACT_EMAIL } from '../../lib/stripeLinks'
import { styleBoutonPrincipal, styleBoutonSecondaire, CLASSE_BOUTON, CLASSE_BOUTON_SECONDAIRE } from '../../lib/identite'
import { forme } from '../../tokens'

// Bandeau du club du nouveau modèle dont les éducateurs affiliés dépassent les
// places de son forfait : certains n'ont que le socle gratuit (le club choisit
// lesquels dans « Dashboard de mes éducateurs », sinon les plus récents). Ne s'affiche
// que dans ce cas. Seul le président gère le forfait (écran Mon forfait).
// `onForfait` ouvre Mon forfait, `onEducateurs` ouvre « Outils des éducateurs ».
export default function BandeauPlaces({ nbEducateurs, places, forfaitActif, club, peutGererForfait, onForfait, onEducateurs, isMobile }) {
  const colors = useColors()
  const etat = etatPlacesClub({ nbEducateurs, places, forfaitActif })
  if (!etat) return null
  const { sansPlace, forfaitSuggere } = etat
  const pluriel = sansPlace > 1
  const bouton = (principal) => ({ ...(principal ? styleBoutonPrincipal(colors) : styleBoutonSecondaire(colors)), minHeight: 44, textDecoration: 'none' })
  const classe = (principal) => (principal ? CLASSE_BOUTON : CLASSE_BOUTON_SECONDAIRE)
  return (
    <div role="status" style={{ marginBottom: 20, padding: isMobile ? '14px 14px 14px 17px' : '16px 20px 16px 23px', borderRadius: forme.rayonCarte, background: colors.accent.red + '14', border: `1px solid ${colors.accent.red}40`, boxShadow: `inset ${forme.lisere} 0 0 ${colors.accent.red}` }}>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: colors.text.primary }}>
        {sansPlace} éducateur{pluriel ? 's' : ''} sans place
      </p>
      <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.55, color: colors.text.secondary }}>
        Votre forfait permet {etat.places} éducateur{etat.places > 1 ? 's' : ''} : {pluriel ? 'les éducateurs sans place n\'ont' : 'l\'éducateur sans place n\'a'} que le socle gratuit, sans les outils que vous fournissez. Vous choisissez qui a une place.
        {forfaitSuggere
          ? ` Avec le forfait ${forfaitSuggere.equipes} équipes, tous vos éducateurs ont leurs outils.`
          : ' Vos éducateurs dépassent le plus grand forfait : contactez le support.'}
        {' '}Aucune affiliation n'est supprimée.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        {forfaitSuggere && peutGererForfait && onForfait && (
          <button type="button" onClick={onForfait} className={classe(true)} style={bouton(true)}>Voir mon forfait</button>
        )}
        {!forfaitSuggere && (
          <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Plus de places éducateurs : ' + (club || ''))}`} className={classe(true)} style={bouton(true)}>Contacter le support</a>
        )}
        {onEducateurs && <button type="button" onClick={onEducateurs} className={classe(false)} style={bouton(false)}>Choisir qui a une place</button>}
      </div>
      {forfaitSuggere && !peutGererForfait && (
        <p style={{ margin: '10px 0 0', fontSize: 12, color: colors.text.secondary }}>Seul le président du club peut changer le forfait.</p>
      )}
    </div>
  )
}

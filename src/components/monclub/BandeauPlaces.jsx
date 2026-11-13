import { useColors } from '../../lib/theme'
import { etatPlacesClub } from '../../lib/catalogueOutils'
import { CONTACT_EMAIL } from '../../lib/stripeLinks'

// Bandeau du club du nouveau modèle dont les éducateurs affiliés dépassent les
// places de son forfait : ceux au-delà n'ont que le socle gratuit. Ne s'affiche
// que dans ce cas. Seul le président gère le forfait (écran Mon forfait).
// `onForfait` ouvre Mon forfait, `onEducateurs` ouvre « Outils des éducateurs ».
export default function BandeauPlaces({ nbEducateurs, places, forfaitActif, club, peutGererForfait, onForfait, onEducateurs, isMobile }) {
  const colors = useColors()
  const etat = etatPlacesClub({ nbEducateurs, places, forfaitActif })
  if (!etat) return null
  const { sansPlace, forfaitSuggere } = etat
  const pluriel = sansPlace > 1
  const bouton = (principal) => ({
    border: principal ? 'none' : `1px solid ${colors.border.default}`, borderRadius: 10, padding: '10px 16px', minHeight: 44, fontSize: 13, fontWeight: 700,
    fontFamily: 'Inter, sans-serif', cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: principal ? colors.accent.brand : colors.background.raised, color: principal ? colors.accent.onBrand : colors.text.primary,
  })
  return (
    <div role="status" style={{ marginBottom: 20, padding: isMobile ? '14px' : '16px 20px', borderRadius: 14, background: colors.accent.red + '14', border: `1px solid ${colors.accent.red}40` }}>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: colors.text.primary }}>
        {sansPlace} éducateur{pluriel ? 's' : ''} sans place
      </p>
      <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.55, color: colors.text.secondary }}>
        Votre forfait permet {etat.places} éducateur{etat.places > 1 ? 's' : ''} : {pluriel ? 'les derniers affiliés n\'ont' : 'le dernier affilié n\'a'} que le socle gratuit, sans les outils que vous fournissez.
        {forfaitSuggere
          ? ` Avec le forfait ${forfaitSuggere.equipes} équipes, tous vos éducateurs ont leurs outils.`
          : ' Vos éducateurs dépassent le plus grand forfait : contactez le support.'}
        {' '}Aucune affiliation n'est supprimée.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        {forfaitSuggere && peutGererForfait && onForfait && (
          <button type="button" onClick={onForfait} style={bouton(true)}>Voir mon forfait</button>
        )}
        {!forfaitSuggere && (
          <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Plus de places éducateurs : ' + (club || ''))}`} style={bouton(true)}>Contacter le support</a>
        )}
        {onEducateurs && <button type="button" onClick={onEducateurs} style={bouton(false)}>Voir qui est sans place</button>}
      </div>
      {forfaitSuggere && !peutGererForfait && (
        <p style={{ margin: '10px 0 0', fontSize: 12, color: colors.text.faint }}>Seul le président du club peut changer le forfait.</p>
      )}
    </div>
  )
}

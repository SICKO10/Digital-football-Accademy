import { useColors } from '../../lib/theme'

// Encart « Garder cet outil ? » affiché à l'accueil de l'éducateur quand un
// essai gratuit est terminé et que l'outil n'est plus actif. Disparaît seul
// dès que l'outil redevient actif. Le bouton mène à « Mes outils », où l'outil
// est déjà coché dans le paiement.
export default function EncartFinEssai({ outils, onVoirMesOutils }) {
  const colors = useColors()
  if (!outils?.actif || !outils.pret) return null
  const termines = outils.etats.filter(e => e.etat === 'essai_termine')
  if (termines.length === 0) return null
  return (
    <div style={{
      background: colors.background.surface, border: `1px solid ${colors.accent.amber}`, borderRadius: 14,
      padding: '14px 16px', marginBottom: 14, fontFamily: 'Inter, sans-serif',
    }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '1px' }}>
        Garder cet outil ?
      </p>
      {termines.map(({ outil }) => (
        <p key={outil.id} style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.5, color: colors.text.primary }}>
          <strong>{outil.nom}</strong> : ton essai gratuit est terminé. Pour le garder, c'est {outil.prixMensuel} € par mois ou {outil.prixAnnuel} € par an.
        </p>
      ))}
      <button onClick={onVoirMesOutils} style={{
        marginTop: 12, background: 'transparent', color: colors.text.primary, border: `1px solid ${colors.border.default}`,
        borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
      }}>{termines.length > 1 ? 'Garder ces outils' : 'Garder cet outil'}</button>
    </div>
  )
}

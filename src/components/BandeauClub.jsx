import { useColors } from '../lib/theme'
import { useClubPalette } from '../lib/clubTheme'

// Bandeau d'identité du club, en haut de l'accueil de ses éducateurs et joueurs
// affiliés : photo de fond, logo grand format et slogan réglés par le club dans
// « Personnaliser ». Rien ne s'affiche tant que le club n'a rien choisi.
export default function BandeauClub({ club, couleur, isMobile }) {
  const colors = useColors()
  const palette = useClubPalette()
  const fond = club?.image_fond_url || null
  const logo = club?.image_hero_url || null
  const slogan = club?.slogan || ''
  if (!fond && !logo && !slogan) return null

  const taille = isMobile ? 56 : 80
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16, boxSizing: 'border-box', marginBottom: 20, fontFamily: 'Inter, sans-serif',
      borderRadius: 16, padding: isMobile ? '18px 16px' : '24px 26px', minHeight: fond ? (isMobile ? 110 : 140) : undefined,
      ...(fond
        ? { backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.75), rgba(0,0,0,0.25)), url("${fond}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderLeft: `4px solid ${couleur || colors.accent.brand}` }),
    }}>
      {logo && <img src={logo} alt="" style={{ width: taille, height: taille, objectFit: 'cover', borderRadius: 14, flexShrink: 0 }} />}
      <div style={{ minWidth: 0 }}>
        {club?.club && <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: fond ? 'rgba(255,255,255,0.8)' : colors.text.faint }}>{club.club}</p>}
        {slogan && <p style={{ margin: club?.club ? '4px 0 0' : 0, fontSize: isMobile ? 16 : 20, fontWeight: 800, lineHeight: 1.3, color: fond ? '#fff' : (palette.secondaryChoisie ? palette.secondaryText : (couleur || colors.text.primary)) }}>{slogan}</p>}
      </div>
    </div>
  )
}

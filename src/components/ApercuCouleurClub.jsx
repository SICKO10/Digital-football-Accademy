import { useMemo } from 'react'
import { calculerPalette } from '../lib/paletteClub'

const MESSAGES = {
  'trop-pale': 'Cette couleur est trop pâle : vos joueurs et éducateurs verront le vert Digital Football.',
  invalide: 'Cette couleur n\'est pas reconnue : vos joueurs et éducateurs verront le vert Digital Football.',
  illisible: 'Cette couleur ne permet pas un texte lisible : vos joueurs et éducateurs verront le vert Digital Football.',
}

function Miniature({ palette, titre }) {
  return (
    <div style={{ flex: '1 1 150px', minWidth: 0 }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: '#9A9AA5', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{titre}</div>
      <div style={{ display: 'flex', height: '110px', borderRadius: '10px', overflow: 'hidden', border: `1px solid ${palette.cardBorder}`, background: palette.screenBg }}>
        <div style={{ width: '34%', background: palette.menuBg, padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{ background: palette.menuActiveBg, color: palette.menuActiveText, borderRadius: '5px', fontSize: '9px', fontWeight: 700, padding: '4px 5px' }}>Accueil</div>
          <div style={{ color: palette.menuTextMuted, fontSize: '9px', padding: '2px 5px' }}>Joueurs</div>
          <div style={{ color: palette.menuTextMuted, fontSize: '9px', padding: '2px 5px' }}>Matchs</div>
        </div>
        <div style={{ flex: 1, padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ background: palette.cardBg, border: `1px solid ${palette.cardBorder}`, borderRadius: '6px', padding: '6px' }}>
            <div style={{ color: palette.text, fontSize: '10px', fontWeight: 700 }}>Prochain match</div>
            <div style={{ color: palette.primaryText, fontSize: '9px', marginTop: '2px' }}>Samedi 15h</div>
          </div>
          <div style={{ color: palette.secondaryText, fontSize: '9px', fontWeight: 800 }}>Ensemble, on va plus loin</div>
          <div style={{ background: palette.primary, color: palette.onPrimary, borderRadius: '5px', fontSize: '9px', fontWeight: 700, padding: '5px 8px', alignSelf: 'flex-start' }}>Voir la convocation</div>
        </div>
      </div>
    </div>
  )
}

// Aperçu « comme vos joueurs et éducateurs la verront », mis à jour avant tout enregistrement.
export default function ApercuCouleurClub({ couleur, couleur2, sansTitre = false }) {
  const claire = useMemo(() => calculerPalette(couleur, 'claire', couleur2), [couleur, couleur2])
  const sombre = useMemo(() => calculerPalette(couleur, 'sombre', couleur2), [couleur, couleur2])

  const message = MESSAGES[claire.raison]
    || (claire.ajustee || sombre.ajustee ? 'Couleur ajustée pour rester lisible : elle est légèrement éclaircie ou assombrie selon le thème.' : null)

  return (
    <div style={{ gridColumn: '1 / -1' }}>
      {!sansTitre && (
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#9A9AA5', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Aperçu : comme vos joueurs et éducateurs la verront
        </div>
      )}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <Miniature palette={claire} titre="Thème clair" />
        <Miniature palette={sombre} titre="Thème sombre" />
      </div>
      {message && (
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#F97316', lineHeight: 1.4 }}>{message}</div>
      )}
    </div>
  )
}

// En-tête du menu de gauche des dashboards : logo du club dans un rond blanc, à
// gauche de « Digital Football ». Sans logo de club, le rond affiche « DF ».
// `compact` : rond seul (menu à icônes).
export default function EnTeteMenu({ logoUrl, compact = false }) {
  return (
    <div className="df-menu-entete" style={compact ? { justifyContent: 'center' } : undefined}>
      <span className="df-menu-logo">
        {logoUrl ? <img src={logoUrl} alt="" /> : 'DF'}
      </span>
      {!compact && <span className="df-menu-titre">Digital Football</span>}
    </div>
  )
}

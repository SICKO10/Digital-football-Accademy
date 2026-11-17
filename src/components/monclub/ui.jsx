import { useColors } from '../../lib/theme'
import { ICONES, stylesMonClub } from './uiMonClub'
import { TitreEcran } from '../identite'
import { styleLigneCraie } from '../../lib/identite'
import { forme, police } from '../../tokens'

// Pièces visuelles partagées par les étapes de « Mon club ».

export function Icone({ d, size = 16, trait = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={trait} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
  )
}

// En-tête d'une étape : titre condensé en capitales, explication, actions à droite,
// puis la ligne de craie du kit. (`icone` n'est plus affichée : décoration retirée.)
// eslint-disable-next-line no-unused-vars
export function EnteteEtape({ icone, titre, texte, children }) {
  return <TitreEcran as="h2" titre={titre} sousTitre={texte} actions={children} />
}

// Carte d'un outil avec son interrupteur (étapes Outils et Dashboard des éducateurs).
// Éteinte, elle s'estompe et porte une pastille : l'état se lit sans la couleur seule.
export function CarteReglage({ nom, description, pied, actif, badge, action, extra = null }) {
  const colors = useColors()
  const s = stylesMonClub(colors)
  return (
    <div className="mc-carte" style={{
      ...s.carte, position: 'relative', display: 'flex', flexDirection: 'column', gap: 10, padding: '18px 18px 16px 21px',
      borderColor: actif ? s.marque : s.carte.borderColor,
      boxShadow: actif ? `inset ${forme.lisere} 0 0 ${s.marque}` : 'none', opacity: actif ? 1 : 0.74,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <h3 style={{ ...s.titreCarte, fontSize: 18, lineHeight: 1.2 }}>{nom}</h3>
        {action}
      </div>
      {badge && (
        <span style={{ alignSelf: 'flex-start', fontFamily: police.texte, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', padding: '3px 8px', borderRadius: forme.rayonPastille, color: colors.text.primary, background: badge.couleur + '2a', border: `1px solid ${badge.couleur}66` }}>{badge.texte}</span>
      )}
      <p style={{ margin: 0, flex: 1, fontSize: 13, lineHeight: 1.55, color: colors.text.secondary }}>{description}</p>
      {extra}
      {pied && (
        <>
          <div aria-hidden="true" style={styleLigneCraie(colors)} />
          <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, color: colors.text.secondary }}>
            <Icone d={ICONES.menu} size={13} />{pied}
          </p>
        </>
      )}
    </div>
  )
}

// Petit encadré d'information (icône + texte).
export function Encart({ children }) {
  const colors = useColors()
  return (
    <div role="note" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 16px', borderRadius: forme.rayonCarte, background: colors.accent.blue + '14', border: `1px solid ${colors.accent.blue}33`, marginBottom: 18 }}>
      <span style={{ color: colors.accent.blue, display: 'inline-flex', marginTop: 1 }}><Icone d={ICONES.info} size={18} /></span>
      <div style={{ fontSize: 13, lineHeight: 1.6, color: colors.text.secondary }}>{children}</div>
    </div>
  )
}

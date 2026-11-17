import { useColors } from '../../lib/theme'
import EtapeIdentite from './EtapeIdentite'
import EtapeAccesBureau from './EtapeAccesBureau'
import { stylesMonClub, CSS_MON_CLUB } from './uiMonClub'
import { etapesMonClubVisibles } from '../../lib/menuClubGroupes'
import { coqueVars } from '../../lib/menuLateral'
import { forme } from '../../tokens'

// Une étape pas encore faite reste masquée en production ; en local on voit sa place.
// Staff et Organigramme sont des écrans du dashboard : il les passe dans `ecrans`.
const ETAPES = [
  { id: 'identite', titre: 'Identité', fait: true },
  { id: 'staff', titre: 'Staff', fait: true },
  { id: 'organigramme', titre: 'Organigramme', fait: true },
  { id: 'bureau', titre: 'Accès du bureau', fait: true },
]

// etape / setEtape viennent du dashboard : le lien « Permissions par rôle » du Staff
// ouvre directement l'étape Accès du bureau. Quelles étapes s'affichent se décide dans
// menuClubGroupes.js : l'Accès du bureau reste au président, Staff et Organigramme
// gardent leur propre permission.
export default function MonClub({
  club, themeEdit, setThemeEdit, sauvegarderTheme, uploaderImageTheme, savingTheme, themeUploading, isMobile, couleurPrincipale,
  etape, setEtape, droits, ecrans, rolePermissions, roleCategoriesAccess, savingPermissions, sauvegarderPermissions,
}) {
  const colors = useColors()
  const s = stylesMonClub(colors)
  const idsVisibles = etapesMonClubVisibles(droits)
  const visibles = ETAPES.filter(e => (e.fait || import.meta.env.DEV) && idsVisibles.includes(e.id))
  const courante = visibles.find(e => e.id === etape) || visibles[0]

  return (
    <div style={{ '--mc-marque': s.marque, '--mc-survol': colors.background.raised }}>
      <style>{CSS_MON_CLUB}</style>
      <p style={{ margin: '0 0 16px', color: colors.text.secondary, fontSize: 14, lineHeight: 1.5 }}>
        Un seul endroit pour personnaliser votre club. Chaque réglage s'applique tout de suite.
      </p>

      {visibles.length > 1 && (
        <div role="tablist" aria-label="Étapes de Mon club" className="df-onglets" style={coqueVars(colors, colors.accent.green)}>
          {visibles.map(e => (
            <button key={e.id} role="tab" aria-selected={e.id === courante.id} className="df-onglet" onClick={() => setEtape(e.id)}>
              {e.titre}
            </button>
          ))}
        </div>
      )}

      {courante.id === 'identite' && (
        <EtapeIdentite club={club} themeEdit={themeEdit} setThemeEdit={setThemeEdit} sauvegarderTheme={sauvegarderTheme}
          uploaderImageTheme={uploaderImageTheme} savingTheme={savingTheme} themeUploading={themeUploading} isMobile={isMobile} />
      )}
      {courante.id === 'staff' && ecrans.staff()}
      {courante.id === 'organigramme' && ecrans.organigramme()}
      {courante.id === 'bureau' && (
        <EtapeAccesBureau rolePermissions={rolePermissions} roleCategoriesAccess={roleCategoriesAccess}
          saving={savingPermissions} onSave={sauvegarderPermissions} couleurPrincipale={couleurPrincipale} isMobile={isMobile} />
      )}
      {!courante.fait && (
        <div style={{ background: colors.background.sunken, border: `1px dashed ${colors.border.strong}`, borderRadius: forme.rayonCarte, padding: 20 }}>
          <h3 style={{ ...s.titreCarte, margin: '0 0 6px' }}>{courante.titre}</h3>
          <p style={{ margin: 0, color: colors.text.secondary, fontSize: 13 }}>Bientôt ici : {courante.bientot}</p>
        </div>
      )}
    </div>
  )
}

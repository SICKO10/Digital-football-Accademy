import { useColors } from '../../lib/theme'
import EtapeIdentite from './EtapeIdentite'
import EtapeAccesBureau from './EtapeAccesBureau'
import EtapeOutils from './EtapeOutils'

// Les étapes 2 à 4 arrivent dans les blocs suivants : en production elles restent
// masquées tant qu'elles ne sont pas faites, en local on voit leur place.
const ETAPES = [
  { id: 'identite', titre: 'Identité', fait: true },
  { id: 'outils', titre: 'Outils du club', fait: true },
  { id: 'educateurs', titre: 'Dashboard de mes éducateurs', fait: false, bientot: 'Régler le menu de vos éducateurs, pour tous ou un par un.' },
  { id: 'bureau', titre: 'Accès du bureau', fait: true, presidentSeul: true },
]

// etape / setEtape viennent du dashboard : le lien « Permissions par rôle » du Staff
// ouvre directement l'étape Accès du bureau. Les étapes marquées presidentSeul ne
// s'affichent qu'au président : un rôle à qui il a donné « Mon club » ne les voit pas.
export default function MonClub({
  club, themeEdit, setThemeEdit, sauvegarderTheme, uploaderImageTheme, savingTheme, themeUploading, isMobile, couleurPrincipale,
  outils, clubId, estCompteClub, etape, setEtape, estPresident, rolePermissions, roleCategoriesAccess, savingPermissions, sauvegarderPermissions,
}) {
  const colors = useColors()
  const visibles = ETAPES.filter(e => (e.fait || import.meta.env.DEV) && (!e.presidentSeul || estPresident))
  const courante = visibles.find(e => e.id === etape) || visibles[0]

  return (
    <div>
      <p style={{ margin: '0 0 16px', color: colors.text.muted, fontSize: '14px', lineHeight: 1.5 }}>
        Un seul endroit pour personnaliser votre club. Chaque réglage s'applique tout de suite.
      </p>

      {visibles.length > 1 && (
        <div role="tablist" aria-label="Étapes de Mon club" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px' }}>
          {visibles.map((e, i) => {
            const actif = e.id === courante.id
            return (
              <button key={e.id} role="tab" aria-selected={actif} onClick={() => setEtape(e.id)}
                style={{
                  flexShrink: 0, whiteSpace: 'nowrap', cursor: 'pointer', fontSize: '13px', fontFamily: 'Inter, sans-serif',
                  padding: isMobile ? '8px 14px' : '10px 18px', borderRadius: '8px', fontWeight: actif ? 700 : 400,
                  ...(actif
                    ? { background: couleurPrincipale, color: colors.accent.onBrand, border: 'none' }
                    : { background: 'transparent', color: colors.text.muted, border: `1px solid ${colors.border.default}` }),
                }}>
                {i + 1}. {e.titre}
              </button>
            )
          })}
        </div>
      )}

      {courante.id === 'identite' && (
        <EtapeIdentite club={club} themeEdit={themeEdit} setThemeEdit={setThemeEdit} sauvegarderTheme={sauvegarderTheme}
          uploaderImageTheme={uploaderImageTheme} savingTheme={savingTheme} themeUploading={themeUploading} isMobile={isMobile} />
      )}
      {courante.id === 'outils' && <EtapeOutils outils={outils} clubId={clubId} estCompteClub={estCompteClub} />}
      {courante.id === 'bureau' && estPresident && (
        <EtapeAccesBureau rolePermissions={rolePermissions} roleCategoriesAccess={roleCategoriesAccess}
          saving={savingPermissions} onSave={sauvegarderPermissions} couleurPrincipale={couleurPrincipale} isMobile={isMobile} />
      )}
      {!courante.fait && (
        <div style={{ background: colors.background.sunken, border: `1px dashed ${colors.border.strong}`, borderRadius: '16px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 6px', color: colors.text.primary, fontSize: '15px', fontWeight: 700 }}>{courante.titre}</h3>
          <p style={{ margin: 0, color: colors.text.faint, fontSize: '13px' }}>Bientôt ici : {courante.bientot}</p>
        </div>
      )}
    </div>
  )
}

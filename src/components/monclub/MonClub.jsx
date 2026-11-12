import { useColors } from '../../lib/theme'
import EtapeIdentite from './EtapeIdentite'
import EtapeAccesBureau from './EtapeAccesBureau'
import EtapeOutils from './EtapeOutils'
import EtapeEducateurs from './EtapeEducateurs'
import EtapeJournal from './EtapeJournal'
import { stylesMonClub, CSS_MON_CLUB } from './uiMonClub'

// Une étape pas encore faite reste masquée en production ; en local on voit sa place.
const ETAPES = [
  { id: 'identite', titre: 'Identité', fait: true },
  { id: 'outils', titre: 'Outils du club', fait: true },
  { id: 'educateurs', titre: 'Dashboard de mes éducateurs', fait: true },
  { id: 'bureau', titre: 'Accès du bureau', fait: true, presidentSeul: true },
  { id: 'journal', titre: 'Journal des changements', fait: true },
]

// etape / setEtape viennent du dashboard : le lien « Permissions par rôle » du Staff
// ouvre directement l'étape Accès du bureau. Les étapes marquées presidentSeul ne
// s'affichent qu'au président : un rôle à qui il a donné « Mon club » ne les voit pas.
export default function MonClub({
  club, themeEdit, setThemeEdit, sauvegarderTheme, uploaderImageTheme, savingTheme, themeUploading, isMobile, couleurPrincipale,
  outils, clubId, estCompteClub, educateurs, etape, setEtape, estPresident, rolePermissions, roleCategoriesAccess, savingPermissions, sauvegarderPermissions,
}) {
  const colors = useColors()
  const s = stylesMonClub(colors)
  const visibles = ETAPES.filter(e => (e.fait || import.meta.env.DEV) && (!e.presidentSeul || estPresident))
  const courante = visibles.find(e => e.id === etape) || visibles[0]

  return (
    <div style={{ '--mc-marque': s.marque, '--mc-survol': colors.background.raised }}>
      <style>{CSS_MON_CLUB}</style>
      <p style={{ margin: '0 0 16px', color: colors.text.faint, fontSize: 14, lineHeight: 1.5 }}>
        Un seul endroit pour personnaliser votre club. Chaque réglage s'applique tout de suite.
      </p>

      {visibles.length > 1 && (
        <div role="tablist" aria-label="Étapes de Mon club" style={{ display: 'flex', gap: 6, padding: 5, marginBottom: 26, borderRadius: 18, overflowX: 'auto', background: colors.background.sunken, border: `1px solid ${colors.border.subtle}` }}>
          {visibles.map((e, i) => {
            const actif = e.id === courante.id
            return (
              <button key={e.id} role="tab" aria-selected={actif} onClick={() => setEtape(e.id)} className="mc-btn"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10, flexShrink: 0, whiteSpace: 'nowrap', cursor: 'pointer', fontSize: 13, fontFamily: 'Inter, sans-serif',
                  padding: isMobile ? '9px 14px' : '10px 18px', minHeight: 44, borderRadius: 14, fontWeight: 700, border: 'none',
                  background: actif ? s.marque : 'transparent', color: actif ? s.surMarque : colors.text.secondary, transition: 'background .12s',
                }}>
                <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, background: actif ? 'rgba(0,0,0,0.16)' : colors.background.raised, color: actif ? s.surMarque : colors.text.faint }}>{i + 1}</span>
                {e.titre}
              </button>
            )
          })}
        </div>
      )}

      {courante.id === 'identite' && (
        <EtapeIdentite club={club} themeEdit={themeEdit} setThemeEdit={setThemeEdit} sauvegarderTheme={sauvegarderTheme}
          uploaderImageTheme={uploaderImageTheme} savingTheme={savingTheme} themeUploading={themeUploading} isMobile={isMobile} />
      )}
      {courante.id === 'outils' && <EtapeOutils outils={outils} clubId={clubId} estCompteClub={estCompteClub} educateurs={educateurs} couleurPrincipale={couleurPrincipale} />}
      {courante.id === 'educateurs' && <EtapeEducateurs clubId={clubId} educateurs={educateurs} couleurPrincipale={couleurPrincipale} />}
      {courante.id === 'journal' && <EtapeJournal clubId={clubId} educateurs={educateurs} estCompteClub={estCompteClub} />}
      {courante.id === 'bureau' && estPresident && (
        <EtapeAccesBureau rolePermissions={rolePermissions} roleCategoriesAccess={roleCategoriesAccess}
          saving={savingPermissions} onSave={sauvegarderPermissions} couleurPrincipale={couleurPrincipale} isMobile={isMobile} />
      )}
      {!courante.fait && (
        <div style={{ background: colors.background.sunken, border: `1px dashed ${colors.border.strong}`, borderRadius: 16, padding: 20 }}>
          <h3 style={{ margin: '0 0 6px', color: colors.text.primary, fontSize: 15, fontWeight: 700 }}>{courante.titre}</h3>
          <p style={{ margin: 0, color: colors.text.faint, fontSize: 13 }}>Bientôt ici : {courante.bientot}</p>
        </div>
      )}
    </div>
  )
}

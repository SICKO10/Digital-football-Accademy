import { useColors } from '../../lib/theme'
import EtapeOutils from './EtapeOutils'
import EtapeEducateurs from './EtapeEducateurs'
import EtapeJournal from './EtapeJournal'
import { stylesMonClub, CSS_MON_CLUB } from './uiMonClub'
import { etapesConfigurationVisibles } from '../../lib/menuClubGroupes'

const SOUS_PAGES = [
  { id: 'forfait', titre: 'Mon forfait' },
  { id: 'outils', titre: 'Outils du club' },
  { id: 'educateurs', titre: 'Outils des éducateurs' },
  { id: 'journal', titre: 'Journal des changements' },
]

// Rubrique « Configuration » du menu du club : tout ce qui règle les outils.
// etape / setEtape viennent du dashboard (retour de paiement, anciens liens).
// L'écran Mon forfait (ancienne page Mes outils) est passé en `ecranForfait`.
export default function Configuration({
  etape, setEtape, droits, isMobile, outils, clubId, estCompteClub, educateurs, couleurPrincipale, ecranForfait, fourniture = null,
}) {
  const colors = useColors()
  const s = stylesMonClub(colors)
  const idsVisibles = etapesConfigurationVisibles(droits)
  const visibles = SOUS_PAGES.filter(e => idsVisibles.includes(e.id))
  const courante = visibles.find(e => e.id === etape) || visibles[0]

  return (
    <div style={{ '--mc-marque': s.marque, '--mc-survol': colors.background.raised }}>
      <style>{CSS_MON_CLUB}</style>

      {visibles.length > 1 && (
        <div role="tablist" aria-label="Pages de Configuration" style={{ display: 'flex', gap: 6, padding: 5, marginBottom: 26, borderRadius: 18, overflowX: 'auto', background: colors.background.sunken, border: `1px solid ${colors.border.subtle}` }}>
          {visibles.map(e => {
            const actif = e.id === courante.id
            return (
              <button key={e.id} role="tab" aria-selected={actif} onClick={() => setEtape(e.id)} className="mc-btn"
                style={{
                  display: 'inline-flex', alignItems: 'center', flexShrink: 0, whiteSpace: 'nowrap', cursor: 'pointer', fontSize: 13, fontFamily: 'Inter, sans-serif',
                  padding: isMobile ? '9px 14px' : '10px 18px', minHeight: 44, borderRadius: 14, fontWeight: 700, border: 'none',
                  background: actif ? s.marque : 'transparent', color: actif ? s.surMarque : colors.text.secondary, transition: 'background .12s',
                }}>
                {e.titre}
              </button>
            )
          })}
        </div>
      )}

      {courante.id === 'forfait' && ecranForfait()}
      {courante.id === 'outils' && <EtapeOutils outils={outils} clubId={clubId} estCompteClub={estCompteClub} educateurs={educateurs} couleurPrincipale={couleurPrincipale} />}
      {courante.id === 'educateurs' && <EtapeEducateurs clubId={clubId} educateurs={educateurs} couleurPrincipale={couleurPrincipale} fourniture={fourniture} outils={outils} />}
      {courante.id === 'journal' && <EtapeJournal clubId={clubId} educateurs={educateurs} estCompteClub={estCompteClub} />}
    </div>
  )
}

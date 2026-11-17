import { useColors } from '../../lib/theme'
import EtapeOutils from './EtapeOutils'
import EtapeEducateurs from './EtapeEducateurs'
import EtapeJournal from './EtapeJournal'
import { stylesMonClub, CSS_MON_CLUB } from './uiMonClub'
import { etapesConfigurationVisibles } from '../../lib/menuClubGroupes'
import { coqueVars } from '../../lib/menuLateral'

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
  etape, setEtape, droits, outils, clubId, estCompteClub, educateurs, couleurPrincipale, ecranForfait, fourniture = null,
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
        <div role="tablist" aria-label="Pages de Configuration" className="df-onglets" style={coqueVars(colors, colors.accent.green)}>
          {visibles.map(e => (
            <button key={e.id} role="tab" aria-selected={e.id === courante.id} className="df-onglet" onClick={() => setEtape(e.id)}>
              {e.titre}
            </button>
          ))}
        </div>
      )}

      {courante.id === 'forfait' && ecranForfait()}
      {courante.id === 'outils' && <EtapeOutils outils={outils} clubId={clubId} estCompteClub={estCompteClub} />}
      {courante.id === 'educateurs' && <EtapeEducateurs clubId={clubId} educateurs={educateurs} couleurPrincipale={couleurPrincipale} fourniture={fourniture} outils={outils} />}
      {courante.id === 'journal' && <EtapeJournal clubId={clubId} educateurs={educateurs} estCompteClub={estCompteClub} />}
    </div>
  )
}

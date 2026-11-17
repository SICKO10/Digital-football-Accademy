import { useContext, useMemo, useState } from 'react'
import { Plus, Pencil, Trophy, Users, CalendarDays, ClipboardList, Shield, Megaphone, MapPin, Bus, Shirt, Timer, Check, X } from 'lucide-react'
import { useTheme, useColors } from '../lib/theme'
import { ClubThemeContext } from '../lib/clubTheme'
import { ThemeToggleButton } from '../lib/ThemeProvider'
import { calculerPalette, variablesCss } from '../lib/paletteClub'
import {
  styleCarte, styleTableau, styleLigneCraie, styleChamp, styleBoutonPrincipal, styleBoutonSecondaire,
  verifierContrastes, CLASSE_BOUTON, CLASSE_BOUTON_SECONDAIRE, CLASSE_CHAMP,
} from '../lib/identite'
import { police } from '../tokens'
import { TitreEcran, Etiquette, CarteChiffre, PastilleResultat, Jauge, Icone } from '../components/identite'

// Vitrine du kit d'identité « Maison de club » (PLAN-design-identite.md, bloc 1).
// Route /dev/identite, déclarée seulement en développement. Toutes les valeurs
// affichées sont des exemples, pas des données de club.

const COULEURS = [
  { nom: 'Vert par défaut', hex: null },
  { nom: 'Rouge', hex: '#C8102E' },
  { nom: 'Jaune', hex: '#F2C200' },
]

const RESULTATS = [
  { date: '9 nov.', adversaire: 'Équipe A', score: '3-1', res: 'V' },
  { date: '2 nov.', adversaire: 'Équipe B', score: '1-1', res: 'N' },
  { date: '26 oct.', adversaire: 'Équipe C', score: '0-2', res: 'D' },
  { date: '19 oct.', adversaire: 'Équipe D', score: '2-0', res: 'V' },
]

const CLASSEMENT = [
  { pos: 1, equipe: 'Équipe A', j: 10, diff: '+14', pts: 25 },
  { pos: 2, equipe: 'Votre équipe', j: 10, diff: '+9', pts: 22, nous: true },
  { pos: 3, equipe: 'Équipe C', j: 10, diff: '+3', pts: 17 },
  { pos: 4, equipe: 'Équipe D', j: 10, diff: '-2', pts: 13 },
]

const ICONES = [
  ['Trophy', Trophy, 'Compétition'], ['Users', Users, 'Effectif'], ['CalendarDays', CalendarDays, 'Planning'],
  ['ClipboardList', ClipboardList, 'Séance'], ['Shield', Shield, 'Club'], ['Megaphone', Megaphone, 'Annonce'],
  ['MapPin', MapPin, 'Terrain'], ['Bus', Bus, 'Déplacement'], ['Shirt', Shirt, 'Équipement'], ['Timer', Timer, 'Chrono'],
]

const euros = v => `${v.toLocaleString('fr-FR')}\u00A0€`

function Section({ titre, children }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Etiquette as="h2">{titre}</Etiquette>
      {children}
    </section>
  )
}

// Toutes les briques, avec les couleurs de la colonne (palette du club fournie par ColonneClub).
function Vitrine({ nom, hex }) {
  const colors = useColors()
  const tab = styleTableau(colors)
  const contrastes = verifierContrastes(colors)
  const [texte, setTexte] = useState('')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', minWidth: 0 }}>
      <TitreEcran as="h2" surTitre={`${nom}${hex ? ` · ${hex}` : ''}`} titre="Accueil du club" sousTitre="En-tête d'écran : titre condensé et ligne de contexte."
        actions={<button type="button" className={CLASSE_BOUTON} style={styleBoutonPrincipal(colors)}><Icone icone={Plus} />Ajouter</button>} />

      <Section titre="Cartes chiffres">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
          <CarteChiffre etiquette="Effectif" valeur={23} liseree />
          <CarteChiffre etiquette="Bilan" valeur={68} unite="%" />
          <CarteChiffre etiquette="Matchs joués" valeur={19} />
          <CarteChiffre etiquette="Budget restant" valeur="3 800" unite="€" onClick={() => {}} />
        </div>
      </Section>

      <Section titre="Carte de contenu et pastilles">
        <div style={styleCarte(colors)}>
          <Etiquette as="h3" style={{ marginBottom: '10px' }}>Derniers résultats</Etiquette>
          {RESULTATS.map((r, i) => (
            <div key={r.date}>
              {i > 0 && <div aria-hidden="true" style={styleLigneCraie(colors)} />}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', fontFamily: police.texte, fontSize: '14px' }}>
                <PastilleResultat resultat={r.res} />
                <span style={{ flex: 1, minWidth: 0, color: colors.text.primary }}>{r.adversaire}</span>
                <span style={{ color: colors.text.dim, fontSize: '13px' }}>{r.date}</span>
                <span style={{ fontFamily: police.titre, fontWeight: 700, fontSize: '18px', fontVariantNumeric: 'tabular-nums', color: colors.text.primary, minWidth: '34px', textAlign: 'right' }}>{r.score}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section titre="Jauges">
        <div style={{ ...styleCarte(colors), display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Jauge libelle="Présence à l'entraînement" segments={[{ libelle: 'Présents', valeur: 21 }, { libelle: 'Absents', valeur: 3 }]} />
          <Jauge libelle="Bilan" segments={[{ libelle: 'Victoires', valeur: 12 }, { libelle: 'Nuls', valeur: 4 }, { libelle: 'Défaites', valeur: 3 }]} />
          <Jauge libelle="Budget" format={euros} segments={[{ libelle: 'Dépensé', valeur: 6200 }, { libelle: 'Restant', valeur: 3800 }]} />
        </div>
      </Section>

      <Section titre="Tableau type classement">
        <div style={{ ...styleCarte(colors), padding: '6px 6px 2px', overflowX: 'auto' }}>
          <table style={tab.tableau}>
            <thead>
              <tr>
                <th scope="col" style={tab.enteteChiffre}>#</th>
                <th scope="col" style={tab.entete}>Équipe</th>
                <th scope="col" style={tab.enteteChiffre}>J</th>
                <th scope="col" style={tab.enteteChiffre}>Diff</th>
                <th scope="col" style={tab.enteteChiffre}>Pts</th>
              </tr>
            </thead>
            <tbody>
              {CLASSEMENT.map((l, i) => {
                const fin = i === CLASSEMENT.length - 1 ? { borderBottom: 0 } : null
                return (
                  <tr key={l.pos}>
                    <td style={{ ...tab.celluleChiffre, ...fin }}>{l.pos}</td>
                    <td style={{ ...tab.cellule, ...fin, fontWeight: l.nous ? 700 : 400 }}>{l.equipe}</td>
                    <td style={{ ...tab.celluleChiffre, ...fin }}>{l.j}</td>
                    <td style={{ ...tab.celluleChiffre, ...fin }}>{l.diff}</td>
                    <td style={{ ...tab.celluleChiffre, ...fin, fontWeight: 700 }}>{l.pts}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section titre="Boutons et champ">
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" className={CLASSE_BOUTON} style={styleBoutonPrincipal(colors)}>Enregistrer</button>
          <button type="button" className={CLASSE_BOUTON_SECONDAIRE} style={styleBoutonSecondaire(colors)}>Annuler</button>
          <button type="button" className={CLASSE_BOUTON_SECONDAIRE} style={{ ...styleBoutonSecondaire(colors), padding: 0, width: '40px' }}>
            <Icone icone={Pencil} seule libelle="Modifier" />
          </button>
          <button type="button" disabled className={CLASSE_BOUTON} style={styleBoutonPrincipal(colors)}>Indisponible</button>
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <Etiquette>Nom de l'équipe</Etiquette>
          <input className={CLASSE_CHAMP} style={styleChamp(colors)} value={texte} onChange={e => setTexte(e.target.value)} placeholder="U13 A" />
        </label>
      </Section>

      <Section titre="Icônes (remplacent les emojis)">
        <div style={{ ...styleCarte(colors), display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))', gap: '14px 8px', color: colors.text.primary }}>
          {ICONES.map(([cle, comp, nomIcone]) => (
            <div key={cle} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: police.texte, fontSize: '13px', color: colors.text.secondary }}>
              <span style={{ color: colors.text.primary }}><Icone icone={comp} taille={20} /></span>{nomIcone}
            </div>
          ))}
        </div>
      </Section>

      <Section titre="Contrastes calculés">
        <div style={{ ...styleCarte(colors), padding: '6px 6px 2px' }}>
          <table style={tab.tableau}>
            <thead>
              <tr>
                <th scope="col" style={tab.entete}>Couple</th>
                <th scope="col" style={tab.enteteChiffre}>Ratio</th>
                <th scope="col" style={tab.enteteChiffre}>Seuil</th>
                <th scope="col" style={tab.enteteChiffre}><span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Résultat</span></th>
              </tr>
            </thead>
            <tbody>
              {contrastes.map(l => (
                <tr key={l.nom}>
                  <td style={{ ...tab.cellule, fontSize: '13px' }}>{l.nom}</td>
                  <td style={tab.celluleChiffre}>{l.ratio.toFixed(2)}</td>
                  <td style={{ ...tab.celluleChiffre, color: colors.text.dim }}>{l.seuil}</td>
                  <td style={{ ...tab.cellule, width: '28px', color: l.ok ? colors.accent.success : colors.accent.red }}>
                    <Icone icone={l.ok ? Check : X} libelle={l.ok ? 'Conforme' : 'Insuffisant'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}

// Une colonne = une couleur de club, calculée localement (comme PorteeThemeClub,
// mais sans toucher à la couleur globale de l'application).
function ColonneClub({ nom, hex }) {
  const { theme } = useTheme()
  const parent = useContext(ClubThemeContext)
  const palette = useMemo(() => calculerPalette(hex, theme), [hex, theme])
  const valeur = useMemo(() => ({ ...parent, palette, portee: { accentVert: 'statut' } }), [parent, palette])
  return (
    <ClubThemeContext.Provider value={valeur}>
      <div style={{ ...variablesCss(palette), minWidth: 0 }}>
        <Vitrine nom={nom} hex={hex} />
      </div>
    </ClubThemeContext.Provider>
  )
}

export default function DevIdentite() {
  const { theme } = useTheme()
  const colors = useColors()
  return (
    <div style={{ minHeight: '100vh', background: colors.background.base, color: colors.text.primary, fontFamily: police.texte, padding: '24px 16px 64px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontFamily: police.titre, fontWeight: 700, fontSize: '22px', textTransform: 'uppercase', letterSpacing: '0.01em', margin: 0 }}>Kit d'identité « Maison de club »</h1>
            <p style={{ fontSize: '14px', color: colors.text.secondary, margin: '4px 0 0' }}>
              Page de développement, absente du site en ligne. Chiffres et équipes d'exemple.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: colors.text.secondary }}>
            Thème {theme === 'claire' ? 'clair' : 'sombre'}
            <ThemeToggleButton />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '40px 28px', alignItems: 'start' }}>
          {COULEURS.map(c => <ColonneClub key={c.nom} nom={c.nom} hex={c.hex} />)}
        </div>
      </div>
    </div>
  )
}

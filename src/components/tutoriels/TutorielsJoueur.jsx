import { useColors } from '../../lib/theme'
import TutorielModal from './TutorielModal'
import { Carte, Onglets, Formulaire } from './Maquette'

// Tutoriels de l'espace joueur. Comme ceux de l'éducateur et du club : une
// maquette simplifiée de l'écran réel, avec les mêmes libellés que l'app.

const IcoPlan = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
const IcoJournal = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>
const IcoPoids = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>

function Jauge({ valeur, couleur, libelle }) {
  const colors = useColors()
  return (
    <div style={{ flex: 1, minWidth: 0, padding: '12px', borderRadius: '12px', background: couleur + '15', border: `1px solid ${couleur}33`, textAlign: 'center' }}>
      <p style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: couleur }}>{valeur}</p>
      <p style={{ margin: '3px 0 0', fontSize: '11px', fontWeight: 600, color: colors.text.faint }}>{libelle}</p>
    </div>
  )
}

export function TutorielNutrition({ onFermer }) {
  const colors = useColors()
  const etapes = [
    {
      titre: 'Ce que tu trouves ici',
      texte: 'Ta nutrition en trois gestes : un plan pour la journée, un journal pour noter ce que tu manges, un suivi pour voir ton évolution.',
      visuel: (
        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
          <Carte titre="Mon plan" texte="Ce qu'il te faut aujourd'hui" couleur={colors.accent.green} icone={<IcoPlan />} />
          <Carte titre="Journal" texte="Tes repas notés" couleur={colors.accent.blue} icone={<IcoJournal />} />
          <Carte titre="Poids" texte="Ton évolution" couleur={colors.accent.orange} icone={<IcoPoids />} />
        </div>
      ),
    },
    {
      titre: 'Un plan qui change avec ta journée',
      texte: 'Tu ne manges pas pareil un jour de match et un jour de repos. Choisis le type de journée, et tes calories et tes conseils s\'adaptent.',
      astuce: 'Si tu es dans une équipe, ton calendrier choisit le bon type de journée pour toi. Tu peux le changer à la main.',
      visuel: <Onglets items={['Jour de match', 'Veille de match', 'Lendemain de match', 'Entraînement', 'Repos']} actif="Entraînement" couleur={colors.accent.green} />,
    },
    {
      titre: 'Lire tes chiffres',
      texte: 'Le grand nombre est ton objectif de calories pour la journée. Dessous, trois repères :',
      points: [
        'Glucides : l\'énergie des courses et des efforts.',
        'Protéines : la réparation de tes muscles après l\'effort.',
        'Lipides : une énergie longue, à ne pas supprimer.',
      ],
      visuel: (
        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
          <Jauge valeur="310 g" libelle="Glucides" couleur={colors.accent.amber} />
          <Jauge valeur="155 g" libelle="Protéines" couleur={colors.accent.blue} />
          <Jauge valeur="70 g" libelle="Lipides" couleur={colors.accent.orange} />
        </div>
      ),
    },
    {
      titre: 'Noter ce que tu manges',
      texte: 'Dans Journal, choisis le repas, cherche un aliment et clique sur le résultat, puis indique la quantité en grammes. Tu peux aussi ajouter une recette de l\'onglet Recettes en un geste.',
      astuce: 'Pas besoin d\'être précis au gramme près : une note approximative vaut mieux qu\'aucune note.',
      visuel: (
        <Formulaire colonnes={1} champs={[['Ajouter à quel repas', 'Déjeuner'], ['Rechercher un aliment', 'poulet']]} />
      ),
    },
    {
      titre: 'Suivre ton évolution',
      texte: 'Pèse-toi une fois par semaine dans Poids, et regarde le Rapport pour comparer tes journées à ton objectif.',
      astuce: 'Ton poste et ton objectif se changent dans Profil. Les conseils et les calories se mettent à jour tout de suite.',
      visuel: <Onglets items={['Mon plan', 'Journal', 'Recettes', 'Éducation', 'Rapport', 'Poids', 'Profil']} actif="Poids" couleur={colors.accent.green} />,
    },
  ]
  return <TutorielModal titre="Nutrition" etapes={etapes} accent={colors.accent.green} onFermer={onFermer} />
}

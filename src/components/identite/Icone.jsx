// Icône au trait (lucide-react) : remplace les emojis d'interface.
// Taille 18 (texte courant, boutons) ou 20 (titres de carte), trait 2 comme les
// icônes du menu. Couleur héritée du parent (currentColor).
// Décorative par défaut (masquée aux lecteurs d'écran). `libelle` lui donne un nom ;
// il est obligatoire quand l'icône est `seule` (bouton sans texte).
export default function Icone({ icone: Composant, taille = 18, libelle, seule = false, style }) {
  if (import.meta.env.DEV && seule && !libelle) {
    console.warn('Icone : une icône seule doit avoir un `libelle` (nom lu par les lecteurs d\'écran).')
  }
  const accessibilite = libelle ? { role: 'img', 'aria-label': libelle } : { 'aria-hidden': true }
  return <Composant size={taille} strokeWidth={2} focusable="false" {...accessibilite} style={{ flexShrink: 0, display: 'block', ...style }} />
}

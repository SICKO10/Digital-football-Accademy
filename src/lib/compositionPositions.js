// Retire les positions placées à la main sur le terrain (champ `pos` de chaque titulaire).
// À appeler quand la formation change : sinon les anciennes positions, propres à l'ancien
// dispositif, restent collées aux joueurs et se chevauchent dans le nouveau.
export const sansPositions = (titulaires) =>
  (titulaires || []).map(j => (j ? (({ pos: _pos, ...reste }) => reste)(j) : j))

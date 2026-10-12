// PostgREST plafonne chaque réponse à 1000 lignes (max_rows) SANS erreur :
// au-delà, les lignes manquantes disparaissent en silence, et sans tri ce ne
// sont pas toujours les mêmes — c'est ce qui faisait perdre des mois entiers
// de présences au hasard selon les joueurs. Toute requête dont le résultat
// grandit avec le temps ou la taille du club/de la plateforme (présences,
// sondages, stats, effectifs, inventaire, destinataires d'emails…) passe par
// ces helpers.
//
// buildQuery doit renvoyer une requête NEUVE à chaque appel (un builder
// Supabase ne s'exécute qu'une fois) avec un tri stable (unique, ex. .order('id')),
// sinon des lignes peuvent être sautées ou dupliquées d'une page à l'autre.
const TAILLE_PAGE = 1000
export async function fetchToutesLignes(buildQuery) {
  const lignes = []
  for (let debut = 0; ; debut += TAILLE_PAGE) {
    const { data, error } = await buildQuery().range(debut, debut + TAILLE_PAGE - 1)
    if (error) return { data: lignes, error }
    lignes.push(...(data || []))
    if (!data || data.length < TAILLE_PAGE) return { data: lignes, error: null }
  }
}

// Même chose pour un filtre .in() sur une longue liste d'ids : découpée en
// paquets pour ne pas dépasser la longueur max d'URL (un uuid ≈ 37 caractères).
export async function fetchToutesLignesIn(ids, buildQuery, taillePaquet = 150) {
  const lignes = []
  for (let i = 0; i < ids.length; i += taillePaquet) {
    const paquet = ids.slice(i, i + taillePaquet)
    const { data, error } = await fetchToutesLignes(() => buildQuery(paquet))
    if (error) return { data: lignes, error }
    lignes.push(...data)
  }
  return { data: lignes, error: null }
}

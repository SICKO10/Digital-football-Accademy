// fetch personnalisé du client Supabase (cf. src/supabase.js) — complète
// automatiquement toute lecture tronquée par la limite de 1000 lignes de
// PostgREST (max_rows), pour TOUTE la plateforme, sans avoir à modifier
// chaque requête une par une (ni à y penser pour les futures).
//
// Problème corrigé : PostgREST ne renvoie jamais plus de 1000 lignes par
// réponse et ne signale pas qu'il en manque. Une requête "toutes les
// présences du club" qui en compte 3000 en recevait 1000, prises dans un
// ordre arbitraire, et les écrans calculaient leurs stats dessus comme si
// c'était tout (ex. des joueurs sans aucune donnée en août, d'autres en
// septembre). Rien n'était supprimé en base : seule la lecture était partielle.
//
// Fonctionnement : une lecture (GET sur /rest/v1/) qui n'a pas demandé
// elle-même une plage (.range/.limit) ni une ligne unique (.single/.maybeSingle)
// et qui revient avec exactement 1000 lignes est relancée par pages de 1000
// (offset/limit) jusqu'à la dernière, puis le tout est renvoyé comme une seule
// réponse — transparent pour le code appelant. Les lectures de moins de 1000
// lignes (l'immense majorité) ne coûtent aucune requête de plus.
//
// Tri stable : paginer par offset sans tri unique peut sauter ou doubler des
// lignes d'une page à l'autre. On ajoute donc `id` en dernier critère de tri ;
// si la table n'a pas de colonne id (la 1re page renvoie une erreur), on
// retombe sur le tri d'origine.

const TAILLE_PAGE = 1000 // = max_rows PostgREST (supabase/config.toml, défaut Supabase)
const PAGES_MAX = 500 // garde-fou : 500 000 lignes

const estLectureAPaginer = (url, init) => {
  const methode = (init?.method || 'GET').toUpperCase()
  if (methode !== 'GET') return false
  if (!url.pathname.includes('/rest/v1/')) return false
  // Plage déjà choisie par le code (.range / .limit) → on respecte.
  if (url.searchParams.has('limit') || url.searchParams.has('offset')) return false
  const headers = new Headers(init?.headers)
  if (headers.has('Range')) return false
  // .single() / .maybeSingle() / .csv() : pas un tableau JSON.
  const accept = headers.get('Accept') || ''
  if (accept.includes('vnd.pgrst.object') || accept.includes('text/csv')) return false
  return true
}

const avecTriStable = (url) => {
  const u = new URL(url)
  const ordre = u.searchParams.get('order')
  if (ordre && /(^|,)id\./.test(ordre)) return null // déjà trié sur id
  u.searchParams.set('order', ordre ? `${ordre},id.asc` : 'id.asc')
  return u
}

const lirePage = async (fetchNatif, url, init, debut) => {
  const u = new URL(url)
  u.searchParams.set('offset', String(debut))
  u.searchParams.set('limit', String(TAILLE_PAGE))
  const res = await fetchNatif(u.toString(), init)
  if (!res.ok) return { ok: false, res }
  return { ok: true, res, lignes: await res.json() }
}

const toutesLesPages = async (fetchNatif, url, init) => {
  const lignes = []
  let premiere = null
  for (let page = 0; page < PAGES_MAX; page++) {
    const r = await lirePage(fetchNatif, url, init, page * TAILLE_PAGE)
    if (!r.ok) return { ok: false, res: r.res, page }
    if (!premiere) premiere = r.res
    if (!Array.isArray(r.lignes)) return { ok: false, res: r.res, page }
    lignes.push(...r.lignes)
    if (r.lignes.length < TAILLE_PAGE) break
  }
  return { ok: true, lignes, premiere }
}

export function creerFetchPagine(fetchNatif = (...args) => fetch(...args)) {
  return async (input, init) => {
    const urlBrute = typeof input === 'string' ? input : input?.url
    let url
    try { url = new URL(urlBrute) } catch { return fetchNatif(input, init) }
    if (!estLectureAPaginer(url, init)) return fetchNatif(input, init)

    const res = await fetchNatif(input, init)
    if (!res.ok) return res
    const type = res.headers.get('Content-Type') || ''
    if (!type.includes('json')) return res

    const premierePage = await res.clone().json().catch(() => null)
    if (!Array.isArray(premierePage) || premierePage.length < TAILLE_PAGE) return res

    // Tronquée : on relit tout, page par page, avec un tri stable si possible.
    const urlTriee = avecTriStable(url)
    let resultat = urlTriee ? await toutesLesPages(fetchNatif, urlTriee, init) : null
    if (!resultat || (!resultat.ok && resultat.page === 0)) resultat = await toutesLesPages(fetchNatif, url, init)
    if (!resultat.ok) return resultat.res // erreur réelle en cours de route → remontée telle quelle

    const headers = new Headers(resultat.premiere.headers)
    const total = (res.headers.get('Content-Range') || '').split('/')[1] || '*'
    headers.set('Content-Range', resultat.lignes.length ? `0-${resultat.lignes.length - 1}/${total}` : `*/${total}`)
    headers.delete('Content-Length')
    return new Response(JSON.stringify(resultat.lignes), { status: 200, statusText: 'OK', headers })
  }
}

// Aides communes à l'impression des fiches d'évaluation (bloc 13 de PLAN-fiches-evaluation.md).
import { supabase } from '../supabase'

export const ECHELLE = [
  { v: 1, label: 'Non acquis' },
  { v: 2, label: 'En cours' },
  { v: 3, label: 'Acquis' },
]
export const ORDRE_PILIERS = ['Tactique', 'Technique', 'Physique', 'Mental']
const PILIERS_FIN = ['Tests', 'Oui / non', 'Par poste']
export const COULEUR_PILIER = { Tactique: '#d97706', Technique: '#2563eb', Physique: '#16a34a', Mental: '#7c3aed' }
export const LIBELLE_POSTE = { gardien: 'Gardien', defenseur: 'Défenseur', milieu: 'Milieu', attaquant: 'Attaquant' }

const POSTE_PAR_MOT = [
  [/gardien/i, 'gardien'],
  [/milieu/i, 'milieu'],
  [/(défenseur|defenseur|latéral|lateral|piston|arrière|arriere)/i, 'defenseur'],
  [/(attaquant|ailier|avant|buteur|pointe)/i, 'attaquant'],
]
// Famille de poste (gardien, defenseur, milieu, attaquant) à partir du texte libre du poste.
export const famillePoste = (txt) => {
  if (!txt) return null
  const t = POSTE_PAR_MOT.find(([re]) => re.test(txt))
  return t ? t[1] : null
}

export const fr1 = (x) => (x == null ? '' : (Math.round(x * 10) / 10).toString().replace('.', ','))

// Critères par pilier, dans le même ordre que l'écran. Les critères de poste ne restent que si
// le poste du joueur correspond (ou s'il est inconnu). `masques` : identifiants à ne pas imprimer.
export function grouperCriteres(criteres, poste = null, masques = null) {
  const m = new Map()
  criteres
    .filter(c => (!c.poste || !poste || c.poste === poste) && !(masques && masques.has(c.id)))
    .forEach(c => {
      const nom = c.pilier || 'Autre'
      if (!m.has(nom)) m.set(nom, [])
      m.get(nom).push(c)
    })
  const rang = (k) => { const i = ORDRE_PILIERS.indexOf(k); if (i >= 0) return i; const j = PILIERS_FIN.indexOf(k); return j >= 0 ? 100 + j : 50 }
  return [...m.keys()]
    .sort((a, b) => rang(a) - rang(b) || a.localeCompare(b))
    .map(k => ({ nom: k, criteres: m.get(k).slice().sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)) }))
}

// Modèle publié d'une catégorie : celui de l'éducateur d'abord, sinon celui du club.
// Même règle que FicheEvaluationRouteur, avec la dernière version publiée.
export async function chargerModelePublie(categorieCle, educateurId) {
  const { data: modeles, error } = await supabase.from('modeles_evaluation')
    .select('*, modeles_evaluation_versions(*, criteres_evaluation(*))').eq('categorie_cle', categorieCle).eq('archive', false)
  if (error) throw error
  const liste = (modeles || []).slice().sort((a, b) => (b.educateur_id === educateurId) - (a.educateur_id === educateurId))
  for (const { modeles_evaluation_versions: vs, ...modele } of liste) {
    const publiees = (vs || []).filter(v => v.publiee_le).sort((a, b) => b.numero - a.numero)
    const { criteres_evaluation: cr, ...version } = publiees[0] || {}
    if (!publiees[0] || !cr?.length) continue
    return { modele, version, criteres: cr.slice().sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)), categorieCle }
  }
  return null
}

// Valeur lue dans une ligne de résultat, selon le type du critère.
export function valeurResultat(c, r) {
  if (!r) return null
  if (c.type === 'note') return r.note
  if (c.type === 'test') return r.valeur
  if (c.type === 'oui_non') return r.oui_non
  return r.texte
}

export function libellePeriode(numero, nb) {
  if (!numero) return 'Évaluation à la demande'
  if (nb === 2) return numero === 1 ? 'Début de saison' : 'Fin de saison'
  if (nb === 3) return ['Début de saison', 'Mi-saison', 'Fin de saison'][numero - 1]
  return `Évaluation ${numero}`
}

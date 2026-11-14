import { supabase } from '../../supabase'

// Catégorie de l'équipe si elle est en effectif commun, sinon null (mode par
// équipe, équipe hors club, erreur de lecture : comportement habituel).
export async function chargerCategorieCommune(equipeId) {
  if (!equipeId) return null
  const { data, error } = await supabase
    .from('club_categories')
    .select('categorie_id, categories(id, nom, mode)')
    .eq('id', equipeId)
    .maybeSingle()
  if (error || data?.categories?.mode !== 'commun') return null
  return data.categories
}

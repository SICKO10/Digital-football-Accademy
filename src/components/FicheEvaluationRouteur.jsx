// Choisit la fiche à ouvrir pour un joueur : la nouvelle fiche (modèle publié pour sa catégorie,
// celui de l'éducateur d'abord, sinon celui du club) ou, à défaut, l'ancienne fiche en texte libre.
// Les anciennes fiches ne sont ni modifiées ni migrées (PLAN-fiches-evaluation.md).
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import FicheEvaluationJoueur from './FicheEvaluationJoueur'
import FicheJoueurOnglets from './FicheJoueurOnglets'

const POSTE_PAR_MOT = [
  [/gardien/i, 'gardien'],
  [/milieu/i, 'milieu'],
  [/(défenseur|defenseur|latéral|lateral|piston|arrière|arriere)/i, 'defenseur'],
  [/(attaquant|ailier|avant|buteur|pointe)/i, 'attaquant'],
]
const famillePoste = (txt) => {
  if (!txt) return null
  const t = POSTE_PAR_MOT.find(([re]) => re.test(txt))
  return t ? t[1] : null
}

export default function FicheEvaluationRouteur({ equipeJoueurId, educateurId, joueurNom, poste, role = 'educateur', readOnly = false, onClose }) {
  const [choix, setChoix] = useState(null) // null = chargement ; { ancienne: true } ou { modele, version, criteres, params, categorieCle }

  useEffect(() => {
    let annule = false
    ;(async () => {
      try {
        const { data: cle } = await supabase.rpc('secu_categorie_effectif', { p_equipe_joueur_id: equipeJoueurId })
        if (!cle) { if (!annule) setChoix({ ancienne: true }); return }
        const { data: modeles } = await supabase.from('modeles_evaluation').select('*').eq('categorie_cle', cle).eq('archive', false)
        const liste = (modeles || []).slice().sort((a, b) => (b.educateur_id === educateurId) - (a.educateur_id === educateurId))
        for (const modele of liste) {
          const { data: versions } = await supabase.from('modeles_evaluation_versions').select('*')
            .eq('modele_id', modele.id).not('publiee_le', 'is', null).order('numero', { ascending: false }).limit(1)
          const version = versions?.[0]
          if (!version) continue
          const { data: criteres } = await supabase.from('criteres_evaluation').select('*').eq('version_id', version.id).order('ordre', { ascending: true })
          if (!criteres?.length) continue
          const proprios = [modele.club_id, modele.educateur_id, educateurId].filter(Boolean)
          const { data: lignes } = await supabase.from('parametres_evaluation').select('*').in('proprietaire_id', proprios)
          const params = (lignes || []).find(l => l.proprietaire_id === modele.club_id)
            || (lignes || []).find(l => l.proprietaire_id === educateurId) || null
          if (!annule) setChoix({ modele, version, criteres, params, categorieCle: cle })
          return
        }
        if (!annule) setChoix({ ancienne: true })
      } catch (e) {
        console.error('[FicheEvaluationRouteur]', e)
        if (!annule) setChoix({ ancienne: true })
      }
    })()
    return () => { annule = true }
  }, [equipeJoueurId, educateurId])

  const [forceAncienne, setForceAncienne] = useState(false)
  if (!choix) return null
  if (choix.ancienne || forceAncienne) {
    return <FicheEvaluationJoueur equipeJoueurId={equipeJoueurId} educateurId={educateurId} joueurNom={joueurNom} role={role} readOnly={readOnly} onClose={onClose} />
  }
  return (
    <FicheJoueurOnglets
      equipeJoueurId={equipeJoueurId} educateurId={educateurId} joueurNom={joueurNom} poste={famillePoste(poste)} categorieCle={choix.categorieCle}
      modele={choix.modele} version={choix.version} criteres={choix.criteres} params={choix.params}
      readOnly={readOnly} onClose={onClose} onOuvrirAncienne={() => setForceAncienne(true)} />
  )
}

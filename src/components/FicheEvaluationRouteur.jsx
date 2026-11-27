// Choisit la fiche à ouvrir pour un joueur : la nouvelle fiche (modèle publié pour sa catégorie,
// celui de l'éducateur d'abord, sinon celui du club) ou, à défaut, l'ancienne fiche en texte libre.
// Les anciennes fiches ne sont ni modifiées ni migrées (PLAN-fiches-evaluation.md).
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import FicheEvaluationJoueur from './FicheEvaluationJoueur'
import FicheJoueurOnglets from './FicheJoueurOnglets'
import { famillePoste } from '../lib/ficheEvaluationPapier'

export default function FicheEvaluationRouteur({ equipeJoueurId, educateurId, joueurNom, poste, role = 'educateur', readOnly = false, onClose }) {
  const [choix, setChoix] = useState(null) // null = chargement ; { ancienne: true } ou { modele, version, criteres, params, categorieCle }

  useEffect(() => {
    let annule = false
    ;(async () => {
      try {
        const { data: cle } = await supabase.rpc('secu_categorie_effectif', { p_equipe_joueur_id: equipeJoueurId })
        if (!cle) { if (!annule) setChoix({ ancienne: true }); return }
        // Modèles et réglages demandés ensemble (la base ne renvoie que ce que ce compte a le droit de lire)
        const [{ data: modeles }, { data: toutesLignes }] = await Promise.all([
          supabase.from('modeles_evaluation').select('*, modeles_evaluation_versions(*, criteres_evaluation(*))').eq('categorie_cle', cle).eq('archive', false),
          supabase.from('parametres_evaluation').select('*'),
        ])
        const liste = (modeles || []).slice().sort((a, b) => (b.educateur_id === educateurId) - (a.educateur_id === educateurId))
        for (const { modeles_evaluation_versions: vs, ...modele } of liste) {
          const publiees = (vs || []).filter(v => v.publiee_le).sort((a, b) => b.numero - a.numero)
          const { criteres_evaluation: cr, ...version } = publiees[0] || {}
          if (!publiees[0] || !cr?.length) continue
          const criteres = cr.slice().sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
          const proprios = [modele.club_id, modele.educateur_id, educateurId].filter(Boolean)
          const lignes = (toutesLignes || []).filter(l => proprios.includes(l.proprietaire_id))
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
  if (!choix) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }} role="status">
      <p style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>Chargement de la fiche…</p>
    </div>
  )
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

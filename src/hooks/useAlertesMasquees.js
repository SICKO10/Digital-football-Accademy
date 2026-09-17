import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

// Persiste, par utilisateur connecté, quelles alertes d'un panneau
// "Alertes & infos" ont été validées (bouton "valider" sur chaque alerte) —
// table alertes_masquees, cf. supabase_alertes_masquees.sql. Réutilisé par
// AlertesPanel.jsx, AlertesClub (DashboardClub.jsx) et le widget Alertes de
// DashboardJoueur.jsx, qui filtrent chacun leur propre liste d'alertes avec
// le Set `masquees` retourné ici.
export function useAlertesMasquees() {
  const [masquees, setMasquees] = useState(new Set())

  useEffect(() => {
    supabase.from('alertes_masquees').select('alerte_id').then(({ data }) => {
      setMasquees(new Set((data || []).map(r => r.alerte_id)))
    })
  }, [])

  const masquer = useCallback((alerteId) => {
    setMasquees(prev => new Set(prev).add(alerteId))
    supabase.from('alertes_masquees').insert({ alerte_id: alerteId }).then(({ error }) => {
      if (error && error.code !== '23505') {
        setMasquees(prev => { const next = new Set(prev); next.delete(alerteId); return next })
      }
    })
  }, [])

  return { masquees, masquer }
}

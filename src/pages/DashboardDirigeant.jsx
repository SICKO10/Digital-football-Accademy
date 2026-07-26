import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import DashboardEducateur from './DashboardEducateur'

// Petit wrapper : charge l'accès délégué du dirigeant connecté, puis rend le dashboard
// éducateur habituel ciblé sur l'éducateur délégant, avec les permissions en prop pour
// le gating (voir canEdit/canView + sidebarSectionsVisibles dans DashboardEducateur.jsx).
export default function DashboardDirigeant() {
  const navigate = useNavigate()
  const [acces, setAcces] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }
      const { data } = await supabase
        .from('dirigeant_acces')
        .select('educateur_id, permissions')
        .eq('dirigeant_id', user.id)
        .eq('statut', 'accepte')
        .maybeSingle()
      if (!data) { navigate('/'); return }
      setAcces(data)
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#4ade80', fontFamily: 'Inter, sans-serif' }}>Chargement...</p>
    </div>
  )

  return <DashboardEducateur educateurIdOverride={acces.educateur_id} permissions={acces.permissions} />
}

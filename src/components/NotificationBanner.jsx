import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'

// Bandeau des communications plateforme (Digital Football → utilisateurs),
// publiées depuis DashboardCoach.jsx (section Communication, cf.
// supabase_notifications_plateforme.sql). `cibles` détermine quelles
// notifications concernent ce dashboard (ex. ['tous', 'joueurs']) — pas de
// requête sur profiles.plan ici, le rôle du dashboard suffit à le déduire.
const TYPE_LABEL = { info: 'Info', feature: 'Nouveauté', maintenance: 'Maintenance', promo: 'Offre' }

export default function NotificationBanner({ userId, cibles }) {
  const colors = useColors()
  const [notifs, setNotifs] = useState([])

  useEffect(() => {
    if (!userId) return
    const charger = async () => {
      const { data } = await supabase.from('notifications_plateforme')
        .select('*')
        .eq('actif', true)
        .in('cible', cibles)
        .order('created_at', { ascending: false })
        .limit(3)
      const { data: lues } = await supabase.from('notifications_lues').select('notification_id').eq('user_id', userId)
      const luesIds = new Set((lues || []).map(l => l.notification_id))
      setNotifs((data || []).filter(n => !luesIds.has(n.id)))
    }
    charger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, cibles.join(',')])

  const marquerLu = async (id) => {
    setNotifs(prev => prev.filter(n => n.id !== id))
    await supabase.from('notifications_lues').upsert({ notification_id: id, user_id: userId }, { onConflict: 'notification_id,user_id' })
  }

  const notif = notifs[0]
  if (!notif) return null

  const accent = {
    info: colors.accent.blue,
    feature: colors.accent.green,
    maintenance: colors.accent.orange,
    promo: colors.accent.purpleLight,
  }[notif.type] || colors.accent.blue

  return (
    <div style={{
      background: accent + '15', borderBottom: `1px solid ${accent}40`, padding: '10px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', minWidth: 0 }}>
        <span style={{ background: accent + '22', color: accent, borderRadius: '4px', padding: '2px 8px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 }}>
          {TYPE_LABEL[notif.type] || 'Info'}
        </span>
        <span style={{ color: colors.text.primary, fontSize: '13px', fontWeight: 700 }}>{notif.titre}</span>
        <span style={{ color: colors.text.faint, fontSize: '12px' }}>{notif.contenu}</span>
      </div>
      <button onClick={() => marquerLu(notif.id)} aria-label="Fermer"
        style={{ background: 'none', border: 'none', color: colors.text.faint, cursor: 'pointer', lineHeight: 1, padding: '2px 6px', flexShrink: 0, display: 'flex' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}

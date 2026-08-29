import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'

// Modal des communications plateforme (Digital Football → utilisateurs),
// publiées depuis DashboardCoach.jsx (section Communication, cf.
// supabase_notifications_plateforme.sql). `cibles` détermine quelles
// notifications concernent ce dashboard (ex. ['tous', 'joueurs']) — pas de
// requête sur profiles.plan ici, le rôle du dashboard suffit à le déduire.
const TYPE_LABEL = { info: 'Info', feature: 'Nouveauté', maintenance: 'Maintenance', promo: 'Offre' }

// notif.contenu est du texte libre saisi dans un <textarea> par l'admin
// (Communication.jsx), pas du HTML — on ne fait donc jamais de
// dangerouslySetInnerHTML dessus (un compte admin compromis ou un futur
// formulaire mal protégé pourrait y injecter du script). On reconnaît juste
// quelques conventions d'écriture simples : *gras*, paragraphes séparés par
// une ligne vide, listes à puces (• ligne) ou numérotées (1. ligne / 1️⃣ ligne).
const REGEX_NUMEROTE = /^([0-9]+[.)]|[0-9]️?⃣)\s*/

const rendreInline = (texte, cle) =>
  texte.split(/(\*[^*]+\*)/g).map((partie, i) =>
    partie.startsWith('*') && partie.endsWith('*') && partie.length > 1
      ? <strong key={`${cle}-${i}`}>{partie.slice(1, -1)}</strong>
      : <span key={`${cle}-${i}`}>{partie}</span>
  )

const formatMessage = (texte) => {
  if (!texte) return null
  return texte.trim().split(/\n\s*\n/).map((bloc, i) => {
    const lignes = bloc.split('\n').map(l => l.trim()).filter(Boolean)
    if (lignes.every(l => l.startsWith('•'))) {
      return <ul key={i}>{lignes.map((l, j) => <li key={j}>{rendreInline(l.replace(/^•\s*/, ''), `${i}-${j}`)}</li>)}</ul>
    }
    if (lignes.every(l => REGEX_NUMEROTE.test(l))) {
      return <ol key={i}>{lignes.map((l, j) => <li key={j}>{rendreInline(l.replace(REGEX_NUMEROTE, ''), `${i}-${j}`)}</li>)}</ol>
    }
    return (
      <p key={i}>
        {lignes.map((l, j) => <span key={j}>{rendreInline(l, `${i}-${j}`)}{j < lignes.length - 1 ? <br /> : null}</span>)}
      </p>
    )
  })
}

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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '16px', maxWidth: '600px', width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: '40px', position: 'relative' }}>
        <button onClick={() => marquerLu(notif.id)} aria-label="Fermer"
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: colors.text.faint, fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>
          ×
        </button>

        <span style={{ display: 'inline-block', background: accent + '22', color: accent, borderRadius: '4px', padding: '2px 8px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
          {TYPE_LABEL[notif.type] || 'Info'}
        </span>
        <h2 style={{ color: colors.text.primary, fontSize: '20px', fontWeight: 800, margin: '0 0 18px' }}>{notif.titre}</h2>

        <div style={{ fontFamily: 'Inter, sans-serif' }}>
          <style>{`
            .notif-contenu p { margin-bottom: 12px; color: ${colors.text.secondary}; line-height: 1.7; }
            .notif-contenu strong { color: ${colors.text.primary}; }
            .notif-contenu ul, .notif-contenu ol { padding-left: 20px; margin-bottom: 12px; color: ${colors.text.secondary}; }
            .notif-contenu li { margin-bottom: 6px; line-height: 1.6; }
          `}</style>
          <div className="notif-contenu">{formatMessage(notif.contenu)}</div>
        </div>

        <button onClick={() => marquerLu(notif.id)}
          style={{ marginTop: '24px', padding: '12px 32px', background: colors.accent.green, color: colors.background.base, border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '15px', cursor: 'pointer', width: '100%', fontFamily: 'Inter, sans-serif' }}>
          J'ai compris
        </button>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useColors } from '../../lib/theme'
import { supabase } from '../../supabase'
import { doublonsClub } from '../../lib/outilsAcces'

// Encart d'accueil de l'éducateur affilié sur les outils fournis par son club
// (bloc 10) :
// - doublon : un outil qu'il paie alors que son club le lui fournit. Calculé à
//   la lecture, il disparaît dès que l'éducateur a retiré le sien ;
// - retrait : le club a retiré un outil. Notification stockée par le serveur
//   (type `outil_club_retire`), que l'éducateur ferme quand il l'a lue.
export default function EncartOutilsClub({ outils, userId, onVoirMesOutils }) {
  const colors = useColors()
  const [retraits, setRetraits] = useState([])

  useEffect(() => {
    if (!outils?.actif || !userId) return undefined
    let annule = false
    supabase.from('notifications').select('id, contenu').eq('user_id', userId).eq('type', 'outil_club_retire').eq('lu', false)
      .order('created_at', { ascending: false }).limit(5)
      .then(({ data, error }) => {
        if (error) console.error('notifications outils', error.message)
        if (!annule) setRetraits(data || [])
      })
    return () => { annule = true }
  }, [outils?.actif, userId])

  if (!outils?.actif || !outils.pret) return null
  const doublons = doublonsClub(outils.etats)
  if (doublons.length === 0 && retraits.length === 0) return null

  const fermer = async (id) => {
    setRetraits(prev => prev.filter(n => n.id !== id))
    await supabase.from('notifications').update({ lu: true }).eq('id', id)
  }
  const paragraphe = { margin: '8px 0 0', fontSize: 14, lineHeight: 1.5, color: colors.text.primary }
  const bouton = {
    marginTop: 12, background: 'transparent', color: colors.text.primary, border: `1px solid ${colors.border.default}`,
    borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
  }

  return (
    <div style={{
      background: colors.background.surface, border: `1px solid ${colors.accent.amber}`, borderRadius: 14,
      padding: '14px 16px', marginBottom: 14, fontFamily: 'Inter, sans-serif',
    }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '1px' }}>
        Outils de ton club
      </p>
      {retraits.map(n => (
        <div key={n.id}>
          <p style={paragraphe}>{n.contenu}</p>
          <button onClick={() => fermer(n.id)} style={bouton}>J'ai compris</button>
        </div>
      ))}
      {doublons.map(({ outil }) => (
        <p key={outil.id} style={paragraphe}>
          <strong>{outil.nom}</strong> : ton club te le fournit gratuitement, tu peux retirer le tien dans Mes outils.
        </p>
      ))}
      {doublons.length > 0 && <button onClick={onVoirMesOutils} style={bouton}>Voir Mes outils</button>}
    </div>
  )
}

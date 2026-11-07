import { useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { radius } from '../../tokens'

// Profil club : transfert du compte à un autre responsable (réservé au compte
// créateur) et message au support en cas de conflit interne. Les deux envoient
// un ticket dans support_tickets, traité par l'admin dans son dashboard
// (section Support). Rien ne change dans le compte tant que l'admin n'a pas
// vérifié et traité la demande.
const emailValide = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

async function envoyerTicket(userId, sujet, message) {
  const { data, error } = await supabase
    .from('support_tickets')
    .insert({ user_id: userId, sujet, message, dernier_message_at: new Date().toISOString() })
    .select()
    .single()
  if (error) return error.message
  const { error: e2 } = await supabase
    .from('support_messages')
    .insert({ ticket_id: data.id, sender_id: userId, contenu: message, is_coach: false })
  return e2 ? e2.message : null
}

export default function ResponsableClub({ userId, estCreateur, nomClub, emailActuel, accentColor }) {
  const colors = useColors()
  const [mode, setMode] = useState(null) // 'transfert' | 'contact'
  const [nouvelEmail, setNouvelEmail] = useState('')
  const [confirme, setConfirme] = useState(false)
  const [sujet, setSujet] = useState('')
  const [message, setMessage] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')
  const [envoye, setEnvoye] = useState('')

  const fermer = () => { setMode(null); setErreur(''); setNouvelEmail(''); setConfirme(false); setSujet(''); setMessage('') }

  const envoyer = async () => {
    setErreur('')
    let s, m
    if (mode === 'transfert') {
      const e = nouvelEmail.trim().toLowerCase()
      if (!emailValide(e)) { setErreur('Adresse email invalide.'); return }
      if (e === (emailActuel || '').toLowerCase()) { setErreur('C’est déjà l’adresse de ce compte.'); return }
      if (!confirme) { setErreur('Coche la case de confirmation.'); return }
      s = `Transfert de responsable du compte club : ${nomClub || 'club'}`
      m = `Le créateur du compte club ${nomClub || ''} (${emailActuel || 'email inconnu'}) demande de transférer la responsabilité du dashboard club à : ${e}.\nÀ vérifier avec le demandeur avant toute modification.`
    } else {
      if (!sujet.trim() || !message.trim()) { setErreur('Renseigne un sujet et un message.'); return }
      s = `Conflit interne club : ${sujet.trim()}`
      m = `Club : ${nomClub || 'inconnu'}\n\n${message.trim()}`
    }
    setEnCours(true)
    const err = await envoyerTicket(userId, s, m)
    setEnCours(false)
    if (err) { setErreur('Envoi impossible : ' + err); return }
    setEnvoye(mode === 'transfert'
      ? 'Demande envoyée. Le support te répond pour vérifier, rien ne change avant cela.'
      : 'Message envoyé au support. Tu verras la réponse dans l’aide (onglet Support).')
    fermer()
  }

  const champ = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: radius.md, border: `1px solid ${colors.border.strong}`, background: colors.background.raised, color: colors.text.primary, fontSize: 14, fontFamily: 'inherit' }
  const bouton = (plein) => ({ padding: '10px 16px', borderRadius: radius.md, border: plein ? 'none' : `1px solid ${colors.border.strong}`, background: plein ? accentColor : 'transparent', color: plein ? '#fff' : colors.text.primary, fontWeight: 700, fontSize: 13, cursor: 'pointer' })

  return (
    <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.faint}`, borderRadius: radius.lg, padding: 20, marginBottom: '1.5rem' }}>
      <p style={{ margin: '0 0 6px', fontWeight: 800, fontSize: 16, color: colors.text.primary }}>Responsable du compte club</p>
      <p style={{ margin: '0 0 14px', fontSize: 13, color: colors.text.dim, lineHeight: 1.5 }}>
        {estCreateur
          ? 'Tu es le responsable de ce compte. Si tu quittes le club, tu peux demander à transmettre la responsabilité à une autre adresse email.'
          : 'Le transfert de responsabilité est réservé au créateur du compte club. En cas de désaccord interne, contacte le support.'}
      </p>
      {envoye && <p style={{ margin: '0 0 12px', fontSize: 13, color: colors.accent.success, fontWeight: 600 }}>{envoye}</p>}

      {!mode && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {estCreateur && <button style={bouton(true)} onClick={() => { setEnvoye(''); setMode('transfert') }}>Transférer la responsabilité</button>}
          <button style={bouton(false)} onClick={() => { setEnvoye(''); setMode('contact') }}>Contactez-nous</button>
        </div>
      )}

      {mode === 'transfert' && (
        <div style={{ display: 'grid', gap: 10 }}>
          <input style={champ} type="email" placeholder="Email du nouveau responsable" value={nouvelEmail} onChange={e => setNouvelEmail(e.target.value)} />
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: colors.text.secondary, lineHeight: 1.4 }}>
            <input type="checkbox" checked={confirme} onChange={e => setConfirme(e.target.checked)} style={{ marginTop: 3 }} />
            Je confirme vouloir transmettre la responsabilité de ce compte club. Le support vérifiera avant de modifier quoi que ce soit.
          </label>
          {erreur && <p style={{ margin: 0, fontSize: 13, color: colors.accent.red }}>{erreur}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={bouton(true)} onClick={envoyer} disabled={enCours}>{enCours ? 'Envoi…' : 'Envoyer la demande'}</button>
            <button style={bouton(false)} onClick={fermer}>Annuler</button>
          </div>
        </div>
      )}

      {mode === 'contact' && (
        <div style={{ display: 'grid', gap: 10 }}>
          <input style={champ} placeholder="Sujet" value={sujet} onChange={e => setSujet(e.target.value)} />
          <textarea style={{ ...champ, minHeight: 100, resize: 'vertical' }} placeholder="Explique la situation" value={message} onChange={e => setMessage(e.target.value)} />
          {erreur && <p style={{ margin: 0, fontSize: 13, color: colors.accent.red }}>{erreur}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={bouton(true)} onClick={envoyer} disabled={enCours}>{enCours ? 'Envoi…' : 'Envoyer au support'}</button>
            <button style={bouton(false)} onClick={fermer}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  )
}

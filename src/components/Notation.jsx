import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

// Composant étoiles cliquables
export function Etoiles({ note, onChange, size = 24, readonly = false }) {
  const [hover, setHover] = useState(0)
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          onClick={() => !readonly && onChange && onChange(n)}
          onMouseEnter={() => !readonly && setHover(n)}
          onMouseLeave={() => !readonly && setHover(0)}
          style={{ fontSize: size, cursor: readonly ? 'default' : 'pointer', opacity: (hover || note) >= n ? 1 : 0.2, transition: 'opacity 0.1s', lineHeight: 1 }}
        >⭐</span>
      ))}
    </div>
  )
}

// Badge note moyenne (lecture seule)
export function BadgeNote({ cibleId, style = {} }) {
  const [moyenne, setMoyenne] = useState(null)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!cibleId) return
    supabase.from('avis').select('note').eq('cible_id', cibleId).then(({ data }) => {
      if (data && data.length > 0) {
        const moy = data.reduce((s, a) => s + a.note, 0) / data.length
        setMoyenne(moy.toFixed(1))
        setCount(data.length)
      }
    })
  }, [cibleId])

  if (!moyenne) return null
  return (
    <span style={{ background: '#fbbf2415', border: '1px solid #fbbf2440', color: '#fbbf24', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', ...style }}>
      ⭐ {moyenne} <span style={{ opacity: 0.6, fontWeight: 400 }}>({count})</span>
    </span>
  )
}

// Modal de notation
export function ModalNotation({ auteurId, cible, onClose, onDone }) {
  const [note, setNote] = useState(0)
  const [commentaire, setCommentaire] = useState('')
  const [sending, setSending] = useState(false)
  const [dejaNote, setDejaNote] = useState(null)

  useEffect(() => {
    if (!auteurId || !cible?.id) return
    supabase.from('avis').select('*').eq('auteur_id', auteurId).eq('cible_id', cible.id).single()
      .then(({ data }) => { if (data) { setDejaNote(data); setNote(data.note); setCommentaire(data.commentaire || '') } })
  }, [auteurId, cible?.id])

  const envoyer = async () => {
    if (!note) return
    setSending(true)
    await supabase.from('avis').upsert(
      { auteur_id: auteurId, cible_id: cible.id, note, commentaire: commentaire.trim() || null, updated_at: new Date().toISOString() },
      { onConflict: 'auteur_id,cible_id' }
    )
    setSending(false)
    onDone?.()
    onClose()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: '#000000bb', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '2rem', maxWidth: '420px', width: '100%' }}>
        <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 800 }}>
          {dejaNote ? 'Modifier ma note' : 'Noter'}
        </h3>
        <p style={{ margin: '0 0 1.5rem', fontSize: '13px', color: '#666' }}>
          {cible?.prenom} {cible?.nom}
          {cible?.plan && <span style={{ color: '#4ade80', marginLeft: '6px', fontWeight: 600, textTransform: 'capitalize' }}>· {cible.plan}</span>}
        </p>

        <div style={{ marginBottom: '1.5rem' }}>
          <Etoiles note={note} onChange={setNote} size={32} />
          {note > 0 && (
            <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#666' }}>
              {['', 'Très insuffisant', 'Insuffisant', 'Bien', 'Très bien', 'Excellent'][note]}
            </p>
          )}
        </div>

        <textarea
          value={commentaire}
          onChange={e => setCommentaire(e.target.value)}
          placeholder="Commentaire optionnel..."
          style={{ width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff', padding: '10px 12px', fontSize: '13px', minHeight: '80px', resize: 'vertical', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', marginBottom: '1rem' }}
        />

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={envoyer}
            disabled={!note || sending}
            style={{ flex: 1, background: note ? '#4ade80' : '#1a1a1a', color: note ? '#000' : '#555', border: 'none', padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: note ? 'pointer' : 'not-allowed', fontFamily: 'Inter, sans-serif' }}>
            {sending ? 'Envoi...' : dejaNote ? 'Mettre à jour' : 'Envoyer ma note'}
          </button>
          <button onClick={onClose} style={{ background: '#1a1a1a', color: '#666', border: '1px solid #2a2a2a', padding: '12px 20px', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

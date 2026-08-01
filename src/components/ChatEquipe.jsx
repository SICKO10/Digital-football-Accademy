import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'

// ─── Bulle de message ───────────────────────────────────────────────────────
function BulleMessage({ msg, auteurs, userId, onVote, sondages, reponses }) {
  const estMoi = msg.auteur_id === userId
  const auteur = auteurs[msg.auteur_id]
  const initiales = auteur
    ? (auteur.prenom?.[0] || '') + (auteur.nom?.[0] || '')
    : '?'

  if (msg.type === 'sondage') {
    const sondage = sondages[msg.id]
    if (!sondage) return null
    const reponsesS = reponses[sondage.id] || []
    const monVote = reponsesS.find(r => r.joueur_id === userId)
    const total = reponsesS.length
    const comptes = sondage.options.reduce((acc, opt) => {
      acc[opt] = reponsesS.filter(r => r.choix === opt).length
      return acc
    }, {})

    return (
      <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: estMoi ? 'flex-end' : 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          {!estMoi && (
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1a1a1a', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#4ade80' }}>
              {initiales}
            </div>
          )}
          <span style={{ fontSize: 11, color: '#555' }}>
            {estMoi ? 'Vous' : `${auteur?.prenom || ''} ${auteur?.nom || ''}`} · {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 14, padding: 16, maxWidth: 340, width: '100%' }}>
          <p style={{ margin: '0 0 4px', fontSize: 10, color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>📊 Sondage</p>
          <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700 }}>{sondage.question}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sondage.options.map((opt) => {
              const nb = comptes[opt] || 0
              const pct = total > 0 ? Math.round((nb / total) * 100) : 0
              const voted = monVote?.choix === opt
              const voteurs = reponsesS.filter(r => r.choix === opt)
              const nomsVoteurs = voteurs
                .map(v => v.profiles ? `${v.profiles.prenom || ''} ${v.profiles.nom || ''}`.trim() : '')
                .filter(Boolean)

              return (
                <div key={opt} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <button
                    onClick={() => !sondage.cloture && onVote(sondage.id, opt)}
                    disabled={sondage.cloture}
                    style={{
                      position: 'relative', overflow: 'hidden',
                      background: voted ? '#4ade8020' : '#0a0a0a',
                      border: `1px solid ${voted ? '#4ade8060' : '#2a2a2a'}`,
                      borderRadius: 8, padding: '8px 12px',
                      cursor: sondage.cloture ? 'default' : 'pointer',
                      textAlign: 'left', fontFamily: 'Inter, sans-serif',
                      transition: 'all 0.15s',
                    }}>
                    <div style={{ position: 'absolute', inset: 0, background: voted ? '#4ade8015' : '#ffffff08', width: `${pct}%`, transition: 'width 0.4s ease', pointerEvents: 'none' }} />
                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: voted ? '#4ade80' : '#ccc', fontWeight: voted ? 700 : 400 }}>
                        {voted ? '✓ ' : ''}{opt}
                      </span>
                      <span style={{ fontSize: 11, color: '#555', fontWeight: 600 }}>{pct}% · {nb}</span>
                    </div>
                  </button>
                  {nomsVoteurs.length > 0 && (
                    <p style={{ margin: '0 0 0 4px', fontSize: 10, color: '#444', lineHeight: 1.4 }}>
                      {nomsVoteurs.join(', ')}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 10, color: '#555' }}>
            {total} réponse{total > 1 ? 's' : ''}
            {monVote && !sondage.cloture && <span style={{ color: '#4ade8060', marginLeft: 6 }}>· Cliquer pour changer</span>}
          </p>
          {sondage.cloture && <p style={{ margin: '8px 0 0', fontSize: 10, color: '#ef4444' }}>Sondage clôturé</p>}
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', alignItems: estMoi ? 'flex-end' : 'flex-start' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
        {!estMoi && (
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#1a1a1a', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#4ade80' }}>
            {initiales}
          </div>
        )}
        <span style={{ fontSize: 10, color: '#555' }}>
          {estMoi ? 'Vous' : `${auteur?.prenom || ''} ${auteur?.nom || ''}`} · {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <div style={{
        background: estMoi ? '#4ade8020' : '#111',
        border: `1px solid ${estMoi ? '#4ade8040' : '#1a1a1a'}`,
        borderRadius: estMoi ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        padding: '9px 14px', maxWidth: 320,
      }}>
        <p style={{ margin: 0, fontSize: 14, color: estMoi ? '#e0ffe0' : '#e0e0e0', lineHeight: 1.4 }}>{msg.contenu}</p>
      </div>
    </div>
  )
}

// ─── Formulaire sondage ──────────────────────────────────────────────────────
function FormSondage({ onSubmit, onCancel }) {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])

  const ajouterOption = () => { if (options.length < 5) setOptions(o => [...o, '']) }
  const majOption = (i, val) => setOptions(o => o.map((x, j) => j === i ? val : x))
  const supprimerOption = (i) => { if (options.length > 2) setOptions(o => o.filter((_, j) => j !== i)) }

  const valide = question.trim() && options.filter(o => o.trim()).length >= 2

  return (
    <div style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 14, padding: 16, marginBottom: 10 }}>
      <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#4ade80' }}>📊 Nouveau sondage</p>
      <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Question..."
        style={{ width: '100%', background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 10px', color: '#fff', fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none', marginBottom: 10, boxSizing: 'border-box' }} />
      {options.map((opt, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <input value={opt} onChange={e => majOption(i, e.target.value)} placeholder={`Option ${i + 1}...`}
            style={{ flex: 1, background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, padding: '7px 10px', color: '#fff', fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none' }} />
          {options.length > 2 && (
            <button onClick={() => supprimerOption(i)}
              style={{ background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 8, color: '#555', cursor: 'pointer', padding: '0 10px' }}>✕</button>
          )}
        </div>
      ))}
      {options.length < 5 && (
        <button onClick={ajouterOption}
          style={{ background: 'transparent', border: '1px dashed #2a2a2a', borderRadius: 8, color: '#555', cursor: 'pointer', fontSize: 12, padding: '6px 12px', width: '100%', marginBottom: 10, fontFamily: 'Inter, sans-serif' }}>
          + Ajouter une option
        </button>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onSubmit(question.trim(), options.filter(o => o.trim()))} disabled={!valide}
          style={{ flex: 1, background: '#4ade80', color: '#000', border: 'none', borderRadius: 8, padding: '8px', fontWeight: 700, fontSize: 13, cursor: valide ? 'pointer' : 'default', fontFamily: 'Inter, sans-serif', opacity: valide ? 1 : 0.4 }}>
          Envoyer
        </button>
        <button onClick={onCancel}
          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#555', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 13 }}>
          Annuler
        </button>
      </div>
    </div>
  )
}

// ─── Composant principal ChatEquipe ─────────────────────────────────────────
export default function ChatEquipe({ educateurId, userId, isEducateur = false }) {
  const [messages, setMessages] = useState([])
  const [sondages, setSondages] = useState({})       // { message_id: sondage }
  const [reponses, setReponses] = useState({})       // { sondage_id: [reponses] }
  const [auteurs, setAuteurs] = useState({})         // { auteur_id: profil }
  const [texte, setTexte] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [showSondage, setShowSondage] = useState(false)
  const [loading, setLoading] = useState(true)
  const bas = useRef(null)

  const charger = async () => {
    const { data: msgs } = await supabase
      .from('messages_equipe')
      .select('*')
      .eq('educateur_id', educateurId)
      .order('created_at', { ascending: true })
      .limit(100)

    if (!msgs) { setLoading(false); return }
    setMessages(msgs)

    const ids = [...new Set(msgs.map(m => m.auteur_id).filter(Boolean))]
    if (ids.length > 0) {
      const { data: profils } = await supabase
        .from('profiles')
        .select('id, prenom, nom')
        .in('id', ids)
      const map = {}
      profils?.forEach(p => { map[p.id] = p })
      setAuteurs(map)
    }

    const msgSondages = msgs.filter(m => m.type === 'sondage')
    if (msgSondages.length > 0) {
      const { data: s } = await supabase
        .from('sondages')
        .select('*')
        .in('message_id', msgSondages.map(m => m.id))
      const sMap = {}
      s?.forEach(sd => { sMap[sd.message_id] = sd })
      setSondages(sMap)

      if (s?.length > 0) {
        const { data: r } = await supabase
          .from('sondage_reponses')
          .select('*, profiles(prenom, nom)')
          .in('sondage_id', s.map(sd => sd.id))
        const rMap = {}
        r?.forEach(rep => {
          if (!rMap[rep.sondage_id]) rMap[rep.sondage_id] = []
          rMap[rep.sondage_id].push(rep)
        })
        setReponses(rMap)
      }
    }

    setLoading(false)
  }

  useEffect(() => {
    charger()

    const channel = supabase
      .channel(`chat-equipe-${educateurId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages_equipe',
        filter: `educateur_id=eq.${educateurId}`,
      }, async (payload) => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev
          return [...prev, payload.new]
        })
        setAuteurs(prev => {
          if (!payload.new.auteur_id || prev[payload.new.auteur_id]) return prev
          supabase.from('profiles').select('id, prenom, nom').eq('id', payload.new.auteur_id).maybeSingle()
            .then(({ data: p }) => { if (p) setAuteurs(cur => ({ ...cur, [p.id]: p })) })
          return prev
        })
        if (payload.new.type === 'sondage') {
          await new Promise(r => setTimeout(r, 300)) // attendre l'insert sondage
          const { data: s } = await supabase.from('sondages').select('*').eq('message_id', payload.new.id).single()
          if (s) setSondages(prev => ({ ...prev, [payload.new.id]: s }))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [educateurId])

  useEffect(() => {
    bas.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const envoyerMessage = async () => {
    if (!texte.trim() || envoi) return
    setEnvoi(true)
    await supabase.from('messages_equipe').insert({
      educateur_id: educateurId,
      auteur_id: userId,
      contenu: texte.trim(),
      type: 'message',
    })
    setTexte('')
    setEnvoi(false)
  }

  const envoyerSondage = async (question, options) => {
    const { data: msg } = await supabase.from('messages_equipe').insert({
      educateur_id: educateurId,
      auteur_id: userId,
      contenu: null,
      type: 'sondage',
    }).select().single()
    if (msg) {
      const { data: s } = await supabase.from('sondages').insert({
        message_id: msg.id,
        question,
        options,
      }).select().single()
      if (s) setSondages(prev => ({ ...prev, [msg.id]: s }))
    }
    setShowSondage(false)
  }

  const voter = async (sondageId, choix) => {
    const { error } = await supabase.from('sondage_reponses').upsert(
      { sondage_id: sondageId, joueur_id: userId, choix },
      { onConflict: 'sondage_id,joueur_id' }
    )
    if (!error) {
      setReponses(prev => {
        const existantes = (prev[sondageId] || []).filter(r => r.joueur_id !== userId)
        const profil = auteurs[userId] || null
        return {
          ...prev,
          [sondageId]: [
            ...existantes,
            {
              sondage_id: sondageId,
              joueur_id: userId,
              choix,
              profiles: profil ? { prenom: profil.prenom, nom: profil.nom } : null,
            },
          ],
        }
      })
    } else {
      console.error('Erreur vote sondage:', error)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <div style={{ width: 24, height: 24, border: '2px solid #1a1a1a', borderTop: '2px solid #4ade80', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '60vh', minHeight: 400, background: '#0a0a0a', borderRadius: 16, border: '1px solid #1a1a1a', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
        <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>Canal d'équipe</p>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#555' }}>En direct</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
        {messages.length === 0 && (
          <p style={{ color: '#333', fontSize: 13, textAlign: 'center', marginTop: 40 }}>Aucun message. Soyez le premier à écrire !</p>
        )}
        {messages.map(msg => (
          <BulleMessage key={msg.id} msg={msg} auteurs={auteurs} userId={userId} onVote={voter} sondages={sondages} reponses={reponses} />
        ))}
        <div ref={bas} />
      </div>

      <div style={{ padding: '12px 18px', borderTop: '1px solid #1a1a1a' }}>
        {showSondage && isEducateur && (
          <FormSondage onSubmit={envoyerSondage} onCancel={() => setShowSondage(false)} />
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          {isEducateur && !showSondage && (
            <button onClick={() => setShowSondage(true)} title="Créer un sondage"
              style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '9px 12px', color: '#555', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>
              📊
            </button>
          )}
          <textarea value={texte} onChange={e => setTexte(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyerMessage() } }}
            placeholder="Message..." rows={1}
            style={{ flex: 1, background: '#111', border: '1px solid #2a2a2a', borderRadius: 10, padding: '9px 12px', color: '#fff', fontSize: 14, fontFamily: 'Inter, sans-serif', outline: 'none', resize: 'none', lineHeight: 1.4 }} />
          <button onClick={envoyerMessage} disabled={!texte.trim() || envoi}
            style={{ background: texte.trim() ? '#4ade80' : '#1a1a1a', border: 'none', borderRadius: 10, padding: '9px 14px', color: texte.trim() ? '#000' : '#555', cursor: texte.trim() ? 'pointer' : 'default', fontWeight: 700, fontSize: 16, flexShrink: 0, transition: 'all 0.15s' }}>
            ➤
          </button>
        </div>
      </div>
    </div>
  )
}

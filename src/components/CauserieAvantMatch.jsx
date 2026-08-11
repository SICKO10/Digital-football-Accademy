import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { enqueueGroqRequest, libelleStatutGroq } from '../lib/groqQueue'

const TONS = [
  { val: 'motivant', label: '🔥 Motivant', desc: 'Galvanise' },
  { val: 'calme', label: '🧘 Calme', desc: 'Rassure' },
  { val: 'serieux', label: '📋 Sérieux', desc: 'Responsabilise' },
  { val: 'intense', label: '⚡ Intense', desc: 'Électrise' },
]

const TON_LABEL = (val) => TONS.find(t => t.val === val)?.label.replace(/^\S+\s/, '') || val

const formVide = () => ({
  adversaire: '', date_match: '', domicile_exterieur: 'domicile',
  enjeu: '', animation_avec_ballon: '', animation_sans_ballon: '',
  coups_pieds_arretes: '', conclusion_motivation: '', ton: 'motivant',
})

export default function CauserieAvantMatch({ userId, equipeNom }) {
  const [etape, setEtape] = useState(1) // 1=formulaire, 2=génération, 3=résultat
  const [iaStatus, setIaStatus] = useState(null)
  const [historique, setHistorique] = useState([])
  const [voirHistorique, setVoirHistorique] = useState(false)
  const [tableMissing, setTableMissing] = useState(false)

  const [form, setForm] = useState(formVide)
  const [causerieGeneree, setCauserieGeneree] = useState('')

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const chargerHistorique = async () => {
    const { data, error } = await supabase
      .from('causeries')
      .select('id, adversaire, date_match, domicile_exterieur, ton, causerie_generee, created_at')
      .eq('educateur_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)
    if (error) {
      if (error.code === '42P01') setTableMissing(true)
      return
    }
    setTableMissing(false)
    setHistorique(data || [])
  }

  useEffect(() => { if (userId) chargerHistorique() }, [userId])

  const genererCauserie = async () => {
    if (!form.adversaire.trim()) { alert("Renseigne au moins le nom de l'adversaire.") ; return }
    const snapshot = { ...form }
    setEtape(2)
    setIaStatus(null)
    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY
      if (!apiKey) throw new Error('Clé VITE_GROQ_API_KEY manquante dans .env')

      const prompt = `Tu es un entraîneur de football expérimenté. Tu dois rédiger une causerie d'avant-match percutante et adaptée à l'âge des joueurs.

CONTEXTE DU MATCH :
- Équipe : ${equipeNom || 'notre équipe'}
- Adversaire : ${snapshot.adversaire}
- Date : ${snapshot.date_match || 'ce week-end'}
- Lieu : ${snapshot.domicile_exterieur === 'domicile' ? 'À domicile' : 'À l\'extérieur'}
- Enjeu : ${snapshot.enjeu || 'match de championnat classique'}
- Ton souhaité : ${snapshot.ton}

ANIMATION AVEC BALLON (consignes offensives) :
${snapshot.animation_avec_ballon || 'Conserver le ballon, jouer simple et vite, créer des décalages.'}

ANIMATION SANS BALLON (consignes défensives) :
${snapshot.animation_sans_ballon || 'Rester compact, presser haut, ne pas laisser jouer.'}

COUPS DE PIED ARRÊTÉS :
${snapshot.coups_pieds_arretes || 'Être concentrés sur chaque coup de pied arrêté, défensivement et offensivement.'}

CONCLUSION / MESSAGE DE MOTIVATION :
${snapshot.conclusion_motivation || 'Donner le meilleur de soi-même, pour l\'équipe.'}

Rédige une causerie complète, parlée, comme si tu t'adressais directement aux joueurs dans le vestiaire. Structure-la en 4 parties clairement lisibles, chaque titre de partie seul sur sa ligne entre doubles astérisques (ex: **CONTEXTE**) :

1. **CONTEXTE** — Introduire le match, l'adversaire, ce qui est en jeu
2. **CE QU'ON VA FAIRE AVEC LE BALLON** — Expliquer les consignes offensives de façon simple et concrète
3. **CE QU'ON VA FAIRE SANS LE BALLON** — Expliquer les consignes défensives + coups de pied arrêtés
4. **CONCLUSION** — Message fort, motivant, qui donne envie de se battre

Ton : ${snapshot.ton === 'motivant' ? 'Énergique, combatif, qui galvanise' : snapshot.ton === 'calme' ? 'Posé, précis, qui rassure' : snapshot.ton === 'serieux' ? 'Sérieux, professionnel, qui responsabilise' : 'Intense et passionné'}
Longueur : environ 300-400 mots. Discours direct, sans jargon technique excessif. Vouvoiement si U15 et plus, tutoiement si U13 et moins.`

      const data = await enqueueGroqRequest('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_completion_tokens: 1500,
        }),
      }, setIaStatus)
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error))
      const texte = data.choices?.[0]?.message?.content || ''
      if (!texte.trim()) throw new Error("L'IA n'a renvoyé aucun texte.")
      setCauserieGeneree(texte)

      const { error } = await supabase.from('causeries').insert({
        educateur_id: userId,
        equipe: equipeNom || null,
        ...snapshot,
        date_match: snapshot.date_match || null,
        causerie_generee: texte,
      })
      if (error) console.error('Erreur sauvegarde causerie (texte quand même affiché) :', error.message)

      setEtape(3)
      chargerHistorique()
    } catch (err) {
      alert('Erreur IA : ' + err.message)
      setEtape(1)
      setForm(snapshot)
    }
    setIaStatus(null)
  }

  const copierTexte = () => {
    navigator.clipboard.writeText(causerieGeneree).then(() => alert('✅ Causerie copiée dans le presse-papier !')).catch(() => {})
  }

  const recommencer = () => {
    setEtape(1)
    setCauserieGeneree('')
    setForm(formVide())
  }

  // ─── Styles communs ────────────────────────────────────────────────────
  const card = { background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '24px' }
  const label = { display: 'block', color: '#9ca3af', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }
  const input = { width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: '10px', color: '#fff', fontSize: '14px', padding: '10px 14px', boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif' }
  const textarea = { ...input, minHeight: '90px', resize: 'vertical', lineHeight: 1.5 }
  const btnGreen = { background: '#4ade80', border: 'none', borderRadius: '10px', color: '#000', fontWeight: 700, fontSize: '15px', padding: '12px 28px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }
  const btnGhost = { background: 'none', border: '1px solid #222', borderRadius: '10px', color: '#9ca3af', fontSize: '13px', padding: '10px 18px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }

  if (tableMissing) {
    return (
      <div style={{ background: '#1a1a00', border: '1px solid #f59e0b40', borderRadius: '12px', padding: 24 }}>
        <div style={{ color: '#f59e0b', fontWeight: 700 }}>⚠️ La table <code>causeries</code> n'existe pas encore en base.</div>
        <div style={{ color: '#9ca3af', fontSize: 14, marginTop: 4 }}>Exécute supabase_causeries.sql dans l'éditeur SQL Supabase.</div>
      </div>
    )
  }

  // ─── Vue historique ────────────────────────────────────────────────────
  if (voirHistorique) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button onClick={() => setVoirHistorique(false)} style={btnGhost}>← Retour</button>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '20px' }}>Historique des causeries</h2>
        </div>
        {historique.length === 0 ? (
          <p style={{ color: '#6b7280' }}>Aucune causerie sauvegardée.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {historique.map(c => (
              <div key={c.id} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: '16px' }}>
                      vs {c.adversaire} · {c.domicile_exterieur === 'domicile' ? '🏠' : '✈️'}
                    </p>
                    <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '12px' }}>
                      {c.date_match ? new Date(c.date_match + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                      {' · '}{TON_LABEL(c.ton)}
                    </p>
                  </div>
                  <button
                    onClick={() => { setCauserieGeneree(c.causerie_generee || ''); setEtape(3); setVoirHistorique(false) }}
                    style={{ ...btnGhost, fontSize: '12px', padding: '6px 12px' }}
                  >
                    Relire
                  </button>
                </div>
                <p style={{ margin: 0, color: '#9ca3af', fontSize: '13px', lineHeight: 1.5 }}>
                  {(c.causerie_generee || '').slice(0, 180)}…
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ─── Vue chargement ────────────────────────────────────────────────────
  if (etape === 2) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '20px' }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '3px solid #222', borderTop: '3px solid #4ade80', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>{iaStatus ? libelleStatutGroq(iaStatus) : "L'IA prépare la causerie…"}</p>
      </div>
    )
  }

  // ─── Vue résultat ──────────────────────────────────────────────────────
  if (etape === 3) {
    return (
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '22px' }}>Causerie avant match</h2>
            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '13px' }}>
              vs {form.adversaire} · {form.domicile_exterieur === 'domicile' ? 'Domicile 🏠' : 'Extérieur ✈️'}
              {form.date_match ? ` · ${new Date(form.date_match + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}` : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={copierTexte} style={{ ...btnGhost, color: '#4ade80', borderColor: '#4ade8044' }}>📋 Copier</button>
            <button onClick={() => setVoirHistorique(true)} style={btnGhost}>Historique</button>
            <button onClick={recommencer} style={btnGhost}>+ Nouvelle causerie</button>
          </div>
        </div>

        <div style={{ ...card, borderColor: '#4ade8022', background: 'linear-gradient(135deg, rgba(74,222,128,0.03) 0%, rgba(0,0,0,0) 100%)' }}>
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(74,222,128,0.12)', color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Ton : {TON_LABEL(form.ton)}
            </span>
          </div>
          <div style={{ color: '#e5e7eb', fontSize: '15px', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
            {causerieGeneree.split('\n').map((line, i) => {
              const titre = line.match(/^\*\*(.+)\*\*$/)
              if (titre) return (
                <p key={i} style={{ margin: '20px 0 8px', color: '#4ade80', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid #4ade8022', paddingBottom: '6px' }}>
                  {titre[1]}
                </p>
              )
              return <span key={i}>{line.replace(/\*\*(.*?)\*\*/g, '$1')}{'\n'}</span>
            })}
          </div>
        </div>

        <p style={{ color: '#374151', fontSize: '12px', textAlign: 'center', marginTop: '16px' }}>
          💡 Cette causerie est sauvegardée automatiquement dans l'historique
        </p>
      </div>
    )
  }

  // ─── Vue formulaire (étape 1) ──────────────────────────────────────────
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '22px', fontWeight: 800 }}>Causerie avant match</h2>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '13px' }}>Remplis les sections, l'IA rédige la causerie complète</p>
        </div>
        {historique.length > 0 && (
          <button onClick={() => setVoirHistorique(true)} style={btnGhost}>📋 Historique ({historique.length})</button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        <div style={card}>
          <p style={{ margin: '0 0 16px', color: '#fff', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            <span style={{ color: '#4ade80', marginRight: '8px' }}>01</span> Contexte du match
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div>
              <label style={label}>Adversaire *</label>
              <input style={input} placeholder="AS Monaco U17, FC Barcelone…" value={form.adversaire} onChange={e => set('adversaire', e.target.value)} />
            </div>
            <div>
              <label style={label}>Date du match</label>
              <input type="date" style={input} value={form.date_match} onChange={e => set('date_match', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '12px' }}>
            <div>
              <label style={label}>Lieu</label>
              <select style={input} value={form.domicile_exterieur} onChange={e => set('domicile_exterieur', e.target.value)}>
                <option value="domicile">🏠 Domicile</option>
                <option value="exterieur">✈️ Extérieur</option>
              </select>
            </div>
            <div>
              <label style={label}>Enjeu du match</label>
              <input style={input} placeholder="1/4 de finale coupe, match de gala…" value={form.enjeu} onChange={e => set('enjeu', e.target.value)} />
            </div>
          </div>
        </div>

        <div style={card}>
          <p style={{ margin: '0 0 12px', color: '#fff', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            <span style={{ color: '#60a5fa', marginRight: '8px' }}>02</span> Animation avec ballon
          </p>
          <p style={{ margin: '0 0 10px', color: '#6b7280', fontSize: '12px' }}>Tes consignes offensives : comment vous voulez jouer, créer des occasions, attaquer</p>
          <textarea style={textarea} placeholder="Ex: On veut jouer vite et vertical, exploiter les espaces dans le dos de leur défense, les ailiers doivent chercher le un-contre-un, le n°9 fait les appels en profondeur…" value={form.animation_avec_ballon} onChange={e => set('animation_avec_ballon', e.target.value)} />
        </div>

        <div style={card}>
          <p style={{ margin: '0 0 12px', color: '#fff', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            <span style={{ color: '#f97316', marginRight: '8px' }}>03</span> Animation sans ballon
          </p>
          <p style={{ margin: '0 0 10px', color: '#6b7280', fontSize: '12px' }}>Tes consignes défensives : comment vous voulez défendre, presser, récupérer le ballon</p>
          <textarea style={textarea} placeholder="Ex: On défend en bloc bas, on laisse pas les milieux adverses se retourner, dès la perte on represse immédiatement, le pressing est collectif…" value={form.animation_sans_ballon} onChange={e => set('animation_sans_ballon', e.target.value)} />
        </div>

        <div style={card}>
          <p style={{ margin: '0 0 12px', color: '#fff', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            <span style={{ color: '#c084fc', marginRight: '8px' }}>04</span> Coups de pied arrêtés
          </p>
          <textarea style={{ ...textarea, minHeight: '70px' }} placeholder="Ex: Sur les corners défensifs on est en zone, sur les nôtres le n°8 va au 1er poteau, on a préparé deux CPA offensifs…" value={form.coups_pieds_arretes} onChange={e => set('coups_pieds_arretes', e.target.value)} />
        </div>

        <div style={card}>
          <p style={{ margin: '0 0 12px', color: '#fff', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            <span style={{ color: '#fbbf24', marginRight: '8px' }}>05</span> Conclusion & Motivation
          </p>
          <div style={{ marginBottom: '12px' }}>
            <label style={label}>Ton de la causerie</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {TONS.map(t => (
                <button
                  key={t.val}
                  onClick={() => set('ton', t.val)}
                  style={{
                    background: form.ton === t.val ? 'rgba(74,222,128,0.15)' : '#0a0a0a',
                    border: `1px solid ${form.ton === t.val ? '#4ade80' : '#222'}`,
                    borderRadius: '8px', color: form.ton === t.val ? '#4ade80' : '#9ca3af',
                    fontSize: '13px', fontWeight: 600, padding: '8px 14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <label style={label}>Message / valeurs à transmettre (optionnel)</label>
          <textarea style={{ ...textarea, minHeight: '70px' }} placeholder="Ex: Ce match c'est une finale pour nous, on joue pour le club, pour les familles, pour les coéquipiers blessés. On a bossé dur, c'est le moment de montrer qui on est…" value={form.conclusion_motivation} onChange={e => set('conclusion_motivation', e.target.value)} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '8px', paddingBottom: '32px' }}>
          <button
            onClick={genererCauserie}
            disabled={!form.adversaire.trim()}
            style={{ ...btnGreen, opacity: !form.adversaire.trim() ? 0.5 : 1, fontSize: '16px', padding: '14px 36px', borderRadius: '12px' }}
          >
            ⚽ Générer la causerie
          </button>
        </div>

      </div>
    </div>
  )
}

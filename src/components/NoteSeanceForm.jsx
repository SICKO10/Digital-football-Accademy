import { useState } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'

function StarPicker({ value, onChange, label, colors }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ color: colors.text.faint, fontSize: '12px', marginBottom: '8px' }}>{label}</div>
      <div style={{ display: 'flex', gap: '8px' }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => onChange(n)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', opacity: n <= value ? 1 : 0.25, transform: n <= value ? 'scale(1.1)' : 'scale(1)', transition: 'all .1s' }}>
            ⭐
          </button>
        ))}
      </div>
    </div>
  )
}

// Formulaire de note de séance (joueur) — une demande = un entraînement,
// un joueur ne peut répondre qu'une fois (UNIQUE(demande_id, joueur_id) +
// RLS scopée à son éducateur affilié, cf. supabase_seances_notes.sql).
export default function NoteSeanceForm({ demande, joueurId, onSubmit }) {
  const colors = useColors()
  const [charge, setCharge] = useState(0)
  const [plaisir, setPlaisir] = useState(0)
  const [mots, setMots] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')

  const pret = charge > 0 && plaisir > 0 && mots.trim().length > 0

  async function soumettre() {
    if (!charge || !plaisir) { setErreur('Donne une note sur les deux critères.'); return }
    if (!mots.trim()) { setErreur('Écris quelques mots pour résumer.'); return }
    setEnvoi(true)
    const { error } = await supabase.from('seances_notes_joueurs').insert({
      demande_id: demande.id,
      joueur_id: joueurId,
      charge_travail: charge,
      notion_plaisir: plaisir,
      mots_cles: mots.trim(),
    })
    if (error) { console.error('NoteSeanceForm insert error:', error); setErreur(error.message); setEnvoi(false); return }
    onSubmit()
  }

  return (
    <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '20px', marginBottom: '12px' }}>
      <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{demande.titre}</div>
      <div style={{ color: colors.text.disabled, fontSize: '12px', marginBottom: '18px' }}>
        {new Date(`${demande.date_seance}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </div>

      <StarPicker value={charge} onChange={setCharge} label="Charge de travail" colors={colors} />
      <StarPicker value={plaisir} onChange={setPlaisir} label="Notion de plaisir" colors={colors} />

      <div style={{ marginBottom: '16px' }}>
        <div style={{ color: colors.text.faint, fontSize: '12px', marginBottom: '8px' }}>En quelques mots, ce que tu as appris</div>
        <input
          value={mots}
          onChange={e => { setMots(e.target.value); setErreur('') }}
          placeholder="ex : pressing, transition, appel de balle"
          maxLength={60}
          style={{ width: '100%', background: colors.background.raised, border: `1px solid ${colors.border.strong}`, borderRadius: '8px', padding: '10px 14px', color: colors.text.primary, fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {erreur && <div style={{ color: colors.accent.red, fontSize: '12px', marginBottom: '10px' }}>{erreur}</div>}

      <button onClick={soumettre} disabled={envoi}
        style={{ width: '100%', background: pret ? colors.accent.green : colors.background.raised, border: 'none', color: pret ? colors.black : colors.text.disabled, padding: '12px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: pret ? 'pointer' : 'not-allowed', fontFamily: 'Inter, sans-serif' }}>
        {envoi ? 'Envoi…' : 'Envoyer ma note'}
      </button>
    </div>
  )
}

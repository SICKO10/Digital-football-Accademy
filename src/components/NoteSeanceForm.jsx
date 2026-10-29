import { useState } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'
import { zoneRpe } from '../lib/rpe'
import { IconStar } from './icones'

function StarPicker({ value, onChange, label, colors }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ color: colors.text.faint, fontSize: '12px', marginBottom: '8px' }}>{label}</div>
      <div style={{ display: 'flex', gap: '8px' }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => onChange(n)}
            aria-label={`${n} sur 5`}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fbbf24', display: 'flex', padding: 0, opacity: n <= value ? 1 : 0.25, transform: n <= value ? 'scale(1.1)' : 'scale(1)', transition: 'all .1s' }}>
            <IconStar size={24} filled={n <= value} />
          </button>
        ))}
      </div>
    </div>
  )
}

// Échelle RPE 0 → 10 (cf. lib/rpe) : un bouton par note, coloré selon sa
// zone, et la description de la zone choisie juste en dessous pour que le
// joueur sache ce que représente sa note.
function RpePicker({ value, onChange, colors }) {
  const zone = zoneRpe(value)
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ color: colors.text.primary, fontSize: '13px', fontWeight: 700, marginBottom: '2px' }}>RPE · effort perçu</div>
      <div style={{ color: colors.text.faint, fontSize: '11px', marginBottom: '10px', lineHeight: 1.4 }}>À quel point la séance t'a semblé difficile ? Fatigue musculaire, souffle et stress mental. Idéalement 30 minutes après la séance.</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, minmax(0, 1fr))', gap: '4px' }}>
        {Array.from({ length: 11 }, (_, n) => {
          const c = colors.accent[zoneRpe(n).couleur]
          const actif = value === n
          return (
            <button key={n} type="button" onClick={() => onChange(n)} aria-label={`RPE ${n}`} aria-pressed={actif}
              style={{ minWidth: 0, height: '36px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 800, fontFamily: 'Inter, sans-serif', fontVariantNumeric: 'tabular-nums',
                border: `1px solid ${actif ? c : c + '55'}`, background: actif ? c : c + '14', color: actif ? colors.black : c }}>
              {n}
            </button>
          )
        })}
      </div>
      <div style={{ marginTop: '8px', minHeight: '32px', fontSize: '12px', lineHeight: 1.4 }}>
        {zone ? (
          <span style={{ color: colors.accent[zone.couleur], fontWeight: 700 }}>
            {value} · {zone.label}{zone.exemple && <span style={{ color: colors.text.faint, fontWeight: 400 }}> ({zone.exemple})</span>}
          </span>
        ) : (
          <span style={{ color: colors.text.disabled }}>0 = repos · 10 = effort maximal</span>
        )}
      </div>
    </div>
  )
}

// Formulaire de note de séance (joueur) — une demande = un entraînement,
// un joueur ne peut répondre qu'une fois (UNIQUE(demande_id, joueur_id) +
// RLS scopée à son éducateur affilié, cf. supabase_seances_notes.sql).
export default function NoteSeanceForm({ demande, joueurId, onSubmit }) {
  const colors = useColors()
  const [rpe, setRpe] = useState(null)
  const [plaisir, setPlaisir] = useState(0)
  const [mots, setMots] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')

  const pret = rpe != null && plaisir > 0 && mots.trim().length > 0

  async function soumettre() {
    if (rpe == null || !plaisir) { setErreur('Donne ta note RPE et ta note de plaisir.'); return }
    if (!mots.trim()) { setErreur('Écris quelques mots pour résumer.'); return }
    setEnvoi(true)
    const { error } = await supabase.from('seances_notes_joueurs').insert({
      demande_id: demande.id,
      joueur_id: joueurId,
      rpe,
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

      <RpePicker value={rpe} onChange={v => { setRpe(v); setErreur('') }} colors={colors} />
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

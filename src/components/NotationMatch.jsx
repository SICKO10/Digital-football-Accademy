import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { colors, alpha } from '../tokens'

const CRITERES = [
  { key: 'technique', label: 'Technique' },
  { key: 'physique', label: 'Physique' },
  { key: 'mental', label: 'Mental' },
  { key: 'tactique', label: 'Tactique' },
]

const couleurNote = (n) => n >= 8 ? colors.accent.green : n >= 5 ? colors.accent.amber : colors.accent.red

function Etoiles({ note, onChange, readOnly = false }) {
  const [hover, setHover] = useState(null)
  const affichage = hover ?? note

  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
        const actif = n <= affichage
        const c = couleurNote(affichage)
        return (
          <div
            key={n}
            onClick={() => !readOnly && onChange(n)}
            onMouseEnter={() => !readOnly && setHover(n)}
            onMouseLeave={() => !readOnly && setHover(null)}
            style={{
              width: '28px', height: '28px',
              borderRadius: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 700,
              cursor: readOnly ? 'default' : 'pointer',
              background: actif ? c + alpha.soft : colors.background.raised,
              color: actif ? c : colors.text.disabled,
              transition: 'background 0.1s',
            }}
          >
            {n}
          </div>
        )
      })}
    </div>
  )
}

// joueur_id référence equipe_joueurs(id), pas auth.users(id) : la plupart des
// stats (stats_match, presences_entrainement) identifient déjà les joueurs par
// leur ligne d'effectif, car un joueur peut ne pas encore avoir de compte lié.
export default function NotationMatch({ match, joueurs, educateurId, onClose }) {
  const [notes, setNotes] = useState({})       // { joueur_id: { note, commentaire, criteres } }
  const [noteEquipe, setNoteEquipe] = useState({ id: null, note: null, commentaire: '' })
  const [onglet, setOnglet] = useState('joueurs')  // 'joueurs' | 'equipe'
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { chargerNotes() }, [match.id])

  const chargerNotes = async () => {
    const { data } = await supabase
      .from('notations_match')
      .select('*')
      .eq('match_id', match.id)
      .eq('educateur_id', educateurId)

    const notesMap = {}
    data?.forEach(n => {
      if (n.est_note_equipe) {
        setNoteEquipe({ id: n.id, note: n.note, commentaire: n.commentaire || '' })
      } else if (n.joueur_id) {
        notesMap[n.joueur_id] = {
          note: n.note,
          commentaire: n.commentaire || '',
          criteres: n.criteres || {}
        }
      }
    })
    setNotes(notesMap)
  }

  const updateNote = (joueurId, champ, valeur) => {
    setNotes(prev => ({
      ...prev,
      [joueurId]: {
        ...prev[joueurId],
        [champ]: valeur
      }
    }))
  }

  const updateCritere = (joueurId, critere, valeur) => {
    setNotes(prev => ({
      ...prev,
      [joueurId]: {
        ...prev[joueurId],
        criteres: {
          ...(prev[joueurId]?.criteres || {}),
          [critere]: valeur
        }
      }
    }))
  }

  const sauvegarder = async () => {
    setSaving(true)

    // Notes joueurs (upsert : match_id+joueur_id est unique et joueur_id est
    // toujours renseigné ici, donc ON CONFLICT fonctionne normalement)
    for (const joueur of joueurs) {
      const n = notes[joueur.id]
      if (!n?.note) continue
      await supabase.from('notations_match').upsert({
        match_id: match.id,
        educateur_id: educateurId,
        joueur_id: joueur.id,
        note: n.note,
        commentaire: n.commentaire || '',
        criteres: n.criteres || {},
        est_note_equipe: false,
      }, { onConflict: 'match_id,joueur_id' })
    }

    // Note équipe (joueur_id NULL) : upsert impossible ici, un index UNIQUE
    // sur (match_id, joueur_id) ne détecte pas les conflits entre lignes
    // NULL en SQL (NULL != NULL) — on cherche donc la ligne existante et on
    // met à jour ou insère explicitement pour éviter de dupliquer la note
    // d'équipe à chaque sauvegarde.
    if (noteEquipe.note) {
      if (noteEquipe.id) {
        await supabase.from('notations_match').update({
          note: noteEquipe.note,
          commentaire: noteEquipe.commentaire,
          updated_at: new Date().toISOString(),
        }).eq('id', noteEquipe.id)
      } else {
        const { data } = await supabase.from('notations_match').insert({
          match_id: match.id,
          educateur_id: educateurId,
          joueur_id: null,
          note: noteEquipe.note,
          commentaire: noteEquipe.commentaire,
          est_note_equipe: true,
        }).select('id').single()
        if (data) setNoteEquipe(prev => ({ ...prev, id: data.id }))
      }
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const nbNotees = joueurs.filter(j => notes[j.id]?.note).length

  return (
    <div style={{ background: colors.background.base, borderRadius: '16px', padding: '24px', maxWidth: '800px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h2 style={{ color: colors.text.primary, margin: 0, fontSize: '18px' }}>
            Notation — {match.adversaire}
          </h2>
          <div style={{ color: colors.text.muted, fontSize: '13px', marginTop: '4px' }}>
            {new Date(match.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            {match.domicile ? ' · Domicile' : ' · Extérieur'}
            {match.score_nous != null && match.score_eux != null ? ` · ${match.score_nous} - ${match.score_eux}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ color: colors.text.ghost, fontSize: '12px' }}>{nbNotees}/{joueurs.length} notés</span>
          <button
            onClick={sauvegarder}
            disabled={saving}
            style={{
              background: saved ? '#166534' : colors.accent.green,
              color: colors.black,
              border: 'none',
              borderRadius: '8px',
              padding: '8px 20px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '14px'
            }}
          >
            {saving ? 'Sauvegarde...' : saved ? 'Sauvegardé ✓' : 'Sauvegarder'}
          </button>
          {onClose && (
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: colors.text.muted, cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '4px' }}>×</button>
          )}
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button onClick={() => setOnglet('joueurs')} style={{
          padding: '8px 20px', borderRadius: '20px', border: 'none', cursor: 'pointer',
          background: onglet === 'joueurs' ? colors.accent.green : colors.background.raised,
          color: onglet === 'joueurs' ? colors.black : colors.text.dim,
          fontWeight: onglet === 'joueurs' ? 700 : 400, fontSize: '13px'
        }}>
          Joueurs ({joueurs.length})
        </button>
        <button onClick={() => setOnglet('equipe')} style={{
          padding: '8px 20px', borderRadius: '20px', border: 'none', cursor: 'pointer',
          background: onglet === 'equipe' ? colors.accent.green : colors.background.raised,
          color: onglet === 'equipe' ? colors.black : colors.text.dim,
          fontWeight: onglet === 'equipe' ? 700 : 400, fontSize: '13px'
        }}>
          Équipe
        </button>
      </div>

      {/* Onglet joueurs */}
      {onglet === 'joueurs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {joueurs.map(joueur => {
            const n = notes[joueur.id] || {}
            return (
              <div key={joueur.id} style={{
                background: colors.background.surface,
                border: n.note ? `1px solid ${couleurNote(n.note)}` : `1px solid ${colors.border.default}`,
                borderRadius: '12px',
                padding: '16px',
              }}>
                {/* Nom + poste */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: colors.accent.green + alpha.subtle, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: colors.accent.green
                    }}>
                      {(joueur.prenom?.[0] || '?').toUpperCase()}
                    </div>
                    <div>
                      <div style={{ color: colors.text.primary, fontWeight: 600 }}>
                        {joueur.prenom} {joueur.nom}
                      </div>
                      {joueur.poste && <div style={{ color: colors.text.muted, fontSize: '11px' }}>{joueur.poste}</div>}
                    </div>
                  </div>
                  {/* Note affichée */}
                  {n.note && (
                    <div style={{ fontSize: '22px', fontWeight: 700, color: couleurNote(n.note) }}>
                      {n.note}/10
                    </div>
                  )}
                </div>

                {/* Sélecteur de note */}
                <div style={{ marginBottom: '12px' }}>
                  <Etoiles
                    note={n.note || 0}
                    onChange={(val) => updateNote(joueur.id, 'note', val)}
                  />
                </div>

                {/* Critères détaillés (optionnels) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
                  {CRITERES.map(c => (
                    <div key={c.key}>
                      <div style={{ color: colors.text.dim, fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}>{c.label}</div>
                      <select
                        value={n.criteres?.[c.key] || ''}
                        onChange={e => updateCritere(joueur.id, c.key, Number(e.target.value) || null)}
                        style={{
                          width: '100%', background: colors.background.raised, color: colors.text.primary,
                          border: `1px solid ${colors.border.strong}`, borderRadius: '6px',
                          padding: '4px 6px', fontSize: '12px'
                        }}
                      >
                        <option value="">—</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {/* Commentaire */}
                <textarea
                  value={n.commentaire || ''}
                  onChange={e => updateNote(joueur.id, 'commentaire', e.target.value)}
                  placeholder={`Commentaire pour ${joueur.prenom}...`}
                  rows={2}
                  style={{
                    width: '100%', background: colors.background.base, color: colors.text.secondary,
                    border: `1px solid ${colors.border.faint}`, borderRadius: '8px',
                    padding: '8px 12px', fontSize: '13px',
                    resize: 'vertical', boxSizing: 'border-box'
                  }}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* Onglet équipe */}
      {onglet === 'equipe' && (
        <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ color: colors.text.primary, fontSize: '16px', marginBottom: '16px' }}>Note collective</h3>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ color: colors.text.muted, fontSize: '13px', marginBottom: '10px' }}>Note de la prestation collective</div>
            <Etoiles
              note={noteEquipe.note || 0}
              onChange={(val) => setNoteEquipe(prev => ({ ...prev, note: val }))}
            />
            {noteEquipe.note && (
              <div style={{ marginTop: '10px', fontSize: '28px', fontWeight: 700, color: couleurNote(noteEquipe.note) }}>
                {noteEquipe.note}/10
              </div>
            )}
          </div>

          <div>
            <div style={{ color: colors.text.muted, fontSize: '13px', marginBottom: '8px' }}>Commentaire général sur le match</div>
            <textarea
              value={noteEquipe.commentaire}
              onChange={e => setNoteEquipe(prev => ({ ...prev, commentaire: e.target.value }))}
              placeholder="Points positifs, axes d'amélioration, message pour le groupe..."
              rows={6}
              style={{
                width: '100%', background: colors.background.base, color: colors.text.secondary,
                border: `1px solid ${colors.border.strong}`, borderRadius: '10px',
                padding: '12px 14px', fontSize: '14px',
                lineHeight: '1.6', resize: 'vertical', boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

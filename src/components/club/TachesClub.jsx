import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { alpha } from '../../tokens'

const STATUTS = [
  { val: 'a_faire', label: 'À faire', color: 'orange' },
  { val: 'en_cours', label: 'En cours', color: 'blue' },
  { val: 'terminee', label: 'Terminée', color: 'green' },
]

const emptyResponsabilite = { domaine: '', emoji: '📋', tache: '', responsable_id: '' }
const emptyTache = { titre: '', emoji: '✅', responsable_id: '', echeance: '' }

// Onglet "Tâches & Responsabilités" — responsabilites_club (qui fait quoi, en
// continu) et taches_club (tâches ponctuelles avec statut), toutes deux
// scopées par club_id (cf. supabase_taches_responsabilites_club.sql). Les
// responsables sont choisis parmi educateursAffilies (déjà chargé par
// DashboardClub, mêmes données que club_educateurs — pas de requête propre ici).
export default function TachesClub({ clubId, educateursAffilies, couleurPrincipale, readOnly }) {
  const colors = useColors()
  const accent = couleurPrincipale || colors.accent.green
  const [onglet, setOnglet] = useState('responsabilites')
  const [responsabilites, setResponsabilites] = useState([])
  const [taches, setTaches] = useState([])
  const [loading, setLoading] = useState(true)
  const [formResp, setFormResp] = useState(emptyResponsabilite)
  const [formTache, setFormTache] = useState(emptyTache)
  const [ajoutResp, setAjoutResp] = useState(false)
  const [ajoutTache, setAjoutTache] = useState(false)

  const educateursAcceptes = (educateursAffilies || []).filter(e => e.statut === 'accepte')

  useEffect(() => { charger() }, [clubId])

  const charger = async () => {
    if (!clubId) return
    setLoading(true)
    const [{ data: r }, { data: t }] = await Promise.all([
      supabase.from('responsabilites_club').select('*').eq('club_id', clubId).order('created_at', { ascending: false }),
      supabase.from('taches_club').select('*').eq('club_id', clubId).order('echeance', { ascending: true, nullsFirst: false }),
    ])
    setResponsabilites(r || [])
    setTaches(t || [])
    setLoading(false)
  }

  const nomResponsable = (id) => {
    const e = educateursAcceptes.find(e => e.educateur_id === id)
    return e ? `${e.educateur?.prenom || ''} ${e.educateur?.nom || ''}`.trim() : ''
  }

  const ajouterResponsabilite = async () => {
    if (!formResp.tache.trim()) return
    const { data, error } = await supabase.from('responsabilites_club').insert({
      club_id: clubId,
      domaine: formResp.domaine.trim() || null,
      emoji: formResp.emoji || '📋',
      tache: formResp.tache.trim(),
      responsable_id: formResp.responsable_id || null,
      responsable_nom: formResp.responsable_id ? nomResponsable(formResp.responsable_id) : null,
    }).select().single()
    if (error) return
    setResponsabilites(prev => [data, ...prev])
    setFormResp(emptyResponsabilite)
    setAjoutResp(false)
  }

  const supprimerResponsabilite = async (id) => {
    if (!confirm('Supprimer cette responsabilité ?')) return
    await supabase.from('responsabilites_club').delete().eq('id', id)
    setResponsabilites(prev => prev.filter(r => r.id !== id))
  }

  const ajouterTache = async () => {
    if (!formTache.titre.trim()) return
    const { data, error } = await supabase.from('taches_club').insert({
      club_id: clubId,
      titre: formTache.titre.trim(),
      emoji: formTache.emoji || '✅',
      responsable_id: formTache.responsable_id || null,
      responsable_nom: formTache.responsable_id ? nomResponsable(formTache.responsable_id) : null,
      echeance: formTache.echeance || null,
    }).select().single()
    if (error) return
    setTaches(prev => [...prev, data].sort((a, b) => (a.echeance || '9999') < (b.echeance || '9999') ? -1 : 1))
    setFormTache(emptyTache)
    setAjoutTache(false)
  }

  const changerStatut = async (id, statut) => {
    setTaches(prev => prev.map(t => t.id === id ? { ...t, statut } : t))
    await supabase.from('taches_club').update({ statut }).eq('id', id)
  }

  const supprimerTache = async (id) => {
    if (!confirm('Supprimer cette tâche ?')) return
    await supabase.from('taches_club').delete().eq('id', id)
    setTaches(prev => prev.filter(t => t.id !== id))
  }

  const statutInfo = (val) => STATUTS.find(s => s.val === val) || STATUTS[0]

  return (
    <div style={{ maxWidth: '1100px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ color: accent, fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '6px' }}>Organisation</div>
        <h1 style={{ color: colors.text.primary, fontSize: '22px', fontWeight: 900, margin: 0 }}>Tâches & Responsabilités</h1>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {[{ val: 'responsabilites', label: 'Responsabilités récurrentes' }, { val: 'taches', label: 'Tâches ponctuelles' }].map(o => (
          <button key={o.val} onClick={() => setOnglet(o.val)}
            style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              background: onglet === o.val ? accent + alpha.subtle : 'transparent',
              borderColor: onglet === o.val ? accent : colors.border.strong,
              color: onglet === o.val ? accent : colors.text.faint }}>
            {o.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: colors.text.faint, fontSize: '13px' }}>Chargement...</p>
      ) : onglet === 'responsabilites' ? (
        <div>
          {!readOnly && (
            <div style={{ marginBottom: '20px' }}>
              {!ajoutResp ? (
                <button onClick={() => setAjoutResp(true)}
                  style={{ background: accent + alpha.subtle, color: accent, border: `1px solid ${accent}`, borderRadius: '8px', padding: '10px 16px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                  + Ajouter une responsabilité
                </button>
              ) : (
                <div style={{ background: colors.background.sunken, border: `1px solid ${colors.border.default}`, borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input value={formResp.domaine} onChange={e => setFormResp(f => ({ ...f, domaine: e.target.value }))}
                    placeholder="Domaine (ex : Communication, Terrains, Buvette...)"
                    style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '10px 12px', color: colors.text.primary, fontSize: '13px' }} />
                  <input value={formResp.tache} onChange={e => setFormResp(f => ({ ...f, tache: e.target.value }))}
                    placeholder="Responsabilité (ex : Gérer les réservations de terrain)"
                    style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '10px 12px', color: colors.text.primary, fontSize: '13px' }} />
                  <select value={formResp.responsable_id} onChange={e => setFormResp(f => ({ ...f, responsable_id: e.target.value }))}
                    style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '10px 12px', color: colors.text.primary, fontSize: '13px' }}>
                    <option value="">Responsable (optionnel)</option>
                    {educateursAcceptes.map(e => <option key={e.educateur_id} value={e.educateur_id}>{e.educateur?.prenom} {e.educateur?.nom}</option>)}
                  </select>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => { setAjoutResp(false); setFormResp(emptyResponsabilite) }}
                      style={{ background: 'transparent', border: 'none', color: colors.text.faint, fontSize: '13px', fontWeight: 700, cursor: 'pointer', padding: '10px 16px' }}>
                      Annuler
                    </button>
                    <button onClick={ajouterResponsabilite} disabled={!formResp.tache.trim()}
                      style={{ background: accent, color: colors.background.base, border: 'none', borderRadius: '8px', padding: '10px 18px', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}>
                      Ajouter
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {responsabilites.map(r => (
              <div key={r.id} style={{ background: colors.background.sunken, border: `1px solid ${colors.border.faint}`, borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ fontSize: '20px' }}>{r.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {r.domaine && <div style={{ color: colors.text.faint, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{r.domaine}</div>}
                  <div style={{ color: colors.text.primary, fontSize: '14px', fontWeight: 600 }}>{r.tache}</div>
                </div>
                <div style={{ color: r.responsable_nom ? accent : colors.text.disabled, fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
                  {r.responsable_nom || 'Non assigné'}
                </div>
                {!readOnly && (
                  <button onClick={() => supprimerResponsabilite(r.id)}
                    style={{ background: 'transparent', border: 'none', color: colors.text.disabled, cursor: 'pointer', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                    Supprimer
                  </button>
                )}
              </div>
            ))}
            {responsabilites.length === 0 && (
              <div style={{ color: colors.text.ghost, fontSize: '13px', textAlign: 'center', padding: '40px' }}>Aucune responsabilité définie</div>
            )}
          </div>
        </div>
      ) : (
        <div>
          {!readOnly && (
            <div style={{ marginBottom: '20px' }}>
              {!ajoutTache ? (
                <button onClick={() => setAjoutTache(true)}
                  style={{ background: accent + alpha.subtle, color: accent, border: `1px solid ${accent}`, borderRadius: '8px', padding: '10px 16px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                  + Ajouter une tâche
                </button>
              ) : (
                <div style={{ background: colors.background.sunken, border: `1px solid ${colors.border.default}`, borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input value={formTache.titre} onChange={e => setFormTache(f => ({ ...f, titre: e.target.value }))}
                    placeholder="Titre de la tâche"
                    style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '10px 12px', color: colors.text.primary, fontSize: '13px' }} />
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <select value={formTache.responsable_id} onChange={e => setFormTache(f => ({ ...f, responsable_id: e.target.value }))}
                      style={{ flex: '1 1 200px', background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '10px 12px', color: colors.text.primary, fontSize: '13px' }}>
                      <option value="">Responsable (optionnel)</option>
                      {educateursAcceptes.map(e => <option key={e.educateur_id} value={e.educateur_id}>{e.educateur?.prenom} {e.educateur?.nom}</option>)}
                    </select>
                    <input type="date" value={formTache.echeance} onChange={e => setFormTache(f => ({ ...f, echeance: e.target.value }))}
                      style={{ flex: '0 0 160px', background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '10px 12px', color: colors.text.primary, fontSize: '13px' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => { setAjoutTache(false); setFormTache(emptyTache) }}
                      style={{ background: 'transparent', border: 'none', color: colors.text.faint, fontSize: '13px', fontWeight: 700, cursor: 'pointer', padding: '10px 16px' }}>
                      Annuler
                    </button>
                    <button onClick={ajouterTache} disabled={!formTache.titre.trim()}
                      style={{ background: accent, color: colors.background.base, border: 'none', borderRadius: '8px', padding: '10px 18px', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}>
                      Ajouter
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {taches.map(t => {
              const si = statutInfo(t.statut)
              return (
                <div key={t.id} style={{ background: colors.background.sunken, border: `1px solid ${colors.border.faint}`, borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontSize: '20px' }}>{t.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: colors.text.primary, fontSize: '14px', fontWeight: 600 }}>{t.titre}</div>
                    <div style={{ color: colors.text.faint, fontSize: '11px', marginTop: '2px' }}>
                      {t.responsable_nom || 'Non assigné'}
                      {t.echeance && ` · échéance ${new Date(t.echeance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                    </div>
                  </div>
                  <select value={t.statut} disabled={readOnly} onChange={e => changerStatut(t.id, e.target.value)}
                    style={{ background: colors.accent[si.color] + alpha.subtle, color: colors.accent[si.color], border: `1px solid ${colors.accent[si.color]}`, borderRadius: '8px', padding: '6px 10px', fontSize: '12px', fontWeight: 700, cursor: readOnly ? 'default' : 'pointer', flexShrink: 0 }}>
                    {STATUTS.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
                  </select>
                  {!readOnly && (
                    <button onClick={() => supprimerTache(t.id)}
                      style={{ background: 'transparent', border: 'none', color: colors.text.disabled, cursor: 'pointer', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                      Supprimer
                    </button>
                  )}
                </div>
              )
            })}
            {taches.length === 0 && (
              <div style={{ color: colors.text.ghost, fontSize: '13px', textAlign: 'center', padding: '40px' }}>Aucune tâche en cours</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

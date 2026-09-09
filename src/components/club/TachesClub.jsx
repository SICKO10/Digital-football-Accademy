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

const GUIDE = [
  { icon: '🔁', title: 'Responsabilités récurrentes', desc: 'Pour les tâches permanentes : gestion des licences, communication, matériel...' },
  { icon: '📌', title: 'Tâches ponctuelles', desc: 'Pour les actions à date butoir : préparer un tournoi, envoyer un document...' },
  { icon: '👤', title: 'Assignation', desc: 'Chaque tâche peut être assignée à un membre du staff avec une échéance.' },
]

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

  const ouvrirAjout = () => {
    if (onglet === 'responsabilites') setAjoutResp(true)
    else setAjoutTache(true)
  }

  const items = onglet === 'responsabilites' ? responsabilites : taches
  const enCours = taches.filter(t => t.statut === 'en_cours').length
  const terminees = taches.filter(t => t.statut === 'terminee').length

  const STATS = [
    { label: 'Responsabilités', value: responsabilites.length, icon: '🔁', color: colors.accent.blue },
    { label: 'Tâches ponctuelles', value: taches.length, icon: '📌', color: colors.accent.purpleLight || colors.accent.purple },
    { label: 'En cours', value: enCours, icon: '⏳', color: colors.accent.orange },
    { label: 'Terminées', value: terminees, icon: '✅', color: colors.accent.green },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '1100px' }}>

      {/* ── BARRE D'ACTIONS ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '6px', background: colors.background.sunken, borderRadius: '12px', padding: '4px' }}>
          {[{ val: 'responsabilites', label: '🔁 Responsabilités récurrentes' }, { val: 'taches', label: '📌 Tâches ponctuelles' }].map(o => (
            <button key={o.val} onClick={() => setOnglet(o.val)}
              style={{ padding: '9px 20px', borderRadius: '9px', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                background: onglet === o.val ? accent : 'transparent',
                color: onglet === o.val ? colors.background.base : colors.text.faint }}>
              {o.label}
            </button>
          ))}
        </div>
        {!readOnly && (
          <button onClick={ouvrirAjout}
            style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: accent, color: colors.background.base, fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
            + Ajouter
          </button>
        )}
      </div>

      {/* ── STATS RAPIDES ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        {STATS.map(s => (
          <div key={s.label} style={{ background: colors.background.sunken, border: `1px solid ${colors.border.faint}`, borderRadius: '14px', padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '18px' }}>{s.icon}</span>
              <span style={{ color: colors.text.faint, fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{s.label}</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── CONTENU — 2 colonnes ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', alignItems: 'start' }}>

        {/* Colonne gauche — liste */}
        <div style={{ background: colors.background.sunken, border: `1px solid ${colors.border.faint}`, borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border.faint}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: colors.text.primary, fontWeight: 700, fontSize: '14px' }}>
              {onglet === 'responsabilites' ? '🔁 Responsabilités récurrentes' : '📌 Tâches ponctuelles'}
            </span>
            <span style={{ color: colors.text.disabled, fontSize: '12px' }}>{items.length} entrée{items.length > 1 ? 's' : ''}</span>
          </div>

          {(ajoutResp && onglet === 'responsabilites') && (
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border.faint}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
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

          {(ajoutTache && onglet === 'taches') && (
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border.faint}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input value={formTache.titre} onChange={e => setFormTache(f => ({ ...f, titre: e.target.value }))}
                placeholder="Titre de la tâche"
                style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '10px 12px', color: colors.text.primary, fontSize: '13px' }} />
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <select value={formTache.responsable_id} onChange={e => setFormTache(f => ({ ...f, responsable_id: e.target.value }))}
                  style={{ flex: '1 1 180px', background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '10px 12px', color: colors.text.primary, fontSize: '13px' }}>
                  <option value="">Responsable (optionnel)</option>
                  {educateursAcceptes.map(e => <option key={e.educateur_id} value={e.educateur_id}>{e.educateur?.prenom} {e.educateur?.nom}</option>)}
                </select>
                <input type="date" value={formTache.echeance} onChange={e => setFormTache(f => ({ ...f, echeance: e.target.value }))}
                  style={{ flex: '0 0 150px', background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '10px 12px', color: colors.text.primary, fontSize: '13px' }} />
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

          {loading ? (
            <p style={{ color: colors.text.faint, fontSize: '13px', padding: '20px' }}>Chargement...</p>
          ) : items.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>{onglet === 'responsabilites' ? '🔁' : '📌'}</div>
              <p style={{ color: colors.text.disabled, fontWeight: 600, fontSize: '14px', margin: '0 0 4px' }}>
                Aucune {onglet === 'responsabilites' ? 'responsabilité' : 'tâche'} définie
              </p>
              <p style={{ color: colors.text.ghost, fontSize: '12px', margin: '0 0 16px' }}>
                {onglet === 'responsabilites'
                  ? 'Assignez des responsabilités permanentes à vos membres.'
                  : 'Ajoutez des tâches ponctuelles avec une échéance.'}
              </p>
              {!readOnly && (
                <button onClick={ouvrirAjout} style={{ padding: '9px 18px', borderRadius: '10px', border: `1px solid ${accent}40`, background: accent + alpha.subtle, color: accent, fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                  + Ajouter
                </button>
              )}
            </div>
          ) : onglet === 'responsabilites' ? (
            responsabilites.map(r => (
              <div key={r.id} style={{ padding: '14px 20px', borderBottom: `1px solid ${colors.border.faint}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.responsable_nom ? accent : colors.border.strong, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {r.domaine && <div style={{ color: colors.text.faint, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{r.domaine}</div>}
                  <div style={{ color: colors.text.primary, fontWeight: 600, fontSize: '13px' }}>{r.emoji} {r.tache}</div>
                  {r.responsable_nom && <div style={{ color: colors.text.faint, fontSize: '11px', marginTop: '2px' }}>👤 {r.responsable_nom}</div>}
                </div>
                {!readOnly && (
                  <button onClick={() => supprimerResponsabilite(r.id)}
                    style={{ background: 'transparent', border: 'none', color: colors.text.disabled, cursor: 'pointer', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                    Supprimer
                  </button>
                )}
              </div>
            ))
          ) : (
            taches.map(t => {
              const si = statutInfo(t.statut)
              return (
                <div key={t.id} style={{ padding: '14px 20px', borderBottom: `1px solid ${colors.border.faint}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors.accent[si.color], flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: colors.text.primary, fontWeight: 600, fontSize: '13px' }}>{t.emoji} {t.titre}</div>
                    <div style={{ color: colors.text.faint, fontSize: '11px', marginTop: '2px' }}>
                      {t.responsable_nom && `👤 ${t.responsable_nom}`}
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
            })
          )}
        </div>

        {/* Colonne droite — guide / conseil */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: colors.background.sunken, border: `1px solid ${colors.border.faint}`, borderRadius: '16px', padding: '20px' }}>
            <p style={{ color: colors.text.faint, fontSize: '11px', fontWeight: 700, letterSpacing: '1px', margin: '0 0 16px', textTransform: 'uppercase' }}>Guide d'utilisation</p>
            {GUIDE.map((g, i) => (
              <div key={g.title} style={{ display: 'flex', gap: '12px', marginBottom: i < GUIDE.length - 1 ? '16px' : 0 }}>
                <span style={{ fontSize: '20px', flexShrink: 0 }}>{g.icon}</span>
                <div>
                  <div style={{ color: colors.text.secondary, fontWeight: 600, fontSize: '13px', marginBottom: '3px' }}>{g.title}</div>
                  <div style={{ color: colors.text.faint, fontSize: '12px', lineHeight: 1.5 }}>{g.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: accent + alpha.faint, border: `1px solid ${accent}20`, borderRadius: '16px', padding: '20px' }}>
            <p style={{ color: accent, fontWeight: 700, fontSize: '13px', margin: '0 0 8px' }}>💡 Astuce</p>
            <p style={{ color: colors.text.faint, fontSize: '12px', lineHeight: 1.6, margin: 0 }}>
              Assignez les responsabilités dès le début de saison pour éviter les oublis et garder une vision claire de qui fait quoi dans le club.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

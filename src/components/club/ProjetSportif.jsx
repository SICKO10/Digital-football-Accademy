import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { alpha } from '../../tokens'
import { labelCategorie } from '../../lib/categories'
import { POLES, polesMasculins, polesFeminins } from '../../constants/poles'

const ONGLETS = [
  { key: 'categories', label: 'Catégories & Stats' },
  { key: 'principes', label: 'Principes de jeu' },
  { key: 'planification', label: 'Planification annuelle' },
  { key: 'regles', label: 'Règles du jeu' },
]

const PHASES = [
  { val: 'attaque', label: 'Organisation offensive' },
  { val: 'defense', label: 'Organisation défensive' },
  { val: 'transition_att', label: 'Transition offensive' },
  { val: 'transition_def', label: 'Transition défensive' },
  { val: 'coups_pied_arretes', label: 'Coups de pied arrêtés' },
]

const TYPE_PERIODE = {
  preparation: { label: 'Préparation', couleur: '#f59e0b' },
  competition: { label: 'Compétition', couleur: '#4ade80' },
  treve: { label: 'Trêve', couleur: '#3b82f6' },
  reprise: { label: 'Reprise', couleur: '#a78bfa' },
}

// Saison française (juillet → juin) : en juillet/août on est déjà sur la
// saison qui commence, sinon sur celle en cours depuis l'automne précédent.
const saisonActuelle = () => {
  const d = new Date()
  const y = d.getFullYear()
  return d.getMonth() >= 6 ? `${y}-${y + 1}` : `${y - 1}-${y}`
}

const dateFr = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

function PlaceholderAVenir({ couleur, texte }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', border: '1px dashed', borderColor: couleur + '44', borderRadius: 14 }}>
      <p style={{ color: couleur, fontWeight: 700, fontSize: 14, margin: '0 0 6px' }}>Bientôt disponible</p>
      <p style={{ color: 'inherit', opacity: 0.6, fontSize: 13, margin: 0 }}>{texte}</p>
    </div>
  )
}

function SectionPrincipes({ pole, clubId, readOnly }) {
  const colors = useColors()
  const [principes, setPrincipes] = useState([])
  const [ajoutPhase, setAjoutPhase] = useState(null)
  const [texte, setTexte] = useState('')

  const charger = async () => {
    const { data } = await supabase.from('principes_jeu').select('*').eq('club_id', clubId).eq('pole_key', pole.key).order('ordre')
    setPrincipes(data || [])
  }
  useEffect(() => { charger() }, [pole.key, clubId])

  const ajouter = async () => {
    if (!texte.trim()) return
    const ordre = principes.filter(p => p.phase === ajoutPhase).length
    await supabase.from('principes_jeu').insert({ club_id: clubId, pole_key: pole.key, phase: ajoutPhase, principe: texte.trim(), ordre })
    setTexte('')
    setAjoutPhase(null)
    charger()
  }

  const supprimer = async (id) => {
    await supabase.from('principes_jeu').delete().eq('id', id)
    setPrincipes(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {PHASES.map(phase => {
        const principesPhase = principes.filter(p => p.phase === phase.val)
        return (
          <div key={phase.val} style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 12, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ color: colors.text.primary, margin: 0, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{phase.label}</h3>
              {!readOnly && ajoutPhase !== phase.val && (
                <button onClick={() => setAjoutPhase(phase.val)} style={{ background: pole.couleur + '22', color: pole.couleur, border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  + Ajouter
                </button>
              )}
            </div>

            {principesPhase.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${colors.border.subtle}` }}>
                <span style={{ color: pole.couleur, fontWeight: 800, fontSize: 12, minWidth: 18 }}>{i + 1}</span>
                <span style={{ flex: 1, color: colors.text.secondary, fontSize: 13 }}>{p.principe}</span>
                {!readOnly && (
                  <button onClick={() => supprimer(p.id)} style={{ background: 'none', border: 'none', color: colors.text.faint, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>Suppr.</button>
                )}
              </div>
            ))}

            {principesPhase.length === 0 && ajoutPhase !== phase.val && (
              <p style={{ color: colors.text.faint, fontSize: 12, fontStyle: 'italic', margin: 0 }}>Aucun principe défini</p>
            )}

            {ajoutPhase === phase.val && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <input
                  autoFocus
                  value={texte}
                  onChange={e => setTexte(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && ajouter()}
                  placeholder="Ex: Sortie de balle courte depuis le gardien"
                  style={{ flex: 1, background: colors.background.base, border: `1px solid ${pole.couleur}44`, borderRadius: 8, padding: '8px 12px', color: colors.text.primary, fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none' }}
                />
                <button onClick={ajouter} style={{ background: pole.couleur, color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>OK</button>
                <button onClick={() => { setAjoutPhase(null); setTexte('') }} style={{ background: colors.background.raised, color: colors.text.faint, border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 13 }}>Annuler</button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const PERIODE_VIDE = (saison) => ({ periode_nom: '', date_debut: '', date_fin: '', type: 'competition', objectif_technique: '', objectif_physique: '', objectif_mental: '', objectif_tactique: '', saison })

function SectionPlanification({ pole, clubId, readOnly }) {
  const colors = useColors()
  const [periodes, setPeriodes] = useState([])
  const [periodeActive, setPeriodeActive] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(PERIODE_VIDE(saisonActuelle()))

  const charger = async () => {
    const { data } = await supabase.from('planification_annuelle').select('*').eq('club_id', clubId).eq('pole_key', pole.key).order('date_debut')
    setPeriodes(data || [])
  }
  useEffect(() => { charger() }, [pole.key, clubId])

  const ouvrirNouvelle = () => { setPeriodeActive(null); setForm(PERIODE_VIDE(saisonActuelle())); setShowForm(true) }
  const ouvrirEdition = (p) => { setPeriodeActive(p); setForm(p); setShowForm(true) }

  const sauvegarder = async () => {
    if (periodeActive) {
      await supabase.from('planification_annuelle').update(form).eq('id', periodeActive.id)
    } else {
      await supabase.from('planification_annuelle').insert({ ...form, club_id: clubId, pole_key: pole.key })
    }
    setShowForm(false)
    setPeriodeActive(null)
    charger()
  }

  const supprimer = async (id) => {
    await supabase.from('planification_annuelle').delete().eq('id', id)
    setShowForm(false)
    setPeriodeActive(null)
    charger()
  }

  const objectifs = (p) => [
    { label: 'Technique', val: p.objectif_technique, couleur: '#3b82f6' },
    { label: 'Physique', val: p.objectif_physique, couleur: '#f97316' },
    { label: 'Mental', val: p.objectif_mental, couleur: '#a78bfa' },
    { label: 'Tactique', val: p.objectif_tactique, couleur: '#4ade80' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <span style={{ color: colors.text.faint, fontSize: 13 }}>Saison {saisonActuelle()}</span>
        {!readOnly && (
          <button onClick={ouvrirNouvelle} style={{ background: pole.couleur, color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
            + Ajouter une période
          </button>
        )}
      </div>

      {periodes.length === 0 ? (
        <PlaceholderAVenir couleur={pole.couleur} texte="Aucune période planifiée pour ce pôle." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {periodes.map(p => {
            const cfg = TYPE_PERIODE[p.type]
            return (
              <div key={p.id} style={{ background: colors.background.surface, border: `1px solid ${cfg.couleur}33`, borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ background: cfg.couleur + '22', color: cfg.couleur, borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 800 }}>{cfg.label}</span>
                    <span style={{ color: colors.text.primary, fontWeight: 700 }}>{p.periode_nom}</span>
                    <span style={{ color: colors.text.faint, fontSize: 11 }}>{dateFr(p.date_debut)} → {dateFr(p.date_fin)}</span>
                  </div>
                  {!readOnly && (
                    <button onClick={() => ouvrirEdition(p)} style={{ background: 'transparent', border: `1px solid ${colors.border.default}`, borderRadius: 6, padding: '4px 10px', color: colors.text.faint, fontSize: 11, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                      Modifier
                    </button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
                  {objectifs(p).map((obj, i) => (
                    <div key={i} style={{ background: colors.background.base, borderRadius: 8, padding: 10 }}>
                      <div style={{ color: obj.couleur, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{obj.label}</div>
                      <div style={{ color: obj.val ? colors.text.secondary : colors.text.faint, fontSize: 11, lineHeight: 1.4, fontStyle: obj.val ? 'normal' : 'italic' }}>
                        {obj.val || 'Non défini'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <div onClick={() => setShowForm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: colors.background.sunken, border: `1px solid ${colors.border.default}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ color: colors.text.primary, margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>
              {periodeActive ? 'Modifier la période' : 'Nouvelle période'}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <input value={form.periode_nom} onChange={e => setForm(f => ({ ...f, periode_nom: e.target.value }))}
                placeholder="Nom (ex: Préparation estivale)"
                style={{ gridColumn: '1 / -1', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '10px 12px', color: colors.text.primary, fontSize: 13, fontFamily: 'Inter, sans-serif' }} />
              <input type="date" value={form.date_debut} onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))}
                style={{ background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '10px 12px', color: colors.text.primary, fontSize: 13, fontFamily: 'Inter, sans-serif' }} />
              <input type="date" value={form.date_fin} onChange={e => setForm(f => ({ ...f, date_fin: e.target.value }))}
                style={{ background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '10px 12px', color: colors.text.primary, fontSize: 13, fontFamily: 'Inter, sans-serif' }} />
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {Object.entries(TYPE_PERIODE).map(([val, cfg]) => (
                <button key={val} onClick={() => setForm(f => ({ ...f, type: val }))}
                  style={{
                    flex: '1 1 100px', padding: 7, borderRadius: 8, border: '1px solid', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    background: form.type === val ? cfg.couleur + '22' : 'transparent',
                    borderColor: form.type === val ? cfg.couleur : colors.border.default,
                    color: form.type === val ? cfg.couleur : colors.text.faint,
                  }}>
                  {cfg.label}
                </button>
              ))}
            </div>

            {[
              { key: 'objectif_technique', label: 'Objectif Technique' },
              { key: 'objectif_physique', label: 'Objectif Physique' },
              { key: 'objectif_mental', label: 'Objectif Mental' },
              { key: 'objectif_tactique', label: 'Objectif Tactique' },
            ].map(obj => (
              <div key={obj.key} style={{ marginBottom: 10 }}>
                <div style={{ color: colors.text.faint, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{obj.label}</div>
                <textarea value={form[obj.key] || ''} onChange={e => setForm(f => ({ ...f, [obj.key]: e.target.value }))}
                  placeholder="Décrire l'objectif..." rows={2}
                  style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '8px 12px', color: colors.text.primary, fontSize: 12, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
              </div>
            ))}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', marginTop: 16 }}>
              {periodeActive ? (
                <button onClick={() => supprimer(periodeActive.id)} style={{ background: 'transparent', color: colors.accent.red, border: `1px solid ${colors.accent.red}44`, borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontWeight: 700 }}>
                  Supprimer
                </button>
              ) : <span />}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowForm(false)} style={{ background: 'transparent', color: colors.text.faint, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontWeight: 700 }}>
                  Annuler
                </button>
                <button onClick={sauvegarder} disabled={!form.periode_nom || !form.date_debut || !form.date_fin}
                  style={{ background: pole.couleur, color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 800, cursor: 'pointer', opacity: (!form.periode_nom || !form.date_debut || !form.date_fin) ? 0.5 : 1 }}>
                  Sauvegarder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SectionRegles({ pole, clubId, readOnly }) {
  const colors = useColors()
  const [regles, setRegles] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ categorie: pole.categories[0], titre: '', lien_externe: '', saison: saisonActuelle() })

  const charger = async () => {
    const { data } = await supabase.from('regles_jeu').select('*').eq('club_id', clubId).eq('pole_key', pole.key).order('categorie')
    setRegles(data || [])
  }
  useEffect(() => { charger() }, [pole.key, clubId])

  const ajouter = async () => {
    if (!form.titre.trim()) return
    await supabase.from('regles_jeu').insert({ ...form, club_id: clubId, pole_key: pole.key })
    setForm({ categorie: pole.categories[0], titre: '', lien_externe: '', saison: saisonActuelle() })
    setShowForm(false)
    charger()
  }

  const supprimer = async (id) => {
    await supabase.from('regles_jeu').delete().eq('id', id)
    setRegles(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <p style={{ color: colors.text.faint, fontSize: 13, margin: 0 }}>Documents officiels par catégorie — FFF, Ligue régionale</p>
        {!readOnly && (
          <button onClick={() => setShowForm(true)} style={{ background: pole.couleur, color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
            + Ajouter
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {pole.categories.map(cat => {
          const reglesCat = regles.filter(r => r.categorie === cat)
          return (
            <div key={cat}>
              <div style={{ color: pole.couleur, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{cat}</div>
              {reglesCat.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {reglesCat.map(r => (
                    <div key={r.id} style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{r.titre}</div>
                        {r.saison && <div style={{ color: colors.text.faint, fontSize: 11 }}>Saison {r.saison}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {r.lien_externe && (
                          <a href={r.lien_externe} target="_blank" rel="noreferrer"
                            style={{ background: pole.couleur + '22', color: pole.couleur, borderRadius: 6, padding: '5px 12px', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
                            Ouvrir
                          </a>
                        )}
                        {!readOnly && (
                          <button onClick={() => supprimer(r.id)} style={{ background: 'none', border: 'none', color: colors.text.faint, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>Suppr.</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: colors.text.faint, fontSize: 12, fontStyle: 'italic', padding: '8px 0', margin: 0 }}>Aucun document</p>
              )}
            </div>
          )
        })}
      </div>

      {showForm && (
        <div onClick={() => setShowForm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: colors.background.sunken, border: `1px solid ${colors.border.default}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 480 }}>
            <h3 style={{ color: colors.text.primary, margin: '0 0 20px', fontSize: 15, fontWeight: 700 }}>Ajouter un document</h3>
            <select value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}
              style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '10px 12px', color: colors.text.primary, fontSize: 13, marginBottom: 10, fontFamily: 'Inter, sans-serif' }}>
              {pole.categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
              placeholder="Titre (ex: Règlements FFF U13)"
              style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '10px 12px', color: colors.text.primary, fontSize: 13, marginBottom: 10, boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
            <input value={form.lien_externe} onChange={e => setForm(f => ({ ...f, lien_externe: e.target.value }))}
              placeholder="Lien URL (FFF, Ligue...)"
              style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '10px 12px', color: colors.text.primary, fontSize: 13, marginBottom: 10, boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
            <input value={form.saison} onChange={e => setForm(f => ({ ...f, saison: e.target.value }))}
              placeholder="Saison (ex: 2026-2027)"
              style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '10px 12px', color: colors.text.primary, fontSize: 13, marginBottom: 16, boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} style={{ background: 'transparent', color: colors.text.faint, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontWeight: 700 }}>
                Annuler
              </button>
              <button onClick={ajouter} disabled={!form.titre.trim()} style={{ background: pole.couleur, color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 800, cursor: 'pointer', opacity: !form.titre.trim() ? 0.5 : 1 }}>
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailPole({ pole, categories, clubId, readOnly, onRetour }) {
  const colors = useColors()
  const [onglet, setOnglet] = useState('categories')
  const equipesDuPole = categories.filter(c => pole.categories.includes(c.nom))

  return (
    <div>
      <button onClick={onRetour} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: 13, cursor: 'pointer', marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
        ← Projet Sportif
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ width: 14, height: 14, borderRadius: 4, background: pole.couleur, flexShrink: 0 }} />
        <div>
          <h2 style={{ color: colors.text.primary, fontSize: 22, fontWeight: 900, margin: '0 0 6px' }}>{pole.label}</h2>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {pole.categories.map(cat => (
              <span key={cat} style={{ background: pole.couleur + '22', color: pole.couleur, borderRadius: 4, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>{cat}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${colors.border.subtle}`, marginBottom: 24, overflowX: 'auto' }}>
        {ONGLETS.map(o => (
          <button key={o.key} onClick={() => setOnglet(o.key)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '10px 18px',
              fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif',
              color: onglet === o.key ? pole.couleur : colors.text.faint,
              borderBottom: onglet === o.key ? `2px solid ${pole.couleur}` : '2px solid transparent',
            }}>
            {o.label}
          </button>
        ))}
      </div>

      {onglet === 'categories' && (
        equipesDuPole.length === 0 ? (
          <PlaceholderAVenir couleur={pole.couleur} texte="Aucune équipe créée dans ce pôle pour l'instant. Ajoute une catégorie depuis Sportif → Catégories." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {equipesDuPole.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 12, padding: '12px 16px' }}>
                <span style={{ color: colors.text.primary, fontWeight: 700, fontSize: 14 }}>
                  {labelCategorie(c.nom)}{c.equipe ? ` ${c.equipe}` : ''}
                </span>
                <span style={{ color: colors.text.faint, fontSize: 12 }}>
                  {c.educateur ? `${c.educateur.prenom || ''} ${c.educateur.nom || ''}`.trim() : 'Aucun éducateur affecté'}
                </span>
              </div>
            ))}
          </div>
        )
      )}
      {onglet === 'principes' && <SectionPrincipes pole={pole} clubId={clubId} readOnly={readOnly} />}
      {onglet === 'planification' && <SectionPlanification pole={pole} clubId={clubId} readOnly={readOnly} />}
      {onglet === 'regles' && <SectionRegles pole={pole} clubId={clubId} readOnly={readOnly} />}
    </div>
  )
}

// Structure et navigation des 4 pôles du club (École de Foot, Préformation,
// Formation, Pôle Senior). "Catégories & Stats" affiche les vraies équipes du
// club (club_categories) ; Principes de jeu / Planification annuelle / Règles
// du jeu sont des sections à part entière (principes_jeu, planification_annuelle,
// regles_jeu), en écriture pour le club/staff et lecture seule sinon.
export default function ProjetSportif({ categories = [], clubId, readOnly = false }) {
  const colors = useColors()
  const [poleActifKey, setPoleActifKey] = useState(null)
  const [genre, setGenre] = useState('masculin')

  if (poleActifKey) {
    return <DetailPole pole={{ key: poleActifKey, ...POLES[poleActifKey] }} categories={categories} clubId={clubId} readOnly={readOnly} onRetour={() => setPoleActifKey(null)} />
  }

  const poles = genre === 'masculin' ? polesMasculins() : polesFeminins()

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <p style={{ color: colors.text.faint, fontSize: 13, margin: 0 }}>
          Organisation, objectifs et principes de jeu par pôle.
        </p>
        <div style={{ display: 'flex', background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 10, padding: 3, gap: 3 }}>
          <button onClick={() => setGenre('masculin')} style={{
            padding: '7px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 12, fontFamily: 'Inter, sans-serif',
            background: genre === 'masculin' ? colors.background.raised : 'transparent',
            color: genre === 'masculin' ? colors.text.primary : colors.text.faint,
          }}>
            Masculin
          </button>
          <button onClick={() => setGenre('feminin')} style={{
            padding: '7px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 12, fontFamily: 'Inter, sans-serif',
            background: genre === 'feminin' ? '#ec489922' : 'transparent',
            color: genre === 'feminin' ? '#ec4899' : colors.text.faint,
          }}>
            Féminin
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {poles.map(pole => {
          const key = pole.key
          const nbEquipes = categories.filter(c => pole.categories.includes(c.nom)).length
          return (
            <div key={key} onClick={() => setPoleActifKey(key)}
              style={{ background: colors.background.surface, border: `1px solid ${pole.couleur}33`, borderRadius: 16, padding: 22, cursor: 'pointer' }}>
              <span style={{ width: 12, height: 12, borderRadius: 4, background: pole.couleur, display: 'inline-block', marginBottom: 12 }} />
              <h3 style={{ color: colors.text.primary, fontSize: 17, fontWeight: 900, margin: '0 0 8px' }}>{pole.label}</h3>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                {pole.categories.map(cat => (
                  <span key={cat} style={{ background: pole.couleur + alpha.subtle, color: pole.couleur, borderRadius: 4, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>{cat}</span>
                ))}
              </div>
              <p style={{ color: colors.text.faint, fontSize: 12, margin: 0 }}>
                {nbEquipes} équipe{nbEquipes !== 1 ? 's' : ''} du club
              </p>
              <div style={{ marginTop: 14, color: pole.couleur, fontSize: 12, fontWeight: 700 }}>
                Accéder →
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

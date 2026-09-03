import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { labelCategorie } from '../../lib/categories'
import { saisonActuelle, bornesSaison, dateFr } from '../../lib/saison'

const TYPE_PHASE = {
  preparation: { label: 'Préparation', couleur: '#4ade80' },
  competition: { label: 'Compétition', couleur: '#3b82f6' },
  treve: { label: 'Trêve', couleur: '#6b7280' },
  bilan: { label: 'Bilan', couleur: '#f97316' },
}

const CHARGE_CONFIG = {
  LEG: { label: 'LÉG', couleur: '#4ade80' },
  MOY: { label: 'MOY', couleur: '#f59e0b' },
  ELEV: { label: 'ÉLEV', couleur: '#ef4444' },
}

const MOIS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

const listeVersLignes = (arr) => (arr || []).join('\n')
const lignesVersListe = (str) => str.split('\n').map(s => s.trim()).filter(Boolean)

function ChargeBadge({ charge }) {
  const cfg = CHARGE_CONFIG[charge] || CHARGE_CONFIG.MOY
  return <span style={{ background: cfg.couleur + '22', color: cfg.couleur, borderRadius: 4, padding: '2px 6px', fontSize: 9, fontWeight: 800 }}>{cfg.label}</span>
}

function SetupPlan({ categorie, clubId, pole, onCreer }) {
  const colors = useColors()
  const saison = saisonActuelle()
  const [form, setForm] = useState({ ...bornesSaison(saison), nb_seances_semaine: 2, projet_jeu: '', valeurs: 'Plaisir, Respect, Engagement, Solidarité, Discipline' })
  const [saving, setSaving] = useState(false)

  const creer = async () => {
    setSaving(true)
    const { error } = await supabase.from('plan_annuel').insert({
      club_id: clubId,
      categorie,
      saison,
      date_debut: form.date_debut,
      date_fin: form.date_fin,
      nb_seances_semaine: parseInt(form.nb_seances_semaine) || 2,
      projet_jeu: form.projet_jeu || null,
      valeurs: form.valeurs.split(',').map(v => v.trim()).filter(Boolean),
    })
    setSaving(false)
    if (!error) onCreer()
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 16, padding: 28, maxWidth: 480, width: '100%' }}>
        <h3 style={{ color: colors.text.primary, margin: '0 0 6px', fontSize: 17, fontWeight: 800 }}>Créer le plan annuel — {labelCategorie(categorie)}</h3>
        <p style={{ color: colors.text.faint, fontSize: 13, margin: '0 0 22px' }}>Saison {saison}</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <div style={{ color: colors.text.faint, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Date de début</div>
            <input type="date" value={form.date_debut} onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))}
              style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '9px 10px', color: colors.text.primary, fontSize: 13, boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
          </div>
          <div>
            <div style={{ color: colors.text.faint, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Date de fin</div>
            <input type="date" value={form.date_fin} onChange={e => setForm(f => ({ ...f, date_fin: e.target.value }))}
              style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '9px 10px', color: colors.text.primary, fontSize: 13, boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: colors.text.faint, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Séances par semaine</div>
          <input type="number" min={1} value={form.nb_seances_semaine} onChange={e => setForm(f => ({ ...f, nb_seances_semaine: e.target.value }))}
            style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '9px 10px', color: colors.text.primary, fontSize: 13, boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: colors.text.faint, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Projet de jeu (optionnel)</div>
          <input value={form.projet_jeu} onChange={e => setForm(f => ({ ...f, projet_jeu: e.target.value }))}
            placeholder="Ex: Être une équipe progressive, solidaire, performante"
            style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '9px 10px', color: colors.text.primary, fontSize: 13, boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: colors.text.faint, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Valeurs du club (séparées par virgule)</div>
          <input value={form.valeurs} onChange={e => setForm(f => ({ ...f, valeurs: e.target.value }))}
            style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '9px 10px', color: colors.text.primary, fontSize: 13, boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
        </div>

        <button onClick={creer} disabled={saving || !form.date_debut || !form.date_fin}
          style={{ width: '100%', background: pole.couleur, color: '#0a0a0a', border: 'none', borderRadius: 10, padding: 12, fontWeight: 800, fontSize: 14, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Création...' : 'Créer le plan annuel'}
        </button>
      </div>
    </div>
  )
}

function ModalPhase({ phase, planId, pole, onSave, onClose, onDelete }) {
  const colors = useColors()
  const [form, setForm] = useState({
    nom: phase.nom || '', type: phase.type || 'competition',
    date_debut: phase.date_debut || '', date_fin: phase.date_fin || '', duree_semaines: phase.duree_semaines || '',
    theme_offensif: phase.theme_offensif || '', sous_principes_offensifs: listeVersLignes(phase.sous_principes_offensifs),
    theme_defensif: phase.theme_defensif || '', sous_principes_defensifs: listeVersLignes(phase.sous_principes_defensifs),
    objectifs_prioritaires: listeVersLignes(phase.objectifs_prioritaires), criteres_reussite: listeVersLignes(phase.criteres_reussite),
    ordre: phase.ordre ?? 0,
  })
  const [saving, setSaving] = useState(false)

  const sauvegarder = async () => {
    setSaving(true)
    const data = {
      nom: form.nom, type: form.type, date_debut: form.date_debut, date_fin: form.date_fin,
      duree_semaines: parseInt(form.duree_semaines) || null,
      theme_offensif: form.theme_offensif || null, sous_principes_offensifs: lignesVersListe(form.sous_principes_offensifs),
      theme_defensif: form.theme_defensif || null, sous_principes_defensifs: lignesVersListe(form.sous_principes_defensifs),
      objectifs_prioritaires: lignesVersListe(form.objectifs_prioritaires), criteres_reussite: lignesVersListe(form.criteres_reussite),
      ordre: form.ordre,
    }
    if (phase._new) await supabase.from('plan_phases').insert({ ...data, plan_id: planId })
    else await supabase.from('plan_phases').update(data).eq('id', phase.id)
    setSaving(false)
    onSave()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: colors.background.sunken, border: `1px solid ${colors.border.default}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ color: colors.text.primary, margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>{phase._new ? 'Nouvelle phase' : `Modifier — ${phase.nom}`}</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
            placeholder="Nom de la phase (ex: S'organiser)"
            style={{ gridColumn: '1/-1', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: 10, color: colors.text.primary, fontSize: 13, fontFamily: 'Inter, sans-serif' }} />
          <input type="date" value={form.date_debut} onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))}
            style={{ background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: 10, color: colors.text.primary, fontSize: 13, fontFamily: 'Inter, sans-serif' }} />
          <input type="date" value={form.date_fin} onChange={e => setForm(f => ({ ...f, date_fin: e.target.value }))}
            style={{ background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: 10, color: colors.text.primary, fontSize: 13, fontFamily: 'Inter, sans-serif' }} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {Object.entries(TYPE_PHASE).map(([val, cfg]) => (
            <button key={val} onClick={() => setForm(f => ({ ...f, type: val }))}
              style={{ flex: '1 1 100px', padding: 7, borderRadius: 8, border: '1px solid', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                background: form.type === val ? cfg.couleur + '22' : 'transparent', borderColor: form.type === val ? cfg.couleur : colors.border.default,
                color: form.type === val ? cfg.couleur : colors.text.faint }}>
              {cfg.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ color: '#4ade80', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Thème Offensif</div>
            <input value={form.theme_offensif} onChange={e => setForm(f => ({ ...f, theme_offensif: e.target.value }))}
              placeholder="Ex: Progresser vers l'avant"
              style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: 8, color: colors.text.primary, fontSize: 12, boxSizing: 'border-box', marginBottom: 6, fontFamily: 'Inter, sans-serif' }} />
            <textarea value={form.sous_principes_offensifs} onChange={e => setForm(f => ({ ...f, sous_principes_offensifs: e.target.value }))}
              placeholder="Sous-principes (1 par ligne)" rows={3}
              style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: 8, color: colors.text.primary, fontSize: 11, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
          </div>
          <div>
            <div style={{ color: '#ef4444', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Thème Défensif</div>
            <input value={form.theme_defensif} onChange={e => setForm(f => ({ ...f, theme_defensif: e.target.value }))}
              placeholder="Ex: Gêner pour récupérer"
              style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: 8, color: colors.text.primary, fontSize: 12, boxSizing: 'border-box', marginBottom: 6, fontFamily: 'Inter, sans-serif' }} />
            <textarea value={form.sous_principes_defensifs} onChange={e => setForm(f => ({ ...f, sous_principes_defensifs: e.target.value }))}
              placeholder="Sous-principes (1 par ligne)" rows={3}
              style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: 8, color: colors.text.primary, fontSize: 11, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ color: '#f59e0b', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Objectifs prioritaires (1 par ligne)</div>
            <textarea value={form.objectifs_prioritaires} onChange={e => setForm(f => ({ ...f, objectifs_prioritaires: e.target.value }))}
              rows={4} style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: 8, color: colors.text.primary, fontSize: 11, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
          </div>
          <div>
            <div style={{ color: '#a78bfa', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Critères de réussite (1 par ligne)</div>
            <textarea value={form.criteres_reussite} onChange={e => setForm(f => ({ ...f, criteres_reussite: e.target.value }))}
              rows={4} style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: 8, color: colors.text.primary, fontSize: 11, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
          {!phase._new ? (
            <button onClick={() => onDelete(phase.id)} style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef444444', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', fontWeight: 700 }}>
              Supprimer
            </button>
          ) : <span />}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ background: 'transparent', color: colors.text.faint, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontWeight: 700 }}>Annuler</button>
            <button onClick={sauvegarder} disabled={saving || !form.nom || !form.date_debut || !form.date_fin}
              style={{ background: pole.couleur, color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 800, cursor: 'pointer', opacity: (!form.nom || !form.date_debut || !form.date_fin) ? 0.5 : 1 }}>
              Sauvegarder
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ModalSemaine({ semaine, planId, phases, pole, onSave, onClose, onDelete }) {
  const colors = useColors()
  const [form, setForm] = useState({
    numero_semaine: semaine.numero_semaine ?? '', phase_id: semaine.phase_id || '', mois: semaine.mois || '', date_debut: semaine.date_debut || '',
    theme_offensif: semaine.theme_offensif || '', sous_principe_offensif: semaine.sous_principe_offensif || '',
    theme_defensif: semaine.theme_defensif || '', sous_principe_defensif: semaine.sous_principe_defensif || '',
    objectif_offensif: semaine.objectif_offensif || '', objectif_defensif: semaine.objectif_defensif || '',
    charge_s1: semaine.charge_s1 || 'MOY', charge_s2: semaine.charge_s2 || 'MOY',
    competition: semaine.competition || '', remarques: semaine.remarques || '', type_semaine: semaine.type_semaine || 'normal',
  })
  const [saving, setSaving] = useState(false)

  const sauvegarder = async () => {
    setSaving(true)
    const data = { ...form, numero_semaine: parseInt(form.numero_semaine), phase_id: form.phase_id || null }
    let error
    if (semaine._new) ({ error } = await supabase.from('plan_semaines').insert({ ...data, plan_id: planId }))
    else ({ error } = await supabase.from('plan_semaines').update(data).eq('id', semaine.id))
    setSaving(false)
    if (!error) onSave()
  }

  const champ = (label, key, placeholder = '') => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ color: colors.text.faint, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <input value={form[key]} placeholder={placeholder} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '8px 10px', color: colors.text.primary, fontSize: 12, boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
    </div>
  )

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: colors.background.sunken, border: `1px solid ${colors.border.default}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ color: colors.text.primary, margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>{semaine._new ? 'Nouvelle semaine' : `Semaine ${semaine.numero_semaine}`}</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <div style={{ color: colors.text.faint, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Numéro</div>
            <input type="number" value={form.numero_semaine} onChange={e => setForm(f => ({ ...f, numero_semaine: e.target.value }))}
              style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '8px 10px', color: colors.text.primary, fontSize: 12, boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
          </div>
          <div>
            <div style={{ color: colors.text.faint, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Date</div>
            <input type="date" value={form.date_debut || ''} onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))}
              style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '8px 10px', color: colors.text.primary, fontSize: 12, boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
          </div>
          <div>
            <div style={{ color: colors.text.faint, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Mois</div>
            <input value={form.mois} onChange={e => setForm(f => ({ ...f, mois: e.target.value }))}
              style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '8px 10px', color: colors.text.primary, fontSize: 12, boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ color: colors.text.faint, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Phase</div>
          <select value={form.phase_id} onChange={e => setForm(f => ({ ...f, phase_id: e.target.value }))}
            style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '8px 10px', color: colors.text.primary, fontSize: 12, fontFamily: 'Inter, sans-serif' }}>
            <option value="">— Aucune —</option>
            {phases.map(ph => <option key={ph.id} value={ph.id}>{ph.nom}</option>)}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {champ('Thème offensif', 'theme_offensif')}
          {champ('Thème défensif', 'theme_defensif')}
          {champ('Sous-principe OFF', 'sous_principe_offensif')}
          {champ('Sous-principe DEF', 'sous_principe_defensif')}
          {champ('Objectif OFF', 'objectif_offensif')}
          {champ('Objectif DEF', 'objectif_defensif')}
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ color: colors.text.faint, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Charge (séance 1 / séance 2)</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['charge_s1', 'charge_s2'].map(key => (
              <div key={key} style={{ display: 'flex', gap: 4, flex: 1 }}>
                {Object.entries(CHARGE_CONFIG).map(([val, cfg]) => (
                  <button key={val} onClick={() => setForm(f => ({ ...f, [key]: val }))}
                    style={{ flex: 1, padding: '6px 4px', borderRadius: 6, border: '1px solid', fontSize: 10, fontWeight: 700, cursor: 'pointer',
                      background: form[key] === val ? cfg.couleur + '22' : 'transparent', borderColor: form[key] === val ? cfg.couleur : colors.border.default,
                      color: form[key] === val ? cfg.couleur : colors.text.faint }}>
                    {cfg.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {champ('Compétition', 'competition')}
        {champ('Remarques', 'remarques')}

        <div style={{ marginBottom: 16 }}>
          <div style={{ color: colors.text.faint, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Type de semaine</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[['normal', 'Normale'], ['vacances', 'Vacances'], ['bilan', 'Bilan']].map(([val, label]) => (
              <button key={val} onClick={() => setForm(f => ({ ...f, type_semaine: val }))}
                style={{ flex: 1, padding: 7, borderRadius: 8, border: '1px solid', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  background: form.type_semaine === val ? pole.couleur + '22' : 'transparent', borderColor: form.type_semaine === val ? pole.couleur : colors.border.default,
                  color: form.type_semaine === val ? pole.couleur : colors.text.faint }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
          {!semaine._new ? (
            <button onClick={() => onDelete(semaine.id)} style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef444444', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', fontWeight: 700 }}>
              Supprimer
            </button>
          ) : <span />}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ background: 'transparent', color: colors.text.faint, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontWeight: 700 }}>Annuler</button>
            <button onClick={sauvegarder} disabled={saving || !form.numero_semaine} style={{ background: pole.couleur, color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 800, cursor: 'pointer', opacity: !form.numero_semaine ? 0.5 : 1 }}>
              Sauvegarder
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function VuePhases({ plan, phases, competitions, pole, categorie, onEditPhase, onAjouterPhase, readOnly }) {
  const colors = useColors()
  return (
    <div>
      <div style={{ background: colors.background.surface, border: `2px solid ${pole.couleur}`, borderRadius: 12, padding: '20px 24px', marginBottom: 20, textAlign: 'center' }}>
        <div style={{ color: pole.couleur, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 3, marginBottom: 6 }}>Planification Annuelle</div>
        <h1 style={{ color: colors.text.primary, fontSize: 22, fontWeight: 900, margin: '0 0 6px' }}>{labelCategorie(categorie)}</h1>
        <div style={{ color: colors.text.faint, fontSize: 13 }}>
          {dateFr(plan.date_debut, { day: '2-digit', month: 'long', year: 'numeric' })} → {dateFr(plan.date_fin, { day: '2-digit', month: 'long', year: 'numeric' })}
          {plan.nb_seances_semaine && ` · ${plan.nb_seances_semaine} entraînements / semaine`}
        </div>
        {plan.projet_jeu && <div style={{ color: pole.couleur, fontStyle: 'italic', fontSize: 13, marginTop: 8 }}>« {plan.projet_jeu} »</div>}
      </div>

      {phases.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, color: colors.text.faint, fontSize: 13 }}>Aucune phase définie pour l'instant.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
          {phases.map(ph => {
            const cfg = TYPE_PHASE[ph.type] || TYPE_PHASE.competition
            return (
              <div key={ph.id} onClick={() => !readOnly && onEditPhase(ph)} style={{ background: colors.background.surface, border: `1px solid ${cfg.couleur}44`, borderRadius: 12, padding: 16, cursor: readOnly ? 'default' : 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                  <span style={{ background: cfg.couleur + '22', color: cfg.couleur, borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>{cfg.label}</span>
                  <span style={{ color: colors.text.primary, fontWeight: 900, fontSize: 14 }}>{ph.nom}</span>
                  <span style={{ color: colors.text.faint, fontSize: 11 }}>{dateFr(ph.date_debut)} → {dateFr(ph.date_fin)}{ph.duree_semaines ? ` · ${ph.duree_semaines} sem.` : ''}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                  <div style={{ background: colors.background.base, borderRadius: 8, padding: 10 }}>
                    <div style={{ color: '#4ade80', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>Thème Offensif</div>
                    <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{ph.theme_offensif || '—'}</div>
                    {ph.sous_principes_offensifs?.map((sp, i) => <div key={i} style={{ color: colors.text.faint, fontSize: 10, marginBottom: 2 }}>• {sp}</div>)}
                  </div>
                  <div style={{ background: colors.background.base, borderRadius: 8, padding: 10 }}>
                    <div style={{ color: '#ef4444', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>Thème Défensif</div>
                    <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{ph.theme_defensif || '—'}</div>
                    {ph.sous_principes_defensifs?.map((sp, i) => <div key={i} style={{ color: colors.text.faint, fontSize: 10, marginBottom: 2 }}>• {sp}</div>)}
                  </div>
                  <div style={{ background: colors.background.base, borderRadius: 8, padding: 10 }}>
                    <div style={{ color: '#f59e0b', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>Objectifs</div>
                    {ph.objectifs_prioritaires?.map((o, i) => <div key={i} style={{ color: colors.text.faint, fontSize: 10, marginBottom: 2 }}>• {o}</div>)}
                  </div>
                  <div style={{ background: colors.background.base, borderRadius: 8, padding: 10 }}>
                    <div style={{ color: '#a78bfa', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>Critères de réussite</div>
                    {ph.criteres_reussite?.map((c, i) => <div key={i} style={{ color: colors.text.faint, fontSize: 10, marginBottom: 2 }}>• {c}</div>)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {competitions.length > 0 && (
        <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ color: colors.text.faint, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', marginBottom: 12 }}>Compétitions & Échéances</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {competitions.map(c => (
              <div key={c.id} style={{ textAlign: 'center' }}>
                <div style={{ color: '#4ade80', fontSize: 11, fontWeight: 800 }}>{dateFr(c.date, { day: '2-digit', month: 'short', year: '2-digit' })}</div>
                <div style={{ color: colors.text.faint, fontSize: 10 }}>{c.nom}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {plan.valeurs?.length > 0 && (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', padding: 16 }}>
          {plan.valeurs.map((v, i) => (
            <span key={i} style={{ background: pole.couleur + '15', color: pole.couleur, borderRadius: 20, padding: '6px 14px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>{v}</span>
          ))}
        </div>
      )}

      {!readOnly && (
        <button onClick={onAjouterPhase} style={{ marginTop: 12, background: pole.couleur + '22', color: pole.couleur, border: `1px solid ${pole.couleur}44`, borderRadius: 8, padding: '8px 16px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
          + Ajouter une phase
        </button>
      )}
    </div>
  )
}

const COLONNES_SEMAINES = ['Phase', 'Mois', 'Sem.', 'Thème OFF', 'Sous-principe OFF', 'Thème DEF', 'Sous-principe DEF', 'Objectif OFF', 'Objectif DEF', 'S1', 'S2', 'Compétition', 'Remarques']

function VueSemaines({ semaines, phases, pole, onEditSemaine, onAjouterSemaine, onGenererSemaines, readOnly }) {
  const colors = useColors()
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 1200 }}>
        <thead>
          <tr>
            {COLONNES_SEMAINES.map(col => (
              <th key={col} style={{ padding: '10px 8px', color: colors.text.primary, fontWeight: 800, textTransform: 'uppercase', fontSize: 9, letterSpacing: 1, textAlign: 'left', borderBottom: `2px solid ${pole.couleur}`, whiteSpace: 'nowrap', background: colors.background.surface }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {semaines.map((sem, idx) => {
            const phase = phases.find(ph => ph.id === sem.phase_id)
            const cfgPhase = phase ? (TYPE_PHASE[phase.type] || TYPE_PHASE.competition) : null
            if (sem.type_semaine === 'vacances') {
              return (
                <tr key={sem.id} onClick={() => !readOnly && onEditSemaine(sem)} style={{ background: '#f59e0b11', cursor: readOnly ? 'default' : 'pointer' }}>
                  <td colSpan={COLONNES_SEMAINES.length} style={{ padding: '8px 12px', color: '#f59e0b', fontWeight: 800, fontSize: 11, textAlign: 'center', border: `1px solid ${colors.border.subtle}` }}>
                    {sem.competition || 'VACANCES'} — Semaine {sem.numero_semaine}
                  </td>
                </tr>
              )
            }
            return (
              <tr key={sem.id} onClick={() => !readOnly && onEditSemaine(sem)} style={{ background: idx % 2 === 0 ? 'transparent' : colors.background.surface, cursor: readOnly ? 'default' : 'pointer' }}>
                <td style={{ padding: '7px 8px', borderBottom: `1px solid ${colors.border.subtle}` }}>
                  {phase && <span style={{ background: cfgPhase.couleur + '22', color: cfgPhase.couleur, borderRadius: 4, padding: '2px 6px', fontSize: 9, fontWeight: 800, whiteSpace: 'nowrap' }}>{phase.nom}</span>}
                </td>
                <td style={{ padding: '7px 8px', color: colors.text.faint, borderBottom: `1px solid ${colors.border.subtle}`, whiteSpace: 'nowrap' }}>{sem.mois}</td>
                <td style={{ padding: '7px 8px', color: '#4ade80', fontWeight: 800, borderBottom: `1px solid ${colors.border.subtle}`, textAlign: 'center' }}>{sem.numero_semaine}</td>
                <td style={{ padding: '7px 8px', color: '#4ade80', fontWeight: 600, borderBottom: `1px solid ${colors.border.subtle}` }}>{sem.theme_offensif}</td>
                <td style={{ padding: '7px 8px', color: colors.text.secondary, borderBottom: `1px solid ${colors.border.subtle}` }}>{sem.sous_principe_offensif}</td>
                <td style={{ padding: '7px 8px', color: '#ef4444', fontWeight: 600, borderBottom: `1px solid ${colors.border.subtle}` }}>{sem.theme_defensif}</td>
                <td style={{ padding: '7px 8px', color: colors.text.secondary, borderBottom: `1px solid ${colors.border.subtle}` }}>{sem.sous_principe_defensif}</td>
                <td style={{ padding: '7px 8px', color: colors.text.secondary, borderBottom: `1px solid ${colors.border.subtle}`, fontSize: 10 }}>{sem.objectif_offensif}</td>
                <td style={{ padding: '7px 8px', color: colors.text.secondary, borderBottom: `1px solid ${colors.border.subtle}`, fontSize: 10 }}>{sem.objectif_defensif}</td>
                <td style={{ padding: '7px 8px', borderBottom: `1px solid ${colors.border.subtle}`, textAlign: 'center' }}><ChargeBadge charge={sem.charge_s1} /></td>
                <td style={{ padding: '7px 8px', borderBottom: `1px solid ${colors.border.subtle}`, textAlign: 'center' }}><ChargeBadge charge={sem.charge_s2} /></td>
                <td style={{ padding: '7px 8px', color: '#f59e0b', borderBottom: `1px solid ${colors.border.subtle}`, fontSize: 10 }}>{sem.competition}</td>
                <td style={{ padding: '7px 8px', color: colors.text.faint, borderBottom: `1px solid ${colors.border.subtle}`, fontSize: 10 }}>{sem.remarques}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {semaines.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: colors.text.faint, fontSize: 13 }}>Aucune semaine — génère les semaines depuis les phases.</div>
      )}

      {!readOnly && (
        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <button onClick={onGenererSemaines} style={{ background: pole.couleur + '22', color: pole.couleur, border: `1px solid ${pole.couleur}44`, borderRadius: 8, padding: '8px 16px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
            Générer les semaines depuis les phases
          </button>
          <button onClick={onAjouterSemaine} style={{ background: colors.background.raised, color: colors.text.faint, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '8px 16px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
            + Ajouter manuellement
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: colors.text.faint, fontSize: 10, fontWeight: 700 }}>S1/S2 = séances de la semaine · Charge :</span>
        {Object.entries(CHARGE_CONFIG).map(([key, cfg]) => (
          <span key={key} style={{ background: cfg.couleur + '22', color: cfg.couleur, borderRadius: 4, padding: '2px 7px', fontSize: 10, fontWeight: 800 }}>{cfg.label}</span>
        ))}
      </div>
    </div>
  )
}

// Document imprimable (thème clair, indépendant de l'UI à l'écran) capturé en
// PDF via html2canvas + jsPDF — même technique que #fiche-print (cf. index.css
// et DashboardEducateur.jsx/genererPdfFiche), avec une mise en page dédiée
// plutôt que de figer l'UI sombre telle quelle.
function DocumentImprimable({ plan, phases, semaines, competitions, categorie }) {
  return (
    <div id="plan-annuel-print" style={{ display: 'none', width: 1400, padding: 30, background: '#ffffff', color: '#111', fontFamily: 'Arial, sans-serif', boxSizing: 'border-box' }}>
      <h1 style={{ fontSize: 22, margin: '0 0 4px' }}>Planification Annuelle — {labelCategorie(categorie)}</h1>
      <p style={{ fontSize: 12, color: '#444', margin: '0 0 4px' }}>
        {dateFr(plan.date_debut, { day: '2-digit', month: 'long', year: 'numeric' })} → {dateFr(plan.date_fin, { day: '2-digit', month: 'long', year: 'numeric' })}
        {plan.nb_seances_semaine && ` · ${plan.nb_seances_semaine} entraînements / semaine`}
      </p>
      {plan.projet_jeu && <p style={{ fontSize: 12, fontStyle: 'italic', color: '#111', margin: '0 0 12px' }}>« {plan.projet_jeu} »</p>}

      {phases.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, marginBottom: 20 }}>
          <thead>
            <tr style={{ background: '#111', color: '#fff' }}>
              {['Phase', 'Période', 'Thème OFF', 'Thème DEF', 'Objectifs', 'Critères de réussite'].map(c => (
                <th key={c} style={{ padding: 6, textAlign: 'left', border: '1px solid #ccc' }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {phases.map(ph => (
              <tr key={ph.id}>
                <td style={{ padding: 6, border: '1px solid #ccc', fontWeight: 700 }}>{ph.nom}</td>
                <td style={{ padding: 6, border: '1px solid #ccc' }}>{dateFr(ph.date_debut)} → {dateFr(ph.date_fin)}</td>
                <td style={{ padding: 6, border: '1px solid #ccc' }}>{ph.theme_offensif}{ph.sous_principes_offensifs?.length ? ' — ' + ph.sous_principes_offensifs.join(', ') : ''}</td>
                <td style={{ padding: 6, border: '1px solid #ccc' }}>{ph.theme_defensif}{ph.sous_principes_defensifs?.length ? ' — ' + ph.sous_principes_defensifs.join(', ') : ''}</td>
                <td style={{ padding: 6, border: '1px solid #ccc' }}>{ph.objectifs_prioritaires?.join(', ')}</td>
                <td style={{ padding: 6, border: '1px solid #ccc' }}>{ph.criteres_reussite?.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {competitions.length > 0 && (
        <p style={{ fontSize: 11, marginBottom: 16 }}>
          <strong>Compétitions : </strong>
          {competitions.map(c => `${c.nom} (${dateFr(c.date, { day: '2-digit', month: 'short', year: '2-digit' })})`).join(' · ')}
        </p>
      )}

      {semaines.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
          <thead>
            <tr style={{ background: '#111', color: '#fff' }}>
              {COLONNES_SEMAINES.map(c => <th key={c} style={{ padding: 4, textAlign: 'left', border: '1px solid #ccc' }}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {semaines.map(sem => {
              const phase = phases.find(ph => ph.id === sem.phase_id)
              return (
                <tr key={sem.id}>
                  <td style={{ padding: 4, border: '1px solid #ccc' }}>{phase?.nom || ''}</td>
                  <td style={{ padding: 4, border: '1px solid #ccc' }}>{sem.mois}</td>
                  <td style={{ padding: 4, border: '1px solid #ccc' }}>{sem.numero_semaine}</td>
                  <td style={{ padding: 4, border: '1px solid #ccc' }}>{sem.theme_offensif}</td>
                  <td style={{ padding: 4, border: '1px solid #ccc' }}>{sem.sous_principe_offensif}</td>
                  <td style={{ padding: 4, border: '1px solid #ccc' }}>{sem.theme_defensif}</td>
                  <td style={{ padding: 4, border: '1px solid #ccc' }}>{sem.sous_principe_defensif}</td>
                  <td style={{ padding: 4, border: '1px solid #ccc' }}>{sem.objectif_offensif}</td>
                  <td style={{ padding: 4, border: '1px solid #ccc' }}>{sem.objectif_defensif}</td>
                  <td style={{ padding: 4, border: '1px solid #ccc' }}>{sem.charge_s1}</td>
                  <td style={{ padding: 4, border: '1px solid #ccc' }}>{sem.charge_s2}</td>
                  <td style={{ padding: 4, border: '1px solid #ccc' }}>{sem.competition}</td>
                  <td style={{ padding: 4, border: '1px solid #ccc' }}>{sem.remarques}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default function PlanificationAnnuelle({ categorie, clubId, pole, readOnly }) {
  const colors = useColors()
  const [vue, setVue] = useState('phases')
  const [plan, setPlan] = useState(undefined) // undefined = chargement, null = aucun plan
  const [phases, setPhases] = useState([])
  const [semaines, setSemaines] = useState([])
  const [competitions, setCompetitions] = useState([])
  const [phaseActive, setPhaseActive] = useState(null)
  const [semaineActive, setSemaineActive] = useState(null)
  const [exporting, setExporting] = useState(false)

  const chargerPlan = async () => {
    const { data: p } = await supabase.from('plan_annuel').select('*').eq('club_id', clubId).eq('categorie', categorie).eq('saison', saisonActuelle()).maybeSingle()
    setPlan(p || null)
    if (p) {
      const [{ data: ph }, { data: sem }, { data: comp }] = await Promise.all([
        supabase.from('plan_phases').select('*').eq('plan_id', p.id).order('ordre'),
        supabase.from('plan_semaines').select('*').eq('plan_id', p.id).order('numero_semaine'),
        supabase.from('plan_competitions').select('*').eq('plan_id', p.id).order('date'),
      ])
      setPhases(ph || [])
      setSemaines(sem || [])
      setCompetitions(comp || [])
    } else {
      setPhases([]); setSemaines([]); setCompetitions([])
    }
  }
  useEffect(() => { setPlan(undefined); chargerPlan() }, [categorie, clubId])

  const supprimerPhase = async (id) => {
    await supabase.from('plan_phases').delete().eq('id', id)
    setPhaseActive(null)
    chargerPlan()
  }
  const supprimerSemaine = async (id) => {
    await supabase.from('plan_semaines').delete().eq('id', id)
    setSemaineActive(null)
    chargerPlan()
  }

  const genererSemaines = async () => {
    if (!plan || phases.length === 0) return
    if (semaines.length > 0) {
      if (!confirm('Les semaines existantes seront remplacées. Continuer ?')) return
      await supabase.from('plan_semaines').delete().eq('plan_id', plan.id)
    }
    const nouvelles = []
    let numSemaine = 1
    for (const phase of [...phases].sort((a, b) => a.ordre - b.ordre)) {
      let current = new Date(`${phase.date_debut}T12:00:00`)
      const fin = new Date(`${phase.date_fin}T12:00:00`)
      while (current <= fin) {
        nouvelles.push({
          plan_id: plan.id, phase_id: phase.id, numero_semaine: numSemaine++,
          mois: MOIS_FR[current.getMonth()],
          date_debut: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`,
          theme_offensif: phase.theme_offensif || '', theme_defensif: phase.theme_defensif || '',
          charge_s1: 'MOY', charge_s2: 'MOY', type_semaine: 'normal',
        })
        current.setDate(current.getDate() + 7)
      }
    }
    await supabase.from('plan_semaines').insert(nouvelles)
    chargerPlan()
  }

  const exporterPDF = async () => {
    const el = document.getElementById('plan-annuel-print')
    if (!el) return
    setExporting(true)
    el.style.display = 'block'
    el.style.position = 'fixed'
    el.style.left = '-9999px'
    el.style.top = '0'
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pageWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      const imgData = canvas.toDataURL('image/png')
      let heightLeft = imgHeight
      let position = 0
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
      while (heightLeft > 0) {
        position -= pageHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }
      pdf.save(`planification-${categorie}-${saisonActuelle()}.pdf`)
    } finally {
      el.style.display = 'none'
      setExporting(false)
    }
  }

  if (plan === undefined) return null
  if (plan === null) return <SetupPlan categorie={categorie} clubId={clubId} pole={pole} onCreer={chargerPlan} />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ color: colors.text.primary, fontSize: 16, fontWeight: 900, margin: '0 0 4px' }}>Planification — {labelCategorie(categorie)}</h3>
          <div style={{ color: colors.text.faint, fontSize: 12 }}>Saison {plan.saison}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 8, padding: 3, gap: 3 }}>
            {[['phases', 'Phases'], ['semaines', 'Semaines']].map(([val, label]) => (
              <button key={val} onClick={() => setVue(val)}
                style={{ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Inter, sans-serif',
                  background: vue === val ? pole.couleur : 'transparent', color: vue === val ? '#0a0a0a' : colors.text.faint }}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={exporterPDF} disabled={exporting}
            style={{ background: colors.background.raised, color: colors.text.primary, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '8px 16px', fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: exporting ? 0.6 : 1 }}>
            {exporting ? 'Export...' : 'Exporter PDF'}
          </button>
        </div>
      </div>

      {vue === 'phases' && (
        <VuePhases plan={plan} phases={phases} competitions={competitions} pole={pole} categorie={categorie} readOnly={readOnly}
          onEditPhase={setPhaseActive} onAjouterPhase={() => setPhaseActive({ _new: true, ordre: phases.length })} />
      )}
      {vue === 'semaines' && (
        <VueSemaines semaines={semaines} phases={phases} pole={pole} readOnly={readOnly}
          onEditSemaine={setSemaineActive} onAjouterSemaine={() => setSemaineActive({ _new: true, numero_semaine: semaines.length + 1 })} onGenererSemaines={genererSemaines} />
      )}

      <DocumentImprimable plan={plan} phases={phases} semaines={semaines} competitions={competitions} categorie={categorie} />

      {phaseActive && (
        <ModalPhase phase={phaseActive} planId={plan.id} pole={pole} onDelete={supprimerPhase}
          onSave={() => { setPhaseActive(null); chargerPlan() }} onClose={() => setPhaseActive(null)} />
      )}
      {semaineActive && (
        <ModalSemaine semaine={semaineActive} planId={plan.id} phases={phases} pole={pole} onDelete={supprimerSemaine}
          onSave={() => { setSemaineActive(null); chargerPlan() }} onClose={() => setSemaineActive(null)} />
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import TournoiOrganise from './TournoiOrganise'

const STATUT_COULEUR = {
  'Inscrit': '#f59e0b',
  'Confirmé': '#3b82f6',
  'En cours': '#4ade80',
  'Terminé': '#888',
  'Annulé': '#ef4444',
}

const PHASES = ['Poule', 'Quart de finale', 'Demi-finale', 'Petite finale', 'Finale']

const IcoTrophy = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0018 9h-1.26A8 8 0 103 16.29"/></svg>
const IcoChevronRight = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
const IcoArrowLeft = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>

const VIDE_TOURNOI = {
  nom: '', organisateur: '', date_debut: '', date_fin: '',
  lieu: '', adresse: '', format: 'Poules + KO', nb_equipes: '',
  statut: 'Inscrit', contact_nom: '', contact_email: '', contact_tel: '',
  nb_joueurs_max: 16, notes: '', club_categorie_id: '', budget_inscription: '',
}
const VIDE_MATCH = { adversaire: '', phase: 'Poule', score_nous: '', score_eux: '', heure: '', terrain: '', buteurs: '', notes: '' }

// Module Tournoi : « Nos tournois » (Phase 1, tournois auxquels le club
// participe) et « On organise » (Phase 2, tournois organisés par le club —
// cf. TournoiOrganise.jsx pour la création/planning/résultats/classement).
const SOUS_ONGLETS = [
  { key: 'participation', label: 'Nos tournois' },
  { key: 'organisation', label: 'On organise' },
]

export default function TournoiClub({ clubId, categories, readOnly = false, userId = null }) {
  const colors = useColors()
  const [sousOnglet, setSousOnglet] = useState('participation')
  const [vue, setVue] = useState('liste') // liste | nouveau | detail
  const [tournois, setTournois] = useState([])
  const [selected, setSelected] = useState(null)
  const [matchs, setMatchs] = useState([])
  const [convocations, setConvocations] = useState([])
  const [effectif, setEffectif] = useState([])
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet] = useState('apercu') // apercu | matchs | groupe | logistique | bilan

  const [form, setForm] = useState(VIDE_TOURNOI)
  const [editingId, setEditingId] = useState(null)
  const [formMatch, setFormMatch] = useState(VIDE_MATCH)

  useEffect(() => { if (clubId) charger() }, [clubId])

  async function charger() {
    setLoading(true)
    const { data } = await supabase
      .from('tournois_participation')
      .select('*')
      .eq('club_id', clubId)
      .order('date_debut', { ascending: false })
    setTournois(data || [])
    setLoading(false)
  }

  async function chargerEffectif(clubCategorieId) {
    if (!clubCategorieId) { setEffectif([]); return }
    const { data: educs } = await supabase.from('club_educateurs').select('educateur_id').eq('club_id', clubId).eq('statut', 'accepte')
    const educateurIds = [...new Set((educs || []).map(e => e.educateur_id).filter(Boolean))]
    if (!educateurIds.length) { setEffectif([]); return }
    const { data } = await supabase.from('equipe_joueurs')
      .select('id, prenom, nom, poste, numero_maillot, club_categorie_id')
      .in('educateur_id', educateurIds).eq('club_categorie_id', clubCategorieId).order('nom')
    setEffectif(data || [])
  }

  async function ouvrirDetail(t) {
    setSelected(t)
    setVue('detail')
    setOnglet('apercu')
    const [{ data: m }, { data: c }] = await Promise.all([
      supabase.from('tournois_matchs').select('*').eq('tournoi_id', t.id).order('created_at'),
      supabase.from('tournois_convocations').select('*, equipe_joueurs(prenom, nom, poste, numero_maillot)').eq('tournoi_id', t.id),
    ])
    setMatchs(m || [])
    setConvocations(c || [])
    chargerEffectif(t.club_categorie_id)
  }

  function ouvrirNouveau() {
    setEditingId(null)
    setForm({ ...VIDE_TOURNOI, club_categorie_id: categories?.[0]?.id || '' })
    setVue('nouveau')
  }

  function ouvrirModification(t) {
    setEditingId(t.id)
    setForm({
      nom: t.nom || '', organisateur: t.organisateur || '', date_debut: t.date_debut || '', date_fin: t.date_fin || '',
      lieu: t.lieu || '', adresse: t.adresse || '', format: t.format || 'Poules + KO', nb_equipes: t.nb_equipes ?? '',
      statut: t.statut || 'Inscrit', contact_nom: t.contact_nom || '', contact_email: t.contact_email || '', contact_tel: t.contact_tel || '',
      nb_joueurs_max: t.nb_joueurs_max ?? '', notes: t.notes || '', club_categorie_id: t.club_categorie_id || '',
      budget_inscription: t.budget_inscription ?? '',
    })
    setVue('nouveau')
  }

  // Synchronise une dépense budget liée à un poste de coût du tournoi
  // (inscription, transport, hébergement) — un montant à 0/vide supprime
  // l'entrée plutôt que de laisser une dépense à 0€ traîner. source_type
  // (distinct par poste) + source_id permet de retrouver l'entrée pour la
  // mettre à jour ou la supprimer en cascade, plutôt que de la dupliquer à
  // chaque modification. 'tournoi_participation' (sans suffixe) conservé tel
  // quel pour l'inscription afin de ne pas casser les entrées déjà créées.
  async function syncBudgetCout(sourceType, tournoiId, libelle, montant, date) {
    const { data: existant } = await supabase.from('budget_club').select('id')
      .eq('source_type', sourceType).eq('source_id', tournoiId).maybeSingle()
    const m = Number(montant) || 0
    let error = null
    if (m > 0) {
      const champs = { libelle, montant: m, date: date || new Date().toISOString().split('T')[0] }
      if (existant) ({ error } = await supabase.from('budget_club').update(champs).eq('id', existant.id))
      else ({ error } = await supabase.from('budget_club').insert({ ...champs, club_id: clubId, type: 'depense', categorie: 'Tournoi', source_type: sourceType, source_id: tournoiId }))
    } else if (existant) {
      ({ error } = await supabase.from('budget_club').delete().eq('id', existant.id))
    }
    if (error) alert('Budget non synchronisé : ' + error.message)
  }

  const syncBudgetInscription = (tournoiId, nom, montant, date) => syncBudgetCout('tournoi_participation', tournoiId, `Inscription tournoi — ${nom}`, montant, date)
  const syncBudgetTransport = (tournoiId, nom, montant, date) => syncBudgetCout('tournoi_participation_transport', tournoiId, `Transport tournoi — ${nom}`, montant, date)
  const syncBudgetHebergement = (tournoiId, nom, montant, date) => syncBudgetCout('tournoi_participation_hebergement', tournoiId, `Hébergement tournoi — ${nom}`, montant, date)

  async function sauvegarderTournoi() {
    if (!form.nom || !form.date_debut || !form.club_categorie_id) return
    const budgetInscription = form.budget_inscription === '' ? 0 : Number(form.budget_inscription)
    const payload = {
      ...form,
      nb_equipes: form.nb_equipes === '' ? null : Number(form.nb_equipes),
      nb_joueurs_max: form.nb_joueurs_max === '' ? null : Number(form.nb_joueurs_max),
      date_fin: form.date_fin || null,
      budget_inscription: budgetInscription,
    }
    if (editingId) {
      const { data, error } = await supabase.from('tournois_participation').update(payload).eq('id', editingId).select().single()
      if (error) { alert(error.message); return }
      await syncBudgetInscription(editingId, form.nom, budgetInscription, form.date_debut)
      setEditingId(null)
      setSelected(data)
      setVue('detail')
      charger()
      return
    }
    const { data, error } = await supabase.from('tournois_participation').insert({ ...payload, club_id: clubId }).select().single()
    if (error) { alert(error.message); return }
    if (budgetInscription > 0) await syncBudgetInscription(data.id, form.nom, budgetInscription, form.date_debut)
    setVue('liste')
    charger()
  }

  async function supprimerTournoi(id) {
    if (!confirm('Supprimer ce tournoi ? Cette action est définitive.')) return
    await supabase.from('budget_club').delete().eq('source_id', id).in('source_type', ['tournoi_participation', 'tournoi_participation_transport', 'tournoi_participation_hebergement'])
    await supabase.from('tournois_participation').delete().eq('id', id)
    setVue('liste')
    charger()
  }

  async function majChamp(champ, valeur) {
    await supabase.from('tournois_participation').update({ [champ]: valeur }).eq('id', selected.id)
    setSelected(p => ({ ...p, [champ]: valeur }))
    if (champ === 'budget_inscription') await syncBudgetInscription(selected.id, selected.nom, valeur, selected.date_debut)
    if (champ === 'budget_transport') await syncBudgetTransport(selected.id, selected.nom, valeur, selected.date_debut)
    if (champ === 'budget_hebergement') await syncBudgetHebergement(selected.id, selected.nom, valeur, selected.date_debut)
  }

  async function ajouterMatch() {
    if (!formMatch.adversaire) return
    const { error } = await supabase.from('tournois_matchs').insert({
      tournoi_id: selected.id,
      ...formMatch,
      score_nous: formMatch.score_nous === '' ? null : Number(formMatch.score_nous),
      score_eux: formMatch.score_eux === '' ? null : Number(formMatch.score_eux),
      buteurs: formMatch.buteurs ? formMatch.buteurs.split(',').map(b => b.trim()).filter(Boolean) : [],
    })
    if (error) { alert(error.message); return }
    setFormMatch(VIDE_MATCH)
    const { data } = await supabase.from('tournois_matchs').select('*').eq('tournoi_id', selected.id).order('created_at')
    setMatchs(data || [])
  }

  async function supprimerMatch(id) {
    await supabase.from('tournois_matchs').delete().eq('id', id)
    setMatchs(prev => prev.filter(m => m.id !== id))
  }

  async function rechargerConvocations() {
    const { data } = await supabase.from('tournois_convocations').select('*, equipe_joueurs(prenom, nom, poste, numero_maillot)').eq('tournoi_id', selected.id)
    setConvocations(data || [])
  }

  async function toggleConvocation(equipeJoueurId) {
    const exist = convocations.find(c => c.equipe_joueur_id === equipeJoueurId)
    if (exist) await supabase.from('tournois_convocations').delete().eq('id', exist.id)
    else await supabase.from('tournois_convocations').insert({ tournoi_id: selected.id, equipe_joueur_id: equipeJoueurId })
    rechargerConvocations()
  }

  async function majStatutConvocation(convId, statut) {
    await supabase.from('tournois_convocations').update({ statut }).eq('id', convId)
    rechargerConvocations()
  }

  const stats = {
    joues: matchs.filter(m => m.score_nous !== null).length,
    victoires: matchs.filter(m => m.score_nous > m.score_eux).length,
    nuls: matchs.filter(m => m.score_nous === m.score_eux && m.score_nous !== null).length,
    defaites: matchs.filter(m => m.score_nous !== null && m.score_nous < m.score_eux).length,
    butsPour: matchs.reduce((s, m) => s + (m.score_nous || 0), 0),
    butsContre: matchs.reduce((s, m) => s + (m.score_eux || 0), 0),
  }
  const budgetTotal = selected ? (Number(selected.budget_inscription || 0) + Number(selected.budget_transport || 0) + Number(selected.budget_hebergement || 0)) : 0
  const partJoueur = convocations.length > 0 ? (budgetTotal / convocations.length).toFixed(2) : '0.00'
  const nomCategorie = (id) => categories?.find(c => c.id === id)?.nom || '—'

  const st = {
    input: { width: '100%', background: colors.background.raised, border: `1px solid ${colors.border.strong}`, borderRadius: '8px', color: colors.text.primary, padding: '9px 12px', fontSize: '13px', boxSizing: 'border-box' },
    label: { fontSize: '11px', color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px', fontWeight: 700 },
    card: { background: colors.background.surface, border: `1px solid ${colors.border.faint}`, borderRadius: '12px', padding: '18px' },
    btnSolid: { background: colors.accent.green, color: colors.black, border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' },
    btnSecondary: { background: 'transparent', border: `1px solid ${colors.border.strong}`, color: colors.text.secondary, borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px' },
    btnGhost: { background: 'none', border: 'none', color: colors.accent.green, fontWeight: 700, cursor: 'pointer', fontSize: '13px', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' },
  }

  if (sousOnglet === 'organisation') return (
    <div style={{ maxWidth: 900 }}>
      <TitreSection colors={colors} />
      <SousOngletsBar sousOnglet={sousOnglet} setSousOnglet={setSousOnglet} colors={colors} />
      <TournoiOrganise clubId={clubId} userId={userId} readOnly={readOnly} />
    </div>
  )

  if (vue === 'liste') return (
    <div style={{ maxWidth: 900 }}>
      <TitreSection colors={colors} />
      <SousOngletsBar sousOnglet={sousOnglet} setSousOnglet={setSousOnglet} colors={colors} />
      {!readOnly && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <button onClick={ouvrirNouveau} style={st.btnSolid}>+ Nouveau tournoi</button>
        </div>
      )}

      {loading && <div style={{ color: colors.text.faint, textAlign: 'center', padding: '60px' }}>Chargement…</div>}

      {!loading && tournois.length === 0 && (
        <div style={{ ...st.card, textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ color: colors.accent.green, marginBottom: '12px', display: 'flex', justifyContent: 'center' }}><IcoTrophy /></div>
          <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: '16px', marginBottom: '6px' }}>Aucun tournoi enregistré</div>
          <div style={{ color: colors.text.faint, fontSize: '13px', marginBottom: '18px' }}>Ajoutez les tournois auxquels participe votre club</div>
          {!readOnly && <button onClick={ouvrirNouveau} style={st.btnSolid}>+ Ajouter un tournoi</button>}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {tournois.map(t => {
          const date = new Date(t.date_debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
          const couleur = STATUT_COULEUR[t.statut] || colors.text.faint
          return (
            <div key={t.id} onClick={() => ouvrirDetail(t)}
              style={{ ...st.card, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span style={{ background: couleur + '20', color: couleur, border: `1px solid ${couleur}40`, borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: 700 }}>{t.statut}</span>
                  <span style={{ color: colors.text.disabled, fontSize: '12px' }}>{nomCategorie(t.club_categorie_id)}</span>
                </div>
                <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: '15px' }}>{t.nom}</div>
                <div style={{ color: colors.text.faint, fontSize: '12px', marginTop: '3px' }}>
                  {date}{t.lieu ? ` · ${t.lieu}` : ''}{t.format ? ` · ${t.format}` : ''}
                </div>
              </div>
              <div style={{ color: colors.text.disabled }}><IcoChevronRight /></div>
            </div>
          )
        })}
      </div>
    </div>
  )

  if (vue === 'nouveau') return (
    <div style={{ maxWidth: 560 }}>
      <button onClick={() => setVue(editingId ? 'detail' : 'liste')} style={st.btnGhost}><IcoArrowLeft /> Retour</button>
      <h2 style={{ color: colors.text.primary, margin: '16px 0 20px', fontWeight: 900, fontSize: '19px' }}>{editingId ? 'Modifier le tournoi' : 'Nouveau tournoi'}</h2>

      <div style={{ display: 'grid', gap: '14px' }}>
        <div>
          <label style={st.label}>Nom du tournoi *</label>
          <input value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} placeholder="Tournoi de Cannes U18" style={st.input} />
        </div>
        <div>
          <label style={st.label}>Catégorie *</label>
          <select value={form.club_categorie_id} onChange={e => setForm(p => ({ ...p, club_categorie_id: e.target.value }))} style={st.input}>
            <option value="">— Choisir —</option>
            {(categories || []).map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={st.label}>Date début *</label>
            <input type="date" value={form.date_debut} onChange={e => setForm(p => ({ ...p, date_debut: e.target.value }))} style={st.input} />
          </div>
          <div>
            <label style={st.label}>Date fin</label>
            <input type="date" value={form.date_fin} onChange={e => setForm(p => ({ ...p, date_fin: e.target.value }))} style={st.input} />
          </div>
        </div>
        <div>
          <label style={st.label}>Organisateur</label>
          <input value={form.organisateur} onChange={e => setForm(p => ({ ...p, organisateur: e.target.value }))} placeholder="AS Cannes" style={st.input} />
        </div>
        <div>
          <label style={st.label}>Lieu</label>
          <input value={form.lieu} onChange={e => setForm(p => ({ ...p, lieu: e.target.value }))} placeholder="Cannes" style={st.input} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={st.label}>Format</label>
            <select value={form.format} onChange={e => setForm(p => ({ ...p, format: e.target.value }))} style={st.input}>
              {['Poules uniquement', 'Poules + KO', 'Round-robin', 'Élimination directe', 'Système suisse'].map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label style={st.label}>Statut</label>
            <select value={form.statut} onChange={e => setForm(p => ({ ...p, statut: e.target.value }))} style={st.input}>
              {Object.keys(STATUT_COULEUR).map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={st.label}>Contact</label>
            <input value={form.contact_nom} onChange={e => setForm(p => ({ ...p, contact_nom: e.target.value }))} style={st.input} />
          </div>
          <div>
            <label style={st.label}>Nb joueurs max</label>
            <input type="number" value={form.nb_joueurs_max} onChange={e => setForm(p => ({ ...p, nb_joueurs_max: e.target.value }))} style={st.input} />
          </div>
        </div>
        <div>
          <label style={st.label}>Prix d'inscription (€)</label>
          <input type="number" min="0" step="0.01" placeholder="0.00" value={form.budget_inscription} onChange={e => setForm(p => ({ ...p, budget_inscription: e.target.value }))} style={st.input} />
          <div style={{ color: colors.text.disabled, fontSize: '11px', marginTop: '4px' }}>Ajouté automatiquement dans le budget du club (dépense, catégorie Tournoi)</div>
        </div>
        <div>
          <label style={st.label}>Notes</label>
          <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} style={{ ...st.input, resize: 'vertical' }} />
        </div>
        <button onClick={sauvegarderTournoi} disabled={!form.nom || !form.date_debut || !form.club_categorie_id}
          style={{ ...st.btnSolid, opacity: (!form.nom || !form.date_debut || !form.club_categorie_id) ? 0.4 : 1, padding: '13px', fontSize: '14px' }}>
          {editingId ? 'Enregistrer les modifications' : 'Enregistrer le tournoi'}
        </button>
      </div>
    </div>
  )

  if (vue === 'detail' && selected) {
    const onglets = [
      { key: 'apercu', label: 'Aperçu' },
      { key: 'matchs', label: `Matchs (${matchs.length})` },
      { key: 'groupe', label: `Groupe (${convocations.length})` },
      { key: 'logistique', label: 'Logistique' },
      { key: 'bilan', label: 'Bilan' },
    ]
    const couleur = STATUT_COULEUR[selected.statut] || colors.text.faint

    return (
      <div style={{ maxWidth: 900 }}>
        <button onClick={() => setVue('liste')} style={st.btnGhost}><IcoArrowLeft /> Tous les tournois</button>

        <div style={{ ...st.card, margin: '16px 0 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <span style={{ background: couleur + '20', color: couleur, border: `1px solid ${couleur}40`, borderRadius: '20px', padding: '3px 12px', fontSize: '12px', fontWeight: 700 }}>{selected.statut}</span>
                <span style={{ color: colors.text.disabled, fontSize: '12px', padding: '3px 0' }}>{nomCategorie(selected.club_categorie_id)}</span>
              </div>
              <h2 style={{ color: colors.text.primary, margin: '0 0 6px', fontSize: '19px', fontWeight: 900 }}>{selected.nom}</h2>
              <div style={{ color: colors.text.faint, fontSize: '13px' }}>
                {new Date(selected.date_debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                {selected.date_fin && selected.date_fin !== selected.date_debut && ` → ${new Date(selected.date_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                {selected.lieu && ` · ${selected.lieu}`}
              </div>
            </div>
            {!readOnly && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => ouvrirModification(selected)} style={st.btnSecondary}>Modifier</button>
                <button onClick={() => supprimerTournoi(selected.id)} style={{ ...st.btnSecondary, color: colors.accent.red, borderColor: colors.accent.red + '40' }}>Supprimer</button>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {onglets.map(o => (
            <button key={o.key} onClick={() => setOnglet(o.key)}
              style={{ padding: '8px 16px', borderRadius: '20px', border: onglet === o.key ? `2px solid ${colors.accent.green}` : `1px solid ${colors.border.default}`, background: onglet === o.key ? colors.accent.green + '15' : 'transparent', color: onglet === o.key ? colors.accent.green : colors.text.faint, fontWeight: onglet === o.key ? 700 : 400, fontSize: '13px', cursor: 'pointer' }}>
              {o.label}
            </button>
          ))}
        </div>

        {onglet === 'apercu' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { label: 'Organisateur', value: selected.organisateur },
              { label: 'Format', value: selected.format },
              { label: 'Nb équipes', value: selected.nb_equipes },
              { label: 'Contact', value: selected.contact_nom },
              { label: 'Email', value: selected.contact_email },
              { label: 'Téléphone', value: selected.contact_tel },
            ].filter(i => i.value).map(({ label, value }) => (
              <div key={label} style={{ ...st.card, padding: '14px' }}>
                <div style={st.label}>{label}</div>
                <div style={{ color: colors.text.primary, fontSize: '14px', fontWeight: 600 }}>{value}</div>
              </div>
            ))}
            {selected.notes && (
              <div style={{ gridColumn: '1/-1', ...st.card, padding: '14px' }}>
                <div style={st.label}>Notes</div>
                <div style={{ color: colors.text.secondary, fontSize: '13px', lineHeight: 1.5 }}>{selected.notes}</div>
              </div>
            )}
          </div>
        )}

        {onglet === 'matchs' && (
          <div>
            {!readOnly && (
            <div style={{ ...st.card, marginBottom: '20px' }}>
              <div style={{ color: colors.text.secondary, fontSize: '13px', fontWeight: 700, marginBottom: '14px' }}>Ajouter un match</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={st.label}>Adversaire *</label>
                  <input value={formMatch.adversaire} onChange={e => setFormMatch(p => ({ ...p, adversaire: e.target.value }))} placeholder="AS Monaco" style={st.input} />
                </div>
                <div>
                  <label style={st.label}>Phase</label>
                  <select value={formMatch.phase} onChange={e => setFormMatch(p => ({ ...p, phase: e.target.value }))} style={st.input}>
                    {PHASES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={st.label}>Score (Nous)</label>
                  <input type="number" min="0" value={formMatch.score_nous} onChange={e => setFormMatch(p => ({ ...p, score_nous: e.target.value }))} style={st.input} />
                </div>
                <div>
                  <label style={st.label}>Score (Eux)</label>
                  <input type="number" min="0" value={formMatch.score_eux} onChange={e => setFormMatch(p => ({ ...p, score_eux: e.target.value }))} style={st.input} />
                </div>
                <div>
                  <label style={st.label}>Heure</label>
                  <input type="time" value={formMatch.heure} onChange={e => setFormMatch(p => ({ ...p, heure: e.target.value }))} style={st.input} />
                </div>
                <div>
                  <label style={st.label}>Terrain</label>
                  <input value={formMatch.terrain} onChange={e => setFormMatch(p => ({ ...p, terrain: e.target.value }))} style={st.input} />
                </div>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={st.label}>Buteurs (séparés par une virgule)</label>
                <input value={formMatch.buteurs} onChange={e => setFormMatch(p => ({ ...p, buteurs: e.target.value }))} placeholder="Lhyam F., Rayan A." style={st.input} />
              </div>
              <button onClick={ajouterMatch} disabled={!formMatch.adversaire} style={{ ...st.btnSolid, opacity: !formMatch.adversaire ? 0.4 : 1 }}>+ Ajouter</button>
            </div>
            )}

            {matchs.length === 0 && <div style={{ color: colors.text.disabled, textAlign: 'center', padding: '30px' }}>Aucun match enregistré</div>}
            {matchs.map(m => {
              const joue = m.score_nous !== null && m.score_eux !== null
              const res = !joue ? null : m.score_nous > m.score_eux ? 'V' : m.score_nous < m.score_eux ? 'D' : 'N'
              const resCouleur = res === 'V' ? colors.accent.green : res === 'D' ? colors.accent.red : colors.accent.amber
              return (
                <div key={m.id} style={{ ...st.card, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {res && <div style={{ background: resCouleur + '20', color: resCouleur, border: `1px solid ${resCouleur}40`, borderRadius: '8px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '13px', flexShrink: 0 }}>{res}</div>}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                      <span style={{ color: colors.text.primary, fontWeight: 700, fontSize: '14px' }}>vs {m.adversaire}</span>
                      <span style={{ color: colors.text.disabled, fontSize: '12px' }}>{m.phase}</span>
                      {m.heure && <span style={{ color: colors.text.disabled, fontSize: '12px' }}>{m.heure}</span>}
                    </div>
                    {m.buteurs?.length > 0 && <div style={{ color: colors.text.faint, fontSize: '12px' }}>Buteurs : {m.buteurs.join(', ')}</div>}
                  </div>
                  <div style={{ color: colors.text.primary, fontWeight: 900, fontSize: '18px' }}>{joue ? `${m.score_nous} - ${m.score_eux}` : '—'}</div>
                  {!readOnly && <button onClick={() => supprimerMatch(m.id)} style={{ ...st.btnSecondary, color: colors.accent.red, borderColor: colors.accent.red + '40', padding: '6px 10px' }}>Suppr.</button>}
                </div>
              )
            })}
          </div>
        )}

        {onglet === 'groupe' && (
          <div>
            <div style={{ color: colors.text.faint, fontSize: '13px', marginBottom: '16px' }}>
              {convocations.length}/{selected.nb_joueurs_max || '—'} joueurs sélectionnés
            </div>
            {effectif.length === 0 && <div style={{ color: colors.text.disabled, textAlign: 'center', padding: '30px' }}>Aucun joueur dans cette catégorie</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {effectif.map(j => {
                const conv = convocations.find(c => c.equipe_joueur_id === j.id)
                const selectionne = !!conv
                return (
                  <div key={j.id} style={{ ...st.card, padding: '12px 16px', border: `1px solid ${selectionne ? colors.accent.green + '40' : colors.border.faint}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ background: colors.background.raised, borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.accent.green, fontWeight: 700, fontSize: '12px', flexShrink: 0 }}>
                        {j.numero_maillot || '?'}
                      </div>
                      <div>
                        <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: '14px' }}>{j.prenom} {j.nom}</div>
                        <div style={{ color: colors.text.disabled, fontSize: '12px' }}>{j.poste}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {selectionne && (
                        <select value={conv.statut} disabled={readOnly} onChange={e => majStatutConvocation(conv.id, e.target.value)}
                          style={{ background: colors.background.raised, border: `1px solid ${colors.border.strong}`, borderRadius: '6px', padding: '4px 8px', color: conv.statut === 'Présent' ? colors.accent.green : conv.statut === 'Absent' ? colors.accent.red : colors.accent.amber, fontSize: '12px', fontWeight: 700 }}>
                          <option value="En attente">En attente</option>
                          <option value="Présent">Présent</option>
                          <option value="Absent">Absent</option>
                        </select>
                      )}
                      {!readOnly && (
                        <button onClick={() => toggleConvocation(j.id)}
                          style={{ background: selectionne ? colors.accent.red + '15' : colors.accent.green + '15', border: `1px solid ${selectionne ? colors.accent.red + '40' : colors.accent.green + '40'}`, borderRadius: '8px', padding: '6px 14px', color: selectionne ? colors.accent.red : colors.accent.green, fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
                          {selectionne ? 'Retirer' : '+ Sélectionner'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {onglet === 'logistique' && (
          <div style={{ display: 'grid', gap: '14px' }}>
            {[
              { key: 'transport', label: 'Transport', placeholder: 'Bus, covoiturage…' },
              { key: 'heure_rdv', label: 'Heure de RDV', placeholder: '08h00' },
              { key: 'lieu_rdv', label: 'Lieu de RDV', placeholder: 'Parking du stade' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label style={st.label}>{label}</label>
                <input defaultValue={selected[key] || ''} disabled={readOnly} onBlur={e => !readOnly && e.target.value !== (selected[key] || '') && majChamp(key, e.target.value)} placeholder={placeholder} style={{ ...st.input, opacity: readOnly ? 0.6 : 1 }} />
              </div>
            ))}

            <div style={st.card}>
              <div style={{ color: colors.text.secondary, fontWeight: 700, fontSize: '14px', marginBottom: '14px' }}>Budget</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                {[
                  { key: 'budget_inscription', label: 'Inscription' },
                  { key: 'budget_transport', label: 'Transport' },
                  { key: 'budget_hebergement', label: 'Hébergement' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label style={st.label}>{label} (€)</label>
                    <input type="number" defaultValue={selected[key] || 0} disabled={readOnly} onBlur={e => !readOnly && majChamp(key, Number(e.target.value))} style={{ ...st.input, opacity: readOnly ? 0.6 : 1 }} />
                  </div>
                ))}
              </div>
              <div style={{ borderTop: `1px solid ${colors.border.faint}`, paddingTop: '12px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ color: colors.text.secondary, fontSize: '13px' }}>Total : <strong style={{ color: colors.text.primary }}>{budgetTotal}€</strong></div>
                <div style={{ color: colors.text.secondary, fontSize: '13px' }}>Part/joueur ({convocations.length}j) : <strong style={{ color: colors.accent.green }}>{partJoueur}€</strong></div>
              </div>
            </div>
          </div>
        )}

        {onglet === 'bilan' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
              {[
                { label: 'Victoires', value: stats.victoires, color: colors.accent.green },
                { label: 'Nuls', value: stats.nuls, color: colors.accent.amber },
                { label: 'Défaites', value: stats.defaites, color: colors.accent.red },
                { label: 'Buts marqués', value: stats.butsPour, color: colors.accent.green },
                { label: 'Buts encaissés', value: stats.butsContre, color: colors.accent.red },
                { label: 'Matchs joués', value: stats.joues, color: colors.text.primary },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ ...st.card, textAlign: 'center' }}>
                  <div style={{ color, fontSize: '26px', fontWeight: 900 }}>{value}</div>
                  <div style={st.label}>{label}</div>
                </div>
              ))}
            </div>

            <div style={{ ...st.card, marginBottom: '16px' }}>
              <div style={{ color: colors.text.secondary, fontWeight: 700, marginBottom: '12px' }}>Résultat final</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={st.label}>Classement obtenu</label>
                  <input defaultValue={selected.classement_final || ''} disabled={readOnly} onBlur={e => !readOnly && e.target.value !== (selected.classement_final || '') && majChamp('classement_final', e.target.value)} placeholder="1er / Vainqueur / 3ème…" style={{ ...st.input, opacity: readOnly ? 0.6 : 1 }} />
                </div>
                <div>
                  <label style={st.label}>Trophée / récompense</label>
                  <input defaultValue={selected.trophee || ''} disabled={readOnly} onBlur={e => !readOnly && e.target.value !== (selected.trophee || '') && majChamp('trophee', e.target.value)} placeholder="Coupe, médaille…" style={{ ...st.input, opacity: readOnly ? 0.6 : 1 }} />
                </div>
              </div>
            </div>

            {matchs.some(m => m.buteurs?.length > 0) && (
              <div style={st.card}>
                <div style={{ color: colors.text.secondary, fontWeight: 700, marginBottom: '12px' }}>Buteurs du tournoi</div>
                {(() => {
                  const compteur = {}
                  matchs.forEach(m => m.buteurs?.forEach(b => { compteur[b] = (compteur[b] || 0) + 1 }))
                  return Object.entries(compteur).sort((a, b) => b[1] - a[1]).map(([nom, buts]) => (
                    <div key={nom} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${colors.border.faint}` }}>
                      <span style={{ color: colors.text.primary, fontSize: '14px' }}>{nom}</span>
                      <span style={{ color: colors.accent.green, fontWeight: 700 }}>{buts} but{buts > 1 ? 's' : ''}</span>
                    </div>
                  ))
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return null
}

function TitreSection({ colors }) {
  return (
    <div style={{ marginBottom: '4px' }}>
      <div style={{ color: colors.accent.green, fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>Projet Sportif</div>
      <h1 style={{ color: colors.text.primary, fontSize: '22px', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><IcoTrophy /> Tournois</h1>
    </div>
  )
}

function SousOngletsBar({ sousOnglet, setSousOnglet, colors }) {
  return (
    <div style={{ display: 'flex', gap: '6px', margin: '16px 0 20px' }}>
      {SOUS_ONGLETS.map(o => (
        <button key={o.key} onClick={() => setSousOnglet(o.key)}
          style={{ padding: '8px 16px', borderRadius: '20px', border: sousOnglet === o.key ? `2px solid ${colors.accent.green}` : `1px solid ${colors.border.default}`, background: sousOnglet === o.key ? colors.accent.green + '15' : 'transparent', color: sousOnglet === o.key ? colors.accent.green : colors.text.faint, fontWeight: sousOnglet === o.key ? 700 : 400, fontSize: '13px', cursor: 'pointer' }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

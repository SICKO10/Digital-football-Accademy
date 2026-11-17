import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { police } from '../../tokens'
import { styleCarte, styleChamp, styleBoutonPrincipal, styleBoutonSecondaire, couleurCraie, CLASSE_BOUTON, CLASSE_BOUTON_SECONDAIRE, CLASSE_CHAMP } from '../../lib/identite'
import { TitreEcran, Etiquette, CarteChiffre, Icone, EtiquetteStatut } from '../identite'
import { Plus, Trash2, User } from 'lucide-react'

const STATUTS = [
  { val: 'a_faire', label: 'À faire', color: 'orange' },
  { val: 'en_cours', label: 'En cours', color: 'blue' },
  { val: 'terminee', label: 'Terminée', color: 'green' },
]

const emptyResponsabilite = { domaine: '', emoji: '📋', tache: '', responsable_id: '', responsable_nom_libre: '' }
const emptyTache = { titre: '', emoji: '✅', responsable_id: '', responsable_nom_libre: '', echeance: '' }

// Onglet "Tâches & Responsabilités" — responsabilites_club (qui fait quoi, en
// continu) et taches_club (tâches ponctuelles avec statut), toutes deux
// scopées par club_id (cf. supabase_taches_responsabilites_club.sql). Les
// responsables sont choisis parmi educateursAffilies (déjà chargé par
// DashboardClub, mêmes données que club_educateurs — pas de requête propre ici).
export default function TachesClub({ clubId, educateursAffilies, readOnly }) {
  const colors = useColors()
  const [onglet, setOnglet] = useState('responsabilites')
  const [responsabilites, setResponsabilites] = useState([])
  const [taches, setTaches] = useState([])
  const [loading, setLoading] = useState(true)
  const [formResp, setFormResp] = useState(emptyResponsabilite)
  const [formTache, setFormTache] = useState(emptyTache)
  const [ajoutResp, setAjoutResp] = useState(false)
  const [ajoutTache, setAjoutTache] = useState(false)
  const [respModeManuel, setRespModeManuel] = useState(false)
  const [tacheModeManuel, setTacheModeManuel] = useState(false)

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
    const responsableId = respModeManuel ? null : (formResp.responsable_id || null)
    const responsableNom = respModeManuel
      ? (formResp.responsable_nom_libre.trim() || null)
      : (formResp.responsable_id ? nomResponsable(formResp.responsable_id) : null)
    const { data, error } = await supabase.from('responsabilites_club').insert({
      club_id: clubId,
      domaine: formResp.domaine.trim() || null,
      emoji: formResp.emoji || '📋',
      tache: formResp.tache.trim(),
      responsable_id: responsableId,
      responsable_nom: responsableNom,
    }).select().single()
    if (error) return
    setResponsabilites(prev => [data, ...prev])
    setFormResp(emptyResponsabilite)
    setRespModeManuel(false)
    setAjoutResp(false)
  }

  const supprimerResponsabilite = async (id) => {
    if (!confirm('Supprimer cette responsabilité ?')) return
    await supabase.from('responsabilites_club').delete().eq('id', id)
    setResponsabilites(prev => prev.filter(r => r.id !== id))
  }

  const ajouterTache = async () => {
    if (!formTache.titre.trim()) return
    const responsableId = tacheModeManuel ? null : (formTache.responsable_id || null)
    const responsableNom = tacheModeManuel
      ? (formTache.responsable_nom_libre.trim() || null)
      : (formTache.responsable_id ? nomResponsable(formTache.responsable_id) : null)
    const { data, error } = await supabase.from('taches_club').insert({
      club_id: clubId,
      titre: formTache.titre.trim(),
      emoji: formTache.emoji || '✅',
      responsable_id: responsableId,
      responsable_nom: responsableNom,
      echeance: formTache.echeance || null,
    }).select().single()
    if (error) return
    setTaches(prev => [...prev, data].sort((a, b) => (a.echeance || '9999') < (b.echeance || '9999') ? -1 : 1))
    setFormTache(emptyTache)
    setTacheModeManuel(false)
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


  const ouvrirAjout = () => {
    if (onglet === 'responsabilites') setAjoutResp(true)
    else setAjoutTache(true)
  }

  // Mise en forme : kit d'identité (bloc 11), aucun changement de comportement.
  // Les colonnes emoji restent enregistrées en base mais ne sont pas affichées.
  const items = onglet === 'responsabilites' ? responsabilites : taches
  const enCours = taches.filter(t => t.statut === 'en_cours').length
  const terminees = taches.filter(t => t.statut === 'terminee').length
  const aujourdHui = new Date().toISOString().slice(0, 10)
  const enRetard = taches.filter(t => t.echeance && t.echeance < aujourdHui && t.statut !== 'terminee').length
  const craie = `1px solid ${couleurCraie(colors)}`
  const champ = { ...styleChamp(colors), minWidth: 0 }
  const carte = styleCarte(colors)
  const btnMini = { minHeight: '36px', padding: '0 14px', fontSize: '13px', borderRadius: '6px' }

  // Couleur de repère du statut (liseré) : jamais en texte, le libellé porte le sens.
  const couleurStatut = (val) => ({ a_faire: colors.accent.amber, en_cours: colors.accent.info, terminee: colors.accent.success }[val] || colors.text.dim)

  const STATS = [
    { label: 'Responsabilités', value: responsabilites.length, detail: `${responsabilites.filter(r => r.responsable_nom).length} attribuée${responsabilites.filter(r => r.responsable_nom).length > 1 ? 's' : ''}` },
    { label: 'Tâches', value: taches.length, detail: `${taches.length - terminees} ouverte${taches.length - terminees > 1 ? 's' : ''}` },
    { label: 'En cours', value: enCours, detail: enRetard ? `${enRetard} en retard` : 'aucune en retard', alerte: enRetard > 0 },
    { label: 'Terminées', value: terminees, detail: taches.length ? `${Math.round(terminees / taches.length * 100)}\u00A0% des tâches` : '—' },
  ]

  const choixResponsable = (modeManuel, setModeManuel, form, setForm) => (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
      <div role="group" aria-label="Type de responsable" style={{ display: 'inline-flex', gap: '6px' }}>
        {[{ val: false, label: 'Membre du club' }, { val: true, label: 'Autre personne' }].map(m => (
          <button key={String(m.val)} type="button" aria-pressed={modeManuel === m.val} onClick={() => setModeManuel(m.val)} className={CLASSE_BOUTON_SECONDAIRE}
            style={modeManuel === m.val ? { ...styleBoutonPrincipal(colors), ...btnMini } : { ...styleBoutonSecondaire(colors), ...btnMini }}>
            {m.label}
          </button>
        ))}
      </div>
      {modeManuel ? (
        <input className={CLASSE_CHAMP} aria-label="Nom du responsable" value={form.responsable_nom_libre} onChange={e => setForm(f => ({ ...f, responsable_nom_libre: e.target.value }))}
          placeholder="Nom et prénom (hors plateforme)" style={{ ...champ, flex: '1 1 200px', width: 'auto' }} />
      ) : (
        <select className={CLASSE_CHAMP} aria-label="Responsable" value={form.responsable_id} onChange={e => setForm(f => ({ ...f, responsable_id: e.target.value }))} style={{ ...champ, flex: '1 1 200px', width: 'auto' }}>
          <option value="">Responsable (optionnel)</option>
          {educateursAcceptes.map(e => <option key={e.educateur_id} value={e.educateur_id}>{e.educateur?.prenom} {e.educateur?.nom}</option>)}
        </select>
      )}
    </div>
  )
  const boutonsForm = (annuler, valider, invalide) => (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
      <button type="button" onClick={annuler} className={CLASSE_BOUTON_SECONDAIRE} style={styleBoutonSecondaire(colors)}>Annuler</button>
      <button type="button" onClick={valider} disabled={invalide} className={CLASSE_BOUTON} style={styleBoutonPrincipal(colors)}>Ajouter</button>
    </div>
  )
  const boutonSupprimer = (libelle, action) => (
    <button type="button" onClick={action} className={CLASSE_BOUTON_SECONDAIRE}
      style={{ ...styleBoutonSecondaire(colors), minHeight: '36px', minWidth: '36px', padding: 0, border: '1px solid transparent', color: colors.text.dim, flexShrink: 0 }}>
      <Icone icone={Trash2} seule libelle={libelle} />
    </button>
  )
  const personne = (nom) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Icone icone={User} taille={14} />{nom}</span>
  )
  const formulaire = { padding: '16px 18px', borderBottom: craie, display: 'flex', flexDirection: 'column', gap: '10px', background: colors.background.raised }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%' }}>
      <TitreEcran titre="Tâches & Responsabilités" sousTitre="Qui fait quoi dans le club : les responsabilités permanentes et les tâches à échéance." style={{ marginBottom: 0 }}
        actions={!readOnly && (
          <button type="button" onClick={ouvrirAjout} className={CLASSE_BOUTON} style={styleBoutonPrincipal(colors)}>
            <Icone icone={Plus} />{onglet === 'responsabilites' ? 'Nouvelle responsabilité' : 'Nouvelle tâche'}
          </button>
        )} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
        {STATS.map(x => <CarteChiffre key={x.label} etiquette={x.label} valeur={x.value} detail={x.detail} alerte={x.alerte} taille={32} />)}
      </div>

      <div role="group" aria-label="Type de liste" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {[{ val: 'responsabilites', label: 'Responsabilités récurrentes', n: responsabilites.length }, { val: 'taches', label: 'Tâches ponctuelles', n: taches.length }].map(o => (
          <button key={o.val} type="button" aria-pressed={onglet === o.val} onClick={() => setOnglet(o.val)} className={CLASSE_BOUTON_SECONDAIRE}
            style={onglet === o.val ? { ...styleBoutonPrincipal(colors), ...btnMini } : { ...styleBoutonSecondaire(colors), ...btnMini }}>
            {o.label}
            <span style={{ fontFamily: police.titre, fontWeight: 700, fontSize: '15px', fontVariantNumeric: 'tabular-nums' }}>{o.n}</span>
          </button>
        ))}
      </div>
      <p style={{ margin: '-8px 0 0', fontFamily: police.texte, fontSize: '13px', color: colors.text.dim }}>
        {onglet === 'responsabilites'
          ? 'Missions permanentes (licences, communication, matériel…) : à attribuer dès le début de saison pour éviter les oublis.'
          : 'Actions à date butoir (préparer un tournoi, envoyer un document…), avec un responsable et un statut.'}
      </p>

      <div style={{ ...carte, padding: 0, overflow: 'hidden' }}>
        {(ajoutResp && onglet === 'responsabilites') && (
          <div style={formulaire}>
            <Etiquette as="p">Nouvelle responsabilité</Etiquette>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              <input className={CLASSE_CHAMP} aria-label="Domaine" value={formResp.domaine} onChange={e => setFormResp(f => ({ ...f, domaine: e.target.value }))} placeholder="Domaine (ex : Communication, Terrains…)" style={champ} />
              <input className={CLASSE_CHAMP} aria-label="Responsabilité" value={formResp.tache} onChange={e => setFormResp(f => ({ ...f, tache: e.target.value }))} placeholder="Responsabilité (ex : Gérer les réservations)" style={champ} />
            </div>
            {choixResponsable(respModeManuel, setRespModeManuel, formResp, setFormResp)}
            {boutonsForm(() => { setAjoutResp(false); setFormResp(emptyResponsabilite); setRespModeManuel(false) }, ajouterResponsabilite, !formResp.tache.trim())}
          </div>
        )}

        {(ajoutTache && onglet === 'taches') && (
          <div style={formulaire}>
            <Etiquette as="p">Nouvelle tâche</Etiquette>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 170px', gap: '10px' }}>
              <input className={CLASSE_CHAMP} aria-label="Titre de la tâche" value={formTache.titre} onChange={e => setFormTache(f => ({ ...f, titre: e.target.value }))} placeholder="Titre de la tâche" style={champ} />
              <input className={CLASSE_CHAMP} type="date" value={formTache.echeance} onChange={e => setFormTache(f => ({ ...f, echeance: e.target.value }))} aria-label="Échéance" title="Échéance" style={champ} />
            </div>
            {choixResponsable(tacheModeManuel, setTacheModeManuel, formTache, setFormTache)}
            {boutonsForm(() => { setAjoutTache(false); setFormTache(emptyTache); setTacheModeManuel(false) }, ajouterTache, !formTache.titre.trim())}
          </div>
        )}

        {loading ? (
          <p style={{ color: colors.text.dim, fontSize: '14px', padding: '20px', margin: 0 }}>Chargement...</p>
        ) : items.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <p style={{ fontFamily: police.texte, color: colors.text.primary, fontWeight: 600, fontSize: '16px', margin: '0 0 4px' }}>
              Aucune {onglet === 'responsabilites' ? 'responsabilité' : 'tâche'} pour l'instant
            </p>
            <p style={{ fontFamily: police.texte, color: colors.text.dim, fontSize: '14px', margin: '0 0 16px' }}>
              {onglet === 'responsabilites' ? 'Attribue les missions permanentes du club à tes membres.' : 'Ajoute une tâche avec un responsable et une échéance.'}
            </p>
            {!readOnly && !(ajoutResp || ajoutTache) && (
              <button type="button" onClick={ouvrirAjout} className={CLASSE_BOUTON_SECONDAIRE} style={styleBoutonSecondaire(colors)}>
                <Icone icone={Plus} />Ajouter
              </button>
            )}
          </div>
        ) : onglet === 'responsabilites' ? (
          responsabilites.map(r => (
            <div key={r.id} style={{ padding: '12px 18px', borderBottom: craie, display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                {r.domaine && <Etiquette as="p" style={{ fontSize: '11px' }}>{r.domaine}</Etiquette>}
                <p style={{ margin: '2px 0 0', fontFamily: police.texte, color: colors.text.primary, fontWeight: 600, fontSize: '16px' }}>{r.tache}</p>
              </div>
              <EtiquetteStatut couleur={r.responsable_nom ? colors.text.dim : colors.accent.amber} style={{ textTransform: 'none', letterSpacing: 0, fontSize: '13px', fontWeight: 600 }}>
                {personne(r.responsable_nom || 'Non attribuée')}
              </EtiquetteStatut>
              {!readOnly && boutonSupprimer(`Supprimer la responsabilité « ${r.tache} »`, () => supprimerResponsabilite(r.id))}
            </div>
          ))
        ) : (
          taches.map(t => {
            const retard = t.echeance && t.echeance < aujourdHui && t.statut !== 'terminee'
            return (
              <div key={t.id} style={{ padding: '12px 18px 12px 21px', borderBottom: craie, display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', boxShadow: `inset 3px 0 0 ${couleurStatut(t.statut)}`, opacity: t.statut === 'terminee' ? 0.7 : 1 }}>
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <p style={{ margin: 0, fontFamily: police.texte, color: colors.text.primary, fontWeight: 600, fontSize: '16px', textDecoration: t.statut === 'terminee' ? 'line-through' : 'none' }}>{t.titre}</p>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginTop: '4px', fontFamily: police.texte, fontSize: '13px', color: colors.text.dim }}>
                    {t.responsable_nom && personne(t.responsable_nom)}
                    {t.echeance && <span>Échéance {new Date(t.echeance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                    {retard && <EtiquetteStatut couleur={colors.accent.red}>En retard</EtiquetteStatut>}
                  </div>
                </div>
                <select className={CLASSE_CHAMP} aria-label={`Statut de la tâche « ${t.titre} »`} value={t.statut} disabled={readOnly} onChange={e => changerStatut(t.id, e.target.value)}
                  style={{ ...champ, width: 'auto', minHeight: '36px', padding: '0 10px', fontSize: '14px', fontWeight: 600, flexShrink: 0, cursor: readOnly ? 'default' : 'pointer' }}>
                  {STATUTS.map(x => <option key={x.val} value={x.val}>{x.label}</option>)}
                </select>
                {!readOnly && boutonSupprimer(`Supprimer la tâche « ${t.titre} »`, () => supprimerTache(t.id))}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

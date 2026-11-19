import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { useCoachTheme } from './useCoachTheme'
import { TYPE_LABEL } from './constants'
import Card from '../../components/coachAdmin/Card'
import FilterBar from '../../components/coachAdmin/FilterBar'
import Pill from '../../components/coachAdmin/Pill'
import SimpleTable from '../../components/coachAdmin/SimpleTable'
import StatCard from '../../components/coachAdmin/StatCard'
import Tabs from '../../components/coachAdmin/Tabs'
import {
  CATEGORIES, LIBELLE_CATEGORIE, STATUTS, LIBELLE_STATUT, VARIANTE_STATUT, TYPES_ECHANGE, LIBELLE_ORIGINE,
  statsTests, etatTest, joursRestants,
} from '../../lib/crm'

// CRM commercial (admin) : suivi des prospects et clients par catégorie, journal
// des échanges, et mesure de la phase test (conversion, délai, durée d'offre).
// Les essais et offres d'outils arrivent tout seuls dans crm_admin_tests (déclencheur
// SQL sur outils_comptes) ; supabase_crm_admin.sql doit avoir été exécuté.

const aujourdhui = () => new Date().toISOString().slice(0, 10)
const dateFr = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
const FICHE_VIDE = { categorie: 'club', nom: '', structure: '', contact_nom: '', email: '', telephone: '', ville: '', source: '', statut: 'nouveau', offre_visee: '', prochaine_action: '', date_relance: '', motif_perte: '', responsable: '' }
const vide = (v) => (typeof v === 'string' && v.trim() === '' ? null : v)

export default function CRM({ auteur }) {
  const { c, fonts, rgba } = useCoachTheme()
  const [onglet, setOnglet] = useState('pipeline')
  const [fiches, setFiches] = useState(null)
  const [tests, setTests] = useState([])
  const [comptes, setComptes] = useState({}) // id profil -> profil
  const [erreur, setErreur] = useState('')
  const [categorie, setCategorie] = useState('toutes')
  const [statut, setStatut] = useState('tous')
  const [aRelancer, setARelancer] = useState(false)
  const [recherche, setRecherche] = useState('')
  const [nouvelle, setNouvelle] = useState(false)

  const [version, setVersion] = useState(0)
  const charger = useCallback(() => setVersion(v => v + 1), [])

  useEffect(() => {
    let actif = true
    Promise.all([
      supabase.from('crm_admin_fiches').select('*').order('maj_le', { ascending: false }),
      supabase.from('crm_admin_tests').select('*').order('debut_le', { ascending: false }),
    ]).then(async ([f, t]) => {
      if (!actif) return
      const err = f.error || t.error
      if (err) {
        setErreur(err.code === '42P01'
          ? "Les tables du CRM n'existent pas encore en base : exécute supabase_crm_admin.sql dans l'éditeur SQL Supabase."
          : `Erreur de chargement : ${err.message}`)
        setFiches([])
        return
      }
      setErreur('')
      setFiches(f.data || [])
      setTests(t.data || [])
      const ids = [...new Set([...(f.data || []).map(x => x.profile_id), ...(t.data || []).map(x => x.compte_id)].filter(Boolean))]
      if (ids.length) {
        const { data } = await supabase.from('profiles').select('id, prenom, nom, email, plan, abonnement_actif').in('id', ids)
        if (actif) setComptes(Object.fromEntries((data || []).map(p => [p.id, p])))
      }
    })
    return () => { actif = false }
  }, [version])

  const champ = { background: c.surface2, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '8px 10px', color: c.text, fontSize: '13px', boxSizing: 'border-box', fontFamily: 'Barlow, sans-serif', width: '100%' }
  const etiquette = { margin: '0 0 4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: c.textMuted }
  const bouton = (plein, danger) => ({
    background: plein ? c.accent : 'transparent', color: plein ? '#fff' : (danger ? c.danger : c.text),
    border: plein ? 'none' : `1px solid ${danger ? rgba(c.danger, 0.4) : c.border}`,
    borderRadius: '8px', padding: '8px 16px', fontWeight: 700, fontSize: '12px', cursor: 'pointer', fontFamily: 'Barlow, sans-serif',
  })
  const ui = { c, fonts, rgba, champ, etiquette, bouton }

  const nomCompte = (id) => { const p = comptes[id]; return p ? (`${p.prenom || ''} ${p.nom || ''}`.trim() || p.email) : null }

  const filtrees = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return (fiches || []).filter(f => {
      if (categorie !== 'toutes' && f.categorie !== categorie) return false
      if (statut !== 'tous' && f.statut !== statut) return false
      if (aRelancer && !(f.date_relance && f.date_relance <= aujourdhui() && !['converti', 'perdu'].includes(f.statut))) return false
      if (q && !`${f.nom} ${f.structure || ''} ${f.contact_nom || ''} ${f.email || ''} ${f.ville || ''}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [fiches, categorie, statut, aRelancer, recherche])

  if (fiches === null) return <p style={{ color: c.textMuted, textAlign: 'center', padding: '2rem' }}>Chargement...</p>
  if (erreur) return <div role="alert" style={{ padding: '12px 16px', background: rgba(c.danger, 0.1), border: `1px solid ${rgba(c.danger, 0.35)}`, borderRadius: 8, color: c.danger, fontSize: 13 }}>{erreur}</div>

  const nbRelances = fiches.filter(f => f.date_relance && f.date_relance <= aujourdhui() && !['converti', 'perdu'].includes(f.statut)).length

  const colonnes = [
    { key: 'nom', label: 'Nom', render: f => <strong>{f.nom}</strong> },
    { key: 'categorie', label: 'Catégorie', render: f => LIBELLE_CATEGORIE[f.categorie] },
    { key: 'structure', label: 'Structure', render: f => f.structure || '—' },
    { key: 'statut', label: 'Statut', render: f => <Pill variant={VARIANTE_STATUT[f.statut]}>{LIBELLE_STATUT[f.statut]}</Pill> },
    { key: 'prochaine', label: 'Prochaine action', render: f => f.prochaine_action || '—' },
    { key: 'relance', label: 'Relance', render: f => {
      if (!f.date_relance) return '—'
      const retard = f.date_relance <= aujourdhui() && !['converti', 'perdu'].includes(f.statut)
      return <span style={{ color: retard ? c.danger : c.text, fontWeight: retard ? 700 : 400 }}>{dateFr(f.date_relance)}</span>
    } },
  ]

  return (
    <>
      <Tabs active={onglet} onChange={setOnglet} tabs={[{ id: 'pipeline', label: 'Suivi commercial' }, { id: 'tests', label: 'Phase test' }]} />

      {onglet === 'pipeline' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 16 }}>
            {STATUTS.map(s => (
              <StatCard key={s.id} label={s.label} value={fiches.filter(f => f.statut === s.id && (categorie === 'toutes' || f.categorie === categorie)).length}
                active={statut === s.id} onClick={() => setStatut(statut === s.id ? 'tous' : s.id)}
                accent={s.id === 'converti' ? c.success : s.id === 'perdu' ? c.textMuted : c.accent} />
            ))}
          </div>

          <FilterBar
            toggles={[
              { key: 'toutes', label: 'Toutes catégories', active: categorie === 'toutes', onClick: () => setCategorie('toutes') },
              ...CATEGORIES.map(ca => ({ key: ca.id, label: ca.label, active: categorie === ca.id, onClick: () => setCategorie(ca.id) })),
              { key: 'relance', label: `À relancer (${nbRelances})`, active: aRelancer, onClick: () => setARelancer(v => !v) },
            ]}
            search={recherche} onSearchChange={setRecherche} searchPlaceholder="Nom, structure, ville..."
          />

          <div style={{ marginBottom: 14 }}>
            <button type="button" style={bouton(true)} onClick={() => setNouvelle(v => !v)}>{nouvelle ? 'Fermer' : 'Nouvelle fiche'}</button>
          </div>

          {nouvelle && (
            <Card style={{ marginBottom: 16 }}>
              <FormulaireFiche ui={ui} fiche={FICHE_VIDE} etiquetteBouton="Créer la fiche"
                onSave={async (valeurs) => {
                  const { error } = await supabase.from('crm_admin_fiches').insert({ ...valeurs, responsable: valeurs.responsable || auteur || null })
                  if (error) return error.message
                  setNouvelle(false); await charger(); return null
                }} />
            </Card>
          )}

          <Card>
            <SimpleTable columns={colonnes} rows={filtrees} rowKey="id" emptyLabel="Aucune fiche pour ces filtres"
              renderExpanded={(f) => (
                <DetailFiche key={f.id} ui={ui} fiche={f} auteur={auteur} compte={f.profile_id ? comptes[f.profile_id] : null}
                  tests={tests.filter(t => t.fiche_id === f.id || (f.profile_id && t.compte_id === f.profile_id))}
                  rechargement={charger} />
              )} />
          </Card>
        </>
      )}

      {onglet === 'tests' && <OngletTests ui={ui} tests={tests} fiches={fiches} nomCompte={nomCompte} rechargement={charger} />}
    </>
  )
}

function Champ({ ui, label, children, large }) {
  return <label style={{ flex: large ? '2 1 260px' : '1 1 180px', minWidth: 0 }}><p style={ui.etiquette}>{label}</p>{children}</label>
}

function FormulaireFiche({ ui, fiche, onSave, etiquetteBouton }) {
  const { c, champ, bouton, rgba } = ui
  const [v, setV] = useState({ ...fiche, date_relance: fiche.date_relance || '' })
  const [msg, setMsg] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const maj = (k) => (e) => setV(prev => ({ ...prev, [k]: e.target.value }))

  const enregistrer = async () => {
    if (!v.nom.trim()) { setMsg('Le nom est obligatoire.'); return }
    setEnvoi(true); setMsg('')
    const payload = {
      categorie: v.categorie, nom: v.nom.trim(), statut: v.statut,
      structure: vide(v.structure), contact_nom: vide(v.contact_nom), email: vide(v.email), telephone: vide(v.telephone),
      ville: vide(v.ville), source: vide(v.source), offre_visee: vide(v.offre_visee), prochaine_action: vide(v.prochaine_action),
      date_relance: v.date_relance || null, motif_perte: v.statut === 'perdu' ? vide(v.motif_perte) : null, responsable: vide(v.responsable),
    }
    const erreur = await onSave(payload)
    setEnvoi(false)
    if (erreur) setMsg(erreur)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <Champ ui={ui} label="Catégorie"><select value={v.categorie} onChange={maj('categorie')} style={champ}>{CATEGORIES.map(ca => <option key={ca.id} value={ca.id}>{LIBELLE_CATEGORIE[ca.id]}</option>)}</select></Champ>
        <Champ ui={ui} label="Nom de la fiche" large><input value={v.nom} onChange={maj('nom')} style={champ} placeholder="Club, joueur ou éducateur" /></Champ>
        <Champ ui={ui} label="Statut"><select value={v.statut} onChange={maj('statut')} style={champ}>{STATUTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></Champ>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <Champ ui={ui} label="Structure (club, équipe)"><input value={v.structure || ''} onChange={maj('structure')} style={champ} /></Champ>
        <Champ ui={ui} label="Personne à contacter"><input value={v.contact_nom || ''} onChange={maj('contact_nom')} style={champ} /></Champ>
        <Champ ui={ui} label="Email"><input type="email" value={v.email || ''} onChange={maj('email')} style={champ} /></Champ>
        <Champ ui={ui} label="Téléphone"><input value={v.telephone || ''} onChange={maj('telephone')} style={champ} /></Champ>
        <Champ ui={ui} label="Ville"><input value={v.ville || ''} onChange={maj('ville')} style={champ} /></Champ>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <Champ ui={ui} label="D'où vient le contact"><input value={v.source || ''} onChange={maj('source')} style={champ} placeholder="Recommandation, salon, réseau..." /></Champ>
        <Champ ui={ui} label="Offre visée"><input value={v.offre_visee || ''} onChange={maj('offre_visee')} style={champ} /></Champ>
        <Champ ui={ui} label="Prochaine action" large><input value={v.prochaine_action || ''} onChange={maj('prochaine_action')} style={champ} /></Champ>
        <Champ ui={ui} label="Date de relance"><input type="date" value={v.date_relance || ''} onChange={maj('date_relance')} style={champ} /></Champ>
        <Champ ui={ui} label="Responsable"><input value={v.responsable || ''} onChange={maj('responsable')} style={champ} /></Champ>
      </div>
      {v.statut === 'perdu' && (
        <div style={{ marginBottom: 12 }}><Champ ui={ui} label="Pourquoi perdu"><input value={v.motif_perte || ''} onChange={maj('motif_perte')} style={champ} /></Champ></div>
      )}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button type="button" onClick={enregistrer} disabled={envoi} style={{ ...bouton(true), opacity: envoi ? 0.6 : 1 }}>{envoi ? 'Enregistrement...' : etiquetteBouton}</button>
        {msg && <span role="alert" style={{ fontSize: 12, color: c.danger, fontWeight: 600, background: rgba(c.danger, 0.08), padding: '4px 8px', borderRadius: 6 }}>{msg}</span>}
      </div>
    </div>
  )
}

function DetailFiche({ ui, fiche, compte, tests, auteur, rechargement }) {
  const { c, champ, bouton, etiquette, fonts } = ui
  const [echanges, setEchanges] = useState(null)
  const [type, setType] = useState('appel')
  const [contenu, setContenu] = useState('')
  const [emailCompte, setEmailCompte] = useState('')
  const [msg, setMsg] = useState('')
  const [outilManuel, setOutilManuel] = useState('')
  const [joursManuel, setJoursManuel] = useState('14')

  const [versionEchanges, setVersionEchanges] = useState(0)
  const chargerEchanges = () => setVersionEchanges(v => v + 1)
  useEffect(() => {
    let actif = true
    supabase.from('crm_admin_echanges').select('*').eq('fiche_id', fiche.id).order('cree_le', { ascending: false })
      .then(({ data }) => { if (actif) setEchanges(data || []) })
    return () => { actif = false }
  }, [fiche.id, versionEchanges])

  const ajouterEchange = async () => {
    if (!contenu.trim()) return
    const { error } = await supabase.from('crm_admin_echanges').insert({ fiche_id: fiche.id, type, contenu: contenu.trim(), auteur_nom: auteur || null })
    if (error) { setMsg(error.message); return }
    setContenu(''); setMsg(''); chargerEchanges()
  }

  const rattacher = async () => {
    const e = emailCompte.trim().toLowerCase()
    if (!e) return
    const { data, error } = await supabase.from('profiles').select('id, plan').ilike('email', e).limit(1)
    if (error) { setMsg(error.message); return }
    if (!data?.length) { setMsg('Aucun compte avec cet email.'); return }
    const { error: e2 } = await supabase.from('crm_admin_fiches').update({ profile_id: data[0].id }).eq('id', fiche.id)
    if (e2) { setMsg(e2.message); return }
    // Les essais déjà en cours de ce compte rejoignent la fiche.
    await supabase.from('crm_admin_tests').update({ fiche_id: fiche.id }).eq('compte_id', data[0].id).is('fiche_id', null)
    setMsg(''); setEmailCompte(''); rechargement()
  }

  const detacher = async () => {
    const { error } = await supabase.from('crm_admin_fiches').update({ profile_id: null }).eq('id', fiche.id)
    if (error) setMsg(error.message); else rechargement()
  }

  const ajouterEssai = async () => {
    const jours = parseInt(joursManuel, 10)
    if (!(jours > 0)) { setMsg('Durée invalide.'); return }
    const fin = new Date(Date.now() + jours * 86400000).toISOString()
    const { error } = await supabase.from('crm_admin_tests').insert({
      fiche_id: fiche.id, compte_id: fiche.profile_id, categorie: fiche.categorie, outil: vide(outilManuel) , origine: 'manuel', fin_le: fin, duree_jours: jours,
    })
    if (error) { setMsg(error.message); return }
    if (['nouveau', 'contacte', 'echange'].includes(fiche.statut)) await supabase.from('crm_admin_fiches').update({ statut: 'test' }).eq('id', fiche.id)
    setOutilManuel(''); setMsg(''); rechargement()
  }

  const supprimer = async () => {
    if (!window.confirm(`Supprimer définitivement la fiche « ${fiche.nom} » et son journal ?`)) return
    const { error } = await supabase.from('crm_admin_fiches').delete().eq('id', fiche.id)
    if (error) setMsg(error.message); else rechargement()
  }

  const titre = { margin: '0 0 10px', fontFamily: fonts.display, fontSize: 14, fontWeight: 600, color: c.text }

  return (
    <div style={{ cursor: 'default', whiteSpace: 'normal' }} onClick={e => e.stopPropagation()}>
      <FormulaireFiche ui={ui} fiche={fiche} etiquetteBouton="Enregistrer les modifications"
        onSave={async (valeurs) => {
          const { error } = await supabase.from('crm_admin_fiches').update(valeurs).eq('id', fiche.id)
          if (error) return error.message
          await rechargement(); return null
        }} />

      <hr style={{ border: 'none', borderTop: `1px solid ${c.border}`, margin: '18px 0' }} />

      <p style={titre}>Compte sur la plateforme</p>
      {compte ? (
        <p style={{ fontSize: 13, color: c.text, margin: '0 0 6px' }}>
          {`${compte.prenom || ''} ${compte.nom || ''}`.trim() || compte.email} · {TYPE_LABEL[compte.plan] || compte.plan}
          {' · '}<Pill variant={compte.abonnement_actif ? 'active' : 'inactive'}>{compte.abonnement_actif ? 'Abonnement actif' : 'Pas d\'abonnement actif'}</Pill>
          {' '}<button type="button" onClick={detacher} style={{ ...bouton(false), padding: '3px 10px', marginLeft: 8 }}>Détacher</button>
        </p>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={emailCompte} onChange={e => setEmailCompte(e.target.value)} placeholder="Email du compte inscrit" style={{ ...champ, flex: '1 1 240px', width: 'auto' }} />
          <button type="button" onClick={rattacher} style={bouton(false)}>Rattacher</button>
          <span style={{ fontSize: 12, color: c.textMuted }}>Rattacher permet de suivre ses essais et son paiement automatiquement.</span>
        </div>
      )}

      <hr style={{ border: 'none', borderTop: `1px solid ${c.border}`, margin: '18px 0' }} />

      <p style={titre}>Essais de cette fiche</p>
      {tests.length === 0 && <p style={{ fontSize: 12, color: c.textMuted, margin: '0 0 10px' }}>Aucun essai pour l'instant.</p>}
      {tests.map(t => <LigneTest key={t.id} ui={ui} t={t} rechargement={rechargement} />)}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 10 }}>
        <label style={{ flex: '1 1 180px' }}><p style={etiquette}>Essai à la main : nom</p><input value={outilManuel} onChange={e => setOutilManuel(e.target.value)} placeholder="Ex. Pro joueur" style={champ} /></label>
        <label style={{ flex: '0 1 100px' }}><p style={etiquette}>Jours</p><input type="number" min={1} value={joursManuel} onChange={e => setJoursManuel(e.target.value)} style={champ} /></label>
        <button type="button" onClick={ajouterEssai} style={bouton(false)}>Ajouter l'essai</button>
      </div>
      <p style={{ fontSize: 12, color: c.textMuted, margin: '6px 0 0' }}>Les essais et offres d'outils (éducateurs, clubs) s'ajoutent tout seuls quand le compte est rattaché.</p>

      <hr style={{ border: 'none', borderTop: `1px solid ${c.border}`, margin: '18px 0' }} />

      <p style={titre}>Journal des échanges</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <select value={type} onChange={e => setType(e.target.value)} style={{ ...champ, width: 'auto' }}>{TYPES_ECHANGE.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
        <input value={contenu} onChange={e => setContenu(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') ajouterEchange() }} placeholder="Ce qui a été dit ou décidé" style={{ ...champ, flex: '1 1 260px', width: 'auto' }} />
        <button type="button" onClick={ajouterEchange} style={bouton(true)}>Ajouter</button>
      </div>
      {echanges === null ? <p style={{ fontSize: 12, color: c.textMuted }}>Chargement...</p>
        : echanges.length === 0 ? <p style={{ fontSize: 12, color: c.textMuted }}>Aucun échange noté.</p>
        : echanges.map(e => (
          <p key={e.id} style={{ margin: '0 0 6px', fontSize: 13, color: c.text, lineHeight: 1.5 }}>
            <span style={{ color: c.textMuted, fontSize: 12 }}>{dateFr(e.cree_le)} · {TYPES_ECHANGE.find(t => t.id === e.type)?.label}{e.auteur_nom ? ` · ${e.auteur_nom}` : ''} : </span>{e.contenu}
          </p>
        ))}

      {msg && <p role="alert" style={{ marginTop: 12, fontSize: 12, color: c.danger, fontWeight: 600 }}>{msg}</p>}
      <div style={{ marginTop: 16 }}><button type="button" onClick={supprimer} style={bouton(false, true)}>Supprimer la fiche</button></div>
    </div>
  )
}

function LigneTest({ ui, t, rechargement, nom }) {
  const { c, bouton } = ui
  const etat = etatTest(t)
  const reste = joursRestants(t)
  const convertir = async () => {
    const { error } = await supabase.from('crm_admin_tests').update({ converti_le: new Date().toISOString() }).eq('id', t.id)
    if (error) alert('Erreur : ' + error.message); else rechargement()
  }
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', margin: '0 0 6px', fontSize: 13, color: c.text }}>
      {nom && <strong>{nom}</strong>}
      <span>{t.outil || 'Essai libre'}</span>
      <span style={{ color: c.textMuted, fontSize: 12 }}>{LIBELLE_ORIGINE[t.origine]} · du {dateFr(t.debut_le)}{t.fin_le ? ` au ${dateFr(t.fin_le)}` : ''}{t.duree_jours ? ` (${t.duree_jours} j)` : ''}</span>
      {etat === 'converti' && <Pill variant="success">Converti le {dateFr(t.converti_le)}</Pill>}
      {etat === 'en_cours' && <Pill variant="pending">{reste !== null ? `${reste} j restants` : 'En cours'}</Pill>}
      {etat === 'expire' && <Pill variant="inactive">Terminé sans achat</Pill>}
      {etat !== 'converti' && <button type="button" onClick={convertir} style={{ ...bouton(false), padding: '3px 10px' }}>Marquer converti</button>}
    </div>
  )
}

function OngletTests({ ui, tests, fiches, nomCompte, rechargement }) {
  const { c, fonts } = ui
  const s = useMemo(() => statsTests(tests), [tests])
  const nomFiche = (t) => fiches.find(f => f.id === t.fiche_id)?.nom || nomCompte(t.compte_id) || 'Compte inconnu'

  const ligneStats = (label, r) => ({ label, ...r })
  const colonnesStats = (premiere) => [
    { key: 'label', label: premiere, render: r => r.label },
    { key: 'total', label: 'Essais', render: r => r.total },
    { key: 'enCours', label: 'En cours', render: r => r.enCours },
    { key: 'convertis', label: 'Convertis', render: r => r.convertis },
    { key: 'expires', label: 'Sans achat', render: r => r.expires },
    { key: 'taux', label: 'Conversion', render: r => <strong>{r.taux === null ? '—' : `${r.taux} %`}</strong> },
  ]
  const titre = { margin: '0 0 12px', fontFamily: fonts.display, fontSize: 15, fontWeight: 600, color: c.text }

  if (tests.length === 0) {
    return <Card><p style={{ margin: 0, fontSize: 13, color: c.textMuted, lineHeight: 1.6 }}>Aucun essai enregistré pour l'instant. Dès qu'un éducateur ou un club lance un essai, ou que tu offres un outil depuis « Offres Outils », il apparaît ici tout seul. Pour un essai hors outils, ouvre une fiche et utilise « Ajouter l'essai ».</p></Card>
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
        <StatCard label="Conversion" value={s.global.taux === null ? '—' : `${s.global.taux} %`} sub={`${s.global.convertis} payants sur ${s.global.convertis + s.global.expires} essais terminés`} accent={c.success} />
        <StatCard label="Délai moyen" value={s.delaiMoyen === null ? '—' : `${s.delaiMoyen} j`} sub="du début de l'essai au paiement" />
        <StatCard label="Essais en cours" value={s.global.enCours} />
        <StatCard label="Finissent sous 7 jours" value={s.bientot.length} accent={c.warn} />
      </div>

      <Card style={{ marginBottom: 16 }}>
        <p style={titre}>Quelle durée d'offre convertit le mieux</p>
        <SimpleTable columns={colonnesStats('Durée')} rows={s.parDuree.filter(r => r.total > 0).map(r => ligneStats(r.label, r))} rowKey="label" emptyLabel="Pas encore de durée connue" />
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <p style={titre}>Par catégorie</p>
        <SimpleTable columns={colonnesStats('Catégorie')} rows={s.parCategorie.map(r => ligneStats(r.label, r))} rowKey="label" />
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <p style={titre}>Par outil</p>
        <SimpleTable columns={colonnesStats('Outil')} rows={s.outils.map(r => ligneStats(r.outil === 'sans_outil' ? 'Essai libre' : r.outil, r))} rowKey="label" />
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <p style={titre}>À relancer avant la fin de l'essai</p>
        {s.bientot.length === 0 ? <p style={{ margin: 0, fontSize: 13, color: c.textMuted }}>Aucun essai ne se termine dans les 7 prochains jours.</p>
          : s.bientot.map(t => <LigneTest key={t.id} ui={ui} t={t} nom={nomFiche(t)} rechargement={rechargement} />)}
      </Card>

      <Card>
        <p style={titre}>Tous les essais</p>
        {tests.map(t => <LigneTest key={t.id} ui={ui} t={t} nom={nomFiche(t)} rechargement={rechargement} />)}
      </Card>
    </>
  )
}

// Modèle de fiche d'évaluation, par catégorie. Deux usages :
//  - mode 'club' : fiche du club (Projet sportif > pôle > Critères d'évaluation) ;
//  - mode 'educateur' : fiche de l'éducateur (Rapports & Évaluations > Ma fiche). Un éducateur affilié
//    complète la fiche du club si le club l'autorise (critères obligatoires verrouillés) ; un
//    éducateur indépendant compose sa fiche librement.
// On part de la bibliothèque Digital Football (tranche d'âge de la catégorie), on coche les critères
// voulus, on peut marquer des critères obligatoires et en créer. Chaque action s'enregistre tout de
// suite dans la version en brouillon ; « Publier » fige la version (elle ne peut plus changer, une
// nouvelle version se crée pour modifier). Tables : parametres_evaluation, modeles_evaluation,
// modeles_evaluation_versions, criteres_evaluation (supabase_fiches_evaluation_bloc1.sql).
import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { labelCategorie } from '../../lib/categories'
import { police } from '../../tokens'
import BoutonImprimerEvaluation from '../ImprimerEvaluation'
import { PILIERS, POSTES, trancheDeCategorie, dispoPour, LIBELLE_TRANCHE } from './BibliothequeCriteres'

const PILIER_TESTS = 'Tests'
const PILIER_OUINON = 'Oui / non'
const PILIER_POSTE = 'Par poste'
const cleCategorie = (cat) => String(cat || '').toUpperCase()
const LIBELLE_TYPE = { note: 'Note de 1 à 3', test: 'Test chiffré', oui_non: 'Oui / non', commentaire: 'Commentaire libre' }

// Pilier sous lequel un critère de la bibliothèque est rangé dans la fiche.
function pilierDeBiblio(b) {
  if (b.type === 'test') return PILIER_TESTS
  if (b.type === 'oui_non') return PILIER_OUINON
  if (b.poste) return PILIER_POSTE
  const p = PILIERS.find(x => x.key === b.pilier)
  return p ? p.label : 'Autre'
}

const CRITERE_VIDE = { pilier: 'Technique', type: 'note', libelle: '', acquis_quand: '', unite: '', sens: 'plus_haut', objectif: '', poste: '' }

export default function ModeleEvaluationClub({ categories = [], clubId, couleur, peutEditer = false, mode = 'club', educateurId = null }) {
  const colors = useColors()
  const estEduc = mode === 'educateur'
  // Propriétaire des réglages : le club, ou l'éducateur indépendant (jamais le club pour un affilié : lecture seule)
  const proprioParams = estEduc && !clubId ? educateurId : clubId
  const [biblio, setBiblio] = useState([])
  const [params, setParams] = useState(null)
  const [modeles, setModeles] = useState([])
  const [modelesClub, setModelesClub] = useState([]) // fiches du club vues par un éducateur affilié
  const [versions, setVersions] = useState([])
  const [criteres, setCriteres] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [occupe, setOccupe] = useState(false)
  const [categorie, setCategorie] = useState(categories[0] || '')
  const [formOuvert, setFormOuvert] = useState(false)
  const [form, setForm] = useState(CRITERE_VIDE)
  const [info, setInfo] = useState('')

  const charger = useCallback(async () => {
    const reqModeles = estEduc
      ? supabase.from('modeles_evaluation').select('*').eq('educateur_id', educateurId).eq('archive', false)
      : supabase.from('modeles_evaluation').select('*').eq('club_id', clubId).is('educateur_id', null).eq('archive', false)
    const reqClub = estEduc && clubId
      ? supabase.from('modeles_evaluation').select('*').eq('club_id', clubId).is('educateur_id', null).eq('archive', false)
      : Promise.resolve({ data: [], error: null })
    const [b, p, m, mc] = await Promise.all([
      supabase.from('bibliotheque_criteres').select('*').eq('actif', true).order('ordre', { ascending: true }),
      supabase.from('parametres_evaluation').select('*').eq('proprietaire_id', proprioParams).maybeSingle(),
      reqModeles, reqClub,
    ])
    if (b.error || p.error || m.error || mc.error) { setErreur('Le modèle ne se charge pas. Réessaie dans un instant.'); setChargement(false); return }
    const ids = [...(m.data || []), ...(mc.data || [])].map(x => x.id)
    let v = [], c = []
    if (ids.length) {
      const rv = await supabase.from('modeles_evaluation_versions').select('*').in('modele_id', ids).order('numero', { ascending: true })
      if (rv.error) { setErreur('Le modèle ne se charge pas. Réessaie dans un instant.'); setChargement(false); return }
      v = rv.data || []
      const vids = v.map(x => x.id)
      if (vids.length) {
        const rc = await supabase.from('criteres_evaluation').select('*').in('version_id', vids).order('ordre', { ascending: true })
        if (rc.error) { setErreur('Le modèle ne se charge pas. Réessaie dans un instant.'); setChargement(false); return }
        c = rc.data || []
      }
    }
    setBiblio(b.data || []); setParams(p.data || null); setModeles(m.data || []); setModelesClub(mc.data || []); setVersions(v); setCriteres(c)
    setErreur(''); setChargement(false)
  }, [clubId, educateurId, estEduc, proprioParams])

  useEffect(() => { charger() }, [charger])
  useEffect(() => {
    if (!categories.includes(categorie)) setCategorie(categories[0] || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories.join('|')])

  const cle = cleCategorie(categorie)
  const modele = modeles.find(m => m.categorie_cle === cle) || null
  const versionsModele = useMemo(() => versions.filter(v => modele && v.modele_id === modele.id), [versions, modele])
  const brouillon = versionsModele.find(v => !v.publiee_le) || null
  const derniere = versionsModele.filter(v => v.publiee_le).slice(-1)[0] || null
  const versionAffichee = brouillon || derniere
  const criteresVersion = useMemo(() => criteres.filter(c => versionAffichee && c.version_id === versionAffichee.id), [criteres, versionAffichee])
  // Fiche du club (éducateur affilié) : dernière version publiée de la catégorie
  const modeleClub = estEduc ? (modelesClub.find(m => m.categorie_cle === cle) || null) : null
  const derniereClub = modeleClub ? (versions.filter(v => v.modele_id === modeleClub.id && v.publiee_le).slice(-1)[0] || null) : null
  const criteresClub = useMemo(() => criteres.filter(c => derniereClub && c.version_id === derniereClub.id), [criteres, derniereClub])
  const idsObligClub = useMemo(() => new Set(criteresClub.filter(c => c.obligatoire).map(c => c.id)), [criteresClub])
  const verrouille = (c) => estEduc && c.critere_origine_id && idsObligClub.has(c.critere_origine_id)
  const manquantsClub = useMemo(() => {
    if (!estEduc || !brouillon) return []
    const presents = new Set(criteresVersion.map(c => c.critere_origine_id).filter(Boolean))
    return criteresClub.filter(c => c.obligatoire && !presents.has(c.id))
  }, [estEduc, brouillon, criteresVersion, criteresClub])
  // Qui peut composer : le club (droit du rôle), l'éducateur indépendant (toujours), l'éducateur affilié si le club l'autorise
  const peut = estEduc ? (!clubId || !!params?.educateurs_peuvent_completer) && peutEditer : peutEditer
  const enEdition = !!brouillon && peut

  const tranche = trancheDeCategorie(categorie)
  const proposes = useMemo(() => biblio.filter(b => {
    if (b.type === 'note' && !b.poste) return b.tranche === tranche
    return dispoPour(b.a_partir_de, categorie)
  }), [biblio, tranche, categorie])

  const garde = async (fn) => {
    if (occupe) return
    setOccupe(true); setInfo('')
    try { await fn() } catch (e) { setInfo(e?.message ? 'Enregistrement impossible : ' + e.message : 'Enregistrement impossible.') }
    await charger()
    setOccupe(false)
  }
  const ok = (r) => { if (r.error) throw new Error(r.error.message) ; return r }

  // ---- Réglages du club ----
  const enregistrerParam = (champs) => garde(async () => {
    if (params) ok(await supabase.from('parametres_evaluation').update(champs).eq('proprietaire_id', proprioParams))
    else ok(await supabase.from('parametres_evaluation').insert({ proprietaire_id: proprioParams, proprietaire_type: estEduc ? 'educateur' : 'club', ...champs }))
  })

  // ---- Modèle et versions ----
  const creerModele = () => garde(async () => {
    if (!estEduc) {
      const m = ok(await supabase.from('modeles_evaluation').insert({ club_id: clubId, categorie_cle: cle, nom: 'Fiche ' + labelCategorie(categorie) }).select().single())
      ok(await supabase.from('modeles_evaluation_versions').insert({ modele_id: m.data.id }))
      return
    }
    // Éducateur : si le club a une fiche publiée pour la catégorie, on la complète (copie des critères, obligatoires verrouillés)
    const base = derniereClub ? modeleClub : null
    const m = ok(await supabase.from('modeles_evaluation').insert({
      club_id: clubId || null, educateur_id: educateurId, categorie_cle: cle,
      modele_base_id: base ? base.id : null, nom: 'Ma fiche ' + labelCategorie(categorie),
    }).select().single())
    const v = ok(await supabase.from('modeles_evaluation_versions').insert({ modele_id: m.data.id }).select().single())
    if (base && criteresClub.length) {
      ok(await supabase.from('criteres_evaluation').insert(criteresClub.map(c => ({
        version_id: v.data.id, bibliotheque_critere_id: c.bibliotheque_critere_id, critere_origine_id: c.id,
        type: c.type, pilier: c.pilier, poste: c.poste, libelle: c.libelle, acquis_quand: c.acquis_quand,
        unite: c.unite, sens: c.sens, objectif: c.objectif, obligatoire: c.obligatoire, ordre: c.ordre,
      }))))
    }
  })
  // Ajoute à mon brouillon les critères obligatoires que le club a ajoutés depuis
  const ajouterObligatoiresClub = () => garde(async () => {
    if (!manquantsClub.length) return
    const base = criteresVersion.reduce((n, c) => Math.max(n, c.ordre), 0)
    ok(await supabase.from('criteres_evaluation').insert(manquantsClub.map((c, i) => ({
      version_id: brouillon.id, bibliotheque_critere_id: c.bibliotheque_critere_id, critere_origine_id: c.id,
      type: c.type, pilier: c.pilier, poste: c.poste, libelle: c.libelle, acquis_quand: c.acquis_quand,
      unite: c.unite, sens: c.sens, objectif: c.objectif, obligatoire: true, ordre: base + i + 1,
    }))))
  })
  const supprimerMaFiche = () => garde(async () => {
    if (!window.confirm('Supprimer ma fiche de ' + labelCategorie(categorie) + ' ? ' + (clubId ? 'Tu reviens à la fiche du club.' : 'Tu repars de zéro.'))) return
    ok(await supabase.from('modeles_evaluation').delete().eq('id', modele.id))
  })
  const nouvelleVersion = () => garde(async () => {
    const v = ok(await supabase.from('modeles_evaluation_versions').insert({ modele_id: modele.id }).select().single())
    if (derniere && criteresVersion.length) {
      const copie = criteresVersion.map(c => ({
        version_id: v.data.id, bibliotheque_critere_id: c.bibliotheque_critere_id,
        // Éducateur : un critère venu du club garde son origine club (sert à verrouiller les obligatoires)
        critere_origine_id: estEduc && c.critere_origine_id && criteresClub.some(x => x.id === c.critere_origine_id) ? c.critere_origine_id : c.id,
        type: c.type, pilier: c.pilier, poste: c.poste, libelle: c.libelle, acquis_quand: c.acquis_quand,
        unite: c.unite, sens: c.sens, objectif: c.objectif, obligatoire: c.obligatoire, ordre: c.ordre,
      }))
      ok(await supabase.from('criteres_evaluation').insert(copie))
    }
  })
  const publier = () => garde(async () => {
    if (criteresVersion.length === 0) throw new Error('ajoute au moins un critère avant de publier')
    ok(await supabase.from('modeles_evaluation_versions').update({ publiee_le: new Date().toISOString() }).eq('id', brouillon.id))
    setInfo('Version publiée.')
  })
  const abandonnerBrouillon = () => garde(async () => {
    if (!window.confirm('Abandonner ce brouillon ? Les critères ajoutés depuis la dernière version publiée seront perdus.')) return
    ok(await supabase.from('modeles_evaluation_versions').delete().eq('id', brouillon.id))
    if (!derniere) ok(await supabase.from('modeles_evaluation').delete().eq('id', modele.id))
  })

  // ---- Critères du brouillon ----
  const dejaCoche = (b) => criteresVersion.find(c => c.bibliotheque_critere_id === b.id)
  const ajouterBiblio = (liste) => garde(async () => {
    const aAjouter = liste.filter(b => !dejaCoche(b))
    if (!aAjouter.length) return
    const base = criteresVersion.reduce((n, c) => Math.max(n, c.ordre), 0)
    ok(await supabase.from('criteres_evaluation').insert(aAjouter.map((b, i) => ({
      version_id: brouillon.id, bibliotheque_critere_id: b.id, type: b.type, pilier: pilierDeBiblio(b),
      poste: b.poste || null, libelle: b.libelle, acquis_quand: b.acquis_quand || '',
      unite: b.type === 'test' ? b.unite : null, sens: b.type === 'test' ? b.sens : null, ordre: base + i + 1,
    }))))
  })
  const retirer = (ids) => garde(async () => {
    ids = ids.filter(id => !verrouille(criteresVersion.find(c => c.id === id) || {}))
    if (ids.length) ok(await supabase.from('criteres_evaluation').delete().in('id', ids))
  })
  const changerCritere = (id, champs) => garde(async () => {
    ok(await supabase.from('criteres_evaluation').update(champs).eq('id', id))
  })
  const creerCritere = () => garde(async () => {
    const f = form
    if (!f.libelle.trim()) throw new Error('écris le nom du critère')
    if (f.type === 'test' && !f.unite.trim()) throw new Error('indique l\'unité du test (secondes, cm...)')
    const ordre = criteresVersion.reduce((n, c) => Math.max(n, c.ordre), 0) + 1
    const test = f.type === 'test'
    ok(await supabase.from('criteres_evaluation').insert({
      version_id: brouillon.id, type: f.type,
      pilier: f.type === 'test' ? PILIER_TESTS : f.type === 'oui_non' ? PILIER_OUINON : f.poste ? PILIER_POSTE : f.pilier,
      poste: f.poste || null, libelle: f.libelle.trim(), acquis_quand: f.type === 'note' ? f.acquis_quand.trim() : '',
      unite: test ? f.unite.trim() : null, sens: test ? f.sens : null,
      objectif: test && f.objectif !== '' ? Number(String(f.objectif).replace(',', '.')) : null, ordre,
    }))
    setForm(CRITERE_VIDE); setFormOuvert(false)
  })

  // ---- Styles ----
  const carte = { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 6, padding: '14px 16px', marginBottom: 16 }
  const titre = { color: colors.text.primary, fontFamily: police.titre, textTransform: 'uppercase', letterSpacing: '0.01em', fontSize: 16, fontWeight: 700, margin: '0 0 10px' }
  const ligne = { padding: '8px 0', borderTop: `1px solid ${colors.border.subtle}`, display: 'flex', gap: 10, alignItems: 'flex-start' }
  const champ = { background: colors.background.base, color: colors.text.primary, border: `1px solid ${colors.border.faint}`, borderRadius: 4, padding: '8px 10px', fontSize: 14, fontFamily: 'Barlow, sans-serif', width: '100%', boxSizing: 'border-box' }
  const bouton = (plein) => ({
    padding: '8px 14px', borderRadius: 4, cursor: occupe ? 'default' : 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'Barlow, sans-serif',
    border: `1px solid ${plein ? couleur : colors.border.faint}`, background: plein ? couleur : 'transparent', color: plein ? '#fff' : colors.text.dim, opacity: occupe ? 0.6 : 1,
  })
  const lien = { background: 'none', border: 'none', color: colors.text.dim, fontSize: 12, cursor: 'pointer', textDecoration: 'underline', padding: 0, fontFamily: 'Barlow, sans-serif' }

  if (chargement) return <div style={{ color: colors.text.dim, fontSize: 13 }}>Chargement du modèle...</div>
  if (erreur) return <div style={{ color: colors.text.dim, fontSize: 13 }}>{erreur}</div>
  if (biblio.length === 0) return <div style={{ ...carte, color: colors.text.dim, fontSize: 13 }}>La bibliothèque de critères n'est pas encore disponible.</div>

  // Regroupe les critères de la fiche par pilier, dans l'ordre : 4 piliers, poste, tests, oui / non, autres.
  const ordrePiliers = [...PILIERS.map(p => p.label), PILIER_POSTE, PILIER_TESTS, PILIER_OUINON]
  const piliersFiche = [...new Set(criteresVersion.map(c => c.pilier))].sort((a, b) => {
    const ia = ordrePiliers.indexOf(a), ib = ordrePiliers.indexOf(b)
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
  })

  // Groupes de la bibliothèque proposés pour la catégorie
  const groupesBiblio = [
    ...PILIERS.map(p => ({ nom: p.label, liste: proposes.filter(b => b.type === 'note' && !b.poste && b.pilier === p.key) })),
    ...POSTES.map(p => ({ nom: PILIER_POSTE + ' : ' + p.label, liste: proposes.filter(b => b.poste === p.key) })),
    { nom: PILIER_TESTS, liste: proposes.filter(b => b.type === 'test') },
    { nom: PILIER_OUINON, liste: proposes.filter(b => b.type === 'oui_non') },
  ].filter(g => g.liste.length)

  const nbEval = params?.nb_evaluations_saison ?? ''
  const aCompleter = !!params?.educateurs_peuvent_completer

  return (
    <div>
      {/* Réglages */}
      {!estEduc && (
        <>
      <div style={carte}>
        <h3 style={titre}>Réglages du club</h3>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ color: colors.text.dim, fontSize: 12, display: 'block', minWidth: 220 }}>
            Évaluations par saison
            <select value={nbEval} disabled={!peutEditer || occupe} style={{ ...champ, marginTop: 4 }}
              onChange={e => enregistrerParam({ nb_evaluations_saison: e.target.value === '' ? null : Number(e.target.value) })}>
              <option value="">Pas encore choisi</option>
              <option value="2">2 par saison</option>
              <option value="3">3 par saison</option>
              <option value="4">4 par saison</option>
            </select>
          </label>
          <label style={{ color: colors.text.primary, fontSize: 14, display: 'flex', gap: 8, alignItems: 'center', cursor: peutEditer ? 'pointer' : 'default' }}>
            <input type="checkbox" checked={aCompleter} disabled={!peutEditer || occupe}
              onChange={e => enregistrerParam({ educateurs_peuvent_completer: e.target.checked })} />
            Les éducateurs peuvent compléter la fiche du club
          </label>
        </div>
        <p style={{ color: colors.text.dim, fontSize: 12, margin: '10px 0 0', lineHeight: 1.5 }}>
          {aCompleter
            ? 'Un éducateur du club pourra ajouter ses propres critères à la fiche du club. Les critères obligatoires restent dans sa fiche.'
            : 'Les éducateurs du club utilisent la fiche du club telle quelle, sans y ajouter de critère.'}
        </p>
      </div>

      <div style={carte}>
        <h3 style={titre}>Ce que voit le joueur (valeurs proposées à l'éducateur)</h3>
        <div style={{ display: 'grid', gap: 6 }}>
          {[
            ['visible_joueur_defaut', 'Évaluations visibles par le joueur et ses parents'],
            ['prefill_joueur_defaut', 'Le joueur peut remplir son auto-évaluation'],
            ['tests_visibles_joueur_defaut', 'Tests visibles par le joueur et ses parents'],
          ].map(([k, l]) => (
            <label key={k} style={{ color: colors.text.primary, fontSize: 14, display: 'flex', gap: 8, alignItems: 'center', cursor: peutEditer ? 'pointer' : 'default' }}>
              <input type="checkbox" checked={!!params?.[k]} disabled={!peutEditer || occupe} onChange={e => enregistrerParam({ [k]: e.target.checked })} />
              {l}
            </label>
          ))}
        </div>
        <p style={{ color: colors.text.dim, fontSize: 12, margin: '10px 0 0', lineHeight: 1.5 }}>
          L'éducateur peut toujours changer ces choix pour une évaluation précise. Les notes de suivi ne sont jamais visibles par le joueur ni par ses parents.
        </p>
      </div>

      <div style={carte}>
        <h3 style={titre}>Passation au nouvel éducateur</h3>
        <p style={{ color: colors.text.dim, fontSize: 12, margin: '0 0 10px', lineHeight: 1.5 }}>
          Quand un joueur change d'éducateur ou de catégorie dans le club, le nouvel éducateur peut lire son historique. Tu choisis ce qui lui est transmis.
        </p>
        <div style={{ display: 'grid', gap: 6 }}>
          {[
            ['transmettre_evaluations', 'Les évaluations terminées'],
            ['transmettre_tests', 'Les tests terminés'],
            ['transmettre_notes', 'Les notes de suivi marquées « transmissibles » (les notes privées ne sont jamais transmises)'],
          ].map(([k, l]) => (
            <label key={k} style={{ color: colors.text.primary, fontSize: 14, display: 'flex', gap: 8, alignItems: 'center', cursor: peutEditer ? 'pointer' : 'default' }}>
              <input type="checkbox" checked={params?.[k] ?? true} disabled={!peutEditer || occupe} onChange={e => enregistrerParam({ [k]: e.target.checked })} />
              {l}
            </label>
          ))}
        </div>
      </div>

        </>
      )}
      {estEduc && clubId && (
        <div style={carte}>
          <h3 style={titre}>Fiche du club</h3>
          <p style={{ color: colors.text.dim, fontSize: 13, margin: 0, lineHeight: 1.5 }}>
            {nbEval ? `Ton club prévoit ${nbEval} évaluations par saison. ` : ''}
            {aCompleter
              ? 'Ton club t\'autorise à compléter sa fiche : tu peux ajouter tes propres critères. Les critères obligatoires du club restent dans ta fiche.'
              : 'Ton club n\'autorise pas les éducateurs à modifier sa fiche : tu utilises la fiche du club telle quelle. Pour la faire évoluer, demande au club.'}
          </p>
        </div>
      )}
      {estEduc && !clubId && (
        <div style={carte}>
          <h3 style={titre}>Mes réglages</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label style={{ color: colors.text.dim, fontSize: 12, display: 'block', minWidth: 220 }}>
              Évaluations par saison
              <select value={nbEval} disabled={!peut || occupe} style={{ ...champ, marginTop: 4 }}
                onChange={e => enregistrerParam({ nb_evaluations_saison: e.target.value === '' ? null : Number(e.target.value) })}>
                <option value="">Pas encore choisi</option>
                <option value="2">2 par saison</option>
                <option value="3">3 par saison</option>
                <option value="4">4 par saison</option>
              </select>
            </label>
          </div>
          <div style={{ display: 'grid', gap: 6, marginTop: 12 }}>
            {[
              ['visible_joueur_defaut', 'Évaluations visibles par le joueur (valeur proposée)'],
              ['prefill_joueur_defaut', 'Le joueur peut pré-remplir son auto-évaluation (valeur proposée)'],
              ['tests_visibles_joueur_defaut', 'Tests visibles par le joueur (valeur proposée)'],
              ['tests_prefill_joueur_defaut', 'Le joueur peut saisir ses propres tests (valeur proposée)'],
            ].map(([k, l]) => (
              <label key={k} style={{ color: colors.text.primary, fontSize: 14, display: 'flex', gap: 8, alignItems: 'center', cursor: peut ? 'pointer' : 'default' }}>
                <input type="checkbox" checked={!!params?.[k]} disabled={!peut || occupe} onChange={e => enregistrerParam({ [k]: e.target.checked })} />
                {l}
              </label>
            ))}
          </div>
          <p style={{ color: colors.text.dim, fontSize: 12, margin: '10px 0 0', lineHeight: 1.5 }}>
            Ces valeurs sont seulement proposées quand tu crées une évaluation ou une série de tests : tu peux toujours les changer au cas par cas.
          </p>
        </div>
      )}

      {categories.length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {categories.map(c => {
            const m = modeles.find(x => x.categorie_cle === cleCategorie(c))
            return (
              <button key={c} onClick={() => { setCategorie(c); setFormOuvert(false); setInfo('') }} style={{
                padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Barlow, sans-serif',
                border: `1px solid ${categorie === c ? couleur : colors.border.faint}`,
                background: categorie === c ? couleur + '22' : 'transparent',
                color: categorie === c ? couleur : colors.text.dim,
              }}>{labelCategorie(c)}{m ? ' · fiche' : ''}</button>
            )
          })}
        </div>
      )}

      <div style={{ color: colors.text.primary, fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
        {estEduc && modele ? 'Ma fiche' : 'Fiche'} {labelCategorie(categorie)}
        {versionAffichee && <span style={{ color: colors.text.dim, fontWeight: 400 }}> · version {versionAffichee.numero} {versionAffichee.publiee_le ? '(publiée)' : '(brouillon)'}</span>}
      </div>
      {modele && versionAffichee && criteresVersion.length > 0 && (
        <div style={{ margin: '6px 0 10px' }}>
          <BoutonImprimerEvaluation mode="modele" educateurId={educateurId} cadre={{ modele, version: versionAffichee, criteres: criteresVersion, categorieCle: cle, params: null }} libelle="Imprimer la fiche vierge" />
        </div>
      )}
      {info && <div style={{ color: colors.text.dim, fontSize: 13, margin: '6px 0' }}>{info}</div>}

      {/* Pas encore de modèle */}
      {!modele && (
        <div style={carte}>
          <p style={{ color: colors.text.dim, fontSize: 13, lineHeight: 1.5, margin: '0 0 12px' }}>
            {!estEduc
              ? `Aucune fiche n'est composée pour ${labelCategorie(categorie)}. Tant qu'il n'y en a pas, les éducateurs de cette catégorie n'ont pas de fiche du club.`
              : derniereClub
                ? `Tu utilises la fiche du club pour ${labelCategorie(categorie)} (version ${derniereClub.numero}), affichée ci-dessous.`
                : clubId
                  ? `Le club n'a pas encore publié de fiche pour ${labelCategorie(categorie)}.`
                  : `Tu n'as pas encore de fiche pour ${labelCategorie(categorie)}.`}
          </p>
          {peut
            ? <button style={bouton(true)} disabled={occupe} onClick={creerModele}>
                {estEduc && derniereClub ? 'Compléter la fiche du club' : estEduc ? 'Composer ma fiche' : `Composer la fiche de ${labelCategorie(categorie)}`}
              </button>
            : <div style={{ color: colors.text.dim, fontSize: 12 }}>{estEduc ? 'Tu ne peux pas la modifier.' : 'Tu peux consulter les fiches, mais pas les composer avec ton rôle.'}</div>}
        </div>
      )}

      {/* Éducateur sans fiche à lui : on montre la fiche du club en lecture */}
      {estEduc && !modele && derniereClub && (
        <div>
          {[...new Set(criteresClub.map(c => c.pilier))].map(pil => (
            <div key={pil} style={carte}>
              <h3 style={titre}>{pil} <span style={{ color: colors.text.dim, fontSize: 12, fontFamily: 'Barlow, sans-serif', textTransform: 'none' }}>({criteresClub.filter(c => c.pilier === pil).length})</span></h3>
              {criteresClub.filter(c => c.pilier === pil).map(c => <LigneLecture key={c.id} c={c} colors={colors} ligne={ligne} />)}
            </div>
          ))}
        </div>
      )}

      {/* Fiche composée, en lecture (version publiée) */}
      {modele && !brouillon && derniere && (
        <div>
          {peut && (
            <div style={{ marginBottom: 12 }}>
              <button style={bouton(true)} disabled={occupe} onClick={nouvelleVersion}>Modifier (crée la version {derniere.numero + 1})</button>
              <span style={{ color: colors.text.dim, fontSize: 12, marginLeft: 10 }}>La version {derniere.numero} reste telle quelle pour les évaluations déjà faites.</span>
              {estEduc && <button style={{ ...bouton(false), marginLeft: 10 }} disabled={occupe} onClick={supprimerMaFiche}>{clubId ? 'Revenir à la fiche du club' : 'Supprimer ma fiche'}</button>}
            </div>
          )}
          {estEduc && clubId && modeleClub && derniereClub && modele.modele_base_id === modeleClub.id && criteresClub.some(c => c.obligatoire && !criteresVersion.some(x => x.critere_origine_id === c.id)) && (
            <div style={{ ...carte, color: colors.text.dim, fontSize: 13 }}>
              Le club a ajouté des critères obligatoires depuis ta dernière version. Clique sur « Modifier » : ils seront à ajouter dans ton brouillon.
            </div>
          )}
          {piliersFiche.map(p => (
            <div key={p} style={carte}>
              <h3 style={titre}>{p} <span style={{ color: colors.text.dim, fontSize: 12, fontFamily: 'Barlow, sans-serif', textTransform: 'none' }}>({criteresVersion.filter(c => c.pilier === p).length})</span></h3>
              {criteresVersion.filter(c => c.pilier === p).map(c => <LigneLecture key={c.id} c={c} colors={colors} ligne={ligne} />)}
            </div>
          ))}
        </div>
      )}

      {/* Brouillon en édition (ou en lecture si droit insuffisant) */}
      {modele && brouillon && (
        <div>
          {enEdition && (
            <div style={{ ...carte, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <button style={bouton(true)} disabled={occupe || criteresVersion.length === 0} onClick={publier}>Publier la version {brouillon.numero}</button>
              <button style={bouton(false)} disabled={occupe} onClick={abandonnerBrouillon}>Abandonner le brouillon</button>
              <span style={{ color: colors.text.dim, fontSize: 12, flex: 1, minWidth: 200, lineHeight: 1.5 }}>
                Chaque case cochée est enregistrée tout de suite. Une fois publiée, la version ne change plus et les éducateurs peuvent l'utiliser.
              </span>
            </div>
          )}
          {!enEdition && <div style={{ ...carte, color: colors.text.dim, fontSize: 13 }}>Cette fiche est en cours de composition (brouillon).</div>}
          {enEdition && manquantsClub.length > 0 && (
            <div style={{ ...carte, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <button style={bouton(true)} disabled={occupe} onClick={ajouterObligatoiresClub}>Ajouter {manquantsClub.length} critère{manquantsClub.length > 1 ? 's' : ''} obligatoire{manquantsClub.length > 1 ? 's' : ''} du club</button>
              <span style={{ color: colors.text.dim, fontSize: 12, flex: 1, minWidth: 200 }}>Le club les exige dans toutes les fiches de {labelCategorie(categorie)}.</span>
            </div>
          )}

          <div style={carte}>
            <h3 style={titre}>Ma fiche ({criteresVersion.length} critères)</h3>
            {criteresVersion.length === 0 && <div style={{ color: colors.text.dim, fontSize: 13 }}>Aucun critère pour l'instant. Coche des critères dans la liste de Digital Football ci-dessous, ou crées-en un.</div>}
            {piliersFiche.map(p => (
              <div key={p} style={{ marginTop: 10 }}>
                <div style={{ color: couleur, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{p}</div>
                {criteresVersion.filter(c => c.pilier === p).map(c => (
                  <div key={c.id} style={ligne}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <LigneTexte c={c} colors={colors} />
                      {enEdition && c.type === 'test' && (
                        <label style={{ color: colors.text.dim, fontSize: 12, display: 'inline-flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                          Objectif ({c.unite})
                          <input defaultValue={c.objectif ?? ''} inputMode="decimal" disabled={occupe}
                            style={{ ...champ, width: 90, padding: '4px 8px' }}
                            onBlur={e => {
                              const v = e.target.value.trim()
                              const n = v === '' ? null : Number(v.replace(',', '.'))
                              if (v !== '' && Number.isNaN(n)) return
                              if (n !== (c.objectif === null ? null : Number(c.objectif))) changerCritere(c.id, { objectif: n })
                            }} />
                        </label>
                      )}
                    </div>
                    {enEdition && verrouille(c) && <span style={{ color: couleur, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>OBLIGATOIRE (CLUB)</span>}
                    {enEdition && !verrouille(c) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
                        <label style={{ color: colors.text.dim, fontSize: 12, display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                          <input type="checkbox" checked={c.obligatoire} disabled={occupe} onChange={e => changerCritere(c.id, { obligatoire: e.target.checked })} />
                          Obligatoire
                        </label>
                        <button style={lien} disabled={occupe} onClick={() => retirer([c.id])}>Retirer</button>
                      </div>
                    )}
                    {!enEdition && c.obligatoire && <span style={{ color: couleur, fontSize: 11, fontWeight: 700 }}>OBLIGATOIRE</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {enEdition && (
            <>
              <div style={carte}>
                <h3 style={titre}>Créer un critère</h3>
                {!formOuvert
                  ? <button style={bouton(false)} onClick={() => setFormOuvert(true)}>Nouveau critère</button>
                  : (
                    <div style={{ display: 'grid', gap: 10, maxWidth: 560 }}>
                      <label style={{ color: colors.text.dim, fontSize: 12 }}>Type
                        <select value={form.type} style={{ ...champ, marginTop: 4 }} onChange={e => setForm({ ...form, type: e.target.value })}>
                          {Object.entries(LIBELLE_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </label>
                      {(form.type === 'note' || form.type === 'commentaire') && (
                        <label style={{ color: colors.text.dim, fontSize: 12 }}>Pilier
                          <select value={form.poste ? 'poste' : form.pilier} style={{ ...champ, marginTop: 4 }}
                            onChange={e => e.target.value === 'poste' ? setForm({ ...form, poste: 'milieu' }) : setForm({ ...form, pilier: e.target.value, poste: '' })}>
                            {PILIERS.map(p => <option key={p.key} value={p.label}>{p.label}</option>)}
                            <option value="poste">Critère par poste</option>
                          </select>
                        </label>
                      )}
                      {form.poste && (
                        <label style={{ color: colors.text.dim, fontSize: 12 }}>Poste
                          <select value={form.poste} style={{ ...champ, marginTop: 4 }} onChange={e => setForm({ ...form, poste: e.target.value })}>
                            {POSTES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                          </select>
                        </label>
                      )}
                      <label style={{ color: colors.text.dim, fontSize: 12 }}>Nom du critère
                        <input value={form.libelle} maxLength={150} style={{ ...champ, marginTop: 4 }} onChange={e => setForm({ ...form, libelle: e.target.value })} />
                      </label>
                      {form.type === 'note' && (
                        <label style={{ color: colors.text.dim, fontSize: 12 }}>« Acquis quand » (aide l'éducateur à noter)
                          <input value={form.acquis_quand} maxLength={300} style={{ ...champ, marginTop: 4 }} onChange={e => setForm({ ...form, acquis_quand: e.target.value })} />
                        </label>
                      )}
                      {form.type === 'test' && (
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <label style={{ color: colors.text.dim, fontSize: 12, flex: 1, minWidth: 110 }}>Unité
                            <input value={form.unite} maxLength={20} placeholder="secondes, cm..." style={{ ...champ, marginTop: 4 }} onChange={e => setForm({ ...form, unite: e.target.value })} />
                          </label>
                          <label style={{ color: colors.text.dim, fontSize: 12, flex: 1, minWidth: 150 }}>Meilleur résultat
                            <select value={form.sens} style={{ ...champ, marginTop: 4 }} onChange={e => setForm({ ...form, sens: e.target.value })}>
                              <option value="plus_haut">Plus haut = mieux</option>
                              <option value="plus_bas">Plus bas = mieux</option>
                            </select>
                          </label>
                          <label style={{ color: colors.text.dim, fontSize: 12, flex: 1, minWidth: 110 }}>Objectif (facultatif)
                            <input value={form.objectif} inputMode="decimal" style={{ ...champ, marginTop: 4 }} onChange={e => setForm({ ...form, objectif: e.target.value })} />
                          </label>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button style={bouton(true)} disabled={occupe} onClick={creerCritere}>Ajouter à la fiche</button>
                        <button style={bouton(false)} onClick={() => { setFormOuvert(false); setForm(CRITERE_VIDE) }}>Annuler</button>
                      </div>
                    </div>
                  )}
              </div>

              <div style={carte}>
                <h3 style={titre}>Liste Digital Football ({LIBELLE_TRANCHE[tranche]})</h3>
                <p style={{ color: colors.text.dim, fontSize: 12, margin: '0 0 6px' }}>Coche les critères à mettre dans {estEduc ? 'ta fiche' : 'la fiche'} de {labelCategorie(categorie)}.</p>
                {groupesBiblio.map(g => {
                  const nbCoches = g.liste.filter(dejaCoche).length
                  return (
                    <div key={g.nom} style={{ marginTop: 12 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ color: couleur, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{g.nom} ({nbCoches}/{g.liste.length})</div>
                        <button style={lien} disabled={occupe || nbCoches === g.liste.length} onClick={() => ajouterBiblio(g.liste)}>Tout ajouter</button>
                        <button style={lien} disabled={occupe || nbCoches === 0} onClick={() => retirer(g.liste.map(dejaCoche).filter(Boolean).map(c => c.id))}>Tout retirer</button>
                      </div>
                      {g.liste.map(b => {
                        const present = dejaCoche(b)
                        return (
                          <label key={b.id} style={{ ...ligne, cursor: 'pointer' }}>
                            <input type="checkbox" checked={!!present} disabled={occupe || (present && verrouille(present))} style={{ marginTop: 3 }}
                              onChange={() => present ? retirer([present.id]) : ajouterBiblio([b])} />
                            <div>
                              <div style={{ color: colors.text.primary, fontSize: 14, fontWeight: 700 }}>
                                {b.libelle}{b.type === 'test' && <span style={{ color: colors.text.dim, fontWeight: 400 }}> ({b.unite}, {b.sens === 'plus_bas' ? 'plus bas = mieux' : 'plus haut = mieux'})</span>}
                              </div>
                              {b.acquis_quand && <div style={{ color: colors.text.dim, fontSize: 12, marginTop: 2 }}>Acquis quand : {b.acquis_quand}</div>}
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function LigneTexte({ c, colors }) {
  return (
    <>
      <div style={{ color: colors.text.primary, fontSize: 14, fontWeight: 700 }}>
        {c.libelle}
        {c.type === 'test' && <span style={{ color: colors.text.dim, fontWeight: 400 }}> ({c.unite}, {c.sens === 'plus_bas' ? 'plus bas = mieux' : 'plus haut = mieux'}{c.objectif !== null && c.objectif !== undefined ? `, objectif ${c.objectif}` : ''})</span>}
        {c.poste && <span style={{ color: colors.text.dim, fontWeight: 400 }}> · {POSTES.find(p => p.key === c.poste)?.label}</span>}
      </div>
      {c.acquis_quand && <div style={{ color: colors.text.dim, fontSize: 12, marginTop: 2 }}>Acquis quand : {c.acquis_quand}</div>}
    </>
  )
}

function LigneLecture({ c, colors, ligne }) {
  return (
    <div style={ligne}>
      <div style={{ flex: 1, minWidth: 0 }}><LigneTexte c={c} colors={colors} /></div>
      {c.obligatoire && <span style={{ color: colors.text.dim, fontSize: 11, fontWeight: 700 }}>OBLIGATOIRE</span>}
    </div>
  )
}

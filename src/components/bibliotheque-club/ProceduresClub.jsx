import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import {
  CLASSE_BOUTON, CLASSE_BOUTON_SECONDAIRE, CLASSE_CHAMP,
  styleBoutonPrincipal, styleBoutonSecondaire, styleCarte, styleChamp, styleEtiquette,
} from '../../lib/identite'
import { police, forme } from '../../tokens'
import EmptyState from '../EmptyState'
import Loader from '../Loader'
import { miniatureSchema, remplacerSchemaParLien } from '../../lib/schemaUpload'

// Même éditeur de schéma et même scanner de fiche que la bibliothèque éducateur.
const Tactipad = lazy(() => import('../Tactipad'))
const ScannerProc = lazy(() => import('../ScannerProc'))

// Procédés du club (bloc 3) : liste, fiche, création, modification, suppression.
// La sécurité est en base (table bibliotheque_club_procedes, bloc 1) : ici,
// `peutEditer` ne fait que masquer les boutons que la base refuserait de toute façon.
export const TYPES = [
  { val: 'echauffement', label: 'Échauffement' },
  { val: 'jeu', label: 'Jeu' },
  { val: 'exercice', label: 'Exercice' },
  { val: 'situation', label: 'Situation' },
]
export const THEMES = ['Offensif', 'Défensif', 'Coup de pied arrêté', 'Gardien de but', 'Physique', 'Sans thème']
export const AGES = ['Pour tous', 'U6-U7', 'U8-U9', 'U10-U11', 'U12-U13', 'U14-U15', 'U16-U17', 'U18-U19', 'Senior']

const VIDE = {
  type: 'exercice', nom: '', theme: '', objectif: '', but: '', organisation: '', consignes: '',
  criteres_realisation: '', variables: '', description: '', duree: '', nb_joueurs: '', tags: '', categorie_age: ['Pour tous'],
  principe_jeu: '', schema_png: '', schema_data: null,
}

export const labelType = v => TYPES.find(t => t.val === v)?.label || v
const bascule = (liste, v) => (liste || []).includes(v) ? liste.filter(x => x !== v) : [...(liste || []), v]
export const dateFr = d => d ? new Date(d).toLocaleDateString('fr-FR') : ''

const styleChoix = (colors, actif) => ({
  fontFamily: police.texte, fontWeight: actif ? 700 : 600, fontSize: '13px', lineHeight: 1.2, minHeight: '40px', padding: '0 12px',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: forme.rayonCarte, cursor: 'pointer', boxSizing: 'border-box',
  border: `1px solid ${actif ? colors.accent.brand : colors.border.strong}`,
  background: actif ? colors.accent.brand : 'transparent',
  color: actif ? colors.accent.onBrand : colors.text.primary,
})

export function Pastille({ colors, children }) {
  return (
    <span style={{ ...styleEtiquette(colors), fontSize: '11px', padding: '3px 8px', borderRadius: 999, background: colors.background.raised, border: `1px solid ${colors.border.subtle}` }}>
      {children}
    </span>
  )
}

export function Rubrique({ colors, titre, texte }) {
  if (!texte || !String(texte).trim()) return null
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ ...styleEtiquette(colors), marginBottom: 4 }}>{titre}</div>
      <p style={{ margin: 0, fontFamily: police.texte, fontSize: 14, lineHeight: 1.5, color: colors.text.primary, whiteSpace: 'pre-wrap' }}>{texte}</p>
    </div>
  )
}

export default function ProceduresClub({ clubId, userId, peutEditer = false }) {
  const colors = useColors()
  const [procedes, setProcedes] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [recherche, setRecherche] = useState('')
  const [fType, setFType] = useState('')
  const [fTheme, setFTheme] = useState('')
  const [fAge, setFAge] = useState('')
  const [ouvert, setOuvert] = useState(null) // procédé affiché en fiche
  const [form, setForm] = useState(null) // null = fermé ; { id?, ...champs }
  const [enCours, setEnCours] = useState(false)
  const [aSupprimer, setASupprimer] = useState(null)
  const [message, setMessage] = useState('')
  const [schemaOuvert, setSchemaOuvert] = useState(false)
  const [scanOuvert, setScanOuvert] = useState(false)

  const charger = useCallback(async () => {
    if (!clubId) { setChargement(false); return }
    const { data, error } = await supabase
      .from('bibliotheque_club_procedes')
      .select('*')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false })
    if (error) setErreur('Impossible de charger la bibliothèque du club. Réessayez dans un instant.')
    else { setErreur(''); setProcedes(data || []) }
    setChargement(false)
  }, [clubId])

  useEffect(() => { charger() }, [charger])

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return procedes.filter(p => {
      if (fType && p.type !== fType) return false
      if (fTheme && p.theme !== fTheme) return false
      if (fAge && !(p.categorie_age || []).includes(fAge)) return false
      if (!q) return true
      return [p.nom, p.theme, p.tags, p.but, p.objectif, p.description].some(v => (v || '').toLowerCase().includes(q))
    })
  }, [procedes, recherche, fType, fTheme, fAge])

  const ouvrirForm = p => setForm(p ? {
    ...VIDE, ...Object.fromEntries(Object.keys(VIDE).map(k => [k, p[k] ?? VIDE[k]])),
    id: p.id, duree: p.duree ?? '', schema_png: p.schema_png || '', categorie_age: p.categorie_age?.length ? p.categorie_age : ['Pour tous'],
  } : { ...VIDE })

  // Fiche lue par le scanner : on ouvre le formulaire prérempli, à relire avant d'enregistrer.
  const depuisScan = r => {
    const duree = parseInt(r.duree, 10)
    setScanOuvert(false)
    setForm({
      ...VIDE, type: r.type || 'exercice', nom: r.nom || '', theme: r.theme || '', principe_jeu: r.principe || '',
      categorie_age: r.categorie_age?.length ? r.categorie_age : ['Pour tous'], nb_joueurs: r.nb_joueurs || '',
      duree: Number.isFinite(duree) ? duree : '', but: r.but || '', organisation: r.organisation || '', consignes: r.consignes || '',
      variables: r.variables || '', criteres_realisation: r.criteres_realisation || '',
      schema_png: r.schema_png || '', schema_data: r.schema_data || null,
    })
  }

  const formInvalide = !form || !form.nom.trim() || !form.categorie_age?.length

  const enregistrer = async () => {
    if (formInvalide || enCours) return
    setEnCours(true)
    const duree = parseInt(form.duree, 10)
    const champs = {
      type: form.type, nom: form.nom.trim(), theme: form.theme, objectif: form.objectif, but: form.but,
      organisation: form.organisation, consignes: form.consignes, criteres_realisation: form.criteres_realisation,
      variables: form.variables, description: form.description, duree: Number.isFinite(duree) ? duree : null,
      nb_joueurs: form.nb_joueurs, tags: form.tags, categorie_age: form.categorie_age,
      principe_jeu: form.principe_jeu || null, schema_png: form.schema_png || null, schema_data: form.schema_data || null,
    }
    const { error } = form.id
      ? await supabase.from('bibliotheque_club_procedes').update(champs).eq('id', form.id)
      : await supabase.from('bibliotheque_club_procedes').insert({ ...champs, club_id: clubId })
    setEnCours(false)
    if (error) {
      setMessage('Enregistrement refusé. Vérifiez que vous avez toujours le droit d\'écrire dans la bibliothèque, puis réessayez.')
      return
    }
    setMessage(form.id ? 'Procédé modifié.' : 'Procédé ajouté à la bibliothèque du club.')
    setForm(null)
    setOuvert(null)
    charger()
  }

  const supprimer = async () => {
    if (!aSupprimer || enCours) return
    setEnCours(true)
    const { error } = await supabase.from('bibliotheque_club_procedes').delete().eq('id', aSupprimer.id)
    setEnCours(false)
    if (error) { setMessage('Suppression refusée. Vous n\'avez peut-être plus le droit d\'écrire ici.'); setASupprimer(null); return }
    setMessage('Procédé supprimé.')
    setASupprimer(null)
    setOuvert(null)
    charger()
  }

  if (chargement) return <Loader />

  const champ = (label, enfant, requis) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ ...styleEtiquette(colors), display: 'block', marginBottom: 6 }}>{label}{requis ? ' *' : ''}</label>
      {enfant}
    </div>
  )
  const texte = (cle, label, lignes = 3) => champ(label, (
    <textarea rows={lignes} value={form[cle]} onChange={e => setForm(f => ({ ...f, [cle]: e.target.value }))}
      className={CLASSE_CHAMP} style={{ ...styleChamp(colors), resize: 'vertical', fontFamily: 'inherit' }} />
  ))

  const modale = contenu => (
    <div style={{ position: 'fixed', inset: 0, background: colors.background.overlay, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
      <div role="dialog" aria-modal="true" style={{ ...styleCarte(colors), padding: 24, width: 640, maxWidth: '100%', maxHeight: '92vh', overflowY: 'auto' }}>
        {contenu}
      </div>
    </div>
  )

  return (
    <div>
      {message && (
        <div role="status" style={{ ...styleCarte(colors), marginBottom: 12, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', fontSize: 14, color: colors.text.primary }}>
          <span>{message}</span>
          <button type="button" onClick={() => setMessage('')} className={CLASSE_BOUTON_SECONDAIRE} style={{ ...styleBoutonSecondaire(colors), minHeight: 32, padding: '0 12px', fontSize: 12 }}>Fermer</button>
        </div>
      )}
      {erreur && <p role="alert" style={{ color: colors.accent.red, fontSize: 14 }}>{erreur}</p>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
        <input type="search" value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher un procédé"
          aria-label="Rechercher un procédé" className={CLASSE_CHAMP} style={{ ...styleChamp(colors), flex: '1 1 220px', width: 'auto' }} />
        {peutEditer && (
          <>
            <button type="button" onClick={() => ouvrirForm(null)} className={CLASSE_BOUTON} style={styleBoutonPrincipal(colors)}>Ajouter un procédé</button>
            <button type="button" onClick={() => setScanOuvert(true)} className={CLASSE_BOUTON_SECONDAIRE} style={styleBoutonSecondaire(colors)}>Scanner une fiche</button>
          </>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <select aria-label="Filtrer par type" value={fType} onChange={e => setFType(e.target.value)} className={CLASSE_CHAMP} style={{ ...styleChamp(colors), width: 'auto', flex: '1 1 140px' }}>
          <option value="">Tous les types</option>
          {TYPES.map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
        </select>
        <select aria-label="Filtrer par thème" value={fTheme} onChange={e => setFTheme(e.target.value)} className={CLASSE_CHAMP} style={{ ...styleChamp(colors), width: 'auto', flex: '1 1 140px' }}>
          <option value="">Tous les thèmes</option>
          {THEMES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select aria-label="Filtrer par catégorie d'âge" value={fAge} onChange={e => setFAge(e.target.value)} className={CLASSE_CHAMP} style={{ ...styleChamp(colors), width: 'auto', flex: '1 1 140px' }}>
          <option value="">Tous les âges</option>
          {AGES.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {procedes.length === 0 && !erreur && (
        <EmptyState
          title="Votre bibliothèque est vide"
          subtitle={peutEditer
            ? 'Ajoutez le premier procédé du club. Vos éducateurs affiliés le retrouveront ici et pourront le reprendre dans leurs séances.'
            : 'Le club n\'a pas encore rangé de procédé ici. Ils apparaîtront dès qu\'un responsable en ajoutera.'}
        />
      )}
      {procedes.length > 0 && visibles.length === 0 && (
        <p style={{ color: colors.text.secondary, fontSize: 14 }}>Aucun procédé ne correspond à cette recherche.</p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {visibles.map(p => (
          <button key={p.id} type="button" onClick={() => setOuvert(p)} className="df-cliquable"
            style={{ ...styleCarte(colors), textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8, font: 'inherit', color: colors.text.primary }}>
            {p.schema_png && <img src={miniatureSchema(p.schema_png, 500)} loading="lazy" alt="Schéma tactique" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: forme.rayonCarte, border: `1px solid ${colors.border.subtle}` }} />}
            <span style={{ fontFamily: police.titre, fontWeight: 700, fontSize: 18, textTransform: 'uppercase', lineHeight: 1.15 }}>{p.nom}</span>
            <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Pastille colors={colors}>{labelType(p.type)}</Pastille>
              {p.theme && <Pastille colors={colors}>{p.theme}</Pastille>}
              {p.duree ? <Pastille colors={colors}>{p.duree} min</Pastille> : null}
            </span>
            {p.but && <span style={{ fontSize: 13, color: colors.text.secondary, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.but}</span>}
            <span style={{ fontSize: 12, color: colors.text.dim }}>
              {p.auteur_nom ? `Par ${p.auteur_nom}` : 'Auteur inconnu'} · {dateFr(p.created_at)}
            </span>
          </button>
        ))}
      </div>

      {ouvert && !form && !aSupprimer && modale(
        <>
          <h2 style={{ fontFamily: police.titre, fontWeight: 700, fontSize: 24, textTransform: 'uppercase', margin: '0 0 10px', color: colors.text.primary }}>{ouvert.nom}</h2>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            <Pastille colors={colors}>{labelType(ouvert.type)}</Pastille>
            {ouvert.theme && <Pastille colors={colors}>{ouvert.theme}</Pastille>}
            {ouvert.duree ? <Pastille colors={colors}>{ouvert.duree} min</Pastille> : null}
            {ouvert.nb_joueurs ? <Pastille colors={colors}>{ouvert.nb_joueurs} joueurs</Pastille> : null}
            {(ouvert.categorie_age || []).map(a => <Pastille key={a} colors={colors}>{a}</Pastille>)}
          </div>
          {ouvert.schema_png && <img src={ouvert.schema_png} alt="Schéma tactique" style={{ width: '100%', maxHeight: 360, objectFit: 'contain', border: `1px solid ${colors.border.strong}`, borderRadius: forme.rayonCarte, marginBottom: 16, display: 'block' }} />}
          <Rubrique colors={colors} titre="Principe de jeu" texte={ouvert.principe_jeu} />
          <Rubrique colors={colors} titre="Objectif" texte={ouvert.objectif} />
          <Rubrique colors={colors} titre="But" texte={ouvert.but} />
          <Rubrique colors={colors} titre="Organisation" texte={ouvert.organisation} />
          <Rubrique colors={colors} titre="Consignes" texte={ouvert.consignes} />
          <Rubrique colors={colors} titre="Critères de réalisation" texte={ouvert.criteres_realisation} />
          <Rubrique colors={colors} titre="Variables" texte={ouvert.variables} />
          <Rubrique colors={colors} titre="Description" texte={ouvert.description} />
          <p style={{ fontSize: 12, color: colors.text.dim, margin: '0 0 16px' }}>
            {ouvert.origine === 'educateur'
              ? `${ouvert.auteur_nom ? `Procédé de ${ouvert.auteur_nom}, ajouté` : 'Ajouté'} à la bibliothèque du club le ${dateFr(ouvert.created_at)}`
              : `${ouvert.auteur_nom ? `Ajouté par ${ouvert.auteur_nom}` : 'Auteur inconnu'} le ${dateFr(ouvert.created_at)}`}
            {ouvert.updated_at && ouvert.updated_at !== ouvert.created_at && dateFr(ouvert.updated_at) !== dateFr(ouvert.created_at) ? `, modifié le ${dateFr(ouvert.updated_at)}` : ''}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {peutEditer && <button type="button" onClick={() => ouvrirForm(ouvert)} className={CLASSE_BOUTON} style={styleBoutonPrincipal(colors)}>Modifier</button>}
            {peutEditer && <button type="button" onClick={() => setASupprimer(ouvert)} className={CLASSE_BOUTON_SECONDAIRE} style={{ ...styleBoutonSecondaire(colors), color: colors.accent.red, borderColor: colors.accent.red }}>Supprimer</button>}
            <button type="button" onClick={() => setOuvert(null)} className={CLASSE_BOUTON_SECONDAIRE} style={styleBoutonSecondaire(colors)}>Fermer</button>
          </div>
        </>
      )}

      {form && modale(
        <>
          <h2 style={{ fontFamily: police.titre, fontWeight: 700, fontSize: 22, textTransform: 'uppercase', margin: '0 0 20px', color: colors.text.primary }}>
            {form.id ? 'Modifier le procédé' : 'Nouveau procédé du club'}
          </h2>
          {champ('Type', (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TYPES.map(t => <button key={t.val} type="button" aria-pressed={form.type === t.val} onClick={() => setForm(f => ({ ...f, type: t.val }))} style={styleChoix(colors, form.type === t.val)}>{t.label}</button>)}
            </div>
          ))}
          {champ('Nom du procédé', <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} className={CLASSE_CHAMP} style={styleChamp(colors)} />, true)}
          {champ('Thème', (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {THEMES.map(t => <button key={t} type="button" aria-pressed={form.theme === t} onClick={() => setForm(f => ({ ...f, theme: f.theme === t ? '' : t }))} style={styleChoix(colors, form.theme === t)}>{t}</button>)}
            </div>
          ))}
          {champ('Catégories d\'âge (plusieurs choix possibles)', (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {AGES.map(a => <button key={a} type="button" aria-pressed={form.categorie_age.includes(a)} onClick={() => setForm(f => ({ ...f, categorie_age: bascule(f.categorie_age, a) }))} style={styleChoix(colors, form.categorie_age.includes(a))}>{a}</button>)}
            </div>
          ), true)}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 140px' }}>{champ('Durée (minutes)', <input type="number" min="0" inputMode="numeric" value={form.duree} onChange={e => setForm(f => ({ ...f, duree: e.target.value }))} className={CLASSE_CHAMP} style={styleChamp(colors)} />)}</div>
            <div style={{ flex: '1 1 140px' }}>{champ('Nombre de joueurs', <input value={form.nb_joueurs} onChange={e => setForm(f => ({ ...f, nb_joueurs: e.target.value }))} placeholder="ex. 8 à 12" className={CLASSE_CHAMP} style={styleChamp(colors)} />)}</div>
          </div>
          {champ('Schéma tactique', (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <button type="button" onClick={() => setSchemaOuvert(true)} className={CLASSE_BOUTON_SECONDAIRE} style={styleBoutonSecondaire(colors)}>
                {form.schema_png ? 'Modifier le schéma' : 'Dessiner un schéma'}
              </button>
              {form.schema_png && <img src={miniatureSchema(form.schema_png, 200)} alt="Schéma tactique" style={{ height: 44, borderRadius: forme.rayonCarte, border: `1px solid ${colors.border.subtle}` }} />}
              {form.schema_png && <button type="button" onClick={() => setForm(f => ({ ...f, schema_png: '', schema_data: null }))} className={CLASSE_BOUTON_SECONDAIRE} style={{ ...styleBoutonSecondaire(colors), color: colors.accent.red, borderColor: colors.accent.red }}>Retirer</button>}
            </div>
          ))}
          {texte('objectif', 'Objectif', 2)}
          {texte('but', 'But', 2)}
          {texte('organisation', 'Organisation')}
          {texte('consignes', 'Consignes')}
          {texte('criteres_realisation', 'Critères de réalisation')}
          {texte('variables', 'Variables')}
          {texte('description', 'Description libre')}
          {champ('Mots-clés', <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="séparés par des virgules" className={CLASSE_CHAMP} style={styleChamp(colors)} />)}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setForm(null)} disabled={enCours} className={CLASSE_BOUTON_SECONDAIRE} style={styleBoutonSecondaire(colors)}>Annuler</button>
            <button type="button" onClick={enregistrer} disabled={formInvalide || enCours} className={CLASSE_BOUTON} style={styleBoutonPrincipal(colors)}>
              {enCours ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </>
      )}

      {schemaOuvert && form && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 3000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: 20 }}>
          <div style={{ ...styleCarte(colors), width: '100%', maxWidth: '95vw', padding: 24, margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: colors.text.primary }}>Schéma de {form.nom || 'ce procédé'}</p>
              <button type="button" aria-label="Fermer l'éditeur de schéma" onClick={() => setSchemaOuvert(false)} className={CLASSE_BOUTON_SECONDAIRE} style={{ ...styleBoutonSecondaire(colors), minHeight: 36, padding: '0 14px' }}>Fermer</button>
            </div>
            <Suspense fallback={<Loader />}>
              <Tactipad
                userId={userId}
                mode="modal"
                vueParDefaut="demi"
                initialSchema={form.schema_data}
                onValider={(png, schema) => {
                  setForm(f => ({ ...f, schema_png: png, schema_data: schema }))
                  setSchemaOuvert(false)
                  // PNG envoyé sur Cloudinary en arrière-plan, lien substitué si le schéma n'a pas changé entre-temps.
                  remplacerSchemaParLien(png, lien => setForm(f => (f && f.schema_png === png ? { ...f, schema_png: lien } : f)))
                }}
                onFermer={() => setSchemaOuvert(false)}
                lang="fr"
              />
            </Suspense>
          </div>
        </div>
      )}

      {scanOuvert && (
        <div style={{ position: 'fixed', inset: 0, background: colors.background.overlay, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}
          onClick={() => setScanOuvert(false)}>
          <div style={{ ...styleCarte(colors), padding: 24, maxHeight: '92vh', overflowY: 'auto', maxWidth: '100%' }} onClick={e => e.stopPropagation()}>
            <Suspense fallback={<Loader />}>
              <ScannerProc
                userId={userId}
                clubId={clubId}
                lang="fr"
                onFermer={() => setScanOuvert(false)}
                onResultat={depuisScan}
                libelleValider="Continuer vers la fiche"
              />
            </Suspense>
          </div>
        </div>
      )}

      {aSupprimer && modale(
        <>
          <h2 style={{ fontFamily: police.titre, fontWeight: 700, fontSize: 22, textTransform: 'uppercase', margin: '0 0 12px', color: colors.text.primary }}>Supprimer ce procédé ?</h2>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: colors.text.secondary, margin: '0 0 20px' }}>
            « {aSupprimer.nom} » disparaîtra de la bibliothèque du club, pour vous et pour vos éducateurs. Les séances où il a déjà été repris gardent leur copie.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setASupprimer(null)} disabled={enCours} className={CLASSE_BOUTON_SECONDAIRE} style={styleBoutonSecondaire(colors)}>Annuler</button>
            <button type="button" onClick={supprimer} disabled={enCours} className={CLASSE_BOUTON} style={{ ...styleBoutonPrincipal(colors), background: colors.accent.red, color: '#fff' }}>
              {enCours ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

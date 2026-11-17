import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import {
  CLASSE_BOUTON, CLASSE_BOUTON_SECONDAIRE, CLASSE_CHAMP,
  styleBoutonPrincipal, styleBoutonSecondaire, styleCarte, styleChamp,
} from '../../lib/identite'
import { police, forme } from '../../tokens'
import { fetchToutesLignes } from '../../lib/supabasePagination'
import EmptyState from '../EmptyState'
import Loader from '../Loader'
import BibliothequeVideos from '../BibliothequeVideos'
import { miniatureSchema } from '../../lib/schemaUpload'
import { TYPES, THEMES, AGES, Pastille, Rubrique, labelType } from './ProceduresClub'

// Onglet « Digital Football » de la bibliothèque du club (bloc 7).
// Lecture seule des procédés partagés par la plateforme et des vidéos Digital Football.
// « Copier dans la bibliothèque du club » crée une copie modifiable dans
// bibliotheque_club_procedes : l'original n'est jamais touché. La lecture est ouverte
// par la règle de base lecture_exercices_df_club (bloc 5), l'écriture par le bloc 1.
const PAR_PAGE = 60

const nomAuteur = p => [p.educateur?.prenom, p.educateur?.nom].filter(Boolean).join(' ').trim()

export default function DigitalFootballClub({ clubId, peutEditer = false, onVoirCopie }) {
  const colors = useColors()
  const [contenu, setContenu] = useState('procedes')
  const [procedes, setProcedes] = useState([])
  const [copies, setCopies] = useState(new Set()) // identifiants DF déjà copiés par le club
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [recherche, setRecherche] = useState('')
  const [fType, setFType] = useState('')
  const [fTheme, setFTheme] = useState('')
  const [fAge, setFAge] = useState('')
  const [visibleMax, setVisibleMax] = useState(PAR_PAGE)
  const [ouvert, setOuvert] = useState(null)
  const [enCours, setEnCours] = useState(false)
  const [message, setMessage] = useState('')
  const [copieFaite, setCopieFaite] = useState(false)

  const charger = useCallback(async () => {
    // Colonnes sans schéma : plus de 1000 procédés, le schéma est lu à l'ouverture et à la copie.
    const { data: un } = await supabase.from('bibliotheque_exercices').select('*').eq('partage_platform', true).limit(1)
    const colonnes = un?.length ? Object.keys(un[0]).filter(k => k !== 'schema_png' && k !== 'schema_data') : null
    const base = colonnes ? colonnes.join(',') : '*'
    const { data, error } = await fetchToutesLignes(() => supabase
      .from('bibliotheque_exercices')
      .select(`${base}, educateur:profiles_public!bibliotheque_exercices_educateur_id_fkey(prenom, nom)`)
      .eq('partage_platform', true)
      .order('type').order('nom').order('id'))
    if (error) setErreur('Impossible de charger les procédés Digital Football. Réessayez dans un instant.')
    else { setErreur(''); setProcedes(data || []) }
    if (clubId) {
      const { data: deja } = await supabase.from('bibliotheque_club_procedes').select('origine_id').eq('club_id', clubId).eq('origine', 'digital_football')
      setCopies(new Set((deja || []).map(r => r.origine_id).filter(Boolean)))
    }
    setChargement(false)
  }, [clubId])

  useEffect(() => { charger() }, [charger])
  useEffect(() => { setVisibleMax(PAR_PAGE) }, [recherche, fType, fTheme, fAge])

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return procedes.filter(p => {
      if (fType && p.type !== fType) return false
      if (fTheme && p.theme !== fTheme) return false
      if (fAge && !(p.categorie_age || []).includes(fAge)) return false
      if (!q) return true
      return [p.nom, p.theme, p.tags, p.but, p.objectif, p.description].some(v => (v || '').toLowerCase().includes(q))
    })
  }, [procedes, recherche, fType, fTheme, fAge])

  // Fiche : le schéma est lu à l'ouverture (il n'est pas dans la liste).
  const ouvrir = async p => {
    setOuvert(p)
    setCopieFaite(false)
    const { data } = await supabase.from('bibliotheque_exercices').select('schema_png, schema_data').eq('id', p.id).maybeSingle()
    if (data) setOuvert(cur => (cur?.id === p.id ? { ...cur, schema_png: data.schema_png, schema_data: data.schema_data, schemaLu: true } : cur))
    else setOuvert(cur => (cur?.id === p.id ? { ...cur, schemaLu: true } : cur))
  }

  const copier = async () => {
    if (!ouvert || enCours || !peutEditer) return
    setEnCours(true)
    // Sans le schéma lu, la copie le perdrait : on le relit au besoin, sinon on s'arrête.
    let p = ouvert
    if (!p.schemaLu) {
      const { data, error } = await supabase.from('bibliotheque_exercices').select('schema_png, schema_data').eq('id', p.id).maybeSingle()
      if (error || !data) { setEnCours(false); setMessage('Impossible de récupérer le schéma de ce procédé. Vérifiez votre connexion puis réessayez.'); return }
      p = { ...p, ...data }
    }
    const auteur = nomAuteur(p)
    const mention = `Copié de la bibliothèque Digital Football${auteur ? `, procédé de ${auteur}` : ''}.`
    const { error } = await supabase.from('bibliotheque_club_procedes').insert({
      club_id: clubId,
      origine: 'digital_football',
      origine_id: p.id,
      type: p.type, nom: p.nom, theme: p.theme || '',
      description: [p.description, mention].filter(s => s && String(s).trim()).join('\n\n'),
      consignes: p.consignes || '', variables: p.variables || '', duree: p.duree ?? null,
      nb_joueurs: p.nb_joueurs || '', tags: p.tags || '', objectif: p.objectif || null, but: p.but || null,
      criteres_realisation: p.criteres_realisation || null, principe_jeu: p.principe_jeu || null,
      organisation: p.organisation || null,
      categorie_age: p.categorie_age?.length ? p.categorie_age : ['Pour tous'],
      schema_png: p.schema_png || null, schema_data: p.schema_data || null,
    })
    setEnCours(false)
    if (error) {
      setMessage('Copie refusée. Vérifiez que vous avez le droit d\'écrire dans la bibliothèque du club, puis réessayez.')
      return
    }
    setCopies(prev => new Set(prev).add(p.id))
    setCopieFaite(true)
    setOuvert(null)
    setMessage(`« ${p.nom} » a été copié dans la bibliothèque du club. Vous pouvez maintenant le modifier, l'original Digital Football ne change pas.`)
  }

  const sousOnglets = (
    <div role="group" aria-label="Type de contenu" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
      {[{ id: 'procedes', label: 'Procédés' }, { id: 'videos', label: 'Vidéos' }].map(c => {
        const actif = contenu === c.id
        return (
          <button key={c.id} type="button" aria-pressed={actif} onClick={() => setContenu(c.id)}
            style={{ minHeight: 40, padding: '0 18px', borderRadius: 999, fontWeight: 700, fontSize: 14, cursor: 'pointer',
              border: `1px solid ${actif ? colors.accent.brand : colors.border.strong}`,
              background: actif ? colors.accent.brand : 'transparent',
              color: actif ? colors.accent.onBrand : colors.text.primary }}>
            {c.label}
          </button>
        )
      })}
    </div>
  )

  if (contenu === 'videos') {
    return (
      <div>
        {sousOnglets}
        <BibliothequeVideos type="df" peutAjouter={false} accentColor={colors.accent.brand} />
      </div>
    )
  }

  if (chargement) return <div>{sousOnglets}<Loader /></div>

  const dejaCopie = ouvert && copies.has(ouvert.id)

  return (
    <div>
      {sousOnglets}
      {message && (
        <div role="status" style={{ ...styleCarte(colors), marginBottom: 12, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', fontSize: 14, color: colors.text.primary }}>
          <span>{message}</span>
          <span style={{ display: 'flex', gap: 8 }}>
            {copieFaite && onVoirCopie && (
              <button type="button" onClick={onVoirCopie} className={CLASSE_BOUTON} style={{ ...styleBoutonPrincipal(colors), minHeight: 32, padding: '0 12px', fontSize: 12 }}>Voir dans la bibliothèque du club</button>
            )}
            <button type="button" onClick={() => setMessage('')} className={CLASSE_BOUTON_SECONDAIRE} style={{ ...styleBoutonSecondaire(colors), minHeight: 32, padding: '0 12px', fontSize: 12 }}>Fermer</button>
          </span>
        </div>
      )}
      {erreur && <p role="alert" style={{ color: colors.accent.red, fontSize: 14 }}>{erreur}</p>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <input type="search" value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher un procédé Digital Football"
          aria-label="Rechercher un procédé Digital Football" className={CLASSE_CHAMP} style={{ ...styleChamp(colors), flex: '1 1 220px', width: 'auto' }} />
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
        <EmptyState title="Aucun procédé Digital Football" subtitle="Les procédés partagés par la plateforme apparaîtront ici." />
      )}
      {procedes.length > 0 && filtres.length === 0 && (
        <p style={{ color: colors.text.secondary, fontSize: 14 }}>Aucun procédé ne correspond à cette recherche.</p>
      )}
      {filtres.length > 0 && (
        <p style={{ color: colors.text.dim, fontSize: 12, margin: '0 0 8px' }}>{filtres.length} procédé{filtres.length > 1 ? 's' : ''}</p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {filtres.slice(0, visibleMax).map(p => (
          <button key={p.id} type="button" onClick={() => ouvrir(p)} className="df-cliquable"
            style={{ ...styleCarte(colors), textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8, font: 'inherit', color: colors.text.primary }}>
            <span style={{ fontFamily: police.titre, fontWeight: 700, fontSize: 18, textTransform: 'uppercase', lineHeight: 1.15 }}>{p.nom}</span>
            <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Pastille colors={colors}>{labelType(p.type)}</Pastille>
              {p.theme && <Pastille colors={colors}>{p.theme}</Pastille>}
              {p.duree ? <Pastille colors={colors}>{p.duree} min</Pastille> : null}
              {copies.has(p.id) && <Pastille colors={colors}>Déjà copié</Pastille>}
            </span>
            {p.but && <span style={{ fontSize: 13, color: colors.text.secondary, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.but}</span>}
            {nomAuteur(p) && <span style={{ fontSize: 12, color: colors.text.dim }}>Par {nomAuteur(p)}</span>}
          </button>
        ))}
      </div>
      {filtres.length > visibleMax && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button type="button" onClick={() => setVisibleMax(n => n + PAR_PAGE)} className={CLASSE_BOUTON_SECONDAIRE} style={styleBoutonSecondaire(colors)}>Voir plus de procédés</button>
        </div>
      )}

      {ouvert && (
        <div style={{ position: 'fixed', inset: 0, background: colors.background.overlay, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
          <div role="dialog" aria-modal="true" style={{ ...styleCarte(colors), padding: 24, width: 640, maxWidth: '100%', maxHeight: '92vh', overflowY: 'auto' }}>
            <h2 style={{ fontFamily: police.titre, fontWeight: 700, fontSize: 24, textTransform: 'uppercase', margin: '0 0 10px', color: colors.text.primary }}>{ouvert.nom}</h2>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              <Pastille colors={colors}>{labelType(ouvert.type)}</Pastille>
              {ouvert.theme && <Pastille colors={colors}>{ouvert.theme}</Pastille>}
              {ouvert.duree ? <Pastille colors={colors}>{ouvert.duree} min</Pastille> : null}
              {ouvert.nb_joueurs ? <Pastille colors={colors}>{ouvert.nb_joueurs} joueurs</Pastille> : null}
              {(ouvert.categorie_age || []).map(a => <Pastille key={a} colors={colors}>{a}</Pastille>)}
            </div>
            {ouvert.schema_png && <img src={miniatureSchema(ouvert.schema_png, 900)} alt="Schéma tactique" style={{ width: '100%', maxHeight: 360, objectFit: 'contain', border: `1px solid ${colors.border.strong}`, borderRadius: forme.rayonCarte, marginBottom: 16, display: 'block' }} />}
            <Rubrique colors={colors} titre="Principe de jeu" texte={ouvert.principe_jeu} />
            <Rubrique colors={colors} titre="Objectif" texte={ouvert.objectif} />
            <Rubrique colors={colors} titre="But" texte={ouvert.but} />
            <Rubrique colors={colors} titre="Organisation" texte={ouvert.organisation} />
            <Rubrique colors={colors} titre="Consignes" texte={ouvert.consignes} />
            <Rubrique colors={colors} titre="Critères de réalisation" texte={ouvert.criteres_realisation} />
            <Rubrique colors={colors} titre="Variables" texte={ouvert.variables} />
            <Rubrique colors={colors} titre="Description" texte={ouvert.description} />
            {nomAuteur(ouvert) && <p style={{ fontSize: 12, color: colors.text.dim, margin: '0 0 16px' }}>Procédé de {nomAuteur(ouvert)}</p>}
            {dejaCopie && !copieFaite && (
              <p style={{ fontSize: 13, color: colors.text.secondary, margin: '0 0 16px' }}>Ce procédé est déjà dans la bibliothèque du club. Vous pouvez le copier une nouvelle fois si besoin.</p>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {peutEditer && (
                <button type="button" onClick={copier} disabled={enCours} className={CLASSE_BOUTON} style={styleBoutonPrincipal(colors)}>
                  {enCours ? 'Copie...' : 'Copier dans la bibliothèque du club'}
                </button>
              )}
              <button type="button" onClick={() => setOuvert(null)} className={CLASSE_BOUTON_SECONDAIRE} style={styleBoutonSecondaire(colors)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'
import { labelCategorie } from '../lib/categories'
import { getPoleDeCategorie, polesMasculins, polesFeminins } from '../constants/poles'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { TitreEcran, Etiquette, Icone } from '../components/identite'
import { styleCarte, styleChiffreHeros, styleBoutonSecondaire, couleurCraie, couleurClub, CLASSE_CLIQUABLE, CLASSE_BOUTON_SECONDAIRE } from '../lib/identite'
import { police, forme } from '../tokens'

const VUES = ['Jour', 'Semaine', 'Mois', 'Année']

// Couleurs de repère des types d'événement (liseré et marqueur, jamais du texte) :
// couleurs de statut fixes, indépendantes de la couleur du club.
const TYPE_COULEURS = {
  entrainement: '#3b82f6',
  match_dom:    '#22a85a',
  match_ext:    '#f97316',
  evenement:    '#a855f7',
  projet:       '#8b8fa3',
}

const TYPE_LABELS = {
  entrainement: 'Entraînement',
  match_dom:    'Match · Domicile',
  match_ext:    'Match · Extérieur',
  evenement:    'Événement',
  projet:       'Projet',
}

// Date locale au format YYYY-MM-DD — jamais toISOString() (convertit en UTC,
// ce qui décale la date d'un jour en France), même règle que partout ailleurs
// dans l'app (cf. PlanningTerrains.jsx/getDatesSemaine).
const dateLocaleStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Vue générale de toutes les équipes du club (matchs, entraînements,
// événements, projets) sur un calendrier Jour/Semaine/Mois/Année.
// matchs/evenements/projets/categories sont déjà chargés par DashboardClub.jsx
// (matchsClub, evenementsClub, projetsClub, categories) — pas de requête
// dupliquée ici. Seuls les entraînements (aucune vue "toutes catégories" du
// club n'existe encore ailleurs) sont chargés par ce composant, une fois,
// scopés aux éducateurs affiliés (dérivés de `categories`).
export default function Planning({ matchs = [], evenements = [], projets = [], categories = [] }) {
  const colors = useColors()
  const [vue, setVue] = useState('Semaine')
  const [dateRef, setDateRef] = useState(new Date())
  const [entrainements, setEntrainements] = useState([])
  const [filtres, setFiltres] = useState({
    entrainement: true, match_dom: true, match_ext: true,
    evenement: true, projet: true,
  })
  // 'general' = toutes les catégories ; sinon clé de POLES (cf. constants/poles.js).
  const [filtrePole, setFiltrePole] = useState('general')
  const [genrePole, setGenrePole] = useState('masculin')
  const [popup, setPopup] = useState(null)
  // Seuil aligné sur PlanningSemaineWidget.jsx (déjà en place ailleurs dans
  // l'app pour le même problème : grille 7 colonnes illisible sur téléphone).
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640)
  // Tablette (portrait/paysage, 640-1024px) : reste sur la grille desktop
  // (isMobile ne se déclenche qu'en dessous de 640) mais avec des cellules
  // resserrées — cf. isTablet passé aux vues ci-dessous.
  const [isTablet, setIsTablet] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 640 && window.innerWidth < 1024)
  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < 640)
      setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const educateurIds = useMemo(() => [...new Set(categories.map(c => c.educateur_id).filter(Boolean))], [categories])

  useEffect(() => {
    const charger = async () => {
      if (educateurIds.length === 0) { setEntrainements([]); return }
      const { data } = await supabase.from('entrainements').select('id, date, heure, description, lieu, educateur_id, club_categorie_id').in('educateur_id', educateurIds)
      setEntrainements(data || [])
    }
    charger()
  }, [educateurIds])

  // Résout la catégorie d'un entraînement/match par son club_categorie_id
  // d'abord — un éducateur peut encadrer plusieurs catégories (ex: U11 et
  // U18), donc retomber sur educateur_id seul attribuerait tout à sa
  // première catégorie trouvée. Fallback educateur_id conservé uniquement
  // pour les lignes créées avant l'ajout de la colonne (club_categorie_id
  // encore NULL).
  const catDeRecord = (record) => {
    if (record.club_categorie_id) {
      const cat = categories.find(c => c.id === record.club_categorie_id)
      if (cat) return cat
    }
    return categories.find(c => c.educateur_id === record.educateur_id) || null
  }

  const catLabel = (record) => {
    const cat = catDeRecord(record)
    return cat ? `${labelCategorie(cat.nom)}${cat.equipe ? ` ${cat.equipe}` : ''}` : null
  }

  const poleDe = (record) => {
    const cat = catDeRecord(record)
    return cat ? getPoleDeCategorie(cat.nom)?.key || null : null
  }

  // Fusionne les 4 sources en une liste normalisée { id, type, date, heure,
  // titre, sousTitre, description, pole } — un projet (date_debut/date_fin,
  // pas de date unique) est ancré sur sa date de début. evenements/projets
  // n'ont pas de catégorie (club_id uniquement, cf. schéma) donc pole=null :
  // ils n'apparaissent que dans le planning général, pas dans un pôle précis.
  const tousEvenements = useMemo(() => {
    const tous = []
    entrainements.forEach(e => tous.push({
      id: `s_${e.id}`, type: 'entrainement', date: e.date, heure: e.heure?.slice(0, 5) || null,
      titre: `${catLabel(e) ? catLabel(e) + ' · ' : ''}${e.description || 'Entraînement'}`,
      sousTitre: e.lieu || '', pole: poleDe(e),
    }))
    matchs.forEach(m => tous.push({
      id: `m_${m.id}`, type: m.domicile ? 'match_dom' : 'match_ext', date: m.date, heure: m.heure?.slice(0, 5) || null,
      titre: `${catLabel(m) ? catLabel(m) + ' · ' : ''}${m.domicile ? 'vs' : '@'} ${m.adversaire || 'Match'}`,
      sousTitre: `${m.domicile ? 'Domicile' : 'Extérieur'}${m.lieu ? ' · ' + m.lieu : ''}`, pole: poleDe(m),
    }))
    evenements.filter(e => e.sur_planning !== false).forEach(e => tous.push({
      id: `e_${e.id}`, type: 'evenement', date: e.date, heure: e.heure?.slice(0, 5) || null,
      titre: e.titre, sousTitre: e.lieu || '', description: e.description, pole: null,
    }))
    projets.forEach(p => tous.push({
      id: `p_${p.id}`, type: 'projet', date: p.date_debut, heure: null,
      titre: p.nom,
      sousTitre: p.date_fin && p.date_fin !== p.date_debut ? `Jusqu'au ${new Date(`${p.date_fin}T12:00:00`).toLocaleDateString('fr-FR')}` : '',
      description: p.description, pole: null,
    }))
    return tous.filter(e => e.date)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entrainements, matchs, evenements, projets, categories])

  const evtsFiltres = tousEvenements.filter(e => filtres[e.type] && (filtrePole === 'general' || e.pole === filtrePole))

  const getPlageDates = (ref, v) => {
    const d = new Date(ref)
    if (v === 'Jour') return { debut: d, fin: d }
    if (v === 'Semaine') {
      const lundi = new Date(d)
      lundi.setDate(d.getDate() - ((d.getDay() + 6) % 7))
      const dim = new Date(lundi); dim.setDate(lundi.getDate() + 6)
      return { debut: lundi, fin: dim }
    }
    if (v === 'Mois') return {
      debut: new Date(d.getFullYear(), d.getMonth(), 1),
      fin: new Date(d.getFullYear(), d.getMonth() + 1, 0),
    }
    return {
      debut: new Date(d.getFullYear(), 0, 1),
      fin: new Date(d.getFullYear(), 11, 31),
    }
  }

  const naviguer = (dir) => {
    const d = new Date(dateRef)
    if (vue === 'Jour') d.setDate(d.getDate() + dir)
    if (vue === 'Semaine') d.setDate(d.getDate() + dir * 7)
    if (vue === 'Mois') d.setMonth(d.getMonth() + dir)
    if (vue === 'Année') d.setFullYear(d.getFullYear() + dir)
    setDateRef(d)
  }

  const labelPeriode = () => {
    const { debut, fin } = getPlageDates(dateRef, vue)
    const fmt = (d, opts) => d.toLocaleDateString('fr-FR', opts)
    if (vue === 'Jour') return fmt(debut, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    if (vue === 'Semaine') return `${fmt(debut, { day: 'numeric', month: 'short' })} – ${fmt(fin, { day: 'numeric', month: 'long', year: 'numeric' })}`
    if (vue === 'Mois') return fmt(debut, { month: 'long', year: 'numeric' })
    return String(debut.getFullYear())
  }

  // V2 : compteur d'événements sur la période affichée, couleur du club
  // (accentColor) pour la vue active et le jour courant.
  const { debut: debutPlage, fin: finPlage } = getPlageDates(dateRef, vue)
  const nbSurPeriode = evtsFiltres.filter(e => e.date >= dateLocaleStr(debutPlage) && e.date <= dateLocaleStr(finPlage)).length
  // Bouton de choix (pôle, vue, genre, type) : plein à la couleur du club quand il est actif.
  const boutonChoix = actif => ({
    minHeight: '36px', padding: '0 14px', borderRadius: forme.rayonCarte, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    fontFamily: police.texte, fontSize: '13px', fontWeight: 600,
    background: actif ? colors.accent.brand : 'transparent',
    color: actif ? colors.accent.onBrand : colors.text.primary,
    border: `1px solid ${actif ? 'transparent' : colors.border.strong}`,
  })
  const boutonNav = { ...styleBoutonSecondaire(colors), minHeight: '36px', width: '36px', padding: 0 }

  return (
    <div style={{ width: '100%' }}>
      <TitreEcran titre="Planning" sousTitre={`Vue générale de toutes les équipes · ${nbSurPeriode} événement${nbSurPeriode > 1 ? 's' : ''} sur la période`} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: isMobile ? '12px' : '16px' }}>
        <div role="group" aria-label="Filtrer par pôle" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px', WebkitOverflowScrolling: 'touch' }}>
          <button type="button" className={CLASSE_CLIQUABLE} aria-pressed={filtrePole === 'general'} onClick={() => setFiltrePole('general')} style={boutonChoix(filtrePole === 'general')}>
            Planning général
          </button>
          {(genrePole === 'masculin' ? polesMasculins() : polesFeminins()).map(pole => (
            <button type="button" key={pole.key} className={CLASSE_CLIQUABLE} aria-pressed={filtrePole === pole.key} onClick={() => setFiltrePole(pole.key)} style={boutonChoix(filtrePole === pole.key)}>
              <span aria-hidden="true" style={{ width: '8px', height: '8px', borderRadius: '1px', background: pole.couleur, boxShadow: `0 0 0 1.5px ${filtrePole === pole.key ? colors.accent.onBrand : colors.text.primary}`, flexShrink: 0 }} />
              {pole.label}
            </button>
          ))}
        </div>

        <div role="group" aria-label="Genre" style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button type="button" className={CLASSE_CLIQUABLE} aria-pressed={genrePole === 'masculin'} onClick={() => { setGenrePole('masculin'); setFiltrePole('general') }} style={boutonChoix(genrePole === 'masculin')}>Masculin</button>
          <button type="button" className={CLASSE_CLIQUABLE} aria-pressed={genrePole === 'feminin'} onClick={() => { setGenrePole('feminin'); setFiltrePole('general') }} style={boutonChoix(genrePole === 'feminin')}>Féminin</button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', marginBottom: isMobile ? '14px' : '20px', flexWrap: 'wrap', gap: '12px', flexDirection: isMobile ? 'column' : 'row' }}>
        <div role="group" aria-label="Affichage" style={{ display: 'flex', gap: '6px', overflowX: isMobile ? 'auto' : 'visible' }}>
          {VUES.map(v => (
            <button type="button" key={v} className={CLASSE_CLIQUABLE} aria-pressed={vue === v} onClick={() => setVue(v)} style={{ ...boutonChoix(vue === v), flex: isMobile ? 1 : 'none', justifyContent: 'center' }}>{v}</button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'flex-start', gap: isMobile ? '8px' : '10px' }}>
          <button type="button" onClick={() => naviguer(-1)} className={CLASSE_BOUTON_SECONDAIRE} aria-label="Période précédente" title="Précédent" style={boutonNav}><Icone icone={ChevronLeft} /></button>
          <span aria-live="polite" style={{ fontFamily: police.titre, fontWeight: 700, fontSize: isMobile ? '17px' : '20px', color: colors.text.primary, minWidth: isMobile ? 0 : '220px', textAlign: 'center', flex: isMobile ? 1 : 'none', textTransform: 'uppercase', letterSpacing: '0.01em' }}>{labelPeriode()}</span>
          <button type="button" onClick={() => naviguer(1)} className={CLASSE_BOUTON_SECONDAIRE} aria-label="Période suivante" title="Suivant" style={boutonNav}><Icone icone={ChevronRight} /></button>
          <button type="button" onClick={() => setDateRef(new Date())} className={CLASSE_BOUTON_SECONDAIRE} style={{ ...styleBoutonSecondaire(colors), minHeight: '36px', fontSize: '13px' }}>Aujourd'hui</button>
        </div>

        <div role="group" aria-label="Types d'événements affichés" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-start' }}>
          {Object.entries(TYPE_COULEURS).map(([type, couleur]) => (
            <button type="button" key={type} className={CLASSE_CLIQUABLE} aria-pressed={filtres[type]} onClick={() => setFiltres(p => ({ ...p, [type]: !p[type] }))} style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px', minHeight: '32px',
              padding: '0 10px', borderRadius: forme.rayonPastille,
              border: `1px solid ${filtres[type] ? colors.border.strong : colors.border.default}`,
              background: 'transparent',
              color: filtres[type] ? colors.text.primary : colors.text.dim,
              textDecoration: filtres[type] ? 'none' : 'line-through',
              fontFamily: police.texte, fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            }}>
              <span aria-hidden="true" style={{ width: '8px', height: '8px', borderRadius: '1px', background: filtres[type] ? couleur : colors.border.strong, display: 'inline-block' }} />
              {TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {vue === 'Jour' && <VueJour dateRef={dateRef} evenements={evtsFiltres} onClic={setPopup} isMobile={isMobile} />}
      {vue === 'Semaine' && <VueSemaine dateRef={dateRef} evenements={evtsFiltres} onClic={setPopup} isMobile={isMobile} isTablet={isTablet} />}
      {vue === 'Mois' && <VueMois dateRef={dateRef} evenements={evtsFiltres} onClic={setPopup} isMobile={isMobile} isTablet={isTablet} />}
      {vue === 'Année' && <VueAnnee dateRef={dateRef} evenements={evtsFiltres} onClic={setPopup} isMobile={isMobile} isTablet={isTablet} />}

      {popup && (
        <div onClick={() => setPopup(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div role="dialog" aria-modal="true" aria-label={popup.titre} onClick={e => e.stopPropagation()}
            style={{ ...styleCarte(colors), background: colors.background.surface, boxShadow: `inset 3px 0 0 ${TYPE_COULEURS[popup.type]}`, padding: isMobile ? '20px 20px 20px 23px' : '28px 28px 28px 31px', maxWidth: '420px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <Etiquette as="span">{TYPE_LABELS[popup.type]}</Etiquette>
              <button type="button" onClick={() => setPopup(null)} aria-label="Fermer" className={CLASSE_CLIQUABLE} style={{ background: 'none', border: 'none', color: colors.text.secondary, cursor: 'pointer', display: 'inline-flex', padding: '6px' }}><Icone icone={X} /></button>
            </div>
            <h3 style={{ fontFamily: police.titre, fontWeight: 700, textTransform: 'uppercase', color: colors.text.primary, fontSize: '22px', lineHeight: 1.15, margin: '0 0 8px' }}>{popup.titre}</h3>
            {popup.sousTitre && <p style={{ color: colors.text.secondary, fontFamily: police.texte, fontSize: '14px', margin: '0 0 8px' }}>{popup.sousTitre}</p>}
            <p style={{ color: colors.text.primary, fontFamily: police.texte, fontWeight: 600, fontSize: '14px', margin: '0 0 12px', textTransform: 'capitalize' }}>
              {new Date(`${popup.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              {popup.heure && ` · ${popup.heure}`}
            </p>
            {popup.description && <p style={{ color: colors.text.secondary, fontFamily: police.texte, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{popup.description}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

// Élément d'événement cliquable (au clavier aussi) : liseré à la couleur du type.
const clavier = onClic => e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClic() } }
const itemProps = (e, onClic) => ({
  role: 'button', tabIndex: 0, onClick: () => onClic(e), onKeyDown: clavier(() => onClic(e)),
  'aria-label': `${TYPE_LABELS[e.type]}${e.heure ? ` à ${e.heure}` : ''} : ${e.titre}`,
  className: CLASSE_CLIQUABLE,
})

function VueJour({ dateRef, evenements, onClic, isMobile }) {
  const colors = useColors()
  const dateStr = dateLocaleStr(dateRef)
  const evts = evenements.filter(e => e.date === dateStr).sort((a, b) => (a.heure || '').localeCompare(b.heure || ''))
  return (
    <div style={{ maxWidth: '640px' }}>
      {evts.length === 0
        ? <p style={{ color: colors.text.dim, fontFamily: police.texte, fontSize: '14px' }}>Aucun événement ce jour.</p>
        : evts.map(e => (
          <div key={e.id} {...itemProps(e, onClic)} style={{
            ...styleCarte(colors), display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '16px',
            padding: isMobile ? '12px 14px 12px 17px' : '14px 18px 14px 21px', marginBottom: '8px',
            boxShadow: `inset 3px 0 0 ${TYPE_COULEURS[e.type]}`, cursor: 'pointer',
          }}>
            <div style={{ ...styleChiffreHeros(colors, 22), minWidth: '58px' }}>{e.heure || '—'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: colors.text.primary, fontFamily: police.texte, fontWeight: 600, fontSize: '15px' }}>{e.titre}</div>
              {e.sousTitre && <div style={{ color: colors.text.dim, fontFamily: police.texte, fontSize: '13px', marginTop: '2px' }}>{e.sousTitre}</div>}
            </div>
            <Etiquette as="span" style={{ flexShrink: 0, fontSize: '11px' }}>{TYPE_LABELS[e.type]}</Etiquette>
          </div>
        ))
      }
    </div>
  )
}

function VueSemaine({ dateRef, evenements, onClic, isMobile, isTablet }) {
  const colors = useColors()
  const lundi = new Date(dateRef)
  lundi.setDate(dateRef.getDate() - ((dateRef.getDay() + 6) % 7))
  const jours = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lundi); d.setDate(lundi.getDate() + i); return d
  })
  const today = dateLocaleStr(new Date())
  const club = couleurClub(colors)

  // Grille 7 colonnes illisible sous 640px (chaque colonne ~50px) — liste
  // verticale à la place, un jour par ligne, même pattern déjà en place dans
  // PlanningSemaineWidget.jsx pour le même problème.
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {jours.map(jour => {
          const dateStr = dateLocaleStr(jour)
          const evts = evenements.filter(e => e.date === dateStr).sort((a, b) => (a.heure || '').localeCompare(b.heure || ''))
          const isToday = dateStr === today
          return (
            <div key={dateStr} aria-current={isToday ? 'date' : undefined} style={{ ...styleCarte(colors), padding: '10px 12px', boxShadow: isToday ? `inset 3px 0 0 ${club}` : 'none', paddingLeft: isToday ? '15px' : '12px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: evts.length ? '8px' : 0 }}>
                <div style={styleChiffreHeros(colors, 24)}>{jour.getDate()}</div>
                <Etiquette as="div">{jour.toLocaleDateString('fr-FR', { weekday: 'long' })}{isToday ? " · aujourd'hui" : ''}</Etiquette>
              </div>
              {evts.map(e => (
                <div key={e.id} {...itemProps(e, onClic)} style={{
                  background: colors.background.base, boxShadow: `inset 3px 0 0 ${TYPE_COULEURS[e.type]}`,
                  borderRadius: '4px', padding: '8px 10px 8px 13px', marginBottom: '4px', cursor: 'pointer',
                }}>
                  <div style={{ color: colors.text.primary, fontFamily: police.texte, fontSize: '13px', fontWeight: 600 }}>
                    {e.heure && <span style={{ fontFamily: police.titre, fontSize: '15px', fontVariantNumeric: 'tabular-nums', marginRight: '8px' }}>{e.heure}</span>}
                    {e.titre}
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: isTablet ? '5px' : '8px' }}>
      {jours.map(jour => {
        const dateStr = dateLocaleStr(jour)
        const evts = evenements.filter(e => e.date === dateStr).sort((a, b) => (a.heure || '').localeCompare(b.heure || ''))
        const isToday = dateStr === today
        return (
          // minWidth: 0 — sans ça, un titre en white-space:nowrap plus bas
          // impose sa largeur de contenu minimale à la cellule (comportement
          // par défaut d'un enfant de grid), ce qui pousse les 7 colonnes
          // au-delà de leur 1fr et fait déborder toute la grille de l'écran
          // sur tablette (jamais visible sur desktop, où il y a de la marge).
          <div key={dateStr} aria-current={isToday ? 'date' : undefined} style={{ ...styleCarte(colors), overflow: 'hidden', padding: isTablet ? '6px' : '10px', minHeight: '150px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', paddingBottom: isTablet ? '6px' : '8px', marginBottom: isTablet ? '6px' : '8px', borderBottom: isToday ? `3px solid ${club}` : `1px solid ${couleurCraie(colors)}` }}>
              <span style={{ ...styleChiffreHeros(colors, isTablet ? 20 : 26) }}>{jour.getDate()}</span>
              <Etiquette as="span" style={{ fontSize: isTablet ? '10px' : '11px' }}>{jour.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}</Etiquette>
            </div>
            {evts.map(e => (
              <div key={e.id} {...itemProps(e, onClic)} title={e.titre} style={{
                background: colors.background.base, boxShadow: `inset 3px 0 0 ${TYPE_COULEURS[e.type]}`,
                borderRadius: '4px', padding: isTablet ? '4px 5px 4px 8px' : '6px 7px 6px 10px', marginBottom: '5px', cursor: 'pointer',
              }}>
                {e.heure && <div style={{ fontFamily: police.titre, color: colors.text.primary, fontSize: isTablet ? '12px' : '14px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{e.heure}</div>}
                <div style={{ color: colors.text.primary, fontFamily: police.texte, fontSize: isTablet ? '11px' : '12px', fontWeight: 500, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflowWrap: 'anywhere' }}>
                  {e.titre}
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function VueMois({ dateRef, evenements, onClic, isMobile, isTablet }) {
  const colors = useColors()
  const annee = dateRef.getFullYear()
  const mois = dateRef.getMonth()
  const decalage = (new Date(annee, mois, 1).getDay() + 6) % 7
  const nbJours = new Date(annee, mois + 1, 0).getDate()
  const today = dateLocaleStr(new Date())
  const club = couleurClub(colors)
  const cellules = Array(decalage).fill(null).concat(Array.from({ length: nbJours }, (_, i) => i + 1))
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? '3px' : '4px', marginBottom: '4px' }}>
        {(isMobile ? ['L', 'M', 'M', 'J', 'V', 'S', 'D'] : ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']).map((j, i) =>
          <Etiquette key={i} as="div" style={{ fontSize: '11px', textAlign: 'center', padding: isMobile ? '4px 0' : '6px 0' }}>{j}</Etiquette>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? '3px' : '4px' }}>
        {cellules.map((jour, idx) => {
          if (!jour) return <div key={`v${idx}`} />
          const dateStr = `${annee}-${String(mois + 1).padStart(2, '0')}-${String(jour).padStart(2, '0')}`
          const evts = evenements.filter(e => e.date === dateStr)
          const isToday = dateStr === today
          // Sous 640px, un titre par cellule ne rentre pas (colonnes ~45px) —
          // marqueurs de couleur à la place (un par événement, au clic ouvre
          // le premier), même esprit que le calendrier joueur déjà réglé.
          if (isMobile) {
            const cliquable = evts.length > 0
            const propsCellule = cliquable ? itemProps(evts[0], onClic) : {}
            return (
              <div key={dateStr} {...propsCellule} aria-current={isToday ? 'date' : undefined}
                aria-label={cliquable ? `${jour}, ${evts.length} événement${evts.length > 1 ? 's' : ''}, ouvrir le premier : ${evts[0].titre}` : undefined}
                style={{ ...styleCarte(colors), padding: '4px', minHeight: '44px', textAlign: 'center', boxShadow: isToday ? `inset 0 -3px 0 ${club}` : 'none', cursor: cliquable ? 'pointer' : 'default' }}>
                <div style={{ fontFamily: police.titre, color: colors.text.primary, fontSize: '14px', fontWeight: isToday ? 700 : 500 }}>{jour}</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', marginTop: '3px', flexWrap: 'wrap' }}>
                  {evts.slice(0, 4).map(e => (
                    <span key={e.id} aria-hidden="true" style={{ width: '6px', height: '6px', borderRadius: '1px', background: TYPE_COULEURS[e.type], display: 'inline-block' }} />
                  ))}
                </div>
              </div>
            )
          }
          return (
            // minWidth: 0 — même correctif que VueSemaine : un titre d'événement
            // en white-space:nowrap imposerait sinon sa largeur minimale à la
            // cellule et ferait déborder les 7 colonnes de l'écran sur tablette.
            <div key={dateStr} aria-current={isToday ? 'date' : undefined} style={{ ...styleCarte(colors), overflow: 'hidden', borderRadius: '4px', padding: isTablet ? '5px 3px' : '8px', minHeight: isTablet ? '76px' : '92px', boxShadow: isToday ? `inset 0 3px 0 ${club}` : 'none' }}>
              <div style={{ fontFamily: police.titre, color: colors.text.primary, fontSize: isTablet ? '15px' : '17px', fontWeight: isToday ? 700 : 500, marginBottom: '6px' }}>{jour}</div>
              {evts.slice(0, isTablet ? 2 : 3).map(e => (
                <div key={e.id} {...itemProps(e, onClic)} style={{
                  background: colors.background.base, boxShadow: `inset 3px 0 0 ${TYPE_COULEURS[e.type]}`,
                  borderRadius: '3px', padding: '2px 5px 2px 8px', marginBottom: '3px',
                  fontFamily: police.texte, fontSize: '11px', color: colors.text.primary, cursor: 'pointer',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{e.titre}</div>
              ))}
              {evts.length > (isTablet ? 2 : 3) && <div style={{ color: colors.text.dim, fontFamily: police.texte, fontSize: '11px' }}>+{evts.length - (isTablet ? 2 : 3)} de plus</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function VueAnnee({ dateRef, evenements, isMobile, isTablet }) {
  const colors = useColors()
  const annee = dateRef.getFullYear()
  const moisNoms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? '8px' : '12px' }}>
      {moisNoms.map((nom, i) => {
        const evtsMois = evenements.filter(e => {
          const d = new Date(`${e.date}T12:00:00`)
          return d.getFullYear() === annee && d.getMonth() === i
        })
        const parType = {}
        evtsMois.forEach(e => { parType[e.type] = (parType[e.type] || 0) + 1 })
        return (
          <div key={nom} style={{ ...styleCarte(colors), padding: isMobile ? '10px' : '14px' }}>
            <Etiquette as="div" style={{ marginBottom: '10px' }}>{nom}</Etiquette>
            {evtsMois.length === 0
              ? <div style={{ color: colors.text.dim, fontFamily: police.texte, fontSize: '13px' }}>—</div>
              : Object.entries(parType).map(([type, count]) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span aria-hidden="true" style={{ width: '8px', height: '8px', borderRadius: '1px', background: TYPE_COULEURS[type], flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ color: colors.text.secondary, fontFamily: police.texte, fontSize: '13px' }}><strong style={{ fontFamily: police.titre, fontSize: '15px', color: colors.text.primary, fontVariantNumeric: 'tabular-nums' }}>{count}</strong> {TYPE_LABELS[type].toLowerCase()}{count > 1 ? 's' : ''}</span>
                </div>
              ))
            }
          </div>
        )
      })}
    </div>
  )
}

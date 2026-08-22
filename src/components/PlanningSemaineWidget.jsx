import { useState, useEffect } from 'react'

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const dateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const lundiDeSemaine = (offset) => {
  const now = new Date()
  const decalage = (now.getDay() + 6) % 7
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - decalage + offset * 7)
}

// Grille calendrier classique (semaines complètes, lundi→dimanche) pour le mois
// courant + offset, avec padding des jours du mois précédent/suivant pour compléter
// les semaines de la première/dernière ligne.
const grilleDuMois = (offset) => {
  const now = new Date()
  const premier = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const dernier = new Date(premier.getFullYear(), premier.getMonth() + 1, 0)
  const debut = new Date(premier)
  debut.setDate(premier.getDate() - ((premier.getDay() + 6) % 7))
  const fin = new Date(dernier)
  fin.setDate(dernier.getDate() + (6 - (dernier.getDay() + 6) % 7))
  const jours = []
  const cur = new Date(debut)
  while (cur <= fin) { jours.push(new Date(cur)); cur.setDate(cur.getDate() + 1) }
  return { jours, moisCourant: premier.getMonth() }
}

// Exporté pour réutilisation par SondageSemaine.jsx (vue mois du planning
// joueur) — même rendu de puces événement que le calendrier éducateur/club,
// pas une deuxième implémentation qui dériverait de celle-ci avec le temps.
export function EvenementsJour({ ents, mts, evts, compact, onClickEntrainement, onClickMatch, onClickEvenement }) {
  const items = [
    ...ents.map(e => ({ type: 'entrainement', data: e })),
    ...mts.map(m => ({ type: 'match', data: m })),
    ...evts.map(v => ({ type: 'evenement', data: v })),
  ]
  const max = compact ? 2 : items.length
  const visibles = items.slice(0, max)
  const reste = items.length - visibles.length

  return (
    <>
      {visibles.map(({ type, data }) => {
        if (type === 'entrainement') return (
          <div key={`e-${data.id}`} onClick={() => onClickEntrainement?.(data)}
            style={{
              background: '#ef444420', border: '1px solid #ef444450', color: '#ef4444',
              borderRadius: '6px', padding: compact ? '1px 4px' : '3px 6px', fontSize: compact ? '9px' : '10px', fontWeight: 600,
              cursor: onClickEntrainement ? 'pointer' : 'default',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
            }}>
            {compact ? (data.description || 'Entraînement') : `${data.heure ? `${data.heure} · ` : ''}${data.description || 'Entraînement'}`}
          </div>
        )
        if (type === 'evenement') return (
          <div key={`v-${data.id}`} onClick={() => onClickEvenement?.(data)}
            style={{
              background: '#a855f720', border: '1px solid #a855f750', color: '#a855f7',
              borderRadius: '6px', padding: compact ? '1px 4px' : '3px 6px', fontSize: compact ? '9px' : '10px', fontWeight: 600,
              cursor: onClickEvenement ? 'pointer' : 'default',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
            }}>
            {compact ? (data.titre || 'Événement') : `${data.heure ? `${data.heure} · ` : ''}${data.titre || 'Événement'}`}
          </div>
        )
        return (
          <div key={`m-${data.id}`} onClick={() => onClickMatch?.(data)}
            style={{
              background: '#262626', border: '1px solid #333', color: '#ddd',
              borderRadius: '6px', padding: compact ? '1px 4px' : '3px 6px', fontSize: compact ? '9px' : '10px', fontWeight: 600,
              cursor: onClickMatch ? 'pointer' : 'default', minWidth: 0,
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', overflow: 'hidden' }}>
              {compact && (
                <span title={data.domicile ? 'Domicile' : 'Extérieur'} style={{ flexShrink: 0, fontWeight: 800, color: data.domicile ? '#4ade80' : '#f97316' }}>
                  {data.domicile ? 'D' : 'E'}
                </span>
              )}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {compact
                  ? `${data.categorie ? `${data.categorie} · ` : ''}${data.adversaire || 'Match'}`
                  : `${data.heure ? `${data.heure} · ` : ''}${data.adversaire || 'Match'}`}
              </span>
            </div>
            {!compact && (
              <div style={{ display: 'flex', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
                {data.categorie && (
                  <span style={{ display: 'inline-block', fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '10px', background: '#60a5fa20', color: '#60a5fa' }}>
                    {data.categorie}
                  </span>
                )}
                <span style={{
                  display: 'inline-block', fontSize: '9px', fontWeight: 700,
                  padding: '1px 6px', borderRadius: '10px',
                  background: data.domicile ? '#4ade8020' : '#f9731620',
                  color: data.domicile ? '#4ade80' : '#f97316',
                }}>
                  {data.domicile ? 'Domicile' : 'Extérieur'}
                </span>
              </div>
            )}
          </div>
        )
      })}
      {reste > 0 && <p style={{ margin: 0, fontSize: '9px', color: '#555' }}>+{reste}</p>}
    </>
  )
}

// Widget Planning lecture/navigation, généré depuis entrainements + matchs_equipe déjà
// chargés (pas de requête ici) — réutilisé par le dashboard éducateur (cliquable, navigue
// vers les sections) et le dashboard joueur (lecture seule, pas de callbacks). Vue semaine
// (par défaut) ou mois, togglées dans le header. Responsive en interne (pas de prop
// isMobile requise du parent) : sous 640px, la vue semaine passe en liste verticale
// (une grille à 7 colonnes serait illisible sur un téléphone) ; la vue mois garde sa
// grille (attendu même en mobile pour un calendrier mensuel) avec des cellules resserrées.
// accentColor : couleur de la nav (‹ ›), du toggle Semaine/Mois et du surlignage
// "aujourd'hui" — défaut bleu (dashboard éducateur/joueur), passée en vert par le
// dashboard club. Les couleurs des puces entraînement/match/événement restent
// fixes (rouge/gris/violet) pour rester distinguables entre elles quel que soit
// le dashboard hôte.
export default function PlanningSemaineWidget({ entrainements = [], matchs = [], evenements = [], onClickEntrainement, onClickMatch, onClickEvenement, accentColor = '#60a5fa' }) {
  const [vue, setVue] = useState('semaine')
  const [offset, setOffset] = useState(0)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640)
  const aujourdhuiStr = dateStr(new Date())

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const changerVue = (v) => { setVue(v); setOffset(0) }

  let jours, label, moisCourant = null
  if (vue === 'semaine') {
    const lundi = lundiDeSemaine(offset)
    jours = Array.from({ length: 7 }, (_, i) => { const d = new Date(lundi); d.setDate(lundi.getDate() + i); return d })
    const dimanche = jours[6]
    label = `${lundi.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${dimanche.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
  } else {
    const grille = grilleDuMois(offset)
    jours = grille.jours
    moisCourant = grille.moisCourant
    const nomMois = jours.find(d => d.getMonth() === moisCourant).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    label = nomMois.charAt(0).toUpperCase() + nomMois.slice(1)
  }

  const listeVerticale = vue === 'semaine' && isMobile

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
        <button onClick={() => setOffset(o => o - 1)}
          style={{ background: 'transparent', border: '1px solid #2a2a2a', color: accentColor, borderRadius: '8px', width: '28px', height: '28px', cursor: 'pointer', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>
          ‹
        </button>
        <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#888', flex: 1, textAlign: 'center' }}>{label}</p>
        <button onClick={() => setOffset(o => o + 1)}
          style={{ background: 'transparent', border: '1px solid #2a2a2a', color: accentColor, borderRadius: '8px', width: '28px', height: '28px', cursor: 'pointer', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>
          ›
        </button>
        <div style={{ display: 'flex', background: '#1a1a1a', borderRadius: '8px', padding: '2px', gap: '2px' }}>
          {[['semaine', 'Semaine'], ['mois', 'Mois']].map(([v, lbl]) => (
            <button key={v} onClick={() => changerVue(v)}
              style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', background: vue === v ? accentColor : 'transparent', color: vue === v ? '#000' : '#888' }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {listeVerticale ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {jours.map((d, i) => {
            const s = dateStr(d)
            const ents = entrainements.filter(e => e.date === s)
            const mts = matchs.filter(m => m.date === s)
            const evts = evenements.filter(v => v.date === s)
            const estAujourdhui = s === aujourdhuiStr
            const vide = ents.length === 0 && mts.length === 0 && evts.length === 0
            return (
              <div key={s} style={{
                display: 'flex', gap: '10px', alignItems: vide ? 'center' : 'flex-start',
                background: '#0a0a0a', borderRadius: '10px', padding: '8px 10px',
                border: `1px solid ${estAujourdhui ? accentColor : '#1a1a1a'}`,
              }}>
                <div style={{ width: '46px', flexShrink: 0, textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: estAujourdhui ? accentColor : '#555' }}>{JOURS[i]}</p>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: estAujourdhui ? accentColor : '#fff' }}>{d.getDate()}</p>
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {vide ? (
                    <p style={{ margin: 0, fontSize: '11px', color: '#333' }}>—</p>
                  ) : (
                    <EvenementsJour ents={ents} mts={mts} evts={evts} compact={false} onClickEntrainement={onClickEntrainement} onClickMatch={onClickMatch} onClickEvenement={onClickEvenement} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: vue === 'mois' ? '4px' : '6px', minWidth: 0 }}>
          {jours.map((d, i) => {
            const s = dateStr(d)
            const ents = entrainements.filter(e => e.date === s)
            const mts = matchs.filter(m => m.date === s)
            const evts = evenements.filter(v => v.date === s)
            const estAujourdhui = s === aujourdhuiStr
            const vide = ents.length === 0 && mts.length === 0 && evts.length === 0
            const horsMois = vue === 'mois' && d.getMonth() !== moisCourant
            return (
              <div key={s} style={{
                minHeight: vue === 'mois' ? (isMobile ? '44px' : '56px') : '90px', background: '#0a0a0a', borderRadius: '10px', padding: isMobile && vue === 'mois' ? '3px' : '5px',
                border: `1px solid ${estAujourdhui ? accentColor : '#1a1a1a'}`,
                display: 'flex', flexDirection: 'column', gap: '3px',
                opacity: horsMois ? 0.35 : 1,
                minWidth: 0, // sans ça, une grille à 1fr respecte quand même la largeur "min-content"
                // du contenu (texte nowrap des chips) et déborde — piège classique de CSS Grid.
              }}>
                <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: estAujourdhui ? accentColor : vide ? '#333' : '#555' }}>
                  {vue === 'semaine' ? `${JOURS[i % 7]} ${d.getDate()}` : d.getDate()}
                </p>
                <EvenementsJour ents={ents} mts={mts} evts={evts} compact={vue === 'mois'} onClickEntrainement={onClickEntrainement} onClickMatch={onClickMatch} onClickEvenement={onClickEvenement} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'

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

function EvenementsJour({ ents, mts, compact, onClickEntrainement, onClickMatch }) {
  const items = [
    ...ents.map(e => ({ type: 'entrainement', data: e })),
    ...mts.map(m => ({ type: 'match', data: m })),
  ]
  const max = compact ? 2 : items.length
  const visibles = items.slice(0, max)
  const reste = items.length - visibles.length

  return (
    <>
      {visibles.map(({ type, data }) => type === 'entrainement' ? (
        <div key={`e-${data.id}`} onClick={() => onClickEntrainement?.(data)}
          style={{
            background: '#ef444420', border: '1px solid #ef444450', color: '#ef4444',
            borderRadius: '6px', padding: compact ? '1px 4px' : '3px 6px', fontSize: compact ? '9px' : '10px', fontWeight: 600,
            cursor: onClickEntrainement ? 'pointer' : 'default',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
          {compact ? (data.description || 'Entraînement') : `${data.heure ? `${data.heure} · ` : ''}${data.description || 'Entraînement'}`}
        </div>
      ) : (
        <div key={`m-${data.id}`} onClick={() => onClickMatch?.(data)}
          style={{
            background: '#262626', border: '1px solid #333', color: '#ddd',
            borderRadius: '6px', padding: compact ? '1px 4px' : '3px 6px', fontSize: compact ? '9px' : '10px', fontWeight: 600,
            cursor: onClickMatch ? 'pointer' : 'default',
          }}>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {compact ? (data.adversaire || 'Match') : `${data.heure ? `${data.heure} · ` : ''}${data.adversaire || 'Match'}`}
          </div>
          {!compact && (
            <span style={{
              display: 'inline-block', marginTop: '2px', fontSize: '9px', fontWeight: 700,
              padding: '1px 6px', borderRadius: '10px',
              background: data.domicile ? '#4ade8020' : '#f9731620',
              color: data.domicile ? '#4ade80' : '#f97316',
            }}>
              {data.domicile ? 'Domicile' : 'Extérieur'}
            </span>
          )}
        </div>
      ))}
      {reste > 0 && <p style={{ margin: 0, fontSize: '9px', color: '#555' }}>+{reste}</p>}
    </>
  )
}

// Widget Planning lecture/navigation, généré depuis entrainements + matchs_equipe déjà
// chargés (pas de requête ici) — réutilisé par le dashboard éducateur (cliquable, navigue
// vers les sections) et le dashboard joueur (lecture seule, pas de callbacks). Vue semaine
// (par défaut) ou mois, togglées dans le header.
export default function PlanningSemaineWidget({ entrainements = [], matchs = [], onClickEntrainement, onClickMatch }) {
  const [vue, setVue] = useState('semaine')
  const [offset, setOffset] = useState(0)
  const aujourdhuiStr = dateStr(new Date())

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

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
        <button onClick={() => setOffset(o => o - 1)}
          style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#60a5fa', borderRadius: '8px', width: '28px', height: '28px', cursor: 'pointer', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>
          ‹
        </button>
        <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#888', flex: 1, textAlign: 'center' }}>{label}</p>
        <button onClick={() => setOffset(o => o + 1)}
          style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#60a5fa', borderRadius: '8px', width: '28px', height: '28px', cursor: 'pointer', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>
          ›
        </button>
        <div style={{ display: 'flex', background: '#1a1a1a', borderRadius: '8px', padding: '2px', gap: '2px' }}>
          {[['semaine', 'Semaine'], ['mois', 'Mois']].map(([v, lbl]) => (
            <button key={v} onClick={() => changerVue(v)}
              style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', background: vue === v ? '#60a5fa' : 'transparent', color: vue === v ? '#000' : '#888' }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: vue === 'mois' ? '4px' : '6px' }}>
        {jours.map((d, i) => {
          const s = dateStr(d)
          const ents = entrainements.filter(e => e.date === s)
          const mts = matchs.filter(m => m.date === s)
          const estAujourdhui = s === aujourdhuiStr
          const vide = ents.length === 0 && mts.length === 0
          const horsMois = vue === 'mois' && d.getMonth() !== moisCourant
          return (
            <div key={s} style={{
              minHeight: vue === 'mois' ? '56px' : '90px', background: '#0a0a0a', borderRadius: '10px', padding: '5px',
              border: `1px solid ${estAujourdhui ? '#60a5fa' : '#1a1a1a'}`,
              display: 'flex', flexDirection: 'column', gap: '3px',
              opacity: horsMois ? 0.35 : 1,
            }}>
              <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: estAujourdhui ? '#60a5fa' : vide ? '#333' : '#555' }}>
                {vue === 'semaine' ? `${JOURS[i % 7]} ${d.getDate()}` : d.getDate()}
              </p>
              <EvenementsJour ents={ents} mts={mts} compact={vue === 'mois'} onClickEntrainement={onClickEntrainement} onClickMatch={onClickMatch} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

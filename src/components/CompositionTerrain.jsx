import { useState } from 'react'

// Formations disponibles — chaque ligne totalise toujours 11 (gardien inclus),
// dans l'ordre naturel gardien → attaque. C'est aussi l'ordre de stockage du
// tableau titulaires (index 0 = gardien) : la ligne d'attaque n'est mise en
// haut visuellement qu'au rendu (cf. lignesAffichees), jamais dans les données.
export const FORMATIONS = {
  '4-4-2':   { lignes: [{ n: 1 }, { n: 4 }, { n: 4 }, { n: 2 }] },
  '4-3-3':   { lignes: [{ n: 1 }, { n: 4 }, { n: 3 }, { n: 3 }] },
  '3-5-2':   { lignes: [{ n: 1 }, { n: 3 }, { n: 5 }, { n: 2 }] },
  '3-4-3':   { lignes: [{ n: 1 }, { n: 3 }, { n: 4 }, { n: 3 }] },
  '5-3-2':   { lignes: [{ n: 1 }, { n: 5 }, { n: 3 }, { n: 2 }] },
  '4-2-3-1': { lignes: [{ n: 1 }, { n: 4 }, { n: 2 }, { n: 3 }, { n: 1 }] },
}

const MAX_REMPLACANTS = 7

const AvatarJoueur = ({ joueur, taille = 58 }) =>
  joueur?.avatar_url ? (
    <img src={joueur.avatar_url} style={{ width: '100%', height: '130%', objectFit: 'cover', objectPosition: 'top' }} alt="" />
  ) : joueur ? (
    <span style={{ color: '#fff', fontWeight: 900, fontSize: `${Math.round(taille * 0.29)}px` }}>{joueur.prenom?.[0]}{joueur.nom?.[0]}</span>
  ) : (
    <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: `${Math.round(taille * 0.38)}px` }}>+</span>
  )

export default function CompositionTerrain({
  formation, titulaires = [], remplacants = [], modeEdit,
  onChangerFormation, onAssignerTitulaire, onRetirerTitulaire,
  onAjouterRemplacant, onRetirerRemplacant,
}) {
  const config = FORMATIONS[formation] || FORMATIONS['4-4-2']

  // Index de départ de chaque ligne dans le tableau titulaires (ordre naturel
  // gardien → attaque) — calculé une fois, jamais déduit par recherche
  // d'objet (fragile si deux emplacements sont vides ou si un joueur
  // apparaissait deux fois).
  let curseur = 0
  const lignesIndexees = config.lignes.map(l => {
    const debut = curseur
    curseur += l.n
    return { n: l.n, debut }
  })
  const lignesAffichees = [...lignesIndexees].reverse() // attaque en haut, gardien en bas — purement visuel

  return (
    <div style={{ width: '100%', maxWidth: '480px', margin: '0 auto' }}>
      {modeEdit && (
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
          {Object.keys(FORMATIONS).map(f => (
            <button key={f} onClick={() => onChangerFormation(f)} style={{
              padding: '5px 12px', borderRadius: '20px', border: 'none',
              background: formation === f ? '#4ade80' : 'rgba(255,255,255,0.08)',
              color: formation === f ? '#000' : 'rgba(255,255,255,0.4)',
              fontWeight: 700, fontSize: '11px', cursor: 'pointer', letterSpacing: '0.5px', fontFamily: 'Inter, sans-serif',
            }}>{f}</button>
          ))}
        </div>
      )}

      <div style={{
        position: 'relative', width: '100%', aspectRatio: '0.65',
        borderRadius: '20px', overflow: 'hidden',
        background: 'linear-gradient(180deg, #0f3d0f 0%, #155215 12%, #0f3d0f 25%, #155215 37%, #0f3d0f 50%, #155215 62%, #0f3d0f 75%, #155215 87%, #0f3d0f 100%)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
      }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 100 154" preserveAspectRatio="none">
          <rect x="4" y="4" width="92" height="146" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.6" />
          <line x1="4" y1="77" x2="96" y2="77" stroke="rgba(255,255,255,0.3)" strokeWidth="0.6" />
          <circle cx="50" cy="77" r="13" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.6" />
          <circle cx="50" cy="77" r="1" fill="rgba(255,255,255,0.5)" />
          <rect x="24" y="4" width="52" height="22" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
          <rect x="36" y="4" width="28" height="10" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
          <circle cx="50" cy="18" r="0.8" fill="rgba(255,255,255,0.4)" />
          <rect x="24" y="128" width="52" height="22" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
          <rect x="36" y="140" width="28" height="10" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
          <circle cx="50" cy="136" r="0.8" fill="rgba(255,255,255,0.4)" />
          <rect x="40" y="1.5" width="20" height="3" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.6" />
          <rect x="40" y="149.5" width="20" height="3" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.6" />
        </svg>

        <div style={{ position: 'absolute', inset: '3%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '5% 2%' }}>
          {lignesAffichees.map((ligne, li) => (
            <div key={li} style={{ display: 'flex', justifyContent: 'space-evenly', alignItems: 'center' }}>
              {Array.from({ length: ligne.n }).map((_, i) => {
                const slotIndex = ligne.debut + i
                const joueur = titulaires[slotIndex] || null
                return (
                  <div key={slotIndex} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', minWidth: '60px' }}>
                    <div
                      onClick={() => modeEdit && onAssignerTitulaire(slotIndex)}
                      style={{
                        width: '58px', height: '58px', borderRadius: '50%', position: 'relative',
                        border: `3px solid ${joueur ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.15)'}`,
                        background: 'rgba(0,0,0,0.5)', overflow: 'hidden',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: modeEdit ? 'pointer' : 'default',
                        boxShadow: joueur ? '0 4px 20px rgba(0,0,0,0.7), 0 0 0 2px rgba(74,222,128,0.25)' : 'none',
                      }}>
                      <AvatarJoueur joueur={joueur} />
                      {joueur?.numero != null && (
                        <div style={{ position: 'absolute', bottom: '-3px', right: '-3px', background: '#4ade80', color: '#000', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 900, border: '2px solid #0a0a0a' }}>
                          {joueur.numero}
                        </div>
                      )}
                      {modeEdit && joueur && (
                        <button onClick={e => { e.stopPropagation(); onRetirerTitulaire(slotIndex) }}
                          style={{ position: 'absolute', top: '-4px', left: '-4px', width: '18px', height: '18px', borderRadius: '50%', background: '#ef4444', border: '2px solid #0a0a0a', color: '#fff', fontSize: '10px', lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                          ✕
                        </button>
                      )}
                    </div>
                    <div style={{
                      background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', color: '#fff', fontSize: '9px', fontWeight: 800,
                      padding: '3px 7px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.4px',
                      whiteSpace: 'nowrap', maxWidth: '72px', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {joueur ? joueur.nom?.toUpperCase() : '—'}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '14px 18px' }}>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>
          Remplaçants ({remplacants.length})
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {remplacants.map((j, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AvatarJoueur joueur={j} taille={48} />
                {j.numero != null && (
                  <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 800, border: '1.5px solid #0a0a0a' }}>{j.numero}</div>
                )}
                {modeEdit && (
                  <button onClick={() => onRetirerRemplacant(i)}
                    style={{ position: 'absolute', top: '-3px', left: '-3px', width: '16px', height: '16px', borderRadius: '50%', background: '#ef4444', border: '2px solid #0a0a0a', color: '#fff', fontSize: '9px', lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                    ✕
                  </button>
                )}
              </div>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', maxWidth: '54px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.nom}</span>
            </div>
          ))}
          {modeEdit && remplacants.length < MAX_REMPLACANTS && (
            <div onClick={onAjouterRemplacant} style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px dashed rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.15)', fontSize: '20px' }}>+</div>
          )}
          {remplacants.length === 0 && !modeEdit && (
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', fontStyle: 'italic', margin: 0 }}>Aucun remplaçant annoncé.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Sélection d'un joueur du roster + numéro de maillot pour ce match — jamais
// stocké dans profiles/equipe_joueurs, propre à chaque composition.
export function ModalSelectionJoueur({ joueursDispo, dejaUtilises, onConfirmer, onRetirer, onFermer }) {
  const [choisi, setChoisi] = useState(null)
  const [numero, setNumero] = useState('')

  const choisir = (j) => {
    setChoisi(j)
    const n = parseInt(j.numero_maillot, 10)
    setNumero(Number.isFinite(n) ? String(n) : '')
  }

  return (
    <div onClick={onFermer} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: '20px 20px 0 0', padding: '24px', width: '100%', maxWidth: '480px', maxHeight: '75vh', overflowY: 'auto', fontFamily: 'Inter, sans-serif' }}>
        <h3 style={{ color: '#fff', margin: '0 0 16px' }}>Choisir un joueur</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
          {joueursDispo.map(j => {
            const indisponible = dejaUtilises.has(j.joueur_id) && choisi?.joueur_id !== j.joueur_id
            return (
              <div key={j.joueur_id} onClick={() => !indisponible && choisir(j)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px',
                  cursor: indisponible ? 'default' : 'pointer', opacity: indisponible ? 0.35 : 1,
                  background: choisi?.joueur_id === j.joueur_id ? '#0d1a0d' : '#111',
                  border: `1px solid ${choisi?.joueur_id === j.joueur_id ? '#4ade80' : '#1a1a1a'}`,
                }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', overflow: 'hidden', background: '#2a2a2a', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AvatarJoueur joueur={j} taille={38} />
                </div>
                <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px', flex: 1 }}>{j.prenom} {j.nom}</span>
                {indisponible && <span style={{ color: '#555', fontSize: '11px' }}>déjà placé</span>}
                {choisi?.joueur_id === j.joueur_id && <span style={{ color: '#4ade80' }}>✓</span>}
              </div>
            )
          })}
        </div>

        {choisi && (
          <div style={{ marginBottom: '16px', padding: '14px', background: '#111', borderRadius: '12px', border: '1px solid #2a2a2a' }}>
            <div style={{ color: '#555', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>N° de maillot (ce match)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button onClick={() => setNumero(n => String(Math.max(1, (parseInt(n, 10) || 2) - 1)))} style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#fff', fontSize: '18px', cursor: 'pointer' }}>−</button>
              <input type="number" min="1" max="99" value={numero} onChange={e => setNumero(e.target.value)} placeholder="—"
                style={{ flex: 1, background: '#0a0a0a', border: '1px solid #3a3a3a', color: '#4ade80', borderRadius: '10px', padding: '10px', fontSize: '26px', fontWeight: 900, textAlign: 'center' }} />
              <button onClick={() => setNumero(n => String(Math.min(99, (parseInt(n, 10) || 0) + 1)))} style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#fff', fontSize: '18px', cursor: 'pointer' }}>+</button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onFermer} style={{ flex: 1, background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#aaa', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Annuler</button>
          {onRetirer && (
            <button onClick={onRetirer} style={{ flex: 1, background: 'none', border: '1px solid #ef444444', color: '#ef4444', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Retirer</button>
          )}
          <button disabled={!choisi} onClick={() => onConfirmer({ joueur_id: choisi.joueur_id, prenom: choisi.prenom, nom: choisi.nom, avatar_url: choisi.avatar_url || null, numero: parseInt(numero, 10) || null })}
            style={{ flex: 2, background: choisi ? '#4ade80' : '#1a1a1a', border: 'none', color: choisi ? '#000' : '#333', borderRadius: '10px', padding: '12px', fontWeight: 700, fontSize: '14px', cursor: choisi ? 'pointer' : 'not-allowed', fontFamily: 'Inter, sans-serif' }}>
            Confirmer
          </button>
        </div>
      </div>
    </div>
  )
}

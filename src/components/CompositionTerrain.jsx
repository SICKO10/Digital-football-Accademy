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

// Tailles en clamp(), mais en cqw (container query units) et non en vw : vw
// suit la largeur du VIEWPORT, pas celle du terrain — sur tablette le
// viewport est large alors que la carte qui contient le terrain est bien
// plus étroite (sidebar/marges du dashboard), donc les cercles calculés en
// vw débordaient largement d'une ligne à 5 joueurs (3-5-2, 5-3-2). cqw
// mesure la largeur du conteneur qui porte containerType:'inline-size'
// (l'enveloppe juste en dessous, cf. plus bas) — les cercles suivent enfin
// la taille réellement disponible, plus jamais celle du viewport.
const TAILLE_TITULAIRE = 'clamp(32px, 7.5cqw, 56px)'
const TAILLE_REMPLACANT = 'clamp(28px, 5cqw, 42px)'
const TAILLE_LISTE = 'clamp(34px, 5vw, 40px)' // modale de sélection : overlay indépendant, hors du conteneur cqw du terrain

const AvatarJoueur = ({ joueur, fontSize = '17px' }) =>
  joueur?.avatar_url ? (
    <img src={joueur.avatar_url} style={{ width: '100%', height: '130%', objectFit: 'cover', objectPosition: 'top' }} alt="" />
  ) : joueur ? (
    <span style={{ color: '#fff', fontWeight: 900, fontSize }}>{joueur.prenom?.[0]}{joueur.nom?.[0]}</span>
  ) : (
    <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: `calc(${fontSize} * 1.3)` }}>+</span>
  )

const nomAffiche = (joueur, affichageNom) => {
  if (!joueur) return '—'
  const val = affichageNom === 'prenom' ? joueur.prenom : joueur.nom
  return (val || joueur.nom || joueur.prenom || '')?.toUpperCase()
}

// Le badge rond sur la photo reste (repère visuel rapide), mais le numéro est
// aussi rappelé ici en toutes lettres à côté du nom, à la demande — pas
// évident au premier coup d'œil qu'un petit badge superposé porte un numéro.
const nomAvecNumero = (joueur, affichageNom) => {
  const nom = nomAffiche(joueur, affichageNom)
  return joueur?.numero != null ? `${joueur.numero} · ${nom}` : nom
}

export default function CompositionTerrain({
  formation, titulaires = [], remplacants = [], modeEdit, titre, affichageNom = 'nom',
  onChangerFormation, onAssignerTitulaire, onRetirerTitulaire,
  onAjouterRemplacant, onRetirerRemplacant, onChangerAffichageNom, onToggleCapitaine,
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
  // Terrain à l'horizontale : gardien à gauche, attaque à droite, dans
  // l'ordre naturel du tableau (pas d'inversion visuelle nécessaire ici,
  // contrairement à l'ancien rendu vertical où l'attaque devait remonter en
  // haut).
  const lignesAffichees = lignesIndexees

  return (
    <div style={{ width: '100%', maxWidth: '760px', margin: '0 auto', containerType: 'inline-size' }}>
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

      {modeEdit && (
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '16px' }}>
          {[{ val: 'prenom', label: 'Prénom' }, { val: 'nom', label: 'Nom' }].map(o => (
            <button key={o.val} onClick={() => onChangerAffichageNom(o.val)} style={{
              padding: '5px 14px', borderRadius: '20px', border: 'none',
              background: affichageNom === o.val ? '#4ade80' : 'rgba(255,255,255,0.08)',
              color: affichageNom === o.val ? '#000' : 'rgba(255,255,255,0.4)',
              fontWeight: 700, fontSize: '11px', cursor: 'pointer', letterSpacing: '0.5px', fontFamily: 'Inter, sans-serif',
            }}>{o.label}</button>
          ))}
        </div>
      )}

      {titre && (
        <div style={{ textAlign: 'center', marginBottom: '12px', color: '#fff', fontSize: '13px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.7 }}>
          {titre}
        </div>
      )}

      <div style={{
        position: 'relative', width: '100%', aspectRatio: '1.55',
        borderRadius: '20px', overflow: 'hidden',
        background: 'repeating-linear-gradient(90deg, #1a5c1a 0px, #1a5c1a 40px, #1e6b1e 40px, #1e6b1e 80px)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
      }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 154 100" preserveAspectRatio="none">
          <rect x="4" y="4" width="146" height="92" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.6" />
          <line x1="77" y1="4" x2="77" y2="96" stroke="rgba(255,255,255,0.3)" strokeWidth="0.6" />
          <circle cx="77" cy="50" r="13" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.6" />
          <circle cx="77" cy="50" r="1" fill="rgba(255,255,255,0.5)" />
          <rect x="4" y="24" width="22" height="52" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
          <rect x="4" y="36" width="10" height="28" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
          <circle cx="18" cy="50" r="0.8" fill="rgba(255,255,255,0.4)" />
          <rect x="128" y="24" width="22" height="52" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
          <rect x="140" y="36" width="10" height="28" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
          <circle cx="136" cy="50" r="0.8" fill="rgba(255,255,255,0.4)" />
          <rect x="1.5" y="40" width="3" height="20" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.6" />
          <rect x="149.5" y="40" width="3" height="20" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.6" />
        </svg>

        <div style={{ position: 'absolute', inset: '3%', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', padding: '2% 5%' }}>
          {lignesAffichees.map((ligne, li) => (
            <div key={li} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', alignItems: 'center' }}>
              {Array.from({ length: ligne.n }).map((_, i) => {
                const slotIndex = ligne.debut + i
                const joueur = titulaires[slotIndex] || null
                return (
                  <div key={slotIndex} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(2px, 0.6cqw, 4px)', minWidth: '44px' }}>
                    {/* Ancre de la taille exacte du cercle (pas de la colonne, plus
                        large) : les badges/boutons superposés se positionnent par
                        rapport à elle, sans jamais être coupés par l'overflow:hidden
                        du cercle (nécessaire, lui, pour rogner la photo). */}
                    <div style={{ width: TAILLE_TITULAIRE, height: TAILLE_TITULAIRE, position: 'relative' }}>
                      <div
                        onClick={() => modeEdit && onAssignerTitulaire(slotIndex)}
                        style={{
                          width: '100%', height: '100%', borderRadius: '50%', position: 'relative',
                          border: `3px solid ${joueur ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.15)'}`,
                          background: 'rgba(0,0,0,0.55)', overflow: 'hidden',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: modeEdit ? 'pointer' : 'default',
                          boxShadow: joueur ? '0 4px 20px rgba(0,0,0,0.7), 0 0 0 2px rgba(74,222,128,0.25)' : 'none',
                        }}>
                        <AvatarJoueur joueur={joueur} fontSize="clamp(11px, 1.8cqw, 18px)" />
                      </div>
                      {joueur?.numero != null && (
                        <div style={{
                          position: 'absolute', top: '-4px', right: '-4px',
                          background: '#4ade80', color: '#000', borderRadius: '50%',
                          width: 'clamp(14px, 2.2cqw, 20px)', height: 'clamp(14px, 2.2cqw, 20px)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 'clamp(7px, 1cqw, 10px)', fontWeight: 900,
                          border: '2px solid #0a0a0a', boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                        }}>
                          {joueur.numero}
                        </div>
                      )}
                      {modeEdit && joueur && (
                        <button onClick={e => { e.stopPropagation(); onRetirerTitulaire(slotIndex) }}
                          style={{ position: 'absolute', bottom: '-4px', left: '-4px', width: '16px', height: '16px', borderRadius: '50%', background: '#ef4444', border: '2px solid #0a0a0a', color: '#fff', fontSize: '9px', lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                          ✕
                        </button>
                      )}
                      {joueur && (modeEdit ? (
                        <button onClick={e => { e.stopPropagation(); onToggleCapitaine(slotIndex) }}
                          title={joueur.capitaine ? 'Retirer le brassard' : 'Nommer capitaine'}
                          style={{
                            position: 'absolute', top: '-4px', left: '-4px',
                            width: 'clamp(14px, 2.2cqw, 20px)', height: 'clamp(14px, 2.2cqw, 20px)', borderRadius: '50%',
                            background: joueur.capitaine ? '#facc15' : 'rgba(0,0,0,0.75)',
                            border: joueur.capitaine ? '2px solid #0a0a0a' : '1.5px dashed rgba(250,204,21,0.7)',
                            color: joueur.capitaine ? '#000' : '#facc15',
                            fontSize: 'clamp(7px, 1cqw, 10px)', fontWeight: 900, lineHeight: 1, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                          }}>
                          C
                        </button>
                      ) : joueur.capitaine ? (
                        <div style={{
                          position: 'absolute', top: '-4px', left: '-4px',
                          background: '#facc15', color: '#000', borderRadius: '50%',
                          width: 'clamp(14px, 2.2cqw, 20px)', height: 'clamp(14px, 2.2cqw, 20px)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 'clamp(7px, 1cqw, 10px)', fontWeight: 900,
                          border: '2px solid #0a0a0a', boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                        }}>
                          C
                        </div>
                      ) : null)}
                    </div>
                    <div style={{
                      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', color: '#fff', fontSize: 'clamp(7px, 1.1cqw, 10px)', fontWeight: 800,
                      padding: '3px 7px', borderRadius: '5px', textTransform: 'uppercase', letterSpacing: '0.6px',
                      whiteSpace: 'nowrap', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {nomAvecNumero(joueur, affichageNom)}
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
              <div style={{ width: TAILLE_REMPLACANT, height: TAILLE_REMPLACANT, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AvatarJoueur joueur={j} fontSize="clamp(10px, 1.5cqw, 15px)" />
                {j.numero != null && (
                  <div style={{ position: 'absolute', top: '-3px', right: '-3px', background: '#4ade80', color: '#000', borderRadius: '50%', width: 'clamp(13px, 2cqw, 17px)', height: 'clamp(13px, 2cqw, 17px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(7px, 1cqw, 9px)', fontWeight: 800, border: '1.5px solid #0a0a0a' }}>{j.numero}</div>
                )}
                {modeEdit && (
                  <button onClick={() => onRetirerRemplacant(i)}
                    style={{ position: 'absolute', top: '-3px', left: '-3px', width: '16px', height: '16px', borderRadius: '50%', background: '#ef4444', border: '2px solid #0a0a0a', color: '#fff', fontSize: '9px', lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                    ✕
                  </button>
                )}
              </div>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', maxWidth: '54px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomAvecNumero(j, affichageNom)}</span>
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
// multiSelect (remplaçants uniquement — un slot titulaire reste toujours un
// choix unique) : coche plusieurs joueurs d'un coup, numéro repris tel quel
// depuis numero_maillot (pas d'édition ligne par ligne dans ce mode, pour
// rester rapide) ; onConfirmerMultiple reçoit la liste entière en un appel.
export function ModalSelectionJoueur({ joueursDispo, dejaUtilises, onConfirmer, onConfirmerMultiple, onRetirer, onFermer, multiSelect = false }) {
  const [choisi, setChoisi] = useState(null)
  const [numero, setNumero] = useState('')
  const [choisisMultiple, setChoisisMultiple] = useState([])

  const choisir = (j) => {
    setChoisi(j)
    const n = parseInt(j.numero_maillot, 10)
    setNumero(Number.isFinite(n) ? String(n) : '')
  }

  const toggleMultiple = (j) => {
    setChoisisMultiple(prev => prev.some(x => x.joueur_id === j.joueur_id) ? prev.filter(x => x.joueur_id !== j.joueur_id) : [...prev, j])
  }

  const confirmerMultiple = () => {
    onConfirmerMultiple(choisisMultiple.map(j => {
      const n = parseInt(j.numero_maillot, 10)
      return { joueur_id: j.joueur_id, prenom: j.prenom, nom: j.nom, avatar_url: j.avatar_url || null, numero: Number.isFinite(n) ? n : null }
    }))
  }

  return (
    <div onClick={onFermer} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: '20px 20px 0 0', padding: '24px', width: '100%', maxWidth: '480px', maxHeight: '75vh', overflowY: 'auto', fontFamily: 'Inter, sans-serif' }}>
        <h3 style={{ color: '#fff', margin: '0 0 16px' }}>{multiSelect ? 'Choisir un ou plusieurs joueurs' : 'Choisir un joueur'}</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
          {joueursDispo.map(j => {
            const estChoisiMultiple = choisisMultiple.some(x => x.joueur_id === j.joueur_id)
            const indisponible = dejaUtilises.has(j.joueur_id) && (multiSelect ? !estChoisiMultiple : choisi?.joueur_id !== j.joueur_id)
            const actif = multiSelect ? estChoisiMultiple : choisi?.joueur_id === j.joueur_id
            return (
              <div key={j.joueur_id} onClick={() => !indisponible && (multiSelect ? toggleMultiple(j) : choisir(j))}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px',
                  cursor: indisponible ? 'default' : 'pointer', opacity: indisponible ? 0.35 : 1,
                  background: actif ? '#0d1a0d' : '#111',
                  border: `1px solid ${actif ? '#4ade80' : '#1a1a1a'}`,
                }}>
                {multiSelect && (
                  <input type="checkbox" checked={estChoisiMultiple} readOnly disabled={indisponible} style={{ flexShrink: 0 }} />
                )}
                <div style={{ width: TAILLE_LISTE, height: TAILLE_LISTE, borderRadius: '50%', overflow: 'hidden', background: '#2a2a2a', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AvatarJoueur joueur={j} fontSize="clamp(11px, 1.8vw, 14px)" />
                </div>
                <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px', flex: 1 }}>{j.prenom} {j.nom}</span>
                {indisponible && <span style={{ color: '#555', fontSize: '11px' }}>déjà placé</span>}
                {!multiSelect && choisi?.joueur_id === j.joueur_id && <span style={{ color: '#4ade80' }}>✓</span>}
              </div>
            )
          })}
        </div>

        {!multiSelect && choisi && (
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
          {!multiSelect && onRetirer && (
            <button onClick={onRetirer} style={{ flex: 1, background: 'none', border: '1px solid #ef444444', color: '#ef4444', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Retirer</button>
          )}
          {multiSelect ? (
            <button disabled={choisisMultiple.length === 0} onClick={confirmerMultiple}
              style={{ flex: 2, background: choisisMultiple.length ? '#4ade80' : '#1a1a1a', border: 'none', color: choisisMultiple.length ? '#000' : '#333', borderRadius: '10px', padding: '12px', fontWeight: 700, fontSize: '14px', cursor: choisisMultiple.length ? 'pointer' : 'not-allowed', fontFamily: 'Inter, sans-serif' }}>
              Ajouter {choisisMultiple.length > 0 ? `(${choisisMultiple.length})` : ''}
            </button>
          ) : (
            <button disabled={!choisi} onClick={() => onConfirmer({ joueur_id: choisi.joueur_id, prenom: choisi.prenom, nom: choisi.nom, avatar_url: choisi.avatar_url || null, numero: parseInt(numero, 10) || null })}
              style={{ flex: 2, background: choisi ? '#4ade80' : '#1a1a1a', border: 'none', color: choisi ? '#000' : '#333', borderRadius: '10px', padding: '12px', fontWeight: 700, fontSize: '14px', cursor: choisi ? 'pointer' : 'not-allowed', fontFamily: 'Inter, sans-serif' }}>
              Confirmer
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

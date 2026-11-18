import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Printer } from 'lucide-react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'
import { texteSur } from '../lib/identite'
import TerrainZonesSvg from './TerrainZonesSvg'
import { principesDeLaPhase, numerosParZone } from '../lib/planDeJeu'
import { LIGNES, libelleLigne } from '../constants/lignesJeu'

// Fiche A4 imprimable d'UNE phase du plan de jeu : en-tête aux couleurs du club
// (logo, nom), nom de la phase, terrain avec zones et pastilles numérotées,
// principes numérotés (avec « Consigne du coach » pour les ajouts d'équipe).
// Mêmes données que l'écran : le club, l'éducateur et le joueur passent leurs
// propres zones et principes, donc chacun imprime sa version.
// Impression : la fiche est montée dans <body> (portail #plan-print) le temps
// de l'impression seulement ; index.css cache le reste de la page.
// Couleurs fixes (papier blanc), indépendantes du thème clair ou sombre.

function FicheContenu({ club, phaseLabel, soustitre, zones, principes, phase, fondUrl, photoUrl, pourMoi }) {
  const c1 = club?.couleur_principale || '#1a3a6e'
  const c2 = club?.couleur_secondaire || '#4ade80'
  const liste = principesDeLaPhase(principes, phase)
  const zonesPhase = zones.filter(z => z.phase === phase)
  const numeros = numerosParZone(liste, zonesPhase)
  return (
    <div className="plan-a4">
      <div className="plan-a4-entete" style={{ background: c1, color: texteSur(c1) }}>
        {club?.avatar_url && <img src={club.avatar_url} alt="" crossOrigin="anonymous" className="plan-a4-logo" />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="plan-a4-kicker" style={{ color: c2 === c1 ? 'inherit' : c2 }}>Plan de jeu{club?.club ? ` · ${club.club}` : ''}</div>
          <div className="plan-a4-titre">{phaseLabel}</div>
          {soustitre && <div className="plan-a4-sous">{soustitre}</div>}
        </div>
      </div>
      <div className="plan-a4-corps">
        {zonesPhase.length > 0 && (
          <div className="plan-a4-terrain">
            <TerrainZonesSvg zones={zonesPhase} fondUrl={fondUrl} numeros={numeros} />
            <ul className="plan-a4-zones">
              {zonesPhase.map(z => (
                <li key={z.id}><span style={{ background: z.couleur || '#4ade80' }} />{z.label}{z.description ? ` : ${z.description}` : ''}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="plan-a4-principes">
          {liste.length === 0 ? <p className="plan-a4-vide">Aucun principe écrit pour cette phase.</p> : (
            <ol>
              {liste.map((p, i) => {
                const zone = zonesPhase.find(z => z.id === p.zone_id)
                const lignes = (p.lignes || []).filter(l => LIGNES.some(x => x.cle === l))
                return (
                  <li key={p.id}>
                    <span className="plan-a4-num" style={{ background: zone?.couleur || c1, color: texteSur(zone?.couleur || c1) }}>{i + 1}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="plan-a4-texte">{p.principe}</span>
                      <span className="plan-a4-meta">
                        {zone && <span>Zone : {zone.label}</span>}
                        {lignes.length > 0 && <span>Pour : {lignes.map(libelleLigne).join(', ')}</span>}
                        {p.club_categorie_id && <span className="plan-a4-coach">Consigne du coach</span>}
                        {pourMoi && pourMoi(p) && <span className="plan-a4-coach">Ton poste</span>}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ol>
          )}
          {photoUrl && <img src={photoUrl} alt="" crossOrigin="anonymous" className="plan-a4-photo" />}
        </div>
      </div>
      <div className="plan-a4-pied">Digital Football</div>
    </div>
  )
}

// clubId + poleKey : pour retrouver logo, couleurs, fond de terrain et illustration.
// Ces lectures se font au clic, pas au chargement de l'écran.
export default function BoutonImprimerPlan({ clubId, poleKey, phase, phaseLabel, soustitre = '', zones = [], principes = [], pourMoi = null, couleur = null, style = {} }) {
  const colors = useColors()
  const [donnees, setDonnees] = useState(null)
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState('')

  const preparer = async () => {
    setErreur('')
    setOccupe(true)
    try {
      const [club, fond, photo] = await Promise.all([
        clubId ? supabase.from('profiles').select('club, avatar_url, couleur_principale, couleur_secondaire').eq('id', clubId).maybeSingle() : { data: null },
        clubId && poleKey ? supabase.from('terrain_fonds').select('image_url').eq('club_id', clubId).eq('pole_key', poleKey).eq('phase', phase).maybeSingle() : { data: null },
        clubId && poleKey ? supabase.from('principes_photos').select('image_url').eq('club_id', clubId).eq('pole_key', poleKey).eq('phase', phase).maybeSingle() : { data: null },
      ])
      setDonnees({ club: club.data, fondUrl: fond.data?.image_url || null, photoUrl: photo.data?.image_url || null })
    } catch {
      // Sans identité du club, la fiche s'imprime quand même (couleurs par défaut)
      setDonnees({ club: null, fondUrl: null, photoUrl: null })
    }
  }

  // Une fois la fiche montée : attendre les images, imprimer, puis démonter.
  useEffect(() => {
    if (!donnees) return
    let fini = false
    const nettoyer = () => { if (!fini) { fini = true; setDonnees(null); setOccupe(false) } }
    window.addEventListener('afterprint', nettoyer, { once: true })
    const lancer = async () => {
      const imgs = [...document.querySelectorAll('#plan-print img')]
      await Promise.all(imgs.map(i => i.complete ? null : new Promise(r => { i.onload = r; i.onerror = r; setTimeout(r, 3000) })))
      try { window.print() } catch { setErreur("L'impression n'a pas pu s'ouvrir."); }
      // Certains navigateurs n'émettent pas afterprint : filet de sécurité
      setTimeout(nettoyer, 1500)
    }
    const t = setTimeout(lancer, 50)
    return () => { clearTimeout(t); window.removeEventListener('afterprint', nettoyer) }
  }, [donnees])

  const accent = couleur || colors.accent.blue
  return (
    <>
      <button type="button" onClick={preparer} disabled={occupe}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 36, padding: '7px 14px', borderRadius: 4, cursor: occupe ? 'wait' : 'pointer',
          background: 'transparent', color: colors.text.primary, border: `1px solid ${accent}`, fontSize: 12, fontWeight: 700, fontFamily: 'Barlow, sans-serif', ...style,
        }}>
        <Printer size={14} aria-hidden="true" />
        {occupe ? 'Préparation...' : 'Imprimer cette phase'}
      </button>
      {erreur && <span role="alert" style={{ color: colors.text.dim, fontSize: 12, marginLeft: 8 }}>{erreur}</span>}
      {donnees && createPortal(
        <div id="plan-print">
          <FicheContenu club={donnees.club} phaseLabel={phaseLabel} soustitre={soustitre} zones={zones} principes={principes} phase={phase}
            fondUrl={donnees.fondUrl} photoUrl={donnees.photoUrl} pourMoi={pourMoi} />
        </div>,
        document.body
      )}
    </>
  )
}

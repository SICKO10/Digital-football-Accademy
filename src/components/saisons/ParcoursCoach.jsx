import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { radius } from '../../tokens'
import { libelleSaison } from '../../lib/saison'
import { cumulerBilans, bilanDepuisLigne } from '../../lib/statsSaison'
import BilanTuiles from './BilanTuiles'

// Parcours d'un coach vu depuis Explorer : vue d'ensemble, puis une ligne par
// équipe et par saison (club, catégorie, niveau) qui s'ouvre sur son bilan.
// Lit coach_bilans_publics : uniquement des totaux, publiés par le coach.
export default function ParcoursCoach({ educateurId }) {
  const colors = useColors()
  const [lignes, setLignes] = useState(null)
  const [erreur, setErreur] = useState(false)
  const [ouverte, setOuverte] = useState(null)

  useEffect(() => {
    let annule = false
    ;(async () => {
      const { data, error } = await supabase.from('coach_bilans_publics').select('*').eq('educateur_id', educateurId)
        .order('saison', { ascending: false })
      if (annule) return
      if (error) setErreur(true); else setLignes(data || [])
    })()
    return () => { annule = true }
  }, [educateurId])

  const bilans = useMemo(() => (lignes || []).map(l => ({ ...l, bilan: cumulerBilans([bilanDepuisLigne(l)]) })), [lignes])
  const ensemble = useMemo(() => cumulerBilans((lignes || []).map(bilanDepuisLigne)), [lignes])

  const faint = { margin: 0, fontSize: 12, color: colors.text.faint }
  if (erreur) return <p style={faint}>Impossible de charger le parcours.</p>
  if (!lignes) return <p style={faint}>Chargement…</p>
  if (!lignes.length) return <p style={faint}>Ce coach n'a pas encore publié son parcours.</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: colors.text.secondary }}>Vue d'ensemble</p>
        <BilanTuiles bilan={ensemble} />
      </div>
      <div>
        <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: colors.text.secondary }}>Catégories entraînées</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {bilans.map(l => {
            const cle = `${l.saison}|${l.club_categorie_id}`
            const ouvert = ouverte === cle
            return (
              <div key={cle} style={{ background: colors.background.base, borderRadius: radius.lg, padding: '10px 12px' }}>
                <button onClick={() => setOuverte(ouvert ? null : cle)} aria-expanded={ouvert}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', color: colors.text.primary, fontFamily: 'Inter, sans-serif' }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                    <strong>{l.categorie_nom || 'Équipe'}</strong>
                    <span style={{ color: colors.text.faint }}>{[l.club_nom, l.niveau, libelleSaison(l.saison)].filter(Boolean).map(x => ` · ${x}`).join('')}</span>
                  </span>
                  <span aria-hidden="true" style={{ fontSize: 12, color: colors.text.faint, transform: ouvert ? 'rotate(90deg)' : 'none' }}>›</span>
                </button>
                {ouvert && <div style={{ marginTop: 10 }}><BilanTuiles bilan={l.bilan} /></div>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

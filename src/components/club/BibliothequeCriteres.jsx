// Bibliothèque Digital Football des critères d'évaluation (lecture seule).
// Source : table bibliotheque_criteres (bloc 1 + bloc 3). On choisit une catégorie,
// on voit la liste de sa tranche d'âge : 4 piliers, critères par poste, tests, oui / non.
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { labelCategorie } from '../../lib/categories'
import { police } from '../../tokens'

export const PILIERS = [
  { key: 'tactique', label: 'Tactique' },
  { key: 'technique', label: 'Technique' },
  { key: 'physique', label: 'Physique' },
  { key: 'mental', label: 'Mental' },
]
export const POSTES = [
  { key: 'gardien', label: 'Gardien' },
  { key: 'defenseur', label: 'Défenseur' },
  { key: 'milieu', label: 'Milieu' },
  { key: 'attaquant', label: 'Attaquant' },
]

// Âge de référence d'une catégorie (U12 -> 12, U12F -> 12, Seniors -> 99).
export function ageDeCategorie(cat) {
  const m = /^U(\d+)/.exec(cat || '')
  return m ? Number(m[1]) : 99
}
export function trancheDeCategorie(cat) {
  const a = ageDeCategorie(cat)
  if (a <= 9) return 'u7_u9'
  if (a <= 11) return 'u10_u11'
  if (a <= 13) return 'u12_u13'
  if (a <= 15) return 'u14_u15'
  if (a <= 17) return 'u16_u17'
  return 'u18_seniors'
}
export const LIBELLE_TRANCHE = {
  u7_u9: 'U7 à U9', u10_u11: 'U10 et U11', u12_u13: 'U12 et U13',
  u14_u15: 'U14 et U15', u16_u17: 'U16 et U17', u18_seniors: 'U18, U19, U20 et Seniors',
}
// « U12 » -> 12 ; sert à ne montrer que ce qui est proposé pour la catégorie.
export const dispoPour = (aPartirDe, cat) => !aPartirDe || ageDeCategorie(cat) >= ageDeCategorie(aPartirDe)

export default function BibliothequeCriteres({ categories = [], couleur }) {
  const colors = useColors()
  const [lignes, setLignes] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [categorie, setCategorie] = useState(categories[0] || '')

  useEffect(() => {
    let vivant = true
    supabase.from('bibliotheque_criteres').select('*').eq('actif', true)
      .order('ordre', { ascending: true })
      .then(({ data, error }) => {
        if (!vivant) return
        if (error) setErreur('La bibliothèque ne se charge pas. Réessaie dans un instant.')
        else setLignes(data || [])
        setChargement(false)
      })
    return () => { vivant = false }
  }, [])

  useEffect(() => {
    if (!categories.includes(categorie)) setCategorie(categories[0] || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories.join('|')])

  const tranche = trancheDeCategorie(categorie)
  const notes = useMemo(() => lignes.filter(l => l.type === 'note' && l.tranche === tranche), [lignes, tranche])
  const postes = useMemo(() => lignes.filter(l => l.type === 'note' && l.poste && dispoPour(l.a_partir_de, categorie)), [lignes, categorie])
  const tests = useMemo(() => lignes.filter(l => l.type === 'test' && dispoPour(l.a_partir_de, categorie)), [lignes, categorie])
  const ouiNon = useMemo(() => lignes.filter(l => l.type === 'oui_non' && dispoPour(l.a_partir_de, categorie)), [lignes, categorie])

  const carte = { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 6, padding: '14px 16px', marginBottom: 16 }
  const titre = { color: colors.text.primary, fontFamily: police.titre, textTransform: 'uppercase', letterSpacing: '0.01em', fontSize: 16, fontWeight: 700, margin: '0 0 10px' }
  const ligne = { padding: '8px 0', borderTop: `1px solid ${colors.border.subtle}` }

  if (chargement) return <div style={{ color: colors.text.dim, fontSize: 13 }}>Chargement de la bibliothèque...</div>
  if (erreur) return <div style={{ color: colors.text.dim, fontSize: 13 }}>{erreur}</div>
  if (lignes.length === 0) {
    return <div style={{ ...carte, color: colors.text.dim, fontSize: 13 }}>La bibliothèque de critères n'est pas encore disponible.</div>
  }

  return (
    <div>
      <p style={{ color: colors.text.dim, fontSize: 13, lineHeight: 1.5, margin: '0 0 16px', maxWidth: 680 }}>
        Liste de départ proposée par Digital Football, par tranche d'âge. Chaque critère se note de 1 (non acquis) à 3 (acquis) et se repère avec la phrase « acquis quand ». Elle sert de base : tu pourras composer le modèle de ton club à partir de cette liste.
      </p>

      {categories.length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {categories.map(c => (
            <button key={c} onClick={() => setCategorie(c)} style={{
              padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Barlow, sans-serif',
              border: `1px solid ${categorie === c ? couleur : colors.border.faint}`,
              background: categorie === c ? couleur + '22' : 'transparent',
              color: categorie === c ? couleur : colors.text.dim,
            }}>{labelCategorie(c)}</button>
          ))}
        </div>
      )}

      <div style={{ color: colors.text.primary, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
        {labelCategorie(categorie)} : liste {LIBELLE_TRANCHE[tranche]} ({notes.length} critères)
      </div>

      {PILIERS.map(p => {
        const liste = notes.filter(n => n.pilier === p.key)
        if (liste.length === 0) return null
        return (
          <div key={p.key} style={carte}>
            <h3 style={titre}>{p.label} <span style={{ color: colors.text.dim, fontSize: 12, fontFamily: 'Barlow, sans-serif', textTransform: 'none' }}>({liste.length})</span></h3>
            {liste.map(n => (
              <div key={n.id} style={ligne}>
                <div style={{ color: colors.text.primary, fontSize: 14, fontWeight: 700 }}>{n.libelle}</div>
                <div style={{ color: colors.text.dim, fontSize: 12, marginTop: 2 }}>Acquis quand : {n.acquis_quand}</div>
              </div>
            ))}
          </div>
        )
      })}

      {postes.length > 0 && (
        <div style={carte}>
          <h3 style={titre}>Critères par poste</h3>
          <p style={{ color: colors.text.dim, fontSize: 12, margin: '0 0 6px' }}>Ajoutés à la fiche selon le poste du joueur.</p>
          {POSTES.map(po => {
            const liste = postes.filter(x => x.poste === po.key)
            if (liste.length === 0) return null
            return (
              <div key={po.key} style={{ marginTop: 10 }}>
                <div style={{ color: couleur, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{po.label}</div>
                {liste.map(n => (
                  <div key={n.id} style={ligne}>
                    <div style={{ color: colors.text.primary, fontSize: 14, fontWeight: 700 }}>{n.libelle}</div>
                    <div style={{ color: colors.text.dim, fontSize: 12, marginTop: 2 }}>Acquis quand : {n.acquis_quand}</div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {tests.length > 0 && (
        <div style={carte}>
          <h3 style={titre}>Tests chiffrés ({tests.length})</h3>
          <p style={{ color: colors.text.dim, fontSize: 12, margin: '0 0 6px' }}>L'objectif chiffré est à définir par le club.</p>
          {tests.map(t => (
            <div key={t.id} style={ligne}>
              <div style={{ color: colors.text.primary, fontSize: 14, fontWeight: 700 }}>
                {t.libelle} <span style={{ color: colors.text.dim, fontWeight: 400 }}>({t.unite}, {t.sens === 'plus_bas' ? 'plus bas = mieux' : 'plus haut = mieux'})</span>
              </div>
              {t.remarque && <div style={{ color: colors.text.dim, fontSize: 12, marginTop: 2 }}>{t.remarque}</div>}
            </div>
          ))}
        </div>
      )}

      {ouiNon.length > 0 && (
        <div style={carte}>
          <h3 style={titre}>Oui / non ({ouiNon.length})</h3>
          {ouiNon.map(o => (
            <div key={o.id} style={ligne}>
              <div style={{ color: colors.text.primary, fontSize: 14, fontWeight: 700 }}>{o.libelle}</div>
            </div>
          ))}
        </div>
      )}

      {['u12_u13', 'u14_u15'].includes(tranche) && (
        <p style={{ color: colors.text.dim, fontSize: 12, margin: 0 }}>
          De U12 à U15, les écarts de croissance faussent les comparaisons physiques : compare chaque joueur à lui-même.
        </p>
      )}
    </div>
  )
}

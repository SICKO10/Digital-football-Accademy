import { useState } from 'react'

// Comparaison approximative par nom entre le club d'une inscription et une
// équipe du tableau — il n'existe pas de vraie clé entre tournois_equipes
// (bracket) et tournois_inscriptions (formulaire public), cf. estMonEquipe
// dans TournoiVote.jsx.
const normalise = (s) => (s || '').trim().toLowerCase()
const memeClub = (nomClubInscription, ...noms) => noms.some(n => n && normalise(n) === normalise(nomClubInscription))

// Choix d'un joueur pour une catégorie individuelle : équipe d'abord (radio,
// comme les catégories par équipe), puis son effectif par numéro de maillot
// une fois l'équipe dépliée (lister_roster_tournoi) — la valeur stockée
// reste "Prénom Nom" (compat avec le dépouillement déjà en place côté club
// et l'attribution des badges), le numéro n'est qu'un repère de sélection
// plus fiable qu'une saisie libre pour un votant qui ne connaît pas les noms
// des joueurs adverses. Partagé entre TournoiVote.jsx (vote privé par
// équipe, liste déjà filtrée hors sa propre équipe) et TournoiPublic.jsx
// (vote public ouvert, liste complète des équipes).
export default function SelecteurRosterEquipe({ equipes, roster, nomChoisi, equipeChoisie, onChoisir, colors, st }) {
  const [equipeOuverte, setEquipeOuverte] = useState(null)

  return (
    <div>
      {equipes.map(eq => {
        const joueursEquipe = roster.filter(r => memeClub(r.nom_club, eq.nom, eq.club))
        const ouverte = equipeOuverte === eq.id
        const estChoisie = equipeChoisie === eq.nom
        return (
          <div key={eq.id} style={{ marginBottom: '8px' }}>
            <div onClick={() => setEquipeOuverte(ouverte ? null : eq.id)} style={st.option(estChoisie)}>
              <div style={st.radio(estChoisie)} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{eq.nom}</div>
                {estChoisie && nomChoisi && <div style={{ color: colors.accent.green, fontSize: '12px', marginTop: '2px' }}>{nomChoisi}</div>}
              </div>
              <span style={{ color: colors.text.disabled, fontSize: '11px' }}>{joueursEquipe.length > 0 ? `${joueursEquipe.length} joueurs` : 'Saisie libre'}</span>
            </div>
            {ouverte && (
              <div style={{ padding: '10px 0 4px 20px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {joueursEquipe.length > 0 ? joueursEquipe.map(j => {
                  const nomComplet = `${j.prenom} ${j.nom}`.trim()
                  const actif = estChoisie && nomChoisi === nomComplet
                  return (
                    <button key={`${nomComplet}_${j.numero_maillot}`} type="button" onClick={() => onChoisir(nomComplet, eq.nom)}
                      style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${actif ? colors.accent.green : colors.border.faint}`, background: actif ? colors.accent.green + '22' : colors.background.raised, color: actif ? colors.accent.green : colors.text.secondary, fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                      {j.numero_maillot ? `#${j.numero_maillot} ` : ''}{j.prenom} {j.nom}
                    </button>
                  )
                }) : (
                  <input placeholder="Prénom Nom" defaultValue={estChoisie ? nomChoisi : ''}
                    onBlur={e => onChoisir(e.target.value, eq.nom)}
                    style={{ ...st.input, maxWidth: '240px' }} />
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

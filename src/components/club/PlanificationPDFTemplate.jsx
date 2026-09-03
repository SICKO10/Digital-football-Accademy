import { forwardRef } from 'react'
import { labelCategorie } from '../../lib/categories'
import { dateFr } from '../../lib/saison'

// Document imprimable (thème clair fixe, indépendant du thème sombre à
// l'écran) capturé par html2canvas — cf. exporterPDF dans PlanificationAnnuelle.jsx.
// Toujours monté hors-écran (position absolute, left -9999px) plutôt que
// display:none/toggle : html2canvas a besoin que la mise en page soit déjà
// stable au moment de la capture, pas juste rendue à l'instant du clic.
const PlanificationPDFTemplate = forwardRef(({ plan, phases, competitions, categorie, logoUrl, couleurPrimaire, couleurSecondaire }, ref) => {
  const couleur1 = couleurPrimaire || '#1a3a6e'
  const couleur2 = couleurSecondaire || '#4ade80'

  return (
    <div ref={ref} style={{ width: 1400, fontFamily: 'Arial, sans-serif', background: '#fff', color: '#000' }}>
      <div style={{ background: couleur1, padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {logoUrl && <img src={logoUrl} alt="" style={{ width: 70, height: 70, objectFit: 'contain', borderRadius: 8 }} />}
          <div>
            <div style={{ color: couleur2, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 3, marginBottom: 4 }}>
              Planification Annuelle Complète
            </div>
            <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 900, margin: 0 }}>Catégorie {labelCategorie(categorie)}</h1>
            <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>
              {dateFr(plan.date_debut, { day: '2-digit', month: 'long', year: 'numeric' })} → {dateFr(plan.date_fin, { day: '2-digit', month: 'long', year: 'numeric' })}
              {plan.nb_seances_semaine && ` · ${plan.nb_seances_semaine} entraînements / semaine`}
            </div>
          </div>
        </div>
        <div style={{ background: couleur2, color: couleur1, borderRadius: 12, padding: '10px 20px', fontWeight: 900, fontSize: 24 }}>
          {categorie}
        </div>
      </div>

      {phases.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ width: 100, background: couleur1, color: '#fff', padding: 10, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', border: '1px solid #2a4a8e', textAlign: 'left' }}>Période</th>
              {phases.map(ph => (
                <th key={ph.id} style={{ background: couleur1, color: '#fff', padding: 10, fontSize: 11, fontWeight: 900, border: '1px solid #2a4a8e', textAlign: 'center' }}>
                  <div style={{ color: couleur2, fontSize: 9, letterSpacing: 1, marginBottom: 2 }}>{(ph.type || '').toUpperCase()}</div>
                  {ph.nom}
                </th>
              ))}
            </tr>
            <tr>
              <td style={{ background: '#e8ecf4', padding: '6px 10px', fontSize: 10, fontWeight: 700, border: '1px solid #ccc', color: '#444' }}>Durée</td>
              {phases.map(ph => (
                <td key={ph.id} style={{ background: '#e8ecf4', padding: '6px 8px', fontSize: 10, textAlign: 'center', border: '1px solid #ccc', color: '#555' }}>
                  <div style={{ fontWeight: 700 }}>{ph.duree_semaines ? `${ph.duree_semaines} sem.` : ''}</div>
                  <div style={{ fontSize: 9, color: '#888' }}>{dateFr(ph.date_debut)} → {dateFr(ph.date_fin)}</div>
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ background: '#1a4a2a', color: couleur2, padding: '8px 10px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', border: '1px solid #2a6a3a' }}>Thème Offensif</td>
              {phases.map(ph => (
                <td key={ph.id} style={{ background: '#f0faf4', padding: '10px 8px', border: '1px solid #c8e6d0', verticalAlign: 'top' }}>
                  <div style={{ color: '#1a5c2a', fontWeight: 800, fontSize: 11, marginBottom: 6 }}>{ph.theme_offensif}</div>
                  {ph.sous_principes_offensifs?.map((sp, i) => <div key={i} style={{ color: '#2d7a3a', fontSize: 10, marginBottom: 2 }}>• {sp}</div>)}
                </td>
              ))}
            </tr>
            <tr>
              <td style={{ background: '#4a1a1a', color: '#ff8888', padding: '8px 10px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', border: '1px solid #6a2a2a' }}>Thème Défensif</td>
              {phases.map(ph => (
                <td key={ph.id} style={{ background: '#fdf4f4', padding: '10px 8px', border: '1px solid #e6c8c8', verticalAlign: 'top' }}>
                  <div style={{ color: '#8b1a1a', fontWeight: 800, fontSize: 11, marginBottom: 6 }}>{ph.theme_defensif}</div>
                  {ph.sous_principes_defensifs?.map((sp, i) => <div key={i} style={{ color: '#a02020', fontSize: 10, marginBottom: 2 }}>• {sp}</div>)}
                </td>
              ))}
            </tr>
            <tr>
              <td style={{ background: '#2a2a1a', color: '#e0c04a', padding: '8px 10px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', border: '1px solid #4a4a2a' }}>Objectifs Prioritaires</td>
              {phases.map(ph => (
                <td key={ph.id} style={{ background: '#fafaf0', padding: '10px 8px', border: '1px solid #e0e0b0', verticalAlign: 'top' }}>
                  {ph.objectifs_prioritaires?.map((obj, i) => <div key={i} style={{ color: '#555', fontSize: 10, marginBottom: 3 }}>• {obj}</div>)}
                </td>
              ))}
            </tr>
            <tr>
              <td style={{ background: '#1a1a4a', color: '#aaaaff', padding: '8px 10px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', border: '1px solid #2a2a6a' }}>Critères de réussite</td>
              {phases.map(ph => (
                <td key={ph.id} style={{ background: '#f4f4fd', padding: '10px 8px', border: '1px solid #c8c8e8', verticalAlign: 'top' }}>
                  {ph.criteres_reussite?.map((c, i) => <div key={i} style={{ color: '#333', fontSize: 10, marginBottom: 3 }}>• {c}</div>)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderTop: `3px solid ${couleur1}` }}>
        <div style={{ padding: 16, borderRight: '1px solid #ddd' }}>
          <div style={{ color: couleur1, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Compétitions & Échéances</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {competitions.length === 0 && <span style={{ color: '#999', fontSize: 10 }}>—</span>}
            {competitions.map((c, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ color: couleur1, fontWeight: 800, fontSize: 11 }}>{dateFr(c.date, { day: '2-digit', month: 'short', year: '2-digit' })}</div>
                <div style={{ color: '#555', fontSize: 10 }}>{c.nom}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: 16, borderRight: '1px solid #ddd' }}>
          <div style={{ color: couleur1, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Évaluation & Suivi</div>
          <div style={{ fontSize: 10, color: '#555', lineHeight: 1.6 }}>
            • Évaluation continue à chaque cycle<br />
            • Bilan mi-saison : analyse des objectifs atteints<br />
            • Entretien individuel : 2 fois dans la saison<br />
            • Bilan fin de saison : collectif + individuel
          </div>
        </div>

        <div style={{ padding: 16 }}>
          <div style={{ color: couleur1, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Principes Transversaux</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(plan.valeurs || []).map((v, i) => (
              <span key={i} style={{ background: couleur1 + '15', color: couleur1, borderRadius: 20, padding: '4px 10px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>{v}</span>
            ))}
          </div>
        </div>
      </div>

      {plan.projet_jeu && (
        <div style={{ background: couleur1, padding: '10px 24px' }}>
          <span style={{ color: '#fff', fontSize: 11, fontStyle: 'italic' }}>
            Projet de Jeu : <strong>{plan.projet_jeu}</strong>
          </span>
        </div>
      )}
    </div>
  )
})

export default PlanificationPDFTemplate

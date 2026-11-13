import { forwardRef } from 'react'
import { texteSur } from '../monclub/uiMonClub'

// Page A4 du « dossier sponsor » : mise en page fixe (794 x 1123 px), toujours claire,
// capturée en image puis posée dans un PDF par AudienceSponsors. Ne contient que des
// chiffres déjà calculés par l'onglet Audience : aucune donnée n'est inventée ici.
const nombre = (n) => n.toLocaleString('fr-FR')
const police = 'Inter, sans-serif'

function Barres({ barres, valeurs, couleur, parJour }) {
  const L = 714, H = 170, g = { gauche: 40, droite: 6, haut: 10, bas: 24 }
  const max = Math.max(...valeurs, 0)
  const pas = max <= 4 ? 1 : Math.pow(10, Math.floor(Math.log10(max / 3)))
  const unite = [1, 2, 5, 10].map(m => m * pas).find(p => max / p <= 4) || pas * 10
  const sommet = Math.max(unite, Math.ceil(max / unite) * unite)
  const graduations = []
  for (let v = 0; v <= sommet; v += unite) graduations.push(v)
  const largeurCase = (L - g.gauche - g.droite) / barres.length
  const largeurBarre = Math.min(24, largeurCase * 0.6)
  const yDe = (v) => g.haut + (H - g.haut - g.bas) * (1 - v / sommet)
  return (
    <svg viewBox={`0 0 ${L} ${H}`} width={L} height={H} style={{ display: 'block' }}>
      {graduations.map(v => (
        <g key={v}>
          <line x1={g.gauche} x2={L - g.droite} y1={yDe(v)} y2={yDe(v)} stroke="#e5e7eb" strokeWidth="1" />
          <text x={g.gauche - 8} y={yDe(v) + 4} textAnchor="end" fontSize="11" fill="#6b7280">{nombre(v)}</text>
        </g>
      ))}
      {barres.map((b, i) => {
        const v = valeurs[i]
        const x = g.gauche + largeurCase * i + (largeurCase - largeurBarre) / 2
        const h = v > 0 ? Math.max(3, yDe(0) - yDe(v)) : 0
        const afficher = !parJour || i % 5 === 4 || i === 0
        return (
          <g key={b.cle}>
            {h > 0 && <path d={`M${x},${yDe(0)} V${yDe(0) - h + 4} Q${x},${yDe(0) - h} ${x + 4},${yDe(0) - h} H${x + largeurBarre - 4} Q${x + largeurBarre},${yDe(0) - h} ${x + largeurBarre},${yDe(0) - h + 4} V${yDe(0)} Z`} fill={couleur} />}
            {afficher && <text x={x + largeurBarre / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="#6b7280">{b.label}</text>}
          </g>
        )
      })}
    </svg>
  )
}

const DossierSponsorPDF = forwardRef(function DossierSponsorPDF({ club, couleur, periodeLabel, tuiles, graphique, roles, evenements, apparitions, contact, dateTexte }, ref) {
  const surCouleur = texteSur(couleur)
  const logo = club?.image_hero_url || club?.avatar_url || null
  const nomClub = club?.club || club?.prenom || 'Le club'
  const titreSection = { margin: '0 0 12px', fontSize: 15, fontWeight: 800, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.6px' }

  return (
    <div ref={ref} style={{ width: 794, height: 1123, boxSizing: 'border-box', overflow: 'hidden', background: '#ffffff', color: '#111827', fontFamily: police, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: couleur, color: surCouleur, padding: '36px 40px 30px', display: 'flex', alignItems: 'center', gap: 20 }}>
        {logo && <img src={logo} alt="" crossOrigin="anonymous" style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 16, background: '#fff', flexShrink: 0 }} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', opacity: 0.85 }}>Dossier partenaires</div>
          <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.1, margin: '6px 0 4px' }}>{nomClub}</div>
          {club?.slogan && <div style={{ fontSize: 15, opacity: 0.9 }}>{club.slogan}</div>}
        </div>
        <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{periodeLabel}</div>
      </div>

      <div style={{ padding: '28px 40px 0', flex: 1, minHeight: 0 }}>
        <h2 style={titreSection}>L'audience du club en chiffres</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 26 }}>
          {tuiles.map(t => (
            <div key={t.id} style={{ border: '1px solid #e5e7eb', borderTop: `4px solid ${t.couleur}`, borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#4b5563' }}>{t.titre}</div>
              <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.1, margin: '4px 0 2px' }}>{nombre(t.total)}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>{t.sous}</div>
            </div>
          ))}
        </div>

        {graphique && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <h2 style={{ ...titreSection, margin: 0 }}>{graphique.titre}</h2>
              {roles && <span style={{ fontSize: 11, color: '#6b7280' }}>Éducateurs {nombre(roles.educateur || 0)} · Joueurs {nombre(roles.joueur || 0)} · Club {nombre(roles.club || 0)}</span>}
            </div>
            <Barres barres={graphique.barres} valeurs={graphique.valeurs} couleur={graphique.couleur} parJour={graphique.parJour} />
          </div>
        )}

        {evenements.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <h2 style={titreSection}>Visibilité par tournoi et par stage</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>{['Événement', 'Visites', 'Clics sur les partenaires'].map((h, i) => (
                  <th key={h} style={{ textAlign: i === 0 ? 'left' : 'right', padding: '6px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {evenements.slice(0, 5).map(e => (
                  <tr key={`${e.type}-${e.id}`}>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6' }}><span style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginRight: 8, textTransform: 'uppercase' }}>{e.type}</span>{e.nom}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, borderBottom: '1px solid #f3f4f6' }}>{nombre(e.vues)}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>{nombre(e.clics)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {apparitions.length > 0 && (
          <div>
            <h2 style={titreSection}>Où votre marque apparaît</h2>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7, color: '#374151' }}>
              {apparitions.map(a => <li key={a}>{a}</li>)}
            </ul>
          </div>
        )}
      </div>

      <div style={{ padding: '14px 40px 22px', borderTop: '1px solid #e5e7eb', fontSize: 10.5, color: '#6b7280', lineHeight: 1.55 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-end' }}>
          <div style={{ maxWidth: 520 }}>
            Une connexion est une ouverture de la plateforme par un éducateur, un joueur ou le club, pas une personne différente. Une visite est une ouverture de la page publique du club, d'un tournoi ou d'un stage, comptée une fois par session de navigation. Chiffres comptés automatiquement par la plateforme, arrêtés au {dateTexte}.
          </div>
          {contact && <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#111827', whiteSpace: 'pre-line' }}>{contact}</div>}
        </div>
      </div>
    </div>
  )
})

export default DossierSponsorPDF

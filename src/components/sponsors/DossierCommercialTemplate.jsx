import { forwardRef } from 'react'

// Document imprimable (thème clair fixe) capturé par html2canvas — cf.
// genererDossierPDF dans GestionSponsors.jsx. Toujours monté hors-écran
// (position absolute, left -9999px), même logique que PlanificationPDFTemplate.
const DossierCommercialTemplate = forwardRef(({ club, valorisation, offres, prospect, logoProspect, couleurPrimaire, couleurSecondaire }, ref) => {
  const couleur1 = couleurPrimaire || '#1a3a6e'
  const couleur2 = couleurSecondaire || '#4ade80'

  const CHIFFRES = [
    { key: 'nb_licencies', label: 'Licenciés' },
    { key: 'nb_familles', label: 'Familles' },
    { key: 'nb_equipes', label: 'Équipes' },
    { key: 'nb_matchs_saison', label: 'Matchs / saison' },
    { key: 'affluence_moyenne', label: 'Affluence moy. / match' },
    { key: 'abonnes_reseaux', label: 'Abonnés réseaux' },
    { key: 'vues_videos_mois', label: 'Vues vidéos / mois' },
    { key: 'frequentation_tournois', label: 'Pers. / tournoi' },
    { key: 'nb_affichages_physiques', label: 'Affichages physiques' },
  ].filter(c => valorisation?.[c.key] > 0)

  return (
    <div ref={ref} style={{ width: 1200, fontFamily: 'Arial, sans-serif', background: '#fff', color: '#000' }}>
      <div style={{ background: couleur1, padding: '32px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {club?.avatar_url && <img src={club.avatar_url} alt="" style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 12 }} />}
          <div>
            <div style={{ color: couleur2, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 3, marginBottom: 6 }}>
              Dossier de partenariat
            </div>
            <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 900, margin: 0 }}>{club?.club || 'Notre club'}</h1>
          </div>
        </div>
        {prospect && (
          <div style={{ background: '#fff', borderRadius: 12, padding: '16px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            {logoProspect && <img src={logoProspect} alt="" style={{ maxWidth: 100, maxHeight: 60, objectFit: 'contain' }} />}
            <div style={{ color: couleur1, fontWeight: 800, fontSize: 15 }}>Proposé à {prospect.nom_entreprise}</div>
          </div>
        )}
      </div>

      {CHIFFRES.length > 0 && (
        <div style={{ padding: '32px 40px' }}>
          <h2 style={{ color: couleur1, fontSize: 18, fontWeight: 900, margin: '0 0 20px', textTransform: 'uppercase', letterSpacing: 1 }}>Le club en chiffres</h2>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(CHIFFRES.length, 5)}, 1fr)`, gap: 14 }}>
            {CHIFFRES.map(c => (
              <div key={c.key} style={{ background: '#f1f5f9', borderRadius: 10, padding: '16px 10px', textAlign: 'center' }}>
                <div style={{ color: couleur1, fontSize: 26, fontWeight: 900 }}>{Number(valorisation[c.key]).toLocaleString('fr-FR')}</div>
                <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>{c.label}</div>
              </div>
            ))}
          </div>
          {valorisation?.repartition_geo && (
            <p style={{ color: '#334155', fontSize: 13, marginTop: 16 }}>📍 Répartition géographique : {valorisation.repartition_geo}</p>
          )}
        </div>
      )}

      {offres.length > 0 && (
        <div style={{ padding: '0 40px 40px' }}>
          <h2 style={{ color: couleur1, fontSize: 18, fontWeight: 900, margin: '0 0 20px', textTransform: 'uppercase', letterSpacing: 1 }}>Offres recommandées</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {offres.map(o => (
              <div key={o.id} style={{ border: `2px solid ${couleur1}`, borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ fontWeight: 900, fontSize: 16, color: '#0f172a' }}>{o.nom}</div>
                <div style={{ color: couleur1, fontWeight: 900, fontSize: 24, margin: '8px 0' }}>{Number(o.prix).toLocaleString('fr-FR')} €</div>
                {o.description && <p style={{ color: '#334155', fontSize: 12, lineHeight: 1.5, margin: 0 }}>{o.description}</p>}
                {o.audience_estimee > 0 && (
                  <p style={{ color: '#64748b', fontSize: 11, marginTop: 8 }}>👁️ {Number(o.audience_estimee).toLocaleString('fr-FR')} personnes touchées estimées</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: '#0f172a', padding: '20px 40px', textAlign: 'center' }}>
        <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>Merci pour l'intérêt porté à {club?.club || 'notre club'} — contactez-nous pour construire ensemble ce partenariat.</p>
      </div>
    </div>
  )
})
DossierCommercialTemplate.displayName = 'DossierCommercialTemplate'

export default DossierCommercialTemplate

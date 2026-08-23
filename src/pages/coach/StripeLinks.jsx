import { colors } from '../../tokens'
import Card from '../../components/coachAdmin/Card'
import SimpleTable from '../../components/coachAdmin/SimpleTable'
import { STRIPE_LINKS_CLUB } from '../../lib/stripeLinks'

// Note : contrairement au brief d'origine, ces clubs n'ont pas encore de
// Stripe ID / dernier paiement — ce sont des comptes créés manuellement,
// en attente d'activation (paiement pas encore effectué). On n'affiche donc
// que les données réelles : contact, palier à choisir, lien à copier.
export default function StripeLinks({ clubsEnAttente, palierChoisi, setPalierChoisi, activatingClub, activerClub, copierLienClub }) {
  const columns = [
    { key: 'club', label: 'Club', render: c => c.club || '(nom non renseigné)' },
    { key: 'contact', label: 'Contact', render: c => `${c.prenom || ''} ${c.nom || ''}`.trim() || c.email },
    { key: 'created_at', label: 'Inscrit le', render: c => new Date(c.created_at).toLocaleDateString('fr-FR') },
    {
      key: 'actions', label: 'Actions', render: c => (
        <button onClick={e => { e.stopPropagation(); activerClub(c.id) }} disabled={activatingClub === c.id}
          style={{ background: colors.accent.green + '15', border: '1px solid #4ade8040', color: colors.accent.green, padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {activatingClub === c.id ? 'Activation...' : '✓ Activer manuellement'}
        </button>
      ),
    },
  ]

  return (
    <>
      <p style={{ color: colors.text.dim, fontSize: '13px', marginBottom: '1.25rem', lineHeight: 1.6 }}>
        Comptes club (créés manuellement après un premier contact — voir aussi la page
        "Demande Club") en attente d'activation. Vérifie le nombre de licenciés avec le club,
        choisis le palier correspondant, copie le lien de paiement adapté et envoie-le par email.
        « Activer manuellement » sert uniquement si le paiement se fait hors Stripe (virement...).
      </p>
      {clubsEnAttente.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <p style={{ fontSize: '48px', marginBottom: '1rem' }}>🏟️</p>
            <p style={{ color: colors.text.dim }}>Aucun club en attente d'activation</p>
          </div>
        </Card>
      ) : (
        <SimpleTable
          columns={columns}
          rows={clubsEnAttente}
          rowKey="id"
          renderExpanded={c => {
            const palier = palierChoisi[c.id] || 'c0'
            return (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                <select value={palier} onChange={e => setPalierChoisi(prev => ({ ...prev, [c.id]: e.target.value }))}
                  style={{ background: colors.background.base, border: '1px solid #333', color: 'white', borderRadius: '8px', padding: '7px 10px', fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>
                  {Object.entries(STRIPE_LINKS_CLUB).map(([key, p]) => (
                    <option key={key} value={key}>{p.label} — {p.mensuelPrix} / {p.annuelPrix}</option>
                  ))}
                </select>
                <button onClick={() => copierLienClub(c.id, palier, 'mensuel')}
                  style={{ background: 'transparent', border: '1px solid #2a2a2a', color: colors.text.secondary, padding: '7px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
                  📋 Copier lien mensuel
                </button>
                <button onClick={() => copierLienClub(c.id, palier, 'annuel')}
                  style={{ background: 'transparent', border: '1px solid #2a2a2a', color: colors.text.secondary, padding: '7px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
                  📋 Copier lien annuel
                </button>
              </div>
            )
          }}
        />
      )}
    </>
  )
}

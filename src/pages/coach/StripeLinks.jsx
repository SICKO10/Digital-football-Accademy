import { useCoachTheme } from './useCoachTheme'
import Card from '../../components/coachAdmin/Card'
import SimpleTable from '../../components/coachAdmin/SimpleTable'
import { STRIPE_LINKS_CLUB } from '../../lib/stripeLinks'
import { IcoLink, IcoCopy } from './NavIcons'

// Note : contrairement au brief d'origine, ces clubs n'ont pas encore de
// Stripe ID / dernier paiement — ce sont des comptes créés manuellement,
// en attente d'activation (paiement pas encore effectué). On n'affiche donc
// que les données réelles : contact, palier à choisir, lien à copier.
export default function StripeLinks({ clubsEnAttente, palierChoisi, setPalierChoisi, activatingClub, activerClub, copierLienClub, educateursInclusInput, setEducateursInclusInput, enregistrerEducateursInclus, savingEducateursInclus }) {
  const { c, rgba } = useCoachTheme()

  const columns = [
    { key: 'club', label: 'Club', render: row => row.club || '(nom non renseigné)' },
    { key: 'contact', label: 'Contact', render: row => `${row.prenom || ''} ${row.nom || ''}`.trim() || row.email },
    { key: 'created_at', label: 'Inscrit le', render: row => new Date(row.created_at).toLocaleDateString('fr-FR') },
    {
      key: 'actions', label: 'Actions', render: row => (
        <button onClick={e => { e.stopPropagation(); activerClub(row.id) }} disabled={activatingClub === row.id}
          style={{ background: rgba(c.success, 0.12), border: `1px solid ${rgba(c.success, 0.4)}`, color: c.success, padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {activatingClub === row.id ? 'Activation...' : 'Activer manuellement'}
        </button>
      ),
    },
  ]

  return (
    <>
      <p style={{ color: c.textMuted, fontSize: '13px', marginBottom: '1.25rem', lineHeight: 1.6 }}>
        Comptes club (créés manuellement après un premier contact — voir aussi la page
        "Demande Club") en attente d'activation. Vérifie le nombre de licenciés avec le club,
        choisis le palier correspondant, copie le lien de paiement adapté et envoie-le par email.
        « Activer manuellement » sert uniquement si le paiement se fait hors Stripe (virement...).
      </p>
      {clubsEnAttente.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: c.textMuted }}><IcoLink size={40} /></div>
            <p style={{ color: c.textMuted }}>Aucun club en attente d'activation</p>
          </div>
        </Card>
      ) : (
        <Card>
          <SimpleTable
            columns={columns}
            rows={clubsEnAttente}
            rowKey="id"
            renderExpanded={row => {
              const palier = palierChoisi[row.id] || 'c0'
              const educateursInclusValeur = educateursInclusInput[row.id] ?? (row.educateurs_inclus ?? '')
              return (
                <div onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '10px' }}>
                    <select value={palier} onChange={e => setPalierChoisi(prev => ({ ...prev, [row.id]: e.target.value }))}
                      style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.text, borderRadius: '8px', padding: '7px 10px', fontSize: '12px' }}>
                      {Object.entries(STRIPE_LINKS_CLUB).map(([key, p]) => (
                        <option key={key} value={key}>{p.label} — {p.mensuelPrix} / {p.annuelPrix}</option>
                      ))}
                    </select>
                    <button onClick={() => copierLienClub(row.id, palier, 'mensuel')}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'transparent', border: `1px solid ${c.border}`, color: c.text, padding: '7px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
                      <IcoCopy size={12} /> Copier lien mensuel
                    </button>
                    <button onClick={() => copierLienClub(row.id, palier, 'annuel')}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'transparent', border: `1px solid ${c.border}`, color: c.text, padding: '7px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
                      <IcoCopy size={12} /> Copier lien annuel
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <label style={{ color: c.textMuted, fontSize: '12px' }}>Éducateurs inclus gratuitement :</label>
                    <input type="number" min="0" placeholder="illimité"
                      value={educateursInclusValeur}
                      onChange={e => setEducateursInclusInput(prev => ({ ...prev, [row.id]: e.target.value }))}
                      style={{ width: '80px', background: c.surface, border: `1px solid ${c.border}`, color: c.text, borderRadius: '8px', padding: '6px 10px', fontSize: '12px' }} />
                    <button onClick={() => enregistrerEducateursInclus(row.id)} disabled={savingEducateursInclus === row.id}
                      style={{ background: 'transparent', border: `1px solid ${c.border}`, color: c.text, padding: '6px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
                      {savingEducateursInclus === row.id ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>
                </div>
              )
            }}
          />
        </Card>
      )}
    </>
  )
}

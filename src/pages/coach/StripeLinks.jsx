import { useState } from 'react'
import { useCoachTheme } from './useCoachTheme'
import Card from '../../components/coachAdmin/Card'
import { STRIPE_LINKS_CLUB } from '../../lib/stripeLinks'
import { IcoCopy } from './NavIcons'

// Simple aide-mémoire des liens de paiement Stripe par formule club — plus
// de workflow d'activation manuelle ici (les clubs s'inscrivent en
// self-service depuis /offres, cf. ClubWizard dans Register.jsx ; le webhook
// Stripe détecte déjà le palier automatiquement à la réception du paiement).
export default function StripeLinks() {
  const { c } = useCoachTheme()
  const [copie, setCopie] = useState(null) // `${palier}-${cycle}` récemment copié

  const copier = (url, id) => {
    navigator.clipboard.writeText(url)
    setCopie(id)
    setTimeout(() => setCopie(prev => (prev === id ? null : prev)), 1500)
  }

  return (
    <>
      <p style={{ color: c.textMuted, fontSize: '13px', marginBottom: '1.25rem', lineHeight: 1.6 }}>
        Liens de paiement Stripe par formule, à copier au besoin.
      </p>
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {Object.entries(STRIPE_LINKS_CLUB).map(([key, p]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', padding: '12px 0', borderBottom: `1px solid ${c.border}` }}>
              <div style={{ minWidth: '170px', color: c.text, fontWeight: 700, fontSize: '13px' }}>{p.label}</div>
              {[['mensuel', p.mensuelPrix], ['annuel', p.annuelPrix]].map(([cycle, prix]) => {
                const id = `${key}-${cycle}`
                return (
                  <button key={cycle} onClick={() => copier(p[cycle], id)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'transparent', border: `1px solid ${c.border}`, color: c.text, padding: '7px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
                    <IcoCopy size={12} /> {copie === id ? 'Copié !' : `${cycle === 'mensuel' ? 'Mensuel' : 'Annuel'} — ${prix}`}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}

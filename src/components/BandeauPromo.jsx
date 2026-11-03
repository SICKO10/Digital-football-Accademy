import { colors } from '../tokens'
import { promoActive, PROMO_POURCENT, PROMO_CODE } from '../lib/promo'

const TEXTES = {
  fr: { titre: `-${PROMO_POURCENT}% exceptionnel sur le premier mois`, detail: 'sur tous les packs mensuels, jusqu\'au 15 novembre', cta: 'Voir les offres' },
  en: { titre: `-${PROMO_POURCENT}% off your first month`, detail: 'on all monthly plans, until November 15', cta: 'See the plans' },
  pt: { titre: `-${PROMO_POURCENT}% no primeiro mês`, detail: 'em todos os planos mensais, até 15 de novembro', cta: 'Ver as ofertas' },
  es: { titre: `-${PROMO_POURCENT}% en el primer mes`, detail: 'en todos los planes mensuales, hasta el 15 de noviembre', cta: 'Ver las ofertas' },
  it: { titre: `-${PROMO_POURCENT}% sul primo mese`, detail: 'su tutti i piani mensili, fino al 15 novembre', cta: 'Vedi le offerte' },
  de: { titre: `-${PROMO_POURCENT}% auf den ersten Monat`, detail: 'auf alle Monatspakete, bis 15. November', cta: 'Angebote ansehen' },
}

export default function BandeauPromo({ lang = 'fr', onClick }) {
  if (!promoActive()) return null
  const tx = TEXTES[lang] || TEXTES.fr
  return (
    <div style={{ background: colors.accent.green, color: colors.background.base, padding: '10px 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '6px 14px', textAlign: 'center', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>
      <span><strong style={{ fontWeight: 800 }}>{tx.titre}</strong> {tx.detail} · <strong style={{ fontWeight: 800, letterSpacing: '0.5px' }}>{PROMO_CODE}</strong></span>
      {onClick && (
        <button onClick={onClick} style={{ background: colors.background.base, color: colors.accent.green, border: 'none', borderRadius: '20px', padding: '5px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{tx.cta}</button>
      )}
    </div>
  )
}

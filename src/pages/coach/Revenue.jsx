import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { useCoachTheme } from './useCoachTheme'
import Tabs from '../../components/coachAdmin/Tabs'
import StatCard from '../../components/coachAdmin/StatCard'
import Card from '../../components/coachAdmin/Card'

const TYPE_LABELS = { joueur: 'Joueurs', educateur: 'Éducateurs', club: 'Clubs', recruteur: 'Recruteurs', dirigeant: 'Dirigeants' }
const TYPE_COLORS = (c) => ({ joueur: c.accent, educateur: c.success, club: c.warn, recruteur: c.danger, dirigeant: c.textMuted })

const euros = (cents) => (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

function debutJour(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
function ajouterJours(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x }

export default function Revenue() {
  const { c, fonts } = useCoachTheme()
  const [paiements, setPaiements] = useState(null)
  const [tab, setTab] = useState('mois')

  useEffect(() => {
    supabase.from('paiements').select('montant, type_utilisateur, cycle, created_at')
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) { console.error('Erreur chargement paiements :', error); setPaiements([]); return }
        setPaiements(data || [])
      })
  }, [])

  const sommeEntre = (debut, fin) => (paiements || [])
    .filter(p => { const d = new Date(p.created_at); return d >= debut && d < fin }).reduce((s, p) => s + p.montant, 0)

  const deltas = useMemo(() => {
    if (!paiements) return null
    const maintenant = new Date()
    const aujourdhui = debutJour(maintenant)
    const hier = ajouterJours(aujourdhui, -1)
    const debutSemaine = ajouterJours(aujourdhui, -6)
    const debutSemainePassee = ajouterJours(debutSemaine, -7)
    const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1)
    const debutMoisPasse = new Date(maintenant.getFullYear(), maintenant.getMonth() - 1, 1)
    const debutAnnee = new Date(maintenant.getFullYear(), 0, 1)
    const debutAnneePassee = new Date(maintenant.getFullYear() - 1, 0, 1)

    const pct = (actuel, precedent) => precedent > 0 ? Math.round(((actuel - precedent) / precedent) * 100) : null

    return {
      jour: { actuel: sommeEntre(aujourdhui, ajouterJours(aujourdhui, 1)), precedent: sommeEntre(hier, aujourdhui) },
      semaine: { actuel: sommeEntre(debutSemaine, ajouterJours(aujourdhui, 1)), precedent: sommeEntre(debutSemainePassee, debutSemaine) },
      mois: { actuel: sommeEntre(debutMois, maintenant), precedent: sommeEntre(debutMoisPasse, debutMois) },
      annee: { actuel: sommeEntre(debutAnnee, maintenant), precedent: sommeEntre(debutAnneePassee, debutAnnee) },
      pct,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paiements])

  // Buckets du graphique selon l'onglet actif.
  const { buckets, titre, total, periodeDebut, periodeFin } = useMemo(() => {
    if (!paiements) return { buckets: [], titre: '', total: 0, periodeDebut: new Date(), periodeFin: new Date() }
    const maintenant = new Date()
    let buckets, debut, fin, titre

    if (tab === 'jour') {
      debut = debutJour(maintenant)
      fin = ajouterJours(debut, 1)
      buckets = Array.from({ length: 24 }, (_, h) => ({ key: h, label: `${h}h`, debut: new Date(debut.getFullYear(), debut.getMonth(), debut.getDate(), h), fin: new Date(debut.getFullYear(), debut.getMonth(), debut.getDate(), h + 1) }))
      titre = `Revenus — ${maintenant.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
    } else if (tab === 'semaine') {
      debut = ajouterJours(debutJour(maintenant), -6)
      fin = ajouterJours(debutJour(maintenant), 1)
      buckets = Array.from({ length: 7 }, (_, i) => {
        const j = ajouterJours(debut, i)
        return { key: i, label: j.toLocaleDateString('fr-FR', { weekday: 'short' }), debut: j, fin: ajouterJours(j, 1) }
      })
      titre = '7 derniers jours'
    } else if (tab === 'mois') {
      debut = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1)
      fin = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 1)
      const nbJours = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0).getDate()
      buckets = Array.from({ length: nbJours }, (_, i) => {
        const j = new Date(maintenant.getFullYear(), maintenant.getMonth(), i + 1)
        return { key: i, label: String(i + 1), debut: j, fin: ajouterJours(j, 1) }
      })
      titre = `Revenus — ${maintenant.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`
    } else {
      debut = new Date(maintenant.getFullYear(), 0, 1)
      fin = new Date(maintenant.getFullYear() + 1, 0, 1)
      buckets = Array.from({ length: 12 }, (_, m) => {
        const j = new Date(maintenant.getFullYear(), m, 1)
        return { key: m, label: j.toLocaleDateString('fr-FR', { month: 'short' }), debut: j, fin: new Date(maintenant.getFullYear(), m + 1, 1) }
      })
      titre = `Revenus — ${maintenant.getFullYear()}`
    }

    const bucketsAvecTotal = buckets.map(b => ({ ...b, total: sommeEntre(b.debut, b.fin) }))
    const total = bucketsAvecTotal.reduce((s, b) => s + b.total, 0)
    return { buckets: bucketsAvecTotal, titre, total, periodeDebut: debut, periodeFin: fin }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paiements, tab])

  const paiementsPeriode = useMemo(() => (paiements || []).filter(p => {
    const d = new Date(p.created_at)
    return d >= periodeDebut && d < periodeFin
  }), [paiements, periodeDebut, periodeFin])

  const repartitionParType = useMemo(() => {
    const parType = {}
    for (const p of paiementsPeriode) {
      const type = p.type_utilisateur || 'non_attribue'
      parType[type] = (parType[type] || 0) + p.montant
    }
    const totalType = Object.values(parType).reduce((s, v) => s + v, 0)
    return Object.entries(parType)
      .sort((a, b) => b[1] - a[1])
      .map(([type, montant]) => ({ type, montant, pct: totalType > 0 ? Math.round((montant / totalType) * 100) : 0 }))
  }, [paiementsPeriode])

  const mensuelVsAnnuel = useMemo(() => {
    const mensuel = paiementsPeriode.filter(p => p.cycle === 'mensuel').reduce((s, p) => s + p.montant, 0)
    const annuel = paiementsPeriode.filter(p => p.cycle === 'annuel').reduce((s, p) => s + p.montant, 0)
    const max = Math.max(mensuel, annuel, 1)
    return { mensuel, annuel, max }
  }, [paiementsPeriode])

  if (!paiements || !deltas) return <p style={{ color: c.textMuted, textAlign: 'center', padding: '2rem' }}>Chargement...</p>

  const statCards = [
    { key: 'jour', label: "Aujourd'hui", ...deltas.jour, comparaison: 'vs hier' },
    { key: 'semaine', label: 'Cette semaine', ...deltas.semaine, comparaison: 'vs semaine passée' },
    { key: 'mois', label: 'Ce mois', ...deltas.mois, comparaison: 'vs mois passé' },
    { key: 'annee', label: 'Cette année', ...deltas.annee, comparaison: 'vs année passée' },
  ]

  const maxBucket = Math.max(1, ...buckets.map(b => b.total))

  return (
    <>
      <Tabs
        tabs={[{ id: 'jour', label: 'Jour' }, { id: 'semaine', label: 'Semaine' }, { id: 'mois', label: 'Mois' }, { id: 'annee', label: 'Année' }]}
        active={tab}
        onChange={setTab}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        {statCards.map(s => {
          const p = deltas.pct(s.actuel, s.precedent)
          const sub = p === null ? (s.actuel > 0 ? 'Pas de période de comparaison' : '—') : `${p >= 0 ? '↑' : '↓'} ${Math.abs(p)}% ${s.comparaison}`
          return <StatCard key={s.key} label={s.label} value={euros(s.actuel)} accent={c.accent} sub={sub} subColor={p !== null ? (p >= 0 ? c.success : c.danger) : undefined} />
        })}
      </div>

      <Card style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <p style={{ margin: 0, fontFamily: fonts.display, fontSize: '15px', fontWeight: 600, color: c.text, letterSpacing: '0.03em' }}>{titre}</p>
          <p style={{ margin: 0, fontFamily: fonts.mono, fontSize: '20px', color: c.accent, fontVariantNumeric: 'tabular-nums' }}>{euros(total)}</p>
        </div>

        {total === 0 ? (
          <p style={{ color: c.textMuted, fontSize: '13px', textAlign: 'center', padding: '2rem 0' }}>
            Aucun paiement enregistré sur cette période. La collecte a démarré avec cette page — les prochains paiements Stripe apparaîtront ici automatiquement.
          </p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '150px', overflowX: 'auto' }}>
            {buckets.map(b => (
              <div key={b.key} title={`${b.label} : ${euros(b.total)}`} style={{ flex: 1, minWidth: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                <div style={{ width: '100%', height: `${Math.max((b.total / maxBucket) * 100, b.total > 0 ? 3 : 0)}%`, background: c.accent, borderRadius: '2px 2px 0 0', transition: 'height 0.2s ease' }} />
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
          {buckets.length <= 31 && buckets.map(b => (
            <span key={b.key} style={{ flex: 1, textAlign: 'center', fontSize: '10px', color: c.textMuted }}>{buckets.length > 14 && b.key % 5 !== 0 ? '' : b.label}</span>
          ))}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <Card>
          <p style={{ margin: '0 0 12px', fontFamily: fonts.display, fontSize: '15px', fontWeight: 600, color: c.text, letterSpacing: '0.03em' }}>Répartition par type</p>
          {repartitionParType.length === 0 ? (
            <p style={{ color: c.textMuted, fontSize: '13px' }}>Aucune donnée sur cette période</p>
          ) : (
            repartitionParType.map(r => (
              <div key={r.type} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '9px' }}>
                <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: TYPE_COLORS(c)[r.type] || c.textMuted, flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: c.text, flex: 1 }}>{TYPE_LABELS[r.type] || 'Non attribué'}</span>
                <span style={{ fontFamily: fonts.mono, fontSize: '13px', color: c.text }}>{euros(r.montant)}</span>
                <span style={{ fontSize: '11px', color: c.textMuted, width: '32px', textAlign: 'right' }}>{r.pct}%</span>
              </div>
            ))
          )}
        </Card>

        <Card>
          <p style={{ margin: '0 0 12px', fontFamily: fonts.display, fontSize: '15px', fontWeight: 600, color: c.text, letterSpacing: '0.03em' }}>Mensuel vs Annuel</p>
          {[{ label: 'Mensuel', val: mensuelVsAnnuel.mensuel, color: c.accent }, { label: 'Annuel', val: mensuelVsAnnuel.annuel, color: c.success }].map(l => (
            <div key={l.label} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
                <span style={{ color: c.textMuted }}>{l.label}</span>
                <strong style={{ color: c.text, fontFamily: fonts.mono, fontWeight: 500 }}>{euros(l.val)}</strong>
              </div>
              <div style={{ height: '7px', background: c.border, borderRadius: '3px' }}>
                <div style={{ height: '7px', width: `${(l.val / mensuelVsAnnuel.max) * 100}%`, background: l.color, borderRadius: '3px', transition: 'width 0.2s ease' }} />
              </div>
            </div>
          ))}
        </Card>
      </div>
    </>
  )
}

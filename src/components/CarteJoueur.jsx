import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { saisonActuelle, bornesSaison } from '../lib/saison'

// ─── OVR CALCULATION ───
function calculerOVR({ buts, passesD, cleanSheets, matchs, tournoisGagnes, presencePct }) {
  const score =
    (buts * 3) +
    (passesD * 2) +
    (cleanSheets * 4) +
    (matchs * 0.8) +
    (tournoisGagnes * 8) +
    (presencePct * 0.3)
  return Math.min(99, Math.round(40 + score * 0.6))
}

// ─── TIER ───
function getTier(ovr) {
  if (ovr >= 90) return 'special'
  if (ovr >= 80) return 'gold'
  if (ovr >= 70) return 'silver'
  return 'bronze'
}

const TIERS = {
  bronze: { c1: '#cd7f32', c2: '#7a4d1a', cs: 'rgba(205,127,50,0.14)', cg: 'rgba(205,127,50,0.55)', bg: 'linear-gradient(155deg,#3a1c08 0%,#160a02 45%,#2a1206 100%)', shadow: 'rgba(205,127,50,0.28)', label: 'Bronze' },
  silver: { c1: '#a8c0d8', c2: '#607a94', cs: 'rgba(140,165,200,0.11)', cg: 'rgba(140,165,200,0.48)', bg: 'linear-gradient(155deg,#1a2035 0%,#0b0f1e 45%,#131828 100%)', shadow: 'rgba(140,165,200,0.2)', label: 'Silver' },
  gold:   { c1: '#ffc800', c2: '#9a6d00', cs: 'rgba(255,195,0,0.11)',   cg: 'rgba(255,195,0,0.55)',   bg: 'linear-gradient(155deg,#281c00 0%,#100b00 45%,#1c1400 100%)', shadow: 'rgba(255,195,0,0.32)', label: 'Gold' },
  special:{ c1: '#b87fff', c2: '#6c2fb8', cs: 'rgba(180,120,255,0.14)', cg: 'rgba(180,120,255,0.65)', bg: 'linear-gradient(155deg,#0c001e 0%,#040009 45%,#070014 100%)', shadow: 'rgba(155,100,255,0.38)', label: 'Special' },
}

const TITLE_STYLES = {
  national:  { bg: 'rgba(248,113,113,0.1)', color: '#f87171', border: 'rgba(248,113,113,0.25)' },
  gold:      { bg: 'rgba(255,195,0,0.13)',  color: '#ffc800', border: 'rgba(255,195,0,0.3)' },
  regional:  { bg: 'rgba(74,222,128,0.1)',  color: '#5de89a', border: 'rgba(74,222,128,0.22)' },
}

// Titres collectifs (l'équipe entière du joueur gagne le même badge) vs
// distinctions individuelles — dérivés de joueur_badges (Phase F), pas de
// tables séparées : ce ne sont pas deux systèmes différents, juste deux
// façons de regrouper les mêmes lignes à l'affichage.
const TYPES_COLLECTIFS = { tournoi_victoire: 'gold', champion: 'national', coupe: 'regional' }

export default function CarteJoueur({ userId, saison = saisonActuelle() }) {
  const [hovered, setHovered] = useState(false)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  async function charger() {
    if (!userId) { setLoading(false); return }
    const { date_debut, date_fin } = bornesSaison(saison)
    const aujourdHui = new Date().toISOString().split('T')[0]
    const finPeriode = aujourdHui < date_fin ? aujourdHui : date_fin

    const [{ data: profil }, { data: statsRows }, { data: badges }, { data: affiliation }] = await Promise.all([
      supabase.from('profiles').select('prenom, nom, poste, categorie, club, avatar_url').eq('id', userId).maybeSingle(),
      supabase.from('stats_match_joueur').select('buts, passes_decisives, buts_encaisses').eq('joueur_id', userId).gte('date', date_debut).lte('date', date_fin),
      supabase.from('joueur_badges').select('*').eq('joueur_id', userId).eq('saison', saison),
      supabase.from('affiliations').select('educateur_id, equipe_joueur_id').eq('joueur_id', userId).eq('statut', 'accepte').maybeSingle(),
    ])

    // Taux de présence aux entraînements — même source et même logique que
    // chargerTauxPresence (DashboardJoueur.jsx). Deux bugs corrigés par
    // rapport à la version précédente :
    // - le dénominateur ne filtrait pas par club_categorie_id : un éducateur
    //   gérant plusieurs équipes voyait TOUTES ses séances comptées, y
    //   compris celles d'équipes auxquelles le joueur n'a jamais appartenu.
    //   club_categorie_id n'est pas une colonne de affiliations (contrairement
    //   à ce que le select ci-dessous supposait initialement) : c'est une
    //   colonne de equipe_joueurs, retrouvée via equipe_joueur_id — même
    //   enrichissement que chargerAffiliations (DashboardJoueur.jsx).
    // - le dénominateur comptait TOUTES les séances de la période, y compris
    //   celles jamais pointées par l'éducateur (aucune ligne dans
    //   presences_entrainement) — ces séances non saisies tombaient de facto
    //   en "absence" côté taux. Seules les séances où un statut existe
    //   réellement (pointage manuel ou réponse au sondage de présence)
    //   comptent, comme côté DashboardJoueur.jsx.
    let presencePct = 0
    if (affiliation?.educateur_id && affiliation?.equipe_joueur_id) {
      const { data: equipeJoueur } = await supabase.from('equipe_joueurs').select('club_categorie_id').eq('id', affiliation.equipe_joueur_id).maybeSingle()
      let qEntrainements = supabase.from('entrainements').select('id')
        .eq('educateur_id', affiliation.educateur_id).gte('date', date_debut).lte('date', finPeriode)
      if (equipeJoueur?.club_categorie_id) qEntrainements = qEntrainements.eq('club_categorie_id', equipeJoueur.club_categorie_id)
      const [{ data: entrainementsSaison }, { data: presences }, { data: dispos }] = await Promise.all([
        qEntrainements,
        supabase.from('presences_entrainement').select('statut, entrainement_id').eq('joueur_id', affiliation.equipe_joueur_id),
        supabase.from('disponibilites').select('seance_id, statut').eq('joueur_id', userId),
      ])
      const presenceMap = {}
      presences?.forEach(p => { presenceMap[p.entrainement_id] = p.statut })
      const dispoMap = {}
      dispos?.forEach(d => { if (d.seance_id) dispoMap[d.seance_id] = d.statut })
      const statutEffectif = (entId) => presenceMap[entId] || dispoMap[entId] || null

      const saisies = (entrainementsSaison || []).filter(e => statutEffectif(e.id) !== null)
      if (saisies.length > 0) {
        const present = saisies.filter(e => statutEffectif(e.id) === 'present' || statutEffectif(e.id) === 'convoque').length
        presencePct = Math.round((present / saisies.length) * 100)
      }
    }

    const buts = (statsRows || []).reduce((s, r) => s + (r.buts || 0), 0)
    const passesD = (statsRows || []).reduce((s, r) => s + (r.passes_decisives || 0), 0)
    const matchs = (statsRows || []).length
    // Pas de colonne "clean sheet" — dérivé des lignes gardien (buts_encaisses
    // renseigné) à 0 encaissé.
    const cleanSheets = (statsRows || []).filter(r => r.buts_encaisses === 0).length
    const tournoisGagnes = (badges || []).filter(b => b.type === 'tournoi_victoire').length

    const titresCollectifs = (badges || [])
      .filter(b => TYPES_COLLECTIFS[b.type])
      .map(b => ({ type: TYPES_COLLECTIFS[b.type], emoji: b.icone, label: b.label }))
    const distinctions = (badges || [])
      .filter(b => !TYPES_COLLECTIFS[b.type] && b.type !== 'tournoi_participation')
      .map(b => `${b.icone ? b.icone + ' ' : ''}${b.label}`)

    setData({
      profil: profil || {}, buts, passesD, cleanSheets, matchs, tournoisGagnes, presencePct,
      titresCollectifs, distinctions,
    })
    setLoading(false)
  }

  useEffect(() => { charger() }, [userId, saison])

  if (loading || !data) return null

  const { profil, buts, passesD, cleanSheets, matchs, tournoisGagnes, presencePct, titresCollectifs, distinctions } = data
  const ovr = calculerOVR({ buts, passesD, cleanSheets, matchs, tournoisGagnes, presencePct })
  const tier = getTier(ovr)
  const t = TIERS[tier]
  const initiales = `${profil.prenom?.[0] || ''}${profil.nom?.[0] || ''}`

  const cardStyle = {
    width: 255,
    borderRadius: 22,
    position: 'relative',
    overflow: 'hidden',
    cursor: 'default',
    background: t.bg,
    boxShadow: hovered
      ? `0 18px 56px ${t.shadow}, 0 4px 16px rgba(0,0,0,1)`
      : `0 6px 36px ${t.shadow}, 0 2px 8px rgba(0,0,0,0.9)`,
    transform: hovered ? 'translateY(-10px) scale(1.025)' : 'none',
    transition: 'transform 0.35s cubic-bezier(.23,1,.32,1), box-shadow 0.35s',
    userSelect: 'none',
    border: `1px solid ${t.c1}40`,
  }

  const statItems = [
    { val: buts, key: 'Buts' },
    { val: passesD, key: 'Passes D.' },
    { val: cleanSheets || '—', key: 'Clean Sh.' },
    { val: matchs, key: 'Matchs' },
    { val: tournoisGagnes, key: 'Tournois' },
    { val: `${presencePct}%`, key: 'Présence' },
  ]

  return (
    <div style={cardStyle} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(118deg,transparent 15%,rgba(255,255,255,0.025) 28%,rgba(255,255,255,0.055) 38%,rgba(255,255,255,0.025) 48%,transparent 58%)', pointerEvents: 'none', zIndex: 10 }} />
      <div style={{ height: 3, background: `linear-gradient(90deg,transparent,${t.c1},transparent)`, opacity: 0.7 }} />
      <div style={{ position: 'absolute', right: 14, top: 3, width: 0, height: 0, borderLeft: '11px solid transparent', borderRight: '11px solid transparent', borderTop: `30px solid ${t.c1}`, opacity: 0.2, zIndex: 1 }} />

      <div style={{ padding: '12px 16px 12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 2, borderBottom: `1px solid ${t.c1}22` }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: 46, fontWeight: 900, color: t.c1, letterSpacing: -3, lineHeight: 1, textShadow: `0 0 24px ${t.cg}` }}>{ovr}</span>
          <span style={{ color: t.c2, fontSize: 8.5, fontWeight: 800, letterSpacing: '0.18em', marginTop: 1 }}>OVR</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, paddingRight: 22 }}>
          <span style={{ padding: '3px 10px', borderRadius: 20, background: t.cs, border: '1px solid rgba(255,255,255,0.12)', color: t.c1, fontSize: 10, fontWeight: 700 }}>{saison}</span>
          <span style={{ padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#666', fontSize: 9, fontWeight: 600 }}>{t.label}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 16px 10px', gap: 7, position: 'relative', zIndex: 2 }}>
        <div style={{ width: 82, height: 82, borderRadius: '50%', padding: 3, background: `conic-gradient(from 0deg,${t.c1},${t.c2},${t.c1})`, boxShadow: `0 0 20px ${t.cg}` }}>
          {profil.avatar_url
            ? <img src={profil.avatar_url} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="" />
            : <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#0e0e12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: t.c1, textShadow: `0 0 12px ${t.cg}` }}>{initiales}</div>
          }
        </div>
        <div style={{ color: '#f0f0f0', fontSize: 15, fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'center' }}>{profil.prenom} {profil.nom}</div>
        <div style={{ color: t.c2, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{profil.poste || '—'}</div>
      </div>

      <div style={{ height: 1, margin: '0 14px', background: `linear-gradient(90deg,transparent,${t.c1},transparent)`, opacity: 0.2 }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, margin: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
        {statItems.map(s => (
          <div key={s.key} style={{ background: 'rgba(0,0,0,0.28)', padding: '11px 5px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: 21, fontWeight: 900, color: t.c1, lineHeight: 1, textShadow: `0 0 12px ${t.cg}` }}>{s.val}</span>
            <span style={{ fontSize: 8, fontWeight: 700, color: '#3a3a3a', letterSpacing: '0.07em', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.3 }}>{s.key}</span>
          </div>
        ))}
      </div>

      {titresCollectifs.length > 0 && (
        <div style={{ margin: '0 14px 12px' }}>
          <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.14em', color: '#2e2e2e', textTransform: 'uppercase', marginBottom: 7 }}>Titres collectifs</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {titresCollectifs.map((tt, i) => {
              const s = TITLE_STYLES[tt.type] || TITLE_STYLES.regional
              return (
                <span key={i} style={{ padding: '3px 9px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>
                  {tt.emoji} {tt.label}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {distinctions.length > 0 && (
        <div style={{ margin: '0 14px 14px' }}>
          <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.14em', color: '#2e2e2e', textTransform: 'uppercase', marginBottom: 7 }}>Distinctions</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {distinctions.map((d, i) => (
              <span key={i} style={{ padding: '4px 9px', borderRadius: 7, fontSize: 10, fontWeight: 700, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#aaa' }}>{d}</span>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: 'rgba(0,0,0,0.45)', borderTop: '1px solid rgba(255,255,255,0.04)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
        <span style={{ color: t.c2, fontSize: 9.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{profil.club || '—'}</span>
        <span style={{ padding: '3px 9px', borderRadius: 20, background: t.cs, color: t.c1, fontSize: 9, fontWeight: 800, border: '1px solid rgba(255,255,255,0.06)' }}>{profil.categorie || '—'}</span>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'
import { saisonActuelle } from '../lib/saison'

const FORM_VIDE = { equipe_label: '', numero_maillot: '', matchs: '', buts: '', tirs: '', passes_reussies: '', taux_conversion: '', nb_evenements: '' }

// Stats Veo saisies volontairement par le joueur (app.veo.co → Analytics
// Studio → Statistiques du joueur), affichées sur son profil recruteur.
// Entièrement déclaratif, à son initiative — cf. supabase_veo_stats_joueur.sql
// pour pourquoi c'est un type de badge distinct de la vidéo vérifiée par
// import éducateur (joueur_video_badges/BadgeVideoVerifiee.jsx).
export default function VeoStatsJoueur({ joueurId }) {
  const colors = useColors()
  const [stats, setStats] = useState(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(FORM_VIDE)

  const appliquer = (data) => {
    setStats(data)
    setForm({
      equipe_label: data.equipe_label || '',
      numero_maillot: data.numero_maillot ?? '',
      matchs: data.matchs ?? '', buts: data.buts ?? '', tirs: data.tirs ?? '',
      passes_reussies: data.passes_reussies ?? '', taux_conversion: data.taux_conversion ?? '', nb_evenements: data.nb_evenements ?? '',
    })
  }

  useEffect(() => {
    const charger = async () => {
      if (!joueurId) return
      const { data } = await supabase.from('veo_stats_joueur').select('*')
        .eq('joueur_id', joueurId).eq('saison', saisonActuelle()).maybeSingle()
      if (data) appliquer(data)
    }
    charger()
  }, [joueurId])

  const sauvegarder = async () => {
    setLoading(true)
    const payload = {
      joueur_id: joueurId,
      saison: saisonActuelle(),
      equipe_label: form.equipe_label || null,
      numero_maillot: parseInt(form.numero_maillot) || null,
      matchs: parseInt(form.matchs) || 0,
      buts: parseInt(form.buts) || 0,
      tirs: parseInt(form.tirs) || 0,
      passes_reussies: parseInt(form.passes_reussies) || 0,
      taux_conversion: parseInt(form.taux_conversion) || 0,
      nb_evenements: parseInt(form.nb_evenements) || 0,
      date_saisie: new Date().toISOString(),
    }
    const { error } = await supabase.from('veo_stats_joueur').upsert(payload, { onConflict: 'joueur_id,saison' })
    if (error) { alert('Erreur : ' + error.message); setLoading(false); return }

    const { data: badgeExistant } = await supabase.from('joueur_badges').select('id')
      .eq('joueur_id', joueurId).eq('type', 'veo_stats_autodeclarees').eq('saison', saisonActuelle()).maybeSingle()
    if (!badgeExistant) {
      await supabase.from('joueur_badges').insert({
        joueur_id: joueurId, type: 'veo_stats_autodeclarees', label: 'Stats Veo',
        icone: '🎥', couleur: colors.accent.blue, saison: saisonActuelle(),
      })
    }

    appliquer(payload)
    setEditing(false)
    setLoading(false)
  }

  const card = { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '20px' }
  const label = { color: colors.text.faint, fontSize: '11px', display: 'block', marginBottom: '4px' }
  const input = { width: '100%', background: colors.background.raised, border: `1px solid ${colors.border.strong}`, borderRadius: '8px', padding: '10px 12px', color: colors.text.primary, fontSize: '13px', boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif' }

  const champ = (lbl, key, placeholder = '0') => (
    <div>
      <label style={label}>{lbl}</label>
      <input type="number" min="0" value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} style={input} />
    </div>
  )

  if (stats && !editing) {
    return (
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '10px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: colors.accent.blue, fontWeight: 800, fontSize: '14px' }}>Stats Veo</div>
            <div style={{ color: colors.text.faint, fontSize: '11px', marginTop: '2px' }}>
              {stats.equipe_label || 'Équipe'}{stats.numero_maillot ? ` · Maillot n°${stats.numero_maillot}` : ''} · Saison {saisonActuelle()}
            </div>
          </div>
          <button onClick={() => setEditing(true)}
            style={{ background: 'transparent', color: colors.accent.blue, border: `1px solid ${colors.accent.blue}`, borderRadius: '6px', padding: '5px 12px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            Modifier
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {[
            { label: 'Matchs', val: stats.matchs },
            { label: 'Buts', val: stats.buts },
            { label: 'Tirs', val: stats.tirs },
            { label: 'Passes', val: stats.passes_reussies },
            { label: 'Conversion', val: `${stats.taux_conversion}%` },
            { label: 'Événements', val: stats.nb_evenements },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center', background: colors.background.raised, borderRadius: '10px', padding: '12px 8px' }}>
              <div style={{ color: colors.accent.blue, fontWeight: 800, fontSize: '22px' }}>{s.val}</div>
              <div style={{ color: colors.text.faint, fontSize: '10px', marginTop: '3px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ color: colors.text.disabled, fontSize: '10px', marginTop: '12px', textAlign: 'center' }}>
          Saisies volontairement depuis Veo Analytics — déclaratif, non vérifié
        </div>
      </div>
    )
  }

  return (
    <div style={card}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ color: colors.accent.blue, fontWeight: 800, fontSize: '15px', marginBottom: '4px' }}>Ajouter mes stats Veo</div>
        <div style={{ color: colors.text.faint, fontSize: '12px' }}>
          Va sur <a href="https://app.veo.co" target="_blank" rel="noreferrer" style={{ color: colors.accent.blue }}>app.veo.co</a> → Analytics Studio → Statistiques du joueur → Tableau des statistiques
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        <div>
          <label style={label}>Équipe</label>
          <input value={form.equipe_label} onChange={e => setForm(p => ({ ...p, equipe_label: e.target.value }))} placeholder="ex : U18 AS Cannes" style={input} />
        </div>
        {champ('N° de maillot', 'numero_maillot', 'ex : 6')}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {champ('Matchs', 'matchs')}
        {champ('Buts', 'buts')}
        {champ('Tirs', 'tirs')}
        {champ('Passes réussies', 'passes_reussies')}
        {champ('Taux de conversion (%)', 'taux_conversion')}
        {champ('Nb événements', 'nb_evenements')}
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={sauvegarder} disabled={loading}
          style={{ background: colors.accent.blue, color: colors.black, border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 800, fontSize: '13px', cursor: loading ? 'default' : 'pointer', flex: 1, opacity: loading ? 0.6 : 1, fontFamily: 'Inter, sans-serif' }}>
          {loading ? 'Enregistrement...' : 'Enregistrer mes stats Veo'}
        </button>
        {stats && (
          <button onClick={() => setEditing(false)}
            style={{ background: 'transparent', color: colors.text.faint, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '10px 16px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            Annuler
          </button>
        )}
      </div>

      <div style={{ color: colors.text.disabled, fontSize: '10px', marginTop: '10px', textAlign: 'center' }}>
        Tu recevras automatiquement le badge "Stats Veo" sur ton profil
      </div>
    </div>
  )
}

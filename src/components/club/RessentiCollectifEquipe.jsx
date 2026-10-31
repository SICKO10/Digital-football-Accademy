import { useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { zoneRpe } from '../../lib/rpe'

// Stat équipe (dashboard club) : ressenti collectif des séances. Une ligne
// par séance où l'éducateur a demandé le ressenti, avec la moyenne de
// l'équipe en charge de travail (RPE /10) et en plaisir (/5). Les réponses
// individuelles ne quittent jamais la base : la fonction
// ressenti_collectif_equipe ne renvoie que des moyennes, à partir de 3
// réponses (supabase_ressenti_collectif_club.sql). Monté avec key = équipe :
// changer d'équipe repart d'un panneau fermé.
const MIN_REPONSES = 3

export default function RessentiCollectifEquipe({ categorieId }) {
  const colors = useColors()
  const [ouvert, setOuvert] = useState(false)
  const [seances, setSeances] = useState(null)
  const [erreur, setErreur] = useState('')

  const basculer = async () => {
    const ouvrir = !ouvert
    setOuvert(ouvrir)
    if (!ouvrir || seances) return
    setErreur('')
    const { data, error } = await supabase.rpc('ressenti_collectif_equipe', { p_categorie_id: categorieId })
    if (error) { setErreur('Chargement impossible : ' + error.message); return }
    setSeances(data || [])
  }

  const couleurRpe = (v) => colors.accent[zoneRpe(v)?.couleur] || colors.text.faint
  const couleurPlaisir = (v) => v >= 4 ? colors.accent.green : v >= 3 ? colors.accent.amber : colors.accent.red
  const valides = (seances || []).filter(s => s.nb_reponses >= MIN_REPONSES)
  const moyenne = (cle) => valides.length ? valides.reduce((a, s) => a + Number(s[cle]), 0) / valides.length : null

  const chiffre = (val, sur, couleur, libelle, estime) => (
    <div style={{ textAlign: 'center', minWidth: '64px' }}>
      <p style={{ margin: 0, fontSize: '20px', fontWeight: 800, lineHeight: 1, color: val == null ? colors.text.ghost : couleur(Number(val)), fontVariantNumeric: 'tabular-nums' }}>
        {val == null ? '–' : `${estime ? '≈' : ''}${Number(val).toFixed(1)}`}<span style={{ fontSize: '11px', color: colors.text.faint, fontWeight: 600 }}>/{sur}</span>
      </p>
      <p style={{ margin: '4px 0 0', fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: colors.text.faint }}>{libelle}</p>
    </div>
  )

  return (
    <div>
      <button onClick={basculer} style={{
        padding: '9px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
        background: ouvert ? colors.accent.blue + '1a' : 'transparent', border: `1px solid ${ouvert ? colors.accent.blue : colors.border.default}`, color: ouvert ? colors.accent.blue : colors.text.primary,
      }}>
        {ouvert ? 'Masquer le ressenti des séances' : 'Ressenti collectif des séances (charge et plaisir)'}
      </button>

      {ouvert && (
        <div style={{ marginTop: '12px', background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '16px 18px' }}>
          <p style={{ margin: '0 0 12px', fontSize: '12px', color: colors.text.faint }}>
            Moyenne de l'équipe pour chaque séance où l'éducateur a demandé le ressenti : charge de travail (RPE sur 10) et plaisir (sur 5). Les réponses individuelles restent visibles uniquement par l'éducateur ; une moyenne s'affiche à partir de {MIN_REPONSES} réponses.
          </p>
          {erreur ? <p style={{ margin: 0, fontSize: '13px', color: colors.accent.red }}>{erreur}</p>
            : seances == null ? <p style={{ margin: 0, fontSize: '13px', color: colors.text.faint }}>Chargement…</p>
            : seances.length === 0 ? <p style={{ margin: 0, fontSize: '13px', color: colors.text.faint }}>Aucun ressenti demandé pour cette équipe. L'éducateur le demande depuis une séance, dans son onglet Entraînements.</p>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {valides.length > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', padding: '10px 12px', borderRadius: '10px', background: colors.background.raised }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: colors.text.primary }}>Moyenne sur {valides.length} séances</span>
                    <div style={{ display: 'flex', gap: '18px' }}>
                      {chiffre(moyenne('rpe_moyen'), 10, couleurRpe, 'Charge')}
                      {chiffre(moyenne('plaisir_moyen'), 5, couleurPlaisir, 'Plaisir')}
                    </div>
                  </div>
                )}
                {seances.map(s => {
                  const date = new Date(`${s.date_seance}T12:00:00`)
                  const assez = s.nb_reponses >= MIN_REPONSES
                  return (
                    <div key={s.demande_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${colors.border.subtle}` }}>
                      <div style={{ minWidth: 0, flex: '1 1 180px' }}>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: colors.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.titre}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: colors.text.faint, textTransform: 'capitalize' }}>
                          {date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} · {s.nb_reponses} réponse{s.nb_reponses !== 1 ? 's' : ''}
                        </p>
                      </div>
                      {assez ? (
                        <div style={{ display: 'flex', gap: '18px' }}>
                          {chiffre(s.rpe_moyen, 10, couleurRpe, 'Charge', s.rpe_estime)}
                          {chiffre(s.plaisir_moyen, 5, couleurPlaisir, 'Plaisir')}
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: colors.text.faint }}>Pas assez de réponses ({MIN_REPONSES} minimum)</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
        </div>
      )}
    </div>
  )
}

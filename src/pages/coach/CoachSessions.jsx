import { useMemo, useState } from 'react'
import { useCoachTheme } from './useCoachTheme'
import Card from '../../components/coachAdmin/Card'
import Tabs from '../../components/coachAdmin/Tabs'
import FilterBar from '../../components/coachAdmin/FilterBar'
import { IcoBook, IcoCheck, IcoLock, IcoUser, IcoPlay } from './NavIcons'

export default function CoachSessions({ seancesTransferees, coachId, prendreEnCharge, setSeanceEvalModal, cloturerManuellement }) {
  const { c, rgba } = useCoachTheme()
  const [filtreStatut, setFiltreStatut] = useState('attente') // attente | completees
  const [recherche, setRecherche] = useState('')

  const aTraiter = s => s.statut === 'transfere_coach' && !s.cloture_manuelle_le

  const seancesFiltrees = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return seancesTransferees.filter(s => {
      if ((filtreStatut === 'attente') !== aTraiter(s)) return false
      if (q) {
        const nom = `${s.educateur?.prenom || ''} ${s.educateur?.nom || ''}`.toLowerCase()
        if (!nom.includes(q)) return false
      }
      return true
    })
  }, [seancesTransferees, filtreStatut, recherche])

  const nbAttente = seancesTransferees.filter(aTraiter).length

  return (
    <>
      <Tabs active={filtreStatut} onChange={setFiltreStatut} tabs={[
        { id: 'attente', label: `À traiter (${nbAttente})` },
        { id: 'completees', label: `Historique (${seancesTransferees.length - nbAttente})` },
      ]} />
      <FilterBar
        search={recherche}
        onSearchChange={setRecherche}
        searchPlaceholder="Rechercher un éducateur..."
      />

      {seancesFiltrees.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: c.textMuted }}><IcoBook size={40} /></div>
            <p style={{ color: c.textMuted }}>
              {seancesTransferees.length === 0 ? "Aucune séance transférée par un club pour l'instant" : 'Aucune séance ne correspond à ces filtres'}
            </p>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {seancesFiltrees.map(s => {
            const eval_ = Array.isArray(s.evaluation) ? s.evaluation[0] : s.evaluation
            return (
              <div key={s.id} style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: '10px', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '15px', color: c.text }}>{s.educateur?.prenom} {s.educateur?.nom} — {s.theme || 'Séance'}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: c.textMuted }}>
                    Club : {s.club?.club || `${s.club?.prenom} ${s.club?.nom}`} · {s.saison}
                    {s.date_seance ? ` · ${new Date(s.date_seance).toLocaleDateString('fr-FR')}` : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {s.pris_en_charge_par ? (
                    <>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: rgba(s.pris_en_charge_par === coachId ? c.success : c.warn, 0.12), border: `1px solid ${rgba(s.pris_en_charge_par === coachId ? c.success : c.warn, 0.4)}`, color: s.pris_en_charge_par === coachId ? c.success : c.warn, fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px' }}>
                        {s.pris_en_charge_par === coachId ? <IcoCheck size={11} /> : <IcoLock size={11} />}
                        {s.pris_en_charge_par === coachId ? 'Toi' : (s.coach?.prenom || 'Autre coach')}
                      </span>
                      {s.pris_en_charge_par === coachId && (
                        <button onClick={() => prendreEnCharge('seances_uploadees', s.id, true)} style={{ background: 'none', border: `1px solid ${c.border}`, color: c.textMuted, padding: '4px 8px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer' }}>Libérer</button>
                      )}
                    </>
                  ) : (
                    <button onClick={() => prendreEnCharge('seances_uploadees', s.id, false)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: rgba(c.accent, 0.12), border: `1px solid ${rgba(c.accent, 0.4)}`, color: c.accent, padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}><IcoUser size={13} /> Je m'en occupe</button>
                  )}
                  <a href={s.video_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: rgba(c.accent, 0.12), border: `1px solid ${rgba(c.accent, 0.4)}`, color: c.accent, padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}><IcoPlay size={13} /> Voir</a>
                  {aTraiter(s) && (
                    <>
                      <button onClick={() => setSeanceEvalModal(s)} style={{ background: c.accent, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>Analyser</button>
                      <button onClick={() => cloturerManuellement('seances_uploadees', s.id, true)} title="Classer dans l'historique sans envoyer d'analyse (impayé, doublon...)" style={{ background: 'transparent', border: `1px solid ${c.border}`, color: c.textMuted, padding: '8px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>Marquer comme fait sans envoyer</button>
                    </>
                  )}
                  {s.statut === 'transfere_coach' && s.cloture_manuelle_le && (
                    <>
                      <span style={{ background: rgba(c.textMuted, 0.15), color: c.textMuted, fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px' }}>Clôturée sans envoi</span>
                      <button onClick={() => cloturerManuellement('seances_uploadees', s.id, false)} style={{ background: 'transparent', border: `1px solid ${c.border}`, color: c.textMuted, padding: '5px 12px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer' }}>Remettre à traiter</button>
                    </>
                  )}
                  {eval_ && (
                    <span style={{ background: rgba(c.success, 0.12), color: c.success, fontSize: '13px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px' }}>{Math.round(eval_.note_totale)}/100</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

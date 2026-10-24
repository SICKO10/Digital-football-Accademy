import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { joursDuStage, formatJourCourt, formatDate, euros, dateStr, MODES_PAIEMENT } from '../../lib/stages'
import { telechargerAutorisationParentale } from '../../lib/stagesPdf'

// Onglet « Inscriptions » : récapitulatif jour par jour (présents, repas),
// suivi des paiements encaissés hors ligne par le club, fiche santé (visible
// uniquement par l'équipe qui gère le stage — règle appliquée en base),
// export CSV.

const STATUTS = { en_attente: 'En attente de paiement', paye: 'Payé', annule: 'Annulé' }
const FILTRES = [['actives', 'Inscrits'], ['en_attente', 'En attente'], ['paye', 'Payés'], ['annule', 'Annulés']]

const age = (naissance, aLaDate) => {
  if (!naissance) return null
  const [a, m, j] = naissance.split('-').map(Number)
  const [ra, rm, rj] = aLaDate.split('-').map(Number)
  return ra - a - ((rm < m || (rm === m && rj < j)) ? 1 : 0)
}

export default function StageInscriptions({ st, colors, accent, stage }) {
  const [inscriptions, setInscriptions] = useState([])
  const [offres, setOffres] = useState({})
  const [formules, setFormules] = useState({})
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [filtre, setFiltre] = useState('actives')
  const [ouverte, setOuverte] = useState(null)
  const [paiement, setPaiement] = useState(null) // { id, mode, montant, date }
  const [clubNom, setClubNom] = useState('')

  useEffect(() => {
    let annule = false
    Promise.all([
      supabase.from('stages_inscriptions').select('*').eq('stage_id', stage.id).order('created_at', { ascending: false }),
      supabase.from('stages_offres').select('id, nom').eq('stage_id', stage.id),
      supabase.from('stages_formules_repas').select('id, nom').eq('stage_id', stage.id),
      supabase.from('profiles_public').select('club').eq('id', stage.club_id).maybeSingle(),
    ]).then(([i, o, f, c]) => {
      if (annule) return
      const err = i.error || o.error || f.error
      if (err) setErreur('Chargement impossible : ' + err.message)
      setInscriptions(i.data || [])
      setOffres(Object.fromEntries((o.data || []).map(x => [x.id, x.nom])))
      setFormules(Object.fromEntries((f.data || []).map(x => [x.id, x.nom])))
      setClubNom(c.data?.club || '')
      setChargement(false)
    })
    return () => { annule = true }
  }, [stage.id, stage.club_id])

  const majLocale = (data) => setInscriptions(prev => prev.map(x => x.id === data.id ? data : x))

  const enregistrerPaiement = async () => {
    const montant = Number(String(paiement.montant).replace(',', '.'))
    if (!(montant >= 0)) return setErreur('Montant invalide.')
    const ins = inscriptions.find(x => x.id === paiement.id)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('stages_inscriptions').update({
      montant_paye: montant, mode_paiement: paiement.mode, paye_le: paiement.date, encaisse_par: user.id,
      statut_paiement: montant >= Number(ins.montant_du) ? 'paye' : 'en_attente',
    }).eq('id', paiement.id).select().single()
    if (error) return setErreur('Enregistrement impossible : ' + error.message)
    majLocale(data)
    setPaiement(null)
    setErreur('')
  }

  const annulerInscription = async (ins) => {
    if (!window.confirm(`Annuler l'inscription de ${ins.prenom} ${ins.nom} ? Ses places seront libérées.`)) return
    const { data, error } = await supabase.from('stages_inscriptions').update({ statut_paiement: 'annule' }).eq('id', ins.id).select().single()
    if (error) return setErreur('Annulation impossible : ' + error.message)
    majLocale(data)
  }

  const actives = inscriptions.filter(i => i.statut_paiement !== 'annule')
  const visibles = filtre === 'actives' ? actives : inscriptions.filter(i => i.statut_paiement === filtre)
  const totalDu = actives.reduce((s, i) => s + Number(i.montant_du), 0)
  const totalPaye = actives.reduce((s, i) => s + Number(i.montant_paye), 0)
  const jours = joursDuStage(stage)
  const nomsFormules = [...new Set(actives.map(i => i.formule_repas_id).filter(Boolean))]

  const exporterCsv = () => {
    const entetes = ['Référence', 'Dossard', 'Nom', 'Prénom', 'Date de naissance', 'Jours', 'Offre', 'Repas', 'Montant dû', 'Montant payé', 'Statut', 'Mode de paiement', 'Payé le', 'E-mail parent', 'Téléphone parent', 'Club d\'origine', 'Allergies', 'Médicaments', 'Notes médicales']
    const lignes = inscriptions.map(i => [
      i.reference, i.numero_dossard ?? '', i.nom, i.prenom, i.date_naissance || '', (i.jours || []).map(j => formatJourCourt(j)).join(' / '),
      offres[i.offre_id] || '', formules[i.formule_repas_id] || '', Number(i.montant_du).toFixed(2), Number(i.montant_paye).toFixed(2),
      STATUTS[i.statut_paiement] || i.statut_paiement, MODES_PAIEMENT[i.mode_paiement] || '', i.paye_le || '',
      i.email_parent, i.tel_parent, i.club_appartenance || '', i.allergies || '', i.medicaments || '', i.notes_medicales || '',
    ])
    const csv = [entetes, ...lignes].map(l => l.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `inscriptions-${stage.nom.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (chargement) return <p style={{ color: colors.text.faint, fontSize: '13px' }}>Chargement…</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {erreur && <p style={st.erreur}>{erreur}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
        {[['Inscrits', actives.length, colors.text.primary], ['Encaissé', euros(totalPaye), accent], ['Reste à encaisser', euros(Math.max(totalDu - totalPaye, 0)), '#facc15']].map(([k, v, c]) => (
          <div key={k} style={{ ...st.carte, padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: colors.text.faint }}>{k}</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: c }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={st.carte}>
        <span style={st.label}>Jour par jour</span>
        <div style={{ overflowX: 'auto', marginTop: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: colors.text.secondary }}>
            <thead>
              <tr style={{ color: colors.text.faint, textAlign: 'left' }}>
                <th style={{ padding: '6px 8px' }}>Jour</th>
                <th style={{ padding: '6px 8px' }}>Présents</th>
                <th style={{ padding: '6px 8px' }}>Places restantes</th>
                {nomsFormules.map(id => <th key={id} style={{ padding: '6px 8px' }}>{formules[id] || 'Repas'}</th>)}
              </tr>
            </thead>
            <tbody>
              {jours.map(j => {
                const presents = actives.filter(i => (i.jours || []).includes(j))
                return (
                  <tr key={j} style={{ borderTop: `1px solid ${colors.border.subtle}` }}>
                    <td style={{ padding: '6px 8px', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{formatJourCourt(j)}</td>
                    <td style={{ padding: '6px 8px', fontWeight: 700, color: colors.text.primary }}>{presents.length}</td>
                    <td style={{ padding: '6px 8px', color: stage.places_max - presents.length <= 0 ? '#f87171' : colors.text.dim }}>{Math.max(stage.places_max - presents.length, 0)}</td>
                    {nomsFormules.map(id => <td key={id} style={{ padding: '6px 8px' }}>{presents.filter(i => i.formule_repas_id === id).length}</td>)}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={st.carte}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {FILTRES.map(([id, label]) => (
              <button key={id} onClick={() => setFiltre(id)} style={{
                padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                background: filtre === id ? accent + '18' : 'transparent', border: `1px solid ${filtre === id ? accent + '60' : colors.border.default}`, color: filtre === id ? accent : colors.text.dim,
              }}>{label}</button>
            ))}
          </div>
          <button onClick={exporterCsv} disabled={inscriptions.length === 0} style={{ ...st.boutonDiscret, opacity: inscriptions.length ? 1 : 0.5 }}>Exporter (CSV)</button>
        </div>

        {visibles.length === 0 ? (
          <p style={{ margin: 0, fontSize: '13px', color: colors.text.faint }}>{inscriptions.length === 0 ? 'Aucune inscription pour l\'instant. Partage le lien public pour ouvrir les inscriptions.' : 'Aucune inscription dans cette catégorie.'}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {visibles.map(i => {
              const couleurStatut = i.statut_paiement === 'paye' ? accent : i.statut_paiement === 'annule' ? colors.text.faint : '#facc15'
              const a = age(i.date_naissance, stage.date_debut)
              const sante = i.allergies || i.medicaments || i.notes_medicales
              return (
                <div key={i.id} style={{ background: colors.background.raised, borderRadius: '10px', padding: '10px 12px', opacity: i.statut_paiement === 'annule' ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: colors.text.primary }}>
                        {i.prenom} {i.nom}{a !== null && <span style={{ fontWeight: 400, color: colors.text.faint }}> · {a} ans</span>}
                        {sante && <span style={{ marginLeft: '8px', fontSize: '10px', fontWeight: 700, color: '#f87171', border: '1px solid #f8717160', borderRadius: '6px', padding: '1px 6px' }}>SANTÉ</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: colors.text.dim }}>
                        {offres[i.offre_id] || 'Offre'}{i.formule_repas_id ? ` · ${formules[i.formule_repas_id] || 'Repas'}` : ''} · {(i.jours || []).length} jour(s) · réf. {i.reference}{i.numero_dossard ? ` · dossard n°${i.numero_dossard}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: colors.text.primary }}>{euros(i.montant_paye)} / {euros(i.montant_du)}</div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: couleurStatut }}>{STATUTS[i.statut_paiement]}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    <button onClick={() => setOuverte(ouverte === i.id ? null : i.id)} style={{ ...st.boutonDiscret, padding: '4px 10px', fontSize: '12px' }}>{ouverte === i.id ? 'Masquer la fiche' : 'Voir la fiche'}</button>
                    <button onClick={() => telechargerAutorisationParentale({
                      stage: { nom: stage.nom, lieu: stage.lieu, date_debut: stage.date_debut, date_fin: stage.date_fin, club_nom: clubNom },
                      enfant: i, jours: i.jours, contact: i, sante: i, reference: i.reference,
                    })} style={{ ...st.boutonDiscret, padding: '4px 10px', fontSize: '12px' }}>Autorisation (PDF)</button>
                    {i.statut_paiement !== 'annule' && i.statut_paiement !== 'paye' && (
                      <button onClick={() => setPaiement({ id: i.id, mode: (stage.modes_paiement || ['virement'])[0], montant: String(i.montant_du), date: dateStr(new Date()) })} style={{ ...st.bouton, padding: '4px 10px', fontSize: '12px' }}>Paiement reçu</button>
                    )}
                    {i.statut_paiement !== 'annule' && (
                      <button onClick={() => annulerInscription(i)} style={{ ...st.boutonDiscret, padding: '4px 10px', fontSize: '12px', color: '#f87171' }}>Annuler</button>
                    )}
                  </div>

                  {paiement?.id === i.id && (
                    <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', alignItems: 'end' }}>
                      <div>
                        <label style={st.label}>Mode</label>
                        <select value={paiement.mode} onChange={e => setPaiement(p => ({ ...p, mode: e.target.value }))} style={st.input}>
                          {Object.entries(MODES_PAIEMENT).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                        </select>
                      </div>
                      <div><label style={st.label}>Montant reçu (total)</label><input type="number" min="0" step="0.01" value={paiement.montant} onChange={e => setPaiement(p => ({ ...p, montant: e.target.value }))} style={st.input} /></div>
                      <div><label style={st.label}>Date</label><input type="date" value={paiement.date} onChange={e => setPaiement(p => ({ ...p, date: e.target.value }))} style={st.input} /></div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={enregistrerPaiement} style={{ ...st.boutonPlein, padding: '9px 14px' }}>Valider</button>
                        <button onClick={() => setPaiement(null)} style={st.boutonDiscret}>Annuler</button>
                      </div>
                    </div>
                  )}

                  {ouverte === i.id && (
                    <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '12px', color: colors.text.secondary }}>
                      <div><span style={st.label}>Contact parent</span>{i.email_parent}<br />{i.tel_parent}</div>
                      <div><span style={st.label}>Joueur</span>{i.date_naissance ? `Né(e) le ${formatDate(i.date_naissance, { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Date de naissance non renseignée'}{i.club_appartenance ? <><br />Club : {i.club_appartenance}</> : null}</div>
                      <div><span style={st.label}>Jours</span><span style={{ textTransform: 'capitalize' }}>{(i.jours || []).map(j => formatJourCourt(j)).join(', ')}</span></div>
                      <div><span style={st.label}>Paiement</span>{i.mode_paiement ? `${MODES_PAIEMENT[i.mode_paiement]} · ${i.paye_le ? formatDate(i.paye_le, { day: 'numeric', month: 'short' }) : ''}` : 'Pas encore reçu'}</div>
                      <div style={{ gridColumn: '1 / -1', background: sante ? '#f8717112' : 'transparent', border: sante ? '1px solid #f8717140' : 'none', borderRadius: '8px', padding: sante ? '8px 10px' : 0 }}>
                        <span style={st.label}>Santé (confidentiel)</span>
                        {sante ? (
                          <>
                            {i.allergies && <div><strong>Allergies :</strong> {i.allergies}</div>}
                            {i.medicaments && <div><strong>Médicaments :</strong> {i.medicaments}</div>}
                            {i.notes_medicales && <div style={{ whiteSpace: 'pre-line' }}><strong>Notes :</strong> {i.notes_medicales}</div>}
                          </>
                        ) : 'Rien de signalé.'}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

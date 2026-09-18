import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { colors } from '../tokens'

const genererCode = () => Math.random().toString(36).substring(2, 10).toUpperCase()

const VIDE_JOUEUR = { prenom: '', nom: '', numero_maillot: '', email: '', date_naissance: '' }
const ETAPES = ['infos', 'joueurs', 'paiement', 'confirmation']

const MODES_PAIEMENT = [
  { value: 'cheque', label: 'Chèque', desc: "À l'ordre de l'organisateur" },
  { value: 'especes', label: 'Espèces', desc: "À régler à l'accueil le jour du tournoi" },
  { value: 'virement', label: 'Virement bancaire', desc: 'Coordonnées envoyées par email après validation' },
]

export default function TournoiInscription() {
  const { code } = useParams()
  const [tournoi, setTournoi] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [etape, setEtape] = useState('infos')
  const [codeConfirm, setCodeConfirm] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [infos, setInfos] = useState({ nom_club: '', categorie: '', email_referent: '', nom_referent: '', telephone_referent: '', message: '' })
  const [joueurs, setJoueurs] = useState([{ ...VIDE_JOUEUR }])
  const [paiement, setPaiement] = useState('cheque')

  const charger = useCallback(async () => {
    const { data } = await supabase.from('tournois_organises').select('*').eq('code_public', code?.toUpperCase()).maybeSingle()
    if (!data) { setErreur("Tournoi introuvable ou inscriptions fermées."); setLoading(false); return }
    setTournoi(data)
    setInfos(i => ({ ...i, categorie: data.categorie_age || '' }))
    setLoading(false)
  }, [code])

  useEffect(() => { charger() }, [charger])

  function ajouterJoueur() { setJoueurs(p => [...p, { ...VIDE_JOUEUR }]) }
  function supprimerJoueur(idx) { setJoueurs(p => p.filter((_, i) => i !== idx)) }
  function updateJoueur(idx, cle, val) { setJoueurs(p => p.map((j, i) => (i === idx ? { ...j, [cle]: val } : j))) }

  async function soumettre() {
    setSubmitting(true)
    const code_confirmation = genererCode()
    const { data: inscription, error } = await supabase.from('tournois_inscriptions').insert({
      tournoi_id: tournoi.id,
      ...infos,
      mode_paiement: paiement,
      montant_du: tournoi.prix_inscription_equipe || 0,
      code_confirmation,
      statut: 'en_attente',
    }).select().single()

    if (error || !inscription) {
      console.error('inscription error:', error)
      setErreur("Erreur lors de l'inscription. Réessaie.")
      setSubmitting(false)
      return
    }

    const joueursValides = joueurs.filter(j => j.prenom.trim() && j.nom.trim())
    if (joueursValides.length > 0) {
      await supabase.from('tournois_inscriptions_joueurs').insert(
        joueursValides.map(j => ({
          inscription_id: inscription.id,
          prenom: j.prenom.trim(),
          nom: j.nom.trim(),
          numero_maillot: j.numero_maillot ? parseInt(j.numero_maillot) : null,
          email: j.email.trim() || null,
          date_naissance: j.date_naissance || null,
        }))
      )
    }

    setCodeConfirm(code_confirmation)
    setEtape('confirmation')
    setSubmitting(false)
  }

  const st = {
    page: { minHeight: '100vh', background: colors.background.base, color: colors.text.primary, fontFamily: 'Inter, sans-serif' },
    header: { background: colors.background.surface, borderBottom: `1px solid ${colors.border.subtle}`, padding: '24px', textAlign: 'center' },
    body: { maxWidth: '700px', margin: '0 auto', padding: '32px 24px' },
    card: { background: colors.background.surface, border: `1px solid ${colors.border.faint}`, borderRadius: '12px', padding: '24px', marginBottom: '20px' },
    input: { background: colors.background.raised, border: `1px solid ${colors.border.strong}`, borderRadius: '8px', padding: '10px 14px', color: colors.text.primary, fontSize: '14px', width: '100%', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' },
    label: { color: colors.text.faint, fontSize: '12px', marginBottom: '6px', display: 'block' },
    btn: { background: colors.accent.green, color: colors.black, border: 'none', borderRadius: '8px', padding: '12px 28px', cursor: 'pointer', fontWeight: 700, fontSize: '15px', width: '100%', fontFamily: 'Inter, sans-serif' },
    btnGhost: { background: 'transparent', color: colors.text.faint, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', fontFamily: 'Inter, sans-serif' },
    btnRed: { background: colors.accent.red + '22', color: colors.accent.red, border: `1px solid ${colors.accent.red}33`, borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' },
  }

  if (loading) return (
    <div style={{ ...st.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: colors.accent.green, fontSize: '16px' }}>Chargement…</div>
    </div>
  )

  if (erreur && !tournoi) return (
    <div style={{ ...st.page, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
      <p style={{ color: colors.text.faint }}>{erreur}</p>
    </div>
  )

  return (
    <div style={st.page}>
      <div style={st.header}>
        <div style={{ color: colors.accent.green, fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>Digital Football · Inscription tournoi</div>
        <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 900 }}>{tournoi.nom}</h1>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {tournoi.date && <span style={{ color: colors.text.faint, fontSize: '13px' }}>{new Date(tournoi.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>}
          {tournoi.lieu && <span style={{ color: colors.text.faint, fontSize: '13px' }}>{tournoi.lieu}</span>}
          {tournoi.categorie_age && <span style={{ color: colors.text.faint, fontSize: '13px' }}>{tournoi.categorie_age}</span>}
          {tournoi.prix_inscription_equipe > 0 && <span style={{ color: colors.accent.green, fontSize: '13px', fontWeight: 700 }}>{tournoi.prix_inscription_equipe}€ / équipe</span>}
        </div>
      </div>

      <div style={st.body}>
        {etape !== 'confirmation' && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', margin: '24px 0' }}>
            {[['infos', '1. Informations'], ['joueurs', '2. Joueurs'], ['paiement', '3. Paiement']].map(([id, label], i) => {
              const actif = etape === id
              const fait = ETAPES.indexOf(etape) > ETAPES.indexOf(id)
              return (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px', background: fait || actif ? colors.accent.green : colors.background.raised, color: fait || actif ? colors.black : colors.text.disabled }}>
                    {fait ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize: '12px', color: actif ? colors.text.primary : colors.text.disabled, fontWeight: actif ? 700 : 400 }}>{label}</span>
                  {i < 2 && <div style={{ width: '24px', height: '1px', background: colors.border.default, margin: '0 4px' }} />}
                </div>
              )
            })}
          </div>
        )}

        {etape === 'infos' && (
          <div style={st.card}>
            <h2 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 700 }}>Informations de l'équipe</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={st.grid2}>
                <div>
                  <label style={st.label}>Nom du club *</label>
                  <input style={st.input} placeholder="AS Cannes, OM..." value={infos.nom_club} onChange={e => setInfos(i => ({ ...i, nom_club: e.target.value }))} />
                </div>
                <div>
                  <label style={st.label}>Catégorie</label>
                  <input style={st.input} placeholder="U15, U18, Seniors..." value={infos.categorie} onChange={e => setInfos(i => ({ ...i, categorie: e.target.value }))} />
                </div>
              </div>
              <div style={st.grid2}>
                <div>
                  <label style={st.label}>Nom du référent *</label>
                  <input style={st.input} placeholder="Prénom Nom" value={infos.nom_referent} onChange={e => setInfos(i => ({ ...i, nom_referent: e.target.value }))} />
                </div>
                <div>
                  <label style={st.label}>Téléphone</label>
                  <input style={st.input} placeholder="06 XX XX XX XX" value={infos.telephone_referent} onChange={e => setInfos(i => ({ ...i, telephone_referent: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={st.label}>Email du référent *</label>
                <input style={st.input} type="email" placeholder="email@club.fr" value={infos.email_referent} onChange={e => setInfos(i => ({ ...i, email_referent: e.target.value }))} />
              </div>
              <div>
                <label style={st.label}>Message (optionnel)</label>
                <textarea style={{ ...st.input, minHeight: '80px', resize: 'vertical' }} placeholder="Questions, besoins particuliers..." value={infos.message} onChange={e => setInfos(i => ({ ...i, message: e.target.value }))} />
              </div>
            </div>
            <button style={{ ...st.btn, marginTop: '24px', opacity: (!infos.nom_club.trim() || !infos.email_referent.trim() || !infos.nom_referent.trim()) ? 0.5 : 1 }}
              disabled={!infos.nom_club.trim() || !infos.email_referent.trim() || !infos.nom_referent.trim()}
              onClick={() => setEtape('joueurs')}>
              Continuer — Ajouter les joueurs
            </button>
          </div>
        )}

        {etape === 'joueurs' && (
          <div style={st.card}>
            <h2 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 700 }}>Joueurs de l'équipe</h2>
            <p style={{ color: colors.text.faint, fontSize: '13px', margin: '0 0 20px' }}>Ajoute tes joueurs avec leur numéro de maillot.</p>

            {joueurs.map((j, idx) => (
              <div key={idx} style={{ background: colors.background.raised, borderRadius: '10px', padding: '14px', marginBottom: '10px', position: 'relative' }}>
                <div style={{ fontWeight: 700, color: colors.accent.green, fontSize: '12px', marginBottom: '10px' }}>JOUEUR {idx + 1}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', marginBottom: '10px' }}>
                  <input style={st.input} placeholder="Prénom *" value={j.prenom} onChange={e => updateJoueur(idx, 'prenom', e.target.value)} />
                  <input style={st.input} placeholder="Nom *" value={j.nom} onChange={e => updateJoueur(idx, 'nom', e.target.value)} />
                  <input style={{ ...st.input, width: '64px' }} placeholder="#" type="number" min="1" value={j.numero_maillot} onChange={e => updateJoueur(idx, 'numero_maillot', e.target.value)} />
                </div>
                <div style={st.grid2}>
                  <input style={st.input} type="email" placeholder="Email joueur (optionnel)" value={j.email} onChange={e => updateJoueur(idx, 'email', e.target.value)} />
                  <input style={st.input} type="date" value={j.date_naissance} onChange={e => updateJoueur(idx, 'date_naissance', e.target.value)} />
                </div>
                {joueurs.length > 1 && (
                  <button style={{ ...st.btnRed, position: 'absolute', top: '12px', right: '12px' }} onClick={() => supprimerJoueur(idx)}>✕</button>
                )}
              </div>
            ))}

            <button style={{ ...st.btnGhost, width: '100%', marginTop: '8px' }} onClick={ajouterJoueur}>+ Ajouter un joueur</button>

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button style={st.btnGhost} onClick={() => setEtape('infos')}>← Retour</button>
              <button style={{ ...st.btn, flex: 1, opacity: !joueurs.some(j => j.prenom.trim() && j.nom.trim()) ? 0.5 : 1 }}
                disabled={!joueurs.some(j => j.prenom.trim() && j.nom.trim())}
                onClick={() => setEtape('paiement')}>
                Continuer — Paiement
              </button>
            </div>
          </div>
        )}

        {etape === 'paiement' && (
          <div style={st.card}>
            <h2 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 700 }}>Mode de paiement</h2>
            {tournoi.prix_inscription_equipe > 0 && (
              <div style={{ background: colors.accent.green + '11', border: `1px solid ${colors.accent.green}33`, borderRadius: '8px', padding: '12px 16px', marginBottom: '20px' }}>
                <span style={{ color: colors.accent.green, fontWeight: 700, fontSize: '18px' }}>{tournoi.prix_inscription_equipe}€</span>
                <span style={{ color: colors.text.faint, fontSize: '13px', marginLeft: '8px' }}>à régler à ton arrivée</span>
              </div>
            )}

            {MODES_PAIEMENT.map(opt => (
              <div key={opt.value}
                onClick={() => setPaiement(opt.value)}
                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', marginBottom: '10px', borderRadius: '10px', cursor: 'pointer', border: `2px solid ${paiement === opt.value ? colors.accent.green : colors.border.faint}`, background: paiement === opt.value ? colors.accent.green + '11' : colors.background.raised }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${paiement === opt.value ? colors.accent.green : colors.border.strong}`, background: paiement === opt.value ? colors.accent.green : 'transparent', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>{opt.label}</div>
                  <div style={{ color: colors.text.faint, fontSize: '12px', marginTop: '2px' }}>{opt.desc}</div>
                </div>
              </div>
            ))}

            <div style={{ background: colors.background.raised, borderRadius: '10px', padding: '16px', margin: '20px 0' }}>
              <div style={{ fontWeight: 700, marginBottom: '10px', color: colors.text.faint, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Récapitulatif</div>
              <div style={{ fontSize: '14px', marginBottom: '6px' }}><span style={{ color: colors.text.faint }}>Club :</span> <strong>{infos.nom_club}</strong></div>
              <div style={{ fontSize: '14px', marginBottom: '6px' }}><span style={{ color: colors.text.faint }}>Référent :</span> {infos.nom_referent} · {infos.email_referent}</div>
              <div style={{ fontSize: '14px' }}><span style={{ color: colors.text.faint }}>Joueurs :</span> {joueurs.filter(j => j.prenom.trim() && j.nom.trim()).length} joueur(s) enregistré(s)</div>
            </div>

            {erreur && <p style={{ color: colors.accent.red, fontSize: '13px', marginBottom: '12px' }}>{erreur}</p>}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button style={st.btnGhost} onClick={() => setEtape('joueurs')}>← Retour</button>
              <button style={{ ...st.btn, flex: 1, opacity: submitting ? 0.6 : 1 }} onClick={soumettre} disabled={submitting}>
                {submitting ? 'Envoi en cours…' : 'Confirmer mon inscription'}
              </button>
            </div>
          </div>
        )}

        {etape === 'confirmation' && (
          <div style={{ ...st.card, textAlign: 'center', padding: '48px 32px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '12px', color: colors.accent.green }}>Inscription envoyée !</h2>
            <p style={{ color: colors.text.faint, fontSize: '15px', marginBottom: '24px' }}>
              Ta demande d'inscription pour <strong style={{ color: colors.text.primary }}>{infos.nom_club}</strong> au tournoi <strong style={{ color: colors.text.primary }}>{tournoi.nom}</strong> a bien été reçue.
            </p>
            <div style={{ background: colors.accent.green + '11', border: `1px solid ${colors.accent.green}33`, borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
              <div style={{ color: colors.text.faint, fontSize: '12px', marginBottom: '6px' }}>Ton code de suivi</div>
              <div style={{ color: colors.accent.green, fontWeight: 800, fontSize: '26px', letterSpacing: '4px' }}>{codeConfirm}</div>
              <div style={{ color: colors.text.faint, fontSize: '12px', marginTop: '6px' }}>Conserve-le — il te permettra de suivre ton inscription</div>
            </div>
            <div style={{ background: colors.background.raised, borderRadius: '10px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
              <div style={{ fontWeight: 700, marginBottom: '10px', fontSize: '14px' }}>Prochaines étapes</div>
              <div style={{ color: colors.text.faint, fontSize: '13px', lineHeight: 1.8 }}>
                L'organisateur va valider ton inscription.<br />
                Tu recevras une confirmation.<br />
                {paiement === 'virement' && <>Les coordonnées bancaires te seront envoyées.<br /></>}
                Le planning sera accessible une fois le tournoi confirmé.
              </div>
            </div>
            <a href={`/tournoi/${code}`} style={{ color: colors.accent.green, fontSize: '14px', fontWeight: 600 }}>
              → Suivre le tournoi en direct
            </a>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '32px', color: colors.text.ghost, fontSize: '12px' }}>
          Propulsé par <span style={{ color: colors.accent.green, fontWeight: 700 }}>Digital Football</span>
        </div>
      </div>
    </div>
  )
}

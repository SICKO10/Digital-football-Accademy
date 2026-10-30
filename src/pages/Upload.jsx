import { demanderSignatureUpload, ajouterChampsSignes } from '../lib/signatureUpload'
import { validerLienVideo, cleErreurLien } from '../lib/liensVideo'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, signOutSafe } from '../supabase'
import { useLang } from '../hooks/useLang'
import { t } from '../lib/translations'
import { colors, alpha } from '../tokens'
import { IconBall, IconVideo, IconCheckCircle, IconAlert, IconFolder, IconCheck } from '../components/icones'

// Destinataires (coachs analyseurs = admins_coach) calculés côté serveur par
// /api/send-coach-email : l'email des autres comptes n'est plus lisible ici,
// et plan='coach' ne correspondait de toute façon à aucun compte.
const notifierCoachs = async (payload) => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return
    await fetch('/api/send-coach-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(payload),
    })
  } catch (e) {
    console.error('Erreur notification coach:', e)
  }
}

export default function Upload() {
  const navigate = useNavigate()
  const { lang } = useLang()
  const [user, setUser] = useState(null)
  const [profil, setProfil] = useState(null)
  const [mode, setMode] = useState('lien')
  const [lien, setLien] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [success, setSuccess] = useState(false)
  const [erreur, setErreur] = useState('')
  const [description, setDescription] = useState('')
  const [numeroMaillot, setNumeroMaillot] = useState('')
  const [couleurMaillot, setCouleurMaillot] = useState('')
  const [tempsJeu, setTempsJeu] = useState('')
  const [posteMatch, setPosteMatch] = useState('')
  // Verrou synchrone, commun aux deux parcours (lien et fichier) — `uploading`
  // (state React) ne suffit pas seul : setUploading(true) planifie une mise
  // à jour, elle ne bloque pas une seconde invocation lancée avant le
  // prochain rendu (deux clics rapides, Entrée maintenue). Un useRef est un
  // objet mutable stable entre les rendus, lu/écrit de façon synchrone —
  // aucune fenêtre de course possible.
  const soumissionEnCoursRef = useRef(false)

  useEffect(() => { checkAuth() }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/login'); return }
    const { data: profil } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    if (!profil || !profil.abonnement_actif || profil.plan === 'scout' || profil.plan === 'coach') {
      navigate('/dashboard'); return
    }
    setUser(user)
    setProfil(profil)
  }

  // Le vrai décrément se fait côté serveur, atomiquement, par le trigger
  // trg_decrementer_credit_demande (cf. supabase_fix_messages_demandes_rls.sql)
  // au moment de l'INSERT dans demandes — jamais ici. Cette fonction ne fait
  // que relire la valeur réelle après coup pour que l'affichage reflète ce
  // que le serveur a effectivement décidé, plutôt que de recalculer une
  // valeur côté client qui pourrait diverger (double décrément, course entre
  // deux onglets, etc.).
  async function rechargerAnalysesRestantes() {
    const { data } = await supabase.from('profiles').select('analyses_restantes').eq('id', user.id).maybeSingle()
    if (data) setProfil(prev => ({ ...prev, analyses_restantes: data.analyses_restantes }))
  }

  // Le trigger lève une exception portant ce message exact quand le crédit
  // est épuisé (0 ou NULL) — on la reconnaît pour afficher le message
  // traduit existant plutôt que le texte brut de l'erreur Postgres.
  const estErreurCreditEpuise = (message) => !!message && message.includes('Aucune analyse restante')

  // Opérations secondaires, volontairement séparées de la création de la
  // demande : une fois l'INSERT confirmé, la demande existe et le crédit a
  // été consommé — rien de ce qui suit (notifier les coachs, rafraîchir
  // l'affichage du quota) ne doit pouvoir transformer ce succès en échec
  // affiché à l'utilisateur. Chaque appel est individuellement catché pour
  // qu'un échec de l'un n'empêche pas l'autre, et aucune des deux erreurs
  // ne remonte à l'appelant.
  async function executerOperationsSecondaires(joueurNom) {
    try {
      await notifierCoachs({ type: 'demande', joueurNom })
    } catch (e) {
      console.error('Erreur notification coachs (sans impact sur la demande déjà créée):', e)
    }
    try {
      await rechargerAnalysesRestantes()
    } catch (e) {
      console.error('Erreur rafraîchissement du quota (sans impact sur la demande déjà créée):', e)
    }
  }

  async function handleSubmitLien() {
    if (!lien.trim() || !user) return
    if (soumissionEnCoursRef.current) return
    soumissionEnCoursRef.current = true
    try {
      const lienValide = validerLienVideo(lien)
      if (!lienValide.ok) { setErreur(t(cleErreurLien(lienValide.raison), lang)); return }

      if (!profil.analyses_restantes || profil.analyses_restantes <= 0) {
        setErreur(t('upload_quota_utilise_ce_mois', lang))
        return
      }

      setUploading(true)
      setErreur('')

      const { error: e1 } = await supabase.from('profiles').update({
        clip_url: lienValide.url,
      }).eq('id', user.id)
      if (e1) throw e1

      const descriptionComplete = [
        numeroMaillot ? `🎽 Maillot n°${numeroMaillot}${couleurMaillot ? ` (${couleurMaillot})` : ''}` : '',
        tempsJeu ? `⏱ Temps de jeu : ${tempsJeu}` : '',
        posteMatch ? `⚽ Poste joué : ${posteMatch}` : '',
        description.trim() ? `📝 ${description.trim()}` : '',
      ].filter(Boolean).join('\n')

      const { error: e2 } = await supabase.from('demandes').insert({
        joueur_id: user.id,
        titre: `Analyse vidéo — ${profil.prenom} ${profil.nom}`,
        poste: profil.poste || '',
        description: descriptionComplete,
        video_url: lien.trim(),
        statut: 'en_attente',
      })
      if (e2) {
        setErreur(estErreurCreditEpuise(e2.message) ? t('upload_quota_utilise_ce_mois', lang) : (e2.message || t('upload_erreur_envoi', lang)))
        return
      }

      // La demande existe désormais en base, le crédit a été consommé par
      // le trigger : succès acquis, indépendamment de ce qui suit.
      // executerOperationsSecondaires n'est pas attendue : le finally
      // ci-dessous libère uploading/le verrou immédiatement après ce lancer,
      // sans attendre la notification ni le rafraîchissement du quota.
      setSuccess(true)
      executerOperationsSecondaires(`${profil.prenom} ${profil.nom}`)
    } catch (e) {
      setErreur(e.message || t('upload_erreur_envoi', lang))
    } finally {
      setUploading(false)
      soumissionEnCoursRef.current = false
    }
  }

  async function handleUploadFichier() {
    if (!file || !user) return
    if (soumissionEnCoursRef.current) return
    soumissionEnCoursRef.current = true

    if (!profil.analyses_restantes || profil.analyses_restantes <= 0) {
      setErreur(t('upload_quota_utilise_ce_mois', lang))
      soumissionEnCoursRef.current = false
      return
    }

    setUploading(true)
    setErreur('')
    setProgress(10)

    try {
      const sig = await demanderSignatureUpload('video')
      const { cloud_name } = sig
      setProgress(20)

      const formData = new FormData()
      formData.append('file', file)
      ajouterChampsSignes(formData, sig)

      const xhr = new XMLHttpRequest()

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(20 + Math.round((e.loaded / e.total) * 70))
        }
      }

      xhr.onload = async () => {
        // Corps enveloppé dans un try/catch (point 6 de la demande de
        // validation) : xhr.onload est une fonction async dont la promesse
        // n'est jamais attendue ni catchée par l'appelant — sans ce
        // try/catch, une exception ici (e1, JSON.parse, etc.) devenait un
        // rejet de promesse non géré : ni message d'erreur, ni
        // setUploading(false), l'interface restait bloquée sur la barre de
        // progression indéfiniment.
        try {
          if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText)
            const videoUrl = data.secure_url

            const { error: e1 } = await supabase.from('profiles').update({
              clip_url: videoUrl,
            }).eq('id', user.id)
            if (e1) throw e1

            const descriptionComplete = [
              numeroMaillot ? `🎽 Maillot n°${numeroMaillot}${couleurMaillot ? ` (${couleurMaillot})` : ''}` : '',
              posteMatch ? `⚽ Poste joué : ${posteMatch}` : '',
              description.trim() ? `📝 ${description.trim()}` : '',
            ].filter(Boolean).join('\n')

            const { error: e2 } = await supabase.from('demandes').insert({
              joueur_id: user.id,
              titre: `Analyse vidéo — ${profil.prenom} ${profil.nom}`,
              poste: profil.poste || '',
              description: descriptionComplete,
              video_url: videoUrl,
              statut: 'en_attente',
            })
            if (e2) {
              setErreur(estErreurCreditEpuise(e2.message) ? t('upload_quota_utilise_ce_mois', lang) : (e2.message || t('upload_upload_echoue', lang)))
              return
            }

            // La demande existe désormais en base, le crédit a été
            // consommé par le trigger : succès acquis, indépendamment de ce
            // qui suit.
            setProgress(100)
            setSuccess(true)
            executerOperationsSecondaires(`${profil.prenom} ${profil.nom}`)
          } else {
            const errData = JSON.parse(xhr.responseText)
            setErreur(errData?.error?.message || t('upload_upload_echoue', lang))
          }
        } catch (e) {
          setErreur(e.message || t('upload_upload_echoue', lang))
        } finally {
          setUploading(false)
          soumissionEnCoursRef.current = false
        }
      }

      xhr.onerror = () => {
        setErreur(t('upload_erreur_reseau', lang))
        setUploading(false)
        soumissionEnCoursRef.current = false
      }

      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloud_name}/video/upload`)
      xhr.send(formData)

    } catch (e) {
      // Échec avant même l'envoi XHR (ex. demanderSignatureUpload) — xhr.onload
      // ne se déclenchera jamais dans ce cas, donc le verrou doit être libéré
      // ici, pas seulement dans xhr.onload/xhr.onerror.
      setErreur(e.message || t('invite_erreur_inconnue', lang))
      setUploading(false)
      soumissionEnCoursRef.current = false
    }
  }

  const s = {
    page: { minHeight: '100vh', background: colors.background.base, color: colors.text.primary, fontFamily: 'Inter, sans-serif' },
    nav: { background: colors.background.surface, borderBottom: '1px solid #222', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' },
    logo: { color: colors.accent.green, fontWeight: 700, fontSize: '1.2rem', cursor: 'pointer' },
    container: { maxWidth: '700px', margin: '0 auto', padding: '3rem 2rem' },
    box: { background: colors.background.surface, border: '1px solid #222', borderRadius: '16px', padding: '2rem', marginBottom: '1.5rem' },
    label: { fontSize: '13px', color: colors.text.secondary, marginBottom: '6px', display: 'block' },
    input: { width: '100%', background: colors.background.raised, border: '1px solid #333', borderRadius: '8px', color: colors.text.primary, padding: '10px 12px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' },
    btn: (disabled) => ({
      width: '100%', padding: '14px', borderRadius: '8px', border: 'none',
      background: disabled ? colors.border.strong : colors.accent.green,
      color: disabled ? colors.text.dim : colors.black,
      fontSize: '15px', fontWeight: 700,
      cursor: disabled ? 'not-allowed' : 'pointer',
    }),
    modeBtn: (active) => ({
      flex: 1, padding: '12px', borderRadius: '8px',
      border: active ? '2px solid #4ade80' : '1px solid #333',
      background: active ? '#4ade8010' : 'transparent',
      color: active ? colors.accent.green : colors.text.dim,
      fontWeight: 600, cursor: 'pointer', fontSize: '14px',
    }),
    quotaBadge: (restantes) => ({
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      background: restantes > 0 ? '#001a0a' : '#1a0a00',
      border: `1px solid ${restantes > 0 ? colors.accent.green + alpha.medium : colors.accent.orange + alpha.medium}`,
      color: restantes > 0 ? colors.accent.green : colors.accent.orange,
      padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 600,
      marginBottom: '1.5rem',
    }),
  }

  if (!profil) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: colors.accent.green }}>{t('jexp_chargement', lang)}</p>
    </div>
  )

  const analysesRestantes = profil.analyses_restantes || 0
  const peutEnvoyer = analysesRestantes > 0

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <span style={s.logo} onClick={() => navigate('/')}><span style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: '6px' }}><IconBall size={18} /></span>Digital Football</span>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={() => navigate('/dashboard')}
            style={{ background: 'transparent', border: '1px solid #333', color: colors.text.secondary, padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
            {t('upload_dashboard_retour', lang)}
          </button>
          <button onClick={async () => { await signOutSafe(); navigate('/') }}
            style={{ background: 'transparent', border: 'none', color: colors.text.dim, cursor: 'pointer', fontSize: '13px' }}>
            {t('btn_deconnexion', lang)}
          </button>
        </div>
      </nav>

      <div style={s.container}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          {t('upload_partage_ta_video', lang)} <span style={{ color: colors.accent.green, display: 'inline-flex', verticalAlign: 'middle' }}><IconVideo size={26} /></span>
        </h1>
        <p style={{ color: colors.text.dim, marginBottom: '1.5rem', fontSize: '14px' }}>
          {t('upload_clip_desc', lang)}
        </p>

        {/* Quota analyses */}
        <div style={s.quotaBadge(analysesRestantes)}>
          {peutEnvoyer ? `${analysesRestantes} ${t('upload_analyses_restantes_suffix', lang)}` : t('upload_plus_analyses', lang)}
        </div>

        {success ? (
          <div style={{ ...s.box, border: '2px solid #4ade80', textAlign: 'center', padding: '3rem' }}>
            <p style={{ marginBottom: '1rem', color: colors.accent.green, display: 'flex', justifyContent: 'center' }}><IconCheckCircle size={56} /></p>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>{t('upload_video_envoyee', lang)}</h2>
            <p style={{ color: colors.text.dim, marginBottom: '0.5rem', fontSize: '14px' }}>{t('upload_clip_visible_recruteurs', lang)}</p>
            <p style={{ color: colors.accent.green, marginBottom: '0.5rem', fontSize: '14px' }}>{t('upload_demande_creee_coach', lang)}</p>
            <p style={{ color: colors.text.dim, marginBottom: '2rem', fontSize: '13px' }}>
              {t('upload_il_te_reste', lang)} <strong style={{ color: colors.text.primary }}>{analysesRestantes}</strong> {t('upload_analyses_ce_mois_suffix', lang)}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => navigate('/dashboard')}
                style={{ ...s.btn(false), width: 'auto', padding: '10px 24px' }}>
                {t('upload_mon_dashboard', lang)}
              </button>
              {analysesRestantes > 0 && (
                <button onClick={() => { setSuccess(false); setFile(null); setLien(''); setProgress(0) }}
                  style={{ background: colors.background.raised, border: '1px solid #333', color: colors.text.secondary, padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
                  {t('upload_envoyer_autre', lang)}
                </button>
              )}
            </div>
          </div>
        ) : !peutEnvoyer ? (
          <div style={{ ...s.box, border: '1px solid #f9731640', textAlign: 'center', padding: '3rem' }}>
            <p style={{ marginBottom: '1rem', color: colors.accent.orange, display: 'flex', justifyContent: 'center' }}><IconAlert size={52} /></p>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>{t('upload_quota_epuise', lang)}</h2>
            <p style={{ color: colors.text.dim, fontSize: '14px', marginBottom: '1.5rem' }}>
              {t('upload_quota_epuise_desc', lang)}<br />{t('upload_reviens_ou_upgrade', lang)}
            </p>
            <button onClick={() => navigate('/dashboard')}
              style={{ ...s.btn(false), width: 'auto', padding: '10px 24px' }}>
              {t('upload_retour_dashboard', lang)}
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem' }}>
              <button style={s.modeBtn(mode === 'lien')} onClick={() => setMode('lien')}>
                {t('upload_lien_video_mode', lang)}
              </button>
              <button style={s.modeBtn(mode === 'fichier')} onClick={() => setMode('fichier')}>
                {t('upload_upload_fichier_mp4_mode', lang)}
              </button>
            </div>

            {mode === 'lien' && (
              <div style={s.box}>
                <label style={{ ...s.label, fontSize: '15px', fontWeight: 600, color: colors.text.primary, marginBottom: '1rem' }}>
                  {t('upload_colle_ton_lien', lang)}
                </label>
                <input
                  style={s.input}
                  placeholder="https://app.veo.co/matches/... ou https://youtube.com/..."
                  value={lien}
                  onChange={e => setLien(e.target.value)}
                />
                <div style={{ background: '#0f2a1a', border: '1px solid #4ade8030', borderRadius: '10px', padding: '1rem', marginTop: '1rem' }}>
                  <p style={{ color: colors.accent.green, fontWeight: 600, fontSize: '13px', margin: '0 0 8px' }}>
                    {t('upload_plateformes_acceptees_title', lang)}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['Veo', 'YouTube', 'Google Drive', 'Hudl'].map(p => (
                      <span key={p} style={{ background: colors.background.raised, border: '1px solid #333', color: colors.text.dim, padding: '4px 10px', borderRadius: '20px', fontSize: '12px' }}>
                        <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: '4px', color: colors.accent.green }}><IconCheck size={12} /></span>{p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {mode === 'fichier' && (
              <div style={s.box}>
                <label style={{ ...s.label, fontSize: '15px', fontWeight: 600, color: colors.text.primary, marginBottom: '1rem' }}>
                  {t('upload_selectionne_ta_video', lang)}
                </label>
                <div
                  onClick={() => document.getElementById('video-input').click()}
                  style={{
                    border: '2px dashed ' + (file ? colors.accent.green : colors.border.strong),
                    borderRadius: '12px', padding: '3rem', textAlign: 'center',
                    cursor: 'pointer', background: file ? colors.accent.green + alpha.faint : 'transparent',
                  }}>
                  <p style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>{file ? <IconVideo size={40} /> : <IconFolder size={40} />}</p>
                  <p style={{ fontWeight: 600, marginBottom: '4px' }}>
                    {file ? file.name : t('upload_clique_selectionner', lang)}
                  </p>
                  <p style={{ fontSize: '13px', color: colors.text.faint }}>
                    {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : t('upload_max_500mb', lang)}
                  </p>
                </div>
                <input id="video-input" type="file" accept="video/*"
                  style={{ display: 'none' }}
                  onChange={e => setFile(e.target.files[0])} />

                {uploading && (
                  <div style={{ marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                      <span style={{ color: colors.accent.green }}>{t('upload_upload_en_cours', lang)}</span>
                      <span style={{ fontWeight: 700 }}>{progress}%</span>
                    </div>
                    <div style={{ background: colors.background.raised, borderRadius: '8px', height: '8px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: colors.accent.green, width: `${progress}%`, transition: 'width 0.3s', borderRadius: '8px' }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={s.box}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: colors.accent.green, margin: '0 0 14px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                {t('upload_aide_coach', lang)}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={s.label}>{t('upload_numero_maillot', lang)}</label>
                  <input
                    style={s.input}
                    placeholder="Ex: 10"
                    type="number"
                    min="1" max="99"
                    value={numeroMaillot}
                    onChange={e => setNumeroMaillot(e.target.value)}
                  />
                </div>
                <div>
                  <label style={s.label}>{t('upload_couleur_maillot', lang)}</label>
                  <input
                    style={s.input}
                    placeholder="Ex: Rouge, Blanc..."
                    value={couleurMaillot}
                    onChange={e => setCouleurMaillot(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={s.label}>{t('upload_temps_de_jeu', lang)}</label>
                  <input
                    style={s.input}
                    placeholder="Ex: Titulaire, sorti 65ème"
                    value={tempsJeu}
                    onChange={e => setTempsJeu(e.target.value)}
                  />
                </div>
                <div>
                  <label style={s.label}>{t('upload_poste_joue', lang)}</label>
                  <select value={posteMatch} onChange={e => setPosteMatch(e.target.value)} style={s.input}>
                    <option value="">{t('upload_poste_placeholder', lang)}</option>
                    {['Gardien', 'Défenseur central', 'Latéral droit', 'Latéral gauche', 'Milieu défensif', 'Milieu central', 'Milieu offensif', 'Ailier droit', 'Ailier gauche', 'Attaquant'].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              <label style={s.label}>{t('upload_notes_coach', lang)}</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ex: Match contre Lyon U18. Regardez mon appel de balle à la 12ème minute et mon pressing à la 34ème..."
                style={{ ...s.input, minHeight: '90px', resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            {erreur && (
              <p style={{ color: colors.accent.red, fontSize: '13px', marginBottom: '1rem', textAlign: 'center' }}>
                {erreur}
              </p>
            )}

            <button
              style={s.btn(mode === 'lien' ? !lien.trim() || uploading || !numeroMaillot || !couleurMaillot || !tempsJeu || !posteMatch : !file || uploading || !numeroMaillot || !couleurMaillot || !tempsJeu || !posteMatch)}
              disabled={mode === 'lien' ? !lien.trim() || uploading || !numeroMaillot || !couleurMaillot || !tempsJeu || !posteMatch : !file || uploading || !numeroMaillot || !couleurMaillot || !tempsJeu || !posteMatch}
              onClick={mode === 'lien' ? handleSubmitLien : handleUploadFichier}
            >
              {uploading
                ? `${t('upload_en_cours', lang)} ${mode === 'fichier' ? progress + '%' : ''}`
                : mode === 'lien' ? t('upload_envoyer_analyse', lang) : t('upload_envoyer_ma_video', lang)}
            </button>

            <p style={{ textAlign: 'center', fontSize: '12px', color: colors.text.faint, marginTop: '1rem' }}>
              {t('upload_visible_recruteurs_analyse', lang)}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
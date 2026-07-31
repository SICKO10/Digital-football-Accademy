import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../hooks/useLang'
import { t, LANGS } from '../lib/translations'

// TODO: remplacer ces placeholders par les vrais Payment Links Stripe avant mise en prod
const STRIPE = {
  joueur_mensuel: '#todo-stripe-joueur-mensuel',
  joueur_annuel: '#todo-stripe-joueur-annuel',
  analyse_unite: '#todo-stripe-analyse-unite',
  edu_mensuel: '#todo-stripe-edu-mensuel',
  edu_annuel: '#todo-stripe-edu-annuel',
}
// TODO: remplacer par le vrai lien de formulaire (Tally / Cal.com / Crisp)
const CLUB_CONTACT_URL = '#todo-lien-contact-club'

const CLUB_PALIERS = [
  { key: 'c0', label: '0 – 100', mensuel: 50, annuel: 500 },
  { key: 'c100', label: '101 – 200', mensuel: 100, annuel: 1000 },
  { key: 'c200', label: '201 – 300', mensuel: 130, annuel: 1300 },
  { key: 'c300', label: '301 – 400', mensuel: 160, annuel: 1600 },
  { key: 'c400', label: '401 – 500', mensuel: 190, annuel: 1900 },
  { key: 'c500', label: '500 +', mensuel: 250, annuel: 2500 },
]

export default function Offres() {
  const navigate = useNavigate()
  const { lang, setLang } = useLang()
  const [cycle, setCycle] = useState('mensuel') // 'mensuel' | 'annuel'
  const [palierClub, setPalier] = useState('c0')

  const palier = CLUB_PALIERS.find(p => p.key === palierClub)

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif' }}>

      {/* Navbar */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 32px', borderBottom: '1px solid #141414' }}>
        <span onClick={() => navigate('/')} style={{ fontWeight: 900, fontSize: '18px', letterSpacing: '-0.5px', cursor: 'pointer' }}>
          ⚽ <span style={{ color: '#4ade80' }}>Digital</span>Football
        </span>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {LANGS.map(l => (
              <button key={l.code} onClick={() => setLang(l.code)}
                style={{ background: lang === l.code ? '#4ade8020' : 'transparent', border: `1px solid ${lang === l.code ? '#4ade80' : '#2a2a2a'}`, borderRadius: '6px', padding: '3px 6px', cursor: 'pointer', fontSize: '12px' }}>
                {l.flag}
              </button>
            ))}
          </div>
          <button onClick={() => navigate('/login')} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#aaa', padding: '8px 18px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            {t('auth_connexion_titre', lang)}
          </button>
          <button onClick={() => navigate('/register')} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            {t('home_commencer', lang)}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '64px 20px 48px' }}>
        <p style={{ fontSize: '12px', color: '#4ade80', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '14px' }}>{t('offres_eyebrow', lang)}</p>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: '16px', lineHeight: 1.1 }}>
          {t('offres_titre_1', lang)}<br />{t('offres_titre_2', lang)}
        </h1>
        <p style={{ fontSize: '15px', color: '#555', maxWidth: '480px', margin: '0 auto 36px', lineHeight: 1.7 }}>
          {t('offres_sous_titre', lang)}
        </p>

        <div style={{ display: 'inline-flex', background: '#141414', border: '1px solid #1f1f1f', borderRadius: '30px', padding: '4px', gap: '4px' }}>
          {['mensuel', 'annuel'].map(c => (
            <button key={c} onClick={() => setCycle(c)}
              style={{
                background: cycle === c ? '#fff' : 'transparent',
                color: cycle === c ? '#000' : '#555',
                border: 'none', borderRadius: '24px',
                padding: '8px 22px', fontSize: '13px', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'all 0.15s',
              }}>
              {c === 'mensuel' ? t('offres_mensuel', lang) : (
                <>{t('offres_annuel', lang)} <span style={{ background: '#4ade80', color: '#000', fontSize: '10px', padding: '2px 7px', borderRadius: '10px', fontWeight: 800 }}>-17%</span></>
              )}
            </button>
          ))}
        </div>
        {cycle === 'annuel' && (
          <p style={{ fontSize: '12px', color: '#4ade80', marginTop: '10px' }}>{t('offres_2mois_offerts', lang)}</p>
        )}
      </div>

      {/* Cards Joueur + Éducateur */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>

        {/* ── JOUEUR ── */}
        <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: '20px', padding: '32px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '22px' }}>🎮</span>
            <span style={{ fontWeight: 800, fontSize: '18px' }}>{t('offres_joueur_titre', lang)}</span>
          </div>
          <p style={{ fontSize: '12px', color: '#555', marginBottom: '20px' }}>{t('offres_joueur_desc', lang)}</p>

          <div style={{ marginBottom: '4px' }}>
            <span style={{ fontSize: '40px', fontWeight: 900, letterSpacing: '-2px' }}>
              {cycle === 'mensuel' ? '10€' : '100€'}
            </span>
            <span style={{ fontSize: '14px', color: '#555', marginLeft: '4px' }}>
              {cycle === 'mensuel' ? t('home_mois_suffix', lang) : t('home_an_suffix', lang)}
            </span>
          </div>
          {cycle === 'mensuel' && (
            <p style={{ fontSize: '11px', color: '#4ade80', marginBottom: '20px', fontWeight: 600 }}>{t('offres_joueur_mensuel_note', lang)}</p>
          )}
          {cycle === 'annuel' && (
            <p style={{ fontSize: '11px', color: '#4ade80', marginBottom: '20px', fontWeight: 600 }}>{t('offres_annuel_equiv', lang)}</p>
          )}

          <button
            onClick={() => window.location.href = STRIPE[`joueur_${cycle}`]}
            style={{ background: '#4ade80', color: '#000', border: 'none', borderRadius: '12px', padding: '13px', fontSize: '14px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginBottom: '24px' }}>
            {t('offres_commencer', lang)}
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              t('offres_feature_analyse_incluse', lang),
              t('offres_feature_analyse_supp', lang),
              t('offres_feature_profil_visible', lang),
              t('offres_feature_feed_joga', lang),
              t('offres_feature_messagerie_clubs', lang),
              t('offres_feature_calendrier_sondage', lang),
            ].map(f => (
              <div key={f} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ color: '#4ade80', fontSize: '13px', flexShrink: 0, marginTop: '1px' }}>✓</span>
                <span style={{ fontSize: '13px', color: '#888', lineHeight: 1.5 }}>{f}</span>
              </div>
            ))}
          </div>

          {/* Analyse à l'unité */}
          <div style={{ marginTop: '20px', padding: '14px', background: '#141414', border: '1px solid #222', borderRadius: '12px' }}>
            <p style={{ fontSize: '11px', color: '#555', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{t('offres_analyse_supp_titre', lang)}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '22px', fontWeight: 900 }}>60€</p>
                <p style={{ fontSize: '11px', color: '#555' }}>{t('offres_par_analyse', lang)}</p>
              </div>
              <button
                onClick={() => window.location.href = STRIPE.analyse_unite}
                style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#aaa', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                {t('offres_acheter', lang)}
              </button>
            </div>
          </div>
        </div>

        {/* ── ÉDUCATEUR ── */}
        <div style={{ background: '#111', border: '2px solid #4ade8040', borderRadius: '20px', padding: '32px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '16px', right: '16px', background: '#4ade80', color: '#000', fontSize: '10px', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', letterSpacing: '0.5px' }}>
            {t('offres_populaire', lang)}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '22px' }}>🎓</span>
            <span style={{ fontWeight: 800, fontSize: '18px' }}>{t('offres_educateur_titre', lang)}</span>
          </div>
          <p style={{ fontSize: '12px', color: '#555', marginBottom: '20px' }}>{t('offres_educateur_desc', lang)}</p>

          <div style={{ marginBottom: '4px' }}>
            <span style={{ fontSize: '40px', fontWeight: 900, letterSpacing: '-2px' }}>
              {cycle === 'mensuel' ? '10€' : '100€'}
            </span>
            <span style={{ fontSize: '14px', color: '#555', marginLeft: '4px' }}>
              {cycle === 'mensuel' ? t('home_mois_suffix', lang) : t('home_an_suffix', lang)}
            </span>
          </div>
          {cycle === 'annuel' && (
            <p style={{ fontSize: '11px', color: '#4ade80', marginBottom: '20px', fontWeight: 600 }}>{t('offres_annuel_equiv', lang)}</p>
          )}
          {cycle === 'mensuel' && (
            <p style={{ fontSize: '11px', color: '#4ade80', marginBottom: '20px', fontWeight: 600 }}>{t('offres_resiliable', lang)}</p>
          )}

          <button
            onClick={() => window.location.href = STRIPE[`edu_${cycle}`]}
            style={{ background: '#4ade80', color: '#000', border: 'none', borderRadius: '12px', padding: '13px', fontSize: '14px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginBottom: '24px' }}>
            {t('offres_commencer', lang)}
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              t('offres_feature_tableau_equipe', lang),
              t('offres_feature_gestion_ent', lang),
              t('offres_feature_sondages_cal', lang),
              t('offres_feature_biblio', lang),
              t('offres_feature_tacticboard', lang),
              t('offres_feature_stats_joueurs', lang),
              t('offres_feature_prep_physique', lang),
              t('offres_feature_messagerie_interne', lang),
            ].map(f => (
              <div key={f} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ color: '#4ade80', fontSize: '13px', flexShrink: 0, marginTop: '1px' }}>✓</span>
                <span style={{ fontSize: '13px', color: '#888', lineHeight: 1.5 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CLUB ── */}
      <div style={{ maxWidth: '900px', margin: '24px auto 0', padding: '0 20px' }}>
        <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: '20px', padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <span style={{ fontSize: '22px' }}>🏟️</span>
                <span style={{ fontWeight: 800, fontSize: '18px' }}>{t('offres_club_titre', lang)}</span>
              </div>
              <p style={{ fontSize: '12px', color: '#555' }}>{t('offres_club_desc', lang)}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <p style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1 }}>
                {cycle === 'mensuel' ? `${palier.mensuel}€` : `${palier.annuel}€`}
              </p>
              <p style={{ fontSize: '13px', color: '#555' }}>{cycle === 'mensuel' ? t('home_mois_suffix', lang) : t('home_an_suffix', lang)}</p>
              {cycle === 'annuel' && (
                <p style={{ fontSize: '11px', color: '#4ade80', fontWeight: 600 }}>{t('offres_2mois_offerts_court', lang)}</p>
              )}
            </div>
          </div>

          <p style={{ fontSize: '11px', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>{t('offres_licencies_label', lang)}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '28px' }}>
            {CLUB_PALIERS.map(p => (
              <button key={p.key} onClick={() => setPalier(p.key)}
                style={{
                  background: palierClub === p.key ? '#4ade8015' : 'transparent',
                  border: `1px solid ${palierClub === p.key ? '#4ade80' : '#2a2a2a'}`,
                  color: palierClub === p.key ? '#4ade80' : '#555',
                  padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  transition: 'all 0.15s',
                }}>
                {p.label} {t('offres_licencies_suffix', lang)}
                <span style={{ marginLeft: '8px', fontSize: '12px', color: palierClub === p.key ? '#4ade80' : '#444' }}>
                  {cycle === 'mensuel' ? `${p.mensuel}€${t('home_mois_suffix', lang)}` : `${p.annuel}€${t('home_an_suffix', lang)}`}
                </span>
              </button>
            ))}
          </div>

          {/* Tableau comparatif paliers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: '#1a1a1a', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
            {[
              [t('offres_tableau_licencies', lang), t('offres_mensuel', lang), t('offres_tableau_annuel', lang)],
              ...CLUB_PALIERS.map(p => [p.label, `${p.mensuel}€${t('home_mois_suffix', lang)}`, `${p.annuel}€${t('home_an_suffix', lang)}`])
            ].map((row, i) => (
              row.map((cell, j) => (
                <div key={`${i}-${j}`} style={{
                  padding: '10px 14px',
                  background: i === 0 ? '#141414' : (CLUB_PALIERS[i - 1]?.key === palierClub ? '#4ade8010' : '#0f0f0f'),
                  borderLeft: j > 0 ? '1px solid #1a1a1a' : 'none',
                  borderTop: i > 0 ? '1px solid #1a1a1a' : 'none',
                  fontSize: i === 0 ? '10px' : '13px',
                  fontWeight: i === 0 ? 700 : (CLUB_PALIERS[i - 1]?.key === palierClub ? 700 : 400),
                  color: i === 0 ? '#555' : (CLUB_PALIERS[i - 1]?.key === palierClub ? '#4ade80' : '#777'),
                  letterSpacing: i === 0 ? '0.8px' : 0,
                  textTransform: i === 0 ? 'uppercase' : 'none',
                }}>
                  {cell}
                </div>
              ))
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
            {[
              t('offres_feature_acces_illimite', lang),
              t('offres_feature_tableau_dirigeant', lang),
              t('offres_feature_multi_equipes', lang),
              t('offres_feature_stats_club', lang),
              t('offres_feature_recrutement_scouts', lang),
              t('offres_feature_messagerie_globale', lang),
              t('offres_feature_support_prioritaire', lang),
              t('offres_feature_onboarding', lang),
            ].map(f => (
              <div key={f} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ color: '#4ade80', fontSize: '12px', flexShrink: 0, marginTop: '2px' }}>✓</span>
                <span style={{ fontSize: '12px', color: '#888', lineHeight: 1.5 }}>{f}</span>
              </div>
            ))}
          </div>

          {/* CTA Club → contact, pas Stripe */}
          <a
            href={CLUB_CONTACT_URL}
            target="_blank" rel="noreferrer"
            style={{ display: 'block', width: '100%', background: '#4ade80', color: '#000', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, sans-serif', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>
            {t('offres_club_cta', lang)}
          </a>
          <p style={{ textAlign: 'center', fontSize: '12px', color: '#555', marginTop: '10px' }}>
            {t('offres_club_cta_desc', lang)}
          </p>
        </div>
      </div>

      {/* FAQ courte */}
      <div style={{ maxWidth: '640px', margin: '56px auto', padding: '0 20px 64px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '20px', textAlign: 'center' }}>{t('offres_faq_titre', lang)}</h2>
        {[
          { q: t('offres_faq_q1', lang), r: t('offres_faq_r1', lang) },
          { q: t('offres_faq_q2', lang), r: t('offres_faq_r2', lang) },
          { q: t('offres_faq_q3', lang), r: t('offres_faq_r3', lang) },
          { q: t('offres_faq_q4', lang), r: t('offres_faq_r4', lang) },
        ].map(({ q, r }) => (
          <details key={q} style={{ borderBottom: '1px solid #141414', padding: '16px 0' }}>
            <summary style={{ fontWeight: 700, fontSize: '14px', cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {q} <span style={{ color: '#555', fontSize: '18px' }}>+</span>
            </summary>
            <p style={{ fontSize: '13px', color: '#666', lineHeight: 1.7, marginTop: '10px' }}>{r}</p>
          </details>
        ))}
      </div>
    </div>
  )
}

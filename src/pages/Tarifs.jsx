import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { colors, alpha } from '../tokens'
import {
  PALIERS_EDUCATEUR, FORFAITS_CLUB, outilsAchetables, outilsDuRole,
} from '../lib/catalogueOutils'
import { simulerOffre, MAX_EQUIPES } from '../lib/simulateurTarifs'
import { CONTACT_EMAIL } from '../lib/stripeLinks'
import { CarteChoix, PasEquipes } from '../components/outils/ElementsOffre'

// Page publique des tarifs (bloc 13), cachée jusqu'à la bascule : aucun lien ne
// pointe ici et la page demande aux moteurs de recherche de l'ignorer.
// Tous les prix viennent du catalogue et de simulerOffre, jamais d'ici.
// Page toujours sombre : jetons de couleur fixes, comme l'inscription composée.
const police = 'Inter, sans-serif'
const PERIODES = [['mensuel', 'Mensuel', 'par mois'], ['annuel', 'Annuel', 'par an']]
const ROLES = [['educateur', 'Éducateur'], ['club', 'Club']]

const SOCLE_TEXTE = {
  educateur: 'Accueil, profil, effectif, compétition, calendrier, planification des séances, présences et taux de présence, organisation.',
  club: 'Accueil, profil, catégories et équipes, éducateurs, staff, organigramme, inventaire, planning, séances, terrains, déplacements.',
}

const euros = (n) => `${n} €`

function Bascule({ valeurs, valeur, onChoix, label }) {
  return (
    <div role="radiogroup" aria-label={label} style={{ display: 'inline-flex', padding: 3, gap: 2, background: colors.background.raised, borderRadius: 999 }}>
      {valeurs.map(([val, texte]) => (
        <button key={val} type="button" role="radio" aria-checked={valeur === val} onClick={() => onChoix(val)} style={{
          minHeight: 44, padding: '8px 20px', border: 'none', borderRadius: 999, cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: police,
          background: valeur === val ? colors.background.surface : 'transparent',
          color: valeur === val ? colors.text.primary : colors.text.secondary,
        }}>{texte}</button>
      ))}
    </div>
  )
}

export default function Tarifs() {
  const navigate = useNavigate()
  const [role, setRole] = useState('educateur')
  const [periodicite, setPeriodicite] = useState('mensuel')
  const [choix, setChoix] = useState([])
  const [nbEquipes, setNbEquipes] = useState(2)

  useEffect(() => {
    const prev = document.title
    document.title = 'Tarifs | Digital Football'
    return () => { document.title = prev }
  }, [])

  const annuel = periodicite === 'annuel'
  const unite = PERIODES.find(p => p[0] === periodicite)[2]
  const s = simulerOffre(role, { outils: choix, nbEquipes, periodicite })
  const outils = role === 'club' ? outilsDuRole('club') : outilsAchetables('educateur')
  const basculer = (id) => setChoix(c => (c.includes(id) ? c.filter(x => x !== id) : [...c, id]))

  const carte = { background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: 16, padding: '16px 18px' }
  const titreSection = { margin: '0 0 12px', fontSize: 15, fontWeight: 800, color: colors.text.primary }

  return (
    <div style={{ minHeight: '100vh', background: colors.background.base, color: colors.text.primary, fontFamily: police }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${colors.border.default}` }}>
        <button type="button" onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', minHeight: 44, padding: 0, fontFamily: police, fontSize: 15, fontWeight: 800, color: colors.text.primary }}>Digital Football</button>
        <button type="button" onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', cursor: 'pointer', minHeight: 44, padding: '0 4px', fontFamily: police, fontSize: 13, fontWeight: 700, color: colors.text.secondary }}>Se connecter</button>
      </nav>

      <main style={{ maxWidth: 880, margin: '0 auto', padding: '32px 16px 56px' }}>
        <h1 style={{ margin: '0 0 10px', fontSize: 'clamp(26px, 6vw, 38px)', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1.15 }}>
          Ne payez que ce que vous utilisez vraiment
        </h1>
        <p style={{ margin: '0 0 28px', fontSize: 15, lineHeight: 1.6, color: colors.text.secondary, maxWidth: 620 }}>
          Un socle gratuit pour organiser votre saison, puis vous choisissez uniquement les outils dont vous avez besoin. Sans engagement : vous ajoutez ou retirez un outil quand vous voulez.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
          <Bascule valeurs={ROLES} valeur={role} onChoix={setRole} label="Vous êtes" />
          <Bascule valeurs={PERIODES.map(([v, t]) => [v, t])} valeur={periodicite} onChoix={setPeriodicite} label="Périodicité" />
        </div>

        <section aria-label="Le socle gratuit" style={{ ...carte, marginBottom: 24, borderColor: colors.accent.green + '40' }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: colors.accent.green }}>Gratuit pour toujours</p>
          <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.6, color: colors.text.secondary }}>{SOCLE_TEXTE[role]}</p>
        </section>

        <section aria-label="Simulateur" style={{ marginBottom: 32 }}>
          <h2 style={titreSection}>
            {role === 'club' ? 'Les outils de ton club, tous inclus dans le forfait' : 'Coche les outils dont tu as besoin'}
          </h2>

          {role === 'club' && (
            <div style={{ ...carte, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Combien d'équipes dans ton club ?</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: colors.text.faint }}>Le forfait dépend du nombre d'équipes, les outils sont tous inclus.</p>
              </div>
              <PasEquipes valeur={nbEquipes} onChange={setNbEquipes} />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginBottom: 16 }}>
            {role === 'club'
              ? outils.map(o => <CarteChoix key={o.id} nom={o.nom} promesse={o.promesse} coche />)
              : outils.map(o => <CarteChoix key={o.id} nom={o.nom} promesse={o.promesse} coche={choix.includes(o.id)} onSelection={() => basculer(o.id)} />)}
          </div>

          <div style={carte} aria-live="polite">
            {s.horsGamme ? (
              <p role="alert" style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: colors.accent.amber }}>
                Ton club a plus de {MAX_EQUIPES} équipes : écris-nous à {CONTACT_EMAIL} pour une offre adaptée.
              </p>
            ) : (
              <>
                <p style={{ margin: 0, fontSize: 13, color: colors.text.secondary }}>{s.libelle}</p>
                <p style={{ margin: '2px 0 0', fontSize: 28, fontWeight: 900 }}>
                  {euros(s.total)}{s.total > 0 && <span style={{ fontSize: 14, fontWeight: 600, color: colors.text.secondary }}> {unite}</span>}
                </p>
                {s.aide && <p style={{ margin: '4px 0 0', fontSize: 13, color: colors.text.faint }}>{s.aide}</p>}
                {s.economie > 0 && (
                  <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 700, color: colors.accent.green }}>Tu économises {euros(s.economie)} sur l'année par rapport au mensuel</p>
                )}
              </>
            )}
            <button type="button" disabled={s.horsGamme} onClick={() => navigate('/register?composer=1')} style={{
              width: '100%', minHeight: 50, marginTop: 14, border: 'none', borderRadius: 12, fontFamily: police, fontSize: 15, fontWeight: 800,
              background: colors.accent.green, color: colors.black, cursor: s.horsGamme ? 'not-allowed' : 'pointer', opacity: s.horsGamme ? 0.5 : 1,
            }}>Créer mon compte</button>
            <p style={{ margin: '10px 0 0', fontSize: 12, lineHeight: 1.5, color: colors.text.faint }}>
              À l'inscription, trois questions te proposent les outils qui te correspondent. Tu peux les modifier avant de payer.
            </p>
          </div>
        </section>

        <section aria-label="La grille" style={{ marginBottom: 32 }}>
          <h2 style={titreSection}>{role === 'club' ? 'Le forfait selon le nombre d\'équipes' : 'Le prix selon le nombre d\'outils'}</h2>
          <div style={{ ...carte, padding: 0, overflow: 'hidden' }}>
            {(role === 'club'
              ? FORFAITS_CLUB.map(f => ({ cle: f.palier, nom: `Jusqu'à ${f.equipes} équipes`, mensuel: f.prixMensuel, annuel: f.prixAnnuel }))
              : PALIERS_EDUCATEUR.map((p, i) => ({ cle: p.id, nom: `De ${i ? PALIERS_EDUCATEUR[i - 1].max + 1 : 1} à ${p.max} outils`, mensuel: p.prixMensuel, annuel: p.prixAnnuel }))
            ).map((l, i) => (
              <div key={l.cle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px', borderTop: i ? `1px solid ${colors.border.default}` : 'none' }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{l.nom}</span>
                <span style={{ fontSize: 14, fontWeight: 800, textAlign: 'right' }}>
                  {euros(annuel ? l.annuel : l.mensuel)}<span style={{ fontSize: 12, fontWeight: 600, color: colors.text.secondary }}> {unite}</span>
                </span>
              </div>
            ))}
          </div>
          {role === 'educateur' && (
            <p style={{ margin: '10px 0 0', fontSize: 12, lineHeight: 1.5, color: colors.text.faint }}>
              Si ton club t'ouvre certains de ses outils, ils s'ajoutent à ton compte sans frais.
            </p>
          )}
        </section>

        <p style={{ margin: 0, padding: '12px 14px', borderRadius: 10, fontSize: 12, lineHeight: 1.6, color: colors.accent.green, background: colors.accent.green + alpha.faint, border: `1px solid ${colors.accent.green}25` }}>
          Une question sur les tarifs ? Écris-nous à {CONTACT_EMAIL}.
        </p>
      </main>
    </div>
  )
}

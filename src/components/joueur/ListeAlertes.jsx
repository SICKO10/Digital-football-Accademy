import { useColors } from '../../lib/theme'
import { fontSize, radius, spacing } from '../../tokens'
import { localeOf } from '../../lib/translations'
import Carte from './Carte'
import TitreSection from './TitreSection'

// Panneau "Alertes" de l'accueil joueur — ce qui vient de changer et que le
// joueur doit voir sans aller le chercher plus bas dans la page. Chaque ligne
// se valide (bouton coche) pour disparaître, cf. useAlertesMasquees.
//
// Ce composant remplace deux panneaux qui étaient recopiés à l'identique dans
// DashboardJoueur.jsx (variante fan affiliée et variante Pro) : mêmes lignes,
// mêmes styles, mêmes textes, maintenus en double. La variante Pro n'affiche
// pas convocation/équipement/commentaire — elle a déjà sa grande carte de
// convocation et sa fenêtre d'équipement — donc elle ne passe simplement pas
// ces trois props.
//
// Aucune requête ici : toutes les listes arrivent déjà filtrées par le parent
// (c'est lui qui connaît les alertes masquées).
//
// À ne pas confondre avec src/components/AlertesPanel.jsx, qui est le panneau
// de l'éducateur : autres signaux, autres requêtes, autre rôle.

const IcoCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

// Une ligne = une pastille de statut, le texte, le bouton de validation.
// `couleur` suit le code de statut du projet, elle n'est jamais décorative.
function LigneAlerte({ couleur, onClick, onValider, children, detail }) {
  const colors = useColors()
  return (
    <div
      onClick={onClick}
      style={{
        padding: `${spacing.md} ${spacing.lg}`,
        background: colors.background.raised,
        borderRadius: radius.lg,
        cursor: onClick ? 'pointer' : undefined,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '999px', background: couleur, flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: fontSize.lg, color: colors.text.primary, flex: 1, fontWeight: detail ? 600 : 400 }}>
          {children}
        </p>
        <button
          onClick={e => { e.stopPropagation(); onValider() }}
          title="Valider"
          style={{
            flexShrink: 0, width: '24px', height: '24px', borderRadius: '999px',
            border: `1px solid ${colors.border.default}`, background: colors.background.surface,
            color: colors.text.faint, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', padding: 0,
          }}
        >
          <IcoCheck />
        </button>
      </div>
      {detail && (
        <p style={{ margin: `${spacing.xs} 0 0`, fontSize: fontSize.md, color: colors.text.faint, paddingLeft: `calc(8px + ${spacing.lg})` }}>
          {detail}
        </p>
      )}
    </div>
  )
}

export default function ListeAlertes({
  convocation = null,
  equipement = null,
  commentaire = null,
  rdvDuJour = [],
  entrainementsNouveaux = [],
  entrainementsSupprimes = [],
  matchSemaine = null,
  matchsHoraireChange = [],
  masquer,
  onOuvrirOnglet,
  lang = 'fr',
  isMobile = false,
  lundiCourant,
  style,
}) {
  const colors = useColors()

  const rien =
    !convocation && !equipement && !commentaire && !matchSemaine &&
    rdvDuJour.length === 0 && entrainementsNouveaux.length === 0 &&
    entrainementsSupprimes.length === 0 && matchsHoraireChange.length === 0
  if (rien) return null

  const jourLong = d => new Date(`${d}T12:00:00`).toLocaleDateString(localeOf(lang), { weekday: 'long', day: 'numeric', month: 'long' })
  const jourCourt = d => new Date(`${d}T12:00:00`).toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'long' })

  return (
    <Carte isMobile={isMobile} style={{ display: 'flex', flexDirection: 'column', gap: spacing.md, ...style }}>
      <TitreSection style={{ margin: 0 }}>Alertes</TitreSection>

      {convocation && (
        <LigneAlerte couleur={colors.accent.green} onValider={() => masquer(`convocation_${convocation.id}`)}>
          Convoqué {convocation.matchs_equipe?.domicile ? 'vs' : '@'} {convocation.matchs_equipe?.adversaire}
        </LigneAlerte>
      )}

      {equipement && (
        <LigneAlerte
          couleur={colors.accent.amber}
          onClick={() => onOuvrirOnglet?.('profil')}
          onValider={() => masquer(`equipement_${equipement.id}`)}
        >
          Ton équipement est prêt
        </LigneAlerte>
      )}

      {commentaire && (
        <LigneAlerte
          couleur={colors.accent.blue}
          onValider={() => masquer(`commentaire_${commentaire.id}`)}
          detail={commentaire.commentaire}
        >
          Commentaire du coach · vs {commentaire.matchs_equipe?.adversaire}
        </LigneAlerte>
      )}

      {rdvDuJour.map(r => (
        <LigneAlerte
          key={r.id}
          couleur={colors.accent.orange}
          onClick={() => onOuvrirOnglet?.('sante')}
          onValider={() => masquer(`rdv_medical_${r.id}`)}
        >
          Tu as rdv{r.heure_rdv ? ` à ${r.heure_rdv.slice(0, 5)}` : ''} aujourd'hui{r.blessures?.type_blessure ? ` (${r.blessures.type_blessure})` : ''}. N'oublie pas de remplir le suivi médical après ton rdv.
        </LigneAlerte>
      ))}

      {entrainementsNouveaux.map(ent => (
        <LigneAlerte
          key={`ent_nouveau_${ent.id}`}
          couleur={colors.accent.green}
          onValider={() => masquer(`entrainement_nouveau_${ent.id}`)}
        >
          Nouvel entraînement le {jourLong(ent.date)}{ent.heure ? ` à ${ent.heure}` : ''}
        </LigneAlerte>
      ))}

      {entrainementsSupprimes.map(es => (
        <LigneAlerte
          key={`ent_supprime_${es.id}`}
          couleur={colors.accent.red}
          onValider={() => masquer(`entrainement_supprime_${es.id}`)}
        >
          Séance supprimée · {jourCourt(es.date)}{es.heure ? ` à ${es.heure}` : ''}
        </LigneAlerte>
      ))}

      {matchSemaine && (
        <LigneAlerte
          couleur={colors.accent.blue}
          onValider={() => masquer(`match_semaine_${lundiCourant}_${matchSemaine.id}`)}
        >
          Match cette semaine · {matchSemaine.domicile ? 'vs' : '@'} {matchSemaine.adversaire || 'adversaire à confirmer'}, le {jourLong(matchSemaine.date)}{matchSemaine.heure ? ` à ${matchSemaine.heure}` : ''}
        </LigneAlerte>
      )}

      {matchsHoraireChange.map(m => (
        <LigneAlerte
          key={`match_horaire_${m.id}_${m.updated_at}`}
          couleur={colors.accent.amber}
          onValider={() => masquer(`match_horaire_${m.id}_${m.updated_at}`)}
        >
          Horaire modifié · match {m.domicile ? 'vs' : '@'} {m.adversaire || ''} du {jourCourt(m.date)}, désormais {m.heure ? `à ${m.heure}` : 'sans horaire'}
        </LigneAlerte>
      ))}
    </Carte>
  )
}

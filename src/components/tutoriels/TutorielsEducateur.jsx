import { useColors } from '../../lib/theme'
import TutorielModal from './TutorielModal'

// Tutoriels du dashboard éducateur : Mon équipe (ajout des joueurs), création
// de séance, calendrier de compétition. Chaque étape est illustrée par une
// maquette simplifiée de l'écran réel (mêmes libellés que les boutons de
// l'app), pas par une capture — elle suit ainsi le thème clair/sombre et ne
// devient pas fausse au moindre changement de mise en page.

// ── Briques de maquette ─────────────────────────────────────────────────────
function Bouton({ children, plein, couleur, actif }) {
  const colors = useColors()
  const c = couleur || colors.accent.green
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap',
      background: plein ? c : 'transparent', color: plein ? colors.black : colors.text.secondary,
      border: plein ? 'none' : `1px solid ${colors.border.default}`,
      boxShadow: actif ? `0 0 0 3px ${c}55, 0 0 0 6px ${c}22` : 'none',
    }}>{children}</span>
  )
}

function Champ({ label, valeur, large }) {
  const colors = useColors()
  return (
    <div style={{ gridColumn: large ? '1 / -1' : undefined, minWidth: 0 }}>
      <p style={{ margin: '0 0 3px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: colors.text.faint }}>{label}</p>
      <div style={{ padding: '6px 9px', borderRadius: '7px', border: `1px solid ${colors.border.default}`, background: colors.background.surface, fontSize: '12px', color: valeur ? colors.text.primary : colors.text.disabled, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{valeur || '—'}</div>
    </div>
  )
}

function Carte({ titre, texte, couleur, icone }) {
  const colors = useColors()
  return (
    <div style={{ flex: 1, minWidth: 0, padding: '12px', borderRadius: '12px', background: colors.background.surface, border: `1px solid ${couleur}55` }}>
      <span style={{ width: '30px', height: '30px', borderRadius: '9px', background: couleur + '22', color: couleur, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>{icone}</span>
      <p style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: colors.text.primary }}>{titre}</p>
      <p style={{ margin: '3px 0 0', fontSize: '11px', lineHeight: 1.4, color: colors.text.faint }}>{texte}</p>
    </div>
  )
}

function Fleche() {
  const colors = useColors()
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.text.faint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
}

const IcoMain = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
const IcoTableur = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /></svg>
const IcoCrayon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>
const IcoFichier = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
const IcoPhoto = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>
const IcoCalendrier = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
const IcoCroix = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
const IcoOk = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>

// ── Mon équipe ─────────────────────────────────────────────────────────────
function VisuelDeuxFacons() {
  const colors = useColors()
  return (
    <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
      <Carte titre="Un par un" texte="Formulaire « Ajouter un joueur »" couleur={colors.accent.green} icone={<IcoMain />} />
      <Carte titre="Tous d'un coup" texte="Fichier Excel ou CSV" couleur={colors.accent.blue} icone={<IcoTableur />} />
    </div>
  )
}

function VisuelBoutonsEquipe({ actif }) {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
      <Bouton actif={actif === 'template'}>Template</Bouton>
      <Bouton actif={actif === 'import'}>Importer Excel/CSV</Bouton>
      <Bouton plein actif={actif === 'ajouter'}>+ Ajouter un joueur</Bouton>
    </div>
  )
}

function VisuelFormulaireJoueur() {
  return (
    <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <VisuelBoutonsEquipe actif="ajouter" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Champ label="Prénom *" valeur="Lucas" />
        <Champ label="Nom *" valeur="Martin" />
        <Champ label="Poste" valeur="Milieu central" />
        <Champ label="N° maillot" valeur="8" />
        <Champ label="Date de naissance" valeur="12/04/2013" />
        <Champ label="Licence FFF" valeur="2545XXXXXX" />
      </div>
    </div>
  )
}

function VisuelTableur() {
  const colors = useColors()
  const lignes = [
    ['Prenom', 'Nom', 'Poste', 'Categorie', 'Numero Maillot', 'Date Naissance'],
    ['Lucas', 'Martin', 'Milieu', 'U13', '8', '2013-04-12'],
    ['Inès', 'Benali', 'Gardien', 'U13', '1', '2013-09-02'],
    ['Noah', 'Rossi', 'Attaquant', 'U13', '9', '2014-01-20'],
  ]
  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: '11px', margin: '0 auto', background: colors.background.surface }}>
        <tbody>
          {lignes.map((l, i) => (
            <tr key={i}>
              {l.map((c, j) => (
                <td key={j} style={{ border: `1px solid ${colors.border.default}`, padding: '5px 8px', whiteSpace: 'nowrap', fontWeight: i === 0 ? 800 : 400, color: i === 0 ? colors.accent.blue : colors.text.secondary, background: i === 0 ? colors.accent.blue + '14' : 'transparent' }}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function VisuelApercuImport() {
  const colors = useColors()
  return (
    <div style={{ width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <VisuelBoutonsEquipe actif="import" />
      <div style={{ borderRadius: '10px', border: `1px solid ${colors.border.default}`, background: colors.background.surface, padding: '10px 12px' }}>
        <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 800, color: colors.text.primary }}>3 joueurs détectés</p>
        {['Lucas Martin · Milieu', 'Inès Benali · Gardien', 'Noah Rossi · Attaquant'].map(n => (
          <p key={n} style={{ margin: '0 0 4px', fontSize: '12px', color: colors.text.secondary, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: colors.accent.green }}><IcoOk /></span>{n}
          </p>
        ))}
        <div style={{ marginTop: '8px' }}><Bouton plein actif>Importer</Bouton></div>
      </div>
    </div>
  )
}

// Bloc d'invitation en bas de la carte d'un joueur (cf. blocInvitationJoueur
// dans DashboardEducateur) : champ email + « Inviter », puis les deux statuts.
function VisuelInvitation() {
  const colors = useColors()
  const statut = (couleur, texte) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, color: couleur, background: couleur + '1a', padding: '3px 9px', borderRadius: '6px' }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: couleur }} />{texte}
    </span>
  )
  return (
    <div style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ borderRadius: '12px', border: `1px solid ${colors.border.default}`, background: colors.background.surface, padding: '12px' }}>
        <p style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: colors.text.primary }}>Lucas Martin</p>
        <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.faint }}>Milieu central · n° 8</p>
        <div style={{ display: 'flex', gap: '6px', marginTop: '10px', paddingTop: '8px', borderTop: `1px solid ${colors.border.subtle}` }}>
          <div style={{ flex: 1, minWidth: 0, padding: '5px 9px', borderRadius: '6px', border: `1px solid ${colors.accent.blue}`, background: colors.background.base, fontSize: '11px', color: colors.text.primary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>lucas.martin@gmail.com</div>
          <Bouton plein couleur={colors.accent.blue} actif>Inviter</Bouton>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {statut(colors.accent.amber, 'Invitation envoyée')}
        <Fleche />
        {statut(colors.accent.green, 'Compte lié')}
      </div>
    </div>
  )
}

export function TutorielEquipe({ onFermer }) {
  const colors = useColors()
  const etapes = [
    {
      titre: 'Ton équipe est créée, ajoute tes joueurs',
      texte: "Deux façons de remplir ton effectif : les ajouter un par un, ou tous d'un coup à partir d'un fichier Excel ou CSV. Tu peux combiner les deux. Ensuite, invite chaque joueur par email.",
      visuel: <VisuelDeuxFacons />,
    },
    {
      titre: 'Ajouter un joueur à la main',
      texte: 'Dans Mon équipe, clique sur « + Ajouter un joueur ».',
      points: [
        'Renseigne au minimum le prénom et le nom.',
        'Complète si tu veux le poste, le numéro de maillot, la date de naissance et le numéro de licence FFF.',
        'Valide avec « Ajouter » : le joueur apparaît tout de suite dans ton effectif.',
      ],
      visuel: <VisuelFormulaireJoueur />,
    },
    {
      titre: 'Préparer ton fichier Excel ou CSV',
      texte: 'Clique sur « Template » pour télécharger le modèle. Une ligne par joueur, une colonne par information.',
      points: [
        'Colonnes obligatoires : Prenom et Nom.',
        'Colonnes facultatives : Poste, Categorie, Numero Maillot, Date Naissance, Numero Licence.',
        'Tu peux aussi partir de ton propre fichier, tant que la première ligne contient ces noms de colonnes.',
      ],
      astuce: "Sur Mac avec Numbers : Fichier → Exporter vers → Excel ou CSV avant d'importer.",
      visuel: <VisuelTableur />,
    },
    {
      titre: 'Importer le fichier',
      texte: 'Clique sur « Importer Excel/CSV » et choisis ton fichier (.xlsx, .xls ou .csv).',
      points: [
        "Un aperçu affiche les joueurs trouvés : vérifie qu'il n'en manque pas.",
        "Confirme l'import : tous les joueurs sont ajoutés à l'équipe sélectionnée.",
        'Tu pourras ensuite modifier chaque joueur (photo, poste...) depuis sa fiche.',
      ],
      visuel: <VisuelApercuImport />,
    },
    {
      titre: 'Invite tes joueurs par email',
      texte: "Une fois tes joueurs ajoutés, invite-les à créer leur compte : c'est ce qui les relie à ton équipe (sondages de présence, ressentis de séance, stats).",
      points: [
        'Sur la carte du joueur (ou dans son profil), saisis son email dans le champ « Email du joueur... ».',
        'Clique sur « Inviter » : il reçoit un email pour créer son compte.',
        "La carte affiche « Invitation envoyée », puis « Compte lié » dès qu'il a accepté.",
      ],
      astuce: "Pas de mail reçu ? Utilise « Renvoyer » sur la carte, ou « Corriger l'email » en cas de faute de frappe.",
      visuel: <VisuelInvitation />,
    },
  ]
  return <TutorielModal titre="Mon équipe" etapes={etapes} accent={colors.accent.green} onFermer={onFermer} />
}

// ── Planning des entraînements ─────────────────────────────────────────────
function VisuelPlanificateur() {
  const colors = useColors()
  const jours = [['Lun', null], ['Mar', '19:00'], ['Mer', null], ['Jeu', '19:00'], ['Ven', '18:30']]
  return (
    <div style={{ width: '100%', maxWidth: '430px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {jours.map(([j, h]) => (
          <span key={j} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '5px 9px', borderRadius: '9px', border: `2px solid ${h ? colors.accent.blue : colors.border.default}`, background: h ? colors.accent.blue + '1a' : 'transparent' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: h ? colors.accent.blue : colors.text.faint }}>{j}</span>
            {h && <span style={{ fontSize: '10px', color: colors.text.secondary, fontVariantNumeric: 'tabular-nums' }}>{h}</span>}
          </span>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Champ label="Début de saison" valeur="01/09/2026" />
        <Champ label="Fin de saison" valeur="30/06/2027" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{ fontSize: '12px', color: colors.text.secondary }}><b style={{ color: colors.accent.blue }}>128</b> séances seront créées</span>
        <Bouton plein couleur={colors.accent.blue} actif>Générer les séances</Bouton>
      </div>
    </div>
  )
}

function VisuelSeanceUnique() {
  return (
    <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Bouton plein actif>+ Séance</Bouton></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Champ label="Date" valeur="24/10/2026" />
        <Champ label="Heure (optionnel)" valeur="19:00" />
        <Champ label="Thème (optionnel)" valeur="Jeu de transition" />
        <Champ label="Lieu" valeur="Stade municipal" />
      </div>
    </div>
  )
}

function VisuelSondage() {
  const colors = useColors()
  const lignes = [['Mar 20', 'Entraînement 19:00', 16, 3, 2], ['Jeu 22', 'Entraînement 19:00', 14, 4, 3], ['Sam 24', 'Match vs US Cagnes', 15, 2, 4]]
  return (
    <div style={{ width: '100%', maxWidth: '420px', borderRadius: '12px', border: `1px solid ${colors.border.default}`, background: colors.background.surface, padding: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <p style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: colors.text.primary }}>Sondage de présence — semaine</p>
        <span style={{ fontSize: '11px', color: colors.text.faint }}>‹ 19 – 25 oct. ›</span>
      </div>
      {lignes.map(([d, titre, presents, absents, sansReponse]) => (
        <div key={d} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderTop: `1px solid ${colors.border.subtle}` }}>
          <span style={{ width: '46px', fontSize: '11px', fontWeight: 700, color: colors.text.secondary }}>{d}</span>
          <span style={{ flex: 1, minWidth: 0, fontSize: '12px', color: colors.text.primary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{titre}</span>
          <span style={{ fontSize: '11px', fontWeight: 700, color: colors.accent.green }}>{presents} P</span>
          <span style={{ fontSize: '11px', fontWeight: 700, color: colors.accent.red }}>{absents} A</span>
          <span style={{ fontSize: '11px', fontWeight: 700, color: colors.text.faint }}>{sansReponse} ?</span>
        </div>
      ))}
    </div>
  )
}

function VisuelPresences() {
  const colors = useColors()
  const statuts = [['Présent', colors.accent.green, true], ['Convoqué', colors.accent.blue], ['Absent', colors.accent.red], ['Blessé', colors.accent.orange || '#f97316'], ['Malade', colors.accent.purple || '#a855f7']]
  return (
    <div style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {[['Lucas Martin', 0], ['Inès Benali', 2]].map(([nom, actif]) => (
        <div key={nom} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '10px', background: colors.background.surface, border: `1px solid ${colors.border.default}`, flexWrap: 'wrap' }}>
          <span style={{ flex: 1, minWidth: '90px', fontSize: '12px', fontWeight: 700, color: colors.text.primary }}>{nom}</span>
          {statuts.map(([label, c], i) => (
            <span key={label} style={{ padding: '3px 7px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, color: i === actif ? colors.black : c, background: i === actif ? c : c + '1a' }}>{label}</span>
          ))}
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ flex: 1, height: '7px', borderRadius: '4px', overflow: 'hidden', display: 'flex', background: colors.background.raised }}>
          <div style={{ width: '82%', background: colors.accent.green }} /><div style={{ width: '6%', background: colors.accent.blue }} /><div style={{ width: '6%', background: colors.accent.red }} />
        </div>
        <span style={{ fontSize: '11px', fontWeight: 800, color: colors.accent.green }}>19/21</span>
      </div>
    </div>
  )
}

function VisuelActionsSeance() {
  const colors = useColors()
  const actions = [
    [colors.accent.amber, <svg key="e" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>, 'Ressenti RPE'],
    [colors.accent.blue, <IcoCrayon key="c" />, 'Modifier'],
    [colors.accent.red, <svg key="t" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /></svg>, 'Supprimer'],
  ]
  return (
    <div style={{ width: '100%', maxWidth: '440px', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '12px', background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderLeft: `3px solid ${colors.accent.green}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: colors.text.primary }}>Entraînement · Mar 20 oct.</p>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '5px', padding: '3px 8px', borderRadius: '6px', border: `1px solid ${colors.accent.blue}55`, color: colors.accent.blue, fontSize: '11px', fontWeight: 700 }}><IcoFichier /> Voir la fiche</span>
      </div>
      {actions.map(([c, ico, label]) => (
        <span key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
          <span style={{ width: '30px', height: '30px', borderRadius: '8px', border: `1px solid ${colors.border.default}`, color: c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{ico}</span>
          <span style={{ fontSize: '9px', color: colors.text.faint }}>{label}</span>
        </span>
      ))}
    </div>
  )
}

export function TutorielPlanning({ onFermer }) {
  const colors = useColors()
  const etapes = [
    {
      titre: 'Ton planning d’entraînements',
      texte: 'Le Planning regroupe toutes tes séances d’entraînement. Deux façons de les créer :',
      points: [
        '« Planifier la saison » : toutes les séances de l’année générées en un clic.',
        '« + Séance » : une séance ponctuelle (rattrapage, séance en plus...).',
      ],
      astuce: 'L’onglet « Prochaine séance » affiche directement la séance à venir ; « Mes séances » les liste toutes, mois par mois.',
      visuel: (
        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
          <Carte titre="Toute la saison" texte="« Planifier la saison »" couleur={colors.accent.blue} icone={<IcoCalendrier />} />
          <Carte titre="Une séance" texte="« + Séance »" couleur={colors.accent.green} icone={<IcoCrayon />} />
        </div>
      ),
    },
    {
      titre: 'Planifier toute la saison',
      texte: 'Clique sur « Planifier la saison ».',
      points: [
        'Sélectionne tes jours d’entraînement, chacun avec son heure.',
        'Indique le début et la fin de la saison (et un thème par défaut si tu veux).',
        'Le nombre de séances à créer s’affiche : valide avec « Générer les séances ».',
      ],
      astuce: 'Les dates qui ont déjà une séance ne sont pas recréées : tu peux relancer la planification sans doublon.',
      visuel: <VisuelPlanificateur />,
    },
    {
      titre: 'Ajouter une séance ponctuelle',
      texte: 'Clique sur « + Séance », choisis la date et, si tu veux, l’heure, le thème et le lieu.',
      astuce: '« Importer une séance archivée » rattache directement une fiche de séance déjà rédigée.',
      visuel: <VisuelSeanceUnique />,
    },
    {
      titre: 'Le sondage de présence',
      texte: 'Tes joueurs répondent depuis leur application pour les entraînements et matchs de la semaine : présent, absent, blessé ou malade.',
      points: [
        'Pour chaque événement : nombre de présents (P), d’absents (A) et de joueurs sans réponse (?).',
        'Clique sur un événement pour voir qui a répondu quoi.',
        'Utilise les flèches pour passer d’une semaine à l’autre.',
      ],
      visuel: <VisuelSondage />,
    },
    {
      titre: 'Saisir les présences',
      texte: 'Clique sur une séance pour noter chaque joueur : présent, convoqué, absent, blessé ou malade.',
      points: [
        'La barre colorée et le compteur (ex. 19/21) résument la séance.',
        'Ces présences alimentent automatiquement les statistiques de ton équipe.',
      ],
      visuel: <VisuelPresences />,
    },
    {
      titre: 'Les actions sur une séance',
      texte: 'Sur chaque séance :',
      points: [
        'Étoile : demander le ressenti RPE des joueurs : effort perçu noté de 0 à 10, plaisir de 1 à 5 et quelques mots sur ce qu’ils ont appris. Résultats dans Mon équipe → Stats équipe → Ressenti RPE.',
        '« Voir la fiche » : ouvrir la fiche rattachée (la croix la détache).',
        'Crayon : modifier la séance. Corbeille : la supprimer.',
        'Flèche : afficher le détail des présences.',
      ],
      visuel: <VisuelActionsSeance />,
    },
  ]
  return <TutorielModal titre="Planning des entraînements" etapes={etapes} accent={colors.accent.blue} onFermer={onFermer} />
}

// ── Création de séance ─────────────────────────────────────────────────────
function VisuelTroisFacons() {
  const colors = useColors()
  return (
    <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
      <Carte titre="Rédiger une fiche" texte="Créer la séance dans l'app" couleur={colors.accent.blue} icone={<IcoCrayon />} />
      <Carte titre="Enregistrer une séance" texte="Lien vidéo ou fichier déjà prêt" couleur={colors.accent.green} icone={<IcoFichier />} />
      <Carte titre="Scanner" texte="Photo d'une fiche papier" couleur={colors.accent.purple || colors.accent.blue} icone={<IcoPhoto />} />
    </div>
  )
}

function VisuelEnteteFiche() {
  const colors = useColors()
  return (
    <div style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Champ label="Thème" valeur="Conservation du ballon" large />
        <Champ label="Date" valeur="24/10/2026" />
        <Champ label="Catégorie" valeur="U13" />
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {['Libre', 'BMF', 'BEF', 'DEF'].map((m, i) => (
          <span key={m} style={{ flex: 1, textAlign: 'center', padding: '6px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, border: i === 1 ? `2px solid ${colors.accent.green}` : `1px solid ${colors.border.default}`, color: i === 1 ? colors.accent.green : colors.text.faint, background: i === 1 ? colors.accent.green + '18' : 'transparent' }}>{m}</span>
        ))}
      </div>
    </div>
  )
}

function VisuelProcede() {
  const colors = useColors()
  return (
    <div style={{ width: '100%', maxWidth: '420px', borderRadius: '12px', border: `1px solid ${colors.border.default}`, background: colors.background.surface, padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <p style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: colors.text.primary }}>Procédé 1 · Jeu de conservation 5c5</p>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <Bouton couleur="#a78bfa" actif>Ajouter un schéma</Bouton>
        <Bouton>Importer un procédé</Bouton>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Champ label="Durée" valeur="15 min" />
        <Champ label="Joueurs" valeur="10" />
        <Champ label="But" valeur="8 passes = 1 point" large />
      </div>
    </div>
  )
}

function VisuelEnregistrerFiche() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
      <Bouton plein actif>Sauvegarder la fiche</Bouton>
      <Fleche />
      <Bouton>Imprimer la fiche</Bouton>
      <Bouton>Voir la fiche</Bouton>
    </div>
  )
}

function VisuelScanFiche() {
  const colors = useColors()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
      <div style={{ display: 'flex', gap: '5px' }}>
        {['Libre', 'BMF', 'BEF', 'DEF'].map(m => <Bouton key={m} couleur={colors.accent.blue}>{m}</Bouton>)}
      </div>
      <Fleche />
      <span style={{ color: colors.text.faint }}><IcoCrayon /></span>
      <Fleche />
      <Bouton plein couleur={colors.accent.blue} actif><IcoPhoto /> Scanner</Bouton>
    </div>
  )
}

export function TutorielSeance({ onFermer }) {
  const colors = useColors()
  const etapes = [
    {
      titre: 'Trois façons de créer une séance',
      texte: 'Dans Création entraînement → Séances, choisis en haut comment tu veux créer ta séance.',
      points: [
        "Rédiger une fiche : tu construis la séance directement dans l'app.",
        'Enregistrer une séance : tu ajoutes une séance déjà prête (lien vidéo ou fichier).',
        "Scanner : tu prends en photo une fiche papier, l'IA la remplit pour toi.",
      ],
      visuel: <VisuelTroisFacons />,
    },
    {
      titre: "Rédiger une fiche : l'en-tête",
      texte: 'Renseigne le thème, la date, la catégorie, le nombre de joueurs, la durée et l’objectif de la séance.',
      astuce: "En formation ? Choisis BMF, BEF ou DEF : la fiche prend le format officiel du diplôme, prêt à imprimer.",
      visuel: <VisuelEnteteFiche />,
    },
    {
      titre: 'Les procédés',
      texte: 'Chaque bloc correspond à un exercice ou une situation de ta séance.',
      points: [
        'Donne-lui un titre, une durée, un nombre de joueurs, un but et des consignes.',
        '« Ajouter un schéma » ouvre le Tactipad pour dessiner la situation.',
        '« Importer un procédé » reprend un exercice de ta bibliothèque.',
        '« + Ajouter un procédé » ajoute un bloc à la séance.',
      ],
      visuel: <VisuelProcede />,
    },
    {
      titre: 'Sauvegarder, imprimer, retrouver',
      texte: 'Clique sur « Sauvegarder la fiche ». Si un entraînement est prévu à la même date dans ton Planning, la fiche y est rattachée automatiquement : « Voir la fiche » apparaît sur la séance.',
      astuce: "« Imprimer la fiche » sort la fiche telle qu'elle apparaît dans l'aperçu (format officiel si BMF, BEF ou DEF).",
      visuel: <VisuelEnregistrerFiche />,
    },
    {
      titre: 'Scanner une fiche papier',
      texte: 'Tu préfères écrire à la main ?',
      points: [
        'Dans Scanner, télécharge une fiche vierge (Libre, BMF, BEF ou DEF).',
        'Remplis-la à la main, puis prends-la en photo bien à plat.',
        "L'IA remplit la fiche : relis chaque champ avant de sauvegarder.",
      ],
      visuel: <VisuelScanFiche />,
    },
  ]
  return <TutorielModal titre="Créer une séance" etapes={etapes} accent={colors.accent.blue} onFermer={onFermer} />
}

// ── Compétition : calendrier ───────────────────────────────────────────────
// Vraie capture d'écran d'un calendrier (application FFF, fournie par
// l'utilisateur) : exactement ce que l'éducateur doit envoyer. Affichée dans
// un cadre de téléphone, défilable pour voir toute la capture.
function VisuelCaptureCalendrier() {
  const colors = useColors()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <p style={{ margin: 0, fontSize: '10px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: colors.text.faint }}>Exemple de capture</p>
      <div style={{ width: '190px', height: '300px', overflowY: 'auto', borderRadius: '22px', border: `5px solid ${colors.border.strong}`, background: '#0b1630', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
        <img src="/tuto/calendrier-fff.jpg" alt="Exemple de capture d'écran du calendrier de l'équipe dans l'application FFF" style={{ width: '100%', display: 'block' }} />
      </div>
    </div>
  )
}

function VisuelUneParUne() {
  const colors = useColors()
  return (
    <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <Bouton actif couleur={colors.accent.blue}>Scanner</Bouton>
        <Bouton plein>+ Match</Bouton>
      </div>
      <div style={{ width: '100%', border: `2px dashed ${colors.border.default}`, borderRadius: '10px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ position: 'relative', width: '52px', height: '52px', borderRadius: '8px', background: '#fff', border: '1px solid #cbd5e1', flexShrink: 0, overflow: 'hidden' }}>
          <div style={{ height: '12px', background: '#1b2f8e' }} />
          {[0, 1, 2].map(k => <div key={k} style={{ height: '4px', margin: '6px 6px 0', background: '#cbd5e1', borderRadius: '2px' }} />)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: colors.text.primary }}>1 capture</p>
          <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.faint }}>Une seule à la fois</p>
        </div>
        <Bouton plein actif>Extraire les matchs (1 photo)</Bouton>
      </div>
    </div>
  )
}

function VisuelVerification() {
  const colors = useColors()
  const lignes = [
    { d: '6 sept.', h: '15:00', j: 'J1', m: 'AS Cannes vs Gap Foot 05', ok: true },
    { d: '13 sept.', h: '11:00', j: 'J2', m: 'USCA Football 2 vs AS Cannes', ok: true },
    { d: '27 sept.', h: '15:00', j: 'J3', m: 'AS Cannes vs SMUC', ok: false },
  ]
  return (
    <div style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {lignes.map(l => (
        <div key={l.j} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 10px', borderRadius: '9px', background: colors.background.surface, border: `1px solid ${l.ok ? colors.border.default : colors.accent.red}` }}>
          <div style={{ minWidth: '54px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: colors.text.primary }}>{l.d}</p>
            <p style={{ margin: 0, fontSize: '9px', color: colors.text.faint }}>{l.h} · <span style={{ color: colors.accent.green, fontWeight: 700 }}>{l.j}</span></p>
          </div>
          <p style={{ margin: 0, flex: 1, minWidth: 0, fontSize: '12px', fontWeight: 700, color: colors.text.primary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.m}</p>
          <span style={{ width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: l.ok ? colors.accent.green : colors.accent.red, background: (l.ok ? colors.accent.green : colors.accent.red) + '1f' }}>{l.ok ? <IcoOk /> : <IcoCroix />}</span>
        </div>
      ))}
      <p style={{ margin: '4px 0 0', fontSize: '11px', color: colors.accent.red, textAlign: 'center' }}>Heure lue 15:00 au lieu de 11:00 sur la capture : supprime la ligne, ajoute ce match avec « + Match ».</p>
    </div>
  )
}

function VisuelPublier() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
      <Bouton plein actif>Publier (3)</Bouton>
      <Fleche />
      <Bouton>Retirer la capture</Bouton>
      <Fleche />
      <Bouton>Capture suivante</Bouton>
    </div>
  )
}

function VisuelMatchManuel() {
  return (
    <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Bouton plein actif>+ Match</Bouton></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Champ label="Adversaire" valeur="US Cagnes" large />
        <Champ label="Date" valeur="08/11/2026" />
        <Champ label="Heure" valeur="14:00" />
        <Champ label="Domicile / Extérieur" valeur="Domicile" />
        <Champ label="Compétition" valeur="Championnat" />
      </div>
    </div>
  )
}

export function TutorielCompetition({ onFermer }) {
  const colors = useColors()
  const etapes = [
    {
      titre: 'Planifier ton calendrier de matchs',
      texte: 'Dans Compétition → Calendrier, deux façons de programmer tes matchs :',
      points: [
        '« + Match » : tu ajoutes chaque match à la main.',
        "« Scanner » : tu envoies des captures d'écran de ton calendrier FFF et l'IA crée les matchs.",
      ],
      visuel: (
        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
          <Carte titre="À la main" texte="Bouton « + Match »" couleur={colors.accent.green} icone={<IcoCalendrier />} />
          <Carte titre="Par capture d'écran" texte="Bouton « Scanner »" couleur={colors.accent.blue} icone={<IcoPhoto />} />
        </div>
      ),
    },
    {
      titre: 'Ajouter un match à la main',
      texte: 'Clique sur « + Match », puis renseigne adversaire, date, heure, domicile ou extérieur et compétition.',
      astuce: 'Un match à l’extérieur crée automatiquement une ligne dans Déplacements (si ton club est affilié).',
      visuel: <VisuelMatchManuel />,
    },
    {
      titre: "La bonne capture d'écran",
      texte: 'Sur le site ou l’application de la FFF (ou de ton district), ouvre le calendrier de ton équipe et fais une capture d’écran.',
      points: [
        'On doit lire clairement la date, l’heure et les deux équipes de chaque match.',
        'Fais défiler pour que les matchs soient bien visibles : une bannière en bas de l’écran ne gêne pas tant qu’elle ne cache aucun match.',
        'Mieux vaut plusieurs captures nettes qu’une seule capture minuscule.',
      ],
      visuel: <VisuelCaptureCalendrier />,
    },
    {
      titre: 'Envoie les captures une par une',
      texte: 'Clique sur « Scanner », ajoute une seule capture, puis « Extraire les matchs ».',
      astuce: "Une capture à la fois : l'analyse est plus fiable, et tu peux comparer facilement chaque ligne avec l'image d'origine.",
      visuel: <VisuelUneParUne />,
    },
    {
      titre: "Vérifie l'analyse de l'IA",
      texte: 'Compare chaque match extrait avec ta capture avant de publier :',
      points: [
        'Date et heure.',
        'Les deux équipes, et qui reçoit (domicile ou extérieur).',
        'Une ligne fausse ? Supprime-la avec la croix, et ajoute ce match avec « + Match ».',
        "Un match sans date n'est pas publié.",
      ],
      visuel: <VisuelVerification />,
    },
    {
      titre: 'Publie, puis passe à la capture suivante',
      texte: '« Publier » ajoute les matchs à tes Matchs à venir. Retire ensuite la capture traitée (croix rouge sur la miniature) et recommence avec la suivante.',
      astuce: 'Après publication, vérifie domicile / extérieur sur chaque match : au besoin, corrige-le avec « Modifier le match ».',
      visuel: <VisuelPublier />,
    },
  ]
  return <TutorielModal titre="Calendrier de compétition" etapes={etapes} accent={colors.accent.blue} onFermer={onFermer} />
}

// ── Compétition : résultats (scan de la feuille de match, notes) ─────────────
// Vraie capture de composition (application FFF, fournie par l'utilisateur) :
// score, titulaires, remplaçants, buts, cartons et changements.
function VisuelCaptureComposition() {
  const colors = useColors()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <p style={{ margin: 0, fontSize: '10px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: colors.text.faint }}>Exemple de capture</p>
      <div style={{ width: '190px', height: '300px', overflowY: 'auto', borderRadius: '22px', border: `5px solid ${colors.border.strong}`, background: '#0b1630', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
        <img src="/tuto/composition-fff.jpg" alt="Exemple de capture d'écran de la composition d'un match dans l'application FFF" style={{ width: '100%', display: 'block' }} />
      </div>
    </div>
  )
}

function VisuelAnalyseFeuille() {
  const colors = useColors()
  return (
    <div style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Champ label="Adversaire" valeur="USCA Football" large />
        <Champ label="Score (nous)" valeur="1" />
        <Champ label="Score (eux)" valeur="1" />
      </div>
      <div style={{ borderRadius: '10px', border: `1px solid ${colors.border.default}`, background: colors.background.surface, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {[['Lhyam F.', '1 but'], ['Souleymane T.', 'carton jaune'], ['Mathis B.', 'carton jaune']].map(([n, d]) => (
          <p key={n} style={{ margin: 0, fontSize: '12px', color: colors.text.secondary, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: colors.accent.green }}><IcoOk /></span><b style={{ color: colors.text.primary }}>{n}</b> · {d}
          </p>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Bouton plein actif>Enregistrer le match et toutes les stats</Bouton></div>
    </div>
  )
}

function VisuelFeuilleStats() {
  const colors = useColors()
  const lignes = [['Lhyam F.', '90', '1', '0', false], ['Rayan A.', '90', '0', '1', false], ['Souleymane T.', '75', '0', '0', true]]
  const cell = { padding: '5px 4px', borderRadius: '6px', border: `1px solid ${colors.border.default}`, background: colors.background.surface, fontSize: '11px', textAlign: 'center', color: colors.text.primary }
  return (
    <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr repeat(3, 0.6fr) 0.4fr', gap: '6px', fontSize: '10px', fontWeight: 700, color: colors.text.faint, textTransform: 'uppercase' }}>
        <span>Joueur</span><span style={{ textAlign: 'center' }}>Min</span><span style={{ textAlign: 'center' }}>Buts</span><span style={{ textAlign: 'center' }}>PD</span><span />
      </div>
      {lignes.map(([n, min, buts, pd, jaune]) => (
        <div key={n} style={{ display: 'grid', gridTemplateColumns: '1.6fr repeat(3, 0.6fr) 0.4fr', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: colors.text.primary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n}</span>
          <span style={cell}>{min}</span><span style={cell}>{buts}</span><span style={cell}>{pd}</span>
          <span style={{ width: '10px', height: '14px', borderRadius: '2px', background: colors.accent.amber, opacity: jaune ? 1 : 0.2, justifySelf: 'center' }} />
        </div>
      ))}
    </div>
  )
}

function VisuelNotation() {
  const colors = useColors()
  return (
    <div style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', gap: '6px' }}>
        <span style={{ padding: '5px 14px', borderRadius: '20px', background: colors.accent.green, color: colors.black, fontSize: '11px', fontWeight: 700 }}>Joueurs (14)</span>
        <span style={{ padding: '5px 14px', borderRadius: '20px', background: colors.background.raised, color: colors.text.faint, fontSize: '11px', fontWeight: 700 }}>Équipe</span>
      </div>
      <div style={{ borderRadius: '10px', border: `1px solid ${colors.accent.green}`, background: colors.background.surface, padding: '10px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: colors.text.primary }}>Lhyam F.</span>
          <span style={{ fontSize: '18px', fontWeight: 800, color: colors.accent.green }}>8/10</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop: '8px' }}>
          {[['Technique', 8], ['Physique', 7], ['Mental', 9], ['Tactique', 8]].map(([c, v]) => (
            <div key={c}><p style={{ margin: 0, fontSize: '9px', color: colors.text.faint, textTransform: 'uppercase' }}>{c}</p><div style={{ marginTop: '2px', padding: '3px 6px', borderRadius: '5px', background: colors.background.raised, fontSize: '11px', color: colors.text.primary }}>{v}</div></div>
          ))}
        </div>
        <p style={{ margin: '8px 0 0', fontSize: '11px', color: colors.text.faint, fontStyle: 'italic' }}>Très bon pressing, but décisif.</p>
      </div>
    </div>
  )
}

function VisuelVisibilite() {
  const colors = useColors()
  const inter = (label, actif) => (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${colors.border.default}`, background: colors.background.surface }}>
      <span>
        <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: colors.text.primary }}>{label}</span>
        <span style={{ display: 'block', fontSize: '10px', marginTop: '2px', color: actif ? colors.accent.green : colors.text.faint }}>{actif ? 'Visibles par les joueurs' : 'Masqués aux joueurs'}</span>
      </span>
      <span style={{ width: '34px', height: '20px', borderRadius: '20px', background: actif ? colors.accent.green : colors.border.strong, position: 'relative', flexShrink: 0 }}>
        <span style={{ position: 'absolute', top: '3px', left: actif ? '17px' : '3px', width: '14px', height: '14px', borderRadius: '50%', background: '#fff' }} />
      </span>
    </div>
  )
  return <div style={{ width: '100%', maxWidth: '440px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{inter('Notes et critères', false)}{inter('Commentaires', true)}</div>
}

export function TutorielResultats({ onFermer }) {
  const colors = useColors()
  const etapes = [
    {
      titre: 'Enregistrer un résultat',
      texte: 'Trois façons d’enregistrer un match joué :',
      points: [
        'Match déjà au calendrier : « Marquer comme joué », puis score à la main ou scan de la feuille.',
        'Résultats → « Scanner » : le match est créé directement à partir d’une capture.',
        'Résultats → « + Match » : tu saisis tout à la main.',
      ],
      visuel: (
        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
          <Carte titre="Marquer comme joué" texte="Depuis le calendrier" couleur={colors.accent.green} icone={<IcoCalendrier />} />
          <Carte titre="Scanner" texte="Capture de la feuille" couleur={colors.accent.blue} icone={<IcoPhoto />} />
          <Carte titre="+ Match" texte="Saisie manuelle" couleur={colors.accent.amber} icone={<IcoCrayon />} />
        </div>
      ),
    },
    {
      titre: 'La bonne capture',
      texte: 'Dans l’application FFF, ouvre le match puis Résumé → Composition, et fais une capture d’écran.',
      points: [
        'Le score en haut, les titulaires et les remplaçants des deux équipes doivent être visibles.',
        'Les buts (ballon) et les cartons (jaune, rouge) sont lus automatiquement.',
        'Tu peux aussi photographier une feuille de match papier, bien à plat et nette.',
      ],
      visuel: <VisuelCaptureComposition />,
    },
    {
      titre: 'Scanner et vérifier',
      texte: 'Clique sur « Scanner », ajoute la capture, puis « Analyser avec l’IA ». L’IA lit le score, les joueurs, les buts et les cartons, et reconnaît tes joueurs par leur nom.',
      points: [
        'Vérifie la date, l’adversaire, le score et « Match à domicile ».',
        'Si un message indique que peu de joueurs ont été reconnus, complète la liste à la main.',
        'Valide avec « Enregistrer le match et toutes les stats ».',
      ],
      visuel: <VisuelAnalyseFeuille />,
    },
    {
      titre: 'La feuille de match',
      texte: 'Clique sur un résultat pour ouvrir sa feuille de match et ajuster, joueur par joueur :',
      points: [
        'Min : minutes jouées · Buts · PD : passes décisives · CS : clean sheet.',
        'Les rectangles jaune et rouge : cartons.',
        'Clique sur « Sauvegarder » : tes statistiques d’équipe sont mises à jour.',
      ],
      visuel: <VisuelFeuilleStats />,
    },
    {
      titre: 'Noter les joueurs',
      texte: 'Sur la feuille de match, clique sur « Noter ». Onglet Joueurs :',
      points: [
        'Une note sur 10 par joueur.',
        'Des critères facultatifs, eux aussi sur 10 : Technique, Physique, Mental, Tactique.',
        'Un commentaire personnel pour chaque joueur.',
      ],
      visuel: <VisuelNotation />,
    },
    {
      titre: 'Noter l’équipe',
      texte: 'Onglet Équipe : donne une note collective à la prestation et écris un commentaire général sur le match (points positifs, axes d’amélioration, message au groupe). N’oublie pas « Sauvegarder ».',
      astuce: 'Une fois noté, le bouton passe à « Noté » : tu peux y revenir à tout moment pour modifier.',
      visuel: (
        <div style={{ width: '100%', maxWidth: '400px', borderRadius: '12px', border: `1px solid ${colors.border.default}`, background: colors.background.surface, padding: '12px' }}>
          <p style={{ margin: 0, fontSize: '11px', color: colors.text.faint }}>Note de la prestation collective</p>
          <p style={{ margin: '4px 0 8px', fontSize: '24px', fontWeight: 800, color: colors.accent.green }}>7/10</p>
          <p style={{ margin: 0, fontSize: '11px', color: colors.text.faint }}>Commentaire général sur le match</p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: colors.text.secondary }}>Bonne réaction après l’ouverture du score adverse. Être plus tranchants dans les 20 derniers mètres.</p>
        </div>
      ),
    },
    {
      titre: 'Ce que voient tes joueurs',
      texte: 'En haut de la fenêtre de notation, deux interrupteurs valables pour tout le match :',
      points: [
        '« Notes et critères » : visibles ou masqués aux joueurs.',
        '« Commentaires » : visibles ou masqués aux joueurs.',
        'Masqués, les joueurs voient « Note non communiquée » à la place.',
      ],
      visuel: <VisuelVisibilite />,
    },
  ]
  return <TutorielModal titre="Résultats et notes de match" etapes={etapes} accent={colors.accent.green} onFermer={onFermer} />
}

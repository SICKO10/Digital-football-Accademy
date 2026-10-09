// Actions IA autorisées et construction des prompts CÔTÉ SERVEUR.
// Le navigateur n'envoie que des données métier validées (transcription,
// cellules d'un fichier, paramètres de séance) — jamais un prompt ni un
// modèle : l'endpoint /api/ia ne peut pas servir de proxy LLM générique.
// Textes des prompts repris à l'identique des composants d'origine
// (AnalyseRapportRecruteur, AnalyseVideo, PlanningTerrains, DashboardEducateur).

export const MODELE = 'openai/gpt-oss-20b'

export class ErreurEntree extends Error {}

const texte = (valeur, { max, requis = false, nom }) => {
  if (valeur === undefined || valeur === null || valeur === '') {
    if (requis) throw new ErreurEntree(`Champ « ${nom} » manquant.`)
    return ''
  }
  if (typeof valeur !== 'string' && typeof valeur !== 'number') throw new ErreurEntree(`Champ « ${nom} » invalide.`)
  const v = String(valeur).trim()
  if (requis && !v) throw new ErreurEntree(`Champ « ${nom} » manquant.`)
  if (v.length > max) throw new ErreurEntree(`Champ « ${nom} » trop long (${max} caractères maximum).`)
  return v
}
const entier = (valeur, { min, max, nom, defaut }) => {
  if (valeur === undefined || valeur === null || valeur === '') return defaut
  const n = Number(valeur)
  if (!Number.isInteger(n) || n < min || n > max) throw new ErreurEntree(`Champ « ${nom} » invalide (${min} à ${max}).`)
  return n
}
const parmi = (valeur, valeurs, defaut) => (valeurs.includes(valeur) ? valeur : defaut)
const objet = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {})

const MAX_TRANSCRIPTION = 20000

function joueurObserve(brut, champClub) {
  const j = objet(brut)
  return {
    prenom: texte(j.prenom, { max: 80, nom: 'prénom' }),
    nom: texte(j.nom, { max: 80, nom: 'nom' }),
    poste: texte(j.poste, { max: 80, nom: 'poste' }),
    numero: texte(j.numero, { max: 10, nom: 'numéro' }),
    club: texte(j[champClub], { max: 120, nom: 'club' }),
    periodeMatch: parmi(j.periodeMatch, ['complet', 'premiere', 'deuxieme'], 'complet'),
    typeMatch: parmi(j.typeMatch, ['aller', 'retour'], 'aller'),
  }
}
const libellesMatch = (j) => ({
  periodeLabel: { complet: 'Match complet', premiere: '1ère mi-temps', deuxieme: '2ème mi-temps' }[j.periodeMatch] || 'Match complet',
  typeLabel: j.typeMatch === 'retour' ? 'Match retour' : 'Match aller',
})

export const ACTIONS = {
  // ── AnalyseRapportRecruteur.jsx (dashboard recruteur) ──
  rapport_recruteur: {
    profil: 'recruteur',
    valider: (e) => ({
      joueur: joueurObserve(e.joueur, 'club'),
      transcription: texte(e.transcription, { max: MAX_TRANSCRIPTION, requis: true, nom: 'transcription' }),
    }),
    construire: ({ joueur, transcription }) => {
      const { periodeLabel, typeLabel } = libellesMatch(joueur)
      const prompt = `Tu es un scout/recruteur football expert. Voici la transcription d'une observation vocale d'un recruteur sur un joueur qu'il envisage de recruter ou de suivre.

Joueur observé: ${joueur.prenom} ${joueur.nom}, Poste: ${joueur.poste}, Numéro: ${joueur.numero}
Club observé: ${joueur.club || 'non précisé'}
Type: ${typeLabel} — ${periodeLabel}

Transcription de l'observation:
${transcription}

Génère un rapport de scouting structuré en JSON avec ce format EXACT (sans markdown, juste le JSON):
{
  "sequences": [
    { "minute": "XX:XX", "description": "description de l'action ou séquence mentionnée" }
  ],
  "pointsPositifs": ["point 1", "point 2", "point 3"],
  "pointsAmeliorer": ["point 1", "point 2", "point 3"],
  "synthese": "résumé global du potentiel et du niveau du joueur",
  "recommandation": "recruter | a_suivre | pas_prioritaire",
  "note": 7.5
}

Instructions:
- Si des minutes/timestamps sont mentionnés dans la transcription, utilise-les pour les séquences
- Extrais les points forts et axes de progression de ce qui est dit, du point de vue d'un recruteur évaluant un potentiel transfert
- "recommandation" doit être choisi parmi exactement ces 3 valeurs : "recruter", "a_suivre", "pas_prioritaire", en fonction du ton global de l'observation
- La note est sur 10
- Réponds UNIQUEMENT avec le JSON brut, sans backticks ni explication`
      return { messages: [{ role: 'user', content: prompt }], params: { temperature: 0.1, max_completion_tokens: 4000 } }
    },
  },

  // ── AnalyseVideo.jsx (dashboard éducateur) ──
  analyse_video: {
    profil: 'educateur',
    valider: (e) => ({
      joueur: joueurObserve(e.joueur, 'nomClub'),
      transcription: texte(e.transcription, { max: MAX_TRANSCRIPTION, requis: true, nom: 'transcription' }),
    }),
    construire: ({ joueur, transcription }) => {
      const { periodeLabel, typeLabel } = libellesMatch(joueur)
      const prompt = `Tu es un analyste football expert. Voici la transcription d'une analyse vocale d'un éducateur/coach sur un joueur.

Joueur: ${joueur.prenom} ${joueur.nom}, Poste: ${joueur.poste}, Numéro: ${joueur.numero}
Club adverse: ${joueur.club || 'non précisé'}
Type: ${typeLabel} — ${periodeLabel}

Transcription de l'analyse:
${transcription}

Génère un rapport d'analyse football structuré en JSON avec ce format EXACT (sans markdown, juste le JSON):
{
  "sequences": [
    { "minute": "XX:XX", "description": "description de l'action ou séquence mentionnée" }
  ],
  "pointsPositifs": ["point 1", "point 2", "point 3"],
  "pointsAmeliorer": ["point 1", "point 2", "point 3"],
  "synthese": "résumé global de la performance du joueur",
  "note": 7.5
}

Instructions:
- Si des minutes/timestamps sont mentionnés dans la transcription, utilise-les pour les séquences
- Extrais les points positifs et axes d'amélioration de ce qui est dit
- La note est sur 10
- Réponds UNIQUEMENT avec le JSON brut, sans backticks ni explication`
      return { messages: [{ role: 'user', content: prompt }], params: { temperature: 0.1, max_completion_tokens: 4000 } }
    },
  },

  // ── PlanningTerrains.jsx (import Excel, mode dirigeant) ──
  import_planning: {
    profil: 'club_terrains',
    valider: (e) => {
      if (!Array.isArray(e.cellules) || e.cellules.length === 0) throw new ErreurEntree('Fichier vide ou illisible.')
      if (e.cellules.length > 150) throw new ErreurEntree('Fichier trop volumineux (150 cellules maximum).')
      const cellules = e.cellules.map((c) => {
        const o = objet(c)
        return {
          l: entier(o.l, { min: 1, max: 55, nom: 'ligne' }),
          c: entier(o.c, { min: 1, max: 1000, nom: 'colonne' }),
          v: texte(o.v, { max: 200, requis: true, nom: 'cellule' }),
        }
      })
      const terrains = Array.isArray(e.terrains) ? e.terrains.slice(0, 50).map((t) => texte(t, { max: 80, nom: 'terrain' })).filter(Boolean) : []
      return { cellules, terrains }
    },
    construire: ({ cellules, terrains }) => {
      const sample = cellules.map(({ l, c, v }) => `L${l}C${c}: "${v}"`).join('\n')
      const prompt = `Voici la liste des cellules non vides d'un planning d'occupation de terrains de football club (format Excel), sous une forme quelconque (grille par semaine, tableau croisé, liste...). Chaque ligne indique la position de la cellule (Lx = ligne x, Cy = colonne y) et sa valeur — les cellules d'une même ligne Lx sont sur la même ligne du fichier, celles d'une même colonne Cy sont dans la même colonne :

---DEBUT FICHIER---
${sample}
---FIN FICHIER---

Terrains existants dans ce club (réutilise ces noms exacts si tu les reconnais dans le fichier) : ${terrains.join(', ') || 'aucun terrain enregistré'}

RÈGLE IMPORTANTE — plusieurs équipes peuvent partager un même terrain au même horaire, sur des zones différentes :
- Foot à 11 (catégories U13, U14, U15, U16, U17, U18, U19, U20, Seniors, R1, R2...) : chaque équipe occupe UN DEMI-TERRAIN, donc au plus 2 équipes simultanées sur un terrain plein (zones "demi-A" et "demi-B").
- Foot à 5 / futsal / U6, U7, U8, U9, U10, U11, U12 : jusqu'à 5 groupes peuvent se partager un même terrain (zones "zone-1" à "zone-5").
- Si une seule équipe/groupe occupe tout le terrain à cet horaire, ou si tu ne peux pas déterminer de partage, mets zone "plein".

Extrait tous les créneaux d'occupation. Réponds UNIQUEMENT avec un tableau JSON valide, sans texte avant/après, sans balise markdown, format exact :
[{ "terrain": "...", "equipe": "...", "educateur": "...", "jour": "lundi", "heure_debut": "HH:MM", "heure_fin": "HH:MM", "zone": "plein" }]

Règles :
- "jour" en minuscules parmi lundi/mardi/mercredi/jeudi/vendredi/samedi/dimanche
- "heure_debut"/"heure_fin" au format HH:MM, chaîne vide si absent du fichier
- "educateur" = nom de l'éducateur/coach si visible, sinon chaîne vide
- "zone" parmi plein/demi-A/demi-B/zone-1/zone-2/zone-3/zone-4/zone-5, selon la règle de partage ci-dessus déduite de la catégorie de l'équipe
- Ignore les lignes/colonnes vides ou de mise en forme (titres, totaux...)
- Ne retourne que des créneaux réels trouvés dans le fichier, jamais d'exemple`
      return {
        messages: [
          { role: 'system', content: 'Réponds uniquement avec du JSON valide. Aucune réflexion préalable.' },
          { role: 'user', content: prompt },
        ],
        params: { temperature: 0.1, max_completion_tokens: 4000 },
      }
    },
  },

  // ── DashboardEducateur.jsx (génération de séance) ──
  seance_ia: {
    profil: 'educateur',
    valider: (e) => ({
      objectif: texte(e.objectif, { max: 500, requis: true, nom: 'objectif' }),
      duree: entier(e.duree, { min: 10, max: 300, nom: 'durée', defaut: 60 }),
      nb_joueurs: texte(e.nb_joueurs, { max: 20, nom: 'nombre de joueurs' }),
      categorie_age: texte(e.categorie_age, { max: 40, nom: "catégorie d'âge" }),
      niveau: texte(e.niveau, { max: 40, nom: 'niveau' }),
    }),
    construire: (f) => {
      const systemPrompt = `Tu es un entraîneur UEFA A spécialisé football de formation.
Tes séances respectent OBLIGATOIREMENT :
- La progression pédagogique : analytique → synthétique → global
- Des situations jouées réelles (jeux réduits, jeux de position)
- Des ratios travail/repos adaptés à la catégorie d'âge
- Des exercices avec opposition réelle (pas juste des passes en ligne)
- Des indicateurs de performance mesurables pour l'éducateur
- La logique interne du football (prise d'information, décision, action)

INTERDIT : exercices sans ballon majoritaires, slaloms de cônes sans opposition, passes en ligne statiques.

Génère une séance structurée en 3 phases :
1. Échauffement (20% du temps)
2. Corps de séance (65% du temps)
3. Retour au calme (15% du temps)

Chaque exercice DOIT contenir : nom, durée, organisation spatiale précise (dimensions du
terrain, dispositif), nombre de joueurs par équipe (format de jeu), règles du jeu,
consignes coach, critères de réussite mesurables, variante (facilitation ET complexification).
Réponds en JSON structuré.`
      const userPrompt = `Objectif tactique : ${f.objectif}
Durée totale : ${f.duree} minutes
Nombre de joueurs : ${f.nb_joueurs || 'non précisé'}
Catégorie d'âge : ${f.categorie_age}
Niveau : ${f.niveau}

Réponds UNIQUEMENT avec ce JSON (aucun texte hors JSON) :
{
  "phases": [
    { "phase": "echauffement", "exercices": [ {
      "nom": "...", "duree": "...",
      "format_equipes": "nombre de joueurs par équipe / format de jeu, ex: 2 équipes de 4 + 2 jokers",
      "organisation_spatiale": "dimensions du terrain et dispositif précis",
      "regles_du_jeu": "...",
      "consignes_coach": "...",
      "criteres_reussite": "indicateurs de performance mesurables",
      "variante": "variante plus facile ET variante plus difficile"
    } ] },
    { "phase": "corps_de_seance", "exercices": [ ... ] },
    { "phase": "retour_au_calme", "exercices": [ ... ] }
  ]
}`
      return {
        messages: [
          { role: 'system', content: `${systemPrompt}\nRéponds uniquement avec du JSON valide, sans aucun texte avant ou après.` },
          { role: 'user', content: userPrompt },
        ],
        params: { temperature: 0.7, max_completion_tokens: 6000 },
      }
    },
  },
}

// Sous-ensemble de translations.js, réservé à Home.jsx — la seule page
// importée statiquement (non lazy) dans App.jsx, donc la seule dont les
// imports finissent dans le bundle "index" chargé par tout visiteur, même
// anonyme. translations.js (6 langues, toutes les pages) pèse ~338 Ko
// rendus — l'y importer en entier pour 23 clés forçait ce poids sur la
// toute première page publique. Toutes les autres pages continuent d'utiliser
// translations.js normalement (aucun changement, aucun risque pour elles).
// Même format/signature que t()/LANGS de translations.js — si une clé
// supplémentaire est utilisée un jour dans Home.jsx, l'ajouter ici (copier la
// ligne depuis translations.js) plutôt que de réimporter le fichier complet.

export const LANGS = [
  { code: 'fr', label: 'Français',    flag: '🇫🇷' },
  { code: 'en', label: 'English',     flag: '🇬🇧' },
  { code: 'pt', label: 'Português',   flag: '🇧🇷' },
  { code: 'es', label: 'Español',     flag: '🇪🇸' },
  { code: 'it', label: 'Italiano',    flag: '🇮🇹' },
  { code: 'de', label: 'Deutsch',     flag: '🇩🇪' },
]

const T_HOME = {
  auth_connexion_titre:       { fr: 'Connexion',                en: 'Login',                  pt: 'Iniciar sessão',        es: 'Iniciar sesión',         it: 'Accedi',                de: 'Anmelden'             },
  home_cgu:                 { fr: 'CGU',                       en: 'Terms',                  pt: 'Termos',                es: 'Términos',               it: 'Termini',               de: 'AGB'                  },
  home_commencer:           { fr: 'Commencer',                 en: 'Get started',            pt: 'Começar',               es: 'Empezar',                it: 'Inizia',                de: 'Loslegen'             },
  home_comment_marche:      { fr: 'Comment ça marche',         en: 'How it works',           pt: 'Como funciona',         es: 'Cómo funciona',          it: 'Come funziona',         de: 'So funktioniert es'   },
  home_envoyer_video:       { fr: 'Rejoindre gratuitement',    en: 'Join for free',         pt: 'Aderir gratuitamente',  es: 'Únete gratis',           it: 'Iscriviti gratis',      de: 'Kostenlos beitreten'  },
  home_etape1_desc:         { fr: 'Crée ton profil joueur en 2 minutes', en: 'Create your player profile in 2 minutes', pt: 'Cria o teu perfil de jogador em 2 minutos', es: 'Crea tu perfil de jugador en 2 minutos', it: 'Crea il tuo profilo giocatore in 2 minuti', de: 'Erstelle dein Spielerprofil in 2 Minuten' },
  home_etape1_titre:        { fr: "Tu t'inscris",              en: 'You sign up',            pt: 'Inscreves-te',          es: 'Te registras',           it: "Ti iscrivi",            de: 'Du registrierst dich' },
  home_etape2_desc:         { fr: "Rejoins ton club et ton éducateur avec un code d'équipe", en: 'Join your club and coach with a team code', pt: 'Junta-te ao teu clube e treinador com um código de equipa', es: 'Únete a tu club y entrenador con un código de equipo', it: 'Unisciti al tuo club e al tuo allenatore con un codice squadra', de: 'Tritt deinem Verein und Trainer mit einem Teamcode bei' },
  home_etape2_titre:        { fr: 'Tu te connectes',           en: 'You connect',            pt: 'Conectas-te',           es: 'Te conectas',            it: 'Ti connetti',           de: 'Du vernetzt dich'     },
  home_etape3_desc:         { fr: 'Suis tes stats, ta présence, et les retours de ton éducateur', en: 'Track your stats, attendance, and feedback from your coach', pt: 'Acompanha as tuas estatísticas, presença e o feedback do teu treinador', es: 'Sigue tus estadísticas, tu asistencia y el feedback de tu entrenador', it: 'Segui le tue statistiche, la presenza e i feedback del tuo allenatore', de: 'Verfolge deine Statistiken, Anwesenheit und das Feedback deines Trainers' },
  home_etape3_titre:        { fr: 'Tu progresses',             en: 'You improve',            pt: 'Tu progrides',          es: 'Progresas',              it: 'Migliori',              de: 'Du entwickelst dich'  },
  home_etape4_desc:         { fr: 'Partage tes moments forts et sois visible des recruteurs', en: 'Share your highlights and get visible to scouts', pt: 'Partilha os teus melhores momentos e fica visível para os recrutadores', es: 'Comparte tus mejores momentos y hazte visible para los reclutadores', it: 'Condividi i tuoi momenti migliori e fatti notare dagli osservatori', de: 'Teile deine Highlights und werde für Scouts sichtbar' },
  home_etape4_titre:        { fr: 'Tu te fais voir',           en: 'You get noticed',        pt: 'Fazes-te notar',        es: 'Te haces notar',         it: 'Ti fai notare',         de: 'Du wirst gesehen'     },
  home_financement:         { fr: 'Financement',               en: 'Funding',                pt: 'Financiamento',         es: 'Financiación',           it: 'Finanziamento',         de: 'Finanzierung'         },
  home_inscription:         { fr: 'Inscription',               en: 'Sign up',                pt: 'Registo',               es: 'Registro',               it: 'Iscrizione',            de: 'Registrierung'        },
  home_nouveau:             { fr: 'NOUVEAU',                   en: 'NEW',                    pt: 'NOVO',                  es: 'NUEVO',                  it: 'NUOVO',                 de: 'NEU'                  },
  home_offres:              { fr: 'Offres',                    en: 'Plans',                  pt: 'Planos',                es: 'Planes',                 it: 'Piani',                 de: 'Angebote'             },
  home_processus:           { fr: 'PROCESSUS',                 en: 'PROCESS',                pt: 'PROCESSO',              es: 'PROCESO',                it: 'PROCESSO',              de: 'PROZESS'              },
  home_tiktok_desc:         { fr: 'Clips courts, format vertical. Swipe entre les vidéos et découvre les meilleurs talents du moment.', en: 'Short clips, vertical format. Swipe through videos and discover the best talents of the moment.', pt: 'Clips curtos, formato vertical. Faz swipe entre os vídeos e descobre os melhores talentos do momento.', es: 'Clips cortos, formato vertical. Desliza entre los videos y descubre a los mejores talentos del momento.', it: 'Clip brevi, formato verticale. Scorri tra i video e scopri i migliori talenti del momento.', de: 'Kurze Clips im Hochformat. Wische durch die Videos und entdecke die besten Talente des Moments.' },
  home_tiktok_football:     { fr: 'Le TikTok du Football',     en: 'The TikTok of Football', pt: 'O TikTok do Futebol',   es: 'El TikTok del Fútbol',   it: 'Il TikTok del Calcio',  de: 'Das TikTok des Fußballs' },
  home_voir_jogabonito:     { fr: 'Voir Jogabonito',           en: 'See Jogabonito',         pt: 'Ver Jogabonito',        es: 'Ver Jogabonito',         it: 'Vedi Jogabonito',       de: 'Jogabonito ansehen'   },
  recrut_feed:          { fr: 'Feed',                  en: 'Feed',              pt: 'Feed',              es: 'Feed',              it: 'Feed',              de: 'Feed'              },
}

export const t = (key, lang = 'fr') => T_HOME[key]?.[lang] ?? T_HOME[key]?.['fr'] ?? key

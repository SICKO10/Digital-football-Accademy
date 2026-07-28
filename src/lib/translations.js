// ── Traductions Digital Football ──────────────────────────────────────────────
export const LANGS = [
  { code: 'fr', label: 'Français',    flag: '🇫🇷' },
  { code: 'en', label: 'English',     flag: '🇬🇧' },
  { code: 'pt', label: 'Português',   flag: '🇧🇷' },
  { code: 'es', label: 'Español',     flag: '🇪🇸' },
  { code: 'it', label: 'Italiano',    flag: '🇮🇹' },
  { code: 'de', label: 'Deutsch',     flag: '🇩🇪' },
]

export const T = {
  // ── Navigation ──────────────────────────────────────────────────────────────
  nav_accueil:          { fr: 'Accueil',             en: 'Home',              pt: 'Início',            es: 'Inicio',            it: 'Home',              de: 'Startseite'        },
  nav_equipe:           { fr: 'Mon équipe',           en: 'My team',           pt: 'Minha equipa',      es: 'Mi equipo',         it: 'La mia squadra',    de: 'Mein Team'         },
  nav_stats:            { fr: 'Stats joueurs',        en: 'Player stats',      pt: 'Estatísticas',      es: 'Estadísticas',      it: 'Statistiche',       de: 'Spielerstatistik'  },
  nav_competition:      { fr: 'Compétition',          en: 'Competition',       pt: 'Competição',        es: 'Competición',       it: 'Competizione',      de: 'Wettbewerb'        },
  nav_entrainements:    { fr: 'Entraînements',        en: 'Training',          pt: 'Treinos',           es: 'Entrenamientos',    it: 'Allenamenti',       de: 'Training'          },
  nav_seances:          { fr: 'Séances',              en: 'Sessions',          pt: 'Sessões',           es: 'Sesiones',          it: 'Sedute',            de: 'Einheiten'         },
  nav_prep_physique:    { fr: 'Préparation physique', en: 'Physical prep',     pt: 'Preparação física', es: 'Preparación física',it: 'Prep. fisica',      de: 'Phys. Vorbereitung'},
  nav_tacticboard:      { fr: 'Tacticboard',          en: 'Tacticboard',       pt: 'Táctico',           es: 'Pizarra táctica',   it: 'Lavagna tattica',   de: 'Taktikboard'       },
  nav_analyse:          { fr: 'Analyse rapport',      en: 'Report analysis',   pt: 'Análise relatório', es: 'Análisis informe',  it: 'Analisi report',    de: 'Berichtsanalyse'   },
  nav_evaluations:      { fr: 'Évaluations',          en: 'Evaluations',       pt: 'Avaliações',        es: 'Evaluaciones',      it: 'Valutazioni',       de: 'Bewertungen'       },
  nav_clotures:         { fr: 'Clôtures de saison',   en: 'Season closing',    pt: 'Fecho de época',    es: 'Cierre de temporada',it:'Chiusura stagione', de: 'Saisonabschluss'   },
  nav_recrutement:      { fr: 'Recrutement',          en: 'Recruitment',       pt: 'Recrutamento',      es: 'Reclutamiento',     it: 'Reclutamento',      de: 'Rekrutierung'      },
  nav_dirigeants:       { fr: 'Dirigeants',           en: 'Directors',         pt: 'Dirigentes',        es: 'Dirigentes',        it: 'Dirigenti',         de: 'Führungskräfte'    },
  nav_profil:           { fr: 'Mon profil',           en: 'My profile',        pt: 'Meu perfil',        es: 'Mi perfil',         it: 'Il mio profilo',    de: 'Mein Profil'       },

  // ── Sections ────────────────────────────────────────────────────────────────
  section_entrainement: { fr: 'ENTRAÎNEMENT',         en: 'TRAINING',          pt: 'TREINO',            es: 'ENTRENAMIENTO',     it: 'ALLENAMENTO',       de: 'TRAINING'          },
  section_analyse:      { fr: 'SUIVI & ANALYSE',      en: 'TRACKING & ANALYSIS',pt:'ACOMPANHAMENTO',   es: 'SEGUIMIENTO',       it: 'MONITORAGGIO',      de: 'ANALYSE'           },
  section_reseau:       { fr: 'RÉSEAU',               en: 'NETWORK',           pt: 'REDE',              es: 'RED',               it: 'RETE',              de: 'NETZWERK'          },
  section_compte:       { fr: 'MON COMPTE',           en: 'MY ACCOUNT',        pt: 'MINHA CONTA',       es: 'MI CUENTA',         it: 'IL MIO ACCOUNT',    de: 'MEIN KONTO'        },

  // ── Actions communes ────────────────────────────────────────────────────────
  btn_sauvegarder:      { fr: 'Sauvegarder',          en: 'Save',              pt: 'Guardar',           es: 'Guardar',           it: 'Salva',             de: 'Speichern'         },
  btn_annuler:          { fr: 'Annuler',              en: 'Cancel',            pt: 'Cancelar',          es: 'Cancelar',          it: 'Annulla',           de: 'Abbrechen'         },
  btn_confirmer:        { fr: 'Confirmer',            en: 'Confirm',           pt: 'Confirmar',         es: 'Confirmar',         it: 'Conferma',          de: 'Bestätigen'        },
  btn_supprimer:        { fr: 'Supprimer',            en: 'Delete',            pt: 'Eliminar',          es: 'Eliminar',          it: 'Elimina',           de: 'Löschen'           },
  btn_ajouter:          { fr: 'Ajouter',              en: 'Add',               pt: 'Adicionar',         es: 'Agregar',           it: 'Aggiungi',          de: 'Hinzufügen'        },
  btn_modifier:         { fr: 'Modifier',             en: 'Edit',              pt: 'Editar',            es: 'Editar',            it: 'Modifica',          de: 'Bearbeiten'        },
  btn_fermer:           { fr: 'Fermer',               en: 'Close',             pt: 'Fechar',            es: 'Cerrar',            it: 'Chiudi',            de: 'Schließen'         },
  btn_envoyer:          { fr: 'Envoyer',              en: 'Send',              pt: 'Enviar',            es: 'Enviar',            it: 'Invia',             de: 'Senden'            },
  btn_deconnexion:      { fr: 'Déconnexion',          en: 'Log out',           pt: 'Sair',              es: 'Cerrar sesión',     it: 'Disconnetti',       de: 'Abmelden'          },
  btn_chargement:       { fr: 'Chargement…',          en: 'Loading…',          pt: 'A carregar…',       es: 'Cargando…',         it: 'Caricamento…',      de: 'Laden…'            },
  btn_voir:             { fr: 'Voir',                 en: 'View',              pt: 'Ver',               es: 'Ver',               it: 'Vedi',              de: 'Anzeigen'          },
  btn_exporter:         { fr: 'Exporter',             en: 'Export',            pt: 'Exportar',          es: 'Exportar',          it: 'Esporta',           de: 'Exportieren'       },

  // ── Mon équipe ──────────────────────────────────────────────────────────────
  equipe_titre:         { fr: 'Mon équipe',           en: 'My team',           pt: 'Minha equipa',      es: 'Mi equipo',         it: 'La mia squadra',    de: 'Mein Team'         },
  equipe_joueurs:       { fr: 'joueurs',              en: 'players',           pt: 'jogadores',         es: 'jugadores',         it: 'giocatori',         de: 'Spieler'           },
  equipe_ajouter:       { fr: 'Ajouter un joueur',   en: 'Add a player',      pt: 'Adicionar jogador', es: 'Agregar jugador',   it: 'Aggiungi giocatore',de: 'Spieler hinzufügen'},
  equipe_nom:           { fr: 'Nom',                  en: 'Last name',         pt: 'Apelido',           es: 'Apellido',          it: 'Cognome',           de: 'Nachname'          },
  equipe_prenom:        { fr: 'Prénom',               en: 'First name',        pt: 'Nome',              es: 'Nombre',            it: 'Nome',              de: 'Vorname'           },
  equipe_poste:         { fr: 'Poste',                en: 'Position',          pt: 'Posição',           es: 'Posición',          it: 'Ruolo',             de: 'Position'          },
  equipe_numero:        { fr: 'N° maillot',           en: 'Jersey number',     pt: 'Número camisola',   es: 'Número camiseta',   it: 'Numero maglia',     de: 'Trikotnummer'      },
  equipe_categorie:     { fr: 'Catégorie',            en: 'Category',          pt: 'Categoria',         es: 'Categoría',         it: 'Categoria',         de: 'Kategorie'         },
  equipe_recherche:     { fr: 'Rechercher…',          en: 'Search…',           pt: 'Pesquisar…',        es: 'Buscar…',           it: 'Cerca…',            de: 'Suchen…'           },

  // ── Entraînements / Séances ─────────────────────────────────────────────────
  ent_titre:            { fr: 'Entraînements',        en: 'Training sessions', pt: 'Treinos',           es: 'Entrenamientos',    it: 'Allenamenti',       de: 'Trainingseinheiten'},
  ent_date:             { fr: 'Date',                 en: 'Date',              pt: 'Data',              es: 'Fecha',             it: 'Data',              de: 'Datum'             },
  ent_lieu:             { fr: 'Lieu',                 en: 'Venue',             pt: 'Local',             es: 'Lugar',             it: 'Luogo',             de: 'Ort'               },
  ent_present:          { fr: 'Présent',              en: 'Present',           pt: 'Presente',          es: 'Presente',          it: 'Presente',          de: 'Anwesend'          },
  ent_absent:           { fr: 'Absent',               en: 'Absent',            pt: 'Ausente',           es: 'Ausente',           it: 'Assente',           de: 'Abwesend'          },
  ent_retard:           { fr: 'Retard',               en: 'Late',              pt: 'Atrasado',          es: 'Tarde',             it: 'In ritardo',        de: 'Verspätet'         },
  ent_presences:        { fr: 'Présences',            en: 'Attendance',        pt: 'Presenças',         es: 'Asistencia',        it: 'Presenze',          de: 'Anwesenheit'       },

  // ── Compétition ─────────────────────────────────────────────────────────────
  comp_match:           { fr: 'Match',                en: 'Match',             pt: 'Jogo',              es: 'Partido',           it: 'Partita',           de: 'Spiel'             },
  comp_domicile:        { fr: 'Domicile',             en: 'Home',              pt: 'Casa',              es: 'Local',             it: 'Casa',              de: 'Heimspiel'         },
  comp_exterieur:       { fr: 'Extérieur',            en: 'Away',              pt: 'Fora',              es: 'Visitante',         it: 'Trasferta',         de: 'Auswärts'          },
  comp_score:           { fr: 'Score',                en: 'Score',             pt: 'Resultado',         es: 'Marcador',          it: 'Risultato',         de: 'Ergebnis'          },
  comp_buts:            { fr: 'Buts',                 en: 'Goals',             pt: 'Golos',             es: 'Goles',             it: 'Gol',               de: 'Tore'              },
  comp_victoire:        { fr: 'Victoire',             en: 'Win',               pt: 'Vitória',           es: 'Victoria',          it: 'Vittoria',          de: 'Sieg'              },
  comp_defaite:         { fr: 'Défaite',              en: 'Loss',              pt: 'Derrota',           es: 'Derrota',           it: 'Sconfitta',         de: 'Niederlage'        },
  comp_nul:             { fr: 'Nul',                  en: 'Draw',              pt: 'Empate',            es: 'Empate',            it: 'Pareggio',          de: 'Unentschieden'     },

  // ── Profil ──────────────────────────────────────────────────────────────────
  profil_club:          { fr: 'Club',                 en: 'Club',              pt: 'Clube',             es: 'Club',              it: 'Club',              de: 'Verein'            },
  profil_region:        { fr: 'Région',               en: 'Region',            pt: 'Região',            es: 'Región',            it: 'Regione',           de: 'Region'            },
  profil_diplome:       { fr: 'Diplôme',              en: 'Certificate',       pt: 'Diploma',           es: 'Diploma',           it: 'Diploma',           de: 'Lizenz'            },
  profil_saison:        { fr: 'Saison',               en: 'Season',            pt: 'Época',             es: 'Temporada',         it: 'Stagione',          de: 'Saison'            },

  // ── Messages / états ────────────────────────────────────────────────────────
  msg_aucun_joueur:     { fr: 'Aucun joueur',         en: 'No players',        pt: 'Sem jogadores',     es: 'Sin jugadores',     it: 'Nessun giocatore',  de: 'Keine Spieler'     },
  msg_aucune_donnee:    { fr: 'Aucune donnée',        en: 'No data',           pt: 'Sem dados',         es: 'Sin datos',         it: 'Nessun dato',       de: 'Keine Daten'       },
  msg_sauvegarde_ok:    { fr: 'Sauvegardé !',         en: 'Saved!',            pt: 'Guardado!',         es: '¡Guardado!',        it: 'Salvato!',          de: 'Gespeichert!'      },
  msg_erreur:           { fr: 'Une erreur est survenue', en: 'An error occurred', pt: 'Ocorreu um erro', es: 'Se produjo un error', it: 'Si è verificato un errore', de: 'Ein Fehler ist aufgetreten' },
}

// Helper : t('nav_equipe', lang) → 'My team'
export const t = (key, lang = 'fr') => T[key]?.[lang] ?? T[key]?.['fr'] ?? key

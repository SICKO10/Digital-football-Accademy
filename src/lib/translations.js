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

  // ── Mon équipe — détails ────────────────────────────────────────────────────
  equipe_inviter:           { fr: 'Inviter un joueur',        en: 'Invite a player',       pt: 'Convidar jogador',      es: 'Invitar jugador',       it: 'Invita giocatore',      de: 'Spieler einladen'      },
  equipe_code_invitation:   { fr: "Code d'invitation",        en: 'Invitation code',       pt: 'Código de convite',     es: 'Código de invitación',  it: 'Codice invito',         de: 'Einladungscode'        },
  equipe_copier_code:       { fr: 'Copier le code',           en: 'Copy code',             pt: 'Copiar código',         es: 'Copiar código',         it: 'Copia codice',          de: 'Code kopieren'         },
  equipe_code_copie:        { fr: 'Copié !',                  en: 'Copied!',               pt: 'Copiado!',              es: '¡Copiado!',             it: 'Copiato!',              de: 'Kopiert!'              },
  equipe_demandes:          { fr: 'Demandes en attente',      en: 'Pending requests',      pt: 'Pedidos pendentes',     es: 'Solicitudes pendientes',it: 'Richieste in attesa',   de: 'Ausstehende Anfragen'  },
  equipe_accepter:          { fr: 'Accepter',                 en: 'Accept',                pt: 'Aceitar',               es: 'Aceptar',               it: 'Accetta',               de: 'Akzeptieren'           },
  equipe_refuser:           { fr: 'Refuser',                  en: 'Decline',               pt: 'Recusar',               es: 'Rechazar',              it: 'Rifiuta',               de: 'Ablehnen'              },
  equipe_joueur_lie:        { fr: 'Joueur correspondant dans votre effectif', en: 'Matching player in roster', pt: 'Jogador correspondente', es: 'Jugador correspondiente', it: 'Giocatore corrispondente', de: 'Zugehöriger Spieler' },
  equipe_selectionner:      { fr: 'Sélectionner…',           en: 'Select…',               pt: 'Selecionar…',           es: 'Seleccionar…',          it: 'Seleziona…',            de: 'Auswählen…'            },
  equipe_aucune_demande:    { fr: 'Aucune demande en attente', en: 'No pending requests',  pt: 'Sem pedidos pendentes', es: 'Sin solicitudes',       it: 'Nessuna richiesta',     de: 'Keine Anfragen'        },
  equipe_effectif:          { fr: 'Effectif',                 en: 'Roster',                pt: 'Plantel',               es: 'Plantilla',             it: 'Rosa',                  de: 'Kader'                 },
  equipe_importer_csv:      { fr: 'Importer CSV',             en: 'Import CSV',            pt: 'Importar CSV',          es: 'Importar CSV',          it: 'Importa CSV',           de: 'CSV importieren'       },
  equipe_scanner:           { fr: 'Scanner QR',               en: 'Scan QR',               pt: 'Digitalizar QR',        es: 'Escanear QR',           it: 'Scansiona QR',          de: 'QR scannen'            },
  equipe_pied:              { fr: 'Pied fort',                en: 'Strong foot',           pt: 'Pé dominante',          es: 'Pie dominante',         it: 'Piede forte',           de: 'Starker Fuß'           },
  equipe_droit:             { fr: 'Droit',                    en: 'Right',                 pt: 'Direito',               es: 'Derecho',               it: 'Destro',                de: 'Rechts'                },
  equipe_gauche:            { fr: 'Gauche',                   en: 'Left',                  pt: 'Esquerdo',              es: 'Izquierdo',             it: 'Sinistro',              de: 'Links'                 },
  equipe_les_deux:          { fr: 'Les deux',                 en: 'Both',                  pt: 'Ambos',                 es: 'Ambos',                 it: 'Entrambi',              de: 'Beide'                 },

  // ── Entraînements ────────────────────────────────────────────────────────────
  ent_nouvel:               { fr: 'Nouvel entraînement',      en: 'New training',          pt: 'Novo treino',           es: 'Nuevo entrenamiento',   it: 'Nuovo allenamento',     de: 'Neues Training'        },
  ent_objectif:             { fr: 'Objectif',                 en: 'Objective',             pt: 'Objetivo',              es: 'Objetivo',              it: 'Obiettivo',             de: 'Ziel'                  },
  ent_duree:                { fr: 'Durée',                    en: 'Duration',              pt: 'Duração',               es: 'Duración',              it: 'Durata',                de: 'Dauer'                 },
  ent_feuille_presence:     { fr: 'Feuille de présence',      en: 'Attendance sheet',      pt: 'Folha de presença',     es: 'Hoja de asistencia',    it: 'Foglio presenze',       de: 'Anwesenheitsliste'     },
  ent_valider_presence:     { fr: 'Valider les présences',    en: 'Validate attendance',   pt: 'Validar presenças',     es: 'Validar asistencia',    it: 'Valida presenze',       de: 'Anwesenheit bestätigen'},
  ent_point_seance:         { fr: 'Point séance',             en: 'Session point',         pt: 'Ponto de sessão',       es: 'Punto sesión',          it: 'Punto seduta',          de: 'Einheitspunkt'         },
  ent_tous_presents:        { fr: 'Tous présents',            en: 'All present',           pt: 'Todos presentes',       es: 'Todos presentes',       it: 'Tutti presenti',        de: 'Alle anwesend'         },
  ent_taux_presence:        { fr: 'Taux de présence',         en: 'Attendance rate',       pt: 'Taxa de presença',      es: 'Tasa de asistencia',    it: 'Tasso di presenza',     de: 'Anwesenheitsrate'      },

  // ── Séances ──────────────────────────────────────────────────────────────────
  seance_nouvelle:          { fr: 'Nouvelle séance',          en: 'New session',           pt: 'Nova sessão',           es: 'Nueva sesión',          it: 'Nuova seduta',          de: 'Neue Einheit'          },
  seance_titre:             { fr: 'Titre',                    en: 'Title',                 pt: 'Título',                es: 'Título',                it: 'Titolo',                de: 'Titel'                 },
  seance_description:       { fr: 'Description',              en: 'Description',           pt: 'Descrição',             es: 'Descripción',           it: 'Descrizione',           de: 'Beschreibung'          },
  seance_difficulte:        { fr: 'Difficulté',               en: 'Difficulty',            pt: 'Dificuldade',           es: 'Dificultad',            it: 'Difficoltà',            de: 'Schwierigkeit'         },
  seance_categorie:         { fr: 'Catégorie tactique',       en: 'Tactical category',     pt: 'Categoria tática',      es: 'Categoría táctica',     it: 'Categoria tattica',     de: 'Taktische Kategorie'   },
  seance_envoyer_club:      { fr: 'Envoyer au club',          en: 'Send to club',          pt: 'Enviar ao clube',       es: 'Enviar al club',        it: 'Invia al club',         de: 'An Verein senden'      },
  seance_archiver:          { fr: 'Archiver',                 en: 'Archive',               pt: 'Arquivar',              es: 'Archivar',              it: 'Archivia',              de: 'Archivieren'           },
  seance_archivee:          { fr: 'Archivée',                 en: 'Archived',              pt: 'Arquivada',             es: 'Archivada',             it: 'Archiviata',            de: 'Archiviert'            },
  seance_fichier:           { fr: 'Fichier',                  en: 'File',                  pt: 'Ficheiro',              es: 'Archivo',               it: 'File',                  de: 'Datei'                 },
  seance_dossier:           { fr: 'Dossier',                  en: 'Folder',                pt: 'Pasta',                 es: 'Carpeta',               it: 'Cartella',              de: 'Ordner'                },
  seance_mes_seances:       { fr: 'Mes séances',              en: 'My sessions',           pt: 'As minhas sessões',     es: 'Mis sesiones',          it: 'Le mie sedute',         de: 'Meine Einheiten'       },
  seance_sans_categorie:    { fr: 'Sans catégorie',           en: 'Uncategorized',         pt: 'Sem categoria',         es: 'Sin categoría',         it: 'Senza categoria',       de: 'Ohne Kategorie'        },

  // ── Compétition ──────────────────────────────────────────────────────────────
  comp_nouveau_match:       { fr: 'Nouveau match',            en: 'New match',             pt: 'Novo jogo',             es: 'Nuevo partido',         it: 'Nuova partita',         de: 'Neues Spiel'           },
  comp_adversaire:          { fr: 'Adversaire',               en: 'Opponent',              pt: 'Adversário',            es: 'Adversario',            it: 'Avversario',            de: 'Gegner'                },
  comp_competition:         { fr: 'Compétition',              en: 'Competition',           pt: 'Competição',            es: 'Competición',           it: 'Competizione',          de: 'Wettbewerb'            },
  comp_lieu:                { fr: 'Lieu',                     en: 'Venue',                 pt: 'Local',                 es: 'Lugar',                 it: 'Luogo',                 de: 'Ort'                   },
  comp_heure:               { fr: 'Heure',                    en: 'Time',                  pt: 'Hora',                  es: 'Hora',                  it: 'Orario',                de: 'Uhrzeit'               },
  comp_mi_temps:            { fr: 'Mi-temps',                 en: 'Half-time',             pt: 'Intervalo',             es: 'Descanso',              it: 'Intervallo',            de: 'Halbzeit'              },
  comp_stats_match:         { fr: 'Stats du match',           en: 'Match stats',           pt: 'Estatísticas do jogo',  es: 'Estadísticas del partido', it: 'Statistiche partita', de: 'Spielstatistiken'     },
  comp_passes_dec:          { fr: 'Passes déc.',              en: 'Assists',               pt: 'Assistências',          es: 'Asistencias',           it: 'Assist',                de: 'Vorlagen'              },
  comp_clean_sheet:         { fr: 'Clean sheet',              en: 'Clean sheet',           pt: 'Jogo sem sofrer',       es: 'Portería a cero',       it: 'Porta inviolata',       de: 'Zu-Null-Spiel'         },
  comp_carton_jaune:        { fr: 'Carton jaune',             en: 'Yellow card',           pt: 'Cartão amarelo',        es: 'Tarjeta amarilla',      it: 'Cartellino giallo',     de: 'Gelbe Karte'           },
  comp_carton_rouge:        { fr: 'Carton rouge',             en: 'Red card',              pt: 'Cartão vermelho',       es: 'Tarjeta roja',          it: 'Cartellino rosso',      de: 'Rote Karte'            },
  comp_minutes:             { fr: 'Minutes jouées',           en: 'Minutes played',        pt: 'Minutos jogados',       es: 'Minutos jugados',       it: 'Minuti giocati',        de: 'Gespielte Minuten'     },
  comp_titulaire:           { fr: 'Titulaire',                en: 'Starter',               pt: 'Titular',               es: 'Titular',               it: 'Titolare',              de: 'Starter'               },
  comp_remplacant:          { fr: 'Remplaçant',               en: 'Substitute',            pt: 'Suplente',              es: 'Suplente',              it: 'Sostituto',             de: 'Einwechslung'          },

  // ── Évaluations ──────────────────────────────────────────────────────────────
  eval_nouvelle:            { fr: 'Nouvelle évaluation',      en: 'New evaluation',        pt: 'Nova avaliação',        es: 'Nueva evaluación',      it: 'Nuova valutazione',     de: 'Neue Bewertung'        },
  eval_note:                { fr: 'Note',                     en: 'Rating',                pt: 'Nota',                  es: 'Nota',                  it: 'Voto',                  de: 'Note'                  },
  eval_commentaire:         { fr: 'Commentaire',              en: 'Comment',               pt: 'Comentário',            es: 'Comentario',            it: 'Commento',              de: 'Kommentar'             },
  eval_technique:           { fr: 'Technique',                en: 'Technical',             pt: 'Técnica',               es: 'Técnica',               it: 'Tecnica',               de: 'Technik'               },
  eval_physique:            { fr: 'Physique',                 en: 'Physical',              pt: 'Físico',                es: 'Físico',                it: 'Fisico',                de: 'Athletik'              },
  eval_mental:              { fr: 'Mental',                   en: 'Mental',                pt: 'Mental',                es: 'Mental',                it: 'Mentale',               de: 'Mental'                },
  eval_tactique:            { fr: 'Tactique',                 en: 'Tactical',              pt: 'Tático',                es: 'Táctico',               it: 'Tattico',               de: 'Taktik'                },
  eval_partager:            { fr: 'Partager avec le joueur',  en: 'Share with player',     pt: 'Partilhar com jogador', es: 'Compartir con jugador', it: 'Condividi con giocatore',de: 'Mit Spieler teilen'   },
  eval_visible:             { fr: 'Visible par le joueur',    en: 'Visible to player',     pt: 'Visível pelo jogador',  es: 'Visible para jugador',  it: 'Visibile al giocatore', de: 'Für Spieler sichtbar'  },
  eval_historique:          { fr: 'Historique des évaluations', en: 'Evaluation history',  pt: 'Histórico de avaliações', es: 'Historial evaluaciones', it: 'Storico valutazioni', de: 'Bewertungsverlauf'    },

  // ── Préparation physique ──────────────────────────────────────────────────────
  phys_titre:               { fr: 'Préparation physique',     en: 'Physical preparation', pt: 'Preparação física',     es: 'Preparación física',    it: 'Preparazione fisica',   de: 'Physische Vorbereitung'},
  phys_exercice:            { fr: 'Exercice',                 en: 'Exercise',              pt: 'Exercício',             es: 'Ejercicio',             it: 'Esercizio',             de: 'Übung'                 },
  phys_serie:               { fr: 'Séries',                   en: 'Sets',                  pt: 'Séries',                es: 'Series',                it: 'Serie',                 de: 'Sätze'                 },
  phys_repetition:          { fr: 'Répétitions',              en: 'Reps',                  pt: 'Repetições',            es: 'Repeticiones',          it: 'Ripetizioni',           de: 'Wiederholungen'        },
  phys_repos:               { fr: 'Repos',                    en: 'Rest',                  pt: 'Descanso',              es: 'Descanso',              it: 'Riposo',                de: 'Pause'                 },
  phys_intensite:           { fr: 'Intensité',                en: 'Intensity',             pt: 'Intensidade',           es: 'Intensidad',            it: 'Intensità',             de: 'Intensität'            },
  phys_programme:           { fr: 'Programme',                en: 'Program',               pt: 'Programa',              es: 'Programa',              it: 'Programma',             de: 'Programm'              },
  phys_assigner:            { fr: 'Assigner à un joueur',     en: 'Assign to player',      pt: 'Atribuir a jogador',    es: 'Asignar a jugador',     it: 'Assegna a giocatore',   de: 'Spieler zuweisen'      },

  // ── Dirigeants ────────────────────────────────────────────────────────────────
  dir_inviter:              { fr: 'Inviter un dirigeant',     en: 'Invite a director',     pt: 'Convidar dirigente',    es: 'Invitar dirigente',     it: 'Invita dirigente',      de: 'Führungskraft einladen'},
  dir_email:                { fr: 'Email du dirigeant',       en: "Director's email",      pt: 'Email do dirigente',    es: 'Email del dirigente',   it: 'Email dirigente',       de: 'E-Mail der Führungskraft'},
  dir_permissions:          { fr: 'Permissions par section',  en: 'Permissions by section',pt: 'Permissões por secção', es: 'Permisos por sección',  it: 'Permessi per sezione',  de: 'Berechtigungen'        },
  dir_aucun:                { fr: 'Aucun',                    en: 'None',                  pt: 'Nenhum',                es: 'Ninguno',               it: 'Nessuno',               de: 'Keine'                 },
  dir_lecture:              { fr: 'Lecture',                  en: 'Read',                  pt: 'Leitura',               es: 'Lectura',               it: 'Lettura',               de: 'Lesen'                 },
  dir_edition:              { fr: 'Édition',                  en: 'Edit',                  pt: 'Edição',                es: 'Edición',               it: 'Modifica',              de: 'Bearbeiten'            },
  dir_envoyer_invitation:   { fr: "Envoyer l'invitation",     en: 'Send invitation',       pt: 'Enviar convite',        es: 'Enviar invitación',     it: 'Invia invito',          de: 'Einladung senden'      },
  dir_actif:                { fr: 'Actif',                    en: 'Active',                pt: 'Ativo',                 es: 'Activo',                it: 'Attivo',                de: 'Aktiv'                 },
  dir_revoquer:             { fr: 'Révoquer',                 en: 'Revoke',                pt: 'Revogar',               es: 'Revocar',               it: 'Revoca',                de: 'Widerrufen'            },

  // ── Clôtures de saison ────────────────────────────────────────────────────────
  cloture_titre:            { fr: 'Clôture de saison',        en: 'Season closing',        pt: 'Fecho de época',        es: 'Cierre de temporada',   it: 'Chiusura stagione',     de: 'Saisonabschluss'       },
  cloture_confirmer:        { fr: 'Confirmer la clôture',     en: 'Confirm closing',       pt: 'Confirmar fecho',       es: 'Confirmar cierre',      it: 'Conferma chiusura',     de: 'Abschluss bestätigen'  },
  cloture_attention:        { fr: 'Attention',                en: 'Warning',               pt: 'Atenção',               es: 'Atención',              it: 'Attenzione',            de: 'Achtung'               },
  cloture_irreversible:     { fr: 'Cette action est irréversible', en: 'This action is irreversible', pt: 'Esta ação é irreversível', es: 'Esta acción es irreversible', it: 'Questa azione è irreversibile', de: 'Diese Aktion ist unwiderruflich' },

  // ── Analyse rapport ───────────────────────────────────────────────────────────
  analyse_titre:            { fr: 'Analyse rapport',          en: 'Report analysis',       pt: 'Análise de relatório',  es: 'Análisis de informe',   it: 'Analisi report',        de: 'Berichtsanalyse'       },
  analyse_enregistrer:      { fr: 'Enregistrement vocal',     en: 'Voice recording',       pt: 'Gravação de voz',       es: 'Grabación de voz',      it: 'Registrazione vocale',  de: 'Sprachaufnahme'        },
  analyse_demarrer:         { fr: 'Démarrer',                 en: 'Start',                 pt: 'Iniciar',               es: 'Iniciar',               it: 'Avvia',                 de: 'Starten'               },
  analyse_arreter:          { fr: 'Arrêter',                  en: 'Stop',                  pt: 'Parar',                 es: 'Detener',               it: 'Ferma',                 de: 'Stoppen'               },
  analyse_generer:          { fr: "Générer le rapport avec l'IA", en: 'Generate report with AI', pt: 'Gerar relatório com IA', es: 'Generar informe con IA', it: 'Genera report con IA', de: 'Bericht mit KI erstellen' },
  analyse_exporter_pdf:     { fr: 'Exporter PDF',             en: 'Export PDF',            pt: 'Exportar PDF',          es: 'Exportar PDF',          it: 'Esporta PDF',           de: 'PDF exportieren'       },
  analyse_mes_rapports:     { fr: 'Mes rapports',             en: 'My reports',            pt: 'Os meus relatórios',    es: 'Mis informes',          it: 'I miei report',         de: 'Meine Berichte'        },
  analyse_aucun_rapport:    { fr: "Aucun rapport sauvegardé pour l'instant", en: 'No saved reports yet', pt: 'Sem relatórios guardados', es: 'Sin informes guardados', it: 'Nessun report salvato', de: 'Keine Berichte gespeichert' },
  analyse_nom_joueur:       { fr: 'Nom du joueur',            en: 'Player name',           pt: 'Nome do jogador',       es: 'Nombre del jugador',    it: 'Nome giocatore',        de: 'Spielername'           },
  analyse_club_adverse:     { fr: 'Club adverse',             en: 'Opponent club',         pt: 'Clube adversário',      es: 'Club adversario',       it: 'Club avversario',       de: 'Gegnerischer Verein'   },
  analyse_match_aller:      { fr: 'Match Aller',              en: 'First leg',             pt: 'Jogo da 1ª mão',        es: 'Partido de ida',        it: 'Andata',                de: 'Hinspiel'              },
  analyse_match_retour:     { fr: 'Match Retour',             en: 'Return leg',            pt: 'Jogo da 2ª mão',        es: 'Partido de vuelta',     it: 'Ritorno',               de: 'Rückspiel'             },
  analyse_match_complet:    { fr: 'Match complet',            en: 'Full match',            pt: 'Jogo completo',         es: 'Partido completo',      it: 'Partita completa',      de: 'Vollständiges Spiel'   },
  analyse_premiere_mi:      { fr: '1ère mi-temps',            en: '1st half',              pt: '1ª parte',              es: '1er tiempo',            it: '1° tempo',              de: '1. Halbzeit'           },
  analyse_deuxieme_mi:      { fr: '2ème mi-temps',            en: '2nd half',              pt: '2ª parte',              es: '2do tiempo',            it: '2° tempo',              de: '2. Halbzeit'           },

  // ── Tacticboard ───────────────────────────────────────────────────────────────
  tactic_modifier_schema:   { fr: 'Modifier le schéma',       en: 'Edit formation',        pt: 'Editar esquema',        es: 'Editar esquema',        it: 'Modifica schema',       de: 'Formation bearbeiten'  },
  tactic_modifier_infos:    { fr: 'Modifier les infos',       en: 'Edit info',             pt: 'Editar informações',    es: 'Editar información',    it: 'Modifica info',         de: 'Info bearbeiten'       },
  tactic_ajouter_schema:    { fr: 'Ajouter un schéma',        en: 'Add formation',         pt: 'Adicionar esquema',     es: 'Agregar esquema',       it: 'Aggiungi schema',       de: 'Formation hinzufügen'  },
  tactic_nom_schema:        { fr: 'Nom du schéma',            en: 'Formation name',        pt: 'Nome do esquema',       es: 'Nombre del esquema',    it: 'Nome dello schema',     de: 'Formationsname'        },

  // ── Profil éducateur ──────────────────────────────────────────────────────────
  profil_titre:             { fr: 'Mon profil',               en: 'My profile',            pt: 'O meu perfil',          es: 'Mi perfil',             it: 'Il mio profilo',        de: 'Mein Profil'           },
  profil_niveau:            { fr: "Niveau de l'équipe",       en: 'Team level',            pt: 'Nível da equipa',       es: 'Nivel del equipo',      it: 'Livello squadra',       de: 'Teamniveau'            },
  profil_description:       { fr: 'Description',              en: 'Description',           pt: 'Descrição',             es: 'Descripción',           it: 'Descrizione',           de: 'Beschreibung'          },
  profil_photo:             { fr: 'Photo de profil',          en: 'Profile photo',         pt: 'Foto de perfil',        es: 'Foto de perfil',        it: 'Foto profilo',          de: 'Profilfoto'            },
  profil_modifier:          { fr: 'Modifier le profil',       en: 'Edit profile',          pt: 'Editar perfil',         es: 'Editar perfil',         it: 'Modifica profilo',      de: 'Profil bearbeiten'     },
  profil_infos_personnelles:{ fr: 'Informations personnelles',en: 'Personal information',  pt: 'Informações pessoais',  es: 'Información personal',  it: 'Info personali',        de: 'Persönliche Infos'     },

  // ── États généraux ────────────────────────────────────────────────────────────
  etat_en_attente:          { fr: 'En attente',               en: 'Pending',               pt: 'Em espera',             es: 'En espera',             it: 'In attesa',             de: 'Ausstehend'            },
  etat_accepte:             { fr: 'Accepté',                  en: 'Accepted',              pt: 'Aceite',                es: 'Aceptado',              it: 'Accettato',             de: 'Akzeptiert'            },
  etat_refuse:              { fr: 'Refusé',                   en: 'Declined',              pt: 'Recusado',              es: 'Rechazado',             it: 'Rifiutato',             de: 'Abgelehnt'             },
  etat_analyse:             { fr: 'Analysé',                  en: 'Analysed',              pt: 'Analisado',             es: 'Analizado',             it: 'Analizzato',            de: 'Analysiert'            },
  etat_aucun_resultat:      { fr: 'Aucun résultat',           en: 'No results',            pt: 'Sem resultados',        es: 'Sin resultados',        it: 'Nessun risultato',      de: 'Keine Ergebnisse'      },
  etat_oui:                 { fr: 'Oui',                      en: 'Yes',                   pt: 'Sim',                   es: 'Sí',                    it: 'Sì',                    de: 'Ja'                    },
  etat_non:                 { fr: 'Non',                      en: 'No',                    pt: 'Não',                   es: 'No',                    it: 'No',                    de: 'Nein'                  },
}

// Helper : t('nav_equipe', lang) → 'My team'
export const t = (key, lang = 'fr') => T[key]?.[lang] ?? T[key]?.['fr'] ?? key

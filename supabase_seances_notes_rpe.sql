-- Ressenti de séance → RPE (indice d'effort perçu, note sur 10).
--
-- Avant : le joueur notait sa « charge de travail » de 1 à 5
-- (seances_notes_joueurs.charge_travail, CHECK 1..5, NOT NULL).
-- Après : il donne un RPE de 0 à 10 (nouvelle colonne rpe). La notion de
-- plaisir (1..5) et les mots-clés ne changent pas.
--
-- Les réponses déjà enregistrées gardent leur charge_travail sur 5 (aucune
-- donnée modifiée) : l'app les affiche converties ×2 et marquées « ≈ ».
-- charge_travail devient facultative, puisque les nouvelles réponses ne la
-- remplissent plus.
--
-- À exécuter AVANT de déployer le code qui envoie la colonne rpe
-- (NoteSeanceForm.jsx) — sinon l'envoi d'une note par un joueur échoue.
-- Sauvegarde à lancer avant : zsh ~/Sauvegardes-DigitalFootball/sauvegarder.sh

begin;

alter table public.seances_notes_joueurs
  add column if not exists rpe smallint
    constraint seances_notes_joueurs_rpe_check check (rpe between 0 and 10);

alter table public.seances_notes_joueurs
  alter column charge_travail drop not null;

commit;
